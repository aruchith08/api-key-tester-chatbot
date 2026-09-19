import type { AIModel } from '../types';

export interface NvidiaCuratedModel {
  slug: string;
  apiModelId?: string;
  displayName: string;
  publisher: string;
  provider: 'nvidia';
  source: 'nvidia-build';
  availability: 'free-endpoint';
  capabilities: string[];
  category: 'chat' | 'vision' | 'reasoning' | 'embedding' | 'audio' | 'translation' | 'safety' | 'autonomous-driving' | 'optimization' | 'other';
  supportsChat: boolean;
  supportsVision?: boolean;
  supportsAudio?: boolean;
  supportsVideo?: boolean;
  supportsReasoning?: boolean;
  supportsTools?: boolean;
  supportsStreaming?: boolean;
  freeEndpoint: boolean;
  downloadable?: boolean;
  buildUrl?: string;
  parameterSize?: string;
  inputModalities?: string[];
  outputModalities?: string[];
}

/**
 * 36 Curated NVIDIA Build Free Endpoint Models
 * Preserves slugs separate from runtime API model IDs.
 */
export const NVIDIA_CURATED_BUILD_MODELS: NvidiaCuratedModel[] = [
  {
    slug: 'kimi-k3',
    apiModelId: 'moonshotai/kimi-k3',
    displayName: 'Kimi K3',
    publisher: 'Moonshot AI',
    provider: 'nvidia',
    source: 'nvidia-build',
    availability: 'free-endpoint',
    capabilities: ['chat', 'reasoning', 'text-generation'],
    category: 'reasoning',
    supportsChat: true,
    supportsReasoning: true,
    supportsStreaming: true,
    freeEndpoint: true,
    parameterSize: '128k',
    buildUrl: 'https://build.nvidia.com/moonshotai/kimi-k3'
  },
  {
    slug: 'deepseek-v4-flash-0731',
    apiModelId: 'deepseek-ai/deepseek-v4-flash-0731',
    displayName: 'DeepSeek V4 Flash 0731',
    publisher: 'DeepSeek',
    provider: 'nvidia',
    source: 'nvidia-build',
    availability: 'free-endpoint',
    capabilities: ['chat', 'coding', 'reasoning', 'text-generation'],
    category: 'chat',
    supportsChat: true,
    supportsReasoning: true,
    supportsStreaming: true,
    freeEndpoint: true,
    buildUrl: 'https://build.nvidia.com/deepseek-ai/deepseek-v4-flash-0731'
  },
  {
    slug: 'nemotron-3.5-lightning-30b-a3b',
    apiModelId: 'nvidia/nemotron-3.5-lightning-30b-a3b',
    displayName: 'Nemotron 3.5 Lightning 30B',
    publisher: 'NVIDIA',
    provider: 'nvidia',
    source: 'nvidia-build',
    availability: 'free-endpoint',
    capabilities: ['chat', 'reasoning', 'text-generation'],
    category: 'chat',
    supportsChat: true,
    supportsReasoning: true,
    supportsStreaming: true,
    freeEndpoint: true,
    parameterSize: '30B',
    buildUrl: 'https://build.nvidia.com/nvidia/nemotron-3.5-lightning-30b-a3b'
  },
  {
    slug: 'muse-glimmer-30b',
    apiModelId: 'meta/muse-glimmer-30b',
    displayName: 'Muse Glimmer 30B',
    publisher: 'Meta',
    provider: 'nvidia',
    source: 'nvidia-build',
    availability: 'free-endpoint',
    capabilities: ['chat', 'vision', 'reasoning', 'multimodal'],
    category: 'vision',
    supportsChat: true,
    supportsVision: true,
    supportsReasoning: true,
    supportsStreaming: true,
    freeEndpoint: true,
    parameterSize: '30B',
    inputModalities: ['text', 'image'],
    buildUrl: 'https://build.nvidia.com/meta/muse-glimmer-30b'
  },
  {
    slug: 'riva-translate-4b-instruct-v2',
    apiModelId: 'nvidia/riva-translate-4b-instruct-v2',
    displayName: 'Riva Translate 4B Instruct v2',
    publisher: 'NVIDIA',
    provider: 'nvidia',
    source: 'nvidia-build',
    availability: 'free-endpoint',
    capabilities: ['translation', 'text-generation'],
    category: 'translation',
    supportsChat: false,
    supportsStreaming: true,
    freeEndpoint: true,
    parameterSize: '4B',
    buildUrl: 'https://build.nvidia.com/nvidia/riva-translate-4b-instruct-v2'
  },
  {
    slug: 'ising-calibration-1.5-31b',
    apiModelId: 'nvidia/ising-calibration-1.5-31b',
    displayName: 'Ising Calibration 1.5 31B',
    publisher: 'NVIDIA',
    provider: 'nvidia',
    source: 'nvidia-build',
    availability: 'free-endpoint',
    capabilities: ['optimization', 'reasoning'],
    category: 'optimization',
    supportsChat: false,
    freeEndpoint: true,
    parameterSize: '31B',
    buildUrl: 'https://build.nvidia.com/nvidia/ising-calibration-1.5-31b'
  },
  {
    slug: 'nemotron-3-embed-1b',
    apiModelId: 'nvidia/nemotron-3-embed-1b',
    displayName: 'Nemotron 3 Embed 1B',
    publisher: 'NVIDIA',
    provider: 'nvidia',
    source: 'nvidia-build',
    availability: 'free-endpoint',
    capabilities: ['embedding'],
    category: 'embedding',
    supportsChat: false,
    freeEndpoint: true,
    parameterSize: '1B',
    buildUrl: 'https://build.nvidia.com/nvidia/nemotron-3-embed-1b'
  },
  {
    slug: 'laguna-xs-2.1',
    apiModelId: 'poolside/laguna-xs-2.1',
    displayName: 'Laguna XS 2.1',
    publisher: 'Poolside',
    provider: 'nvidia',
    source: 'nvidia-build',
    availability: 'free-endpoint',
    capabilities: ['chat', 'coding', 'reasoning'],
    category: 'chat',
    supportsChat: true,
    supportsReasoning: true,
    supportsStreaming: true,
    freeEndpoint: true,
    buildUrl: 'https://build.nvidia.com/poolside/laguna-xs-2.1'
  },
  {
    slug: 'diffusiongemma-26b-a4b-it',
    apiModelId: 'google/diffusiongemma-26b-a4b-it',
    displayName: 'DiffusionGemma 26B Instruct',
    publisher: 'Google',
    provider: 'nvidia',
    source: 'nvidia-build',
    availability: 'free-endpoint',
    capabilities: ['chat', 'vision', 'reasoning'],
    category: 'vision',
    supportsChat: true,
    supportsVision: true,
    supportsReasoning: true,
    supportsStreaming: true,
    freeEndpoint: true,
    parameterSize: '26B',
    inputModalities: ['text', 'image'],
    buildUrl: 'https://build.nvidia.com/google/diffusiongemma-26b-a4b-it'
  },
  {
    slug: 'nemotron-3-ultra-550b-a55b',
    apiModelId: 'nvidia/nemotron-3-ultra-550b-a55b',
    displayName: 'Nemotron 3 Ultra 550B',
    publisher: 'NVIDIA',
    provider: 'nvidia',
    source: 'nvidia-build',
    availability: 'free-endpoint',
    capabilities: ['chat', 'reasoning', 'text-generation'],
    category: 'reasoning',
    supportsChat: true,
    supportsReasoning: true,
    supportsStreaming: true,
    freeEndpoint: true,
    parameterSize: '550B',
    buildUrl: 'https://build.nvidia.com/nvidia/nemotron-3-ultra-550b-a55b'
  },
  {
    slug: 'nemotron-3.5-content-safety',
    apiModelId: 'nvidia/nemotron-3.5-content-safety',
    displayName: 'Nemotron 3.5 Content Safety',
    publisher: 'NVIDIA',
    provider: 'nvidia',
    source: 'nvidia-build',
    availability: 'free-endpoint',
    capabilities: ['safety', 'moderation'],
    category: 'safety',
    supportsChat: false,
    freeEndpoint: true,
    buildUrl: 'https://build.nvidia.com/nvidia/nemotron-3.5-content-safety'
  },
  {
    slug: 'cosmos3-nano',
    displayName: 'Cosmos 3 Nano',
    publisher: 'NVIDIA',
    provider: 'nvidia',
    source: 'nvidia-build',
    availability: 'free-endpoint',
    capabilities: ['video', 'physical-ai'],
    category: 'other',
    supportsChat: false,
    freeEndpoint: true,
    buildUrl: 'https://build.nvidia.com/nvidia/cosmos3-nano'
  },
  {
    slug: 'cosmos3-nano-reasoner',
    displayName: 'Cosmos 3 Nano Reasoner',
    publisher: 'NVIDIA',
    provider: 'nvidia',
    source: 'nvidia-build',
    availability: 'free-endpoint',
    capabilities: ['reasoning', 'physical-ai'],
    category: 'reasoning',
    supportsChat: false,
    supportsReasoning: true,
    freeEndpoint: true,
    buildUrl: 'https://build.nvidia.com/nvidia/cosmos3-nano-reasoner'
  },
  {
    slug: 'nemotron-3-nano-omni-30b-a3b-reasoning',
    apiModelId: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
    displayName: 'Nemotron 3 Nano Omni 30B Reasoning',
    publisher: 'NVIDIA',
    provider: 'nvidia',
    source: 'nvidia-build',
    availability: 'free-endpoint',
    capabilities: ['chat', 'reasoning', 'vision', 'multimodal'],
    category: 'reasoning',
    supportsChat: true,
    supportsVision: true,
    supportsReasoning: true,
    supportsStreaming: true,
    freeEndpoint: true,
    parameterSize: '30B',
    buildUrl: 'https://build.nvidia.com/nvidia/nemotron-3-nano-omni-30b-a3b-reasoning'
  },
  {
    slug: 'synthetic-video-detector',
    apiModelId: 'nvidia/ai-synthetic-video-detector',
    displayName: 'Synthetic Video Detector',
    publisher: 'NVIDIA',
    provider: 'nvidia',
    source: 'nvidia-build',
    availability: 'free-endpoint',
    capabilities: ['video', 'safety', 'moderation'],
    category: 'safety',
    supportsChat: false,
    freeEndpoint: true,
    buildUrl: 'https://build.nvidia.com/nvidia/synthetic-video-detector'
  },
  {
    slug: 'active-speaker-detection',
    displayName: 'Active Speaker Detection',
    publisher: 'NVIDIA',
    provider: 'nvidia',
    source: 'nvidia-build',
    availability: 'free-endpoint',
    capabilities: ['audio', 'video'],
    category: 'audio',
    supportsChat: false,
    freeEndpoint: true,
    buildUrl: 'https://build.nvidia.com/nvidia/active-speaker-detection'
  },
  {
    slug: 'ising-calibration-1-35b-a3b',
    displayName: 'Ising Calibration 1 35B',
    publisher: 'NVIDIA',
    provider: 'nvidia',
    source: 'nvidia-build',
    availability: 'free-endpoint',
    capabilities: ['optimization', 'reasoning'],
    category: 'optimization',
    supportsChat: false,
    freeEndpoint: true,
    parameterSize: '35B',
    buildUrl: 'https://build.nvidia.com/nvidia/ising-calibration-1-35b-a3b'
  },
  {
    slug: 'gemma-4-31b-it',
    apiModelId: 'google/gemma-4-31b-it',
    displayName: 'Gemma 4 31B Instruct',
    publisher: 'Google',
    provider: 'nvidia',
    source: 'nvidia-build',
    availability: 'free-endpoint',
    capabilities: ['chat', 'reasoning', 'text-generation'],
    category: 'chat',
    supportsChat: true,
    supportsReasoning: true,
    supportsStreaming: true,
    freeEndpoint: true,
    parameterSize: '31B',
    buildUrl: 'https://build.nvidia.com/google/gemma-4-31b-it'
  },
  {
    slug: 'nemotron-voicechat',
    displayName: 'Nemotron VoiceChat',
    publisher: 'NVIDIA',
    provider: 'nvidia',
    source: 'nvidia-build',
    availability: 'free-endpoint',
    capabilities: ['audio', 'speech-to-text', 'text-to-speech', 'chat'],
    category: 'audio',
    supportsChat: false,
    freeEndpoint: true,
    buildUrl: 'https://build.nvidia.com/nvidia/nemotron-voicechat'
  },
  {
    slug: 'nemotron-3-super-120b-a12b',
    apiModelId: 'nvidia/nemotron-3-super-120b-a12b',
    displayName: 'Nemotron 3 Super 120B',
    publisher: 'NVIDIA',
    provider: 'nvidia',
    source: 'nvidia-build',
    availability: 'free-endpoint',
    capabilities: ['chat', 'reasoning', 'text-generation'],
    category: 'reasoning',
    supportsChat: true,
    supportsReasoning: true,
    supportsStreaming: true,
    freeEndpoint: true,
    parameterSize: '124B',
    buildUrl: 'https://build.nvidia.com/nvidia/nemotron-3-super-120b-a12b'
  },
  {
    slug: 'cosmos-transfer2_5-2b',
    displayName: 'Cosmos Transfer 2.5 2B',
    publisher: 'NVIDIA',
    provider: 'nvidia',
    source: 'nvidia-build',
    availability: 'free-endpoint',
    capabilities: ['video', 'physical-ai'],
    category: 'other',
    supportsChat: false,
    freeEndpoint: true,
    parameterSize: '2B',
    buildUrl: 'https://build.nvidia.com/nvidia/cosmos-transfer2_5-2b'
  },
  {
    slug: 'riva-translate-4b-instruct-v1_1',
    apiModelId: 'nvidia/riva-translate-4b-instruct-v1.1',
    displayName: 'Riva Translate 4B Instruct v1.1',
    publisher: 'NVIDIA',
    provider: 'nvidia',
    source: 'nvidia-build',
    availability: 'free-endpoint',
    capabilities: ['translation', 'text-generation'],
    category: 'translation',
    supportsChat: false,
    supportsStreaming: true,
    freeEndpoint: true,
    parameterSize: '4B',
    buildUrl: 'https://build.nvidia.com/nvidia/riva-translate-4b-instruct-v1.1'
  },
  {
    slug: 'streampetr',
    displayName: 'StreamPETR',
    publisher: 'NVIDIA',
    provider: 'nvidia',
    source: 'nvidia-build',
    availability: 'free-endpoint',
    capabilities: ['autonomous-driving', 'physical-ai'],
    category: 'autonomous-driving',
    supportsChat: false,
    freeEndpoint: true,
    buildUrl: 'https://build.nvidia.com/nvidia/streampetr'
  },
  {
    slug: 'llama-3_1-nemotron-safety-guard-8b-v3',
    apiModelId: 'nvidia/llama-3.1-nemotron-safety-guard-8b-v3',
    displayName: 'Llama 3.1 Nemotron Safety Guard 8B v3',
    publisher: 'NVIDIA',
    provider: 'nvidia',
    source: 'nvidia-build',
    availability: 'free-endpoint',
    capabilities: ['safety', 'moderation'],
    category: 'safety',
    supportsChat: false,
    freeEndpoint: true,
    parameterSize: '8B',
    buildUrl: 'https://build.nvidia.com/nvidia/llama-3.1-nemotron-safety-guard-8b-v3'
  },
  {
    slug: 'gpt-oss-20b',
    apiModelId: 'openai/gpt-oss-20b',
    displayName: 'GPT-OSS 20B',
    publisher: 'OpenAI',
    provider: 'nvidia',
    source: 'nvidia-build',
    availability: 'free-endpoint',
    capabilities: ['chat', 'reasoning', 'text-generation'],
    category: 'reasoning',
    supportsChat: true,
    supportsReasoning: true,
    supportsStreaming: true,
    freeEndpoint: true,
    parameterSize: '21B',
    buildUrl: 'https://build.nvidia.com/openai/gpt-oss-20b'
  },
  {
    slug: 'llama-guard-4-12b',
    apiModelId: 'meta/llama-guard-4-12b',
    displayName: 'Llama Guard 4 12B',
    publisher: 'Meta',
    provider: 'nvidia',
    source: 'nvidia-build',
    availability: 'free-endpoint',
    capabilities: ['safety', 'moderation'],
    category: 'safety',
    supportsChat: false,
    freeEndpoint: true,
    parameterSize: '12B',
    buildUrl: 'https://build.nvidia.com/meta/llama-guard-4-12b'
  },
  {
    slug: 'bnr',
    displayName: 'BNR',
    publisher: 'NVIDIA',
    provider: 'nvidia',
    source: 'nvidia-build',
    availability: 'free-endpoint',
    capabilities: ['audio', 'speech-to-text'],
    category: 'audio',
    supportsChat: false,
    freeEndpoint: true,
    buildUrl: 'https://build.nvidia.com/nvidia/bnr'
  },
  {
    slug: 'mistral-nemotron',
    apiModelId: 'mistralai/mistral-nemotron',
    displayName: 'Mistral Nemotron',
    publisher: 'Mistral AI',
    provider: 'nvidia',
    source: 'nvidia-build',
    availability: 'free-endpoint',
    capabilities: ['chat', 'reasoning', 'text-generation'],
    category: 'chat',
    supportsChat: true,
    supportsReasoning: true,
    supportsStreaming: true,
    freeEndpoint: true,
    buildUrl: 'https://build.nvidia.com/mistralai/mistral-nemotron'
  },
  {
    slug: 'magpie-tts-zeroshot',
    displayName: 'Magpie TTS Zero-Shot',
    publisher: 'NVIDIA',
    provider: 'nvidia',
    source: 'nvidia-build',
    availability: 'free-endpoint',
    capabilities: ['text-to-speech', 'audio'],
    category: 'audio',
    supportsChat: false,
    freeEndpoint: true,
    buildUrl: 'https://build.nvidia.com/nvidia/magpie-tts-zeroshot'
  },
  {
    slug: 'sparsedrive',
    displayName: 'SparseDrive',
    publisher: 'NVIDIA',
    provider: 'nvidia',
    source: 'nvidia-build',
    availability: 'free-endpoint',
    capabilities: ['autonomous-driving', 'physical-ai'],
    category: 'autonomous-driving',
    supportsChat: false,
    freeEndpoint: true,
    buildUrl: 'https://build.nvidia.com/nvidia/sparsedrive'
  },
  {
    slug: 'bevformer',
    displayName: 'BEVFormer',
    publisher: 'NVIDIA',
    provider: 'nvidia',
    source: 'nvidia-build',
    availability: 'free-endpoint',
    capabilities: ['autonomous-driving', 'physical-ai'],
    category: 'autonomous-driving',
    supportsChat: false,
    freeEndpoint: true,
    buildUrl: 'https://build.nvidia.com/nvidia/bevformer'
  },
  {
    slug: 'studiovoice',
    displayName: 'StudioVoice',
    publisher: 'NVIDIA',
    provider: 'nvidia',
    source: 'nvidia-build',
    availability: 'free-endpoint',
    capabilities: ['audio', 'text-to-speech'],
    category: 'audio',
    supportsChat: false,
    freeEndpoint: true,
    buildUrl: 'https://build.nvidia.com/nvidia/studiovoice'
  },
  {
    slug: 'llama-3.2-11b-vision-instruct',
    apiModelId: 'meta/llama-3.2-11b-vision-instruct',
    displayName: 'Llama 3.2 11B Vision Instruct',
    publisher: 'Meta',
    provider: 'nvidia',
    source: 'nvidia-build',
    availability: 'free-endpoint',
    capabilities: ['chat', 'vision', 'image-to-text'],
    category: 'vision',
    supportsChat: true,
    supportsVision: true,
    supportsStreaming: true,
    freeEndpoint: true,
    parameterSize: '11B',
    inputModalities: ['text', 'image'],
    buildUrl: 'https://build.nvidia.com/meta/llama-3.2-11b-vision-instruct'
  },
  {
    slug: 'llama-3.2-90b-vision-instruct',
    apiModelId: 'meta/llama-3.2-90b-vision-instruct',
    displayName: 'Llama 3.2 90B Vision Instruct',
    publisher: 'Meta',
    provider: 'nvidia',
    source: 'nvidia-build',
    availability: 'free-endpoint',
    capabilities: ['chat', 'vision', 'image-to-text', 'reasoning'],
    category: 'vision',
    supportsChat: true,
    supportsVision: true,
    supportsReasoning: true,
    supportsStreaming: true,
    freeEndpoint: true,
    parameterSize: '90B',
    inputModalities: ['text', 'image'],
    buildUrl: 'https://build.nvidia.com/meta/llama-3.2-90b-vision-instruct'
  },
  {
    slug: 'google-paligemma',
    displayName: 'PaliGemma',
    publisher: 'Google',
    provider: 'nvidia',
    source: 'nvidia-build',
    availability: 'free-endpoint',
    capabilities: ['vision', 'image-to-text'],
    category: 'vision',
    supportsChat: false,
    supportsVision: true,
    freeEndpoint: true,
    buildUrl: 'https://build.nvidia.com/google/google-paligemma'
  },
  {
    slug: 'nvidia-cuopt',
    displayName: 'cuOpt Routing Optimization',
    publisher: 'NVIDIA',
    provider: 'nvidia',
    source: 'nvidia-build',
    availability: 'free-endpoint',
    capabilities: ['optimization'],
    category: 'optimization',
    supportsChat: false,
    freeEndpoint: true,
    buildUrl: 'https://build.nvidia.com/nvidia/nvidia-cuopt'
  }
];

/**
 * Maps a publisher ID prefix to a human-readable brand name
 */
export function formatPublisher(rawPublisher: string): string {
  const norm = rawPublisher.toLowerCase().trim();
  switch (norm) {
    case 'openai': return 'OpenAI';
    case 'meta': return 'Meta';
    case 'nvidia': return 'NVIDIA';
    case 'google': return 'Google';
    case 'deepseek-ai':
    case 'deepseek': return 'DeepSeek';
    case 'mistralai':
    case 'nv-mistralai': return 'Mistral AI';
    case 'moonshotai': return 'Moonshot AI';
    case 'poolside': return 'Poolside';
    case 'ibm': return 'IBM';
    case 'microsoft': return 'Microsoft';
    case '01-ai': return '01.AI';
    case 'adept': return 'Adept';
    case 'ai21labs': return 'AI21 Labs';
    case 'aisingapore': return 'AI Singapore';
    case 'bigcode': return 'BigCode';
    case 'databricks': return 'Databricks';
    case 'snowflake': return 'Snowflake';
    case 'writer': return 'Writer';
    case 'z-ai': return 'Z-AI';
    case 'zyphra': return 'Zyphra';
    default:
      return rawPublisher.charAt(0).toUpperCase() + rawPublisher.slice(1);
  }
}

/**
 * Classifies an NVIDIA model by exact API ID and metadata
 */
export function classifyNvidiaModel(apiModelId: string, metadata?: any): Partial<AIModel> {
  const idLower = apiModelId.toLowerCase();

  // Match with curated catalog first
  const curated = NVIDIA_CURATED_BUILD_MODELS.find(
    (c) => c.apiModelId?.toLowerCase() === idLower || 
           apiModelId.endsWith(`/${c.slug}`) ||
           idLower.includes(c.slug.toLowerCase())
  );

  let publisher = 'NVIDIA';
  if (apiModelId.includes('/')) {
    const [rawPub] = apiModelId.split('/');
    publisher = formatPublisher(rawPub);
  } else if (metadata?.owned_by) {
    publisher = formatPublisher(metadata.owned_by);
  } else if (curated) {
    publisher = curated.publisher;
  }

  // Parameter size extraction
  let parameterSize = curated?.parameterSize;
  if (!parameterSize) {
    const sizeMatch = apiModelId.match(/(\d+(?:\.\d+)?b)/i);
    if (sizeMatch) {
      parameterSize = sizeMatch[1].toUpperCase();
    }
  }

  // Category determination
  let category: NvidiaCuratedModel['category'] = curated?.category || 'chat';
  let supportsChat = curated?.supportsChat ?? true;
  let supportsVision = curated?.supportsVision ?? false;
  let supportsReasoning = curated?.supportsReasoning ?? false;

  if (!curated) {
    if (/01-ai\/yi-large/i.test(idLower)) {
      category = 'other';
      supportsChat = false;
    } else if (/embed|similarity|retriever/i.test(idLower)) {
      category = 'embedding';
      supportsChat = false;
    } else if (/guard|safety|moderation|detector|control/i.test(idLower)) {
      category = 'safety';
      supportsChat = false;
    } else if (/translate/i.test(idLower)) {
      category = 'translation';
      supportsChat = false;
    } else if (/tts|whisper|speaker|voice|audio|sound/i.test(idLower)) {
      category = 'audio';
      supportsChat = false;
    } else if (/cuopt|calibration|\bising\b|ising-/i.test(idLower)) {
      category = 'optimization';
      supportsChat = false;
    } else if (/drive|petr|bevformer/i.test(idLower)) {
      category = 'autonomous-driving';
      supportsChat = false;
    } else if (/vision|vl|image|diffus|paligemma|fuyu|kosmos|neva|vila|deplot/i.test(idLower)) {
      category = 'vision';
      supportsVision = true;
      supportsChat = true;
    } else if (/reason|think|r1|nemotron.*super|gpt-oss/i.test(idLower)) {
      category = 'reasoning';
      supportsReasoning = true;
      supportsChat = true;
    } else {
      category = 'chat';
      supportsChat = true;
    }
  }

  // Tool calling support check (avoid sending tools payload to models that reject function calling)
  const supportsTools = curated?.supportsTools ?? (
    supportsChat && /llama-3|nemotron|mistral|mixtral|jamba|qwen|gpt-oss/i.test(idLower) && !/guard|safety/i.test(idLower)
  );

  // Clean human-readable display name
  let displayName = curated?.displayName;
  if (!displayName) {
    const baseSlug = apiModelId.includes('/') ? apiModelId.split('/')[1] : apiModelId;
    displayName = baseSlug
      .split(/[-_]/)
      .map(part => {
        if (/^\d+[bk]$/i.test(part)) return part.toUpperCase();
        if (/^gpt|oss|it|ai|api|tts|qa|vlm$/i.test(part)) return part.toUpperCase();
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(' ');
  }

  return {
    apiModelId,
    displayName,
    name: displayName,
    publisher,
    category,
    supportsChat,
    supportsVision,
    supportsReasoning,
    supportsTools,
    freeEndpoint: true,
    availability: 'free-endpoint',
    source: 'dynamic',
    parameterSize,
    buildUrl: curated?.buildUrl || `https://build.nvidia.com/${apiModelId}`
  };
}

/**
 * Determines whether an NVIDIA model is compatible with the normal chatbot selector
 */
export function isNvidiaChatCompatible(model: AIModel): boolean {
  if (model.supportsChat === false) return false;
  if (model.category && ['embedding', 'audio', 'translation', 'safety', 'autonomous-driving', 'optimization', 'other'].includes(model.category)) {
    return false;
  }
  // Filter out explicit non-chat patterns in ID (ensuring \bising\b or ising- is used so aisingapore is preserved)
  if (/embed|similarity|retriever|guard|safety|detector|translate|tts|whisper|speaker|cuopt|\bising\b|ising-|bevformer|sparsedrive|01-ai\/yi-large/i.test(model.id)) {
    return false;
  }
  return true;
}

/**
 * In-Memory Model Cache with 10-Minute TTL
 */
interface ModelCacheEntry {
  models: AIModel[];
  timestamp: number;
}

let nvidiaModelCache: ModelCacheEntry | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function getCachedNvidiaModels(): AIModel[] | null {
  if (!nvidiaModelCache) return null;
  if (Date.now() - nvidiaModelCache.timestamp > CACHE_TTL_MS) {
    nvidiaModelCache = null;
    return null;
  }
  return nvidiaModelCache.models;
}

export function setCachedNvidiaModels(models: AIModel[]): void {
  nvidiaModelCache = {
    models,
    timestamp: Date.now()
  };
}

export function invalidateNvidiaCache(): void {
  nvidiaModelCache = null;
}

/**
 * Merges dynamically discovered models with the curated catalog without fabricating IDs.
 * Deduplicates by provider + apiModelId.
 */
export function mergeNvidiaDiscoveredModels(
  discovered: AIModel[],
  curated: NvidiaCuratedModel[] = NVIDIA_CURATED_BUILD_MODELS
): AIModel[] {
  const map = new Map<string, AIModel>();

  // 1. Discovered models take primary precedence
  for (const model of discovered) {
    const key = `nvidia:${model.id}`;
    map.set(key, model);
  }

  // 2. Only add static curated models if they don't already exist and are marked unverified
  for (const c of curated) {
    const id = c.apiModelId || `nvidia/${c.slug}`;
    const key = `nvidia:${id}`;
    if (!map.has(key)) {
      map.set(key, {
        id,
        apiModelId: id,
        name: c.displayName,
        displayName: c.displayName,
        provider: 'NVIDIA NIM',
        publisher: c.publisher,
        category: c.category,
        supportsChat: c.supportsChat,
        supportsVision: Boolean(c.supportsVision),
        supportsReasoning: Boolean(c.supportsReasoning),
        source: 'catalog',
        availability: 'free-endpoint',
        freeEndpoint: true,
        description: 'Catalog model — availability not verified',
        buildUrl: c.buildUrl,
        parameterSize: c.parameterSize,
        capabilities: {
          text: true,
          streaming: true,
          vision: Boolean(c.supportsVision),
          tools: Boolean(c.supportsTools),
          json: true
        }
      });
    }
  }

  return Array.from(map.values());
}
