import { createServer } from 'file:///C:/Users/aruch/.arh_env/node_modules/vite/dist/node/index.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n========================================');
  console.log('       ARH PROVIDER ENGINE TESTS        ');
  console.log('========================================\n');

  const server = await createServer();

  try {
    const { ProviderDetector } = await server.ssrLoadModule('./src/providers/detection.ts');
    const { PROVIDER_CATALOG } = await server.ssrLoadModule('./src/providers/catalog.ts');
    const { ProviderRegistry } = await server.ssrLoadModule('./src/providers/registry.ts');
    const { normalizeError } = await server.ssrLoadModule('./src/providers/error-normalizer.ts');
    const { maskApiKey, sanitizeHeaders } = await server.ssrLoadModule('./src/utils/maskApiKey.ts');

    // ----------------------------------------------------
    // TEST SUITE 1: Provider Catalog Integrity
    // ----------------------------------------------------
    console.log('[1] Testing Provider Catalog Integrity...');
    assert(Array.isArray(PROVIDER_CATALOG) && PROVIDER_CATALOG.length >= 18, `Catalog has ${PROVIDER_CATALOG?.length} providers (expected >= 18)`);
    
    const requiredProviders = ['groq', 'nvidia-nim', 'openrouter', 'gemini', 'anthropic', 'openai', 'cerebras', 'deepseek', 'together', 'fireworks', 'perplexity', 'xai', 'mistral', 'sambanova', 'huggingface', 'moonshot', 'qwen', 'experiential', 'custom'];
    for (const id of requiredProviders) {
      const p = PROVIDER_CATALOG.find(x => x.id === id || (id === 'nvidia' && x.id === 'nvidia-nim'));
      assert(p !== undefined, `Provider '${id}' exists in catalog`);
      if (p) {
        if (p.id !== 'custom') {
          assert(!!p.name && !!p.baseUrl && !!p.defaultModelId, `Provider '${id}' has name, baseUrl, and defaultModelId`);
        } else {
          assert(!!p.name && !!p.defaultModelId, `Provider 'custom' has name and defaultModelId`);
        }
        assert(typeof p.capabilities === 'object' && typeof p.capabilities.streaming === 'boolean', `Provider '${id}' has capabilities matrix`);
      }
    }

    // ----------------------------------------------------
    // TEST SUITE 2: Multi-Stage Provider Detection
    // ----------------------------------------------------
    console.log('\n[2] Testing Multi-Stage Provider Detection...');
    
    // Groq: gsk_ + 48+ alphanumeric
    const groqKey = 'gsk_' + 'a'.repeat(48);
    const groqRes = ProviderDetector.detect(groqKey);
    assert(groqRes.confidence === 'high' && groqRes.provider?.id === 'groq', 'Groq key detected with high confidence');

    // OpenRouter: sk-or-v1- + 64 hex
    const orKey = 'sk-or-v1-' + '1234567890abcdef'.repeat(4);
    const orRes = ProviderDetector.detect(orKey);
    assert(orRes.confidence === 'high' && orRes.provider?.id === 'openrouter', 'OpenRouter key detected with high confidence');

    // Google Gemini: AIzaSy + 33 chars
    const geminiKey = 'AIzaSy' + 'B'.repeat(33);
    const geminiRes = ProviderDetector.detect(geminiKey);
    assert(geminiRes.confidence === 'high' && geminiRes.provider?.id === 'gemini', 'Google Gemini key detected with high confidence');

    // Anthropic Claude: sk-ant-api03-...
    const anthropicKey = 'sk-ant-api03-' + 'C'.repeat(40);
    const anthropicRes = ProviderDetector.detect(anthropicKey);
    assert(anthropicRes.confidence === 'high' && anthropicRes.provider?.id === 'anthropic', 'Anthropic key detected with high confidence');

    // NVIDIA NIM: nvapi-...
    const nvidiaKey = 'nvapi-' + 'D'.repeat(40);
    const nvidiaRes = ProviderDetector.detect(nvidiaKey);
    assert(nvidiaRes.confidence === 'high' && (nvidiaRes.provider?.id === 'nvidia-nim' || nvidiaRes.provider?.id === 'nvidia'), 'NVIDIA NIM key detected with high confidence');

    // Cerebras: csk-...
    const cerebrasKey = 'csk-' + 'E'.repeat(40);
    const cerebrasRes = ProviderDetector.detect(cerebrasKey);
    assert(cerebrasRes.confidence === 'high' && cerebrasRes.provider?.id === 'cerebras', 'Cerebras key detected with high confidence');

    // Fireworks: fw_...
    const fwKey = 'fw_' + 'F'.repeat(40);
    const fwRes = ProviderDetector.detect(fwKey);
    assert(fwRes.confidence === 'high' && fwRes.provider?.id === 'fireworks', 'Fireworks key detected with high confidence');

    // Perplexity: pplx-...
    const pplxKey = 'pplx-' + 'G'.repeat(40);
    const pplxRes = ProviderDetector.detect(pplxKey);
    assert(pplxRes.confidence === 'high' && pplxRes.provider?.id === 'perplexity', 'Perplexity key detected with high confidence');

    // xAI: xai-...
    const xaiKey = 'xai-' + 'H'.repeat(40);
    const xaiRes = ProviderDetector.detect(xaiKey);
    assert(xaiRes.confidence === 'high' && xaiRes.provider?.id === 'xai', 'xAI key detected with high confidence');

    // Hugging Face: hf_...
    const hfKey = 'hf_' + 'I'.repeat(34);
    const hfRes = ProviderDetector.detect(hfKey);
    assert(hfRes.confidence === 'high' && hfRes.provider?.id === 'huggingface', 'Hugging Face key detected with high confidence');

    // Experiential Labs: xpl_...
    const xplKey = 'xpl_' + '0123456789abcdef'.repeat(2) + '01234567';
    const xplRes = ProviderDetector.detect(xplKey);
    assert(xplRes.confidence === 'high' && xplRes.provider?.id === 'experiential', 'Experiential Labs key detected with high confidence');

    // DeepSeek: sk- + 32 hex chars (distinct 35 char length)
    const dsKey = 'sk-' + '1234567890abcdef1234567890abcdef';
    const dsRes = ProviderDetector.detect(dsKey);
    assert(dsRes.confidence === 'medium' && dsRes.provider?.id === 'deepseek', 'DeepSeek 32-hex key detected with medium confidence');

    // Generic sk- key: OpenAI / DeepSeek / Together / etc.
    const genericSk = 'sk-xyz123456789abcdefghijklmnopqrstuvwxyz';
    const genRes = ProviderDetector.detect(genericSk);
    assert(genRes.confidence === 'low', 'Generic sk- key returns low confidence');
    assert(genRes.candidates.some(c => c.id === 'openai'), 'Generic sk- key ranks OpenAI as candidate');
    assert(genRes.candidates.some(c => c.id === 'deepseek'), 'Generic sk- key ranks DeepSeek as candidate');

    // Empty / Blank
    const emptyRes = ProviderDetector.detect('   ');
    assert(emptyRes.confidence === 'unknown' && emptyRes.candidates.length === 0, 'Empty key safely returns unknown');

    // Gibberish / Unmatched key
    const unknownRes = ProviderDetector.detect('random_unrecognized_key_12345');
    assert(unknownRes.confidence === 'unknown', 'Unrecognized key returns unknown confidence');
    assert(unknownRes.candidates.length > 0, 'Unrecognized key provides tier 1 fallback candidates for manual selection');

    // ----------------------------------------------------
    // TEST SUITE 3: Key Masking & Header Sanitization
    // ----------------------------------------------------
    console.log('\n[3] Testing Key Masking & Header Sanitization...');
    const masked1 = maskApiKey('sk-proj-1234567890abcdef1234');
    assert(masked1.startsWith('sk-proj-') && masked1.endsWith('1234'), 'maskApiKey preserves prefix and suffix');
    assert(!masked1.includes('1234567890abcdef'), 'maskApiKey hides secret payload');

    const shortMasked = maskApiKey('12345');
    assert(shortMasked === '••••••••', 'Short key (<8 chars) completely masked');

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer gsk_1234567890abcdefghijklmn',
      'x-api-key': 'AIzaSy1234567890abcdefghijklmn',
      'X-Custom-Header': 'public-value'
    };
    const sanitized = sanitizeHeaders(headers);
    assert(sanitized['Content-Type'] === 'application/json', 'Preserves standard headers');
    assert(sanitized['X-Custom-Header'] === 'public-value', 'Preserves custom non-auth headers');
    assert(!sanitized['Authorization'].includes('1234567890abcdefghijklmn'), 'Sanitizes Authorization header');
    assert(!sanitized['x-api-key'].includes('1234567890abcdefghijklmn'), 'Sanitizes x-api-key header');

    // ----------------------------------------------------
    // TEST SUITE 4: Error Normalizer
    // ----------------------------------------------------
    console.log('\n[4] Testing Error Normalizer...');
    const err401 = normalizeError(new Error('HTTP 401 Unauthorized: Invalid API key'));
    assert(err401.code === 'AUTH_ERROR', '401 normalized to AUTH_ERROR');

    const err403 = normalizeError(new Error('HTTP 403 Forbidden: Missing scopes'));
    assert(err403.code === 'AUTH_ERROR', '403 normalized to AUTH_ERROR');

    const err429 = normalizeError(new Error('HTTP 429 Too Many Requests: Rate limit exceeded'));
    assert(err429.code === 'RATE_LIMIT', '429 normalized to RATE_LIMIT');

    const err404 = normalizeError(new Error('HTTP 404 Not Found: Model not found'));
    assert(err404.code === 'NOT_FOUND', '404 normalized to NOT_FOUND');

    const err500 = normalizeError(new Error('HTTP 500 Internal Server Error'));
    assert(err500.code === 'SERVER_ERROR', '500 normalized to SERVER_ERROR');

    const netErr = normalizeError(new TypeError('Failed to fetch'));
    assert(netErr.code === 'NETWORK_ERROR', '"Failed to fetch" normalized to NETWORK_ERROR');

    // ----------------------------------------------------
    // TEST SUITE 5: Adapter Resolution
    // ----------------------------------------------------
    console.log('\n[5] Testing Adapter Resolution...');
    const groqProvider = ProviderRegistry.getById('groq');
    const groqAdapter = ProviderRegistry.resolveAdapter(groqProvider);
    assert(groqAdapter !== undefined, 'Resolved adapter for Groq');

    const geminiProvider = ProviderRegistry.getById('gemini');
    const geminiAdapter = ProviderRegistry.resolveAdapter(geminiProvider);
    assert(geminiAdapter !== undefined, 'Resolved adapter for Gemini');

    const anthropicProvider = ProviderRegistry.getById('anthropic');
    const anthropicAdapter = ProviderRegistry.resolveAdapter(anthropicProvider);
    assert(anthropicAdapter !== undefined, 'Resolved adapter for Anthropic');

    const customDef = ProviderRegistry.createCustomProvider({
      name: 'My Local vLLM',
      baseUrl: 'http://localhost:8000/v1'
    });
    const customAdapter = ProviderRegistry.resolveAdapter(customDef);
    assert(customAdapter !== undefined && customAdapter.provider.id.startsWith('custom'), 'Resolved adapter for Custom OpenAI-compatible provider');

  } finally {
    await server.close();
  }

  console.log('\n========================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
