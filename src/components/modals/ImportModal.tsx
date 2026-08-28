import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Zap, X, Plus, RefreshCw, Check } from "lucide-react";

export interface ImportModalData {
  isOpen: boolean;
  content: string;
  selectedTarget: string;
  importMode: "append" | "replace";
}

interface ImportModalProps {
  data: ImportModalData;
  setData: React.Dispatch<React.SetStateAction<ImportModalData>>;
  onExecuteImport: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  data,
  setData,
  onExecuteImport,
}) => {
  if (!data.isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] font-sans"
        >
          {/* Header */}
          <div className="p-5 bg-neutral-800/80 border-b border-neutral-700/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-tr from-accent to-primary rounded-lg flex items-center justify-center">
                <Zap size={18} className="text-white animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base leading-tight">Интеллектуальный импорт рекомендаций</h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">Перенос данных прямо в настройки проекта</p>
              </div>
            </div>
            <button
              onClick={() => setData((prev) => ({ ...prev, isOpen: false }))}
              className="text-neutral-400 hover:text-white transition-colors bg-neutral-950/40 p-1.5 rounded-lg border border-neutral-850 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-hide">
            {/* Source Content Preview */}
            <div className="space-y-2">
              <label className="text-[10px] text-neutral-400 uppercase font-black tracking-wider block">
                Редактировать текст рекомендации перед импортом
              </label>
              <textarea
                value={data.content}
                onChange={(e) => setData((prev) => ({ ...prev, content: e.target.value }))}
                className="w-full bg-neutral-950 border border-neutral-850 hover:border-neutral-800 focus:border-accent/50 rounded-xl p-3.5 text-xs text-neutral-200 focus:outline-none resize-none min-h-[120px] font-sans leading-relaxed"
                placeholder="Вставьте или отредактируйте текст..."
              />
            </div>

            {/* Target Settings */}
            <div className="space-y-2">
              <label className="text-[10px] text-neutral-400 uppercase font-black tracking-wider block">
                Куда импортировать данные?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { id: "script_wishes", label: "Пожелания к сценарию", desc: "Добавит в блок пожеланий во вкладке 'Сценарий'", icon: "📝" },
                  { id: "selected_idea", label: "Тема видео", desc: "Установит выбранную тему во вкладке 'Идеи'", icon: "💡" },
                  { id: "seo_title", label: "Заголовок видео (SEO)", desc: "Установит оптимизированный заголовок во вкладке 'SEO'", icon: "📺" },
                  { id: "seo_description", label: "Описание видео (SEO)", desc: "Добавит в описание видео во вкладке 'SEO'", icon: "✍️" },
                  { id: "seo_keywords", label: "Ключевые слова (SEO)", desc: "Добавит ключевые слова через запятую", icon: "🏷️" },
                  { id: "seo_hashtags", label: "Хэштеги (SEO)", desc: "Разберет слова и добавит в хэштеги", icon: "🔗" },
                  { id: "seo_viral", label: "Вирусные триггеры", desc: "Разберет строки и добавит в вирусные триггеры", icon: "✨" }
                ].map((target, tIdx) => {
                  const isSelected = data.selectedTarget === target.id;
                  return (
                    <button
                      key={`import-target-${target.id}-${tIdx}`}
                      onClick={() => setData((prev) => ({ ...prev, selectedTarget: target.id }))}
                      className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex gap-3 ${
                        isSelected
                          ? "bg-accent/10 border-accent text-accent"
                          : "bg-neutral-950/40 border-neutral-850 hover:border-neutral-800 hover:bg-neutral-900/40 text-neutral-300"
                      }`}
                    >
                      <span className="text-lg shrink-0 mt-0.5">{target.icon}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold leading-tight">{target.label}</p>
                        <p className="text-[10px] text-neutral-500 mt-0.5 leading-normal truncate">{target.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Import Mode Settings */}
            {data.selectedTarget !== "selected_idea" && data.selectedTarget !== "seo_title" && (
              <div className="space-y-2">
                <label className="text-[10px] text-neutral-400 uppercase font-black tracking-wider block">
                  Режим импорта
                </label>
                <div className="flex bg-neutral-950 p-1 rounded-xl border border-neutral-850 gap-1.5">
                  <button
                    onClick={() => setData((prev) => ({ ...prev, importMode: "append" }))}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      data.importMode === "append"
                        ? "bg-neutral-800 text-white border border-neutral-700 shadow-md"
                        : "text-neutral-400 hover:text-neutral-200 border border-transparent"
                    }`}
                  >
                    <Plus size={12} />
                    Дописать в конец (Append)
                  </button>
                  <button
                    onClick={() => setData((prev) => ({ ...prev, importMode: "replace" }))}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      data.importMode === "replace"
                        ? "bg-neutral-800 text-white border border-neutral-700 shadow-md"
                        : "text-neutral-400 hover:text-neutral-200 border border-transparent"
                    }`}
                  >
                    <RefreshCw size={12} />
                    Перезаписать полностью (Replace)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-neutral-800 bg-neutral-950/80 flex items-center justify-between">
            <button
              onClick={() => setData((prev) => ({ ...prev, isOpen: false }))}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl transition-all font-bold text-xs cursor-pointer border border-neutral-750"
            >
              Отмена
            </button>
            <button
              onClick={onExecuteImport}
              className="px-5 py-2.5 bg-gradient-to-r from-accent to-primary text-white hover:opacity-95 rounded-xl transition-all font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-accent/10 cursor-pointer"
            >
              <Check size={14} />
              Применить настройки
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
