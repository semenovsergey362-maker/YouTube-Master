import {
  callGeminiWithRetry,
  extractTextFromResponse,
} from "./aiConfig";
import { type AnalysisOptions } from "../../types";
import {
  cleanTextForSubtitles,
  generateSubtitlesFromText,
  parseSrt,
  parseSubtitlesAnyFormat,
  formatTimeSrt,
  type SubtitleCue,
} from "../../utils/subtitles";
import {
  type AudioChunk,
  extractAudioFromMediaFile,
  preprocessAudioSamples,
  validateMediaAudioFile,
  assertValidMediaAudioFile,
  type MediaValidationResult,
} from "../../utils/audioExtractor";
import { logger } from "../../config/logger";

export {
  preprocessAudioSamples,
  validateMediaAudioFile,
  assertValidMediaAudioFile,
  type MediaValidationResult,
};

export interface ParseSubsOptions extends TranscribeMediaOptions {
  fallbackToTextGeneration?: boolean;
  speechRateWpm?: number;
}

/**
 * Universal parseSubs / parseSubtitles service function:
 * Preprocesses media/audio (normalization, noise reduction, filtering) and extracts precise subtitles for Shorts and long videos.
 */
export async function parseSubs(
  input: File | Blob | string | AudioChunk[],
  options: ParseSubsOptions = {}
): Promise<SubtitleCue[]> {
  // Case 1: File or Blob (audio/video or subtitle text file)
  if (typeof File !== "undefined" && input instanceof File) {
    const isVideoOrAudio =
      input.type.startsWith("video/") ||
      input.type.startsWith("audio/") ||
      /\.(mp4|mov|webm|mkv|avi|mp3|wav|m4a|ogg|aac|flac)$/i.test(input.name);

    if (isVideoOrAudio) {
      const { chunks } = await extractAudioFromMediaFile(
        input,
        (status) => options.onProgress?.(status, 0, 1),
        options.isShorts ? 60 : 75
      );
      return transcribeMediaAudioWithExactTimestamps(chunks, "audio/wav", options);
    }

    // Text or subtitle file (.srt, .vtt, .txt, .docx)
    const text = await input.text();
    return parseSubtitlesAnyFormat(text, {
      fallbackToTextGeneration: options.fallbackToTextGeneration ?? true,
      isShorts: options.isShorts,
      wordsPerMinute: options.speechRateWpm,
    });
  }

  // Case 2: Array of AudioChunks (already extracted & preprocessed)
  if (Array.isArray(input)) {
    return transcribeMediaAudioWithExactTimestamps(input, "audio/wav", options);
  }

  // Case 3: String input (either base64 audio or text/SRT/VTT)
  if (typeof input === "string") {
    // Check if input is base64 audio
    if (input.startsWith("data:audio/") || (input.length > 500 && /^[A-Za-z0-9+/=]+$/.test(input.slice(0, 200)))) {
      return transcribeMediaAudioWithExactTimestamps(input, "audio/wav", options);
    }

    // Subtitle string
    return parseSubtitlesAnyFormat(input, {
      fallbackToTextGeneration: options.fallbackToTextGeneration ?? true,
      isShorts: options.isShorts,
      wordsPerMinute: options.speechRateWpm,
    });
  }

  return [];
}

/**
 * Alias for parseSubs
 */
export const parseSubtitles = parseSubs;

export interface GenerateSubtitlesAIOptions extends AnalysisOptions {
  model?: string;
  isShorts?: boolean;
  tempo?: "normal" | "fast" | "slow";
  speechRateWpm?: number;
}

/**
 * Generates timed subtitle cues using Gemini AI, with automatic fallback to intelligent local segmentation.
 */
export async function generateSubtitlesWithAI(
  scriptText: string,
  options: GenerateSubtitlesAIOptions = {}
): Promise<SubtitleCue[]> {
  const cleanedText = cleanTextForSubtitles(scriptText);
  if (!cleanedText.trim()) return [];

  const isShorts = !!options.isShorts;
  const wpm = options.speechRateWpm || (isShorts ? 165 : 145);

  const shortsRules = isShorts
    ? `ФОРМАТ: YouTube Shorts / Reels (вертикальное видео).
- Делай фразы короткими и динамичными (2-5 слов в субтитре).
- Длительность субтитра: 1.0 - 2.8 секунды.
- Очень быстрый, энергичный темпоритм речи.`
    : `ФОРМАТ: YouTube Long-Form (горизонтальное видео).
- Делай фразы естественными (4-8 слов в субтитре, законченные смысловые части).
- Длительность субтитра: 1.5 - 4.2 секунды.
- Ровный, естественный дикторский темп речи (~${wpm} слов в минуту).`;

  const prompt = `Ты — профессиональный звукорежиссер и монтажер YouTube, специалист по синхронизации субтитров и транскриптов.
Твоя задача: взять текст сценария и создать идеальный файл субтитров формата SRT (SubRip).

${shortsRules}

ПРАВИЛА ОЧИСТКИ И ОФОРМЛЕНИЯ:
1. Полностью удали любые режиссерские ремарки, скобки [ВИЗУАЛ: ...], [SFX: ...], [пауза], (500ms), TTS метки.
2. В субтитрах должен остаться ТОЛЬКО живой произносимый текст диктора/ведущего!
3. Разбей текст на аккуратные, легко читаемые на экране фрагменты.
4. Временные метки должны быть последовательными и непрерывными: 00:00:00,200 --> 00:00:02,500.
5. Не делай наложений (overlap) по времени. Оставляй микро-паузу (100-200мс) между фразами.

ТЕКСТ СЦЕНАРИЯ:
${cleanedText}

ВЕРНИ ТОЛЬКО ЧИСТЫЙ SRT ФАЙЛ, начиная строго с блока "1", без тегов markdown (\`\`\`srt), без пояснений и комментариев:
1
00:00:00,200 --> 00:00:02,500
[текст]`;

  try {
    const response = await callGeminiWithRetry({
      model: options.model || "gemini-3.1-flash-lite",
      contents: prompt,
    });

    const responseText = extractTextFromResponse(response) || "";
    const cleanedSrt = responseText
      .replace(/^```(?:srt)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const parsedCues = parseSrt(cleanedSrt);

    if (parsedCues && parsedCues.length > 0) {
      // Ensure each cue text is thoroughly cleaned of any remaining bracketed or parenthetical directions
      const sanitizedCues = parsedCues
        .map((cue) => ({
          ...cue,
          text: cleanTextForSubtitles(cue.text),
        }))
        .filter((cue) => cue.text.trim().length > 0);

      if (sanitizedCues.length > 0) {
        return sanitizedCues;
      }
    }

    logger.warn("AI generated SRT was empty or unparseable, falling back to local algorithm");
  } catch (error) {
    logger.warn("Failed to generate AI subtitles with Gemini, falling back to local algorithm:", error);
  }

  // Graceful local fallback
  return generateSubtitlesFromText(cleanedText, {
    wordsPerMinute: wpm,
    maxWordsPerCue: isShorts ? 6 : 8,
    maxCharsPerCue: isShorts ? 36 : 46,
    maxDurationSec: isShorts ? 3.0 : 4.5,
  });
}

export interface TranscribeMediaOptions extends AnalysisOptions {
  model?: string;
  isShorts?: boolean;
  referenceScript?: string;
  onProgress?: (progressMsg: string, currentChunk: number, totalChunks: number) => void;
}

/**
 * Transcribes a single audio chunk and returns parsed cues.
 */
async function transcribeSingleChunk(
  audioBase64: string,
  mimeType: string,
  timeOffsetSec: number,
  chunkDurationSec: number,
  isShorts: boolean,
  model: string,
  referenceScriptText?: string
): Promise<SubtitleCue[]> {
  const audioPart = {
    inlineData: {
      mimeType: mimeType || "audio/wav",
      data: audioBase64,
    },
  };

  // Extract a relevant slice of reference script based on time offset to avoid confusing the model with unrelated parts of the script
  let refSection = "";
  if (referenceScriptText && referenceScriptText.trim()) {
    const cleanedFullScript = cleanTextForSubtitles(referenceScriptText);
    const words = cleanedFullScript.split(/\s+/).filter(Boolean);
    if (words.length > 0) {
      const estimatedStartWord = Math.max(0, Math.floor((timeOffsetSec / 60) * 145) - 20);
      const estimatedWordCount = Math.ceil((chunkDurationSec / 60) * 165) + 40;
      const relevantSlice = words.slice(estimatedStartWord, estimatedStartWord + estimatedWordCount).join(" ");
      if (relevantSlice.trim()) {
        refSection = `\n\nСПРАВОЧНЫЙ ТЕКСТ СЦЕНАРИЯ ДЛЯ ЭТОГО ОТРЕЗКА (используй ТОЛЬКО для правильного написания терминов, имен и редких слов; источником истины ВСЕГДА является АУДИО — если диктор говорит другие слова или текст другой, пиши строго то, что звучит в аудио):\n"""\n${relevantSlice}\n"""`;
      }
    }
  }

  const prompt = `Ты — профессиональный звукорежиссер и монтажер.
Перед тобой аудиофрагмент речи диктора длительностью ~${chunkDurationSec.toFixed(1)} сек (отрезок видео: ${formatTimeSrt(timeOffsetSec)} — ${formatTimeSrt(timeOffsetSec + chunkDurationSec)}).
ТВОЯ ЗАДАЧА: Внимательно прослушать фактическую речь диктора и составить файл субтитров SRT (SubRip) с ТОЧНЕЙШИМИ РЕАЛЬНЫМИ ТАЙМИНГАМИ произнесения фраз.
Временные метки (тайминги) в SRT указывай относительно начала этого аудиофрагмента (от 00:00:00,000 до ${formatTimeSrt(chunkDurationSec)}).

ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА:
1. Записывай ИСКЛЮЧИТЕЛЬНО реально произнесенные слова диктора.
2. Если в начале или конце фрагмента звучит музыка, заставка, пауза или тишина без слов — НЕ создавай субтитр на это время.
3. Если на всем аудиофрагменте нет человеческой речи (тишина, фоновый шум, музыка без слов) — верни пустой ответ без субтитров.
4. НЕ добавляй режиссерских ремарок в скобках вроде [Музыка], [Тишина], [Смех], [Аплодисменты], (пауза) — только чистый текст звучащей речи.
5. ${
    isShorts
      ? "Формат Shorts: короткие динамичные реплики (2-5 слов на строку, длительность 1.0 - 2.5 сек)."
      : "Формат видео: четкие читаемые фразы (4-8 слов на строку, длительность 1.5 - 3.8 сек)."
  }
6. Грамотный русский язык с заглавными буквами и пунктуацией.
7. Между блоками субтитров обязательно ставь пустую строку.
${refSection}

ФОРМАТ ВЫВОДА: СТРОГО чистый SRT (начиная с 1) без markdown оберток или в блоке \`\`\`srt:
1
00:00:01,200 --> 00:00:03,850
Первая фраза

2
00:00:04,100 --> 00:00:06,600
Вторая фраза`;

  const response = await callGeminiWithRetry({
    model: model || "gemini-3.5-flash-lite",
    bypassCustomInstructions: true,
    isTranscription: true,
    config: {
      systemInstruction: `Ты — высокоточная специализированная система распознавания речи и генерации субтитров SRT.
Твоя задача — точно расслышать реальную речь диктора в аудиофайле и сгенерировать чистые субтитры SRT с точными таймингами.
НЕ добавляй никаких вступительных или заключительных слов, пояснений, markdown-комментариев.
НЕ добавляй режиссерских ремарок [Музыка], [Тишина], [Смех], (пауза) — только чистый звучащий текст.
Если на аудио нет человеческой речи (тишина, фоновый шум, музыка без слов) — верни пустой ответ.`,
      temperature: 0.1,
    },
    contents: {
      parts: [audioPart, { text: prompt }],
    },
    bypassCache: true,
  });

  const responseText = extractTextFromResponse(response) || "";
  const cleanedSrt = responseText
    .replace(/^```(?:srt)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const rawCues = parseSubtitlesAnyFormat(cleanedSrt);
  if (!rawCues || rawCues.length === 0) {
    return [];
  }

  // Detect whether model output absolute timestamps (relative to full video) or relative to this chunk
  const isChunkAbsolute =
    timeOffsetSec > 5 &&
    rawCues.every((c) => c.startTime >= timeOffsetSec - 3 && c.startTime <= timeOffsetSec + chunkDurationSec + 10);

  return rawCues
    .map((c) => {
      const actualStart = isChunkAbsolute ? c.startTime : c.startTime + timeOffsetSec;
      const actualEnd = isChunkAbsolute ? c.endTime : c.endTime + timeOffsetSec;

      return {
        ...c,
        startTime: Math.round(actualStart * 100) / 100,
        endTime: Math.round(Math.max(actualStart + 0.5, actualEnd) * 100) / 100,
        text: cleanTextForSubtitles(c.text),
      };
    })
    .filter((c) => c.text.trim().length > 0);
}

/**
 * Transcribes audio chunks or audio string from an uploaded video/audio track using Gemini Multimodal Audio
 * and generates exact real-time SRT subtitle cues based on the actual speech waveform, chunk by chunk.
 */
export async function transcribeMediaAudioWithExactTimestamps(
  audioInput: string | AudioChunk[],
  mimeType: string = "audio/wav",
  options: TranscribeMediaOptions = {}
): Promise<SubtitleCue[]> {
  const isShorts = !!options.isShorts;
  const model = options.model || "gemini-3.5-flash-lite";

  // Normalize chunks input
  let chunks: AudioChunk[] = [];
  if (Array.isArray(audioInput)) {
    chunks = audioInput;
  } else if (typeof audioInput === "string" && audioInput.length > 0) {
    chunks = [
      {
        index: 0,
        totalChunks: 1,
        startSec: 0,
        endSec: 60,
        durationSec: 60,
        base64: audioInput,
        mimeType: mimeType || "audio/wav",
      },
    ];
  }

  if (chunks.length === 0) {
    throw new Error("Аудиоданные отсутствуют для транскрибации");
  }

  const allCues: SubtitleCue[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const progressMsg = `ИИ анализирует речь: фрагмент ${i + 1} из ${chunks.length} (${(
      chunk.startSec / 60
    ).toFixed(1)} - ${(chunk.endSec / 60).toFixed(1)} мин)...`;

    options.onProgress?.(progressMsg, i + 1, chunks.length);

    try {
      const chunkCues = await transcribeSingleChunk(
        chunk.base64,
        chunk.mimeType || mimeType,
        chunk.startSec,
        chunk.durationSec,
        isShorts,
        model,
        options.referenceScript
      );

      allCues.push(...chunkCues);
    } catch (chunkErr) {
      logger.error(`Failed transcribing audio chunk ${i + 1}/${chunks.length}:`, chunkErr);
      // Continue to next chunk if available so partial results are preserved
    }
  }

  if (allCues.length === 0) {
    throw new Error(
      "Нейросеть не обнаружила распознаваемой речи в аудиодорожке или не смогла сформировать субтитры."
    );
  }

  // Sort and re-index cues sequentially, eliminating overlapping intervals
  allCues.sort((a, b) => a.startTime - b.startTime);
  const normalizedCues: SubtitleCue[] = [];

  for (let i = 0; i < allCues.length; i++) {
    const cue = { ...allCues[i] };
    const prevCue = normalizedCues[normalizedCues.length - 1];

    if (prevCue) {
      // Check for duplicate or repeated cues across chunk boundaries
      const cleanPrev = prevCue.text.toLowerCase().replace(/[^a-zа-яё0-9]/gi, "");
      const cleanCur = cue.text.toLowerCase().replace(/[^a-zа-яё0-9]/gi, "");
      const isTimeOverlap = cue.startTime <= prevCue.endTime + 0.5 && cue.startTime >= prevCue.startTime - 0.5;

      if (isTimeOverlap && cleanPrev && cleanCur && (cleanPrev === cleanCur || cleanPrev.endsWith(cleanCur) || cleanCur.startsWith(cleanPrev))) {
        prevCue.endTime = Math.max(prevCue.endTime, cue.endTime);
        continue;
      }

      if (cue.startTime < prevCue.endTime) {
        if (cue.startTime > prevCue.startTime + 0.6) {
          prevCue.endTime = Math.round((cue.startTime - 0.05) * 100) / 100;
        } else {
          cue.startTime = Math.round((prevCue.endTime + 0.05) * 100) / 100;
        }
      }
    }

    cue.endTime = Math.max(cue.startTime + 0.5, cue.endTime);
    cue.id = normalizedCues.length + 1;
    normalizedCues.push(cue);
  }

  return normalizedCues;
}
