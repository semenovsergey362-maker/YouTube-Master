import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock,
  RotateCcw,
  GitCompare,
  Edit3,
  Trash2,
  CheckCircle2,
  Plus,
  Search,
  MessageSquare,
  FileText,
  Save,
  Cloud,
  Layers,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
  Info,
  Calendar,
  Tag
} from 'lucide-react';
import { toast } from 'sonner';

export interface ScriptVersion {
  id: string;
  name: string;
  timestamp: number;
  blocks?: Record<number, any>;
  structure?: any[];
  scriptTopic?: string;
  scriptWishes?: string;
  createdAt?: string;
  changeSummary?: string;
}

interface ScriptTimelineProps {
  versions: ScriptVersion[];
  activeVersionId: string | null;
  currentBlocks: Record<number, any>;
  currentStructure: any[];
  currentTopic?: string;
  isSavingToFirebase?: boolean;
  lastFirebaseSave?: Date | null;
  onSaveVersion: (name?: string, changeSummary?: string) => void;
  onLoadVersion: (version: ScriptVersion) => void;
  onDeleteVersion: (id: string) => void;
  onRenameVersion: (id: string, newName: string) => void;
  onUpdateChangeSummary?: (id: string, newSummary: string) => void;
  onOpenDiffModal: (versionAId?: string, versionBId?: string) => void;
}

export function generateVersionChangeSummary(
  current: ScriptVersion,
  previous?: ScriptVersion
): string {
  if (current.changeSummary && current.changeSummary.trim()) {
    return current.changeSummary;
  }

  if (!previous) {
    const totalBlocks = current.blocks ? Object.keys(current.blocks).length : (current.structure?.length || 0);
    return `Первоначальная генерация сценария (${totalBlocks} блоков)`;
  }

  const currBlocks = current.blocks || {};
  const prevBlocks = previous.blocks || {};

  const currKeys = Object.keys(currBlocks).map(Number);
  const prevKeys = Object.keys(prevBlocks).map(Number);

  const added = currKeys.filter((k) => !(k in prevBlocks));
  const removed = prevKeys.filter((k) => !(k in currBlocks));

  const modified: number[] = [];
  currKeys.forEach((k) => {
    if (k in prevBlocks) {
      const cText = (currBlocks[k]?.text || '').trim();
      const pText = (prevBlocks[k]?.text || '').trim();
      if (cText !== pText) {
        modified.push(k);
      }
    }
  });

  const changes: string[] = [];

  if (added.length > 0) {
    if (added.length === 1) {
      changes.push(`Добавлен блок №${added[0] + 1}`);
    } else {
      changes.push(`Добавлено блоков: ${added.length} (№${added.map((i) => i + 1).join(', №')})`);
    }
  }

  if (removed.length > 0) {
    if (removed.length === 1) {
      changes.push(`Удален блок №${removed[0] + 1}`);
    } else {
      changes.push(`Удалено блоков: ${removed.length}`);
    }
  }

  if (modified.length > 0) {
    if (modified.length === 1) {
      changes.push(`Изменен блок №${modified[0] + 1}`);
    } else {
      changes.push(`Правки в блоках №${modified.map((i) => i + 1).join(', №')}`);
    }
  }

  if (current.scriptTopic && previous.scriptTopic && current.scriptTopic !== previous.scriptTopic) {
    changes.push(`Обновлена тема: "${current.scriptTopic}"`);
  }

  if (changes.length === 0) {
    return 'Автосохранение среза без крупных изменений';
  }

  return changes.join('; ');
}

export const ScriptTimeline: React.FC<ScriptTimelineProps> = ({
  versions = [],
  activeVersionId,
  currentBlocks,
  currentStructure,
  currentTopic,
  isSavingToFirebase = false,
  lastFirebaseSave,
  onSaveVersion,
  onLoadVersion,
  onDeleteVersion,
  onRenameVersion,
  onUpdateChangeSummary,
  onOpenDiffModal
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNoteText, setTempNoteText] = useState('');
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [tempNameText, setTempNameText] = useState('');

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newVersionName, setNewVersionName] = useState('');
  const [newVersionNote, setNewVersionNote] = useState('');

  // Versions sorted chronologically descending (newest first)
  const sortedVersions = React.useMemo(() => {
    return [...versions].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [versions]);

  // Filtered by search query
  const filteredVersions = React.useMemo(() => {
    if (!searchQuery.trim()) return sortedVersions;
    const q = searchQuery.toLowerCase();
    return sortedVersions.filter((v) => {
      const nameMatch = v.name?.toLowerCase().includes(q);
      const summaryMatch = v.changeSummary?.toLowerCase().includes(q);
      const topicMatch = v.scriptTopic?.toLowerCase().includes(q);
      const contentMatch = v.blocks && Object.values(v.blocks).some((b: any) =>
        b?.text?.toLowerCase().includes(q) || b?.title?.toLowerCase().includes(q)
      );
      return nameMatch || summaryMatch || topicMatch || contentMatch;
    });
  }, [sortedVersions, searchQuery]);

  const handleCreateNewVersion = () => {
    const nameToUse = newVersionName.trim() || undefined;
    const noteToUse = newVersionNote.trim() || undefined;
    onSaveVersion(nameToUse, noteToUse);
    setShowSaveModal(false);
    setNewVersionName('');
    setNewVersionNote('');
  };

  const handleSaveNoteEdit = (versionId: string) => {
    if (onUpdateChangeSummary) {
      onUpdateChangeSummary(versionId, tempNoteText.trim());
      toast.success('Описание изменений обновлено!');
    }
    setEditingNoteId(null);
  };

  const calculateWords = (blocksObj?: Record<number, any>) => {
    if (!blocksObj) return 0;
    return Object.values(blocksObj).reduce((acc: number, b: any) => {
      const text = b?.text || '';
      return acc + (text ? text.trim().split(/\s+/).length : 0);
    }, 0);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Firebase & Auto-Save Sync Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-neutral-900 border border-emerald-500/20 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Cloud size={22} className={isSavingToFirebase ? "animate-pulse" : ""} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white">Облачная синхронизация Firebase</h4>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Активно
              </span>
            </div>
            <p className="text-neutral-400 text-xs mt-0.5">
              {isSavingToFirebase ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <Sparkles size={12} className="animate-spin" /> Сохранение новой версии в базы данных...
                </span>
              ) : lastFirebaseSave ? (
                `Автосохранение обновлено в ${lastFirebaseSave.toLocaleTimeString("ru-RU")}`
              ) : (
                "Все срезы и исторические вехи сценария сохраняются со 100% безопасностью"
              )}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowSaveModal(true)}
          disabled={isSavingToFirebase}
          className="btn-primary py-2.5 px-5 rounded-2xl text-black font-bold text-xs shrink-0 flex items-center gap-2 transition-all shadow-md hover:scale-105 cursor-pointer"
        >
          <Save size={15} />
          Зафиксировать срез (Версию)
        </button>
      </div>

      {/* Main Visual Timeline Container */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl">
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2.5">
              <Clock size={18} className="text-primary" />
              Интерактивный Таймлайн Сценария ({sortedVersions.length})
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-primary/10 border border-primary/20 text-primary uppercase">
                History
              </span>
            </h3>
            <p className="text-neutral-400 text-xs mt-1">
              Наглядная временная шкала изменений с детальной разбивкой добавлений, правок и сравнением версий.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Поиск по изменениям..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-primary/50 w-44 sm:w-56"
              />
            </div>

            {sortedVersions.length > 0 && (
              <button
                onClick={() => onOpenDiffModal('current')}
                className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md hover:brightness-110 transition-all cursor-pointer"
              >
                <GitCompare size={14} />
                Сравнить версии
              </button>
            )}
          </div>
        </div>

        {/* Empty State */}
        {sortedVersions.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-3xl bg-neutral-950/60 border border-dashed border-neutral-800 space-y-4">
            <div className="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-500">
              <Clock size={32} />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h4 className="text-sm font-bold text-white">История версий пока пуста</h4>
              <p className="text-xs text-neutral-400">
                Зафиксируйте текущий результат сценария, чтобы создать первую контрольную точку на таймлайне и отслеживать любые изменения.
              </p>
            </div>
            <button
              onClick={() => onSaveVersion("Первая версия сценария")}
              className="px-5 py-2.5 bg-primary text-black font-bold rounded-2xl text-xs hover:brightness-110 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Plus size={16} />
              Зафиксировать первую версию
            </button>
          </div>
        ) : filteredVersions.length === 0 ? (
          <div className="text-center py-10 text-xs text-neutral-500">
            По запросу «{searchQuery}» ни одной версии не найдено.
          </div>
        ) : (
          /* Visual Vertical Timeline */
          <div className="relative pl-4 md:pl-8 space-y-8 before:absolute before:left-3 md:before:left-7 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-primary/80 before:via-neutral-800 before:to-neutral-800/20">
            {filteredVersions.map((v, index) => {
              const isActive = activeVersionId === v.id;
              // Previous version chronologically (which is index + 1 in array sorted desc)
              const previousVersion = sortedVersions[sortedVersions.indexOf(v) + 1];
              
              const changeDesc = generateVersionChangeSummary(v, previousVersion);
              
              const blockCount = v.blocks ? Object.keys(v.blocks).length : 0;
              const currentWordCount = calculateWords(v.blocks);
              const prevWordCount = previousVersion ? calculateWords(previousVersion.blocks) : 0;
              const wordDiff = previousVersion ? currentWordCount - prevWordCount : 0;

              const isExpanded = expandedVersionId === v.id;
              const isEditingNote = editingNoteId === v.id;

              const versionDate = new Date(v.timestamp || Date.now());
              const formattedTime = versionDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              const formattedDate = versionDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

              return (
                <div key={`timeline-v-${v.id ?? 'ver'}-${index}`} className="relative group">
                  {/* Timeline Bullet Node */}
                  <div
                    className={`absolute -left-5 md:-left-9 top-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all z-10 ${
                      isActive
                        ? "bg-primary border-black text-black ring-4 ring-primary/20 shadow-lg shadow-primary/30"
                        : "bg-neutral-900 border-neutral-700 text-neutral-400 group-hover:border-primary/60 group-hover:text-primary"
                    }`}
                  >
                    {isActive ? <CheckCircle2 size={13} className="stroke-[3]" /> : <span className="w-2 h-2 rounded-full bg-neutral-600 group-hover:bg-primary" />}
                  </div>

                  {/* Timeline Card */}
                  <div
                    className={`rounded-2xl border transition-all p-5 space-y-4 ${
                      isActive
                        ? "bg-gradient-to-r from-primary/10 via-neutral-900/90 to-neutral-900 border-primary/50 shadow-xl shadow-primary/5"
                        : "bg-neutral-950/70 border-neutral-800/80 hover:border-neutral-700"
                    }`}
                  >
                    {/* Top Row: Meta info & badges */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {editingNameId === v.id ? (
                            <div className="flex items-center gap-1.5 my-0.5">
                              <input
                                type="text"
                                value={tempNameText}
                                onChange={(e) => setTempNameText(e.target.value)}
                                className="bg-neutral-900 border border-primary/50 text-white text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-primary"
                                autoFocus
                              />
                              <button
                                onClick={() => {
                                  if (tempNameText.trim()) {
                                    onRenameVersion(v.id, tempNameText.trim());
                                  }
                                  setEditingNameId(null);
                                }}
                                className="px-2 py-1 bg-primary text-black font-bold text-[11px] rounded-lg cursor-pointer hover:brightness-110"
                              >
                                Сохранить
                              </button>
                              <button
                                onClick={() => setEditingNameId(null)}
                                className="px-2 py-1 bg-neutral-800 text-neutral-300 text-[11px] rounded-lg cursor-pointer hover:bg-neutral-700"
                              >
                                Отмена
                              </button>
                            </div>
                          ) : (
                            <h4 className="text-sm font-bold text-white">{v.name}</h4>
                          )}

                          {isActive && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-primary text-black uppercase tracking-wider">
                              Текущая версия
                            </span>
                          )}

                          <span className="text-[11px] font-medium text-neutral-400 flex items-center gap-1 bg-neutral-900 px-2 py-0.5 rounded-md border border-neutral-800">
                            <Calendar size={11} className="text-neutral-500" />
                            {formattedDate}, {formattedTime}
                          </span>
                        </div>

                        {v.scriptTopic && (
                          <p className="text-xs text-neutral-400 flex items-center gap-1.5">
                            <Tag size={12} className="text-primary/70 shrink-0" />
                            <span>Тема: <strong className="text-neutral-200">{v.scriptTopic}</strong></span>
                          </p>
                        )}
                      </div>

                      {/* Stat Metrics Pills */}
                      <div className="flex items-center gap-2 text-xs">
                        <div className="px-2.5 py-1 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-300 font-mono text-[11px]">
                          <span className="text-neutral-500">Блоков:</span> <strong>{blockCount}</strong>
                        </div>
                        <div className="px-2.5 py-1 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-300 font-mono text-[11px]">
                          <span className="text-neutral-500">Слов:</span> <strong>{currentWordCount}</strong>
                          {wordDiff !== 0 && (
                            <span className={`ml-1.5 font-bold ${wordDiff > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                              ({wordDiff > 0 ? `+${wordDiff}` : wordDiff})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Change Summary Box (Краткое описание изменений) */}
                    <div className="bg-neutral-900/90 rounded-2xl p-3.5 border border-neutral-800 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                          <Sparkles size={14} className="text-purple-400" />
                          <span>Описание изменений (Change Summary):</span>
                        </div>

                        {!isEditingNote && (
                          <button
                            onClick={() => {
                              setEditingNoteId(v.id);
                              setTempNoteText(v.changeSummary || changeDesc);
                            }}
                            className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded-lg bg-neutral-800/60 hover:bg-neutral-800 transition-colors"
                          >
                            <Edit3 size={11} />
                            Изменить
                          </button>
                        )}
                      </div>

                      {isEditingNote ? (
                        <div className="space-y-2 pt-1">
                          <input
                            type="text"
                            value={tempNoteText}
                            onChange={(e) => setTempNoteText(e.target.value)}
                            placeholder="Опишите, что изменилось в этой версии..."
                            className="w-full px-3 py-1.5 bg-neutral-950 border border-purple-500/50 rounded-xl text-xs text-white focus:outline-none focus:border-purple-400"
                            autoFocus
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingNoteId(null)}
                              className="px-2.5 py-1 text-xs text-neutral-400 hover:text-white rounded-lg"
                            >
                              Отмена
                            </button>
                            <button
                              onClick={() => handleSaveNoteEdit(v.id)}
                              className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all"
                            >
                              Сохранить
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-neutral-200 leading-relaxed font-mono bg-neutral-950/50 p-2.5 rounded-xl border border-neutral-800/80">
                          {changeDesc}
                        </div>
                      )}
                    </div>

                    {/* Expandable Block Preview Accordion */}
                    <div>
                      <button
                        onClick={() => setExpandedVersionId(isExpanded ? null : v.id)}
                        className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 font-medium transition-colors"
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {isExpanded ? "Свернуть предварительный просмотр блоков" : `Предварительный просмотр блоков (${blockCount})`}
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            key={`timeline-version-preview-${v.id || index}`}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden mt-3"
                          >
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 text-xs font-mono bg-neutral-950 rounded-xl p-3 border border-neutral-800">
                              {v.blocks && Object.keys(v.blocks).length > 0 ? (
                                Object.entries(v.blocks)
                                  .sort(([a], [b]) => Number(a) - Number(b))
                                  .map(([key, block]: [string, any], blockIdx) => (
                                    <div key={`timeline-block-${key || "block"}-${blockIdx}`} className="p-2 rounded-lg bg-neutral-900/80 border border-neutral-800/60">
                                      <div className="text-[11px] font-bold text-primary mb-0.5">
                                        Блок #{Number(key) + 1}: {block?.title || "Без названия"}
                                      </div>
                                      <p className="text-neutral-300 text-[11px] line-clamp-2 leading-relaxed">
                                        {block?.text || "Содержимое отсутствует"}
                                      </p>
                                    </div>
                                  ))
                              ) : (
                                <p className="text-neutral-500 italic text-[11px]">Нет сгенерированных блоков в этой версии.</p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-neutral-800/60">
                      <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                        <button
                          onClick={() => onLoadVersion(v)}
                          disabled={isActive}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            isActive
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default"
                              : "bg-primary text-black hover:brightness-110 shadow-md shadow-primary/10"
                          }`}
                        >
                          <RotateCcw size={13} />
                          {isActive ? "Текущая версия" : "Загрузить версию"}
                        </button>

                        <button
                          onClick={() => onOpenDiffModal('current', v.id)}
                          className="py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-amber-300 hover:text-amber-200 border border-amber-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          title="Сравнить с текущим черновиком"
                        >
                          <GitCompare size={13} />
                          Сравнить
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingNameId(editingNameId === v.id ? null : v.id);
                            setTempNameText(v.name);
                          }}
                          className="p-2 text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl border border-neutral-800 transition-all cursor-pointer"
                          title="Переименовать"
                        >
                          <Edit3 size={14} />
                        </button>

                        <button
                          onClick={() => {
                            onDeleteVersion(v.id);
                          }}
                          className="p-2 text-neutral-500 hover:text-red-400 bg-neutral-900 hover:bg-red-500/10 rounded-xl border border-neutral-800 hover:border-red-500/20 transition-all cursor-pointer"
                          title="Удалить"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Save New Version Modal */}
      <AnimatePresence>
        {showSaveModal && (
          <div key="timeline-save-modal-overlay" className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2.5 text-white font-bold text-base">
                  <div className="p-2 bg-primary/10 text-primary border border-primary/20 rounded-xl">
                    <Save size={18} />
                  </div>
                  <span>Сохранение контрольной точки (Версии)</span>
                </div>
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="text-neutral-400 hover:text-white p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-neutral-300 font-bold mb-1.5">
                    Название версии:
                  </label>
                  <input
                    type="text"
                    placeholder={`Версия от ${new Date().toLocaleTimeString('ru-RU')}`}
                    value={newVersionName}
                    onChange={(e) => setNewVersionName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 font-bold mb-1.5">
                    Описание изменений (Change Summary):
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Укажите, что именно изменилось (например: 'добавлен дисклеймер во вступлении, расширен блок №3'). Если оставить пустым, описание сгенерируется автоматически!"
                    value={newVersionNote}
                    onChange={(e) => setNewVersionNote(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-primary resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition-all"
                >
                  Отмена
                </button>
                <button
                  onClick={handleCreateNewVersion}
                  className="px-5 py-2 bg-primary text-black font-bold rounded-xl text-xs hover:brightness-110 transition-all flex items-center gap-2"
                >
                  <Save size={14} />
                  Зафиксировать версию
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
