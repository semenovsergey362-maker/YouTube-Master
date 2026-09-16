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
  Maximize2,
  Copy,
  Layers,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { annotateTextForVoiceover } from "../services/geminiService";
import { copyToClipboard } from "../utils/helpers";

export type VoiceEngineType = 'elevenlabs' | 'yandex' | 'google' | 'sber';

interface SpeakerTTSMarkupSectionProps {
  scriptBlocks: Record<number, {
    blockNumber?: number;
    blockTitle?: string;
    title?: string;
    text: string;
    timeRange?: string;
    musicPrompt?: string;
    voiceover?: {
      intonation?: string;
      mood?: string;
      sampleContext?: string;
    };
    [key: string]: any;
  }>;
  selectedModel?: string;
  onUpdateBlockText: (bIdx: number, txt: string) => void;
}

export const SpeakerTTSMarkupSection: React.FC<SpeakerTTSMarkupSectionProps> = ({
  scriptBlocks,
  selectedModel = "gemini-3.1-flash-lite",
  onUpdateBlockText
}) => {
  const blockKeys = Object.keys(scriptBlocks || {}).map(Number).sort((a, b) => a - b);

  const [selectedBlockIdx, setSelectedBlockIdx] = useState<number | null>(() => {
    return blockKeys.length > 0 ? blockKeys[0] : null;
  });
  
  const [voiceEngine, setVoiceEngine] = useState<VoiceEngineType>('elevenlabs');
  const [wordsPerMinute, setWordsPerMinute] = useState<number>(140);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);

  // Dynamically resolve the active block index even if scriptBlocks changes after upload
  const activeBlockIdx = (selectedBlockIdx !== null && scriptBlocks && scriptBlocks[selectedBlockIdx] !== undefined)
    ? selectedBlockIdx
    : (blockKeys.length > 0 ? blockKeys[0] : null);

  const currentBlock = activeBlockIdx !== null && scriptBlocks ? scriptBlocks[activeBlockIdx] : null;

  // Keep state in sync with valid blocks
  React.useEffect(() => {
    if (activeBlockIdx !== null && activeBlockIdx !== selectedBlockIdx) {
      setSelectedBlockIdx(activeBlockIdx);
    }
  }, [activeBlockIdx, selectedBlockIdx]);

  if (blockKeys.length === 0 || !currentBlock) {
    return (
      <div className="text-center py-8 text-neutral-400 text-xs bg-neutral-900/30 rounded-xl border border-neutral-800/60 p-6">
        <Volume2 size={24} className="mx-auto text-neutral-600 mb-2" />
        <p className="font-semibold text-neutral-300">Блоки сценария для разметки речи отсутствуют</p>
        <p className="text-[11px] text-neutral-500 mt-1">
          Загрузите свой сценарий выше или сгенерируйте сценарий с помощью ИИ, чтобы разметить интонации, паузы и ударения.
        </p>
      </div>
    );
  }

  const currentText = currentBlock.text || "";

  // Calculate duration of text based on WPM
  const calculateDuration = (text: string) => {
    if (!text || text.trim().length === 0) return 0;
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    // Add additional pauses for tags
    const pauseMatches = text.match(/\((\d+(?:\.\d+)?s|500ms)\)|sil\s*<\[\d+\]>|<break[^>]*\/>/gi);
    let pauseTime = 0;
    if (pauseMatches) {
      pauseMatches.forEach(p => {
        if (p.includes('500ms') || p.includes('500')) {
          pauseTime += 0.5;
        } else if (p.includes('1s') || p.includes('1000')) {
          pauseTime += 1.0;
        } else {
          const sec = parseFloat(p.replace(/[^0-9.]/g, ''));
          if (!isNaN(sec)) pauseTime += sec > 10 ? sec / 1000 : sec;
        }
      });
    }
    const speechTime = (wordCount / wordsPerMinute) * 60;
    return Math.round(speechTime + pauseTime);
  };

  // Insert markdown/engine tag at selection
  const insertMarkupTag = (tag: string) => {
    if (activeBlockIdx === null) return;
    const textarea = document.getElementById(`tts-markup-textarea-${activeBlockIdx}`) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    
    let replacement = "";
    if (tag === 'accent') {
      replacement = selectedText ? `*${selectedText}*` : '*акцент*';
    } else if (tag === 'pause_short') {
      replacement = voiceEngine === 'yandex' ? `sil <[500]> ` : (voiceEngine === 'google' || voiceEngine === 'sber' ? `<break time="500ms"/> ` : `(500ms) `);
    } else if (tag === 'pause_long') {
      replacement = voiceEngine === 'yandex' ? `sil <[1000]> ` : (voiceEngine === 'google' || voiceEngine === 'sber' ? `<break time="1s"/> ` : `(1s) `);
    } else if (tag === 'whisper') {
      replacement = selectedText ? `[шепот] ${selectedText}` : '[шепот] ';
    } else if (tag === 'intonation') {
      replacement = `[интригующе] `;
    } else if (tag === 'stress') {
      replacement = `+`;
    }

    const newText = text.substring(0, start) + replacement + text.substring(end);
    onUpdateBlockText(activeBlockIdx, newText);
    
    // Reset focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 50);
  };

  // Handle AI annotation for current block
  const handleAIMarkup = async () => {
    if (activeBlockIdx === null || !currentBlock) return;
    if (!currentText.trim()) {
      toast.error("Текст выбранного блока пуст. Введите текст для разметки.");
      return;
    }

    setIsGenerating(true);
    const toastId = toast.loading("ИИ расставляет интонации, паузы и дикторские акценты...");
    
    try {
      const annotatedText = await annotateTextForVoiceover(currentText, { model: selectedModel });
      if (annotatedText) {
        onUpdateBlockText(activeBlockIdx, annotatedText);
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

  // Handle AI annotation for all blocks sequentially
  const handleAnnotateAllBlocks = async () => {
    if (blockKeys.length === 0) return;
    setIsGeneratingAll(true);
    const toastId = toast.loading(`Размечаем все блоки сценария (1/${blockKeys.length})...`);

    try {
      let count = 0;
      for (const k of blockKeys) {
        const blk = scriptBlocks[k];
        const rawText = blk?.text || "";
        if (rawText.trim()) {
          const annotated = await annotateTextForVoiceover(rawText, { model: selectedModel });
          if (annotated) {
            onUpdateBlockText(k, annotated);
          }
        }
        count++;
        if (count < blockKeys.length) {
          toast.loading(`Размечаем все блоки сценария (${count + 1}/${blockKeys.length})...`, { id: toastId });
        }
      }
      toast.success(`ИИ-разметка успешно применена ко всем ${blockKeys.length} блокам!`, { id: toastId });
    } catch (err: any) {
      toast.error(`Ошибка при разметке всех блоков: ${err.message || err}`, { id: toastId });
    } finally {
      setIsGeneratingAll(false);
    }
  };

  const handleCopyCurrent = () => {
    if (!currentText) return;
    copyToClipboard(currentText);
    toast.success("Текст текущего блока с разметкой скопирован в буфер!");
  };

  const handleCopyAll = () => {
    const full = blockKeys
      .map(k => scriptBlocks[k]?.text || "")
      .filter(Boolean)
      .join("\n\n");
    if (!full) {
      toast.error("Сценарий пуст");
      return;
    }
    copyToClipboard(full);
    toast.success("Весь сценарий с дикторской разметкой скопирован!");
  };

  const currentDuration = calculateDuration(currentText);

  return (
    <div className="space-y-4">
      {/* Top Controller / Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-neutral-900/60 p-4 rounded-xl border border-neutral-800">
        <div className="flex items-center gap-2">
          <label className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Выбрать блок:</label>
          <div className="relative inline-block">
            <select
              value={activeBlockIdx ?? ""}
              onChange={(e) => setSelectedBlockIdx(Number(e.target.value))}
              className="appearance-none bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 pr-8 text-xs text-white font-bold focus:outline-none focus:border-primary cursor-pointer max-w-[260px] truncate"
            >
              {blockKeys.map((k, idx) => (
                <option key={k} value={k}>
                  {idx + 1}. {scriptBlocks[k]?.blockTitle || scriptBlocks[k]?.title || `Блок ${idx + 1}`}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-neutral-400">
              <ChevronRight size={14} className="rotate-90" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
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
                  {eng === 'elevenlabs' ? 'ElevenLabs' : eng === 'yandex' ? 'Yandex' : eng === 'google' ? 'Google' : 'Sber'}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Copy Dropdown / Buttons */}
          <button
            onClick={handleCopyCurrent}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-all cursor-pointer"
            title="Скопировать текущий блок с разметкой в буфер"
          >
            <Copy size={13} />
            <span>Копия блока</span>
          </button>

          <button
            onClick={handleCopyAll}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-all cursor-pointer"
            title="Скопировать весь сценарий со всеми блоками и разметкой"
          >
            <FileText size={13} />
            <span>Весь сценарий</span>
          </button>

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
                className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 text-[10px] text-neutral-300 rounded font-semibold border border-neutral-800 cursor-pointer transition-colors"
                title="Вставить короткую паузу 0.5с"
              >
                +Пауза 0.5с
              </button>
              <button
                onClick={() => insertMarkupTag('pause_long')}
                className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 text-[10px] text-neutral-300 rounded font-semibold border border-neutral-800 cursor-pointer transition-colors"
                title="Вставить длинную паузу 1с"
              >
                +Пауза 1с
              </button>
              <button
                onClick={() => insertMarkupTag('accent')}
                className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 text-[10px] text-neutral-300 rounded font-semibold border border-neutral-800 cursor-pointer transition-colors"
                title="Сделать слово акцентным"
              >
                +Акцент
              </button>
              <button
                onClick={() => insertMarkupTag('whisper')}
                className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 text-[10px] text-neutral-300 rounded font-semibold border border-neutral-800 cursor-pointer transition-colors"
                title="Сделать фразу шепотом"
              >
                +Шепот
              </button>
              <button
                onClick={() => insertMarkupTag('stress')}
                className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 text-[10px] text-neutral-300 rounded font-semibold border border-neutral-800 cursor-pointer transition-colors"
                title="Добавить знак ударения (+)"
              >
                +Ударение
              </button>
            </div>
          </div>

          <textarea
            id={`tts-markup-textarea-${activeBlockIdx}`}
            value={currentText}
            onChange={(e) => onUpdateBlockText(activeBlockIdx, e.target.value)}
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
                  {currentText.length} зн.
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleAIMarkup}
              disabled={isGenerating || isGeneratingAll}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-accent hover:opacity-90 disabled:opacity-50 text-black font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Размечаем блок...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Разметить текущий блок (ИИ)</span>
                </>
              )}
            </button>

            {blockKeys.length > 1 && (
              <button
                onClick={handleAnnotateAllBlocks}
                disabled={isGenerating || isGeneratingAll}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-neutral-200 hover:text-white border border-neutral-800 font-bold text-[11px] rounded-xl transition-all cursor-pointer"
              >
                {isGeneratingAll ? (
                  <>
                    <RefreshCw size={13} className="animate-spin text-primary" />
                    <span>Размечаем все блоки...</span>
                  </>
                ) : (
                  <>
                    <Layers size={13} className="text-primary" />
                    <span>Разметить все {blockKeys.length} блоков</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
