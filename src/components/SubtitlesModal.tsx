import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Subtitles,
  Download,
  Copy,
  Sparkles,
  RefreshCw,
  Clock,
  Check,
  Edit2,
  Trash2,
  Plus,
  Loader2,
  Sliders,
  Archive,
  Upload,
  Film,
  Play,
  Pause,
  Video,
  FileText,
  X,
  Volume2,
  Eraser,
} from "lucide-react";
import { BaseModal } from "./common/BaseModal";
import {
  type SubtitleCue,
  generateSubtitlesFromText,
  cleanTextForSubtitles,
  cuesToSrt,
  cuesToSbv,
  cuesToTxt,
  formatTimeSrt,
  formatTimeSbv,
  formatTimeShort,
  exportSubtitlesTxt,
  exportSubtitlesSrt,
  exportSubtitlesSbv,
  exportAllSubtitlesZip,
  parseSrt,
  parseSbv,
  parseSubtitlesAnyFormat,
  readTextFileSmart,
  extractTextFromDocx,
} from "../utils/subtitles";
import {
  generateSubtitlesWithAI,
  transcribeMediaAudioWithExactTimestamps,
  validateMediaAudioFile,
} from "../services/ai/subtitlesService";
import { extractAudioFromMediaFile } from "../utils/audioExtractor";
import { copyToClipboard } from "../utils/helpers";
import { toast } from "sonner";

export interface SubtitlesModalProps {
  isOpen: boolean;
  onClose: () => void;
  scriptText: string;
  title?: string;
  isShorts?: boolean;
  activeModel?: string;
}

export const SubtitlesModal: React.FC<SubtitlesModalProps> = ({
  isOpen,
  onClose,
  scriptText,
  title = "Субтитры",
  isShorts = false,
  activeModel,
}) => {
  const [cues, setCues] = useState<SubtitleCue[]>([]);
  const [activeTab, setActiveTab] = useState<"cues" | "srt" | "sbv" | "txt">("cues");
  const [txtMode, setTxtMode] = useState<"clean" | "timed">("clean");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [wpm, setWpm] = useState<number>(isShorts ? 165 : 145);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [editingCueId, setEditingCueId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");

  // Video / Audio upload & synchronization state
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isAudioOnly, setIsAudioOnly] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcribeProgress, setTranscribeProgress] = useState<string>("");
  const [showVideoPlayer, setShowVideoPlayer] = useState<boolean>(true);
  const [useScriptAsReference, setUseScriptAsReference] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const srtFileInputRef = useRef<HTMLInputElement | null>(null);
  const activeCueScrollRef = useRef<HTMLDivElement | null>(null);

  // Initialize or re-generate when scriptText or isOpen changes
  useEffect(() => {
    if (isOpen && scriptText && cues.length === 0) {
      const defaultWpm = isShorts ? 165 : 145;
      setWpm(defaultWpm);
      const generated = generateSubtitlesFromText(scriptText, {
        wordsPerMinute: defaultWpm,
        maxWordsPerCue: isShorts ? 6 : 8,
        maxCharsPerCue: isShorts ? 36 : 46,
      });
      setCues(generated);
    }
  }, [isOpen, scriptText, isShorts]);

  // Clean up object URL on unmount or file change
  useEffect(() => {
    return () => {
      if (mediaUrl) {
        URL.revokeObjectURL(mediaUrl);
      }
    };
  }, [mediaUrl]);

  // Recalculate with current WPM (heuristic)
  const handleRecalculateWpm = () => {
    if (!scriptText) return;
    const recalculated = generateSubtitlesFromText(scriptText, {
      wordsPerMinute: wpm,
      maxWordsPerCue: isShorts ? 6 : 8,
      maxCharsPerCue: isShorts ? 36 : 46,
    });
    setCues(recalculated);
    toast.info(`Субтитры пересчитаны со скоростью ${wpm} сл/мин`);
  };

  // Generate with Gemini AI (text-based)
  const handleGenerateAI = async () => {
    if (!scriptText) {
      toast.error("Текст сценария пуст");
      return;
    }
    setIsAiLoading(true);
    try {
      toast.loading("ИИ синхронизирует субтитры...", { id: "subtitles-ai" });
      const aiCues = await generateSubtitlesWithAI(scriptText, {
        model: activeModel,
        isShorts,
        speechRateWpm: wpm,
      });
      setCues(aiCues);
      toast.success("Субтитры успешно созданы через ИИ!", { id: "subtitles-ai" });
    } catch (err) {
      toast.error("Не удалось сгенерировать субтитры через ИИ", { id: "subtitles-ai" });
    } finally {
      setIsAiLoading(false);
    }
  };

  // Import existing subtitle or script text file (.srt, .vtt, .sbv, .txt, .docx)
  const importSubtitleOrTextFile = async (file: File) => {
    try {
      let text = "";
      if (/\.docx$/i.test(file.name)) {
        const buffer = await file.arrayBuffer();
        text = await extractTextFromDocx(buffer);
      } else {
        text = await readTextFileSmart(file);
      }

      if (!text || !text.trim()) {
        toast.error("Выбранный файл пуст");
        return;
      }

      const importedCues = parseSubtitlesAnyFormat(text, {
        fallbackToTextGeneration: true,
        isShorts,
        wordsPerMinute: wpm,
      });

      if (importedCues && importedCues.length > 0) {
        setCues(importedCues);
        toast.success(`Импортировано ${importedCues.length} субтитров из "${file.name}"!`);
      } else {
        toast.error("Не удалось извлечь субтитры или текст из файла");
      }
    } catch (err: any) {
      toast.error(err?.message || "Ошибка при чтении файла субтитров");
    }
  };

  // Handle media file upload (video or audio)
  const handleMediaUpload = async (file: File) => {
    if (!file) return;

    const isVideo = file.type.startsWith("video/") || /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(file.name);
    const isAudio = file.type.startsWith("audio/") || /\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(file.name);
    const isSubOrText = /\.(srt|vtt|sbv|txt|docx|doc)$/i.test(file.name);

    if (isSubOrText && !isVideo && !isAudio) {
      toast.info(`Файл "${file.name}" определен как файл субтитров/текста. Выполняется импорт...`);
      importSubtitleOrTextFile(file);
      return;
    }

    // Run validator on audio/video file
    const validation = await validateMediaAudioFile(file);
    if (!validation.isValid) {
      toast.error(`Ошибка файла: ${validation.errors.join(". ")}`);
      return;
    }

    if (validation.warnings.length > 0) {
      toast.warning(validation.warnings[0]);
    }

    if (mediaUrl) {
      URL.revokeObjectURL(mediaUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setMediaFile(file);
    setMediaUrl(objectUrl);
    setIsAudioOnly(!isVideo && isAudio);
    setShowVideoPlayer(true);
    setCurrentTime(0);

    const durText = validation.durationSec > 0 ? ` (${(validation.durationSec / 60).toFixed(1)} мин)` : "";
    const bitrateText = validation.estimatedBitrateKbps ? `, ~${validation.estimatedBitrateKbps} кбит/с` : "";
    toast.success(`Файл "${file.name}"${durText}${bitrateText} успешно проверен и загружен!`);
  };

  // Transcribe and extract exact acoustic timestamps from video
  const handleTranscribeFromVideo = async () => {
    if (!mediaFile) {
      toast.error("Сначала загрузите видео или аудио файл");
      return;
    }

    setIsTranscribing(true);
    setTranscribeProgress("Извлечение аудиодорожки из видео...");
    const toastId = toast.loading("Извлечение звуковой дорожки из видео...", { id: "video-transcribe" });

    // Pause video to release any browser media file locks
    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch (e) {}
    }

    try {
      // Step 1: Extract and downsample audio in browser to lightweight 16kHz mono WAV chunks (75s chunks for better speech continuity)
      const { chunks, durationSec } = await extractAudioFromMediaFile(
        mediaFile,
        (status) => {
          setTranscribeProgress(status);
          toast.loading(status, { id: "video-transcribe" });
        },
        75,
        mediaUrl
      );

      // Step 2: Send audio to Gemini for precise acoustic speech-to-subtitles alignment chunk-by-chunk
      const realCues = await transcribeMediaAudioWithExactTimestamps(chunks, "audio/wav", {
        isShorts,
        model: activeModel || "gemini-3.5-flash-lite",
        referenceScript: useScriptAsReference && scriptText?.trim() ? scriptText.trim() : undefined,
        onProgress: (progressMsg) => {
          setTranscribeProgress(progressMsg);
          toast.loading(progressMsg, { id: "video-transcribe" });
        },
      });

      if (realCues && realCues.length > 0) {
        setCues(realCues);
        toast.success(
          `Готово! Расставлено ${realCues.length} реплик по реальному звуку видео (${(durationSec / 60).toFixed(1)} мин). Все заставки и паузы учтены!`,
          { id: "video-transcribe", duration: 5000 }
        );
      } else {
        throw new Error("Не удалось получить реплики из аудио");
      }
    } catch (err: any) {
      toast.error(
        err?.message || "Ошибка при анализе видео. Проверьте звуковую дорожку.",
        { id: "video-transcribe" }
      );
    } finally {
      setIsTranscribing(false);
      setTranscribeProgress("");
    }
  };

  // Video time update listener
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Seek video to specific timestamp
  const handleSeekTo = (timeSec: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, timeSec);
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      }
    }
  };

  // Set current video playback time as Start or End for a cue
  const handleSetTimeToCue = (cueId: number, field: "start" | "end") => {
    if (!videoRef.current) return;
    const roundedTime = Math.round(videoRef.current.currentTime * 100) / 100;
    setCues((prev) =>
      prev.map((cue) => {
        if (cue.id !== cueId) return cue;
        if (field === "start") {
          return { ...cue, startTime: roundedTime, endTime: Math.max(roundedTime + 0.5, cue.endTime) };
        } else {
          return { ...cue, endTime: Math.max(cue.startTime + 0.5, roundedTime) };
        }
      })
    );
    toast.info(`Время ${field === "start" ? "начала" : "конца"} реплики #${cueId} установлено на ${formatTimeShort(roundedTime)}`);
  };

  // Determine which cue is currently active based on playback time
  const currentActiveCue = useMemo(() => {
    if (!cues || cues.length === 0) return null;
    return cues.find((c) => currentTime >= c.startTime && currentTime <= c.endTime) || null;
  }, [cues, currentTime]);

  // Content string representation
  const srtContent = useMemo(() => cuesToSrt(cues), [cues]);
  const sbvContent = useMemo(() => cuesToSbv(cues), [cues]);
  const txtContent = useMemo(() => cuesToTxt(cues, txtMode), [cues, txtMode]);

  // Stats
  const totalDurationSec = cues.length > 0 ? cues[cues.length - 1].endTime : 0;
  const totalWords = useMemo(() => {
    return cues.reduce((acc, c) => acc + c.text.split(/\s+/).filter(Boolean).length, 0);
  }, [cues]);

  const sanitizedFilename = useMemo(() => {
    const base = title ? title.replace(/[\\/:*?"<>|]/g, "_").trim() : "subtitles";
    return isShorts ? `Shorts_${base}` : `Subtitles_${base}`;
  }, [title, isShorts]);

  // Copy helper
  const handleCopy = async (format: "srt" | "sbv" | "txt" | "cues") => {
    let content = "";
    if (format === "srt") content = srtContent;
    else if (format === "sbv") content = sbvContent;
    else if (format === "txt") content = txtContent;
    else content = srtContent;

    const ok = await copyToClipboard(content);
    if (ok) {
      setCopiedFormat(format);
      setTimeout(() => setCopiedFormat(null), 2000);
      toast.success(`Субтитры скопированы (${format.toUpperCase()})`);
    } else {
      toast.error("Не удалось скопировать в буфер");
    }
  };

  // Clean all cues text from intonations, pauses, and stage directions
  const handleCleanAllCues = () => {
    if (!cues || cues.length === 0) return;
    let modifiedCount = 0;
    const cleanedCues = cues
      .map((c) => {
        const cleaned = cleanTextForSubtitles(c.text);
        if (cleaned !== c.text) modifiedCount++;
        return {
          ...c,
          text: cleaned,
        };
      })
      .filter((c) => c.text.trim().length > 0);

    setCues(cleanedCues);
    if (modifiedCount > 0) {
      toast.success(`Субтитры очищены от интонаций и ремарок (обновлено ${modifiedCount} реплик)`);
    } else {
      toast.info("Текст субтитров уже чистый, ремарки и интонации не найдены");
    }
  };

  // Cue editing
  const handleStartEdit = (cue: SubtitleCue) => {
    setEditingCueId(cue.id);
    setEditingText(cue.text);
  };

  const handleSaveEdit = (cueId: number) => {
    setCues((prev) =>
      prev.map((c) => (c.id === cueId ? { ...c, text: editingText.trim() || c.text } : c))
    );
    setEditingCueId(null);
  };

  const handleDeleteCue = (cueId: number) => {
    setCues((prev) => prev.filter((c) => c.id !== cueId));
    toast.info("Реплика субтитра удалена");
  };

  const handleAddCue = () => {
    const last = cues[cues.length - 1];
    const newStart = videoRef.current
      ? Math.round(videoRef.current.currentTime * 100) / 100
      : last
      ? last.endTime + 0.2
      : 0;
    const newEnd = Math.round((newStart + 2.5) * 100) / 100;
    const newCue: SubtitleCue = {
      id: cues.length + 1,
      startTime: newStart,
      endTime: newEnd,
      text: "Новая строка субтитра...",
    };
    setCues((prev) => [...prev, newCue]);
    setEditingCueId(newCue.id);
    setEditingText(newCue.text);
  };

  // Import existing subtitle or script text file (.srt, .vtt, .sbv, .txt, .docx)
  const handleImportSubtitleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    importSubtitleOrTextFile(file);
    e.target.value = "";
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex flex-wrap items-center gap-2">
          <span>Субтитры</span>
          <span className="text-xs font-normal text-neutral-400 truncate max-w-[200px] sm:max-w-xs">
            — {title}
          </span>
          <span
            className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
              isShorts
                ? "bg-accent/20 text-accent border border-accent/30"
                : "bg-primary/20 text-primary border border-primary/30"
            }`}
          >
            {isShorts ? "YouTube Shorts" : "Long-Form"}
          </span>
        </div>
      }
      subtitle="Генерация, синхронизация по реальному видео и экспорт в форматах TXT, SRT (SubRip) и SBV (YouTube)"
      icon={Subtitles}
      maxWidth="5xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 w-full border-t border-neutral-800 pt-3">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span>
              Реплик: <strong className="text-neutral-200">{cues.length}</strong>
            </span>
            <span>·</span>
            <span>
              Хронометраж: <strong className="text-neutral-200">{formatTimeShort(totalDurationSec)}</strong>
            </span>
            <span>·</span>
            <span>
              Слов: <strong className="text-neutral-200">{totalWords}</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => exportSubtitlesTxt(txtContent, sanitizedFilename)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-bold border border-neutral-700 transition-colors cursor-pointer"
              title="Скачать субтитры в формате TXT (транскрипт речи)"
            >
              <Download size={13} className="text-neutral-400" />
              <span>TXT</span>
            </button>

            <button
              onClick={() => exportSubtitlesSrt(srtContent, sanitizedFilename)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-bold border border-neutral-700 transition-colors cursor-pointer"
              title="Скачать субтитры в формате SRT (SubRip) для Premiere, CapCut, DaVinci"
            >
              <Download size={13} className="text-primary" />
              <span>SRT</span>
            </button>

            <button
              onClick={() => exportSubtitlesSbv(sbvContent, sanitizedFilename)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-bold border border-neutral-700 transition-colors cursor-pointer"
              title="Скачать субтитры в формате SBV (YouTube SubViewer) для YouTube Studio"
            >
              <Download size={13} className="text-accent" />
              <span>SBV</span>
            </button>

            <button
              onClick={() => exportAllSubtitlesZip(cues, sanitizedFilename)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-500/90 text-black font-bold rounded-lg text-xs transition-all cursor-pointer shadow-sm"
              title="Скачать все форматы (SRT, SBV, TXT) в ZIP архиве"
            >
              <Archive size={13} />
              <span>Все в ZIP</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-neutral-200">
        {/* Hidden inputs for media upload & file import */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => e.target.files?.[0] && handleMediaUpload(e.target.files[0])}
          accept="video/*,audio/*,.mp4,.mov,.webm,.mkv,.mp3,.wav,.m4a,.srt,.vtt,.sbv,.txt,.docx"
          className="hidden"
        />
        <input
          type="file"
          ref={srtFileInputRef}
          onChange={handleImportSubtitleFile}
          accept=".srt,.vtt,.sbv,.txt,.sub,.docx"
          className="hidden"
        />

        {/* Top Control Center: Video Upload & AI Sync */}
        <div className="bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 border border-neutral-800 p-4 rounded-xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Left: Media load info / button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
                title="Загрузить готовое видео (MP4, MOV, WEBM) или аудио для точной расстановки субтитров с учетом заставок и пауз"
              >
                <Film size={15} className="text-accent" />
                <span>{mediaFile ? "Заменить видео" : "Загрузить видео / аудио"}</span>
              </button>

              {mediaFile && (
                <div className="flex items-center gap-2 text-xs bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-lg text-neutral-300">
                  <span className="max-w-[150px] sm:max-w-[220px] truncate font-medium text-white">
                    {mediaFile.name}
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    ({(mediaFile.size / (1024 * 1024)).toFixed(1)} MB)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (mediaUrl) URL.revokeObjectURL(mediaUrl);
                      setMediaFile(null);
                      setMediaUrl(null);
                    }}
                    className="p-1 hover:text-red-400 text-neutral-400 rounded cursor-pointer transition-colors"
                    title="Удалить файл"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* Right: AI Actions */}
            <div className="flex items-center gap-2">
              {/* Import Subtitles button */}
              <button
                type="button"
                onClick={() => srtFileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                title="Импортировать файл субтитров или текст сценария (.srt, .vtt, .sbv, .txt)"
              >
                <Upload size={13} />
                <span>Импорт файла (.srt, .txt, .docx)</span>
              </button>

              {/* Real Video AI Sync */}
              {mediaFile ? (
                <button
                  type="button"
                  onClick={handleTranscribeFromVideo}
                  disabled={isTranscribing}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black rounded-lg text-xs font-black shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                  title="Нейросеть прослушает реальную дорожку видео и расставит точнейшие тайминги с учетом заставок, пауз и музыки"
                >
                  {isTranscribing ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Анализ звука видео...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>Расставить субтитры по видео (ИИ)</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={isAiLoading}
                  className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-accent/20 to-amber-500/20 hover:from-accent/30 hover:to-amber-500/30 text-accent border border-accent/30 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                  title="Сгенерировать тайминги по тексту сценария через ИИ"
                >
                  {isAiLoading ? (
                    <Loader2 size={14} className="animate-spin text-accent" />
                  ) : (
                    <Sparkles size={14} className="text-accent" />
                  )}
                  <span>ИИ-Синхронизация по сценарию</span>
                </button>
              )}
            </div>
          </div>

          {/* Reference script toggle for audio transcription */}
          {mediaFile && scriptText && (
            <div className="flex items-center gap-2 pt-2 border-t border-neutral-800/60 text-xs text-neutral-400">
              <label className="flex items-center gap-2 cursor-pointer select-none hover:text-neutral-300 transition-colors">
                <input
                  type="checkbox"
                  checked={useScriptAsReference}
                  onChange={(e) => setUseScriptAsReference(e.target.checked)}
                  className="rounded border-neutral-700 bg-neutral-800 text-amber-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span>Использовать открытый сценарий как подсказку терминов (только если видео в точности повторяет текст сценария)</span>
              </label>
            </div>
          )}

          {/* Progress / Status banner if processing audio */}
          {isTranscribing && (
            <div className="flex items-center gap-3 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300">
              <Loader2 size={15} className="animate-spin shrink-0 text-amber-400" />
              <span>{transcribeProgress || "Синхронизация с реальным звуковым рядом видео..."}</span>
            </div>
          )}

          {/* Speed & heuristic controls if no video */}
          {!mediaFile && (
            <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-neutral-800/80 text-xs">
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-neutral-400 shrink-0" />
                <span className="text-neutral-400">Темп речи:</span>
                <input
                  type="range"
                  min="110"
                  max="200"
                  step="5"
                  value={wpm}
                  onChange={(e) => setWpm(Number(e.target.value))}
                  className="w-24 sm:w-28 accent-primary h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                />
                <span className="font-mono font-bold text-neutral-200 min-w-[54px]">{wpm} сл/м</span>
              </div>
              <button
                type="button"
                onClick={handleRecalculateWpm}
                className="p-1 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 rounded transition-colors cursor-pointer"
                title="Пересчитать тайминги с выбранным темпом"
              >
                <RefreshCw size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Video Player & Real-time Live Subtitle Overlay */}
        {mediaUrl && showVideoPlayer && (
          <div className="relative bg-black rounded-xl border border-neutral-800 overflow-hidden shadow-2xl">
            <div className="relative aspect-video max-h-72 w-full flex items-center justify-center bg-neutral-950">
              <video
                ref={videoRef}
                src={mediaUrl}
                onTimeUpdate={handleTimeUpdate}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                controls
                className="w-full h-full object-contain"
              />

              {/* Real-time Subtitle Overlay (Live Preview on Video) */}
              {currentActiveCue && (
                <div className="absolute bottom-12 inset-x-4 flex justify-center pointer-events-none z-10">
                  <div className="bg-black/85 backdrop-blur-sm text-yellow-300 text-sm sm:text-base md:text-lg font-black px-4 py-1.5 rounded-lg border border-yellow-400/30 text-center max-w-[85%] shadow-2xl tracking-wide uppercase leading-tight animate-fade-in">
                    {currentActiveCue.text}
                  </div>
                </div>
              )}
            </div>

            {/* Video Player Status & Quick Cue Sync Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-neutral-900 border-t border-neutral-800 text-xs">
              <div className="flex items-center gap-2 text-neutral-300">
                <span className="font-mono font-bold text-primary">
                  {formatTimeShort(currentTime)}
                </span>
                <span>/</span>
                <span className="font-mono text-neutral-500">
                  {formatTimeShort(videoRef.current?.duration || totalDurationSec)}
                </span>
                {currentActiveCue && (
                  <span className="text-[11px] bg-neutral-800 px-2 py-0.5 rounded text-neutral-400 truncate max-w-[200px]">
                    Реплика #{currentActiveCue.id}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddCue}
                  className="flex items-center gap-1 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[11px] font-bold transition-colors cursor-pointer"
                  title="Добавить новую строку субтитра на текущей секунде видео"
                >
                  <Plus size={12} />
                  <span>Добавить реплику на {formatTimeShort(currentTime)}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View / Format Tabs & Copy Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab("cues")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === "cues"
                  ? "bg-neutral-800 text-white border border-neutral-700"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"
              }`}
            >
              Редактор реплик ({cues.length})
            </button>
            <button
              onClick={() => setActiveTab("srt")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === "srt"
                  ? "bg-neutral-800 text-primary border border-neutral-700"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"
              }`}
            >
              .SRT (SubRip)
            </button>
            <button
              onClick={() => setActiveTab("sbv")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === "sbv"
                  ? "bg-neutral-800 text-accent border border-neutral-700"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"
              }`}
            >
              .SBV (YouTube)
            </button>
            <button
              onClick={() => setActiveTab("txt")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === "txt"
                  ? "bg-neutral-800 text-white border border-neutral-700"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"
              }`}
            >
              .TXT
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === "txt" && (
              <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5 text-[11px]">
                <button
                  onClick={() => setTxtMode("clean")}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                    txtMode === "clean" ? "bg-neutral-800 text-white font-bold" : "text-neutral-400"
                  }`}
                >
                  Чистый текст
                </button>
                <button
                  onClick={() => setTxtMode("timed")}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                    txtMode === "timed" ? "bg-neutral-800 text-white font-bold" : "text-neutral-400"
                  }`}
                >
                  С таймингом
                </button>
              </div>
            )}

            <button
              onClick={handleCleanAllCues}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-amber-300 hover:text-amber-200 rounded-lg text-xs font-bold border border-neutral-800 transition-colors cursor-pointer"
              title="Удалить из субтитров все интонации, паузы, эмоции и режиссерские ремарки"
            >
              <Eraser size={13} className="text-amber-400" />
              <span className="hidden sm:inline">Очистить от ремарок</span>
            </button>

            <button
              onClick={() => handleCopy(activeTab)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-lg text-xs font-bold border border-neutral-800 transition-colors cursor-pointer"
            >
              {copiedFormat === activeTab ? (
                <>
                  <Check size={13} className="text-emerald-400" />
                  <span className="text-emerald-400">Скопировано!</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Копировать</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "cues" && (
          <div className="space-y-2 max-h-[46vh] overflow-y-auto pr-1">
            {cues.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 text-xs">
                Нет субтитров для отображения. Загрузите готовое видео для автоматической расстановки или нажмите "ИИ-Синхронизация по сценарию".
              </div>
            ) : (
              cues.map((cue) => {
                const isEditing = editingCueId === cue.id;
                const isActiveInPlayer =
                  currentTime >= cue.startTime && currentTime <= cue.endTime;

                return (
                  <div
                    key={`cue-${cue.id}`}
                    className={`flex items-start gap-3 p-3 rounded-xl text-xs transition-all group ${
                      isActiveInPlayer
                        ? "bg-neutral-900/90 border-2 border-primary shadow-md"
                        : "bg-neutral-950/60 border border-neutral-800/80 hover:border-neutral-700"
                    }`}
                  >
                    {/* Cue Number / Play Button */}
                    <button
                      type="button"
                      onClick={() => handleSeekTo(cue.startTime)}
                      className={`w-7 h-7 rounded flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5 transition-colors cursor-pointer ${
                        isActiveInPlayer
                          ? "bg-primary text-black"
                          : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:bg-neutral-800 hover:text-white"
                      }`}
                      title="Нажмите, чтобы воспроизвести видео с этой реплики"
                    >
                      {isActiveInPlayer ? <Play size={11} className="fill-current" /> : cue.id}
                    </button>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-neutral-400">
                        <Clock size={11} className="text-neutral-500" />
                        <span
                          onClick={() => handleSeekTo(cue.startTime)}
                          className="text-primary font-medium cursor-pointer hover:underline"
                          title="Кликните для перехода к началу"
                        >
                          {formatTimeSrt(cue.startTime)}
                        </span>
                        <span>→</span>
                        <span
                          onClick={() => handleSeekTo(cue.endTime)}
                          className="text-primary font-medium cursor-pointer hover:underline"
                          title="Кликните для перехода к концу"
                        >
                          {formatTimeSrt(cue.endTime)}
                        </span>
                        <span className="text-neutral-600">
                          ({(cue.endTime - cue.startTime).toFixed(1)}s)
                        </span>

                        {/* Quick micro-adjust with current video time */}
                        {mediaUrl && (
                          <div className="flex items-center gap-1 ml-auto opacity-75 group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => handleSetTimeToCue(cue.id, "start")}
                              className="px-1.5 py-0.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-primary rounded text-[9px] border border-neutral-800"
                              title="Установить текущее время видео как НАЧАЛО этой реплики"
                            >
                              Старт = {formatTimeShort(currentTime)}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetTimeToCue(cue.id, "end")}
                              className="px-1.5 py-0.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-primary rounded text-[9px] border border-neutral-800"
                              title="Установить текущее время видео как КОНЕЦ этой реплики"
                            >
                              Конец = {formatTimeShort(currentTime)}
                            </button>
                          </div>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="flex items-center gap-2 mt-1">
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            rows={2}
                            className="w-full bg-neutral-900 border border-primary/50 rounded-lg p-2 text-xs text-white focus:outline-none"
                          />
                          <button
                            onClick={() => handleSaveEdit(cue.id)}
                            className="p-1.5 bg-primary text-black rounded-lg hover:bg-primary/90 cursor-pointer"
                          >
                            <Check size={14} />
                          </button>
                        </div>
                      ) : (
                        <p
                          onClick={() => handleStartEdit(cue)}
                          className={`leading-relaxed cursor-pointer transition-colors ${
                            isActiveInPlayer
                              ? "text-white font-medium"
                              : "text-neutral-200 hover:text-white"
                          }`}
                          title="Нажмите, чтобы отредактировать текст"
                        >
                          {cue.text}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => handleSeekTo(cue.startTime)}
                        className="p-1 text-neutral-400 hover:text-primary rounded hover:bg-neutral-800 cursor-pointer"
                        title="Воспроизвести видео с этой реплики"
                      >
                        <Play size={12} />
                      </button>
                      <button
                        onClick={() => handleStartEdit(cue)}
                        className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 cursor-pointer"
                        title="Редактировать текст"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteCue(cue.id)}
                        className="p-1 text-neutral-500 hover:text-red-400 rounded hover:bg-neutral-800 cursor-pointer"
                        title="Удалить"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            <button
              onClick={handleAddCue}
              className="w-full py-2.5 border border-dashed border-neutral-800 hover:border-neutral-700 rounded-xl text-neutral-400 hover:text-neutral-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus size={13} /> Добавить строку субтитров
            </button>
          </div>
        )}

        {activeTab === "srt" && (
          <div className="relative">
            <pre className="w-full p-4 bg-neutral-950 font-mono text-[11px] text-neutral-300 rounded-xl border border-neutral-800 max-h-[46vh] overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
              {srtContent || "Субтитры отсутствуют"}
            </pre>
          </div>
        )}

        {activeTab === "sbv" && (
          <div className="relative">
            <pre className="w-full p-4 bg-neutral-950 font-mono text-[11px] text-amber-300/90 rounded-xl border border-neutral-800 max-h-[46vh] overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
              {sbvContent || "Субтитры отсутствуют"}
            </pre>
          </div>
        )}

        {activeTab === "txt" && (
          <div className="relative">
            <pre className="w-full p-4 bg-neutral-950 font-mono text-[11px] text-neutral-300 rounded-xl border border-neutral-800 max-h-[46vh] overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
              {txtContent || "Транскрипт пуст"}
            </pre>
          </div>
        )}
      </div>
    </BaseModal>
  );
};
