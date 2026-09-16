import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Palette,
  Check,
  RotateCcw,
  Film,
  Tag,
  Folder,
  Trash2,
  Copy,
  Sparkles,
  Plus,
  Sliders,
  CheckCircle2,
} from "lucide-react";

export const PRESET_CARD_COLORS = [
  { id: "emerald", label: "Изумруд", hex: "#10b981", text: "text-emerald-400" },
  { id: "teal", label: "Бирюзовый", hex: "#14b8a6", text: "text-teal-400" },
  { id: "cyan", label: "Лазурный", hex: "#06b6d4", text: "text-cyan-400" },
  { id: "blue", label: "Синий", hex: "#3b82f6", text: "text-blue-400" },
  { id: "indigo", label: "Индиго", hex: "#6366f1", text: "text-indigo-400" },
  { id: "purple", label: "Фиолетовый", hex: "#8b5cf6", text: "text-purple-400" },
  { id: "pink", label: "Розовый", hex: "#ec4899", text: "text-pink-400" },
  { id: "rose", label: "Коралловый", hex: "#f43f5e", text: "text-rose-400" },
  { id: "amber", label: "Янтарный", hex: "#f59e0b", text: "text-amber-400" },
  { id: "lime", label: "Лайм", hex: "#84cc16", text: "text-lime-400" },
  { id: "slate", label: "Графит", hex: "#64748b", text: "text-slate-400" },
];

export const STATUS_COLORS_MAP: Record<string, string> = {
  "Идея": "#38bdf8", // Sky
  "В работе": "#f59e0b", // Amber
  "Сценарий": "#a855f7", // Purple
  "Съемка": "#ec4899", // Pink
  "Монтаж": "#06b6d4", // Cyan
  "Готово": "#10b981", // Emerald
  "Опубликовано": "#22c55e", // Green
  "В архиве": "#64748b", // Slate
};

export function getCategoryColor(categoryName: string): string {
  if (!categoryName) return "#8b5cf6";
  const colors = [
    "#10b981", "#06b6d4", "#3b82f6", "#6366f1",
    "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b", "#14b8a6"
  ];
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % colors.length;
  return colors[idx];
}

export function computeCardColorStyles(
  color?: string,
  colorType?: "custom" | "status" | "category",
  status?: string,
  category?: string
): {
  cardStyle: React.CSSProperties;
  accentBarStyle: React.CSSProperties;
  badgeStyle: React.CSSProperties;
  activeHex: string | null;
} {
  let activeHex: string | null = null;

  if (colorType === "status" && status) {
    activeHex = STATUS_COLORS_MAP[status] || "#38bdf8";
  } else if (colorType === "category" && category && category !== "none") {
    activeHex = getCategoryColor(category);
  } else if (color) {
    activeHex = color;
  }

  if (!activeHex) {
    return {
      cardStyle: {},
      accentBarStyle: {},
      badgeStyle: {},
      activeHex: null,
    };
  }

  return {
    cardStyle: {
      borderColor: `${activeHex}55`,
      background: `linear-gradient(145deg, ${activeHex}14 0%, rgba(20, 20, 24, 0.95) 75%)`,
      boxShadow: `0 4px 20px -2px ${activeHex}22`,
    },
    accentBarStyle: {
      background: `linear-gradient(to bottom, ${activeHex}, ${activeHex}88)`,
      boxShadow: `0 0 10px ${activeHex}80`,
    },
    badgeStyle: {
      backgroundColor: `${activeHex}25`,
      borderColor: `${activeHex}50`,
      color: activeHex,
    },
    activeHex,
  };
}

export interface IdeaCardContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  position?: { x: number; y: number } | null;
  anchorRef?: React.RefObject<HTMLElement>;
  currentColor?: string;
  currentColorType?: "custom" | "status" | "category";
  currentStatus?: string;
  currentCategory?: string;
  onSelectColor: (color: string | undefined, colorType: "custom" | "status" | "category" | undefined) => void;
  onAddToPlaylist?: (playlistName: string) => void;
  playlists?: string[];
  suggestedPlaylist?: string;
  onCopyTitle?: () => void;
  onDelete?: () => void;
  ideaTitle?: string;
}

export const IdeaCardContextMenu: React.FC<IdeaCardContextMenuProps> = ({
  isOpen,
  onClose,
  position,
  currentColor,
  currentColorType = "custom",
  currentStatus = "Идея",
  currentCategory,
  onSelectColor,
  onAddToPlaylist,
  playlists = [],
  suggestedPlaylist,
  onCopyTitle,
  onDelete,
  ideaTitle,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [customHex, setCustomHex] = useState(currentColor || "#8b5cf6");
  const [activeTab, setActiveTab] = useState<"presets" | "status" | "category">("presets");

  useEffect(() => {
    if (currentColor) setCustomHex(currentColor);
  }, [currentColor]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Calculate safe on-screen coordinates
  const stylePos: React.CSSProperties = position
    ? {
        position: "fixed",
        top: Math.min(position.y, window.innerHeight - 380),
        left: Math.min(position.x, window.innerWidth - 300),
        zIndex: 9999,
      }
    : {
        position: "absolute",
        top: "100%",
        right: 0,
        zIndex: 50,
      };

  const statusColor = STATUS_COLORS_MAP[currentStatus] || "#38bdf8";
  const categoryColor = currentCategory ? getCategoryColor(currentCategory) : "#8b5cf6";

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95, y: 5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 5 }}
        transition={{ duration: 0.15 }}
        style={stylePos}
        onClick={(e) => e.stopPropagation()}
        className="w-72 bg-neutral-900/98 border border-neutral-700/80 rounded-2xl shadow-2xl p-3.5 space-y-3 backdrop-blur-xl text-neutral-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
              <Palette size={13} />
            </div>
            <span className="text-xs font-bold text-white">Цвет и оформление карточки</span>
          </div>
          {currentColor && (
            <button
              onClick={() => onSelectColor(undefined, undefined)}
              className="text-[10px] text-neutral-400 hover:text-red-400 flex items-center gap-1 transition-colors cursor-pointer"
              title="Сбросить цвет на стандартный"
            >
              <RotateCcw size={10} />
              <span>Сброс</span>
            </button>
          )}
        </div>

        {/* Color Mode Switcher */}
        <div className="grid grid-cols-3 gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-[10px] font-bold">
          <button
            onClick={() => setActiveTab("presets")}
            className={`py-1 rounded-lg transition-all text-center cursor-pointer ${
              activeTab === "presets"
                ? "bg-neutral-800 text-white shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Палитра
          </button>
          <button
            onClick={() => {
              setActiveTab("status");
              onSelectColor(statusColor, "status");
            }}
            className={`py-1 rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === "status" || currentColorType === "status"
                ? "bg-neutral-800 text-white shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <span>По статусу</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("category");
              if (currentCategory && currentCategory !== "none") {
                onSelectColor(categoryColor, "category");
              }
            }}
            className={`py-1 rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === "category" || currentColorType === "category"
                ? "bg-neutral-800 text-white shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <span>По рубрике</span>
          </button>
        </div>

        {/* Tab 1: Presets & Custom Color Picker */}
        {activeTab === "presets" && (
          <div className="space-y-2.5">
            <div className="grid grid-cols-6 gap-1.5 pt-0.5">
              {PRESET_CARD_COLORS.map((c) => {
                const isSelected = currentColor === c.hex && currentColorType === "custom";
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCustomHex(c.hex);
                      onSelectColor(c.hex, "custom");
                    }}
                    style={{ backgroundColor: c.hex }}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all transform hover:scale-110 cursor-pointer shadow-sm ${
                      isSelected ? "ring-2 ring-white ring-offset-2 ring-offset-neutral-900 scale-105" : "opacity-85 hover:opacity-100"
                    }`}
                    title={c.label}
                  >
                    {isSelected && <Check size={14} className="text-white drop-shadow-md stroke-[3]" />}
                  </button>
                );
              })}
            </div>

            {/* Native Color Picker + Hex Input */}
            <div className="flex items-center gap-2 pt-1 border-t border-neutral-800/80">
              <div className="relative w-8 h-8 rounded-xl overflow-hidden border border-neutral-700 shrink-0 shadow-inner">
                <input
                  type="color"
                  value={customHex}
                  onChange={(e) => {
                    setCustomHex(e.target.value);
                    onSelectColor(e.target.value, "custom");
                  }}
                  className="absolute -top-3 -left-3 w-14 h-14 cursor-pointer"
                  title="Выбрать свой точный цвет через Color Picker"
                />
              </div>
              <div className="flex-1 flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 rounded-xl px-2 py-1">
                <span className="text-[10px] text-neutral-500 font-mono font-bold">HEX</span>
                <input
                  type="text"
                  value={customHex}
                  onChange={(e) => setCustomHex(e.target.value)}
                  onBlur={() => {
                    if (/^#[0-9A-F]{6}$/i.test(customHex)) {
                      onSelectColor(customHex, "custom");
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && /^#[0-9A-F]{6}$/i.test(customHex)) {
                      onSelectColor(customHex, "custom");
                    }
                  }}
                  placeholder="#8b5cf6"
                  className="w-full bg-transparent text-xs text-white font-mono focus:outline-none"
                />
              </div>
              <button
                onClick={() => {
                  if (/^#[0-9A-F]{6}$/i.test(customHex)) {
                    onSelectColor(customHex, "custom");
                  }
                }}
                className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                ОК
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Color by Status */}
        {activeTab === "status" && (
          <div className="space-y-2 p-2 bg-neutral-950/80 border border-neutral-800 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-neutral-300">Текущий статус:</span>
              <span
                style={{ backgroundColor: `${statusColor}25`, borderColor: `${statusColor}60`, color: statusColor }}
                className="px-2 py-0.5 rounded-lg text-xs font-bold border"
              >
                {currentStatus}
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 leading-tight">
              Цвет карточки будет автоматически обновляться при смене статуса (Идея, В работе, Готово, Опубликовано).
            </p>
            <button
              onClick={() => onSelectColor(statusColor, "status")}
              style={{ backgroundColor: `${statusColor}30`, borderColor: `${statusColor}60`, color: "#fff" }}
              className="w-full py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <CheckCircle2 size={13} style={{ color: statusColor }} />
              <span>Привязать цвет к статусу</span>
            </button>
          </div>
        )}

        {/* Tab 3: Color by Category / Rubric */}
        {activeTab === "category" && (
          <div className="space-y-2 p-2 bg-neutral-950/80 border border-neutral-800 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-neutral-300">Рубрика/Категория:</span>
              <span
                style={{ backgroundColor: `${categoryColor}25`, borderColor: `${categoryColor}60`, color: categoryColor }}
                className="px-2 py-0.5 rounded-lg text-xs font-bold border truncate max-w-[120px]"
              >
                {currentCategory && currentCategory !== "none" ? currentCategory : "Без рубрики"}
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 leading-tight">
              Карточки одной рубрики будут оформлены в едином цветовом оттенке для легкого визуального поиска.
            </p>
            <button
              onClick={() => {
                if (currentCategory && currentCategory !== "none") {
                  onSelectColor(categoryColor, "category");
                }
              }}
              disabled={!currentCategory || currentCategory === "none"}
              style={{ backgroundColor: `${categoryColor}30`, borderColor: `${categoryColor}60`, color: "#fff" }}
              className="w-full py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Folder size={13} style={{ color: categoryColor }} />
              <span>Привязать цвет к рубрике</span>
            </button>
          </div>
        )}

        {/* Quick Additional Actions */}
        <div className="pt-2 border-t border-neutral-800 space-y-1">
          {suggestedPlaylist && onAddToPlaylist && (
            <button
              onClick={() => {
                onAddToPlaylist(suggestedPlaylist);
                onClose();
              }}
              className="w-full px-2.5 py-1.5 hover:bg-purple-500/15 text-purple-300 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-2 truncate">
                <Film size={12} className="text-purple-400 shrink-0" />
                <span className="truncate">В плейлист: {suggestedPlaylist}</span>
              </div>
              <Plus size={12} className="shrink-0" />
            </button>
          )}

          {onCopyTitle && (
            <button
              onClick={() => {
                onCopyTitle();
                onClose();
              }}
              className="w-full px-2.5 py-1.5 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer text-left"
            >
              <Copy size={12} className="text-neutral-400" />
              <span>Скопировать название</span>
            </button>
          )}

          {onDelete && (
            <button
              onClick={() => {
                onDelete();
                onClose();
              }}
              className="w-full px-2.5 py-1.5 hover:bg-red-500/15 text-red-400 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer text-left"
            >
              <Trash2 size={12} className="text-red-400" />
              <span>Удалить идею</span>
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
