import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  Sparkles,
  Sliders,
  Play,
  RotateCcw,
  Copy,
  Download,
  Loader2,
  Check,
  Plus,
  Trash2,
  Volume2,
  ListOrdered,
  Eye,
  Settings,
  HelpCircle,
  Clock,
  Layout,
  Cpu,
  Layers,
  ChevronDown,
  ChevronUp,
  Share2,
  Target,
  Search,
  Zap,
  Lightbulb,
  ArrowRight,
  FileCode,
  Upload,
  Music,
  Edit3,
  Subtitles,
} from "lucide-react";
import { toast } from "sonner";
import { ScriptTimeline, type ScriptVersion } from "../ScriptTimeline";
import { ScriptRecommendations } from "../ScriptRecommendations";
import { ErrorBoundary } from "../common/ErrorBoundary";
import { SpeakerTTSMarkupSection } from "../SpeakerTTSMarkupSection";
import { SubtitlesModal } from "../SubtitlesModal";
import { ScriptChaptersEditor } from "../ScriptChaptersEditor";
import { generateBlockMusicPrompt } from "../../services/ai/audioService";
import { parseDurationInMinutes } from "../../services/ai/aiConfig";
import { safeStorage } from "../../lib/storage";
import { getFullScriptText, copyToClipboard as copyTextToClipboard } from "../../utils/helpers";
import {
  readTextFileSmart,
  extractTextFromDocx,
  extractCleanDialogueFromSubtitles,
} from "../../utils/subtitles";

export interface ScriptTabProps {
  nicheData: any;
  selectedIdea: string | null;
  selectedNiche: string;
  scriptTopic: string;
  setScriptTopic: (topic: string) => void;
  scriptMode: string;
  setScriptMode: (mode: string) => void;
  scriptCustomMode: string;
  setScriptCustomMode: (mode: string) => void;
  scriptDuration: string | number;
  setScriptDuration: (duration: string | number) => void;
  scriptCustomDuration: string;
  setScriptCustomDuration: (dur: string) => void;
  scriptTone: string;
  setScriptTone: (tone: string) => void;
  scriptWishes: string;
  setScriptWishes: (wishes: string) => void;
  isGeneratingHooks: boolean;
  handleGenerateHooks: () => void;
  generatedHooks: string[];
  isGeneratingFullScript: boolean;
  handleGenerateFullScript: () => void;
  generatedBlocks: Record<number, any>;
  setGeneratedBlocks: React.Dispatch<React.SetStateAction<Record<number, any>>>;
  scriptStructure?: any[];
  setScriptStructure?: (struct: any[]) => void;
  isScriptTopicLocked?: boolean;
  setIsScriptTopicLocked?: (locked: boolean) => void;
  syncStatus?: string;
  showSyncNotification?: boolean;
  lastFirebaseSave?: Date | null;
  scriptVersions?: ScriptVersion[];
  activeVersionId?: string | null;
  handleSaveScriptVersion?: (name?: string, summary?: string) => void;
  handleLoadScriptVersion?: (ver: ScriptVersion) => void;
  handleDeleteScriptVersion?: (id: string) => void;
  handleRenameScriptVersion?: (id: string, name: string) => void;
  handleOpenDiffModal?: (vA?: string, vB?: string) => void;
  scriptRecommendations?: any[];
  isGeneratingRecommendations?: boolean;
  isApplyingImprovement?: Record<number, boolean>;
  isApplyingAllRecs?: boolean;
  handleGenerateScriptRecommendations?: () => void;
  handleApplyScriptRecommendation?: (rec: any, index: number) => void;
  handleApplyAllRecommendations?: (customText: string, recsList?: any[]) => Promise<void>;
  handleParseAndAddRecommendations?: (rawText: string) => Promise<void>;
  handleAddCustomRecommendation?: (rec: any) => void;
  handleRemoveImprovement?: (index: number) => void;
  handleClearAllImprovements?: () => void;
  handleSelectBlockAndScrollToPrompts?: (blockIdx: number | "all") => void;
  renderIdeaBanner?: () => React.ReactNode;
  activeModel?: string;
  copyToClipboard?: (text: string, section?: string) => void;
  onNavigateToSEO?: () => void;
}

export const ScriptTab: React.FC<ScriptTabProps> = ({
  nicheData,
  selectedIdea,
  selectedNiche,
  scriptTopic,
  setScriptTopic,
  scriptMode,
  setScriptMode,
  scriptCustomMode,
  setScriptCustomMode,
  scriptDuration,
  setScriptDuration,
  scriptCustomDuration,
  setScriptCustomDuration,
  scriptTone,
  setScriptTone,
  scriptWishes,
  setScriptWishes,
  isGeneratingHooks,
  handleGenerateHooks,
  generatedHooks = [],
  isGeneratingFullScript,
  handleGenerateFullScript,
  generatedBlocks = {},
  setGeneratedBlocks,
  scriptStructure = [],
  setScriptStructure,
  isScriptTopicLocked = false,
  setIsScriptTopicLocked,
  syncStatus = "idle",
  showSyncNotification = false,
  lastFirebaseSave,
  scriptVersions = [],
  activeVersionId = null,
  handleSaveScriptVersion,
  handleLoadScriptVersion,
  handleDeleteScriptVersion,
  handleRenameScriptVersion,
  handleOpenDiffModal,
  scriptRecommendations = [],
  isGeneratingRecommendations = false,
  isApplyingImprovement = {},
  isApplyingAllRecs = false,
  handleGenerateScriptRecommendations,
  handleApplyScriptRecommendation,
  handleApplyAllRecommendations,
  handleParseAndAddRecommendations,
  handleAddCustomRecommendation,
  handleRemoveImprovement,
  handleClearAllImprovements,
  handleSelectBlockAndScrollToPrompts,
  renderIdeaBanner,
  activeModel,
  copyToClipboard,
  onNavigateToSEO,
}) => {
  const hasBlocks = generatedBlocks && Object.keys(generatedBlocks).length > 0;
  const [activeSubView, setActiveSubView] = useState<"editor" | "chapters" | "recommendations" | "timeline">("editor");
  const [generatingBlockMusicKey, setGeneratingBlockMusicKey] = useState<number | null>(null);

  const fullScriptText = getFullScriptText(generatedBlocks);

  const handleCopyScript = () => {
    if (!fullScriptText) {
      toast.error("Сценарий пуст для копирования");
      return;
    }
    if (copyToClipboard) {
      copyToClipboard(fullScriptText, "Сценарий");
    } else {
      copyTextToClipboard(fullScriptText);
    }
  };

  const [isPasteScriptModalOpen, setIsPasteScriptModalOpen] = useState(false);
  const [pastedScriptText, setPastedScriptText] = useState("");
  const [isSubtitlesModalOpen, setIsSubtitlesModalOpen] = useState(false);

  // Intelligent Parser for Custom Script Content
  const parseScriptContentToBlocks = (content: string) => {
    const raw = content.trim();
    if (!raw) return [];

    // Split by Markdown headers (# ... or ## ...), bracket headers [Блок ...], or double newlines
    let rawParts = raw.split(/\n\s*(?=(?:#+\s+|\[[^\]]+\]|Блок\s+\d+|Глава\s+\d+|\d+\.\s+[А-ЯA-Z]))/i);
    
    if (rawParts.length <= 1) {
      // Try double newlines
      rawParts = raw.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    }

    // If still just 1 huge block (> 500 chars), split into logical chunks of ~150-200 words
    if (rawParts.length <= 1 && raw.length > 500) {
      const sentences = raw.match(/[^.!?]+[.!?]+(?:\s+|$)/g) || [raw];
      const chunks: string[] = [];
      let currentChunk = "";
      
      sentences.forEach((s) => {
        if ((currentChunk + s).split(/\s+/).length > 150 && currentChunk.trim()) {
          chunks.push(currentChunk.trim());
          currentChunk = s;
        } else {
          currentChunk += s;
        }
      });
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      rawParts = chunks.length > 0 ? chunks : [raw];
    }

    return rawParts.map((part, idx) => {
      const lines = part.split("\n").map(l => l.trim()).filter(Boolean);
      let title = "";
      let bodyText = part.trim();

      if (lines.length > 0) {
        const firstLine = lines[0];
        const isHeading =
          /^#+\s+/.test(firstLine) ||
          /^\[.+\]$/.test(firstLine) ||
          /^(?:Блок|Глава|Сцена|Часть)\s+\d+/i.test(firstLine) ||
          /^\d+\.\s+[А-ЯA-Z]/.test(firstLine) ||
          (firstLine.length <= 60 && lines.length > 1);

        if (isHeading) {
          title = firstLine.replace(/^[#*-\d\.\s\[\]]+/, "").replace(/[\]]+$/, "").trim();
          bodyText = lines.slice(1).join("\n").trim();
          if (!bodyText) {
            bodyText = firstLine;
          }
        }
      }

      if (!title) {
        if (idx === 0) title = "Хук и введение";
        else if (idx === rawParts.length - 1 && rawParts.length > 2) title = "Заключение и CTA";
        else title = `Блок ${idx + 1}`;
      }

      return {
        title,
        text: bodyText
      };
    });
  };

  const applyCustomScriptContent = (content: string, fileName?: string) => {
    const parsedItems = parseScriptContentToBlocks(content);
    if (parsedItems.length === 0) {
      toast.error("Текст сценария пуст");
      return;
    }

    const newBlocks: Record<number, any> = {};
    const newStructure: any[] = [];
    let accumulatedSeconds = 0;

    parsedItems.forEach((item, idx) => {
      const wordCount = item.text.split(/\s+/).filter(Boolean).length;
      const blockSeconds = Math.max(15, Math.round((wordCount / 140) * 60));
      const startMin = Math.floor(accumulatedSeconds / 60);
      const startSec = accumulatedSeconds % 60;
      accumulatedSeconds += blockSeconds;
      const endMin = Math.floor(accumulatedSeconds / 60);
      const endSec = accumulatedSeconds % 60;
      const timeRange = `${startMin}:${startSec < 10 ? '0' : ''}${startSec} - ${endMin}:${endSec < 10 ? '0' : ''}${endSec}`;

      // Keys must be 0-based to match the rest of the application
      newBlocks[idx] = {
        blockNumber: idx + 1,
        blockTitle: item.title,
        title: item.title,
        text: item.text,
        timeRange,
        musicPrompt: "Cinematic atmospheric background music",
        voiceover: {
          voiceName: "Голос 1 (Эмоциональный)",
          settings: "Уверенный темп",
          intonation: "Интригующая",
          mood: "Динамичный",
          timbre: "Глубокий",
          sampleContext: "Профессиональная озвучка роликов"
        }
      };

      newStructure.push({
        blockNumber: idx + 1,
        title: item.title,
        type: idx === 0 ? "Вступление" : (idx === parsedItems.length - 1 ? "Заключение" : "Основная часть"),
        context: item.title,
        estimatedTime: `~${blockSeconds} сек`,
        estimatedChars: item.text.length
      });
    });

    setGeneratedBlocks(newBlocks);
    if (setScriptStructure) {
      setScriptStructure(newStructure);
    }

    // If scriptTopic is empty or default, infer from file name or first block
    if (!scriptTopic || !scriptTopic.trim()) {
      if (fileName) {
        const cleanName = fileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ").trim();
        setScriptTopic(cleanName);
      } else if (parsedItems[0]?.title && parsedItems[0]?.title !== "Блок 1") {
        setScriptTopic(parsedItems[0].title);
      }
    }

    setActiveSubView("editor");
    toast.success(`Сценарий успешно загружен (${parsedItems.length} ${parsedItems.length === 1 ? 'блок' : parsedItems.length < 5 ? 'блока' : 'блоков'})! Разметка речи готова к работе.`);
  };

  // Upload Custom Script File
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let content = "";
      if (/\.docx$/i.test(file.name)) {
        const buffer = await file.arrayBuffer();
        content = await extractTextFromDocx(buffer);
      } else {
        content = await readTextFileSmart(file);
      }

      if (!content || !content.trim()) {
        toast.error("Файл пуст или поврежден");
        return;
      }

      // If it is an SRT/VTT/SBV subtitle file, extract clean dialogue text without technical timestamps!
      const isSubFile = /\.(srt|vtt|sbv)$/i.test(file.name) || /(?:-->|->|\d{1,2}:\d{2}:\d{2})/.test(content);
      if (isSubFile) {
        content = extractCleanDialogueFromSubtitles(content);
      }

      applyCustomScriptContent(content, file.name);
    } catch (err: any) {
      toast.error(err?.message || "Ошибка при чтении файла");
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {renderIdeaBanner && renderIdeaBanner()}

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <h3 className="text-xl font-bold flex flex-wrap items-center gap-x-4 gap-y-2 text-white">
            <span className="flex items-center gap-3">
              <FileText className="text-primary animate-pulse" size={24} />
              Мастер Сценариев и Нарратива
            </span>

            <AnimatePresence mode="wait">
              {showSyncNotification && (
                <motion.span
                  key={`sync-status-${syncStatus}`}
                  initial={{ opacity: 0, scale: 0.9, x: -10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: 10 }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-full border shadow-sm ${
                    syncStatus === "saving"
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                      : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  }`}
                >
                  {syncStatus === "saving" ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      <span>Синхронизация...</span>
                    </>
                  ) : (
                    <>
                      <Check size={12} className="text-emerald-400" />
                      <span>Синхронизировано в Firebase {lastFirebaseSave ? `(${lastFirebaseSave.toLocaleTimeString("ru-RU")})` : ""}</span>
                    </>
                  )}
                </motion.span>
              )}
            </AnimatePresence>
          </h3>
          <p className="text-neutral-400 text-xs mt-1">
            Генерируйте профессиональные сценарии с разбивкой по блокам, озвучкой, музыкальными промтами и редактором.
          </p>
        </div>

        {/* Upload Custom Script Button & Paste & Subtitles */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 rounded-xl text-xs font-bold border border-neutral-800 transition-all cursor-pointer">
            <Upload size={14} className="text-primary" />
            <span>Загрузить файл (.txt, .docx, .srt)</span>
            <input type="file" accept=".txt,.md,.doc,.docx,.srt,.vtt,.sbv" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            onClick={() => setIsPasteScriptModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 rounded-xl text-xs font-bold border border-neutral-800 transition-all cursor-pointer"
            title="Вставить текст сценария из буфера"
          >
            <Edit3 size={14} className="text-accent" />
            <span>Вставить текст</span>
          </button>

          <button
            onClick={() => {
              if (!fullScriptText) {
                toast.error("Сначала создайте или загрузите сценарий");
                return;
              }
              setIsSubtitlesModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-primary/15 to-emerald-500/15 hover:from-primary/25 hover:to-emerald-500/25 text-primary rounded-xl text-xs font-bold border border-primary/30 transition-all cursor-pointer shadow-sm"
            title="Создать и экспортировать субтитры в формате TXT, SRT, SBV"
          >
            <Subtitles size={14} className="text-primary" />
            <span>Субтитры (TXT, SRT, SBV)</span>
          </button>

          <button
            onClick={() => {
              setActiveSubView("chapters");
              const el = document.getElementById("script-subtabs-bar");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 rounded-xl text-xs font-bold border border-neutral-800 transition-all cursor-pointer"
            title="Интерактивная панель глав и таймкодов для YouTube и SEO"
          >
            <Clock size={14} className="text-primary" />
            <span>Главы & Таймкоды</span>
          </button>
        </div>
      </div>

      {/* Control Setup & Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Topic, Wishes, Hook */}
        <div className="lg:col-span-8 space-y-6">
          {/* Topic Section */}
          <div className="bg-surface border border-border rounded-3xl p-6 md:p-8 space-y-5">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Target className="text-primary" size={20} /> Тема и главный хук ролика
              </h4>
              <button
                onClick={handleGenerateHooks}
                disabled={isGeneratingHooks || !scriptTopic}
                className="text-xs font-bold text-primary hover:text-accent transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isGeneratingHooks ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} />
                )}
                Сгенерировать хук
              </button>
            </div>

            <div className="relative group/input">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-neutral-500 group-focus-within/input:text-primary transition-colors" />
              </div>
              <input
                type="text"
                value={scriptTopic}
                onChange={(e) => setScriptTopic(e.target.value)}
                placeholder="Например: Как создать вирусный ролик, разоблачение мифов..."
                className="w-full bg-neutral-900/50 border border-neutral-800 rounded-2xl py-4 pl-12 pr-14 text-sm text-neutral-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all placeholder-neutral-600 font-sans"
              />
            </div>

            {/* Generated Hooks Suggestions */}
            {generatedHooks && generatedHooks.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/40">
                <p className="text-[10px] uppercase font-bold text-neutral-500">Варианты цепляющих хуков:</p>
                <div className="grid grid-cols-1 gap-2">
                  {generatedHooks.map((hook, idx) => (
                    <div
                      key={`hook-${idx}`}
                      onClick={() => setScriptTopic(hook)}
                      className="p-3 bg-neutral-900/60 border border-neutral-800/80 hover:border-primary/50 hover:bg-neutral-800/50 rounded-xl text-xs text-neutral-300 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <span>{hook}</span>
                      <span className="text-[10px] text-primary font-bold">Выбрать</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Wishes & Custom Instructions */}
          <div className="bg-surface border border-border rounded-3xl p-6 md:p-8 space-y-4">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider pl-1">
              Пожелания к структуре, фактам или подаче (опционально)
            </label>
            <textarea
              value={typeof scriptWishes === "string" ? scriptWishes : ""}
              onChange={(e) => setScriptWishes(e.target.value)}
              placeholder="Укажите обязательные факты, акценты, запретные темы или структуру сюжета..."
              rows={4}
              className="w-full bg-neutral-900/50 border border-neutral-800 rounded-2xl p-4 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all resize-none font-sans"
            />
          </div>
        </div>

        {/* Right Column: Parameters & Generation */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-surface border border-border rounded-3xl p-6 space-y-5">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders size={16} className="text-primary" />
              Параметры ролика
            </h4>

            {/* Video Format / Mode */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Формат видео</label>
              <select
                value={scriptMode}
                onChange={(e) => setScriptMode(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-primary cursor-pointer font-sans"
              >
                <option value="Документальный">🎬 Документальный (Нарратив)</option>
                <option value="Разговорный">🗣️ Разговорный (Блогер)</option>
                <option value="Информационный">ℹ️ Информационный (Факты)</option>
                <option value="Динамичный">⚡ Динамичный (Быстрый темп)</option>
                <option value="Комедийный">🎭 Комедийный (Юмор)</option>
                <option value="Свой вариант">🛠️ Свой вариант...</option>
              </select>
            </div>

            {scriptMode === "Свой вариант" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-1">
                <input
                  type="text"
                  value={scriptCustomMode}
                  onChange={(e) => setScriptCustomMode(e.target.value)}
                  placeholder="Опишите ваш уникальный формат..."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-primary font-sans"
                />
              </motion.div>
            )}

            {/* Duration */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Хронометраж</label>
                {(() => {
                  const effectiveDurationStr = scriptDuration === "custom" ? (scriptCustomDuration.trim() || "10") : String(scriptDuration);
                  const parsedMin = parseDurationInMinutes(effectiveDurationStr);
                  const targetWords = Math.round(parsedMin * 140);
                  const targetChars = Math.round(parsedMin * 1050);
                  const timeDisplay = parsedMin < 1 ? `${Math.round(parsedMin * 60)} сек.` : `${parsedMin} мин.`;
                  return (
                    <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                      🎯 {timeDisplay} · ~{targetWords.toLocaleString("ru-RU")} слов
                    </span>
                  );
                })()}
              </div>
              <select
                value={scriptDuration}
                onChange={(e) => setScriptDuration(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-primary cursor-pointer font-sans"
              >
                <option value="0.5">⏱️ Shorts (30 сек) ~ 70 слов</option>
                <option value="1">⏱️ Shorts / Reels (60 сек) ~ 140 слов</option>
                <option value="2">⏱️ Короткий ролик (2 мин) ~ 280 слов</option>
                <option value="3">⏱️ Короткое видео (3 мин) ~ 420 слов</option>
                <option value="5">⏱️ Стандартное видео (5 мин) ~ 700 слов</option>
                <option value="8">⏱️ Оптимальное видео (8 мин) ~ 1 120 слов</option>
                <option value="10">⏱️ Длинное видео (10 мин) ~ 1 400 слов</option>
                <option value="15">⏱️ Развернутое видео (15 мин) ~ 2 100 слов</option>
                <option value="20">⏱️ Глубокий разбор (20 мин) ~ 2 800 слов</option>
                <option value="30">⏱️ Большой выпуск (30 мин) ~ 4 200 слов</option>
                <option value="custom">🛠️ Свой вариант...</option>
              </select>
            </div>

            {scriptDuration === "custom" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-1.5">
                <input
                  type="text"
                  value={scriptCustomDuration}
                  onChange={(e) => setScriptCustomDuration(e.target.value)}
                  placeholder="Например: 12 минут, 45 секунд, 1.5 часа..."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-primary font-sans"
                />
                {(() => {
                  const effective = scriptCustomDuration.trim();
                  if (!effective) return null;
                  const parsedMin = parseDurationInMinutes(effective);
                  const targetWords = Math.round(parsedMin * 140);
                  const targetChars = Math.round(parsedMin * 1050);
                  return (
                    <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 pl-1">
                      <Clock size={12} className="text-primary shrink-0" />
                      <span>Рассчитано: <b className="text-neutral-200">{parsedMin >= 1 ? `${parsedMin} мин.` : `${Math.round(parsedMin * 60)} сек.`}</b> (~{targetWords.toLocaleString("ru-RU")} слов, ~{targetChars.toLocaleString("ru-RU")} знаков)</span>
                    </div>
                  );
                })()}
              </motion.div>
            )}

            {/* Tone of Voice */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Тональность</label>
              <select
                value={scriptTone}
                onChange={(e) => setScriptTone(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-primary cursor-pointer font-sans"
              >
                <option value="Глубокий, аналитический, с элементами сторителлинга">🔥 Аналитический / Сторителлинг</option>
                <option value="Динамичный, клиповый, вовлекающий с первых секунд">⚡ Динамичный / Клиповый</option>
                <option value="Дружелюбный, разговорный, понятный каждому">☕ Дружелюбный / Разговорный</option>
                <option value="Экспертный, авторитетный, с упором на факты и цифры">📊 Экспертный / Авторитетный</option>
                <option value="Интригующий, кинематографичный, напряженный">🕵️ Кинематографичный / Интригующий</option>
              </select>
            </div>

            {/* Main Action Button */}
            <div className="pt-3">
              <button
                onClick={handleGenerateFullScript}
                disabled={isGeneratingFullScript || !scriptTopic}
                className="w-full py-4 bg-primary hover:bg-emerald-600 disabled:opacity-50 text-black font-extrabold rounded-2xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isGeneratingFullScript ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Создание сценария...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    <span>{hasBlocks ? "Перегенерировать сценарий" : "Сгенерировать сценарий"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading state during generation if blocks are not yet ready */}
      {isGeneratingFullScript && !hasBlocks && (
        <div className="bg-surface border border-primary/30 rounded-3xl p-8 text-center space-y-4 shadow-lg animate-pulse">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 text-primary flex items-center justify-center mx-auto">
            <Loader2 size={24} className="animate-spin" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white">Проектирование структуры и генерация сценария...</h4>
            <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
              ИИ создает главы сюжета, пишет вовлекающий текст для каждого блока и оптимизирует темп повествования.
            </p>
          </div>
        </div>
      )}

      {/* Generated Script Workspace */}
      {hasBlocks && (
        <div className="space-y-6 pt-6 border-t border-border/40">
          {/* Sub-view switcher & Action bar (Sticky under top header) */}
          <div
            id="script-subtabs-bar"
            className="sticky top-16 sm:top-16 z-20 flex flex-wrap items-center justify-between gap-4 bg-surface/95 backdrop-blur-md p-3 rounded-2xl border border-border shadow-lg shadow-black/25 transition-all"
          >
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveSubView("editor")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSubView === "editor" ? "bg-primary text-black" : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                }`}
              >
                Блоки и Редактор ({Object.keys(generatedBlocks).length})
              </button>
              <button
                onClick={() => setActiveSubView("chapters")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSubView === "chapters" ? "bg-primary text-black" : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                }`}
              >
                <Clock size={14} />
                <span>Главы и таймкоды</span>
              </button>
              {handleGenerateScriptRecommendations && (
                <button
                  onClick={() => setActiveSubView("recommendations")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeSubView === "recommendations" ? "bg-primary text-black" : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                  }`}
                >
                  Рекомендации ИИ
                </button>
              )}
              {handleSaveScriptVersion && (
                <button
                  onClick={() => setActiveSubView("timeline")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeSubView === "timeline" ? "bg-primary text-black" : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                  }`}
                >
                  История версий
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                id="script-open-subtitles-btn"
                onClick={() => {
                  if (!fullScriptText) {
                    toast.error("Сценарий пуст");
                    return;
                  }
                  setIsSubtitlesModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-primary/20 via-emerald-500/20 to-primary/10 hover:from-primary/30 hover:to-emerald-500/30 text-primary rounded-xl text-xs font-bold border border-primary/30 transition-all cursor-pointer shadow-sm"
                title="Создать и экспортировать субтитры в формате TXT, SRT, SBV"
              >
                <Subtitles size={14} className="text-primary" />
                <span>Субтитры (TXT, SRT, SBV)</span>
              </button>

              <button
                onClick={handleCopyScript}
                className="flex items-center gap-1.5 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 rounded-xl text-xs font-bold border border-neutral-800 transition-all cursor-pointer"
              >
                <Copy size={14} className="text-accent" />
                <span>Скопировать весь текст</span>
              </button>
            </div>
          </div>

          {/* Sub-view Content: Editor (Block Breakdown, Titles, Text editing, Music prompt) */}
          {activeSubView === "editor" && (
            <div className="space-y-6">
              {/* Voiceover & Speech Markup (TTS) Section */}
              {generatedBlocks && Object.keys(generatedBlocks).length > 0 && (
                <div className="bg-surface border border-border/80 rounded-2xl p-5 md:p-6 space-y-4 shadow-sm">
                  <div className="flex items-center gap-3 border-b border-border/60 pb-3">
                    <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                      <Volume2 size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        🎙️ Дикторская озвучка & ИИ-Разметка речи (TTS)
                      </h3>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Автоматическая расстановка пауз, эмоций и ударений для ElevenLabs, SpeechKit и Google TTS
                      </p>
                    </div>
                  </div>
                  <ErrorBoundary isSection sectionName="Дикторская озвучка & TTS">
                    <SpeakerTTSMarkupSection
                      scriptBlocks={generatedBlocks}
                      selectedModel={activeModel}
                      onUpdateBlockText={(bIdx: number, txt: string) => {
                        setGeneratedBlocks((prev: any) => ({
                          ...prev,
                          [bIdx]: { ...prev[bIdx], text: txt }
                        }));
                      }}
                    />
                  </ErrorBoundary>
                </div>
              )}

              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers size={16} className="text-primary" />
                  Разбивка сценария на блоки ({Object.keys(generatedBlocks).length})
                </h4>
                <button
                  onClick={() => {
                    const keys = Object.keys(generatedBlocks).map(Number);
                    const nextKey = keys.length > 0 ? Math.max(...keys) + 1 : 0;
                    setGeneratedBlocks(prev => ({
                      ...prev,
                      [nextKey]: {
                        blockNumber: nextKey + 1,
                        blockTitle: `Новый блок ${nextKey + 1}`,
                        title: `Новый блок ${nextKey + 1}`,
                        text: "Введите текст блока сценария...",
                        timeRange: "0:00 - 1:00",
                        musicPrompt: "Atmospheric background music",
                        voiceover: {
                          voiceName: "Голос 1",
                          settings: "Стандартный темп",
                          intonation: "Нейтральная",
                          mood: "Спокойный",
                          timbre: "Средний",
                          sampleContext: "Описание контекста сцены"
                        }
                      }
                    }));
                    toast.success("Добавлен новый блок сценария");
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <Plus size={14} /> Добавить блок
                </button>
              </div>

              <div className="space-y-4">
                {Object.entries(generatedBlocks)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([keyStr, block]: [string, any], index: number) => {
                    const blockKey = Number(keyStr);
                    const currentTitle = block.blockTitle || block.title || scriptStructure?.[blockKey]?.title || `Блок ${index + 1}`;
                    const blockText = block.text || "";
                    const wordsCount = blockText.trim() ? blockText.trim().split(/\s+/).filter(Boolean).length : 0;

                    return (
                      <div key={`script-block-${blockKey}`} className="bg-surface border border-border rounded-2xl p-5 space-y-4 shadow-md">
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/40">
                          <div className="flex items-center gap-3 flex-1 min-w-[240px]">
                            <span className="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-mono font-bold text-xs shrink-0">
                              {index + 1}
                            </span>
                            <input
                              type="text"
                              value={currentTitle}
                              onChange={(e) => {
                                const val = e.target.value;
                                setGeneratedBlocks(prev => ({
                                  ...prev,
                                  [blockKey]: { ...(prev[blockKey] || {}), blockTitle: val, title: val }
                                }));
                              }}
                              placeholder="Название блока (например, Хук, Завязка)..."
                              className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-primary flex-1 max-w-sm"
                            />
                            {wordsCount > 0 && (
                              <span className="text-[10px] text-neutral-500 font-mono hidden sm:inline">
                                {wordsCount} сл. · ~{Math.ceil(wordsCount / 2.3)}с
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={block.timeRange || "0:00 - 1:00"}
                              onChange={(e) => {
                                const val = e.target.value;
                                setGeneratedBlocks(prev => ({
                                  ...prev,
                                  [blockKey]: { ...(prev[blockKey] || {}), timeRange: val }
                                }));
                              }}
                              className="bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-[11px] font-mono text-neutral-300 w-24 text-center"
                              title="Временной отрезок блока"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (blockText) {
                                  copyTextToClipboard(blockText);
                                  toast.success(`Текст блока ${index + 1} скопирован! 📋`);
                                } else {
                                  toast.error("Блок пуст");
                                }
                              }}
                              className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                              title="Скопировать текст блока"
                            >
                              <Copy size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const copy = { ...generatedBlocks };
                                delete copy[blockKey];
                                setGeneratedBlocks(copy);
                                toast.success(`Блок ${index + 1} удален`);
                              }}
                              className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                              title="Удалить блок"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Main text area */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] uppercase font-bold text-neutral-400">
                              Текст сценария / реплики диктора
                            </label>
                            {wordsCount > 0 && (
                              <span className="text-[10px] text-neutral-500">
                                Символов: {blockText.length}
                              </span>
                            )}
                          </div>
                          <textarea
                            value={blockText}
                            onChange={(e) => {
                              const val = e.target.value;
                              setGeneratedBlocks(prev => ({
                                ...prev,
                                [blockKey]: { ...(prev[blockKey] || {}), text: val }
                              }));
                            }}
                            rows={5}
                            placeholder="Введите текст для этого блока сценария..."
                            className="w-full bg-neutral-900/60 border border-neutral-800 rounded-xl p-3.5 text-xs text-neutral-200 focus:outline-none focus:border-primary font-sans resize-y leading-relaxed"
                          />
                        </div>

                        {/* Music Prompt */}
                        <div className="pt-2 border-t border-border/30">
                          <div className="space-y-2 bg-neutral-900/40 p-4 rounded-xl border border-neutral-800/80">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-neutral-300 flex items-center gap-1.5">
                                <Music size={13} className="text-accent" /> Музыкальный промт для блока
                              </span>
                              <button
                                disabled={generatingBlockMusicKey === blockKey}
                                onClick={async () => {
                                  setGeneratingBlockMusicKey(blockKey);
                                  try {
                                    const isCustomEnabled = safeStorage.getItem('yt_custom_instructions_enabled') === 'true';
                                    const customInst = isCustomEnabled ? (safeStorage.getItem('yt_custom_instructions') || '') : '';
                                    const promptMusicMood = safeStorage.getItem('prompt_music_mood') || '';
                                    const masterMusicPrompt = safeStorage.getItem('masterMusicPrompt') || '';

                                    const newPrompt = await generateBlockMusicPrompt(
                                      currentTitle,
                                      block.text || '',
                                      scriptTopic || 'Тема видео',
                                      block.mood,
                                      {
                                        model: activeModel,
                                        customInstructions: customInst,
                                        globalMusicMood: promptMusicMood || masterMusicPrompt,
                                        toneOfVoice: scriptTone,
                                        niche: nicheData?.title
                                      },
                                      blockKey > 0 ? generatedBlocks[blockKey - 1]?.musicPrompt : undefined
                                    );

                                    setGeneratedBlocks(prev => ({
                                      ...prev,
                                      [blockKey]: { ...(prev[blockKey] || {}), musicPrompt: newPrompt }
                                    }));
                                    toast.success(`Музыкальный промпт для блока сгенерирован ИИ!`);
                                  } catch (e: any) {
                                    toast.error(e.message || "Ошибка генерации музыкального промпта");
                                  } finally {
                                    setGeneratingBlockMusicKey(null);
                                  }
                                }}
                                className="text-[10px] font-bold text-accent hover:underline cursor-pointer flex items-center gap-1 disabled:opacity-50"
                              >
                                {generatingBlockMusicKey === blockKey ? (
                                  <><Loader2 size={11} className="animate-spin" /> Анализ...</>
                                ) : (
                                  <><Sparkles size={11} /> AI Промт</>
                                )}
                              </button>
                            </div>
                            <textarea
                              value={block.musicPrompt || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setGeneratedBlocks(prev => ({
                                  ...prev,
                                  [blockKey]: { ...(prev[blockKey] || {}), musicPrompt: val }
                                }));
                              }}
                              rows={2}
                              placeholder="Промт для генерации фоновой музыки (Suno / Udio / ElevenLabs)..."
                              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-[11px] text-neutral-200 resize-none"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Next Steps: Chapters & Prompts Navigation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Chapters & Timestamps */}
                <div className="bg-surface border border-border/80 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                      <Clock size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Таймкоды и Главы YouTube</h4>
                      <p className="text-xs text-neutral-400 mt-0.5">Настройте таймкоды глав вручную или с помощью ИИ и отправьте их в SEO описание</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveSubView("chapters");
                      const el = document.getElementById("script-subtabs-bar");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-primary rounded-xl text-xs font-bold border border-primary/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>Открыть панель глав</span>
                    <ArrowRight size={14} />
                  </button>
                </div>

                {/* Separate Prompts and Scenes Generation */}
                {handleSelectBlockAndScrollToPrompts && (
                  <div className="bg-surface border border-border/80 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-accent/10 text-accent border border-accent/20 shrink-0">
                        <Sparkles size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Промптинг и Техплан сцен</h4>
                        <p className="text-xs text-neutral-400 mt-0.5">Перейти во вкладку «Промтинг», чтобы разбить сценарий на сцены и сгенерировать ИИ-промпты</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSelectBlockAndScrollToPrompts("all")}
                      className="w-full py-2.5 bg-accent hover:bg-accent/80 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Sparkles size={14} />
                      <span>Перейти к генерации промптов</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}



          {activeSubView === "chapters" && (
            <ErrorBoundary isSection sectionName="Главы и таймкоды">
              <ScriptChaptersEditor
                scriptBlocks={generatedBlocks}
                scriptStructure={scriptStructure}
                scriptTopic={scriptTopic}
                selectedIdea={selectedIdea}
                activeModel={activeModel}
                onNavigateToSEO={onNavigateToSEO}
              />
            </ErrorBoundary>
          )}

          {activeSubView === "recommendations" && (
            <ScriptRecommendations
              scriptImprovements={scriptRecommendations || []}
              isAnalyzingScript={Boolean(isGeneratingRecommendations)}
              isApplyingImprovement={isApplyingImprovement || {}}
              isApplyingAll={Boolean(isApplyingAllRecs)}
              hasGeneratedAnyBlock={Object.keys(generatedBlocks || {}).length > 0}
              onAnalyzeScript={handleGenerateScriptRecommendations || (() => {})}
              onApplyImprovement={handleApplyScriptRecommendation || (() => {})}
              onApplyAllRecommendations={handleApplyAllRecommendations || (async () => {})}
              onParseAndAddRecommendations={handleParseAndAddRecommendations || (async () => {})}
              onAddCustomRecommendation={handleAddCustomRecommendation || (() => {})}
              onRemoveImprovement={handleRemoveImprovement || (() => {})}
              onClearAllImprovements={handleClearAllImprovements || (() => {})}
            />
          )}

          {activeSubView === "timeline" && handleSaveScriptVersion && handleLoadScriptVersion && handleDeleteScriptVersion && handleRenameScriptVersion && (
            <ScriptTimeline
              versions={scriptVersions}
              activeVersionId={activeVersionId}
              currentBlocks={generatedBlocks}
              currentStructure={scriptStructure}
              currentTopic={scriptTopic}
              onSaveVersion={handleSaveScriptVersion}
              onLoadVersion={handleLoadScriptVersion}
              onDeleteVersion={handleDeleteScriptVersion}
              onRenameVersion={handleRenameScriptVersion}
              onOpenDiffModal={handleOpenDiffModal || (() => {})}
            />
          )}
        </div>
      )}

      {/* Modal for pasting custom script */}
      {isPasteScriptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-surface border border-border rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-accent/10 text-accent">
                  <Edit3 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Вставить текст сценария</h3>
                  <p className="text-xs text-neutral-400">ИИ автоматически разобьет текст на блоки и подготовит для озвучки & TTS</p>
                </div>
              </div>
              <button
                onClick={() => setIsPasteScriptModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <textarea
              value={pastedScriptText}
              onChange={(e) => setPastedScriptText(e.target.value)}
              placeholder="Вставьте сюда текст вашего сценария. Можно использовать заголовки (# Заголовок или [Заголовок]) или обычные абзацы..."
              rows={10}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-sm text-neutral-200 focus:outline-none focus:border-primary font-mono leading-relaxed resize-y"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setPastedScriptText("");
                  setIsPasteScriptModalOpen(false);
                }}
                className="px-4 py-2 text-xs font-bold text-neutral-400 hover:text-white rounded-xl cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  if (!pastedScriptText.trim()) {
                    toast.error("Пожалуйста, введите текст сценария");
                    return;
                  }
                  applyCustomScriptContent(pastedScriptText);
                  setPastedScriptText("");
                  setIsPasteScriptModalOpen(false);
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-black font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
              >
                Загрузить в сценарий & TTS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subtitles Modal (TXT, SRT, SBV) */}
      <SubtitlesModal
        isOpen={isSubtitlesModalOpen}
        onClose={() => setIsSubtitlesModalOpen(false)}
        scriptText={fullScriptText}
        title={scriptTopic || "Сценарий"}
        isShorts={false}
        activeModel={activeModel}
      />
    </div>
  );
};
