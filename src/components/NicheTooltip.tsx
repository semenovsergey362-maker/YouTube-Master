import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Info, Tag, FolderOpen, Video } from "lucide-react";

interface NicheTooltipProps {
  niche: string;
  type: "tags" | "playlists";
  children: React.ReactNode;
}

interface ClassificationTips {
  title: string;
  shortAdvice: string;
  suggestedItems: string[];
  bestPractice: string;
}

const NICHE_TIPS_MAP: Record<string, Record<"tags" | "playlists", ClassificationTips>> = {
  "Технологии": {
    tags: {
      title: "Метки для Технологий",
      shortAdvice: "Разделяйте видео по уровню разбора и техническому формату.",
      suggestedItems: ["Обзор гаджета", "Сравнение", "Инструкция / Гайд", "Тренды ИТ", "Лайфхаки"],
      bestPractice: "Метки помогают зрителям мгновенно понять, увидят ли они быстрый тест-драйв или детальный разбор кода."
    },
    playlists: {
      title: "Плейлисты для Технологий",
      shortAdvice: "Группируйте ролики вокруг экосистем, брендов или циклов обучения.",
      suggestedItems: ["Экосистема Apple", "Обзоры умного дома", "Основы ИИ", "Сборки ПК и Железо"],
      bestPractice: "Серийный просмотр в плейлистах увеличивает глубину сессии и поднимает поведенческие факторы канала."
    }
  },
  "Игры": {
    tags: {
      title: "Метки для Гейминга",
      shortAdvice: "Категоризируйте контент по жанру взаимодействия с игрой.",
      suggestedItems: ["Летсплей", "Гайд / Секреты", "Пасхалки", "Обзор игры", "Спидран"],
      bestPractice: "Четкие теги упрощают поиск контента по конкретным запросам игроков, ищущих прохождение сложных уровней."
    },
    playlists: {
      title: "Плейлисты для Гейминга",
      shortAdvice: "Объединяйте видео строго по тайтлам или жанровым подборкам.",
      suggestedItems: ["Прохождение GTA VI", "Гайды по Minecraft", "Обзоры инди-шедевров", "Сетевые катки"],
      bestPractice: "Используйте названия игр на первом месте в плейлисте для лучшего SEO-соответствия алгоритмам YouTube."
    }
  },
  "Образование": {
    tags: {
      title: "Метки для Образования",
      shortAdvice: "Указывайте сложность материала и дидактический формат.",
      suggestedItems: ["С нуля / Новичкам", "Продвинутый уровень", "Лекция", "Быстрый разбор", "Теория"],
      bestPractice: "Это отсекает нецелевую аудиторию и привлекает учеников с подходящим уровнем подготовки."
    },
    playlists: {
      title: "Плейлисты для Образования",
      shortAdvice: "Выстраивайте логическую цепочку уроков от простого к сложному.",
      suggestedItems: ["Основы Python с нуля", "Физика на пальцах", "Подготовка к ЕГЭ", "История науки"],
      bestPractice: "Превращайте плейлисты в полноценные учебные модули. Зрители будут смотреть их подряд, как сериал."
    }
  },
  "Лайфстайл": {
    tags: {
      title: "Метки для Лайфстайла",
      shortAdvice: "Ориентируйтесь на эмоциональный окрас контента и его тематику.",
      suggestedItems: ["Один мой день / VLOG", "Распаковка", "Мой вечер / Рутина", "Минимализм", "Челлендж"],
      bestPractice: "Теги помогают формировать личный бренд автора и связывать разнородные видео единым настроением."
    },
    playlists: {
      title: "Плейлисты для Лайфстайла",
      shortAdvice: "Разделяйте жизнь автора по ключевым сферам интересов.",
      suggestedItems: ["Утренние влоги", "Организация пространства", "Моя продуктивность", "Покупки"],
      bestPractice: "Создавайте эстетически выверенные серии, чтобы зрители проникались вашим образом жизни."
    }
  },
  "Бизнес": {
    tags: {
      title: "Метки для Бизнеса",
      shortAdvice: "Разделяйте контент по масштабу и практической пользе.",
      suggestedItems: ["Стартапы", "Кейсы", "Маркетинг", "Интервью", "Ошибки фаундеров"],
      bestPractice: "Маркировка видео по направлениям бизнеса повышает вовлечение предпринимателей в целевые разборы."
    },
    playlists: {
      title: "Плейлисты для Бизнеса",
      shortAdvice: "Структурируйте видео по этапам развития компании.",
      suggestedItems: ["Запуск бизнеса", "Масштабирование и франшизы", "Разборы известных брендов", "Бизнес-книги"],
      bestPractice: "Систематизированный контент позиционирует вас как эксперта, способного вести зрителя шаг за шагом."
    }
  },
  "Финансы": {
    tags: {
      title: "Метки для Финансов",
      shortAdvice: "Разделяйте по инструментам инвестирования и целям.",
      suggestedItems: ["Пассивный доход", "Акции и облигации", "Личный бюджет", "Анализ рынка", "Налоги"],
      bestPractice: "Финансовые теги помогают алгоритмам рекомендовать ваши видео платежеспособной аудитории."
    },
    playlists: {
      title: "Плейлисты для Финансов",
      shortAdvice: "Объединяйте ролики по уровню капитала и инвестиционной стратегии.",
      suggestedItems: ["Инвестиции для новичков", "Разборы фин-отчетов компаний", "Путь к миллиону", "Экономические обзоры"],
      bestPractice: "Разделяйте базовую финансовую грамотность и сложные аналитические инструменты в разные плейлисты."
    }
  },
  "Криптовалюта": {
    tags: {
      title: "Метки для Криптовалюты",
      shortAdvice: "Различайте контент по рискам и практической пользе.",
      suggestedItems: ["Аирдропы / Тестнеты", "Теханализ", "DeFi стратегии", "Обзоры токенов", "Новичкам"],
      bestPractice: "Крипторынок динамичен, поэтому теги помогают отделить срочные новости от долгосрочных обучающих видео."
    },
    playlists: {
      title: "Плейлисты для Криптовалюты",
      shortAdvice: "Группируйте контент по практическому применению.",
      suggestedItems: ["Крипта с полного нуля", "Торговые стратегии", "Разборы блокчейн-проектов", "Пассивный доход в Web3"],
      bestPractice: "Создавайте плейлисты-инструкции, которые ведут пользователя от регистрации на бирже до первой сделки."
    }
  },
  "Психология": {
    tags: {
      title: "Метки для Психологии",
      shortAdvice: "Классифицируйте по ключевому запросу или проблеме зрителя.",
      suggestedItems: ["Отношения", "Самооценка", "Борьба с тревогой", "Прокрастинация", "Разбор триггеров"],
      bestPractice: "Конкретные терапевтические метки вызывают больше доверия и помогают находить ответы на личные вопросы."
    },
    playlists: {
      title: "Плейлисты для Психологии",
      shortAdvice: "Организуйте контент по глубинным направлениям и циклам лекций.",
      suggestedItems: ["Анализ созависимости", "Как понять свои эмоции", "Психосоматика", "Психология общения"],
      bestPractice: "Зрители склонны за один раз просматривать целые плейлисты на волнующую их психологическую тему."
    }
  }
};

const DEFAULT_TIPS: Record<"tags" | "playlists", ClassificationTips> = {
  tags: {
    title: "Метки для Вашей Ниши",
    shortAdvice: "Категоризируйте идеи по этапам продакшена, формату ролика или целевой аудитории.",
    suggestedItems: ["В планах", "Сценарий готов", "Шортс", "Длинный ролик", "Инфоконтент"],
    bestPractice: "Метки помогают структурировать творческий хаос и моментально фильтровать базу идей по статусам готовности."
  },
  playlists: {
    title: "Тематические Плейлисты",
    shortAdvice: "Формируйте сквозные сюжетные линии и контентные сериалы.",
    suggestedItems: ["Серия разборов", "Советы эксперта", "Пошаговое руководство", "Ответы на вопросы"],
    bestPractice: "Наличие связанных видео в одном плейлисте заставляет зрителей дольше оставаться на вашем канале."
  }
};

export const NicheTooltip: React.FC<NicheTooltipProps> = ({ niche, type, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Find appropriate tips
  const cleanNiche = niche ? niche.trim() : "";
  const nicheTips = NICHE_TIPS_MAP[cleanNiche]?.[type] || DEFAULT_TIPS[type];

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onFocus={() => setIsOpen(true)}
      onBlur={() => setIsOpen(false)}
    >
      {children}
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="niche-tooltip-card"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute bottom-full mb-3.5 left-1/2 -translate-x-1/2 z-[999] w-72 p-4 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl text-left pointer-events-none font-sans"
          >
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
                {type === "tags" ? (
                  <Tag size={14} className="text-accent shrink-0" />
                ) : (
                  <FolderOpen size={14} className="text-blue-400 shrink-0" />
                )}
                <span className="text-xs font-bold text-white leading-none">
                  {nicheTips.title}
                </span>
                <span className="ml-auto text-[9px] px-1.5 py-0.5 bg-neutral-800 text-neutral-400 rounded-md font-mono">
                  Справка
                </span>
              </div>

              {/* Main Text */}
              <p className="text-[10.5px] text-neutral-300 leading-relaxed font-sans">
                {nicheTips.shortAdvice}
              </p>

              {/* Suggestions */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider font-sans block">
                  Рекомендуемые элементы:
                </span>
                <div className="flex flex-wrap gap-1">
                  {nicheTips.suggestedItems.map((item, idx) => (
                    <span 
                      key={`tip-${idx}-${item}`} 
                      className="text-[9px] px-1.5 py-0.5 bg-neutral-950 text-neutral-400 rounded border border-neutral-800 font-sans"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              {/* Best Practice / Why it matters */}
              <div className="bg-neutral-950/60 p-2 rounded-lg border border-neutral-800/40 text-[9.5px] text-neutral-400 leading-normal font-sans italic flex gap-1.5 items-start">
                <Info size={11} className="text-accent/80 shrink-0 mt-0.5" />
                <span>{nicheTips.bestPractice}</span>
              </div>
            </div>

            {/* Micro Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-neutral-800" />
            <div className="absolute top-[100%] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-neutral-900" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
