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

export function isPrivateOrMetadataHost(hostname: string): boolean {
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === 'metadata.google.internal' ||
    hostname.endsWith('.internal') ||
    hostname.includes('.internal.') ||
    hostname.endsWith('.local') ||
    hostname.includes('.local.') ||
    hostname.endsWith('.lan') ||
    hostname.endsWith('.corp') ||
    hostname === '169.254.169.254' ||
    hostname === '::1' ||
    hostname === '0.0.0.0' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('127.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
    hostname.startsWith('fc') ||
    hostname.startsWith('fe80')
  ) {
    return true;
  }
  return false;
}

export function isPermittedUrl(rawUrl: string, customHostHeader?: string | null): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Reject internal metadata & private IP ranges to prevent SSRF
    if (isPrivateOrMetadataHost(hostname)) {
      return false;
    }

    if (ALLOWED_EXACT_HOSTS.has(hostname)) return true;
    if (ALLOWED_SUFFIXES.some(suffix => hostname.endsWith(suffix))) return true;

    // If client specified explicit custom provider host header matching target
    if (customHostHeader && customHostHeader.toLowerCase() === hostname) {
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

  const customHost = req.headers.get('x-arh-custom-host');
  if (!isPermittedUrl(targetUrl, customHost)) {
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
    if (!['host', 'connection', 'content-length', 'origin', 'referer', 'accept-encoding', 'x-arh-custom-host'].includes(lower)) {
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
