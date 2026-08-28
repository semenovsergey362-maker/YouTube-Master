import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import {
  Sparkles,
  Search,
  Zap,
  Flame,
  CheckCircle,
  HelpCircle,
  Compass,
} from "lucide-react";

interface NicheTabProps {
  nicheList: any[];
  selectedNiche: string;
  setSelectedNiche: (niche: string) => void;
  customNiche: string;
  setCustomNiche: (niche: string) => void;
  isCustomNiche: boolean;
  setIsCustomNiche: (isCustom: boolean) => void;
  selectedRegion: string;
  setSelectedRegion: (region: string) => void;
  handleAnalyzeNiche?: (nicheName?: string) => void;
  isAnalyzing?: boolean;
  nicheSearchQuery?: string;
  setNicheSearchQuery?: (query: string) => void;
  filteredNiches?: any[];
  REGIONS?: any[];
}

export const NicheTab: React.FC<NicheTabProps> = ({
  nicheList = [],
  selectedNiche,
  setSelectedNiche,
  customNiche,
  setCustomNiche,
  isCustomNiche,
  setIsCustomNiche,
  selectedRegion,
  setSelectedRegion,
  handleAnalyzeNiche,
  isAnalyzing = false,
  nicheSearchQuery,
  setNicheSearchQuery,
  filteredNiches,
}) => {
  const [internalSearch, setInternalSearch] = useState("");
  const currentSearch = nicheSearchQuery !== undefined ? nicheSearchQuery : internalSearch;
  const handleSearchChange = setNicheSearchQuery || setInternalSearch;

  const currentFilteredNiches = useMemo(() => {
    if (filteredNiches) return filteredNiches;
    if (!currentSearch.trim()) return nicheList;
    const q = currentSearch.toLowerCase();
    return nicheList.filter((n: any) => {
      const name = typeof n === "string" ? n : n.name || "";
      const desc = typeof n === "string" ? "" : n.description || "";
      const cat = typeof n === "string" ? "" : n.category || "";
      return name.toLowerCase().includes(q) || desc.toLowerCase().includes(q) || cat.toLowerCase().includes(q);
    });
  }, [filteredNiches, nicheList, currentSearch]);

  const REGION_OPTIONS = [
    { id: "RU", label: "Русскоязычный рынок (CIS/RU)" },
    { id: "US", label: "США и глобальный рынок (EN/US)" },
    { id: "GLOBAL", label: "Международный / Без границ" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-lg font-bold italic tracking-tight text-white flex items-center gap-2">
            <Compass className="text-primary" size={20} />
            Выберите направление
          </h3>
          <p className="text-neutral-500 text-xs">
            Выберите тематику вашего канала для глубокого анализа и генерации стратегии
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest">
            Целевой регион
          </span>
          <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-xl p-1">
            {REGION_OPTIONS.map((reg) => (
              <button
                key={reg.id}
                onClick={() => setSelectedRegion(reg.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedRegion === reg.id
                    ? "bg-primary text-white shadow-[0_0_12px_rgba(239,68,68,0.3)]"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                {reg.id}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Поиск и ввод кастомной ниши */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3.5 top-3.5 text-neutral-500" size={16} />
          <input
            type="text"
            value={currentSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Поиск по популярным категориям..."
            className="w-full pl-10 pr-4 py-2.5 bg-surface/80 border border-border/80 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-primary transition-all"
          />
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={customNiche}
            onChange={(e) => {
              setCustomNiche(e.target.value);
              if (e.target.value.trim()) {
                setIsCustomNiche(true);
                setSelectedNiche(e.target.value);
              }
            }}
            placeholder="Своя ниша..."
            className="flex-1 px-3.5 py-2.5 bg-surface/80 border border-border/80 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-primary transition-all"
          />
          {handleAnalyzeNiche && (
            <button
              onClick={() => handleAnalyzeNiche(customNiche || selectedNiche)}
              disabled={isAnalyzing || (!selectedNiche && !customNiche)}
              className="px-4 py-2.5 bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {isAnalyzing ? (
                <Sparkles className="animate-spin" size={16} />
              ) : (
                <Zap size={16} />
              )}
              Анализ
            </button>
          )}
        </div>
      </div>

      {/* Сетка ниш */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {currentFilteredNiches.map((nicheItem: any, idx: number) => {
          const nicheName = typeof nicheItem === "string" ? nicheItem : nicheItem.name || "Ниша";
          const nicheDesc = typeof nicheItem === "string" ? "Популярная тематика для YouTube канала с высоким потенциалом." : nicheItem.description || "";
          const nicheComp = typeof nicheItem === "string" ? "Средняя" : nicheItem.competition || "Средняя";
          const nicheCpm = typeof nicheItem === "string" ? "$5.00 - $10.00" : nicheItem.cpm || "";
          const nicheTooltip = typeof nicheItem === "string" ? "" : nicheItem.tooltip || "";

          const isSelected = selectedNiche === nicheName && !isCustomNiche;
          const Icon = (typeof nicheItem === "object" && nicheItem.icon) ? nicheItem.icon : Sparkles;

          return (
            <motion.div
              key={nicheName + idx}
              whileHover={{ y: -2 }}
              onClick={() => {
                setSelectedNiche(nicheName);
                setIsCustomNiche(false);
                setCustomNiche("");
              }}
              className={`group relative p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? "bg-primary/10 border-primary shadow-[0_0_20px_rgba(239,68,68,0.15)]"
                  : "bg-surface/50 border-border/60 hover:border-neutral-700 hover:bg-surface"
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between">
                  <div
                    className={`p-2 rounded-lg ${
                      isSelected
                        ? "bg-primary text-white"
                        : "bg-neutral-800 text-neutral-400 group-hover:text-primary transition-colors"
                    }`}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="flex items-center gap-1">
                    {nicheComp && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          nicheComp === "Низкая"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : nicheComp === "Средняя"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                      >
                        {nicheComp} конк.
                      </span>
                    )}
                    {nicheTooltip && (
                      <span
                        title={nicheTooltip}
                        className="text-neutral-500 hover:text-neutral-300 transition-colors cursor-help p-0.5"
                      >
                        <HelpCircle size={14} />
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-white group-hover:text-primary transition-colors flex items-center gap-1.5">
                    {nicheName}
                    {isSelected && <CheckCircle size={14} className="text-primary flex-shrink-0" />}
                  </h4>
                  {nicheDesc && (
                    <p className="text-neutral-400 text-xs mt-1 line-clamp-2 leading-relaxed">
                      {nicheDesc}
                    </p>
                  )}
                </div>
              </div>

              {nicheCpm && (
                <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between text-[11px]">
                  <span className="text-neutral-500">Примерный CPM:</span>
                  <span className="font-mono font-bold text-accent">{nicheCpm}</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
