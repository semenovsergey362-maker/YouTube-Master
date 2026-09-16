import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileCode,
  Upload,
  Download,
  Copy,
  Check,
  X,
  FileJson,
  Sparkles,
  AlertTriangle,
  Plus,
  RefreshCw,
  CheckCircle2,
  ListFilter
} from "lucide-react";
import { BaseModal } from "../common/BaseModal";
import { type ShortsOutlierIdea } from "../../services/geminiService";
import {
  formatShortsIdeasToJSON,
  parseShortsIdeasFromJSON
} from "../../utils/shortsExportHelper";
import { exportToJSON, copyToClipboard } from "../../utils/helpers";
import { toast } from "sonner";

export interface ShortsJsonImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  ideas: ShortsOutlierIdea[];
  onImportIdeas: (newIdeas: ShortsOutlierIdea[], mode: "append" | "replace") => void;
  nicheName?: string;
  channelName?: string;
}

export const ShortsJsonImportExportModal: React.FC<ShortsJsonImportExportModalProps> = ({
  isOpen,
  onClose,
  ideas = [],
  onImportIdeas,
  nicheName = "",
  channelName = ""
}) => {
  const [activeTab, setActiveTab] = useState<"import" | "export">("import");
  
  // Import states
  const [rawJsonText, setRawJsonText] = useState("");
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export states
  const [copied, setCopied] = useState(false);

  // Parse preview
  const parsedResult = React.useMemo(() => {
    if (!rawJsonText.trim()) return null;
    return parseShortsIdeasFromJSON(rawJsonText);
  }, [rawJsonText]);

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      readJsonFile(file);
    }
  };

  const readJsonFile = (file: File) => {
    if (!file.name.endsWith(".json") && file.type !== "application/json") {
      toast.error("Пожалуйста, выберите файл в формате .json");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawJsonText(content);
        toast.success(`Файл ${file.name} успешно загружен!`);
      }
    };
    reader.onerror = () => {
      toast.error("Ошибка при чтении файла");
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      readJsonFile(e.dataTransfer.files[0]);
    }
  };

  // Execute import
  const handleExecuteImport = () => {
    if (!parsedResult || parsedResult.ideas.length === 0) {
      toast.error("Нет валидных тем для импорта");
      return;
    }
    onImportIdeas(parsedResult.ideas, importMode);
    toast.success(
      importMode === "append"
        ? `Успешно добавлено ${parsedResult.ideas.length} тем!`
        : `Список заменен на ${parsedResult.ideas.length} новых тем!`
    );
    setRawJsonText("");
    onClose();
  };

  // Generate Export JSON text
  const exportJsonString = React.useMemo(() => {
    return formatShortsIdeasToJSON(ideas, {
      niche: nicheName,
      channelName
    });
  }, [ideas, nicheName, channelName]);

  const handleDownloadJSON = () => {
    if (ideas.length === 0) {
      toast.error("Список тем пуст для экспорта");
      return;
    }
    const cleanNiche = nicheName ? `_${nicheName.replace(/[^a-zA-Zа-яА-Я0-9]/g, "_")}` : "";
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `Shorts_Topics${cleanNiche}_${dateStr}`;
    exportToJSON(exportJsonString, filename);
    toast.success(`Файл ${filename}.json успешно скачан!`);
  };

  const handleCopyJSON = async () => {
    if (ideas.length === 0) {
      toast.error("Список тем пуст");
      return;
    }
    const success = await copyToClipboard(exportJsonString);
    if (success) {
      setCopied(true);
      toast.success("JSON скопирован в буфер обмена!");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Ошибка при копировании");
    }
  };

  if (!isOpen) return null;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} maxWidth="3xl">
      <div className="p-5 space-y-5 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-amber-500/20 to-yellow-500/20 border border-amber-500/30 rounded-xl flex items-center justify-center text-amber-400">
              <FileJson size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Импорт и Экспорт тем Shorts (JSON)
              </h3>
              <p className="text-xs text-neutral-400">
                Быстрый обмен темами и идеями Shorts в универсальном формате JSON
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 p-1 bg-neutral-950 border border-neutral-850 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("import")}
            className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "import"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Upload size={14} />
            <span>Импорт из JSON</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("export")}
            className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "export"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Download size={14} />
            <span>Экспорт в JSON</span>
            {ideas.length > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500/30 text-amber-200 rounded-full text-[10px]">
                {ideas.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: IMPORT */}
        {activeTab === "import" && (
          <div className="space-y-4">
            {/* Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                dragActive
                  ? "border-amber-400 bg-amber-500/10"
                  : "border-neutral-800 bg-neutral-950/60 hover:border-neutral-700 hover:bg-neutral-900/40"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 mx-auto bg-neutral-900 rounded-2xl border border-neutral-800 flex items-center justify-center text-amber-400 mb-2">
                <Upload size={22} />
              </div>
              <p className="text-xs font-bold text-neutral-200">
                Нажмите для выбора файла .json или перетащите его сюда
              </p>
              <p className="text-[11px] text-neutral-500 mt-1">
                Поддерживается массив объектов с темами, хуками или просто список названий
              </p>
            </div>

            {/* Textarea Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  Или вставьте код JSON вручную:
                </label>
                {rawJsonText && (
                  <button
                    type="button"
                    onClick={() => setRawJsonText("")}
                    className="text-[10px] text-neutral-500 hover:text-neutral-300 underline cursor-pointer"
                  >
                    Очистить
                  </button>
                )}
              </div>
              <textarea
                value={rawJsonText}
                onChange={(e) => setRawJsonText(e.target.value)}
                placeholder={`[\n  { "title": "Как ускорить работу канала", "hook": "Секретная фишка 2026", "whyItWorks": "Высокий CTR" }\n]`}
                className="w-full h-36 bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-neutral-200 font-mono focus:outline-none focus:border-amber-500/60 transition-colors resize-none placeholder-neutral-600"
              />
            </div>

            {/* Parse Status & Preview */}
            {parsedResult && (
              <div className="space-y-3 p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl">
                {parsedResult.error ? (
                  <div className="flex items-center gap-2 text-rose-400 text-xs">
                    <AlertTriangle size={15} className="shrink-0" />
                    <span>{parsedResult.error}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-400">
                          Успешно распарсено {parsedResult.ideas.length} тем
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] text-neutral-400 font-medium">Режим:</label>
                        <select
                          value={importMode}
                          onChange={(e) => setImportMode(e.target.value as "append" | "replace")}
                          className="bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-200 px-2 py-1 focus:outline-none cursor-pointer"
                        >
                          <option value="append">➕ Добавить к текущим ({ideas.length})</option>
                          <option value="replace">🔄 Заменить текущий список</option>
                        </select>
                      </div>
                    </div>

                    {/* Topic Previews Chips */}
                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                      {parsedResult.ideas.map((item, idx) => (
                        <div
                          key={`parsed-preview-${idx}`}
                          className="flex items-center justify-between bg-neutral-900/80 p-2 rounded-lg text-xs text-neutral-300 border border-neutral-850"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] font-mono text-amber-400 font-bold shrink-0">
                              #{idx + 1}
                            </span>
                            <span className="font-medium truncate">{item.title}</span>
                          </div>
                          {item.hook && (
                            <span className="text-[10px] text-neutral-500 truncate max-w-[200px]">
                              Хук: {item.hook}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Import Submit Button */}
            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-850">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={!parsedResult || parsedResult.ideas.length === 0}
                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus size={14} />
                <span>Импортировать тем ({parsedResult?.ideas.length || 0})</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: EXPORT */}
        {activeTab === "export" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400 font-medium">
                Готово к экспорту тем:{" "}
                <strong className="text-amber-300 font-bold">{ideas.length} шт.</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyJSON}
                  disabled={ideas.length === 0}
                  className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
                >
                  {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copied ? "Скопировано!" : "Копировать JSON"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadJSON}
                  disabled={ideas.length === 0}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-black rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-40"
                >
                  <Download size={13} />
                  <span>Скачать .json</span>
                </button>
              </div>
            </div>

            {/* Code Viewer */}
            <div className="relative">
              <textarea
                readOnly
                value={exportJsonString}
                className="w-full h-72 bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-amber-300 font-mono focus:outline-none resize-none scrollbar-thin"
              />
            </div>
          </div>
        )}
      </div>
    </BaseModal>
  );
};
