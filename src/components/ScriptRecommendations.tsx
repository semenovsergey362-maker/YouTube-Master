import React, { useState, useRef } from 'react';
import { 
  Sparkles, 
  Upload, 
  FileText, 
  Check, 
  Loader2, 
  Trash2, 
  Plus, 
  AlertTriangle, 
  TrendingUp, 
  RefreshCw, 
  X, 
  Wand2, 
  Send, 
  HelpCircle,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ScriptImprovement } from '../services/geminiService';

interface ScriptRecommendationsProps {
  scriptImprovements: ScriptImprovement[];
  isAnalyzingScript: boolean;
  isApplyingImprovement: Record<number, boolean>;
  isApplyingAll: boolean;
  hasGeneratedAnyBlock: boolean;
  onAnalyzeScript: () => void;
  onApplyImprovement: (improvement: ScriptImprovement, index: number) => void;
  onApplyAllRecommendations: (customText: string, recsList?: ScriptImprovement[]) => Promise<void>;
  onParseAndAddRecommendations: (rawText: string) => Promise<void>;
  onAddCustomRecommendation: (improvement: ScriptImprovement) => void;
  onRemoveImprovement: (index: number) => void;
  onClearAllImprovements?: () => void;
}

export const ScriptRecommendations: React.FC<ScriptRecommendationsProps> = ({
  scriptImprovements,
  isAnalyzingScript,
  isApplyingImprovement,
  isApplyingAll,
  hasGeneratedAnyBlock,
  onAnalyzeScript,
  onApplyImprovement,
  onApplyAllRecommendations,
  onParseAndAddRecommendations,
  onAddCustomRecommendation,
  onRemoveImprovement,
  onClearAllImprovements
}) => {
  const [customInputText, setCustomInputText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'auto'>('auto');
  const [showAdvancedInput, setShowAdvancedInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileRead = (file: File) => {
    if (!file) return;
    setUploadedFileName(file.name);
    setIsParsingFile(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target?.result as string) || '';
      setCustomInputText((prev) => {
        if (prev.trim()) {
          return `${prev.trim()}\n\n--- [Файл: ${file.name}] ---\n${content}`;
        }
        return content;
      });
      setIsParsingFile(false);
    };
    reader.onerror = () => {
      setIsParsingFile(false);
    };
    reader.readAsText(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileRead(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileRead(file);
  };

  const handleQuickAddSingle = () => {
    if (!customInputText.trim()) return;
    const lines = customInputText.trim().split('\n').filter(Boolean);
    const title = lines[0].substring(0, 80);
    const details = lines.length > 1 ? lines.slice(1).join('\n') : customInputText.trim();

    onAddCustomRecommendation({
      improvement: title,
      reason: "Загруженная пользовательская рекомендация",
      example: details,
      metricEffect: "Пользовательская правка",
      isCustom: true
    });

    setCustomInputText('');
    setUploadedFileName(null);
  };

  const handleApplyDirect = async () => {
    if (!customInputText.trim() && scriptImprovements.length === 0) return;
    await onApplyAllRecommendations(customInputText, scriptImprovements);
    setCustomInputText('');
    setUploadedFileName(null);
  };

  const handleAiParse = async () => {
    if (!customInputText.trim()) return;
    setIsParsingFile(true);
    try {
      await onParseAndAddRecommendations(customInputText);
      setCustomInputText('');
      setUploadedFileName(null);
    } finally {
      setIsParsingFile(false);
    }
  };

  return (
    <div className="space-y-5 font-sans">
      <div className="bg-surface border border-border rounded-3xl p-4 md:p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="text-primary" size={18} />
              Удержание сценария
            </h3>
            <p className="text-[11px] text-neutral-400 max-w-xl leading-relaxed">
              Один быстрый анализ, без лишних фильтров и шумных панелей.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-neutral-900 p-1 rounded-xl border border-neutral-800 shrink-0">
            <button
              onClick={() => setActiveTab('auto')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                activeTab === 'auto' ? 'bg-primary text-black' : 'text-neutral-400 hover:text-white'
              }`}
            >
              AI-анализ
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                activeTab === 'upload' ? 'bg-primary text-black' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Правки / файл
            </button>
          </div>
        </div>

        {activeTab === 'auto' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-neutral-950/70 border border-neutral-800 rounded-2xl">
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-white">Сценарный анализ удержания</div>
              <p className="text-[10px] text-neutral-400">
                Проверка хуков, логики сцен, перегруза информацией и точек потери внимания.
              </p>
            </div>

            <button
              onClick={onAnalyzeScript}
              disabled={isAnalyzingScript || !hasGeneratedAnyBlock}
              className="btn-primary py-2 px-4 rounded-xl text-black font-extrabold text-[11px] shrink-0 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isAnalyzingScript ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              Запустить анализ
            </button>
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="space-y-3">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={`border border-dashed rounded-2xl p-3 text-center transition-all cursor-pointer ${
                isDragOver ? 'border-primary bg-primary/10' : 'border-neutral-800 bg-neutral-950/60 hover:border-neutral-700'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept=".txt,.md,.json,.doc,.docx,.pdf" onChange={handleFileInputChange} className="hidden" />
              <div className="flex items-center justify-center gap-2 text-[11px] text-neutral-300">
                <Upload size={13} className="text-primary" />
                <span>Файл или перетащите заметки</span>
              </div>
              {uploadedFileName && (
                <div className="mt-2 inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-2.5 py-1 rounded-lg text-[10px] font-bold">
                  <FileText size={11} />
                  <span>{uploadedFileName}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowAdvancedInput((prev) => !prev)}
              className="text-[10px] text-neutral-400 hover:text-white underline-offset-4 underline transition-all"
            >
              {showAdvancedInput ? 'Скрыть поле правок' : 'Добавить заметки / правки вручную'}
            </button>

            {showAdvancedInput && (
              <div className="space-y-3">
                <textarea
                  value={customInputText}
                  onChange={(e) => setCustomInputText(e.target.value)}
                  placeholder="Например: Сделать хук сильнее в первых 8 секундах, убрать длинное объяснение в середине, добавить резкий вопрос после факта..."
                  rows={3}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-3 text-[11px] text-white placeholder-neutral-600 focus:outline-none focus:border-primary/50 transition-all font-mono leading-relaxed resize-none"
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleApplyDirect}
                    disabled={isApplyingAll || (!customInputText.trim() && scriptImprovements.length === 0) || !hasGeneratedAnyBlock}
                    className="btn-primary py-2 px-4 rounded-xl text-black font-extrabold text-[11px] flex items-center gap-2 transition-all shadow-lg disabled:opacity-50"
                  >
                    {isApplyingAll ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                    Внедрить всё
                  </button>

                  <button
                    onClick={handleAiParse}
                    disabled={isParsingFile || !customInputText.trim()}
                    className="bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-700 px-3 py-2 rounded-xl text-[11px] font-bold transition-all disabled:opacity-50"
                  >
                    {isParsingFile ? <Loader2 size={13} className="animate-spin text-primary" /> : <Wand2 size={13} className="text-primary" />}
                    Разобрать в карточки
                  </button>

                  <button
                    onClick={handleQuickAddSingle}
                    disabled={!customInputText.trim()}
                    className="bg-neutral-900/60 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 px-3 py-2 rounded-xl text-[11px] font-bold transition-all disabled:opacity-50"
                  >
                    <Plus size={12} />
                    Добавить карточкой
                  </button>
                </div>
              </div>
            )}

            {!hasGeneratedAnyBlock && (
              <div className="text-[10px] text-amber-400/90 flex items-center gap-1 font-medium">
                <AlertTriangle size={12} /> Сначала сгенерируйте сценарий
              </div>
            )}
          </div>
        )}

        {isAnalyzingScript && (
          <div className="text-center py-6 space-y-2 bg-neutral-950/40 rounded-2xl border border-neutral-800/40">
            <RefreshCw className="animate-spin text-primary mx-auto" size={22} />
            <p className="text-[11px] text-neutral-300">Gemini проверяет хуки, ритм и слабые места по сценам...</p>
          </div>
        )}
      </div>

      {/* LIST OF RECOMMENDATIONS CARDS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
            <span>Список рекомендаций и правок</span>
            <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-white text-[10px]">
              {scriptImprovements.length}
            </span>
          </h4>

          {scriptImprovements.length > 0 && onClearAllImprovements && (
            <button
              onClick={onClearAllImprovements}
              className="text-[11px] text-neutral-500 hover:text-red-400 flex items-center gap-1 transition-colors"
            >
              <Trash2 size={12} /> Очистить список
            </button>
          )}
        </div>

        {scriptImprovements.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-3xl border border-dashed border-neutral-800 bg-neutral-950/30 space-y-3">
            <HelpCircle size={32} className="text-neutral-600 mx-auto" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-neutral-400">Список рекомендаций пока пуст</p>
              <p className="text-[11px] text-neutral-500 max-w-md mx-auto">
                Загрузите свои рекомендации выше, вставьте текст с замечаниями или запустите ИИ-анализ удержания.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {scriptImprovements.map((improvement, index) => {
              const isApplying = isApplyingImprovement[index];

              return (
                <motion.div key={`script-rec-${index}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 rounded-2xl border border-neutral-800 bg-surface/80 backdrop-blur-md space-y-3 relative overflow-hidden group hover:border-neutral-700 transition-all shadow-md"
                >
                  <div
                    className={`absolute top-0 left-0 w-1.5 h-full ${
                      improvement.isCustom ? 'bg-amber-400' : 'bg-primary'
                    }`}
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800/60 pb-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                          improvement.isCustom
                            ? 'bg-amber-400/10 text-amber-400 border-amber-400/20'
                            : 'bg-primary/10 text-primary border-primary/20'
                        }`}
                      >
                        {improvement.isCustom ? 'Пользовательская' : 'AI'}
                      </span>
                      {improvement.metricEffect && (
                        <span className="text-[10px] text-neutral-400">{improvement.metricEffect}</span>
                      )}
                    </div>

                    <button
                      onClick={() => onRemoveImprovement(index)}
                      className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-all"
                      title="Удалить рекомендацию"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div className="space-y-2 text-xs text-neutral-300">
                    <p className="font-bold text-white text-sm leading-snug">{improvement.improvement}</p>

                    {improvement.reason && (
                      <p className="text-neutral-400 leading-relaxed text-[11px]">
                        {improvement.reason}
                      </p>
                    )}

                    {improvement.example && (
                      <div className="bg-neutral-950/70 p-3 rounded-xl border border-neutral-800/80 text-[11px] text-primary/90 leading-relaxed">
                        {improvement.example}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => onApplyImprovement(improvement, index)}
                      disabled={isApplying || !hasGeneratedAnyBlock}
                      className="text-[11px] bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isApplying ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      Применить
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
