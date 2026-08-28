import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, X, Trash2 } from "lucide-react";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Подтвердите удаление",
  description = "Вы уверены, что хотите удалить этот элемент? Это действие невозможно отменить.",
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-neutral-900/50">
            <div className="flex items-center gap-2.5 text-red-400 font-bold text-base">
              <AlertTriangle size={18} />
              <span>{title}</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-6">
            <p className="text-sm text-neutral-300 leading-relaxed">
              {description}
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border/50 bg-neutral-900/50">
            <button
              onClick={onClose}
              className="px-4 py-2 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-red-600/20 transition-all"
            >
              <Trash2 size={14} />
              Удалить
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
