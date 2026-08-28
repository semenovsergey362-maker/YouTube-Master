import {
  Camera, Flame, Clock, Sparkles, Grid, Palette, Box, Zap, Square, Droplets, Pencil, Paintbrush, BookOpen, PenTool, Wand2, Radio, Cog, Star, Moon, Eye, Cloud, Triangle, Hexagon, Coffee, Trophy, Sun, Briefcase, Wind, Heart, Headphones, Laugh, Target, Music, Gamepad2, Lightbulb, Users, TrendingUp, Activity, Scissors, Shirt, Car, Clapperboard, Brain, Dog, Newspaper, Home, Stethoscope, Brush, FlaskConical, Film, Coins, Baby, Library
} from "lucide-react";

export const DEMO_DATA: Record<string, { name: string; value: number }[]> = {
  Технологии: [
    { name: "18-24", value: 450 },
    { name: "25-34", value: 350 },
    { name: "35-44", value: 150 },
    { name: "45+", value: 50 },
  ],
  Игры: [
    { name: "13-17", value: 300 },
    { name: "18-24", value: 500 },
    { name: "25-34", value: 150 },
    { name: "35+", value: 50 },
  ],
  Образование: [
    { name: "18-24", value: 200 },
    { name: "25-34", value: 400 },
    { name: "35-44", value: 300 },
    { name: "45+", value: 100 },
  ],
  Лайфстайл: [
    { name: "18-24", value: 400 },
    { name: "25-34", value: 300 },
    { name: "35-44", value: 200 },
    { name: "45+", value: 100 },
  ],
  Бизнес: [
    { name: "25-34", value: 500 },
    { name: "35-44", value: 300 },
    { name: "45-54", value: 150 },
    { name: "55+", value: 50 },
  ],
  Финансы: [
    { name: "25-34", value: 450 },
    { name: "35-44", value: 350 },
    { name: "45-54", value: 150 },
    { name: "55+", value: 50 },
  ],
  Путешествия: [
    { name: "18-24", value: 250 },
    { name: "25-34", value: 400 },
    { name: "35-44", value: 250 },
    { name: "45+", value: 100 },
  ],
  Кулинария: [
    { name: "18-24", value: 150 },
    { name: "25-34", value: 350 },
    { name: "35-44", value: 300 },
    { name: "45+", value: 200 },
  ],
  Фитнес: [
    { name: "18-24", value: 350 },
    { name: "25-34", value: 400 },
    { name: "35-44", value: 200 },
    { name: "45+", value: 50 },
  ],
  DIY: [
    { name: "18-24", value: 200 },
    { name: "25-34", value: 300 },
    { name: "35-44", value: 350 },
    { name: "45+", value: 150 },
  ],
  Красота: [
    { name: "13-17", value: 250 },
    { name: "18-24", value: 450 },
    { name: "25-34", value: 200 },
    { name: "35+", value: 100 },
  ],
  Автомобили: [
    { name: "18-24", value: 200 },
    { name: "25-34", value: 400 },
    { name: "35-44", value: 300 },
    { name: "45+", value: 100 },
  ],
  Психология: [
    { name: "18-24", value: 150 },
    { name: "25-34", value: 450 },
    { name: "35-44", value: 300 },
    { name: "45+", value: 100 },
  ],
  Криптовалюта: [
    { name: "18-24", value: 300 },
    { name: "25-34", value: 500 },
    { name: "35-44", value: 150 },
    { name: "45+", value: 50 },
  ],
  История: [
    { name: "18-24", value: 200 },
    { name: "25-34", value: 350 },
    { name: "35-44", value: 300 },
    { name: "45+", value: 150 },
  ],
  "Свой вариант": [
    { name: "18-24", value: 250 },
    { name: "25-34", value: 250 },
    { name: "35-44", value: 250 },
    { name: "45+", value: 250 },
  ],
};

export const TREND_DATA: Record<string, { name: string; views: number }[]> = {
  Технологии: [
    { name: "Янв", views: 4000 },
    { name: "Фев", views: 3500 },
    { name: "Мар", views: 5500 },
    { name: "Апр", views: 4500 },
    { name: "Май", views: 7000 },
  ],
  Игры: [
    { name: "Янв", views: 8000 },
    { name: "Фев", views: 7500 },
    { name: "Мар", views: 9000 },
    { name: "Апр", views: 8500 },
    { name: "Май", views: 10000 },
  ],
  Образование: [
    { name: "Янв", views: 2000 },
    { name: "Фев", views: 4500 },
    { name: "Мар", views: 5000 },
    { name: "Апр", views: 3500 },
    { name: "Май", views: 4000 },
  ],
  Лайфстайл: [
    { name: "Янв", views: 5000 },
    { name: "Фев", views: 5200 },
    { name: "Мар", views: 5100 },
    { name: "Апр", views: 5300 },
    { name: "Май", views: 5500 },
  ],
  Бизнес: [
    { name: "Янв", views: 3000 },
    { name: "Фев", views: 3200 },
    { name: "Мар", views: 3500 },
    { name: "Апр", views: 3800 },
    { name: "Май", views: 4200 },
  ],
  Финансы: [
    { name: "Янв", views: 2500 },
    { name: "Фев", views: 2800 },
    { name: "Мар", views: 3200 },
    { name: "Апр", views: 3500 },
    { name: "Май", views: 4000 },
  ],
  Путешествия: [
    { name: "Янв", views: 1500 },
    { name: "Фев", views: 1200 },
    { name: "Мар", views: 2500 },
    { name: "Апр", views: 4000 },
    { name: "Май", views: 6000 },
  ],
  Кулинария: [
    { name: "Янв", views: 3500 },
    { name: "Фев", views: 3800 },
    { name: "Мар", views: 4200 },
    { name: "Апр", views: 4000 },
    { name: "Май", views: 4500 },
  ],
  Фитнес: [
    { name: "Янв", views: 6000 },
    { name: "Фев", views: 5500 },
    { name: "Мар", views: 5000 },
    { name: "Апр", views: 4500 },
    { name: "Май", views: 4000 },
  ],
  DIY: [
    { name: "Янв", views: 2000 },
    { name: "Фев", views: 2200 },
    { name: "Мар", views: 2500 },
    { name: "Апр", views: 2800 },
    { name: "Май", views: 3200 },
  ],
  Красота: [
    { name: "Янв", views: 5000 },
    { name: "Фев", views: 5500 },
    { name: "Мар", views: 6000 },
    { name: "Апр", views: 7000 },
    { name: "Май", views: 8500 },
  ],
  Автомобили: [
    { name: "Янв", views: 3000 },
    { name: "Фев", views: 3500 },
    { name: "Мар", views: 4000 },
    { name: "Апр", views: 4500 },
    { name: "Май", views: 5000 },
  ],
  Криптовалюта: [
    { name: "Янв", views: 10000 },
    { name: "Фев", views: 15000 },
    { name: "Мар", views: 8000 },
    { name: "Апр", views: 12000 },
    { name: "Май", views: 20000 },
  ],
  История: [
    { name: "Янв", views: 3000 },
    { name: "Фев", views: 3200 },
    { name: "Мар", views: 4500 },
    { name: "Апр", views: 5000 },
    { name: "Май", views: 5500 },
  ],
  "Свой вариант": [
    { name: "Янв", views: 1000 },
    { name: "Фев", views: 1000 },
    { name: "Мар", views: 1000 },
    { name: "Апр", views: 1000 },
    { name: "Май", views: 1000 },
  ],
};

export const COMPETITORS: Record<
  string,
  {
    name: string;
    subs: string;
    desc: string;
    weakness: string;
    strategy: string;
    engagement: number;
  }[]
> = {
  Технологии: [
    {
      name: "TechCrunch",
      subs: "1.5M",
      desc: "Новости технологий и стартапов.",
      weakness: "Слишком формальный стиль.",
      strategy: "Добавьте личное мнение и юмор в обзоры.",
      engagement: 2.1,
    },
    {
      name: "MKBHD",
      subs: "18M",
      desc: "Обзоры гаджетов.",
      weakness: "Редко делает глубокие технические разборы.",
      strategy:
        "Делайте упор на технические детали и тесты производительности.",
      engagement: 5.4,
    },
    {
      name: "Verge",
      subs: "4M",
      desc: "Технологии и культура.",
      weakness: "Фокус на широкую аудиторию, мало деталей.",
      strategy: "Сфокусируйтесь на узких, профессиональных темах.",
      engagement: 3.2,
    },
    {
      name: "Linus Tech Tips",
      subs: "15M",
      desc: "Компьютерное железо.",
      weakness: "Часто перегружено рекламой.",
      strategy: "Делайте честные обзоры без навязчивой рекламы.",
      engagement: 4.8,
    },
    {
      name: "Unbox Therapy",
      subs: "20M",
      desc: "Распаковки гаджетов.",
      weakness: "Мало аналитики, только поверхностный взгляд.",
      strategy: "Добавляйте глубокий анализ использования после месяца тестов.",
      engagement: 3.9,
    },
  ],
  Игры: [
    {
      name: "IGN",
      subs: "17M",
      desc: "Игровые новости и обзоры.",
      weakness: "Часто предвзятые оценки.",
      strategy: "Будьте максимально объективны и слушайте сообщество.",
      engagement: 2.5,
    },
    {
      name: "GameSpot",
      subs: "10M",
      desc: "Игровые новости и обзоры.",
      weakness: "Слишком длинные видео.",
      strategy: "Делайте короткие, емкие выжимки самого важного.",
      engagement: 2.8,
    },
    {
      name: "PewDiePie",
      subs: "111M",
      desc: "Летсплеи и развлечения.",
      weakness: "Контент стал менее структурированным.",
      strategy: "Вернитесь к формату структурированных прохождений с сюжетом.",
      engagement: 6.1,
    },
    {
      name: "Jacksepticeye",
      subs: "30M",
      desc: "Летсплеи и развлечения.",
      weakness: "Слишком шумный стиль для некоторых.",
      strategy: "Используйте более спокойный, ламповый стиль общения.",
      engagement: 5.5,
    },
    {
      name: "Markiplier",
      subs: "35M",
      desc: "Летсплеи и развлечения.",
      weakness: "Фокус на эмоциях, а не на игре.",
      strategy: "Больше внимания уделяйте лору и механике игры.",
      engagement: 5.8,
    },
  ],
  Образование: [
    {
      name: "Khan Academy",
      subs: "8M",
      desc: "Бесплатное образование.",
      weakness: "Скучная подача материала.",
      strategy: "Используйте сторителлинг и яркую анимацию.",
      engagement: 1.5,
    },
    {
      name: "TED-Ed",
      subs: "19M",
      desc: "Короткие образовательные видео.",
      weakness: "Недостаточно глубокое погружение.",
      strategy: "Делайте серии видео, глубоко раскрывающие одну тему.",
      engagement: 3.2,
    },
    {
      name: "Veritasium",
      subs: "15M",
      desc: "Наука и образование.",
      weakness: "Редкие выпуски.",
      strategy: "Выпускайте контент чаще, используя более простой продакшн.",
      engagement: 4.5,
    },
    {
      name: "Kurzgesagt",
      subs: "22M",
      desc: "Наука и анимация.",
      weakness: "Сложно адаптировать стиль.",
      strategy: "Найдите свой уникальный, более простой визуальный стиль.",
      engagement: 5.2,
    },
    {
      name: "CrashCourse",
      subs: "15M",
      desc: "Образовательные курсы.",
      weakness: "Слишком быстрый темп речи.",
      strategy: "Говорите в умеренном темпе, делайте паузы для осмысления.",
      engagement: 3.8,
    },
  ],
  Лайфстайл: [
    {
      name: "Emma Chamberlain",
      subs: "12M",
      desc: "Влоги и лайфстайл.",
      weakness: "Отсутствие четкой темы.",
      strategy: "Выберите 2-3 ключевые темы и придерживайтесь их.",
      engagement: 6.5,
    },
    {
      name: "Casey Neistat",
      subs: "12M",
      desc: "Влоги и кинопроизводство.",
      weakness: "Высокая планка качества, сложно повторить.",
      strategy: 'Покажите "грязный" процесс без прикрас, будьте ближе к людям.',
      engagement: 5.8,
    },
    {
      name: "David Dobrik",
      subs: "18M",
      desc: "Влоги и развлечения.",
      weakness: "Специфический юмор.",
      strategy: "Используйте более универсальный, добрый юмор.",
      engagement: 7.2,
    },
    {
      name: "Zoella",
      subs: "10M",
      desc: "Лайфстайл и красота.",
      weakness: "Устаревший формат.",
      strategy: "Перейдите на формат Shorts и более динамичный монтаж.",
      engagement: 2.1,
    },
    {
      name: "Alisha Marie",
      subs: "8M",
      desc: "Лайфстайл и влоги.",
      weakness: "Повторяющийся контент.",
      strategy: "Экспериментируйте с новыми форматами каждую неделю.",
      engagement: 3.4,
    },
  ],
  Бизнес: [
    {
      name: "GaryVee",
      subs: "4M",
      desc: "Бизнес и мотивация.",
      weakness: "Много воды, мало конкретики.",
      strategy: "Давайте пошаговые инструкции и реальные кейсы.",
      engagement: 4.2,
    },
    {
      name: "Graham Stephan",
      subs: "4M",
      desc: "Финансы и инвестиции.",
      weakness: "Фокус только на США.",
      strategy: "Делайте обзоры глобальных рынков и других стран.",
      engagement: 3.9,
    },
    {
      name: "Ali Abdaal",
      subs: "5M",
      desc: "Продуктивность и бизнес.",
      weakness: "Слишком идеализированный подход.",
      strategy: "Рассказывайте о провалах и трудностях без прикрас.",
      engagement: 4.8,
    },
    {
      name: "Meet Kevin",
      subs: "2M",
      desc: "Финансы и бизнес.",
      weakness: "Слишком частые, но поверхностные видео.",
      strategy: "Делайте одно глубокое видео в неделю вместо пяти коротких.",
      engagement: 3.5,
    },
    {
      name: "Andrei Jikh",
      subs: "2M",
      desc: "Финансы и инвестиции.",
      weakness: "Фокус на хайповых темах.",
      strategy: "Разбирайте фундаментальные основы инвестирования.",
      engagement: 3.7,
    },
  ],
  Финансы: [
    {
      name: "Investopedia",
      subs: "1M",
      desc: "Финансовое образование.",
      weakness: "Слишком академично.",
      strategy: "Объясняйте сложные термины на простых примерах из жизни.",
      engagement: 1.2,
    },
    {
      name: "The Financial Diet",
      subs: "1M",
      desc: "Личные финансы.",
      weakness: "Узкая аудитория.",
      strategy: "Расширьте темы на разные возрастные группы.",
      engagement: 2.8,
    },
    {
      name: "MoneyWeek",
      subs: "500K",
      desc: "Инвестиции.",
      weakness: "Скучный визуальный ряд.",
      strategy: "Добавьте динамичную графику и живые примеры.",
      engagement: 1.5,
    },
    {
      name: "Bloomberg",
      subs: "2M",
      desc: "Финансовые новости.",
      weakness: "Сложно для новичков.",
      strategy: 'Делайте рубрику "Финансы для чайников".',
      engagement: 1.8,
    },
    {
      name: "CNBC",
      subs: "5M",
      desc: "Финансы и бизнес.",
      weakness: "Слишком корпоративный стиль.",
      strategy: "Будьте более неформальными и открытыми к аудитории.",
      engagement: 2.0,
    },
  ],
  Путешествия: [
    {
      name: "Expedia",
      subs: "500K",
      desc: "Путешествия.",
      weakness: "Слишком рекламный характер.",
      strategy: "Делайте честные обзоры отелей и мест без прикрас.",
      engagement: 1.0,
    },
    {
      name: "Lonely Planet",
      subs: "300K",
      desc: "Гайды по странам.",
      weakness: "Отсутствие личного опыта.",
      strategy: "Делитесь личными историями и факапами из поездок.",
      engagement: 1.2,
    },
    {
      name: "Mark Wiens",
      subs: "10M",
      desc: "Еда и путешествия.",
      weakness: "Фокус только на еде.",
      strategy: "Показывайте культуру и быт людей, а не только тарелки.",
      engagement: 4.5,
    },
    {
      name: "Kara and Nate",
      subs: "4M",
      desc: "Влоги о путешествиях.",
      weakness: "Слишком много семейного контента.",
      strategy: "Больше полезных советов по логистике и экономии.",
      engagement: 5.2,
    },
    {
      name: "Lost LeBlanc",
      subs: "2M",
      desc: "Кинематографичные путешествия.",
      weakness: "Сложно повторить бюджет.",
      strategy: "Показывайте бюджетные варианты тех же локаций.",
      engagement: 4.8,
    },
  ],
  Кулинария: [
    {
      name: "Gordon Ramsay",
      subs: "20M",
      desc: "Кулинарные мастер-классы.",
      weakness: "Слишком агрессивная подача.",
      strategy: "Будьте более терпеливым учителем, объясняйте нюансы.",
      engagement: 5.5,
    },
    {
      name: "Tasty",
      subs: "20M",
      desc: "Быстрые рецепты.",
      weakness: "Отсутствие детальных инструкций.",
      strategy: "Добавьте точные граммовки и время приготовления.",
      engagement: 3.2,
    },
    {
      name: "Binging with Babish",
      subs: "10M",
      desc: "Еда из кино.",
      weakness: "Сложные рецепты.",
      strategy: "Предлагайте упрощенные альтернативы дорогим ингредиентам.",
      engagement: 4.8,
    },
    {
      name: "Joshua Weissman",
      subs: "8M",
      desc: "Кулинария.",
      weakness: "Слишком много монтажных склеек.",
      strategy: 'Сделайте формат "одним кадром" для простых блюд.',
      engagement: 5.2,
    },
    {
      name: "Bon Appétit",
      subs: "6M",
      desc: "Кулинария.",
      weakness: "Сложно для домашней кухни.",
      strategy: "Адаптируйте рецепты под обычную кухонную технику.",
      engagement: 3.8,
    },
  ],
  Фитнес: [
    {
      name: "Athlean-X",
      subs: "13M",
      desc: "Научный подход к фитнесу.",
      weakness: "Сложная терминология.",
      strategy: "Переводите научный язык на понятный обывателю.",
      engagement: 4.2,
    },
    {
      name: "Jeff Nippard",
      subs: "5M",
      desc: "Научный подход к тренировкам.",
      weakness: "Слишком много теории.",
      strategy: "Давайте больше готовых программ тренировок.",
      engagement: 4.8,
    },
    {
      name: "Chris Heria",
      subs: "7M",
      desc: "Калистеника.",
      weakness: "Высокий порог входа.",
      strategy: 'Сделайте курс "Калистеника с нуля для полных новичков".',
      engagement: 5.1,
    },
    {
      name: "Yoga with Adriene",
      subs: "12M",
      desc: "Йога.",
      weakness: "Слишком медленный темп.",
      strategy: "Добавьте интенсивные 15-минутные тренировки.",
      engagement: 3.5,
    },
    {
      name: "Blogilates",
      subs: "6M",
      desc: "Пилатес.",
      weakness: "Фокус на эстетике, а не на здоровье.",
      strategy: "Делайте упор на функциональность и здоровье спины.",
      engagement: 3.8,
    },
  ],
  DIY: [
    {
      name: "5-Minute Crafts",
      subs: "80M",
      desc: "Лайфхаки.",
      weakness: "Много нерабочих идей.",
      strategy: "Проверяйте лайфхаки и разоблачайте фейки.",
      engagement: 2.5,
    },
    {
      name: "Troom Troom",
      subs: "25M",
      desc: "DIY и лайфхаки.",
      weakness: "Слишком нереалистично.",
      strategy: "Делайте полезные вещи для реальной жизни.",
      engagement: 2.2,
    },
    {
      name: "The King of Random",
      subs: "12M",
      desc: "Эксперименты.",
      weakness: "Опасные эксперименты.",
      strategy: "Показывайте безопасные опыты для всей семьи.",
      engagement: 3.8,
    },
    {
      name: "I Like To Make Stuff",
      subs: "3M",
      desc: "Мастерская.",
      weakness: "Требует дорогого инструмента.",
      strategy: "Показывайте, как сделать то же самое ручным инструментом.",
      engagement: 4.1,
    },
    {
      name: "DIY Perks",
      subs: "4M",
      desc: "Технический DIY.",
      weakness: "Слишком сложно для новичков.",
      strategy: "Делайте подробные гайды для начинающих электронщиков.",
      engagement: 4.5,
    },
  ],
  История: [
    {
      name: "OverSimplified",
      subs: "7M",
      desc: "История в юмористической анимации.",
      weakness: "Очень редкие выпуски.",
      strategy: "Выпускайте контент чаще, используя более простую графику.",
      engagement: 8.5,
    },
    {
      name: "The Infographics Show",
      subs: "12M",
      desc: "Факты и история.",
      weakness: "Иногда поверхностный анализ.",
      strategy: "Привлекайте экспертов-историков для глубокого разбора.",
      engagement: 3.2,
    },
    {
      name: "History Channel",
      subs: "10M",
      desc: "Документальные фильмы.",
      weakness: "Слишком телевизионный формат.",
      strategy: "Адаптируйте формат под быстрый темп YouTube.",
      engagement: 2.1,
    },
    {
      name: "Kings and Generals",
      subs: "3M",
      desc: "Военная история.",
      weakness: "Узкая специализация.",
      strategy:
        "Рассказывайте о быте и культуре тех времен, а не только о битвах.",
      engagement: 4.8,
    },
    {
      name: "Timeline",
      subs: "4M",
      desc: "Мировая история.",
      weakness: "Длинные видео, сложно для Shorts.",
      strategy: "Делайте нарезки самых интересных фактов для Shorts.",
      engagement: 3.5,
    },
  ],
  "Свой вариант": [
    {
      name: "Конкурент 1",
      subs: "N/A",
      desc: "Описание конкурента.",
      weakness: "N/A",
      strategy: "N/A",
      engagement: 0,
    },
    {
      name: "Конкурент 2",
      subs: "N/A",
      desc: "Описание конкурента.",
      weakness: "N/A",
      strategy: "N/A",
      engagement: 0,
    },
    {
      name: "Конкурент 3",
      subs: "N/A",
      desc: "Описание конкурента.",
      weakness: "N/A",
      strategy: "N/A",
      engagement: 0,
    },
    {
      name: "Конкурент 4",
      subs: "N/A",
      desc: "Описание конкурента.",
      weakness: "N/A",
      strategy: "N/A",
      engagement: 0,
    },
    {
      name: "Конкурент 5",
      subs: "N/A",
      desc: "Описание конкурента.",
      weakness: "N/A",
      strategy: "N/A",
      engagement: 0,
    },
  ],
};

export const NICHE_POTENTIAL: Record<
  string,
  {
    score: number;
    summary: string;
    demand: number;
    competition: number;
    monetization: number;
  }
> = {
  Технологии: {
    score: 85,
    summary: "Высокий спрос, но большая конкуренция. Нужен уникальный подход.",
    demand: 90,
    competition: 80,
    monetization: 85,
  },
  Игры: {
    score: 70,
    summary: "Огромная аудитория, но сложно выделиться без харизмы.",
    demand: 95,
    competition: 90,
    monetization: 60,
  },
  Образование: {
    score: 90,
    summary: "Стабильный рост, высокая лояльность аудитории.",
    demand: 85,
    competition: 40,
    monetization: 75,
  },
  Лайфстайл: {
    score: 75,
    summary: "Высокая конкуренция, успех зависит от личного бренда.",
    demand: 80,
    competition: 85,
    monetization: 70,
  },
  Бизнес: {
    score: 80,
    summary: "Высокая монетизация, но требует глубокой экспертизы.",
    demand: 75,
    competition: 50,
    monetization: 95,
  },
  Финансы: {
    score: 95,
    summary: "Очень высокая монетизация и стабильный интерес.",
    demand: 85,
    competition: 45,
    monetization: 100,
  },
  Путешествия: {
    score: 65,
    summary: "Зависимость от бюджета и сезонности.",
    demand: 70,
    competition: 60,
    monetization: 55,
  },
  Кулинария: {
    score: 85,
    summary: "Визуально привлекательный контент, легко масштабировать.",
    demand: 90,
    competition: 70,
    monetization: 80,
  },
  Фитнес: {
    score: 80,
    summary: "Всегда актуально, высокая конкуренция.",
    demand: 85,
    competition: 75,
    monetization: 80,
  },
  DIY: {
    score: 75,
    summary: "Хороший потенциал, если контент реально полезен.",
    demand: 75,
    competition: 55,
    monetization: 65,
  },
  Красота: {
    score: 88,
    summary: "Огромный рынок рекламы, высокая лояльность к брендам.",
    demand: 92,
    competition: 85,
    monetization: 90,
  },
  Мода: {
    score: 82,
    summary: "Трендовая ниша, требует чувства стиля и качества картинки.",
    demand: 85,
    competition: 70,
    monetization: 85,
  },
  Автомобили: {
    score: 78,
    summary: "Дорогая реклама, мужская аудитория, высокий чек.",
    demand: 80,
    competition: 65,
    monetization: 90,
  },
  Музыка: {
    score: 72,
    summary: "Сложная монетизация из-за авторских прав, но виральный охват.",
    demand: 95,
    competition: 80,
    monetization: 40,
  },
  Кино: {
    score: 84,
    summary: "Постоянный поток инфоповодов, широкая аудитория.",
    demand: 88,
    competition: 60,
    monetization: 75,
  },
  Психология: {
    score: 92,
    summary: "Тренд на ментальное здоровье, высокая глубина просмотра.",
    demand: 90,
    competition: 45,
    monetization: 85,
  },
  Животные: {
    score: 80,
    summary: "Мировой охват, высокая виральность в Shorts.",
    demand: 95,
    competition: 70,
    monetization: 50,
  },
  Новости: {
    score: 75,
    summary: "Высокий трафик, но короткий жизненный цикл видео.",
    demand: 90,
    competition: 80,
    monetization: 60,
  },
  Юмор: {
    score: 85,
    summary: "Максимальный охват, сложность в стабильном качестве.",
    demand: 98,
    competition: 90,
    monetization: 70,
  },
  Недвижимость: {
    score: 90,
    summary: "Самый высокий CPM, работа на узкую, но богатую аудиторию.",
    demand: 60,
    competition: 30,
    monetization: 100,
  },
  Здоровье: {
    score: 86,
    summary: "Вечнозеленый контент, высокая ответственность за информацию.",
    demand: 85,
    competition: 55,
    monetization: 80,
  },
  Искусство: {
    score: 74,
    summary: "Нишевая аудитория, эстетическое удовольствие.",
    demand: 65,
    competition: 40,
    monetization: 60,
  },
  Спорт: {
    score: 81,
    summary: "Эмоциональный контент, привязка к событиям.",
    demand: 90,
    competition: 75,
    monetization: 75,
  },
  Наука: {
    score: 89,
    summary: "Интеллектуальная аудитория, сложность в производстве.",
    demand: 80,
    competition: 35,
    monetization: 70,
  },
  Аниме: {
    score: 77,
    summary: "Преданное фанатское сообщество, рост популярности.",
    demand: 85,
    competition: 65,
    monetization: 55,
  },
  Криптовалюта: {
    score: 94,
    summary: "Экстремально высокая монетизация, риск волатильности.",
    demand: 80,
    competition: 60,
    monetization: 100,
  },
  Родительство: {
    score: 83,
    summary: "Очень лояльная аудитория, спрос на обучающий контент.",
    demand: 85,
    competition: 60,
    monetization: 85,
  }
};


export const NICHE_IDEAS: Record<string, string[]> = {};
export const POPULAR_IDEAS: Record<string, string[]> = {};
export const getScoreData = (niche: string) => {
  const data: any = NICHE_POTENTIAL[niche] || { score: 50, summary: "Недостаточно данных для этой ниши." };

  return {
    ...data,
    demand: data.demand || 50,
    competition: data.competition || 50,
    monetization: data.monetization || 50,
  };
};

export const getIdeas = (niche: string) => {
  if (NICHE_IDEAS[niche]) return NICHE_IDEAS[niche];
  if (!niche) return ["Сначала выберите нишу"];
  return [
    `Топ 5 трендов в сфере ${niche}`,
    `Как начать свой путь в ${niche}`,
    `Ошибки новичков в ${niche}`,
    `Секреты успеха в ${niche}`,
    `Будущее ${niche}: что нас ждет?`,
  ];
};

export const getPopularIdeas = (niche: string) => {
  if (POPULAR_IDEAS[niche]) return POPULAR_IDEAS[niche];
  if (!niche) return [];
  return [
    `Тренды в ${niche} 2026`,
    `Секреты успеха в ${niche}`,
    `Как набрать первые 1000 подписчиков в ${niche}`,
  ];
};

export const getScriptTemplate = (niche: string) => {
  const n = niche || "вашей нише";
  return [
    {
      title: "Вступление (Крючок)",
      content: `Зацепите зрителя актуальной проблемой в ${n}.`,
    },
    {
      title: "Основная часть",
      content: `Разберите 3 ключевых момента, важных для аудитории ${n}.`,
    },
    {
      title: "Заключение (Призыв)",
      content: `Призовите подписаться на канал о ${n}.`,
    },
  ];
};

export const getEditingTips = (niche: string) => {
  if (niche === "Игры")
    return ["Быстрые склейки", "Эффекты зума", "Звуки из игр"];
  if (niche === "Образование")
    return ["Инфографика", "Спокойная музыка", "Текстовые пояснения"];
  return ["Динамичный монтаж", "Цветокоррекция", "Качественный звук"];
};

export const getSEOData = (niche: string) => {
  const n = niche || "вашей нише";

  return {
    keywords: [
      `${n} 2026`,
      `как сделать ${n}`,
      `лучшие советы по ${n}`,
      `${n} для новичков`,
      `тренды ${n}`,
    ],
    titles: [
      `Вся правда о ${n}: что скрывают эксперты?`,
      `Как я заработал на ${n} за 30 дней`,
      `Секретный метод продвижения в ${n}`,
      `${n}: пошаговое руководство для чайников`,
    ],
  };
};

export const getAnalytics = (niche: string) => {
  return [
    { name: "Кликбейт", value: "8.4%", status: "high" },
    { name: "Удержание", value: "45%", status: "medium" },
    { name: "Репосты", value: "1.2k", status: "high" },
    { name: "Комментарии", value: "850", status: "medium" },
  ];
};

export const parseSubs = (subs: string) => {
  if (subs === "N/A") return 0;
  const multiplier = subs.endsWith("M")
    ? 1000000
    : subs.endsWith("K")
      ? 1000
      : 1;
  return parseFloat(subs) * multiplier;
};

export const generateBrandingVariants = (niche: string) => {
  if (!niche) return [];

  const prefixes = [
    "Мир",
    "Про",
    "Элита",
    "Дневник",
    "Глобал",
    "Смарт",
    "Чистый",
    "Яркий",
    "Некст",
    "Мастер",
    "Ультра",
    "Прайм",
    "Мега",
    "Гипер",
    "Супер",
  ];
  const suffixes = [
    "Хаб",
    "Зона",
    "Сфера",
    "Пульс",
    "Взгляд",
    "Инсайт",
    "Лаб",
    "Поток",
    "Вайб",
    "Дейли",
    "Центр",
    "Сеть",
    "Коннект",
    "Станция",
    "Мир",
  ];

  const nicheKeywords: Record<string, string[]> = {
    Технологии: [
      "Техно",
      "Диджитал",
      "Кибер",
      "Инно",
      "Код",
      "Гаджет",
      "Кремний",
      "Будущее",
      "Нано",
      "ИИ",
      "Робо",
      "Данные",
    ],
    Игры: [
      "Гейм",
      "Пиксель",
      "Уровень",
      "Квест",
      "Киберспорт",
      "Ретро",
      "Босс",
      "Джойстик",
      "ВР",
      "Плей",
      "Аркада",
      "Стрим",
    ],
    Образование: [
      "Эду",
      "Навык",
      "Мозг",
      "Учеба",
      "Наука",
      "Разум",
      "Академия",
      "Студия",
      "Курс",
      "Знания",
      "Тьютор",
      "Школа",
    ],
    Лайфстайл: [
      "Жизнь",
      "Вайб",
      "Урбан",
      "Душа",
      "Тренд",
      "Дом",
      "Тревел",
      "Здоровье",
      "Сияние",
      "Стиль",
      "Быт",
      "Дневник",
    ],
    Бизнес: [
      "Биз",
      "Стартап",
      "Маркет",
      "Богатство",
      "Лидер",
      "Инвест",
      "Продажи",
      "Бренд",
      "Успех",
      "Эко",
      "Профит",
      "Венчур",
    ],
    Финансы: [
      "Деньги",
      "Инвест",
      "Кэш",
      "Капитал",
      "Банк",
      "Крипто",
      "Акции",
      "Форекс",
      "Богатство",
      "Сбережения",
      "Доход",
      "Бюджет",
    ],
    Путешествия: [
      "Тревел",
      "Мир",
      "Вояж",
      "Тур",
      "Путь",
      "Земля",
      "Карта",
      "Рюкзак",
      "Полет",
      "Круиз",
      "Горизонт",
      "Атлас",
    ],
    Кулинария: [
      "Шеф",
      "Вкус",
      "Еда",
      "Кухня",
      "Рецепт",
      "Гурман",
      "Фуд",
      "Блюдо",
      "Специи",
      "Гриль",
      "Пекарня",
      "Гастро",
    ],
    Фитнес: [
      "Спорт",
      "Тело",
      "Сила",
      "Фит",
      "Здоровье",
      "Актив",
      "Энергия",
      "Тренинг",
      "Мышцы",
      "Йога",
      "Кросс",
      "Атлет",
    ],
    DIY: [
      "Сам",
      "Крафт",
      "Хендмейд",
      "Мастер",
      "Декор",
      "Ремонт",
      "Идея",
      "Творчество",
    ],
    Новости: [
      "Инфо",
      "События",
      "Факты",
      "Вести",
      "Репорт",
      "Репортаж",
      "Правда",
      "Эфир",
    ],
    Юмор: [
      "Смех",
      "Шоу",
      "Прикол",
      "Мем",
      "Комедия",
      "Фан",
      "Стендап",
      "Позитив",
      "Улыбка",
      "Шутка",
      "Лол",
      "Хихи",
    ],
    Недвижимость: [
      "Дом",
      "Квартира",
      "Сити",
      "Метр",
      "Инвест",
      "Жилье",
      "Риэлтор",
      "Объект",
      "Сделка",
      "Аренда",
      "Продажа",
      "Уют",
    ],
    Здоровье: [
      "Мед",
      "Доктор",
      "Тело",
      "Вита",
      "Зож",
      "Клиника",
      "Иммунитет",
      "Профилактика",
      "Организм",
      "Сила",
      "Тонус",
      "Жизнь",
    ],
    Искусство: [
      "Арт",
      "Холст",
      "Краски",
      "Музей",
      "Галерея",
      "Творец",
      "Эскиз",
      "Дизайн",
      "Стиль",
      "Графика",
      "Шедевр",
      "Креатив",
    ],
    Спорт: [
      "Гол",
      "Матч",
      "Арена",
      "Победа",
      "Команда",
      "Лига",
      "Чемпион",
      "Игра",
      "Стадион",
      "Фан",
      "Результат",
      "Рекорд",
    ],
    Наука: [
      "Лаб",
      "Теория",
      "Космос",
      "Атом",
      "Ген",
      "Физика",
      "Химия",
      "Био",
      "Исследование",
      "Ученый",
      "Открытие",
      "Мир",
    ],
    Аниме: [
      "Отаку",
      "Манга",
      "Япония",
      "Кавай",
      "Сенэн",
      "Тян",
      "Кун",
      "Косплей",
      "Фандом",
      "Мир",
      "Герой",
      "Стори",
    ],
    Криптовалюта: [
      "Биткоин",
      "Эфир",
      "Блокчейн",
      "Токен",
      "Майнинг",
      "Крипто",
      "Биржа",
      "Альткоин",
      "НФТ",
      "Веб3",
      "Дефи",
      "Ходл",
    ],
    Родительство: [
      "Мама",
      "Папа",
      "Дети",
      "Семья",
      "Малыш",
      "Воспитание",
      "Дом",
      "Радость",
      "Советы",
      "Школа",
      "Садик",
      "Игра",
    ],
    Книги: [
      "Том",
      "Лист",
      "Автор",
      "Чтение",
      "Роман",
      "Сюжет",
      "Библиотека",
      "Слово",
      "Лит",
      "Текст",
      "Глава",
      "Мир",
    ],
    Мотивация: [
      "Цель",
      "Успех",
      "Рост",
      "Сила",
      "Воля",
      "Победа",
      "Мечта",
      "Действуй",
      "Лидер",
      "Энергия",
      "Путь",
      "Вперед",
    ],
    Обзоры: [
      "Тест",
      "Мнение",
      "Честно",
      "Выбор",
      "Топ",
      "Рейтинг",
      "Гид",
      "Совет",
      "Вердикт",
      "Плюсы",
      "Минусы",
      "Распаковка",
    ],
    История: [
      "Прошлое",
      "Архив",
      "Эпоха",
      "Дата",
      "Факт",
      "Мир",
      "Время",
      "Событие",
      "Герой",
      "Хроника",
      "Легенда",
      "Музей",
    ],
  };

  const keywords = nicheKeywords[niche] || [
    niche,
    "Канал",
    "Мир",
    "Про",
    "Хаб",
    "Лаб",
    "Инсайт",
    "Дейли",
    "Мастер",
    "Вайб",
  ];

  const variants = [];
  const sloganPrefixes = [
    "Твой путь в",
    "Мир",
    "Все о",
    "Лучший контент про",
    "Исследуй",
    "Прокачай",
    "Открой для себя",
    "Будь в курсе",
    "Мастерство в",
    "Твой гид в",
    "Погружение в",
    "Секреты",
  ];
  const sloganSuffixes = [
    "каждый день.",
    "для каждого.",
    "в деталях.",
    "с нами.",
    "уже здесь.",
    "по-новому.",
    "без границ.",
    "на максимуме.",
    "вместе с нами.",
    "прямо сейчас.",
    "для профи.",
    "с нуля.",
  ];

  for (let i = 0; i < 10; i++) {
    const keyword = keywords[Math.floor(Math.random() * keywords.length)];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

    const pattern = Math.floor(Math.random() * 4);
    let name = "";
    if (pattern === 0) name = `${prefix}${keyword}`;
    else if (pattern === 1) name = `${keyword}${suffix}`;
    else if (pattern === 2) name = `${prefix} ${keyword}`;
    else name = `${keyword} ${suffix}`;

    const slogan = `${sloganPrefixes[Math.floor(Math.random() * sloganPrefixes.length)]} ${niche} ${sloganSuffixes[Math.floor(Math.random() * sloganSuffixes.length)]}`;

    variants.push({ name, slogan });
  }
  return variants;
};


export const IMAGE_STYLES = [
  {
    id: "realistic",
    name: "Реалистичный",
    icon: Camera,
    desc: "Фотореалистичные изображения",
  },
  {
    id: "neon",
    name: "Неон",
    icon: Flame,
    desc: "Яркие неоновые цвета и свечение",
  },
  {
    id: "retro",
    name: "Винтаж",
    icon: Clock,
    desc: "Ретро стиль и старая пленка",
  },
  { id: "anime", name: "Аниме", icon: Sparkles, desc: "Японская анимация" },
  {
    id: "pixelart",
    name: "Пиксель-арт",
    icon: Grid,
    desc: "8-битная ретро графика",
  },
  {
    id: "cartoon",
    name: "Мультяшный",
    icon: Palette,
    desc: "Яркий анимационный стиль",
  },
  { id: "3d", name: "3D Рендер", icon: Box, desc: "Объемная 3D графика" },
  { id: "cyberpunk", name: "Киберпанк", icon: Zap, desc: "Кибер-реальность" },
  {
    id: "minimalist",
    name: "Минимализм",
    icon: Square,
    desc: "Чистые линии и формы",
  },
  {
    id: "watercolor",
    name: "Акварель",
    icon: Droplets,
    desc: "Мягкие переходы красок",
  },
  { id: "sketch", name: "Скетч", icon: Pencil, desc: "Карандашный набросок" },
  {
    id: "oil",
    name: "Масло",
    icon: Paintbrush,
    desc: "Классическая масляная живопись",
  },
  {
    id: "comic",
    name: "Комикс",
    icon: BookOpen,
    desc: "Стиль графических романов",
  },
  {
    id: "vector",
    name: "Векторная графика",
    icon: PenTool,
    desc: "Плоские иллюстрации",
  },
  {
    id: "fantasy",
    name: "Фэнтези",
    icon: Wand2,
    desc: "Магия и мифические миры",
  },
  {
    id: "retrowave",
    name: "Ретровейв",
    icon: Radio,
    desc: "Стиль 80-х, неон и сетки",
  },
  {
    id: "steampunk",
    name: "Стимпанк",
    icon: Cog,
    desc: "Паровые машины и шестеренки",
  },
  {
    id: "popart",
    name: "Поп-арт",
    icon: Star,
    desc: "Яркие цвета и контрасты",
  },
  {
    id: "gothic",
    name: "Готика",
    icon: Moon,
    desc: "Мрачная и темная эстетика",
  },
  {
    id: "noir",
    name: "Нуар",
    icon: Eye,
    desc: "Черно-белый детективный стиль",
  },
  {
    id: "surrealism",
    name: "Сюрреализм",
    icon: Cloud,
    desc: "Сны и искаженная реальность",
  },
  {
    id: "lowpoly",
    name: "Лоу-поли",
    icon: Triangle,
    desc: "Низкополигональная 3D графика",
  },
  {
    id: "isometric",
    name: "Изометрия",
    icon: Hexagon,
    desc: "Изометрическая проекция",
  },
];

export const ANIMATION_TYPES = [
  { id: "2d", name: "2D Анимация", desc: "Классическая плоская анимация" },
  { id: "3d", name: "3D Анимация", desc: "Трехмерная компьютерная графика" },
  {
    id: "stop-motion",
    name: "Stop-Motion",
    desc: "Покадровая кукольная анимация",
  },
  {
    id: "motion-graphics",
    name: "Motion Graphics",
    desc: "Анимация текста и графики",
  },
  { id: "whiteboard", name: "Whiteboard", desc: "Рисование маркером на доске" },
  {
    id: "cinematic",
    name: "Кинематографичная",
    desc: "Плавные пролеты камеры",
  },
  { id: "timelapse", name: "Таймлапс", desc: "Ускоренная съемка времени" },
  { id: "slideshow", name: "Слайд-шоу", desc: "Плавная смена изображений" },
  { id: "glitch", name: "Глитч", desc: "Цифровые помехи и искажения" },
  { id: "morphing", name: "Морфинг", desc: "Плавное перетекание объектов" },
  { id: "parallax", name: "Параллакс", desc: "Эффект глубины при движении" },
  {
    id: "loop",
    name: "Зацикленная (Loop)",
    desc: "Бесконечно повторяющаяся анимация",
  },
  {
    id: "kinetic-typography",
    name: "Кинетическая типографика",
    desc: "Анимация текста",
  },
  {
    id: "traditional",
    name: "Традиционная",
    desc: "Покадровая ручная рисовка",
  },
  {
    id: "rotoscoping",
    name: "Ротоскопирование",
    desc: "Обрисовка поверх видео",
  },
];

export const MUSIC_MOODS = [
  { id: "chill", name: "Расслабленное", icon: Coffee },
  { id: "energetic", name: "Энергичное", icon: Zap },
  { id: "epic", name: "Эпичное", icon: Trophy },
  { id: "sad", name: "Грустное", icon: Droplets },
  { id: "happy", name: "Веселое", icon: Sun },
  { id: "mysterious", name: "Загадочное", icon: Moon },
  { id: "corporate", name: "Корпоративное", icon: Briefcase },
  { id: "dramatic", name: "Драматичное", icon: Flame },
  { id: "anxious", name: "Тревожное", icon: Wind },
  { id: "romantic", name: "Романтичное", icon: Heart },
  { id: "lofi", name: "Lo-Fi", icon: Headphones },
  { id: "comedy", name: "Комедийное", icon: Laugh },
  { id: "aggressive", name: "Агрессивное", icon: Target },
  { id: "melancholic", name: "Меланхоличное", icon: Cloud },
  { id: "inspiring", name: "Вдохновляющее", icon: Sparkles },
  { id: "retro", name: "Ретро (Synthwave)", icon: Radio },
  { id: "dance", name: "Танцевальное", icon: Music },
];

export const REGIONS = [
  { id: "global", name: "Global", flag: "🌍" },
  { id: "us", name: "USA", flag: "🇺🇸" },
  { id: "ru", name: "Russia", flag: "🇷🇺" },
  { id: "eu", name: "Europe", flag: "🇪🇺" },
  { id: "br", name: "Brazil", flag: "🇧🇷" },
  { id: "in", name: "India", flag: "🇮🇳" },
];

export const fontStyleMap: Record<string, { id: string; name: string; icon: string; className: string; desc: string }> = {
  default: {
    id: 'default',
    name: 'Стандартный',
    icon: '🔤',
    className: 'font-sans font-bold text-white leading-snug',
    desc: 'Стандартный гротеск по умолчанию'
  },
  bold: {
    id: 'bold',
    name: 'Жирный Heavy',
    icon: '💥',
    className: 'font-sans font-black uppercase tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] leading-tight',
    desc: 'Ультражирный капс для акцента'
  },
  cinematic: {
    id: 'cinematic',
    name: 'Кинематографичный',
    icon: '🎬',
    className: 'font-serif font-bold uppercase tracking-widest text-amber-100 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] leading-snug',
    desc: 'Элегантный заголовок с засечками'
  },
  minimal: {
    id: 'minimal',
    name: 'Минимализм',
    icon: '✨',
    className: 'font-mono font-medium tracking-normal text-neutral-200 leading-snug',
    desc: 'Лаконичный моноширинный стиль'
  },
  neon: {
    id: 'neon',
    name: 'Неоновый',
    icon: '⚡',
    className: 'font-sans font-extrabold uppercase tracking-wide text-cyan-300 drop-shadow-[0_0_10px_rgba(6,182,212,0.9)] leading-tight',
    desc: 'Яркое киберпанк свечение'
  },
  retro: {
    id: 'retro',
    name: 'Ретро Винтаж',
    icon: '📻',
    className: 'font-serif italic font-bold tracking-wide text-amber-200 drop-shadow-[2px_2px_0px_rgba(0,0,0,0.9)] leading-snug',
    desc: 'Классический винтажный курсив'
  }
};

export interface CustomTemplateItem {
  id: string;
  name: string;
  date?: string;
  layoutId?: string;
  bgDim?: number;
  gridMode?: string;
  fontStyle?: string;
}

