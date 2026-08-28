import { logger } from "../config/logger";
const DB_NAME = 'YouTubeGenDB';
const STORE_NAME = 'handles';

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      if (typeof indexedDB === 'undefined') {
        return reject(new Error('IndexedDB is not supported'));
      }
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        try {
          request.result.createObjectStore(STORE_NAME);
        } catch (e) {
          reject(e);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
    } catch (err) {
      reject(err);
    }
  });
}

export async function set(key: string, val: any): Promise<void> {
  try {
    const db = await getDB();
    return await new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(val, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('IDB put error'));
      } catch (err) {
        reject(err);
      }
    });
  } catch (e) {
    logger.warn(`IDB set failed for key "${key}":`, e);
  }
}

export async function get(key: string): Promise<any> {
  try {
    const db = await getDB();
    return await new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || tx.error || new Error('IDB get error'));
      } catch (err) {
        reject(err);
      }
    });
  } catch (e) {
    logger.warn(`IDB get failed for key "${key}":`, e);
    return null;
  }
}

