import { logger } from "../../config/logger";
import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import {
  GeneratedContentPlanSchema,
} from "../../types/schemas";
import {
  AnalysisOptions,
  AnalysisSource,
  ChannelVideoInfo,
  GeneratedIdea,
  NicheData,
  BrandProfile,
  ViewerAvatar,
  ContentRecommendations,
  AudiencePortrait,
  CompetitorVideo,
  CompetitorChannel,
  EvergreenNicheTrend,
  CompetitorResearchResult,
  SeriesEpisode,
  MiniSeries,
  StrategySuggestion,
  ChannelStrategyResult,
  GoogleSearchGroundingSource,
  GoogleSearchIdeasResult,
  ImportedYouTubeVideoData,
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
import { getCustomInstructions, getChannelVideosContext } from "./scriptService";
import { validateAndEnrichSystemPrompt } from "./visualPromptService";

export async function generateNicheData(niche: string, channelName?: string, region: string = 'global', options?: AnalysisOptions): Promise<NicheData> {
  const nameContext = channelName ? ` для канала с названием "${channelName}"` : "";
  const regionContext = region !== 'global' ? ` для региона "${region}"` : " для глобального рынка";
  const researchContext = options?.deepResearch ? "\nЗАДАНИЕ: Проведи глубокое исследование в реальном времени, используя Google Поиск. Найди текущих лидеров ниши, самые свежие тренды (включая этот месяц), реальные данные по просмотрам и вовлеченности." : "";
  const sourcesContext = getSourcesContext(options);
  const toneContext = getToneContext(options);
  const channelVideosContext = getChannelVideosContext(options);

  const prompt = `Проведи глубокий анализ ниши "${niche}"${nameContext}${regionContext} для YouTube канала. ${researchContext}${sourcesContext}${toneContext}${channelVideosContext}
  Сгенерируй данные в формате JSON, соответствующие следующей схеме:
  - potential: { score: число 0-100, summary: строка, demand: число 0-100, competition: число 0-100, monetization: число 0-100 }
  - subNiches: массив из 8-10 объектов { name: строка, demand: число 0-100, competition: число 0-100, monetization: число 0-100, description: строка } (это узкие направления внутри основной ниши для визуализации на карте потенциала)
  - branding: { 
      names: массив из 10 объектов { name: строка, slogan: строка },
        // ТРЕБОВАНИЯ К КРЕАТИВНОСТИ И РАЗНООБРАЗИЮ НАЗВАНИЙ И СЛОГАНОВ:
        // Каждое из 10 названий должно относиться к совершенно уникальному стилю/концепту, избегай банальных повторений и похожих слов. Сделай их максимально непохожими друг на друга:
        // 1. Метафорическое/Образное (использование ярких метафор, например: "Цифровой Джус", "Алхимия Кода").
        // 2. Минималистичное/Современное (лаконичные, звучные слова, например: "Нейро", "Текта", "Спектр").
        // 3. Ориентированное на пользу и экшен (мотивирующие, например: "Запусти Рост", "Включай Мозг").
        // 4. Юмористическое/Игровое (с иронией, каламбуром, например: "Баги и Фичи", "Чайник на Прокачке").
        // 5. Личный бренд/Авторский стиль (например: "Шоу Новатора", "Дневник Лидера").
        // 6. Технологичное/Футуристичное (на тему ИИ, будущего, технологий, например: "Сингулярность", "CyberMind").
        // 7. Прямое/Нишевое (понятное, с ключевыми словами, но свежее, например: "Мастерская 3D", "Вкусный Скетч").
        // 8. Разговорное/Дружеское (например: "Просто о Сложном", "За чашкой чая").
        // 9. Провокационное/Дерзкое (например: "Не верь мифам", "За кулисами правды").
        // 10. Абстрактное/Повествовательное (вызывающее любопытство, например: "Эффект Бабочки", "Точка Отсчета").
        //
        // СЛОГАНЫ: Должны идеально подходить под выбранный стиль названия, иметь разную длину, структуру и посыл. Избегай шаблонных фраз вроде "Твой путь к...". Вместо этого используй призывы к действию ("Думай. Создавай. Вдохновляй."), глубокие интригующие вопросы ("А вы готовы заглянуть глубже?"), парадоксальные утверждения или сильные обещания.
      logo: строка (описание логотипа),
      logo_prompts: { ru: строка, en: строка } (подробные промты для генерации логотипа в Midjourney/DALL-E),
      banner_prompts: { ru: строка, en: строка } (подробные промты для генерации баннера канала),
      colors: массив из 3 строк (HEX коды),
      fonts: массив из 2 строк (названия шрифтов из Google Fonts),
      channel_seo: {
        description: строка (SEO описание канала),
        hashtags: массив из 4-7 строк,
        keywords: строка (50% высокочастотных и 50% низкочастотных слов. Общее колличество символов - около 500 (ключевые слова пиши через запятую без пробела, а в нутри ключевых слов соблюдай пробел))
      }
    }
  - ideas: массив из 10 объектов { title: строка, description: строка, duration: строка (мин), tone: строка, viral_potential: строка (например, 'Высокий' или 'Экстремальный') } (идеи для видео)
    // ТРЕБОВАНИЯ К РАЗНООБРАЗИЮ И ПРИВЛЕКАТЕЛЬНОСТИ ИДЕЙ:
    // Каждая идея должна представлять собой уникальный, захватывающий формат видео с высоким CTR. Избегай скучных, одинаковых названий вроде "Топ-10 советов...". Сделай 10 совершенно разных форматов:
    // 1. Пошаговый практический туториал/руководство.
    // 2. Документальное расследование или глубокий анализ истории успеха/провала.
    // 3. Интерактивный челлендж или эксперимент (проверка теории на практике).
    // 4. Разрушение популярных мифов и заблуждений в нише.
    // 5. Контрастное сравнение (например: Новичок против Профессионала, Дешевый инструмент против Дорогого).
    // 6. Разбор реального кейса или реакция на чужую популярную работу с экспертным анализом.
    // 7. Прогноз будущего, анализ трендов и новых технологий в этой сфере.
    // 8. Поиск скрытых пасхалок, секретных приемов или неочевидных лайфхаков.
    // 9. Дискуссионный формат с разбором противоречивых и спорных мнений.
    // 10. Развлекательно-игровой формат (например, "Что если...", вредные советы или интерактивная викторина).
    //
    // ДЛЯ КАЖДОЙ ИДЕИ:
    // - Заголовки (title) должны быть интригующими, кликабельными, вызывающими сильное любопытство или легкий шок (используй парадокс, цифры, интригующий вопрос, бросающий вызов).
    // - Описания (description) должны раскрывать крутую концепцию ролика и то, как удерживать зрителя.
    // - СТРОГО: предлагай идеи только для ДЛИННЫХ видео (длительностью от 5 до 30+ минут). Абсолютно никаких коротких Shorts-идей (видео менее 5 минут) предлагать не нужно, для них в приложении есть отдельная вкладка Шортс. Длительность (duration) должна варьироваться от 6 мин до средних ("12 мин") и полноценных глубоких разборов ("25 мин").
    // - Тональности (tone) должны быть максимально разнообразными под стиль видео: "Провокационный", "Академический/Экспертный", "Ламповый/Уютный", "Энергичный", "Таинственный/Мистический", "Юмористический", "Драматичный".
  - popularIdeas: массив из 3 объектов { title: строка, description: строка, duration: строка (мин), tone: строка, viral_potential: строка } (популярные темы сейчас, отражающие самый свежий хайп, тренды или острые дискуссии текущего момента)
    // СТРОГО: Для популярных идей также соблюдай хронометраж от 5 минут.
  - scriptTemplate: массив из 3 объектов { phase: строка, content: строка } (Вступление, Основная часть, Заключение)
  - editingTips: массив из 3 строк
  - seo: { 
      keywords: строка (50% высокочастотных и 50% низкочастотных слов. Общее колличество символов - около 500 (ключевые слова пиши через запятую без пробела, а в нутри ключевых слов соблюдай пробел)), 
      hashtags: массив из 5 строк 
    } (максимально релевантные и трендовые на текущий момент)
  - analytics: { 
      views: строка (прогноз просмотров), 
      retention: строка (прогноз удержания), 
      ctr: строка (прогноз CTR),
      estimatedEarnings: строка (прогноз дохода),
      subscriberGrowth: массив из 6 объектов { month: строка, count: число } (прогноз роста подписчиков на полгода),
      competitorComparison: массив из 3 объектов { metric: строка, you: число, average: число } (сравнение с конкурентами),
      growthStrategy: массив из 3 строк (стратегии роста)
    }
  - shorts: массив из 3 объектов { title: строка, hook: строка, viral_potential: строка }
  - competitors: массив из 8 объектов { name: строка, subs: строка (например '1.5M'), desc: строка, weakness: строка, strategy: строка, engagement: число (ER в %), channelUrl: строка (прямая ссылка на YouTube-канал, например, https://www.youtube.com/@handle или https://www.youtube.com/channel/...) }
  - audienceData: массив из 4 объектов { name: строка (возрастная группа), value: число (количество) }
  - trendData: массив из 5 объектов { name: строка (месяц), views: число (просмотры) }
  
  ${channelName ? `В анализе и идеях учитывай название канала — "${channelName}".` : ""}

  ОБЯЗАТЕЛЬНЫЕ ТРЕБОВАНИЯ ДЛЯ ОБХОДА БЛОКИРОВОК И БЕЗОПАСНОСТИ КАРТИНОК (Google Flow/Imagen, Midjourney):
  При создании "logo_prompts" и "banner_prompts":
  1. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО упоминать имена известных личностей (политиков, исторических деятелей, селебрити) напрямую. Вместо "Наполеон Бонапарт" пиши "человек, похожий на Наполеона Бонапарта" (в английской версии: "a person resembling Napoleon Bonaparte"), либо описывай его внешние атрибуты и одежду (например, "a military officer from the 19th century in an iconic bicorne hat, with his hand tucked inside his coat"). Это же касается всех других известных людей!
  2. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО называть защищенных авторским правом вымышленных персонажей или торговые марки напрямую. Вместо "Человек-паук" пиши "супергерой в красно-синем костюме с узором паутины".
  3. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать имена живущих художников или названия защищенных брендов. Описывай художественные стили общими эстетическими терминами (например, "cinematic lighting, dramatic composition, high-contrast digital illustration").

  Все тексты должны быть на русском языке.`;

  const config: any = {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        potential: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            demand: { type: Type.NUMBER },
            competition: { type: Type.NUMBER },
            monetization: { type: Type.NUMBER },
          },
          required: ["score", "summary", "demand", "competition", "monetization"],
        },
        subNiches: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              demand: { type: Type.NUMBER },
              competition: { type: Type.NUMBER },
              monetization: { type: Type.NUMBER },
              description: { type: Type.STRING },
            },
            required: ["name", "demand", "competition", "monetization", "description"],
          }
        },
        branding: {
          type: Type.OBJECT,
          properties: {
            names: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  slogan: { type: Type.STRING },
                },
                required: ["name", "slogan"],
              },
            },
            logo: { type: Type.STRING },
            logo_prompts: {
              type: Type.OBJECT,
              properties: {
                ru: { type: Type.STRING },
                en: { type: Type.STRING },
              },
              required: ["ru", "en"],
            },
            banner_prompts: {
              type: Type.OBJECT,
              properties: {
                ru: { type: Type.STRING },
                en: { type: Type.STRING },
              },
              required: ["ru", "en"],
            },
            colors: { type: Type.ARRAY, items: { type: Type.STRING } },
            fonts: { type: Type.ARRAY, items: { type: Type.STRING } },
            channel_seo: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
                keywords: { type: Type.STRING },
              },
              required: ["description", "hashtags", "keywords"],
            },
          },
          required: ["names", "logo", "logo_prompts", "banner_prompts", "colors", "fonts", "channel_seo"],
        },
        ideas: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              duration: { type: Type.STRING },
              tone: { type: Type.STRING },
              viral_potential: { type: Type.STRING }
            },
            required: ["title", "description", "duration", "tone", "viral_potential"]
          }
        },
        popularIdeas: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              duration: { type: Type.STRING },
              tone: { type: Type.STRING },
              viral_potential: { type: Type.STRING }
            },
            required: ["title", "description", "duration", "tone", "viral_potential"]
          }
        },
        scriptTemplate: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              phase: { type: Type.STRING },
              content: { type: Type.STRING }
            },
            required: ["phase", "content"]
          }
        },
        editingTips: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        seo: {
          type: Type.OBJECT,
          properties: {
            keywords: { type: Type.STRING },
            hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["keywords", "hashtags"]
        },
        analytics: {
          type: Type.OBJECT,
          properties: {
            views: { type: Type.STRING },
            retention: { type: Type.STRING },
            ctr: { type: Type.STRING },
            estimatedEarnings: { type: Type.STRING },
            subscriberGrowth: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  month: { type: Type.STRING },
                  count: { type: Type.NUMBER },
                },
                required: ["month", "count"],
              },
            },
            competitorComparison: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  metric: { type: Type.STRING },
                  you: { type: Type.NUMBER },
                  average: { type: Type.NUMBER },
                },
                required: ["metric", "you", "average"],
              },
            },
            growthStrategy: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["views", "retention", "ctr", "estimatedEarnings", "subscriberGrowth", "competitorComparison", "growthStrategy"],
        },
        shorts: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              hook: { type: Type.STRING },
              viral_potential: { type: Type.STRING },
            },
            required: ["title", "hook", "viral_potential"],
          },
        },
        competitors: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              subs: { type: Type.STRING },
              desc: { type: Type.STRING },
              weakness: { type: Type.STRING },
              strategy: { type: Type.STRING },
              engagement: { type: Type.NUMBER },
              channelUrl: { type: Type.STRING },
            },
            required: ["name", "subs", "desc", "weakness", "strategy", "engagement"],
          },
        },
        audienceData: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              value: { type: Type.NUMBER },
            },
            required: ["name", "value"],
          },
        },
        trendData: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              views: { type: Type.NUMBER },
            },
            required: ["name", "views"],
          },
        },
      },
      required: ["potential", "subNiches", "branding", "ideas", "popularIdeas", "scriptTemplate", "editingTips", "seo", "analytics", "shorts", "competitors", "audienceData", "trendData"],
    },
  };

  const tools: any[] = [];
  if (options?.deepResearch) {
    tools.push({ googleSearch: {} });
  }

  const customInst = getCustomInstructions(options);
  const systemInstruction = validateAndEnrichSystemPrompt(
    `Ты — экспертный ИИ-ассистент для YouTube-креаторов (YouTube Master). Твоя задача — проводить глубокий анализ ниш и предлагать стратегии роста.`,
    "", // No specific wishes for niche analysis yet in the UI
    customInst
  );

  try {
    const response = await callGeminiWithRetry({
      model: options?.model || (options?.deepResearch ? "gemini-3.1-pro-preview" : "gemini-3.7-flash"),
      contents: buildContents(prompt, options),
      config: {
        ...config,
        systemInstruction
      },
      tools: tools.length > 0 ? tools : undefined,
      toolConfig: options?.deepResearch ? { includeServerSideToolInvocations: true } : undefined
    });

    const parsed = safeParseJSON<NicheData>(extractTextFromResponse(response), {} as NicheData);
    if (parsed && parsed.potential) return parsed;
    return getFallbackNicheData(niche, channelName);
  } catch (error) {
    logger.warn("Niche data generation failed (e.g. rate limit), returning fallback niche structure:", error);
    return getFallbackNicheData(niche, channelName);
  }
}


export function getFallbackNicheData(niche: string, channelName?: string): NicheData {
  const name = channelName || `${niche} Master`;
  return {
    niche,
    potential: {
      score: 82,
      summary: `Ниша "${niche}" обладает высоким потенциалом монетизации и стабильно растущим спросом целевой аудитории.`,
      demand: 85,
      competition: 55,
      monetization: 88,
    },
    subNiches: [
      { name: `Пошаговые гайды по ${niche}`, demand: 90, competition: 45, monetization: 85, description: "Обучающий контент с максимальным удержанием" },
      { name: `Разбор ошибок в ${niche}`, demand: 85, competition: 40, monetization: 80, description: "Разбор реальных кейсов и фейлов" },
      { name: `Сравнения и обзоры в ${niche}`, demand: 88, competition: 60, monetization: 95, description: "Высокий коммерческий CTR" },
      { name: `Тренды и будущее ${niche}`, demand: 80, competition: 50, monetization: 82, description: "Аналитика и прогнозы" },
    ],
    branding: {
      names: [
        { name: name, slogan: `Твой главный эксперт по ${niche}` },
        { name: `${niche} Академия`, slogan: "Просто о сложном каждый день" },
        { name: `${niche} Lab`, slogan: "Эксперименты, практики, результаты" },
      ],
      logo: `Минималистичный логотип в стиле ${niche}`,
      logo_prompts: {
        ru: `Минималистичный векторный логотип для YouTube канала о ${niche}, неоновые акценты, темный фон`,
        en: `Minimalist vector logo for YouTube channel about ${niche}, vibrant neon accents, sleek background`,
      },
      banner_prompts: {
        ru: `Баннер для YouTube канала о ${niche}, динамичная композиция, абстрактные графические элементы`,
        en: `YouTube channel banner for ${niche}, sleek modern design, high resolution, 4k`,
      },
      colors: ["#6366f1", "#10b981", "#0f172a"],
      fonts: ["Plus Jakarta Sans", "Playfair Display"],
      channel_seo: {
        description: `Добро пожаловать на канал! Здесь вы найдете всё о ${niche}: полезные инструкции, разборы и эксклюзивные советы.`,
        hashtags: [`#${niche.replace(/\s+/g, '')}`, "#youtube", "#туториал", "#гид"],
        keywords: `${niche}, как сделать ${niche}, секреты ${niche}, обзоры, гайды, советы`,
      },
    },
    ideas: [
      {
        title: `Как освоить ${niche} с нуля в 2026 году: Пошаговое руководство`,
        description: `Полное практическое погружение для новичков с разбором главных фишек и подводных камней.`,
        duration: "15 мин",
        tone: "Экспертный",
        viral_potential: "Высокий",
      },
      {
        title: `ТОП-5 фатальных ошибок в ${niche}, которые совершают 90% людей`,
        description: `Наглядный разбор ошибок с примерами из практики и способами их быстрого исправления.`,
        duration: "12 мин",
        tone: "Провокационный",
        viral_potential: "Экстремальный",
      },
      {
        title: `Эксперимент: Что будет, если уделять ${niche} по 1 часу в день 30 дней подряд?`,
        description: `Реальный челлендж с зафиксированными результатами до и после.`,
        duration: "18 мин",
        tone: "Энергичный",
        viral_potential: "Высокий",
      },
      {
        title: `${niche}: Вчера против Сегодня. Главные тренды и технологии`,
        description: `Сравнительный разбор эволюции направления и прогнозы на ближайшие 3 года.`,
        duration: "14 мин",
        tone: "Академический",
        viral_potential: "Средний",
      },
      {
        title: `Разрушаем 7 главных мифов о ${niche}, в которые вы всё ещё верите`,
        description: `Экспертное разоблачение популярных заблуждений с доказательной базой.`,
        duration: "10 мин",
        tone: "Юмористический",
        viral_potential: "Высокий",
      },
    ],
    popularIdeas: [],
    scriptTemplate: [],
    editingTips: [],
    seo: { keywords: "", hashtags: [] },
    analytics: {
      views: "10K - 50K",
      retention: "55%",
      ctr: "7.5%",
      estimatedEarnings: "$100 - $500",
      subscriberGrowth: [],
      competitorComparison: [],
      growthStrategy: []
    },
    shorts: [],
    competitors: [],
    audienceData: [],
    trendData: []
  };
}


export async function generateTrendingQueries(niche: string, region: string = 'global', options?: AnalysisOptions): Promise<{ queries: string[]; sources: { title: string; uri: string }[] }> {
  const regionNames: Record<string, string> = {
    global: "весь мир (глобально)",
    us: "США (United States)",
    ru: "Россия (Russia)",
    eu: "Европа (Europe)",
    br: "Бразилия (Brazil)",
    in: "Индия (India)"
  };
  const regionName = regionNames[region] || "весь мир (глобально)";

  const prompt = `Найди самые популярные и трендовые поисковые запросы за последнее время для ниши YouTube: "${niche}" в регионе ${regionName}.
  Верни JSON массив строк из 5 наиболее актуальных поисковых фразах/тем.`;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.7-flash",
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    tools: [{ googleSearch: {} }]
  });

  const text = extractTextFromResponse(response);
  const queries = safeParseJSON<string[]>(text, []);

  const sources: { title: string; uri: string }[] = [];
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (chunks) {
    for (const chunk of chunks) {
      if (chunk.web?.uri) {
        sources.push({
          title: chunk.web.title || "Источник поиска",
          uri: chunk.web.uri
        });
      }
    }
  }

  const uniqueSources = sources.filter((v, i, a) => a.findIndex(t => t.uri === v.uri) === i);

  return { queries, sources: uniqueSources };
}


export async function generateMoreIdeas(niche: string, currentIdeas: GeneratedIdea[], options?: AnalysisOptions): Promise<{ ideas: GeneratedIdea[]; popularIdeas: GeneratedIdea[] }> {
  const channelVideosContext = getChannelVideosContext(options);
  const prompt = `Проанализируй нишу "${niche}". Предложи 10 новых оригинальных идей для видео, а также 3 самые популярные/трендовые темы прямо сейчас на основе предоставленного списка текущих идей.
  Текущие идеи: ${JSON.stringify(currentIdeas.map(i => i.title))}
  ${channelVideosContext}
  
  Требования к идеям:
  - СТРОГО: предлагай идеи только для ДЛИННЫХ видео (длительностью от 5 до 30+ минут). Абсолютно никаких коротких Shorts-идей (видео менее 5 минут) предлагать не нужно, для них в приложении есть отдельная вкладка Шортс. Длительность (duration) должна варьироваться от 5-6 мин до средних ("12 мин") и полноценных глубоких разборов ("25 мин").
  - Тональности (tone) должны быть максимально разнообразными под стиль видео: "Провокационный", "Академический/Экспертный", "Ламповый/Уютный", "Энергичный", "Таинственный/Мистический", "Юмористический", "Драматичный".

  ВЕРНИ ТОЛЬКО JSON с полями:
  - ideas: массив из 10 новых оригинальных объектов { title: строка, description: строка, duration: строка (мин, МИНИМУМ 5 минут), tone: строка, viral_potential: строка (например, 'Высокий' или 'Экстремальный') }. СТРОГО: Хронометраж от 5 минут.
  - popularIdeas: массив из 3 самых хайповых тем сейчас { title: строка, description: строка, duration: строка (мин, МИНИМУМ 5 минут), tone: строка, viral_potential: строка }. СТРОГО: Хронометраж от 5 минут.`;

  const customInst = getCustomInstructions(options);
  const systemInstruction = validateAndEnrichSystemPrompt(
    `Ты — экспертный ИИ-ассистент для YouTube-креаторов. Твоя задача — генерировать виральные и качественные идеи для видео.`,
    "",
    customInst
  );

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.7-flash",
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          ideas: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                duration: { type: Type.STRING },
                tone: { type: Type.STRING },
                viral_potential: { type: Type.STRING }
              },
              required: ["title", "description", "duration", "tone", "viral_potential"]
            }
          },
          popularIdeas: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                duration: { type: Type.STRING },
                tone: { type: Type.STRING },
                viral_potential: { type: Type.STRING }
              },
              required: ["title", "description", "duration", "tone", "viral_potential"]
            }
          }
        },
        required: ["ideas", "popularIdeas"]
      }
    }
  });

  return safeParseJSON<{ ideas: GeneratedIdea[]; popularIdeas: GeneratedIdea[] }>(
    extractTextFromResponse(response), 
    { ideas: [], popularIdeas: [] }
  );
}


export async function generateSequelsForIdea(
  ideaTitle: string, 
  niche: string, 
  options?: AnalysisOptions & { pastHistoryContext?: string }
): Promise<GeneratedIdea[]> {
  const customInst = getCustomInstructions(options);
  const historyContext = options?.pastHistoryContext 
    ? `

[ДАННЫЕ ИЗ ИСТОРИИ ПРОШЛЫХ СЦЕНАРИЕВ/ВЫПУСКОВ СЕРИИ]:
${options.pastHistoryContext}
ОБЯЗАТЕЛЬНО детально опирайся на этот контекст, факты, сюжетные линии и темы прошлых видео. Создаваемое продолжение должно быть прямым логическим развитием серии.
` 
    : "";

  const systemInstruction = validateAndEnrichSystemPrompt(
    `Ты - профессиональный продюсер и экспертный сценарист YouTube. Твоя задача - придумывать захватывающие сиквелы (продолжения) для видео, используя данные и контекст прошлых выпусков из истории канала, создавая связные серии и плейлисты.`,
    historyContext,
    customInst
  );

  const prompt = `На основе идеи/сценария "${ideaTitle}" в нише "${niche}", придумай 3 логичных продолжения (сиквела) в той же серии/плейлисте.
${historyContext}
Каждое следующее видео должно вытекать из предыдущего или продолжить историю прошлых выпусков, развивая тему глубже, раскрывая нераскрытые вопросы и предлагая новые повороты.
СТРОГО: предлагай идеи только для ДЛИННЫХ видео (хронометражем МИНИМУМ от 5 до 30+ минут). Никаких коротких Shorts-идей или видео менее 5 минут предлагать не нужно.
Результат должен быть массивом из 3 объектов GeneratedIdea { title: string, description: string, duration: string (в минутах, строго от 5 мин), tone: string, viral_potential: string }.`;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.7-flash",
    contents: buildContents(prompt, options),
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            duration: { type: Type.STRING },
            tone: { type: Type.STRING },
            viral_potential: { type: Type.STRING }
          },
          required: ["title", "description", "duration", "tone", "viral_potential"]
        },
      },
    }
  });

  return safeParseJSON<GeneratedIdea[]>(extractTextFromResponse(response), []);
}


export async function generateTrendingIdeas(niche: string, keywords: string, channelName?: string, competitorAnalysis?: string, options?: AnalysisOptions): Promise<GeneratedIdea[]> {
  const nameContext = channelName ? ` для канала с названием "${channelName}"` : "";
  const keywordContext = keywords ? ` Учитывай следующие ключевые слова и темы: ${keywords}.` : "";
  const competitorContext = competitorAnalysis ? `
ОБЯЗАТЕЛЬНО учитывай слабые стороны конкурентов и способы их обхода при генерации идей:
${competitorAnalysis}` : "";
  const researchContext = options?.deepResearch ? "\nИспользуй Google Поиск для выявления самых свежих трендов и виральных тем в этой нише на сегодняшний день." : "";
  const channelVideosContext = getChannelVideosContext(options);
  const prompt = `Сгенерируй 5 уникальных и трендовых идей для YouTube видео в нише "${niche}"${nameContext}.${keywordContext}${competitorContext}${researchContext}${channelVideosContext}
  Идеи должны основываться на текущих трендах и анализе конкурентов. Каждая идея должна быть привлекательной и иметь высокий потенциал для виральности.
  Результат должен быть массивом из 5 объектов GeneratedIdea { title: string, description: string, duration: string (мин), tone: string, viral_potential: string }. СТРОГО: предлагай идеи только для ДЛИННЫХ видео (длительностью от 5 до 30+ минут). Никаких коротких Shorts-идей (менее 5 минут) предлагать не нужно.`;

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
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            duration: { type: Type.STRING },
            tone: { type: Type.STRING },
            viral_potential: { type: Type.STRING }
          },
          required: ["title", "description", "duration", "tone", "viral_potential"]
        },
      },
    },
    tools: tools.length > 0 ? tools : undefined,
    toolConfig: options?.deepResearch ? { includeServerSideToolInvocations: true } : undefined
  });

  return safeParseJSON<GeneratedIdea[]>(extractTextFromResponse(response), []);
}


export async function generateIdeasFromDescription(description: string, options?: AnalysisOptions): Promise<{ ideas: GeneratedIdea[]; popularIdeas: GeneratedIdea[] }> {
  const toneContext = getToneContext(options);
  const channelVideosContext = getChannelVideosContext(options);
  const prompt = `Проанализируй следующее описание идеи, темы, канала или контента от пользователя:
  """
  ${description}
  """
  ${channelVideosContext}
  
  На основе этого описания сгенерируй список из 10 уникальных, разнообразных и захватывающих идей для YouTube-видео и 3 самых популярных/хайповых тем текущего момента. ${toneContext}
  
  СТРОГОЕ ТРЕБОВАНИЕ: Все предложенные идеи должны иметь длительность МИНИМУМ 5 минут. Никаких Shorts или коротких роликов.
  
  ВАЖНО ДЛЯ МАКСИМАЛЬНОГО РАЗНООБРАЗИЯ И ВОВЛЕЧЕНИЯ:
  Каждая идея должна представлять собой уникальный, захватывающий формат видео с высоким CTR. Избегай скучных, одинаковых названий вроде "Топ-10 советов...". Сделай совершенно разные форматы:
  1. Пошаговый практический туториал/руководство.
  2. Документальное расследование или глубокий анализ истории успеха/провала.
  3. Интерактивный челлендж или эксперимент (проверка теории на практике).
  4. Разрушение популярных мифов и заблуждений.
  5. Контрастное сравнение (например: Новичок против Профессионала, Дешевый инструмент против Дорогого).
  6. Разбор реального кейса или реакция на чужую популярную работу с экспертным анализом.
  7. Прогноз будущего, анализ трендов и новых технологий в этой сфере.
  8. Поиск скрытых пасхалок, секретных приемов или неочевидных лайфхаков.
  9. Дискуссионный формат с разбором противоречивых и спорных мнений.
  10. Развлекательно-игровой формат (например, "Что если...", вредные советы или интерактивная викторина).
  
  ДЛЯ КАЖДОЙ ИДЕИ:
  - Заголовки (title) должны быть интригующими, кликабельными, вызывающими сильное любопытство или легкий шок (используй парадокс, цифры, интригующий вопрос, бросающий вызов).
  - Описания (description) должны раскрывать крутую концепцию ролика и то, как удерживать зрителя.
  - СТРОГО: предлагай идеи только для ДЛИННЫХ видео (длительностью от 5 до 30+ минут). Абсолютно никаких коротких Shorts-идей (видео менее 5 минут) предлагать не нужно, для них в приложении есть отдельная вкладка Шортс. Длительность (duration) должна варьироваться от 5-6 мин до средних ("12 мин") и полноценных глубоких разборов ("25 мин").
  - Тональности (tone) должны быть максимально разнообразными под стиль видео: "Провокационный", "Академический/Экспертный", "Ламповый/Уютный", "Энергичный", "Таинственный/Мистический", "Юмористический", "Драматичный".

  ВЕРНИ ТОЛЬКО JSON с полями:
  - ideas: массив из 10 новых объектов { title: строка, description: строка, duration: строка (мин, МИНИМУМ 5 минут), tone: строка, viral_potential: строка (например, 'Высокий' или 'Экстремальный') }. СТРОГО: Хронометраж от 5 минут.
  - popularIdeas: массив из 3 объектов { title: строка, description: строка, duration: строка (мин, МИНИМУМ 5 минут), tone: строка, viral_potential: строка }. СТРОГО: Хронометраж от 5 минут.`;

  try {
    const response = await callGeminiWithRetry({
      model: options?.model || "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ideas: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  duration: { type: Type.STRING },
                  tone: { type: Type.STRING },
                  viral_potential: { type: Type.STRING }
                },
                required: ["title", "description", "duration", "tone", "viral_potential"]
              } 
            },
            popularIdeas: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  duration: { type: Type.STRING },
                  tone: { type: Type.STRING },
                  viral_potential: { type: Type.STRING }
                },
                required: ["title", "description", "duration", "tone", "viral_potential"]
              } 
            }
          },
          required: ["ideas", "popularIdeas"]
        }
      }
    });

    const parsed = safeParseJSON<{ ideas: GeneratedIdea[]; popularIdeas: GeneratedIdea[] }>(
      extractTextFromResponse(response), 
      { ideas: [], popularIdeas: [] }
    );

    if (parsed.ideas && parsed.ideas.length > 0) return parsed;
    return getFallbackIdeasFromDescription(description);
  } catch (err) {
    logger.warn("generateIdeasFromDescription error, returning fallback ideas:", err);
    return getFallbackIdeasFromDescription(description);
  }
}






export async function generateIdeasFromGoogleSearch(
  searchQuery: string,
  options?: AnalysisOptions
): Promise<GoogleSearchIdeasResult> {
  const model = options?.model || "gemini-3.1-pro-preview";
  const toneContext = getToneContext(options);

  const searchPrompt = `Проведи поисковый анализ в Google по запросу/нише: "${searchQuery}".
  
  ТВОЯ ЗАДАЧА:
  1. Найди самые свежие новости, тренды, обсуждения и горячие темы в Google за последнее время.
  2. Сформируй краткое резюме главных трендов (3-4 предложенмя).
  3. На основе найденных реальных фактов сгенерируй 10 вирусых и актуальных идей для видео на YouTube с привлекательным заголовком, глубокой концепцией (description), хронометражем (от 5 до 25 мин), тональностью и виральным потенциалом. ${toneContext}

  Ответь подробным отчетом.`;

  try {
    const searchResponse = await callGeminiWithRetry({
      model,
      contents: searchPrompt,
      tools: [{ googleSearch: {} }],
      toolConfig: { includeServerSideToolInvocations: true },
    });

    const rawText = extractTextFromResponse(searchResponse) || "";

    // Extract grounding sources
    const chunks = searchResponse?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sourcesMap = new Map<string, GoogleSearchGroundingSource>();

    chunks.forEach((chunk: any) => {
      if (chunk.web?.uri && chunk.web?.title) {
        sourcesMap.set(chunk.web.uri, {
          title: chunk.web.title,
          url: chunk.web.uri,
          snippet: chunk.web.snippet || "",
        });
      }
    });

    const sources = Array.from(sourcesMap.values()).slice(0, 8);

    const formatPrompt = `Преобразуй результат поиска Google и генерации идей в структурированный JSON.

    ТЕКСТ ИЗ ПОИСКА:
    """
    ${rawText}
    """

    ВЕРНИ ТОЛЬКО ЧИСТЫЙ JSON со следующими полями:
    - summary: string (краткое резюме трендов, найденных в Google)
    - ideas: массив из 10 объектов { title: string, description: string, duration: string, tone: string, viral_potential: string }

    ОБЯЗАТЕЛЬНО используй букву "ё" во всех словах, где она пишется (всегда, ещё, всё, своё).`;

    const formatResponse = await callGeminiWithRetry({
      model: options?.model || "gemini-3.7-flash",
      contents: formatPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            ideas: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  duration: { type: Type.STRING },
                  tone: { type: Type.STRING },
                  viral_potential: { type: Type.STRING },
                },
                required: ["title", "description", "duration", "tone", "viral_potential"],
              },
            },
          },
          required: ["summary", "ideas"],
        },
      },
    });

    const parsed = safeParseJSON<{ summary: string; ideas: GeneratedIdea[] }>(
      extractTextFromResponse(formatResponse),
      { summary: "", ideas: [] }
    );

    return {
      searchQuery,
      summary: parsed.summary || `Результаты поиска Google по запросу "${searchQuery}".`,
      sources,
      ideas: parsed.ideas && parsed.ideas.length > 0 ? parsed.ideas : (await getFallbackIdeasFromDescription(searchQuery)).ideas,
    };
  } catch (err) {
    logger.warn("generateIdeasFromGoogleSearch error, returning fallback:", err);
    const fallback = await getFallbackIdeasFromDescription(searchQuery);
    return {
      searchQuery,
      summary: `Анализ трендов по запросу "${searchQuery}" на основе баз данных.`,
      sources: [
        {
          title: `Google Trends: ${searchQuery}`,
          url: `https://trends.google.com/trends/explore?q=${encodeURIComponent(searchQuery)}`,
          snippet: "Анализ динамики поисковых запросов и интереса аудитории.",
        },
      ],
      ideas: fallback.ideas,
    };
  }
}




export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.trim().match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}


export async function fetchCompetitorAnalysis(query: string, currentTitle: string, currentTags: string[]) {
  const url = new URL("/api/youtube/competitor-analysis", window.location.origin);
  url.searchParams.append("query", query);
  url.searchParams.append("currentTitle", currentTitle);
  url.searchParams.append("currentTags", currentTags.join(","));

  const response = await fetch(url.toString());
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to fetch competitor analysis");
  }
  return response.json();
}


export async function fetchSeoAnalysis(data: { title: string; description?: string; tags?: string }) {
  const response = await fetch("/api/seo/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to fetch SEO analysis");
  }
  return response.json();
}


export async function importYouTubeVideoData(
  videoUrl: string,
  options?: AnalysisOptions
): Promise<ImportedYouTubeVideoData> {
  const model = options?.model || "gemini-3.1-pro-preview";
  const videoId = extractYouTubeVideoId(videoUrl);
  const toneContext = getToneContext(options);

  const searchPrompt = `Проведи поисковый анализ в Google по ссылке или видео YouTube: "${videoUrl}" (Video ID: ${videoId || "неизвестен"}).

  ТВОЯ ЗАДАЧА:
  1. Используя поисковый инструмент Google Search Grounding, найди точную или наиболее релевантную информацию о данном видео YouTube:
     - Оригинальное Название видео (title)
     - Название YouTube-канала / Автора (channelName)
     - Подробное или краткое описание видео (description)
     - Теги, ключевые слова и хештеги этого видео (tags)
     - Ключевые темы и основные тезисы содержания (keyTopics)
  2. На основе темы, метаданных и формата этого видео сгенерируй 10 вирусых и актуальных аналогичных/похожих идей для видео на YouTube для создания уникального контент-плана. ${toneContext}

  Ответь подробным отчетом с найденной информацией и идеями.`;

  try {
    const searchResponse = await callGeminiWithRetry({
      model,
      contents: searchPrompt,
      tools: [{ googleSearch: {} }],
      toolConfig: { includeServerSideToolInvocations: true },
    });

    const rawText = extractTextFromResponse(searchResponse) || "";

    // Extract grounding sources
    const chunks = searchResponse?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sourcesMap = new Map<string, GoogleSearchGroundingSource>();

    chunks.forEach((chunk: any) => {
      if (chunk.web?.uri && chunk.web?.title) {
        sourcesMap.set(chunk.web.uri, {
          title: chunk.web.title,
          url: chunk.web.uri,
          snippet: chunk.web.snippet || "",
        });
      }
    });

    const sources = Array.from(sourcesMap.values()).slice(0, 8);

    const formatPrompt = `Преобразуй результат поиска Google по YouTube видео в структурированный JSON.

    ТЕКСТ ИЗ ПОИСКА:
    """
    ${rawText}
    """

    ВЕРНИ ТОЛЬКО ЧИСТЫЙ JSON со следующими полями:
    - title: string (оригинальное или точное название видео)
    - channelName: string (название канала или автора)
    - description: string (краткое описание видео и его смысловая суть)
    - tags: массив строк (теги, ключевые слова, хештеги без #)
    - keyTopics: массив строк (3-5 главных тем, затронутых в видео)
    - summary: string (резюме ценности и структуры этого видео)
    - suggestedIdeas: массив из 10 объектов { title: string, description: string, duration: string, tone: string, viral_potential: string } (похожие идеи для создания собственного контент-плана)

    ОБЯЗАТЕЛЬНО используй букву "ё" во всех словах на русском языке, где она пишется (всегда, ещё, всё, своё).`;

    const formatResponse = await callGeminiWithRetry({
      model: options?.model || "gemini-3.7-flash",
      contents: formatPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            channelName: { type: Type.STRING },
            description: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            keyTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
            summary: { type: Type.STRING },
            suggestedIdeas: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  duration: { type: Type.STRING },
                  tone: { type: Type.STRING },
                  viral_potential: { type: Type.STRING },
                },
                required: ["title", "description", "duration", "tone", "viral_potential"],
              },
            },
          },
          required: ["title", "channelName", "description", "tags", "keyTopics", "summary", "suggestedIdeas"],
        },
      },
    });

    const parsed = safeParseJSON<{
      title: string;
      channelName: string;
      description: string;
      tags: string[];
      keyTopics: string[];
      summary: string;
      suggestedIdeas: GeneratedIdea[];
    }>(extractTextFromResponse(formatResponse), {
      title: "",
      channelName: "",
      description: "",
      tags: [],
      keyTopics: [],
      summary: "",
      suggestedIdeas: [],
    });

    const fallbackIdeas = (await getFallbackIdeasFromDescription(parsed.title || videoUrl)).ideas;

    return {
      videoUrl,
      videoId: videoId || undefined,
      title: parsed.title || `Видео по ссылке ${videoUrl}`,
      channelName: parsed.channelName || "YouTube Автор",
      description: parsed.description || "Анализ метаданных видео выявил ключевую тему и структуры для контента.",
      tags: parsed.tags && parsed.tags.length > 0 ? parsed.tags : ["youtube", "видео", "тренды", "контент"],
      keyTopics: parsed.keyTopics && parsed.keyTopics.length > 0 ? parsed.keyTopics : ["Анализ ниши", "Главные выводы", "Практические советы"],
      summary: parsed.summary || `Метаданные импортированы из Google Search Grounding для ${videoUrl}.`,
      suggestedIdeas: parsed.suggestedIdeas && parsed.suggestedIdeas.length > 0 ? parsed.suggestedIdeas : fallbackIdeas,
      sources,
    };
  } catch (err) {
    logger.warn("importYouTubeVideoData error, returning fallback:", err);
    const fallbackIdeas = (await getFallbackIdeasFromDescription(videoUrl)).ideas;
    return {
      videoUrl,
      videoId: videoId || undefined,
      title: `Импортированное видео (${videoId || 'YouTube'})`,
      channelName: "YouTube",
      description: `Автоматически сгенерированное описание на основе ссылки ${videoUrl}.`,
      tags: ["youtube", "тренды", "обзор", "инновации", "контент"],
      keyTopics: ["Главные тренды", "Инсайты", "Рекомендации"],
      summary: "Метаданные сформированы с использованием базы данных трендов.",
      suggestedIdeas: fallbackIdeas,
      sources: [
        {
          title: `YouTube Video ${videoId || ''}`,
          url: videoUrl,
          snippet: "Прямая ссылка на исходное видео YouTube.",
        },
      ],
    };
  }
}


export function getFallbackIdeasFromDescription(description: string): { ideas: GeneratedIdea[]; popularIdeas: GeneratedIdea[] } {
  const cleanTopic = description.split('\n')[0].substring(0, 40) || "Выбранная тема";
  return {
    ideas: [
      {
        title: `Как реализовать ${cleanTopic}: Практическое пошаговое руководство`,
        description: `Детальная разборка концепции с примерами, фишками и лучшими практиками для достижения максимального результата.`,
        duration: "14 мин",
        tone: "Экспертный",
        viral_potential: "Высокий"
      },
      {
        title: `Я протестировал ${cleanTopic} на протяжении 30 дней: Честный отзыв`,
        description: `Реальные результаты эксперимента с замерами эффективности, плюсами и минусами.`,
        duration: "18 мин",
        tone: "Энергичный",
        viral_potential: "Экстремальный"
      },
      {
        title: `ТОП-7 главных ошибок при работе с ${cleanTopic}, которые стоят денег`,
        description: `Наглядный разбор подводных камней и способов уберечь себя от типичных провалов.`,
        duration: "12 мин",
        tone: "Провокационный",
        viral_potential: "Высокий"
      },
      {
        title: `${cleanTopic}: Вчера против Завтра. Куда движется индустрия?`,
        description: `Глубокий аналитический разбор трендов, новых технологий и перспектив направления.`,
        duration: "16 мин",
        tone: "Академический",
        viral_potential: "Средний"
      },
      {
        title: `Секретный метод ${cleanTopic}, о котором молчат эксперты`,
        description: `Интригующий разбор нестандартных приемов и хаков для быстрого прогресса.`,
        duration: "10 мин",
        tone: "Таинственный/Мистический",
        viral_potential: "Высокий"
      }
    ],
    popularIdeas: [
      {
        title: `Главный тренд в ${cleanTopic}: Разбор вирусного феномена`,
        description: `Анализ актуального хайпа с практическими выводами для аудитории.`,
        duration: "15 мин",
        tone: "Энергичный",
        viral_potential: "Экстремальный"
      },
      {
        title: `Как нейросети меняют ${cleanTopic} прям сейчас`,
        description: `Интеграция современных ИИ инструментов и сценариев работы.`,
        duration: "22 мин",
        tone: "Экспертный",
        viral_potential: "Высокий"
      }
    ]
  };
}










export async function generateCompetitorResearch(
  nicheOrTopic: string, 
  options?: AnalysisOptions
): Promise<CompetitorResearchResult> {
  // Step 1: Research with Google Search (returns raw text report)
  const researchPrompt = `Проведи глубокий конкурентный поиск и анализ на YouTube по теме или нише: "${nicheOrTopic}".
  
  ИНСТРУКЦИЯ ПО ИССЛЕДОВАНИЮ:
  1. Используй Google Поиск для нахождения как минимум 8 реальных, существующих на данный момент YouTube-каналов конкурентов в нише или по этой теме.
  2. Найди по 2-3 их самых популярных или недавних вирусных видео, определи количество просмотров, дату публикации.
  3. Проанализируй, почему эти видео стали популярными (их "вирусный фактор" и хук) и в чём их слабые стороны (качество монтажа, плохая проработка тем, кликбейт без пользы, монотонность, отсутствие структуры, плохой звук).
  4. Сформируй список из 4-5 вечнозелёных (evergreen) смежных ниш и подниш с высокими показателями долгосрочного спроса (Evergreen Score) и низким/средним уровнем конкуренции.
  5. Предложи пошаговый план действий (3-4 шага) по обходу конкурентов.
  
  Напиши весь отчет подробно на русском языке, используя букву "ё" везде, где она пишется (всегда, ещё, всё, своё).`;

  let rawResearchText = "";
  try {
    const researchResponse = await callGeminiWithRetry({
      model: options?.model || "gemini-3.1-pro-preview", // Pro is perfect for deep search
      contents: researchPrompt,
      tools: [{ googleSearch: {} }],
      toolConfig: { includeServerSideToolInvocations: true }
    });
    rawResearchText = extractTextFromResponse(researchResponse) || "";
  } catch (e) {
    logger.error("Error during search grounding phase:", e);
    rawResearchText = `Ошибка поиска. Сделай экспертную аналитику по нише "${nicheOrTopic}" на основе встроенных знаний о YouTube.`;
  }

  // Step 2: Format rawResearchText into the required structured JSON Schema
  const formatPrompt = `Преобразуй следующий текст конкурентного анализа в структурированный JSON.
  
  ТЕКСТ АНАЛИЗА:
  """
  ${rawResearchText}
  """
  
  ВЕРНИ ТОЛЬКО ЧИСТЫЙ JSON, строго соответствующий схеме:
  - competitors: массив из 8 объектов { name, subs, desc, weakness, strategy, engagement (число от 0 до 100), channelUrl (прямая ссылка на канал, например 'https://www.youtube.com/@handle' или 'https://www.youtube.com/channel/...'), topVideos: массив { title, views, publishedAt, viralFactor, hookAnalysis } }
  - evergreenTrends: массив объектов { name, evergreenScore (число 0-100), demandScore (число 0-100), competitionScore (число 0-100), subNiches: массив { name, description, potentialScore (число 0-100), trendType ('rising' | 'stable') } }
  - suggestedActionPlan: массив строк (план действий)
  
  Все тексты должны быть на русском языке. ОБЯЗАТЕЛЬНО используй букву "ё" во всех словах, где она пишется (всегда, ещё, всё, своё).`;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.7-flash", // Fast for formatting
    contents: formatPrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          competitors: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                subs: { type: Type.STRING },
                desc: { type: Type.STRING },
                weakness: { type: Type.STRING },
                strategy: { type: Type.STRING },
                engagement: { type: Type.NUMBER },
                channelUrl: { type: Type.STRING },
                topVideos: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      views: { type: Type.STRING },
                      publishedAt: { type: Type.STRING },
                      viralFactor: { type: Type.STRING },
                      hookAnalysis: { type: Type.STRING },
                    },
                    required: ["title", "views", "publishedAt", "viralFactor", "hookAnalysis"]
                  }
                }
              },
              required: ["name", "subs", "desc", "weakness", "strategy", "engagement", "channelUrl", "topVideos"]
            }
          },
          evergreenTrends: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                evergreenScore: { type: Type.NUMBER },
                demandScore: { type: Type.NUMBER },
                competitionScore: { type: Type.NUMBER },
                subNiches: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      description: { type: Type.STRING },
                      potentialScore: { type: Type.NUMBER },
                      trendType: { type: Type.STRING },
                    },
                    required: ["name", "description", "potentialScore", "trendType"]
                  }
                }
              },
              required: ["name", "evergreenScore", "demandScore", "competitionScore", "subNiches"]
            }
          },
          suggestedActionPlan: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["competitors", "evergreenTrends", "suggestedActionPlan"]
      }
    }
  });

  return safeParseJSON<CompetitorResearchResult>(
    extractTextFromResponse(response),
    { competitors: [], evergreenTrends: [], suggestedActionPlan: [] }
  );
}






export async function generateAudiencePortrait(
  niche: string,
  brandingName?: string,
  options?: AnalysisOptions
): Promise<AudiencePortrait> {
  const brandContext = brandingName ? ` для бренда/канала "${brandingName}"` : "";
  const customInst = getCustomInstructions(options);

  const prompt = `Проведи глубокий психологический и маркетинговый анализ целевой аудитории (ЦА) для YouTube-канала в нише "${niche}"${brandContext}.

${customInst}

Сгенерируй детальный портрет ЦА и аватар идеального зрителя в формате JSON:
{
  "pains": ["3-5 конкретных болей, проблем и страхов аудитории в этой нише"],
  "questions": ["3-5 главных вопросов, которые зритель ищет в сети или крутит в голове"],
  "values": ["3-5 ценностей, мечтаний и базовых мотивов (например, рост дохода, признание, гармония, новые знания)"],
  "avatar": {
    "name": "Имя и возраст (например, 'Алексей, 29 лет')",
    "occupation": "Профессия/Сфера деятельности",
    "demographics": "Демографический портрет (пол, статус, привычки)",
    "coreGoal": "Главная цель просмотра видео на этом канале",
    "dailyHabits": "Привычки просмотра контента (когда, на каком устройстве)"
  },
  "recommendations": {
    "narrativeAngle": "Рекомендация: как вести повествование, какой тональности придерживаться",
    "hookStrategy": "Рекомендация: как зацеплять внимание в первые 5 секунд",
    "whatToAvoid": "Рекомендация: чего категорически избегать в роликах",
    "retentionTriggers": "Рекомендация: за счет чего удерживать зрителя до самого конца"
  }
}

Пиши на русском языке, максимально емко и глубоко.`;

  try {
    const response = await callGeminiWithRetry({
      model: options?.model || "gemini-3.7-flash",
      contents: buildContents(prompt, options),
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pains: { type: Type.ARRAY, items: { type: Type.STRING } },
            questions: { type: Type.ARRAY, items: { type: Type.STRING } },
            values: { type: Type.ARRAY, items: { type: Type.STRING } },
            avatar: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                occupation: { type: Type.STRING },
                demographics: { type: Type.STRING },
                coreGoal: { type: Type.STRING },
                dailyHabits: { type: Type.STRING }
              },
              required: ["name", "occupation", "demographics", "coreGoal", "dailyHabits"]
            },
            recommendations: {
              type: Type.OBJECT,
              properties: {
                narrativeAngle: { type: Type.STRING },
                hookStrategy: { type: Type.STRING },
                whatToAvoid: { type: Type.STRING },
                retentionTriggers: { type: Type.STRING }
              },
              required: ["narrativeAngle", "hookStrategy", "whatToAvoid", "retentionTriggers"]
            }
          },
          required: ["pains", "questions", "values", "avatar", "recommendations"]
        }
      }
    });

    return safeParseJSON<AudiencePortrait>(extractTextFromResponse(response), {
      pains: [
        "Недостаток глубоких проверенных практических знаний",
        "Высокая конкуренция и страх остаться позади",
        "Информационный шум и сложности с отбором сути"
      ],
      questions: [
        "С чего пошагово начать развитие?",
        "Как сэкономить время и получить быстрый результат?",
        "Какие ошибки совершают 90% новичков?"
      ],
      values: [
        "Практическая применимость и полезность",
        "Экономия времени и системный подход",
        "Рост дохода и личностный авторитет"
      ],
      avatar: {
        name: "Алексей, 28 лет",
        occupation: "Специалист / Предприниматель",
        demographics: "Мужчины и женщины 22-38 лет, ценители качественного контента",
        coreGoal: "Получать концентрированные знания без воды и применять в жизни",
        dailyHabits: "Смотрит видео за обедом и по вечерам, ценит четкую структуру"
      },
      recommendations: {
        narrativeAngle: "Говорить прямо и уверенно, опираясь на факты, кейсы и наглядные примеры.",
        hookStrategy: "Сразу анонсировать главный практический результат и интригу на 5 секунде.",
        whatToAvoid: "Затянутого вступления, размытых рассуждений и ухода от темы.",
        retentionTriggers: "Использовать четкую структуру, титры-акценты и пошаговые выводы."
      }
    });
  } catch (error) {
    logger.error("Failed to generate Audience Portrait:", error);
    return {
      pains: ["Недостаток проверенной информации", "Высокая конкуренция", "Сложности с фильтрацией контента"],
      questions: ["С чего начать?", "Как избежать ошибок?", "Где найти лучшую практику?"],
      values: ["Практическая польза", "Качество и точность", "Личный рост"],
      avatar: {
        name: "Александр, 30 лет",
        occupation: "Целевой зритель канала",
        demographics: "Мужчины и женщины 20-40 лет",
        coreGoal: "Развитие и получение ценной информации",
        dailyHabits: "Регулярный просмотр профильных роликов"
      },
      recommendations: {
        narrativeAngle: "Динамичная и аргументированная подача.",
        hookStrategy: "Захватывать внимание интригующим вопросом.",
        whatToAvoid: "Длинных пауз и отсутствия структуры.",
        retentionTriggers: "Частая смена планов и чек-листы."
      }
    };
  }
}






export async function generateBrandProfile(

  niche: string,
  brandingName?: string,
  options?: AnalysisOptions
): Promise<BrandProfile> {
  const brandContext = brandingName ? ` для бренда/канала "${brandingName}"` : "";
  const customInst = getCustomInstructions(options);

  const prompt = `Создай гармоничный Брендбук канала (Style Profile) для YouTube-канала в нише "${niche}"${brandContext}.

${customInst}

Сгенерируй единый стиль и айдентику в формате JSON:
{
  "colors": ["Массив из 4 фирменных HEX-кодов (например, '#6366F1', '#F59E0B', '#10B981', '#0F172A')"],
  "thumbnailStyle": "Описание единого стиля обложек (например, 'Кинематографичный 3D-стиль с контрастным свечением и акцентным текстом')",
  "primaryFont": "Название основного шрифта для заголовков (например, 'Oswald' или 'Bebas Neue')",
  "bodyFont": "Название шрифта для текста (например, 'Inter' или 'Montserrat')",
  "toneOfVoice": "Тональность речи автора/диктора (например, 'Экспертный, вдохновляющий и энергичный')",
  "visualAestheticDescription": "Краткое описание общей визуальной атмосферы и айдентики канала"
}`;

  try {
    const response = await callGeminiWithRetry({
      model: options?.model || "gemini-3.7-flash",
      contents: buildContents(prompt, options),
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            colors: { type: Type.ARRAY, items: { type: Type.STRING } },
            thumbnailStyle: { type: Type.STRING },
            primaryFont: { type: Type.STRING },
            bodyFont: { type: Type.STRING },
            toneOfVoice: { type: Type.STRING },
            visualAestheticDescription: { type: Type.STRING }
          },
          required: ["colors", "thumbnailStyle", "primaryFont", "bodyFont", "toneOfVoice", "visualAestheticDescription"]
        }
      }
    });

    return safeParseJSON<BrandProfile>(extractTextFromResponse(response), {
      colors: ["#6366F1", "#F59E0B", "#10B981", "#0F172A"],
      thumbnailStyle: "Современный кинематографичный стиль с высоким контрастом и акцентным 3D текстом",
      primaryFont: "Oswald",
      bodyFont: "Inter",
      toneOfVoice: "Экспертный, интригующий и доступный",
      visualAestheticDescription: "Лаконичный технологичный стиль с акцентными свечениями и высокой читаемостью."
    });
  } catch (error) {
    logger.error("Failed to generate Brand Profile:", error);
    return {
      colors: ["#6366F1", "#F59E0B", "#10B981", "#0F172A"],
      thumbnailStyle: "Современный YouTube Clickbait с кинематографичным освещением",
      primaryFont: "Oswald",
      bodyFont: "Inter",
      toneOfVoice: "Экспертный и вдохновляющий",
      visualAestheticDescription: "Высококонтрастная стильная айдентика для яркого выделения в ленте."
    };
  }
}


export async function generateMiniSeriesTree(
  topicOrQuery: string,
  niche: string,
  episodeCount: number = 4,
  options?: AnalysisOptions
): Promise<MiniSeries[]> {
  const customInst = getCustomInstructions(options);
  const systemInstruction = validateAndEnrichSystemPrompt(
    `Ты - главный YouTube продюсер и архитектор контент-сериалов. Твоя задача - объединять и разворачивать видео-идеи в проработанные логические мини-сериалы (плейлисты) из 3-5 выпусков со сквозным сюжетом, перекрестными ссылками и тизерами.`,
    "",
    customInst
  );

  const epCount = Math.max(3, Math.min(5, episodeCount));
  const prompt = `Создай 2 уникальных мини-сериала (плейлиста) по теме/запросу "${topicOrQuery}" в нише "${niche}".
Каждый мини-сериал должен содержать от ${epCount} связных выпусков (эпизодов).

Для каждого выпуска ОБЯЗАТЕЛЬНО укажи:
1. episodeNumber (1, 2, 3...)
2. title (Цепляющий YouTube-заголовок)
3. description (Подробная аннотация выпуска)
4. duration (например: "10-15 мин")
5. tone (например: "Экспертный, интригующий")
6. viral_potential (например: "Высокий (94%)")
7. previousBridge (Связка с прошлым выпуском: как этот выпуск ссылается на предыдущий episode)
8. nextBridge (Связка со следующим выпуском: какую тему закладывает для следующего)
9. nextTeaserScript (Готовый сценарий анонса/клиффхэнгера на 15-30 секунд в конце ролика для подсадки на следующий episode)
10. teaserHookType (Тип интриги: "Клиффхэнгер", "Неожиданный тест", "Кейс-загадка")
11. ctaToNextEpisode (Призыв к действию переключиться на следующий выпуск)

Верни JSON с массивом из 2 объектов MiniSeries.`;

  try {
    const response = await callGeminiWithRetry({
      model: options?.model || "gemini-3.7-flash",
      contents: buildContents(prompt, options),
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              seriesTitle: { type: Type.STRING },
              topicBranch: { type: Type.STRING },
              description: { type: Type.STRING },
              targetAudienceGoal: { type: Type.STRING },
              episodes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    episodeNumber: { type: Type.INTEGER },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    duration: { type: Type.STRING },
                    tone: { type: Type.STRING },
                    viral_potential: { type: Type.STRING },
                    previousBridge: { type: Type.STRING },
                    nextBridge: { type: Type.STRING },
                    nextTeaserScript: { type: Type.STRING },
                    teaserHookType: { type: Type.STRING },
                    ctaToNextEpisode: { type: Type.STRING }
                  },
                  required: ["episodeNumber", "title", "description", "previousBridge", "nextBridge", "nextTeaserScript"]
                }
              }
            },
            required: ["seriesTitle", "topicBranch", "description", "episodes"]
          }
        }
      }
    });

    const parsed = safeParseJSON<Partial<MiniSeries>[]>(extractTextFromResponse(response), []);
    return parsed.map((s, idx) => ({
      id: `series-${Date.now()}-${idx}`,
      seriesTitle: s.seriesTitle || `Мини-сериал ${idx + 1}`,
      topicBranch: s.topicBranch || topicOrQuery,
      description: s.description || '',
      targetAudienceGoal: s.targetAudienceGoal || 'Освоение темы от А до Я',
      episodes: (s.episodes || []).map((ep, eIdx) => ({
        episodeNumber: ep.episodeNumber || eIdx + 1,
        title: ep.title || `Серия ${eIdx + 1}`,
        description: ep.description || '',
        duration: ep.duration || '10-15 мин',
        tone: ep.tone || 'Экспертный',
        viral_potential: ep.viral_potential || 'Высокий (90%)',
        previousBridge: ep.previousBridge || (eIdx > 0 ? `Как мы видели в Серии ${eIdx}...` : 'Первый вводный выпуск серии.'),
        nextBridge: ep.nextBridge || 'А в следующем выпуске мы пойдем еще дальше...',
        nextTeaserScript: ep.nextTeaserScript || 'Смотрите анонс следующей серии в конце видео!',
        teaserHookType: ep.teaserHookType || 'Интрига',
        ctaToNextEpisode: ep.ctaToNextEpisode || 'Кликайте на конечную заставку для перехода к следующей серии!'
      })),
      createdAt: new Date().toISOString()
    }));
  } catch (err) {
    logger.error("Error generating mini series tree:", err);
    return [];
  }
}


export async function clusterIdeasIntoMiniSeries(
  ideas: (string | GeneratedIdea)[],
  niche: string,
  options?: AnalysisOptions
): Promise<MiniSeries[]> {
  const customInst = getCustomInstructions(options);
  const ideaListStr = (ideas || [])
    .filter(Boolean)
    .map((id, idx) => {
      const title = typeof id === 'string' ? id : (id && typeof id === 'object' && 'title' in id ? id.title : '');
      const desc = typeof id === 'object' && id && 'description' in id ? id.description || '' : '';
      return title ? `${idx + 1}. "${title}" ${desc ? `(${desc})` : ''}` : '';
    })
    .filter(Boolean)
    .join('\n');

  const systemInstruction = validateAndEnrichSystemPrompt(
    `Ты - YouTube сериализатор и методист контент-стратегии. Твоя задача - проанализировать хаотичный список идей канала и объединить их в 2-3 логических мини-сериала из 3-5 выпусков каждый с перекрестными ссылками и анонс-тизерами.`,
    "",
    customInst
  );

  const prompt = `Проанализируй список из имеющихся идей канала в нише "${niche}":

${ideaListStr}

Сгруппируй эти идеи (и при необходимости доработай заголовки/связи) в 2-3 логических МИНИ-СЕРИАЛА (по 3-5 серий в каждом).
Для каждой серии сгенерируй:
- episodeNumber (1, 2, 3...)
- title (Название серии)
- description (Описание)
- previousBridge (Перекрестная ссылка на прошлый выпуск)
- nextBridge (Перекрестная ссылка на следующий выпуск)
- nextTeaserScript (Автосгенерированный сценарий тизера для следующей серии на 15-30 сек)
- teaserHookType (Тип интриги)
- ctaToNextEpisode (CTA перехода)

Верни JSON с массивом MiniSeries.`;

  try {
    const response = await callGeminiWithRetry({
      model: options?.model || "gemini-3.7-flash",
      contents: buildContents(prompt, options),
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              seriesTitle: { type: Type.STRING },
              topicBranch: { type: Type.STRING },
              description: { type: Type.STRING },
              targetAudienceGoal: { type: Type.STRING },
              episodes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    episodeNumber: { type: Type.INTEGER },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    duration: { type: Type.STRING },
                    tone: { type: Type.STRING },
                    viral_potential: { type: Type.STRING },
                    previousBridge: { type: Type.STRING },
                    nextBridge: { type: Type.STRING },
                    nextTeaserScript: { type: Type.STRING },
                    teaserHookType: { type: Type.STRING },
                    ctaToNextEpisode: { type: Type.STRING }
                  },
                  required: ["episodeNumber", "title", "description", "previousBridge", "nextBridge", "nextTeaserScript"]
                }
              }
            },
            required: ["seriesTitle", "topicBranch", "description", "episodes"]
          }
        }
      }
    });

    const parsed = safeParseJSON<Partial<MiniSeries>[]>(extractTextFromResponse(response), []);
    return parsed.map((s, idx) => ({
      id: `series-cluster-${Date.now()}-${idx}`,
      seriesTitle: s.seriesTitle || `Кластер Сериал ${idx + 1}`,
      topicBranch: s.topicBranch || `Тематическая ветка ${idx + 1}`,
      description: s.description || '',
      targetAudienceGoal: s.targetAudienceGoal || 'Сквозное погружение в тему',
      episodes: (s.episodes || []).map((ep, eIdx) => ({
        episodeNumber: ep.episodeNumber || eIdx + 1,
        title: ep.title || `Серия ${eIdx + 1}`,
        description: ep.description || '',
        duration: ep.duration || '12 мин',
        tone: ep.tone || 'Экспертный',
        viral_potential: ep.viral_potential || 'Очень высокий (93%)',
        previousBridge: ep.previousBridge || 'Связка с прошлым эпизодом',
        nextBridge: ep.nextBridge || 'Связка со следующим эпизодом',
        nextTeaserScript: ep.nextTeaserScript || 'Тизер следующего выпуска',
        teaserHookType: ep.teaserHookType || 'Загадка',
        ctaToNextEpisode: ep.ctaToNextEpisode || 'Переходите к следующему ролику'
      })),
      createdAt: new Date().toISOString()
    }));
  } catch (err) {
    logger.error("Error clustering ideas into mini series:", err);
    return [];
  }
}








export async function generateChannelStrategy(
  channelStats: { title: string; subscribers: string; views: string; videos: string },
  activeNiche: string,
  options?: AnalysisOptions
): Promise<ChannelStrategyResult> {
  const prompt = `Действуй как выдающийся YouTube-стратег и продюсер. Твоя задача — составить персонализированную стратегию развития и пошаговые рекомендации для YouTube канала на основе его реальных статистических данных из YouTube API.

Данные канала:
- Название канала: "${channelStats.title}"
- Подписчики: ${channelStats.subscribers}
- Всего просмотров: ${channelStats.views}
- Всего загруженных видео: ${channelStats.videos}
- Ниша / Тематика канала: "${activeNiche}"

ИНСТРУКЦИЯ ПО АНАЛИЗУ:
1. Оцени текущую стадию канала (например: "Старт и разгон" [если <1000 суб], "Набор аудитории" [1000-10000 суб], "Масштабирование контента" [10000-50000 суб], "Уверенное позиционирование" [>50000 суб]). Назови стадию и опиши её особенности и вызовы в currentStageName и currentStageDesc.
2. Проанализируй соотношение показателей (просмотры на одно видео в среднем, конверсию просмотров в подписчиков). Напиши ёмкие комментарии для metricsAnalysis.viewsPerVideoComment и metricsAnalysis.subConversionComment. Рассчитай общий балл здоровья канала от 0 до 100 в metricsAnalysis.overallHealthScore.
3. Предложи 3-4 конкретных, измеримых стратегических предложения (suggestions), адаптированных под текущий размер канала и нишу. Каждое предложение должно содержать:
   - title: Название рекомендации (коротко и емко)
   - priority: Приоритет ("Высокий", "Средний" или "Низкий")
   - impact: Потенциальный эффект (например, "+15% к CTR", "увеличение удержания на 40 секунд" или "рост конверсии в подписку")
   - description: Подробное обоснование и анализ (2-3 предложения)
   - actionSteps: Конкретные пошаговые действия для реализации (3-4 практических шага)
4. Выдели 3 핵심 (Content Pillars) контентных столпа/направления, на которые каналу стоит опереться прямо сейчас. Каждое направление должно иметь title и description.
5. Предложи идеальную частоту публикаций и контент-план удержания (uploadConsistencyPlan) — например: "2 длинных видео в неделю (по вторникам и пятницам) + 3 Shorts в промежутках для охвата новой аудитории".

Верни ответ СТРОГО в формате JSON на русском языке (используй букву ё везде, где нужно), без лишних символов, маркдауна или оберток, соответствующих схеме:
{
  "currentStageName": "...",
  "currentStageDesc": "...",
  "metricsAnalysis": {
    "viewsPerVideoComment": "...",
    "subConversionComment": "...",
    "overallHealthScore": 85
  },
  "strategicSuggestions": [
    {
      "title": "...",
      "priority": "Высокий",
      "impact": "...",
      "description": "...",
      "actionSteps": ["...", "..."]
    }
  ],
  "contentPillars": [
    {
      "title": "...",
      "description": "..."
    }
  ],
  "uploadConsistencyPlan": "..."
}`;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.7-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          currentStageName: { type: Type.STRING },
          currentStageDesc: { type: Type.STRING },
          metricsAnalysis: {
            type: Type.OBJECT,
            properties: {
              viewsPerVideoComment: { type: Type.STRING },
              subConversionComment: { type: Type.STRING },
              overallHealthScore: { type: Type.INTEGER }
            },
            required: ["viewsPerVideoComment", "subConversionComment", "overallHealthScore"]
          },
          strategicSuggestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                priority: { type: Type.STRING },
                impact: { type: Type.STRING },
                description: { type: Type.STRING },
                actionSteps: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["title", "priority", "impact", "description", "actionSteps"]
            }
          },
          contentPillars: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["title", "description"]
            }
          },
          uploadConsistencyPlan: { type: Type.STRING }
        },
        required: ["currentStageName", "currentStageDesc", "metricsAnalysis", "strategicSuggestions", "contentPillars", "uploadConsistencyPlan"]
      }
    }
  });

  return safeParseJSON<ChannelStrategyResult>(
    extractTextFromResponse(response),
    {
      currentStageName: "Оценка канала",
      currentStageDesc: "Анализируем показатели для выработки рекомендаций.",
      metricsAnalysis: {
        viewsPerVideoComment: "Недостаточно данных.",
        subConversionComment: "Недостаточно данных.",
        overallHealthScore: 50
      },
      strategicSuggestions: [],
      contentPillars: [],
      uploadConsistencyPlan: "Поддерживайте регулярный график публикаций."
    }
  );
}


export async function generatePlaylistSuggestions(niche: string, currentIdeas: any[], options: { model?: string } = {}) {
  const prompt = `
Ниша: ${niche}
Список текущих идей: ${JSON.stringify(currentIdeas.slice(0, 20).map((i: any) => typeof i === 'string' ? i : i.title))}

На основе ниши и идей предложи 10 креативных, кликабельных названий для плейлистов (для группировки идей) и 10 названий для серий видео (мини-сериалов).
Названия должны быть интригующими, короткими и ориентированными на YouTube.

ОТВЕТЬ ТОЛЬКО В ФОРМАТЕ JSON:
{
  "playlistNames": ["название 1", ...],
  "seriesNames": ["название 1", ...]
}
  `.trim();

  const response = await callGeminiWithRetry({
    model: options.model || "gemini-3.7-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { responseMimeType: "application/json" }
  });

  const text = extractTextFromResponse(response);
  if (!text) return null;
  return tryRepairJSON(text);
}










export async function analyzeIdeaDeeply(
  title: string,
  niche?: string,
  description?: string,
  options?: any
): Promise<IdeaDeepAnalysis> {
  const prompt = `
Проведи экспертный глубокий анализ идеи для видео:
Название темы: "${title}"
${niche ? `Ниша: "${niche}"` : ''}
${description ? `Описание/Концепт: "${description}"` : ''}

Оцени 2 главных параметра:
1. **Уникальность темы** (uniquenessScore от 1 до 100, uniquenessLabel: "Эксклюзивная"|"Высокая"|"Средняя"|"Стандартная", uniquenessAnalysis - детальный анализ свежести концепта, competitiveAngle - оригинальный ракурс или отстройка от конкурентов).
2. **Сложность реализации** (complexityScore от 1 до 5, complexityLabel: "Очень простая"|"Простая"|"Средняя"|"Высокая"|"Сложная", complexityBreakdown: research, production, editing, resources - список нужных ресурсов).

Также дай:
- **Анализ аудитории** (targetAudienceInsights)
- **Триггеры удержания** (retentionTriggers - 3-4 ключевых момента удержания)
- **Рекомендации по улучшению концепта** (recommendations - 3-4 конкретных совета для максимального CTR и просмотров)

ОТВЕТЬ СТРОГО В ФОРМАТЕ JSON:
{
  "uniquenessScore": 85,
  "uniquenessLabel": "Высокая",
  "uniquenessAnalysis": "Тема слабо заезжена в данном сегменте...",
  "competitiveAngle": "Подать тему через призму практического эксперимента...",
  "complexityScore": 3,
  "complexityLabel": "Средняя",
  "complexityBreakdown": {
    "research": "Потребуется 1-2 часа на проверку истока данных.",
    "production": "Съемка в формате говорящая голова + говорящий экран.",
    "editing": "Средний монтаж с акцентными субтитрами и плашками.",
    "resources": ["Микрофон", "Запись экрана", "Графические плашки"]
  },
  "targetAudienceInsights": "Зрители, ищущие быстрые решения...",
  "retentionTriggers": ["Парадокс на 15 секунде", "Интрига до финального вывода"],
  "recommendations": ["Добавить интерактивный опрос", "Использовать контрастный заголовок"]
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
          uniquenessScore: { type: Type.NUMBER },
          uniquenessLabel: { type: Type.STRING },
          uniquenessAnalysis: { type: Type.STRING },
          competitiveAngle: { type: Type.STRING },
          complexityScore: { type: Type.NUMBER },
          complexityLabel: { type: Type.STRING },
          complexityBreakdown: {
            type: Type.OBJECT,
            properties: {
              research: { type: Type.STRING },
              production: { type: Type.STRING },
              editing: { type: Type.STRING },
              resources: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["research", "production", "editing", "resources"]
          },
          targetAudienceInsights: { type: Type.STRING },
          retentionTriggers: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: [
          "uniquenessScore", "uniquenessLabel", "uniquenessAnalysis", "competitiveAngle",
          "complexityScore", "complexityLabel", "complexityBreakdown",
          "targetAudienceInsights", "retentionTriggers", "recommendations"
        ]
      }
    }
  });

  const resText = extractTextFromResponse(response);
  if (!resText) {
    throw new Error("Не удалось получить анализ от AI");
  }
  return tryRepairJSON(resText);
}






export async function generateIdeaDetails(
  idea: string,
  niche: string,
  channelName?: string,
  competitorAnalysis?: string,
  options?: AnalysisOptions
): Promise<{
  scriptTemplate: { phase: string; content: string }[];
  editingTips: string[];
  seo: { keywords: string; hashtags: string[] };
  analytics: {
    views: string;
    retention: string;
    ctr: string;
    estimatedEarnings: string;
    subscriberGrowth: { month: string; count: number }[];
    competitorComparison: { metric: string; you: number; average: number }[];
    growthStrategy: string[];
  };
  shorts: { title: string; hook: string; viral_potential: string }[];
  production: { visualStyle: string; animationType: string; musicMood: string };
}> {
  const customInst = getCustomInstructions(options);
  const competitorContext = competitorAnalysis ? `
Учитывай анализ конкурентов:
${competitorAnalysis}` : "";

  const ideaDescContext = options?.ideaDescription ? `
Описание идеи от пользователя: "${options.ideaDescription}"` : "";

  const ideaNoteContext = options?.ideaNote ? `
ВАЖНО — ПЕРСОНАЛЬНЫЕ ЗАМЕТКИ И ПОЖЕЛАНИЯ АВТОРА К ЭТОЙ ИДЕЕ:
"${options.ideaNote}"
ОБЯЗАТЕЛЬНО детально интегрируй эти авторские заметки, мысли и требования в структуру фаз сценария (scriptTemplate), структуру блоков и советы!` : "";

  const prompt = `Разработай детальный план производства, сценария, SEO и аналитики для конкретной идеи видео на YouTube.
  Идея: "${idea}"${ideaDescContext}${ideaNoteContext}
  Ниша: "${niche}"
  Название канала: "${channelName || "Не указано"}"${competitorContext}
  ${customInst}
  
  Верни JSON объект со следующими полями:
  - scriptTemplate: массив объектов { phase: string (фаза/блок, например "Интро", "Крючок", "Основная часть"), content: string (содержимое фазы) }
  - editingTips: массив строк (советы по монтажу)
  - seo: объект { keywords: string (ключевые слова через запятую), hashtags: массив строк }
  - analytics: объект {
      views: string (прогноз просмотров, например "10K - 50K"),
      retention: string (прогноз удержания, например "45% - 55%"),
      ctr: string (прогноз CTR, например "6% - 10%"),
      estimatedEarnings: string (прогноз дохода),
      subscriberGrowth: массив { month: string, count: number } (прогноз роста по месяцам, 3 точки),
      competitorComparison: массив { metric: string, you: number, average: number } (сравнение метрик),
      growthStrategy: массив строк (стратегия роста)
    }
  - shorts: массив объектов { title: string, hook: string, viral_potential: string } (3 идеи Shorts из этого видео)
  - production: объект {
      visualStyle: string (описание визуального стиля для промптов, например "Tech Neon Minimalist"),
      animationType: string (тип анимации),
      musicMood: string (настроение фоновой музыки)
    }
  
  ОБЯЗАТЕЛЬНО используй букву "ё" во всех словах, где она пишется.`;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.7-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          scriptTemplate: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                phase: { type: Type.STRING },
                content: { type: Type.STRING }
              },
              required: ["phase", "content"]
            }
          },
          editingTips: { type: Type.ARRAY, items: { type: Type.STRING } },
          seo: {
            type: Type.OBJECT,
            properties: {
              keywords: { type: Type.STRING },
              hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["keywords", "hashtags"]
          },
          analytics: {
            type: Type.OBJECT,
            properties: {
              views: { type: Type.STRING },
              retention: { type: Type.STRING },
              ctr: { type: Type.STRING },
              estimatedEarnings: { type: Type.STRING },
              subscriberGrowth: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    month: { type: Type.STRING },
                    count: { type: Type.NUMBER }
                  },
                  required: ["month", "count"]
                }
              },
              competitorComparison: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    metric: { type: Type.STRING },
                    you: { type: Type.NUMBER },
                    average: { type: Type.NUMBER }
                  },
                  required: ["metric", "you", "average"]
                }
              },
              growthStrategy: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["views", "retention", "ctr", "estimatedEarnings", "subscriberGrowth", "competitorComparison", "growthStrategy"]
          },
          shorts: {
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
          },
          production: {
            type: Type.OBJECT,
            properties: {
              visualStyle: { type: Type.STRING },
              animationType: { type: Type.STRING },
              musicMood: { type: Type.STRING }
            },
            required: ["visualStyle", "animationType", "musicMood"]
          }
        },
        required: ["scriptTemplate", "editingTips", "seo", "analytics", "shorts", "production"]
      }
    }
  });

  return safeParseJSON<{
    scriptTemplate: { phase: string; content: string }[];
    editingTips: string[];
    seo: { keywords: string; hashtags: string[] };
    analytics: {
      views: string;
      retention: string;
      ctr: string;
      estimatedEarnings: string;
      subscriberGrowth: { month: string; count: number }[];
      competitorComparison: { metric: string; you: number; average: number }[];
      growthStrategy: string[];
    };
    shorts: { title: string; hook: string; viral_potential: string }[];
    production: { visualStyle: string; animationType: string; musicMood: string };
  }>(extractTextFromResponse(response), {
    scriptTemplate: [],
    editingTips: [],
    seo: { keywords: "", hashtags: [] },
    analytics: {
      views: "",
      retention: "",
      ctr: "",
      estimatedEarnings: "",
      subscriberGrowth: [],
      competitorComparison: [],
      growthStrategy: []
    },
    shorts: [],
    production: { visualStyle: "", animationType: "", musicMood: "" }
  });
}