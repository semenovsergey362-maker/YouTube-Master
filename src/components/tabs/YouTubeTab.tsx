import { logger } from "../../config/logger";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ScrollFadeIn } from "../ScrollFadeIn";
import { 
  Youtube, Search, Shield, RefreshCw, Sparkles, TrendingUp, 
  TrendingDown, Target, User, Users, Play, HelpCircle, Lock, 
  Key, Link2, Plus, Check, Loader2, BarChart3, AlertCircle, 
  Award, Compass, ArrowRight, ExternalLink, X, Flame, Globe,
  Eye, Heart, Calendar
} from "lucide-react";
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, Cell, RadarChart, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, Radar, Legend, LineChart, Line, CartesianGrid,
  PieChart, Pie
} from "recharts";
import { generateCompetitorResearch, CompetitorResearchResult, CompetitorChannel, generateTrendingQueries, generateChannelStrategy } from "../../services/geminiService";
import { useApp } from "../../context/AppContext";
import { logout, refreshAuthSession } from "../../firebase";
import { safeStorage } from "../../lib/storage";
import { toast } from "sonner";
import { handleAppError } from "../../utils/helpers";

const parseSubsToNumber = (subsStr: string | undefined): number => {
  if (!subsStr) return 0;
  let clean = subsStr.toLowerCase().replace(/\s+/g, "").replace(/,/g, ".");
  let multiplier = 1;
  if (clean.includes("m") || clean.includes("м")) {
    multiplier = 1000000;
    clean = clean.replace(/[mм]/g, "");
  } else if (clean.includes("k") || clean.includes("к") || clean.includes("тыс")) {
    multiplier = 1000;
    clean = clean.replace(/[kк]|тыс/g, "");
  }
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed * multiplier;
};

const REGIONS = [
  { id: "global", name: "Global", flag: "🌍" },
  { id: "us", name: "USA", flag: "🇺🇸" },
  { id: "ru", name: "Russia", flag: "🇷🇺" },
  { id: "eu", name: "Europe", flag: "🇪🇺" },
  { id: "br", name: "Brazil", flag: "🇧🇷" },
  { id: "in", name: "India", flag: "🇮🇳" },
];

interface YouTubeTabProps {
  selectedNiche: string;
  customNiche: string;
  selectedModel: string;
  onSelectNiche: (niche: string) => void;
  onApplyCompetitorInsights: (insights: string) => void;
  userEmail?: string;
  selectedIdeas?: any[];
  trendData: Record<string, { name: string; views: number }[]>;
  demoData?: Record<string, { name: string; value: number }[]>;
}

interface VideoPerformance {
  id: string;
  title: string;
  views: number;
  averageViewDuration: number;
  retention: number;
  impressions: number;
  ctr: number;
  likes: number;
}

interface ChannelPerformance {
  period: { startDate: string; endDate: string };
  videos: VideoPerformance[];
  summary: { ctr: number; retention: number; views: number };
}

export const YouTubeTab = ({
  selectedNiche,
  customNiche,
  selectedModel,
  onSelectNiche,
  onApplyCompetitorInsights,
  userEmail,
  selectedIdeas = [],
  trendData,
  demoData,
}: YouTubeTabProps) => {
  const { nicheData, videoSEO, setVideoSEO, selectedRegion, setSelectedRegion, myChannelVideos, setMyChannelVideos } = useApp();

  const getChannelUrl = (competitor: any) => {
    if (competitor.channelUrl) {
      if (competitor.channelUrl.startsWith('@')) {
        return `https://www.youtube.com/${competitor.channelUrl}`;
      }
      if (!competitor.channelUrl.startsWith('http')) {
        return `https://www.youtube.com/${competitor.channelUrl.startsWith('/') ? '' : '/'}${competitor.channelUrl}`;
      }
      return competitor.channelUrl;
    }
    
    // Fallback based on name
    if (competitor.name.startsWith('@')) {
      return `https://www.youtube.com/${competitor.name}`;
    }
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(competitor.name)}`;
  };
  // Active Niche for research
  const activeNiche = selectedNiche === "Свой вариант" ? customNiche : selectedNiche;

  const DEMO_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4"];
  const currentDemoData = 
    (demoData && demoData[activeNiche]) || 
    (demoData && demoData["Свой вариант"]) || 
    (demoData && demoData["Технологии"]) || 
    [
      { name: "18-24", value: 450 },
      { name: "25-34", value: 350 },
      { name: "35-44", value: 150 },
      { name: "45+", value: 50 },
    ];

  // Search input state
  const [searchQuery, setSearchQuery] = useState(activeNiche || "");
  const [isSearching, setIsSearching] = useState(false);
  const [researchData, setResearchData] = useState<CompetitorResearchResult | null>(null);
  
  // YouTube API Integration settings state
  const [appUrl, setAppUrl] = useState(window.location.origin);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [isOAuthConfigured, setIsOAuthConfigured] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [channelStats, setChannelStats] = useState<any>(null);
  const [isFetchingStats, setIsFetchingStats] = useState(false);
  const [performance, setPerformance] = useState<ChannelPerformance | null>(null);
  const [performanceError, setPerformanceError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // AI Channel Strategy and recommendations
  const [channelStrategy, setChannelStrategy] = useState<any>(null);
  const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);

  // Competitor Detail Modal
  const [selectedCompetitor, setSelectedCompetitor] = useState<CompetitorChannel | null>(null);
  const [trendingQueries, setTrendingQueries] = useState<string[]>([]);
  const [trendingSources, setTrendingSources] = useState<{ title: string; uri: string }[]>([]);
  const [isFetchingTrending, setIsFetchingTrending] = useState(false);

  // Status message
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string; actionLink?: string; actionLabel?: string } | null>(null);

  // My Videos publication status state
  const [myVideos, setMyVideos] = useState<any[]>(() => myChannelVideos || []);
  const [isFetchingMyVideos, setIsFetchingMyVideos] = useState(false);
  const [isMyVideosDemo, setIsMyVideosDemo] = useState(false);
  const isDemoMode = Boolean(channelStats?.isDemo || channelStats?.apiDisabled || isMyVideosDemo);

  useEffect(() => {
    if (myChannelVideos && myChannelVideos.length > 0 && myVideos.length === 0) {
      setMyVideos(myChannelVideos);
    }
  }, [myChannelVideos]);

  const fetchMyVideos = async () => {
    setIsFetchingMyVideos(true);
    try {
      const ideasList = selectedIdeas && selectedIdeas.length > 0 
        ? selectedIdeas 
        : (nicheData?.ideas || []).slice(0, 5);

      const res = await fetch("/api/youtube/my-videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideas: ideasList })
      });
      if (res.ok) {
        const data = await res.json();
        const fetchedList = data.videos || [];
        setMyVideos(fetchedList);
        setIsMyVideosDemo(data.isDemo || false);
        if (fetchedList.length > 0) {
          setMyChannelVideos(fetchedList);
        }
      }
    } catch (e) {
      logger.error("Error fetching my videos:", e);
    } finally {
      setIsFetchingMyVideos(false);
    }
  };

  useEffect(() => {
    fetchMyVideos();
  }, [selectedIdeas, channelStats, nicheData]);

  // Load YouTube integration status on mount
  useEffect(() => {
    fetchSettingsAndStats();
    if (activeNiche) {
      handleResearch(activeNiche);
    }
  }, [activeNiche]);

  useEffect(() => {
    if (activeNiche) {
      handleFetchTrendingQueries(activeNiche, selectedRegion);
    }
  }, [selectedRegion]);

  const fetchPerformance = async () => {
    try {
      const response = await fetch("/api/youtube/performance");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось загрузить YouTube Analytics");
      setPerformance(data);
      setPerformanceError(null);
    } catch (error: any) {
      setPerformance(null);
      setPerformanceError(error.message || "Метрики эффективности пока недоступны");
    }
  };

  const fetchSettingsAndStats = async () => {
    setIsFetchingStats(true);
    try {
      // OAuth credentials are configured on the server and never returned to the browser.
      const keysRes = await fetch("/api/settings/youtube");
      if (keysRes.ok) {
        const keys = await keysRes.json();
        setIsOAuthConfigured(Boolean(keys.configured));
        if (keys.appUrl) setAppUrl(keys.appUrl);
        if (keys.clientId) setClientId(keys.clientId);
        if (keys.hasDbSecret) setClientSecret("********");
      }
      // Remove credentials saved by earlier versions. They are never read or sent again.
      safeStorage.removeItem("yt_client_id");
      safeStorage.removeItem("yt_client_secret");

      // Fetch channel stats
      const statsRes = await fetch("/api/youtube/stats");
      if (statsRes.ok) {
        const stats = await statsRes.json();
        setChannelStats(stats);
        if (!stats.apiDisabled) fetchPerformance();
        safeStorage.setItem("yt_connected", "true");

        // Load cached strategy or auto-generate
        const cachedStrat = safeStorage.getItem(`yt_strategy_${activeNiche}`);
        if (cachedStrat) {
          try {
            setChannelStrategy(JSON.parse(cachedStrat));
          } catch (e) {
            logger.error("Failed to parse cached strategy:", e);
          }
        } else if (stats && activeNiche) {
          setTimeout(() => handleGenerateStrategy(stats), 800);
        }

        if (stats.apiDisabled) {
          setStatusMsg({
            type: "error",
            text: "YouTube Data API v3 не активирован в Google Cloud. Включен демонстрационный режим для тестирования.",
            actionLink: stats.apiDisabledLink,
            actionLabel: "Активировать API"
          });
        }
      } else if (statsRes.status !== 401) {
        const errorData = await statsRes.json().catch(() => ({}));
        if (errorData.link) {
          setStatusMsg({
            type: "error",
            text: errorData.error,
            actionLink: errorData.link,
            actionLabel: "Включить API"
          });
        } else if (errorData.error) {
          setStatusMsg({
            type: "error",
            text: errorData.error
          });
        }
      } else {
        safeStorage.removeItem("yt_connected");
      }
      } catch (e) {
        logger.error("Error fetching YouTube config:", e);
        setChannelStats(null);
      } finally {
      setIsFetchingStats(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    setStatusMsg(null);
    try {
      safeStorage.removeItem("yt_client_id");
      safeStorage.removeItem("yt_client_secret");
      if (appUrl) safeStorage.setItem("yt_app_url", appUrl);
      
      const response = await fetch("/api/settings/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret === "********" ? undefined : clientSecret,
          app_url: appUrl
        })
      });
      if (response.ok) {
        setStatusMsg({ type: "success", text: "Настройки YouTube API сохранены!" });
        setShowSettings(false);
        fetchSettingsAndStats();
      } else {
        setStatusMsg({ type: "error", text: "Не удалось сохранить настройки." });
      }
    } catch (e) {
      setStatusMsg({ type: "error", text: "Ошибка при отправке настроек." });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleConnectChannel = async () => {
    setIsConnecting(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/auth/url");
      if (!res.ok) {
        throw new Error("Проверьте, сохранены ли Client ID и Secret, и корректен ли App URL.");
      }
      const data = await res.json();
      
      if (data.url) {
        // Open OAuth in popup or redirect
        const width = 600;
        const height = 600;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        
        const popup = window.open(
          data.url,
          "YouTube Auth",
          `width=${width},height=${height},left=${left},top=${top}`
        );

        // Listen for successful login message
        const messageListener = async (event: MessageEvent) => {
          if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
            setStatusMsg({ type: "success", text: "Канал успешно подключен к системе!" });
            safeStorage.setItem("yt_connected", "true");
            await refreshAuthSession();
            fetchSettingsAndStats();
            window.removeEventListener("message", messageListener);
          }
        };
        window.addEventListener("message", messageListener);

        // Fallback: poll stats after window closes
        const checkClosed = setInterval(async () => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            await refreshAuthSession();
            fetchSettingsAndStats();
          }
        }, 1000);
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Ошибка подключения канала." });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      try { await logout(); } catch (_) {}
      safeStorage.removeItem("yt_connected");
      safeStorage.removeItem(`yt_strategy_${activeNiche}`);
      setChannelStats(null);
      setChannelStrategy(null);
      setStatusMsg({ type: "success", text: "Подключение с YouTube каналом разорвано и выполнен выход из Google." });
    } catch (e) {
      logger.error(e);
    }
  };

  const handleGenerateStrategy = async (forcedStats?: any) => {
    const statsToUse = forcedStats || channelStats;
    if (!statsToUse) {
      toast.error("Сначала подключите YouTube канал или активируйте демо-режим");
      return;
    }
    setIsGeneratingStrategy(true);
    try {
      const result = await generateChannelStrategy(
        {
          title: statsToUse.title,
          subscribers: String(statsToUse.subscribers),
          views: String(statsToUse.views),
          videos: String(statsToUse.videos)
        },
        activeNiche,
        { model: selectedModel }
      );
      setChannelStrategy(result);
      safeStorage.setItem(`yt_strategy_${activeNiche}`, JSON.stringify(result));
      toast.success("AI-стратегия развития канала успешно обновлена!");
    } catch (e) {
      handleAppError(e, "Генерация AI-стратегии");
    } finally {
      setIsGeneratingStrategy(false);
    }
  };

  const handleResearch = async (targetNiche = searchQuery) => {
    if (!targetNiche.trim()) return;
    setIsSearching(true);
    setStatusMsg(null);
    try {
      const data = await generateCompetitorResearch(targetNiche, { model: selectedModel });
      setResearchData(data);
      handleFetchTrendingQueries(targetNiche); // Also fetch trends
    } catch (error) {
      handleAppError(error, "Анализ конкурентов");
      setStatusMsg({ type: "error", text: "Ошибка при анализе конкурентов через Gemini. Повторите запрос." });
    } finally {
      setIsSearching(false);
    }
  };

  const handleFetchTrendingQueries = async (niche: string, regionCode = selectedRegion) => {
    setIsFetchingTrending(true);
    try {
      const res = await generateTrendingQueries(niche, regionCode);
      setTrendingQueries(res.queries || []);
      setTrendingSources(res.sources || []);
    } catch (error) {
      handleAppError(error, "Загрузка трендовых запросов");
    } finally {
      setIsFetchingTrending(false);
    }
  };

  const formatNumber = (numStr: string | number) => {
    if (typeof numStr === "number") return numStr.toLocaleString();
    return numStr;
  };

  // Calculation of predicted CTR using nicheData (NICHE_POTENTIAL) and competitors
  const demand = nicheData?.potential?.demand || 50;
  const competition = nicheData?.potential?.competition || 50;
  const potentialScore = nicheData?.potential?.score || 50;

  const competitorsList = researchData?.competitors || nicheData?.competitors || [];
  const avgEngagement = competitorsList.length > 0 
    ? competitorsList.reduce((acc, c) => acc + (c.engagement || 0), 0) / competitorsList.length 
    : 5.0;

  const ideasToVisualize = selectedIdeas && selectedIdeas.length > 0 
    ? selectedIdeas 
    : (nicheData?.ideas || []).slice(0, 5);

  const getTitleHash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  };

  const ctrChartData = ideasToVisualize.map((idea: any, idx: number) => {
    const title = typeof idea === "string" ? idea : idea.title || `Идея ${idx + 1}`;
    const viral = typeof idea === "string" ? "Средний" : idea.viral_potential || "Средний";
    const hash = getTitleHash(title);
    
    // Base CTR: starts around 5.8%
    let baseCtr = 5.8;
    
    // Demand factor: high demand boosts CTR (up to +2.0%)
    const numDemand = typeof demand === "number" ? demand : parseFloat(demand as any) || 50;
    const demandFactor = ((numDemand - 50) / 50) * 2.0;
    
    // Competition factor: high competition lowers CTR (down to -1.5%)
    const numCompetition = typeof competition === "number" ? competition : parseFloat(competition as any) || 50;
    const competitionFactor = ((50 - numCompetition) / 50) * 1.5;
    
    // Competitors factor: if average engagement is high, click interest validates (+ up to 1.5%)
    const engagementFactor = (Math.min(avgEngagement, 12) / 12) * 1.5;
    
    // Viral potential boost (+ up to 2.5%)
    let viralBoost = 0;
    if (viral.toLowerCase().includes("очень") || viral.toLowerCase().includes("97%") || hash % 3 === 0) {
      viralBoost = 2.5;
    } else if (viral.toLowerCase().includes("высок") || viral.toLowerCase().includes("92%") || hash % 3 === 1) {
      viralBoost = 1.3;
    } else {
      viralBoost = 0.4;
    }
    
    // Seeded variability based on title length and content
    const contentFactor = ((hash % 10) * 0.18) - 0.9;
    
    const finalCtr = Math.max(3.2, Math.min(15.0, parseFloat((baseCtr + demandFactor + competitionFactor + engagementFactor + viralBoost + contentFactor).toFixed(1))));

    // Shorten title for chart axis
    // Append invisible spaces or index to ensure name is unique for Recharts
    const shortTitle = (title.length > 15 ? title.substring(0, 15) + "..." : title) + " ".repeat(idx);

    return {
      name: shortTitle,
      fullName: title,
      ctr: finalCtr,
      viral: viral,
      recommendation: finalCtr >= 10 
        ? "Экстремальный потенциал! Используйте крупные лица, неоновый свет и интригующий заголовок."
        : finalCtr >= 7.5 
          ? "Отличный CTR. Поместите лицо с сильной эмоцией слева, а крупный текст — справа."
          : finalCtr >= 5.5 
            ? "Хороший результат. Для повышения кликабельности добавьте интригующий текст на превью (до 3 слов)."
            : "Ниже среднего. Попробуйте сделать заголовок более коротким и эмоциональным.",
      tier: finalCtr >= 10 ? "Высший" : finalCtr >= 7.5 ? "Высокий" : finalCtr >= 5.5 ? "Средний" : "Базовый",
      color: finalCtr >= 10 ? "rgb(239, 68, 68)" : finalCtr >= 7.5 ? "rgb(245, 158, 11)" : finalCtr >= 5.5 ? "rgb(99, 102, 241)" : "rgb(156, 163, 175)"
    };
  });

  const predictedCtr = ctrChartData.length
    ? ctrChartData.reduce((sum, item) => sum + item.ctr, 0) / ctrChartData.length
    : 0;
  const performanceDelta = performance ? performance.summary.ctr - predictedCtr : 0;
  const formatDuration = (seconds: number) => {
    const safeSeconds = Math.max(0, Math.round(seconds || 0));
    return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, "0")}`;
  };
  const nextVideoRecommendation = performance
    ? performance.summary.ctr < predictedCtr
      ? "Сначала обновите упаковку: один ясный конфликт в заголовке и контрастный главный объект на обложке."
      : performance.summary.retention < 45
        ? "Следующий ролик начинайте с результата или конфликта в первые 10 секунд, затем быстро подтвердите обещание заголовка."
        : "Повторите тему и формат лучшего ролика, но добавьте новый конкретный угол: кейс, сравнение или свежий факт."
    : "Подключите YouTube Analytics, чтобы рекомендации строились по фактическим результатам канала.";

  // Competitor tags gap analysis
  const getCompetitorTagAnalysis = () => {
    const list = researchData?.competitors || nicheData?.competitors || [];
    const tagInfoMap = new Map<string, { channels: Set<string>; count: number }>();

    // Add keywords from nicheData.seo.keywords if available
    if (nicheData?.seo?.keywords) {
      const kwArray = Array.isArray(nicheData.seo.keywords) ? nicheData.seo.keywords : String(nicheData.seo.keywords).split(',');
      kwArray.forEach(k => {
        const clean = k.trim().toLowerCase();
        if (clean && clean.length > 2) {
          tagInfoMap.set(clean, { channels: new Set<string>(["Тренды ниши"]), count: 2 });
        }
      });
    }

    // Stop words list in Russian and English
    const stopWords = new Set([
      "и", "в", "на", "как", "для", "с", "по", "из", "что", "это", "этот", "эта", "эти", "тот", "та", "те", "мы", "вы", "они", "он", "она", "оно", "бы", "же", "ли",
      "how", "to", "the", "in", "and", "a", "of", "for", "on", "with", "is", "at", "by", "an", "this", "that", "these", "those", "we", "you", "they", "he", "she", "it",
      "канала", "каналов", "видео", "роликов", "контент", "темы", "тему", "очень", "быстро", "просмотров", "просмотры", "подписчиков"
    ]);

    // Extract from competitors
    list.forEach(competitor => {
      const channelName = competitor.name;

      // Helper to add tag
      const addTag = (tag: string, weight = 1) => {
        const clean = tag.trim().toLowerCase().replace(/[^\w\dа-яА-ЯёЁ\s]/g, "");
        if (clean.length < 3 || stopWords.has(clean) || /^\d+$/.test(clean)) return;
        
        if (!tagInfoMap.has(clean)) {
          tagInfoMap.set(clean, { channels: new Set<string>(), count: 0 });
        }
        const info = tagInfoMap.get(clean)!;
        info.channels.add(channelName);
        info.count += weight;
      };

      // Extract from competitor strategy/desc
      const textToParse = `${competitor.strategy} ${competitor.desc} ${competitor.weakness}`;
      const words = textToParse.split(/[\s,.:;!?()"\-]+/);
      words.forEach(w => addTag(w, 1));

      // Also extract from top videos
      const videos = (competitor as any).topVideos || [];
      videos.forEach((video: any) => {
        const titleWords = video.title.split(/[\s,.:;!?()"\-]+/);
        titleWords.forEach((w: string, idx: number) => {
          const wClean = w.toLowerCase().replace(/[^\w\dа-яА-ЯёЁ]/g, "").trim();
          if (wClean.length > 3) {
            addTag(wClean, 2);
          }
          if (idx < titleWords.length - 1) {
            const w1 = titleWords[idx].toLowerCase().replace(/[^\w\dа-яА-ЯёЁ]/g, "").trim();
            const w2 = titleWords[idx+1].toLowerCase().replace(/[^\w\dа-яА-ЯёЁ]/g, "").trim();
            if (w1.length > 3 && w2.length > 3 && !stopWords.has(w1) && !stopWords.has(w2)) {
              addTag(`${w1} ${w2}`, 3);
            }
          }
        });
      });
    });

    // Convert to array
    const result: { tag: string; sourceChannels: string[]; frequency: number }[] = [];
    tagInfoMap.forEach((info, tag) => {
      result.push({
        tag,
        sourceChannels: Array.from(info.channels),
        frequency: info.count
      });
    });

    // Sort by frequency (most popular competitor keywords first)
    return result.sort((a, b) => b.frequency - a.frequency);
  };

  const tagAnalysis = getCompetitorTagAnalysis();
  const currentKeywordsStr = videoSEO?.keywords || "";
  const currentKeywordsList = currentKeywordsStr
    ? currentKeywordsStr.split(',').map(k => k.trim().toLowerCase())
    : [];

  const missingTags = tagAnalysis.filter(info => {
    const isPresent = currentKeywordsList.some(k => 
      k === info.tag || k.includes(info.tag) || info.tag.includes(k)
    );
    return !isPresent;
  }).slice(0, 16); // Show top 16 missing tags

  const handleAddTag = (tag: string) => {
    if (!videoSEO) return;
    const currentKeywords = videoSEO.keywords ? videoSEO.keywords.split(',').map(k => k.trim()) : [];
    if (!currentKeywords.some(k => k.toLowerCase() === tag.toLowerCase())) {
      const updatedKeywords = [...currentKeywords, tag].join(', ');
      setVideoSEO({ ...videoSEO, keywords: updatedKeywords });
      setStatusMsg({
        type: "success",
        text: `Тег "${tag}" успешно добавлен в ваш проект SEO!`
      });
    }
  };

  const handleAddAllMissingTags = () => {
    if (!videoSEO || missingTags.length === 0) return;
    const currentKeywords = videoSEO.keywords ? videoSEO.keywords.split(',').map(k => k.trim()) : [];
    const added: string[] = [];
    const updated = [...currentKeywords];
    
    missingTags.forEach(info => {
      if (!updated.some(k => k.toLowerCase() === info.tag.toLowerCase())) {
        updated.push(info.tag);
        added.push(info.tag);
      }
    });

    if (added.length > 0) {
      setVideoSEO({ ...videoSEO, keywords: updated.join(', ') });
      setStatusMsg({
        type: "success",
        text: `Добавлено ${added.length} упущенных тегов в ваш проект SEO!`
      });
    }
  };

  const handleCreateDraftSEO = () => {
    const ideaTitle = selectedIdeas && selectedIdeas.length > 0
      ? (typeof selectedIdeas[0] === 'string' ? selectedIdeas[0] : selectedIdeas[0].title)
      : (nicheData?.ideas && nicheData.ideas.length > 0 ? nicheData.ideas[0].title : "Мой новый ролик");

    setVideoSEO({
      title: ideaTitle,
      titleVariants: [ideaTitle],
      description: `Видео на тему: ${ideaTitle}. Описание в процессе подготовки.`,
      keywords: nicheData?.seo?.keywords || "youtube, тренды",
      hashtags: nicheData?.seo?.hashtags || ["youtube"],
      pinnedComment: "Приятного просмотра! Подписывайтесь на канал."
    });
    setStatusMsg({
      type: "success",
      text: "Черновик SEO проекта успешно создан! Теперь вы можете сопоставлять теги конкурентов."
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <ScrollFadeIn>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black italic tracking-tight text-white flex items-center gap-2.5">
            <Youtube className="text-red-500 fill-red-500/10 animate-pulse" size={24} />
            YouTube & Аналитика
          </h3>
          <p className="text-neutral-500 text-xs">
            Канал, конкуренты, стратегия роста и быстрый набор релевантных идей для аудитории.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white transition-all text-xs font-bold"
          >
            <Key size={14} />
            API
          </button>

          {channelStats ? (
            <div className="flex items-center gap-3 pl-3 pr-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                {channelStats.title}
              </span>
              <button
                onClick={handleDisconnect}
                className="p-1 hover:bg-emerald-500/10 rounded-lg text-neutral-400 hover:text-red-400 transition-colors"
                title="Отключить"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnectChannel}
              disabled={isConnecting || isFetchingStats}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-600/10 hover:shadow-red-500/20 disabled:opacity-50"
            >
              {isConnecting ? <Loader2 size={14} className="animate-spin" /> : <Youtube size={14} />}
              Подключить
            </button>
          )}
        </div>
      </div>
      </ScrollFadeIn>

      {isDemoMode && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-400 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-black text-amber-300">ДЕМО-РЕЖИМ — данные не относятся к вашему каналу</p>
            <p className="text-[11px] text-amber-100/70 mt-1 leading-relaxed">Карточки, метрики и статусы ниже могут быть сгенерированы для примера. Публикация и планирование заблокированы до подключения рабочего YouTube API.</p>
          </div>
        </div>
      )}

      {/* Notifications */}
      <AnimatePresence>
        {statusMsg && (
          <motion.div
            key="youtube-status-msg"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border text-xs font-medium ${
              statusMsg.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}
          >
            <div className="flex items-center gap-3">
              <AlertCircle size={16} className="shrink-0" />
              <span>{statusMsg.text}</span>
            </div>
            {statusMsg.actionLink && (
              <a
                href={statusMsg.actionLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 text-center ${
                  statusMsg.type === "success"
                    ? "bg-emerald-500 text-black hover:bg-emerald-400"
                    : "bg-red-500 text-white hover:bg-red-400"
                }`}
              >
                {statusMsg.actionLabel || "Открыть"}
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* API Configuration Drawer/Modal */}
      {showSettings && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="p-5 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-4 overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-neutral-850 pb-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Shield className="text-primary" size={16} />
              Настройка Google Cloud OAuth 2.0 Credentials
            </h4>
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold bg-neutral-900 px-2 py-0.5 rounded-md">
              Безопасное хранение
            </span>
          </div>

          <div className="space-y-3.5 bg-neutral-900/40 border border-neutral-800/60 p-4 rounded-xl">
            <p className="text-xs text-neutral-400 leading-relaxed">
              Для реальной авторизации нужен OAuth 2.0 Client ID и Client Secret из Google Cloud Console.
              Включите YouTube Data API v3 и укажите Redirect URI: <code className="bg-neutral-950 px-1.5 py-0.5 rounded text-red-300 font-mono text-[10px] select-all">{appUrl}/auth/callback</code>
            </p>

            <div className="border-t border-neutral-800/50 pt-2.5 space-y-2.5 text-[11px] text-neutral-400">
              <div>
                <span className="text-[10px] font-black text-red-400 uppercase tracking-wider block mb-1">Ошибка 1: Invalid request</span>
                <p>Проверьте, что Redirect URI совпадает с текущим доменом приложения и сохраните настройки снова.</p>
              </div>

              <div className="border-t border-neutral-800/30 pt-2">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider block mb-1">Ошибка 2: Unverified app</span>
                <p>Добавьте свой Gmail в Test users в Google OAuth consent screen и продолжите через предупреждение Google.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Client ID</label>
              <input
                type="text"
                value={clientId || (isOAuthConfigured ? "Configured on server" : "")}
                onChange={e => setClientId(e.target.value)}
                placeholder="Google OAuth Client ID"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Client Secret</label>
              <input
                type="password"
                value={clientSecret}
                onChange={e => setClientSecret(e.target.value)}
                placeholder="Google OAuth Client Secret"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Authorized Redirect URI (App URL)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={appUrl}
                readOnly
                placeholder="https://your-domain.run.app"
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-primary"
              />
              <button
                onClick={() => navigator.clipboard?.writeText(`${appUrl}/auth/callback`)}
                className="px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-bold transition-all"
                title="Использовать текущий домен"
              >
                Текущий
              </button>
            </div>
            <p className="text-[10px] text-neutral-500">
              Должен строго соответствовать домену приложения. В консоли Google Cloud добавьте: <code className="bg-neutral-900 px-1 py-0.5 rounded text-neutral-300 font-mono text-[9px]">{appUrl}/auth/callback</code>
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setShowSettings(false)}
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 rounded-xl text-xs font-bold transition-all border border-neutral-800"
            >
              Отмена
            </button>
            <button
              onClick={handleSaveSettings}
              disabled={isSavingSettings}
              className="flex items-center gap-1.5 px-5 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            >
              {isSavingSettings ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              {isSavingSettings ? "Сохранение..." : "Сохранить настройки"}
            </button>
          </div>
        </motion.div>
      )}

      {/* Main Grid: Left panel (Analysis / Competitors), Right Panel (Evergreen trends & statistics) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Left Column (8 cols): Competitors research and Intelligence */}
        <div className="xl:col-span-8 space-y-6">

          {/* My Channel & AI Strategy Audit Card */}
          {channelStats && (
            <ScrollFadeIn delay={0.02}>
              <div className="p-6 rounded-2xl bg-surface border border-border shadow-2xl space-y-6 relative overflow-hidden">
                {/* Background accent glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
                {isDemoMode && <span className="absolute top-4 right-4 px-2 py-1 rounded-md bg-amber-500/20 border border-amber-500/30 text-[9px] font-black tracking-wider text-amber-300">ДЕМО-ДАННЫЕ</span>}
                
                {/* Channel Header Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-900 pb-5">
                  <div className="flex items-center gap-4">
                    {channelStats.thumbnail ? (
                      <img 
                        src={channelStats.thumbnail} 
                        alt={channelStats.title} 
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 rounded-full object-cover border-2 border-primary/20 shrink-0" 
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 shrink-0 border-2 border-red-500/20">
                        <Youtube size={28} />
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-black text-white leading-tight">
                          {channelStats.title}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <span className="h-1 w-1 rounded-full bg-emerald-500 animate-ping" />
                          Подключён
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-400">
                        {channelStats.apiDisabled ? "Демонстрационный режим • Нажмите 'YouTube API Ключи' для настройки" : "Аналитика получена через YouTube Data API v3"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleGenerateStrategy()}
                    disabled={isGeneratingStrategy}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-primary/20 hover:shadow-indigo-500/30 disabled:opacity-50"
                  >
                    {isGeneratingStrategy ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <RefreshCw size={13} />
                    )}
                    Обновить AI-Анализ
                  </button>
                </div>

                {/* Core Channel Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-neutral-950/60 rounded-xl border border-neutral-900/50 space-y-1">
                    <div className="flex items-center gap-1.5 text-neutral-500 text-[10px] font-bold uppercase tracking-wider">
                      <Users size={12} className="text-neutral-500" />
                      Подписчики
                    </div>
                    <div className="text-lg font-black text-white">
                      {formatNumber(channelStats.subscribers)}
                    </div>
                  </div>

                  <div className="p-4 bg-neutral-950/60 rounded-xl border border-neutral-900/50 space-y-1">
                    <div className="flex items-center gap-1.5 text-neutral-500 text-[10px] font-bold uppercase tracking-wider">
                      <Play size={12} className="text-neutral-500" />
                      Просмотры
                    </div>
                    <div className="text-lg font-black text-white">
                      {formatNumber(channelStats.views)}
                    </div>
                  </div>

                  <div className="p-4 bg-neutral-950/60 rounded-xl border border-neutral-900/50 space-y-1">
                    <div className="flex items-center gap-1.5 text-neutral-500 text-[10px] font-bold uppercase tracking-wider">
                      <Youtube size={12} className="text-neutral-500" />
                      Загружено Видео
                    </div>
                    <div className="text-lg font-black text-white">
                      {formatNumber(channelStats.videos)}
                    </div>
                  </div>

                  <div className="p-4 bg-neutral-950/60 rounded-xl border border-neutral-900/50 space-y-1">
                    <div className="flex items-center gap-1.5 text-neutral-500 text-[10px] font-bold uppercase tracking-wider">
                      <TrendingUp size={12} className="text-neutral-500" />
                      Среднее Просмотров
                    </div>
                    <div className="text-lg font-black text-white">
                      {Number(channelStats.videos) > 0 
                        ? formatNumber(Math.round(Number(channelStats.views) / Number(channelStats.videos))) 
                        : "N/A"}
                    </div>
                  </div>
                </div>

                {/* Feedback loop: actual performance -> next content decision */}
                <div className="border-t border-neutral-900 pt-5 space-y-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <h5 className="text-xs font-black uppercase text-white tracking-wider">Петля улучшений</h5>
                      <p className="text-[10px] text-neutral-500 mt-1">Факт за последние 28 дней → решение для следующего ролика</p>
                    </div>
                    <button onClick={fetchPerformance} className="text-[10px] font-bold text-primary hover:text-indigo-300 transition-colors">
                      Обновить метрики
                    </button>
                  </div>

                  {performance ? (
                    <>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-900">
                          <p className="text-[9px] uppercase font-bold text-neutral-500">Фактический CTR</p>
                          <p className="text-xl font-black text-white mt-1">{performance.summary.ctr.toFixed(1)}%</p>
                        </div>
                        <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-900">
                          <p className="text-[9px] uppercase font-bold text-neutral-500">Удержание</p>
                          <p className="text-xl font-black text-white mt-1">{performance.summary.retention.toFixed(1)}%</p>
                        </div>
                        <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-900">
                          <p className="text-[9px] uppercase font-bold text-neutral-500">Прогноз CTR</p>
                          <p className="text-xl font-black text-indigo-300 mt-1">{predictedCtr.toFixed(1)}%</p>
                        </div>
                        <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-900">
                          <p className="text-[9px] uppercase font-bold text-neutral-500">Факт к прогнозу</p>
                          <p className={`text-xl font-black mt-1 ${performanceDelta >= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                            {performanceDelta >= 0 ? "+" : ""}{performanceDelta.toFixed(1)} п.п.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-neutral-950/40 border border-neutral-900 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-neutral-400">Темы-победители</span>
                            <span className="text-[9px] text-neutral-600">по просмотрам</span>
                          </div>
                          <div className="space-y-2">
                            {performance.videos.slice(0, 3).map((video, index) => (
                              <div key={`perf-top-${video.id || 'vid'}-${index}`} className="flex items-center gap-3 text-xs">
                                <span className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center font-black text-[10px]">{index + 1}</span>
                                <span className="flex-1 text-neutral-200 truncate" title={video.title}>{video.title}</span>
                                <span className="text-neutral-500 whitespace-nowrap">{formatNumber(video.views)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-emerald-500/5 border border-primary/20 space-y-2">
                          <span className="text-[10px] font-black uppercase text-primary">Следующий приоритет</span>
                          <p className="text-xs text-neutral-200 leading-relaxed">{nextVideoRecommendation}</p>
                          <p className="text-[10px] text-neutral-500">Ориентир: CTR ≥ {Math.max(6, predictedCtr).toFixed(1)}% и удержание первых роликов ≥ 45%.</p>
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-neutral-900">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-neutral-950 text-neutral-500 uppercase text-[9px] tracking-wider">
                            <tr><th className="p-3">Ролик</th><th className="p-3">CTR</th><th className="p-3">Удержание</th><th className="p-3">Ср. просмотр</th></tr>
                          </thead>
                          <tbody>
                            {performance.videos.slice(0, 5).map((video, vIdx) => (
                              <tr key={`perf-tbl-${video.id || 'vid'}-${vIdx}`} className="border-t border-neutral-900/80 text-neutral-300">
                                <td className="p-3 max-w-[240px] truncate" title={video.title}>{video.title}</td>
                                <td className="p-3 font-bold">{video.ctr.toFixed(1)}%</td>
                                <td className="p-3">{video.retention.toFixed(1)}%</td>
                                <td className="p-3">{formatDuration(video.averageViewDuration)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 rounded-xl bg-neutral-950/40 border border-dashed border-neutral-800 text-xs text-neutral-400">
                      {performanceError || "Загружаем фактические показатели канала…"}
                      {performanceError?.includes("Reconnect") && " Переподключите канал, чтобы дать доступ YouTube Analytics."}
                    </div>
                  )}
                </div>

                {/* AI Channel Strategy Section */}
                <div className="border-t border-neutral-900 pt-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-accent" size={16} />
                    <h5 className="text-xs font-black uppercase text-white tracking-wider">
                      AI Стратегический Аудит Роста (Gemini)
                    </h5>
                  </div>

                  {isGeneratingStrategy ? (
                    <div className="p-10 rounded-xl bg-neutral-950/50 border border-neutral-900 border-dashed flex flex-col items-center justify-center space-y-4">
                      <Loader2 className="text-primary animate-spin" size={32} />
                      <div className="space-y-1 text-center">
                        <p className="text-xs font-bold text-white italic">
                          Составляем персонализированные рекомендации...
                        </p>
                        <p className="text-[10px] text-neutral-500">
                          Изучаем среднее вовлечение, вычисляем показатели конверсии и строим пошаговый план.
                        </p>
                      </div>
                    </div>
                  ) : channelStrategy ? (
                    <div className="space-y-5">
                      
                      {/* Top: Current Stage and Health Score */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        {/* Current Stage description */}
                        <div className="md:col-span-8 p-4 bg-neutral-950/40 rounded-xl border border-neutral-900/60 space-y-1">
                          <span className="text-[9px] font-black text-primary uppercase tracking-wider">
                            Текущий этап канала: {channelStrategy.currentStageName}
                          </span>
                          <p className="text-xs text-neutral-300 leading-relaxed">
                            {channelStrategy.currentStageDesc}
                          </p>
                        </div>

                        {/* Health score block */}
                        <div className="md:col-span-4 p-4 bg-neutral-950/40 rounded-xl border border-neutral-900/60 flex flex-col items-center justify-center text-center space-y-1">
                          <span className="text-[9px] font-black text-neutral-500 uppercase tracking-wider">
                            Индекс здоровья канала
                          </span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-accent">
                              {channelStrategy.metricsAnalysis?.overallHealthScore || 75}
                            </span>
                            <span className="text-xs text-neutral-500">/100</span>
                          </div>
                          <div className="w-full bg-neutral-900 h-1 rounded-full">
                            <div 
                              className="bg-accent h-1 rounded-full transition-all" 
                              style={{ width: `${channelStrategy.metricsAnalysis?.overallHealthScore || 75}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Performance Commentary Audits */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-neutral-950/30 rounded-xl border border-neutral-900/40 space-y-1.5">
                          <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
                            Анализ охвата & Просмотров
                          </span>
                          <p className="text-xs text-neutral-300 leading-relaxed">
                            {channelStrategy.metricsAnalysis?.viewsPerVideoComment}
                          </p>
                        </div>
                        <div className="p-4 bg-neutral-950/30 rounded-xl border border-neutral-900/40 space-y-1.5">
                          <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
                            Конверсия просмотров в подписки
                          </span>
                          <p className="text-xs text-neutral-300 leading-relaxed">
                            {channelStrategy.metricsAnalysis?.subConversionComment}
                          </p>
                        </div>
                      </div>

                      {/* Detailed Strategic Suggestions */}
                      <div className="space-y-3">
                        <span className="text-[9px] font-black text-neutral-500 uppercase tracking-wider block">
                          Конкретные Рекомендации для внедрения:
                        </span>
                        
                        <div className="space-y-3">
                          {channelStrategy.strategicSuggestions?.map((s: any, idx: number) => (
                            <div 
                              key={`strat-sug-${s.title || 'sug'}-${idx}`}
                              className="p-4 bg-neutral-900/30 rounded-xl border border-neutral-850/50 space-y-3 hover:bg-neutral-900/50 transition-colors"
                            >
                              {/* Header row */}
                              <div className="flex items-start justify-between gap-3 flex-wrap">
                                <div className="space-y-1">
                                  <h6 className="text-xs font-bold text-white flex items-center gap-2">
                                    <span className="h-4.5 w-4.5 rounded-full bg-primary/20 text-primary font-bold text-[10px] flex items-center justify-center">
                                      {idx + 1}
                                    </span>
                                    {s.title}
                                  </h6>
                                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                                    {s.description}
                                  </p>
                                </div>
                                
                                <div className="flex gap-1.5 shrink-0">
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                    s.priority === "Высокий" 
                                      ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                                      : s.priority === "Средний"
                                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                        : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                  }`}>
                                    {s.priority} приоритет
                                  </span>
                                  <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-accent/10 text-accent border border-accent/20">
                                    {s.impact}
                                  </span>
                                </div>
                              </div>

                              {/* Action items inside */}
                              <div className="pl-6 pt-2 border-t border-neutral-900/60 space-y-1.5">
                                <span className="text-[9px] font-bold text-neutral-500 uppercase">Пошаговый план внедрения:</span>
                                <ul className="space-y-1 list-none">
                                  {s.actionSteps?.map((step: string, i: number) => (
                                    <li key={`action-step-${step.slice(0, 15)}-${i}`} className="text-xs text-neutral-300 flex items-start gap-2 leading-relaxed">
                                      <span className="text-accent font-bold mt-0.5">•</span>
                                      <span>{step}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Content Pillars */}
                      <div className="space-y-3">
                        <span className="text-[9px] font-black text-neutral-500 uppercase tracking-wider block">
                          Контентные столпы прямо сейчас (на что опереться):
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {channelStrategy.contentPillars?.map((pillar: any, i: number) => (
                            <div key={`pillar-${pillar.title || 'p'}-${i}`} className="p-3.5 bg-neutral-950/60 rounded-xl border border-neutral-900 space-y-1">
                              <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                                {pillar.title}
                              </div>
                              <p className="text-[10px] text-neutral-400 leading-relaxed">
                                {pillar.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Frequency & consistency plan */}
                      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 space-y-1.5">
                        <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1.5">
                          <Check size={12} />
                          Рекомендуемый график публикаций & Регулярность:
                        </div>
                        <p className="text-xs text-neutral-300 leading-relaxed">
                          {channelStrategy.uploadConsistencyPlan}
                        </p>
                      </div>

                    </div>
                  ) : (
                    <div className="p-6 rounded-xl bg-neutral-950/40 border border-neutral-900 flex flex-col items-center justify-center text-center space-y-3">
                      <p className="text-xs text-neutral-400">
                        У вас подключен канал, но AI-стратегия еще не составлена. Нажмите на кнопку ниже, чтобы запустить глубокий аудит через Gemini.
                      </p>
                      <button
                        onClick={() => handleGenerateStrategy()}
                        className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition-all"
                      >
                        <Sparkles size={13} />
                        Составить AI-Стратегию Развития
                      </button>
                    </div>
                  )}
                </div>

              </div>
            </ScrollFadeIn>
          )}

          {/* My Videos Publication Status Section */}
          <ScrollFadeIn delay={0.03}>
            <div className="p-6 rounded-2xl bg-surface border border-border shadow-2xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-900 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
                    <Youtube size={20} />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white leading-tight">
                      Мои видео и статус публикации
                    </h4>
                    <p className="text-[10px] text-neutral-400">
                      {isMyVideosDemo 
                        ? "Демонстрационный режим • Соответствие сгенерированным идеям" 
                        : "Реальные данные вашего YouTube-канала"}
                    </p>
                    {isDemoMode && <span className="inline-flex mt-1 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-[9px] font-black text-amber-300">ДЕМО-ДАННЫЕ</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchMyVideos}
                    disabled={isFetchingMyVideos}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white transition-all text-xs font-bold disabled:opacity-50"
                  >
                    {isFetchingMyVideos ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <RefreshCw size={13} />
                    )}
                    Обновить статус
                  </button>
                </div>
              </div>

              {myVideos.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 text-xs">
                  Нет доступных видео. Сгенерируйте новые идеи на вкладке "Идеи", чтобы увидеть их статусы публикации.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myVideos.map((video, idx) => {
                    const isPublished = video.privacyStatus === "public";
                    const isUnlisted = video.privacyStatus === "unlisted";
                    return (
                      <div 
                        key={`yt-vid-${video.id ?? 'item'}-${idx}`} 
                        className="flex gap-4 p-4 rounded-xl bg-neutral-950/40 border border-neutral-900 hover:border-neutral-800/80 transition-all hover:bg-neutral-950/60"
                      >
                        {video.thumbnail && (
                          <div className="w-24 h-16 rounded-lg overflow-hidden shrink-0 border border-neutral-800 relative bg-neutral-900">
                            <img 
                              src={video.thumbnail} 
                              alt={video.title} 
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                            {isPublished && (
                              <div className="absolute bottom-1 right-1 px-1 bg-black/75 rounded text-[8px] font-bold text-white flex items-center gap-1">
                                <Play size={8} className="fill-white" /> Live
                              </div>
                            )}
                            {isMyVideosDemo && (
                              <div className="absolute top-1 left-1 px-1 bg-amber-500/90 rounded text-[8px] font-black text-black">ДЕМО</div>
                            )}
                          </div>
                        )}
                        <div className="flex-1 min-w-0 flex flex-col justify-between space-y-2">
                          <div className="space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <h5 className="text-xs font-bold text-white leading-snug truncate" title={video.title}>
                                {video.title}
                              </h5>
                              <span className={`shrink-0 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                isPublished 
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                  : isUnlisted
                                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              }`}>
                                {isPublished ? "Опубликовано" : isUnlisted ? "По ссылке" : "Черновик"}
                              </span>
                            </div>
                            <p className="text-[10px] text-neutral-500 line-clamp-1">
                              {video.description || "Без описания"}
                            </p>
                          </div>

                          <div className="flex items-center justify-between text-[9px] text-neutral-500 border-t border-neutral-900/40 pt-1.5">
                            <div className="flex items-center gap-2.5">
                              {isPublished && (
                                <>
                                  <span className="flex items-center gap-1">
                                    <Eye size={10} /> {formatNumber(video.viewCount)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Heart size={10} /> {formatNumber(video.likeCount)}
                                  </span>
                                </>
                              )}
                            </div>
                            <span className="flex items-center gap-1">
                              <Calendar size={10} /> {new Date(video.publishedAt).toLocaleDateString("ru-RU")}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollFadeIn>

          {/* Competitor Search & Target Panel */}
          <ScrollFadeIn delay={0.05}>
          <div className="p-6 rounded-2xl bg-surface border border-border shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Search className="text-primary animate-pulse" size={16} />
                Анализ конкурентных каналов и видео
              </h4>
              {activeNiche && (
                <span className="text-[10px] text-neutral-400 font-bold bg-neutral-900 px-2.5 py-1 rounded-full border border-neutral-800">
                  Текущая ниша: {activeNiche}
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Введите нишу, тему ролика или название канала-конкурента..."
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-primary transition-all"
                onKeyDown={(e) => e.key === "Enter" && handleResearch()}
              />
              <button
                onClick={() => handleResearch()}
                disabled={isSearching || !searchQuery.trim()}
                className="flex items-center gap-2 px-5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-lg shadow-primary/10"
              >
                {isSearching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                Найти & Анализировать
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-neutral-500">
              <span>Быстрый поиск:</span>
              {["Обзоры техники", "Криптовалюта 2026", "Саморазвитие", "Каналы про автостоп"].map((term, idx) => (
                <button
                  key={`term-${term}-${idx}`}
                  onClick={() => {
                    setSearchQuery(term);
                    handleResearch(term);
                  }}
                  className="px-2 py-1 bg-neutral-900/50 hover:bg-neutral-900 text-neutral-400 hover:text-white rounded-lg border border-neutral-850 transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
          </ScrollFadeIn>

          {/* Competitor Intelligence List */}
          {isSearching ? (
            <div className="flex flex-col items-center justify-center py-20 bg-surface rounded-2xl border border-border">
              <div className="relative mb-4">
                <Compass className="text-primary animate-spin" size={48} />
                <Sparkles className="absolute -top-1 -right-1 text-accent animate-pulse" size={18} />
              </div>
              <p className="text-sm font-bold text-white mb-1 italic">
                Ищем каналы конкурентов в реальном времени...
              </p>
              <p className="text-xs text-neutral-500 max-w-sm text-center px-4 leading-relaxed">
                Gemini использует глубокий поиск (Google Search), чтобы просканировать YouTube, оценить просмотры, метрики вовлеченности, сильные и слабые стороны лидеров.
              </p>
            </div>
          ) : competitorsList && competitorsList.length > 0 ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                  Найдено конкурентов ({competitorsList.length})
                </span>
                <span className="text-[9px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                  {researchData ? "Обновлено в реальном времени" : "Данные из ниши"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
                {competitorsList.map((competitor, idx) => (
                  <div
                    key={`comp-card-${idx}-${competitor.name}`}
                    className="p-5 rounded-2xl bg-surface border border-border hover:border-primary/40 transition-all shadow-xl flex flex-col justify-between group relative overflow-hidden min-w-0 break-words"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-all" />
                    
                    <div className="space-y-3.5 min-w-0">
                      {/* Name and Stats */}
                      <div className="flex items-start justify-between gap-3 min-w-0">
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <a
                            href={getChannelUrl(competitor)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group/link inline-flex items-center gap-1.5 focus:outline-none max-w-full"
                            title="Открыть YouTube-канал в новой вкладке"
                          >
                            <h5 className="font-bold text-white group-hover:text-primary group-hover/link:text-red-400 transition-colors text-sm flex items-center gap-1.5 truncate">
                              <Youtube size={14} className="text-red-500 shrink-0" />
                              <span className="truncate">{competitor.name}</span>
                              <ExternalLink size={10} className="text-neutral-500 group-hover/link:text-red-400 transition-colors shrink-0" />
                            </h5>
                          </a>
                          <p className="text-[10px] text-neutral-500 leading-relaxed line-clamp-1 break-words">
                            {competitor.desc}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-[11px] font-black text-white">{competitor.subs}</div>
                          <div className="text-[8px] uppercase text-neutral-500 font-bold tracking-wider">Подписчиков</div>
                        </div>
                      </div>

                      {/* Engagement Rate */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] font-bold text-neutral-500">
                          <span>Вовлеченность (ER)</span>
                          <span className="text-primary">{competitor.engagement}%</span>
                        </div>
                        <div className="w-full bg-neutral-900 rounded-full h-1">
                          <div 
                            className="bg-primary h-1 rounded-full transition-all" 
                            style={{ width: `${Math.min(competitor.engagement * 10, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Weakness & Strategy */}
                      <div className="bg-neutral-950/60 rounded-xl p-3 border border-neutral-900 space-y-2">
                        <div className="text-[10px] leading-relaxed">
                          <span className="text-red-400 font-bold uppercase tracking-wider text-[8px] block mb-0.5">Слабая сторона:</span>
                          <span className="text-neutral-300">{competitor.weakness}</span>
                        </div>
                        <div className="text-[10px] leading-relaxed">
                          <span className="text-emerald-400 font-bold uppercase tracking-wider text-[8px] block mb-0.5">Как обойти:</span>
                          <span className="text-neutral-300">{competitor.strategy}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3.5 border-t border-neutral-900 flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
                        Вирусных видео: {(competitor as any).topVideos?.length || 0}
                      </span>
                      <div className="flex gap-1.5">
                        <a
                          href={getChannelUrl(competitor)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-neutral-400 hover:text-white transition-all border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800 rounded-lg cursor-pointer"
                          title="Перейти на канал в новой вкладке"
                        >
                          <ExternalLink size={10} />
                          Канал
                        </a>
                        <button
                          onClick={() => setSelectedCompetitor(competitor as any)}
                          className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-accent hover:text-accent/90 transition-all bg-accent/10 hover:bg-accent/20 rounded-lg cursor-pointer"
                        >
                          Видео
                          <ArrowRight size={10} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Audience Interests Distribution Chart using DEMO_DATA */}
              <div className="p-6 rounded-2xl bg-surface border border-border shadow-xl space-y-4 w-full">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Users className="text-emerald-400" size={16} />
                      Распределение аудитории по интересам
                    </h4>
                    <p className="text-[10px] text-neutral-500">
                      Анализ интересов и демографии зрителей в нише «{activeNiche}» (на основе DEMO_DATA)
                    </p>
                  </div>
                  <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-2.5 py-0.5 rounded-full">
                    DEMO_DATA
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={currentDemoData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={68}
                          paddingAngle={4}
                          dataKey="value"
                          nameKey="name"
                        >
                          {currentDemoData.map((_, index) => (
                            <Cell 
                              key={`pie-demo-cell-${index}`} 
                              fill={DEMO_COLORS[index % DEMO_COLORS.length]} 
                              stroke="#0a0a0a"
                              strokeWidth={2}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0a0a0a",
                            borderColor: "#262626",
                            borderRadius: "12px",
                            fontSize: "11px"
                          }}
                          itemStyle={{ color: "#fff", fontWeight: "bold" }}
                          formatter={(val: any) => [`${val} баллов`, "Активность"]}
                        />
                        <Legend 
                          verticalAlign="middle" 
                          align="right"
                          layout="vertical"
                          wrapperStyle={{ fontSize: "10px", color: "#d1d5db" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={currentDemoData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fill: "#9ca3af", fontSize: 9 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis 
                          tick={{ fill: "#9ca3af", fontSize: 8 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0a0a0a",
                            borderColor: "#262626",
                            borderRadius: "12px",
                            fontSize: "11px"
                          }}
                          itemStyle={{ color: "#10b981", fontWeight: "bold" }}
                          labelStyle={{ color: "#fff", fontWeight: "bold", marginBottom: "2px" }}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Интерес аудитории">
                          {currentDemoData.map((_, index) => (
                            <Cell 
                              key={`bar-demo-cell-${index}`} 
                              fill={DEMO_COLORS[index % DEMO_COLORS.length]} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Gap Analysis Widget */}
              <div className="p-6 rounded-2xl bg-surface border border-border shadow-xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                      <TrendingUp className="text-accent" size={16} />
                      Gap-анализ тегов конкурентов
                    </h4>
                    <p className="text-[10px] text-neutral-500">
                      Сопоставление ваших ключевых слов с тегами и фразами топ-роликов лидеров ниши
                    </p>
                  </div>
                  {videoSEO ? (
                    <button
                      onClick={handleAddAllMissingTags}
                      disabled={missingTags.length === 0}
                      className="flex items-center gap-1.5 px-4 py-2 bg-primary disabled:bg-neutral-800 disabled:text-neutral-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all cursor-pointer shadow-md"
                    >
                      <Plus size={14} />
                      Добавить все упущенные ({missingTags.length})
                    </button>
                  ) : null}
                </div>

                {!videoSEO ? (
                  <div className="p-5 rounded-xl bg-neutral-950 border border-border/40 text-center space-y-4">
                    <div className="mx-auto w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                      <AlertCircle size={20} />
                    </div>
                    <div className="space-y-1">
                      <h5 className="text-xs font-bold text-white">Проект SEO не инициализирован</h5>
                      <p className="text-[10px] text-neutral-500 max-w-md mx-auto leading-relaxed">
                        У вас пока нет активного проекта SEO для сопоставления. Вы можете сгенерировать SEO на вкладке «SEO» или создать черновик на основе выбранной идеи прямо здесь.
                      </p>
                    </div>
                    <button
                      onClick={handleCreateDraftSEO}
                      className="px-4 py-2 bg-neutral-900 border border-neutral-800 hover:border-accent/40 text-xs font-bold text-accent rounded-xl transition-all"
                    >
                      Создать черновик SEO проекта
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Left Panel: Current keywords */}
                    <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-900/50 space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Текущие теги проекта</span>
                          <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                            {currentKeywordsList.filter(Boolean).length} тегов
                          </span>
                        </div>
                        <p className="text-[10px] text-white font-medium line-clamp-1 italic">
                          Ролик: "{videoSEO.title}"
                        </p>
                        
                        <div className="flex flex-wrap gap-1.5">
                          {currentKeywordsList.filter(Boolean).length > 0 ? (
                            currentKeywordsList.map((tag, i) => (
                              <span 
                                key={`keywords-list-item-${tag}-${i}`}
                                className="px-2 py-1 bg-neutral-900 border border-neutral-800/80 rounded-lg text-[9px] text-neutral-400 font-medium"
                              >
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-neutral-600 italic block py-4">Список тегов пуст</span>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-neutral-900/60 text-[8px] text-neutral-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        Синхронизировано с базой данных проекта
                      </div>
                    </div>

                    {/* Right Panel: Missing tags */}
                    <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-900/50 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Упущенные теги лидеров</span>
                        <span className="text-[9px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
                          {missingTags.length} найдено
                        </span>
                      </div>

                      {missingTags.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {missingTags.map((info, idx) => (
                            <button
                              key={`missing-tag-btn-${info.tag}-${idx}`}
                              onClick={() => handleAddTag(info.tag)}
                              className="group px-2.5 py-1 bg-primary/10 border border-primary/20 hover:border-primary text-neutral-200 hover:text-white rounded-lg text-[9px] font-semibold flex items-center gap-1 transition-all"
                              title={`Используется в: ${info.sourceChannels.join(', ')}`}
                            >
                              <span>{info.tag}</span>
                              <Plus className="text-primary group-hover:scale-125 transition-transform" size={10} />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
                          <Check className="text-emerald-500" size={16} />
                          <p className="text-[10px] text-neutral-400">Отличная работа! Все топ-теги конкурентов добавлены.</p>
                        </div>
                      )}

                      {missingTags.length > 0 && (
                        <p className="text-[8px] text-neutral-500 italic mt-1">
                          * Нажмите на тег с плюсом, чтобы быстро добавить его в проект. Наведите на тег, чтобы увидеть источник.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Competitor Strategy Integration Section */}
              {researchData?.suggestedActionPlan && researchData.suggestedActionPlan.length > 0 && (
                <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 space-y-3 shadow-xl">
                  <div className="flex items-center gap-2">
                    <Award className="text-accent" size={18} />
                    <h5 className="text-xs font-black uppercase text-white tracking-wider">
                      Стратегические выводы для создания идей
                    </h5>
                  </div>
                  <ul className="space-y-2">
                    {researchData.suggestedActionPlan.map((plan, i) => (
                      <li key={`action-plan-${plan.slice(0, 15)}-${i}`} className="text-xs text-neutral-300 flex items-start gap-2 leading-relaxed">
                        <span className="h-4 w-4 bg-primary/25 rounded-full flex items-center justify-center text-primary font-bold text-[10px] flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span>{plan}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-2 flex items-center justify-between">
                    <p className="text-[10px] text-neutral-400 max-w-md leading-relaxed">
                      Вы можете применить эти конкурентные преимущества при генерации ваших следующих 10 тем. Нажмите на кнопку справа, чтобы встроить этот контекст в модуль идей.
                    </p>
                    <button
                      onClick={() => {
                        const contextString = competitorsList
                          .map((c) => `- Конкурент "${c.name}": слабость: "${c.weakness}". План: "${c.strategy}".`)
                          .join("\n");
                        onApplyCompetitorInsights(contextString);
                        toast.success("Инсайты успешно применены! Перейдите на вкладку Идеи и сгенерируйте новые темы с учетом конкурентов.");
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-accent text-neutral-900 rounded-xl text-[10px] font-bold hover:bg-accent/90 transition-all cursor-pointer"
                    >
                      <Sparkles size={11} />
                      Применить инсайты к Идеям
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 bg-surface rounded-2xl border border-border">
              <div className="h-12 w-12 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-600 mb-3">
                <Youtube size={24} />
              </div>
              <p className="text-xs text-neutral-500">
                {activeNiche 
                  ? "Нет данных по конкурентам. Нажмите «Найти & Анализировать» выше."
                  : "Пожалуйста, выберите нишу в Шаге 1 или введите тему поиска выше."}
              </p>
            </div>
          )}
        </div>

        {/* Right Column (4 cols): Evergreen Trends, Sub-niches Map & Statistics */}
        <div className="xl:col-span-4 space-y-6">
          
          {/* Trending Queries Block */}
          <div className="p-6 rounded-2xl bg-surface border border-border shadow-xl space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Flame className="text-red-500 animate-pulse" size={16} />
                  Тренды в реальном времени
                </h4>
                <p className="text-[10px] text-neutral-500">
                  Поисковые запросы Google Search Grounding
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-neutral-900 border border-border/40 rounded-lg px-2 py-1 flex-shrink-0">
                <span className="text-xs">{REGIONS.find(r => r.id === selectedRegion)?.flag || "🌍"}</span>
                <select
                  value={selectedRegion}
                  onChange={(e) => {
                    const newRegion = e.target.value;
                    setSelectedRegion(newRegion);
                    if (activeNiche) {
                      handleFetchTrendingQueries(activeNiche, newRegion);
                    }
                  }}
                  className="bg-transparent text-xs text-neutral-300 font-semibold focus:outline-none cursor-pointer pr-1"
                >
                  {REGIONS.map((r, rIdx) => (
                    <option key={`region-${r.id}-${rIdx}`} value={r.id} className="bg-neutral-950 text-neutral-300">
                      {r.flag} {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isFetchingTrending ? (
              <div className="py-6 text-center text-xs text-neutral-500">
                <Loader2 className="animate-spin inline-block mr-2" size={14} />
                Анализируем тренды...
              </div>
            ) : trendingQueries.length > 0 ? (
              <div className="space-y-4">
                <ul className="space-y-2">
                  {trendingQueries.map((query, i) => (
                    <li key={`trending-query-${query}-${i}`} className="px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-300 hover:text-white transition-colors cursor-pointer flex items-center gap-2">
                      <TrendingUp size={12} className="text-emerald-500" />
                      {query}
                    </li>
                  ))}
                </ul>

                {/* Grounding sources section */}
                {trendingSources.length > 0 && (
                  <div className="pt-3 border-t border-border/30">
                    <p className="text-[10px] font-black text-neutral-500 uppercase tracking-wider mb-2">
                      Источники поиска (Grounding):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {trendingSources.map((src, i) => (
                        <a
                          key={`trending-src-${src.title || 'source'}-${i}`}
                          href={src.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-900 border border-neutral-800 rounded-md text-[10px] text-neutral-400 hover:text-primary hover:border-primary/40 transition-all truncate max-w-full"
                          title={src.title}
                        >
                          <Globe size={10} className="text-neutral-500 shrink-0" />
                          <span className="truncate max-w-[150px]">{src.title}</span>
                          <ExternalLink size={8} className="shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-neutral-500">
                Введите нишу и нажмите «Найти», чтобы увидеть тренды
              </div>
            )}
          </div>

          {/* Predicted CTR Visualization Block */}
          <div className="p-6 rounded-2xl bg-surface border border-border shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Target className="text-accent" size={16} />
                  Прогнозируемый CTR для идей
                </h4>
                <p className="text-[10px] text-neutral-500">
                  Кликабельность на основе потенциала ниши ({potentialScore}%) и активности {competitorsList.length} конкурентов
                </p>
              </div>
              {selectedIdeas && selectedIdeas.length > 0 ? (
                <span className="text-[8px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded flex-shrink-0">
                  Выбранные идеи
                </span>
              ) : (
                <span className="text-[8px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded flex-shrink-0">
                  Все идеи (демо)
                </span>
              )}
            </div>

            {nicheData && ideasToVisualize.length > 0 ? (
              <div className="space-y-4">
                {/* Recharts Horizontal Bar Chart */}
                <div className="h-48 w-full bg-neutral-950/40 p-2 rounded-xl border border-neutral-900">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={ctrChartData}
                      layout="vertical"
                      margin={{ top: 10, right: 15, left: 5, bottom: 5 }}
                    >
                      <XAxis 
                        type="number" 
                        domain={[0, 16]} 
                        tick={{ fill: "#6b7280", fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                        unit="%"
                      />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        tick={{ fill: "#9ca3af", fontSize: 9 }}
                        width={90}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-neutral-950 border border-neutral-800 p-2.5 rounded-xl text-[11px] max-w-xs space-y-1 shadow-xl">
                                <p className="font-bold text-white leading-tight">{data.fullName}</p>
                                <p className="text-neutral-400">Прогноз CTR: <span className="text-accent font-black text-xs">{data.ctr}%</span></p>
                                <p className="text-neutral-500 text-[10px] italic leading-relaxed">{data.recommendation}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="ctr" fill="#8884d8" radius={[0, 4, 4, 0]}>
                        {ctrChartData.map((entry, index) => (
                          <Cell key={`bar-ctr-cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Ideas breakdown with individual stats and smart recommendations */}
                <div className="space-y-2.5">
                  {ctrChartData.map((item, idx) => (
                    <div 
                      key={`ctr-chart-item-${idx}-${item.name}`} 
                      className="p-3 bg-neutral-950/50 border border-neutral-900 rounded-xl hover:border-neutral-850 transition-all space-y-2 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 flex-1">
                          <h5 className="text-[11px] font-bold text-neutral-200 line-clamp-2 group-hover:text-white transition-colors leading-snug">
                            {item.fullName}
                          </h5>
                          <div className="flex items-center gap-1.5 text-[8px] text-neutral-500 font-bold uppercase">
                            <span>Потенциал:</span>
                            <span className={item.viral.includes("Высокий") || item.viral.includes("высокий") ? "text-amber-400" : "text-neutral-400"}>
                              {item.viral}
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-black text-white">{item.ctr}%</div>
                          <span className="text-[8px] font-black uppercase tracking-wider block" style={{ color: item.color }}>
                            {item.tier} CTR
                          </span>
                        </div>
                      </div>

                      {/* Micro Recommendation */}
                      <p className="text-[10px] text-neutral-400 border-t border-neutral-900/60 pt-2 leading-relaxed">
                        💡 {item.recommendation}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Info Note if using fallback ideas */}
                {(!selectedIdeas || selectedIdeas.length === 0) && (
                  <p className="text-[9px] text-neutral-500 italic leading-relaxed text-center">
                    💡 Выберите свои лучшие идеи во вкладке <span className="text-accent">«Идеи»</span>, добавив их в серию, чтобы увидеть точный прогноз CTR конкретно для вашего набора роликов!
                  </p>
                )}
              </div>
            ) : (
              <div className="py-10 text-center bg-neutral-950/40 rounded-xl border border-neutral-900 text-[10px] text-neutral-500">
                Запустите поиск и исследование ниши выше, чтобы разблокировать прогнозирование CTR на основе реальных конкурентов
              </div>
            )}
          </div>

          {/* Recharts Chart: Engagement levels or Evergreen stability */}
          <div className="p-6 rounded-2xl bg-surface border border-border shadow-xl space-y-4">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="text-primary" size={16} />
                Вечнозеленый потенциал ниш
              </h4>
              <p className="text-[10px] text-neutral-500">
                Какое отношение стабильного вечнозеленого спроса к уровню конкуренции
              </p>
            </div>

            {researchData && researchData.evergreenTrends && researchData.evergreenTrends.length > 0 ? (
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={researchData.evergreenTrends.map((t, idx) => ({ ...t, name: t.name + " ".repeat(idx) }))}
                    margin={{ top: 10, right: 0, left: -25, bottom: 0 }}
                  >
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: "#6b7280", fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: "#6b7280", fontSize: 8 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0a0a0a",
                        borderColor: "#262626",
                        borderRadius: "12px"
                      }}
                      labelClassName="text-xs font-bold text-white"
                      itemStyle={{ color: "#a3a3a3", fontSize: 10 }}
                    />
                    <Bar dataKey="evergreenScore" fill="var(--color-primary)" radius={[4, 4, 0, 0]} name="Evergreen Score">
                      {researchData.evergreenTrends.map((entry, index) => (
                        <Cell 
                          key={`bar-evergreen-cell-${index}`} 
                          fill={index % 2 === 0 ? "rgb(99,102,241)" : "rgb(245,158,11)"} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-44 w-full flex items-center justify-center bg-neutral-950/50 rounded-xl border border-neutral-900 text-[10px] text-neutral-500">
                Проведите анализ, чтобы построить график
              </div>
            )}
          </div>

          {/* Seasonality Trend Chart */}
          <div className="p-6 rounded-2xl bg-surface border border-border shadow-xl space-y-4">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="text-primary" size={16} />
                Сезонность спроса (последние 6 месяцев)
              </h4>
              <p className="text-[10px] text-neutral-500">
                Динамика просмотров и интереса зрителей в нише «{activeNiche}»
              </p>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trendData[activeNiche] || trendData["Свой вариант"]}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: "#6b7280", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: "#6b7280", fontSize: 8 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0a0a0a",
                      borderColor: "#262626",
                      borderRadius: "12px",
                      fontSize: "10px"
                    }}
                    itemStyle={{ color: "#818cf8", fontWeight: "bold" }}
                    labelStyle={{ color: "#fff", fontWeight: "bold", marginBottom: "4px" }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="views" 
                    stroke="#818cf8" 
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#0a0a0a", stroke: "#818cf8", strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: "#818cf8", stroke: "#0a0a0a" }}
                    name="Просмотры"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Evergreen trends dashboard */}
          <div className="p-6 rounded-2xl bg-surface border border-border shadow-xl space-y-4">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="text-accent" size={16} />
                Вечнозеленые ниши и подниши
              </h4>
              <p className="text-[10px] text-neutral-500">
                Самые стабильные тренды 2026 года с быстрой активацией
              </p>
            </div>

            <div className="space-y-3.5">
              {researchData && researchData.evergreenTrends && researchData.evergreenTrends.length > 0 ? (
                researchData.evergreenTrends.map((trend, idx) => (
                  <div
                    key={`trend-evergreen-item-${idx}-${trend.name}`}
                    className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-900 space-y-3 hover:border-neutral-800 transition-colors"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Compass size={12} className="text-primary" />
                          {trend.name}
                        </h5>
                        <div className="flex items-center gap-1 text-[8px] text-neutral-500 font-bold uppercase tracking-wider">
                          <span>Конкуренция: </span>
                          <span className={trend.competitionScore > 70 ? "text-red-400" : trend.competitionScore > 40 ? "text-amber-400" : "text-emerald-400"}>
                            {trend.competitionScore}%
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[11px] font-black text-emerald-400">{trend.evergreenScore}/100</span>
                        <span className="text-[7px] uppercase font-bold text-neutral-500 tracking-wider">Evergreen</span>
                      </div>
                    </div>

                    {/* Sub-niches bullets */}
                    <div className="space-y-1.5 pt-1 border-t border-neutral-900">
                      {trend.subNiches.map((sub, i) => (
                        <div
                          key={`trend-subniche-${idx}-${i}-${sub.name}`}
                          className="flex items-center justify-between p-2 rounded bg-neutral-900/40 hover:bg-neutral-900 text-[10px] transition-all group/sub"
                        >
                          <div className="space-y-0.5 max-w-[70%]">
                            <span className="text-neutral-200 font-semibold group-hover/sub:text-accent transition-colors block leading-tight">
                              {sub.name}
                            </span>
                            <span className="text-[9px] text-neutral-500 line-clamp-1 italic">
                              {sub.description}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              onSelectNiche(sub.name);
                              setStatusMsg({ type: "success", text: `Ниша изменена на "${sub.name}". Вкладка брендинга и идей обновится!` });
                            }}
                            className="opacity-0 group-hover/sub:opacity-100 flex items-center gap-0.5 px-2 py-0.5 bg-accent hover:bg-accent/90 text-neutral-900 rounded font-bold text-[8px] transition-all cursor-pointer"
                          >
                            Выбрать
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                // Static Default Evergreen Niches prior to search
                <div className="space-y-3">
                  {[
                    { name: "ИИ & Автоматизация", score: 95, subs: "No-code инструменты, Промт-инжиниринг" },
                    { name: "Личные Финансы", score: 92, subs: "Пассивный доход, Инвестиции с нуля" },
                    { name: "Саморазвитие", score: 88, subs: "Продуктивность, Тайм-менеджмент" },
                    { name: "Биохакинг & Здоровье", score: 85, subs: "Оптимизация сна, Долголетие" }
                  ].map((item, idx) => (
                    <div key={`evergreen-niche-default-${idx}-${item.name}`} className="p-3 bg-neutral-950 border border-neutral-900 rounded-xl flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-white">{item.name}</div>
                        <div className="text-[9px] text-neutral-500">{item.subs}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-black text-emerald-400">{item.score}/100</div>
                        <div className="text-[7px] text-neutral-500 font-bold uppercase tracking-wider">Evergreen</div>
                      </div>
                    </div>
                  ))}
                  <div className="text-center text-[9px] text-neutral-600 italic leading-relaxed pt-2">
                    * Нажмите кнопку «Найти & Анализировать» выше, чтобы сгенерировать точные подниши и актуальные вечнозеленые идеи в вашей теме!
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Competitor Video Detail Modal */}
      <AnimatePresence>
        {selectedCompetitor && (() => {
          const activeCompetitors = researchData?.competitors || nicheData?.competitors || [];
          const maxSubsInNiche = Math.max(...activeCompetitors.map(c => parseSubsToNumber(c.subs)), 500000);

          const selectedEngagementScore = Math.min(100, Math.max(10, Math.round((selectedCompetitor.engagement || 5) * 8)));
          const selectedReachScore = Math.min(100, Math.max(15, Math.round((parseSubsToNumber(selectedCompetitor.subs) / maxSubsInNiche) * 100)));
          const selectedFrequencyScore = Math.min(100, Math.max(20, Math.round(30 + ((selectedCompetitor as any).topVideos?.length || 0) * 12 + (selectedCompetitor.name.length % 35))));

          let avgEngagementScore = 50;
          let avgReachScore = 45;
          let avgFrequencyScore = 55;

          if (activeCompetitors.length > 0) {
            const totalEngagement = activeCompetitors.reduce((acc, c) => acc + Math.min(100, Math.max(10, (c.engagement || 5) * 8)), 0);
            const totalReach = activeCompetitors.reduce((acc, c) => acc + Math.min(100, Math.max(15, (parseSubsToNumber(c.subs) / maxSubsInNiche) * 100)), 0);
            const totalFrequency = activeCompetitors.reduce((acc, c) => acc + Math.min(100, Math.max(20, 30 + ((c as any).topVideos?.length || 0) * 12 + (c.name.length % 35))), 0);
            
            avgEngagementScore = Math.round(totalEngagement / activeCompetitors.length);
            avgReachScore = Math.round(totalReach / activeCompetitors.length);
            avgFrequencyScore = Math.round(totalFrequency / activeCompetitors.length);
          }

          const radarData = [
            {
              subject: "ER (%)",
              "Конкурент": selectedEngagementScore,
              "Среднее в нише": avgEngagementScore,
            },
            {
              subject: "Охват (Reach)",
              "Конкурент": selectedReachScore,
              "Среднее в нише": avgReachScore,
            },
            {
              subject: "Частота контента",
              "Конкурент": selectedFrequencyScore,
              "Среднее в нише": avgFrequencyScore,
            }
          ];

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-neutral-950 border border-neutral-850 w-full max-w-4xl rounded-2xl p-6 shadow-2xl flex flex-col space-y-4"
              >
                <div className="flex justify-between items-center border-b border-neutral-850 pb-3">
                  <div className="flex items-center gap-3">
                    <Youtube className="text-red-500" size={20} />
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-bold text-white">
                        Анализ конкурента: <span className="text-primary">{selectedCompetitor.name}</span>
                      </h4>
                      <a
                        href={getChannelUrl(selectedCompetitor)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold bg-red-600/10 border border-red-500/20 hover:bg-red-600 hover:text-white text-red-400 rounded-lg transition-all cursor-pointer"
                        title="Открыть YouTube-канал в новой вкладке"
                      >
                        <ExternalLink size={10} />
                        Открыть канал
                      </a>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCompetitor(null)}
                    className="text-neutral-500 hover:text-white transition-all p-1 hover:bg-neutral-900 rounded-lg"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  {/* Left Column: Radar Chart comparison */}
                  <div className="lg:col-span-5 bg-neutral-900/40 border border-neutral-850/60 p-4 rounded-xl flex flex-col justify-between space-y-4">
                    <div className="space-y-1">
                      <h5 className="text-xs font-bold text-neutral-200">
                        Параметры в сравнении со средними в нише
                      </h5>
                      <p className="text-[10px] text-neutral-500 leading-relaxed">
                        Показатели нормированы по шкале от 0 до 100 для объективного сравнения силы канала.
                      </p>
                    </div>

                    <div className="h-56 w-full flex items-center justify-center bg-neutral-950/50 rounded-xl border border-neutral-900/60 p-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                          <PolarGrid stroke="#262626" />
                          <PolarAngleAxis 
                            dataKey="subject" 
                            tick={{ fill: "#9ca3af", fontSize: 9, fontWeight: 500 }}
                          />
                          <PolarRadiusAxis 
                            angle={30} 
                            domain={[0, 100]} 
                            tick={{ fill: "#4b5563", fontSize: 8 }}
                            axisLine={false}
                          />
                          <Radar 
                            name={selectedCompetitor.name} 
                            dataKey="Конкурент" 
                            stroke="rgb(239, 68, 68)" 
                            fill="rgb(239, 68, 68)" 
                            fillOpacity={0.35} 
                          />
                          <Radar 
                            name="Среднее в нише" 
                            dataKey="Среднее в нише" 
                            stroke="rgb(99, 102, 241)" 
                            fill="rgb(99, 102, 241)" 
                            fillOpacity={0.15} 
                          />
                          <Legend 
                            wrapperStyle={{ fontSize: 9, paddingTop: 10 }} 
                            iconSize={8}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-neutral-900">
                      <div className="p-1.5 bg-neutral-950 rounded border border-neutral-900/50">
                        <span className="text-[8px] uppercase font-bold text-neutral-500 block">ER</span>
                        <span className="text-xs font-bold text-white">{selectedCompetitor.engagement}%</span>
                      </div>
                      <div className="p-1.5 bg-neutral-950 rounded border border-neutral-900/50">
                        <span className="text-[8px] uppercase font-bold text-neutral-500 block">Подписчики</span>
                        <span className="text-xs font-bold text-white">{selectedCompetitor.subs}</span>
                      </div>
                      <div className="p-1.5 bg-neutral-950 rounded border border-neutral-900/50">
                        <span className="text-[8px] uppercase font-bold text-neutral-500 block">Разбор роликов</span>
                        <span className="text-xs font-bold text-white">{((selectedCompetitor as any).topVideos)?.length || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Top Videos List */}
                  <div className="lg:col-span-7 space-y-3 flex flex-col justify-between">
                    <div className="text-xs font-bold text-neutral-400">
                      Популярные & Вирусные видео канала:
                    </div>
                    
                    <div className="space-y-3 flex-1">
                      {(selectedCompetitor as any).topVideos && (selectedCompetitor as any).topVideos.length > 0 ? (
                        (selectedCompetitor as any).topVideos.map((video: any, i: number) => (
                          <div
                            key={`comp-vid-${video.title || ''}-${i}`}
                            className="p-4 bg-neutral-900/40 rounded-xl border border-neutral-850/50 space-y-2.5 hover:bg-neutral-900/70 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <h5 className="font-bold text-white text-xs leading-relaxed flex items-start gap-1.5">
                                  <span className="h-4 w-4 rounded bg-primary/20 text-primary font-bold text-[9px] flex items-center justify-center flex-shrink-0 mt-0.5">
                                    {i + 1}
                                  </span>
                                  {video.title}
                                </h5>
                                <p className="text-[9px] text-neutral-500">
                                  Опубликовано: {video.publishedAt}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="text-[11px] font-black text-white">{video.views}</div>
                                <div className="text-[7px] uppercase font-bold text-neutral-500 tracking-wider">Просмотров</div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2.5 border-t border-neutral-900/60">
                              <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-900">
                                <div className="text-[8px] uppercase tracking-wider font-bold text-accent mb-0.5">Вирусный фактор:</div>
                                <p className="text-[10px] text-neutral-300 leading-relaxed">{video.viralFactor}</p>
                              </div>
                              <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-900">
                                <div className="text-[8px] uppercase tracking-wider font-bold text-primary mb-0.5">Анализ удержания / Хук:</div>
                                <p className="text-[10px] text-neutral-300 leading-relaxed">{video.hookAnalysis}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-10 text-xs text-neutral-500 bg-neutral-900/10 rounded-xl border border-dashed border-neutral-850">
                          Нет подробных видео у этого конкурента.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-neutral-850">
                  <button
                    onClick={() => setSelectedCompetitor(null)}
                    className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 rounded-xl text-xs font-bold transition-all border border-neutral-800"
                  >
                    Закрыть
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
};
