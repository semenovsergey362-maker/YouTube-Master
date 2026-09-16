import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Film, Sparkles, Plus, Check, X, Layers, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export interface IdeaPlaylistSuggestionBannerProps {
  nicheName?: string;
  totalNicheIdeasCount: number;
  currentIdeaTitle: string;
  currentIdeaDescription?: string;
  currentPlaylist?: string;
  existingPlaylists?: string[];
  suggestedPlaylistName: string;
  suggestedReason?: string;
  onAssignPlaylist: (playlistName: string) => void;
  onBatchAssignSimilar?: (playlistName: string) => void;
  similarIdeasCount?: number;
  isShort?: boolean;
}

export const IdeaPlaylistSuggestionBanner: React.FC<IdeaPlaylistSuggestionBannerProps> = ({
  nicheName,
  totalNicheIdeasCount,
  currentIdeaTitle,
  currentIdeaDescription,
  currentPlaylist,
  existingPlaylists = [],
  suggestedPlaylistName,
  suggestedReason,
  onAssignPlaylist,
  onBatchAssignSimilar,
  similarIdeasCount = 0,
  isShort = false,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  // Only show if niche has accumulated > 5 ideas AND idea is not already in a playlist
  const hasEnoughIdeas = totalNicheIdeasCount > 5;
  const isAlreadyInPlaylist = Boolean(currentPlaylist && currentPlaylist !== "none");

  if (!hasEnoughIdeas || isAlreadyInPlaylist || isDismissed || !suggestedPlaylistName) {
    return null;
  }

  const isExistingInUserPlaylists = existingPlaylists.includes(suggestedPlaylistName);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -4, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="mt-2.5 p-2.5 rounded-xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-neutral-950/80 border border-purple-500/40 shadow-sm relative overflow-hidden space-y-2 group/sug"
      >
        {/* Subtle accent glow */}
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-400 to-indigo-500 rounded-l-xl" />

        <div className="flex items-start justify-between gap-2 pl-1.5">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/25 text-purple-300 border border-purple-500/40">
                <Sparkles size={10} className="text-purple-300 animate-pulse" />
                <span>{isShort ? "Авто-серия Shorts" : "Накоплено >5 идей"}</span>
              </span>
              <span className="text-[10px] font-bold text-neutral-400">
                В {nicheName ? `«${nicheName}»` : "нише"}: <strong className="text-purple-200">{totalNicheIdeasCount} идей</strong>
              </span>
            </div>

            <p className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5 pt-0.5">
              <span>Рекомендуем плейлист:</span>
              <strong className="text-purple-300 font-extrabold bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-500/30 truncate max-w-[220px]">
                {suggestedPlaylistName}
              </strong>
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/80 rounded-lg transition-colors cursor-pointer shrink-0"
            title="Скрыть предложение для этой карточки"
          >
            <X size={12} />
          </button>
        </div>

        {suggestedReason && (
          <p className="text-[11px] text-neutral-400 pl-1.5 leading-snug line-clamp-1 italic">
            💡 {suggestedReason}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 pl-1.5 pt-0.5">
          <button
            type="button"
            onClick={() => {
              onAssignPlaylist(suggestedPlaylistName);
              toast.success(`Идея добавлена в плейлист «${suggestedPlaylistName}» 🎬`);
            }}
            className="px-2.5 py-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-100 hover:text-white border border-purple-400/50 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-102"
          >
            <Plus size={12} className="text-purple-300" />
            <span>{isExistingInUserPlaylists ? "В плейлист" : "+ Создать плейлист"}</span>
          </button>

          {similarIdeasCount > 1 && onBatchAssignSimilar && (
            <button
              type="button"
              onClick={() => {
                onBatchAssignSimilar(suggestedPlaylistName);
              }}
              className="px-2 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/35 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
              title={`Объединить ${similarIdeasCount} похожих идей этой темы в один плейлист`}
            >
              <Layers size={11} className="text-indigo-400" />
              <span>Объединить {similarIdeasCount} похожих</span>
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
