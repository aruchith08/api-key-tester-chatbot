import { PROVIDER_DEFINITIONS } from './definitions/index';
import type { ProviderDefinition } from '../types/provider';

export class ProviderRegistry {
  private static definitions: Map<string, ProviderDefinition> = new Map(
    PROVIDER_DEFINITIONS.map(p => [p.id, p])
  );

  public static getAll(): ProviderDefinition[] {
    return Array.from(this.definitions.values());
  }

  public static getTier1(): ProviderDefinition[] {
    return this.getAll().filter(p => p.tier === 1);
  }

  public static getTier2(): ProviderDefinition[] {
    return this.getAll().filter(p => p.tier === 2);
  }

  public static getById(id: string): ProviderDefinition | undefined {
    return this.definitions.get(id);
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
        // Ignore parsing errors for custom headers
      }
    }

    return {
      id: 'custom-' + Date.now(),
      name: config.providerName || 'Custom Provider',
      description: 'User-configured custom OpenAI-compatible endpoint',
      apiType: 'custom',
      baseUrl: config.baseUrl.replace(/\/+$/, ''),
      chatEndpoint: config.chatEndpoint || '/chat/completions',
      modelsEndpoint: '/models',
      authHeader: config.authHeader || 'Authorization',
      authPrefix: 'Bearer',
      defaultModelId: config.modelId || 'default',
      headers: extraHeaders,
      supportsStreaming: true,
      supportsVision: true,
      supportsTools: true,
      supportsJsonMode: true,
      tier: 2
    };
  }
}
