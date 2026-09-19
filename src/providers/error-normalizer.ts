import type { NormalizedError } from './types';

/**
 * Sanitizes potentially sensitive fields from raw error payloads
 */
function sanitizeErrorPayload(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  try {
    const clone = JSON.parse(JSON.stringify(obj));
    const redactKeys = ['authorization', 'api_key', 'apikey', 'key', 'token', 'secret', 'cookie'];
    const walk = (item: any) => {
      if (!item || typeof item !== 'object') return;
      for (const k of Object.keys(item)) {
        if (redactKeys.includes(k.toLowerCase())) {
          item[k] = '••••••••';
        } else if (typeof item[k] === 'object') {
          walk(item[k]);
        }
      }
    };
    walk(clone);
    return clone;
  } catch {
    return String(obj);
  }
}

export function normalizeError(
  err: any,
  status?: number,
  contextOrProvider?: { provider?: string; model?: string; requestId?: string } | string,
  modelArg?: string
): NormalizedError {
  const context = typeof contextOrProvider === 'string'
    ? { provider: contextOrProvider, model: modelArg }
    : contextOrProvider;

  let message = 'An unexpected error occurred.';
  let code: NormalizedError['code'] = 'UNKNOWN_ERROR';
  let details = '';
  let providerCode: string | undefined;
  let providerMessage: string | undefined;
  let requestId = context?.requestId;

  if (typeof err === 'string') {
    details = err;
    message = err;
    providerMessage = err;
  } else if (err && typeof err === 'object') {
    if (err.error?.message) {
      details = err.error.message;
      providerMessage = err.error.message;
      providerCode = err.error.code || err.error.type;
    } else if (err.message) {
      details = err.message;
      providerMessage = err.message;
    } else if (typeof err.error === 'string') {
      details = err.error;
      providerMessage = err.error;
    } else if (typeof err.detail === 'string') {
      details = err.detail;
      providerMessage = err.detail;
    } else if (Array.isArray(err.errors) && err.errors.length > 0) {
      details = typeof err.errors[0] === 'string' ? err.errors[0] : JSON.stringify(err.errors[0]);
      providerMessage = details;
    }

    if (!requestId) {
      requestId = err.requestId || err.id || err.request_id || err.headers?.['x-request-id'];
    }
  }

  const s = status || (err && err.status);

  if (s === 401 || s === 403 || /invalid api key|unauthorized|authentication failed|forbidden|api_key_invalid|invalid_api_key/i.test(details)) {
    code = 'AUTH_ERROR';
    if (context?.provider && /nvidia/i.test(context.provider)) {
      message = 'Invalid NVIDIA API key or unauthorized access.';
    } else {
      message = 'Invalid API Key. Please verify your credentials with the provider.';
    }
  } else if (s === 429 || /rate limit|quota.*exceeded|exceeded.*quota|too many requests|tokens per minute|requests per day/i.test(details)) {
    code = 'RATE_LIMIT';
    if (context?.provider && /nvidia/i.test(context.provider)) {
      message = 'NVIDIA Free Endpoint rate limit reached. Please wait and try again.';
    } else {
      message = 'Rate Limit Reached. Your account quota or requests-per-minute limit was exceeded.';
    }
  } else if (s === 404 || s === 410 || /model not found|unknown model|does not exist|end of life|no longer available/i.test(details)) {
    code = 'NOT_FOUND';
    if (context?.provider && /nvidia/i.test(context.provider) && context.model) {
      message = `Model '${context.model}' is not currently available through your NVIDIA API endpoint.`;
    } else if (context?.provider && /nvidia/i.test(context.provider)) {
      message = "Model not currently available through your NVIDIA API endpoint.";
    } else if (context?.model) {
      message = `Model '${context.model}' not found or not currently available through your API endpoint.`;
    } else if (details && /end of life|no longer available/i.test(details)) {
      message = `Model Deprecated. ${details}`;
    } else {
      message = 'Model Not Found. The requested model ID does not exist or your key lacks access. Try selecting a different model from the model selector.';
    }
  } else if ((s && s >= 500) || /500|internal server error|bad gateway|service unavailable|gateway timeout/i.test(details)) {
    code = 'SERVER_ERROR';
    if (providerMessage && !/bad gateway|upstream connection error|internal server error/i.test(providerMessage)) {
      message = `Provider Error (${s || 500}): ${providerMessage}`;
    } else {
      message = 'Provider Temporarily Unavailable. The AI provider server returned an internal error.';
    }
  } else if (/cors|cross-origin|blocked by client|err_blocked_by_client/i.test(details) || (typeof window !== 'undefined' && /failed to fetch|networkerror|load failed/i.test(details) && (typeof navigator === 'undefined' || navigator.onLine !== false))) {
    code = 'BROWSER_NETWORK_ERROR';
    message = 'Browser Connection Blocked. The browser was prevented from reaching the provider API. This typically occurs because the provider does not allow direct client-side browser requests (CORS restrictions), or an ad-blocker blocked the network call.';
  } else if (/failed to fetch|network error|aborted|timeout|econnrefused/i.test(details)) {
    code = 'NETWORK_ERROR';
    message = 'Network Error. Could not establish connection to the provider.';
  } else if (s === 400 || /invalid request|bad request|unrecognized request/i.test(details)) {
    code = 'BAD_REQUEST';
    message = details || 'Invalid request format or unsupported parameter.';
  } else if (details) {
    message = details;
  }

  const isRetryable = s === 429 || s === 502 || s === 503 || s === 504 || code === 'NETWORK_ERROR';

  return {
    code,
    message,
    details,
    statusCode: s,
    provider: context?.provider,
    model: context?.model,
    providerCode,
    providerMessage,
    requestId,
    isRetryable,
    rawBody: sanitizeErrorPayload(err?.data || err?.rawBody || err)
  };
}
