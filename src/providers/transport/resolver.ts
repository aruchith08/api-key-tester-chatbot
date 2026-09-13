import type { ProviderDefinition, ResolvedConnectionStrategy, ConnectionMode } from '../types';

export function resolveConnectionStrategy(provider: ProviderDefinition): ResolvedConnectionStrategy {
  // If provider explicitly defines connectionMode, use it; otherwise infer conservatively
  let mode: ConnectionMode = provider.connectionMode || 'UNKNOWN';

  if (!provider.connectionMode) {
    const id = provider.id.toLowerCase();
    if (['openai', 'deepseek', 'perplexity', 'moonshot'].includes(id)) {
      mode = 'RELAY_REQUIRED';
    } else if (id === 'gemini' || id === 'anthropic' || id === 'custom') {
      mode = 'DIRECT_WITH_WARNING';
    } else if (['groq', 'openrouter', 'nvidia', 'nvidia-nim', 'together', 'fireworks', 'huggingface'].includes(id)) {
      mode = 'DIRECT';
    } else {
      mode = 'UNKNOWN';
    }
  }

  const caveats: string[] = [];

  if (provider.keyExposureWarning) {
    caveats.push(provider.keyExposureWarning);
  }

  if (mode === 'RELAY_REQUIRED') {
    caveats.push(`${provider.name} blocks direct browser cross-origin requests (CORS). A proxy relay is required.`);
  }

  if (provider.id === 'anthropic') {
    caveats.push('Requires `anthropic-dangerous-direct-browser-access: true` header.');
  }

  if (provider.id === 'gemini') {
    caveats.push('Transmits API key in URL query parameter (?key=...).');
  }

  if (provider.id === 'custom') {
    caveats.push('Custom/Localhost endpoints (e.g. Ollama) must have CORS enabled (e.g. OLLAMA_ORIGINS="*").');
  }

  const recommendedTransport: 'DIRECT' | 'RELAY' = mode === 'RELAY_REQUIRED' ? 'RELAY' : 'DIRECT';

  let badgeLabel = 'Direct Connection';
  let badgeType: 'direct' | 'warning' | 'relay_required' | 'unknown' = 'direct';
  let badgeText = '● Direct Connection';
  let badgeColor = 'emerald';
  let badgeDescription = `Your browser will connect directly to ${provider.name}.`;

  if (mode === 'DIRECT_WITH_WARNING') {
    badgeLabel = 'Direct (Caveats)';
    badgeType = 'warning';
    badgeText = '⚠ Direct (Caveats)';
    badgeColor = 'amber';
    badgeDescription = `Your browser will connect directly to ${provider.name}, but caveats apply.`;
  } else if (mode === 'RELAY_REQUIRED') {
    badgeLabel = 'Relay Required';
    badgeType = 'relay_required';
    badgeText = '🔒 Relay Required';
    badgeColor = 'purple';
    badgeDescription = `${provider.name} blocks browser origins (CORS). Direct connection will likely fail without a relay.`;
  } else if (mode === 'UNKNOWN') {
    badgeLabel = 'Connection Unknown';
    badgeType = 'unknown';
    badgeText = '◐ Connection Unknown';
    badgeColor = 'neutral';
    badgeDescription = `Browser compatibility for ${provider.name} has not yet been verified.`;
  }

  return {
    providerId: provider.id,
    providerName: provider.name,
    mode,
    transport: recommendedTransport,
    recommendedTransport,
    badge: {
      label: badgeLabel,
      type: badgeType,
      text: badgeText,
      color: badgeColor,
      description: badgeDescription
    },
    privacyNotice: mode === 'RELAY_REQUIRED'
      ? `DEFAULT ARH: No relay is deployed. No backend exists. Relay transport is an architectural abstraction. ${provider.name} requires a relay to bypass browser CORS and cannot currently complete requests through ARH until a relay is explicitly implemented.`
      : `Your API key stays in this browser session and is sent directly from your browser to ${provider.name}. ARH does not store, log, or receive your key.`,
    caveats: caveats.length > 0 ? caveats : undefined
  };
}
