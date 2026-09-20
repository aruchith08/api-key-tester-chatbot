export type StorageTarget = 'localStorage' | 'sessionStorage';

export interface StoredApiKey {
  id: string;
  name: string; // custom friendly name / nickname (e.g. "Work OpenAI", "Personal Groq")
  providerId: string; // e.g. "openai", "groq", "google", "anthropic", "nvidia-nim", etc.
  providerName: string;
  apiKey: string;
  maskedKey: string;
  storageTarget: StorageTarget;
  customConfig?: {
    baseUrl?: string;
    chatEndpoint?: string;
    authHeader?: string;
    customHeaders?: string;
    manualModelId?: string;
  };
  createdAt: number;
  lastUsedAt?: number;
  lastValidatedAt?: number;
  lastStatus?: 'valid' | 'invalid' | 'untested';
  lastLatencyMs?: number;
}

export interface StoredKeysExportData {
  version: 1;
  exportedAt: number;
  keys: Omit<StoredApiKey, 'id'>[];
}
