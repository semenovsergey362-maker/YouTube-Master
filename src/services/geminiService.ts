/**
 * YouTube Master - Gemini AI Service Facade
 * 
 * Modularized AI architecture:
 * - ./ai/aiConfig.ts: Client setup, quota tracking, retry engine, JSON repair & parsing
 * - ./ai/scriptService.ts: Script structures, block generation, hooks, breakdowns, grammar & retention
 * - ./ai/visualPromptService.ts: Visual prompts, scene styles, transitions, palettes & Midjourney / Kling / Runway formulas
 * - ./ai/audioService.ts: Voiceover / TTS markup, Suno & Udio music prompts
 * - ./ai/seoService.ts: SEO metadata, CTR prediction, title optimization, viral triggers & tags
 * - ./ai/channelService.ts: Niche analytics, competitor research, mini-series clusters & audience avatars
 * - ./ai/shortsService.ts: Long-to-Shorts conversion, viral retention loops, Shorts SEO & visuals
 */

export * from "./ai/index";
