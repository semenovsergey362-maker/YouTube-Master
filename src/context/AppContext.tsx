import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { NicheData, ScriptImprovement, VideoSEO, SEOAnalysis, TitleAnalysis, AnalysisSource, GeneratedIdea, BrandProfile, AudiencePortrait, MiniSeries, ChannelVideoInfo } from '../services/geminiService';
import { get, set } from '../lib/idb';
import { safeStorage } from '../lib/storage';
import { auth, db, doc, getDoc, setDoc, onAuthStateChanged } from '../firebase';
import { logger } from '../config/logger';

export interface PinnedStyles {
  imageStyle: boolean;
  animationType: boolean;
  audioEnvironment: boolean;
}

interface AppContextType {
  selectedNiche: string;
  setSelectedNiche: React.Dispatch<React.SetStateAction<string>>;
  selectedRegion: string;
  setSelectedRegion: React.Dispatch<React.SetStateAction<string>>;
  isCustomNiche: boolean;
  setIsCustomNiche: React.Dispatch<React.SetStateAction<boolean>>;
  customNiche: string;
  setCustomNiche: React.Dispatch<React.SetStateAction<string>>;
  nicheData: NicheData | null;
  setNicheData: React.Dispatch<React.SetStateAction<NicheData | null>>;
  brandProfile: BrandProfile | null;
  setBrandProfile: React.Dispatch<React.SetStateAction<BrandProfile | null>>;
  audiencePortrait: AudiencePortrait | null;
  setAudiencePortrait: React.Dispatch<React.SetStateAction<AudiencePortrait | null>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  isRegeneratingIdeas: boolean;
  setIsRegeneratingIdeas: React.Dispatch<React.SetStateAction<boolean>>;
  selectedIdea: string | null;
  setSelectedIdea: React.Dispatch<React.SetStateAction<string | null>>;
  selectedBranding: { name: string; slogan: string } | null;
  setSelectedBranding: React.Dispatch<React.SetStateAction<{ name: string; slogan: string } | null>>;
  scriptKeywords: string;
  setScriptKeywords: React.Dispatch<React.SetStateAction<string>>;
  isRegeneratingScript: boolean;
  setIsRegeneratingScript: React.Dispatch<React.SetStateAction<boolean>>;
  videoSEO: VideoSEO | null;
  setVideoSEO: React.Dispatch<React.SetStateAction<VideoSEO | null>>;
  seoAnalysis: SEOAnalysis | null;
  setSeoAnalysis: React.Dispatch<React.SetStateAction<SEOAnalysis | null>>;
  isGeneratingVideoSEO: boolean;
  setIsGeneratingVideoSEO: React.Dispatch<React.SetStateAction<boolean>>;
  isAnalyzingSEO: boolean;
  setIsAnalyzingSEO: React.Dispatch<React.SetStateAction<boolean>>;
  titleAnalysis: TitleAnalysis | null;
  setTitleAnalysis: React.Dispatch<React.SetStateAction<TitleAnalysis | null>>;
  isAnalyzingTitles: boolean;
  setIsAnalyzingTitles: React.Dispatch<React.SetStateAction<boolean>>;

  aiAssistantMessages: { role: 'user' | 'model'; content: string }[];
  setAiAssistantMessages: React.Dispatch<React.SetStateAction<{ role: 'user' | 'model'; content: string }[]>>;
  aiAssistantInput: string;
  setAiAssistantInput: React.Dispatch<React.SetStateAction<string>>;
  isAiAssistantLoading: boolean;
  setIsAiAssistantLoading: React.Dispatch<React.SetStateAction<boolean>>;
  previewThumbnail: string;
  setPreviewThumbnail: React.Dispatch<React.SetStateAction<string>>;
  thumbnailVariants: string[];
  setThumbnailVariants: React.Dispatch<React.SetStateAction<string[]>>;
  thumbnailReference: string | null;
  setThumbnailReference: React.Dispatch<React.SetStateAction<string | null>>;
  thumbnailReferenceStyle: string | null;
  setThumbnailReferenceStyle: React.Dispatch<React.SetStateAction<string | null>>;
  brandingImages: Record<string, string>;
  setBrandingImages: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  history: any[];
  setHistory: React.Dispatch<React.SetStateAction<any[]>>;
  isPreviewLoading: boolean;
  setIsPreviewLoading: React.Dispatch<React.SetStateAction<boolean>>;
  previewBorderColor: string;
  setPreviewBorderColor: React.Dispatch<React.SetStateAction<string>>;
  previewChannelColor: string;
  setPreviewChannelColor: React.Dispatch<React.SetStateAction<string>>;
  toneOfVoice: string;
  setToneOfVoice: React.Dispatch<React.SetStateAction<string>>;
  trendingIdeas: GeneratedIdea[];
  setTrendingIdeas: React.Dispatch<React.SetStateAction<GeneratedIdea[]>>;
  ideaSeries: MiniSeries[];
  setIdeaSeries: React.Dispatch<React.SetStateAction<MiniSeries[]>>;
  isPersistenceLoaded: boolean;
  selectedModel: string;
  setSelectedModel: React.Dispatch<React.SetStateAction<string>>;
  pinnedStyles: PinnedStyles;
  setPinnedStyles: React.Dispatch<React.SetStateAction<PinnedStyles>>;
  savedSEOs: Record<string, VideoSEO>;
  setSavedSEOs: React.Dispatch<React.SetStateAction<Record<string, VideoSEO>>>;
  debugEnabled: boolean;
  setDebugEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  myChannelVideos: ChannelVideoInfo[];
  setMyChannelVideos: React.Dispatch<React.SetStateAction<ChannelVideoInfo[]>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_MODEL = 'gemini-3.7-flash';
const VALID_MODELS = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.1-pro-preview'];

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [selectedNiche, setSelectedNiche] = useState(() => {
    try {
      return safeStorage.getItem('yt_niche') || '';
    } catch {
      return '';
    }
  });
  const [selectedRegion, setSelectedRegion] = useState(() => {
    try {
      return safeStorage.getItem('yt_region') || 'global';
    } catch {
      return 'global';
    }
  });
  const [debugEnabled, setDebugEnabled] = useState<boolean>(() => {
    try {
      return safeStorage.getItem('yt_debug_enabled') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    safeStorage.setItem('yt_debug_enabled', String(debugEnabled));
    logger.setDebugEnabled(debugEnabled);
  }, [debugEnabled]);
  const [isCustomNiche, setIsCustomNiche] = useState(false);
  const [customNiche, setCustomNiche] = useState('');
  const [nicheData, setNicheData] = useState<NicheData | null>(null);
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
  const [audiencePortrait, setAudiencePortrait] = useState<AudiencePortrait | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegeneratingIdeas, setIsRegeneratingIdeas] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<string | null>(null);
  const [selectedBranding, setSelectedBranding] = useState<{ name: string; slogan: string } | null>(null);
  const [scriptKeywords, setScriptKeywords] = useState('');
  const [isRegeneratingScript, setIsRegeneratingScript] = useState(false);
  const [videoSEO, setVideoSEO] = useState<VideoSEO | null>(null);
  const [seoAnalysis, setSeoAnalysis] = useState<SEOAnalysis | null>(null);
  const [isGeneratingVideoSEO, setIsGeneratingVideoSEO] = useState(false);
  const [isAnalyzingSEO, setIsAnalyzingSEO] = useState(false);
  const [titleAnalysis, setTitleAnalysis] = useState<TitleAnalysis | null>(null);
  const [isAnalyzingTitles, setIsAnalyzingTitles] = useState(false);

  const [aiAssistantMessages, setAiAssistantMessages] = useState<{ role: 'user' | 'model', content: string }[]>([]);
  const [aiAssistantInput, setAiAssistantInput] = useState('');
  const [isAiAssistantLoading, setIsAiAssistantLoading] = useState(false);
  const [previewThumbnail, setPreviewThumbnail] = useState<string>("");
  const [thumbnailVariants, setThumbnailVariants] = useState<string[]>([]);
  const [thumbnailReference, setThumbnailReference] = useState<string | null>(null);
  const [thumbnailReferenceStyle, setThumbnailReferenceStyle] = useState<string | null>(null);
  const [brandingImages, setBrandingImages] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<any[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewBorderColor, setPreviewBorderColor] = useState('#1e293b');
  const [previewChannelColor, setPreviewChannelColor] = useState('#94a3b8');
  const [toneOfVoice, setToneOfVoice] = useState(() => {
    try {
      return safeStorage.getItem('yt_tone_of_voice') || 'Дружелюбный и разговорный';
    } catch {
      return 'Дружелюбный и разговорный';
    }
  });
  const [trendingIdeas, setTrendingIdeas] = useState<GeneratedIdea[]>([]);
  const [ideaSeries, setIdeaSeries] = useState<MiniSeries[]>([]);
  const [savedSEOs, setSavedSEOs] = useState<Record<string, VideoSEO>>({});
  const [isPersistenceLoaded, setIsPersistenceLoaded] = useState(false);
  const [isFirestoreLoaded, setIsFirestoreLoaded] = useState(false);
  const [selectedModel, setSelectedModel] = useState(() => {
    try {
      const saved = safeStorage.getItem('yt_selected_model');
      return (saved && VALID_MODELS.includes(saved)) ? saved : DEFAULT_MODEL;
    } catch {
      return DEFAULT_MODEL;
    }
  });

  const [myChannelVideos, setMyChannelVideos] = useState<ChannelVideoInfo[]>(() => {
    try {
      const raw = safeStorage.getItem('yt_my_channel_videos');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (myChannelVideos && myChannelVideos.length > 0) {
      safeStorage.setItem('yt_my_channel_videos', JSON.stringify(myChannelVideos));
      set('my_channel_videos', myChannelVideos).catch(err => logger.error('IDB save error:', err));
    }
  }, [myChannelVideos]);

  // Load persistence from IDB on mount
  useEffect(() => {
    const loadPersistence = async () => {
      try {
        const savedNicheData = await get('niche_data');
        if (savedNicheData) setNicheData(savedNicheData);

        const savedBranding = await get('selected_branding');
        if (savedBranding) setSelectedBranding(savedBranding);

        const savedIdeas = await get('trending_ideas');
        if (savedIdeas) setTrendingIdeas(savedIdeas);

        const savedSeries = await get('idea_series');
        if (savedSeries) setIdeaSeries(savedSeries);

        const savedBrandingImages = await get('branding_images');
        if (savedBrandingImages) setBrandingImages(savedBrandingImages);

        const savedVideoSEO = await get('video_seo');
        if (savedVideoSEO) setVideoSEO(savedVideoSEO);

        const savedThumbnail = await get('preview_thumbnail');
        if (savedThumbnail) setPreviewThumbnail(savedThumbnail);

        const savedModel = await get('selected_model');
        if (savedModel && VALID_MODELS.includes(savedModel)) setSelectedModel(savedModel);

        const savedBrandProfile = await get('brand_profile');
        if (savedBrandProfile) setBrandProfile(savedBrandProfile);

        const savedAudiencePortrait = await get('audience_portrait');
        if (savedAudiencePortrait) setAudiencePortrait(savedAudiencePortrait);

        const savedSavedSEOs = await get('saved_seos');
        if (savedSavedSEOs) setSavedSEOs(savedSavedSEOs);

        const savedChannelVideos = await get('my_channel_videos');
        if (savedChannelVideos && Array.isArray(savedChannelVideos) && savedChannelVideos.length > 0) {
          setMyChannelVideos(savedChannelVideos);
        }
      } catch (err) {
        logger.error('Failed to load persistence from IDB:', err);
      } finally {
        setIsPersistenceLoaded(true);
      }
    };

    loadPersistence();
  }, []);

  // Save Video SEO to IDB
  useEffect(() => {
    if (videoSEO) {
      set('video_seo', videoSEO).catch(err => logger.error('IDB save error:', err));
    }
  }, [videoSEO]);

  // Save selected model to IDB and localStorage
  useEffect(() => {
    safeStorage.setItem('yt_selected_model', selectedModel);
    set('selected_model', selectedModel).catch(err => logger.error('IDB save error:', err));
  }, [selectedModel]);

  // Save Thumbnail to IDB
  useEffect(() => {
    if (previewThumbnail) {
      set('preview_thumbnail', previewThumbnail).catch(err => logger.error('IDB save error:', err));
    }
  }, [previewThumbnail]);

  // Save branding images to IDB
  useEffect(() => {
    if (Object.keys(brandingImages).length > 0) {
      set('branding_images', brandingImages).catch(err => logger.error('IDB save error:', err));
    }
  }, [brandingImages]);

  // Save niche data to IDB
  useEffect(() => {
    if (nicheData) {
      set('niche_data', nicheData).catch(err => logger.error('IDB save error:', err));
    }
  }, [nicheData]);

  // Save branding to IDB
  useEffect(() => {
    if (selectedBranding) {
      set('selected_branding', selectedBranding).catch(err => logger.error('IDB save error:', err));
    }
  }, [selectedBranding]);


  // Save trending ideas to IDB
  useEffect(() => {
    set('trending_ideas', trendingIdeas).catch(err => logger.error('IDB save error:', err));
  }, [trendingIdeas]);

  // Save idea series to IDB
  useEffect(() => {
    set('idea_series', ideaSeries).catch(err => logger.error('IDB save error:', err));
  }, [ideaSeries]);

  // Save savedSEOs to IDB
  useEffect(() => {
    set('saved_seos', savedSEOs).catch(err => logger.error('IDB save error:', err));
  }, [savedSEOs]);

  // Sync current videoSEO to savedSEOs map
  useEffect(() => {
    if (videoSEO && selectedIdea) {
      setSavedSEOs(prev => {
        if (prev[selectedIdea] && JSON.stringify(prev[selectedIdea]) === JSON.stringify(videoSEO)) {
          return prev;
        }
        return {
          ...prev,
          [selectedIdea]: videoSEO
        };
      });
    }
  }, [videoSEO, selectedIdea]);

  // Load videoSEO from savedSEOs when selectedIdea changes

  // Load videoSEO from savedSEOs when selectedIdea changes
  useEffect(() => {
    if (!isPersistenceLoaded) return;
    if (selectedIdea) {
      const saved = savedSEOs[selectedIdea];
      if (saved) {
        if (JSON.stringify(videoSEO) !== JSON.stringify(saved)) {
          setVideoSEO(saved);
        }
      } else {
        if (videoSEO !== null) {
          setVideoSEO(null);
        }
      }
    } else {
      if (videoSEO !== null) {
        setVideoSEO(null);
      }
    }
  }, [selectedIdea, isPersistenceLoaded]);

  // Load from Firestore on Auth ready
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u: any) => {
      if (u) {
        try {
          const docRef = doc(db, 'ideas_state', u.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data) {
              if (data.trendingIdeas) {
                setTrendingIdeas(data.trendingIdeas);
              }
              if (data.ideaSeries) {
                setIdeaSeries(data.ideaSeries);
              }
              if (data.savedSEOs) {
                setSavedSEOs(data.savedSEOs);
              }
            }
          } else {
            // Seed Firestore with local state on first login if it is already loaded
            if (isPersistenceLoaded && (trendingIdeas.length > 0 || ideaSeries.length > 0 || Object.keys(savedSEOs).length > 0)) {
              await setDoc(docRef, {
                uid: u.uid,
                trendingIdeas,
                ideaSeries,
                savedSEOs,
                updatedAt: new Date().toISOString()
              });
            }
          }
        } catch (err: any) {
          const errMsg = err?.message || String(err);
          const isOffline = !navigator.onLine || 
                            errMsg.toLowerCase().includes('offline') || 
                            errMsg.toLowerCase().includes('network') || 
                            errMsg.toLowerCase().includes('unavailable') ||
                            errMsg.toLowerCase().includes('failed to get document');
          
          if (isOffline) {
            logger.warn('Firestore is offline, falling back to local storage:', errMsg);
          } else {
            logger.error('Failed to load ideas from Firestore:', err);
          }
        } finally {
          setIsFirestoreLoaded(true);
        }
      } else {
        setIsFirestoreLoaded(true);
      }
    });
    return () => unsubscribe();
  }, [isPersistenceLoaded]);

  // Auto-save to Firestore on changes
  useEffect(() => {
    const saveToFirestore = async () => {
      const currentUser = auth?.currentUser;
      if (currentUser && isPersistenceLoaded && isFirestoreLoaded) {
        try {
          const docRef = doc(db, 'ideas_state', currentUser.uid);
          await setDoc(docRef, {
            uid: currentUser.uid,
            trendingIdeas,
            ideaSeries,
            savedSEOs,
            updatedAt: new Date().toISOString()
          });
        } catch (err: any) {
          const errMsg = err?.message || String(err);
          const isOffline = !navigator.onLine || 
                            errMsg.toLowerCase().includes('offline') || 
                            errMsg.toLowerCase().includes('network') || 
                            errMsg.toLowerCase().includes('unavailable');
          
          if (isOffline) {
            logger.warn('Firestore is offline, cloud auto-save suspended:', errMsg);
          } else {
            logger.error('Failed to auto-save ideas to Firestore:', err);
          }
        }
      }
    };

    saveToFirestore();
  }, [trendingIdeas, ideaSeries, savedSEOs, isPersistenceLoaded, isFirestoreLoaded]);


  const [pinnedStyles, setPinnedStyles] = useState<PinnedStyles>({
    imageStyle: false,
    animationType: false,
    audioEnvironment: false,
  });

  // Save brand profile to IDB
  useEffect(() => {
    if (brandProfile) {
      set('brand_profile', brandProfile).catch(err => logger.error('IDB save error:', err));
    }
  }, [brandProfile]);

  // Save audience portrait to IDB
  useEffect(() => {
    if (audiencePortrait) {
      set('audience_portrait', audiencePortrait).catch(err => logger.error('IDB save error:', err));
    }
  }, [audiencePortrait]);

  // Save tone of voice
  useEffect(() => {
    safeStorage.setItem('yt_tone_of_voice', toneOfVoice);
  }, [toneOfVoice]);

  return (
    <AppContext.Provider value={{
      selectedNiche, setSelectedNiche,
      selectedRegion, setSelectedRegion,
      isCustomNiche, setIsCustomNiche,
      customNiche, setCustomNiche,
      nicheData, setNicheData,
      brandProfile, setBrandProfile,
      audiencePortrait, setAudiencePortrait,
      isLoading, setIsLoading,
      isRegeneratingIdeas, setIsRegeneratingIdeas,
      selectedIdea, setSelectedIdea,
      selectedBranding, setSelectedBranding,
      scriptKeywords, setScriptKeywords,
      isRegeneratingScript, setIsRegeneratingScript,
      videoSEO, setVideoSEO,
      seoAnalysis, setSeoAnalysis,
      isGeneratingVideoSEO, setIsGeneratingVideoSEO,
      isAnalyzingSEO, setIsAnalyzingSEO,
      titleAnalysis, setTitleAnalysis,
      isAnalyzingTitles, setIsAnalyzingTitles,
      aiAssistantMessages, setAiAssistantMessages,
      aiAssistantInput, setAiAssistantInput,
      isAiAssistantLoading, setIsAiAssistantLoading,
      previewThumbnail, setPreviewThumbnail,
      thumbnailVariants, setThumbnailVariants,
      thumbnailReference, setThumbnailReference,
      thumbnailReferenceStyle, setThumbnailReferenceStyle,
      brandingImages, setBrandingImages,
      history, setHistory,
      isPreviewLoading, setIsPreviewLoading,
      previewBorderColor, setPreviewBorderColor,
      previewChannelColor, setPreviewChannelColor,
      toneOfVoice, setToneOfVoice,
      trendingIdeas, setTrendingIdeas,
      ideaSeries, setIdeaSeries,
      isPersistenceLoaded,
      selectedModel, setSelectedModel,
      pinnedStyles, setPinnedStyles,
      savedSEOs, setSavedSEOs,
      debugEnabled, setDebugEnabled,
      myChannelVideos, setMyChannelVideos
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
