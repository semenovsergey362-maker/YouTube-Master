import { logger } from "../../config/logger";
import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import {
  SeoAnalysisResponseSchema,
} from "../../types/schemas";
import {
  AnalysisOptions,
  AnalysisSource,
  VideoSEO,
  SEOAnalysis,
  TextVariation,
  PromotionStrategy,
  TitleAnalysis,
  ScriptImprovement,
  ScriptBlockStructure,
  TransitionPrompt,
  ThumbnailStyleSuggestion,
  CustomRuleAuditItem,
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
import { validateAndEnrichSystemPrompt } from "./visualPromptService";

/**
 * Intelligently merges a SEO audit suggestion or rule fix into an existing description
 * without wiping out the entire multi-paragraph text.
 */
export function smartMergeDescriptionUpdate(
  currentDesc: string,
  updateValue: string,
  context?: {
    area?: string;
    ruleTitle?: string;
    suggestion?: string;
    targetField?: string;
    isRuleViolation?: boolean;
  }
): string {
  if (!currentDesc || !currentDesc.trim()) {
    return (updateValue || "").trim();
  }
  if (!updateValue || !updateValue.trim()) {
    return currentDesc;
  }

  const cleanCurrent = currentDesc.trim();
  const cleanUpdate = updateValue.trim();

  if (cleanCurrent === cleanUpdate || cleanCurrent.includes(cleanUpdate)) {
    return cleanCurrent;
  }
  if (cleanUpdate.includes(cleanCurrent)) {
    return cleanUpdate;
  }

  // If update is already full length or multi-line or >= 300 chars, it's a full replacement
  if (
    cleanUpdate.includes("\n") ||
    cleanUpdate.length >= 300 ||
    (cleanCurrent.length > 200 && cleanUpdate.length >= cleanCurrent.length * 0.5)
  ) {
    return cleanUpdate;
  }

  const hint = `${context?.area || ""} ${context?.ruleTitle || ""} ${context?.suggestion || ""}`.toLowerCase();

  // 1. Channel Handle Rule (e.g., "@channel" or "наличие псевдонима")
  if (hint.includes("псевдоним") || hint.includes("хэндл") || hint.includes("handle") || cleanUpdate.startsWith("@")) {
    const handleMatch = cleanUpdate.match(/@[a-zA-Z0-9_.-]+/);
    const handle = handleMatch ? handleMatch[0] : (cleanUpdate.startsWith("@") ? cleanUpdate.split(/\s+/)[0] : cleanUpdate);
    
    // If handle is already in description, keep current
    if (cleanCurrent.includes(handle)) {
      return cleanCurrent;
    }
    const oldHandleMatch = cleanCurrent.match(/@[a-zA-Z0-9_.-]+/);
    if (oldHandleMatch) {
      return cleanCurrent.replace(oldHandleMatch[0], handle);
    }
    // Prepend handle to the first paragraph
    const paragraphs = cleanCurrent.split(/\n\s*\n+/);
    if (paragraphs.length > 0) {
      paragraphs[0] = `${handle} ${paragraphs[0]}`;
      return paragraphs.join("\n\n");
    }
    return `${handle} ${cleanCurrent}`;
  }

  // 2. Link prohibition rule (e.g., "запрет на сторонние ссылки")
  if (hint.includes("ссылок") || hint.includes("ссылк") || hint.includes("link")) {
    const stripped = cleanCurrent
      .replace(/https?:\/\/(?!(?:www\.)?(?:youtube\.com|youtu\.be))[^\s]+/gi, "")
      .replace(/t\.me\/[^\s]+/gi, "")
      .replace(/vk\.com\/[^\s]+/gi, "")
      .replace(/\n\s*\n\s*\n+/g, "\n\n")
      .trim();
    return stripped;
  }

  // 3. First 200 characters / Hook / Opening Lead update / General short suggestion
  // Replace ONLY the first paragraph / hook with the improved text, leaving all other paragraphs intact!
  const paragraphs = cleanCurrent.split(/\n\s*\n+/);
  if (paragraphs.length > 1) {
    paragraphs[0] = cleanUpdate;
    return paragraphs.join("\n\n");
  }

  // If there are single line breaks
  const lines = cleanCurrent.split(/\n+/);
  if (lines.length > 1) {
    lines[0] = cleanUpdate;
    return lines.join("\n\n");
  }

  // If it's a single block of text, replace up to the first sentence boundary
  const firstSentenceMatch = cleanCurrent.match(/^[^.!?]+[.!?]+(?:\s+|$)/);
  if (firstSentenceMatch && cleanCurrent.length > firstSentenceMatch[0].length + 50) {
    const remainder = cleanCurrent.slice(firstSentenceMatch[0].length).trim();
    return `${cleanUpdate}\n\n${remainder}`;
  }

  // Fallback: prepend if cleanUpdate is not already in text
  if (!cleanCurrent.includes(cleanUpdate)) {
    return `${cleanUpdate}\n\n${cleanCurrent}`;
  }
  return cleanCurrent;
}

export async function applySEORecommendationToAllFields(
  currentSEO: VideoSEO,
  recommendation: { area: string; suggestedValue: string; impact: string; suggestion: string },
  options?: AnalysisOptions
): Promise<VideoSEO> {
  const customInst = getCustomInstructions(options);
  const prompt = `Действуй как экспертный SEO-специалист YouTube.
Твоя задача — применить одну конкретную рекомендацию по оптимизации КО ВСЕМ полям SEO метаданных видео (заголовок, описание, теги/ключевые слова), чтобы она органично вписалась везде.
${customInst}

Текущие метаданные:
Заголовок: ${currentSEO.title}
Описание: ${currentSEO.description}
Ключевые слова: ${currentSEO.keywords}
Хештеги: ${Array.isArray(currentSEO.hashtags) ? currentSEO.hashtags.join(', ') : (currentSEO.hashtags || '')}
Закрепленный комментарий: ${currentSEO.pinnedComment || ''}
Варианты A/B заголовков: ${Array.isArray(currentSEO.titleVariants) ? currentSEO.titleVariants.join(', ') : (currentSEO.titleVariants || '')}

РЕКОМЕНДАЦИЯ ДЛЯ ВНЕДРЕНИЯ:
${recommendation.suggestion}
(Рекомендуемое значение/действие: ${recommendation.suggestedValue})

Правила:
1. Если рекомендация — добавить ключевое слово, перепиши заголовок и описание так, чтобы это ключевое слово органично в них читалось. Добавь его в ключевые слова и хештеги.
2. КРИТИЧЕСКОЕ ТРЕБОВАНИЕ ДЛЯ ОПИСАНИЯ: СОХРАНЯЙ ВЕСЬ ИСХОДНЫЙ ОБЪЕМ И ВСЕ АБЗАЦЫ ОПИСАНИЯ! Ни в коем случае не сокращай описание до одного предложения! Ты обязан сохранить все существующие абзацы и структуру текста, заменив или дополнив лишь нужную часть (например, первый абзац хука или целевой фрагмент).
3. Варианты A/B заголовков (titleVariants) также должны быть переписаны с учетом этой рекомендации и быть НА ТОМ ЖЕ ЯЗЫКЕ, что и основной заголовок.
4. Верни полностью обновленный JSON-объект метаданных. Не меняй то, что не связано с рекомендацией, но обеспечь полную консистентность.

Формат вывода: JSON объект VideoSEO.`;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.1-flash-lite",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          titleVariants: { type: Type.ARRAY, items: { type: Type.STRING } },
          description: { type: Type.STRING },
          keywords: { type: Type.STRING },
          hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
          pinnedComment: { type: Type.STRING },
        },
        required: ["title", "titleVariants", "description", "keywords", "hashtags", "pinnedComment"],
      }
    }
  });

  const parsed = safeParseJSON<VideoSEO>(extractTextFromResponse(response), currentSEO);

  // Safety fallback: if AI returned a truncated description (< 300 chars while current was > 400), merge cleanly
  if (currentSEO.description && currentSEO.description.length > 400 && (!parsed.description || parsed.description.length < 300)) {
    parsed.description = smartMergeDescriptionUpdate(currentSEO.description, parsed.description || recommendation.suggestedValue, {
      area: recommendation.area,
      suggestion: recommendation.suggestion,
    });
  }

  return parsed;
}


export async function parseRecommendationsFromText(
  rawText: string,
  options?: AnalysisOptions
): Promise<ScriptImprovement[]> {
  const prompt = `Ниже представлен текст с рекомендациями, замечаниями, правками или пожеланиями по улучшению сценария видео.
Твоя задача — проанализировать этот текст и извлечь из него четкий список конкретных рекомендаций по улучшению (1-7 пунктов).

Текст с правками/рекомендациями:
${rawText}

Формат ответа: JSON массив объектов с полями:
- improvement: Краткое название рекомендации (например, "Усилить хук во вступлении")
- reason: Почему это важно или обоснование данной правки
- example: Пример реализации или подробная инструкция по внесению правки в сценарий

Верни ТОЛЬКО валидный JSON массив.`;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.1-flash-lite",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            improvement: { type: Type.STRING },
            reason: { type: Type.STRING },
            example: { type: Type.STRING },
          },
          required: ["improvement", "reason", "example"],
        },
      },
    },
  });

  const parsed = safeParseJSON<ScriptImprovement[]>(extractTextFromResponse(response), []);
  return parsed.map(item => ({ ...item, isCustom: true, metricEffect: "Пользовательская правка" }));
}


export async function generateVideoSEO(
  idea: string,
  niche: string,
  channelName?: string,
  competitorWeaknesses?: string[],
  region: string = 'global',
  scriptStructure?: ScriptBlockStructure[],
  options?: AnalysisOptions,
  generatedBlocks?: Record<number, any> | any[]
): Promise<VideoSEO> {
  const context = channelName ? ` для канала "${channelName}"` : "";
  const regionContext = region !== 'global' ? ` для региона "${region}"` : " для глобального рынка";
  const compContext = competitorWeaknesses && competitorWeaknesses.length > 0 
    ? ` Учти слабые стороны конкурентов: ${competitorWeaknesses.join(', ')}.` 
    : "";
  
  let timestampsText = "";
  let currentSeconds = 0;
  
  let blocksToUse: { title: string; text?: string; estimatedTime?: string; estimatedChars?: number }[] = [];
  
  if (generatedBlocks) {
    let genBlocksArray: any[] = [];
    if (Array.isArray(generatedBlocks)) {
      genBlocksArray = generatedBlocks;
    } else {
      const keys = Object.keys(generatedBlocks).map(Number).sort((a, b) => a - b);
      genBlocksArray = keys.map(k => (generatedBlocks as any)[k]);
    }
    
    const count = Math.max(scriptStructure?.length || 0, genBlocksArray.length);
    for (let i = 0; i < count; i++) {
      const structItem = scriptStructure?.[i];
      const genItem = genBlocksArray[i];
      
      let rawTitle = structItem?.title || genItem?.blockTitle || genItem?.title;
      if (!rawTitle || rawTitle.trim() === "" || /^Блок\s*\d+$/i.test(rawTitle.trim())) {
        if (structItem?.type) {
          rawTitle = structItem.type;
        } else if (structItem?.description) {
          rawTitle = structItem.description.slice(0, 40);
        } else if (genItem?.text) {
          const firstLine = genItem.text.split('\n')[0].replace(/^#+\s*/, '').trim();
          rawTitle = firstLine.slice(0, 45);
        } else {
          rawTitle = `Блок ${i + 1}`;
        }
      }
      
      const cleanTitle = rawTitle.replace(/^#+\s*/, '').replace(/^"|"$/g, '').trim();
      blocksToUse.push({
        title: cleanTitle,
        text: genItem?.text || structItem?.description || "",
        estimatedTime: structItem?.estimatedTime || genItem?.estimatedTime,
        estimatedChars: structItem?.estimatedChars,
      });
    }
  } else if (scriptStructure && scriptStructure.length > 0) {
    blocksToUse = scriptStructure.map((s, i) => {
      let rawTitle = s.title;
      if (!rawTitle || rawTitle.trim() === "" || /^Блок\s*\d+$/i.test(rawTitle.trim())) {
        rawTitle = s.type || `Блок ${i + 1}`;
      }
      const cleanTitle = rawTitle.replace(/^#+\s*/, '').replace(/^"|"$/g, '').trim();
      return {
        title: cleanTitle,
        estimatedTime: s.estimatedTime,
        estimatedChars: s.estimatedChars,
      };
    });
  }

  if (blocksToUse.length > 0) {
    const lines = blocksToUse.map((item, i) => {
      const mins = Math.floor(currentSeconds / 60);
      const secs = currentSeconds % 60;
      const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      
      let durationInSecs = 30;
      if (item.text && item.text.trim().length > 0) {
        const clean = item.text
          .replace(/\[[^\]]+\]/g, "")
          .replace(/\([^)]+\)/g, "")
          .replace(/^[A-Za-zА-Яа-я0-9\s_-]+:\s*/gm, "")
          .replace(/[#*_\`~]/g, "")
          .trim();
        const spokenLength = clean.length > 10 ? clean.length : Math.round(item.text.length * 0.7);
        durationInSecs = Math.max(15, Math.round(spokenLength / 17.5));
      } else if (item.estimatedChars && item.estimatedChars > 0) {
        durationInSecs = Math.max(15, Math.round(item.estimatedChars / 17.5));
      } else if (typeof item.estimatedTime === 'string') {
        const text = item.estimatedTime.toLowerCase();
        if (text.includes(':')) {
          const parts = text.split(':').map(p => parseInt(p, 10));
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            durationInSecs = parts[0] * 60 + parts[1];
          }
        } else {
          const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
          if (!isNaN(num)) {
            durationInSecs = text.includes('мин') ? num * 60 : num;
          }
        }
      }

      currentSeconds += Math.max(10, durationInSecs);
      return `${timeStr} - ${item.title}`;
    });
    timestampsText = lines.join('\n');
  }

  let scriptContentContext = "";
  if (blocksToUse.length > 0) {
    const snippets = blocksToUse
      .filter(b => b.text && b.text.trim().length > 0)
      .map(b => {
        const clean = b.text!
          .replace(/\[[^\]]+\]/g, "")
          .replace(/\([^)]+\)/g, "")
          .replace(/^[A-Za-zА-Яа-я0-9\s_-]+:\s*/gm, "")
          .replace(/[#*_\`~]/g, "")
          .trim();
        const slice = clean.length > 350 ? clean.slice(0, 350) + "..." : clean;
        return `• [Глава: "${b.title}"]:\n${slice}`;
      });
    if (snippets.length > 0) {
      scriptContentContext = `\n\nФАКТИЧЕСКИЙ МАТЕРИАЛ И ТЕЗИСЫ СЦЕНАРИЯ (ОБЯЗАТЕЛЬНО используй эти реальные факты, стихи, термины, цитаты, ритуалы и жизненные примеры при составлении описания):\n"""\n${snippets.join('\n\n')}\n"""`;
    }
  }

  const timestampsContext = timestampsText
    ? `
ОБЯЗАТЕЛЬНО включи в описание следующую секцию ГОТОВЫХ ТАЙМКОДОВ YouTube (используй эти точные таймкоды, начинающиеся с 00:00):
Таймкоды:
${timestampsText}
`
    : "\nВключи в описание таймкоды в формате YouTube (начиная СТРОГО с 00:00, например:\n00:00 - Введение\n00:45 - Основная часть\n02:15 - Заключение).";
    
  const researchContext = options?.deepResearch ? "\nИспользуй Google Поиск для поиска самых востребованных поисковых запросов (SEO keywords) для этой темы на сегодняшний день." : "";
  const sourcesContext = getSourcesContext(options);
  const customInst = getCustomInstructions(options, false);
  const instructionsContext = customInst 
    ? `\n\n[🚨 ВЫСШИЙ ПРИОРИТЕТ: АКТИВНЫЕ КАСТОМНЫЕ ПРАВИЛА И ИНСТРУКЦИИ ДЛЯ SEO]:\n"""\n${customInst}\n"""\n(СТРОЖАЙШЕЕ ТРЕБОВАНИЕ: Все указанные выше пользовательские правила имеют абсолютный приоритет над любыми стандартными шаблонами! Если в правиле указан конкретный псевдоним канала (@...), включи его в описание. Если запрещены сторонние ссылки — НЕ вставляй никаких ссылок! Если указано количество хештегов — строго соблюдай это количество!)\n` 
    : '';

  const systemInstructionText = `Ты — ведущий YouTube-продюсер и SEO-архитектор мирового уровня с опытом продвижения каналов-миллионников.
Твой стандарт создания метаданных — бескомпромиссная психологическая глубина, драматургия, удержание и строгое соблюдение алгоритмов YouTube 2026 года.

ЖЕСТКИЕ ПРАВИЛА И СТАНДАРТЫ КАЧЕСТВА:
1. КАТЕГОРИЧЕСКИЙ ЗАПРЕТ ШАБЛОННЫХ КЛИШЕ:
НИКОГДА не пиши пустые шаблонные фразы вроде:
- "В этом выпуске мы подробно разберем ключевые аспекты, практические примеры и проверенные решения"
- "полезные советы и проверенные методики"
- "мы погрузимся в удивительный мир..."
Каждое предложение должно содержать фактуру, острую человеческую проблему или конкретный инсайт из сценария.

2. СТРОГИЙ ЗАПРЕТ СПАМА ТЕГАМИ ВНУТРИ ОПИСАНИЯ:
КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО писать в теле описания строчки вроде "ТЕГИ И ПОИСКОВЫЕ ЗАПРОСЫ: ..." или перечислять ключевые слова через запятую! YouTube официально классифицирует это как спам метаданными (Keyword Stuffing) и штрафует канал. Все теги должны находиться ИСКЛЮЧИТЕЛЬНО в отдельном поле "keywords" (для YouTube Studio). В самом описании ключевые фразы должны быть органично и нативно вплетены в живую речь (LSI).

3. СТРУКТУРА ЭТАЛОННОГО ОПИСАНИЯ (СТАНДАРТ ТОПОВЫХ КАНАЛОВ):
• ЖЕСТКОЕ ПРАВИЛО: КЛЮЧЕВЫЕ ЗАПРОСЫ В ПЕРВЫХ 200 СИМВОЛАХ (ДО КНОПКИ «ЕЩЁ»):
  В самых первых 200 символах описания (видимый сниппет поисковой выдачи YouTube и Google Search до кнопки «Ещё») ОБЯЗАТЕЛЬНО должны органично присутствовать главные высокочастотные поисковые запросы и ключевые фразы темы ролика!
  Первые 200 символов обязаны безупречно сочетать:
  1) Главный поисковый ключ и целевую ключевую фразу видео (органично встроенные в живой осмысленный текст);
  2) Мощный психологический хук, бьющий в боль аудитории, интригующий вывод или острый поисковый вопрос.
  Если в первых 200 символах отсутствуют ключевые запросы — это критическая ошибка ранжирования!
• ГЛУБОКИЙ РАЗБОР СЦЕНАРИЯ (ФАКТУРА):
  Опора на реальные материалы видео: греческие/латинские термины, первоисточники, номера глав и стихов (если тема библейская), научные концепции, жизненные примеры (увольнение, ожидание анализов и т.п.).
  Покажи, почему этот метод не является банальным позитивным мышлением ("это не совет просто не переживай...").
• БЛОК «В ВИДЕО ВЫ УЗНАЕТЕ:»:
  4–5 маркированных буллетов (—) с конкретными, интригующими ответами и практическими шагами (а не общими фразами).
• ПОЧЕМУ ИМЕННО ЭТА СТРУКТУРА:
  Объяснение зрителю, почему материал разобран именно по шагам, а не набором цитат.
• ДИСКЛЕЙМЕР (E-E-A-T):
  Если видео затрагивает темы психологии, здоровья, финансов, веры или права — профессиональный, тактичный дисклеймер.
• ТАЙМКОДЫ:
  Точные таймкоды с интригующими названиями глав (начиная строго с 00:00).
• ВОРОНКА УДЕРЖАНИЯ И BINGE-WATCHING:
  Призыв подписаться на канал с описанием миссии и упоминанием @псевдонима канала.
  Анонс следующего видео (логическое продолжение темы для эффекта запойного просмотра).
  Ссылка на тематический плейлист: [ССЫЛКА НА ПЛЕЙЛИСТ].
• ХЕШТЕГИ:
  3–5 целевых хештегов в самом конце описания (#Хештег1 #Хештег2 #Хештег3).

4. ВАРИАНТЫ НАЗВАНИЙ (TITLE VARIANTS):
Сгенерируй ровно 3 контрастных альтернативных варианта заголовка для A/B тестирования, СТРОГО основанных на теме и сценарии ТЕКУЩЕГО видео:
1. Вариант через острую интригу, скрытый парадокс или неожиданный вывод сюжета.
2. Вариант через эмоциональное переживание героя, переломный момент или глубокую проблему зрителя.
3. Вариант через конкретный исторический/сюжетный поворот или практический принцип из сценария.
КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать посторонние темы (например тревожность, если видео о пророке или истории). Заголовки должны на 100% принадлежать теме текущего ролика!

5. ЗАКРЕПЛЕННЫЙ КОММЕНТАРИЙ (PINNED COMMENT):
Искренний открытый вопрос автора к зрителям, стимулирующий развернутые комментарии-истории для взрывного роста Engagement Rate, плюс анонс следующей части.`;

  const prompt = `Создай эталонную SEO-оптимизацию для видео "${idea}" в нише "${niche}"${context}.${regionContext}.${compContext}${researchContext}${sourcesContext}${scriptContentContext}${instructionsContext}
  
  ТРЕБОВАНИЯ К ПОЛЯМ JSON:
  1. title: Основной заголовок. До 70 символов, высокий CTR, ключевые слова ближе к началу. Если правила требуют вопрос — сделай вопрос.
  2. titleVariants: Ровно 3 контрастных варианта (интрига, острая боль/ситуация, конкретные приемы).
  3. description: Полное, глубокое экспертное описание по структуре из системной инструкции${timestampsContext}. КРИТИЧЕСКИ ВАЖНО: в самых первых 200 символах описания ОБЯЗАТЕЛЬНО должны органично присутствовать главные ключевые поисковые запросы по теме ролика! Никаких клише и никакого спама тегами в тексте!
  4. keywords: Ключевые слова через запятую для YouTube Studio (~450-500 символов, смесь высокочастотных и Long-tail поисковых запросов).
  5. hashtags: Массив из 3-5 целевых хештегов с символом #.
  6. pinnedComment: Вовлекающий закрепленный комментарий с открытым вопросом для дискуссии.
  
  ВЕРНИ ТОЛЬКО ЧИСТЫЙ JSON объект с полями: title, titleVariants, description, keywords, hashtags, pinnedComment.`;

  const tools: any[] = [];
  if (options?.deepResearch) {
    tools.push({ googleSearch: {} });
  }

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.1-flash-lite",
    contents: buildContents(prompt, options),
    config: {
      systemInstruction: validateAndEnrichSystemPrompt(systemInstructionText, "", customInst, options),
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          titleVariants: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          description: { type: Type.STRING },
          keywords: { type: Type.STRING },
          hashtags: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          pinnedComment: { type: Type.STRING }
        },
        required: ["title", "titleVariants", "description", "keywords", "hashtags", "pinnedComment"]
      }
    },
    tools: tools.length > 0 ? tools : undefined,
    toolConfig: options?.deepResearch ? { includeServerSideToolInvocations: true } : undefined
  });

  const parsedSEO = safeParseJSON(extractTextFromResponse(response), {
    title: '',
    titleVariants: [],
    description: '',
    keywords: '',
    hashtags: [],
    pinnedComment: ''
  });

  // Enforce custom rules post-processing to guarantee 100% compliance
  const activeCustomText = getActiveCustomInstructionsText(options?.customInstructions);
  return enforceCustomRulesOnVideoSEO(parsedSEO, activeCustomText);
}

/**
 * Expands and upgrades an existing description to the Claude master-level quality standard
 */
export async function expandDescriptionWithAI(
  topic: string,
  currentDescription: string,
  currentTitle: string,
  timestampsText?: string,
  scriptText?: string,
  channelName?: string,
  options?: AnalysisOptions
): Promise<string> {
  const channelContext = channelName ? `Канал: "${channelName}"` : "";
  const scriptSnippet = scriptText && scriptText.trim() ? `\nМатериалы сценария:\n"""\n${scriptText.slice(0, 2500)}\n"""` : "";
  const customInst = getCustomInstructions(options, false);
  const instructionsContext = customInst ? `\nКастомные правила канала:\n${customInst}` : "";

  const prompt = `Перепиши и расширь описание для YouTube видео "${currentTitle || topic}" (${channelContext}) по золотому стандарту YouTube 2026 года.

ТЕКУЩЕЕ ОПИСАНИЕ:
"""
${currentDescription}
"""
${scriptSnippet}
${instructionsContext}

ТАЙМКОДЫ (ОБЯЗАТЕЛЬНО сохрани их точный вид в секции таймкодов):
${timestampsText || "00:00 - Введение"}

ТРЕБОВАНИЯ:
1. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать шаблонные клише ("В этом выпуске мы подробно разберем ключевые аспекты, практические примеры и проверенные решения").
2. СТРОГО ЗАПРЕЩЕНО писать "ТЕГИ И ПОИСКОВЫЕ ЗАПРОСЫ: ..." или вставлять списки тегов через запятую! Тегам не место в тексте описания!
3. СТРУКТУРА:
   - Первые 200 символов (до кнопки «Ещё» / сниппет Google и YouTube Search): ОБЯЗАТЕЛЬНО должны органично содержать главные ключевые поисковые запросы темы ролика + мощный эмоциональный/психологический хук. Поисковые фразы обязаны присутствовать прямо в этих первых 200 символах!
   - Разбор темы по сценарию: конкретные термины, стихи/первоисточники, жизненные кейсы, почему это работает на практике.
   - Блок «В видео вы узнаете:» (4-5 маркированных пунктов —).
   - Почему именно эти шаги (разбор структуры).
   - Дисклеймер (если применимо к теме психологии, медицины, веры, финансов).
   - Секция точных таймкодов.
   - Воронка: призыв подписаться с ценностью канала и @псевдонимом, анонс следующей связанной темы, ссылка на плейлист [ССЫЛКА НА ПЛЕЙЛИСТ].
   - 3-5 хештегов в самом конце (#Хештег1 #Хештег2...).

Верни ТОЛЬКО готовый отформатированный текст описания без вступительных фраз и без кавычек.`;

  try {
    const response = await callGeminiWithRetry({
      model: options?.model || "gemini-3.1-flash-lite",
      contents: buildContents(prompt, options),
      config: {
        systemInstruction: "Ты — экспертный YouTube-копирайтер и сценарист. Создавай глубокие, живые, убедительные описания без капли воды и без клише."
      }
    });
    const text = extractTextFromResponse(response).trim();
    return cleanUpDescriptionTags(text);
  } catch (err) {
    logger.error("Error expanding description with AI:", err);
    throw err;
  }
}

/**
 * Generates true LSI keywords and real long-tail audience search queries
 */
export async function generateLsiKeywordsWithAI(
  topic: string,
  existingKeywords: string,
  scriptContext?: string,
  options?: AnalysisOptions
): Promise<string> {
  const prompt = `Для видео на тему "${topic}" сгенерируй мощный пул LSI ключевых фраз для поля тегов в YouTube Studio.
Уже есть: "${existingKeywords}".
${scriptContext ? `Контекст сценария: ${scriptContext.slice(0, 1000)}` : ""}

ТРЕБОВАНИЯ:
1. Сгенерируй смесь:
   - Высокочастотные ключи (1-2 слова)
   - Среднечастотные фразы
   - Длинные поисковые запросы зрителей (Long-Tail, "как перестать...", "что библия говорит о...", "почему не могу уснуть...")
2. Избегай мусорных тегов вроде "видео 2026", "топ ошибок", "полезные советы".
3. Верни ТОЛЬКО единую строку тегов через запятую (около 400-500 символов суммарно с существующими), без кавычек и лишнего текста.`;

  try {
    const response = await callGeminiWithRetry({
      model: options?.model || "gemini-3.1-flash-lite",
      contents: buildContents(prompt, options),
      config: {
        systemInstruction: "Ты — SEO-специалист по YouTube. Возвращай только строку тегов через запятую."
      }
    });
    const result = extractTextFromResponse(response).trim().replace(/^["']|["']$/g, '');
    return result;
  } catch (err) {
    logger.error("Error generating LSI keywords with AI:", err);
    throw err;
  }
}

/**
 * Removes accidental "TAGS:" keyword stuffing from description text
 */
export function cleanUpDescriptionTags(descriptionText: string): string {
  if (!descriptionText) return "";
  return descriptionText
    .replace(/(?:🔍\s*)?(?:ТЕГИ|КЛЮЧЕВЫЕ СЛОВА|TAGS|KEYWORDS)(?:\s+И\s+ПОИСКОВЫЕ\s+ЗАПРОСЫ)?\s*:[\s\S]*$/i, '')
    .trim();
}

/**
 * Enforces active custom rules directly on VideoSEO fields
 */
export function enforceCustomRulesOnVideoSEO(seo: VideoSEO, customInstructionsText: string): VideoSEO {
  if (!customInstructionsText || !customInstructionsText.trim()) return seo;

  const result: VideoSEO = { 
    ...seo,
    hashtags: Array.isArray(seo.hashtags) ? [...seo.hashtags] : [],
    titleVariants: Array.isArray(seo.titleVariants) ? [...seo.titleVariants] : []
  };
  const text = customInstructionsText;

  // Helper to ensure question formatting
  const makeQuestion = (t: string): string => {
    if (!t || !t.trim()) return t;
    const clean = t.trim();
    if (clean.endsWith('?')) return clean;
    if (/^(как|почему|зачем|что|кто|где|когда|куда|откуда|сколько|правда ли)\b/i.test(clean)) {
      return `${clean.replace(/[.!]+$/, '')}?`;
    }
    return `${clean.replace(/[.!]+$/, '')}?`;
  };

  // 1. Check for required channel handle (@...)
  const handleMatch = text.match(/@([a-zA-Zа-яА-Я0-9_]+)/);
  if (handleMatch) {
    const handle = handleMatch[0];
    if (result.description && !result.description.includes(handle)) {
      result.description = `${handle}\n\n${result.description}`;
    }
  }

  // 2. Check forbidden external links
  const forbidLinks = /запрещено.*(?:не вставляйте|без|никаких).*(?:ссыл|link)/i.test(text);
  if (forbidLinks) {
    const cleanNoLinks = (str: string) => {
      return str
        .replace(/https?:\/\/[^\s]+/gi, '')
        .replace(/t\.me\/[^\s]+/gi, '')
        .replace(/vk\.com\/[^\s]+/gi, '')
        .replace(/wa\.me\/[^\s]+/gi, '')
        .replace(/\[\s*(?:ССЫЛКА|LINK|URL)[^\]]*\]/gi, '')
        .replace(/(?:Ссылка на|Плейлист:|Канал:)\s*\[[^\]]+\]/gi, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    };
    if (result.description) {
      result.description = cleanNoLinks(result.description);
    }
    if (result.pinnedComment) {
      result.pinnedComment = cleanNoLinks(result.pinnedComment);
    }
  }

  // 3. Check hashtag count constraints (e.g., "4 - 5 хештегов")
  const hashtagCountMatch = text.match(/(\d+)\s*[-–—]\s*(\d+)\s*хештег/i);
  if (hashtagCountMatch) {
    const minCount = parseInt(hashtagCountMatch[1], 10);
    const maxCount = parseInt(hashtagCountMatch[2], 10);
    let tags = (Array.isArray(result.hashtags) ? result.hashtags : [])
      .map(t => String(t).trim())
      .filter(Boolean)
      .map(t => t.startsWith('#') ? t : `#${t.replace(/^#+/, '')}`);

    if (maxCount > 0 && tags.length > maxCount) {
      tags = tags.slice(0, maxCount);
    } else if (minCount > 0 && tags.length < minCount) {
      // Collect pool of words from keywords and title
      const pool = [
        ...(result.keywords ? result.keywords.split(/[,;\n]+/) : []),
        ...(result.title ? result.title.split(/[\s:?!,.-]+/) : [])
      ]
        .map(w => w.trim().replace(/^#+/, ''))
        .filter(w => w.length >= 3 && w.length <= 25 && !/^(как|что|для|или|при|это|чем|все|без)$/i.test(w))
        .map(w => `#${w.replace(/\s+/g, '')}`);

      for (const candidate of pool) {
        if (tags.length >= minCount) break;
        if (!tags.some(t => t.toLowerCase() === candidate.toLowerCase())) {
          tags.push(candidate);
        }
      }
    }
    result.hashtags = tags;
  }

  // 4. Questions in title & titleVariants if required
  const wantsQuestions = /фразы[- ]вопросы|вопросительн|заголовок.*вопрос/i.test(text);
  if (wantsQuestions) {
    if (result.title) {
      result.title = makeQuestion(result.title);
    }
    if (result.titleVariants && result.titleVariants.length > 0) {
      result.titleVariants = result.titleVariants.map(v => makeQuestion(v));
    }
  }

  // Ensure titleVariants has 3 solid contrasting options
  if (!result.titleVariants || result.titleVariants.length < 3) {
    const base = result.title || "Видео";
    const cleanBase = base.replace(/[.!?]+$/, '');
    const v1 = wantsQuestions ? makeQuestion(base) : base;
    const v2 = wantsQuestions 
      ? makeQuestion(`Почему опускаются руки: ${cleanBase}`) 
      : `${cleanBase}: главный секрет`;
    const v3 = wantsQuestions 
      ? makeQuestion(`3 шага, которые изменят всё: ${cleanBase}`) 
      : `3 проверенных правила: ${cleanBase}`;
    result.titleVariants = [v1, v2, v3];
  }

  // 5. Ensure primary key queries are in the first 200 characters of description if rule requested
  const wantsKeywordsInFirst200 = /200\s*символ.*ключев|ключев.*200\s*символ/i.test(text);
  if (wantsKeywordsInFirst200 && result.description) {
    const rawKw = result.keywords ? result.keywords.split(/[,;\n]+/).map(k => k.trim()).filter(Boolean) : [];
    if (rawKw.length > 0) {
      const topKw = rawKw[0];
      const first200 = result.description.slice(0, 200).toLowerCase();
      const hasKeyInFirst200 = rawKw.some(kw => kw.length >= 4 && first200.includes(kw.toLowerCase()));
      if (!hasKeyInFirst200) {
        result.description = `${topKw} — главное в этом видео:\n${result.description}`.trim();
      }
    }
  }

  return result;
}

/**
 * Deterministic audit of custom rules to ensure complete accuracy
 */
export function auditCustomRulesDeterministically(
  seo: VideoSEO,
  customInstructionsText: string
): { totalRules: number; passedRules: number; items: CustomRuleAuditItem[]; ruleImprovements: any[] } {
  const items: CustomRuleAuditItem[] = [];
  const ruleImprovements: any[] = [];
  if (!customInstructionsText || !customInstructionsText.trim()) {
    return { totalRules: 0, passedRules: 0, items: [], ruleImprovements: [] };
  }

  const text = customInstructionsText;

  // Rule 1: Check Channel Handle requirement (@...)
  const handleMatch = text.match(/@([a-zA-Zа-яА-Я0-9_]+)/);
  if (handleMatch) {
    const requiredHandle = handleMatch[0];
    const hasHandle = (seo.description || "").includes(requiredHandle) || (seo.pinnedComment || "").includes(requiredHandle);
    if (hasHandle) {
      items.push({
        ruleTitle: `Псевдоним канала (${requiredHandle})`,
        status: 'passed',
        details: `Псевдоним ${requiredHandle} корректно указан в описании видео.`
      });
    } else {
      const fixedDesc = `${requiredHandle}\n\n${seo.description || ''}`.trim();
      items.push({
        ruleTitle: `Псевдоним канала (${requiredHandle})`,
        status: 'failed',
        details: `В описании видео отсутствует обязательный псевдоним ${requiredHandle}, указанный в правиле.`,
        suggestedFix: fixedDesc,
        targetField: 'description'
      });
      ruleImprovements.push({
        area: 'Описание (Кастомное правило)',
        suggestion: `Включить обязательный псевдоним ${requiredHandle} в описание видео`,
        suggestedValue: fixedDesc,
        impact: 'high',
        isRuleViolation: true,
        ruleTitle: `Псевдоним канала (${requiredHandle})`
      });
    }
  }

  // Rule 2: Check forbidden external links
  const forbidLinks = /запрещено.*(?:не вставляйте|без|никаких).*(?:ссыл|link)/i.test(text);
  if (forbidLinks) {
    const hasLinksInDesc = /https?:\/\/[^\s]+|t\.me\/[^\s]+/i.test(seo.description || "");
    const hasLinksInComment = /https?:\/\/[^\s]+|t\.me\/[^\s]+/i.test(seo.pinnedComment || "");
    if (!hasLinksInDesc && !hasLinksInComment) {
      items.push({
        ruleTitle: 'Запрет внешних ссылок',
        status: 'passed',
        details: 'В описании и закрепленном комментарии отсутствуют запрещенные сторонние ссылки.'
      });
    } else {
      const cleanedDesc = (seo.description || "")
        .replace(/https?:\/\/[^\s]+/gi, '')
        .replace(/t\.me\/[^\s]+/gi, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      items.push({
        ruleTitle: 'Запрет внешних ссылок',
        status: 'failed',
        details: 'В метаданных обнаружены внешние ссылки, которые запрещены активным правилом.',
        suggestedFix: cleanedDesc,
        targetField: 'description'
      });
      ruleImprovements.push({
        area: 'Описание (Кастомное правило)',
        suggestion: 'Удалить запрещенные ссылки из описания согласно правилу',
        suggestedValue: cleanedDesc,
        impact: 'high',
        isRuleViolation: true,
        ruleTitle: 'Запрет внешних ссылок'
      });
    }
  }

  // Rule 3: Check hashtag count constraint (e.g. 4-5 hashtags)
  const hashtagCountMatch = text.match(/(\d+)\s*[-–—]\s*(\d+)\s*хештег/i);
  if (hashtagCountMatch) {
    const minTags = parseInt(hashtagCountMatch[1], 10);
    const maxTags = parseInt(hashtagCountMatch[2], 10);
    const tagsCount = Array.isArray(seo.hashtags) ? seo.hashtags.length : (seo.hashtags ? String(seo.hashtags).split(',').length : 0);
    if (tagsCount >= minTags && tagsCount <= maxTags) {
      items.push({
        ruleTitle: `Лимит хештегов (${minTags}-${maxTags})`,
        status: 'passed',
        details: `Количество хештегов (${tagsCount}) соответствует требованию правила (${minTags}-${maxTags} шт.).`
      });
    } else {
      const currentList = Array.isArray(seo.hashtags) ? [...seo.hashtags] : [];
      let adjustedList = currentList;
      if (currentList.length > maxTags) {
        adjustedList = currentList.slice(0, maxTags);
      }
      const fixStr = adjustedList.join(', ');
      items.push({
        ruleTitle: `Лимит хештегов (${minTags}-${maxTags})`,
        status: tagsCount > maxTags ? 'failed' : 'warning',
        details: `Указано ${tagsCount} хештегов, в то время как правило требует строго от ${minTags} до ${maxTags}.`,
        suggestedFix: fixStr,
        targetField: 'hashtags'
      });
      ruleImprovements.push({
        area: 'Хештеги (Кастомное правило)',
        suggestion: `Скорректировать количество хештегов до ${minTags}-${maxTags} шт.`,
        suggestedValue: fixStr,
        impact: 'medium',
        isRuleViolation: true,
        ruleTitle: `Лимит хештегов (${minTags}-${maxTags})`
      });
    }
  }

  // Rule 4: Check questions in title / search queries
  const wantsQuestions = /фразы[- ]вопросы|вопросительн|заголовок.*вопрос/i.test(text);
  if (wantsQuestions && seo.title) {
    const hasQuestion = seo.title.includes('?') || /как|почему|зачем|что|кто|где|когда/i.test(seo.title);
    if (hasQuestion) {
      items.push({
        ruleTitle: 'Фразы-вопросы в заголовке',
        status: 'passed',
        details: 'Заголовок содержит вопросительную конструкцию для органического поиска.'
      });
    } else {
      const questionTitle = `${seo.title.replace(/[.!]+$/, '')}?`;
      items.push({
        ruleTitle: 'Фразы-вопросы в заголовке',
        status: 'warning',
        details: 'В заголовке не обнаружен явный вопросительный паттерн, рекомендованный правилом.',
        suggestedFix: questionTitle,
        targetField: 'title'
      });
      ruleImprovements.push({
        area: 'Заголовок (Кастомное правило)',
        suggestion: 'Сформулировать заголовок как цепляющий поисковый вопрос',
        suggestedValue: questionTitle,
        impact: 'medium',
        isRuleViolation: true,
        ruleTitle: 'Фразы-вопросы в заголовке'
      });
    }
  }

  // Rule 5: Check keyword presence in first 200 characters of description
  const wantsKeywordsInFirst200 = /200\s*символ.*ключев|ключев.*200\s*символ/i.test(text);
  if (wantsKeywordsInFirst200 && seo.description) {
    const rawKw = seo.keywords ? seo.keywords.split(/[,;\n]+/).map(k => k.trim()).filter(Boolean) : [];
    const first200 = (seo.description || "").slice(0, 200).toLowerCase();
    const hasKeyInFirst200 = rawKw.some(kw => kw.length >= 4 && first200.includes(kw.toLowerCase()));
    if (hasKeyInFirst200) {
      items.push({
        ruleTitle: 'Ключевые запросы в первых 200 символах описания',
        status: 'passed',
        details: 'В первых 200 символах описания присутствуют ключевые поисковые запросы согласно правилу.'
      });
    } else {
      const topKw = rawKw[0] || 'Главный поисковый запрос';
      const fixedDesc = `${topKw} — главное в этом видео:\n${seo.description || ''}`.trim();
      items.push({
        ruleTitle: 'Ключевые запросы в первых 200 символах описания',
        status: 'failed',
        details: 'В первых 200 символах описания отсутствуют ключевые поисковые запросы, требуемые правилом.',
        suggestedFix: fixedDesc,
        targetField: 'description'
      });
      ruleImprovements.push({
        area: 'Описание (Кастомное правило)',
        suggestion: 'Добавить ключевые запросы в первые 200 символов описания видео для SEO',
        suggestedValue: fixedDesc,
        impact: 'high',
        isRuleViolation: true,
        ruleTitle: 'Ключевые запросы в первых 200 символах описания'
      });
    }
  }

  const totalRules = items.length;
  const passedRules = items.filter(i => i.status === 'passed').length;

  return { totalRules, passedRules, items, ruleImprovements };
}

export async function analyzeSEOAndSuggestImprovements(
  idea: string,
  niche: string,
  seo: VideoSEO,
  options?: AnalysisOptions
): Promise<SEOAnalysis> {
  const researchContext = options?.deepResearch ? "\nИспользуй Google Поиск для поиска актуальных трендов и самых эффективных ключевых слов в этой нише прямо сейчас." : "";
  const sourcesContext = getSourcesContext(options);
  const customInst = getCustomInstructions(options, false);
  const activeCustomText = getActiveCustomInstructionsText(options?.customInstructions);
  const instructionsContext = customInst 
    ? `\n\n[🚨 ВЫСШИЙ ПРИОРИТЕТ: АКТИВНЫЕ КАСТОМНЫЕ ПРАВИЛА И ТРЕБОВАНИЯ ПОЛЬЗОВАТЕЛЯ ДЛЯ АУДИТА]:\n"""\n${customInst}\n"""\n(ТЫ ОБЯЗАН провести тщательный аудит соблюдения каждого пункта кастомных правил выше!)\n` 
    : '';

  const prompt = `Проведи глубокий профессиональный SEO-аудит метаданных YouTube видео на тему "${idea}" в нише "${niche}".${researchContext}${sourcesContext}${instructionsContext}
  
  Текущие метаданные для проверки:
  Заголовок (Title): ${seo.title || "Не указан"}
  Описание (Description): ${seo.description || "Не указано"}
  Ключевые слова/теги (Keywords): ${seo.keywords || "Не указаны"}
  Хештеги (Hashtags): ${Array.isArray(seo.hashtags) ? seo.hashtags.join(', ') : (seo.hashtags || 'Не указаны')}
  Закрепленный комментарий (Pinned Comment): ${seo.pinnedComment || "Не указан"}
  
  ТВОИ ЗАДАЧИ АУДИТА:
  1. АУДИТ КАСТОМНЫХ ПРАВИЛ: Если выше заданы кастомные правила, детально проверь выполнение КАЖДОГО правила/пункта (наличие обязательного псевдонима/хэндла канала, запрет на сторонние ссылки, точное количество хештегов, формат заголовка, структура описания и т.д.). Для каждого правила определи статус: 'passed' (полностью соблюдено), 'failed' (нарушено) или 'warning' (частично выполнено), опиши точную причину на русском языке и дай готовое исправление (suggestedFix) с указанием целевого поля (targetField).
  2. ОЦЕНКА КАЧЕСТВА (Score Breakdown): Оцени заголовок (titleScore: 0-100), описание (descriptionScore: 0-100), ключевые слова (keywordsScore: 0-100) и соблюдение кастомных правил (rulesComplianceScore: 0-100).
     ВАЖНО ДЛЯ ОПИСАНИЯ: Строго проверь наличие главных поисковых ключевых запросов в ПЕРВЫХ 200 СИМВОЛАХ описания (зона сниппета Google и YouTube до кнопки «Ещё»). Если в первых 200 символах нет ключевых запросов по теме — снижай descriptionScore (не выше 70) и ОБЯЗАТЕЛЬНО добавь рекомендацию в improvements с готовым текстом первых 200 символов, содержащим ключевые фразы! Рассчитай общий сбалансированный балл score (0-100). Если активные правила нарушены, общий балл обязан снижаться!
  3. СПИСОК РЕКОМЕНДАЦИЙ (improvements): Сформулируй четкие, практические предложения по улучшению на русском языке. Если есть нарушения кастомных правил, обязательно добавь их в этот список с флагом isRuleViolation: true и ruleTitle! Укажи точный готовый исправленный текст (suggestedValue), чтобы пользователь мог применить его в 1 клик. Поле area указывай на русском языке: "Заголовок", "Описание", "Ключевые слова", "Хештеги" или "Закрепленный комментарий".
  4. СЕМАНТИЧЕСКОЕ ЯДРО (keywords):
     - highFrequency: 10 эффективных высокочастотных ключевых слов на русском языке.
     - lowFrequency: 10 целевых низкочастотных (Long-tail) запросов на русском языке.
     - searchQueries: 5-8 реальных поисковых фраз, которые пользователи вводят в строку поиска YouTube/Google.
  5. ПРОГНОЗ CTR (ctrPrediction): Оцени прогнозируемый CTR ролика (predictedCtr, например 6.8%), бенчмарк ниши на русском (benchmark, например "5-8% в нише") и главное практическое действие на русском языке для роста кликабельности (advice).
  6. СОВЕТЫ GOOGLE & YOUTUBE SEARCH: 3-5 конкретных тактик продвижения и вывода видео в ТОП выдачи на русском языке.
  
  [🚨 СТРОЖАЙШЕЕ ТРЕБОВАНИЕ К ЯЗЫКУ]:
  ВСЕ тексты, комментарии, описания, анализ (analysis), советы (advice), рекомендации (suggestion), названия полей area ("Заголовок", "Описание", "Ключевые слова", "Хештеги", "Закрепленный комментарий") и тексты исправлений ДОЛЖНЫ БЫТЬ СТРОГО НА РУССКОМ ЯЗЫКЕ! Запрещено выводить пояснения на английском.`;

  const tools: any[] = [];
  if (options?.deepResearch) {
    tools.push({ googleSearch: {} });
  }

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.1-flash-lite",
    contents: buildContents(prompt, options),
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          analysis: { type: Type.STRING },
          scoreBreakdown: {
            type: Type.OBJECT,
            properties: {
              titleScore: { type: Type.NUMBER },
              descriptionScore: { type: Type.NUMBER },
              keywordsScore: { type: Type.NUMBER },
              rulesComplianceScore: { type: Type.NUMBER }
            },
            required: ["titleScore", "descriptionScore", "keywordsScore", "rulesComplianceScore"]
          },
          improvements: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                area: { type: Type.STRING, description: "Area of improvement (title, description, keywords, hashtags)" },
                suggestion: { type: Type.STRING },
                suggestedValue: { type: Type.STRING, description: "The actual corrected text for this area" },
                impact: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
                isRuleViolation: { type: Type.BOOLEAN },
                ruleTitle: { type: Type.STRING }
              },
              required: ["area", "suggestion", "suggestedValue", "impact"]
            }
          },
          keywords: {
            type: Type.OBJECT,
            properties: {
              highFrequency: { type: Type.ARRAY, items: { type: Type.STRING } },
              lowFrequency: { type: Type.ARRAY, items: { type: Type.STRING } },
              searchQueries: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["highFrequency", "lowFrequency"]
          },
          googleSearchTips: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          customRulesAudit: {
            type: Type.OBJECT,
            properties: {
              totalRules: { type: Type.NUMBER },
              passedRules: { type: Type.NUMBER },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    ruleTitle: { type: Type.STRING },
                    status: { type: Type.STRING, enum: ['passed', 'failed', 'warning'] },
                    details: { type: Type.STRING },
                    suggestedFix: { type: Type.STRING },
                    targetField: { type: Type.STRING, enum: ['title', 'description', 'keywords', 'hashtags', 'pinnedComment', 'all'] }
                  },
                  required: ["ruleTitle", "status", "details"]
                }
              }
            },
            required: ["totalRules", "passedRules", "items"]
          },
          ctrPrediction: {
            type: Type.OBJECT,
            properties: {
              predictedCtr: { type: Type.NUMBER },
              benchmark: { type: Type.STRING },
              advice: { type: Type.STRING }
            },
            required: ["predictedCtr", "benchmark", "advice"]
          }
        },
        required: ["score", "analysis", "improvements", "keywords", "googleSearchTips"]
      }
    },
    tools: tools.length > 0 ? tools : undefined,
    toolConfig: options?.deepResearch ? { includeServerSideToolInvocations: true } : undefined
  });

  const parsed = safeParseJSON<SEOAnalysis>(extractTextFromResponse(response), { 
    score: 0, 
    analysis: '', 
    improvements: [] 
  });

  // Always augment with deterministic custom rules audit for guaranteed accuracy
  const deterministicAudit = auditCustomRulesDeterministically(seo, activeCustomText);
  if (deterministicAudit.totalRules > 0) {
    if (!parsed.customRulesAudit || !parsed.customRulesAudit.items || parsed.customRulesAudit.items.length === 0) {
      parsed.customRulesAudit = {
        totalRules: deterministicAudit.totalRules,
        passedRules: deterministicAudit.passedRules,
        items: deterministicAudit.items
      };
    } else {
      // Merge deterministic checks if any rule was missed
      deterministicAudit.items.forEach(dItem => {
        const exists = parsed.customRulesAudit!.items.some(
          mItem => mItem.ruleTitle.toLowerCase().includes(dItem.ruleTitle.toLowerCase().slice(0, 10))
        );
        if (!exists) {
          parsed.customRulesAudit!.items.push(dItem);
        }
      });
      parsed.customRulesAudit.totalRules = parsed.customRulesAudit.items.length;
      parsed.customRulesAudit.passedRules = parsed.customRulesAudit.items.filter(i => i.status === 'passed').length;
    }

    // Add any missing rule violations into improvements
    deterministicAudit.ruleImprovements.forEach(rImp => {
      const alreadyIncluded = (parsed.improvements || []).some(
        imp => imp.ruleTitle === rImp.ruleTitle || imp.suggestion.toLowerCase().includes(rImp.ruleTitle.toLowerCase().slice(0, 10))
      );
      if (!alreadyIncluded) {
        parsed.improvements.unshift(rImp);
      }
    });

    // Recalculate rules compliance score
    const rulesScore = Math.round((parsed.customRulesAudit.passedRules / Math.max(1, parsed.customRulesAudit.totalRules)) * 100);
    if (!parsed.scoreBreakdown) {
      parsed.scoreBreakdown = {
        titleScore: Math.min(100, Math.max(40, parsed.score || 70)),
        descriptionScore: Math.min(100, Math.max(40, parsed.score || 70)),
        keywordsScore: Math.min(100, Math.max(40, parsed.score || 70)),
        rulesComplianceScore: rulesScore
      };
    } else {
      parsed.scoreBreakdown.rulesComplianceScore = rulesScore;
    }

    // Weight the total score with rules compliance
    if (parsed.customRulesAudit.passedRules < parsed.customRulesAudit.totalRules) {
      const penalty = (parsed.customRulesAudit.totalRules - parsed.customRulesAudit.passedRules) * 12;
      parsed.score = Math.max(25, (parsed.score || 75) - penalty);
    }
  }

  // Ensure all improvement area labels are in Russian
  const areaMapping: Record<string, string> = {
    title: 'Заголовок',
    description: 'Описание',
    keywords: 'Ключевые слова',
    hashtags: 'Хештеги',
    pinnedcomment: 'Закрепленный комментарий',
    'pinned comment': 'Закрепленный комментарий',
    custom_rules: 'Кастомные правила',
    rules: 'Кастомные правила'
  };

  if (parsed.improvements && Array.isArray(parsed.improvements)) {
    parsed.improvements.forEach(imp => {
      const lower = (imp.area || '').toLowerCase().trim();
      if (areaMapping[lower]) {
        imp.area = areaMapping[lower];
      }
    });
  }

  return parsed;
}



export async function generateHookVariations(idea: string, niche: string, fullScript?: string, competitorAnalysis?: string, options?: AnalysisOptions): Promise<TextVariation[]> {
  const competitorContext = competitorAnalysis ? `
Учитывай слабости конкурентов: ${competitorAnalysis}` : "";
  const scriptContext = fullScript ? `
Контекст текущего сценария: ${fullScript}` : "";
  const prompt = `Сгенерируй 3 варианта цепляющего хука (вступления) для YouTube видео на тему "${idea}" в нише "${niche}".
${competitorContext}${scriptContext}
Хук должен быть виральным, удерживать внимание с первых секунд и соответствовать нише. Сделай его подходящим под данный сценарий.

Для каждого варианта верни:
1. text: сам текст хука.
2. reason: краткое обоснование, почему этот хук сработает (с точки зрения психологии и удержания).

Верни JSON массив объектов TextVariation { text: string, reason: string }.`;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.1-flash-lite",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            reason: { type: Type.STRING }
          },
          required: ["text", "reason"]
        }
      }
    }
  });

  return safeParseJSON<TextVariation[]>(extractTextFromResponse(response), []);
}


export async function generateCTAVariations(idea: string, niche: string, fullScript?: string, options?: AnalysisOptions): Promise<TextVariation[]> {
  const scriptContext = fullScript ? `
Контекст текущего сценария: ${fullScript}` : "";
  const prompt = `Сгенерируй 3 варианта мощного призыва к действию (CTA) для концовки YouTube видео на тему "${idea}" в нише "${niche}".
Каждый CTA должен мотивировать подписаться и оставить комментарий.${scriptContext}

Для каждого варианта верни:
1. text: сам текст призыва к действию.
2. reason: обоснование эффективности.

Верни JSON массив объектов TextVariation { text: string, reason: string }.`;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.1-flash-lite",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            reason: { type: Type.STRING }
          },
          required: ["text", "reason"]
        }
      }
    }
  });

  return safeParseJSON<TextVariation[]>(extractTextFromResponse(response), []);
}


export async function generatePromotionStrategies(idea: string, niche: string, fullScript?: string, competitorAnalysis?: string, options?: AnalysisOptions): Promise<PromotionStrategy[]> {
  const competitorContext = competitorAnalysis ? `
Учитывай слабости конкурентов: ${competitorAnalysis}` : "";
  const scriptContext = fullScript ? `
Текст сценария для контекста: ${fullScript}` : "";
  const prompt = `Предложи 3 стратегии продвижения для YouTube видео на тему "${idea}" в нише "${niche}".
Учитывай специфику форматов контента и перекрестное опыление через другие платформы.
${competitorContext}${scriptContext}

Для каждой стратегии верни:
1. strategy: Название стратегии.
2. description: Описание.
3. actionableSteps: Массив конкретных шагов (3-5 штук), включая взаимодействие с аудиторией или посев.

Верни JSON массив объектов PromotionStrategy { strategy: string, description: string, actionableSteps: string[] }.`;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.1-flash-lite",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            strategy: { type: Type.STRING },
            description: { type: Type.STRING },
            actionableSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["strategy", "description", "actionableSteps"]
        }
      }
    }
  });

  return safeParseJSON<PromotionStrategy[]>(extractTextFromResponse(response), []);
}


export async function generateVideoCTA(idea: string, niche: string, options?: AnalysisOptions): Promise<string> {
  const prompt = `Сгенерируй мощный, цепляющий и профессиональный призыв к действию (CTA - Call To Action) 
для YouTube видео на тему "${idea}" в нише "${niche}". 

Это должен быть текст (2-4 предложения), который зритель услышит или прочтет в конце видео. 
Текст должен мотивировать подписаться, поставить лайк или оставить осмысленный комментарий, не будучи слишком навязчивым.

Верни только текст призыва, без дополнительных объяснений или кавычек. Учитывай специфику ниши.`;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.1-flash-lite",
    contents: prompt
  });

  return extractTextFromResponse(response) || '';
}




export async function analyzeTitlesUniqueness(
  titles: string[],
  topic: string,
  niche: string,
  options?: AnalysisOptions
): Promise<TitleAnalysis> {
  const detectedLang = titles.some(t => /[а-яА-Я]/.test(t)) ? 'русском' : 'английском';
  const prompt = `Проанализируй следующие заголовки для YouTube видео на тему "${topic}" в нише "${niche}":
  
  Заголовки:
  ${titles.map((t, i) => `${i + 1}. ${t}`).join('\n')}
  
  Твоя задача:
  1. Проверь заголовки на уникальность, кликбейтность и конкурентоспособность.
  2. Определи, не являются ли они слишком типичными или "заезженными" для этой темы.
  3. Сгенерируй 5 кликбейтных и SEO-оптимизированных заголовков для видео на тему YouTube Shorts (или адаптируй текущую тему под формат Shorts) на ${detectedLang} языке.
  4. Обоснуй (analysis), почему текущие заголовки могут быть слабыми или на какие тренды они опираются.
  
  Верни JSON объект с полями: analysis, alternatives (массив строк).
  Весь ответ должен быть на русском языке, но альтернативные заголовки - на ${detectedLang} языке.`;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.1-flash-lite",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          analysis: { type: Type.STRING },
          alternatives: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["analysis", "alternatives"]
      }
    }
  });

  return safeParseJSON(extractTextFromResponse(response), { analysis: '', alternatives: [] });
}


export async function translateContent(text: string, targetLanguage: string, options?: AnalysisOptions): Promise<string> {
  const prompt = `Переведи следующий текст на ${targetLanguage}. 
  Сохраняй стиль, эмоциональный окрас и структуру. 
  Если это сценарий, убедись, что он звучит естественно для носителя языка.
  
  Текст для перевода:
  ${text}`;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.1-flash-lite",
    contents: prompt,
  });

  return extractTextFromResponse(response) || "";
}




export async function evaluateCTR(title: string, thumbnailBase64?: string): Promise<{ 
  ctr: string; 
  reasoning: string;
  score: number;
  estimatedCTR: string;
  feedback: string;
  suggestions: string[];
}> {
  const prompt = `Ты — эксперт по YouTube, специализирующийся на анализе кликабельности (CTR) видео. 
Оцени потенциальный CTR для видео с заголовком: "${title}".
${thumbnailBase64 ? 'Также проанализируй приложенную миниатюру видео.' : 'Миниатюра не предоставлена, оценивай только заголовок.'}

Учитывай цепляющий ли заголовок, вызывает ли он эмоции или любопытство, насколько хорошо миниатюра (если есть) привлекает внимание и дополняет заголовок.
Выдай оценку CTR в процентах (например, "7.5%"), числовую оценку качества от 1 до 100 (score), детальное обоснование (reasoning/feedback) и 2-3 практических совета по улучшению.

Верни ответ СТРОГО в формате JSON:
{
  "ctr": "7.5%",
  "reasoning": "подробное обоснование",
  "score": 82,
  "estimatedCTR": "7.5%",
  "feedback": "краткий текстовый вывод",
  "suggestions": ["совет 1", "совет 2"]
}`;

  const options: AnalysisOptions = {};
  if (thumbnailBase64 && thumbnailBase64.startsWith('data:image/')) {
    const base64Data = thumbnailBase64.replace(/^data:image\/\w+;base64,/, "");
    options.sources = [{
      type: 'file',
      mimeType: 'image/jpeg',
      data: base64Data,
      name: 'thumbnail.jpg'
    }];
  }

  try {
    const response = await callGeminiWithRetry({
      model: options?.model || "gemini-3.1-flash-lite",
      contents: buildContents(prompt, options),
      config: {
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ctr: { type: Type.STRING },
            reasoning: { type: Type.STRING },
            score: { type: Type.INTEGER },
            estimatedCTR: { type: Type.STRING },
            feedback: { type: Type.STRING },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["ctr", "reasoning", "score", "estimatedCTR", "feedback", "suggestions"]
        },
        responseMimeType: "application/json"
      }
    });

    const parsed = safeParseJSON<any>(extractTextFromResponse(response), {});
    return {
      ctr: parsed.ctr || parsed.estimatedCTR || "7.0%",
      reasoning: parsed.reasoning || parsed.feedback || "Хороший заголовок и концепция превью.",
      score: parsed.score ?? 75,
      estimatedCTR: parsed.estimatedCTR || parsed.ctr || "7.0%",
      feedback: parsed.feedback || parsed.reasoning || "Хороший заголовок и концепция превью.",
      suggestions: parsed.suggestions || ["Добавьте эмоций в заголовок", "Сделайте акцент на превью"]
    };
  } catch (error) {
    logger.error("Error in evaluateCTR:", error);
    return { 
      ctr: "N/A", 
      reasoning: "Произошла ошибка при анализе.",
      score: 50,
      estimatedCTR: "5.0%",
      feedback: "Произошла ошибка при анализе.",
      suggestions: ["Попробуйте повторить оценку"]
    };
  }
}


export async function optimizeTitle(currentTitle: string, options?: AnalysisOptions): Promise<string> {
  const prompt = `Ты — профессиональный YouTube-маркетолог.
Твоя задача: проанализировать текущий заголовок видео и предложить ОДИН новый вариант, который будет максимально привлекательным, интригующим и способствующим высокому CTR (кликабельности).
Используй психологические триггеры (любопытство, срочность, цифры, интрига), но избегай запрещенного контента.
Заголовок должен быть на русском языке.
Верни ТОЛЬКО текст заголовка, без лишних знаков, кавычек или пояснений.

Текущий заголовок: "${currentTitle}"`;

  try {
    const response = await callGeminiWithRetry({
      model: options?.model || "gemini-3.1-flash-lite",
      contents: buildContents(prompt)
    });
    
    const text = extractTextFromResponse(response);
    if (!text) {
      throw new Error("Не удалось получить ответ от AI");
    }
    
    return text.trim().replace(/^["']|["']$/g, '');
  } catch (error) {
    logger.error("Error in optimizeTitle:", error);
    throw error;
  }
}

export interface IdeaAlternativesResult {
  optimizedTitle: string;
  alternativeTitles: string[];
  alternativeDescription: string;
}

export async function generateIdeaAlternatives(
  ideaTitle: string,
  ideaDescription?: string,
  niche?: string,
  options?: AnalysisOptions
): Promise<IdeaAlternativesResult> {
  // Call optimizeTitle as required
  const primaryOptimized = await optimizeTitle(ideaTitle, options);
  
  const customInst = getCustomInstructions(options);
  const prompt = `Ты — ведущий YouTube-продюсер и эксперт по высокому CTR и удержанию.
Для темы видео на YouTube: "${ideaTitle}"
${ideaDescription ? `Текущее описание: "${ideaDescription}"` : ""}
${niche ? `Ниша канала: "${niche}"` : ""}
${customInst}

Предложи:
1. 2 дополнительных альтернативных цепляющих заголовка в разных стилях (например: интригующий вопрос, клик-триггер с парадоксом, точный разбор с цифрами).
2. 1 компактное (2-3 предложения), захватывающее альтернативное описание/тизер видео для YouTube, стимулирующее досмотр.

Верни ответ строго в формате JSON:
{
  "alternativeTitles": ["Заголовок вариант 1", "Заголовок вариант 2"],
  "alternativeDescription": "Текст краткого захватывающего описания/тизера..."
}

ОБЯЗАТЕЛЬНО используй букву "ё" во всех словах, где она пишется.`;

  try {
    const response = await callGeminiWithRetry({
      model: options?.model || "gemini-3.1-flash-lite",
      contents: buildContents(prompt)
    });
    const text = extractTextFromResponse(response);
    let parsed: { alternativeTitles?: string[]; alternativeDescription?: string } = {};
    if (text) {
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        logger.warn("Could not parse JSON in generateIdeaAlternatives:", e);
      }
    }

    const uniqueTitles = [primaryOptimized, ...(parsed.alternativeTitles || [])]
      .map(t => t.trim().replace(/^["']|["']$/g, ''))
      .filter((t, idx, self) => t && self.indexOf(t) === idx && t !== ideaTitle);

    return {
      optimizedTitle: primaryOptimized,
      alternativeTitles: uniqueTitles.length > 0 ? uniqueTitles : [primaryOptimized],
      alternativeDescription: (parsed.alternativeDescription || `Подробный разбор и ключевые секреты темы "${primaryOptimized}". Узнайте главные факты, проверенные рекомендации и неочевидные нюансы в этом видео!`).trim()
    };
  } catch (error) {
    logger.warn("Secondary alternatives error, returning primary optimizedTitle:", error);
    return {
      optimizedTitle: primaryOptimized,
      alternativeTitles: [primaryOptimized],
      alternativeDescription: `Узнайте всё самое важное по теме "${primaryOptimized}". Пошаговый разбор и практические рекомендации.`
    };
  }
}

/**
 * Generates 3 contrasting click-worthy title variants for YouTube A/B testing
 */
export async function generate3TitleVariantsAI(
  topic: string,
  niche: string = "Общая",
  currentTitle?: string,
  options?: AnalysisOptions
): Promise<string[]> {
  const customInst = getCustomInstructions(options, false);
  const activeCustomText = getActiveCustomInstructionsText(options?.customInstructions) || customInst;
  const wantsQuestions = /фразы[- ]вопросы|вопросительн|заголовок.*вопрос/i.test(activeCustomText);

  const makeQuestion = (t: string): string => {
    if (!t || !t.trim()) return t;
    const clean = t.trim();
    if (clean.endsWith('?')) return clean;
    if (/^(как|почему|зачем|что|кто|где|когда|куда|откуда|сколько|правда ли)\b/i.test(clean)) {
      return `${clean.replace(/[.!]+$/, '')}?`;
    }
    return `${clean.replace(/[.!]+$/, '')}?`;
  };

  const questionRequirement = wantsQuestions 
    ? "\nКРИТИЧЕСКИ ВАЖНОЕ ПРАВИЛО: Каждый из 3 заголовков ОБЯЗАН быть сформулирован как цепляющий поисковый вопрос и оканчиваться вопросительным знаком (?)"
    : "";

  const prompt = `Ты — ведущий YouTube-продюсер с опытом продвижения каналов-миллионников.
Для темы видео: "${topic}" ${currentTitle ? `(текущий заголовок: "${currentTitle}")` : ""} в нише "${niche}".
${activeCustomText ? `Кастомные правила канала:\n${activeCustomText}` : ""}${questionRequirement}

Сгенерируй ровно 3 контрастных, кликабельных варианта заголовка для YouTube (каждый до 70 символов, высокий CTR, без клише):
1. Вариант через интригу / скрытую тайну / неочевидный факт
2. Вариант через острую боль зрителя / конкретную жизненную ситуацию (например: "в 3 часа ночи", "когда опускаются руки")
3. Вариант через конкретное число действий / приемов / практический шаг (например: "3 движения против...", "3 приёма, которые...")

Верни ТОЛЬКО JSON массив из 3 строк:
["Вариант 1", "Вариант 2", "Вариант 3"]`;

  try {
    const response = await callGeminiWithRetry({
      model: options?.model || "gemini-3.1-flash-lite",
      contents: buildContents(prompt, options),
      config: {
        responseMimeType: "application/json"
      }
    });
    const text = extractTextFromResponse(response);
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const list = parsed.slice(0, 3).map(s => String(s).trim().replace(/^["']|["']$/g, ''));
      return wantsQuestions ? list.map(t => makeQuestion(t)) : list;
    }
  } catch (e) {
    logger.warn("generate3TitleVariantsAI failed:", e);
  }

  const rawFallback = [
    currentTitle || topic,
    wantsQuestions ? `Как победить ${topic}?` : `${topic}: что важно знать`,
    wantsQuestions ? `Почему опускаются руки при ${topic}?` : `3 главных правила: ${topic}`
  ];
  return wantsQuestions ? rawFallback.map(t => makeQuestion(t)) : rawFallback;
}


export async function generateChannelSEO(
  niche: string,
  channelName: string,
  competitorAnalysis?: string,
  options?: AnalysisOptions
): Promise<{ description: string; keywords: string; hashtags: string[] }> {
  const customInst = getCustomInstructions(options);
  const competitorContext = competitorAnalysis ? `
Учитывай анализ конкурентов:
${competitorAnalysis}` : "";
  const prompt = `Сгенерируй SEO оптимизированное описание канала и метаданные для YouTube канала.
  Название канала: "${channelName}"
  Ниша: "${niche}"${competitorContext}
  ${customInst}
  
  Верни JSON объект со следующими полями:
  - description: строка (SEO описание канала, 3-4 предложения, вовлекающее, с ключевыми словами)
  - keywords: строка (через запятую, список релевантных ключевых слов, около 300-500 символов)
  - hashtags: массив строк (список релевантных хештегов)
  
  ОБЯЗАТЕЛЬНО используй букву "ё" во всех словах, где она пишется.`;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.1-flash-lite",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          keywords: { type: Type.STRING },
          hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["description", "keywords", "hashtags"]
      }
    }
  });

  return safeParseJSON<{ description: string; keywords: string; hashtags: string[] }>(
    extractTextFromResponse(response),
    { description: "", keywords: "", hashtags: [] }
  );
}

export interface YouTubeChapterItem {
  timeCode: string;
  title: string;
}

/**
 * Generates high-retention YouTube chapters/timestamps with clickable titles,
 * adhering strictly to YouTube standards (starts at 00:00, >= 3 chapters, compelling titles).
 */
export async function generateYouTubeChaptersAI(
  topic: string,
  title: string,
  scriptText: string,
  options?: {
    model?: string;
    customInstructions?: string;
    targetDurationSec?: number;
  }
): Promise<YouTubeChapterItem[]> {
  const customInst = getCustomInstructions(options);
  const cleanScript = (scriptText || "")
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/<[^>]+>/g, " ")
    .slice(0, 10000)
    .trim();

  const prompt = `Ты — ведущий YouTube-стратег и эксперт по удержанию аудитории (Retention Mastery).
Твоя задача — составить кликабельные, вовлекающие YouTube-таймкоды (YouTube Chapters / Главы) для видео.

ДАННЫЕ РОЛИКА:
Тема: ${topic || "YouTube видео"}
Заголовок: ${title || "Без названия"}
${customInst ? `Пользовательские правила:\n${customInst}\n` : ""}

ТЕКСТ СЦЕНАРИЯ:
"""
${cleanScript || "Сценарий раскрывает тему по блокам: интро, ключевые проблемы, шаги решения, секретные фишки, выводы."}
"""

ПРАВИЛА YOUTUBE ДЛЯ ТАЙМКОДОВ И ГЛАВ:
1. ПЕРВЫЙ ТАЙМКОД ОБЯЗАТЕЛЕН И СТРОГО С 00:00 (например: 00:00 - Интро: Главная ошибка или 00:00 - Завязка)!
2. Создай от 4 до 9 ключевых глав по нарастающей (например 00:00, 01:25, 03:40, 06:15, 09:30).
3. Названия глав должны быть ИНТРИГУЮЩИМИ и КЛИКАБЕЛЬНЫМИ (не скучные "Блок 1" или "Введение", а "Секрет, о котором молчат", "Шаг 1: Быстрый старт", "Главная ловушка новичков", "Итоги и чек-лист").
4. Каждая глава должна быть не короче 20-30 секунд.
5. Формат времени: MM:SS (если меньше часа) или HH:MM:SS (если больше часа).

ФОРМАТ ВЫВОДА: JSON массив объектов с полями timeCode (строка вида "00:00") и title (строка с названием главы).`;

  try {
    const response = await callGeminiWithRetry({
      model: options?.model || "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              timeCode: { type: Type.STRING },
              title: { type: Type.STRING },
            },
            required: ["timeCode", "title"],
          },
        },
      },
    });

    const parsed = safeParseJSON<YouTubeChapterItem[]>(
      extractTextFromResponse(response),
      []
    );

    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure the first chapter starts strictly at 00:00
      if (!parsed[0].timeCode.startsWith("00:00") && !parsed[0].timeCode.startsWith("0:00")) {
        parsed.unshift({ timeCode: "00:00", title: "Введение и интро" });
      } else {
        parsed[0].timeCode = "00:00";
      }
      return parsed;
    }
  } catch (err) {
    logger.error("Failed to generate YouTube chapters with AI:", err);
  }

  // Graceful fallback
  return [
    { timeCode: "00:00", title: "Интро и главная завязка" },
    { timeCode: "01:15", title: "Суть проблемы и скрытые нюансы" },
    { timeCode: "03:40", title: "Пошаговый разбор и примеры" },
    { timeCode: "06:20", title: "Секретные фишки и ошибки" },
    { timeCode: "08:50", title: "Главные выводы и бонус" },
  ];
}

