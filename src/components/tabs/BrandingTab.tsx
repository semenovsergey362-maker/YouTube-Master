import React, { useState } from "react";
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
  Layers,
  Wand2,
  Crop,
  ShieldCheck,
  Maximize2,
  Info,
} from "lucide-react";
import { NicheData } from "../../types";

interface BrandingTabProps {
  nicheData: NicheData | null;
  selectedNiche: string;
  selectedBranding: any;
  handleSelectBranding: (branding: any) => void;
  isGeneratingBranding?: boolean;
  handleRegenerateBranding: () => void;
  handleRegenerateLogoPrompt?: (style?: string) => Promise<void> | void;
  handleRegenerateBannerPrompt?: (style?: string) => Promise<void> | void;
  isRegeneratingLogoPrompt?: boolean;
  isRegeneratingBannerPrompt?: boolean;
  openBrandingEditModal?: (index: number) => void;
  copiedKey?: string | null;
  copyToClipboard: (text: string, key: string) => void;
  renderIdeaBanner?: () => React.ReactNode;
}

const LOGO_STYLE_PRESETS = [
  { id: "3D Премиум", label: "3D Премиум", desc: "Объемная тактильная эмблема, титан, матовое стекло, rim light" },
  { id: "Векторный минимализм", label: "Минимализм", desc: "Геометрический чистый силуэт, плоский вектор, высокая читаемость" },
  { id: "Кинематографичный арт", label: "Кинематограф", desc: "Драматичный студийный свет, реалистичные фактуры, глубина" },
  { id: "Киберпанк & Неон", label: "Неон & Кибер", desc: "Контрастное свечение, темный обсидиановый фон, хай-тек акценты" },
  { id: "Темная монограмма", label: "Монограмма", desc: "Лаконичный символ/буква с золотистым или хромированным отливом" },
  { id: "Иллюстрация & Маскот", label: "Маскот", desc: "Выразительный стилизованный персонаж или знаковый образ ниши" },
];

const BANNER_STYLE_PRESETS = [
  { id: "Кинематографичная панорама", label: "Кинопанорама", desc: "Широкий угол 24mm, лучи сквозь дымку, голливудский грейдинг" },
  { id: "Темный футуризм & Студия", label: "Темный футуризм", desc: "Глубокий темный фон, световые линии, чистая зона слева" },
  { id: "Эпичный пейзаж & Атмосфера", label: "Эпичный пейзаж", desc: "Масштабная перспектива, объемные облака, кино-композиция" },
  { id: "Минималистичный 3D интерьер", label: "3D Архитектура", desc: "Эстетичное современное пространство с мягким рассеянным светом" },
  { id: "Художественный концепт-арт", label: "Концепт-арт", desc: "Атмосферный сюжетный арт с акцентом в безопасной зоне" },
];

export const BrandingTab: React.FC<BrandingTabProps> = ({
  nicheData,
  selectedNiche,
  selectedBranding,
  handleSelectBranding,
  isGeneratingBranding,
  handleRegenerateBranding,
  handleRegenerateLogoPrompt,
  handleRegenerateBannerPrompt,
  isRegeneratingLogoPrompt,
  isRegeneratingBannerPrompt,
  openBrandingEditModal,
  copiedKey,
  copyToClipboard,
  renderIdeaBanner,
}) => {
  const [selectedLogoStyle, setSelectedLogoStyle] = useState<string>("3D Премиум");
  const [selectedBannerStyle, setSelectedBannerStyle] = useState<string>("Кинематографичная панорама");
  const [logoLang, setLogoLang] = useState<"en" | "ru">("en");
  const [bannerLang, setBannerLang] = useState<"en" | "ru">("en");

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
  const colors = nicheData.branding?.colors || ["#6366F1", "#10B981", "#0F172A"];
  const fonts = nicheData.branding?.fonts || ["Montserrat", "Inter", "Bebas Neue"];

  // Resolve Logo Prompts (EN / RU)
  const logoPromptEn =
    nicheData.branding?.logo_prompts?.en ||
    nicheData.branding?.logoPrompt ||
    `Cinematic 3D geometric emblem representing ${selectedNiche}, obsidian dark background, soft electric rim lighting, tactile matte titanium and frosted glass textures, centered composition with circular safe margin, octane render, 8k, photorealistic studio lighting --ar 1:1 --v 6.1 --style raw`;
  
  const logoPromptRu =
    nicheData.branding?.logo_prompts?.ru ||
    nicheData.branding?.logo ||
    `Объемная минималистичная эмблема для YouTube канала в нише "${selectedNiche}", мягкий контурный свет, тактильные текстуры титана и матового стекла, центрированная композиция под круглый аватар.`;

  // Resolve Banner Prompts (EN / RU)
  const bannerPromptEn =
    nicheData.branding?.banner_prompts?.en ||
    nicheData.branding?.bannerPrompt ||
    `Cinematic wide panoramic environment for YouTube channel art about ${selectedNiche}, 24mm wide angle lens, volumetric god rays piercing through atmospheric mist, key visual focus balanced in central safe area, clean negative space on left side, hyper-detailed textures, Hollywood color grading --ar 16:9 --v 6.1 --style raw`;

  const bannerPromptRu =
    nicheData.branding?.banner_prompts?.ru ||
    `Широкоформатный панорамный арт (16:9) для шапки канала в нише "${selectedNiche}". Главные сюжетные элементы расположены в центральной Safe-Zone, слева оставлено чистое темное пространство под аватар и название.`;

  const activeLogoText = logoLang === "en" ? logoPromptEn : logoPromptRu;
  const activeBannerText = bannerLang === "en" ? bannerPromptEn : bannerPromptRu;

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
            Концепция визуального оформления, палитра, шрифтовые пары и профессиональные мастер-промпты для аватара и шапки
          </p>
        </div>

        <button
          onClick={handleRegenerateBranding}
          disabled={isGeneratingBranding}
          className="px-4 py-2.5 bg-surface hover:bg-neutral-800 border border-border rounded-xl text-xs font-semibold text-white transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={14} className={isGeneratingBranding ? "animate-spin text-accent" : ""} />
          {isGeneratingBranding ? "Генерация брендинга..." : "Перегенерировать брендинг"}
        </button>
      </div>

      {/* Названия и слоганы */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider text-neutral-400 flex items-center gap-2">
            <Sparkles size={15} className="text-accent" />
            Варианты позиционирования и названий
          </h4>
          {selectedBranding?.name && (
            <span className="text-xs text-accent font-semibold px-2.5 py-1 bg-accent/10 border border-accent/20 rounded-lg">
              Активно: {selectedBranding.name}
            </span>
          )}
        </div>
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
                    title="Копировать название и слоган"
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
            Фирменная цветовая палитра канала
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {colors.map((c: string, idx: number) => (
              <div key={idx} className="space-y-1.5">
                <div
                  className="h-14 rounded-xl border border-white/10 shadow-inner flex items-end p-2 cursor-pointer hover:scale-[1.02] transition-transform"
                  style={{ backgroundColor: c }}
                  onClick={() => copyToClipboard(c, "color-" + idx)}
                  title="Нажмите, чтобы скопировать HEX"
                >
                  <span className="text-[10px] font-mono font-bold bg-black/70 px-1.5 py-0.5 rounded text-white backdrop-blur-sm flex items-center gap-1">
                    {c}
                    {copiedKey === "color-" + idx && <Check size={10} className="text-green-400" />}
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
            Рекомендуемые шрифтовые пары (Google Fonts)
          </h4>
          <div className="space-y-3">
            {fonts.map((f: string, idx: number) => (
              <div key={idx} className="p-3 bg-neutral-900/60 rounded-xl border border-border/50 flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-white block">{f}</span>
                  <span className="text-[11px] text-neutral-400">
                    {idx === 0 ? "Основной шрифт (Заголовки и обложки превью)" : "Вторичный шрифт (Подписи, плашки и титры)"}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(f, "font-" + idx)}
                  className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white"
                  title="Копировать шрифт"
                >
                  {copiedKey === "font-" + idx ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Промпты для Midjourney / Flux / DALL-E 3 */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Wand2 size={18} className="text-accent" />
              Мастер-промпты для нейросетей (Midjourney v6.1 / Flux.1 / Imagen)
            </h4>
            <p className="text-xs text-neutral-400 mt-0.5">
              Специально оптимизированы под стандарты YouTube: безопасные зоны, круглая обрезка и кинематографичный свет
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* КАРТОЧКА АВАТАРА / ЛОГОТИПА */}
          <div className="p-6 rounded-2xl bg-surface/60 border border-border/70 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-accent/10 border border-accent/30 rounded-lg text-accent">
                    <Crop size={16} />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      Аватар / Логотип канала
                    </h4>
                    <span className="text-[10px] text-neutral-400 block font-mono">1:1 Square • Circle Safe Margin</span>
                  </div>
                </div>

                {/* Switch EN / RU */}
                <div className="flex items-center gap-1 bg-neutral-900/80 p-1 rounded-xl border border-border/50">
                  <button
                    onClick={() => setLogoLang("en")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      logoLang === "en"
                        ? "bg-accent text-neutral-950 shadow-sm"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    EN (Midjourney)
                  </button>
                  <button
                    onClick={() => setLogoLang("ru")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      logoLang === "ru"
                        ? "bg-accent text-neutral-950 shadow-sm"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    RU (Смысл)
                  </button>
                </div>
              </div>

              {/* Style selector chips */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-neutral-400 block">
                  Художественный стиль:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {LOGO_STYLE_PRESETS.map((preset) => {
                    const isActive = selectedLogoStyle === preset.id;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => {
                          setSelectedLogoStyle(preset.id);
                          if (handleRegenerateLogoPrompt) {
                            handleRegenerateLogoPrompt(preset.id);
                          }
                        }}
                        title={preset.desc}
                        className={`px-2.5 py-1 rounded-lg text-xs transition-all flex items-center gap-1 ${
                          isActive
                            ? "bg-accent/15 border border-accent text-accent font-semibold"
                            : "bg-neutral-900/60 border border-border/40 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Prompt box */}
              <div className="relative group">
                <div className="p-4 bg-neutral-950/80 rounded-xl border border-border/50 font-mono text-xs text-neutral-200 leading-relaxed min-h-[140px] max-h-48 overflow-y-auto whitespace-pre-wrap select-all">
                  {activeLogoText}
                </div>
              </div>

              {/* Badges */}
              <div className="flex items-center flex-wrap gap-2 text-[10px] text-neutral-400">
                <span className="px-2 py-0.5 bg-neutral-900 border border-border/40 rounded-md">
                  Параметры: --ar 1:1 --v 6.1 --style raw
                </span>
                <span className="px-2 py-0.5 bg-neutral-900 border border-border/40 rounded-md">
                  Без водяных знаков и артефактов
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/40">
              <button
                onClick={() => handleRegenerateLogoPrompt && handleRegenerateLogoPrompt(selectedLogoStyle)}
                disabled={isRegeneratingLogoPrompt}
                className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 border border-border/70 rounded-xl text-xs font-semibold text-white transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw size={13} className={isRegeneratingLogoPrompt ? "animate-spin text-accent" : ""} />
                {isRegeneratingLogoPrompt ? "Генерация..." : "Обновить промпт"}
              </button>

              <button
                onClick={() => copyToClipboard(activeLogoText, "logo-prompt")}
                className="px-4 py-2 bg-accent hover:bg-amber-400 text-neutral-950 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                {copiedKey === "logo-prompt" ? (
                  <>
                    <Check size={14} className="text-neutral-950" />
                    Скопировано!
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    Копировать для нейросети
                  </>
                )}
              </button>
            </div>
          </div>

          {/* КАРТОЧКА ШАПКИ / БАННЕРА */}
          <div className="p-6 rounded-2xl bg-surface/60 border border-border/70 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-primary/10 border border-primary/30 rounded-lg text-primary">
                    <Maximize2 size={16} />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      Шапка канала (Channel Banner)
                    </h4>
                    <span className="text-[10px] text-neutral-400 block font-mono">16:9 • Safe Zone 1546x423 px</span>
                  </div>
                </div>

                {/* Switch EN / RU */}
                <div className="flex items-center gap-1 bg-neutral-900/80 p-1 rounded-xl border border-border/50">
                  <button
                    onClick={() => setBannerLang("en")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      bannerLang === "en"
                        ? "bg-primary text-white shadow-sm"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    EN (Midjourney)
                  </button>
                  <button
                    onClick={() => setBannerLang("ru")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      bannerLang === "ru"
                        ? "bg-primary text-white shadow-sm"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    RU (Смысл)
                  </button>
                </div>
              </div>

              {/* Style selector chips */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-neutral-400 block">
                  Художественный стиль:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {BANNER_STYLE_PRESETS.map((preset) => {
                    const isActive = selectedBannerStyle === preset.id;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => {
                          setSelectedBannerStyle(preset.id);
                          if (handleRegenerateBannerPrompt) {
                            handleRegenerateBannerPrompt(preset.id);
                          }
                        }}
                        title={preset.desc}
                        className={`px-2.5 py-1 rounded-lg text-xs transition-all flex items-center gap-1 ${
                          isActive
                            ? "bg-primary/20 border border-primary text-primary font-semibold"
                            : "bg-neutral-900/60 border border-border/40 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Prompt box */}
              <div className="relative group">
                <div className="p-4 bg-neutral-950/80 rounded-xl border border-border/50 font-mono text-xs text-neutral-200 leading-relaxed min-h-[140px] max-h-48 overflow-y-auto whitespace-pre-wrap select-all">
                  {activeBannerText}
                </div>
              </div>

              {/* Badges */}
              <div className="flex items-center flex-wrap gap-2 text-[10px] text-neutral-400">
                <span className="px-2 py-0.5 bg-neutral-900 border border-border/40 rounded-md">
                  Параметры: --ar 16:9 --v 6.1 --style raw
                </span>
                <span className="px-2 py-0.5 bg-neutral-900 border border-border/40 rounded-md">
                  Чистая зона слева под аватар
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/40">
              <button
                onClick={() => handleRegenerateBannerPrompt && handleRegenerateBannerPrompt(selectedBannerStyle)}
                disabled={isRegeneratingBannerPrompt}
                className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 border border-border/70 rounded-xl text-xs font-semibold text-white transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw size={13} className={isRegeneratingBannerPrompt ? "animate-spin text-primary" : ""} />
                {isRegeneratingBannerPrompt ? "Генерация..." : "Обновить промпт"}
              </button>

              <button
                onClick={() => copyToClipboard(activeBannerText, "banner-prompt")}
                className="px-4 py-2 bg-primary hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                {copiedKey === "banner-prompt" ? (
                  <>
                    <Check size={14} className="text-white" />
                    Скопировано!
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    Копировать для нейросети
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Информационная плашка для пользователя с рекомендациями по генерации */}
        <div className="p-4 rounded-xl bg-neutral-900/40 border border-border/40 flex items-start gap-3 text-xs text-neutral-400">
          <Info size={16} className="text-accent shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-neutral-300 block">Совет по профессиональной генерации графики YouTube:</span>
            <p>
              Вставьте скопированный английский (EN) промпт в Midjourney, Flux.1 или DALL-E 3. Сгенерированный аватар уже содержит безопасный отступ для круглой обрезки, а шапка оставляет свободное пространство слева под аватар и название канала, центрируя основной сюжет в мобильной Safe Area (1546x423 px).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
