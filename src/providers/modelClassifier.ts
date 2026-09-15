import type { AIModel, ProviderCapabilities } from './types';

/**
 * Derives a human-readable display name from a raw model ID.
 * Examples:
 *  "llama-3.3-70b-versatile" -> "Llama 3.3 70B Versatile"
 *  "meta-llama/llama-3.3-70b-instruct:free" -> "Llama 3.3 70B Instruct (Free)"
 *  "deepseek-r1-distill-llama-70b" -> "DeepSeek R1 Distill Llama 70B"
 */
export function formatModelDisplayName(rawId: string, givenName?: string): string {
  if (givenName && givenName !== rawId && !givenName.startsWith('models/')) {
    return givenName;
  }

  let clean = rawId.replace(/^models\//, '');
  const isFreeSuffix = clean.endsWith(':free');
  if (isFreeSuffix) {
    clean = clean.replace(/:free$/, '');
  }

  // Remove publisher prefix if present (e.g., "meta-llama/...")
  if (clean.includes('/')) {
    clean = clean.split('/').pop() || clean;
  }

  // Standardize common token formatting
  const tokens = clean.split(/[-_.]+/).map((tok, idx) => {
    const lower = tok.toLowerCase();
    if (/^\d+b$/i.test(tok)) return tok.toUpperCase();
    if (/^r\d+$/i.test(tok)) return tok.toUpperCase();
    if (lower === 'gpt') return 'GPT';
    if (lower === 'llama') return 'Llama';
    if (lower === 'mixtral') return 'Mixtral';
    if (lower === 'mistral') return 'Mistral';
    if (lower === 'deepseek') return 'DeepSeek';
    if (lower === 'gemini') return 'Gemini';
    if (lower === 'gemma') return 'Gemma';
    if (lower === 'claude') return 'Claude';
    if (lower === 'qwen') return 'Qwen';
    if (lower === 'qwq') return 'QwQ';
    if (lower === 'grok') return 'Grok';
    if (lower === 'instruct') return 'Instruct';
    if (lower === 'chat') return 'Chat';
    if (lower === 'vision') return 'Vision';
    if (lower === 'preview') return 'Preview';
    if (lower === 'turbo') return 'Turbo';
    if (lower === 'flash') return 'Flash';
    if (lower === 'pro') return 'Pro';
    if (lower === 'haiku') return 'Haiku';
    if (lower === 'sonnet') return 'Sonnet';
    if (lower === 'opus') return 'Opus';
    if (lower === 'versatile') return 'Versatile';
    if (lower === 'instant') return 'Instant';

    return tok.charAt(0).toUpperCase() + tok.slice(1);
  });

  let formatted = tokens.join(' ');
  if (isFreeSuffix) {
    formatted += ' (Free)';
  }
  return formatted;
}

/**
 * Detects the originating model publisher.
 */
export function detectPublisher(id: string, providerName: string, item: any = {}): string {
  const checkStr = (id + ' ' + (item.owned_by || '')).toLowerCase();

  if (id.includes('/')) {
    const pubSlug = id.split('/')[0].toLowerCase();
    if (pubSlug.includes('meta')) return 'Meta';
    if (pubSlug.includes('anthropic')) return 'Anthropic';
    if (pubSlug.includes('google')) return 'Google';
    if (pubSlug.includes('openai')) return 'OpenAI';
    if (pubSlug.includes('mistral')) return 'Mistral AI';
    if (pubSlug.includes('deepseek')) return 'DeepSeek';
    if (pubSlug.includes('qwen') || pubSlug.includes('alibaba')) return 'Alibaba';
    if (pubSlug.includes('x-ai') || pubSlug.includes('xai')) return 'xAI';
    if (pubSlug.includes('microsoft')) return 'Microsoft';
    if (pubSlug.includes('nvidia')) return 'NVIDIA';
    if (pubSlug.includes('cohere')) return 'Cohere';
    if (pubSlug.includes('amazon')) return 'Amazon';
    if (pubSlug.includes('moonshot')) return 'Moonshot AI';
  }

  if (/gpt|dall-e|whisper|text-embedding|^o1|^o3/i.test(checkStr)) return 'OpenAI';
  if (/claude/i.test(checkStr)) return 'Anthropic';
  if (/gemini|gemma/i.test(checkStr)) return 'Google';
  if (/llama/i.test(checkStr)) return 'Meta';
  if (/mistral|mixtral|pixtral|codestral/i.test(checkStr)) return 'Mistral AI';
  if (/deepseek/i.test(checkStr)) return 'DeepSeek';
  if (/grok/i.test(checkStr)) return 'xAI';
  if (/qwen|qvq/i.test(checkStr)) return 'Alibaba';
  if (/moonshot|kimi/i.test(checkStr)) return 'Moonshot AI';
  if (/phi|wizardlm/i.test(checkStr)) return 'Microsoft';

  return providerName;
}

/**
 * Identifies the model category for dynamic filtering tabs.
 */
export function detectCategory(
  id: string,
  item: any = {}
): 'chat' | 'vision' | 'reasoning' | 'embedding' | 'audio' | 'translation' | 'safety' | 'other' {
  const lower = (id + ' ' + (item.description || '')).toLowerCase();

  if (/embed|similarity/i.test(lower)) return 'embedding';
  if (/whisper|tts|speech|audio|voice/i.test(lower)) return 'audio';
  if (/guard|moderation|safety|shield/i.test(lower)) return 'safety';
  if (/translat|nllb/i.test(lower)) return 'translation';
  if (
    /(?:^|[-_./\s])(?:o1|o3|r1|reason|reasoning|reasoner|thinking|thought|qwq)(?:$|[-_./\s])/i.test(lower) ||
    /deepseek-r1|deepseek-reasoner|claude-3-7|claude-3\.7|o1-|o3-|^o1$|^o3$|sonar-reasoning/i.test(lower.trim())
  ) {
    return 'reasoning';
  }

  // Vision detection: explicit keywords or OpenRouter architecture modality
  const hasImageModality = Array.isArray(item.architecture?.input_modalities) &&
    item.architecture.input_modalities.includes('image');
  const hasVisionCap = Array.isArray(item.capabilities) && item.capabilities.includes('vision');

  if (
    hasImageModality ||
    hasVisionCap ||
    /vision|vl|image|diffus|paligemma|fuyu|kosmos|glimmer|pixtral|llava|gpt-4o|gpt-4-turbo|qvq/i.test(lower)
  ) {
    return 'vision';
  }

  return 'chat';
}

/**
 * Extracts parameter size (e.g., "70B", "8B", "405B", "20B") from model ID.
 */
export function extractParameterSize(id: string): string | undefined {
  const match = id.match(/(?:^|[-_./])(\d+(?:\.\d+)?b)(?:$|[-_./])/i);
  return match ? match[1].toUpperCase() : undefined;
}

/**
 * Universal classifier that normalizes any model payload into a production-grade AIModel.
 * GUARANTEE: The exact ID returned by the API is preserved in both `id` and `apiModelId`.
 * No artificial vendor prefixes are prepended.
 */
export function classifyUniversalModel(
  rawItem: any,
  providerId: string,
  providerName: string,
  defaultCapabilities?: ProviderCapabilities,
  defaultModelId?: string
): AIModel {
  const id: string = typeof rawItem === 'string'
    ? rawItem
    : rawItem.id || rawItem.name || String(rawItem);

  const givenName = typeof rawItem === 'object' ? (rawItem.displayName || rawItem.name) : undefined;
  const displayName = formatModelDisplayName(id, givenName);
  const publisher = detectPublisher(id, providerName, rawItem);
  const category = detectCategory(id, rawItem);
  const paramSize = extractParameterSize(id);

  // Modality & Capability flags
  const supportsChat = category !== 'embedding' && category !== 'safety' && category !== 'audio' && !/dall-e|realtime/i.test(id);
  const supportsVision = category === 'vision' ||
    (Array.isArray(rawItem.capabilities) && rawItem.capabilities.includes('vision')) ||
    (Array.isArray(rawItem.architecture?.input_modalities) && rawItem.architecture.input_modalities.includes('image')) ||
    /vision|vl|pixtral|llava|4o/i.test(id);
  const supportsReasoning = category === 'reasoning' ||
    /o1|o3|r1|reason|thinking|qwq/i.test(id);
  const supportsTools = defaultCapabilities?.tools ?? (Array.isArray(rawItem.capabilities) && rawItem.capabilities.includes('tools'));
  const supportsStreaming = category !== 'embedding' && (defaultCapabilities?.streaming ?? true);

  // Free endpoint detection (OpenRouter :free models, pricing prompt 0, NVIDIA free endpoint, etc.)
  const isFreeEndpoint = id.endsWith(':free') ||
    rawItem.freeEndpoint === true ||
    rawItem.availability === 'free-endpoint' ||
    (rawItem.pricing && (rawItem.pricing.prompt === '0' || rawItem.pricing.prompt === 0)) ||
    providerId === 'nvidia-nim' || providerId === 'nvidia';

  // Context window normalization
  const contextWindow = rawItem.contextWindow ||
    rawItem.context_length ||
    rawItem.context_window ||
    rawItem.inputTokenLimit ||
    rawItem.max_context_length ||
    131072;

  return {
    id,
    apiModelId: id,
    name: displayName,
    displayName,
    provider: providerName,
    publisher,
    category,
    description: rawItem.description || `High-performance ${category} model from ${publisher}.`,
    contextWindow,
    maxOutputTokens: rawItem.maxOutputTokens || rawItem.outputTokenLimit || rawItem.max_tokens,
    isDefault: id === defaultModelId,
    source: 'dynamic',
    availability: isFreeEndpoint ? 'free-endpoint' : 'standard',
    freeEndpoint: isFreeEndpoint,
    supportsChat,
    supportsVision,
    supportsReasoning,
    supportsStreaming,
    supportsTools,
    parameterSize: paramSize,
    capabilities: {
      text: true,
      streaming: supportsStreaming,
      vision: supportsVision,
      tools: Boolean(supportsTools),
      json: defaultCapabilities?.json ?? true
    },
    discoveredAt: Date.now()
  };
}
