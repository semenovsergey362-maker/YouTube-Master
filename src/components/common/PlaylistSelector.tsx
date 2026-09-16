import React, { useState, useEffect } from "react";
import { Sparkles, Plus, Check, Film, Loader2, Info } from "lucide-react";
import {
  getSuggestedPlaylistsForNiche,
  generateAiPlaylistsForIdea,
  PlaylistSuggestion
} from "../../services/ai/playlistSuggestionService";
import { toast } from "sonner";

export interface PlaylistSelectorProps {
  value: string;
  onChange: (playlistName: string) => void;
  playlists: string[];
  niche?: string;
  ideaTitle?: string;
  ideaDescription?: string;
  onAddPlaylist?: (newPlaylistName: string) => void;
  className?: string;
  showChips?: boolean;
  compact?: boolean;
}

export const PlaylistSelector: React.FC<PlaylistSelectorProps> = ({
  value,
  onChange,
  playlists = [],
  niche = "",
  ideaTitle = "",
  ideaDescription = "",
  onAddPlaylist,
  className = "",
  showChips = true,
  compact = false
}) => {
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [suggestions, setSuggestions] = useState<PlaylistSuggestion[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Update suggestions whenever niche or title changes
  useEffect(() => {
    const suggested = getSuggestedPlaylistsForNiche(niche, ideaTitle, ideaDescription, playlists);
    setSuggestions(suggested);
  }, [niche, ideaTitle, ideaDescription, playlists]);

  const handleCreateCustom = () => {
    const name = customInput.trim();
    if (!name) {
      toast.error("Введите название плейлиста");
      return;
    }
    const formatted = name.match(/^[\p{Emoji}\u2000-\u3300]/u) ? name : `🎬 ${name}`;
    if (onAddPlaylist) {
      onAddPlaylist(formatted);
    }
    onChange(formatted);
    setCustomInput("");
    setIsCreatingNew(false);
    toast.success(`Плейлист "${formatted}" создан и выбран!`);
  };

  const handleSelectSuggested = (suggestedName: string) => {
    if (!playlists.includes(suggestedName) && onAddPlaylist) {
      onAddPlaylist(suggestedName);
    }
    onChange(suggestedName);
    toast.success(`Плейлист "${suggestedName}" выбран!`);
  };

  const handleFetchAiSuggestions = async () => {
    setIsAiLoading(true);
    try {
      const aiSuggestions = await generateAiPlaylistsForIdea(niche, ideaTitle || "Ролик на канале", ideaDescription);
      if (aiSuggestions && aiSuggestions.length > 0) {
        setSuggestions(aiSuggestions);
        toast.success("ИИ сформировал свежие идеи плейлистов!");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiLoading(false);
    }
  };

  if (isCreatingNew) {
    return (
      <div className={`space-y-1.5 ${className}`}>
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreateCustom();
              }
            }}
            placeholder="Название нового плейлиста..."
            autoFocus
            className="w-full bg-neutral-950 border border-accent/60 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-accent font-sans"
          />
          <button
            type="button"
            onClick={handleCreateCustom}
            className="px-3 py-2 bg-accent text-white rounded-xl text-xs font-bold hover:bg-accent/90 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1"
          >
            <Check size={12} />
            ОК
          </button>
          <button
            type="button"
            onClick={() => setIsCreatingNew(false)}
            className="px-2.5 py-2 bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Отмена
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Primary Select Input */}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "__new__") {
              setIsCreatingNew(true);
            } else if (val.startsWith("__suggested__:")) {
              const actualName = val.replace("__suggested__:", "");
              handleSelectSuggested(actualName);
            } else {
              onChange(val);
            }
          }}
          className={`w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 text-neutral-200 focus:outline-none focus:border-accent font-sans cursor-pointer transition-colors ${
            compact ? "py-1.5 text-xs" : "py-2.5 text-xs"
          }`}
        >
          <option value="">🎬 Без плейлиста</option>

          {/* User Existing Playlists */}
          {playlists.length > 0 && (
            <optgroup label="📁 Ваши плейлисты">
              {playlists.map((p, idx) => (
                <option key={`user-pl-${idx}-${p}`} value={p}>
                  {p}
                </option>
              ))}
            </optgroup>
          )}

          {/* AI / Niche Suggested Playlists */}
          {suggestions.length > 0 && (
            <optgroup label={`✨ Рекомендуемые для ниши (${niche || "Канал"})`}>
              {suggestions.map((s, idx) => (
                <option key={`sug-pl-${idx}-${s.name}`} value={`__suggested__:${s.name}`}>
                  {s.name} {playlists.includes(s.name) ? "✓" : "(Рекомендация)"}
                </option>
              ))}
            </optgroup>
          )}

          <option value="__new__">➕ + Создать новый плейлист...</option>
        </select>
      </div>

      {/* Recommended Playlist Chips (Auto-suggestions) */}
      {showChips && suggestions.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={11} className="text-accent" />
              Предложенные плейлисты по теме {niche ? `«${niche}»` : "канала"}:
            </span>
            <button
              type="button"
              onClick={handleFetchAiSuggestions}
              disabled={isAiLoading}
              className="text-[10px] text-accent hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="Сгенерировать новые идеи плейлистов через Gemini ИИ"
            >
              {isAiLoading ? (
                <>
                  <Loader2 size={10} className="animate-spin" />
                  ИИ обновляет...
                </>
              ) : (
                <>
                  <Sparkles size={10} />
                  ИИ-подбор
                </>
              )}
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((sug, idx) => {
              const isSelected = value === sug.name;
              const isAlreadyAdded = playlists.includes(sug.name);

              return (
                <button
                  key={`chip-sug-${idx}-${sug.name}`}
                  type="button"
                  onClick={() => handleSelectSuggested(sug.name)}
                  title={sug.reason || "Рекомендуемый плейлист на основе тематики канала"}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-accent/20 border-accent text-accent font-bold shadow-sm"
                      : "bg-neutral-900/80 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:text-white"
                  }`}
                >
                  <Film size={11} className={isSelected ? "text-accent" : "text-neutral-400"} />
                  <span>{sug.name}</span>
                  {isSelected && <Check size={11} className="text-accent" />}
                  {!isAlreadyAdded && !isSelected && (
                    <span className="text-[9px] text-accent/80 bg-accent/10 px-1 rounded font-normal">
                      +
                    </span>
                  )}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setIsCreatingNew(true)}
              className="text-[11px] px-2.5 py-1 rounded-lg border border-dashed border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500 transition-all cursor-pointer flex items-center gap-1"
            >
              <Plus size={11} />
              <span>Свой плейлист</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
