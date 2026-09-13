import type { ProviderDefinition } from './types';

export const PROVIDER_CATALOG: ProviderDefinition[] = [
  // ==================== TIER 1 (HIGH PRIORITY) ====================
  {
    id: 'groq',
    name: 'Groq',
    description: 'Ultra-fast LPU inference engine for Llama, Mixtral, and Gemma models',
    keyPatterns: [/^gsk_[a-zA-Z0-9]{48,}$/],
    adapterType: 'openai-compatible',
    baseUrl: 'https://api.groq.com/openai/v1',
    chatEndpoint: '/chat/completions',
    modelsEndpoint: '/models',
    documentationUrl: 'https://console.groq.com/docs',
    authHeader: 'Authorization',
    authPrefix: 'Bearer',
    defaultModelId: 'llama-3.3-70b-versatile',
    tier: 1,
    
    connectionMode: 'DIRECT',
    browserCompatibility: 'COMPATIBLE',
    corsStatus: 'SUPPORTED',
    recommendedTransport: 'DIRECT',
    truth: {
      "implementation": "IMPLEMENTED",
      "unitTests": "PASSED",
      "realApi": "NOT_TESTED",
      "browser": "UNVERIFIED",
      "transport": "DIRECT_READY",
      "corsStatus": "SUPPORTED"
},
    fallbackModels: [
      {
        id: 'llama-3.3-70b-versatile',
        name: 'Llama 3.3 70B Versatile',
        provider: 'Groq',
        contextWindow: 128000,
        isDefault: true,
        capabilities: { text: true, streaming: true, vision: false, tools: true, json: true }
      },
      {
        id: 'llama-3.1-8b-instant',
        name: 'Llama 3.1 8B Instant',
        provider: 'Groq',
        contextWindow: 128000,
        capabilities: { text: true, streaming: true, vision: false, tools: true, json: true }
      },
      {
        id: 'mixtral-8x7b-32768',
        name: 'Mixtral 8x7B',
        provider: 'Groq',
        contextWindow: 32768,
        capabilities: { text: true, streaming: true, vision: false, tools: true, json: true }
      }
    ],
    capabilities: {
      text: true,
      streaming: true,
      vision: true,
      tools: true,
      json: true,
      fileInput: false
    }
  },
  {
    id: 'nvidia-nim',
    name: 'NVIDIA NIM',
    description: 'Hardware-accelerated AI enterprise models hosted on NVIDIA infrastructure',
    keyPatterns: [/^nvapi-[A-Za-z0-9_-]{30,}$/],
    adapterType: 'openai-compatible',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    chatEndpoint: '/chat/completions',
    modelsEndpoint: '/models',
    documentationUrl: 'https://build.nvidia.com',
    authHeader: 'Authorization',
    authPrefix: 'Bearer',
    defaultModelId: 'meta/llama-3.2-11b-vision-instruct',
    tier: 1,
    
    connectionMode: 'UNKNOWN',
    browserCompatibility: 'UNKNOWN',
    corsStatus: 'UNKNOWN',
    recommendedTransport: 'DIRECT',
    truth: {
      "implementation": "IMPLEMENTED",
      "unitTests": "PASSED",
      "realApi": "NOT_TESTED",
      "browser": "UNVERIFIED",
      "transport": "DIRECT_READY",
      "corsStatus": "UNKNOWN"
    },
    fallbackModels: [
      {
        id: 'meta/llama-3.2-11b-vision-instruct',
        name: 'Llama 3.2 11B Vision Instruct',
        provider: 'NVIDIA NIM',
        contextWindow: 131072,
        isDefault: true,
        capabilities: { text: true, streaming: true, vision: true, tools: true, json: true }
      },
      {
        id: 'nvidia/llama-3.1-nemotron-70b-instruct',
        name: 'Llama 3.1 Nemotron 70B Instruct',
        provider: 'NVIDIA NIM',
        contextWindow: 131072,
        capabilities: { text: true, streaming: true, vision: false, tools: true, json: true }
      },
      {
        id: 'mistralai/mixtral-8x22b-v0.1',
        name: 'Mixtral 8x22B',
        provider: 'NVIDIA NIM',
        contextWindow: 65536,
        capabilities: { text: true, streaming: true, vision: false, tools: true, json: true }
      }
    ],
    capabilities: {
      text: true,
      streaming: true,
      vision: true,
      tools: true,
      json: true,
      fileInput: false
    }
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Unified gateway providing access to 200+ models with smart routing',
    keyPatterns: [/^sk-or-v1-[a-f0-9]{64}$/],
    adapterType: 'openai-compatible',
    baseUrl: 'https://openrouter.ai/api/v1',
    chatEndpoint: '/chat/completions',
    modelsEndpoint: '/models',
    documentationUrl: 'https://openrouter.ai/docs',
    authHeader: 'Authorization',
    authPrefix: 'Bearer',
    defaultModelId: 'meta-llama/llama-3.3-70b-instruct',
    headers: {
      'HTTP-Referer': 'https://arh.ai',
      'X-Title': 'ARH Playground'
    },
    tier: 1,
    
    connectionMode: 'DIRECT',
    browserCompatibility: 'COMPATIBLE',
    corsStatus: 'SUPPORTED',
    recommendedTransport: 'DIRECT',
    truth: {
      "implementation": "IMPLEMENTED",
      "unitTests": "PASSED",
      "realApi": "NOT_TESTED",
      "browser": "UNVERIFIED",
      "transport": "DIRECT_READY",
      "corsStatus": "SUPPORTED"
},
    fallbackModels: [
      {
        id: 'meta-llama/llama-3.3-70b-instruct',
        name: 'Llama 3.3 70B Instruct',
        provider: 'OpenRouter',
        contextWindow: 131072,
        isDefault: true,
        capabilities: { text: true, streaming: true, vision: false, tools: true, json: true }
      },
      {
        id: 'deepseek/deepseek-chat',
        name: 'DeepSeek V3',
        provider: 'OpenRouter',
        contextWindow: 64000,
        capabilities: { text: true, streaming: true, vision: false, tools: true, json: true }
      },
      {
        id: 'anthropic/claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: 'OpenRouter',
        contextWindow: 200000,
        capabilities: { text: true, streaming: true, vision: true, tools: true, json: true }
      }
    ],
    capabilities: {
      text: true,
      streaming: true,
      vision: true,
      tools: true,
      json: true,
      fileInput: true
    }
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Google multimodal foundation models with deep context awareness',
    keyPatterns: [/^AIzaSy[0-9A-Za-z_-]{33}$/],
    adapterType: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    chatEndpoint: '/models',
    modelsEndpoint: '/models',
    documentationUrl: 'https://ai.google.dev/docs',
    authHeader: 'x-goog-api-key',
    authPrefix: '',
    defaultModelId: 'gemini-1.5-flash',
    tier: 1,
    
    connectionMode: 'DIRECT_WITH_WARNING',
    browserCompatibility: 'PARTIAL',
    corsStatus: 'CONDITIONAL',
    keyExposureWarning: 'Direct browser access passes API key in URL parameter or headers without server protection.',
    recommendedTransport: 'DIRECT',
    truth: {
      "implementation": "IMPLEMENTED",
      "unitTests": "PASSED",
      "realApi": "NOT_TESTED",
      "browser": "UNVERIFIED",
      "transport": "DIRECT_READY",
      "corsStatus": "CONDITIONAL"
},
    fallbackModels: [
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        provider: 'Google Gemini',
        contextWindow: 1048576,
        isDefault: true,
        capabilities: { text: true, streaming: true, vision: true, tools: true, json: true }
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'Google Gemini',
        contextWindow: 2097152,
        capabilities: { text: true, streaming: true, vision: true, tools: true, json: true }
      },
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        provider: 'Google Gemini',
        contextWindow: 1048576,
        capabilities: { text: true, streaming: true, vision: true, tools: true, json: true }
      }
    ],
    capabilities: {
      text: true,
      streaming: true,
      vision: true,
      tools: true,
      json: true,
      fileInput: true
    }
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude 3.5 Sonnet, Haiku, and Opus advanced reasoning models',
    keyPatterns: [
      /^sk-ant-api03-[a-zA-Z0-9_-]{40,}$/,
      /^sk-ant-[a-zA-Z0-9_-]{30,}$/
    ],
    adapterType: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    chatEndpoint: '/messages',
    modelsEndpoint: '/models',
    documentationUrl: 'https://docs.anthropic.com',
    authHeader: 'x-api-key',
    authPrefix: '',
    defaultModelId: 'claude-3-5-sonnet-20241022',
    headers: {
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    tier: 1,
    
    connectionMode: 'DIRECT_WITH_WARNING',
    browserCompatibility: 'PARTIAL',
    corsStatus: 'CONDITIONAL',
    keyExposureWarning: 'Requires anthropic-dangerous-direct-browser-access header; exposes API key to client runtime.',
    recommendedTransport: 'DIRECT',
    truth: {
      "implementation": "IMPLEMENTED",
      "unitTests": "PASSED",
      "realApi": "NOT_TESTED",
      "browser": "DOCUMENTED",
      "transport": "DIRECT_READY",
      "corsStatus": "CONDITIONAL"
},
    fallbackModels: [
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        provider: 'Anthropic',
        contextWindow: 200000,
        isDefault: true,
        capabilities: { text: true, streaming: true, vision: true, tools: true, json: true }
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        provider: 'Anthropic',
        contextWindow: 200000,
        capabilities: { text: true, streaming: true, vision: true, tools: true, json: true }
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        provider: 'Anthropic',
        contextWindow: 200000,
        capabilities: { text: true, streaming: true, vision: true, tools: true, json: true }
      }
    ],
    capabilities: {
      text: true,
      streaming: true,
      vision: true,
      tools: true,
      json: true,
      fileInput: true
    }
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Industry standard GPT-4o, GPT-4o-mini, and o1 models',
    keyPatterns: [
      /^sk-proj-[a-zA-Z0-9_-]{40,}$/,
      /^sk-admin-[a-zA-Z0-9_-]{40,}$/,
      /^sk-[a-zA-Z0-9]{48,}$/
    ],
    adapterType: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1',
    chatEndpoint: '/chat/completions',
    modelsEndpoint: '/models',
    documentationUrl: 'https://platform.openai.com/docs',
    authHeader: 'Authorization',
    authPrefix: 'Bearer',
    defaultModelId: 'gpt-4o',
    tier: 1,
    
    connectionMode: 'RELAY_REQUIRED',
    browserCompatibility: 'BLOCKED',
    corsStatus: 'BLOCKED',
    keyExposureWarning: 'OpenAI blocks direct browser cross-origin requests by design to safeguard API credentials.',
    recommendedTransport: 'RELAY',
    truth: {
      "implementation": "IMPLEMENTED",
      "unitTests": "PASSED",
      "realApi": "NOT_TESTED",
      "browser": "BLOCKED",
      "transport": "RELAY_READY",
      "corsStatus": "BLOCKED"
},
    fallbackModels: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'OpenAI',
        contextWindow: 128000,
        isDefault: true,
        capabilities: { text: true, streaming: true, vision: true, tools: true, json: true }
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'OpenAI',
        contextWindow: 128000,
        capabilities: { text: true, streaming: true, vision: true, tools: true, json: true }
      },
      {
        id: 'o3-mini',
        name: 'o3-mini',
        provider: 'OpenAI',
        contextWindow: 200000,
        capabilities: { text: true, streaming: true, vision: false, tools: true, json: true }
      }
    ],
    capabilities: {
      text: true,
      streaming: true,
      vision: true,
      tools: true,
      json: true,
      fileInput: true
    }
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    description: 'Ultra high-throughput Wafer Scale Engine inference',
    keyPatterns: [/^csk-[a-zA-Z0-9]{32,}$/],
    adapterType: 'openai-compatible',
    baseUrl: 'https://api.cerebras.ai/v1',
    chatEndpoint: '/chat/completions',
    modelsEndpoint: '/models',
    documentationUrl: 'https://inference-docs.cerebras.ai',
    authHeader: 'Authorization',
    authPrefix: 'Bearer',
    defaultModelId: 'llama-3.3-70b',
    tier: 1,
    
    connectionMode: 'UNKNOWN',
    browserCompatibility: 'UNKNOWN',
    corsStatus: 'UNKNOWN',
    recommendedTransport: 'DIRECT',
    truth: {
      "implementation": "IMPLEMENTED",
      "unitTests": "PASSED",
      "realApi": "NOT_TESTED",
      "browser": "UNVERIFIED",
      "transport": "DIRECT_READY",
      "corsStatus": "UNKNOWN"
},
    fallbackModels: [
      {
        id: 'llama-3.3-70b',
        name: 'Llama 3.3 70B',
        provider: 'Cerebras',
        contextWindow: 128000,
        isDefault: true,
        capabilities: { text: true, streaming: true, vision: false, tools: true, json: true }
      },
      {
        id: 'llama3.1-8b',
        name: 'Llama 3.1 8B',
        provider: 'Cerebras',
        contextWindow: 128000,
        capabilities: { text: true, streaming: true, vision: false, tools: true, json: true }
      }
    ],
    capabilities: {
      text: true,
      streaming: true,
      vision: false,
      tools: true,
      json: true,
      fileInput: false
    }
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'High-capability DeepSeek-V3 and DeepSeek-R1 reasoning models',
    keyPatterns: [/^sk-[a-f0-9]{32}$/],
    adapterType: 'openai-compatible',
    baseUrl: 'https://api.deepseek.com',
    chatEndpoint: '/chat/completions',
    modelsEndpoint: '/models',
    documentationUrl: 'https://platform.deepseek.com/docs',
    authHeader: 'Authorization',
    authPrefix: 'Bearer',
    defaultModelId: 'deepseek-chat',
    tier: 1,
    
    connectionMode: 'RELAY_REQUIRED',
    browserCompatibility: 'BLOCKED',
    corsStatus: 'BLOCKED',
    keyExposureWarning: 'DeepSeek API does not return browser CORS headers.',
    recommendedTransport: 'RELAY',
    truth: {
      "implementation": "IMPLEMENTED",
      "unitTests": "PASSED",
      "realApi": "NOT_TESTED",
      "browser": "BLOCKED",
      "transport": "RELAY_READY",
      "corsStatus": "BLOCKED"
},
    fallbackModels: [
      {
        id: 'deepseek-chat',
        name: 'DeepSeek V3',
        provider: 'DeepSeek',
        contextWindow: 64000,
        isDefault: true,
        capabilities: { text: true, streaming: true, vision: false, tools: true, json: true }
      },
      {
        id: 'deepseek-reasoner',
        name: 'DeepSeek R1',
        provider: 'DeepSeek',
        contextWindow: 64000,
        capabilities: { text: true, streaming: true, vision: false, tools: false, json: true }
      }
    ],
    capabilities: {
      text: true,
      streaming: true,
      vision: false,
      tools: true,
      json: true,
      fileInput: false
    }
  },
  {
    id: 'together',
    name: 'Together AI',
    description: 'Cloud platform for fine-tuned and leading open-source models',
    keyPatterns: [/^[a-f0-9]{64}$/],
    adapterType: 'openai-compatible',
    baseUrl: 'https://api.together.xyz/v1',
    chatEndpoint: '/chat/completions',
    modelsEndpoint: '/models',
    documentationUrl: 'https://docs.together.ai',
    authHeader: 'Authorization',
    authPrefix: 'Bearer',
    defaultModelId: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
    tier: 1,
    
    connectionMode: 'UNKNOWN',
    browserCompatibility: 'UNKNOWN',
    corsStatus: 'UNKNOWN',
    recommendedTransport: 'DIRECT',
    truth: {
      "implementation": "IMPLEMENTED",
      "unitTests": "PASSED",
      "realApi": "NOT_TESTED",
      "browser": "UNVERIFIED",
      "transport": "DIRECT_READY",
      "corsStatus": "UNKNOWN"
},
    fallbackModels: [
      {
        id: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
        name: 'Meta Llama 3.1 70B Turbo',
        provider: 'Together AI',
        contextWindow: 131072,
        isDefault: true,
        capabilities: { text: true, streaming: true, vision: false, tools: true, json: true }
      },
      {
        id: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
        name: 'Mixtral 8x7B Instruct',
        provider: 'Together AI',
        contextWindow: 32768,
        capabilities: { text: true, streaming: true, vision: false, tools: true, json: true }
      }
    ],
    capabilities: {
      text: true,
      streaming: true,
      vision: true,
      tools: true,
      json: true,
      fileInput: false
    }
  },

  // ==================== TIER 2 (SECONDARY) ====================
  {
    id: 'fireworks',
    name: 'Fireworks AI',
    description: 'Production-grade serverless inference platform with compound AI support',
    keyPatterns: [/^fw_[a-zA-Z0-9]{32,}$/],
    adapterType: 'openai-compatible',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    chatEndpoint: '/chat/completions',
    modelsEndpoint: '/models',
    documentationUrl: 'https://docs.fireworks.ai',
    authHeader: 'Authorization',
    authPrefix: 'Bearer',
    defaultModelId: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
    tier: 2,
    
    connectionMode: 'UNKNOWN',
    browserCompatibility: 'UNKNOWN',
    corsStatus: 'UNKNOWN',
    recommendedTransport: 'DIRECT',
    truth: {
      "implementation": "IMPLEMENTED",
      "unitTests": "PASSED",
      "realApi": "NOT_TESTED",
      "browser": "UNVERIFIED",
      "transport": "DIRECT_READY",
      "corsStatus": "UNKNOWN"
},
    capabilities: {
      text: true,
      streaming: true,
      vision: true,
      tools: true,
      json: true,
      fileInput: false
    }
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    description: 'Real-time online search-augmented reasoning models (Sonar)',
    keyPatterns: [/^pplx-[a-zA-Z0-9]{32,}$/],
    adapterType: 'openai-compatible',
    baseUrl: 'https://api.perplexity.ai',
    chatEndpoint: '/chat/completions',
    modelsEndpoint: '',
    documentationUrl: 'https://docs.perplexity.ai',
    authHeader: 'Authorization',
    authPrefix: 'Bearer',
    defaultModelId: 'sonar-pro',
    tier: 2,
    
    connectionMode: 'RELAY_REQUIRED',
    browserCompatibility: 'BLOCKED',
    corsStatus: 'BLOCKED',
    keyExposureWarning: 'Perplexity blocks direct browser fetch via Cloudflare and CORS restriction.',
    recommendedTransport: 'RELAY',
    truth: {
      "implementation": "IMPLEMENTED",
      "unitTests": "PASSED",
      "realApi": "NOT_TESTED",
      "browser": "BLOCKED",
      "transport": "RELAY_READY",
      "corsStatus": "BLOCKED"
},
    fallbackModels: [
      {
        id: 'sonar-pro',
        name: 'Sonar Pro',
        provider: 'Perplexity',
        contextWindow: 127000,
        isDefault: true,
        capabilities: { text: true, streaming: true, vision: false, tools: false, json: true }
      },
      {
        id: 'sonar',
        name: 'Sonar',
        provider: 'Perplexity',
        contextWindow: 127000,
        capabilities: { text: true, streaming: true, vision: false, tools: false, json: true }
      },
      {
        id: 'sonar-reasoning',
        name: 'Sonar Reasoning',
        provider: 'Perplexity',
        contextWindow: 127000,
        capabilities: { text: true, streaming: true, vision: false, tools: false, json: true }
      }
    ],
    capabilities: {
      text: true,
      streaming: true,
      vision: false,
      tools: false,
      json: true,
      fileInput: false
    }
  },
  {
    id: 'xai',
    name: 'xAI (Grok)',
    description: 'Grok 2 multimodal intelligence by xAI',
    keyPatterns: [/^xai-[a-zA-Z0-9]{40,}$/],
    adapterType: 'openai-compatible',
    baseUrl: 'https://api.x.ai/v1',
    chatEndpoint: '/chat/completions',
    modelsEndpoint: '/models',
    documentationUrl: 'https://docs.x.ai',
    authHeader: 'Authorization',
    authPrefix: 'Bearer',
    defaultModelId: 'grok-2-latest',
    tier: 2,
    
    connectionMode: 'UNKNOWN',
    browserCompatibility: 'UNKNOWN',
    corsStatus: 'UNKNOWN',
    recommendedTransport: 'DIRECT',
    truth: {
      "implementation": "IMPLEMENTED",
      "unitTests": "PASSED",
      "realApi": "NOT_TESTED",
      "browser": "UNVERIFIED",
      "transport": "DIRECT_READY",
      "corsStatus": "UNKNOWN"
},
    capabilities: {
      text: true,
      streaming: true,
      vision: true,
      tools: true,
      json: true,
      fileInput: false
    }
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    description: 'European frontier models including Mistral Large and Codestral',
    keyPatterns: [/^[a-zA-Z0-9]{32}$/],
    adapterType: 'openai-compatible',
    baseUrl: 'https://api.mistral.ai/v1',
    chatEndpoint: '/chat/completions',
    modelsEndpoint: '/models',
    documentationUrl: 'https://docs.mistral.ai',
    authHeader: 'Authorization',
    authPrefix: 'Bearer',
    defaultModelId: 'mistral-large-latest',
    tier: 2,
    
    connectionMode: 'UNKNOWN',
    browserCompatibility: 'UNKNOWN',
    corsStatus: 'UNKNOWN',
    recommendedTransport: 'DIRECT',
    truth: {
      "implementation": "IMPLEMENTED",
      "unitTests": "PASSED",
      "realApi": "NOT_TESTED",
      "browser": "UNVERIFIED",
      "transport": "DIRECT_READY",
      "corsStatus": "UNKNOWN"
},
    capabilities: {
      text: true,
      streaming: true,
      vision: true,
      tools: true,
      json: true,
      fileInput: false
    }
  },
  {
    id: 'sambanova',
    name: 'SambaNova',
    description: 'Ultra-fast Llama-3.3 inference on SambaNova Dataflow architecture',
    keyPatterns: [],
    adapterType: 'openai-compatible',
    baseUrl: 'https://api.sambanova.ai/v1',
    chatEndpoint: '/chat/completions',
    modelsEndpoint: '/models',
    documentationUrl: 'https://community.sambanova.ai',
    authHeader: 'Authorization',
    authPrefix: 'Bearer',
    defaultModelId: 'Meta-Llama-3.3-70B-Instruct',
    tier: 2,
    
    connectionMode: 'UNKNOWN',
    browserCompatibility: 'UNKNOWN',
    corsStatus: 'UNKNOWN',
    recommendedTransport: 'DIRECT',
    truth: {
      "implementation": "IMPLEMENTED",
      "unitTests": "PASSED",
      "realApi": "NOT_TESTED",
      "browser": "UNVERIFIED",
      "transport": "DIRECT_READY",
      "corsStatus": "UNKNOWN"
},
    capabilities: {
      text: true,
      streaming: true,
      vision: false,
      tools: true,
      json: true,
      fileInput: false
    }
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    description: 'Serverless server endpoints for open models on the Hugging Face Hub',
    keyPatterns: [/^hf_[a-zA-Z0-9]{34,}$/],
    adapterType: 'openai-compatible',
    baseUrl: 'https://api-inference.huggingface.co/v1',
    chatEndpoint: '/chat/completions',
    modelsEndpoint: '/models',
    documentationUrl: 'https://huggingface.co/docs/api-inference',
    authHeader: 'Authorization',
    authPrefix: 'Bearer',
    defaultModelId: 'meta-llama/Llama-3.2-3B-Instruct',
    tier: 2,
    
    connectionMode: 'UNKNOWN',
    browserCompatibility: 'UNKNOWN',
    corsStatus: 'UNKNOWN',
    recommendedTransport: 'DIRECT',
    truth: {
      "implementation": "IMPLEMENTED",
      "unitTests": "PASSED",
      "realApi": "NOT_TESTED",
      "browser": "UNVERIFIED",
      "transport": "DIRECT_READY",
      "corsStatus": "UNKNOWN"
},
    capabilities: {
      text: true,
      streaming: true,
      vision: false,
      tools: false,
      json: false,
      fileInput: false
    }
  },
  {
    id: 'moonshot',
    name: 'Moonshot / Kimi',
    description: 'Large context window models by Moonshot AI',
    keyPatterns: [],
    adapterType: 'openai-compatible',
    baseUrl: 'https://api.moonshot.cn/v1',
    chatEndpoint: '/chat/completions',
    modelsEndpoint: '/models',
    documentationUrl: 'https://platform.moonshot.cn/docs',
    authHeader: 'Authorization',
    authPrefix: 'Bearer',
    defaultModelId: 'moonshot-v1-8k',
    tier: 2,
    
    connectionMode: 'RELAY_REQUIRED',
    browserCompatibility: 'BLOCKED',
    corsStatus: 'BLOCKED',
    keyExposureWarning: 'Moonshot/Kimi API does not support browser cross-origin requests.',
    recommendedTransport: 'RELAY',
    truth: {
      "implementation": "IMPLEMENTED",
      "unitTests": "PASSED",
      "realApi": "NOT_TESTED",
      "browser": "BLOCKED",
      "transport": "RELAY_READY",
      "corsStatus": "BLOCKED"
},
    capabilities: {
      text: true,
      streaming: true,
      vision: false,
      tools: true,
      json: true,
      fileInput: false
    }
  },
  {
    id: 'qwen',
    name: 'Alibaba DashScope (Qwen)',
    description: 'Qwen 2.5 series foundation models via international gateway',
    keyPatterns: [],
    adapterType: 'openai-compatible',
    baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    chatEndpoint: '/chat/completions',
    modelsEndpoint: '/models',
    documentationUrl: 'https://help.aliyun.com/zh/model-studio',
    authHeader: 'Authorization',
    authPrefix: 'Bearer',
    defaultModelId: 'qwen-plus',
    tier: 2,
    
    connectionMode: 'UNKNOWN',
    browserCompatibility: 'UNKNOWN',
    corsStatus: 'UNKNOWN',
    recommendedTransport: 'DIRECT',
    truth: {
      "implementation": "IMPLEMENTED",
      "unitTests": "PASSED",
      "realApi": "NOT_TESTED",
      "browser": "UNVERIFIED",
      "transport": "DIRECT_READY",
      "corsStatus": "UNKNOWN"
},
    capabilities: {
      text: true,
      streaming: true,
      vision: true,
      tools: true,
      json: true,
      fileInput: false
    }
  },
  {
    id: 'experiential',
    name: 'Experiential Labs',
    description: 'Unified AI gateway providing high-speed access to frontier and open-source models',
    keyPatterns: [/^xpl_[a-f0-9]{40}$/i, /^xpl_[a-zA-Z0-9_-]{10,}$/],
    adapterType: 'openai-compatible',
    baseUrl: 'https://api.experientiallabs.ai/v1',
    chatEndpoint: '/chat/completions',
    modelsEndpoint: '/models',
    documentationUrl: 'https://platform.experientiallabs.ai/docs',
    authHeader: 'Authorization',
    authPrefix: 'Bearer',
    defaultModelId: 'meta-llama/llama-3.3-70b-instruct',
    tier: 2,
    
    connectionMode: 'UNKNOWN',
    browserCompatibility: 'UNKNOWN',
    corsStatus: 'UNKNOWN',
    recommendedTransport: 'DIRECT',
    truth: {
      "implementation": "IMPLEMENTED",
      "unitTests": "PASSED",
      "realApi": "NOT_TESTED",
      "browser": "UNVERIFIED",
      "transport": "DIRECT_READY",
      "corsStatus": "UNKNOWN"
    },
    fallbackModels: [
      {
        id: 'meta-llama/llama-3.3-70b-instruct',
        name: 'Llama 3.3 70B Instruct',
        provider: 'Experiential Labs',
        contextWindow: 128000,
        isDefault: true,
        capabilities: { text: true, streaming: true, vision: true, tools: true, json: true }
      },
      {
        id: 'deepseek/deepseek-chat',
        name: 'DeepSeek Chat (V3)',
        provider: 'Experiential Labs',
        contextWindow: 64000,
        capabilities: { text: true, streaming: true, vision: false, tools: true, json: true }
      },
      {
        id: 'qwen/qwen-2.5-72b-instruct',
        name: 'Qwen 2.5 72B Instruct',
        provider: 'Experiential Labs',
        contextWindow: 32768,
        capabilities: { text: true, streaming: true, vision: true, tools: true, json: true }
      }
    ],
    capabilities: {
      text: true,
      streaming: true,
      vision: true,
      tools: true,
      json: true,
      fileInput: false
    }
  },
  {
    id: 'custom',
    name: 'Custom Provider',
    description: 'Connect to any OpenAI-compatible API, local proxy, Ollama, or vLLM server',
    keyPatterns: [],
    adapterType: 'custom',
    baseUrl: '',
    chatEndpoint: '/chat/completions',
    modelsEndpoint: '/models',
    authHeader: 'Authorization',
    authPrefix: 'Bearer',
    defaultModelId: 'default',
    tier: 2,
    
    connectionMode: 'UNKNOWN',
    browserCompatibility: 'UNKNOWN',
    corsStatus: 'UNKNOWN',
    recommendedTransport: 'DIRECT',
    truth: {
      "implementation": "CUSTOM_CONFIGURABLE",
      "unitTests": "PASSED",
      "realApi": "NOT_TESTED",
      "browser": "UNVERIFIED",
      "transport": "DIRECT_READY",
      "corsStatus": "UNKNOWN"
},
    capabilities: {
      text: true,
      streaming: true,
      vision: true,
      tools: true,
      json: true,
      fileInput: true
    }
  }
];
