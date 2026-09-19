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
];

function isPermittedUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    if (ALLOWED_EXACT_HOSTS.has(hostname)) return true;
    if (ALLOWED_SUFFIXES.some(suffix => hostname.endsWith(suffix))) return true;

    // Reject internal metadata & private IP ranges to prevent SSRF
    if (
      hostname === '169.254.169.254' ||
      hostname === 'metadata.google.internal' ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return false;
    }

    // Permit other custom HTTPS API endpoints
    return parsed.protocol === 'https:';
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
