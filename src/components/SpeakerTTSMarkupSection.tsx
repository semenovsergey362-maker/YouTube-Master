import { logger } from "../config/logger";
import React, { useState, useMemo } from 'react';
import { 
  Volume2, 
  Sparkles, 
  Clock, 
  Copy, 
  Check, 
  RefreshCw, 
  Zap, 
  FileAudio, 
  Mic, 
  Sliders,
  ExternalLink,
  Search
} from 'lucide-react';
import { generateTTSMarkup } from '../services/geminiService';
import { formatBreathingScriptText } from '../utils/helpers';
import { toast } from 'sonner';

export type VoiceEngineType = 'elevenlabs' | 'yandex' | 'google' | 'sber';

// Helper to calculate exact timing including pauses
export function calculateBlockTiming(text: string, wordsPerMinute: number = 140) {
  const cleanText = (text || '').replace(/\([^)]+\)|\[[^\]]+\]|\*[^*]+\*/g, '');
  const words = cleanText.trim().split(/\s+/).filter(Boolean).length;

  let pauseMs = 0;
  const msMatches = (text || '').match(/\((\d+)\s*ms\)/gi) || [];
  msMatches.forEach((m: string) => {
    const val = parseInt(m.replace(/\D/g, ''), 10);
    if (!isNaN(val)) pauseMs += val;
  });

  const secMatches = (text || '').match(/\((\d+)\s*s\)/gi) || [];
  secMatches.forEach((m: string) => {
    const val = parseInt(m.replace(/\D/g, ''), 10);
    if (!isNaN(val)) pauseMs += val * 1000;
  });

  const ellipsisMatches = (text || '').match(/\.\.\./g) || [];
  pauseMs += ellipsisMatches.length * 800;

  const wordSec = (words / wordsPerMinute) * 60;
  const pauseSec = pauseMs / 1000;
  const totalBlockSec = Math.round(wordSec + pauseSec);

  const formattedDuration = `${Math.floor(totalBlockSec / 60)}:${(totalBlockSec % 60).toString().padStart(2, '0')}`;

  return {
    words,
    pauseMs,
    pauseSec,
    wordSec,
    totalBlockSec,
    formattedDuration
  };
}

export function formatTextForEngine(text: string, voiceEngine: VoiceEngineType): string {
  if (voiceEngine === 'yandex') {
    return (text || '')
      .replace(/\(500ms\)/gi, '<silence msec="500"/>')
      .replace(/\(1s\)/gi, '<silence msec="1000"/>')
      .replace(/\(2s\)/gi, '<silence msec="2000"/>')
      .replace(/\*([^*]+)\*/g, '+$1');
  }
  return text || '';
}

interface GlobalTTSHeaderBarProps {
  voiceEngine: VoiceEngineType;
  setVoiceEngine: (v: VoiceEngineType) => void;
  wordsPerMinute: number;
  setWordsPerMinute: (wpm: number) => void;
  scriptBlocks: Record<number, any>;
  selectedModel?: string;
  onUpdateBlockText?: (blockIndex: number, text: string) => void;
}

export const GlobalTTSHeaderBar: React.FC<GlobalTTSHeaderBarProps> = ({
  voiceEngine,
  setVoiceEngine,
  wordsPerMinute,
  setWordsPerMinute,
  scriptBlocks,
  selectedModel,
  onUpdateBlockText
}) => {
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const blockKeys = useMemo(() => {
    return Object.keys(scriptBlocks || {}).map(Number).sort((a, b) => a - b);
  }, [scriptBlocks]);

  const timingStats = useMemo(() => {
    let totalWords = 0;
    let totalPauseMs = 0;

    blockKeys.forEach(k => {
      const text = scriptBlocks[k]?.text || '';
      const timing = calculateBlockTiming(text, wordsPerMinute);
      totalWords += timing.words;
      totalPauseMs += timing.pauseMs;
    });

    const totalWordSec = (totalWords / wordsPerMinute) * 60;
    const totalPauseSec = totalPauseMs / 1000;
    const grandTotalSec = Math.round(totalWordSec + totalPauseSec);

    const formattedGrandTotal = `${Math.floor(grandTotalSec / 60)}:${(grandTotalSec % 60).toString().padStart(2, '0')}`;
    const formattedWordTime = `${Math.floor(totalWordSec / 60)}:${Math.round(totalWordSec % 60).toString().padStart(2, '0')}`;
    const formattedPauseTime = `${Math.floor(totalPauseSec / 60)}:${Math.round(totalPauseSec % 60).toString().padStart(2, '0')}`;

    return {
      totalWords,
      totalPauseMs,
      grandTotalSec,
      formattedGrandTotal,
      formattedWordTime,
      formattedPauseTime
    };
  }, [scriptBlocks, blockKeys, wordsPerMinute]);

  const handleGenerateMarkupForAll = async () => {
    if (blockKeys.length === 0) return;
    setIsGeneratingAll(true);
    try {
      for (const k of blockKeys) {
        const text = scriptBlocks[k]?.text || '';
        if (text.trim()) {
          const marked = await generateTTSMarkup(text, { model: selectedModel });
          const finalClean = formatBreathingScriptText(marked);
          if (onUpdateBlockText) {
            onUpdateBlockText(k, finalClean);
          }
        }
      }
      toast.success('Все блоки сценария успешно размечены для озвучки!');
    } catch (err) {
      logger.error(err);
      toast.error('Ошибка при быстрой разметке.');
    } finally {
      setIsGeneratingAll(false);
    }
  };

  const handleCopyAll = () => {
    const fullText = blockKeys.map(k => {
      const title = scriptBlocks[k]?.title || `БЛОК ${k + 1}`;
      const text = formatTextForEngine(scriptBlocks[k]?.text || '', voiceEngine);
      return `--- ${title} ---\n${text}`;
    }).join('\n\n');

    navigator.clipboard.writeText(fullText);
    setCopiedAll(true);
    toast.success(`Весь размеченный сценарий скопирован для ${voiceEngine.toUpperCase()}!`);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="space-y-5 bg-surface/90 border border-border/80 rounded-3xl p-5 shadow-2xl backdrop-blur-xl w-full">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
            <Mic size={22} />
          </div>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-white flex flex-wrap items-center gap-2">
              <span>Дикторская разметка пауз, акцентов & Расчет хронометража</span>
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                TTS AI Audio
              </span>
            </h3>
            <p className="text-neutral-400 text-xs mt-0.5">
              Умная расстановка микропауз (500ms), (1s), отделение цитат и смысловых абзацев для естественного дыхания речи.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleGenerateMarkupForAll}
            disabled={isGeneratingAll || blockKeys.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-500/20 cursor-pointer disabled:opacity-50 transition-all shrink-0"
          >
            {isGeneratingAll ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Разметка блоков...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>Авто-разметка всего сценария</span>
              </>
            )}
          </button>

          <button
            onClick={handleCopyAll}
            disabled={blockKeys.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 bg-neutral-900 text-neutral-200 border border-neutral-800 hover:bg-neutral-800 font-extrabold text-xs rounded-xl cursor-pointer transition-all shrink-0"
          >
            {copiedAll ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>Скопировать всё</span>
          </button>
        </div>
      </div>

      {/* Voice Engine & Speed Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 bg-neutral-950/80 p-4 rounded-2xl border border-neutral-800">
        {/* Preset Selector */}
        <div className="space-y-2 min-w-0">
          <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
            <FileAudio size={12} className="text-blue-400 shrink-0" /> Пресет движка озвучки (TTS):
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'elevenlabs', label: 'ElevenLabs', desc: '(500ms) / *слово*' },
              { id: 'yandex', label: 'Yandex', desc: '<silence/> / +слово' },
              { id: 'google', label: 'Google Studio', desc: '(1s) / [шепот]' },
              { id: 'sber', label: 'Sber / Treblo', desc: 'SSML Tags' }
            ].map((eng, eIdx) => (
              <button
                key={`tts-eng-${eng.id}-${eIdx}`}
                onClick={() => setVoiceEngine(eng.id as VoiceEngineType)}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer min-w-0 ${
                  voiceEngine === eng.id
                    ? 'bg-blue-600/20 border-blue-500/50 text-white shadow-md shadow-blue-500/10'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-extrabold truncate">{eng.label}</div>
                <div className="text-[9px] text-neutral-500 mt-0.5 truncate">{eng.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* WPM Speed Slider */}
        <div className="space-y-2 min-w-0">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sliders size={12} className="text-emerald-400 shrink-0" /> Скорость речи диктора (WPM):
            </label>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {wordsPerMinute} слов/мин
            </span>
          </div>
          <input
            type="range"
            min="110"
            max="180"
            step="5"
            value={wordsPerMinute}
            onChange={(e) => setWordsPerMinute(Number(e.target.value))}
            className="w-full accent-emerald-500 bg-neutral-800 h-2 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-neutral-500 font-mono">
            <span>Медленно (110)</span>
            <span>Стандарт (140)</span>
            <span>Динамично (180)</span>
          </div>
        </div>
      </div>

      {/* Timing Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-neutral-900/80 border border-neutral-800/80 p-3 rounded-2xl space-y-0.5 min-w-0">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1 truncate">
            <Clock size={12} className="text-emerald-400 shrink-0" /> Общий Хронометраж
          </span>
          <div className="text-xl font-black text-white">{timingStats.formattedGrandTotal}</div>
          <p className="text-[10px] text-neutral-500 truncate">Мин:Сек дикции + пауз</p>
        </div>

        <div className="bg-neutral-900/80 border border-neutral-800/80 p-3 rounded-2xl space-y-0.5 min-w-0">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1 truncate">
            <Mic size={12} className="text-blue-400 shrink-0" /> Время Дикции
          </span>
          <div className="text-xl font-black text-blue-300">{timingStats.formattedWordTime}</div>
          <p className="text-[10px] text-neutral-500 truncate">{timingStats.totalWords} слов в тексте</p>
        </div>

        <div className="bg-neutral-900/80 border border-neutral-800/80 p-3 rounded-2xl space-y-0.5 min-w-0">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1 truncate">
            <Volume2 size={12} className="text-purple-400 shrink-0" /> Сумма Пауз
          </span>
          <div className="text-xl font-black text-purple-300">{timingStats.formattedPauseTime}</div>
          <p className="text-[10px] text-neutral-500 truncate">{(timingStats.totalPauseMs / 1000).toFixed(1)} сек пауз</p>
        </div>

        <div className="bg-neutral-900/80 border border-neutral-800/80 p-3 rounded-2xl space-y-0.5 min-w-0">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1 truncate">
            <Zap size={12} className="text-amber-400 shrink-0" /> Движок Озвучки
          </span>
          <div className="text-xl font-black text-amber-300 uppercase truncate">{voiceEngine}</div>
          <p className="text-[10px] text-neutral-500 truncate">Готово для экспорта</p>
        </div>
      </div>
    </div>
  );
};

interface BlockTTSQuickBarProps {
  blockIndex: number;
  blockText: string;
  selectedModel?: string;
  onUpdateText: (newText: string) => void;
}

export const BlockTTSQuickBar: React.FC<BlockTTSQuickBarProps> = ({
  blockIndex,
  blockText,
  selectedModel,
  onUpdateText
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateMarkup = async () => {
    if (!blockText.trim()) return;
    setIsGenerating(true);
    try {
      const marked = await generateTTSMarkup(blockText, { model: selectedModel });
      const finalClean = formatBreathingScriptText(marked);
      onUpdateText(finalClean);
      toast.success(`Разметка пауз и акцентов добавлена в Блок #${blockIndex + 1}!`);
    } catch (err) {
      logger.error(err);
      toast.error('Не удалось сгенерировать разметку.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInsertTag = (tag: string) => {
    onUpdateText(`${blockText ? blockText + ' ' : ''}${tag}`);
    toast.success(`Вставлен тег "${tag}"`);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-neutral-950/70 rounded-xl border border-neutral-800/80">
      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
        <span className="text-neutral-500 font-bold mr-1">Дикторская разметка:</span>
        <button
          type="button"
          onClick={() => handleInsertTag('(500ms)')}
          className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 text-purple-300 border border-purple-500/30 rounded-md font-mono cursor-pointer transition-all active:scale-95"
        >
          +Пауза (500ms)
        </button>
        <button
          type="button"
          onClick={() => handleInsertTag('(1s)')}
          className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 text-purple-300 border border-purple-500/30 rounded-md font-mono cursor-pointer transition-all active:scale-95"
        >
          +Пауза (1s)
        </button>
        <button
          type="button"
          onClick={() => handleInsertTag('*акцент*')}
          className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 text-amber-300 border border-amber-500/30 rounded-md font-mono cursor-pointer transition-all active:scale-95"
        >
          *Акцент*
        </button>
        <button
          type="button"
          onClick={() => handleInsertTag('[шепот]')}
          className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 text-blue-300 border border-blue-500/30 rounded-md font-mono cursor-pointer transition-all active:scale-95"
        >
          [Шепот]
        </button>
        <button
          type="button"
          onClick={() => handleInsertTag('[энергично]')}
          className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 text-emerald-300 border border-emerald-500/30 rounded-md font-mono cursor-pointer transition-all active:scale-95"
        >
          [Энергично]
        </button>
        <button
          type="button"
          onClick={() => handleInsertTag('(!)')}
          className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 text-red-300 border border-red-500/30 rounded-md font-mono cursor-pointer transition-all active:scale-95"
        >
          (!) Усиление
        </button>
      </div>

      <button
        type="button"
        onClick={handleGenerateMarkup}
        disabled={isGenerating || !blockText.trim()}
        className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-lg text-[10px] font-extrabold flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50 shrink-0 ml-auto"
      >
        {isGenerating ? (
          <RefreshCw size={11} className="animate-spin" />
        ) : (
          <Sparkles size={11} />
        )}
        <span>ИИ-Разметка блока</span>
      </button>
    </div>
  );
};

// Legacy fallback component wrapper
export const SpeakerTTSMarkupSection: React.FC<{
  scriptBlocks: Record<number, any>;
  selectedModel?: string;
  onUpdateBlockText?: (blockIndex: number, text: string) => void;
}> = (props) => {
  const [voiceEngine, setVoiceEngine] = useState<VoiceEngineType>('elevenlabs');
  const [wordsPerMinute, setWordsPerMinute] = useState<number>(140);

  return (
    <div className="space-y-4">
      <GlobalTTSHeaderBar
        {...props}
        voiceEngine={voiceEngine}
        setVoiceEngine={setVoiceEngine}
        wordsPerMinute={wordsPerMinute}
        setWordsPerMinute={setWordsPerMinute}
      />
    </div>
  );
};

export const PixabaySFXSearchWidget: React.FC<{ initialQuery?: string }> = ({ initialQuery = '' }) => {
  const [query, setQuery] = useState(initialQuery);

  const handleSearch = (qToUse?: string) => {
    const q = (qToUse !== undefined ? qToUse : query).trim();
    const url = q 
      ? `https://pixabay.com/ru/sound-effects/search/${encodeURIComponent(q)}/`
      : `https://pixabay.com/ru/sound-effects/search/`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const presetTags = [
    { label: "⚡ Whoosh", query: "whoosh" },
    { label: "💥 Impact / Взрыв", query: "impact" },
    { label: "🎧 Glitch", query: "glitch" },
    { label: "🔔 Уведомление", query: "notification" },
    { label: "🌧️ Дождь / Природа", query: "rain" },
    { label: "👏 Аплодисменты", query: "applause" },
    { label: "🚀 Riser / Нарастание", query: "riser" },
    { label: "🎸 Sub Drop / Бас", query: "sub drop" }
  ];

  return (
    <div className="bg-neutral-900/90 border border-emerald-500/30 rounded-2xl p-4 space-y-3 shadow-lg">
      <div className="flex items-center justify-between gap-2 border-b border-neutral-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Volume2 size={16} />
          </div>
          <div>
            <h5 className="text-xs font-bold text-white flex items-center gap-2">
              🎙️ Поиск звуковых эффектов (Pixabay SFX)
            </h5>
            <p className="text-[10px] text-neutral-400">
              Быстрый переход в бесплатную библиотеку роялти-фри шумов, переходов и интершумов Pixabay.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => handleSearch()}
          className="text-xs font-extrabold px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-md shadow-emerald-500/20"
        >
          <span>Искать на Pixabay</span>
          <ExternalLink size={12} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            placeholder="Введите нужный звуковой эффект (например: whoosh, cinematic impact, шорох)..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
        <button
          type="button"
          onClick={() => handleSearch()}
          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-bold transition-all border border-neutral-700 cursor-pointer shrink-0"
        >
          Найти
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
        <span className="text-neutral-500 font-bold mr-1">Популярные шумы:</span>
        {presetTags.map((tag, idx) => (
          <button key={`preset-tag-${idx}-${tag.query || idx}`} type="button"
            onClick={() => {
              setQuery(tag.query);
              handleSearch(tag.query);
            }}
            className="px-2.5 py-1 bg-neutral-950 hover:bg-neutral-800 text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 rounded-lg transition-all cursor-pointer font-medium"
          >
            {tag.label}
          </button>
        ))}
      </div>
    </div>
  );
};
