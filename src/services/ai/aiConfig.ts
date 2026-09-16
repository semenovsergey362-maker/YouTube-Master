import { logger } from "../../config/logger";
import { GoogleGenAI } from "@google/genai";
import { safeStorage } from "../../lib/storage";
import { z } from "zod";

// Client-side initialization stubs (all requests are executed server-side via /api/gemini/generate)
export function initGemini() {
  // Server-side architecture: API calls are proxied through Express API routes
}

export function updateGeminiApiKey(key: string) {
  // Server handles API key securely
}

// Quota Tracking
export interface QuotaUsage {
  requestsPerMinute: number;
  tokensPerMinute: number;
  requestsPerDay: number;
  tokensToday: number;
  lastRequestTime?: number;
  modelUsage?: Record<string, { requestsPerMinute: number; tokensPerMinute: number; requestsPerDay: number; tokensToday: number }>;
}

export interface ModelQuotaConfig {
  RPM: number;
  TPM: number;
  RPD: number;
}

export const DEFAULT_MODEL_QUOTAS: Record<string, ModelQuotaConfig> = {
  "gemini-3.1-flash-lite": { RPM: 15, TPM: 1000000, RPD: 1500 },
  "gemini-flash-latest": { RPM: 15, TPM: 1000000, RPD: 20 },
  "gemini-3.8-flash": { RPM: 15, TPM: 1000000, RPD: 20 },
  "gemini-3.7-flash": { RPM: 15, TPM: 1000000, RPD: 20 },
  "gemini-3.1-pro-preview": { RPM: 2, TPM: 32000, RPD: 50 },
};

export const QUOTA_LIMITS = {
  RPM: 15,
  TPM: 1000000,
  RPD: 1500
};

export function getModelQuotaLimits(modelId: string): ModelQuotaConfig {
  return DEFAULT_MODEL_QUOTAS[modelId] || { RPM: 15, TPM: 1000000, RPD: 1500 };
}

export function formatTokenCount(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

type QuotaListener = (usage: QuotaUsage) => void;
const quotaListeners: QuotaListener[] = [];
let quotaInterval: any = null;

let requestLog: { time: number; tokens: number; model?: string }[] = [];

try {
  const savedLog = safeStorage.getItem("gemini_request_log");
  if (savedLog) {
    const parsed = JSON.parse(savedLog);
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    requestLog = parsed.filter((req: any) => req.time > oneDayAgo);
  }
} catch (e) {}

export function getQuotaUsage(): QuotaUsage {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const oneMinAgo = now - 60 * 1000;

  requestLog = requestLog.filter(req => req.time > oneDayAgo);
  const requestsLastMin = requestLog.filter(req => req.time > oneMinAgo);
  const tokensToday = requestLog.reduce((acc, req) => acc + (req.tokens || 0), 0);

  const modelUsage: Record<string, { requestsPerMinute: number; tokensPerMinute: number; requestsPerDay: number; tokensToday: number }> = {};
  
  requestLog.forEach(req => {
    const m = req.model || "gemini-3.1-flash-lite";
    if (!modelUsage[m]) {
      modelUsage[m] = { requestsPerMinute: 0, tokensPerMinute: 0, requestsPerDay: 0, tokensToday: 0 };
    }
    modelUsage[m].requestsPerDay += 1;
    modelUsage[m].tokensToday += (req.tokens || 0);
    if (req.time > oneMinAgo) {
      modelUsage[m].requestsPerMinute += 1;
      modelUsage[m].tokensPerMinute += (req.tokens || 0);
    }
  });

  return {
    requestsPerMinute: requestsLastMin.length,
    tokensPerMinute: requestsLastMin.reduce((acc, req) => acc + (req.tokens || 0), 0),
    requestsPerDay: requestLog.length,
    tokensToday,
    lastRequestTime: requestLog.length > 0 ? requestLog[requestLog.length - 1].time : undefined,
    modelUsage,
  };
}

function notifyQuotaListeners() {
  const usage = getQuotaUsage();
  quotaListeners.forEach(listener => listener(usage));
}

export function subscribeToQuota(listener: QuotaListener) {
  quotaListeners.push(listener);
  listener(getQuotaUsage());

  if (!quotaInterval && typeof window !== "undefined") {
    quotaInterval = setInterval(() => {
      if (quotaListeners.length > 0) {
        notifyQuotaListeners();
      } else if (quotaInterval) {
        clearInterval(quotaInterval);
        quotaInterval = null;
      }
    }, 1000);
  }

  return () => {
    const idx = quotaListeners.indexOf(listener);
    if (idx > -1) quotaListeners.splice(idx, 1);
    if (quotaListeners.length === 0 && quotaInterval) {
      clearInterval(quotaInterval);
      quotaInterval = null;
    }
  };
}

export function trackApiUsage(tokens: number, model?: string) {
  const now = Date.now();
  requestLog.push({ time: now, tokens, model });
  
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  requestLog = requestLog.filter(req => req.time > oneDayAgo);
  
  safeStorage.setItem("gemini_request_log", JSON.stringify(requestLog));
  notifyQuotaListeners();
}

export function getActiveCustomInstructionsText(overrideInstructions?: string): string {
  let modalRulesText = "";
  if (typeof window !== "undefined") {
    // Check if custom instructions are explicitly disabled by user master toggle
    const isExplicitlyDisabled = safeStorage.getItem("yt_custom_instructions_enabled") === "false";
    
    // First, try loading structured custom rules
    const storedRules = safeStorage.getItem("yt_custom_rules");
    if (storedRules && !isExplicitlyDisabled) {
      try {
        const rules = JSON.parse(storedRules);
        if (Array.isArray(rules)) {
          const active = rules
            .filter((r: any) => r && r.isActive && typeof r.content === "string" && r.content.trim())
            .map((r: any) => {
              const header = r.title ? `[ПРАВИЛО: ${r.title}]\n` : "";
              const cleanContent = r.content.trim().replace(/\\n/g, "\n");
              return `${header}${cleanContent}`;
            });
          if (active.length > 0) {
            modalRulesText = active.join("\n\n");
          }
        }
      } catch (e) {}
    }
    
    // Fallback to legacy or raw text custom instructions
    if (!modalRulesText && !isExplicitlyDisabled) {
      const storedText = safeStorage.getItem("yt_custom_instructions") || "";
      if (storedText.trim().length > 0) {
        modalRulesText = storedText.trim().replace(/\\n/g, "\n");
      }
    }
  }

  const cleanOverride = typeof overrideInstructions === "string" ? overrideInstructions.trim().replace(/\\n/g, "\n") : "";

  // If both modal rules and local override exist, intelligently merge them so modal rules are NEVER lost!
  if (modalRulesText && cleanOverride) {
    if (cleanOverride.includes(modalRulesText.slice(0, 40))) {
      return cleanOverride;
    }
    return `${modalRulesText}\n\n[ДОПОЛНИТЕЛЬНЫЕ ИЗМЕНЕНИЯ И ПОЖЕЛАНИЯ ПОЛЬЗОВАТЕЛЯ]:\n${cleanOverride}`;
  }

  return cleanOverride || modalRulesText;
}

function injectCustomInstructionsIntoContents(contents: any, customInstructions: string): any {
  if (!customInstructions || !customInstructions.trim()) return contents;
  const cleanInst = customInstructions.trim().replace(/\\n/g, "\n");
  const directive = `\n\n[🚨 СТРОЖАЙШИЙ ВЫСШИЙ ПРИОРИТЕТ: ПРАВИЛА ИЗ МОДАЛЬНОГО ОКНА «Инструкции для ИИ Ассистента»]:\n"""\n${cleanInst}\n"""\n(СТРОГОЕ СОБЛЮДЕНИЕ ПРАВИЛ ИЗ МОДАЛЬНОГО ОКНА! Все правила, запреты, стиль, платформы, параметры и форматы выше имеют абсолютный приоритет над любыми внутренними формулами, дефолтными стилями и шаблонами!)\n`;
  const endReminder = `\n\n[🚨 КРИТИЧЕСКИЙ ВЫСШИЙ ПРИОРИТЕТ: Все правила, формат и запреты из «Инструкции для ИИ Ассистента» выше ДОЛЖНЫ БЫТЬ СТРОЖАЙШЕ СОБЛЮДЕНЫ в итоговом результате! Если кастомные правила пользователя противоречат внутренним шаблонам или дефолтным стилям — СТРОГО СЛЕДУЙ ПРАВИЛАМ ПОЛЬЗОВАТЕЛЯ! КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНЫ КЛИШЕ: шестерёнки, песочные часы, светящиеся синие голограммы, летающие лампочки и абстрактные графики!]\n`;

  if (typeof contents === "string") {
    if (contents.includes(cleanInst.slice(0, 30))) {
      return `${contents}${endReminder}`;
    }
    return `${contents}${directive}`;
  }
  if (Array.isArray(contents)) {
    return contents.map((item: any) => {
      if (item && item.role === "user" && Array.isArray(item.parts)) {
        const hasInst = item.parts.some((p: any) => typeof p.text === "string" && p.text.includes(cleanInst.slice(0, 30)));
        if (!hasInst) {
          const lastTextPart = item.parts.slice().reverse().find((p: any) => typeof p.text === "string");
          if (lastTextPart) {
            lastTextPart.text = `${lastTextPart.text}${directive}`;
          } else {
            item.parts.push({ text: directive });
          }
        } else {
          // Append end reminder to enforce compliance despite recent user edits
          const lastTextPart = item.parts.slice().reverse().find((p: any) => typeof p.text === "string");
          if (lastTextPart && !lastTextPart.text.includes("ВАЖНЕЙШЕЕ НАПОМИНАНИЕ")) {
            lastTextPart.text = `${lastTextPart.text}${endReminder}`;
          }
        }
      }
      return item;
    });
  }
  if (contents && typeof contents === "object" && Array.isArray(contents.parts)) {
    const hasInst = contents.parts.some((p: any) => typeof p.text === "string" && p.text.includes(cleanInst.slice(0, 30)));
    if (!hasInst) {
      const lastTextPart = contents.parts.slice().reverse().find((p: any) => typeof p.text === "string");
      if (lastTextPart) {
        lastTextPart.text = `${lastTextPart.text}${directive}`;
      } else {
        contents.parts.push({ text: directive });
      }
    } else {
      const lastTextPart = contents.parts.slice().reverse().find((p: any) => typeof p.text === "string");
      if (lastTextPart && !lastTextPart.text.includes("ВАЖНЕЙШЕЕ НАПОМИНАНИЕ")) {
        lastTextPart.text = `${lastTextPart.text}${endReminder}`;
      }
    }
  }
  return contents;
}

export function normalizeModelName(model?: string): string {
  if (!model) return "gemini-3.5-flash-lite";
  const m = model.toLowerCase().trim();
  if (m === "gemini-3.5-transcribe" || m.includes("transcribe")) {
    return "gemini-3.5-flash-lite";
  }
  if (
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
    return m;
  }
  if (m.includes("lite-image")) return "gemini-3.1-flash-lite-image";
  if (m.includes("flash-image")) return "gemini-3.1-flash-image";
  if (m.includes("pro-image")) return "gemini-3-pro-image";
  if (m.includes("3.6-flash")) return "gemini-3.6-flash";
  if (m.includes("3.5-flash-lite") || m.includes("flash-lite")) return "gemini-3.5-flash-lite";
  if (m.includes("3.1-flash-lite")) return "gemini-3.1-flash-lite";
  if (m.includes("3.5-flash")) return "gemini-3.5-flash";
  return "gemini-3.5-flash-lite";
}

export async function callGeminiWithRetry(params: any, maxRetries = 4, initialDelay = 1500) {
  if (params) {
    params.model = normalizeModelName(params.model);
  }
  const bypassCache = !!params.bypassCache;
  if ('bypassCache' in params) {
    delete params.bypassCache;
  }

  const cacheString = JSON.stringify({
    model: params.model,
    contents: params.contents,
    config: params.config
  });
  const cacheKey = "gemini_cache_" + cacheString;

  try {
    if (!bypassCache) {
      const cached = safeStorage.getItem(cacheKey);
      if (cached) {
        logger.log("Using cached AI response from localStorage to save tokens...");
        return JSON.parse(cached);
      }
    }
  } catch (e) {}

  if (params.tools || params.toolConfig || params.generationConfig) {
    params.config = params.config || {};
    if (params.tools) params.config.tools = params.tools;
    if (params.toolConfig) params.config.toolConfig = params.toolConfig;
    if (params.generationConfig) Object.assign(params.config, params.generationConfig);
    delete params.tools;
    delete params.toolConfig;
    delete params.generationConfig;
  }

  // Route 0-quota pro models to fast & reliable flash tier
  if (!params.model || 
      params.model === "gemini-3.1-pro-preview" || 
      params.model === "gemini-3.1-pro" || 
      params.model === "gemini-pro" || 
      (params.model.includes("pro") && !params.model.includes("image"))) {
    params.model = "gemini-3.5-flash-lite";
  }
  
  const defaultSafetySettings = [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
  ];

  const globalSystemInstruction = `Ты — экспертный ИИ-ассистент для YouTube-креаторов (YouTube Master). 
Твоя задача — помогать в аналитике ниш, создании сценариев, брендинге и SEO.
ПРАВИЛА ОТВЕТА:
1. Всегда отвечай на русском языке, если не указано иное.
2. ОБЯЗАТЕЛЬНО используй букву "ё" во всех словах, где она должна быть (например: всё, идёт, ещё, её, пришёлся, шёл). Это критическое требование.
3. Если требуется JSON, возвращай только валидный JSON без лишних пояснений.
4. Будь профессиональным, точным и ориентированным на тренды 2026 года.
5. ПРИ СОЗДАНИИ СЦЕНАРИЕВ: Фокусируйся на удержании (retention) с первых секунд. Используй любопытство, интригу и четкий темпоритм.
6. ПРИ РАЗБИВКЕ НА СЦЕНЫ: Копируй текст из сценария В ТОЧНОСТИ. Не меняй слова, не сокращай и не перефразируй реплики диктора. Текст в сценах должен быть идентичен исходному сценарию.
7. ПРИ АНАЛИЗЕ И SEO: Будь максимально критичным, честным и точным. ИЗУЧАЙ И ПРИМЕНЯЙ КАСТОМНЫЕ ИНСТРУКЦИИ ПОЛЬЗОВАТЕЛЯ В ПЕРВУЮ ОЧЕРЕДЬ!`;

  const bypassCustomInstructions = !!(params.bypassCustomInstructions || params.isTranscription);
  const activeCustomInstructions = !bypassCustomInstructions
    ? getActiveCustomInstructionsText(
        params.customInstructions || params.options?.customInstructions || params.config?.customInstructions
      )
    : "";
  let baseSystemInstruction = params.config?.systemInstruction || globalSystemInstruction;

  if (activeCustomInstructions && !bypassCustomInstructions) {
    if (!baseSystemInstruction.includes(activeCustomInstructions)) {
      baseSystemInstruction = `================================================================================
🚨 СТРОЖАЙШИЙ ВЫСШИЙ ПРИОРИТЕТ: ИНСТРУКЦИИ ДЛЯ ИИ АССИСТЕНТА
(ОБЯЗАТЕЛЬНЫ К НЕУКОСНИТЕЛЬНОМУ ИСПОЛНЕНИЮ ДАЖЕ ПОСЛЕ ВНЕСЕНИЯ ИЗМЕНЕНИЙ ПОЛЬЗОВАТЕЛЕМ)

Ты ОБЯЗАН СТРОГО, ТОЧНО И БЕЗ ИСКЛЮЧЕНИЙ соблюдать следующие правила, ограничения, структуру, стиль, хештеги, псевдонимы, ключевые слова, запреты и форматы во ВСЕХ задачах (генерация сценариев, переписывание блоков, SEO, хештеги, заголовки, описания, идеи, хуки, Shorts, промпты, аналитика):
"""
${activeCustomInstructions}
"""
ВАЖНЕЙШЕЕ ТРЕБОВАНИЕ К ПРИОРИТЕТУ:
Даже если пользователь вносит ручные правки, просит переписать текст, задает локальные уточнения («сделай короче», «добавь юмора», «измени стиль») или меняет структуру — ПРАВИЛА ИЗ МОДАЛЬНОГО ОКНА «Инструкции для ИИ Ассистента» ЯВЛЯЮТСЯ ВЫСШИМ ЗАКОНОМ (HARD CONSTRAINTS) И НЕ МОГУТ БЫТЬ ОТМЕНЕНЫ ИЛИ ОСЛАБЛЕНЫ! Все требования из правил выше ОБЯЗАНЫ строго соблюдаться в финальном результате!
================================================================================

${baseSystemInstruction}`;
    }
    
    // Also inject into user contents to guarantee high-priority adherence even with JSON structured output schemas
    if (params.contents) {
      params.contents = injectCustomInstructionsIntoContents(params.contents, activeCustomInstructions);
    }
  }

  if (params.generationConfig && !params.config) {
    params.config = params.generationConfig;
  }

  if (params.config) {
    if (!params.config.safetySettings) {
      params.config.safetySettings = defaultSafetySettings;
    }
    params.config.systemInstruction = baseSystemInstruction;
  } else {
    params.config = { 
      safetySettings: defaultSafetySettings,
      systemInstruction: baseSystemInstruction
    };
  }

  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(params)
      });
      
      const contentType = (res.headers.get("content-type") || "").toLowerCase();
      const rawText = await res.text();
      const isHtml = rawText.trim().startsWith("<") || rawText.includes("<!DOCTYPE") || rawText.includes("<!doctype") || contentType.includes("text/html");

      if (!res.ok || isHtml) {
        let errMsg = "";
        if (!isHtml && rawText.trim()) {
          try {
            const errData = JSON.parse(rawText);
            errMsg = errData.error || errData.message || `Server Gemini call failed with status ${res.status}`;
          } catch {
            errMsg = `Server Gemini call failed with status ${res.status}`;
          }
        } else {
          errMsg = `Сервер Gemini временно вернул не-JSON ответ (статус ${res.status || 503})`;
        }
        
        const err = new Error(errMsg) as any;
        err.status = res.status || 503;
        err.isHtmlResponse = isHtml;
        throw err;
      }
      
      let response: any;
      try {
        response = JSON.parse(rawText);
      } catch (parseErr: any) {
        const err = new Error(`Невалидный JSON от сервера: ${parseErr.message}`) as any;
        err.status = res.status || 500;
        err.isHtmlResponse = true;
        throw err;
      }
      
      const usageMeta = response?.usageMetadata;
      const totalTokens = usageMeta?.totalTokenCount || 1000;
      trackApiUsage(totalTokens, params.model);

      try {
        if (!bypassCache) {
          safeStorage.setItem(cacheKey, JSON.stringify(response));
        }
      } catch (e) {}

      return response;
    } catch (error: any) {
      const isRateLimit = error?.status === 429 || 
                          error?.message?.includes("429") || 
                          error?.message?.includes("RESOURCE_EXHAUSTED") ||
                          error?.message?.includes("quota") ||
                          error?.message?.includes("квота") ||
                          error?.message?.includes("limit: 0") ||
                          error?.message?.includes("limit:0") ||
                          error?.message?.includes("exceeded your current quota");
      const isServerErr = (error?.status >= 500 && error?.status <= 599) || 
                          error?.status === 404 ||
                          error?.isHtmlResponse ||
                          error?.message?.includes("500") || 
                          error?.message?.includes("502") || 
                          error?.message?.includes("503") || 
                          error?.message?.includes("504") ||
                          error?.message?.includes("Unexpected token") ||
                          error?.message?.includes("не-JSON") ||
                          error?.message?.includes("Failed to fetch") ||
                          error?.message?.includes("high demand") ||
                          error?.message?.includes("unavailable") ||
                          error?.message?.includes("timed out") ||
                          error?.message?.includes("timeout");

      if ((isRateLimit || isServerErr) && i < maxRetries - 1) {
        if (!params.model?.includes("image") && !params.model?.includes("transcribe")) {
          const alternateModels = ["gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-3.1-flash-lite", "gemini-3.8-flash"];
          params.model = alternateModels[i % alternateModels.length];
        }
        const delay = Math.min(3000, initialDelay * Math.pow(1.3, i) + Math.random() * 200);
        logger.warn(`API request issue (${error?.message || "Transient server error"}). Retrying with model ${params.model} in ${(delay / 1000).toFixed(1)}s (Attempt ${i + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

export function extractTextFromResponse(response: any): string {
  if (!response) return "";
  if (typeof response === "string") return response;
  if (typeof response.text === "function") {
    try {
      const fnRes = response.text();
      if (typeof fnRes === "string") return fnRes;
    } catch (e) {}
  }
  if (typeof response.text === "string") return response.text;
  if (response.candidates && response.candidates[0]) {
    const candidate = response.candidates[0];
    if (candidate.content && Array.isArray(candidate.content.parts)) {
      return candidate.content.parts
        .map((p: any) => (typeof p === "string" ? p : p?.text || ""))
        .join("")
        .trim();
    }
  }
  return "";
}

export function preprocessJSON(jsonString: string): string {
  let str = jsonString.trim();
  str = str.replace(/,\s*([}\]])/g, "$1");
  return str;
}

export function tryRepairJSON<T = any>(jsonString: string): T {
  let str = jsonString.trim();
  const openBraces = (str.match(/\{/g) || []).length;
  const closeBraces = (str.match(/\}/g) || []).length;
  const openBrackets = (str.match(/\[/g) || []).length;
  const closeBrackets = (str.match(/\]/g) || []).length;

  for (let i = 0; i < openBrackets - closeBrackets; i++) {
    str += "]";
  }
  for (let i = 0; i < openBraces - closeBraces; i++) {
    str += "}";
  }

  return JSON.parse(str) as T;
}

export function parseTruncatedJSONArray(jsonText: string): any[] {
  const clean = jsonText.trim();
  const startIdx = clean.indexOf("[");
  if (startIdx === -1) return [];

  const textToParse = clean.substring(startIdx);
  const objects: any[] = [];
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  let currentObjStart = -1;

  for (let i = 0; i < textToParse.length; i++) {
    const char = textToParse[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === "{") {
        if (depth === 0) {
          currentObjStart = i;
        }
        depth++;
      } else if (char === "}") {
        depth--;
        if (depth === 0 && currentObjStart !== -1) {
          const objText = textToParse.substring(currentObjStart, i + 1);
          try {
            const parsedObj = JSON.parse(objText);
            objects.push(parsedObj);
          } catch (e) {}
          currentObjStart = -1;
        }
      }
    }
  }

  return objects;
}

export function parseDurationInMinutes(durationStr: string | number | undefined | null): number {
  if (typeof durationStr === "number") {
    return isNaN(durationStr) || durationStr <= 0 ? 10 : durationStr;
  }
  if (!durationStr || typeof durationStr !== "string") {
    return 10;
  }

  const raw = durationStr.toLowerCase().trim().replace(/,/g, '.');
  if (!raw || raw === "custom") return 10;

  // 1. Check for hour patterns (e.g. "1.5 часа", "1 час 20 минут", "2 hours", "1h 30m")
  const hourMinMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:час(?:а|ов)?|ч|hours?|hrs?|h)\s*(\d+(?:\.\d+)?)\s*(?:мин(?:ут[ыа]?)?|m|mins?)/i);
  if (hourMinMatch) {
    const h = parseFloat(hourMinMatch[1]) || 0;
    const m = parseFloat(hourMinMatch[2]) || 0;
    if (h > 0 || m > 0) {
      return Number((h * 60 + m).toFixed(2));
    }
  }

  const hourMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:час(?:а|ов)?|ч|hours?|hrs?|h)\b/i);
  if (hourMatch) {
    const h = parseFloat(hourMatch[1]);
    if (!isNaN(h) && h > 0) {
      return Number((h * 60).toFixed(2));
    }
  }

  // 2. Check for ranges (e.g. "8-10 мин", "10 - 15 минут", "30-50 сек", "15-20")
  const rangeMatch = raw.match(/(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)/i);
  if (rangeMatch) {
    const num1 = parseFloat(rangeMatch[1]);
    const num2 = parseFloat(rangeMatch[2]);
    const isSeconds = raw.includes('сек') || raw.includes('sec') || raw.includes('секунд');
    if (!isNaN(num1) && !isNaN(num2) && num1 > 0 && num2 > 0) {
      const avg = (num1 + num2) / 2;
      return isSeconds ? Math.max(0.1, Number((avg / 60).toFixed(2))) : Number(avg.toFixed(2));
    }
  }

  // 3. Handle "MM:SS" or "M:SS" format (e.g. "01:30", "15:00", "0:45")
  if (raw.includes(':')) {
    const parts = raw.split(':');
    if (parts.length === 2) {
      const mins = parseFloat(parts[0]);
      const secs = parseFloat(parts[1]);
      if (!isNaN(mins) && !isNaN(secs)) {
        return Math.max(0.1, Number((mins + secs / 60).toFixed(2)));
      }
    }
  }

  // 4. Handle seconds (e.g. "60 сек", "30 секунд", "90 sec", "45s")
  const secMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:сек|sec|секунд|s)\b/i);
  if (secMatch) {
    const secs = parseFloat(secMatch[1]);
    if (!isNaN(secs) && secs > 0) {
      return Math.max(0.1, Number((secs / 60).toFixed(2)));
    }
  }

  // 5. Handle minutes (e.g. "10 мин", "15 минут", "7.5 min", "12m")
  const minMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:мин|min|минут[ыа]?|m)\b/i);
  if (minMatch) {
    const mins = parseFloat(minMatch[1]);
    if (!isNaN(mins) && mins > 0) {
      return Number(mins.toFixed(2));
    }
  }

  // 6. Direct float/integer string (e.g. "0.5", "1", "3", "5", "10", "15", "25")
  const directNum = parseFloat(raw);
  if (!isNaN(directNum) && directNum > 0) {
    return Number(directNum.toFixed(2));
  }

  return 10;
}

export function safeParseJSON<T>(text: string | undefined, defaultValue: T, schema?: z.ZodSchema<T>): T {
  if (!text) return defaultValue;
  try {
    let cleanText = text.trim();
    const markdownMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch && markdownMatch[1]) {
      cleanText = markdownMatch[1].trim();
    }
    
    if (Array.isArray(defaultValue)) {
      try {
        const arrResult = parseTruncatedJSONArray(cleanText);
        if (schema) {
          const val = schema.safeParse(arrResult);
          if (val.success) return val.data;
        }
        return arrResult as any;
      } catch (arrErr) {
        logger.warn("safeParseJSON array handling error:", arrErr);
      }
    }

    let parsed: any;
    const firstBrace = cleanText.indexOf('{');
    const firstBracket = cleanText.indexOf('[');
    let startIndex = -1;
    if (firstBrace !== -1 && firstBracket !== -1) {
      startIndex = Math.min(firstBrace, firstBracket);
    } else if (firstBrace !== -1) {
      startIndex = firstBrace;
    } else if (firstBracket !== -1) {
      startIndex = firstBracket;
    }

    const lastBrace = cleanText.lastIndexOf('}');
    const lastBracket = cleanText.lastIndexOf(']');
    const endIndex = Math.max(lastBrace, lastBracket);

    let extractedText = cleanText;
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      extractedText = cleanText.substring(startIndex, endIndex + 1);
    }

    try {
      const preprocessed = preprocessJSON(extractedText);
      parsed = JSON.parse(preprocessed);
    } catch (e1) {
      if (startIndex !== -1) {
        const fullTextFromStart = cleanText.substring(startIndex);
        try {
          const preprocessed = preprocessJSON(fullTextFromStart);
          parsed = JSON.parse(preprocessed);
        } catch (e2) {
          logger.warn("JSON parsing failed, trying to repair:", e2);
          try {
            const preprocessed = preprocessJSON(fullTextFromStart);
            parsed = tryRepairJSON(preprocessed);
          } catch (repairError) {
            try {
              const preprocessed = preprocessJSON(extractedText);
              parsed = tryRepairJSON(preprocessed);
            } catch (repairError2) {
              throw e1;
            }
          }
        }
      } else {
        try {
          const preprocessed = preprocessJSON(cleanText);
          parsed = tryRepairJSON(preprocessed);
        } catch (repairError) {
          throw e1;
        }
      }
    }

    if (schema) {
      const validation = schema.safeParse(parsed);
      if (validation.success) {
        return validation.data;
      }
      logger.warn("Zod schema validation warning (falling back to merged default):", validation.error);
    }

    if (typeof defaultValue === 'object' && defaultValue !== null && !Array.isArray(defaultValue)) {
      return { ...defaultValue, ...parsed } as T;
    }

    return parsed as T;
  } catch (e) {
    logger.warn("Failed to parse JSON response safely:", e);
    return defaultValue;
  }
}


export function getSourcesContext(options?: any): string {
  if (!options?.sources || options.sources.length === 0) return "";
  const sourcesText = options.sources
    .map((s: any, idx: number) => `[Источник ${idx + 1}]: ${s.title || s.url}\n${s.snippet || s.text || ""}`)
    .join("\n\n");
  return `\n\nДОПОЛНИТЕЛЬНЫЕ ИСТОЧНИКИ И ИССЛЕДОВАНИЯ:\n${sourcesText}\n`;
}

export function buildContents(prompt: string, options?: any): any {
  if (!options) return prompt;
  
  const parts: any[] = [];
  
  if (options.images && Array.isArray(options.images) && options.images.length > 0) {
    for (const img of options.images) {
      if (typeof img === "string") {
        const mimeMatch = img.match(/^data:([^;]+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
        const base64Data = img.replace(/^data:[^;]+;base64,/, "");
        parts.push({
          inlineData: {
            mimeType,
            data: base64Data
          }
        });
      }
    }
  }

  let finalPrompt = prompt;
  if (options.sources && Array.isArray(options.sources) && options.sources.length > 0) {
    finalPrompt += getSourcesContext(options);
  }
  
  if (parts.length === 0) {
    return finalPrompt;
  }
  
  parts.push({ text: finalPrompt });
  return { parts };
}


export function getToneContext(options?: any): string {
  if (!options) return "";
  let context = "";
  if (options.toneOfVoice) {
    context += `\nТОНАЛЬНОСТЬ / СТИЛЬ (TONE OF VOICE): ${options.toneOfVoice}\n`;
  }
  if (options.brandProfile) {
    try {
      context += `\nПРОФИЛЬ БРЕНДА: ${typeof options.brandProfile === "string" ? options.brandProfile : JSON.stringify(options.brandProfile)}\n`;
    } catch(e){}
  }
  if (options.audiencePortrait) {
    try {
      context += `\nПОРТРЕТ АУДИТОРИИ: ${typeof options.audiencePortrait === "string" ? options.audiencePortrait : JSON.stringify(options.audiencePortrait)}\n`;
    } catch(e){}
  }
  return context;
}
