import React, { useState } from "react";
import { X, Sparkles, FileText, Lightbulb, Zap, Clock } from "lucide-react";
import { toast } from "sonner";
import type { ShortsOutlierIdea, CutShortItem } from "../services/geminiService";

export interface AddCustomShortModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddIdea: (idea: ShortsOutlierIdea, generateScriptNow?: boolean) => void;
  onAddDirectScript: (shortItem: CutShortItem) => void;
  defaultNiche?: string;
  isGeneratingScript?: boolean;
}

export const AddCustomShortModal: React.FC<AddCustomShortModalProps> = ({
  isOpen,
  onClose,
  onAddIdea,
  onAddDirectScript,
  defaultNiche = "YouTube Shorts",
  isGeneratingScript = false,
}) => {
  const [activeMode, setActiveMode] = useState<"idea" | "script">("idea");

  // Form states for "idea"
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaHook, setIdeaHook] = useState("");
  const [ideaWhyItWorks, setIdeaWhyItWorks] = useState("");
  const [ideaVisualTypes, setIdeaVisualTypes] = useState("");
  const [ideaDuration, setIdeaDuration] = useState("50-65 сек");
  const [ideaTrigger, setIdeaTrigger] = useState("Любопытство и интрига");
  const [autoGenerateScript, setAutoGenerateScript] = useState(true);

  // Form states for "script" (ready scenario)
  const [scriptTitle, setScriptTitle] = useState("");
  const [scriptHook, setScriptHook] = useState("");
  const [scriptFullText, setScriptFullText] = useState("");
  const [scriptDuration, setScriptDuration] = useState("60 сек");

  if (!isOpen) return null;

  const resetForm = () => {
    setIdeaTitle("");
    setIdeaHook("");
    setIdeaWhyItWorks("");
    setIdeaVisualTypes("");
    setIdeaDuration("50-65 сек");
    setIdeaTrigger("Любопытство и интрига");
    setScriptTitle("");
    setScriptHook("");
    setScriptFullText("");
    setScriptDuration("60 сек");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmitIdea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ideaTitle.trim()) {
      toast.error("Укажите тему или заголовок идеи!");
      return;
    }

    const visualTypesArray = ideaVisualTypes.trim()
      ? ideaVisualTypes.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)
      : ["Динамичные кадры в 9:16", "Выразительный визуальный якорь", "Кинематографичный свет"];

    const newIdea: ShortsOutlierIdea = {
      id: `custom_idea_${Date.now()}`,
      number: 1, // will be displayed properly
      title: ideaTitle.trim(),
      hook: ideaHook.trim() || ideaTitle.trim(),
      whyItWorks: ideaWhyItWorks.trim() || `Собственная идея автора для ниши «${defaultNiche}»`,
      visualTypes: visualTypesArray,
      visualContent: visualTypesArray,
      estimatedDuration: ideaDuration.trim() || "55 сек",
      trigger: ideaTrigger.trim() || "Интрига",
      emotionalTrigger: ideaTrigger.trim() || "Интрига",
      isGenerated: false,
    };

    onAddIdea(newIdea, autoGenerateScript);
    handleClose();
  };

  const handleSubmitScript = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scriptTitle.trim()) {
      toast.error("Укажите название вашего Shorts!");
      return;
    }
    if (!scriptFullText.trim()) {
      toast.error("Введите текст сценария!");
      return;
    }

    // Extract or build hook if not explicitly filled
    let effectiveHook = scriptHook.trim();
    if (!effectiveHook) {
      const firstLine = scriptFullText.trim().split("\n")[0] || scriptTitle.trim();
      effectiveHook = firstLine.replace(/\[[^\]]*\]/g, "").replace(/\([^)]*\)/g, "").trim();
      if (effectiveHook.length > 120) {
        effectiveHook = effectiveHook.slice(0, 117) + "...";
      }
    }

    const newShort: CutShortItem = {
      title: scriptTitle.trim(),
      hook: effectiveHook || scriptTitle.trim(),
      script: scriptFullText.trim(),
      viral_potential: "Собственный готовый сценарий",
      duration: scriptDuration.trim() || "60 сек",
    };

    onAddDirectScript(newShort);
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 w-full max-w-2xl rounded-3xl p-6 shadow-2xl space-y-5 my-8 text-neutral-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Добавить свой Shorts</h3>
              <p className="text-xs text-neutral-400">
                Создайте карточку идеи для ИИ-генерации сценария или вставьте свой готовый текст
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-neutral-950 p-1.5 rounded-2xl border border-neutral-800">
          <button
            type="button"
            onClick={() => setActiveMode("idea")}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeMode === "idea"
                ? "bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Lightbulb size={14} className={activeMode === "idea" ? "text-amber-400" : ""} />
            <span>Своя идея (сгенерировать сценарий ИИ)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode("script")}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeMode === "script"
                ? "bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <FileText size={14} className={activeMode === "script" ? "text-amber-400" : ""} />
            <span>Свой готовый сценарий (вставить текст)</span>
          </button>
        </div>

        {/* Mode 1: Idea Form */}
        {activeMode === "idea" ? (
          <form onSubmit={handleSubmitIdea} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-300 flex items-center justify-between">
                <span>Название / тема вашей идеи *</span>
                <span className="text-[10px] text-neutral-500 font-normal">Обязательное поле</span>
              </label>
              <input
                type="text"
                required
                value={ideaTitle}
                onChange={(e) => setIdeaTitle(e.target.value)}
                placeholder="Например: Скрытый трюк алгоритма YouTube, о котором молчат миллионники"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-600 outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1">
                  <Zap size={12} className="text-amber-400" />
                  <span>Хук первых 3 секунд (опционально)</span>
                </label>
                <input
                  type="text"
                  value={ideaHook}
                  onChange={(e) => setIdeaHook(e.target.value)}
                  placeholder="«Ты теряешь 80% показов из-за этой ошибки...»"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-600 outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1">
                  <Clock size={12} className="text-blue-400" />
                  <span>Примерный хронометраж</span>
                </label>
                <input
                  type="text"
                  value={ideaDuration}
                  onChange={(e) => setIdeaDuration(e.target.value)}
                  placeholder="50-65 сек, 45 сек, 60 сек..."
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-600 outline-none transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
                <span>Почему эта идея сработает / Суть ролика:</span>
                <span className="text-[10px] text-neutral-500 font-normal">Для контекста ИИ</span>
              </label>
              <textarea
                value={ideaWhyItWorks}
                onChange={(e) => setIdeaWhyItWorks(e.target.value)}
                rows={2}
                placeholder="В чём интрига, какую скрытую боль или любопытство зрителя мы закрываем..."
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 rounded-xl p-3 text-xs text-white placeholder-neutral-600 outline-none transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Что будет в кадре (визуал через запятую):
                </label>
                <input
                  type="text"
                  value={ideaVisualTypes}
                  onChange={(e) => setIdeaVisualTypes(e.target.value)}
                  placeholder="Лицо в шоке крупным планом, график падения просмотров, тайная схема..."
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-600 outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Эмоциональный триггер:
                </label>
                <input
                  type="text"
                  value={ideaTrigger}
                  onChange={(e) => setIdeaTrigger(e.target.value)}
                  placeholder="Любопытство, страх упустить, парадокс, инсайт..."
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-600 outline-none transition-colors"
                />
              </div>
            </div>

            <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-xl flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoGenerateScript}
                  onChange={(e) => setAutoGenerateScript(e.target.checked)}
                  className="rounded border-neutral-700 bg-neutral-900 text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs text-neutral-300 font-medium">
                  Сразу сгенерировать готовый сценарий и SEO (разбивка на сцены и промпты запускаются отдельно)
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={!ideaTitle.trim() || isGeneratingScript}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                <Sparkles size={14} />
                <span>{autoGenerateScript ? "Создать и сгенерировать сценарий" : "Добавить идею в список"}</span>
              </button>
            </div>
          </form>
        ) : (
          /* Mode 2: Direct Script Form */
          <form onSubmit={handleSubmitScript} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-300 flex items-center justify-between">
                <span>Название Shorts *</span>
                <span className="text-[10px] text-neutral-500 font-normal">Обязательное поле</span>
              </label>
              <input
                type="text"
                required
                value={scriptTitle}
                onChange={(e) => setScriptTitle(e.target.value)}
                placeholder="Например: Как удвоить удержание в Shorts за 3 шага"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-600 outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1">
                  <Zap size={12} className="text-amber-400" />
                  <span>Хук (первые 3-5 сек, опционально)</span>
                </label>
                <input
                  type="text"
                  value={scriptHook}
                  onChange={(e) => setScriptHook(e.target.value)}
                  placeholder="Если пусто — возьмём из первой строки текста"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-600 outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1">
                  <Clock size={12} className="text-blue-400" />
                  <span>Длительность</span>
                </label>
                <input
                  type="text"
                  value={scriptDuration}
                  onChange={(e) => setScriptDuration(e.target.value)}
                  placeholder="60 сек"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-600 outline-none transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-300">
                  Полный текст сценария Shorts *
                </label>
                <span className="text-[10px] text-neutral-500">
                  Слова: {scriptFullText.trim() ? scriptFullText.trim().split(/\s+/).length : 0}
                </span>
              </div>
              <textarea
                required
                value={scriptFullText}
                onChange={(e) => setScriptFullText(e.target.value)}
                rows={7}
                placeholder="Вставьте сюда готовый сценарий для диктора. Можно использовать разметку TTS: (500ms), *акцент*, [интригующе], [ТЕКСТ НА ЭКРАНЕ: «...»]"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 rounded-xl p-3.5 text-xs text-white placeholder-neutral-600 outline-none transition-colors resize-y leading-relaxed font-sans"
              />
            </div>

            <div className="p-3 bg-neutral-950/70 border border-neutral-800/80 rounded-xl text-[11px] text-neutral-400 flex items-start gap-2">
              <Sparkles size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <span>
                После добавления сценарий появится в карточках Shorts. Для него в 1 клик можно будет
                сгенерировать визуальные промпты, субтитры (SRT/SBV), бесшовную зацикленную концовку и SEO-пакет.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={!scriptTitle.trim() || !scriptFullText.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                <FileText size={14} />
                <span>Добавить сценарий в Shorts</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
