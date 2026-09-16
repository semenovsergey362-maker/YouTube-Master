import {
  callGeminiWithRetry,
  extractTextFromResponse,
} from "./aiConfig";
import { type AnalysisOptions } from "../../types";
import { cleanTextForSubtitles, type SubtitleCue } from "../../utils/subtitles";
import { type AudioChunk, extractAudioFromMediaFile } from "../../utils/audioExtractor";
import { transcribeMediaAudioWithExactTimestamps } from "./subtitlesService";
import { logger } from "../../config/logger";

export interface ScriptBlockRef {
  id?: string | number;
  title: string;
  openingText?: string;
  fullText?: string;
}

export interface VideoChapter {
  id: number;
  timeCode: string; // e.g. "00:00" or "01:45"
  seconds: number;
  title: string;
}

export interface GenerateVideoChaptersOptions extends AnalysisOptions {
  model?: string;
  videoTitle?: string;
  niche?: string;
  referenceScript?: string;
  scriptBlocks?: ScriptBlockRef[];
  alignmentMode?: "script_blocks" | "auto_topics";
  onProgress?: (status: string) => void;
  mediaUrl?: string | null;
}

/**
 * Helper to convert seconds into YouTube MM:SS or HH:MM:SS format
 */
export function formatSecondsToTimeCode(seconds: number): string {
  const sec = Math.max(0, Math.floor(seconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Parses a timecode string ("00:00", "01:25", "01:15:30") to seconds.
 */
export function parseTimeCodeToSeconds(timeCode: string): number {
  const parts = timeCode.trim().split(":").map(Number);
  if (parts.length === 2) {
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  }
  if (parts.length === 3) {
    return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  }
  return 0;
}

/**
 * Normalizes text for fuzzy phrase matching
 */
function normalizeForMatching(text: string): string {
  return text
    .toLowerCase()
    .replace(/\[[^\]]+\]/g, "")
    .replace(/\([^)]+\)/g, "")
    .replace(/[^a-zа-яё0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Fallback algorithmic search to find where opening phrases appear in audio cues
 */
function findCueTimeForPhrase(
  phrase: string,
  cues: SubtitleCue[],
  minTimeSec: number = 0
): number | null {
  const cleanPhrase = normalizeForMatching(phrase);
  if (!cleanPhrase) return null;

  const words = cleanPhrase.split(" ").filter((w) => w.length > 2);
  if (words.length === 0) return null;

  // Search window of 3-5 words
  const keyWords = words.slice(0, 5);
  let bestCueTime: number | null = null;
  let bestScore = 0;

  for (const cue of cues) {
    if (cue.startTime < minTimeSec - 5) continue;

    const cueClean = normalizeForMatching(cue.text);
    let score = 0;
    for (const kw of keyWords) {
      if (cueClean.includes(kw)) score++;
    }

    if (score >= Math.min(2, keyWords.length) && score > bestScore) {
      bestScore = score;
      bestCueTime = cue.startTime;
    }
  }

  return bestCueTime;
}

/**
 * Synthesizes exact chapters aligned 1-to-1 with script blocks or intelligently from cues.
 */
export async function generateChaptersFromSubtitleCues(
  cues: SubtitleCue[],
  options: GenerateVideoChaptersOptions = {}
): Promise<VideoChapter[]> {
  if (!cues || cues.length === 0) {
    return [];
  }

  const model = options.model || "gemini-3.1-flash-lite";
  const totalDuration = cues[cues.length - 1].endTime;
  const scriptBlocks = options.scriptBlocks && options.scriptBlocks.length > 0 ? options.scriptBlocks : null;
  const useScriptBlocks = options.alignmentMode !== "auto_topics" && !!scriptBlocks && scriptBlocks.length > 0;

  // Build condensed transcript with timestamp anchors
  const transcriptLines = cues.map(
    (c) => `[${formatSecondsToTimeCode(c.startTime)}] ${c.text}`
  );
  const fullTranscriptWithTime = transcriptLines.join("\n");

  let prompt = "";

  if (useScriptBlocks && scriptBlocks) {
    // Exact alignment mode: match N script blocks to audio transitions
    const blocksDescription = scriptBlocks
      .map((b, idx) => {
        const opening = b.openingText || b.fullText?.slice(0, 140) || "";
        const cleanOpening = cleanTextForSubtitles(opening).slice(0, 100);
        return `БЛОК ${idx + 1}:
- Название главы: "${b.title}"
- Первые произносимые слова: "${cleanOpening}"`;
      })
      .join("\n\n");

    prompt = `Ты — ведущий YouTube-режиссер и монтажер.
Перед тобой:
1) РОВНО ${scriptBlocks.length} БЛОКОВ СЦЕНАРИЯ из проекта:
${blocksDescription}

2) РЕАЛЬНЫЙ СТЕНОГРАФИЧЕСКИЙ ТРАНСКРИПТ СМОНТИРОВАННОГО ВИДЕО С ТОЧНЫМИ ПОСЕКУНДНЫМИ ТАЙМИНГАМИ:
"""
${fullTranscriptWithTime.slice(0, 20000)}
"""

ВАЖНЫЕ ПРАВИЛА СОПОСТАВЛЕНИЯ И ПЕРЕХОДОВ:
1. В видео между смысловыми блоками присутствуют монтажные заставки, паузы и переходы (длительностью ~2-4 секунды).
2. ТВОЯ ЗАДАЧА: Найти точный таймкод (MM:SS) начала КАЖДОГО из ${scriptBlocks.length} блоков сценария — момент, когда диктор начинает говорить вступительные слова соответствующего блока после перебивки/заставки.
3. Первый блок (Блок 1) ОБЯЗАТЕЛЬНО начинается с 00:00 (требование YouTube Chapters).
4. Таймкоды должны строго возрастать по времени.
5. Ты ОБЯЗАН вернуть РОВНО ${scriptBlocks.length} строк таймкодов — по одной строке для каждого из ${scriptBlocks.length} блоков.
6. Названия глав должны В ТОЧНОСТИ соответствовать названиям из сценария.

ФОРМАТ ВЫВОДА (СТРОГО ${scriptBlocks.length} СТРОК, БЕЗ ЛИШНЕГО ТЕКСТА):
00:00 — ${scriptBlocks[0].title}
01:08 — ${scriptBlocks[1]?.title || "Глава 2"}
...`;
  } else {
    // Auto-topics mode
    prompt = `Ты — ведущий YouTube-продюсер и SEO-специалист.
Перед тобой стенографический транскрипт видео с точными таймкодами:
Общая длительность видео: ${formatSecondsToTimeCode(totalDuration)} (${Math.round(totalDuration)} сек).
${options.videoTitle ? `Тема видео: "${options.videoTitle}"` : ""}

ТВОЯ ЗАДАЧА:
Определить смену тем, сюжетных линий и составить список глав (YouTube Chapters) для описания ролика.

ТРЕБОВАНИЯ:
1. Первый таймкод СТРОГО 00:00.
2. Интервал между главами 1-3 минуты.
3. Названия глав емкие и интригующие (3-7 слов).

ТРАНСКРИПТ:
"""
${fullTranscriptWithTime.slice(0, 16000)}
"""

ВЕРНИ СПИСОК ТАЙМКОДОВ:
00:00 — Название главы 1
01:15 — Название главы 2`;
  }

  try {
    const response = await callGeminiWithRetry({
      model,
      contents: prompt,
      bypassCache: true,
    });

    const text = extractTextFromResponse(response) || "";
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => /^\d{1,2}:\d{2}/.test(l));

    const chapters: VideoChapter[] = [];
    let idCounter = 1;

    for (const line of lines) {
      const match = line.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s*[-—–:]\s*(.+)$/);
      if (match) {
        const timeCode = match[1];
        let title = match[2].trim();

        // If using script blocks, try to match to the exact script block title
        if (useScriptBlocks && scriptBlocks && idCounter <= scriptBlocks.length) {
          const targetBlock = scriptBlocks[idCounter - 1];
          if (targetBlock?.title) {
            title = targetBlock.title;
          }
        }

        chapters.push({
          id: idCounter++,
          timeCode,
          seconds: parseTimeCodeToSeconds(timeCode),
          title,
        });
      }
    }

    // If using script blocks and count is less than expected, fill missing via algorithmic search
    if (useScriptBlocks && scriptBlocks && chapters.length < scriptBlocks.length) {
      let lastTime = 0;
      const alignedChapters: VideoChapter[] = [];

      for (let i = 0; i < scriptBlocks.length; i++) {
        const blk = scriptBlocks[i];
        if (i === 0) {
          alignedChapters.push({
            id: 1,
            timeCode: "00:00",
            seconds: 0,
            title: blk.title,
          });
          continue;
        }

        // Try existing parsed chapter for this index
        const existing = chapters[i];
        if (existing && existing.seconds > lastTime) {
          lastTime = existing.seconds;
          alignedChapters.push({
            id: i + 1,
            timeCode: existing.timeCode,
            seconds: existing.seconds,
            title: blk.title,
          });
        } else {
          // Find via acoustic cues search
          const opening = blk.openingText || blk.fullText?.slice(0, 100) || "";
          const foundSec = findCueTimeForPhrase(opening, cues, lastTime + 10);
          const effectiveSec = foundSec !== null && foundSec > lastTime ? foundSec : lastTime + 45;
          lastTime = effectiveSec;
          alignedChapters.push({
            id: i + 1,
            timeCode: formatSecondsToTimeCode(effectiveSec),
            seconds: Math.round(effectiveSec),
            title: blk.title,
          });
        }
      }

      return alignedChapters;
    }

    // Ensure 00:00 exists as first chapter
    if (chapters.length === 0 || chapters[0].seconds !== 0) {
      const firstTitle = useScriptBlocks && scriptBlocks?.[0]?.title ? scriptBlocks[0].title : "Введение";
      if (chapters.length > 0) {
        chapters[0].seconds = 0;
        chapters[0].timeCode = "00:00";
      } else {
        chapters.unshift({
          id: 0,
          timeCode: "00:00",
          seconds: 0,
          title: firstTitle,
        });
      }
    }

    // Re-index
    chapters.forEach((c, idx) => (c.id = idx + 1));
    return chapters;
  } catch (err) {
    logger.error("Failed to generate chapters from subtitle cues:", err);

    // Fallback: algorithmic matching with cues
    if (useScriptBlocks && scriptBlocks) {
      let curSec = 0;
      return scriptBlocks.map((b, idx) => {
        if (idx === 0) {
          return { id: 1, timeCode: "00:00", seconds: 0, title: b.title };
        }
        const opening = b.openingText || b.fullText?.slice(0, 100) || "";
        const found = findCueTimeForPhrase(opening, cues, curSec + 15);
        curSec = found !== null && found > curSec ? found : curSec + 60;
        return {
          id: idx + 1,
          timeCode: formatSecondsToTimeCode(curSec),
          seconds: Math.round(curSec),
          title: b.title,
        };
      });
    }

    throw err;
  }
}

/**
 * Transcribes audio/video media file directly and generates precise YouTube chapters.
 */
export async function generateChaptersFromMediaFile(
  file: File,
  options: GenerateVideoChaptersOptions = {}
): Promise<{ chapters: VideoChapter[]; cues: SubtitleCue[]; durationSec: number }> {
  options.onProgress?.("Извлечение и сжатие звуковой дорожки...");

  // Step 1: Extract lightweight chunks from media with fallback strategies
  const { chunks, durationSec } = await extractAudioFromMediaFile(
    file,
    (msg) => options.onProgress?.(msg),
    60,
    options.mediaUrl
  );

  options.onProgress?.("ИИ анализирует речь диктора, заставки и переходы (+/- 3 сек)...");

  // Step 2: Transcribe speech with exact acoustic timestamps
  const cues = await transcribeMediaAudioWithExactTimestamps(chunks, "audio/wav", {
    model: options.model,
    referenceScript: options.referenceScript,
    onProgress: (msg) => options.onProgress?.(msg),
  });

  options.onProgress?.("Точное сопоставление глав сценария с реальным таймлайном видео...");

  // Step 3: Synthesize chapters
  const chapters = await generateChaptersFromSubtitleCues(cues, {
    model: options.model,
    videoTitle: options.videoTitle,
    niche: options.niche,
    referenceScript: options.referenceScript,
    scriptBlocks: options.scriptBlocks,
    alignmentMode: options.alignmentMode,
  });

  return {
    chapters,
    cues,
    durationSec,
  };
}

/**
 * Estimates natural YouTube chapters based on script blocks word counts and natural speech pace (~130 wpm).
 * Can be used when a media file is not available or if the browser cannot decode the video.
 */
export function generateEstimatedChaptersFromScript(
  scriptBlocks: ScriptBlockRef[],
  options: { totalDurationSec?: number; videoTitle?: string } = {}
): VideoChapter[] {
  if (!scriptBlocks || scriptBlocks.length === 0) return [];

  const blockWords = scriptBlocks.map((b) => {
    const text = (b.openingText || "") + " " + (b.fullText || "") + " " + b.title;
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(15, words);
  });

  const totalWords = blockWords.reduce((sum, w) => sum + w, 0);
  const totalDuration =
    options.totalDurationSec && options.totalDurationSec > 30
      ? options.totalDurationSec
      : Math.max(90, Math.round((totalWords / 130) * 60));

  let currentSec = 0;
  const chapters: VideoChapter[] = [];

  for (let i = 0; i < scriptBlocks.length; i++) {
    const blk = scriptBlocks[i];
    if (i === 0) {
      chapters.push({
        id: 1,
        timeCode: "00:00",
        seconds: 0,
        title: blk.title,
      });
      continue;
    }

    const prevWeight = blockWords[i - 1] / totalWords;
    const blockDuration = Math.max(15, Math.round(prevWeight * totalDuration));
    currentSec += blockDuration;

    chapters.push({
      id: i + 1,
      timeCode: formatSecondsToTimeCode(currentSec),
      seconds: currentSec,
      title: blk.title,
    });
  }

  return chapters;
}

/**
 * Formats a list of chapters into standard YouTube description format text.
 */
export function formatChaptersToText(chapters: VideoChapter[]): string {
  if (!chapters || chapters.length === 0) return "";
  return chapters.map((c) => `${c.timeCode} — ${c.title}`).join("\n");
}
