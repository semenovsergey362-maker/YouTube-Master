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
2. Если нужно изменить тональность или длину, сделай это для всех релевантных текстовых полей, сохраняя смысл.
3. Варианты A/B заголовков (titleVariants) также должны быть переписаны с учетом этой рекомендации и быть НА ТОМ ЖЕ ЯЗЫКЕ, что и основной заголовок.
4. Верни полностью обновленный JSON-объект метаданных. Не меняй то, что не связано с рекомендацией, но обеспечь полную консистентность.

Формат вывода: JSON объект VideoSEO.`;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.7-flash",
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

  return safeParseJSON<VideoSEO>(extractTextFromResponse(response), currentSEO);
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
    model: options?.model || "gemini-3.7-flash",
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
  const instructionsContext = customInst ? `\n\nОБЯЗАТЕЛЬНЫЕ К НЕУКОСНИТЕЛЬНОМУ ИСПОЛНЕНИЮ КАСТОМНЫЕ ИНСТРУКЦИИ:\n${customInst}\n` : '';

  const prompt = `Проанализируй идею видео "${idea}" в нише "${niche}"${context}.${regionContext}.${compContext}${researchContext}${sourcesContext}${instructionsContext}
  Предложи оптимизированные SEO-элементы для YouTube. Твоя задача — максимально подготовить видео к публикации.
  
  ТРЕБОВАНИЯ К ОТВЕТУ:
  1. Заголовок (Title): Основной вариант. Кликбейтный, цепляющий, с ключевыми словами в начале. До 70 символов.
  2. Варианты заголовков (Title Variants): Предложи еще 3 альтернативных варианта заголовка для A/B тестирования.
  3. Описание (Description): Развернутое, с таймкодами, SEO-текстом, ссылками на соцсети и дисклеймером.${timestampsContext}
  4. Ключевые слова (Keywords): Список тегов через запятую для YouTube Studio, ~500 символов.
  5. Хештеги (Hashtags): 5-10 тематических хештегов.
  6. Закрепленный комментарий (Pinned Comment): ОБЯЗАТЕЛЬНО напиши текст первого комментария, который автор закрепит. Он должен быть дружелюбным, содержать вопрос к аудитории для поднятия вовлеченности (комментариев) и призыв к действию (подписка/лайк).
  
  ВЕРНИ ТОЛЬКО JSON объект с полями: title, titleVariants (массив строк), description, keywords, hashtags, pinnedComment.`;

  const tools: any[] = [];
  if (options?.deepResearch) {
    tools.push({ googleSearch: {} });
  }

  const response = await callGeminiWithRetry({
    model: options?.model || (options?.deepResearch ? "gemini-3.1-pro-preview" : "gemini-3.7-flash"),
    contents: buildContents(prompt, options),
    config: {
      systemInstruction: validateAndEnrichSystemPrompt("Ты — экспертный YouTube-продюсер и SEO-специалист.", "", "", options),
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

  return safeParseJSON(extractTextFromResponse(response), {
    title: '',
    titleVariants: [],
    description: '',
    keywords: '',
    hashtags: [],
    pinnedComment: ''
  });
}




export async function analyzeSEOAndSuggestImprovements(
  idea: string,
  niche: string,
  seo: VideoSEO,
  options?: AnalysisOptions
): Promise<SEOAnalysis> {
  const researchContext = options?.deepResearch ? "\nИспользуй Google Поиск для поиска актуальных трендов и самых эффективных ключевых слов в этой нише прямо сейчас." : "";
  const sourcesContext = getSourcesContext(options);

  const prompt = `Проведи SEO-аудит для видео на тему "${idea}" в нише "${niche}".${researchContext}${sourcesContext}
  Текущие данные:
  Заголовок: ${seo.title}
  Описание: ${seo.description}
  Ключевые слова: ${seo.keywords}
  Хештеги: ${Array.isArray(seo.hashtags) ? seo.hashtags.join(', ') : (seo.hashtags || '')}
  
  Проанализируй эти данные и предложи варианты улучшения текущего описания видео, добавив больше ключевых слов и сильный призыв к действию (CTA).
  Также предложи улучшения для повышения видимости в поиске и CTR для других полей.
  
  ОБЯЗАТЕЛЬНО:
  1. Предложи 10 высокочастотных и 10 низкочастотных ключевых слов, которые помогут видео выйти в ТОП.
  2. Дай 3-5 конкретных рекомендаций по продвижению через Google Search.
  3. Все правки должны быть направлены на повышение кликабельности (CTR).
  
  Верни JSON объект:
  - score: Оценка SEO (0-100)
  - analysis: Краткий анализ текущего состояния
  - improvements: Массив объектов { area: область (Title/Desc/Keywords/Hashtags), suggestion: конкретное предложение (объяснение), suggestedValue: новый улучшенный текст, impact: важность (high/medium/low) }
  - keywords: Объект { highFrequency: [10 строк], lowFrequency: [10 строк] }
  - googleSearchTips: Массив строк с советами
  
  Все тексты на русском языке.`;

  const tools: any[] = [];
  if (options?.deepResearch) {
    tools.push({ googleSearch: {} });
  }

  const response = await callGeminiWithRetry({
    model: options?.model || (options?.deepResearch ? "gemini-3.1-pro-preview" : "gemini-3.7-flash"),
    contents: buildContents(prompt, options),
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          analysis: { type: Type.STRING },
          improvements: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                area: { type: Type.STRING, description: "Area of improvement (title, description, keywords)" },
                suggestion: { type: Type.STRING },
                suggestedValue: { type: Type.STRING, description: "The actual corrected text for this area" },
                impact: { type: Type.STRING, enum: ['high', 'medium', 'low'] }
              },
              required: ["area", "suggestion", "suggestedValue", "impact"]
            }
          },
          keywords: {
            type: Type.OBJECT,
            properties: {
              highFrequency: { type: Type.ARRAY, items: { type: Type.STRING } },
              lowFrequency: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["highFrequency", "lowFrequency"]
          },
          googleSearchTips: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["score", "analysis", "improvements", "keywords", "googleSearchTips"]
      }
    },
    tools: tools.length > 0 ? tools : undefined,
    toolConfig: options?.deepResearch ? { includeServerSideToolInvocations: true } : undefined
  });

  return safeParseJSON(extractTextFromResponse(response), { score: 0, analysis: '', improvements: [] });
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
    model: options?.model || "gemini-3.7-flash",
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
    model: options?.model || "gemini-3.7-flash",
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
    model: options?.model || "gemini-3.7-flash",
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
    model: options?.model || "gemini-3.7-flash",
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
    model: options?.model || "gemini-3.7-flash",
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
    model: options?.model || "gemini-3.7-flash",
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
      model: options?.model || "gemini-3.7-flash",
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
      model: options?.model || "gemini-3.7-flash",
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
    model: options?.model || "gemini-3.7-flash",
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
