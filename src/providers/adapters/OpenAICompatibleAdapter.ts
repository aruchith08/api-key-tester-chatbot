import type { AIProviderAdapter } from './BaseAdapter';
import type { ProviderDefinition, ConnectionResult, AIModel, StreamEvent, ChatParams } from '../types';
import type { AITransport } from '../transport';
import { DirectTransport } from '../transport';
import { normalizeError } from '../error-normalizer';
import type { ChatMessage, ToolCall } from '../../types/chat';
import { sanitizeHeaders } from '../../utils/maskApiKey';

export class OpenAICompatibleAdapter implements AIProviderAdapter {
  public provider: ProviderDefinition;
  public transport: AITransport;

  constructor(provider: ProviderDefinition, transport: AITransport = new DirectTransport()) {
    this.provider = provider;
    this.transport = transport;
  }

  protected buildUrl(endpoint?: string): string {
    const base = (this.provider.baseUrl || '').replace(/\/+$/, '');
    if (!endpoint) return base;
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${base}${path}`;
  }

  protected getHeaders(apiKey: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(this.provider.headers || {})
    };

    const headerName = this.provider.authHeader || 'Authorization';
    const prefix = this.provider.authPrefix !== undefined ? this.provider.authPrefix : 'Bearer';
    const authVal = prefix ? `${prefix} ${apiKey}`.trim() : apiKey;
    headers[headerName] = authVal;

    return headers;
  }

  public async validateConnection(apiKey: string): Promise<ConnectionResult> {
    const startTime = Date.now();
    try {
      // If the provider supports dynamic model listing, probe modelsEndpoint
      if (this.provider.modelsEndpoint) {
        const modelsUrl = this.buildUrl(this.provider.modelsEndpoint);
        try {
          const res = await this.transport.request({
            url: modelsUrl,
            method: 'GET',
            headers: this.getHeaders(apiKey)
          });

          const models = this.normalizeModels(res.data);
          const resolvedModels = models.length > 0 ? models : (this.provider.fallbackModels || []);

          // For providers whose /models endpoint is public/unauthenticated (e.g. NVIDIA NIM),
          // perform an authenticated dry probe to ensure the key actually has chat permissions and credits.
          if (this.provider.id === 'nvidia' || this.provider.id === 'nvidia-nim') {
            const chatUrl = this.buildUrl(this.provider.chatEndpoint || '/chat/completions');
            await this.transport.request({
              url: chatUrl,
              method: 'POST',
              headers: this.getHeaders(apiKey),
              body: {
                model: this.provider.defaultModelId || resolvedModels[0]?.id || 'meta/llama-3.2-11b-vision-instruct',
                messages: [{ role: 'user', content: 'ping' }],
                max_tokens: 1
              }
            });
          }

          return {
            success: true,
            provider: this.provider.name,
            providerId: this.provider.id,
            status: res.status,
            models: resolvedModels,
            latencyMs: res.latencyMs
          };
        } catch (err: any) {
          if (err.status === 404 && this.provider.fallbackModels && this.provider.fallbackModels.length > 0) {
            return {
              success: true,
              provider: this.provider.name,
              providerId: this.provider.id,
              status: 200,
              models: this.provider.fallbackModels,
              latencyMs: Date.now() - startTime
            };
          }

          const norm = err.normalized || normalizeError(err, err.status);
          return {
            success: false,
            provider: this.provider.name,
            providerId: this.provider.id,
            status: err.status,
            models: [],
            error: norm,
            latencyMs: Date.now() - startTime
          };
        }
      }

      // Fallback for providers without /models endpoint (e.g. Perplexity) -> send a dry probe with max_tokens: 1
      const chatUrl = this.buildUrl(this.provider.chatEndpoint || '/chat/completions');
      try {
        const res = await this.transport.request({
          url: chatUrl,
          method: 'POST',
          headers: this.getHeaders(apiKey),
          body: {
            model: this.provider.defaultModelId || 'default',
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 1
          }
        });

        const defaultModel: AIModel = {
          id: this.provider.defaultModelId || 'default',
          name: this.provider.defaultModelId || 'default',
          provider: this.provider.name,
          isDefault: true,
          capabilities: { ...this.provider.capabilities }
        };

        const models = this.provider.fallbackModels && this.provider.fallbackModels.length > 0
          ? this.provider.fallbackModels
          : [defaultModel];

        return {
          success: true,
          provider: this.provider.name,
          providerId: this.provider.id,
          status: res.status,
          models,
          latencyMs: res.latencyMs
        };
      } catch (err: any) {
        if (err.status === 400) {
          const defaultModel: AIModel = {
            id: this.provider.defaultModelId || 'default',
            name: this.provider.defaultModelId || 'default',
            provider: this.provider.name,
            isDefault: true,
            capabilities: { ...this.provider.capabilities }
          };
          return {
            success: true,
            provider: this.provider.name,
            providerId: this.provider.id,
            status: 200,
            models: this.provider.fallbackModels || [defaultModel],
            latencyMs: Date.now() - startTime
          };
        }

        const norm = err.normalized || normalizeError(err, err.status);
        return {
          success: false,
          provider: this.provider.name,
          providerId: this.provider.id,
          status: err.status,
          models: [],
          error: norm,
          latencyMs: Date.now() - startTime
        };
      }
    } catch (err: any) {
      const norm = err.normalized || normalizeError(err, err.status);
      return {
        success: false,
        provider: this.provider.name,
        providerId: this.provider.id,
        status: err.status,
        models: [],
        error: norm,
        latencyMs: Date.now() - startTime
      };
    }
  }

  public async getModels(apiKey: string): Promise<AIModel[]> {
    if (!this.provider.modelsEndpoint) {
      return this.provider.fallbackModels || (this.provider.defaultModelId ? [{
        id: this.provider.defaultModelId,
        name: this.provider.defaultModelId,
        provider: this.provider.name,
        isDefault: true,
        capabilities: { ...this.provider.capabilities }
      }] : []);
    }

    try {
      const modelsUrl = this.buildUrl(this.provider.modelsEndpoint);
      const res = await this.transport.request({
        url: modelsUrl,
        method: 'GET',
        headers: this.getHeaders(apiKey)
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
    let rawList: any[] = [];
    if (Array.isArray(data)) {
      rawList = data;
    } else if (data && Array.isArray(data.data)) {
      rawList = data.data;
    } else if (data && Array.isArray(data.models)) {
      rawList = data.models;
    }

    const models: AIModel[] = rawList.map((item: any) => {
      const id = item.id || item.name || String(item);
      const name = item.displayName || item.name || item.id || id;
      const hasCapArray = Array.isArray(item.capabilities);
      const isVision = hasCapArray 
        ? item.capabilities.includes('vision') 
        : (/vision|vl|pixtral|4o|claude|gemini|llava/i.test(id) || Boolean(this.provider.capabilities.vision));
      const isTools = hasCapArray
        ? item.capabilities.includes('tools')
        : this.provider.capabilities.tools;
      
      return {
        id,
        name,
        provider: this.provider.name,
        description: item.description,
        contextWindow: item.contextWindow || item.context_length || item.context_window,
        isDefault: id === this.provider.defaultModelId,
        capabilities: {
          text: true,
          streaming: this.provider.capabilities.streaming,
          vision: isVision,
          tools: isTools,
          json: this.provider.capabilities.json
        }
      };
    });

    // Filter out non-chat utility models (embeddings, moderation, whisper, tts, dall-e)
    const chatModels = models.filter(m => 
      !/embed|similarity|moderation|tts|whisper|dall-e|realtime/i.test(m.id)
    );

    const result = chatModels.length > 0 ? chatModels : models;

    // Ensure a default model is marked
    if (!result.some(m => m.isDefault) && result.length > 0) {
      const preferred = result.find(m => m.id === this.provider.defaultModelId) || result[0];
      preferred.isDefault = true;
    }

    return result;
  }

  protected formatMessages(messages: ChatMessage[], systemPrompt?: string): any[] {
    const formatted: any[] = [];

    if (systemPrompt) {
      formatted.push({ role: 'system', content: systemPrompt });
    }

    for (const msg of messages) {
      if (msg.role === 'tool') {
        formatted.push({
          role: 'tool',
          tool_call_id: msg.tool_call_id || 'call_default',
          content: msg.content || ''
        });
        continue;
      }

      if (msg.role === 'assistant') {
        if (msg.tool_calls && msg.tool_calls.length > 0) {
          formatted.push({
            role: 'assistant',
            content: msg.content || null,
            tool_calls: msg.tool_calls
          });
          continue;
        }
        if (!msg.content) continue;
      }

      if (msg.role === 'user' && msg.attachments && msg.attachments.length > 0 && this.provider.capabilities.vision) {
        const parts: any[] = [{ type: 'text', text: msg.content || 'Attached image/file' }];
        for (const att of msg.attachments) {
          if (att.type === 'image') {
            parts.push({
              type: 'image_url',
              image_url: { url: att.url }
            });
          }
        }
        formatted.push({ role: 'user', content: parts });
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
    const chatUrl = this.buildUrl(this.provider.chatEndpoint || '/chat/completions');
    const payload: any = {
      model: params.model || this.provider.defaultModelId || 'default',
      messages: this.formatMessages(params.messages, params.systemPrompt),
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens,
      top_p: params.topP,
      stream: false
    };

    if (params.tools && params.tools.length > 0) {
      payload.tools = params.tools;
      payload.tool_choice = 'auto';
    }

    const startTime = Date.now();
    if (params.onRequestInspector) {
      params.onRequestInspector({
        method: 'POST',
        url: chatUrl,
        headers: sanitizeHeaders(this.getHeaders(params.apiKey)),
        body: payload,
        timestamp: startTime
      });
    }

    const res = await this.transport.request({
      url: chatUrl,
      method: 'POST',
      headers: this.getHeaders(params.apiKey),
      body: payload,
      signal: params.signal
    });

    if (params.onResponseInspector) {
      params.onResponseInspector({
        status: res.status,
        statusText: res.ok ? 'OK' : 'Error',
        headers: sanitizeHeaders(res.headers),
        body: res.data,
        timestamp: Date.now()
      });
    }

    return res.data?.choices?.[0]?.message?.content || '';
  }

  public async *streamChat(params: ChatParams): AsyncIterable<StreamEvent> {
    const chatUrl = this.buildUrl(this.provider.chatEndpoint || '/chat/completions');
    const payload: any = {
      model: params.model || this.provider.defaultModelId || 'default',
      messages: this.formatMessages(params.messages, params.systemPrompt),
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens,
      top_p: params.topP,
      stream: true,
      stream_options: { include_usage: true }
    };

    if (params.tools && params.tools.length > 0) {
      payload.tools = params.tools;
      payload.tool_choice = 'auto';
    }

    const requestStartTime = Date.now();
    let firstTokenTime: number | null = null;
    let fullText = '';
    let usage: any = null;
    let finishReason: string | undefined;
    const toolCallsMap = new Map<number, { id: string; name: string; arguments: string }>();

    if (params.onRequestInspector) {
      params.onRequestInspector({
        method: 'POST',
        url: chatUrl,
        headers: sanitizeHeaders(this.getHeaders(params.apiKey)),
        body: payload,
        timestamp: requestStartTime
      });
    }

    try {
      const streamChunks = this.transport.stream({
        url: chatUrl,
        method: 'POST',
        headers: this.getHeaders(params.apiKey),
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
          if (!trimmed || trimmed.startsWith(':')) continue;
          if (trimmed === 'data: [DONE]') continue;

          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.substring(6);
            try {
              const data = JSON.parse(jsonStr);

              if (data.usage) {
                usage = data.usage;
                yield {
                  type: 'usage',
                  inputTokens: data.usage.prompt_tokens,
                  outputTokens: data.usage.completion_tokens,
                  totalTokens: data.usage.total_tokens
                };
              }

              if (data.choices?.[0]?.finish_reason) {
                finishReason = data.choices[0].finish_reason;
              }

              // Handle reasoning_content (DeepSeek-R1, Cerebras, etc.) and standard content delta separately
              const deltaContent = data.choices?.[0]?.delta?.content;
              const deltaReasoning = data.choices?.[0]?.delta?.reasoning_content || data.choices?.[0]?.delta?.reasoning;

              if (deltaReasoning) {
                yield {
                  type: 'thinking',
                  content: deltaReasoning
                };
              }

              if (deltaContent) {
                if (firstTokenTime === null) {
                  firstTokenTime = Date.now();
                }
                fullText += deltaContent;
                yield {
                  type: 'token',
                  content: deltaContent
                };
              }

              // Handle streaming tool_calls
              const deltaToolCalls = data.choices?.[0]?.delta?.tool_calls;
              if (Array.isArray(deltaToolCalls)) {
                for (const tc of deltaToolCalls) {
                  const idx = tc.index ?? 0;
                  if (!toolCallsMap.has(idx)) {
                    toolCallsMap.set(idx, {
                      id: tc.id || `call_${Date.now()}_${idx}`,
                      name: tc.function?.name || '',
                      arguments: tc.function?.arguments || ''
                    });
                  } else {
                    const existing = toolCallsMap.get(idx)!;
                    if (tc.id) existing.id = tc.id;
                    if (tc.function?.name) existing.name += tc.function.name;
                    if (tc.function?.arguments) existing.arguments += tc.function.arguments;
                  }

                  yield {
                    type: 'tool_call_delta',
                    index: idx,
                    id: tc.id,
                    name: tc.function?.name,
                    argumentsDelta: tc.function?.arguments
                  };
                }
              }
            } catch (err) {
              // Ignore partial or unparseable SSE line
            }
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
      promptTokens: usage?.prompt_tokens,
      completionTokens: usage?.completion_tokens,
      totalTokens: usage?.total_tokens
    };

    if (params.onMetrics) {
      params.onMetrics(metrics);
    }

    if (params.onResponseInspector) {
      params.onResponseInspector({
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'text/event-stream' },
        body: { fullResponseText: fullText, usage },
        timestamp: Date.now()
      });
    }

    const finalToolCalls = toolCallsMap.size > 0
      ? Array.from(toolCallsMap.values()).map(tc => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.name,
            arguments: tc.arguments
          }
        }))
      : undefined;

    if (finalToolCalls && finalToolCalls.length > 0) {
      yield {
        type: 'tool_calls',
        toolCalls: finalToolCalls
      };
    }

    yield {
      type: 'complete',
      finishReason: finishReason || (finalToolCalls ? 'tool_calls' : 'stop'),
      metrics,
      toolCalls: finalToolCalls
    };
  }
}
