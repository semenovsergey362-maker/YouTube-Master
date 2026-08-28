import React from 'react';
import { Video, Music, Sparkles, Clock, Mic, Flame } from 'lucide-react';

export function BeautifulScriptRenderer({ scriptText }: { scriptText: string }) {
  if (!scriptText) {
    return <div className="text-neutral-500 text-xs italic">Нет сценария</div>;
  }

  // Split by newlines or literal \n sequences to get lines or paragraphs
  const paragraphs = scriptText.split(/\r?\n|\\n/);

  const renderedBlocks = paragraphs
    .map(p => p.trim())
    .filter(Boolean)
    .map((p, idx) => {
      // Detect block types
      const isCadr = p.startsWith('[КАДР:') || p.includes('[КАДР:');
      const isSound = p.startsWith('[ЗВУК:') || p.includes('[ЗВУК:');
      const isEffect = p.startsWith('[ЭФФЕКТ:') || p.includes('[ЭФФЕКТ:');

      if (isCadr) {
        // Extract content inside brackets
        const cleanText = p.replace(/^[\[\s]*КАДР:\s*/i, '').replace(/\]\s*$/, '');
        return (
          <div key={`bsr-block-cadr-${idx}`} className="my-3 bg-emerald-950/30 border border-emerald-500/20 rounded-2xl p-4 flex items-start gap-3 shadow-inner">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
              <Video size={15} />
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block">🎬 Кадр / Видеоряд</span>
              <p className="text-xs text-neutral-200 leading-relaxed font-sans font-medium">{cleanText}</p>
            </div>
          </div>
        );
      }

      if (isSound) {
        const cleanText = p.replace(/^[\[\s]*ЗВУК:\s*/i, '').replace(/\]\s*$/, '');
        return (
          <div key={`bsr-block-sound-${idx}`} className="my-3 bg-purple-950/30 border border-purple-500/20 rounded-2xl p-4 flex items-start gap-3 shadow-inner">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
              <Music size={15} />
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest block">🎵 Звуковой фон / SFX</span>
              <p className="text-xs text-neutral-200 leading-relaxed font-sans font-medium">{cleanText}</p>
            </div>
          </div>
        );
      }

      if (isEffect) {
        const cleanText = p.replace(/^[\[\s]*ЭФФЕКТ:\s*/i, '').replace(/\]\s*$/, '');
        return (
          <div key={`bsr-block-effect-${idx}`} className="my-3 bg-amber-950/30 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3 shadow-inner">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <Sparkles size={15} />
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block">⚡ Монтажный эффект</span>
              <p className="text-xs text-neutral-200 leading-relaxed font-sans font-medium">{cleanText}</p>
            </div>
          </div>
        );
      }

      // Normal Voiceover text block
      return (
        <div key={`bsr-block-voice-${idx}`} className="my-2.5 bg-neutral-900/40 border border-neutral-800/40 hover:border-neutral-800 transition-all p-4 rounded-2xl space-y-2.5 shadow-sm">
          <div className="flex items-center gap-1.5 text-[9px] font-black text-neutral-500 uppercase tracking-wider">
            <Mic size={11} className="text-primary animate-pulse" />
            <span>🗣️ Голос диктора / Озвучка</span>
          </div>
          <p className="text-xs sm:text-[13px] text-neutral-100 font-sans leading-relaxed whitespace-pre-wrap">
            {renderTokens(p)}
          </p>
        </div>
      );
    });

  return <div className="space-y-3 p-1">{renderedBlocks}</div>;
}

function renderTokens(text: string): React.ReactNode {
  // Regex to match tags in brackets [tag], parenthesis (tag), and bold/italics *text*
  const regex = /(\[[^\]]+\]|\([^)]+\)|\*[^*]+\*)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (index % 2 === 0) {
      return <span key={`bsr-part-${index}`}>{part}</span>;
    }

    // Brackets tag: [tag]
    if (part.startsWith('[') && part.endsWith(']')) {
      const content = part.slice(1, -1).trim();
      const lower = content.toLowerCase();

      if (lower === 'пауза') {
        return (
          <span key={`bsr-pause-${index}`} className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 rounded-full bg-neutral-800 border border-neutral-700 text-[10px] text-neutral-300 font-extrabold align-middle select-none shadow-sm">
            <Clock size={10} className="text-neutral-400 shrink-0" />
            <span>пауза</span>
          </span>
        );
      }
      if (lower === 'шёпот' || lower === 'шепот') {
        return (
          <span key={`bsr-whisper-${index}`} className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 rounded-full bg-sky-950/40 border border-sky-500/20 text-[10px] text-sky-300 font-extrabold align-middle select-none shadow-sm">
            🤫 шепот
          </span>
        );
      }
      if (lower.includes('ускорение') || lower.includes('темп') || lower.includes('быстрее')) {
        return (
          <span key={`bsr-faster-${index}`} className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 rounded-full bg-amber-950/40 border border-amber-500/20 text-[10px] text-amber-300 font-extrabold align-middle select-none shadow-sm">
            ⚡ быстрее
          </span>
        );
      }
      if (lower.includes('интрига')) {
        return (
          <span key={`bsr-intrigue-${index}`} className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 rounded-full bg-purple-950/40 border border-purple-500/20 text-[10px] text-purple-300 font-extrabold align-middle select-none shadow-sm">
            👀 интрига
          </span>
        );
      }

      // Default customized style tags
      return (
        <span key={`bsr-customtag-${index}`} className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 rounded-full bg-neutral-800/80 border border-neutral-700/50 text-[10px] text-neutral-400 font-bold align-middle select-none shadow-sm">
          🎭 {content}
        </span>
      );
    }

    // Parenthesis: (pause) or (!)
    if (part.startsWith('(') && part.endsWith(')')) {
      const content = part.slice(1, -1).trim();
      if (content === '!') {
        return (
          <span key={`bsr-accent-${index}`} className="inline-flex items-center gap-1.5 px-2 py-0.5 mx-1 rounded-full bg-red-950/50 border border-red-500/30 text-[10px] text-red-300 font-black align-middle select-none shadow-sm animate-pulse">
            <Flame size={10} className="text-red-400 fill-red-400/20" />
            <span>АКЦЕНТ</span>
          </span>
        );
      }
      if (/^\d+(ms|s|мс|с)$/i.test(content)) {
        const display = content.replace(/ms/i, ' мс').replace(/s/i, ' с');
        return (
          <span key={`bsr-pause-paren-${index}`} className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 rounded-full bg-neutral-800 border border-neutral-700 text-[10px] text-neutral-300 font-extrabold align-middle select-none shadow-sm">
            <Clock size={10} className="text-neutral-400 shrink-0" />
            <span>{display}</span>
          </span>
        );
      }

      return (
        <span key={`bsr-paren-${index}`} className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 rounded-full bg-neutral-800/40 border border-neutral-700/30 text-[10px] text-neutral-400 align-middle select-none">
          {part}
        </span>
      );
    }

    // Star formatting: *emphasis*
    if (part.startsWith('*') && part.endsWith('*')) {
      const content = part.slice(1, -1);
      return (
        <span key={`bsr-emph-${index}`} className="text-amber-300 italic font-black bg-amber-500/5 border-b-2 border-amber-500/30 px-1 py-0.5 rounded-md mx-0.5 select-all">
          {content}
        </span>
      );
    }

    return <span key={`bsr-part-${index}`}>{part}</span>;
  });
}
