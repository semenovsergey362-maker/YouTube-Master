import { logger } from "../../config/logger";
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ScrollFadeIn } from '../ScrollFadeIn';
import { 
  ChevronDown,
  Star,
  Zap, 
  Sparkles, 
  Loader2, 
  Image as ImageIcon, 
  Video, 
  Music, 
  Copy, 
  RefreshCw,
  Download,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Trash2,
  Play,
  Square as StopCircle,
  ArrowLeft,
  ArrowRight,
  Film,
  Lock,
  Unlock,
  Layers,
  Palette,
  Check,
  Sliders,
  Crown,
  Tv,
  Wand2,
  Eye,
  SlidersHorizontal,
  Camera,
  Sparkle,
  FileText,
  X,
  Clapperboard,
  Plus,
  Volume2
} from 'lucide-react';
import { toast } from 'sonner';
import { safeStorage } from '../../lib/storage';
import { getUnifiedScriptScenes, getBlockColorScheme, getSceneVisualText, copyToClipboard as copyTextToClipboard } from '../../utils/helpers';
import { getTransitionPromptTemplate, generateMasterMusicPrompt } from '../../services/geminiService';



export const PromptingTab = ({
  nicheData,
  selectedIdea,
  scriptTopic,
  promptImageStyle,
  promptAnimationType,
  promptMusicMood,
  generalAudioPrompt,
  scenePrompts,
  handleClearPromptingData,
  isGeneratingGlobalProduction,
  handleGenerateGlobalProduction,
  generatedBlocks,
  setGeneratedBlocks,
  annotatedScenes,
  toneOfVoice,
  promoImages,
  isGeneratingPromoImages,
  handleGeneratePromoImages,
  handleGenerateDetailedScenePrompt,
  isStylePinned,
  setIsStylePinned,
  pinnedStyles,
  setPinnedStyles,
  setPromptImageStyle,
  setPromptAnimationType,
  setPromptMusicMood,
  setGeneralAudioPrompt,
  musicContinuityEnabled,
  setMusicContinuityEnabled,
  veoSfxEnabled,
  setVeoSfxEnabled,
  scriptBreakdown,
  scriptStructure,
  selectedBlockIndex = "all",
  setSelectedBlockIndex,
  setScenePrompts,
  transitionPrompts,
  setTransitionPrompts,
  generatingTransitions,
  handleGenerateTransitionPrompt,
  handleUpdateSceneVisual,
  handleExportBreakdown,
  handleRegenerateFullBreakdown,
  isGeneratingBreakdown,
  handleAddNewScene,
  handleRegenerateTechPlan,
  isGeneratingBlock,
  selectedModel,
  setDetailedMusicModalBlockIndex
}: any) => {
  const currentBlockFilter = selectedBlockIndex;
  const setPromptingBlockFilter = (val: number | "all") => {
    if (setSelectedBlockIndex) {
      setSelectedBlockIndex(val);
    }
  };

  const [masterMusicPrompt, setMasterMusicPrompt] = React.useState(() => {
    return safeStorage.getItem("masterMusicPrompt") || "";
  });
  const [isGeneratingMasterMusic, setIsGeneratingMasterMusic] = React.useState(false);
  const [showAdvancedPrompting, setShowAdvancedPrompting] = React.useState(false);

  const handleUpdateMusicPrompt = (val: string) => {
    setMasterMusicPrompt(val);
    safeStorage.setItem("masterMusicPrompt", val);
    if (setGeneralAudioPrompt) setGeneralAudioPrompt(val);
  };

  const activeMusicPrompt = masterMusicPrompt || generalAudioPrompt || "";

  const handleGenerateMasterMusic = async () => {
    const scenesToRender = getUnifiedScriptScenes(scriptBreakdown, generatedBlocks, scriptStructure);
    if (!scenesToRender || scenesToRender.length === 0) {
      toast.error("Нет доступных сцен для анализа. Убедитесь, что сценарий сгенерирован.");
      return;
    }
    
    const fullScript = scenesToRender.map((s: any) => `${s.scene || ''}\n${s.text || ''}`).join("\n\n");
    const topicTitle = typeof selectedIdea === "string" ? selectedIdea : selectedIdea?.title;
    const currentTopic = scriptTopic || topicTitle || nicheData?.title || "Без темы";

    setIsGeneratingMasterMusic(true);
    try {
      const model = safeStorage.getItem('yt_selected_model') || 'gemini-3.1-pro';
      const isCustomEnabled = safeStorage.getItem('yt_custom_instructions_enabled') === 'true';
      const customInst = isCustomEnabled ? (safeStorage.getItem('yt_custom_instructions') || '') : '';

      const scriptWithMood = promptMusicMood
        ? `ПОЖЕЛАНИЯ ПО ЖАНРУ И НАСТРОЕНИЮ МУЗЫКИ: ${promptMusicMood}\n\n${fullScript}`
        : fullScript;

      const result = await generateMasterMusicPrompt(scriptWithMood, currentTopic, { 
        model: model, 
        customInstructions: customInst,
        toneOfVoice: toneOfVoice,
        globalMusicMood: promptMusicMood
      });
      handleUpdateMusicPrompt(result);
      toast.success("Мастер-промпт для фоновой музыки Suno успешно сгенерирован!");
    } catch (e: any) {
      toast.error(e.message || "Ошибка при генерации музыкального промпта");
    } finally {
      setIsGeneratingMasterMusic(false);
    }
  };

  const [viewPromptIndex, setViewPromptIndex] = React.useState<number | null>(null);



  // Single Scene & Block Regeneration State
  const [regeneratingSceneIndex, setRegeneratingSceneIndex] = React.useState<number | null>(null);
  const [isRegeneratingBlock, setIsRegeneratingBlock] = React.useState<number | null>(null);
  const [sceneCustomWishes, setSceneCustomWishes] = React.useState<Record<number, string>>({});
  const [openWishFormIndex, setOpenWishFormIndex] = React.useState<number | null>(null);

  const handleRegenerateSingleScene = async (actualIndex: number, customWish?: string) => {
    if (!handleGenerateDetailedScenePrompt) return;
    setRegeneratingSceneIndex(actualIndex);
    try {
      await handleGenerateDetailedScenePrompt(actualIndex, customWish);
      setSceneCustomWishes((prev) => ({ ...prev, [actualIndex]: '' }));
      setOpenWishFormIndex(null);
    } catch (err) {
      logger.error(err);
    } finally {
      setRegeneratingSceneIndex(null);
    }
  };

  const handleRegenerateBlockPrompts = async (blockIndex: number) => {
    if (!handleGenerateDetailedScenePrompt) return;
    const scenesForPrompting = getUnifiedScriptScenes(scriptBreakdown, generatedBlocks);
    const blockScenes = scenesForPrompting
      .map((sc: any, idx: number) => ({ sc, idx }))
      .filter(({ sc }: any) => sc.blockIndex === blockIndex);

    if (blockScenes.length === 0) {
      toast.error("В этом блоке не найдено сцен");
      return;
    }

    const toastId = toast.loading(`Обновление промптов для всех сцен Блока ${(blockIndex ?? 0) + 1} (${blockScenes.length} сцен)...`);
    setIsRegeneratingBlock(blockIndex);
    try {
      for (const { idx } of blockScenes) {
        await handleGenerateDetailedScenePrompt(idx);
      }
      toast.success(`Промпты для всех ${blockScenes.length} сцен Блока ${(blockIndex ?? 0) + 1} успешно перегенерированы!`, { id: toastId });
    } catch (err) {
      logger.error(err);
      toast.error("Ошибка при обновлении промптов блока", { id: toastId });
    } finally {
      setIsRegeneratingBlock(null);
    }
  };

  const activePinnedCount = [pinnedStyles?.imageStyle, pinnedStyles?.animationType, pinnedStyles?.audioEnvironment].filter(Boolean).length;

  const toggleStylePin = (styleKey: 'imageStyle' | 'animationType' | 'audioEnvironment') => {
    if (!setPinnedStyles) return;
    setPinnedStyles((prev: any) => {
      const isPinnedNow = !prev?.[styleKey];
      const next = {
        imageStyle: prev?.imageStyle || false,
        animationType: prev?.animationType || false,
        audioEnvironment: prev?.audioEnvironment || false,
        [styleKey]: isPinnedNow
      };
      const anyPinned = next.imageStyle || next.animationType || next.audioEnvironment;
      if (setIsStylePinned) setIsStylePinned(anyPinned);
      
      const styleName = styleKey === 'imageStyle' ? 'Визуальный Стиль' : styleKey === 'animationType' ? 'Динамика & Анимация' : 'Звуковое Окружение';
      if (isPinnedNow) {
        toast.success(`Раздел "${styleName}" закреплен! 🔒`);
      } else {
        toast.info(`Раздел "${styleName}" откреплен.`);
      }
      return next;
    });
  };



  const copyToClipboard = (text: string, label: string) => {
    copyTextToClipboard(text);
    toast.success(`${label} скопирован в буфер обмена`);
  };

  try {
    const hasPrompts = (scenePrompts || []).some((p: any) => p && (p.videoPrompt1 || p.videoPrompt2));

    return (
      <div className="space-y-8 pb-20">
      <div className="bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800 rounded-3xl p-5 md:p-6 space-y-4 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-accent/10 border border-accent/20 rounded-full text-accent text-[10px] font-black uppercase tracking-widest">
              <SlidersHorizontal size={12} />
              Стили сцены
            </div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              🎨 Визуальный стиль
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => toggleStylePin('imageStyle')}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all flex items-center gap-2 cursor-pointer ${
                isStylePinned
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : "bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white"
              }`}
            >
              <Sparkles size={12} className={isStylePinned ? "text-amber-400" : ""} />
              {isStylePinned ? "Закреплено" : "Закрепить"}
            </button>
            <button
              type="button"
              onClick={() => setShowAdvancedPrompting((prev) => !prev)}
              className="px-3 py-1.5 rounded-xl text-[10px] font-bold border border-neutral-700 bg-neutral-800 text-neutral-300 hover:text-white transition-all"
            >
              {showAdvancedPrompting ? "Скрыть доп. настройки" : "Показать доп. настройки"}
            </button>
          </div>
        </div>

        {showAdvancedPrompting && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-3 bg-neutral-950/60 p-5 rounded-2xl border border-neutral-800/80">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <label className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera size={15} className="text-amber-400" />
                  Стиль изображений и кадров
                </label>
                <span className="text-[10px] text-neutral-500 font-mono">Image</span>
              </div>

              <textarea
                rows={2}
                value={promptImageStyle || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (setPromptImageStyle) setPromptImageStyle(val);
                }}
                placeholder="Например: Кинематографичный фотореализм, 8k, объемный свет, лениза 35mm..."
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500/50 resize-none font-medium leading-relaxed"
              />

              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Пресеты:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { name: "📸 8K", val: "Кинематографичный фотореализм, 8k resolution, объемный естественный свет, лениза 35mm" },
                    { name: "🎨 3D", val: "3D рендер Unreal Engine 5, Octane render, объемные детализированные текстуры" },
                    { name: "✒️ 2D", val: "Аниме стиль Makoto Shinkai, живописный свет, детальный 2D арт" },
                    { name: "🌌 Киберпанк", val: "Киберпанк, неоновое освещение, дождь, высокие контрасты, футуристика" }
                  ].map((pst, idx) => (
                    <button
                      key={`prompting-style-preset-${pst.name}-${idx}`}
                      type="button"
                      onClick={() => {
                        if (setPromptImageStyle) setPromptImageStyle(pst.val);
                        toast.info(`Применен стиль: ${pst.name}`);
                      }}
                      className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        promptImageStyle === pst.val
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold"
                          : "bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 border-neutral-800 hover:border-neutral-700"
                      }`}
                    >
                      {pst.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3 bg-neutral-950/60 p-5 rounded-2xl border border-neutral-800/80">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <label className="text-xs font-black text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Film size={15} className="text-purple-400" />
                  Динамика и анимация
                </label>
                <span className="text-[10px] text-neutral-500 font-mono">Motion</span>
              </div>

              <textarea
                rows={2}
                value={promptAnimationType || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (setPromptAnimationType) setPromptAnimationType(val);
                }}
                placeholder="Например: Плавный наезд камеры (Slow Push-In), следящая камера, 24 fps..."
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-purple-500/50 resize-none font-medium leading-relaxed"
              />

              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Пресеты:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { name: "🎥 Slow Push-In", val: "Плавный медленный наезд камеры (Slow Push-In), фокусировка на объекте, 24 fps" },
                    { name: "⚡ Монтаж", val: "Динамичная смена планов, быстрый панорамный сдвиг, активный ритм монтажа" },
                    { name: "🌊 60fps", val: "Замедленная съемка (Slow Motion 60fps), детализированная плавность частиц" },
                    { name: "🚁 FPV", val: "Аэросъемка с квадрокоптера, динамичные виражи, масштабная панорама" }
                  ].map((pst, idx) => (
                    <button
                      key={`prompting-motion-preset-${pst.name}-${idx}`}
                      type="button"
                      onClick={() => {
                        if (setPromptAnimationType) setPromptAnimationType(pst.val);
                        toast.info(`Применен стиль анимации: ${pst.name}`);
                      }}
                      className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        promptAnimationType === pst.val
                          ? "bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold"
                          : "bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 border-neutral-800 hover:border-neutral-700"
                      }`}
                    >
                      {pst.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3 bg-neutral-950/60 p-5 rounded-2xl border border-neutral-800/80">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <label className="text-xs font-black text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Music size={15} className="text-blue-400" />
                  Музыкальный жанр & Настроение
                </label>
                <span className="text-[10px] text-neutral-500 font-mono">Audio</span>
              </div>

              <textarea
                rows={2}
                value={promptMusicMood || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (setPromptMusicMood) setPromptMusicMood(val);
                }}
                placeholder="Например: Эпичный темный synthwave, 120 bpm, нарастающее напряжение..."
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-blue-500/50 resize-none font-medium leading-relaxed"
              />

              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Пресеты:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { name: "🎵 Эпичный Synthwave", val: "Epic dark synthwave with rising tension, 120 BPM, punchy drums, airy synths" },
                    { name: "☕ Lo-Fi / Chill", val: "Lo-Fi chill hop, relaxed atmosphere, soft electric piano, warm vinyl crackle" },
                    { name: "🎬 Кинематографичный", val: "Cinematic orchestral score, epic strings, brass build-up, emotional climax" },
                    { name: "⚡ Upbeat / Corporate", val: "Upbeat energetic acoustic corporate pop, cheerful ukulele, bright piano" }
                  ].map((pst, idx) => (
                    <button
                      key={`prompting-music-preset-${pst.name}-${idx}`}
                      type="button"
                      onClick={() => {
                        if (setPromptMusicMood) setPromptMusicMood(pst.val);
                        toast.info(`Применен стиль музыки: ${pst.name}`);
                      }}
                      className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        promptMusicMood === pst.val
                          ? "bg-blue-500/20 text-blue-300 border-blue-500/40 font-bold"
                          : "bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 border-neutral-800 hover:border-neutral-700"
                      }`}
                    >
                      {pst.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Master Music Prompt Card (Always Visible) */}
        <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 text-blue-400">
                <Music size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  🎵 Мастер-промпт для фоновой музыки (Suno / Udio / AI)
                </h4>
                <p className="text-[11px] text-neutral-400 mt-0.5 max-w-xl">
                  Сгенерированный промпт фоновой музыки (до 1000 символов) для всего ролика с учетом настроения, темпа и глобальных кастомных инструкций.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleGenerateMasterMusic}
              disabled={isGeneratingMasterMusic || isGeneratingGlobalProduction}
              className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 font-bold text-xs rounded-xl transition-all border border-blue-500/40 flex items-center gap-2 shrink-0 disabled:opacity-50 cursor-pointer"
            >
              {isGeneratingMasterMusic ? (
                <><Loader2 size={14} className="animate-spin" /> Анализ...</>
              ) : (
                <><Sparkles size={14} /> {activeMusicPrompt ? "Перегенерировать" : "Сгенерировать"}</>
              )}
            </button>
          </div>

          <div className="relative group">
            <textarea
              value={activeMusicPrompt}
              onChange={(e) => handleUpdateMusicPrompt(e.target.value)}
              rows={3}
              placeholder="Музыкальный промпт пока не сгенерирован. Нажмите «Сгенерировать» или введите собственный мастер-промпт для Suno / Udio здесь..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-blue-500/50 resize-y min-h-[90px]"
            />
            {activeMusicPrompt && (
              <button
                type="button"
                onClick={() => {
                  copyTextToClipboard(activeMusicPrompt);
                  toast.success("Мастер-промпт скопирован!");
                }}
                className="absolute top-2 right-2 p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors border border-neutral-700 opacity-0 group-hover:opacity-100 cursor-pointer"
                title="Копировать промпт"
              >
                <Copy size={12} />
              </button>
            )}
            <div className="flex justify-between items-center mt-1">
              <span className="text-[10px] text-neutral-500">
                Используется при экспорте и при генерации видеоряда
              </span>
              <span className={`text-[10px] font-mono ${activeMusicPrompt.length > 1000 ? 'text-red-400 font-bold' : 'text-neutral-500'}`}>
                {activeMusicPrompt.length} / 1000 символов
              </span>
            </div>
          </div>
        </div>

        {showAdvancedPrompting && (
          <>
            <div className="bg-neutral-950/40 border border-neutral-800/80 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-emerald-500/20">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400">
                  <Music size={20} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white">🎵 SFX для Veo 3</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      Рекомендуется
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed max-w-2xl">
                    Считывать звуковые теги из монтажного листа и включать их в промпт анимации Veo 3.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                <span className="text-xs text-neutral-400 font-bold">
                  {veoSfxEnabled ? "Включено" : "Отключено"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (setVeoSfxEnabled) setVeoSfxEnabled(!veoSfxEnabled);
                    toast.success(!veoSfxEnabled ? "Звуковые эффекты включены" : "SFX отключен");
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    veoSfxEnabled ? "bg-emerald-500" : "bg-neutral-800"
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    veoSfxEnabled ? "translate-x-5" : "translate-x-0"
                  }`} />
                </button>
              </div>
            </div>
          </>
        )}


        {/* Sync Prompt Update Banner */}
        <div className="p-4 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-accent/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-300">
              <Zap size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-white">
                Обновление промптов под выбранный стиль
              </p>
              <p className="text-[11px] text-neutral-300 mt-0.5">
                Пересчитайте детализацию всех сцен для точного совпадения визуального стиля в ИИ генераторах.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerateGlobalProduction}
            disabled={isGeneratingGlobalProduction}
            className="px-5 py-2.5 bg-accent hover:bg-accent/90 text-black font-extrabold text-xs rounded-xl transition-all shadow-md shadow-accent/20 flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
          >
            {isGeneratingGlobalProduction ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Обновление сцен...
              </>
            ) : (
              <>
                <RefreshCw size={14} />
                Применить стиль и обновить промпты сцен
              </>
            )}
          </button>
        </div>
      </div>
      

      {!isGeneratingGlobalProduction && (!scenePrompts || scenePrompts.length === 0) ? (
        <div className="bg-neutral-900/50 border border-dashed border-neutral-800 rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-neutral-800 rounded-2xl flex items-center justify-center mx-auto text-neutral-600 mb-4">
            <Sparkles size={32} />
          </div>
          <h3 className="text-xl font-bold text-white">Готовы к визуализации?</h3>
          <p className="text-neutral-500 max-w-md mx-auto">
            Нажмите кнопку ниже, чтобы ИИ проанализировал ваш сценарий 
            и сгенерировал детальные промпты для каждой сцены.
          </p>
        </div>
      ) : null}

      {/* Scene Prompts Card */}
      {(() => {
        const scenesToRender = getUnifiedScriptScenes(scriptBreakdown, generatedBlocks, scriptStructure);
        if (scenesToRender.length === 0) return null;

        // Build list of unique blocks available in scenesToRender
        const blockMap = new Map<number, { index: number; title: string; count: number }>();
        scenesToRender.forEach((sc: any) => {
          const bIdx = sc.blockIndex !== undefined ? sc.blockIndex : 0;
          const bTitle = sc.blockTitle || (scriptStructure?.[bIdx]?.title) || `Блок ${bIdx + 1}`;
          if (!blockMap.has(bIdx)) {
            blockMap.set(bIdx, { index: bIdx, title: bTitle, count: 0 });
          }
          blockMap.get(bIdx)!.count += 1;
        });
        const availableBlocks = Array.from(blockMap.values()).sort((a, b) => a.index - b.index);

        const filteredScenesToRender = currentBlockFilter === "all"
          ? scenesToRender
          : scenesToRender.filter((sc: any) => sc.blockIndex === currentBlockFilter);

        const generatedPromptsCount = (scenePrompts || []).filter((p: any) => p && (p.videoPrompt1 || p.videoPrompt2)).length;
        const isOutOfSync = generatedPromptsCount > 0 && generatedPromptsCount !== scenesToRender.length;

        return (
          
          <div id="prompt-section-root" className="bg-neutral-900 border border-neutral-800 rounded-3xl">
            <div className="p-6 border-b border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-900/50 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                  <Zap className="text-accent" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    Промпты по Сценам ({scenesToRender.length} {scenesToRender.length === 1 ? 'сцена' : scenesToRender.length < 5 ? 'сцены' : 'сцен'})
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Синхронизировано с актуальным текстом и структурой сценария
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {handleRegenerateFullBreakdown && (
                  <button
                    type="button"
                    onClick={handleRegenerateFullBreakdown}
                    disabled={isGeneratingBreakdown}
                    className="flex items-center gap-2 px-3.5 py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shrink-0"
                    title="Сгенерировать или перегенерировать весь монтажный лист по тексту сценария"
                  >
                    {isGeneratingBreakdown ? (
                      <>
                        <Loader2 size={14} className="animate-spin text-cyan-300" />
                        <span>Генерация монтажного листа...</span>
                      </>
                    ) : (
                      <>
                        <Clapperboard size={14} />
                        <span>{scenesToRender.length > 0 ? "Перегенерировать Монтажный Лист" : "Сгенерировать Монтажный Лист"}</span>
                      </>
                    )}
                  </button>
                )}

                {handleExportBreakdown && (
                  <button
                    type="button"
                    onClick={handleExportBreakdown}
                    className="flex items-center gap-2 px-3.5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
                    title="Экспортировать монтажный лист и раскадровку в .txt"
                  >
                    <Download size={14} />
                    <span>Экспорт TXT</span>
                  </button>
                )}

                {handleAddNewScene && (
                  <button
                    type="button"
                    onClick={() => handleAddNewScene(currentBlockFilter === "all" ? 0 : currentBlockFilter)}
                    className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl text-xs transition-all cursor-pointer shrink-0 shadow-md shadow-emerald-500/20"
                    title="Добавить новый кадр в монтажный план"
                  >
                    <Plus size={14} />
                    <span>+ Кадр</span>
                  </button>
                )}

                {hasPrompts && (
                  <button
                    onClick={handleClearPromptingData}
                    className="flex items-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-red-400 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                  >
                    <AlertCircle size={14} />
                    Очистить всё
                  </button>
                )}

                <button
                  onClick={handleGenerateGlobalProduction}
                  disabled={isGeneratingGlobalProduction}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isOutOfSync 
                      ? "bg-amber-500 text-black hover:bg-amber-400 shadow-lg shadow-amber-500/20" 
                      : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold shadow-md shadow-amber-500/20"
                  }`}
                >
                  {isGeneratingGlobalProduction ? (
                    <>
                      <Loader2 className="animate-spin" size={14} />
                      Детализация всех сцен...
                    </>
                  ) : (
                    <>
                      <Zap size={14} className="fill-black" />
                      {isOutOfSync ? "⚠️ Пересчитать промпты под новый сценарий" : `Детализировать все промпты (${scenesToRender.length} сцен)`}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Script Block Plan Selection Bar */}
            {availableBlocks.length > 0 && (
              <div className="px-6 py-3.5 bg-neutral-950/90 border-b border-neutral-800 space-y-2.5 sticky top-[64px] z-40 backdrop-blur-md shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Layers size={13} className="text-accent" />
                    Выделение по плану блоков сценария:
                  </span>
                  {currentBlockFilter !== "all" && (
                    <button
                      onClick={() => {
                        setPromptingBlockFilter("all");
                        setTimeout(() => {
                          const el = document.getElementById("prompt-section-root");
                          if (el) {
                            const y = el.getBoundingClientRect().top + window.pageYOffset - 110;
                            window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
                          }
                        }, 50);
                      }}
                      className="text-[10px] text-accent hover:underline font-bold transition-all"
                    >
                      Показать все блоки ({scenesToRender.length})
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPromptingBlockFilter("all");
                      setTimeout(() => {
                        const el = document.getElementById("prompt-section-root");
                        if (el) {
                          const y = el.getBoundingClientRect().top + window.pageYOffset - 110;
                          window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
                        }
                      }, 50);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      currentBlockFilter === "all"
                        ? "bg-accent text-black shadow-md shadow-accent/20 scale-[1.02]"
                        : "bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white hover:bg-neutral-800"
                    }`}
                  >
                    <span>✨ Все блоки</span>
                    <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded-full font-mono">
                      {scenesToRender.length}
                    </span>
                  </button>

                  {availableBlocks.map((b, bIdx) => {
                    const colorScheme = getBlockColorScheme(b.index);
                    const isSelected = currentBlockFilter === b.index;
                    return (
                      <button
                        id={`prompt-block-chip-${b.index}`}
                        key={`prompt-block-chip-${b.index ?? "block"}-${bIdx}`}
                        type="button"
                        onClick={() => {
                          setPromptingBlockFilter(b.index);
                          setTimeout(() => {
                            const targetEl = document.getElementById(`prompt-block-${b.index}`) || document.getElementById(`prompt-scene-${b.index}`) || document.getElementById("prompt-section-root");
                            if (targetEl) {
                              const y = targetEl.getBoundingClientRect().top + window.pageYOffset - 120;
                              window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
                            }
                          }, 60);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                          isSelected
                            ? `${colorScheme.bg} ${colorScheme.border} ${colorScheme.text} ring-2 ${colorScheme.ring} scale-[1.02] shadow-lg`
                            : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white hover:bg-neutral-800"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${colorScheme.dotBg}`}></span>
                        <span className="truncate max-w-[200px]">{b.title}</span>
                        <span className={`text-[10px] ${isSelected ? colorScheme.badgeBg + ' ' + colorScheme.badgeText : 'bg-neutral-950 text-neutral-500'} px-1.5 py-0.5 rounded-full font-mono`}>
                          {b.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isOutOfSync && (
              <div className="px-6 py-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-3 text-xs text-amber-300">
                <AlertCircle size={16} className="shrink-0 text-amber-400" />
                <span>
                  Текст или количество сцен в сценарии изменились ({scenesToRender.length} сцен в сценарии vs {generatedPromptsCount} сгенерированных промптов). Нажмите <b>«Пересчитать промпты под новый сценарий»</b> для актуализации.
                </span>
              </div>
            )}
            
            <div className="divide-y divide-neutral-800">
              {filteredScenesToRender.map((scene: any, sIdx: number) => {
                const originalIndex = scenesToRender.indexOf(scene);
                const actualIndex = originalIndex >= 0 ? originalIndex : sIdx;
                const rawPromptData = scenePrompts?.[actualIndex] || {};
                const historyList = Array.isArray(rawPromptData.history) && rawPromptData.history.length > 0 ? rawPromptData.history : [];
                const activeVersionIdx = typeof rawPromptData.activeVersionIndex === 'number' ? rawPromptData.activeVersionIndex : (historyList.length > 0 ? historyList.length - 1 : -1);
                const promptData = (activeVersionIdx >= 0 && historyList[activeVersionIdx]) ? historyList[activeVersionIdx] : rawPromptData;

                const handleSwitchVersion = (verIdx: number) => {
                  if (!setScenePrompts) return;
                  const updatedPrompts = [...(scenePrompts || [])];
                  if (updatedPrompts[actualIndex]) {
                    const sel = updatedPrompts[actualIndex].history?.[verIdx];
                    if (sel) {
                      updatedPrompts[actualIndex] = {
                        ...updatedPrompts[actualIndex],
                        videoPrompt1: sel.videoPrompt1,
                        videoPrompt2: sel.videoPrompt2,
                        sceneSummary: sel.sceneSummary || updatedPrompts[actualIndex].sceneSummary,
                        activeVersionIndex: verIdx
                      };
                      setScenePrompts(updatedPrompts);
                    }
                  }
                };
                if (!scene) return null;
                const sceneText = scene.text || scene.description || scene.voiceover || "Текст не указан";
                const sceneVisual = getSceneVisualText(scene) || "Описание не указано";
                const blockStyle = getBlockColorScheme(scene.blockIndex ?? 0);
                const isBlockActive = currentBlockFilter === scene.blockIndex;

                const isFirstOfBlockInList = currentBlockFilter === "all" && (
                  sIdx === 0 || filteredScenesToRender[sIdx - 1]?.blockIndex !== scene.blockIndex
                );

                return (
                  <React.Fragment key={`prompt-scene-${scene.id ?? "scene"}-${actualIndex}-${sIdx}`}>
                    {isFirstOfBlockInList && (scene.blockIndex ?? 0) > 0 && (
                      <div className="mx-6 my-4 p-4 bg-neutral-900/20 border border-neutral-800/80 rounded-2xl relative overflow-hidden transition-all hover:bg-neutral-900/30">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-neutral-800/40">
                          <div className="space-y-0.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400 text-[10px] font-black uppercase tracking-wider">
                                <Sparkles size={10} />
                                <span>Связующий ИИ-переход</span>
                              </span>
                              <div className="text-[11px] font-bold text-neutral-300 flex items-center gap-1.5">
                                <span className="text-neutral-500 font-mono">Блок {scene.blockIndex}</span>
                                <ArrowRight size={10} className="text-neutral-600" />
                                <span className="text-neutral-400 font-mono">Блок {(scene.blockIndex ?? 0) + 1}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => setViewPromptIndex((scene.blockIndex ?? 0) - 1)}
                              className="px-2.5 py-1.5 bg-neutral-800/80 hover:bg-neutral-700 hover:text-white text-neutral-300 font-bold text-[11px] rounded-lg transition-all border border-neutral-700/30 flex items-center gap-1 cursor-pointer"
                            >
                              <FileText size={11} />
                              <span>Промпт</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleGenerateTransitionPrompt((scene.blockIndex ?? 0) - 1)}
                              disabled={generatingTransitions?.[(scene.blockIndex ?? 0) - 1]}
                              className="px-3 py-1.5 bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-black font-extrabold text-[11px] rounded-lg transition-all shadow-md shadow-purple-500/10 flex items-center gap-1 cursor-pointer"
                            >
                              {generatingTransitions?.[(scene.blockIndex ?? 0) - 1] ? (
                                <>
                                  <Loader2 size={11} className="animate-spin" />
                                  <span>Генерируем...</span>
                                </>
                              ) : transitionPrompts?.[(scene.blockIndex ?? 0) - 1] ? (
                                <>
                                  <RefreshCw size={11} />
                                  <span>Обновить</span>
                                </>
                              ) : (
                                <>
                                  <Sparkle size={11} className="fill-black" />
                                  <span>Создать</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Schematic Pipeline Preview */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center bg-neutral-950/50 rounded-xl p-3 border border-neutral-900/60 mb-3">
                          {/* Block A */}
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-1.5 text-[9px] text-neutral-500 font-black uppercase tracking-wider">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500/80 shrink-0"></span>
                              <span className="truncate">Блок {scene.blockIndex}: {scriptStructure?.[(scene.blockIndex ?? 0) - 1]?.title || 'Без названия'}</span>
                            </div>
                            <p className="text-[11px] text-neutral-300 line-clamp-1 italic font-sans pl-3">
                              "{generatedBlocks?.[(scene.blockIndex ?? 0) - 1]?.text || scriptStructure?.[(scene.blockIndex ?? 0) - 1]?.text || "Текст блока отсутствует..."}"
                            </p>
                          </div>

                          {/* Transition Type Connector */}
                          <div className="flex items-center justify-center gap-1.5 px-3 py-1 bg-purple-950/20 border border-purple-900/30 rounded-lg text-center mx-auto max-w-[190px] w-full shrink-0">
                            <Zap size={10} className="text-purple-400 fill-purple-400 shrink-0" />
                            <span className="text-[9px] font-black text-purple-300 uppercase tracking-widest truncate">
                              {transitionPrompts?.[(scene.blockIndex ?? 0) - 1] ? (
                                transitionPrompts[(scene.blockIndex ?? 0) - 1].transitionType || "Whip Pan / Match Cut"
                              ) : (
                                "Ожидает ИИ"
                              )}
                            </span>
                          </div>

                          {/* Block B */}
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-1.5 text-[9px] text-neutral-500 font-black uppercase tracking-wider md:justify-end">
                              <span className="truncate">Блок {(scene.blockIndex ?? 0) + 1}: {scriptStructure?.[scene.blockIndex]?.title || 'Без названия'}</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 shrink-0"></span>
                            </div>
                            <p className="text-[11px] text-neutral-300 line-clamp-1 italic font-sans pr-3 md:text-right">
                              "{generatedBlocks?.[scene.blockIndex]?.text || scriptStructure?.[scene.blockIndex]?.text || "Текст блока отсутствует..."}"
                            </p>
                          </div>
                        </div>

                        {generatingTransitions?.[(scene.blockIndex ?? 0) - 1] ? (
                          <div className="flex flex-col items-center justify-center py-6 bg-neutral-950/40 rounded-xl border border-dashed border-purple-500/20 text-center space-y-2 animate-pulse">
                            <div className="relative">
                              <div className="w-8 h-8 rounded-full border-2 border-purple-500/10 border-t-purple-500 animate-spin"></div>
                              <Sparkle size={12} className="text-purple-400 fill-purple-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-[11px] font-black text-purple-400">Генерируем бесшовную склейку...</p>
                              <p className="text-[9px] text-neutral-500 max-w-sm px-4">
                                Анализируем контекст блоков для создания плавного перехода
                              </p>
                            </div>
                          </div>
                        ) : transitionPrompts?.[(scene.blockIndex ?? 0) - 1] ? (
                          <div className="space-y-3 animate-in fade-in duration-200">
                            {/* Summary description */}
                            <div className="bg-neutral-950/50 p-3 rounded-xl border border-neutral-800/60 flex items-start gap-2">
                              <div className="p-1 bg-amber-500/10 rounded-lg text-amber-400 shrink-0 mt-0.5">
                                <Sparkles size={12} />
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider">Эффект склейки</span>
                                <p className="text-xs text-neutral-200 leading-relaxed font-sans">
                                  {transitionPrompts[(scene.blockIndex ?? 0) - 1].transitionSummary}
                                </p>
                              </div>
                            </div>

                            {/* Prompts columns */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {/* 1. Visual Prompt */}
                              <div className="space-y-1 bg-neutral-950/40 p-2.5 rounded-xl border border-neutral-800/40 hover:border-neutral-800 transition-colors">
                                <div className="flex items-center justify-between pb-1 border-b border-neutral-800/40">
                                  <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wide flex items-center gap-1">
                                    <ImageIcon size={10} />
                                    <span>Изображение (Imagen)</span>
                                  </span>
                                  <button
                                    onClick={() => copyToClipboard(transitionPrompts[(scene.blockIndex ?? 0) - 1].visualPrompt, "Кадр перехода")}
                                    className="p-1 text-neutral-500 hover:text-white rounded transition-all cursor-pointer hover:bg-neutral-800"
                                    title="Скопировать"
                                  >
                                    <Copy size={11} />
                                  </button>
                                </div>
                                <p className="text-[10px] text-neutral-300 font-mono leading-normal line-clamp-3 select-all pt-1" title={transitionPrompts[(scene.blockIndex ?? 0) - 1].visualPrompt}>
                                  {transitionPrompts[(scene.blockIndex ?? 0) - 1].visualPrompt}
                                </p>
                              </div>

                              {/* 2. Motion Prompt */}
                              <div className="space-y-1 bg-neutral-950/40 p-2.5 rounded-xl border border-neutral-800/40 hover:border-neutral-800 transition-colors">
                                <div className="flex items-center justify-between pb-1 border-b border-neutral-800/40">
                                  <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                                    <Video size={10} />
                                    <span>Анимация (Veo)</span>
                                  </span>
                                  <button
                                    onClick={() => copyToClipboard(transitionPrompts[(scene.blockIndex ?? 0) - 1].animationPrompt, "Промпт движения")}
                                    className="p-1 text-neutral-500 hover:text-white rounded transition-all cursor-pointer hover:bg-neutral-800"
                                    title="Скопировать"
                                  >
                                    <Copy size={11} />
                                  </button>
                                </div>
                                <p className="text-[10px] text-neutral-300 font-mono leading-normal line-clamp-3 select-all pt-1" title={transitionPrompts[(scene.blockIndex ?? 0) - 1].animationPrompt}>
                                  {transitionPrompts[(scene.blockIndex ?? 0) - 1].animationPrompt}
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center p-3 bg-neutral-950/20 rounded-xl border border-dashed border-neutral-800/60 text-center py-4">
                            <p className="text-[10px] text-neutral-500 font-medium">Переход еще не придуман</p>
                            <p className="text-[9px] text-neutral-600 mt-0.5">Нажмите «Создать», чтобы ИИ сгенерировал промпты для бесшовной склейки</p>
                          </div>
                        )}
                      </div>
                    )}
                    {isFirstOfBlockInList && (
                      <div
                        id={`prompt-block-${scene.blockIndex ?? 0}`}
                        className={`p-3.5 mx-6 my-4 rounded-2xl border transition-all ${
                          isBlockActive
                            ? `${blockStyle.bg} ${blockStyle.border} ring-2 ${blockStyle.ring} shadow-lg shadow-accent/10`
                            : `${blockStyle.bg} ${blockStyle.border}`
                        } flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-6 h-6 rounded-lg ${blockStyle.badgeBg} ${blockStyle.badgeText} text-xs font-black flex items-center justify-center shrink-0 border ${blockStyle.border}`}>
                            {(scene.blockIndex ?? 0) + 1}
                          </span>
                          <h5 className={`text-xs font-black ${blockStyle.text} uppercase tracking-wider truncate`}>
                            {scene.blockTitle || `Блок ${(scene.blockIndex ?? 0) + 1}`}
                          </h5>
                          {isBlockActive && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-accent text-black animate-pulse ml-2 shrink-0">
                              ✨ Активный блок
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {handleRegenerateTechPlan && (
                            <button
                              type="button"
                              onClick={() => handleRegenerateTechPlan(scene.blockIndex ?? 0)}
                              disabled={isGeneratingBlock?.[scene.blockIndex ?? 0]}
                              className="px-2.5 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg text-[10px] font-bold border border-cyan-500/40 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                              title="Сгенерировать монтажный лист заново для этого блока"
                            >
                              {isGeneratingBlock?.[scene.blockIndex ?? 0] ? (
                                <Loader2 size={12} className="animate-spin text-cyan-300" />
                              ) : (
                                <Clapperboard size={12} />
                              )}
                              <span>Техплан</span>
                            </button>
                          )}

                          {handleAddNewScene && (
                            <button
                              type="button"
                              onClick={() => handleAddNewScene(scene.blockIndex ?? 0)}
                              className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg text-[10px] font-bold border border-emerald-500/40 flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Добавить новый кадр в этот блок сценария"
                            >
                              <Plus size={12} />
                              <span>+ Кадр</span>
                            </button>
                          )}

                          {setDetailedMusicModalBlockIndex && (
                            <button
                              type="button"
                              onClick={() => setDetailedMusicModalBlockIndex(scene.blockIndex ?? 0)}
                              className="px-2.5 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg text-[10px] font-bold border border-purple-500/40 flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Детальный конструктор фоновой музыки для этого блока"
                            >
                              <Music size={12} />
                              <span>Музыка</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRegenerateBlockPrompts(scene.blockIndex ?? 0)}
                            disabled={isRegeneratingBlock === (scene.blockIndex ?? 0)}
                            className="px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-amber-300 hover:text-amber-200 rounded-lg text-[10px] font-bold border border-amber-500/30 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                            title="Перегенерировать промпты для всех сцен этого блока"
                          >
                            {isRegeneratingBlock === (scene.blockIndex ?? 0) ? (
                              <>
                                <Loader2 size={12} className="animate-spin text-amber-400" />
                                Обновление блока...
                              </>
                            ) : (
                              <>
                                <RefreshCw size={12} className="text-amber-400" />
                                Перегенерировать все сцены блока №{(scene.blockIndex ?? 0) + 1}
                              </>
                            )}
                          </button>
                          <span className="text-[10px] font-mono text-neutral-400 bg-neutral-950 px-2.5 py-1 rounded-lg border border-neutral-800">
                            Блок #{(scene.blockIndex ?? 0) + 1}
                          </span>
                        </div>
                      </div>
                    )}

                    <div
                      id={`prompt-scene-${actualIndex}`}
                      className={`p-6 border-l-4 ${blockStyle.accentBorder} transition-all ${
                        isBlockActive && currentBlockFilter !== "all"
                          ? `bg-neutral-900/90 ring-2 ${blockStyle.ring} ${blockStyle.border} shadow-lg shadow-accent/10`
                          : "hover:bg-neutral-800/30"
                      }`}
                    >
                      <div className="flex flex-col md:flex-row gap-6">
                        <div className="md:w-1/3 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                              Сцена {actualIndex + 1} из {scenesToRender.length}
                            </span>
                            {scene.duration && (
                              <span className="text-[10px] font-bold bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded border border-neutral-700">
                                ⏱️ {scene.duration}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="text-sm font-bold text-white max-w-full min-w-0 break-words">
                              {scene.scene || scene.title || `Сцена ${actualIndex + 1}`}
                            </div>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${blockStyle.badgeBg} ${blockStyle.badgeText} border ${blockStyle.border} inline-flex items-center gap-1 min-w-0 shrink`}>
                              <span className="truncate">📌 {scene.blockTitle || `Блок ${(scene.blockIndex ?? 0) + 1}`}</span>
                            </span>
                          </div>

                          {/* Script voiceover text for full clarity */}
                          <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-xs text-neutral-300 font-mono leading-relaxed max-h-36 overflow-y-auto scrollbar-hide">
                            <span className="text-[10px] font-bold text-neutral-500 uppercase block mb-1 font-sans">
                              Текст из сценария:
                            </span>
                            {sceneText}
                          </div>

                          {/* Visual Plan in Russian */}
                          <div className="text-xs text-neutral-300 bg-neutral-950/80 p-3 rounded-xl border border-neutral-800/80 space-y-1.5">
                            <div className="flex flex-wrap items-center justify-between gap-1">
                              <span className="font-bold text-amber-400 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                                <Video size={13} className="text-amber-400" />
                                Визуальный план:
                              </span>
                              {promptData?.sceneSummary && (
                                <span className="text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold">
                                  Детализирован AI
                                </span>
                              )}
                            </div>
                            <textarea
                              value={promptData?.sceneSummary || sceneVisual || (typeof scene.description === 'string' ? scene.description : '') || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (handleUpdateSceneVisual) {
                                  handleUpdateSceneVisual(actualIndex, val);
                                }
                                if (setScenePrompts) {
                                  const updatedPrompts = [...(scenePrompts || [])];
                                  while (updatedPrompts.length <= actualIndex) {
                                    updatedPrompts.push({ sceneSummary: '', startFramePrompt: '', endFramePrompt: '', imagePrompt: '', animationPrompt: '' });
                                  }
                                  updatedPrompts[actualIndex] = {
                                    ...updatedPrompts[actualIndex],
                                    sceneSummary: val
                                  };
                                  setScenePrompts(updatedPrompts);
                                }
                              }}
                              rows={3}
                              className="w-full bg-neutral-900/50 border border-neutral-800/80 rounded-lg p-2 text-xs text-neutral-200 leading-relaxed focus:outline-none focus:border-amber-500/50 resize-y font-sans"
                              placeholder="Опишите визуальный план кадра на русском языке для синхронизации со сценарием..."
                            />
                          </div>

                          {/* Single Scene Detailing & Regeneration Controls */}
                          <div className="space-y-2.5 pt-1 border-t border-neutral-800/60">
                            <button
                              onClick={() => handleRegenerateSingleScene(actualIndex, sceneCustomWishes[actualIndex])}
                              disabled={regeneratingSceneIndex === actualIndex}
                              className="flex items-center justify-center gap-2 w-full px-3 py-2.5 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-500 hover:from-amber-500 hover:to-orange-400 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-600/20 disabled:opacity-50"
                            >
                              {regeneratingSceneIndex === actualIndex ? (
                                <>
                                  <Loader2 size={14} className="animate-spin text-white" />
                                  <span>Генерация варианта...</span>
                                </>
                              ) : (
                                <>
                                  <Zap size={14} className="text-amber-200 fill-amber-200" />
                                  <span>🎲 Ещё вариант промпта (Итерация)</span>
                                </>
                              )}
                            </button>

                            {/* Preset Wish Badges */}
                            <div className="space-y-1.5">
                              <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Быстрые режимы (Claude & Hollywood):</span>
                              <div className="flex flex-wrap gap-1.5">
                                {[
                                  { label: "🎥 Макро/Руки 35mm", wish: "Close-up on hands, 35mm lens, shallow depth of field, dust particles in light" },
                                  { label: "🎬 Rack Focus", wish: "Slow smooth camera dolly and rack focus shifting smooth between objects" },
                                  { label: "🌄 Панорама", wish: "Cinematic wide angle landscape shot with dramatic atmospheric horizon lighting" },
                                  { label: "🗣️ Эмоция/Реакция", wish: "Cinematic medium close-up focusing on authentic human emotion and expression" },
                                  { label: "✨ Новый цвет и свет", wish: "Change location ambiance, cinematic volumetric golden hour lighting and high contrast" }
                                ].map((preset, pIdx) => (
                                  <button
                                    key={`wish-preset-${preset.label}-${actualIndex}-${pIdx}`}
                                    type="button"
                                    onClick={() => {
                                      setSceneCustomWishes((prev) => ({ ...prev, [actualIndex]: preset.wish }));
                                      setOpenWishFormIndex(actualIndex);
                                      handleRegenerateSingleScene(actualIndex, preset.wish);
                                    }}
                                    disabled={regeneratingSceneIndex === actualIndex}
                                    className="px-2 py-1 bg-neutral-900 hover:bg-amber-500/10 hover:text-amber-300 text-neutral-400 border border-neutral-800 hover:border-amber-500/30 rounded-lg text-[9px] font-bold transition-all cursor-pointer disabled:opacity-50"
                                  >
                                    {preset.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setOpenWishFormIndex(openWishFormIndex === actualIndex ? null : actualIndex)}
                              className="text-[10px] font-semibold text-neutral-400 hover:text-amber-300 flex items-center justify-center gap-1 w-full pt-0.5 transition-colors cursor-pointer"
                            >
                              {openWishFormIndex === actualIndex ? "▲ Скрыть точные пожелания" : "✏️ Указать индивидуальные пожелания"}
                            </button>

                            {openWishFormIndex === actualIndex && (
                              <div className="p-3 bg-neutral-950 rounded-xl border border-amber-500/30 space-y-2 animate-in fade-in duration-150">
                                <label className="block text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                                  Индивидуальные требования к сцене №{actualIndex + 1}:
                                </label>
                                <textarea
                                  rows={2}
                                  value={sceneCustomWishes[actualIndex] || ''}
                                  onChange={(e) => setSceneCustomWishes({ ...sceneCustomWishes, [actualIndex]: e.target.value })}
                                  placeholder="Например: 'Сделай акцент на крупных планах рук с мукой, как в рецептурных роликах', или 'Добавь туман и свечение'..."
                                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500 font-sans resize-none"
                                />
                                <button
                                  onClick={() => handleRegenerateSingleScene(actualIndex, sceneCustomWishes[actualIndex])}
                                  disabled={regeneratingSceneIndex === actualIndex || !sceneCustomWishes[actualIndex]?.trim()}
                                  className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-[10px] uppercase tracking-wider rounded-lg transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                                >
                                  {regeneratingSceneIndex === actualIndex ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                                  Сгенерировать вариант с пожеланием
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="md:w-2/3 space-y-4">
                          {/* Top Action Header for Prompt Copying & Scene Regeneration */}
                          <div className="space-y-2 pb-2 border-b border-neutral-800/60">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                                  <Sparkles size={13} className="text-amber-400" />
                                  AI Промпты для Кадров и Видео
                                </span>
                                {historyList.length > 1 && (
                                  <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded-md text-[9px] font-extrabold text-amber-300">
                                    Вариант {activeVersionIdx + 1} из {historyList.length}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  onClick={() => handleRegenerateSingleScene(actualIndex, sceneCustomWishes[actualIndex])}
                                  disabled={regeneratingSceneIndex === actualIndex}
                                  className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 border border-amber-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                                  title="Сгенерировать еще вариант этого кадра"
                                >
                                  {regeneratingSceneIndex === actualIndex ? (
                                    <>
                                      <Loader2 size={12} className="animate-spin text-amber-400" />
                                      Генерация...
                                    </>
                                  ) : (
                                    <>
                                      <RefreshCw size={12} className="text-amber-400" />
                                      🎲 Ещё вариант
                                    </>
                                  )}
                                </button>

                                {((promptData.videoPrompt1 || promptData.videoPrompt2)) && (
                                  <button
                                    onClick={() => {
                                      const allText = `[РАКУРС 1 - VEO 3]:
${promptData.videoPrompt1 || ''}

[РАКУРС 2 - VEO 3]:
${promptData.videoPrompt2 || ''}`;
                                      copyToClipboard(allText, `Все промпты для сцены ${actualIndex + 1}`);
                                    }}
                                    className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-neutral-700"
                                    title="Скопировать оба промпта сцены сразу"
                                  >
                                    <Copy size={12} />
                                    Скопировать оба промпта
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Version History Tabs Switcher */}
                            {historyList.length > 1 && (
                              <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1 scrollbar-hide">
                                <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider shrink-0">История вариаций:</span>
                                {historyList.map((hItem: any, hIdx: number) => {
                                  const isActive = hIdx === activeVersionIdx;
                                  return (
                                    <button
                                      key={`prompting-history-ver-${actualIndex}-${hIdx}`}
                                      onClick={() => handleSwitchVersion(hIdx)}
                                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all shrink-0 cursor-pointer border ${
                                        isActive
                                          ? "bg-amber-500 text-black border-amber-400 font-extrabold shadow-sm"
                                          : "bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border-neutral-800"
                                      }`}
                                    >
                                      #{hIdx + 1} {isActive ? "(Активный)" : ""}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* РАКУРС 1 */}
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center justify-between gap-1">
                              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wide">
                                <Video size={14} />
                                <span>Ракурс 1</span>
                                <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-extrabold">
                                  Veo 3
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => copyToClipboard(promptData.videoPrompt1, `Ракурс 1 для сцены ${actualIndex + 1}`)}
                                  disabled={!promptData.videoPrompt1}
                                  className="p-1.5 text-neutral-500 hover:text-white rounded-lg hover:bg-neutral-800 transition-all disabled:opacity-50 cursor-pointer"
                                  title="Скопировать промпт (Ракурс 1)"
                                >
                                  <Copy size={14} />
                                </button>
                              </div>
                            </div>
                            <div className="p-3.5 bg-neutral-950 rounded-xl border border-neutral-800 text-xs text-neutral-300 font-mono leading-relaxed min-h-[80px]">
                              {promptData.videoPrompt1 || (isGeneratingGlobalProduction ? "Генерация промпта..." : "Сгенерируйте стиль продакшена для получения промпта")}
                            </div>
                          </div>

                          {/* РАКУРС 2 */}
                          <div className="space-y-1.5 pt-6 mt-6 border-t border-neutral-800/80">
                            <div className="flex flex-wrap items-center justify-between gap-1">
                              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wide">
                                <Video size={14} />
                                <span>Ракурс 2</span>
                                <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-extrabold">
                                  Veo 3
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => copyToClipboard(promptData.videoPrompt2, `Ракурс 2 для сцены ${actualIndex + 1}`)}
                                  disabled={!promptData.videoPrompt2}
                                  className="p-1.5 text-neutral-500 hover:text-white rounded-lg hover:bg-neutral-800 transition-all disabled:opacity-50 cursor-pointer"
                                  title="Скопировать промпт (Ракурс 2)"
                                >
                                  <Copy size={14} />
                                </button>
                              </div>
                            </div>
                            <div className="p-3.5 bg-neutral-950 rounded-xl border border-neutral-800 text-xs text-neutral-300 font-mono leading-relaxed min-h-[80px]">
                              {promptData.videoPrompt2 || (isGeneratingGlobalProduction ? "Генерация промпта..." : "Сгенерируйте стиль продакшена для получения промпта")}
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
          
        );
      })()}


      {/* Voiceover Stats */}
      {(annotatedScenes && Object.keys(annotatedScenes).length > 0) && (
        
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <CheckCircle2 className="text-emerald-500" size={24} />
            <h3 className="text-xl font-bold text-white">Озвучка и Тайминг синхронизированы</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800">
              <div className="text-[10px] font-black text-neutral-500 uppercase mb-1">Тон голоса</div>
              <div className="text-white font-bold">{toneOfVoice || "Стандартный"}</div>
            </div>
            <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800">
              <div className="text-[10px] font-black text-neutral-500 uppercase mb-1">Сцен аннотировано</div>
              <div className="text-white font-bold">{Object.keys(annotatedScenes).length}</div>
            </div>
            <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800">
              <div className="text-[10px] font-black text-neutral-500 uppercase mb-1">Статус промптинга</div>
              <div className="text-emerald-500 font-bold flex items-center gap-2">
                Готов к сборке
              </div>
            </div>
          </div>
        </div>
        
      )}

      {/* Raw Prompt Preview Modal */}
      {viewPromptIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <FileText size={16} className="text-purple-400" />
                <span>Сырой промпт перехода</span>
                <span className="text-xs font-normal text-neutral-400">(Блок {viewPromptIndex + 1} → Блок {viewPromptIndex + 2})</span>
              </h4>
              <button
                onClick={() => setViewPromptIndex(null)}
                className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              <p className="text-xs text-neutral-400 leading-relaxed">
                Это точный системный промпт, который отправляется в модель Gemini для генерации смыслового перехода между Блоками {viewPromptIndex + 1} и {viewPromptIndex + 2}:
              </p>
              <pre className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl text-[11px] text-neutral-300 font-mono whitespace-pre-wrap select-all max-h-[400px] overflow-y-auto leading-relaxed">
                {getTransitionPromptTemplate(
                  { 
                    title: scriptStructure?.[viewPromptIndex]?.title || `Блок ${viewPromptIndex + 1}`,
                    text: generatedBlocks?.[viewPromptIndex]?.text || scriptStructure?.[viewPromptIndex]?.text || ""
                  },
                  { 
                    title: scriptStructure?.[viewPromptIndex + 1]?.title || `Блок ${viewPromptIndex + 2}`,
                    text: generatedBlocks?.[viewPromptIndex + 1]?.text || scriptStructure?.[viewPromptIndex + 1]?.text || ""
                  },
                  promptImageStyle
                )}
              </pre>
            </div>
            <div className="p-4 border-t border-neutral-800 flex justify-end gap-2">
              <button
                onClick={() => {
                  const txt = getTransitionPromptTemplate(
                    { 
                      title: scriptStructure?.[viewPromptIndex]?.title || `Блок ${viewPromptIndex + 1}`,
                      text: generatedBlocks?.[viewPromptIndex]?.text || scriptStructure?.[viewPromptIndex]?.text || ""
                    },
                    { 
                      title: scriptStructure?.[viewPromptIndex + 1]?.title || `Блок ${viewPromptIndex + 2}`,
                      text: generatedBlocks?.[viewPromptIndex + 1]?.text || scriptStructure?.[viewPromptIndex + 1]?.text || ""
                    },
                    promptImageStyle
                  );
                  navigator.clipboard.writeText(txt);
                  toast.success("Промпт скопирован в буфер обмена!");
                }}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Copy size={12} />
                <span>Копировать промпт</span>
              </button>
              <button
                onClick={() => setViewPromptIndex(null)}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-400 text-black font-extrabold text-xs rounded-xl transition-all cursor-pointer"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  } catch (error) {
    logger.error("PromptingTab crash:", error);
    return (
      <div className="p-8 bg-red-900 border border-red-500 rounded-3xl text-white">
        <h3 className="text-xl font-bold mb-4">Ошибка рендеринга вкладки Промптинг</h3>
        <pre className="text-xs text-red-200">{String(error)}</pre>
        <button 
          className="mt-4 px-4 py-2 bg-red-500 rounded-lg hover:bg-red-400"
          onClick={handleClearPromptingData}
        >
          Очистить все данные вкладки (Попытка восстановления)
        </button>
      </div>
    );
  }
};
