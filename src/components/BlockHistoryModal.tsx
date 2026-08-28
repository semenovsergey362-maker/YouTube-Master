import React, { useState } from 'react';
import { diffWords, Change } from 'diff';
import { 
  Clock, 
  RotateCcw, 
  History, 
  Plus, 
  Minus,
  Trash2,
  Trash,
} from 'lucide-react';
import { toast } from 'sonner';
import { BaseModal } from './common/BaseModal';
import { CopyButton } from './common/CopyButton';
import { EmptyState } from './common/EmptyState';

export interface BlockIteration {
  id: string;
  timestamp: number;
  text: string;
  source?: string;
  mood?: string;
}

interface BlockHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  blockIndex: number;
  blockTitle: string;
  currentText: string;
  iterations: BlockIteration[];
  onRestoreIteration: (iteration: BlockIteration) => void;
  onDeleteIteration?: (iterationId: string) => void;
  onClearAllIterations?: () => void;
}

export const BlockHistoryModal: React.FC<BlockHistoryModalProps> = ({
  isOpen,
  onClose,
  blockIndex,
  blockTitle,
  currentText,
  iterations = [],
  onRestoreIteration,
  onDeleteIteration,
  onClearAllIterations,
}) => {
  const [selectedIterationId, setSelectedIterationId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState<boolean>(false);

  if (!isOpen) return null;

  // Combine iterations with currentText if currentText isn't already the last iteration
  const sortedIterations = [...iterations].sort((a, b) => b.timestamp - a.timestamp);
  
  // Default selected to the most recent previous iteration or first
  const activeIteration = sortedIterations.find((it) => it.id === selectedIterationId) || sortedIterations[0];

  // Calculate word diff between activeIteration and currentText
  const diffChanges: Change[] = activeIteration
    ? diffWords(activeIteration.text || '', currentText || '')
    : [];

  let addedWords = 0;
  let removedWords = 0;
  diffChanges.forEach((change) => {
    const wordCount = change.value.trim() ? change.value.trim().split(/\s+/).length : 0;
    if (change.added) addedWords += wordCount;
    if (change.removed) removedWords += wordCount;
  });

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`История итераций: ${blockTitle}`}
      subtitle="Просмотр прошлых регенерированных версий блока с возможностью отката"
      icon={History}
      iconClassName="text-amber-400"
      maxWidth="4xl"
      footer={
        <button
          onClick={onClose}
          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
        >
          Закрыть
        </button>
      }
    >
      {sortedIterations.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="История изменений этого блока пуста"
          description="Каждая повторная генерация, переработка или применение стиля AI для этого блока будет автоматически сохраняться в историю итераций."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Timeline list of iterations */}
          <div className="lg:col-span-5 space-y-2.5 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
            <div className="flex items-center justify-between mb-2 pb-1">
              <p className="text-[10px] text-neutral-500 font-extrabold uppercase tracking-wider">
                Все сохраненные версии ({sortedIterations.length})
              </p>
              {onClearAllIterations && sortedIterations.length > 0 && (
                <div className="flex items-center gap-1.5">
                  {confirmClear ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          onClearAllIterations();
                          setConfirmClear(false);
                        }}
                        className="text-[10px] font-bold text-white bg-red-600 hover:bg-red-700 transition-colors px-2 py-1 rounded-lg cursor-pointer"
                      >
                        Уверены?
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClear(false)}
                        className="text-[10px] font-bold text-neutral-400 hover:text-neutral-200 bg-neutral-800 px-2 py-1 rounded-lg cursor-pointer"
                      >
                        Отмена
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmClear(true)}
                      className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 cursor-pointer bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1 rounded-lg border border-red-500/20"
                      title="Очистить всю историю итераций для этого блока"
                    >
                      <Trash size={10} />
                      Очистить всё
                    </button>
                  )}
                </div>
              )}
            </div>

            {sortedIterations.map((it, idx) => {
              const isSelected = activeIteration?.id === it.id;
              const wordCount = it.text.trim() ? it.text.trim().split(/\s+/).length : 0;
              const isCurrentMatch = it.text === currentText;

              return (
                <button
                  key={`iter-${it.id ?? 'item'}-${idx}`}
                  onClick={() => setSelectedIterationId(it.id)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/5'
                      : 'bg-neutral-900/80 hover:bg-neutral-900 border-neutral-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        isSelected ? 'bg-amber-500 text-black' : 'bg-neutral-800 text-neutral-300'
                      }`}>
                        #{sortedIterations.length - idx}
                      </span>
                      <span className="text-xs font-bold text-neutral-200">
                        {it.source || 'Генерация ИИ'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isCurrentMatch && (
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-extrabold">
                          Текущий
                        </span>
                      )}
                      {onDeleteIteration && (
                        <span
                          role="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteIteration(it.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-500 hover:text-red-500 transition-colors cursor-pointer"
                          title="Удалить эту итерацию"
                        >
                          <Trash2 size={12} />
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-neutral-400 line-clamp-2 italic font-sans">
                    "{it.text}"
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-1 border-t border-neutral-800/60">
                    <span>🕒 {new Date(it.timestamp).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit' })}</span>
                    <span>{wordCount} слов</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Selected Iteration Preview & Diff */}
          <div className="lg:col-span-7 space-y-4">
            {activeIteration && (
              <div className="bg-neutral-900/90 p-5 rounded-2xl border border-neutral-800 space-y-4">
                {/* Iteration Header Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-neutral-800">
                  <div>
                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">Выбранная итерация</span>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
                      {activeIteration.source || 'Версия блока'}
                      <span className="text-xs font-normal text-neutral-400">
                        ({new Date(activeIteration.timestamp).toLocaleTimeString('ru-RU')})
                      </span>
                    </h4>
                  </div>

                  <div className="flex items-center gap-2">
                    {addedWords > 0 && (
                      <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <Plus size={11} />+{addedWords}
                      </span>
                    )}
                    {removedWords > 0 && (
                      <span className="text-[10px] font-bold bg-red-500/10 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <Minus size={11} />-{removedWords}
                      </span>
                    )}
                  </div>
                </div>

                {/* Diff Preview Box */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-neutral-400">
                    <span className="font-semibold text-neutral-300">Сравнение с текущим текстом:</span>
                    <span className="text-[10px] text-neutral-500">
                      <span className="bg-red-500/20 text-red-300 px-1 rounded line-through">Красный</span> = в итерации, <span className="bg-emerald-500/20 text-emerald-300 px-1 rounded font-semibold">Зеленый</span> = в редакторе
                    </span>
                  </div>

                  <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 text-xs text-neutral-200 leading-relaxed font-sans max-h-[220px] overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                    {diffChanges.map((change, i) => {
                      const diffKey = `diff-${i}-${change.added ? 'add' : change.removed ? 'rem' : 'same'}`;
                      if (change.added) {
                        return (
                          <mark
                            key={diffKey}
                            className="bg-emerald-500/25 text-emerald-200 font-semibold px-1 py-0.5 rounded mx-0.5 border border-emerald-500/40 inline-block"
                            title="Новый текст в текущей версии"
                          >
                            {change.value}
                          </mark>
                        );
                      }
                      if (change.removed) {
                        return (
                          <mark
                            key={diffKey}
                            className="bg-red-500/25 text-red-200 line-through px-1 py-0.5 rounded mx-0.5 border border-red-500/40 inline-block"
                            title="Текст из выбранной итерации"
                          >
                            {change.value}
                          </mark>
                        );
                      }
                      return <span key={diffKey}>{change.value}</span>;
                    })}
                  </div>
                </div>

                {/* Full Raw Text Box */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Чистый текст итерации:</span>
                  <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-800/80 text-xs text-neutral-300 font-mono leading-relaxed max-h-[120px] overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                    {activeIteration.text}
                  </div>
                </div>

                {/* Action Bar */}
                <div className="pt-3 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-2">
                  <CopyButton 
                    textToCopy={activeIteration.text}
                    label="Копировать"
                    size="md"
                    variant="outline"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      onRestoreIteration(activeIteration);
                      toast.success(`Версия блока восстанавливается!`);
                      onClose();
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 hover:brightness-110 transition-all cursor-pointer"
                  >
                    <RotateCcw size={14} />
                    Восстановить эту итерацию
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </BaseModal>
  );
};
