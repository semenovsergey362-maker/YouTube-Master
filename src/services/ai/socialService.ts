import { logger } from "../../config/logger";
import {
  AnalysisOptions,
  SocialPromoPackage,
  CommunityPost,
  TelegramPost,
  InstagramPost,
  QuoteCardPrompt,
} from "../../types";
import {
  callGeminiWithRetry,
  safeParseJSON,
  extractTextFromResponse,
  buildContents,
  getActiveCustomInstructionsText,
} from "./aiConfig";
import { getCustomInstructions } from "./scriptService";

export interface GenerateSocialPromoParams {
  title: string;
  description?: string;
  scriptText?: string;
  isShorts?: boolean;
  branding?: any;
  niche?: any;
  customInstructions?: string;
  options?: AnalysisOptions;
}

/**
 * Generates ready-to-publish cross-platform promo posts (YouTube Community, Telegram, Instagram)
 * and detailed 1:1 Quote Card visual prompts from a video or Shorts script.
 */
export async function generateSocialPromoPackage(
  params: GenerateSocialPromoParams
): Promise<SocialPromoPackage> {
  const {
    title,
    description = "",
    scriptText = "",
    isShorts = false,
    branding,
    niche,
    customInstructions,
    options,
  } = params;

  const activeCustom =
    customInstructions ||
    getCustomInstructions(options, false) ||
    getActiveCustomInstructionsText();

  const brandName =
    branding?.name ||
    (typeof niche?.branding?.names?.[0] === "string"
      ? niche.branding.names[0]
      : niche?.branding?.names?.[0]?.name) ||
    "Наш Канал";

  const contentTypeLabel = isShorts ? "короткого видео (YouTube Shorts)" : "полноформатного YouTube видео";

  const prompt = `Ты — ведущий SMM-стратег и контент-маркетолог для YouTube-креаторов и экспертных медиа.
Твоя задача — создать полный пакет кросс-платформенного продвижения и карточек-цитат 1:1 для ${contentTypeLabel}.

МАТЕРИАЛЫ ВИДЕО:
Заголовок: "${title}"
${description ? `Описание:\n"""\n${description.slice(0, 1500)}\n"""` : ""}
${scriptText ? `Фрагменты сценария/текста:\n"""\n${scriptText.slice(0, 3000)}\n"""` : ""}
${brandName ? `Бренд/Канал: "${brandName}"` : ""}
${activeCustom ? `\nОсобые инструкции канала:\n${activeCustom}\n` : ""}

ТРЕБОВАНИЯ К ГЕНЕРАЦИИ:

1. 🔴 ПОСТ ДЛЯ СООБЩЕСТВА YOUTUBE (communityPost):
   - headline: Короткий интригующий заголовок с эмодзи.
   - text: Живой, вовлекающий пост (600-1000 символов), раскрывающий главную интригу или парадокс из ролика, побуждающий зрителей высказаться в комментариях.
   - poll: Интерактивный опрос для вкладки «Сообщество» с острым вопросом (question) и 4 вариантами ответов (options), отражающими разные точки зрения зрителей.
   - callToAction: Побуждение к просмотру ролика и обсуждению.

2. ✈️ ПОСТ ДЛЯ TELEGRAM КАНАЛА (telegramPost):
   - title: Сочный цепляющий заголовок для Telegram.
   - text: Полный готовый текст поста для Telegram с эмодзи-маркерами, красивой типографикой и акцентами.
   - bulletPoints: 3-5 ключевых тезисов/инсайтов с эмодзи в начале каждого пункта.
   - callToAction: Призыв к переходу, реакции или комментарию.
   - hashtags: 3-5 целевых хештегов для Telegram поиска.

3. 📸 ПОСТ ДЛЯ INSTAGRAM (instagramPost):
   - hookTitle: Ударная первая строка (хук) с заглавных букв, останавливающая скролл в ленте.
   - caption: Развернутый текст для описания (микроблог) с абзацами, эмодзи, глубокой пользой и финальным вопросом.
   - carouselSlides: Структура экспертной карусели из 5 слайдов в формате 1:1. Для КАЖДОГО слайда ОБЯЗАТЕЛЬНО сформируй:
     * slideNumber: Номер слайда (1-5)
     * slideType: "hook" | "insight" | "quote" | "cta"
     * headline: Краткий сочный заголовок слайда
     * text: Текст слайда (1-3 предложения)
     * imagePrompt: Англоязычный детальный промт для генерации эстетичной фоновой картинки/иллюстрации для этого слайда в 1:1 формате (Midjourney / Imagen / DALL-E 3). Пример формата:
       "An aesthetic, minimalist 1:1 square editorial photo depicting [visual concept/metaphor related to slide topic], soft studio lighting, clean composition with generous negative space, 8k resolution, photorealistic."
   - hashtags: 15-20 релевантных нишевых и среднечастотных хештегов (#).

4. 🎨 ПРОМТЫ ДЛЯ КАРТОЧЕК-ЦИТАТ В ФОРМАТЕ 1:1 (quoteCards):
   - Создай ровно 3-4 сильные, запоминающиеся карточки-цитаты на основе смыслов и инсайтов ролика.
   - Для каждой карточки сформируй:
     * id: Уникальный id ("qc-1", "qc-2", etc.).
     * quote: Сильная, глубокая, парадоксальная или мотивирующая цитата из темы на русском языке (1-3 емких предложения).
     * authorOrContext: Автор цитаты или контекст темы ("${brandName}" или роль/эксперт).
     * visualPrompt: ДЕТАЛЬНЫЙ английский промт для генерации фона/карточки в Midjourney v6 / DALL-E 3 / Google Imagen в квадратном формате 1:1. Опиши композицию, минималистичный премиум фон (slate/dark aesthetic, subtle studio lighting, soft shadows, elegant typography layout space, ultra-high resolution, clean negative space, 8k, --ar 1:1).
     * designNotes: Советы по визуальному оформлению на русском (шрифтовая пара, цветовая палитра, контраст фона и текста).
     * aspectRatio: "1:1".

ОТВЕТ ДОЛЖЕН БЫТЬ СТРОГО В ФОРМАТЕ ВАЛИДНОГО JSON БЕЗ ЛИШНЕГО ТЕКСТА:
{
  "communityPost": {
    "headline": "🔥 Заголовок поста",
    "text": "Текст поста для сообщества YouTube...",
    "poll": {
      "question": "Вопрос для опроса?",
      "options": ["Вариант 1", "Вариант 2", "Вариант 3", "Вариант 4"]
    },
    "callToAction": "Смотрите новый выпуск и делитесь мнением в комментариях!"
  },
  "telegramPost": {
    "title": "⚡ Заголовок Telegram",
    "text": "Текст поста для Telegram...",
    "bulletPoints": ["🔹 Тезис 1", "🔹 Тезис 2", "🔹 Тезис 3"],
    "callToAction": "Смотрите подробный выпуск на канале!",
    "hashtags": ["#тег1", "#тег2"]
  },
  "instagramPost": {
    "hookTitle": "💥 ХУК ДЛЯ INSTAGRAM",
    "caption": "Текст поста для инстаграма...",
    "carouselSlides": [
      { "slideNumber": 1, "slideType": "hook", "headline": "СТРАХ ОТВЕРЖЕНИЯ", "text": "Ты помогаешь не из любви, а из страха, что без твоей помощи тебя перестанут любить.", "imagePrompt": "An aesthetic, minimalist 1:1 square editorial conceptual photo of a delicate glowing sphere protected by translucent hands, deep slate background, soft cinematic studio lighting, generous negative space, 8k resolution" },
      { "slideNumber": 2, "slideType": "insight", "headline": "Заголовок 2", "text": "Текст слайда 2", "imagePrompt": "An aesthetic 1:1 square 3D glassmorphic abstract composition illustrating psychological boundary and clarity, muted warm tones, studio lighting, clean negative space, high quality" },
      { "slideNumber": 3, "slideType": "insight", "headline": "Заголовок 3", "text": "Текст слайда 3", "imagePrompt": "A minimalist conceptual artwork depicting self-reflection with a polished dark mirror surface, warm ambient rim light, soft shadows, ample copy space, 8k --ar 1:1" },
      { "slideNumber": 4, "slideType": "quote", "headline": "Заголовок 4", "text": "Текст слайда 4", "imagePrompt": "A luxury dark slate editorial background texture with subtle organic geometric lighting, clean central space, photorealistic studio shot, 8k --ar 1:1" },
      { "slideNumber": 5, "slideType": "cta", "headline": "Заголовок 5", "text": "Текст слайда 5", "imagePrompt": "Modern sleek gradient background art with subtle floating geometric shapes, vibrant accent glow, clean layout space, 8k --ar 1:1" }
    ],
    "hashtags": ["#инстаграмтег1", "#инстаграмтег2"]
  },
  "quoteCards": [
    {
      "id": "qc-1",
      "quote": "Текст сильной цитаты...",
      "authorOrContext": "${brandName}",
      "visualPrompt": "Minimalist luxury editorial quote card background, deep charcoal slate texture, soft warm ambient studio side lighting, elegant clean negative space for typography, high-end design, photorealistic, 8k resolution --ar 1:1",
      "designNotes": "Рекомендация по типографике: крупный шрифт с засечками (Playfair Display) для акцента и чистый гротеск (Inter) для подписи. Цвета: слоновая кость (#F7F7F7) на темно-графитовом фоне.",
      "aspectRatio": "1:1"
    }
  ]
}`;

  try {
    const response = await callGeminiWithRetry({
      model: options?.model || "gemini-3.1-flash-lite",
      contents: buildContents(prompt, options),
      config: {
        systemInstruction:
          "Ты — элитный SMM-копирайтер и визуальный арт-директор. Создавай готовые, мощные тексты для соцсетей и выверенные 1:1 промты для графических карточек-цитат.",
      },
    });

    const raw = extractTextFromResponse(response);
    const parsed = safeParseJSON<SocialPromoPackage>(raw, {
      communityPost: {
        headline: `🔥 ${title}`,
        text: `Друзья, вышел новый ролик на тему "${title}"!\n\nДелитесь в комментариях своим опытом и мнением.`,
        poll: {
          question: "Насколько эта тема актуальна для вас прямо сейчас?",
          options: [
            "Очень актуально, сталкиваюсь постоянно",
            "Интересно для общего развития",
            "Редко с этим сталкиваюсь",
            "Свой вариант в комментариях",
          ],
        },
        callToAction: "Смотрите на канале и участвуйте в обсуждении!",
      },
      telegramPost: {
        title: `⚡ ${title}`,
        text: `Вышел новый разбор: "${title}"\n\n📌 Главные выводы внутри ролика. Обязательно к просмотру!`,
        bulletPoints: [
          "💡 Ключевая мысль и практический разбор",
          "🔍 Главные ошибки и как их избежать",
          "🚀 Пошаговое руководство к действию",
        ],
        callToAction: "Смотрите полный ролик на канале!",
        hashtags: ["#ютуб", "#видео", "#инсайты"],
      },
      instagramPost: {
        hookTitle: `🔥 ЧТО ВАЖНО ЗНАТЬ: ${title.toUpperCase()}`,
        caption: `Разобрали ключевые нюансы темы "${title}".\n\nЛистайте карусель, чтобы узнать подробности 👉\n\nСохраняйте в закладки, чтобы не потерять!`,
        carouselSlides: [
          {
            slideNumber: 1,
            slideType: "hook",
            headline: title,
            text: "Главный разбор и инсайты",
            imagePrompt: `An aesthetic, minimalist 1:1 square editorial conceptual artwork representing the theme "${title}", soft studio lighting, clean composition with generous negative space, 8k resolution`,
          },
          {
            slideNumber: 2,
            slideType: "insight",
            headline: "Инсайт 1",
            text: "Ключевая мысль ролика",
            imagePrompt: `An aesthetic 1:1 square 3D glassmorphic abstract visual illustrating key insights, dark slate theme, subtle accent lighting, clean negative space, 8k`,
          },
          {
            slideNumber: 3,
            slideType: "insight",
            headline: "Инсайт 2",
            text: "Практическое применение",
            imagePrompt: `A minimalist step-by-step conceptual background with elegant glassmorphic surfaces, soft warm ambient lighting, ample copy space, 8k --ar 1:1`,
          },
          {
            slideNumber: 4,
            slideType: "quote",
            headline: "Главный вывод",
            text: "То, что меняет подход к делу",
            imagePrompt: `A luxury slate texture background with ambient side lighting, subtle warm contrast, clean central space, 8k --ar 1:1`,
          },
          {
            slideNumber: 5,
            slideType: "cta",
            headline: "Смотрите ролик",
            text: "Полный выпуск уже на канале!",
            imagePrompt: `Modern gradient art background with subtle glowing accent light, dark elegant theme, clean composition, 8k --ar 1:1`,
          },
        ],
        hashtags: ["#разбор", "#полезно", "#инсайты", "#reels", "#видео"],
      },
      quoteCards: [
        {
          id: "qc-1",
          quote: title,
          authorOrContext: brandName,
          visualPrompt:
            "Minimalist modern editorial quote card background, clean aesthetic textured gradient, soft ambient studio lighting, generous negative space in center for text layout, 8k, photorealistic --ar 1:1",
          designNotes:
            "Контрастный фон, крупный четкий шрифт (60–80pt), акцентный цвет бренда для ключевого слова.",
          aspectRatio: "1:1",
        },
      ],
    });

    // Post-process carousel slides and quote cards to ensure requested card prompt template
    const CARD_PROMPT_TEMPLATE = (headline: string, caption: string) =>
      `An elegant, abstract 1:1 square composition featuring a smooth dark glass sphere resting on a raw basalt stone, with warm golden light along the edges, deep contrast, and luxurious negative space.\nCentered in the frame is dark gold text in Russian Cyrillic: "${headline}" (Alegreya font, medium italic, 24 pt); "${caption}" (Montserrat font, small, italic, 16 pt).`;

    if (parsed.instagramPost?.carouselSlides && Array.isArray(parsed.instagramPost.carouselSlides)) {
      parsed.instagramPost.carouselSlides = parsed.instagramPost.carouselSlides.map((slide) => {
        const base = slide.imagePrompt?.trim() || "";
        const imagePrompt = base.includes("basalt stone") && base.includes("Alegreya font")
          ? base
          : base
            ? `${base}\n${CARD_PROMPT_TEMPLATE(slide.headline || "", slide.text || "")}`
            : CARD_PROMPT_TEMPLATE(slide.headline || "", slide.text || "");
        return { ...slide, imagePrompt };
      });
    }

    if (parsed.quoteCards && Array.isArray(parsed.quoteCards)) {
      parsed.quoteCards = parsed.quoteCards.map((qc, idx) => {
        const base = qc.visualPrompt?.trim() || "";
        const visualPrompt = base.includes("basalt stone") && base.includes("Alegreya font")
          ? base
          : base
            ? `${base}\n${CARD_PROMPT_TEMPLATE(qc.quote || "", qc.authorOrContext || "")}`
            : CARD_PROMPT_TEMPLATE(qc.quote || "", qc.authorOrContext || "");
        return {
          ...qc,
          id: qc.id || `qc-${idx + 1}`,
          aspectRatio: "1:1",
          visualPrompt,
        };
      });
    }
    parsed.generatedAt = new Date().toISOString();

    return parsed;
  } catch (err) {
    logger.error("Error generating social promo package:", err);
    throw err;
  }
}
