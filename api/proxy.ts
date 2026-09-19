export const config = {
  runtime: 'edge',
};

const ALLOWED_EXACT_HOSTS = new Set([
  'api.experientiallabs.ai',
  'api.groq.com',
  'integrate.api.nvidia.com',
  'openrouter.ai',
  'generativelanguage.googleapis.com',
  'api.anthropic.com',
  'api.openai.com',
  'api.cerebras.ai',
  'api.deepseek.com',
  'api.together.xyz',
  'api.fireworks.ai',
  'api.perplexity.ai',
  'api.x.ai',
  'api.mistral.ai',
  'api.sambanova.ai',
  'api-inference.huggingface.co',
  'api.moonshot.cn',
  'dashscope-intl.aliyuncs.com',
  'dashscope.aliyuncs.com',
  'beta.token-router.org',
  'token-router.org',
  'api.bazaarlink.ai',
  'bazaarlink.ai',
  'api.nrouter.ai',
  'nrouter.ai',
  'api.cohere.com',
  'api.cohere.ai',
  'api.ai21.com',
  'api.replicate.com'
]);

const ALLOWED_SUFFIXES = [
  '.experientiallabs.ai',
  '.token-router.org',
  '.bazaarlink.ai',
  '.nrouter.ai',
  '.openai.com',
  '.anthropic.com',
  '.groq.com',
  '.nvidia.com',
  '.openrouter.ai',
  '.together.xyz',
  '.fireworks.ai',
  '.cerebras.ai',
  '.deepseek.com',
  '.perplexity.ai',
  '.x.ai',
  '.mistral.ai',
  '.sambanova.ai',
  '.huggingface.co',
  '.moonshot.cn',
  '.aliyuncs.com',
  '.cohere.com',
  '.cohere.ai',
  '.ai21.com',
  '.replicate.com'
];

/**
 * Security Architecture & SSRF Defense-in-Depth:
 * 1. Protocol: HTTPS is strictly required for all upstream targets.
 * 2. Host allowlist: Only explicitly curated AI provider hosts and server-configured custom hosts are permitted.
 * 3. Client headers: Client-supplied headers (e.g. x-arh-custom-host) are strictly IGNORED and cannot bypass host validation.
 * 4. Redirects: Upstream fetch uses redirect: 'manual' to prevent 3xx redirects to internal/metadata endpoints.
 * 5. Private IP/Metadata rejection: Rejects loopback, RFC1918, link-local, cloud metadata, multicast, and private TLDs.
 *
 * Runtime Limitation Note (DNS Rebinding):
 * In serverless edge and browser/Node environments utilizing standard Web Fetch, DNS resolution is handled
 * internally by the runtime engine without exposing pre-connection socket IP pinning or hookable DNS resolution.
 * Consequently, time-of-check to time-of-use DNS rebinding attacks on dynamically registered public domain names
 * cannot be validated at the TCP socket layer in standard Edge Fetch. Limiting requests strictly to trusted provider
 * domain names and server-curated domains mitigates this vector.
 */

export function isPrivateOrMetadataHost(hostname: string): boolean {
  // Strip IPv6 brackets if present (e.g. "[::1]" -> "::1")
  const cleanHost = hostname.replace(/^\[|\]$/g, '').trim().toLowerCase();

  // Hostname / domain suffixes representing internal networks or cloud metadata
  if (
    cleanHost === 'localhost' ||
    cleanHost.endsWith('.localhost') ||
    cleanHost === 'metadata.google.internal' ||
    cleanHost === 'metadata.goog' ||
    cleanHost.endsWith('.internal') ||
    cleanHost.includes('.internal.') ||
    cleanHost.endsWith('.local') ||
    cleanHost.includes('.local.') ||
    cleanHost.endsWith('.lan') ||
    cleanHost.endsWith('.corp') ||
    cleanHost.endsWith('.home') ||
    cleanHost.endsWith('.onion')
  ) {
    return true;
  }

  // Pure integer or hexadecimal IP representations (e.g. 2130706433, 0x7f000001)
  if (/^\d+$/.test(cleanHost) || /^0x[0-9a-f]+$/i.test(cleanHost)) {
    return true;
  }

  // IPv6 checks (loopback, unspecified, IPv4-mapped IPv6, ULA, link-local, multicast)
  if (cleanHost.includes(':')) {
    if (
      cleanHost === '::' ||
      cleanHost === '::1' ||
      cleanHost.startsWith('::ffff:') || // IPv4-mapped IPv6
      cleanHost.startsWith('fc') ||       // ULA fc00::/7
      cleanHost.startsWith('fd') ||       // ULA fc00::/7
      cleanHost.startsWith('fe8') ||      // Link-local fe80::/10
      cleanHost.startsWith('fe9') ||
      cleanHost.startsWith('fea') ||
      cleanHost.startsWith('feb') ||
      cleanHost.startsWith('ff')          // Multicast ff00::/8
    ) {
      return true;
    }
  }

  // IPv4 checks
  if (
    cleanHost === '0.0.0.0' ||
    cleanHost === '127.0.0.1' ||
    cleanHost.startsWith('127.') ||     // Loopback 127.0.0.0/8
    cleanHost.startsWith('10.') ||      // RFC 1918 10.0.0.0/8
    cleanHost.startsWith('192.168.') || // RFC 1918 192.168.0.0/16
    cleanHost.startsWith('169.254.') || // Link-local / Cloud metadata 169.254.0.0/16
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(cleanHost) || // RFC 1918 172.16.0.0/12
    // Carrier-Grade NAT (CGNAT) / Cloud metadata range (100.64.0.0/10 -> 100.64.x.x - 100.127.x.x, includes 100.100.100.200)
    /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./.test(cleanHost) ||
    // Multicast & reserved (224.0.0.0/4 -> 224-255.*)
    /^(22[4-9]|2[3-5][0-9])\./.test(cleanHost)
  ) {
    return true;
  }

  return false;
}

/**
 * Reads trusted custom hosts configured strictly via server environment variable.
 * Untrusted client headers can NEVER set or bypass this.
 */
export function getServerAllowedCustomHosts(): Set<string> {
  const envHosts = typeof process !== 'undefined' && process.env?.ARH_ALLOWED_CUSTOM_HOSTS;
  if (!envHosts) return new Set();
  return new Set(
    envHosts
      .split(',')
      .map(h => h.trim().toLowerCase())
      .filter(Boolean)
  );
}

/**
 * Verifies if target URL is permitted by strict server-side allowlist.
 * Client headers CANNOT override or bypass this check.
 * Optional serverTrustedHosts parameter allows server code or tests to supply
 * trusted server-side hosts (such as from environment variables).
 */
export function isPermittedUrl(
  rawUrl: string,
  serverTrustedHosts?: Set<string> | string[]
): boolean {
  try {
    const parsed = new URL(rawUrl);
    // Enforce HTTPS exclusively
    if (parsed.protocol !== 'https:') {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Reject internal metadata & private IP ranges to prevent SSRF
    if (isPrivateOrMetadataHost(hostname)) {
      return false;
    }

    // Check official provider exact allowlist
    if (ALLOWED_EXACT_HOSTS.has(hostname)) return true;

    // Check official provider suffix allowlist
    if (ALLOWED_SUFFIXES.some(suffix => hostname.endsWith(suffix))) return true;

    // Check server-configured trusted custom hosts only
    const trustedHosts = serverTrustedHosts
      ? (Array.isArray(serverTrustedHosts) ? new Set(serverTrustedHosts.map(h => h.toLowerCase())) : serverTrustedHosts)
      : getServerAllowedCustomHosts();

    if (trustedHosts.has(hostname)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export default async function handler(req: Request): Promise<Response> {
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: 'Missing target url parameter' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }

  // Strict server allowlist validation: client headers cannot bypass or alter this check
  if (!isPermittedUrl(targetUrl)) {
    return new Response(JSON.stringify({ error: 'Target URL host is not permitted by proxy allowlist policy' }), {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }

  const forwardHeaders: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (!['host', 'connection', 'content-length', 'origin', 'referer', 'accept-encoding'].includes(lower)) {
      forwardHeaders[key] = value;
    }
  });

  try {
    const isBodyAllowed = req.method !== 'GET' && req.method !== 'HEAD';
    const bodyBuffer = isBodyAllowed ? await req.arrayBuffer() : undefined;
    const upstreamRes = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: bodyBuffer,
      redirect: 'manual',
    });

    const resHeaders: Record<string, string> = {
      ...corsHeaders,
    };

    upstreamRes.headers.forEach((val, key) => {
      const lower = key.toLowerCase();
      if (!['content-length', 'transfer-encoding', 'connection', 'content-encoding'].includes(lower)) {
        resHeaders[key] = val;
      }
    });

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: resHeaders,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Upstream connection error' }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
}
