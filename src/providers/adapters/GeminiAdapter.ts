import type { AIProviderAdapter } from './BaseAdapter';
import type { ProviderDefinition, ConnectionResult, AIModel, StreamEvent, ChatParams } from '../types';
import type { AITransport } from '../transport';
import { DirectTransport } from '../transport';
import { normalizeError } from '../error-normalizer';
import type { ChatMessage } from '../../types/chat';
import { sanitizeUrl, sanitizeHeaders } from '../../utils/maskApiKey';

export class GeminiAdapter implements AIProviderAdapter {
  public provider: ProviderDefinition;
  public transport: AITransport;

  constructor(provider: ProviderDefinition, transport: AITransport = new DirectTransport()) {
    this.provider = provider;
    this.transport = transport;
  }

  public async validateConnection(apiKey: string): Promise<ConnectionResult> {
    const startTime = Date.now();
    try {
      const url = `${this.provider.baseUrl}/models?key=${apiKey}`;
      const res = await this.transport.request({
        url,
        method: 'GET'
      });

      const models = this.normalizeModels(res.data);
      const resolvedModels = models.length > 0 ? models : (this.provider.fallbackModels || []);
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
      if (err.status === 404 && this.provider.fallbackModels && this.provider.fallbackModels.length > 0) {
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

  public async getModels(apiKey: string): Promise<AIModel[]> {
    try {
      const url = `${this.provider.baseUrl}/models?key=${apiKey}`;
      const res = await this.transport.request({
        url,
        method: 'GET'
      });
      const models = this.normalizeModels(res.data);
      return models.length > 0 ? models : (this.provider.fallbackModels || []);
    } catch (err: any) {
      if (this.provider.fallbackModels && this.provider.fallbackModels.length > 0) {
        return this.provider.fallbackModels;
      }
      throw err;
    }
  }

  protected normalizeModels(data: any): AIModel[] {
    const rawList: any[] = data.models || [];
    const models: AIModel[] = [];

    for (const m of rawList) {
      const id = (m.name || '').replace(/^models\//, '');
      const methods: string[] = m.supportedGenerationMethods || [];

      if (methods.includes('generateContent') && !id.includes('embedding') && !id.includes('aqa')) {
        models.push({
          id,
          name: m.displayName || id,
          provider: this.provider.name,
          description: m.description,
          contextWindow: m.inputTokenLimit,
          maxOutputTokens: m.outputTokenLimit,
          isDefault: id === 'gemini-1.5-flash' || id === 'gemini-2.0-flash',
          capabilities: {
            text: true,
            streaming: true,
            vision: true,
            tools: true,
            json: true
          }
        });
      }
    }

    if (models.length > 0 && !models.some(m => m.isDefault)) {
      models[0].isDefault = true;
    }

    return models;
  }

  protected formatContents(messages: ChatMessage[]): any[] {
    const contents: any[] = [];

    for (const msg of messages) {
      if (msg.role === 'assistant' && !msg.content) continue;

      const role = msg.role === 'assistant' ? 'model' : 'user';
      const parts: any[] = [];

      if (msg.attachments && msg.attachments.length > 0) {
        for (const att of msg.attachments) {
          if (att.type === 'image' && att.url.startsWith('data:')) {
            const matches = att.url.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
              parts.push({
                inlineData: {
                  mimeType: matches[1],
                  data: matches[2]
                }
              });
            }
          }
        }
      }

      if (msg.content) {
        parts.push({ text: msg.content });
      }

      if (parts.length > 0) {
        contents.push({ role, parts });
      }
    }

    return contents;
  }

  public async chat(params: ChatParams): Promise<string> {
    const model = params.model || this.provider.defaultModelId || 'gemini-1.5-flash';
    const url = `${this.provider.baseUrl}/models/${model}:generateContent?key=${params.apiKey}`;

    const payload: any = {
      contents: this.formatContents(params.messages)
    };

    if (params.systemPrompt) {
      payload.systemInstruction = {
        parts: [{ text: params.systemPrompt }]
      };
    }

    const startTime = Date.now();
    if (params.onRequestInspector) {
      params.onRequestInspector({
        method: 'POST',
        url: url.replace(params.apiKey, '••••••••'),
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        timestamp: startTime
      });
    }

    const res = await this.transport.request({
      url,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      signal: params.signal
    });

    if (params.onResponseInspector) {
      params.onResponseInspector({
        status: res.status,
        statusText: res.ok ? 'OK' : 'Error',
        headers: res.headers,
        body: res.data,
        timestamp: Date.now()
      });
    }

    const candidate = res.data?.candidates?.[0];
    const text = candidate?.content?.parts?.map((p: any) => p.text).join('') || '';
    return text;
  }

  public async *streamChat(params: ChatParams): AsyncIterable<StreamEvent> {
    const model = params.model || this.provider.defaultModelId || 'gemini-1.5-flash';
    const url = `${this.provider.baseUrl}/models/${model}:streamGenerateContent?alt=sse&key=${params.apiKey}`;

    const payload: any = {
      contents: this.formatContents(params.messages)
    };

    if (params.systemPrompt) {
      payload.systemInstruction = {
        parts: [{ text: params.systemPrompt }]
      };
    }

    const requestStartTime = Date.now();
    let firstTokenTime: number | null = null;
    let fullText = '';
    let usageMetadata: any = null;
    let finishReason: string | undefined;

    if (params.onRequestInspector) {
      params.onRequestInspector({
        method: 'POST',
        url: sanitizeUrl(url),
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        timestamp: requestStartTime
      });
    }

    try {
      const streamChunks = this.transport.stream({
        url,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        signal: params.signal
      });

      let buffer = '';

      for await (const chunk of streamChunks) {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;

          const jsonStr = trimmed.substring(6);
          try {
            const data = JSON.parse(jsonStr);

            if (data.usageMetadata) {
              usageMetadata = data.usageMetadata;
              yield {
                type: 'usage',
                inputTokens: usageMetadata.promptTokenCount,
                outputTokens: usageMetadata.candidatesTokenCount,
                totalTokens: usageMetadata.totalTokenCount
              };
            }

            const candidate = data.candidates?.[0];
            if (candidate?.finishReason) {
              finishReason = candidate.finishReason;
            }

            const parts = candidate?.content?.parts || [];
            for (const p of parts) {
              if (p.thought && p.text) {
                yield {
                  type: 'thinking',
                  content: p.text
                };
              } else if (p.text) {
                if (firstTokenTime === null) {
                  firstTokenTime = Date.now();
                }
                fullText += p.text;
                yield {
                  type: 'token',
                  content: p.text
                };
              }
            }
          } catch (e) {
            // Ignore unparseable SSE line
          }
        }
      }
    } catch (err: any) {
      const norm = err.normalized || normalizeError(err, err.status);
      yield { type: 'error', error: norm };
      return;
    }

    const totalDurationMs = Date.now() - requestStartTime;
    const ttftMs = firstTokenTime !== null ? firstTokenTime - requestStartTime : undefined;

    const metrics = {
      requestStartTime,
      timeToFirstTokenMs: ttftMs,
      totalResponseTimeMs: totalDurationMs,
      promptTokens: usageMetadata?.promptTokenCount,
      completionTokens: usageMetadata?.candidatesTokenCount,
      totalTokens: usageMetadata?.totalTokenCount
    };

    if (params.onMetrics) {
      params.onMetrics(metrics);
    }

    if (params.onResponseInspector) {
      params.onResponseInspector({
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'text/event-stream' },
        body: { fullResponseText: fullText, usageMetadata },
        timestamp: Date.now()
      });
    }

    yield {
      type: 'complete',
      finishReason: finishReason || 'STOP',
      metrics
    };
  }
}
