import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { StickyNote, X, Save, Trash2 } from "lucide-react";

interface QuickNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteText: string;
  setNoteText: (text: string) => void;
  onSave: () => void;
  onClear: () => void;
}

export const QuickNoteModal: React.FC<QuickNoteModalProps> = ({
  isOpen,
  onClose,
  noteText,
  setNoteText,
  onSave,
  onClear,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-neutral-900/50">
            <div className="flex items-center gap-2 text-accent font-bold text-base">
              <StickyNote size={18} />
              <span>Быстрая заметка / Черновик</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-xs text-neutral-400">
              Сохраняйте внезапные идеи, хуки, ссылки или пометки по монтажу. Они будут доступны во время работы над проектом.
            </p>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Напишите вашу заметку здесь..."
              rows={6}
              className="w-full p-4 bg-neutral-900 border border-border/80 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-accent transition-all resize-none"
            />
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-neutral-900/50">
            <button
              onClick={onClear}
              className="px-3.5 py-2 hover:bg-red-500/10 text-red-400 hover:text-red-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Trash2 size={14} />
              Очистить
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  onSave();
                  onClose();
                }}
                className="px-4 py-2 bg-accent hover:bg-accent/90 text-black font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-accent/20 transition-all"
              >
                <Save size={14} />
                Сохранить
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
