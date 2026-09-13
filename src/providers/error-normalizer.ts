import type { NormalizedError } from './types';

export function normalizeError(err: any, status?: number): NormalizedError {
  let message = 'An unexpected error occurred.';
  let code: NormalizedError['code'] = 'UNKNOWN_ERROR';
  let details = '';

  if (typeof err === 'string') {
    details = err;
    message = err;
  } else if (err && typeof err === 'object') {
    if (err.error?.message) {
      details = err.error.message;
    } else if (err.message) {
      details = err.message;
    } else if (typeof err.error === 'string') {
      details = err.error;
    } else if (Array.isArray(err.errors) && err.errors.length > 0) {
      details = typeof err.errors[0] === 'string' ? err.errors[0] : JSON.stringify(err.errors[0]);
    }
  }

  const s = status || (err && err.status);

  if (s === 401 || s === 403 || /invalid api key|unauthorized|authentication failed|forbidden|api_key_invalid|invalid_api_key/i.test(details)) {
    code = 'AUTH_ERROR';
    message = 'Invalid API Key. Please verify your credentials with the provider.';
  } else if (s === 429 || /rate limit|quota.*exceeded|exceeded.*quota|too many requests|tokens per minute|requests per day/i.test(details)) {
    code = 'RATE_LIMIT';
    message = 'Rate Limit Reached. Your account quota or requests-per-minute limit was exceeded.';
  } else if (s === 404 || /model not found|unknown model|does not exist/i.test(details)) {
    code = 'NOT_FOUND';
    message = 'Model Not Found. The requested model ID does not exist or your key lacks access.';
  } else if ((s && s >= 500) || /500|internal server error|bad gateway|service unavailable|gateway timeout/i.test(details)) {
    code = 'SERVER_ERROR';
    message = 'Provider Temporarily Unavailable. The AI provider server returned an internal error.';
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

  return {
    code,
    message,
    details,
    statusCode: s
  };
}
