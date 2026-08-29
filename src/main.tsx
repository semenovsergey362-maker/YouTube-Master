
import { logger } from "./config/logger";
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { AppProvider } from './context/AppContext';
import { Toaster } from 'sonner';
import { ErrorBoundary } from './components/common/ErrorBoundary';

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
