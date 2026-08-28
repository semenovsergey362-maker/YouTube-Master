import { logger } from "../config/logger";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Tv, 
  GitFork, 
  Layers, 
  Link2, 
  Sparkles, 
  Copy, 
  Check, 
  PlayCircle, 
  ArrowRight, 
  ArrowLeft, 
  Wand2, 
  Plus, 
  Trash2, 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  RefreshCw, 
  Network, 
  Video, 
  Zap,
  Tag,
  Clock,
  TrendingUp,
  FolderPlus,
  ListPlus
} from 'lucide-react';
import { toast } from 'sonner';
import { copyToClipboard } from '../utils/helpers';
import { useApp } from '../context/AppContext';
import { 
  MiniSeries, 
  SeriesEpisode, 
  generateMiniSeriesTree, 
  clusterIdeasIntoMiniSeries,
  GeneratedIdea,
  generatePlaylistSuggestions,
  ContentPlanItem
} from '../services/geminiService';

interface TopicTreeAndSerializationSectionProps {
  niche: string;
  currentIdeas: (string | GeneratedIdea | ContentPlanItem)[];
  selectedModel?: string;
  onApplyEpisodesToIdeas?: (episodes: SeriesEpisode[]) => void;
  onSelectEpisodeForScript?: (title: string, duration?: string, tone?: string) => void;
}

export const TopicTreeAndSerializationSection: React.FC<TopicTreeAndSerializationSectionProps> = ({
  niche,
  currentIdeas,
  selectedModel,
  onApplyEpisodesToIdeas,
  onSelectEpisodeForScript
}) => {
  const { ideaSeries: seriesList, setIdeaSeries: setSeriesList } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [activeView, setActiveView] = useState<'tree' | 'episodes' | 'create'>('episodes');
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  
  // Playlist names suggestions state
  const [isSuggestingPlaylists, setIsSuggestingPlaylists] = useState(false);
  const [playlistSuggestions, setPlaylistSuggestions] = useState<{
    playlistNames: string[];
    seriesNames: string[];
  } | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newSeriesName, setNewSeriesName] = useState('');

  const addPlaylistName = () => {
    if (!newPlaylistName.trim()) return;
    setPlaylistSuggestions(prev => prev ? {
      ...prev,
      playlistNames: [newPlaylistName.trim(), ...prev.playlistNames]
    } : null);
    setNewPlaylistName('');
  };

  const removePlaylistName = (index: number) => {
    setPlaylistSuggestions(prev => prev ? {
      ...prev,
      playlistNames: prev.playlistNames.filter((_, i) => i !== index)
    } : null);
  };

  const addSeriesName = () => {
    if (!newSeriesName.trim()) return;
    setPlaylistSuggestions(prev => prev ? {
      ...prev,
      seriesNames: [newSeriesName.trim(), ...prev.seriesNames]
    } : null);
    setNewSeriesName('');
  };

  const removeSeriesName = (index: number) => {
    setPlaylistSuggestions(prev => prev ? {
      ...prev,
      seriesNames: prev.seriesNames.filter((_, i) => i !== index)
    } : null);
  };
  
  // Topic Tree Generator Form state
  const [customTopic, setCustomTopic] = useState('');
  const [episodeCount, setEpisodeCount] = useState<number>(4);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClustering, setIsClustering] = useState(false);

  // Teaser Script Copy feedback state
  const [copiedTeaserId, setCopiedTeaserId] = useState<string | null>(null);

  // Active Series selection
  const activeSeries = seriesList.find(s => s.id === selectedSeriesId) || seriesList[0] || null;

  // Handle Cluster Existing Ideas
  const handleClusterIdeas = async () => {
    if (!currentIdeas || currentIdeas.length === 0) {
      toast.error('У вас нет идей в списке для группировки. Сначала сгенерируйте идеи или введите тему.');
      return;
    }

    setIsClustering(true);
    toast.info('Анализируем идеи и объединяем их в логические мини-сериалы с перекрестными ссылками...');

    try {
      const result = await clusterIdeasIntoMiniSeries(currentIdeas, niche, { model: selectedModel });
      if (result && result.length > 0) {
        setSeriesList(prev => {
          const existingTitles = new Set((prev || []).map(s => s.seriesTitle.trim().toLowerCase()));
          const filtered = result.filter(s => !existingTitles.has(s.seriesTitle.trim().toLowerCase()));
          return [...filtered, ...(prev || [])];
        });
        setSelectedSeriesId(result[0].id);
        setActiveView('episodes');
        toast.success(`Успешно создано ${result.length} мини-сериала из ваших идей!`);
      } else {
        toast.error('Не удалось сгруппировать идеи. Попробуйте еще раз.');
      }
    } catch (error) {
      logger.error(error);
      toast.error('Ошибка при объединении идей в мини-сериалы');
    } finally {
      setIsClustering(false);
    }
  };

  // Handle Generate New Tree/Series
  const handleGenerateTree = async () => {
    const query = customTopic.trim() || niche;
    if (!query) {
      toast.error('Укажите тему для генерации мини-сериала');
      return;
    }

    setIsGenerating(true);
    toast.info(`Генерируем Дерево Тем и мини-сериал из ${episodeCount} выпусков...`);

    try {
      const result = await generateMiniSeriesTree(query, niche, episodeCount, { model: selectedModel });
      if (result && result.length > 0) {
        setSeriesList(prev => {
          const existingTitles = new Set((prev || []).map(s => s.seriesTitle.trim().toLowerCase()));
          const filtered = result.filter(s => !existingTitles.has(s.seriesTitle.trim().toLowerCase()));
          return [...filtered, ...(prev || [])];
        });
        setSelectedSeriesId(result[0].id);
        setActiveView('episodes');
        setCustomTopic('');
        toast.success(`Сгенерировано ${result.length} мини-сериала по теме "${query}"!`);
      } else {
        toast.error('Не удалось сгенерировать мини-сериал');
      }
    } catch (error) {
      logger.error(error);
      toast.error('Ошибка при генерации мини-сериала');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyTeaser = (script: string, id: string) => {
    copyToClipboard(script);
    setCopiedTeaserId(id);
    toast.success('Сценарий анонса-тизера скопирован в буфер обмена!');
    setTimeout(() => setCopiedTeaserId(null), 2500);
  };

  const handleApplySeriesToIdeas = (series: MiniSeries) => {
    if (onApplyEpisodesToIdeas) {
      onApplyEpisodesToIdeas(series.episodes);
      toast.success(`Все ${series.episodes.length} выпусков из "${series.seriesTitle}" добавлены в список идей!`);
    }
  };

  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);

  const handleCreateYouTubePlaylist = async (series: MiniSeries) => {
    setIsCreatingPlaylist(true);
    const toastId = toast.loading(`Создание плейлиста "${series.seriesTitle}" на YouTube...`);
    try {
      const res = await fetch("/api/youtube/create-playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: series.seriesTitle,
          description: series.description || `Плейлист серий по теме: ${series.topicBranch}`
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.isDemo) {
          toast.success(`Плейлист "${series.seriesTitle}" успешно создан в демонстрационном режиме!`, { id: toastId });
        } else {
          toast.success(`Плейлист "${series.seriesTitle}" успешно создан на вашем YouTube-канале!`, { id: toastId });
        }
      } else {
        throw new Error("Не удалось создать плейлист");
      }
    } catch (e: any) {
      logger.error(e);
      toast.error("Ошибка при создании плейлиста: " + e.message, { id: toastId });
    } finally {
      setIsCreatingPlaylist(false);
    }
  };

  const handleSuggestPlaylists = async () => {
    setIsSuggestingPlaylists(true);
    const toastId = toast.loading('Генерируем названия плейлистов и серий...');
    try {
      const result = await generatePlaylistSuggestions(niche, currentIdeas, { model: selectedModel });
      if (result) {
        setPlaylistSuggestions(prev => {
          if (!prev) return result;
          const existingPlaylists = new Set((prev.playlistNames || []).map(p => p.trim().toLowerCase()));
          const newPlaylists = (result.playlistNames || []).filter(p => !existingPlaylists.has(p.trim().toLowerCase()));

          const existingSeries = new Set((prev.seriesNames || []).map(s => s.trim().toLowerCase()));
          const newSeries = (result.seriesNames || []).filter(s => !existingSeries.has(s.trim().toLowerCase()));

          return {
            playlistNames: [...newPlaylists, ...(prev.playlistNames || [])],
            seriesNames: [...newSeries, ...(prev.seriesNames || [])]
          };
        });
        setShowSuggestions(true);
        toast.success('Названия предложены!', { id: toastId });
      } else {
        toast.error('Не удалось сгенерировать названия', { id: toastId });
      }
    } catch (error) {
      logger.error(error);
      toast.error('Ошибка при генерации названий', { id: toastId });
    } finally {
      setIsSuggestingPlaylists(false);
    }
  };

  return (
    <div className="bg-surface/90 border border-emerald-500/20 rounded-2xl p-4 sm:p-5 md:p-6 shadow-xl space-y-6 text-white relative overflow-hidden w-full max-w-full min-w-0">
      {/* Decorative Gradient Background */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* Top Header with Toggle */}
      <div className="flex items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
            <Tv size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex flex-wrap items-center gap-2">
              Сериализация и Дерево Тем
              <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wide whitespace-nowrap">
                Series & Tree
              </span>
            </h3>
            <p className="text-xs text-neutral-400">
              Объединяйте идеи в лонггрид-сериалы со сквозными ссылками и тизерами.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold transition-all border border-neutral-700/60 cursor-pointer shrink-0 whitespace-nowrap"
        >
          {isOpen ? (
            <>
              Свернуть <ChevronDown size={16} className="rotate-180" />
            </>
          ) : (
            <>
              Развернуть <ChevronDown size={16} />
            </>
          )}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="topic-tree-accordion-content"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-6 overflow-hidden"
          >
            {/* Header / Actions */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-border/60 pb-5">
              <div className="flex items-center gap-3">
                <p className="text-xs text-neutral-400 max-w-sm">
                  Иерархическое распределение контента: объединяйте ролики в мини-сериалы 3–5 выпусков для удержания аудитории.
                </p>
              </div>

              {/* View mode toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 bg-neutral-900/80 border border-border/80 p-1.5 rounded-xl shrink-0">
                <button
                  onClick={() => setActiveView('episodes')}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all ${
                    activeView === 'episodes'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Layers size={14} />
                  <span>Эпизоды ({seriesList.length})</span>
                </button>

                <button
                  onClick={() => setActiveView('tree')}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all ${
                    activeView === 'tree'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <GitFork size={14} />
                  <span>Дерево Тем</span>
                </button>

                <button
                  onClick={() => setActiveView('create')}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all ${
                    activeView === 'create'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Plus size={14} />
                  <span>Новый Сериал</span>
                </button>
              </div>
            </div>

            {/* Action Bar: Clustering & Quick Generation Buttons & Playlist Suggestion */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={handleClusterIdeas}
                disabled={isClustering || isGenerating}
                className="flex items-center justify-center gap-2.5 px-4 py-3 bg-gradient-to-r from-emerald-600/30 to-teal-600/30 hover:from-emerald-600/40 hover:to-teal-600/40 border border-emerald-500/40 text-emerald-200 rounded-xl font-bold text-[10px] sm:text-xs transition-all shadow-md hover:shadow-emerald-500/10 disabled:opacity-50 cursor-pointer group"
              >
                {isClustering ? (
                  <RefreshCw size={16} className="animate-spin text-emerald-400" />
                ) : (
                  <Network size={16} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                )}
                <span>Группировать в Сериалы</span>
              </button>

            </div>

            {/* Playlist and Series Suggestions View */}
            <AnimatePresence>
              {showSuggestions && playlistSuggestions && (
                <motion.div
                  key="topic-tree-suggestions-panel"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 sm:p-5 relative"
                >
                  <button 
                    onClick={() => setShowSuggestions(false)}
                    className="absolute top-4 right-4 p-1 hover:bg-emerald-500/10 rounded-lg text-neutral-500 hover:text-emerald-400 transition-all cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-4">
                        <FolderPlus size={14} />
                        Идеи для плейлистов
                      </div>
                      
                      <div className="flex gap-2 mb-3">
                        <input
                          type="text"
                          value={newPlaylistName}
                          onChange={(e) => setNewPlaylistName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addPlaylistName()}
                          placeholder="Новый плейлист..."
                          className="flex-1 px-3 py-1.5 bg-black/40 border border-white/5 focus:border-emerald-500/50 rounded-lg text-xs text-white placeholder:text-neutral-600 outline-none transition-all"
                        />
                        <button
                          onClick={addPlaylistName}
                          className="p-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-all cursor-pointer"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                        {playlistSuggestions.playlistNames.map((name, i) => (
                          <div key={`pl-name-item-${i}`} className="flex items-center justify-between group bg-black/20 p-2.5 rounded-lg border border-white/5 hover:border-emerald-500/30 transition-all">
                            <span className="text-xs text-neutral-300 group-hover:text-white transition-colors">{name}</span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <button 
                                onClick={() => {
                                  copyToClipboard(name);
                                  toast.success('Название скопировано!');
                                }}
                                className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-md hover:bg-emerald-500/20 transition-all cursor-pointer"
                                title="Копировать"
                              >
                                <Copy size={12} />
                              </button>
                              <button 
                                onClick={() => removePlaylistName(i)}
                                className="p-1.5 bg-red-500/10 text-red-400 rounded-md hover:bg-red-500/20 transition-all cursor-pointer"
                                title="Удалить"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-4">
                        <Tv size={14} />
                        Названия для серий
                      </div>

                      <div className="flex gap-2 mb-3">
                        <input
                          type="text"
                          value={newSeriesName}
                          onChange={(e) => setNewSeriesName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addSeriesName()}
                          placeholder="Новая серия..."
                          className="flex-1 px-3 py-1.5 bg-black/40 border border-white/5 focus:border-emerald-500/50 rounded-lg text-xs text-white placeholder:text-neutral-600 outline-none transition-all"
                        />
                        <button
                          onClick={addSeriesName}
                          className="p-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-all cursor-pointer"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                        {playlistSuggestions.seriesNames.map((name, i) => (
                          <div key={`series-name-item-${i}`} className="flex items-center justify-between group bg-black/20 p-2.5 rounded-lg border border-white/5 hover:border-emerald-500/30 transition-all">
                            <span className="text-xs text-neutral-300 group-hover:text-white transition-colors">{name}</span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <button 
                                onClick={() => {
                                  copyToClipboard(name);
                                  toast.success('Название скопировано!');
                                }}
                                className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-md hover:bg-emerald-500/20 transition-all cursor-pointer"
                                title="Копировать"
                              >
                                <Copy size={12} />
                              </button>
                              <button 
                                onClick={() => removeSeriesName(i)}
                                className="p-1.5 bg-red-500/10 text-red-400 rounded-md hover:bg-red-500/20 transition-all cursor-pointer"
                                title="Удалить"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Content Area based on Active View */}
            <AnimatePresence mode="wait">
        {activeView === 'create' && (
          <motion.div
            key="create-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-5 rounded-2xl bg-neutral-900/90 border border-emerald-500/20 space-y-4"
          >
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
              <Sparkles size={18} />
              <span>Конструктор Дерева Тем и Мини-Сериала</span>
            </div>
            
            <p className="text-xs text-neutral-400 leading-relaxed">
              Укажите ключевую тему или проблему. Система развернет ее в структурированное дерево тем и сформирует полноценный мини-сериал из 3–5 взаимосвязанных выпусков с клиффхэнгерами и готовыми анонсами.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1">
                  Тема мини-сериала / Дерева Тем
                </label>
                <input
                  type="text"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder={`Например: Секреты монтажа в Premiere Pro или Пошаговая монетизация... (По умолчанию: ${niche || 'Текущая ниша'})`}
                  className="w-full px-4 py-2.5 bg-black/40 border border-border/80 focus:border-emerald-500 rounded-xl text-sm text-white placeholder:text-neutral-600 outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    Количество выпусков в сериале (3–5)
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[3, 4, 5].map((num, nIdx) => (
                      <button
                        key={`num-${num}-${nIdx}`}
                        type="button"
                        onClick={() => setEpisodeCount(num)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          episodeCount === num
                            ? 'bg-emerald-500 text-black border-emerald-400 shadow-sm'
                            : 'bg-black/40 text-neutral-400 border-border hover:text-white'
                        }`}
                      >
                        {num} выпусков
                      </button>
                    ))}
                  </div>
                </div>

                <div className="shrink-0 flex items-end pt-5">
                  <button
                    onClick={handleGenerateTree}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
                  >
                    {isGenerating ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <Wand2 size={16} />
                    )}
                    <span>Создать Сериал</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* EPISODES & TEASERS VIEW */}
        {activeView === 'episodes' && (
          <motion.div
            key="episodes-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {seriesList.length === 0 ? (
              <div className="text-center py-12 px-4 bg-neutral-900/50 border border-border/60 rounded-2xl space-y-4">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Tv size={28} />
                </div>
                <h4 className="text-base font-bold text-white">У вас еще нет созданных мини-сериалов</h4>
                <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
                  Нажмите кнопку выше, чтобы автоматически объединить ваши имеющиеся идеи в логические мини-сериалы из 3–5 выпусков или сгенерировать новое Дерево Тем по любому направлению.
                </p>
                <button
                  onClick={handleClusterIdeas}
                  disabled={isClustering}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
                >
                  {isClustering ? 'Анализируем идеи...' : 'Сгруппировать идеи в Мини-Сериалы'}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Series Tabs Switcher if multiple */}
                {seriesList.length > 1 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {seriesList.map((series, idx) => (
                      <button
                        key={`sTab-${series.id ?? 'series'}-${idx}`}
                        onClick={() => setSelectedSeriesId(series.id)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border whitespace-nowrap transition-all ${
                          (selectedSeriesId === series.id || (!selectedSeriesId && idx === 0))
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                            : 'bg-neutral-900/60 text-neutral-400 border-border hover:text-white'
                        }`}
                      >
                        <Tv size={14} className="text-emerald-400" />
                        <span>{series.seriesTitle}</span>
                        <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded text-[10px]">
                          {series.episodes.length} сер.
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Active Series Header Card */}
                {activeSeries && (
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-emerald-950/20 border border-emerald-500/30 space-y-3 relative overflow-hidden">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Дерево Ветки: {activeSeries.topicBranch}
                          </span>
                          <span className="text-xs text-neutral-500">|</span>
                          <span className="text-xs text-neutral-400">
                            {activeSeries.episodes.length} взаимосвязанных выпуска
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-white mt-1">
                          {activeSeries.seriesTitle}
                        </h3>
                        {activeSeries.description && (
                          <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                            {activeSeries.description}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {onApplyEpisodesToIdeas && (
                          <button
                            onClick={() => handleApplySeriesToIdeas(activeSeries)}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            <Plus size={14} />
                            <span>Добавить серии в мои идеи</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleCreateYouTubePlaylist(activeSeries)}
                          disabled={isCreatingPlaylist}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                        >
                          <FolderPlus size={14} />
                          <span>{isCreatingPlaylist ? "Создание..." : "Создать плейлист на YouTube"}</span>
                        </button>
                      </div>
                    </div>

                    {activeSeries.targetAudienceGoal && (
                      <div className="pt-2 border-t border-white/5 flex items-center gap-2 text-xs text-emerald-300/80 italic">
                        <Zap size={14} className="text-emerald-400 shrink-0" />
                        <span>Результат просмотра мини-сериала: {activeSeries.targetAudienceGoal}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Episodes Timeline / Cards List */}
                {activeSeries && (
                  <div className="space-y-5">
                    {activeSeries.episodes.map((episode, idx) => {
                      const isFirst = idx === 0;
                      const isLast = idx === activeSeries.episodes.length - 1;
                      const teaserId = `${activeSeries.id}-ep-${episode.episodeNumber}`;

                      return (
                        <div key={`series-timeline-ep-${activeSeries.id}-${episode.episodeNumber || idx}-${idx}`} className="relative pl-6 md:pl-8 border-l-2 border-emerald-500/30 space-y-4">
                          {/* Timeline Episode Node Indicator */}
                          <div className="absolute -left-[17px] top-4 w-8 h-8 rounded-full bg-neutral-900 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 text-xs font-bold shadow-lg shadow-emerald-500/20">
                            {episode.episodeNumber}
                          </div>

                          <div className="p-5 rounded-2xl bg-neutral-900/90 border border-border/80 hover:border-emerald-500/40 transition-all space-y-4">
                            {/* Episode Title & Metadata */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-extrabold uppercase text-emerald-400 tracking-wider">
                                    Серия {episode.episodeNumber} из {activeSeries.episodes.length}
                                  </span>
                                  {episode.duration && (
                                    <span className="px-2 py-0.5 rounded bg-black/40 border border-white/10 text-[10px] text-neutral-400 flex items-center gap-1">
                                      <Clock size={10} /> {episode.duration}
                                    </span>
                                  )}
                                  {episode.viral_potential && (
                                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold flex items-center gap-1">
                                      <TrendingUp size={10} /> {episode.viral_potential}
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-base font-bold text-white">
                                  {episode.title}
                                </h4>
                              </div>

                              {/* Script Trigger */}
                              {onSelectEpisodeForScript && (
                                <button
                                  onClick={() => onSelectEpisodeForScript(episode.title, episode.duration, episode.tone)}
                                  className="self-start md:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                >
                                  <FileText size={14} />
                                  <span>Написать сценарий</span>
                                </button>
                              )}
                            </div>

                            {/* Description */}
                            {episode.description && (
                              <p className="text-xs text-neutral-300 leading-relaxed">
                                {episode.description}
                              </p>
                            )}

                            {/* Cross-References (Перекрестные Ссылки) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                              {/* Backward Link */}
                              <div className="p-3 rounded-xl bg-black/40 border border-border/60 space-y-1">
                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-400">
                                  <ArrowLeft size={13} className="text-amber-400 shrink-0" />
                                  <span>Связка с прошлым выпуском (Back-link)</span>
                                </div>
                                <p className="text-xs text-neutral-300 leading-snug">
                                  {episode.previousBridge || (isFirst ? 'Первый вводный ролик серии (устанавливает контекст плейлиста).' : 'Перекликается с выводами предыдущей серии.')}
                                </p>
                              </div>

                              {/* Forward Link */}
                              <div className="p-3 rounded-xl bg-black/40 border border-border/60 space-y-1">
                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-400">
                                  <ArrowRight size={13} className="text-teal-400 shrink-0" />
                                  <span>Связка со следующим выпуском (Forward-link)</span>
                                </div>
                                <p className="text-xs text-neutral-300 leading-snug">
                                  {episode.nextBridge || (isLast ? 'Завершающий кульминационный выпуск сериала с итоговым гайдом.' : 'Подготавливает интерес к следующей теме.')}
                                </p>
                              </div>
                            </div>

                            {/* Auto-generated Teaser Script Panel */}
                            {!isLast && episode.nextTeaserScript && (
                              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/30 via-neutral-900 to-black/60 border border-emerald-500/30 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Zap size={14} className="text-emerald-400 fill-emerald-400/20" />
                                    <span className="text-xs font-bold text-emerald-300">
                                      ⚡ Авто-Тизер и Клиффхэнгер для серии {episode.episodeNumber + 1} (15–30 сек в конце)
                                    </span>
                                    {episode.teaserHookType && (
                                      <span className="px-2 py-0.2 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                                        {episode.teaserHookType}
                                      </span>
                                    )}
                                  </div>

                                  <button
                                    onClick={() => handleCopyTeaser(episode.nextTeaserScript, teaserId)}
                                    className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                  >
                                    {copiedTeaserId === teaserId ? (
                                      <>
                                        <Check size={12} className="text-emerald-400" />
                                        <span>Скопировано!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy size={12} />
                                        <span>Скопировать тизер</span>
                                      </>
                                    )}
                                  </button>
                                </div>

                                <p className="text-xs text-neutral-200 font-mono bg-black/50 p-3 rounded-lg border border-white/5 leading-relaxed whitespace-pre-line">
                                  "{episode.nextTeaserScript}"
                                </p>

                                {episode.ctaToNextEpisode && (
                                  <div className="text-[11px] text-emerald-400/90 font-medium pt-1 flex items-center gap-1.5">
                                    <PlayCircle size={12} />
                                    <span>CTA заставка: {episode.ctaToNextEpisode}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* TOPIC TREE GRAPH MAP VIEW */}
        {activeView === 'tree' && (
          <motion.div
            key="tree-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {seriesList.length === 0 ? (
              <div className="text-center py-12 px-4 bg-neutral-900/50 border border-border/60 rounded-2xl">
                <p className="text-xs text-neutral-400">Сначала сгенерируйте мини-сериал для отображения Дерева Тем.</p>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-neutral-950 border border-emerald-500/20 space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <GitFork size={16} className="text-emerald-400" />
                      Интерактивная карта Дерева Тем
                    </h4>
                    <p className="text-xs text-neutral-400">
                      Иерархическое дерево: Ниша ➔ Корневая Ветка ➔ Эпизоды сериала со сквозными мостами
                    </p>
                  </div>
                </div>

                {/* Tree Visual Architecture */}
                <div className="w-full min-w-0">
                  <div className="w-full space-y-8 py-4 overflow-hidden">
                  {/* Root Node */}
                  <div className="flex justify-center">
                    <div className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl font-extrabold text-xs text-black shadow-lg shadow-emerald-500/20 border border-emerald-300 text-center">
                      🎯 Корневой узловой центр: {niche || 'YouTube Канал'}
                    </div>
                  </div>

                  {/* Branch Lines to Series */}
                  <div className="w-0.5 h-6 bg-emerald-500/40 mx-auto" />

                  {seriesList.map((series, idx) => (
                    <div key={`sTree-${series.id ?? 'series'}-${idx}`} className="space-y-4 p-4 rounded-xl bg-neutral-900/80 border border-emerald-500/30">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Tv size={16} className="text-emerald-400" />
                          <span className="font-bold text-sm text-white">{series.seriesTitle}</span>
                        </div>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold whitespace-nowrap">
                          Ветка: {series.topicBranch}
                        </span>
                      </div>

                      {/* Episode Nodes Flow */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 py-2">
                        {series.episodes.map((ep, eIdx) => (
                          <div key={`episode-${series.id || 'series'}-${ep.episodeNumber || eIdx}-${eIdx}`} className="relative group">
                            <div className="h-full p-3 rounded-lg bg-black/60 border border-emerald-500/20 hover:border-emerald-400 transition-all text-left space-y-1">
                              <span className="text-[9px] font-bold text-emerald-400 uppercase">
                                Эпизод {ep.episodeNumber}
                              </span>
                              <h5 className="text-xs font-bold text-white line-clamp-2 leading-tight group-hover:text-emerald-300 transition-colors">
                                {ep.title}
                              </h5>
                              <p className="text-[10px] text-neutral-400 line-clamp-1">
                                {ep.duration} | {ep.viral_potential}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
