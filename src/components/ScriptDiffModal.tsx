import React, { useState, useMemo } from 'react';
import { diffWords, diffLines, Change } from 'diff';
import { 
  X, 
  GitCompare, 
  ArrowLeftRight, 
  Check, 
  Copy, 
  Clock, 
  RotateCcw, 
  FileText, 
  Columns, 
  AlignLeft, 
  Layers, 
  Plus, 
  Minus,
  Sparkles,
  Info,
  Trash2,
  Trash
} from 'lucide-react';
import { toast } from 'sonner';
import { getFullScriptText, copyToClipboard } from '../utils/helpers';

interface ScriptVersion {
  id: string;
  name: string;
  timestamp: number;
  blocks?: Record<number, any>;
  structure?: any[];
  scriptTopic?: string;
  scriptWishes?: string;
  createdAt?: string;
}

interface ScriptDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  versions: ScriptVersion[];
  currentBlocks: Record<number, any>;
  currentStructure: any[];
  currentTopic?: string;
  activeVersionId?: string | null;
  onLoadVersion: (version: any) => void;
  initialVersionAId?: string;
  initialVersionBId?: string;
  onDeleteVersion?: (id: string) => Promise<void> | void;
}

export const ScriptDiffModal: React.FC<ScriptDiffModalProps> = ({
  isOpen,
  onClose,
  versions,
  currentBlocks,
  currentStructure,
  currentTopic,
  activeVersionId,
  onLoadVersion,
  initialVersionAId = 'current',
  initialVersionBId,
  onDeleteVersion,
}) => {
  // Version Selection State
  const [versionAId, setVersionAId] = useState<string>(initialVersionAId || 'current');
  const [versionBId, setVersionBId] = useState<string>(() => {
    if (initialVersionBId) return initialVersionBId;
    if (versions.length > 0) return versions[0].id;
    return 'current';
  });
  const [confirmDeleteAId, setConfirmDeleteAId] = useState<string | null>(null);
  const [confirmDeleteBId, setConfirmDeleteBId] = useState<string | null>(null);

  // Display Mode: 'inline' | 'sideBySide' | 'blocks'
  const [diffMode, setDiffMode] = useState<'inline' | 'sideBySide' | 'blocks'>('inline');
  // Diff Level: 'words' | 'lines'
  const [granularity, setGranularity] = useState<'words' | 'lines'>('words');

  // React to prop changes when modal opens
  React.useEffect(() => {
    if (isOpen) {
      if (initialVersionAId) setVersionAId(initialVersionAId);
      if (initialVersionBId) {
        setVersionBId(initialVersionBId);
      } else if (versions.length > 0) {
        // Default B to first saved version if A is current, or current if A is first version
        if (initialVersionAId === 'current' || !initialVersionAId) {
          setVersionBId(versions[0].id);
        } else {
          setVersionBId('current');
        }
      }
    }
  }, [isOpen, initialVersionAId, initialVersionBId, versions]);

  if (!isOpen) return null;

  // Helper to extract full text & blocks payload for a given version ID
  const getVersionPayload = (id: string) => {
    if (id === 'current') {
      return {
        id: 'current',
        name: 'Текущий черновик',
        timestamp: Date.now(),
        text: getFullScriptText(currentBlocks),
        blocks: currentBlocks,
        structure: currentStructure,
        isCurrent: true,
      };
    }
    const found = versions.find((v) => v.id === id);
    if (!found) {
      return {
        id: 'unknown',
        name: 'Неизвестная версия',
        timestamp: Date.now(),
        text: '',
        blocks: {},
        structure: [],
        isCurrent: false,
      };
    }
    return {
      ...found,
      text: getFullScriptText(found.blocks || {}),
      isCurrent: activeVersionId === found.id,
    };
  };

  const payloadA = getVersionPayload(versionAId);
  const payloadB = getVersionPayload(versionBId);

  // Compute Word & Line Diffs
  const diffChanges: Change[] = useMemo(() => {
    const textA = payloadA.text || '';
    const textB = payloadB.text || '';
    if (granularity === 'lines') {
      return diffLines(textA, textB);
    }
    return diffWords(textA, textB);
  }, [payloadA.text, payloadB.text, granularity]);

  // Compute Statistics
  const stats = useMemo(() => {
    let addedWords = 0;
    let removedWords = 0;
    let unchangedWords = 0;

    diffChanges.forEach((change) => {
      const wordCount = change.value.trim() ? change.value.trim().split(/\s+/).length : 0;
      if (change.added) {
        addedWords += wordCount;
      } else if (change.removed) {
        removedWords += wordCount;
      } else {
        unchangedWords += wordCount;
      }
    });

    const totalWordsA = payloadA.text.trim() ? payloadA.text.trim().split(/\s+/).length : 0;
    const totalWordsB = payloadB.text.trim() ? payloadB.text.trim().split(/\s+/).length : 0;

    const totalChanges = addedWords + removedWords;
    const similarityPercent = totalWordsA + totalWordsB > 0
      ? Math.max(0, Math.round(((unchangedWords * 2) / (totalWordsA + totalWordsB)) * 100))
      : 100;

    return {
      addedWords,
      removedWords,
      unchangedWords,
      totalWordsA,
      totalWordsB,
      totalChanges,
      similarityPercent,
    };
  }, [diffChanges, payloadA.text, payloadB.text]);

  // Swap Version A and Version B
  const handleSwap = () => {
    const temp = versionAId;
    setVersionAId(versionBId);
    setVersionBId(temp);
  };

  // Copy Diff Report to Clipboard
  const handleCopyDiffReport = () => {
    const header = `=== СРАВНЕНИЕ ВЕРСИЙ СЦЕНАРИЯ ===\nВерсия A: ${payloadA.name}\nВерсия B: ${payloadB.name}\nСходство: ${stats.similarityPercent}%\nДобавлено слов: +${stats.addedWords}\nУдалено слов: -${stats.removedWords}\n\n=== ДЕТАЛИЗИРОВАННЫЙ DIFF ===\n`;
    
    let diffText = '';
    diffChanges.forEach((change) => {
      if (change.added) {
        diffText += `[+ ${change.value.replace(/\n/g, '\n+ ')}]`;
      } else if (change.removed) {
        diffText += `[- ${change.value.replace(/\n/g, '\n- ')}]`;
      } else {
        diffText += change.value;
      }
    });

    copyToClipboard(header + diffText);
    toast.success('Отчёт о сравнении скопирован в буфер обмена!');
  };

  // Block-by-Block Comparison computation
  const blockComparison = useMemo(() => {
    const structA = payloadA.structure || [];
    const structB = payloadB.structure || [];
    const maxLen = Math.max(structA.length, structB.length, 6);

    const result = [];
    for (let i = 0; i < maxLen; i++) {
      const itemA = structA[i];
      const itemB = structB[i];
      const textA = payloadA.blocks?.[i]?.text || '';
      const textB = payloadB.blocks?.[i]?.text || '';

      if (!itemA && !itemB && !textA && !textB) continue;

      const titleA = itemA?.title || `Блок ${i + 1}`;
      const titleB = itemB?.title || `Блок ${i + 1}`;

      const blockDiff = diffWords(textA, textB);
      const isIdentical = textA === textB;
      const isNewInB = !textA && textB;
      const isRemovedInB = textA && !textB;

      result.push({
        index: i,
        titleA,
        titleB,
        textA,
        textB,
        blockDiff,
        isIdentical,
        isNewInB,
        isRemovedInB,
      });
    }
    return result;
  }, [payloadA, payloadB]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 bg-neutral-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
              <GitCompare size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                Сравнение версий сценария
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-primary/20 text-primary border border-primary/30 font-bold uppercase">
                  Diff Tool
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                Наглядный просмотр изменений между двумя версиями с подсветкой добавлений и удалений
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl border border-neutral-800 transition-all cursor-pointer self-end sm:self-auto"
          >
            <X size={18} />
          </button>
        </div>

        {/* Version Selector Bar */}
        <div className="p-4 bg-neutral-950/60 border-b border-neutral-800 grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-3 items-center shrink-0">
          
          {/* Version A Selector */}
          <div className="space-y-1.5 bg-neutral-900/80 p-3 rounded-2xl border border-red-500/20">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                Версия A (Исходная / Базовая)
              </label>
              <div className="flex items-center gap-1.5">
                {payloadA.isCurrent && (
                  <span className="px-2 py-0.5 rounded text-[9px] bg-red-500/20 text-red-300 font-extrabold">
                    Активный редактор
                  </span>
                )}
                {versionAId !== 'current' && onDeleteVersion && (
                  confirmDeleteAId === versionAId ? (
                    <div className="flex items-center gap-1 bg-red-950/80 border border-red-500/30 rounded-lg p-0.5 px-1.5">
                      <span className="text-[9px] text-red-200 font-bold">Удалить?</span>
                      <button
                        type="button"
                        onClick={async () => {
                          await onDeleteVersion(versionAId);
                          setConfirmDeleteAId(null);
                          setVersionAId('current');
                        }}
                        className="text-[9px] font-bold text-red-400 hover:text-red-300 px-1 hover:underline cursor-pointer"
                      >
                        Да
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteAId(null)}
                        className="text-[9px] font-bold text-neutral-400 hover:text-neutral-300 px-1 hover:underline cursor-pointer"
                      >
                        Нет
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteAId(versionAId)}
                      className="p-1 rounded bg-neutral-950 hover:bg-red-500/20 text-neutral-400 hover:text-red-500 border border-neutral-800 transition-colors cursor-pointer"
                      title="Удалить эту сохраненную версию"
                    >
                      <Trash2 size={11} />
                    </button>
                  )
                )}
              </div>
            </div>

            <select
              value={versionAId}
              onChange={(e) => setVersionAId(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-red-500 cursor-pointer"
            >
              <option value="current">
                📝 Текущий черновик ({getFullScriptText(currentBlocks).trim().split(/\s+/).filter(Boolean).length} слов)
              </option>
              {versions.map((v, idx) => (
                <option key={`opt-va-${v.id ?? 'ver'}-${idx}`} value={v.id}>
                  📜 {v.name} ({new Date(v.timestamp).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })})
                </option>
              ))}
            </select>

            <div className="text-[10px] text-neutral-500 flex items-center justify-between">
              <span>Слов: <strong className="text-neutral-300">{stats.totalWordsA}</strong></span>
              <span>🕒 {new Date(payloadA.timestamp).toLocaleString('ru-RU')}</span>
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleSwap}
              className="p-3 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-2xl border border-neutral-800 transition-all cursor-pointer shadow-md group"
              title="Поменять версии местами"
            >
              <ArrowLeftRight size={16} className="group-hover:scale-110 transition-transform" />
            </button>
          </div>

          {/* Version B Selector */}
          <div className="space-y-1.5 bg-neutral-900/80 p-3 rounded-2xl border border-emerald-500/20">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                Версия B (Новая / Сравниваемая)
              </label>
              <div className="flex items-center gap-1.5">
                {payloadB.isCurrent && (
                  <span className="px-2 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-300 font-extrabold">
                    Активный редактор
                  </span>
                )}
                {versionBId !== 'current' && onDeleteVersion && (
                  confirmDeleteBId === versionBId ? (
                    <div className="flex items-center gap-1 bg-red-950/80 border border-red-500/30 rounded-lg p-0.5 px-1.5">
                      <span className="text-[9px] text-red-200 font-bold">Удалить?</span>
                      <button
                        type="button"
                        onClick={async () => {
                          await onDeleteVersion(versionBId);
                          setConfirmDeleteBId(null);
                          setVersionBId(versions.find(v => v.id !== versionBId)?.id || 'current');
                        }}
                        className="text-[9px] font-bold text-red-400 hover:text-red-300 px-1 hover:underline cursor-pointer"
                      >
                        Да
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteBId(null)}
                        className="text-[9px] font-bold text-neutral-400 hover:text-neutral-300 px-1 hover:underline cursor-pointer"
                      >
                        Нет
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteBId(versionBId)}
                      className="p-1 rounded bg-neutral-950 hover:bg-red-500/20 text-neutral-400 hover:text-red-500 border border-neutral-800 transition-colors cursor-pointer"
                      title="Удалить эту сохраненную версию"
                    >
                      <Trash2 size={11} />
                    </button>
                  )
                )}
              </div>
            </div>

            <select
              value={versionBId}
              onChange={(e) => setVersionBId(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="current">
                📝 Текущий черновик ({getFullScriptText(currentBlocks).trim().split(/\s+/).filter(Boolean).length} слов)
              </option>
              {versions.map((v, idx) => (
                <option key={`opt-vb-${v.id ?? 'ver'}-${idx}`} value={v.id}>
                  📜 {v.name} ({new Date(v.timestamp).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })})
                </option>
              ))}
            </select>

            <div className="text-[10px] text-neutral-500 flex items-center justify-between">
              <span>Слов: <strong className="text-neutral-300">{stats.totalWordsB}</strong></span>
              <span>🕒 {new Date(payloadB.timestamp).toLocaleString('ru-RU')}</span>
            </div>
          </div>

        </div>

        {/* Toolbar & Summary Stats */}
        <div className="p-4 bg-neutral-950/40 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          
          {/* Stats Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center gap-1.5">
              <span className="text-neutral-400 font-medium">Сходство:</span>
              <span className={`font-black ${stats.similarityPercent > 80 ? 'text-emerald-400' : stats.similarityPercent > 40 ? 'text-amber-400' : 'text-red-400'}`}>
                {stats.similarityPercent}%
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-1 font-bold">
              <Plus size={13} />
              <span>+{stats.addedWords} слов</span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 flex items-center gap-1 font-bold">
              <Minus size={13} />
              <span>-{stats.removedWords} слов</span>
            </div>

            {stats.totalChanges === 0 && (
              <span className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 font-semibold text-xs flex items-center gap-1">
                <Check size={13} /> Тексты полностью идентичны
              </span>
            )}
          </div>

          {/* View Controls & Granularity */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Granularity Toggle */}
            <div className="bg-neutral-900 p-1 rounded-xl border border-neutral-800 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setGranularity('words')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  granularity === 'words'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                По словам
              </button>
              <button
                type="button"
                onClick={() => setGranularity('lines')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  granularity === 'lines'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                По строкам
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="bg-neutral-900 p-1 rounded-xl border border-neutral-800 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setDiffMode('inline')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  diffMode === 'inline'
                    ? 'bg-primary text-black shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <AlignLeft size={13} />
                <span>Объединённый</span>
              </button>

              <button
                type="button"
                onClick={() => setDiffMode('sideBySide')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  diffMode === 'sideBySide'
                    ? 'bg-primary text-black shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Columns size={13} />
                <span>Параллельный</span>
              </button>

              <button
                type="button"
                onClick={() => setDiffMode('blocks')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  diffMode === 'blocks'
                    ? 'bg-primary text-black shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Layers size={13} />
                <span>По блокам</span>
              </button>
            </div>

          </div>

        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto custom-scrollbar bg-neutral-950/90 font-sans">
          
          {/* MODE 1: INLINE DIFF */}
          {diffMode === 'inline' && (
            <div className="p-5 bg-neutral-900/60 rounded-2xl border border-neutral-800 space-y-4">
              <div className="flex items-center justify-between text-xs text-neutral-400 pb-3 border-b border-neutral-800/80">
                <span className="font-bold flex items-center gap-1.5">
                  <Info size={14} className="text-primary" />
                  Легенда: <span className="bg-red-500/20 text-red-300 line-through px-1.5 py-0.5 rounded font-mono text-[11px] border border-red-500/30">Красный</span> — удалено из Версии A; <span className="bg-emerald-500/20 text-emerald-300 font-semibold px-1.5 py-0.5 rounded font-mono text-[11px] border border-emerald-500/30">Зелёный</span> — добавлено в Версию B.
                </span>
              </div>

              {!payloadA.text && !payloadB.text ? (
                <div className="text-center py-12 text-neutral-500 text-xs">
                  Обе версии пусты. Нечего сравнивать.
                </div>
              ) : (
                <div className="text-sm leading-relaxed text-neutral-300 whitespace-pre-wrap font-sans p-4 bg-neutral-950 rounded-xl border border-neutral-800/80">
                  {diffChanges.map((change, idx) => {
                    if (change.added) {
                      return (
                        <mark key={`diff-added-unified-${idx}`} className="bg-emerald-500/25 text-emerald-200 font-semibold px-1 py-0.5 rounded mx-0.5 border border-emerald-500/40 inline-block"
                          title="Добавлено в Версию B"
                        >
                          {change.value}
                        </mark>
                      );
                    }
                    if (change.removed) {
                      return (
                        <mark key={`diff-removed-unified-${idx}`} className="bg-red-500/25 text-red-200 line-through px-1 py-0.5 rounded mx-0.5 border border-red-500/40 inline-block"
                          title="Удалено из Версии A"
                        >
                          {change.value}
                        </mark>
                      );
                    }
                    return <span key={`diff-same-unified-${idx}`}>{change.value}</span>;
                  })}
                </div>
              )}
            </div>
          )}

          {/* MODE 2: SIDE BY SIDE DIFF */}
          {diffMode === 'sideBySide' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Left Column: Version A */}
              <div className="bg-neutral-900/60 p-4 rounded-2xl border border-red-500/20 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                  <h4 className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                    Версия A: {payloadA.name}
                  </h4>
                  <span className="text-[10px] text-neutral-500">{stats.totalWordsA} слов</span>
                </div>

                <div className="text-xs leading-relaxed text-neutral-300 whitespace-pre-wrap font-sans p-3 bg-neutral-950 rounded-xl border border-neutral-800/80 min-h-[300px]">
                  {diffChanges.map((change, idx) => {
                    if (change.added) return null; // Don't show added text in Version A
                    if (change.removed) {
                      return (
                        <mark key={`diff-removed-a-${idx}`} className="bg-red-500/30 text-red-200 line-through px-1 py-0.5 rounded mx-0.5 border border-red-500/40 inline-block font-medium"
                        >
                          {change.value}
                        </mark>
                      );
                    }
                    return <span key={`diff-same-a-${idx}`}>{change.value}</span>;
                  })}
                </div>
              </div>

              {/* Right Column: Version B */}
              <div className="bg-neutral-900/60 p-4 rounded-2xl border border-emerald-500/20 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                  <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                    Версия B: {payloadB.name}
                  </h4>
                  <span className="text-[10px] text-neutral-500">{stats.totalWordsB} слов</span>
                </div>

                <div className="text-xs leading-relaxed text-neutral-300 whitespace-pre-wrap font-sans p-3 bg-neutral-950 rounded-xl border border-neutral-800/80 min-h-[300px]">
                  {diffChanges.map((change, idx) => {
                    if (change.removed) return null; // Don't show removed text in Version B
                    if (change.added) {
                      return (
                        <mark
                          key={`diff-added-b-${idx}`}
                          className="bg-emerald-500/30 text-emerald-200 font-semibold px-1 py-0.5 rounded mx-0.5 border border-emerald-500/40 inline-block"
                        >
                          {change.value}
                        </mark>
                      );
                    }
                    return <span key={`diff-same-b-${idx}`}>{change.value}</span>;
                  })}
                </div>

              </div>

            </div>
          )}

          {/* MODE 3: BLOCK BY BLOCK DIFF */}
          {diffMode === 'blocks' && (
            <div className="space-y-4">
              {blockComparison.map((block, blockIdx) => {
                return (
                  <div
                    key={`diff-block-${block.index ?? "block"}-${blockIdx}`}
                    className="p-4 bg-neutral-900/60 rounded-2xl border border-neutral-800 space-y-3"
                  >
                    {/* Block Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-neutral-800 text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                          {block.index + 1}
                        </span>
                        <h4 className="text-xs font-bold text-white">
                          {block.titleA} {block.titleA !== block.titleB ? `➔ ${block.titleB}` : ''}
                        </h4>
                      </div>

                      {block.isIdentical ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-neutral-800 text-neutral-400 font-bold border border-neutral-700">
                          Без изменений
                        </span>
                      ) : block.isNewInB ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                          + Новый блок в B
                        </span>
                      ) : block.isRemovedInB ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-red-500/20 text-red-300 font-bold border border-red-500/30">
                          - Удалённый блок в B
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                          ⚡ Изменён
                        </span>
                      )}
                    </div>

                    {/* Block Content Diff */}
                    <div className="text-xs leading-relaxed text-neutral-300 whitespace-pre-wrap font-sans p-3 bg-neutral-950 rounded-xl border border-neutral-800/80">
                      {block.blockDiff.map((change, idx) => {
                        if (change.added) {
                          return (
                            <mark
                              key={`diff-block-added-${blockIdx}-${idx}`}
                              className="bg-emerald-500/25 text-emerald-200 font-semibold px-1 py-0.5 rounded mx-0.5 border border-emerald-500/40"
                            >
                              {change.value}
                            </mark>
                          );
                        }
                        if (change.removed) {
                          return (
                            <mark key={`diff-block-removed-${blockIdx}-${idx}`} className="bg-red-500/25 text-red-200 line-through px-1 py-0.5 rounded mx-0.5 border border-red-500/40"
                            >
                              {change.value}
                            </mark>
                          );
                        }
                        return <span key={`diff-block-same-${blockIdx}-${idx}`}>{change.value}</span>;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          
          <button
            type="button"
            onClick={handleCopyDiffReport}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-xl text-xs font-bold border border-neutral-800 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Copy size={14} />
            Скопировать Diff-отчёт
          </button>

          <div className="flex flex-wrap items-center gap-2">
            
            <button
              type="button"
              onClick={() => {
                onLoadVersion(payloadA);
                onClose();
              }}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw size={14} />
              Загрузить Версию A в редактор
            </button>

            <button
              type="button"
              onClick={() => {
                onLoadVersion(payloadB);
                onClose();
              }}
              className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw size={14} />
              Загрузить Версию B в редактор
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Закрыть
            </button>

          </div>

        </div>

      </div>
    </div>
  );
};
