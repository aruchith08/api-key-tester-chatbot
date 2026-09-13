export interface NormalizedError {
  code: 'AUTH_ERROR' | 'RATE_LIMIT' | 'NOT_FOUND' | 'SERVER_ERROR' | 'NETWORK_ERROR' | 'BAD_REQUEST' | 'UNKNOWN_ERROR';
  message: string;
  details?: string;
  statusCode?: number;
}

export function normalizeError(err: any, status?: number): NormalizedError {
  let message = 'An unexpected error occurred.';
  let code: NormalizedError['code'] = 'UNKNOWN_ERROR';
  let details = '';

  if (typeof err === 'string') {
    details = err;
    message = err;
  } else if (err && typeof err === 'object') {
    // Check standard error formats (OpenAI, Anthropic, Gemini)
    if (err.error?.message) {
      details = err.error.message;
    } else if (err.message) {
      details = err.message;
    } else if (typeof err.error === 'string') {
      details = err.error;
    }
  }

  const s = status || (err && err.status);

  if (s === 401 || s === 403 || /invalid api key|unauthorized|authentication failed|forbidden|api_key_invalid/i.test(details)) {
    code = 'AUTH_ERROR';
    message = 'Invalid API Key. Please verify your credentials with the provider.';
  } else if (s === 429 || /rate limit|quota exceeded|too many requests|tokens per minute/i.test(details)) {
    code = 'RATE_LIMIT';
    message = 'Rate Limit Reached. Your account quota or requests per minute limit was exceeded.';
  } else if (s === 404 || /model not found|unknown model|does not exist/i.test(details)) {
    code = 'NOT_FOUND';
    message = 'Model Not Found. The requested model ID does not exist or your key lacks access.';
  } else if (s && s >= 500) {
    code = 'SERVER_ERROR';
    message = 'Provider Temporarily Unavailable. The AI provider server returned an error.';
  } else if (/failed to fetch|network error|aborted|timeout|econnrefused/i.test(details)) {
    code = 'NETWORK_ERROR';
    message = 'Network Error. Could not establish connection to the provider.';
  } else if (s === 400 || /invalid request|bad request/i.test(details)) {
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
