import { PROVIDER_CATALOG } from './catalog';
import type { ProviderDefinition } from './types';
import type { AIProviderAdapter } from './adapters/BaseAdapter';
import { OpenAICompatibleAdapter } from './adapters/OpenAICompatibleAdapter';
import { GeminiAdapter } from './adapters/GeminiAdapter';
import { AnthropicAdapter } from './adapters/AnthropicAdapter';

export class ProviderRegistry {
  private static definitions: Map<string, ProviderDefinition> = new Map([
    ...PROVIDER_CATALOG.map(p => [p.id, p] as [string, ProviderDefinition]),
    // Alias 'nvidia' -> 'nvidia-nim' for backward compatibility
    ['nvidia', PROVIDER_CATALOG.find(p => p.id === 'nvidia-nim')!]
  ]);

  public static getAll(): ProviderDefinition[] {
    return Array.from(new Set(this.definitions.values()));
  }

  public static getTier1(): ProviderDefinition[] {
    return this.getAll().filter(p => p.tier === 1);
  }

  public static getTier2(): ProviderDefinition[] {
    return this.getAll().filter(p => p.tier === 2);
  }

  public static getById(id: string): ProviderDefinition | undefined {
    const key = id.toLowerCase().trim();
    if (key === 'nvidia' || key === 'nvidia-nim') {
      return this.definitions.get('nvidia-nim') || this.definitions.get('nvidia');
    }
    return this.definitions.get(key);
  }

  public static search(query: string): ProviderDefinition[] {
    const q = query.toLowerCase().trim();
    if (!q) return this.getAll();
    return this.getAll().filter(
      p => p.name.toLowerCase().includes(q) || 
           p.id.toLowerCase().includes(q) || 
           (p.description && p.description.toLowerCase().includes(q))
    );
  }

  public static resolveAdapter(provider: ProviderDefinition): AIProviderAdapter {
    switch (provider.adapterType) {
      case 'gemini':
        return new GeminiAdapter(provider);
      case 'anthropic':
        return new AnthropicAdapter(provider);
      case 'openai-compatible':
      case 'custom':
      default:
        return new OpenAICompatibleAdapter(provider);
    }
  }

  public static createCustomProvider(config: {
    providerName?: string;
    baseUrl: string;
    chatEndpoint?: string;
    authHeader?: string;
    customHeaders?: string;
    modelId?: string;
  }): ProviderDefinition {
    let extraHeaders: Record<string, string> = {};
    if (config.customHeaders) {
      try {
        extraHeaders = JSON.parse(config.customHeaders);
      } catch (e) {
        // Ignore JSON parse error
      }
    }

    const cleanBase = config.baseUrl.replace(/\/+$/, '');

    return {
      id: 'custom-' + Date.now(),
      name: config.providerName || 'Custom Provider',
      description: 'User-configured custom OpenAI-compatible endpoint',
      adapterType: 'custom',
      baseUrl: cleanBase,
      chatEndpoint: config.chatEndpoint || '/chat/completions',
      modelsEndpoint: '/models',
      authHeader: config.authHeader || 'Authorization',
      authPrefix: 'Bearer',
      defaultModelId: config.modelId || 'default',
      headers: extraHeaders,
      tier: 2,
      keyPatterns: [],
      capabilities: {
        text: true,
        streaming: true,
        vision: true,
        tools: true,
        json: true,
        fileInput: true
      }
    };
  }
}
