import React from "react";
import {
  Target,
  Palette,
  Lightbulb,
  FileText,
  Search,
  Film,
  Zap,
  Youtube,
  Settings,
  History,
  Sliders,
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export const PAGES = [
  { name: "Ниша", icon: Target, step: 1, desc: "Выбор направления" },
  { name: "Брендинг", icon: Palette, step: 2, desc: "Айдентика" },
  { name: "YouTube", icon: Youtube, step: 3, desc: "Конкуренты & Тренды" },
  { name: "Идеи", icon: Lightbulb, step: 4, desc: "Креатив" },
  { name: "Сценарий", icon: FileText, step: 5, desc: "Текст и план" },
  { name: "Промтинг", icon: Zap, step: 6, desc: "AI Продакшен" },
  { name: "SEO", icon: Search, step: 7, desc: "Оптимизация" },
  { name: "Шортс", icon: Film, step: 8, desc: "Быстрый формат" },
];

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  onOpenInstructions: () => void;
  onOpenLimits: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  setIsOpen,
  onOpenSettings,
  onOpenHistory,
  onOpenInstructions,
  onOpenLimits,
}) => {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 bg-neutral-950 border-r border-neutral-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header / Logo */}
        <div className="h-16 px-6 border-b border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent font-bold shadow-lg shadow-accent/10">
              <Youtube size={20} />
            </div>
            <div>
              <h1 className="text-xs font-black text-white tracking-tight flex items-center gap-1.5">
                YouTube Studio AI
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/20 text-accent font-extrabold border border-accent/30">PRO</span>
              </h1>
              <p className="text-[10px] text-neutral-400">Продюсирование и контент</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900 lg:hidden cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5 no-scrollbar">
          <div className="px-3 pb-2 text-[10px] font-black uppercase tracking-wider text-neutral-500">
            Модули создания
          </div>
          {PAGES.map((page, index) => {
            const Icon = page.icon;
            const isActive = activeTab === page.name || (page.name === "Промтинг" && activeTab === "Промпты");
            return (
              <button
                key={page.name}
                onClick={() => {
                  setActiveTab(page.name);
                  if (window.innerWidth < 1024) setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer group ${
                  isActive
                    ? "bg-accent text-black shadow-lg shadow-accent/20 font-black"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-900/80"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                    isActive ? "bg-black/10 text-black" : "bg-neutral-900 text-neutral-400 group-hover:text-white group-hover:bg-neutral-800"
                  }`}>
                    <Icon size={15} />
                  </div>
                  <div className="text-left">
                    <div className="leading-tight">{page.name}</div>
                    <div className={`text-[10px] font-normal opacity-75 ${isActive ? "text-black/85" : "text-neutral-500"}`}>
                      {page.desc}
                    </div>
                  </div>
                </div>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  isActive ? "bg-black/15 text-black font-extrabold" : "bg-neutral-900 text-neutral-500"
                }`}>
                  0{index + 1}
                </span>
              </button>
            );
          })}
        </div>


      </aside>
    </>
  );
};
