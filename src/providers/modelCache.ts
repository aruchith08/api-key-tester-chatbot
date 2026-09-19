import type { AIModel } from './types';

interface CachedEntry {
  models: AIModel[];
  timestamp: number;
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const providerModelCache = new Map<string, CachedEntry>();

/**
 * Normalizes provider IDs for consistent cache lookup.
 */
export function normalizeProviderId(id: string): string {
  const clean = id.toLowerCase().trim();
  if (clean === 'nvidia' || clean === 'nvidia-nim') return 'nvidia';
  return clean;
}

/**
 * Creates a deterministic, non-reversible credential fingerprint.
 * Ensures the actual API key is NEVER stored or leaked in cache keys.
 */
export function createCredentialFingerprint(apiKey?: string): string {
  if (!apiKey || !apiKey.trim()) return 'anonymous';

  // Deterministic 64-bit non-reversible hash
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < apiKey.length; i++) {
    const code = apiKey.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 0x01000193);
    h2 = Math.imul(h2 ^ ((code << 5) | (code >>> 27)), 0x5bd1e995);
  }

  return `fp_${(h1 >>> 0).toString(16)}_${(h2 >>> 0).toString(16)}`;
}

/**
 * Generates an isolated cache key combining normalized provider ID and credential fingerprint.
 */
function getCacheKey(providerId: string, apiKey?: string): string {
  const pId = normalizeProviderId(providerId);
  const fp = createCredentialFingerprint(apiKey);
  return `${pId}::${fp}`;
}

/**
 * Returns cached models for a provider and credential context if available and not expired.
 */
export function getCachedModels(providerId: string, apiKey?: string): AIModel[] | null {
  const key = getCacheKey(providerId, apiKey);
  const entry = providerModelCache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    providerModelCache.delete(key);
    return null;
  }

  return entry.models;
}

/**
 * Stores models in the cache isolated by provider ID and credential fingerprint.
 */
export function setCachedModels(providerId: string, models: AIModel[], apiKey?: string): void {
  const key = getCacheKey(providerId, apiKey);
  providerModelCache.set(key, {
    models,
    timestamp: Date.now()
  });
}

/**
 * Clears cached models. Can target a specific provider and optional credential context, or all providers.
 */
export function invalidateModelCache(providerId?: string, apiKey?: string): void {
  if (providerId) {
    if (apiKey) {
      const key = getCacheKey(providerId, apiKey);
      providerModelCache.delete(key);
    } else {
      const prefix = `${normalizeProviderId(providerId)}::`;
      for (const key of providerModelCache.keys()) {
        if (key.startsWith(prefix) || key === normalizeProviderId(providerId)) {
          providerModelCache.delete(key);
        }
      }
    }
  } else {
    providerModelCache.clear();
  }
}
