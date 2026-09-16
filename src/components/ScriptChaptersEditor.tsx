import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Clock,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Check,
  Copy,
  ArrowRight,
  Loader2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Upload,
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
  Send,
  Download,
  RotateCcw,
  Sliders,
  Maximize2,
  Film,
  Zap,
  HelpCircle,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import {
  type VideoChapter,
  type ScriptBlockRef,
  formatChaptersToText,
  formatSecondsToTimeCode,
  parseTimeCodeToSeconds,
} from "../services/ai/videoTimestampsService";
import { generateYouTubeChaptersAI } from "../services/ai/seoService";
import {
  generateScriptBlockTimestamps,
  extractScriptBlockRefs,
  copyToClipboard,
} from "../utils/helpers";
import { safeStorage } from "../lib/storage";
import { VideoTimestampsModal } from "./VideoTimestampsModal";
import { ChaptersTutorialModal } from "./ChaptersTutorialModal";

export interface ScriptChaptersEditorProps {
  scriptBlocks: Record<number, any>;
  scriptStructure?: any[];
  scriptTopic?: string;
  selectedIdea?: string | null;
  activeModel?: string;
  onOpenMediaModal?: () => void;
  onNavigateToSEO?: () => void;
}

const STORAGE_KEY = "yt_script_custom_chapters";

export const ScriptChaptersEditor: React.FC<ScriptChaptersEditorProps> = ({
  scriptBlocks = {},
  scriptStructure = [],
  scriptTopic = "",
  selectedIdea = null,
  activeModel,
  onNavigateToSEO,
}) => {
  const { videoSEO, setVideoSEO } = useApp();

  // Chapters list
  const [chapters, setChapters] = useState<VideoChapter[]>(() => {
    try {
      const saved = safeStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });

  // State management
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isEnhancingTitles, setIsEnhancingTitles] = useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [timeShiftAmount, setTimeShiftAmount] = useState<number>(5);
  const [showShiftPopover, setShowShiftPopover] = useState(false);

  // Auto-open tutorial on first visit if not seen
  useEffect(() => {
    try {
      const seen = safeStorage.getItem("yt_chapters_tutorial_seen");
      if (!seen) {
        const timer = setTimeout(() => {
          setIsTutorialOpen(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch (e) {}
  }, []);

  // Save to storage
  useEffect(() => {
    try {
      safeStorage.setItem(STORAGE_KEY, JSON.stringify(chapters));
    } catch (e) {}
  }, [chapters]);

  // If chapters are empty on mount and script has blocks, automatically populate initial chapters
  useEffect(() => {
    if (chapters.length === 0 && ((scriptStructure && scriptStructure.length > 0) || (scriptBlocks && Object.keys(scriptBlocks).length > 0))) {
      handleGenerateFromBlocks(false);
    }
  }, [scriptStructure?.length, Object.keys(scriptBlocks || {}).length]);

  // Normalized script block references
  const scriptBlockRefs = useMemo<ScriptBlockRef[]>(() => {
    return extractScriptBlockRefs(scriptStructure, scriptBlocks);
  }, [scriptStructure, scriptBlocks]);

  // Full script text for AI
  const fullScriptText = useMemo(() => {
    if (!scriptBlocks) return "";
    return Object.keys(scriptBlocks)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => scriptBlocks[Number(k)]?.text || "")
      .filter(Boolean)
      .join("\n\n");
  }, [scriptBlocks]);

  // Calculate video total duration estimate in seconds
  const totalDurationSec = useMemo(() => {
    if (chapters.length === 0) return 0;
    const last = chapters[chapters.length - 1];
    return Math.max(last.seconds + 60, 180);
  }, [chapters]);

  // YouTube rules validation
  const validation = useMemo(() => {
    const hasChapters = chapters.length > 0;
    const startsWithZero = hasChapters && chapters[0].seconds === 0;
    const hasAtLeastThree = chapters.length >= 3;
    let isChronological = true;
    let hasMinGap = true;

    for (let i = 1; i < chapters.length; i++) {
      if (chapters[i].seconds <= chapters[i - 1].seconds) {
        isChronological = false;
      }
      if (chapters[i].seconds - chapters[i - 1].seconds < 10) {
        hasMinGap = false;
      }
    }

    const isValid = hasChapters && startsWithZero && hasAtLeastThree && isChronological && hasMinGap;
    return {
      isValid,
      startsWithZero,
      hasAtLeastThree,
      isChronological,
      hasMinGap,
    };
  }, [chapters]);

  // 1. Generate chapters from Script Blocks
  const handleGenerateFromBlocks = (showToast = true) => {
    const rawList = generateScriptBlockTimestamps(scriptStructure, scriptBlocks);
    if (!rawList || rawList.length === 0) {
      if (showToast) toast.info("Сначала создайте структуру или текст сценария");
      return;
    }

    const formatted: VideoChapter[] = rawList.map((item, idx) => ({
      id: idx + 1,
      timeCode: idx === 0 ? "00:00" : item.timeCode,
      seconds: idx === 0 ? 0 : parseTimeCodeToSeconds(item.timeCode),
      title: item.title,
    }));

    // Ensure first is strictly 00:00
    if (formatted.length > 0) {
      formatted[0].timeCode = "00:00";
      formatted[0].seconds = 0;
    }

    setChapters(formatted);
    if (showToast) toast.success(`Сформировано ${formatted.length} глав на основе блоков сценария!`);
  };

  // 2. AI Generate Chapters
  const handleGenerateWithAI = async () => {
    if (!fullScriptText && !scriptTopic) {
      toast.error("Сначала напишите тему или создайте текст сценария");
      return;
    }

    setIsGeneratingAI(true);
    const toastId = toast.loading("ИИ анализирует сценарий и формирует кликабельные главы...");

    try {
      const topic = scriptTopic || (typeof selectedIdea === "string" ? selectedIdea : "") || "YouTube видео";
      const result = await generateYouTubeChaptersAI(topic, topic, fullScriptText, {
        model: activeModel || "gemini-3.1-flash-lite",
      });

      if (result && result.length > 0) {
        const mapped: VideoChapter[] = result.map((c, idx) => ({
          id: idx + 1,
          timeCode: idx === 0 ? "00:00" : c.timeCode,
          seconds: idx === 0 ? 0 : parseTimeCodeToSeconds(c.timeCode),
          title: c.title,
        }));

        setChapters(mapped);
        toast.success(`ИИ успешно сгенерировал ${mapped.length} кликабельных глав!`, { id: toastId });
      } else {
        toast.error("Не удалось сгенерировать главы с помощью ИИ", { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.message || "Ошибка генерации глав", { id: toastId });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // 3. Fix rules automatically
  const handleAutoFixRules = () => {
    if (chapters.length === 0) return;

    let updated = [...chapters];
    // Rule 1: Ensure starts at 00:00
    if (updated[0].seconds !== 0 || updated[0].timeCode !== "00:00") {
      updated[0].seconds = 0;
      updated[0].timeCode = "00:00";
    }

    // Rule 2: Sort chronologically
    updated.sort((a, b) => a.seconds - b.seconds);

    // Rule 3: Ensure minimum 10s gap
    for (let i = 1; i < updated.length; i++) {
      if (updated[i].seconds < updated[i - 1].seconds + 10) {
        updated[i].seconds = updated[i - 1].seconds + 15;
        updated[i].timeCode = formatSecondsToTimeCode(updated[i].seconds);
      }
    }

    // Update IDs
    updated.forEach((c, idx) => (c.id = idx + 1));
    setChapters(updated);
    toast.success("Таймкоды автоматически скорректированы под стандарты YouTube!");
  };

  // Drag & Drop handlers
  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragOverIdx !== idx) {
      setDragOverIdx(idx);
    }
  };

  const handleDrop = (idx: number) => {
    if (draggedIdx === null || draggedIdx === idx) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }

    const updated = [...chapters];
    const [movedItem] = updated.splice(draggedIdx, 1);
    updated.splice(idx, 0, movedItem);

    // Reassign IDs & keep timecodes logical
    updated.forEach((c, i) => (c.id = i + 1));
    setChapters(updated);
    setDraggedIdx(null);
    setDragOverIdx(null);
    toast.success(`Глава перемещена на позицию ${idx + 1}`);
  };

  // Move up/down
  const handleMove = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= chapters.length) return;
    const updated = [...chapters];
    const [item] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, item);
    updated.forEach((c, i) => (c.id = i + 1));
    setChapters(updated);
  };

  // Add chapter
  const handleAddChapter = (insertIdx?: number) => {
    const targetIdx = insertIdx !== undefined ? insertIdx : chapters.length;
    let newSec = 0;
    if (chapters.length > 0) {
      if (targetIdx >= chapters.length) {
        newSec = chapters[chapters.length - 1].seconds + 60;
      } else if (targetIdx === 0) {
        newSec = 0;
      } else {
        newSec = Math.floor((chapters[targetIdx - 1].seconds + chapters[targetIdx].seconds) / 2);
      }
    }

    const newChapter: VideoChapter = {
      id: Date.now(),
      seconds: newSec,
      timeCode: formatSecondsToTimeCode(newSec),
      title: `Новая глава ${chapters.length + 1}`,
    };

    const updated = [...chapters];
    updated.splice(targetIdx, 0, newChapter);
    updated.forEach((c, i) => (c.id = i + 1));
    setChapters(updated);
    setEditingId(newChapter.id);
  };

  // Delete chapter
  const handleDeleteChapter = (id: number) => {
    const updated = chapters.filter((c) => c.id !== id);
    if (updated.length > 0 && updated[0].seconds !== 0) {
      updated[0].seconds = 0;
      updated[0].timeCode = "00:00";
    }
    updated.forEach((c, i) => (c.id = i + 1));
    setChapters(updated);
    toast.info("Глава удалена");
  };

  // Update chapter field
  const handleUpdateChapter = (id: number, field: "title" | "timeCode", val: string) => {
    setChapters((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        if (field === "title") {
          return { ...c, title: val };
        } else {
          const sec = parseTimeCodeToSeconds(val);
          return { ...c, timeCode: val, seconds: sec };
        }
      })
    );
  };

  // Shift all timecodes
  const handleShiftTimecodes = (secondsDelta: number) => {
    if (chapters.length <= 1) return;
    const updated = chapters.map((c, idx) => {
      if (idx === 0) return c; // First must remain 00:00
      const newSec = Math.max(10, c.seconds + secondsDelta);
      return {
        ...c,
        seconds: newSec,
        timeCode: formatSecondsToTimeCode(newSec),
      };
    });
    setChapters(updated);
    setShowShiftPopover(false);
    toast.success(`Все таймкоды сдвинуты на ${secondsDelta > 0 ? `+${secondsDelta}` : secondsDelta} сек`);
  };

  // Send / Apply to SEO Block
  const handleApplyToSEO = () => {
    if (chapters.length === 0) {
      toast.error("Список глав пуст. Сгенерируйте или добавьте главы.");
      return;
    }

    const formattedChapters = formatChaptersToText(chapters);
    const currentDesc = videoSEO?.description || "";
    let updatedDesc = currentDesc.trim();

    // Regex to detect existing timestamps block in description
    const timestampRegex = /(\n|^)(\d{1,2}:\d{2}(?::\d{2})?[\s—\-–]+[^\n]+(\n\d{1,2}:\d{2}(?::\d{2})?[\s—\-–]+[^\n]+)*)/;

    if (timestampRegex.test(updatedDesc)) {
      updatedDesc = updatedDesc.replace(timestampRegex, `\n\n${formattedChapters}\n`);
    } else if (updatedDesc) {
      updatedDesc = `${updatedDesc}\n\nТаймкоды:\n${formattedChapters}`;
    } else {
      updatedDesc = `Таймкоды:\n${formattedChapters}`;
    }

    const newSEO = {
      ...(videoSEO || {
        title: scriptTopic || "YouTube видео",
        keywords: "",
        tags: [],
        hashtags: [],
        pinnedComment: "",
      }),
      description: updatedDesc.trim(),
    };

    setVideoSEO(newSEO);
    try {
      safeStorage.setItem("yt_seo_data", JSON.stringify(newSEO));
    } catch (e) {}

    toast.success("Таймкоды успешно отправлены в описание SEO блока!", {
      action: onNavigateToSEO
        ? {
            label: "Перейти в SEO",
            onClick: onNavigateToSEO,
          }
        : undefined,
      duration: 5000,
    });
  };

  // Copy chapters
  const handleCopy = () => {
    if (chapters.length === 0) {
      toast.error("Список глав пуст");
      return;
    }
    const text = formatChaptersToText(chapters);
    copyToClipboard(text);
    toast.success("Таймкоды скопированы в буфер обмена!");
  };

  // Download TXT
  const handleDownloadTXT = () => {
    if (chapters.length === 0) return;
    const text = formatChaptersToText(chapters);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timestamps-${scriptTopic ? scriptTopic.slice(0, 20) : "youtube"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Файл таймкодов скачан");
  };

  return (
    <div className="bg-surface border border-border rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
      {/* Header & Main Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/70 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <Clock size={20} />
            </div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Интерактивная панель глав & таймкодов
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-neutral-800 text-primary border border-primary/30 font-mono">
                {chapters.length} глав
              </span>
            </h3>

            {/* Tutorial / Help Button */}
            <button
              onClick={() => setIsTutorialOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-xl text-xs font-bold border border-amber-500/30 transition-all cursor-pointer shadow-sm ml-auto md:ml-2"
              title="Как работать с главами и таймкодами (Обучение)"
            >
              <HelpCircle size={14} className="text-amber-400" />
              <span>Обучение</span>
            </button>
          </div>
          <p className="text-xs text-neutral-400">
            Перетаскивайте главы, редактируйте таймкоды и названия, затем отправьте их напрямую в SEO блок описания
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* AI Generate Button */}
          <button
            onClick={handleGenerateWithAI}
            disabled={isGeneratingAI}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-primary/20 via-emerald-500/20 to-primary/10 hover:from-primary/30 hover:to-emerald-500/30 text-primary rounded-xl text-xs font-bold border border-primary/30 transition-all cursor-pointer shadow-sm disabled:opacity-50"
            title="Сгенерировать кликабельные главы с помощью ИИ"
          >
            {isGeneratingAI ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            <span>ИИ-Генерация глав</span>
          </button>

          {/* From Script Blocks */}
          <button
            onClick={() => handleGenerateFromBlocks(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-xl text-xs font-bold border border-neutral-800 transition-all cursor-pointer"
            title="Заполнить на основе блоков текущего сценария"
          >
            <Layers size={14} className="text-accent" />
            <span>Из блоков сценария</span>
          </button>

          {/* Media Audio/Video Alignment */}
          <button
            onClick={() => setIsMediaModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-cyan-400 rounded-xl text-xs font-bold border border-cyan-500/30 transition-all cursor-pointer"
            title="Расставить точные таймкоды по загруженному видео или аудио ролику"
          >
            <Film size={14} />
            <span>По медиафайлу ИИ</span>
          </button>
        </div>
      </div>

      {/* Visual Duration Timeline Bar */}
      {chapters.length > 0 && (
        <div className="space-y-2 bg-neutral-950/60 p-4 rounded-2xl border border-neutral-800/80">
          <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
            <span>00:00 (Начало)</span>
            <span>Хронометраж: ~{formatSecondsToTimeCode(totalDurationSec)}</span>
          </div>
          <div className="w-full h-3 bg-neutral-800 rounded-full flex overflow-hidden p-0.5 gap-0.5">
            {chapters.map((c, i) => {
              const nextSec = i < chapters.length - 1 ? chapters[i + 1].seconds : totalDurationSec;
              const duration = Math.max(10, nextSec - c.seconds);
              const percent = Math.max(2, (duration / totalDurationSec) * 100);
              const colors = [
                "bg-emerald-500 hover:bg-emerald-400",
                "bg-cyan-500 hover:bg-cyan-400",
                "bg-blue-500 hover:bg-blue-400",
                "bg-purple-500 hover:bg-purple-400",
                "bg-amber-500 hover:bg-amber-400",
                "bg-rose-500 hover:bg-rose-400",
              ];
              const color = colors[i % colors.length];

              return (
                <div
                  key={c.id || i}
                  style={{ width: `${percent}%` }}
                  className={`h-full ${color} rounded-sm transition-all cursor-pointer relative group`}
                  title={`${c.timeCode} — ${c.title} (~${Math.round(duration)} сек)`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* YouTube Standards Status & Quick Tools Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-900/40 p-3 rounded-2xl border border-neutral-800/60 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold text-neutral-400">Правила YouTube:</span>
          <span
            className={`flex items-center gap-1 font-medium ${
              validation.startsWithZero ? "text-emerald-400" : "text-amber-400"
            }`}
          >
            {validation.startsWithZero ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
            Старт с 00:00
          </span>
          <span
            className={`flex items-center gap-1 font-medium ${
              validation.hasAtLeastThree ? "text-emerald-400" : "text-amber-400"
            }`}
          >
            {validation.hasAtLeastThree ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
            Минимум 3 главы
          </span>
          <span
            className={`flex items-center gap-1 font-medium ${
              validation.isChronological ? "text-emerald-400" : "text-amber-400"
            }`}
          >
            {validation.isChronological ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
            Хронология
          </span>

          {!validation.isValid && chapters.length > 0 && (
            <button
              onClick={handleAutoFixRules}
              className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 rounded-lg text-xs font-bold border border-amber-500/30 transition-all cursor-pointer flex items-center gap-1"
            >
              <Zap size={12} />
              <span>Исправить автоматически</span>
            </button>
          )}
        </div>

        {/* Bulk tools: Add, Shift, Clear */}
        <div className="flex items-center gap-2">
          {/* Shift Popover Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowShiftPopover(!showShiftPopover)}
              className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-medium border border-neutral-700 transition-all flex items-center gap-1 cursor-pointer"
              title="Сдвинуть все таймкоды на несколько секунд"
            >
              <Sliders size={13} />
              <span>Сдвиг таймкодов</span>
            </button>

            {showShiftPopover && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-neutral-900 border border-neutral-700 rounded-2xl p-3 shadow-xl z-20 space-y-2">
                <p className="text-[11px] text-neutral-400">Сдвиг всех таймкодов (кроме 00:00):</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => handleShiftTimecodes(-5)}
                    className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-mono font-bold cursor-pointer"
                  >
                    -5 сек
                  </button>
                  <button
                    onClick={() => handleShiftTimecodes(5)}
                    className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-mono font-bold cursor-pointer"
                  >
                    +5 сек
                  </button>
                  <button
                    onClick={() => handleShiftTimecodes(-10)}
                    className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-mono font-bold cursor-pointer"
                  >
                    -10 сек
                  </button>
                  <button
                    onClick={() => handleShiftTimecodes(10)}
                    className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-mono font-bold cursor-pointer"
                  >
                    +10 сек
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => handleAddChapter()}
            className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
          >
            <Plus size={13} />
            <span>Добавить главу</span>
          </button>
        </div>
      </div>

      {/* Chapters Interactive List (Drag & Drop + Inline Editing) */}
      <div className="space-y-2.5">
        {chapters.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/40 space-y-3">
            <Clock size={36} className="mx-auto text-neutral-600" />
            <p className="text-sm font-medium text-neutral-300">Список глав и таймкодов пока пуст</p>
            <p className="text-xs text-neutral-500 max-w-md mx-auto">
              Нажмите «ИИ-Генерация глав» или «Из блоков сценария», чтобы мгновенно сформировать структуру глав с таймкодами
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={handleGenerateWithAI}
                className="px-4 py-2 bg-primary text-black rounded-xl text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer"
              >
                Сгенерировать ИИ
              </button>
              <button
                onClick={() => handleGenerateFromBlocks(true)}
                className="px-4 py-2 bg-neutral-800 text-white rounded-xl text-xs font-bold hover:bg-neutral-700 transition-all cursor-pointer"
              >
                Из блоков сценария
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {chapters.map((chapter, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === chapters.length - 1;
              const isDragged = draggedIdx === idx;
              const isOver = dragOverIdx === idx;

              return (
                <div
                  key={chapter.id || idx}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={() => handleDrop(idx)}
                  onDragEnd={() => {
                    setDraggedIdx(null);
                    setDragOverIdx(null);
                  }}
                  className={`group flex items-center gap-2.5 p-2.5 md:p-3 rounded-2xl border transition-all ${
                    isOver
                      ? "border-primary bg-primary/10 shadow-md ring-1 ring-primary/30"
                      : isDragged
                      ? "opacity-40 border-neutral-700 bg-neutral-900"
                      : "bg-neutral-900/60 border-neutral-800/80 hover:border-neutral-700 hover:bg-neutral-900"
                  }`}
                >
                  {/* Drag Handle */}
                  <div
                    className="cursor-grab active:cursor-grabbing text-neutral-600 group-hover:text-neutral-400 transition-colors p-1"
                    title="Перетащите для изменения порядка"
                  >
                    <GripVertical size={16} />
                  </div>

                  {/* Chapter Index Badge */}
                  <div className="w-6 h-6 rounded-lg bg-neutral-800 flex items-center justify-center text-[11px] font-mono text-neutral-400 shrink-0">
                    {idx + 1}
                  </div>

                  {/* Timecode Input */}
                  <div className="w-24 shrink-0">
                    <input
                      type="text"
                      value={chapter.timeCode}
                      onChange={(e) => handleUpdateChapter(chapter.id, "timeCode", e.target.value)}
                      placeholder="00:00"
                      className={`w-full text-center font-mono text-xs py-1.5 px-2 rounded-xl bg-neutral-950 border transition-all ${
                        isFirst && chapter.timeCode !== "00:00"
                          ? "border-amber-500 text-amber-300 focus:border-amber-400"
                          : "border-neutral-800 text-primary font-bold focus:border-primary focus:ring-1 focus:ring-primary/20"
                      }`}
                      title={isFirst ? "Первая глава строго должна начинаться с 00:00" : "Таймкод в формате MM:SS или HH:MM:SS"}
                    />
                  </div>

                  {/* Title Input */}
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={chapter.title}
                      onChange={(e) => handleUpdateChapter(chapter.id, "title", e.target.value)}
                      placeholder="Название главы..."
                      className="w-full text-xs py-1.5 px-3 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all placeholder-neutral-600 font-medium"
                    />
                  </div>

                  {/* Actions (Reorder buttons, insert, delete) */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleMove(idx, idx - 1)}
                      disabled={isFirst}
                      className="p-1.5 text-neutral-500 hover:text-white disabled:opacity-20 hover:bg-neutral-800 rounded-lg transition-all cursor-pointer"
                      title="Поднять выше"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={() => handleMove(idx, idx + 1)}
                      disabled={isLast}
                      className="p-1.5 text-neutral-500 hover:text-white disabled:opacity-20 hover:bg-neutral-800 rounded-lg transition-all cursor-pointer"
                      title="Опустить ниже"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      onClick={() => handleAddChapter(idx + 1)}
                      className="p-1.5 text-neutral-500 hover:text-primary hover:bg-neutral-800 rounded-lg transition-all cursor-pointer"
                      title="Вставить главу ниже"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteChapter(chapter.id)}
                      className="p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                      title="Удалить главу"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Footer Actions: Send to SEO, Copy, Download */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-border/70">
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            disabled={chapters.length === 0}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-xl text-xs font-bold border border-neutral-800 transition-all cursor-pointer disabled:opacity-40"
          >
            <Copy size={14} className="text-accent" />
            <span>Скопировать</span>
          </button>

          <button
            onClick={handleDownloadTXT}
            disabled={chapters.length === 0}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-xl text-xs font-bold border border-neutral-800 transition-all cursor-pointer disabled:opacity-40"
          >
            <Download size={14} />
            <span>Скачать .TXT</span>
          </button>
        </div>

        {/* PRIMARY ACTION: Send to SEO Block */}
        <button
          onClick={handleApplyToSEO}
          disabled={chapters.length === 0}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-emerald-400 hover:from-primary/90 hover:to-emerald-400/90 text-black font-bold rounded-xl text-xs shadow-lg shadow-primary/20 transition-all cursor-pointer active:scale-98 disabled:opacity-40"
        >
          <Send size={15} />
          <span>Отправить в SEO блок (Описание ролика)</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Video Timestamps Media Alignment Modal */}
      {isMediaModalOpen && (
        <VideoTimestampsModal
          isOpen={isMediaModalOpen}
          onClose={() => setIsMediaModalOpen(false)}
          videoTitle={scriptTopic}
          referenceScript={fullScriptText}
          scriptBlocks={scriptBlockRefs}
          currentDescription={videoSEO?.description || ""}
          onApplyTimestamps={(updatedDesc) => {
            const newSEO = {
              ...(videoSEO || {
                title: scriptTopic || "YouTube видео",
                keywords: "",
                tags: [],
                hashtags: [],
                pinnedComment: "",
              }),
              description: updatedDesc,
            };
            setVideoSEO(newSEO);
            try {
              safeStorage.setItem("yt_seo_data", JSON.stringify(newSEO));
            } catch (e) {}

            // Also reload chapters from generated text
            const lines = updatedDesc.split("\n");
            const newChaps: VideoChapter[] = [];
            lines.forEach((line) => {
              const match = line.match(/^(\d{1,2}:\d{2}(?::\d{2})?)[\s—\-–]+(.+)$/);
              if (match) {
                newChaps.push({
                  id: newChaps.length + 1,
                  timeCode: match[1].trim(),
                  seconds: parseTimeCodeToSeconds(match[1].trim()),
                  title: match[2].trim(),
                });
              }
            });
            if (newChaps.length > 0) {
              setChapters(newChaps);
            }
          }}
          activeModel={activeModel}
        />
      )}

      {/* Chapters Interactive Tutorial Modal */}
      <ChaptersTutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />
    </div>
  );
};
