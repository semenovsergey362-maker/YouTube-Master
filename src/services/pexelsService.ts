import { logger } from "../config/logger";
import { safeStorage } from "../lib/storage";

export interface PexelsVideoFile {
  id: number;
  quality: string; // "hd", "sd", etc.
  file_type: string; // "video/mp4"
  width: number;
  height: number;
  fps?: number;
  link: string;
}

export interface PexelsVideoPicture {
  id: number;
  picture: string;
  nr: number;
}

export interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  url: string; // Pexels video web page URL
  image: string; // Thumbnail preview image
  duration: number; // Duration in seconds
  user: {
    id: number;
    name: string;
    url: string;
  };
  video_files: PexelsVideoFile[];
  video_pictures: PexelsVideoPicture[];
}

export interface PexelsSearchResponse {
  page: number;
  per_page: number;
  total_results: number;
  url?: string;
  videos: PexelsVideo[];
  isFallback?: boolean;
  message?: string;
}

// Key management
const PEXELS_KEY_STORAGE_KEY = "pexels_api_key_custom";

// Built-in fallback API key or public key (can be overridden by user)
const DEFAULT_PEXELS_API_KEY = typeof process !== 'undefined' && process.env?.PEXELS_API_KEY
  ? process.env.PEXELS_API_KEY
  : "";

// Curated high quality B-Roll fallback stock videos with direct MP4 links
const FALLBACK_BROLL_VIDEOS: Record<string, PexelsVideo[]> = {
  coffee: [
    {
      id: 855018,
      width: 1920,
      height: 1080,
      url: "https://www.pexels.com/video/pouring-coffee-into-a-cup-855018/",
      image: "https://images.pexels.com/videos/855018/free-video-855018.jpg?auto=compress&cs=tinysrgb&fit=crop&h=500&w=800",
      duration: 12,
      user: { id: 101, name: "Pexels Free Stock", url: "https://www.pexels.com" },
      video_files: [
        { id: 1001, quality: "hd", file_type: "video/mp4", width: 1920, height: 1080, link: "https://vjs.zencdn.net/v/oceans.mp4" }
      ],
      video_pictures: []
    },
    {
      id: 855019,
      width: 1080,
      height: 1920,
      url: "https://www.pexels.com/video/coffee-shop-ambience-855019/",
      image: "https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800",
      duration: 15,
      user: { id: 102, name: "Creative B-Roll", url: "https://www.pexels.com" },
      video_files: [
        { id: 1002, quality: "hd", file_type: "video/mp4", width: 1080, height: 1920, link: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" }
      ],
      video_pictures: []
    }
  ],
  office: [
    {
      id: 3192271,
      width: 1920,
      height: 1080,
      url: "https://www.pexels.com/video/people-working-in-an-office-3192271/",
      image: "https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=800",
      duration: 10,
      user: { id: 103, name: "Business Media", url: "https://www.pexels.com" },
      video_files: [
        { id: 1003, quality: "hd", file_type: "video/mp4", width: 1920, height: 1080, link: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoypasses.mp4" }
      ],
      video_pictures: []
    },
    {
      id: 3192272,
      width: 1080,
      height: 1920,
      url: "https://www.pexels.com/video/laptop-typing-3192272/",
      image: "https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=800",
      duration: 8,
      user: { id: 104, name: "Tech Stock Pro", url: "https://www.pexels.com" },
      video_files: [
        { id: 1004, quality: "hd", file_type: "video/mp4", width: 1080, height: 1920, link: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4" }
      ],
      video_pictures: []
    }
  ],
  city: [
    {
      id: 854123,
      width: 1920,
      height: 1080,
      url: "https://www.pexels.com/video/city-skyline-timelapse-854123/",
      image: "https://images.pexels.com/photos/466685/pexels-photo-466685.jpeg?auto=compress&cs=tinysrgb&w=800",
      duration: 14,
      user: { id: 105, name: "Urban Drone Cinema", url: "https://www.pexels.com" },
      video_files: [
        { id: 1005, quality: "hd", file_type: "video/mp4", width: 1920, height: 1080, link: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" }
      ],
      video_pictures: []
    },
    {
      id: 854124,
      width: 1080,
      height: 1920,
      url: "https://www.pexels.com/video/night-city-lights-854124/",
      image: "https://images.pexels.com/photos/374870/pexels-photo-374870.jpeg?auto=compress&cs=tinysrgb&w=800",
      duration: 12,
      user: { id: 106, name: "Neon Vibes", url: "https://www.pexels.com" },
      video_files: [
        { id: 1006, quality: "hd", file_type: "video/mp4", width: 1080, height: 1920, link: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" }
      ],
      video_pictures: []
    }
  ],
  nature: [
    {
      id: 857111,
      width: 1920,
      height: 1080,
      url: "https://www.pexels.com/video/forest-landscape-857111/",
      image: "https://images.pexels.com/photos/15286/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=800",
      duration: 18,
      user: { id: 107, name: "Nature Wonders", url: "https://www.pexels.com" },
      video_files: [
        { id: 1007, quality: "hd", file_type: "video/mp4", width: 1920, height: 1080, link: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4" }
      ],
      video_pictures: []
    },
    {
      id: 857112,
      width: 1080,
      height: 1920,
      url: "https://www.pexels.com/video/ocean-waves-sunset-857112/",
      image: "https://images.pexels.com/photos/189349/pexels-photo-189349.jpeg?auto=compress&cs=tinysrgb&w=800",
      duration: 11,
      user: { id: 108, name: "Sunset Beach", url: "https://www.pexels.com" },
      video_files: [
        { id: 1008, quality: "hd", file_type: "video/mp4", width: 1080, height: 1920, link: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4" }
      ],
      video_pictures: []
    }
  ],
  tech: [
    {
      id: 859900,
      width: 1920,
      height: 1080,
      url: "https://www.pexels.com/video/futuristic-ai-technology-859900/",
      image: "https://images.pexels.com/photos/373543/pexels-photo-373543.jpeg?auto=compress&cs=tinysrgb&w=800",
      duration: 13,
      user: { id: 109, name: "Cyber Labs", url: "https://www.pexels.com" },
      video_files: [
        { id: 1009, quality: "hd", file_type: "video/mp4", width: 1920, height: 1080, link: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4" }
      ],
      video_pictures: []
    }
  ]
};

function getFallbackVideos(query: string, orientation?: string): PexelsVideo[] {
  const q = query.toLowerCase();
  let selected: PexelsVideo[] = [];

  if (q.includes("coffee") || q.includes("кофе") || q.includes("cafe")) {
    selected = FALLBACK_BROLL_VIDEOS.coffee;
  } else if (q.includes("office") || q.includes("work") || q.includes("офис") || q.includes("laptop")) {
    selected = FALLBACK_BROLL_VIDEOS.office;
  } else if (q.includes("city") || q.includes("город") || q.includes("street") || q.includes("drone")) {
    selected = FALLBACK_BROLL_VIDEOS.city;
  } else if (q.includes("nature") || q.includes("природа") || q.includes("forest") || q.includes("ocean")) {
    selected = FALLBACK_BROLL_VIDEOS.nature;
  } else if (q.includes("tech") || q.includes("ai") || q.includes("robot") || q.includes("code")) {
    selected = FALLBACK_BROLL_VIDEOS.tech;
  } else {
    // Combine all
    selected = Object.values(FALLBACK_BROLL_VIDEOS).flat();
  }

  if (orientation === "portrait") {
    const portraitOnly = selected.filter(v => v.height > v.width);
    if (portraitOnly.length > 0) return portraitOnly;
  } else if (orientation === "landscape") {
    const landscapeOnly = selected.filter(v => v.width >= v.height);
    if (landscapeOnly.length > 0) return landscapeOnly;
  }

  return selected;
}

export function getPexelsApiKey(): string {
  try {
    const savedKey = safeStorage.getItem(PEXELS_KEY_STORAGE_KEY);
    if (savedKey && savedKey.trim()) {
      return savedKey.trim();
    }
  } catch (e) {
    // Ignore storage errors
  }
  return DEFAULT_PEXELS_API_KEY;
}

export function savePexelsApiKey(key: string): void {
  try {
    if (key && key.trim()) {
      safeStorage.setItem(PEXELS_KEY_STORAGE_KEY, key.trim());
    } else {
      safeStorage.removeItem(PEXELS_KEY_STORAGE_KEY);
    }
  } catch (e) {
    logger.error("Failed to save Pexels API key", e);
  }
}

/**
 * Searches Pexels Video API for stock B-Roll videos matching query.
 * Supports Russian/Cyrillic queries by auto-converting them into English stock keywords.
 */
export async function searchPexelsVideos(
  query: string,
  options?: {
    orientation?: "all" | "portrait" | "landscape" | "square";
    perPage?: number;
    page?: number;
    size?: "small" | "medium" | "large";
  }
): Promise<PexelsSearchResponse> {
  const customApiKey = getPexelsApiKey();
  const rawQuery = query ? query.trim() : "cinematic broll";

  // If query contains Russian/Cyrillic, extract optimal English stock keywords first
  let englishQuery = rawQuery;
  if (/[^\x00-\x7F]/.test(rawQuery)) {
    const extracted = extractKeywordsForStockSearch(rawQuery);
    if (extracted && extracted !== "cinematic b-roll") {
      englishQuery = extracted;
    }
  }

  const perPage = options?.perPage || 12;
  const page = options?.page || 1;
  const orientation = options?.orientation || "all";

  // 1. Try server-side proxy route first (handles Gemini translation + API key)
  try {
    const proxyParams = new URLSearchParams({
      query: rawQuery,
      orientation,
      per_page: perPage.toString(),
      page: page.toString()
    });

    const headers: Record<string, string> = {};
    if (customApiKey) {
      headers["x-pexels-key"] = customApiKey;
    }

    const proxyRes = await fetch(`/api/pexels/search?${proxyParams.toString()}`, {
      headers
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data.videos && data.videos.length > 0) {
        return {
          ...data,
          isFallback: false
        };
      }
    }
  } catch (proxyError) {
    logger.warn("Pexels server proxy call failed, trying direct Pexels API", proxyError);
  }

  // 2. Direct Pexels API fetch if key is present or server proxy unavailable
  if (customApiKey || DEFAULT_PEXELS_API_KEY) {
    const keyToUse = customApiKey || DEFAULT_PEXELS_API_KEY;
    let url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(englishQuery)}&per_page=${perPage}&page=${page}`;

    if (orientation !== "all") {
      url += `&orientation=${orientation}`;
    }

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: keyToUse,
        },
      });

      if (response.ok) {
        const data: PexelsSearchResponse = await response.json();
        if (data.videos && data.videos.length > 0) {
          return {
            ...data,
            isFallback: false
          };
        }
      }
    } catch (error: any) {
      logger.warn("Direct Pexels API call failed, falling back to curated stock library", error);
    }
  }

  // 3. If no videos found or API unreachable, return clean empty result
  return {
    page: 1,
    per_page: perPage,
    total_results: 0,
    videos: [],
    isFallback: false
  };
}

const VISUAL_STEMS_MAP: Array<{ regex: RegExp; en: string; tag: string }> = [
  // People & Emotion
  { regex: /человек|люд|персон/i, en: "person", tag: "person" },
  { regex: /мужчин|парен|пацан/i, en: "man", tag: "man" },
  { regex: /женщин|девуш|девоч/i, en: "woman", tag: "woman" },
  { regex: /шокиров|удивл|шок/i, en: "shocked face", tag: "shocked" },
  { regex: /улыб|смех|смея|радост|счаст/i, en: "happy smiling", tag: "happy" },
  { regex: /задумч|размышл|мысл|сомнен/i, en: "thinking thoughtful", tag: "thoughtful" },
  { regex: /команд|партнер|коллег|совещ|встреч/i, en: "team business meeting", tag: "teamwork" },
  { regex: /рукопош|сделк|договор/i, en: "handshake business", tag: "handshake" },

  // Tech & Digital
  { regex: /ноут|лэптоп|компьютер|пк/i, en: "laptop typing desk", tag: "laptop" },
  { regex: /смартфон|телеф|айфон|экран/i, en: "smartphone screen", tag: "smartphone" },
  { regex: /код|программист|разработ|хакер/i, en: "programmer coding screen", tag: "coding" },
  { regex: /робот|ии|нейросеть|искусственный/i, en: "robot ai futuristic", tag: "AI tech" },
  { regex: /кибер|неон|футуризм/i, en: "cyberpunk neon lights", tag: "cyberpunk" },
  { regex: /сервер|дата-центр|облак/i, en: "data center server", tag: "data center" },

  // Business & Finance
  { regex: /бизнес|предпринимат|офис/i, en: "business office working", tag: "business" },
  { regex: /график|диаграмм|тренд|статист/i, en: "stock chart finance graph", tag: "finance chart" },
  { regex: /деньг|купюр|доллар|валют|наличн/i, en: "money cash dollars", tag: "money" },
  { regex: /крипт|биткоин|трейдинг|инвест/i, en: "crypto bitcoin trading", tag: "crypto" },

  // Media & Production
  { regex: /камер|съемк|оператор|объектив/i, en: "video camera filming", tag: "filming" },
  { regex: /студи|микрофон|подкаст|радио/i, en: "podcast studio microphone", tag: "podcast" },
  { regex: /музык|гитар|пианино|концерт/i, en: "music performance concert", tag: "music" },
  { regex: /монтаж|видеомонтаж|эдитинг/i, en: "video editing studio", tag: "editing" },

  // Food & Drinks
  { regex: /кофе|капучино|эспрессо|бариста|кофейн/i, en: "pouring espresso coffee shop", tag: "coffee" },
  { regex: /чай|кружк|чаш/i, en: "hot tea cup steam", tag: "tea" },
  { regex: /еда|кулин|готовит|повар|ресторан|кухн/i, en: "cooking food kitchen", tag: "cooking" },
  { regex: /бокал|вино|коктейль|бар/i, en: "cocktail bar drinks", tag: "bar drinks" },

  // City & Buildings
  { regex: /город|небоскреб|мегаполис/i, en: "city skyline skyscrapers", tag: "city skyline" },
  { regex: /улиц|трафик|машин|автомоб|дорог/i, en: "city street driving traffic", tag: "city street" },
  { regex: /ноч|огни|вечер/i, en: "night city lights", tag: "night city" },
  { regex: /дрон|аэросъемк|с высоты/i, en: "drone aerial view", tag: "drone shot" },

  // Nature & Weather
  { regex: /природ|пейзаж|ландшафт/i, en: "nature landscape", tag: "nature" },
  { regex: /лес|дерев|тайга/i, en: "forest trees landscape", tag: "forest" },
  { regex: /море|океан|пляж|волн/i, en: "ocean beach waves", tag: "ocean" },
  { regex: /закат|рассвет|солнц/i, en: "sunset golden hour", tag: "sunset" },
  { regex: /гор|вершин|скал/i, en: "mountain nature peaks", tag: "mountains" },
  { regex: /дождь|капл|ливень/i, en: "rain mood drops", tag: "rain" },
  { regex: /космос|галактик|звезд/i, en: "space galaxy stars", tag: "space" },
  { regex: /огн|пламя|костер/i, en: "fire flame cinematic", tag: "fire" },

  // Shot types & angles
  { regex: /крупный план|макро|детал/i, en: "close up detail", tag: "close up" },
  { regex: /медленно|слоумо|slow motion/i, en: "slow motion cinematic", tag: "slow motion" },
  { regex: /замедлен|таймлапс|timelapse/i, en: "timelapse motion", tag: "timelapse" },
];

/**
 * Helper to convert Russian visual/scene description into concise English keywords for Pexels search.
 */
export function extractKeywordsForStockSearch(description: string, title?: string): string {
  if (!description && !title) return "cinematic b-roll";

  const rawText = `${title || ""} ${description || ""}`.trim();
  const matchedKeywords: string[] = [];

  for (const item of VISUAL_STEMS_MAP) {
    if (item.regex.test(rawText)) {
      matchedKeywords.push(item.en);
    }
  }

  if (matchedKeywords.length > 0) {
    // Return top 2-3 matched English search terms
    return Array.from(new Set(matchedKeywords)).slice(0, 3).join(" ");
  }

  // If no match found in dictionary, extract ASCII English words if present
  const asciiWords = rawText.match(/[a-zA-Z]{3,}/g);
  if (asciiWords && asciiWords.length > 0) {
    return Array.from(new Set(asciiWords)).slice(0, 3).join(" ");
  }

  return "cinematic b-roll";
}

/**
 * Extract clickable suggested visual tags for quick filter chips in UI.
 */
export function extractSuggestedVisualTags(description: string, title?: string): Array<{ tag: string; search: string }> {
  const rawText = `${title || ""} ${description || ""}`.trim();
  const tags: Array<{ tag: string; search: string }> = [];

  for (const item of VISUAL_STEMS_MAP) {
    if (item.regex.test(rawText)) {
      tags.push({ tag: item.tag, search: item.en });
    }
  }

  if (tags.length === 0) {
    return [
      { tag: "cinematic", search: "cinematic b-roll" },
      { tag: "close up", search: "close up detail" },
      { tag: "urban", search: "city street drone" },
      { tag: "nature", search: "nature landscape" }
    ];
  }

  return tags.slice(0, 5);
}

