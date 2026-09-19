import type { AIProviderAdapter } from './BaseAdapter';
import type { ProviderDefinition, ConnectionResult, AIModel, StreamEvent, ChatParams } from '../types';
import type { AITransport } from '../transport';
import { DirectTransport } from '../transport';
import { normalizeError } from '../error-normalizer';
import type { ChatMessage, ToolCall } from '../../types/chat';
import { sanitizeHeaders } from '../../utils/maskApiKey';
import {
  classifyNvidiaModel,
  getCachedNvidiaModels,
  setCachedNvidiaModels
} from '../nvidia/nvidiaBuildCatalog';
import { classifyUniversalModel } from '../modelClassifier';
import { getCachedModels, setCachedModels } from '../modelCache';
import { resolveRequestPolicy, buildCompliantPayload } from '../requestPolicy';
import { SSEParser, type SSEParsedEvent } from '../../utils/sseParser';

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
    const isNvidia = this.provider.id === 'nvidia' || this.provider.id === 'nvidia-nim';

    if (isNvidia && typeof window !== 'undefined' && (import.meta as any).env?.DEV) {
      console.log(`[NVIDIA] API base URL: ${this.provider.baseUrl}`);
      console.log(`[NVIDIA] Model discovery started`);
    }

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

          if (isNvidia && typeof window !== 'undefined' && (import.meta as any).env?.DEV) {
            console.log(`[NVIDIA] Models discovered: ${resolvedModels.length}`);
          }

          // For providers whose /models endpoint is public/unauthenticated (e.g. NVIDIA NIM),
          // perform an authenticated dry probe to ensure the key actually has chat permissions and credits.
          if (isNvidia) {
            const chatUrl = this.buildUrl(this.provider.chatEndpoint || '/chat/completions');
            const verifiedChatModel = resolvedModels.find(m => m.supportsChat && m.id) || resolvedModels[0];
            const probeModelId = this.provider.defaultModelId || verifiedChatModel?.id || 'meta/llama-3.2-11b-vision-instruct';

            await this.transport.request({
              url: chatUrl,
              method: 'POST',
              headers: this.getHeaders(apiKey),
              body: {
                model: probeModelId,
                messages: [{ role: 'user', content: 'ping' }],
                max_tokens: 1
              }
            });

            // Cache models on successful validation
            setCachedNvidiaModels(resolvedModels, apiKey);
          }

          // Store in universal multi-provider cache
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

          const norm = err.normalized || normalizeError(err, err.status, this.provider.name);

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

  public async getModels(apiKey: string, bypassCache: boolean = false): Promise<AIModel[]> {
    const isNvidia = this.provider.id === 'nvidia' || this.provider.id === 'nvidia-nim';
    if (!bypassCache) {
      if (isNvidia) {
        const cachedNvidia = getCachedNvidiaModels(apiKey);
        if (cachedNvidia && cachedNvidia.length > 0) {
          return cachedNvidia;
        }
      }
      const cached = getCachedModels(this.provider.id, apiKey);
      if (cached && cached.length > 0) {
        return cached;
      }
    }

    if (isNvidia && typeof window !== 'undefined' && (import.meta as any).env?.DEV) {
      console.log(`[NVIDIA] API base URL: ${this.provider.baseUrl}`);
      console.log(`[NVIDIA] Model discovery started`);
    }

    if (!this.provider.modelsEndpoint) {
      return this.provider.fallbackModels || (this.provider.defaultModelId ? [{
        id: this.provider.defaultModelId,
        apiModelId: this.provider.defaultModelId,
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
      const resolved = models.length > 0 ? models : (this.provider.fallbackModels || []);

      setCachedModels(this.provider.id, resolved, apiKey);
      if (isNvidia) {
        if (typeof window !== 'undefined' && (import.meta as any).env?.DEV) {
          console.log(`[NVIDIA] Models discovered: ${resolved.length}`);
        }
        setCachedNvidiaModels(resolved, apiKey);
      }

      return resolved;
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

    const isNvidia = this.provider.id === 'nvidia' || this.provider.id === 'nvidia-nim';

    const models: AIModel[] = rawList.map((item: any) => {
      const id = item.id || item.name || String(item);
      const name = item.displayName || item.name || item.id || id;

      if (isNvidia) {
        const classification = classifyNvidiaModel(id, item);
        return {
          id,
          apiModelId: id,
          name: classification.displayName || name,
          displayName: classification.displayName || name,
          provider: this.provider.name,
          publisher: classification.publisher,
          category: classification.category,
          description: item.description,
          contextWindow: item.contextWindow || item.context_length || item.context_window || 131072,
          isDefault: id === this.provider.defaultModelId,
          availability: 'free-endpoint',
          freeEndpoint: true,
          source: 'dynamic',
          supportsChat: classification.supportsChat,
          supportsVision: classification.supportsVision,
          supportsReasoning: classification.supportsReasoning,
          supportsTools: classification.supportsTools,
          parameterSize: classification.parameterSize,
          buildUrl: classification.buildUrl,
          capabilities: {
            text: true,
            streaming: true,
            vision: Boolean(classification.supportsVision),
            tools: Boolean(classification.supportsTools ?? this.provider.capabilities.tools),
            json: true
          },
          discoveredAt: Date.now()
        };
      }

      // Universal model classification for all other providers
      return classifyUniversalModel(
        item,
        this.provider.id,
        this.provider.name,
        this.provider.capabilities,
        this.provider.defaultModelId
      );
    });

    if (isNvidia) {
      // Ensure a valid chat-capable model is default
      if (!models.some(m => m.isDefault) && models.length > 0) {
        const preferred = models.find(m => m.id === this.provider.defaultModelId) ||
                          models.find(m => m.supportsChat && m.supportsVision) ||
                          models.find(m => m.supportsChat) ||
                          models[0];
        preferred.isDefault = true;
      }
      return models;
    }

    // Filter out non-chat utility models for standard providers (embeddings, moderation, whisper, tts, dall-e)
    const chatModels = models.filter(m => 
      m.supportsChat && !/embed|similarity|moderation|tts|whisper|dall-e|realtime/i.test(m.id)
    );

    const result = chatModels.length > 0 ? chatModels : models;

    // Ensure a default model is marked
    if (!result.some(m => m.isDefault) && result.length > 0) {
      const preferred = result.find(m => m.id === this.provider.defaultModelId) || result[0];
      preferred.isDefault = true;
    }

    return result;
  }

  protected formatMessages(messages: ChatMessage[], systemPrompt?: string, targetModelId?: string): any[] {
    const formatted: any[] = [];

    if (systemPrompt) {
      formatted.push({ role: 'system', content: systemPrompt });
    }

    const policy = resolveRequestPolicy(this.provider, null, targetModelId);
    const canVision = policy.supportsVision;

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
        const assistantMsg: any = {
          role: 'assistant',
          content: msg.content || null
        };
        // Preserve reasoning_content across multi-turn conversations (Kimi K3, DeepSeek-R1, etc.)
        if (msg.thinking && policy.preserveReasoningContent) {
          assistantMsg.reasoning_content = msg.thinking;
        }
        if (msg.tool_calls && msg.tool_calls.length > 0) {
          assistantMsg.tool_calls = msg.tool_calls;
          formatted.push(assistantMsg);
          continue;
        }
        if (!msg.content && !msg.thinking && (msg.error && !msg.content?.trim())) continue;
        formatted.push(assistantMsg);
        continue;
      }

      if (msg.role === 'user' && msg.attachments && msg.attachments.length > 0 && canVision) {
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

    // Coalesce consecutive user turns to satisfy strict OpenAI / NIM API constraints
    const sanitized: any[] = [];
    for (const item of formatted) {
      if (item.role === 'user' && sanitized.length > 0 && sanitized[sanitized.length - 1].role === 'user') {
        const prev = sanitized[sanitized.length - 1];
        if (typeof prev.content === 'string' && typeof item.content === 'string') {
          prev.content = `${prev.content}\n\n${item.content}`;
        } else if (Array.isArray(prev.content) && Array.isArray(item.content)) {
          prev.content = [...prev.content, ...item.content];
        } else if (typeof prev.content === 'string' && Array.isArray(item.content)) {
          prev.content = [{ type: 'text', text: prev.content }, ...item.content];
        } else if (Array.isArray(prev.content) && typeof item.content === 'string') {
          prev.content = [...prev.content, { type: 'text', text: item.content }];
        } else {
          sanitized.push(item);
        }
      } else {
        sanitized.push(item);
      }
    }

    return sanitized;
  }

  public async chat(params: ChatParams): Promise<string> {
    const isNvidia = this.provider.id === 'nvidia' || this.provider.id === 'nvidia-nim';
    const policy = resolveRequestPolicy(this.provider, null, params.model);
    const targetModel = policy.apiModelId;

    if (isNvidia && typeof window !== 'undefined' && (import.meta as any).env?.DEV) {
      console.log(`[NVIDIA] API base URL: ${this.provider.baseUrl}`);
      console.log(`[NVIDIA] Selected model: ${targetModel}`);
      console.log(`[NVIDIA] Request started`);
    }

    const chatUrl = this.buildUrl(this.provider.chatEndpoint || '/chat/completions');
    const formattedMessages = this.formatMessages(params.messages, params.systemPrompt, targetModel);
    const payload = buildCompliantPayload(policy, { ...params, stream: false }, formattedMessages);

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

    let res: any;
    try {
      res = await this.transport.request({
        url: chatUrl,
        method: 'POST',
        headers: this.getHeaders(params.apiKey),
        body: payload,
        signal: params.signal
      });
    } catch (err: any) {
      const norm = normalizeError(err, err.status, this.provider.name, targetModel);
      throw {
        ...err,
        normalized: norm
      };
    }

    if (isNvidia && typeof window !== 'undefined' && (import.meta as any).env?.DEV) {
      console.log(`[NVIDIA] Response status: ${res.status || 200}`);
    }

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
    const isNvidia = this.provider.id === 'nvidia' || this.provider.id === 'nvidia-nim';
    const policy = resolveRequestPolicy(this.provider, null, params.model);
    const targetModel = policy.apiModelId;

    if (isNvidia && typeof window !== 'undefined' && (import.meta as any).env?.DEV) {
      console.log(`[NVIDIA] API base URL: ${this.provider.baseUrl}`);
      console.log(`[NVIDIA] Selected model: ${targetModel}`);
      console.log(`[NVIDIA] Request started`);
    }

    const chatUrl = this.buildUrl(this.provider.chatEndpoint || '/chat/completions');
    const formattedMessages = this.formatMessages(params.messages, params.systemPrompt, targetModel);
    const payload = buildCompliantPayload(policy, { ...params, stream: true }, formattedMessages);

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

      const sseParser = new SSEParser();

      const processEvent = (event: SSEParsedEvent): StreamEvent[] => {
        const eventsToYield: StreamEvent[] = [];
        if (event.isDone) return eventsToYield;

        const data = event.parsedData;
        if (!data) return eventsToYield;

        if (data.usage) {
          usage = data.usage;
          eventsToYield.push({
            type: 'usage',
            inputTokens: data.usage.prompt_tokens,
            outputTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens
          });
        }

        if (data.choices?.[0]?.finish_reason) {
          finishReason = data.choices[0].finish_reason;
        }

        // Handle reasoning_content (DeepSeek-R1, NVIDIA Nemotron, Kimi K3, etc.)
        const deltaReasoning = data.choices?.[0]?.delta?.reasoning_content || data.choices?.[0]?.delta?.reasoning;
        if (deltaReasoning) {
          eventsToYield.push({
            type: 'thinking',
            content: deltaReasoning
          });
        }

        const deltaContent = data.choices?.[0]?.delta?.content;
        if (deltaContent) {
          if (firstTokenTime === null) {
            firstTokenTime = Date.now();
          }
          fullText += deltaContent;
          eventsToYield.push({
            type: 'token',
            content: deltaContent
          });
        }

        // Handle tool calls in streaming
        const deltaToolCalls = data.choices?.[0]?.delta?.tool_calls;
        if (deltaToolCalls && Array.isArray(deltaToolCalls)) {
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

            eventsToYield.push({
              type: 'tool_call_delta',
              index: idx,
              id: tc.id,
              name: tc.function?.name,
              argumentsDelta: tc.function?.arguments
            });
          }
        }

        return eventsToYield;
      };

      for await (const chunk of streamChunks) {
        const events = sseParser.feed(chunk);
        for (const ev of events) {
          const yielded = processEvent(ev);
          for (const out of yielded) {
            yield out;
          }
        }
      }

      // Flush any trailing event held without a newline
      const trailingEvents = sseParser.flush();
      for (const ev of trailingEvents) {
        const yielded = processEvent(ev);
        for (const out of yielded) {
          yield out;
        }
      }
    } catch (err: any) {
      const norm = normalizeError(err, err.status, this.provider.name, targetModel);
      yield { type: 'error', error: norm };
      return;
    }

    if (isNvidia && typeof window !== 'undefined' && (import.meta as any).env?.DEV) {
      console.log(`[NVIDIA] Stream completed`);
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
