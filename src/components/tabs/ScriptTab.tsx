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
  FileCode
} from "lucide-react";
import { toast } from "sonner";
import { ScriptTimeline, type ScriptVersion } from "../ScriptTimeline";
import { ScriptRecommendations } from "../ScriptRecommendations";
import { BeautifulScriptRenderer } from "../BeautifulScriptRenderer";
import { SpeakerTTSMarkupSection } from "../SpeakerTTSMarkupSection";
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
  syncStatus?: "saving" | "saved" | "idle";
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
  handleApplyScriptRecommendation?: (rec: any) => void;
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
  const [activeSubView, setActiveSubView] = useState<"script" | "tts" | "recommendations" | "timeline">("script");

  const fullScriptText = getFullScriptText(generatedBlocks);

  const handleCopyScript = () => {
    if (!fullScriptText) {
      toast.error("Сценарий пуст для копирования");
      return;
    }
    if (copyToClipboard) {
      copyToClipboard(fullScriptText, "Сценарий");
    } else {
      copyTextToClipboard(fullScriptText, "Сценарий");
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
            Генерируйте профессиональные сценарии с захватывающими хуками, удержанием внимания и разметкой сцен.
          </p>
        </div>

        {/* Preset Topic Selection */}
        {selectedIdea && (
          <div className="bg-neutral-900 border border-neutral-800 p-2.5 rounded-2xl flex items-center gap-3 max-w-md">
            <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 text-accent">
              <Lightbulb size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Выбранная идея</p>
              <p className="text-xs text-neutral-200 truncate font-semibold">{selectedIdea}</p>
            </div>
            <button
              onClick={() => {
                setScriptTopic(selectedIdea);
                if (setIsScriptTopicLocked) setIsScriptTopicLocked(true);
                toast.success("Идея установлена в качестве темы сценария!");
              }}
              className="ml-auto text-[10px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-2.5 py-1.5 rounded-xl border border-neutral-700 font-bold shrink-0 transition-all cursor-pointer"
            >
              Применить
            </button>
          </div>
        )}
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
          {/* Sub-view switcher & Action bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-surface p-3 rounded-2xl border border-border">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveSubView("script")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSubView === "script" ? "bg-primary text-black" : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                }`}
              >
                Сценарий
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

          {/* Sub-view Content */}
          {activeSubView === "script" && (
            <div className="space-y-6">
              <BeautifulScriptRenderer scriptText={fullScriptText} />
            </div>
          )}

          {activeSubView === "tts" && setTtsVoiceEngine && setTtsWpm && (
            <SpeakerTTSMarkupSection
              generatedBlocks={generatedBlocks}
              ttsVoiceEngine={ttsVoiceEngine}
              setTtsVoiceEngine={setTtsVoiceEngine}
              ttsWpm={ttsWpm}
              setTtsWpm={setTtsWpm}
            />
          )}

          {activeSubView === "recommendations" && (
            <ScriptRecommendations
              scriptTopic={scriptTopic}
              generatedBlocks={generatedBlocks}
              recommendations={scriptRecommendations}
              isGenerating={isGeneratingRecommendations}
              onGenerate={handleGenerateScriptRecommendations || (() => {})}
              onApplyRecommendation={handleApplyScriptRecommendation || (() => {})}
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