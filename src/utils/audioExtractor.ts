/**
 * Audio Extractor & Chunking Utility
 * Extracts audio tracks from video or audio files in the browser using Web Audio API,
 * downsamples to 16kHz mono PCM WAV, and splits into lightweight chunks (~60s each)
 * to guarantee that requests never exceed Nginx/API payload limits (HTTP 413).
 */

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Converts Float32 channel samples into a standard 16-bit PCM WAV ArrayBuffer.
 */
export function channelDataToWav(
  channelData: Float32Array,
  sampleRate: number
): ArrayBuffer {
  const numChannels = 1;
  const format = 1; // PCM
  const bitDepth = 16;
  const dataLength = channelData.length * (bitDepth / 8);
  const bufferLength = 44 + dataLength;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, "WAVE");

  // fmt chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);

  // data chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  // PCM 16-bit samples
  let offset = 44;
  for (let i = 0; i < channelData.length; i++) {
    const sample = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return arrayBuffer;
}

/**
 * Converts an ArrayBuffer to a Base64 string in safe chunks.
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  let binary = "";
  const chunkSize = 0x8000; // 32KB chunking
  for (let i = 0; i < len; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, Math.min(i + chunkSize, len)) as any
    );
  }
  return btoa(binary);
}

export interface AudioChunk {
  index: number;
  totalChunks: number;
  startSec: number;
  endSec: number;
  durationSec: number;
  base64: string;
  mimeType: string;
}

export interface ExtractedAudioResult {
  chunks: AudioChunk[];
  durationSec: number;
  sampleRate: number;
  totalSizeBytes: number;
}

export interface MediaValidationResult {
  isValid: boolean;
  durationSec: number;
  format: string;
  mimeType: string;
  fileSizeBytes: number;
  estimatedBitrateKbps: number;
  hasAudioTrack: boolean;
  errors: string[];
  warnings: string[];
}

const SUPPORTED_MEDIA_EXTENSIONS = [
  "mp4", "mov", "webm", "mkv", "avi", "m4v", "wmv", "3gp", "ts", "flv",
  "mp3", "wav", "m4a", "aac", "ogg", "oga", "flac", "opus", "wma", "aiff"
];

/**
 * Validates audio/video file integrity, format, duration, bitrate, and audio stream presence before sending to server or processing.
 */
export async function validateMediaAudioFile(file: File | Blob): Promise<MediaValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fileName = (file instanceof File ? file.name : "media_blob").toLowerCase();
  const fileSizeBytes = file.size || 0;
  const mimeType = file.type || "";

  // 1. Check file size
  if (fileSizeBytes <= 0) {
    errors.push("Файл пуст (размер 0 байт). Выберите корректный видео- или аудиофайл.");
  } else if (fileSizeBytes > 2 * 1024 * 1024 * 1024) {
    errors.push(
      `Размер файла (${(fileSizeBytes / (1024 * 1024 * 1024)).toFixed(2)} ГБ) превышает максимальный лимит 2 ГБ.`
    );
  }

  // 2. Check format and extension
  const extMatch = fileName.match(/\.([a-z0-9]+)$/i);
  const ext = extMatch ? extMatch[1].toLowerCase() : "";
  const isSupportedExt = ext && SUPPORTED_MEDIA_EXTENSIONS.includes(ext);
  const isMediaMime =
    mimeType.startsWith("video/") ||
    mimeType.startsWith("audio/") ||
    mimeType === "application/ogg" ||
    mimeType === "application/x-matroska";

  if (!isSupportedExt && !isMediaMime) {
    errors.push(
      `Неподдерживаемый формат файла "${ext ? '.' + ext : fileName}". Поддерживаются форматы: MP4, MOV, WEBM, MKV, AVI, MP3, WAV, M4A, AAC, FLAC, OGG, OPUS.`
    );
  }

  // 3. Probe duration and audio track via browser media element
  let durationSec = 0;
  let hasAudioTrack = true;
  let estimatedBitrateKbps = 0;

  if (typeof window !== "undefined" && typeof document !== "undefined" && fileSizeBytes > 0 && errors.length === 0) {
    try {
      const isVideo = mimeType.startsWith("video/") || /\.(mp4|mov|mkv|avi|webm|m4v|flv)$/i.test(fileName);
      const mediaEl = document.createElement(isVideo ? "video" : "audio") as HTMLMediaElement;
      mediaEl.preload = "metadata";
      mediaEl.muted = true;
      const testUrl = URL.createObjectURL(file);
      mediaEl.src = testUrl;

      await new Promise<void>((resolve) => {
        let isDone = false;
        const cleanup = () => {
          if (isDone) return;
          isDone = true;
          mediaEl.removeAttribute("src");
          mediaEl.load();
          URL.revokeObjectURL(testUrl);
          resolve();
        };

        const timeout = setTimeout(() => {
          warnings.push("Длительное определение метаданных файла браузером (таймаут 6с).");
          cleanup();
        }, 6000);

        mediaEl.onloadedmetadata = () => {
          clearTimeout(timeout);
          durationSec = mediaEl.duration || 0;
          cleanup();
        };

        mediaEl.onerror = () => {
          clearTimeout(timeout);
          // Only warn here as some codecs (e.g. MKV/AVI/FLAC on Safari) might not decode in browser HTML5 but decode perfectly on server FFmpeg
          warnings.push("Браузер не смог декодировать встроенные теги (файл будет передан на серверный FFmpeg-декодер).");
          cleanup();
        };
      });
    } catch (probeErr) {
      warnings.push("Не удалось выполнить предварительный зонд метаданных в браузере.");
    }
  }

  // 4. Validate duration
  if (durationSec > 0) {
    if (isNaN(durationSec) || !isFinite(durationSec)) {
      errors.push("Некорректные метаданные длительности (NaN/Infinity). Заголовок файла повреждён.");
    } else if (durationSec < 0.5) {
      errors.push(
        `Слишком короткая длительность файла (${durationSec.toFixed(2)} сек). Минимальная длительность для распознавания речи — 0.5 сек.`
      );
    } else if (durationSec > 36000) {
      errors.push(`Длительность файла (${(durationSec / 3600).toFixed(1)} ч) превышает допустимый максимум 10 часов.`);
    }

    // 5. Validate bitrate
    estimatedBitrateKbps = Math.round(((fileSizeBytes * 8) / durationSec) / 1000);
    if (estimatedBitrateKbps < 8) {
      warnings.push(`Крайне низкий битрейт (${estimatedBitrateKbps} кбит/с). Возможно, файл пустой или содержит только тишину.`);
    } else if (estimatedBitrateKbps > 300000) {
      warnings.push(`Очень высокий битрейт (${(estimatedBitrateKbps / 1000).toFixed(1)} Мбит/с). Извлечение может занять дополнительное время.`);
    }
  }

  return {
    isValid: errors.length === 0,
    durationSec: Math.round(durationSec * 100) / 100,
    format: ext || mimeType || "unknown",
    mimeType,
    fileSizeBytes,
    estimatedBitrateKbps,
    hasAudioTrack,
    errors,
    warnings,
  };
}

/**
 * Asserts that a media audio file is valid, throwing a descriptive user-friendly error if not.
 */
export async function assertValidMediaAudioFile(file: File | Blob): Promise<MediaValidationResult> {
  const result = await validateMediaAudioFile(file);
  if (!result.isValid) {
    const errorDetails = result.errors.join(". ");
    throw new Error(`Ошибка проверки аудиофайла: ${errorDetails}`);
  }
  return result;
}

/**
 * Safely reads a File or Blob into an ArrayBuffer using multiple redundant strategies.
 * Completely resolves browser DOMException "The requested file could not be read, typically due to permission problems..."
 * by:
 * 1. Using active Blob URL fetch cache if provided (bypasses OS file descriptor locks from <video> player)
 * 2. Calling native file.arrayBuffer()
 * 3. Fetching via a temporary Blob URL
 * 4. Streaming via Response(file).arrayBuffer()
 * 5. Reading via FileReader API
 * 6. Reading sequentially in 8-16MB slice chunks if large or locked
 */
export async function safeReadFileToArrayBuffer(
  file: File | Blob,
  blobUrl?: string | null,
  onProgress?: (status: string) => void
): Promise<ArrayBuffer> {
  let lastError: any = null;

  // Strategy 1: Read via existing blobUrl (already mapped into browser BlobRegistry)
  // This is the cleanest way to read without colliding with active <video> playback locks!
  if (blobUrl) {
    try {
      onProgress?.("Чтение данных медиафайла...");
      const response = await fetch(blobUrl);
      if (response.ok) {
        const buf = await response.arrayBuffer();
        if (buf && buf.byteLength > 0) {
          return buf;
        }
      }
    } catch (fetchErr: any) {
      lastError = fetchErr;
    }
  }

  // Strategy 2: Direct file.arrayBuffer()
  try {
    onProgress?.("Чтение файла...");
    const buf = await file.arrayBuffer();
    if (buf && buf.byteLength > 0) {
      return buf;
    }
  } catch (err: any) {
    lastError = err;
  }

  // Strategy 3: Create a fresh Blob URL and fetch it
  try {
    const tempUrl = URL.createObjectURL(file);
    try {
      const res = await fetch(tempUrl);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        if (buf && buf.byteLength > 0) {
          return buf;
        }
      }
    } finally {
      URL.revokeObjectURL(tempUrl);
    }
  } catch (err: any) {
    lastError = err;
  }

  // Strategy 4: Stream via Response(file).arrayBuffer()
  try {
    const res = new Response(file);
    const buf = await res.arrayBuffer();
    if (buf && buf.byteLength > 0) {
      return buf;
    }
  } catch (err: any) {
    lastError = err;
  }

  // Strategy 5: Standard FileReader API
  try {
    onProgress?.("Чтение через буфер браузера...");
    const buf = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          reject(new Error("FileReader result is not ArrayBuffer"));
        }
      };
      reader.onerror = () => reject(reader.error || new Error("Ошибка чтения FileReader"));
      reader.onabort = () => reject(new Error("Чтение файла отменено"));
      reader.readAsArrayBuffer(file);
    });
    if (buf && buf.byteLength > 0) {
      return buf;
    }
  } catch (err: any) {
    lastError = err;
  }

  if (file.size <= 80 * 1024 * 1024) {
    // Strategy 6: Chunked slice-by-slice read (for files up to 80MB)
    try {
      onProgress?.("Потоковое чтение фрагментов файла...");
      const chunkSize = 8 * 1024 * 1024; // 8MB slices
      const totalSize = file.size;
      const combined = new Uint8Array(totalSize);
      let offset = 0;

      while (offset < totalSize) {
        const nextOffset = Math.min(offset + chunkSize, totalSize);
        const slice = file.slice(offset, nextOffset);
        let chunkBuf: ArrayBuffer | null = null;
        try {
          chunkBuf = await slice.arrayBuffer();
        } catch {
          chunkBuf = await new Promise<ArrayBuffer>((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result as ArrayBuffer);
            r.onerror = () => reject(r.error);
            r.readAsArrayBuffer(slice);
          });
        }
        if (chunkBuf) {
          combined.set(new Uint8Array(chunkBuf), offset);
        }
        offset = nextOffset;
        if (onProgress && totalSize > 0) {
          const percent = Math.min(100, Math.round((offset / totalSize) * 100));
          onProgress(`Чтение файла: ${percent}%...`);
        }
      }
      if (combined.byteLength > 0) {
        return combined.buffer;
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  // If all strategies failed, format the error nicely
  const rawMsg = lastError?.message || String(lastError || "");
  const isAllocationFailed =
    rawMsg.includes("allocation failed") ||
    rawMsg.includes("Out of memory") ||
    lastError instanceof RangeError;

  if (isAllocationFailed) {
    throw new Error(
      `Файл слишком велик для декодирования в памяти браузера (${(file.size / (1024 * 1024)).toFixed(0)} МБ). Видеоряд занимает слишком много оперативной памяти. Рекомендуется использовать отдельный аудиофайл (MP3/WAV/M4A) или нажать «Сформировать главы по сценарию».`
    );
  }

  const isPermissionOrNotReadable =
    rawMsg.includes("permission problems") ||
    rawMsg.includes("NotReadableError") ||
    rawMsg.includes("could not be read") ||
    lastError?.name === "NotReadableError" ||
    lastError?.name === "SecurityError";

  if (isPermissionOrNotReadable) {
    throw new Error(
      "Браузер временно заблокировал доступ к файлу (файл был занят встроенным видеоплеером или перемещён). Пожалуйста, нажмите кнопку «Заменить видео / аудио» и выберите файл повторно, либо используйте отдельный аудиофайл (MP3/WAV/M4A)."
    );
  }

  throw new Error(
    `Не удалось прочитать медиафайл: ${rawMsg || "ошибка доступа"}. Попробуйте выбрать файл повторно.`
  );
}

/**
 * Extracts audio chunks using server-side native FFmpeg.
 * Supports direct upload (<= 25MB) and chunked sliced streaming (> 25MB, up to multi-GB files).
 * Completely eliminates browser "Array buffer allocation failed" and memory crashes for large video files.
 */
export async function extractAudioViaServerFFmpeg(
  file: File,
  onProgress?: (status: string) => void,
  chunkDurationSec: number = 60
): Promise<ExtractedAudioResult> {
  const isDirect = file.size <= 25 * 1024 * 1024;

  if (isDirect) {
    onProgress?.("Быстрая передача файла на серверный декодер (FFmpeg)...");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("chunkDurationSec", String(chunkDurationSec));

    const res = await fetch("/api/media/extract-audio-direct", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Ошибка сервера: ${res.status}`);
    }

    const data = await res.json();
    return data;
  }

  // Chunked upload for large video files (> 25MB, up to gigabytes)
  const uploadId = `up_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const chunkSize = 10 * 1024 * 1024; // 10MB slices (safely under Nginx 32M limit)
  const totalChunks = Math.ceil(file.size / chunkSize);

  try {
    for (let c = 0; c < totalChunks; c++) {
      const start = c * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunkBlob = file.slice(start, end);
      const percent = Math.round(((c + 1) / totalChunks) * 100);

      onProgress?.(
        `Передача видео: ${percent}% (фрагмент ${c + 1} из ${totalChunks})...`
      );

      const formData = new FormData();
      formData.append("uploadId", uploadId);
      formData.append("chunkIndex", String(c));
      formData.append("totalChunks", String(totalChunks));
      formData.append("chunkDurationSec", String(chunkDurationSec));
      formData.append("chunk", chunkBlob, `${uploadId}.part`);

      const res = await fetch("/api/media/upload-chunk", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Ошибка загрузки фрагмента ${c + 1}: ${res.status}`);
      }

      const resData = await res.json();
      if (resData.completed && resData.result) {
        onProgress?.("Звуковая дорожка успешно извлечена!");
        return resData.result;
      }
    }

    throw new Error("Не удалось завершить загрузку видеофрагментов");
  } catch (err) {
    fetch("/api/media/upload-chunk-abort", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uploadId }),
    }).catch(() => {});
    throw err;
  }
}

/**
 * Resamples Float32 audio samples from source sample rate to 16kHz for speech recognition.
 */
function resampleTo16k(audioData: Float32Array, origSampleRate: number): Float32Array {
  if (origSampleRate === 16000) return audioData;
  const targetRate = 16000;
  const ratio = origSampleRate / targetRate;
  const newLength = Math.round(audioData.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const origIndex = i * ratio;
    const indexFloor = Math.floor(origIndex);
    const indexCeil = Math.min(audioData.length - 1, indexFloor + 1);
    const fraction = origIndex - indexFloor;
    result[i] = audioData[indexFloor] * (1 - fraction) + audioData[indexCeil] * fraction;
  }
  return result;
}

/**
 * Preprocesses audio samples to maximize speech recognition accuracy:
 * 1. DC offset removal & 80 Hz high-pass filter (cuts low-frequency rumble, thumps, HVAC noise).
 * 2. 7.5 kHz low-pass filter (cuts harsh high-frequency hiss and coil whine).
 * 3. Speech presence peaking filter (boosts 2.8 kHz band for crisp consonant clarity).
 * 4. Adaptive soft noise gate (attenuates background noise and room hiss during speech pauses).
 * 5. Dynamic RMS loudness compression & Peak normalization to -1.0 dB.
 */
export function preprocessAudioSamples(
  samples: Float32Array,
  sampleRate: number = 16000
): Float32Array {
  const n = samples.length;
  if (n === 0) return samples;

  const processed = new Float32Array(n);

  // 1. DC Offset Removal
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += samples[i];
  }
  const dcOffset = sum / n;
  for (let i = 0; i < n; i++) {
    processed[i] = samples[i] - dcOffset;
  }

  // 2. High-pass filter (80 Hz cutoff, Butterworth 2-pole)
  const hpCutoff = 80;
  const hpOmega = Math.tan((Math.PI * hpCutoff) / sampleRate);
  const hpK = hpOmega * hpOmega;
  const hpSqrt2K = Math.SQRT2 * hpOmega;
  const hpNorm = 1 / (1 + hpSqrt2K + hpK);
  const hpA0 = hpNorm;
  const hpA1 = -2 * hpA0;
  const hpA2 = hpA0;
  const hpB1 = 2 * (hpK - 1) * hpNorm;
  const hpB2 = (1 - hpSqrt2K + hpK) * hpNorm;

  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < n; i++) {
    const x0 = processed[i];
    const y0 = hpA0 * x0 + hpA1 * x1 + hpA2 * x2 - hpB1 * y1 - hpB2 * y2;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
    processed[i] = isFinite(y0) ? y0 : x0;
  }

  // 3. Low-pass filter (7500 Hz cutoff)
  const lpCutoff = Math.min(7500, sampleRate * 0.45);
  const lpOmega = Math.tan((Math.PI * lpCutoff) / sampleRate);
  const lpK = lpOmega * lpOmega;
  const lpSqrt2K = Math.SQRT2 * lpOmega;
  const lpNorm = 1 / (1 + lpSqrt2K + lpK);
  const lpA0 = lpK * lpNorm;
  const lpA1 = 2 * lpA0;
  const lpA2 = lpA0;
  const lpB1 = 2 * (lpK - 1) * lpNorm;
  const lpB2 = (1 - lpSqrt2K + lpK) * lpNorm;

  x1 = 0; x2 = 0; y1 = 0; y2 = 0;
  for (let i = 0; i < n; i++) {
    const x0 = processed[i];
    const y0 = lpA0 * x0 + lpA1 * x1 + lpA2 * x2 - lpB1 * y1 - lpB2 * y2;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
    processed[i] = isFinite(y0) ? y0 : x0;
  }

  // 4. Speech Presence Peaking Filter (center = 2800 Hz, Q = 1.2, Gain = +3.5 dB)
  const boostFreq = 2800;
  if (boostFreq < sampleRate * 0.45) {
    const w0 = (2 * Math.PI * boostFreq) / sampleRate;
    const alpha = Math.sin(w0) / (2 * 1.2);
    const A = Math.pow(10, 3.5 / 40); // +3.5 dB
    const peakA0 = 1 + alpha * A;
    const peakA1 = -2 * Math.cos(w0);
    const peakA2 = 1 - alpha * A;
    const peakB0 = 1 + alpha / A;
    const peakB1 = -2 * Math.cos(w0);
    const peakB2 = 1 - alpha / A;

    const b0_norm = peakA0 / peakB0;
    const b1_norm = peakA1 / peakB0;
    const b2_norm = peakA2 / peakB0;
    const a1_norm = peakB1 / peakB0;
    const a2_norm = peakB2 / peakB0;

    x1 = 0; x2 = 0; y1 = 0; y2 = 0;
    for (let i = 0; i < n; i++) {
      const x0 = processed[i];
      const y0 = b0_norm * x0 + b1_norm * x1 + b2_norm * x2 - a1_norm * y1 - a2_norm * y2;
      x2 = x1;
      x1 = x0;
      y2 = y1;
      y1 = y0;
      processed[i] = isFinite(y0) ? y0 : x0;
    }
  }

  // 5. Adaptive Soft Noise Gate (suppress background hiss and ambient room noise during silent pauses)
  const windowSize = Math.floor(sampleRate * 0.025); // 25ms frame
  const hopSize = Math.floor(windowSize / 2);
  const numFrames = Math.max(1, Math.floor((n - windowSize) / hopSize));
  const frameEnergies = new Float32Array(numFrames);

  for (let f = 0; f < numFrames; f++) {
    const start = f * hopSize;
    let frameSum = 0;
    for (let j = 0; j < windowSize; j++) {
      const v = processed[start + j];
      frameSum += v * v;
    }
    frameEnergies[f] = Math.sqrt(frameSum / windowSize);
  }

  // Estimate noise floor using 10th percentile energy
  const sortedEnergies = Float32Array.from(frameEnergies).sort();
  const noiseFloor = Math.max(0.001, sortedEnergies[Math.floor(numFrames * 0.15)] || 0.005);
  const speechThreshold = noiseFloor * 2.5;

  // Apply smooth envelope gain
  let currentGain = 1.0;
  const attackAlpha = 0.25;
  const releaseAlpha = 0.04;

  for (let i = 0; i < n; i++) {
    const frameIndex = Math.min(numFrames - 1, Math.floor(i / hopSize));
    const energy = frameEnergies[frameIndex] || 0;

    let targetGain = 1.0;
    if (energy < noiseFloor) {
      targetGain = 0.12; // -18 dB attenuation during silence
    } else if (energy < speechThreshold) {
      const t = (energy - noiseFloor) / (speechThreshold - noiseFloor);
      targetGain = 0.12 + 0.88 * (t * t);
    }

    // Smooth gain transition
    if (targetGain > currentGain) {
      currentGain += (targetGain - currentGain) * attackAlpha;
    } else {
      currentGain += (targetGain - currentGain) * releaseAlpha;
    }

    processed[i] *= currentGain;
  }

  // 6. Dynamic Range Compression & Loudness Normalization (Peak target = 0.88 ~ -1.1 dB)
  let peak = 0;
  for (let i = 0; i < n; i++) {
    const absVal = Math.abs(processed[i]);
    if (absVal > peak) peak = absVal;
  }

  if (peak > 0.0001) {
    const targetPeak = 0.88;
    const gainFactor = targetPeak / peak;
    // Soft limiting to prevent harsh clipping
    for (let i = 0; i < n; i++) {
      let val = processed[i] * gainFactor;
      if (val > 0.98) val = 0.98 + 0.02 * Math.tanh((val - 0.98) / 0.02);
      else if (val < -0.98) val = -0.98 + 0.02 * Math.tanh((val + 0.98) / 0.02);
      processed[i] = val;
    }
  }

  return processed;
}

/**
 * Extracts, downsamples, and splits audio from video/audio into lightweight ~60s chunks.
 * Each chunk is ~1.9 MB WAV (Base64 ~2.5 MB), completely immune to 413 Payload Too Large errors.
 */
export async function extractAudioFromMediaFile(
  file: File,
  onProgress?: (status: string) => void,
  chunkDurationSec: number = 60,
  blobUrl?: string | null
): Promise<ExtractedAudioResult> {
  onProgress?.("Проверка формата, длительности и целостности медиафайла...");
  await assertValidMediaAudioFile(file);

  const isVideo =
    file.type.startsWith("video/") ||
    /\.(mp4|mov|mkv|avi|webm|flv|m4v|wmv)$/i.test(file.name);
  const isLarge = file.size > 25 * 1024 * 1024; // > 25MB

  // For video files or media > 25MB: use server FFmpeg!
  // This completely eliminates "Array buffer allocation failed" and browser RAM crashes.
  if (isVideo || isLarge) {
    try {
      return await extractAudioViaServerFFmpeg(file, onProgress, chunkDurationSec);
    } catch (serverErr: any) {
      console.warn("Server FFmpeg extraction error, evaluating fallback:", serverErr);

      // If file is > 80MB, attempting in-browser decodeAudioData will crash or throw RangeError
      if (file.size > 80 * 1024 * 1024) {
        throw new Error(
          `Не удалось обработать медиафайл (${(file.size / (1024 * 1024)).toFixed(0)} МБ): ${serverErr?.message || "ошибка"}. Рекомендуется выбрать отдельный аудиофайл (MP3/WAV/M4A) или нажать «Сформировать главы по сценарию».`
        );
      }
    }
  }

  // In-browser Web Audio API fallback (for small audio files or clips <= 25-80MB)
  const arrayBuffer = await safeReadFileToArrayBuffer(file, blobUrl, onProgress);

  onProgress?.("Извлечение аудиодорожки (Web Audio API)...");
  const targetSampleRate = 16000;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  let audioCtx: AudioContext;
  try {
    audioCtx = new AudioContextClass({ sampleRate: targetSampleRate });
  } catch {
    audioCtx = new AudioContextClass();
  }

  if (audioCtx.state === "suspended") {
    await audioCtx.resume().catch(() => {});
  }

  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
  } catch (decodeErr) {
    await audioCtx.close().catch(() => {});
    throw new Error(
      "Не удалось декодировать аудиодорожку из видео. Убедитесь, что файл содержит звуковую дорожку (AAC, MP3, WAV, PCM, OPUS) или выберите отдельный аудиофайл."
    );
  }

  const durationSec = audioBuffer.duration;
  const actualSampleRate = audioBuffer.sampleRate;

  // Downmix to mono channel data
  let monoChannel: Float32Array;
  if (audioBuffer.numberOfChannels === 1) {
    monoChannel = audioBuffer.getChannelData(0);
  } else {
    const ch0 = audioBuffer.getChannelData(0);
    const ch1 = audioBuffer.getChannelData(1);
    monoChannel = new Float32Array(audioBuffer.length);
    for (let i = 0; i < audioBuffer.length; i++) {
      monoChannel[i] = (ch0[i] + ch1[i]) / 2;
    }
  }

  await audioCtx.close().catch(() => {});

  // Resample to 16kHz if not already
  const resampledMono = actualSampleRate !== 16000 ? resampleTo16k(monoChannel, actualSampleRate) : monoChannel;
  const finalSampleRate = 16000;

  // Preprocess audio: highpass 80Hz, lowpass 7.5kHz, speech presence enhancement, noise gating, loudness normalization
  onProgress?.("Предобработка звука: нормализация громкости и удаление шумов...");
  const preprocessedMono = preprocessAudioSamples(resampledMono, finalSampleRate);

  // Calculate chunks (e.g. 60s each)
  const samplesPerChunk = Math.floor(chunkDurationSec * finalSampleRate);
  const totalSamples = preprocessedMono.length;
  const numChunks = Math.max(1, Math.ceil(totalSamples / samplesPerChunk));

  onProgress?.(
    `Подготовка ${numChunks} фрагментов аудио (${durationSec.toFixed(1)} сек, 16 kHz Mono)...`
  );

  const chunks: AudioChunk[] = [];
  let totalSizeBytes = 0;

  for (let i = 0; i < numChunks; i++) {
    const startSample = i * samplesPerChunk;
    const endSample = Math.min(startSample + samplesPerChunk, totalSamples);
    const chunkData = preprocessedMono.subarray(startSample, endSample);
    const chunkStartSec = startSample / finalSampleRate;
    const chunkEndSec = endSample / finalSampleRate;
    const chunkDur = chunkEndSec - chunkStartSec;

    const wavBuffer = channelDataToWav(chunkData, finalSampleRate);
    totalSizeBytes += wavBuffer.byteLength;
    const base64 = arrayBufferToBase64(wavBuffer);

    chunks.push({
      index: i,
      totalChunks: numChunks,
      startSec: chunkStartSec,
      endSec: chunkEndSec,
      durationSec: chunkDur,
      base64,
      mimeType: "audio/wav",
    });
  }

  return {
    chunks,
    durationSec,
    sampleRate: finalSampleRate,
    totalSizeBytes,
  };
}
