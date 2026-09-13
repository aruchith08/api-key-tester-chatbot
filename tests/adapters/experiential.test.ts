export async function runExperientialAdapterTests(server: any, assert: (cond: boolean, msg: string) => void) {
  console.log('\n--- SUITE: Experiential Labs Provider & Adapter Integration ---');
  const { ProviderRegistry } = await server.ssrLoadModule('./src/providers/registry.ts');
  const { ProviderDetector } = await server.ssrLoadModule('./src/providers/detection.ts');
  const { resolveConnectionStrategy } = await server.ssrLoadModule('./src/providers/transport/resolver.ts');
  const { OpenAICompatibleAdapter } = await server.ssrLoadModule('./src/providers/adapters/OpenAICompatibleAdapter.ts');

  // 1. Catalog entry & properties
  const experientialDef = ProviderRegistry.getById('experiential');
  assert(!!experientialDef, 'Experiential Labs definition exists in registry');
  assert(experientialDef?.id === 'experiential', 'Provider ID is experiential');
  assert(experientialDef?.name === 'Experiential Labs', 'Provider name is Experiential Labs');
  assert(experientialDef?.baseUrl === 'https://api.experientiallabs.ai/v1', 'Base URL is https://api.experientiallabs.ai/v1');
  assert(experientialDef?.chatEndpoint === '/chat/completions', 'Chat completions endpoint is /chat/completions');
  assert(experientialDef?.modelsEndpoint === '/models', 'Models endpoint is /models');
  assert(experientialDef?.authHeader === 'Authorization', 'Auth header is Authorization');
  assert(experientialDef?.authPrefix === 'Bearer', 'Auth prefix is Bearer');
  assert(experientialDef?.tier === 2, 'Experiential Labs is categorized under Tier 2');

  // 2. Adapter resolution
  const adapter = ProviderRegistry.resolveAdapter(experientialDef!);
  assert(adapter instanceof OpenAICompatibleAdapter, 'Resolves to OpenAICompatibleAdapter instance');

  // 3. Header formatting
  const dummyKey = 'xpl_0123456789abcdef0123456789abcdef01234567';
  const headers = (adapter as any).getHeaders(dummyKey);
  assert(headers['Authorization'] === `Bearer ${dummyKey}`, 'Headers format Authorization as Bearer <xpl_key>');
  assert(headers['Content-Type'] === 'application/json', 'Headers set Content-Type to application/json');

  // 4. URL Construction
  assert((adapter as any).buildUrl('/chat/completions') === 'https://api.experientiallabs.ai/v1/chat/completions', 'buildUrl correctly joins chat endpoint');
  assert((adapter as any).buildUrl('/models') === 'https://api.experientiallabs.ai/v1/models', 'buildUrl correctly joins models endpoint');

  // 5. Fallback models
  assert(Array.isArray(experientialDef?.fallbackModels) && experientialDef!.fallbackModels.length > 0, 'Fallback models are defined');
  const defaultModel = experientialDef?.fallbackModels?.find(m => m.isDefault);
  assert(!!defaultModel, 'Has a default fallback model configured');
  assert(defaultModel?.provider === 'Experiential Labs', 'Fallback model provider name is Experiential Labs');

  // 6. Key detection with high confidence
  const detectionRes = ProviderDetector.detect(dummyKey);
  assert(detectionRes.confidence === 'high', 'xpl_ 40-hex key detected with high confidence');
  assert(detectionRes.providerId === 'experiential', 'xpl_ key resolves providerId = experiential');
  assert(detectionRes.provider?.name === 'Experiential Labs', 'Resolved provider name is Experiential Labs');
  assert(detectionRes.rationale.includes('Experiential Labs'), 'Detection rationale explicitly mentions Experiential Labs');

  // 7. Connection Strategy & Badge
  const strategy = resolveConnectionStrategy(experientialDef!);
  assert(strategy.providerId === 'experiential', 'Strategy provider ID matches experiential');
  assert(strategy.recommendedTransport === 'DIRECT', 'Recommended transport is DIRECT');
}
