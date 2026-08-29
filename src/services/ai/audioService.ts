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
    model: options?.model || "gemini-3.7-flash",
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
      model: options?.model || "gemini-3.7-flash",
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
      model: options?.model || "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction: validateAndEnrichSystemPrompt("Ты — эксперт по озвучке и дикторской разметке.", "", customInst)
      }
    });
    return extractTextFromResponse(response) || text;
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
  const instructionsContext = customInst ? `

ОБЯЗАТЕЛЬНЫЕ К НЕУКОСНИТЕЛЬНОМУ ИСПОЛНЕНИЮ КАСТОМНЫЕ ИНСТРУКЦИИ:
${customInst}` : '';

  const prompt = `Ты - эксперт-музыкант, композитор и продюсер, специализирующийся на написании подробных промптов для музыкальных ИИ (Suno / Udio).
Тебе нужно составить очень детальный и профессиональный музыкальный промпт для саундтрека к блоку YouTube видео.

ТЕМА ВИДЕО: "${params.topic || 'Не указана'}"
НАЗВАНИЕ БЛОКА: "${params.blockTitle || 'Не указано'}"
ТЕКСТ БЛОКА: "${params.blockText ? params.blockText.slice(0, 500) : 'Не указан'}"

ПОЖЕЛАНИЯ К МУЗЫКЕ:
- Жанр: ${params.genre || 'Не указан'}
- Темп (BPM): ${params.tempoBpm || 'Не указан'}
- Настроение: ${params.mood || 'Не указано'}
- Тональность: ${params.keySignature || 'Не указана'}
- Аккордовая прогрессия: ${params.chordProgression || 'Не указана'}
- Инструменты: ${params.instruments ? params.instruments.join(', ') : 'Не указаны'}
- Энергетика: ${params.energyLevel || 'Не указана'}
- Production tags: ${params.productionTags ? params.productionTags.join(', ') : 'Не указаны'}${instructionsContext}

ЗАДАЧА:
Сгенерируй только текст музыкального промпта на английском языке, без кавычек и дополнительных пояснений, длиной до 1000 знаков, учитывая то, что в среднем песня длится 3 - 5 минут.
Описывай музыкальное настроение в стиле Ханса Циммера.

СТРОГО ЗАПРЕЩЕНО:
EDM, синтезаторные лиды, трап-биты, дабстеп.
Вокал с текстом, хоры, церковные песнопения/чанты.
Традиционный церковный орган.
Мрачные хоррор-текстуры.
Резкие перепады громкости, пики, громкие духовые всплески.
Никогда не начинать композицию с пианино.`;

  try {
    const systemInst = validateAndEnrichSystemPrompt(
      "Ты — экспертный саунд-продюсер и музпромпт-инженер для Suno AI и Udio. Создавай детальный музпромпт до 1000 символов, строго соблюдая глобальные настройки приложения и кастомные инструкции пользователя.",
      "",
      customInst,
      options
    );

    const response = await callGeminiWithRetry({
      model: options?.model || "gemini-3.7-flash",
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
    return "Epic cinematic orchestral instrumental, slow build up, hans zimmer style";
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

  const prompt = `You are an expert music producer for short-form vertical videos. Based on the following context, produce ONE concise high-quality music prompt in English suitable for Suno/Udio or similar music generators. Include: genre, mood, key instruments, approximate BPM, energy level (low/medium/high), and a short usage note (e.g., "use as background under voiceover, keep mix not too loud"). Keep it to 1-2 sentences.

Context:
"""
${scriptText}
"""

${nicheContext}\n${brandContext}\n${seoContext}
${instructionsContext}

Return only the music prompt string (no JSON, no explanations).`;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.7-flash",
    contents: buildContents(prompt, options),
    config: { responseMimeType: "text/plain" }
  });

  const res = extractTextFromResponse(response);
  return (res || "Energetic cinematic short-form music prompt (for Suno/Udio): upbeat, 100-120 BPM, punchy drums, airy synths, warm bass, suitable to sit under voiceover.").trim();
}