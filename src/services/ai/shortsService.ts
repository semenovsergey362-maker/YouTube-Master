import { logger } from "../../config/logger";
import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import {
  AnalysisOptions,
  AnalysisSource,
  ConvertedShortsVariant,
  CutShortItem,
  ShortsTopicRetentionAnalysis,
  OptimizedShortsScriptResult,
  ShortsSEO,
  ShortsRetentionPoint,
  LoopEndingResult,
  ShortsCtrAnalysisResult,
  ShortsHashtagsResult,
  IdeaDeepAnalysis,
} from "../../types";
import {
  callGeminiWithRetry,
  safeParseJSON,
  extractTextFromResponse,
  normalizeModelName,
  parseDurationInMinutes,
  getActiveCustomInstructionsText,
  preprocessJSON,
  tryRepairJSON,
  parseTruncatedJSONArray,
  buildContents,
  getSourcesContext,
  getToneContext,
} from "./aiConfig";
import { getCustomInstructions } from "./scriptService";
import { VISUAL_DIVERSITY_RULES } from "./visualPromptService";

export async function generateShortsIdeasFromLongForm(longFormIdea: string, niche: string, seoData?: any, options?: AnalysisOptions): Promise<{ title: string; hook: string; viral_potential: string }[]> {
  const keywordsStr = Array.isArray(seoData?.keywords)
    ? seoData.keywords.join(", ")
    : (typeof seoData?.keywords === "string" ? seoData.keywords : "Нет");

  const hashtagsStr = Array.isArray(seoData?.hashtags)
    ? seoData.hashtags.join(", ")
    : (typeof seoData?.hashtags === "string" ? seoData.hashtags : "Нет");

  const seoContext = seoData && seoData.title ? `
Также учти SEO-данные длинного видео:
Название: ${seoData.title}
Описание: ${seoData.description || "Нет"}
Ключевые слова: ${keywordsStr}
Хэштеги: ${hashtagsStr}` : "";
  const prompt = `На основе идеи для длинного видео "${longFormIdea}" в нише "${niche}"${seoContext}, предложи 3 идеи для YouTube Shorts.
  Каждая идея должна быть адаптирована под вертикальный формат и короткий хронометраж.
  
  Верни JSON массив из 3 объектов:
  - title: Название Shorts
  - hook: Сильный хук (первые 3 секунды)
  - viral_potential: Почему это может стать вирусным
  
  Все тексты на русском языке.`;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.7-flash",
    contents: buildContents(prompt, options),
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            hook: { type: Type.STRING },
            viral_potential: { type: Type.STRING }
          },
          required: ["title", "hook", "viral_potential"]
        }
      }
    }
  });

  return safeParseJSON(extractTextFromResponse(response), []);
}


export async function convertScriptToShorts(scriptText: string, options?: AnalysisOptions): Promise<ConvertedShortsVariant[]> {
  const prompt = `Вы являетесь топовым сценаристом YouTube Shorts, Reels и TikTok.
  Возьмите следующий полный сценарий длинного видео и конвертируйте его в 3 совершенно разных по структуре варианта сценария для Shorts с уникальными и мощными хуками.
  
  Длинный сценарий для конвертации:
  """
  ${scriptText}
  """
  
  Создайте ровно 3 варианта. Для каждого варианта предоставьте:
  - hookType: Тип хука (например: "Провокационный вопрос", "Разрушение мифа", "Шокирующая статистика", "Секретный лайфхак", "Личная драма / Кликбейт")
  - hookText: Полный текст хука (первые 3-5 секунд, максимально цепляющий)
  - bodyText: Основная часть Shorts (компактная, энергичная, передающая ключевую суть длинного сценария, адаптированная под высокий темп речи)
  - callToAction: Сильный призыв к действию в конце (для подписки, комментария, сохранения или досмотра)
  - estimatedDuration: Примерная длительность (например, "40-45 сек")
  - whyItWorks: Обоснование, почему этот тип хука и структура удержат внимание зрителя до конца
  
  ВЕРНИТЕ ТОЛЬКО JSON массив из 3 объектов, соответствующих схеме. Все тексты пишите на русском языке.`;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.7-flash",
    contents: prompt,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            hookType: { type: Type.STRING },
            hookText: { type: Type.STRING },
            bodyText: { type: Type.STRING },
            callToAction: { type: Type.STRING },
            estimatedDuration: { type: Type.STRING },
            whyItWorks: { type: Type.STRING }
          },
          required: ["hookType", "hookText", "bodyText", "callToAction", "estimatedDuration", "whyItWorks"]
        }
      }
    }
  });

  return safeParseJSON<ConvertedShortsVariant[]>(extractTextFromResponse(response), []);
}


export async function cutLongFormScriptToShorts(
  longFormScript: string,
  options?: any
): Promise<CutShortItem[]> {
  const customInst = getActiveCustomInstructionsText(options?.customInstructions);
  const instructionsContext = customInst ? `\n\nОБЯЗАТЕЛЬНЫЕ К НЕУКОСНИТЕЛЬНОМУ ИСПОЛНЕНИЮ КАСТОМНЫЕ ИНСТРУКЦИИ:\n${customInst}\n` : '';

  const prompt = `
Анализируй следующий длинный сценарий (Long-Form) и выдели из него от 3 до 5 самых острых, вирусных и интересных мыслей. Не просто нарезай текст на куски, а сгенерируй на основе этих мыслей полноценные, глубоко раскрытые темы в виде готовых сценариев для Shorts / Reels. Длительность каждого ролика должна быть НЕ МЕНЕЕ ОДНОЙ МИНУТЫ (от 60 до 90 секунд).
${instructionsContext}
Для каждого Shorts выполни:
1. Выдели сильный вовлекающий хук (первые 3 секунды), который зацепит зрителя.
2. Сгенерируй полноценный сценарий, который детально раскрывает тему.
3. ОБЯЗАТЕЛЬНО расставляй паузы в тексте, используя тег [пауза], чтобы диктор делал смысловые остановки. Также расставь интонации и смысловые акценты ([ускорение темпа], [шёпот], выделяй слова *курсивом* для интонационного ударения или КАПСОМ для экспрессии).
4. Адаптируй текст под динамичный вертикальный формат (9:16): добавь пометки для визуального монтажа (например, [ЭФФЕКТ: ...], [КАДР: ...], [ЗВУК: ...]).
5. Рассчитай хронометраж, чтобы он был от 60 секунд.

Исходный сценарий:
"""
${longFormScript}
"""

ОТВЕТЬ СТРОГО В ФОРМАТЕ JSON:
{
  "shorts": [
    {
      "title": "Интригующее название ролика",
      "hook": "Мощный хук для первых секунд",
      "script": "Полный текст сценария Shorts (от 1 минуты) с интонациями, акцентами и пометками для монтажа",
      "viral_potential": "Краткое объяснение, почему эта тема завирусится",
      "duration": "Хронометраж в секундах (например, '65 сек')"
    }
  ]
}
ОБЯЗАТЕЛЬНО используй букву "ё" во всех словах, где она пишется.
  `.trim();

  let response: any = null;
  try {
    response = await callGeminiWithRetry({
      model: options?.model || "gemini-3.7-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      customInstructions: options?.customInstructions,
      bypassCache: true,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 8192
      }
    });
  } catch (err) {
    logger.warn("cutLongFormScriptToShorts initial JSON call failed, retrying without mime-type:", err);
    response = await callGeminiWithRetry({
      model: options?.model || "gemini-3.7-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      customInstructions: options?.customInstructions,
      bypassCache: true,
      config: {
        maxOutputTokens: 8192
      }
    });
  }

  const resText = extractTextFromResponse(response);
  if (!resText || !resText.trim()) return [];

  let rawData: any = null;

  // 1. Try safeParseJSON
  try {
    rawData = safeParseJSON<any>(resText, null);
  } catch (err) {
    logger.warn("safeParseJSON failed for cutLongFormScriptToShorts:", err);
    rawData = null;
  }

  // 2. Try tryRepairJSON if safeParseJSON didn't yield an object/array
  if (!rawData || (typeof rawData !== 'object' && !Array.isArray(rawData))) {
    try {
      rawData = tryRepairJSON(resText);
    } catch (err) {
      logger.warn("tryRepairJSON failed for cutLongFormScriptToShorts:", err);
      rawData = null;
    }
  }

  // 3. Try parseTruncatedJSONArray if still not parsed
  if (!rawData) {
    try {
      rawData = parseTruncatedJSONArray(resText);
    } catch (err) {
      logger.warn("parseTruncatedJSONArray failed for cutLongFormScriptToShorts:", err);
      rawData = null;
    }
  }

  let list: any[] = [];
  if (Array.isArray(rawData)) {
    list = rawData;
  } else if (rawData && typeof rawData === 'object') {
    const arrayKey = Object.keys(rawData).find((k) => Array.isArray(rawData[k]));
    if (arrayKey) {
      list = rawData[arrayKey];
    } else if (rawData.title || rawData.script || rawData.hook) {
      list = [rawData];
    } else {
      const vals = Object.values(rawData).filter((v: any) => v && typeof v === 'object' && (v.title || v.script || v.hook || v.text));
      if (vals.length > 0) {
        list = vals;
      }
    }
  }

  // If list is still empty, attempt direct extraction of JSON array from text
  if (list.length === 0) {
    try {
      const extracted = parseTruncatedJSONArray(resText);
      if (Array.isArray(extracted) && extracted.length > 0) {
        list = extracted;
      }
    } catch (_) {}
  }

  // Fallback: parse plain text if JSON parsing completely failed
  if (list.length === 0 && resText) {
    const blocks = resText.split(/(?:Shorts|Ролик|Сценарий|Тема|#)\s*[\d#:]+/i).filter(b => b.trim().length > 20);
    if (blocks.length > 0) {
      list = blocks.map((b, i) => {
        const titleMatch = b.match(/(?:Название|Title|Тема):\s*(.+)/i);
        const hookMatch = b.match(/(?:Хук|Hook|Вступление):\s*(.+)/i);
        const scriptMatch = b.match(/(?:Сценарий|Script|Текст):\s*([\s\S]+?)(?=(?:Вирусн|Потенциал|Хроно|Duration|$))/i);
        const durationMatch = b.match(/(?:Хронометраж|Duration):\s*(.+)/i);
        const viralMatch = b.match(/(?:Вирусны|Potential|Потенциал):\s*(.+)/i);

        return {
          title: titleMatch ? titleMatch[1].trim() : `Shorts #${i + 1}`,
          hook: hookMatch ? hookMatch[1].trim() : (b.slice(0, 80) + "..."),
          script: scriptMatch ? scriptMatch[1].trim() : b.trim(),
          viral_potential: viralMatch ? viralMatch[1].trim() : "Высокий потенциал удержания",
          duration: durationMatch ? durationMatch[1].trim() : "60-90 сек"
        };
      });
    }

    if (list.length === 0) {
      const paragraphs = resText.split(/\n\s*\n/).filter(p => p.trim().length > 30);
      if (paragraphs.length >= 3) {
        const chunkSize = Math.ceil(paragraphs.length / 3);
        for (let i = 0; i < paragraphs.length; i += chunkSize) {
          const chunk = paragraphs.slice(i, i + chunkSize).join("\n\n");
          const lines = chunk.trim().split("\n");
          const title = lines[0].replace(/^[#*\d\-.\s]+/, "").trim() || `Shorts #${list.length + 1}`;
          list.push({
            title: title.slice(0, 60),
            hook: lines[0] || "Завлекающий хук",
            script: chunk,
            viral_potential: "Высокий потенциал удержания",
            duration: "60-90 сек"
          });
        }
      } else if (resText.trim().length > 20) {
        list = [{
          title: "Shorts #1",
          hook: resText.trim().slice(0, 80) + "...",
          script: resText.trim(),
          viral_potential: "Высокий потенциал удержания",
          duration: "60-90 сек"
        }];
      }
    }
  }

  // Normalize all items to ensure CutShortItem structure
  let normalized = list
    .filter((item) => item && typeof item === "object")
    .map((item, idx) => {
      const title = item.title || item.name || item.topic || `Shorts #${idx + 1}`;
      let script = item.script || item.text || item.content || item.fullScript || item.body || item.hook || "";
      let hook = item.hook || item.intro || item.firstSeconds || (script ? script.slice(0, 100) + "..." : "Захватывающий хук");
      if (!script && hook) script = hook;
      const viral_potential = item.viral_potential || item.viralPotential || item.potential || item.reason || "Высокий потенциал удержания";
      const duration = item.duration || item.time || item.length || "60-90 сек";

      return {
        title: String(title).trim(),
        hook: String(hook).trim(),
        script: String(script).trim(),
        viral_potential: String(viral_potential).trim(),
        duration: String(duration).trim()
      };
    })
    .filter((item) => item.script.length > 0 || item.hook.length > 0);

  // Helper: estimate duration from word count (approx. 150 wpm -> ~2.5 words/sec)
  const estimateDurationFromWords = (text: string) => {
    const cleanText = String(text || "")
      .replace(/\[[^\]]*\]/g, " ")
      .replace(/\((?:\d+\s*(?:сек|с|sec|ms)|пауза|pause)[^)]*\)/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    const words = cleanText.split(/\s+/).filter(Boolean).length;
    return Math.max(0, Math.round(words / 2.5));
  };

  const parseDurationInSeconds = (d: string) => {
    if (!d) return NaN;
    try {
      const m = String(d).match(/(\d{1,3})\s*(?:-|–)?\s*(\d{1,3})?\s*(сек|секунд|s|sec|мин|минут)?/i);
      if (m) {
        const first = parseInt(m[1], 10);
        if (!isNaN(first)) return first >= 24 && m[3] && /мин/i.test(m[3]) ? first * 60 : first;
      }
      const num = parseInt(String(d).replace(/[^0-9]/g, ""), 10);
      if (!isNaN(num)) return num;
    } catch (_) {}
    return NaN;
  };

  const ensureMinDuration = (item: any, minSec = 60) => {
    let secs = parseDurationInSeconds(item.duration);
    if (isNaN(secs) || secs <= 0) secs = estimateDurationFromWords(item.script);
    if (secs >= minSec) return { item, secs };

    // Pad script by repeating last meaningful sentence with pauses until estimated duration reached
    const sentences = item.script.split(/[\.\!\?]+\s*/).filter(Boolean);
    const last = sentences.length > 0 ? sentences[sentences.length - 1] : item.script.slice(-60);
    let pad = `[пауза]\n${last}`;
    let tries = 0;
    while (secs < minSec && tries < 6) {
      item.script = item.script + "\n\n" + pad;
      secs = estimateDurationFromWords(item.script);
      tries++;
    }
    item.duration = `${Math.max(minSec, secs)} сек`;
    return { item, secs };
  };

  const splitIntoChunks = (text: string, parts: number) => {
    const paragraphs = String(text || "").split(/\n\s*\n/).filter(Boolean);
    if (paragraphs.length < parts) {
      // fallback: split by words
      const words = String(text || "").split(/\s+/).filter(Boolean);
      const chunkSize = Math.ceil(words.length / parts);
      const chunks: string[] = [];
      for (let i = 0; i < words.length; i += chunkSize) {
        chunks.push(words.slice(i, i + chunkSize).join(" "));
      }
      return chunks;
    }
    const chunkSize = Math.ceil(paragraphs.length / parts);
    const out: string[] = [];
    for (let i = 0; i < paragraphs.length; i += chunkSize) {
      out.push(paragraphs.slice(i, i + chunkSize).join("\n\n"));
    }
    return out;
  };

  // Ensure each item has realistic duration (estimate or parse)
  normalized = normalized.map((it) => {
    const { item } = ensureMinDuration({ ...it }, 60);
    return item;
  });

  // Ensure count between 3 and 5. Provide fallback splitting from original longFormScript if needed.
  if (normalized.length < 3) {
    const chunks = splitIntoChunks(longFormScript, 3);
    normalized = chunks.map((chunk, i) => ({
      title: `Shorts #${i + 1}`,
      hook: (chunk.split(/\n/)[0] || chunk).slice(0, 120),
      script: chunk.trim(),
      viral_potential: "Высокий потенциал удержания",
      duration: `${Math.max(60, estimateDurationFromWords(chunk))} сек`
    }));
  }

  if (normalized.length > 5) normalized = normalized.slice(0, 5);

  // Final normalization: ensure strings and non-empty scripts
  normalized = normalized
    .map((item, idx) => ({
      title: String(item.title || `Shorts #${idx + 1}`).trim(),
      hook: String(item.hook || (item.script || "").slice(0, 100) + "...").trim(),
      script: String(item.script || item.hook || "").trim(),
      viral_potential: String(item.viral_potential || "Высокий потенциал удержания").trim(),
      duration: String(item.duration || "60-90 сек").trim()
    }))
    .filter((item) => item.script.length > 0 || item.hook.length > 0);

  return normalized as CutShortItem[];
}


export async function analyzeShortsTopicRetention(
  scriptText: string,
  title?: string,
  hook?: string,
  options?: any
): Promise<ShortsTopicRetentionAnalysis> {
  const prompt = `
Ты — ведущий алгоритмический аналитик YouTube Shorts & TikTok, специалист по максимальному удержанию внимания (Audience & Topic Retention).
Проведи глубокий ИИ-анализ удержания тем и вовлечения для следующего вертикального сценария (9:16).

ТЕМА/НАЗВАНИЕ: ${title || "Shorts ролик"}
ХУК: ${hook || "Вступление"}
СЦЕНАРИЙ:
"""
${scriptText}
"""

Проанализируй удержание темы по ключевым временным фазам хронометража (0-5с, 5-20с, 20-40с, 40-60с+) и ответь СТРОГО В ФОРМАТЕ JSON:
{
  "overallScore": 85,
  "retentionGrade": "Высокое удержание темы (Top 10%)",
  "summary": "Подробный разбор сильных сторон и динамики подачи...",
  "dropOffRisks": [
    "18-22 сек: Вводные слова без визуального акцента могут спровоцировать свайп",
    "35-40 сек: Падение динамики речи при переходе к второстепенному тезису"
  ],
  "topicPacingRating": "Темпоритм удержания темы высокий",
  "timeline": [
    {
      "timeRange": "0-5 сек",
      "topicPhase": "Хук / Первое впечатление",
      "retentionPercent": 95,
      "status": "excellent",
      "topicFeedback": "Хук отлично захватывает внимание и ставит остросюжетный вопрос.",
      "recommendation": "Сохранить формулировку, добавить текстовую плашку."
    },
    {
      "timeRange": "5-20 сек",
      "topicPhase": "Раскрытие сути темы",
      "retentionPercent": 82,
      "status": "good",
      "topicFeedback": "Основной тезис понятен, но есть небольшая пауза.",
      "recommendation": "Убрать лишнее вводное слово и добавить интригующий вопрос."
    },
    {
      "timeRange": "20-40 сек",
      "topicPhase": "Кульминация и главный факт",
      "retentionPercent": 74,
      "status": "warning",
      "topicFeedback": "Небольшой спад внимания из-за сложного оборота.",
      "recommendation": "Заменить академический термин на наглядную аналогию."
    },
    {
      "timeRange": "40-60+ сек",
      "topicPhase": "Вывод и кольцевой финал",
      "retentionPercent": 88,
      "status": "excellent",
      "topicFeedback": "Сильный финал с заделом на повторный просмотр.",
      "recommendation": "Усилить переход к первому кадру."
    }
  ],
  "keyRecommendations": [
    "Внедрить риторический вопрос на 15-й секунде для удержания",
    "Упростить сложный термин на 30-й секунде",
    "Ускорить темп подачи в средней части ролика"
  ]
}
ОБЯЗАТЕЛЬНО используй букву "ё" во всех словах, где она пишется.
`.trim();

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.7-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json"
    }
  });

  const resText = extractTextFromResponse(response);
  return tryRepairJSON(resText);
}


export async function optimizeShortsRetentionAndIntegrate(
  currentScript: string,
  title?: string,
  analysis?: ShortsTopicRetentionAnalysis,
  options?: any
): Promise<OptimizedShortsScriptResult> {
  const recs = analysis?.keyRecommendations?.length 
    ? analysis.keyRecommendations.join("\n- ") 
    : "Ликвидировать точки проседания, повысить динамику речи, разбить сплошной текст на короткие акцентные фразы, добавить пометки для эмоций и интонаций";
  
  const dropOffs = analysis?.dropOffRisks?.length
    ? analysis.dropOffRisks.join("\n- ")
    : "Падение удержания в середине из-за затянутого разбора";

  const prompt = `
Ты — шеф-редактор и сценарист вирусных Shorts / Reels с миллионными охватами.
Твоя задача — ПЕРЕРАБОТАТЬ И ОПТИМИЗИРОВАТЬ следующий сценарий Shorts, ВНЕДРИВ ВСЕ РЕКОМЕНДАЦИИ по удержанию темы и ПОЛНОСТЬЮ УСТРАНИВ точки проседания внимания.

НАЗВАНИЕ/ТЕМА: ${title || "Shorts"}

ИСХОДНЫЙ СЦЕНАРИЙ:
"""
${currentScript}
"""

РЕКОМЕНДАЦИИ ДЛЯ ВНЕДРЕНИЯ:
- ${recs}

ТОЧКИ ПРОСЕДАНИЯ ВНИМАНИЯ ДЛЯ УСТРАНЕНИЯ:
- ${dropOffs}

ТРЕБОВАНИЯ К ОПТИМИЗИРОВАННОМУ СЦЕНАРИЮ:
1. Внедри все рекомендации прямо в текст сценария.
2. Ликвидируй лишнюю воду, затянутые фразы и паузы без смысла.
3. Сохрани/усиль интонационные разметки для TTS и диктора: [пауза], [ускорение темпа], [шёпот], *курсив* для ударения, КАПС для экспрессии.
4. Оформи пометки для динамичного 9:16 видеорядов: [ЭФФЕКТ: ...], [КАДР: ...], [ЗВУК: ...].
5. Выдай полный готовый переработанный текст и детальный список внесенных изменений.

ОТВЕТЬ СТРОГО В ФОРМАТЕ JSON:
{
  "optimizedScript": "Полный текст оптимизированного сценария со всеми внедренными рекомендациями и разметкой...",
  "optimizedHook": "Усиленный супер-хук первых 3 секунд",
  "changesSummary": [
    "Устранена пауза на 20-й секунде: добавлена остросюжетная зацепка",
    "Внедрен риторический вопрос в середине для перезапуска внимания",
    "Ускорено темпоритмическое повествование в сложной части темы",
    "Добавлено 4 интонационных акцента для диктора"
  ],
  "expectedRetentionGain": "+22% к удержанию зрителей"
}
ОБЯЗАТЕЛЬНО используй букву "ё" во всех словах, где она пишется.
`.trim();

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.7-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json"
    }
  });

  const resText = extractTextFromResponse(response);
  return tryRepairJSON(resText);
}




export async function generateSeamlessLoopEnding(
  scriptText: string,
  options?: any
): Promise<LoopEndingResult> {
  const prompt = `
Создай бесшовную зацикленную концовку (Seamless Loop Ending) для этого сценария Shorts.
Цель: Последняя фраза сценария должна грамматически, семантически и интонационно плавно перетекать в самую первую фразу (начиная с первого слова), создавая иллюзию бесконечного видео.

Инструкции:
1. Выдели первые 1-2 предложения (начало сценария).
2. Сделай так, чтобы последняя фраза не заканчивалась точкой, а обрывалась на полуслове или союзе/предлоге/вопросе, который идеально продолжается самым первым словом сценария.
3. Напиши эту переходную концовку (loopEndingPhrase).
4. Предоставь полный объединенный текст (loopedFullScript), где в конце сценария стоит эта новая концовка, а также показано стрелочкой или пометкой, как она перетекает в начало.

Оригинальный сценарий Shorts:
"""
${scriptText}
"""

ОТВЕТЬ СТРОГО В ФОРМАТЕ JSON со следующими полями:
{
  "originalBeginning": "Самая первая фраза сценария",
  "loopEndingPhrase": "Новая бесшовная концовка, стыкующаяся с началом",
  "loopedFullScript": "Полный текст сценария с зацикленной концовкой и пометкой перехода",
  "explanation": "Объяснение стыка (как фраза переходит в начало)"
}
  `.trim();

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.7-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          originalBeginning: { type: Type.STRING },
          loopEndingPhrase: { type: Type.STRING },
          loopedFullScript: { type: Type.STRING },
          explanation: { type: Type.STRING }
        },
        required: ["originalBeginning", "loopEndingPhrase", "loopedFullScript", "explanation"]
      }
    }
  });

  const resText = extractTextFromResponse(response);
  if (!resText) {
    throw new Error("Не удалось получить ответ от AI");
  }
  return tryRepairJSON(resText);
}




export async function generateShortsVisualsAndMusic(
  scriptText: string,
  options?: AnalysisOptions
): Promise<{ visuals: { text: string; prompt: string; shotType?: string; cameraMovement?: string; duration?: number }[]; musicPrompt: string }> {
  const veoSfxPromptText = `
ОБЯЗАТЕЛЬНОЕ ТРЕБОВАНИЕ ДЛЯ ЗВУКОВЫХ ЭФФЕКТОВ В VEO 3 (VEO SFX):
Для КАЖДОЙ сцены в визуальном промпте ты ДОЛЖЕН интегрировать подходящие звуки (SFX) прямо в текст промпта на английском языке.
- Опиши эти звуковые эффекты в конце каждого промпта на английском языке в ЕСТЕСТВЕННОЙ И ПРЯМОЙ повествовательной форме БЕЗ каких-либо квадратных скобок, БЕЗ мета-тегов "[Audio...]" и БЕЗ упоминаний вроде "no background music" или "silence".
- Вместо этого завершай промпт красивой, естественной фразой, описывающей то, что звучит на видео, например: "accompanied by the natural high-fidelity sound of <описание звуков на английском>, featuring rich acoustic details and crisp foley effects." или "with highly realistic sound of <описание звуков>, capturing detailed acoustic textures."
- Текст звука должен быть органично вплетен в финал английского промпта без каких-либо скобок.`;

  const shortsAntiRepeatRules = `
ПРАВИЛО ПРОТИВ ПОВТОРОВ И ШАБЛОННОСТИ ДЛЯ SHORTS (ролик короткий, зритель видит всё сразу):
1. ЗАПРЕЩЕНО буквально повторять то, что уже было показано (тот же предмет, то же действие, тот же ракурс на тот же объект) в двух соседних сценах — если что-то уже было в кадре, следующая сцена должна показать другое: реакцию, деталь, окружение, метафору, иной момент времени.
2. НЕ строй предсказуемый цикл планов (например Средний-Крупный-Средний-Крупный или Wide-CloseUp-Wide-CloseUp). Выбор каждого кадра — художественное решение, продиктованное смыслом ИМЕННО ЭТОЙ фразы текста, а не механическая ротация по списку. Иногда две сцены подряд МОГУТ быть похожего масштаба, если это оправдано — важно, чтобы зритель не видел повтор картинки, а не формальную пестроту по чек-листу.
3. Поощряется неожиданное: необычная композиция, деталь без прямого объяснения, метафора, смена света/погоды/времени суток, отражение, тень, POV, текстура крупным планом. Не ограничивайся стандартным набором "крупный план лица / средний план в полный рост".
4. Свет и цветокоррекция могут отражать эмоциональную фазу текста в этот момент (холодный/резкий = напряжение, тёплый/золотой = решение и надежда) — но не обязаны быть на этом завязаны в каждой сцене, если художественно уместнее иначе.
5. Самопроверка перед выводом JSON: пробеги глазами по всем "subject" сцен подряд — если увидишь, что буквально повторяется предмет/действие ИЛИ что планы идут по узнаваемому циклу — переделай.`;

  const customInst = getCustomInstructions(options, true);
  const instructionsContext = customInst ? `\n\nОБЯЗАТЕЛЬНЫЕ К НЕУКОСНИТЕЛЬНОМУ ИСПОЛНЕНИЮ КАСТОМНЫЕ ИНСТРУКЦИИ:\n${customInst}\n` : '';
  const voiceoverScriptText = scriptText
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\((?:\d+\s*(?:сек|с|sec|ms)|пауза|pause)[^)]*\)/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const prompt = `Ты — профессиональный ИИ-режиссер роликов формата 9:16 (YouTube Shorts / TikTok / Reels). Тебе передан сценарий:
  
"${voiceoverScriptText}"

Твоя задача:
1. ПОЛНОСТЬЮ разбить ВЕСЬ текст сценария от первого до последнего слова на смысловые сцены. Ты не имеешь права выкидывать или сокращать фразы.
2. Хронометраж КАЖДОЙ сцены ДОЛЖЕН БЫТЬ ОТ 4 ДО 7 СЕКУНД. НИ ОДНА сцена не может быть короче 4 секунд. Ориентир для русской речи: примерно 2.3-3.0 слова в секунду. Если отдельная фраза короче 4 секунд, ОБЯЗАТЕЛЬНО объединяй её со следующей смысловой фразой, сохраняя исходный текст БЕЗ изменений.
2а. ЖЁСТКИЙ ПОТОЛОК: в ответе НЕ ДОЛЖНО быть больше 20 сцен, ни при каких обстоятельствах — это более важное ограничение, чем длительность отдельной сцены из пункта 2. Сначала посчитай: (общая длительность сценария в секундах) / 20 = минимальная средняя длительность одной сцены. Если это число больше 7 секунд — значит, укрупняй сцены (объединяй по 2-3 смысловые фразы вместо одной) до тех пор, пока сцен не станет 20 или меньше, даже если из-за этого отдельные сцены выйдут за пределы диапазона 4-7 секунд. Для типичного Shorts на 50-70 секунд должно получиться 8-14 сцен, для более длинного (90-140 сек) — 13-20 сцен. Обязательно просчитывай это математически перед выводом ответа.
3. Для каждой сцены написать максимально детализированный визуальный промпт на английском языке, специально оптимизированный для генерации вертикального видео (9:16) в нейросети Google Veo 3. Промпты должны детально описывать кинематографичные движения камеры (pan, tilt, zoom, dolly, drone shot), тип освещения (cinematic lighting, volumetric lighting, rim light), динамику объектов в кадре и стиль.
${veoSfxPromptText}
${VISUAL_DIVERSITY_RULES}
${shortsAntiRepeatRules}
${instructionsContext}
4. Для каждой сцены дополнительно укажи краткие поля "shotType" (масштаб кадра, например "Close-Up") и "cameraMovement" (тип движения камеры, например "slow dolly in").
5. Написать ОДИН общий музыкальный промпт для всего Shorts (жанр, настроение, инструменты, темп) на английском языке (подходит для Suno/Udio).

Формат ответа СТРОГО JSON:
{
  "visuals": [
    {
      "text": "Полная фраза из сценария (текст без изменений)",
      "prompt": "Veo 3 highly detailed 9:16 cinematic vertical prompt in English, specifying camera movement, lighting, subject action... accompanied by the natural high-fidelity sound of...",
      "shotType": "Краткое название масштаба кадра",
      "cameraMovement": "Краткое название движения камеры",
      "duration": 5.5
    }
  ],
  "musicPrompt": "Energetic phonk beat with heavy bass, fast tempo, dynamic..."
}`;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.1-pro-preview",
    contents: buildContents(prompt, options),
    config: {
      temperature: 1.0,
      responseMimeType: "application/json",
      maxOutputTokens: 8192,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          visuals: {
            type: Type.ARRAY,
            maxItems: 20,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                prompt: { type: Type.STRING },
                shotType: { type: Type.STRING },
                cameraMovement: { type: Type.STRING },
                duration: { type: Type.NUMBER, minimum: 4 }
              },
              required: ["text", "prompt", "duration"]
            }
          },
          musicPrompt: { type: Type.STRING }
        },
        required: ["visuals", "musicPrompt"]
      }
    }
  });

  const text = extractTextFromResponse(response);
  if (!text) {
    throw new Error("Не удалось сгенерировать промпты для Shorts.");
  }
  
  let parsedResult: { visuals: { text: string; prompt: string; shotType?: string; cameraMovement?: string; duration?: number }[]; musicPrompt: string };
  try {
    parsedResult = safeParseJSON(text, { visuals: [], musicPrompt: "" });
  } catch (error) {
    logger.error("Ошибка парсинга JSON для визуализации Shorts:", error);
    throw new Error("Ошибка обработки ответа ИИ для визуализации Shorts.");
  }

  // safeParseJSON тихо возвращает дефолт при неудачном парсинге (например, при обрезке
  // ответа по лимиту токенов) — без явной проверки это выглядело бы как "успех" с пустыми
  // промптами. Превращаем это в понятную ошибку, которую увидит пользователь.
  if (!parsedResult.visuals || parsedResult.visuals.length === 0) {
    throw new Error("ИИ вернул пустой или повреждённый ответ (возможно, сценарий слишком длинный для одного запроса). Попробуйте ещё раз.");
  }

  // Финальная серверно-клиентская защита от слишком коротких сцен.
  // Gemini может нарушить ограничение даже при строгой JSON-схеме, поэтому
  // объединяем соседние короткие сцены, сохраняя исходный текст без изменений.
  const MIN_SCENE_SECONDS = 4;
  const MAX_SCENE_SECONDS = 7;
  const WORDS_PER_SECOND = 2.6;

  const estimateDuration = (text: string) => {
    const voiceoverText = (text || "")
      .replace(/\[[^\]]*\]/g, " ")
      .replace(/\((?:\d+\s*(?:сек|с|sec|ms)|пауза|pause)[^)]*\)/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    const words = voiceoverText.split(/\s+/).filter(Boolean).length;
    return Math.max(0.1, words / WORDS_PER_SECOND);
  };

  // Pre-clean scenes from Gemini to remove bracket tags and filter out zero-speech scenes
  parsedResult.visuals = (parsedResult.visuals || [])
    .map(v => ({
      ...v,
      text: (v.text || "")
        .replace(/\[[^\]]*\]/g, " ")
        .replace(/\((?:\d+\s*(?:сек|с|sec|ms)|пауза|pause)[^)]*\)/gi, " ")
        .replace(/\s+/g, " ")
        .trim()
    }))
    .filter(v => v.text.length > 0);

  if (parsedResult.visuals.length === 0) {
    throw new Error("Не удалось извлечь текст диктора из сценария.");
  }

  const normalizedVisuals: typeof parsedResult.visuals = [];
  for (const visual of parsedResult.visuals) {
    const estimated = estimateDuration(visual.text);
    const reported = typeof visual.duration === "number" && Number.isFinite(visual.duration)
      ? visual.duration
      : estimated;
    const duration = Math.min(MAX_SCENE_SECONDS, Math.max(0.1, reported));

    if (normalizedVisuals.length > 0 && duration < MIN_SCENE_SECONDS) {
      const previous = normalizedVisuals[normalizedVisuals.length - 1];
      const combinedText = `${previous.text} ${visual.text}`.trim();
      const combinedEstimated = estimateDuration(combinedText);

      if (combinedEstimated <= MAX_SCENE_SECONDS) {
        previous.text = combinedText;
        previous.duration = Math.min(MAX_SCENE_SECONDS, Math.max(MIN_SCENE_SECONDS, combinedEstimated));
        // Prompt будет исправлен отдельным repair-вызовом ниже, если объединение произошло.
        previous.prompt = "";
        previous.shotType = undefined;
        previous.cameraMovement = undefined;
        continue;
      }
    }

    normalizedVisuals.push({ ...visual, duration });
  }

  // Если после нормализации осталась короткая финальная сцена, присоединяем её
  // к предыдущей только когда итог укладывается в 7 секунд.
  if (normalizedVisuals.length > 1) {
    const last = normalizedVisuals[normalizedVisuals.length - 1];
    if ((last.duration || estimateDuration(last.text)) < MIN_SCENE_SECONDS) {
      const previous = normalizedVisuals[normalizedVisuals.length - 2];
      const combinedText = `${previous.text} ${last.text}`.trim();
      const combinedEstimated = estimateDuration(combinedText);
      if (combinedEstimated <= MAX_SCENE_SECONDS) {
        previous.text = combinedText;
        previous.duration = Math.min(MAX_SCENE_SECONDS, Math.max(MIN_SCENE_SECONDS, combinedEstimated));
        previous.prompt = "";
        previous.shotType = undefined;
        previous.cameraMovement = undefined;
        normalizedVisuals.pop();
      }
    }
  }

  // Жёсткий потолок в 20 сцен (по требованию пользователя — Shorts не должен разбиваться
  // на 30-40 микросцен). Если даже после объединения слишком коротких сцен их всё ещё больше 20,
  // итеративно объединяем соседние пары с наименьшей суммарной длительностью, пока не останется ≤20.
  // Здесь сознательно НЕ ограничиваем итоговую длительность объединённой сцены 7 секундами —
  // потолок в 20 сцен важнее, чем верхняя граница длительности отдельной сцены.
  const MAX_TOTAL_SCENES = 20;
  while (normalizedVisuals.length > MAX_TOTAL_SCENES) {
    let bestIdx = 0;
    let bestCombined = Infinity;
    for (let i = 0; i < normalizedVisuals.length - 1; i++) {
      const combined = estimateDuration(`${normalizedVisuals[i].text} ${normalizedVisuals[i + 1].text}`);
      if (combined < bestCombined) {
        bestCombined = combined;
        bestIdx = i;
      }
    }
    const a = normalizedVisuals[bestIdx];
    const b = normalizedVisuals[bestIdx + 1];
    const combinedText = `${a.text} ${b.text}`.trim();
    a.text = combinedText;
    a.duration = estimateDuration(combinedText);
    a.prompt = "";
    a.shotType = undefined;
    a.cameraMovement = undefined;
    normalizedVisuals.splice(bestIdx + 1, 1);
  }

  // Объединённые сцены требуют нового визуального промпта: старый промпт мог
  // описывать только первую половину объединённого текста. Делаем один repair-call
  // для всех таких сцен, чтобы Veo 3 получил точное описание полного фрагмента.
  const needsRepair = normalizedVisuals.some(v => !v.prompt);
  if (needsRepair) {
    const repairItems = normalizedVisuals
      .map((v, i) => v.prompt ? null : `${i + 1}. ${v.text}\nДлительность: ${v.duration?.toFixed(1) || "5.0"} сек.`)
      .filter(Boolean)
      .join("\n\n");

    const repairPrompt = `Ты — профессиональный режиссёр Veo 3. Перегенерируй визуальные промпты ТОЛЬКО для следующих объединённых сцен.
Каждый промпт должен соответствовать ПОЛНОМУ тексту своей сцены и длительности 4-7 секунд.
Верни только JSON-массив объектов с полями index, prompt, shotType, cameraMovement.
Промпты на английском, ultra-realistic cinematic vertical 9:16, с движением камеры, светом, действием и естественными VEO 3 SFX.

${repairItems}`;

    try {
      const repairResponse = await callGeminiWithRetry({
        model: options?.model || "gemini-3.1-pro-preview",
        contents: buildContents(repairPrompt, options),
        config: {
          temperature: 0.9,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                index: { type: Type.INTEGER },
                prompt: { type: Type.STRING },
                shotType: { type: Type.STRING },
                cameraMovement: { type: Type.STRING }
              },
              required: ["index", "prompt"]
            }
          }
        }
      });
      const repairText = extractTextFromResponse(repairResponse);
      const repaired = safeParseJSON<any[]>(repairText, []);
      if (Array.isArray(repaired)) {
        for (const item of repaired) {
          const idx = Number(item?.index) - 1;
          if (idx >= 0 && idx < normalizedVisuals.length && typeof item?.prompt === "string" && item.prompt.trim()) {
            normalizedVisuals[idx].prompt = item.prompt.trim();
            if (item.shotType) normalizedVisuals[idx].shotType = String(item.shotType);
            if (item.cameraMovement) normalizedVisuals[idx].cameraMovement = String(item.cameraMovement);
          }
        }
      }
    } catch (repairError) {
      logger.warn("Не удалось автоматически перегенерировать промпты объединённых сцен:", repairError);
    }
  }

  // Для одиночных сцен, где Gemini вернул duration вне допустимого диапазона,
  // показываем фактическую оценку, но никогда не позволяем UI считать сцену <4 сек.
  // Верхнюю границу НЕ применяем к сценам, укрупнённым ради потолка в 20 сцен (их
  // duration уже честно посчитан выше как реальная оценка по тексту) — иначе отображаемая
  // длительность разошлась бы с фактическим текстом сцены.
  for (const visual of normalizedVisuals) {
    const estimated = estimateDuration(visual.text);
    const isOverCap = estimated > MAX_SCENE_SECONDS + 0.05;
    visual.duration = isOverCap
      ? Math.max(MIN_SCENE_SECONDS, visual.duration || estimated)
      : Math.min(MAX_SCENE_SECONDS, Math.max(MIN_SCENE_SECONDS, visual.duration || estimated));
  }

  return { ...parsedResult, visuals: normalizedVisuals };
}


export async function generateShortsSEO(
  scriptText: string,
  options?: AnalysisOptions & { niche?: any; branding?: any; topic?: string }
): Promise<ShortsSEO> {
  const customInst = getCustomInstructions(options, false);
  const customContext = customInst ? `\n\nОБЯЗАТЕЛЬНЫЕ К НЕУКОСНИТЕЛЬНОМУ ИСПОЛНЕНИЮ КАСТОМНЫЕ ИНСТРУКЦИИ:\n${customInst}\n` : '';
  const nicheContext = options?.niche ? `Ниша: ${options.niche.name}
ЦА: ${options.niche.targetAudience}
` : "";
  const brandContext = options?.branding ? `Бренд: ${options.branding.name}
` : "";
  
  const prompt = `Ты — эксперт по YouTube Shorts и SEO-оптимизации коротких вертикальных видео. 
Твоя задача — создать идеальную SEO-упаковку для следующего сценария Shorts:

"${scriptText}"

Контекст канала:
${nicheContext}${brandContext}${customContext}

Требования:
1. Придумай ровно 3 кликабельных, вирусных названия (titles) для Shorts.
2. Напиши вовлекающее SEO-описание для ролика. Описание должно быть ёмким, побуждающим к взаимодействию.
   ВАЖНО: Никаких таймкодов! Это Shorts.
3. Собери массив из 5-8 релевантных хештегов.
4. Собери массив из 10-15 ключевых слов/тег-фраз (keywords).
5. Напиши текст для закрепленного комментария (pinnedComment), который будет стимулировать обсуждение или призывать к действию (подписка/переход по ссылке).

ОТВЕТ ДОЛЖЕН БЫТЬ СТРОГО В ФОРМАТЕ JSON:
{
  "titles": ["Название 1", "Название 2", "Название 3"],
  "description": "Текст описания...",
  "hashtags": ["#shorts", "#тег2"],
  "keywords": ["ключ 1", "ключевая фраза 2"],
  "pinnedComment": "Текст закрепленного комментария..."
}
`;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.7-flash",
    contents: buildContents(prompt, options),
    config: {
      temperature: 0.7,
      responseMimeType: "application/json"
    }
  });

  const text = extractTextFromResponse(response);
  const parsed = safeParseJSON<any>(text, {});

  // Define our final strictly typed result with fallback/defaults
  const result: ShortsSEO = {
    titles: [],
    description: "",
    hashtags: [],
    keywords: [],
    pinnedComment: ""
  };

  // 1. titles: support "titles", "title", "name", "names", "heading", "headings"
  const rawTitles = parsed.titles || parsed.title || parsed.names || parsed.name || parsed.headings || parsed.heading;
  if (Array.isArray(rawTitles)) {
    result.titles = rawTitles.map((t: any) => String(t || "").trim()).filter(Boolean);
  } else if (typeof rawTitles === "string") {
    result.titles = [rawTitles.trim()];
  } else {
    result.titles = [];
  }
  
  // Ensure we always have at least 3 titles (and pad if needed)
  if (result.titles.length === 0) {
    result.titles = ["Креативное название Shorts #1", "Креативное название Shorts #2", "Креативное название Shorts #3"];
  } else {
    while (result.titles.length < 3) {
      result.titles.push(`${result.titles[0]} - Вариант ${result.titles.length + 1}`);
    }
  }

  // 2. description: support "description", "descriptions", "desc", "text", "about", "caption", "captions"
  const rawDesc = parsed.description || parsed.descriptions || parsed.desc || parsed.text || parsed.about || parsed.caption || parsed.captions;
  result.description = typeof rawDesc === "string" ? rawDesc.trim() : (Array.isArray(rawDesc) ? rawDesc.join("\n") : "");

  // 3. hashtags: support "hashtags", "hashtag", "tags", "tag"
  const rawHashtags = parsed.hashtags || parsed.hashtag || parsed.tags || parsed.tag;
  if (Array.isArray(rawHashtags)) {
    result.hashtags = rawHashtags.map((t: any) => String(t || "").trim()).filter(Boolean);
  } else if (typeof rawHashtags === "string") {
    result.hashtags = rawHashtags.split(/[\s,]+/).filter(Boolean);
  }

  // Ensure hashtags start with #
  result.hashtags = result.hashtags.map((h: string) => h.startsWith("#") ? h : `#${h}`);

  // 4. keywords: support "keywords", "keyword", "tags_phrases", "keys", "tag_phrases", "search_terms"
  const rawKeywords = parsed.keywords || parsed.keyword || parsed.tags_phrases || parsed.keys || parsed.tag_phrases || parsed.search_terms;
  if (Array.isArray(rawKeywords)) {
    result.keywords = rawKeywords.map((t: any) => String(t || "").trim()).filter(Boolean);
  } else if (typeof rawKeywords === "string") {
    result.keywords = rawKeywords.split(/[\s,]+/).filter(Boolean);
  }

  // 5. pinnedComment: support "pinnedComment", "pinned_comment", "pinnedcomment", "pinned", "comment", "comments"
  const rawPinned = parsed.pinnedComment || parsed.pinned_comment || parsed.pinnedcomment || parsed.pinned || parsed.comment || parsed.comments;
  result.pinnedComment = typeof rawPinned === "string" ? rawPinned.trim() : (Array.isArray(rawPinned) ? rawPinned.join("\n") : "");

  return result;
}



/**
 * Analyzes Shorts title and snippet description for CTR potential, hook strength, and viral triggers.
 */

export async function analyzeShortsCTR(
  title: string,
  description?: string,
  options?: AnalysisOptions & { niche?: any; branding?: any }
): Promise<ShortsCtrAnalysisResult> {
  const customInst = getCustomInstructions(options, false);
  const customContext = customInst ? `\n\nОБЯЗАТЕЛЬНЫЕ К НЕУКОСНИТЕЛЬНОМУ ИСПОЛНЕНИЮ КАСТОМНЫЕ ИНСТРУКЦИИ:\n${customInst}\n` : '';
  const nicheContext = options?.niche ? `Ниша: ${options.niche.name || ""}\nЦА: ${options.niche.targetAudience || ""}\n` : "";
  const brandContext = options?.branding ? `Бренд: ${options.branding.name || ""}\n` : "";

  const prompt = `Ты — ведущий эксперт по YouTube алгоритмам и специалист по взрывному CTR (кликабельности) для YouTube Shorts.
Проведи глубокий профессиональный аудит заголовка и сниппета (первой строки описания) для короткого видео Shorts.

ТЕКУЩИЕ ДАННЫЕ:
Заголовок: "${title}"
Описание / Сниппет: "${description || "Нет описания"}"

Контекст канала:
${nicheContext}${brandContext}${customContext}

Твоя задача — проанализировать эти данные и выдать структурированные рекомендации для максимизации CTR, интриги и удержания внимания с первых 3 секунд.

ОТВЕТЬ СТРОГО В ФОРМАТЕ JSON:
{
  "ctrScore": 85,
  "hookStrength": "высокая",
  "emotion": "Любопытство и шок",
  "competitiveness": "Средняя",
  "retentionPrediction": "Высокая вероятность удержания в первые 3 секунды благодаря открытой петле внимания",
  "critique": "Заголовок привлекает внимание, но содержит слабые вводные слова...",
  "suggestedTitles": [
    { "title": "Улучшенный заголовок вариант 1", "type": "Интрига / Кликбейт", "ctrIncrease": "+25%" },
    { "title": "Улучшенный заголовок вариант 2", "type": "Проблема / Вопрос", "ctrIncrease": "+18%" },
    { "title": "Улучшенный заголовок вариант 3", "type": "Цифры и Факты", "ctrIncrease": "+15%" }
  ],
  "firstLineSuggestion": "Идеально оптимизированная первая строка описания (до 100 символов, видимая в ленте)...",
  "ctrTriggers": ["Увеличьте контраст в превью", "Используйте капс на ключевом слове", "Добавьте эмодзи интриги", "Создайте эффект незаконченного действия"],
  "stopWordsDetected": ["Слова или клише, которые снижают CTR..."]
}

Используй букву "ё" везде, где она должна быть. Ответ должен быть на русском языке.`;

  try {
    const response = await callGeminiWithRetry({
      model: options?.model || "gemini-3.7-flash",
      contents: buildContents(prompt, options),
      config: {
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ctrScore: { type: Type.NUMBER },
            hookStrength: { type: Type.STRING },
            emotion: { type: Type.STRING },
            competitiveness: { type: Type.STRING },
            retentionPrediction: { type: Type.STRING },
            critique: { type: Type.STRING },
            suggestedTitles: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  type: { type: Type.STRING },
                  ctrIncrease: { type: Type.STRING }
                },
                required: ["title"]
              }
            },
            firstLineSuggestion: { type: Type.STRING },
            ctrTriggers: { type: Type.ARRAY, items: { type: Type.STRING } },
            stopWordsDetected: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["ctrScore", "hookStrength", "emotion", "competitiveness", "suggestedTitles"]
        }
      }
    });

    const text = extractTextFromResponse(response);
    const parsed = safeParseJSON<any>(text, {});

    const rawScore = Number(parsed.ctrScore);
    const ctrScore = !isNaN(rawScore) && rawScore > 0 ? Math.min(Math.max(Math.round(rawScore), 5), 99) : 78;

    let hookStrength = "средняя";
    if (parsed.hookStrength) {
      const hs = String(parsed.hookStrength).toLowerCase();
      if (hs.includes("выс") || hs.includes("high") || hs.includes("strong")) hookStrength = "высокая";
      else if (hs.includes("низ") || hs.includes("low") || hs.includes("weak")) hookStrength = "низкая";
      else hookStrength = "средняя";
    }

    let suggestedTitles: Array<{ title: string; type?: string; ctrIncrease?: string }> = [];
    if (Array.isArray(parsed.suggestedTitles)) {
      suggestedTitles = parsed.suggestedTitles.map((item: any) => {
        if (typeof item === "string") {
          return { title: item, type: "Оптимизация", ctrIncrease: "+15%" };
        }
        return {
          title: item?.title || item?.name || "Улучшенный заголовок",
          type: item?.type || "Улучшение",
          ctrIncrease: item?.ctrIncrease || "+20%"
        };
      });
    } else if (Array.isArray(parsed.suggestions)) {
      suggestedTitles = parsed.suggestions.map((item: any) => ({
        title: typeof item === "string" ? item : (item?.title || "Улучшенный заголовок"),
        type: item?.type || "Улучшение",
        ctrIncrease: item?.ctrIncrease || "+20%"
      }));
    }

    if (suggestedTitles.length === 0) {
      suggestedTitles = [
        { title: `${title} (ШОК-РЕЗУЛЬТАТ)`, type: "Интрига", ctrIncrease: "+25%" },
        { title: `Почему все молчат про ${title}?`, type: "Вопрос", ctrIncrease: "+18%" },
        { title: `3 секрета: ${title}`, type: "Факты", ctrIncrease: "+15%" }
      ];
    }

    return {
      ctrScore,
      hookStrength,
      emotion: parsed.emotion || "Любопытство",
      competitiveness: parsed.competitiveness || "Средняя",
      retentionPrediction: parsed.retentionPrediction || "Высокий потенциал вовлечения зрителей в первые секунды просмотра.",
      critique: parsed.critique || "Заголовок привлекает внимание, но его можно усилить контрастом и эмоциональным триггером.",
      suggestedTitles,
      firstLineSuggestion: parsed.firstLineSuggestion || (description ? description.slice(0, 100) : `Смотрите до конца: ключевой секрет раскрыт в этом Shorts!`),
      ctrTriggers: Array.isArray(parsed.ctrTriggers) && parsed.ctrTriggers.length > 0
        ? parsed.ctrTriggers
        : ["Используйте яркий визуальный хук в первые 1.5 секунды", "Добавьте интригующий вопрос в заголовок", "Выделите ключевое слово заглавными буквами"],
      stopWordsDetected: Array.isArray(parsed.stopWordsDetected) ? parsed.stopWordsDetected : []
    };
  } catch (error) {
    logger.warn("analyzeShortsCTR API failed, using fallback analyzer:", error);
    // Intelligent heuristic fallback
    const titleLength = title.trim().length;
    let fallbackScore = 70;
    if (titleLength >= 25 && titleLength <= 55) fallbackScore += 12;
    if (/[!?🔥⚡😱💡]/.test(title)) fallbackScore += 6;
    if (/\d+/.test(title)) fallbackScore += 4;

    return {
      ctrScore: Math.min(fallbackScore, 95),
      hookStrength: fallbackScore > 78 ? "высокая" : "средняя",
      emotion: "Любопытство и интерес",
      competitiveness: "Средняя",
      retentionPrediction: "Хороший потенциал для удержания внимания зрителей.",
      critique: `Заголовок длиной ${titleLength} символов. Рекомендуется протестировать более динамичные форматы с вопросом или интригой.`,
      suggestedTitles: [
        { title: `Секрет ${title}: о чём не говорят?`, type: "Интрига", ctrIncrease: "+22%" },
        { title: `Как ${title} меняет всё за 30 секунд`, type: "Выгода / Результат", ctrIncrease: "+19%" },
        { title: `ТОП-1 ошибка в ${title}`, type: "Предупреждение", ctrIncrease: "+15%" }
      ],
      firstLineSuggestion: description?.slice(0, 100) || `Узнайте всё самое главное про ${title} прямо сейчас!`,
      ctrTriggers: [
        "Добавьте визуальную динамику в первые секунды",
        "Сделайте акцент на необычном факте или противоречии",
        "Используйте чёткий призыв досмотреть до конца"
      ],
      stopWordsDetected: []
    };
  }
}



/**
 * Generates an optimized set of hashtags specifically for YouTube Shorts based on title and script content.
 */

export async function generateShortsHashtags(
  title: string,
  scriptText: string,
  options?: AnalysisOptions & { niche?: any; branding?: any; count?: number }
): Promise<ShortsHashtagsResult> {
  const customInst = getCustomInstructions(options, false);
  const customContext = customInst ? `\n\n🚨 ОБЯЗАТЕЛЬНЫЕ К НЕУКОСНИТЕЛЬНОМУ ИСПОЛНЕНИЮ КАСТОМНЫЕ ИНСТРУКЦИИ:\n${customInst}\n` : '';
  const nicheContext = options?.niche ? `Ниша: ${options.niche.name || ''}\nЦА: ${options.niche.targetAudience || ''}\n` : "";
  const brandContext = options?.branding ? `Бренд/Канал: ${options.branding.name || ''}\n` : "";

  const prompt = `Ты — ведущий эксперт по алгоритмам YouTube Shorts и вирусным хештегам.
Твоя задача — сгенерировать оптимальный, высокоэффективный набор релевантных хештегов для Shorts на основе его заголовка и сценария.

Заголовок Shorts: "${title || "Без названия"}"
Сценарий Shorts:
"""
${scriptText || title || "Короткое видео Shorts"}
"""

${nicheContext}${brandContext}${customContext}

Требования к хештегам:
1. Подбери от 8 до 15 целевых, высококликабельных и релевантных хештегов для YouTube Shorts.
2. Включи:
   - Базовые вирусные теги платформы Shorts (#Shorts, #YouTubeShorts, #шортс и т.д., адаптированные под язык).
   - Тематические хештеги по ключевой теме сценария и ключевым объектам/действиям.
   - Нишевые и триггерные хештеги для попадания в рекомендации нужной целевой аудитории.
3. Каждый хештег ОБЯЗАТЕЛЬНО должен начинаться со знака # (например: #Shorts, #саморазвитие, #лайфхаки).
4. Если в кастомных инструкциях пользователя указаны обязательные хештеги, каналы, псевдонимы или лимиты — ОБЯЗАТЕЛЬНО строго выполни их!
5. Составь готовую форматированную строку (formattedString), где все хештеги разделены пробелами для копирования в один клик.

ОТВЕТ ДОЛЖЕН БЫТЬ СТРОГО В ФОРМАТЕ JSON:
{
  "hashtags": ["#Shorts", "#YouTubeShorts", "#хештег1", "#хештег2", "#хештег3"],
  "formattedString": "#Shorts #YouTubeShorts #хештег1 #хештег2 #хештег3",
  "viralHashtags": ["#Shorts", "#YouTubeShorts", "#тренды"],
  "nicheHashtags": ["#ниша1", "#ниша2"],
  "topicHashtags": ["#тема1", "#тема2"],
  "explanation": "Краткое пояснение стратегии подбора хештегов под алгоритмы Shorts"
}
`;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.7-flash",
    contents: buildContents(prompt, options),
    customInstructions: options?.customInstructions,
    config: {
      temperature: 0.6,
      responseMimeType: "application/json"
    }
  });

  const text = extractTextFromResponse(response);
  const parsed = safeParseJSON<any>(text, {});

  let hashtags: string[] = [];
  const rawList = parsed.hashtags || parsed.tags || parsed.hashtag || [];
  if (Array.isArray(rawList)) {
    hashtags = rawList.map((h: any) => {
      let tag = String(h || "").trim();
      if (!tag) return "";
      if (!tag.startsWith("#")) tag = "#" + tag;
      return tag;
    }).filter(Boolean);
  } else if (typeof rawList === "string") {
    hashtags = rawList.split(/[\s,]+/).map((t: string) => {
      let tag = t.trim();
      if (!tag) return "";
      if (!tag.startsWith("#")) tag = "#" + tag;
      return tag;
    }).filter(Boolean);
  }

  // Ensure default Shorts tags if missing
  if (!hashtags.some(h => h.toLowerCase() === "#shorts")) {
    hashtags.unshift("#Shorts");
  }

  // Deduplicate case-insensitively while preserving exact casing
  const seen = new Set<string>();
  const uniqueHashtags: string[] = [];
  for (const tag of hashtags) {
    const lower = tag.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      uniqueHashtags.push(tag);
    }
  }

  const formattedString = parsed.formattedString && typeof parsed.formattedString === "string" && parsed.formattedString.includes("#")
    ? parsed.formattedString.trim()
    : uniqueHashtags.join(" ");

  return {
    hashtags: uniqueHashtags,
    formattedString,
    viralHashtags: Array.isArray(parsed.viralHashtags) ? parsed.viralHashtags.map((h: any) => String(h).startsWith("#") ? String(h) : `#${h}`) : [],
    nicheHashtags: Array.isArray(parsed.nicheHashtags) ? parsed.nicheHashtags.map((h: any) => String(h).startsWith("#") ? String(h) : `#${h}`) : [],
    topicHashtags: Array.isArray(parsed.topicHashtags) ? parsed.topicHashtags.map((h: any) => String(h).startsWith("#") ? String(h) : `#${h}`) : [],
    explanation: typeof parsed.explanation === "string" ? parsed.explanation : ""
  };
}

/**
 * Translates and optimizes a video scene's visual description into concise English search keywords for stock video APIs (Pexels).
 */