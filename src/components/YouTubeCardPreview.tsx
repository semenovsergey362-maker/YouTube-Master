
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Sparkles, Check, Copy, Wand2, RefreshCw, Type, Palette, AlignLeft, AlignCenter, AlignRight, Split, Image as ImageIcon, Heart, Trash2, Edit2, BookmarkPlus, LayoutTemplate, Moon, Smile, ChevronDown, X, Save, Users } from 'lucide-react';
import { toast } from 'sonner';
import { fontStyleMap, CustomTemplateItem, TREND_DATA } from '../data/constants';
import { analyzeThumbnailEmotions } from '../services/ai/visualPromptService';
import { type ThumbnailEmotionAnalysis } from '../types';
import { optimizeTitle } from '../services/ai/seoService';
import { copyToClipboard as copyTextToClipboard } from '../utils/helpers';
import { logger } from '../config/logger';
export const YouTubeCardPreview = ({
  id,
  title,
  channelName,
  thumbnail,
  views = "123K",
  timeAgo = "2 дня назад",
  borderColor = "#262626", // Default neutral-800
  channelColor = "#a3a3a3", // Default neutral-400
  thumbnailOverlay,
  onTitleChange,
  onOptimizeTitle,
  onApplyLayoutTemplate,
  activeLayoutTemplate,
  bgDim: externalBgDim,
  onBgDimChange,
  fontStyle: externalFontStyle,
  onFontStyleChange,
  onBorderColorChange,
  onChannelColorChange,
  onSaveCustomTemplate,
  customTemplates: externalCustomTemplates,
  onDeleteCustomTemplate,
  onApplyCustomTemplate,
}: {
  id?: string;
  title: string;
  channelName: string;
  thumbnail: string;
  views?: string;
  timeAgo?: string;
  borderColor?: string;
  channelColor?: string;
  thumbnailOverlay?: React.ReactNode;
  onTitleChange?: (newTitle: string) => void;
  onOptimizeTitle?: (currentTitle: string) => Promise<string>;
  onApplyLayoutTemplate?: (templateId: string) => void;
  activeLayoutTemplate?: string;
  bgDim?: number;
  onBgDimChange?: (val: number) => void;
  fontStyle?: string;
  onFontStyleChange?: (styleId: string) => void;
  onBorderColorChange?: (color: string) => void;
  onChannelColorChange?: (color: string) => void;
  onSaveCustomTemplate?: (template: CustomTemplateItem) => void;
  customTemplates?: CustomTemplateItem[];
  onDeleteCustomTemplate?: (id: string) => void;
  onApplyCustomTemplate?: (template: CustomTemplateItem) => void;
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedStyle, setCopiedStyle] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingLocal, setIsEditingLocal] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [localTitle, setLocalTitle] = useState(title);

  const [gridMode, setGridMode] = useState<'none' | 'thirds' | 'golden' | 'diagonals' | 'safe_zone'>('none');
  const [showGridMenu, setShowGridMenu] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);

  // Font Style state
  const [fontStyle, setFontStyle] = useState<string>(externalFontStyle || 'default');
  const [showFontMenu, setShowFontMenu] = useState(false);

  // Background Dimming state
  const [bgDim, setBgDim] = useState<number>(externalBgDim ?? 20);
  const [showDimMenu, setShowDimMenu] = useState(false);

  // Save Template state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveNameInput, setSaveNameInput] = useState('');

  // AI Emotion Analysis state
  const [isAnalyzingEmotions, setIsAnalyzingEmotions] = useState(false);
  const [emotionAnalysis, setEmotionAnalysis] = useState<ThumbnailEmotionAnalysis | null>(null);
  const [showEmotionModal, setShowEmotionModal] = useState(false);

  // Title Overlay state
  const [showTitleOverlay, setShowTitleOverlay] = useState(false);
  const [overlayText, setOverlayText] = useState(title || "");
  const [overlayFontSize, setOverlayFontSize] = useState<number>(20);
  const [overlayAlign, setOverlayAlign] = useState<'left' | 'center' | 'right'>('center');
  const [overlayVPos, setOverlayVPos] = useState<number>(76); // percentage from top (10% to 90%)
  const [overlayStyle, setOverlayStyle] = useState<'dark_plate' | 'accent_plate' | 'glow_stroke' | 'gradient_banner' | 'clean'>('dark_plate');
  const [overlayTextColor, setOverlayTextColor] = useState<string>('#ffffff');
  const [showOverlayMenu, setShowOverlayMenu] = useState(false);

  // LocalStorage style clipboard indicator
  const [hasSavedStyle, setHasSavedStyle] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem('yt_card_style_clipboard');
    } catch {
      return false;
    }
  });

  const [customTemplates, setCustomTemplates] = useState<CustomTemplateItem[]>(() => {
    if (externalCustomTemplates && externalCustomTemplates.length > 0) return externalCustomTemplates;
    try {
      const saved = localStorage.getItem('yt_card_custom_templates');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    setLocalTitle(title);
    if (!overlayText || overlayText === title) {
      setOverlayText(title);
    }
  }, [title]);

  useEffect(() => {
    if (externalBgDim !== undefined) {
      setBgDim(externalBgDim);
    }
  }, [externalBgDim]);

  useEffect(() => {
    if (externalFontStyle) {
      setFontStyle(externalFontStyle);
    }
  }, [externalFontStyle]);

  useEffect(() => {
    if (externalCustomTemplates) {
      setCustomTemplates(externalCustomTemplates);
    }
  }, [externalCustomTemplates]);

  const handleDimChange = (val: number) => {
    setBgDim(val);
    onBgDimChange?.(val);
  };

  const handleFontStyleChange = (styleId: string) => {
    setFontStyle(styleId);
    onFontStyleChange?.(styleId);
  };

  const handleRunEmotionAnalysis = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isAnalyzingEmotions) return;
    setIsAnalyzingEmotions(true);
    try {
      const result = await analyzeThumbnailEmotions(
        thumbnail,
        localTitle || title,
        "YouTube"
      );
      setEmotionAnalysis(result);
      setShowEmotionModal(true);
      toast.success("Анализ эмоционального воздействия превью готов!");
    } catch (err) {
      logger.error("Emotion analysis failed:", err);
      toast.error("Не удалось завершить анализ эмоций");
    } finally {
      setIsAnalyzingEmotions(false);
    }
  };

  const handleOptimize = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isOptimizing) return;
    setIsOptimizing(true);
    try {
      const current = localTitle || title || "Заголовок видео";
      let result = "";
      if (onOptimizeTitle) {
        result = await onOptimizeTitle(current);
      } else {
        result = await optimizeTitle(current);
      }
      if (result) {
        setLocalTitle(result);
        onTitleChange?.(result);
        toast.success("Заголовок успешно оптимизирован AI!");
      }
    } catch (err) {
      logger.error("Optimize title error:", err);
      toast.error("Не удалось оптимизировать заголовок");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleSaveTemplate = () => {
    const name = saveNameInput.trim() || `Шаблон ${customTemplates.length + 1}`;
    const newTmpl: CustomTemplateItem = {
      id: `tmpl_${Date.now()}`,
      name,
      date: new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      layoutId: activeLayoutTemplate || 'center',
      bgDim,
      gridMode,
      fontStyle,
    };

    const updated = [newTmpl, ...customTemplates];
    setCustomTemplates(updated);
    try {
      localStorage.setItem('yt_card_custom_templates', JSON.stringify(updated));
    } catch (err) {
      logger.error('Failed to save template to localStorage', err);
    }

    onSaveCustomTemplate?.(newTmpl);
    toast.success(`Шаблон "${name}" сохранен!`);
    setShowSaveModal(false);
    setSaveNameInput('');
  };

  const handleDeleteTemplate = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = customTemplates.filter(t => t.id !== id);
    setCustomTemplates(updated);
    try {
      localStorage.setItem('yt_card_custom_templates', JSON.stringify(updated));
    } catch (err) {
      logger.error(err);
    }
    onDeleteCustomTemplate?.(id);
    toast.success('Шаблон удален');
  };

  const handleApplyTemplate = (tmpl: CustomTemplateItem) => {
    if (tmpl.layoutId && onApplyLayoutTemplate) {
      onApplyLayoutTemplate(tmpl.layoutId);
    }
    if (tmpl.bgDim !== undefined) {
      handleDimChange(tmpl.bgDim);
    }
    if (tmpl.gridMode) {
      setGridMode(tmpl.gridMode as any);
    }
    if (tmpl.fontStyle) {
      handleFontStyleChange(tmpl.fontStyle);
    }
    onApplyCustomTemplate?.(tmpl);
    toast.success(`Применен шаблон "${tmpl.name}"`);
    setShowLayoutMenu(false);
  };

  const handleCopyPrompt = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    const plainTextTitle = title || "Ваш заголовок видео появится здесь";
    const promptText = `Premium YouTube thumbnail for video about "${plainTextTitle}". Include large, bold, perfectly spelled Russian Cyrillic text "${plainTextTitle.replace(/"/g, '')}" as a central graphical element. Style: high-contrast YouTube saturated colors, dynamic background, professional graphic design, extremely sharp focus on text, zero spelling errors. IMPORTANT: The text is in Russian (Cyrillic alphabet). You MUST write the text exactly as "${plainTextTitle.replace(/"/g, '')}" using Russian Cyrillic letters. DO NOT translate the text into English, DO NOT use Latin/English letters under any circumstances. Keep the letters strictly Cyrillic.`;

    const fullExport = `--- ЭКСПОРТ ПРЕВЬЮ YOUTUBE ---
Заголовок: ${plainTextTitle}
Цвет рамки: ${borderColor}
Цвет названия канала: ${channelColor}
Название канала: ${channelName || "Ваш Канал"}

ПРОМПТ ДЛЯ ГЕНЕРАЦИИ ИЗОБРАЖЕНИЯ (Midjourney / DALL-E / Gemini):
${promptText}

${thumbnail ? `Ссылка на изображение: ${thumbnail}` : ""}`;

    try {
      await copyTextToClipboard(fullExport);
      setCopied(true);
      toast.success("Промпт и параметры скопированы в буфер обмена!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Не удалось скопировать");
    }
  };

  const handleCopyStyle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const styleData = {
      fontStyle: fontStyle || 'default',
      bgDim: bgDim ?? 20,
      borderColor: borderColor || '#3f3f46',
      channelColor: channelColor || '#a1a1aa',
      activeLayoutTemplate: activeLayoutTemplate || 'left',
      savedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem('yt_card_style_clipboard', JSON.stringify(styleData));
      setCopiedStyle(true);
      setHasSavedStyle(true);
      toast.success("Стили превью скопированы в память!");
      setTimeout(() => setCopiedStyle(false), 2000);
    } catch (err) {
      logger.error(err);
      toast.error("Не удалось сохранить стили в LocalStorage");
    }
  };

  const handlePasteStyle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    try {
      const raw = localStorage.getItem('yt_card_style_clipboard');
      if (!raw) {
        toast.error("В буфере нет сохраненных стилей превью");
        return;
      }
      const parsed = JSON.parse(raw);
      if (parsed.bgDim !== undefined) {
        handleDimChange(parsed.bgDim);
      }
      if (parsed.fontStyle) {
        handleFontStyleChange(parsed.fontStyle);
      }
      if (parsed.borderColor && onBorderColorChange) {
        onBorderColorChange(parsed.borderColor);
      }
      if (parsed.channelColor && onChannelColorChange) {
        onChannelColorChange(parsed.channelColor);
      }
      if (parsed.activeLayoutTemplate && onApplyLayoutTemplate) {
        onApplyLayoutTemplate(parsed.activeLayoutTemplate);
      }
      toast.success("Стили превью успешно применены!");
    } catch (err) {
      logger.error(err);
      toast.error("Ошибка при чтении стилей из LocalStorage");
    }
  };

  const layoutTemplatesList = [
    { id: 'left', name: 'Слева', icon: '⬅️', desc: 'Текст слева в столбик' },
    { id: 'center', name: 'По центру', icon: '🎯', desc: 'По центру по вертикали' },
    { id: 'right', name: 'Справа', icon: '➡️', desc: 'Текст справа в столбик' },
    { id: 'top', name: 'Сверху', icon: '⬆️', desc: 'Верхний баннер с заголовком' },
    { id: 'bottom', name: 'Снизу', icon: '⬇️', desc: 'Нижняя плашка / подпись' },
    { id: 'diagonal', name: 'Диагональ', icon: '🔀', desc: 'Динамическая лесенка' },
    { id: 'corners', name: 'Два края', icon: '🔲', desc: 'Разнесенный акцент по углам' },
  ];

  const gridModesList = [
    { id: 'none', label: 'Скрыть сетку', icon: '⭕' },
    { id: 'thirds', label: 'Правило третей (3x3)', icon: '📏' },
    { id: 'golden', label: 'Золотое сечение (Phi)', icon: '🌟' },
    { id: 'diagonals', label: 'Диагонали (Симметрия)', icon: '✕' },
    { id: 'safe_zone', label: 'Безопасные зоны UI', icon: '🛡️' },
  ];

  const charCount = localTitle.length;
  const isOverLimit = charCount > 100;

  return (
    <div
      id={id || "youtube-card-preview"}
      className="w-full max-w-sm bg-neutral-950 rounded-xl overflow-hidden shadow-2xl group transition-all cursor-pointer select-none"
      style={{ border: `1px solid ${borderColor}` }}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* --- TOOLBAR HEADER (Placed outside thumbnail preview canvas) --- */}
      <div 
        className="bg-neutral-900 border-b border-neutral-800 px-2.5 py-2 flex items-center justify-between gap-1.5 flex-wrap z-30 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {/* AI Optimization Button */}
          <button
            onClick={handleOptimize}
            disabled={isOptimizing}
            className="px-2.5 py-1 bg-gradient-to-r from-indigo-600/30 to-purple-600/30 hover:from-indigo-600/50 hover:to-purple-600/50 text-[10px] font-bold text-indigo-200 rounded flex items-center gap-1 transition-all border border-indigo-500/40 shadow-md cursor-pointer disabled:opacity-50"
            title="Автоматически улучшить заголовок с помощью AI"
          >
            {isOptimizing ? (
              <Loader2 size={10} className="animate-spin text-indigo-400" />
            ) : (
              <Sparkles size={10} className="text-indigo-400" />
            )}
            <span>{isOptimizing ? 'Оптимизация...' : 'AI Оптимизация'}</span>
          </button>

          {/* Copy Prompt Button */}
          <button
            onClick={handleCopyPrompt}
            className="px-2 py-1 bg-black/80 hover:bg-black text-[10px] font-bold text-neutral-300 hover:text-white rounded flex items-center gap-1 transition-all border border-neutral-800 shadow-md cursor-pointer"
            title="Копировать промпт и параметры превью"
          >
            {copied ? (
              <>
                <Check size={10} className="text-emerald-400" />
                <span>Скопировано</span>
              </>
            ) : (
              <>
                <Copy size={10} className="text-neutral-400" />
                <span>Промпт</span>
              </>
            )}
          </button>

          {/* AI Emotion Analysis Button */}
          <button
            onClick={handleRunEmotionAnalysis}
            disabled={isAnalyzingEmotions}
            className={`px-2.5 py-1 text-[10px] font-bold rounded flex items-center gap-1 transition-all border shadow-md cursor-pointer disabled:opacity-50 ${
              emotionAnalysis
                ? 'bg-gradient-to-r from-emerald-600/30 to-teal-600/30 text-emerald-200 border-emerald-500/50 hover:from-emerald-600/40 hover:to-teal-600/40'
                : 'bg-gradient-to-r from-pink-600/25 via-rose-600/25 to-purple-600/25 hover:from-pink-600/40 hover:to-purple-600/40 text-pink-200 border-pink-500/40'
            }`}
            title="AI Анализ Эмоций Превью (радость, тревога, любопытство) и прогноз CTR"
          >
            {isAnalyzingEmotions ? (
              <Loader2 size={10} className="animate-spin text-pink-400" />
            ) : (
              <Smile size={10} className={emotionAnalysis ? "text-emerald-400" : "text-pink-400"} />
            )}
            <span>{isAnalyzingEmotions ? 'Анализ эмоций...' : (emotionAnalysis ? `Эмоции: ${emotionAnalysis.overallCTRScore}%` : 'AI Эмоции')}</span>
          </button>

          {/* Copy Thumbnail Styles Button */}
          <button
            onClick={handleCopyStyle}
            className={`px-2 py-1 text-[10px] font-bold rounded flex items-center gap-1 transition-all border shadow-md cursor-pointer ${
              copiedStyle
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                : 'bg-black/80 hover:bg-black text-neutral-300 hover:text-white border-neutral-800'
            }`}
            title="Копировать стили превью (шрифт, затемнение, границы) в LocalStorage"
          >
            {copiedStyle ? (
              <>
                <Check size={10} className="text-emerald-400" />
                <span>Стиль сохранен</span>
              </>
            ) : (
              <>
                <Palette size={10} className="text-pink-400" />
                <span>Копировать стиль</span>
              </>
            )}
          </button>

          {/* Paste/Apply Thumbnail Styles Button */}
          {hasSavedStyle && (
            <button
              onClick={handlePasteStyle}
              className="px-2 py-1 bg-pink-500/10 hover:bg-pink-500/25 text-[10px] font-bold text-pink-300 hover:text-pink-200 rounded flex items-center gap-1 transition-all border border-pink-500/30 shadow-md cursor-pointer"
              title="Применить сохраненные стили из буфера (LocalStorage) к этой карточке"
            >
              <Wand2 size={10} className="text-pink-400" />
              <span>Вставить стиль</span>
            </button>
          )}

          {/* Quick Edit Title Button */}
          {onTitleChange && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingLocal(!isEditingLocal);
              }}
              className={`px-2 py-1 text-[10px] font-bold rounded flex items-center gap-1 transition-all border shadow-md cursor-pointer ${
                isEditingLocal 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' 
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700'
              }`}
              title="Быстро изменить заголовок"
            >
              <Edit2 size={10} className="text-neutral-400" />
              <span>Редактировать</span>
            </button>
          )}
        </div>

        {/* View & Style Dropdowns Group */}
        <div className="flex items-center gap-1 flex-wrap ml-auto">
          {/* Layout Templates Selector Dropdown */}
          {onApplyLayoutTemplate && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLayoutMenu(!showLayoutMenu);
                  setShowGridMenu(false);
                  setShowFontMenu(false);
                  setShowDimMenu(false);
                }}
                className={`px-2 py-1 bg-black/80 hover:bg-black text-[10px] font-bold rounded flex items-center gap-1 transition-all border border-neutral-800 shadow-md cursor-pointer ${
                  activeLayoutTemplate ? 'text-amber-400 border-amber-500/50' : 'text-neutral-300'
                }`}
                title="Выбрать макет компоновки элементов"
              >
                <LayoutTemplate size={10} className="text-amber-400" />
                <span>Макет</span>
                <ChevronDown size={8} className="text-neutral-400" />
              </button>

              {showLayoutMenu && (
                <div
                  className="absolute top-full right-0 mt-1 w-52 bg-neutral-900/98 backdrop-blur-md border border-neutral-700 rounded-lg shadow-2xl p-1.5 z-50 flex flex-col gap-0.5 max-h-72 overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-[9px] font-bold text-neutral-400 uppercase px-2 py-1 border-b border-neutral-800 mb-0.5">
                    Предустановленные макеты
                  </div>
                  {layoutTemplatesList.map((tmpl, idx) => (
                    <button
                      key={`layout-tmpl-${tmpl.id}-${idx}`}
                      onClick={() => {
                        onApplyLayoutTemplate(tmpl.id);
                        setShowLayoutMenu(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded flex items-center gap-2 hover:bg-neutral-800 transition-colors text-xs ${
                        activeLayoutTemplate === tmpl.id ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-neutral-200'
                      }`}
                    >
                      <span>{tmpl.icon}</span>
                      <div className="flex flex-col min-w-0">
                        <span className="leading-none">{tmpl.name}</span>
                        <span className="text-[9px] text-neutral-400 truncate">{tmpl.desc}</span>
                      </div>
                    </button>
                  ))}

                  {/* Custom Saved Templates Section */}
                  {customTemplates.length > 0 && (
                    <>
                      <div className="text-[9px] font-bold text-amber-400 uppercase px-2 py-1 border-b border-neutral-800 mt-1 mb-0.5 flex items-center justify-between">
                        <span>⭐ Мои шаблоны</span>
                        <span className="text-[8px] text-neutral-500">{customTemplates.length}</span>
                      </div>
                      {customTemplates.map((tmpl, idx) => (
                        <div
                          key={`cust-tmpl-${tmpl.id ?? 't'}-${idx}`}
                          onClick={() => handleApplyTemplate(tmpl)}
                          className="w-full text-left px-2 py-1.5 rounded flex items-center justify-between hover:bg-neutral-800 transition-colors text-xs cursor-pointer group/tmpl"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <BookmarkPlus size={12} className="text-amber-400 flex-shrink-0" />
                            <div className="flex flex-col min-w-0">
                              <span className="leading-none text-neutral-200 group-hover/tmpl:text-amber-300 font-medium truncate">{tmpl.name}</span>
                              <span className="text-[8px] text-neutral-400">{tmpl.date || 'Сохранен'} {tmpl.bgDim !== undefined ? `• 🌙${tmpl.bgDim}%` : ''}</span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => handleDeleteTemplate(e, tmpl.id)}
                            className="p-1 hover:text-red-400 text-neutral-500 rounded transition-colors"
                            title="Удалить шаблон"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      ))}
                    </>
                  )}

                  <div className="border-t border-neutral-800 pt-1 mt-1">
                    <button
                      onClick={() => {
                        setShowLayoutMenu(false);
                        setShowSaveModal(true);
                      }}
                      className="w-full text-center px-2 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                    >
                      <BookmarkPlus size={11} />
                      Сохранить как шаблон
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Grid Mode Selector Dropdown */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowGridMenu(!showGridMenu);
                setShowLayoutMenu(false);
                setShowFontMenu(false);
                setShowDimMenu(false);
              }}
              className={`px-2 py-1 bg-black/80 hover:bg-black text-[10px] font-bold rounded flex items-center gap-1 transition-all border border-neutral-800 shadow-md cursor-pointer ${
                gridMode !== 'none' ? 'text-cyan-400 border-cyan-500/50' : 'text-neutral-300'
              }`}
              title="Переключение типов направляющих сетки"
            >
              <Split size={10} className={gridMode !== 'none' ? 'text-cyan-400' : 'text-neutral-400'} />
              <span>Сетка</span>
              <ChevronDown size={8} className="text-neutral-400" />
            </button>

            {showGridMenu && (
              <div
                className="absolute top-full right-0 mt-1 w-48 bg-neutral-900/98 backdrop-blur-md border border-neutral-700 rounded-lg shadow-2xl p-1.5 z-50 flex flex-col gap-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-[9px] font-bold text-neutral-400 uppercase px-2 py-1 border-b border-neutral-800 mb-0.5">
                  Направляющие сетки
                </div>
                {gridModesList.map((mode, idx) => (
                  <button
                    key={`grid-mode-${mode.id}-${idx}`}
                    onClick={() => {
                      setGridMode(mode.id as any);
                      setShowGridMenu(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded flex items-center gap-2 hover:bg-neutral-800 transition-colors text-xs ${
                      gridMode === mode.id ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-neutral-200'
                    }`}
                  >
                    <span>{mode.icon}</span>
                    <span>{mode.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Font Style Selector Dropdown */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowFontMenu(!showFontMenu);
                setShowLayoutMenu(false);
                setShowGridMenu(false);
                setShowDimMenu(false);
              }}
              className={`px-2 py-1 bg-black/80 hover:bg-black text-[10px] font-bold rounded flex items-center gap-1 transition-all border border-neutral-800 shadow-md cursor-pointer ${
                fontStyle !== 'default' ? 'text-purple-400 border-purple-500/50' : 'text-neutral-300'
              }`}
              title="Выбрать стиль шрифта для заголовка"
            >
              <Type size={10} className={fontStyle !== 'default' ? 'text-purple-400' : 'text-neutral-400'} />
              <span>Шрифт</span>
              <ChevronDown size={8} className="text-neutral-400" />
            </button>

            {showFontMenu && (
              <div
                className="absolute top-full right-0 mt-1 w-52 bg-neutral-900/98 backdrop-blur-md border border-neutral-700 rounded-lg shadow-2xl p-1.5 z-50 flex flex-col gap-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-[9px] font-bold text-neutral-400 uppercase px-2 py-1 border-b border-neutral-800 mb-0.5">
                  Стили шрифтов заголовка
                </div>
                {Object.values(fontStyleMap).map((fStyle, idx) => (
                  <button
                    key={`font-style-${fStyle.id}-${idx}`}
                    onClick={() => {
                      handleFontStyleChange(fStyle.id);
                      setShowFontMenu(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded flex items-center gap-2 hover:bg-neutral-800 transition-colors text-xs ${
                      fontStyle === fStyle.id ? 'bg-purple-500/20 text-purple-300 font-bold' : 'text-neutral-200'
                    }`}
                  >
                    <span>{fStyle.icon}</span>
                    <div className="flex flex-col min-w-0">
                      <span className="leading-none">{fStyle.name}</span>
                      <span className="text-[9px] text-neutral-400 truncate">{fStyle.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Background Dimming Selector Dropdown */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDimMenu(!showDimMenu);
                setShowLayoutMenu(false);
                setShowGridMenu(false);
                setShowFontMenu(false);
              }}
              className={`px-2 py-1 bg-black/80 hover:bg-black text-[10px] font-bold rounded flex items-center gap-1 transition-all border border-neutral-800 shadow-md cursor-pointer ${
                bgDim > 0 ? 'text-indigo-400 border-indigo-500/50' : 'text-neutral-300'
              }`}
              title="Затемнение подложки для повышения контраста текста"
            >
              <Moon size={10} className={bgDim > 0 ? 'text-indigo-400' : 'text-neutral-400'} />
              <span>Тень</span>
              <ChevronDown size={8} className="text-neutral-400" />
            </button>

            {showDimMenu && (
              <div
                className="absolute top-full right-0 mt-1 w-52 bg-neutral-900/98 backdrop-blur-md border border-neutral-700 rounded-lg shadow-2xl p-2 z-50 flex flex-col gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-neutral-800 pb-1">
                  <span className="text-[9px] font-bold text-neutral-300 uppercase flex items-center gap-1">
                    <Moon size={10} className="text-indigo-400" />
                    Затемнение фона ({bgDim}%)
                  </span>
                  <button
                    onClick={() => handleDimChange(bgDim > 0 ? 0 : 30)}
                    className="text-[9px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer font-medium"
                  >
                    {bgDim > 0 ? 'Выключить' : 'Включить'}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="90"
                    step="5"
                    value={bgDim}
                    onChange={(e) => handleDimChange(Number(e.target.value))}
                    className="w-full accent-indigo-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-4 gap-1">
                  {[0, 25, 50, 75].map((val, vIdx) => (
                    <button
                      key={`dim-val-${val}-${vIdx}`}
                      onClick={() => handleDimChange(val)}
                      className={`py-1 text-[9px] font-bold rounded border transition-colors ${
                        bgDim === val
                          ? 'bg-indigo-600 text-white border-indigo-400'
                          : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
                      }`}
                    >
                      {val === 0 ? '0%' : `${val}%`}
                    </button>
                  ))}
                </div>
                <p className="text-[8px] text-neutral-400 leading-tight">
                  Накладывает затемнение на фон, чтобы текст и плашки контрастно выделялись.
                </p>
              </div>
            )}
          </div>

          {/* Title Overlay Controls Dropdown */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowOverlayMenu(!showOverlayMenu);
                setShowLayoutMenu(false);
                setShowGridMenu(false);
                setShowFontMenu(false);
                setShowDimMenu(false);
              }}
              className={`px-2 py-1 bg-black/80 hover:bg-black text-[10px] font-bold rounded flex items-center gap-1 transition-all border border-neutral-800 shadow-md cursor-pointer ${
                showTitleOverlay ? 'text-amber-400 border-amber-500/50' : 'text-neutral-300'
              }`}
              title="Живой предпросмотр наложения текста (Title Overlay) с настройкой размера и выравнивания"
            >
              <Type size={10} className={showTitleOverlay ? 'text-amber-400' : 'text-neutral-400'} />
              <span>Оверлей</span>
              <ChevronDown size={8} className="text-neutral-400" />
            </button>

            {showOverlayMenu && (
              <div
                className="absolute top-full right-0 mt-1 w-64 bg-neutral-900/98 backdrop-blur-md border border-neutral-700 rounded-xl shadow-2xl p-2.5 z-50 flex flex-col gap-2.5"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header & Toggle */}
                <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5">
                  <span className="text-[10px] font-bold text-amber-300 uppercase flex items-center gap-1">
                    <Type size={12} className="text-amber-400" />
                    Наложение текста (Title Overlay)
                  </span>
                  <button
                    onClick={() => setShowTitleOverlay(!showTitleOverlay)}
                    className={`px-2 py-0.5 rounded text-[9px] font-bold transition-colors cursor-pointer ${
                      showTitleOverlay 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                        : 'bg-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {showTitleOverlay ? 'ВКЛ' : 'ВЫКЛ'}
                  </button>
                </div>

                {/* Text Content Input */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[9px] text-neutral-400">
                    <span>Текст на превью:</span>
                    <button
                      onClick={() => setOverlayText(localTitle || title)}
                      className="text-amber-400 hover:text-amber-300 underline cursor-pointer text-[8px]"
                    >
                      Вставить заголовок
                    </button>
                  </div>
                  <input
                    type="text"
                    value={overlayText}
                    onChange={(e) => {
                      setOverlayText(e.target.value);
                      if (!showTitleOverlay) setShowTitleOverlay(true);
                    }}
                    placeholder="Введите текст для превью..."
                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Alignment Selection */}
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-neutral-400 font-medium">Выравнивание текста:</span>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      onClick={() => {
                        setOverlayAlign('left');
                        if (!showTitleOverlay) setShowTitleOverlay(true);
                      }}
                      className={`py-1 px-1.5 text-[9px] font-bold rounded flex items-center justify-center gap-1 border transition-colors cursor-pointer ${
                        overlayAlign === 'left'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:bg-neutral-700'
                      }`}
                    >
                      <AlignLeft size={11} />
                      <span>Слева</span>
                    </button>
                    <button
                      onClick={() => {
                        setOverlayAlign('center');
                        if (!showTitleOverlay) setShowTitleOverlay(true);
                      }}
                      className={`py-1 px-1.5 text-[9px] font-bold rounded flex items-center justify-center gap-1 border transition-colors cursor-pointer ${
                        overlayAlign === 'center'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:bg-neutral-700'
                      }`}
                    >
                      <AlignCenter size={11} />
                      <span>Центр</span>
                    </button>
                    <button
                      onClick={() => {
                        setOverlayAlign('right');
                        if (!showTitleOverlay) setShowTitleOverlay(true);
                      }}
                      className={`py-1 px-1.5 text-[9px] font-bold rounded flex items-center justify-center gap-1 border transition-colors cursor-pointer ${
                        overlayAlign === 'right'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:bg-neutral-700'
                      }`}
                    >
                      <AlignRight size={11} />
                      <span>Справа</span>
                    </button>
                  </div>
                </div>

                {/* Font Size Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="text-neutral-400 font-medium">Размер текста:</span>
                    <span className="text-amber-400 font-mono font-bold">{overlayFontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="12"
                    max="38"
                    step="1"
                    value={overlayFontSize}
                    onChange={(e) => {
                      setOverlayFontSize(Number(e.target.value));
                      if (!showTitleOverlay) setShowTitleOverlay(true);
                    }}
                    className="w-full accent-amber-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[8px] text-neutral-500 font-mono">
                    <span>12px</span>
                    <span>20px (Стандарт)</span>
                    <span>38px</span>
                  </div>
                </div>

                {/* Vertical Position Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="text-neutral-400 font-medium">Положение по высоте (Y):</span>
                    <span className="text-amber-400 font-mono font-bold">{overlayVPos}%</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="88"
                    step="1"
                    value={overlayVPos}
                    onChange={(e) => {
                      setOverlayVPos(Number(e.target.value));
                      if (!showTitleOverlay) setShowTitleOverlay(true);
                    }}
                    className="w-full accent-amber-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                  />
                  <div className="grid grid-cols-3 gap-1 mt-0.5">
                    {[
                      { label: 'Сверху', val: 20 },
                      { label: 'Центр', val: 50 },
                      { label: 'Снизу', val: 76 }
                    ].map((preset, pIdx) => (
                      <button
                        key={`overlay-preset-${preset.label}-${pIdx}`}
                        onClick={() => {
                          setOverlayVPos(preset.val);
                          if (!showTitleOverlay) setShowTitleOverlay(true);
                        }}
                        className={`py-0.5 text-[8px] font-bold rounded border transition-colors ${
                          overlayVPos === preset.val
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Style Presets */}
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-neutral-400 font-medium">Стиль подложки:</span>
                  <div className="grid grid-cols-2 gap-1 text-[8px]">
                    {[
                      { id: 'dark_plate', label: '⬛ Тёмная плашка' },
                      { id: 'accent_plate', label: '🟨 Жёлтый акцент' },
                      { id: 'glow_stroke', label: '✨ Неоновое свечение' },
                      { id: 'gradient_banner', label: '🏁 Градиент-полоса' },
                      { id: 'clean', label: '🏷️ Чистый текст' }
                    ].map((st, stIdx) => (
                      <button
                        key={`overlay-st-${st.id}-${stIdx}`}
                        onClick={() => {
                          setOverlayStyle(st.id as any);
                          if (!showTitleOverlay) setShowTitleOverlay(true);
                        }}
                        className={`p-1 rounded text-left font-medium border transition-colors truncate ${
                          overlayStyle === st.id
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                            : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Text Color Picker */}
                {overlayStyle !== 'accent_plate' && (
                  <div className="flex items-center justify-between pt-1 border-t border-neutral-800">
                    <span className="text-[9px] text-neutral-400">Цвет текста:</span>
                    <div className="flex items-center gap-1.5">
                      {[
                        { color: '#ffffff', title: 'Белый' },
                        { color: '#facc15', title: 'Желтый' },
                        { color: '#ef4444', title: 'Красный' },
                        { color: '#22d3ee', title: 'Голубой' },
                        { color: '#a855f7', title: 'Фиолетовый' },
                      ].map((c, cIdx) => (
                        <button
                          key={`overlay-tc-${c.color}-${cIdx}`}
                          onClick={() => {
                            setOverlayTextColor(c.color);
                            if (!showTitleOverlay) setShowTitleOverlay(true);
                          }}
                          className={`w-4 h-4 rounded-full border transition-transform ${
                            overlayTextColor === c.color ? 'scale-125 border-white shadow-sm' : 'border-neutral-700 hover:scale-110'
                          }`}
                          style={{ backgroundColor: c.color }}
                          title={c.title}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

        {/* --- THUMBNAIL CANVAS (100% CLEAN & UNCLUTTERED PREVIEW) --- */}
        <div className="relative aspect-video bg-neutral-900 overflow-hidden" id="youtube-preview-image-container">
          {/* --- SAVE AS TEMPLATE MODAL / POPUP OVERLAY --- */}
          {showSaveModal && (
            <div
              className="absolute inset-0 z-50 bg-black/85 backdrop-blur-sm p-4 flex flex-col justify-center items-center gap-3 animate-in fade-in duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full max-w-[280px] bg-neutral-900 border border-neutral-700 rounded-xl p-3 shadow-2xl flex flex-col gap-2.5">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <BookmarkPlus size={14} className="text-amber-400" />
                    Сохранить как шаблон
                  </span>
                  <button
                    onClick={() => setShowSaveModal(false)}
                    className="p-1 text-neutral-400 hover:text-white rounded"
                  >
                    <X size={12} />
                  </button>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-neutral-400 font-medium">Название шаблона:</label>
                  <input
                    type="text"
                    autoFocus
                    value={saveNameInput}
                    onChange={(e) => setSaveNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTemplate();
                    }}
                    placeholder={`Мой шаблон ${customTemplates.length + 1}`}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="bg-neutral-950/80 p-2 rounded border border-neutral-800/80 text-[9px] text-neutral-400 flex flex-col gap-1">
                  <div className="font-bold text-neutral-300 mb-0.5">Сохраняемые параметры:</div>
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span>Макет компоновки:</span>
                    <span className="text-amber-300 font-mono">{activeLayoutTemplate || 'По центру'}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span>Затемнение фона:</span>
                    <span className="text-indigo-300 font-mono">{bgDim}%</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span>Режим сетки:</span>
                    <span className="text-cyan-300 font-mono">{gridMode}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span>Стиль шрифта:</span>
                    <span className="text-purple-300 font-mono">{fontStyleMap[fontStyle]?.name || 'Стандартный'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => setShowSaveModal(false)}
                    className="flex-1 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-xs font-medium transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleSaveTemplate}
                    className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded text-xs transition-colors flex items-center justify-center gap-1 shadow"
                  >
                    <Save size={12} />
                    Сохранить
                  </button>
                </div>
              </div>
            </div>
          )}

        {/* --- GRID OVERLAY MODES --- */}
        {gridMode === 'thirds' && (
          <div className="absolute inset-0 pointer-events-none z-10 opacity-80 mix-blend-difference">
            <div className="absolute w-full h-px bg-white/80 top-1/3" />
            <div className="absolute w-full h-px bg-white/80 top-2/3" />
            <div className="absolute h-full w-px bg-white/80 left-1/3" />
            <div className="absolute h-full w-px bg-white/80 left-2/3" />
            <div className="absolute w-full h-px bg-red-400/60 top-1/2 border-t border-dashed border-red-400" />
            <div className="absolute h-full w-px bg-red-400/60 left-1/2 border-l border-dashed border-red-400" />
            {[[1/3, 1/3], [2/3, 1/3], [1/3, 2/3], [2/3, 2/3]].map(([xRatio, yRatio], idx) => (
              <div
                key={`grid-thirds-point-${idx}`}
                className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 border-amber-400 bg-amber-400/30 flex items-center justify-center animate-pulse"
                style={{ left: `${xRatio * 100}%`, top: `${yRatio * 100}%` }}
              >
                <div className="w-1 h-1 bg-amber-400 rounded-full" />
              </div>
            ))}
            <div className="absolute bottom-1 left-2 bg-black/80 px-1.5 py-0.5 rounded text-[8px] font-mono text-amber-300 pointer-events-none border border-amber-500/30">
              Правило третей (3x3)
            </div>
          </div>
        )}

        {gridMode === 'golden' && (
          <div className="absolute inset-0 pointer-events-none z-10 opacity-80">
            <div className="absolute w-full h-px bg-amber-400/70 top-[38.2%]" />
            <div className="absolute w-full h-px bg-amber-400/70 top-[61.8%]" />
            <div className="absolute h-full w-px bg-amber-400/70 left-[38.2%]" />
            <div className="absolute h-full w-px bg-amber-400/70 left-[61.8%]" />
            
            {[[38.2, 38.2], [61.8, 38.2], [38.2, 61.8], [61.8, 61.8]].map(([x, y], idx) => (
              <div
                key={`grid-golden-point-${idx}`}
                className="absolute -translate-x-1/2 -translate-y-1/2 bg-amber-500 text-black font-extrabold text-[8px] w-4 h-4 rounded-full flex items-center justify-center shadow-md border border-white"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                Φ
              </div>
            ))}

            <svg className="absolute inset-0 w-full h-full text-amber-400/40" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M 0 100 A 61.8 61.8 0 0 1 61.8 38.2 A 38.2 38.2 0 0 1 100 76.4" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 1" />
            </svg>

            <div className="absolute bottom-1 left-2 bg-black/80 px-1.5 py-0.5 rounded text-[8px] font-mono text-amber-300 pointer-events-none border border-amber-500/30">
              Золотое сечение (Phi 1:1.618)
            </div>
          </div>
        )}

        {gridMode === 'diagonals' && (
          <div className="absolute inset-0 pointer-events-none z-10 opacity-80">
            <svg className="absolute inset-0 w-full h-full text-cyan-400" viewBox="0 0 100 100" preserveAspectRatio="none">
              <line x1="0" y1="0" x2="100" y2="100" stroke="currentColor" strokeWidth="0.6" />
              <line x1="100" y1="0" x2="0" y2="100" stroke="currentColor" strokeWidth="0.6" />
              <line x1="0" y1="100" x2="50" y2="0" stroke="currentColor" strokeWidth="0.4" strokeDasharray="1 1" />
              <line x1="100" y1="100" x2="50" y2="0" stroke="currentColor" strokeWidth="0.4" strokeDasharray="1 1" />
              <line x1="0" y1="0" x2="50" y2="100" stroke="currentColor" strokeWidth="0.4" strokeDasharray="1 1" />
              <line x1="100" y1="0" x2="50" y2="100" stroke="currentColor" strokeWidth="0.4" strokeDasharray="1 1" />
              <line x1="50" y1="0" x2="50" y2="100" stroke="currentColor" strokeWidth="0.3" opacity="0.5" />
              <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="0.3" opacity="0.5" />
            </svg>

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 border border-cyan-400/80 rotate-45 flex items-center justify-center pointer-events-none">
              <div className="w-1 h-1 bg-cyan-400 rounded-full" />
            </div>

            <div className="absolute bottom-1 left-2 bg-black/80 px-1.5 py-0.5 rounded text-[8px] font-mono text-cyan-300 pointer-events-none border border-cyan-500/30">
              Динамические диагонали
            </div>
          </div>
        )}

        {gridMode === 'safe_zone' && (
          <div className="absolute inset-0 pointer-events-none z-10 border-2 border-emerald-500/40">
            <div className="absolute inset-[5%] border border-dashed border-emerald-400/60 flex items-start justify-between p-1 text-[8px] text-emerald-400 font-mono">
              <span>5% MARGIN</span>
            </div>

            <div className="absolute bottom-1 right-1 w-[70px] h-[24px] bg-red-500/30 border border-red-500 text-red-200 text-[8px] font-mono flex items-center justify-center text-center rounded">
              Таймкод UI
            </div>

            <div className="absolute bottom-1 left-2 bg-black/80 px-1.5 py-0.5 rounded text-[8px] font-mono text-emerald-300 pointer-events-none border border-emerald-500/30">
              Безопасные зоны YouTube UI
            </div>
          </div>
        )}

        {/* Background Image */}
        <img
          src={thumbnail || "https://picsum.photos/seed/youtube/640/360"}
          alt="Thumbnail"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
          id="youtube-preview-image"
        />

        {/* --- BACKGROUND DIMMING OVERLAY --- */}
        {bgDim > 0 && (
          <div
            className="absolute inset-0 bg-black pointer-events-none z-[5] transition-opacity duration-200"
            style={{ opacity: bgDim / 100 }}
          />
        )}

        {/* --- LIVE TITLE OVERLAY PREVIEW --- */}
        {showTitleOverlay && overlayText && (
          <div
            className={`absolute inset-x-2.5 pointer-events-none z-20 transition-all flex ${
              overlayAlign === 'left' ? 'justify-start text-left' :
              overlayAlign === 'right' ? 'justify-end text-right' :
              'justify-center text-center'
            }`}
            style={{
              top: `${overlayVPos}%`,
              transform: 'translateY(-50%)',
            }}
          >
            <div
              className={`max-w-[95%] font-extrabold uppercase tracking-tight transition-all select-none ${
                overlayStyle === 'dark_plate'
                  ? 'bg-black/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/20 shadow-2xl'
                  : overlayStyle === 'accent_plate'
                  ? 'bg-amber-400 text-black px-2.5 py-1 rounded-lg border-2 border-white shadow-2xl font-black'
                  : overlayStyle === 'glow_stroke'
                  ? 'px-2 py-0.5 drop-shadow-[0_0_10px_rgba(234,179,8,0.9)]'
                  : overlayStyle === 'gradient_banner'
                  ? 'w-full bg-gradient-to-r from-black/90 via-black/75 to-black/90 py-1 px-2.5 border-y border-white/20'
                  : 'px-2 py-0.5'
              }`}
              style={{
                fontSize: `${overlayFontSize}px`,
                lineHeight: 1.15,
                color: overlayStyle === 'accent_plate' ? '#000000' : overlayTextColor,
                textShadow: overlayStyle === 'clean' || overlayStyle === 'glow_stroke'
                  ? '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 3px 6px rgba(0,0,0,0.9)'
                  : '1px 1px 2px rgba(0,0,0,0.8)',
              }}
            >
              {overlayText}
            </div>
          </div>
        )}

        {/* --- AI EMOTION ANALYSIS MODAL OVERLAY --- */}
        {showEmotionModal && emotionAnalysis && (
          <div
            className="absolute inset-0 z-50 bg-black/92 backdrop-blur-md p-3 overflow-y-auto flex flex-col justify-start animate-in fade-in duration-200 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 shadow-2xl flex flex-col gap-2.5 my-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center flex-shrink-0">
                    <Smile size={14} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-white leading-tight truncate">AI Анализ Эмоций Превью</span>
                    <span className="text-[8px] text-pink-300">Оценка психологического воздействия & CTR</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowEmotionModal(false)}
                  className="p-1 text-neutral-400 hover:text-white rounded transition-colors"
                >
                  <X size={13} />
                </button>
              </div>

              {/* CTR & Main Emotion Highlight */}
              <div className="grid grid-cols-2 gap-2">
                {/* Score */}
                <div className="bg-neutral-950/80 border border-neutral-800 rounded-lg p-2 flex flex-col items-center justify-center text-center">
                  <span className="text-[9px] font-bold text-neutral-400 uppercase">Потенциал CTR</span>
                  <div className="flex items-baseline gap-1 my-0.5">
                    <span className={`text-2xl font-black ${
                      emotionAnalysis.overallCTRScore >= 80 ? 'text-emerald-400' :
                      emotionAnalysis.overallCTRScore >= 60 ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      {emotionAnalysis.overallCTRScore}
                    </span>
                    <span className="text-xs text-neutral-500 font-bold">/100</span>
                  </div>
                  <span className="text-[8px] font-mono text-neutral-400">
                    Прогноз: {emotionAnalysis.estimatedCTRRange}
                  </span>
                </div>

                {/* Primary Emotion Trigger */}
                <div className="bg-neutral-950/80 border border-neutral-800 rounded-lg p-2 flex flex-col items-center justify-center text-center">
                  <span className="text-[9px] font-bold text-neutral-400 uppercase">Главный триггер</span>
                  <span className="text-xs font-black text-pink-300 mt-1 line-clamp-1">
                    {emotionAnalysis.primaryEmotion}
                  </span>
                  <span className="text-[8px] text-neutral-400 mt-0.5 line-clamp-1">
                    Эмоциональный фокус
                  </span>
                </div>
              </div>

              {/* Emotions Breakdown Bars */}
              <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-lg p-2 flex flex-col gap-1.5">
                <span className="text-[9px] font-bold text-neutral-300 uppercase flex items-center justify-between">
                  <span>Шкала эмоций</span>
                  <span className="text-[8px] text-neutral-500 font-normal">Воздействие на зрителя</span>
                </span>

                {[
                  { label: '😃 Радость / Позитив', val: emotionAnalysis.emotionBreakdown?.joy ?? 0, color: 'bg-emerald-500' },
                  { label: '⚡ Тревога / Срочность (FOMO)', val: emotionAnalysis.emotionBreakdown?.urgency ?? 0, color: 'bg-amber-500' },
                  { label: '🔍 Любопытство / Интрига', val: emotionAnalysis.emotionBreakdown?.curiosity ?? 0, color: 'bg-purple-500' },
                  { label: '😲 Удивление / Шок', val: emotionAnalysis.emotionBreakdown?.surprise ?? 0, color: 'bg-rose-500' },
                  { label: '🛡️ Доверие / Авторитет', val: emotionAnalysis.emotionBreakdown?.trust ?? 0, color: 'bg-cyan-500' },
                ].map((emo, idx) => (
                  <div key={`emo-bar-${idx}-${emo.label.slice(0, 5)}`} className="flex flex-col gap-0.5">
                    <div className="flex justify-between text-[8px] text-neutral-300 font-medium">
                      <span>{emo.label}</span>
                      <span className="font-mono font-bold">{emo.val}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${emo.color} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min(100, Math.max(0, emo.val))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Psychological Verdict */}
              {emotionAnalysis.emotionalImpactVerdict && (
                <div className="bg-purple-950/20 border border-purple-800/30 rounded-lg p-2 flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold text-purple-300 uppercase">Психологический вердикт:</span>
                  <p className="text-[9px] text-neutral-200 leading-snug">
                    {emotionAnalysis.emotionalImpactVerdict}
                  </p>
                </div>
              )}

              {/* Actionable Tips */}
              {emotionAnalysis.ctrActionableTips && emotionAnalysis.ctrActionableTips.length > 0 && (
                <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-lg p-2 flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-amber-300 uppercase">Советы для роста CTR:</span>
                  <ul className="flex flex-col gap-1 text-[8px] text-neutral-300">
                    {emotionAnalysis.ctrActionableTips.map((tip, idx) => (
                      <li key={`emo-tip-${idx}`} className="flex items-start gap-1">
                        <span className="text-amber-400 font-bold flex-shrink-0">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleRunEmotionAnalysis}
                  disabled={isAnalyzingEmotions}
                  className="flex-1 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={11} className={isAnalyzingEmotions ? "animate-spin" : ""} />
                  <span>{isAnalyzingEmotions ? 'Анализирую...' : 'Повторить'}</span>
                </button>
                <button
                  onClick={() => setShowEmotionModal(false)}
                  className="flex-1 py-1.5 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1 shadow cursor-pointer"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        )}

        {thumbnailOverlay}
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-[10px] font-bold text-white rounded pointer-events-none z-10">
          12:34
        </div>
      </div>
      <div className="p-3 flex gap-3">
        <div className="w-9 h-9 rounded-full bg-neutral-800 flex-shrink-0 flex items-center justify-center text-neutral-500 font-bold text-xs border border-neutral-700">
          {channelName?.charAt(0) || "Y"}
        </div>
        <div className="flex-1 min-w-0">
          {isEditingLocal ? (
            <div className="flex flex-col gap-2" onClick={e => e.stopPropagation()}>
              <div className="relative">
                <input
                  autoFocus
                  type="text"
                  value={localTitle}
                  onChange={(e) => setLocalTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onTitleChange?.(localTitle);
                      setIsEditingLocal(false);
                    }
                    if (e.key === 'Escape') {
                      setLocalTitle(title);
                      setIsEditingLocal(false);
                    }
                  }}
                  className={`w-full bg-neutral-900 border ${isOverLimit ? 'border-red-500/50' : 'border-accent/50'} rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-accent transition-colors pr-14`}
                  placeholder="Заголовок видео..."
                />
                <div className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono ${isOverLimit ? 'text-red-500 font-bold' : 'text-neutral-500'}`}>
                  {charCount}/100
                </div>
              </div>

              {isOverLimit && (
                <p className="text-[9px] text-red-500 font-medium -mt-1 ml-1">
                  Рекомендуется до 100 символов для лучшего SEO
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2">
                {onOptimizeTitle && (
                  <button
                    onClick={handleOptimize}
                    disabled={isOptimizing}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 transition-all text-[9px] font-bold disabled:opacity-50"
                  >
                    {isOptimizing ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : (
                      <Sparkles size={10} />
                    )}
                    {isOptimizing ? "Ждем..." : "Улучшить (AI)"}
                  </button>
                )}
                
                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={() => {
                      setLocalTitle(title);
                      setIsEditingLocal(false);
                    }}
                    className="text-[10px] font-bold text-neutral-500 hover:text-white transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={() => {
                      onTitleChange?.(localTitle);
                      setIsEditingLocal(false);
                    }}
                    className="text-[10px] font-bold text-accent hover:text-emerald-400 transition-colors"
                  >
                    Сохранить
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <h3 className={`text-sm line-clamp-2 transition-all ${fontStyleMap[fontStyle]?.className || fontStyleMap.default.className}`}>
              {title || "Ваш заголовок видео появится здесь"}
            </h3>
          )}
          <div className="mt-1 flex flex-col">
            <span
              className="text-[12px] transition-colors"
              style={{ color: channelColor }}
            >
              {channelName || "Ваш Канал"}
            </span>
            <div className="flex items-center gap-1 text-[12px] text-neutral-500">
              <span>{views} просмотров</span>
              <span className="w-0.5 h-0.5 rounded-full bg-neutral-600" />
              <span>{timeAgo}</span>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            key="idea-card-expanded-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="border-t border-neutral-900 bg-neutral-900/30 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 space-y-4">
              {/* Stats Section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Опубликовано</span>
                  <p className="text-xs text-neutral-300 font-medium">{timeAgo}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Категория</span>
                  <p className="text-xs text-neutral-300 font-medium">Образование</p>
                </div>
              </div>

              {/* Description Snippet */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Описание</span>
                <p className="text-xs text-neutral-400 leading-relaxed line-clamp-3">
                  В этом видео мы подробно разберем, как создавать захватывающие превью для YouTube, которые увеличивают CTR. 
                  Узнайте секреты композиции, выбора цвета и использования шрифтов для привлечения внимания аудитории.
                </p>
              </div>

              {/* Tags Section */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Теги</span>
                <div className="flex flex-wrap gap-1.5">
                  {["#дизайн", "#youtube", "#превью", "#обучение", "#туториал"].map((tag, idx) => (
                    <span key={`tag-${tag}-${idx}`} className="px-1.5 py-0.5 bg-neutral-800 rounded text-[10px] text-neutral-400 border border-neutral-700">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Engagement Mockup */}
              <div className="pt-2 flex items-center justify-between border-t border-neutral-800/50">
                <div className="flex gap-4">
                   <div className="flex items-center gap-1.5 text-neutral-400">
                      <Heart size={12} className="text-neutral-500" />
                      <span className="text-[11px] font-medium">4.8K</span>
                   </div>
                   <div className="flex items-center gap-1.5 text-neutral-400">
                      <Users size={12} className="text-neutral-500" />
                      <span className="text-[11px] font-medium">12K</span>
                   </div>
                </div>
                <span className="text-[10px] text-neutral-600 font-mono tracking-tighter">ID: YT-PX721-SEO</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-center py-1.5 bg-neutral-900/50 border-t border-neutral-900 group/indicator">
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="text-neutral-600 group-hover/indicator:text-neutral-400"
        >
          <ChevronDown size={14} />
        </motion.div>
      </div>
    </div>
  );
};
