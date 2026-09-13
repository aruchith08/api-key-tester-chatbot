import type { AIProviderAdapter } from './adapters/BaseAdapter';
import type { ProviderDefinition } from '../types/provider';
import { OpenAICompatibleAdapter } from './adapters/OpenAICompatibleAdapter';
import { GeminiAdapter } from './adapters/GeminiAdapter';
import { AnthropicAdapter } from './adapters/AnthropicAdapter';

export class ProviderResolver {
  public static resolve(provider: ProviderDefinition, apiKey: string): AIProviderAdapter {
    switch (provider.apiType) {
      case 'gemini':
        return new GeminiAdapter(provider, apiKey);
      case 'anthropic':
        return new AnthropicAdapter(provider, apiKey);
      case 'openai-native':
      case 'openai-compatible':
      case 'custom':
      default:
        return new OpenAICompatibleAdapter(provider, apiKey);
    }
  }
}
