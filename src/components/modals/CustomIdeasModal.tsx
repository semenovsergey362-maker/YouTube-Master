import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Sparkles, X, Loader2 } from "lucide-react";

interface CustomIdeasModalProps {
  isOpen: boolean;
  onClose: () => void;
  tab: "manual" | "ai";
  setTab: (tab: "manual" | "ai") => void;
  // Manual idea fields
  manualTitle: string;
  setManualTitle: (title: string) => void;
  manualDescription: string;
  setManualDescription: (desc: string) => void;
  manualPlaylist: string;
  setManualPlaylist: (playlist: string) => void;
  manualDuration: string;
  setManualDuration: (dur: string) => void;
  manualTone: string;
  setManualTone: (tone: string) => void;
  playlists: string[];
  onAddManualIdea: () => void;
  // AI description fields
  aiDescription: string;
  setAiDescription: (desc: string) => void;
  isGenerating: boolean;
  onGenerateFromDescription: () => void;
}

export const CustomIdeasModal: React.FC<CustomIdeasModalProps> = ({
  isOpen,
  onClose,
  tab,
  setTab,
  manualTitle,
  setManualTitle,
  manualDescription,
  setManualDescription,
  manualPlaylist,
  setManualPlaylist,
  manualDuration,
  setManualDuration,
  manualTone,
  setManualTone,
  playlists,
  onAddManualIdea,
  aiDescription,
  setAiDescription,
  isGenerating,
  onGenerateFromDescription,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-neutral-900 border border-neutral-800 w-full max-w-xl rounded-2xl p-6 shadow-2xl flex flex-col font-sans"
        >
          <div className="flex flex-wrap justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Plus className="text-accent" size={22} />
              Добавление и создание идей
            </h3>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-white transition-all p-1 hover:bg-neutral-800 rounded-lg cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Переключатель режимов */}
          <div className="flex border-b border-neutral-800 mb-5">
            <button
              type="button"
              onClick={() => setTab("manual")}
              className={`flex-1 py-2.5 text-xs font-bold transition-colors flex items-center justify-center gap-2 border-b-2 cursor-pointer ${
                tab === "manual"
                  ? "border-accent text-accent bg-accent/5"
                  : "border-transparent text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <Plus size={14} />
              <span>Своя идея (ручной ввод)</span>
            </button>
            <button
              type="button"
              onClick={() => setTab("ai")}
              className={`flex-1 py-2.5 text-xs font-bold transition-colors flex items-center justify-center gap-2 border-b-2 cursor-pointer ${
                tab === "ai"
                  ? "border-accent text-accent bg-accent/5"
                  : "border-transparent text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <Sparkles size={14} />
              <span>Генерация через ИИ</span>
            </button>
          </div>

          {tab === "manual" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                  Название идеи / Заголовок <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="Например: Как я собрал ПК за $200 из б/у деталей"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-accent transition-all font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                  Описание / Суть ролика
                </label>
                <textarea
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  placeholder="Краткое описание концепции, ключевые фишки или структуры..."
                  rows={3}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-accent transition-all resize-none font-sans"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Поместить в плейлист
                  </label>
                  <select
                    value={manualPlaylist}
                    onChange={(e) => setManualPlaylist(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-2 text-xs text-neutral-200 focus:outline-none focus:border-accent font-sans cursor-pointer"
                  >
                    <option value="">🎬 Без плейлиста</option>
                    {playlists.map((p, idx) => (
                      <option key={`playlist-opt-${idx}-${p}`} value={p}>
                        {p}
                      </option>
                    ))}
                    <option value="__new__">➕ Новый плейлист</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Длительность
                  </label>
                  <select
                    value={manualDuration}
                    onChange={(e) => setManualDuration(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-2 text-xs text-neutral-200 focus:outline-none focus:border-accent font-sans cursor-pointer"
                  >
                    <option value="10-15 мин">10-15 мин (Стандарт)</option>
                    <option value="5-8 мин">5-8 мин (Короткий видеоролик)</option>
                    <option value="20-30 мин">20-30 мин (Разбор / Подкаст)</option>
                    <option value="Shorts 60 сек">Shorts 60 сек</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Тональность
                  </label>
                  <select
                    value={manualTone}
                    onChange={(e) => setManualTone(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-2 text-xs text-neutral-200 focus:outline-none focus:border-accent font-sans cursor-pointer"
                  >
                    <option value="Развлекательный">Развлекательный</option>
                    <option value="Экспертный">Экспертный</option>
                    <option value="Интригующий">Интригующий</option>
                    <option value="Обучающий">Обучающий</option>
                    <option value="Юмористический">Юмористический</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 rounded-xl text-xs font-bold transition-all border border-neutral-800 cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={onAddManualIdea}
                  className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl text-xs font-bold hover:bg-accent/90 transition-all shadow-lg shadow-accent/20 cursor-pointer"
                >
                  <Plus size={14} />
                  Сохранить идею
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-neutral-400 leading-relaxed">
                Введите произвольное описание (тему, идею ролика, направление канала или любой текст), и Gemini сгенерирует для вас 10 высокоэффективных идей с кликабельными заголовками.
              </p>
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                  Описание / Текст для генерации
                </label>
                <textarea
                  value={aiDescription}
                  onChange={(e) => setAiDescription(e.target.value)}
                  placeholder="Например: Канал про путешествия автостопом по Азии с бюджетом $100..."
                  rows={5}
                  disabled={isGenerating}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-accent transition-all resize-none font-sans"
                />
              </div>
              <div className="flex items-center justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isGenerating}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 rounded-xl text-xs font-bold transition-all border border-neutral-800 cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={onGenerateFromDescription}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl text-xs font-bold hover:bg-accent/90 transition-all shadow-lg shadow-accent/20 disabled:opacity-50 cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Генерируем...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Сгенерировать идеи
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
