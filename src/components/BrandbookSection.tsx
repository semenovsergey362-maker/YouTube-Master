import { logger } from "../config/logger";
import React, { useState } from 'react';
import { Palette, Sparkles, Check, Type, Eye, ShieldCheck, Plus, Trash2, Edit3, Volume2, Copy } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { generateBrandProfile, BrandProfile } from '../services/geminiService';
import { toast } from 'sonner';

const THUMBNAIL_PRESETS = [
  { name: 'Кинематографичный 3D', desc: 'Глубокий объем, 3D элементы, кино-освещение' },
  { name: 'Яркий Clickbait', desc: 'Насыщенность, эмоции крупным планом, неоновые плашки' },
  { name: 'Минимализм', desc: 'Чистый фон, фокусная типографика' },
  { name: 'Киберпанк', desc: 'Фиолетово-голубое свечение, футуристичный стиль' },
  { name: 'Тёмный Драматичный', desc: 'Тени, золотой акцентный свет' },
  { name: 'Инфографика', desc: 'Строгий понятный визуал, схемы и структура' },
];

const COLOR_PRESETS = [
  { name: 'Индиго', colors: ['#6366F1', '#F59E0B', '#10B981', '#0F172A'] },
  { name: 'Кликбейт', colors: ['#EF4444', '#F59E0B', '#06B6D4', '#090D16'] },
  { name: 'Премиум', colors: ['#D97706', '#FBBF24', '#374151', '#111827'] },
  { name: 'Киберпанк', colors: ['#8B5CF6', '#EC4899', '#3B82F6', '#0F172A'] },
];

const FONT_PRESETS_PRIMARY = ['Oswald', 'Bebas Neue', 'Montserrat', 'Playfair Display', 'Unbounded', 'Rubik', 'Inter', 'Roboto'];
const FONT_PRESETS_BODY = ['Inter', 'Roboto', 'Montserrat', 'Nunito', 'Fira Sans', 'Open Sans'];

const TONE_PRESETS = [
  'Экспертный, энергичный',
  'Дружелюбный, разговорный',
  'Провокационный, дерзкий',
  'Академический, системный',
  'Юмористический, легкий',
  'Атмосферный, загадочный',
];

const parseColor = (colorStr: string) => {
  const hexMatch = colorStr.match(/#[0-9a-fA-F]{3,8}/);
  const hex = hexMatch ? hexMatch[0] : '#cccccc';
  let label = colorStr.replace(hex, '').trim();
  label = label.replace(/^[-:()\s]+|[-:()\s]+$/g, '').trim();
  return { hex, label };
};

interface BrandbookSectionProps {
  compact?: boolean;
}

export const BrandbookSection: React.FC<BrandbookSectionProps> = ({ compact = false }) => {
  const { selectedNiche, selectedBranding, brandProfile, setBrandProfile, toneOfVoice, setToneOfVoice, selectedModel } = useApp();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const activeProfile: BrandProfile = brandProfile || {
    colors: ['#6366F1', '#F59E0B', '#10B981', '#0F172A'],
    thumbnailStyle: 'Современный кинематографичный стиль с высоким контрастом и акцентным 3D текстом',
    primaryFont: 'Oswald',
    bodyFont: 'Inter',
    toneOfVoice: toneOfVoice || 'Экспертный, вдохновляющий и энергичный',
    visualAestheticDescription: 'Лаконичный технологичный стиль с акцентными свечениями и высокой читаемостью.',
  };

  const [tempColors, setTempColors] = useState<string[]>(activeProfile.colors);
  const [tempThumbnailStyle, setTempThumbnailStyle] = useState(activeProfile.thumbnailStyle);
  const [tempPrimaryFont, setTempPrimaryFont] = useState(activeProfile.primaryFont);
  const [tempBodyFont, setTempBodyFont] = useState(activeProfile.bodyFont);
  const [tempTone, setTempTone] = useState(activeProfile.toneOfVoice);
  const [tempAesthetic, setTempAesthetic] = useState(activeProfile.visualAestheticDescription || '');

  const handleGenerateAI = async () => {
    if (!selectedNiche) {
      toast.error("Сначала выберите нишу на шаге Ниша");
      return;
    }
    setIsGenerating(true);
    try {
      const generated = await generateBrandProfile(
        selectedNiche,
        selectedBranding?.name,
        { model: selectedModel, toneOfVoice }
      );
      setBrandProfile(generated);
      setToneOfVoice(generated.toneOfVoice);
      setTempColors(generated.colors);
      setTempThumbnailStyle(generated.thumbnailStyle);
      setTempPrimaryFont(generated.primaryFont);
      setTempBodyFont(generated.bodyFont);
      setTempTone(generated.toneOfVoice);
      setTempAesthetic(generated.visualAestheticDescription || '');
      toast.success("ИИ-Брендбук успешно обновлен");
    } catch (err) {
      logger.error(err);
      toast.error("Не удалось сгенерировать брендбук");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    const updated: BrandProfile = {
      colors: tempColors,
      thumbnailStyle: tempThumbnailStyle,
      primaryFont: tempPrimaryFont,
      bodyFont: tempBodyFont,
      toneOfVoice: tempTone,
      visualAestheticDescription: tempAesthetic,
    };
    setBrandProfile(updated);
    setToneOfVoice(tempTone);
    setIsEditing(false);
    toast.success("Брендбук успешно сохранен");
  };

  const handleColorChange = (index: number, value: string) => {
    const next = [...tempColors];
    next[index] = value;
    setTempColors(next);
  };

  const addColor = () => {
    if (tempColors.length < 6) {
      setTempColors([...tempColors, '#3B82F6']);
    }
  };

  const removeColor = (index: number) => {
    if (tempColors.length > 2) {
      setTempColors(tempColors.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="p-4 bg-neutral-900/90 backdrop-blur-md border border-neutral-800/80 rounded-xl relative overflow-hidden space-y-4">
      {/* Decorative Gradient Background */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10" />
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/50 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Palette className="text-primary animate-pulse" size={16} />
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              Единый брендбук канала
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1">
                <ShieldCheck size={10} /> Активен
              </span>
            </h3>
          </div>
          <p className="text-[11px] text-neutral-400">
            Стиль бренда автоматически учитывается при генерации сценариев и промптов
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {!isEditing ? (
            <>
              <button
                onClick={() => {
                  setTempColors(activeProfile.colors);
                  setTempThumbnailStyle(activeProfile.thumbnailStyle);
                  setTempPrimaryFont(activeProfile.primaryFont);
                  setTempBodyFont(activeProfile.bodyFont);
                  setTempTone(activeProfile.toneOfVoice);
                  setTempAesthetic(activeProfile.visualAestheticDescription || '');
                  setIsEditing(true);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-300 border border-neutral-700/80 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Edit3 size={11} /> Настроить
              </button>
              <button
                onClick={handleGenerateAI}
                disabled={isGenerating}
                className="px-2.5 py-1.5 rounded-lg bg-primary text-black hover:bg-primary/90 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Sparkles size={11} className={isGenerating ? 'animate-spin' : ''} />
                {isGenerating ? 'Создание...' : 'ИИ-Генерация'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="px-2.5 py-1.5 rounded-lg bg-neutral-850 hover:bg-neutral-800 text-neutral-400 text-[11px] font-semibold transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Check size={11} /> Сохранить
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {!isEditing ? (
        /* COMPACT UNIFIED HORIZONTAL GRID */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch bg-neutral-950/40 p-3 rounded-xl border border-neutral-800/60 md:divide-x md:divide-neutral-800/40">
          
          {/* Section 1: Colors (4 cols) */}
          <div className="md:col-span-4 space-y-1.5 pr-2">
            <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider flex items-center gap-1.5">
              <Palette size={11} className="text-primary" /> Цвета бренда
            </span>
            <div className="flex flex-wrap gap-1.5">
              {activeProfile.colors.map((colorStr, i) => {
                const { hex, label } = parseColor(colorStr);
                return (
                  <div 
                    key={`brandbook-color-str-${hex}-${i}`} 
                    className="group relative flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-900/90 border border-neutral-800/80 hover:border-neutral-700 transition-colors"
                  >
                    <div
                      className="w-3 h-3 rounded-full border border-white/10 shrink-0 animate-pulse"
                      style={{ backgroundColor: hex }}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-mono font-bold text-neutral-200 uppercase tracking-tight leading-none">
                        {hex}
                      </span>
                      {label && (
                        <span className="text-[8px] font-medium text-neutral-500 uppercase tracking-wider leading-none mt-0.5 truncate max-w-[75px]" title={label}>
                          {label}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(hex);
                        toast.success(`Цвет ${hex} скопирован в буфер обмена`);
                      }}
                      className="p-1 rounded text-neutral-500 hover:text-white hover:bg-neutral-800/60 transition-colors cursor-pointer ml-0.5"
                      title="Копировать цвет"
                    >
                      <Copy size={10} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Typography (2 cols) */}
          <div className="md:col-span-2 space-y-1.5 md:pl-3 pr-2">
            <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider flex items-center gap-1.5">
              <Type size={11} className="text-blue-400" /> Шрифтовые пары
            </span>
            <div className="text-[11px] leading-snug space-y-0.5">
              <div>
                <span className="text-neutral-500 text-[10px]">Заг.:</span> <span className="font-bold text-neutral-200">{activeProfile.primaryFont}</span>
              </div>
              <div>
                <span className="text-neutral-500 text-[10px]">Текст:</span> <span className="font-medium text-neutral-300">{activeProfile.bodyFont}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Visual Style (3 cols) */}
          <div className="md:col-span-3 space-y-1.5 md:pl-3 pr-2">
            <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider flex items-center gap-1.5">
              <Eye size={11} className="text-accent" /> Стиль обложек
            </span>
            <div className="max-h-[50px] overflow-y-auto custom-scrollbar">
              <p className="text-[11px] font-bold text-neutral-200 leading-snug">
                {activeProfile.thumbnailStyle}
              </p>
              {activeProfile.visualAestheticDescription && (
                <p className="text-[9px] text-neutral-400 leading-tight italic mt-0.5">
                  {activeProfile.visualAestheticDescription}
                </p>
              )}
            </div>
          </div>

          {/* Section 4: Tone of Voice (3 cols) */}
          <div className="md:col-span-3 space-y-1.5 md:pl-3">
            <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider flex items-center gap-1.5">
              <Volume2 size={11} className="text-emerald-400" /> Tone of Voice
            </span>
            <div className="max-h-[50px] overflow-y-auto custom-scrollbar bg-emerald-500/5 border border-emerald-500/10 px-2 py-1 rounded">
              <p className="text-[11px] font-semibold text-emerald-300 leading-tight">
                {activeProfile.toneOfVoice}
              </p>
            </div>
          </div>

        </div>
      ) : (
        /* COMPACT EDIT MODE FORM */
        <div className="space-y-4 bg-neutral-950/40 p-3.5 rounded-xl border border-neutral-800/80">
          {/* Colors Editor */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Palette size={11} className="text-primary" /> Настройка цветов
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-neutral-500 uppercase font-semibold">Пресеты:</span>
                <div className="flex gap-1">
                  {COLOR_PRESETS.map((p, idx) => (
                    <button
                      key={`color-preset-${p.name}-${idx}`}
                      type="button"
                      onClick={() => setTempColors(p.colors)}
                      className="text-[9px] px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700 transition-colors cursor-pointer"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {tempColors.map((color, i) => {
                const { hex } = parseColor(color);
                return (
                  <div key={`temp-color-${hex}-${i}`} className="flex items-center gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                    <input
                      type="color"
                      value={hex}
                      onChange={(e) => handleColorChange(i, e.target.value)}
                      className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 p-0"
                    />
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => handleColorChange(i, e.target.value)}
                      className="w-24 bg-transparent text-[10px] font-mono font-bold text-white focus:outline-none uppercase"
                    />
                    {tempColors.length > 2 && (
                      <button
                        onClick={() => removeColor(i)}
                        className="p-0.5 text-neutral-500 hover:text-red-400 rounded transition-colors cursor-pointer"
                      >
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                );
              })}
              {tempColors.length < 6 && (
                <button
                  onClick={addColor}
                  className="px-2 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-dashed border-neutral-850 text-[10px] font-bold flex items-center gap-0.5 transition-colors cursor-pointer"
                >
                  <Plus size={10} /> Добавить
                </button>
              )}
            </div>
          </div>

          {/* Thumbnail Aesthetics Editor */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Eye size={11} className="text-accent" /> Стиль обложек (превью)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
              {THUMBNAIL_PRESETS.map((preset, idx) => (
                <button
                  key={`thumbnail-preset-${preset.name}-${idx}`}
                  type="button"
                  onClick={() => {
                    setTempThumbnailStyle(preset.name);
                    setTempAesthetic(preset.desc);
                  }}
                  className={`p-1.5 rounded border text-left transition-colors cursor-pointer ${
                    tempThumbnailStyle === preset.name
                      ? 'bg-accent/10 border-accent/30 text-accent'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <div className="text-[10px] font-bold truncate">{preset.name}</div>
                  <div className="text-[8px] text-neutral-500 truncate">{preset.desc}</div>
                </button>
              ))}
            </div>
            <textarea
              value={tempThumbnailStyle}
              onChange={(e) => setTempThumbnailStyle(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-850 rounded-lg p-2 text-[11px] text-white focus:outline-none focus:border-accent resize-none h-12"
              placeholder="Введите описание стиля обложек..."
            />
          </div>

          {/* Fonts & Tone Editor Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Fonts */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Type size={11} className="text-blue-400" /> Подбор шрифтов
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[8px] text-neutral-500 font-semibold block mb-0.5">Заголовки</span>
                  <select
                    value={tempPrimaryFont}
                    onChange={(e) => setTempPrimaryFont(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-850 rounded p-1 text-[10px] text-white focus:outline-none focus:border-primary cursor-pointer"
                  >
                    {FONT_PRESETS_PRIMARY.map((f, idx) => (
                      <option key={`pf-${f}-${idx}`} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="text-[8px] text-neutral-500 font-semibold block mb-0.5">Основной</span>
                  <select
                    value={tempBodyFont}
                    onChange={(e) => setTempBodyFont(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-850 rounded p-1 text-[10px] text-white focus:outline-none focus:border-primary cursor-pointer"
                  >
                    {FONT_PRESETS_BODY.map((f, idx) => (
                      <option key={`bf-${f}-${idx}`} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Tone of Voice */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Volume2 size={11} className="text-emerald-400" /> Тональность (Tone of Voice)
              </label>
              <div>
                <span className="text-[8px] text-neutral-500 font-semibold block mb-0.5">Выберите пресет</span>
                <select
                  value={tempTone}
                  onChange={(e) => setTempTone(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-850 rounded p-1 text-[10px] text-emerald-300 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {TONE_PRESETS.map((t, idx) => (
                    <option key={`tone-${t}-${idx}`} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
