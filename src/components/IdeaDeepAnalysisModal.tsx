import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Sparkles,
  Brain,
  Zap,
  CheckCircle2,
  TrendingUp,
  Gauge,
  Layers,
  Video,
  Scissors,
  Package,
  Target,
  Lightbulb,
  Copy,
  RotateCcw,
  Loader2,
  BookOpen,
  Flame,
} from "lucide-react";
import { IdeaDeepAnalysis } from "../services/geminiService";
import { toast } from "sonner";

interface IdeaDeepAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  ideaTitle: string;
  niche?: string;
  analysis: IdeaDeepAnalysis | null;
  isLoading: boolean;
  onReanalyze?: () => void;
}

export const IdeaDeepAnalysisModal: React.FC<IdeaDeepAnalysisModalProps> = ({
  isOpen,
  onClose,
  ideaTitle,
  niche,
  analysis,
  isLoading,
  onReanalyze,
}) => {
  if (!isOpen) return null;

  const handleCopyText = () => {
    if (!analysis) return;
    const textToCopy = `
🧠 Глубокий анализ темы: "${ideaTitle}"
${niche ? `Ниша: ${niche}\n` : ""}
✨ Уникальность: ${analysis.uniquenessScore}/100 (${analysis.uniquenessLabel})
- Анализ: ${analysis.uniquenessAnalysis}
- Отстройка от конкурентов: ${analysis.competitiveAngle}

⚙️ Сложность реализации: ${analysis.complexityScore}/5 (${analysis.complexityLabel})
- Ресерч: ${analysis.complexityBreakdown.research}
- Съемка: ${analysis.complexityBreakdown.production}
- Монтаж: ${analysis.complexityBreakdown.editing}
- Ресурсы: ${analysis.complexityBreakdown.resources?.join(", ")}

🎯 Аудитория: ${analysis.targetAudienceInsights}

🔥 Триггеры удержания:
${analysis.retentionTriggers?.map((t) => `• ${t}`).join("\n")}

💡 Рекомендации:
${analysis.recommendations?.map((r) => `• ${r}`).join("\n")}
    `.trim();

    navigator.clipboard.writeText(textToCopy);
    toast.success("Полный анализ скопирован в буфер обмена!");
  };

  const getUniquenessColor = (score: number) => {
    if (score >= 80) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    if (score >= 60) return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    return "text-rose-400 bg-rose-500/10 border-rose-500/30";
  };

  const getComplexityColor = (score: number) => {
    if (score <= 2) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    if (score <= 3) return "text-blue-400 bg-blue-500/10 border-blue-500/30";
    if (score <= 4) return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    return "text-purple-400 bg-purple-500/10 border-purple-500/30";
  };

  return (
    <AnimatePresence>
      <div key="idea-deep-analysis-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden my-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-neutral-800 flex items-start justify-between gap-4 bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-primary/10">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 bg-primary/20 text-primary border border-primary/30 rounded-full text-[11px] font-bold flex items-center gap-1.5 uppercase tracking-wider">
                  <Brain size={13} /> AI Глубокий анализ
                </span>
                {niche && (
                  <span className="px-2.5 py-1 bg-neutral-800 text-neutral-300 border border-neutral-700 rounded-full text-[11px] font-medium">
                    {niche}
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight break-words pt-1">
                {ideaTitle}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-all shrink-0 cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-4 text-center">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                  <Sparkles size={24} className="absolute inset-0 m-auto text-primary animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">
                    Проводим аналитику уникальности и сложности...
                  </h3>
                  <p className="text-xs text-neutral-400 max-w-sm">
                    Gemini оценивает отстройку от конкурентов, потенциал удержания и продакшн-затраты
                  </p>
                </div>
              </div>
            ) : analysis ? (
              <>
                {/* Metrics Overview Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Uniqueness Card */}
                  <div className={`p-4 rounded-xl border space-y-3 ${getUniquenessColor(analysis.uniquenessScore)}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Gauge size={18} />
                        <span className="text-xs font-bold uppercase tracking-wider">Уникальность темы</span>
                      </div>
                      <span className="text-2xl font-black">{analysis.uniquenessScore}/100</span>
                    </div>

                    <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-current h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(100, Math.max(5, analysis.uniquenessScore))}%` }}
                      />
                    </div>

                    <div className="text-xs font-semibold pt-1 border-t border-current/10">
                      Статус: <span className="font-bold underline">{analysis.uniquenessLabel}</span>
                    </div>
                  </div>

                  {/* Complexity Card */}
                  <div className={`p-4 rounded-xl border space-y-3 ${getComplexityColor(analysis.complexityScore)}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers size={18} />
                        <span className="text-xs font-bold uppercase tracking-wider">Сложность съемки</span>
                      </div>
                      <span className="text-2xl font-black">{analysis.complexityScore}/5</span>
                    </div>

                    {/* Complexity Level Bars */}
                    <div className="grid grid-cols-5 gap-1.5 h-2">
                      {[1, 2, 3, 4, 5].map((lvl, lIdx) => (
                        <div
                          key={`lvl-${lvl}-${lIdx}`}
                          className={`rounded-full transition-all ${
                            lvl <= analysis.complexityScore ? "bg-current" : "bg-black/40"
                          }`}
                        />
                      ))}
                    </div>

                    <div className="text-xs font-semibold pt-1 border-t border-current/10">
                      Уровень: <span className="font-bold underline">{analysis.complexityLabel}</span>
                    </div>
                  </div>
                </div>

                {/* Section 1: Uniqueness Analysis & Competitive Angle */}
                <div className="bg-neutral-950/60 border border-neutral-800 rounded-xl p-4 sm:p-5 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-400" /> Разбор уникальности и отстройка
                  </h3>
                  <div className="grid grid-cols-1 gap-3 text-xs">
                    <div className="bg-neutral-900/80 p-3.5 rounded-lg border border-neutral-800/80 space-y-1">
                      <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Анализ темы:</span>
                      <p className="text-neutral-200 leading-relaxed">{analysis.uniquenessAnalysis}</p>
                    </div>
                    <div className="bg-emerald-950/20 p-3.5 rounded-lg border border-emerald-500/20 space-y-1">
                      <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                        <TrendingUp size={12} /> Фирменный ракурс отстройки:
                      </span>
                      <p className="text-emerald-100 font-medium leading-relaxed">{analysis.competitiveAngle}</p>
                    </div>
                  </div>
                </div>

                {/* Section 2: Production Complexity Breakdown */}
                <div className="bg-neutral-950/60 border border-neutral-800 rounded-xl p-4 sm:p-5 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Zap size={16} className="text-blue-400" /> Затраты на продакшн и съемку
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-neutral-900/80 p-3 rounded-lg border border-neutral-800 space-y-1">
                      <div className="font-bold text-blue-400 flex items-center gap-1.5 text-[11px]">
                        <BookOpen size={12} /> Ресерч
                      </div>
                      <p className="text-neutral-300 leading-relaxed">{analysis.complexityBreakdown.research}</p>
                    </div>

                    <div className="bg-neutral-900/80 p-3 rounded-lg border border-neutral-800 space-y-1">
                      <div className="font-bold text-amber-400 flex items-center gap-1.5 text-[11px]">
                        <Video size={12} /> Съемка
                      </div>
                      <p className="text-neutral-300 leading-relaxed">{analysis.complexityBreakdown.production}</p>
                    </div>

                    <div className="bg-neutral-900/80 p-3 rounded-lg border border-neutral-800 space-y-1">
                      <div className="font-bold text-purple-400 flex items-center gap-1.5 text-[11px]">
                        <Scissors size={12} /> Монтаж
                      </div>
                      <p className="text-neutral-300 leading-relaxed">{analysis.complexityBreakdown.editing}</p>
                    </div>
                  </div>

                  {analysis.complexityBreakdown.resources && analysis.complexityBreakdown.resources.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-2 flex items-center gap-1">
                        <Package size={12} /> Требуемые ресурсы и реквизит:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.complexityBreakdown.resources.map((res, i) => (
                          <span
                            key={`idea-res-${res}-${i}`}
                            className="px-2.5 py-1 bg-neutral-900 border border-neutral-700/80 rounded-md text-[11px] text-neutral-300"
                          >
                            📦 {res}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 3: Audience & Retention Triggers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-neutral-950/60 border border-neutral-800 rounded-xl p-4 space-y-2">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Target size={14} className="text-primary" /> Портрет аудитории
                    </h4>
                    <p className="text-xs text-neutral-300 leading-relaxed">
                      {analysis.targetAudienceInsights}
                    </p>
                  </div>

                  <div className="bg-neutral-950/60 border border-neutral-800 rounded-xl p-4 space-y-2">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Flame size={14} className="text-rose-400" /> Триггеры удержания (Retention)
                    </h4>
                    <ul className="space-y-1.5 text-xs">
                      {analysis.retentionTriggers?.map((trig, idx) => (
                        <li key={`idea-trig-${trig}-${idx}`} className="flex items-start gap-2 text-neutral-300">
                          <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                          <span>{trig}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Section 4: Recommendations */}
                <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 sm:p-5 space-y-3">
                  <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                    <Lightbulb size={16} /> Советы по прокачке концепта для максимума просмотров
                  </h3>
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    {analysis.recommendations?.map((rec, i) => (
                      <div key={`idea-rec-${rec.slice(0, 20)}-${i}`} className="flex items-start gap-2 text-neutral-200 bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="leading-relaxed">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="py-12 text-center space-y-2 text-neutral-400">
                <p>Нет данных анализа.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 border-t border-neutral-800 bg-neutral-950 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {onReanalyze && (
                <button
                  onClick={onReanalyze}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                  <span>Перерасчитать</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {analysis && (
                <button
                  onClick={handleCopyText}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-neutral-700"
                >
                  <Copy size={13} /> Скопировать результат
                </button>
              )}
              <button
                onClick={onClose}
                className="px-5 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg shadow-primary/20"
              >
                Закрыть
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
