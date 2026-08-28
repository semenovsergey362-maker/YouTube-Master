import React, { Component, ErrorInfo, ReactNode } from "react";
import { logger } from "../../config/logger";
import { parseAppError } from "../../utils/helpers";
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  title?: string;
  sectionName?: string;
  isSection?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error(
      `[ErrorBoundary] Uncaught error in ${this.props.sectionName || this.props.title || "Component"}:`,
      error,
      errorInfo
    );
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleClearCacheAndReload = () => {
    try {
      const keysToKeep = ["yt_client_id", "yt_client_secret", "yt_app_url"];
      const backup: Record<string, string> = {};
      keysToKeep.forEach((k) => {
        const v = localStorage.getItem(k);
        if (v) backup[k] = v;
      });
      localStorage.clear();
      Object.entries(backup).forEach(([k, v]) => localStorage.setItem(k, v));
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isSection = this.props.isSection;
      const name = this.props.sectionName || this.props.title || "Раздел приложения";
      const parsed = parseAppError(this.state.error);

      if (isSection) {
        return (
          <div className="p-6 my-4 bg-neutral-900/90 border border-rose-500/30 rounded-2xl text-center space-y-4 shadow-xl shadow-black/40">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">В разделе "{name}" возникло затруднение</h3>
              <p className="text-xs text-neutral-400 max-w-md mx-auto">{parsed.description}</p>
            </div>
            <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 text-left max-w-lg mx-auto overflow-auto max-h-24">
              <code className="text-[11px] text-rose-400 font-mono">
                {this.state.error?.message || "Неизвестная ошибка рендеринга"}
              </code>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 bg-primary text-black font-bold text-xs rounded-xl flex items-center gap-1.5 hover:brightness-110 cursor-pointer shadow-lg shadow-primary/20 transition-all"
              >
                <RefreshCw size={13} /> Повторить попытку
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-xl border border-neutral-700 cursor-pointer transition-all"
              >
                Перезагрузить страницу
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-4">
          <div className="max-w-lg w-full text-center bg-neutral-900 p-6 sm:p-8 rounded-3xl shadow-2xl border border-rose-500/30 space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle size={28} />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-white tracking-tight">{parsed.title}</h2>
              <p className="text-xs text-neutral-400 leading-relaxed">{parsed.description}</p>
            </div>
            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-left overflow-auto max-h-32">
              <code className="text-xs text-rose-400 font-mono">
                {this.state.error?.message || "Unknown error"}
              </code>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2.5 bg-primary text-black font-extrabold text-xs rounded-xl flex items-center gap-1.5 hover:brightness-110 cursor-pointer transition-all shadow-lg shadow-primary/20"
              >
                <RefreshCw size={14} /> Повторить
              </button>
              <button
                type="button"
                onClick={this.handleClearCacheAndReload}
                className="px-4 py-2.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Trash2 size={14} /> Сбросить кэш и восстановить
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-xl border border-neutral-700 cursor-pointer transition-all"
              >
                Перезагрузить
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
