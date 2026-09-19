import { useState, useEffect } from "react";
import { toast } from "sonner";
import { logger } from "../config/logger";
import JSZip from "jszip";
import { getFullScriptText, handleAppError, copyToClipboard } from "../utils/helpers";
import {
  generateSubtitlesFromText,
  cuesToSrt,
  cuesToSbv,
  cuesToTxt,
} from "../utils/subtitles";
import {
  cutLongFormScriptToShorts,
  analyzeShortsTopicRetention,
  optimizeShortsRetentionAndIntegrate,
  generateSeamlessLoopEnding,
  generateShortsMusicPrompt,
  generateDetailedPromptForScene,
  generateShortsSEO,
  generateShortsHashtags,
  analyzeShortsCTR,
  optimizeTitle,
  enforceCustomRulesOnShortsSEO,
  enforceCustomRulesOnShortsItem,
  generateShortsOutlierIdeas,
  generateFullShortsScriptFromOutlierIdea,
  analyzeSEOAndSuggestImprovements,
  smartMergeDescriptionUpdate,
  generateSocialPromoPackage,
  getRotatingShotProfile,
  type ShortsVisualScene,
  type ShortsOutlierAnalysis,
  type ShortsOutlierIdea,
  type ShortsOutlierGenerationResult,
  type CutShortItem,
  type ShortsTopicRetentionAnalysis,
  type ShortsSEO,
  type ShortsHashtagsResult,
  type ShortsCtrAnalysisResult,
  type VideoSEO,
  type SEOAnalysis,
  type SocialPromoPackage,
  type NicheData,
  type GeneratedBlock,
} from "../services/geminiService";

export interface UseShortsGenerationProps {
  videoSEO: VideoSEO | null;
  selectedModel: string;
  isCustomInstructionsEnabled: boolean;
  customInstructions: string;
  nicheData: NicheData | null;
  selectedBranding: any;
  generatedBlocks: Record<number, GeneratedBlock>;
  existingChannelVideos?: Array<{ title: string; views?: string | number }>;
  handleGeminiError?: (error: any, defaultMessage: string) => void;
}

/**
 * Проверяет, является ли строка настоящей ремаркой текста на экране (плашкой/титром),
 * а не артефактом вроде номера сцены, таймкода или чистого числа ("11", "13", "14").
 */
export function isValidScreenText(text?: string | null): boolean {
  if (!text) return false;
  const clean = text.trim().replace(/^["'«»“”„]+|["'«»“”„]+$/g, "").trim();
  if (!clean) return false;
  // Отбрасываем чисто цифровые значения ("11", "13", "14" и т.д.)
  if (/^\d+$/.test(clean)) return false;
  // Отбрасываем таймкоды и счетчики секунд ("0:15", "5s", "5 сек", "11 сек", "14s")
  if (/^\d+(?::\d+)?\s*(?:сек|с|sec|s)?$/i.test(clean)) return false;
  // Отбрасываем номера кадров, сцен, блоков ("Кадр 11", "Сцена 13", "Shot 14", "11.")
  if (/^(?:сцена|кадр|scene|shot|блок|часть|п\.|пункт)\s*\d+[\.\)]?$/i.test(clean)) return false;
  if (/^\d+[\.\)]\s*$/i.test(clean)) return false;
  return true;
}

/**
 * Очищает дикторский текст от технических режиссерских меток кадров/звуков/титров,
 * сохраняя авторский текст, эмоциональные ремарки и паузы без искажений!
 */
export const cleanShortsVoiceoverText = (text: string): string => {
  if (!text) return "";

  let cleaned = text
    // Удаляем директивы и теги с номерами/названиями сцен [СЦЕНА 1], [КАДР 1], [SCENE 1], [SHOT 2]
    .replace(/\[\s*(?:СЦЕНА|SCENE|КАДР|SHOT|БЛОК|ЧАСТЬ)\s*\d*[^\]]*\]/gi, " ")
    // Удаляем директивы визуала, звука и текста на экране
    .replace(/\[\s*(?:КАДР|ВИЗУАЛ|ВИЗУАЛЬНЫЙ\s+РЯД|VISUAL|SHOT|CAMERA|КАМЕРА)[^:\]]*:\s*[^\]]+\]/gi, " ")
    .replace(/\[\s*(?:ЗВУК|AUDIO|SFX|МУЗЫКА|SOUND)[^:\]]*:\s*[^\]]+\]/gi, " ")
    .replace(/\[\s*(?:ТЕКСТ\s+НА\s+ЭКРАНЕ|НАДПИСЬ\s+НА\s+ЭКРАНЕ|ТИТР(?:Ы)?(?:\s+НА\s+ЭКРАНЕ)?|SCREEN\s*TEXT|ON[\s-_]*SCREEN\s*TEXT|OVERLAY\s+TEXT)[^:\]]*:\s*[^\]]+\]/gi, " ")
    // Удаляем строчные технические префиксы
    .replace(/(?:^|\n)\s*(?:\*\*|__)?(?:Визуальный\s+ряд|Визуал|Кадр|Visuals?|Сцена|Scene|Shot)(?:\*\*|__)?\s*:\s*[^\n]+/gi, " ")
    .replace(/(?:^|\n)\s*(?:\*\*|__)?(?:Звуковые?\s+эффекты|Звук|SFX|Audio|Музыка)(?:\*\*|__)?\s*:\s*[^\n]+/gi, " ")
    .replace(/(?:^|\n)\s*(?:\*\*|__)?(?:Текст\s+на\s+экране|Надпись\s+на\s+экране|Титр(?:ы)?(?:\s+на\s+экране)?|Screen\s*text|On[\s-_]*screen\s*text)(?:\*\*|__)?\s*:\s*[^\n]+/gi, " ")
    // Удаляем только ярлыки "Текст: " или "Диктор: ", сохраняя сами слова озвучки
    .replace(/(?:^|\n)\s*(?:\*\*|__)?(?:Текст|Реплика|Диктор)(?:\*\*|__)?\s*:\s*/gi, " ")
    .replace(/^(?:Сцена|Кадр|Scene|Shot|Блок)\s*\d+[^:\n]*:\s*/gim, "")
    .replace(/\[\s*\d+\s*\]/g, "")
    .replace(/^\s*(?:\d+[\.\)]|[-*•])\s+/gm, "")
    .replace(/\(\s*\d+(?::\d+)?\s*(?:-\s*\d+(?::\d+)?)?\s*(?:сек|с|sec|s)?\s*\)/gi, " ")
    .replace(/[ \t]+/g, " ")
    .trim();

  return cleaned || text.trim();
};

export interface StructuredScriptScene {
  text: string;
  frameVisual?: string;
  frameAudio?: string;
  screenText?: string;
}

export function extractSceneMetadata(block: string): {
  frameVisual?: string;
  frameAudio?: string;
  screenText?: string;
} {
  let frameVisual = "";
  let frameAudio = "";
  let screenText = "";

  const visualMatch =
    block.match(/\[\s*(?:КАДР|ВИЗУАЛ|ВИЗУАЛЬНЫЙ\s+РЯД|VISUAL|SHOT|CAMERA|КАМЕРА)[^:\]]*:\s*([^\]]+)\]/i) ||
    block.match(/(?:^|\n)\s*(?:\*\*|__)?(?:Визуальный\s+ряд|Визуал|Кадр|Visuals?|Сцена|Scene|Shot)(?:\*\*|__)?\s*:\s*([^\n]+)/i);
  if (visualMatch) frameVisual = visualMatch[1].trim();

  const audioMatch =
    block.match(/\[\s*(?:ЗВУК|AUDIO|SFX|МУЗЫКА|SOUND)[^:\]]*:\s*([^\]]+)\]/i) ||
    block.match(/(?:^|\n)\s*(?:\*\*|__)?(?:Звуковые?\s+эффекты|Звук|SFX|Audio|Музыка)(?:\*\*|__)?\s*:\s*([^\n]+)/i);
  if (audioMatch) frameAudio = audioMatch[1].trim();

  // Извлекаем ТОЛЬКО явные ремарки текста на экране (никогда не путать с обычным текстом сценария/озвучки)
  const textMatch =
    block.match(/\[\s*(?:ТЕКСТ\s+НА\s+ЭКРАНЕ|НАДПИСЬ\s+НА\s+ЭКРАНЕ|ТИТР(?:Ы)?(?:\s+НА\s+ЭКРАНЕ)?|SCREEN\s*TEXT|ON[\s-_]*SCREEN\s*TEXT|OVERLAY\s+TEXT)[^:\]]*:\s*([^\]]+)\]/i) ||
    block.match(/(?:^|\n)\s*(?:\*\*|__)?(?:Текст\s+на\s+экране|Надпись\s+на\s+экране|Титр(?:ы)?(?:\s+на\s+экране)?|Screen\s*text|On[\s-_]*screen\s*text)(?:\*\*|__)?\s*:\s*([^\n]+)/i);
  if (textMatch) {
    const candidate = textMatch[1].trim().replace(/^["'«»“”„]+|["'«»“”„]+$/g, "").trim();
    if (isValidScreenText(candidate)) {
      screenText = candidate;
    }
  }

  return {
    frameVisual: frameVisual || undefined,
    frameAudio: frameAudio || undefined,
    screenText: screenText || undefined,
  };
}

/**
 * Подсчитывает реальное количество произносимых диктором слов (отсекая теги пауз вроде (500ms),
 * эмоциональные ремарки в скобках, кавычки и знаки препинания).
 */
export function countSpokenWords(text: string): number {
  if (!text) return 0;
  const pureSpoken = text
    .replace(/\(\s*\d+(?:\.\d+)?\s*(?:ms|s|сек|с|sec)?\s*\)/gi, " ")
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/[«»""''„“”.,!?:;—–\-\(\)\/\\]/g, " ")
    .trim();
  return pureSpoken.split(/\s+/).filter(Boolean).length;
}

/**
 * Склеивает висячие теги пауз (например, (500ms) или (1s)) с предшествующей фразой/предложением,
 * чтобы они никогда не отрывались в отдельную пустую строку или фиктивную сцену.
 */
export function cleanAndGluePauses(sentences: string[]): string[] {
  const result: string[] = [];
  const pauseRegex = /^\s*(\(\s*\d+(?:\.\d+)?\s*(?:ms|s|сек|с|sec)?\s*\))\s*(.*)$/i;

  for (let s of sentences) {
    s = s.trim();
    if (!s) continue;

    const m = s.match(pauseRegex);
    if (m) {
      const pauseTag = m[1];
      const remainder = m[2];
      if (result.length > 0) {
        result[result.length - 1] = (result[result.length - 1] + " " + pauseTag).trim().replace(/[ \t]+/g, " ");
      } else {
        result.push(pauseTag);
      }
      if (remainder && remainder.trim()) {
        result.push(remainder.trim());
      }
    } else {
      result.push(s);
    }
  }
  return result;
}

/**
 * Аккуратно делит чрезмерно длинное предложение (> 20 слов) по смысловым союзам и знакам,
 * гарантируя, что каждая часть имеет достаточный объем слов (не менее minWords).
 */
export function splitLongSentence(sentence: string, minWords = 8): string[] {
  const splitPoints = [
    /(?<=[,;:])\s+(?=(?:а|но|и|да|или|что|чтобы|когда|если|хотя|потому|ведь|так как)\b)/i,
    /(?<=[;:])\s+/,
    /(?<=—|–)\s+/,
    /(?<=,)\s+/,
  ];

  for (const regex of splitPoints) {
    const chunks = sentence.split(regex).map((c) => c.trim()).filter(Boolean);
    if (chunks.length > 1) {
      let firstHalf = "";
      let secondHalf = "";
      const totalWords = countSpokenWords(sentence);
      let running = 0;

      for (let i = 0; i < chunks.length; i++) {
        const cWords = countSpokenWords(chunks[i]);
        if (!firstHalf || running + cWords <= totalWords / 2 || running < minWords) {
          firstHalf = firstHalf ? `${firstHalf} ${chunks[i]}` : chunks[i];
          running += cWords;
        } else {
          secondHalf = secondHalf ? `${secondHalf} ${chunks[i]}` : chunks[i];
        }
      }

      if (countSpokenWords(firstHalf) >= minWords && countSpokenWords(secondHalf) >= minWords) {
        return [firstHalf.trim(), secondHalf.trim()];
      }
    }
  }

  return [sentence];
}

/**
 * Гарантирует, что ни одна сцена не является микро-обрезком (< 6 слов)
 * или пустой сценой без озвучки (например, одиночной паузой (500ms) или точкой).
 * Автоматически объединяет мелкие обрезки с соседними сценами для плавной драматургии.
 */
export function mergeMicroScenes(scenes: StructuredScriptScene[], minWords = 4): StructuredScriptScene[] {
  const list = scenes.filter((s) => Boolean(s.text?.trim() || s.frameVisual?.trim()));
  if (list.length <= 1) return list;

  const result: StructuredScriptScene[] = [];

  for (let i = 0; i < list.length; i++) {
    const sc = { ...list[i] };
    const words = countSpokenWords(sc.text);

    // Если в сцене вообще нет слов (только визуальная ремарка или пустая пауза)
    if (words === 0) {
      if (result.length > 0) {
        const prev = result[result.length - 1];
        if (sc.text?.trim()) {
          prev.text = (prev.text + " " + sc.text).trim().replace(/[ \t]+/g, " ");
        }
        if (!prev.frameVisual && sc.frameVisual) prev.frameVisual = sc.frameVisual;
        if (!prev.screenText && sc.screenText) prev.screenText = sc.screenText;
        if (!prev.frameAudio && sc.frameAudio) prev.frameAudio = sc.frameAudio;
      } else if (i + 1 < list.length) {
        const next = list[i + 1];
        if (sc.text?.trim()) {
          next.text = (sc.text + " " + next.text).trim().replace(/[ \t]+/g, " ");
        }
        if (!next.frameVisual && sc.frameVisual) next.frameVisual = sc.frameVisual;
        if (!next.screenText && sc.screenText) next.screenText = sc.screenText;
        if (!next.frameAudio && sc.frameAudio) next.frameAudio = sc.frameAudio;
      } else {
        result.push(sc);
      }
      continue;
    }

    // Если слов меньше порогового значения и нет явного авторского описания визуала
    if (words < minWords && !sc.frameVisual) {
      if (result.length > 0) {
        const prev = result[result.length - 1];
        prev.text = (prev.text + " " + sc.text).trim().replace(/[ \t]+/g, " ");
        if (!prev.frameVisual && sc.frameVisual) prev.frameVisual = sc.frameVisual;
        if (!prev.screenText && sc.screenText) prev.screenText = sc.screenText;
        if (!prev.frameAudio && sc.frameAudio) prev.frameAudio = sc.frameAudio;
        continue;
      }
      if (i + 1 < list.length) {
        const next = list[i + 1];
        next.text = (sc.text + " " + next.text).trim().replace(/[ \t]+/g, " ");
        if (!next.frameVisual && sc.frameVisual) next.frameVisual = sc.frameVisual;
        if (!next.screenText && sc.screenText) next.screenText = sc.screenText;
        if (!next.frameAudio && sc.frameAudio) next.frameAudio = sc.frameAudio;
        continue;
      }
    }

    result.push(sc);
  }

  if (result.length > 1) {
    const lastIdx = result.length - 1;
    const last = result[lastIdx];
    const lastWords = countSpokenWords(last.text);
    if (lastWords < minWords && !last.frameVisual) {
      const popped = result.pop()!;
      const prev = result[result.length - 1];
      prev.text = (prev.text + " " + popped.text).trim().replace(/[ \t]+/g, " ");
      if (!prev.screenText && popped.screenText) prev.screenText = popped.screenText;
      if (!prev.frameVisual && popped.frameVisual) prev.frameVisual = popped.frameVisual;
      if (!prev.frameAudio && popped.frameAudio) prev.frameAudio = popped.frameAudio;
    }
  }

  return result;
}

/**
 * Объединяет микро-сцены и пустые паузы в массиве сгенерированных визуальных карточек ShortsVisualScene.
 */
export function mergeMicroVisualScenes(scenes: ShortsVisualScene[]): ShortsVisualScene[] {
  if (!scenes || scenes.length <= 1) return scenes || [];

  const result: ShortsVisualScene[] = [];
  const MIN_WORDS = 6;

  for (let i = 0; i < scenes.length; i++) {
    const sc = { ...scenes[i] };
    const textVal = sc.text || sc.voiceoverText || "";
    const words = countSpokenWords(textVal);

    if (words === 0) {
      if (result.length > 0) {
        const prev = result[result.length - 1];
        const extra = textVal.trim();
        if (extra) {
          prev.text = ((prev.text || "") + " " + extra).trim().replace(/[ \t]+/g, " ");
          if (prev.voiceoverText) prev.voiceoverText = prev.text;
        }
        if (!prev.screenText && sc.screenText) prev.screenText = sc.screenText;
        if (!prev.frameVisual && sc.frameVisual) prev.frameVisual = sc.frameVisual;
        if (!prev.frameAudio && sc.frameAudio) prev.frameAudio = sc.frameAudio;
      } else if (i + 1 < scenes.length) {
        const next = scenes[i + 1];
        const extra = textVal.trim();
        if (extra) {
          next.text = (extra + " " + (next.text || "")).trim().replace(/[ \t]+/g, " ");
          if (next.voiceoverText) next.voiceoverText = next.text;
        }
        if (!next.screenText && sc.screenText) next.screenText = sc.screenText;
        if (!next.frameVisual && sc.frameVisual) next.frameVisual = sc.frameVisual;
        if (!next.frameAudio && sc.frameAudio) next.frameAudio = sc.frameAudio;
      } else {
        result.push(sc);
      }
      continue;
    }

    if (words < MIN_WORDS) {
      if (result.length > 0) {
        const prev = result[result.length - 1];
        const extra = textVal.trim();
        prev.text = ((prev.text || "") + " " + extra).trim().replace(/[ \t]+/g, " ");
        if (prev.voiceoverText) prev.voiceoverText = prev.text;
        if (!prev.screenText && sc.screenText) prev.screenText = sc.screenText;
        if (!prev.frameVisual && sc.frameVisual) prev.frameVisual = sc.frameVisual;
        if (!prev.frameAudio && sc.frameAudio) prev.frameAudio = sc.frameAudio;
        continue;
      }
      if (i + 1 < scenes.length) {
        const next = scenes[i + 1];
        const extra = textVal.trim();
        next.text = (extra + " " + (next.text || "")).trim().replace(/[ \t]+/g, " ");
        if (next.voiceoverText) next.voiceoverText = next.text;
        if (!next.screenText && sc.screenText) next.screenText = sc.screenText;
        if (!next.frameVisual && sc.frameVisual) next.frameVisual = sc.frameVisual;
        if (!next.frameAudio && sc.frameAudio) next.frameAudio = sc.frameAudio;
        continue;
      }
    }

    result.push(sc);
  }

  if (result.length > 1) {
    const last = result[result.length - 1];
    const lastWords = countSpokenWords(last.text || last.voiceoverText || "");
    if (lastWords < MIN_WORDS) {
      const popped = result.pop()!;
      const prev = result[result.length - 1];
      const extra = (popped.text || popped.voiceoverText || "").trim();
      prev.text = ((prev.text || "") + " " + extra).trim().replace(/[ \t]+/g, " ");
      if (prev.voiceoverText) prev.voiceoverText = prev.text;
      if (!prev.screenText && popped.screenText) prev.screenText = popped.screenText;
    }
  }

  return result;
}

/**
 * Разбивает сплошной текст сценария на органичные сцены по ~5 секунд (~8–16 слов).
 * Не режет фразы по запятым, не создает 1-2 словных ошметков и сохраняет целостность мысли.
 */
export function segmentShortsScriptIntoScenes(scriptText: string): string[] {
  const cleaned = cleanShortsVoiceoverText(scriptText);
  const textToSplit = cleaned.trim() || scriptText.trim();
  if (!textToSplit) return [];

  const rawLines = textToSplit
    .split(/(?<=[.!?…]["«»“”„\)]*)(?:\s+|\n+)|(?:\n\s*\n+)/)
    .map((s) => s.trim())
    .filter(Boolean);

  const rawSentences = cleanAndGluePauses(rawLines);
  if (rawSentences.length === 0) return [textToSplit];

  const scenes: string[] = [];
  let currentAccum = "";

  const TARGET_MIN = 8;
  const TARGET_MAX = 16;
  const HARD_MAX = 22;

  for (const sentence of rawSentences) {
    const sWords = countSpokenWords(sentence);

    if (sWords === 0) {
      if (currentAccum) {
        currentAccum += " " + sentence;
      } else if (scenes.length > 0) {
        scenes[scenes.length - 1] += " " + sentence;
      } else {
        currentAccum = sentence;
      }
      continue;
    }

    if (!currentAccum) {
      if (sWords > HARD_MAX) {
        const parts = splitLongSentence(sentence, TARGET_MIN);
        if (parts.length > 1) {
          for (let pIdx = 0; pIdx < parts.length - 1; pIdx++) {
            scenes.push(parts[pIdx]);
          }
          currentAccum = parts[parts.length - 1];
        } else {
          currentAccum = sentence;
        }
      } else {
        currentAccum = sentence;
      }
      continue;
    }

    const accumWords = countSpokenWords(currentAccum);
    const candidate = `${currentAccum} ${sentence}`;
    const candidateWords = countSpokenWords(candidate);

    if (candidateWords <= TARGET_MAX) {
      currentAccum = candidate;
    } else if (accumWords < TARGET_MIN && candidateWords <= HARD_MAX) {
      currentAccum = candidate;
    } else {
      scenes.push(currentAccum.trim());

      if (sWords > HARD_MAX) {
        const parts = splitLongSentence(sentence, TARGET_MIN);
        if (parts.length > 1) {
          for (let pIdx = 0; pIdx < parts.length - 1; pIdx++) {
            scenes.push(parts[pIdx]);
          }
          currentAccum = parts[parts.length - 1];
        } else {
          currentAccum = sentence;
        }
      } else {
        currentAccum = sentence;
      }
    }
  }

  if (currentAccum.trim()) {
    scenes.push(currentAccum.trim());
  }

  if (scenes.length > 1) {
    const last = scenes[scenes.length - 1];
    if (countSpokenWords(last) < 6) {
      const popped = scenes.pop()!;
      scenes[scenes.length - 1] = (scenes[scenes.length - 1] + " " + popped).trim().replace(/[ \t]+/g, " ");
    }
  }

  return scenes.length > 0 ? scenes : [textToSplit];
}

/**
 * Парсер сценариев: определяет авторские маркеры сцен или делит сплошной текст на кинематографичные сцены.
 * Гарантирует отсутствие огрызков ("как они. (500ms)", "нежели тот».", "(500ms)").
 */
export function parseScriptIntoExplicitScenes(scriptText: string): StructuredScriptScene[] {
  if (!scriptText || !scriptText.trim()) return [];

  const rawScript = scriptText.trim();

  // 1. Попытка деления по авторским маркерам сцен (СЦЕНА 1, КАДР 1, [СЦЕНА 1], [КАДР: ...], нумерация 1., буллеты -)
  const explicitMarkerRegex = /(?:^|\n+)(?=\[\s*(?:СЦЕНА|SCENE|КАДР|SHOT|БЛОК|ЧАСТЬ)\s*\d+[^\]]*\]|\[\s*(?:КАДР|СЦЕНА|SCENE|SHOT|ВИЗУАЛ|VISUAL)\s*:[^\]]+\]|(?:Сцена|Scene|Кадр|Shot|Блок|Часть)\s+\d+[:.\s\-]|\[\s*\d+\s*\]|(?:\d+[\.\)]|[-*•])\s+[A-ZА-ЯЁ«"\[])/i;

  let rawBlocks: string[] = [];
  if (explicitMarkerRegex.test(rawScript)) {
    rawBlocks = rawScript.split(explicitMarkerRegex).map((b) => b.trim()).filter(Boolean);
  }

  // Если явных маркеров нет, пробуем делить по двойным переводам строк (абзацам)
  if (rawBlocks.length <= 1) {
    const paragraphBlocks = rawScript.split(/\r?\n\s*\r?\n+/).map((b) => b.trim()).filter(Boolean);
    if (paragraphBlocks.length > 1) {
      rawBlocks = paragraphBlocks;
    }
  }

  // Если все еще 1 блок, проверяем построчный сценарий (каждая строка отдельная сцена)
  if (rawBlocks.length <= 1) {
    const lineBlocks = rawScript.split(/\r?\n+/).map((b) => b.trim()).filter(Boolean);
    if (lineBlocks.length > 1 && lineBlocks.every((l) => countSpokenWords(l) >= 2 || extractSceneMetadata(l).frameVisual)) {
      rawBlocks = lineBlocks;
    }
  }

  // Если нашлось несколько явных авторских блоков
  if (rawBlocks.length > 1) {
    const resultScenes: StructuredScriptScene[] = [];

    for (const block of rawBlocks) {
      const meta = extractSceneMetadata(block);
      const voiceoverText = cleanShortsVoiceoverText(block);
      const wordsCount = countSpokenWords(voiceoverText);

      // Если в блоке нет слов диктора (например, только пауза (500ms) или техническая ремарка)
      if (wordsCount === 0) {
        if (resultScenes.length > 0) {
          const prev = resultScenes[resultScenes.length - 1];
          if (voiceoverText) prev.text = (prev.text + " " + voiceoverText).trim().replace(/[ \t]+/g, " ");
          if (meta.frameVisual && !prev.frameVisual) prev.frameVisual = meta.frameVisual;
          if (meta.screenText && !prev.screenText) prev.screenText = meta.screenText;
          if (meta.frameAudio && !prev.frameAudio) prev.frameAudio = meta.frameAudio;
        } else {
          resultScenes.push({
            text: voiceoverText || meta.frameVisual || "",
            frameVisual: meta.frameVisual,
            frameAudio: meta.frameAudio,
            screenText: isValidScreenText(meta.screenText) ? meta.screenText : undefined,
          });
        }
        continue;
      }

      // Авторский блок делим ТОЛЬКО если он действительно огромный (> 22 слов = ~10+ секунд)
      if (wordsCount > 22) {
        const subChunks = segmentShortsScriptIntoScenes(voiceoverText);
        subChunks.forEach((sub, subIdx) => {
          resultScenes.push({
            text: sub,
            frameVisual: subIdx === 0 ? meta.frameVisual : undefined,
            frameAudio: subIdx === 0 ? meta.frameAudio : undefined,
            screenText: subIdx === 0 && isValidScreenText(meta.screenText) ? meta.screenText : undefined,
          });
        });
      } else {
        resultScenes.push({
          text: voiceoverText || meta.frameVisual || "",
          frameVisual: meta.frameVisual,
          frameAudio: meta.frameAudio,
          screenText: isValidScreenText(meta.screenText) ? meta.screenText : undefined,
        });
      }
    }

    return mergeMicroScenes(resultScenes, 2);
  }

  // 2. Сплошной текст без явных переносов строк и маркеров
  const singleMeta = extractSceneMetadata(rawScript);
  const singleClean = cleanShortsVoiceoverText(rawScript);

  // Делим сплошной текст на кинематографичные сцены по ~5 секунд (8–16 слов)
  const chunks = segmentShortsScriptIntoScenes(singleClean);
  if (chunks.length > 1) {
    const rawList = chunks.map((chunk, idx) => ({
      text: chunk,
      frameVisual: idx === 0 ? singleMeta.frameVisual : undefined,
      frameAudio: idx === 0 ? singleMeta.frameAudio : undefined,
      screenText: idx === 0 && isValidScreenText(singleMeta.screenText) ? singleMeta.screenText : undefined,
    }));
    return mergeMicroScenes(rawList, 4);
  }

  return [
    {
      text: singleClean || rawScript,
      frameVisual: singleMeta.frameVisual,
      frameAudio: singleMeta.frameAudio,
      screenText: isValidScreenText(singleMeta.screenText) ? singleMeta.screenText : undefined,
    },
  ];
}

export function useShortsGeneration(props: UseShortsGenerationProps) {
  const {
    videoSEO,
    selectedModel,
    isCustomInstructionsEnabled,
    customInstructions,
    nicheData,
    selectedBranding,
    generatedBlocks,
    existingChannelVideos = [],
    handleGeminiError,
  } = props;

  // Shorts Tab states
  const [shortsActiveSubTab, setShortsActiveSubTab] = useState<"outliers" | "cut" | "loop" | "visuals" | "seo">("outliers");
  
  // Outlier Analyst & 10 Ideas Generator states
  const [outlierAnalysis, setOutlierAnalysis] = useState<ShortsOutlierAnalysis | null>(null);
  const [outlierIdeas, setOutlierIdeas] = useState<ShortsOutlierIdea[]>([]);
  const [isAnalyzingOutliers, setIsAnalyzingOutliers] = useState(false);
  const [isGeneratingIdeaScript, setIsGeneratingIdeaScript] = useState<Record<string, boolean>>({});
  const [customCompetitorInput, setCustomCompetitorInput] = useState("");
  const [customOutlierPrompt, setCustomOutlierPrompt] = useState("");

  const [longFormScriptToCut, setLongFormScriptToCut] = useState("");
  const [cutShortsResults, setCutShortsResults] = useState<CutShortItem[]>([]);
  const [isCuttingLongForm, setIsCuttingLongForm] = useState(false);
  const [selectedShortForVisuals, setSelectedShortForVisuals] = useState<string>("");
  const [shortsVisuals, setShortsVisuals] = useState<ShortsVisualScene[]>([]);
  const [shortsMusicPrompt, setShortsMusicPrompt] = useState<string>("");
  const [isGeneratingShortsVisuals, setIsGeneratingShortsVisuals] = useState(false);
  const [isRegeneratingShortsMusicPrompt, setIsRegeneratingShortsMusicPrompt] = useState(false);
  const [selectedShortForSeo, setSelectedShortForSeo] = useState<string>("");
  const [shortsSeoResult, setShortsSeoResult] = useState<ShortsSEO | null>(null);
  const [isGeneratingShortsSeo, setIsGeneratingShortsSeo] = useState(false);
  const [generatingLoopForCard, setGeneratingLoopForCard] = useState<Record<number, boolean>>({});
  const [shortsSeoError, setShortsSeoError] = useState<string | null>(null);
  const [loopErrorForCard, setLoopErrorForCard] = useState<Record<number, string | null>>({});

  // Shorts CTR & clickability analysis states
  const [shortsCtrTitle, setShortsCtrTitle] = useState("");
  const [shortsCtrDescription, setShortsCtrDescription] = useState("");
  const [shortsCtrResult, setShortsCtrResult] = useState<ShortsCtrAnalysisResult | null>(null);
  const [isAnalyzingShortsCtr, setIsAnalyzingShortsCtr] = useState(false);
  const [shortsCtrError, setShortsCtrError] = useState<string | null>(null);

  // Shorts Hashtag Generator states
  const [isGeneratingShortsHashtags, setIsGeneratingShortsHashtags] = useState(false);
  const [shortsHashtagsResult, setShortsHashtagsResult] = useState<ShortsHashtagsResult | null>(null);
  const [shortsHashtagsCopied, setShortsHashtagsCopied] = useState(false);

  // Shorts Topic Retention Analysis & Optimization states
  const [analyzingShortRetentionForCard, setAnalyzingShortRetentionForCard] = useState<Record<number, boolean>>({});
  const [optimizingShortRetentionForCard, setOptimizingShortRetentionForCard] = useState<Record<number, boolean>>({});
  const [hiddenRetentionCards, setHiddenRetentionCards] = useState<Record<number, boolean>>({});
  const [longFormRetentionAnalysis, setLongFormRetentionAnalysis] = useState<ShortsTopicRetentionAnalysis | null>(null);
  const [isAnalyzingLongFormRetention, setIsAnalyzingLongFormRetention] = useState(false);

  // Shorts Deep SEO Audit & Rules Check states
  const [shortsSeoAnalysis, setShortsSeoAnalysis] = useState<SEOAnalysis | null>(null);
  const [isAnalyzingShortsSeoAudit, setIsAnalyzingShortsSeoAudit] = useState(false);

  // Persistence for Shorts Tab
  const [isShortsRestored, setIsShortsRestored] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("shortsTabState");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.shortsActiveSubTab) setShortsActiveSubTab(parsed.shortsActiveSubTab);
        if (parsed.outlierAnalysis) setOutlierAnalysis(parsed.outlierAnalysis);
        if (parsed.outlierIdeas) setOutlierIdeas(parsed.outlierIdeas);
        if (parsed.customCompetitorInput) setCustomCompetitorInput(parsed.customCompetitorInput);
        if (parsed.customOutlierPrompt) setCustomOutlierPrompt(parsed.customOutlierPrompt);
        if (parsed.longFormScriptToCut) setLongFormScriptToCut(parsed.longFormScriptToCut);
        if (parsed.cutShortsResults) setCutShortsResults(parsed.cutShortsResults);
        if (parsed.selectedShortForVisuals) setSelectedShortForVisuals(parsed.selectedShortForVisuals);
        if (parsed.shortsVisuals && Array.isArray(parsed.shortsVisuals)) {
          const sanitized = parsed.shortsVisuals.map((sc: any) => ({
            ...sc,
            screenText: isValidScreenText(sc.screenText) ? sc.screenText : undefined,
          }));
          setShortsVisuals(mergeMicroVisualScenes(sanitized));
        }
        if (parsed.shortsMusicPrompt) setShortsMusicPrompt(parsed.shortsMusicPrompt);
        if (parsed.selectedShortForSeo) setSelectedShortForSeo(parsed.selectedShortForSeo);
        if (parsed.shortsSeoResult) setShortsSeoResult(parsed.shortsSeoResult);
        if (parsed.shortsSeoAnalysis) setShortsSeoAnalysis(parsed.shortsSeoAnalysis);
      }
    } catch (e) {
      logger.error("Error restoring Shorts state:", e);
    }
    setIsShortsRestored(true);
  }, []);

  useEffect(() => {
    if (!isShortsRestored) return;
    try {
      const stateToSave = {
        shortsActiveSubTab,
        outlierAnalysis,
        outlierIdeas,
        customCompetitorInput,
        customOutlierPrompt,
        longFormScriptToCut,
        cutShortsResults,
        selectedShortForVisuals,
        shortsVisuals,
        shortsMusicPrompt,
        selectedShortForSeo,
        shortsSeoResult,
        shortsSeoAnalysis,
      };
      localStorage.setItem("shortsTabState", JSON.stringify(stateToSave));
    } catch (e) {
      logger.error("Error saving Shorts state:", e);
    }
  }, [
    isShortsRestored,
    shortsActiveSubTab,
    outlierAnalysis,
    outlierIdeas,
    customCompetitorInput,
    customOutlierPrompt,
    longFormScriptToCut,
    cutShortsResults,
    selectedShortForVisuals,
    shortsVisuals,
    shortsMusicPrompt,
    selectedShortForSeo,
    shortsSeoResult,
    shortsSeoAnalysis,
  ]);

  useEffect(() => {
    if (!cutShortsResults.length) {
      if (selectedShortForSeo) {
        setSelectedShortForSeo("");
      }
      return;
    }

    const isSelectedStillValid = cutShortsResults.some(
      (item) =>
        item.loopEnding?.loopedFullScript === selectedShortForSeo ||
        item.script === selectedShortForSeo
    );

    if (!isSelectedStillValid) {
      const fallback = cutShortsResults[0]?.loopEnding?.loopedFullScript || cutShortsResults[0]?.script || "";
      if (fallback) {
        setSelectedShortForSeo(fallback);
      }
    }
  }, [cutShortsResults, selectedShortForSeo]);

  useEffect(() => {
    if (!longFormScriptToCut && generatedBlocks && Object.keys(generatedBlocks).length > 0) {
      const text = getFullScriptText(generatedBlocks);
      if (text && text.trim()) {
        setLongFormScriptToCut(text.trim());
      }
    }
  }, [generatedBlocks, longFormScriptToCut]);

  const onError = (error: any, defaultMessage: string) => {
    if (handleGeminiError) {
      handleGeminiError(error, defaultMessage);
    } else {
      handleAppError(error, defaultMessage);
    }
  };

  /**
   * Run Outlier Analysis and generate 10 Shorts Ideas based on competitors & user channel
   */
  const handleAnalyzeCompetitorOutliers = async (customCompetitorChannelsText?: string) => {
    const activeNiche = nicheData?.niche || "YouTube Shorts";
    setIsAnalyzingOutliers(true);

    try {
      // Gather competitors
      const compChannels = [...(nicheData?.competitors || [])];
      
      // If user typed custom channel URLs or titles
      const rawCustom = customCompetitorChannelsText || customCompetitorInput;
      if (rawCustom && rawCustom.trim()) {
        const lines = rawCustom.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
        lines.forEach(l => {
          if (!compChannels.some(c => c.name.toLowerCase() === l.toLowerCase())) {
            compChannels.push({
              name: l,
              subs: "50K+",
              desc: `Канал конкурента: ${l}`,
              weakness: "",
              strategy: "Вирусные Shorts",
              engagement: 4.8,
              topVideos: []
            });
          }
        });
      }

      // Format user's existing channel videos to prevent duplicates
      const myVideosFormatted = (existingChannelVideos || []).map((v: any) => ({
        title: typeof v === "string" ? v : (v.title || ""),
        views: v.views || v.viewCount || ""
      })).filter(v => v.title.trim().length > 0);

      const result = await generateShortsOutlierIdeas(
        {
          niche: activeNiche,
          competitorChannels: compChannels,
          myChannelVideos: myVideosFormatted,
          savedFramework: outlierAnalysis?.framework || "",
          customPromptAddition: customOutlierPrompt,
        },
        { model: selectedModel }
      );

      setOutlierAnalysis(result.analysis);
      setOutlierIdeas(result.ideas);
      toast.success(`Анализ аутлаеров завершён! Сгенерировано ${result.ideas.length} уникальных идей для Shorts.`);
    } catch (error) {
      onError(error, "Ошибка при анализе аутлаеров и генерации идей");
    } finally {
      setIsAnalyzingOutliers(false);
    }
  };

  /**
   * Generate complete ready-to-use script, visual prompts & SEO from a selected Outlier Idea in 1 click
   */
  const handleGenerateScriptFromOutlierIdea = async (idea: ShortsOutlierIdea) => {
    const activeNiche = nicheData?.niche || "YouTube Shorts";
    setIsGeneratingIdeaScript(prev => ({ ...prev, [idea.id]: true }));

    try {
      // Находим следующее видео из списка вкладки Идеи
      const currIdx = outlierIdeas.findIndex(item => item.id === idea.id);
      let nextIdeaTitle = "";
      if (outlierIdeas.length > 1) {
        const nextIdx = (currIdx >= 0 && currIdx < outlierIdeas.length - 1) ? currIdx + 1 : 0;
        nextIdeaTitle = outlierIdeas[nextIdx]?.title || "";
      } else if (outlierIdeas.length === 1 && outlierIdeas[0].id !== idea.id) {
        nextIdeaTitle = outlierIdeas[0]?.title || "";
      }

      const generated = await generateFullShortsScriptFromOutlierIdea(
        idea,
        activeNiche,
        {
          model: selectedModel,
          nextIdeaTitle,
          outlierIdeas
        }
      );

      // Create a CutShortItem so it plugs seamlessly into the whole Shorts engine
      const newItem: CutShortItem = {
        title: generated.title,
        hook: idea.hook,
        script: generated.script,
        viral_potential: "9.5/10 (Вирусный аутлаер)",
        duration: idea.estimatedDuration || "45 сек",
        seo: generated.seo,
      };

      // Add to cutShortsResults and select it
      setCutShortsResults(prev => [newItem, ...prev]);
      setSelectedShortForVisuals(generated.script);
      setSelectedShortForSeo(generated.script);
      if (generated.seo) {
        setShortsSeoResult(generated.seo);
      }

      // Reset visuals state so visual prompts are generated explicitly on demand
      setShortsVisuals([]);
      setShortsMusicPrompt("");

      // Mark idea as generated
      setOutlierIdeas(prev => prev.map(item => item.id === idea.id ? { ...item, isGenerated: true, fullScript: generated.script } : item));

      toast.success(`Сценарий для «${idea.title}» готов! Вы можете просмотреть его или отдельно запустить генерацию промптов.`);
    } catch (error) {
      onError(error, "Ошибка генерации сценария по идее");
    } finally {
      setIsGeneratingIdeaScript(prev => ({ ...prev, [idea.id]: false }));
    }
  };

  const handleClearOutlierMemory = () => {
    setOutlierAnalysis(null);
    setOutlierIdeas([]);
    toast.info("Память анализатора очищена");
  };

  const handleDeleteOutlierIdea = (id: string) => {
    setOutlierIdeas(prev => prev.filter(i => i.id !== id));
    toast.info("Идея удалена из списка");
  };

  /**
   * Add user's custom Shorts idea and optionally run immediate full script generation
   */
  const handleAddCustomIdea = async (newIdea: ShortsOutlierIdea, generateScriptNow = false) => {
    setOutlierIdeas(prev => [newIdea, ...prev]);
    toast.success(`Идея «${newIdea.title}» успешно добавлена!`);

    if (generateScriptNow) {
      await handleGenerateScriptFromOutlierIdea(newIdea);
    }
  };

  /**
   * Add user's custom ready-to-use Shorts script directly into the active Shorts cards
   */
  const handleAddCustomDirectScript = (newItem: CutShortItem) => {
    setCutShortsResults(prev => [newItem, ...prev]);
    setSelectedShortForVisuals(newItem.script);
    setSelectedShortForSeo(newItem.script);
    setShortsActiveSubTab("visuals");
    toast.success(`Сценарий «${newItem.title}» добавлен! Выполняется разбивка на сцены...`);
    handleGenerateShortsVisuals(newItem.script);
  };

  const handleAnalyzeLongFormRetention = async () => {
    let text = longFormScriptToCut.trim();
    if (!text && generatedBlocks && Object.keys(generatedBlocks).length > 0) {
      const fullText = getFullScriptText(generatedBlocks);
      if (fullText && fullText.trim()) {
        text = fullText.trim();
        setLongFormScriptToCut(text);
      }
    }
    if (!text) {
      toast.error("Пожалуйста, введите или загрузите длинный сценарий");
      return;
    }
    setIsAnalyzingLongFormRetention(true);
    try {
      const result = await analyzeShortsTopicRetention(text, "Long-Form Сценарий", "Главное вступление");
      setLongFormRetentionAnalysis(result);
      toast.success("ИИ-анализ удержания тем для Long-Form успешно завершён!");
    } catch (error) {
      onError(error, "Ошибка при анализе удержания Long-Form");
    } finally {
      setIsAnalyzingLongFormRetention(false);
    }
  };

  const handleAnalyzeShortTopicRetention = async (idx: number, item: CutShortItem) => {
    const scriptToAnalyze = item.loopEnding?.loopedFullScript || item.script;
    setAnalyzingShortRetentionForCard((prev) => ({ ...prev, [idx]: true }));
    try {
      const analysis = await analyzeShortsTopicRetention(scriptToAnalyze, item.title, item.hook);
      const updated = [...cutShortsResults];
      updated[idx] = {
        ...updated[idx],
        retentionAnalysis: analysis,
      };
      setCutShortsResults(updated);
      toast.success(`Анализ удержания тем для "${item.title}" завершён! Оценка: ${analysis.overallScore}%`);
    } catch (error) {
      onError(error, "Ошибка анализа удержания тем");
    } finally {
      setAnalyzingShortRetentionForCard((prev) => ({ ...prev, [idx]: false }));
    }
  };

  const handleOptimizeShortRetention = async (idx: number, item: CutShortItem) => {
    const currentScript = item.loopEnding?.loopedFullScript || item.script;
    setOptimizingShortRetentionForCard((prev) => ({ ...prev, [idx]: true }));
    try {
      const activeCustomInstructions = isCustomInstructionsEnabled ? customInstructions : "";
      const result = await optimizeShortsRetentionAndIntegrate(
        currentScript,
        item.title,
        item.retentionAnalysis,
        {
          model: selectedModel,
          customInstructions: activeCustomInstructions,
          niche: nicheData,
          branding: selectedBranding,
        }
      );

      const updated = [...cutShortsResults];
      if (updated[idx].loopEnding) {
        updated[idx].loopEnding = {
          ...updated[idx].loopEnding!,
          loopedFullScript: result.optimizedScript,
        };
      } else {
        updated[idx].script = result.optimizedScript;
      }
      if (result.optimizedHook) {
        updated[idx].hook = result.optimizedHook;
      }
      updated[idx].optimizedResult = result;
      setCutShortsResults(updated);
      setHiddenRetentionCards((prev) => ({ ...prev, [idx]: true }));
      toast.success(`Сценарий "${item.title}" успешно оптимизирован! ${result.expectedRetentionGain}`);
    } catch (error) {
      onError(error, "Ошибка при оптимизации и внедрении рекомендаций");
    } finally {
      setOptimizingShortRetentionForCard((prev) => ({ ...prev, [idx]: false }));
    }
  };

  const handleApplyTitleToSeo = (title: string) => {
    setShortsCtrTitle(title);
    const index = cutShortsResults.findIndex(
      (item) => item.loopEnding?.loopedFullScript === selectedShortForSeo || item.script === selectedShortForSeo
    );
    if (index !== -1) {
      const updated = [...cutShortsResults];
      if (updated[index].seo) {
        const currentSeo = updated[index].seo!;
        const newTitles = [...(currentSeo.titles || [])];
        if (newTitles.length > 0) {
          newTitles[0] = title;
        } else {
          newTitles.push(title);
        }
        const updatedSeo = {
          ...currentSeo,
          titles: newTitles,
        };
        updated[index].seo = updatedSeo;
        setCutShortsResults(updated);
        setShortsSeoResult(updatedSeo);
        toast.success("Заголовок применен к Анализатору и к Пакетному SEO!");
      } else {
        const newSeo: ShortsSEO = {
          titles: [title],
          description: "",
          hashtags: [],
          keywords: [],
          pinnedComment: "",
        };
        updated[index].seo = newSeo;
        setCutShortsResults(updated);
        setShortsSeoResult(newSeo);
        toast.success("Заголовок применен к Анализатору и создан новый SEO-пакет!");
      }
    } else {
      if (shortsSeoResult) {
        const newTitles = [...(shortsSeoResult.titles || [])];
        if (newTitles.length > 0) {
          newTitles[0] = title;
        } else {
          newTitles.push(title);
        }
        setShortsSeoResult({
          ...shortsSeoResult,
          titles: newTitles,
        });
        toast.success("Заголовок применен к Анализатору и к Пакетному SEO!");
      } else {
        setShortsSeoResult({
          titles: [title],
          description: "",
          hashtags: [],
          keywords: [],
          pinnedComment: "",
        });
        toast.success("Заголовок применен к Анализатору и создан новый SEO-пакет!");
      }
    }
  };

  const handleApplyDescriptionToSeo = (description: string) => {
    setShortsCtrDescription(description);
    const index = cutShortsResults.findIndex(
      (item) => item.loopEnding?.loopedFullScript === selectedShortForSeo || item.script === selectedShortForSeo
    );
    if (index !== -1) {
      const updated = [...cutShortsResults];
      if (updated[index].seo) {
        const currentSeo = updated[index].seo!;
        const newDescription = description.trim();
        const updatedSeo = {
          ...currentSeo,
          description: newDescription,
        };
        updated[index].seo = updatedSeo;
        setCutShortsResults(updated);
        setShortsSeoResult(updatedSeo);
        toast.success("Описание применено к Анализатору и к Пакетному SEO!");
      } else {
        const newSeo: ShortsSEO = {
          titles: [],
          description: description,
          hashtags: [],
          keywords: [],
          pinnedComment: "",
        };
        updated[index].seo = newSeo;
        setCutShortsResults(updated);
        setShortsSeoResult(newSeo);
        toast.success("Описание применено к Анализатору и создан новый SEO-пакет!");
      }
    } else {
      if (shortsSeoResult) {
        const newDescription = description.trim();
        setShortsSeoResult({
          ...shortsSeoResult,
          description: newDescription,
        });
        toast.success("Описание применено к Анализатору и к Пакетному SEO!");
      } else {
        setShortsSeoResult({
          titles: [],
          description: description,
          hashtags: [],
          keywords: [],
          pinnedComment: "",
        });
        toast.success("Описание применено к Анализатору и создан новый SEO-пакет!");
      }
    }
  };

  const applyBroadShortsSEOChange = (
    area: string,
    value: string,
    context?: {
      ruleTitle?: string;
      suggestion?: string;
      isRuleViolation?: boolean;
      targetField?: string;
    }
  ) => {
    const activeIndex = cutShortsResults.findIndex(
      (item) => item.loopEnding?.loopedFullScript === selectedShortForSeo || item.script === selectedShortForSeo
    );
    const activeSeo = (activeIndex !== -1 ? cutShortsResults[activeIndex]?.seo : null) || shortsSeoResult;
    if (!activeSeo) {
      toast.error("Нет активного SEO для Shorts");
      return;
    }

    const lowerArea = area.toLowerCase();
    const updatedSeo: ShortsSEO = { ...activeSeo };
    const changesApplied: string[] = [];

    // 1. Handle Titles
    if (lowerArea.includes("title") || lowerArea.includes("заголов")) {
      const oldTitle = updatedSeo.titles?.[0] || "";
      const newTitles = [value, ...(updatedSeo.titles || []).filter((t) => t !== value && t !== oldTitle)];
      updatedSeo.titles = newTitles;
      setShortsCtrTitle(value);
      changesApplied.push("Заголовок");

      if (updatedSeo.description && oldTitle && updatedSeo.description.startsWith(oldTitle)) {
        updatedSeo.description = updatedSeo.description.replace(oldTitle, value);
        setShortsCtrDescription(updatedSeo.description);
        changesApplied.push("Описание (начало)");
      }
    }

    // 2. Handle Descriptions
    if (lowerArea.includes("description") || lowerArea.includes("описан")) {
      const mergedDesc = smartMergeDescriptionUpdate(
        updatedSeo.description || "",
        value,
        {
          area,
          ruleTitle: context?.ruleTitle,
          suggestion: context?.suggestion,
          targetField: context?.targetField,
          isRuleViolation: context?.isRuleViolation,
        }
      );
      updatedSeo.description = mergedDesc;
      setShortsCtrDescription(mergedDesc);
      changesApplied.push("Описание");
    }

    // 3. Handle Keywords & Tags
    if (
      lowerArea.includes("keyword") ||
      lowerArea.includes("ключев") ||
      lowerArea.includes("tag") ||
      (lowerArea.includes("тег") && !lowerArea.includes("хештег"))
    ) {
      const tags = value
        .split(/[,#\s]+/)
        .filter((t) => t.length > 0)
        .map((t) => t.replace(/^#/, ""));
      const mergedKw = Array.from(new Set([...(updatedSeo.keywords || []), ...tags]));
      const mergedHash = Array.from(new Set([...(updatedSeo.hashtags || []), ...tags.map((t) => (t.startsWith("#") ? t : `#${t}`))]));
      updatedSeo.keywords = mergedKw;
      updatedSeo.hashtags = mergedHash;
      changesApplied.push("Ключевые слова", "Теги");
    }

    // 4. Handle Hashtags
    if (lowerArea.includes("hashtag") || lowerArea.includes("хештег")) {
      const cleanTags = value
        .split(/[,#\s]+/)
        .filter((t) => t.length > 0)
        .map((t) => (t.startsWith("#") ? t : `#${t}`));
      updatedSeo.hashtags = cleanTags;
      changesApplied.push("Хештеги");
    }

    // 5. Handle Pinned Comment
    if (lowerArea.includes("pinned") || lowerArea.includes("comment") || lowerArea.includes("коммент")) {
      updatedSeo.pinnedComment = value;
      changesApplied.push("Закрепленный комментарий");
    }

    // Save to state
    if (activeIndex !== -1) {
      const updated = [...cutShortsResults];
      updated[activeIndex] = { ...updated[activeIndex], seo: updatedSeo };
      setCutShortsResults(updated);
    }
    setShortsSeoResult(updatedSeo);

    if (changesApplied.length > 0) {
      toast.success(`Изменения применены к: ${Array.from(new Set(changesApplied)).join(", ")}`);
    }
  };

  const handleAnalyzeShortsSEO = async () => {
    const activeIndex = cutShortsResults.findIndex(
      (item) => item.loopEnding?.loopedFullScript === selectedShortForSeo || item.script === selectedShortForSeo
    );
    const activeSeo = (activeIndex !== -1 ? cutShortsResults[activeIndex]?.seo : null) || shortsSeoResult;

    if (!activeSeo) {
      toast.error("Сначала сгенерируйте SEO-пакет для Shorts");
      return;
    }

    const topicToUse = shortsCtrTitle || activeSeo.titles?.[0] || selectedShortForSeo || "Shorts";
    const activeCustomInstructions = isCustomInstructionsEnabled ? customInstructions : "";

    const videoSeoAdapter: VideoSEO = {
      title: activeSeo.titles?.[0] || shortsCtrTitle || "Shorts",
      description: activeSeo.description || "",
      keywords: Array.isArray(activeSeo.keywords) ? activeSeo.keywords.join(", ") : (activeSeo.keywords || ""),
      hashtags: activeSeo.hashtags || [],
      pinnedComment: activeSeo.pinnedComment || "",
    };

    setIsAnalyzingShortsSeoAudit(true);
    try {
      const analysis = await analyzeSEOAndSuggestImprovements(
        topicToUse,
        nicheData?.niche || "",
        videoSeoAdapter,
        {
          model: selectedModel,
          customInstructions: activeCustomInstructions,
        }
      );
      setShortsSeoAnalysis(analysis);
      toast.success("Глубокий SEO-аудит Shorts завершен!");
    } catch (error) {
      if (handleGeminiError) {
        handleGeminiError(error, "Ошибка при анализе SEO Shorts");
      } else {
        handleAppError(error, "Анализ SEO Shorts");
      }
    } finally {
      setIsAnalyzingShortsSeoAudit(false);
    }
  };

  const handleApplyAllShortsRuleFixes = () => {
    const activeIndex = cutShortsResults.findIndex(
      (item) => item.loopEnding?.loopedFullScript === selectedShortForSeo || item.script === selectedShortForSeo
    );
    const activeSeo = (activeIndex !== -1 ? cutShortsResults[activeIndex]?.seo : null) || shortsSeoResult;

    if (!activeSeo || !shortsSeoAnalysis) return;
    const ruleViolations = (shortsSeoAnalysis.improvements || []).filter((imp) => imp.isRuleViolation);
    const auditFixes = (shortsSeoAnalysis.customRulesAudit?.items || []).filter((item) => item.status === "failed" && item.suggestedFix);

    if (ruleViolations.length === 0 && auditFixes.length === 0) {
      toast.info("Все кастомные правила уже соблюдены!");
      return;
    }

    const updatedSeo: ShortsSEO = { ...activeSeo };
    let appliedCount = 0;

    auditFixes.forEach((fix) => {
      if (!fix.suggestedFix) return;
      if (fix.targetField === "description" || fix.ruleTitle.includes("Псевдоним") || fix.ruleTitle.includes("ссылок")) {
        const merged = smartMergeDescriptionUpdate(
          updatedSeo.description || "",
          fix.suggestedFix,
          {
            area: "description",
            ruleTitle: fix.ruleTitle,
            targetField: fix.targetField,
          }
        );
        updatedSeo.description = merged;
        setShortsCtrDescription(merged);
        appliedCount++;
      } else if (fix.targetField === "hashtags" || fix.ruleTitle.includes("хештег")) {
        const cleanTags = fix.suggestedFix
          .split(/[,#\s]+/)
          .filter((t) => t.length > 0)
          .map((t) => (t.startsWith("#") ? t : `#${t}`));
        updatedSeo.hashtags = cleanTags;
        appliedCount++;
      } else if (fix.targetField === "title" || fix.ruleTitle.includes("заголовок")) {
        const newTitles = [fix.suggestedFix, ...(updatedSeo.titles || []).filter((t) => t !== fix.suggestedFix)];
        updatedSeo.titles = newTitles;
        setShortsCtrTitle(fix.suggestedFix);
        appliedCount++;
      } else if (fix.targetField === "pinnedComment") {
        updatedSeo.pinnedComment = fix.suggestedFix;
        appliedCount++;
      }
    });

    ruleViolations.forEach((imp) => {
      const lower = imp.area.toLowerCase();
      if (lower.includes("описан") && !auditFixes.some((f) => f.targetField === "description")) {
        const merged = smartMergeDescriptionUpdate(
          updatedSeo.description || "",
          imp.suggestedValue,
          {
            area: imp.area,
            ruleTitle: imp.ruleTitle,
            suggestion: imp.suggestion,
          }
        );
        updatedSeo.description = merged;
        setShortsCtrDescription(merged);
        appliedCount++;
      } else if (lower.includes("хештег") && !auditFixes.some((f) => f.targetField === "hashtags")) {
        updatedSeo.hashtags = imp.suggestedValue.split(/[,#\s]+/).filter(Boolean).map((t) => (t.startsWith("#") ? t : `#${t}`));
        appliedCount++;
      } else if (lower.includes("заголов") && !auditFixes.some((f) => f.targetField === "title")) {
        updatedSeo.titles = [imp.suggestedValue, ...(updatedSeo.titles || []).filter((t) => t !== imp.suggestedValue)];
        setShortsCtrTitle(imp.suggestedValue);
        appliedCount++;
      }
    });

    if (activeIndex !== -1) {
      const updated = [...cutShortsResults];
      updated[activeIndex] = { ...updated[activeIndex], seo: updatedSeo };
      setCutShortsResults(updated);
    }
    setShortsSeoResult(updatedSeo);

    const updatedAudit = shortsSeoAnalysis.customRulesAudit
      ? {
          ...shortsSeoAnalysis.customRulesAudit,
          passedRules: shortsSeoAnalysis.customRulesAudit.totalRules,
          items: shortsSeoAnalysis.customRulesAudit.items.map((item) => ({
            ...item,
            status: "passed" as const,
            details: "Успешно исправлено и приведено в соответствие с правилом.",
          })),
        }
      : undefined;

    const remainingImprovements = (shortsSeoAnalysis.improvements || []).filter((imp) => !imp.isRuleViolation);

    setShortsSeoAnalysis({
      ...shortsSeoAnalysis,
      score: Math.min(100, (shortsSeoAnalysis.score || 70) + 15),
      scoreBreakdown: shortsSeoAnalysis.scoreBreakdown
        ? {
            ...shortsSeoAnalysis.scoreBreakdown,
            rulesComplianceScore: 100,
          }
        : undefined,
      customRulesAudit: updatedAudit,
      improvements: remainingImprovements,
    });

    toast.success(`Все кастомные правила успешно применены (${appliedCount} изменений)!`);
  };

  const handleApplyShortsSEOImprovement = (
    improvement: {
      area: string;
      suggestedValue: string;
      impact: string;
      isRuleViolation?: boolean;
      ruleTitle?: string;
      suggestion?: string;
    },
    index: number
  ) => {
    applyBroadShortsSEOChange(improvement.area, improvement.suggestedValue, {
      suggestion: improvement.suggestion,
      ruleTitle: improvement.ruleTitle,
      isRuleViolation: improvement.isRuleViolation,
    });

    if (shortsSeoAnalysis) {
      const updatedImprovements = [...(shortsSeoAnalysis.improvements || [])];
      updatedImprovements.splice(index, 1);

      let updatedCustomRulesAudit = shortsSeoAnalysis.customRulesAudit;
      if (improvement.isRuleViolation && updatedCustomRulesAudit) {
        const updatedItems = updatedCustomRulesAudit.items.map((item) => {
          if (
            (improvement.ruleTitle && item.ruleTitle === improvement.ruleTitle) ||
            item.suggestedFix === improvement.suggestedValue ||
            (improvement.area.toLowerCase().includes("описан") && item.targetField === "description") ||
            (improvement.area.toLowerCase().includes("хештег") && item.targetField === "hashtags")
          ) {
            return {
              ...item,
              status: "passed" as const,
              details: "Успешно исправлено пользователем.",
            };
          }
          return item;
        });

        const passedCount = updatedItems.filter((i) => i.status === "passed").length;
        updatedCustomRulesAudit = {
          ...updatedCustomRulesAudit,
          passedRules: passedCount,
          items: updatedItems,
        };
      }

      setShortsSeoAnalysis({
        ...shortsSeoAnalysis,
        improvements: updatedImprovements,
        customRulesAudit: updatedCustomRulesAudit,
      });
    }
  };

  const handleRemoveShortsAuditImprovement = (index: number) => {
    if (!shortsSeoAnalysis) return;
    const updated = [...(shortsSeoAnalysis.improvements || [])];
    updated.splice(index, 1);
    setShortsSeoAnalysis({
      ...shortsSeoAnalysis,
      improvements: updated,
    });
    toast.info("Замечание удалено из списка");
  };

  const handleApplyLongFormSeoToShorts = (targetScriptText?: string) => {
    if (!videoSEO || (!videoSEO.keywords && (!videoSEO.hashtags || videoSEO.hashtags.length === 0))) {
      toast.error(
        "В разделе SEO (для длинных видео) пока нет ключевых слов или хештегов. Заполните или сгенерируйте SEO во вкладке 'SEO'."
      );
      return;
    }
    // Extract raw keywords from videoSEO.keywords
    const rawKeywords =
      typeof videoSEO.keywords === "string"
        ? videoSEO.keywords.split(/[,;\n]+/).map((k) => k.trim()).filter(Boolean)
        : Array.isArray(videoSEO.keywords)
        ? (videoSEO.keywords as string[]).map((k) => String(k).trim()).filter(Boolean)
        : [];

    // Extract raw hashtags from videoSEO.hashtags
    const rawHashtags = Array.isArray(videoSEO.hashtags)
      ? videoSEO.hashtags
          .map((h) => {
            const clean = h.trim().replace(/^#/, "");
            return clean ? `#${clean}` : "";
          })
          .filter(Boolean)
      : [];

    const defaultShortsTags = ["#Shorts", "#YouTubeShorts", "#шортс"];
    const combinedHashtags = Array.from(new Set([...rawHashtags, ...defaultShortsTags]));

    const scriptKey = targetScriptText || selectedShortForSeo;
    const targetIndex = cutShortsResults.findIndex(
      (item) => item.loopEnding?.loopedFullScript === scriptKey || item.script === scriptKey
    );

    if (targetIndex !== -1) {
      const updated = [...cutShortsResults];
      const existingSeo = updated[targetIndex].seo;
      const mergedKeywords = Array.from(new Set([...(existingSeo?.keywords || []), ...rawKeywords]));
      const mergedHashtags = Array.from(new Set([...(existingSeo?.hashtags || []), ...combinedHashtags]));

      let updatedDesc = existingSeo?.description || "";
      if (updatedDesc) {
        const hashtagsString = mergedHashtags.slice(0, 5).join(" ");
        if (!updatedDesc.includes("#Shorts") && !updatedDesc.includes("#shorts")) {
          updatedDesc = `${updatedDesc}\n\n${hashtagsString}`;
        }
      } else {
        updatedDesc = `${videoSEO.description || ""}\n\n${mergedHashtags.slice(0, 5).join(" ")}`.trim();
      }

      const activeCustomInstructions = isCustomInstructionsEnabled ? customInstructions : "";
      const newSeo: ShortsSEO = {
        titles:
          existingSeo?.titles && existingSeo.titles.length > 0
            ? existingSeo.titles
            : [updated[targetIndex].title || videoSEO.title || "Shorts"],
        description: updatedDesc,
        keywords: mergedKeywords,
        hashtags: mergedHashtags,
        pinnedComment: existingSeo?.pinnedComment || videoSEO.pinnedComment || "",
      };
      const enforcedSeo = enforceCustomRulesOnShortsSEO(newSeo, activeCustomInstructions);

      updated[targetIndex].seo = enforcedSeo;
      setCutShortsResults(updated);
      setShortsSeoResult(enforcedSeo);
      setSelectedShortForSeo(updated[targetIndex].loopEnding?.loopedFullScript || updated[targetIndex].script);
      toast.success(
        `Настройки SEO применены к Shorts #${targetIndex + 1}! (Перенесено ${rawKeywords.length} тегов и ${rawHashtags.length} хештегов)`
      );
    } else {
      const activeCustomInstructions = isCustomInstructionsEnabled ? customInstructions : "";
      const mergedKeywords = Array.from(new Set([...(shortsSeoResult?.keywords || []), ...rawKeywords]));
      const mergedHashtags = Array.from(new Set([...(shortsSeoResult?.hashtags || []), ...combinedHashtags]));

      let updatedDesc = shortsSeoResult?.description || "";
      if (updatedDesc) {
        const hashtagsString = mergedHashtags.slice(0, 5).join(" ");
        if (!updatedDesc.includes("#Shorts") && !updatedDesc.includes("#shorts")) {
          updatedDesc = `${updatedDesc}\n\n${hashtagsString}`;
        }
      } else {
        updatedDesc = `${videoSEO.description || ""}\n\n${mergedHashtags.slice(0, 5).join(" ")}`.trim();
      }

      const newSeo: ShortsSEO = {
        titles:
          shortsSeoResult?.titles && shortsSeoResult.titles.length > 0
            ? shortsSeoResult.titles
            : videoSEO.title
            ? [videoSEO.title]
            : ["Вирусный Shorts"],
        description: updatedDesc,
        keywords: mergedKeywords,
        hashtags: mergedHashtags,
        pinnedComment: shortsSeoResult?.pinnedComment || videoSEO.pinnedComment || "",
      };
      const enforcedSeo = enforceCustomRulesOnShortsSEO(newSeo, activeCustomInstructions);

      setShortsSeoResult(enforcedSeo);
      if (cutShortsResults.length > 0) {
        const updated = [...cutShortsResults];
        updated[0].seo = enforcedSeo;
        setCutShortsResults(updated);
        setSelectedShortForSeo(updated[0].loopEnding?.loopedFullScript || updated[0].script);
        toast.success(
          `Настройки SEO применены к Shorts #1! (Перенесено ${rawKeywords.length} тегов и ${rawHashtags.length} хештегов)`
        );
      } else {
        toast.success(
          `Настройки SEO применены к активному пакету Shorts! (Перенесено ${rawKeywords.length} тегов и ${rawHashtags.length} хештегов)`
        );
      }
    }
  };

  const handleGenerateShortsHashtags = async (customTitle?: string, customScript?: string) => {
    const activeItem = cutShortsResults.find(
      (item) => item.loopEnding?.loopedFullScript === selectedShortForSeo || item.script === selectedShortForSeo
    );
    const title = customTitle || shortsCtrTitle || activeItem?.title || videoSEO?.title || "Shorts видео";
    const script =
      customScript ||
      selectedShortForSeo ||
      activeItem?.loopEnding?.loopedFullScript ||
      activeItem?.script ||
      longFormScriptToCut ||
      "Короткое видео для Shorts";

    setIsGeneratingShortsHashtags(true);
    try {
      const activeCustomInstructions = isCustomInstructionsEnabled ? customInstructions : "";
      const result = await generateShortsHashtags(title, script, {
        model: selectedModel,
        customInstructions: activeCustomInstructions,
        niche: nicheData,
        branding: selectedBranding,
      });
      setShortsHashtagsResult(result);

      if (result.hashtags && result.hashtags.length > 0) {
        if (selectedShortForSeo) {
          setCutShortsResults((prev) =>
            prev.map((item) => {
              const actual = item.loopEnding?.loopedFullScript || item.script;
              if (actual === selectedShortForSeo || item.script === selectedShortForSeo) {
                const prevSeo = item.seo || {
                  titles: [item.title || title],
                  description: "",
                  keywords: [],
                  hashtags: [],
                  pinnedComment: "",
                };
                return {
                  ...item,
                  seo: {
                    ...prevSeo,
                    hashtags: result.hashtags,
                  },
                };
              }
              return item;
            })
          );
        }
        setShortsSeoResult((prev) => {
          if (prev) {
            return { ...prev, hashtags: result.hashtags };
          }
          return {
            titles: [title],
            description: "",
            keywords: [],
            hashtags: result.hashtags,
            pinnedComment: "",
          };
        });
      }
      toast.success(`Сгенерировано ${result.hashtags.length} релевантных хештегов для Shorts!`);
    } catch (error) {
      onError(error, "Ошибка при генерации хештегов Shorts");
    } finally {
      setIsGeneratingShortsHashtags(false);
    }
  };

  const handleCopyShortsHashtags = (hashtagsToCopy?: string[] | string) => {
    let text = "";
    if (typeof hashtagsToCopy === "string" && hashtagsToCopy.trim()) {
      text = hashtagsToCopy.trim();
    } else if (Array.isArray(hashtagsToCopy) && hashtagsToCopy.length > 0) {
      text = hashtagsToCopy.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
    } else if (shortsHashtagsResult?.formattedString) {
      text = shortsHashtagsResult.formattedString;
    } else if (shortsHashtagsResult?.hashtags && shortsHashtagsResult.hashtags.length > 0) {
      text = shortsHashtagsResult.hashtags.join(" ");
    } else {
      const current = cutShortsResults.find(
        (item) => item.loopEnding?.loopedFullScript === selectedShortForSeo || item.script === selectedShortForSeo
      )?.seo?.hashtags || shortsSeoResult?.hashtags;
      if (current && current.length > 0) {
        text = current.join(" ");
      }
    }
    if (!text) {
      toast.error("Список хештегов пуст. Сгенерируйте хештеги перед копированием.");
      return;
    }
    copyToClipboard(text);
    setShortsHashtagsCopied(true);
    setTimeout(() => setShortsHashtagsCopied(false), 2000);
    toast.success(`Хештеги скопированы в буфер обмена! (${text.split(/\s+/).filter(Boolean).length} шт.)`);
  };

  const handleCutLongFormScript = async () => {
    let text = longFormScriptToCut.trim();
    if (!text && generatedBlocks && Object.keys(generatedBlocks).length > 0) {
      const fullText = getFullScriptText(generatedBlocks);
      if (fullText && fullText.trim()) {
        text = fullText.trim();
        setLongFormScriptToCut(text);
      }
    }
    if (!text) {
      toast.error("Пожалуйста, введите или вставьте длинный сценарий (или сгенерируйте его во вкладке «Сценарий»)");
      return;
    }
    setIsCuttingLongForm(true);
    try {
      const activeCustomInstructions = isCustomInstructionsEnabled ? customInstructions : "";
      const results = await cutLongFormScriptToShorts(text, {
        model: selectedModel,
        customInstructions: activeCustomInstructions,
        niche: nicheData,
        branding: selectedBranding,
        outlierIdeas,
      });

      if (!results || results.length === 0) {
        setCutShortsResults([]);
        toast.error("Не удалось сгенерировать Shorts. Попробуйте упростить или сократить исходный сценарий и повторите попытку.");
        return;
      }

      setCutShortsResults(results);

      if (results.length < 3) {
        toast.warning(
          `Сгенерировано ${results.length} Shorts — автоматически создано дополнительные варианты из исходного текста, чтобы получить минимум 3.`
        );
      } else if (results.length > 5) {
        toast.info(`Сгенерировано ${results.length} Shorts — отображаются первые 5.`);
      } else {
        toast.success(`Успешно выделено ${results.length} Shorts с индивидуальными хуками!`);
      }

      const tooShort = results.filter((r) => {
        const m = String(r.duration || "").match(/(\d{1,4})/);
        return !m || parseInt(m[1], 10) < 60;
      });
      if (tooShort.length > 0) {
        toast.info("Некоторые Shorts были дополнены, чтобы достигать минимальной длительности 60 секунд.");
      }
    } catch (error) {
      onError(error, "Ошибка при умной нарезке сценария");
      const sourceWords = text.split(/\s+/).filter(Boolean);
      const fallbackParts = Math.min(3, Math.max(1, sourceWords.length));
      const fallbackChunkSize = Math.ceil(sourceWords.length / fallbackParts);
      const fallbackResults: CutShortItem[] = [];

      for (let index = 0; index < fallbackParts; index += 1) {
        const script = sourceWords
          .slice(index * fallbackChunkSize, (index + 1) * fallbackChunkSize)
          .join(" ")
          .trim();
        if (!script) continue;
        fallbackResults.push({
          title: `Shorts #${index + 1}`,
          hook: script.slice(0, 120),
          script,
          viral_potential: "Высокий потенциал удержания",
          duration: "60-90 сек",
        });
      }

      if (fallbackResults.length > 0) {
        const activeCustomInstructions = isCustomInstructionsEnabled ? customInstructions : "";
        const enforced = fallbackResults.map((it) => enforceCustomRulesOnShortsItem(it, activeCustomInstructions));
        setCutShortsResults(enforced);
        toast.warning("Shorts созданы из исходного текста без ИИ-нарезки.");
      }
    } finally {
      setIsCuttingLongForm(false);
    }
  };

  const handleGenerateLoopForCard = async (idx: number, script: string) => {
    setGeneratingLoopForCard((prev) => ({ ...prev, [idx]: true }));
    setLoopErrorForCard((prev) => ({ ...prev, [idx]: null }));
    try {
      const activeCustomInstructions = isCustomInstructionsEnabled ? customInstructions : "";
      const result = await generateSeamlessLoopEnding(script, {
        model: selectedModel,
        customInstructions: activeCustomInstructions,
        niche: nicheData,
        branding: selectedBranding,
      });
      setCutShortsResults((prev) => {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          loopEnding: result,
        };
        return updated;
      });
      toast.success(`Бесшовная концовка для Shorts #${idx + 1} успешно сгенерирована!`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      setLoopErrorForCard((prev) => ({ ...prev, [idx]: errMsg }));
      onError(error, "Ошибка при генерации зацикленной концовки");
    } finally {
      setGeneratingLoopForCard((prev) => ({ ...prev, [idx]: false }));
    }
  };

  const [regeneratingSceneIdx, setRegeneratingSceneIdx] = useState<number | null>(null);

  const handleGenerateShortsVisuals = async (shortText: string) => {
    if (!shortText.trim()) return;
    setSelectedShortForVisuals(shortText);
    setShortsActiveSubTab("visuals");
    setIsGeneratingShortsVisuals(true);
    setShortsVisuals([]);
    setShortsMusicPrompt("");
    try {
      const activeCustomInstructions = isCustomInstructionsEnabled ? customInstructions : "";

      // Умный парсинг сценария: извлекаем авторские блоки [КАДР: ...] или делим по предложениям
      const structuredScenes = parseScriptIntoExplicitScenes(shortText);
      if (structuredScenes.length === 0) {
        throw new Error("Не удалось разбить текст сценария на сцены");
      }

      const style = {
        imageStyle:
          selectedBranding?.visualAestheticDescription ||
          "Ultra-realistic cinematic, photorealistic, vertical 9:16, optimized for Google Veo 3",
        animationType: "Dynamic cinematic camera movement with natural physical motion",
      };

      // Генерируем промпты параллельными батчами по 4 сцены для максимальной скорости и стабильности
      const BATCH_SIZE = 4;
      const visualsOut: ShortsVisualScene[] = new Array(structuredScenes.length);

      for (let b = 0; b < structuredScenes.length; b += BATCH_SIZE) {
        const batchIndices: number[] = [];
        for (let i = b; i < Math.min(b + BATCH_SIZE, structuredScenes.length); i++) {
          batchIndices.push(i);
        }

        await Promise.all(
          batchIndices.map(async (i) => {
            const sc = structuredScenes[i];
            const chunk = sc.text;
            const shotProfile = getRotatingShotProfile(i);
            const estimatedDuration = 5.0;

            const sceneObj = {
              text: sc.text,
              frameVisual: sc.frameVisual,
              frameAudio: sc.frameAudio,
              screenText: sc.screenText,
              timecode: `${i * 5}-${(i + 1) * 5}s`,
              mood: "",
              audio: {
                soundsAndNoises: sc.frameAudio || "",
              },
              shotType: shotProfile.shotType,
              cameraMovement: shotProfile.cameraMovement,
              sceneIndex: i,
            };

            try {
              const detailed = await generateDetailedPromptForScene(style, sceneObj, {
                model: selectedModel,
                customInstruction: activeCustomInstructions,
                branding: selectedBranding,
                veoSfxEnabled: true,
                sceneIndex: i,
                totalScenes: structuredScenes.length,
                shotType: shotProfile.shotType,
                cameraMovement: shotProfile.cameraMovement,
                scriptContext: shortText,
              } as any);

              const p1 = detailed.videoPrompt1 || detailed.videoPrompt2 || (detailed as any).prompt || "";
              const p2 = detailed.videoPrompt2 || detailed.videoPrompt1 || "";

              const fallbackP1 = sc.frameVisual
                ? `Ultra-realistic 8K cinematic 9:16 vertical video, Google Veo 3 ready. ${sc.frameVisual}. Hollywood color grading, atmospheric contrast. Natural high-fidelity sound: ${sc.frameAudio || "ambient foley"}.`
                : `Ultra-realistic 8K cinematic 9:16 vertical video. ${shotProfile.shotType}. Camera: ${shotProfile.cameraMovement}. Scene: ${chunk}. ${shotProfile.optics}. Natural high-fidelity sound: ${sc.frameAudio || shotProfile.foleyCategory}.`;

              const fallbackP2 = sc.frameVisual
                ? `Cinematic 9:16 vertical video alternate perspective. Close-up detail view. Scene: ${sc.frameVisual}. Razor sharp focus, volumetric lighting. Natural sound.`
                : `Cinematic 9:16 vertical video alternate perspective. Macro/Detail view. Camera: Orbital Arc. Context: ${chunk}. Razor sharp focus, volumetric lighting. Natural sound.`;

              visualsOut[i] = {
                text: sc.text,
                frameVisual: sc.frameVisual,
                frameAudio: sc.frameAudio,
                screenText: sc.screenText || undefined,
                prompt: p1.trim() || fallbackP1,
                videoPrompt1: p1.trim() || fallbackP1,
                videoPrompt2: p2.trim() || fallbackP2,
                shotType: detailed.shotType || shotProfile.shotType,
                shotTypeRu: shotProfile.shotTypeRu,
                cameraMovement: detailed.cameraMovement || shotProfile.cameraMovement,
                cameraMovementRu: shotProfile.cameraMovementRu,
                focalLength: shotProfile.optics,
                duration: estimatedDuration,
                sceneSummary: detailed.sceneSummary || (sc.frameVisual || chunk).slice(0, 80),
              };
            } catch (sceneError) {
              logger.warn(`Fallback для сцены ${i + 1}:`, sceneError);
              const fbP1 = sc.frameVisual
                ? `Ultra-realistic 8K cinematic 9:16 vertical video, Google Veo 3 ready. ${sc.frameVisual}. Hollywood color grading. Natural high-fidelity sound: ${sc.frameAudio || "ambient foley"}.`
                : `Ultra-realistic 8K, 35mm lens, 9:16 vertical video, Google Veo 3 ready. ${shotProfile.shotType}. Camera: ${shotProfile.cameraMovement}. Visualizing: ${chunk}. Hollywood color grading, deep atmospheric contrast. Natural sound: ${shotProfile.foleyCategory}.`;

              visualsOut[i] = {
                text: sc.text,
                frameVisual: sc.frameVisual,
                frameAudio: sc.frameAudio,
                screenText: sc.screenText || undefined,
                prompt: fbP1,
                videoPrompt1: fbP1,
                videoPrompt2: `Cinematic 9:16 vertical alternate angle. Scene: ${sc.frameVisual || chunk}. Atmospheric lighting.`,
                shotType: shotProfile.shotType,
                shotTypeRu: shotProfile.shotTypeRu,
                cameraMovement: shotProfile.cameraMovement,
                cameraMovementRu: shotProfile.cameraMovementRu,
                focalLength: shotProfile.optics,
                duration: estimatedDuration,
                sceneSummary: (sc.frameVisual || chunk).slice(0, 80),
              };
            }
          })
        );
      }

      const finalVisuals = mergeMicroVisualScenes(visualsOut.filter(Boolean));
      setShortsVisuals(finalVisuals);

      // Музыка генерируется отдельно и остаётся одним общим промптом на весь Shorts.
      try {
        const mp = await generateShortsMusicPrompt(shortText, {
          model: selectedModel,
          niche: nicheData,
          branding: selectedBranding,
          videoSEO: videoSEO,
          customInstructions: activeCustomInstructions,
        } as any);
        setShortsMusicPrompt(mp || "");
      } catch (errMusic) {
        logger.warn("generateShortsMusicPrompt failed:", errMusic);
        setShortsMusicPrompt("");
      }

      toast.success(`Полная раскадровка готова: ${finalVisuals.length} сцен охватывают 100% текста сценария без сокращений! 🎬`);
    } catch (error) {
      onError(error, "Ошибка при генерации промптов для сцен Shorts");
    } finally {
      setIsGeneratingShortsVisuals(false);
    }
  };

  const handleRegenerateSingleSceneVisual = async (sceneIndex: number, userWish?: string) => {
    if (!shortsVisuals[sceneIndex]) return;
    const targetScene = shortsVisuals[sceneIndex];
    setRegeneratingSceneIdx(sceneIndex);

    try {
      const activeCustomInstructions = isCustomInstructionsEnabled ? customInstructions : "";
      const shotProfile = getRotatingShotProfile(sceneIndex);
      const style = {
        imageStyle:
          selectedBranding?.visualAestheticDescription ||
          "Ultra-realistic cinematic, photorealistic, vertical 9:16, optimized for Google Veo 3",
        animationType: "Dynamic cinematic camera movement with natural physical motion",
      };

      const sceneObj = {
        text: targetScene.text,
        frameVisual: targetScene.frameVisual,
        frameAudio: targetScene.frameAudio,
        screenText: targetScene.screenText,
        timecode: `${sceneIndex * 5}-${(sceneIndex + 1) * 5}s`,
        mood: "",
        audio: {
          soundsAndNoises: targetScene.frameAudio || "",
        },
        shotType: targetScene.shotType || shotProfile.shotType,
        cameraMovement: targetScene.cameraMovement || shotProfile.cameraMovement,
        sceneIndex,
      };

      const customInstructionPayload = userWish?.trim()
        ? [activeCustomInstructions, `ТРЕБОВАНИЯ И ПОЖЕЛАНИЯ ПОЛЬЗОВАТЕЛЯ К ЭТОЙ СЦЕНЕ:\n"${userWish.trim()}"`].filter(Boolean).join("\n\n")
        : activeCustomInstructions;

      const detailed = await generateDetailedPromptForScene(style, sceneObj, {
        model: selectedModel,
        customInstruction: customInstructionPayload,
        branding: selectedBranding,
        veoSfxEnabled: true,
        sceneIndex,
        totalScenes: shortsVisuals.length,
        shotType: targetScene.shotType || shotProfile.shotType,
        cameraMovement: targetScene.cameraMovement || shotProfile.cameraMovement,
        scriptContext: selectedShortForVisuals,
      } as any);

      const p1 = detailed.videoPrompt1 || detailed.videoPrompt2 || (detailed as any).prompt || "";
      const p2 = detailed.videoPrompt2 || detailed.videoPrompt1 || "";

      setShortsVisuals((prev) => {
        const updated = [...prev];
        updated[sceneIndex] = {
          ...updated[sceneIndex],
          prompt: p1.trim(),
          videoPrompt1: p1.trim(),
          videoPrompt2: p2.trim(),
          shotType: detailed.shotType || targetScene.shotType || shotProfile.shotType,
          shotTypeRu: targetScene.shotTypeRu || shotProfile.shotTypeRu,
          cameraMovement: detailed.cameraMovement || targetScene.cameraMovement || shotProfile.cameraMovement,
          cameraMovementRu: targetScene.cameraMovementRu || shotProfile.cameraMovementRu,
          focalLength: targetScene.focalLength || shotProfile.optics,
          sceneSummary: detailed.sceneSummary || targetScene.text.slice(0, 80),
        };
        return updated;
      });

      toast.success(
        userWish?.trim()
          ? `Сцена #${sceneIndex + 1} перегенерирована с учётом ваших пожеланий! 🎨`
          : `Промпты для Сцены #${sceneIndex + 1} обновлены! 🎨`
      );
    } catch (error) {
      onError(error, `Ошибка регенерации сцены #${sceneIndex + 1}`);
    } finally {
      setRegeneratingSceneIdx(null);
    }
  };

  const handleRegenerateShortsMusicPrompt = async () => {
    let shortText = selectedShortForVisuals || "";
    if (!shortText && outlierIdeas.length > 0) {
      const ideaWithScript = outlierIdeas.find((i) => i.fullScript);
      shortText = ideaWithScript?.fullScript || outlierIdeas[0].hook || "";
    }
    if (!shortText && cutShortsResults.length > 0) {
      shortText = cutShortsResults[0].script || "";
    }
    if (!shortText && shortsVisuals.length > 0) {
      shortText = shortsVisuals.map((s) => s.text).join(" ");
    }
    if (!shortText) {
      toast.error("Не найден текст сценария для генерации музыки");
      return;
    }

    setIsRegeneratingShortsMusicPrompt(true);
    try {
      const activeCustomInstructions = isCustomInstructionsEnabled ? customInstructions : "";
      const mp = await generateShortsMusicPrompt(shortText, {
        model: selectedModel,
        niche: nicheData,
        branding: selectedBranding,
        videoSEO: videoSEO,
        customInstructions: activeCustomInstructions,
      } as any);

      if (mp) {
        setShortsMusicPrompt(mp);
        toast.success("Музыкальный промпт успешно перегенерирован! 🎵");
      } else {
        toast.error("Не удалось сгенерировать музыкальный промпт");
      }
    } catch (errMusic) {
      logger.error("handleRegenerateShortsMusicPrompt failed:", errMusic);
      onError(errMusic, "Ошибка при перегенерации музыкального промпта");
    } finally {
      setIsRegeneratingShortsMusicPrompt(false);
    }
  };

  const handleDeleteShort = (index: number) => {
    setCutShortsResults((prev) => {
      const targetItem = prev[index];
      const newResults = prev.filter((_, i) => i !== index);

      if (targetItem) {
        const targetScript = targetItem.loopEnding?.loopedFullScript || targetItem.script;
        if (selectedShortForSeo === targetScript || selectedShortForSeo === targetItem.script) {
          if (newResults.length > 0) {
            setSelectedShortForSeo(newResults[0].loopEnding?.loopedFullScript || newResults[0].script);
          } else {
            setSelectedShortForSeo("");
          }
        }
        if (selectedShortForVisuals === targetScript || selectedShortForVisuals === targetItem.script) {
          if (newResults.length > 0) {
            setSelectedShortForVisuals(newResults[0].loopEnding?.loopedFullScript || newResults[0].script);
          } else {
            setSelectedShortForVisuals("");
          }
        }
      }
      return newResults;
    });
    toast.success("Сценарий Shorts удален!");
  };

  const handleGenerateShortsSeo = async (shortText: string) => {
    if (!shortText.trim()) return;
    setSelectedShortForSeo(shortText);
    setShortsActiveSubTab("seo");
    setIsGeneratingShortsSeo(true);
    setShortsSeoResult(null);
    setShortsSeoError(null);
    try {
      const activeCustomInstructions = isCustomInstructionsEnabled ? customInstructions : "";
      const result = await generateShortsSEO(shortText, {
        model: selectedModel,
        customInstructions: activeCustomInstructions,
        niche: nicheData,
        branding: selectedBranding,
      });
      setShortsSeoResult(result);

      // Auto-populate CTR fields if empty
      if (result.titles && result.titles.length > 0 && !shortsCtrTitle.trim()) {
        setShortsCtrTitle(result.titles[0]);
      }
      if (result.description && !shortsCtrDescription.trim()) {
        setShortsCtrDescription(result.description);
      }

      // Map SEO results inside cut list if it matches
      setCutShortsResults((prev) => {
        return prev.map((item) => {
          const actualScript = item.loopEnding?.loopedFullScript || item.script;
          if (actualScript === shortText || item.script === shortText) {
            return { ...item, seo: result };
          }
          return item;
        });
      });
      toast.success("SEO для Shorts успешно сгенерировано!");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      setShortsSeoError(errMsg);
      onError(error, "Ошибка при генерации SEO для Shorts");
    } finally {
      setIsGeneratingShortsSeo(false);
    }
  };

  const handleAnalyzeShortsCtr = async (title: string, description: string) => {
    if (!title.trim()) {
      toast.error("Пожалуйста, введите заголовок для анализа!");
      return;
    }
    setIsAnalyzingShortsCtr(true);
    setShortsCtrResult(null);
    setShortsCtrError(null);
    try {
      const activeCustomInstructions = isCustomInstructionsEnabled ? customInstructions : "";
      const result = await analyzeShortsCTR(title, description, {
        model: selectedModel,
        customInstructions: activeCustomInstructions,
        niche: nicheData,
        branding: selectedBranding,
      });
      setShortsCtrResult(result);
      toast.success("Анализ кликабельности (CTR) успешно выполнен!");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      setShortsCtrError(errMsg);
      toast.error(`Не удалось проанализировать CTR: ${errMsg}`);
    } finally {
      setIsAnalyzingShortsCtr(false);
    }
  };

  const [isGeneratingShortsSocial, setIsGeneratingShortsSocial] = useState(false);
  const [shortsSocialPromo, setShortsSocialPromo] = useState<SocialPromoPackage | null>(null);

  const handleGenerateShortsSocialPromo = async () => {
    const scriptText = selectedShortForVisuals || selectedShortForSeo || "";
    const activeTitle = shortsCtrTitle || (shortsSeoResult?.titles && shortsSeoResult.titles[0]) || videoSEO?.title || "Shorts";

    if (!scriptText && !shortsSeoResult) {
      toast.error("Сначала выберите или сгенерируйте Shorts сценарий / SEO!");
      return;
    }

    setIsGeneratingShortsSocial(true);
    const toastId = toast.loading("ИИ генерирует посты для YouTube, TG, IG и 1:1 цитаты для Shorts...");
    try {
      const activeCustomInstructions = isCustomInstructionsEnabled ? customInstructions : "";
      const socialPkg = await generateSocialPromoPackage({
        title: activeTitle,
        description: shortsCtrDescription || shortsSeoResult?.description || "",
        scriptText: scriptText,
        isShorts: true,
        branding: selectedBranding || nicheData?.branding,
        niche: nicheData,
        customInstructions: activeCustomInstructions,
        options: {
          model: selectedModel,
          customInstructions: activeCustomInstructions,
          branding: selectedBranding,
        } as any,
      });

      setShortsSocialPromo(socialPkg);

      if (shortsSeoResult) {
        const updatedSeo = {
          ...shortsSeoResult,
          socialPromo: socialPkg,
        };
        setShortsSeoResult(updatedSeo);

        // Also update matching cut item
        setCutShortsResults((prev) =>
          prev.map((item) => {
            const actualScript = item.loopEnding?.loopedFullScript || item.script;
            if (actualScript === selectedShortForSeo || item.script === selectedShortForSeo) {
              return { ...item, seo: updatedSeo };
            }
            return item;
          })
        );
      }

      toast.success("Кросс-платформенные посты и 1:1 карточки-цитаты для Shorts готовы!", { id: toastId });
    } catch (error) {
      onError(error, "Ошибка при генерации постов для Shorts");
      toast.dismiss(toastId);
    } finally {
      setIsGeneratingShortsSocial(false);
    }
  };

  const handleExportShortsZip = async () => {
    try {
      const zip = new JSZip();
      const scriptText = selectedShortForVisuals || selectedShortForSeo || "";
      if (!scriptText) {
        toast.error("Сначала сгенерируйте и выберите сценарий Shorts!");
        return;
      }

      let currentSeo = cutShortsResults.find(
        (item) => item.loopEnding?.loopedFullScript === selectedShortForSeo || item.script === selectedShortForSeo
      )?.seo || shortsSeoResult;

      if (shortsCtrTitle.trim() || shortsCtrDescription.trim()) {
        const baseSeo = currentSeo || {
          titles: [],
          description: "",
          hashtags: [],
          keywords: [],
          pinnedComment: "",
        };
        const titles = [...(baseSeo.titles || [])];
        if (shortsCtrTitle.trim()) {
          if (titles.length > 0) {
            titles[0] = shortsCtrTitle.trim();
          } else {
            titles.push(shortsCtrTitle.trim());
          }
        }
        let description = baseSeo.description || "";
        if (shortsCtrDescription.trim()) {
          description = shortsCtrDescription.trim();
        }
        currentSeo = {
          ...baseSeo,
          titles,
          description,
        };
      }

      let folderName = "Shorts_Export";
      if (currentSeo && currentSeo.titles && currentSeo.titles.length > 0) {
        folderName = currentSeo.titles[0].replace(/[\\/:*?"<>|]/g, "_").trim();
      }

      const exportFolder = zip.folder(folderName);
      if (!exportFolder) throw new Error("Не удалось создать папку в ZIP архиве");

      exportFolder.file("1_script.txt", scriptText);

      if (shortsVisuals && shortsVisuals.length > 0) {
        let promptsText = "=====================================================\n";
        promptsText += "ВИЗУАЛЬНЫЕ ПРОМПТЫ ДЛЯ ГЕНЕРАЦИИ (Google Veo 3 / Kling / Midjourney)\n";
        promptsText += "=====================================================\n\n";

        shortsVisuals.forEach((scene, i) => {
          const shotInfo = [
            scene.shotTypeRu || scene.shotType,
            scene.cameraMovementRu || scene.cameraMovement,
            scene.focalLength,
            scene.duration ? `~${scene.duration}с` : null,
          ]
            .filter(Boolean)
            .join(" • ");

          promptsText += `[СЦЕНА ${i + 1}${shotInfo ? ` — ${shotInfo}` : ""}]\n`;
          promptsText += `Текст сценария: ${scene.text}\n\n`;

          const p1 = scene.videoPrompt1 || scene.prompt;
          const p2 = scene.videoPrompt2;

          if (p1) {
            promptsText += `🎬 РАКУРС 1 (Основной план):\n${p1}\n\n`;
          }

          if (p2) {
            promptsText += `🎥 РАКУРС 2 (Контр-план / Альтернативный угол):\n${p2}\n\n`;
          } else if (p1 && scene.prompt && scene.prompt !== p1) {
            promptsText += `🎥 РАКУРС 2 (Контр-план / Альтернативный угол):\n${scene.prompt}\n\n`;
          }

          promptsText += `-----------------------------------------------------\n\n`;
        });

        if (shortsMusicPrompt) {
          promptsText += `🎵 МУЗЫКАЛЬНЫЙ ПРОМПТ:\n${shortsMusicPrompt}\n`;
        }

        exportFolder.file("2_prompts.txt", promptsText);
      }

      if (currentSeo) {
        let seoText = "SEO УПАКОВКА SHORTS\n\n";
        if (currentSeo.titles && currentSeo.titles.length > 0) {
          seoText += "НАЗВАНИЯ:\n";
          currentSeo.titles.forEach((t: string) => (seoText += `- ${t}\n`));
        }
        if (currentSeo.description) {
          seoText += `\nОПИСАНИЕ:\n${currentSeo.description}\n\n`;
        }
        if (currentSeo.hashtags && currentSeo.hashtags.length > 0) {
          seoText += `ХЕШТЕГИ: ${currentSeo.hashtags.join(", ")}\n\n`;
        }
        if (currentSeo.keywords && currentSeo.keywords.length > 0) {
          seoText += `КЛЮЧЕВЫЕ СЛОВА: ${currentSeo.keywords.join(", ")}\n\n`;
        }
        if (currentSeo.pinnedComment) {
          seoText += `ЗАКРЕПЛЕННЫЙ КОММЕНТАРИЙ:\n${currentSeo.pinnedComment}\n`;
        }
        exportFolder.file("3_seo.txt", seoText);
      }

      // Add Subtitles in TXT, SRT, and SBV formats
      try {
        const subtitleCues = generateSubtitlesFromText(scriptText, {
          wordsPerMinute: 165,
          maxWordsPerCue: 6,
          maxCharsPerCue: 36,
          maxDurationSec: 3.0,
        });

        if (subtitleCues.length > 0) {
          exportFolder.file("4_subtitles.srt", cuesToSrt(subtitleCues));
          exportFolder.file("5_subtitles.sbv", cuesToSbv(subtitleCues));
          exportFolder.file("6_subtitles_transcript.txt", cuesToTxt(subtitleCues, "clean"));
          exportFolder.file("7_subtitles_timed.txt", cuesToTxt(subtitleCues, "timed"));
        }
      } catch (subErr) {
        logger.warn("Failed to generate subtitle files for Shorts ZIP:", subErr);
      }

      // Add Ready-to-use Social Promo Package (YouTube Community, Telegram, Instagram Carousel + 1:1 Image Prompts, Quote Cards)
      const socialPromoData = currentSeo?.socialPromo || shortsSocialPromo;
      if (socialPromoData) {
        let promoText = "=====================================================\n";
        promoText += "ГОТОВЫЙ ПРОМО-ПАКЕТ ДЛЯ СОЦСЕТЕЙ И 1:1 КАРТОЧКИ-ЦИЦАТЫ\n";
        promoText += "=====================================================\n\n";

        if (socialPromoData.communityPost) {
          promoText += "1. 🔴 YOUTUBE СООБЩЕСТВО (COMMUNITY POST)\n";
          promoText += "-----------------------------------------------------\n";
          if (socialPromoData.communityPost.headline) {
            promoText += `Заголовок: ${socialPromoData.communityPost.headline}\n\n`;
          }
          promoText += `Текст поста:\n${socialPromoData.communityPost.text}\n\n`;
          if (socialPromoData.communityPost.callToAction) {
            promoText += `Призыв к действию: ${socialPromoData.communityPost.callToAction}\n\n`;
          }
          if (socialPromoData.communityPost.poll) {
            promoText += `📊 ИНТЕРАКТИВНЫЙ ОПРОС:\nВопрос: ${socialPromoData.communityPost.poll.question}\n`;
            socialPromoData.communityPost.poll.options?.forEach((opt, idx) => {
              promoText += `${idx + 1}. ${opt}\n`;
            });
            promoText += "\n";
          }
        }

        if (socialPromoData.telegramPost) {
          promoText += "2. ✈️ TELEGRAM КАНАЛ (TELEGRAM POST)\n";
          promoText += "-----------------------------------------------------\n";
          if (socialPromoData.telegramPost.title) {
            promoText += `Заголовок: ${socialPromoData.telegramPost.title}\n\n`;
          }
          promoText += `Текст поста:\n${socialPromoData.telegramPost.text}\n\n`;
          if (socialPromoData.telegramPost.bulletPoints?.length) {
            promoText += "Ключевые тезисы:\n";
            socialPromoData.telegramPost.bulletPoints.forEach((pt) => {
              promoText += `- ${pt}\n`;
            });
            promoText += "\n";
          }
          if (socialPromoData.telegramPost.callToAction) {
            promoText += `Призыв к действию: ${socialPromoData.telegramPost.callToAction}\n\n`;
          }
          if (socialPromoData.telegramPost.hashtags?.length) {
            promoText += `Хештеги: ${socialPromoData.telegramPost.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}\n\n`;
          }
        }

        if (socialPromoData.instagramPost) {
          promoText += "3. 📸 INSTAGRAM (ПОСТ И СЛАЙДЫ КАРУСЕЛИ 1:1 С ПРОМПТАМИ)\n";
          promoText += "-----------------------------------------------------\n";
          if (socialPromoData.instagramPost.hookTitle) {
            promoText += `Хук (первая строка): ${socialPromoData.instagramPost.hookTitle}\n\n`;
          }
          promoText += `Описание (Caption):\n${socialPromoData.instagramPost.caption}\n\n`;
          if (socialPromoData.instagramPost.hashtags?.length) {
            promoText += `Хештеги: ${socialPromoData.instagramPost.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}\n\n`;
          }
          if (socialPromoData.instagramPost.carouselSlides?.length) {
            promoText += "--- СЛАЙДЫ КАРУСЕЛИ (1:1) ---\n\n";
            socialPromoData.instagramPost.carouselSlides.forEach((slide) => {
              promoText += `[Слайд ${slide.slideNumber || 1} • ${slide.slideType || "инсайт"}]: ${slide.headline}\n`;
              promoText += `Текст слайда: ${slide.text}\n`;
              if (slide.imagePrompt) {
                promoText += `Промпт для картинки слайда (1:1): ${slide.imagePrompt}\n`;
              }
              promoText += "\n";
            });
          }
        }

        if (socialPromoData.quoteCards?.length) {
          promoText += "4. 🎨 КАРТОЧКИ-ЦИЦАТЫ В ФОРМАТЕ 1:1 (QUOTE CARDS & PROMPTS)\n";
          promoText += "-----------------------------------------------------\n";
          socialPromoData.quoteCards.forEach((card, idx) => {
            promoText += `[Карточка-цитата #${idx + 1} (1:1)]\n`;
            promoText += `Цитата: «${card.quote}»\n`;
            if (card.authorOrContext) {
              promoText += `Автор/Контекст: ${card.authorOrContext}\n`;
            }
            promoText += `Промпт для генерации картинки (Midjourney/Imagen 1:1):\n${card.visualPrompt}\n`;
            if (card.designNotes) {
              promoText += `Дизайн-заметки: ${card.designNotes}\n`;
            }
            promoText += "\n";
          });
        }

        exportFolder.file("8_social_promo_package.txt", promoText);
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${folderName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("ZIP архив со сценарием, субтитрами, промптами, SEO и промо-пакетом скачан!");
    } catch (error) {
      onError(error, "Ошибка экспорта ZIP архива Shorts");
    }
  };

  return {
    shortsActiveSubTab,
    setShortsActiveSubTab,
    outlierAnalysis,
    setOutlierAnalysis,
    outlierIdeas,
    setOutlierIdeas,
    isAnalyzingOutliers,
    isGeneratingIdeaScript,
    customCompetitorInput,
    setCustomCompetitorInput,
    customOutlierPrompt,
    setCustomOutlierPrompt,
    handleAnalyzeCompetitorOutliers,
    handleGenerateScriptFromOutlierIdea,
    handleClearOutlierMemory,
    handleDeleteOutlierIdea,
    handleAddCustomIdea,
    handleAddCustomDirectScript,
    longFormScriptToCut,
    setLongFormScriptToCut,
    cutShortsResults,
    setCutShortsResults,
    isCuttingLongForm,
    selectedShortForVisuals,
    setSelectedShortForVisuals,
    shortsVisuals,
    setShortsVisuals,
    shortsMusicPrompt,
    setShortsMusicPrompt,
    isGeneratingShortsVisuals,
    isRegeneratingShortsMusicPrompt,
    handleRegenerateShortsMusicPrompt,
    selectedShortForSeo,
    setSelectedShortForSeo,
    shortsSeoResult,
    setShortsSeoResult,
    shortsSeoAnalysis,
    setShortsSeoAnalysis,
    isAnalyzingShortsSeoAudit,
    handleAnalyzeShortsSEO,
    handleApplyAllShortsRuleFixes,
    applyBroadShortsSEOChange,
    handleApplyShortsSEOImprovement,
    handleRemoveShortsAuditImprovement,
    isGeneratingShortsSeo,
    generatingLoopForCard,
    shortsSeoError,
    loopErrorForCard,
    shortsCtrTitle,
    setShortsCtrTitle,
    shortsCtrDescription,
    setShortsCtrDescription,
    shortsCtrResult,
    setShortsCtrResult,
    isAnalyzingShortsCtr,
    shortsCtrError,
    isGeneratingShortsHashtags,
    shortsHashtagsResult,
    shortsHashtagsCopied,
    analyzingShortRetentionForCard,
    optimizingShortRetentionForCard,
    hiddenRetentionCards,
    setHiddenRetentionCards,
    longFormRetentionAnalysis,
    setLongFormRetentionAnalysis,
    isAnalyzingLongFormRetention,
    handleAnalyzeLongFormRetention,
    handleAnalyzeShortTopicRetention,
    handleOptimizeShortRetention,
    handleApplyTitleToSeo,
    handleApplyDescriptionToSeo,
    handleApplyLongFormSeoToShorts,
    handleGenerateShortsHashtags,
    handleCopyShortsHashtags,
    handleCutLongFormScript,
    handleGenerateLoopForCard,
    handleGenerateShortsVisuals,
    handleRegenerateSingleSceneVisual,
    regeneratingSceneIdx,
    handleDeleteShort,
    handleGenerateShortsSeo,
    handleAnalyzeShortsCtr,
    handleGenerateShortsSocialPromo,
    isGeneratingShortsSocial,
    shortsSocialPromo,
    handleExportShortsZip,
  };
}
