export async function runTokenRouterAdapterTests(server: any, assert: (cond: boolean, msg: string) => void) {
  console.log('\n--- SUITE: Token Router Provider & Adapter Integration ---');
  const { ProviderRegistry } = await server.ssrLoadModule('./src/providers/registry.ts');
  const { ProviderDetector } = await server.ssrLoadModule('./src/providers/detection.ts');
  const { resolveConnectionStrategy } = await server.ssrLoadModule('./src/providers/transport/resolver.ts');
  const { OpenAICompatibleAdapter } = await server.ssrLoadModule('./src/providers/adapters/OpenAICompatibleAdapter.ts');

  // 1. Catalog entry & properties
  const tokenRouterDef = ProviderRegistry.getById('token-router');
  assert(!!tokenRouterDef, 'Token Router definition exists in registry');
  assert(tokenRouterDef?.id === 'token-router', 'Provider ID is token-router');
  assert(tokenRouterDef?.name === 'Token Router', 'Provider name is Token Router');
  assert(tokenRouterDef?.baseUrl === 'https://beta.token-router.org/v1', 'Base URL is https://beta.token-router.org/v1');
  assert(tokenRouterDef?.chatEndpoint === '/chat/completions', 'Chat completions endpoint is /chat/completions');
  assert(tokenRouterDef?.modelsEndpoint === '/models', 'Models endpoint is /models');
  assert(tokenRouterDef?.authHeader === 'Authorization', 'Auth header is Authorization');
  assert(tokenRouterDef?.authPrefix === 'Bearer', 'Auth prefix is Bearer');
  assert(tokenRouterDef?.tier === 2, 'Token Router is categorized under Tier 2');

  // 2. Adapter resolution
  const adapter = ProviderRegistry.resolveAdapter(tokenRouterDef!);
  assert(adapter instanceof OpenAICompatibleAdapter, 'Resolves to OpenAICompatibleAdapter instance');

  // 3. Header formatting with Bearer token
  const dummyKey = 'vk_live_synthetic_test_key_abc123';
  const headers = (adapter as any).getHeaders(dummyKey);
  assert(headers['Authorization'] === `Bearer ${dummyKey}`, 'Headers format Authorization as Bearer <vk_live_key>');
  assert(headers['Content-Type'] === 'application/json', 'Headers set Content-Type to application/json');

  // 4. URL Construction
  assert((adapter as any).buildUrl('/chat/completions') === 'https://beta.token-router.org/v1/chat/completions', 'buildUrl correctly joins chat completions endpoint');
  assert((adapter as any).buildUrl('/models') === 'https://beta.token-router.org/v1/models', 'buildUrl correctly joins models endpoint');

  // 5. Dynamic Model normalization with Token Router payload structure
  const sampleApiResponse = {
    data: [
      {
        id: 'qwen3.6-27b',
        displayName: 'Qwen 3.6 27B',
        contextWindow: 131072,
        capabilities: ['chat', 'tools']
      },
      {
        id: 'gemma4-26b',
        displayName: 'Gemma 4 26B',
        contextWindow: 131072,
        capabilities: ['chat', 'vision', 'tools', 'thinking']
      }
    ]
  };

  const normalized = (adapter as any).normalizeModels(sampleApiResponse);
  assert(normalized.length === 2, 'normalizeModels parses both models from live Token Router data array');
  assert(normalized[0].name === 'Qwen 3.6 27B', 'normalizeModels maps displayName to name');
  assert(normalized[0].contextWindow === 131072, 'normalizeModels maps contextWindow correctly');
  assert(normalized[0].capabilities.tools === true, 'normalizeModels extracts tools capability from array');
  assert(normalized[0].capabilities.vision === false, 'normalizeModels respects absence of vision capability');
  assert(normalized[1].capabilities.vision === true, 'normalizeModels extracts vision capability from array');
  assert(normalized[1].capabilities.tools === true, 'normalizeModels extracts tools capability from array');

  // 6. No hardcoded fallback models per official instructions
  assert(Array.isArray(tokenRouterDef?.fallbackModels) && tokenRouterDef!.fallbackModels.length === 0, 'No hardcoded fallback models per official discovery rule');

  // 7. Key detection with high confidence
  const detectionRes = ProviderDetector.detect(dummyKey);
  assert(detectionRes.confidence === 'high', 'vk_live_ key detected with high confidence');
  assert(detectionRes.providerId === 'token-router', 'vk_live_ key resolves providerId = token-router');
  assert(detectionRes.provider?.name === 'Token Router', 'Resolved provider name is Token Router');
  assert(detectionRes.rationale.includes('Token Router'), 'Detection rationale explicitly mentions Token Router');

  // 8. Connection Strategy & Badge (RELAY_REQUIRED due to browser CORS restriction)
  const strategy = resolveConnectionStrategy(tokenRouterDef!);
  assert(strategy.providerId === 'token-router', 'Strategy provider ID matches token-router');
  assert(strategy.mode === 'RELAY_REQUIRED', 'Connection mode is RELAY_REQUIRED');
  assert(strategy.transport === 'RELAY', 'Recommended transport is RELAY');
  assert(strategy.badge.text.includes('Relay Required'), 'Displays Relay Required badge');
}
