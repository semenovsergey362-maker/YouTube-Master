import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, X, Activity } from "lucide-react";
import { QuotaDetailsPanel } from "../QuotaIndicator";

interface ModelLimitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeModel?: string;
}

export const ModelLimitsModal: React.FC<ModelLimitsModalProps> = ({
  isOpen,
  onClose,
  activeModel = "gemini-3.1-flash-lite",
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl p-6 space-y-4 z-10 custom-scrollbar"
        >
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/20 text-primary rounded-2xl border border-primary/30">
                <Activity size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Квоты, лимиты и модели ИИ</h3>
                <p className="text-xs text-neutral-400">Мониторинг расхода токенов и каскада Gemini</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-4 text-xs text-neutral-300">
            {/* Live Quota Usage Panel */}
            <div className="p-4 bg-neutral-950/70 border border-neutral-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Текущее потребление ресурсов в реальном времени
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">Обновляется каждую секунду</span>
              </div>
              <QuotaDetailsPanel activeModel={activeModel} />
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-neutral-300 text-xs">Модели и заложенный каскад отказоустойчивости</h4>

              <div className="p-3 bg-neutral-950/70 border border-emerald-500/20 rounded-2xl flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-400">Gemini 3.8 Flash</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono">Флагман 2026</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                    Основная рекомендованная модель. Максимальные квоты запросов (1M TPM / 15 RPM), высокая скорость и превосходное понимание сценариев.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-neutral-950/70 border border-teal-500/20 rounded-2xl flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-teal-400 mt-1.5 shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-teal-400">Gemini 3.1 Flash Lite</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-300 font-mono">Без отказов</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                    Облегченная модель с рекордной пропускной способностью (30 RPM). Идеальна при частых генерациях без задержек.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-neutral-950/70 border border-amber-500/20 rounded-2xl flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-400">Gemini 3.7 Flash</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono">Адаптивная</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                    Модель с логическими рассуждениями. При исчерпании лимитов сервер мгновенно переключается на 3.8 Flash / 3.1 Lite, защищая от сбоев.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-neutral-950/70 border border-fuchsia-500/20 rounded-2xl flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-fuchsia-400 mt-1.5 shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-fuchsia-400">Gemini 3.1 Pro</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-fuchsia-500/10 text-fuchsia-300 font-mono">Pro Logic</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                    Глубокий анализ аудитории и фактов. При ограничении бесплатного тарифа (2 RPM) запросы автоматически сглаживаются ротатором.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-2.5 bg-neutral-800/40 rounded-xl border border-neutral-800 text-[11px] text-neutral-400 leading-relaxed">
              💡 <em>Автоматический Smart Fallback:</em> Приложение никогда не сбрасывает процесс генерации — если провайдер возвращает статус 429, система бесшовно направляет следующий попыточный шаг на Flash-модель.
            </div>
          </div>
          <div className="flex items-center justify-end pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
