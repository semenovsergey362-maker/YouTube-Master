import React, { useState, useEffect } from "react";
import {
  X,
  Key,
  Youtube,
  Bot,
  Sliders,
  Maximize2,
  Minimize2,
  Terminal,
  LogOut,
  User,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Download,
  FileText,
  Sparkles,
  HelpCircle,
  Shield,
  Layers,
  Database,
  Trash2,
  Info
} from "lucide-react";
import { toast } from "sonner";

interface AppSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  handleSignIn: () => void;
  handleSignOut: () => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  models: Array<{ id: string; name: string; limitText?: string; desc?: string }>;
  deepResearch: boolean;
  setDeepResearch: (val: boolean) => void;
  isCustomInstructionsEnabled: boolean;
  setShowCustomInstructionsModal: (val: boolean) => void;
  setShowModelLimitsModal: (val: boolean) => void;
  debugEnabled: boolean;
  setDebugEnabled: (val: boolean) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (val: boolean) => void;
  downloadPDF: () => void;
  downloadZIP: () => void;
  startTour: () => void;
  setShowFAQModal: (val: boolean) => void;
}

export const AppSettingsModal: React.FC<AppSettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  handleSignIn,
  handleSignOut,
  selectedModel,
  setSelectedModel,
  models,
  deepResearch,
  setDeepResearch,
  isCustomInstructionsEnabled,
  setShowCustomInstructionsModal,
  setShowModelLimitsModal,
  debugEnabled,
  setDebugEnabled,
  isSidebarOpen,
  setIsSidebarOpen,
  downloadPDF,
  downloadZIP,
  startTour,
  setShowFAQModal,
}) => {
  // YouTube OAuth Keys state
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [appUrl, setAppUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [hasCopiedUrl, setHasCopiedUrl] = useState(false);
  const [hasCopiedCallback, setHasCopiedCallback] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    // Load saved settings
    const loadSettings = async () => {
      try {
        const keysRes = await fetch("/api/settings/youtube");
        if (keysRes.ok) {
          const keys = await keysRes.json();
          if (keys.clientId) setClientId(keys.clientId);
          if (keys.clientSecret) setClientSecret(keys.clientSecret);
        } else {
          // LocalStorage fallback
          const lId = localStorage.getItem("yt_client_id") || "";
          const lSec = localStorage.getItem("yt_client_secret") || "";
          if (lId) setClientId(lId);
          if (lSec) setClientSecret(lSec);
        }

        const urlRes = await fetch("/api/settings/app-url");
        if (urlRes.ok) {
          const u = await urlRes.json();
          if (u.appUrl) setAppUrl(u.appUrl);
          else setAppUrl(window.location.origin);
        } else {
          setAppUrl(localStorage.getItem("yt_app_url") || window.location.origin);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    };

    loadSettings();

    // Listen to oauth success events while modal is open
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "oauth_auth_success") {
        toast.success("Вход выполнен! Данные синхронизированы.");
        loadSettings();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [isOpen]);

  if (!isOpen) return null;

  const callbackUrl = `${(appUrl || (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/$/, "")}/auth/callback`;

  const copyToClipboard = (text: string, isCallback = false) => {
    navigator.clipboard.writeText(text);
    if (isCallback) {
      setHasCopiedCallback(true);
      setTimeout(() => setHasCopiedCallback(false), 2000);
    } else {
      setHasCopiedUrl(true);
      setTimeout(() => setHasCopiedUrl(false), 2000);
    }
    toast.success("Скопировано в буфер обмена");
  };

  const handleSaveYouTubeSettings = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem("yt_client_id", clientId);
      localStorage.setItem("yt_client_secret", clientSecret);
      localStorage.setItem("yt_app_url", appUrl);

      const res = await fetch("/api/settings/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, clientSecret }),
      });

      const urlRes = await fetch("/api/settings/app-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appUrl }),
      });

      if (res.ok && urlRes.ok) {
        toast.success("Настройки успешно сохранены!");
      } else {
        toast.warning("Настройки сохранены локально.");
      }
    } catch (e: any) {
      toast.error("Ошибка при сохранении: " + (e.message || "Неизвестная ошибка"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const res = await fetch("/api/youtube/stats");
      if (res.ok) {
        const data = await res.json();
        if (data.title) {
          toast.success(`Канал подключен: ${data.title} (${data.subscriberCount || 0} подп.)`);
        } else {
          toast.info("Подключение активно (демо-режим или пустой канал)");
        }
      } else if (res.status === 401) {
        toast.info("Ключи сохранены. Для подключения канала нажмите 'Войти' или перейдите во вкладку YouTube");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.warning(data.error || "Проверьте учетные данные в Google Cloud");
      }
    } catch (e: any) {
      toast.error("Ошибка проверки: " + e.message);
    } finally {
      setIsTesting(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        toast.info("Полноэкранный режим не поддерживается или заблокирован браузером");
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleClearCache = () => {
    try {
      const keysToKeep = ["yt_client_id", "yt_client_secret", "yt_app_url"];
      const backup: Record<string, string> = {};
      keysToKeep.forEach((k) => {
        const v = localStorage.getItem(k);
        if (v) backup[k] = v;
      });
      localStorage.clear();
      Object.entries(backup).forEach(([k, v]) => localStorage.setItem(k, v));
      toast.success("Кэш очищен. Перезагрузка страницы...");
      setTimeout(() => window.location.reload(), 1000);
    } catch {
      toast.error("Не удалось очистить кэш");
    }
  };

  return (
    <div
      id="app-settings-modal"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <Key size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">Настройки YouTube API</h3>
              <p className="text-xs text-neutral-400">Управление ключами и авторизацией OAuth</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-all cursor-pointer"
            title="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-neutral-200">
          <div className="space-y-5">
            <div className="p-4 bg-neutral-950/60 border border-neutral-800 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider">
                  <Shield size={14} />
                  <span>Google Cloud OAuth 2.0 Credentials</span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Для интеграции с YouTube и входа с аккаунтов укажите <strong>OAuth Client ID</strong> и{" "}
                  <strong>Client Secret</strong> из вашей консоли Google Cloud.
                </p>
              </div>

              {/* Redirect URI Info */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-400">
                  Authorized Redirect URI (Добавьте в Google Cloud Console):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={callbackUrl}
                    className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 select-all outline-none"
                  />
                  <button
                    onClick={() => copyToClipboard(callbackUrl, true)}
                    className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {hasCopiedCallback ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{hasCopiedCallback ? "Скопировано" : "Копировать"}</span>
                  </button>
                </div>
              </div>

              {/* App URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-400">
                  App Origin URL (Базовый адрес приложения):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={appUrl}
                    onChange={(e) => setAppUrl(e.target.value)}
                    placeholder="https://ais-pre-...run.app или http://localhost:3000"
                    className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-neutral-200 focus:border-primary focus:outline-none"
                  />
                  <button
                    onClick={() => copyToClipboard(appUrl, false)}
                    className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {hasCopiedUrl ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{hasCopiedUrl ? "Скопировано" : "Копировать"}</span>
                  </button>
                </div>
              </div>

              {/* Client ID */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-400">Client ID:</label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value.trim())}
                  placeholder="xxxx.apps.googleusercontent.com"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-neutral-200 focus:border-primary focus:outline-none"
                />
              </div>

              {/* Client Secret */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-400">Client Secret:</label>
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value.trim())}
                  placeholder="GOCSPX-..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-neutral-200 focus:border-primary focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-bold"
                >
                  <ExternalLink size={13} />
                  <span>Google Cloud Console (Credentials)</span>
                </a>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw size={13} className={isTesting ? "animate-spin" : ""} />
                    <span>{isTesting ? "Проверка..." : "Тест подключения"}</span>
                  </button>

                  <button
                    onClick={handleSaveYouTubeSettings}
                    disabled={isSaving}
                    className="px-5 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-lg shadow-primary/20"
                  >
                    {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                    <span>{isSaving ? "Сохранение..." : "Сохранить настройки"}</span>
                  </button>
                </div>
              </div>
            </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-neutral-950/60 flex items-center justify-between text-xs text-neutral-500">
          <span>NicheMaster AI Channel Architect • v1.0</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-bold transition-all cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
