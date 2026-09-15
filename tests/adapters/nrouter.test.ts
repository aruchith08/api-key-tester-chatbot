export async function runNRouterAdapterTests(server: any, assert: (cond: boolean, msg: string) => void) {
  console.log('\n--- SUITE: NRouter Provider & Adapter Integration ---');
  const { ProviderRegistry } = await server.ssrLoadModule('./src/providers/registry.ts');
  const { ProviderDetector } = await server.ssrLoadModule('./src/providers/detection.ts');
  const { resolveConnectionStrategy } = await server.ssrLoadModule('./src/providers/transport/resolver.ts');
  const { OpenAICompatibleAdapter } = await server.ssrLoadModule('./src/providers/adapters/OpenAICompatibleAdapter.ts');

  // 1. Catalog entry & properties
  const nrDef = ProviderRegistry.getById('nrouter');
  assert(!!nrDef, 'NRouter definition exists in registry');
  assert(nrDef?.id === 'nrouter', 'Provider ID is nrouter');
  assert(nrDef?.name === 'NRouter', 'Provider name is NRouter');
  assert(nrDef?.baseUrl === 'https://api.nrouter.ai/v1', 'Base URL is https://api.nrouter.ai/v1');
  assert(nrDef?.chatEndpoint === '/chat/completions', 'Chat completions endpoint is /chat/completions');
  assert(nrDef?.modelsEndpoint === '/models', 'Models endpoint is /models');
  assert(nrDef?.authHeader === 'Authorization', 'Auth header is Authorization');
  assert(nrDef?.authPrefix === 'Bearer', 'Auth prefix is Bearer');
  assert(nrDef?.tier === 2, 'NRouter is categorized under Tier 2');

  // 2. Adapter resolution
  const adapter = ProviderRegistry.resolveAdapter(nrDef!);
  assert(adapter instanceof OpenAICompatibleAdapter, 'Resolves to OpenAICompatibleAdapter instance');

  // 3. Header formatting with Bearer token
  const dummyKey = 'sk-nrouter-test-synthetic-key-abcdef123456';
  const headers = (adapter as any).getHeaders(dummyKey);
  assert(headers['Authorization'] === `Bearer ${dummyKey}`, 'Headers format Authorization as Bearer <sk-nrouter-key>');
  assert(headers['Content-Type'] === 'application/json', 'Headers set Content-Type to application/json');

  // 4. URL Construction
  assert((adapter as any).buildUrl('/chat/completions') === 'https://api.nrouter.ai/v1/chat/completions', 'buildUrl correctly joins chat completions endpoint');
  assert((adapter as any).buildUrl('/models') === 'https://api.nrouter.ai/v1/models', 'buildUrl correctly joins models endpoint');

  // 5. Dynamic Model normalization with NRouter provider/model payload structure
  const sampleApiResponse = {
    data: [
      {
        id: 'openai/gpt-4o',
        object: 'model',
        name: 'GPT-4o',
        context_length: 128000,
        architecture: {
          input_modalities: ['text', 'image']
        }
      },
      {
        id: 'anthropic/claude-3-5-sonnet',
        object: 'model',
        name: 'Claude 3.5 Sonnet',
        context_length: 200000,
        architecture: {
          input_modalities: ['text', 'image']
        }
      },
      {
        id: 'meta-llama/llama-3.3-70b-instruct',
        object: 'model',
        name: 'Llama 3.3 70B Instruct',
        context_length: 128000
      }
    ]
  };

  const normalized = (adapter as any).normalizeModels(sampleApiResponse);
  assert(normalized.length === 3, 'normalizeModels parses all models from NRouter data array');
  
  // Verify preserving provider/model qualified format
  assert(normalized[0].id === 'openai/gpt-4o', 'Preserves provider/model identifier format (openai/gpt-4o)');
  assert(normalized[0].name === 'GPT-4o', 'Maps name correctly');
  assert(normalized[0].contextWindow === 128000, 'Maps context_length to contextWindow');
  assert(normalized[0].capabilities.vision === true, 'Vision enabled when input_modalities includes image');

  assert(normalized[1].id === 'anthropic/claude-3-5-sonnet', 'Preserves provider/model format (anthropic/claude-3-5-sonnet)');
  assert(normalized[2].id === 'meta-llama/llama-3.3-70b-instruct', 'Preserves provider/model format (meta-llama/llama-3.3-70b-instruct)');

  // 6. No hardcoded fallback models per official discovery rule
  assert(Array.isArray(nrDef?.fallbackModels) && nrDef!.fallbackModels.length === 0, 'No hardcoded fallback models per dynamic discovery rule');

  // 7. Key detection with high confidence
  const detectionRes = ProviderDetector.detect('sk-nrouter-test-synthetic-key');
  assert(detectionRes.confidence === 'high', 'sk-nrouter- key detected with high confidence');
  assert(detectionRes.providerId === 'nrouter', 'sk-nrouter- key resolves providerId = nrouter');
  assert(detectionRes.provider?.name === 'NRouter', 'Resolved provider name is NRouter');
  assert(detectionRes.rationale.includes('NRouter'), 'Detection rationale explicitly mentions NRouter');

  // 8. Generic sk- key is NOT classified as NRouter
  const genericSkRes = ProviderDetector.detect('sk-xyz123456789abcdefghijklmnopqrstuvwxyz');
  assert(genericSkRes.providerId !== 'nrouter', 'Generic sk- key is NOT classified as NRouter');
  assert(genericSkRes.confidence === 'low', 'Generic sk- key returns low confidence');

  // 9. Connection Strategy & Badge (RELAY_REQUIRED due to browser CORS restriction)
  const strategy = resolveConnectionStrategy(nrDef!);
  assert(strategy.providerId === 'nrouter', 'Strategy provider ID matches nrouter');
  assert(strategy.mode === 'RELAY_REQUIRED', 'Connection mode is RELAY_REQUIRED');
  assert(strategy.transport === 'RELAY', 'Recommended transport is RELAY');
  assert(strategy.badge.text.includes('Relay Required'), 'Displays Relay Required badge');
}
