import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Zap,
  Edit2,
  Copy,
  Check,
  RefreshCw,
  Palette,
  Type,
  ImageIcon,
  Share2,
  Download,
  Flame,
  Search,
  Sliders,
  ExternalLink,
} from "lucide-react";
import { NicheData } from "../../types";

interface BrandingTabProps {
  nicheData: NicheData | null;
  selectedNiche: string;
  selectedBranding: any;
  handleSelectBranding: (branding: any) => void;
  isGeneratingBranding?: boolean;
  handleRegenerateBranding: () => void;
  openBrandingEditModal?: (index: number) => void;
  copiedKey?: string | null;
  copyToClipboard: (text: string, key: string) => void;
  renderIdeaBanner?: () => React.ReactNode;
}

export const BrandingTab: React.FC<BrandingTabProps> = ({
  nicheData,
  selectedNiche,
  selectedBranding,
  handleSelectBranding,
  isGeneratingBranding,
  handleRegenerateBranding,
  openBrandingEditModal,
  copiedKey,
  copyToClipboard,
  renderIdeaBanner,
}) => {
  if (!selectedNiche) {
    return (
      <div className="p-8 text-center bg-surface/60 rounded-2xl border border-dashed border-border/80 max-w-xl mx-auto my-12">
        <Palette className="mx-auto text-neutral-500 mb-3" size={32} />
        <h4 className="text-base font-semibold text-white mb-1">Ниша не выбрана</h4>
        <p className="text-xs text-neutral-400">
          Пожалуйста, выберите нишу на первой вкладке, чтобы сгенерировать брендинг и айдентику канала.
        </p>
      </div>
    );
  }

  if (!nicheData) return null;

  const names = nicheData.branding?.names || [];
  const colors = nicheData.branding?.colors || ["#EF4444", "#3B82F6", "#10B981", "#F59E0B"];
  const fonts = nicheData.branding?.fonts || ["Montserrat", "Inter", "Bebas Neue"];
  const logoPrompt = nicheData.branding?.logoPrompt || "";
  const bannerPrompt = nicheData.branding?.bannerPrompt || "";

  return (
    <div className="space-y-8">
      {renderIdeaBanner && renderIdeaBanner()}

      {/* Header and regenerate */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-3">
            <Palette className="text-accent" size={24} />
            Айдентика и Брендбук Канала
          </h3>
          <p className="text-xs text-neutral-400 mt-1">
            Концепция визуального оформления, цветовая гамма, шрифтовые пары и промпты для генерации логотипа и баннера
          </p>
        </div>

        <button
          onClick={handleRegenerateBranding}
          disabled={isGeneratingBranding}
          className="px-4 py-2.5 bg-surface hover:bg-neutral-800 border border-border rounded-xl text-xs font-semibold text-white transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={14} className={isGeneratingBranding ? "animate-spin text-accent" : ""} />
          {isGeneratingBranding ? "Генерация..." : "Перегенерировать"}
        </button>
      </div>

      {/* Названия и слоганы */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-white uppercase tracking-wider text-neutral-400">
          Варианты позиционирования и названий
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {names.map((item: any, idx: number) => {
            const nameStr = typeof item === "string" ? item : (item?.name || "Канал");
            const sloganStr = typeof item === "object" ? item?.slogan : "";
            const isSelected = selectedBranding?.name === nameStr;

            return (
              <motion.div
                key={idx}
                whileHover={{ y: -2 }}
                onClick={() => handleSelectBranding({ name: nameStr, slogan: sloganStr })}
                className={`p-5 rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between ${
                  isSelected
                    ? "bg-accent/10 border-accent shadow-[0_0_20px_rgba(245,158,11,0.15)]"
                    : "bg-surface/60 border-border/70 hover:border-neutral-700"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 text-accent">
                    <Zap size={16} fill="currentColor" />
                  </div>
                )}
                <div>
                  <span className="text-[10px] font-mono text-neutral-500 block mb-1">Вариант #{idx + 1}</span>
                  <h5 className="text-base font-bold text-white mb-1.5">{nameStr}</h5>
                  {sloganStr && (
                    <p className="text-xs text-neutral-400 italic">«{sloganStr}»</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/40 text-xs">
                  <span className="text-[11px] text-neutral-500">
                    {isSelected ? "Выбран для канала" : "Нажмите для выбора"}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(nameStr + (sloganStr ? " - " + sloganStr : ""), "brand-" + idx);
                    }}
                    className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
                  >
                    {copiedKey === "brand-" + idx ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Палитра и Шрифты */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colors */}
        <div className="p-6 rounded-2xl bg-surface/60 border border-border/70 space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Palette size={16} className="text-accent" />
            Фирменная цветовая палитра
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {colors.map((c: string, idx: number) => (
              <div key={idx} className="space-y-1.5">
                <div
                  className="h-14 rounded-xl border border-white/10 shadow-inner flex items-end p-2"
                  style={{ backgroundColor: c }}
                >
                  <span className="text-[10px] font-mono font-bold bg-black/60 px-1.5 py-0.5 rounded text-white backdrop-blur-sm">
                    {c}
                  </span>
                </div>
                <span className="text-[11px] text-neutral-400 block truncate">Цвет #{idx + 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Fonts */}
        <div className="p-6 rounded-2xl bg-surface/60 border border-border/70 space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Type size={16} className="text-primary" />
            Рекомендуемые шрифтовые пары
          </h4>
          <div className="space-y-3">
            {fonts.map((f: string, idx: number) => (
              <div key={idx} className="p-3 bg-neutral-900/60 rounded-xl border border-border/50 flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-white block">{f}</span>
                  <span className="text-[11px] text-neutral-400">
                    {idx === 0 ? "Основной шрифт (Заголовки и превью)" : "Дополнительный шрифт (Плашки и титры)"}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(f, "font-" + idx)}
                  className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white"
                >
                  {copiedKey === "font-" + idx ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Промпты для Midjourney / DALL-E / Flux */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Логотип */}
        <div className="p-6 rounded-2xl bg-surface/60 border border-border/70 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <ImageIcon size={16} className="text-accent" />
              Промпт для генерации аватара / логотипа
            </h4>
            <button
              onClick={() => copyToClipboard(logoPrompt, "logo-prompt")}
              className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white flex items-center gap-1.5 text-xs font-semibold"
            >
              {copiedKey === "logo-prompt" ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              Копировать
            </button>
          </div>
          <div className="p-4 bg-neutral-900/80 rounded-xl border border-border/40 font-mono text-xs text-neutral-300 leading-relaxed max-h-36 overflow-y-auto">
            {logoPrompt || "Minimalistic vector avatar, vibrant colors, youtube avatar 4k --v 6.0"}
          </div>
        </div>

        {/* Баннер */}
        <div className="p-6 rounded-2xl bg-surface/60 border border-border/70 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <ImageIcon size={16} className="text-primary" />
              Промпт для генерации шапки (баннера)
            </h4>
            <button
              onClick={() => copyToClipboard(bannerPrompt, "banner-prompt")}
              className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white flex items-center gap-1.5 text-xs font-semibold"
            >
              {copiedKey === "banner-prompt" ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              Копировать
            </button>
          </div>
          <div className="p-4 bg-neutral-900/80 rounded-xl border border-border/40 font-mono text-xs text-neutral-300 leading-relaxed max-h-36 overflow-y-auto">
            {bannerPrompt || "Cinematic wide youtube banner, clean typography placeholder, high detail --ar 16:9 --v 6.0"}
          </div>
        </div>
      </div>
    </div>
  );
};
