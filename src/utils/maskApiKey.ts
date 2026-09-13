/**
 * Safely masks an API key so that only a prefix and the last 4 characters are visible.
 * Never exposes the full key.
 * Example: 'sk-proj-1234567890abcdef1234' -> 'sk-proj-••••••••••••1234'
 */
export function maskApiKey(key: string): string {
  if (!key) return '';
  const trimmed = key.trim();
  if (trimmed.length <= 8) {
    return '••••••••';
  }

  // Detect common prefix (e.g. sk-proj-, sk-ant-, gsk_, nvapi-, etc.)
  const prefixMatch = trimmed.match(/^([a-zA-Z0-9_-]{2,10}[-_])/);
  const prefix = prefixMatch ? prefixMatch[1] : trimmed.substring(0, 3);
  const suffix = trimmed.substring(trimmed.length - 4);
  
  return `${prefix}••••••••${suffix}`;
}

/**
 * Sanitizes headers by masking authorization tokens, API keys, or custom secret headers.
 */
export function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (
      lower.includes('auth') || 
      lower.includes('key') || 
      lower.includes('token') || 
      lower.includes('secret') ||
      lower === 'x-goog-api-key' ||
      lower === 'x-api-key' ||
      lower === 'api-key'
    ) {
      sanitized[key] = maskApiKey(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Sanitizes URLs by masking sensitive query parameters like ?key=... or &api_key=...
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  return url.replace(/([?&](?:key|api_key|token|apikey)=)([^&]+)/gi, (_match, prefix, val) => {
    return `${prefix}${maskApiKey(val)}`;
  });
}
