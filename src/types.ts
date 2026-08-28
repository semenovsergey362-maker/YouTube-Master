import { z } from "zod";
export * from "./types/schemas";
export * from "./types/domainTypes";

export interface ScriptScene {
  id?: string;
  timeRange?: string;
  blockIndex?: number;
  blockTitle?: string;
  visuals: string;
  audio?: {
    voiceover?: string;
    soundsAndNoises?: string;
    backgroundMusic?: string;
  };
  textOnScreen?: string;
  editingNotes?: string;
  prompt?: string;
}

export interface ScriptBlock {
  title?: string;
  text: string;
  mood?: string;
  musicPrompt?: string;
  scene?: string;
  sampleContext?: string;
  estimatedChars?: number;
  scenes?: ScriptScene[];
}

export interface PromptingState {
  imageStyle?: string;
  animationType?: string;
  cameraMovement?: string;
  lighting?: string;
  aspectRatio?: string;
  negativePrompt?: string;
  customVisualInstructions?: string;
}

export interface PinnedStyles {
  imageStyle: boolean;
  animationType: boolean;
  audioEnvironment: boolean;
}

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

export interface NicheData {
  niche: string;
  ideas: GeneratedIdea[];
  popularIdeas?: any[];
  subNiches?: any[];
  editingTips?: any[];
  analytics?: any;
  audienceData?: any[];
  trendData?: any[];
  potential?: {
    demand?: string | number;
    competition?: string | number;
    monetization?: string | number;
    score?: number;
    summary?: string;
  };
  competitors?: any[];
  seo?: any;
  shorts?: any[];
  scriptTemplate?: any;
  monetizationScore?: number;
  competitionScore?: number;
  trendVelocity?: string;
  targetAudience?: string;
  keyTriggers?: string[];
  recommendedFormats?: string[];
  topKeywords?: string[];
  suggestedChannels?: string[];
  branding?: {
    channelNames?: string[];
    names?: any[];
    slogans?: string[];
    colors?: string[];
    fonts?: string[];
    bannerPrompt?: string;
    banner_prompts?: any;
    logoPrompt?: string;
    logo_prompts?: any;
    logo?: string;
    channel_seo?: any;
  };
}
