import { logger } from "../config/logger";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Database,
  BookmarkPlus,
  History,
  RotateCcw,
  Trash2,
  Calendar,
  Layers,
  Sparkles,
  CheckCircle2,
  CloudUpload,
  CloudCheck,
  FileSpreadsheet,
  Tag,
  Folder,
  Loader2,
  ListOrdered
} from "lucide-react";
import { db, doc, setDoc, deleteDoc, onSnapshot, collection, handleFirestoreError, OperationType, auth } from "../firebase";
import { toast } from "sonner";

export interface IdeaSnapshotData {
  id: string;
  name: string;
  createdAt: string;
  niche: string;
  ideasCount: number;
  ideas: any[];
  trendingIdeas?: any[];
  ideaAssignments?: Record<string, any>;
  ideaTags?: any[];
  ideaPlaylists?: string[];
  uid?: string;
  note?: string;
}

interface IdeaSnapshotsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentIdeas: any[];
  currentTrendingIdeas: any[];
  currentAssignments: Record<string, any>;
  currentTags: any[];
  currentPlaylists: string[];
  currentNiche: string;
  onApplySnapshot: (snapshot: IdeaSnapshotData) => void;
}

export const IdeaSnapshotsModal: React.FC<IdeaSnapshotsModalProps> = ({
  isOpen,
  onClose,
  currentIdeas = [],
  currentTrendingIdeas = [],
  currentAssignments = {},
  currentTags = [],
  currentPlaylists = [],
  currentNiche = "Общая",
  onApplySnapshot,
}) => {
  const [snapshots, setSnapshots] = useState<IdeaSnapshotData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newSnapshotName, setNewSnapshotName] = useState("");
  const [newSnapshotNote, setNewSnapshotNote] = useState("");
  const [previewSnapshot, setPreviewSnapshot] = useState<IdeaSnapshotData | null>(null);

  // Subscribe to Firebase idea_snapshots collection
  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);

    const snapshotsCol = collection(db, "idea_snapshots");
    const unsubscribe = onSnapshot(
      snapshotsCol,
      (snapshot) => {
        const loaded: IdeaSnapshotData[] = [];
        snapshot.docs.forEach((docSnap: any) => {
          const data = typeof docSnap.data === "function" ? docSnap.data() : docSnap;
          loaded.push({
            id: docSnap.id || data.id,
            ...data,
          });
        });
        // Sort newest first
        loaded.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setSnapshots(loaded);
        setIsLoading(false);
      },
      (error) => {
        logger.warn("Snapshot subscription error:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const totalCurrentIdeasCount = currentIdeas.length;

  const handleSaveSnapshot = async () => {
    if (totalCurrentIdeasCount === 0) {
      toast.error("Нет идей для сохранения в снимок");
      return;
    }

    try {
      setIsSaving(true);
      const snapshotId = `snapshot_${Date.now()}`;
      const currentUser = auth.currentUser;
      const uid = currentUser?.uid || "anonymous_user";

      const defaultName = newSnapshotName.trim()
        ? newSnapshotName.trim()
        : `Снимок — ${totalCurrentIdeasCount} идей (${currentNiche || "Все"}) — ${new Date().toLocaleDateString("ru-RU", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}`;

      const snapshotPayload: IdeaSnapshotData = {
        id: snapshotId,
        name: defaultName,
        createdAt: new Date().toISOString(),
        niche: currentNiche || "Общая",
        ideasCount: totalCurrentIdeasCount,
        ideas: currentIdeas,
        trendingIdeas: currentTrendingIdeas,
        ideaAssignments: currentAssignments,
        ideaTags: currentTags,
        ideaPlaylists: currentPlaylists,
        uid,
        note: newSnapshotNote.trim() || undefined,
      };

      const docRef = doc(db, "idea_snapshots", snapshotId);
      await setDoc(docRef, snapshotPayload);

      toast.success(`Снимок состояния "${defaultName}" сохранен в Firebase!`);
      setNewSnapshotName("");
      setNewSnapshotNote("");
    } catch (err: any) {
      logger.error("Save snapshot error:", err);
      toast.error("Ошибка при сохранении снимка в Firebase");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSnapshot = async (snapshotId: string, name: string, e: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    try {
      // Optimistically remove from local state
      setSnapshots(prev => prev.filter(s => s.id !== snapshotId));
      if (previewSnapshot?.id === snapshotId) {
        setPreviewSnapshot(null);
      }

      const docRef = doc(db, "idea_snapshots", snapshotId);
      await deleteDoc(docRef);
      toast.success(`Снимок "${name || 'версии'}" успешно удален`);
    } catch (err) {
      logger.error("Delete snapshot error:", err);
      toast.error("Не удалось удалить снимок из облака");
    }
  };

  const handleRestoreSnapshot = (snapshot: IdeaSnapshotData) => {
    onApplySnapshot(snapshot);
    toast.success(`Успешно загружена версия контент-плана: "${snapshot.name}"`);
    onClose();
  };

  return (
    <AnimatePresence>
      <div key="idea-snapshots-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden my-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-neutral-800 flex items-center justify-between gap-4 bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-emerald-950/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                <Database size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Версионирование и снимки идей (Firebase)
                  </h2>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-bold flex items-center gap-1">
                    <CloudCheck size={11} /> Синхронизация
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  Сохраняйте снимки текущего контент-плана в облако и легко переключайтесь между разными версиями
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-all cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
            {/* Left Column: Save current state form & list of snapshots */}
            <div className="lg:col-span-7 space-y-6">
              {/* Save State Box */}
              <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <BookmarkPlus size={15} className="text-emerald-400" /> Сохранить текущую версию
                  </span>
                  <span className="text-[11px] font-medium text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                    Идей сейчас: <strong className="text-emerald-400">{totalCurrentIdeasCount}</strong>
                  </span>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={newSnapshotName}
                    onChange={(e) => setNewSnapshotName(e.target.value)}
                    placeholder={`Название версии (напр. "Снимок перед интеграцией AI")`}
                    className="w-full bg-neutral-900 border border-neutral-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <input
                    type="text"
                    value={newSnapshotNote}
                    onChange={(e) => setNewSnapshotNote(e.target.value)}
                    placeholder="Примечание (опционально, напр. 'Подборка для марафона')"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-300 placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <button
                  onClick={handleSaveSnapshot}
                  disabled={isSaving || totalCurrentIdeasCount === 0}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-900/20 cursor-pointer"
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <CloudUpload size={15} />}
                  <span>Сохранить состояние идей в Firebase</span>
                </button>
              </div>

              {/* Saved Snapshots List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <History size={15} className="text-primary" /> Сохраненные версии ({snapshots.length})
                  </h3>
                  {snapshots.length > 0 && (
                    <span className="text-[10px] text-neutral-400 italic">Нажмите на снимок для предпросмотра</span>
                  )}
                </div>

                {isLoading ? (
                  <div className="py-12 text-center text-neutral-400 space-y-2">
                    <Loader2 size={20} className="animate-spin mx-auto text-emerald-400" />
                    <p className="text-xs">Загрузка снимков из Firebase...</p>
                  </div>
                ) : snapshots.length === 0 ? (
                  <div className="py-12 border border-dashed border-neutral-800 rounded-xl text-center space-y-2 p-4">
                    <Database size={28} className="mx-auto text-neutral-600" />
                    <p className="text-xs font-medium text-neutral-400">У вас пока нет сохраненных снимков идей</p>
                    <p className="text-[11px] text-neutral-500">
                      Введите название выше и нажмите кнопку "Сохранить состояние идей в Firebase"
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                    {snapshots.map((snap, idx) => {
                      const isSelected = previewSnapshot?.id === snap.id;
                      const formattedDate = new Date(snap.createdAt).toLocaleString("ru-RU", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <div
                          key={`snap-${snap.id ?? 'item'}-${idx}`}
                          onClick={() => setPreviewSnapshot(snap)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer relative group ${
                            isSelected
                              ? "bg-emerald-950/30 border-emerald-500/60 shadow-lg shadow-emerald-950/20"
                              : "bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                                  {snap.name}
                                </h4>
                              </div>

                              {snap.note && (
                                <p className="text-[11px] text-neutral-400 line-clamp-1 italic">
                                  💬 {snap.note}
                                </p>
                              )}

                              <div className="flex items-center gap-3 text-[10px] text-neutral-500 pt-1 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Calendar size={11} /> {formattedDate}
                                </span>
                                <span className="flex items-center gap-1 font-bold text-emerald-400">
                                  <ListOrdered size={11} /> {snap.ideasCount || snap.ideas?.length || 0} идей
                                </span>
                                <span className="px-1.5 py-0.5 bg-neutral-900 border border-neutral-800 rounded text-neutral-400">
                                  Ниша: {snap.niche || "Все"}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleRestoreSnapshot(snap)}
                                className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                title="Переключиться на этот снимок"
                              >
                                <RotateCcw size={11} /> Загрузить
                              </button>
                              <button
                                onClick={(e) => handleDeleteSnapshot(snap.id, snap.name, e)}
                                className="p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                                title="Удалить снимок"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Preview Selected Snapshot */}
            <div className="lg:col-span-5 bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between min-h-[350px]">
              {previewSnapshot ? (
                <div className="space-y-4 flex-1 flex flex-col min-h-0">
                  <div className="border-b border-neutral-800 pb-3 space-y-1">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                      Предпросмотр снимка
                    </span>
                    <h3 className="text-sm font-bold text-white break-words">{previewSnapshot.name}</h3>
                    {previewSnapshot.note && (
                      <p className="text-xs text-neutral-400 italic">"{previewSnapshot.note}"</p>
                    )}
                  </div>

                  {/* Ideas list preview */}
                  <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar max-h-[300px] pr-1">
                    <span className="text-[11px] font-bold text-neutral-400 uppercase block mb-1">
                      Сохраненные идеи ({previewSnapshot.ideas?.length || 0}):
                    </span>
                    {previewSnapshot.ideas && previewSnapshot.ideas.length > 0 ? (
                      previewSnapshot.ideas.map((item: any, idx: number) => {
                        const itemTitle = typeof item === "string" ? item : (item?.title || item?.name || "Идея без заголовка");
                        return (
                          <div
                            key={`snapshot-idea-preview-${idx}-${String(itemTitle).slice(0, 20)}`}
                            className="p-2.5 bg-neutral-900 border border-neutral-800/80 rounded-lg text-xs text-neutral-200 flex items-start gap-2"
                          >
                            <span className="text-neutral-500 font-mono text-[10px] mt-0.5">{idx + 1}.</span>
                            <span className="leading-snug break-words flex-1 font-medium">{itemTitle}</span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-neutral-500 italic">Список идей пуст</p>
                    )}
                  </div>

                  {/* Apply / Restore Action */}
                  <div className="pt-3 border-t border-neutral-800 space-y-2">
                    <button
                      onClick={() => handleRestoreSnapshot(previewSnapshot)}
                      className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
                    >
                      <RotateCcw size={14} /> Применить эту версию контент-плана
                    </button>
                    <p className="text-[10px] text-neutral-500 text-center">
                      Это заменит текущий список идей в окне редактора на выбранный снимок
                    </p>
                  </div>
                </div>
              ) : (
                <div className="m-auto text-center space-y-2 p-6 text-neutral-500">
                  <Layers size={32} className="mx-auto text-neutral-700" />
                  <p className="text-xs font-medium text-neutral-400">Выберите снимок слева для просмотра состава идей</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 border-t border-neutral-800 bg-neutral-950 flex items-center justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-neutral-700"
            >
              Закрыть
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
