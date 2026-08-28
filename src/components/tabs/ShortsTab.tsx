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
} from "lucide-react";
import { getFullScriptText } from "../../utils/helpers";
import { optimizeTitle, type CutShortItem, type NicheData, type GeneratedBlock } from "../../services/geminiService";
import { useShortsGeneration } from "../../hooks/useShortsGeneration";

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
    shortsActiveSubTab = "cuts",
    setShortsActiveSubTab = () => {},
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
    handleDeleteShort,
    handleGenerateShortsSeo,
    handleAnalyzeShortsCtr,
    handleExportShortsZip,
  } = shorts;

  const currentSeoToShow =
    cutShortsResults.find(
      (item) =>
        item.loopEnding?.loopedFullScript === selectedShortForSeo ||
        item.script === selectedShortForSeo
    )?.seo || shortsSeoResult;

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
          { id: "cut", label: "Умная нарезка Long-Form", icon: Scissors },
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
                isActive ? "text-accent" : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <IconComp size={16} />
              <span>{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="activeShortsSubTabLine"
                  className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-accent rounded-full"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Content for subtabs */}
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
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                          Сценарий ролика:
                        </span>
                        <p className="text-xs text-neutral-300 whitespace-pre-wrap font-sans max-h-48 overflow-y-auto bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/50 leading-relaxed">
                          {item.loopEnding?.loopedFullScript || item.script}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-2 border-t border-neutral-800/60 space-y-2">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                            navigator.clipboard.writeText(full);
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
                    {isGeneratingShortsVisuals ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    Перегенерировать
                  </button>
                </div>

                {isGeneratingShortsVisuals ? (
                  <div className="flex flex-col items-center justify-center p-12 space-y-4">
                    <Loader2 size={40} className="text-accent animate-spin" />
                    <p className="text-neutral-400 animate-pulse font-medium">Создание детализированных промптов...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-4">
                      <h5 className="font-bold text-neutral-300 uppercase tracking-widest text-xs flex items-center gap-2">
                        <Camera size={14} className="text-emerald-400" />
                        Визуальные Промпты (Сцены)
                      </h5>
                      {shortsVisuals.map((v, i) => (
                        <div key={`shorts-visual-scene-${v.text.slice(0, 15)}-${i}`} className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl space-y-3 relative group">
                          <span className="absolute -top-2.5 -left-2.5 w-6 h-6 bg-emerald-500/20 text-emerald-400 font-black rounded-lg flex items-center justify-center text-xs border border-emerald-500/30">
                            {i + 1}
                          </span>
                          <div className="text-xs text-neutral-400 italic bg-neutral-900/50 p-2 rounded-lg">
                            "{v.text}"
                          </div>
                          <div className="text-sm font-mono text-neutral-200 whitespace-pre-wrap">
                            {v.prompt}
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(v.prompt);
                              toast.success("Промпт скопирован");
                            }}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-md cursor-pointer"
                          >
                            📋
                          </button>
                        </div>
                      ))}
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
                              navigator.clipboard.writeText(shortsMusicPrompt);
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
                <label className="text-xs font-bold text-neutral-300">
                  Первая строка описания (Сниппет):
                </label>
                <textarea
                  value={shortsCtrDescription}
                  onChange={(e) => setShortsCtrDescription(e.target.value)}
                  placeholder="Введите описание Shorts. Алгоритмы и зрители в ленте увидят первые 100 символов..."
                  rows={3}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-accent/50 focus:ring-1 focus:ring-accent/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-600 transition-all outline-none resize-none"
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
                <div className="bg-gradient-to-br from-neutral-950 via-neutral-950 to-amber-950/10 border border-neutral-800/80 p-4 rounded-2xl space-y-2 shadow-[0_12px_28px_rgba(245,158,11,0.05)]">
                  <div className="text-[10px] text-neutral-400 font-bold flex items-center justify-between">
                    <span>Описание Shorts:</span>
                    <button
                      onClick={() => handleApplyDescriptionToSeo(currentSeoToShow.description || "")}
                      className="text-emerald-400 hover:text-emerald-300 font-bold text-[10px] cursor-pointer"
                    >
                      Вставить в анализатор
                    </button>
                  </div>
                  <p className="text-neutral-300 whitespace-pre-wrap font-sans text-xs bg-neutral-900/60 p-3 rounded-xl border border-neutral-800/60 max-h-32 overflow-y-auto">
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
                            navigator.clipboard.writeText(tag);
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
        </div>
      )}
    </div>
  );
};
