import { z } from 'zod';

// ==========================================
// 1. Script & Structure Schemas
// ==========================================

export const ScriptStructureItemSchema = z.object({
  title: z.string().default('Блок сценария'),
  context: z.string().optional().default(''),
  estimatedChars: z.number().optional().default(300),
  estimatedTime: z.string().optional().default('60 сек'),
  goal: z.string().optional().default(''),
});

export const ScriptStructureResponseSchema = z.array(ScriptStructureItemSchema);

export const GeneratedScriptBlockSchema = z.object({
  text: z.string().default(''),
  mood: z.string().optional().default('cinematic'),
  musicPrompt: z.string().optional().default(''),
  scene: z.string().optional().default(''),
  sampleContext: z.string().optional().default(''),
  estimatedChars: z.number().optional().default(0),
});

export const FullGeneratedBlocksSchema = z.record(z.string(), GeneratedScriptBlockSchema);

// ==========================================
// 2. Breakdown / Technical Plan Schemas
// ==========================================

export const SceneAudioSchema = z.object({
  voiceover: z.string().optional().default(''),
  soundsAndNoises: z.string().optional().default(''),
  backgroundMusic: z.string().optional().default(''),
});

export const ScriptBreakdownSceneSchema = z.object({
  id: z.string().optional().default(''),
  timeRange: z.string().optional().default('00:00 - 00:05'),
  blockIndex: z.number().optional().default(0),
  blockTitle: z.string().optional().default(''),
  visuals: z.string().optional().default(''),
  audio: SceneAudioSchema.optional().default({ voiceover: '', soundsAndNoises: '', backgroundMusic: '' }),
  textOnScreen: z.string().optional().default(''),
  editingNotes: z.string().optional().default(''),
  prompt: z.string().optional().default(''),
});

export const ScriptBreakdownResponseSchema = z.array(ScriptBreakdownSceneSchema);

// ==========================================
// 3. Ideas & Strategy Schemas
// ==========================================

export const IdeaClusterItemSchema = z.object({
  title: z.string().default('Идея видео'),
  description: z.string().default(''),
  viralScore: z.number().optional().default(85),
  type: z.enum(['playlist', 'continuation', 'standalone']).optional().default('standalone'),
  targetAudience: z.string().optional().default(''),
  contentFormat: z.string().optional().default(''),
});

export const ContentClusterSchema = z.object({
  categoryName: z.string().default('Категория'),
  categoryDescription: z.string().optional().default(''),
  ideas: z.array(IdeaClusterItemSchema).default([]),
});

export const GeneratedContentPlanSchema = z.object({
  niches: z.array(z.string()).optional().default([]),
  clusters: z.array(ContentClusterSchema).default([]),
});

// ==========================================
// 4. SEO & Metadata Schemas
// ==========================================

export const SeoMetadataSchema = z.object({
  titles: z.array(z.string()).default([]),
  description: z.string().default(''),
  tags: z.array(z.string()).default([]),
  hashtags: z.array(z.string()).default([]),
  pinComment: z.string().optional().default(''),
  clickthroughHook: z.string().optional().default(''),
  targetKeywords: z.array(z.string()).optional().default([]),
});

export const ThumbnailIdeaSchema = z.object({
  conceptTitle: z.string().default('Концепт превью'),
  visualDescription: z.string().default(''),
  textOnThumbnail: z.string().default(''),
  compositionNotes: z.string().optional().default(''),
  colorPalette: z.array(z.string()).optional().default([]),
  imagePrompt: z.string().optional().default(''),
});

export const SeoAnalysisResponseSchema = z.object({
  metadata: SeoMetadataSchema,
  thumbnails: z.array(ThumbnailIdeaSchema).default([]),
});

// ==========================================
// 5. Image & Animation Prompts Schemas
// ==========================================

export const DetailedScenePromptSchema = z.object({
  midjourneyPrompt: z.string().default(''),
  imagePrompt: z.string().default(''),
  videoPrompt: z.string().default(''),
  animationType: z.string().optional().default('pan'),
  cameraMovement: z.string().optional().default('slow zoom'),
  lightingAndAtmosphere: z.string().optional().default('cinematic lighting'),
});

export const MasterMusicPromptSchema = z.object({
  prompt: z.string().default(''),
  genres: z.array(z.string()).optional().default([]),
  moods: z.array(z.string()).optional().default([]),
  instruments: z.array(z.string()).optional().default([]),
  bpm: z.number().optional().default(100),
});

// ==========================================
// 6. TTS & Voice Markup Schema
// ==========================================

export const TTSMarkupResultSchema = z.object({
  markedText: z.string().default(''),
  elevenLabsText: z.string().optional().default(''),
  speechKitText: z.string().optional().default(''),
  notes: z.string().optional().default(''),
});

// ==========================================
// TypeScript Inferred Types
// ==========================================

export type ScriptStructureItem = z.infer<typeof ScriptStructureItemSchema>;
export type GeneratedScriptBlock = z.infer<typeof GeneratedScriptBlockSchema>;
export type ScriptBreakdownScene = z.infer<typeof ScriptBreakdownSceneSchema>;
export type IdeaClusterItem = z.infer<typeof IdeaClusterItemSchema>;
export type ContentCluster = z.infer<typeof ContentClusterSchema>;
export type GeneratedContentPlan = z.infer<typeof GeneratedContentPlanSchema>;
export type SeoMetadata = z.infer<typeof SeoMetadataSchema>;
export type ThumbnailIdea = z.infer<typeof ThumbnailIdeaSchema>;
export type SeoAnalysisResponse = z.infer<typeof SeoAnalysisResponseSchema>;
export type DetailedScenePrompt = z.infer<typeof DetailedScenePromptSchema>;
export type MasterMusicPrompt = z.infer<typeof MasterMusicPromptSchema>;
export type TTSMarkupResult = z.infer<typeof TTSMarkupResultSchema>;
