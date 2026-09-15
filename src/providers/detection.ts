import { PROVIDER_CATALOG } from './catalog';
import type { ProviderDefinition, ProviderResolution } from './types';

export class ProviderDetector {
  /**
   * Evaluates an API key locally without dispatching network calls.
   * Identifies unique provider signatures, ranks ambiguous candidates, and returns
   * an authoritative single resolution with canonical providerId and explanatory rationale.
   */
  public static detect(rawKey: string): ProviderResolution {
    const key = rawKey.trim();

    if (!key) {
      return {
        providerId: null,
        provider: null,
        confidence: 'unknown',
        candidates: [],
        rationale: 'No API key provided.',
        reason: 'No API key provided.'
      };
    }

    // =========================================================================
    // 1. Stage 1: High Confidence Distinct Signatures (Deterministic early return)
    // =========================================================================

    // Groq: distinct prefix 'gsk_'
    if (key.startsWith('gsk_') || /^gsk_[a-zA-Z0-9_-]+$/.test(key)) {
      const groq = PROVIDER_CATALOG.find(p => p.id === 'groq')!;
      return {
        providerId: 'groq',
        provider: groq,
        confidence: 'high',
        candidates: [groq],
        rationale: 'Recognized distinct Groq key prefix (gsk_).',
        reason: 'Recognized distinct Groq key prefix (gsk_).'
      };
    }

    // NVIDIA NIM: distinct prefix 'nvapi-'
    if (key.startsWith('nvapi-') || /^nvapi-[A-Za-z0-9_-]+$/i.test(key)) {
      const nvidia = PROVIDER_CATALOG.find(p => p.id === 'nvidia-nim' || p.id === 'nvidia')!;
      return {
        providerId: nvidia.id,
        provider: nvidia,
        confidence: 'high',
        candidates: [nvidia],
        rationale: 'Recognized distinct NVIDIA NIM API key prefix (nvapi-).',
        reason: 'Recognized distinct NVIDIA NIM API key prefix (nvapi-).'
      };
    }

    // OpenRouter: distinct prefix 'sk-or-v1-'
    if (key.startsWith('sk-or-v1-') || /^sk-or-v1-[a-f0-9]+$/i.test(key)) {
      const openrouter = PROVIDER_CATALOG.find(p => p.id === 'openrouter')!;
      return {
        providerId: 'openrouter',
        provider: openrouter,
        confidence: 'high',
        candidates: [openrouter],
        rationale: 'Recognized distinct OpenRouter key format (sk-or-v1-).',
        reason: 'Recognized distinct OpenRouter key format (sk-or-v1-).'
      };
    }

    // Google Gemini: distinct prefix 'AIzaSy'
    if (key.startsWith('AIzaSy') || /^AIzaSy[0-9A-Za-z_-]+$/.test(key)) {
      const gemini = PROVIDER_CATALOG.find(p => p.id === 'gemini')!;
      return {
        providerId: 'gemini',
        provider: gemini,
        confidence: 'high',
        candidates: [gemini],
        rationale: 'Recognized distinct Google Gemini API key format (AIzaSy...).',
        reason: 'Recognized distinct Google Gemini API key format (AIzaSy...).'
      };
    }

    // Anthropic Claude: distinct prefix 'sk-ant-'
    if (key.startsWith('sk-ant-') || /^sk-ant-[a-zA-Z0-9_-]+$/.test(key)) {
      const anthropic = PROVIDER_CATALOG.find(p => p.id === 'anthropic')!;
      return {
        providerId: 'anthropic',
        provider: anthropic,
        confidence: 'high',
        candidates: [anthropic],
        rationale: 'Recognized distinct Anthropic Claude key format (sk-ant-).',
        reason: 'Recognized distinct Anthropic Claude key format (sk-ant-).'
      };
    }

    // Cerebras: distinct prefix 'csk-'
    if (key.startsWith('csk-') || /^csk-[a-zA-Z0-9_-]+$/.test(key)) {
      const cerebras = PROVIDER_CATALOG.find(p => p.id === 'cerebras')!;
      return {
        providerId: 'cerebras',
        provider: cerebras,
        confidence: 'high',
        candidates: [cerebras],
        rationale: 'Recognized distinct Cerebras Cloud API key prefix (csk-).',
        reason: 'Recognized distinct Cerebras Cloud API key prefix (csk-).'
      };
    }

    // Fireworks AI: distinct prefix 'fw_'
    if (key.startsWith('fw_') || /^fw_[a-zA-Z0-9_-]+$/.test(key)) {
      const fireworks = PROVIDER_CATALOG.find(p => p.id === 'fireworks')!;
      return {
        providerId: 'fireworks',
        provider: fireworks,
        confidence: 'high',
        candidates: [fireworks],
        rationale: 'Recognized distinct Fireworks AI key prefix (fw_).',
        reason: 'Recognized distinct Fireworks AI key prefix (fw_).'
      };
    }

    // Perplexity: distinct prefix 'pplx-'
    if (key.startsWith('pplx-') || /^pplx-[a-zA-Z0-9_-]+$/.test(key)) {
      const pplx = PROVIDER_CATALOG.find(p => p.id === 'perplexity')!;
      return {
        providerId: 'perplexity',
        provider: pplx,
        confidence: 'high',
        candidates: [pplx],
        rationale: 'Recognized distinct Perplexity API key format (pplx-).',
        reason: 'Recognized distinct Perplexity API key format (pplx-).'
      };
    }

    // xAI Grok: distinct prefix 'xai-'
    if (key.startsWith('xai-') || /^xai-[a-zA-Z0-9_-]+$/.test(key)) {
      const xai = PROVIDER_CATALOG.find(p => p.id === 'xai')!;
      return {
        providerId: 'xai',
        provider: xai,
        confidence: 'high',
        candidates: [xai],
        rationale: 'Recognized distinct xAI Grok API key prefix (xai-).',
        reason: 'Recognized distinct xAI Grok API key prefix (xai-).'
      };
    }

    // Hugging Face: distinct prefix 'hf_'
    if (key.startsWith('hf_') || /^hf_[a-zA-Z0-9_-]+$/.test(key)) {
      const hf = PROVIDER_CATALOG.find(p => p.id === 'huggingface')!;
      return {
        providerId: 'huggingface',
        provider: hf,
        confidence: 'high',
        candidates: [hf],
        rationale: 'Recognized distinct Hugging Face user access token prefix (hf_).',
        reason: 'Recognized distinct Hugging Face user access token prefix (hf_).'
      };
    }

    // OpenAI Project / Admin: 'sk-proj-' or 'sk-admin-'
    if (key.startsWith('sk-proj-') || key.startsWith('sk-admin-') || /^sk-(?:proj|admin)-[a-zA-Z0-9_-]+$/.test(key)) {
      const openai = PROVIDER_CATALOG.find(p => p.id === 'openai')!;
      return {
        providerId: 'openai',
        provider: openai,
        confidence: 'high',
        candidates: [openai],
        rationale: 'Recognized OpenAI Project / Admin key format (sk-proj-).',
        reason: 'Recognized OpenAI Project / Admin key format (sk-proj-).'
      };
    }

    // Experiential Labs: distinct prefix 'xpl_'
    if (key.startsWith('xpl_') || /^xpl_[a-f0-9]{40}$/i.test(key) || /^xpl_[a-zA-Z0-9_-]+$/.test(key)) {
      const experiential = PROVIDER_CATALOG.find(p => p.id === 'experiential')!;
      return {
        providerId: 'experiential',
        provider: experiential,
        confidence: 'high',
        candidates: [experiential],
        rationale: 'Recognized distinct Experiential Labs API key prefix (xpl_).',
        reason: 'Recognized distinct Experiential Labs API key prefix (xpl_).'
      };
    }

    // Token Router: distinct prefix 'vk_live_'
    if (key.startsWith('vk_live_') || /^vk_live_[A-Za-z0-9_-]+$/.test(key)) {
      const tokenRouter = PROVIDER_CATALOG.find(p => p.id === 'token-router')!;
      return {
        providerId: 'token-router',
        provider: tokenRouter,
        confidence: 'high',
        candidates: [tokenRouter],
        rationale: 'Recognized distinct Token Router API key prefix (vk_live_).',
        reason: 'Recognized distinct Token Router API key prefix (vk_live_).'
      };
    }

    // BazaarLink: distinct prefix 'sk-bl-'
    if (key.startsWith('sk-bl-') || /^sk-bl-[A-Za-z0-9_-]+$/.test(key)) {
      const bazaarlink = PROVIDER_CATALOG.find(p => p.id === 'bazaarlink')!;
      return {
        providerId: 'bazaarlink',
        provider: bazaarlink,
        confidence: 'high',
        candidates: [bazaarlink],
        rationale: 'Recognized distinct BazaarLink API key prefix (sk-bl-).',
        reason: 'Recognized distinct BazaarLink API key prefix (sk-bl-).'
      };
    }

    // =========================================================================
    // 2. Stage 2: Medium Confidence Heuristics
    // =========================================================================

    // DeepSeek keys are 32 hexadecimal characters prefixed by sk-
    if (/^sk-[a-f0-9]{32}$/i.test(key)) {
      const deepseek = PROVIDER_CATALOG.find(p => p.id === 'deepseek')!;
      const openai = PROVIDER_CATALOG.find(p => p.id === 'openai')!;
      return {
        providerId: 'deepseek',
        provider: deepseek,
        confidence: 'medium',
        candidates: [deepseek, openai],
        rationale: 'Key matches DeepSeek 32-character hexadecimal format (sk-xxxxxxxx). Could also be an OpenAI-compatible gateway.',
        reason: 'Key matches DeepSeek 32-character hexadecimal format (sk-xxxxxxxx). Could also be an OpenAI-compatible gateway.'
      };
    }

    // 64-character hex keys (Together AI)
    if (/^[a-f0-9]{64}$/i.test(key)) {
      const together = PROVIDER_CATALOG.find(p => p.id === 'together')!;
      const openrouter = PROVIDER_CATALOG.find(p => p.id === 'openrouter')!;
      return {
        providerId: 'together',
        provider: together,
        confidence: 'medium',
        candidates: [together, openrouter],
        rationale: 'Matches 64-character hex format (commonly Together AI).',
        reason: 'Matches 64-character hex format (commonly Together AI).'
      };
    }

    // =========================================================================
    // 3. Stage 3: Low Confidence Ambiguous Patterns (Generic sk- keys)
    // =========================================================================
    if (key.startsWith('sk-') || /^sk-[a-zA-Z0-9_-]{10,}$/.test(key)) {
      const openai = PROVIDER_CATALOG.find(p => p.id === 'openai')!;
      const deepseek = PROVIDER_CATALOG.find(p => p.id === 'deepseek')!;
      const mistral = PROVIDER_CATALOG.find(p => p.id === 'mistral')!;
      const moonshot = PROVIDER_CATALOG.find(p => p.id === 'moonshot')!;
      const qwen = PROVIDER_CATALOG.find(p => p.id === 'qwen')!;

      return {
        providerId: 'openai',
        provider: openai,
        confidence: 'low',
        candidates: [openai, deepseek, mistral, moonshot, qwen],
        rationale: 'Generic sk- key prefix used by multiple OpenAI-compatible providers. Please confirm your provider.',
        reason: 'Generic sk- key prefix used by multiple OpenAI-compatible providers. Please confirm your provider.'
      };
    }

    // =========================================================================
    // 4. Stage 4: Unknown / Unmatched Key Format
    // =========================================================================
    const tier1Candidates = PROVIDER_CATALOG.filter(p => p.tier === 1);
    return {
      providerId: null,
      provider: null,
      confidence: 'unknown',
      candidates: tier1Candidates,
      rationale: 'Could not automatically identify provider from key pattern. Please select your provider below.',
      reason: 'Could not automatically identify provider from key pattern. Please select your provider below.'
    };
  }
}
