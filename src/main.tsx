
import { logger } from "./config/logger";
import { StrictMode, Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { AppProvider } from './context/AppContext';
import { Toaster } from 'sonner';
import { parseAppError } from './utils/helpers';

/**
 * Detailed Error Handler & Logger for Debugging
 */
function logDetailedError(source: string, error: unknown, extraInfo?: Record<string, any>) {
  const timestamp = new Date().toISOString();
  const errorObj = error instanceof Error ? error : new Error(String(error));
  const isWsError = 
    errorObj.message.includes('WebSocket') ||
    errorObj.message.includes('closed without opened') ||
    errorObj.message.includes('ws://') ||
    errorObj.message.includes('wss://');

  if (isWsError) {
    return;
  }

  if (logger.isDebugEnabled()) {
    console.groupCollapsed(
      `%c[Error Logger] ❌ UI / Runtime Error - ${source} (${timestamp})`,
      'color: #ef4444; font-weight: bold;'
    );
    logger.error('Error Message:', errorObj.message);
    logger.error('Stack Trace:', errorObj.stack || 'No stack trace available');
    if (extraInfo) {
      logger.info('Context Info:', extraInfo);
    }
    console.groupEnd();
  }
}

// Global unhandled error listener
window.addEventListener('error', (event) => {
  logDetailedError('Uncaught Window Error', event.error || event.message, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

// Global unhandled promise rejection listener
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  if (!reason) {
    event.preventDefault();
    return;
  }

  const msg = reason instanceof Error ? reason.message : String(reason);
  const isIgnorable =
    reason.name === 'AbortError' ||
    msg.includes('closed without opened') ||
    msg.includes('WebSocket') ||
    msg.includes('canceled') ||
    msg.includes('cancelled') ||
    msg.includes('ResizeObserver') ||
    msg.includes('QuotaExceededError') ||
    msg === 'undefined';

  logDetailedError('Unhandled Promise Rejection', reason, {
    isSuppressedFromUI: isIgnorable,
  });

  if (isIgnorable) {
    event.preventDefault();
  }
});

export class ErrorBoundary extends Component<{
  children: ReactNode;
  fallback?: ReactNode;
  title?: string;
  sectionName?: string;
  isSection?: boolean;
}, {
  hasError: boolean;
  error: Error | null;
}> {
  public state = {
    hasError: false,
    error: null as Error | null
  };

  public static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error(`[ErrorBoundary] Uncaught error in ${this.props.sectionName || this.props.title || 'Component'}:`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isSection = this.props.isSection;
      const name = this.props.sectionName || this.props.title || 'Компонент';
      const parsed = parseAppError(this.state.error);

      return (
        <div className={isSection ? "p-4 border border-red-200 rounded-xl bg-red-50/80 my-4" : "min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4"}>
          <div className="max-w-md w-full text-center bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
              {parsed.title}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              {parsed.description}
            </p>
            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-left mb-5 overflow-auto max-h-32">
              <code className="text-xs text-red-500 font-mono">
                {this.state.error?.message || 'Unknown error'}
              </code>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, error: null })}
                className="inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 cursor-pointer"
              >
                Повторить
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem('yt_niche_data');
                    localStorage.removeItem('yt_ideas_state');
                  } catch {}
                  window.location.reload();
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-amber-600 hover:bg-amber-700 focus:outline-none cursor-pointer"
              >
                Сбросить кэш и перезапустить
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none cursor-pointer"
              >
                Перезагрузить страницу
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary title="Приложение">
      <AppProvider>
        <Toaster position="top-right" richColors />
        <App />
      </AppProvider>
    </ErrorBoundary>
  </StrictMode>
);
