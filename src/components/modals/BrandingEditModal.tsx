import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Pencil, X } from "lucide-react";

interface BrandingEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  index: number | null;
  name: string;
  setName: (val: string) => void;
  slogan: string;
  setSlogan: (val: string) => void;
  onSave: () => void;
}

export const BrandingEditModal: React.FC<BrandingEditModalProps> = ({
  isOpen,
  onClose,
  index,
  name,
  setName,
  slogan,
  setSlogan,
  onSave,
}) => {
  if (!isOpen || index === null) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
                <Pencil size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  Редактировать брендинг
                </h3>
                <p className="text-xs text-neutral-500">
                  Вариант {index + 1}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                Название канала
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-accent outline-none transition-all placeholder:text-neutral-700 text-sm"
                placeholder="Название канала"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                Слоган
              </label>
              <textarea
                value={slogan}
                onChange={(e) => setSlogan(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-accent outline-none transition-all placeholder:text-neutral-700 h-24 resize-none text-sm"
                placeholder="Короткий и запоминающийся слоган"
              />
            </div>
          </div>

          <div className="p-6 bg-neutral-950/50 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded-xl text-xs transition-all"
            >
              ОТМЕНА
            </button>
            <button
              onClick={() => {
                onSave();
                onClose();
              }}
              className="flex-1 py-3 bg-accent hover:bg-emerald-400 text-black font-bold rounded-xl text-xs transition-all shadow-lg shadow-accent/20"
            >
              СОХРАНИТЬ
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
