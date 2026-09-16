import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  X,
  ChevronRight,
  ChevronLeft,
  Clock,
  Layers,
  GripVertical,
  Sliders,
  Send,
  CheckCircle2,
  HelpCircle,
  Zap,
  Film,
  RotateCcw
} from "lucide-react";
import { safeStorage } from "../lib/storage";

interface TutorialStep {
  title: string;
  badge: string;
  icon: React.ReactNode;
  content: string;
  tip: string;
  targetRefKey?: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    title: "ИИ-Генерация и источники глав",
    badge: "Шаг 1 из 5",
    icon: <Sparkles className="text-amber-400" size={24} />,
    content:
      "Создавайте главы в один клик! Используйте «ИИ-Генерацию» для создания виральных названий, «Из блоков сценария» для авторасчета по структуре текста, или «По медиафайлу» для синхронизации с реальным аудио/видео.",
    tip: "ИИ подбирает вовлекающие формулировки, которые увеличивают кликабельность эпизодов на плейбаре YouTube.",
  },
  {
    title: "Интерактивный Drag-and-Drop",
    badge: "Шаг 2 из 5",
    icon: <GripVertical className="text-primary" size={24} />,
    content:
      "Зажмите маркер слева от главы и перетащите её на нужную позицию. Также вы можете использовать стрелки «Поднять» / «Опустить» и редактировать таймкод или название прямо в строке.",
    tip: "Все изменения сохраняются автоматически в режиме реального времени.",
  },
  {
    title: "Массовый сдвиг таймкодов",
    badge: "Шаг 3 из 5",
    icon: <Sliders className="text-cyan-400" size={24} />,
    content:
      "Вставили интеграцию или заставку при монтаже? Используйте кнопку «Сдвиг таймкодов», чтобы в один клик сместить все последующие отметки на +5, -5, +10 или -10 секунд.",
    tip: "Первая глава 00:00 всегда автоматически сохраняет свое положение согласно стандартам YouTube.",
  },
  {
    title: "Авто-проверка стандартов YouTube",
    badge: "Шаг 4 из 5",
    icon: <CheckCircle2 className="text-emerald-400" size={24} />,
    content:
      "Панель проверяет соблюдение правил алгоритмов YouTube: старт строго с 00:00, минимум 3 главы, соблюдение хронологии и интервал от 10 секунд.",
    tip: "Если найдется ошибка, кнопка «Исправить автоматически» мгновенно откорректирует таймкоды под требования платформы.",
  },
  {
    title: "Прямая отправка в SEO блок",
    badge: "Шаг 5 из 5",
    icon: <Send className="text-emerald-400" size={24} />,
    content:
      "Нажмите «Отправить в SEO блок», чтобы отформатированные таймкоды автоматически встроились в описание вашего ролика для вкладки SEO.",
    tip: "YouTube автоматически превратит эти отметки в кликабельные эпизоды на видеоплеере для зрителей.",
  },
];

interface ChaptersTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChaptersTutorialModal: React.FC<ChaptersTutorialModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const step = tutorialSteps[currentStep];

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    safeStorage.setItem("yt_chapters_tutorial_seen", "true");
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl p-6 sm:p-8 z-10 space-y-6 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-2xl shrink-0">
                {step.icon}
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {step.badge}
                </span>
                <h3 className="text-lg font-bold text-white mt-1">
                  {step.title}
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-xl transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body Content */}
          <div className="space-y-4">
            <p className="text-neutral-300 text-sm leading-relaxed">
              {step.content}
            </p>

            <div className="p-3.5 bg-neutral-950/80 rounded-2xl border border-neutral-800 flex items-start gap-3">
              <Zap className="text-amber-400 shrink-0 mt-0.5" size={16} />
              <div className="text-xs text-neutral-400 leading-relaxed">
                <strong className="text-amber-300">Лайфхак:</strong> {step.tip}
              </div>
            </div>
          </div>

          {/* Step Indicators & Controls */}
          <div className="pt-4 border-t border-neutral-800 space-y-4">
            {/* Progress Dots */}
            <div className="flex items-center justify-center gap-2">
              {tutorialSteps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === currentStep
                      ? "w-8 bg-primary"
                      : "w-2 bg-neutral-800 hover:bg-neutral-700"
                  }`}
                  title={`Перейти к шагу ${idx + 1}`}
                />
              ))}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft size={16} />
                <span>Назад</span>
              </button>

              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-black font-extrabold rounded-xl text-xs shadow-lg shadow-primary/20 transition-all cursor-pointer"
              >
                <span>
                  {currentStep === tutorialSteps.length - 1
                    ? "Завершить обучение"
                    : "Далее"}
                </span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
