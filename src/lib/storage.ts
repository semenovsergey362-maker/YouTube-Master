/**
 * Safe wrapper for localStorage to prevent Uncaught SecurityError and QuotaExceededError
 */
export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      // Proactively free up cache if localStorage size is high (> 3MB)
      let totalLength = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) {
          totalLength += (k.length + (localStorage.getItem(k)?.length || 0)) * 2;
        }
      }
      if (totalLength > 3 * 1024 * 1024) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('gemini_cache_') || k.startsWith('autosave_') || k.includes('_cache') || k === 'gemini_request_log')) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      }

      localStorage.setItem(key, value);
    } catch (e) {
      // Emergency cleanup on QuotaExceededError
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k !== key) {
            if (k.startsWith('gemini_cache_') || k.startsWith('autosave_') || k.includes('_cache') || k === 'mock_firestore_data' || k === 'gemini_request_log') {
              keysToRemove.push(k);
            }
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
        localStorage.setItem(key, value);
      } catch (retryErr) {
        try {
          if (value.length > 200000) {
            localStorage.setItem(key, value.substring(0, 100000));
          }
        } catch (e3) {
          // Ignore gracefully
        }
      }
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  }
};

