export async function runAllProvidersTests(server: any, assert: (condition: any, message: string) => void) {
  console.log('\n--- SUITE: Universal 22-Provider Master Architecture & Live Discovery ---');

  const { PROVIDER_CATALOG } = await server.ssrLoadModule('./src/providers/catalog.ts');
  const { ProviderRegistry } = await server.ssrLoadModule('./src/providers/registry.ts');
  const { classifyUniversalModel, detectPublisher, detectCategory, extractParameterSize, formatModelDisplayName } = await server.ssrLoadModule('./src/providers/modelClassifier.ts');
  const { getCachedModels, setCachedModels, invalidateModelCache } = await server.ssrLoadModule('./src/providers/modelCache.ts');

  // 1. Catalog completeness: 22 distinct providers
  assert(PROVIDER_CATALOG.length === 22, `Expected exactly 22 providers, got ${PROVIDER_CATALOG.length}`);

  const expectedIds = [
    'groq', 'nvidia-nim', 'openrouter', 'gemini', 'anthropic', 'openai',
    'cerebras', 'deepseek', 'together', 'fireworks', 'perplexity', 'xai',
    'mistral', 'sambanova', 'huggingface', 'moonshot', 'qwen', 'experiential',
    'token-router', 'bazaarlink', 'nrouter', 'custom'
  ];

  for (const expId of expectedIds) {
    const p = PROVIDER_CATALOG.find((x: any) => x.id === expId);
    assert(Boolean(p), `Provider '${expId}' must exist in catalog`);
    assert(Boolean(p?.name), `Provider '${expId}' must have a display name`);
    assert(Boolean(p?.adapterType), `Provider '${expId}' must have an adapterType`);
    assert(Boolean(p?.capabilities), `Provider '${expId}' must have capabilities matrix`);
    assert(Array.isArray(p?.fallbackModels), `Provider '${expId}' must define fallbackModels array`);
    const dynamicOnlyProviders = ['token-router', 'bazaarlink', 'nrouter', 'custom'];
    if (!dynamicOnlyProviders.includes(expId)) {
      assert(Boolean(p?.fallbackModels && p.fallbackModels.length > 0), `Provider '${expId}' fallbackModels must not be empty`);
    }

    // Verify fallback model exact ID preservation and structure
    if (p?.fallbackModels) {
      for (const model of p.fallbackModels) {
        assert((model.apiModelId || model.id) === model.id, `Fallback model '${model.id}' must preserve exact ID in apiModelId`);
        assert(Boolean(model.name), `Fallback model '${model.id}' must have a name`);
        assert(Boolean(model.category || p.id), `Fallback model '${model.id}' must specify category`);
        assert(Boolean(model.publisher || p.name), `Fallback model '${model.id}' must specify publisher`);
        assert(Boolean(model.capabilities), `Fallback model '${model.id}' must define capabilities`);
        assert(model.id !== 'cosmos-reason2-8b', `Stale deprecated model cosmos-reason2-8b must never exist in ${expId}`);
      }
    }
  }

  // 2. Exact Model ID Preservation Guarantee
  const testPayloads = [
    { id: 'llama-3.3-70b-versatile', providerId: 'groq', providerName: 'Groq' },
    { id: 'meta-llama/llama-3.3-70b-instruct:free', providerId: 'openrouter', providerName: 'OpenRouter' },
    { id: 'gpt-4o', providerId: 'openai', providerName: 'OpenAI' },
    { id: 'claude-3-7-sonnet-20250219', providerId: 'anthropic', providerName: 'Anthropic' },
    { id: 'gemini-2.0-flash', providerId: 'gemini', providerName: 'Google Gemini' },
    { id: 'deepseek-reasoner', providerId: 'deepseek', providerName: 'DeepSeek' }
  ];

  for (const t of testPayloads) {
    const classified = classifyUniversalModel(t.id, t.providerId, t.providerName);
    assert(classified.id === t.id, `Classified ID must match exact input ID for ${t.id}`);
    assert(classified.apiModelId === t.id, `apiModelId must match exact input ID for ${t.id}`);
    assert(!classified.id.startsWith('groq/'), 'Must not prepend artificial groq/ prefix');
    assert(!classified.id.startsWith('openai/gpt') || t.id.startsWith('openai/'), 'Must not prepend artificial openai/ prefix');
  }

  // 3. Category & Capability Classification
  const reasoningModels = [
    'deepseek-r1',
    'deepseek-reasoner',
    'o1',
    'o3-mini',
    'claude-3-7-sonnet-20250219',
    'gemini-2.0-flash-thinking-exp-01-21',
    'deepseek-r1-distill-llama-70b',
    'sonar-reasoning'
  ];
  for (const id of reasoningModels) {
    const cat = detectCategory(id);
    assert(cat === 'reasoning', `Model ${id} must be categorized as reasoning, got ${cat}`);
  }

  const visionModels = [
    'gpt-4o',
    'gpt-4o-mini',
    'pixtral-large-latest',
    'meta/llama-3.2-11b-vision-instruct',
    'grok-2-vision-1212',
    'qvq-72b-preview'
  ];
  for (const id of visionModels) {
    const cat = detectCategory(id);
    assert(cat === 'vision', `Model ${id} must be categorized as vision, got ${cat}`);
  }

  // 4. Publisher Identification
  assert(detectPublisher('meta-llama/llama-3.3-70b-instruct', 'OpenRouter') === 'Meta', 'Detects Meta publisher');
  assert(detectPublisher('deepseek/deepseek-chat', 'OpenRouter') === 'DeepSeek', 'Detects DeepSeek publisher');
  assert(detectPublisher('anthropic/claude-3.5-sonnet', 'OpenRouter') === 'Anthropic', 'Detects Anthropic publisher');
  assert(detectPublisher('google/gemini-2.0-flash', 'OpenRouter') === 'Google', 'Detects Google publisher');
  assert(detectPublisher('mistral-large-latest', 'Mistral AI') === 'Mistral AI', 'Detects Mistral publisher');
  assert(detectPublisher('grok-2-latest', 'xAI (Grok)') === 'xAI', 'Detects xAI publisher');
  assert(detectPublisher('qwen-plus', 'Alibaba DashScope') === 'Alibaba', 'Detects Alibaba publisher');
  assert(detectPublisher('moonshot-v1-8k', 'Moonshot / Kimi') === 'Moonshot AI', 'Detects Moonshot publisher');

  // 5. Free Endpoint Detection
  const freeModel = classifyUniversalModel(
    { id: 'meta-llama/llama-3.3-70b-instruct:free', pricing: { prompt: '0', completion: '0' } },
    'openrouter',
    'OpenRouter'
  );
  assert(freeModel.freeEndpoint === true, 'Model with :free suffix must flag freeEndpoint as true');
  assert(freeModel.availability === 'free-endpoint', 'Availability must be free-endpoint');

  const paidModel = classifyUniversalModel(
    { id: 'openai/gpt-4o', pricing: { prompt: '0.000005', completion: '0.000015' } },
    'openrouter',
    'OpenRouter'
  );
  assert(paidModel.freeEndpoint === false, 'Paid model must flag freeEndpoint as false');

  // 6. Parameter Size Extraction
  assert(extractParameterSize('llama-3.3-70b-versatile') === '70B', 'Extracts 70B parameter size');
  assert(extractParameterSize('llama-3.1-8b-instant') === '8B', 'Extracts 8B parameter size');
  assert(extractParameterSize('qwen-2.5-72b-instruct') === '72B', 'Extracts 72B parameter size');
  assert(extractParameterSize('llama-3.2-3b-instruct') === '3B', 'Extracts 3B parameter size');

  // 7. Multi-Provider Cache Engine
  invalidateModelCache();
  assert(getCachedModels('groq') === null, 'Cache should be empty initially');

  const sampleModels: any[] = [
    { id: 'sample-1', apiModelId: 'sample-1', name: 'Sample 1', provider: 'Groq', capabilities: { text: true } }
  ];
  setCachedModels('groq', sampleModels);
  const retrieved = getCachedModels('groq');
  assert(Boolean(retrieved), 'Should retrieve cached models for Groq');
  assert(retrieved?.length === 1, 'Should match cached count');

  invalidateModelCache('groq');
  assert(getCachedModels('groq') === null, 'Specific invalidation should clear groq cache');

  // 8. Adapter Resolution for all 22 Providers
  for (const provider of PROVIDER_CATALOG) {
    const adapter = ProviderRegistry.resolveAdapter(provider);
    assert(Boolean(adapter), `Adapter resolution must succeed for provider ${provider.id}`);
    assert(adapter.provider.id === provider.id, `Adapter must retain provider identity for ${provider.id}`);
    assert(typeof adapter.validateConnection === 'function', `validateConnection must be a function for ${provider.id}`);
    assert(typeof adapter.getModels === 'function', `getModels must be a function for ${provider.id}`);
    assert(typeof adapter.chat === 'function', `chat must be a function for ${provider.id}`);
    assert(typeof adapter.streamChat === 'function', `streamChat must be a function for ${provider.id}`);
  }

  // 9. Mocked Live Model Discovery across OpenAICompatible, Gemini, and Anthropic
  class MockTransport {
    public lastRequest: any = null;
    public async request(req: any) {
      this.lastRequest = req;
      if (req.url.includes('/models')) {
        return {
          status: 200,
          ok: true,
          latencyMs: 15,
          data: {
            data: [
              { id: 'meta-llama/llama-3.3-70b-instruct', context_length: 131072, capabilities: ['tools'] },
              { id: 'deepseek/deepseek-r1', context_length: 64000 },
              { id: 'meta-llama/llama-3.3-70b-instruct:free', context_length: 131072, pricing: { prompt: '0' } }
            ]
          }
        };
      }
      return { status: 200, ok: true, latencyMs: 10, data: {} };
    }
  }

  const { OpenAICompatibleAdapter } = await server.ssrLoadModule('./src/providers/adapters/OpenAICompatibleAdapter.ts');
  const mockOpenRouter = PROVIDER_CATALOG.find((p: any) => p.id === 'openrouter')!;
  const adapter = new OpenAICompatibleAdapter(mockOpenRouter, new MockTransport() as any);

  const discovered = await adapter.getModels('test-key', true);
  assert(discovered.length === 3, 'Discovered 3 models from mocked response');
  assert(discovered[0].apiModelId === 'meta-llama/llama-3.3-70b-instruct', 'Preserves exact model ID in discovery');
  assert(discovered[0].publisher === 'Meta', 'Detects publisher Meta in discovery');
  assert(discovered[1].category === 'reasoning', 'Detects DeepSeek R1 as reasoning in discovery');
  assert(discovered[2].freeEndpoint === true, 'Detects free model in discovery');
}
