import { logger } from "./config/logger";
import { initializeApp } from 'firebase/app';
import { safeStorage } from './lib/storage';
import { get as idbGet, set as idbSet } from './lib/idb';
import { getAuth as realGetAuth, GoogleAuthProvider as RealGoogleAuthProvider, signInWithPopup as realSignInWithPopup, onAuthStateChanged as realOnAuthStateChanged, User } from 'firebase/auth';
import { initializeFirestore as realInitializeFirestore } from 'firebase/firestore';
import { 
  collection as realCollection, 
  doc as realDoc, 
  setDoc as realSetDoc, 
  getDoc as realGetDoc, 
  getDocs as realGetDocs, 
  updateDoc as realUpdateDoc, 
  deleteDoc as realDeleteDoc, 
  query as realQuery, 
  where as realWhere, 
  onSnapshot as realOnSnapshot, 
  getDocFromServer as realGetDocFromServer,
  disableNetwork as realDisableNetwork
} from 'firebase/firestore';

// Import the Firebase configuration
import firebaseConfig from '../firebase-applet-config.json';

let isPlaceholder = !firebaseConfig.projectId || 
                      firebaseConfig.projectId.includes('remixed') || 
                      firebaseConfig.apiKey?.includes('remixed') || 
                      !firebaseConfig.apiKey;

// Initialize Firebase SDK or Mocks
let app: any;
let db: any;
let auth: any;
let googleProvider: any;

let localDataCache: any = null;
let isIdbLoaded = false;

// Async function to load and synchronize data from IndexedDB
async function syncFromIndexedDB() {
  try {
    const idbData = await idbGet('mock_firestore_data');
    if (idbData) {
      const localRaw = safeStorage.getItem('mock_firestore_data');
      const localData = localRaw ? JSON.parse(localRaw) : {};
      
      // Compare history items count to determine the most complete data
      const idbKeyCount = idbData.history ? Object.keys(idbData.history).length : 0;
      const localKeyCount = localData.history ? Object.keys(localData.history).length : 0;
      
      if (idbKeyCount > localKeyCount || (!localRaw && idbData)) {
        logger.log(`[Storage] Recovered ${idbKeyCount} history items from IndexedDB backup (Local had ${localKeyCount})`);
        localDataCache = idbData;
        
        // Write back to local storage if it fits
        try {
          safeStorage.setItem('mock_firestore_data', JSON.stringify(idbData));
        } catch (e) {
          logger.warn("[Storage] localStorage quota exceeded while syncing from IndexedDB, keeping in-memory and IDB");
        }
        
        // Notify any active history or other collection subscribers of the loaded data
        if (idbData.history) notifySubscribers('history');
        if (idbData.script_versions) notifySubscribers('script_versions');
        if (idbData.script_states) notifySubscribers('script_states');
      } else {
        // If local storage is more up-to-date, update IndexedDB in the background
        if (localRaw) {
          await idbSet('mock_firestore_data', localData);
        }
      }
    } else {
      // First time, write local storage contents to IndexedDB
      const localRaw = safeStorage.getItem('mock_firestore_data');
      if (localRaw) {
        await idbSet('mock_firestore_data', JSON.parse(localRaw));
      }
    }
  } catch (e) {
    logger.error("[Storage] Failed to sync mock_firestore_data with IndexedDB:", e);
  } finally {
    isIdbLoaded = true;
  }
}

// Trigger initial async sync on load
if (typeof window !== 'undefined') {
  syncFromIndexedDB();
}

// Helper to access mock localStorage data
function getLocalData() {
  if (localDataCache) return localDataCache;
  try {
    const raw = safeStorage.getItem('mock_firestore_data');
    localDataCache = raw ? JSON.parse(raw) : {};
    return localDataCache;
  } catch (e) {
    return {};
  }
}

function setLocalData(data: any) {
  localDataCache = data;
  
  // 1. Save to LocalStorage safely (never wipe the history on error!)
  try {
    safeStorage.setItem('mock_firestore_data', JSON.stringify(data));
  } catch (e: any) {
    logger.warn("[Storage] localStorage limit exceeded, using IndexedDB fallback:", e);
  }
  
  // 2. Save to IndexedDB asynchronously (which has unlimited storage) - but only if it's finished loading to prevent race condition overwrites
  if (typeof window !== 'undefined' && isIdbLoaded) {
    idbSet('mock_firestore_data', data).catch(err => {
      logger.error("[Storage] Failed to save mock_firestore_data to IndexedDB:", err);
    });
  }
}

const authListeners = new Set<(user: any) => void>();
const defaultMockUser = {
  uid: "mock-user-123",
  email: "7profesion@gmail.com",
  displayName: "YouTube Creator",
  photoURL: "https://lh3.googleusercontent.com/a/default-user=s96-c",
  emailVerified: true,
  isAnonymous: false,
  providerData: []
};

let mockUser: any = defaultMockUser;

// Determine initial mock user state & verify with server session
try {
  const isLoggedOut = safeStorage.getItem('mock_firebase_logged_out') === 'true';
  if (!isLoggedOut) {
    const savedUser = safeStorage.getItem('mock_firebase_user');
    if (savedUser) {
      mockUser = JSON.parse(savedUser);
    } else {
      mockUser = defaultMockUser;
    }
  } else {
    mockUser = null;
  }
} catch (e) {
  mockUser = defaultMockUser;
}

export async function refreshAuthSession(): Promise<any> {
  try {
    const res = await fetch("/api/auth/me", { credentials: "same-origin" });
    if (!res.ok) return null;
    
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) return null;
    
    const data = await res.json();
    if (data && data.user) {
      mockUser = {
        uid: data.user.id || data.user.email || "google-user",
        email: data.user.email,
        displayName: data.user.name || data.user.displayName || (data.user.email ? data.user.email.split('@')[0] : "Пользователь Google"),
        photoURL: data.user.picture || data.user.photoURL,
        emailVerified: true,
        isAnonymous: false,
        providerData: []
      };
      safeStorage.setItem('mock_firebase_user', JSON.stringify(mockUser));
      safeStorage.removeItem('mock_firebase_logged_out');
      authListeners.forEach(cb => cb(mockUser));
      return mockUser;
    } else {
      const isLoggedOut = safeStorage.getItem('mock_firebase_logged_out') === 'true';
      if (isLoggedOut) {
        mockUser = null;
        authListeners.forEach(cb => cb(null));
      }
    }
  } catch (e) {
    logger.error("Error checking session", e);
  }
  return mockUser;
}

// Session check with server on startup
if (typeof window !== 'undefined') {
  const checkSession = async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const u = await refreshAuthSession();
        if (u) return;
      } catch (e: any) {
        if (i === retries - 1 && e.message !== "Failed to fetch") {
          logger.error("Error checking session", e);
        }
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  };
  checkSession();
}

if (!isPlaceholder) {
  try {
    app = initializeApp(firebaseConfig);
    db = realInitializeFirestore(app, {
      experimentalForceLongPolling: true
    }, (firebaseConfig as any).firestoreDatabaseId);
    auth = realGetAuth();
    googleProvider = new RealGoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
  } catch (error) {
    logger.error("Failed to initialize real Firebase, falling back to mock mode", error);
    isPlaceholder = true;
  }
}

if (isPlaceholder) {
  app = { name: "mock-app" };
  db = { name: "mock-db" };
  auth = {
    get currentUser() {
      return mockUser;
    },
    signOut: async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch (e) {
        logger.error("Failed to log out from server", e);
      }
      mockUser = null;
      safeStorage.removeItem('mock_firebase_user');
      safeStorage.setItem('mock_firebase_logged_out', 'true');
      authListeners.forEach(cb => cb(null));
    }
  };
  googleProvider = {};
}

export { db, auth, isPlaceholder };
export const googleProviderInstance = googleProvider; // just in case

// Auth Helpers
export const signInWithGoogle = async () => {
  if (!isPlaceholder) {
    try {
      return await realSignInWithPopup(auth, googleProvider);
    } catch (e) {
      logger.warn("Real Firebase sign-in error, falling back to server OAuth:", e);
    }
  }
  
  return new Promise<any>(async (resolve, reject) => {
    try {
      const res = await fetch("/api/auth/url");
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Не удалось получить URL авторизации Google. Укажите Client ID и Secret в настройках.");
      }
      const data = await res.json();
      if (!data.url) {
        throw new Error("URL авторизации Google не найден в ответе");
      }

      const width = 600;
      const height = 650;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        data.url,
        "Google Auth",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        throw new Error("Блокировщик всплывающих окон заблокировал авторизацию. Пожалуйста, разрешите всплывающие окна.");
      }

      const messageListener = async (event: MessageEvent) => {
        const origin = event.origin;
        const allowedOrigin = (
          origin === window.location.origin ||
          origin.includes('localhost') ||
          origin.includes('127.0.0.1') ||
          origin.endsWith('.run.app') ||
          origin.includes('.vercel.app') ||
          origin.includes('.netlify.app')
        );

        if (!allowedOrigin) {
          return;
        }

        if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
          window.removeEventListener("message", messageListener);
          try {
            const meRes = await fetch("/api/auth/me");
            if (meRes.ok) {
              const meData = await meRes.json();
              if (meData.user) {
                mockUser = {
                  uid: meData.user.id || meData.user.email,
                  email: meData.user.email,
                  displayName: meData.user.name || meData.user.displayName,
                  photoURL: meData.user.picture || meData.user.photoURL,
                  emailVerified: true,
                  isAnonymous: false,
                  providerData: []
                };
                safeStorage.setItem('mock_firebase_user', JSON.stringify(mockUser));
                safeStorage.removeItem('mock_firebase_logged_out');
                authListeners.forEach(cb => cb(mockUser));
                resolve({ user: mockUser });
              } else {
                reject(new Error("Не удалось получить профиль пользователя."));
              }
            } else {
              reject(new Error("Не удалось получить данные сессии."));
            }
          } catch (err) {
            reject(err);
          }
        }
      };

      window.addEventListener("message", messageListener);

      const checkClosed = setInterval(async () => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setTimeout(async () => {
            try {
              const meRes = await fetch("/api/auth/me");
              if (meRes.ok) {
                const meData = await meRes.json();
                if (meData.user) {
                  mockUser = {
                    uid: meData.user.id || meData.user.email,
                    email: meData.user.email,
                    displayName: meData.user.name || meData.user.displayName,
                    photoURL: meData.user.picture || meData.user.photoURL,
                    emailVerified: true,
                    isAnonymous: false,
                    providerData: []
                  };
                  safeStorage.setItem('mock_firebase_user', JSON.stringify(mockUser));
                  safeStorage.removeItem('mock_firebase_logged_out');
                  authListeners.forEach(cb => cb(mockUser));
                  resolve({ user: mockUser });
                }
              }
            } catch (e) {
              logger.error(e);
            }
          }, 1000);
        }
      }, 1000);

    } catch (e) {
      reject(e);
    }
  });
};

export const logout = async () => {
  if (!isPlaceholder) {
    try {
      await auth.signOut();
    } catch (e) {
      logger.error("Firebase signOut error:", e);
    }
  }
  
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch (e) {
    logger.error("Failed to log out from server", e);
  }
  
  mockUser = null;
  safeStorage.removeItem('mock_firebase_user');
  safeStorage.setItem('mock_firebase_logged_out', 'true');
  authListeners.forEach(cb => cb(null));
};

async function migrateLocalMockDataToUserInFirebase(newUid: string) {
  try {
    const allData = getLocalData();
    let updated = false;

    // 1. Migrate mock history items (ANY item that doesn't have the newUid)
    if (allData.history) {
      for (const id in allData.history) {
        const item = allData.history[id];
        if (item && item.uid !== newUid) {
          item.uid = newUid;
          updated = true;
          if (!isPlaceholder) {
            try {
              await realSetDoc(realDoc(db, "history", id), item);
            } catch (err) {
              logger.error(`Failed to upload history item ${id} to Firestore`, err);
            }
          }
        }
      }
    }

    // 2. Migrate mock script versions
    if (allData.script_versions) {
      for (const id in allData.script_versions) {
        const version = allData.script_versions[id];
        if (version && version.uid !== newUid) {
          version.uid = newUid;
          updated = true;
          if (!isPlaceholder) {
            try {
              await realSetDoc(realDoc(db, "script_versions", id), version);
            } catch (err) {
              logger.error(`Failed to upload script version ${id} to Firestore`, err);
            }
          }
        }
      }
    }

    // 3. Migrate script states
    if (allData.script_states) {
      // Find any keys in script_states that are NOT newUid
      for (const uid in allData.script_states) {
        if (uid !== newUid) {
          const state = allData.script_states[uid];
          if (state) {
            allData.script_states[newUid] = { ...state, uid: newUid };
            delete allData.script_states[uid];
            updated = true;
            if (!isPlaceholder) {
              try {
                await realSetDoc(realDoc(db, "script_states", newUid), { ...state, uid: newUid }, { merge: true });
              } catch (err) {
                logger.error(`Failed to upload script state to Firestore`, err);
              }
            }
          }
        }
      }
    }

    if (updated) {
      setLocalData(allData);
      notifySubscribers('history');
      notifySubscribers('script_versions');
      notifySubscribers('script_states');
      logger.log(`[Storage] Successfully migrated and synchronized all local mock data to UID: ${newUid}`);
    }
  } catch (e) {
    logger.error("Failed to migrate local mock data:", e);
  }
}

export const onAuthStateChanged = (authObj: any, callback: (user: any) => void) => {
  const wrappedCallback = (userVal: any) => {
    callback(userVal || mockUser || null);
  };

  // Immediate callback with existing user state if available
  setTimeout(() => {
    callback(mockUser || (auth?.currentUser) || null);
  }, 0);

  authListeners.add(wrappedCallback);

  let unsubscribeReal: (() => void) | null = null;
  if (!isPlaceholder && auth) {
    try {
      unsubscribeReal = realOnAuthStateChanged(auth, async (userVal) => {
        if (userVal) {
          mockUser = {
            uid: userVal.uid,
            email: userVal.email,
            displayName: userVal.displayName,
            photoURL: userVal.photoURL,
            emailVerified: userVal.emailVerified,
            isAnonymous: userVal.isAnonymous,
            providerData: userVal.providerData
          };
          safeStorage.setItem('mock_firebase_user', JSON.stringify(mockUser));
          safeStorage.removeItem('mock_firebase_logged_out');
          await migrateLocalMockDataToUserInFirebase(userVal.uid);
          callback(userVal);
        } else if (!mockUser) {
          callback(null);
        }
      });
    } catch (err) {
      logger.warn("realOnAuthStateChanged registration skipped:", err);
    }
  }

  return () => {
    authListeners.delete(wrappedCallback);
    if (unsubscribeReal) {
      unsubscribeReal();
    }
  };
};

// Error Handling Spec for Firestore Operations
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentUser = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo: currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  logger.error('Firestore Error: ', JSON.stringify(errInfo));
  if (operationType !== OperationType.GET) {
    throw new Error(JSON.stringify(errInfo));
  }
}

// Connection Test
async function testConnection() {
  if (isPlaceholder) {
    logger.warn("Using robust offline Mock Firebase. Connect real Firebase anytime in Settings.");
    return;
  }
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Firebase connection timeout')), 2500)
    );
    await Promise.race([
      realGetDocFromServer(realDoc(db, 'test', 'connection')),
      timeoutPromise
    ]);
  } catch (error) {
    logger.warn("Firebase connection failed or database not provisioned. Falling back to offline mock mode.", error);
    try {
      if (db) {
        await realDisableNetwork(db);
      }
    } catch (e) {
      logger.warn("Failed to disable Firestore network:", e);
    }
    isPlaceholder = true;
  }
}
testConnection();

// Mock and Real Firestore functions
export function doc(dbOrCol: any, pathOrId: string, optionalId?: string): any {
  if (!isPlaceholder) {
    return realDoc(dbOrCol, pathOrId, optionalId as string);
  }
  let col: string;
  let id: string;
  if (optionalId) {
    col = pathOrId;
    id = optionalId;
  } else {
    if (dbOrCol && dbOrCol._collection) {
      col = dbOrCol._collection;
      id = pathOrId;
    } else {
      const parts = pathOrId.split('/');
      col = parts[0];
      id = parts[1] || Math.random().toString(36).substring(2, 15);
    }
  }
  return { _type: 'doc', _collection: col, _id: id };
}

export function collection(dbVal: any, path: string): any {
  if (!isPlaceholder) {
    return realCollection(dbVal, path);
  }
  return { _type: 'collection', _collection: path };
}

export async function setDoc(docRef: any, data: any, options?: any): Promise<void> {
  const sanitizedData = removeUndefined(data);
  if (!isPlaceholder) {
    try {
      return await realSetDoc(docRef, sanitizedData, options);
    } catch (err: any) {
      logger.warn("Firestore setDoc failed, falling back to mock mode:", err);
      isPlaceholder = true;
    }
  }
  const allData = getLocalData();
  const col = docRef._collection || (docRef.path ? docRef.path.split('/')[0] : 'default');
  const id = docRef._id || docRef.id || Math.random().toString(36).substring(2, 15);
  if (!allData[col]) {
    allData[col] = {};
  }
  if (options && options.merge) {
    allData[col][id] = { ...(allData[col][id] || {}), ...sanitizedData };
  } else {
    allData[col][id] = sanitizedData;
  }
  setLocalData(allData);
  notifySubscribers(col);
}

export async function updateDoc(docRef: any, data: any): Promise<void> {
  const sanitizedData = removeUndefined(data);
  if (!isPlaceholder) {
    try {
      return await realUpdateDoc(docRef, sanitizedData);
    } catch (err: any) {
      logger.warn("Firestore updateDoc failed, falling back to mock mode:", err);
      isPlaceholder = true;
    }
  }
  return setDoc(docRef, sanitizedData, { merge: true });
}

function removeUndefined(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item));
  }
  if (typeof obj === 'object') {
    if (obj.constructor && obj.constructor.name !== 'Object' && obj.constructor.name !== 'Array') {
      return obj;
    }
    const cleaned: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        if (val !== undefined) {
          cleaned[key] = removeUndefined(val);
        }
      }
    }
    return cleaned;
  }
  return obj;
}

export async function deleteDoc(docRef: any): Promise<void> {
  if (!isPlaceholder) {
    try {
      return await realDeleteDoc(docRef);
    } catch (err: any) {
      logger.warn("Firestore deleteDoc failed, falling back to mock mode:", err);
      isPlaceholder = true;
    }
  }
  const allData = getLocalData();
  const col = docRef._collection || (docRef.path ? docRef.path.split('/')[0] : 'default');
  const id = docRef._id || docRef.id;
  if (allData[col] && allData[col][id]) {
    delete allData[col][id];
    setLocalData(allData);
    notifySubscribers(col);
  }
}

export function query(collectionRef: any, ...constraints: any[]): any {
  if (!isPlaceholder) {
    return realQuery(collectionRef, ...constraints);
  }
  return { _type: 'query', _collection: collectionRef._collection || (collectionRef.path ? collectionRef.path.split('/')[0] : 'default'), _constraints: constraints };
}

export function where(field: string, operator: any, value: any): any {
  if (!isPlaceholder) {
    return realWhere(field, operator, value);
  }
  return { _type: 'where', field, operator, value };
}

const subscribers = new Set<{
  collectionName: string;
  callback: (snapshot: any) => void;
}>();

function notifySubscribers(collectionName: string) {
  subscribers.forEach((sub) => {
    if (sub.collectionName === collectionName) {
      sub.callback(generateMockSnapshot(collectionName));
    }
  });
}

function generateMockSnapshot(collectionName: string) {
  const allData = getLocalData();
  const colData = allData[collectionName] || {};
  const docs = Object.keys(colData).map((id) => {
    const docData = colData[id];
    return {
      id,
      data: () => docData,
    };
  });
  return {
    docs,
  };
}

export function onSnapshot(
  target: any,
  onNext: (snapshot: any) => void,
  onError?: (error: any) => void
): () => void {
  if (!isPlaceholder) {
    try {
      return realOnSnapshot(
        target,
        onNext,
        (error) => {
          logger.warn("Firestore onSnapshot connection error, falling back to mock mode:", error);
          isPlaceholder = true;
          if (onError) onError(error);
          const col = target._collection || (target.path ? target.path.split('/')[0] : 'default');
          onNext(generateMockSnapshot(col));
        }
      );
    } catch (err) {
      logger.warn("Firestore onSnapshot initialization failed, falling back to mock mode:", err);
      isPlaceholder = true;
    }
  }

  const colName = target._collection || (target.path ? target.path.split('/')[0] : 'default');
  const sub = {
    collectionName: colName,
    callback: (snapshot: any) => {
      if (target._type === 'query') {
        const constraints = target._constraints || [];
        let filteredDocs = [...snapshot.docs];
        for (const constraint of constraints) {
          if (constraint && constraint._type === 'where') {
            const { field, operator, value } = constraint;
            filteredDocs = filteredDocs.filter((d) => {
              const data = d.data();
              if (operator === '==') {
                return data && data[field] === value;
              }
              return true;
            });
          }
        }
        onNext({ docs: filteredDocs });
      } else {
        onNext(snapshot);
      }
    },
  };

  subscribers.add(sub);

  // Trigger initial callback
  setTimeout(() => {
    sub.callback(generateMockSnapshot(colName));
  }, 0);

  return () => {
    subscribers.delete(sub);
  };
}

export async function getDoc(docRef: any): Promise<any> {
  if (!isPlaceholder) {
    try {
      return await realGetDoc(docRef);
    } catch (err: any) {
      logger.warn("Firestore getDoc failed, falling back to mock mode:", err);
      isPlaceholder = true;
    }
  }
  const allData = getLocalData();
  const col = docRef._collection || (docRef.path ? docRef.path.split('/')[0] : 'default');
  const id = docRef._id || docRef.id;
  const docData = allData[col]?.[id];
  return {
    id,
    exists: () => !!docData,
    data: () => docData,
  };
}

export async function getDocs(queryVal: any): Promise<any> {
  if (!isPlaceholder) {
    try {
      return await realGetDocs(queryVal);
    } catch (err: any) {
      logger.warn("Firestore getDocs failed, falling back to mock mode:", err);
      isPlaceholder = true;
    }
  }
  const colName = queryVal._collection || (queryVal.path ? queryVal.path.split('/')[0] : 'default');
  const snapshot = generateMockSnapshot(colName);
  let filteredDocs = [...snapshot.docs];
  if (queryVal._type === 'query') {
    const constraints = queryVal._constraints || [];
    for (const constraint of constraints) {
      if (constraint && constraint._type === 'where') {
        const { field, operator, value } = constraint;
        filteredDocs = filteredDocs.filter((d) => {
          const data = d.data();
          if (operator === '==') {
            return data && data[field] === value;
          }
          return true;
        });
      }
    }
  }
  return {
    docs: filteredDocs,
  };
}

export type { User };
