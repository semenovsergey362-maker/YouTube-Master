export interface GeneratedIdea {
  id?: string;
  title: string;
  description?: string;
  angle?: string;
  viralScore?: number;
  format?: string;
  targetAudience?: string;
  difficulty?: string;
  competitorsCount?: number;
  duration?: string;
  tone?: string;
  viral_potential?: string;
}

export type ContentPlanItem = GeneratedIdea;

export interface BrandProfile {
  colors: string[];
  thumbnailStyle: string;
  primaryFont: string;
  bodyFont: string;
  toneOfVoice: string;
  visualAestheticDescription?: string;
}

export interface ViewerAvatar {
  name: string;
  occupation: string;
  demographics: string;
  coreGoal: string;
  dailyHabits: string;
}

export interface ContentRecommendations {
  narrativeAngle: string;
  hookStrategy: string;
  whatToAvoid: string;
  retentionTriggers: string;
}

export interface AudiencePortrait {
  pains: string[];
  questions: string[];
  values: string[];
  avatar: ViewerAvatar;
  recommendations: ContentRecommendations;
}

export interface AnalysisSource {
  type: 'url_or_text' | 'file';
  name: string;
  content?: string;
  mimeType?: string;
  data?: string;
}

export interface ChannelVideoInfo {
  title: string;
  description?: string;
  viewCount?: number | string;
  publishedAt?: string;
  id?: string;
}

export interface AnalysisOptions {
  deepResearch?: boolean;
  sources?: AnalysisSource[];
  toneOfVoice?: string;
  brandProfile?: BrandProfile;
  audiencePortrait?: AudiencePortrait;
  model?: string;
  noVoiceover?: boolean;
  referenceImages?: File[];
  youtubeLinks?: string[];
  customInstructions?: string;
  customInstruction?: string;
  branding?: any;
  globalMusicMood?: string;
  ideaDescription?: string;
  ideaNote?: string;
  globalAudioPrompt?: string;
  emotionalArcStage?: string;
  isScript?: boolean;
  bypassCache?: boolean;
  region?: string;
  veoSfxEnabled?: boolean;
  existingChannelVideos?: ChannelVideoInfo[];
}

export interface VideoSEO {
  title: string;
  titleVariants?: string[];
  description: string;
  keywords: string;
  hashtags?: string[];
  pinnedComment?: string;
  category?: string;
  targetAudience?: string;
  score?: number;
}

export interface SEOAnalysis {
  score: number;
  analysis: string;
  improvements: {
    area: string;
    suggestion: string;
    suggestedValue: string;
    impact: 'high' | 'medium' | 'low';
  }[];
  keywords?: {
    highFrequency: string[];
    lowFrequency: string[];
  };
  googleSearchTips?: string[];
}

export interface TextVariation {
  text: string;
  reason: string;
}

export interface PromotionStrategy {
  strategy: string;
  description: string;
  actionableSteps: string[];
}

export interface StrategySuggestion {
  title: string;
  priority: "Высокий" | "Средний" | "Низкий";
  impact: string;
  description: string;
  actionSteps: string[];
}

export interface ChannelStrategyResult {
  currentStageName: string;
  currentStageDesc: string;
  metricsAnalysis: {
    viewsPerVideoComment: string;
    subConversionComment: string;
    overallHealthScore: number;
  };
  strategicSuggestions: StrategySuggestion[];
  contentPillars: {
    title: string;
    description: string;
  }[];
  uploadConsistencyPlan: string;
}

export interface SceneBreakdown {
  scene?: string;
  description: string;
  text?: string;
  shotType?: string;
  duration?: number;
  timecode?: string;
  timeRange?: string;
  voiceover?: {
    voiceName?: string;
    settings?: string;
    intonation?: string;
    mood?: string;
    timbre?: string;
  };
  audio?: {
    soundsAndNoises?: string;
    backgroundMusic?: string;
  };
  visuals?: {
    description?: string;
    searchQuery?: string;
    shotType?: string;
    resourceLinks?: Array<{ name: string; url: string; }>;
  };
  blockIndex?: number;
  blockTitle?: string;
  animationInstructions?: string;
  sfx?: string;
}

export interface ScriptBlockStructure {
  title: string;
  type: string;
  estimatedTime: string;
  estimatedChars: number;
  description: string;
}

export interface GeneratedBlock {
  title?: string;
  text: string;
  scenes?: any[];
  sfx?: string;
  mood?: string;
  soundLinks?: string[];
  wordCount?: number;
  musicPrompt?: string;
  scene?: string;
  sampleContext?: string;
}

export interface ScriptImprovement {
  improvement: string;
  reason: string;
  example: string;
  metricEffect?: string;
  isCustom?: boolean;
}

export interface SentimentPoint {
  label: string;
  score: number; // 0 - 100 representing emotional intensity / dynamic pace
  description: string;
}

export interface ConvertedShortsVariant {
  hookType: string;
  hookText: string;
  bodyText: string;
  callToAction: string;
  estimatedDuration: string;
  whyItWorks: string;
}

export interface ThumbnailEmotionAnalysis {
  overallCTRScore: number;
  estimatedCTRRange: string;
  primaryEmotion: string;
  emotionBreakdown: {
    joy: number; // Радость / Позитив
    urgency: number; // Тревога / FOMO / Напряжение
    curiosity: number; // Любопытство / Интрига
    surprise: number; // Удивление / Шок
    trust: number; // Доверие / Экспертность
  };
  emotionalImpactVerdict: string;
  strengths: string[];
  weaknesses: string[];
  ctrActionableTips: string[];
}

export interface ShortsSEO {
  titles: string[];
  description: string;
  hashtags: string[];
  keywords: string[];
  pinnedComment: string;
}

export interface TransitionPrompt {
  transitionType: string;
  transitionSummary: string;
  visualPrompt: string;
  animationPrompt: string;
}

export interface TitleAnalysis {
  analysis: string;
  alternatives: string[];
}

export interface ThumbnailStyleSuggestion {
  name: string;
  desc: string;
  colors: string[];
  prompt: string;
}

export interface GoogleSearchGroundingSource {
  title: string;
  url: string;
  snippet?: string;
}

export interface GoogleSearchIdeasResult {
  searchQuery: string;
  summary: string;
  sources: GoogleSearchGroundingSource[];
  ideas: GeneratedIdea[];
}

export interface ImportedYouTubeVideoData {
  videoUrl: string;
  videoId?: string;
  title: string;
  description: string;
  channelName: string;
  tags: string[];
  keyTopics: string[];
  summary: string;
  suggestedIdeas: GeneratedIdea[];
  sources: GoogleSearchGroundingSource[];
}

export interface CompetitorVideo {
  title: string;
  views: string;
  publishedAt: string;
  viralFactor: string;
  hookAnalysis: string;
}

export interface CompetitorChannel {
  name: string;
  subs: string;
  desc: string;
  weakness: string;
  strategy: string;
  engagement: number;
  topVideos: CompetitorVideo[];
  channelUrl?: string;
}

export interface EvergreenNicheTrend {
  name: string;
  evergreenScore: number;
  demandScore: number;
  competitionScore: number;
  subNiches: {
    name: string;
    description: string;
    potentialScore: number;
    trendType: "rising" | "stable";
  }[];
}

export interface CompetitorResearchResult {
  competitors: CompetitorChannel[];
  evergreenTrends: EvergreenNicheTrend[];
  suggestedActionPlan: string[];
}

export interface SeriesEpisode {
  episodeNumber: number;
  title: string;
  description: string;
  duration?: string;
  tone?: string;
  viral_potential?: string;
  previousBridge?: string;
  nextBridge?: string;
  nextTeaserScript: string;
  teaserHookType?: string;
  ctaToNextEpisode?: string;
}

export interface MiniSeries {
  id: string;
  seriesTitle: string;
  topicBranch: string;
  description: string;
  targetAudienceGoal: string;
  episodes: SeriesEpisode[];
  createdAt?: string;
}

export interface RetentionPointFix {
  type: 'question' | 'sfx' | 'visual_shift' | 'story' | 'interactive';
  typeLabel: string;
  title: string;
  description: string;
  actionableSnippet: string;
}

export interface RetentionPoint {
  timeSec: number;
  timeLabel: string;
  retentionPercent: number;
  blockIndex: number;
  blockTitle: string;
  isDip: boolean;
  dipReason?: string;
  dropAmount?: number;
  proposedFix?: RetentionPointFix;
}

export interface RetentionAnalysisResult {
  overallScore: number;
  avgRetentionPercent: number;
  expectedWatchTimeSeconds: number;
  summary: string;
  points: RetentionPoint[];
  dipsCount: number;
}

export interface ShortsRetentionPoint {
  timeRange: string;
  topicPhase: string;
  retentionPercent: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  topicFeedback: string;
  recommendation: string;
}

export interface ShortsTopicRetentionAnalysis {
  overallScore: number;
  retentionGrade: string;
  summary: string;
  dropOffRisks: string[];
  topicPacingRating: string;
  timeline: ShortsRetentionPoint[];
  keyRecommendations: string[];
}

export interface OptimizedShortsScriptResult {
  optimizedScript: string;
  optimizedHook: string;
  changesSummary: string[];
  expectedRetentionGain: string;
}

export interface CutShortItem {
  title: string;
  hook: string;
  script: string;
  viral_potential: string;
  duration: string;
  loopEnding?: LoopEndingResult;
  seo?: ShortsSEO;
  retentionAnalysis?: ShortsTopicRetentionAnalysis;
  optimizedResult?: OptimizedShortsScriptResult;
}

export interface LoopEndingResult {
  originalBeginning: string;
  loopEndingPhrase: string;
  loopedFullScript: string;
  explanation: string;
}

export interface IdeaDeepAnalysis {
  uniquenessScore: number;
  uniquenessLabel: string;
  uniquenessAnalysis: string;
  competitiveAngle: string;
  complexityScore: number;
  complexityLabel: string;
  complexityBreakdown: {
    research: string;
    production: string;
    editing: string;
    resources: string[];
  };
  targetAudienceInsights: string;
  retentionTriggers: string[];
  recommendations: string[];
}

export interface ShortsCtrAnalysisResult {
  ctrScore: number;
  hookStrength: "высокая" | "средняя" | "низкая" | string;
  emotion: string;
  competitiveness: string;
  retentionPrediction?: string;
  critique?: string;
  suggestedTitles: Array<{
    title: string;
    type?: string;
    ctrIncrease?: string;
  }>;
  firstLineSuggestion?: string;
  ctrTriggers?: string[];
  stopWordsDetected?: string[];
}

export interface ShortsHashtagsResult {
  hashtags: string[];
  formattedString: string;
  viralHashtags?: string[];
  nicheHashtags?: string[];
  topicHashtags?: string[];
  explanation?: string;
}

