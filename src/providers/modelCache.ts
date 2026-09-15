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
function normalizeProviderId(id: string): string {
  const clean = id.toLowerCase().trim();
  if (clean === 'nvidia' || clean === 'nvidia-nim') return 'nvidia';
  return clean;
}

/**
 * Returns cached models if available and not expired.
 */
export function getCachedModels(providerId: string): AIModel[] | null {
  const key = normalizeProviderId(providerId);
  const entry = providerModelCache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    providerModelCache.delete(key);
    return null;
  }

  return entry.models;
}

/**
 * Stores models in the provider cache with current timestamp.
 */
export function setCachedModels(providerId: string, models: AIModel[]): void {
  const key = normalizeProviderId(providerId);
  providerModelCache.set(key, {
    models,
    timestamp: Date.now()
  });
}

/**
 * Clears cached models for a specific provider, or all providers if not specified.
 */
export function invalidateModelCache(providerId?: string): void {
  if (providerId) {
    const key = normalizeProviderId(providerId);
    providerModelCache.delete(key);
  } else {
    providerModelCache.clear();
  }
}
