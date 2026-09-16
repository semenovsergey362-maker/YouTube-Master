import React from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  Film,
  Scissors,
  Palette,
  Search,
  Layers,
  Download,
  Loader2,
  TrendingUp,
  Sparkles,
  X,
  Hash,
  RefreshCw,
  Camera,
  Music,
  FileText,
  Gauge,
  Heart,
  Activity,
  Copy,
  Subtitles,
  Flame,
  CheckCircle2,
  Zap,
  Target,
  Compass,
  HelpCircle,
  Play,
  Trash2,
  Check,
  ShieldCheck,
  Table,
  FileCode,
  PlusCircle,
  BarChart3,
  AlertTriangle,
  AlertCircle,
  FileJson,
} from "lucide-react";
import { getFullScriptText, exportToCSV, exportToMarkdown, copyToClipboard } from "../../utils/helpers";
import { optimizeTitle, type CutShortItem, type NicheData, type GeneratedBlock, type ShortsOutlierIdea } from "../../services/geminiService";
import { useShortsGeneration } from "../../hooks/useShortsGeneration";
import { SubtitlesModal } from "../SubtitlesModal";
import { ShortsIdeasExportModal } from "../ShortsIdeasExportModal";
import { AddCustomShortModal } from "../AddCustomShortModal";
import { ShortsJsonImportExportModal } from "../modals/ShortsJsonImportExportModal";
import { formatShortsIdeasToCSV, formatShortsIdeasToMarkdown } from "../../utils/shortsExportHelper";
import { SocialPromoSection } from "../common/SocialPromoSection";
import { IdeaCardContextMenu, computeCardColorStyles } from "../common/IdeaCardContextMenu";
import { IdeaPlaylistSuggestionBanner } from "../common/IdeaPlaylistSuggestionBanner";

export interface ShortsTabProps {
  nicheData: NicheData | null;
  selectedBranding?: any;
  generatedBlocks: Record<number, GeneratedBlock>;
  renderIdeaBanner?: () => React.ReactNode;
  shorts: ReturnType<typeof useShortsGeneration>;
}

export const ShortsTab: React.FC<ShortsTabProps> = ({
  nicheData,
  selectedBranding,
  generatedBlocks,
  renderIdeaBanner,
  shorts,
}) => {
  if (!nicheData) return null;

  const {
    shortsActiveSubTab = "outliers",
    setShortsActiveSubTab = () => {},
    outlierAnalysis = null,
    setOutlierAnalysis = () => {},
    outlierIdeas = [],
    setOutlierIdeas = () => {},
    isAnalyzingOutliers = false,
    isGeneratingIdeaScript = {},
    customCompetitorInput = "",
    setCustomCompetitorInput = () => {},
    customOutlierPrompt = "",
    setCustomOutlierPrompt = () => {},
    handleAnalyzeCompetitorOutliers = () => {},
    handleGenerateScriptFromOutlierIdea = () => {},
    handleClearOutlierMemory = () => {},
    handleDeleteOutlierIdea = () => {},
    longFormScriptToCut = "",
    setLongFormScriptToCut = () => {},
    cutShortsResults = [],
    isCuttingLongForm = false,
    selectedShortForVisuals = null,
    setSelectedShortForVisuals = () => {},
    shortsVisuals = [],
    shortsMusicPrompt = "",
    isGeneratingShortsVisuals = false,
    selectedShortForSeo = "",
    setSelectedShortForSeo = () => {},
    shortsSeoResult = null,
    shortsSeoAnalysis = null,
    isAnalyzingShortsSeoAudit = false,
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
    isAnalyzingShortsCtr,
    isGeneratingShortsHashtags,
    shortsHashtagsResult,
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
    handleExportShortsZip,
    handleAddCustomIdea,
    handleAddCustomDirectScript,
  } = shorts;

  const getAreaLabel = (area?: string) => {
    if (!area) return "Оптимизация";
    const a = area.toLowerCase().trim();
    if (a.includes("title") || a.includes("заголов")) return "Заголовок";
    if (a.includes("desc") || a.includes("описан")) return "Описание";
    if (a.includes("kw") || a.includes("key") || a.includes("ключ") || a.includes("тег")) return "Ключевые слова";
    if (a.includes("hash") || a.includes("хеш")) return "Хештеги";
    if (a.includes("comment") || a.includes("коммент")) return "Закрепленный комментарий";
    if (a.includes("rule") || a.includes("правил")) return "Кастомное правило";
    return area;
  };

  const getImpactLabel = (impact?: string) => {
    const imp = (impact || "").toLowerCase().trim();
    if (imp === "high") return "Высокий приоритет";
    if (imp === "medium") return "Средний приоритет";
    if (imp === "low") return "Низкий приоритет";
    return impact || "Рекомендация";
  };

  const currentSeoToShow =
    cutShortsResults.find(
      (item) =>
        item.loopEnding?.loopedFullScript === selectedShortForSeo ||
        item.script === selectedShortForSeo
    )?.seo || shortsSeoResult;

  const [isAddCustomModalOpen, setIsAddCustomModalOpen] = React.useState(false);
  const [subtitlesModalData, setSubtitlesModalData] = React.useState<{
    isOpen: boolean;
    script: string;
    title: string;
  }>({
    isOpen: false,
    script: "",
    title: "",
  });

  const [isIdeasExportModalOpen, setIsIdeasExportModalOpen] = React.useState(false);
  const [isJsonModalOpen, setIsJsonModalOpen] = React.useState(false);
  const [copiedIdeaId, setCopiedIdeaId] = React.useState<string | null>(null);
  const [contextMenuShort, setContextMenuShort] = React.useState<{ id: string; title: string; position: { x: number; y: number } } | null>(null);

  const handleImportIdeasFromJson = (newIdeas: ShortsOutlierIdea[], mode: "append" | "replace") => {
    if (mode === "replace") {
      setOutlierIdeas(newIdeas);
    } else {
      setOutlierIdeas((prev) => {
        const existingIds = new Set(prev.map((item) => item.id));
        const filteredNew = newIdeas.filter((item) => !existingIds.has(item.id));
        return [...prev, ...filteredNew];
      });
    }
  };

  const handleCopyText = (text: string, id: string, label: string) => {
    copyToClipboard(text);
    setCopiedIdeaId(id);
    toast.success(`${label} скопирован в буфер обмена!`);
    setTimeout(() => setCopiedIdeaId(null), 2000);
  };

  const handleOpenSubtitlesModal = (script: string, title?: string) => {
    if (!script || !script.trim()) {
      toast.error("Сценарий Shorts пуст");
      return;
    }
    setSubtitlesModalData({
      isOpen: true,
      script,
      title: title || "Shorts",
    });
  };

  return (
    <div className="space-y-6" id="shorts-tab-root">
      {renderIdeaBanner && renderIdeaBanner()}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/80 px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
            <Film className="text-accent" size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-neutral-500">Shorts System</div>
            <h3 className="text-lg font-bold text-white truncate">
              Генератор Shorts & Reels
              {selectedBranding ? ` · ${selectedBranding.name}` : ""}
            </h3>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="shorts-add-custom-top-btn"
            onClick={() => setIsAddCustomModalOpen(true)}
            className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer text-[10px] shadow-sm shadow-amber-500/20"
            title="Добавить свою идею или готовый сценарий для Shorts"
          >
            <PlusCircle size={13} className="text-neutral-950" />
            <span>Добавить свой Shorts</span>
          </button>

          <button
            id="shorts-subtitles-top-btn"
            onClick={() => {
              const activeScript =
                selectedShortForVisuals ||
                selectedShortForSeo ||
                (cutShortsResults[0]?.loopEnding?.loopedFullScript || cutShortsResults[0]?.script) ||
                "";
              const activeTitle =
                cutShortsResults.find(
                  (item) =>
                    item.loopEnding?.loopedFullScript === activeScript ||
                    item.script === activeScript
                )?.title || "Shorts";

              if (!activeScript) {
                toast.error("Сначала сгенерируйте сценарии Shorts");
                return;
              }
              handleOpenSubtitlesModal(activeScript, activeTitle);
            }}
            className="px-3 py-1.5 bg-gradient-to-r from-primary/15 to-emerald-500/15 hover:from-primary/25 hover:to-emerald-500/25 text-primary border border-primary/30 rounded-lg font-bold transition-all flex items-center gap-2 cursor-pointer text-[10px] shadow-sm"
            title="Создать и экспортировать субтитры в формате TXT, SRT, SBV для Shorts"
          >
            <Subtitles size={13} className="text-primary" />
            <span>Субтитры (SRT, SBV, TXT)</span>
          </button>

          <button
            id="shorts-export-ideas-top-btn"
            onClick={() => {
              if (outlierIdeas.length === 0 && cutShortsResults.length === 0) {
                toast.info("Сначала сгенерируйте идеи в разделе «ИИ-Аналитик: Новые Shorts» или нарезки сценария");
                return;
              }
              setIsIdeasExportModalOpen(true);
            }}
            className="px-3 py-1.5 bg-gradient-to-r from-amber-500/15 via-yellow-500/15 to-orange-500/15 hover:from-amber-500/25 hover:to-orange-500/25 text-amber-300 border border-amber-500/30 rounded-lg font-bold transition-all flex items-center gap-2 cursor-pointer text-[10px] shadow-sm"
            title="Экспорт списка идей Shorts в Excel/CSV, Markdown, TXT, PDF, JSON или буфер обмена"
          >
            <Table size={13} className="text-amber-400" />
            <span>Экспорт идей</span>
            {(outlierIdeas.length > 0 || cutShortsResults.length > 0) && (
              <span className="px-1.5 py-0.2 bg-amber-500/30 text-amber-200 rounded-full text-[9px] font-bold">
                {outlierIdeas.length || cutShortsResults.length}
              </span>
            )}
          </button>

          <button
            id="shorts-json-import-export-btn"
            onClick={() => setIsJsonModalOpen(true)}
            className="px-3 py-1.5 bg-gradient-to-r from-amber-500/15 via-yellow-500/15 to-orange-500/15 hover:from-amber-500/25 hover:to-orange-500/25 text-amber-300 border border-amber-500/30 rounded-lg font-bold transition-all flex items-center gap-2 cursor-pointer text-[10px] shadow-sm"
            title="Импорт и экспорт тем Shorts в формате JSON"
          >
            <FileJson size={13} className="text-amber-400" />
            <span>JSON Тем</span>
          </button>

          <button
            id="shorts-apply-longform-seo-btn"
            onClick={() => handleApplyLongFormSeoToShorts()}
            className="px-3 py-1.5 bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-600/15 hover:from-amber-500/25 hover:to-orange-500/25 text-amber-300 border border-amber-500/30 rounded-lg font-bold transition-all flex items-center gap-2 cursor-pointer text-[10px] shadow-sm"
            title="Перенести ключевые слова и хештеги из вкладки SEO (для длинных видео) в активный Shorts для поддержания единства метаданных на канале"
          >
            <Layers size={13} className="text-amber-400" />
            <span>SEO в Shorts</span>
          </button>
          <button
            id="shorts-download-zip-btn"
            onClick={handleExportShortsZip}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-bold transition-colors flex items-center gap-2 cursor-pointer border border-neutral-700 text-[10px]"
            title="Экспорт активного сценария, промптов и SEO в ZIP"
          >
            <Download size={13} />
            ZIP
          </button>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="sticky top-16 z-30 bg-neutral-950/90 backdrop-blur-md py-3 border-b border-neutral-800/80 -mx-4 px-4 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8 flex gap-5 overflow-x-auto scrollbar-none mb-4">
        {[
          { id: "outliers", label: "ИИ-Аналитик: Новые Shorts (10 идей)", icon: Flame, badge: outlierIdeas.length > 0 ? outlierIdeas.length : undefined },
          { id: "cut", label: "Умная нарезка Long-Form", icon: Scissors, badge: cutShortsResults.length > 0 ? cutShortsResults.length : undefined },
          { id: "visuals", label: "Визуализация", icon: Palette },
          { id: "seo", label: "SEO", icon: Search },
        ].map((tab, tIdx) => {
          const IconComp = tab.icon;
          const isActive = shortsActiveSubTab === tab.id;
          return (
            <button
              key={`short-tab-${tab.id}-${tIdx}`}
              id={`shorts-subtab-${tab.id}`}
              onClick={() => setShortsActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 pb-1 text-sm font-semibold transition-all relative cursor-pointer whitespace-nowrap ${
                isActive ? "text-amber-400 font-bold" : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <IconComp size={16} className={isActive ? "text-amber-400" : "text-neutral-400"} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                  isActive ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "bg-neutral-800 text-neutral-400"
                }`}>
                  {tab.badge}
                </span>
              )}
              {isActive && (
                <motion.div
                  layoutId="activeShortsSubTabLine"
                  className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 rounded-full"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Content for subtabs */}
      {shortsActiveSubTab === "outliers" && (
        <div className="space-y-6" id="shorts-outliers-container">
          {/* Main Control Panel */}
          <div className="bg-neutral-900 border border-neutral-800/80 p-5 rounded-2xl space-y-4 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Flame className="text-amber-400" size={20} />
                  Поиск аутлаеров конкурентов и генерация 10 идей
                </h4>
                <p className="text-xs text-neutral-400 mt-1 max-w-3xl leading-relaxed">
                  ИИ находит видео-аутлаеры (набравшие &ge;2x просмотров от медианы каналов ниши), строит формулу успеха, исключает темы ваших существующих видео и генерирует 10 реализуемых идей с готовыми хуками.
                </p>
              </div>

              {outlierAnalysis?.framework && (
                <div className="flex items-center gap-2 self-start md:self-auto">
                  <span className="text-[11px] px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-full font-medium flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-amber-400" />
                    Память ниши активна
                  </span>
                  <button
                    onClick={handleClearOutlierMemory}
                    className="text-[11px] px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg border border-neutral-700 cursor-pointer transition-colors"
                    title="Сбросить сохранённый фреймворк ниши и начать заново"
                  >
                    Сбросить
                  </button>
                </div>
              )}
            </div>

            {/* Input Options Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 border-t border-neutral-800/60">
              {/* Competitors Source */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
                  <span>Каналы конкурентов для анализа</span>
                  <span className="text-[10px] text-neutral-400 font-normal">
                    {nicheData.competitors && nicheData.competitors.length > 0
                      ? `Найдено в нише: ${nicheData.competitors.length}`
                      : "Ввод вручную"}
                  </span>
                </label>
                
                {nicheData.competitors && nicheData.competitors.length > 0 ? (
                  <div className="p-2.5 bg-neutral-950/70 border border-neutral-800 rounded-xl space-y-1.5 max-h-24 overflow-y-auto text-xs scrollbar-thin">
                    <div className="flex flex-wrap gap-1.5">
                      {nicheData.competitors.map((c, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-neutral-800/80 border border-neutral-700 text-neutral-200 rounded-md text-[11px]">
                          {c.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-neutral-950/40 border border-neutral-800/60 rounded-xl text-xs text-neutral-400">
                    Каналы будут исследованы автоматически по нише «{nicheData.niche}».
                  </div>
                )}

                <input
                  type="text"
                  value={customCompetitorInput}
                  onChange={(e) => setCustomCompetitorInput(e.target.value)}
                  placeholder="Доп. каналы или ключевые слова (через запятую)..."
                  className="w-full text-xs px-3 py-2 bg-neutral-950/90 border border-neutral-800 focus:border-amber-500/50 rounded-xl text-white outline-none transition-colors placeholder:text-neutral-600"
                />
              </div>

              {/* Angle / Additional Preferences */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
                  <span>Дополнительный угол или акцент (опционально)</span>
                  <span className="text-[10px] text-neutral-400 font-normal">Канон / тон / фокус</span>
                </label>
                <textarea
                  value={customOutlierPrompt}
                  onChange={(e) => setCustomOutlierPrompt(e.target.value)}
                  placeholder="Например: Сфокусируйся на малоизвестных фактах, без призывов к подписке, держи хронометраж до 45 секунд..."
                  rows={3}
                  className="w-full text-xs p-2.5 bg-neutral-950/90 border border-neutral-800 focus:border-amber-500/50 rounded-xl text-white outline-none transition-colors resize-none placeholder:text-neutral-600"
                />
              </div>
            </div>

            {/* Launch Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                <span>Фильтр повторов: существующие видео вашего канала будут автоматически исключены.</span>
              </div>

              <button
                id="run-outliers-analysis-btn"
                onClick={() => handleAnalyzeCompetitorOutliers()}
                disabled={isAnalyzingOutliers}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-50 text-neutral-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isAnalyzingOutliers ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Анализируем аутлаеры ниши...</span>
                  </>
                ) : (
                  <>
                    <Flame size={16} />
                    <span>{outlierIdeas.length > 0 ? "Перезапустить анализ и выдать 10 новых идей" : "Найти аутлаеры и сгенерировать 10 идей"}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Section 1: Outlier Analysis Breakdown & Niche Framework (Task 1 & Task 2) */}
          {outlierAnalysis && (
            <div className="bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-950 border border-amber-500/30 rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
                    <Target size={18} />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-white">
                      Разбор аутлаеров и Формула успеха ниши
                    </h5>
                    <p className="text-[11px] text-neutral-400">
                      Сводка закономерностей вирусных Shorts (&ge;2x просмотров)
                    </p>
                  </div>
                </div>

                {outlierAnalysis.framework && (
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 bg-neutral-800/80 text-amber-300 rounded-md border border-neutral-700">
                    Задача 2: Framework Saved
                  </span>
                )}
              </div>

              {/* Niche Framework Formula Box */}
              {outlierAnalysis.framework && (
                <div className="p-4 bg-amber-950/20 border border-amber-500/40 rounded-xl space-y-1.5">
                  <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Compass size={14} />
                    Формула идеальной темы Shorts для ниши:
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-amber-100 italic">
                    «{outlierAnalysis.framework}»
                  </div>
                </div>
              )}

              {/* Outlier Insights 4-Columns Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                {/* Title Patterns */}
                <div className="p-3 bg-neutral-950/60 border border-neutral-800/80 rounded-xl space-y-2">
                  <div className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                    <Zap size={14} className="text-amber-400" />
                    Паттерны названий
                  </div>
                  <ul className="text-[11px] text-neutral-400 space-y-1">
                    {outlierAnalysis.titlePatterns && outlierAnalysis.titlePatterns.length > 0 ? (
                      outlierAnalysis.titlePatterns.map((p, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-amber-400 font-bold">•</span>
                          <span>{p}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-neutral-500">Паттерны выявлены в формуле</li>
                    )}
                  </ul>
                </div>

                {/* Emotional Triggers */}
                <div className="p-3 bg-neutral-950/60 border border-neutral-800/80 rounded-xl space-y-2">
                  <div className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                    <Heart size={14} className="text-rose-400" />
                    Триггеры эмоций
                  </div>
                  <ul className="text-[11px] text-neutral-400 space-y-1">
                    {outlierAnalysis.emotionalTriggers && outlierAnalysis.emotionalTriggers.length > 0 ? (
                      outlierAnalysis.emotionalTriggers.map((t, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-rose-400 font-bold">•</span>
                          <span>{t}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-neutral-500">Удивление, парадокс, инсайт</li>
                    )}
                  </ul>
                </div>

                {/* Duration & Pacing */}
                <div className="p-3 bg-neutral-950/60 border border-neutral-800/80 rounded-xl space-y-2">
                  <div className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                    <Gauge size={14} className="text-blue-400" />
                    Длина и темп
                  </div>
                  <p className="text-[11px] text-neutral-300 leading-relaxed">
                    {outlierAnalysis.durationInsight || "40-90 секунд. Плотный темп без воды, хук в первые 2 секунды, раскрытие темы до конца."}
                  </p>
                </div>

                {/* Flop / Avoid Topics */}
                <div className="p-3 bg-neutral-950/60 border border-neutral-800/80 rounded-xl space-y-2">
                  <div className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                    <X size={14} className="text-red-400" />
                    Что проваливается
                  </div>
                  <ul className="text-[11px] text-neutral-400 space-y-1">
                    {outlierAnalysis.flopTopics && outlierAnalysis.flopTopics.length > 0 ? (
                      outlierAnalysis.flopTopics.map((f, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-red-400 font-bold">✕</span>
                          <span>{f}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-neutral-500">Абстрактные темы без визуальных якорей</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: 10 Generated Ready-To-Shoot Ideas (Task 3) */}
          {outlierIdeas && outlierIdeas.length > 0 ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-900/60 p-3 rounded-xl border border-neutral-800">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="text-amber-400" size={17} />
                    10 готовых идей для Shorts
                  </h4>
                  <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-full text-xs font-bold">
                    {outlierIdeas.length}
                  </span>
                </div>

                {/* Quick Export Actions & Add Custom */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setIsAddCustomModalOpen(true)}
                    className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title="Добавить свою идею или сценарий Shorts"
                  >
                    <PlusCircle size={12} className="text-amber-400" />
                    <span>+ Своя идея</span>
                  </button>

                  <button
                    onClick={() => setIsJsonModalOpen(true)}
                    className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title="Импортировать или экспортировать список тем Shorts в формате JSON"
                  >
                    <FileJson size={12} className="text-amber-400" />
                    <span>JSON (Импорт / Экспорт)</span>
                  </button>

                  <button
                    onClick={() => {
                      const csv = formatShortsIdeasToCSV(outlierIdeas, {
                        niche: nicheData.niche,
                        channelName: selectedBranding?.name,
                        framework: outlierAnalysis?.framework,
                      });
                      const dateStr = new Date().toISOString().split('T')[0];
                      exportToCSV(csv, `Shorts_Ideas_${dateStr}`);
                      toast.success(`Экспортировано ${outlierIdeas.length} идей в CSV (Excel)!`);
                    }}
                    className="px-2.5 py-1 bg-neutral-800 hover:bg-emerald-950/40 text-neutral-200 hover:text-emerald-300 border border-neutral-700 hover:border-emerald-500/40 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Скачать таблицу CSV для Excel или Google Таблиц"
                  >
                    <Table size={12} className="text-emerald-400" />
                    <span>CSV (Excel)</span>
                  </button>

                  <button
                    onClick={() => {
                      const md = formatShortsIdeasToMarkdown(outlierIdeas, {
                        niche: nicheData.niche,
                        channelName: selectedBranding?.name,
                        framework: outlierAnalysis?.framework,
                      });
                      const dateStr = new Date().toISOString().split('T')[0];
                      exportToMarkdown(md, `Shorts_Ideas_${dateStr}`);
                      toast.success(`Файл Markdown (.md) сохранен!`);
                    }}
                    className="px-2.5 py-1 bg-neutral-800 hover:bg-blue-950/40 text-neutral-200 hover:text-blue-300 border border-neutral-700 hover:border-blue-500/40 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Скачать структурированный Markdown файл"
                  >
                    <FileCode size={12} className="text-blue-400" />
                    <span>Markdown</span>
                  </button>

                  <button
                    onClick={async () => {
                      const text = formatShortsIdeasToMarkdown(outlierIdeas, {
                        niche: nicheData.niche,
                        channelName: selectedBranding?.name,
                        framework: outlierAnalysis?.framework,
                      });
                      const success = await copyToClipboard(text);
                      if (success) {
                        toast.success("Все 10 идей скопированы в буфер обмена!");
                      } else {
                        toast.error("Не удалось скопировать");
                      }
                    }}
                    className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white border border-neutral-700 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Скопировать все идеи в буфер обмена для Telegram или заметок"
                  >
                    <Copy size={12} />
                    <span>Копировать всё</span>
                  </button>

                  <button
                    onClick={() => setIsIdeasExportModalOpen(true)}
                    className="px-3 py-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title="Открыть мастер экспорта с выбором формата (PDF, CSV, MD, TXT) и опций"
                  >
                    <Download size={12} />
                    <span>Все форматы...</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {outlierIdeas.map((idea, idx) => {
                  const isGen = isGeneratingIdeaScript[idea.id];
                  const isDone = idea.isGenerated;
                  const { cardStyle, accentBarStyle, activeHex } = computeCardColorStyles(
                    idea.color,
                    idea.colorType,
                    idea.status || (isDone ? "Готово" : "Идея"),
                    idea.category
                  );

                  return (
                    <div
                      key={idea.id || idx}
                      style={cardStyle}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setContextMenuShort({ id: idea.id, title: idea.title, position: { x: e.clientX, y: e.clientY } });
                      }}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 shadow-lg relative overflow-hidden ${
                        isDone
                          ? "bg-amber-950/15 border-amber-500/40"
                          : "bg-neutral-900/90 hover:bg-neutral-900 border-neutral-800/90 hover:border-neutral-700"
                      }`}
                    >
                      {activeHex && (
                        <div
                          style={accentBarStyle}
                          className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl z-10"
                          title={`Цвет карточки: ${activeHex}`}
                        />
                      )}

                      <div className="space-y-3">
                        {/* Header: Number, Title & Duration */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-neutral-800 text-amber-400 font-black text-xs flex items-center justify-center shrink-0">
                              #{idx + 1}
                            </span>
                            <h5 className="text-xs sm:text-sm font-bold text-white leading-snug">
                              {idea.title}
                            </h5>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                setContextMenuShort({ id: idea.id, title: idea.title, position: { x: Math.max(10, rect.left - 180), y: rect.bottom + 6 } });
                              }}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                activeHex 
                                  ? "text-white bg-neutral-800 border border-neutral-700 shadow-sm" 
                                  : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                              }`}
                              title="Выбрать цвет карточки Shorts"
                            >
                              <Palette size={13} style={{ color: activeHex || undefined }} />
                            </button>
                            <button
                              onClick={() => handleCopyText(idea.title, `title-${idea.id}`, "Заголовок")}
                              className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                              title="Скопировать заголовок"
                            >
                              {copiedIdeaId === `title-${idea.id}` ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                            </button>
                            <button
                              onClick={() => handleDeleteOutlierIdea(idea.id)}
                              className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                              title="Удалить идею"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Badges Bar */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {idea.estimatedDuration && (
                            <span className="px-2 py-0.5 bg-neutral-800 text-neutral-300 text-[10px] rounded-md font-medium flex items-center gap-1">
                              <Gauge size={11} className="text-blue-400" />
                              {idea.estimatedDuration}
                            </span>
                          )}
                          {idea.emotionalTrigger && (
                            <span className="px-2 py-0.5 bg-rose-950/40 border border-rose-800/40 text-rose-300 text-[10px] rounded-md font-medium flex items-center gap-1">
                              <Heart size={11} className="text-rose-400" />
                              {idea.emotionalTrigger}
                            </span>
                          )}
                          {idea.playlist && (
                            <span className="px-2 py-0.5 bg-purple-950/60 border border-purple-500/40 text-purple-300 text-[10px] rounded-md font-medium flex items-center gap-1">
                              <Sparkles size={11} className="text-purple-400" />
                              {idea.playlist}
                            </span>
                          )}
                          {isDone && (
                            <span className="px-2 py-0.5 bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-[10px] rounded-md font-medium flex items-center gap-1">
                              <CheckCircle2 size={11} className="text-emerald-400" />
                              Сценарий создан
                            </span>
                          )}
                        </div>

                        {/* Automatic Playlist Suggestion (> 5 ideas) */}
                        <IdeaPlaylistSuggestionBanner
                          nicheName={nicheData.niche}
                          totalNicheIdeasCount={outlierIdeas.length}
                          currentIdeaTitle={idea.title}
                          currentIdeaDescription={idea.whyItWorks}
                          currentPlaylist={idea.playlist}
                          suggestedPlaylistName={`🎬 Shorts: ${idea.emotionalTrigger ? `${idea.emotionalTrigger} серия` : (nicheData.niche || "Серия Shorts")}`}
                          suggestedReason="Объединит короткие ролики в серийный плейлист Shorts для алгоритмов автопроигрывания"
                          isShort={true}
                          onAssignPlaylist={(pName) => {
                            setOutlierIdeas((prev: ShortsOutlierIdea[]) => prev.map((item: ShortsOutlierIdea) => item.id === idea.id ? { ...item, playlist: pName } : item));
                            toast.success(`Плейлист «${pName}» назначен! 🎬`);
                          }}
                          onBatchAssignSimilar={(pName) => {
                            setOutlierIdeas((prev: ShortsOutlierIdea[]) => prev.map((item: ShortsOutlierIdea) => !item.playlist ? { ...item, playlist: pName } : item));
                            toast.success(`Плейлист «${pName}» назначен всем Shorts идеям! 🎬`);
                          }}
                          similarIdeasCount={outlierIdeas.filter((i: ShortsOutlierIdea) => !i.playlist).length}
                        />

                        {/* Why It Works Box */}
                        <div className="p-2.5 bg-neutral-950/60 border border-neutral-800/80 rounded-xl space-y-1">
                          <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1">
                            <Flame size={12} />
                            Почему сработает (на основе аутлаеров):
                          </div>
                          <p className="text-[11px] text-neutral-300 leading-relaxed">
                            {idea.whyItWorks}
                          </p>
                        </div>

                        {/* Hook of first 3 seconds */}
                        <div className="p-2.5 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-1">
                          <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wide flex items-center justify-between">
                            <span>Хук первых 3 секунд:</span>
                            <button
                              onClick={() => handleCopyText(idea.hook, `hook-${idea.id}`, "Хук")}
                              className="text-[10px] text-amber-400 hover:text-amber-200 cursor-pointer flex items-center gap-1"
                            >
                              {copiedIdeaId === `hook-${idea.id}` ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                              <span>Копировать</span>
                            </button>
                          </div>
                          <p className="text-xs font-semibold text-white italic">
                            «{idea.hook}»
                          </p>
                        </div>

                        {/* Visuals Plan */}
                        {idea.visualContent && idea.visualContent.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide flex items-center gap-1">
                              <Camera size={12} className="text-neutral-400" />
                              Что будет в кадре (3–5 типов визуала):
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {idea.visualContent.map((v, vIdx) => (
                                <span key={vIdx} className="px-2 py-0.5 bg-neutral-950 border border-neutral-800 text-neutral-300 text-[10px] rounded-md">
                                  {v}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Bottom Action Button */}
                      <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                        {isDone ? (
                          <div className="flex items-center gap-2 w-full">
                            <button
                              onClick={() => {
                                if (idea.fullScript) {
                                  setSelectedShortForVisuals(idea.fullScript);
                                }
                                setShortsActiveSubTab("visuals");
                              }}
                              className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-neutral-700"
                              title="Перейти к генерации сцен и визуальных промптов"
                            >
                              <Palette size={13} className="text-amber-400" />
                              <span>Промпты сцен</span>
                            </button>
                            <button
                              onClick={() => setShortsActiveSubTab("cut")}
                              className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-neutral-700"
                              title="Перейти к тексту сценария"
                            >
                              <Scissors size={13} className="text-amber-400" />
                              <span>Сценарий</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleGenerateScriptFromOutlierIdea(idea)}
                            disabled={isGen}
                            className="w-full py-2.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                          >
                            {isGen ? (
                              <>
                                <Loader2 size={14} className="animate-spin text-amber-400" />
                                <span>Генерируем сценарий...</span>
                              </>
                            ) : (
                              <>
                                <Zap size={14} className="text-amber-400" />
                                <span>Сгенерировать сценарий по этой идее</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            !isAnalyzingOutliers && (
              <div className="p-8 bg-neutral-900/50 border border-neutral-800 border-dashed rounded-2xl text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
                  <Flame size={24} />
                </div>
                <h5 className="text-sm font-bold text-white">
                  Готовы найти скрытые аутлаеры в нише «{nicheData.niche}»?
                </h5>
                <p className="text-xs text-neutral-400 max-w-lg mx-auto leading-relaxed">
                  ИИ проанализирует видео конкурентов, выделит аномально успешные форматы (&ge;2x просмотров), сохранит формулу ниши и предложит 10 свежих идей без повторов с вашим каналом.
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => handleAnalyzeCompetitorOutliers()}
                    className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 font-bold text-xs rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
                  >
                    <Flame size={14} />
                    <span>Начать анализ и выдать 10 идей</span>
                  </button>
                  <button
                    onClick={() => setIsAddCustomModalOpen(true)}
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-neutral-700 hover:border-amber-500/30 font-bold text-xs rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer"
                  >
                    <PlusCircle size={14} className="text-amber-400" />
                    <span>Добавить свою идею вручную</span>
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {shortsActiveSubTab === "cut" && (
        <div className="space-y-6" id="shorts-cut-container">
          <div className="bg-neutral-900 border border-neutral-800/80 p-4 rounded-2xl space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Scissors className="text-accent" size={18} />
                  Умная нарезка Long-Form в 3-5 Shorts
                </h4>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Выделите наиболее острые 60-секундные мысли с готовыми хуками и адаптацией под формат 9:16.
                </p>
              </div>

              <button
                type="button"
                id="shorts-load-script-btn"
                onClick={() => {
                  const currentText = getFullScriptText(generatedBlocks);
                  if (currentText) {
                    setLongFormScriptToCut(currentText);
                    toast.success("Текущий длинный сценарий загружен!");
                  } else {
                    toast.error("В редакторе сценариев сейчас пусто. Сначала сгенерируйте сценарий.");
                  }
                }}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-[10px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer self-start md:self-center"
              >
                <span>📋 Загрузить сценарий</span>
              </button>
            </div>

            <textarea
              id="shorts-longform-input"
              value={longFormScriptToCut}
              onChange={(e) => setLongFormScriptToCut(e.target.value)}
              placeholder="Вставьте ваш длинный сценарий (Long-Form) сюда..."
              className="w-full h-40 bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-accent font-sans resize-y"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                type="button"
                id="shorts-analyze-longform-retention-btn"
                onClick={handleAnalyzeLongFormRetention}
                disabled={isAnalyzingLongFormRetention || (!longFormScriptToCut.trim() && !getFullScriptText(generatedBlocks).trim())}
                className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-[10px] font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 border border-neutral-700/50"
              >
                {isAnalyzingLongFormRetention ? (
                  <Loader2 size={14} className="animate-spin text-amber-400" />
                ) : (
                  <TrendingUp size={14} className="text-amber-400" />
                )}
                <span>ИИ-анализ удержания</span>
              </button>

              <button
                id="shorts-cut-longform-btn"
                onClick={handleCutLongFormScript}
                disabled={isCuttingLongForm || (!longFormScriptToCut.trim() && !getFullScriptText(generatedBlocks).trim())}
                className="px-4 py-2.5 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white rounded-lg font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-accent/10 ml-auto text-[10px]"
              >
                {isCuttingLongForm ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Нарезка...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Выделить Shorts</span>
                  </>
                )}
              </button>
            </div>

            {/* Long Form Retention Analysis Panel */}
            {longFormRetentionAnalysis && (
              <div className="bg-neutral-950 border border-amber-500/30 p-5 rounded-2xl space-y-4 text-xs mt-4 relative overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 pb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={18} className="text-amber-400" />
                    <h5 className="font-bold text-white text-sm">ИИ-Анализ удержания тем Long-Form сценария</h5>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg font-black text-xs">
                      Прогноз удержания: {longFormRetentionAnalysis.overallScore}%
                    </span>
                    <span className="px-2.5 py-1 bg-neutral-900 text-neutral-300 rounded-lg font-semibold text-[11px]">
                      {longFormRetentionAnalysis.retentionGrade}
                    </span>
                    <button
                      type="button"
                      onClick={() => setLongFormRetentionAnalysis(null)}
                      className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg transition-all text-[11px] font-medium flex items-center gap-1 cursor-pointer border border-neutral-800"
                      title="Скрыть этот раздел анализа"
                    >
                      <X size={13} />
                      <span>Скрыть раздел</span>
                    </button>
                  </div>
                </div>

                <p className="text-neutral-300 leading-relaxed font-sans">
                  {longFormRetentionAnalysis.summary}
                </p>

                {longFormRetentionAnalysis.timeline && longFormRetentionAnalysis.timeline.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                      Точки удержания и зоны риска:
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {longFormRetentionAnalysis.timeline.map((point, pIdx) => {
                        const isRisk = point.status === "warning" || point.status === "critical";
                        const isMedium = point.status === "good";
                        return (
                          <div
                            key={`retention-point-${point.timeRange}-${point.topicPhase}-${pIdx}`}
                            className={`p-3 rounded-xl border flex flex-col justify-between gap-1.5 ${
                              isRisk
                                ? "bg-red-500/5 border-red-500/20"
                                : isMedium
                                ? "bg-amber-500/5 border-amber-500/20"
                                : "bg-emerald-500/5 border-emerald-500/20"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-[11px]">{point.timeRange}</span>
                                <span className="text-[10px] text-neutral-400">({point.topicPhase})</span>
                              </div>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                  point.status === "critical"
                                    ? "bg-red-500/20 text-red-400"
                                    : point.status === "warning"
                                    ? "bg-amber-500/20 text-amber-400"
                                    : "bg-emerald-500/20 text-emerald-400"
                                }`}
                              >
                                {point.retentionPercent}%
                              </span>
                            </div>
                            <p className="text-neutral-300 text-[10px] leading-snug">{point.topicFeedback}</p>
                            {point.recommendation && (
                              <p className="text-amber-300 text-[9px] font-medium leading-snug bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/15">
                                💡 {point.recommendation}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cut Shorts Grid */}
          {!isCuttingLongForm && cutShortsResults.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-sm font-bold text-neutral-300 uppercase tracking-wider">
                  Сгенерировано сценариев: {cutShortsResults.length}
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAddCustomModalOpen(true)}
                    className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title="Вставить свой готовый сценарий Shorts"
                  >
                    <PlusCircle size={12} className="text-amber-400" />
                    <span>+ Свой сценарий</span>
                  </button>
                  <button
                    onClick={() => setIsIdeasExportModalOpen(true)}
                    className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white border border-neutral-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Экспортировать список нарезок в файл"
                  >
                    <Download size={12} />
                    <span>Экспорт нарезок</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {cutShortsResults.map((item: CutShortItem, idx: number) => (
                  <div
                    key={`cut-shorts-result-${item.title}-${idx}`}
                    id={`shorts-card-${idx}`}
                    className="w-full bg-neutral-900 border border-neutral-800/80 p-4 rounded-2xl space-y-3 flex flex-col justify-between relative group hover:border-neutral-700 transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2 pb-1 border-b border-neutral-800/60">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-accent/30 to-accent/10 text-accent font-black text-[10px] flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(255,160,0,0.18)]">
                            {idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-[9px] font-medium uppercase tracking-[0.18em] text-neutral-500 mb-0.5">Shorts</div>
                            <h5 className="font-bold text-white text-sm leading-snug truncate">{item.title}</h5>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const script = item.loopEnding?.loopedFullScript || item.script;
                              handleOpenSubtitlesModal(script, item.title);
                            }}
                            className="w-9 h-9 rounded-xl border border-primary/25 bg-primary/10 hover:bg-primary/20 text-primary transition-all flex items-center justify-center cursor-pointer shadow-[0_0_18px_rgba(16,185,129,0.12)]"
                            title="Создать и экспортировать субтитры (TXT, SRT, SBV) для этого Shorts"
                          >
                            <Subtitles size={13} className="text-primary" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const script = item.loopEnding?.loopedFullScript || item.script;
                              setSelectedShortForSeo(script);
                              setShortsActiveSubTab("seo");
                              await handleGenerateShortsSeo(script);
                            }}
                            className="w-9 h-9 rounded-xl border border-emerald-500/25 bg-emerald-500/10 hover:bg-emerald-500/18 text-emerald-300 transition-all flex items-center justify-center cursor-pointer shadow-[0_0_18px_rgba(16,185,129,0.12)]"
                            title="Сгенерировать SEO для этой карточки"
                          >
                            <Search size={13} className="text-emerald-400" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (generatingLoopForCard[idx] || analyzingShortRetentionForCard[idx]) return;
                              await handleGenerateLoopForCard(idx, item.script);
                              if (!item.retentionAnalysis) {
                                await handleAnalyzeShortTopicRetention(idx, item);
                              }
                            }}
                            disabled={generatingLoopForCard[idx] || analyzingShortRetentionForCard[idx]}
                            className="w-9 h-9 rounded-xl border border-amber-500/25 bg-amber-500/10 hover:bg-amber-500/18 text-amber-300 transition-all flex items-center justify-center cursor-pointer disabled:opacity-50 shadow-[0_0_18px_rgba(245,158,11,0.12)]"
                            title="Сгенерировать бесшовную концовку и ИИ-анализ удержания"
                          >
                            {(generatingLoopForCard[idx] || analyzingShortRetentionForCard[idx]) ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Sparkles size={13} className="text-amber-400" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteShort(idx)}
                            className="w-8 h-8 rounded-xl border border-neutral-700 bg-neutral-900/80 hover:bg-red-500/10 hover:border-red-500/30 text-neutral-500 hover:text-red-400 transition-colors flex items-center justify-center"
                            title="Удалить этот Shorts"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Hook */}
                      <div className="bg-neutral-950 border border-neutral-800/80 p-3 rounded-xl space-y-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-accent flex items-center gap-1">
                          ⚡ Хук (Первые 3-5 сек):
                        </span>
                        <p className="text-xs text-neutral-200 font-medium italic">"{item.hook}"</p>
                      </div>

                      {/* Script */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                            Сценарий ролика:
                          </span>
                          <span className="text-[9px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded font-mono">
                            TTS: (500ms) • *акцент* • [эмоция] • [ТЕКСТ НА ЭКРАНЕ]
                          </span>
                        </div>
                        <p className="text-xs text-neutral-300 whitespace-pre-wrap font-sans max-h-48 overflow-y-auto bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/50 leading-relaxed">
                          {item.loopEnding?.loopedFullScript || item.script}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-2 border-t border-neutral-800/60 space-y-2">
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        <button
                          onClick={() => {
                            const script = item.loopEnding?.loopedFullScript || item.script;
                            handleOpenSubtitlesModal(script, item.title);
                          }}
                          className="py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 hover:border-primary/40 rounded-lg font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-[10px]"
                          title="Создать и экспортировать субтитры в формате TXT, SRT, SBV"
                        >
                          <Subtitles size={12} className="text-primary" />
                          <span>Субтитры</span>
                        </button>
                        <button
                          onClick={() => handleGenerateShortsVisuals(item.loopEnding?.loopedFullScript || item.script)}
                          className="py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-[10px]"
                          title="Сгенерировать визуальные промпты для видео"
                        >
                          <Palette size={12} className="text-accent" />
                          <span>Промпты</span>
                        </button>
                        <button
                          onClick={() => handleGenerateShortsSeo(item.loopEnding?.loopedFullScript || item.script)}
                          className="py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-[10px]"
                          title="Сгенерировать SEO-пакет"
                        >
                          <Search size={12} className="text-emerald-400" />
                          <span>SEO</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedShortForSeo(item.loopEnding?.loopedFullScript || item.script);
                            handleGenerateShortsHashtags(item.title, item.loopEnding?.loopedFullScript || item.script);
                          }}
                          disabled={isGeneratingShortsHashtags}
                          className="py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/25 hover:border-blue-500/40 rounded-lg font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-[10px] disabled:opacity-50"
                          title="Сгенерировать и скопировать релевантные хештеги для этого Shorts"
                        >
                          {isGeneratingShortsHashtags &&
                          selectedShortForSeo === (item.loopEnding?.loopedFullScript || item.script) ? (
                            <Loader2 size={12} className="animate-spin text-blue-400" />
                          ) : (
                            <Hash size={12} className="text-blue-400" />
                          )}
                          <span># Хештеги</span>
                        </button>
                        <button
                          onClick={() => handleApplyLongFormSeoToShorts(item.loopEnding?.loopedFullScript || item.script)}
                          className="py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 hover:border-amber-500/40 rounded-lg font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-[10px]"
                          title="Перенести ключевые слова и хештеги из вкладки SEO (для длинных видео)"
                        >
                          <Layers size={12} className="text-amber-400" />
                          <span>SEO из Long-Form</span>
                        </button>
                        <button
                          onClick={() => {
                            if (!item.retentionAnalysis) {
                              handleAnalyzeShortTopicRetention(idx, item);
                            } else {
                              setHiddenRetentionCards((prev) => ({ ...prev, [idx]: !prev[idx] }));
                            }
                          }}
                          disabled={analyzingShortRetentionForCard[idx]}
                          className={`py-2 rounded-lg font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-xs disabled:opacity-50 col-span-2 sm:col-span-1 ${
                            item.retentionAnalysis
                              ? "bg-amber-950/40 border border-amber-500/30 text-amber-400 hover:bg-amber-900/50"
                              : "bg-neutral-800 hover:bg-neutral-700 text-white"
                          }`}
                        >
                          {analyzingShortRetentionForCard[idx] ? (
                            <Loader2 size={15} className="animate-spin text-amber-400" />
                          ) : (
                            <TrendingUp size={15} className="text-amber-400" />
                          )}
                          <span className="truncate">
                            {item.retentionAnalysis
                              ? hiddenRetentionCards[idx]
                                ? "Показать анализ"
                                : "Скрыть анализ"
                              : "Удержание"}
                          </span>
                        </button>
                      </div>

                      {loopErrorForCard[idx] && (
                        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl space-y-1">
                          <p className="text-[10px] font-bold text-red-400">Ошибка зацикливания:</p>
                          <p className="text-[9px] text-neutral-400 font-mono leading-normal">{loopErrorForCard[idx]}</p>
                        </div>
                      )}

                      {item.loopEnding && (
                        <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-2 text-xs mt-3">
                          <div className="flex items-center justify-between border-b border-neutral-800/60 pb-1.5">
                            <span className="font-bold text-accent flex items-center gap-1">
                              <Sparkles size={12} className="text-accent animate-pulse" /> Бесшовная зацикленная концовка:
                            </span>
                            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                              looped
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            <div>
                              <span className="text-[9px] font-bold text-neutral-400 uppercase block">Первая фраза (Вход):</span>
                              <p className="text-neutral-300 font-medium">"{item.loopEnding.originalBeginning}"</p>
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-emerald-400 uppercase block">Новая концовка (Связка):</span>
                              <p className="text-emerald-300 font-medium">"... {item.loopEnding.loopEndingPhrase}"</p>
                            </div>
                            <div className="text-[9px] text-neutral-400 bg-neutral-900/40 p-2 rounded-lg border border-neutral-800/40 mt-1 leading-relaxed">
                              {item.loopEnding.explanation}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Retention Analysis card */}
                      {item.retentionAnalysis && !hiddenRetentionCards[idx] && (
                        <div className="bg-neutral-950 border border-amber-500/30 p-5 rounded-2xl space-y-4 text-xs mt-4 relative overflow-hidden">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 pb-3">
                            <div className="flex items-center gap-2">
                              <TrendingUp size={18} className="text-amber-400" />
                              <h5 className="font-bold text-white text-sm">ИИ-Анализ удержания тем и вовлечения</h5>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg font-black text-xs">
                                Прогноз удержания: {item.retentionAnalysis.overallScore}%
                              </span>
                              <span className="px-2.5 py-1 bg-neutral-900 text-neutral-300 rounded-lg font-semibold text-[11px]">
                                {item.retentionAnalysis.retentionGrade}
                              </span>
                              <button
                                type="button"
                                onClick={() => setHiddenRetentionCards((prev) => ({ ...prev, [idx]: true }))}
                                className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg transition-all text-[11px] font-medium flex items-center gap-1 cursor-pointer border border-neutral-800"
                                title="Скрыть этот раздел анализа"
                              >
                                <X size={13} />
                                <span>Скрыть раздел</span>
                              </button>
                            </div>
                          </div>

                          <p className="text-neutral-300 leading-relaxed font-sans">
                            {item.retentionAnalysis.summary}
                          </p>

                          <div className="flex items-center justify-between pt-2 border-t border-neutral-850">
                            <button
                              type="button"
                              onClick={() => handleOptimizeShortRetention(idx, item)}
                              disabled={optimizingShortRetentionForCard[idx]}
                              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50 text-xs"
                            >
                              {optimizingShortRetentionForCard[idx] ? (
                                <>
                                  <Loader2 size={15} className="animate-spin text-white" />
                                  <span>ИИ внедряет рекомендации...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles size={15} className="text-amber-200" />
                                  <span>⚡ Внедрить рекомендации в сценарий</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2">
                        <button
                          onClick={() => {
                            const full = item.loopEnding?.loopedFullScript || item.script;
                            copyToClipboard(full);
                            toast.success(
                              item.loopEnding
                                ? `Зацикленный сценарий "${item.title}" скопирован в буфер обмена!`
                                : `Сценарий "${item.title}" скопирован в буфер обмена!`
                            );
                          }}
                          className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>📋 Копировать сценарий</span>
                        </button>
                        <button
                          onClick={async () => {
                            if (generatingLoopForCard[idx] || analyzingShortRetentionForCard[idx]) return;
                            await handleGenerateLoopForCard(idx, item.script);
                            if (!item.retentionAnalysis) {
                              await handleAnalyzeShortTopicRetention(idx, item);
                            }
                          }}
                          disabled={generatingLoopForCard[idx] || analyzingShortRetentionForCard[idx]}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 bg-amber-500/10 border border-amber-500/25 text-amber-300 hover:bg-amber-500/20"
                        >
                          {(generatingLoopForCard[idx] || analyzingShortRetentionForCard[idx]) ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Sparkles size={12} className="text-amber-400" />
                          )}
                          <span>Сгенерировать конец/анализ</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {shortsActiveSubTab === "visuals" && (
        <div className="space-y-6" id="shorts-visuals-container">
          {!selectedShortForVisuals ? (
            <div className="text-center p-8 bg-neutral-900 rounded-3xl border border-neutral-800">
              <p className="text-neutral-400">Выберите сценарий Shorts из раздела "Нарезка" для генерации промптов.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <Palette size={18} className="text-accent" />
                    Визуальные и Музыкальный Промпты
                  </h4>
                  <button
                    onClick={() => handleGenerateShortsVisuals(selectedShortForVisuals)}
                    disabled={isGeneratingShortsVisuals}
                    className="px-4 py-2 bg-accent hover:bg-accent/80 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isGeneratingShortsVisuals ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : shortsVisuals.length === 0 ? (
                      <Sparkles size={16} />
                    ) : (
                      <RefreshCw size={16} />
                    )}
                    {shortsVisuals.length === 0 ? "Сгенерировать промпты сцен" : "Перегенерировать"}
                  </button>
                </div>

                {isGeneratingShortsVisuals ? (
                  <div className="flex flex-col items-center justify-center p-12 space-y-4">
                    <Loader2 size={40} className="text-accent animate-spin" />
                    <p className="text-neutral-400 animate-pulse font-medium">Создание детализированных промптов...</p>
                  </div>
                ) : shortsVisuals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-10 bg-neutral-950/60 border border-dashed border-neutral-800 rounded-2xl text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                      <Palette size={24} />
                    </div>
                    <div>
                      <h5 className="font-bold text-white text-sm">Сцены и визуальные промпты ещё не созданы</h5>
                      <p className="text-xs text-neutral-400 max-w-md mt-1">
                        Нажмите кнопку ниже, чтобы разделить сценарий на сцены по 5 секунд и сгенерировать детальные 9:16 промпты для генерации видео.
                      </p>
                    </div>
                    <button
                      onClick={() => handleGenerateShortsVisuals(selectedShortForVisuals)}
                      disabled={isGeneratingShortsVisuals}
                      className="mt-2 px-5 py-2.5 bg-accent hover:bg-accent/80 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      <Sparkles size={15} />
                      <span>Сгенерировать промпты для сцен</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {/* Полный исходный сценарий с информацией об объёме */}
                    {selectedShortForVisuals && (
                      <div className="bg-neutral-950/80 border border-neutral-800 p-4 rounded-xl space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                              <FileText size={14} className="text-accent" />
                              Полный сценарий Shorts (100% охват)
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded bg-neutral-900 text-neutral-400 border border-neutral-800">
                              {selectedShortForVisuals.split(/\s+/).filter(Boolean).length} слов • {shortsVisuals.length} сцен
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              copyToClipboard(selectedShortForVisuals);
                              toast.success("Полный сценарий скопирован");
                            }}
                            className="px-2.5 py-1 text-xs bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <Copy size={12} />
                            <span>Копировать весь текст</span>
                          </button>
                        </div>
                        <div className="text-xs text-neutral-300 bg-neutral-900/50 p-3 rounded-lg border border-neutral-800/60 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap select-text">
                          {selectedShortForVisuals}
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-neutral-800">
                        <h5 className="font-bold text-neutral-300 uppercase tracking-widest text-xs flex items-center gap-2">
                          <Camera size={14} className="text-emerald-400" />
                          Визуальные Промпты с ротацией планов ({shortsVisuals.length} сцен)
                        </h5>
                        {shortsVisuals.length > 0 && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                const allP1 = shortsVisuals.map((v, idx) => `// Сцена ${idx + 1} (${v.shotTypeRu || v.shotType || "План"} • ${v.cameraMovementRu || v.cameraMovement || "Движение"})\n${v.videoPrompt1 || v.prompt}`).join("\n\n");
                                copyToClipboard(allP1);
                                toast.success("Все промпты (Ракурс 1) скопированы");
                              }}
                              className="px-2.5 py-1 text-xs bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 rounded-lg transition-colors cursor-pointer"
                            >
                              📋 Скопировать все (Ракурс 1)
                            </button>
                            {shortsVisuals.some(v => v.videoPrompt2) && (
                              <button
                                onClick={() => {
                                  const allP2 = shortsVisuals.map((v, idx) => `// Сцена ${idx + 1} (Ракурс 2 - Альтернативный/Контр-план)\n${v.videoPrompt2 || v.videoPrompt1 || v.prompt}`).join("\n\n");
                                  copyToClipboard(allP2);
                                  toast.success("Все промпты (Ракурс 2) скопированы");
                                }}
                                className="px-2.5 py-1 text-xs bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 rounded-lg transition-colors cursor-pointer"
                              >
                                📋 Скопировать все (Ракурс 2)
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {shortsVisuals.map((v, i) => {
                        const hasDualAngles = Boolean(v.videoPrompt1 && v.videoPrompt2 && v.videoPrompt1 !== v.videoPrompt2);
                        const isRegeneratingThis = regeneratingSceneIdx === i;
                        return (
                          <div key={`shorts-visual-scene-${v.text.slice(0, 15)}-${i}`} className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl space-y-3 relative group">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="w-6 h-6 bg-emerald-500/20 text-emerald-400 font-black rounded-lg flex items-center justify-center text-xs border border-emerald-500/30">
                                  {i + 1}
                                </span>
                                {(v.shotTypeRu || v.shotType) && (
                                  <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs rounded-md font-medium">
                                    🎬 {v.shotTypeRu || v.shotType}
                                  </span>
                                )}
                                {(v.cameraMovementRu || v.cameraMovement) && (
                                  <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs rounded-md font-medium">
                                    🎯 {v.cameraMovementRu || v.cameraMovement}
                                  </span>
                                )}
                                {v.focalLength && (
                                  <span className="px-2 py-0.5 bg-neutral-800 text-neutral-300 text-xs rounded-md">
                                    🔍 {v.focalLength}
                                  </span>
                                )}
                                {v.duration && (
                                  <span className="px-2 py-0.5 bg-neutral-900 text-neutral-400 text-xs rounded-md">
                                    ⏱ ~{v.duration} с
                                  </span>
                                )}
                              </div>

                              <button
                                onClick={() => handleRegenerateSingleSceneVisual(i)}
                                disabled={isRegeneratingThis || isGeneratingShortsVisuals}
                                title="Перегенерировать промпты для этой сцены"
                                className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-neutral-600 text-neutral-300 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <RefreshCw size={12} className={isRegeneratingThis ? "animate-spin text-accent" : ""} />
                                <span>{isRegeneratingThis ? "Генерация..." : "Перегенерировать сцену"}</span>
                              </button>
                            </div>

                            <div className="text-xs text-neutral-300 italic bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800/80">
                              <span className="text-neutral-500 font-semibold mr-1.5">Текст сцены:</span>
                              "{v.text}"
                            </div>

                            {v.sceneSummary && (
                              <div className="text-xs text-neutral-400">
                                <span className="text-neutral-500 font-semibold mr-1">Действие:</span>
                                {v.sceneSummary}
                              </div>
                            )}

                            {hasDualAngles ? (
                              <div className="space-y-3 pt-1">
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between text-xs text-emerald-400 font-medium">
                                    <span>Ракурс 1 (Основной план • {v.shotType || "Main"})</span>
                                    <button
                                      onClick={() => {
                                        copyToClipboard(v.videoPrompt1 || v.prompt);
                                        toast.success("Ракурс 1 скопирован");
                                      }}
                                      className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[11px] cursor-pointer"
                                    >
                                      📋 Копировать
                                    </button>
                                  </div>
                                  <div className="text-xs font-mono text-neutral-200 bg-neutral-900/80 p-3 rounded-lg border border-neutral-800/60 whitespace-pre-wrap leading-relaxed">
                                    {v.videoPrompt1 || v.prompt}
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between text-xs text-blue-400 font-medium">
                                    <span>Ракурс 2 (Контр-план / Альтернативный угол)</span>
                                    <button
                                      onClick={() => {
                                        copyToClipboard(v.videoPrompt2 || "");
                                        toast.success("Ракурс 2 скопирован");
                                      }}
                                      className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[11px] cursor-pointer"
                                    >
                                      📋 Копировать
                                    </button>
                                  </div>
                                  <div className="text-xs font-mono text-neutral-200 bg-neutral-900/80 p-3 rounded-lg border border-neutral-800/60 whitespace-pre-wrap leading-relaxed">
                                    {v.videoPrompt2}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="relative">
                                <div className="text-xs font-mono text-neutral-200 bg-neutral-900/80 p-3 rounded-lg border border-neutral-800/60 whitespace-pre-wrap leading-relaxed">
                                  {v.prompt}
                                </div>
                                <button
                                  onClick={() => {
                                    copyToClipboard(v.prompt);
                                    toast.success("Промпт скопирован");
                                  }}
                                  className="absolute top-2 right-2 p-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-md cursor-pointer text-xs"
                                >
                                  📋
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {shortsVisuals.length === 0 && (
                        <p className="text-neutral-500 text-sm">Нет данных.</p>
                      )}
                    </div>

                    <div className="space-y-4">
                      <h5 className="font-bold text-neutral-300 uppercase tracking-widest text-xs flex items-center gap-2">
                        <Music size={14} className="text-purple-400" />
                        Музыкальный Промпт
                      </h5>
                      <div className="bg-neutral-950 border border-neutral-800 p-5 rounded-xl space-y-3 relative group">
                        <div className="text-sm font-mono text-neutral-200 whitespace-pre-wrap">
                          {shortsMusicPrompt || <span className="text-neutral-500">Нет данных.</span>}
                        </div>
                        {shortsMusicPrompt && (
                          <button
                            onClick={() => {
                              copyToClipboard(shortsMusicPrompt);
                              toast.success("Промпт скопирован");
                            }}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-md cursor-pointer"
                          >
                            📋
                          </button>
                        )}
                      </div>

                      <h5 className="font-bold text-neutral-300 uppercase tracking-widest text-xs flex items-center gap-2 mt-8">
                        <FileText size={14} className="text-neutral-400" />
                        Исходный текст Shorts
                      </h5>
                      <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl text-xs text-neutral-400 whitespace-pre-wrap font-sans max-h-48 overflow-y-auto">
                        {selectedShortForVisuals}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {shortsActiveSubTab === "seo" && (
        <div className="grid grid-cols-1 gap-6" id="shorts-seo-container">
          {/* CTR Analyzer Panel */}
          <div className="bg-neutral-900 border border-neutral-800/80 p-6 rounded-3xl space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Gauge className="text-accent" size={18} />
                  Анализатор Кликабельности (CTR)
                </h4>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Оцените силу интриги и потенциал вирусности названия Shorts.
                </p>
              </div>
              {currentSeoToShow?.titles && currentSeoToShow.titles.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (currentSeoToShow.titles?.[0]) {
                      setShortsCtrTitle(currentSeoToShow.titles[0]);
                    }
                    if (currentSeoToShow.description) {
                      setShortsCtrDescription(currentSeoToShow.description);
                    }
                    toast.success("Данные из SEO загружены в Анализатор CTR!");
                  }}
                  className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Подставить сгенерированный заголовок и описание из блока SEO"
                >
                  <Sparkles size={11} />
                  <span>Вставить из SEO</span>
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>Заголовок Shorts:</span>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!shortsCtrTitle.trim()) return;
                        try {
                          toast.loading("AI думает над заголовком...", { id: "opt-title" });
                          const optimized = await optimizeTitle(shortsCtrTitle);
                          setShortsCtrTitle(optimized);
                          toast.success("Заголовок оптимизирован!", { id: "opt-title" });
                        } catch (e) {
                          toast.error("Не удалось оптимизировать заголовок", { id: "opt-title" });
                        }
                      }}
                      className="px-1.5 py-0.5 bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 rounded flex items-center gap-1 text-[9px] transition-colors cursor-pointer"
                      title="Улучшить с помощью AI"
                    >
                      <Sparkles size={10} />
                      AI Оптимизация заголовка
                    </button>
                  </div>
                  <span className={`text-[10px] ${shortsCtrTitle.length > 50 ? "text-amber-400" : "text-neutral-500"}`}>
                    {shortsCtrTitle.length}/60 символов
                  </span>
                </label>
                <input
                  type="text"
                  value={shortsCtrTitle}
                  onChange={(e) => setShortsCtrTitle(e.target.value)}
                  placeholder="Например: Секрет, о котором молчат 99% успешных блогеров..."
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-accent/50 focus:ring-1 focus:ring-accent/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-600 transition-all outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-300 flex items-center justify-between">
                  <span>Описание Shorts (первые 200 символов — сниппет):</span>
                  {shortsCtrDescription && (
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {shortsCtrDescription.length} знаков
                    </span>
                  )}
                </label>
                <textarea
                  value={shortsCtrDescription}
                  onChange={(e) => setShortsCtrDescription(e.target.value)}
                  placeholder="Вставьте полное описание Shorts (~3000 знаков). Первые 200 символов анализируются как сниппет с ключевыми словами..."
                  rows={4}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-accent/50 focus:ring-1 focus:ring-accent/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-600 transition-all outline-none resize-none leading-relaxed"
                />
              </div>

              <button
                onClick={() => handleAnalyzeShortsCtr(shortsCtrTitle, shortsCtrDescription)}
                disabled={isAnalyzingShortsCtr || !shortsCtrTitle.trim()}
                className="w-full py-2.5 bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-accent/10"
              >
                {isAnalyzingShortsCtr ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Анализируем интригу и CTR...</span>
                  </>
                ) : (
                  <>
                    <Gauge size={14} />
                    <span>Проверить кликабельность (CTR)</span>
                  </>
                )}
              </button>
            </div>

            {/* CTR Analysis Result */}
            {shortsCtrResult && (
              <div className="border-t border-neutral-800 pt-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center ${
                      shortsCtrResult.ctrScore >= 80
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : shortsCtrResult.ctrScore >= 50
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                        : "bg-red-500/10 border-red-500/20 text-red-400"
                    }`}
                  >
                    <span className="text-[9px] uppercase font-extrabold tracking-wider opacity-60">CTR Потенциал</span>
                    <span className="text-xl font-black mt-0.5">{shortsCtrResult.ctrScore}%</span>
                    <span className="text-[9px] font-bold mt-1">
                      {shortsCtrResult.ctrScore >= 80
                        ? "🔥 Высокий"
                        : shortsCtrResult.ctrScore >= 50
                        ? "⚡ Средний"
                        : "⚠️ Требует правок"}
                    </span>
                  </div>
                  <div
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center ${
                      shortsCtrResult.hookStrength === "высокая"
                        ? "bg-purple-500/10 border-purple-500/20 text-purple-400"
                        : shortsCtrResult.hookStrength === "средняя"
                        ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                        : "bg-neutral-800/60 border-neutral-800 text-neutral-400"
                    }`}
                  >
                    <span className="text-[9px] uppercase font-extrabold tracking-wider opacity-60">Сила Интриги</span>
                    <span className="text-xs font-black mt-2.5 capitalize">{shortsCtrResult.hookStrength}</span>
                    <span className="text-[9px] font-bold mt-1">оценка зацепки</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-neutral-950 border border-neutral-800/80 p-3 rounded-2xl flex items-center gap-3">
                    <div className="bg-rose-500/10 p-2 rounded-lg text-rose-400">
                      <Heart size={14} />
                    </div>
                    <div>
                      <div className="text-[9px] font-extrabold text-neutral-500 uppercase tracking-wider">Эмоция</div>
                      <div className="text-[10px] font-bold text-neutral-300 leading-tight mt-0.5">
                        {shortsCtrResult.emotion || "Смешанная"}
                      </div>
                    </div>
                  </div>
                  <div className="bg-neutral-950 border border-neutral-800/80 p-3 rounded-2xl flex items-center gap-3">
                    <div className="bg-indigo-500/10 p-2 rounded-lg text-indigo-400">
                      <Activity size={14} />
                    </div>
                    <div>
                      <div className="text-[9px] font-extrabold text-neutral-500 uppercase tracking-wider">Конкуренция</div>
                      <div className="text-[10px] font-bold text-neutral-300 leading-tight mt-0.5">
                        {shortsCtrResult.competitiveness || "Средняя"}
                      </div>
                    </div>
                  </div>
                </div>

                {shortsCtrResult.suggestedTitles && shortsCtrResult.suggestedTitles.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                      Рекомендации по улучшению заголовка:
                    </span>
                    <ul className="space-y-1">
                      {shortsCtrResult.suggestedTitles.map((suggestion: any, idx: number) => {
                        const title = typeof suggestion === "string" ? suggestion : suggestion.title;
                        const meta = typeof suggestion === "string"
                          ? ""
                          : [suggestion.type, suggestion.ctrIncrease].filter(Boolean).join(" · ");
                        return (
                        <li
                          key={`shorts-ctr-sug-${idx}-${title}`}
                          className="text-[11px] text-neutral-300 bg-neutral-950 p-2.5 rounded-xl border border-neutral-800/50 flex items-start justify-between gap-2"
                        >
                          <span className="flex items-start gap-2 min-w-0">
                            <span className="text-amber-400 mt-0.5">💡</span>
                            <span className="min-w-0">
                              <span className="block">{title}</span>
                              {meta && <span className="block text-[9px] text-neutral-500 mt-0.5">{meta}</span>}
                            </span>
                          </span>
                          {title && (
                            <button
                              type="button"
                              onClick={() => handleApplyTitleToSeo(title)}
                              className="shrink-0 px-2 py-1 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-300 text-[9px] font-bold hover:bg-amber-500/20 transition-colors"
                            >
                              Применить
                            </button>
                          )}
                        </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {shortsCtrResult.firstLineSuggestion && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                      Рекомендация для первой строки описания:
                    </span>
                    <div className="text-[11px] text-neutral-300 bg-neutral-950 p-2.5 rounded-xl border border-neutral-800/50 flex items-start justify-between gap-2">
                      <span className="min-w-0">{shortsCtrResult.firstLineSuggestion}</span>
                      <button
                        type="button"
                        onClick={() => handleApplyDescriptionToSeo(shortsCtrResult.firstLineSuggestion)}
                        className="shrink-0 px-2 py-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 text-[9px] font-bold hover:bg-emerald-500/20 transition-colors"
                      >
                        Применить
                      </button>
                    </div>
                  </div>
                )}

                {shortsCtrResult.ctrTriggers && shortsCtrResult.ctrTriggers.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                      Дополнительные рекомендации:
                    </span>
                    <ul className="space-y-1">
                      {shortsCtrResult.ctrTriggers.map((trigger: string, idx: number) => (
                        <li
                          key={`shorts-ctr-trigger-${idx}-${trigger}`}
                          className="text-[11px] text-neutral-300 bg-neutral-950 p-2.5 rounded-xl border border-neutral-800/50 flex items-start gap-2"
                        >
                          <span className="text-emerald-400 mt-0.5">✓</span>
                          <span>{trigger}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Shorts SEO Output Panel */}
          <div className="bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_30%),linear-gradient(135deg,_rgba(12,12,12,1)_0%,_rgba(18,18,18,1)_52%,_rgba(9,22,18,1)_100%)] border border-neutral-800/80 p-3 rounded-[28px] space-y-3 shadow-[0_0_0_1px_rgba(16,185,129,0.05),0_24px_55px_rgba(0,0,0,0.34)]">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.18)]">
                  <Search className="text-emerald-400" size={18} />
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] uppercase tracking-[0.24em] text-emerald-400/80 font-black">SEO System</div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    SEO-Пакет для Shorts
                  </h4>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleGenerateShortsHashtags()}
                  disabled={isGeneratingShortsHashtags}
                  className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Сгенерировать отдельный вирусный набор хештегов"
                >
                  {isGeneratingShortsHashtags ? (
                    <Loader2 size={13} className="animate-spin text-blue-400" />
                  ) : (
                    <Hash size={13} className="text-blue-400" />
                  )}
                  <span>Хештеги</span>
                </button>
                <button
                  onClick={() => handleGenerateShortsSeo(selectedShortForSeo || cutShortsResults[0]?.loopEnding?.loopedFullScript || cutShortsResults[0]?.script || "")}
                  disabled={isGeneratingShortsSeo || (!selectedShortForSeo && cutShortsResults.length === 0)}
                  className="px-3 py-1.5 bg-emerald-500/12 hover:bg-emerald-500/18 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingShortsSeo ? (
                    <Loader2 size={13} className="animate-spin text-emerald-300" />
                  ) : (
                    <RefreshCw size={13} className="text-emerald-300" />
                  )}
                  <span>Сгенерировать SEO</span>
                </button>
              </div>
            </div>

            {cutShortsResults.length > 0 && (
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                <div className="min-w-0">
                  <div className="text-[9px] uppercase tracking-[0.18em] text-emerald-400/80 font-bold">Активный Shorts</div>
                  <div className="text-[11px] text-neutral-300 font-medium truncate max-w-[520px]">
                    {selectedShortForSeo
                      ? selectedShortForSeo.slice(0, 120) + (selectedShortForSeo.length > 120 ? "..." : "")
                      : "Выберите сценарий карточки"}
                  </div>
                </div>
                <button
                  onClick={() => setShortsActiveSubTab("cut")}
                  className="px-2.5 py-1.5 border border-emerald-500/30 bg-emerald-500/10 text-[10px] rounded-lg text-emerald-300 font-bold hover:bg-emerald-500/15 transition-colors cursor-pointer"
                >
                  К карточкам
                </button>
              </div>
            )}

            {isGeneratingShortsSeo ? (
              <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <Loader2 size={36} className="text-emerald-400 animate-spin" />
                <p className="text-neutral-400 animate-pulse font-medium text-xs">
                  Создание вирусного SEO-пакета Shorts...
                </p>
              </div>
            ) : shortsSeoError ? (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl space-y-2">
                <p className="text-xs font-bold text-red-400">Ошибка при генерации SEO:</p>
                <p className="text-xs text-neutral-400 font-mono">{shortsSeoError}</p>
                <button
                  onClick={() => handleGenerateShortsSeo(selectedShortForSeo)}
                  className="mt-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Попробовать снова
                </button>
              </div>
            ) : currentSeoToShow ? (
              <div className="space-y-4 text-xs">
                {/* Titles */}
                <div className="bg-gradient-to-br from-neutral-950 via-neutral-950 to-emerald-950/10 border border-neutral-800/80 p-3 rounded-[18px] space-y-2 shadow-[0_12px_28px_rgba(16,185,129,0.06)]">
                  <div className="text-[10px] text-neutral-400 font-bold flex items-center justify-between">
                    <span>Рекомендуемые названия (Titles):</span>
                    <span className="text-emerald-400">Кликните для выбора</span>
                  </div>
                  <div className="space-y-1.5">
                    {currentSeoToShow.titles &&
                      currentSeoToShow.titles.map((t: string, idx: number) => (
                        <div
                          key={`shorts-seo-title-${t}-${idx}`}
                          onClick={() => handleApplyTitleToSeo(t)}
                          className="p-2.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-850 border border-neutral-800/60 hover:border-emerald-500/40 text-neutral-200 font-medium transition-all cursor-pointer flex items-center justify-between group shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
                        >
                          <span className="text-xs">{t}</span>
                          <span className="text-[10px] text-neutral-500 group-hover:text-emerald-400 transition-colors opacity-0 group-hover:opacity-100 font-bold">
                            Применить →
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Description */}
                <div className="bg-gradient-to-br from-neutral-950 via-neutral-950 to-amber-950/10 border border-neutral-800/80 p-4 rounded-2xl space-y-2.5 shadow-[0_12px_28px_rgba(245,158,11,0.05)]">
                  <div className="text-[10px] text-neutral-400 font-bold flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-200">SEO-Описание Shorts:</span>
                      {currentSeoToShow.description && (
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                          currentSeoToShow.description.length >= 2500 && currentSeoToShow.description.length <= 3500
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                        }`}>
                          {currentSeoToShow.description.length} знаков (~3000)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {currentSeoToShow.description && (
                        <button
                          type="button"
                          onClick={() => {
                            copyToClipboard(currentSeoToShow.description);
                            toast.success("Описание Shorts скопировано!");
                          }}
                          className="text-neutral-400 hover:text-white font-semibold text-[10px] transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Copy size={11} />
                          <span>Копировать</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleApplyDescriptionToSeo(currentSeoToShow.description || "")}
                        className="text-emerald-400 hover:text-emerald-300 font-bold text-[10px] cursor-pointer"
                      >
                        Вставить в анализатор CTR
                      </button>
                    </div>
                  </div>

                  {currentSeoToShow.description && currentSeoToShow.description.length > 0 && (
                    <div className="text-[10px] text-neutral-400 bg-neutral-950/60 p-2 rounded-lg border border-neutral-800/60 flex items-start gap-1.5">
                      <span className="text-amber-400 font-bold shrink-0">🎯 Сниппет (первые 200 знаков):</span>
                      <span className="text-neutral-300 font-medium line-clamp-2">
                        {currentSeoToShow.description.slice(0, 200)}
                      </span>
                    </div>
                  )}

                  <p className="text-neutral-300 whitespace-pre-wrap font-sans text-xs bg-neutral-900/60 p-3 rounded-xl border border-neutral-800/60 max-h-56 overflow-y-auto leading-relaxed selection:bg-amber-500/30">
                    {currentSeoToShow.description || "Нет описания."}
                  </p>
                </div>

                {/* Hashtags & Keywords */}
                <div className="bg-gradient-to-br from-neutral-950 via-neutral-950 to-blue-950/10 border border-neutral-800/80 p-3 rounded-[18px] space-y-3 shadow-[0_16px_32px_rgba(59,130,246,0.06)]">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                    <span className="text-[10px] font-bold text-neutral-400">Хештеги и ключевые слова</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleGenerateShortsHashtags()}
                        className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg text-[9px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Hash size={11} className="text-blue-400" />
                        <span># Хештеги</span>
                      </button>
                      <button
                        onClick={() => handleApplyLongFormSeoToShorts(selectedShortForSeo)}
                        className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-[9px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                        title="Синхронизировать ключевые слова и теги из вкладки SEO (для длинных видео)"
                      >
                        <Layers size={11} className="text-amber-400" />
                        <span>Применить настройки SEO</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-neutral-400 font-bold mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Hash size={11} className="text-blue-400" />
                        <span>Хештеги</span>
                      </div>
                      {currentSeoToShow.hashtags && currentSeoToShow.hashtags.length > 0 && (
                        <button
                          onClick={() => handleCopyShortsHashtags(currentSeoToShow.hashtags)}
                          className="px-2 py-0.5 bg-neutral-850 hover:bg-neutral-800 border border-neutral-700/60 text-neutral-300 rounded text-[9px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                          title="Скопировать все хештеги этой карточки"
                        >
                          <Copy size={9} />
                          <span>Копировать все ({currentSeoToShow.hashtags.length})</span>
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(currentSeoToShow.hashtags || []).map((tag, i) => (
                        <span
                          key={`shorts-seo-hashtag-${tag}-${i}`}
                          onClick={() => {
                            copyToClipboard(tag);
                            toast.success(`Хештег ${tag} скопирован!`);
                          }}
                          className="px-2.5 py-1 bg-neutral-800/90 hover:bg-neutral-700/90 text-neutral-200 text-[9px] rounded-md font-bold cursor-pointer transition-colors border border-neutral-700/60"
                          title="Нажмите для копирования"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-neutral-800 pt-3">
                    <div className="text-[10px] text-neutral-400 font-bold mb-1.5 flex items-center gap-1">
                      <Search size={11} className="text-indigo-400" />
                      Ключевые слова для тегов:
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      {(currentSeoToShow.keywords || []).map((kw, i) => (
                        <span key={`shorts-seo-kw-${kw}-${i}`} className="px-2 py-0.5 bg-neutral-900 border border-neutral-800 text-neutral-400 text-[8px] rounded-md">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Pinned Comment */}
                {currentSeoToShow.pinnedComment && (
                  <div className="bg-gradient-to-br from-neutral-950 via-neutral-950 to-pink-950/10 border border-neutral-800/80 p-3.5 rounded-[18px] space-y-2 shadow-[0_12px_28px_rgba(236,72,153,0.05)]">
                    <div className="text-[10px] text-neutral-400 font-bold flex items-center justify-between">
                      <span className="text-neutral-200">📌 Закрепленный комментарий (Pinned Comment):</span>
                      <button
                        type="button"
                        onClick={() => {
                          copyToClipboard(currentSeoToShow.pinnedComment || "");
                          toast.success("Закрепленный комментарий скопирован!");
                        }}
                        className="text-neutral-400 hover:text-white font-semibold text-[10px] transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Copy size={11} />
                        <span>Копировать</span>
                      </button>
                    </div>
                    <p className="text-neutral-300 font-sans text-xs bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800/60 leading-relaxed">
                      {currentSeoToShow.pinnedComment}
                    </p>
                  </div>
                )}

                {/* SEO Audit Button */}
                <div className="pt-2 border-t border-neutral-800 relative">
                  <button
                    onClick={handleAnalyzeShortsSEO}
                    disabled={isAnalyzingShortsSeoAudit}
                    className={`w-full py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      isAnalyzingShortsSeoAudit
                        ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/40 animate-pulse"
                        : "bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border-yellow-500/20"
                    }`}
                  >
                    {isAnalyzingShortsSeoAudit ? (
                      <>
                        <Loader2 className="animate-spin" size={14} />
                        ИИ выполняет глубокий SEO-аудит Shorts...
                      </>
                    ) : (
                      <>
                        <BarChart3 size={14} />
                        Запустить глубокий SEO-аудит и получить рекомендации
                      </>
                    )}
                  </button>
                </div>

                {/* SEO AUDIT & RECOMMENDATIONS PANEL */}
                {shortsSeoAnalysis && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-4 bg-neutral-950 rounded-2xl border border-yellow-500/30 space-y-4"
                  >
                    {/* Header with Total Score and Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-neutral-800">
                      <div className="flex items-center gap-2">
                        <BarChart3 size={18} className="text-yellow-500" />
                        <div>
                          <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                            Глубокий SEO-аудит и проверка правил Shorts
                          </h5>
                          <p className="text-[10px] text-neutral-400">
                            Оценка метаданных, кликабельности и соответствия стандартам YouTube Shorts
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                            shortsSeoAnalysis.score >= 80
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : shortsSeoAnalysis.score >= 50
                              ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30"
                              : "bg-red-500/15 text-red-400 border border-red-500/30"
                          }`}
                        >
                          <span className="text-[10px] uppercase font-semibold text-neutral-400">SEO Оценка:</span>
                          <span>{shortsSeoAnalysis.score}/100</span>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Score Breakdown */}
                    {shortsSeoAnalysis.scoreBreakdown && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        <div className="p-2.5 bg-neutral-900/70 border border-neutral-800/80 rounded-xl text-center space-y-0.5">
                          <span className="text-[9px] text-neutral-500 font-bold uppercase">Заголовок</span>
                          <div className="text-sm font-bold text-white flex items-center justify-center gap-1">
                            {shortsSeoAnalysis.scoreBreakdown.titleScore}/100
                          </div>
                          <div className="w-full bg-neutral-800 h-1 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-500 h-full rounded-full transition-all"
                              style={{ width: `${shortsSeoAnalysis.scoreBreakdown.titleScore}%` }}
                            />
                          </div>
                        </div>

                        <div className="p-2.5 bg-neutral-900/70 border border-neutral-800/80 rounded-xl text-center space-y-0.5">
                          <span className="text-[9px] text-neutral-500 font-bold uppercase">Описание</span>
                          <div className="text-sm font-bold text-white flex items-center justify-center gap-1">
                            {shortsSeoAnalysis.scoreBreakdown.descriptionScore}/100
                          </div>
                          <div className="w-full bg-neutral-800 h-1 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all"
                              style={{ width: `${shortsSeoAnalysis.scoreBreakdown.descriptionScore}%` }}
                            />
                          </div>
                        </div>

                        <div className="p-2.5 bg-neutral-900/70 border border-neutral-800/80 rounded-xl text-center space-y-0.5">
                          <span className="text-[9px] text-neutral-500 font-bold uppercase">Ключи и теги</span>
                          <div className="text-sm font-bold text-white flex items-center justify-center gap-1">
                            {shortsSeoAnalysis.scoreBreakdown.keywordsScore}/100
                          </div>
                          <div className="w-full bg-neutral-800 h-1 rounded-full overflow-hidden">
                            <div
                              className="bg-purple-500 h-full rounded-full transition-all"
                              style={{ width: `${shortsSeoAnalysis.scoreBreakdown.keywordsScore}%` }}
                            />
                          </div>
                        </div>

                        <div
                          className={`p-2.5 rounded-xl text-center space-y-0.5 border ${
                            shortsSeoAnalysis.scoreBreakdown.rulesComplianceScore >= 90
                              ? "bg-emerald-500/10 border-emerald-500/30"
                              : "bg-red-500/10 border-red-500/30"
                          }`}
                        >
                          <span className="text-[9px] font-bold uppercase text-neutral-400">Кастомные правила</span>
                          <div
                            className={`text-sm font-bold flex items-center justify-center gap-1 ${
                              shortsSeoAnalysis.scoreBreakdown.rulesComplianceScore >= 90 ? "text-emerald-400" : "text-red-400"
                            }`}
                          >
                            {shortsSeoAnalysis.scoreBreakdown.rulesComplianceScore}/100
                          </div>
                          <div className="w-full bg-neutral-800 h-1 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                shortsSeoAnalysis.scoreBreakdown.rulesComplianceScore >= 90 ? "bg-emerald-400" : "bg-red-400"
                              }`}
                              style={{ width: `${shortsSeoAnalysis.scoreBreakdown.rulesComplianceScore}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CTR PREDICTION CARD */}
                    {shortsSeoAnalysis.ctrPrediction && (() => {
                      const cp = shortsSeoAnalysis.ctrPrediction as any;
                      const predCtr = cp.predictedCtr ?? cp.predictedCTR ?? "N/A";
                      const benchmark = cp.benchmark ?? cp.benchmarkCTR ?? "5-8%";
                      const advice = cp.advice ?? cp.ctrKeyAdvice ?? "";
                      const potential = cp.potential ?? (typeof predCtr === "number" && predCtr >= 7 ? "high" : "medium");
                      return (
                        <div className="p-3 bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-blue-950/30 border border-blue-500/20 rounded-xl flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <TrendingUp size={16} className="text-blue-400 shrink-0" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">
                                  Прогноз CTR: ~{typeof predCtr === "number" ? `${predCtr}%` : predCtr}
                                </span>
                                <span className="text-[10px] text-neutral-400">
                                  (Бенчмарк ниши: {benchmark})
                                </span>
                              </div>
                              {advice && (
                                <p className="text-[11px] text-blue-200/80 leading-snug mt-0.5">
                                  {advice}
                                </p>
                              )}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded border shrink-0 ${
                              potential === "high"
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                : "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
                            }`}
                          >
                            Потенциал: {potential === "high" ? "Высокий" : "Умеренный"}
                          </span>
                        </div>
                      );
                    })()}

                    {/* CUSTOM RULES AUDIT PANEL */}
                    {shortsSeoAnalysis.customRulesAudit &&
                      shortsSeoAnalysis.customRulesAudit.items &&
                      shortsSeoAnalysis.customRulesAudit.items.length > 0 && (
                        <div className="p-3.5 bg-neutral-900/90 border border-emerald-500/30 rounded-xl space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <ShieldCheck size={16} className="text-emerald-400" />
                              <h6 className="text-xs font-bold text-white uppercase tracking-wider">
                                Аудит кастомных правил канала
                              </h6>
                              <span
                                className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                                  shortsSeoAnalysis.customRulesAudit.passedRules ===
                                  shortsSeoAnalysis.customRulesAudit.totalRules
                                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                    : "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30"
                                }`}
                              >
                                Соблюдено: {shortsSeoAnalysis.customRulesAudit.passedRules} из{" "}
                                {shortsSeoAnalysis.customRulesAudit.totalRules}
                              </span>
                            </div>

                            {shortsSeoAnalysis.customRulesAudit.passedRules <
                              shortsSeoAnalysis.customRulesAudit.totalRules &&
                              handleApplyAllShortsRuleFixes && (
                                <button
                                  type="button"
                                  onClick={handleApplyAllShortsRuleFixes}
                                  className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                                >
                                  <Zap size={12} className="text-emerald-400" />
                                  Применить все исправления правил в 1 клик
                                </button>
                              )}
                          </div>

                          <div className="space-y-2">
                            {shortsSeoAnalysis.customRulesAudit.items.map((auditItem: any, idx: number) => {
                              const isPassed = auditItem.status === "passed";
                              const isWarning = auditItem.status === "warning";
                              return (
                                <div
                                  key={`shorts-rule-audit-item-${idx}`}
                                  className={`p-2.5 rounded-lg border text-xs space-y-1.5 transition-colors ${
                                    isPassed
                                      ? "bg-emerald-500/5 border-emerald-500/20 text-neutral-300"
                                      : isWarning
                                      ? "bg-yellow-500/5 border-yellow-500/25 text-neutral-300"
                                      : "bg-red-500/5 border-red-500/30 text-neutral-200"
                                  }`}
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 font-semibold text-white">
                                      {isPassed ? (
                                        <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                                      ) : isWarning ? (
                                        <AlertTriangle size={13} className="text-yellow-400 shrink-0" />
                                      ) : (
                                        <AlertCircle size={13} className="text-red-400 shrink-0" />
                                      )}
                                      <span>{auditItem.ruleTitle}</span>
                                    </div>
                                    <span
                                      className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                                        isPassed
                                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                          : isWarning
                                          ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                          : "bg-red-500/20 text-red-400 border-red-500/30"
                                      }`}
                                    >
                                      {isPassed ? "Соблюдено" : isWarning ? "Внимание" : "Нарушено"}
                                    </span>
                                  </div>

                                  <p className="text-[11px] text-neutral-300 leading-snug">{auditItem.details}</p>

                                  {!isPassed && auditItem.suggestedFix && (
                                    <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-800/60">
                                      <div className="text-[10px] text-neutral-400 truncate max-w-md font-mono bg-neutral-950/80 px-2 py-1 rounded border border-neutral-800">
                                        Исправление:{" "}
                                        {auditItem.suggestedFix.length > 70
                                          ? auditItem.suggestedFix.substring(0, 70) + "..."
                                          : auditItem.suggestedFix}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          applyBroadShortsSEOChange(
                                            auditItem.targetField || "description",
                                            auditItem.suggestedFix,
                                            {
                                              ruleTitle: auditItem.ruleTitle,
                                              targetField: auditItem.targetField,
                                              isRuleViolation: true,
                                            }
                                          )
                                        }
                                        className="px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold rounded transition-all flex items-center gap-1 cursor-pointer"
                                      >
                                        <Check size={11} /> Исправить по правилу
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    {shortsSeoAnalysis.analysis && (
                      <div className="p-3 bg-neutral-900/40 rounded-lg border border-neutral-800/80">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                          Резюме аудитора:
                        </span>
                        <p className="text-xs text-neutral-300 italic leading-relaxed">{shortsSeoAnalysis.analysis}</p>
                      </div>
                    )}

                    {/* SEO Audit Improvements List - Dynamic Apply & Remove */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                          Точечные замечания аудита ({shortsSeoAnalysis.improvements?.length || 0})
                        </span>
                      </div>

                      {shortsSeoAnalysis.improvements && shortsSeoAnalysis.improvements.length > 0 ? (
                        shortsSeoAnalysis.improvements.map((imp: any, i: number) => (
                          <div
                            key={`shorts-seo-audit-item-${i}`}
                            className={`p-3 bg-neutral-900/60 rounded-lg border space-y-2 relative group transition-colors ${
                              imp.isRuleViolation
                                ? "border-red-500/40 hover:border-red-500/60"
                                : "border-neutral-800 hover:border-yellow-500/40"
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-white uppercase flex items-center gap-1.5">
                                  <Sparkles
                                    size={11}
                                    className={imp.isRuleViolation ? "text-red-400" : "text-yellow-500"}
                                  />
                                  {getAreaLabel(imp.area)}
                                </span>
                                {imp.isRuleViolation && (
                                  <span className="px-1.5 py-0.2 bg-red-500/20 text-red-300 border border-red-500/30 rounded text-[9px] font-bold">
                                    Кастомное правило
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`text-[8px] font-bold uppercase px-1.5 py-0.2 rounded ${
                                    imp.impact === "high"
                                      ? "bg-red-500/10 text-red-400"
                                      : imp.impact === "medium"
                                      ? "bg-yellow-500/10 text-yellow-400"
                                      : "bg-blue-500/10 text-blue-400"
                                  }`}
                                >
                                  {getImpactLabel(imp.impact)}
                                </span>
                                <button
                                  onClick={() => handleRemoveShortsAuditImprovement(i)}
                                  className="p-1 hover:bg-neutral-800 text-neutral-500 hover:text-red-400 rounded transition-colors cursor-pointer"
                                  title="Удалить замечание из списка"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            </div>

                            <p className="text-xs text-neutral-300 leading-snug">{imp.suggestion}</p>

                            {imp.suggestedValue && (
                              <div className="p-2 bg-neutral-950 rounded border border-neutral-800 text-[10px] text-neutral-400 font-mono">
                                Предлагаемый вариант:{" "}
                                {imp.suggestedValue && imp.suggestedValue.length > 90
                                  ? imp.suggestedValue.substring(0, 90) + "..."
                                  : imp.suggestedValue || ""}
                              </div>
                            )}

                            <div className="flex items-center gap-2 pt-1">
                              <button
                                onClick={() => handleApplyShortsSEOImprovement({ ...imp }, i)}
                                className={`w-full py-1.5 text-[10px] font-bold uppercase rounded-lg transition-colors border flex items-center justify-center gap-1.5 cursor-pointer ${
                                  imp.isRuleViolation
                                    ? "bg-red-500/15 hover:bg-red-500/25 text-red-300 border-red-500/30"
                                    : "bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border-yellow-500/20"
                                }`}
                              >
                                <Check size={12} /> Применить и убрать из списка
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center space-y-1">
                          <CheckCircle2 className="mx-auto text-emerald-400" size={18} />
                          <p className="text-xs font-bold text-emerald-300 uppercase">
                            Все замечания аудита успешно применены!
                          </p>
                          <p className="text-[10px] text-neutral-400">
                            Заголовок, описание и ключевые слова Shorts максимально оптимизированы.
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-neutral-800/60 rounded-2xl flex flex-col items-center justify-center gap-3 bg-neutral-950/20">
                <Search size={28} className="text-neutral-600 animate-pulse" />
                <p className="text-xs text-neutral-400">Пакет метаданных еще не сгенерирован.</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleGenerateShortsSeo(selectedShortForSeo)}
                    className="px-4 py-2 bg-accent hover:bg-accent/80 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw size={12} /> Сгенерировать SEO-пакет
                  </button>
                  <button
                    onClick={() => handleApplyLongFormSeoToShorts(selectedShortForSeo)}
                    className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Layers size={12} className="text-amber-400" /> Применить настройки SEO
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Social Media Cross-Promotion & 1:1 Quote Cards for Shorts */}
          <SocialPromoSection
            socialData={currentSeoToShow?.socialPromo || shorts.shortsSocialPromo || null}
            isGenerating={shorts.isGeneratingShortsSocial}
            onGenerate={shorts.handleGenerateShortsSocialPromo}
            title={shortsCtrTitle || (currentSeoToShow?.titles && currentSeoToShow.titles[0]) || "Shorts"}
            sourceType="shorts"
            channelName={selectedBranding?.name || (typeof nicheData?.branding?.names?.[0] === "string" ? nicheData.branding.names[0] : nicheData?.branding?.names?.[0]?.name) || "YouTube Shorts"}
          />
        </div>
      )}

      {/* Subtitles Modal for Shorts (TXT, SRT, SBV) */}
      <SubtitlesModal
        isOpen={subtitlesModalData.isOpen}
        onClose={() => setSubtitlesModalData((prev) => ({ ...prev, isOpen: false }))}
        scriptText={subtitlesModalData.script}
        title={subtitlesModalData.title || "Shorts"}
        isShorts={true}
      />

      {/* Shorts Ideas Export Modal */}
      <ShortsIdeasExportModal
        isOpen={isIdeasExportModalOpen}
        onClose={() => setIsIdeasExportModalOpen(false)}
        ideas={outlierIdeas}
        cutShorts={cutShortsResults}
        nicheName={nicheData?.niche}
        channelName={selectedBranding?.name}
        framework={outlierAnalysis?.framework}
      />

      {/* Shorts JSON Import/Export Modal */}
      <ShortsJsonImportExportModal
        isOpen={isJsonModalOpen}
        onClose={() => setIsJsonModalOpen(false)}
        ideas={outlierIdeas}
        onImportIdeas={handleImportIdeasFromJson}
        nicheName={nicheData?.niche}
        channelName={selectedBranding?.name}
      />

      {/* Add Custom Short Idea or Script Modal */}
      <AddCustomShortModal
        isOpen={isAddCustomModalOpen}
        onClose={() => setIsAddCustomModalOpen(false)}
        onAddIdea={handleAddCustomIdea}
        onAddDirectScript={handleAddCustomDirectScript}
        defaultNiche={nicheData?.niche}
      />

      {/* Context Menu for Shorts Idea Cards */}
      {contextMenuShort && (
        <IdeaCardContextMenu
          isOpen={Boolean(contextMenuShort)}
          onClose={() => setContextMenuShort(null)}
          position={contextMenuShort.position}
          currentColor={outlierIdeas.find(i => i.id === contextMenuShort.id)?.color}
          currentColorType={outlierIdeas.find(i => i.id === contextMenuShort.id)?.colorType}
          currentStatus={outlierIdeas.find(i => i.id === contextMenuShort.id)?.status || (outlierIdeas.find(i => i.id === contextMenuShort.id)?.isGenerated ? "Готово" : "Идея")}
          currentCategory={outlierIdeas.find(i => i.id === contextMenuShort.id)?.category}
          playlists={Array.from(new Set(outlierIdeas.map(i => i.playlist).filter(Boolean) as string[]))}
          suggestedPlaylist={`🎬 Shorts: ${nicheData?.niche || "Серия Shorts"}`}
          ideaTitle={contextMenuShort.title}
          onSelectColor={(color, colorType) => {
            setOutlierIdeas((prev: ShortsOutlierIdea[]) =>
              prev.map((item: ShortsOutlierIdea) =>
                item.id === contextMenuShort.id
                  ? { ...item, color, colorType }
                  : item
              )
            );
            if (color) {
              toast.success("Цвет карточки Shorts обновлен 🎨");
            } else {
              toast.info("Цвет карточки Shorts сброшен");
            }
          }}
          onAddToPlaylist={(pName) => {
            setOutlierIdeas((prev: ShortsOutlierIdea[]) =>
              prev.map((item: ShortsOutlierIdea) =>
                item.id === contextMenuShort.id
                  ? { ...item, playlist: pName }
                  : item
              )
            );
            toast.success(`Shorts добавлен в плейлист «${pName}» 🎬`);
          }}
          onCopyTitle={() => {
            copyToClipboard(contextMenuShort.title);
            toast.success("Заголовок Shorts скопирован!");
          }}
          onDelete={() => {
            handleDeleteOutlierIdea(contextMenuShort.id);
          }}
        />
      )}
    </div>
  );
};
