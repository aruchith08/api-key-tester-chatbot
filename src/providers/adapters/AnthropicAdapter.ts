import type { AIProviderAdapter } from './BaseAdapter';
import type { ProviderDefinition, ConnectionResult, AIModel, StreamEvent, ChatParams } from '../types';
import type { AITransport } from '../transport';
import { DirectTransport } from '../transport';
import { normalizeError } from '../error-normalizer';
import type { ChatMessage } from '../../types/chat';
import { sanitizeHeaders } from '../../utils/maskApiKey';
import { classifyUniversalModel } from '../modelClassifier';
import { getCachedModels, setCachedModels } from '../modelCache';

export class AnthropicAdapter implements AIProviderAdapter {
  public provider: ProviderDefinition;
  public transport: AITransport;

  constructor(provider: ProviderDefinition, transport: AITransport = new DirectTransport()) {
    this.provider = provider;
    this.transport = transport;
  }

  protected getHeaders(apiKey: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    };
  }

  public async validateConnection(apiKey: string): Promise<ConnectionResult> {
    const startTime = Date.now();
    try {
      const modelsUrl = `${this.provider.baseUrl}/models`;
      const res = await this.transport.request({
        url: modelsUrl,
        method: 'GET',
        headers: this.getHeaders(apiKey)
      });

      const models = this.normalizeModels(res.data);
      const resolvedModels = models.length > 0 ? models : (this.provider.fallbackModels || []);

      // Cache models in multi-provider cache
      setCachedModels(this.provider.id, resolvedModels);

      return {
        success: true,
        provider: this.provider.name,
        providerId: this.provider.id,
        status: res.status,
        models: resolvedModels,
        latencyMs: res.latencyMs
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      if ((err.status === 404 || err.status === 403) && this.provider.fallbackModels && this.provider.fallbackModels.length > 0) {
        return {
          success: true,
          provider: this.provider.name,
          providerId: this.provider.id,
          status: 200,
          models: this.provider.fallbackModels,
          latencyMs
        };
      }

      const norm = err.normalized || normalizeError(err, err.status);
      return {
        success: false,
        provider: this.provider.name,
        providerId: this.provider.id,
        status: err.status,
        models: this.provider.fallbackModels || [],
        error: norm,
        latencyMs
      };
    }
  }

  public async getModels(apiKey: string, bypassCache: boolean = false): Promise<AIModel[]> {
    if (!bypassCache) {
      const cached = getCachedModels(this.provider.id);
      if (cached && cached.length > 0) {
        return cached;
      }
    }

    try {
      const modelsUrl = `${this.provider.baseUrl}/models`;
      const res = await this.transport.request({
        url: modelsUrl,
        method: 'GET',
        headers: this.getHeaders(apiKey)
      });
      const models = this.normalizeModels(res.data);
      const resolved = models.length > 0 ? models : (this.provider.fallbackModels || []);

      setCachedModels(this.provider.id, resolved);
      return resolved;
    } catch (err: any) {
      if (this.provider.fallbackModels && this.provider.fallbackModels.length > 0) {
        return this.provider.fallbackModels;
      }
      return [
        {
          id: 'claude-3-7-sonnet-20250219',
          apiModelId: 'claude-3-7-sonnet-20250219',
          name: 'Claude 3.7 Sonnet',
          displayName: 'Claude 3.7 Sonnet',
          provider: 'Anthropic',
          publisher: 'Anthropic',
          category: 'reasoning',
          contextWindow: 200000,
          isDefault: true,
          supportsChat: true,
          supportsVision: true,
          supportsReasoning: true,
          capabilities: { text: true, streaming: true, vision: true, tools: true, json: true }
        },
        {
          id: 'claude-3-5-sonnet-20241022',
          apiModelId: 'claude-3-5-sonnet-20241022',
          name: 'Claude 3.5 Sonnet',
          displayName: 'Claude 3.5 Sonnet',
          provider: 'Anthropic',
          publisher: 'Anthropic',
          category: 'vision',
          contextWindow: 200000,
          isDefault: false,
          supportsChat: true,
          supportsVision: true,
          capabilities: { text: true, streaming: true, vision: true, tools: true, json: true }
        },
        {
          id: 'claude-3-5-haiku-20241022',
          apiModelId: 'claude-3-5-haiku-20241022',
          name: 'Claude 3.5 Haiku',
          displayName: 'Claude 3.5 Haiku',
          provider: 'Anthropic',
          publisher: 'Anthropic',
          category: 'chat',
          contextWindow: 200000,
          isDefault: false,
          supportsChat: true,
          supportsVision: true,
          capabilities: { text: true, streaming: true, vision: true, tools: true, json: true }
        },
        {
          id: 'claude-3-opus-20240229',
          apiModelId: 'claude-3-opus-20240229',
          name: 'Claude 3 Opus',
          displayName: 'Claude 3 Opus',
          provider: 'Anthropic',
          publisher: 'Anthropic',
          category: 'vision',
          contextWindow: 200000,
          isDefault: false,
          supportsChat: true,
          supportsVision: true,
          capabilities: { text: true, streaming: true, vision: true, tools: true, json: true }
        }
      ];
    }
  }

  protected normalizeModels(data: any): AIModel[] {
    const list: any[] = data.data || [];
    const models: AIModel[] = list.map((item: any) => {
      const classified = classifyUniversalModel(
        {
          ...item,
          displayName: item.display_name || item.id,
          contextWindow: 200000
        },
        this.provider.id,
        this.provider.name,
        this.provider.capabilities,
        this.provider.defaultModelId || 'claude-3-5-sonnet-20241022'
      );
      classified.publisher = 'Anthropic';
      classified.supportsVision = true;
      if (/3-7|thinking/i.test(item.id)) {
        classified.supportsReasoning = true;
        classified.category = 'reasoning';
      }
      return classified;
    });

    if (models.length === 0) {
      return [
        {
          id: 'claude-3-7-sonnet-20250219',
          apiModelId: 'claude-3-7-sonnet-20250219',
          name: 'Claude 3.7 Sonnet',
          displayName: 'Claude 3.7 Sonnet',
          provider: 'Anthropic',
          publisher: 'Anthropic',
          category: 'reasoning',
          contextWindow: 200000,
          isDefault: true,
          supportsChat: true,
          supportsVision: true,
          supportsReasoning: true,
          capabilities: { text: true, streaming: true, vision: true, tools: true, json: true }
        },
        {
          id: 'claude-3-5-sonnet-20241022',
          apiModelId: 'claude-3-5-sonnet-20241022',
          name: 'Claude 3.5 Sonnet',
          displayName: 'Claude 3.5 Sonnet',
          provider: 'Anthropic',
          publisher: 'Anthropic',
          category: 'vision',
          contextWindow: 200000,
          isDefault: false,
          supportsChat: true,
          supportsVision: true,
          capabilities: { text: true, streaming: true, vision: true, tools: true, json: true }
        },
        {
          id: 'claude-3-5-haiku-20241022',
          apiModelId: 'claude-3-5-haiku-20241022',
          name: 'Claude 3.5 Haiku',
          displayName: 'Claude 3.5 Haiku',
          provider: 'Anthropic',
          publisher: 'Anthropic',
          category: 'chat',
          contextWindow: 200000,
          isDefault: false,
          supportsChat: true,
          supportsVision: true,
          capabilities: { text: true, streaming: true, vision: true, tools: true, json: true }
        }
      ];
    }

    if (!models.some(m => m.isDefault)) {
      const preferred = models.find(m => m.id === 'claude-3-7-sonnet-20250219' || m.id === 'claude-3-5-sonnet-20241022') || models[0];
      preferred.isDefault = true;
    }

    return models;
  }

  protected formatMessages(messages: ChatMessage[]): any[] {
    const formatted: any[] = [];
    for (const msg of messages) {
      if (msg.role === 'system' || (msg.role === 'assistant' && !msg.content)) continue;

      if (msg.role === 'user' && msg.attachments && msg.attachments.length > 0) {
        const content: any[] = [];
        for (const att of msg.attachments) {
          if (att.type === 'image' && att.url.startsWith('data:')) {
            const matches = att.url.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
              content.push({
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: matches[1],
                  data: matches[2]
                }
              });
            }
          }
        }
        if (msg.content) {
          content.push({ type: 'text', text: msg.content });
        }
        formatted.push({ role: 'user', content });
      } else {
        formatted.push({
          role: msg.role,
          content: msg.content
        });
      }
    }
    return formatted;
  }

  public async chat(params: ChatParams): Promise<string> {
    const url = `${this.provider.baseUrl}/messages`;
    const model = params.model || this.provider.defaultModelId || 'claude-3-5-sonnet-20241022';

    const payload: any = {
      model,
      max_tokens: params.maxTokens || 4096,
      messages: this.formatMessages(params.messages),
      temperature: params.temperature ?? 0.7
    };

    if (params.systemPrompt) {
      payload.system = params.systemPrompt;
    }

    const startTime = Date.now();
    if (params.onRequestInspector) {
      params.onRequestInspector({
        method: 'POST',
        url,
        headers: sanitizeHeaders(this.getHeaders(params.apiKey)),
        body: payload,
        timestamp: startTime
      });
    }

    const res = await this.transport.request<any>({
      url,
      method: 'POST',
      headers: this.getHeaders(params.apiKey),
      body: payload,
      signal: params.signal
    });

    if (params.onResponseInspector) {
      params.onResponseInspector({
        status: res.status,
        statusText: res.statusText,
        headers: sanitizeHeaders(res.headers),
        body: res.data,
        timestamp: Date.now()
      });
    }

    return res.data?.content?.[0]?.text || '';
  }

  public async *streamChat(params: ChatParams): AsyncIterable<StreamEvent> {
    const url = `${this.provider.baseUrl}/messages`;
    const model = params.model || this.provider.defaultModelId || 'claude-3-5-sonnet-20241022';

    const payload: any = {
      model,
      max_tokens: params.maxTokens || 4096,
      messages: this.formatMessages(params.messages),
      temperature: params.temperature ?? 0.7,
      stream: true
    };

    if (params.systemPrompt) {
      payload.system = params.systemPrompt;
    }

    const requestStartTime = Date.now();
    let firstTokenTime: number | null = null;
    let fullText = '';
    let inputTokens: number | undefined;
    let outputTokens: number | undefined;
    let finishReason: string | undefined;

    if (params.onRequestInspector) {
      params.onRequestInspector({
        method: 'POST',
        url,
        headers: sanitizeHeaders(this.getHeaders(params.apiKey)),
        body: payload,
        timestamp: requestStartTime
      });
    }

    let buffer = '';
    try {
      for await (const chunk of this.transport.stream({
        url,
        method: 'POST',
        headers: this.getHeaders(params.apiKey),
        body: payload,
        signal: params.signal
      })) {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;

          const jsonStr = trimmed.substring(6);
          try {
            const data = JSON.parse(jsonStr);

            if (data.type === 'message_start' && data.message?.usage) {
              inputTokens = data.message.usage.input_tokens;
            }

            if (data.type === 'message_delta') {
              if (data.usage) {
                outputTokens = data.usage.output_tokens;
                yield {
                  type: 'usage',
                  inputTokens,
                  outputTokens,
                  totalTokens: (inputTokens || 0) + (outputTokens || 0)
                };
              }
              if (data.delta?.stop_reason) {
                finishReason = data.delta.stop_reason;
              }
            }

            if (data.type === 'content_block_delta') {
              if (data.delta?.type === 'thinking_delta' && data.delta?.thinking) {
                yield {
                  type: 'thinking',
                  content: data.delta.thinking
                };
              } else if (data.delta?.text) {
                const textChunk = data.delta.text;
                if (firstTokenTime === null) {
                  firstTokenTime = Date.now();
                }

                fullText += textChunk;
                yield {
                  type: 'token',
                  content: textChunk
                };
              }
            }
          } catch {
            // Ignore unparseable SSE line
          }
        }
      }
    } catch (err: any) {
      yield { type: 'error', error: normalizeError(err) };
      return;
    }

    const totalDurationMs = Date.now() - requestStartTime;
    const ttftMs = firstTokenTime !== null ? firstTokenTime - requestStartTime : undefined;

    const metrics = {
      requestStartTime,
      timeToFirstTokenMs: ttftMs,
      totalResponseTimeMs: totalDurationMs,
      promptTokens: inputTokens,
      completionTokens: outputTokens,
      totalTokens: (inputTokens || 0) + (outputTokens || 0)
    };

    if (params.onMetrics) {
      params.onMetrics(metrics);
    }

    if (params.onResponseInspector) {
      params.onResponseInspector({
        status: 200,
        statusText: 'OK',
        headers: {},
        body: { fullResponseText: fullText, inputTokens, outputTokens },
        timestamp: Date.now()
      });
    }

    yield {
      type: 'complete',
      finishReason: finishReason || 'end_turn',
      metrics
    };
  }
}
