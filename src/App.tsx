import { DEMO_DATA, COMPETITORS, NICHE_POTENTIAL, NICHE_IDEAS, POPULAR_IDEAS, getScoreData, getIdeas, getPopularIdeas, getScriptTemplate, getEditingTips, getSEOData, getAnalytics, parseSubs, generateBrandingVariants, IMAGE_STYLES, ANIMATION_TYPES, MUSIC_MOODS, REGIONS, fontStyleMap, TREND_DATA, type CustomTemplateItem } from "./data/constants";
import { NICHES, NICHE_METRICS } from "./data/niches";
import { logger } from "./config/logger";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Toaster, toast } from "sonner";
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  Lock,
  Target,
  Palette,
  Lightbulb,
  FileText,
  Scissors,
  Bot,
  Search,
  BarChart3,
  Layers,
  Film,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Video,
  Users,
  Activity,
  AlertCircle,
  Heart,
  Shirt,
  Car,
  Music,
  Clapperboard,
  Brain,
  Dog,
  Newspaper,
  Laugh,
  Home,
  Stethoscope,
  Brush,
  Trophy,
  FlaskConical,
  Folder,
  Gamepad2,
  Coins,
  Baby,
  BookOpen,
  Zap,
  Eye,
  EyeOff,
  Library,
  Timer,
  RefreshCw,
  Edit2,
  Download,
  FileCode,
  Copy,
  CopyX,
  Check,
  Loader2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Mic,
  Volume2,
  Link as LinkIcon,
  ExternalLink,
  Monitor,
  Compass,
  LayoutDashboard,
  LayoutTemplate,
  BookmarkPlus,
  Calendar,
  Plus,
  Trash2,
  Database,
  Clock,
  User as UserIcon,
  CalendarDays,
  Upload,
  Settings,
  Sliders,
  LogOut,
  LogIn,
  Camera,
  Box,
  Pencil,
  Square,
  Coffee,
  Sun,
  Moon,
  Briefcase,
  Droplets,
  Send,
  X,
  Save,
  Type,
  Quote,
  Grid,
  Paintbrush,
  PenTool,
  Wand2,
  Radio,
  Cog,
  Star,
  ChevronDown,
  ChevronUp,
  Info,
  Gauge,
  Cpu,
  ShieldCheck,
  Triangle,
  Hexagon,
  HelpCircle,
  Cloud,
  Wind,
  Flame,
  Globe,
  Headphones,
  Split,
  Play,
  Square as StopCircle,
  Crown,
  Rocket,
  ChevronRight,
  Archive,
  File,
  FileSpreadsheet,
  Filter,
  ArrowUpDown,
  FolderPlus,
  Tag,
  Youtube,
  RotateCcw,
  Edit3,
  GitCompare,
  History,
  Columns,
  SpellCheck,
  CheckCircle2,
  AlertTriangle,
  Menu,
  UserX,
  UserCheck,
  VolumeX,
  Smartphone,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Smile,
  MoveVertical,
  SlidersHorizontal,
  MessageSquare,
  Hash,
  Terminal} from "lucide-react";
import { YouTubeCardPreview } from "./components/YouTubeCardPreview";
import { ScriptDiffModal } from "./components/ScriptDiffModal";
import { Sidebar } from "./components/Sidebar";
import { useHooksGeneration } from "./hooks/useHooksGeneration";
import { useSeoGeneration } from "./hooks/useSeoGeneration";
import { useShortsGeneration } from "./hooks/useShortsGeneration";
import { BlockHistoryModal, BlockIteration } from "./components/BlockHistoryModal";
import { ScriptTimeline } from "./components/ScriptTimeline";
import { safeStorage } from "./lib/storage";
import { get, set } from "./lib/idb";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import {
  auth,
  db,
  signInWithGoogle,
  logout,
  onAuthStateChanged,
  refreshAuthSession,
  type User,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  OperationType,
  handleFirestoreError,
  isPlaceholder,
} from "./firebase";
import {
  generateNicheData,
  NicheData,
  generateLogoPrompt,
  generateBannerPrompt,
  generateColors,
  generateFonts,
  generateChannelSEO,
  generateRecommendedColors,
  generateTrendingIdeas,
  generateScriptTemplate,
  parseUploadedScript,
  generateIdeaDetails,
  generateSequelsForIdea,
  generateScriptStructure,
  generateScriptBlock,
  generateBlockMusicPrompt,
  generateBlockSceneContext,
  generateScriptBreakdown,
  SceneBreakdown,
  type VideoSEO,
  type AnalysisOptions,
  generateMoreIdeas,
  generateIdeasFromDescription,
  rewriteScriptBlock,
  generateSRTContent,
  GeneratedBlock,
  GeneratedIdea,
  generateImage,
  type SEOAnalysis,
  annotateTextForVoiceover,
  analyzeTitlesUniqueness,
  type TitleAnalysis,
  translateContent,
  generateVideoCTA,
  generateProductionStyleFromContext,
  generateDetailedPromptForScene,
  generatePromptResponse,
  analyzeAndImproveScript,
  generateThumbnailStyles,
  type ThumbnailStyleSuggestion,
  type ScriptImprovement,
  applyRetentionImprovementToBlocks,
  parseRecommendationsFromText,
  applyMultipleRecommendationsToBlocks,
  fixScriptBlockGrammar,
  analyzeInstructionsCompliance,
  type ContentPlanItem,
  cutLongFormScriptToShorts,
  analyzeShortsTopicRetention,
  optimizeShortsRetentionAndIntegrate,
  type ShortsTopicRetentionAnalysis,
  type OptimizedShortsScriptResult,
  generateSeamlessLoopEnding,
  generateShortsVisualsAndMusic,
  generateShortsSEO,
  type ShortsSEO,
  generateShortsHashtags,
  type ShortsHashtagsResult,
  generateTransitionPromptBetweenBlocks,
  type CutShortItem,
  type LoopEndingResult,
  optimizeTitle,
  analyzeThumbnailEmotions,
  type ThumbnailEmotionAnalysis,
} from "./services/geminiService";
import { 
  getFullScriptText, 
  getUnifiedScriptScenes,
  getBlockColorScheme,
  getSceneVisualText,
  exportToTxt, 
  exportToSrt,
  exportToMarkdown, 
  exportToPDF, 
  exportToZip,
  downloadImage,
  exportScriptAndPlanToPDF,
  copyToClipboard as copyTextToClipboard
} from "./utils/helpers";
import { parseSFXTags, autoGenerateSFXFromScene } from "./utils/sfxAutoTagger";
import { Header } from "./components/Header";
import { ScriptTab } from "./components/tabs/ScriptTab";
import { AppSettingsModal } from "./components/AppSettingsModal";
import { NicheTab } from "./components/tabs/NicheTab";
import { BrandingTab } from "./components/tabs/BrandingTab";
import { QuickNoteModal } from "./components/modals/QuickNoteModal";
import { CustomInstructionsModal } from "./components/modals/CustomInstructionsModal";
import { DeleteConfirmationModal } from "./components/modals/DeleteConfirmationModal";
import { HistoryModal } from "./components/modals/HistoryModal";
import { ModelLimitsModal } from "./components/modals/ModelLimitsModal";
import { BrandingEditModal } from "./components/modals/BrandingEditModal";
import { CustomIdeasModal } from "./components/modals/CustomIdeasModal";
import { ImportModal } from "./components/modals/ImportModal";

import { SEOTab } from "./components/tabs/SEOTab";
import { ShortsTab } from "./components/tabs/ShortsTab";
import { PromptingTab } from "./components/tabs/PromptingTab";
import { useApp } from "./context/AppContext";
import { OnboardingTour } from "./components/OnboardingTour";
import { FAQModal } from "./components/FAQModal";
import { VoiceCommandsBar } from "./components/VoiceCommandsBar";
import { downloadUserManualPDF } from "./utils/pdfGenerator";
import { YouTubeTab } from "./components/tabs/YouTubeTab";
import { QuotaWarning } from "./components/QuotaWarning";
import { ContentPlanSection } from "./components/ContentPlanSection";
import { TopicTreeAndSerializationSection } from "./components/TopicTreeAndSerializationSection";
import { ScriptRecommendations } from "./components/ScriptRecommendations";
import { DetailedMusicPromptBuilderModal } from "./components/DetailedMusicPromptBuilderModal";
import { IdeaDeepAnalysisModal } from "./components/IdeaDeepAnalysisModal";
import { IdeaSnapshotsModal, type IdeaSnapshotData } from "./components/IdeaSnapshotsModal";
import { NicheTooltip } from "./components/NicheTooltip";
import { analyzeIdeaDeeply, type IdeaDeepAnalysis } from "./services/geminiService";
import { BrandbookSection } from "./components/BrandbookSection";
import { AudiencePortraitSection } from "./components/AudiencePortraitSection";
import { diffWords } from "diff";
// import { PAGES } from './constants';
// import { User } from './firebase';

interface DiffChange {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
}

const computeWordDiff = (oldStr: string, newStr: string): DiffChange[] => {
  const changes = diffWords(oldStr || "", newStr || "");
  return changes.map(change => ({
    type: change.added ? 'added' : change.removed ? 'removed' : 'unchanged',
    value: change.value
  }));
};

const PAGES = [
  { name: "Ниша", icon: Target, step: 1, desc: "Выбор направления" },
  { name: "Брендинг", icon: Palette, step: 2, desc: "Айдентика" },
  { name: "YouTube", icon: Youtube, step: 3, desc: "Конкуренты & Тренды" },
  { name: "Идеи", icon: Lightbulb, step: 4, desc: "Креатив" },
  { name: "Сценарий", icon: FileText, step: 5, desc: "Текст и план" },
  { name: "Промтинг", icon: Zap, step: 6, desc: "AI Продакшен" },
  { name: "SEO", icon: Search, step: 7, desc: "Оптимизация" },
  { name: "Шортс", icon: Film, step: 8, desc: "Быстрый формат" },
];

const SyncPromptEditor = ({ en, ru, onUpdate }: any) => {
  const [enText, setEnText] = React.useState(en);
  const [ruText, setRuText] = React.useState(ru);
  const [isEditing, setIsEditing] = React.useState(false);

  if (!isEditing) {
    return (
      <div className="space-y-3">
        <div className="relative group/edit">
          <div className="text-[10px] text-neutral-600 font-bold uppercase mb-1">EN</div>
          <p className="text-xs text-neutral-400 line-clamp-2 italic pr-8">{en || "Промт не сгенерирован"}</p>
          <button 
            onClick={() => setIsEditing(true)}
            className="absolute top-0 right-0 p-1 text-neutral-700 hover:text-accent opacity-0 group-hover/edit:opacity-100 transition-all"
          >
            <Edit2 size={12} />
          </button>
        </div>
        <div className="relative group/edit">
          <div className="text-[10px] text-neutral-600 font-bold uppercase mb-1">RU</div>
          <p className="text-xs text-neutral-400 line-clamp-2 italic pr-8">{ru || "Перевод не сгенерирован"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl space-y-4">
      <div className="space-y-2">
        <label className="text-[10px] text-neutral-500 font-bold uppercase">English Prompt</label>
        <textarea 
          value={enText} 
          onChange={(e) => setEnText(e.target.value)}
          className="w-full h-24 bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-xs text-neutral-300 focus:ring-1 focus:ring-accent outline-none"
        />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] text-neutral-500 font-bold uppercase">Russian Translation</label>
        <textarea 
          value={ruText} 
          onChange={(e) => setRuText(e.target.value)}
          className="w-full h-24 bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-xs text-neutral-300 focus:ring-1 focus:ring-accent outline-none"
        />
      </div>
      <div className="flex gap-2">
        <button 
          onClick={() => {
            onUpdate(enText, ruText);
            setIsEditing(false);
          }} 
          className="px-4 py-2 bg-accent text-black text-[10px] font-bold rounded-lg uppercase tracking-wider"
        >
          Сохранить
        </button>
        <button 
          onClick={() => {
            setEnText(en);
            setRuText(ru);
            setIsEditing(false);
          }} 
          className="px-4 py-2 bg-neutral-800 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider"
        >
          Отмена
        </button>
      </div>
    </div>
  );
};

const NICHE_ICONS: Record<string, any> = {
  Технологии: Search,
  Игры: Gamepad2,
  Образование: Lightbulb,
  Лайфстайл: Users,
  Бизнес: TrendingUp,
  Финансы: Activity,
  Путешествия: Target,
  Кулинария: Palette,
  Фитнес: Activity,
  DIY: Scissors,
  Красота: Heart,
  Мода: Shirt,
  Автомобили: Car,
  Музыка: Music,
  Кино: Clapperboard,
  Психология: Brain,
  Животные: Dog,
  Новости: Newspaper,
  Юмор: Laugh,
  Недвижимость: Home,
  Здоровье: Stethoscope,
  Искусство: Brush,
  Спорт: Trophy,
  Наука: FlaskConical,
  Аниме: Film,
  Криптовалюта: Coins,
  Родительство: Baby,
  Книги: BookOpen,
  Мотивация: Zap,
  Обзоры: Eye,
  История: Library,
  "Свой вариант": Sparkles,
};

const VOICE_GUIDE = [
  {
    name: "Puck",
    desc: "Энергичный, молодежный, универсальный. Идеален для развлечений, игр, влогов.",
  },
  {
    name: "Charon",
    desc: "Глубокий, авторитетный, серьезный. Подходит для документалок, новостей, туториалов.",
  },
  {
    name: "Kore",
    desc: "Теплый, дружелюбный, спокойный. Хорош для медитаций, сторителлинга, лайфстайла.",
  },
  {
    name: "Fenrir",
    desc: "Интенсивный, драматичный, мощный. Для трейлеров, экшена, саспенса.",
  },
  {
    name: "Zephyr",
    desc: "Мягкий, воздушный, нежный. Для ASMR, релаксации, поэзии.",
  },
];

const VoiceButton: React.FC<{
  onTranscript: (text: string) => void;
  className?: string;
}> = ({ onTranscript, className }) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isSupported = !!(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "ru-RU";

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onTranscript(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        logger.error("Speech recognition error", event.error);
        setIsListening(false);
        if (event.error !== "no-speech") {
          toast.error(`Ошибка распознавания речи: ${event.error}`);
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [onTranscript]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (!isSupported) {
        toast.error("Ваш браузер не поддерживает распознавание речи");
        return;
      }
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        logger.error("Start recognition error", err);
        setIsListening(false);
      }
    }
  };

  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={toggleListening}
      className={`p-2 rounded-full transition-all flex items-center justify-center ${
        isListening
          ? "bg-red-500 text-white animate-pulse"
          : "text-neutral-500 hover:text-primary hover:bg-neutral-800"
      } ${className}`}
      title={isListening ? "Остановить запись" : "Голосовой ввод"}
    >
      {isListening ? (
        <Loader2 className="animate-spin" size={16} />
      ) : (
        <Mic size={16} />
      )}
    </button>
  );
};

export interface CustomRule {
  id: string;
  title: string;
  content: string;
  isActive: boolean;
}

const isShortDuration = (durationStr: string) => {
  if (!durationStr) return false;
  const s = durationStr.toLowerCase();
  return (
    s.includes("сек") ||
    s.includes("short") ||
    s.includes("1 мин") ||
    s.includes("60 s") ||
    s.includes("секунд") ||
    s.includes("0-2") ||
    s.includes("1-2") ||
    s.includes("59")
  );
};

export default function App() {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  // Helper to estimate reading duration (17.5 chars per second)
  const estimateDuration = (text: string) => {
    if (!text) return 0;
    const cleanText = text
      .replace(/\[[^\]]*\]/g, " ")
      .replace(/\((?:\d+\s*(?:сек|с|sec|ms)|пауза|pause)[^)]*\)/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    // 17.5 characters per second is a common average for voiceover
    return Math.round(cleanText.length / 17.5);
  };

  const {
    selectedNiche,
    setSelectedNiche,
    selectedRegion,
    setSelectedRegion,
    isCustomNiche,
    setIsCustomNiche,
    customNiche,
    setCustomNiche,
    nicheData,
    setNicheData,
    brandProfile,
    setBrandProfile,
    audiencePortrait,
    setAudiencePortrait,
    isLoading,
    setIsLoading,
    isRegeneratingIdeas,
    setIsRegeneratingIdeas,
    selectedIdea,
    setSelectedIdea,
    selectedBranding,
    setSelectedBranding,
    scriptKeywords,
    setScriptKeywords,
    isRegeneratingScript,
    setIsRegeneratingScript,
    videoSEO,
    setVideoSEO,
    seoAnalysis,
    setSeoAnalysis,
    isGeneratingVideoSEO,
    setIsGeneratingVideoSEO,
    isAnalyzingSEO,
    setIsAnalyzingSEO,
    titleAnalysis,
    setTitleAnalysis,
    isAnalyzingTitles,
    setIsAnalyzingTitles,
    


    brandingImages,
    setBrandingImages,
    history,
    setHistory,
    aiAssistantMessages,
    setAiAssistantMessages,
    aiAssistantInput,
    setAiAssistantInput,
    isAiAssistantLoading,
    setIsAiAssistantLoading,
    previewThumbnail,
    setPreviewThumbnail,
    thumbnailVariants,
    setThumbnailVariants,
    thumbnailReference,
    thumbnailReferenceStyle,
    setThumbnailReferenceStyle,
    isPreviewLoading,
    setIsPreviewLoading,
    previewBorderColor,
    setPreviewBorderColor,
    previewChannelColor,
    setPreviewChannelColor,
    toneOfVoice,
    setToneOfVoice,
    trendingIdeas,
    setTrendingIdeas,
    ideaSeries,
    setIdeaSeries,
    isPersistenceLoaded,
    selectedModel,
    setSelectedModel,
    debugEnabled,
    setDebugEnabled,
    myChannelVideos,
  } = useApp();

  const MODELS = [
    {
      id: 'gemini-3.7-flash',
      name: 'Gemini 3.7 Flash',
      badge: 'Новейшая 3.7',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      desc: 'Флагманская гибридная модель с адаптивным мышлением и максимальной скоростью.',
      rpm: 120,
      rpd: 10000,
      tpm: '10,000,000',
      speed: 5,
      intelligence: 5,
      limitText: 'Без ограничений',
      limitBadge: 'Макс. лимит',
      limitColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      id: 'gemini-3.6-flash',
      name: 'Gemini 3.6 Flash',
      badge: 'Стабильная 3.6',
      badgeColor: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
      desc: 'Мощная и проверенная модель поколения 3.6 для сложных задач.',
      rpm: 120,
      rpd: 10000,
      tpm: '10,000,000',
      speed: 5,
      intelligence: 4.8,
      limitText: 'Без ограничений',
      limitBadge: 'Макс. лимит',
      limitColor: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    },
    {
      id: 'gemini-3.5-flash',
      name: 'Gemini 3.5 Flash',
      badge: 'Надежная 3.5',
      badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      desc: 'Надежная модель поколения 3.5, отлично подходящая для базовых запросов.',
      rpm: 120,
      rpd: 10000,
      tpm: '10,000,000',
      speed: 5,
      intelligence: 4.6,
      limitText: 'Без ограничений',
      limitBadge: 'Макс. лимит',
      limitColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    },
    {
      id: 'gemini-3.1-pro-preview',
      name: 'Gemini 3.1 Pro',
      badge: 'Продвинутая 3.1',
      badgeColor: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30',
      desc: 'Высочайший уровень глубокой логики, анализа и понимания контекста.',
      rpm: 120,
      rpd: 10000,
      tpm: '10,000,000',
      speed: 4,
      intelligence: 5,
      limitText: 'Без ограничений',
      limitBadge: 'Макс. лимит',
      limitColor: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20',
    }
  ];
  const [activePage, setActivePage] = useState(() => {
    try {
      const savedPage = safeStorage.getItem("yt_active_page");
      if (savedPage && PAGES.some((p) => p.name === savedPage)) {
        return savedPage;
      }
      return safeStorage.getItem("yt_niche") ? "Идеи" : PAGES[0].name;
    } catch {
      return PAGES[0].name;
    }
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Idea Snapshots Modal State
  const [isSnapshotsModalOpen, setIsSnapshotsModalOpen] = useState(false);

  // Deep Analysis Modal State
  const [isDeepAnalysisOpen, setIsDeepAnalysisOpen] = useState(false);
  const [deepAnalysisTitle, setDeepAnalysisTitle] = useState("");
  const [deepAnalysisNiche, setDeepAnalysisNiche] = useState("");
  const [deepAnalysisData, setDeepAnalysisData] = useState<IdeaDeepAnalysis | null>(null);
  const [isDeepAnalysisLoading, setIsDeepAnalysisLoading] = useState(false);

  // Trigger Deep Analysis handler
  const handleTriggerDeepAnalysis = async (title: string, niche?: string, description?: string) => {
    if (!title) return;
    setDeepAnalysisTitle(title);
    setDeepAnalysisNiche(niche || selectedNiche || "");
    setDeepAnalysisData(null);
    setIsDeepAnalysisOpen(true);
    setIsDeepAnalysisLoading(true);

    try {
      const result = await analyzeIdeaDeeply(
        title,
        niche || selectedNiche,
        description,
        { model: selectedModel }
      );
      setDeepAnalysisData(result);
    } catch (err: any) {
      logger.error("Deep Analysis error:", err);
      toast.error("Не удалось выполнить глубокий анализ идеи: " + (err.message || "Ошибка AI"));
    } finally {
      setIsDeepAnalysisLoading(false);
    }
  };

  // Restore snapshot handler
  const handleApplySnapshot = (snapshot: IdeaSnapshotData) => {
    if (!snapshot) return;

    if (snapshot.ideas && snapshot.ideas.length > 0) {
      setNicheData((prev: any) => ({
        ...(prev || {
          potential: { demand: 75, competition: 50, monetization: 80, score: 70, summary: "Снимок контент-плана" },
          subNiches: [],
          branding: { names: [], colors: [], fonts: [] },
          popularIdeas: [],
          scriptTemplate: "",
          editingTips: ""
        }),
        ideas: snapshot.ideas,
      }));
    }

    if (snapshot.trendingIdeas && snapshot.trendingIdeas.length > 0) {
      setTrendingIdeas(snapshot.trendingIdeas);
    }

    if (snapshot.ideaAssignments) {
      setIdeaAssignments(snapshot.ideaAssignments);
    }

    if (snapshot.ideaTags && snapshot.ideaTags.length > 0) {
      setIdeaTags(snapshot.ideaTags);
    }

    if (snapshot.ideaPlaylists && snapshot.ideaPlaylists.length > 0) {
      setIdeaPlaylists(snapshot.ideaPlaylists);
    }

    if (snapshot.niche) {
      setSelectedNiche(snapshot.niche);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (activePage) {
      safeStorage.setItem("yt_active_page", activePage);
    }
  }, [activePage]);

  // Persistent scroll position map per tab
  const scrollPositionsRef = React.useRef<Record<string, number>>((() => {
    try {
      const saved = safeStorage.getItem("yt_tab_scroll_positions");
      return saved ? JSON.parse(saved) : {};
    } catch {
    
  return {};
    }
  })());

  // Continuously track window scroll position for current activePage
  useEffect(() => {
    let timeoutId: any;
    const handleScroll = () => {
      if (activePage) {
        scrollPositionsRef.current[activePage] = window.scrollY;
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          try {
            safeStorage.setItem(
              "yt_tab_scroll_positions",
              JSON.stringify(scrollPositionsRef.current)
            );
          } catch {
            // ignore quota errors
          }
        }, 150);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timeoutId);
    };
  }, [activePage]);

  // Restore scroll position when activePage changes or on page load/refresh
  React.useLayoutEffect(() => {
    const targetY = scrollPositionsRef.current[activePage] || 0;

    const restore = () => {
      window.scrollTo({ top: targetY, behavior: "instant" as ScrollBehavior });
    };

    restore();
    const t1 = setTimeout(restore, 50);
    const t2 = setTimeout(restore, 150);
    const t3 = setTimeout(restore, 280);
    const t4 = setTimeout(restore, 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [activePage]);
  const [ideasSearchQuery, setIdeasSearchQuery] = useState("");
  const [ideasFilterViral, setIdeasFilterViral] = useState("all");
  const [ideasFilterDuration, setIdeasFilterDuration] = useState("all");
  const [ideasFilterTone, setIdeasFilterTone] = useState("all");

  // States for Ideas Folders and Tags
  const [ideaFolders, setIdeaFolders] = useState<string[]>(() => {
    try {
      const saved = safeStorage.getItem("yt_idea_folders");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return ["Обучающие", "Развлекательные", "Влоги", "Лайфхаки"];
    } catch {
      return ["Обучающие", "Развлекательные", "Влоги", "Лайфхаки"];
    }
  });

  const [ideaTags, setIdeaTags] = useState<{ id: string; name: string; color: string }[]>(() => {
    try {
      const saved = safeStorage.getItem("yt_idea_tags");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return [
        { id: "plans", name: "В планах", color: "blue" },
        { id: "progress", name: "В работе", color: "yellow" },
        { id: "done", name: "Снято", color: "purple" },
        { id: "published", name: "Опубликовано", color: "green" },
        { id: "draft", name: "Черновик", color: "neutral" },
        { id: "viral_tag", name: "В тренде", color: "red" }
      ];
    } catch {
      return [
        { id: "plans", name: "В планах", color: "blue" },
        { id: "progress", name: "В работе", color: "yellow" },
        { id: "done", name: "Снято", color: "purple" },
        { id: "published", name: "Опубликовано", color: "green" },
        { id: "draft", name: "Черновик", color: "neutral" },
        { id: "viral_tag", name: "В тренде", color: "red" }
      ];
    }
  });

  const [userCustomIdeas, setUserCustomIdeas] = useState<any[]>(() => {
    try {
      const saved = safeStorage.getItem("yt_user_custom_ideas");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return [];
    } catch {
      return [];
    }
  });

  const [customIdeaModalTab, setCustomIdeaModalTab] = useState<"manual" | "ai">("manual");
  const [manualIdeaTitle, setManualIdeaTitle] = useState("");
  const [manualIdeaDescription, setManualIdeaDescription] = useState("");
  const [manualIdeaPlaylist, setManualIdeaPlaylist] = useState("");
  const [manualIdeaDuration, setManualIdeaDuration] = useState("10-15 мин");
  const [manualIdeaTone, setManualIdeaTone] = useState("Развлекательный");

  const [ideaAssignments, setIdeaAssignments] = useState<Record<string, { folder?: string; tags?: string[]; playlist?: string; note?: string; status?: string }>>(() => {
    try {
      const saved = safeStorage.getItem("yt_idea_assignments");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [selectedFolderFilter, setSelectedFolderFilter] = useState("all");
  const [selectedStatusTagFilter, setSelectedStatusTagFilter] = useState<string>(() => {
    try {
      return safeStorage.getItem("yt_selected_status_tag_filter") || "all";
    } catch {
      return "all";
    }
  });

  const IDEA_STATUSES = [
    { id: "Идея", label: "💡 Идея", bg: "bg-blue-500/15 text-blue-400 border-blue-500/30 hover:bg-blue-500/25", badgeBg: "bg-blue-500/20", dot: "bg-blue-400" },
    { id: "Сценарий", label: "✍️ Сценарий", bg: "bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25", badgeBg: "bg-amber-500/20", dot: "bg-amber-400" },
    { id: "Монтаж", label: "🎬 Монтаж", bg: "bg-purple-500/15 text-purple-400 border-purple-500/30 hover:bg-purple-500/25", badgeBg: "bg-purple-500/20", dot: "bg-purple-400" },
    { id: "Готово", label: "✅ Готово", bg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25", badgeBg: "bg-emerald-500/20", dot: "bg-emerald-400" },
    { id: "Опубликовано", label: "🚀 Опубликовано", bg: "bg-teal-500/15 text-teal-300 border-teal-500/30 hover:bg-teal-500/25", badgeBg: "bg-teal-500/20", dot: "bg-teal-300" },
  ];

  const getIdeaStatusObj = (statusStr?: string) => {
    const found = IDEA_STATUSES.find(s => s.id === statusStr);
    return found || IDEA_STATUSES[0];
  };

  const [ideaPlaylists, setIdeaPlaylists] = useState<string[]>(() => {
    try {
      const saved = safeStorage.getItem("yt_idea_playlists");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return ["🎬 Плейлист №1", "🔥 Тренды Недели", "📱 Короткие Скетчи"];
    } catch {
      return ["🎬 Плейлист №1", "🔥 Тренды Недели", "📱 Короткие Скетчи"];
    }
  });

  const [selectedPlaylistFilter, setSelectedPlaylistFilter] = useState("all");
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [showManagePlaylists, setShowManagePlaylists] = useState(false);

  // States and Handlers for Folders and Tags Management
  const [newFolderInput, setNewFolderInput] = useState("");
  const [newTagNameInput, setNewTagNameInput] = useState("");
  const [newTagColorInput, setNewTagColorInput] = useState("blue");

  const getTagColorClasses = (color: string) => {
    switch (color) {
      case "blue":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "yellow":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "purple":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "green":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "red":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "neutral":
      default:
        return "bg-neutral-500/10 text-neutral-400 border-neutral-500/20";
    }
  };

  const getIdeaViralPotentialStr = (idea: any): string => {
    const isDetailed = typeof idea === "object";
    const title = isDetailed ? idea.title : idea;
    let viral = isDetailed ? idea.viral_potential || "" : "";
    if (!viral) {
      const idx = (title || "").length % 3;
      viral =
        idx === 0
          ? "Высокий (92%)"
          : idx === 1
            ? "Очень высокий (97%)"
            : "Средний (81%)";
    }
    return viral;
  };

  const parseViralPotential = (viralStr: string) => {
    if (!viralStr) return { level: "Неизвестно", score: 50, color: "bg-neutral-500", textClass: "text-neutral-400" };
    const str = viralStr.toLowerCase();
    
    const pctMatch = viralStr.match(/(\d+)%/);
    if (pctMatch) {
      const score = parseInt(pctMatch[1]);
      let color = "bg-rose-500";
      let textClass = "text-rose-400";
      if (score < 50) {
        color = "bg-blue-500";
        textClass = "text-blue-400";
      } else if (score < 80) {
        color = "bg-amber-500";
        textClass = "text-amber-400";
      }
      return { level: viralStr, score, color, textClass };
    }

    if (str.includes("очень") || str.includes("экстрем") || str.includes("9") || str.includes("100")) {
      return { level: viralStr, score: 95, color: "bg-rose-500", textClass: "text-rose-400" };
    } else if (str.includes("высок") || str.includes("high")) {
      return { level: viralStr, score: 85, color: "bg-rose-500", textClass: "text-rose-400" };
    } else if (str.includes("средн") || str.includes("medium")) {
      return { level: viralStr, score: 65, color: "bg-amber-500", textClass: "text-amber-400" };
    } else {
      return { level: viralStr, score: 40, color: "bg-blue-500", textClass: "text-blue-400" };
    }
  };

  const handleAddFolder = () => {
    const name = newFolderInput.trim();
    if (!name) return;
    if (ideaFolders.includes(name)) {
      toast.error("Такая рубрика уже существует");
      return;
    }
    setIdeaFolders(prev => [...(Array.isArray(prev) ? prev : []), name]);
    setNewFolderInput("");
    toast.success(`Рубрика "${name}" успешно создана`);
  };

  const handleAddTag = () => {
    const name = newTagNameInput.trim();
    if (!name) return;
    const exists = ideaTags.some(tag => tag.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      toast.error("Такая метка уже существует");
      return;
    }
    const id = "tag_" + Date.now();
    setIdeaTags(prev => [...(Array.isArray(prev) ? prev : []), { id, name, color: newTagColorInput }]);
    setNewTagNameInput("");
    toast.success(`Метка "${name}" успешно создана`);
  };

  const handleDeleteFolder = (folderName: string) => {
    setIdeaFolders(prev => (Array.isArray(prev) ? prev : []).filter(f => f !== folderName));
    setIdeaAssignments(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(title => {
        if (next[title]?.folder === folderName) {
          next[title] = { ...next[title], folder: undefined };
        }
      });
      return next;
    });
    toast.success(`Рубрика "${folderName}" удалена`);
  };

  const handleDeleteTag = (tagId: string) => {
    const tag = ideaTags.find(t => t.id === tagId);
    const tagName = tag ? tag.name : "Метка";
    setIdeaTags(prev => (Array.isArray(prev) ? prev : []).filter(t => t.id !== tagId));
    setIdeaAssignments(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(title => {
        if (next[title]?.tags) {
          next[title] = {
            ...next[title],
            tags: next[title].tags.filter(tid => tid !== tagId)
          };
        }
      });
      return next;
    });
    toast.success(`Метка "${tagName}" удалена`);
  };

  const [selectedSceneIndices, setSelectedSceneIndices] = useState<number[]>([]);

  useEffect(() => {
    safeStorage.setItem("yt_idea_playlists", JSON.stringify(ideaPlaylists));
  }, [ideaPlaylists]);

  const handleAddPlaylist = (name?: string) => {
    const rawName = (name !== undefined ? name : newPlaylistName).trim();
    if (!rawName) {
      toast.error("Введите название плейлиста");
      return;
    }
    const formattedName = rawName.match(/^[\p{Emoji}\u2000-\u3300]/u) ? rawName : `🎬 ${rawName}`;
    if (ideaPlaylists.includes(formattedName)) {
      toast.error(`Плейлист "${formattedName}" уже существует`);
      return;
    }
    setIdeaPlaylists(prev => [...(Array.isArray(prev) ? prev : []), formattedName]);
    setNewPlaylistName("");
    setSelectedPlaylistFilter(formattedName);
    toast.success(`Плейлист "${formattedName}" создан!`);
  };

  const handleDeletePlaylist = (playlistName: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIdeaPlaylists(prev => (Array.isArray(prev) ? prev : []).filter(p => p !== playlistName));
    setIdeaAssignments(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(title => {
        if (next[title]?.playlist === playlistName) {
          next[title] = { ...next[title], playlist: undefined };
        }
      });
      return next;
    });
    if (selectedPlaylistFilter === playlistName) {
      setSelectedPlaylistFilter("all");
    }
    toast.success(`Плейлист "${playlistName}" удален`);
  };

  useEffect(() => {
    safeStorage.setItem("yt_user_custom_ideas", JSON.stringify(userCustomIdeas));
  }, [userCustomIdeas]);

  // Keep user custom ideas always merged into nicheData.ideas
  useEffect(() => {
    if (userCustomIdeas.length > 0) {
      setNicheData((prev: any) => {
        const currentIdeas = prev?.ideas || [];
        const existingTitles = new Set(currentIdeas.map((i: any) => typeof i === "string" ? i : i.title));
        const missingUserIdeas = userCustomIdeas.filter((i: any) => !existingTitles.has(typeof i === "string" ? i : i.title));
        if (missingUserIdeas.length === 0) return prev;

        const updated = prev || {
          potential: { demand: 75, competition: 50, monetization: 80, score: 70, summary: "Анализ" },
          subNiches: [],
          branding: { names: [], colors: [], fonts: [] },
          ideas: [],
          popularIdeas: [],
          scriptTemplate: "",
          editingTips: "",
          seo: { keywords: "", hashtags: [], titlePrototypes: [] },
          analytics: "",
          shorts: [],
          competitors: [],
          audienceData: [],
          trendData: []
        };
        return {
          ...updated,
          ideas: [...missingUserIdeas, ...updated.ideas]
        };
      });
    }
  }, [userCustomIdeas]);

  const handleAddManualIdea = () => {
    if (!manualIdeaTitle.trim()) {
      toast.error("Введите название идеи");
      return;
    }

    const title = manualIdeaTitle.trim();
    const newIdea = {
      title,
      description: manualIdeaDescription.trim() || "Пользовательская идея",
      duration: manualIdeaDuration,
      tone: manualIdeaTone,
      viral_potential: "Высокий (100%)",
      isUserCreated: true,
      createdAt: Date.now()
    };

    // 1. Add to userCustomIdeas (persistent)
    setUserCustomIdeas(prev => [newIdea, ...(Array.isArray(prev) ? prev : []).filter(i => (typeof i === 'string' ? i : i.title) !== title)]);

    // 2. Add to nicheData
    setNicheData((prev: any) => {
      const current = prev || {
        potential: { demand: 75, competition: 50, monetization: 80, score: 70, summary: "Анализ" },
        subNiches: [],
        branding: { names: [], colors: [], fonts: [] },
        ideas: [],
        popularIdeas: [],
        scriptTemplate: "",
        editingTips: "",
        seo: { keywords: "", hashtags: [], titlePrototypes: [] },
        analytics: "",
        shorts: [],
        competitors: [],
        audienceData: [],
        trendData: []
      };
      const existing = current.ideas || [];
      const filtered = existing.filter((i: any) => (typeof i === 'string' ? i : i.title) !== title);
      return {
        ...current,
        ideas: [newIdea, ...filtered]
      };
    });

    // 3. Assign playlist if specified
    if (manualIdeaPlaylist) {
      let targetPlaylist = manualIdeaPlaylist;
      if (manualIdeaPlaylist === "__new__") {
        targetPlaylist = "🎬 Мой Плейлист";
        if (!ideaPlaylists.includes(targetPlaylist)) {
          setIdeaPlaylists(prev => [...prev, targetPlaylist]);
        }
      }
      setIdeaAssignments(prev => ({
        ...prev,
        [title]: { ...prev[title], playlist: targetPlaylist }
      }));
    }

    // Reset inputs
    setManualIdeaTitle("");
    setManualIdeaDescription("");
    setManualIdeaPlaylist("");
    setShowCustomIdeasModal(false);
    toast.success(`Идея "${title}" сохранена и добавлена!`);
  };

  const [newFolderName, setNewFolderName] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("blue");
  const [showManageFoldersTags, setShowManageFoldersTags] = useState(false);

  // Intelligent Recommendation Importer State
  const [importModalData, setImportModalData] = useState<{
    content: string;
    isOpen: boolean;
    selectedTarget: string;
    importMode: "append" | "replace";
  }>({
    content: "",
    isOpen: false,
    selectedTarget: "script_wishes",
    importMode: "append"
  });

  useEffect(() => {
    safeStorage.setItem("yt_idea_folders", JSON.stringify(ideaFolders));
  }, [ideaFolders]);

  useEffect(() => {
    safeStorage.setItem("yt_idea_tags", JSON.stringify(ideaTags));
  }, [ideaTags]);

  useEffect(() => {
    safeStorage.setItem("yt_idea_assignments", JSON.stringify(ideaAssignments));
    set("yt_idea_assignments", ideaAssignments).catch(() => {});
  }, [ideaAssignments]);

  const [ideasSortField, setIdeasSortField] = useState<"date" | "viral" | "duration">(() => {
    try {
      return (safeStorage.getItem("yt_ideas_sort_field") as any) || "date";
    } catch {
      return "date";
    }
  });

  const [ideasSortOrder, setIdeasSortOrder] = useState<"desc" | "asc">(() => {
    try {
      return (safeStorage.getItem("yt_ideas_sort_order") as any) || "desc";
    } catch {
      return "desc";
    }
  });

  const [hideExistingInChannel, setHideExistingInChannel] = useState<boolean>(() => {
    try {
      return safeStorage.getItem("yt_hide_existing_in_channel") === "true";
    } catch {
      return false;
    }
  });

  const [isGroupedView, setIsGroupedView] = useState<boolean>(() => {
    try {
      const stored = safeStorage.getItem("yt_is_grouped_view");
      return stored !== null ? stored === "true" : true;
    } catch {
      return true;
    }
  });

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    safeStorage.setItem("yt_hide_existing_in_channel", hideExistingInChannel ? "true" : "false");
    set("yt_hide_existing_in_channel", hideExistingInChannel).catch(() => {});
  }, [hideExistingInChannel]);

  useEffect(() => {
    safeStorage.setItem("yt_is_grouped_view", isGroupedView ? "true" : "false");
    set("yt_is_grouped_view", isGroupedView).catch(() => {});
  }, [isGroupedView]);

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const isIdeaOnChannel = useCallback((title: string, desc?: string) => {
    if (!myChannelVideos || myChannelVideos.length === 0 || !title) return false;
    const cleanTitle = title.toLowerCase().replace(/[^\w\u0400-\u04FF]/g, " ").replace(/\s+/g, " ").trim();
    if (!cleanTitle) return false;
    
    return myChannelVideos.some((v: any) => {
      if (!v.title) return false;
      const cleanVid = v.title.toLowerCase().replace(/[^\w\u0400-\u04FF]/g, " ").replace(/\s+/g, " ").trim();
      if (!cleanVid) return false;
      if (cleanTitle === cleanVid) return true;
      if (cleanTitle.length > 8 && cleanVid.length > 8) {
        if (cleanTitle.includes(cleanVid) || cleanVid.includes(cleanTitle)) return true;
      }
      return false;
    });
  }, [myChannelVideos]);

  const existingChannelMatchesCount = useMemo(() => {
    const currentIdeas = nicheData?.ideas || [];
    if (!Array.isArray(currentIdeas) || !myChannelVideos || myChannelVideos.length === 0) return 0;
    return currentIdeas.filter((idea: any) => {
      const t = typeof idea === "string" ? idea : idea?.title;
      const d = typeof idea === "object" ? idea?.description : undefined;
      return isIdeaOnChannel(t, d);
    }).length;
  }, [nicheData?.ideas, myChannelVideos, isIdeaOnChannel]);

  const [hidePublished, setHidePublished] = useState<boolean>(() => {
    try {
      return safeStorage.getItem("yt_hide_published_ideas") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    safeStorage.setItem("yt_hide_published_ideas", hidePublished ? "true" : "false");
    set("yt_hide_published_ideas", hidePublished).catch(() => {});
  }, [hidePublished]);

  useEffect(() => {
    safeStorage.setItem("yt_ideas_sort_field", ideasSortField);
    set("yt_ideas_sort_field", ideasSortField).catch(() => {});
  }, [ideasSortField]);

  useEffect(() => {
    safeStorage.setItem("yt_ideas_sort_order", ideasSortOrder);
    set("yt_ideas_sort_order", ideasSortOrder).catch(() => {});
  }, [ideasSortOrder]);

  useEffect(() => {
    safeStorage.setItem("yt_selected_status_tag_filter", selectedStatusTagFilter);
    set("yt_selected_status_tag_filter", selectedStatusTagFilter).catch(() => {});
  }, [selectedStatusTagFilter]);

  useEffect(() => {
    // Hydrate state from IndexedDB if available
    get("yt_idea_assignments").then((val) => {
      if (val && typeof val === "object" && Object.keys(val).length > 0) {
        setIdeaAssignments(prev => ({ ...val, ...prev }));
      }
    }).catch(() => {});

    get("yt_ideas_sort_field").then((val) => {
      if (val) setIdeasSortField(val as any);
    }).catch(() => {});

    get("yt_ideas_sort_order").then((val) => {
      if (val) setIdeasSortOrder(val as any);
    }).catch(() => {});

    get("yt_selected_status_tag_filter").then((val) => {
      if (val) setSelectedStatusTagFilter(val as string);
    }).catch(() => {});
  }, []);
  const [thumbnailStyleSuggestions, setThumbnailStyleSuggestions] = useState<any[]>([]);
  const [isGeneratingThumbnailStyles, setIsGeneratingThumbnailStyles] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [recentAccounts, setRecentAccounts] = useState<Array<{ uid: string; email?: string; displayName?: string; photoURL?: string }>>([]);

  useEffect(() => {
    try {
      const stored = safeStorage.getItem("recent_google_accounts");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentAccounts(parsed);
        }
      }
    } catch (e) {
      logger.warn("Failed to load recent Google accounts:", e);
    }
  }, []);

  const rememberRecentAccount = useCallback((profile: any) => {
    if (!profile || (!profile.email && !profile.uid)) return;
    const nextItem = {
      uid: profile.uid || profile.email || `account-${Date.now()}`,
      email: profile.email || profile.uid,
      displayName: profile.displayName || profile.name || profile.email || "Google пользователь",
      photoURL: profile.photoURL || profile.picture
    };

    setRecentAccounts((prev) => {
      const filtered = prev.filter((item) => (item.email || item.uid) !== (nextItem.email || nextItem.uid));
      const merged = [nextItem, ...filtered].slice(0, 5);
      safeStorage.setItem("recent_google_accounts", JSON.stringify(merged));
      return merged;
    });
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
      toast.success("Вход через Google выполнен!");
    } catch (error: any) {
      logger.error("Sign in error:", error);
      toast.error("Не удалось войти: " + (error.message || error));
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      toast.success("Вы вышли из аккаунта.");
    } catch (error: any) {
      logger.error("Sign out error:", error);
      toast.error("Не удалось выйти: " + (error.message || error));
    }
  };

  const handleSwitchAccount = async () => {
    try {
      await logout();
      await signInWithGoogle();
      toast.success("Аккаунт сменён.");
    } catch (error: any) {
      logger.error("Switch account error:", error);
      toast.error("Не удалось сменить аккаунт: " + (error.message || error));
    }
  };

  useEffect(() => {
    if (!isUserMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const trigger = document.getElementById("user-account-trigger");
      const menu = document.getElementById("user-account-menu");

      if (trigger && menu && !trigger.contains(target) && !menu.contains(target)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isUserMenuOpen]);

  useEffect(() => {
    if (!isUserMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const trigger = document.getElementById("user-account-trigger");
      const menu = document.getElementById("user-account-menu");

      if (trigger && menu && !trigger.contains(target) && !menu.contains(target)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isUserMenuOpen]);

  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [deepResearch, setDeepResearch] = useState(() => safeStorage.getItem("yt_deep_research") === "true");

  const [veoSfxEnabled, setVeoSfxEnabled] = useState(() => {
    return safeStorage.getItem("yt_veo_sfx_enabled") !== "false";
  });

  useEffect(() => {
    safeStorage.setItem("yt_veo_sfx_enabled", String(veoSfxEnabled));
  }, [veoSfxEnabled]);

  const [customRules, setCustomRules] = useState<CustomRule[]>(() => {
    const saved = safeStorage.getItem("yt_custom_rules");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    const defaults: CustomRule[] = [
      {
        id: "hook_master", title: "Shorts: Мастер Хуков", isActive: false,
        content: "1. ЗАДАЧА: Сделать первые 3 секунды максимально интригующими и динамичными.\\n2. ВИЗУАЛ: Кадры должны меняться каждую секунду.\\n3. ТЕКСТ: Использовать провокационный вопрос или шокирующее заявление.\\n4. ЗАПРЕЩЕНО: Начинать со слов «Привет», «В этом видео»."
      },
      {
        id: "shorts_link", title: "Shorts: Отсылка на видео", isActive: false,
        content: "1. ЗАДАЧА: Внедрить призыв перейти на длинное связанное видео (Related Video).\\n2. ФОРМАТ ОТСЫЛКИ: Диктор должен сказать фразу, мотивирующую перейти по ссылке.\\n3. ПРИМЕРЫ: «Полный разбор этой темы смотри в связанном видео внизу».\\n4. ЗАПРЕЩЕНО: Заканчивать Shorts без призыва посмотреть полное видео."
      },
      {
        id: "aggressive_seo", title: "Агрессивное SEO (Для новых каналов)", isActive: false,
        content: "------------------------------------------------\\n## РУКОВОДСТВО ПО SEO-ВКЛАДЫШУ:\\n------------------------------------------------\\nВключите этот псевдоним в описание видео: @БИБЛИЯДЛЯЖИЗНИ\\nЗАПРЕЩЕНО: Не вставляйте другие ссылки в описание или закрепленный комментарий.\\nАгрессивная SEO-оптимизация:\\n• Используйте фразы-вопросы из поиска.\\n• Включите ключевые слова в заголовок и первые 2 строки описания.\\n• Добавлять 4 - 5 хештегов.\\n• Добавлять 10 высокочастотных - 10 низкочастотных ключевых слов."
      }
    ];
    const oldInst = safeStorage.getItem("yt_custom_instructions");
    if (oldInst && oldInst.trim()) {
      return [{ id: "migrated-" + Date.now(), title: "Мои инструкции", content: oldInst, isActive: true }, ...defaults];
    }
    return defaults;
  });

  const customInstructions = React.useMemo(() => {
    return customRules.filter(r => r.isActive).map(r => r.content).join("\\n\\n");
  }, [customRules]);

  const [editingRuleData, setEditingRuleData] = useState<CustomRule | null>(null);

  useEffect(() => {
    safeStorage.setItem("yt_custom_rules", JSON.stringify(customRules));
  }, [customRules]);
  const [isCustomInstructionsEnabled, setIsCustomInstructionsEnabled] = useState(() => {
    const stored = safeStorage.getItem("yt_custom_instructions_enabled");
    if (stored !== null) return stored === "true";
    return Boolean(safeStorage.getItem("yt_custom_instructions")?.trim());
  });

  const getCommonAnalysisOptions = useCallback((extraOptions?: AnalysisOptions): AnalysisOptions => {
    const activeInstructions = isCustomInstructionsEnabled || Boolean(customInstructions.trim())
      ? (customInstructions || safeStorage.getItem("yt_custom_instructions") || "")
      : (safeStorage.getItem("yt_custom_instructions_enabled") !== "false" ? safeStorage.getItem("yt_custom_instructions") || "" : "");

    return {
      model: selectedModel,
      customInstructions: activeInstructions,
      deepResearch,
      toneOfVoice,
      region: selectedRegion,
      audiencePortrait: audiencePortrait || undefined,
      veoSfxEnabled,
      existingChannelVideos: (myChannelVideos && myChannelVideos.length > 0) ? myChannelVideos : extraOptions?.existingChannelVideos,
      ...extraOptions,
    };
  }, [selectedModel, isCustomInstructionsEnabled, customInstructions, deepResearch, toneOfVoice, selectedRegion, audiencePortrait, veoSfxEnabled, myChannelVideos]);

  useEffect(() => {
    safeStorage.setItem("yt_custom_instructions", customInstructions);
  }, [customInstructions]);

  useEffect(() => {
    safeStorage.setItem("yt_custom_instructions_enabled", String(isCustomInstructionsEnabled));
  }, [isCustomInstructionsEnabled]);

  useEffect(() => {
    safeStorage.setItem("yt_deep_research", String(deepResearch));
  }, [deepResearch]);
  const [trendingKeywords, setTrendingKeywords] = useState("");
  const [isGeneratingTrendingIdeas, setIsGeneratingTrendingIdeas] =
    useState(false);
  const [selectedIdeasForSeries, setSelectedIdeasForSeries] = useState<
    GeneratedIdea[]
  >([]);
  const [newSeriesName, setNewSeriesName] = useState("");
  const [isGeneratingIdeaDetails, setIsGeneratingIdeaDetails] = useState<Record<string, boolean>>({});
  const [isGeneratingSequels, setIsGeneratingSequels] = useState<Record<string, boolean>>({});
  const [showCustomIdeasModal, setShowCustomIdeasModal] = useState(false);
  const [showCustomInstructionsModal, setShowCustomInstructionsModal] = useState(false);
  const [showFAQModal, setShowFAQModal] = useState(false);
  const [isCheckingCompliance, setIsCheckingCompliance] = useState(false);
  const [complianceResult, setComplianceResult] = useState<{ isCompliant: boolean; missingRules: string[] } | null>(null);
  const [showModelLimitsModal, setShowModelLimitsModal] = useState(false);

  const [selectedIdeasForDeletion, setSelectedIdeasForDeletion] = useState<string[]>([]);
  const [showDeleteConfirmationModal, setShowDeleteConfirmationModal] = useState(false);
  const [deleteConfirmationType, setDeleteConfirmationType] = useState<'single' | 'selected' | 'all'>('selected');
  const [ideaTitleToDelete, setIdeaTitleToDelete] = useState<string | null>(null);
  const [customIdeasDescription, setCustomIdeasDescription] = useState("");
  const [isGeneratingCustomIdeas, setIsGeneratingCustomIdeas] = useState(false);

  const [showQuickNoteModal, setShowQuickNoteModal] = useState(false);
  const [quickNoteIdeaTitle, setQuickNoteIdeaTitle] = useState("");
  const [quickNoteText, setQuickNoteText] = useState("");

  const handleGeminiError = (error: any, defaultMessage: string) => {
    logger.error(defaultMessage, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    let isQuotaError = errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("quota");
    
    // Try to parse JSON if the error message looks like it
    try {
      if (errorMessage.trim().startsWith('{')) {
        const errorObj = JSON.parse(errorMessage);
        if (errorObj?.error?.code === 429 || errorObj?.error?.status === 'RESOURCE_EXHAUSTED' || errorObj?.error?.message?.toLowerCase().includes('quota')) {
          isQuotaError = true;
        }
      }
    } catch (e) { /* ignore */ }

    if (isQuotaError) {
      toast.error(
        "Лимит запросов или квота API исчерпаны. Пожалуйста, подождите некоторое время или проверьте настройки API ключа (Billing/Usage) в Google AI Studio.",
        { duration: 6000 }
      );
    } else {
      const compactError = errorMessage.replace(/\s+/g, " ").trim().slice(0, 240);
      toast.error(compactError ? `${defaultMessage}: ${compactError}` : defaultMessage, { duration: 6000 });
    }
  };
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [editingMessageIdx, setEditingMessageIdx] = useState<number | null>(null);
  const [editingMessageText, setEditingMessageText] = useState("");
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [libraryFilter, setLibraryFilter] = useState<"Все" | "Сессии" | "Идеи" | "Сценарии">("Все");
  const [isBrandingEditingModalOpen, setIsBrandingEditingModalOpen] =
    useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [editingBrandingIndex, setEditingBrandingIndex] = useState<
    number | null
  >(null);
  const [editBrandingName, setEditBrandingName] = useState("");
  const [editBrandingSlogan, setEditBrandingSlogan] = useState("");
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
  const [isGeneratingBanner, setIsGeneratingBanner] = useState(false);
  const [isRewritingBlock, setIsRewritingBlock] = useState<
    Record<number, boolean>
  >({});
  const [isGeneratingSRT, setIsGeneratingSRT] = useState(false);
  const [showYoutubeHelp, setShowYoutubeHelp] = useState(false);

  // Script Comparison Modal State
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [diffVersionAId, setDiffVersionAId] = useState<string>("current");
  const [diffVersionBId, setDiffVersionBId] = useState<string | undefined>(undefined);

  const handleOpenDiffModal = (versionAId = "current", versionBId?: string) => {
    setDiffVersionAId(versionAId);
    setDiffVersionBId(versionBId);
    setIsDiffModalOpen(true);
  };


  // Session State
  const [autosaveEnabled, setAutosaveEnabled] = useState(() => {
    try {
      return safeStorage.getItem("yt_autosave_enabled") !== "false";
    } catch {
      return true;
    }
  });
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);

  const renderHistory = () => {
    const filteredHistory = (historyItems || []).filter((item) => {
      const searchLower = historySearchQuery.toLowerCase();
      // Only show items that match the search query (title or content)
      const title = (item.title || "").toLowerCase();
      const content = (item.content || "").toLowerCase();
      return title.includes(searchLower) || content.includes(searchLower);
    });

    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-2xl font-bold italic tracking-tight text-white">
            История генераций
          </h3>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
                size={14}
              />
              <input
                type="text"
                placeholder="Поиск по истории..."
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                className="w-64 bg-neutral-900 border border-neutral-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
            <div className="text-xs font-mono text-neutral-500 uppercase tracking-widest hidden md:block">
              Всего: {filteredHistory.length}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filteredHistory.length === 0 ? (
            <div className="bg-surface border border-border rounded-2xl p-12 text-center space-y-4">
              <Clock className="mx-auto text-neutral-700" size={48} />
              <p className="text-neutral-500">
                По вашему запросу ничего не найдено или история пока пуста.
              </p>
            </div>
          ) : (
            filteredHistory.map((item, idx) => (
              <div
                key={`history-item-${item.id ?? item.timestamp ?? "entry"}-${idx}`}
                className="bg-surface border border-border rounded-2xl p-6 hover:border-primary/30 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        item.type === "Идея"
                          ? "bg-accent/10 text-accent"
                          : item.type === "Сценарий"
                            ? "bg-primary/10 text-primary"
                            : "bg-emerald-500/10 text-emerald-500"
                      }`}
                    >
                      {item.type === "Идея" ? (
                        <Lightbulb size={18} />
                      ) : item.type === "Сценарий" ? (
                        <FileText size={18} />
                      ) : (
                        <Bot size={18} />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-white group-hover:text-primary transition-colors">
                        {item.title}
                      </h4>
                      <div className="text-[10px] text-neutral-500 uppercase tracking-wider mt-1">
                        {new Date(item.createdAt).toLocaleString()} •{" "}
                        {item.type}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleRestoreFromHistory(item)}
                      className="p-2 text-neutral-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                      title={item.metadata?.isSession || item.type === "История" ? "Восстановить сессию" : "Восстановить данные"}
                    >
                      <RefreshCw size={16} />
                    </button>
                    <button
                      onClick={() => {
                        handleGenerateSequels(item.title, item.content);
                        setActivePage('plan');
                        toast.info(`Генерируем продолжение серии на основе "${item.title}"...`);
                      }}
                      className="p-2 text-neutral-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold"
                      title="Сгенерировать продолжение серии (сиквел)"
                    >
                      <BarChart3 size={16} />
                      <span className="hidden sm:inline">Сиквел</span>
                    </button>
                    <button
                      onClick={() => {
                        copyTextToClipboard(item.content);
                        toast.success("Скопировано в буфер обмена");
                      }}
                      className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                      title="Копировать"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={() => exportToTxt(item.content, item.title)}
                      className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                      title="Скачать .txt"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await deleteDoc(doc(db, "history", item.id));
                          toast.success("Запись удалена");
                        } catch (error) {
                          handleFirestoreError(
                            error,
                            OperationType.DELETE,
                            "history",
                          );
                        }
                      }}
                      className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Удалить"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {item.metadata && (
                  <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {Object.entries(item.metadata).map(([key, value], metadataIdx) => {
                      if (
                        typeof value !== "string" &&
                        typeof value !== "number"
                      )
                        return null;
                      const label =
                        {
                          scriptTopic: "Тема",
                          scriptDuration: "Длительность",
                          scriptMode: "Режим",
                          scriptTone: "Тон",
                          scriptWishes: "Пожелания",
                          promptImages: "Изображения",
                          promptAnimation: "Анимация",
                          promptMusic: "Музыка",
                          idea: "Идея",
                          niche: "Ниша",
                        }[key] || key;
                      return (
                        <div
                          key={`history-metadata-${key || "field"}-${metadataIdx}`}
                          className="p-2 bg-neutral-900/50 rounded-lg border border-border/30"
                        >
                          <p className="text-[9px] text-neutral-500 uppercase font-bold mb-0.5">
                            {label}
                          </p>
                          <p className="text-[10px] text-neutral-300 truncate">
                            {value}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="relative">
                  <div className="text-xs text-neutral-400 line-clamp-2 bg-neutral-950/30 p-3 rounded-xl border border-border/30 italic">
                    {item.content}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // Script Tab State
  const [scriptTopic, setScriptTopic] = useState("");
  const [isEditingScriptTopic, setIsEditingScriptTopic] = useState(false);
  const [editedScriptTopicValue, setEditedScriptTopicValue] = useState("");
  const [isScriptTopicLocked, setIsScriptTopicLocked] = useState(() => {
    try {
      return safeStorage.getItem("yt_script_topic_locked") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    safeStorage.setItem("yt_script_topic_locked", String(isScriptTopicLocked));
  }, [isScriptTopicLocked]);
  const [scriptDuration, setScriptDuration] = useState<number | string>(() => {
    const saved = safeStorage.getItem("yt_script_duration");
    if (saved) {
      const num = Number(saved);
      return isNaN(num) ? saved : num;
    }
    return 10;
  });
  const [scriptCustomDuration, setScriptCustomDuration] = useState(() => {
    return safeStorage.getItem("yt_script_custom_duration") || "";
  });

  const formatScriptDuration = (dur: number | string) => {
    const num = Number(dur);
    if (isNaN(num)) return String(dur);
    if (num < 1) {
      return `${Math.round(num * 60)} сек`;
    }
    return `${num} мин`;
  };
  const [scriptMode, setScriptMode] = useState("Документальный");
  const {
    generatedHooks,
    isGeneratingHooks,
    handleGenerateHooks
  } = useHooksGeneration({ scriptTopic, scriptMode });
  const [scriptCustomMode, setScriptCustomMode] = useState("");
  const [scriptTone, setScriptTone] = useState(
    "Глубокий, аналитический, с элементами сторителлинга",
  );
  const [scriptWishes, setScriptWishes] = useState("");
  const [scriptActiveTab, setScriptActiveTab] = useState(() => {
    try {
      return safeStorage.getItem("yt_script_active_tab") || "editor";
    } catch {
      return "editor";
    }
  });

  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | "all">("all");
  const [blockPreviewModes, setBlockPreviewModes] = useState<Record<number, boolean>>({});

  const handleSelectBlockAndScrollToPrompts = useCallback(
    (blockIndex: number | "all", sceneIndex?: number) => {
      setSelectedBlockIndex(blockIndex);
      setActivePage("Промтинг");

      setTimeout(() => {
        let targetEl: HTMLElement | null = null;
        if (sceneIndex !== undefined && sceneIndex >= 0) {
          targetEl = document.getElementById(`prompt-scene-${sceneIndex}`);
        }
        if (!targetEl && typeof blockIndex === "number") {
          targetEl = document.getElementById(`prompt-block-${blockIndex}`);
        }
        if (!targetEl && typeof blockIndex === "number") {
          targetEl = document.getElementById(`prompt-block-chip-${blockIndex}`);
        }
        if (!targetEl) {
          targetEl = document.getElementById("prompt-section-root");
        }

        if (targetEl) {
          targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
          targetEl.classList.add(
            "ring-4",
            "ring-accent",
            "ring-offset-2",
            "ring-offset-black",
            "transition-all",
            "duration-500"
          );
          setTimeout(() => {
            targetEl?.classList.remove(
              "ring-4",
              "ring-accent",
              "ring-offset-2",
              "ring-offset-black"
            );
          }, 2500);
        }
      }, 200);
    },
    [setActivePage]
  );
  const [scriptNoVoiceover, setScriptNoVoiceover] = useState(() => {
    return safeStorage.getItem("yt_script_no_voiceover") === "true";
  });
  const [scriptReferenceImages, setScriptReferenceImages] = useState<File[]>([]);
  const [scriptYoutubeLinks, setScriptYoutubeLinks] = useState<string[]>([""]);
  const [isReferencesUsed, setIsReferencesUsed] = useState(false);

  const [activePlaybackIndex, setActivePlaybackIndex] = useState<number | null>(null);
  const [playbackTrigger, setPlaybackTrigger] = useState<number>(0);

  useEffect(() => {
    safeStorage.setItem("yt_script_no_voiceover", String(scriptNoVoiceover));
  }, [scriptNoVoiceover]);

  useEffect(() => {
    safeStorage.setItem("yt_script_duration", String(scriptDuration));
  }, [scriptDuration]);

  useEffect(() => {
    safeStorage.setItem("yt_script_custom_duration", scriptCustomDuration);
  }, [scriptCustomDuration]);

  const [scriptStructure, setScriptStructure] = useState<any[]>([]);
  const [pendingScriptAnalysis, setPendingScriptAnalysis] = useState<{ phase: string; content: string }[] | null>(null);
  const [isGeneratingStructure, setIsGeneratingStructure] = useState(false);
  const [isGeneratingFullScript, setIsGeneratingFullScript] = useState(false);
  const [scriptProgress, setScriptProgress] = useState(0);
  const [isParsingUploadedScript, setIsParsingUploadedScript] = useState(false);

  const [selectedLanguage, setSelectedLanguage] = useState("Russian");
  const [isTranslating, setIsTranslating] = useState(false);
  const [generatedBlocks, setGeneratedBlocks] = useState<
    Record<number, GeneratedBlock>
  >({});

  const [transitionPrompts, setTransitionPrompts] = useState<Record<number, any>>({});
  const [generatingTransitions, setGeneratingTransitions] = useState<Record<number, boolean>>({});

  // Per-Block Iteration History
  const [blockHistory, setBlockHistory] = useState<Record<number, BlockIteration[]>>(() => {
    try {
      const saved = safeStorage.getItem("yt_block_history");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      logger.error("Failed to parse block history:", e);
    
  return {};
    }
  });

  useEffect(() => {
    try {
      safeStorage.setItem("yt_block_history", JSON.stringify(blockHistory));
    } catch (e) {
      logger.error("Failed to save block history:", e);
    }
  }, [blockHistory]);

  const recordBlockHistory = useCallback((blockIndex: number, text: string, source: string = "Генерация ИИ") => {
    if (!text || !text.trim()) return;
    setBlockHistory((prev) => {
      const list = prev[blockIndex] || [];
      if (list.length > 0 && list[list.length - 1].text === text) {
        return prev;
      }
      const newEntry: BlockIteration = {
        id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: Date.now(),
        text,
        source,
      };
    
      return {
        ...prev,
        [blockIndex]: [...list, newEntry],
      };
    });
  }, []);

  const deleteBlockIteration = useCallback((blockIdx: number, iterationId: string) => {
    setBlockHistory((prev) => {
      const existing = prev[blockIdx] || [];
      const updated = existing.filter((it) => it.id !== iterationId);
      return {
        ...prev,
        [blockIdx]: updated,
      };
    });
    toast.success("Версия блока удалена из истории!");
  }, []);

  const clearBlockHistory = useCallback((blockIdx: number) => {
    setBlockHistory((prev) => {
      const updated = { ...prev };
      delete updated[blockIdx];
      return updated;
    });
    toast.success("Вся история для этого блока очищена!");
  }, []);

  const {
    handleGenerateVideoSEO,
    handleAnalyzeSEO,
    handleExportSEO,
    applyBroadSEOChange,
    handleApplySEOImprovement,
  } = useSeoGeneration({
    scriptTopic,
    selectedIdea,
    selectedNiche,
    customNiche,
    nicheData,
    selectedRegion,
    scriptStructure,
    generatedBlocks,
    deepResearch,
    getCommonAnalysisOptions,
    handleGeminiError,
  });

  const shorts = useShortsGeneration({
    videoSEO,
    selectedModel,
    isCustomInstructionsEnabled,
    customInstructions,
    nicheData,
    selectedBranding,
    generatedBlocks,
    handleGeminiError,
  });

  const [blockHistoryModalIndex, setBlockHistoryModalIndex] = useState<number | null>(null);
  const blockTextareaRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});

  const [editingBlockModalIndex, setEditingBlockModalIndex] = useState<number | null>(null);
  const [detailedMusicModalBlockIndex, setDetailedMusicModalBlockIndex] = useState<number | null>(null);
  const [editingBlockModalText, setEditingBlockModalText] = useState<string>("");
  const [editingBlockModalScene, setEditingBlockModalScene] = useState<string>("");
  const [editingBlockModalSampleContext, setEditingBlockModalSampleContext] = useState<string>("");
  const [editingBlockModalTitle, setEditingBlockModalTitle] = useState<string>("");

  const filteredIdeas = useMemo(() => {
    if (!nicheData || !nicheData.ideas) return [];
    return nicheData.ideas.filter((idea: any) => {
      const title = typeof idea === "string" ? idea : idea.title;
      const isDetailed = typeof idea === "object";

      // 1. Search Query Filter
      if (ideasSearchQuery.trim()) {
        const q = ideasSearchQuery.toLowerCase().trim();
        const desc = isDetailed ? (idea.description || "") : "";
        if (!title.toLowerCase().includes(q) && !desc.toLowerCase().includes(q)) {
          return false;
        }
      }

      const assignment = ideaAssignments[title] || {};

      // 2. Combined Status & Tag Filter
      if (selectedStatusTagFilter !== "all") {
        if (selectedStatusTagFilter.startsWith("status:")) {
          const targetStatus = selectedStatusTagFilter.replace("status:", "");
          const assignedStatus = assignment.status || "Идея";
          if (assignedStatus !== targetStatus) return false;
        } else if (selectedStatusTagFilter.startsWith("tag:")) {
          const targetTagId = selectedStatusTagFilter.replace("tag:", "");
          const assignedTags = assignment.tags || [];
          if (!assignedTags.includes(targetTagId)) return false;
        } else if (selectedStatusTagFilter === "no_tags") {
          const assignedTags = assignment.tags || [];
          if (assignedTags.length > 0) return false;
        }
      }

      // 3. Playlist Assignment Filter
      if (selectedPlaylistFilter !== "all") {
        const assignedPlaylist = assignment.playlist || "Без плейлиста";
        if (selectedPlaylistFilter === "none") {
          if (assignedPlaylist !== "Без плейлиста" && assignedPlaylist !== "none") return false;
        } else {
          if (assignedPlaylist !== selectedPlaylistFilter) return false;
        }
      }

      // 4. Status Filter for Hide Published
      if (hidePublished && !selectedStatusTagFilter.includes("Опубликовано")) {
        const assignedStatus = assignment.status || "Идея";
        if (assignedStatus === "Опубликовано") return false;
      }

      // 5. Filter out existing videos from the channel list
      if (hideExistingInChannel && isIdeaOnChannel(title, isDetailed ? idea.description : undefined)) {
        return false;
      }

      return true;
    });
  }, [
    nicheData,
    ideasSearchQuery,
    ideaAssignments,
    selectedStatusTagFilter,
    selectedPlaylistFilter,
    hidePublished,
    hideExistingInChannel,
    isIdeaOnChannel
  ]);

  const sortedIdeas = useMemo(() => {
    return [...filteredIdeas].sort((a: any, b: any) => {
      if (ideasSortField === "viral") {
        const getViralNum = (idea: any) => {
          const isDet = typeof idea === "object";
          let v = isDet ? idea.viral_potential || "" : "";
          if (!v && isDet) {
            const idx = (isDet ? idea.title : "").length % 3;
            v = idx === 0 ? "92%" : idx === 1 ? "97%" : "81%";
          }
          const m = v.match(/\d+/);
          return m ? parseInt(m[0]) : 0;
        };
        const valA = getViralNum(a);
        const valB = getViralNum(b);
        return ideasSortOrder === "desc" ? valB - valA : valA - valB;
      } else if (ideasSortField === "duration") {
        const getDurationNum = (idea: any) => {
          const isDet = typeof idea === "object" && idea !== null;
          if (!isDet || !idea.duration) return 0;
          const d = String(idea.duration).toLowerCase();
          const m = d.match(/\d+/);
          let val = m ? parseInt(m[0]) : 0;
          if (d.includes("сек") || d.includes(" s") || d.includes("second")) {
            val = val / 60;
          }
          return val;
        };
        const valA = getDurationNum(a);
        const valB = getDurationNum(b);
        return ideasSortOrder === "desc" ? valB - valA : valA - valB;
      } else {
        // Sort by creation date or index (newest first on desc)
        const getIdeaTimestamp = (idea: any) => {
          if (typeof idea === "object" && idea !== null && idea.createdAt) {
            return typeof idea.createdAt === "number" ? idea.createdAt : new Date(idea.createdAt).getTime();
          }
          const idx = (nicheData?.ideas || []).indexOf(idea);
          return idx >= 0 ? idx : 0;
        };
        const timeA = getIdeaTimestamp(a);
        const timeB = getIdeaTimestamp(b);
        return ideasSortOrder === "desc" ? timeB - timeA : timeA - timeB;
      }
    });
  }, [filteredIdeas, ideasSortField, ideasSortOrder, nicheData]);

  const groupedClusters = useMemo(() => {
    if (!sortedIdeas || sortedIdeas.length === 0) return [];
    
    const processedIdeaTitles = new Set<string>();
    const clusters: Array<{
      id: string;
      type: "playlist" | "continuation" | "standalone";
      title: string;
      playlistName?: string;
      parentChannelVideo?: any;
      parentIdea?: any;
      sequelIdeas: any[];
    }> = [];

    const findParentTitle = (title: string, description?: string) => {
      const fullText = (title + " " + (description || "")).toLowerCase();
      
      const quoteMatch = fullText.match(/(?:продолжение|сиквел|часть|part).*?[«""“]([^»"”]+)[»"”]/i);
      if (quoteMatch && quoteMatch[1]) {
        const rawQuote = quoteMatch[1].trim();
        const matchIdea = sortedIdeas.find(i => {
          const t = typeof i === "string" ? i : i.title;
          return t && (t.toLowerCase().includes(rawQuote.toLowerCase()) || rawQuote.toLowerCase().includes(t.toLowerCase()));
        });
        if (matchIdea) return { title: typeof matchIdea === "string" ? matchIdea : matchIdea.title, isChannel: false };

        const matchChannel = (myChannelVideos || []).find(v => {
          return v.title && (v.title.toLowerCase().includes(rawQuote.toLowerCase()) || rawQuote.toLowerCase().includes(v.title.toLowerCase()));
        });
        if (matchChannel) return { title: matchChannel.title, isChannel: true, video: matchChannel };
      }

      const partMatch = title.match(/^(.*?)(?:\s*(?:—|-|: me|\|\()\s*(?:Часть|Part|ч\.|#)\s*([2-9]|\d+)\)?)$/i);
      if (partMatch && partMatch[1]) {
        const base = partMatch[1].trim().toLowerCase();
        const matchIdea = sortedIdeas.find(i => {
          const t = typeof i === "string" ? i : i.title;
          return t && t.toLowerCase() !== title.toLowerCase() && (t.toLowerCase().includes(base) || base.includes(t.toLowerCase()));
        });
        if (matchIdea) return { title: typeof matchIdea === "string" ? matchIdea : matchIdea.title, isChannel: false };

        const matchChannel = (myChannelVideos || []).find(v => {
          return v.title && (v.title.toLowerCase().includes(base) || base.includes(v.title.toLowerCase()));
        });
        if (matchChannel) return { title: matchChannel.title, isChannel: true, video: matchChannel };
      }

      if (fullText.includes("продолжени") || fullText.includes("сиквел") || fullText.includes("часть 2") || fullText.includes("вторая часть")) {
        for (const i of sortedIdeas) {
          const t = typeof i === "string" ? i : i.title;
          if (t && t.toLowerCase() !== title.toLowerCase() && t.length > 5 && fullText.includes(t.toLowerCase().slice(0, 15))) {
            return { title: t, isChannel: false };
          }
        }
        for (const v of (myChannelVideos || [])) {
          if (v.title && v.title.length > 5 && fullText.includes(v.title.toLowerCase().slice(0, 15))) {
            return { title: v.title, isChannel: true, video: v };
          }
        }
      }

      return null;
    };

    // STEP 1: Playlist Clusters
    const playlistMap = new Map<string, any[]>();
    sortedIdeas.forEach(idea => {
      const t = typeof idea === "string" ? idea : idea.title;
      const pl = ideaAssignments[t]?.playlist;
      if (pl && pl !== "Без плейлиста" && pl !== "none") {
        if (!playlistMap.has(pl)) playlistMap.set(pl, []);
        playlistMap.get(pl)!.push(idea);
      }
    });

    playlistMap.forEach((items, playlistName) => {
      if (items.length >= 2) {
        items.forEach(item => {
          const t = typeof item === "string" ? item : item.title;
          processedIdeaTitles.add(t);
        });
        clusters.push({
          id: `pl-cluster-${playlistName}`,
          type: "playlist",
          title: playlistName,
          playlistName,
          parentIdea: items[0],
          sequelIdeas: items.slice(1)
        });
      }
    });

    // STEP 2: Continuation Clusters
    const unassignedIdeas = sortedIdeas.filter(idea => {
      const t = typeof idea === "string" ? idea : idea.title;
      return !processedIdeaTitles.has(t);
    });

    const parentToChildren = new Map<string, { parentInfo: any; children: any[] }>();

    unassignedIdeas.forEach(idea => {
      const t = typeof idea === "string" ? idea : idea.title;
      const desc = typeof idea === "object" ? idea.description : undefined;
      const parentRef = findParentTitle(t, desc);

      if (parentRef) {
        const pTitle = parentRef.title;
        if (!parentToChildren.has(pTitle)) {
          parentToChildren.set(pTitle, { parentInfo: parentRef, children: [] });
        }
        parentToChildren.get(pTitle)!.children.push(idea);
      }
    });

    parentToChildren.forEach(({ parentInfo, children }, pTitle) => {
      const parentIdeaInList = unassignedIdeas.find(i => (typeof i === "string" ? i : i.title) === pTitle);

      if (parentIdeaInList) {
        processedIdeaTitles.add(pTitle);
        children.forEach(c => processedIdeaTitles.add(typeof c === "string" ? c : c.title));

        clusters.push({
          id: `seq-cluster-${pTitle}`,
          type: "continuation",
          title: pTitle,
          parentIdea: parentIdeaInList,
          sequelIdeas: children
        });
      } else if (parentInfo.isChannel && parentInfo.video) {
        children.forEach(c => processedIdeaTitles.add(typeof c === "string" ? c : c.title));

        clusters.push({
          id: `seq-channel-cluster-${pTitle}`,
          type: "continuation",
          title: pTitle,
          parentChannelVideo: parentInfo.video,
          sequelIdeas: children
        });
      }
    });

    // STEP 3: Remaining Standalone Ideas
    sortedIdeas.forEach(idea => {
      const t = typeof idea === "string" ? idea : idea.title;
      if (!processedIdeaTitles.has(t)) {
        clusters.push({
          id: `standalone-${t}`,
          type: "standalone",
          title: t,
          parentIdea: idea,
          sequelIdeas: []
        });
      }
    });

    return clusters;
  }, [sortedIdeas, myChannelVideos, ideaAssignments]);

  const handleUpdateBlockTitle = (index: number, newTitle: string) => {
    setScriptStructure((prev) => {
      if (!prev) return prev;
      const updated = [...prev];
      if (!updated[index]) return prev;
      updated[index] = { ...updated[index], title: newTitle };
      return updated;
    });
    setGeneratedBlocks((prev) => {
      if (!prev || !prev[index]) return prev;
      return {
        ...prev,
        [index]: { ...prev[index], title: newTitle }
      };
    });
  };
  const [scriptVersions, setScriptVersions] = useState<any[]>(() => {
    try {
      const saved = safeStorage.getItem("yt_script_versions");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return [];
    } catch (e) {
      logger.error("Failed to parse script versions:", e);
      return [];
    }
  });
  const [activeVersionId, setActiveVersionId] = useState<string | null>(() => {
    return safeStorage.getItem("yt_script_active_version_id") || null;
  });
  const [lastFirebaseSave, setLastFirebaseSave] = useState<Date | null>(null);
  const [isSavingToFirebase, setIsSavingToFirebase] = useState(false);

  useEffect(() => {
    try {
      safeStorage.setItem("yt_script_versions", JSON.stringify(scriptVersions));
    } catch (e) {
      logger.error("Failed to save script versions:", e);
    }
  }, [scriptVersions]);

  useEffect(() => {
    if (activeVersionId) {
      safeStorage.setItem("yt_script_active_version_id", activeVersionId);
    } else {
      safeStorage.removeItem("yt_script_active_version_id");
    }
  }, [activeVersionId]);

  // 1. Subscribe to Firebase script_versions collection
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "script_versions"),
      where("uid", "==", user.uid)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({
          ...(d.data() as any),
          id: d.id,
        }));
        items.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        if (items.length > 0) {
          setScriptVersions(items);
        }
      },
      (error) => {
        logger.warn("Firestore script_versions snapshot error:", error);
      }
    );
    return () => unsubscribe();
  }, [user]);

  // 2. Load latest active script state from Firebase on mount/login
  useEffect(() => {
    if (!user) return;
    const loadStateFromFirebase = async () => {
      try {
        const stateDoc = await getDoc(doc(db, "script_states", user.uid));
        if (stateDoc.exists()) {
          const data = stateDoc.data();
          if (data) {
            if (data.generatedBlocks && Object.keys(data.generatedBlocks).length > 0) {
              setGeneratedBlocks(data.generatedBlocks);
            }
            if (data.scriptStructure && data.scriptStructure.length > 0) {
              setScriptStructure(data.scriptStructure);
            }
            if (data.scriptTopic) setScriptTopic(data.scriptTopic);
            if (data.scriptWishes) setScriptWishes(data.scriptWishes);
            if (data.scriptDuration) setScriptDuration(data.scriptDuration);
            if (data.scriptCustomDuration) setScriptCustomDuration(data.scriptCustomDuration);
            if (data.activeVersionId) setActiveVersionId(data.activeVersionId);
            if (data.transitionPrompts) setTransitionPrompts(data.transitionPrompts);
            if (data.updatedAt) setLastFirebaseSave(new Date(data.updatedAt));
          }
        }
      } catch (err) {
        logger.warn("Could not load script state from Firebase:", err);
      }
    };
    loadStateFromFirebase();
  }, [user]);

  // 3. Debounced auto-save script state to Firebase when blocks/structure change
  useEffect(() => {
    if (!user) return;
    // Don't auto-save completely empty state
    if (
      !scriptTopic &&
      (!scriptStructure || scriptStructure.length === 0) &&
      (!generatedBlocks || Object.keys(generatedBlocks).length === 0)
    ) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSavingToFirebase(true);
        setSyncStatus("saving");
        setShowSyncNotification(true);
        const payload = {
          uid: user.uid,
          scriptTopic: scriptTopic || "",
          scriptStructure: scriptStructure || [],
          generatedBlocks: generatedBlocks || {},
          transitionPrompts: transitionPrompts || {},
          scriptWishes: scriptWishes || "",
          scriptDuration: scriptDuration || 10,
          scriptCustomDuration: scriptCustomDuration || "",
          activeVersionId: activeVersionId || null,
          updatedAt: new Date().toISOString(),
        };
        await setDoc(doc(db, "script_states", user.uid), payload, { merge: true });
        setLastFirebaseSave(new Date());
        setSyncStatus("success");
        setTimeout(() => {
          setShowSyncNotification(false);
        }, 4000);
      } catch (e) {
        logger.error("Firebase script auto-save failed:", e);
        setSyncStatus("idle");
        setShowSyncNotification(false);
      } finally {
        setIsSavingToFirebase(false);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [user, generatedBlocks, transitionPrompts, scriptStructure, scriptTopic, scriptWishes, scriptDuration, scriptCustomDuration, activeVersionId]);

  const saveScriptVersion = async (name?: string, changeSummary?: string) => {
    const timeStr = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const versionName = name || `Версия от ${timeStr}`;
    const versionId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `ver_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newVersion = {
      id: versionId,
      uid: user?.uid || "mock-user-123",
      timestamp: Date.now(),
      name: versionName,
      changeSummary: changeSummary || "",
      blocks: { ...generatedBlocks },
      structure: [...scriptStructure],
      scriptTopic: scriptTopic || "Без темы",
      scriptWishes: scriptWishes || "",
      createdAt: new Date().toISOString(),
    };

    setScriptVersions((prev) => [newVersion, ...(Array.isArray(prev) ? prev : []).filter((v) => v.id !== versionId)]);
    setActiveVersionId(versionId);

    try {
      setIsSavingToFirebase(true);
      setSyncStatus("saving");
      setShowSyncNotification(true);
      if (user) {
        await setDoc(doc(db, "script_versions", versionId), newVersion);
        await setDoc(
          doc(db, "script_states", user.uid),
          {
            uid: user.uid,
            scriptTopic: scriptTopic || "",
            scriptStructure: scriptStructure || [],
            generatedBlocks: generatedBlocks || {},
            activeVersionId: versionId,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        setLastFirebaseSave(new Date());
        setSyncStatus("success");
        setTimeout(() => {
          setShowSyncNotification(false);
        }, 4000);
      }
      toast.success(`Версия "${versionName}" сохранена в Firebase!`);
    } catch (e) {
      logger.error("Failed to save script version to Firebase:", e);
      setSyncStatus("idle");
      setShowSyncNotification(false);
      toast.success(`Версия "${versionName}" сохранена!`);
    } finally {
      setIsSavingToFirebase(false);
    }
  };

  const updateChangeSummaryScriptVersion = async (id: string, newSummary: string) => {
    setScriptVersions((prev) =>
      (Array.isArray(prev) ? prev : []).map((v) => (v.id === id ? { ...v, changeSummary: newSummary } : v))
    );
    if (user) {
      try {
        await setDoc(
          doc(db, "script_versions", id),
          { changeSummary: newSummary },
          { merge: true }
        );
      } catch (e) {
        logger.error("Failed to update version change summary in Firebase:", e);
      }
    }
  };

  const loadScriptVersion = (version: any) => {
    setGeneratedBlocks(version.blocks || {});
    setScriptStructure(version.structure || []);
    if (version.scriptTopic) setScriptTopic(version.scriptTopic);
    if (version.scriptWishes) setScriptWishes(version.scriptWishes);
    setActiveVersionId(version.id);
    toast.success(`Загружена версия: ${version.name}`);
  };

  const deleteScriptVersion = async (id: string) => {
    setScriptVersions((prev) => (Array.isArray(prev) ? prev : []).filter((v) => v.id !== id));
    if (activeVersionId === id) setActiveVersionId(null);

    try {
      if (user) {
        await deleteDoc(doc(db, "script_versions", id));
      }
      toast.info("Версия удалена из Firebase");
    } catch (e) {
      logger.error("Failed to delete script version from Firebase:", e);
      toast.info("Версия удалена");
    }
  };

  const renameScriptVersion = async (id: string, newName: string) => {
    if (!newName.trim()) return;
    setScriptVersions((prev) =>
      (Array.isArray(prev) ? prev : []).map((v) => (v.id === id ? { ...v, name: newName } : v))
    );
    if (user) {
      try {
        await setDoc(
          doc(db, "script_versions", id),
          { name: newName },
          { merge: true }
        );
        toast.success("Название версии обновлено в Firebase");
      } catch (e) {
        logger.error("Failed to rename version in Firebase:", e);
      }
    }
  };

  const [blockRefinements, setBlockRefinements] = useState<
    Record<number, string>
  >({});
  const [isGeneratingBlock, setIsGeneratingBlock] = useState<
    Record<number, boolean>
  >({});
  const [isUpdatingMusicPrompt, setIsUpdatingMusicPrompt] = useState<
    Record<number, boolean>
  >({});
  const [isUpdatingSceneContext, setIsUpdatingSceneContext] = useState<
    Record<number, boolean>
  >({});

  // Breakdown Tab State
  const [scriptBreakdown, setScriptBreakdown] = useState<SceneBreakdown[]>([]);
  const [scriptImprovements, setScriptImprovements] = useState<any[]>([]);
  const [isAnalyzingScript, setIsAnalyzingScript] = useState(false);
  const [isApplyingImprovement, setIsApplyingImprovement] = useState<Record<number, boolean>>({});
  const [isApplyingAllRecs, setIsApplyingAllRecs] = useState(false);
  const [isFixingGrammarBlock, setIsFixingGrammarBlock] = useState<Record<number, boolean>>({});
  const [isFixingGrammarAll, setIsFixingGrammarAll] = useState(false);
  const [grammarDiffs, setGrammarDiffs] = useState<Record<number, { oldText: string; newText: string }>>({});
  const [annotatedScenes, setAnnotatedScenes] = useState<
    Record<number, string>
  >({});
  const [isAnnotating, setIsAnnotating] = useState<Record<number, boolean>>({});
  const [isGeneratingBreakdown, setIsGeneratingBreakdown] = useState(false);
  const [customCompetitorInsights, setCustomCompetitorInsights] = useState<string | null>(null);

  // Firebase Real-time script save notification states
  const [syncStatus, setSyncStatus] = useState<"saving" | "success" | "idle">("idle");
  const [showSyncNotification, setShowSyncNotification] = useState(false);

  // Production Tab State
  const [promptImageStyle, setPromptImageStyle] = useState("");
  const [promptAnimationType, setPromptAnimationType] = useState("");
  const [promptMusicMood, setPromptMusicMood] = useState("");
  const [generalAudioPrompt, setGeneralAudioPrompt] = useState("");
  const [musicContinuityEnabled, setMusicContinuityEnabled] = useState(true);
  const [scenePrompts, setScenePrompts] = useState<any[]>([]);
  const [isGeneratingGlobalProduction, setIsGeneratingGlobalProduction] = useState(false);
  const [promoImages, setPromoImages] = useState<Record<number, string>>({});
  const [isGeneratingPromoImages, setIsGeneratingPromoImages] = useState(false);
  const [pinnedStyles, setPinnedStyles] = useState<{
    imageStyle: boolean;
    animationType: boolean;
    audioEnvironment: boolean;
  }>({
    imageStyle: false,
    animationType: false,
    audioEnvironment: false,
  });
  const isStylePinned = pinnedStyles.imageStyle || pinnedStyles.animationType || pinnedStyles.audioEnvironment;
  const setIsStylePinned = (val: boolean) => {
    setPinnedStyles({
      imageStyle: val,
      animationType: val,
      audioEnvironment: val,
    });
  };

  // Visual Identity State
  const [logoVariants, setLogoVariants] = useState<string[]>([]);
  const [bannerVariants, setBannerVariants] = useState<string[]>([]);
  const [isGeneratingBrandingVisuals, setIsGeneratingBrandingVisuals] =
    useState(false);

  // Content Ideas States
  const [generatedCTAs, setGeneratedCTAs] = useState<Record<string, string>>(
    {},
  );
  const [isGeneratingCTA, setIsGeneratingCTA] = useState<string | null>(null);

  // --- Session Management ---
  const validateAndEnrichPrompt = (basePrompt: string, wishes: string, structure: any[]): string => {
    let enriched = basePrompt;
    
    // Ensure "Особые пожелания" are included
    if (wishes && !enriched.includes(wishes.substring(0, 20))) {
      enriched += `\n\n[ВАЖНЫЕ ПОЖЕЛАНИЯ ПОЛЬЗОВАТЕЛЯ]:\n${wishes}`;
    }
    
    // Ensure "Структура" is explicitly respected
    if (structure && structure.length > 0 && !enriched.includes("СТРУКТУРА")) {
      const structureList = structure.map((s, i) => `${i + 1}. ${s.title}`).join("\n");
      enriched += `\n\n[СОБЛЮДАЙ СЛЕДУЮЩУЮ СТРУКТУРУ]:\n${structureList}`;
    }
    
    logger.log("System context verified and enriched for Gemini API call.");
    return enriched;
  };

  const getSessionData = () => {
  
  return {
      version: 1,
      timestamp: new Date().toISOString(),
      data: {
        activePage,
        selectedNiche,
        isCustomNiche,
        customNiche,
        nicheData,
        scriptKeywords,
        trendingKeywords,
        trendingIdeas,
        selectedIdea,
        aiAssistantMessages,
        scriptTopic,
        isScriptTopicLocked,
        scriptDuration,
        scriptCustomDuration,
        scriptMode,
        scriptCustomMode,
        scriptTone,
        scriptWishes,
        scriptStructure,
        generatedBlocks,
        scriptVersions,
        activeVersionId,
        scriptBreakdown,
        blockRefinements,
        promptImageStyle,
        promptAnimationType,
        promptMusicMood,
        generalAudioPrompt,
        musicContinuityEnabled,
        veoSfxEnabled,
        isStylePinned,
        pinnedStyles,
        scenePrompts,
        transitionPrompts,
        annotatedScenes,
        promoImages,
        videoSEO,
        seoAnalysis,
        previewThumbnail,
        thumbnailVariants,
        titleAnalysis,
        logoVariants,
        bannerVariants,
      },
    };
  };

  const applySessionData = (session: any) => {
    if (!session || !session.data) return;
    const { data } = session;
    if (data.activePage !== undefined) setActivePage(data.activePage);
    if (data.selectedNiche !== undefined) setSelectedNiche(data.selectedNiche);
    if (data.isCustomNiche !== undefined) setIsCustomNiche(data.isCustomNiche);
    if (data.customNiche !== undefined) setCustomNiche(data.customNiche);
    if (data.nicheData !== undefined) setNicheData(data.nicheData);
    if (data.scriptKeywords !== undefined)
      setScriptKeywords(data.scriptKeywords);
    if (data.trendingKeywords !== undefined)
      setTrendingKeywords(data.trendingKeywords);
    if (data.trendingIdeas !== undefined) setTrendingIdeas(data.trendingIdeas);
    if (data.selectedIdea !== undefined) setSelectedIdea(data.selectedIdea);
    if (data.aiAssistantMessages !== undefined)
      setAiAssistantMessages(data.aiAssistantMessages);

    // Script & Production state
    if (data.scriptTopic !== undefined) setScriptTopic(data.scriptTopic);
    if (data.isScriptTopicLocked !== undefined) setIsScriptTopicLocked(data.isScriptTopicLocked);
    if (data.scriptDuration !== undefined)
      setScriptDuration(data.scriptDuration);
    if (data.scriptCustomDuration !== undefined)
      setScriptCustomDuration(data.scriptCustomDuration);
    if (data.scriptMode !== undefined) setScriptMode(data.scriptMode);
    if (data.scriptCustomMode !== undefined)
      setScriptCustomMode(data.scriptCustomMode);
    if (data.scriptTone !== undefined) setScriptTone(data.scriptTone);
    if (data.scriptWishes !== undefined) setScriptWishes(data.scriptWishes);
    if (data.scriptStructure !== undefined)
      setScriptStructure(data.scriptStructure);
    if (data.generatedBlocks !== undefined)
      setGeneratedBlocks(data.generatedBlocks);
    if (data.scriptVersions !== undefined)
      setScriptVersions(data.scriptVersions);
    if (data.activeVersionId !== undefined)
      setActiveVersionId(data.activeVersionId);
    if (data.scriptBreakdown !== undefined)
      setScriptBreakdown(data.scriptBreakdown);
    if (data.blockRefinements !== undefined)
      setBlockRefinements(data.blockRefinements);

    // Prompting state
    if (data.isStylePinned !== undefined) setIsStylePinned(data.isStylePinned);
    if (data.pinnedStyles !== undefined) setPinnedStyles(data.pinnedStyles);
    if (data.promptImageStyle !== undefined) setPromptImageStyle(data.promptImageStyle);
    if (data.promptAnimationType !== undefined) setPromptAnimationType(data.promptAnimationType);
    if (data.promptMusicMood !== undefined) setPromptMusicMood(data.promptMusicMood);
    if (data.generalAudioPrompt !== undefined) setGeneralAudioPrompt(data.generalAudioPrompt);
    if (data.musicContinuityEnabled !== undefined) setMusicContinuityEnabled(data.musicContinuityEnabled);
    if (data.veoSfxEnabled !== undefined) setVeoSfxEnabled(data.veoSfxEnabled);
    if (data.scenePrompts !== undefined) setScenePrompts(data.scenePrompts);
    if (data.transitionPrompts !== undefined) setTransitionPrompts(data.transitionPrompts);
    if (data.annotatedScenes !== undefined) setAnnotatedScenes(data.annotatedScenes);
    if (data.promoImages !== undefined) setPromoImages(data.promoImages);

    if (data.videoSEO !== undefined) setVideoSEO(data.videoSEO);
    if (data.seoAnalysis !== undefined) setSeoAnalysis(data.seoAnalysis);
    if (data.previewThumbnail !== undefined)
      setPreviewThumbnail(data.previewThumbnail);
    if (data.thumbnailVariants !== undefined)
      setThumbnailVariants(data.thumbnailVariants);
    if (data.logoVariants !== undefined) setLogoVariants(data.logoVariants);
    if (data.bannerVariants !== undefined)
      setBannerVariants(data.bannerVariants);
    if (data.titleAnalysis !== undefined) setTitleAnalysis(data.titleAnalysis);

    toast.success("Сессия успешно восстановлена");
  };

  const performAutosave = async () => {
    const sessionData = getSessionData();

    // Do not autosave if the session is completely empty (prevents overwriting backups on fresh load)
    if (
      !sessionData.data.selectedNiche &&
      !sessionData.data.customNiche &&
      sessionData.data.aiAssistantMessages.length === 0 &&
      !sessionData.data.scriptTopic
    ) {
      return;
    }

    // Always save to IndexedDB as a fallback (which has much larger quota)
    try {
      await set("autosave_backup", sessionData);
      setLastSavedTime(new Date());

      // Save a lightweight timestamp to localStorage instead of the massive full state to prevent QuotaExceededError
      try {
        safeStorage.setItem(
          "yt_creator_session_autosave_timestamp",
          new Date().toISOString()
        );
      } catch (localError) {
        // Silently catch quota or security restriction errors in sandboxed iframes
      }
    } catch (e) {
      logger.error("Autosave to IndexedDB failed:", e);
    }
  };

  const performAutosaveRef = useRef(performAutosave);
  useEffect(() => {
    performAutosaveRef.current = performAutosave;
  });

  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      const msg = event.message || "";
      if (
        msg.includes("ResizeObserver") ||
        msg.includes("Script error") ||
        msg.includes("QuotaExceededError")
      ) {
        return;
      }
      logger.warn("Global Error captured:", event.error || event.message);
      toast.error(`Критическая ошибка: ${msg}`, {
        duration: 8000,
      });
    };

    const handleGlobalRejection = (event: PromiseRejectionEvent) => {
      const reasonObj = event.reason;
      if (!reasonObj) return;
      const reason = reasonObj instanceof Error ? reasonObj.message : String(reasonObj);
      if (
        reasonObj.name === "AbortError" ||
        reason.includes("closed") ||
        reason.includes("canceled") ||
        reason.includes("cancelled") ||
        reason.includes("ResizeObserver") ||
        reason.includes("QuotaExceededError") ||
        reason === "undefined" ||
        reason === "[object Object]"
      ) {
        event.preventDefault();
        return;
      }
      logger.warn("Unhandled Rejection captured:", reasonObj);
      toast.error(`Ошибка асинхронной операции: ${reason}`, {
        duration: 8000,
      });
      event.preventDefault();
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleGlobalRejection);

    // We always run performAutosave to ensure IndexedDB fallback works
    const timer = setInterval(() => {
      performAutosaveRef.current();
    }, 10000); // 10 seconds interval

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleGlobalRejection);
      clearInterval(timer);
    };
  }, []);

  const handleAnalyzeTitles = async () => {
    const topicToUse = scriptTopic || selectedIdea;
    if (!videoSEO || !topicToUse || !selectedNiche) {
      toast.error("Сначала сгенерируйте SEO для видео");
      return;
    }

    setIsAnalyzingTitles(true);
    try {
      const niche = selectedNiche || customNiche;
      // We pass the current title and maybe some alternatives from SEO if we had them, OR just the current one
      const analysis = await analyzeTitlesUniqueness(
        [videoSEO.title],
        topicToUse,
        niche,
        getCommonAnalysisOptions()
      );
      setTitleAnalysis(analysis);
      toast.success("Анализ заголовков завершен");
    } catch (error) {
      handleGeminiError(error, "Ошибка при анализе заголовков");
    } finally {
      setIsAnalyzingTitles(false);
    }
  };

  // Autosave consolidated to performAutosave using IndexedDB

  const handleClearPromptingData = () => {
    setPromptImageStyle("");
    setPromptAnimationType("");
    setPromptMusicMood("");
    setGeneralAudioPrompt("");
    setScenePrompts([]);
    setTransitionPrompts({});
    setIsStylePinned(false);
    toast.success("Данные вкладки Промтинг очищены");
  };

  const handleGenerateGlobalProduction = async () => {
    const topicToUse = scriptTopic || selectedIdea || "Сценарий";
    const fullScriptText = getFullScriptText(generatedBlocks);

    if (!topicToUse && !fullScriptText) {
      toast.error("Сначала сгенерируйте или введите сценарий");
      return;
    }

    const getCurrentPromptScenes = () => {
      const unifiedScenes = getUnifiedScriptScenes(scriptBreakdown, generatedBlocks, scriptStructure);
      if (unifiedScenes.length === 0) return [];

      const currentTextCoverage = unifiedScenes
        .map((scene) => (scene.text || scene.description || scene.scene || '').toString().trim())
        .filter(Boolean)
        .join(' ');

      if (fullScriptText && currentTextCoverage.length > 0 && currentTextCoverage.length < fullScriptText.replace(/\s+/g, ' ').trim().length * 0.35) {
        return [];
      }

      return unifiedScenes;
    };

    setIsGeneratingGlobalProduction(true);
    try {
      let scenesForPrompting = getCurrentPromptScenes();

      if ((!scriptBreakdown || scriptBreakdown.length === 0 || scenesForPrompting.length === 0) && fullScriptText) {
        toast.info("Создаем технический план сцен по актуальному тексту сценария...");
        const durationVal = scriptDuration === "custom" ? scriptCustomDuration : String(scriptDuration);
        try {
          const freshBreakdown = await generateScriptBreakdown(
            fullScriptText,
            selectedNiche || "",
            topicToUse,
            scriptWishes,
            durationVal,
            getCommonAnalysisOptions({
              noVoiceover: scriptNoVoiceover,
              referenceImages: scriptReferenceImages,
              youtubeLinks: scriptYoutubeLinks
            })
          );
          if (freshBreakdown && freshBreakdown.length > 0) {
            setScriptBreakdown(freshBreakdown);
            scenesForPrompting = freshBreakdown;
          }
        } catch (e) {
          logger.warn("Breakdown generation fallback", e);
        }
      }

      if (scenesForPrompting.length === 0) {
        scenesForPrompting = getCurrentPromptScenes();
      }

      if (scenesForPrompting.length === 0) {
        toast.error("Текст сценария пуст. Сначала создайте или отредактируйте текст сценария.");
        return;
      }

      const config = await generateProductionStyleFromContext(
        topicToUse,
        scriptTone || toneOfVoice || "Динамичный",
        scriptMode || "Обычный",
        scenesForPrompting,
        isStylePinned ? {
          imageStyle: promptImageStyle,
          animationType: promptAnimationType
        } : undefined,
        getCommonAnalysisOptions({ referenceImages: scriptReferenceImages, youtubeLinks: scriptYoutubeLinks, branding: brandProfile ? JSON.stringify(brandProfile) : "" })
      );

      if (!isStylePinned) {
        setPromptImageStyle(config.imageStyle);
        setPromptAnimationType(config.animationType);
        setPromptMusicMood(config.musicMood);
        if (config.generalAudioPrompt) setGeneralAudioPrompt(config.generalAudioPrompt);
      }
      if (config.scenePrompts) setScenePrompts(config.scenePrompts);
      toast.success(isStylePinned ? "Визуальные подсказки обновлены по зафиксированному стилю!" : "Визуальные подсказки и промпты успешно сгенерированы по сценарию!");
    } catch (error) {
      handleGeminiError(error, "Ошибка при генерации визуальных подсказок");
    } finally {
      setIsGeneratingGlobalProduction(false);
    }
  };

  const handleGenerateDetailedScenePrompt = async (index: number, customInstruction?: string) => {
    const unifiedScenes = getUnifiedScriptScenes(scriptBreakdown, generatedBlocks, scriptStructure);
    const scenesForPrompting = unifiedScenes.length > 0 ? unifiedScenes : getUnifiedScriptScenes([], generatedBlocks, scriptStructure);
    const targetScene = scenesForPrompting[index];
    if (!targetScene) {
      toast.error("Сцена не найдена");
      return;
    }

    const toastId = toast.loading(`Обновление промптов для сцены ${index + 1}...`);
    try {
      const detailed = await generateDetailedPromptForScene(
        { imageStyle: promptImageStyle || '', animationType: promptAnimationType || '' },
        targetScene,
        getCommonAnalysisOptions({ customInstruction, branding: brandProfile ? JSON.stringify(brandProfile) : "" })
      );
      
      const newScenePrompts = [...(scenePrompts || [])];
      const existing = newScenePrompts[index] || { sceneSummary: '', videoPrompt1: '', videoPrompt2: '' };
      
      const prevEntry = existing.videoPrompt1 ? [{
        videoPrompt1: existing.videoPrompt1,
        videoPrompt2: existing.videoPrompt2,
        sceneSummary: existing.sceneSummary,
        timestamp: existing.timestamp || Date.now(),
        wish: existing.wish || ''
      }] : [];

      const existingHistory = Array.isArray(existing.history) && existing.history.length > 0 
        ? existing.history 
        : prevEntry;

      const newEntry = {
        videoPrompt1: detailed.videoPrompt1,
        videoPrompt2: detailed.videoPrompt2,
        sceneSummary: detailed.sceneSummary,
        timestamp: Date.now(),
        wish: customInstruction || ''
      };

      const updatedHistory = [...existingHistory, newEntry];

      newScenePrompts[index] = {
        ...existing,
        ...detailed,
        history: updatedHistory,
        activeVersionIndex: updatedHistory.length - 1
      };
      
      setScenePrompts(newScenePrompts);
      toast.success(`Промпты сцены ${index + 1} перегенерированы! (Версия #${updatedHistory.length})`, { id: toastId });
      return detailed;
    } catch (error) {
      handleGeminiError(error, "Ошибка при обновлении промпта");
      toast.dismiss(toastId);
    }
  };

  const handleGenerateTransitionPrompt = async (fromBlockIndex: number) => {
    const blockA = scriptStructure?.[fromBlockIndex];
    const blockB = scriptStructure?.[fromBlockIndex + 1];
    
    if (!blockA || !blockB) {
      toast.error("Недостаточно блоков для создания перехода");
      return;
    }
    
    setGeneratingTransitions(prev => ({ ...prev, [fromBlockIndex]: true }));
    const toastId = toast.loading(`Генерация визуального перехода между Блоком ${fromBlockIndex + 1} и ${fromBlockIndex + 2}...`);
    try {
      const blockAText = generatedBlocks?.[fromBlockIndex]?.text || blockA.text || "";
      const blockBText = generatedBlocks?.[fromBlockIndex + 1]?.text || blockB.text || "";
      
      const transition = await generateTransitionPromptBetweenBlocks(
        { title: blockA.title, text: blockAText },
        { title: blockB.title, text: blockBText },
        promptImageStyle,
        { model: selectedModel, bypassCache: true }
      );
      
      setTransitionPrompts(prev => ({
        ...prev,
        [fromBlockIndex]: transition
      }));
      toast.success(`Переход между блоками ${fromBlockIndex + 1} и ${fromBlockIndex + 2} успешно создан!`, { id: toastId });
    } catch (err) {
      handleGeminiError(err, "Ошибка генерации перехода между блоками");
      toast.dismiss(toastId);
    } finally {
      setGeneratingTransitions(prev => ({ ...prev, [fromBlockIndex]: false }));
    }
  };

  const handleGeneratePromoImages = async () => {
    if (!scenePrompts || scenePrompts.length === 0) {
      toast.error("Сначала сгенерируйте стиль продакшена");
      return;
    }

    setIsGeneratingPromoImages(true);
    toast.info("Генерируем визуал для промо-ролика... Это может занять до 20 секунд.");
    
    try {
      // Generate 4 key images for the promo
      const imageCount = Math.min(scenePrompts.length, 4);
      const newPromoImages: Record<number, string> = { ...promoImages };
      
      // We do them sequentially to avoid server overhead, or in parallel if tool supports it
      for (let i = 0; i < imageCount; i++) {
        const prompt = scenePrompts[i].startFramePrompt || scenePrompts[i].imagePrompt || scenePrompts[i].videoPrompt1;
        if (!prompt) continue;
        
        // Add style context if available
        const styledPrompt = `${prompt}. Style: ${promptImageStyle || 'cinematic'}. High quality, 4k, professional lighting.`;
        
        try {
          const imgUrl = await generateImage(styledPrompt, "16:9");
          if (imgUrl) {
            newPromoImages[i] = imgUrl;
            setPromoImages({ ...newPromoImages }); // Update partially to show progress
          }
        } catch (e) {
          logger.error(`Failed to generate promo image ${i}:`, e);
        }
      }
      
      if (Object.keys(newPromoImages).length > 0) {
        toast.success("Визуальный ряд для промо готов!");
      } else {
        toast.error("Не удалось сгенерировать изображения для промо.");
      }
    } catch (error) {
      handleGeminiError(error, "Ошибка при создании промо");
    } finally {
      setIsGeneratingPromoImages(false);
    }
  };

  const handleGeneratePreviewThumbnail = async () => {
    const topicToUse = videoSEO?.title || scriptTopic || selectedIdea;
    if (!topicToUse) return;
    setIsPreviewLoading(true);
    try {
      const customInst = customInstructions ? `\nДополнительные пользовательские инструкции / правила: ${customInstructions}` : "";
      const brandStyle = (nicheData?.branding as any)?.thumbnailStyle ? `\nСтиль превью по брендбуку: ${(nicheData.branding as any).thumbnailStyle}` : "";
      const brandColors = nicheData?.branding?.colors?.length ? `\nФирменная палитра цветов: ${nicheData.branding.colors.join(", ")}` : "";
      const referenceStylePrompt = thumbnailReferenceStyle ? `\nСтиль референса превью (СТРОГО СОБЛЮДАТЬ визуальную эстетику, цветовую палитру, стилистику подложки и контраст референса, но создать НОВЫЙ сюжет/объект по теме): ${thumbnailReferenceStyle}` : "";

      const thumbnailRules = `
ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА ОФОРМЛЕНИЯ ПРЕВЬЮ:
1. БЕЗ ТЕКСТА: СТРОГО ЗАПРЕЩЕНО добавлять любой текст, буквы, надписи или логотипы на само изображение. 
2. СВОБОДНОЕ ПРОСТРАНСТВО: Оставьте обширное свободное пространство (negative space) для наложения текста поверх картинки (сбоку, сверху, снизу или даже по центру, в зависимости от композиции).
3. ВИЗУАЛЬНЫЙ РЯД: Явный визуальный фокус (лицо, объект). Композиция может быть любой, главное — место для крупного текста. Контраст переднего и заднего плана.
`;

      const prompt = `Premium YouTube thumbnail for video about "${topicToUse}". ${thumbnailRules} Generate a clean background image WITHOUT ANY TEXT, WORDS, OR LETTERS. Provide ample negative space for text overlay. Style: high-contrast YouTube saturated colors, dynamic background with blurred bokeh, professional graphic design.${brandStyle}${brandColors}${referenceStylePrompt}${customInst} IMPORTANT: DO NOT include any text or typography on the image itself. NO TEXT. NO LETTERS.`;


      // If we have no variants, generate 2 at once to show A/B testing
      if (thumbnailVariants.length === 0) {
        toast.info("Генерируем несколько вариантов для A/B теста...");
        const [url1, url2] = await Promise.all([
          generateImage(prompt + " Main focused composition.", "16:9", thumbnailReference),
          generateImage(prompt + " Dynamic action composition.", "16:9", thumbnailReference),
        ]);

        const newVariants = [];
        if (url1) newVariants.push(url1);
        if (url2) newVariants.push(url2);

        if (newVariants.length > 0) {
          setThumbnailVariants(newVariants);
          setPreviewThumbnail(newVariants[0]);
          toast.success("Варианты превью сгенерированы");
        } else {
          toast.error("Не удалось сгенерировать превью");
        }
      } else {
        // Just generate one more variant
        const imageUrl = await generateImage(
          prompt + ` Variant ${thumbnailVariants.length + 1}.`,
          "16:9",
          thumbnailReference
        );
        if (imageUrl) {
          setPreviewThumbnail(imageUrl);
          setThumbnailVariants((prev) => [...prev, imageUrl]);
          toast.success("Новый вариант превью добавлен");
        } else {
          toast.error("Не удалось сгенерировать вариант");
        }
      }
    } catch (error) {
      handleGeminiError(error, "Ошибка генерации превью");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleDownloadPreview = async () => {
    if (!previewThumbnail) return;
    
    // Check if we have an overlay text
    const container = document.getElementById("youtube-preview-image-container");
    if (container) {
      try {
        const { toPng } = await import("html-to-image");
        // Hide UI elements we don't want in the screenshot
        const grid = container.querySelector(".mix-blend-difference");
        const buttons = container.querySelectorAll("button");
        const timeStamp = container.querySelector(".absolute.bottom-2");
        
        if (grid) (grid as HTMLElement).style.display = 'none';
        buttons.forEach(b => (b as HTMLElement).style.display = 'none');
        if (timeStamp) (timeStamp as HTMLElement).style.display = 'none';

        const dataUrl = await toPng(container, {
          cacheBust: true,
          style: { transform: 'scale(1)', margin: '0' },
          pixelRatio: 2 // High quality
        });
        
        // Restore UI elements
        if (grid) (grid as HTMLElement).style.display = '';
        buttons.forEach(b => (b as HTMLElement).style.display = '');
        if (timeStamp) (timeStamp as HTMLElement).style.display = '';

        const link = document.createElement('a');
        link.download = `youtube-preview-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
        return;
      } catch (err) {
        logger.error("Error generating composite image:", err);
        // Fallback to default download if html-to-image fails
      }
    }

    await downloadImage(previewThumbnail, `youtube-preview-${Date.now()}.jpg`);
  };

  const handleAutoGenerateThumbnailStyles = async () => {
    const topicToUse = scriptTopic || selectedIdea;
    if (!topicToUse) {
      toast.error("Пожалуйста, сначала выберите идею на вкладке 'Идеи'");
      return;
    }
    setIsGeneratingThumbnailStyles(true);
    try {
      const title = videoSEO?.title || topicToUse;
      const desc = videoSEO?.description || "";
      const styles = await generateThumbnailStyles(title, desc, {
        model: selectedModel,
        customInstructions,
        brandProfile: nicheData?.branding ? {
          toneOfVoice: (nicheData.branding as any).toneOfVoice,
          thumbnailStyle: (nicheData.branding as any).thumbnailStyle,
          colors: nicheData.branding.colors,
          primaryFont: (nicheData.branding as any).primaryFont,
          bodyFont: (nicheData.branding as any).bodyFont,
          visualAestheticDescription: (nicheData.branding as any).visualAestheticDescription
        } : undefined
      });
      setThumbnailStyleSuggestions(styles);
      toast.success("Сгенерировано 3 концепта стилей для превью!");
    } catch (error) {
      handleGeminiError(error, "Не удалось сгенерировать стили превью");
    } finally {
      setIsGeneratingThumbnailStyles(false);
    }
  };

  const handleForceRegenerateThumbnailStyle = async () => {
    setThumbnailStyleSuggestions([]);
    toast.info("Кэш стилей сброшен. Принудительное применение кастомных правил...");
    await handleAutoGenerateThumbnailStyles();
  };

  const handleGenerateThumbnailFromStyle = async (suggestion: ThumbnailStyleSuggestion) => {
    setIsPreviewLoading(true);
    toast.info(`Генерируем превью в стиле "${suggestion.name}"...`);
    try {
      const referenceStylePrompt = thumbnailReferenceStyle ? `\nСтиль референса превью (СТРОГО СОБЛЮДАТЬ визуальную эстетику, цветовую палитру, стилистику подложки и контраст референса, но создать НОВЫЙ сюжет/объект по теме): ${thumbnailReferenceStyle}` : "";
      const imageUrl = await generateImage(suggestion.prompt + referenceStylePrompt, "16:9", thumbnailReference);
      if (imageUrl) {
        setPreviewThumbnail(imageUrl);
        setThumbnailVariants((prev) => [...prev, imageUrl]);
        toast.success(`Превью в стиле "${suggestion.name}" успешно добавлено!`);
      } else {
        toast.error("Не удалось сгенерировать превью по промпту стиля");
      }
    } catch (error) {
      handleGeminiError(error, "Ошибка генерации превью по стилю");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleApplyPromptVariant = (variant: any) => {
    toast.success(
      `Концепция "${variant.title}" применена!`,
    );
  };

  const renderExportDropdown = (content: string, filename: string, title: string, additionalFiles: {name: string, content: string | Blob}[] = []) => {
    return (
      <div className="relative group">
        <button className="flex items-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-all text-sm font-bold border border-neutral-700">
          <Download size={16} />
          <span>Скачать</span>
          <ChevronDown size={14} className="opacity-50" />
        </button>
        <div className="absolute right-0 top-full mt-2 w-48 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all py-2 origin-top-right transform scale-95 group-hover:scale-100 backdrop-blur-xl">
          <button 
            onClick={() => exportToTxt(content, filename)}
            className="w-full text-left px-4 py-2 text-xs font-bold text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors flex items-center gap-2"
          >
            <FileText size={14} /> TXT формат
          </button>
          <button 
            onClick={() => exportToMarkdown(content, filename)}
            className="w-full text-left px-4 py-2 text-xs font-bold text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors flex items-center gap-2"
          >
            <FileCode size={14} /> Markdown (.md)
          </button>
          <button 
            onClick={() => exportToPDF(content, filename, title)}
            className="w-full text-left px-4 py-2 text-xs font-bold text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors flex items-center gap-2"
          >
            <File size={14} /> PDF документ
          </button>
          {generatedBlocks && Object.keys(generatedBlocks).length > 0 && (
            <button 
              onClick={() => exportScriptAndPlanToPDF(
                scriptTopic,
                selectedBranding?.name || nicheData?.branding?.names?.[0]?.name || 'YouTube Master',
                Object.values(generatedBlocks),
                nicheData?.branding?.logo
              )}
              className="w-full text-left px-4 py-2 text-xs font-bold text-emerald-400 hover:text-white hover:bg-emerald-950/50 transition-colors flex items-center gap-2 border-t border-neutral-800 mt-1 pt-2"
            >
              <FileSpreadsheet size={14} className="text-emerald-400" /> Сценарий + Техплан (PDF)
            </button>
          )}
          <button 
            onClick={() => {
              const files = [
                { name: `${filename}.txt`, content },
                { name: `${filename}.md`, content },
                ...additionalFiles
              ];
              exportToZip(files, filename);
            }}
            className="w-full text-left px-4 py-2 text-xs font-bold text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors flex items-center gap-2 border-t border-neutral-800 mt-1 pt-2"
          >
            <Archive size={14} /> ZIP архив
          </button>
        </div>
      </div>
    );
  };

  const handleCreateSeries = () => {
    if (!newSeriesName.trim()) {
      toast.error("Введите название серии");
      return;
    }
    if (selectedIdeasForSeries.length === 0) {
      toast.error("Выберите хотя бы одну идею для серии");
      return;
    }

    setIdeaSeries((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        seriesTitle: newSeriesName.trim(),
        topicBranch: "Ручная группировка",
        description: "Серия создана вручную",
        targetAudienceGoal: "Лояльные зрители",
        episodes: selectedIdeasForSeries.map((idea, idx) => ({
          episodeNumber: idx + 1,
          title: typeof idea === "string" ? idea : idea.title,
          description: typeof idea === "object" ? idea.description || "" : "",
          duration: typeof idea === "object" ? idea.duration || "10 мин" : "10 мин",
          tone: typeof idea === "object" ? idea.tone || "Экспертный" : "Экспертный",
          viral_potential: typeof idea === "object" ? idea.viral_potential || "Высокий" : "Высокий",
          nextTeaserScript: "",
        })),
      },
    ]);
    setNewSeriesName("");
    setSelectedIdeasForSeries([]);
    toast.success(`Серия "${newSeriesName}" успешно создана`);
  };

  const toggleIdeaForSeries = (e: React.MouseEvent, idea: GeneratedIdea) => {
    e.stopPropagation();
    setSelectedIdeasForSeries((prev) => {
      const arr = Array.isArray(prev) ? prev : [];
      return arr.includes(idea) ? arr.filter((i) => i !== idea) : [...arr, idea];
    });
  };

  const handleDownloadContentZip = async () => {
    const zip = new JSZip();
    let hasContent = false;
    
    const toastId = toast.loading("Сбор всех данных в архив...");

    // 1. Text Content
    const scriptText = getFullScriptText(generatedBlocks);
    if (scriptText) {
      zip.file("Сценарий.txt", scriptText);
      hasContent = true;
    }

    // Check if we have breakdown data in blocks
    const orderedIndices = Object.keys(generatedBlocks || {}).map(Number).sort((a, b) => a - b);
    const scenesFromBlocks = orderedIndices.flatMap(i => generatedBlocks[i]?.scenes || []);

    if (scenesFromBlocks.length > 0) {
      let breakdownContent = `=== РАЗБИВКА СЦЕН ===\n\n`;
      scenesFromBlocks.forEach((scene, i) => {
        breakdownContent += `СЦЕНА ${i + 1} (${scene.timeRange})\n`;
        breakdownContent += `Текст: ${scene.text}\n`;
        breakdownContent += `Озвучка: ${scene.voiceover?.voiceName} (${scene.voiceover?.settings}), ${scene.voiceover?.intonation}, ${scene.voiceover?.mood}, ${scene.voiceover?.timbre}\n`;
        if (scene.audio?.soundsAndNoises) {
           breakdownContent += `Звук: ${scene.audio?.soundsAndNoises}\n`;
        }
        breakdownContent += `\n`;
      });
      zip.file("Разбивка_и_сценарий.txt", breakdownContent);
      hasContent = true;
    }

    if (scenePrompts && scenePrompts.length > 0) {
      let promptsContent = `=== ПРОМПТЫ ДЛЯ ПРОДАКШЕНА ===\n\n`;
      if (promptImageStyle) promptsContent += `Стиль изображений: ${promptImageStyle}\n`;
      if (promptAnimationType) promptsContent += `Стиль анимации: ${promptAnimationType}\n`;
      if (promptMusicMood) promptsContent += `Музыка: ${promptMusicMood}\n`;
      if (generalAudioPrompt) promptsContent += `Аудио: ${generalAudioPrompt}\n`;
      promptsContent += `\n`;

      scenePrompts.forEach((prompt, i) => {
        promptsContent += `[ СЦЕНА ${i + 1} ]\n`;
        if (prompt.sceneSummary) promptsContent += `Контекст: ${prompt.sceneSummary}\n`;
        const v1 = prompt.videoPrompt1 || prompt.startFramePrompt || prompt.imagePrompt;
        const v2 = prompt.videoPrompt2 || prompt.endFramePrompt;
        if (v1) promptsContent += `Промпт (Veo 3, Ракурс 1): ${v1}\n`;
        if (v2) promptsContent += `Промпт (Veo 3, Ракурс 2): ${v2}\n`;
        promptsContent += `\n`;
      });

      zip.file("Промпты_генерации.txt", promptsContent);
      hasContent = true;
    }

    if (videoSEO) {
      const seoContent = `Заголовок: ${videoSEO.title}\n\nОписание:\n${videoSEO.description}\n\nКлючевые слова:\n${videoSEO.keywords}\n\nХештеги:\n${(videoSEO.hashtags || []).map((t) => "#" + t).join(" ")}\n\nЗакрепленный комментарий:\n${videoSEO.pinnedComment || ""}`;
      zip.file("SEO.txt", seoContent);
      hasContent = true;
    }

    // 2. Images
    const fetchImageBlob = async (url: string) => {
        try {
            if (url.startsWith('data:image')) {
                const arr = url.split(',');
                const mimeMatch = arr[0].match(/:(.*?);/);
                if (!mimeMatch) return null;
                const bstr = atob(arr[1]);
                let n = bstr.length;
                const u8arr = new Uint8Array(n);
                while(n--){
                    u8arr[n] = bstr.charCodeAt(n);
                }
                return new Blob([u8arr], {type: mimeMatch[1]});
            } else {
                try {
                    const response = await fetch(url);
                    if (response.ok) {
                        return await response.blob();
                    }
                } catch (directErr) {
                    logger.warn('Direct image fetch failed, fallback to proxy:', url);
                }
                // Fetch through secure server-side download proxy
                const proxyUrl = `/api/proxy-download?url=${encodeURIComponent(url)}`;
                const response = await fetch(proxyUrl);
                if (response.ok) {
                    return await response.blob();
                }
                return null;
            }
        } catch (e) {
            logger.error(e);
            return null;
        }
    };

    const mediaZip = zip.folder("Медиа");
    if (mediaZip && nicheData?.branding) {
      if ((nicheData.branding as any).logo) {
        const logoBlob = await fetchImageBlob((nicheData.branding as any).logo);
        if (logoBlob) { mediaZip.file("logo.png", logoBlob); hasContent = true; }
      }
      if ((nicheData.branding as any).banner) {
        const bannerBlob = await fetchImageBlob((nicheData.branding as any).banner);
        if (bannerBlob) { mediaZip.file("banner.png", bannerBlob); hasContent = true; }
      }
    }

    if (mediaZip) {
      let tCount = 0;
      for (const thumb of thumbnailVariants) {
          const thumbBlob = await fetchImageBlob(thumb);
          if (thumbBlob) { mediaZip.file(`youtube_thumbnail_${++tCount}.png`, thumbBlob); hasContent = true; }
      }
    }

    if (!hasContent) {
      toast.error("Нет данных для скачивания", { id: toastId });
      return;
    }

    try {
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `Контент_${selectedNiche || 'youtube'}.zip`);
        toast.success("Весь контент успешно скачан!", { id: toastId });
    } catch (e) {
        toast.error("Ошибка при создании архива", { id: toastId });
    }
  };


  const handleSaveSessionToHistory = async () => {
    const sessionData = getSessionData();
    await saveToHistory(
      "История",
      `Бэкап сессии: ${new Date().toLocaleString()}`,
      JSON.stringify(sessionData),
      {
        isSession: true,
        niche: selectedNiche || "Не выбрана",
        page: activePage,
      },
    );
    toast.success("Сессия сохранена в историю");
  };

  const handleRestoreFromHistory = (item: any) => {
    try {
      if (item.metadata?.isSession || item.type === "История") {
        let sessionData;
        try {
          sessionData = JSON.parse(item.content);
        } catch (e) {
           toast.error("Ошибка парсинга JSON");
           return;
        }
        if (!sessionData.data) {
           // Fallback if the data is raw instead of `{ data: ... }`
           sessionData = { data: sessionData };
        }
        applySessionData(sessionData);
        toast.success("Сессия успешно восстановлена из истории");
        return;
      }
      
      let data;
      try {
        data = JSON.parse(item.content);
      } catch {
        // If it's a raw string, use it directly instead of just copying to clipboard
        data = item.content;
      }

      const ensureNicheData = () => {
         setNicheData((prev: any) => prev || {
            potential: { demand: 0, competition: 0, monetization: 0, score: 0, summary: "" },
            subNiches: [],
            branding: { names: [], colors: [], fonts: [] },
            ideas: [],
            popularIdeas: [],
            scriptTemplate: "",
            editingTips: "",
            seo: { keywords: [], hashtags: [], titlePrototypes: [] },
            analytics: "",
            shorts: [],
            competitors: [],
            audienceData: [],
            trendData: []
         });
      };

      switch (item.type) {
        case "Анализ ниши":
          setNicheData(data);
          setActivePage("Ниша");
          // If metadata has region/niche, we might want to restore them too
          if (item.metadata?.niche) setSelectedNiche(item.metadata.niche);
          if (item.metadata?.region) safeStorage.setItem("yt_region", item.metadata.region);
          toast.success("Анализ ниши восстановлен");
          break;
        case "Идея":
          ensureNicheData();
          if (Array.isArray(data)) {
            setTrendingIdeas(data);
          } else if (item.metadata?.idea || data?.title) {
            const ideaTitle = item.metadata?.idea || data?.title;
            setSelectedIdea(ideaTitle);
            setTrendingIdeas((prev: GeneratedIdea[]) => {
               const ideaObj = typeof data === 'object' ? data : { title: ideaTitle, description: '', duration: '', tone: '' };
               if (prev.some(i => i.title === ideaTitle)) return prev;
               return [ideaObj, ...prev] as GeneratedIdea[];
            });
            if (typeof data === 'object' && data.scriptTemplate) {
               setNicheData((prev: any) => ({ ...prev, ...data }));
            }
          } else if (typeof data === "string") {
             setSelectedIdea(data);
              setTrendingIdeas((prev: GeneratedIdea[]) => {
                const title = typeof data === 'string' ? data : (data as any).title;
                if (prev.some(i => i.title === title)) return prev;
                const newIdea: GeneratedIdea = typeof data === 'string' 
                  ? { title: data, description: '', duration: '', tone: '' }
                  : data;
                return [newIdea, ...prev];
             });
          } else {
             copyTextToClipboard(item.content);
             toast.success("Текст идеи скопирован");
             return;
          }
          if (item.metadata?.niche) setSelectedNiche(item.metadata.niche);
          setActivePage("Идеи");
          toast.success("Идея восстановлена");
          break;
        case "Сценарий":
          ensureNicheData();
          const topic = item.metadata?.scriptTopic || "Восстановленный сценарий";
          setScriptTopic(topic);
          setSelectedIdea(topic);
          
          if (item.metadata?.scriptNoVoiceover !== undefined) {
            setScriptNoVoiceover(item.metadata.scriptNoVoiceover === true || item.metadata.scriptNoVoiceover === "true");
          }
          
          if (Array.isArray(data)) {
            setScriptStructure(data);
            setGeneratedBlocks({});
            setScriptBreakdown([]);
            setActivePage("Сценарий");
            toast.success("Структура сценария восстановлена");
          } else if (typeof data === "string") {
            setScriptStructure([
              { id: "1", title: "Сцена", type: "Main", duration: 60, context: "Из истории" }
            ]);
            setGeneratedBlocks({
              0: {
                text: data,
                sfx: "",
                mood: "",
                soundLinks: [],
              },
            });
            setScriptBreakdown([]);
            setActivePage("Сценарий");
            toast.success("Блок сценария восстановлен");
          } else {
             setActivePage("Сценарий");
             toast.success("Сценарий загружен");
          }
          if (item.metadata?.niche) setSelectedNiche(item.metadata.niche);
          break;
        case "Промт":
          copyTextToClipboard(item.content);
          toast.success("Промты скопированы в буфер обмена");
          break;
        default:
          copyTextToClipboard(item.content);
          toast.success(`Данные (${item.type}) скопированы в буфер обмена`);
      }
    } catch (e) {
      logger.error("Failed to restore data:", e);
      toast.error(`Ошибка: ${(e as Error).message}`);
    }
  };

  // --- End Session Management ---

  useEffect(() => {
    // Evict the massive legacy autosave from localStorage to instantly reclaim quota limit (5MB)
    try {
      localStorage.removeItem("yt_creator_session_autosave");
    } catch (e) {
      // Silently ignore storage restriction errors in sandboxed iframes
    }

    const initSession = async () => {
      try {
        const backup = await get("autosave_backup");
        if (backup && backup.data) {
          applySessionData(backup);
        }
      } catch (e) {
        logger.error("Failed to load session data", e);
      }
    };
    initSession();

    const handleAuthEvent = async (event: MessageEvent) => {
      if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
        const u = await refreshAuthSession();
        if (u) {
          setUser(u);
        }
      }
    };
    window.addEventListener("message", handleAuthEvent);

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setIsAuthReady(true);
      if (u) {
        // Create/Update user profile
        try {
          await setDoc(
            doc(db, "users", u.uid),
            {
              uid: u.uid,
              displayName: u.displayName,
              email: u.email,
              photoURL: u.photoURL,
              role: "user", // Default role
            },
            { merge: true },
          );
        } catch (e) {
          logger.error("Error updating user profile:", e);
        }
      }
    });
    return () => {
      window.removeEventListener("message", handleAuthEvent);
      unsubscribe();
    };
  }, []);

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string | null) => void,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setter(null);
    }
  };




  const getAiSuggestions = () => {
    const suggestions = [];
    if (activePage === "Идеи") {
      suggestions.push("Предложи 5 виральных идей для моей ниши");
      if (selectedIdea)
        suggestions.push("Напиши кликбейтные названия для выбранной идеи");
    } else if (activePage === "Сценарий") {
      suggestions.push("Сгенерируй структуру сценария");
      if (Object.keys(generatedBlocks || {}).length > 0) {
        suggestions.push("Сделай вступление более захватывающим");
        suggestions.push("Разбей сценарий на сцены для монтажа");
      }
    } else if (activePage === "SEO") {
      suggestions.push("Подбери высокочастотные теги");
    }

    if (suggestions.length === 0) {
      suggestions.push("С чего мне начать?");
      suggestions.push("Как улучшить мой канал?");
    }
    return suggestions;
  };

  const handleSendAiAssistantMessage = async () => {
    if (!aiAssistantInput.trim() || isAiAssistantLoading) return;

    const userMessage = aiAssistantInput.trim();
    setAiAssistantInput("");
    setAiAssistantMessages((prev) => [
      ...(Array.isArray(prev) ? prev : []),
      { role: "user", content: userMessage },
    ]);
    setIsAiAssistantLoading(true);

    try {
      // Prompt response now simple since production parameters were removed
      const response = await generatePromptResponse(
        userMessage,
        aiAssistantMessages,
        {
          idea: selectedIdea || undefined,
          breakdown: scriptBreakdown.length > 0 ? scriptBreakdown : undefined,
          niche: selectedNiche,
        },
        { model: selectedModel, deepResearch }
      );

      setAiAssistantMessages((prev) => [
        ...(Array.isArray(prev) ? prev : []),
        { role: "model", content: response },
      ]);
    } catch (error) {
      handleGeminiError(error, "Ошибка в AI Assistant чате");
      setAiAssistantMessages((prev) => [
        ...(Array.isArray(prev) ? prev : []),
        {
          role: "model",
          content: "Извините, произошла ошибка при обработке вашего запроса.",
        },
      ]);
    } finally {
      setIsAiAssistantLoading(false);
    }
  };





  const copyToClipboard = (text: string, section: string) => {
    copyTextToClipboard(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  useEffect(() => {
    if (selectedBranding) {
      safeStorage.setItem("yt_branding", JSON.stringify(selectedBranding));
    } else {
      safeStorage.removeItem("yt_branding");
    }
  }, [selectedBranding]);

  useEffect(() => {
    const fetchNicheData = async () => {
      // Only fetch if persistence is loaded and we don't have data,
      // or if the selected niche doesn't match the current data.
      if (isPersistenceLoaded && selectedNiche) {
        // If we have history or nicheData, and it matches the current selection, we might want to skip.
        // For simplicity, we check if nicheData exists. 
        // If the user manually changes the niche, they usually trigger this via selecting from list.
        
        // Check if we already have this niche/region in our current data or history
        // To be safe, we only skip if nicheData is already present and matches the selected niche.
        // We also check if this is the first load.
        
        const isAlreadyLoaded = nicheData && safeStorage.getItem("yt_niche") === selectedNiche && safeStorage.getItem("yt_region") === selectedRegion;
        
        // However, we want to allow the user to trigger a fresh analysis if they change the niche.
        // The most common case for tokens being "reused" (wasted) is the initial load.
        
        if (isAlreadyLoaded) {
          logger.log("Niche data already loaded from persistence, skipping API call.");
          return;
        }

        setIsLoading(true);
        try {
          const data = await generateNicheData(
            selectedNiche,
            selectedBranding?.name,
            selectedRegion,
            { 
              toneOfVoice,
              model: selectedModel,
              deepResearch
            },
          );
          setNicheData(data);
          safeStorage.setItem("yt_niche", selectedNiche);
          safeStorage.setItem("yt_region", selectedRegion);

          await saveToHistory(
            "Анализ ниши",
            `Анализ: ${selectedNiche} (${selectedRegion})`,
            JSON.stringify(data),
            {
              region: selectedRegion,
            },
          );
        } catch (error) {
          handleGeminiError(error, "Ошибка при получении данных ниши");
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchNicheData();
  }, [selectedNiche, selectedRegion, isPersistenceLoaded]);

  useEffect(() => {
    if (nicheData?.branding?.fonts) {
      const fontFamilies = nicheData.branding.fonts
        .map((f) => `family=${f.replace(/ /g, "+")}`)
        .join("&");
      const href = `https://fonts.googleapis.com/css2?${fontFamilies}&display=swap`;

      let link = document.getElementById(
        "google-fonts-link",
      ) as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.id = "google-fonts-link";
        link.rel = "stylesheet";
        document.head.appendChild(link);
      }
      link.href = href;
    }
  }, [nicheData?.branding?.fonts]);

  const handleRegenerateBranding = async () => {
    if (selectedNiche) {
      setIsLoading(true);
      try {
          const data = await generateNicheData(
            selectedNiche,
            selectedBranding?.name,
            selectedRegion,
            { 
              toneOfVoice,
              model: selectedModel,
              deepResearch
            },
          );
        setNicheData(data);
        await saveToHistory(
          "Анализ ниши",
          `Обновление анализа: ${selectedNiche}`,
          JSON.stringify(data),
          {
            region: selectedRegion,
            regenerated: true,
          },
        );
      } catch (error) {
        handleGeminiError(error, "Ошибка при регенерации брендинга");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [historySearchQuery, setHistorySearchQuery] = useState("");

  useEffect(() => {
    // Session state is loaded via initSession using IndexedDB
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activePage]);

  useEffect(() => {
    if (!user) {
      setHistoryItems([]);
      return;
    }

    const q = query(collection(db, "history"), where("uid", "==", user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          ...(doc.data() as any),
          id: doc.id,
        }));
        items.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setHistoryItems(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "history");
      },
    );

    return () => unsubscribe();
  }, [user]);

  const saveToHistory = async (
    type: string,
    title: string,
    content: string,
    metadata: any = {},
  ) => {
    if (!user) return;
    const id = Math.random().toString(36).substring(2, 15);
    const item = {
      id,
      type,
      title,
      content,
      metadata,
      createdAt: new Date().toISOString(),
      uid: user.uid,
    };
    try {
      await setDoc(doc(db, "history", id), item);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "history");
    }
  };

  const handleRegenerateLogoPrompt = async () => {
    if (!selectedNiche || !nicheData) return;
    setIsLoading(true);
    try {
      const newPrompts = await generateLogoPrompt(
        selectedNiche,
        nicheData.branding.colors,
        selectedBranding?.name,
        getCommonAnalysisOptions({ branding: brandProfile ? JSON.stringify(brandProfile) : "" })
      );
      setNicheData({
        ...nicheData,
        branding: {
          ...nicheData.branding,
          logo_prompts: newPrompts,
        },
      });
      await saveToHistory(
        "Промт",
        `Лого-промты для: ${selectedBranding?.name}`,
        JSON.stringify(newPrompts),
        { niche: selectedNiche },
      );
    } catch (error) {
      handleGeminiError(error, "Ошибка при регенерации лого-промта");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateBannerPrompt = async () => {
    if (!selectedNiche || !nicheData) return;
    setIsLoading(true);
    try {
      const newPrompts = await generateBannerPrompt(
        selectedNiche,
        nicheData.branding.colors,
        selectedBranding?.name,
        selectedBranding?.slogan,
        { model: selectedModel }
      );
      setNicheData({
        ...nicheData,
        branding: {
          ...nicheData.branding,
          banner_prompts: newPrompts,
        },
      });
      await saveToHistory(
        "Промт",
        `Баннер-промты для: ${selectedBranding?.name}`,
        JSON.stringify(newPrompts),
        { niche: selectedNiche },
      );
    } catch (error) {
      handleGeminiError(error, "Ошибка при регенерации баннер-промта");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateColors = async () => {
    if (!selectedNiche || !nicheData) return;
    setIsLoading(true);
    try {
      const newColors = await generateColors(selectedNiche, { model: selectedModel });
      setNicheData({
        ...nicheData,
        branding: {
          ...nicheData.branding,
          colors: newColors,
        },
      });
    } catch (error) {
      handleGeminiError(error, "Ошибка при регенерации цветов");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateBrandingVisuals = async () => {
    if (
      !nicheData?.branding.logo_prompts?.en ||
      !nicheData?.branding.banner_prompts?.en
    ) {
      toast.error("Сначала сгенерируйте промпты для логотипа и баннера");
      return;
    }

    setIsGeneratingBrandingVisuals(true);

    try {
      // 3 variations of logo (1:1)
      const logos = [];
      for (let i = 0; i < 3; i++) {
        const url = await generateImage(
          nicheData.branding.logo_prompts.en +
            `, variation ${i + 1}, highly detailed, professional masterpiece`,
          "1:1",
        );
        if (url) logos.push(url);
      }
      setLogoVariants(logos);

      // 3 variations of banner (16:9)
      const banners = [];
      for (let i = 0; i < 3; i++) {
        const url = await generateImage(
          nicheData.branding.banner_prompts.en +
            `, variation ${i + 1}, highly detailed, professional masterpiece`,
          "16:9",
        );
        if (url) banners.push(url);
      }
      setBannerVariants(banners);

      toast.success("Варианты успешно сгенерированы!");
    } catch (error) {
      handleGeminiError(error, "Ошибка при генерации визуалов");
    } finally {
      setIsGeneratingBrandingVisuals(false);
    }
  };

  const handleGetRecommendedColors = async () => {
    if (!selectedNiche || !nicheData) return;
    setIsLoading(true);
    try {
      const recommendedColors = await generateRecommendedColors(selectedNiche);
      setNicheData({
        ...nicheData,
        branding: {
          ...nicheData.branding,
          colors: recommendedColors,
        },
      });
    } catch (error) {
      handleGeminiError(error, "Ошибка при получении рекомендованных цветов");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateFonts = async () => {
    if (!selectedNiche || !nicheData) return;
    setIsLoading(true);
    try {
      const newFonts = await generateFonts(selectedNiche, { model: selectedModel });
      setNicheData({
        ...nicheData,
        branding: {
          ...nicheData.branding,
          fonts: newFonts,
        },
      });
    } catch (error) {
      handleGeminiError(error, "Ошибка при регенерации шрифтов");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateChannelSEO = async () => {
    if (
      !selectedNiche ||
      !nicheData ||
      !selectedBranding
    )
      return;
    setIsLoading(true);
    try {
      const newSEO = await generateChannelSEO(
        selectedNiche,
        selectedBranding?.name || "",
        getCompetitorAnalysis(),
      );
      setNicheData({
        ...nicheData,
        branding: {
          ...nicheData.branding,
          channel_seo: newSEO,
        },
      });
    } catch (error) {
      handleGeminiError(error, "Ошибка при регенерации SEO канала");
    } finally {
      setIsLoading(false);
    }
  };

  const getCompetitorAnalysis = () => {
    let base = "";
    if (nicheData && nicheData.competitors && nicheData.competitors.length > 0) {
      base = nicheData.competitors
        .map(
          (c) =>
            `- Конкурент: ${c.name}\n  Слабые стороны: ${c.weakness}\n  Стратегия обхода: ${c.strategy}`,
        )
        .join("\n");
    }
    if (customCompetitorInsights) {
      base = base ? `${base}\n${customCompetitorInsights}` : customCompetitorInsights;
    }
    return base || undefined;
  };

  const handleGenerateTrendingIdeas = async () => {
    if (!selectedNiche) return;

    setIsGeneratingTrendingIdeas(true);
    try {
      const ideas = await generateTrendingIdeas(
        selectedNiche,
        trendingKeywords,
        selectedBranding?.name,
        getCompetitorAnalysis(),
        { model: selectedModel, deepResearch }
      );
      setTrendingIdeas((prev) => {
        const existingTitles = new Set((Array.isArray(prev) ? prev : []).map((i) => (typeof i === "string" ? i : i.title).trim().toLowerCase()));
        const uniqueNew = ideas.filter((i) => {
          const t = (typeof i === "string" ? i : i.title).trim().toLowerCase();
          return !existingTitles.has(t);
        });
        return [...uniqueNew, ...prev];
      });
      await saveToHistory(
        "Идея",
        `Трендовые идеи для ниши: ${selectedNiche}`,
        JSON.stringify(ideas),
        { niche: selectedNiche },
      );
      toast.success("Новые трендовые идеи добавлены к списку!");
    } catch (error) {
      handleGeminiError(error, "Ошибка при генерации трендовых идей");
    } finally {
      setIsGeneratingTrendingIdeas(false);
    }
  };

  const handleRegenerateIdeas = async () => {
    if (!selectedNiche || !nicheData) return;

    setIsRegeneratingIdeas(true);
    try {
      const currentIdeas = [...(nicheData.ideas || []), ...(nicheData.popularIdeas || [])];
      const newIdeas = await generateMoreIdeas(selectedNiche, currentIdeas, { toneOfVoice, model: selectedModel });

      setNicheData((prev: any) => {
        if (!prev) return prev;
        const existingTitles = new Set(
          (prev.ideas || []).map((i: any) => (typeof i === "string" ? i : i.title).trim().toLowerCase())
        );
        const filteredNew = (newIdeas.ideas || []).filter((i: any) => {
          const t = (typeof i === "string" ? i : i.title).trim().toLowerCase();
          return !existingTitles.has(t);
        });

        return {
          ...prev,
          ideas: [...filteredNew, ...(prev.ideas || [])],
          popularIdeas: newIdeas.popularIdeas && newIdeas.popularIdeas.length > 0 
            ? [...newIdeas.popularIdeas, ...(prev.popularIdeas || [])]
            : (prev.popularIdeas || [])
        };
      });

      toast.success("Новые идеи успешно добавлены к текущему списку!");
    } catch (error) {
      handleGeminiError(error, "Ошибка при регенерации идей");
    } finally {
      setIsRegeneratingIdeas(false);
    }
  };

  const handleGenerateIdeasFromDescription = async () => {
    if (!customIdeasDescription.trim()) {
      toast.error("Пожалуйста, введите описание для генерации идей");
      return;
    }

    setIsGeneratingCustomIdeas(true);
    try {
      const result = await generateIdeasFromDescription(customIdeasDescription, {
        toneOfVoice,
        model: selectedModel,
        deepResearch
      });

      if (result && result.ideas && result.ideas.length > 0) {
        setUserCustomIdeas(prev => [...result.ideas, ...(Array.isArray(prev) ? prev : [])]);

        setNicheData((prev: any) => {
          const current = prev || {
            potential: { demand: 75, competition: 50, monetization: 80, score: 70, summary: "Анализ на основе пользовательского описания" },
            subNiches: [],
            branding: { names: [], colors: [], fonts: [] },
            ideas: [],
            popularIdeas: [],
            scriptTemplate: "",
            editingTips: "",
            seo: { keywords: "", hashtags: [], titlePrototypes: [] },
            analytics: "",
            shorts: [],
            competitors: [],
            audienceData: [],
            trendData: []
          };

        
  return {
            ...current,
            ideas: [...result.ideas, ...current.ideas],
            popularIdeas: result.popularIdeas && result.popularIdeas.length > 0 ? result.popularIdeas : current.popularIdeas
          };
        });

        toast.success(`Успешно сгенерировано ${result.ideas.length} идей на основе вашего описания!`);
        setShowCustomIdeasModal(false);
        setCustomIdeasDescription("");
      } else {
        toast.error("Не удалось сгенерировать идеи. Пожалуйста, попробуйте еще раз.");
      }
    } catch (error) {
      handleGeminiError(error, "Ошибка при генерации идей из описания");
    } finally {
      setIsGeneratingCustomIdeas(false);
    }
  };

  const executeDeleteSelectedIdeas = () => {
    if (!nicheData) return;

    setNicheData((prev: any) => {
      if (!prev) return prev;
      const nextIdeas = (prev.ideas || []).filter((idea: any) => {
        const title = typeof idea === "string" ? idea : idea.title;
        return !selectedIdeasForDeletion.includes(title);
      });
    
      return {
        ...prev,
        ideas: nextIdeas
      };
    });

    if (selectedIdea && selectedIdeasForDeletion.includes(selectedIdea)) {
      setSelectedIdea(null);
    }

    setTrendingIdeas(prev => (Array.isArray(prev) ? prev : []).filter(idea => {
      const title = typeof idea === 'string' ? idea : idea.title;
      return !selectedIdeasForDeletion.includes(title);
    }));

    toast.success(`Успешно удалено ${selectedIdeasForDeletion.length} идей`);
    setSelectedIdeasForDeletion([]);
  };

  const executeDeleteAllIdeas = () => {
    if (nicheData) {
      setNicheData({
        ...nicheData,
        ideas: []
      });
    }
    setTrendingIdeas([]);
    setUserCustomIdeas([]);
    setSelectedIdeasForDeletion([]);
    setSelectedIdea(null);
    toast.success("Все идеи удалены");
  };

  const executeDeleteSingleIdea = (title: string) => {
    if (!nicheData) return;

    setNicheData((prev: any) => {
      if (!prev) return prev;
      const nextIdeas = (prev.ideas || []).filter((idea: any) => {
        const t = typeof idea === "string" ? idea : idea.title;
        return t !== title;
      });
    
      return {
        ...prev,
        ideas: nextIdeas
      };
    });

    if (selectedIdea === title) {
      setSelectedIdea(null);
    }

    setTrendingIdeas(prev => (Array.isArray(prev) ? prev : []).filter(idea => {
      const t = typeof idea === 'string' ? idea : idea.title;
      return t !== title;
    }));

    toast.success(`Идея "${title.substring(0, 20)}..." успешно удалена`);
  };

  const handleDeleteSelectedIdeas = () => {
    if (selectedIdeasForDeletion.length === 0) {
      toast.error("Не выбрано ни одной идеи для удаления");
      return;
    }
    setDeleteConfirmationType('selected');
    setShowDeleteConfirmationModal(true);
  };

  const handleDeleteAllIdeas = () => {
    setDeleteConfirmationType('all');
    setShowDeleteConfirmationModal(true);
  };

  const handleDeleteSingleIdeaTrigger = (title: string) => {
    setIdeaTitleToDelete(title);
    setDeleteConfirmationType('single');
    setShowDeleteConfirmationModal(true);
  };

  const handleRemoveDuplicateIdeas = () => {
    let totalRemoved = 0;

    if (nicheData?.ideas) {
      const seen = new Set<string>();
      const uniqueIdeas: any[] = [];
      for (const idea of nicheData.ideas) {
        const titleKey = (typeof idea === "string" ? idea : idea.title || "").trim().toLowerCase();
        if (titleKey && seen.has(titleKey)) {
          totalRemoved++;
        } else {
          if (titleKey) seen.add(titleKey);
          uniqueIdeas.push(idea);
        }
      }
      if (uniqueIdeas.length !== nicheData.ideas.length) {
        setNicheData((prev: any) => prev ? { ...prev, ideas: uniqueIdeas } : prev);
      }
    }

    if (trendingIdeas.length > 0) {
      const seenTrend = new Set<string>();
      const uniqueTrends: any[] = [];
      for (const idea of trendingIdeas) {
        const titleKey = (typeof idea === "string" ? idea : idea.title || "").trim().toLowerCase();
        if (titleKey && seenTrend.has(titleKey)) {
          totalRemoved++;
        } else {
          if (titleKey) seenTrend.add(titleKey);
          uniqueTrends.push(idea);
        }
      }
      if (uniqueTrends.length !== trendingIdeas.length) {
        setTrendingIdeas(uniqueTrends);
      }
    }

    if (userCustomIdeas.length > 0) {
      const seenCustom = new Set<string>();
      const uniqueCustom: any[] = [];
      for (const idea of userCustomIdeas) {
        const titleKey = (typeof idea === "string" ? idea : idea.title || "").trim().toLowerCase();
        if (titleKey && seenCustom.has(titleKey)) {
          totalRemoved++;
        } else {
          if (titleKey) seenCustom.add(titleKey);
          uniqueCustom.push(idea);
        }
      }
      if (uniqueCustom.length !== userCustomIdeas.length) {
        setUserCustomIdeas(uniqueCustom);
      }
    }

    if (totalRemoved > 0) {
      toast.success(`Удалено дубликатов: ${totalRemoved}`);
    } else {
      toast.info("Дубликатов не найдено, все идеи уникальны!");
    }
  };

  const handleExportIdeasToCSV = (ideasToExport?: any[]) => {
    const targetIdeas = (ideasToExport && ideasToExport.length > 0) 
      ? ideasToExport 
      : (nicheData?.ideas || []);

    if (!targetIdeas || targetIdeas.length === 0) {
      toast.error("Нет идей для экспорта в CSV");
      return;
    }

    const headers = [
      "№",
      "Название идеи",
      "Описание",
      "Хронометраж",
      "Тон",
      "Виральный потенциал",
      "Плейлист / Серия",
      "Рубрика",
      "Метки",
      "Статус",
      "Исполнитель",
      "Дата публикации"
    ];

    const escapeCsv = (val: string | number | undefined | null) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = targetIdeas.map((idea: any, index: number) => {
      const isObj = typeof idea === "object" && idea !== null;
      const title = isObj ? idea.title : String(idea);
      const description = isObj ? (idea.description || "") : "";
      const duration = isObj ? (idea.duration || "") : "";
      const tone = isObj ? (idea.tone || "") : "";
      const viral = isObj ? (idea.viral_potential || "") : "";
      
      const assignment = (ideaAssignments[title] || {}) as any;
      const playlist = assignment.playlist || (isObj ? idea.playlist : "") || "";
      const folder = assignment.folder || "";
      const tags = Array.isArray(assignment.tags) ? assignment.tags.join("; ") : "";
      const status = assignment.status || "Идея";
      const assignedTo = assignment.assignedTo || "";
      const publishDate = assignment.publishDate || "";

      return [
        index + 1,
        escapeCsv(title),
        escapeCsv(description),
        escapeCsv(duration),
        escapeCsv(tone),
        escapeCsv(viral),
        escapeCsv(playlist),
        escapeCsv(folder),
        escapeCsv(tags),
        escapeCsv(status),
        escapeCsv(assignedTo),
        escapeCsv(publishDate)
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.map(h => `"${h}"`).join(","), ...rows].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const nicheName = (selectedNiche || customNiche || "ideas").toLowerCase().replace(/[^a-z0-9а-яё]/gi, "_");
    const fileName = `content_plan_${nicheName}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Контент-план из ${targetIdeas.length} идей экспортирован в CSV!`);
  };

  const handleExportIdeasToJSON = (ideasToExport?: any[]) => {
    const targetIdeas = (ideasToExport && ideasToExport.length > 0) 
      ? ideasToExport 
      : (nicheData?.ideas || []);

    if (!targetIdeas || targetIdeas.length === 0) {
      toast.error("Нет идей для экспорта в JSON");
      return;
    }

    const exportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      niche: selectedNiche || customNiche || "custom",
      ideas: targetIdeas,
      folders: ideaFolders,
      tags: ideaTags,
      assignments: ideaAssignments,
      playlists: ideaPlaylists
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const nicheName = (selectedNiche || customNiche || "ideas").toLowerCase().replace(/[^a-z0-9а-яё]/gi, "_");
    const fileName = `content_plan_${nicheName}_${new Date().toISOString().slice(0, 10)}.json`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Проект идей (${targetIdeas.length} шт.) успешно экспортирован в JSON!`);
  };

  const handleImportIdeasFromJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);

        // Validate structure
        let importedIdeas: any[] = [];
        if (Array.isArray(data)) {
          importedIdeas = data;
        } else if (data && typeof data === "object") {
          if (Array.isArray(data.ideas)) {
            importedIdeas = data.ideas;
          } else if (data.ideas && typeof data.ideas === "object" && Array.isArray(data.ideas.ideas)) {
            importedIdeas = data.ideas.ideas;
          }
        }

        if (importedIdeas.length === 0) {
          toast.error("В файле JSON не найдены идеи контент-плана");
          return;
        }

        // Apply state from JSON if it's our full backup structure
        if (data && typeof data === "object" && !Array.isArray(data)) {
          if (Array.isArray(data.folders)) {
            setIdeaFolders(data.folders);
          }
          if (Array.isArray(data.tags)) {
            setIdeaTags(data.tags);
          }
          if (data.assignments && typeof data.assignments === "object") {
            setIdeaAssignments(data.assignments);
          }
          if (Array.isArray(data.playlists)) {
            setIdeaPlaylists(data.playlists);
          }
        }

        // Format raw ideas if they are strings to detailed objects
        const formattedIdeas = importedIdeas.map((idea: any) => {
          if (typeof idea === "string") {
            return {
              title: idea,
              description: "Импортированная идея контент-плана",
              duration: "10 мин",
              tone: "Информационный",
              viral_potential: "Высокий (90%)"
            };
          }
          return {
            title: idea.title || idea.name || "Без названия",
            description: idea.description || idea.desc || "",
            duration: idea.duration || "10 - 15 мин",
            tone: idea.tone || "Информационный",
            viral_potential: idea.viral_potential || idea.viral || "Высокий (90%)"
          };
        });

        // Safe mode selection (default replace)
        const shouldReplace = true;

        setNicheData((prev: any) => {
          const current = prev || {
            potential: { demand: 75, competition: 50, monetization: 80, score: 70, summary: "Анализ на основе импортированного контент-плана" },
            subNiches: [],
            branding: { names: [], colors: [], fonts: [] },
            ideas: [],
            popularIdeas: [],
            scriptTemplate: "",
            editingTips: "",
            seo: { keywords: "", hashtags: [], titlePrototypes: [] },
          };

          const existingIdeas = shouldReplace ? [] : (current.ideas || []);
          const existingTitles = new Set(existingIdeas.map((i: any) => (typeof i === "string" ? i : i.title).trim().toLowerCase()));

          const newIdeas = formattedIdeas.filter((i: any) => !existingTitles.has(i.title.trim().toLowerCase()));

          return {
            ...current,
            ideas: [...existingIdeas, ...newIdeas]
          };
        });

        toast.success(`Импорт успешно завершен! Загружено ${formattedIdeas.length} идей.`);
      } catch (err: any) {
        logger.error("JSON import error:", err);
        toast.error("Не удалось прочитать или распознать файл JSON: " + err.message);
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const handleApplyCustomContentPlan = (items: ContentPlanItem[], mode: 'append' | 'replace') => {
    setNicheData((prev: any) => {
      const current = prev || {
        potential: { demand: 75, competition: 50, monetization: 80, score: 70, summary: "Анализ на основе пользовательского контент-плана" },
        subNiches: [],
        branding: { names: [], colors: [], fonts: [] },
        ideas: [],
        popularIdeas: [],
        scriptTemplate: "",
        editingTips: "",
        seo: { keywords: "", hashtags: [], titlePrototypes: [] },
        analytics: "",
        shorts: [],
        competitors: [],
        audienceData: [],
        trendData: []
      };

      const existingIdeas = current.ideas || [];
      const updatedIdeas = mode === 'replace' ? items : [...items, ...existingIdeas];

    
  return {
        ...current,
        ideas: updatedIdeas,
      };
    });

    toast.success(
      mode === 'replace'
        ? `Контент-план успешно заменен! (${items.length} идей)`
        : `Добавлено ${items.length} новых идей в ваш контент-план!`
    );
  };

  const handleGenerateLogo = async () => {
    if (!nicheData?.branding.logo_prompts?.en) return;
    setIsGeneratingLogo(true);
    try {
      const channelName = selectedBranding?.name || "";
      const logoPrompt = `YouTube Channel Logo. Style: ${nicheData.branding.logo_prompts.en}. 
      Requirement: Centered circular composition, works well as an avatar, high contrast, professional graphic design. 
      The logo should feature the text "${channelName}" clearly if appropriate for the style. 
      Ensure text is spelled correctly. 1:1 aspect ratio. 
      IMPORTANT: The text "${channelName}" is in Russian (Cyrillic alphabet). You MUST write the text using exactly Russian Cyrillic letters as given. DO NOT translate the text into English, DO NOT use Latin letters.`;
      const imageUrl = await generateImage(logoPrompt, "1:1");
      if (imageUrl) {
        setNicheData({
          ...nicheData,
          branding: { ...nicheData.branding, logo: imageUrl },
        });
        toast.success("Логотип сгенерирован!");
      }
    } catch (error) {
      handleGeminiError(error, "Ошибка при генерации логотипа");
    } finally {
      setIsGeneratingLogo(false);
    }
  };

  const handleGenerateBanner = async () => {
    if (!nicheData?.branding.banner_prompts?.en) return;
    setIsGeneratingBanner(true);
    try {
      const channelName = selectedBranding?.name || "";
      const slogan = selectedBranding?.slogan || "";
      const bannerPrompt = `YouTube Channel Art (Banner). Style: ${nicheData.branding.banner_prompts.en}. 
      Cinematic production quality, sharp focus, professional branding. 
      Include the text "${channelName}" ${slogan ? `and the slogan "${slogan}"` : ""} prominently and clearly. 
      Ensure all text is spelled correctly.
      IMPORTANT: All text ("${channelName}" and "${slogan}") is in Russian (Cyrillic alphabet). You MUST write the text using exactly Russian Cyrillic letters. DO NOT translate the text into English, DO NOT use Latin letters.`;
      const imageUrl = await generateImage(bannerPrompt, "16:9");
      if (imageUrl) {
        setNicheData({
          ...nicheData,
          branding: { ...nicheData.branding, banner: imageUrl } as any,
        });
        toast.success("Баннер сгенерирован!");
      }
    } catch (error) {
      handleGeminiError(error, "Ошибка при генерации баннера");
    } finally {
      setIsGeneratingBanner(false);
    }
  };

  const handleGenerateVideoCTA = async (idea: string) => {
    if (!selectedNiche) return;
    setIsGeneratingCTA(idea);
    try {
      const ctaText = await generateVideoCTA(idea, selectedNiche);
      setGeneratedCTAs((prev) => ({
        ...prev,
        [idea]: ctaText,
      }));
      toast.success("Призыв к действию сгенерирован!");
    } catch (error) {
      handleGeminiError(error, "Ошибка при генерации CTA");
    } finally {
      setIsGeneratingCTA(null);
    }
  };

  const ensureIdeaInMainList = (title: string, ideaObj?: any) => {
    if (!nicheData) return;
    const currentIdeas = nicheData.ideas || [];
    const exists = currentIdeas.some((ci: any) => (typeof ci === "string" ? ci : ci.title) === title);
    if (!exists) {
      const newIdea = ideaObj || {
        title,
        description: `Идея из генератора трендов`,
        duration: "30-50 сек",
        tone: "Динамичный",
        viral_potential: "Высокий (90%)"
      };
      setNicheData({
        ...nicheData,
        ideas: [...currentIdeas, newIdea]
      });
      toast.success(`Идея "${title}" добавлена в основной список!`);
    }
  };

  const handleGenerateSequels = async (ideaTitle: string, itemContent?: string) => {
    setIsGeneratingSequels(prev => ({ ...prev, [ideaTitle]: true }));
    try {
      // Collect history context from past scenarios and current item content
      const historyContextParts: string[] = [];
      if (itemContent) {
        historyContextParts.push(`Текущий выбранный сценарий/выпуск ("${ideaTitle}"):\n${itemContent.slice(0, 800)}`);
      }
      
      const pastItemsSummary = historyItems
        .filter(item => item && (item.title || item.content))
        .slice(0, 5)
        .map((item, idx) => `- [${item.type || 'Сценарий'}] "${item.title}": ${(item.content || '').substring(0, 200)}`)
        .join('\n');

      if (pastItemsSummary) {
        historyContextParts.push(`Прошлые сценарии в истории канала:\n${pastItemsSummary}`);
      }

      const pastHistoryContext = historyContextParts.join('\n\n');

      const sequels = await generateSequelsForIdea(
        ideaTitle,
        selectedNiche || customNiche,
        { 
          model: selectedModel, 
          deepResearch, 
          customInstructions,
          pastHistoryContext 
        }
      );
      
      const playlistName = `🎬 Серия: ${ideaTitle.length > 25 ? ideaTitle.substring(0, 25) + '...' : ideaTitle}`;
      
      // Ensure playlist exists
      setIdeaPlaylists(prev => {
        if (prev.includes(playlistName)) return prev;
        return [...prev, playlistName];
      });

      // Format sequels
      const formattedSequels = sequels.map((s: any) => {
        if (typeof s === 'string') {
        
  return {
            title: s,
            description: `Сиквел для темы: "${ideaTitle}"`,
            duration: "30-50 сек",
            tone: "Динамичный",
            viral_potential: "Высокий (90%)"
          };
        } else {
        
  return {
            ...s,
            title: s.title || "Без названия",
            description: s.description || `Сиквел для темы: "${ideaTitle}"`,
            duration: s.duration || "30-50 сек",
            tone: s.tone || "Динамичный",
            viral_potential: s.viral_potential || "Высокий (90%)"
          };
        }
      });

      // Ensure parent idea is also in the main list
      ensureIdeaInMainList(ideaTitle);

      // Append sequels to the main ideas list (nicheData.ideas)
      if (nicheData) {
        setNicheData((prev: any) => {
          if (!prev) return prev;
          const currentIdeas = prev.ideas || [];
          const newIdeasToAppend = formattedSequels.filter((seq: any) => 
            !currentIdeas.some((ci: any) => (typeof ci === 'string' ? ci : ci.title) === seq.title)
          );
        
  return {
            ...prev,
            ideas: [...currentIdeas, ...newIdeasToAppend]
          };
        });
      }

      // Assign parent idea and sequels to this playlist
      setIdeaAssignments(prev => {
        const next = { ...prev };
        
        next[ideaTitle] = {
          ...next[ideaTitle],
          playlist: playlistName
        };

        formattedSequels.forEach((seq: any) => {
          next[seq.title] = {
            ...next[seq.title],
            playlist: playlistName
          };
        });

        return next;
      });

      // Set the playlist filter to show this playlist
      setSelectedPlaylistFilter(playlistName);

      // Also add to trendingIdeas list
      setTrendingIdeas(prev => {
        const idx = prev.findIndex(i => (typeof i === 'string' ? i : i.title) === ideaTitle);
        if (idx === -1) return [...prev, ...formattedSequels];
        const newIdeas = [...prev];
        newIdeas.splice(idx + 1, 0, ...formattedSequels);
        return newIdeas;
      });

      toast.success(`Серия создана! Создан плейлист "${playlistName}" с исходной идеей и сиквелами.`);
    } catch (error) {
      handleGeminiError(error, "Ошибка при генерации серии");
    } finally {
      setIsGeneratingSequels(prev => ({ ...prev, [ideaTitle]: false }));
    }
  };

  const handleGenerateIdeaDetails = async (idea: string) => {
    const effectiveNiche = selectedNiche?.trim() || customNiche?.trim() || "Общая тематика";

    setIsGeneratingIdeaDetails(prev => ({ ...prev, [idea]: true }));
    const toastId = toast.loading(`Генерируем подробный план сценария для идеи "${idea}"...`);
    try {
      // Find the idea's description and notes
      let ideaDescription = "";
      const allIdeas = [
        ...(nicheData?.ideas || []),
        ...(trendingIdeas || [])
      ];
      const ideaObj = allIdeas.find((i: any) => (typeof i === 'string' ? i : i?.title) === idea);
      if (ideaObj && typeof ideaObj === 'object') {
        ideaDescription = ideaObj.description || "";
      }
      
      const assignment = ideaAssignments[idea] || {};
      const ideaNote = assignment.note || "";

      const details = await generateIdeaDetails(
        idea,
        effectiveNiche,
        selectedBranding?.name,
        getCompetitorAnalysis(),
        { 
          toneOfVoice, 
          model: selectedModel, 
          deepResearch,
          ideaDescription,
          ideaNote
        }
      );

      const baseNicheData: any = nicheData || {
        potential: { demand: 75, competition: 50, monetization: 80, score: 70, summary: "План сценария" },
        subNiches: [],
        branding: { names: [], colors: [], fonts: [] },
        ideas: [],
        popularIdeas: [],
        scriptTemplate: [],
        editingTips: [],
        seo: { keywords: "", hashtags: [], titlePrototypes: [] },
        analytics: {
          views: "10K - 50K",
          retention: "50%",
          ctr: "8%",
          estimatedEarnings: "$100 - $500",
          subscriberGrowth: [],
          competitorComparison: [],
          growthStrategy: []
        },
        shorts: [],
        competitors: [],
        audienceData: [],
        trendData: []
      };

      setNicheData({
        ...baseNicheData,
        scriptTemplate: details.scriptTemplate || baseNicheData.scriptTemplate,
        editingTips: details.editingTips || baseNicheData.editingTips,
        seo: details.seo || baseNicheData.seo,
        analytics: details.analytics || baseNicheData.analytics,
        shorts: details.shorts || baseNicheData.shorts,
        production: details.production || baseNicheData.production,
      });

      if (details.production) {
        if (!pinnedStyles.imageStyle) setPromptImageStyle(details.production.visualStyle);
        if (!pinnedStyles.animationType) setPromptAnimationType(details.production.animationType);
        if (!pinnedStyles.audioEnvironment) setPromptMusicMood(details.production.musicMood);
      }
      setScriptKeywords(idea);
      setScriptTopic(idea);
      setScriptStructure([]);
      setGeneratedBlocks({});
      setBlockRefinements({});
      setScriptBreakdown([]);

      // Auto-populate wishes with the generated plan and author notes
      if (details.scriptTemplate && Array.isArray(details.scriptTemplate) && details.scriptTemplate.length > 0) {
        const planText = details.scriptTemplate.map((t: any) => `${t.phase}: ${t.content}`).join("\n");
        const fullWishes = ideaNote ? `${planText}\n\n[Заметки автора]: ${ideaNote}` : planText;
        setScriptWishes(fullWishes);
      }
      
      // Clear SEO state for the new Idea
      setVideoSEO(null);
      setSeoAnalysis(null);
      setTitleAnalysis(null);
      setPreviewThumbnail("");
      setThumbnailVariants([]);
      setThumbnailStyleSuggestions([]);
      
      // Update status of the idea to "Сценарий" instead of auto-deleting it
      setIdeaAssignments(prev => ({
        ...prev,
        [idea]: {
          ...(prev[idea] || {}),
          status: "Сценарий"
        }
      }));

      setActivePage("Сценарий");
      toast.success(`План сценария для "${idea}" готов! Перешли на вкладку «Сценарий».`, { id: toastId });

      await saveToHistory(
        "Идея",
        `Детали идеи: ${idea}`,
        JSON.stringify(details),
        { idea },
      );
    } catch (error) {
      toast.dismiss(toastId);
      handleGeminiError(error, "Ошибка при генерации деталей идеи");
    } finally {
      setIsGeneratingIdeaDetails(prev => ({ ...prev, [idea]: false }));
    }
  };

  const handleGenerateFullShortsContent = async (shortIdea: string) => {
    setScriptTopic(shortIdea);
    setScriptDuration("1");
    setScriptMode("Shorts");
    setScriptStructure([]);
    setGeneratedBlocks({});
    setBlockRefinements({});
    setScriptBreakdown([]);
    
    // Clear SEO state for the new Short
    setVideoSEO(null);
    setSeoAnalysis(null);
    setTitleAnalysis(null);
    setPreviewThumbnail("");
    setThumbnailVariants([]);
    setThumbnailStyleSuggestions([]);
    
    setActivePage("Сценарий");

    // 1. Generate Structure
    setIsGeneratingStructure(true);
    let structure;
    try {
      const mode = "Shorts";
      const tone = scriptTone || "Динамичный, вовлекающий";
      structure = await generateScriptStructure(
        shortIdea,
        "1",
        mode,
        tone,
        "",
        getCompetitorAnalysis(),
        getCommonAnalysisOptions({ noVoiceover: scriptNoVoiceover }),
      );
      setScriptStructure(structure);
      toast.info("Структура создана, пишем текст...");
    } catch (error) {
      handleGeminiError(error, "Ошибка при генерации структуры Shorts");
      setIsGeneratingStructure(false);
      return;
    } finally {
      setIsGeneratingStructure(false);
    }

    if (!structure || structure.length === 0) return;

    // 2. Generate all Blocks
    const newBlocks: { [key: number]: GeneratedBlock } = {};
    let fullText = "";

    const blockIndices = structure.map((_, i) => i);

    // Set loading state for blocks
    const newIsGeneratingBlock = { ...isGeneratingBlock };
    blockIndices.forEach((idx) => {
      newIsGeneratingBlock[idx] = true;
    });
    setIsGeneratingBlock(newIsGeneratingBlock);

    try {
      for (const index of blockIndices) {
        const block = structure[index];
        const prevContext = fullText.slice(-500);
        const generated = await generateScriptBlock(
          shortIdea,
          block,
          "",
          prevContext,
          "1",
          getCompetitorAnalysis(),
          getCommonAnalysisOptions({ noVoiceover: scriptNoVoiceover })
        );
        newBlocks[index] = generated;
        fullText += (fullText ? "\n\n" : "") + generated.text;

        // Update state progressively
        setGeneratedBlocks((prev) => ({ ...prev, [index]: generated }));
      }
      toast.success("Текст сценария готов! Переходим к разбивке...");
    } catch (error) {
      handleGeminiError(error, "Ошибка при генерации текста блоков");
      return;
    } finally {
      const resetIsGeneratingBlock = { ...isGeneratingBlock };
      blockIndices.forEach((idx) => {
        resetIsGeneratingBlock[idx] = false;
      });
      setIsGeneratingBlock(resetIsGeneratingBlock);
    }

    // 3. Generate Breakdown
    setIsGeneratingBreakdown(true);
    let breakdown;
    try {
      const durationVal = scriptDuration === "custom" ? scriptCustomDuration : String(scriptDuration);
      breakdown = await generateScriptBreakdown(
        fullText,
        selectedNiche || "",
        scriptTopic,
        scriptWishes,
        durationVal,
        getCommonAnalysisOptions({
          noVoiceover: scriptNoVoiceover,
          referenceImages: scriptReferenceImages,
          youtubeLinks: scriptYoutubeLinks
        })
      );
      
      setScriptBreakdown(breakdown);
      if (scriptReferenceImages.length > 0 || scriptYoutubeLinks.some(l => l.trim() !== '')) {
         setIsReferencesUsed(true);
      }
      toast.success("Разбивка готова! Настраиваем визуальный стиль...");
    } catch (error) {
      handleGeminiError(error, "Ошибка при генерации разбивки");
      return;
    } finally {
      setIsGeneratingBreakdown(false);
    }

    if (!breakdown || breakdown.length === 0) return;

    // 4. Generate Production Style
    setIsGeneratingGlobalProduction(true);
    try {
      const config = await generateProductionStyleFromContext(
        shortIdea,
        scriptTone || "Динамичный",
        "Shorts",
        breakdown,
        {
          imageStyle: pinnedStyles.imageStyle ? promptImageStyle : undefined,
          animationType: pinnedStyles.animationType ? promptAnimationType : undefined,
        },
        getCommonAnalysisOptions({ branding: brandProfile ? JSON.stringify(brandProfile) : "" })
      );

      if (!pinnedStyles.imageStyle) {
        setPromptImageStyle(config.imageStyle);
      }
      if (!pinnedStyles.animationType) {
        setPromptAnimationType(config.animationType);
      }
      if (!pinnedStyles.audioEnvironment) {
        setPromptMusicMood(config.musicMood);
        if (config.generalAudioPrompt) setGeneralAudioPrompt(config.generalAudioPrompt);
      }
      if (config.scenePrompts) setScenePrompts(config.scenePrompts);

      toast.success("Полный контент для Shorts сгенерирован!");
    } catch (error) {
      handleGeminiError(error, "Ошибка при генерации стиля продакшена");
    } finally {
      setIsGeneratingGlobalProduction(false);
    }
  };

  const handleGenerateScriptStructure = async () => {
    if (!scriptTopic) return;

    setIsGeneratingStructure(true);
    toast.info("Проектирование структуры и плана сценария...");
    setScriptStructure([]);
    setGeneratedBlocks({});
    setBlockRefinements({});
    setScriptBreakdown([]);

    try {
      const mode =
        scriptMode === "Свой вариант" ? scriptCustomMode : scriptMode;
      const durationVal = scriptDuration === "custom" ? scriptCustomDuration : String(scriptDuration);
      const structure = await generateScriptStructure(
        scriptTopic,
        durationVal,
        mode,
        scriptTone,
        scriptWishes,
        getCompetitorAnalysis(),
        getCommonAnalysisOptions({ toneOfVoice, noVoiceover: scriptNoVoiceover }),
      );
      setScriptStructure(structure);
      setIsScriptTopicLocked(true);
      toast.success("Структура сценария сгенерирована!");
      await saveToHistory(
        "Сценарий",
        `Структура сценария: ${scriptTopic}`,
        JSON.stringify(structure),
        {
          scriptTopic,
          scriptDuration: durationVal,
          scriptMode: mode,
          scriptTone,
          scriptWishes,
          scriptNoVoiceover,
        },
      );
    } catch (error) {
      handleGeminiError(error, "Ошибка при генерации структуры сценария");
    } finally {
      setIsGeneratingStructure(false);
    }
  };

  const handleScriptFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        setIsParsingUploadedScript(true);
        try {
          const text = content.trim();
          
          // Use AI to parse the uploaded script into logical blocks
          const parsed = await parseUploadedScript(text, { toneOfVoice, model: selectedModel });
          
          const newStructure: any[] = [];
          const newGeneratedBlocks: Record<number, GeneratedBlock> = {};
          
          parsed.forEach((part, idx) => {
            newStructure.push({
               title: part.phase,
               type: idx === 0 ? "Вступление" : (idx === parsed.length - 1 ? "Заключение" : "Основная часть"),
               estimatedTime: "Определяется",
               estimatedChars: part.content.length,
               description: "Фрагмент загруженного сценария"
            });
            newGeneratedBlocks[idx] = {
               text: part.content,
               title: part.phase,
               scenes: []
            };
          });
          
          setScriptStructure(newStructure);
          setGeneratedBlocks(newGeneratedBlocks);

          const firstLine =
            content.split("\n")[0].trim().substring(0, 50) ||
            "Загруженный сценарий";
          setScriptTopic(firstLine);

          toast.info("Разбиваем текст на монтажный лист...");
          try {
            const durationVal = scriptDuration === "custom" ? scriptCustomDuration : String(scriptDuration);
            const freshBreakdown = await generateScriptBreakdown(
              text,
              selectedNiche || "",
              firstLine,
              scriptWishes,
              durationVal,
              { model: selectedModel, noVoiceover: scriptNoVoiceover, referenceImages: scriptReferenceImages, youtubeLinks: scriptYoutubeLinks }
            );
            if (freshBreakdown && freshBreakdown.length > 0) {
              setScriptBreakdown(freshBreakdown);
            }
          } catch (e) {
            logger.warn("Ошибка при создании монтажного листа", e);
          }

          toast.success("Сценарий успешно загружен и разбит на блоки!");
        } catch (error) {
          logger.error(error);
          toast.error("Ошибка при загрузке сценария");
        } finally {
          setIsParsingUploadedScript(false);
          // Reset input
          e.target.value = "";
        }
      }
    };
    reader.readAsText(file);
  };

  const handleExportIdeasToTxt = () => {
    if (!nicheData?.ideas) {
      toast.error("Сначала сгенерируйте идеи");
      return;
    }
    const content = (nicheData.ideas || []).map((idea, i) => `${i + 1}. ${idea.title}`).join('\n');
    exportToTxt(content, `ideas_${selectedNiche || 'youtube'}_${new Date().toLocaleDateString()}`);
    toast.success("Идеи экспортированы в TXT");
  };

  const handleTranslateScript = async (targetLang: string) => {
    if (Object.keys(generatedBlocks || {}).length === 0) {
      toast.error("Сначала сгенерируйте блоки сценария");
      return;
    }

    const toastId = toast.loading(`Перевод сценария на ${targetLang}...`);
    setIsTranslating(true);

    try {
      const newBlocks = { ...generatedBlocks };
      const blockEntries = Object.entries(generatedBlocks);

      for (const [index, block] of blockEntries) {
        if (!block.text) continue;
        const translatedText = await translateContent(block.text, targetLang, { model: selectedModel });
        newBlocks[Number(index)] = {
          ...block,
          text: translatedText
        };
      }

      setGeneratedBlocks(newBlocks);
      setSelectedLanguage(targetLang);
      toast.success(`Сценарий успешно переведен на ${targetLang}!`, { id: toastId });
    } catch (error) {
      handleGeminiError(error, "Ошибка при переводе сценария");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleRewriteBlock = async (
    index: number,
    mode: "humor" | "simple" | "drama",
  ) => {
    const block = generatedBlocks[index];
    if (!block) return;

    setIsRewritingBlock((prev) => ({ ...prev, [index]: true }));
    try {
      const rewritten = await rewriteScriptBlock(block.text, mode, scriptTopic, getCommonAnalysisOptions({ toneOfVoice }));
      
      toast.info("Перерасчет технического плана...");
      const durationVal = scriptDuration === "custom" ? scriptCustomDuration : String(scriptDuration);
      const newScenes = await generateScriptBreakdown(
        rewritten,
        selectedNiche || "",
        scriptTopic,
        scriptWishes,
        durationVal,
        getCommonAnalysisOptions({
          noVoiceover: scriptNoVoiceover,
          referenceImages: scriptReferenceImages,
          youtubeLinks: scriptYoutubeLinks
        })
      );

      setGeneratedBlocks((prev) => ({
        ...prev,
        [index]: { ...block, text: rewritten, scenes: newScenes },
      }));
      recordBlockHistory(index, rewritten, mode === "humor" ? "🤖 AI Юмор" : mode === "simple" ? "👶 AI Упрощение" : "🎭 AI Драма");
      toast.success("Блок и технический план переписаны!");
    } catch (error) {
      handleGeminiError(error, "Ошибка при переписывании блока");
    } finally {
      setIsRewritingBlock((prev) => ({ ...prev, [index]: false }));
    }
  };

  const handleSplitBlock = async (index: number) => {
    const origBlock = generatedBlocks[index];
    const fullText = origBlock?.text || "";

    if (fullText.trim().length < 15) {
      toast.error("Текст блока слишком короткий для разделения (минимум 15 символов)");
      return;
    }

    const textarea = blockTextareaRefs.current[index];
    let pos = textarea ? textarea.selectionStart : -1;

    if (pos <= 5 || pos >= fullText.length - 5) {
      const mid = Math.floor(fullText.length / 2);
      const nextPeriod = fullText.indexOf('. ', mid);
      const nextNewline = fullText.indexOf('\n', mid);
      if (nextPeriod !== -1 && (nextNewline === -1 || nextPeriod < nextNewline)) {
        pos = nextPeriod + 1;
      } else if (nextNewline !== -1) {
        pos = nextNewline + 1;
      } else {
        pos = mid;
      }
    }

    const textPart1 = fullText.substring(0, pos).trim();
    const textPart2 = fullText.substring(pos).trim();

    if (!textPart1 || !textPart2) {
      toast.error("Не удалось разделить блок на две содержательные части");
      return;
    }

    const origStructureItem = scriptStructure[index] || {
      id: String(Date.now()),
      title: `Блок ${index + 1}`,
      type: "Main",
      duration: 30,
      context: "Сценарий"
    };

    const cleanTitle = (origStructureItem.title || "").replace(/\s*\(Часть \d+\)/g, '');
    const title1 = `${cleanTitle} (Часть 1)`;
    const title2 = `${cleanTitle} (Часть 2)`;

    const newStructureItem1 = { ...origStructureItem, title: title1 };
    const newStructureItem2 = { ...origStructureItem, id: String(Date.now() + 1), title: title2 };

    const newStructure = [...scriptStructure];
    newStructure.splice(index, 1, newStructureItem1, newStructureItem2);

    const newBlocks: Record<number, GeneratedBlock> = {};
    const oldKeys = Object.keys(generatedBlocks).map(Number).sort((a, b) => a - b);

    for (const k of oldKeys) {
      if (k < index) {
        newBlocks[k] = generatedBlocks[k];
      } else if (k === index) {
        newBlocks[index] = {
          ...origBlock,
          title: title1,
          text: textPart1,
          scenes: []
        };
        newBlocks[index + 1] = {
          ...origBlock,
          title: title2,
          text: textPart2,
          scenes: []
        };
      } else {
        newBlocks[k + 1] = generatedBlocks[k];
      }
    }

    setScriptStructure(newStructure);
    setGeneratedBlocks(newBlocks);
    toast.success(`Блок "${cleanTitle}" успешно разделен на 2 части! Перегенерация технического плана...`);

    setIsGeneratingBlock((prev) => ({ ...prev, [index]: true, [index + 1]: true }));

    try {
      const durationVal = scriptDuration === "custom" ? scriptCustomDuration : String(scriptDuration);
      const options = getCommonAnalysisOptions({
        noVoiceover: scriptNoVoiceover,
        referenceImages: scriptReferenceImages,
        youtubeLinks: scriptYoutubeLinks
      });

      const [scenes1, scenes2] = await Promise.all([
        generateScriptBreakdown(textPart1, selectedNiche || "", scriptTopic, scriptWishes, durationVal, options).catch(() => []),
        generateScriptBreakdown(textPart2, selectedNiche || "", scriptTopic, scriptWishes, durationVal, options).catch(() => [])
      ]);

      setGeneratedBlocks((prev) => {
        if (!prev[index] || !prev[index + 1]) return prev;
        return {
          ...prev,
          [index]: { ...prev[index], scenes: scenes1 },
          [index + 1]: { ...prev[index + 1], scenes: scenes2 }
        };
      });

      toast.success("Технический план для обеих частей блока сгенерирован!");
    } catch (err) {
      logger.error("Error regenerating tech plan for split blocks:", err);
      toast.error("Ошибка при генерации техплана для новых частей");
    } finally {
      setIsGeneratingBlock((prev) => ({ ...prev, [index]: false, [index + 1]: false }));
    }
  };

  // Scene Editing Handlers for Montage List (Breakdown)
  const syncSceneChangesToGeneratedBlocks = (
    sourceScene: any,
    updater: (scene: any) => any,
    fallbackIndex?: number
  ) => {
    if (!sourceScene || sourceScene.blockIndex === undefined) return;

    const blockIndex = Number(sourceScene.blockIndex);
    const matchIndex = typeof fallbackIndex === 'number' ? fallbackIndex : -1;

    setGeneratedBlocks((prev: any) => {
      const block = prev[blockIndex];
      if (!block || !Array.isArray(block.scenes)) return prev;

      const updatedScenes = block.scenes.map((scene: any, idx: number) => {
        const matchesByIndex = idx === matchIndex || idx === sceneIndexForMatching(scene, sourceScene, matchIndex);
        const matchesByText =
          typeof scene.text === 'string' && typeof sourceScene.text === 'string' && scene.text === sourceScene.text;
        const matchesBySceneId =
          typeof scene.scene === 'string' && typeof sourceScene.scene === 'string' && scene.scene === sourceScene.scene;
        const matchesByFallback =
          !scene.scene && !sourceScene.scene && idx === matchIndex;

        if (matchesByIndex || matchesByText || matchesBySceneId || matchesByFallback) {
          return updater(scene);
        }

        return scene;
      });

      return { ...prev, [blockIndex]: { ...block, scenes: updatedScenes } };
    });
  };

  const sceneIndexForMatching = (scene: any, sourceScene: any, fallbackIndex: number) => {
    // Fallback for items without a stable scene.id; prefer the original array index.
    if (typeof fallbackIndex === 'number' && fallbackIndex >= 0) {
      return fallbackIndex;
    }

    if (scene && sourceScene && scene.text && sourceScene.text && scene.text === sourceScene.text) {
      return -1;
    }

    return -1;
  };

  const handleAddNewScene = (targetBlockIndex?: number) => {
    const currentScenes = scriptBreakdown ? [...scriptBreakdown] : [];

    const newScene = {
      text: "Новый кадр дикторской озвучки",
      description: "Новый визуальный ряд кадра",
      shotType: "Средний план",
      duration: 5,
      visuals: { description: "Новый визуальный ряд кадра", searchQuery: "cinematic", shotType: "Средний план", resourceLinks: [] },
      audio: { soundsAndNoises: "Интершум", backgroundMusic: "Фоновая музыка" },
      voiceover: { voiceName: "Aoede", settings: "Средний темп", intonation: "Нейтральная", mood: "Спокойное", timbre: "Нейтральный" },
      blockIndex: typeof targetBlockIndex === 'number' && targetBlockIndex >= 0 ? targetBlockIndex : 0,
      blockTitle: typeof targetBlockIndex === 'number' && scriptStructure?.[targetBlockIndex]
        ? scriptStructure[targetBlockIndex].title
        : `Блок ${(targetBlockIndex || 0) + 1}`
    };

    const updated = [...currentScenes, newScene];
    setScriptBreakdown(updated);
    toast.success("Новый кадр успешно добавлен в монтажный лист!");
  };

  const handleDeleteScene = (sceneIndex: number) => {
    const currentScenes = (scriptBreakdown && scriptBreakdown.length > 0)
      ? [...scriptBreakdown]
      : getUnifiedScriptScenes(scriptBreakdown, generatedBlocks, scriptStructure);

    if (sceneIndex < 0 || sceneIndex >= currentScenes.length) return;

    const updated = currentScenes.filter((_, idx) => idx !== sceneIndex);
    setScriptBreakdown(updated);
    toast.success("Кадр удален из монтажного листа");
  };

  const handleUpdateSceneDuration = (sceneIndex: number, duration: number) => {
    const currentScenes = (scriptBreakdown && scriptBreakdown.length > 0)
      ? [...scriptBreakdown]
      : getUnifiedScriptScenes(scriptBreakdown, generatedBlocks, scriptStructure);

    if (sceneIndex < 0 || sceneIndex >= currentScenes.length) return;

    const validDuration = Math.min(10, Math.max(1, duration));
    const updated = currentScenes.map((sc, idx) => {
      if (idx === sceneIndex) {
        return { ...sc, duration: validDuration };
      }
      return sc;
    });

    setScriptBreakdown(updated);

    const targetScene = updated[sceneIndex];
    if (targetScene && targetScene.blockIndex !== undefined) {
      syncSceneChangesToGeneratedBlocks(targetScene, (scene: any) => ({ ...scene, duration: validDuration }), sceneIndex);
    }
  };

  const handleUpdateSceneShotType = (sceneIndex: number, shotType: string) => {
    const currentScenes = (scriptBreakdown && scriptBreakdown.length > 0)
      ? [...scriptBreakdown]
      : getUnifiedScriptScenes(scriptBreakdown, generatedBlocks, scriptStructure);

    if (sceneIndex < 0 || sceneIndex >= currentScenes.length) return;

    const updated = currentScenes.map((sc, idx) => {
      if (idx === sceneIndex) {
        return {
          ...sc,
          shotType,
          visuals: typeof sc.visuals === 'object' && sc.visuals !== null
            ? { ...sc.visuals, shotType }
            : { description: getSceneVisualText(sc), searchQuery: 'cinematic', shotType, resourceLinks: [] }
        };
      }
      return sc;
    });

    setScriptBreakdown(updated);

    const targetScene = updated[sceneIndex];
    if (targetScene && targetScene.blockIndex !== undefined) {
      syncSceneChangesToGeneratedBlocks(targetScene, (scene: any) => ({
        ...scene,
        shotType,
        visuals: typeof scene.visuals === 'object' && scene.visuals !== null
          ? { ...scene.visuals, shotType }
          : { description: getSceneVisualText(scene), searchQuery: 'cinematic', shotType, resourceLinks: [] }
      }), sceneIndex);
    }
  };

  const handleUpdateSceneText = (sceneIndex: number, text: string) => {
    const currentScenes = (scriptBreakdown && scriptBreakdown.length > 0)
      ? [...scriptBreakdown]
      : getUnifiedScriptScenes(scriptBreakdown, generatedBlocks, scriptStructure);

    if (sceneIndex < 0 || sceneIndex >= currentScenes.length) return;

    const updated = currentScenes.map((sc, idx) => {
      if (idx === sceneIndex) {
        return { ...sc, text };
      }
      return sc;
    });

    setScriptBreakdown(updated);

    const targetScene = updated[sceneIndex];
    if (targetScene && targetScene.blockIndex !== undefined) {
      syncSceneChangesToGeneratedBlocks(targetScene, (scene: any) => ({ ...scene, text }), sceneIndex);
    }
  };

  const handleUpdateSceneVisual = (sceneIndex: number, description: string) => {
    const currentScenes = (scriptBreakdown && scriptBreakdown.length > 0)
      ? [...scriptBreakdown]
      : getUnifiedScriptScenes(scriptBreakdown, generatedBlocks, scriptStructure);

    if (sceneIndex < 0 || sceneIndex >= currentScenes.length) return;

    const updated = currentScenes.map((sc, idx) => {
      if (idx === sceneIndex) {
        // Auto-tag SFX based on the updated visual description and scene text
        const autoSFX = autoGenerateSFXFromScene(description, sc.text || '');
        const autoSFXString = autoSFX.join(', ');
        
        return {
          ...sc,
          description,
          visual: description,
          visuals: typeof sc.visuals === 'object' && sc.visuals !== null
            ? { ...sc.visuals, description }
            : { description, searchQuery: 'cinematic background', shotType: sc.shotType || 'Средний план', resourceLinks: [] },
          audio: {
            ...(sc.audio || {}),
            soundsAndNoises: autoSFXString || sc.audio?.soundsAndNoises || "Whoosh"
          }
        };
      }
      return sc;
    });

    setScriptBreakdown(updated);

    // Sync sceneSummary in scenePrompts for immediate visual integration
    const updatedPrompts = [...(scenePrompts || [])];
    while (updatedPrompts.length <= sceneIndex) {
      updatedPrompts.push({ sceneSummary: '', startFramePrompt: '', endFramePrompt: '', imagePrompt: '', animationPrompt: '' });
    }
    updatedPrompts[sceneIndex] = {
      ...updatedPrompts[sceneIndex],
      sceneSummary: description
    };
    setScenePrompts(updatedPrompts);

    // Also update generatedBlocks for complete two-way synchronization
    const targetScene = updated[sceneIndex];
    if (targetScene && targetScene.blockIndex !== undefined) {
      const bIdx = targetScene.blockIndex;
      setGeneratedBlocks((prev: any) => {
        const block = prev[bIdx];
        if (!block || !block.scenes) return prev;
        const updatedScenes = block.scenes.map((sc: any) => {
          if (sc.scene === targetScene.scene && sc.text === targetScene.text) {
            return {
              ...sc,
              description: targetScene.description,
              visuals: typeof sc.visuals === 'object' && sc.visuals !== null
                ? { ...sc.visuals, description }
                : { description, searchQuery: 'cinematic background', shotType: sc.shotType || 'Средний план', resourceLinks: [] },
              audio: {
                ...(sc.audio || {}),
                soundsAndNoises: targetScene.audio?.soundsAndNoises || sc.audio?.soundsAndNoises || "Whoosh"
              }
            };
          }
          return sc;
        });
        return {
          ...prev,
          [bIdx]: { ...block, scenes: updatedScenes }
        };
      });
    }
  };

  const handleAttachBrollToScene = (blockIndex: number, sceneIndex: number, brollData: any) => {
    setGeneratedBlocks((prev: any) => {
      const block = prev[blockIndex];
      if (!block || !block.scenes || !block.scenes[sceneIndex]) return prev;
      const updatedScenes = [...block.scenes];
      const targetScene = { ...updatedScenes[sceneIndex] };
      const currentLinks = Array.isArray(targetScene.brollLinks) ? [...targetScene.brollLinks] : [];
      currentLinks.push(brollData);
      targetScene.brollLinks = currentLinks;
      targetScene.brollUrl = brollData.videoUrl || brollData.url || brollData.pexelsUrl || targetScene.brollUrl;
      updatedScenes[sceneIndex] = targetScene;
      return {
        ...prev,
        [blockIndex]: {
          ...block,
          scenes: updatedScenes
        }
      };
    });
  };

  const handleRemoveBrollFromScene = (blockIndex: number, sceneIndex: number, brollId: any) => {
    setGeneratedBlocks((prev: any) => {
      const block = prev[blockIndex];
      if (!block || !block.scenes || !block.scenes[sceneIndex]) return prev;
      const updatedScenes = [...block.scenes];
      const targetScene = { ...updatedScenes[sceneIndex] };
      if (Array.isArray(targetScene.brollLinks)) {
        targetScene.brollLinks = targetScene.brollLinks.filter((b: any, idx: number) => (b.id ? b.id !== brollId : idx !== brollId));
      }
      if (targetScene.brollLinks && targetScene.brollLinks.length === 0) {
        delete targetScene.brollUrl;
      }
      updatedScenes[sceneIndex] = targetScene;
      return {
        ...prev,
        [blockIndex]: {
          ...block,
          scenes: updatedScenes
        }
      };
    });
  };

  const handleUpdateSceneSFXTags = (sceneIndex: number, newTags: string[]) => {
    const currentScenes = (scriptBreakdown && scriptBreakdown.length > 0)
      ? [...scriptBreakdown]
      : getUnifiedScriptScenes(scriptBreakdown, generatedBlocks, scriptStructure);

    if (sceneIndex < 0 || sceneIndex >= currentScenes.length) return;

    const sfxString = newTags.length > 0 ? newTags.join(', ') : 'нет';
    const updated = currentScenes.map((sc, idx) => {
      if (idx === sceneIndex) {
        return {
          ...sc,
          audio: { ...(sc.audio || {}), soundsAndNoises: sfxString }
        };
      }
      return sc;
    });

    setScriptBreakdown(updated);
  };

  const handleAutoTagSceneSFX = (sceneIndex: number) => {
    const currentScenes = (scriptBreakdown && scriptBreakdown.length > 0)
      ? [...scriptBreakdown]
      : getUnifiedScriptScenes(scriptBreakdown, generatedBlocks, scriptStructure);

    if (sceneIndex < 0 || sceneIndex >= currentScenes.length) return;

    const targetScene = currentScenes[sceneIndex];
    const visDesc = getSceneVisualText(targetScene);
    const textDesc = targetScene.text || '';
    const newTags = autoGenerateSFXFromScene(visDesc, textDesc);

    handleUpdateSceneSFXTags(sceneIndex, newTags);
    toast.success(`Сгенерировано ${newTags.length} звуковых тегов для сцены!`);
  };

  const handleGenerateSRT = async () => {
    const fullScript = getFullScriptText(generatedBlocks);
    if (!fullScript) {
      toast.error("Сначала сгенерируйте сценарий");
      return;
    }

    setIsGeneratingSRT(true);
    try {
      const srtContent = await generateSRTContent(fullScript, { model: selectedModel });
      exportToSrt(srtContent, `Субтитры_${scriptTopic}`);
      toast.success("SRT файл сгенерирован и скачан");
    } catch (error) {
      handleGeminiError(error, "Ошибка при генерации субтитров");
    } finally {
      setIsGeneratingSRT(false);
    }
  };

  const handleGenerateFullScript = async () => {
    setIsGeneratingFullScript(true);
    toast.info("Запуск генерации всех блоков сценария...");
    setScriptProgress(0);
    try {
      for (let i = 0; i < scriptStructure.length; i++) {
        await handleGenerateScriptBlock(i);
        setScriptProgress(Math.round(((i + 1) / scriptStructure.length) * 100));
      }
      toast.success("Полный сценарий успешно сгенерирован!");
    } catch (error) {
      handleGeminiError(error, "Ошибка при генерации полного сценария");
    } finally {
      setIsGeneratingFullScript(false);
      setScriptProgress(0);
    }
  };

  const handleGenerateScriptBlock = async (index: number) => {
    if (!scriptStructure[index]) return;

    setIsGeneratingBlock((prev) => ({ ...prev, [index]: true }));
    toast.info(`Генерация текста для блока ${index + 1}: "${scriptStructure[index].title}"...`);

    try {
      // Gather previous context
      let previousContext = "";
      for (let i = 0; i < index; i++) {
        const block = generatedBlocks[i];
        if (block) {
          previousContext += `Блок ${i + 1} (${scriptStructure[i].title}):\n${block.text}\n\n`;
        }
      }

      const combinedWishes = [scriptWishes, blockRefinements[index]].filter(Boolean).join("\n\nДополнительно для этого блока: ");

      const durationVal = scriptDuration === "custom" ? scriptCustomDuration : String(scriptDuration);

      const result = await generateScriptBlock(
        scriptTopic,
        scriptStructure[index],
        combinedWishes,
        previousContext,
        durationVal,
        getCompetitorAnalysis(),
        {
          model: selectedModel,
          noVoiceover: scriptNoVoiceover,
          globalMusicMood: promptMusicMood,
          globalAudioPrompt: generalAudioPrompt
        }
      );

      try {
        toast.info("Генерация технического плана сцен...");
        const scenes = await generateScriptBreakdown(result.text, selectedNiche || "", scriptTopic, scriptWishes, durationVal, { model: selectedModel, noVoiceover: scriptNoVoiceover, referenceImages: scriptReferenceImages, youtubeLinks: scriptYoutubeLinks });
        result.scenes = scenes;
      } catch (e) {
        handleGeminiError(e, "Ошибка генерации сцен для блока");
      }

      setGeneratedBlocks((prev) => ({ ...prev, [index]: result }));
      recordBlockHistory(index, result.text, "⚡ AI Генерация");
      setScriptBreakdown([]);
      await saveToHistory(
        "Сценарий",
        `Блок сценария: ${scriptStructure[index].title}`,
        result.text,
        {
          scriptTopic,
          blockTitle: scriptStructure[index].title,
        },
      );
    } catch (error) {
      handleGeminiError(error, "Ошибка при генерации блока сценария");
    } finally {
      setIsGeneratingBlock((prev) => ({ ...prev, [index]: false }));
    }
  };

  const handleRegenerateTechPlan = async (index: number) => {
    if (!generatedBlocks[index] || !generatedBlocks[index].text) {
      toast.error("Сначала сгенерируйте текст блока");
      return;
    }
    
    setIsGeneratingBlock((prev) => ({ ...prev, [index]: true }));
    toast.info(`Генерация технического плана для блока ${index + 1}...`);
    
    try {
      const durationVal = scriptDuration === "custom" ? scriptCustomDuration : String(scriptDuration);
      const scenes = await generateScriptBreakdown(
        generatedBlocks[index].text,
        selectedNiche || "",
        scriptTopic,
        scriptWishes,
        durationVal,
        {
          model: selectedModel,
          noVoiceover: scriptNoVoiceover,
          referenceImages: scriptReferenceImages,
          youtubeLinks: scriptYoutubeLinks
        }
      );
      
      setGeneratedBlocks((prev) => ({
        ...prev,
        [index]: { ...prev[index], scenes }
      }));
      // Clear global scriptBreakdown so getUnifiedScriptScenes dynamically reads per-block scenes!
      setScriptBreakdown([]);
      toast.success(`Технический план для блока ${index + 1} успешно обновлен!`);
    } catch (error) {
      handleGeminiError(error, "Ошибка при генерации техплана");
    } finally {
      setIsGeneratingBlock((prev) => ({ ...prev, [index]: false }));
    }
  };

  const handleRegenerateFullBreakdown = async () => {
    const fullText = getFullScriptText(generatedBlocks);
    if (!fullText) {
      toast.error("Сценарий пуст. Сначала сгенерируйте текст!");
      return;
    }
    setIsGeneratingBreakdown(true);
    toast.info("Перерасчет глобального технического плана сцен...");
    try {
      const durationVal = scriptDuration === "custom" ? scriptCustomDuration : String(scriptDuration);
      const freshBreakdown = await generateScriptBreakdown(
        fullText,
        selectedNiche || "",
        scriptTopic,
        scriptWishes,
        durationVal,
        {
          model: selectedModel,
          noVoiceover: scriptNoVoiceover,
          referenceImages: scriptReferenceImages,
          youtubeLinks: scriptYoutubeLinks
        }
      );
      setScriptBreakdown(freshBreakdown);
      toast.success("Глобальный технический план успешно обновлен!");
    } catch (err) {
      handleGeminiError(err, "Ошибка при генерации технического плана");
    } finally {
      setIsGeneratingBreakdown(false);
    }
  };

  const handleUpdateBlockMusicPrompt = async (index: number) => {
    if (!scriptStructure[index]) return;
    setIsUpdatingMusicPrompt((prev) => ({ ...prev, [index]: true }));
    try {
      const block = scriptStructure[index];
      const generated = generatedBlocks[index];
      const blockText = generated?.text || "";
      const currentMood = generated?.mood || block.type || "";

      let previousMusicPrompt = "";
      if (musicContinuityEnabled && index > 0) {
        // Find the most recent non-empty music prompt from previous blocks
        for (let i = index - 1; i >= 0; i--) {
          if (generatedBlocks[i]?.musicPrompt) {
            previousMusicPrompt = generatedBlocks[i].musicPrompt;
            break;
          }
        }
      }

      const activeCustomInstructions = isCustomInstructionsEnabled
        ? customInstructions
        : (safeStorage.getItem("yt_custom_instructions_enabled") === "true"
            ? safeStorage.getItem("yt_custom_instructions") || undefined
            : undefined);

      const newMusicPrompt = await generateBlockMusicPrompt(
        block.title,
        blockText,
        scriptTopic,
        currentMood,
        {
          model: selectedModel,
          globalMusicMood: promptMusicMood,
          globalAudioPrompt: generalAudioPrompt,
          customInstructions: activeCustomInstructions
        },
        previousMusicPrompt
      );

      setGeneratedBlocks((prev) => {
        const existing = prev[index] || { title: block.title, text: "" };
        return {
          ...prev,
          [index]: {
            ...existing,
            musicPrompt: newMusicPrompt
          }
        };
      });

      toast.success(`Подсказка фоновой музыки для блока "${block.title}" обновлена!`);
    } catch (error) {
      handleGeminiError(error, "Ошибка при обновлении подсказки фоновой музыки");
    } finally {
      setIsUpdatingMusicPrompt((prev) => ({ ...prev, [index]: false }));
    }
  };

  const handleUpdateBlockSceneContext = async (index: number) => {
    if (!scriptStructure[index]) return;
    setIsUpdatingSceneContext((prev) => ({ ...prev, [index]: true }));
    try {
      const block = scriptStructure[index];
      const generated = generatedBlocks[index];
      const blockText = generated?.text || "";

      const activeCustomInstructions = isCustomInstructionsEnabled
        ? customInstructions
        : (safeStorage.getItem("yt_custom_instructions_enabled") === "true"
            ? safeStorage.getItem("yt_custom_instructions") || undefined
            : undefined);

      const result = await generateBlockSceneContext(
        block.title,
        blockText,
        scriptTopic,
        {
          model: selectedModel,
          customInstructions: activeCustomInstructions
        }
      );

      setGeneratedBlocks((prev) => {
        const existing = prev[index] || { title: block.title, text: "" };
        return {
          ...prev,
          [index]: {
            ...existing,
            scene: result.scene,
            sampleContext: result.sampleContext
          }
        };
      });

      toast.success(`Окружение (Scene) и контекст (Sample Context) для блока "${block.title}" обновлены!`);
    } catch (error) {
      handleGeminiError(error, "Ошибка при обновлении настроек сцены и контекста");
    } finally {
      setIsUpdatingSceneContext((prev) => ({ ...prev, [index]: false }));
    }
  };

  const handleRewriteScriptBlock = async (index: number) => {
    if (!scriptStructure[index] || !generatedBlocks[index]) return;

    setIsGeneratingBlock((prev) => ({ ...prev, [index]: true }));

    try {
      const currentBlockText = generatedBlocks[index]?.text || "";
      
      const currentWords = currentBlockText.trim().split(/\s+/).filter((w: string) => w.length > 0).length;
      const currentSecs = Math.round(currentWords / (140/60));
      const targetChars = scriptStructure[index].estimatedChars || 0;
      const targetWords = targetChars / 6.5; 
      const targetSecs = Math.round(targetWords / (140/60));
      const diffSecs = currentSecs - targetSecs;
      const tol = Math.max(targetSecs * 0.15, 15);
      
      let densityRecommendation = "";
      if (diffSecs > tol) {
         densityRecommendation = `ВАЖНОЕ ТРЕБОВАНИЕ К ПЛОТНОСТИ НАРРАТИВА: Текущий текст слишком длинный. СОКРАТИ текст примерно на ${Math.abs(Math.floor(diffSecs))} секунд чтения (или ${Math.floor(diffSecs * (140/60))} слов), сохранив только самую важную суть. Ожидаемая длительность: ~${targetSecs} секунд.`;
      } else if (diffSecs < -tol) {
         densityRecommendation = `ВАЖНОЕ ТРЕБОВАНИЕ К ПЛОТНОСТИ НАРРАТИВА: Текущий текст слишком короткий. РАСШИРЬ текст примерно на ${Math.abs(Math.floor(diffSecs))} секунд чтения (или ${Math.floor(Math.abs(diffSecs) * (140/60))} слов), добавив больше деталей, раскрытий и примеров. Ожидаемая длительность: ~${targetSecs} секунд.`;
      }

      const refinementBase = blockRefinements[index] || "Сделай текст более динамичным и интересным";
      const refinement = [scriptWishes ? `Учитывай изначальные пожелания к видео: ${scriptWishes}` : "", densityRecommendation, refinementBase].filter(Boolean).join("\n\n");

      const result = await rewriteScriptBlock(
        currentBlockText,
        refinement,
        scriptStructure[index].title,
        getCommonAnalysisOptions({ toneOfVoice })
      );

      let newScenes = undefined;
      try {
        toast.info("Обновление технического плана..." );
        const durationVal = scriptDuration === "custom" ? scriptCustomDuration : String(scriptDuration);
        newScenes = await generateScriptBreakdown(
          result,
          selectedNiche || "",
          scriptTopic,
          scriptWishes,
          durationVal,
          getCommonAnalysisOptions({
            noVoiceover: scriptNoVoiceover,
            referenceImages: scriptReferenceImages,
            youtubeLinks: scriptYoutubeLinks
          })
        );
      } catch (e) {
        handleGeminiError(e, "Ошибка при обновлении сцен");
      }

      setGeneratedBlocks((prev) => ({
        ...prev,
        [index]: {
          ...prev[index], // Keep old SFX and stuff, just change text potentially, or override completely
          text: result, // `rewriteScriptBlock` returns a string directly
          scenes: newScenes || prev[index].scenes,
        },
      }));
      recordBlockHistory(index, result, "✍️ Переработка ИИ");
      setScriptBreakdown([]);
      await saveToHistory(
        "Сценарий",
        `Переписывание блока: ${scriptStructure[index].title}`,
        result,
        {
          scriptTopic,
          blockTitle: scriptStructure[index].title,
        },
      );
      toast.success("Блок сценария успешно переписан");
    } catch (error) {
      handleGeminiError(error, "Ошибка при переписывании блока");
    } finally {
      setIsGeneratingBlock((prev) => ({ ...prev, [index]: false }));
    }
  };

  const handleFixGrammarScriptBlock = async (index: number) => {
    if (!generatedBlocks[index]) return;
    setIsFixingGrammarBlock((prev) => ({ ...prev, [index]: true }));
    const toastId = toast.loading(`Проверка грамматики в блоке "${scriptStructure[index]?.title || 'Блок'}..."`);
    try {
      const currentBlockText = generatedBlocks[index]?.text || "";
      const result = await fixScriptBlockGrammar(
        currentBlockText,
        scriptStructure[index]?.title || scriptTopic,
        { model: selectedModel }
      );

      if (result.trim() === currentBlockText.trim()) {
        toast.success("Ошибок не обнаружено! Текст этого блока полностью верен.", { id: toastId });
        setGrammarDiffs((prev) => {
          const updated = { ...prev };
          delete updated[index];
          return updated;
        });
        return;
      }

      setGrammarDiffs((prev) => ({
        ...prev,
        [index]: {
          oldText: currentBlockText,
          newText: result,
        },
      }));
      toast.success("Обнаружены потенциальные исправления! Ознакомьтесь с подсветкой под редактором.", { id: toastId });
    } catch (error) {
      handleGeminiError(error, "Ошибка при исправлении ошибок");
      toast.dismiss(toastId);
    } finally {
      setIsFixingGrammarBlock((prev) => ({ ...prev, [index]: false }));
    }
  };

  const handleUpdateSceneAnimation = (blockIdx: number, sceneIdx: number, value: string) => {
    setGeneratedBlocks(prev => {
      const block = prev[blockIdx];
      if (!block || !block.scenes) return prev;
      const newScenes = [...block.scenes];
      newScenes[sceneIdx] = { ...newScenes[sceneIdx], animationInstructions: value };
      return { ...prev, [blockIdx]: { ...block, scenes: newScenes } };
    });
  };

  const handleFixGrammarAllBlocks = async () => {
    if (Object.keys(generatedBlocks || {}).length === 0) {
      toast.error("Сначала сгенерируйте сценарий");
      return;
    }

    setIsFixingGrammarAll(true);
    const toastId = toast.loading("Проверка и исправление грамматики во всём сценарии...");
    try {
      const blockIndexes = Object.keys(generatedBlocks).map(Number).sort((a, b) => a - b);
      const newDiffs = { ...grammarDiffs };
      let foundCorrectionsCount = 0;

      for (const idx of blockIndexes) {
        const text = generatedBlocks[idx]?.text || "";
        if (!text) continue;

        const fixed = await fixScriptBlockGrammar(
          text,
          scriptStructure[idx]?.title || scriptTopic,
          { model: selectedModel }
        );

        if (fixed.trim() !== text.trim()) {
          newDiffs[idx] = {
            oldText: text,
            newText: fixed,
          };
          foundCorrectionsCount++;
        } else {
          delete newDiffs[idx];
        }
      }

      setGrammarDiffs(newDiffs);
      
      if (foundCorrectionsCount > 0) {
        toast.success(
          `Найдено потенциальных исправлений в ${foundCorrectionsCount} ${
            foundCorrectionsCount === 1 ? 'блоке' : foundCorrectionsCount < 5 ? 'блоках' : 'блоках'
          }! Проверьте подсветку под блоками и нажмите «Применить исправления».`,
          { id: toastId }
        );
      } else {
        toast.success("Ошибок не обнаружено! Весь сценарий написан абсолютно грамотно.", { id: toastId });
      }
    } catch (error) {
      handleGeminiError(error, "Ошибка при автоматическом исправлении ошибок");
      toast.dismiss(toastId);
    } finally {
      setIsFixingGrammarAll(false);
    }
  };



  const handleAnalyzeScriptRetention = async () => {
    const fullScript = getFullScriptText(generatedBlocks);
    if (!fullScript) {
      toast.error("Сначала сгенерируйте сценарий");
      return;
    }

    setIsAnalyzingScript(true);
    try {
      const improvements = await analyzeAndImproveScript(
        fullScript,
        "динамичный",
        toneOfVoice || "Нейтральный",
        "Широкая аудитория",
        selectedNiche || "",
        { model: selectedModel }
      );
      setScriptImprovements(improvements);
      toast.success("Сценарий проанализирован");
    } catch (error) {
      handleGeminiError(error, "Ошибка при анализе удержания сценария");
    } finally {
      setIsAnalyzingScript(false);
    }
  };

  const refreshScriptBreakdownAndPrompts = async (updatedBlocks: Record<number, any>) => {
    const fullScript = getFullScriptText(updatedBlocks);
    if (!fullScript) return;

    const durationVal = scriptDuration === "custom" ? scriptCustomDuration : String(scriptDuration);
    const options = getCommonAnalysisOptions({
      noVoiceover: scriptNoVoiceover,
      referenceImages: scriptReferenceImages,
      youtubeLinks: scriptYoutubeLinks,
    });

    const breakDown = await generateScriptBreakdown(
      fullScript,
      selectedNiche || "",
      scriptTopic,
      scriptWishes,
      durationVal,
      options
    );

    setScriptBreakdown(breakDown);

    if (scenePrompts && scenePrompts.length > 0) {
      await handleGenerateGlobalProduction();
    }
  };

  const handleApplyRetentionImprovement = async (improvement: ScriptImprovement, index: number) => {
    setIsApplyingImprovement((prev) => ({ ...prev, [index]: true }));
    const toastId = toast.loading("Внедрение улучшения: " + improvement.improvement);
    try {
      const newBlocks = await applyRetentionImprovementToBlocks(
        generatedBlocks,
        improvement,
        scriptTopic,
        getCommonAnalysisOptions()
      );
      
      setGeneratedBlocks(newBlocks);
      await refreshScriptBreakdownAndPrompts(newBlocks);

      toast.success("Улучшение успешно применено!", { id: toastId });
      
      setScriptImprovements(prev => (Array.isArray(prev) ? prev : []).filter((_, i) => i !== index));
      
    } catch (error) {
      handleGeminiError(error, "Ошибка при внедрении улучшения");
      toast.dismiss(toastId);
    } finally {
      setIsApplyingImprovement((prev) => ({ ...prev, [index]: false }));
    }
  };

  const handleApplyAllRecommendations = async (customText: string, recsList?: ScriptImprovement[]) => {
    if (Object.keys(generatedBlocks || {}).length === 0) {
      toast.error("Сначала сгенерируйте сценарий");
      return;
    }

    const itemsToApply: (ScriptImprovement | string)[] = [];
    if (customText && customText.trim()) {
      itemsToApply.push(customText.trim());
    }
    if (recsList && recsList.length > 0) {
      itemsToApply.push(...recsList);
    }

    if (itemsToApply.length === 0) {
      toast.error("Введите рекомендации или добавьте пункты в список");
      return;
    }

    setIsApplyingAllRecs(true);
    const toastId = toast.loading("Внедрение всех рекомендаций в сценарий...");

    try {
      const newBlocks = await applyMultipleRecommendationsToBlocks(
        generatedBlocks,
        itemsToApply,
        scriptTopic,
        getCommonAnalysisOptions()
      );

      setGeneratedBlocks(newBlocks);
      await refreshScriptBreakdownAndPrompts(newBlocks);

      saveScriptVersion(`Внедрены рекомендации (${itemsToApply.length})`);
      toast.success("Все рекомендации успешно внесены в сценарий!", { id: toastId });
    } catch (error) {
      handleGeminiError(error, "Ошибка при внесении рекомендаций");
      toast.dismiss(toastId);
    } finally {
      setIsApplyingAllRecs(false);
    }
  };

  const handleParseAndAddRecommendations = async (rawText: string) => {
    if (!rawText.trim()) return;
    const toastId = toast.loading("ИИ разбирает текст правок...");
    try {
      const parsed = await parseRecommendationsFromText(rawText, { model: selectedModel });
      if (parsed.length === 0) {
        toast.error("Не удалось выявить четкие рекомендации в тексте", { id: toastId });
        return;
      }
      setScriptImprovements((prev) => [...parsed, ...(Array.isArray(prev) ? prev : [])]);
      toast.success(`Успешно добавлено ${parsed.length} рекомендаций!`, { id: toastId });
    } catch (error) {
      handleGeminiError(error, "Ошибка при разборе рекомендаций");
      toast.dismiss(toastId);
    }
  };

  const handleAddCustomRecommendation = (improvement: ScriptImprovement) => {
    setScriptImprovements((prev) => [improvement, ...(Array.isArray(prev) ? prev : [])]);
    toast.success("Рекомендация добавлена в список");
  };

  const handleRemoveImprovement = (index: number) => {
    setScriptImprovements((prev) => (Array.isArray(prev) ? prev : []).filter((_, i) => i !== index));
  };

  const handleClearAllImprovements = () => {
    setScriptImprovements([]);
    toast.success("Список рекомендаций очищен");
  };

  const handleExportBreakdown = () => {
    const scenesToExport = getUnifiedScriptScenes(scriptBreakdown, generatedBlocks);
    if (scenesToExport.length === 0) {
      toast.error("Сначала сгенерируйте сценарий");
      return;
    }

    let content = `РАЗБИВКА И МОНТАЖНЫЙ ЛИСТ\n`;
    content += `Ниша: ${selectedNiche || "Не выбрана"}\n`;
    content += `Дата генерации: ${new Date().toLocaleString()}\n`;
    content += `================================================================\n\n`;

    scenesToExport.forEach((scene: any, index: number) => {
      content += `СЦЕНА ${index + 1} [${scene.timeRange || scene.duration || '00:15'}]\n`;
      content += `----------------------------------------------------------------\n`;
      content += `ТЕКСТ ДЛЯ ОЗВУЧКИ:\n${scene.text || scene.description || 'Не указано'}\n\n`;
      if (scene.voiceover) {
        content += `ПАРАМЕТРЫ ГОЛОСА:\n`;
        content += `- Голос: ${scene.voiceover?.voiceName || 'Стандарт'}\n`;
        content += `- Интонация: ${scene.voiceover?.intonation || 'Естественная'}\n`;
        content += `- Настроение: ${scene.voiceover?.mood || 'Бодрое'}\n\n`;
      }
      if (scene.visual || scene.visuals) {
        content += `ВИЗУАЛЬНЫЙ РЯД:\n`;
        content += `- Описание: ${scene.visual || scene.visuals?.description || (typeof scene.visuals === 'string' ? scene.visuals : '')}\n`;
        if (scene.visuals?.searchQuery) content += `- Поисковый запрос: ${scene.visuals?.searchQuery}\n`;
      }
      if (scene.sfx || scene.audio?.soundsAndNoises) {
        content += `ЗВУКОВОЕ ОФОРМЛЕНИЕ:\n`;
        content += `- Звуки/SFX: ${scene.sfx || scene.audio?.soundsAndNoises}\n`;
        if (scene.audio?.backgroundMusic) content += `- Фоновая музыка: ${scene.audio?.backgroundMusic}\n`;
      }
      content += `\n================================================================\n\n`;
    });

    exportToTxt(content, `Breakdown_${selectedNiche || "video"}.txt`);
    toast.success("Разбивка экспортирована в .txt");
  };



  const handleRegenerateScript = async () => {
    if (!selectedNiche || !nicheData) return;

    setIsRegeneratingScript(true);
    try {
      const script = await generateScriptTemplate(
        selectedNiche,
        selectedBranding?.name,
        scriptKeywords,
        getCompetitorAnalysis(),
        getCommonAnalysisOptions({ toneOfVoice })
      );
      setNicheData({
        ...nicheData,
        scriptTemplate: script,
      });
    } catch (error) {
      handleGeminiError(error, "Ошибка при регенерации сценария");
    } finally {
      setIsRegeneratingScript(false);
    }
  };

  const handleSelectBranding = async (variant: {
    name: string;
    slogan: string;
  }) => {
    setSelectedBranding(variant);

    // Reset variants when branding changes
    setLogoVariants([]);
    setBannerVariants([]);

    if (!selectedNiche || !nicheData) return;

    setIsLoading(true);
    try {
      const [logoPrompts, bannerPrompts, channelSEO] = await Promise.all([
        generateLogoPrompt(
          selectedNiche,
          nicheData.branding.colors,
          variant.name,
          { model: selectedModel }
        ),
        generateBannerPrompt(
          selectedNiche,
          nicheData.branding.colors,
          variant.name,
          variant.slogan,
          { model: selectedModel }
        ),
        generateChannelSEO(
          selectedNiche,
          variant.name,
          getCompetitorAnalysis(),
          { model: selectedModel }
        )
      ]);

      setNicheData({
        ...nicheData,
        branding: {
          ...nicheData.branding,
          logo_prompts: logoPrompts,
          banner_prompts: bannerPrompts,
          channel_seo: channelSEO,
        },
      });
    } catch (error) {
      handleGeminiError(error, "Ошибка при выборе брендинга");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNicheSelect = (niche: string) => {
    if (niche === "Свой вариант") {
      setIsCustomNiche(true);
      // Pre-fill if current niche is already custom
      const isPredefined = NICHES.slice(0, -1).some((n: any) => (typeof n === "string" ? n : n.name) === selectedNiche);
      if (!isPredefined && selectedNiche) {
        setCustomNiche(selectedNiche);
      } else {
        setCustomNiche("");
      }
    } else {
      setIsCustomNiche(false);
      setSelectedNiche(niche);
      setCustomNiche("");
    }
  };

  const handleCustomNicheSubmit = async () => {
    if (customNiche.trim()) {
      setSelectedNiche(customNiche.trim());
      setIsCustomNiche(false);
    } else {
      setIsCustomNiche(false);
    }
  };

  const handleVoiceTriggerGeneration = () => {
    if (activePage === 'Ниша') handleGenerateIdeasFromDescription();
    else if (activePage === 'Брендинг') handleGenerateBrandingVisuals();
    else if (activePage === 'YouTube') handleGenerateTrendingIdeas();
    else if (activePage === 'Идеи') handleGenerateTrendingIdeas();
    else if (activePage === 'Сценарий') handleGenerateFullScript();
    else if (activePage === 'Промтинг') handleGenerateGlobalProduction();
    else if (activePage === 'SEO') handleGenerateVideoSEO();
    else if (activePage === 'Шортс') return;
    else handleGenerateTrendingIdeas();
  };

  const renderIdeaBanner = () => {
    const isScriptInWork = (scriptStructure && scriptStructure.length > 0) || Object.keys(generatedBlocks || {}).length > 0;
    const isLocked = isScriptInWork || isScriptTopicLocked;
    const activeTopic = scriptTopic || selectedIdea;
    if (!activeTopic) return null;
    
    const showBoth = scriptTopic && selectedIdea && scriptTopic !== selectedIdea;

    const handleStartEditing = () => {
      setEditedScriptTopicValue(activeTopic);
      setIsEditingScriptTopic(true);
    };

    const handleSaveTopic = () => {
      if (!editedScriptTopicValue.trim()) {
        toast.error("Тема не может быть пустой");
        return;
      }
      
      if (isScriptInWork) {
        setScriptStructure([]);
        setGeneratedBlocks({});
        setBlockRefinements({});
        setScriptBreakdown([]);
      }
      
      setScriptTopic(editedScriptTopicValue.trim());
      setIsScriptTopicLocked(true);
      setIsEditingScriptTopic(false);
      toast.success("Тема обновлена и зафиксирована");
    };
    
    return (
      <div className="mb-6 p-4 bg-accent/10 border border-accent/20 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center shrink-0 text-accent">
            <Lightbulb size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider">
                Тема сценария в работе
              </span>
              {isLocked && !isEditingScriptTopic && (
                <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                  🔒 Зафиксировано
                </span>
              )}
            </div>

            {isEditingScriptTopic ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={editedScriptTopicValue}
                  onChange={(e) => setEditedScriptTopicValue(e.target.value)}
                  className="bg-neutral-900 border border-neutral-700 text-white text-sm rounded-lg focus:ring-accent focus:border-accent block w-full p-2 h-9"
                  autoFocus
                />
                <button
                  onClick={handleSaveTopic}
                  className="bg-accent hover:bg-accent/80 text-black font-bold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1 shrink-0"
                >
                  <Check size={14} /> Применить
                </button>
                <button
                  onClick={() => setIsEditingScriptTopic(false)}
                  className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1 shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <p className="text-sm font-bold text-white truncate max-w-xl" title={activeTopic}>{activeTopic}</p>
                <button 
                  onClick={handleStartEditing}
                  className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-white transition-opacity"
                  title="Редактировать тему"
                >
                  <Edit2 size={14} />
                </button>
              </div>
            )}

            {showBoth && !isEditingScriptTopic && (
              <p className="text-xs text-neutral-400 mt-1 truncate max-w-xl">
                <span className="text-neutral-500 font-semibold mr-1">Просмотр другой идеи:</span>
                "{selectedIdea}"
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isLocked && scriptTopic && !isEditingScriptTopic && (
            <button
              onClick={() => {
                if (isScriptInWork) {
                  setScriptStructure([]);
                  setGeneratedBlocks({});
                  setBlockRefinements({});
                  setScriptBreakdown([]);
                  setIsScriptTopicLocked(false);
                  toast.success("Работа сброшена, тема разблокирована.");
                } else {
                  setIsScriptTopicLocked(false);
                  toast.success("Фиксация темы снята.");
                }
              }}
              className="text-[10px] font-bold bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 px-3 py-1.5 rounded-lg transition-all"
            >
              Разблокировать тему
            </button>
          )}
        </div>
      </div>
    );
  };



  const addToHistory = (type: string, data: any) => {
    setHistory((prev) => [
      { type, data, timestamp: new Date().toISOString() },
      ...prev,
    ]);
    toast.success("Сохранено в историю");
  };

  const renderHistoryModal = () => {
    if (!isHistoryModalOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60  p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-surface border border-border w-full max-w-2xl rounded-xl p-6 shadow-2xl max-h-[80vh] flex flex-col"
        >
          <div className="flex flex-wrap justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white">История</h3>
            <button
              onClick={() => setIsHistoryModalOpen(false)}
              className="text-neutral-400 hover:text-white"
            >
              <X />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {history.map((item, idx) => (
              <div
                key={`history-${item.type}-${item.timestamp || idx}-${idx}`}
                className="p-3 bg-neutral-900 rounded-lg border border-neutral-800 flex justify-between items-center"
              >
                <div>
                  <p className="text-xs font-bold text-accent uppercase">
                    {item.type}
                  </p>
                  <p className="text-sm text-neutral-300">
                    {new Date(item.timestamp).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => {
                    /* Implement restoration logic */
                  }}
                  className="px-3 py-1 bg-accent text-white text-xs rounded hover:bg-accent/90"
                >
                  Восстановить
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  };

  const renderQuickNoteModal = () => {
    if (!showQuickNoteModal) return null;

    const handleSaveNote = () => {
      setIdeaAssignments(prev => ({
        ...prev,
        [quickNoteIdeaTitle]: {
          ...prev[quickNoteIdeaTitle],
          note: quickNoteText.trim()
        }
      }));
      toast.success("Быстрая заметка сохранена");
      setShowQuickNoteModal(false);
    };

    const handleDeleteNote = () => {
      setIdeaAssignments(prev => {
        const copy = { ...prev };
        if (copy[quickNoteIdeaTitle]) {
          const { note, ...rest } = copy[quickNoteIdeaTitle];
          copy[quickNoteIdeaTitle] = rest;
        }
        return copy;
      });
      setQuickNoteText("");
      toast.info("Заметка удалена");
      setShowQuickNoteModal(false);
    };

    return (
      <QuickNoteModal
        isOpen={showQuickNoteModal}
        onClose={() => setShowQuickNoteModal(false)}
        noteText={quickNoteText}
        setNoteText={setQuickNoteText}
        onSave={handleSaveNote}
        onClear={handleDeleteNote}
      />
    );
  };

  const renderCustomIdeasModal = () => {
    if (!showCustomIdeasModal) return null;
    return (
      <CustomIdeasModal
        isOpen={showCustomIdeasModal}
        onClose={() => {
          setShowCustomIdeasModal(false);
          setCustomIdeasDescription("");
        }}
        tab={customIdeaModalTab}
        setTab={setCustomIdeaModalTab}
        manualTitle={manualIdeaTitle}
        setManualTitle={setManualIdeaTitle}
        manualDescription={manualIdeaDescription}
        setManualDescription={setManualIdeaDescription}
        manualPlaylist={manualIdeaPlaylist}
        setManualPlaylist={setManualIdeaPlaylist}
        manualDuration={manualIdeaDuration}
        setManualDuration={setManualIdeaDuration}
        manualTone={manualIdeaTone}
        setManualTone={setManualIdeaTone}
        playlists={ideaPlaylists}
        onAddManualIdea={handleAddManualIdea}
        aiDescription={customIdeasDescription}
        setAiDescription={setCustomIdeasDescription}
        isGenerating={isGeneratingCustomIdeas}
        onGenerateFromDescription={handleGenerateIdeasFromDescription}
      />
    );
  };
  const renderCustomInstructionsModal = () => {
    if (!showCustomInstructionsModal) return null;

    const toggleRule = (id: string) => {
      setCustomRules(rules => rules.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
    };

    const deleteRule = (id: string) => {
      setCustomRules(rules => rules.filter(r => r.id !== id));
    };

    const handleSaveRule = () => {
      if (!editingRuleData) return;
      if (editingRuleData.id === "new") {
        setCustomRules(rules => [...rules, { ...editingRuleData, id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() }]);
      } else {
        setCustomRules(rules => rules.map(r => r.id === editingRuleData.id ? editingRuleData : r));
      }
      setEditingRuleData(null);
    };

    const handleSaveGlobal = () => {
      safeStorage.setItem("yt_custom_rules", JSON.stringify(customRules));
      safeStorage.setItem("yt_custom_instructions_enabled", String(isCustomInstructionsEnabled));
      toast.success("Инструкции сохранены! Они будут автоматически учитываться ИИ-Ассистентом во всех новых генерациях.");
      setShowCustomInstructionsModal(false);
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            if (!editingRuleData) setShowCustomInstructionsModal(false);
          }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between bg-neutral-900/50 backdrop-blur-md sticky top-0 z-10 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/20 text-primary rounded-2xl shrink-0">
                <Brain size={20} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  Инструкции для ИИ Ассистента
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">Отмеченные правила автоматически склеиваются в контекст генерации</p>
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <label className="flex items-center gap-2 cursor-pointer border border-neutral-800 bg-neutral-950 px-3 py-1.5 rounded-xl hover:border-neutral-700 transition-colors">
                <span className="text-xs font-bold text-neutral-400">Включить правила</span>
                <div className="relative inline-block w-8 h-4">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={isCustomInstructionsEnabled}
                    onChange={(e) => setIsCustomInstructionsEnabled(e.target.checked)}
                  />
                  <div className="w-8 h-4 bg-neutral-800 rounded-full peer peer-checked:bg-primary transition-colors"></div>
                  <div className="absolute left-1 top-1 w-2 h-2 bg-white rounded-full peer-checked:translate-x-4 transition-transform"></div>
                </div>
              </label>
              <button
                onClick={() => setShowCustomInstructionsModal(false)}
                className="p-2 hover:bg-neutral-800 rounded-xl transition-colors text-neutral-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-neutral-950/30">
            {editingRuleData ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">{editingRuleData.id === "new" ? "Новое правило" : "Редактировать правило"}</h4>
                  <button onClick={() => setEditingRuleData(null)} className="text-xs text-neutral-500 hover:text-white">Отменить</button>
                </div>
                <input 
                  type="text"
                  placeholder="Название правила (например, Мастер Хуков)"
                  value={editingRuleData.title}
                  onChange={e => setEditingRuleData({...editingRuleData, title: e.target.value})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-white focus:border-primary transition-colors outline-none font-bold"
                />
                <textarea 
                  rows={10}
                  placeholder="Опишите инструкции для ИИ... (Примеры, структура, запреты)"
                  value={editingRuleData.content}
                  onChange={e => setEditingRuleData({...editingRuleData, content: e.target.value})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-sm text-white focus:border-primary transition-colors outline-none resize-y font-mono leading-relaxed"
                />
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setEditingRuleData(null)} className="px-5 py-2.5 rounded-xl text-xs font-bold bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors">
                    Отмена
                  </button>
                  <button onClick={handleSaveRule} disabled={!editingRuleData.title.trim() || !editingRuleData.content.trim()} className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-black disabled:opacity-50 transition-colors flex items-center gap-2">
                    <Check size={14} /> Сохранить правило
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  {customRules.map((rule, idx) => (
                    <div key={`rule-${rule.id ?? 'item'}-${idx}`} className={`group relative p-4 rounded-2xl border transition-all ${rule.isActive ? 'bg-primary/5 border-primary/30' : 'bg-neutral-900 border-neutral-800/80 hover:border-neutral-700'}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <button 
                            onClick={() => toggleRule(rule.id)}
                            className={`mt-0.5 shrink-0 w-5 h-5 rounded flex items-center justify-center transition-colors border ${rule.isActive ? 'bg-primary border-primary text-black' : 'bg-neutral-950 border-neutral-700 text-transparent hover:border-neutral-500'}`}
                          >
                            <Check size={12} className={rule.isActive ? "opacity-100" : "opacity-0"} />
                          </button>
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleRule(rule.id)}>
                            <h5 className={`text-sm font-bold truncate transition-colors ${rule.isActive ? 'text-primary' : 'text-neutral-300'}`}>{rule.title}</h5>
                            <p className={`text-[11px] line-clamp-2 mt-1.5 font-mono leading-relaxed ${rule.isActive ? 'text-neutral-400' : 'text-neutral-500'}`}>{rule.content}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button onClick={() => setEditingRuleData(rule)} className="p-2 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-xl transition-colors">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => deleteRule(rule.id)} className="p-2 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 rounded-xl transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {customRules.length === 0 && (
                    <div className="text-center py-10 border border-dashed border-neutral-800 rounded-2xl">
                      <p className="text-neutral-500 text-sm font-medium">У вас пока нет ни одного правила</p>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => setEditingRuleData({ id: 'new', title: '', content: '', isActive: true })}
                  className="w-full py-4 mt-2 rounded-2xl border border-dashed border-neutral-800 hover:border-primary/50 hover:bg-primary/5 hover:text-primary text-neutral-400 transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider group"
                >
                  <Plus size={16} className="group-hover:scale-110 transition-transform" /> Добавить новое правило
                </button>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-neutral-800/80 bg-neutral-900 flex items-center justify-end">
            <div className="flex gap-2">
              <button
                onClick={() => setShowCustomInstructionsModal(false)}
                className="px-4 py-2 bg-neutral-950 hover:bg-neutral-800/80 text-neutral-400 rounded-xl text-xs font-bold transition-all border border-neutral-800"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveGlobal}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-primary text-neutral-950 rounded-xl text-xs font-bold hover:bg-primary/95 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/10 cursor-pointer"
              >
                <Check size={14} />
                Сохранить
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };
  const renderModelLimitsModal = () => {
    return (
      <ModelLimitsModal
        isOpen={showModelLimitsModal}
        onClose={() => setShowModelLimitsModal(false)}
      />
    );
  };
  const renderDeleteConfirmationModal = () => {
    if (!showDeleteConfirmationModal) return null;

    let titleText = "Подтверждение удаления";
    let descText = "Вы уверены, что хотите выполнить это действие? Данные будут безвозвратно удалены.";

    if (deleteConfirmationType === 'single') {
      titleText = "Удалить идею?";
      descText = ideaTitleToDelete 
        ? `Вы действительно хотите удалить идею «${ideaTitleToDelete.substring(0, 50)}${ideaTitleToDelete.length > 50 ? '...': '' }»?`
        : "Вы действительно хотите удалить выбранную идею?";
    } else if (deleteConfirmationType === 'selected') {
      titleText = `Удалить выбранные идеи (${selectedIdeasForDeletion.length})?`;
      descText = `Вы собираетесь удалить ${selectedIdeasForDeletion.length} выбранных идей. Это действие нельзя отменить.`;
    } else if (deleteConfirmationType === 'all') {
      titleText = "Очистить все идеи?";
      descText = "Вы собираетесь удалить абсолютно все идеи из текущего списка. Это действие нельзя отменить.";
    }

    const handleConfirm = () => {
      if (deleteConfirmationType === 'single' && ideaTitleToDelete) {
        executeDeleteSingleIdea(ideaTitleToDelete);
        setIdeaTitleToDelete(null);
      } else if (deleteConfirmationType === 'selected') {
        executeDeleteSelectedIdeas();
      } else if (deleteConfirmationType === 'all') {
        executeDeleteAllIdeas();
      }
      setShowDeleteConfirmationModal(false);
    };

    return (
      <DeleteConfirmationModal
        isOpen={showDeleteConfirmationModal}
        onClose={() => setShowDeleteConfirmationModal(false)}
        onConfirm={handleConfirm}
        title={titleText}
        description={descText}
      />
    );
  };

  const renderBrandingEditModal = () => {
    if (!isBrandingEditingModalOpen || editingBrandingIndex === null || !nicheData) return null;
    const handleSave = () => {
      const newNames = [...nicheData.branding.names];
      newNames[editingBrandingIndex] = {
        name: editBrandingName,
        slogan: editBrandingSlogan,
      };
      setNicheData({
        ...nicheData,
        branding: { ...nicheData.branding, names: newNames },
      });
      setIsBrandingEditingModalOpen(false);
      setEditingBrandingIndex(null);
      toast.success("Брендинг обновлен");
    };

    return (
      <BrandingEditModal
        isOpen={isBrandingEditingModalOpen}
        onClose={() => setIsBrandingEditingModalOpen(false)}
        index={editingBrandingIndex}
        name={editBrandingName}
        setName={setEditBrandingName}
        slogan={editBrandingSlogan}
        setSlogan={setEditBrandingSlogan}
        onSave={handleSave}
      />
    );
  };
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-[400px] space-y-6">
          <div className="relative">
            <RefreshCw className="text-primary animate-spin" size={64} />
            <Sparkles
              className="absolute -top-2 -right-2 text-accent animate-pulse"
              size={24}
            />
          </div>
          <div className="text-center space-y-2">
            <p className="text-xl font-bold text-white  italic">
              Gemini AI анализирует нишу...
            </p>
            <p className="text-neutral-500 text-sm max-w-xs mx-auto">
              Мы изучаем конкурентов, тренды и подбираем лучшие идеи для вашего
              канала.
            </p>
          </div>
        </div>
      );
    }

    const importantPages: string[] = [];
    if (!user && importantPages.includes(activePage)) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-8 bg-neutral-950/40 rounded-2xl border border-neutral-800/60 max-w-2xl mx-auto my-12 shadow-2xl relative overflow-hidden backdrop-blur-md">
          {/* Visual radial light behind the lock */}
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-accent/10 to-transparent opacity-50 pointer-events-none" />
          
          <div className="relative z-10 space-y-6 max-w-md">
            <div className="relative mx-auto w-20 h-20 bg-neutral-900 border border-neutral-800 rounded-2xl flex items-center justify-center text-accent shadow-xl shadow-accent/5 group">
              <div className="absolute inset-0 bg-accent/20 rounded-2xl blur-lg group-hover:opacity-100 transition-all opacity-50" />
              <Lock size={36} className="relative z-10 text-accent animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white italic tracking-tight uppercase">
                Требуется авторизация
              </h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Раздел <span className="text-accent font-bold">"{activePage}"</span> является важным рабочим разделом и доступен только авторизованным пользователям.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-neutral-900/60 border border-neutral-800/80 text-left space-y-3">
              <span className="text-[10px] text-neutral-500 uppercase font-black tracking-wider block">
                Возможности авторизованных пользователей:
              </span>
              <ul className="text-xs text-neutral-300 space-y-2 list-disc pl-4 font-medium">
                <li>Инструменты подбора конкурентов и трендов в YouTube</li>
                <li>AI Генерация сценариев, креативных идей и SEO</li>
                <li>Сохранение всех проектов в облако (синхронизация данных)</li>
                <li>Персональный архив генераций на вкладке "История"</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={() => {
                  toast.info("Вход в систему...");
                  handleSignIn();
                }}
                className="w-full sm:flex-1 py-3 px-5 bg-accent hover:bg-emerald-400 text-black font-bold rounded-xl transition-all shadow-lg shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer text-xs"
              >
                <LogIn size={14} />
                Войти в аккаунт
              </button>
              <button
                onClick={() => setActivePage("Ниша")}
                className="w-full sm:flex-1 py-3 px-5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded-xl transition-all border border-neutral-700/50 flex items-center justify-center text-xs cursor-pointer"
              >
                Вернуться на главную
              </button>
            </div>
          </div>
        </div>
      );
    }

    const nicheRelevantPages = ["Ниша", "Брендинг", "YouTube", "Идеи"];

    if (
      nicheRelevantPages.includes(activePage) &&
      activePage !== "Ниша" &&
      !selectedNiche
    ) {
      return (
        <div className="flex flex-col items-center justify-center h-[400px] text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center text-accent shadow-lg shadow-accent/10">
            <Target size={32} />
          </div>
          <h3 className="text-xl font-bold  italic text-white">
            Ниша не выбрана
          </h3>
          <p className="text-neutral-400 max-w-md text-sm">
            Пожалуйста, перейдите на вкладку "Ниша" и выберите направление
            контента, чтобы мы могли подготовить для вас персональные
            рекомендации.
          </p>
          <button
            onClick={() => setActivePage("Ниша")}
            className="btn-accent px-8"
          >
            Выбрать нишу
          </button>
        </div>
      );
    }

    switch (activePage) {
      case "Ниша":
        return (
          <NicheTab
            nicheList={NICHES}
            selectedNiche={selectedNiche}
            setSelectedNiche={(niche) => {
              setSelectedNiche(niche);
              setIsCustomNiche(false);
              setCustomNiche("");
            }}
            customNiche={customNiche}
            setCustomNiche={setCustomNiche}
            isCustomNiche={isCustomNiche}
            setIsCustomNiche={setIsCustomNiche}
            selectedRegion={selectedRegion}
            setSelectedRegion={setSelectedRegion}
            handleAnalyzeNiche={() => handleRegenerateBranding()}
            isAnalyzing={isLoading}
          />
        );
      case "Брендинг":
        return (
          <BrandingTab
            nicheData={nicheData}
            selectedNiche={selectedNiche}
            selectedBranding={selectedBranding}
            handleSelectBranding={(branding) => setSelectedBranding(branding)}
            isGeneratingBranding={isLoading}
            handleRegenerateBranding={handleRegenerateBranding}
            openBrandingEditModal={(idx) => setEditingBrandingIndex(idx)}
            copiedKey={copiedSection}
            copyToClipboard={copyToClipboard}
            renderIdeaBanner={renderIdeaBanner}
          />
        );
      case "YouTube":
        return (
          <YouTubeTab
            selectedNiche={selectedNiche}
            customNiche={customNiche}
            selectedModel={selectedModel}
            onSelectNiche={(niche) => {
              setSelectedNiche(niche);
              setIsCustomNiche(false);
              setCustomNiche("");
            }}
            onApplyCompetitorInsights={(insights) => {
              setCustomCompetitorInsights(insights);
            }}
            userEmail={user?.email || undefined}
            selectedIdeas={selectedIdeasForSeries}
            trendData={TREND_DATA}
            demoData={DEMO_DATA}
          />
        );

      case "Идеи": {
        if (!nicheData) {
          return (
            <div className="space-y-6 max-w-5xl mx-auto">
              {/* Конструктор и загрузка своего контент-плана */}
              <ContentPlanSection
                currentIdeasCount={0}
                onApplyContentPlan={handleApplyCustomContentPlan}
                selectedModel={selectedModel}
                selectedNiche={selectedNiche}
                customNiche={customNiche}
                nicheData={nicheData}
                selectedBranding={selectedBranding}
                customCompetitorInsights={customCompetitorInsights}
              />

              <div className="flex flex-col items-center justify-center py-12 px-4 text-center max-w-xl mx-auto space-y-6 bg-surface/40 border border-border/60 rounded-2xl">
                <div className="w-16 h-16 bg-accent/10 text-accent rounded-full flex items-center justify-center">
                  <Lightbulb size={32} />
                </div>
                <h3 className="text-xl font-bold text-white">Идеи контента пока не сгенерированы</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  Вы ещё не анализировали нишу. Вы можете использовать конструктор выше для генерации или загрузки своего контент-плана, запустить анализ на вкладке «Ниша» или сгенерировать идеи по описанию.
                </p>
                
                {customCompetitorInsights && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl border bg-primary/10 border-primary/20 text-sm text-neutral-300 flex items-start gap-3 w-full text-left"
                  >
                    <div className="mt-0.5 text-primary">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-white mb-1">Инсайты от конкурентов готовы!</p>
                      <p className="text-xs leading-relaxed">
                        У вас есть собранные данные конкурентов. Вы можете <span className="font-bold text-primary">сгенерировать идеи из описания</span> с учетом этих данных.
                      </p>
                    </div>
                  </motion.div>
                )}

                <button
                  onClick={() => setShowCustomIdeasModal(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-bold hover:bg-accent/90 transition-all shadow-lg shadow-accent/20 cursor-pointer"
                >
                  <Sparkles size={16} />
                  Сгенерировать идеи из описания
                </button>
              </div>
            </div>
          );
        }

        const uniqueTones = Array.from(
          new Set(
            (nicheData.ideas || [])
              .map((idea: any) => (typeof idea === "object" ? idea.tone : null))
              .filter(Boolean)
          )
        ) as string[];

        const handleBatchSetFolder = (folderName: string) => {
          if (!selectedIdeasForDeletion.length || !folderName) return;
          setIdeaAssignments(prev => {
            const next = { ...prev };
            selectedIdeasForDeletion.forEach(title => {
              next[title] = {
                ...next[title],
                folder: folderName === "none" ? undefined : folderName
              };
            });
            return next;
          });
          toast.success(folderName === "none" ? `Рубрика сброшена для ${selectedIdeasForDeletion.length} идей` : `Рубрика "${folderName}" назначена для ${selectedIdeasForDeletion.length} идей`);
        };

        const handleBatchAddTag = (tagId: string) => {
          if (!selectedIdeasForDeletion.length || !tagId) return;
          const tagObj = ideaTags.find(t => t.id === tagId);
          setIdeaAssignments(prev => {
            const next = { ...prev };
            selectedIdeasForDeletion.forEach(title => {
              const currentTags = next[title]?.tags || [];
              if (!currentTags.includes(tagId)) {
                next[title] = {
                  ...next[title],
                  tags: [...currentTags, tagId]
                };
              }
            });
            return next;
          });
          toast.success(`Метка "${tagObj ? tagObj.name : tagId}" добавлена к ${selectedIdeasForDeletion.length} идеям`);
        };

        const handleBatchSetPlaylist = (playlistName: string) => {
          if (!selectedIdeasForDeletion.length || !playlistName) return;
          setIdeaAssignments(prev => {
            const next = { ...prev };
            selectedIdeasForDeletion.forEach(title => {
              next[title] = {
                ...next[title],
                playlist: playlistName === "none" ? undefined : playlistName
              };
            });
            return next;
          });
          toast.success(playlistName === "none" ? `Плейлист сброшен для ${selectedIdeasForDeletion.length} идей` : `Плейлист "${playlistName}" назначен для ${selectedIdeasForDeletion.length} идей`);
        };

        const handleBatchSetStatus = (newStatus: string) => {
          if (!selectedIdeasForDeletion.length || !newStatus) return;
          setIdeaAssignments(prev => {
            const next = { ...prev };
            selectedIdeasForDeletion.forEach(title => {
              next[title] = {
                ...next[title],
                status: newStatus
              };
            });
            return next;
          });
          toast.success(`Статус "${newStatus}" установлен для ${selectedIdeasForDeletion.length} идей`);
        };

        // Redeclared hooks isShortDuration, filteredIdeas, sortedIdeas, and groupedClusters have been moved to top-level of App component to comply with Rules of Hooks
        const publishedIdeasCount = (nicheData?.ideas || []).filter((idea: any) => {
          const title = typeof idea === "string" ? idea : idea.title;
          return (ideaAssignments[title]?.status || "Идея") === "Опубликовано";
        }).length;

        return (
          <div className="space-y-6 w-full min-w-0 max-w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Lightbulb className="text-accent" />
                  Идеи контента
                </h2>
                <p className="text-neutral-400 text-sm">
                  Подборка виральных тем для ваших длинных видео, подобранных искусственным интеллектом.
                </p>
                {myChannelVideos && myChannelVideos.length > 0 ? (
                  <div className="flex items-center justify-between gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 mt-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400">
                        <Youtube size={16} />
                      </div>
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>Синхронизировано с YouTube ({myChannelVideos.length} видео)</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-extrabold">Учитывается ИИ</span>
                        </div>
                        <p className="text-[11px] text-emerald-300/80 mt-0.5">
                          ИИ автоматически исключает повторы видео с вашего канала и при необходимости предлагает идеи-продолжения (сиквелы).
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 p-3 bg-neutral-900/80 border border-neutral-800 rounded-xl text-xs text-neutral-400 mt-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 text-red-400">
                        <Youtube size={16} />
                      </div>
                      <div>
                        <div className="font-bold text-white">Учитывать видео с вашго YouTube-канала</div>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          Загрузите видео на вкладке <strong>YouTube</strong>, чтобы новые идеи исключали повторы и предлагали продолжения.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950/60 p-1.5 shadow-sm">
                  <button
                    onClick={handleDeleteAllIdeas}
                    disabled={(!nicheData?.ideas || nicheData.ideas.length === 0) && trendingIdeas.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm cursor-pointer"
                    title="Удалить все идеи из основного списка и трендов"
                  >
                    <Trash2 size={13} />
                    <span>Очистить</span>
                  </button>
                  <button
                    onClick={handleRemoveDuplicateIdeas}
                    disabled={(!nicheData?.ideas || nicheData.ideas.length === 0) && trendingIdeas.length === 0 && userCustomIdeas.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm cursor-pointer"
                    title="Найти и удалить одинаковые/повторяющиеся идеи из списка"
                  >
                    <CopyX size={13} />
                    <span>Дубликаты</span>
                  </button>
                </div>
              </div>
            </div>

            {showManageFoldersTags && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface border border-border p-5 rounded-2xl space-y-6"
              >
                <div className="flex items-center justify-between border-b border-border/40 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Tag size={16} className="text-accent" />
                    Управление рубриками и метками
                  </h3>
                  <button 
                    onClick={() => setShowManageFoldersTags(false)}
                    className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Левая колонка: Рубрики */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">Рубрики (папки)</h4>
                      <p className="text-[10px] text-neutral-500">
                        Группируйте идеи по направлениям или темам для лучшей организации.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={newFolderInput}
                        onChange={(e) => setNewFolderInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddFolder();
                          }
                        }}
                        placeholder="Например: Обучающие..."
                        className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg text-xs py-1.5 px-3 text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-accent font-sans"
                      />
                      <button
                        onClick={handleAddFolder}
                        className="px-3.5 py-1.5 bg-accent hover:bg-accent/90 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Plus size={14} />
                        <span>Создать</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
                      {ideaFolders.length === 0 ? (
                        <p className="text-xs text-neutral-500 italic">Нет созданных рубрик</p>
                      ) : (
                        ideaFolders.map((folder, idx) => (
                          <div 
                            key={`folder-${folder}-${idx}`}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-300 font-sans"
                          >
                            <span>📁 {folder}</span>
                            <button
                              onClick={() => handleDeleteFolder(folder)}
                              className="text-neutral-500 hover:text-red-400 transition-colors ml-1 p-0.5 rounded cursor-pointer hover:bg-neutral-900"
                              title="Удалить рубрику"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Правая колонка: Метки */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1 font-sans">Метки (теги)</h4>
                      <p className="text-[10px] text-neutral-500 font-sans">
                        Создавайте свои цветные метки для статусов («В планах», «Снято» и др.).
                      </p>
                    </div>

                    <div className="space-y-3 bg-neutral-950/40 p-3 rounded-xl border border-neutral-900">
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          value={newTagNameInput}
                          onChange={(e) => setNewTagNameInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddTag();
                            }
                          }}
                          placeholder="Название метки (напр. Снято)..."
                          className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg text-xs py-1.5 px-3 text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-accent font-sans"
                        />
                        <button
                          onClick={handleAddTag}
                          className="px-3.5 py-1.5 bg-accent hover:bg-accent/90 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <Plus size={14} />
                          <span>Создать</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[10px] text-neutral-400 font-semibold font-sans">Цвет метки:</span>
                        <div className="flex gap-1.5">
                          {[
                            { name: "blue", class: "bg-blue-500" },
                            { name: "yellow", class: "bg-amber-500" },
                            { name: "purple", class: "bg-purple-500" },
                            { name: "green", class: "bg-emerald-500" },
                            { name: "red", class: "bg-rose-500" },
                            { name: "neutral", class: "bg-neutral-500" }
                          ].map((colorObj, cIdx) => (
                            <button
                              key={`tagcol-${colorObj.name}-${cIdx}`}
                              onClick={() => setNewTagColorInput(colorObj.name)}
                              className={`w-5 h-5 rounded-full transition-all cursor-pointer flex items-center justify-center border-2 ${colorObj.class} ${
                                newTagColorInput === colorObj.name ? "border-white scale-110 shadow-sm" : "border-transparent hover:scale-105"
                              }`}
                              title={colorObj.name}
                            >
                              {newTagColorInput === colorObj.name && <Check size={10} className="text-white font-bold" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
                      {ideaTags.length === 0 ? (
                        <p className="text-xs text-neutral-500 italic">Нет созданных меток</p>
                      ) : (
                        ideaTags.map((tag, idx) => (
                          <div 
                            key={`tag-${tag.id ?? 'item'}-${idx}`}
                            className={`flex items-center gap-1.5 px-2.5 py-1 border rounded-lg text-xs font-bold transition-all ${getTagColorClasses(tag.color)}`}
                          >
                            <span>🏷️ {tag.name}</span>
                            <button
                              onClick={() => handleDeleteTag(tag.id)}
                              className="opacity-60 hover:opacity-100 transition-opacity ml-1 p-0.5 rounded cursor-pointer hover:bg-black/10"
                              title="Удалить метку"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Фильтры и поиск */}
            <div className="bg-surface/90 border border-border p-3.5 rounded-2xl space-y-3 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
                {/* 1. Поиск по идеям */}
                <div className="sm:col-span-2 lg:col-span-5 flex flex-col gap-1">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider font-sans flex items-center gap-1">
                    <Search size={12} className="text-accent" />
                    Поиск по идеям
                  </span>
                  <div className="relative">
                    <input
                      type="text"
                      value={ideasSearchQuery}
                      onChange={(e) => setIdeasSearchQuery(e.target.value)}
                      placeholder="Поиск по названию или теме..."
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl text-xs py-2 pl-3.5 pr-8 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-accent transition-all font-sans"
                    />
                    {ideasSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setIdeasSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors p-0.5 cursor-pointer"
                        title="Очистить поиск"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Объединенный фильтр: Статус и Метки */}
                <div className="sm:col-span-1 lg:col-span-4 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider font-sans flex items-center gap-1">
                      <Tag size={12} className="text-accent" />
                      Статус и метки
                    </span>
                    {selectedStatusTagFilter !== "all" && (
                      <button
                        type="button"
                        onClick={() => setSelectedStatusTagFilter("all")}
                        className="text-[9px] text-accent hover:underline cursor-pointer"
                      >
                        Сбросить
                      </button>
                    )}
                  </div>
                  <select
                    value={selectedStatusTagFilter}
                    onChange={(e) => setSelectedStatusTagFilter(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl text-xs py-2 px-3 text-neutral-200 focus:outline-none focus:border-accent cursor-pointer font-sans transition-all"
                  >
                    <option value="all">⚡ Все статусы и метки</option>
                    
                    <optgroup label="📌 Статусы задач">
                      {IDEA_STATUSES.map((s, idx) => (
                        <option key={`opt-st-fltr-${s.id}-${idx}`} value={`status:${s.id}`}>
                          {s.id === "Опубликовано" ? `🚀 Опубликовано / Архив (${publishedIdeasCount})` : s.label}
                        </option>
                      ))}
                    </optgroup>

                    <optgroup label="🏷️ Метки">
                      {ideaTags.length === 0 ? (
                        <option value="" disabled className="text-neutral-500">Нет меток (создайте ниже)</option>
                      ) : (
                        ideaTags.map((tag, idx) => (
                          <option key={`opt-tag-${tag.id ?? "item"}-${idx}`} value={`tag:${tag.id}`}>
                            🏷️ {tag.name}
                          </option>
                        ))
                      )}
                      <option value="no_tags">🏷️ Без меток</option>
                    </optgroup>
                  </select>
                </div>

                {/* 3. Сортировка */}
                <div className="sm:col-span-1 lg:col-span-3 flex flex-col gap-1">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider font-sans">Сортировка</span>
                  <select
                    value={`${ideasSortField}_${ideasSortOrder}`}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "date_desc") { setIdeasSortField("date"); setIdeasSortOrder("desc"); }
                      else if (val === "date_asc") { setIdeasSortField("date"); setIdeasSortOrder("asc"); }
                      else if (val === "viral_desc") { setIdeasSortField("viral"); setIdeasSortOrder("desc"); }
                      else if (val === "duration_desc") { setIdeasSortField("duration"); setIdeasSortOrder("desc"); }
                      else if (val === "duration_asc") { setIdeasSortField("duration"); setIdeasSortOrder("asc"); }
                    }}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl text-xs py-2 px-3 font-semibold text-accent focus:outline-none focus:border-accent cursor-pointer font-sans transition-all"
                  >
                    <option value="date_desc">🆕 Сначала новые</option>
                    <option value="date_asc">⏳ Сначала старые</option>
                    <option value="viral_desc">🔥 По вирусному потенциалу</option>
                    <option value="duration_desc">⏱️ Сначала длинные</option>
                    <option value="duration_asc">⏱️ Сначала короткие</option>
                  </select>
                </div>
              </div>

              {/* Активные фильтры (быстрый сброс и индикация) */}
              {(selectedStatusTagFilter !== "all" || ideasSearchQuery) && (
                <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-border/40 text-xs">
                  <span className="text-[10px] text-neutral-500 font-bold uppercase font-sans">Активно:</span>
                  
                  {ideasSearchQuery && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-accent/15 text-accent border border-accent/30">
                      🔍 "{ideasSearchQuery}"
                      <button 
                        type="button" 
                        onClick={() => setIdeasSearchQuery("")} 
                        className="hover:text-white ml-0.5 cursor-pointer"
                        title="Убрать поиск"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  )}

                  {selectedStatusTagFilter.startsWith("status:") && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                      📌 Статус: {selectedStatusTagFilter.replace("status:", "")}
                      <button 
                        type="button" 
                        onClick={() => setSelectedStatusTagFilter("all")} 
                        className="hover:text-white ml-0.5 cursor-pointer"
                        title="Сбросить фильтр по статусу"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  )}

                  {selectedStatusTagFilter.startsWith("tag:") && (() => {
                    const tagId = selectedStatusTagFilter.replace("tag:", "");
                    const foundTag = ideaTags.find(t => t.id === tagId);
                    return (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                        🏷️ Метка: {foundTag ? foundTag.name : tagId}
                        <button 
                          type="button" 
                          onClick={() => setSelectedStatusTagFilter("all")} 
                          className="hover:text-white ml-0.5 cursor-pointer"
                          title="Сбросить фильтр по метке"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    );
                  })()}

                  {selectedStatusTagFilter === "no_tags" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
                      🏷️ Без меток
                      <button 
                        type="button" 
                        onClick={() => setSelectedStatusTagFilter("all")} 
                        className="hover:text-white ml-0.5 cursor-pointer"
                        title="Сбросить фильтр"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIdeasSearchQuery("");
                      setSelectedStatusTagFilter("all");
                    }}
                    className="text-[10px] text-neutral-400 hover:text-white underline cursor-pointer ml-auto"
                  >
                    Сбросить все
                  </button>
                </div>
              )}
            {/* Плейлисты - Быстрый выбор и создание собственного плейлиста */}
              <div className="pt-4 border-t border-border/40 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider font-sans flex items-center gap-1.5">
                      <Film size={12} className="text-accent" />
                      Плейлисты ({ideaPlaylists.length})
                    </span>
                    {selectedPlaylistFilter !== "all" && (
                      <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full font-bold">
                        Фильтр: {selectedPlaylistFilter === "none" ? "Без плейлиста" : selectedPlaylistFilter}
                      </span>
                    )}
                  </div>

                  {/* Кнопка создания / переключатель */}
                  <button
                    type="button"
                    onClick={() => setShowManagePlaylists(prev => !prev)}
                    className="text-[10px] font-bold text-accent hover:text-accent/80 flex items-center gap-1 transition-colors bg-accent/10 hover:bg-accent/20 px-2.5 py-1 rounded-lg border border-accent/20 cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>{showManagePlaylists ? "Скрыть форму" : "+ Создать плейлист"}</span>
                  </button>
                </div>

                {/* Форма быстрого добавления плейлиста в выделенный блок */}
                {(showManagePlaylists || ideaPlaylists.length === 0) && (
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 animate-in fade-in duration-200">
                    <div className="relative flex-1 min-w-[200px]">
                      <Film size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input
                        type="text"
                        value={newPlaylistName}
                        onChange={(e) => setNewPlaylistName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddPlaylist();
                          }
                        }}
                        placeholder="Название нового плейлиста (напр. 🎬 Подкасты)..."
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg text-xs py-1.5 pl-8 pr-3 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-accent font-sans"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddPlaylist()}
                      className="px-3.5 py-1.5 bg-accent hover:bg-accent/90 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Добавить плейлист</span>
                    </button>
                  </div>
                )}

                {/* Список чипсов плейлистов */}
                <div className="flex gap-2 flex-wrap pb-1 items-center">
                  <button
                    type="button"
                    onClick={() => setSelectedPlaylistFilter("all")}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all border ${
                      selectedPlaylistFilter === "all" 
                        ? "bg-accent/20 border-accent text-accent" 
                        : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                    }`}
                  >
                    🎬 Все плейлисты
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPlaylistFilter("none")}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all border ${
                      selectedPlaylistFilter === "none" 
                        ? "bg-accent/20 border-accent text-accent" 
                        : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                    }`}
                  >
                    🚫 Без плейлиста
                  </button>
                  {ideaPlaylists.map((playlist, idx) => (
                    <div
                      key={`playlist-${playlist}-${idx}`}
                      className={`group flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all border ${
                        selectedPlaylistFilter === playlist 
                          ? "bg-accent/20 border-accent text-accent" 
                          : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedPlaylistFilter(playlist)}
                        className="flex items-center gap-1.5 cursor-pointer hover:text-neutral-200"
                      >
                        <Film size={11} className={selectedPlaylistFilter === playlist ? "text-accent" : "text-neutral-400"} /> {playlist}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeletePlaylist(playlist, e);
                        }}
                        className="opacity-70 group-hover:opacity-100 text-neutral-400 hover:text-red-400 transition-all ml-1 cursor-pointer p-1 rounded hover:bg-red-500/15"
                        title={`Удалить плейлист "${playlist}"`}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-border/40 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIdeasForDeletion.length === sortedIdeas.length && sortedIdeas.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIdeasForDeletion(sortedIdeas.map((idea: any) => typeof idea === "string" ? idea : idea.title));
                        } else {
                          setSelectedIdeasForDeletion([]);
                        }
                      }}
                      className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-accent focus:ring-accent accent-accent cursor-pointer"
                      id="select-all-ideas"
                    />
                    <label htmlFor="select-all-ideas" className="text-xs font-bold text-neutral-300 cursor-pointer flex items-center gap-2 select-none">
                      Выбрать все ({sortedIdeas.length})
                    </label>

                    {/* Кнопка скрыть/показать опубликованные (Архив) */}
                    <button
                      type="button"
                      onClick={() => setHidePublished(prev => !prev)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        hidePublished
                          ? "bg-teal-500/15 border-teal-500/40 text-teal-300 hover:bg-teal-500/25 shadow-sm"
                          : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white"
                      }`}
                      title={hidePublished ? "Показать опубликованные идеи в общем списке" : "Автоматически скрывать опубликованные идеи в архив"}
                    >
                      {hidePublished ? <EyeOff size={14} className="text-teal-400 shrink-0" /> : <Archive size={14} className="text-neutral-400 shrink-0" />}
                      <span>
                        {hidePublished ? `📦 Архив скрыт (${publishedIdeasCount})` : `👁️ Архив в списке (${publishedIdeasCount})`}
                      </span>
                    </button>
                    {/* Кнопка-фильтр: Скрыть темы, существующие на канале */}
                    <button
                      type="button"
                      onClick={() => setHideExistingInChannel(prev => !prev)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        hideExistingInChannel
                          ? "bg-purple-500/20 border-purple-500/50 text-purple-300 hover:bg-purple-500/30 shadow-md shadow-purple-500/10"
                          : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white"
                      }`}
                      title={
                        hideExistingInChannel
                          ? "Показать все темы, включая совпадения с видео канала"
                          : "Скрыть идеи, которые уже опубликованы на вашем YouTube-канале"
                      }
                    >
                      <Filter size={14} className={hideExistingInChannel ? "text-purple-400 shrink-0" : "text-neutral-400 shrink-0"} />
                      <span>
                        {hideExistingInChannel
                          ? `✨ Только новые темы (скрыто ${existingChannelMatchesCount})`
                          : `📺 Скрыть существующие на канале (${existingChannelMatchesCount})`}
                      </span>
                    </button>

                    {/* Переключатель вида: Сгруппированный по сиквелам / Плоский список */}
                    <button
                      type="button"
                      onClick={() => setIsGroupedView(prev => !prev)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        isGroupedView
                          ? "bg-accent/20 border-accent/50 text-accent hover:bg-accent/30 shadow-md shadow-accent/10"
                          : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white"
                      }`}
                      title={
                        isGroupedView
                          ? "Переключить на стандартный плоский список всех идей"
                          : "Визуально сгруппировать идеи-сиквелы под родительскими темами"
                      }
                    >
                      <Layers size={14} className={isGroupedView ? "text-accent shrink-0" : "text-neutral-400 shrink-0"} />
                      <span>
                        {isGroupedView ? "🗂️ Группировка сиквелов" : "📑 Плоский список"}
                      </span>
                    </button>
                  </div>

                  {selectedIdeasForDeletion.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 bg-neutral-900/90 border border-neutral-700/80 p-2 rounded-xl">
                      <span className="text-[10px] font-black text-accent uppercase tracking-wider px-2">
                        Выбрано: {selectedIdeasForDeletion.length}
                      </span>
                      
                      {/* 1. Смена статуса */}
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) return;
                          handleBatchSetStatus(val);
                          e.target.value = "";
                        }}
                        className="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-[10px] font-bold text-neutral-200 focus:outline-none hover:border-accent cursor-pointer"
                      >
                        <option value="">⚡ Статус...</option>
                        {IDEA_STATUSES.map((s, idx) => (
                          <option key={`opt-st1-${s.id}-${idx}`} value={s.id}>{s.label}</option>
                        ))}
                      </select>

                      {/* 2. Смена рубрики */}
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) return;
                          handleBatchSetFolder(val);
                          e.target.value = "";
                        }}
                        className="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-[10px] font-bold text-neutral-200 focus:outline-none hover:border-accent cursor-pointer"
                      >
                        <option value="">📁 Рубрика...</option>
                        <option value="none">Без рубрики</option>
                        {ideaFolders.map((f, i) => <option key={`opt-f1-${f}-${i}`} value={f}>{f}</option>)}
                      </select>

                      {/* 3. Добавление метки */}
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) return;
                          handleBatchAddTag(val);
                          e.target.value = "";
                        }}
                        className="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-[10px] font-bold text-neutral-200 focus:outline-none hover:border-accent cursor-pointer"
                      >
                        <option value="">🏷️ + Метка...</option>
                        {ideaTags.map((t, idx) => <option key={`opt-t1-${t.id ?? 'item'}-${idx}`} value={t.id}>{t.name}</option>)}
                      </select>

                      {/* 4. В плейлист */}
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) return;
                          handleBatchSetPlaylist(val);
                          e.target.value = "";
                        }}
                        className="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-[10px] font-bold text-neutral-200 focus:outline-none hover:border-accent cursor-pointer"
                      >
                        <option value="">🎬 Плейлист...</option>
                        <option value="none">Убрать из плейлиста</option>
                        {ideaPlaylists.map((p, i) => <option key={`opt-p1-${p}-${i}`} value={p}>{p}</option>)}
                      </select>

                      {/* 5. Массовое удаление */}
                      <button
                        onClick={handleDeleteSelectedIdeas}
                        className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                      >
                        <Trash2 size={12} /> Удалить
                      </button>

                      <button
                        onClick={() => setSelectedIdeasForDeletion([])}
                        className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 cursor-pointer"
                        title="Сбросить выделение"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setIsSnapshotsModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
                    title="Сохранить снимки версии контент-плана в Firebase и переключаться между ними"
                  >
                    <Database size={14} className="text-emerald-400 shrink-0" />
                    <span>Сохранить состояние идей</span>
                  </button>

                  <button
                    onClick={() => handleExportIdeasToCSV(sortedIdeas)}
                    disabled={!sortedIdeas || sortedIdeas.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="Скачать контент-план в формате CSV (Excel / Google Таблицы)"
                  >
                    <FileSpreadsheet size={14} className="text-emerald-400 shrink-0" />
                    <span>Скачать CSV</span>
                  </button>

                  <button
                    onClick={() => handleExportIdeasToJSON(sortedIdeas)}
                    disabled={!sortedIdeas || sortedIdeas.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="Скачать контент-план в формате JSON (резервная копия)"
                  >
                    <Download size={14} className="text-blue-400 shrink-0" />
                    <span>Скачать JSON</span>
                  </button>

                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 rounded-lg text-xs font-bold transition-all cursor-pointer">
                    <Upload size={14} className="text-purple-400 shrink-0" />
                    <span>Загрузить JSON</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportIdeasFromJSON}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Конструктор и загрузка своего контент-плана */}
            <ContentPlanSection
              currentIdeasCount={(nicheData?.ideas || []).length}
              onApplyContentPlan={handleApplyCustomContentPlan}
              selectedModel={selectedModel}
              selectedNiche={selectedNiche}
              customNiche={customNiche}
              nicheData={nicheData}
              selectedBranding={selectedBranding}
              customCompetitorInsights={customCompetitorInsights}
            />


            {sortedIdeas.length === 0 ? (
              <div className="bg-surface border border-dashed border-border rounded-3xl p-10 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent mb-4">
                  <Search size={24} />
                </div>
                <h3 className="text-lg font-bold text-white">Ничего не найдено по текущим фильтрам</h3>
                <p className="mt-2 text-sm text-neutral-400 max-w-md mx-auto">
                  Попробуйте сбросить фильтры или сгенерировать новую подборку идей под текущую нишу.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <button
                    onClick={() => {
                      setIdeasSearchQuery("");
                      setSelectedStatusTagFilter("all");
                      setSelectedPlaylistFilter("all");
                      setHidePublished(false);
                      setHideExistingInChannel(false);
                      setIsGroupedView(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    Сбросить фильтры
                  </button>
                  <button
                    onClick={() => {
                      setCustomIdeaModalTab("ai");
                      setShowCustomIdeasModal(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent/90 text-xs font-bold transition-all shadow-md shadow-accent/20 cursor-pointer"
                  >
                    Сгенерировать идеи
                  </button>
                </div>
              </div>
            ) : (
              <>
                {(() => {
                  
  const renderIdeaCard = (idea: any, i: number, isSequelChild?: boolean, parentTitleRef?: string) => {
    const title = typeof idea === "string" ? idea : idea.title;
    const isDetailed = typeof idea === "object";
    const assignment = ideaAssignments[title] || {};
    const isPublishedChannelVid = isIdeaOnChannel(title, isDetailed ? idea.description : undefined);

    return (
      <motion.div
        key={typeof idea === "object" && idea?.id ? `idea-${idea.id}-${i}` : `idea-${title || "idea"}-${i}`}
        layout
        onClick={() => {
          setSelectedIdea(title);
          if (scriptTopic && scriptTopic.trim() !== "") {
            if (scriptTopic !== title) {
              toast.info(`Выбрана идея для просмотра: "${title}". Активная рабочая тема: "${scriptTopic}". Нажмите "Взять в работу" на карточке, чтобы сделать её рабочей темой.`);
            }
          } else {
            setScriptTopic(title);
          }
          if (isDetailed) {
            if (idea.duration) {
              const digits = idea.duration.match(/\d+/);
              if (digits) setScriptDuration(digits[0]);
            }
            if (idea.tone) setScriptTone(idea.tone);
          }
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        whileHover={{ 
          y: -4, 
          scale: 1.015,
          borderColor: "rgba(224, 75, 142, 0.45)"
        }}
        whileTap={{ scale: 0.995 }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 24,
          layout: { type: "spring", stiffness: 300, damping: 30 }
        }}
        className={`p-3.5 rounded-2xl border cursor-pointer group relative min-w-0 overflow-hidden break-words transition-all ${
          selectedIdea === title
            ? "bg-accent/10 border-accent/40 shadow-lg shadow-accent/10"
            : isSequelChild
              ? "bg-purple-950/20 border-purple-500/35 hover:border-purple-500/55 shadow-sm"
              : "bg-surface border-border hover:border-accent/30"
        }`}
      >
        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex items-start gap-2.5 min-w-0">
            <input
              type="checkbox"
              checked={selectedIdeasForDeletion.includes(title)}
              onChange={(e) => {
                e.stopPropagation();
                setSelectedIdeasForDeletion(prev => {
                  const arr = Array.isArray(prev) ? prev : [];
                  return arr.includes(title) ? arr.filter(t => t !== title) : [...arr, title];
                });
              }}
              onClick={(e) => e.stopPropagation()}
              className="mt-1 w-3.5 h-3.5 rounded border-neutral-700 bg-neutral-800 text-accent accent-accent cursor-pointer shrink-0"
            />
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className={`text-[13px] font-bold transition-colors break-words flex-1 leading-snug ${selectedIdea === title ? "text-white" : "text-neutral-300 group-hover:text-accent"}`}>
                  {title}
                </p>
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={`status:${assignment.status || "Идея"}`}
                    onChange={(e) => {
                      e.stopPropagation();
                      const val = e.target.value;
                      if (!val) return;

                      if (val.startsWith("status:")) {
                        const newStatus = val.replace("status:", "");
                        setIdeaAssignments(prev => ({
                          ...prev,
                          [title]: {
                            ...prev[title],
                            status: newStatus
                          }
                        }));

                        const isFilteredOutByStatus = selectedStatusTagFilter.startsWith("status:") && selectedStatusTagFilter !== `status:${newStatus}`;
                        const isFilteredOutByArchive = newStatus === "Опубликовано" && hidePublished && !selectedStatusTagFilter.includes("Опубликовано");

                        if (isFilteredOutByArchive) {
                          toast.success(`Статус изменен на "Опубликовано". Идея перемещена в архив 🚀📦`);
                        } else if (isFilteredOutByStatus) {
                          const activeFilterName = selectedStatusTagFilter.replace("status:", "");
                          toast.success(`Статус изменен на "${newStatus}". Карточка скрыта из фильтра "${activeFilterName}".`);
                        } else {
                          toast.success(`Статус изменен на "${newStatus}"`);
                        }
                      } else if (val.startsWith("tag_add:")) {
                        const tagId = val.replace("tag_add:", "");
                        const currentAssigned = assignment.tags || [];
                        if (!currentAssigned.includes(tagId)) {
                          setIdeaAssignments(prev => ({
                            ...prev,
                            [title]: {
                              ...prev[title],
                              tags: [...(prev[title]?.tags || []), tagId]
                            }
                          }));
                          const tag = ideaTags.find(t => t.id === tagId);
                          toast.success(`Метка "${tag ? tag.name : tagId}" добавлена`);
                        }
                      } else if (val.startsWith("tag_remove:")) {
                        const tagId = val.replace("tag_remove:", "");
                        setIdeaAssignments(prev => ({
                          ...prev,
                          [title]: {
                            ...prev[title],
                            tags: (prev[title]?.tags || []).filter(id => id !== tagId)
                          }
                        }));
                        const tag = ideaTags.find(t => t.id === tagId);
                        toast.success(`Метка "${tag ? tag.name : tagId}" удалена`);
                      } else if (val === "__new_tag__" || val === "__manage_tags__") {
                        setShowManageFoldersTags(true);
                        toast.info("Панель создания и управления метками открыта сверху");
                      } else if (val === "__manage_tags__") {
                        setShowManageFoldersTags(true);
                        toast.info("Панель управления метками открыта сверху");
                      }
                      
                      e.target.value = `status:${assignment.status || "Идея"}`;
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[9px] font-extrabold border cursor-pointer transition-all focus:outline-none shadow-sm ${selectedStatusTagFilter === `status:${assignment.status || "Идея"}` ? "ring-2 ring-accent border-accent shadow-accent/25" : ""} ${getIdeaStatusObj(assignment.status).bg}`}
                    title="Статус задачи и управление метками"
                  >
                    <optgroup label="📌 Статус задачи" className="bg-neutral-900 text-neutral-300 font-bold">
                      {IDEA_STATUSES.map((s, idx) => {
                        const isCurrent = (assignment.status || "Идея") === s.id;
                        return (
                          <option key={`opt-st2-${s.id}-${idx}`} value={`status:${s.id}`} className="bg-neutral-900 text-neutral-200">
                            {isCurrent ? `✓ ${s.label}` : s.label}
                          </option>
                        );
                      })}
                    </optgroup>
                    
                    <optgroup label="🏷️ Метки (добавить / снять)" className="bg-neutral-900 text-neutral-300 font-bold">
                      {ideaTags.length === 0 ? (
                        <option value="" disabled className="bg-neutral-900 text-neutral-500">Нет меток</option>
                      ) : (
                        ideaTags.map((tag, idx) => {
                          const isAssigned = (assignment.tags || []).includes(tag.id);
                          return (
                            <option
                              key={`opt-card-tag-${tag.id ?? "item"}-${idx}`}
                              value={isAssigned ? `tag_remove:${tag.id}` : `tag_add:${tag.id}`}
                              className="bg-neutral-900 text-neutral-200"
                            >
                              {isAssigned ? `✓ 🏷️ ${tag.name} (убрать)` : `+ 🏷️ ${tag.name}`}
                            </option>
                          );
                        })
                      )}
                      <option value="__new_tag__" className="bg-neutral-900 text-accent font-bold">➕ + Новая метка...</option>
                      <option value="__manage_tags__" className="bg-neutral-900 text-neutral-400">⚙️ Управление метками...</option>
                    </optgroup>
                  </select>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSingleIdeaTrigger(title);
                    }}
                    className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0"
                    title="Удалить эту идею"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {isDetailed && idea.description && (
                <>
                  {(idea.description.includes("Логическое продолжение") || idea.description.includes("продолжение") || idea.description.includes("🔄")) && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 mb-1">
                      <span>🔄 Логическое продолжение</span>
                    </div>
                  )}
                  <p className="text-[10px] text-neutral-400 italic line-clamp-2 leading-relaxed">
                    {idea.description}
                  </p>
                </>
              )}

              {/* Visual viral potential bar */}
              {(() => {
                const viralStr = getIdeaViralPotentialStr(idea);
                const parsed = parseViralPotential(viralStr);
                return (
                  <div className="mt-2.5 p-2 bg-neutral-950/45 rounded-xl border border-neutral-800/50 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-neutral-400 font-bold flex items-center gap-1">
                        <Flame size={12} className="text-rose-500 fill-rose-500 animate-pulse" />
                        <span>Потенциал:</span>
                        <span className={`font-black ${parsed.textClass}`}>{parsed.level}</span>
                      </span>
                      <span className="font-mono text-neutral-400 font-extrabold">{parsed.score}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-neutral-900 rounded-full overflow-hidden border border-neutral-800/30">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${parsed.score}%` }}
                        className={`h-full rounded-full ${parsed.color}`}
                        transition={{ duration: 0.8 }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="pl-6 flex flex-wrap gap-1.5">
            {isDetailed && idea.duration && (
              <span className="px-2 py-0.5 bg-neutral-900 border border-neutral-800 rounded text-[9px] text-neutral-400 flex items-center gap-1">
                <Clock size={10} /> {idea.duration}
              </span>
            )}
            {assignment.folder && assignment.folder !== "none" && (
              <span className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-[9px] font-bold flex items-center gap-1">
                📁 {assignment.folder}
              </span>
            )}
            {assignment.playlist && assignment.playlist !== "none" && (
              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-[9px] font-bold flex items-center gap-1">
                🎬 {assignment.playlist}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIdeaAssignments(prev => ({
                      ...prev,
                      [title]: { ...prev[title], playlist: undefined }
                    }));
                    toast.success("Идея убрана из плейлиста");
                  }}
                  className="hover:text-red-400 ml-1 transition-colors cursor-pointer"
                  title="Убрать из плейлиста"
                >
                  <X size={9} />
                </button>
              </span>
            )}
            {(assignment.tags || []).map((tagId: string, tagIdx: number) => {
              const tag = ideaTags.find(t => t.id === tagId);
              if (!tag) return null;
              const isTagFiltered = selectedStatusTagFilter === `tag:${tag.id}`;
              return (
                <span 
                  key={`${tag.id}-${tagIdx}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedStatusTagFilter === `tag:${tag.id}`) {
                      setSelectedStatusTagFilter("all");
                      toast.info(`Фильтр по метке "${tag.name}" сброшен`);
                    } else {
                      setSelectedStatusTagFilter(`tag:${tag.id}`);
                      toast.success(`Фильтр по метке "${tag.name}" активен 🏷️`);
                    }
                  }}
                  className={`px-2 py-0.5 border rounded-lg text-[9px] font-bold flex items-center gap-1.5 transition-all cursor-pointer select-none ${
                    isTagFiltered
                      ? "ring-2 ring-accent border-accent bg-accent/25 text-white font-extrabold shadow-sm shadow-accent/25 scale-105"
                      : `${getTagColorClasses(tag.color)} hover:opacity-90 hover:scale-102`
                  }`}
                  title="Нажмите, чтобы включить/выключить фильтр по этой метке"
                >
                  <span>🏷️ {tag.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIdeaAssignments(prev => {
                        const currTags = prev[title]?.tags || [];
                        return {
                          ...prev,
                          [title]: {
                            ...prev[title],
                            tags: currTags.filter(id => id !== tag.id)
                          }
                        };
                      });
                      toast.success(`Метка "${tag.name}" удалена`);
                    }}
                    className="hover:text-red-400 ml-0.5 p-0.5 rounded hover:bg-black/30 transition-colors cursor-pointer"
                    title="Удалить метку"
                  >
                    <X size={9} />
                  </button>
                </span>
              );
            })}
          </div>

          <div className="pl-0 sm:pl-6 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/20 min-w-0 max-w-full">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={(e) => { e.stopPropagation(); handleGenerateIdeaDetails(title); }}
                disabled={!!isGeneratingIdeaDetails[title]}
                className={`border rounded-lg text-[9px] py-1 px-2 font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                  isGeneratingIdeaDetails[title]
                    ? "bg-primary/20 text-primary border-primary/50 cursor-wait opacity-85"
                    : "bg-primary/15 hover:bg-primary/25 text-primary border border-primary/40 cursor-pointer"
                }`}
                title="Сгенерировать подробный план сценария"
              >
                {isGeneratingIdeaDetails[title] ? (
                  <>
                    <Loader2 size={10} className="animate-spin text-primary" />
                    <span>План...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={10} />
                    <span>План</span>
                  </>
                )}
              </button>

              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <select
                  value=""
                  onChange={(e) => {
                    e.stopPropagation();
                    const val = e.target.value;
                    if (val === "sequels") {
                      handleGenerateSequels(title, isDetailed ? idea.description : undefined);
                    } else if (val === "analysis") {
                      handleTriggerDeepAnalysis(title, selectedNiche, isDetailed ? idea.description : undefined);
                    }
                    e.target.value = "";
                  }}
                  className="bg-neutral-900 hover:bg-neutral-800 border border-accent/30 text-accent rounded-lg text-[9px] py-1 px-2 font-bold cursor-pointer transition-colors focus:outline-none"
                  title="Дополнительные AI-инструменты"
                >
                  <option value="">⚡ AI Инструменты...</option>
                  <option value="sequels">🎬 Сгенерировать сиквелы</option>
                  <option value="analysis">🧠 Глубокий AI-анализ</option>
                </select>
                {isGeneratingSequels[title] && (
                  <Loader2 size={11} className="animate-spin text-accent absolute right-2 top-1.5 pointer-events-none" />
                )}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setQuickNoteIdeaTitle(title);
                  setQuickNoteText(assignment.note || "");
                  setShowQuickNoteModal(true);
                }}
                className={`rounded-lg text-[9px] py-1 px-2 font-bold flex items-center gap-1 transition-all cursor-pointer border ${
                  assignment.note
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm"
                    : "bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border-neutral-800 hover:text-neutral-200"
                }`}
                title="Быстрая заметка к идее"
              >
                <FileText size={10} className={assignment.note ? "text-amber-400" : "text-neutral-400"} />
                <span>{assignment.note ? "Заметка ✓" : "Заметка"}</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIdea(title);
                  setScriptTopic(title);
                  setIsScriptTopicLocked(true);
                  toast.success(`Тема "${title}" зафиксирована как рабочая для всех разделов! 🚀`);
                }}
                className={`rounded-lg text-[9px] py-1 px-2 font-bold flex items-center gap-1 transition-all cursor-pointer border ${
                  scriptTopic === title
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm"
                    : "bg-accent/15 hover:bg-accent/25 text-accent border-accent/40 shadow-sm"
                }`}
                title={scriptTopic === title ? "Эта тема сейчас является рабочей для всех разделов" : "Сделать этой идеей рабочую тему для сценария, SEO и промптов"}
              >
                {scriptTopic === title ? (
                  <>
                    <Check size={10} className="text-emerald-400" />
                    <span>В работе ✓</span>
                  </>
                ) : (
                  <>
                    <Zap size={10} />
                    <span>Взять в работу</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-1.5 min-w-0" onClick={(e) => e.stopPropagation()}>
              <NicheTooltip niche={selectedNiche} type="playlists">
                <select
                  value={assignment.playlist || ""}
                  onChange={(e) => {
                    e.stopPropagation();
                    const val = e.target.value;
                    if (val === "__new__") {
                      setShowManageFoldersTags(true);
                      toast.info("Панель управления плейлистами открыта сверху");
                      return;
                    }
                    setIdeaAssignments(prev => ({
                      ...prev,
                      [title]: { ...prev[title], playlist: val === "none" || !val ? undefined : val }
                    }));
                    if (val === "none" || !val) {
                      toast.success("Идея убрана из плейлиста");
                    } else {
                      toast.success(`Помещено в плейлист: ${val}`);
                    }
                  }}
                  className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 rounded-lg px-1.5 py-1 text-[9px] text-neutral-300 focus:outline-none focus:border-accent cursor-pointer transition-colors font-sans max-w-[130px] truncate"
                >
                  <option value="">🎬 В плейлист...</option>
                  {assignment.playlist && assignment.playlist !== "none" && (
                    <option value="none">❌ Без плейлиста</option>
                  )}
                  {ideaPlaylists.map((p, pIdx) => (
                    <option key={`playlist-opt-${pIdx}-${p}`} value={p}>{p}</option>
                  ))}
                  <option value="__new__">➕ + Новый плейлист...</option>
                </select>
              </NicheTooltip>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };


                  if (isGroupedView) {
                    return (
                      <motion.div layout className="space-y-5 w-full min-w-0">
                        <AnimatePresence mode="popLayout">
                          {groupedClusters.map((cluster) => {
                          const isCollapsed = collapsedGroups[cluster.id];

                          if (cluster.type === "playlist") {
                            return (
                              <div
                                key={cluster.id}
                                className="bg-neutral-900/90 border border-purple-500/35 rounded-3xl p-4 sm:p-5 space-y-4 relative overflow-hidden shadow-xl shadow-purple-500/5 transition-all"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-500/20 pb-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 font-bold shrink-0">
                                      <Film size={18} />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-purple-300 uppercase tracking-wider">
                                          🎬 Плейлист / Серия
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                          {1 + cluster.sequelIdeas.length} видео
                                        </span>
                                      </div>
                                      <h4 className="text-sm font-bold text-white">{cluster.title}</h4>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => toggleGroupCollapse(cluster.id)}
                                    className="text-xs font-bold text-purple-300 hover:text-purple-100 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                                  >
                                    {isCollapsed ? (
                                      <>
                                        <ChevronDown size={14} />
                                        <span>Показать все выпуски ({1 + cluster.sequelIdeas.length})</span>
                                      </>
                                    ) : (
                                      <>
                                        <ChevronUp size={14} />
                                        <span>Свернуть плейлист</span>
                                      </>
                                    )}
                                  </button>
                                </div>

                                {!isCollapsed && (
                                  <div className="space-y-4 pt-1">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2 text-[10px] font-black text-purple-400 uppercase tracking-wider pl-1">
                                        <Crown size={12} className="text-amber-400 shrink-0" />
                                        <span>Выпуск 1 (Главная тема плейлиста)</span>
                                      </div>
                                      {renderIdeaCard(cluster.parentIdea, 0, false)}
                                    </div>

                                    {cluster.sequelIdeas.map((seqIdea, seqIdx) => (
                                      <div
                                        key={`seq-pl-${seqIdx}`}
                                        className="ml-3 sm:ml-6 pl-3 sm:pl-5 border-l-2 border-dashed border-purple-500/40 relative space-y-1.5"
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-1.5 text-[10px] font-black text-purple-300 bg-purple-500/20 border border-purple-500/35 px-2.5 py-1 rounded-lg">
                                            <span>↳ 🔄 Выпуск {seqIdx + 2} (Сиквел)</span>
                                          </div>
                                        </div>
                                        {renderIdeaCard(seqIdea, seqIdx + 1, true, typeof cluster.parentIdea === "string" ? cluster.parentIdea : cluster.parentIdea?.title)}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          }

                          if (cluster.type === "continuation") {
                            if (cluster.parentChannelVideo) {
                              return (
                                <div
                                  key={cluster.id}
                                  className="bg-neutral-900/90 border border-emerald-500/35 rounded-3xl p-4 sm:p-5 space-y-4 relative overflow-hidden shadow-xl shadow-emerald-500/5 transition-all"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-500/20 pb-3">
                                    <div className="flex items-center gap-3">
                                      <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                                        <Youtube size={18} />
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                                            📺 Исходное видео на вашем YouTube-канале
                                          </span>
                                          <span className="px-2 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-300 font-extrabold border border-emerald-500/30">
                                            Опубликовано
                                          </span>
                                        </div>
                                        <h4 className="text-sm font-bold text-white">{cluster.parentChannelVideo.title}</h4>
                                        {cluster.parentChannelVideo.viewCount && (
                                          <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                                            👀 {cluster.parentChannelVideo.viewCount} просмотров
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => toggleGroupCollapse(cluster.id)}
                                      className="text-xs font-bold text-emerald-300 hover:text-emerald-100 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                                    >
                                      {isCollapsed ? (
                                        <>
                                          <ChevronDown size={14} />
                                          <span>Показать новые идеи-сиквелы ({cluster.sequelIdeas.length})</span>
                                        </>
                                      ) : (
                                        <>
                                          <ChevronUp size={14} />
                                          <span>Свернуть</span>
                                        </>
                                      )}
                                    </button>
                                  </div>

                                  {!isCollapsed && (
                                    <div className="space-y-4 pt-1">
                                      {cluster.sequelIdeas.map((seqIdea, seqIdx) => (
                                        <div
                                          key={`seq-chan-${seqIdx}`}
                                          className="ml-3 sm:ml-6 pl-3 sm:pl-5 border-l-2 border-dashed border-emerald-500/40 relative space-y-1.5"
                                        >
                                          <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-300 bg-emerald-500/20 border border-emerald-500/35 px-2.5 py-1 rounded-lg w-fit">
                                            <span>↳ 🔄 Новая идея-продолжение роликов канала</span>
                                          </div>
                                          {renderIdeaCard(seqIdea, seqIdx, true, cluster.parentChannelVideo.title)}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            return (
                              <div
                                key={cluster.id}
                                className="bg-neutral-900/80 border border-neutral-800 hover:border-purple-500/30 rounded-3xl p-4 sm:p-5 space-y-4 transition-all relative shadow-lg shadow-black/20"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 pb-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-purple-300 uppercase tracking-wider bg-purple-500/20 border border-purple-500/35 px-2.5 py-1 rounded-md flex items-center gap-1">
                                      <Crown size={12} className="text-amber-400" />
                                      Родительская тема (имеет сиквелы)
                                    </span>
                                    <span className="text-xs text-neutral-400 font-extrabold">
                                      ({cluster.sequelIdeas.length} сиквела)
                                    </span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => toggleGroupCollapse(cluster.id)}
                                    className="text-xs font-bold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-3 py-1 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                                  >
                                    {isCollapsed ? (
                                      <>
                                        <ChevronDown size={14} />
                                        <span>Сиквелы ({cluster.sequelIdeas.length})</span>
                                      </>
                                    ) : (
                                      <>
                                        <ChevronUp size={14} />
                                        <span>Свернуть</span>
                                      </>
                                    )}
                                  </button>
                                </div>

                                <div className="space-y-4">
                                  {renderIdeaCard(cluster.parentIdea, 0, false)}

                                  {!isCollapsed && (
                                    <div className="space-y-4 pt-1">
                                      {cluster.sequelIdeas.map((seqIdea, seqIdx) => (
                                        <div
                                          key={`seq-direct-${seqIdx}`}
                                          className="ml-3 sm:ml-6 pl-3 sm:pl-5 border-l-2 border-dashed border-purple-500/40 relative space-y-1.5"
                                        >
                                          <div className="flex items-center gap-1.5 text-[10px] font-black text-purple-300 bg-purple-500/20 border border-purple-500/35 px-2.5 py-1 rounded-lg w-fit">
                                            <span>↳ 🔄 Логическое продолжение / Сиквел</span>
                                          </div>
                                          {renderIdeaCard(seqIdea, seqIdx + 1, true, typeof cluster.parentIdea === "string" ? cluster.parentIdea : cluster.parentIdea?.title)}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          }

                          return (
                            <motion.div layout exit={{ opacity: 0, scale: 0.95 }} key={cluster.id} className="w-full">
                              {renderIdeaCard(cluster.parentIdea, 0, false)}
                            </motion.div>
                          );
                        })}
                        </AnimatePresence>
                      </motion.div>
                    );
                  }

                  return (
                    <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full min-w-0">
                      <AnimatePresence mode="popLayout">
                        {sortedIdeas.map((idea: any, i: number) => renderIdeaCard(idea, i, false))}
                      </AnimatePresence>
                    </motion.div>
                  );
                })()}
              </>
            )}

            {/* Floating Batch Action Toolbar */}
            <AnimatePresence>
              {selectedIdeasForDeletion.length > 0 && (
                <motion.div
                  key="ideas-batch-toolbar"
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 50 }}
                  className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-neutral-900/95 border border-accent/40 backdrop-blur-md px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 max-w-[92vw] overflow-x-auto"
                >
                  <div className="flex items-center gap-2 border-r border-neutral-700 pr-3 shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-accent animate-ping" />
                    <span className="text-xs font-black text-white whitespace-nowrap">
                      Выбрано идей: <span className="text-accent font-extrabold">{selectedIdeasForDeletion.length}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Статус */}
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        handleBatchSetStatus(val);
                        e.target.value = "";
                      }}
                      className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs font-bold text-neutral-200 focus:outline-none focus:border-accent cursor-pointer"
                    >
                      <option value="">⚡ Изменить статус...</option>
                      {IDEA_STATUSES.map((s, idx) => (
                        <option key={`opt-st3-${s.id}-${idx}`} value={s.id}>{s.label}</option>
                      ))}
                    </select>

                    {/* Рубрика */}
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        handleBatchSetFolder(val);
                        e.target.value = "";
                      }}
                      className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs font-bold text-neutral-200 focus:outline-none focus:border-accent cursor-pointer"
                    >
                      <option value="">📁 Сменить рубрику...</option>
                      <option value="none">Без рубрики</option>
                      {ideaFolders.map((f, i) => <option key={`opt-f2-${f}-${i}`} value={f}>{f}</option>)}
                    </select>

                    {/* Добавить метку */}
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        handleBatchAddTag(val);
                        e.target.value = "";
                      }}
                      className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs font-bold text-neutral-200 focus:outline-none focus:border-accent cursor-pointer"
                    >
                      <option value="">🏷️ Добавить метку...</option>
                      {ideaTags.map((t, idx) => <option key={`opt-t3-${t.id ?? 'item'}-${idx}`} value={t.id}>{t.name}</option>)}
                    </select>

                    {/* Плейлист */}
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        handleBatchSetPlaylist(val);
                        e.target.value = "";
                      }}
                      className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs font-bold text-neutral-200 focus:outline-none focus:border-accent cursor-pointer"
                    >
                      <option value="">🎬 В плейлист...</option>
                      <option value="none">Убрать из плейлиста</option>
                      {ideaPlaylists.map((p, i) => <option key={`opt-p2-${p}-${i}`} value={p}>{p}</option>)}
                    </select>

                    {/* Массовое удаление */}
                    <button
                      onClick={handleDeleteSelectedIdeas}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                    >
                      <Trash2 size={13} /> Удалить выделенные
                    </button>

                    <button
                      onClick={() => setSelectedIdeasForDeletion([])}
                      className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                      title="Сбросить выделение"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        );
      }
            case "Сценарий":
        return (
          <ScriptTab
            nicheData={nicheData}
            selectedIdea={selectedIdea}
            selectedNiche={selectedNiche}
            scriptTopic={scriptTopic}
            setScriptTopic={setScriptTopic}
            scriptMode={scriptMode}
            setScriptMode={setScriptMode}
            scriptCustomMode={scriptCustomMode}
            setScriptCustomMode={setScriptCustomMode}
            scriptDuration={scriptDuration}
            setScriptDuration={setScriptDuration}
            scriptCustomDuration={scriptCustomDuration}
            setScriptCustomDuration={setScriptCustomDuration}
            scriptTone={scriptTone}
            setScriptTone={setScriptTone}
            scriptWishes={scriptWishes}
            setScriptWishes={setScriptWishes}
            isGeneratingHooks={isGeneratingHooks}
            handleGenerateHooks={handleGenerateHooks}
            generatedHooks={generatedHooks}
            isGeneratingFullScript={isGeneratingFullScript}
            handleGenerateFullScript={handleGenerateFullScript}
            generatedBlocks={generatedBlocks}
            setGeneratedBlocks={setGeneratedBlocks}
            scriptStructure={scriptStructure}
            setScriptStructure={setScriptStructure}
            isScriptTopicLocked={isScriptTopicLocked}
            setIsScriptTopicLocked={setIsScriptTopicLocked}
            syncStatus={syncStatus}
            showSyncNotification={showSyncNotification}
            lastFirebaseSave={lastFirebaseSave}
            scriptVersions={scriptVersions}
            activeVersionId={activeVersionId}
            handleSaveScriptVersion={saveScriptVersion}
            handleLoadScriptVersion={loadScriptVersion}
            handleDeleteScriptVersion={deleteScriptVersion}
            handleRenameScriptVersion={renameScriptVersion}
            handleOpenDiffModal={(vA, vB) => {
              setDiffVersionAId(vA || null);
              setDiffVersionBId(vB || null);
              setIsDiffModalOpen(true);
            }}
            scriptRecommendations={scriptImprovements}
            isGeneratingRecommendations={isAnalyzingScript}
            handleGenerateScriptRecommendations={handleAnalyzeScriptRetention}
            handleApplyScriptRecommendation={handleApplyRetentionImprovement}
            handleSelectBlockAndScrollToPrompts={handleSelectBlockAndScrollToPrompts}
            renderIdeaBanner={renderIdeaBanner}
            activeModel={selectedModel}
            copyToClipboard={copyToClipboard}
          />
        );

      case "Шортс":
        return (
          <ShortsTab
            nicheData={nicheData}
            selectedBranding={selectedBranding}
            generatedBlocks={generatedBlocks}
            renderIdeaBanner={renderIdeaBanner}
            shorts={shorts}
          />
        );

      case "SEO":
        return (
          <SEOTab
            scriptTopic={scriptTopic}
            selectedIdea={selectedIdea}
            nicheData={nicheData}
            selectedBranding={selectedBranding}
            videoSEO={videoSEO}
            setVideoSEO={setVideoSEO}
            isGeneratingVideoSEO={isGeneratingVideoSEO}
            handleGenerateVideoSEO={handleGenerateVideoSEO}
            handleAnalyzeSEO={handleAnalyzeSEO}
            isAnalyzingSEO={isAnalyzingSEO}
            seoAnalysis={seoAnalysis}
            setSeoAnalysis={setSeoAnalysis}
            handleExportSEO={handleExportSEO}
            applyBroadSEOChange={applyBroadSEOChange}
            handleApplySEOImprovement={handleApplySEOImprovement}
            handleAnalyzeTitles={handleAnalyzeTitles}
            isAnalyzingTitles={isAnalyzingTitles}
            titleAnalysis={titleAnalysis}
            previewThumbnail={previewThumbnail}
            setPreviewThumbnail={setPreviewThumbnail}
            thumbnailVariants={thumbnailVariants}
            setThumbnailVariants={setThumbnailVariants}
            previewBorderColor={previewBorderColor}
            setPreviewBorderColor={setPreviewBorderColor}
            previewChannelColor={previewChannelColor}
            setPreviewChannelColor={setPreviewChannelColor}
            handleDownloadPreview={handleDownloadPreview}
            handleGeneratePreviewThumbnail={handleGeneratePreviewThumbnail}
            isPreviewLoading={isPreviewLoading}
            downloadImage={downloadImage}
            handleForceRegenerateThumbnailStyle={handleForceRegenerateThumbnailStyle}
            customInstructions={customInstructions}
            isCustomInstructionsEnabled={isCustomInstructionsEnabled}
            scriptStructure={scriptStructure}
            generatedBlocks={generatedBlocks}
            renderIdeaBanner={renderIdeaBanner}
          />
        );

      case "Промтинг":
      case "Промпты":
        return (
          <PromptingTab
            scriptTopic={scriptTopic}
            nicheData={nicheData}
            selectedIdea={selectedIdea}
            promptImageStyle={promptImageStyle}
            promptAnimationType={promptAnimationType}
            promptMusicMood={promptMusicMood}
            generalAudioPrompt={generalAudioPrompt}
            scenePrompts={scenePrompts}
            handleClearPromptingData={handleClearPromptingData}
            isGeneratingGlobalProduction={isGeneratingGlobalProduction}
            handleGenerateGlobalProduction={handleGenerateGlobalProduction}
            generatedBlocks={generatedBlocks}
            setGeneratedBlocks={setGeneratedBlocks}
            annotatedScenes={annotatedScenes}
            toneOfVoice={toneOfVoice}
            promoImages={promoImages}
            isGeneratingPromoImages={isGeneratingPromoImages}
            handleGeneratePromoImages={handleGeneratePromoImages}
            handleGenerateDetailedScenePrompt={handleGenerateDetailedScenePrompt}
            isStylePinned={isStylePinned}
            setIsStylePinned={setIsStylePinned}
            pinnedStyles={pinnedStyles}
            setPinnedStyles={setPinnedStyles}
            setPromptImageStyle={setPromptImageStyle}
            setPromptAnimationType={setPromptAnimationType}
            setPromptMusicMood={setPromptMusicMood}
            setGeneralAudioPrompt={setGeneralAudioPrompt}
            musicContinuityEnabled={musicContinuityEnabled}
            setMusicContinuityEnabled={setMusicContinuityEnabled}
            veoSfxEnabled={veoSfxEnabled}
            setVeoSfxEnabled={setVeoSfxEnabled}
            scriptBreakdown={scriptBreakdown}
            scriptStructure={scriptStructure}
            selectedBlockIndex={selectedBlockIndex}
            setSelectedBlockIndex={setSelectedBlockIndex}
            setScenePrompts={setScenePrompts}
            transitionPrompts={transitionPrompts}
            setTransitionPrompts={setTransitionPrompts}
            generatingTransitions={generatingTransitions}
            handleGenerateTransitionPrompt={handleGenerateTransitionPrompt}
            handleUpdateSceneVisual={handleUpdateSceneVisual}
            handleExportBreakdown={handleExportBreakdown}
            handleRegenerateFullBreakdown={handleRegenerateFullBreakdown}
            isGeneratingBreakdown={isGeneratingBreakdown}
            handleAddNewScene={handleAddNewScene}
            handleRegenerateTechPlan={handleRegenerateTechPlan}
            isGeneratingBlock={isGeneratingBlock}
            selectedModel={selectedModel}
            setDetailedMusicModalBlockIndex={setDetailedMusicModalBlockIndex}
          />
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 space-y-4">
            <h3 className="text-xl font-bold text-white">Страница не найдена</h3>
            <button
              onClick={() => setActivePage("Ниша")}
              className="px-6 py-2 bg-primary text-black font-bold rounded-xl"
            >
              Перейти к нишам
            </button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-accent/30 selection:text-white">
      {/* Sidebar */}
      <Sidebar
        activeTab={activePage}
        setActiveTab={setActivePage}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
        onOpenInstructions={() => setShowCustomInstructionsModal(true)}
        onOpenLimits={() => setShowModelLimitsModal(true)}
      />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? "lg:pl-72" : ""}`}>
        <Header
          activeTab={activePage}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          activeModel={selectedModel}
          setActiveModel={setSelectedModel}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onOpenHistory={() => setIsHistoryModalOpen(true)}
          onOpenInstructions={() => setShowCustomInstructionsModal(true)}
          onOpenLimits={() => setShowModelLimitsModal(true)}
          user={user}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
          onSwitchAccount={handleSwitchAccount}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Modals & Popups */}
      <AppSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        user={user}
        handleSignIn={handleSignIn}
        handleSignOut={handleSignOut}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        models={MODELS}
        deepResearch={deepResearch}
        setDeepResearch={setDeepResearch}
        isCustomInstructionsEnabled={isCustomInstructionsEnabled}
        setShowCustomInstructionsModal={setShowCustomInstructionsModal}
        setShowModelLimitsModal={setShowModelLimitsModal}
        debugEnabled={debugEnabled}
        setDebugEnabled={setDebugEnabled}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        downloadPDF={() => downloadUserManualPDF()}
        downloadZIP={() => {
          if (nicheData) {
            const files = [
              { name: "niche-data.json", content: JSON.stringify(nicheData, null, 2) },
              { name: "script-blocks.json", content: JSON.stringify(generatedBlocks, null, 2) },
              { name: "seo-data.json", content: JSON.stringify(videoSEO || {}, null, 2) },
              { name: "script.txt", content: getFullScriptText(generatedBlocks) }
            ];
            exportToZip(files, `${selectedNiche || "project"}-export.zip`);
          } else {
            toast.error("Нет данных проекта для экспорта");
          }
        }}
        startTour={() => toast.info("Обучающий тур")}
        setShowFAQModal={setShowFAQModal}
      />

      {renderHistoryModal()}
      {renderQuickNoteModal()}
      {renderCustomIdeasModal()}
      {renderCustomInstructionsModal()}
      {renderModelLimitsModal()}
      {renderDeleteConfirmationModal()}
      {renderBrandingEditModal()}

      {/* Diff Modal */}
      {isDiffModalOpen && (
        <ScriptDiffModal
          isOpen={isDiffModalOpen}
          onClose={() => setIsDiffModalOpen(false)}
          initialVersionAId={diffVersionAId || undefined}
          initialVersionBId={diffVersionBId || undefined}
          versions={scriptVersions}
          currentBlocks={generatedBlocks}
          currentStructure={scriptStructure}
          currentTopic={scriptTopic}
          activeVersionId={activeVersionId}
          onLoadVersion={loadScriptVersion}
        />
      )}

      {/* Idea Snapshots Modal */}
      {isSnapshotsModalOpen && (
        <IdeaSnapshotsModal
          isOpen={isSnapshotsModalOpen}
          onClose={() => setIsSnapshotsModalOpen(false)}
          onApplySnapshot={handleApplySnapshot}
          currentNiche={selectedNiche}
          currentIdeas={nicheData?.ideas || []}
          currentTrendingIdeas={trendingIdeas || []}
          currentAssignments={ideaAssignments}
          currentTags={ideaTags}
          currentPlaylists={ideaPlaylists}
        />
      )}

      {/* Deep Analysis Modal */}
      {isDeepAnalysisOpen && (
        <IdeaDeepAnalysisModal
          isOpen={isDeepAnalysisOpen}
          onClose={() => setIsDeepAnalysisOpen(false)}
          ideaTitle={deepAnalysisTitle}
          niche={deepAnalysisNiche}
          analysis={deepAnalysisData}
          isLoading={isDeepAnalysisLoading}
          onReanalyze={() => handleTriggerDeepAnalysis(deepAnalysisTitle, deepAnalysisNiche)}
        />
      )}

      {/* Block History Modal */}
      {blockHistoryModalIndex !== null && (
        <BlockHistoryModal
          isOpen={blockHistoryModalIndex !== null}
          onClose={() => setBlockHistoryModalIndex(null)}
          blockIndex={blockHistoryModalIndex}
          blockTitle={scriptStructure[blockHistoryModalIndex]?.title || `Блок ${blockHistoryModalIndex + 1}`}
          currentText={generatedBlocks[blockHistoryModalIndex]?.text || ""}
          iterations={blockHistory[blockHistoryModalIndex] || []}
          onRestoreIteration={(iteration) => {
            setGeneratedBlocks((prev: any) => ({
              ...prev,
              [blockHistoryModalIndex]: {
                ...(prev[blockHistoryModalIndex] || {}),
                text: iteration.text,
              }
            }));
            toast.success("Версия блока восстановлена");
            setBlockHistoryModalIndex(null);
          }}
          onDeleteIteration={(iterationId) => {
            setBlockHistory((prev) => ({
              ...prev,
              [blockHistoryModalIndex]: (prev[blockHistoryModalIndex] || []).filter(it => it.id !== iterationId)
            }));
          }}
          onClearAllIterations={() => {
            setBlockHistory((prev) => ({
              ...prev,
              [blockHistoryModalIndex]: []
            }));
          }}
        />
      )}

      {/* Detailed Music Prompt Builder Modal */}
      {detailedMusicModalBlockIndex !== null && (
        <DetailedMusicPromptBuilderModal
          isOpen={detailedMusicModalBlockIndex !== null}
          onClose={() => setDetailedMusicModalBlockIndex(null)}
          blockIndex={detailedMusicModalBlockIndex}
          blockTitle={scriptStructure[detailedMusicModalBlockIndex]?.title || `Блок ${detailedMusicModalBlockIndex + 1}`}
          blockText={generatedBlocks[detailedMusicModalBlockIndex]?.text || ""}
          scriptTopic={scriptTopic}
          initialPrompt={generatedBlocks[detailedMusicModalBlockIndex]?.musicPrompt || ""}
          selectedModel={selectedModel}
          onApplyPrompt={(idx, promptText) => {
            setGeneratedBlocks((prev: any) => ({
              ...prev,
              [idx]: {
                ...(prev[idx] || {}),
                musicPrompt: promptText,
              }
            }));
            toast.success("Музыкальный промт сохранен");
            setDetailedMusicModalBlockIndex(null);
          }}
        />
      )}

      {/* FAQ Modal */}
      {showFAQModal && (
        <FAQModal
          isOpen={showFAQModal}
          onClose={() => setShowFAQModal(false)}
        />
      )}
    </div>
  );
}
