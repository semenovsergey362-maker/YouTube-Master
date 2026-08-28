import { logger } from "../config/logger";
import React, { useState, useEffect } from 'react';
import {
  Search,
  Video,
  ExternalLink,
  Plus,
  Check,
  Loader2,
  Filter,
  Key,
  Play,
  Pause,
  Film,
  Sparkles,
  Info,
  X,
  Copy
} from 'lucide-react';
import {
  searchPexelsVideos,
  extractKeywordsForStockSearch,
  extractSuggestedVisualTags,
  getPexelsApiKey,
  savePexelsApiKey,
  PexelsVideo
} from '../services/pexelsService';
import { translateVisualPromptToStockKeywords } from '../services/geminiService';
import { toast } from 'sonner';


interface PexelsBrollWidgetProps {
  sceneIdx?: number;
  sceneTitle?: string;
  sceneVisuals?: string;
  sceneText?: string;
  attachedBrollUrl?: string;
  attachedBrollList?: Array<{
    id: number | string;
    url: string;
    previewImg?: string;
    duration?: number;
    pexelsUrl?: string;
    title?: string;
  }>;
  onSelectVideo?: (videoData: {
    id: number;
    videoUrl: string; // Direct mp4 link
    pexelsUrl: string; // Web page
    previewImg: string;
    duration: number;
    width: number;
    height: number;
    author: string;
  }) => void;
  onRemoveBroll?: (brollId: number | string) => void;
  isCompactMode?: boolean;
}

export const PexelsBrollWidget: React.FC<PexelsBrollWidgetProps> = ({
  sceneIdx,
  sceneTitle,
  sceneVisuals,
  sceneText,
  attachedBrollUrl,
  attachedBrollList = [],
  onSelectVideo,
  onRemoveBroll,
  isCompactMode = false
}) => {
  const [query, setQuery] = useState<string>('');
  const [orientation, setOrientation] = useState<'all' | 'portrait' | 'landscape'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [videos, setVideos] = useState<PexelsVideo[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hoveredVideoId, setHoveredVideoId] = useState<number | null>(null);
  const [activePlayingId, setActivePlayingId] = useState<number | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);
  const [customKeyInput, setCustomKeyInput] = useState<string>(getPexelsApiKey());
  const [addedVideoIds, setAddedVideoIds] = useState<Set<number>>(new Set());

  const [customUrlInput, setCustomUrlInput] = useState<string>('');

  const [lastSearchedIdx, setLastSearchedIdx] = useState<number | null>(null);

  // Set suggested search query on mount or scene change with auto-fetching on switch
  useEffect(() => {
    const suggestedQuery = extractKeywordsForStockSearch(sceneVisuals || '', sceneTitle || sceneText || '');
    setQuery(suggestedQuery);

    // Auto-search only on mount or when switching sceneIndex to prevent searching on every keystroke
    if (sceneIdx !== undefined && sceneIdx !== lastSearchedIdx && suggestedQuery) {
      setLastSearchedIdx(sceneIdx);
      handleSearch(suggestedQuery, orientation);
    }
  }, [sceneIdx, sceneVisuals, sceneTitle]);

  const handleAttachCustomUrl = () => {
    if (!customUrlInput || !customUrlInput.trim()) {
      toast.error('Введите URL ссылку на B-Roll видео');
      return;
    }
    const cleanUrl = customUrlInput.trim();
    if (onSelectVideo) {
      onSelectVideo({
        id: Date.now(),
        videoUrl: cleanUrl,
        pexelsUrl: cleanUrl,
        previewImg: '',
        duration: 0,
        width: 1920,
        height: 1080,
        author: 'Внешняя ссылка'
      });
    }
    setCustomUrlInput('');
    toast.success('B-Roll ссылка прикреплена к кадру!');
  };

  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [isAiOptimizing, setIsAiOptimizing] = useState<boolean>(false);

  const suggestedTags = extractSuggestedVisualTags(sceneVisuals || '', sceneTitle || sceneText || '');

  const handleAiOptimizeQuery = async () => {
    setIsAiOptimizing(true);
    try {
      const aiQuery = await translateVisualPromptToStockKeywords(sceneVisuals || '', sceneText || '');
      if (aiQuery) {
        setQuery(aiQuery);
        toast.success(`ИИ сформировал точный запрос: "${aiQuery}"`);
        handleSearch(aiQuery, orientation);
      } else {
        toast.info('ИИ оставил текущий запрос');
      }
    } catch (e) {
      toast.error('Не удалось оптимизировать запрос через ИИ');
    } finally {
      setIsAiOptimizing(false);
    }
  };

  const handleSearch = async (searchQuery: string = query, currentOrientation = orientation) => {

    if (!searchQuery || !searchQuery.trim()) {
      toast.error('Введите поисковый запрос для B-Roll видео');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setFallbackNotice(null);

    try {
      const response = await searchPexelsVideos(searchQuery, {
        orientation: currentOrientation,
        perPage: 12
      });

      setVideos(response.videos || []);
      if (response.isFallback) {
        setFallbackNotice(response.message || 'Используется демонстрационный B-Roll каталог');
      }

      if (!response.videos || response.videos.length === 0) {
        setErrorMsg(`По запросу "${searchQuery}" видеостоков не найдено. Попробуйте изменить ключевые слова.`);
      }
    } catch (err: any) {
      logger.error('Error fetching Pexels videos:', err);
      setErrorMsg('Не удалось загрузить видео. Проверьте ключевые слова или настройки сети.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveApiKey = () => {
    savePexelsApiKey(customKeyInput);
    setShowApiKeyModal(false);
    toast.success('API ключ Pexels сохранен!');
    handleSearch();
  };

  const handleAddVideo = (vid: PexelsVideo) => {
    // Pick highest quality standard mp4 video file
    const bestFile = vid.video_files.find(f => f.quality === 'hd') || vid.video_files[0];
    const directVideoUrl = bestFile?.link || vid.url;

    if (onSelectVideo) {
      onSelectVideo({
        id: vid.id,
        videoUrl: directVideoUrl,
        pexelsUrl: vid.url,
        previewImg: vid.image,
        duration: vid.duration,
        width: vid.width,
        height: vid.height,
        author: vid.user.name
      });
    }

    setAddedVideoIds(prev => new Set(prev).add(vid.id));
    toast.success(`B-Roll видео от ${vid.user.name} добавлено в Кадр ${sceneIdx !== undefined ? sceneIdx + 1 : ''}!`);
  };

  return (
    <div className="bg-neutral-950/90 border border-neutral-800 rounded-2xl p-4 space-y-3.5 shadow-xl transition-all">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Film size={15} />
          </div>
          <div>
            <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Виджет поиска B-Roll видеостоков (Pexels API)</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full border border-emerald-500/30 font-mono">
                Бесплатно
              </span>
            </h5>
            <p className="text-[10px] text-neutral-400">
              Находите кадры по визуальному контексту сцены и прикрепляйте к монтажному листу
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleAiOptimizeQuery}
            disabled={isAiOptimizing || isLoading}
            className="px-2.5 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title="Точный перевод и подбор B-Roll ключевых слов через Gemini ИИ"
          >
            {isAiOptimizing ? (
              <Loader2 size={11} className="animate-spin text-purple-400" />
            ) : (
              <Sparkles size={11} className="text-purple-400" />
            )}
            <span>🤖 ИИ-Точный запрос</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const suggested = extractKeywordsForStockSearch(sceneVisuals || '', sceneTitle || sceneText || '');
              setQuery(suggested);
              handleSearch(suggested, orientation);
            }}
            className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
            title="Автоматически подобрать видео под визуальное описание кадра"
          >
            <Film size={11} />
            <span>⚡ По визуалу</span>
          </button>

          <button
            type="button"
            onClick={() => setShowApiKeyModal(true)}
            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-all cursor-pointer"
            title="Настройки Pexels API ключа"
          >
            <Key size={13} />
          </button>
        </div>
      </div>

      {/* Custom URL Insertion & External Quick Links */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-neutral-900/60 p-2 rounded-xl border border-neutral-800/80 text-[11px]">
        <div className="flex-1 min-w-[220px] flex items-center gap-1.5">
          <input
            type="url"
            value={customUrlInput}
            onChange={(e) => setCustomUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAttachCustomUrl();
              }
            }}
            placeholder="Вставьте готовую ссылку на видео (Pexels, YouTube, Google Drive)..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500/50"
          />
          <button
            type="button"
            onClick={handleAttachCustomUrl}
            className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg font-bold text-xs shrink-0 cursor-pointer flex items-center gap-1"
          >
            <Plus size={11} />
            <span>Прикрепить</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href={`https://www.pexels.com/search/videos/${encodeURIComponent(query || 'cinematic')}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2 py-1 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
            title="Открыть Pexels.com в новой вкладке с этим запросом"
          >
            <span>Pexels.com ↗</span>
          </a>
          <a
            href={`https://pixabay.com/videos/search/${encodeURIComponent(query || 'cinematic')}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2 py-1 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
            title="Открыть Pixabay Videos в новой вкладке"
          >
            <span>Pixabay ↗</span>
          </a>
        </div>
      </div>

      {/* Search Bar & Filters */}
      <div className="space-y-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSearch(query, orientation);
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Введите поисковые теги на русском или английском (например: девушка за ноутбуком, coffee, city)..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-8 pr-8 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500/50 font-sans"
            />
            <Search size={13} className="absolute left-2.5 top-2.5 text-neutral-500" />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-2 text-neutral-500 hover:text-white cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 shadow-md shadow-emerald-500/10"
          >
            {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
            <span>Искать</span>
          </button>
        </form>

        {/* Quick Tags Chips */}
        {suggestedTags && suggestedTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 text-[10px]">
            <span className="text-neutral-500 font-medium mr-1">⚡ Теги кадра:</span>
            {suggestedTags.map((t, idx) => (
              <button
                key={`sug-tag-${t.tag}-${idx}`}
                type="button"
                onClick={() => {
                  setQuery(t.search);
                  handleSearch(t.search, orientation);
                }}
                className={`px-2 py-0.5 rounded-lg border text-[10px] cursor-pointer transition-all ${
                  query === t.search
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                    : 'bg-neutral-900/80 hover:bg-neutral-800 border-neutral-800 text-neutral-300 hover:text-white'
                }`}
              >
                #{t.tag}
              </button>
            ))}
          </div>
        )}


        {/* Orientation Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
          <div className="flex items-center gap-1 text-neutral-400">
            <Filter size={11} className="text-neutral-500" />
            <span>Формат видео:</span>
            <div className="flex items-center gap-1 ml-1">
              {[
                { id: 'all', label: 'Все' },
                { id: 'portrait', label: '📱 Вертикальные (Shorts/Reels 9:16)' },
                { id: 'landscape', label: '🖥️ Горизонтальные (16:9)' },
              ].map((item, idx) => (
                <button
                  key={`broll-search-${item.id ?? "item"}-${idx}`}
                  type="button"
                  onClick={() => {
                    const newOrient = item.id as any;
                    setOrientation(newOrient);
                    handleSearch(query, newOrient);
                  }}
                  className={`px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                    orientation === item.id
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                      : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {fallbackNotice && (
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-lg px-2.5 py-1.5 text-[10px] text-amber-300 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <Info size={12} className="text-amber-400 shrink-0" />
              <span>{fallbackNotice}</span>
            </span>
            <button
              type="button"
              onClick={() => setShowApiKeyModal(true)}
              className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded border border-amber-500/40 font-bold text-[9px] shrink-0"
            >
              + Ключ Pexels
            </button>
          </div>
        )}
      </div>

      {/* Currently Attached B-Roll Videos Display (if any) */}
      {(attachedBrollList.length > 0 || attachedBrollUrl) && (
        <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-2.5 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-bold text-emerald-300">
            <span className="flex items-center gap-1">
              <Check size={12} className="text-emerald-400" />
              Прикрепленные B-Roll к Кадру #{sceneIdx !== undefined ? sceneIdx + 1 : ''}:
            </span>
            <span className="text-neutral-400 font-normal">
              {attachedBrollList.length > 0 ? `${attachedBrollList.length} видео` : '1 видео'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {attachedBrollList.length > 0 ? (
              attachedBrollList.map((item, idx) => (
                <div key={`att-broll-${item.id ?? 'item'}-${idx}`} className="flex items-center justify-between gap-2 bg-neutral-900/90 border border-neutral-800 p-2 rounded-lg text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    {item.previewImg && (
                      <img src={item.previewImg} alt="B-Roll" className="w-10 h-7 object-cover rounded border border-neutral-800 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-neutral-200 truncate">{item.title || `B-Roll Video #${idx + 1}`}</p>
                      {item.duration && <p className="text-[9px] text-neutral-400">{item.duration} сек</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white"
                      title="Открыть видео"
                    >
                      <ExternalLink size={10} />
                    </a>
                    {onRemoveBroll && (
                      <button
                        onClick={() => onRemoveBroll(item.id)}
                        className="p-1 rounded bg-neutral-800 hover:bg-red-500/20 text-neutral-400 hover:text-red-400"
                        title="Удалить прикрепление"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : attachedBrollUrl ? (
              <div className="flex items-center justify-between gap-2 bg-neutral-900/90 border border-neutral-800 p-2 rounded-lg text-xs col-span-2">
                <span className="text-[10px] text-neutral-300 truncate font-mono">{attachedBrollUrl}</span>
                <a
                  href={attachedBrollUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-emerald-400 shrink-0 flex items-center gap-1 text-[10px] font-bold"
                >
                  <ExternalLink size={10} />
                  <span>Просмотр</span>
                </a>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Search Results Grid */}
      {isLoading ? (
        <div className="py-8 text-center space-y-2">
          <Loader2 size={24} className="animate-spin text-emerald-400 mx-auto" />
          <p className="text-xs text-neutral-400">Ищем стоковые видео на Pexels по запросу "{query}"...</p>
        </div>
      ) : errorMsg ? (
        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl text-center space-y-2">
          <Info size={18} className="text-amber-400 mx-auto" />
          <p className="text-xs text-neutral-300">{errorMsg}</p>
          <div className="flex justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setQuery('nature cinematic');
                handleSearch('nature cinematic');
              }}
              className="text-[10px] px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg border border-neutral-700"
            >
              Искать "Nature"
            </button>
            <button
              type="button"
              onClick={() => {
                setQuery('city drone');
                handleSearch('city drone');
              }}
              className="text-[10px] px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg border border-neutral-700"
            >
              Искать "City"
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
          {videos.map((vid, idx) => {
            const isAdded = addedVideoIds.has(vid.id);
            const bestFile = vid.video_files.find(f => f.quality === 'hd') || vid.video_files[0];
            const isHovered = hoveredVideoId === vid.id;
            const isPlaying = activePlayingId === vid.id;

            return (
              <div
                key={`pexel-${vid.id}-${idx}`}
                onMouseEnter={() => setHoveredVideoId(vid.id)}
                onMouseLeave={() => {
                  setHoveredVideoId(null);
                  setActivePlayingId(null);
                }}
                className={`group relative bg-neutral-900 border rounded-xl overflow-hidden transition-all hover:scale-[1.01] flex flex-col ${
                  isAdded
                    ? 'border-emerald-500/60 ring-1 ring-emerald-500/30'
                    : 'border-neutral-800 hover:border-emerald-500/40'
                }`}
              >
                {/* Media Container */}
                <div className="relative aspect-video bg-black overflow-hidden flex items-center justify-center">
                  {isPlaying && bestFile ? (
                    <video
                      src={bestFile.link}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={vid.image}
                      alt={`B-Roll ${vid.id}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}

                  {/* Play preview toggle button on hover */}
                  <button
                    type="button"
                    onClick={() => setActivePlayingId(isPlaying ? null : vid.id)}
                    className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                    title={isPlaying ? 'Остановить просмотр' : 'Предпросмотр видео'}
                  >
                    <div className="p-2 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white hover:scale-110 transition-transform">
                      {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                    </div>
                  </button>

                  {/* Badges */}
                  <div className="absolute top-1.5 left-1.5 bg-black/70 backdrop-blur-md text-[9px] font-mono text-neutral-300 px-1.5 py-0.5 rounded border border-white/10">
                    {vid.duration}s
                  </div>
                  <div className="absolute top-1.5 right-1.5 bg-emerald-950/80 backdrop-blur-md text-[9px] font-mono text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30 font-bold">
                    HD
                  </div>
                </div>

                {/* Footer details & Action */}
                <div className="p-2 space-y-1.5 bg-neutral-950 flex-1 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[9px] text-neutral-400">
                    <span className="truncate max-w-[100px]" title={`Автор: ${vid.user.name}`}>
                      👤 {vid.user.name}
                    </span>
                    <a
                      href={vid.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-emerald-300 transition-colors"
                      title="Открыть страницу на Pexels"
                    >
                      <ExternalLink size={10} />
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddVideo(vid)}
                    className={`w-full py-1 px-2 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      isAdded
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-sm'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check size={11} />
                        <span>Добавлено</span>
                      </>
                    ) : (
                      <>
                        <Plus size={11} />
                        <span>+ Добавить в кадр</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pexels API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Key size={16} className="text-emerald-400" />
                Настройка API ключа Pexels
              </h4>
              <button
                type="button"
                onClick={() => setShowApiKeyModal(false)}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              Вы можете использовать ваш собственный бесплатный API ключ от <strong>Pexels.com</strong> для увеличенных лимитов и быстрого поиска B-Roll.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-neutral-400 block">Pexels API Key:</label>
              <input
                type="text"
                value={customKeyInput}
                onChange={(e) => setCustomKeyInput(e.target.value)}
                placeholder="Вставьте ключ Pexels API..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-neutral-200 font-mono focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[10px] text-neutral-500">
                Получить бесплатный ключ можно за 1 минуту на <a href="https://www.pexels.com/api/" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline">pexels.com/api</a>
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setShowApiKeyModal(false)}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs rounded-xl"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl"
              >
                Сохранить ключ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
