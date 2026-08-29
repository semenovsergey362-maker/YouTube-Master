import React, { useState } from "react";
import { 
  Volume2, 
  Sparkles, 
  RefreshCw, 
  Check, 
  HelpCircle, 
  Clock, 
  Activity,
  ChevronRight,
  Info,
  Sliders,
  Type,
  Maximize2
} from "lucide-react";
import { toast } from "sonner";
import { annotateTextForVoiceover } from "../services/geminiService";

export type VoiceEngineType = 'elevenlabs' | 'yandex' | 'google' | 'sber';

interface SpeakerTTSMarkupSectionProps {
  scriptBlocks: Record<number, {
    blockNumber: number;
    blockTitle: string;
    text: string;
    timeRange?: string;
    musicPrompt?: string;
    voiceover?: {
      intonation?: string;
      mood?: string;
      sampleContext?: string;
    };
  }>;
  selectedModel?: string;
  onUpdateBlockText: (bIdx: number, txt: string) => void;
}

export const SpeakerTTSMarkupSection: React.FC<SpeakerTTSMarkupSectionProps> = ({
  scriptBlocks,
  selectedModel = "gemini-3.7-flash",
  onUpdateBlockText
}) => {
  const [selectedBlockIdx, setSelectedBlockIdx] = useState<number | null>(() => {
    const keys = Object.keys(scriptBlocks).map(Number);
    return keys.length > 0 ? Math.min(...keys) : null;
  });
  
  const [voiceEngine, setVoiceEngine] = useState<VoiceEngineType>('elevenlabs');
  const [wordsPerMinute, setWordsPerMinute] = useState<number>(140);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);

  const blockKeys = Object.keys(scriptBlocks).map(Number).sort((a, b) => a - b);
  const currentBlock = selectedBlockIdx !== null ? scriptBlocks[selectedBlockIdx] : null;

  if (blockKeys.length === 0 || !currentBlock) {
    return (
      <div className="text-center py-8 text-neutral-400 text-xs">
        Создайте или сгенерируйте хотя бы один блок сценария для разметки речи.
      </div>
    );
  }

  // Calculate duration of text based on WPM
  const calculateDuration = (text: string) => {
    if (!text || text.trim().length === 0) return 0;
    const wordCount = text.trim().split(/\s+/).length;
    // Add additional pauses for tags
    const pauseMatches = text.match(/\((\d+(?:\.\d+)?s|500ms)\)/g);
    let pauseTime = 0;
    if (pauseMatches) {
      pauseMatches.forEach(p => {
        if (p.includes('ms')) {
          pauseTime += 0.5;
        } else {
          const sec = parseFloat(p.replace(/[^0-9.]/g, ''));
          if (!isNaN(sec)) pauseTime += sec;
        }
      });
    }
    const speechTime = (wordCount / wordsPerMinute) * 60;
    return Math.round(speechTime + pauseTime);
  };

  // Insert markdown tag at selection
  const insertMarkupTag = (tag: string) => {
    const textarea = document.getElementById(`tts-markup-textarea-${selectedBlockIdx}`) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    
    let replacement = "";
    if (tag === 'accent') {
      replacement = selectedText ? `*${selectedText}*` : '*акцент*';
    } else if (tag === 'pause_short') {
      replacement = `(500ms) `;
    } else if (tag === 'pause_long') {
      replacement = `(1s) `;
    } else if (tag === 'whisper') {
      replacement = selectedText ? `[шепот] ${selectedText}` : '[шепот] ';
    } else if (tag === 'intonation') {
      replacement = `[интригующе] `;
    } else if (tag === 'stress') {
      replacement = `+`;
    }

    const newText = text.substring(0, start) + replacement + text.substring(end);
    onUpdateBlockText(selectedBlockIdx!, newText);
    
    // Reset focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 50);
  };

  // Handle AI annotation request
  const handleAIMarkup = async () => {
    if (selectedBlockIdx === null) return;
    setIsGenerating(true);
    const toastId = toast.loading("ИИ анализирует текст блока и расставляет интонационную разметку...");
    
    try {
      const annotatedText = await annotateTextForVoiceover(currentBlock.text, { model: selectedModel });
      if (annotatedText) {
        onUpdateBlockText(selectedBlockIdx, annotatedText);
        toast.success("ИИ-Разметка успешно применена к блоку!", { id: toastId });
      } else {
        toast.error("Не удалось сгенерировать разметку.", { id: toastId });
      }
    } catch (err: any) {
      toast.error(`Ошибка генерации разметки: ${err.message || err}`, { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  const currentDuration = calculateDuration(currentBlock.text);

  return (
    <div className="space-y-4">
      {/* Top Controller / Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-neutral-900/60 p-4 rounded-xl border border-neutral-800">
        <div className="flex items-center gap-2">
          <label className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Выбрать блок:</label>
          <div className="relative inline-block">
            <select
              value={selectedBlockIdx ?? ""}
              onChange={(e) => setSelectedBlockIdx(Number(e.target.value))}
              className="appearance-none bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 pr-8 text-xs text-white font-bold focus:outline-none focus:border-primary cursor-pointer"
            >
              {blockKeys.map((k) => (
                <option key={k} value={k}>
                  Блок {k}: {scriptBlocks[k].blockTitle || "Без названия"}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-neutral-400">
              <ChevronRight size={14} className="rotate-90" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Engine Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider">Движок:</span>
            <div className="flex bg-neutral-950 p-1 rounded-lg border border-neutral-800">
              {(['elevenlabs', 'yandex', 'google', 'sber'] as VoiceEngineType[]).map((eng) => (
                <button
                  key={eng}
                  onClick={() => setVoiceEngine(eng)}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${
                    voiceEngine === eng 
                      ? 'bg-primary text-black shadow-sm' 
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {eng === 'elevenlabs' ? 'Eleven' : eng === 'yandex' ? 'Yandex' : eng === 'google' ? 'Google' : 'Sber'}
                </button>
              ))}
            </div>
          </div>

          {/* Guide toggle */}
          <button
            onClick={() => setShowGuide(!showGuide)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              showGuide 
                ? 'bg-neutral-800 border-neutral-700 text-white' 
                : 'bg-neutral-950 border-neutral-800/80 text-neutral-400 hover:text-white'
            }`}
          >
            <HelpCircle size={13} />
            <span>Справка</span>
          </button>
        </div>
      </div>

      {/* Interactive Guide Panel */}
      {showGuide && (
        <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-4 space-y-2.5 animate-fadeIn">
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Info size={14} className="text-primary" />
            Инструкция по разметке текста для озвучки (TTS)
          </h4>
          <p className="text-[11px] text-neutral-300 leading-relaxed">
            Разметка помогает ИИ-движкам озвучки воспроизводить текст более выразительно, естественно расставлять логические ударения, брать дыхание и выдерживать паузы.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-neutral-400 pt-1 border-t border-neutral-800/60">
            <div>
              <strong className="text-white">Паузы:</strong> <code className="bg-neutral-950 px-1 py-0.5 rounded text-primary">(500ms)</code> или <code className="bg-neutral-950 px-1 py-0.5 rounded text-primary">(1s)</code> задают точные паузы.
            </div>
            <div>
              <strong className="text-white">Логический акцент:</strong> Окружите слово звездочками <code className="bg-neutral-950 px-1 py-0.5 rounded text-primary">*слово*</code> для выделения.
            </div>
            <div>
              <strong className="text-white">Эмоция/Стиль:</strong> Теги вроде <code className="bg-neutral-950 px-1 py-0.5 rounded text-primary">[шепот]</code> или <code className="bg-neutral-950 px-1 py-0.5 rounded text-primary">[интригующе]</code> задают настроение фразы.
            </div>
            <div>
              <strong className="text-white">Русское ударение:</strong> Добавьте плюс <code className="bg-neutral-950 px-1 py-0.5 rounded text-primary">+</code> после ударной гласной (например, <code className="text-neutral-300">за+мок</code>).
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace Grid: Input/Edit on Left, Timing/Controls on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Editor Area (8 cols) */}
        <div className="lg:col-span-8 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-300 flex items-center gap-1">
              <Type size={12} className="text-primary" />
              Текст блока с разметкой
            </span>
            <div className="flex items-center gap-1">
              {/* Quick toolbar */}
              <button
                onClick={() => insertMarkupTag('pause_short')}
                className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 text-[10px] text-neutral-300 rounded font-semibold border border-neutral-800"
                title="Вставить короткую паузу 0.5с"
              >
                +Пауза 0.5с
              </button>
              <button
                onClick={() => insertMarkupTag('pause_long')}
                className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 text-[10px] text-neutral-300 rounded font-semibold border border-neutral-800"
                title="Вставить длинную паузу 1с"
              >
                +Пауза 1с
              </button>
              <button
                onClick={() => insertMarkupTag('accent')}
                className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 text-[10px] text-neutral-300 rounded font-semibold border border-neutral-800"
                title="Сделать слово акцентным"
              >
                +Акцент
              </button>
              <button
                onClick={() => insertMarkupTag('whisper')}
                className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 text-[10px] text-neutral-300 rounded font-semibold border border-neutral-800"
                title="Сделать фразу шепотом"
              >
                +Шепот
              </button>
              <button
                onClick={() => insertMarkupTag('stress')}
                className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 text-[10px] text-neutral-300 rounded font-semibold border border-neutral-800"
                title="Добавить знак ударения (+)"
              >
                +Ударение
              </button>
            </div>
          </div>

          <textarea
            id={`tts-markup-textarea-${selectedBlockIdx}`}
            value={currentBlock.text}
            onChange={(e) => onUpdateBlockText(selectedBlockIdx!, e.target.value)}
            placeholder="Текст вашего сценария..."
            rows={6}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-neutral-200 focus:outline-none focus:border-primary/80 leading-relaxed font-mono resize-y min-h-[140px]"
          />
        </div>

        {/* AI Action / Timing Card (4 cols) */}
        <div className="lg:col-span-4 bg-neutral-900/30 border border-neutral-800/80 rounded-xl p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sliders size={13} className="text-primary" />
              Параметры и Анализ ИИ
            </h4>

            {/* WPM speed controller */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-neutral-400">
                <span>Скорость речи (WPM):</span>
                <span className="font-mono text-white font-bold">{wordsPerMinute} слов/мин</span>
              </div>
              <input
                type="range"
                min="100"
                max="200"
                step="5"
                value={wordsPerMinute}
                onChange={(e) => setWordsPerMinute(Number(e.target.value))}
                className="w-full accent-primary bg-neutral-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
              <div className="bg-neutral-950/50 p-2.5 rounded-lg border border-neutral-800/40">
                <span className="text-neutral-500 block text-[9px] uppercase font-bold">Длина речи</span>
                <span className="text-white font-bold font-mono flex items-center gap-1 mt-0.5">
                  <Clock size={12} className="text-primary" />
                  ~{currentDuration} сек
                </span>
              </div>
              <div className="bg-neutral-950/50 p-2.5 rounded-lg border border-neutral-800/40">
                <span className="text-neutral-500 block text-[9px] uppercase font-bold">Символы</span>
                <span className="text-white font-bold font-mono flex items-center gap-1 mt-0.5">
                  <Activity size={12} className="text-accent" />
                  {currentBlock.text.length} зн.
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleAIMarkup}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-accent hover:opacity-90 disabled:opacity-50 text-black font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            {isGenerating ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Размечаем речь...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>Разметить текст с помощью ИИ</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
