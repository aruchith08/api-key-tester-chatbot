export async function runErrorNormalizationTests(server: any, assert: (cond: boolean, msg: string) => void) {
  console.log('\n--- SUITE: Error Normalization ---');
  const { normalizeError } = await server.ssrLoadModule('./src/providers/error-normalizer.ts');

  // 1. HTTP 401 & 403 Authentication errors
  const err401 = normalizeError({ error: { message: 'Invalid API key provided' } }, 401);
  assert(err401.code === 'AUTH_ERROR', '401 normalized to AUTH_ERROR');
  assert(err401.statusCode === 401, 'Preserves statusCode 401');

  const err403 = normalizeError('Forbidden: missing required scope', 403);
  assert(err403.code === 'AUTH_ERROR', '403 normalized to AUTH_ERROR');

  // 2. HTTP 429 Rate limits and quotas
  const err429 = normalizeError({ error: { message: 'Rate limit exceeded: 6000 TPM' } }, 429);
  assert(err429.code === 'RATE_LIMIT', '429 normalized to RATE_LIMIT');
  assert(err429.message.toLowerCase().includes('rate limit'), 'Includes user-friendly rate limit message');

  const quotaErr = normalizeError(new Error('You exceeded your current quota, please check your plan and billing details.'));
  assert(quotaErr.code === 'RATE_LIMIT', 'Quota exceeded error message normalized to RATE_LIMIT');

  // 3. HTTP 404 Model not found
  const err404 = normalizeError({ error: { message: 'The model `gpt-5-turbo` does not exist' } }, 404);
  assert(err404.code === 'NOT_FOUND', '404 normalized to NOT_FOUND');

  // 4. HTTP 500+ Server errors
  const err500 = normalizeError({ error: 'Internal Server Error' }, 500);
  assert(err500.code === 'SERVER_ERROR', '500 normalized to SERVER_ERROR');

  const err503 = normalizeError('503 Service Unavailable', 503);
  assert(err503.code === 'SERVER_ERROR', '503 normalized to SERVER_ERROR');

  // 5. Network & Browser CORS errors
  const fetchErr = normalizeError(new TypeError('Failed to fetch'));
  assert(fetchErr.code === 'NETWORK_ERROR', 'Failed to fetch in server environment normalized to NETWORK_ERROR');

  const corsErr = normalizeError(new TypeError('Cross-Origin Request Blocked: CORS policy missing'));
  assert(corsErr.code === 'BROWSER_NETWORK_ERROR', 'CORS blocked error normalized to BROWSER_NETWORK_ERROR');

  const blockedByClient = normalizeError('net::ERR_BLOCKED_BY_CLIENT');
  assert(blockedByClient.code === 'BROWSER_NETWORK_ERROR', 'Extension blocker error normalized to BROWSER_NETWORK_ERROR');

  const connRefused = normalizeError(new Error('connect ECONNREFUSED 127.0.0.1:8000'));
  assert(connRefused.code === 'NETWORK_ERROR', 'ECONNREFUSED normalized to NETWORK_ERROR');

  // 6. Bad requests
  const err400 = normalizeError({ error: { message: 'Unsupported parameter: temperature must be between 0 and 2' } }, 400);
  assert(err400.code === 'BAD_REQUEST', '400 normalized to BAD_REQUEST');
}
