import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Sparkles, Key, Cpu, ShieldAlert, Sliders, Globe, Search } from 'lucide-react';
import { BaseModal } from './common/BaseModal';
import { EmptyState } from './common/EmptyState';

interface FAQModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FAQItem {
  question: string;
  answer: string;
  category: 'api' | 'models' | 'rules' | 'workflow' | 'limits' | 'generation';
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    category: 'generation',
    icon: Sparkles,
    question: 'Как генерировать сценарии с высоким удержанием (Retention)?',
    answer: 'Используйте вкладку "Сценарий" для поблочного проектирования структуры. Сценарий разделен на Крючок (Hook), Введение, Основную часть, Кульминацию и Призыв к действию (CTA). Для каждого блока вы можете отдельно настраивать эмоциональный тон, динамику темпа речи и добавлять маркеры визуальных/звуковых эффектов, чтобы удерживать взгляд зрителя.'
  },
  {
    category: 'generation',
    icon: Search,
    question: 'Как оптимизировать Shorts под алгоритмы YouTube Shorts?',
    answer: 'В YouTube Shorts критически важен CTR (кликабельность заголовка в ленте) и удержание. Используйте новый Анализатор кликабельности (CTR) на вкладке Shorts для оценки интриги заголовка. Алгоритмы обращают внимание на первые 2 секунды видео и первую строчку описания — старайтесь выносить главную интригу в самое начало.'
  },
  {
    category: 'generation',
    icon: Sliders,
    question: 'Как создать бесшовный цикл (Seamless Loop) в Shorts?',
    answer: 'Бесшовная концовка заставляет видео проигрываться бесконечно, что взрывным образом поднимает процент удержания (более 100%). На вкладке "Шортс" в разделе "Умная нарезка Long-Form" нажмите кнопку "Сделать бесшовным" на любой карточке шортса. Наш алгоритм перепишет концовку так, чтобы она грамматически и интонационно сливалась с самым началом ролика.'
  },
  {
    category: 'generation',
    icon: Cpu,
    question: 'Как перегенерировать отдельную часть сценария, не сломав остальное?',
    answer: 'В "Мастере сценариев" вы можете нажать кнопку редактирования (или значок карандаша) рядом с конкретным текстовым блоком. Вы можете изменить промпт только для этого блока (например, "сделай смешнее" или "добавь метафору") и обновить только его, сохранив всю остальную структуру сценария нетронутой.'
  },
  {
    category: 'api',
    icon: Key,
    question: 'Как настроить API-ключ Gemini?',
    answer: 'Приложение использует серверный ключ Gemini API (GEMINI_API_KEY). Он настраивается в файле .env.example / .env на сервере, что обеспечивает полную безопасность ключа и предотвращает его утечку в браузер.'
  },
  {
    category: 'models',
    icon: Cpu,
    question: 'Какую модель выбрать для генерации сценариев и идей?',
    answer: 'Рекомендуется использовать Gemini 3 Flash для быстрых и качественных итераций, либо Gemini 2.5 Flash / Pro для глубокого аналитического контента и построения сложных многоуровневых сюжетных арок.'
  },
  {
    category: 'limits',
    icon: ShieldAlert,
    question: 'Как управлять лимитами и квотами запросов?',
    answer: 'В левой панели приложения встроен индикатор лимитов выбранной модели (кнопка "Лимиты"). При приближении к квоте рекомендуется переключаться между доступными моделями (например, с Flash на Flash-Lite) или делать небольшие паузы.'
  },
  {
    category: 'rules',
    icon: Sliders,
    question: 'Для чего нужны кастомные правила (Custom Instructions)?',
    answer: 'Кастомные правила позволяют зафиксировать тон голоса (tone of voice), целевую аудиторию, запрещенные слова или формат повествования. Эти инструкции автоматически добавляются ко всем запросам к ИИ для обеспечения уникального стиля вашего канала.'
  },
  {
    category: 'workflow',
    icon: Globe,
    question: 'Когда стоит включать Live поиск (Deep Research)?',
    answer: 'Включайте Live поиск в AI Ассистенте, когда вам необходимы актуальные тренды YouTube, свежая статистика, факты или аналитика конкурентов в реальном времени из интернета.'
  },
  {
    category: 'workflow',
    icon: Sparkles,
    question: 'Как устроен полный рабочий процесс (от Ниши до Shorts)?',
    answer: 'Процесс разбит на 8 логических шагов: 1. Выбор Ниши -> 2. Брендинг -> 3. Анализ YouTube конкурентов -> 4. Генерация идей -> 5. Построение детального сценария -> 6. AI Продакшен промптов -> 7. SEO оптимизация -> 8. Адаптация под Shorts. Каждый шаг сохраняет результаты для следующих модулей.'
  }
];

export const FAQModal: React.FC<FAQModalProps> = ({ isOpen, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredItems = FAQ_ITEMS.filter(item => {
    const matchesCat = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch = item.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Часто задаваемые вопросы (FAQ)"
      subtitle="Руководство по моделям, API, лимитам и работе с приложением"
      icon={HelpCircle}
      maxWidth="2xl"
      footer={
        <div className="w-full flex justify-between items-center text-xs text-neutral-400">
          <span>Остались вопросы? Обратитесь к AI Ассистенту.</span>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-bold transition-all cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      }
    >
      {/* Search & Categories */}
      <div className="space-y-3 pb-2">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input 
            type="text"
            placeholder="Поиск по вопросам и ответам..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2 pl-9 pr-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-accent transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { id: 'all', label: 'Все вопросы' },
            { id: 'generation', label: 'Создание контента' },
            { id: 'api', label: 'API & Ключи' },
            { id: 'models', label: 'Модели' },
            { id: 'limits', label: 'Лимиты' },
            { id: 'rules', label: 'Правила' },
            { id: 'workflow', label: 'Процесс' },
          ].map((cat, cIdx) => (
            <button
              key={`faq-cat-${cat.id}-${cIdx}`}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-accent text-black shadow-md shadow-accent/20'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-750'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* FAQ List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <EmptyState 
            icon={HelpCircle}
            title="Вопросы не найдены"
            description="Попробуйте изменить поисковый запрос или выбрать другую категорию"
          />
        ) : (
          filteredItems.map((item, idx) => {
            const IconComp = item.icon;
            const isExpanded = openIdx === idx;
            return (
              <div 
                key={`faq-item-${item.question}-${idx}`}
                className="bg-neutral-950/60 border border-neutral-800/80 rounded-2xl overflow-hidden transition-all hover:border-neutral-700"
              >
                <button
                  onClick={() => setOpenIdx(isExpanded ? null : idx)}
                  className="w-full p-4 flex items-center justify-between text-left gap-4 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-neutral-800 text-accent flex items-center justify-center shrink-0 border border-neutral-700/80">
                      <IconComp size={16} />
                    </div>
                    <span className="text-white font-bold text-sm sm:text-base">{item.question}</span>
                  </div>
                  {isExpanded ? <ChevronUp size={18} className="text-accent shrink-0" /> : <ChevronDown size={18} className="text-neutral-500 shrink-0" />}
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 text-neutral-300 text-sm leading-relaxed border-t border-neutral-800/50 mt-1 pt-3">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </BaseModal>
  );
};
