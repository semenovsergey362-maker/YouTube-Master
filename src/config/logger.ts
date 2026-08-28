/**
 * Logger utility for conditional and structured logging controlled by debugEnabled flag
 */

class Logger {
  private debugEnabled: boolean;

  constructor() {
    let initialValue = false;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        initialValue = window.localStorage.getItem('yt_debug_enabled') === 'true';
      }
    } catch {
      initialValue = false;
    }
    this.debugEnabled = initialValue;
  }

  public setDebugEnabled(enabled: boolean) {
    this.debugEnabled = enabled;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('yt_debug_enabled', String(enabled));
      }
    } catch {
      // safe fallback
    }
  }

  public isDebugEnabled(): boolean {
    return this.debugEnabled;
  }

  public log(...args: any[]) {
    if (this.debugEnabled) {
      console.log(...args);
    }
  }

  public debug(...args: any[]) {
    if (this.debugEnabled) {
      console.debug(...args);
    }
  }

  public info(...args: any[]) {
    if (this.debugEnabled) {
      console.info(...args);
    }
  }

  public warn(...args: any[]) {
    if (this.debugEnabled) {
      console.warn(...args);
    }
  }

  public error(...args: any[]) {
    if (this.debugEnabled) {
      console.error(...args);
    }
  }
}

export const logger = new Logger();
