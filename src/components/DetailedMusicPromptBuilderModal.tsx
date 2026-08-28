import { logger } from "../config/logger";
import React, { useState, useEffect } from 'react';
import { 
  Music, 
  Sparkles, 
  Sliders, 
  Copy, 
  Check, 
  X, 
  Disc, 
  Activity, 
  Volume2, 
  Zap, 
  MicOff, 
  Layers,
  ListFilter,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateDetailedBlockMusicPrompt } from '../services/geminiService';
import { toast } from 'sonner';

interface DetailedMusicPromptBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  blockIndex: number;
  blockTitle: string;
  blockText?: string;
  scriptTopic?: string;
  initialPrompt?: string;
  selectedModel?: string;
  onApplyPrompt: (blockIndex: number, promptText: string) => void;
}

const GENRE_PRESETS = [
  { id: 'cinematic_neoclassical', label: 'Cinematic Neoclassical', tag: 'cinematic neoclassical, ambient orchestra' },
  { id: 'dark_synthwave', label: 'Dark Synthwave / Cyberpunk', tag: 'dark synthwave, cyberpunk industrial, analogue synth' },
  { id: 'lofi_chill', label: 'Lo-Fi Chill & Study', tag: 'lofi hip hop, dusty vinyl, warm rhodes, mellow beat' },
  { id: 'epic_trailer', label: 'Epic Hybrid Trailer', tag: 'epic trailer hybrid, massive brass, impact risers, heavy percussion' },
  { id: 'ambient_drone', label: 'Deep Ambient Drone', tag: 'deep ambient drone, ethereal pads, infinite reverb, subtle atmosphere' },
  { id: 'acoustic_folk', label: 'Acoustic Folk / Warm', tag: 'acoustic indie folk, fingerstyle guitar, warm organic cello' },
  { id: 'corporate_tech', label: 'Corporate Tech & Upbeat', tag: 'tech corporate upbeat, muted electric guitar, modern synth arpeggio' },
  { id: 'suspense_thriller', label: 'Suspense & Mystery', tag: 'suspense thriller score, ticking clock percussion, eerie strings, low drone' },
];

const MOOD_PRESETS = [
  'Inspirational Hope', 'Suspenseful & Tense', 'Dark Mystery', 'Deep Melancholy', 
  'Uplifting Joy', 'Cyberpunk Action', 'Peaceful Reflection', 'Heroic Triumph', 
  'Calm & Neutral', 'Urgent Warning'
];

const KEY_SIGNATURE_OPTIONS = [
  'A minor (Am)', 'C Major (C)', 'D minor (Dm)', 'E minor (Em)', 
  'G Major (G)', 'F Major (F)', 'F# minor (F#m)', 'B minor (Bm)', 
  'G minor (Gm)', 'C minor (Cm)', 'A Major (A)', 'E Major (E)'
];

const CHORD_PROGRESSION_PRESETS = [
  'Am - F - C - G',
  'Dm - Bb - F - C',
  'Am - Dm - F - E',
  'C - G - Am - F',
  'Em - C - G - D',
  'Am - Em - F - G',
  'i - VI - III - VII',
  'i - iv - VI - V',
  'i - v - VI - VII'
];

const INSTRUMENT_OPTIONS = [
  'Felt Piano', 'Grand Piano', 'Warm Strings Section', 'Solo Cello', 
  'Deep Sub Bass', 'Soft Synth Pad', 'Acoustic Guitar', 'Electric Guitar', 
  'Brass Horns', 'Ethnic Flute', 'Orchestral Drums', 'Lo-Fi Vinyl Beat', 
  'Ethereal Choir', 'Analogue Arpeggiator', 'Ambient Synth Drone'
];

const PRODUCTION_TAG_OPTIONS = [
  'no vocals', 'clean voiceover eq mix', 'high mid-range clarity', 
  'deep sub bass', 'spacious hall reverb', 'soft dynamics', 
  'crisp transient percussion', 'analog tape warmth', 'wide stereo imaging'
];

const ENERGY_LEVELS = [
  { id: 'soft', label: 'Тихий фон (20%)', tag: 'soft gentle background music, quiet volume' },
  { id: 'moderate', label: 'Умеренное развитие (50%)', tag: 'moderate steady pacing, subtle build' },
  { id: 'high', label: 'Высокое напряжение (80%)', tag: 'high emotional intensity, driving rhythm' },
  { id: 'peak', label: 'Кульминация / Пик (100%)', tag: 'climactic peak impact, full dynamic force' },
];

export const DetailedMusicPromptBuilderModal: React.FC<DetailedMusicPromptBuilderModalProps> = ({
  isOpen,
  onClose,
  blockIndex,
  blockTitle,
  blockText,
  scriptTopic,
  initialPrompt,
  selectedModel,
  onApplyPrompt
}) => {
  const [selectedGenre, setSelectedGenre] = useState<string>('cinematic_neoclassical');
  const [tempoBpm, setTempoBpm] = useState<number>(75);
  const [selectedMood, setSelectedMood] = useState<string>('Suspenseful & Tense');
  const [selectedKey, setSelectedKey] = useState<string>('A minor (Am)');
  const [chordProgression, setChordProgression] = useState<string>('Am - F - C - G');
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>(['Felt Piano', 'Warm Strings Section', 'Deep Sub Bass']);
  const [selectedProductionTags, setSelectedProductionTags] = useState<string[]>(['no vocals', 'clean voiceover eq mix']);
  const [selectedEnergy, setSelectedEnergy] = useState<string>('moderate');
  const [customPrompt, setCustomPrompt] = useState<string>(initialPrompt || '');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  useEffect(() => {
    if (initialPrompt) {
      setCustomPrompt(initialPrompt);
    }
  }, [initialPrompt]);

  // Toggle instrument selection
  const toggleInstrument = (inst: string) => {
    setSelectedInstruments(prev => {
      const arr = Array.isArray(prev) ? prev : [];
      return arr.includes(inst) ? arr.filter(i => i !== inst) : [...arr, inst]
    });
  };

  // Toggle production tag
  const toggleProductionTag = (tag: string) => {
    setSelectedProductionTags(prev => {
      const arr = Array.isArray(prev) ? prev : [];
      return arr.includes(tag) ? arr.filter(t => t !== tag) : [...arr, tag]
    });
  };

  // Auto-build prompt string from parameters
  const constructPromptFromSelections = () => {
    const genreObj = GENRE_PRESETS.find(g => g.id === selectedGenre);
    const energyObj = ENERGY_LEVELS.find(e => e.id === selectedEnergy);

    const parts = [
      genreObj?.tag,
      selectedMood ? `${selectedMood.toLowerCase()} mood` : null,
      `${tempoBpm} bpm`,
      selectedKey ? `key of ${selectedKey}` : null,
      chordProgression ? `chord progression ${chordProgression}` : null,
      selectedInstruments.length > 0 ? selectedInstruments.join(', ').toLowerCase() : null,
      energyObj?.tag,
      selectedProductionTags.length > 0 ? selectedProductionTags.join(', ') : null,
    ].filter(Boolean);

    return parts.join(', ');
  };

  // Handle AI prompt generation
  const handleAiGeneratePrompt = async () => {
    setIsAiGenerating(true);
    try {
      const genreObj = GENRE_PRESETS.find(g => g.id === selectedGenre);
      const energyObj = ENERGY_LEVELS.find(e => e.id === selectedEnergy);

      const generated = await generateDetailedBlockMusicPrompt({
        genre: genreObj?.label,
        tempoBpm,
        mood: selectedMood,
        keySignature: selectedKey,
        chordProgression,
        instruments: selectedInstruments,
        energyLevel: energyObj?.label,
        productionTags: selectedProductionTags,
        blockTitle,
        blockText,
        topic: scriptTopic
      }, { model: selectedModel });

      setCustomPrompt(generated);
      toast.success('ИИ сгенерировал детальный музыкальный промпт с тональностью и аккордами!');
    } catch (err) {
      logger.error(err);
      toast.error('Не удалось сгенерировать промпт.');
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Copy with formatting for Suno / Treblo / Udio
  const handleCopyPrompt = (platform: 'treblo' | 'suno' | 'udio') => {
    const promptToCopy = customPrompt || constructPromptFromSelections();
    let formatted = promptToCopy;

    if (platform === 'suno') {
      formatted = `[Style: ${promptToCopy}]`;
    } else if (platform === 'udio') {
      formatted = `${promptToCopy}, high quality audio, clean production`;
    }

    navigator.clipboard.writeText(formatted);
    setCopiedFormat(platform);
    toast.success(`Промпт скопирован в формате ${platform.toUpperCase()}!`);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  const handleApply = () => {
    const finalPrompt = customPrompt.trim() || constructPromptFromSelections();
    onApplyPrompt(blockIndex, finalPrompt);
    toast.success(`Музыкальный промпт сохранен для Блока #${blockIndex + 1}!`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div key="detailed-music-prompt-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-3xl bg-neutral-950 border border-purple-500/30 rounded-3xl p-6 shadow-2xl text-white my-8 space-y-6 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
                <Music size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Детальный музыкальный промпт (Music Prompt Builder)
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Блок #{blockIndex + 1}
                  </span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Конструктор звука для {blockTitle} • Настройка темпа, инструментов, атмосферы и сведение под голос
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 cursor-pointer transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {/* Builder Controls */}
          <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
            {/* 1. Genre Presets */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-1.5">
                <Disc size={13} className="text-purple-400" /> Жанр & Музыкальный Стиль:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {GENRE_PRESETS.map((g, gIdx) => (
                  <button
                    key={`genre-${g.id}-${gIdx}`}
                    onClick={() => {
                      setSelectedGenre(g.id);
                      setCustomPrompt(constructPromptFromSelections());
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedGenre === g.id
                        ? 'bg-purple-600/25 border-purple-500 text-white shadow-md shadow-purple-500/20'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <div className="text-xs font-bold truncate">{g.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Tempo BPM & Mood */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-neutral-900/60 p-4 rounded-2xl border border-neutral-800">
              {/* Tempo Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-1.5">
                    <Activity size={13} className="text-amber-400" /> Темп речи & ритм (BPM):
                  </label>
                  <span className="text-xs font-mono font-bold text-amber-400">{tempoBpm} BPM</span>
                </div>
                <input
                  type="range"
                  min="55"
                  max="160"
                  step="5"
                  value={tempoBpm}
                  onChange={(e) => {
                    setTempoBpm(Number(e.target.value));
                    setCustomPrompt(constructPromptFromSelections());
                  }}
                  className="w-full accent-amber-400 bg-neutral-800 h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-neutral-500 font-mono">
                  <span>60 (Largo)</span>
                  <span>75 (Andante)</span>
                  <span>95 (Moderato)</span>
                  <span>120+ (Allegro)</span>
                </div>
              </div>

              {/* Mood Selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-blue-400" /> Эмоция / Атмосфера:
                </label>
                <select
                  value={selectedMood}
                  onChange={(e) => {
                    setSelectedMood(e.target.value);
                    setCustomPrompt(constructPromptFromSelections());
                  }}
                  className="w-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 p-2.5 rounded-xl font-bold focus:outline-none focus:border-purple-500"
                >
                  {MOOD_PRESETS.map((m, mIdx) => (
                    <option key={`mood-${m}-${mIdx}`} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3. Key Signature & Chord Progression */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-neutral-900/60 p-4 rounded-2xl border border-neutral-800">
              {/* Tonality / Key Signature */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-1.5">
                  <Sliders size={13} className="text-purple-400" /> Тональность (Musical Key):
                </label>
                <select
                  value={selectedKey}
                  onChange={(e) => {
                    setSelectedKey(e.target.value);
                    setCustomPrompt(constructPromptFromSelections());
                  }}
                  className="w-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 p-2.5 rounded-xl font-bold focus:outline-none focus:border-purple-500"
                >
                  {KEY_SIGNATURE_OPTIONS.map((k, kIdx) => (
                    <option key={`key-${k}-${kIdx}`} value={k}>{k}</option>
                  ))}
                </select>
              </div>

              {/* Chord Progression */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-1.5">
                    <Layers size={13} className="text-indigo-400" /> Аккордовая последовательность:
                  </label>
                </div>
                <input
                  type="text"
                  value={chordProgression}
                  onChange={(e) => {
                    setChordProgression(e.target.value);
                    setCustomPrompt(constructPromptFromSelections());
                  }}
                  placeholder="напр. Am - F - C - G"
                  className="w-full bg-neutral-900 border border-neutral-800 text-xs text-indigo-300 font-mono p-2.5 rounded-xl focus:outline-none focus:border-purple-500"
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {CHORD_PROGRESSION_PRESETS.map((preset, pIdx) => (
                    <button
                      key={`chord-${preset}-${pIdx}`}
                      onClick={() => {
                        setChordProgression(preset);
                        setCustomPrompt(constructPromptFromSelections());
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all border ${
                        chordProgression === preset
                          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                          : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-neutral-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Instruments Multi-Select */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-1.5">
                <Music size={13} className="text-emerald-400" /> Состав инструментов (Instrumental Stack):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {INSTRUMENT_OPTIONS.map((inst, iIdx) => {
                  const isSelected = selectedInstruments.includes(inst);
                  return (
                    <button
                      key={`inst-${inst}-${iIdx}`}
                      onClick={() => {
                        toggleInstrument(inst);
                        setCustomPrompt(constructPromptFromSelections());
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+ '}
                      {inst}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Energy Level & Voiceover Production */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Energy Levels */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-1.5">
                  <Zap size={13} className="text-red-400" /> Уровень энергии / Динамика:
                </label>
                <div className="space-y-1.5">
                  {ENERGY_LEVELS.map((eng, eIdx) => (
                    <button
                      key={`energy-${eng.id}-${eIdx}`}
                      onClick={() => {
                        setSelectedEnergy(eng.id);
                        setCustomPrompt(constructPromptFromSelections());
                      }}
                      className={`w-full p-2 rounded-xl text-left text-xs font-bold transition-all border cursor-pointer ${
                        selectedEnergy === eng.id
                          ? 'bg-red-500/20 text-red-300 border-red-500/40'
                          : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                      }`}
                    >
                      {eng.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Production Tags */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-1.5">
                  <Volume2 size={13} className="text-cyan-400" /> Тэги сведения под диктора:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRODUCTION_TAG_OPTIONS.map((pt, ptIdx) => {
                    const isSelected = selectedProductionTags.includes(pt);
                    return (
                      <button
                        key={`prod-tag-${pt}-${ptIdx}`}
                        onClick={() => {
                          toggleProductionTag(pt);
                          setCustomPrompt(constructPromptFromSelections());
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                            : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {pt}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Live Prompt Box */}
            <div className="space-y-2 bg-neutral-900/90 p-4 rounded-2xl border border-purple-500/30">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-purple-300 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-purple-400" /> Итоговый англоязычный Music Prompt:
                </label>

                <button
                  onClick={handleAiGeneratePrompt}
                  disabled={isAiGenerating}
                  className="px-3 py-1 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {isAiGenerating ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  <span>✨ ИИ Синтез</span>
                </button>
              </div>

              <textarea
                value={customPrompt || constructPromptFromSelections()}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={3}
                className="w-full bg-black/80 p-3 rounded-xl border border-neutral-800 text-xs font-mono text-purple-200 leading-relaxed focus:outline-none focus:border-purple-400/60"
                placeholder="Сгенерированный музыкальный промпт..."
              />

              {/* Quick Copy Formats */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-neutral-800">
                <span className="text-[10px] text-neutral-500 font-bold">Экспорт для нейросетей:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleCopyPrompt('suno')}
                    className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedFormat === 'suno' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    Suno v4
                  </button>

                  <button
                    onClick={() => handleCopyPrompt('udio')}
                    className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedFormat === 'udio' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    Udio AI
                  </button>

                  <button
                    onClick={() => handleCopyPrompt('treblo')}
                    className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedFormat === 'treblo' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    Treblo
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-neutral-800 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs font-bold hover:bg-neutral-800 cursor-pointer transition-all"
            >
              Отмена
            </button>

            <button
              onClick={handleApply}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-purple-500/25 flex items-center gap-2 cursor-pointer transition-all"
            >
              <CheckCircle2 size={16} />
              <span>Сохранить промпт в Блок #{blockIndex + 1}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
