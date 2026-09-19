import type { AIProviderAdapter } from './BaseAdapter';
import type { ProviderDefinition, ConnectionResult, AIModel, StreamEvent, ChatParams } from '../types';
import type { AITransport } from '../transport';
import { DirectTransport } from '../transport';
import { normalizeError } from '../error-normalizer';
import type { ChatMessage } from '../../types/chat';
import { sanitizeUrl, sanitizeHeaders } from '../../utils/maskApiKey';
import { classifyUniversalModel } from '../modelClassifier';
import { getCachedModels, setCachedModels } from '../modelCache';
import { SSEParser, type SSEParsedEvent } from '../../utils/sseParser';

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

      // Cache models in multi-provider cache
      setCachedModels(this.provider.id, resolvedModels, apiKey);

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

      const norm = err.normalized || normalizeError(err, err.status, this.provider.name);
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
      const cached = getCachedModels(this.provider.id, apiKey);
      if (cached && cached.length > 0) {
        return cached;
      }
    }

    try {
      const url = `${this.provider.baseUrl}/models?key=${apiKey}`;
      const res = await this.transport.request({
        url,
        method: 'GET'
      });
      const models = this.normalizeModels(res.data);
      const resolved = models.length > 0 ? models : (this.provider.fallbackModels || []);

      setCachedModels(this.provider.id, resolved, apiKey);
      return resolved;
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
        const classified = classifyUniversalModel(
          {
            ...m,
            id,
            displayName: m.displayName || id,
            description: m.description,
            contextWindow: m.inputTokenLimit,
            maxOutputTokens: m.outputTokenLimit,
            freeEndpoint: true
          },
          this.provider.id,
          this.provider.name,
          this.provider.capabilities,
          this.provider.defaultModelId || 'gemini-2.0-flash'
        );
        classified.publisher = 'Google';
        classified.supportsVision = true;
        classified.supportsAudio = true;
        if (/thinking/i.test(id)) {
          classified.supportsReasoning = true;
          classified.category = 'reasoning';
        }
        models.push(classified);
      }
    }

    if (models.length > 0 && !models.some(m => m.isDefault)) {
      const preferred = models.find(m => m.id === 'gemini-2.0-flash' || m.id === 'gemini-1.5-flash') || models[0];
      preferred.isDefault = true;
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

    const sseParser = new SSEParser();

    const processEvent = (event: SSEParsedEvent): StreamEvent[] => {
      const eventsToYield: StreamEvent[] = [];
      if (event.isDone) return eventsToYield;
      const data = event.parsedData;
      if (!data) return eventsToYield;

      if (data.usageMetadata) {
        usageMetadata = data.usageMetadata;
        eventsToYield.push({
          type: 'usage',
          inputTokens: usageMetadata.promptTokenCount,
          outputTokens: usageMetadata.candidatesTokenCount,
          totalTokens: usageMetadata.totalTokenCount
        });
      }

      const candidate = data.candidates?.[0];
      if (candidate?.finishReason) {
        finishReason = candidate.finishReason;
      }

      const parts = candidate?.content?.parts || [];
      for (const p of parts) {
        if (p.thought && p.text) {
          eventsToYield.push({
            type: 'thinking',
            content: p.text
          });
        } else if (p.text) {
          if (firstTokenTime === null) {
            firstTokenTime = Date.now();
          }
          fullText += p.text;
          eventsToYield.push({
            type: 'token',
            content: p.text
          });
        }
      }

      return eventsToYield;
    };

    try {
      const streamChunks = this.transport.stream({
        url,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        signal: params.signal
      });

      for await (const chunk of streamChunks) {
        const events = sseParser.feed(chunk);
        for (const ev of events) {
          const yielded = processEvent(ev);
          for (const out of yielded) {
            yield out;
          }
        }
      }

      // Flush trailing events
      const trailingEvents = sseParser.flush();
      for (const ev of trailingEvents) {
        const yielded = processEvent(ev);
        for (const out of yielded) {
          yield out;
        }
      }
    } catch (err: any) {
      const norm = err.normalized || normalizeError(err, err.status, this.provider.name, model);
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
