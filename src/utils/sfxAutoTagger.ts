/**
 * Utility functions for parsing, auto-tagging, and generating Pixabay SFX links for script scenes.
 */

// Mapping of Russian SFX terms to English Pixabay search keywords for best search results
const SFX_TRANSLATION_MAP: Record<string, string> = {
  "whoosh": "whoosh",
  "вуш": "whoosh",
  "переход": "whoosh transition",
  "свош": "swoosh",
  "взрыв": "explosion",
  "удар": "impact",
  "импакт": "impact",
  "саб дроп": "sub drop",
  "sub drop": "sub drop",
  "шаги": "footsteps",
  "бег": "running footsteps",
  "дождь": "rain",
  "гром": "thunder",
  "ветер": "wind",
  "вода": "water splash",
  "природа": "nature ambience",
  "город": "city ambience",
  "машина": "car pass",
  "сигнал": "car horn",
  "аплодисменты": "applause",
  "хлопки": "clapping",
  "смех": "laughter",
  "кнопка": "button click",
  "клик": "click",
  "уведомление": "notification",
  "звонок": "bell chime",
  "телефон": "phone ring",
  "глюк": "glitch",
  "глитч": "glitch",
  "радио": "radio static",
  "помехи": "static noise",
  "часы": "clock ticking",
  "таймер": "timer beep",
  "деньги": "coin drop",
  "монеты": "coins clink",
  "огонь": "fire crackle",
  "костер": "campfire",
  "шорох": "rustle",
  "бумага": "paper tear",
  "клавиатура": "keyboard typing",
  "интершум": "background ambience",
  "фон": "ambient drone",
  "нарастание": "riser",
  "напряжение": "tension riser"
};

/**
 * Splits a raw soundsAndNoises string into clean individual SFX tags.
 */
export function parseSFXTags(rawSFX?: string, visualDesc: string = '', textDesc: string = ''): string[] {
  if (!rawSFX || rawSFX.trim() === '' || rawSFX.trim().toLowerCase() === 'нет' || rawSFX.trim().toLowerCase() === 'none') {
    return autoGenerateSFXFromScene(visualDesc, textDesc);
  }

  // Split by common delimiters: comma, slash, semicolon, plus, pipe, newline, " и ", " and "
  const rawParts = rawSFX.split(/[,/;\n+|]|\s+(?:и|and)\s+/i);
  const tags: string[] = [];

  for (let part of rawParts) {
    let clean = part.replace(/^[-•*0-9.]+\s*/, '').replace(/[()"'«»]/g, '').trim();
    if (clean.length > 1 && !['нет', 'none', '-', 'без звуков'].includes(clean.toLowerCase())) {
      tags.push(clean);
    }
  }

  return tags.length > 0 ? tags : autoGenerateSFXFromScene(visualDesc, textDesc);
}

/**
 * Auto-detects suitable SFX tags based on keywords in visual & text descriptions.
 */
export function autoGenerateSFXFromScene(visualDesc: string = '', textDesc: string = ''): string[] {
  const combined = (visualDesc + ' ' + textDesc).toLowerCase();
  const detectedTags = new Set<string>();

  if (/наезд|зум|панорама|смена|переход|монтаж|динамич|fast|zoom|camera|кадр|крупный|общий/.test(combined)) {
    detectedTags.add("Whoosh");
  }
  if (/взрыв|удар|падение|вспышка|огонь|разруш|столкнов|грохот|impact|bang/.test(combined)) {
    detectedTags.add("Impact");
    detectedTags.add("Explosion");
  }
  if (/дождь|ливень|гроза|капли|дождлив/.test(combined)) {
    detectedTags.add("Rain");
    detectedTags.add("Thunder");
  }
  if (/ветер|ураган|буря|метель|шторм/.test(combined)) {
    detectedTags.add("Wind");
  }
  if (/вода|река|море|океан|волна|брызги|плава/.test(combined)) {
    detectedTags.add("Water");
  }
  if (/экран|компьютер|телефон|смартфон|уведомлен|сообщен|кнопка|клик|код|интерфейс|ui|digital/.test(combined)) {
    detectedTags.add("Notification");
    detectedTags.add("Click");
  }
  if (/глюк|глитч|помехи|сбой|кибер|компьютерн|digital error/.test(combined)) {
    detectedTags.add("Glitch");
  }
  if (/шаги|идет|бежит|прогулка|афальт|песок|ноги/.test(combined)) {
    detectedTags.add("Footsteps");
  }
  if (/хлопки|аплодисменты|овации|зала|публика/.test(combined)) {
    detectedTags.add("Applause");
  }
  if (/смех|улыб|шутка|веселье|ха-ха/.test(combined)) {
    detectedTags.add("Laughter");
  }
  if (/город|улица|машина|автомобиль|трафик|дорога|транспорт/.test(combined)) {
    detectedTags.add("City Ambience");
  }
  if (/деньги|доллар|монет|касса|купюр|богатств/.test(combined)) {
    detectedTags.add("Coins");
  }
  if (/часы|время|таймер|отсчет|секунд/.test(combined)) {
    detectedTags.add("Clock Ticking");
  }
  if (/страх|тайна|темнота|ужас|напряжен|драма|тревога/.test(combined)) {
    detectedTags.add("Tension Riser");
  }
  if (/природа|лес|птицы|дерев|утро|солнце/.test(combined)) {
    detectedTags.add("Nature Ambience");
  }

  if (detectedTags.size === 0) {
    detectedTags.add("Whoosh");
    detectedTags.add("Background Ambience");
  }

  return Array.from(detectedTags);
}

/**
 * Generates the direct Pixabay SFX search URL for a given tag.
 */
export function getPixabaySFXSearchUrl(tag: string): string {
  const cleanTag = tag.trim().toLowerCase();
  const englishSearch = SFX_TRANSLATION_MAP[cleanTag] || tag.replace(/[^a-zA-Zа-яА-Я0-9\s]/g, '').trim();
  return `https://pixabay.com/ru/sound-effects/search/${encodeURIComponent(englishSearch)}/`;
}
