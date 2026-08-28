import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { History, X, Trash2, Calendar, FileText, ArrowRight } from "lucide-react";

export interface HistoryItem {
  id: string;
  date: string;
  topic: string;
  niche?: string;
  blocksCount?: number;
  data?: any;
}

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  historyList: HistoryItem[];
  onLoadHistoryItem: (item: HistoryItem) => void;
  onDeleteHistoryItem: (id: string) => void;
  onClearAllHistory: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  historyList,
  onLoadHistoryItem,
  onDeleteHistoryItem,
  onClearAllHistory,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-neutral-900/50">
            <div className="flex items-center gap-2.5 text-accent font-bold text-base">
              <History size={18} />
              <span>История проектов и сгенерированных сценариев</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {historyList.length === 0 ? (
              <div className="text-center py-12 text-neutral-500">
                <History className="mx-auto mb-3 opacity-40" size={36} />
                <p className="text-sm">История генераций пока пуста</p>
                <p className="text-xs text-neutral-600 mt-1">Все созданные сценарии будут сохраняться здесь</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historyList.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-neutral-900/70 border border-border/60 rounded-xl hover:border-accent/40 transition-all flex items-center justify-between group"
                  >
                    <div className="space-y-1 max-w-[70%]">
                      <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono">
                        <Calendar size={12} />
                        <span>{item.date}</span>
                        {item.niche && (
                          <span className="bg-neutral-800 px-2 py-0.5 rounded text-neutral-400">
                            {item.niche}
                          </span>
                        )}
                      </div>
                      <h5 className="text-sm font-bold text-white line-clamp-1 group-hover:text-accent transition-colors">
                        {item.topic || "Безымянный проект"}
                      </h5>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          onLoadHistoryItem(item);
                          onClose();
                        }}
                        className="px-3 py-1.5 bg-accent/10 hover:bg-accent text-accent hover:text-black font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-all"
                      >
                        Загрузить
                        <ArrowRight size={12} />
                      </button>
                      <button
                        onClick={() => onDeleteHistoryItem(item.id)}
                        className="p-1.5 hover:bg-red-500/10 text-neutral-500 hover:text-red-400 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {historyList.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-neutral-900/50">
              <button
                onClick={onClearAllHistory}
                className="px-3.5 py-2 hover:bg-red-500/10 text-red-400 hover:text-red-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 size={14} />
                Очистить всю историю
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Закрыть
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
