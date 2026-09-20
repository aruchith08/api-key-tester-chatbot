import type { StoredApiKey, StorageTarget, StoredKeysExportData } from '../types/storage';
import { maskApiKey } from '../utils/maskApiKey';

const LOCAL_STORAGE_KEY = 'arh_stored_api_keys_v1';
const SESSION_STORAGE_KEY = 'arh_session_api_keys_v1';
const CIPHER_PREFIX = 'arh_enc::';

// In-memory fallback for environments without storage access (e.g. Node tests or restricted iframes)
const memoryStore = {
  local: new Map<string, string>(),
  session: new Map<string, string>()
};

function getStorage(target: StorageTarget): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    const storage = target === 'localStorage' ? window.localStorage : window.sessionStorage;
    // Test availability
    const testKey = '__storage_test__';
    storage.setItem(testKey, testKey);
    storage.removeItem(testKey);
    return storage;
  } catch (e) {
    return null;
  }
}

/**
 * Basic client-side obfuscation to avoid leaving raw sensitive strings in plain text
 */
function obfuscateKey(rawKey: string): string {
  if (!rawKey) return '';
  try {
    if (typeof btoa === 'function') {
      const reversed = rawKey.split('').reverse().join('');
      return `${CIPHER_PREFIX}${btoa(encodeURIComponent(reversed))}`;
    }
    return rawKey;
  } catch (e) {
    return rawKey;
  }
}

function deobfuscateKey(obfuscated: string): string {
  if (!obfuscated) return '';
  if (!obfuscated.startsWith(CIPHER_PREFIX)) {
    return obfuscated; // Legacy or plain string
  }
  try {
    const payload = obfuscated.substring(CIPHER_PREFIX.length);
    if (typeof atob === 'function') {
      const reversed = decodeURIComponent(atob(payload));
      return reversed.split('').reverse().join('');
    }
    return payload;
  } catch (e) {
    return obfuscated;
  }
}

interface RawStoredRecord {
  id: string;
  name: string;
  providerId: string;
  providerName: string;
  encKey: string;
  storageTarget: StorageTarget;
  customConfig?: StoredApiKey['customConfig'];
  createdAt: number;
  lastUsedAt?: number;
  lastValidatedAt?: number;
  lastStatus?: 'valid' | 'invalid' | 'untested';
  lastLatencyMs?: number;
}

function readFromTarget(target: StorageTarget): StoredApiKey[] {
  const storageKey = target === 'localStorage' ? LOCAL_STORAGE_KEY : SESSION_STORAGE_KEY;
  const storage = getStorage(target);

  let rawJson: string | null = null;
  if (storage) {
    rawJson = storage.getItem(storageKey);
  } else {
    rawJson = (target === 'localStorage' ? memoryStore.local : memoryStore.session).get(storageKey) || null;
  }

  if (!rawJson) return [];

  try {
    const parsed: RawStoredRecord[] = JSON.parse(rawJson);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item) => {
      const realKey = deobfuscateKey(item.encKey);
      return {
        id: item.id,
        name: item.name || item.providerName || 'API Key',
        providerId: item.providerId,
        providerName: item.providerName,
        apiKey: realKey,
        maskedKey: maskApiKey(realKey),
        storageTarget: target,
        customConfig: item.customConfig,
        createdAt: item.createdAt || Date.now(),
        lastUsedAt: item.lastUsedAt,
        lastValidatedAt: item.lastValidatedAt,
        lastStatus: item.lastStatus || 'untested',
        lastLatencyMs: item.lastLatencyMs
      };
    });
  } catch (e) {
    console.error(`[ApiKeyStorage] Failed parsing stored keys for ${target}:`, e);
    return [];
  }
}

function writeToTarget(target: StorageTarget, items: StoredApiKey[]): boolean {
  const storageKey = target === 'localStorage' ? LOCAL_STORAGE_KEY : SESSION_STORAGE_KEY;
  const storage = getStorage(target);

  const rawRecords: RawStoredRecord[] = items.map((item) => ({
    id: item.id,
    name: item.name,
    providerId: item.providerId,
    providerName: item.providerName,
    encKey: obfuscateKey(item.apiKey),
    storageTarget: target,
    customConfig: item.customConfig,
    createdAt: item.createdAt,
    lastUsedAt: item.lastUsedAt,
    lastValidatedAt: item.lastValidatedAt,
    lastStatus: item.lastStatus,
    lastLatencyMs: item.lastLatencyMs
  }));

  const jsonStr = JSON.stringify(rawRecords);

  try {
    if (storage) {
      storage.setItem(storageKey, jsonStr);
    } else {
      (target === 'localStorage' ? memoryStore.local : memoryStore.session).set(storageKey, jsonStr);
    }
    return true;
  } catch (e) {
    console.error(`[ApiKeyStorage] Failed writing to ${target}:`, e);
    return false;
  }
}

let lastTimestamp = 0;
function getMonotonicTimestamp(): number {
  const now = Date.now();
  if (now <= lastTimestamp) {
    lastTimestamp += 1;
  } else {
    lastTimestamp = now;
  }
  return lastTimestamp;
}

export const ApiKeyStorage = {
  /**
   * Retrieve all stored keys from both localStorage and sessionStorage,
   * sorted by most recently used (or created).
   */
  getAll(): StoredApiKey[] {
    const local = readFromTarget('localStorage');
    const session = readFromTarget('sessionStorage');

    const combined = [...local, ...session];
    return combined.sort((a, b) => {
      const timeA = a.lastUsedAt || a.createdAt;
      const timeB = b.lastUsedAt || b.createdAt;
      if (timeB !== timeA) return timeB - timeA;
      return b.createdAt - a.createdAt;
    });
  },

  getById(id: string): StoredApiKey | undefined {
    return this.getAll().find((k) => k.id === id);
  },

  /**
   * Save a new API key or update an existing one.
   */
  save(entry: {
    id?: string;
    name?: string;
    providerId: string;
    providerName: string;
    apiKey: string;
    storageTarget?: StorageTarget;
    customConfig?: StoredApiKey['customConfig'];
    createdAt?: number;
    lastStatus?: 'valid' | 'invalid' | 'untested';
    lastLatencyMs?: number;
  }): StoredApiKey {
    const target = entry.storageTarget || 'localStorage';
    const trimmedKey = entry.apiKey.trim();
    const now = getMonotonicTimestamp();
    const id = entry.id || `key_${now}_${Math.random().toString(36).substring(2, 7)}`;

    const storedItem: StoredApiKey = {
      id,
      name: (entry.name && entry.name.trim()) || entry.providerName || 'API Key',
      providerId: entry.providerId,
      providerName: entry.providerName,
      apiKey: trimmedKey,
      maskedKey: maskApiKey(trimmedKey),
      storageTarget: target,
      customConfig: entry.customConfig,
      createdAt: entry.createdAt || now,
      lastUsedAt: now,
      lastValidatedAt: entry.lastStatus === 'valid' ? now : undefined,
      lastStatus: entry.lastStatus || 'untested',
      lastLatencyMs: entry.lastLatencyMs
    };

    // If item existed in the other target, clean it up
    const otherTarget: StorageTarget = target === 'localStorage' ? 'sessionStorage' : 'localStorage';
    const otherItems = readFromTarget(otherTarget).filter((k) => k.id !== id);
    writeToTarget(otherTarget, otherItems);

    const currentItems = readFromTarget(target).filter((k) => k.id !== id);
    currentItems.unshift(storedItem);
    writeToTarget(target, currentItems);

    return storedItem;
  },

  /**
   * Update properties on an existing stored key
   */
  update(id: string, updates: Partial<Omit<StoredApiKey, 'id'>>): StoredApiKey | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const newTarget = updates.storageTarget || existing.storageTarget;
    const updated: StoredApiKey = {
      ...existing,
      ...updates,
      id: existing.id,
      maskedKey: updates.apiKey ? maskApiKey(updates.apiKey) : existing.maskedKey,
      storageTarget: newTarget
    };

    // If storage target changed, remove from old and write to new
    if (newTarget !== existing.storageTarget) {
      const oldList = readFromTarget(existing.storageTarget).filter((k) => k.id !== id);
      writeToTarget(existing.storageTarget, oldList);

      const newList = readFromTarget(newTarget).filter((k) => k.id !== id);
      newList.unshift(updated);
      writeToTarget(newTarget, newList);
    } else {
      const list = readFromTarget(newTarget).map((k) => (k.id === id ? updated : k));
      writeToTarget(newTarget, list);
    }

    return updated;
  },

  /**
   * Mark key as used right now
   */
  touchUsed(id: string): void {
    this.update(id, { lastUsedAt: Date.now() });
  },

  /**
   * Delete a key by ID
   */
  remove(id: string): boolean {
    const local = readFromTarget('localStorage');
    const filteredLocal = local.filter((k) => k.id !== id);
    const removedLocal = filteredLocal.length !== local.length;
    if (removedLocal) {
      writeToTarget('localStorage', filteredLocal);
    }

    const session = readFromTarget('sessionStorage');
    const filteredSession = session.filter((k) => k.id !== id);
    const removedSession = filteredSession.length !== session.length;
    if (removedSession) {
      writeToTarget('sessionStorage', filteredSession);
    }

    return removedLocal || removedSession;
  },

  /**
   * Clear all stored keys across both storages
   */
  clearAll(): void {
    writeToTarget('localStorage', []);
    writeToTarget('sessionStorage', []);
  },

  /**
   * Export all keys as a sanitized JSON backup
   */
  exportJson(): string {
    const all = this.getAll();
    const data: StoredKeysExportData = {
      version: 1,
      exportedAt: Date.now(),
      keys: all.map(({ id, ...rest }) => rest)
    };
    return JSON.stringify(data, null, 2);
  },

  /**
   * Import keys from JSON string
   */
  importJson(jsonStr: string): { imported: number; errors: number } {
    try {
      const parsed = JSON.parse(jsonStr);
      const keysList = Array.isArray(parsed) ? parsed : parsed.keys;

      if (!Array.isArray(keysList)) {
        return { imported: 0, errors: 1 };
      }

      let imported = 0;
      let errors = 0;

      for (const item of keysList) {
        if (!item || !item.apiKey || !item.providerId) {
          errors++;
          continue;
        }

        this.save({
          name: item.name,
          providerId: item.providerId,
          providerName: item.providerName || item.providerId,
          apiKey: item.apiKey,
          storageTarget: item.storageTarget === 'sessionStorage' ? 'sessionStorage' : 'localStorage',
          customConfig: item.customConfig,
          createdAt: item.createdAt || Date.now(),
          lastStatus: item.lastStatus || 'untested'
        });
        imported++;
      }

      return { imported, errors };
    } catch (e) {
      return { imported: 0, errors: 1 };
    }
  }
};
