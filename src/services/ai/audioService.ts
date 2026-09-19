import { logger } from "../../config/logger";
import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import {
  MasterMusicPromptSchema,
  TTSMarkupResultSchema,
} from "../../types/schemas";
import {
  AnalysisOptions,
  ShortsSEO,
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

export async function generateMasterMusicPrompt(
  fullScript: string,
  topic: string,
  options?: AnalysisOptions
): Promise<string> {
  const customInst = getCustomInstructions(options);
  const toneContext = getToneContext(options);
  const sourcesContext = getSourcesContext(options);

  const prompt = `Ты — эксперт-музыкант, композитор и продюсер нейромузыки (Suno AI, Udio), специализирующийся на саунд-дизайне и подборе фоновой музыки для роликов.
Твоя задача: на основе предоставленного сценария, темы видео, тональности и настроения, создать ОДИН идеальный мастер-промпт для генерации фоновой музыки.

СТРОГИЕ ТРЕБОВАНИЯ:
1. ДЛИНА: Промпт должен быть объемом ДО 1000 СИМВОЛОВ (от 200 до 1000 символов). Не превышай 1000 символов ни при каких обстоятельствах!
2. ЯЗЫК: Строго на АНГЛИЙСКОМ языке (так как нейросети Suno и Udio лучше всего понимают английские теги).
3. ФОРМАТ: Плотный набор ключевых слов, жанров, инструментов, темпа (BPM), атмосферы, эмоциональной динамики и качества продакшена через запятую (без лишних вводных слов, приветствий и оформления).
4. СООТВЕТСТВИЕ: Идеально передавай атмосферу и настроение всего видеоролика целиком, учитывай глобальные настройки приложения (инструкции канала, нишу, целевую аудиторию).

${toneContext ? `ТОНАЛЬНОСТЬ / НАСТРОЕНИЕ ВИДЕО:\n${toneContext}\n` : ''}
${sourcesContext ? `КОНТЕКСТ И МАТЕРИАЛЫ:\n${sourcesContext}\n` : ''}

ТЕМА ВИДЕО:
${topic}

СЦЕНАРИЙ И НАСТРОЕНИЕ:
${fullScript}

Верни ТОЛЬКО готовый музыкальный промпт на английском языке (до 1000 символов) без каких-либо вводных фраз или кавычек.`;

  const systemInst = validateAndEnrichSystemPrompt(
    "Ты — экспертный саунд-продюсер и музпромпт-инженер для Suno AI и Udio. Создавай точный, качественный промпт фоновой музыки ролика до 1000 символов, строго соблюдая глобальные настройки приложения, тематику и настроение всего видео.",
    "",
    customInst,
    options
  );

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.1-flash-lite",
    contents: buildContents(prompt, options),
    config: {
      systemInstruction: systemInst,
      temperature: 0.6
    }
  });
  
  const text = extractTextFromResponse(response);
  if (!text) {
    throw new Error("Не удалось сгенерировать мастер-промпт для музыки.");
  }

  let cleaned = text.trim().replace(/^["']|["']$/g, '');
  if (cleaned.length > 1000) {
    cleaned = cleaned.slice(0, 1000).trim();
  }
  return cleaned;
}


export async function generateBlockMusicPrompt(
  blockTitle: string,
  blockText: string,
  topic: string,
  currentMood?: string,
  options?: AnalysisOptions,
  previousPrompt?: string
): Promise<string> {
  const customInst = getCustomInstructions(options);
  const globalMood = options?.globalMusicMood ? `МУЗЫКАЛЬНЫЙ ФОН / НАСТРОЕНИЕ: "${options.globalMusicMood}"` : "";
  const globalAudio = options?.globalAudioPrompt ? `ГЛОБАЛЬНЫЙ ТЕМП И ХАРАКТЕР: "${options.globalAudioPrompt}"` : "";
  const emotionalArc = options?.emotionalArcStage ? `ЭМОЦИОНАЛЬНАЯ СТАДИЯ АРКИ ДРАМАТУРГИИ: "${options.emotionalArcStage}"` : "";

  const prompt = `Составь чистый промпт музыкального стиля (Music Prompt / Mood / Style Tags для Treblo, Suno, Udio) для данного блока видео.

ЦЕЛЬ: Создать музыку, которая гармонично вписывается в общий стиль видео, но отражает эмоциональное состояние и фазу конкретного блока.

ТЕМА ВИДЕО: "${topic}"
НАЗВАНИЕ БЛОКА: "${blockTitle}"
${currentMood ? `ТЕКУЩЕЕ НАСТРОЕНИЕ БЛОКА: "${currentMood}"` : ""}
${emotionalArc ? `ЭМОЦИОНАЛЬНАЯ СТАДИЯ (АРКА ДРАМАТУРГИИ): "${emotionalArc}"` : ""}
${globalMood ? `ВЫБРАННЫЙ ГЛОБАЛЬНЫЙ МУЗЫКАЛЬНЫЙ ФОН: "${globalMood}"` : ""}
${globalAudio ? `ГЛОБАЛЬНЫЙ ТЕМП И ХАРАКТЕР (АУДИО ПРОМПТ): "${globalAudio}"` : ""}
${previousPrompt ? `ПРЕДЫДУЩИЙ МУЗЫКАЛЬНЫЙ ПРОМПТ (для преемственности): "${previousPrompt}"` : ""}
${blockText ? `СОДЕРЖИМОЕ БЛОКА:
"${blockText.slice(0, 1000)}"` : ""}

${customInst ? `КАСТОМНЫЕ ИНСТРУКЦИИ ДЛЯ AI АССИСТЕНТА И ТРЕБОВАНИЯ К МУЗЫКЕ:
${customInst}
` : ""}

КРИТИЧЕСКИЕ ПРАВИЛА:
1. СТРОГО И НЕУКОСНИТЕЛЬНО СЛЕДУЙ КАСТОМНЫМ ИНСТРУКЦИЯМ ДЛЯ AI АССИСТЕНТА (если указаны выше, например: требования к Treblo/Музыка.txt, запреты на рок/барабаны/EDM, выбор инструментов felt piano, warm strings, темп 65-75 BPM, кинематографичный стиль).
2. ОБЯЗАТЕЛЬНО УЧИТЫВАЙ выбранное Звуковое Окружение (Музыкальный фон, темп и характер).
3. ${previousPrompt ? 'СОБЛЮДАЙ ПРЕЕМСТВЕННОСТЬ: музыка должна звучать как продолжение предыдущего блока, сохраняя те же инструменты и темп, если это уместно, но меняя эмоциональный окрас.' : 'Определи базовый музыкальный стиль, который может быть продолжен в следующих блоках.'}
4. НЕ ОПИСЫВАЙ видео, сюжет или названия блоков.
5. Пиши ТОЛЬКО чистые музыкальные стили, жанры, инструментал, темп, BPM и характер звучания для нейросетей генерации музыки (Treblo/Suno/Udio).
6. Пример: "cinematic inspirational documentary, felt piano, warm strings, 70 bpm, D major, peaceful reflective mood, gentle cello, soft ambient pad, no rock drums, no vocals, clear voice background"

Верни JSON объект { "musicPrompt": "чистая строка музыкальных стилей и тегов для Treblo" }.`;

  try {
    const response = await callGeminiWithRetry({
      model: options?.model || "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        systemInstruction: validateAndEnrichSystemPrompt("Ты — экспертный саунд-дизайнер и музыкальный Промпт-Инженер для генераторов нейромузыки (Treblo, Suno, Udio). Твоя задача — создавать точные музыкальные стили и теги с учетом выбранного Звукового Окружения (музыкальный фон, темп, характер).", "", customInst),
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            musicPrompt: { type: Type.STRING }
          },
          required: ["musicPrompt"]
        }
      }
    });

    const parsed = safeParseJSON<{ musicPrompt: string }>(extractTextFromResponse(response), { musicPrompt: "" });
    if (parsed.musicPrompt) return parsed.musicPrompt;

    const envParts = [options?.globalMusicMood, options?.globalAudioPrompt].filter(Boolean).join(", ");
    return envParts ? `${envParts}, 80 bpm, ambient` : (currentMood ? `${currentMood}, cinematic, ambient, 80 bpm` : "cinematic, dramatic, ambient, 80 bpm");
  } catch (err) {
    logger.error("Error generating block music prompt:", err);
    const envParts = [options?.globalMusicMood, options?.globalAudioPrompt].filter(Boolean).join(", ");
    return envParts ? `${envParts}, 80 bpm, ambient` : (currentMood ? `${currentMood}, cinematic, ambient, 80 bpm` : "cinematic, dramatic, ambient, 80 bpm");
  }
}


export async function generateTTSMarkup(text: string, options?: AnalysisOptions): Promise<string> {
  const customInst = getCustomInstructions(options);
  const prompt = `Возьми следующий текст диктора и добавь в него разметку выразительности, пауз и форматирование для естественного дикторского дыхания.
  
ВАЖНО:
1. Ударения (+) ставить КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО.
2. Текст должен «дышать»:
   - Разделяй сплошные простыни текста на короткие ритмичные абзацы по 1-3 предложения (с двойным переносом \\n\\n).
   - Цитаты (стихи, афоризмы, цитаты классиков) ОБЯЗАТЕЛЬНО выноси на отдельную строку с тегом настроения (например, [торжественно] *«Цитата»*).
   - Вопросы и перечисления выноси на отдельные строки с тире (— Первый: ... \\n— Второй: ...).
3. Разметка:
   - *слово* : Логический акцент
   - (1s) или (500ms) : Пауза
   - [стиль/эмоция] : Стиль / Эмоция в начале фразы (например [интрига], [драматично], [торжественно], [спокойно], [тепло])
   - (!) : Усиление звука
   - Не ставь троеточие и паузу одновременно в одном месте (не пиши '... (500ms)').
4. ОБЯЗАТЕЛЬНО используй букву "ё".
5. Исходный текст:
"${text}"

Верни ТОЛЬКО грамотно размеченный и отформатированный текст диктора.`;

  try {
    const response = await callGeminiWithRetry({
      model: options?.model || "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        systemInstruction: validateAndEnrichSystemPrompt("Ты — эксперт по озвучке и дикторской разметке.", "", customInst)
      }
    });
    const raw = extractTextFromResponse(response) || text;
    return raw.replace(/^```[a-z]*\s*\n/i, "").replace(/\n```\s*$/i, "").trim() || text;
  } catch (err) {
    logger.error("Error generating TTS markup:", err);
    return text;
  }
}


export async function annotateTextForVoiceover(text: string, options?: AnalysisOptions): Promise<string> {
  return generateTTSMarkup(text, options);
}


export async function generateDetailedBlockMusicPrompt(
  params: {
    genre?: string;
    tempoBpm?: number | string;
    mood?: string;
    keySignature?: string;
    chordProgression?: string;
    instruments?: string[];
    energyLevel?: string;
    productionTags?: string[];
    blockTitle?: string;
    blockText?: string;
    topic?: string;
  },
  options?: AnalysisOptions
): Promise<string> {
  const customInst = getCustomInstructions(options);
  const instructionsContext = customInst ? `\n\nОБЯЗАТЕЛЬНЫЕ К НЕУКОСНИТЕЛЬНОМУ ИСПОЛНЕНИЮ КАСТОМНЫЕ ИНСТРУКЦИИ:\n${customInst}` : '';

  const prompt = `Ты — эксперт-музыкант, композитор и саунд-продюсер для Suno AI и Udio.
Твоя задача: на основе темы, текста блока и его эмоциональной драматургии составить профессиональный музыкальный промпт для саундтрека.

ПРАВИЛА И ПРИНЦИПЫ:
1. ИНДИВИДУАЛЬНЫЙ ПОДБОР ПОД АРКУ: Стиль, инструменты и драматургия трека подбираются каждый раз заново под конкретное настроение и сюжетную арку сценария (кинематографический оркестр, неоклассика, этника, акустический фолк, эмбиент, минимализм на одном инструменте и т.д. — любой акустический язык, передающий эмоцию).
2. ОБЯЗАТЕЛЬНОЕ ТРЕБОВАНИЕ (для всех треков):
   - Явно укажи ТОНАЛЬНОСТЬ трека (key signature, например: D minor, F# major, A minor).
   - Явно укажи ТЕМП трека в BPM (например: 68 BPM, 76 BPM, 110 BPM).
3. ДРАМАТУРГИЯ И МОНТАЖ: Драматургия музыки должна точно отражать развитие сюжета (нарастание, спад, паузы). Структура трека должна быть пригодна для монтажа: плавно затухающая или удобная для зацикливания, без резких немотивированных скачков громкости.
4. ОБЪЕМ: До 1000 знаков на английском языке.
5. ФОРМАТ: Плотный профессиональный набор тегов стиля, инструментов, акустического пространства, динамики, тональности и BPM через запятую, без лишней разговорной шелухи.

КОНТЕКСТ БЛОКА:
- Тема: "${params.topic || 'Не указана'}"
- Название блока: "${params.blockTitle || 'Не указано'}"
- Текст блока: "${params.blockText ? params.blockText.slice(0, 500) : 'Не указан'}"
- Пожелания (если заданы): Жанр: ${params.genre || 'На усмотрение сюжета'}, BPM: ${params.tempoBpm || 'Определить'}, Настроение: ${params.mood || 'По тексту'}, Тональность: ${params.keySignature || 'Определить'}${instructionsContext}

Верни ТОЛЬКО готовый текст промпта на английском языке (без кавычек и лишних пояснений).`;

  try {
    const systemInst = validateAndEnrichSystemPrompt(
      "Ты — экспертный саунд-продюсер для Suno AI и Udio. Создавай индивидуальные детальные музпромпты до 1000 символов под сюжетную арку видео с обязательным указанием тональности и BPM.",
      "",
      customInst,
      options
    );

    const response = await callGeminiWithRetry({
      model: options?.model || "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        systemInstruction: systemInst,
        responseMimeType: "text/plain"
      }
    });

    const parsed = extractTextFromResponse(response).trim();
    return parsed;
  } catch (error) {
    logger.error("Error generating detailed music prompt", error);
    return "[Instrumental], cinematic orchestral atmosphere, emotional storyline, building intensity, 72 BPM, D minor, studio soundscape";
  }
}


export async function generateShortsMusicPrompt(
  scriptText: string,
  options?: AnalysisOptions & { niche?: any; branding?: any; videoSEO?: any }
): Promise<string> {
  const customInst = getCustomInstructions(options, true);
  const instructionsContext = customInst ? `\n\nОБЯЗАТЕЛЬНЫЕ К НЕУКОСНИТЕЛЬНОМУ ИСПОЛНЕНИЮ КАСТОМНЫЕ ИНСТРУКЦИИ:\n${customInst}\n` : "";

  const nicheContext = options?.niche ? `Ниша: ${options.niche.name}. ЦА: ${options.niche.targetAudience}` : "";
  const brandContext = options?.branding ? `Бренд: ${options.branding.name || options.branding}` : "";
  const seoContext = options?.videoSEO ? `Ключевые слова: ${options.videoSEO.keywords || ""}. Тон и цель: ${options.videoSEO.description || ""}` : "";

  const prompt = `Ты — эксперт-композитор и саунд-продюсер нейромузыки (Suno AI, Udio).
Твоя задача: проанализировать эмоциональную арку и сюжетный темпоритм сценария Shorts и составить идеальный музыкальный мастер-промпт.

ФИЛОСОФИЯ И ТРЕБОВАНИЯ К ПРОМПТУ:
1. ИНДИВИДУАЛЬНАЯ СЮЖЕТНАЯ АРКА: Стиль, инструментал и драматургия трека подбираются заново под конкретное настроение этого сценария (оркестр, неоклассика, этника, акустический фолк, эмбиент или минимализм — любой акустический язык, наилучшим образом передающий эмоцию).
2. ОБЯЗАТЕЛЬНЫЕ ТЕХНИЧЕСКИЕ ПАРАМЕТРЫ (строго для каждого трека):
   - Явно укажи ТОНАЛЬНОСТЬ трека (Key: например D minor, F# major, C minor и т.д.);
   - Явно укажи ТЕМП трека в BPM (Tempo: например 68 BPM, 78 BPM, 120 BPM и т.д.).
3. ДРАМАТУРГИЯ И ПРИГОДНОСТЬ К МОНТАЖУ:
   - Драматургия трека должна отражать эмоциональную арку сценария (например: напряжение / тишина / разрешение).
   - Трек должен быть пригоден для монтажа (плавно затухающий или зацикливаемый, без резких немотивированных скачков громкости).
4. ОБЪЕМ: До 1000 знаков на АНГЛИЙСКОМ языке.
5. ФОРМАТ: Плотный профессиональный набор тегов стилей, инструментов, пространства, динамики, тональности и BPM через запятую.

СЦЕНАРИЙ SHORTS:
"""
${scriptText}
"""

${nicheContext}\n${brandContext}\n${seoContext}
${instructionsContext}

Верни ТОЛЬКО готовый текст музыкального промпта на английском языке (без кавычек, без вводных фраз).`;

  try {
    const systemInst = validateAndEnrichSystemPrompt(
      "Ты — экспертный саунд-продюсер для Suno AI и Udio. Создавай персонализированные музпромпты до 1000 символов под эмоциональную арку сценария с обязательным указанием тональности и темпа в BPM.",
      "",
      customInst,
      options
    );

    const response = await callGeminiWithRetry({
      model: options?.model || "gemini-3.1-flash-lite",
      contents: buildContents(prompt, options),
      customInstructions: customInst,
      options,
      config: {
        systemInstruction: systemInst,
        responseMimeType: "text/plain"
      }
    });

    const res = extractTextFromResponse(response).trim();
    return res || "[Instrumental], cinematic narrative soundtrack, organic acoustic textures, emotional arc, 72 BPM, D minor, studio production";
  } catch (err) {
    logger.error("Error generating shorts music prompt:", err);
    return "[Instrumental], cinematic narrative soundtrack, organic acoustic textures, emotional arc, 72 BPM, D minor, studio production";
  }
}