export async function runBazaarLinkAdapterTests(server: any, assert: (cond: boolean, msg: string) => void) {
  console.log('\n--- SUITE: BazaarLink Provider & Adapter Integration ---');
  const { ProviderRegistry } = await server.ssrLoadModule('./src/providers/registry.ts');
  const { ProviderDetector } = await server.ssrLoadModule('./src/providers/detection.ts');
  const { resolveConnectionStrategy } = await server.ssrLoadModule('./src/providers/transport/resolver.ts');
  const { OpenAICompatibleAdapter } = await server.ssrLoadModule('./src/providers/adapters/OpenAICompatibleAdapter.ts');

  // 1. Catalog entry & properties
  const blDef = ProviderRegistry.getById('bazaarlink');
  assert(!!blDef, 'BazaarLink definition exists in registry');
  assert(blDef?.id === 'bazaarlink', 'Provider ID is bazaarlink');
  assert(blDef?.name === 'BazaarLink', 'Provider name is BazaarLink');
  assert(blDef?.baseUrl === 'https://api.bazaarlink.ai/v1', 'Base URL is https://api.bazaarlink.ai/v1');
  assert(blDef?.chatEndpoint === '/chat/completions', 'Chat completions endpoint is /chat/completions');
  assert(blDef?.modelsEndpoint === '/models', 'Models endpoint is /models');
  assert(blDef?.authHeader === 'Authorization', 'Auth header is Authorization');
  assert(blDef?.authPrefix === 'Bearer', 'Auth prefix is Bearer');
  assert(blDef?.tier === 2, 'BazaarLink is categorized under Tier 2');

  // 2. Adapter resolution
  const adapter = ProviderRegistry.resolveAdapter(blDef!);
  assert(adapter instanceof OpenAICompatibleAdapter, 'Resolves to OpenAICompatibleAdapter instance');

  // 3. Header formatting with Bearer token
  const dummyKey = 'sk-bl-test-example-abcdef123456';
  const headers = (adapter as any).getHeaders(dummyKey);
  assert(headers['Authorization'] === `Bearer ${dummyKey}`, 'Headers format Authorization as Bearer <sk-bl-key>');
  assert(headers['Content-Type'] === 'application/json', 'Headers set Content-Type to application/json');

  // 4. URL Construction
  assert((adapter as any).buildUrl('/chat/completions') === 'https://api.bazaarlink.ai/v1/chat/completions', 'buildUrl correctly joins chat completions endpoint');
  assert((adapter as any).buildUrl('/models') === 'https://api.bazaarlink.ai/v1/models', 'buildUrl correctly joins models endpoint');

  // 5. Dynamic Model normalization with BazaarLink provider/model payload structure
  const sampleApiResponse = {
    data: [
      {
        id: 'openai/gpt-4o',
        object: 'model',
        name: 'GPT-4o',
        context_length: 128000,
        architecture: {
          modality: 'text+image->text',
          input_modalities: ['text', 'image'],
          output_modalities: ['text']
        }
      },
      {
        id: 'deepseek/deepseek-chat',
        object: 'model',
        name: 'DeepSeek Chat',
        context_length: 64000,
        architecture: {
          modality: 'text->text',
          input_modalities: ['text'],
          output_modalities: ['text']
        }
      },
      {
        id: 'auto',
        object: 'model',
        name: 'Auto Router',
        description: 'Automatically selects the best model for the request.'
      }
    ]
  };

  const normalized = (adapter as any).normalizeModels(sampleApiResponse);
  assert(normalized.length === 3, 'normalizeModels parses all models from BazaarLink data array');
  
  // Verify preserving provider/model qualified format
  assert(normalized[0].id === 'openai/gpt-4o', 'Preserves provider/model identifier format (openai/gpt-4o)');
  assert(normalized[0].name === 'GPT-4o', 'Maps name correctly');
  assert(normalized[0].contextWindow === 128000, 'Maps context_length to contextWindow');
  assert(normalized[0].capabilities.vision === true, 'Vision enabled when input_modalities includes image');

  assert(normalized[1].id === 'deepseek/deepseek-chat', 'Preserves provider/model format (deepseek/deepseek-chat)');
  assert(normalized[1].capabilities.vision === false, 'Vision disabled when input_modalities is text-only');

  assert(normalized[2].id === 'auto', 'Preserves auto router model');

  // 6. No hardcoded fallback models per official discovery rule
  assert(Array.isArray(blDef?.fallbackModels) && blDef!.fallbackModels.length === 0, 'No hardcoded fallback models per dynamic discovery rule');

  // 7. Key detection with high confidence
  const detectionRes = ProviderDetector.detect('sk-bl-test-example');
  assert(detectionRes.confidence === 'high', 'sk-bl-test-example key detected with high confidence');
  assert(detectionRes.providerId === 'bazaarlink', 'sk-bl- key resolves providerId = bazaarlink');
  assert(detectionRes.provider?.name === 'BazaarLink', 'Resolved provider name is BazaarLink');
  assert(detectionRes.rationale.includes('BazaarLink'), 'Detection rationale explicitly mentions BazaarLink');

  // 8. Generic sk- key is NOT classified as BazaarLink
  const genericSkRes = ProviderDetector.detect('sk-xyz123456789abcdefghijklmnopqrstuvwxyz');
  assert(genericSkRes.providerId !== 'bazaarlink', 'Generic sk- key is NOT classified as BazaarLink');
  assert(genericSkRes.confidence === 'low', 'Generic sk- key returns low confidence');

  // 9. Connection Strategy & Badge (DIRECT verified via live CORS preflight)
  const strategy = resolveConnectionStrategy(blDef!);
  assert(strategy.providerId === 'bazaarlink', 'Strategy provider ID matches bazaarlink');
  assert(strategy.mode === 'DIRECT', 'Connection mode is DIRECT');
  assert(strategy.transport === 'DIRECT', 'Recommended transport is DIRECT');
  assert(strategy.badge.text.includes('Direct Connection'), 'Displays Direct Connection badge');
}
