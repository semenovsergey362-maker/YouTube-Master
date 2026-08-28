import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sliders, X, Sparkles, Check, RotateCcw } from "lucide-react";

interface CustomInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customInstructions: string;
  setCustomInstructions: (inst: string) => void;
  isCustomInstructionsEnabled: boolean;
  setIsCustomInstructionsEnabled: (enabled: boolean) => void;
  onResetToDefault: () => void;
}

export const CustomInstructionsModal: React.FC<CustomInstructionsModalProps> = ({
  isOpen,
  onClose,
  customInstructions,
  setCustomInstructions,
  isCustomInstructionsEnabled,
  setIsCustomInstructionsEnabled,
  onResetToDefault,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-neutral-900/50">
            <div className="flex items-center gap-2.5 text-primary font-bold text-base">
              <Sliders size={18} />
              <span>Глобальные инструкции для ИИ (System Prompt)</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div className="flex items-center justify-between p-3.5 bg-neutral-900/80 border border-border/60 rounded-xl">
              <div>
                <span className="text-sm font-semibold text-white block">
                  Применять кастомные инструкции
                </span>
                <span className="text-xs text-neutral-400">
                  Включает внедрение пользовательских правил во все запросы генерации
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isCustomInstructionsEnabled}
                  onChange={(e) => setIsCustomInstructionsEnabled(e.target.value === "true" || e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Текст инструкций и ограничений
              </label>
              <textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="Например: Не использовать клише 'в этом видео вы узнаете', говорить на 'ты', писать более разговорным языком..."
                rows={8}
                className="w-full p-4 bg-neutral-900 border border-border/80 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-primary transition-all resize-none font-mono text-xs leading-relaxed"
              />
            </div>

            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl text-xs text-neutral-300 space-y-1">
              <p className="font-semibold text-white flex items-center gap-1.5">
                <Sparkles size={14} className="text-primary" />
                Совет по эффективному промптингу:
              </p>
              <p className="leading-relaxed text-neutral-400">
                Задавайте стиль речи, табуированные слова, формат структуры или обязательные призывы к действию (CTA), специфичные для вашего канала.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-neutral-900/50">
            <button
              onClick={onResetToDefault}
              className="px-3.5 py-2 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw size={14} />
              Сброс к умолчанию
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-primary/20 transition-all"
            >
              <Check size={14} />
              Применить
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
