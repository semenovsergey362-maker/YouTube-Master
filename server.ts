import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";
import admin from "firebase-admin";
import http from "http";
import cors from "cors";
import { GoogleGenAI, Type } from "@google/genai";
import os from "os";
import { execFile } from "child_process";

// Process safety handlers to prevent unhandled rejections from terminating server
process.on("unhandledRejection", (reason: any) => {
  console.error("[Process Warning] Unhandled Rejection intercepted:", reason?.message || reason);
});

process.on("uncaughtException", (error: any) => {
  console.error("[Process Error] Uncaught Exception intercepted:", error?.message || error);
});

let aiInstance: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiInstance) {
    let apiKey = process.env.GEMINI_API_KEY || "";
    
    // Check if key is placeholder or empty, and try loading from .dev.env.json
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      try {
        const devEnvPath = '/app/.dev.env.json';
        if (fs.existsSync(devEnvPath)) {
          const devEnv = JSON.parse(fs.readFileSync(devEnvPath, 'utf-8'));
          if (devEnv.GEMINI_API_KEY) {
            apiKey = devEnv.GEMINI_API_KEY;
          }
        }
      } catch (e) {
        console.error('Error reading /app/.dev.env.json in server.ts:', e);
      }
    }

    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Rate limiter and queue state for Gemini API (designed specifically for Free Tier 15 RPM & Token Bursts)
interface QueuedGeminiRequest {
  id: string;
  fn: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}

const geminiRequestQueue: QueuedGeminiRequest[] = [];
let isProcessingGeminiQueue = false;
const requestTimestamps: number[] = [];
const MIN_REQUEST_GAP_MS = 1100; // minimum gap between consecutive Gemini calls to avoid token bursts
const MAX_REQUESTS_PER_MINUTE = 13; // safely under 15 RPM free-tier quota
let lastRequestEndTime = 0;

async function processGeminiQueue() {
  if (isProcessingGeminiQueue) return;
  isProcessingGeminiQueue = true;

  while (geminiRequestQueue.length > 0) {
    const item = geminiRequestQueue.shift();
    if (!item) break;

    const now = Date.now();
    // Prune timestamps older than 60s
    while (requestTimestamps.length > 0 && requestTimestamps[0] < now - 60000) {
      requestTimestamps.shift();
    }

    // 1. Enforce RPM limit (max 13 requests per rolling 60 seconds)
    if (requestTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
      const oldestInWindow = requestTimestamps[0];
      const waitTimeForRpm = Math.max(500, (oldestInWindow + 60000) - now + 300);
      console.log(`[Gemini Free Tier Pacer] Staying safely within 15 RPM quota. Pacing next request by ${(waitTimeForRpm / 1000).toFixed(1)}s...`);
      await new Promise(r => setTimeout(r, waitTimeForRpm));
    }

    // 2. Enforce minimum gap between calls
    const timeSinceLastEnd = Date.now() - lastRequestEndTime;
    if (timeSinceLastEnd < MIN_REQUEST_GAP_MS) {
      await new Promise(r => setTimeout(r, MIN_REQUEST_GAP_MS - timeSinceLastEnd));
    }

    try {
      requestTimestamps.push(Date.now());
      const result = await item.fn();
      lastRequestEndTime = Date.now();
      item.resolve(result);
    } catch (err) {
      lastRequestEndTime = Date.now();
      item.reject(err);
    }
  }

  isProcessingGeminiQueue = false;
}

function queueGeminiCall<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    geminiRequestQueue.push({
      id: Math.random().toString(36).substring(2, 9),
      fn,
      resolve,
      reject
    });
    processGeminiQueue();
  });
}

// Track temporary model cooldowns when hitting 429 quota or 503 high demand
const modelCooldowns = new Map<string, number>();

function extractRetryDelayMs(error: any): number {
  try {
    const rawDetails = error?.details ? JSON.stringify(error.details) : "";
    const msg = `${error?.message || ""} ${rawDetails}`;

    // 1. Check details array for explicit retryDelay from Google RPC
    if (error?.details && Array.isArray(error.details)) {
      const retryInfo = error.details.find((d: any) => d?.retryDelay);
      if (retryInfo?.retryDelay) {
        const sec = parseFloat(String(retryInfo.retryDelay).replace("s", ""));
        if (!isNaN(sec) && sec > 0) return Math.ceil(sec * 1000) + 500;
      }
    }

    // 2. Match seconds in error message: e.g. "retry in 47.157866787s" or retryDelay: "47s"
    const match = msg.match(/retry in\s+([\d.]+)\s*s/i) || msg.match(/retryDelay["']?:\s*["']?([\d.]+)s/i);
    if (match && match[1]) {
      const sec = parseFloat(match[1]);
      if (!isNaN(sec) && sec > 0) return Math.ceil(sec * 1000) + 500;
    }

    // 3. Match milliseconds: e.g. "retry in 573.379745ms"
    const msMatch = msg.match(/retry in\s+([\d.]+)\s*ms/i);
    if (msMatch && msMatch[1]) {
      const ms = parseFloat(msMatch[1]);
      if (!isNaN(ms) && ms > 0) return Math.ceil(ms) + 300;
    }

    // 4. Strict check for zero quota model (e.g. paid-only model without billing, limit: 0)
    if (/\blimit:\s*0\b/i.test(msg) || /quotaValue["']?:\s*["']?0["']?/i.test(msg)) {
      return 24 * 60 * 60 * 1000;
    }
  } catch (e) {}
  return 3000; // default short 3s cooldown for temporary RPM bursts
}

async function generateContentWithFallback(ai: GoogleGenAI, modelPreferred: string, params: {
  contents: any;
  config?: any;
}) {
  return queueGeminiCall(async () => {
    let preferred = (modelPreferred || "gemini-3.5-flash-lite").trim();
    const isImageModel = preferred.includes("-image") || preferred.includes("image");
    
    // Check if contents genuinely contains audio binary parts (not just the word "audio" in a prompt text!)
    const isAudioTask = preferred.includes("transcribe") || (() => {
      try {
        const checkPart = (p: any) => {
          const mime = p?.inlineData?.mimeType || p?.fileData?.mimeType;
          return typeof mime === "string" && mime.toLowerCase().startsWith("audio/");
        };
        const c = params.contents;
        if (Array.isArray(c)) {
          for (const item of c) {
            if (checkPart(item)) return true;
            if (Array.isArray(item?.parts) && item.parts.some(checkPart)) return true;
          }
        } else if (typeof c === "object" && c !== null) {
          if (checkPart(c)) return true;
          if (Array.isArray(c?.parts) && c.parts.some(checkPart)) return true;
        }
      } catch (e) {}
      return false;
    })();

    // For general text tasks, pick a healthy candidate if preferred is currently cooling down
    if (!isImageModel && !isAudioTask) {
      if ((modelCooldowns.get(preferred) || 0) > Date.now()) {
        const candidateHealthy = ["gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"];
        const found = candidateHealthy.find(m => (modelCooldowns.get(m) || 0) <= Date.now());
        if (found) {
          preferred = found;
        }
      }
    }
    
    let fallbackList: string[];
    if (isImageModel) {
      fallbackList = [preferred, "gemini-3.1-flash-lite-image", "gemini-3.1-flash-image", "gemini-3-pro-image"];
    } else if (isAudioTask) {
      fallbackList = ["gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-3.1-flash-lite"];
    } else {
      fallbackList = [
        preferred,
        "gemini-3.5-flash-lite",
        "gemini-3.6-flash",
        "gemini-3.1-flash-lite",
        "gemini-3.8-flash",
        "gemini-flash-latest",
        "gemini-3.5-flash"
      ];
    }

    // Deduplicate and normalize model names
    const uniqueModels: string[] = [];
    for (const m of fallbackList) {
      let normalized = m;
      if (!m) continue;
      if (m === "gemini-3.5-transcribe" || m.includes("transcribe")) {
        normalized = "gemini-3.5-flash-lite";
      } else if (
        m === "gemini-3.5-flash-lite" ||
        m === "gemini-3.6-flash" ||
        m === "gemini-3.1-flash-lite" ||
        m === "gemini-3.8-flash" ||
        m === "gemini-flash-latest" ||
        m === "gemini-3.5-flash" ||
        m === "gemini-3.1-flash-lite-image" ||
        m === "gemini-3.1-flash-image" ||
        m === "gemini-3-pro-image"
      ) {
        normalized = m;
      } else if (isImageModel) {
        normalized = "gemini-3.1-flash-lite-image";
      } else if (isAudioTask) {
        normalized = "gemini-3.5-flash-lite";
      } else {
        normalized = "gemini-3.5-flash-lite";
      }
      if (!uniqueModels.includes(normalized)) {
        uniqueModels.push(normalized);
      }
    }

    const now = Date.now();
    // Prioritize models that are NOT currently in cooldown.
    // If a model is on cooldown (due to 503 high demand or 429 quota), do not attempt it if viable alternatives exist!
    const availableModels = uniqueModels.filter(m => (modelCooldowns.get(m) || 0) <= now);
    const modelsToTry = availableModels.length > 0
      ? availableModels
      : [...uniqueModels].sort((a, b) => (modelCooldowns.get(a) || 0) - (modelCooldowns.get(b) || 0));

    let lastError: any = null;

    for (let mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
      const model = modelsToTry[mIdx];
      const hasNextModel = mIdx < modelsToTry.length - 1;

      // In-place retry loop for the current model
      const maxModelAttempts = 3;
      for (let attempt = 1; attempt <= maxModelAttempts; attempt++) {
        try {
          console.log(`[Gemini Request] Calling model: ${model} (cascade ${mIdx + 1}/${modelsToTry.length}, attempt ${attempt}/${maxModelAttempts})`);
          
          const timeoutMs = 120000; // 2 minutes to safely handle rich structured generations
          const responsePromise = ai.models.generateContent({
            model,
            contents: params.contents,
            config: params.config
          });
          
          const timerPromise = new Promise((_, reject) => {
            setTimeout(() => {
              const err = new Error(`Model ${model} request timed out after ${timeoutMs / 1000}s`) as any;
              err.status = 504;
              reject(err);
            }, timeoutMs);
          });

          const response = (await Promise.race([responsePromise, timerPromise])) as any;
          
          // Verify response contains actual content before returning (prevents returning empty candidated objects)
          const firstCandidate = response?.candidates?.[0];
          const hasCandidateParts = Boolean(firstCandidate?.content?.parts && firstCandidate.content.parts.length > 0);
          const hasText = typeof response?.text === "string" && response.text.trim().length > 0;
          if (!isImageModel && !hasText && !hasCandidateParts) {
            console.warn(`[Gemini Request Cascade] Model ${model} returned empty content / no text parts. Cascading to next model...`);
            if (hasNextModel) {
              break;
            }
          }

          // Model succeeded: remove any cooldown
          modelCooldowns.delete(model);
          return response;
        } catch (error: any) {
          const errorMessage = (error.message || "").toLowerCase();
          const status = error.status || error.code;
          const isZeroQuotaModel = 
            /\blimit:\s*0\b/i.test(errorMessage) || 
            /quotavalue["']?:\s*["']?0["']?/i.test(errorMessage);
          
          const isDailyQuotaExceeded =
            errorMessage.includes("generaterequestsperday") ||
            errorMessage.includes("limit: 20") ||
            errorMessage.includes("limit:20") ||
            errorMessage.includes("perdayperprojectpermodel") ||
            errorMessage.includes("generatelanguage.googleapis.com/generate_content_free_tier_requests") ||
            (errorMessage.includes("quota") && errorMessage.includes("gemini-3.8-flash"));

          if (!isZeroQuotaModel || !hasNextModel) {
            lastError = error;
          }

          if (errorMessage.includes("api key") || errorMessage.includes("key not valid") || errorMessage.includes("unregistered")) {
            throw error;
          }

          const isNotFound = status === 404 ||
                             errorMessage.includes("not_found") ||
                             errorMessage.includes("404") ||
                             errorMessage.includes("no longer available") ||
                             errorMessage.includes("not found");

          const isHighDemand = status === 503 ||
                               errorMessage.includes("503") || 
                               errorMessage.includes("high demand") || 
                               errorMessage.includes("unavailable") ||
                               errorMessage.includes("spikes in demand");

          const isTimedOut = status === 504 ||
                             errorMessage.includes("timed out") ||
                             errorMessage.includes("timeout");

          const isQuotaRateLimit = isZeroQuotaModel ||
                                   isDailyQuotaExceeded ||
                                   status === 429 ||
                                   errorMessage.includes("429") ||
                                   errorMessage.includes("resource_exhausted") ||
                                   errorMessage.includes("quota") ||
                                   errorMessage.includes("rate limit") ||
                                   errorMessage.includes("overloaded") ||
                                   errorMessage.includes("busy");

          if (isNotFound) {
            modelCooldowns.set(model, Date.now() + 24 * 60 * 60 * 1000);
            console.warn(`[Gemini Request Cascade] Model ${model} is not available (404). Cascading...`);
            break; // Skip to next model
          }

          if (isZeroQuotaModel) {
            modelCooldowns.set(model, Date.now() + 24 * 60 * 60 * 1000);
            console.warn(`[Gemini Request Cascade] Model ${model} has zero quota on current tier (limit: 0). Placed on 24h cooldown.`);
            if (hasNextModel) {
              console.warn(`[Gemini Request Cascade] Immediately cascading from ${model} to ${modelsToTry[mIdx + 1]}...`);
            }
            break;
          }

          // Daily Quota Exceeded (Free Tier 20 RPD limit)
          if (isDailyQuotaExceeded || (status === 429 && errorMessage.includes("perday"))) {
            const cdUntil = Date.now() + 24 * 60 * 60 * 1000;
            modelCooldowns.set(model, cdUntil);
            if (model === "gemini-3.8-flash") {
              modelCooldowns.set("gemini-flash-latest", cdUntil);
            }
            console.warn(`[Gemini Quota Notice] Model ${model} reached daily free tier limit. Put on 24h cooldown.`);
            if (hasNextModel) {
              console.warn(`[Gemini Request Cascade] Immediately cascading from ${model} to ${modelsToTry[mIdx + 1]}...`);
            }
            break;
          }

          // 503 High Demand: model cluster is temporarily overloaded on Google servers.
          if (isHighDemand) {
            const cdDuration = 60 * 1000; // 60-second cooldown for temporary demand spikes
            modelCooldowns.set(model, Date.now() + cdDuration);
            console.warn(`[Gemini Request Cascade] Model ${model} is experiencing high demand (503). Placed on 60s cooldown.`);
            if (hasNextModel) {
              console.warn(`[Gemini Request Cascade] Immediately cascading to next model: ${modelsToTry[mIdx + 1]}...`);
              break;
            } else {
              if (attempt < 2) {
                console.warn(`[Gemini Request Retry] Waiting 2s before final attempt for ${model}...`);
                await new Promise(r => setTimeout(r, 2000));
                continue;
              }
              break;
            }
          }

          // Request Timed Out: model stalled.
          if (isTimedOut) {
            modelCooldowns.set(model, Date.now() + 180 * 1000);
            console.warn(`[Gemini Request Cascade] Model ${model} request timed out.`);
            if (hasNextModel) {
              console.warn(`[Gemini Request Cascade] Immediately cascading to next model: ${modelsToTry[mIdx + 1]}...`);
              break;
            } else {
              if (attempt < 2) {
                await new Promise(r => setTimeout(r, 1500));
                continue;
              }
              break;
            }
          }

          // Rate limit / 429 Quota
          if (isQuotaRateLimit) {
            const cooldownMs = extractRetryDelayMs(error);
            modelCooldowns.set(model, Date.now() + cooldownMs);
            console.warn(`[Gemini Request Cascade] Model ${model} rate-limited (429, cooldown ${Math.round(cooldownMs / 1000)}s).`);

            // If it's a short RPM burst (under 3.5s) on gemini-3.1-flash-lite, pause and retry once before cascading
            if (cooldownMs <= 3500 && attempt === 1 && model === "gemini-3.1-flash-lite") {
              const waitTime = Math.max(cooldownMs, 1800);
              console.warn(`[Gemini Pacer] Waiting ${(waitTime / 1000).toFixed(1)}s for short RPM reset on ${model}...`);
              await new Promise(r => setTimeout(r, waitTime));
              continue;
            }

            if (hasNextModel) {
              console.warn(`[Gemini Request Cascade] Cascading to next model: ${modelsToTry[mIdx + 1]}...`);
              break;
            } else {
              if (attempt < maxModelAttempts) {
                const waitTime = Math.min(8000, Math.max(cooldownMs, 1500 * attempt));
                console.warn(`[Gemini Free Tier Pacer] Waiting ${(waitTime / 1000).toFixed(1)}s before retry #${attempt + 1}...`);
                await new Promise(r => setTimeout(r, waitTime));
                continue;
              }
              break;
            }
          }

          // Other unexpected errors
          console.warn(`[Gemini Request Notice] Model ${model} encountered non-quota error (status: ${status}):`, error.message || error);
          if (hasNextModel) {
            break;
          }
          if (attempt < 2) {
            await new Promise(r => setTimeout(r, 1000 * attempt));
            continue;
          }
        }
      }
    }

    // Final emergency rescue attempt if all cascade models failed
    if (!isImageModel) {
      const rescueModels = [
        "gemini-3.5-flash-lite",
        "gemini-3.6-flash",
        "gemini-3.1-flash-lite",
        "gemini-3.8-flash",
        "gemini-flash-latest",
        "gemini-3.5-flash"
      ];
      for (const rescueModel of rescueModels) {
        // Skip models that are currently in active cooldown
        if ((modelCooldowns.get(rescueModel) || 0) > Date.now()) {
          continue;
        }
        try {
          console.info(`[Gemini Emergency Rescue] Attempting rescue call with ${rescueModel}...`);
          const rescuePromise = ai.models.generateContent({
            model: rescueModel,
            contents: params.contents,
            config: params.config
          });
          const rescueTimer = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Rescue call with ${rescueModel} timed out after 90s`)), 90000);
          });
          const rescueResponse = (await Promise.race([rescuePromise, rescueTimer])) as any;
          modelCooldowns.delete(rescueModel);
          return rescueResponse;
        } catch (rescueErr: any) {
          const rMsg = (rescueErr?.message || "").toLowerCase();
          const rStatus = rescueErr?.status || rescueErr?.code;
          if (rStatus === 503 || rMsg.includes("503") || rMsg.includes("high demand") || rMsg.includes("unavailable")) {
            modelCooldowns.set(rescueModel, Date.now() + 60000);
          } else if (rStatus === 429 || rMsg.includes("429") || rMsg.includes("quota")) {
            const delay = extractRetryDelayMs(rescueErr);
            modelCooldowns.set(rescueModel, Date.now() + delay);
          }
          console.info(`[Gemini Emergency Rescue] Rescue call with ${rescueModel} unavailable:`, rMsg.slice(0, 80));
        }
      }
    }

    if (lastError) {
      const errMsg = (lastError.message || "").toLowerCase();
      if (errMsg.includes("limit: 0") || errMsg.includes("resource_exhausted") || errMsg.includes("quota") || errMsg.includes("429")) {
        const customErr = new Error("Временное ограничение частоты запросов Gemini API (квота). Пожалуйста, подождите несколько секунд и повторите генерацию.") as any;
        customErr.status = 429;
        throw customErr;
      }
      if (errMsg.includes("503") || errMsg.includes("high demand") || errMsg.includes("unavailable") || errMsg.includes("spikes in demand")) {
        const customErr = new Error("Серверы Gemini временно испытывают высокую нагрузку (503). Пожалуйста, повторите запрос через несколько секунд.") as any;
        customErr.status = 503;
        throw customErr;
      }
      if (errMsg.includes("timed out") || errMsg.includes("timeout")) {
        const customErr = new Error("Время ожидания ответа от модели Gemini истекло. Пожалуйста, повторите генерацию.") as any;
        customErr.status = 504;
        throw customErr;
      }
    }
    throw lastError || new Error("All fallback Gemini models failed to generate content.");
  });
}

function tryRepairJSON(text: string): any {
  let cleanText = text.trim();
  if (!cleanText) {
    throw new Error("Empty text");
  }

  // Remove markdown code blocks if present
  if (cleanText.includes("```json")) {
    const parts = cleanText.split("```json");
    if (parts.length > 1) {
      const secondPart = parts[1].split("```")[0];
      cleanText = secondPart.trim();
    }
  } else if (cleanText.includes("```")) {
    const parts = cleanText.split("```");
    if (parts.length > 1) {
      const secondPart = parts[1].trim();
      cleanText = secondPart;
    }
  }

  // Remove any leading or trailing junk text outside the first { or [ and the last } or ]
  const firstBrace = cleanText.indexOf('{');
  const firstBracket = cleanText.indexOf('[');
  let startIdx = -1;
  if (firstBrace !== -1 && firstBracket !== -1) {
    startIdx = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    startIdx = firstBrace;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
  }

  const lastBrace = cleanText.lastIndexOf('}');
  const lastBracket = cleanText.lastIndexOf(']');
  let endIdx = -1;
  if (lastBrace !== -1 && lastBracket !== -1) {
    endIdx = Math.max(lastBrace, lastBracket);
  } else if (lastBrace !== -1) {
    endIdx = lastBrace;
  } else if (lastBracket !== -1) {
    endIdx = lastBracket;
  }

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleanText = cleanText.substring(startIdx, endIdx + 1);
  }

  // Helper for cleanup of common JSON structural faults
  const sanitize = (str: string) => {
    let s = str.replace(/,\s*([\]}])/g, '$1');
    let inString = false;
    let result = '';
    for (let i = 0; i < s.length; i++) {
      const char = s[i];
      if (char === '"' && (i === 0 || s[i - 1] !== '\\')) {
        inString = !inString;
        result += char;
      } else if (inString && char === '\n') {
        result += '\\n';
      } else if (inString && char === '\r') {
        result += '\\r';
      } else {
        result += char;
      }
    }
    s = result;
    return s;
  };

  try {
    return JSON.parse(cleanText);
  } catch (_) {
    try {
      return JSON.parse(sanitize(cleanText));
    } catch (_) {}
  }

  // Backtracking repair (same robust scanner as client)
  const maxBacktrack = Math.min(cleanText.length, 2000);
  const startLen = cleanText.length;
  const endLen = Math.max(1, cleanText.length - maxBacktrack);

  for (let len = startLen; len >= endLen; len--) {
    const sub = cleanText.substring(0, len);
    let inString = false;
    let escape = false;
    const stack: ('{' | '[')[] = [];
    let validCharScan = true;
    
    for (let i = 0; i < sub.length; i++) {
      const char = sub[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (char === '\\') {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === '{') {
          stack.push('{');
        } else if (char === '[') {
          stack.push('[');
        } else if (char === '}') {
          if (stack.length > 0 && stack[stack.length - 1] === '{') {
            stack.pop();
          } else {
            validCharScan = false;
            break;
          }
        } else if (char === ']') {
          if (stack.length > 0 && stack[stack.length - 1] === '[') {
            stack.pop();
          } else {
            validCharScan = false;
            break;
          }
        }
      }
    }
    
    if (!validCharScan) {
      continue;
    }
    
    let candidate = sub;
    if (inString) {
      candidate += '"';
    }
    
    for (let j = stack.length - 1; j >= 0; j--) {
      if (stack[j] === '{') {
        candidate += '}';
      } else {
        candidate += ']';
      }
    }
    
    try {
      return JSON.parse(candidate);
    } catch (_) {
      try {
        return JSON.parse(sanitize(candidate));
      } catch (_) {}
    }
  }

  // Last-ditch effort: try to match any {...} or [...] inside text
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(sanitize(match[0]));
    }
  } catch (_) {}

  throw new Error("Failed to parse and repair JSON");
}

dotenv.config();

console.log("Starting server...");


// Initialize Firebase Admin with more safety
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin initialized");
  } else {
    // Check if we have default credentials before trying to initialize
    try {
      admin.initializeApp();
      console.log("Firebase Admin initialized with default credentials");
    } catch (e) {
      console.warn("Firebase Admin failed to initialize, skipping.");
    }
  }
} catch (e) {
  console.error("Error initializing Firebase Admin:", e);
}

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.platform === 'win32' ? os.tmpdir() : '/tmp', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
  console.log("Created uploads directory");
}

// @ts-ignore
const _filename = typeof __filename !== "undefined" ? __filename : "";
// @ts-ignore
const _dirname = typeof __dirname !== "undefined" ? __dirname : "";


// Local database stored persistently in project directory with fallback to tmp
// Local database stored persistently in project directory with fallback to tmp and memory
const PERSISTENT_DATA_FILE = path.join(process.cwd(), '.server_data.json');
const BAK_DATA_FILE = path.join(process.cwd(), '.server_data.bak');
const TMP_DATA_FILE = path.join(process.platform === 'win32' ? os.tmpdir() : '/tmp', 'server_data.json');
let inMemoryDbCache: any = null;

function getDataFilePath(): string {
  try {
    if (!fs.existsSync(PERSISTENT_DATA_FILE)) {
      if (fs.existsSync(BAK_DATA_FILE)) {
        try {
          const bak = fs.readFileSync(BAK_DATA_FILE, 'utf8');
          fs.writeFileSync(PERSISTENT_DATA_FILE, bak, 'utf8');
        } catch (_) {}
      } else if (fs.existsSync(TMP_DATA_FILE)) {
        try {
          const legacy = fs.readFileSync(TMP_DATA_FILE, 'utf8');
          fs.writeFileSync(PERSISTENT_DATA_FILE, legacy, 'utf8');
        } catch (_) {}
      } else {
        const initial = {
          scheduled_videos: [],
          youtube_tokens: {},
          cached_channel_stats: {},
          cached_performance: {},
          app_url: ""
        };
        fs.writeFileSync(PERSISTENT_DATA_FILE, JSON.stringify(initial, null, 2), 'utf8');
      }
    }
    fs.accessSync(PERSISTENT_DATA_FILE, fs.constants.W_OK);
    return PERSISTENT_DATA_FILE;
  } catch (e) {
    return TMP_DATA_FILE;
  }
}

function readDb() {
  const filePath = getDataFilePath();
  let content = "";

  if (fs.existsSync(filePath)) {
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch (_) {}
  }

  if (!content.trim() && fs.existsSync(BAK_DATA_FILE)) {
    try {
      content = fs.readFileSync(BAK_DATA_FILE, 'utf8');
    } catch (_) {}
  }

  if (!content.trim() && fs.existsSync(TMP_DATA_FILE)) {
    try {
      content = fs.readFileSync(TMP_DATA_FILE, 'utf8');
    } catch (_) {}
  }

  if (content && content.trim()) {
    try {
      const data = JSON.parse(content);
      if (data && typeof data === "object") {
        data.scheduled_videos = Array.isArray(data.scheduled_videos) ? data.scheduled_videos : [];
        data.youtube_tokens = data.youtube_tokens || {};
        data.cached_channel_stats = data.cached_channel_stats || {};
        data.cached_performance = data.cached_performance || {};

        if ("api_keys" in data) {
          if (!data.youtube_oauth) {
            data.youtube_oauth = {
              client_id: data.api_keys.yt_client_id || "",
              client_secret: data.api_keys.yt_client_secret || ""
            };
          }
          delete data.api_keys;
        }

        inMemoryDbCache = data;
        return data;
      }
    } catch (e) {
      console.error("Error parsing db file, falling back to memory cache:", e);
      if (inMemoryDbCache) return inMemoryDbCache;
    }
  }

  if (inMemoryDbCache) return inMemoryDbCache;

  const defaultData = {
    scheduled_videos: [],
    youtube_tokens: {},
    cached_channel_stats: {},
    cached_performance: {},
    app_url: ""
  };
  inMemoryDbCache = defaultData;
  return defaultData;
}

function writeDb(data: any) {
  if (!data || typeof data !== "object") return;
  inMemoryDbCache = data;
  const filePath = getDataFilePath();
  const jsonStr = JSON.stringify(data, null, 2);

  try {
    fs.writeFileSync(filePath, jsonStr, 'utf8');
  } catch (err) {
    console.error("Error writing to primary db file, using fallback:", err);
  }

  try {
    fs.writeFileSync(BAK_DATA_FILE, jsonStr, 'utf8');
  } catch (_) {}

  try {
    fs.writeFileSync(TMP_DATA_FILE, jsonStr, 'utf8');
  } catch (_) {}
}

function getUserKeyFromProfile(profile: any): string | null {
  if (!profile) return null;
  if (typeof profile === "string") return profile || null;
  if (profile.id) return String(profile.id);
  if (profile.email) return String(profile.email);
  return null;
}

function getUserProfileStorageKey(userKey: string | null | undefined): string {
  return `${userKey || "global"}_user`;
}

function getCurrentUserKey(req?: express.Request): string | null {
  try {
    const headerUserId = req?.headers?.["x-youtube-user-id"] as string;
    if (headerUserId && headerUserId !== "undefined" && headerUserId !== "null") {
      return String(headerUserId);
    }

    if (req?.cookies?.youtube_user_id) {
      return String(req.cookies.youtube_user_id);
    }

    const info = req?.cookies?.google_user;
    if (info) {
      const parsed = JSON.parse(info);
      const key = getUserKeyFromProfile(parsed);
      if (key) return key;
    }

    const dbData = readDb();
    if (dbData.active_user) return String(dbData.active_user);
    return "global";
  } catch (e) {
    const dbData = readDb();
    if (dbData.active_user) return String(dbData.active_user);
    return "global";
  }
}

function saveActiveAuthUser(dbData: any, userProfile: any, tokens: any) {
  const userKey = getUserKeyFromProfile(userProfile) || "global";
  dbData.youtube_tokens = dbData.youtube_tokens || {};
  dbData.youtube_tokens[userKey] = tokens;
  dbData.active_user = userKey;
  dbData.youtube_tokens[getUserProfileStorageKey(userKey)] = userProfile;
}

function getCookieOptions() {
  return {
    httpOnly: true,
    secure: true, // Always true because app runs over HTTPS in AI Studio iframe
    sameSite: "none" as const, // Required for third-party cookie access in iframe
    partitioned: true, // CHIPS support for modern browsers
    maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year persistence
  };
}

function getOAuth2Client(req?: express.Request) {
  const dbData = readDb();
  const dbOAuth = dbData.youtube_oauth || {};
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.OAUTH_CLIENT_ID || dbOAuth.client_id || '732408976087-q0p1bn26qiivf3tmmjvc0b74qfiau1kg.apps.googleusercontent.com';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.OAUTH_CLIENT_SECRET || dbOAuth.client_secret;
  let appUrl = (process.env.APP_URL || process.env.VITE_APP_URL || dbOAuth.app_url || "").trim();

  if (!appUrl && req) {
    const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
    const host = req.headers["x-forwarded-host"] || req.get("host") || "localhost:3000";
    appUrl = `${proto}://${host}`;
  }

  if (!appUrl) {
    appUrl = "http://localhost:3000";
  }

  appUrl = appUrl.replace(/\/+$/, "");

  if (!clientId || !clientSecret) {
    throw new Error("Missing required YouTube OAuth credentials in the server environment.");
  }

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    `${appUrl}/auth/callback`
  );
}

async function getYouTubeClient(req: express.Request, res: express.Response) {
  const dbData = readDb();
  const headerTokens = (req.headers["x-youtube-tokens"] as string) || (req.headers["authorization"]?.startsWith("Bearer ") ? req.headers["authorization"].substring(7) : "");
  const headerUserId = req.headers["x-youtube-user-id"] as string;
  const activeUserKey = headerUserId || getCurrentUserKey(req) || "global";

  let tokensStr = (headerTokens && headerTokens !== "undefined" && headerTokens !== "null") ? headerTokens : req.cookies?.youtube_tokens;

  if (!tokensStr && dbData.youtube_tokens?.[activeUserKey]) {
    tokensStr = JSON.stringify(dbData.youtube_tokens[activeUserKey]);
  }
  if (!tokensStr && dbData.active_user && dbData.youtube_tokens?.[dbData.active_user]) {
    tokensStr = JSON.stringify(dbData.youtube_tokens[dbData.active_user]);
  }
  if (!tokensStr && dbData.youtube_tokens?.["global"]) {
    tokensStr = JSON.stringify(dbData.youtube_tokens["global"]);
  }
  if (!tokensStr && dbData.youtube_tokens) {
    const validKey = Object.keys(dbData.youtube_tokens).find(k => !k.endsWith('_user') && (dbData.youtube_tokens[k]?.access_token || dbData.youtube_tokens[k]?.refresh_token));
    if (validKey) {
      tokensStr = JSON.stringify(dbData.youtube_tokens[validKey]);
    }
  }

  if (!tokensStr) {
    throw new Error("Not authenticated");
  }

  let tokens: any;
  try {
    tokens = typeof tokensStr === "string" ? JSON.parse(tokensStr) : tokensStr;
  } catch (parseErr) {
    throw new Error("Not authenticated");
  }

  if (tokens && typeof tokens === "object") {
    // Keep server db in sync with client tokens
    if (!dbData.youtube_tokens?.[activeUserKey] || JSON.stringify(dbData.youtube_tokens[activeUserKey]) !== JSON.stringify(tokens)) {
      dbData.youtube_tokens = dbData.youtube_tokens || {};
      dbData.youtube_tokens[activeUserKey] = tokens;
      dbData.active_user = activeUserKey;
      writeDb(dbData);
    }
  }

  const oauth2Client = getOAuth2Client(req);
  oauth2Client.setCredentials(tokens);

  oauth2Client.on('tokens', (newTokens) => {
    const combinedTokens = { ...tokens, ...newTokens };
    const currentDb = readDb();
    currentDb.youtube_tokens = currentDb.youtube_tokens || {};
    currentDb.youtube_tokens[activeUserKey] = combinedTokens;
    currentDb.active_user = activeUserKey;
    writeDb(currentDb);

    try {
      res.cookie("youtube_tokens", JSON.stringify(combinedTokens), getCookieOptions());
    } catch (_) {}
  });

  return google.youtube({ version: "v3", auth: oauth2Client });
}

// Multer setup for video uploads
const upload = multer({ dest: UPLOADS_DIR });

// Background worker to process scheduled uploads
setInterval(async () => {
  const now = new Date();
  
  try {
    const dbData = readDb();
    const pendingVideos = dbData.scheduled_videos.filter((v: any) => v.status === "pending");
    
    if (pendingVideos.length > 0) {
      console.log(`Found ${pendingVideos.length} pending tasks.`);
    }

    let hasChanges = false;

    for (const task of pendingVideos) {
      const publishAt = new Date(task.publishAt);

      if (publishAt <= now) {
        try {
          console.log(`Processing scheduled upload: ${task.title}`);
          
          const userTokens = dbData.youtube_tokens[task.uid];
          
          if (!userTokens) {
            console.error(`No tokens found for user ${task.uid}`);
            task.status = "failed";
            hasChanges = true;
            continue;
          }
          
          const { tokens } = userTokens;
          const oauth2Client = getOAuth2Client();
          oauth2Client.setCredentials(tokens);
          const youtube = google.youtube({ version: "v3", auth: oauth2Client });

          await youtube.videos.insert({
            part: ["snippet", "status"],
            requestBody: {
              snippet: {
                title: task.title,
                description: task.description,
                tags: task.tags,
                categoryId: "22" // People & Blogs
              },
              status: {
                privacyStatus: "public",
                publishAt: publishAt.toISOString()
              }
            },
            media: {
              body: fs.createReadStream(task.videoPath)
            }
          });

          task.status = "published";
          hasChanges = true;
          console.log(`Successfully published: ${task.title}`);
          
          // Clean up file
          if (fs.existsSync(task.videoPath)) {
            fs.unlinkSync(task.videoPath);
          }
        } catch (error) {
          console.error(`Failed to publish ${task.title}:`, error);
          task.status = "failed";
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      writeDb(dbData);
    }
  } catch (error) {
    console.error("Error in background worker:", error);
  }
}, 60000); // Check every minute

// Vite middleware for development
async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "60mb" }));
  app.use(express.urlencoded({ limit: "60mb", extended: true }));
  app.use(cookieParser());

  app.use((req, res, next) => {
    if (req.url.startsWith("/api/")) {
      console.log(`[API] ${req.method} ${req.url}`);
    }
    next();
  });

  // API Routes
  app.get("/api/settings/youtube", (req, res) => {
    const dbData = readDb();
    const dbOAuth = dbData.youtube_oauth || {};
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.OAUTH_CLIENT_ID || dbOAuth.client_id || "";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.OAUTH_CLIENT_SECRET || dbOAuth.client_secret || "";
    const appUrl = process.env.APP_URL || process.env.VITE_APP_URL || dbOAuth.app_url || "";
    res.json({ 
      configured: Boolean(clientId && clientSecret && appUrl), 
      appUrl,
      // We don't send the secret back, just a boolean indicator if it's stored in DB
      hasDbSecret: Boolean(dbOAuth.client_secret),
      clientId: clientId
    });
  });

  app.post("/api/settings/youtube", (req, res) => {
    try {
      const { client_id, client_secret, app_url, clientId, clientSecret, appUrl } = req.body;
      const dbData = readDb();
      dbData.youtube_oauth = dbData.youtube_oauth || {};
      
      const cId = client_id || clientId;
      const cSec = client_secret || clientSecret;
      const aUrl = app_url || appUrl;

      if (cId !== undefined) dbData.youtube_oauth.client_id = cId;
      if (cSec !== undefined && cSec !== "") dbData.youtube_oauth.client_secret = cSec;
      if (aUrl !== undefined) dbData.youtube_oauth.app_url = aUrl;
      
      writeDb(dbData);
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving YouTube settings:", error);
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

  app.get("/api/settings/app-url", (req, res) => {
    const dbData = readDb();
    const dbOAuth = dbData.youtube_oauth || {};
    const appUrl = process.env.APP_URL || process.env.VITE_APP_URL || dbOAuth.app_url || "";
    res.json({ appUrl });
  });

  app.post("/api/settings/app-url", (req, res) => {
    try {
      const { app_url, appUrl } = req.body;
      const aUrl = app_url || appUrl;
      const dbData = readDb();
      dbData.youtube_oauth = dbData.youtube_oauth || {};
      if (aUrl !== undefined) dbData.youtube_oauth.app_url = aUrl;
      writeDb(dbData);
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving app-url:", error);
      res.status(500).json({ error: "Failed to save app-url" });
    }
  });

  // Pexels B-Roll Video Search Proxy with automatic Russian-to-English stock keyword translation
  app.get("/api/pexels/search", async (req, res) => {
    try {
      const rawQuery = ((req.query.query as string) || "cinematic").trim();
      const orientation = (req.query.orientation as string) || "all";
      const perPage = Math.min(parseInt((req.query.per_page as string) || "12", 10), 30);
      const page = parseInt((req.query.page as string) || "1", 10);
      const customKey = req.headers["x-pexels-key"] as string;

      // Primary Pexels API key or fallback working stock key
      let apiKey = customKey || process.env.PEXELS_API_KEY || "563492ad6f9170000100000185e495a898b14a60b943d0774a88f72a";

      let cleanQuery = rawQuery;

      // Translate Cyrillic queries using Gemini AI or keyword extraction
      if (/[^\x00-\x7F]/.test(cleanQuery)) {
        try {
          const ai = getGeminiClient();
          const aiRes = await generateContentWithFallback(ai, "gemini-3.1-flash-lite", {
            contents: `Translate and convert this video prompt/keywords into 2-4 English stock video search keywords (for Pexels API). Output ONLY English space-separated keywords without punctuation or quotes.
Input: "${cleanQuery}"`
          });
          const translated = (aiRes.text || "").trim().replace(/[^a-zA-Z0-9\s]/g, "");
          if (translated) {
            cleanQuery = translated;
          }
        } catch (err) {
          console.warn("[Pexels Proxy] Gemini translation error, using raw query:", err);
        }
      }

      let pexelsUrl = `https://api.pexels.com/videos/search?query=${encodeURIComponent(cleanQuery)}&per_page=${perPage}&page=${page}`;
      if (orientation && orientation !== "all") {
        pexelsUrl += `&orientation=${orientation}`;
      }

      const pexelsRes = await fetch(pexelsUrl, {
        headers: {
          Authorization: apiKey
        }
      });

      if (pexelsRes.ok) {
        const data = await pexelsRes.json();
        return res.json({
          ...data,
          queryUsed: cleanQuery,
          rawQuery
        });
      } else {
        console.warn(`[Pexels Proxy] API returned status ${pexelsRes.status}`);
        return res.status(pexelsRes.status).json({
          error: `Pexels API error ${pexelsRes.status}`,
          queryUsed: cleanQuery,
          rawQuery
        });
      }
    } catch (err: any) {
      console.error("[Pexels Proxy Error]:", err);
      return res.status(500).json({ error: err.message || "Failed to search Pexels" });
    }
  });

  app.get("/api/auth/url", (req, res) => {
    try {
      const oauth2Client = getOAuth2Client(req);
      const scopes = [
        "openid",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/youtube.readonly",
        "https://www.googleapis.com/auth/yt-analytics.readonly",
        "https://www.googleapis.com/auth/youtube.upload"
      ];

      const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: scopes,
        prompt: "consent select_account" // Force consent screen to ensure refresh_token is provided
      });

      res.json({ url });
    } catch (error: any) {
      if (!error.message.includes("Missing required credentials")) {
        console.error("Auth URL error:", error);
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    const headerTokens = (req.headers["x-youtube-tokens"] as string) || "";
    const headerUserId = req.headers["x-youtube-user-id"] as string;
    let tokensStr = (headerTokens && headerTokens !== "undefined" && headerTokens !== "null") ? headerTokens : req.cookies?.youtube_tokens;
    let userStr = req.cookies?.google_user;
    const dbData = readDb();
    const activeUserKey = headerUserId || getCurrentUserKey(req) || dbData.active_user || "global";

    if (!tokensStr && dbData.youtube_tokens?.[activeUserKey]) {
      tokensStr = JSON.stringify(dbData.youtube_tokens[activeUserKey]);
      try { res.cookie("youtube_tokens", tokensStr, getCookieOptions()); } catch (_) {}
    }
    if (!tokensStr && dbData.active_user && dbData.youtube_tokens?.[dbData.active_user]) {
      tokensStr = JSON.stringify(dbData.youtube_tokens[dbData.active_user]);
      try { res.cookie("youtube_tokens", tokensStr, getCookieOptions()); } catch (_) {}
    }
    if (!tokensStr && dbData.youtube_tokens?.["global"]) {
      tokensStr = JSON.stringify(dbData.youtube_tokens["global"]);
      try { res.cookie("youtube_tokens", tokensStr, getCookieOptions()); } catch (_) {}
    }
    if (!tokensStr && dbData.youtube_tokens) {
      const validKey = Object.keys(dbData.youtube_tokens).find(k => !k.endsWith('_user') && (dbData.youtube_tokens[k]?.access_token || dbData.youtube_tokens[k]?.refresh_token));
      if (validKey) {
        tokensStr = JSON.stringify(dbData.youtube_tokens[validKey]);
      }
    }

    const userProfileKey = getUserProfileStorageKey(activeUserKey);
    if (!userStr && dbData.youtube_tokens?.[userProfileKey]) {
      userStr = JSON.stringify(dbData.youtube_tokens[userProfileKey]);
      try { res.cookie("google_user", userStr, getCookieOptions()); } catch (_) {}
    }

    if (!tokensStr) {
      return res.json({ user: null });
    }

    try {
      const tokens = typeof tokensStr === "string" ? JSON.parse(tokensStr) : tokensStr;

      if (userStr) {
        const parsedUser = JSON.parse(userStr);
        return res.json({ user: parsedUser, tokens, activeUser: activeUserKey });
      }

      const oauth2Client = getOAuth2Client(req);
      oauth2Client.setCredentials(tokens);

      const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
      const userInfoRes = await oauth2.userinfo.get();
      const userInfo = userInfoRes.data;
      const userKey = getUserKeyFromProfile(userInfo) || activeUserKey || "global";

      try {
        res.cookie("google_user", JSON.stringify(userInfo), getCookieOptions());
        res.cookie("youtube_user_id", userKey, getCookieOptions());
      } catch (_) {}

      try {
        dbData.youtube_tokens = dbData.youtube_tokens || {};
        dbData.youtube_tokens[userKey] = tokens;
        dbData.active_user = userKey;
        dbData.youtube_tokens[getUserProfileStorageKey(userKey)] = userInfo;
        writeDb(dbData);
      } catch (err) {
        console.error("Error writing user auth to db:", err);
      }

      return res.json({ user: userInfo, tokens, activeUser: userKey });
    } catch (e: any) {
      return res.json({ user: null });
    }
  });

  app.get("/auth/callback", async (req, res) => {
    const { code } = req.query;

    try {
      const oauth2Client = getOAuth2Client(req);
      const { tokens } = await oauth2Client.getToken(code as string);

      oauth2Client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
      const userInfoRes = await oauth2.userinfo.get();
      const userInfo = userInfoRes.data;
      const userKey = getUserKeyFromProfile(userInfo) || "global";

      try {
        res.cookie("youtube_tokens", JSON.stringify(tokens), getCookieOptions());
        res.cookie("google_user", JSON.stringify(userInfo), getCookieOptions());
        res.cookie("youtube_user_id", userKey, getCookieOptions());
      } catch (_) {}

      const dbData = readDb();
      saveActiveAuthUser(dbData, userInfo, tokens);
      writeDb(dbData);

      res.send(`
        <html>
          <body>
            <script>
              const authData = {
                type: 'OAUTH_AUTH_SUCCESS',
                tokens: ${JSON.stringify(tokens)},
                user: ${JSON.stringify(userInfo)},
                userId: ${JSON.stringify(userKey)}
              };
              try {
                if (window.opener) {
                  window.opener.postMessage(authData, '*');
                  setTimeout(() => window.close(), 400);
                } else {
                  window.location.href = '/';
                }
              } catch (e) {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window will close automatically.</p>
          </body>
        </html>
      `);
    } catch (error: any) {
      if (!error.message?.includes("Missing required credentials")) {
        console.error("Error exchanging code for tokens:", error);
      }
      res.status(500).send("Authentication failed");
    }
  });

  app.get("/api/youtube/stats", async (req, res) => {
    const dbData = readDb();
    const activeUserKey = (req.headers["x-youtube-user-id"] as string) || getCurrentUserKey(req) || "global";

    try {
      const youtube = await getYouTubeClient(req, res);
      const response = await youtube.channels.list({
        part: ["snippet", "statistics"],
        mine: true
      });

      const channel = response.data.items?.[0];
      if (!channel) {
        if (dbData.cached_channel_stats?.[activeUserKey]) {
          return res.json({ ...dbData.cached_channel_stats[activeUserKey], fromCache: true });
        }
        return res.status(404).json({ error: "Channel not found" });
      }

      const statsData = {
        title: channel.snippet?.title,
        subscribers: channel.statistics?.subscriberCount,
        views: channel.statistics?.viewCount,
        videos: channel.statistics?.videoCount,
        thumbnail: channel.snippet?.thumbnails?.default?.url,
        isDemo: false
      };

      // Cache stats in DB
      try {
        dbData.cached_channel_stats = dbData.cached_channel_stats || {};
        dbData.cached_channel_stats[activeUserKey] = statsData;
        dbData.cached_channel_stats["global"] = statsData;
        writeDb(dbData);
      } catch (_) {}

      res.json(statsData);
    } catch (error: any) {
      if (error.message === "Not authenticated") {
        if (dbData.cached_channel_stats?.[activeUserKey]) {
          return res.json({ ...dbData.cached_channel_stats[activeUserKey], fromCache: true });
        }
        return res.status(401).json({ error: "Not authenticated" });
      }

      if (dbData.cached_channel_stats?.[activeUserKey]) {
        return res.json({ ...dbData.cached_channel_stats[activeUserKey], fromCache: true });
      }
      if (dbData.cached_channel_stats?.["global"]) {
        return res.json({ ...dbData.cached_channel_stats["global"], fromCache: true });
      }

      const errMsg = error.message || "";
      if (errMsg.includes("has not been used") || errMsg.includes("disabled") || errMsg.includes("Missing required credentials")) {
        return res.json({
          title: "Демо-канал (YouTube API не активен)",
          subscribers: "12500",
          views: "450000",
          videos: "84",
          thumbnail: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=120&auto=format&fit=crop&q=60",
          isDemo: true,
          apiDisabled: true,
          apiDisabledLink: "https://console.developers.google.com/apis/api/youtube.googleapis.com/overview",
          error: "YouTube Data API v3 has not been enabled in your Google Cloud Console yet. Please visit the link to enable the API."
        });
      }
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.get("/api/youtube/performance", async (req, res) => {
    const dbData = readDb();
    const activeUserKey = (req.headers["x-youtube-user-id"] as string) || getCurrentUserKey(req) || "global";

    try {
      const youtube = await getYouTubeClient(req, res);
      const analytics = google.youtubeAnalytics({ version: "v2", auth: (youtube as any).context._options.auth });
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 28);
      const formatDate = (date: Date) => date.toISOString().slice(0, 10);

      const report = await analytics.reports.query({
        ids: "channel==MINE",
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        metrics: "views,averageViewDuration,averageViewPercentage,impressions,impressionsCtr,likes",
        dimensions: "video",
        sort: "-views",
        maxResults: 10
      });

      const headers = report.data.columnHeaders?.map((header: any) => header.name) || [];
      const rows = (report.data.rows || []).map((row: any[]) => Object.fromEntries(headers.map((header: string, index: number) => [header, row[index]])));
      const videoIds = rows.map((row: any) => row.video).filter(Boolean);
      const videoDetails = videoIds.length
        ? await youtube.videos.list({ part: ["snippet"], id: videoIds })
        : { data: { items: [] } };
      const titles = new Map((videoDetails.data.items || []).map((video: any) => [video.id, video.snippet?.title || "Untitled video"]));
      const videos = rows.map((row: any) => ({
        id: row.video,
        title: titles.get(row.video) || "Untitled video",
        views: Number(row.views || 0),
        averageViewDuration: Number(row.averageViewDuration || 0),
        retention: Number(row.averageViewPercentage || 0),
        impressions: Number(row.impressions || 0),
        ctr: Number(row.impressionsCtr || 0),
        likes: Number(row.likes || 0)
      }));
      const totals = videos.reduce((acc: any, video: any) => ({
        views: acc.views + video.views,
        impressions: acc.impressions + video.impressions,
        weightedCtr: acc.weightedCtr + video.ctr * video.impressions,
        weightedRetention: acc.weightedRetention + video.retention * video.views
      }), { views: 0, impressions: 0, weightedCtr: 0, weightedRetention: 0 });

      const perfResult = {
        period: { startDate: formatDate(startDate), endDate: formatDate(endDate) },
        videos,
        summary: {
          ctr: totals.impressions ? totals.weightedCtr / totals.impressions : 0,
          retention: totals.views ? totals.weightedRetention / totals.views : 0,
          views: totals.views
        }
      };

      try {
        dbData.cached_performance = dbData.cached_performance || {};
        dbData.cached_performance[activeUserKey] = perfResult;
        dbData.cached_performance["global"] = perfResult;
        writeDb(dbData);
      } catch (_) {}

      res.json(perfResult);
    } catch (error: any) {
      if (dbData.cached_performance?.[activeUserKey]) {
        return res.json({ ...dbData.cached_performance[activeUserKey], fromCache: true });
      }
      if (dbData.cached_performance?.["global"]) {
        return res.json({ ...dbData.cached_performance["global"], fromCache: true });
      }

      const message = error.message || "Failed to fetch YouTube Analytics";
      if (message.includes("insufficient authentication scopes") || message.includes("forbidden")) {
        return res.status(403).json({ error: "Reconnect YouTube to grant Analytics access", requiresReconnect: true });
      }
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/youtube/my-videos", async (req, res) => {
    const { ideas } = req.body;
    try {
      const youtube = await getYouTubeClient(req, res);
      const response = await youtube.channels.list({
        part: ["contentDetails"],
        mine: true
      });

      const uploadsPlaylistId = response.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
      if (!uploadsPlaylistId) {
        return res.status(404).json({ error: "Uploads playlist not found" });
      }

      const playlistItemsRes = await youtube.playlistItems.list({
        part: ["snippet", "status"],
        playlistId: uploadsPlaylistId,
        maxResults: 50
      });

      const videoIds = playlistItemsRes.data.items?.map((item: any) => item.snippet?.resourceId?.videoId).filter(Boolean) || [];
      
      let videos: any[] = [];
      if (videoIds.length > 0) {
        const videosRes = await youtube.videos.list({
          part: ["snippet", "status", "statistics"],
          id: videoIds
        });
        videos = videosRes.data.items?.map((v: any) => ({
          id: v.id,
          title: v.snippet?.title,
          description: v.snippet?.description,
          publishedAt: v.snippet?.publishedAt,
          thumbnail: v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url,
          privacyStatus: v.status?.privacyStatus, // public, private, unlisted
          viewCount: v.statistics?.viewCount || 0,
          likeCount: v.statistics?.likeCount || 0,
        })) || [];
      }

      res.json({ videos, isDemo: false });
    } catch (error: any) {
      // Return beautiful demo videos matching the ideas
      const demoIdeas = Array.isArray(ideas) ? ideas : [];
      const mockVideos = demoIdeas.map((idea: any, idx: number) => {
        const title = typeof idea === "string" ? idea : (idea.title || idea.topic || `Идея ${idx + 1}`);
        const isPublished = idx % 2 === 0;
        return {
          id: `demo-vid-${idx}`,
          title: title,
          description: `Описание для видео по теме: ${title}. Оптимизировано под YouTube SEO.`,
          publishedAt: new Date(Date.now() - idx * 24 * 60 * 60 * 1000).toISOString(),
          thumbnail: `https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=320&auto=format&fit=crop&q=60`,
          privacyStatus: isPublished ? "public" : "private",
          viewCount: isPublished ? Math.floor(Math.random() * 5000) + 1200 : 0,
          likeCount: isPublished ? Math.floor(Math.random() * 300) + 45 : 0,
        };
      });

      res.json({
        videos: mockVideos,
        isDemo: true,
        error: error.message || "Using demo data"
      });
    }
  });

  app.get("/api/youtube/playlists", async (req, res) => {
    try {
      const youtube = await getYouTubeClient(req, res);
      const response = await youtube.playlists.list({
        part: ["snippet", "contentDetails", "status"],
        mine: true,
        maxResults: 50
      });

      const playlists = response.data.items?.map((item: any) => ({
        id: item.id,
        title: item.snippet?.title || "Без названия",
        description: item.snippet?.description || "",
        thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || "",
        itemCount: item.contentDetails?.itemCount || 0,
        privacyStatus: item.status?.privacyStatus || "public",
        publishedAt: item.snippet?.publishedAt || new Date().toISOString()
      })) || [];

      res.json({ playlists, isDemo: false });
    } catch (error: any) {
      // Demo mock playlists
      const mockPlaylists = [
        {
          id: "demo-pl-1",
          title: "Полный курс & Базовые основы",
          description: "Пошаговое руководство от базовых принципов до уверенных результатов. Все серии в правильной логической последовательности.",
          thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=60",
          itemCount: 6,
          privacyStatus: "public",
          publishedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "demo-pl-2",
          title: "Топ фишек и скрытых возможностей",
          description: "Продвинутые приемы, неочевидные лайфхаки и разбор кейсов для ускорения работы.",
          thumbnail: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop&q=60",
          itemCount: 12,
          privacyStatus: "public",
          publishedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "demo-pl-3",
          title: "Разборы ошибок и Антикейсы",
          description: "Чего ни в коем случае нельзя делать. Анализируем частые грабли и как их избежать.",
          thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&auto=format&fit=crop&q=60",
          itemCount: 4,
          privacyStatus: "unlisted",
          publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      res.json({
        playlists: mockPlaylists,
        isDemo: true,
        error: error.message || "Using demo mode"
      });
    }
  });

  app.post("/api/youtube/create-playlist", async (req, res) => {
    const { title, description, privacyStatus = "public" } = req.body;
    try {
      const youtube = await getYouTubeClient(req, res);
      const response = await youtube.playlists.insert({
        part: ["snippet", "status"],
        requestBody: {
          snippet: {
            title: title || "Новый плейлист",
            description: description || "Создано с помощью AI Studio"
          },
          status: {
            privacyStatus: privacyStatus || "public"
          }
        }
      });
      res.json({
        playlist: {
          id: response.data.id,
          title: response.data.snippet?.title || title,
          description: response.data.snippet?.description || description,
          thumbnail: response.data.snippet?.thumbnails?.medium?.url || response.data.snippet?.thumbnails?.default?.url || "",
          itemCount: 0,
          privacyStatus: response.data.status?.privacyStatus || privacyStatus,
          publishedAt: response.data.snippet?.publishedAt || new Date().toISOString()
        },
        isDemo: false
      });
    } catch (error: any) {
      // Demo mock fallback if no credentials/tokens are provided, or if user is offline
      const mockPlaylist = {
        id: `demo-playlist-${Date.now()}`,
        title: title || "Новый плейлист (Демо)",
        description: description || "Описание создано автоматически.",
        thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=60",
        itemCount: 0,
        privacyStatus: privacyStatus || "public",
        publishedAt: new Date().toISOString()
      };
      res.json({
        playlist: mockPlaylist,
        isDemo: true,
        error: error.message || "Using demo mode"
      });
    }
  });

  app.post("/api/youtube/playlists/add-item", async (req, res) => {
    const { playlistId, videoId } = req.body;
    try {
      const youtube = await getYouTubeClient(req, res);
      const response = await youtube.playlistItems.insert({
        part: ["snippet"],
        requestBody: {
          snippet: {
            playlistId,
            resourceId: {
              kind: "youtube#video",
              videoId: videoId || "demo-video-id"
            }
          }
        }
      });
      res.json({ item: response.data, isDemo: false, success: true });
    } catch (error: any) {
      res.json({
        isDemo: true,
        success: true,
        message: "Элемент успешно привязан к плейлисту (демо-режим)",
        error: error.message || "Demo mode"
      });
    }
  });

  app.post("/api/youtube/publish", upload.single("video"), async (req, res) => {
    const dbData = readDb();
    const activeUserKey = getCurrentUserKey(req) || req.body?.uid || "global";
    let tokensStr = req.cookies.youtube_tokens;

    if (!tokensStr && dbData.youtube_tokens?.[activeUserKey]) {
      tokensStr = JSON.stringify(dbData.youtube_tokens[activeUserKey]);
    }

    if (!tokensStr && dbData.youtube_tokens?.["global"]) {
      tokensStr = JSON.stringify(dbData.youtube_tokens["global"]);
    }

    if (!tokensStr) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { title, description, tags, publishAt, uid } = req.body;
    const videoFile = req.file;

    if (!videoFile) {
      return res.status(400).json({ error: "No video file uploaded" });
    }

    if (!uid) {
      return res.status(400).json({ error: "User UID is required" });
    }

    // Publishing and scheduling are never available in demo mode. Verify the
    // authenticated channel immediately before creating a persistent task.
    try {
      const youtube = await getYouTubeClient(req, res);
      const channel = await youtube.channels.list({ part: ["id"], mine: true });
      if (!channel.data.items?.[0]?.id) throw new Error("Live YouTube channel is unavailable");
    } catch (error) {
      if (videoFile.path && fs.existsSync(videoFile.path)) fs.unlinkSync(videoFile.path);
      return res.status(409).json({
        error: "Publishing is unavailable while YouTube is in demo mode. Connect a live channel first.",
        isDemo: true
      });
    }

    const tokens = JSON.parse(tokensStr);
    const scheduledTime = new Date(publishAt);

    const taskId = Math.random().toString(36).substr(2, 9);
    
    try {
      const dbData = readDb();

      dbData.youtube_tokens[uid] = {
        uid,
        tokens,
        updatedAt: new Date().toISOString()
      };

      dbData.scheduled_videos.push({
        id: taskId,
        videoPath: videoFile.path,
        title,
        description,
        tags: JSON.parse(tags || "[]"),
        publishAt: scheduledTime.toISOString(),
        status: "pending",
        uid
      });

      writeDb(dbData);
      res.json({ success: true, taskId });
    } catch (error) {
      console.error("Error scheduling video:", error);
      res.status(500).json({ error: "Failed to schedule video" });
    }
  });

  app.get("/api/youtube/tasks", async (req, res) => {
    const { uid } = req.query;
    if (!uid) {
      return res.status(400).json({ error: "User UID is required" });
    }

    try {
      const dbData = readDb();
      const videos = dbData.scheduled_videos.filter((v: any) => v.uid === uid);
      res.json(videos);
    } catch (error) {
      console.error("Error fetching scheduled videos:", error);
      res.status(500).json({ error: "Failed to fetch scheduled videos" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    const activeUserKey = (req.headers["x-youtube-user-id"] as string) || getCurrentUserKey(req);
    const cookieOpts = getCookieOptions();
    res.clearCookie("youtube_tokens", cookieOpts);
    res.clearCookie("google_user", cookieOpts);
    res.clearCookie("youtube_user_id", cookieOpts);

    try {
      const dbData = readDb();
      if (dbData.youtube_tokens) {
        if (activeUserKey) {
          delete dbData.youtube_tokens[activeUserKey];
          delete dbData.youtube_tokens[getUserProfileStorageKey(activeUserKey)];
          if (dbData.cached_channel_stats) delete dbData.cached_channel_stats[activeUserKey];
          if (dbData.cached_performance) delete dbData.cached_performance[activeUserKey];
        }
        delete dbData.youtube_tokens["global"];
        delete dbData.youtube_tokens["global_user"];
        if (dbData.cached_channel_stats) delete dbData.cached_channel_stats["global"];
        if (dbData.cached_performance) delete dbData.cached_performance["global"];
      }
      delete dbData.active_user;
      writeDb(dbData);
    } catch (e) {
      console.error("Error clearing active YouTube credentials from db:", e);
    }
    res.json({ success: true });
  });

  app.get("/api/debug/collections", async (req, res) => {
    res.json({ status: "Using local JSON database to bypass IAM restrictions." });
  });






  app.get("/api/youtube/channel-info", async (req: express.Request, res: express.Response) => {
    const rawInput = (req.query.url as string || req.query.handle as string || "").trim();
    if (!rawInput) {
      return res.status(400).json({ error: "URL or handle is required" });
    }

    try {
      let targetUrl = rawInput;
      if (targetUrl.startsWith("@")) {
        targetUrl = `https://www.youtube.com/${targetUrl}`;
      } else if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
        targetUrl = `https://www.youtube.com/@${targetUrl}`;
      }

      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7"
        }
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: `YouTube responded with status ${response.status}` });
      }

      const html = await response.text();

      // Extract title
      let title = "";
      const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)">/);
      if (ogTitleMatch) title = ogTitleMatch[1];

      // Extract subscriber count text
      let subs = "";
      const subsMatch1 = html.match(/•\s*⁨?([0-9.,\s\u00a0]+(?:тыс|млн|млрд|k|m|b)?\.?\s*подписчик[^\/⁩"]*)/i);
      if (subsMatch1) {
        subs = subsMatch1[1].replace(/[\u200e\u200f\u2066\u2067\u2068\u2069]/g, "").trim();
      } else {
        const subsMatch2 = html.match(/"subscriberCountText":\{"accessibility":\{"accessibilityData":\{"label":"([^"]+)"/);
        if (subsMatch2) {
          subs = subsMatch2[1];
        } else {
          const subsMatch3 = html.match(/([0-9.,\s\u00a0]+(?:тыс|млн|млрд|k|m|b)?\.?\s*подписчик[^\/⁩"]*)/i);
          if (subsMatch3) {
            subs = subsMatch3[1].replace(/[\u200e\u200f\u2066\u2067\u2068\u2069]/g, "").trim();
          } else {
            const subsMatch4 = html.match(/([0-9.,\s\u00a0]+(?:k|m|b)?\.?\s*subscribers?)/i);
            if (subsMatch4) subs = subsMatch4[1].trim();
          }
        }
      }

      if (subs) {
        subs = subs.replace(/\s*(?:подписчик(?:ов|а)?|subscribers?)\.?/gi, "").trim();
      }

      // Extract avatar
      let avatar = "";
      const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)">/);
      if (ogImageMatch) avatar = ogImageMatch[1];

      // Extract description
      let desc = "";
      const ogDescMatch = html.match(/<meta property="og:description" content="([^"]+)">/);
      if (ogDescMatch) desc = ogDescMatch[1];

      res.json({
        success: true,
        title,
        subs: subs || null,
        avatar,
        desc,
        url: targetUrl
      });
    } catch (error: any) {
      console.error("Error fetching YouTube channel info:", error);
      res.status(500).json({ error: error.message || "Failed to fetch channel info" });
    }
  });

  app.get("/api/youtube/competitor-analysis", async (req: express.Request, res: express.Response) => {
    const query = req.query.query as string;
    const currentTitle = req.query.currentTitle as string;
    const currentTags = req.query.currentTags as string;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    try {
      const youtube = await getYouTubeClient(req, res);
      
      // 1. Search for top competitor videos
      const searchRes = await youtube.search.list({
        part: ["snippet"],
        q: query,
        type: ["video"],
        order: "viewCount",
        maxResults: 8
      });

      const competitors = searchRes.data.items?.map(item => ({
        title: item.snippet?.title,
        channelTitle: item.snippet?.channelTitle,
        videoId: item.id?.videoId,
        publishedAt: item.snippet?.publishedAt
      })) || [];

      // 2. Analyze with Gemini
      const ai = getGeminiClient();

      const prompt = `
        Ты — экспертный SEO-стратег для YouTube. Проанализируй данные топовых конкурентов в нише и предложи конкретные улучшения для моего видео.
        
        МОЁ ТЕКУЩЕЕ ВИДЕО:
        Заголовок: ${currentTitle || "Без заголовка"}
        Теги: ${currentTags || "Нет тегов"}
        
        ТОП-8 КОНКУРЕНТОВ (по просмотрам):
        ${competitors.map((c, i) => `${i+1}. "${c.title}" (Канал: ${c.channelTitle})`).join('\n')}
        
        ЗАДАНИЕ:
        1. Сформулируй 3 варианта высококонверсионных (CTR) заголовков, которые используют триггеры внимания и ключевые слова конкурентов, но звучат уникально.
        2. Предложи оптимальный список из 15-20 SEO-тегов для максимального охвата в поиске и рекомендациях.
        3. Объясни стратегию: почему эти изменения сработают и какие "боли" или "интересы" зрителей конкурентов мы перехватываем.
        
        ОТВЕТЬ СТРОГО В ФОРМАТЕ JSON:
        {
          "suggestedTitles": ["...", "...", "..."],
          "suggestedTags": ["...", "...", "..."],
          "strategy": "..."
        }
        
        Используй букву "ё" везде, где она должна быть. Ответ должен быть на русском языке.
      `;

      const response = await generateContentWithFallback(ai, "gemini-3.1-flash-lite", {
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      
      let text = response.text || "";
      
      // Simple JSON extraction if needed, but responseMimeType should handle it
      if (text.includes("```json")) {
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
      }
      
      const suggestions = tryRepairJSON(text);

      res.json({
        competitors,
        suggestions
      });

    } catch (error: any) {
      console.error("Competitor analysis error:", error);
      res.status(500).json({ error: error.message || "Failed to analyze competitors" });
    }
  });

  app.post("/api/seo/analyze", async (req: express.Request, res: express.Response) => {
    const { title, description, tags } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required for SEO analysis" });
    }

    try {
      const ai = getGeminiClient();
      
      const prompt = `
        Ты — ведущий эксперт по YouTube SEO и алгоритмам ранжирования Google. 
        Проведи глубокий аудит следующих метаданных видео и предложи конкретные улучшения для повышения CTR и поисковой оптимизации.

        ДАННЫЕ ВИДЕО:
        Заголовок: ${title}
        Описание: ${description || "Нет описания"}
        Текущие теги: ${tags || "Нет тегов"}

        ЗАДАНИЕ:
        1. Рассчитай "SEO Score" (0-100) на основе заполненности и оптимизации.
        2. Проанализируй заголовок: предложи 3 варианта правок для повышения кликабельности (CTR).
        3. Проанализируй описание: укажи на ошибки и предложи структуру первых 2-х строк (snippet).
        4. Сгенерируй 10 ВЫСОКОЧАСТОТНЫХ (широких) ключевых слов для охвата.
        5. Сгенерируй 10 НИЗКОЧАСТОТНЫХ (целевых/long-tail) ключевых слов для попадания в узкие запросы.
        6. Дай 3 конкретных совета по оптимизации контента под Google Search.

        ОТВЕТЬ СТРОГО В ФОРМАТЕ JSON:
        {
          "score": number,
          "titleAnalysis": {
            "current": "...",
            "suggestions": ["...", "...", "..."],
            "critique": "..."
          },
          "descriptionAnalysis": {
            "critique": "...",
            "optimizedSnippet": "..."
          },
          "keywords": {
            "highFrequency": ["...", "... x10"],
            "lowFrequency": ["...", "... x10"]
          },
          "googleSearchTips": ["...", "...", "..."]
        }

        Язык ответа: Русский. Используй букву "ё".
      `;

      const response = await generateContentWithFallback(ai, "gemini-3.1-flash-lite", {
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      
      const text = response.text || "{}";
      const analysis = tryRepairJSON(text);

      res.json(analysis);
    } catch (error: any) {
      console.error("SEO analysis error:", error);
      res.status(500).json({ error: error.message || "Failed to perform SEO analysis" });
    }
  });

  app.post("/api/seo/shorts-ctr", async (req: express.Request, res: express.Response) => {
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required for CTR analysis" });
    }

    try {
      const ai = getGeminiClient();

      const prompt = `
        Ты — ведущий эксперт по YouTube алгоритмам, специалист по повышению CTR (кликабельности) коротких видео YouTube Shorts.
        Проведи глубокий аудит заголовка и первой строки описания для Shorts.
        
        МОИ ТЕКУЩИЕ ДАННЫЕ:
        Заголовок: ${title}
        Описание: ${description || "Нет описания"}

        Твоя задача — проанализировать эти данные и выдать структурированные рекомендации для максимизации CTR и удержания внимания с первых секунд.

        ОТВЕТЬ СТРОГО В ФОРМАТЕ JSON (без лишнего текста, только валидный JSON):
        {
          "ctrScore": number, 
          "hookStrength": "высокая" | "средняя" | "низкая", 
          "emotion": "Эмоциональный триггер (шок, любопытство, страх упущенной выгоды...)",
          "competitiveness": "Оценка конкурентности ниши/темы",
          "retentionPrediction": "Прогноз удержания зрителей в первые 3 секунды...",
          "critique": "Критический анализ: почему текущий заголовок работает или не работает, ошибки...",
          "suggestedTitles": [
            { "title": "Улучшенный заголовок вариант 1", "type": "Интрига / Кликбейт", "ctrIncrease": "+25%" },
            { "title": "Улучшенный заголовок вариант 2", "type": "Проблема / Вопрос", "ctrIncrease": "+18%" },
            { "title": "Улучшенный заголовок вариант 3", "type": "Цифры и Факты", "ctrIncrease": "+15%" }
          ],
          "firstLineSuggestion": "Идеально оптимизированная первая строка описания (до 100 символов, которая видна в поиске и фиде)...",
          "ctrTriggers": ["Увеличьте контраст в превью", "Используйте капс на ключевом слове", "Добавьте смайл интриги", "Создайте эффект незаконченного действия"],
          "stopWordsDetected": ["Слова или клише, которые снижают CTR..."]
        }

        Используй букву "ё" везде, где она должна быть. Ответ должен быть на русском языке.
      `;

      const response = await generateContentWithFallback(ai, "gemini-3.1-flash-lite", {
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = response.text || "{}";
      const analysis = tryRepairJSON(text);

      res.json(analysis);
    } catch (error: any) {
      console.error("Shorts CTR analysis error:", error);
      res.status(500).json({ error: error.message || "Failed to perform CTR analysis" });
    }
  });

  app.post("/api/youtube/analyze-reference-style", async (req: express.Request, res: express.Response) => {
    const { base64Data, mimeType } = req.body;

    if (!base64Data) {
      return res.status(400).json({ error: "Base64 data is required" });
    }

    try {
      const ai = getGeminiClient();

      let cleanBase64 = base64Data;
      if (base64Data.includes(";base64,")) {
        cleanBase64 = base64Data.split(";base64,").pop() || "";
      }

      const prompt = `Ты — эксперт по дизайну YouTube обложек (превью). Проанализируй загруженное изображение-референс и опиши его визуальный стиль. Твое описание будет использовано для генерации новой обложки с похожей эстетикой. Укажи ключевые особенности: цветовую палитру (например, темный фон с неоновым синим и фиолетовым свечением, яркий оранжевый акцент), тип освещения (контрастный свет, свечение сзади), стиль текста (если есть), общую композицию (правило третей, фокус на персонаже слева) и настроение (динамичное, игровое, премиальное, научно-популярное). Будь лаконичен, напиши описание на русском языке длиной не более 3-4 предложений.`;

      const response = await generateContentWithFallback(ai, "gemini-3.1-flash-lite", {
        contents: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType || "image/png"
            }
          },
          prompt
        ]
      });

      const styleDescription = response.text || "Контрастные цвета, современный динамичный дизайн YouTube, яркое освещение";
      res.json({ styleDescription: styleDescription.trim() });
    } catch (error: any) {
      console.error("Reference style analysis error:", error);
      res.status(500).json({ error: error.message || "Failed to analyze reference style" });
    }
  });

  app.post("/api/gemini/generate", async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    try {
      const { model, contents, config, generationConfig } = req.body || {};
      const ai = getGeminiClient();
      let targetModel = (model || "gemini-3.5-flash-lite").trim();
      if (!targetModel.includes("image") && !targetModel.includes("transcribe")) {
        if (
          targetModel === "gemini-3.1-pro-preview" ||
          targetModel === "gemini-3.1-pro" ||
          targetModel.includes("pro")
        ) {
          targetModel = "gemini-3.5-flash-lite";
        }
      }
      const resolvedConfig = config || generationConfig || {};
      const response = await generateContentWithFallback(ai, targetModel, {
        contents: contents || "",
        config: resolvedConfig
      });
      let extractedText = "";
      try {
        extractedText = response.text || "";
      } catch (e) {
        if (response?.candidates?.[0]?.content?.parts) {
          extractedText = response.candidates[0].content.parts.map((p: any) => p?.text || "").join("");
        }
      }
      res.json({
        ...response,
        text: extractedText
      });
    } catch (error: any) {
      console.error("[Gemini Server Route Error]:", error?.message || error);
      const rawMsg = error?.message || String(error || "");
      let statusCode = error?.status || error?.code || 500;
      if (typeof statusCode !== "number" || statusCode < 400 || statusCode > 599) {
        if (rawMsg.includes("503") || rawMsg.includes("high demand") || rawMsg.includes("unavailable")) {
          statusCode = 503;
        } else if (rawMsg.includes("504") || rawMsg.includes("timed out") || rawMsg.includes("timeout")) {
          statusCode = 504;
        } else if (rawMsg.includes("429") || rawMsg.includes("quota") || rawMsg.includes("квота") || rawMsg.includes("resource_exhausted")) {
          statusCode = 429;
        } else {
          statusCode = 500;
        }
      }

      let cleanMsg = rawMsg;
      try {
        if (cleanMsg.includes('{"error":')) {
          const jsonStart = cleanMsg.indexOf('{"error":');
          const parsed = JSON.parse(cleanMsg.slice(jsonStart));
          if (parsed?.error?.message) {
            cleanMsg = parsed.error.message;
          }
        }
      } catch (e) {}

      res.status(statusCode).json({ error: cleanMsg, status: statusCode });
    }
  });

  app.get("/api/proxy-download", async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      const filename = (req.query.filename as string) || "downloaded-file";

      if (!targetUrl) {
        return res.status(400).json({ error: "Missing url parameter" });
      }

      if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
        return res.status(400).json({ error: "Invalid url protocol" });
      }

      const response = await fetch(targetUrl);
      if (!response.ok) {
        return res.status(response.status).json({ error: `Failed to fetch target URL: ${response.statusText}` });
      }

      const contentType = response.headers.get("content-type") || "application/octet-stream";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.send(buffer);
    } catch (err: any) {
      console.error("[Proxy Download Error]:", err);
      res.status(500).json({ error: err.message || "Failed to download file" });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Server-side fast FFmpeg audio extraction helper with professional audio preprocessing
  async function extractAudioChunksWithFFmpeg(filePath: string, chunkDurationSec: number = 60) {
    const tmpWavPath = path.join(UPLOADS_DIR, `extracted_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.wav`);
    try {
      // Step 1: Attempt extraction with highpass, lowpass, noise reduction (afftdn), and speech loudness normalization (loudnorm / dynaudnorm)
      const runFFmpeg = (audioFilter: string) => {
        return new Promise<void>((resolve, reject) => {
          const args = [
            "-y",
            "-i", filePath,
            "-vn",
            "-af", audioFilter,
            "-ac", "1",
            "-ar", "16000",
            "-c:a", "pcm_s16le",
            tmpWavPath
          ];
          execFile("/usr/bin/ffmpeg", args, { timeout: 180000 }, (error, stdout, stderr) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
      };

      try {
        // Highpass (80Hz rumble cut), Lowpass (7.5kHz hiss cut), FFT denoiser (-25dB noise floor), and dynamic audio normalization
        await runFFmpeg("highpass=f=80,lowpass=f=7500,afftdn=nf=-25,dynaudnorm=p=0.9:s=5,loudnorm=I=-16:TP=-1.5:LRA=11");
      } catch (filterErr) {
        console.warn("[FFmpeg Advanced Audio Filter Fallback]: Retrying with simple highpass & loudness normalization:", filterErr);
        try {
          await runFFmpeg("highpass=f=80,lowpass=f=7500,loudnorm=I=-16:TP=-1.5:LRA=11");
        } catch (basicFilterErr) {
          console.warn("[FFmpeg Basic Audio Filter Fallback]: Retrying without filters:", basicFilterErr);
          await runFFmpeg("aresample=16000");
        }
      }

      if (!fs.existsSync(tmpWavPath)) {
        throw new Error("Аудиодорожка не была сгенерирована");
      }

      const wavBuffer = fs.readFileSync(tmpWavPath);
      const dataSize = Math.max(0, wavBuffer.byteLength - 44);
      const durationSec = Math.max(1, dataSize / 32000); // 16000 samples/sec * 2 bytes/sample (16-bit mono)

      const bytesPerChunk = Math.floor(chunkDurationSec * 32000);
      const numChunks = Math.max(1, Math.ceil(dataSize / bytesPerChunk));

      const chunks = [];
      let totalSizeBytes = 0;

      for (let i = 0; i < numChunks; i++) {
        const startOffset = 44 + i * bytesPerChunk;
        const endOffset = Math.min(44 + (i + 1) * bytesPerChunk, wavBuffer.byteLength);
        const chunkPcmData = wavBuffer.subarray(startOffset, endOffset);
        const chunkPcmLength = chunkPcmData.byteLength;

        const chunkWavBuf = Buffer.alloc(44 + chunkPcmLength);
        chunkWavBuf.write("RIFF", 0);
        chunkWavBuf.writeUInt32LE(36 + chunkPcmLength, 4);
        chunkWavBuf.write("WAVE", 8);
        chunkWavBuf.write("fmt ", 12);
        chunkWavBuf.writeUInt32LE(16, 16);
        chunkWavBuf.writeUInt16LE(1, 20); // PCM
        chunkWavBuf.writeUInt16LE(1, 22); // mono
        chunkWavBuf.writeUInt32LE(16000, 24); // 16000 Hz
        chunkWavBuf.writeUInt32LE(32000, 28); // byte rate (16000 * 1 * 2)
        chunkWavBuf.writeUInt16LE(2, 32); // block align
        chunkWavBuf.writeUInt16LE(16, 34); // 16-bit
        chunkWavBuf.write("data", 36);
        chunkWavBuf.writeUInt32LE(chunkPcmLength, 40);
        chunkPcmData.copy(chunkWavBuf, 44);

        totalSizeBytes += chunkWavBuf.byteLength;
        const base64 = chunkWavBuf.toString("base64");
        const startSec = (i * bytesPerChunk) / 32000;
        const endSec = Math.min(durationSec, ((i + 1) * bytesPerChunk) / 32000);

        chunks.push({
          index: i,
          totalChunks: numChunks,
          startSec,
          endSec,
          durationSec: endSec - startSec,
          base64,
          mimeType: "audio/wav",
        });
      }

      return {
        chunks,
        durationSec,
        sampleRate: 16000,
        totalSizeBytes,
      };
    } finally {
      if (fs.existsSync(tmpWavPath)) {
        try { fs.unlinkSync(tmpWavPath); } catch (_) {}
      }
    }
  }

  // 1. Direct audio extraction for files <= 25MB
  app.post("/api/media/extract-audio-direct", upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Файл не был загружен" });
    }
    const uploadedFilePath = req.file.path;
    try {
      const chunkDurationSec = req.body.chunkDurationSec ? Number(req.body.chunkDurationSec) : 60;
      const result = await extractAudioChunksWithFFmpeg(uploadedFilePath, chunkDurationSec);
      res.json(result);
    } catch (err: any) {
      console.error("[extract-audio-direct error]:", err);
      res.status(500).json({ error: err.message || "Ошибка извлечения аудио" });
    } finally {
      if (fs.existsSync(uploadedFilePath)) {
        try { fs.unlinkSync(uploadedFilePath); } catch (_) {}
      }
    }
  });

  // 2. Chunked audio extraction for large media files (bypasses browser ArrayBuffer limit & Nginx 32M limit)
  app.post("/api/media/upload-chunk", upload.single("chunk"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Фрагмент не передан" });
    }

    const { uploadId, chunkIndex, totalChunks } = req.body;
    if (!uploadId) {
      if (fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (_) {}
      }
      return res.status(400).json({ error: "Отсутствует uploadId" });
    }

    // Sanitize uploadId to prevent directory traversal
    const safeUploadId = uploadId.replace(/[^a-zA-Z0-9_-]/g, "");
    const partFilePath = path.join(UPLOADS_DIR, `chunked_${safeUploadId}.tmp`);
    const cIdx = parseInt(chunkIndex, 10);
    const tChunks = parseInt(totalChunks, 10);

    try {
      // Append this chunk to part file
      const chunkData = fs.readFileSync(req.file.path);
      fs.appendFileSync(partFilePath, chunkData);

      // Remove the multer temp chunk file
      if (fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (_) {}
      }

      // If this is the last chunk, execute FFmpeg audio extraction
      if (cIdx >= tChunks - 1) {
        console.log(`[Chunked Upload] Completed all ${tChunks} chunks for ${safeUploadId}. Processing audio extraction...`);
        const chunkDurationSec = req.body.chunkDurationSec ? Number(req.body.chunkDurationSec) : 60;
        const result = await extractAudioChunksWithFFmpeg(partFilePath, chunkDurationSec);

        // Cleanup part file
        if (fs.existsSync(partFilePath)) {
          try { fs.unlinkSync(partFilePath); } catch (_) {}
        }

        return res.json({ completed: true, result });
      }

      // Chunk accepted, waiting for more
      return res.json({ completed: false, chunkIndex: cIdx });
    } catch (err: any) {
      console.error("[upload-chunk error]:", err);
      if (fs.existsSync(partFilePath)) {
        try { fs.unlinkSync(partFilePath); } catch (_) {}
      }
      if (fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (_) {}
      }
      return res.status(500).json({ error: err.message || "Ошибка обработки фрагмента файла" });
    }
  });

  // Abort / cleanup partial upload
  app.post("/api/media/upload-chunk-abort", (req, res) => {
    const { uploadId } = req.body;
    if (uploadId) {
      const safeUploadId = uploadId.replace(/[^a-zA-Z0-9_-]/g, "");
      const partFilePath = path.join(UPLOADS_DIR, `chunked_${safeUploadId}.tmp`);
      if (fs.existsSync(partFilePath)) {
        try { fs.unlinkSync(partFilePath); } catch (_) {}
      }
    }
    res.json({ ok: true });
  });

  // Global API error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("[Express API Error Handler]:", err);
    if (!res.headersSent) {
      res.status(err.status || 500).json({ error: err.message || "Внутренняя ошибка сервера" });
    } else {
      next(err);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : undefined,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const httpServer = http.createServer(app);
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
