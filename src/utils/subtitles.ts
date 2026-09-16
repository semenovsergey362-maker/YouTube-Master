import { exportToFile, exportToTxt, exportToSrt } from "./helpers";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import { logger } from "../config/logger";

export interface SubtitleCue {
  id: number;
  startTime: number; // in seconds (e.g. 1.25)
  endTime: number;   // in seconds (e.g. 4.50)
  text: string;
}

/**
 * Strips technical directions, bracketed prompts, SFX, intonations, emotions, pauses,
 * parenthetical cues, speaker labels, and TTS markup from raw script text.
 * Leaves ONLY clean spoken text suitable for subtitles.
 */
export function cleanTextForSubtitles(rawText: string): string {
  if (!rawText) return "";

  let text = rawText;

  // 1. Remove all square bracketed content: [ВИЗУАЛ: ...], [SFX: ...], [МУЗЫКА: ...], [пауза], [смех], [0.5s], etc.
  text = text.replace(/\[[^\]]*\]/g, " ");

  // 2. Remove curly braces and angle brackets: {пауза}, <music>, etc.
  text = text.replace(/\{[^}]*\}/g, " ");
  text = text.replace(/<[^>]*>/g, " ");

  // 3. Remove parenthetical directions, intonations, emotions, pauses, timings, and speech cues:
  // e.g. (интонация: взволнованно), (эмоция: с сарказмом), (пауза 2с), (смеётся), (вздыхает), (шепотом), (500ms), (тихо), (улыбается)
  text = text.replace(
    /\(\s*(?:интонация|эмоция|подача|акцент|настроение|темп|действие|звук|музыка|эффект|ремарка|кадр|сцена|персонаж|диктор|ведущий|голос|автор|спикер|пауза|паузы|смех|смеётся|вздох|вздыхает|шепот|шепотом|тихо|громко|улыбается|хмыкает|кашель|аплодисменты|крик|помехи|загадочно|восторженно|взволнованно|иронично|серьезно|саркастично|вкрадчиво|задумчиво|удивленно|с ухмылкой|\d+(?:\.\d+)?\s*(?:ms|мс|s|сек|с|мин|минут[а-я]*))[^)]*\)/gi,
    " "
  );

  // 4. Remove any explicit parenthetical key-value cues like (интонация: ...), (эмоция: ...), (подача: ...)
  text = text.replace(/\(\s*(?:интонация|эмоция|подача|голос|настроение|акцент|темп|звук|кадр|эффект)\s*:[^)]*\)/gi, " ");

  // 5. Remove speaker labels at line starts: "Диктор:", "Ведущий:", "Голос за кадром:", "Host:", "Speaker:", "Narrator:"
  text = text.replace(/^(?:диктор|ведущий|автор|голос(?:\s+за\s+кадром)?|гость|персонаж|спикер|narrator|host|speaker|voiceover)\s*:\s*/gim, "");

  // 6. Remove markdown headers: # ... or ## ...
  text = text.replace(/^#+\s+[^\n]+/gm, "");

  // 7. Remove block titles: "Блок 1:", "Глава 2:", "Сцена 3:", "Кусок 4:" at line start
  text = text.replace(/^(?:блок|глава|сцена|часть|кусок|кадр|фрагмент)\s*\d+[^:\n]*:\s*/gim, "");

  // 8. Strip markdown bold/italic/code markers while preserving word content
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/\*([^*]+)\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");
  text = text.replace(/_([^_]+)_/g, "$1");
  text = text.replace(/`([^`]+)`/g, "$1");

  // 9. Remove isolated technical dashes or pause symbols at start/end of sentences or standalone
  text = text.replace(/(?:^|\s)(?:--|---|—|–)(?:\s|$)/g, " ");

  // 10. Normalize whitespace and filter out metadata/technical lines
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => {
      if (!l) return false;
      // Skip pure metadata lines like "Длительность: 60 сек" or "Хронометраж: 01:30"
      if (/^(?:хронометраж|длительность|время|музыка|темп|настроение|тема|цель|камера|свет)\s*:/i.test(l)) return false;
      return true;
    });

  // Rejoin and clean up multiple spaces
  let cleaned = lines.join("\n").replace(/[ \t]+/g, " ").trim();

  // Final cleanup of orphan punctuation or empty parentheticals left over
  cleaned = cleaned.replace(/\(\s*\)/g, "").replace(/\[\s*\]/g, "");

  return cleaned;
}

/**
 * Formats seconds into SRT timestamp: HH:MM:SS,mmm
 */
export function formatTimeSrt(seconds: number): string {
  const safeSec = Math.max(0, seconds || 0);
  const hrs = Math.floor(safeSec / 3600);
  const mins = Math.floor((safeSec % 3600) / 60);
  const secs = Math.floor(safeSec % 60);
  const millis = Math.floor((safeSec % 1) * 1000);

  const hh = String(hrs).padStart(2, "0");
  const mm = String(mins).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  const mmm = String(millis).padStart(3, "0");

  return `${hh}:${mm}:${ss},${mmm}`;
}

/**
 * Formats seconds into YouTube SBV (SubViewer) timestamp: H:MM:SS.mmm
 */
export function formatTimeSbv(seconds: number): string {
  const safeSec = Math.max(0, seconds || 0);
  const hrs = Math.floor(safeSec / 3600);
  const mins = Math.floor((safeSec % 3600) / 60);
  const secs = Math.floor(safeSec % 60);
  const millis = Math.floor((safeSec % 1) * 1000);

  const h = String(hrs);
  const mm = String(mins).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  const mmm = String(millis).padStart(3, "0");

  return `${h}:${mm}:${ss}.${mmm}`;
}

/**
 * Formats seconds into friendly MM:SS or HH:MM:SS
 */
export function formatTimeShort(seconds: number): string {
  const safeSec = Math.max(0, Math.round(seconds || 0));
  const hrs = Math.floor(safeSec / 3600);
  const mins = Math.floor((safeSec % 3600) / 60);
  const secs = safeSec % 60;

  const mm = String(mins).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");

  if (hrs > 0) {
    return `${hrs}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/**
 * Parses timestamp string into seconds.
 * Supports:
 * - "00:01:23,450" (SRT)
 * - "0:01:23.450" (SBV)
 * - "01:23.450"
 * - "01:23"
 */
export function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim().replace(",", ".");
  const parts = clean.split(":");

  if (parts.length === 3) {
    const h = parseFloat(parts[0]) || 0;
    const m = parseFloat(parts[1]) || 0;
    const s = parseFloat(parts[2]) || 0;
    return h * 3600 + m * 60 + s;
  } else if (parts.length === 2) {
    const m = parseFloat(parts[0]) || 0;
    const s = parseFloat(parts[1]) || 0;
    return m * 60 + s;
  } else {
    return parseFloat(clean) || 0;
  }
}

export interface SubtitleGeneratorOptions {
  wordsPerMinute?: number; // default ~140 (or 160 for Shorts)
  maxCharsPerCue?: number; // default 42
  maxWordsPerCue?: number; // default 7
  initialOffsetSec?: number; // default 0.2
  minDurationSec?: number; // default 1.2
  maxDurationSec?: number; // default 4.5
}

/**
 * Deterministically cuts a cleaned script into subtitle cues with natural conversational cadence.
 */
export function generateSubtitlesFromText(
  rawText: string,
  options: SubtitleGeneratorOptions = {}
): SubtitleCue[] {
  const cleaned = cleanTextForSubtitles(rawText);
  if (!cleaned) return [];

  const {
    wordsPerMinute = 145,
    maxCharsPerCue = 44,
    maxWordsPerCue = 8,
    initialOffsetSec = 0.2,
    minDurationSec = 1.2,
    maxDurationSec = 4.8,
  } = options;

  // Words per second calculation
  const wordsPerSec = Math.max(1.5, wordsPerMinute / 60);

  // 1. Break into sentences
  const sentenceDelimiters = /([.!?…]+(?:\s+|$))/;
  const rawSentences = cleaned
    .split(sentenceDelimiters)
    .filter(Boolean);

  const sentences: string[] = [];
  for (let i = 0; i < rawSentences.length; i += 2) {
    const textPart = rawSentences[i]?.trim();
    const punctPart = rawSentences[i + 1]?.trim() || "";
    if (textPart) {
      sentences.push(`${textPart}${punctPart}`.trim());
    }
  }

  // Fallback if split didn't catch anything
  if (sentences.length === 0) {
    sentences.push(...cleaned.split("\n").map((s) => s.trim()).filter(Boolean));
  }

  // 2. Chunk sentences into optimal subtitle lengths (clauses / phrases)
  const phrases: string[] = [];

  // Helper to split a sentence into natural clauses while keeping punctuation attached to the preceding word
  const splitSentenceIntoClauses = (sentence: string): string[] => {
    const parts: string[] = [];
    // Match sequences ending in comma, semicolon, colon, or dash followed by space or end of string
    const regex = /[^,;:—–-]+(?:[,;:—–-]+(?:\s+|$)|$)/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(sentence)) !== null) {
      const trimmed = match[0].trim();
      if (trimmed) parts.push(trimmed);
    }
    return parts.length > 0 ? parts : [sentence];
  };

  sentences.forEach((sentence) => {
    // If short enough, keep whole
    if (sentence.length <= maxCharsPerCue && sentence.split(/\s+/).length <= maxWordsPerCue) {
      phrases.push(sentence);
      return;
    }

    const clauses = splitSentenceIntoClauses(sentence);
    let current = "";

    clauses.forEach((cl) => {
      const candidate = current ? `${current} ${cl}` : cl;
      const candWords = candidate.split(/\s+/).length;

      if (candidate.length <= maxCharsPerCue && candWords <= maxWordsPerCue) {
        current = candidate;
      } else {
        if (current) {
          phrases.push(current);
        }
        // If the clause itself is very long, split by words
        if (cl.length > maxCharsPerCue || cl.split(/\s+/).length > maxWordsPerCue) {
          const words = cl.split(/\s+/);
          let wChunk = "";
          words.forEach((w) => {
            const wCand = wChunk ? `${wChunk} ${w}` : w;
            if (wCand.length <= maxCharsPerCue && wCand.split(/\s+/).length <= maxWordsPerCue) {
              wChunk = wCand;
            } else {
              if (wChunk) phrases.push(wChunk);
              wChunk = w;
            }
          });
          if (wChunk) phrases.push(wChunk);
          current = "";
        } else {
          current = cl;
        }
      }
    });

    if (current) {
      phrases.push(current);
    }
  });

  // 3. Compute timeline timestamps
  const cues: SubtitleCue[] = [];
  let currentTime = initialOffsetSec;

  phrases.forEach((phraseText, idx) => {
    const textTrimmed = phraseText.trim();
    if (!textTrimmed) return;

    const wordCount = textTrimmed.split(/\s+/).filter(Boolean).length;
    const charCount = textTrimmed.length;

    // Calculate duration based on words and characters (accounting for punctuation pause)
    let duration = wordCount / wordsPerSec;
    // Add extra time if characters are high (long technical words)
    duration = Math.max(duration, charCount * 0.055);

    // If ends in period or question, add micro pause
    if (/[.?!…]$/.test(textTrimmed)) {
      duration += 0.25;
    }

    // Clamp duration to acceptable bounds
    duration = Math.max(minDurationSec, Math.min(maxDurationSec, duration));

    const startTime = Math.round(currentTime * 1000) / 1000;
    const endTime = Math.round((currentTime + duration) * 1000) / 1000;

    cues.push({
      id: idx + 1,
      startTime,
      endTime,
      text: textTrimmed,
    });

    // Gap between subtitles
    currentTime = endTime + 0.12;
  });

  return cues;
}

/**
 * Converts SubtitleCue[] to standard SubRip (.srt) string.
 */
export function cuesToSrt(cues: SubtitleCue[]): string {
  if (!cues || cues.length === 0) return "";

  return cues
    .map((cue, idx) => {
      const index = idx + 1;
      const start = formatTimeSrt(cue.startTime);
      const end = formatTimeSrt(cue.endTime);
      return `${index}\n${start} --> ${end}\n${cue.text}`;
    })
    .join("\n\n")
    .trim() + "\n";
}

/**
 * Converts SubtitleCue[] to standard YouTube SubViewer (.sbv) string.
 */
export function cuesToSbv(cues: SubtitleCue[]): string {
  if (!cues || cues.length === 0) return "";

  return cues
    .map((cue) => {
      const start = formatTimeSbv(cue.startTime);
      const end = formatTimeSbv(cue.endTime);
      return `${start},${end}\n${cue.text}`;
    })
    .join("\n\n")
    .trim() + "\n";
}

/**
 * Converts SubtitleCue[] to TXT format.
 * - mode 'clean': spoken dialogue transcript without technical timestamps (ready for YouTube transcript sync).
 * - mode 'timed': each line prefixed with MM:SS - MM:SS timestamp.
 */
export function cuesToTxt(cues: SubtitleCue[], mode: "clean" | "timed" = "clean"): string {
  if (!cues || cues.length === 0) return "";

  if (mode === "timed") {
    return cues
      .map((cue) => {
        const start = formatTimeShort(cue.startTime);
        const end = formatTimeShort(cue.endTime);
        return `[${start} - ${end}] ${cue.text}`;
      })
      .join("\n");
  }

  // Clean transcript paragraphs
  const paragraphs: string[] = [];
  let currentPara: string[] = [];

  cues.forEach((cue) => {
    currentPara.push(cue.text);
    if (/[.!?…]$/.test(cue.text) && currentPara.join(" ").length > 180) {
      paragraphs.push(currentPara.join(" "));
      currentPara = [];
    }
  });

  if (currentPara.length > 0) {
    paragraphs.push(currentPara.join(" "));
  }

  return paragraphs.join("\n\n");
}

/**
 * Parses timestamp string into seconds, supporting:
 * - HH:MM:SS,mmm or HH:MM:SS.mmm
 * - MM:SS,mmm or MM:SS.mmm
 * - HH:MM:SS or MM:SS (without milliseconds)
 */
export function parseTimestampToSeconds(str?: string): number {
  if (!str) return 0;
  const clean = str.trim().replace(",", ".");
  const parts = clean.split(":");
  if (parts.length === 3) {
    const hrs = parseFloat(parts[0]) || 0;
    const mins = parseFloat(parts[1]) || 0;
    const secs = parseFloat(parts[2]) || 0;
    return hrs * 3600 + mins * 60 + secs;
  } else if (parts.length === 2) {
    const mins = parseFloat(parts[0]) || 0;
    const secs = parseFloat(parts[1]) || 0;
    return mins * 60 + secs;
  }
  return parseFloat(clean) || 0;
}

/**
 * Universal subtitle parser supporting SRT, WebVTT (.vtt), SBV, and timed TXT.
 * Resilient against missing empty lines, various line break styles, HTML markup,
 * missing milliseconds, cue labels, and metadata.
 */
export function parseSubtitlesAnyFormat(
  rawText: string,
  options: { fallbackToTextGeneration?: boolean; isShorts?: boolean; wordsPerMinute?: number } = {}
): SubtitleCue[] {
  if (!rawText || !rawText.trim()) return [];

  // Normalize text: strip UTF-8 BOM, zero-width spaces, normalize non-breaking spaces and newlines
  const text = rawText
    .replace(/^\uFEFF/, "")
    .replace(/[\u00A0\u200B]/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  const lines = text.split("\n");

  // Regex matching SRT / WebVTT timestamp: 00:00:01,000 --> 00:00:04,000 (with comma or dot, optional hours, optional millis)
  const srtVttLineRegex = /^(?:\[?\s*)((?:\d{1,2}:)?\d{1,2}:\d{2}(?:[,.]\d{1,3})?)\s*(?:-->|->)\s*((?:\d{1,2}:)?\d{1,2}:\d{2}(?:[,.]\d{1,3})?)/;
  // Regex matching YouTube SBV timestamp: 0:00:01.000,0:00:04.000 (optional millis)
  const sbvLineRegex = /^((?:\d{1,2}:)?\d{1,2}:\d{2}(?:[,.]\d{1,3})?)\s*,\s*((?:\d{1,2}:)?\d{1,2}:\d{2}(?:[,.]\d{1,3})?)\s*$/;
  // Regex matching timed text line: [00:01 - 00:04] Text OR 00:00:01 - 00:00:04 Text
  const timedTxtRegex = /^\[?\s*((?:\d{1,2}:)?\d{1,2}:\d{2}(?:[,.]\d{1,3})?)\s*(?:-|–|—|\sto\s)\s*((?:\d{1,2}:)?\d{1,2}:\d{2}(?:[,.]\d{1,3})?)\s*\]?\s*(.*)$/i;
  // Matches cue numbers, dot numbers (e.g. 1.), brackets ([1]), or WebVTT cue identifiers (cue-1)
  const isIndexOrIdentifierRegex = /^(?:\d+[\.:]?|\[\d+\]|cue[-\s]?\d+.*)$/i;

  function cleanCueText(t: string): string {
    return t
      .replace(/<[^>]*>/g, "") // Strip HTML formatting like <b>, <i>, <v Speaker>, <c>
      .replace(/\[(?:ВИЗУАЛ|SFX|МУЗЫКА|кадр|сцена|music|тишина|смех)[^\]]*\]/gi, "")
      .replace(/[ \t]+/g, " ")
      .trim();
  }

  const cues: SubtitleCue[] = [];
  let currentCue: { startTime: number; endTime: number; textLines: string[] } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    if (!line) continue;
    if (/^WEBVTT/i.test(line) || /^NOTE\b/i.test(line) || /^STYLE\b/i.test(line)) continue;

    // 1. Check for timed text pattern on a single line: [00:01 - 00:04] Text
    const timedTxtMatch = line.match(timedTxtRegex);
    if (timedTxtMatch && timedTxtMatch[3] !== undefined) {
      if (currentCue && currentCue.textLines.length > 0) {
        const cleaned = cleanCueText(currentCue.textLines.join(" "));
        if (cleaned) {
          cues.push({
            id: cues.length + 1,
            startTime: currentCue.startTime,
            endTime: Math.max(currentCue.startTime + 0.5, currentCue.endTime),
            text: cleaned,
          });
        }
      }
      const start = parseTimestampToSeconds(timedTxtMatch[1]);
      const end = parseTimestampToSeconds(timedTxtMatch[2]);
      const cueTxt = timedTxtMatch[3].trim();
      currentCue = {
        startTime: start,
        endTime: end,
        textLines: cueTxt ? [cueTxt] : [],
      };
      continue;
    }

    // 2. Check for standard SRT/WebVTT or SBV timestamp line
    const srtMatch = line.match(srtVttLineRegex);
    const sbvMatch = !srtMatch ? line.match(sbvLineRegex) : null;
    const timeMatch = srtMatch || sbvMatch;

    if (timeMatch) {
      if (currentCue && currentCue.textLines.length > 0) {
        const cleaned = cleanCueText(currentCue.textLines.join(" "));
        if (cleaned) {
          cues.push({
            id: cues.length + 1,
            startTime: currentCue.startTime,
            endTime: Math.max(currentCue.startTime + 0.5, currentCue.endTime),
            text: cleaned,
          });
        }
      }

      const start = parseTimestampToSeconds(timeMatch[1]);
      const end = parseTimestampToSeconds(timeMatch[2]);
      currentCue = {
        startTime: start,
        endTime: end,
        textLines: [],
      };
      continue;
    }

    // 3. Lookahead: if this line is an index or identifier and the next line has a timestamp, ignore this line
    const nextLine = (lines[i + 1] || "").trim();
    const isNextTimestamp = srtVttLineRegex.test(nextLine) || sbvLineRegex.test(nextLine);
    if (isIndexOrIdentifierRegex.test(line) && isNextTimestamp) {
      continue;
    }

    // 4. Regular subtitle text line
    if (currentCue) {
      currentCue.textLines.push(line);
    }
  }

  // Push final cue
  if (currentCue && currentCue.textLines.length > 0) {
    const cleaned = cleanCueText(currentCue.textLines.join(" "));
    if (cleaned) {
      cues.push({
        id: cues.length + 1,
        startTime: currentCue.startTime,
        endTime: Math.max(currentCue.startTime + 0.5, currentCue.endTime),
        text: cleaned,
      });
    }
  }

  // If no cues were parsed with timestamps, but fallbackToTextGeneration is enabled and text has substance
  if (cues.length === 0 && options.fallbackToTextGeneration) {
    const cleanText = cleanTextForSubtitles(rawText);
    if (cleanText && cleanText.length > 10) {
      return generateSubtitlesFromText(rawText, {
        wordsPerMinute: options.wordsPerMinute || (options.isShorts ? 165 : 145),
        maxCharsPerCue: options.isShorts ? 36 : 46,
        maxWordsPerCue: options.isShorts ? 6 : 8,
      });
    }
  }

  return cues;
}

/**
 * Smart decoding of text files, supporting UTF-8, UTF-8 BOM, and Windows-1251 (CP-1251).
 */
export function decodeTextBufferSmart(buffer: ArrayBuffer): string {
  try {
    const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
    return utf8Decoder.decode(buffer).replace(/^\uFEFF/, "");
  } catch {
    try {
      const cp1251Decoder = new TextDecoder("windows-1251");
      return cp1251Decoder.decode(buffer).replace(/^\uFEFF/, "");
    } catch {
      const fallbackDecoder = new TextDecoder("utf-8", { fatal: false });
      return fallbackDecoder.decode(buffer).replace(/^\uFEFF/, "");
    }
  }
}

/**
 * Reads a text or subtitle File/Blob using smart encoding detection (UTF-8 / CP-1251).
 */
export async function readTextFileSmart(file: File | Blob): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  return decodeTextBufferSmart(arrayBuffer);
}

/**
 * Extracts clean plain text from a Word .docx document using JSZip.
 */
export async function extractTextFromDocx(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const docXml = await zip.file("word/document.xml")?.async("string");
  if (!docXml) {
    throw new Error("Файл Word поврежден или не содержит текста документа");
  }
  const paragraphs: string[] = [];
  const pRegex = /<w:p(?:\s+[^>]*)?>(.*?)<\/w:p>/gs;
  let pMatch: RegExpExecArray | null;
  while ((pMatch = pRegex.exec(docXml)) !== null) {
    const pContent = pMatch[1];
    const tRegex = /<w:t(?:\s+[^>]*)?>([^<]*)<\/w:t>/g;
    let tMatch: RegExpExecArray | null;
    let pText = "";
    while ((tMatch = tRegex.exec(pContent)) !== null) {
      pText += tMatch[1];
    }
    if (pText.trim()) {
      paragraphs.push(pText.trim());
    }
  }
  return paragraphs.join("\n\n");
}

/**
 * Extracts clean spoken dialogue from subtitle or script text,
 * stripping out technical timestamps, cue numbers, and markup.
 */
export function extractCleanDialogueFromSubtitles(rawText: string): string {
  const cues = parseSubtitlesAnyFormat(rawText);
  if (cues && cues.length > 0) {
    return cuesToTxt(cues, "clean");
  }
  return cleanTextForSubtitles(rawText);
}

/**
 * Parses standard SRT text into SubtitleCue[]
 */
export function parseSrt(srtText: string): SubtitleCue[] {
  return parseSubtitlesAnyFormat(srtText);
}

/**
 * Parses standard SBV text into SubtitleCue[]
 */
export function parseSbv(sbvText: string): SubtitleCue[] {
  return parseSubtitlesAnyFormat(sbvText);
}

/**
 * Export helpers for direct download
 */
export function exportSubtitlesTxt(content: string, filename: string): void {
  exportToTxt(content, filename);
  toast.success(`Субтитры TXT сохранены (${filename}.txt)`);
}

export function exportSubtitlesSrt(content: string, filename: string): void {
  exportToSrt(content, filename);
  toast.success(`Субтитры SRT сохранены (${filename}.srt)`);
}

export function exportSubtitlesSbv(content: string, filename: string): void {
  exportToFile(content, filename, "sbv");
  toast.success(`Субтитры SBV сохранены (${filename}.sbv)`);
}

/**
 * Bundles TXT, SRT, and SBV into a single ZIP archive
 */
export async function exportAllSubtitlesZip(cues: SubtitleCue[], baseFilename: string): Promise<void> {
  const sanitized = baseFilename.replace(/[/\\?%*:|"<>]/g, "_").trim() || "subtitles";
  const srtContent = cuesToSrt(cues);
  const sbvContent = cuesToSbv(cues);
  const txtClean = cuesToTxt(cues, "clean");
  const txtTimed = cuesToTxt(cues, "timed");

  const zip = new JSZip();
  const folder = zip.folder(sanitized) || zip;

  folder.file(`${sanitized}.srt`, srtContent);
  folder.file(`${sanitized}.sbv`, sbvContent);
  folder.file(`${sanitized}_transcript.txt`, txtClean);
  folder.file(`${sanitized}_timed.txt`, txtTimed);

  try {
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, `${sanitized}_subtitles.zip`);
    toast.success("Все форматы субтитров (SRT, SBV, TXT) успешно упакованы в ZIP!");
  } catch (err) {
    logger.error("Failed to export subtitles zip:", err);
    toast.error("Не удалось создать ZIP архив субтитров");
  }
}
