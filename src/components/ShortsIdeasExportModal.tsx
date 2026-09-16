import React, { useState, useMemo } from 'react';
import {
  Download,
  Copy,
  Check,
  FileText,
  Table,
  FileCode,
  FileJson,
  CheckCircle2,
  Sparkles,
  Flame,
  Scissors,
  Eye,
  Settings,
} from 'lucide-react';
import { BaseModal } from './common/BaseModal';
import { type ShortsOutlierIdea, type CutShortItem } from '../services/geminiService';
import {
  formatShortsIdeasToCSV,
  formatShortsIdeasToMarkdown,
  formatShortsIdeasToPlainText,
  formatShortsIdeasToJSON,
  exportShortsIdeasAsPDF,
  formatCutShortsToCSV,
  formatCutShortsToMarkdown,
  type ShortsIdeasExportOptions,
} from '../utils/shortsExportHelper';
import { exportToCSV, exportToMarkdown, exportToTxt, exportToJSON, copyToClipboard } from '../utils/helpers';
import { toast } from 'sonner';

export interface ShortsIdeasExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  ideas: ShortsOutlierIdea[];
  cutShorts?: CutShortItem[];
  nicheName?: string;
  channelName?: string;
  framework?: string;
}

export const ShortsIdeasExportModal: React.FC<ShortsIdeasExportModalProps> = ({
  isOpen,
  onClose,
  ideas = [],
  cutShorts = [],
  nicheName = '',
  channelName = '',
  framework = '',
}) => {
  const hasOutliers = ideas.length > 0;
  const hasCut = cutShorts.length > 0;

  const [activeSource, setActiveSource] = useState<'outliers' | 'cut'>(
    hasOutliers ? 'outliers' : 'cut'
  );

  // Filter selected IDs
  const [selectedIdeaIds, setSelectedIdeaIds] = useState<Set<string>>(new Set());

  // Initialize selected ideas
  React.useEffect(() => {
    if (ideas.length > 0) {
      setSelectedIdeaIds(new Set(ideas.map((_, i) => String(i))));
    }
  }, [ideas]);

  // Export options
  const [options, setOptions] = useState<ShortsIdeasExportOptions>({
    includeHooks: true,
    includeWhyItWorks: true,
    includeVisuals: true,
    includeScripts: true,
    includeFramework: true,
  });

  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  // Selected ideas array
  const filteredIdeas = useMemo(() => {
    return ideas.filter((_, idx) => selectedIdeaIds.has(String(idx)));
  }, [ideas, selectedIdeaIds]);

  const toggleIdea = (idxStr: string) => {
    setSelectedIdeaIds((prev) => {
      const next = new Set(prev);
      if (next.has(idxStr)) {
        next.delete(idxStr);
      } else {
        next.add(idxStr);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIdeaIds(new Set(ideas.map((_, i) => String(i))));
  };

  const deselectAll = () => {
    setSelectedIdeaIds(new Set());
  };

  const exportFilename = useMemo(() => {
    const prefix = activeSource === 'outliers' ? 'Shorts_Ideas' : 'Cut_Shorts';
    const cleanNiche = nicheName ? `_${nicheName.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_')}` : '';
    const dateStr = new Date().toISOString().split('T')[0];
    return `${prefix}${cleanNiche}_${dateStr}`;
  }, [activeSource, nicheName]);

  // Export handlers
  const handleExportCSV = () => {
    if (activeSource === 'outliers') {
      if (filteredIdeas.length === 0) {
        toast.error('Выберите хотя бы одну идею для экспорта');
        return;
      }
      const csv = formatShortsIdeasToCSV(filteredIdeas, {
        ...options,
        niche: nicheName,
        channelName,
        framework,
      });
      exportToCSV(csv, exportFilename);
      toast.success(`Экспортировано ${filteredIdeas.length} идей в CSV (Excel)!`);
    } else {
      if (cutShorts.length === 0) {
        toast.error('Список нарезок пуст');
        return;
      }
      const csv = formatCutShortsToCSV(cutShorts);
      exportToCSV(csv, exportFilename);
      toast.success(`Экспортировано ${cutShorts.length} нарезок в CSV!`);
    }
  };

  const handleExportMarkdown = () => {
    if (activeSource === 'outliers') {
      if (filteredIdeas.length === 0) {
        toast.error('Выберите хотя бы одну идею для экспорта');
        return;
      }
      const md = formatShortsIdeasToMarkdown(filteredIdeas, {
        ...options,
        niche: nicheName,
        channelName,
        framework,
      });
      exportToMarkdown(md, exportFilename);
      toast.success(`Файл Markdown (.md) успешно сохранен!`);
    } else {
      if (cutShorts.length === 0) {
        toast.error('Список нарезок пуст');
        return;
      }
      const md = formatCutShortsToMarkdown(cutShorts, { niche: nicheName, channelName });
      exportToMarkdown(md, exportFilename);
      toast.success(`Файл Markdown (.md) нарезок сохранен!`);
    }
  };

  const handleExportTXT = () => {
    if (activeSource === 'outliers') {
      if (filteredIdeas.length === 0) {
        toast.error('Выберите хотя бы одну идею для экспорта');
        return;
      }
      const txt = formatShortsIdeasToPlainText(filteredIdeas, {
        ...options,
        niche: nicheName,
        channelName,
        framework,
      });
      exportToTxt(txt, exportFilename);
      toast.success(`Текстовый файл (.txt) успешно сохранен!`);
    } else {
      if (cutShorts.length === 0) {
        toast.error('Список нарезок пуст');
        return;
      }
      const md = formatCutShortsToMarkdown(cutShorts, { niche: nicheName, channelName });
      exportToTxt(md, exportFilename);
      toast.success(`Текстовый файл нарезок сохранен!`);
    }
  };

  const handleExportPDF = () => {
    if (activeSource === 'outliers') {
      if (filteredIdeas.length === 0) {
        toast.error('Выберите хотя бы одну идею для экспорта');
        return;
      }
      exportShortsIdeasAsPDF(filteredIdeas, exportFilename, {
        ...options,
        niche: nicheName,
        channelName,
        framework,
      });
      toast.success(`Генерация PDF документа...`);
    } else {
      toast.info('Экспорт PDF доступен для списка идей. Для нарезок используйте CSV или Markdown.');
    }
  };

  const handleExportJSON = () => {
    if (activeSource === 'outliers') {
      if (filteredIdeas.length === 0) {
        toast.error('Выберите хотя бы одну идею для экспорта');
        return;
      }
      const jsonStr = formatShortsIdeasToJSON(filteredIdeas, {
        ...options,
        niche: nicheName,
        channelName,
        framework,
      });
      exportToJSON(jsonStr, exportFilename);
      toast.success(`Файл JSON (.json) успешно сохранен!`);
    } else {
      if (cutShorts.length === 0) {
        toast.error('Список нарезок пуст');
        return;
      }
      const jsonStr = JSON.stringify(cutShorts, null, 2);
      exportToJSON(jsonStr, exportFilename);
      toast.success(`Файл JSON нарезок сохранен!`);
    }
  };

  const handleCopy = async () => {
    let textToCopy = '';
    if (activeSource === 'outliers') {
      if (filteredIdeas.length === 0) {
        toast.error('Выберите хотя бы одну идею для копирования');
        return;
      }
      textToCopy = formatShortsIdeasToMarkdown(filteredIdeas, {
        ...options,
        niche: nicheName,
        channelName,
        framework,
      });
    } else {
      if (cutShorts.length === 0) {
        toast.error('Список нарезок пуст');
        return;
      }
      textToCopy = formatCutShortsToMarkdown(cutShorts, { niche: nicheName, channelName });
    }

    const success = await copyToClipboard(textToCopy);
    if (success) {
      setCopied(true);
      toast.success('Список идей скопирован в буфер обмена!');
      setTimeout(() => setCopied(false), 2500);
    } else {
      toast.error('Не удалось скопировать в буфер обмена');
    }
  };

  const previewContent = useMemo(() => {
    if (activeSource === 'outliers') {
      return formatShortsIdeasToMarkdown(filteredIdeas, {
        ...options,
        niche: nicheName,
        channelName,
        framework,
      });
    }
    return formatCutShortsToMarkdown(cutShorts, { niche: nicheName, channelName });
  }, [activeSource, filteredIdeas, cutShorts, options, nicheName, channelName, framework]);

  const targetCount = activeSource === 'outliers' ? filteredIdeas.length : cutShorts.length;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span>Экспорт списка идей Shorts & Reels</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
            {targetCount} шт.
          </span>
        </div>
      }
      subtitle="Выберите удобный формат (Excel/CSV, Markdown, TXT, PDF) или скопируйте список в один клик"
      icon={Download}
      maxWidth="3xl"
    >
      <div className="space-y-5">
        {/* Source Switcher (if both exist) */}
        {hasOutliers && hasCut && (
          <div className="flex items-center gap-2 p-1 bg-neutral-900 border border-neutral-800 rounded-xl text-xs">
            <button
              onClick={() => setActiveSource('outliers')}
              className={`flex-1 py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeSource === 'outliers'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Flame size={14} />
              <span>10 идей от ИИ-Аналитика ({ideas.length})</span>
            </button>
            <button
              onClick={() => setActiveSource('cut')}
              className={`flex-1 py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeSource === 'cut'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Scissors size={14} />
              <span>Нарезки из Long-Form ({cutShorts.length})</span>
            </button>
          </div>
        )}

        {/* Quick Format Action Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {/* JSON */}
          <button
            onClick={handleExportJSON}
            className="p-3.5 bg-neutral-900/90 hover:bg-amber-950/30 border border-neutral-800 hover:border-amber-500/50 rounded-xl text-left transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg group-hover:scale-110 transition-transform">
                <FileJson size={18} />
              </div>
              <span className="text-[10px] font-mono text-neutral-500 group-hover:text-amber-300">.json</span>
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-amber-200">JSON Формат</div>
              <div className="text-[10px] text-neutral-400">Перенос и бэкап тем</div>
            </div>
          </button>

          {/* CSV */}
          <button
            onClick={handleExportCSV}
            className="p-3.5 bg-neutral-900/90 hover:bg-emerald-950/30 border border-neutral-800 hover:border-emerald-500/50 rounded-xl text-left transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg group-hover:scale-110 transition-transform">
                <Table size={18} />
              </div>
              <span className="text-[10px] font-mono text-neutral-500 group-hover:text-emerald-300">.csv</span>
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-emerald-200">Excel / Таблицы</div>
              <div className="text-[10px] text-neutral-400">Google Sheets, Notion, Excel</div>
            </div>
          </button>

          {/* Markdown */}
          <button
            onClick={handleExportMarkdown}
            className="p-3.5 bg-neutral-900/90 hover:bg-blue-950/30 border border-neutral-800 hover:border-blue-500/50 rounded-xl text-left transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg group-hover:scale-110 transition-transform">
                <FileCode size={18} />
              </div>
              <span className="text-[10px] font-mono text-neutral-500 group-hover:text-blue-300">.md</span>
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-blue-200">Markdown</div>
              <div className="text-[10px] text-neutral-400">Для баз знаний и Notion</div>
            </div>
          </button>

          {/* TXT */}
          <button
            onClick={handleExportTXT}
            className="p-3.5 bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-600 rounded-xl text-left transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-neutral-800 text-neutral-300 rounded-lg group-hover:scale-110 transition-transform">
                <FileText size={18} />
              </div>
              <span className="text-[10px] font-mono text-neutral-500">.txt</span>
            </div>
            <div>
              <div className="text-xs font-bold text-white">Текстовый файл</div>
              <div className="text-[10px] text-neutral-400">Простой понятный текст</div>
            </div>
          </button>

          {/* PDF */}
          <button
            onClick={handleExportPDF}
            className="p-3.5 bg-neutral-900/90 hover:bg-rose-950/30 border border-neutral-800 hover:border-rose-500/50 rounded-xl text-left transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg group-hover:scale-110 transition-transform">
                <Download size={18} />
              </div>
              <span className="text-[10px] font-mono text-neutral-500 group-hover:text-rose-300">.pdf</span>
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-rose-200">PDF Документ</div>
              <div className="text-[10px] text-neutral-400">Красивый печатный файл</div>
            </div>
          </button>
        </div>

        {/* Copy to Clipboard Bar */}
        <div className="flex items-center justify-between gap-3 p-3 bg-neutral-900/70 border border-neutral-800 rounded-xl">
          <div className="flex items-center gap-2 text-xs text-neutral-300">
            <Sparkles size={14} className="text-amber-400 shrink-0" />
            <span>Нужно быстро переслать в Telegram или вставить в заметки?</span>
          </div>
          <button
            onClick={handleCopy}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0"
          >
            {copied ? <Check size={14} className="text-emerald-950 font-black" /> : <Copy size={14} />}
            <span>{copied ? 'Скопировано!' : 'Скопировать весь список'}</span>
          </button>
        </div>

        {/* Customization Options (for outliers) */}
        {activeSource === 'outliers' && (
          <div className="p-3.5 bg-neutral-950/60 border border-neutral-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-neutral-300">
              <div className="flex items-center gap-1.5">
                <Settings size={13} className="text-amber-400" />
                <span>Настройки содержания экспорта:</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <label className="flex items-center gap-2 text-neutral-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={options.includeHooks}
                  onChange={(e) => setOptions((p) => ({ ...p, includeHooks: e.target.checked }))}
                  className="rounded border-neutral-700 text-amber-500 focus:ring-amber-500"
                />
                <span>Хуки первых 3 сек</span>
              </label>

              <label className="flex items-center gap-2 text-neutral-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={options.includeWhyItWorks}
                  onChange={(e) => setOptions((p) => ({ ...p, includeWhyItWorks: e.target.checked }))}
                  className="rounded border-neutral-700 text-amber-500 focus:ring-amber-500"
                />
                <span>Почему сработает</span>
              </label>

              <label className="flex items-center gap-2 text-neutral-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={options.includeVisuals}
                  onChange={(e) => setOptions((p) => ({ ...p, includeVisuals: e.target.checked }))}
                  className="rounded border-neutral-700 text-amber-500 focus:ring-amber-500"
                />
                <span>Что в кадре</span>
              </label>

              <label className="flex items-center gap-2 text-neutral-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={options.includeFramework}
                  onChange={(e) => setOptions((p) => ({ ...p, includeFramework: e.target.checked }))}
                  className="rounded border-neutral-700 text-amber-500 focus:ring-amber-500"
                />
                <span>Формула ниши</span>
              </label>

              <label className="flex items-center gap-2 text-neutral-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={options.includeScripts}
                  onChange={(e) => setOptions((p) => ({ ...p, includeScripts: e.target.checked }))}
                  className="rounded border-neutral-700 text-amber-500 focus:ring-amber-500"
                />
                <span>Текст сценариев (если есть)</span>
              </label>
            </div>
          </div>
        )}

        {/* Ideas Selection List (for outliers) */}
        {activeSource === 'outliers' && ideas.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-neutral-300">
                Выбор идей ({filteredIdeas.length} из {ideas.length}):
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                >
                  Выбрать все
                </button>
                <span className="text-neutral-600">&bull;</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-[11px] text-neutral-400 hover:text-white cursor-pointer"
                >
                  Снять выбор
                </button>
              </div>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-neutral-950/80 border border-neutral-800 rounded-xl scrollbar-thin">
              {ideas.map((idea, idx) => {
                const isSelected = selectedIdeaIds.has(String(idx));
                return (
                  <label
                    key={idea.id || idx}
                    className={`flex items-center gap-2.5 p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-amber-500/10 border border-amber-500/30 text-white'
                        : 'bg-neutral-900/40 border border-transparent text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleIdea(String(idx))}
                      className="rounded border-neutral-700 text-amber-500 focus:ring-amber-500"
                    />
                    <span className="font-bold text-amber-400 shrink-0">#{idx + 1}</span>
                    <span className="truncate flex-1 font-medium">{idea.title}</span>
                    {idea.estimatedDuration && (
                      <span className="text-[10px] text-neutral-500 shrink-0">
                        {idea.estimatedDuration}
                      </span>
                    )}
                    {idea.isGenerated && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 shrink-0 font-medium">
                        Сценарий
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Live Preview Toggle & Box */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white cursor-pointer transition-colors"
          >
            <Eye size={13} />
            <span>{showPreview ? 'Скрыть предпросмотр' : 'Показать предпросмотр текста'}</span>
          </button>

          {showPreview && (
            <div className="mt-2 p-3 bg-neutral-950 border border-neutral-800 rounded-xl max-h-48 overflow-y-auto font-mono text-[11px] text-neutral-300 whitespace-pre-wrap scrollbar-thin">
              {previewContent}
            </div>
          )}
        </div>
      </div>
    </BaseModal>
  );
};
