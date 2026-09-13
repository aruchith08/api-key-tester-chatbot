import { PROVIDER_DEFINITIONS } from './definitions/index';
import type { ProviderDefinition, DetectionConfidence } from '../types/provider';

export interface DetectionResult {
  provider: ProviderDefinition | null;
  confidence: DetectionConfidence;
  candidates: ProviderDefinition[];
  details: string;
}

export class ProviderDetector {
  /**
   * Analyzes an API key purely locally using known key signatures.
   * Never makes network calls during detection.
   */
  public static detect(rawKey: string): DetectionResult {
    const key = rawKey.trim();

    if (!key) {
      return {
        provider: null,
        confidence: 'unknown',
        candidates: [],
        details: 'No API key provided.'
      };
    }

    // 1. High-confidence explicit signature checks
    if (/^gsk_[a-zA-Z0-9]{48,}$/.test(key)) {
      const groq = PROVIDER_DEFINITIONS.find(p => p.id === 'groq')!;
      return {
        provider: groq,
        confidence: 'high',
        candidates: [groq],
        details: 'Recognized unique Groq key signature (gsk_...)'
      };
    }

    if (/^sk-or-v1-[a-f0-9]{64}$/.test(key)) {
      const openrouter = PROVIDER_DEFINITIONS.find(p => p.id === 'openrouter')!;
      return {
        provider: openrouter,
        confidence: 'high',
        candidates: [openrouter],
        details: 'Recognized unique OpenRouter key signature (sk-or-v1-...)'
      };
    }

    if (/^AIzaSy[0-9A-Za-z_-]{33}$/.test(key)) {
      const gemini = PROVIDER_DEFINITIONS.find(p => p.id === 'gemini')!;
      return {
        provider: gemini,
        confidence: 'high',
        candidates: [gemini],
        details: 'Recognized unique Google Gemini API key signature (AIzaSy...)'
      };
    }

    if (/^sk-ant-api03-[a-zA-Z0-9_-]{40,}$/.test(key) || /^sk-ant-[a-zA-Z0-9_-]{30,}$/.test(key)) {
      const anthropic = PROVIDER_DEFINITIONS.find(p => p.id === 'anthropic')!;
      return {
        provider: anthropic,
        confidence: 'high',
        candidates: [anthropic],
        details: 'Recognized unique Anthropic Claude key signature (sk-ant-...)'
      };
    }

    if (/^nvapi-[A-Za-z0-9_-]{30,}$/.test(key)) {
      const nvidia = PROVIDER_DEFINITIONS.find(p => p.id === 'nvidia')!;
      return {
        provider: nvidia,
        confidence: 'high',
        candidates: [nvidia],
        details: 'Recognized unique NVIDIA NIM key signature (nvapi-...)'
      };
    }

    if (/^csk-[a-zA-Z0-9]{32,}$/.test(key)) {
      const cerebras = PROVIDER_DEFINITIONS.find(p => p.id === 'cerebras')!;
      return {
        provider: cerebras,
        confidence: 'high',
        candidates: [cerebras],
        details: 'Recognized unique Cerebras key signature (csk-...)'
      };
    }

    if (/^fw_[a-zA-Z0-9]{32,}$/.test(key)) {
      const fireworks = PROVIDER_DEFINITIONS.find(p => p.id === 'fireworks')!;
      return {
        provider: fireworks,
        confidence: 'high',
        candidates: [fireworks],
        details: 'Recognized unique Fireworks AI key signature (fw_...)'
      };
    }

    if (/^pplx-[a-f0-9]{48,}$/.test(key)) {
      const pplx = PROVIDER_DEFINITIONS.find(p => p.id === 'perplexity')!;
      return {
        provider: pplx,
        confidence: 'high',
        candidates: [pplx],
        details: 'Recognized unique Perplexity key signature (pplx-...)'
      };
    }

    if (/^xai-[a-zA-Z0-9]{40,}$/.test(key)) {
      const xai = PROVIDER_DEFINITIONS.find(p => p.id === 'xai')!;
      return {
        provider: xai,
        confidence: 'high',
        candidates: [xai],
        details: 'Recognized unique xAI key signature (xai-...)'
      };
    }

    if (/^hf_[a-zA-Z0-9]{34,}$/.test(key)) {
      const hf = PROVIDER_DEFINITIONS.find(p => p.id === 'huggingface')!;
      return {
        provider: hf,
        confidence: 'high',
        candidates: [hf],
        details: 'Recognized unique Hugging Face user token (hf_...)'
      };
    }

    // 2. Project-scoped OpenAI keys
    if (/^sk-proj-[a-zA-Z0-9_-]{40,}$/.test(key) || /^sk-admin-[a-zA-Z0-9_-]{40,}$/.test(key)) {
      const openai = PROVIDER_DEFINITIONS.find(p => p.id === 'openai')!;
      return {
        provider: openai,
        confidence: 'high',
        candidates: [openai],
        details: 'Recognized OpenAI Project/Admin key signature (sk-proj-...)'
      };
    }

    // Experiential Labs (xpl_ followed by 40 hex chars or generic xpl_ prefix)
    if (/^xpl_[a-f0-9]{40}$/i.test(key) || key.startsWith('xpl_') || /^xpl_[a-zA-Z0-9_-]{10,}$/.test(key)) {
      const experiential = PROVIDER_DEFINITIONS.find(p => p.id === 'experiential')!;
      return {
        provider: experiential,
        confidence: 'high',
        candidates: [experiential],
        details: 'Recognized unique Experiential Labs key signature (xpl_...)'
      };
    }

    // 3. DeepSeek (sk- followed by 32 hex chars)
    if (/^sk-[a-f0-9]{32}$/.test(key)) {
      const deepseek = PROVIDER_DEFINITIONS.find(p => p.id === 'deepseek')!;
      const openai = PROVIDER_DEFINITIONS.find(p => p.id === 'openai')!;
      return {
        provider: deepseek,
        confidence: 'medium',
        candidates: [deepseek, openai],
        details: 'Matches DeepSeek key format (sk- + 32 hex chars). Could also be OpenAI-compatible.'
      };
    }

    // 4. Generic 64-char hex (Together AI, OpenRouter)
    if (/^[a-f0-9]{64}$/.test(key)) {
      const together = PROVIDER_DEFINITIONS.find(p => p.id === 'together')!;
      return {
        provider: together,
        confidence: 'medium',
        candidates: [together],
        details: 'Matches 64-character hexadecimal format (likely Together AI).'
      };
    }

    // 5. Generic sk- prefix (OpenAI, Mistral, Moonshot, SiliconFlow, Qwen, etc.)
    if (/^sk-[a-zA-Z0-9_-]{20,}$/.test(key)) {
      const openai = PROVIDER_DEFINITIONS.find(p => p.id === 'openai')!;
      const deepseek = PROVIDER_DEFINITIONS.find(p => p.id === 'deepseek')!;
      const mistral = PROVIDER_DEFINITIONS.find(p => p.id === 'mistral')!;
      const moonshot = PROVIDER_DEFINITIONS.find(p => p.id === 'moonshot')!;
      const qwen = PROVIDER_DEFINITIONS.find(p => p.id === 'qwen')!;

      return {
        provider: openai,
        confidence: 'low',
        candidates: [openai, deepseek, mistral, moonshot, qwen],
        details: 'Generic sk- key prefix. Many OpenAI-compatible providers share this format.'
      };
    }

    // 6. Unknown / Unmatched
    return {
      provider: null,
      confidence: 'unknown',
      candidates: PROVIDER_DEFINITIONS.filter(p => p.tier === 1),
      details: "Could not identify provider from key pattern. Please select your provider below."
    };
  }
}
