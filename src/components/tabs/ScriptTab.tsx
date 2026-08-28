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
  Edit3
} from "lucide-react";
import { toast } from "sonner";
import { ScriptTimeline, type ScriptVersion } from "../ScriptTimeline";
import { ScriptRecommendations } from "../ScriptRecommendations";
import { BeautifulScriptRenderer } from "../BeautifulScriptRenderer";
import { GlobalTTSHeaderBar } from "../SpeakerTTSMarkupSection";
import { getFullScriptText, copyToClipboard as copyTextToClipboard } from "../../utils/helpers";

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
  handleGenerateScriptRecommendations?: () => void;
  handleApplyScriptRecommendation?: (rec: any, index: number) => void;
  ttsVoiceEngine?: any;
  setTtsVoiceEngine?: (engine: any) => void;
  ttsWpm?: number;
  setTtsWpm?: (wpm: number) => void;
  handleSelectBlockAndScrollToPrompts?: (blockIdx: number | "all") => void;
  renderIdeaBanner?: () => React.ReactNode;
  activeModel?: string;
  copyToClipboard?: (text: string, section?: string) => void;
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
  handleGenerateScriptRecommendations,
  handleApplyScriptRecommendation,
  ttsVoiceEngine = "elevenlabs",
  setTtsVoiceEngine,
  ttsWpm = 140,
  setTtsWpm,
  handleSelectBlockAndScrollToPrompts,
  renderIdeaBanner,
  activeModel,
  copyToClipboard,
}) => {
  const hasBlocks = generatedBlocks && Object.keys(generatedBlocks).length > 0;
  const [activeSubView, setActiveSubView] = useState<"script" | "editor" | "tts" | "recommendations" | "timeline">("editor");

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

  // Upload Custom Script File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      // Parse paragraphs or blocks separated by double newlines or headings
      const parts = content.split(/\n\s*\n/).filter(Boolean);
      const newBlocks: Record<number, any> = {};
      parts.forEach((part, idx) => {
        const lines = part.split("\n");
        const title = lines[0].length < 60 ? lines[0] : `Блок ${idx + 1}`;
        const text = lines[0].length < 60 ? lines.slice(1).join("\n") || lines[0] : part;
        newBlocks[idx + 1] = {
          blockNumber: idx + 1,
          blockTitle: title.replace(/^[#*-\d\.\s]+/, "") || `Блок ${idx + 1}`,
          text: text.trim(),
          timeRange: `0:00 - 1:00`,
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
      });

      setGeneratedBlocks(newBlocks);
      toast.success(`Сценарий успешно загружен (${parts.length} блоков)!`);
    };
    reader.readAsText(file);
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

        {/* Upload Custom Script Button */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 rounded-xl text-xs font-bold border border-neutral-800 transition-all cursor-pointer">
            <Upload size={14} className="text-primary" />
            <span>Загрузить свой сценарий</span>
            <input type="file" accept=".txt,.md,.doc,.docx" onChange={handleFileUpload} className="hidden" />
          </label>
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
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Хронометраж</label>
              <select
                value={scriptDuration}
                onChange={(e) => setScriptDuration(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-primary cursor-pointer font-sans"
              >
                <option value="0.5">⏱️ Shorts (30 сек) ~ 70 слов</option>
                <option value="1">⏱️ Shorts/Reels (60 сек) ~ 140 слов</option>
                <option value="3">⏱️ Короткое видео (3 мин)</option>
                <option value="5">⏱️ Стандартное видео (5 мин)</option>
                <option value="10">⏱️ Длинное видео (10 мин)</option>
                <option value="custom">🛠️ Свой вариант...</option>
              </select>
            </div>

            {scriptDuration === "custom" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-1">
                <input
                  type="text"
                  value={scriptCustomDuration}
                  onChange={(e) => setScriptCustomDuration(e.target.value)}
                  placeholder="Например: 15 минут, 45 секунд..."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-primary font-sans"
                />
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
                Блоки и Редактор
              </button>
              <button
                onClick={() => setActiveSubView("script")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSubView === "script" ? "bg-primary text-black" : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                }`}
              >
                Красивый просмотр
              </button>
              {setTtsVoiceEngine && (
                <button
                  onClick={() => setActiveSubView("tts")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeSubView === "tts" ? "bg-primary text-black" : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                  }`}
                >
                  Озвучка и TTS
                </button>
              )}
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

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyScript}
                className="flex items-center gap-1.5 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 rounded-xl text-xs font-bold border border-neutral-800 transition-all cursor-pointer"
              >
                <Copy size={14} className="text-accent" />
                <span>Скопировать весь текст</span>
              </button>
            </div>
          </div>

          {/* Sub-view Content: Editor (Block Breakdown, Titles, Text editing, Voiceover, Music prompt) */}
          {activeSubView === "editor" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers size={16} className="text-primary" />
                  Разбивка сценария на блоки ({Object.keys(generatedBlocks).length})
                </h4>
                <button
                  onClick={() => {
                    const keys = Object.keys(generatedBlocks).map(Number);
                    const nextKey = keys.length > 0 ? Math.max(...keys) + 1 : 1;
                    setGeneratedBlocks(prev => ({
                      ...prev,
                      [nextKey]: {
                        blockNumber: nextKey,
                        blockTitle: `Новый блок ${nextKey}`,
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
                {Object.entries(generatedBlocks).map(([keyStr, block]: [string, any], index: number) => {
                  const blockKey = Number(keyStr);
                  return (
                    <div key={`script-block-${blockKey}`} className="bg-surface border border-border rounded-2xl p-5 space-y-4 shadow-md">
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/40">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-mono font-bold text-xs">
                            {index + 1}
                          </span>
                          <input
                            type="text"
                            value={block.blockTitle || `Блок ${blockKey}`}
                            onChange={(e) => {
                              const val = e.target.value;
                              setGeneratedBlocks(prev => ({
                                ...prev,
                                [blockKey]: { ...(prev[blockKey] || {}), blockTitle: val }
                              }));
                            }}
                            placeholder="Название блока (например, Хук, Завязка)..."
                            className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-primary flex-1 max-w-sm"
                          />
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
                          />
                          <button
                            onClick={() => {
                              const copy = { ...generatedBlocks };
                              delete copy[blockKey];
                              setGeneratedBlocks(copy);
                              toast.success("Блок удален");
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
                        <label className="text-[10px] uppercase font-bold text-neutral-400">Текст озвучки / сценария для этого блока</label>
                        <textarea
                          value={block.text || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setGeneratedBlocks(prev => ({
                              ...prev,
                              [blockKey]: { ...(prev[blockKey] || {}), text: val }
                            }));
                          }}
                          rows={4}
                          placeholder="Введите текст для этого блока сценария..."
                          className="w-full bg-neutral-900/60 border border-neutral-800 rounded-xl p-3.5 text-xs text-neutral-200 focus:outline-none focus:border-primary font-sans resize-y"
                        />
                      </div>

                      {/* Voiceover settings (Scene & Sample Context) & Music Prompt */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/30">
                        {/* Voiceover / TTS Markup settings */}
                        <div className="space-y-2 bg-neutral-900/40 p-3 rounded-xl border border-neutral-800/80">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-neutral-300 flex items-center gap-1.5">
                              <Volume2 size={13} className="text-primary" /> Настройки диктора (Scene / Context)
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] text-neutral-500 uppercase font-bold">Интонация</label>
                              <input
                                type="text"
                                value={block.voiceover?.intonation || "Интригующая"}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setGeneratedBlocks(prev => ({
                                    ...prev,
                                    [blockKey]: {
                                      ...(prev[blockKey] || {}),
                                      voiceover: { ...(prev[blockKey]?.voiceover || {}), intonation: val }
                                    }
                                  }));
                                }}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1 text-[11px] text-neutral-200"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-neutral-500 uppercase font-bold">Настроение</label>
                              <input
                                type="text"
                                value={block.voiceover?.mood || "Динамичный"}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setGeneratedBlocks(prev => ({
                                    ...prev,
                                    [blockKey]: {
                                      ...(prev[blockKey] || {}),
                                      voiceover: { ...(prev[blockKey]?.voiceover || {}), mood: val }
                                    }
                                  }));
                                }}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1 text-[11px] text-neutral-200"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[9px] text-neutral-500 uppercase font-bold">Контекст сцены (Sample Context)</label>
                            <input
                              type="text"
                              value={block.voiceover?.sampleContext || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setGeneratedBlocks(prev => ({
                                  ...prev,
                                  [blockKey]: {
                                    ...(prev[blockKey] || {}),
                                    voiceover: { ...(prev[blockKey]?.voiceover || {}), sampleContext: val }
                                  }
                                }));
                              }}
                              placeholder="Например: говорить энергично с паузой для интриги..."
                              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1 text-[11px] text-neutral-200"
                            />
                          </div>
                        </div>

                        {/* Music Prompt */}
                        <div className="space-y-2 bg-neutral-900/40 p-3 rounded-xl border border-neutral-800/80">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-neutral-300 flex items-center gap-1.5">
                              <Music size={13} className="text-accent" /> Музыкальный промт для блока
                            </span>
                            <button
                              onClick={() => {
                                const randomPrompts = [
                                  "Cinematic dark ambient synthwave, 120 bpm, mysterious tension",
                                  "Epic orchestral buildup with dramatic brass and ticking clock",
                                  "Lo-fi chill hop beat, relaxing rhythm, warm Rhodes piano",
                                  "Cyberpunk futuristic bass, intense electronic drive"
                                ];
                                const randomPrompt = randomPrompts[Math.floor(Math.random() * randomPrompts.length)];
                                setGeneratedBlocks(prev => ({
                                  ...prev,
                                  [blockKey]: { ...(prev[blockKey] || {}), musicPrompt: randomPrompt }
                                }));
                                toast.success("Музыкальный промт сгенерирован!");
                              }}
                              className="text-[10px] font-bold text-accent hover:underline cursor-pointer"
                            >
                              AI Промт
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
                            rows={3}
                            placeholder="Промт для генерации фоновой музыки (Suno / Udio / ElevenLabs)..."
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-[11px] text-neutral-200 resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeSubView === "script" && (
            <div className="space-y-6">
              <BeautifulScriptRenderer scriptText={fullScriptText} />
            </div>
          )}

          {activeSubView === "tts" && setTtsVoiceEngine && setTtsWpm && (
            <GlobalTTSHeaderBar
              voiceEngine={ttsVoiceEngine || "google"}
              setVoiceEngine={setTtsVoiceEngine}
              wordsPerMinute={ttsWpm || 140}
              setWordsPerMinute={setTtsWpm}
              scriptBlocks={generatedBlocks}
              selectedModel={activeModel}
              onUpdateBlockText={(idx, newText) => {
                setGeneratedBlocks(prev => ({
                  ...prev,
                  [idx]: { ...(prev[idx] || {}), text: newText }
                }));
              }}
            />
          )}

          {activeSubView === "recommendations" && (
            <ScriptRecommendations
              scriptImprovements={scriptRecommendations || []}
              isAnalyzingScript={Boolean(isGeneratingRecommendations)}
              isApplyingImprovement={{}}
              isApplyingAll={false}
              hasGeneratedAnyBlock={Object.keys(generatedBlocks || {}).length > 0}
              onAnalyzeScript={handleGenerateScriptRecommendations || (() => {})}
              onApplyImprovement={handleApplyScriptRecommendation || (() => {})}
              onApplyAllRecommendations={async () => {}}
              onParseAndAddRecommendations={async () => {}}
              onAddCustomRecommendation={() => {}}
              onRemoveImprovement={() => {}}
              onClearAllImprovements={() => {}}
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
    </div>
  );
};
