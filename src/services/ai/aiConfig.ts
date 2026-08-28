import { logger } from "../../config/logger";
import { GoogleGenAI } from "@google/genai";
import { safeStorage } from "../../lib/storage";
import { z } from "zod";

// Get API key from environment variable
const getInitialApiKey = () => {
  try {
    return (typeof process !== 'undefined' && process?.env?.GEMINI_API_KEY) || "";
  } catch (e) {
    return "";
  }
};

let ai: any = null;

export function initGemini() {
  const key = getInitialApiKey();
  if (key && !ai) {
    try {
      ai = new GoogleGenAI({ apiKey: key });
    } catch (e) {
      logger.error("Failed to initialize GoogleGenAI:", e);
    }
  }
}

// Initial attempt
initGemini();

export function updateGeminiApiKey(key: string) {
  if (key) {
    try {
      ai = new GoogleGenAI({ apiKey: key });
    } catch (e) {
      logger.error("Failed to update GoogleGenAI API key:", e);
    }
  }
}

// Quota Tracking
export interface QuotaUsage {
  requestsPerMinute: number;
  tokensPerMinute: number;
  requestsPerDay: number;
  lastRequestTime?: number;
}

export const QUOTA_LIMITS = {
  RPM: 300,
  TPM: 100000000,
  RPD: 150000
};

type QuotaListener = (usage: QuotaUsage) => void;
const quotaListeners: QuotaListener[] = [];
let quotaInterval: any = null;

let requestLog: { time: number; tokens: number }[] = [];

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

  return {
    requestsPerMinute: requestsLastMin.length,
    tokensPerMinute: requestsLastMin.reduce((acc, req) => acc + req.tokens, 0),
    requestsPerDay: requestLog.length,
    lastRequestTime: requestLog.length > 0 ? requestLog[requestLog.length - 1].time : undefined,
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

export function trackApiUsage(tokens: number) {
  const now = Date.now();
  requestLog.push({ time: now, tokens });
  
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  requestLog = requestLog.filter(req => req.time > oneDayAgo);
  
  safeStorage.setItem("gemini_request_log", JSON.stringify(requestLog));
  notifyQuotaListeners();
}

export function getActiveCustomInstructionsText(overrideInstructions?: string): string {
  if (typeof overrideInstructions === "string" && overrideInstructions.trim().length > 0) {
    return overrideInstructions.trim();
  }
  let customText = "";
  if (typeof window !== "undefined") {
    const isEnabled = safeStorage.getItem("yt_custom_instructions_enabled");
    if (isEnabled !== "false") {
      const storedRules = safeStorage.getItem("yt_custom_rules");
      if (storedRules) {
        try {
          const rules = JSON.parse(storedRules);
          if (Array.isArray(rules)) {
            const active = rules
              .filter((r: any) => r && r.isActive && typeof r.content === "string" && r.content.trim())
              .map((r: any) => {
                const header = r.title ? `[ПРАВИЛО: ${r.title}]\n` : "";
                return `${header}${r.content.trim()}`;
              });
            if (active.length > 0) {
              customText = active.join("\n\n");
            }
          }
        } catch (e) {}
      }
      if (!customText) {
        const storedText = safeStorage.getItem("yt_custom_instructions") || "";
        if (storedText.trim().length > 0) {
          customText = storedText;
        }
      }
    }
  }
  return customText.trim();
}

export function normalizeModelName(model?: string): string {
  if (!model) return "gemini-3.7-flash";
  const m = model.toLowerCase().trim();
  if (m === "gemini-3.7-flash" || m === "gemini-3.6-flash" || m === "gemini-3.5-flash" || m === "gemini-2.5-flash" || m === "gemini-3.1-flash-lite" || m === "gemini-3.1-pro-preview-preview" || m === "gemini-3.1-flash-lite-image" || m === "gemini-3.1-flash-image" || m === "gemini-3-pro-image" || m === "gemini-3.1-pro-preview" || m === "gemini-3-flash") {
    return model;
  }
  if (m.includes("3.1-pro") || m === "gemini-pro" || m === "gemini-3-pro") {
    return "gemini-3.1-pro-preview-preview";
  }
  if (m.includes("lite-image")) return "gemini-3.1-flash-lite-image";
  if (m.includes("flash-image")) return "gemini-3.1-flash-image";
  if (m.includes("pro-image")) return "gemini-3-pro-image";
  if (m.includes("lite")) return "gemini-3.1-flash-lite";
  if (m.includes("2.5")) return "gemini-3.7-flash";
  return "gemini-3.7-flash";
}

export async function callGeminiWithRetry(params: any, maxRetries = 6, initialDelay = 3000) {
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

  if (!ai) {
    initGemini();
    if (!ai) {
      throw new Error("Gemini API key is missing. Please set it in Settings > Secrets.");
    }
  }

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

  const activeCustomInstructions = getActiveCustomInstructionsText(
    params.customInstructions || params.options?.customInstructions || params.config?.customInstructions
  );
  let baseSystemInstruction = params.config?.systemInstruction || globalSystemInstruction;

  if (activeCustomInstructions && !baseSystemInstruction.includes(activeCustomInstructions)) {
    baseSystemInstruction = `================================================================================
🚨 СТРОЖАЙШИЙ ВЫСШИЙ ПРИОРИТЕТ: ИНСТРУКЦИИ ДЛЯ ИИ АССИСТЕНТА (ОБЯЗАТЕЛЬНЫ К БЕЗУСЛОВНОМУ ВЫПОЛНЕНИЮ ДЛЯ ВСЕХ ФУНКЦИЙ):
Ты ОБЯЗАН СТРОГО, ТОЧНО И БЕЗ ИСКЛЮЧЕНИЙ соблюдать следующие правила, ограничения, структуру, стиль, хештеги, псевдонимы, ключевые слова, запреты и форматы во ВСЕХ задачах (генерация сценариев, SEO, хештеги, заголовки, описания, идеи, хуки, Shorts, промпты, аналитика):
"""
${activeCustomInstructions}
"""
НЕ ИГНОРИРУЙ НИ ОДНОГО ПУНКТА ИЗ ЭТИХ ИНСТРУКЦИЙ! ЕСЛИ ИНСТРУКЦИЯ ТРЕБУЕТ КОНКРЕТНЫЙ ТЕКСТ, ССЫЛКУ, ПСЕВДОНИМ, ОГРАНИЧЕНИЕ ПО ДЛИНЕ ИЛИ СПЕЦИАЛЬНЫЙ ФОРМАТ — ИСПОЛЬЗУЙ ИХ ТОЧНО КАК НАПИСАНО!
================================================================================

${baseSystemInstruction}`;
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
    const now = Date.now();
    const oneMinAgo = now - 60 * 1000;
    const requestsLastMin = requestLog.filter(req => req.time > oneMinAgo);
    
    if (requestsLastMin.length >= QUOTA_LIMITS.RPM) {
      const oldestRequest = requestsLastMin[0];
      const waitTime = 60 * 1000 - (now - oldestRequest.time) + 500;
      if (waitTime > 0) {
        logger.warn(`RPM limit reached (${QUOTA_LIMITS.RPM}). Waiting ${Math.ceil(waitTime / 1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    try {
      let response: any;
      if (ai && ai.models) {
        try {
          response = await ai.models.generateContent(params);
        } catch (directErr) {
          logger.warn("Direct client Gemini call failed, trying server proxy route:", directErr);
          const res = await fetch("/api/gemini/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(params)
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Server Gemini call failed with status ${res.status}`);
          }
          response = await res.json();
        }
      } else {
        const res = await fetch("/api/gemini/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params)
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server Gemini call failed with status ${res.status}`);
        }
        response = await res.json();
      }
      
      const usageMeta = response?.usageMetadata;
      const totalTokens = usageMeta?.totalTokenCount || 1000;
      trackApiUsage(totalTokens);

      try {
        if (!bypassCache) {
          safeStorage.setItem(cacheKey, JSON.stringify(response));
        }
      } catch (e) {}

      return response;
    } catch (error: any) {
      const isRateLimit = error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("RESOURCE_EXHAUSTED");
      const isServerErr = error?.status >= 500 || error?.message?.includes("500") || error?.message?.includes("503");

      if ((isRateLimit || isServerErr) && i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i) + Math.random() * 1000;
        logger.warn(`Gemini API returned ${error?.status || 'rate limit'}. Retrying in ${Math.round(delay / 1000)}s (Attempt ${i + 1}/${maxRetries})...`);
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
  if (response.text) return response.text;
  if (response.candidates && response.candidates[0]) {
    const candidate = response.candidates[0];
    if (candidate.content && candidate.content.parts && candidate.content.parts[0]) {
      return candidate.content.parts[0].text || "";
    }
  }
  return "";
}

export function preprocessJSON(jsonString: string): string {
  let str = jsonString.trim();
  str = str.replace(/,\s*([}\]])/g, "$1");
  return str;
}

export function tryRepairJSON(jsonString: string): any {
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

  return JSON.parse(str);
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

  const normalized = durationStr.replace(',', '.').trim();

  // Handle direct numbers or strings like "15", "15.5", "15,5"
  const directNum = parseFloat(normalized);
  if (!isNaN(directNum) && directNum > 0 && !normalized.includes(':') && !normalized.toLowerCase().includes('сек')) {
    return directNum;
  }

  // Handle "MM:SS" format (e.g. "01:30", "1:30")
  if (normalized.includes(':')) {
    const parts = normalized.split(':');
    if (parts.length === 2) {
      const mins = parseFloat(parts[0]);
      const secs = parseFloat(parts[1]);
      if (!isNaN(mins) && !isNaN(secs)) {
        return Math.max(0.25, Number((mins + secs / 60).toFixed(2)));
      }
    }
  }

  // Handle strings like "60 сек", "30 секунд", "90 sec"
  const secMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:сек|sec|секунд)/i);
  if (secMatch) {
    const secs = parseFloat(secMatch[1]);
    if (!isNaN(secs) && secs > 0) {
      return Math.max(0.1, Number((secs / 60).toFixed(2)));
    }
  }

  // Handle strings like "10 мин", "10 минут", "10 min"
  const minMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:мин|min|минут)/i);
  if (minMatch) {
    const mins = parseFloat(minMatch[1]);
    if (!isNaN(mins) && mins > 0) {
      return mins;
    }
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
