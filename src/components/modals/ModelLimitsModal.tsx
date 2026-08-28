import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, X } from "lucide-react";

interface ModelLimitsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModelLimitsModal: React.FC<ModelLimitsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl p-6 space-y-4 z-10"
        >
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-2xl">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Лимиты и модели AI</h3>
                <p className="text-xs text-neutral-500">Информация о квотах и генерации</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          <div className="space-y-2 text-xs text-neutral-300">
            <p className="leading-relaxed">
              Приложение использует современные модели Google Gemini для генерации сценариев, тегов, идей и анализа удержания.
            </p>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Рекомендуется использовать флагманскую модель <b className="text-emerald-400">Gemini 3.7 Flash</b> или <b className="text-purple-400">Gemini 3.1 Pro</b> для наилучшего качества и высокой скорости генерации.
            </p>
          </div>
          <div className="flex items-center justify-end pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Понятно
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
