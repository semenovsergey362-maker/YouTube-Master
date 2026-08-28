import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { safeStorage } from '../lib/storage';

interface TourStep {
  targetId: string;
  title: string;
  content: string;
}

const steps: TourStep[] = [
  {
    targetId: 'nav-ниша',
    title: '🚀 Шаг 1: Выбор Ниши',
    content: 'Начните с выбора направления. ИИ проанализирует рынок, спрос и конкуренцию, предложив лучшие варианты для старта.'
  },
  {
    targetId: 'nav-брендинг',
    title: '🎨 Шаг 2: Брендинг',
    content: 'Сформируйте айдентику канала: от названия и слогана до цветовой палитры и промптов для генерации логотипа.'
  },
  {
    targetId: 'nav-youtube',
    title: '📊 Шаг 3: Анализ YouTube',
    content: 'Изучите конкурентов и текущие тренды. ИИ найдет слабые места лидеров и подскажет вашу стратегию роста.'
  },
  {
    targetId: 'nav-идеи',
    title: '💡 Шаг 4: Генерация Идей',
    content: 'Создавайте виральные темы для видео. ИИ предложит концепции, которые зацепят вашу целевую аудиторию.'
  },
  {
    targetId: 'nav-сценарий',
    title: '📝 Шаг 5: Сценарий и План',
    content: 'Постройте детальный сценарий с триггерами удержания. Разбейте видео на сцены и подготовьте план съемок.'
  },
  {
    targetId: 'nav-промтинг',
    title: '⚡ Шаг 6: AI Продакшен',
    content: 'Генерируйте профессиональные промпты для ИИ-генераторов видео и изображений на основе вашего сценария.'
  },
  {
    targetId: 'nav-seo',
    title: '🔍 Шаг 7: SEO Оптимизация',
    content: 'Подготовьте видео к публикации. Оптимизируйте заголовки, описание и теги для алгоритмов YouTube.'
  },
  {
    targetId: 'nav-шортс',
    title: '📱 Шаг 8: Shorts-адаптация',
    content: 'Превратите идеи из длинных видео в виральные короткие ролики для быстрого охвата новой аудитории.'
  },
  {
    targetId: 'custom-rules-button',
    title: '🛠️ Кастомные правила',
    content: 'Персонализируйте ИИ под ваш стиль. Задайте инструкции, которые будут учитываться при каждой генерации текста.'
  },
  {
    targetId: 'ai-assistant-toggle',
    title: '🤖 AI Ассистент',
    content: 'Ваш личный консультант. Используйте его для поиска информации в Google (Live Поиск) или быстрых правок.'
  }
];

export const OnboardingTour = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const isCompleted = safeStorage.getItem('onboardingCompleted');
    if (!isCompleted) {
      // Small delay to ensure all IDs are rendered
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    safeStorage.setItem('onboardingCompleted', 'true');
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const resetTour = () => {
    setCurrentStep(0);
    setIsOpen(true);
  };

  // Expose resetTour to window for manual trigger if needed
  useEffect(() => {
    (window as any).startOnboarding = resetTour;
  }, []);

  if (!isOpen) return null;

  const step = steps[currentStep];

  return (
    <AnimatePresence>
      <div key="onboarding-tour-overlay" className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
          onClick={handleClose} 
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-neutral-900 border border-neutral-800 p-8 rounded-[2rem] w-full max-w-md shadow-2xl relative z-10"
        >
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-primary rounded-full flex items-center justify-center shadow-xl shadow-primary/20 border-4 border-neutral-950">
            <Sparkles className="text-white" size={40} />
          </div>

          <button onClick={handleClose} className="absolute top-6 right-6 text-neutral-500 hover:text-white transition-colors">
            <X size={20} />
          </button>

          <div className="mt-8 text-center space-y-4">
            <h2 className="text-white font-black text-2xl tracking-tight">{step.title}</h2>
            <p className="text-neutral-400 text-base leading-relaxed">{step.content}</p>
          </div>

          <div className="mt-10 flex flex-col gap-4">
            <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-neutral-500 text-xs font-black uppercase tracking-widest">
                {currentStep + 1} / {steps.length}
              </span>
              <div className="flex gap-3">
                <button 
                  onClick={handlePrev} 
                  disabled={currentStep === 0} 
                  className="w-10 h-10 flex items-center justify-center bg-neutral-800 text-white rounded-xl disabled:opacity-30 transition-all hover:bg-neutral-700 cursor-pointer"
                >
                  <ChevronLeft size={20} />
                </button>
                <button 
                  onClick={handleNext} 
                  className="px-6 h-10 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2 cursor-pointer"
                >
                  {currentStep === steps.length - 1 ? 'Готово' : 'Далее'}
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
