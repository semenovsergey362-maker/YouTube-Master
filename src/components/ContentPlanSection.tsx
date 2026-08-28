import { useApp } from "../context/AppContext";
import { logger } from "../config/logger";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ScrollFadeIn } from './ScrollFadeIn';
import { 
  Sparkles, 
  Upload, 
  FileText, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Loader2, 
  Wand2, 
  Layers, 
  Edit2, 
  Check, 
  X,
  FileSpreadsheet,
  AlertCircle,
  RefreshCw,
  Search,
  Globe,
  ExternalLink,
  TrendingUp,
  Newspaper,
  Youtube,
  Copy,
  Tag,
  Link as LinkIcon,
  ListPlus,
  Tv
} from 'lucide-react';
import { toast } from 'sonner';
import { copyToClipboard as copyTextToClipboard } from '../utils/helpers';
import { 
  generateIdeasFromDescription, 
  generateIdeasFromGoogleSearch, 
  importYouTubeVideoData,
  fetchCompetitorAnalysis,
  fetchSeoAnalysis,
  ImportedYouTubeVideoData,
  GoogleSearchGroundingSource,
  SeriesEpisode,
  ContentPlanItem
} from '../services/geminiService';
import { TopicTreeAndSerializationSection } from './TopicTreeAndSerializationSection';

interface ContentPlanSectionProps {
  currentIdeasCount: number;
  onApplyContentPlan: (items: ContentPlanItem[], mode: 'append' | 'replace') => void;
  selectedModel?: string;
  selectedNiche?: string;
  customNiche?: string;
  nicheData?: any;
  selectedBranding?: any;
  customCompetitorInsights?: string | null;
}

export const ContentPlanSection: React.FC<ContentPlanSectionProps> = ({
  currentIdeasCount,
  onApplyContentPlan,
  selectedModel,
  selectedNiche,
  customNiche,
  nicheData,
  selectedBranding,
  customCompetitorInsights
}) => {
  const { myChannelVideos } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ai' | 'search' | 'youtube' | 'upload' | 'manual' | 'series'>('ai');

  // YouTube Link Import state
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isImportingYouTube, setIsImportingYouTube] = useState(false);
  const [importedYouTubeData, setImportedYouTubeData] = useState<ImportedYouTubeVideoData | null>(null);

  // Competitor Analysis & SEO Suggestions state
  const [isAnalyzingCompetitors, setIsAnalyzingCompetitors] = useState(false);
  const [competitorSuggestions, setCompetitorSuggestions] = useState<{
    suggestedTitles: string[];
    suggestedTags: string[];
    strategy: string;
    competitors: any[];
  } | null>(null);

  const handleAnalyzeCompetitors = async () => {
    if (!importedYouTubeData) return;
    
    setIsAnalyzingCompetitors(true);
    const toastId = toast.loading('Изучаем конкурентов через YouTube API и Gemini...');
    
    try {
      const query = importedYouTubeData.title;
      const currentTitle = importedYouTubeData.title;
      const currentTags = importedYouTubeData.tags || [];
      
      const results = await fetchCompetitorAnalysis(query, currentTitle, currentTags);
      
      setCompetitorSuggestions({
        ...results.suggestions,
        competitors: results.competitors
      });
      
      toast.success('Анализ конкурентов завершён! Конкретные предложения по заголовкам и тегам готовы.', { id: toastId });
    } catch (err: any) {
      logger.error('Competitor analysis error:', err);
      toast.error(err.message || 'Ошибка при анализе конкурентов', { id: toastId });
    } finally {
      setIsAnalyzingCompetitors(false);
    }
  };

  const applyCompetitorSuggestion = (type: 'title' | 'tags', value: string | string[]) => {
    if (!importedYouTubeData) return;
    
    const updated = { ...importedYouTubeData };
    if (type === 'title' && typeof value === 'string') {
      updated.title = value;
    } else if (type === 'tags' && Array.isArray(value)) {
      updated.tags = value;
    }
    
    setImportedYouTubeData(updated);
    toast.success(`Изменения ${type === 'title' ? 'в заголовке' : 'в тегах'} применены!`);
  };

  // Helper to extract niche, branding, and YouTube context
  const extractContext = () => {
    const nicheName = selectedNiche || customNiche || nicheData?.niche || '';
    const channelName = selectedBranding?.name || nicheData?.branding?.names?.[0]?.name || '';
    const targetAudience = 
      nicheData?.branding?.target_audience || 
      nicheData?.branding?.audience || 
      (nicheData?.audienceData && nicheData.audienceData[0]?.segment) || 
      '';
    const tone = nicheData?.branding?.tone || selectedBranding?.tone || 'Экспертный';
    const positioning = nicheData?.branding?.positioning || '';

    let topic = nicheName;
    if (channelName && nicheName) {
      topic = `${nicheName} (Канал: ${channelName})`;
    } else if (channelName) {
      topic = channelName;
    }

    return {
      topic,
      audience: targetAudience,
      tone: tone || 'Экспертный',
      goal: positioning ? 'Личный бренд и доверие' : 'Обучение и вовлечение',
      hasNicheData: !!(nicheName || nicheData?.potential),
      hasBrandingData: !!(channelName || nicheData?.branding),
      hasYouTubeData: !!(customCompetitorInsights || (nicheData?.competitors && nicheData.competitors.length > 0)),
    };
  };

  const context = extractContext();

  // AI Generator state
  const [aiTopic, setAiTopic] = useState('');
  const [aiAudience, setAiAudience] = useState('');
  const [aiGoal, setAiGoal] = useState('Обучение и вовлечение');
  const [aiTone, setAiTone] = useState('Экспертный');
  const [aiCount, setAiCount] = useState<number>(10);
  const [isGenerating, setIsGenerating] = useState(false);

  // Google Search Grounding state
  const [googleQuery, setGoogleQuery] = useState('');
  const [isSearchingGoogle, setIsSearchingGoogle] = useState(false);
  const [googleSearchResults, setGoogleSearchResults] = useState<{
    summary: string;
    sources: GoogleSearchGroundingSource[];
  } | null>(null);

  // Auto-fill on mount or when context changes if fields are clean
  useEffect(() => {
    if (context.topic && !aiTopic) setAiTopic(context.topic);
    if (context.audience && !aiAudience) setAiAudience(context.audience);
    if (context.tone && aiTone === 'Экспертный') setAiTone(context.tone);
    if (context.goal && aiGoal === 'Обучение и вовлечение') setAiGoal(context.goal);
  }, [selectedNiche, customNiche, nicheData, selectedBranding, customCompetitorInsights]);

  const handleAutofillFromData = () => {
    const ctx = extractContext();
    if (ctx.topic) setAiTopic(ctx.topic);
    if (ctx.audience) setAiAudience(ctx.audience);
    if (ctx.tone) setAiTone(ctx.tone);
    if (ctx.goal) setAiGoal(ctx.goal);
    toast.success('Параметры заполнены на основе данных из вкладок Ниша, Брендинг и YouTube');
  };

  // Upload / Import state
  const [rawText, setRawText] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Manual items state
  const [manualTitle, setManualTitle] = useState('');
  const [manualDesc, setManualDesc] = useState('');

  // Draft items for preview
  const [draftItems, setDraftItems] = useState<ContentPlanItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [applyMode, setApplyMode] = useState<'append' | 'replace'>('append');
  
  // Inline editing state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Handle AI Generation
  const handleGenerateAI = async () => {
    if (!aiTopic.trim()) {
      toast.error('Пожалуйста, укажите тему или нишу для контент-плана');
      return;
    }

    setIsGenerating(true);
    try {
      const channelName = selectedBranding?.name || nicheData?.branding?.names?.[0]?.name;
      const positioning = nicheData?.branding?.positioning;
      const slogan = nicheData?.branding?.slogan;
      const style = nicheData?.branding?.style;
      const nicheSummary = nicheData?.potential?.summary;
      const subNiches = Array.isArray(nicheData?.subNiches)
        ? nicheData.subNiches.map((s: any) => (typeof s === 'string' ? s : s.title || s.name)).join(', ')
        : '';
      const competitors = Array.isArray(nicheData?.competitors)
        ? nicheData.competitors.map((c: any) => `${c.name || 'Конкурент'}: слабая сторона (${c.weakness || 'н/д'})`).join('; ')
        : '';

      const promptDescription = `
Тематика/Ниша: ${aiTopic}
${aiAudience ? `Целевая аудитория: ${aiAudience}` : ''}
Формат/Цель контента: ${aiGoal}
Тональность: ${aiTone}
Количество идей: ${aiCount}

--- КОНТЕКСТ ИЗ ВКЛАДОК НИША, БРЕНДИНГ И YOUTUBE ---
${selectedNiche || customNiche ? `Ниша: ${selectedNiche || customNiche}` : ''}
${nicheSummary ? `Анализ и потенциал ниши: ${nicheSummary}` : ''}
${subNiches ? `Суб-ниши: ${subNiches}` : ''}
${channelName ? `Название канала/бренда: ${channelName}` : ''}
${positioning ? `Позиционирование бренда: ${positioning}` : ''}
${slogan ? `Слоган/Миссия: ${slogan}` : ''}
${style ? `Стиль визуации/подачи: ${style}` : ''}
${customCompetitorInsights ? `Инсайты по конкурентам с YouTube: ${customCompetitorInsights}` : ''}
${competitors ? `Анализ конкурентов: ${competitors}` : ''}

Сгенерируй профессиональный структурированный контент-план для YouTube с высокими показателями удержания и CTR. Каждый элемент должен содержать привлекательный заголовок, краткую концепцию (description), тональность и оценку виральности.
      `.trim();

      const result = await generateIdeasFromDescription(promptDescription, {
        model: selectedModel || 'gemini-2.5-flash',
      });

      if (result && result.ideas && result.ideas.length > 0) {
        const generated: ContentPlanItem[] = result.ideas.slice(0, aiCount).map((item, idx) => ({
          id: `gen-${Date.now()}-${idx}`,
          title: item.title,
          description: item.description || 'Концепция видео с высоким потенциалом просмотров.',
          duration: item.duration || '12 мин',
          tone: item.tone || aiTone,
          viral_potential: item.viral_potential || 'Высокий (92%)',
        }));

        setDraftItems((prev) => {
          const arr = Array.isArray(prev) ? prev : [];
          const existingTitles = new Set(arr.map((i) => i.title.trim().toLowerCase()));
          const filteredNew = generated.filter((i) => !existingTitles.has(i.title.trim().toLowerCase()));
          const combined = [...filteredNew, ...arr];
          setSelectedIds(new Set(combined.map((_, i) => i)));
          return combined;
        });
        toast.success(`Сгенерирован контент-план из ${generated.length} идей!`);
      } else {
        toast.error('Не удалось сгенерировать контент-план');
      }
    } catch (error) {
      logger.error('Content plan generation error:', error);
      toast.error('Ошибка при генерации контент-плана');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Google Search Integration & Idea Generation
  const handleSearchGoogle = async (queryToSearch?: string) => {
    const query = (queryToSearch || googleQuery || context.topic || 'Тренды 2026').trim();
    if (!query) {
      toast.error('Пожалуйста, введите запрос для поиска в Google');
      return;
    }

    setIsSearchingGoogle(true);
    setGoogleQuery(query);
    try {
      const res = await generateIdeasFromGoogleSearch(query, {
        model: selectedModel || 'gemini-3.1-pro',
      });

      if (res && res.ideas && res.ideas.length > 0) {
        const generated: ContentPlanItem[] = res.ideas.map((item, idx) => ({
          id: `gsearch-${Date.now()}-${idx}`,
          title: item.title,
          description: item.description || 'Идея на основе актуального поиска Google.',
          duration: item.duration || '12 мин',
          tone: item.tone || 'Аналитический',
          viral_potential: item.viral_potential || 'Высокий (94%)',
        }));

        setDraftItems((prev) => {
          const arr = Array.isArray(prev) ? prev : [];
          const existingTitles = new Set(arr.map((i) => i.title.trim().toLowerCase()));
          const filteredNew = generated.filter((i) => !existingTitles.has(i.title.trim().toLowerCase()));
          const combined = [...filteredNew, ...arr];
          setSelectedIds(new Set(combined.map((_, i) => i)));
          return combined;
        });
        setGoogleSearchResults({
          summary: res.summary,
          sources: res.sources,
        });

        toast.success(`Google Search: Найдено ${res.sources.length} источников и сгенерировано ${generated.length} трендовых идей!`);
      } else {
        toast.error('Поиск Google не вернул результатов. Попробуйте сформулировать запрос иначе.');
      }
    } catch (error) {
      logger.error('Google Search generation error:', error);
      toast.error('Ошибка при выполнении поиска в Google');
    } finally {
      setIsSearchingGoogle(false);
    }
  };

  // YouTube Video Link Importer Handler
  const handleImportYouTube = async (urlToImport?: string) => {
    const targetUrl = urlToImport || youtubeUrl;
    if (!targetUrl.trim()) {
      toast.error('Введите ссылку на видео YouTube');
      return;
    }

    setIsImportingYouTube(true);
    setImportedYouTubeData(null);
    const toastId = toast.loading('Сканирование YouTube видео через Google Search Grounding...');

    try {
      const data = await importYouTubeVideoData(targetUrl, {
        model: selectedModel || 'gemini-3.1-pro',
      });

      setImportedYouTubeData(data);
      toast.success('Метаданные видео и похожие темы успешно извлечены!', { id: toastId });
    } catch (err: any) {
      logger.error('YouTube import error:', err);
      toast.error(err.message || 'Ошибка при импорте данных видео', { id: toastId });
    } finally {
      setIsImportingYouTube(false);
    }
  };

  const handleApplySuggestedFromYouTube = () => {
    if (!importedYouTubeData || !importedYouTubeData.suggestedIdeas || importedYouTubeData.suggestedIdeas.length === 0) {
      toast.error('Нет сгенерированных идей для добавления');
      return;
    }
    const newItems: ContentPlanItem[] = importedYouTubeData.suggestedIdeas.map((idea, idx) => ({
      id: `yt-suggested-${Date.now()}-${idx}`,
      title: idea.title,
      description: idea.description,
      duration: idea.duration || '12-15 мин',
      tone: idea.tone || 'Информационный',
      viral_potential: idea.viral_potential || 'Высокий',
    }));
    setDraftItems((prev) => {
      const arr = Array.isArray(prev) ? prev : [];
      const existingTitles = new Set(arr.map((i) => i.title.trim().toLowerCase()));
      const filteredNew = newItems.filter((i) => !existingTitles.has(i.title.trim().toLowerCase()));
      const combined = [...filteredNew, ...arr];
      setSelectedIds(new Set(combined.map((_, i) => i)));
      return combined;
    });
    toast.success(`Загружено ${newItems.length} похожих тем на основе видео "${importedYouTubeData.title.substring(0, 30)}..."`);
  };

  const handleAddImportedVideoToDraft = () => {
    if (!importedYouTubeData) return;
    const newItem: ContentPlanItem = {
      id: `yt-orig-${Date.now()}`,
      title: importedYouTubeData.title,
      description: importedYouTubeData.description,
      duration: '12-15 мин',
      tone: 'Экспертный',
      viral_potential: 'Экстремальный',
    };
    setDraftItems((prev) => [newItem, ...prev]);
    setSelectedIds((prev) => {
      const updated = new Set<number>();
      // Shift indices by 1 and select the top one
      updated.add(0);
      prev.forEach((idx) => updated.add(idx + 1));
      return updated;
    });
    toast.success(`Видео "${importedYouTubeData.title.substring(0, 35)}..." добавлено в черновик плана!`);
  };

  const handleCopyText = (text: string, label: string) => {
    copyTextToClipboard(text);
    toast.success(`${label} скопировано в буфер обмена`);
  };

  // Parse text or JSON into items
  const parseInputText = (text: string) => {
    if (!text.trim()) {
      toast.error('Введите текст или загрузите файл с контент-планом');
      return;
    }

    let parsedItems: ContentPlanItem[] = [];

    // Try JSON parsing
    try {
      const json = JSON.parse(text);
      if (Array.isArray(json)) {
        parsedItems = json.map((item: any, idx) => {
          if (typeof item === 'string') {
            return {
              id: `import-${Date.now()}-${idx}`,
              title: item,
              description: 'Загруженная тема контент-плана',
              duration: '10 мин',
              tone: 'Развлекательный',
              viral_potential: 'Высокий (88%)',
            };
          }
          return {
            id: `import-${Date.now()}-${idx}`,
            title: item.title || item.name || item.topic || `Идея #${idx + 1}`,
            description: item.description || item.desc || item.summary || 'Описание идеи',
            duration: item.duration || '12 мин',
            tone: item.tone || 'Экспертный',
            viral_potential: item.viral_potential || item.viral || 'Высокий (90%)',
          };
        });
      } else if (typeof json === 'object' && json.ideas && Array.isArray(json.ideas)) {
        parsedItems = json.ideas.map((item: any, idx: number) => ({
          id: `import-${Date.now()}-${idx}`,
          title: item.title || item.name || `Идея #${idx + 1}`,
          description: item.description || 'Описание идеи',
          duration: item.duration || '10 мин',
          tone: item.tone || 'Экспертный',
          viral_potential: item.viral_potential || 'Высокий (90%)',
        }));
      }
    } catch (e) {
      // Fallback: parse line by line
      const lines = text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      parsedItems = lines.map((line, idx) => {
        // Strip numbering like "1. ", "1)", "- "
        const cleanedTitle = line.replace(/^(\d+[\.\)]\s*|[\-\*]\s*)/, '');
        return {
          id: `import-line-${Date.now()}-${idx}`,
          title: cleanedTitle,
          description: 'Попользовательская тема контент-плана',
          duration: '10-15 мин',
          tone: 'Пользовательский',
          viral_potential: 'Высокий (85%)',
        };
      });
    }

    if (parsedItems.length > 0) {
      setDraftItems((prev) => {
        const arr = Array.isArray(prev) ? prev : [];
        const existingTitles = new Set(arr.map((i) => i.title.trim().toLowerCase()));
        const filteredNew = parsedItems.filter((i) => !existingTitles.has(i.title.trim().toLowerCase()));
        const combined = [...filteredNew, ...arr];
        setSelectedIds(new Set(combined.map((_, i) => i)));
        return combined;
      });
      toast.success(`Распознано ${parsedItems.length} тем для контент-плана`);
    } else {
      toast.error('Не удалось распознать элементы контент-плана');
    }
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawText(content);
        parseInputText(content);
      }
    };
    reader.readAsText(file);
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          setRawText(content);
          parseInputText(content);
        }
      };
      reader.readAsText(file);
    }
  };

  // Add single item manually
  const handleAddManual = () => {
    if (!manualTitle.trim()) {
      toast.error('Введите заголовок идеи');
      return;
    }

    const newItem: ContentPlanItem = {
      id: `manual-${Date.now()}`,
      title: manualTitle.trim(),
      description: manualDesc.trim() || 'Пользовательская тема',
      duration: '12 мин',
      tone: 'Авторский',
      viral_potential: 'Высокий (90%)',
    };

    setDraftItems((prev) => [...prev, newItem]);
    setSelectedIds((prev) => new Set([...Array.from(prev), draftItems.length]));
    setManualTitle('');
    setManualDesc('');
    toast.success('Тема добавлена в предпросмотр');
  };

  // Toggle selection
  const toggleSelect = (index: number) => {
    const next = new Set(selectedIds);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === draftItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(draftItems.map((_, i) => i)));
    }
  };

  // Delete item from draft
  const removeItem = (index: number) => {
    setDraftItems((prev) => (Array.isArray(prev) ? prev : []).filter((_, i) => i !== index));
    const next = new Set<number>();
    Array.from(selectedIds).forEach((id) => {
      if (id < index) next.add(id);
      else if (id > index) next.add(id - 1);
    });
    setSelectedIds(next);
  };

  // Start inline editing
  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditTitle(draftItems[index].title);
    setEditDesc(draftItems[index].description || '');
  };

  const saveEdit = (index: number) => {
    if (!editTitle.trim()) return;
    setDraftItems((prev) =>
      (Array.isArray(prev) ? prev : []).map((item, i) =>
        i === index ? { ...item, title: editTitle.trim(), description: editDesc.trim() } : item
      )
    );
    setEditingIndex(null);
  };

  // Apply chosen items to real content plan
  const handleApply = () => {
    const finalItems = draftItems.filter((_, idx) => selectedIds.has(idx));
    if (finalItems.length === 0) {
      toast.error('Выберите хотя бы одну идею для применения');
      return;
    }

    onApplyContentPlan(finalItems, applyMode);
  };

  return (
    <ScrollFadeIn>
    <div className="bg-surface/90 border border-border rounded-2xl overflow-hidden shadow-xl transition-all mb-6 w-full max-w-full min-w-0">
      {/* Top Header */}
      <div className="p-4 bg-neutral-900/80 border-b border-border/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center font-bold shadow-inner">
            <Wand2 size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex flex-wrap items-center gap-2">
              Конструктор и загрузка своего контент-плана
              <span className="text-[10px] bg-accent/20 border border-accent/40 text-accent font-bold px-2 py-0.5 rounded-full uppercase tracking-wide whitespace-nowrap">
                Custom Plan
              </span>
            </h3>
            <p className="text-xs text-neutral-400">
              Сгенерируйте темы по своим параметрам, загрузите из файла или создайте свой вариант и примените к проекту.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold transition-all border border-neutral-700/60 cursor-pointer shrink-0 whitespace-nowrap"
        >
          {isOpen ? (
            <>
              Свернуть <ChevronUp size={16} />
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
            key="content-plan-accordion-body"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-5 space-y-6"
          >
            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 p-1.5 bg-neutral-950/80 border border-neutral-800/80 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('ai')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'ai'
                    ? 'bg-accent text-white shadow-md shadow-accent/20'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Sparkles size={14} />
                1. AI
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('search')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer relative ${
                  activeTab === 'search'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Globe size={14} className={activeTab === 'search' ? 'animate-spin-slow text-blue-300' : 'text-blue-400'} />
                <span>2. Поиск</span>
                <span className="px-1.5 py-[2px] rounded-full text-[9px] bg-blue-500/30 text-blue-300 border border-blue-400/30 font-extrabold uppercase hidden sm:inline-block">
                  Live
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('youtube')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer relative ${
                  activeTab === 'youtube'
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-500/20'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Youtube size={14} className={activeTab === 'youtube' ? 'text-white' : 'text-red-500'} />
                <span>3. YouTube</span>
                <span className="px-1.5 py-[2px] rounded-full text-[9px] bg-red-500/30 text-red-200 border border-red-400/30 font-extrabold uppercase hidden sm:inline-block">
                  Link
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-accent text-white shadow-md shadow-accent/20'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Upload size={14} />
                4. Файл
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'manual'
                    ? 'bg-accent text-white shadow-md shadow-accent/20'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Plus size={14} />
                5. Своё
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('series')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer relative ${
                  activeTab === 'series'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Tv size={14} className={activeTab === 'series' ? 'text-white' : 'text-emerald-400'} />
                <span>6. Сериал</span>
              </button>
            </div>


            {/* TAB 1: AI GENERATOR */}
            {activeTab === 'ai' && (
              <div className="bg-neutral-900/60 border border-neutral-800 p-4 rounded-xl space-y-4">
                {/* Connected Data Sources Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-950/90 p-3 rounded-xl border border-neutral-800/80 text-xs">
                  <div className="flex items-center gap-2 flex-wrap flex-1">
                    <Sparkles size={14} className="text-accent shrink-0" />
                    <span className="font-bold text-white text-[11px] uppercase tracking-wider">
                      Контекст из системы:
                    </span>
                    {context.hasNicheData ? (
                      <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1 whitespace-nowrap">
                        ✓ Ниша
                      </span>
                    ) : (
                      <span className="bg-neutral-800/80 text-neutral-500 px-2 py-0.5 rounded-md text-[11px] whitespace-nowrap">
                        Ниша не определена
                      </span>
                    )}
                    {context.hasBrandingData ? (
                      <span className="bg-purple-500/15 border border-purple-500/30 text-purple-400 px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1 whitespace-nowrap">
                        ✓ Брендинг
                      </span>
                    ) : (
                      <span className="bg-neutral-800/80 text-neutral-500 px-2 py-0.5 rounded-md text-[11px] whitespace-nowrap">
                        Брендинг не задан
                      </span>
                    )}
                    {context.hasYouTubeData ? (
                      <span className="bg-red-500/15 border border-red-500/30 text-red-400 px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1 whitespace-nowrap">
                        ✓ YouTube/Конкуренты
                      </span>
                    ) : (
                      <span className="bg-neutral-800/80 text-neutral-500 px-2 py-0.5 rounded-md text-[11px] whitespace-nowrap">
                        Инсайты YouTube не загружены
                      </span>
                    )}
                    {myChannelVideos && myChannelVideos.length > 0 && (
                      <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1 whitespace-nowrap" title="Синхронизировано с видео вашего канала">
                        ✓ {myChannelVideos.length} видео с канала
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleAutofillFromData}
                    className="text-[11px] text-accent hover:text-accent/80 hover:underline font-bold flex items-center gap-1.5 cursor-pointer transition-all ml-auto"
                  >
                    <RefreshCw size={12} />
                    Заполнить из вкладок
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                      Тема, ниша или вектор канала *
                    </label>
                    <input
                      type="text"
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                      placeholder="Например: Обзоры ИИ-инструментов и автоматизация для бизнеса..."
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-accent font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                      Целевая аудитория
                    </label>
                    <input
                      type="text"
                      value={aiAudience}
                      onChange={(e) => setAiAudience(e.target.value)}
                      placeholder="Предприниматели, фрилансеры"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-accent font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                      Количество идей
                    </label>
                    <select
                      value={aiCount}
                      onChange={(e) => setAiCount(Number(e.target.value))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-accent font-sans cursor-pointer"
                    >
                      <option value={5}>5 идей (Быстрый старт)</option>
                      <option value={10}>10 идей (Стандарт)</option>
                      <option value={15}>15 идей (Продвинутый)</option>
                      <option value={20}>20 идей (Месячный план)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                      Формат / Главная цель
                    </label>
                    <select
                      value={aiGoal}
                      onChange={(e) => setAiGoal(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-accent font-sans cursor-pointer"
                    >
                      <option value="Обучение и вовлечение">🎓 Обучение и вовлечение</option>
                      <option value="Высокий CTR и виральность">⚡ Максимальная виральность и хайп</option>
                      <option value="Продажи и конверсия">💰 Продажи продуктов/услуг</option>
                      <option value="Личный бренд и доверие">🌟 Построение личного бренда</option>
                      <option value="Развлечение и юмор">🎭 Развлекательный контент</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                      Желаемый тон
                    </label>
                    <select
                      value={aiTone}
                      onChange={(e) => setAiTone(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-accent font-sans cursor-pointer"
                    >
                      <option value="Экспертный">Экспертный / Убедительный</option>
                      <option value="Энергичный">Энергичный / Динамичный</option>
                      <option value="Провокационный">Провокационный / Кликтибейтный</option>
                      <option value="Ламповый">Ламповый / Уютный</option>
                      <option value="Аналитический">Аналитический / Глубокий</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleGenerateAI}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-6 py-2.5 bg-accent text-white rounded-xl text-xs font-bold hover:bg-accent/90 transition-all shadow-lg shadow-accent/20 disabled:opacity-50 cursor-pointer"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Генерируем контент-план...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        Сгенерировать контент-план
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: GOOGLE SEARCH GROUNDING & TRENDS */}
            {activeTab === 'search' && (
              <div className="bg-neutral-900/60 border border-blue-500/20 p-5 rounded-2xl space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-950/40 via-neutral-950 to-neutral-950 p-4 rounded-xl border border-blue-500/30">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                      <Globe size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        Живой поиск в Google (Grounding)
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                          Live Web Data
                        </span>
                      </h4>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Поиск актуальных новостей, статеек, обсуждений и поисковых запросов с автоматической генерацией контент-плана.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Niche Suggestion Chips */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    Быстрые темы и тренды для поиска:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      context.topic ? `Тренды ${context.topic} 2026` : 'Тренды ИИ и Нейросетей',
                      'Главные новости этой недели',
                      'Самые искомые запросы в Google',
                      'Тренды и аналитика рынка',
                      'Технологические прорывы'
                    ].map((chip, idx) => (
                      <button
                        key={`chip-${chip}-${idx}`}
                        type="button"
                        onClick={() => {
                          setGoogleQuery(chip);
                          handleSearchGoogle(chip);
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-950 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <TrendingUp size={12} className="text-blue-400" />
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Search Input */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    Введите нишу, тему или конкретный запрос для Google Search:
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input
                        type="text"
                        value={googleQuery}
                        onChange={(e) => setGoogleQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSearchGoogle();
                          }
                        }}
                        placeholder="Например: Новости искусственного интеллекта за неделю, Обзор электромобилей, Инвестиции 2026..."
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 font-sans"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSearchGoogle()}
                      disabled={isSearchingGoogle}
                      className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      {isSearchingGoogle ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Ищем в Google...
                        </>
                      ) : (
                        <>
                          <Globe size={16} />
                          Искать в Google
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Search Results Summary & Sources */}
                {googleSearchResults && (
                  <div className="space-y-4 pt-2 border-t border-neutral-800/80">
                    <div className="p-4 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-white flex items-center gap-2">
                          <Newspaper size={15} className="text-blue-400" />
                          Резюме трендов Google по запросу «{googleQuery}»
                        </h5>
                        <span className="text-[10px] text-neutral-500">Google Grounding API</span>
                      </div>
                      <p className="text-xs text-neutral-300 leading-relaxed">
                        {googleSearchResults.summary}
                      </p>

                      {/* Found Web Sources */}
                      {googleSearchResults.sources.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-neutral-800/60">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                            Найденные источники информации ({googleSearchResults.sources.length}):
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {googleSearchResults.sources.map((src, i) => (
                              <a
                                key={`gsrc-${src.url || src.title || 'source'}-${i}`}
                                href={src.url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800/80 hover:border-neutral-700 transition-all flex items-start gap-2 group text-left"
                              >
                                <ExternalLink size={13} className="text-blue-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                                <div className="truncate">
                                  <span className="text-xs font-semibold text-white group-hover:text-blue-300 block truncate">
                                    {src.title}
                                  </span>
                                  <span className="text-[10px] text-neutral-500 truncate block">
                                    {src.url}
                                  </span>
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: YOUTUBE LINK IMPORT */}
            {activeTab === 'youtube' && (
              <div className="bg-neutral-900/60 border border-red-500/20 p-5 rounded-2xl space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-red-950/40 via-neutral-950 to-neutral-950 p-4 rounded-xl border border-red-500/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0">
                      <Youtube size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        Импорт видео по URL ссылки (YouTube)
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500/20 text-red-300 border border-red-500/30 font-bold">
                          Google Search Grounding
                        </span>
                      </h4>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Вставьте ссылку на существующее YouTube-видео для сканирования метаданных (название, описание, теги) и быстрой генерации аналогичного контент-плана.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Preset Example Buttons */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    Популярные примеры для быстрой проверки:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "MKBHD (Маркес Браунли)", url: "https://www.youtube.com/watch?v=M576WGiDBdQ" },
                      { label: "MrBeast $1 vs $1,000,000", url: "https://www.youtube.com/watch?v=1WEAJ-DFkHE" },
                      { label: "Veritasium Научное Видео", url: "https://www.youtube.com/watch?v=Gk34g7Z0jOk" },
                      { label: "ИИ и Нейросети Обзор", url: "https://www.youtube.com/watch?v=aircAruvnKk" }
                    ].map((example, idx) => (
                      <button
                        key={`ex-${example.label}-${idx}`}
                        type="button"
                        onClick={() => {
                          setYoutubeUrl(example.url);
                          handleImportYouTube(example.url);
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-950 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Youtube size={12} className="text-red-500" />
                        {example.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* URL Input */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    Вставьте ссылку на YouTube видео (URL):
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <LinkIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input
                        type="text"
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleImportYouTube();
                          }
                        }}
                        placeholder="https://www.youtube.com/watch?v=... или https://youtu.be/..."
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-red-500 font-sans"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleImportYouTube()}
                      disabled={isImportingYouTube || !youtubeUrl.trim()}
                      className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-red-600/20 disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      {isImportingYouTube ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Сканирование...
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          Импортировать данные
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Imported Video Results Card */}
                {importedYouTubeData && (
                  <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 space-y-4">
                    {/* Header Card */}
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-3 pb-3 border-b border-neutral-800">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/20 text-red-400 font-extrabold flex items-center gap-1">
                            <Youtube size={12} /> YouTube Импорт
                          </span>
                          <span className="text-xs text-neutral-400 font-medium">
                            Канал: <strong className="text-white">{importedYouTubeData.channelName}</strong>
                          </span>
                        </div>
                        <h3 className="text-sm font-black text-white leading-snug">
                          {importedYouTubeData.title}
                        </h3>
                      </div>
                      <a
                        href={importedYouTubeData.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-lg text-xs font-bold flex items-center gap-1.5 border border-neutral-800 shrink-0 transition-colors"
                      >
                        <ExternalLink size={12} /> Смотреть на YouTube
                      </a>
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                        <span>Описание / Резюме видео:</span>
                        <button
                          onClick={() => handleCopyText(importedYouTubeData.description, "Описание")}
                          className="text-neutral-500 hover:text-white text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Copy size={12} /> Скопировать
                        </button>
                      </div>
                      <p className="text-xs text-neutral-300 bg-neutral-900/80 p-3 rounded-lg leading-relaxed border border-neutral-800/80">
                        {importedYouTubeData.description}
                      </p>
                    </div>

                    {/* Tags / Keywords */}
                    {importedYouTubeData.tags && importedYouTubeData.tags.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                          <span className="flex items-center gap-1.5">
                            <Tag size={13} className="text-red-400" />
                            Теги и ключевые слова ({importedYouTubeData.tags.length}):
                          </span>
                          <button
                            onClick={() => handleCopyText(importedYouTubeData.tags.join(', '), "Теги")}
                            className="text-neutral-500 hover:text-white text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Copy size={12} /> Скопировать все теги
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-neutral-900/50 rounded-lg border border-neutral-800/50">
                          {importedYouTubeData.tags.map((tag, idx) => (
                            <span
                              key={`yt-tag-${tag}-${idx}`}
                              className="px-2 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300 font-mono hover:text-white cursor-pointer transition-colors"
                              onClick={() => handleCopyText(tag, `Тег "${tag}"`)}
                              title="Нажмите, чтобы скопировать тег"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Competitor Analysis & SEO Suggestions Section */}
                    <div className="pt-4 border-t border-neutral-800 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white flex items-center gap-2">
                          <TrendingUp size={16} className="text-emerald-400" />
                          Анализ конкурентов и SEO-оптимизация
                        </h4>
                        {!competitorSuggestions ? (
                          <button
                            onClick={handleAnalyzeCompetitors}
                            disabled={isAnalyzingCompetitors}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                          >
                            {isAnalyzingCompetitors ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                Анализ...
                              </>
                            ) : (
                              <>
                                <Search size={14} />
                                Найти конкурентов и оптимизировать
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => setCompetitorSuggestions(null)}
                            className="text-[11px] text-neutral-500 hover:text-white font-bold transition-colors cursor-pointer"
                          >
                            Сбросить анализ
                          </button>
                        )}
                      </div>

                      {competitorSuggestions && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-4"
                        >
                          {/* Strategy Box */}
                          <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                            <h5 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                              <Sparkles size={12} />
                              Стратегия на основе конкурентов
                            </h5>
                            <p className="text-xs text-neutral-300 leading-relaxed italic">
                              "{competitorSuggestions.strategy}"
                            </p>
                          </div>

                          {/* Titles Suggestions */}
                          <div className="space-y-2">
                            <h5 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Edit2 size={12} className="text-emerald-400" />
                              Предложенные заголовки (CTR-оптимизация):
                            </h5>
                            <div className="space-y-2">
                              {competitorSuggestions.suggestedTitles.map((title, idx) => (
                                <div 
                                  key={`sug-title-${title}-${idx}`}
                                  className="group flex items-center justify-between gap-3 p-2.5 bg-neutral-900 border border-neutral-800 rounded-lg hover:border-emerald-500/50 transition-all"
                                >
                                  <span className="text-xs text-white font-medium line-clamp-1">{title}</span>
                                  <button
                                    onClick={() => applyCompetitorSuggestion('title', title)}
                                    className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded text-[10px] font-bold transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                  >
                                    Применить
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Tags Suggestions */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h5 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Tag size={12} className="text-emerald-400" />
                                Оптимизированные теги:
                              </h5>
                              <button
                                onClick={() => applyCompetitorSuggestion('tags', competitorSuggestions.suggestedTags)}
                                className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Check size={12} /> Применить все
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-1.5 p-2 bg-neutral-900/50 rounded-lg border border-neutral-800">
                              {competitorSuggestions.suggestedTags.map((tag, idx) => (
                                <span key={`sug-tag-${tag}-${idx}`} className="text-[10px] text-neutral-400 font-mono">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Found Competitors List (Top 3) */}
                          <div className="space-y-2">
                            <h5 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                              Проанализированные конкуренты (YouTube API):
                            </h5>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              {competitorSuggestions.competitors.slice(0, 3).map((comp, idx) => (
                                <div key={`comp-${comp.title}-${idx}`} className="p-2 bg-neutral-950 border border-neutral-900 rounded-lg text-[10px]">
                                  <p className="text-neutral-300 font-bold line-clamp-1">{comp.title}</p>
                                  <p className="text-neutral-500">{comp.channelTitle}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Key Topics */}
                    {importedYouTubeData.keyTopics && importedYouTubeData.keyTopics.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                          Главные темы видео:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {importedYouTubeData.keyTopics.map((topic, idx) => (
                            <span
                              key={`yt-topic-${topic}-${idx}`}
                              className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-300 font-medium"
                            >
                              • {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Grounding Sources */}
                    {importedYouTubeData.sources && importedYouTubeData.sources.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-neutral-800/60">
                        <span className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                          Источники Google Search Grounding:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {importedYouTubeData.sources.map((src, idx) => (
                            <a
                              key={`yt-src-${src.url || src.title || 'src'}-${idx}`}
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-md text-[10px] font-medium flex items-center gap-1 border border-neutral-800 truncate max-w-xs transition-colors"
                            >
                              <ExternalLink size={10} className="text-red-400 shrink-0" />
                              <span className="truncate">{src.title}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons Bar */}
                    <div className="pt-3 border-t border-neutral-800 flex flex-wrap items-center gap-2 justify-between">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleApplySuggestedFromYouTube}
                          className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-red-600/20 transition-all cursor-pointer"
                        >
                          <Sparkles size={14} />
                          Создать контент-план из 10 похожих тем
                        </button>
                        <button
                          type="button"
                          onClick={handleAddImportedVideoToDraft}
                          className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <ListPlus size={14} className="text-red-400" />
                          Добавить это видео как 1-ю тему
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const fullText = `НАЗВАНИЕ:\n${importedYouTubeData.title}\n\nКАНАЛ:\n${importedYouTubeData.channelName}\n\nОПИСАНИЕ:\n${importedYouTubeData.description}\n\nТЕГИ:\n${importedYouTubeData.tags.join(', ')}`;
                          handleCopyText(fullText, "Все метаданные видео");
                        }}
                        className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-neutral-800 transition-colors cursor-pointer"
                      >
                        <Copy size={13} />
                        Скопировать метаданные
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: UPLOAD & PASTE */}
            {activeTab === 'upload' && (
              <div className="bg-neutral-900/60 border border-neutral-800 p-4 rounded-xl space-y-4">
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer relative ${
                    dragActive
                      ? 'border-accent bg-accent/10'
                      : 'border-neutral-800 hover:border-neutral-700 bg-neutral-950/40'
                  }`}
                >
                  <input
                    type="file"
                    accept=".json,.txt,.csv"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center">
                      <Upload size={20} />
                    </div>
                    <p className="text-xs font-bold text-white">
                      Перетащите сюда файл контент-плана или нажмите для выбора
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      Поддерживаемые форматы: <span className="text-neutral-400 font-mono">.JSON</span>, <span className="text-neutral-400 font-mono">.TXT</span> (список тем построчно), <span className="text-neutral-400 font-mono">.CSV</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                      Или вставьте список тем или JSON текст вручную:
                    </label>
                  </div>
                  <textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Каждая строка — отдельное видео. Например:&#10;10 скрытых функций iOS 18&#10;Как я заработал первые $1000 на ноу-коде&#10;Полный гайд по выживанию в IT 2026"
                    rows={5}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-accent font-mono resize-y"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => parseInputText(rawText)}
                      className="flex items-center gap-2 px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition-all border border-neutral-700 cursor-pointer"
                    >
                      <FileText size={14} />
                      Распознать и загрузить
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: MANUAL INPUT */}
            {activeTab === 'manual' && (
              <div className="bg-neutral-900/60 border border-neutral-800 p-4 rounded-xl space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                      Заголовок / Название темы *
                    </label>
                    <input
                      type="text"
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      placeholder="Например: Как настроить автоматизацию в Notion за 10 минут"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-accent font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                      Краткое описание / Заметка
                    </label>
                    <input
                      type="text"
                      value={manualDesc}
                      onChange={(e) => setManualDesc(e.target.value)}
                      placeholder="Краткая суть видео..."
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-accent font-sans"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddManual}
                    className="flex items-center gap-2 px-5 py-2 bg-accent text-white rounded-xl text-xs font-bold hover:bg-accent/90 transition-all cursor-pointer"
                  >
                    <Plus size={14} />
                    Добавить идею в список
                  </button>
                </div>
              </div>
            )}

            {/* TAB 6: SERIALIZATION & TOPIC TREE */}
            {activeTab === 'series' && (
              <TopicTreeAndSerializationSection
                niche={selectedNiche || customNiche || nicheData?.niche || ''}
                currentIdeas={draftItems.length > 0 ? draftItems : (nicheData?.ideas || [])}
                selectedModel={selectedModel}
                onApplyEpisodesToIdeas={(episodes) => {
                  const newItems: ContentPlanItem[] = episodes.map(ep => ({
                    title: ep.title,
                    description: ep.description,
                    duration: ep.duration,
                    tone: ep.tone,
                    viral_potential: ep.viral_potential
                  }));
                  setDraftItems(prev => [...prev, ...newItems]);
                  setSelectedIds(prev => {
                    const next = new Set(prev);
                    newItems.forEach((_, i) => next.add(draftItems.length + i));
                    return next;
                  });
                  toast.success(`Добавлено ${newItems.length} серий в список предпросмотра!`);
                }}
              />
            )}

            {/* PREVIEW & APPLY SECTION */}
            {draftItems.length > 0 && (
              <div className="space-y-4 border-t border-border/60 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <Layers className="text-accent" size={16} />
                      Предпросмотр контент-плана ({draftItems.length} идей)
                    </span>
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-[11px] text-accent hover:underline font-semibold cursor-pointer"
                    >
                      {selectedIds.size === draftItems.length ? 'Снять выделение' : 'Выбрать все'}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-neutral-400 font-bold">Режим применения:</span>
                    <div className="flex bg-neutral-950 p-0.5 rounded-lg border border-neutral-800 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setApplyMode('append')}
                        className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                          applyMode === 'append'
                            ? 'bg-accent/20 border border-accent/40 text-accent'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        ➕ Добавить к имеющимся ({currentIdeasCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setApplyMode('replace')}
                        className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                          applyMode === 'replace'
                            ? 'bg-red-500/20 border border-red-500/40 text-red-400'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        🔄 Заменить весь контент-план
                      </button>
                    </div>
                  </div>
                </div>

                {/* Items List */}
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {draftItems.map((item, idx) => {
                    const isSelected = selectedIds.has(idx);
                    const isEditing = editingIndex === idx;

                    return (
                      <div
                        key={`draft-${item.id ?? 'item'}-${idx}`}
                        className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                          isSelected
                            ? 'bg-neutral-900 border-accent/40 text-white'
                            : 'bg-neutral-950/60 border-neutral-850 opacity-60'
                        }`}
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(idx)}
                            className="mt-1 w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-accent focus:ring-accent accent-accent cursor-pointer shrink-0"
                          />

                          {isEditing ? (
                            <div className="flex-1 space-y-2 pr-2 min-w-0">
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="w-full bg-black border border-neutral-700 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-accent"
                              />
                              <input
                                type="text"
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                                className="w-full bg-black border border-neutral-700 rounded-lg p-1.5 text-xs text-neutral-300 focus:outline-none focus:border-accent"
                              />
                            </div>
                          ) : (
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap min-w-0">
                                <span className="font-bold text-xs text-white break-words">
                                  {idx + 1}. {item.title}
                                </span>
                                <div className="flex gap-2 flex-wrap">
                                  {item.duration && (
                                    <span className="text-[10px] bg-neutral-800 px-2 py-0.5 rounded text-neutral-400 whitespace-nowrap">
                                      ⏱️ {item.duration}
                                    </span>
                                  )}
                                  {item.tone && (
                                    <span className="text-[10px] bg-accent/10 text-accent border border-accent/20 px-2 py-0.5 rounded whitespace-nowrap">
                                      🎭 {item.tone}
                                    </span>
                                  )}
                                  {item.description && (item.description.includes("Логическое продолжение") || item.description.includes("продолжение") || item.description.includes("🔄")) && (
                                    <span className="text-[10px] bg-purple-500/15 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded whitespace-nowrap font-bold">
                                      🔄 Продолжение
                                    </span>
                                  )}
                                </div>
                              </div>
                              {item.description && (
                                <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2 break-words">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {isEditing ? (
                            <button
                              type="button"
                              onClick={() => saveEdit(idx)}
                              className="p-1.5 bg-accent/20 text-accent hover:bg-accent/30 rounded-lg transition-all"
                              title="Сохранить"
                            >
                              <Check size={14} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startEdit(idx)}
                              className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-all"
                              title="Редактировать"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-all"
                            title="Удалить"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Apply Button */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 bg-neutral-900/40 p-3 rounded-xl border border-neutral-800">
                  <div className="text-xs text-neutral-400 flex items-center gap-1.5">
                    <AlertCircle size={14} className="text-accent" />
                    Выбрано <span className="font-bold text-white">{selectedIds.size}</span> из{' '}
                    <span>{draftItems.length}</span> идей для импорта.
                  </div>

                  <button
                    type="button"
                    onClick={handleApply}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-accent to-accent/90 text-white font-bold text-xs rounded-xl hover:brightness-110 transition-all shadow-lg shadow-accent/25 cursor-pointer"
                  >
                    <CheckCircle2 size={16} />
                    Применить контент-план ({selectedIds.size} идей)
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </ScrollFadeIn>
  );
};
