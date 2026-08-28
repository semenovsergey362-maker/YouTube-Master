import { logger } from "../config/logger";
import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, Command, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

interface VoiceCommandsBarProps {
  setActivePage: (page: string) => void;
  setShowFAQModal: (show: boolean) => void;
  downloadPDF: () => void;
  triggerGeneration: () => void;
}

export const VoiceCommandsBar: React.FC<VoiceCommandsBarProps> = ({
  setActivePage,
  setShowFAQModal,
  downloadPDF,
  triggerGeneration,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>('');
  const recognitionRef = useRef<any>(null);

  const isSupported = !!(
    typeof window !== 'undefined' &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  );

  useEffect(() => {
    if (!isSupported) return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'ru-RU';

    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase().trim();
      setLastCommand(transcript);
      setIsListening(false);
      handleVoiceCommand(transcript);
    };

    recognitionRef.current.onerror = (event: any) => {
      logger.error('Speech recognition error', event.error);
      setIsListening(false);
      if (event.error !== 'no-speech') {
        toast.error(`Ошибка голосового ввода: ${event.error}`);
      }
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };
  }, []);

  const handleVoiceCommand = (cmd: string) => {
    logger.log('Voice command received:', cmd);

    if (cmd.includes('ниша') || cmd.includes('направление')) {
      setActivePage('Ниша');
      toast.success('Голосовая команда: переход на Нишу');
    } else if (cmd.includes('брендинг') || cmd.includes('бренд') || cmd.includes('айдентика')) {
      setActivePage('Брендинг');
      toast.success('Голосовая команда: переход на Брендинг');
    } else if (cmd.includes('youtube') || cmd.includes('ютуб') || cmd.includes('анализ') || cmd.includes('конкуренты')) {
      setActivePage('YouTube');
      toast.success('Голосовая команда: переход на YouTube Аналитику');
    } else if (cmd.includes('идеи') || cmd.includes('идея') || cmd.includes('темы')) {
      setActivePage('Идеи');
      toast.success('Голосовая команда: переход на Идеи');
    } else if (cmd.includes('сценарий') || cmd.includes('текст') || cmd.includes('план')) {
      setActivePage('Сценарий');
      toast.success('Голосовая команда: переход на Сценарий');
    } else if (cmd.includes('промпт') || cmd.includes('продакшен') || cmd.includes('картинки')) {
      setActivePage('Промтинг');
      toast.success('Голосовая команда: переход на Промтинг');
    } else if (cmd.includes('сео') || cmd.includes('seo') || cmd.includes('оптимизация') || cmd.includes('теги')) {
      setActivePage('SEO');
      toast.success('Голосовая команда: переход на SEO');
    } else if (cmd.includes('шортс') || cmd.includes('shorts') || cmd.includes('клипы')) {
      setActivePage('Шортс');
      toast.success('Голосовая команда: переход на Шортс');
    } else if (cmd.includes('инструкция') || cmd.includes('скачать пдф') || cmd.includes('pdf')) {
      downloadPDF();
      toast.success('Голосовая команда: скачивание инструкции PDF');
    } else if (cmd.includes('faq') || cmd.includes('вопросы') || cmd.includes('справка')) {
      setShowFAQModal(true);
      toast.success('Голосовая команда: открытие FAQ');
    } else if (cmd.includes('сгенерируй') || cmd.includes('запуск') || cmd.includes('создать') || cmd.includes('генерация')) {
      triggerGeneration();
      toast.success('Голосовая команда: запуск генерации');
    } else {
      toast.info(`Распознано: "${cmd}". Скажите "Ниша", "Сценарий", "Сгенерируй" и т.д.`);
    }
  };

  const toggleListening = () => {
    if (!isSupported) {
      toast.error('Ваш браузер не поддерживает голосовые команды');
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
        toast.info('Слушаю голосовую команду...');
      } catch (err) {
        logger.error(err);
        setIsListening(false);
      }
    }
  };

  if (!isSupported) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleListening}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer border ${
          isListening
            ? 'bg-red-500 text-white border-red-400 animate-pulse shadow-lg shadow-red-500/30'
            : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border-neutral-800'
        }`}
        title="Голосовое управление (скажите вкладку или 'Сгенерируй')"
      >
        {isListening ? <MicOff size={14} className="animate-spin" /> : <Mic size={14} className="text-primary" />}
        <span className="hidden sm:inline">{isListening ? 'Слушаю...' : 'Голос'}</span>
      </button>
      {lastCommand && (
        <span className="hidden xl:inline-block text-[10px] text-neutral-400 bg-neutral-900/80 px-2 py-1 rounded-lg border border-neutral-800 italic">
          "{lastCommand}"
        </span>
      )}
    </div>
  );
};
