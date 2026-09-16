import React, { useState, useEffect, useRef } from "react";
import {
  Clock,
  Upload,
  Film,
  Sparkles,
  Play,
  Plus,
  Trash2,
  Edit2,
  Check,
  Copy,
  ArrowRight,
  Loader2,
  X,
  Volume2,
  FileText,
  Layers,
  ChevronLeft,
  ChevronRight,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Zap,
} from "lucide-react";
import { BaseModal } from "./common/BaseModal";
import {
  type VideoChapter,
  type ScriptBlockRef,
  generateChaptersFromMediaFile,
  generateEstimatedChaptersFromScript,
  formatChaptersToText,
  formatSecondsToTimeCode,
  parseTimeCodeToSeconds,
} from "../services/ai/videoTimestampsService";
import { copyToClipboard } from "../utils/helpers";
import { toast } from "sonner";

export interface VideoTimestampsModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoTitle?: string;
  niche?: string;
  referenceScript?: string;
  scriptBlocks?: ScriptBlockRef[];
  currentDescription: string;
  onApplyTimestamps: (updatedDescription: string) => void;
  activeModel?: string;
}

export const VideoTimestampsModal: React.FC<VideoTimestampsModalProps> = ({
  isOpen,
  onClose,
  videoTitle = "",
  niche = "",
  referenceScript = "",
  scriptBlocks = [],
  currentDescription,
  onApplyTimestamps,
  activeModel,
}) => {
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isAudioOnly, setIsAudioOnly] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [chapters, setChapters] = useState<VideoChapter[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [progressStatus, setProgressStatus] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingChapterId, setEditingChapterId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>("");
  const [editingTimeCode, setEditingTimeCode] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [alignmentMode, setAlignmentMode] = useState<"script_blocks" | "auto_topics">(
    scriptBlocks && scriptBlocks.length > 0 ? "script_blocks" : "auto_topics"
  );

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync alignment mode when scriptBlocks changes
  useEffect(() => {
    if (scriptBlocks && scriptBlocks.length > 0) {
      setAlignmentMode("script_blocks");
    }
  }, [scriptBlocks?.length]);

  // Clean up object URL
  useEffect(() => {
    return () => {
      if (mediaUrl) {
        URL.revokeObjectURL(mediaUrl);
      }
    };
  }, [mediaUrl]);

  // Handle file select
  const handleFileSelect = (file: File) => {
    if (!file) return;
    const isVideo = file.type.startsWith("video/") || /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(file.name);
    const isAudio = file.type.startsWith("audio/") || /\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(file.name);

    if (!isVideo && !isAudio) {
      toast.error("Пожалуйста, выберите видео (MP4, MOV, WEBM) или аудио (MP3, WAV)");
      return;
    }

    if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    const url = URL.createObjectURL(file);
    setMediaFile(file);
    setMediaUrl(url);
    setIsAudioOnly(!isVideo && isAudio);
    setCurrentTime(0);
    setErrorMessage(null);
    toast.success(`Файл "${file.name}" выбран! Нажмите "Определить таймкоды (ИИ)".`);
  };

  // AI analysis
  const handleAnalyzeMedia = async () => {
    if (!mediaFile) {
      toast.error("Сначала выберите видео или аудио файл");
      return;
    }

    // Pause video player so OS file lock is released
    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {}
    }

    setErrorMessage(null);
    setIsAnalyzing(true);
    setProgressStatus("Подготовка звуковой дорожки...");

    try {
      const result = await generateChaptersFromMediaFile(mediaFile, {
        model: activeModel,
        videoTitle,
        niche,
        referenceScript,
        scriptBlocks: alignmentMode === "script_blocks" ? scriptBlocks : undefined,
        alignmentMode,
        mediaUrl,
        onProgress: (status) => setProgressStatus(status),
      });

      if (result.chapters && result.chapters.length > 0) {
        setChapters(result.chapters);
        setErrorMessage(null);
        toast.success(
          alignmentMode === "script_blocks" && scriptBlocks.length > 0
            ? `Готово! Расставлено ровно ${result.chapters.length} глав по сценарию с учетом переходов видео (+/- 3 сек).`
            : `Готово! Сформировано ${result.chapters.length} глав по реальной речи ролика.`
        );
      } else {
        throw new Error("Не удалось выделить главы из аудиоряда");
      }
    } catch (err: any) {
      const rawMsg = err?.message || String(err || "");
      let friendly = rawMsg;
      if (
        rawMsg.includes("allocation failed") ||
        rawMsg.includes("памяти") ||
        rawMsg.includes("слишком велик")
      ) {
        friendly =
          "Файл слишком велик для обработки в памяти браузера. Вы можете использовать отдельный аудиофайл (MP3/WAV/M4A) или нажать «Сформировать главы по сценарию» без ожидания обработки видео.";
      } else if (
        rawMsg.includes("permission problems") ||
        rawMsg.includes("NotReadableError") ||
        rawMsg.includes("could not be read")
      ) {
        friendly =
          "Браузер временно заблокировал доступ к файлу (файл был занят встроенным видеоплеером или перемещён). Нажмите «Выбрать файл заново» ниже или используйте отдельный аудиофайл (MP3/WAV/M4A).";
      }
      setErrorMessage(friendly);
      toast.error(friendly, { duration: 6000 });
    } finally {
      setIsAnalyzing(false);
      setProgressStatus("");
    }
  };

  // Estimate chapters based on script blocks
  const handleEstimateFromScript = () => {
    if (!scriptBlocks || scriptBlocks.length === 0) {
      toast.error("В сценарии нет смысловых блоков для создания глав");
      return;
    }
    const estChapters = generateEstimatedChaptersFromScript(scriptBlocks, { videoTitle });
    if (estChapters.length > 0) {
      setChapters(estChapters);
      setErrorMessage(null);
      toast.success(`Сформировано ${estChapters.length} глав по структуре сценария!`);
    }
  };

  // Video time update
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleSeekTo = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, seconds);
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      }
    }
  };

  // Nudge chapter timestamp by seconds (e.g. +1s, -1s, +3s for transitions)
  const handleNudgeChapter = (chapterId: number, deltaSec: number) => {
    setChapters((prev) =>
      prev
        .map((c) => {
          if (c.id !== chapterId) return c;
          const newSec = Math.max(0, c.seconds + deltaSec);
          return {
            ...c,
            seconds: newSec,
            timeCode: formatSecondsToTimeCode(newSec),
          };
        })
        .sort((a, b) => a.seconds - b.seconds)
    );
  };

  // Chapter editing
  const handleStartEdit = (chap: VideoChapter) => {
    setEditingChapterId(chap.id);
    setEditingTitle(chap.title);
    setEditingTimeCode(chap.timeCode);
  };

  const handleSaveEdit = (chapterId: number) => {
    const sec = parseTimeCodeToSeconds(editingTimeCode);
    setChapters((prev) =>
      prev
        .map((c) =>
          c.id === chapterId
            ? {
                ...c,
                title: editingTitle.trim() || c.title,
                timeCode: editingTimeCode.trim() || c.timeCode,
                seconds: sec,
              }
            : c
        )
        .sort((a, b) => a.seconds - b.seconds)
    );
    setEditingChapterId(null);
  };

  const handleDeleteChapter = (chapterId: number) => {
    setChapters((prev) => prev.filter((c) => c.id !== chapterId));
  };

  const handleAddChapterAtCurrentTime = () => {
    const sec = videoRef.current ? Math.floor(videoRef.current.currentTime) : 0;
    const timeCode = formatSecondsToTimeCode(sec);
    const newChap: VideoChapter = {
      id: Date.now(),
      timeCode,
      seconds: sec,
      title: "Новая глава темы...",
    };
    setChapters((prev) => [...prev, newChap].sort((a, b) => a.seconds - b.seconds));
    setEditingChapterId(newChap.id);
    setEditingTitle(newChap.title);
    setEditingTimeCode(newChap.timeCode);
  };

  // Copy chapters
  const handleCopyChapters = async () => {
    const text = formatChaptersToText(chapters);
    if (!text) {
      toast.error("Список глав пуст");
      return;
    }
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Таймкоды скопированы в буфер!");
    }
  };

  // Apply to description
  const handleApplyToDescription = () => {
    const formattedChapters = formatChaptersToText(chapters);
    if (!formattedChapters) {
      toast.error("Список таймкодов пуст");
      return;
    }

    let updated = currentDescription.trim();

    // Check if description already has chapters/timestamps section
    const timestampsRegex = /(?:Таймкоды|Тайминги|Главы|Chapters)[\s\S]*?(?=\n\n|$)/i;

    if (/00:00/i.test(updated) || timestampsRegex.test(updated)) {
      // Replace existing timestamps block
      const hasHeader = /Таймкоды|Главы/i.test(updated);
      if (hasHeader) {
        updated = updated.replace(
          /(?:Таймкоды|Тайминги|Главы|Chapters)[^:\n]*:?\s*\n(?:(?:\d{1,2}:\d{2}(?::\d{2})?)\s*[-—–:].*\n?)+/gi,
          `Таймкоды и сцены:\n${formattedChapters}\n`
        );
      } else {
        // Just append cleanly
        updated = `${updated}\n\nТаймкоды и сцены:\n${formattedChapters}`;
      }
    } else {
      // Append new block
      updated = updated
        ? `${updated}\n\nТаймкоды и сцены:\n${formattedChapters}`
        : `Таймкоды и сцены:\n${formattedChapters}`;
    }

    onApplyTimestamps(updated);
    toast.success("Таймкоды успешно добавлены в описание видео!");
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="⏱️ Таймкоды и главы по реальному видео / аудио (ИИ)"
      subtitle="ИИ распознает реальную речь, переходные заставки (~+/- 3 сек) и сопоставляет каждую главу сценария строго с 00:00"
      icon={Clock}
      maxWidth="4xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 w-full border-t border-neutral-800 pt-3">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span>
              Глав: <strong className="text-neutral-200">{chapters.length}</strong>
              {scriptBlocks.length > 0 && (
                <span className="text-neutral-500 ml-1">
                  (в сценарии: {scriptBlocks.length})
                </span>
              )}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopyChapters}
              disabled={chapters.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-bold border border-neutral-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {copied ? (
                <>
                  <Check size={13} className="text-emerald-400" />
                  <span className="text-emerald-400">Скопировано</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Копировать</span>
                </>
              )}
            </button>

            <button
              onClick={handleApplyToDescription}
              disabled={chapters.length === 0}
              className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black rounded-lg text-xs transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              <ArrowRight size={14} />
              <span>Применить в описание видео</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-neutral-200">
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          accept="video/*,audio/*,.mp4,.mov,.webm,.mkv,.mp3,.wav,.m4a"
          className="hidden"
        />

        {/* Top Control Bar: Upload, Mode Selection & Process */}
        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl space-y-3">
          {/* Mode Switcher if script blocks exist */}
          {scriptBlocks && scriptBlocks.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-neutral-800/80">
              <div className="flex items-center gap-2 text-xs">
                <Layers size={14} className="text-amber-400" />
                <span className="text-neutral-300 font-medium">Режим привязки:</span>
              </div>

              <div className="flex items-center gap-1.5 bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setAlignmentMode("script_blocks")}
                  className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                    alignmentMode === "script_blocks"
                      ? "bg-amber-500 text-black shadow-sm"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  🎯 По блокам сценария ({scriptBlocks.length} глав)
                </button>
                <button
                  type="button"
                  onClick={() => setAlignmentMode("auto_topics")}
                  className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                    alignmentMode === "auto_topics"
                      ? "bg-amber-500 text-black shadow-sm"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  ✨ Свободные темы ИИ
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                <Film size={15} className="text-amber-400" />
                <span>{mediaFile ? "Заменить видео / аудио" : "Выбрать видео / аудио файл"}</span>
              </button>

              {mediaFile && (
                <div className="flex items-center gap-2 text-xs bg-neutral-950 border border-neutral-800 px-3 py-1.5 rounded-lg text-neutral-300">
                  <span className="max-w-[180px] truncate font-medium text-white">
                    {mediaFile.name}
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    ({(mediaFile.size / (1024 * 1024)).toFixed(1)} MB)
                  </span>
                  {(mediaFile.type.startsWith("video/") || mediaFile.size > 25 * 1024 * 1024) && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-semibold">
                      FFmpeg
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {scriptBlocks && scriptBlocks.length > 0 && (
                <button
                  type="button"
                  onClick={handleEstimateFromScript}
                  disabled={isAnalyzing}
                  className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                  title="Мгновенно рассчитать таймкоды по хронометражу смысловых блоков сценария"
                >
                  <Zap size={14} className="text-amber-400" />
                  <span>По сценарию ({scriptBlocks.length} глав)</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleAnalyzeMedia}
                disabled={isAnalyzing || !mediaFile}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black rounded-lg text-xs transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
              {isAnalyzing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Поиск переходов и глав...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>
                    {alignmentMode === "script_blocks" && scriptBlocks.length > 0
                      ? `Расставить таймкоды (${scriptBlocks.length} глав)`
                      : "Определить таймкоды (ИИ)"}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

          {isAnalyzing && (
            <div className="flex items-center gap-3 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300">
              <Loader2 size={15} className="animate-spin shrink-0 text-amber-400" />
              <span>{progressStatus || "ИИ прослушивает аудио, сопоставляет переходы и расставляет главы..."}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2.5 text-xs text-rose-300">
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="font-semibold text-rose-200 leading-snug">{errorMessage}</p>
                  <p className="text-[11px] text-rose-300/80">
                    💡 <strong>Совет:</strong> Если видеофайл большого размера (&gt;300 МБ) или удерживается медиаплеером браузера, выберите файл повторно либо загрузите отдельный аудиофайл (MP3, WAV, M4A).
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-rose-500/20">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    fileInputRef.current?.click();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer shadow-sm"
                >
                  <RefreshCw size={13} />
                  <span>Выбрать файл заново</span>
                </button>
                {scriptBlocks && scriptBlocks.length > 0 && (
                  <button
                    type="button"
                    onClick={handleEstimateFromScript}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-lg font-bold text-xs transition-colors cursor-pointer"
                  >
                    <Layers size={13} className="text-amber-400" />
                    <span>Сформировать главы по сценарию ({scriptBlocks.length} глав)</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Video Player Preview if media is loaded */}
        {mediaUrl && (
          <div className="bg-black rounded-xl border border-neutral-800 overflow-hidden">
            <div className="aspect-video max-h-56 w-full flex items-center justify-center bg-neutral-950">
              <video
                ref={videoRef}
                src={mediaUrl}
                onTimeUpdate={handleTimeUpdate}
                controls
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-900 border-t border-neutral-800 text-[11px] text-neutral-400">
              <span>
                Текущая позиция:{" "}
                <strong className="text-amber-400 font-mono">
                  {formatSecondsToTimeCode(currentTime)}
                </strong>
              </span>
              <button
                type="button"
                onClick={handleAddChapterAtCurrentTime}
                className="flex items-center gap-1 px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[10px] font-bold cursor-pointer"
              >
                <Plus size={11} /> Добавить главу на {formatSecondsToTimeCode(currentTime)}
              </button>
            </div>
          </div>
        )}

        {/* Chapters List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <div className="flex items-center gap-2">
              <span className="font-bold uppercase tracking-wider text-[11px]">
                Список глав (YouTube Chapters)
              </span>
              {chapters.length > 0 && (
                <span className="text-[10px] text-neutral-500">
                  (нажмите на таймкод для перехода, или используйте кнопки ±1s для точной подгонки)
                </span>
              )}
            </div>
            <button
              onClick={handleAddChapterAtCurrentTime}
              className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus size={12} /> Добавить главу
            </button>
          </div>

          <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
            {chapters.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 text-xs border border-dashed border-neutral-800 rounded-xl space-y-2">
                <div>Загрузите видео или аудио файл и нажмите кнопку анализа.</div>
                {scriptBlocks && scriptBlocks.length > 0 && (
                  <div className="text-neutral-400 text-[11px]">
                    🎯 В проекте обнаружено <strong>{scriptBlocks.length}</strong> блоков сценария. ИИ сопоставит переходы видео (+/- 3 сек) и выставит точные таймкоды для каждого блока.
                  </div>
                )}
              </div>
            ) : (
              chapters.map((chap, idx) => {
                const isEditing = editingChapterId === chap.id;

                return (
                  <div
                    key={`chap-${chap.id || idx}`}
                    className="flex items-center gap-2.5 p-2 rounded-xl bg-neutral-950/80 border border-neutral-800/80 hover:border-neutral-700 transition-all text-xs group"
                  >
                    {/* Timestamp Clickable Badge */}
                    <button
                      type="button"
                      onClick={() => handleSeekTo(chap.seconds)}
                      className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-mono font-bold rounded-lg border border-amber-500/20 transition-colors shrink-0 cursor-pointer text-xs flex items-center gap-1"
                      title="Кликните, чтобы перейти на этот таймкод в плеере"
                    >
                      <Play size={10} className="fill-amber-400" />
                      {chap.timeCode}
                    </button>

                    {/* Quick Nudge Buttons: -1s / +1s for fine adjustments */}
                    <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleNudgeChapter(chap.id, -1)}
                        className="px-1 py-0.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded text-[9px] font-mono border border-neutral-800 cursor-pointer"
                        title="Сдвинуть на 1 сек назад"
                      >
                        -1s
                      </button>
                      <button
                        type="button"
                        onClick={() => handleNudgeChapter(chap.id, 1)}
                        className="px-1 py-0.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded text-[9px] font-mono border border-neutral-800 cursor-pointer"
                        title="Сдвинуть на 1 сек вперед"
                      >
                        +1s
                      </button>
                    </div>

                    {/* Title or Editor */}
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <input
                          type="text"
                          value={editingTimeCode}
                          onChange={(e) => setEditingTimeCode(e.target.value)}
                          placeholder="00:00"
                          className="w-16 bg-neutral-900 border border-amber-500/50 rounded px-2 py-1 text-xs text-amber-300 font-mono"
                        />
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          placeholder="Название главы"
                          className="flex-1 bg-neutral-900 border border-amber-500/50 rounded px-2 py-1 text-xs text-white"
                        />
                        <button
                          onClick={() => handleSaveEdit(chap.id)}
                          className="p-1.5 bg-amber-500 text-black rounded hover:bg-amber-400 cursor-pointer"
                        >
                          <Check size={13} />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => handleStartEdit(chap)}
                        className="flex-1 min-w-0 font-medium text-neutral-200 hover:text-white cursor-pointer truncate"
                        title="Кликните для редактирования"
                      >
                        <span className="text-neutral-500 mr-1.5 font-mono text-[11px]">{idx + 1}.</span>
                        {chap.title}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => handleSeekTo(chap.seconds)}
                        className="p-1 text-neutral-400 hover:text-amber-400 rounded hover:bg-neutral-800 cursor-pointer"
                        title="Воспроизвести с этой секунды"
                      >
                        <Play size={12} />
                      </button>
                      <button
                        onClick={() => handleStartEdit(chap)}
                        className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 cursor-pointer"
                        title="Редактировать название"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteChapter(chap.id)}
                        className="p-1 text-neutral-500 hover:text-red-400 rounded hover:bg-neutral-800 cursor-pointer"
                        title="Удалить главу"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </BaseModal>
  );
};
