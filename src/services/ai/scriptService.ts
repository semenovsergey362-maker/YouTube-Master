import { logger } from "../../config/logger";
import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import { formatBreathingScriptText } from "../../utils/helpers";
import {
  ScriptStructureResponseSchema,
  GeneratedScriptBlockSchema,
  ScriptBreakdownResponseSchema,
} from "../../types/schemas";
import {
  AnalysisOptions,
  AnalysisSource,
  BrandProfile,
  AudiencePortrait,
  ChannelVideoInfo,
  ScriptBlockStructure,
  ScriptScene,
  SceneBreakdown,
  ScriptBlock,
  GeneratedBlock,
  ScriptImprovement,
  SentimentPoint,
  RetentionPointFix,
  RetentionPoint,
  RetentionAnalysisResult,
  VideoSEO,
  SEOAnalysis,
  TextVariation,
  PromotionStrategy,
  StrategySuggestion,
  ChannelStrategyResult,
  GeneratedIdea,
  NicheData,
  ViewerAvatar,
  ContentRecommendations,
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
import {
  validateAndEnrichSystemPrompt,
  VISUAL_DIVERSITY_RULES,
} from "./visualPromptService";

export const GENERIC_SCENARIO_INSTRUCTIONS = `ПРИ СОЗДАНИИ идей и сценария для видео СТРОГО СОБЛЮДАЙ СЛЕДУЮЩУЮ СТРУКТУРУ КАДРОВ И СЦЕН:

Вы — эксперт-сценарист для YouTube с 10-летним стажем, специализирующийся на удержании аудитории и сторителлинге. Вы выступаете в роли высококлассного YouTube-сценариста и инженера зрительского удержания. Вы в совершенстве владеете психологией зрителя, законами драматургии и алгоритмическими принципами YouTube. Ваша специализация — создание сценариев для видеороликов, которые удерживают внимание аудитории на уровне лучших мировых каналов.
ГЛАВНАЯ ЦЕЛЬ: Не просто рассказать информацию, а провести зрителя через эмоциональное путешествие: ПРОБЛЕМА → УЗНАВАНИЕ СЕБЯ → ВОПРОС → ИСТИНА/РЕШЕНИЕ → ОБЪЯСНЕНИЕ → ПРАКТИЧЕСКОЕ ПРИМЕНЕНИЕ → НАДЕЖДА

Стиль: Пиши разговорным, живым языком (Grade 6 level). Избегай сложных академических терминов и «воды». Используй «человеческий» стиль общения.

Реализация правила 10 секунд: в левой колонке визуальный ряд должен меняться каждые 10 секунд.

Структура: Всегда следуй структуре: Крючок (до 45 сек), Контекст, 3-5 основных блоков с переходами, Кульминация и CTA

Динамика: В конце каждого блока добавляй «Бридж-фразу» (мостик), которая вызывает любопытство к следующей части.

Открытые петли: В начале видео упомяни важный инсайт, который будет раскрыт только в конце.

Предпоследняя или финальная сцена: ОБЯЗАТЕЛЬНО должен присутствовать призыв к действию — попроси зрителя поставить лайк и подписаться на канал!

Вы обязаны исключить любые признаки шаблонного ИИ-письма. Нарушение этих правил делает сценарий непригодным для производства.

ЗАПРЕЩЕНО использовать пафосные обобщения и штампы: "изменить правила игры", "раскрыть потенциал", "шаг навстречу будущему", "уникальный инструмент", "погрузиться в тему", "давайте разберемся". Пишите конкретно и фактурно.

ЗАПРЕЩЕНО начинать видео с риторических вопросов формата "Задумывались ли вы когда-нибудь...?".

ЗАПРЕЩЕНО использовать фасилитирующие конструкции: "Давайте начнем", "Перейдем к первому шагу", "Как мы видим из этого примера". Переходите к сути без предупреждений.

Пишите в разговорном стиле. Используйте короткие предложения переменной длины. Избегайте причастных и деепричастных оборотов, канцеляризмов и тяжелых академических конструкций.

Каждый генерируемый сценарий должен следовать строгому алгоритму удержания внимания:

Фаза Hook (0:00 - 0:30)
Первые 5 секунд: Мгновенный разрыв шаблона (визуальный парадокс или шокирующее утверждение). Приветствия, заставки и представление автора запрещены.

5-15 секунд: Озвучивание конкретного ценностного обещания (результата), соответствующего кликнутому превью.

15-30 секунд: Открытие интриги или создание информационного дефицита (Open Loop), который заставляет смотреть видео дальше.

Фаза Body (Основная часть)
Деление на логические модульные блоки. Каждый блок имеет структуру: [Микро-крючок] -> [Суть шага с доказательствами] -> [Логическая причинно-следственная связка со следующим блоком].

Интеграция 2-4 открытых петель. Интрига должна наслаиваться одна на другую.

Размещение рекламы/интеграции (если применимо): строго после завершения первого содержательного блока и закрытия первой петли (не ранее 4-й минуты видео).

Фаза Payoff (Заключение)
Быстрое и динамичное закрытие всех открытых петель.

Короткий и емкий вывод без демагогии.

Один сильный призыв к действию (CTA), направленный на переход к следующему связанному видеоролику на канале для создания сессионной ловушки.

Интегрируйте в сценарий точки повторного вовлечения (Re-engagement Beats) на отметках 25% и 65% хронометража. Это могут быть короткие истории, парадоксальные факты или призывы к конкретному действию в комментариях.`;


















export function getCustomInstructions(options?: AnalysisOptions, forceIncludeGeneric = false): string {
  const base = (forceIncludeGeneric || options?.isScript) ? GENERIC_SCENARIO_INSTRUCTIONS : "";
  const ui = getActiveCustomInstructionsText(options?.customInstructions);
  const regionContext = options?.region && options.region !== 'global' ? `

ЦЕЛЕВОЙ ГЕО-РЕГИОН / ЛОКАЛИЗАЦИЯ: "${options.region}". Адаптируй контент, терминологию, культурные отсылки и SEO под этот рынок.
` : "";

  let customHeader = "";
  if (ui) {
    customHeader = `
=== 🚨 КАСТОМНЫЕ ИНСТРУКЦИИ ПОЛЬЗОВАТЕЛЯ (ОБЯЗАТЕЛЬНЫ К ИЗУЧЕНИЮ И ПРИМЕНЕНИЮ ВО ВСЕХ ВКЛАДКАХ И ДЛЯ SEO) ===
${ui}${regionContext}
================================================================================
`;
  } else if (regionContext) {
    customHeader = `
=== 🌍 ГЕО-ЛОКАЛИЗАЦИЯ ===${regionContext}
==========================
`;
  }

  let brandContext = "";
  if (options?.brandProfile) {
    const bp = options.brandProfile;
    brandContext += `

=== ЕДИНЫЙ БРЕНДБУК КАНАЛА (STYLE PROFILE) ===
`;
    if (bp.toneOfVoice) brandContext += `• Тональность речи (Tone of Voice): "${bp.toneOfVoice}"
`;
    if (bp.thumbnailStyle) brandContext += `• Визуальный стиль и обложки: "${bp.thumbnailStyle}"
`;
    if (bp.colors && bp.colors.length > 0) brandContext += `• Фирменная палитра цветов: ${bp.colors.join(", ")}
`;
    if (bp.primaryFont) brandContext += `• Шрифт заголовков: ${bp.primaryFont}
`;
    if (bp.bodyFont) brandContext += `• Основной шрифт текста: ${bp.bodyFont}
`;
    if (bp.visualAestheticDescription) brandContext += `• Визуальная эстетика: ${bp.visualAestheticDescription}
`;
    brandContext += `ВСЕ сгенерированные тексты, сценарии, обложки и визуальные промпты ДОЛЖНЫ строго следовать этому брендбуку!
`;
  } else if (options?.toneOfVoice) {
    brandContext += `
• Тональность речи (Tone of Voice): "${options.toneOfVoice}"
`;
  }

  if (options?.audiencePortrait) {
    const ap = options.audiencePortrait;
    brandContext += `
=== ПОРТРЕТ ЦЕЛЕВОЙ АУДИТОРИИ И АВАТАР ЗРИТЕЛЯ ===
`;
    if (ap.avatar?.name) brandContext += `• Портрет зрителя: ${ap.avatar.name} (${ap.avatar.occupation || ''}). Цель: ${ap.avatar.coreGoal || ''}
`;
    if (ap.pains && ap.pains.length > 0) brandContext += `• Боли ЦА: ${ap.pains.join("; ")}
`;
    if (ap.questions && ap.questions.length > 0) brandContext += `• Вопросы и искания ЦА: ${ap.questions.join("; ")}
`;
    if (ap.values && ap.values.length > 0) brandContext += `• Ценности ЦА: ${ap.values.join("; ")}
`;
    if (ap.recommendations?.narrativeAngle) brandContext += `• Подача материала: ${ap.recommendations.narrativeAngle}
`;
    if (ap.recommendations?.whatToAvoid) brandContext += `• Чего избегать: ${ap.recommendations.whatToAvoid}
`;
    brandContext += `Формируй контент так, чтобы он битно попадал в боли, ценности и привычки этого зрителя!
`;
  }

  return `${customHeader}

${brandContext}

${base}`.trim();
}


export function getChannelVideosContext(options?: AnalysisOptions): string {
  if (!options?.existingChannelVideos || options.existingChannelVideos.length === 0) {
    return "";
  }
  const videoList = options.existingChannelVideos
    .slice(0, 40)
    .map((v, idx) => `${idx + 1}. "${v.title}"${v.description ? ` (Кратко: ${v.description.slice(0, 100)}...)` : ''}`)
    .join("\n");

  return `

--- УЖЕ ЗАГРУЖЕННЫЕ ИЛИ ОПУБЛИКОВАННЫЕ ВИДЕО НА КАНАЛЕ ПОЛЬЗОВАТЕЛЯ (с вкладки YouTube) ---
Пользователь привязал свой YouTube-канал или предоставил список уже выпущенных роликов:
${videoList}

СТРОГИЕ ИНСТРУКЦИИ ПО УЧЕТУ СУЩЕСТВУЮЩИХ ВИДЕО:
1. НЕ дублируй уже выходившие темы и заголовки из списка выше!
2. Предлагай ТОЛЬКО новые идеи, ЛИБО идеи, которые являются ЛОГИЧЕСКИМ ПРОДОЛЖЕНИЕМ (сиквел, "Часть 2", развитием темы прошлых роликов, более подробным разбором, ответами на вопросы зрителей или экспериментом на основе результатов прошлого видео).
3. Для тем, являющихся логическим продолжением какого-либо из существующих видео, ОБЯЗАТЕЛЬНО укажи в описании (description) специальную пометку:
"🔄 Логическое продолжение видео «[Название старого ролика]»: [Концепция и сюжет продолжения]".
`;
}


export async function generateHooks(topic: string, format: string, options?: AnalysisOptions): Promise<string[]> {
  const prompt = `Генерируй 3 варианта цепляющих заголовков-хуков для YouTube-видео на тему "${topic}".
  Формат видео: "${format}".
  Хуки должны быть максимально кликабельными, вызывать сильное любопытство, интриговать или бросать вызов.
  Используй парадоксы, цифры, интригующие вопросы.
  Верни только JSON-массив из 3 строк.`;
  
  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.7-flash",
    contents: buildContents(prompt, options),
    config: { responseMimeType: "application/json" }
  });
  
  return safeParseJSON(extractTextFromResponse(response), []);
}


export async function generateSRTContent(scriptText: string, options?: AnalysisOptions): Promise<string> {
  const prompt = `На основе текста сценария сгенерируй стандартный файл субтитров SRT.
  Текст сценария содержит разметку TTS (например, "[шепот]", "*акцент*", "(500ms)"). 
  Очисти текст от технической разметки и распредели фразы по временным меткам.
  Каждая фраза в субтитре должна длиться от 2 до 5 секунд, в зависимости от длины текста.
  Постарайся сделать тайминги естественными и последовательными.
  
  Текст сценария:
  ${scriptText}
  
  Верни ТОЛЬКО валидное содержимое SRT файла. Начни сразу с первого блока (1), без тегов markdown, без комментариев и вступлений.`;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.7-flash",
    contents: prompt,
  });

  return extractTextFromResponse(response) || "";
}


export async function fixScriptBlockGrammar(
  text: string, 
  context: string,
  options?: AnalysisOptions
): Promise<string> {
  const prompt = `Ты профессиональный редактор и корректор текстов. Твоя задача — исправить грамматические, орфографические, пунктуационные, стилистические и лексические ошибки в представленном блоке сценария.
  ТЕМАТИКА ВИДЕО / КОНТЕКСТ: ${context}
  ИСХОДНЫЙ ТЕКСТ:
  ${text}
  
  ВАЖНО: В тексте сценария ОБЯЗАТЕЛЬНО используй букву "ё" там, где это необходимо. Сохраняй разметку TTS.
  Верни ТОЛЬКО исправленный текст без комментариев и оформления.`;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.7-flash",
    contents: prompt,
  });

  return extractTextFromResponse(response)?.trim() || text;
}


export async function parseUploadedScript(rawText: string, options?: AnalysisOptions): Promise<{ phase: string; content: string }[]> {
  const toneContext = getToneContext(options);
  const prompt = `Ниже представлен сырой текст сценария. Разбей его на логические части (структуру), подходящую для YouTube видео.
  Обычно это: Вступление, Основная часть (возможно несколько блоков), Заключение.
  Для каждой части выдели ключевое содержание из предоставленного текста.
  Текст:
  ${rawText}
  
  ${toneContext}
  
  Верни JSON массив объектов с полями "phase" (заголовок части) и "content" (текст этой части).`;

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
            phase: { type: Type.STRING },
            content: { type: Type.STRING },
          },
          required: ["phase", "content"],
        },
      },
    },
  });

  return safeParseJSON<{ phase: string; content: string }[]>(extractTextFromResponse(response), []);
}


export async function generateScriptStructure(
  idea: string,
  duration: string,
  mode: string,
  tone: string,
  wishes: string,
  competitorAnalysis?: string,
  options?: AnalysisOptions
): Promise<ScriptBlockStructure[]> {
  const competitorContext = competitorAnalysis ? `
ОБЯЗАТЕЛЬНО учитывай слабые стороны конкурентов и способы их обхода:
${competitorAnalysis}` : "";
  const wishesContext = wishes ? `

[КРИТИЧЕСКИЕ СИСТЕМНЫЕ ТРЕБОВАНИЯ И СТРОГАЯ СТРУКТУРА ОТ ПОЛЬЗОВАТЕЛЯ]:
${wishes}
[КОНЕЦ КРИТИЧЕСКИХ ТРЕБОВАНИЙ]

ВНИМАНИЕ: Все данные выше являются ПРИОРИТЕТНЫМИ. Ты ОБЯЗАН внедрить каждый факт и следовать структуре, если она указана.` : "";
  const toneContext = getToneContext(options) || `
Тон: ${tone}`;
  const customInst = getCustomInstructions(options, true);
  const numDuration = parseDurationInMinutes(duration);
  
  const systemInstruction = validateAndEnrichSystemPrompt(
    `Ты - экспертный сценарист YouTube. Твоя задача - создать структуру сценария, которая будет максимально виральной и качественной.`,
    wishes,
    customInst,
    { ...options, isScript: true }
  );

  let prompt = "";
  if (options?.noVoiceover) {
    prompt = `Сгенерируй структуру видео БЕЗ ДИКТОРСКОЙ ОЗВУЧКИ на тему "${idea}".
СТРОГОЕ ТРЕБОВАНИЕ ПО ДЛИТЕЛЬНОСТИ: ${duration} мин. 
Режим: ${mode}.
${toneContext}${competitorContext}

Поскольку в видео нет диктора и озвучки, разбей его на логические визуально-музыкальные эпизоды/блоки.
Для каждого блока укажи название, тип, примерное время, описание визуальной атмосферы и примерное количество символов для описания (estimatedChars - около 300-500).

Верни JSON массив объектов ScriptBlockStructure { title: string, type: string, description: string, estimatedTime: string, estimatedChars: number }.`;
  } else {
    const shortsRule = mode === "Shorts" ? "\nВАЖНО ДЛЯ SHORTS: В последнем блоке ОБЯЗАТЕЛЬНО добавь призыв перейти на канал!" : "";
    const targetWordsTotal = Math.round(numDuration * 140);
    const targetCharsTotal = Math.round(numDuration * 1050);
    prompt = `Сгенерируй структуру сценария для YouTube видео на тему "${idea}".
СТРОГОЕ ТРЕБОВАНИЕ ПО ХРОНОМЕТРАЖУ: ровно ${numDuration} мин. (${targetWordsTotal} слов текста).
Режим: ${mode}.
${toneContext}${competitorContext}${shortsRule}

РАЗБИЕНИЕ НА БЛОКИ (КРИТИЧЕСКИ ВАЖНО):
Разбей сценарий на смысловые блоки (главы/секции), соответствующие логике повествования (например: Вступление, Проблема, Основная часть (несколько блоков), Решение, Опыт, Заключение).
Каждый блок должен представлять собой законченную мысль или этап сюжета.

Для каждого блока укажи:
- title: название блока
- type: тип блока
- description: краткое описание, о чем говорить
- estimatedTime: примерное время (в секундах или "M:SS", сумма по всем блокам должна составить ${Math.round(numDuration * 60)} сек)
- estimatedChars: количество символов для блока (в сумме по всем блокам ровно ~${targetCharsTotal} знаков или ~${targetWordsTotal} слов)

Суммарное количество estimatedChars для ВСЕХ блоков вместе взятых должно быть СТРОГО ${targetCharsTotal} знаков (что соответствует ${targetWordsTotal} словам текста при скорости речи 140 слов/мин).
ЭТО ГЛАВНОЕ КРИТИЧЕСКОЕ ТРЕБОВАНИЕ. Пользователь задал хронометраж ${numDuration} минут.
- Если видео короткое (Shorts/Reels до 1 мин): общий объем ~${targetWordsTotal} слов.
- Если видео длинное (например, 16 минут): общий объем должен быть ~${16 * 140} = 2240 слов (~16800 знаков)! Распредели этот объем пропорционально по 6-12 блокам (по ~180-300 слов на блок).

Верни JSON массив объектов ScriptBlockStructure { title: string, type: string, description: string, estimatedTime: string, estimatedChars: number }.`;
  }

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.7-flash",
    contents: buildContents(prompt, options),
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            type: { type: Type.STRING },
            description: { type: Type.STRING },
            estimatedTime: { type: Type.STRING },
            estimatedChars: { type: Type.INTEGER }
          },
          required: ["title", "type", "description", "estimatedTime", "estimatedChars"]
        }
      }
    }
  });

  return safeParseJSON<ScriptBlockStructure[]>(extractTextFromResponse(response), [], ScriptStructureResponseSchema as any);
}


export async function generateScriptBlock(
  idea: string,
  block: ScriptBlockStructure,
  wishes: string,
  prevContext: string,
  totalDuration: string,
  competitorAnalysis?: string,
  options?: AnalysisOptions
): Promise<GeneratedBlock> {
  const competitorContext = competitorAnalysis ? `
ОБЯЗАТЕЛЬНО учитывай слабые стороны конкурентов и способы их обхода:
${competitorAnalysis}` : "";
  const wishesContext = wishes ? `

[КРИТИЧЕСКИЕ СИСТЕМНЫЕ ТРЕБОВАНИЯ И ФАКТЫ ДЛЯ ЭТОГО БЛОКА]:
${wishes}
[КОНЕЦ КРИТИЧЕСКИХ ТРЕБОВАНИЙ]` : "";
  const toneContext = getToneContext(options);
  const customInst = getCustomInstructions(options, true);
  
  const systemInstruction = validateAndEnrichSystemPrompt(
    `Ты - экспертный сценарист YouTube. Твоя задача - написать максимально вовлекающий текст для конкретного блока сценария.`,
    wishes,
    customInst,
    { ...options, isScript: true }
  );

  let prompt = "";
  const globalAudioContext = (options?.globalMusicMood || options?.globalAudioPrompt) 
    ? `
ВЫБРАННОЕ ЗВУКОВОЕ ОКРУЖЕНИЕ ИЗ РАЗДЕЛА ПРОМПТИНГ (ОБЯЗАТЕЛЬНО УЧИТЫВАЙ ПРИ СОСТАВЛЕНИИ musicPrompt):
- Музыкальный фон / Настроение: ${options.globalMusicMood || "Не указано"}
- Глобальный аудио промпт (темп и характер): ${options.globalAudioPrompt || "Не указано"}
`
    : "";

  if (options?.noVoiceover) {
    prompt = `Напиши plan для конкретного блока БЕЗ ДИКТОРСКОЙ ОЗВУЧКИ (релакс-музыка, ASMR, lofi, пейзажи).
ТЕМА ВИДЕО: "${idea}"
ОБЩАЯ ДЛИТЕЛЬНОСТЬ ВИДЕО: ${totalDuration} мин.
ТЕКУЩИЙ БЛОК: "${block.title}" (Тип: ${block.type})
ОПИСАНИЕ БЛОКА: "${block.description}"
${wishesContext}
${globalAudioContext}

ВАЖНО (ОЧЕНЬ ВАЖНО):
1. Если в блоке "ПОЖЕЛАНИЯ ПОЛЬЗОВАТЕЛЯ" указаны факты или идеи для этого видео - ОБЯЗАТЕЛЬНО учти их при описании атмосферы и музыки.
2. Поскольку озвучки диктора нет, поле "text" СТРОГО должно быть пустым: "" или содержать прочерк "-".
2. Опиши звуковые эффекты (sfx) (например: шелест травы, пение птиц, шум ветра, волны).
3. Опиши фоновое настроение (mood) (например: мягкий космический эмбиент, теплая lo-fi гитара, медитативная флейта).
4. Заполни musicPrompt: создай короткую точную подсказку фоновой музыки / стилей (для Treblo/Suno/Udio), строго учитывающую выбранное Звуковое Окружение (музыкальный фон, темп и характер).
5. Заполни soundLinks (ссылки на звуки или точные названия звуковых эффектов).
6. Заполни scene: опиши визуальное/физическое окружение и общую атмосферу сцены (Sets the stage. Describes both the physical environment and the mood or atmosphere of the scene).
7. Заполни sampleContext: задай контекстную отправную точку для сцены (Gives the model a contextual starting point, so the scene feels natural).

Верни JSON объект GeneratedBlock { title: string, text: string, sfx: string, mood: string, musicPrompt: string, soundLinks: string[], scene: string, sampleContext: string } c text: "".`;
  } else {
    // 140 WPM = 2.33 words per sec.
    // Calculate targeted words from estimatedChars (approx 6.5 chars per word) or duration
    const targetWords = Math.max(
      35,
      block.estimatedChars ? Math.round(block.estimatedChars / 6.5) : Math.round((parseDurationInMinutes(totalDuration) * 140) / 6)
    );
    const targetChars = block.estimatedChars || Math.round(targetWords * 6.5);

    prompt = `Напиши текст для конкретного блока сценария YouTube видео.
ТЕМА ВИДЕО: "${idea}"
ОБЩАЯ ДЛИТЕЛЬНОСТЬ ВИДЕО: ${totalDuration} мин.
ТЕКУЩИЙ БЛОК: "${block.title}" (Тип: ${block.type})
ОПИСАНИЕ БЛОКА: "${block.description || ""}"
СТРОГО ТРЕБУЕМЫЙ ОБЪЕМ ТЕКСТА ДЛЯ ЭТОГО БЛОКА: МИНИМУМ ${targetWords} СЛОВ (около ${targetChars} знаков).

${wishesContext}
${globalAudioContext}

ВАЖНО (ПРИОРИТЕТ №1): Если в блоке "КРИТИЧЕСКИЕ СИСТЕМНЫЕ ТРЕБОВАНИЯ" выше указаны конкретные факты, цитаты, статистика или структура - ты ОБЯЗАН внедрить их в текст этого блока, если они к нему относятся по смыслу! Игнорирование этих данных является критической ошибкой.
ВАЖНО: Текст должен СТРОГО соответствовать заявленному объему (НЕ МЕНЕЕ ${targetWords} слов / ~${targetChars} знаков). Это КРИТИЧЕСКОЕ ТРЕБОВАНИЕ пользователя. 
Пользователь установил общее время видео (${totalDuration} мин), и если объем текста будет меньше, видео получится короче заявленного времени. 
Поэтому пиши текст МАКСИМАЛЬНО ПОДРОБНО, обстоятельно разворачивая каждую мысль, приводя яркие примеры, аргументы и детали, чтобы достичь именно ${targetWords} слов. НЕ СОКРАЩАЙ! ЕСЛИ СДЕЛАЕШЬ МЕНЬШЕ ${targetWords} СЛОВ - ЭТО БУДЕТ КРИТИЧЕСКОЙ ОШИБКОЙ!

ПРАВИЛА РАЗБИВКИ И ФОРМАТИРОВАНИЯ ТЕКСТА (ОЧЕНЬ ВАЖНО — ТЕКСТ ДОЛЖЕН «ДЫШАТЬ»):
1. Разделяй текст на короткие логические и смысловые абзацы по 1-3 предложения (используй двойной перенос строки \\n\\n). Никаких сплошных нечитаемых «простыней» текста.
2. ЦИТАТЫ (стихи из Библии, цитаты экспертов, крылатые фразы) ОБЯЗАТЕЛЬНО выноси на отдельную строку с двойным переносом и торжественным или мудрым тегом:
   Пример:
   В Послании к Ефесянам, глава вторая, стих десятый, апостол Павел пишет: (600ms)

   [торжественно]
   *«Мы — Его творение, созданы во Христе Иисусе на добрые дела, которые Бог предназначил нам исполнять»*. (1s)
3. СПИСКИ И ПУНКТЫ (вопросы, фильтры, практические шаги) выноси на отдельные строки через тире:
   Пример:
   — Первый: что у меня получается без надрыва? (500ms)
   — Второй: кому это реально помогает? (500ms)
4. Прямо в тексте делай разметку TTS. ВАЖНО: Сосредоточься на расставлении интонаций, пауз, знаков препинания и проверке слов на ошибки. Ударения (+) ставить НЕ НУЖНО.
ИСПОЛЬЗУЙ СЛЕДУЮЩИЕ ТЕГИ ВНУТРИ ТЕКСТА ДИКТОРА (в поле text):
- *слово* : Логический акцент (Пример: Это *важно*)
- (1s) или (500ms) : Пауза (Пример: Жди (1s) и дальше)
- [стиль/эмоция] : Стиль / Эмоция в начале предложения (Пример: [интрига], [драматично], [торжественно], [спокойно], [ирония], [тепло])
- (!) : Усиление звука
- ... : Затухание (НЕ ставь одновременно многоточие и паузу подряд)
Не перегружай текст микро-тегами через каждые два слова — задавай настроение на целую мысль.

${prevContext ? `
КОНТЕКСТ ПРЕДЫДУЩИХ БЛОКОВ (для связности):
${prevContext}` : ""}
${toneContext}${wishesContext}${competitorContext}

ВАЖНО: В тексте сценария ОБЯЗАТЕЛЬНО используй букву "ё" там, где это необходимо.
Пиши только текст сценария (реплики диктора), а также предложи звуковые эффекты (SFX), фоновое настроение (mood), короткий чистый музыкальный промпт musicPrompt (для Treblo/Suno/Udio — учти выбранный выше Музыкальный фон, темп и характер Звукового Окружения, например "dramatic cinematic orchestra, 80 bpm, tense strings, deep bass"), массив ссылок для поиска звуков (soundLinks), а также параметры окружения и контекста для Google Studio:
- scene: Опиши визуальное/физическое окружение и общую атмосферу сцены (Sets the stage. Describes both the physical environment and the mood or atmosphere of the scene).
- sampleContext: Задай контекстную отправную точку для естественного входа голоса (Gives the model a contextual starting point, so the voice enters the scene naturally).
ВАЖНО: Для soundLinks старайся возвращать полные URL-адреса на библиотеки звуков (например, YouTube Audio Library, Freesound.org, Epidemic Sound), а не просто названия. Если URL неизвестен, верни точное название для поиска.

Верни JSON объект GeneratedBlock { title: string, text: string, sfx: string, mood: string, musicPrompt: string, soundLinks: string[], wordCount: number, scene: string, sampleContext: string }. Поле wordCount должно содержать точное количество сгенерированных слов в поле text. ЕСЛИ ТЫ НАПИСАЛ МЕНЬШЕ СЛОВ, ЧЕМ ТРЕБУЕТСЯ (${targetWords}), ДОБАВЬ БОЛЬШЕ ТЕКСТА ДО ДОСТИЖЕНИЯ ЛИМИТА!`;
  }

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.7-flash",
    contents: buildContents(prompt, options),
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          text: { type: Type.STRING },
          sfx: { type: Type.STRING },
          mood: { type: Type.STRING },
          musicPrompt: { type: Type.STRING },
          soundLinks: { type: Type.ARRAY, items: { type: Type.STRING } },
          wordCount: { type: Type.INTEGER, description: "ТОЧНОЕ количество слов, которое ты написал в поле text. Пересчитай их перед тем как вернуть ответ!" },
          scene: { type: Type.STRING },
          sampleContext: { type: Type.STRING }
        },
        required: ["title", "text", "sfx", "mood", "soundLinks", "wordCount", "scene", "sampleContext"]
      }
    }
  });

  const parsedBlock = safeParseJSON<GeneratedBlock>(extractTextFromResponse(response), { title: block.title, text: "", sfx: "", mood: "", soundLinks: [], scene: "", sampleContext: "" }, GeneratedScriptBlockSchema as any);

  // If text was generated and is significantly shorter than required target words, expand it
  if (!options?.noVoiceover && parsedBlock.text && parsedBlock.text.trim()) {
    const cleanWords = parsedBlock.text.replace(/\([^)]+\)|\[[^\]]+\]|\*[^*]+\*/g, '').trim().split(/\s+/).filter(Boolean).length;
    const requiredTargetWords = block.estimatedChars ? Math.round(block.estimatedChars / 6.5) : 0;
    
    // If the model produced less than 75% of the target words for this block, make a fast expansion call
    if (requiredTargetWords > 50 && cleanWords < requiredTargetWords * 0.75) {
      try {
        const expandPrompt = `Текст блока "${block.title}" получился слишком коротким (${cleanWords} слов из целевых ${requiredTargetWords} слов).
Расширь и детализируй текст этого блока сценария, сохраняя стилистику и мысль, чтобы в нем было около ${requiredTargetWords} слов.
Текущий текст:
"${parsedBlock.text}"

Верни ТОЛЬКО готовый расширенный текст диктора без кавычек и комментариев.`;

        const expandResponse = await callGeminiWithRetry({
          model: options?.model || "gemini-3.7-flash",
          contents: expandPrompt,
          config: {
            systemInstruction: "Ты профессиональный YouTube-сценарист. Ты мастерски расширяешь текст сценария до требуемого объема слов без потери качества.",
          }
        });

        const expandedText = extractTextFromResponse(expandResponse)?.trim();
        if (expandedText && expandedText.length > parsedBlock.text.length) {
          parsedBlock.text = expandedText;
        }
      } catch (e) {
        logger.warn("Auto-expansion error:", e);
      }
    }
  }

  // Automatically apply breathing formatting: isolate quotes, split long walls of text, clean collision tags
  if (parsedBlock.text && typeof parsedBlock.text === "string") {
    parsedBlock.text = formatBreathingScriptText(parsedBlock.text);
  }

  return parsedBlock;
}


export async function generateScriptContinuations(
  currentText: string,
  prevContext: string,
  topic: string,
  options?: AnalysisOptions
): Promise<string[]> {
  const modelName = options?.model || "gemini-3.7-flash";
  const systemInstruction = "Ты — эксперт по YouTube нарративу и сценариям. На основе контекста предложи 3 коротких, емких и вовлекающих варианта продолжения мысли (по 1-2 предложения или короткой фразе каждый).";
  const prompt = `ТЕМА СЦЕНАРИЯ: "${topic}"
${prevContext ? `ПРЕДЫДУЩИЙ КОНТЕКСТ СЦЕНАРИЯ:
${prevContext}
` : ""}
ТЕКУЩИЙ ТЕКСТ БЛОКА:
"${currentText}"

Предложи 3 варианта логичного, вовлекающего и динамичного продолжения мысли.
Верни результат строго в формате JSON-массива из 3 строк. Каждый вариант от 5 до 20 слов.
Пример формата:
["Но самое интересное раскроется прямо сейчас...", "Именно этот фактор меняет всё представление...", "Давайте проверим это на практическом примере..."]`;

  try {
    const response = await callGeminiWithRetry({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
      },
    });
    const parsed = safeParseJSON<string[]>(extractTextFromResponse(response), []);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, 3).map(s => String(s).trim()).filter(Boolean);
    }
    return [
      "Но самое интересное раскроется прямо сейчас...",
      "Именно этот фактор меняет всё представление...",
      "Давайте проверим это на практическом примере..."
    ];
  } catch (error) {
    logger.error("Failed to generate script continuations:", error);
    return [
      "Но самое интересное раскроется прямо сейчас...",
      "Именно этот фактор меняет всё представление...",
      "Давайте проверим это на практическом примере..."
    ];
  }
}



export async function generateScriptBreakdown(
  scriptText: string,
  niche: string,
  topic: string,
  wishes: string,
  targetDuration: string,
  options?: AnalysisOptions & { customInstructions?: string; branding?: string }
): Promise<SceneBreakdown[]> {
  const lines = scriptText.split('\n');
  const allSentences: string[] = [];
  
  for (const line of lines) {
    if (!line.trim()) continue;
    const cleanLine = line.replace(/\[[^\]]*\]/g, " ").replace(/\((?:\d+\s*(?:сек|с|sec|ms)|пауза|pause)[^)]*\)/gi, " ").replace(/\s+/g, " ").trim();
    if (!cleanLine) continue;
    const words = cleanLine.split(/\s+/).filter(Boolean);
    if (words.length <= 25) {
      allSentences.push(cleanLine);
    } else {
      const parts = cleanLine.split(/([.!?]+['"»”*)]*\s+)/);
      let built = '';
      for (let i = 0; i < parts.length; i++) {
        built += parts[i];
        if (i % 2 === 1) { // this was a delimiter
           if (i + 1 < parts.length && /^[A-ZА-ЯЁ\[(]/.test(parts[i+1].trim())) {
             allSentences.push(built.trim());
             built = '';
           }
        }
      }
      if (built.trim()) allSentences.push(built.trim());
    }
  }

  const textChunks: string[] = [];
  let currentChunk = '';
  
  for (const sentence of allSentences) {
    const currentWords = currentChunk.trim().split(/\s+/).filter(Boolean).length;
    const sentenceWords = sentence.trim().split(/\s+/).filter(Boolean).length;
    
    if (currentWords === 0) {
      currentChunk = sentence;
    } else if (currentWords + sentenceWords <= 25 || (sentenceWords < 5 && currentWords + sentenceWords <= 35)) {
      currentChunk += '\n' + sentence; 
    } else {
      textChunks.push(currentChunk.trim());
      currentChunk = sentence;
    }
  }
  if (currentChunk) textChunks.push(currentChunk.trim());

  // Максимальный жесткий потолок ДО 120 сцен для длинных сценариев
  const MAX_SCRIPT_SCENES = 120;
  while (textChunks.length > MAX_SCRIPT_SCENES) {
    let minWords = Infinity;
    let minIdx = 0;
    for (let i = 0; i < textChunks.length - 1; i++) {
      const combinedWords = (textChunks[i] + ' ' + textChunks[i + 1]).split(/\s+/).filter(Boolean).length;
      if (combinedWords < minWords) {
        minWords = combinedWords;
        minIdx = i;
      }
    }
    textChunks[minIdx] = textChunks[minIdx] + '\n' + textChunks[minIdx + 1];
    textChunks.splice(minIdx + 1, 1);
  }

  const wishesContext = wishes ? `
ПОЖЕЛАНИЯ ПОЛЬЗОВАТЕЛЯ:
${wishes}
` : '';
  const topicContext = topic ? `
ТЕМА ВИДЕО:
${topic}
` : '';
  const customInst = getCustomInstructions(options, true);
  const brandContext = options?.branding ? `
БРЕНДБУК КАНАЛА:
${options.branding}
` : '';
  const instructionsContext = customInst ? `
КАСТОМНЫЕ ИНСТРУКЦИИ:
${customInst}
` : '';
  
  const prompt = `Проанализируй текст сценария, который разбит на ${textChunks.length} сценарных сегментов (каждый строго до 10 секунд хронометража).
Как профессиональный кинорежиссер, создай живой, выразительный и глубоко разнообразный визуальный ряд для каждой сцены, точно передающий смысл слов диктора (чередуй ракурсы, планы, окружение и действия).

${VISUAL_DIVERSITY_RULES}

Для звука (audio) укажи звуки окружения и фоновую музыку, идеально подходящие под настроение сцены.
${wishesContext}
${brandContext}
${instructionsContext}
ВАЖНО: Каждый кадр строго ограничен длительностью до 10 секунд (рекомендуется 3-8 секунд).
ВАЖНО: Указывай тип кадра (shotType): "Крупный план", "Средний план", "Общий план", "Macro", "Drone Shot", "Детальный план", "ECU", "POV", "Low-angle", "Top-down", "Silhouette".
${topicContext}

Текст по сценам:
${textChunks.map((chunk, i) => `Сцена ${i + 1}:
${chunk}`).join('\n\n')}

Верни JSON массив объектов со следующей структурой:
[
  {
    "text": "размеченный текст сцены",
    "description": "описание визуального ряда",
    "shotType": "Средний план",
    "duration": 5,
    "visuals": { "description": "описание визуального ряда", "searchQuery": "запрос для поиска", "shotType": "Средний план", "resourceLinks": [] },
    "audio": { "soundsAndNoises": "звуки", "backgroundMusic": "настроение музыки" },
    "voiceover": { "voiceName": "Aoede", "settings": "Средний темп", "intonation": "Нейтральная", "mood": "Спокойное", "timbre": "Нейтральный" }
  }
]`;

  try {
    const response = await callGeminiWithRetry({
      model: options?.model || "gemini-3.7-flash",
      contents: buildContents(prompt, options),
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY" as any,
          items: {
            type: "OBJECT" as any,
            properties: {
              text: { type: "STRING" as any },
              description: { type: "STRING" as any },
              shotType: { type: "STRING" as any },
              duration: { type: "NUMBER" as any },
              visuals: {
                type: "OBJECT" as any,
                properties: {
                  description: { type: "STRING" as any },
                  searchQuery: { type: "STRING" as any },
                  shotType: { type: "STRING" as any },
                  resourceLinks: { type: "ARRAY" as any, items: { type: "STRING" as any } }
                }
              },
              audio: {
                type: "OBJECT" as any,
                properties: {
                  soundsAndNoises: { type: "STRING" as any },
                  backgroundMusic: { type: "STRING" as any }
                }
              },
              voiceover: {
                type: "OBJECT" as any,
                properties: {
                  voiceName: { type: "STRING" as any },
                  settings: { type: "STRING" as any },
                  intonation: { type: "STRING" as any },
                  mood: { type: "STRING" as any },
                  timbre: { type: "STRING" as any }
                }
              }
            }
          }
        }
      }
    });

    let parsed: any[] = [];
    try {
      const textVal = response.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
      parsed = parseTruncatedJSONArray(textVal);
    } catch (parseErr) {
      logger.warn("parseTruncatedJSONArray failed inside generateScriptBreakdown", parseErr);
      parsed = safeParseJSON(response.candidates?.[0]?.content?.parts?.[0]?.text, []);
    }
    let cumulativeSec = 0;
    return textChunks.map((chunk, index) => {
      const meta = parsed[index] || {};
      const dur = Math.min(10, Math.max(1, Number(meta.duration) || 5));
      const startSec = cumulativeSec;
      const endSec = cumulativeSec + dur;
      cumulativeSec = endSec;
      const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      };
      const cleanChunk = (meta.text || chunk || '').replace(/\[[^\]]*\]/g, '').replace(/\([^)]*\)/g, '').trim();
      const dynamicVis = cleanChunk 
        ? `${meta.shotType || meta.visuals?.shotType || "Средний план"}: Кадр под текст — "${cleanChunk.slice(0, 75)}${cleanChunk.length > 75 ? '...' : ''}"`
        : "Динамичный кадр в стиле темы видео";
      const actualDesc = (meta.description && !/^(визуальный ряд|визуальный ряд кадра|визуализация|не указано)$/i.test(meta.description.trim()))
        ? meta.description.trim()
        : ((meta.visuals?.description && !/^(визуальный ряд|визуальный ряд кадра|визуализация|не указано)$/i.test(meta.visuals.description.trim()))
          ? meta.visuals.description.trim()
          : dynamicVis);

      const sceneText = (meta.text || chunk || '').replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim();

      return {
        text: sceneText || cleanChunk || chunk,
        description: actualDesc,
        shotType: meta.shotType || meta.visuals?.shotType || "Средний план",
        duration: dur,
        timecode: formatTime(startSec),
        timeRange: `${formatTime(startSec)} - ${formatTime(endSec)}`,
        visuals: {
          description: actualDesc,
          searchQuery: meta.visuals?.searchQuery || "cinematic background",
          shotType: meta.shotType || meta.visuals?.shotType || "Средний план",
          resourceLinks: meta.visuals?.resourceLinks || []
        },
        audio: meta.audio || { soundsAndNoises: "Нет", backgroundMusic: "Фоновая музыка" },
        voiceover: meta.voiceover || { voiceName: "Aoede", settings: "Средний темп", intonation: "Нейтральная", mood: "Спокойное", timbre: "Нейтральный" }
      };
    });
  } catch (error) {
    logger.error("Error generating script breakdown", error);
    let cumulativeSec = 0;
    return textChunks.map((chunk) => {
      const dur = 5;
      const startSec = cumulativeSec;
      const endSec = cumulativeSec + dur;
      cumulativeSec = endSec;
      const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      };
      const cleanChunk = (chunk || '').replace(/\[[^\]]*\]/g, '').replace(/\([^)]*\)/g, '').trim();
      const fallbackVis = cleanChunk
        ? `Средний план: Кадр под текст — "${cleanChunk.slice(0, 75)}${cleanChunk.length > 75 ? '...' : ''}"`
        : "Динамичный кадр с выразительной композицией";
      return {
        text: chunk,
        description: fallbackVis,
        shotType: "Средний план",
        duration: dur,
        timecode: formatTime(startSec),
        timeRange: `${formatTime(startSec)} - ${formatTime(endSec)}`,
        visuals: { description: fallbackVis, searchQuery: "background", shotType: "Средний план", resourceLinks: [] },
        audio: { soundsAndNoises: "Нет", backgroundMusic: "Фоновая музыка" },
        voiceover: { voiceName: "Aoede", settings: "Средний темп", intonation: "Нейтральная", mood: "Спокойное", timbre: "Нейтральный" }
      };
    });
  }
}


export async function generateScriptTemplate(
  niche: string,
  channelName?: string,
  keywords?: string,
  competitorAnalysis?: string,
  options?: AnalysisOptions
): Promise<{ phase: string; content: string }[]> {
  const competitorContext = competitorAnalysis ? `
Учитывай анализ конкурентов:
${competitorAnalysis}` : "";
  const nameContext = channelName ? `
Канал: "${channelName}"` : "";
  const kwContext = keywords ? `
Ключевые слова: ${keywords}` : "";
  const toneContext = getToneContext(options);
  const customInst = getCustomInstructions(options, true);

  const prompt = `Сгенерируй шаблон сценария (структуру) для видео в нише "${niche}".${nameContext}${kwContext}${competitorContext}${toneContext}

Верни JSON массив объектов с полями "phase" (заголовок фазы/блока) и "content" (описание содержания блока).`;

  try {
    const response = await callGeminiWithRetry({
      model: options?.model || "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction: validateAndEnrichSystemPrompt("Ты — топовый YouTube-сценарист.", "", customInst, { ...options, isScript: true }),
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              phase: { type: Type.STRING },
              content: { type: Type.STRING }
            },
            required: ["phase", "content"]
          }
        }
      }
    });
    return safeParseJSON<{ phase: string; content: string }[]>(extractTextFromResponse(response), []);
  } catch (e) {
    logger.error("Error generating script template:", e);
    return [];
  }
}


export async function analyzeAndImproveScript(
  script: string,
  style: string,
  tone: string,
  audience: string,
  niche: string,
  options?: AnalysisOptions
): Promise<ScriptImprovement[]> {
  const prompt = `Проанализируй текущий сценарий видео в нише "${niche}".
  Стиль: ${style}, Тон: ${tone}, Целевая аудитория: ${audience}.

  Тебе нужно оценить сценарий не абстрактно, а по сценам и точкам удержания внимания.
  Ищи 3-6 реальных проблем и улучшений, которые повышают retention, fast hook, логическую связку, драматургию и вовлечённость по секундам.

  Критерии анализа:
  1. Есть ли сильный hook в первые 5-8 секунд.
  2. Есть ли перегрузка информацией в середине или слишком длинные объяснения без визуального контраста.
  3. Есть ли место для резкого поворота, вопроса, конфликта, неожиданного факта или контраста между сценами.
  4. Есть ли в финале сильный выход / повторный фокус на пользу для зрителя.
  5. Где можно сделать сцене более активную, динамичную, эмоционально заряженную логику.

  Сценарий:
  ${script}

  Верни JSON массив объектов со строго следующими полями:
  - improvement: краткое название рекомендации
  - reason: почему это важно для удержания аудитории
  - example: как это можно буквально реализовать в сцене/абзаце текста
  - metricEffect: ожидаемый эффект в формате короткой фразы вроде "+4-7% retention в первые 20 сек"

  Твой ответ должен быть только JSON массивом, без комментариев, markdown и текста вокруг.`;

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
            metricEffect: { type: Type.STRING }
          },
          required: ["improvement", "reason", "example", "metricEffect"]
        }
      }
    }
  });

  return safeParseJSON(extractTextFromResponse(response), []);
}


export async function analyzeScriptSentiment(scriptText: string, options?: AnalysisOptions): Promise<SentimentPoint[]> {
  const prompt = `Вы — профессиональный режиссер монтажа и специалист по удержанию аудитории (Audience Retention Specialist) на YouTube.
  Проанализируйте следующий сценарий видео с точки зрения эмоциональной динамики, вовлечения и темпа повествования.
  
  Сценарий:
  """
  ${scriptText}
  """
  
  Разбейте сценарий на логические этапы (от 5 до 10 ключевых точек/моментов по ходу повествования, например: "Хук", "Завязка", "Проблема", "Интрига", "Пик интереса", "Основной аргумент", "Спад напряжения", "Кульминация", "Призыв к действию") и присвойте каждому этапу оценку динамики/эмоционального накала от 0 до 100 (где 100 — пиковое напряжение/высокий темп/интрига, а 0 — полная статика/скука/затишье).
  
  Верните JSON массив объектов SentimentPoint:
  - label: Краткое название этапа (до 3-4 слов)
  - score: Оценка от 10 до 100 (число)
  - description: Краткое объяснение, почему динамика находится на этом уровне (например, "Внимание захвачено провокационным заявлением", "Сложный технический блок, темп замедляется для объяснения деталей", "Эмоциональный призыв к действию с высокой энергетикой")
  
  Убедитесь, что точки расположены в хронологическом порядке повествования. Все тексты пишите на русском языке.`;

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
            label: { type: Type.STRING },
            score: { type: Type.NUMBER },
            description: { type: Type.STRING }
          },
          required: ["label", "score", "description"]
        }
      }
    }
  });

  return safeParseJSON<SentimentPoint[]>(extractTextFromResponse(response), []);
}


export async function generateTimestampsFromStructure(structure: ScriptBlockStructure[], options?: AnalysisOptions): Promise<string> {
  const prompt = `Преобразуй структуру сценария в список таймкодов для описания YouTube видео.
  Используй формат ММ:СС - Название.
  Начни с 00:00.
  
  Структура:
  ${JSON.stringify(structure, null, 2)}
  
  Верни только список таймкодов, каждый с новой строки.`;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.7-flash",
    contents: prompt,
  });

  return extractTextFromResponse(response) || "";
}




export async function applyScriptImprovements(
  script: string,
  improvements: ScriptImprovement[],
  niche: string,
  options?: AnalysisOptions
): Promise<string> {
  const improvementsText = improvements.map(i => `- ${i.improvement}: ${i.reason} (Пример: ${i.example})`).join('\n');
  const prompt = `Улучши следующий сценарий YouTube видео в нише "${niche}", внедрив в него предложенные рекомендации.
  
  Текущий сценарий:
  ${script}
  
  Рекомендации по улучшению:
  ${improvementsText}
  
  Твоя задача — переписать сценарий, сделав его более вовлекающим и качественным, сохранив при этом основной смысл и структуру.
  
  РАЗДЕЛЯЙ ТЕКСТ НА ЛОГИЧЕСКИЕ АБЗАЦЫ для удобства чтения и монтажа. Каждая новая мысль или логический поворот должны быть в новом абзаце.
  
  Верни только обновленный текст сценария без лишних комментариев.`;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.7-flash",
    contents: prompt,
  });

  return extractTextFromResponse(response) || script;
}






export async function applyRetentionImprovementToBlocks(
  blocks: Record<number, GeneratedBlock>,
  improvement: ScriptImprovement,
  topic: string,
  options?: AnalysisOptions
): Promise<Record<number, GeneratedBlock>> {
  const blocksList = Object.entries(blocks)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([key, block]) => ({
      index: Number(key),
      title: block.title || "",
      text: block.text || "",
    }));

  const prompt = `Ты профессиональный YouTube-сценарист. Перед тобой сценарий, разбитый на логические блоки (структуру).
Твоя задача — улучшить этот сценарий, внедрив в него конкретную рекомендацию по удержанию аудитории (Audience Retention).

РЕКОМЕНДАЦИЯ ПО УДЕРЖАНИЮ:
- Улучшение: ${improvement.improvement}
- Почему это важно: ${improvement.reason}
- Пример реализации: ${improvement.example}

ТЕМА ВИДЕО: ${topic}

ТЕКУЩИЕ БЛОКИ СЦЕНАРИЯ:
${JSON.stringify(blocksList, null, 2)}

ИНСТРУКЦИЯ ПО ВНЕДРЕНИЮ:
1. Проанализируй весь сценарий и внедри рекомендацию в НАИБОЛЕЕ подходящие для этого блоки (например, если рекомендация касается хука/начала, измени блок "Вступление/Хук"; если касается переходов или динамики, сделай текст более емким в соответствующих местах; если призыва к действию, улучши концовку). Не нужно пихать рекомендацию в каждый блок, если это разрушит структуру! Внедряй органично.
2. Сохраняй стиль, оригинальный контекст и разметку пауз и стилей (типа *акценты*, (1s), [стиль]), где это возможно, но адаптируй текст под рекомендацию. ВАЖНО: Ударения (знак '+') ставить КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО. Сосредоточься на интонациях и пунктуации.
3. Обязательно используй букву "ё" во всех измененных местах.
4. Верни обновленные блоки в виде строгого JSON-массива объектов с полями:
   - index: число (соответствующее исходному index блока)
   - text: строка (новый, улучшенный текст блока)

ВАЖНО: Верни ТОЛЬКО валидный JSON-массив объектов и ничего больше. Не используй markdown-разметку, кроме как в формате JSON.`;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.7-flash",
    contents: buildContents(prompt, options),
    config: {
      systemInstruction: validateAndEnrichSystemPrompt("Ты — профессиональный YouTube-сценарист. Твоя задача — улучшить сценарий, внедрив рекомендацию по удержанию аудитории (Audience Retention).", "", "", options),
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            index: { type: Type.INTEGER },
            text: { type: Type.STRING },
          },
          required: ["index", "text"]
        }
      }
    }
  });

  const updatedBlocksList = safeParseJSON<{ index: number; text: string }[]>(extractTextFromResponse(response), []);
  
  const updatedBlocks = { ...blocks };
  for (const item of updatedBlocksList) {
    if (updatedBlocks[item.index]) {
      updatedBlocks[item.index] = {
        ...updatedBlocks[item.index],
        text: item.text,
      };
    }
  }

  return updatedBlocks;
}


export async function applyRetentionFixToBlock(
  blockText: string,
  blockTitle: string,
  fixSnippet: string,
  options?: AnalysisOptions
): Promise<string> {
  const prompt = `Ты профессиональный YouTube-сценарист.
Твоя задача — улучшить текст конкретного блока сценария, внедрив в него предложенную правку для устранения просадки удержания аудитории.

НАЗВАНИЕ БЛОКА: ${blockTitle}
ТЕКУЩИЙ ТЕКСТ БЛОКА:
${blockText}

ПРЕДЛОЖЕННАЯ ПРАВКА (ЧТО НУЖНО ДОБАВИТЬ/ИЗМЕНИТЬ):
${fixSnippet}

ИНСТРУКЦИЯ:
1. Органично интегрируй предложенную правку прямо в текст блока. Не просто допиши её в конец, а встрой туда, где она звучит наиболее уместно, чтобы повысить удержание зрителей (например, добавь интригу в начало, риторический вопрос в середину, или сделай плавный переход).
2. Сохраняй общий стиль, оригинальный контекст и разметку (паузы типа (1s), стили типа [шепот]). ВАЖНО: Ударения (знак '+') ставить КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО.
3. Обязательно используй букву "ё" во всех измененных или добавленных местах.
4. Верни ТОЛЬКО обновленный текст этого блока. Не пиши никаких вводных слов, пояснений или markdown-разметки (типа \`\`\`html или \`\`\`text). Только сам текст.`;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.7-flash",
    contents: buildContents(prompt, options),
    config: {
      systemInstruction: validateAndEnrichSystemPrompt("Ты — профессиональный YouTube-сценарист. Твоя задача — улучшить текст конкретного блока сценария, внедрив в него предложенную правку для устранения просадки удержания аудитории.", "", "", options)
    }
  });

  return extractTextFromResponse(response) || blockText;
}


export async function applyMultipleRecommendationsToBlocks(
  blocks: Record<number, GeneratedBlock>,
  recommendations: (ScriptImprovement | string)[],
  topic: string,
  options?: AnalysisOptions
): Promise<Record<number, GeneratedBlock>> {
  const blocksList = Object.entries(blocks)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([key, block]) => ({
      index: Number(key),
      title: block.title || "",
      text: block.text || "",
    }));

  const formattedRecs = recommendations
    .map((r, i) => {
      if (typeof r === "string") {
        return `${i + 1}. ${r}`;
      }
      return `${i + 1}. ${r.improvement} (Обоснование: ${r.reason}; Пример реализации: ${r.example})`;
    })
    .join("\n");

  const prompt = `Ты профессиональный YouTube-сценарист. Перед тобой сценарий, разбитый на логические блоки (структуру).
Твоя задача — переписать и улучшить этот сценарий, органично внедрив в него ВСЕ указанные ниже рекомендации и правки.

СПИСОК РЕКОМЕНДАЦИЙ И ПРАВОК ДЛЯ ВНЕДРЕНИЯ:
${formattedRecs}

ТЕМА ВИДЕО: ${topic}

ТЕКУЩИЕ БЛОКИ СЦЕНАРИЯ:
${JSON.stringify(blocksList, null, 2)}

ИНСТРУКЦИЯ ПО ВНЕДРЕНИЮ:
1. Проанализируй весь сценарий и внедри рекомендации в НАИБОЛЕЕ подходящие для этого блоки.
2. Сохраняй стиль, оригинальный контекст и разметку пауз и стилей (типа *акценты*, (1s), [стиль]), где это возможно, но адаптируй текст под все полученные рекомендации.
3. Обязательно используй букву "ё" во всех измененных местах. Ударные знаки '+' ставить КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО.
4. Верни обновленные блоки в виде строгого JSON-массива объектов с полями:
   - index: число (соответствующее исходному index блока)
   - text: строка (новый, улучшенный текст блока)

Верни ТОЛЬКО валидный JSON-массив объектов и ничего больше.`;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.7-flash",
    contents: buildContents(prompt, options),
    config: {
      systemInstruction: validateAndEnrichSystemPrompt("Ты — профессиональный YouTube-сценарист. Твоя задача — переписать и улучшить сценарий, органично внедрив в него ВСЕ указанные рекомендации и правки.", "", "", options),
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            index: { type: Type.INTEGER },
            text: { type: Type.STRING },
          },
          required: ["index", "text"],
        },
      },
    },
  });

  const updatedBlocksList = safeParseJSON<{ index: number; text: string }[]>(
    extractTextFromResponse(response),
    []
  );

  const updatedBlocks = { ...blocks };
  for (const item of updatedBlocksList) {
    if (updatedBlocks[item.index]) {
      updatedBlocks[item.index] = {
        ...updatedBlocks[item.index],
        text: item.text,
      };
    }
  }

  return updatedBlocks;
}


export async function analyzeInstructionsCompliance(instructions: string, options?: AnalysisOptions): Promise<{ isCompliant: boolean; missingRules: string[] }> {
  const prompt = `
    Проанализируй системные инструкции для YouTube-сценариста на соответствие обязательным требованиям канала «БИБЛИЯ ДЛЯ ЖИЗНИ».
    
    ОБЯЗАТЕЛЬНЫЕ ЭЛЕМЕНТЫ:
    1. Логотип (обязательное упоминание показа логотипа в первых сценах на 5-7 секунд).
    2. Стихи (обязательное появление и озвучивание анимированного текста стиха или главы из Библии).
    3. Призыв к подписке (CTA с фразой "... обязательно *поставь лайк* (!) этому ролику и подпишись на наш канал").
    4. Финальная фраза (завершение фразой "Пусть Господь бережёт тебя и всех твоих близких. До скорой вдохновляющей встречи!").
    
    ИНСТРУКЦИИ ДЛЯ АНАЛИЗА:
    "${instructions}"
    
    Верни результат в формате JSON:
    {
      "isCompliant": boolean,
      "missingRules": string[] (список человекочитаемых описаний того, что именно отсутствует или прописано некорректно)
    }
  `;

  try {
    const response = await callGeminiWithRetry({
      model: options?.model || "gemini-3.7-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCompliant: { type: Type.BOOLEAN },
            missingRules: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["isCompliant", "missingRules"]
        }
      }
    });

    const text = extractTextFromResponse(response);
    return safeParseJSON<{ isCompliant: boolean; missingRules: string[] }>(text, { 
      isCompliant: false, 
      missingRules: ["Ошибка при разборе ответа от ИИ. Попробуйте еще раз."] 
    });
  } catch (error) {
    logger.error("Compliance check failed:", error);
    return { isCompliant: false, missingRules: ["Ошибка при проверке соответствия. Убедитесь, что API ключ указан в настройках и попробуйте позже."] };
  }
}


export async function analyzeScriptRetentionGraph(
  scriptBlocks: Record<number, any>,
  topic: string,
  options?: AnalysisOptions
): Promise<RetentionAnalysisResult> {
  const customInst = getCustomInstructions(options);
  const blockKeys = Object.keys(scriptBlocks).map(Number).sort((a, b) => a - b);

  if (blockKeys.length === 0) {
    return {
      overallScore: 0,
      avgRetentionPercent: 0,
      expectedWatchTimeSeconds: 0,
      summary: "Сценарий пуст. Сгенерируйте блоки текста для анализа удержания.",
      points: [],
      dipsCount: 0
    };
  }

  const scriptFormatted = blockKeys.map(k => {
    const block = scriptBlocks[k];
    const text = block?.text || '';
    const title = block?.title || `Блок ${k + 1}`;
    return `--- БЛОК #${k + 1}: ${title} ---
${text.slice(0, 1000)}`;
  }).join("\n\n");

  const prompt = `Проанализируй следующий сценарий для ролика YouTube по теме "${topic}".
Смоделируй динамику Удержания Зрителей (Audience Retention Curve) вдоль хронометража ролика.

Текст сценария по блокам:
${scriptFormatted}

ЗАДАЧА:
1. Вычисли процент удержания (от 100% в начале до 30-80% в конце) с шагом времени вдоль всех блоков (5-10 точек).
2. Найди все "Проседающие моменты" (dips), где зритель начинает терять интерес (монотонный монолог, длительный текст без интриги, отсутствие SFX или visual shift, отсутствие интерактивных вопросов).
3. Для КАЖДОЙ просадки предложи конкретную правку одной из 4 категорий:
   - "question" (Риторический вопрос)
   - "sfx" (SFX + Визуальный сдвиг)
   - "story" (Микро-история / Кейс)
   - "interactive" (Интерактивный вызов / Опрос)
4. Предоставь готовую текстовую вставку actionableSnippet, которую можно сразу вставить в сценарий!

Верни результат строго в JSON формате:
{
  "overallScore": 84,
  "avgRetentionPercent": 68,
  "expectedWatchTimeSeconds": 280,
  "summary": "Краткое резюме симуляции удержания...",
  "points": [
    {
      "timeSec": 0,
      "timeLabel": "0:00",
      "retentionPercent": 100,
      "blockIndex": 0,
      "blockTitle": "Хук / Вступление",
      "isDip": false
    },
    {
      "timeSec": 45,
      "timeLabel": "0:45",
      "retentionPercent": 72,
      "blockIndex": 1,
      "blockTitle": "Суть проблемы",
      "isDip": true,
      "dipReason": "Длительный монотонный монолог более 40 секунд без смены плана и SFX",
      "dropAmount": 16,
      "proposedFix": {
        "type": "question",
        "typeLabel": "Риторический вопрос",
        "title": "Вставить эмоциональный вопрос-крючок",
        "description": "Задать зрителю прямый вопрос, разорвав монотонное повествование.",
        "actionableSnippet": "

[SFX: Акцентный зум] ❓ Но задумывались ли вы, почему 90% создателей контента совершают именно эту ошибку прямо на старте?"
      }
    }
  ]
}`;

  try {
    const response = await callGeminiWithRetry({
      model: options?.model || "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction: validateAndEnrichSystemPrompt(
          "Ты — высший видеоаналитик YouTube и алгоритмический эксперт по Retention Optimization.",
          "",
          customInst
        ),
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.INTEGER },
            avgRetentionPercent: { type: Type.INTEGER },
            expectedWatchTimeSeconds: { type: Type.INTEGER },
            summary: { type: Type.STRING },
            points: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  timeSec: { type: Type.INTEGER },
                  timeLabel: { type: Type.STRING },
                  retentionPercent: { type: Type.INTEGER },
                  blockIndex: { type: Type.INTEGER },
                  blockTitle: { type: Type.STRING },
                  isDip: { type: Type.BOOLEAN },
                  dipReason: { type: Type.STRING },
                  dropAmount: { type: Type.INTEGER },
                  proposedFix: {
                    type: Type.OBJECT,
                    properties: {
                      type: { type: Type.STRING },
                      typeLabel: { type: Type.STRING },
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      actionableSnippet: { type: Type.STRING }
                    },
                    required: ["type", "typeLabel", "title", "description", "actionableSnippet"]
                  }
                },
                required: ["timeSec", "timeLabel", "retentionPercent", "blockIndex", "blockTitle", "isDip"]
              }
            }
          },
          required: ["overallScore", "avgRetentionPercent", "expectedWatchTimeSeconds", "summary", "points"]
        }
      }
    });

    const textRes = extractTextFromResponse(response);
    const result = safeParseJSON<RetentionAnalysisResult>(textRes, {
      overallScore: 78,
      avgRetentionPercent: 62,
      expectedWatchTimeSeconds: 210,
      summary: "Анализ завершен.",
      points: [],
      dipsCount: 0
    });

    result.dipsCount = (result.points || []).filter(p => p.isDip).length;
    return result;
  } catch (err) {
    logger.error("Error analyzing script retention graph:", err);

    // Dynamic algorithmic fallback computation if API call fails
    let cumulativeSec = 0;
    let currentPercent = 100;
    const points: RetentionPoint[] = [];

    blockKeys.forEach((k, idx) => {
      const block = scriptBlocks[k];
      const text = block?.text || '';
      const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
      const blockDuration = Math.max(15, Math.round((wordCount / 140) * 60));
      const title = block?.title || `Блок ${k + 1}`;

      const isFirst = idx === 0;
      const isMonotonous = wordCount > 100 && !text.includes('?') && !text.includes('!') && !text.includes('[SFX]');
      
      const drop = isFirst ? 8 : (isMonotonous ? 18 : 7);
      currentPercent = Math.max(30, currentPercent - drop);

      const mins = Math.floor(cumulativeSec / 60);
      const secs = cumulativeSec % 60;
      const timeLabel = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

      const point: RetentionPoint = {
        timeSec: cumulativeSec,
        timeLabel,
        retentionPercent: currentPercent,
        blockIndex: k,
        blockTitle: title,
        isDip: isMonotonous,
        dipReason: isMonotonous ? "Монотонный сегмент более 100 слов без визуальных сдвигов и SFX акцентов" : undefined,
        dropAmount: isMonotonous ? drop : undefined,
        proposedFix: isMonotonous ? {
          type: 'question',
          typeLabel: 'Риторический вопрос',
          title: 'Задать интригующий вопрос аудитории',
          description: 'Разорвать монотонное повествование и повысить внимание.',
          actionableSnippet: '\n\n[SFX: Зум-эффект] ❓ А теперь честно спросите себя: работала ли эта схема в вашем случае?'
        } : undefined
      };

      points.push(point);
      cumulativeSec += blockDuration;
    });

    return {
      overallScore: Math.round(currentPercent * 1.1),
      avgRetentionPercent: Math.round((100 + currentPercent) / 2),
      expectedWatchTimeSeconds: cumulativeSec,
      summary: "Алгоритмический прогноз удержания зрителя на основе длины монологов и частоты визуально-аудиальных триггеров.",
      points,
      dipsCount: points.filter(p => p.isDip).length
    };
  }
}






export async function rewriteScriptBlock(
  currentText: string,
  refinementOrMode: string,
  topicOrTitle: string,
  options?: AnalysisOptions
): Promise<string> {
  const customInst = getCustomInstructions(options);
  const toneContext = getToneContext(options);
  const prompt = `Ты - экспертный YouTube сценарист и редактор.
  Твоя задача - переписать/улучшить предоставленный фрагмент сценария (блок).
  
  Тема/Заголовок блока: "${topicOrTitle}"
  Текущий текст блока:
  """
  ${currentText}
  """
  
  Требование/Инструкция по изменению: "${refinementOrMode}"
  ${toneContext}
  ${customInst}
  
  ПРАВИЛА ИЗМЕНЕНИЯ ТЕКСТА:
  1. Измени текст согласно требованию, сохранив общую тему блока.
  2. Разметку TTS (например, "[шепот]", "*акцент*", "(500ms)") ОБЯЗАТЕЛЬНО сохрани или адаптируй под новый текст.
  3. Используй букву "ё" во всех словах, где она пишется (всегда, ещё, всё, своё).
  
  ВЕРНИ ТОЛЬКО ИСПРАВЛЕННЫЙ ТЕКСТ СЦЕНАРИЯ БЕЗ ЛИШНИХ ОБЪЯСНЕНИЙ, СЛУЖЕБНЫХ ТЕГОВ И КОНТЕЙНЕРОВ JSON.`;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.7-flash",
    contents: buildContents(prompt, options),
  });

  return extractTextFromResponse(response)?.trim() || currentText;
}