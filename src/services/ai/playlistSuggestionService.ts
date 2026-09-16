import { callGeminiWithRetry } from "./aiConfig";

export interface PlaylistSuggestion {
  name: string;
  reason?: string;
  isAiGenerated?: boolean;
}

// Curated preset playlists for popular channel topics/niches
const NICHE_PRESET_PLAYLISTS: Record<string, string[]> = {
  "Технологии": [
    "🎬 Обзоры гаджетов и софта",
    "🎬 Полезные ИИ-сервисы",
    "🎬 Сборка и настройка ПК",
    "🎬 Лайфхаки и туториалы"
  ],
  "Бизнес": [
    "🎬 Маркетинг и Продажи",
    "🎬 Стартапы и Бизнес-кейсы",
    "🎬 Личный бренд и Масштабирование",
    "🎬 Мышление миллионеров"
  ],
  "Финансы": [
    "🎬 Инвестиции для новичков",
    "🎬 Пассивный доход и Активы",
    "🎬 Личные финансы и Бюджет",
    "🎬 Анализ акций и Крипты"
  ],
  "Образование": [
    "🎬 Научпоп и Простые объяснения",
    "🎬 Быстрое обучение и Память",
    "🎬 История и Факты",
    "🎬 Пошаговые разборы"
  ],
  "Игры": [
    "🎬 Прохождения и Летсплеи",
    "🎬 Топы и Пасхалки",
    "🎬 Новости игровой индустрии",
    "🎬 Гайды и Билы"
  ],
  "Лайфстайл": [
    "🎬 Влоги и Мой день",
    "🎬 Саморазвитие и Продуктивность",
    "🎬 Утренние и вечерние рутины",
    "🎬 Путешествия и Эстетика"
  ],
  "Кулинария": [
    "🎬 Быстрые рецепты за 15 минут",
    "🎬 Завтраки и Обеды",
    "🎬 Выпечка и Десерты",
    "🎬 Кулинарные секреты и Лайфхаки"
  ],
  "Фитнес": [
    "🎬 Тренировки для дома",
    "🎬 Питание и Похудение",
    "🎬 Техника упражнений",
    "🎬 ЗОЖ и Привычки"
  ],
  "Автомобили": [
    "🎬 Тест-драйвы и Обзоры",
    "🎬 Обслуживание и Тюнинг",
    "🎬 Сравнения авто",
    "🎬 Автотовары и Лайфхаки"
  ],
  "Психология": [
    "🎬 Отношения и Коммуникация",
    "🎬 Самооценка и Уверенность",
    "🎬 Борьба со стрессом и Выгоранием",
    "🎬 Разбор психотипов"
  ],
  "Юмор": [
    "🎬 Скетчи и Жизненные ситуации",
    "🎬 Пранки и Эксперименты",
    "🎬 Лучшие нарезки и Стендап",
    "🎬 Пародии"
  ],
  "Музыка": [
    "🎬 Каверы и Лайвы",
    "🎬 Разборы треков и Битов",
    "🎬 Уроки вокала и Игры",
    "🎬 Музыкальные обзоры"
  ],
  "Недвижимость": [
    "🎬 Рум-туры и Обзоры квартир",
    "🎬 Инвестиции в жилье",
    "🎬 Ремонт и Дизайн интерьера",
    "🎬 Советы покупателям"
  ],
  "Красота": [
    "🎬 Обзоры косметики",
    "🎬 Уход за кожей и Волосоми",
    "🎬 Туториалы по макияжу",
    "🎬 Бьюти-лайфхаки"
  ],
  "Наука": [
    "🎬 Тайны Вселенной и Космос",
    "🎬 Эксперименты и Опыты",
    "🎬 Великие открытия",
    "🎬 Будущее и Технологии"
  ],
  "Животные": [
    "🎬 Уход за питомцами",
    "🎬 Дрессировка и Советы",
    "🎬 Смешные моменты",
    "🎬 Истории спасения"
  ]
};

/**
 * Returns playlist recommendations based on channel niche and optional idea title/description.
 */
export function getSuggestedPlaylistsForNiche(
  niche?: string,
  ideaTitle?: string,
  ideaDescription?: string,
  existingPlaylists: string[] = []
): PlaylistSuggestion[] {
  const suggestions: PlaylistSuggestion[] = [];
  const added = new Set<string>();
  const formattedExisting = new Set(existingPlaylists.map(p => p.toLowerCase().trim()));

  // 1. Keyword-based contextual detection from idea title & description
  if (ideaTitle || ideaDescription) {
    const text = `${ideaTitle || ''} ${ideaDescription || ''}`.toLowerCase();

    if (text.includes("как") || text.includes("гайд") || text.includes("инструкци") || text.includes("урок")) {
      const name = "🎬 Пошаговые Гайды & Уроки";
      if (!formattedExisting.has(name.toLowerCase()) && !added.has(name)) {
        suggestions.push({ name, reason: "Подходит для обучающих видео и гайдов" });
        added.add(name);
      }
    }

    if (text.includes("обзор") || text.includes("распаковк") || text.includes("тест") || text.includes("сравнени")) {
      const name = "🎬 Честные Обзоры & Распаковки";
      if (!formattedExisting.has(name.toLowerCase()) && !added.has(name)) {
        suggestions.push({ name, reason: "Подходит для обзоров и сравнений" });
        added.add(name);
      }
    }

    if (text.includes("short") || text.includes("шот") || text.includes("коротк")) {
      const name = "🎬 Shorts & Быстрые Советы";
      if (!formattedExisting.has(name.toLowerCase()) && !added.has(name)) {
        suggestions.push({ name, reason: "Для коротких вертикальных видео" });
        added.add(name);
      }
    }

    if (text.includes("топ") || text.includes("ошибк") || text.includes("секрет") || text.includes("фишк")) {
      const name = "🎬 Топы, Ошибки & Секреты";
      if (!formattedExisting.has(name.toLowerCase()) && !added.has(name)) {
        suggestions.push({ name, reason: "Формат подборок и полезных советов" });
        added.add(name);
      }
    }
  }

  // 2. Niche presets
  if (niche) {
    const cleanNiche = niche.trim();
    const matchedKey = Object.keys(NICHE_PRESET_PLAYLISTS).find(
      key => cleanNiche.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(cleanNiche.toLowerCase())
    );

    const presets = matchedKey ? NICHE_PRESET_PLAYLISTS[matchedKey] : [
      `🎬 ${cleanNiche}: Главные выпуски`,
      `🎬 ${cleanNiche}: Практика и Гайды`,
      `🎬 ${cleanNiche}: Экспертные разборы`
    ];

    for (const name of presets) {
      if (!formattedExisting.has(name.toLowerCase()) && !added.has(name)) {
        suggestions.push({ name, reason: `Рекомендация для тематики «${cleanNiche}»` });
        added.add(name);
      }
    }
  }

  // 3. Defaults if still empty
  if (suggestions.length === 0) {
    const defaults = [
      "🎬 Обучающие уроки и Гайды",
      "🎬 Обзоры и Разборы",
      "🎬 Главная серия канала"
    ];
    for (const name of defaults) {
      if (!formattedExisting.has(name.toLowerCase()) && !added.has(name)) {
        suggestions.push({ name, reason: "Базовый плейлист канала" });
        added.add(name);
      }
    }
  }

  return suggestions.slice(0, 5);
}

/**
 * AI-powered playlist generation for a specific idea and channel topic using Gemini.
 */
export async function generateAiPlaylistsForIdea(
  niche: string,
  ideaTitle: string,
  ideaDescription?: string
): Promise<PlaylistSuggestion[]> {
  try {
    const prompt = `Ты — эксперт по развивающим плейлистам на YouTube.
Тематика канала: "${niche || "Универсальный канал"}"
Название идеи видео: "${ideaTitle}"
Описание: "${ideaDescription || ""}"

Предложи 3 привлекательных, серийных названия для плейлистов YouTube (длиной от 2 до 5 слов, начинающихся с эмодзи, например: 🎬, 🚀, 📚, 💡), в которые идеально впишется это видео.

Верни ответ строго в формате JSON массивом объектов:
[
  { "name": "🎬 Название 1", "reason": "Причина почему подходит" },
  { "name": "🚀 Название 2", "reason": "Причина почему подходит" },
  { "name": "💡 Название 3", "reason": "Причина почему подходит" }
]`;

    const response = await callGeminiWithRetry({
      model: "gemini-3.1-flash-lite",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "";
    const cleanJson = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleanJson);

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item: any) => ({
        name: item.name ? (item.name.match(/^[\p{Emoji}\u2000-\u3300]/u) ? item.name : `🎬 ${item.name}`) : "🎬 Моя серия",
        reason: item.reason || "Сгенерировано ИИ на основе темы ролика",
        isAiGenerated: true
      }));
    }
  } catch (err) {
    console.warn("AI playlist suggestion failed, using fallback:", err);
  }

  return getSuggestedPlaylistsForNiche(niche, ideaTitle, ideaDescription);
}
