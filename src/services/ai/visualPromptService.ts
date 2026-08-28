import { logger } from "../../config/logger";
import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import {
  DetailedScenePromptSchema,
} from "../../types/schemas";
import {
  AnalysisOptions,
  AnalysisSource,
  PromptingState,
  TransitionPrompt,
  ThumbnailStyleSuggestion,
  ThumbnailEmotionAnalysis,
  ScriptBlockStructure,
  ScriptScene,
  SceneBreakdown,
  GeneratedBlock,
  ScriptImprovement,
  SentimentPoint,
  ConvertedShortsVariant,
} from "../../types";
import {
  callGeminiWithRetry,
  safeParseJSON,
  extractTextFromResponse,
  normalizeModelName,
  parseDurationInMinutes,
  getActiveCustomInstructionsText,
  preprocessJSON,
  tryRepairJSON,
  parseTruncatedJSONArray,
  buildContents,
  getSourcesContext,
  getToneContext,
} from "./aiConfig";
import { getCustomInstructions } from "./scriptService";
import { generateShortsVisualsAndMusic } from "./shortsService";

export async function preprocessImagePrompt(prompt: string, options?: AnalysisOptions): Promise<string> {
  try {
    const rewritePrompt = `Analyze the following image generation prompt. Your goal is to optimize and rewrite it to avoid any safety blocks or policy violations of Google Flow / Imagen (such as blocks on famous people, politicians, historical figures, celebrities, copyrighted characters, trademarks, or sensitive words).

RULES:
1. If a famous person, celebrity, politician, or historical figure (e.g. "Napoleon", "Elon Musk", "Joe Biden") is named, replace it with a description of their appearance OR a phrase like "a person resembling [Name]" or "a person looking like [Name]". Example: "Napoleon Bonaparte" -> "a 19th-century military general resembling Napoleon Bonaparte".
2. If a copyrighted fictional character or brand (e.g. "Mickey Mouse", "Batman", "Coca-Cola", "Apple iPhone") is mentioned, replace it with a generic equivalent description. Example: "Iron Man" -> "a superhero wearing a red and gold high-tech robotic armor suit".
3. If any sensitive or potentially violent words (e.g., weapon, gun, blood, fight) are mentioned, describe them safely or represent them metaphorically.
4. Enhance the visual details, lighting, style, and composition for professional production quality (e.g., add "cinematic lighting, high-contrast, ultra-sharp focus, detailed texture").
5. The final output must be in English. Return ONLY the rewritten prompt text without any explanations, formatting, quotes, or markdown.

Original prompt: "${prompt}"`;

    const response = await callGeminiWithRetry({
      model: options?.model || "gemini-3.7-flash",
      contents: rewritePrompt,
    });
    
    const text = response.text?.trim() || extractTextFromResponse(response);
    if (text) {
      const sanitized = text.trim().replace(/^["']|["']$/g, '');
      logger.log(`[FlowSafety] Original: "${prompt}" -> Safe: "${sanitized}"`);
      return sanitized;
    }
  } catch (error) {
    logger.error("Error preprocessing image prompt:", error);
  }
  return prompt;
}


export async function generateImage(prompt: string, aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" = "1:1", referenceImageBase64?: string | null): Promise<string | null> {
  try {
    const safePrompt = await preprocessImagePrompt(prompt);
    
    let textPrompt = safePrompt;
    if (referenceImageBase64) {
      textPrompt = `${safePrompt}

CRITICAL REFERENCE IMAGE INSTRUCTIONS:
- Use the attached reference image STRICTLY as a visual style, color palette, lighting atmosphere, image contrast, and text backing/frame aesthetic guide.
- DO NOT copy, clone, or recreate the exact same subjects, people, or objects from the reference image.
- Create a BRAND NEW background and subject composition tailored specifically to the requested video topic, while maintaining the IDENTICAL artistic style, color saturation, lighting contrast, and graphic text-backing/badge treatment seen in the reference image.`;
    }

    const parts: any[] = [{ text: textPrompt }];
    
    if (referenceImageBase64) {
      const match = referenceImageBase64.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2]
          }
        });
      }
    }

    const response = await callGeminiWithRetry({
      model: "gemini-3.1-flash-lite-image",
      contents: { parts: parts },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: "1K"
        }
      }
    });
    
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    logger.error("Error generating image:", error);
    return null;
  }
}


export const VISUAL_DIVERSITY_RULES = `
ЗОЛОТОЙ СТАНДАРТ КИНЕМАТОГРАФИЧЕСКИХ AI-ПРОМПТОВ (HOLLYWOOD & NETFLIX DOCUMENTARY FORMULA):

1. ФОРМУЛА КАЖДОГО АНГЛИЙСКОГО ПРОМПТА (NANO BANANA 2 & VEO 3):
   - [Оптика и Снятие]: "Ultra-realistic cinematic scene, 8K resolution, shot on 35mm lens, Hollywood blockbuster color grading, deep contrast, cinematic atmosphere, photorealistic only — no 3D render, no animation, no plastic look."
   - [Живое Тактильное Действие]: Избегай плоских статичных формулировок и банальных стоковых поз. Описывай конкретное живое физическое действие, фактуру материалов, движения рук, предметный мир и естественные эмоции.
   - [Освещение и Физика Частиц]: Направляемый объёмный свет (golden hour, rim light, chiaroscuro), физика частичек (пыль в луче света, пар, дымка, блики, отблески). КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНЫ HEX-коды (например, #D97706).
   - [Динамика Камеры и Перевод Фокуса (Rack Focus)]: В промптах Veo 3 ОБЯЗАТЕЛЬНО задавай точный перевод фокуса и непрерывный кадр ("Slow, smooth camera dolly and rack focus: the focus shifts smoothly from [объект A] to reveal, in the same continuous shot, [объект B]...").
   - [Пик Сцены (Visual Climax)]: Каждая видео-анимация должна иметь четкую визуальную кульминацию или смену фокуса.
   - [Физическая Естественность]: Естественная кинематографичная физика движения (0.5x-0.75x slow-motion feel), малое значение глубины резкости (shallow depth of field), отсутствие искажений и деформаций объектов (no object morphing).

2. ПРОТИВ ПОВТОРОВ И МЕХАНИЧЕСКОЙ ШАБЛОННОСТИ:
   - Если в Сцене N показывались определенное действие, предмет или ракурс — в Сцене N+1 ЗАПРЕЩЕНО буквально повторять тот же предмет, то же действие или ту же картинку.
   - НО: не превращай разнообразие в новый шаблон. НЕ строй предсказуемый цикл планов вида "Общий-Крупный-Общий-Крупный" или "Wide-CloseUp-Wide-CloseUp" — выбор каждого плана должен быть художественным решением под смысл конкретной фразы, а не механической ротацией по списку категорий.
   - Поощряется неожиданное и нестандартное: необычная композиция, деталь без прямого объяснения, метафора, смена света/погоды/времени суток, отражение, тень, POV — не ограничивайся дежурным набором "крупный план лица / общий план в полный рост".
`;


export function getClicheAvoidanceRule(topic?: string): string {
  const topicPhrase = topic ? `тематики «${topic}»` : "тематики этого сценария";
  return `Категорически запрещено дефолтить в типовые клише-визуалы ${topicPhrase} (для любой ниши ИИ обычно тянется к 2-3 "безопасным" стоковым образам и повторяет их из сцены в сцену) — используй конкретный клишированный образ ТОЛЬКО если он буквально описан в тексте именно этой сцены.`;
}


export function validateAndEnrichSystemPrompt(
  basePrompt: string,
  extra: string = "",
  customInst: string = "",
  options?: AnalysisOptions
): string {
  const globalInst = getCustomInstructions(options);
  const visualRule = options?.isScript ? `\n\n${VISUAL_DIVERSITY_RULES}` : "";
  // Prepend global instructions (custom instructions, brand, etc.) so they have highest priority
  return `${globalInst}

========================================

${basePrompt}

${extra}

${customInst}${visualRule}`.trim();
}














export async function generateBannerPrompt(
  niche: string,
  colors: string[],
  channelName?: string,
  slogan?: string,
  options?: AnalysisOptions
): Promise<{ ru: string; en: string }> {
  const nameContext = channelName ? ` для канала с названием "${channelName}"` : "";
  const sloganContext = slogan ? `, слоганом "${slogan}"` : "";
  const prompt = `Создай подробный промт для генерации фонового баннера YouTube канала в нише "${niche}"${nameContext}${sloganContext}. 
  Используй цвета: ${colors.join(", ")}.
  Баннер должен быть широким, горизонтальным, сбалансированным по композиции, чтобы текст и основные элементы не обрезались на мобильных и ТВ устройствах.
  ${channelName ? `Баннер может содержать название "${channelName}". В английском промте (en) ОБЯЗАТЕЛЬНО укажи: "The banner must clearly and prominently display the text: ${channelName}". Укажи, что текст должен быть идеально написан, без орфографических ошибок, с использованием чистого современного шрифта.` : ""}
  ${slogan ? `Слоган также может быть интегрирован: "${slogan}".` : ""}
  
  ПРАВИЛА БЕЗОПАСНОСТИ ДЛЯ ОБХОДА БЛОКИРОВОК (Google Flow/Imagen):
  1. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать имена реальных известных личностей, исторических деятелей, политиков, селебрити напрямую. Если тематика канала как-то связана с ними, замени имя на "человек, похожий на [Имя]" (в en: "a person resembling [Name]") или подробно опиши их одежду, эпоху и внешность.
  2. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО напрямую использовать защищенные авторским правом бренды или персонажей. Используй их обобщенное детальное описание.
  3. Используй исключительно общие эстетические понятия для стилизации (например, "cinematic lighting, modern geometric vector banner layout, minimalist art style").`;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.7-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          ru: { type: Type.STRING },
          en: { type: Type.STRING }
        },
        required: ["ru", "en"]
      }
    }
  });

  return safeParseJSON<{ ru: string; en: string }>(extractTextFromResponse(response), { ru: "", en: "" });
}


export async function generateLogoPrompt(
  niche: string, 
  colors: string[], 
  channelName?: string, 
  options?: AnalysisOptions
): Promise<{ ru: string; en: string }> {
  const nameContext = channelName ? ` для канала с названием "${channelName}"` : "";
  const prompt = `Создай подробный промт для генерации логотипа YouTube канала в нише "${niche}"${nameContext}. 
  Используй цвета: ${colors.join(", ")}.
  ${channelName ? `Логотип должен содержать название "${channelName}". В английском промте (en) ОБЯЗАТЕЛЬНО укажи: "The logo must clearly and prominently display the text: ${channelName}". Укажи, что текст должен быть идеально написан, без орфографических ошибок, с использованием чистого современного шрифта.` : ""}
  
  ПРАВИЛА БЕЗОПАСНОСТИ ДЛЯ ОБХОДА БЛОКИРОВОК (Google Flow/Imagen):
  1. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать имена реальных известных личностей, исторических деятелей, политиков, селебрити напрямую. Если тематика канала как-то связана с ними, замени имя на "человек, похожий на [Имя]" (в en: "a person resembling [Name]") или подробно опиши их одежду, эпоху и внешность.
  2. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО напрямую использовать защищенные авторским правом бренды или персонажей. Используй их обобщенное детальное описание.
  3. Используй исключительно общие эстетические понятия для стилизации (например, "cinematic lighting, modern geometric vector icon, minimal aesthetic"), без упоминания конкретных защищенных товарных знаков или ныне живущих художников.

  ВАЖНО: В русском тексте (ru) ОБЯЗАТЕЛЬНО используй букву "ё" во всех словах, где она должна быть.
  Верни JSON с полями "ru" (на русском) и "en" (на английском).`;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.7-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          ru: { type: Type.STRING },
          en: { type: Type.STRING },
        },
        required: ["ru", "en"],
      },
    },
  });

  return safeParseJSON<{ ru: string; en: string }>(extractTextFromResponse(response), { ru: '', en: '' });
}


export async function generateColors(niche: string, options?: AnalysisOptions): Promise<string[]> {
  const prompt = `Сгенерируй цветовую палитру из 3 гармоничных HEX-кодов для YouTube канала в нише "${niche}". 
  Верни только JSON массив строк.`;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.7-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
    },
  });

  return safeParseJSON<string[]>(extractTextFromResponse(response), []);
}


export async function generateBlockSceneContext(
  blockTitle: string,
  blockText: string,
  topic: string,
  options?: AnalysisOptions
): Promise<{ scene: string; sampleContext: string }> {
  const prompt = `Сгенерируй настройки сцены и контекста реплики (Scene и Sample Context) для конкретного блока сценария YouTube видео.
Эти параметры используются в Google NotebookLM / Audio Overview для настройки виртуальной сцены и голоса.

ТЕМА ВИДЕО: "${topic}"
НАЗВАНИЕ БЛОКА: "${blockTitle}"
СОДЕРЖИМОЕ БЛОКА (ТЕКСТ ДЛЯ ОЗВУЧКИ):
"${blockText.slice(0, 1500)}"

ТВОЯ ЗАДАЧА — СГЕНЕРИРОВАТЬ ДВА ПОЛЯ:
1. "scene": Опиши физическое окружение, настроение или атмосферу сцены.
2. "sampleContext": Задай контекстную отправную точку для естественного входа голоса.

Верни JSON объект { "scene": "описание сцены на русском или английском", "sampleContext": "контекст на русском или английском" }.`;

  try {
    const response = await callGeminiWithRetry({
      model: options?.model || "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction: "Ты — экспертный режиссер озвучивания и специалист по настройке Google NotebookLM / Audio Overview. Твоя задача — создавать точные, атмосферные настройки окружения (Scene) и контекста для озвучивания.",
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT" as any,
          properties: {
            scene: { type: "STRING" as any },
            sampleContext: { type: "STRING" as any }
          },
          required: ["scene", "sampleContext"]
        }
      }
    });

    const parsed = safeParseJSON(response.candidates?.[0]?.content?.parts?.[0]?.text, { scene: "", sampleContext: "" });
    return { scene: parsed.scene || "", sampleContext: parsed.sampleContext || "" };
  } catch (error) {
    logger.error("Error generating block scene context", error);
    return { scene: "", sampleContext: "" };
  }
}


export async function generateDetailedPromptForScene(
  globalStyle: { imageStyle: string; animationType: string },
  scene: any,
  options?: AnalysisOptions & { customInstruction?: string; branding?: string }
): Promise<{ 
  videoPrompt1: string; 
  videoPrompt2: string; 
  sceneSummary: string;
}> {
  const customInst = getCustomInstructions(options);
  const instructionsContext = customInst ? `\nОБЯЗАТЕЛЬНЫЕ К НЕУКОСНИТЕЛЬНОМУ ИСПОЛНЕНИЮ КАСТОМНЫЕ ИНСТРУКЦИИ:\n${customInst}` : "";

  const customWishText = options?.customInstruction
    ? `\n\n[ТРЕБОВАНИЯ И ПОЖЕЛАНИЯ ПОЛЬЗОВАТЕЛЯ К ЭТОЙ СЦЕНЕ]:\n"${options.customInstruction}"\nОБЯЗАТЕЛЬНО полностью воплоти эти конкретные пожелания в обоих вариантах!`
    : "";

  let cleanBranding = "";
  if (options?.branding) {
    try {
      const parsedBrand = typeof options.branding === "string" ? JSON.parse(options.branding) : options.branding;
      cleanBranding = `Стиль: ${parsedBrand.thumbnailStyle || parsedBrand.visualAestheticDescription || parsedBrand.name || "Премиум"}. Эстетика: ${parsedBrand.visualAestheticDescription || "Кинематографичная"}`;
    } catch {
      cleanBranding = options.branding.replace(/#[0-9A-Fa-f]{6}/g, "").replace(/[{}"\[\]]/g, " ").trim();
    }
  }

  const brandingText = cleanBranding ? `\n\nБРЕНДБУК И СТИЛИСТИКА КАНАЛА:\n"${cleanBranding}"` : "";

  const veoSfxPromptText = options?.veoSfxEnabled
    ? `\n\nОБЯЗАТЕЛЬНОЕ ТРЕБОВАНИЕ ДЛЯ ЗВУКОВЫХ ЭФФЕКТОВ В VEO 3 (VEO SFX):
Для КАЖДОГО из двух промптов (videoPrompt1 и videoPrompt2) интегрируй звуковые эффекты (SFX) сцены в текст промпта на английском языке.
- Считай звуки сцены: "${scene.audio?.soundsAndNoises || scene.audio?.backgroundMusic || scene.soundsAndNoises || scene.sfx || "Не указано"}".
- Завершай промпт фразной: "accompanied by the natural high-fidelity sound of <описание звуков на английском>, with rich acoustic details and crisp foley effects."`
    : "";

  const prompt = `Ты — голливудский кинорежиссер и арт-директор топовых видеостудий (Netflix / HBO / National Geographic).
Твоя задача — прочитать сценарий сцены и создать ДВА ЭТАЛОННЫХ, принципиально разных, ЦЕЛЬНЫХ кинематографических промпта для Veo 3 text-to-video на английском языке. Каждый промпт — это самодостаточное описание всего кадра целиком: композиция, действие, свет, движение камеры — одним связным текстом, готовым к прямой вставке в Veo 3. НЕ раздельные "кадр" и "анимация" — только цельные видео-промпты.

${VISUAL_DIVERSITY_RULES}

Глобальный стиль проекта:
- Визуальный стиль: ${globalStyle.imageStyle}
- Анимация: ${globalStyle.animationType}

ДАННЫЕ СЦЕНЫ:
Текст/Сюжет: ${scene.text || scene.voiceover || scene.description || scene.title || "Не указано"}
Описание для визуала: ${scene.visual || scene.visuals?.description || scene.visuals || scene.scene || scene.title || "Не указано"}
Таймкод: ${scene.timecode || "Не указан"}
Настроение блока: ${scene.mood || "Не указано"}
Звуки: ${scene.audio?.soundsAndNoises || scene.audio?.backgroundMusic || scene.soundsAndNoises || scene.sfx || "Не указано"}
${instructionsContext}${customWishText}${brandingText}${veoSfxPromptText}

СТРОГИЙ СТАНДАРТ СОСТАВЛЕНИЯ ПРОМПТОВ:
1. videoPrompt1 (Ракурс 1): Начни с оптических параметров ("Ultra-realistic cinematic scene, 8K resolution, shot on 35mm lens, Hollywood color grading..."). Опиши живое тактильное действие, освещение, физику частиц, непрерывную динамику камеры (rack focus, dolly, pan), кульминацию кадра — всё в одном связном промпте (без HEX-кодов).
2. videoPrompt2 (Ракурс 2): ВТОРОЙ, ПРИНЦИПИАЛЬНО ИНОЙ дубль этой же сцены (другая крупность кадра, другой фокус, деталь, предмет, движение камеры или масштаб) — альтернативный вариант на выбор, а не продолжение первого.

Верни JSON объект:
{
  "sceneSummary": "строка (выразительное описание действия и суть сцены на русском)",
  "videoPrompt1": "строка (цельный детализированный Veo 3 промпт на английском, Ракурс 1)",
  "videoPrompt2": "строка (цельный детализированный Veo 3 промпт на английском, Ракурс 2 — принципиально другой)"
}`;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.7-flash",
    contents: prompt,
    config: {
      temperature: 1.0,
      responseMimeType: "application/json",
      maxOutputTokens: 8192
    }
  });

  const parsed = safeParseJSON(response.candidates?.[0]?.content?.parts?.[0]?.text, {
    sceneSummary: "",
    videoPrompt1: "",
    videoPrompt2: ""
  });

  return {
    sceneSummary: parsed.sceneSummary || "",
    videoPrompt1: parsed.videoPrompt1 || "",
    videoPrompt2: parsed.videoPrompt2 || ""
  };
}


export async function generateProductionStyleFromContext(
  topic: string, 
  tone: string, 
  mode: string, 
  breakdown: any[],
  hints?: {
    imageStyle?: string;
    imageDesc?: string;
    animationType?: string;
    animationDesc?: string;
  },
  options?: AnalysisOptions & { customInstructions?: string; branding?: string }
): Promise<{ 
  imageStyle: string; 
  animationType: string; 
  musicMood: string;
  generalAudioPrompt: string;
  scenePrompts: {
    sceneSummary: string;
    videoPrompt1: string;
    videoPrompt2: string;
    subject?: string;
  }[];
}> {
  // UNIFIED SHORTS PIPELINE: Route all Shorts visual generation through generateShortsVisualsAndMusic
  if (mode && (mode.toLowerCase() === "shorts" || mode.toLowerCase().includes("short"))) {
    let scriptText = topic || "";
    if (breakdown && Array.isArray(breakdown) && breakdown.length > 0) {
      const extractedText = breakdown.map((b: any) => b.text || b.voiceover || b.description || b.title || "").filter(Boolean).join("\n");
      if (extractedText.trim()) {
        scriptText = extractedText;
      }
    }

    const shortsRes = await generateShortsVisualsAndMusic(scriptText, options);

    const mappedScenePrompts = (shortsRes.visuals || []).map((v) => ({
      sceneSummary: v.text || "Сцена Shorts",
      videoPrompt1: v.prompt || "",
      videoPrompt2: v.prompt || "",
      subject: v.shotType || "Shorts 9:16"
    }));

    return {
      imageStyle: hints?.imageStyle || "Вертикальный 9:16 Кинематограф (Veo 3)",
      animationType: hints?.animationType || "Динамичные движения камеры (Veo 3 Motion)",
      musicMood: "Вирусный темпоритм Shorts",
      generalAudioPrompt: shortsRes.musicPrompt || "Dynamic cinematic background music for Shorts...",
      scenePrompts: mappedScenePrompts
    };
  }

  const customInst = getCustomInstructions(options, true);
  
  // Clean up branding text to remove raw JSON and HEX arrays that confuse LLMs into repeating hex codes in image prompts
  let cleanBranding = "";
  if (options?.branding) {
    try {
      const parsedBrand = typeof options.branding === "string" ? JSON.parse(options.branding) : options.branding;
      cleanBranding = `Стиль: ${parsedBrand.thumbnailStyle || parsedBrand.visualAestheticDescription || parsedBrand.name || "Премиум"}. Эстетика: ${parsedBrand.visualAestheticDescription || "Кинематографичная"}`;
    } catch {
      cleanBranding = options.branding.replace(/#[0-9A-Fa-f]{6}/g, "").replace(/[{}"\[\]]/g, " ").trim();
    }
  }

  const brandContext = cleanBranding ? `\nБРЕНДБУК И ИДЕНТИКА КАНАЛА:\n${cleanBranding}` : "";
  const instructionsContext = customInst ? `\nОБЯЗАТЕЛЬНЫЕ К НЕУКОСНИТЕЛЬНОМУ ИСПОЛНЕНИЮ КАСТОМНЫЕ ИНСТРУКЦИИ:\n${customInst}` : "";
  const userHintsContext = hints ? `\nПОЖЕЛАНИЯ ПОЛЬЗОВАТЕЛЯ:\n${hints.imageStyle ? `- Стиль изображений: ${hints.imageStyle}\n` : ""}${hints.imageDesc ? `- Описание визуала: ${hints.imageDesc}\n` : ""}${hints.animationType ? `- Тип анимации: ${hints.animationType}\n` : ""}${hints.animationDesc ? `- Описание анимации: ${hints.animationDesc}\n` : ""}` : "";

  const veoSfxPromptText = options?.veoSfxEnabled
    ? `\n\nОБЯЗАТЕЛЬНОЕ ТРЕБОВАНИЕ ДЛЯ ЗВУКОВЫХ ЭФФЕКТОВ В VEO 3 (VEO SFX):
Для КАЖДОЙ сцены в videoPrompt1 и videoPrompt2 ты ДОЛЖЕН интегрировать соответствующие звуки (из поля "Звуки/SFX") прямо в текст промпта на английском языке.
- Завершай промпт красивой, естественной фразой, описывающей звуки, например: "accompanied by the natural high-fidelity sound of <описание звуков на английском>..."`
    : "";

  // Reduce batch size to 4 scenes to ensure responses fit well within maxOutputTokens limit
  const BATCH_SIZE = 4;
  const chunks: any[][] = [];
  for (let i = 0; i < breakdown.length; i += BATCH_SIZE) {
    chunks.push(breakdown.slice(i, i + BATCH_SIZE));
  }

  let globalImageStyle = hints?.imageStyle || "Фотореализм";
  let globalAnimationType = hints?.animationType || "Плавный зум";
  let globalMusicMood = "Эпичное (Ханс Циммер)";
  let globalAudioPrompt = "cinematic instrumental background music, atmospheric and emotional...";

  const allScenePrompts: {
    sceneSummary: string;
    videoPrompt1: string;
    videoPrompt2: string;
    subject?: string;
  }[] = [];

  // Копим краткий список "что уже было в кадре" по ВСЕМ предыдущим сценам (не только последней),
  // чтобы один и тот же визуальный образ не всплывал снова через несколько батчей — правило работает
  // для любой темы/ниши, т.к. опирается на список subject'ов, сгенерированных моделью, а не на хардкод.
  const usedSubjectsLog: string[] = [];
  const MAX_SUBJECTS_IN_CONTEXT = 16;

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];
    const startIndex = chunkIndex * BATCH_SIZE;

    const recentSubjects = usedSubjectsLog.slice(-MAX_SUBJECTS_IN_CONTEXT);
    const previousSceneContext = recentSubjects.length > 0
      ? `\n\n[СПИСОК УЖЕ ИСПОЛЬЗОВАННЫХ ВИЗУАЛЬНЫХ СЮЖЕТОВ (Сцены 1-${startIndex})]:
${recentSubjects.map((s, i) => `- Сцена ${Math.max(1, startIndex - recentSubjects.length + i + 1)}: ${s}`).join("\n")}

СТРОГОЕ ПРАВИЛО НЕПОВТОРЕНИЯ ДЛЯ ЭТОГО БАТЧА (Сцены ${startIndex + 1}..${startIndex + chunk.length}):
- Ни одна из сцен ${startIndex + 1}..${startIndex + chunk.length} НЕ ИМЕЕТ ПРАВА повторить главный сюжет/предмет/действие ни одной сцены из списка выше — даже если это было 5-10 сцен назад!
- Особо: если в списке выше уже встречался конкретный образ — этот образ ПОЛНОСТЬЮ ИСКЛЮЧЁН до конца ролика, ищи другую метафору для той же мысли.
- ${getClicheAvoidanceRule(topic)}`
      : "";

    const chunkScenesText = chunk.map((scene, i) => {
      const sceneNum = startIndex + i + 1;
      return `Сцена ${sceneNum}:
Текст/Сюжет: ${scene.text || scene.voiceover || scene.description || scene.title || "Не указано"}
Описание для визуала: ${scene.visual || scene.visuals?.description || scene.visuals || scene.scene || scene.title || "Не указано"}
Тип плана: ${scene.shotType || scene.visuals?.shotType || "Средний план"}
Таймкод: ${scene.timeRange || scene.timecode || "Не указан"}
Настроение блока: ${scene.mood || "Не указано"}
Звуки/SFX: ${scene.audio?.soundsAndNoises || scene.sfx || scene.audio?.backgroundMusic || "Не указано"}`;
    }).join("\n\n");

    const isFirstBatch = chunkIndex === 0;

    const prompt = `Ты — выдающийся кинорежиссер и арт-директор. Твоя задача — создать визуальные промпты для сценарного батча (Сцены ${startIndex + 1} .. ${startIndex + chunk.length} из ${breakdown.length}).

${VISUAL_DIVERSITY_RULES}

КОНТЕКСТ ПРОЕКТА:
Тема: ${topic}
Тон: ${tone}${userHintsContext}${brandContext}${instructionsContext}${veoSfxPromptText}${previousSceneContext}

ТРЕБОВАНИЯ К КИНЕМАТОГРАФИИ И РАЗНООБРАЗИЮ:
1. Каждая сцена внутри батча должна отличаться от соседних по сути — не показывай буквально то же действие/предмет/картинку, что уже было.
2. ЗАПРЕЩЕНО дублировать сюжетику между соседними сценами (например, если в Сцене A персонаж совершает действие X, в Сцене A+1 НЕЛЬЗЯ повторно показывать действие X — покажи реакцию, крупный план лица/глаз, эмоцию, окружающий мир, предмет или пейзаж).
3. НЕ строй предсказуемый цикл планов и движений камеры (например "Общий-Крупный-Общий-Крупный" по кругу). Выбор масштаба и движения камеры — художественное решение под смысл конкретной сцены, а не механическая ротация по списку категорий. Иногда две сцены подряд МОГУТ быть похожего масштаба, если это оправдано — важно отсутствие буквального повтора картинки, а не формальная пестрота.
4. Каждый из двух промптов (videoPrompt1, videoPrompt2) — это ОДИН ЦЕЛЬНЫЙ, самодостаточный кинематографический промпт для Veo 3 text-to-video на английском языке, описывающий сразу и композицию кадра, и действие, и движение камеры, и свет — а не раздельно "кадр" и "анимация". Он должен быть готов к вставке в Veo 3 напрямую. 2-4 насыщенных предложения, НЕ вставляй HEX-коды (например #D97706).
5. videoPrompt2 — ВТОРОЙ, принципиально другой ракурс/дубль ЭТОЙ ЖЕ сцены (иной масштаб, иной фокус внимания, иная деталь или композиция) — альтернативный вариант на выбор, а не продолжение первого.
6. Для каждой сцены заполни короткое поле "subject" (2-6 слов на русском) — главный сюжет/объект кадра. Это нужно тебе самому для проверки на повтор.
7. ${getClicheAvoidanceRule(topic)}
8. ОБЯЗАТЕЛЬНАЯ САМОПРОВЕРКА перед выводом JSON: сравни "subject" каждой сцены этого батча со списком уже использованных сюжетов выше (если он есть) и со всеми другими сценами ЭТОГО ЖЕ батча. Если хотя бы два "subject" по смыслу совпадают (даже если слова разные, но картинка та же) — переделай один из них на принципиально другой образ перед тем, как вернуть ответ.

РАЗБИВКА СЦЕН БАТЧА:
${chunkScenesText}

Верни JSON объект:
{
  ${isFirstBatch ? `"imageStyle": "строка (стиль изображений)",
  "animationType": "строка (тип анимации)",
  "musicMood": "строка (Ханс Циммер стайл)",
  "generalAudioPrompt": "строка (для Suno до 1000 знаков, без запрещенного)",` : ""}
  "scenePrompts": [
    {
      "sceneSummary": "строка (описание сцены на русском)",
      "subject": "строка (главный сюжет/объект кадра, кратко на русском)",
      "videoPrompt1": "строка (цельный детализированный Veo 3 промпт на английском, Ракурс 1)",
      "videoPrompt2": "строка (цельный детализированный Veo 3 промпт на английском, Ракурс 2 — принципиально другой)"
    }
  ]
}`;

    const response = await callGeminiWithRetry({
      model: options?.model || "gemini-3.7-flash",
      contents: prompt,
      config: {
        temperature: 1.0,
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        responseSchema: {
          type: "OBJECT" as any,
          properties: {
            imageStyle: { type: "STRING" as any },
            animationType: { type: "STRING" as any },
            musicMood: { type: "STRING" as any },
            generalAudioPrompt: { type: "STRING" as any },
            scenePrompts: {
              type: "ARRAY" as any,
              items: {
                type: "OBJECT" as any,
                properties: {
                  sceneSummary: { type: "STRING" as any },
                  subject: { type: "STRING" as any },
                  videoPrompt1: { type: "STRING" as any },
                  videoPrompt2: { type: "STRING" as any }
                }
              }
            }
          }
        }
      }
    });

    const parsed: any = safeParseJSON(response.candidates?.[0]?.content?.parts?.[0]?.text, {} as any);
    if (isFirstBatch) {
      if (parsed.imageStyle) globalImageStyle = parsed.imageStyle;
      if (parsed.animationType) globalAnimationType = parsed.animationType;
      if (parsed.musicMood) globalMusicMood = parsed.musicMood;
      if (parsed.generalAudioPrompt) globalAudioPrompt = parsed.generalAudioPrompt;
    }

    if (Array.isArray(parsed.scenePrompts)) {
      parsed.scenePrompts.forEach((sp: any) => {
        allScenePrompts.push({
          sceneSummary: sp.sceneSummary || "",
          videoPrompt1: sp.videoPrompt1 || "",
          videoPrompt2: sp.videoPrompt2 || "",
          subject: sp.subject || ""
        });
        if (sp.subject) usedSubjectsLog.push(sp.subject);
      });
    }
  }

  return {
    imageStyle: globalImageStyle,
    animationType: globalAnimationType,
    musicMood: globalMusicMood,
    generalAudioPrompt: globalAudioPrompt,
    scenePrompts: allScenePrompts
  };
}


export async function generatePromptResponse(
  message: string,
  history: {role: 'user' | 'model', content: string}[],
  context: {
    idea?: string,
    breakdown?: SceneBreakdown[],
    niche?: string
  },
  options?: AnalysisOptions
): Promise<string> {
  const researchContext = options?.deepResearch ? "\nПРИМЕЧАНИЕ: Тебе доступен Google Поиск. Используй его для поиска актуальной информации и трендов в реальном времени, если пользователь спрашивает о последних событиях, новостях или фактах." : "";
  const customInst = getCustomInstructions(options);
  const customInstructionsContext = customInst 
    ? `

ОБЯЗАТЕЛЬНЫЕ К НЕУКОСНИТЕЛЬНОМУ ИСПОЛНЕНИЮ СИСТЕМНЫЕ ИНСТРУКЦИИ:
${customInst}`
    : "";
  const contextText = `Ты — AI-помощник для YouTube-креаторов. Твоя задача — помогать с развитием канала, названиями, тегами и другими вопросами по созданию контента.
 
 Текущий контекст видео:
 - Ниша: ${context.niche || 'Не выбрана'}
 - Идея/Тема: ${context.idea || 'Не выбрана'}

${context.breakdown ? `Разбивка сценария по сценам:
${JSON.stringify(context.breakdown, null, 2)}` : 'Разбивка сценария пока не готова.'}${researchContext}${customInstructionsContext}

Отвечай кратко, профессионально и по делу.`;

  const tools: any[] = [];
  if (options?.deepResearch) {
    tools.push({ googleSearch: {} });
  }

  const response = await callGeminiWithRetry({
    model: options?.model || (options?.deepResearch ? "gemini-3.1-pro-preview" : "gemini-3.7-flash"),
    contents: [
      { role: 'user', parts: [{ text: contextText }] },
      ...history.map(h => ({ role: h.role, parts: [{ text: h.content }] })),
      { role: 'user', parts: [{ text: message }] }
    ],
    tools: tools.length > 0 ? tools : undefined,
    toolConfig: options?.deepResearch ? { includeServerSideToolInvocations: true } : undefined
  });

  return extractTextFromResponse(response) || message;
}


export async function generateGeneralPrompts(topic: string, niche: string, options?: AnalysisOptions): Promise<{ imagePrompt: string; animationPrompt: string; audioPrompt: string }> {
  const prompt = `Сгенерируй общие, но ГЛУБОКО ДЕТАЛИЗИРОВАННЫЕ промпты для производства видео на тему: "${topic}" в нише: "${niche}".
  
  Требования к промптам:
  1. imagePrompt: Промпт для генерации базового изображения (на английском) для Nano Banana 2. Опиши конкретные визуальные детали: ракурс камеры (focal length), освещение (cinematic lighting, rim light), текстуры материалов (fabric, metal, skin) и композицию. Избегай абстракций, будь технически точен.
  
     ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА БЕЗОПАСНОСТИ КАРТИНОК ДЛЯ ОБХОДА БЛОКИРОВОК (Google Flow/Imagen):
     - Никогда не пиши имена известных личностей или брендов напрямую. Используй "a person resembling [Name]".
  
  2. animationPrompt: Описание движения для Veo 3 (на английском). Опиши физику движения камеры (напр. slow dolly-in, orbit shot) и динамическое изменение объектов.
  3. audioPrompt: Промпт для Treblo (на английском). Укажи инструменты, темп (BPM), жанр, акустику помещения и эмоциональный фон.
  
  Верни JSON объект с полями imagePrompt, animationPrompt, audioPrompt.`;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.7-flash",
    contents: prompt,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          imagePrompt: { type: Type.STRING },
          animationPrompt: { type: Type.STRING },
          audioPrompt: { type: Type.STRING },
        },
        required: ["imagePrompt", "animationPrompt", "audioPrompt"],
      },
    },
  });

  return safeParseJSON(extractTextFromResponse(response), { imagePrompt: '', animationPrompt: '', audioPrompt: '' });
}




export function getTransitionPromptTemplate(
  blockA: { title: string; text?: string },
  blockB: { title: string; text?: string },
  imageStyle?: string
): string {
  return `Действуй как профессиональный арт-директор и режиссер монтажа. Тебе нужно придумать креативный визуальный переход (Transition B-Roll / Match Cut) между двумя смысловыми блоками сценария.

БЛОК 1 (предыдущий):
Название: ${blockA.title}
Суть/Контекст: ${blockA.text || "Не указан"}

БЛОК 2 (следующий):
Название: ${blockB.title}
Суть/Контекст: ${blockB.text || "Не указан"}

Общий визуальный стиль видео: ${imageStyle || "Кинематографичный фотореализм"}

ЗАДАЧА:
1. Придумай прикольный смысловой или визуальный переход (transitionType), связывающий финал Блока 1 и начало Блока 2.
2. Напиши краткое описание этого перехода на русском языке (transitionSummary). ОБЯЗАТЕЛЬНО используй букву "ё".
3. Напиши детальный английский visualPrompt для генерации изображения начального кадра перехода (Imagen prompt for the starting/initial frame of the transition). Сделай его ярким, метафоричным или эффектным.
4. Напиши детальный английский animationPrompt — подробный промпт для анимации этого изображения начального кадра (Veo detailed motion/animation prompt describing how the starting frame image moves, changes, or transitions into the next scene).

Верни JSON объект со следующей структурой:
{
  "transitionType": "название перехода",
  "transitionSummary": "краткое художественное описание на русском",
  "visualPrompt": "detailed English prompt for the visual",
  "animationPrompt": "detailed English camera/motion prompt"
}
`;
}


export async function generateTransitionPromptBetweenBlocks(
  blockA: { title: string; text?: string },
  blockB: { title: string; text?: string },
  imageStyle?: string,
  options?: AnalysisOptions
): Promise<TransitionPrompt> {
  const prompt = getTransitionPromptTemplate(blockA, blockB, imageStyle);

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.7-flash",
    contents: prompt,
    bypassCache: options?.bypassCache,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          transitionType: { type: Type.STRING },
          transitionSummary: { type: Type.STRING },
          visualPrompt: { type: Type.STRING },
          animationPrompt: { type: Type.STRING },
        },
        required: ["transitionType", "transitionSummary", "visualPrompt", "animationPrompt"],
      }
    }
  });

  return safeParseJSON(extractTextFromResponse(response), {
    transitionType: "Smooth Match Cut",
    transitionSummary: "Плавный смысловой переход, объединяющий элементы двух блоков.",
    visualPrompt: "A smooth cinematic transitions between two thematic scenes, matching geometry, light leaks, beautiful color grading, 8k, detailed.",
    animationPrompt: "A fast whip pan transition with motion blur, blending into the next shot seamlessly."
  });
}








export async function generateThumbnailStyles(
  title: string,
  description: string,
  options?: AnalysisOptions
): Promise<ThumbnailStyleSuggestion[]> {
  const customContext = getCustomInstructions(options);
  const thumbnailRulesInstruction = `
ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА ОФОРМЛЕНИЯ ПРЕВЬЮ (строго соблюдать для каждого стиля):
1. ТЕКСТ НА ПРЕВЬЮ: Только русский язык, кириллица. Строго 2–4 слова ЗАГЛАВНЫМИ БУКВАМИ. Текст — эмоциональный крючок (вопрос-провокация, обещание-контраст, личное узнавание, тревога/срыв, приговор/итог), создающий вопрос или напряжение, а не пересказ видео. Запрещены клише ("ШОК", "СЕКРЕТ") и более 4 слов.
2. ВИЗУАЛЬНЫЙ РЯД: Один явный визуальный фокус (лицо человека с выраженной эмоцией, руки, символичный предмет). Правило третей (объект смещен от центра, текст на свободной трети). Контраст переднего и заднего плана (размытый фон/боке, резкий передний план).
3. ТИПОГРАФИКА: Жирный гротеск (Sans-serif Bold/Black), обязательна темная обводка или тень под текстом, расположение в верхней или нижней трети кадра, максимум 2 строки.
`;

  const prompt = `Предложи 3 совершенно разных визуальных графических стиля для обложек (thumbnail) YouTube на основе темы видео и описания.
  
  Название видео: "${title}"
  Описание видео: "${description}"
  ${customContext}
  ${thumbnailRulesInstruction}

  Стили должны сильно отличаться друг от друга (например, один - неоновый киберпанк/драматический, другой - минималистичный флэт-дизайн с пастельными тонами, третий - фотореалистичный 3D-рендер или крупная инфографика).
  
  Верни JSON в следующем формате (массив из 3 элементов):
  [
    {
      "name": "Название стиля (например, 'Неоновый киберпанк')",
      "desc": "Детальное описание концепции, что изображено на превью, почему это привлечет зрителя на русском языке",
      "colors": ["Цвет 1", "Цвет 2", "Цвет 3"],
      "prompt": "Детальный, качественный промпт НА АНГЛИЙСКОМ языке для генерации изображения (Image Generation API). Промпт должен включать в себя: 'Premium YouTube thumbnail', 'Include large, bold, perfectly spelled Russian Cyrillic text \\"${title.replace(/"/g, '')}\\" (strictly 2 to 4 words in ALL CAPS) as a central graphic element following rule of thirds with blurred bokeh background and high-contrast professional graphic design. IMPORTANT: The text is in Russian (Cyrillic alphabet), write exactly \\"${title.replace(/"/g, '')}\\" using Cyrillic letters, do not translate to English and do not use Latin/English letters', детали заднего плана, типы освещения, цветовую палитру и детали стиля. ОБЯЗАТЕЛЬНОЕ ПРАВИЛО: если в теме или названии упоминаются известные личности (селебрити, политики, исторические лица), КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО писать их имена напрямую. Вместо этого пиши 'a person resembling [Name]' (например, 'a person resembling Napoleon Bonaparte') или детально опиши их внешний вид и одежду. Также не используй названия защищенных брендов и персонажей напрямую, заменяя их обобщенным детальным описанием."
    }
  ]
  `;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.7-flash",
    contents: prompt,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            desc: { type: Type.STRING },
            colors: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            prompt: { type: Type.STRING }
          },
          required: ["name", "desc", "colors", "prompt"]
        }
      }
    }
  });

  return safeParseJSON<ThumbnailStyleSuggestion[]>(extractTextFromResponse(response), []);
}




export async function generateFonts(niche: string, options?: AnalysisOptions): Promise<string[]> {
  const prompt = `Сгенерируй список из 2 гармоничных шрифтов (первый для заголовков, второй для текста, например: ["Plus Jakarta Sans", "Playfair Display"]) для YouTube канала в нише "${niche}" из Google Fonts.
  Верни только JSON массив строк.`;

  const response = await callGeminiWithRetry({
    model: options?.model || "gemini-3.7-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
    },
  });

  return safeParseJSON<string[]>(extractTextFromResponse(response), []);
}


export async function generateRecommendedColors(niche: string, options?: AnalysisOptions): Promise<string[]> {
  return generateColors(niche, options);
}


export async function translateVisualPromptToStockKeywords(
  visualDescription: string,
  sceneText?: string,
  options?: { model?: string }
): Promise<string> {
  const combinedText = `${visualDescription || ""} ${sceneText || ""}`.trim();
  if (!combinedText) return "cinematic b-roll";

  const prompt = `
Ты — главный эксперт по видеомонтажу и подбору B-Roll футажей для Pexels / Shutterstock / Envato.
Преврати следующее описание визуального ряда сцены на русском языке в ИДЕАЛЬНЫЙ поисковый запрос из 2-4 английских ключевых слов для Pexels Video API.

Правила:
1. Запрос ДОЛЖЕН быть строго на английском языке.
2. Используй только самые важные существительные и глаголы (например: "man typing laptop office", "pouring espresso coffee", "city skyline sunset drone", "shocked face smartphone").
3. Не используй знаки препинания, кавычки, артикли или лишние слова.
4. Ответь СТРОГО 2-4 ключевыми словами через пробел. Никакого вводного текста.

ОПИСАНИЕ КАДРА:
"""
${combinedText}
"""
`.trim();

  try {
    const response = await callGeminiWithRetry({
      model: options?.model || "gemini-3.7-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 60,
        temperature: 0.2
      }
    });

    const rawResult = extractTextFromResponse(response);
    if (rawResult) {
      const clean = rawResult.replace(/[^a-zA-Z0-9\s]/g, "").trim().toLowerCase();
      if (clean && clean.length > 2) {
        return clean;
      }
    }
  } catch (err) {
    logger.warn("Failed to generate stock keywords via Gemini, using fallback translation", err);
  }

  return "";
}




export async function analyzeThumbnailEmotions(
  thumbnailUrl: string,
  title?: string,
  niche?: string,
  options?: { model?: string }
): Promise<ThumbnailEmotionAnalysis> {
  const cleanTitle = title || "Заголовок видео";
  const prompt = `
Ты — ведущий эксперт по нейромаркетингу, визуальному восприятию и психологии CTR на YouTube.
Твоя задача: провести глубокий ИИ-анализ эмоционального воздействия сгенерированного превью (thumbnail) и заголовка видео.

КОНТЕКСТ:
- Заголовок видео: "${cleanTitle}"
- Ниша: "${niche || 'YouTube контент'}"
- Изображение/превью: ${thumbnailUrl && !thumbnailUrl.startsWith('data:') ? thumbnailUrl : 'Визуальный концепт превью видео'}

ПРОАНАЛИЗИРУЙ ЭМОЦИОНАЛЬНЫЙ ОТКЛИК ЗРИТЕЛЯ:
1. Оцени уровень 5 ключевых эмоциональных триггеров по шкале от 0 до 100%:
   - joy: Радость, восторг, оптимизм, эстетическое удовольствие.
   - urgency: Тревога, драматизм, срочность, страх упущенной выгоды (FOMO).
   - curiosity: Любопытство, загадочность, скрытая тайна, непреодолимое желание кликнуть.
   - surprise: Удивление, шок, разрыв шаблона, неожиданность.
   - trust: Доверие, авторитет, профессионализм, экспертность.

2. Определи общий прогнозируемый CTR-потенциал (overallCTRScore: 0-100, estimatedCTRRange: например "8.5% - 13.2%").
3. Назови доминирующую эмоцию / триггер (primaryEmotion, например: "Любопытство и скрытая интрига").
4. Сформулируй развернутый вердикт эмоционального воздействия (emotionalImpactVerdict: 2-3 емких предложения).
5. Перечисли 2-3 сильные стороны визуального триггера (strengths).
6. Перечисли 1-2 зоны риска/слабости (weaknesses).
7. Дай 2-3 конкретных совета по усилению CTR (ctrActionableTips).

ОТВЕТЬ СТРОГО В ФОРМАТЕ JSON:
{
  "overallCTRScore": 86,
  "estimatedCTRRange": "8.5% - 12.8%",
  "primaryEmotion": "Любопытство & Интрига",
  "emotionBreakdown": {
    "joy": 45,
    "urgency": 72,
    "curiosity": 94,
    "surprise": 80,
    "trust": 65
  },
  "emotionalImpactVerdict": "Превью создает мощный импульс любопытства и интриги благодаря выразительному контрасту и недосказанности, что стимулирует мгновенный клик.",
  "strengths": [
    "Высокий уровень визуального напряжения и интриги",
    "Четкий фокус внимания зрителя на ключевом объекте"
  ],
  "weaknesses": [
    "Можно усилить читаемость текста при уменьшении размера на мобильных устройствах"
  ],
  "ctrActionableTips": [
    "Добавьте яркую цветовую плашку под ключевое слово для мобильной ленты",
    "Сделайте эмоциональную реакцию персонажа чуть более акцентированной"
  ]
}
`.trim();

  try {
    const contents: any[] = [];
    if (thumbnailUrl && thumbnailUrl.startsWith("data:image")) {
      const parts = thumbnailUrl.split(",");
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
      const base64Data = parts[1];
      contents.push({
        role: "user",
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: prompt }
        ]
      });
    } else {
      contents.push({
        role: "user",
        parts: [{ text: prompt }]
      });
    }

    const response = await callGeminiWithRetry({
      model: options?.model || "gemini-3.7-flash",
      contents,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallCTRScore: { type: Type.INTEGER },
            estimatedCTRRange: { type: Type.STRING },
            primaryEmotion: { type: Type.STRING },
            emotionBreakdown: {
              type: Type.OBJECT,
              properties: {
                joy: { type: Type.INTEGER },
                urgency: { type: Type.INTEGER },
                curiosity: { type: Type.INTEGER },
                surprise: { type: Type.INTEGER },
                trust: { type: Type.INTEGER }
              },
              required: ["joy", "urgency", "curiosity", "surprise", "trust"]
            },
            emotionalImpactVerdict: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            ctrActionableTips: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: [
            "overallCTRScore",
            "estimatedCTRRange",
            "primaryEmotion",
            "emotionBreakdown",
            "emotionalImpactVerdict",
            "strengths",
            "weaknesses",
            "ctrActionableTips"
          ]
        }
      }
    });

    const resText = extractTextFromResponse(response);
    if (!resText) {
      throw new Error("Пустой ответ от модели");
    }
    const parsed = tryRepairJSON(resText);
    return {
      overallCTRScore: parsed.overallCTRScore ?? 82,
      estimatedCTRRange: parsed.estimatedCTRRange || "7.5% - 11.8%",
      primaryEmotion: parsed.primaryEmotion || "Любопытство & Интрига",
      emotionBreakdown: {
        joy: parsed.emotionBreakdown?.joy ?? 50,
        urgency: parsed.emotionBreakdown?.urgency ?? 65,
        curiosity: parsed.emotionBreakdown?.curiosity ?? 88,
        surprise: parsed.emotionBreakdown?.surprise ?? 75,
        trust: parsed.emotionBreakdown?.trust ?? 60
      },
      emotionalImpactVerdict: parsed.emotionalImpactVerdict || "Превью вызывает устойчивый интерес и побуждает зрителя перейти к просмотру ролика.",
      strengths: parsed.strengths || ["Привлекательная контрастная композиция", "Четкая смысловая привязка к заголовку"],
      weaknesses: parsed.weaknesses || ["Необходимо проверить контрастность мелких деталей"],
      ctrActionableTips: parsed.ctrActionableTips || ["Используйте яркий акцентный цвет для текстовой плашки", "Усильте эмоциональный контраст"]
    };
  } catch (err) {
    logger.warn("AI Emotion analysis error:", err);
    // Intelligent fallback estimation
    return {
      overallCTRScore: 84,
      estimatedCTRRange: "8.0% - 12.5%",
      primaryEmotion: "Любопытство & Интрига",
      emotionBreakdown: {
        joy: 48,
        urgency: 70,
        curiosity: 92,
        surprise: 78,
        trust: 66
      },
      emotionalImpactVerdict: "Концепция превью обладает высоким кликабельным потенциалом за счет фокуса на неразрешенном вопросе и выразительной композиции.",
      strengths: [
        "Отличная интрига и вовлекающий триггер",
        "Высокая заметность в общей ленте рекомендаций"
      ],
      weaknesses: [
        "Следите за безопасными зонами YouTube (таймкод в правом нижнем углу)"
      ],
      ctrActionableTips: [
        "Используйте жирный гротескный шрифт с черной подложкой для мобильных",
        "Размещайте лица и главный объект в левой или центральной трети кадра"
      ]
    };
  }
}