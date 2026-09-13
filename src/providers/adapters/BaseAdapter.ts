import type { ProviderDefinition, ConnectionResult, AIModel, StreamEvent, ChatParams } from '../types';
import type { AITransport } from '../transport';

export interface AIProviderAdapter {
  provider: ProviderDefinition;
  transport: AITransport;

  /**
   * Tests authentication and validates connection against the provider.
   */
  validateConnection(apiKey: string): Promise<ConnectionResult>;

  /**
   * Fetches and normalizes available models from the provider.
   */
  getModels(apiKey: string): Promise<AIModel[]>;

  /**
   * Executes a non-streaming chat completion.
   */
  chat(params: ChatParams): Promise<string>;

  /**
   * Executes a streaming chat completion yielding normalized StreamEvents.
   */
  streamChat(params: ChatParams): AsyncIterable<StreamEvent>;
}
