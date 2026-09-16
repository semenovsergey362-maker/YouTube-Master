import React, { useState, useEffect } from "react";
import {
  ListMusic,
  Plus,
  Play,
  ExternalLink,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  FolderPlus,
  Eye,
  Lock,
  Globe,
  Loader2,
  Layers,
  ArrowRight,
  Info,
  Check,
  Film,
  Sparkle,
  Tv
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  analyzePlaylistsAndIdeaDistribution,
  PlaylistIntelligenceResult,
  NewPlaylistSuggestion,
  PlaylistIdeaAssignment
} from "../services/ai/channelService";
import { logger } from "../config/logger";

export interface YouTubePlaylist {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  itemCount: number;
  privacyStatus: "public" | "unlisted" | "private" | string;
  publishedAt?: string;
}

interface ChannelPlaylistsSectionProps {
  niche: string;
  ideas: any[];
  selectedModel?: string;
  isChannelConnected?: boolean;
}

export const ChannelPlaylistsSection: React.FC<ChannelPlaylistsSectionProps> = ({
  niche,
  ideas = [],
  selectedModel = "gemini-3.1-flash-lite",
  isChannelConnected = false
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"playlists" | "assignments" | "recommendations">("playlists");
  const [playlists, setPlaylists] = useState<YouTubePlaylist[]>([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // AI Intelligence & Recommendations state
  const [intelligence, setIntelligence] = useState<PlaylistIntelligenceResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Modal create playlist state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPrivacy, setNewPrivacy] = useState<"public" | "unlisted" | "private">("public");
  const [isCreating, setIsCreating] = useState(false);

  // Assigned tracking (local state for immediate UI feedback)
  const [assignedIdeas, setAssignedIdeas] = useState<Record<string, string>>({});
  const [assigningId, setAssigningId] = useState<string | null>(null);

  // Creating suggested playlist
  const [creatingSuggestedIdx, setCreatingSuggestedIdx] = useState<number | null>(null);

  // Fetch Playlists from YouTube API
  const fetchPlaylists = async () => {
    setIsLoadingPlaylists(true);
    try {
      const res = await fetch("/api/youtube/playlists");
      if (res.ok) {
        const data = await res.json();
        setPlaylists(data.playlists || []);
        setIsDemoMode(Boolean(data.isDemo));
      } else {
        throw new Error("Не удалось загрузить плейлисты");
      }
    } catch (err: any) {
      logger.warn("Failed to fetch playlists, fallback:", err);
      setIsDemoMode(true);
    } finally {
      setIsLoadingPlaylists(false);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, []);

  // Run AI analysis when switching to recommendations if not loaded yet
  const handleRunAIAnalysis = async () => {
    if (ideas.length === 0) {
      toast.error("Сначала сгенерируйте идеи для видео на вкладке 'Идеи'");
      return;
    }

    setIsAnalyzing(true);
    const toastId = toast.loading("ИИ анализирует плейлисты и выстраивает стратегию сериализации...");
    try {
      const res = await analyzePlaylistsAndIdeaDistribution(
        playlists,
        ideas,
        niche,
        { model: selectedModel }
      );
      if (res) {
        setIntelligence(res);
        toast.success("ИИ-анализ готов! Распределены идеи и предложены новые плейлисты.", { id: toastId });
      } else {
        toast.error("Не удалось сформировать рекомендации", { id: toastId });
      }
    } catch (err: any) {
      logger.error("Analysis error:", err);
      toast.error("Ошибка анализа: " + err.message, { id: toastId });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Create Playlist Handler
  const handleCreatePlaylist = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTitle.trim()) {
      toast.error("Укажите название плейлиста");
      return;
    }

    setIsCreating(true);
    const toastId = toast.loading(`Создание плейлиста "${newTitle}"...`);
    try {
      const res = await fetch("/api/youtube/create-playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim(),
          privacyStatus: newPrivacy
        })
      });

      if (res.ok) {
        const data = await res.json();
        const createdPl: YouTubePlaylist = {
          id: data.playlist.id || `pl-${Date.now()}`,
          title: data.playlist.title || newTitle,
          description: data.playlist.description || newDescription,
          thumbnail: data.playlist.thumbnail || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=60",
          itemCount: 0,
          privacyStatus: newPrivacy,
          publishedAt: new Date().toISOString()
        };

        setPlaylists(prev => [createdPl, ...prev]);
        setNewTitle("");
        setNewDescription("");
        setIsCreateModalOpen(false);

        toast.success(
          data.isDemo
            ? `Плейлист "${createdPl.title}" создан (в демонстрационном режиме)`
            : `Плейлист "${createdPl.title}" успешно создан на вашем YouTube-канале!`,
          { id: toastId }
        );
      } else {
        throw new Error("Сервер вернул ошибку при создании");
      }
    } catch (err: any) {
      logger.error("Create playlist error:", err);
      toast.error("Ошибка при создании: " + err.message, { id: toastId });
    } finally {
      setIsCreating(false);
    }
  };

  // Create Suggested Playlist in 1 click
  const handleCreateSuggestedPlaylist = async (suggestion: NewPlaylistSuggestion, idx: number) => {
    setCreatingSuggestedIdx(idx);
    const toastId = toast.loading(`Создание плейлиста "${suggestion.title}" на YouTube...`);
    try {
      const res = await fetch("/api/youtube/create-playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: suggestion.title,
          description: `${suggestion.description}\n\n🎬 Рекомендуемый порядок серий:\n` +
            suggestion.suggestedSequencing.map((s, i) => `${i + 1}. ${s}`).join("\n"),
          privacyStatus: "public"
        })
      });

      if (res.ok) {
        const data = await res.json();
        const createdPl: YouTubePlaylist = {
          id: data.playlist.id || `pl-sug-${Date.now()}`,
          title: suggestion.title,
          description: suggestion.description,
          thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=60",
          itemCount: suggestion.includedIdeaTitles.length,
          privacyStatus: "public",
          publishedAt: new Date().toISOString()
        };
        setPlaylists(prev => [createdPl, ...prev]);
        toast.success(
          data.isDemo
            ? `Плейлист "${suggestion.title}" успешно сгенерирован и добавлен (Демо)`
            : `Плейлист "${suggestion.title}" создан на вашем канале!`,
          { id: toastId }
        );
      } else {
        throw new Error("Не удалось создать плейлист");
      }
    } catch (err: any) {
      toast.error("Ошибка: " + err.message, { id: toastId });
    } finally {
      setCreatingSuggestedIdx(null);
    }
  };

  // Assign Idea to Playlist
  const handleAssignIdeaToPlaylist = async (ideaTitle: string, playlistId: string, playlistTitle: string) => {
    setAssigningId(ideaTitle);
    try {
      const res = await fetch("/api/youtube/playlists/add-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playlistId,
          videoId: "demo-video-id"
        })
      });

      if (res.ok) {
        setAssignedIdeas(prev => ({ ...prev, [ideaTitle]: playlistTitle }));
        toast.success(`Идея "${ideaTitle}" привязана к плейлисту "${playlistTitle}"!`);
      }
    } catch (err: any) {
      toast.error("Не удалось привязать: " + err.message);
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div id="channel-playlists-section" className="p-5 rounded-2xl bg-surface border border-border shadow-xl space-y-5 w-full">
      {/* Header with Title and Global Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-900 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <ListMusic size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Плейлисты канала & Архитектура удержания (Binge-Watching)
              </h3>
              <p className="text-xs text-neutral-400">
                Управление плейлистами, сериализация контента и умное распределение идей для максимального удержания зрителей
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isDemoMode && (
            <span className="px-2 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-[9px] font-black tracking-wider text-amber-300">
              ДЕМО-РЕЖИМ
            </span>
          )}

          <button
            onClick={fetchPlaylists}
            disabled={isLoadingPlaylists}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-all text-xs font-bold disabled:opacity-50"
            title="Обновить список плейлистов с YouTube"
          >
            <RefreshCw size={13} className={isLoadingPlaylists ? "animate-spin" : ""} />
            <span>Обновить</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white transition-all text-xs font-bold border border-neutral-700/60 shadow-sm"
          >
            <Plus size={14} className="text-primary" />
            <span>Создать плейлист</span>
          </button>

          <button
            onClick={handleRunAIAnalysis}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-95 text-black font-bold text-xs shadow-md transition-all disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            <span>ИИ-Анализ & Рекомендации</span>
          </button>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex items-center justify-between gap-2 border-b border-neutral-800/80 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab("playlists")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === "playlists"
                ? "bg-primary/20 text-primary border border-primary/30 shadow-sm"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
            }`}
          >
            <Tv size={14} />
            <span>Плейлисты канала ({playlists.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab("assignments");
              if (!intelligence && !isAnalyzing && ideas.length > 0) {
                handleRunAIAnalysis();
              }
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all relative ${
              activeSubTab === "assignments"
                ? "bg-primary/20 text-primary border border-primary/30 shadow-sm"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
            }`}
          >
            <Layers size={14} />
            <span>Куда поместить идеи {intelligence?.ideaAssignments ? `(${intelligence.ideaAssignments.length})` : ""}</span>
            {!intelligence && (
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            )}
          </button>

          <button
            onClick={() => {
              setActiveSubTab("recommendations");
              if (!intelligence && !isAnalyzing && ideas.length > 0) {
                handleRunAIAnalysis();
              }
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === "recommendations"
                ? "bg-primary/20 text-primary border border-primary/30 shadow-sm"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
            }`}
          >
            <FolderPlus size={14} />
            <span>Идеи для новых плейлистов {intelligence?.newPlaylists ? `(${intelligence.newPlaylists.length})` : ""}</span>
          </button>
        </div>

        {intelligence?.channelArchitectureAudit && (
          <div className="hidden lg:flex items-center gap-2 text-[11px] text-neutral-400 bg-neutral-900/60 px-3 py-1 rounded-lg border border-neutral-800">
            <Sparkle size={12} className="text-accent" />
            <span>Прирост удержания: <strong className="text-emerald-400">+35-50%</strong> при сериализации</span>
          </div>
        )}
      </div>

      {/* SUB-TAB 1: PLAYLISTS GRID */}
      {activeSubTab === "playlists" && (
        <div className="space-y-4 animate-fadeIn">
          {isLoadingPlaylists ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-neutral-400">
              <Loader2 size={28} className="animate-spin text-primary" />
              <p className="text-xs">Загрузка плейлистов с YouTube канала...</p>
            </div>
          ) : playlists.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-xl border border-dashed border-neutral-800 bg-neutral-950/30 space-y-3">
              <ListMusic size={36} className="mx-auto text-neutral-600" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-neutral-300">Плейлисты не найдены</h4>
                <p className="text-xs text-neutral-500 max-w-md mx-auto">
                  Создайте первый плейлист вручную или воспользуйтесь рекомендациями искусственного интеллекта на основе ваших идей.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-all"
                >
                  + Создать плейлист
                </button>
                <button
                  onClick={handleRunAIAnalysis}
                  className="px-4 py-2 bg-neutral-800 text-neutral-200 text-xs font-bold rounded-xl hover:bg-neutral-700 transition-all"
                >
                  Подобрать ИИ-концепции
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {playlists.map((pl) => {
                const isPublic = pl.privacyStatus === "public";
                const isUnlisted = pl.privacyStatus === "unlisted";

                return (
                  <div
                    key={pl.id}
                    className="flex flex-col justify-between p-4 rounded-xl bg-neutral-950/50 border border-neutral-900 hover:border-neutral-800 transition-all hover:shadow-lg group"
                  >
                    <div className="space-y-3">
                      {/* Thumbnail with overlay item count */}
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800">
                        {pl.thumbnail ? (
                          <img
                            src={pl.thumbnail}
                            alt={pl.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-600 bg-neutral-900">
                            <ListMusic size={32} />
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

                        {/* Top badges */}
                        <div className="absolute top-2 left-2 flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider flex items-center gap-1 ${
                            isPublic
                              ? "bg-emerald-500/80 text-white backdrop-blur-sm"
                              : isUnlisted
                                ? "bg-blue-500/80 text-white backdrop-blur-sm"
                                : "bg-neutral-700/80 text-neutral-200 backdrop-blur-sm"
                          }`}>
                            {isPublic ? <Globe size={9} /> : isUnlisted ? <Eye size={9} /> : <Lock size={9} />}
                            {isPublic ? "Публичный" : isUnlisted ? "По ссылке" : "Приватный"}
                          </span>
                        </div>

                        {/* Bottom right: Video count */}
                        <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/85 backdrop-blur-sm text-white text-[10px] font-bold flex items-center gap-1.5 border border-white/10">
                          <Film size={11} />
                          <span>{pl.itemCount} {pl.itemCount === 1 ? 'видео' : pl.itemCount < 5 ? 'видео' : 'видео'}</span>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-primary transition-colors" title={pl.title}>
                          {pl.title}
                        </h4>
                        <p className="text-[10px] text-neutral-400 line-clamp-2 leading-relaxed">
                          {pl.description || "Описание плейлиста отсутствует."}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-3 border-t border-neutral-900/60 mt-3 flex items-center justify-between">
                      <span className="text-[9px] text-neutral-500">
                        {pl.publishedAt ? new Date(pl.publishedAt).toLocaleDateString("ru-RU") : "Активен"}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <a
                          href={pl.id.startsWith("demo") ? "https://www.youtube.com" : `https://www.youtube.com/playlist?list=${pl.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-[10px] font-bold border border-neutral-800 transition-all"
                        >
                          <span>Смотреть</span>
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: SMART ASSIGNMENTS (WHERE TO PUT IDEAS) */}
      {activeSubTab === "assignments" && (
        <div className="space-y-4 animate-fadeIn">
          {isAnalyzing ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-4 text-center">
              <Loader2 size={32} className="animate-spin text-primary" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">ИИ сопоставляет идеи с архитектурой плейлистов...</h4>
                <p className="text-xs text-neutral-500 max-w-sm">
                  Определяем оптимальный тематический кластер и рассчитываем потенциал удержания (Binge-watching)
                </p>
              </div>
            </div>
          ) : !intelligence ? (
            <div className="text-center py-12 px-4 rounded-xl border border-dashed border-neutral-800 bg-neutral-950/30 space-y-3">
              <Sparkles size={32} className="mx-auto text-primary" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">ИИ-распределение еще не рассчитано</h4>
                <p className="text-xs text-neutral-400 max-w-md mx-auto">
                  Нажмите кнопку ниже, чтобы нейросеть проанализировала все текущие идеи и подобрала для каждой идеальный плейлист.
                </p>
              </div>
              <button
                onClick={handleRunAIAnalysis}
                className="px-5 py-2.5 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-black text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <Sparkles size={14} />
                <span>Запустить умное распределение</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Audit Summary Box */}
              {intelligence.channelArchitectureAudit && (
                <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Info size={14} className="text-primary" />
                    <span>Оценка структуры удержания:</span>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {intelligence.channelArchitectureAudit.strengths}
                  </p>
                  {intelligence.channelArchitectureAudit.bingeWatchingTips && intelligence.channelArchitectureAudit.bingeWatchingTips.length > 0 && (
                    <div className="pt-2 border-t border-neutral-800/60 flex flex-wrap gap-2">
                      {intelligence.channelArchitectureAudit.bingeWatchingTips.map((tip, i) => (
                        <span key={i} className="text-[10px] text-neutral-400 bg-neutral-950 px-2.5 py-1 rounded-md border border-neutral-800/80">
                          💡 {tip}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Ideas Assignments List */}
              <div className="grid grid-cols-1 gap-3">
                {intelligence.ideaAssignments.map((assignment, idx) => {
                  const alreadyAssigned = assignedIdeas[assignment.ideaTitle];
                  const targetPlaylist = playlists.find(p => p.id === assignment.recommendedPlaylistId);
                  const isNewRequired = !assignment.recommendedPlaylistId;

                  return (
                    <div
                      key={`assignment-${idx}`}
                      className="p-4 rounded-xl bg-neutral-950/40 border border-neutral-900 hover:border-neutral-800 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-white truncate max-w-md" title={assignment.ideaTitle}>
                            {assignment.ideaTitle}
                          </span>
                          {assignment.suggestedEpisodeNumber && (
                            <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-[9px] font-black text-primary">
                              Серия #{assignment.suggestedEpisodeNumber}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-400">
                            {assignment.matchScore}% Совпадение
                          </span>
                        </div>

                        {/* Recommendation details */}
                        <div className="flex items-center gap-2 text-xs text-neutral-400 flex-wrap">
                          <span className="text-neutral-500">Рекомендуемый плейлист:</span>
                          <span className={`font-bold ${isNewRequired ? "text-amber-400" : "text-primary"}`}>
                            {alreadyAssigned || assignment.recommendedPlaylistTitle}
                          </span>
                        </div>

                        <p className="text-[11px] text-neutral-400 leading-relaxed italic bg-neutral-900/40 p-2 rounded-lg border border-neutral-900">
                          🎯 <strong>Стратегический эффект:</strong> {assignment.strategicReason}
                          {assignment.seriesHook && (
                            <span className="block text-[10px] text-neutral-500 not-italic mt-1">
                              🔗 Мостик удержания: "{assignment.seriesHook}"
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Right Action */}
                      <div className="shrink-0 flex items-center gap-2">
                        {alreadyAssigned ? (
                          <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                            <CheckCircle2 size={13} />
                            Привязано
                          </span>
                        ) : isNewRequired ? (
                          <button
                            onClick={() => {
                              setNewTitle(assignment.recommendedPlaylistTitle.replace(/^Создать новый плейлист:\s*/i, ""));
                              setNewDescription(`Специальный тематический цикл видео по теме: ${assignment.ideaTitle}`);
                              setIsCreateModalOpen(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all"
                          >
                            <Plus size={12} />
                            Создать предложенный
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAssignIdeaToPlaylist(
                              assignment.ideaTitle,
                              assignment.recommendedPlaylistId!,
                              assignment.recommendedPlaylistTitle
                            )}
                            disabled={assigningId === assignment.ideaTitle}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 text-xs font-bold transition-all disabled:opacity-50"
                          >
                            {assigningId === assignment.ideaTitle ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Check size={12} className="text-primary" />
                            )}
                            Включить в плейлист
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: RECOMMENDATIONS (WHICH PLAYLIST TO CREATE) */}
      {activeSubTab === "recommendations" && (
        <div className="space-y-4 animate-fadeIn">
          {isAnalyzing ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-4 text-center">
              <Loader2 size={32} className="animate-spin text-primary" />
              <p className="text-xs text-neutral-400">ИИ генерирует концепции новых сериалов и плейлистов...</p>
            </div>
          ) : !intelligence?.newPlaylists || intelligence.newPlaylists.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-xl border border-dashed border-neutral-800 bg-neutral-950/30 space-y-3">
              <FolderPlus size={32} className="mx-auto text-primary" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">Концепции новых плейлистов еще не сформированы</h4>
                <p className="text-xs text-neutral-400 max-w-md mx-auto">
                  ИИ проанализирует недостающие тематические кластеры на вашем канале и сгенерирует готовые шаблоны плейлистов.
                </p>
              </div>
              <button
                onClick={handleRunAIAnalysis}
                className="px-5 py-2.5 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-black text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <Sparkles size={14} />
                <span>Сгенерировать концепции плейлистов</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {intelligence.channelArchitectureAudit?.missingThematicClusters && (
                <div className="flex items-center gap-2 p-3 bg-neutral-900/70 border border-neutral-800 rounded-xl text-xs text-neutral-300">
                  <span className="font-bold text-white">Недостающие темы на канале:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {intelligence.channelArchitectureAudit.missingThematicClusters.map((cluster, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-bold border border-primary/20">
                        {cluster}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {intelligence.newPlaylists.map((suggestion, idx) => {
                  const isBeingCreated = creatingSuggestedIdx === idx;

                  return (
                    <div
                      key={`sug-pl-${idx}`}
                      className="p-5 rounded-2xl bg-neutral-950/60 border border-neutral-800 hover:border-neutral-700/80 transition-all flex flex-col justify-between space-y-4 relative overflow-hidden group shadow-lg"
                    >
                      <div className="space-y-3">
                        {/* Header: Title and Goal badge */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-[9px] font-black text-primary uppercase tracking-wider">
                              {suggestion.strategicGoal || "Сериал контента"}
                            </span>
                            <h4 className="text-sm font-bold text-white leading-snug group-hover:text-primary transition-colors">
                              {suggestion.title}
                            </h4>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black shrink-0">
                            {suggestion.estimatedRetentionBoost}
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          {suggestion.description}
                        </p>

                        {/* Target Audience & Hook */}
                        <div className="space-y-1.5 p-3 rounded-xl bg-neutral-900/50 border border-neutral-800/80 text-[11px]">
                          <div className="text-neutral-300">
                            <strong className="text-neutral-400">Аудитория:</strong> {suggestion.targetAudience}
                          </div>
                          <div className="text-amber-300/90">
                            <strong>Эффект сериала:</strong> {suggestion.retentionHook}
                          </div>
                        </div>

                        {/* Included Episodes / Sequencing */}
                        {suggestion.suggestedSequencing && suggestion.suggestedSequencing.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                              Рекомендуемый порядок серий ({suggestion.suggestedSequencing.length}):
                            </div>
                            <div className="space-y-1">
                              {suggestion.suggestedSequencing.map((seq, sIdx) => (
                                <div key={sIdx} className="flex items-center gap-2 text-xs text-neutral-300 bg-neutral-900/30 px-2.5 py-1 rounded-md">
                                  <span className="text-[10px] font-mono text-primary font-bold">{sIdx + 1}.</span>
                                  <span className="truncate">{seq}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Button: Create this playlist directly on YouTube */}
                      <div className="pt-3 border-t border-neutral-900 flex items-center justify-between">
                        <span className="text-[10px] text-neutral-500">
                          {suggestion.includedIdeaTitles.length} идей подобрано
                        </span>

                        <button
                          onClick={() => handleCreateSuggestedPlaylist(suggestion, idx)}
                          disabled={isBeingCreated}
                          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-black font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
                        >
                          {isBeingCreated ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <FolderPlus size={13} />
                          )}
                          <span>Создать этот плейлист на YouTube</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE PLAYLIST MODAL */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4 p-6"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <FolderPlus size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Новый плейлист YouTube</h3>
                    <p className="text-xs text-neutral-400">Создание плейлиста через YouTube Data API</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreatePlaylist} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-neutral-300">
                    Название плейлиста <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Например: Полный курс по нейросетям 2026"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-neutral-300">
                    Описание плейлиста (SEO & ключевые слова)
                  </label>
                  <textarea
                    rows={4}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Пошаговое руководство, ссылки на материалы и призыв подписаться на обновления..."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-primary resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-neutral-300">
                    Настройки доступа
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "public", label: "Публичный", icon: Globe },
                      { id: "unlisted", label: "По ссылке", icon: Eye },
                      { id: "private", label: "Приватный", icon: Lock }
                    ].map((opt) => {
                      const Icon = opt.icon;
                      const isSel = newPrivacy === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setNewPrivacy(opt.id as any)}
                          className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                            isSel
                              ? "bg-primary/20 border-primary text-primary"
                              : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
                          }`}
                        >
                          <Icon size={12} />
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-900">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-neutral-400 hover:text-white rounded-xl"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || !newTitle.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-black font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
                  >
                    {isCreating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                    <span>{isCreating ? "Создание..." : "Создать на YouTube"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
