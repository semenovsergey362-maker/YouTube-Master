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
  ShortsOutlierAnalysis,
  ShortsOutlierIdea,
  ShortsOutlierGenerationResult,
  CompetitorChannel,
  CompetitorVideo,
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
import { VISUAL_DIVERSITY_RULES, CUSTOM_INSTRUCTIONS_SUPREMACY_RULE, BANNED_AI_VISUAL_CLICHES, STRICT_NO_ASSOCIATIONS_RULE } from "./visualPromptService";

/**
 * Instruction for TTS text markup for expressive voiceovers and visual captions in Shorts
 */
export const SHORTS_TTS_MARKUP_INSTRUCTION = `
ИНСТРУКЦИЯ ПО РАЗМЕТКЕ ТЕКСТА ДЛЯ ОЗВУЧКИ (TTS):
Разметка помогает ИИ-движкам озвучки воспроизводить текст более выразительно, естественно расставлять логические ударения, брать дыхание и выдерживать паузы.
- Паузы: используй (500ms) или (1s) для задания точных пауз между мыслями и предложениями.
- Логический акцент: Окружи ключевое слово звездочками *слово* для выделения логического ударения.
- Эмоция/Стиль: Теги в квадратных скобках вроде [шепот], [интригующе], [с удивлением], [уверенно], [пауза] задают настроение и подачу фразы.
- Текст на экране: Делай явную разметку, если на экране должен появляться текст, например: [ТЕКСТ НА ЭКРАНЕ: "Ключевая мысль"].
`.trim();

/**
 * Clean subscription, like and bell requests from Shorts scripts/metadata.
 */
export function removeSubscriptionCalls(text: string): string {
  if (!text) return "";
  let res = text;
  // 1. Tagged visual/sound notes for subscription, likes, bell
  res = res.replace(/\[(?:ЭФФЕКТ|АНИМАЦИЯ|КАДР|ВИЗУАЛ|ЗВУК|ДИКТОР|AUDIO|SFX|PROMPT):[^\s\]]*\s*[^\]]*(?:кнопка\s+подписки|подписк[а-я]|колокольчик|подпишись|подписывайся|лайк|subscribe|bell)[^\]]*\]/gi, "");
  
  // 2. Direct sentences with subscribe / like / bell calls (Russian)
  res = res.replace(/(?:\[[^\]]*\]\s*)?[^.!?\n]*?(?:подпишись|подпишитесь|подписывайся|подписывайтесь|подписка|подписку|подписки)[^.!?\n]*(?:на\s+(?:наш\s+|мой\s+)?канал|кнопк|колокольчик|видео|обновлен|чтобы\s+не\s+пропустить|буду\s+рад|жду)?[^.!?\n]*[.!?]?/gi, "");
  res = res.replace(/(?:\[[^\]]*\]\s*)?[^.!?\n]*?(?:ставьте|ставь|поставь|поставьте|жми|жмите|нажми|нажмите)\s+(?:лайк|лайки|сердечко|колокольчик|подписаться)[^.!?\n]*[.!?]?/gi, "");
  res = res.replace(/(?:\[[^\]]*\]\s*)?[^.!?\n]*?(?:не\s+забудь(?:те)?\s+(?:поставить\s+лайк|подписаться|нажать\s+на\s+колокольчик))[^.!?\n]*[.!?]?/gi, "");
  res = res.replace(/(?:\[[^\]]*\]\s*)?[^.!?\n]*?(?:лайк\s+и\s+подписк[а-я]|подписк[а-я]\s+и\s+лайк)[^.!?\n]*[.!?]?/gi, "");

  // 3. English subscribe / like calls
  res = res.replace(/(?:\[[^\]]*\]\s*)?[^.!?\n]*?(?:subscribe|subscribing|hit\s+the\s+bell|leave\s+a\s+like|don't\s+forget\s+to\s+subscribe)[^.!?\n]*[.!?]?/gi, "");

  // 4. Standalone phrases
  res = res.replace(/\b(?:подпишись|подпишитесь|подписывайтесь|подписывайся)\b[!.,]?/gi, "");
  res = res.replace(/\b(?:subscribe|sub)\b[!.,]?/gi, "");

  // 5. Clean up hanging empty pauses or extra newlines
  res = res.replace(/\[пауза\]\s*(?:\[пауза\]\s*)+/gi, "[пауза]\n");
  res = res.replace(/[ \t]+/g, " ");
  res = res.replace(/\n\s*\n\s*\n+/g, "\n\n").trim();
  return res;
}

/**
 * Check if text already contains a call or mention of the main/related video.
 */
export function hasRelatedVideoCall(text: string): boolean {
  if (!text) return false;
  return /(?:связанн[а-я]*\s+видео|основн[а-я]*\s+видео|полн[а-я]*\s+(?:разбор|видео|верси[а-я]|ролик)|длинн[а-я]*\s+видео|видео\s+внизу|ссылк[а-я]*\s+(?:внизу|в\s+описании|в\s+связанном|под\s+роликом)|смотреть\s+полн|переходи\s+на\s+(?:полное|основное)|упоминани[ея]\s+(?:основного|связанного)\s+видео|related\s*video)/i.test(text || "");
}

/**
 * Post-processing enforcement of custom rules on a single Shorts item.
 * Guarantees that forbidden subscription pleas are stripped and the mandatory
 * reference to the main/related video is properly inserted into the script and CTA.
 */
export function enforceCustomRulesOnShortsItem(
  item: CutShortItem,
  customInstructionsText?: string
): CutShortItem {
  const effectiveRules = (customInstructionsText && customInstructionsText.trim()) 
    ? customInstructionsText.trim() 
    : getActiveCustomInstructionsText();

  if (!effectiveRules) return item;

  // 1. Check if subscribe call is explicitly forbidden in rules
  const forbidsSubscription = /(?:запрещ[а-я]*\s*(?:призыв[а-я]*)?\s*(?:к\s*)?подпис|без\s+подпис|не\s+(?:просить|призывать|требовать|добавлять|использовать).*(?:подпис|лайк)|никаких\s+подпис|отсутств[а-я]*\s+призыв[а-я]*\s+к\s+подпис|убрать\s+подпис|без\s+призывов\s+к\s+подпис)/i.test(effectiveRules);

  // 2. Check hook rule (forbid starting with greeting)
  const forbidsGreetingHook = /(?:мастер\s+хуков|запрещено.*начинать.*привет|без.*привет|hook_master)/i.test(effectiveRules);

  let cleanScript = item.script || "";
  let cleanHook = item.hook || "";

  // Strip greetings from hook if rule active
  if (forbidsGreetingHook) {
    cleanHook = cleanHook.replace(/^(?:\[[^\]]*\]\s*)?(?:Привет|Здравствуйте|Всем привет|Приветствую|В этом видео|В этом ролике)[,!\.\s—-]+/i, "").trim();
    cleanScript = cleanScript.replace(/^(?:\[[^\]]*\]\s*)?(?:Привет|Здравствуйте|Всем привет|Приветствую|В этом видео|В этом ролике)[,!\.\s—-]+/i, "").trim();
  }

  // Strip subscription CTA if forbidden
  if (forbidsSubscription) {
    cleanScript = removeSubscriptionCalls(cleanScript);
    cleanHook = removeSubscriptionCalls(cleanHook);
  }

  // Handle loopEnding if present
  let cleanLoopEnding = item.loopEnding ? { ...item.loopEnding } : undefined;
  if (cleanLoopEnding && forbidsSubscription) {
    cleanLoopEnding.loopedFullScript = removeSubscriptionCalls(cleanLoopEnding.loopedFullScript);
    cleanLoopEnding.loopEndingPhrase = removeSubscriptionCalls(cleanLoopEnding.loopEndingPhrase);
  }

  // Handle SEO if present
  const cleanSeo = item.seo ? enforceCustomRulesOnShortsSEO(item.seo, effectiveRules) : undefined;

  return {
    ...item,
    hook: cleanHook,
    script: cleanScript,
    loopEnding: cleanLoopEnding,
    seo: cleanSeo
  };
}

/**
 * Formats a Shorts SEO description with clean, readable paragraph breaks (\n\n)
 * so it never renders as an unreadable monolithic wall of text.
 */
export function formatShortsDescriptionWithParagraphs(text: string): string {
  if (!text) return "";
  let cleaned = text.trim();

  // If already cleanly formatted with 3+ paragraphs separated by double newlines, normalize spacing
  const existingParagraphs = cleaned
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (existingParagraphs.length >= 3) {
    return existingParagraphs.join("\n\n");
  }

  // If it was formatted with single newlines, split them
  const singleLines = cleaned
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (singleLines.length >= 3) {
    return singleLines.join("\n\n");
  }

  // If it's a monolithic block of text, split by emoji markers or key structural headers
  const emojiSplitPattern = /(?=[📌💡🎬🔍🚀❓💬🎯🔥✨👇⚡▶️⭐•—])/u;
  const emojiBlocks = cleaned
    .split(emojiSplitPattern)
    .map((b) => b.trim())
    .filter(Boolean);

  if (emojiBlocks.length >= 3) {
    return emojiBlocks.join("\n\n");
  }

  // Fallback: group sentences into readable paragraphs of ~250-400 characters
  const sentences = cleaned.match(/[^.!?]+[.!?]+(?:\s+|$)/g) || [cleaned];
  const paragraphs: string[] = [];
  let currentP = "";

  for (const s of sentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    if (!currentP) {
      currentP = trimmed;
    } else if (currentP.length + trimmed.length > 350) {
      paragraphs.push(currentP);
      currentP = trimmed;
    } else {
      currentP += " " + trimmed;
    }
  }
  if (currentP) {
    paragraphs.push(currentP);
  }

  return paragraphs.length > 0 ? paragraphs.join("\n\n") : cleaned;
}

/**
 * Removes mentions of playlists and specific main/full/related videos from Shorts descriptions and comments,
 * ensuring clean, generalized channel mentions instead.
 */
export function removePlaylistAndMainVideoMentionsFromShorts(text: string): string {
  if (!text) return "";
  let res = text;

  // 1. Remove raw playlist placeholders & mentions
  res = res.replace(/\[?ССЫЛКА\s+НА\s+(?:ТЕМАТИЧЕСКИЙ\s+)?ПЛЕЙЛИСТ\]?/gi, "");
  res = res.replace(/\[?ССЫЛКА\s+НА\s+(?:ПОЛНОЕ|ОСНОВНОЕ|СВЯЗАННОЕ|ДЛИННОЕ)\s+ВИДЕО\]?/gi, "");
  res = res.replace(/(?:Все\s+видео\s+по\s+теме|Смотрите\s+все\s+выпуски|Серия\s+роликов)[^\n.!?]*в\s+плейлисте[^\n.!?]*[.!?:]?/gi, "");
  res = res.replace(/(?:Ссылка\s+на|Смотрите\s+в)\s+(?:тематический\s+)?плейлист[^\n.!?]*[.!?:]?/gi, "");
  res = res.replace(/(?:в|из|наш(?:ем)?)\s+плейлист[а-я]*[^\n.!?]*[.!?:]?/gi, "");
  res = res.replace(/\b(?:плейлист[а-я]*|playlist)\b\s*:[^\n.!?]*[.!?:]?/gi, "");

  // 2. Remove references to main/long/related videos
  res = res.replace(/(?:🎬\s*)?(?:Полный\s+разбор\s+и\s+подробности\s+смотрите\s+в\s+основном\s+видео\s+на\s+канале[^\n.!?]*[.!?:]?)/gi, "");
  res = res.replace(/(?:👇\s*)?(?:Полный\s+разбор\s+этой\s+темы\s+смотрите\s+в\s+связанном\s+видео[^\n.!?]*[.!?:]?)/gi, "");
  res = res.replace(/(?:смотрите|смотри|переходите|переходи)\s+(?:в|на)\s+(?:основн[а-я]*|полн[а-я]*|связанн[а-я]*|длинн[а-я]*)\s+видео[^\n.!?]*[.!?:]?/gi, "");
  res = res.replace(/полн(?:ый|ую|ое)\s+(?:разбор|версию|видео)\s+(?:этой\s+темы\s+)?смотри(?:те)?\s+(?:в\s+)?(?:связанном|основном|длинном)\s+видео[^\n.!?]*[.!?:]?/gi, "");
  res = res.replace(/(?:ссылка\s+на|разбор\s+в)\s+(?:основн[а-я]*|полн[а-я]*|связанн[а-я]*|длинн[а-я]*)\s+видео[^\n.!?]*[.!?:]?/gi, "");
  res = res.replace(/\(ссылка\s+внизу\s+shorts\)/gi, "");
  res = res.replace(/\(ссылка\s+под\s+роликом\)/gi, "");

  // 3. Clean up hanging empty emojis or orphan punctuation
  res = res.replace(/(?:🎬|👇|▶️|🔗)\s*(?=\n|$)/g, "");
  res = res.replace(/[ \t]+/g, " ");
  res = res.replace(/\n\s*\n\s*\n+/g, "\n\n").trim();

  return res;
}

/**
 * Post-processing enforcement of custom rules on Shorts SEO metadata.
 */
export function enforceCustomRulesOnShortsSEO(
  seo: ShortsSEO,
  customInstructionsText?: string
): ShortsSEO {
  const effectiveRules = (customInstructionsText && customInstructionsText.trim()) 
    ? customInstructionsText.trim() 
    : getActiveCustomInstructionsText();

  if (!seo) return seo;

  const forbidsSubscription = /(?:запрещ[а-я]*\s*(?:призыв[а-я]*)?\s*(?:к\s*)?подпис|без\s+подпис|не\s+(?:просить|призывать|требовать|добавлять|использовать).*(?:подпис|лайк)|никаких\s+подпис|отсутств[а-я]*\s+призыв[а-я]*\s+к\s+подпис|убрать\s+подпис|без\s+призывов\s+к\s+подпис)/i.test(effectiveRules || "");

  let desc = seo.description || "";
  let pinned = seo.pinnedComment || "";

  if (forbidsSubscription) {
    desc = removeSubscriptionCalls(desc);
    pinned = removeSubscriptionCalls(pinned);
  }

  // Always sanitize Shorts description and pinned comment from playlist & specific main video references
  desc = removePlaylistAndMainVideoMentionsFromShorts(desc);
  pinned = removePlaylistAndMainVideoMentionsFromShorts(pinned);

  // Ensure generalized channel mention if missing
  if (desc && !/(?:на\s+(?:нашем\s+)?канале|наш\s+канал|на\s+канале)/i.test(desc)) {
    desc = `${desc.trim()}\n\n📢 Больше интересных фактов, разборов и полезного контента смотрите на нашем канале!`.trim();
  }

  desc = formatShortsDescriptionWithParagraphs(desc);

  return {
    ...seo,
    description: desc,
    pinnedComment: pinned,
  };
}

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
    model: options?.model || "gemini-3.1-flash-lite",
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
  - hookText: Полный текст хука (первые 3-5 секунд, максимально цепляющий) с разметкой для озвучки TTS (*слово* для ударения, (500ms)/(1s) для пауз, [интригующе] для эмоции)
  - bodyText: Основная часть Shorts (компактная, энергичная, передающая ключевую суть длинного сценария, адаптированная под TTS с разметкой пауз, ударений и пометками [ТЕКСТ НА ЭКРАНЕ: "..."])
  - callToAction: Сильный призыв к действию в конце (для подписки, комментария, сохранения или досмотра)
  - estimatedDuration: Примерная длительность (например, "40-45 сек")
  - whyItWorks: Обоснование, почему этот тип хука и структура удержат внимание зрителя до конца
  
  ВЕРНИТЕ ТОЛЬКО JSON массив из 3 объектов, соответствующих схеме. Все тексты пишите на русском языке.`;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.1-flash-lite",
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

  const outlierIdeasText = Array.isArray(options?.outlierIdeas) && options.outlierIdeas.length > 0
    ? options.outlierIdeas.map((i: any, idx: number) => `   ${idx + 1}. "${i.title}"${i.hook ? ` (Хук: "${i.hook}")` : ""}`).join("\n")
    : (options?.nextIdeaTitle ? `   1. "${options.nextIdeaTitle}"` : "");

  const nextIdeasAnnouncementRule = outlierIdeasText
    ? `\n\nТРЕБОВАНИЕ К ФИНАЛУ КАЖДОГО СЦЕНАРИЯ (АНОНС СЛЕДУЮЩЕГО ВИДЕО ИЗ ВКЛАДКИ ИДЕИ):
- В конце сценария Shorts (в финальной фразе / кадре) органично сделай анонс следующей темы из списка идей!
- Доступные темы из вкладки «Идеи»:
${outlierIdeasText}`
    : "";

  const prompt = `
Анализируй следующий длинный сценарий (Long-Form) и выдели из него от 3 до 5 самых острых, вирусных и интересных мыслей. Не просто нарезай текст на куски, а сгенерируй на основе этих мыслей полноценные, глубоко раскрытые темы в виде готовых сценариев для Shorts / Reels. Длительность каждого ролика должна быть НЕ МЕНЕЕ ОДНОЙ МИНУТЫ (от 60 до 90 секунд).
${instructionsContext}${nextIdeasAnnouncementRule}
Для каждого Shorts выполни:
1. Выдели сильный вовлекающий хук (первые 3 секунды), который зацепит зрителя.
2. Сгенерируй полноценный сценарий, который детально раскрывает тему.
3. РАЗМЕТКА ТЕКСТА ДЛЯ ОЗВУЧКИ (TTS):
   - Паузы: используй (500ms) или (1s) для задания точных пауз между мыслями и предложениями.
   - Логический акцент: Окружи ключевое слово звездочками *слово* для выделения логического ударения.
   - Эмоция/Стиль: Теги вроде [шепот], [интригующе], [с удивлением], [уверенно], [пауза] задают настроение фразы.
   - Текст на экране: Делай явную разметку, если на экране должен появляться текст ([ТЕКСТ НА ЭКРАНЕ: "..."]).
4. Адаптируй текст под динамичный вертикальный формат (9:16): добавь пометки для визуального монтажа (например, [ЭФФЕКТ: ...], [КАДР: ...], [ЗВУК: ...]).
5. В ФИНАЛЕ каждого сценария обязательно анонсируй следующее видео из списка идей!
6. Рассчитай хронометраж, чтобы он был от 60 секунд.

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
      "script": "Полный текст сценария Shorts (от 1 минуты) с интонациями, акцентами, пометками для монтажа и анонсом следующего видео из идей в конце",
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
      model: options?.model || "gemini-3.1-flash-lite",
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
      model: options?.model || "gemini-3.1-flash-lite",
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

  // Post-process enforcement of channel custom rules (e.g. related video CTA, no subscribe plea)
  normalized = normalized.map((item) => enforceCustomRulesOnShortsItem(item, customInst));

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
    model: options?.model || "gemini-3.1-flash-lite",
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
  const customInst = getActiveCustomInstructionsText(options?.customInstructions);
  const instructionsContext = customInst ? `\n\nОБЯЗАТЕЛЬНЫЕ К НЕУКОСНИТЕЛЬНОМУ ИСПОЛНЕНИЮ КАСТОМНЫЕ ИНСТРУКЦИИ КАНАЛА:\n${customInst}\n` : '';

  const recs = analysis?.keyRecommendations?.length 
    ? analysis.keyRecommendations.join("\n- ") 
    : "Ликвидировать точки проседания, повысить динамику речи, разбить сплошной текст на короткие акцентные фразы, добавить пометки для эмоций и интонаций";
  
  const dropOffs = analysis?.dropOffRisks?.length
    ? analysis.dropOffRisks.join("\n- ")
    : "Падение удержания в середине из-за затянутого разбора";

  const prompt = `
Ты — шеф-редактор и сценарист вирусных Shorts / Reels с миллионными охватами.
Твоя задача — ПЕРЕРАБОТАТЬ И ОПТИМИЗИРОВАТЬ следующий сценарий Shorts, ВНЕДРИВ ВСЕ РЕКОМЕНДАЦИИ по удержанию темы и ПОЛНОСТЬЮ УСТРАНИВ точки проседания внимания.
${instructionsContext}

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
2. Ликвидируй лишнюю воду, затянутые фразы и неловкие паузы.
3. СОХРАНЯЙ АВТОРСКИЙ ФИНАЛ И ПРИЗЫВ (CTA): Сохраняй авторскую концовку сценария и призыв к действию (название канала, финальный вопрос или авторскую фразу). КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО заменять авторскую концовку на шаблонные призывы о "связанном видео внизу", если этого явно нет в исходном тексте!
4. РАЗМЕТКА ТЕКСТА ДЛЯ ОЗВУЧКИ (TTS):
   - Паузы: (500ms) или (1s) для задания точных пауз.
   - Логический акцент: Окружай ключевые слова звездочками *слово* для логического ударения.
   - Эмоция/Стиль: Используй теги вроде [шепот], [интригующе], [с удивлением], [уверенно], [пауза] для задания настроения фразы.
   - Текст на экране: Делай разметку, если на экране должен появляться текст ([ТЕКСТ НА ЭКРАНЕ: "..."]).
5. Оформи пометки для динамичного 9:16 видеорядов: [ЭФФЕКТ: ...], [КАДР: ...], [ЗВУК: ...].
6. Выдай полный готовый переработанный текст и детальный список внесенных изменений.

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
    model: options?.model || "gemini-3.1-flash-lite",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json"
    }
  });

  const resText = extractTextFromResponse(response);
  const parsed = tryRepairJSON<OptimizedShortsScriptResult>(resText);

  if (customInst && parsed?.optimizedScript) {
    const dummyItem: CutShortItem = {
      title: title || "Shorts",
      hook: parsed.optimizedHook || "",
      script: parsed.optimizedScript,
      viral_potential: "",
      duration: ""
    };
    const enforced = enforceCustomRulesOnShortsItem(dummyItem, customInst);
    parsed.optimizedScript = enforced.script;
    if (enforced.hook) parsed.optimizedHook = enforced.hook;
  }

  return parsed;
}




export async function generateSeamlessLoopEnding(
  scriptText: string,
  options?: any
): Promise<LoopEndingResult> {
  const customInst = getActiveCustomInstructionsText(options?.customInstructions);
  const instructionsContext = customInst ? `\n\nОБЯЗАТЕЛЬНЫЕ К НЕУКОСНИТЕЛЬНОМУ ИСПОЛНЕНИЮ КАСТОМНЫЕ ИНСТРУКЦИИ КАНАЛА:\n${customInst}\n` : '';

  const wantsRelatedVideo = /(?:отсылк[а-я]*\s*(?:на|к)?\s*(?:видео|ролик)|связанн[а-я]*\s*видео|основн[а-я]*\s*видео|полн[а-я]*\s*видео|длинн[а-я]*\s*видео|related\s*video|посмотреть\s+полное\s+видео|перейти\s+на\s+длинное|упоминани[ея]\s+основного\s+видео|упоминани[ея]\s+связанного\s+видео|shorts_link)/i.test(customInst || "");
  const forbidsSubscription = wantsRelatedVideo || /(?:запрещ[а-я]*\s*(?:призыв[а-я]*)?\s*(?:к\s*)?подпис|без\s+подпис|не\s+(?:просить|призывать|требовать|добавлять|использовать).*(?:подпис|лайк)|никаких\s+подпис|отсутств[а-я]*\s+призыв[а-я]*\s+к\s+подпис)/i.test(customInst || "");

  const ctaRule = wantsRelatedVideo
    ? `\nКРИТИЧЕСКИ ВАЖНО (ПРАВИЛО КАНАЛА ДЛЯ ФИНАЛА РОЛИКА):\n- Перед переходной зацикленной фразой диктор ОБЯЗАТЕЛЬНО произносит отсылку к полному видео.\n- СТРОГО ЗАПРЕЩЕНЫ призывы подписаться на канал ("подпишись", "лайк" и т.п.)!`
    : forbidsSubscription
    ? `\nКРИТИЧЕСКИ ВАЖНО (ПРАВИЛО КАНАЛА):\n- СТРОГО ЗАПРЕЩЕНЫ призывы подписаться на канал или ставить лайк!`
    : "";

  const prompt = `
Создай бесшовную зацикленную концовку (Seamless Loop Ending) для этого сценария Shorts.
Цель: Последняя фраза сценария должна грамматически, семантически и интонационно плавно перетекать в самую первую фразу (начиная с первого слова), создавая иллюзию бесконечного видео.
${instructionsContext}${ctaRule}

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
    model: options?.model || "gemini-3.1-flash-lite",
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
  const parsed = tryRepairJSON<LoopEndingResult>(resText);

  if (customInst && parsed?.loopedFullScript) {
    const dummyItem: CutShortItem = {
      title: "Shorts",
      hook: "",
      script: scriptText,
      viral_potential: "",
      duration: "",
      loopEnding: parsed
    };
    const enforced = enforceCustomRulesOnShortsItem(dummyItem, customInst);
    if (enforced.loopEnding) {
      return enforced.loopEnding;
    }
  }

  return parsed;
}




export function stripTechnicalRemarksFromScript(text: string): string {
  if (!text) return "";
  let cleaned = text;

  // 1. Удаляем все блоки в квадратных, фигурных и угловых скобках
  cleaned = cleaned.replace(/\[[^\]]*\]/g, " ");
  cleaned = cleaned.replace(/\{[^}]*\}/g, " ");
  cleaned = cleaned.replace(/<[^>]*>/g, " ");

  // 2. Удаляем круглые скобки с техническими директивами, ремарками, эмоциями, таймкодами
  cleaned = cleaned.replace(
    /\(\s*(?:интонация|эмоция|подача|акцент|настроение|темп|действие|звук|музыка|эффект|ремарка|кадр|сцена|персонаж|диктор|ведущий|голос|автор|спикер|пауза|паузы|смех|смеётся|вздох|вздыхает|шепот|шепотом|тихо|громко|улыбается|визуал|визуальный|анимация|текст|надпись|экран|камера|b-roll|б-ролл|sfx|\d+(?:\.\d+)?\s*(?:ms|мс|s|сек|с|мин|минут[а-я]*)|0:\d+|\d+:\d+)[^)]*\)/gi,
    " "
  );
  cleaned = cleaned.replace(/\(\s*\d+(?::\d+)?\s*(?:-\s*\d+(?::\d+)?)?\s*(?:сек|с|sec|s)?\s*\)/gi, " ");

  // 3. Построчная отфильтровка чисто технических строк и префиксов
  const lines = cleaned.split(/\r?\n/);
  const filteredLines = lines.map((line) => {
    let l = line.trim();
    if (!l) return "";

    l = l.replace(/^#+\s+/g, "");

    if (
      /^(?:визуальный\s+ряд|визуал|visuals?|видеоряд|видео|камера|план|анимация|графика)\s*:\s*/i.test(l) ||
      /^(?:текст\s+на\s+экране|текст|надпись|экран|screen\s+text|overlay\s+text|subtitle)\s*:\s*/i.test(l) ||
      /^(?:звуковые?\s+эффекты|звук|sfx|audio|музыка|фонограмма)\s*:\s*/i.test(l) ||
      /^(?:b-roll|б-ролл|доп\.?\s*материал)\s*:\s*/i.test(l) ||
      /^(?:ремарка|примечание|инструкция|монтаж)\s*:\s*/i.test(l) ||
      /^(?:сцена|scene|кадр|shot|блок|фрагмент)\s*\d+[^:\n]*:\s*$/i.test(l)
    ) {
      return "";
    }

    l = l.replace(/^(?:закадровый\s+голос|диктор|ведущий|голос\s+за\s+кадром|спикер|автор|voiceover|narrator|speaker|host)\s*:\s*/gi, "");

    if (/^(?:\[?\s*\d{1,2}:\d{2}\s*(?:-\s*\d{1,2}:\d{2})?\s*\]?|сцена\s*\d+|кадр\s*\d+|scene\s*\d+|shot\s*\d+)\s*$/i.test(l)) {
      return "";
    }

    return l;
  }).filter(Boolean);

  cleaned = filteredLines.join(" ");

  cleaned = cleaned
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || text.trim();
}

export async function generateShortsVisualsAndMusic(
  scriptText: string,
  options?: AnalysisOptions
): Promise<{ visuals: { text: string; prompt: string; shotType?: string; cameraMovement?: string; duration?: number }[]; musicPrompt: string }> {
  const customInst = getCustomInstructions(options, true);
  const instructionsContext = customInst ? `\n\nОБЯЗАТЕЛЬНЫЕ К НЕУКОСНИТЕЛЬНОМУ ИСПОЛНЕНИЮ КАСТОМНЫЕ ИНСТРУКЦИИ:\n${customInst}\n` : '';

  const isSfxDisabled = options?.veoSfxEnabled === false || 
    (customInst && (customInst.toLowerCase().includes("без звука") || customInst.toLowerCase().includes("без сфх") || customInst.toLowerCase().includes("без sfx") || customInst.toLowerCase().includes("no sound") || customInst.toLowerCase().includes("no sfx")));

  const veoSfxPromptText = isSfxDisabled
    ? `\nТРЕБОВАНИЕ К ЗВУКУ (SFX): Звуки отключены пользователем — КАТЕГОРИЧЕСКИ НЕ ДОБАВЛЯЙ фраз о звуке (accompanied by natural sound / with sound of...) в промпты!`
    : `\nОБЯЗАТЕЛЬНОЕ ТРЕБОВАНИЕ ДЛЯ ЗВУКОВЫХ ЭФФЕКТОВ В VEO 3 (VEO SFX):
Для КАЖДОЙ сцены в визуальном промпте ты ДОЛЖЕН интегрировать подходящие звуки (SFX) прямо в текст промпта на английском языке.
- Опиши эти звуковые эффекты в конце каждого промпта на английском языке в ЕСТЕСТВЕННОЙ И ПРЯМОЙ повествовательной форме БЕЗ каких-либо квадратных скобок, БЕЗ мета-тегов "[Audio...]" и БЕЗ упоминаний вроде "no background music" или "silence".
- Вместо этого завершай промпт красивой, естественной фразой, описывающей то, что звучит на видео, например: "accompanied by the natural high-fidelity sound of <описание звуков на английском>, featuring rich acoustic details and crisp foley effects." или "with highly realistic sound of <описание звуков>, capturing detailed acoustic textures."
- Текст звука должен быть органично вплетен в финал английского промпта без каких-либо скобок.`;

  const shortsAntiRepeatRules = `
ПРАВИЛА ИСКЛЮЧЕНИЯ ПОВТОРОВ ДЛЯ SHORTS (КАЖДЫЙ КАДР ДОЛЖЕН БЫТЬ УНИКАЛЬНЫМ):
1. СТРОГАЯ РОТАЦИЯ КАМЕРЫ (КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать одинаковое движение камеры в соседних сценах!):
   - Чередуй 5 паттернов: Dolly-in (наезд), Orbital (облет дугой), Pull-back (отъезд), Rack focus (перевод фокуса), Pan (горизонтальная панорама).
   - Если в Сцене 1 был Dolly-in, в Сцене 2 ОБЯЗАН быть Orbital или Pan или Pull-back! НИКАКИХ двух Dolly-in подряд!
2. РОТАЦИЯ ПЛАНОВ:
   - Чередуй крупность: Close-Up (лицо/эмоция), Medium Shot (действие/фигура), Macro Detail (руки/глаза/предмет), Wide Establishing (силуэт/масштаб локации).
3. ЗАПРЕТ ШАБЛОННОЙ МИКРОДИНАМИКИ (КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО копировать "drifting dust motes in sunlight" во все сцены!):
   - В каждой сцене используй УНИКАЛЬНУЮ деталь окружения: капли дождя, пар дыхания на холодном воздухе, трепет пламени свечи, рябь на воде, тени от листвы, развевающийся край плаща, крупицы сухого песка, искры костра, капли пота на виске.
4. УНИКАЛЬНЫЙ ЗВУК FOLEY:
   - Для каждой сцены пропиши уникальный аутентичный звук под действие именно этой сцены, без повторений.
5. ДВА РАЗНЫХ РАКУРСА В КАЖДОЙ СЦЕНЕ (videoPrompt1 и videoPrompt2 НЕ ДОЛЖНЫ БЫТЬ ОДИНАКОВЫМИ):
   - videoPrompt1 (Ракурс 1): Основной план (действие, взгляд, ключевое движение сцены).
   - videoPrompt2 (Ракурс 2): КОНТРАСТНЫЙ АЛЬТЕРНАТИВНЫЙ РАКУРС той же сцены (например, если Ракурс 1 — лицо крупным планом с Dolly-in, то Ракурс 2 — макро-деталь рук или силуэт со спины с Orbital облётом). ЗАПРЕЩЕНО копировать текст из videoPrompt1 в videoPrompt2!
6. Самопроверка: убедись, что ни движения камеры, ни микродинамики, ни ракурсы не повторяются!`;

  const voiceoverScriptText = stripTechnicalRemarksFromScript(scriptText);

  const prompt = `Ты — ведущий арт-директор и кинорежиссер вертикальных видео 9:16 (YouTube Shorts / Reels). Тебе передан сценарий:
  
"${voiceoverScriptText}"

${STRICT_NO_ASSOCIATIONS_RULE}
${CUSTOM_INSTRUCTIONS_SUPREMACY_RULE}
${BANNED_AI_VISUAL_CLICHES}

Твоя задача:
1. ПОЛНОСТЬЮ разбить ВЕСЬ текст сценария от первого до последнего слова на смысловые сцены. Ты не имеешь права выкидывать или сокращать фразы.
2. Хронометраж КАЖДОЙ сцены ДОЛЖЕН БЫТЬ ОТ 4 ДО 7 СЕКУНД. НИ ОДНА сцена не может быть короче 4 секунд. Ориентир для русской речи: примерно 2.3-3.0 слова в секунду. Если отдельная фраза короче 4 секунд, ОБЯЗАТЕЛЬНО объединяй её со следующей смысловой фразой, сохраняя исходный текст БЕЗ изменений.
2а. ЖЁСТКИЙ ПОТОЛОК: в ответе НЕ ДОЛЖНО быть больше 20 сцен, ни при каких обстоятельствах. Для типичного Shorts на 50-70 секунд должно получиться 8-14 сцен.
3. Для каждой сцены написать ДВА РАЗНЫХ кинематографичных визуальных промпта на английском языке для генерации вертикального видео (9:16):
   - videoPrompt1 (Ракурс 1): Главный план сцены. Оптика 8K 35mm lens, движение камеры (строго одно из 5), буквальное действие из строки сценария, физическая эмоция лица (не faceless), негативный якорь, уникальная микродинамика, уникальный звук Foley.
   - videoPrompt2 (Ракурс 2): Альтернативный контрастный ракурс той же сцены (контр-план, макро-деталь или иной масштаб) с ДРУГИМ движением камеры и ДРУГОЙ оптикой.
   - prompt: строка, совпадающая с videoPrompt1 (для совместимости).
4. Каждая сцена обязана содержать краткие поля "shotType" (например "Close-Up", "Medium Shot", "Macro Detail") и "cameraMovement" (например "Dolly-in", "Orbital", "Pull-back", "Rack focus", "Pan").
5. Написать ОДИН детальный музыкальный промпт для всего Shorts (ДО 1000 СИМВОЛОВ) на английском языке для Suno/Udio: стиль, инструментал и драматургия трека подбираются индивидуально под сюжетную и эмоциональную арку этого сценария (оркестр, неоклассика, этника, фолк, минимализм), с ОБЯЗАТЕЛЬНЫМ явным указанием тональности (Key: ...) и темпа (Tempo: ... BPM), структура пригодна для монтажа, без резких скачков громкости.

${veoSfxPromptText}
${VISUAL_DIVERSITY_RULES}
${shortsAntiRepeatRules}
${instructionsContext}

Формат ответа СТРОГО JSON:
{
  "visuals": [
    {
      "text": "Полная фраза из сценария (текст без изменений)",
      "shotType": "Close-Up / Medium / Macro / Wide",
      "cameraMovement": "Dolly-in / Orbital / Pull-back / Rack focus / Pan",
      "videoPrompt1": "Ultra-realistic, 8K, 35mm lens, cinematic lighting, Hollywood color grading. Camera: slow [movement] towards [action], [facial emotion]. No 3D look. Slow-motion 0.7x, micro-dynamics of [unique environment detail]. Natural high-fidelity sound: [unique foley 1, foley 2].",
      "videoPrompt2": "Ultra-realistic, 8K, 85mm portrait lens, dramatic rim lighting. Camera: [different movement] focusing on [contrasting detail/counter-angle]. No 3D look. Slow-motion 0.7x, micro-dynamics of [different environment detail]. Natural high-fidelity sound: [unique foley].",
      "prompt": "дубликат videoPrompt1",
      "duration": 5.5
    }
  ],
  "musicPrompt": "Deep atmospheric cinematic soundscape with brooding cello, pulse percussion, 432Hz ambient pads..."
}`;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.1-flash-lite",
    contents: buildContents(prompt, options),
    customInstructions: customInst,
    options,
    config: {
      temperature: 0.9,
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
                videoPrompt1: { type: Type.STRING },
                videoPrompt2: { type: Type.STRING },
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
  
  let parsedResult: { visuals: { text: string; prompt: string; videoPrompt1?: string; videoPrompt2?: string; shotType?: string; cameraMovement?: string; duration?: number }[]; musicPrompt: string };
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
    const voiceoverText = stripTechnicalRemarksFromScript(text);
    const words = voiceoverText.split(/\s+/).filter(Boolean).length;
    return Math.max(0.1, words / WORDS_PER_SECOND);
  };

  // Pre-clean scenes from Gemini to remove bracket tags, technical remarks, and filter out zero-speech scenes
  parsedResult.visuals = (parsedResult.visuals || [])
    .map(v => ({
      ...v,
      text: stripTechnicalRemarksFromScript(v.text || "")
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
        model: options?.model || "gemini-3.1-flash-lite",
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
  const effectiveCustom = (options?.customInstructions && String(options.customInstructions).trim()) 
    || (customInst && customInst.trim()) 
    || getActiveCustomInstructionsText();

  const forbidsSubscription = /(?:запрещ[а-я]*\s*(?:призыв[а-я]*)?\s*(?:к\s*)?подпис|без\s+подпис|не\s+(?:просить|призывать|требовать|добавлять|использовать).*(?:подпис|лайк)|никаких\s+подпис|отсутств[а-я]*\s+призыв[а-я]*\s+к\s+подпис|убрать\s+подпис|без\s+призывов\s+к\s+подпис)/i.test(effectiveCustom || "");

  const ctaSeoRule = forbidsSubscription
    ? `\n\nКРИТИЧЕСКИ ВАЖНЫЕ ПРАВИЛА КАНАЛА:\n- СТРОЖАЙШЕ ЗАПРЕЩЕНО добавлять любые призывы подписаться на канал или ставить лайк в описании и закрепленном комментарии! Используй обобщенное вовлекающее упоминание канала.`
    : `\n\nПРАВИЛА УПОМИНАНИЯ КАНАЛА:\n- В описании и закрепленном комментарии используй обобщенное упоминание канала (например: "📢 Больше интересных разборов и фактов смотрите на нашем канале!").\n- КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО упоминать плейлисты или ссылаться на конкретные основные/длинные видео (их может не быть на канале)!`;

  const customContext = effectiveCustom ? `\n\nОБЯЗАТЕЛЬНЫЕ К НЕУКОСНИТЕЛЬНОМУ ИСПОЛНЕНИЮ КАСТОМНЫЕ ИНСТРУКЦИИ:\n${effectiveCustom}\n` : '';
  const nicheContext = options?.niche ? `Ниша: ${options.niche.name}\nЦА: ${options.niche.targetAudience}\n` : "";
  const brandContext = options?.branding ? `Бренд: ${options.branding.name}\n` : "";
  
  const pinnedRequirement = forbidsSubscription
    ? "5. Напиши текст для закрепленного комментария (pinnedComment), стимулирующий обсуждение темы с обобщенным упоминанием канала (СТРОГО БЕЗ упоминания плейлистов, БЕЗ отсылок к основному видео и БЕЗ призывов подписаться или ставить лайк)."
    : "5. Напиши текст для закрепленного комментария (pinnedComment), стимулирующий обсуждение темы с обобщенным упоминанием канала (СТРОГО БЕЗ упоминания плейлистов и без отсылок к конкретному основному видео).";

  const prompt = `Ты — эксперт по YouTube Shorts и SEO-оптимизации коротких вертикальных видео. 
Твоя задача — создать идеальную SEO-упаковку для следующего сценария Shorts:

"${scriptText}"

Контекст канала:
${nicheContext}${brandContext}${customContext}${ctaSeoRule}

Требования:
1. Придумай ровно 3 кликабельных, вирусных названия (titles) для Shorts.
2. Напиши масштабное, развёрнутое SEO-описание для ролика объёмом ПРИБЛИЗИТЕЛЬНО 3000 СИМВОЛОВ (диапазон: 2700–3300 символов):
   - КРИТИЧЕСКОЕ ПРАВИЛО ПОИСКА: В ПЕРВЫХ 200 СИМВОЛАХ описания ОБЯЗАТЕЛЬНО должны быть органично внедрены самые главные поисковые ключевые слова и фразы по теме ролика (это видимый сниппет YouTube/Google поиска).
   - КРИТИЧЕСКОЕ ПРАВИЛО СТРУКТУРЫ: СТРОГО РАЗБИВАЙ ТЕКСТ НА АБЗАЦЫ ДВОЙНЫМ ПЕРЕНОСОМ СТРОКИ (\\n\\n). КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО выдавать сплошную простыню текста! Каждый смысловой блок обязан быть отдельным абзацем с эмодзи-маркером в начале.
   - СТРОГИЙ ЗАПРЕТ НА ПЛЕЙЛИСТЫ И ОСНОВНЫЕ ВИДЕО: КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО упоминать плейлисты («в плейлисте», «ссылка на плейлист») или отсылать зрителя к конкретному «основному/полному/связанному видео» (его может не быть). Используй только ОБЩЕЕ упоминание канала!
   - СТРУКТУРА ОПИСАНИЯ (~3000 знаков):
     * 🎯 [0–200 символов]: Мощный интригующий хук-лид с ключевыми словами для поисковой выдачи.
     
     * 💡 [200–900 символов]: Подробное раскрытие сути ролика, контекста проблемы, скрытых деталей и тезисов из сценария.
     
     * 🔍 [900–1800 символов]: Глубокий разбор темы: ответы на частые вопросы зрителей, практические инсайты, выводы и факты, расширяющие тему ролика.
     
     * ⚡ [1800–2500 символов]: Тематический SEO-блок с контекстным упоминанием смежных поисковых запросов ниши, пользы для зрителя и вовлекающих вопросов в аудиторию.
     
     * 💬 [2500–3000 символов]: Блок взаимодействия: вопросы для комментариев, обобщенное вовлекающее упоминание канала (например: «Больше разборов и интересных тем смотрите на нашем канале!») и блок тематических хештегов.
   - ВАЖНО: Никаких таймкодов! Это Shorts. Текст должен быть связным, живым, без пустой воды, с хорошей разбивкой на абзацы и эмодзи-маркерами для удобства чтения.
3. Собери массив из 5-8 релевантных хештегов.
4. Собери массив из 10-15 ключевых слов/тег-фраз (keywords).
${pinnedRequirement}

ОТВЕТ ДОЛЖЕН БЫТЬ СТРОГО В ФОРМАТЕ JSON:
{
  "titles": ["Название 1", "Название 2", "Название 3"],
  "description": "🎯 Развёрнутое SEO-описание примерно на 3000 символов (в первых 200 символах ключевые слова)...\\n\\n💡 Подробности и предыстория...\\n\\n🔍 Детальный разбор темы...\\n\\n⚡ Полезные выводы...\\n\\n💬 Вопросы в комментариях и обобщенное упоминание канала...",
  "hashtags": ["#shorts", "#тег2"],
  "keywords": ["ключ 1", "ключевая фраза 2"],
  "pinnedComment": "Текст закрепленного комментария..."
}
`;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.1-flash-lite",
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
  result.description = formatShortsDescriptionWithParagraphs(result.description);

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

  // Post-process enforcement of custom rules on generated SEO
  return enforceCustomRulesOnShortsSEO(result, effectiveCustom);
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
      model: options?.model || "gemini-3.1-flash-lite",
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
    model: options?.model || "gemini-3.1-flash-lite",
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
 * YouTube Shorts Outlier Analyst & 10 Ideas Generator.
 * Implements strict analysis of competitor outlier videos (>=2x median views),
 * formulates a niche winning framework, and generates 10 concrete, non-duplicate,
 * physically realizable Shorts ideas with visual breakdowns.
 */
export async function generateShortsOutlierIdeas(
  params: {
    niche: string;
    competitorChannels?: CompetitorChannel[];
    competitorVideos?: CompetitorVideo[];
    myChannelVideos?: Array<{ title: string; views?: string | number }>;
    savedFramework?: string;
    customPromptAddition?: string;
  },
  options?: AnalysisOptions
): Promise<ShortsOutlierGenerationResult> {
  const { niche, competitorChannels = [], competitorVideos = [], myChannelVideos = [], savedFramework = '', customPromptAddition = '' } = params;

  // Format competitor videos
  const allCompVideos: { title: string; views: string; channel?: string }[] = [];
  competitorChannels.forEach(c => {
    if (Array.isArray(c.topVideos)) {
      c.topVideos.forEach(v => {
        allCompVideos.push({
          title: v.title,
          views: v.views,
          channel: c.name
        });
      });
    }
  });
  competitorVideos.forEach(v => {
    allCompVideos.push({
      title: v.title,
      views: v.views
    });
  });

  const compVideosText = allCompVideos.length > 0
    ? allCompVideos.map(v => `- [${v.channel || 'Конкурент'}] "${v.title}" (${v.views} просм.)`).join('\n')
    : `- Примеры растущих конкурентов в нише "${niche}"`;

  const myVideosText = myChannelVideos.length > 0
    ? myChannelVideos.map(v => `- "${v.title}"`).join('\n')
    : `(Видео на моем канале пока нет)`;

  const customInstructionsText = getActiveCustomInstructionsText();

  const prompt = `Ты — ведущий YouTube-аналитик, специализирующийся на вирусных Shorts и алгоритмах удержания.

НИША: "${niche}"
${savedFramework ? `СОХРАНЕННЫЙ РАНЕЕ ФРЕЙМВОРК НИШИ: "${savedFramework}"` : ''}

РОЛИКИ И КАНАЛЫ РАСТУЩИХ КОНКУРЕНТОВ:
${compVideosText}

УЖЕ ОПУБЛИКОВАННЫЕ РОЛИКИ НА МОЕМ КАНАЛЕ (СТРОГО НЕ ПОВТОРЯТЬ ИХ ТЕМЫ И ЗАГОЛОВКИ):
${myVideosText}

ЧТО СЧИТАТЬ АУТЛАЕРОМ:
Аутлаер — это ролик, набравший в 2 и более раз больше просмотров, чем медиана по каналу за тот же период. Считай именно медиану, а не среднее.

ВЫПОЛНИ СЛЕДУЮЩИЕ 4 ЗАДАЧИ:

ЗАДАЧА 1. АНАЛИЗ (не длиннее 15 строк):
Пройди по роликам конкурентов и выдели аутлаеры от 2х. Разбери:
1. Формулы названий — конструкции, которые повторяются в аутлаерах и отсутствуют в обычных роликах.
2. Темы — какие конкретные подтемы дают аутлаеры, а какие проваливаются.
3. Эмоциональный триггер — что заставляет кликать (ностальгия, любопытство, спор, страх потери, узнавание).
4. Длина роликов у аутлаеров против остальных.
5. Свежесть — аутлаеры распределены равномерно или сгруппированы? Что изменилось в тот период.

ЗАДАЧА 2. ФРЕЙМВОРК (одним емким абзацем):
Сформулируй формулу успеха этой ниши: тема + угол + тип названия + обещание зрителю.

ЗАДАЧА 3. ДЕСЯТЬ ИДЕЙ ДЛЯ SHORTS
Выдай ровно 10 прорывных идей для моих новых Shorts.

ЖЕСТКИЕ ФИЛЬТРЫ ДЛЯ КАЖДОЙ ИДЕИ:
— Запрещены любые повторы: такого ролика не должно быть ни у конкурентов, ни на моем канале (проверь по названиям).
— Физическая реализуемость видеоряда: идея должна легко и на 100% собираться из реальных съемочных материалов, качественных стоковых кадров и архивных фото/иллюстраций. Никаких абстрактных и туманных философствований — нужны конкретные объекты, места, исторические события, лица людей, предметы, действия.
— Вечнозеленость: тема не должна требовать сиюминутных новостей текущего месяца.

Формат для каждой идеи:
- Номер (#1 - #10)
- Заголовок (кликбейтный, бьющий в боль или интригу)
- Почему сработает (одна строка со ссылкой на конкретный аутлаер/триггер)
- Что будет в кадре (3–5 конкретных типов визуала, которые сервис стоков/ИИ легко найдет или сгенерирует)
- Хук первых 3 секунд (точная цепляющая фраза диктора без приветствий)
- Эмоциональный триггер
- Оценка длительности: строго от 40 до 90 секунд (например: "50 сек", "65 сек", "75 сек", "85 сек")

${customPromptAddition ? `ДОПОЛНИТЕЛЬНЫЕ ПОЖЕЛАНИЯ: ${customPromptAddition}` : ''}
${customInstructionsText ? `ПОЛЬЗОВАТЕЛЬСКИЕ ПРАВИЛА И КАНОН: ${customInstructionsText}` : ''}

ОТВЕТЬ СТРОГО ВАЛИДНЫМ JSON СЛЕДУЮЩЕЙ СТРУКТУРЫ:
{
  "analysis": {
    "formulas": ["Формула 1...", "Формула 2..."],
    "topics": ["Выигрышные темы...", "Провальные темы..."],
    "emotionalTriggers": ["Любопытство...", "Страх потери..."],
    "durationInsight": "Оптимальная длительность в нише от 40 до 90 сек...",
    "freshnessInsight": "Аутлаеры сконцентрированы на...",
    "summaryAnalysis": "Краткий емкий текст разбора до 15 строк...",
    "framework": "Формула успеха: [тема] + [угол] + [тип названия] + [обещание зрителю]"
  },
  "ideas": [
    {
      "number": 1,
      "title": "Название ролика",
      "whyItWorks": "Почему сработает: ссылка на аутлаер и триггер...",
      "visualTypes": ["Лицо плачущего воина крупным планом", "Древний свиток на деревянном столе", "Пустыня на закате с идущим караваном"],
      "hook": "Фраза первых 3 секунд, которая не отпускает...",
      "trigger": "Любопытство / Моральный выбор",
      "estimatedDuration": "65 сек"
    }
  ]
}`;

  try {
    const response = await callGeminiWithRetry({
      model: options?.model || "gemini-3.1-flash-lite",
      contents: buildContents(prompt, options),
      config: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    const parsed = safeParseJSON<any>(extractTextFromResponse(response), null);
    if (!parsed || !Array.isArray(parsed.ideas)) {
      throw new Error("Не удалось разобрать JSON-ответ аналитика Shorts");
    }

    const ideas: ShortsOutlierIdea[] = parsed.ideas.map((item: any, idx: number) => ({
      id: `outlier_idea_${Date.now()}_${idx + 1}`,
      number: item.number || idx + 1,
      title: item.title || `Идея #${idx + 1}`,
      whyItWorks: item.whyItWorks || "Высокий потенциал удержания в нише",
      visualTypes: Array.isArray(item.visualTypes) ? item.visualTypes : (Array.isArray(item.visualContent) ? item.visualContent : ["Тематические кадры высокого качества"]),
      visualContent: Array.isArray(item.visualTypes) ? item.visualTypes : (Array.isArray(item.visualContent) ? item.visualContent : ["Тематические кадры высокого качества"]),
      hook: item.hook || item.title || "",
      trigger: item.trigger || item.emotionalTrigger || "Интрига",
      emotionalTrigger: item.emotionalTrigger || item.trigger || "Интрига",
      estimatedDuration: item.estimatedDuration || "50-75 сек",
      isGenerated: false
    }));

    return {
      analysis: {
        formulas: Array.isArray(parsed.analysis?.formulas) ? parsed.analysis.formulas : (Array.isArray(parsed.analysis?.titlePatterns) ? parsed.analysis.titlePatterns : []),
        titlePatterns: Array.isArray(parsed.analysis?.titlePatterns) ? parsed.analysis.titlePatterns : (Array.isArray(parsed.analysis?.formulas) ? parsed.analysis.formulas : []),
        topics: Array.isArray(parsed.analysis?.topics) ? parsed.analysis.topics : [],
        flopTopics: Array.isArray(parsed.analysis?.flopTopics) ? parsed.analysis.flopTopics : [],
        emotionalTriggers: Array.isArray(parsed.analysis?.emotionalTriggers) ? parsed.analysis.emotionalTriggers : [],
        durationInsight: parsed.analysis?.durationInsight || "",
        freshnessInsight: parsed.analysis?.freshnessInsight || "",
        summaryAnalysis: parsed.analysis?.summaryAnalysis || "Анализ успешно завершен.",
        framework: parsed.analysis?.framework || "Фреймворк ниши определен."
      },
      ideas,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error("generateShortsOutlierIdeas error", error);
    throw error;
  }
}

/**
 * Generates a production-ready Shorts script and visual breakdown from a selected Outlier Idea.
 */
export async function generateFullShortsScriptFromOutlierIdea(
  idea: ShortsOutlierIdea,
  niche: string,
  options?: AnalysisOptions & { nextIdeaTitle?: string; nextIdea?: ShortsOutlierIdea; outlierIdeas?: ShortsOutlierIdea[] }
): Promise<{
  title: string;
  script: string;
  scenes: Array<{ timecode: string; text: string; visualPrompt: string }>;
  seo: ShortsSEO;
}> {
  const customInstructionsText = getActiveCustomInstructionsText();

  const ideaTitle = idea?.title || "Вирусный Shorts";
  const ideaWhyItWorks = idea?.whyItWorks || "Высокий потенциал вовлечения";
  const rawVisuals = Array.isArray(idea?.visualTypes) && idea.visualTypes.length > 0
    ? idea.visualTypes
    : (Array.isArray(idea?.visualContent) && idea.visualContent.length > 0
        ? idea.visualContent
        : ["Тематические кадры высокого качества (9:16)"]);
  const visualTypesString = rawVisuals.join(", ");
  const ideaHook = idea?.hook || ideaTitle;
  const ideaDuration = idea?.estimatedDuration || "65 сек";

  const nextIdeaTitle = options?.nextIdeaTitle || options?.nextIdea?.title || "";
  const nextIdeaTeaserInstruction = nextIdeaTitle
    ? `\n5. ОБЯЗАТЕЛЬНОЕ ТРЕБОВАНИЕ К ФИНАЛУ СЦЕНАРИЯ (АНОНС СЛЕДУЮЩЕГО ВИДЕО ИЗ ВКЛАДКИ ИДЕИ):
   - В самой последней сцене (в финальной фразе диктора / конце сценария) ОБЯЗАТЕЛЬНО добавь интригующий анонс следующего видео из списка вкладки «Идеи»!
   - СЛЕДУЮЩЕЕ ВИДЕО, КОТОРОЕ НУЖНО АНОНСИРОВАТЬ: "${nextIdeaTitle}"
   - Диктор должен произнести энергичный анонс именно этой конкретной темы и сформировать клиффхэнгер.
   - Разметка кадра должна включать плашку [ТЕКСТ НА ЭКРАНЕ: "${nextIdeaTitle.toUpperCase()}"] или аналогичное название следующего выпуска.
   Пример идеального окончания сценария:
   [КАДР: Диктор интригующе смотрит в камеру, плавно уходя в затемнение]
   [ЗВУК: Легкий акцентный свуш и воодушевляющая музыка]
   [воодушевлённо] Полный разбор этой темы смотри в связанном видео внизу! (500ms) А в следующем ролике мы разберём: «${nextIdeaTitle}» — обязательно подпишись, чтобы не пропустить!
   [ТЕКСТ НА ЭКРАНЕ: "${nextIdeaTitle.toUpperCase()}"]`
    : `\n5. ОБЯЗАТЕЛЬНОЕ ТРЕБОВАНИЕ К ФИНАЛУ СЦЕНАРИЯ (АНОНС СЛЕДУЮЩЕГО ВИДЕО):
   - В самой последней сцене сценария (в финальной фразе диктора) ОБЯЗАТЕЛЬНО добавь интригующий анонс следующего видео по каналу.
   - Пример: «[воодушевлённо] А в следующем ролике мы разберём: [Интригующая тема следующего видео] — не пропусти! [ТЕКСТ НА ЭКРАНЕ: "[ТЕМА СЛЕДУЮЩЕГО ВИДЕО]"]»`;

  const prompt = `Ты — ведущий топ-сценарист вирусных YouTube Shorts с миллионными просмотрами.
Твоя задача — написать ПОЛНОЦЕННЫЙ, ГЛУБОКИЙ, ЗАВЕРШЁННЫЙ сценарий для вертикального видео Shorts длительностью СТРОГО от 45 до 85 секунд (объём дикторского текста: 130–220 слов).

ИСХОДНЫЕ ДАННЫЕ ИДЕИ:
- Ниша: "${niche || "YouTube Shorts"}"
- Заголовок идеи: "${ideaTitle}"
- Суть и почему зайдёт: "${ideaWhyItWorks}"
- Визуальные образы: ${visualTypesString}
- Стартовый хук: "${ideaHook}"

СТРОГИЕ ТРЕБОВАНИЯ К СЦЕНАРИЮ:
1. ХРОНОМЕТРАЖ И ОБЪЁМ:
   - Длительность: 45–85 секунд.
   - Объём текста: от 130 до 220 слов. Никаких коротких отписок, тезисов или двух предложений!
   - Это должен быть связный, захватывающий монолог диктора, ведущий зрителя от боли/интриги к мощному инсайту и эмоциональному катарсису.

2. СТРУКТУРА ПОВЕСТВОВАНИЯ:
   - Сцена 1 (0:00–0:05): Шокирующий/интригующий хук, бьющий в нерв зрителя. Без приветствий и заезженных штампов.
   - Сцена 2 (0:05–0:20): Погружение в проблему/контекст, объяснение неочевидной скрытой детали.
   - Сцена 3 (0:20–0:40): Развитие мысли, кульминация, глубокий жизненный или духовный/философский инсайт.
   - Сцена 4 (0:40–0:60): Неожиданный вывод, раскрытие тайны или практическая мудрость, переворачивающая восприятие.
   - Сцена 5 (0:60–0:75+): Мощный финал и вовлекающий вопрос или отсылка к полному разбору в связанном видео, а ТАКЖЕ АНОНС СЛЕДУЮЩЕГО ВИДЕО ИЗ ВКЛАДКИ ИДЕИ.

3. РАЗМЕТКА ДЛЯ ОЗВУЧКИ (TTS):
   ${SHORTS_TTS_MARKUP_INSTRUCTION}

4. SEO-ОПИСАНИЕ РОЛИКА:
   - Напиши масштабное, развёрнутое описание объёмом ПРИБЛИЗИТЕЛЬНО 3000 СИМВОЛОВ (2700–3300 знаков).
   - КРИТИЧЕСКОЕ ТРЕБОВАНИЕ: В ПЕРВЫХ 200 СИМВОЛАХ описания ОБЯЗАТЕЛЬНО должны быть органично внедрены самые главные поисковые ключевые слова и фразы темы ролика (это видимый сниппет поисковой выдачи YouTube/Google).
   - В описании подробно раскрой контекст ролика, глубокий разбор темы, смежные поисковые запросы, инсайты и блок вовлечения зрителей в комментарии. Без таймкодов.

${nextIdeaTeaserInstruction}

${customInstructionsText ? `ОБЯЗАТЕЛЬНЫЙ КАНОН КАНАЛА И КАСТОМНЫЕ ПРАВИЛА:\n${customInstructionsText}` : ''}

ОТВЕТЬ СТРОГО В ФОРМАТЕ JSON:
{
  "title": "${ideaTitle.replace(/"/g, "'")}",
  "script": "[интригующе] *Хук* (500ms)... [развернутый связный текст сценария на 130-220 слов со всеми паузами (500ms)/(1s), ударениями *слово*, пометками [ТЕКСТ НА ЭКРАНЕ: \"...\"] и анонсом следующего видео из вкладки Идеи в финале]",
  "seo": {
    "titles": ["${ideaTitle.replace(/"/g, "'")}"],
    "description": "Развёрнутое SEO-описание примерно на 3000 символов (в первых 200 симво символах ключевые слова)...",
    "hashtags": ["#Shorts", "#Тренды"],
    "keywords": ["тег1", "тег2"],
    "pinnedComment": "Вопрос для удержания в комментариях..."
  }
}`;

  try {
    const response = await callGeminiWithRetry({
      model: options?.model || "gemini-3.1-flash-lite",
      contents: buildContents(prompt, options),
      bypassCache: true,
      config: {
        temperature: 0.7,
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            script: { type: Type.STRING },
            seo: {
              type: Type.OBJECT,
              properties: {
                titles: { type: Type.ARRAY, items: { type: Type.STRING } },
                description: { type: Type.STRING },
                hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
                keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                pinnedComment: { type: Type.STRING }
              },
              required: ["titles", "description", "hashtags", "keywords", "pinnedComment"]
            }
          },
          required: ["title", "script", "seo"]
        }
      }
    });

    const rawText = extractTextFromResponse(response);
    let parsed: any = safeParseJSON<any>(rawText, null) || tryRepairJSON<any>(rawText);

    if (!parsed || typeof parsed !== "object") {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = safeParseJSON<any>(jsonMatch[0], null) || tryRepairJSON<any>(jsonMatch[0]);
      }
    }

    let scriptText = parsed?.script || parsed?.scriptText || parsed?.fullScript || "";

    if (!scriptText || scriptText.trim().length < 40) {
      throw new Error("Модель вернула слишком короткий ответ для сценария Shorts");
    }

    const initialTitle = parsed?.title || ideaTitle;

    const rawSeo: ShortsSEO = {
      titles: Array.isArray(parsed?.seo?.titles) && parsed.seo.titles.length > 0 
        ? parsed.seo.titles 
        : [parsed?.seo?.title || initialTitle],
      description: parsed?.seo?.description || `Разбор темы «${initialTitle}». Смотрите до конца!`,
      hashtags: Array.isArray(parsed?.seo?.hashtags) && parsed.seo.hashtags.length > 0 
        ? parsed.seo.hashtags 
        : ["#Shorts", "#YouTubeShorts", "#Тренды"],
      keywords: Array.isArray(parsed?.seo?.keywords) 
        ? parsed.seo.keywords 
        : (Array.isArray(parsed?.seo?.tags) ? parsed.seo.tags : [initialTitle, "Shorts"]),
      pinnedComment: parsed?.seo?.pinnedComment || "Какое ваше мнение по этой теме? Напишите в комментариях!"
    };

    const enforcedItem = enforceCustomRulesOnShortsItem({
      title: initialTitle,
      hook: ideaHook,
      script: scriptText,
      viral_potential: "9.5/10 (Вирусный аутлаер)",
      duration: ideaDuration,
      seo: rawSeo
    }, customInstructionsText);

    return {
      title: enforcedItem.title,
      script: enforcedItem.script,
      scenes: [],
      seo: enforcedItem.seo || rawSeo
    };
  } catch (error) {
    logger.error("generateFullShortsScriptFromOutlierIdea error", error);
    throw error;
  }
}
