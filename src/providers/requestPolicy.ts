import type { AIModel, ProviderDefinition, ChatParams } from './types';
import { getRuntimeModelId } from './types';
import { PROVIDER_CATALOG } from './catalog';
import { NVIDIA_CURATED_BUILD_MODELS } from './nvidia/nvidiaBuildCatalog';

export interface ModelCapabilities {
  supportsChat: boolean;
  supportsStreaming: boolean;
  supportsVision: boolean;
  supportsReasoning: boolean;
  supportsTools: boolean;
  contextWindow?: number;
}

export interface ModelRequestPolicy {
  apiModelId: string;
  supportsTools: boolean;
  supportsReasoning: boolean;
  supportsVision: boolean;
  supportsStreaming: boolean;
  supportsTopP: boolean;
  supportsStreamOptions: boolean;
  temperature?: {
    min: number;
    max: number;
    default?: number;
  };
  preserveReasoningContent: boolean;
}

/**
 * Resolves authoritative model metadata by checking:
 * 1. An explicitly provided model object
 * 2. Curated NVIDIA catalog (if NVIDIA provider or moonshotai)
 * 3. Provider fallbackModels catalog
 * 4. Safe defaults
 */
export function resolveAuthoritativeModel(
  providerId: string,
  modelId: string,
  providedModel?: AIModel | null
): AIModel | null {
  if (providedModel && (providedModel.id === modelId || providedModel.apiModelId === modelId)) {
    return providedModel;
  }

  const isNvidia = providerId === 'nvidia' || providerId === 'nvidia-nim';

  // Check curated NVIDIA models
  if (isNvidia || modelId.startsWith('moonshotai/') || modelId === 'kimi-k3') {
    const idLower = modelId.toLowerCase();
    const curated = NVIDIA_CURATED_BUILD_MODELS.find(
      c => c.apiModelId?.toLowerCase() === idLower ||
           c.slug?.toLowerCase() === idLower ||
           idLower.endsWith(`/${c.slug?.toLowerCase()}`)
    );
    if (curated) {
      return {
        id: curated.apiModelId || curated.slug,
        apiModelId: curated.apiModelId,
        name: curated.displayName,
        provider: 'NVIDIA NIM',
        publisher: curated.publisher,
        category: curated.category,
        supportsChat: curated.supportsChat,
        supportsVision: Boolean(curated.supportsVision),
        supportsReasoning: Boolean(curated.supportsReasoning),
        supportsTools: Boolean(curated.supportsTools),
        supportsStreaming: Boolean(curated.supportsStreaming ?? true),
        freeEndpoint: Boolean(curated.freeEndpoint),
        capabilities: {
          text: true,
          streaming: Boolean(curated.supportsStreaming ?? true),
          vision: Boolean(curated.supportsVision),
          tools: Boolean(curated.supportsTools),
          json: true
        }
      };
    }
  }

  // Check provider catalog fallback models
  const providerDef = PROVIDER_CATALOG.find(p => p.id === providerId || (isNvidia && p.id === 'nvidia-nim'));
  if (providerDef?.fallbackModels) {
    const found = providerDef.fallbackModels.find(m => m.id === modelId || m.apiModelId === modelId);
    if (found) return found;
  }

  return providedModel || null;
}

/**
 * Resolves capabilities authoritatively without scattered model-name regexes
 */
export function resolveModelCapabilities(
  provider: ProviderDefinition,
  model?: AIModel | null,
  modelId?: string
): ModelCapabilities {
  const targetId = modelId || getRuntimeModelId(model, provider.defaultModelId || 'default');
  const authModel = resolveAuthoritativeModel(provider.id, targetId, model);

  if (authModel) {
    return {
      supportsChat: authModel.supportsChat ?? true,
      supportsStreaming: authModel.supportsStreaming ?? authModel.capabilities?.streaming ?? provider.capabilities.streaming ?? true,
      supportsVision: authModel.supportsVision ?? authModel.capabilities?.vision ?? provider.capabilities.vision ?? false,
      supportsReasoning: authModel.supportsReasoning ?? false,
      supportsTools: authModel.supportsTools ?? authModel.capabilities?.tools ?? provider.capabilities.tools ?? false,
      contextWindow: authModel.contextWindow
    };
  }

  // Safe defaults if model not found in catalogue
  return {
    supportsChat: true,
    supportsStreaming: provider.capabilities.streaming ?? true,
    supportsVision: provider.capabilities.vision ?? false,
    supportsReasoning: false,
    supportsTools: provider.capabilities.tools ?? false
  };
}

/**
 * Constructs the authoritative request policy for a given provider and model.
 * Enforces parameter limits, parameter omissions (e.g. top_p for Kimi K3),
 * stream_options support, and reasoning_content preservation.
 */
export function resolveRequestPolicy(
  provider: ProviderDefinition,
  model?: AIModel | null,
  modelId?: string
): ModelRequestPolicy {
  const targetId = modelId || getRuntimeModelId(model, provider.defaultModelId || 'default');
  const isNvidia = provider.id === 'nvidia' || provider.id === 'nvidia-nim';
  const isMoonshotKimi = targetId === 'moonshotai/kimi-k3' || targetId === 'kimi-k3' || provider.id === 'moonshot';
  const caps = resolveModelCapabilities(provider, model, targetId);

  // Exact API Model ID resolution
  let canonicalApiModelId = targetId;
  if (targetId === 'kimi-k3') {
    canonicalApiModelId = 'moonshotai/kimi-k3';
  } else if (model?.apiModelId) {
    canonicalApiModelId = model.apiModelId;
  }

  // Kimi K3 Specific Policy
  if (isMoonshotKimi && canonicalApiModelId.includes('kimi-k3')) {
    return {
      apiModelId: 'moonshotai/kimi-k3',
      supportsTools: true,
      supportsReasoning: true,
      supportsVision: false,
      supportsStreaming: true,
      supportsTopP: false, // Moonshot Kimi reasoning explicitly forbids/ignores top_p
      supportsStreamOptions: false, // NVIDIA NIM does not support stream_options on Kimi K3
      temperature: {
        min: 0.0,
        max: 1.0,
        default: 0.6 // Recommended temperature for Kimi reasoning models
      },
      preserveReasoningContent: true
    };
  }

  // Standard NVIDIA NIM Policy
  if (isNvidia) {
    return {
      apiModelId: canonicalApiModelId,
      supportsTools: caps.supportsTools,
      supportsReasoning: caps.supportsReasoning,
      supportsVision: caps.supportsVision,
      supportsStreaming: caps.supportsStreaming,
      supportsTopP: true,
      supportsStreamOptions: false, // NVIDIA NIM integrate API does not support stream_options
      preserveReasoningContent: caps.supportsReasoning,
      temperature: { min: 0.0, max: 2.0, default: 0.7 }
    };
  }

  // Generic Provider Policy
  return {
    apiModelId: canonicalApiModelId,
    supportsTools: caps.supportsTools,
    supportsReasoning: caps.supportsReasoning,
    supportsVision: caps.supportsVision,
    supportsStreaming: caps.supportsStreaming,
    supportsTopP: true,
    supportsStreamOptions: provider.id === 'openai', // Only standard OpenAI supports stream_options
    preserveReasoningContent: caps.supportsReasoning,
    temperature: { min: 0.0, max: 2.0, default: 0.7 }
  };
}

/**
 * Builds a clean, compliant payload for OpenAI-compatible chat completions
 * strictly adhering to the model's authoritative request policy.
 */
export function buildCompliantPayload(
  policy: ModelRequestPolicy,
  params: ChatParams,
  formattedMessages: any[]
): any {
  const payload: any = {
    model: policy.apiModelId,
    messages: formattedMessages,
    stream: params.stream ?? true
  };

  // Temperature handling
  if (params.temperature !== undefined) {
    if (policy.temperature) {
      payload.temperature = Math.max(
        policy.temperature.min,
        Math.min(policy.temperature.max, params.temperature)
      );
    } else {
      payload.temperature = params.temperature;
    }
  } else if (policy.temperature?.default !== undefined) {
    payload.temperature = policy.temperature.default;
  }

  // Max Tokens
  if (params.maxTokens !== undefined) {
    payload.max_tokens = params.maxTokens;
  }

  // Top P (only included if supported by policy)
  if (policy.supportsTopP && params.topP !== undefined) {
    payload.top_p = params.topP;
  }

  // Stream Options (only included if supported by policy)
  if (payload.stream && policy.supportsStreamOptions) {
    payload.stream_options = { include_usage: true };
  }

  // Tools & Tool Choice (only included if supported by policy)
  if (policy.supportsTools && params.tools && params.tools.length > 0) {
    payload.tools = params.tools;
    payload.tool_choice = 'auto';
  }

  return payload;
}
