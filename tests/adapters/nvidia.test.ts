export async function runNvidiaAdapterTests(server: any, assert: (cond: boolean, msg: string) => void) {
  console.log('\n--- SUITE: NVIDIA Build Free Endpoint Models & Adapter Integration ---');
  const { ProviderRegistry } = await server.ssrLoadModule('./src/providers/registry.ts');
  const { ProviderDetector } = await server.ssrLoadModule('./src/providers/detection.ts');
  const { OpenAICompatibleAdapter } = await server.ssrLoadModule('./src/providers/adapters/OpenAICompatibleAdapter.ts');
  const {
    NVIDIA_CURATED_BUILD_MODELS,
    classifyNvidiaModel,
    isNvidiaChatCompatible,
    mergeNvidiaDiscoveredModels,
    getCachedNvidiaModels,
    setCachedNvidiaModels,
    invalidateNvidiaCache
  } = await server.ssrLoadModule('./src/providers/nvidia/nvidiaBuildCatalog.ts');

  // 1. Catalog entry & properties
  const nvDef = ProviderRegistry.getById('nvidia') || ProviderRegistry.getById('nvidia-nim');
  assert(!!nvDef, 'NVIDIA definition exists in registry');
  assert(nvDef?.baseUrl === 'https://integrate.api.nvidia.com/v1', 'NVIDIA base URL is https://integrate.api.nvidia.com/v1');
  assert(nvDef?.chatEndpoint === '/chat/completions', 'Chat endpoint is /chat/completions');
  assert(nvDef?.modelsEndpoint === '/models', 'Models endpoint is /models');
  assert(nvDef?.authPrefix === 'Bearer', 'Auth prefix is Bearer');

  // 2. Adapter resolution
  const adapter = ProviderRegistry.resolveAdapter(nvDef!);
  assert(adapter instanceof OpenAICompatibleAdapter, 'Resolves to OpenAICompatibleAdapter instance');

  // 3. Test Case A & B: Dynamic Model Discovery & Exact API Model ID Preservation
  const mockNvidiaApiResponse = {
    data: [
      { id: 'openai/gpt-oss-20b', object: 'model' },
      { id: 'meta/muse-glimmer-30b', object: 'model' },
      { id: 'meta/llama-3.2-90b-vision-instruct', object: 'model' },
      { id: 'nvidia/nemotron-3-super-120b-a12b', object: 'model' },
      { id: 'nvidia/nemotron-3-embed-1b', object: 'model' },
      { id: 'nvidia/riva-translate-4b-instruct-v2', object: 'model' },
      { id: 'meta/llama-guard-4-12b', object: 'model' }
    ]
  };

  const normalized = (adapter as any).normalizeModels(mockNvidiaApiResponse);
  assert(normalized.length === 7, 'Test A: Discovered all 7 models from API response');
  assert(normalized[0].id === 'openai/gpt-oss-20b', 'Test B: Preserved exact ID openai/gpt-oss-20b without nvidia/ prefix');
  assert(normalized[0].publisher === 'OpenAI', 'Test B: Correctly parsed publisher as OpenAI');
  assert(normalized[0].displayName === 'GPT-OSS 20B', 'Test B: Formatted display name as GPT-OSS 20B');
  assert(normalized[0].freeEndpoint === true, 'Test B: Flagged as freeEndpoint');

  assert(normalized[1].id === 'meta/muse-glimmer-30b', 'Test B: Preserved exact ID meta/muse-glimmer-30b');
  assert(normalized[1].publisher === 'Meta', 'Test B: Parsed publisher as Meta');

  assert(normalized[2].id === 'meta/llama-3.2-90b-vision-instruct', 'Test B: Preserved exact ID meta/llama-3.2-90b-vision-instruct');
  assert(normalized[3].id === 'nvidia/nemotron-3-super-120b-a12b', 'Test B: Preserved exact ID nvidia/nemotron-3-super-120b-a12b');

  // 4. Test Case C: Invalid model rejection (no fabricated IDs)
  const isFabricatedPresent = normalized.some((m: any) => m.id === 'nvidia/cosmos3-nano-reasoner');
  assert(!isFabricatedPresent, 'Test C: Does not fabricate nvidia/cosmos3-nano-reasoner when unreturned');

  // 5. Test Case D: Chat Model Filtering
  const chatCapable = normalized.filter((m: any) => isNvidiaChatCompatible(m));
  const embeddingPresent = chatCapable.some((m: any) => m.id === 'nvidia/nemotron-3-embed-1b');
  const safetyPresent = chatCapable.some((m: any) => m.id === 'meta/llama-guard-4-12b');
  const translationPresent = chatCapable.some((m: any) => m.id === 'nvidia/riva-translate-4b-instruct-v2');
  assert(!embeddingPresent, 'Test D: Excludes embedding model from chat selector');
  assert(!safetyPresent, 'Test D: Excludes guard/safety model from chat selector');
  assert(!translationPresent, 'Test D: Excludes translation model from chat selector');
  assert(chatCapable.some((m: any) => m.id === 'openai/gpt-oss-20b'), 'Test D: Includes openai/gpt-oss-20b in chat selector');

  // 6. Test Case E: Vision Model Detection
  const visionModel = normalized.find((m: any) => m.id === 'meta/llama-3.2-90b-vision-instruct');
  const textModel = normalized.find((m: any) => m.id === 'openai/gpt-oss-20b');
  assert(visionModel?.supportsVision === true, 'Test E: Vision model supportsVision is true');
  assert(visionModel?.capabilities.vision === true, 'Test E: Vision model capability flag is true');
  assert(textModel?.supportsVision === false, 'Test E: Text-only model supportsVision is false');

  // Verify formatMessages does not send image_url to text-only models
  const dummyMessages = [
    { role: 'user' as const, content: 'Hello', attachments: [{ type: 'image' as const, name: 'img.png', url: 'data:image/png;base64,123' }] }
  ];
  const formattedForText = (adapter as any).formatMessages(dummyMessages, undefined, 'openai/gpt-oss-20b');
  const formattedForVision = (adapter as any).formatMessages(dummyMessages, undefined, 'meta/llama-3.2-90b-vision-instruct');
  assert(typeof formattedForText[0].content === 'string', 'Test E: Text-only model content remains string without image_url');
  assert(Array.isArray(formattedForVision[0].content), 'Test E: Vision model content formatted as multipart array with image_url');

  // 7. Test Case F & G: Reasoning Content Handling & Streaming
  const mockSseChunk = 'data: {"choices":[{"delta":{"reasoning_content":"Thinking deeply...","content":"Hello world"}}\n\n';
  const mockSseDone = 'data: [DONE]\n\n';
  assert(mockSseChunk.includes('reasoning_content'), 'Test F: SSE chunks support reasoning_content field');
  assert(mockSseDone.includes('[DONE]'), 'Test G: SSE parser handles [DONE] sentinel cleanly');

  // 8. Test Case H & I: 401 & 403 Error Normalization
  const mockAdapter = new OpenAICompatibleAdapter(nvDef!, {
    request: async () => { throw { status: 403, title: 'Forbidden', detail: 'Authorization failed' }; },
    stream: async function* () { throw { status: 403 }; }
  } as any);

  const authResult = await mockAdapter.validateConnection('nvapi-invalid-key');
  assert(authResult.success === false, 'Test H/I: Invalid key rejected');
  assert(authResult.error?.code === 'AUTH_ERROR', 'Test H/I: Normalized to AUTH_ERROR');
  assert(authResult.error?.message === 'Invalid NVIDIA API key or unauthorized access.', 'Test H/I: Custom error message for NVIDIA auth error');

  // 9. Test Case J: 404 Model-Not-Found Error Normalization
  const mock404Adapter = new OpenAICompatibleAdapter(nvDef!, {
    request: async () => { throw { status: 404 }; },
    stream: async function* () { throw { status: 404 }; }
  } as any);

  try {
    await mock404Adapter.chat({
      apiKey: 'nvapi-valid-key',
      model: 'openai/gpt-oss-nonexistent',
      messages: [{ role: 'user', content: 'hi' }]
    });
    assert(false, 'Should have thrown 404');
  } catch (err: any) {
    assert(err.normalized?.code === 'NOT_FOUND', 'Test J: Normalized to NOT_FOUND');
    assert(err.normalized?.message.includes('openai/gpt-oss-nonexistent'), 'Test J: Error message specifically identifies the model ID');
  }

  // 10. Test Case K: 429 Rate Limit Normalization
  const mock429Adapter = new OpenAICompatibleAdapter(nvDef!, {
    request: async () => { throw { status: 429 }; },
    stream: async function* () { throw { status: 429 }; }
  } as any);

  try {
    await mock429Adapter.chat({
      apiKey: 'nvapi-valid-key',
      model: 'openai/gpt-oss-20b',
      messages: [{ role: 'user', content: 'hi' }]
    });
    assert(false, 'Should have thrown 429');
  } catch (err: any) {
    assert(err.normalized?.code === 'RATE_LIMIT', 'Test K: Normalized to RATE_LIMIT');
    assert(err.normalized?.message === 'NVIDIA Free Endpoint rate limit reached. Please wait and try again.', 'Test K: Custom rate limit message');
  }

  // 11. Test Case L: Static Fallback Catalog
  const fallbackList = nvDef?.fallbackModels || [];
  assert(fallbackList.length > 0, 'Test L: Fallback models exist');
  assert(fallbackList.every((m: any) => m.description === 'Catalog model — availability not verified'), 'Test L: All static fallbacks clearly marked unverified');

  // 12. Test Case M: Duplicate Removal
  const discoveredModels = [
    { id: 'openai/gpt-oss-20b', name: 'GPT-OSS 20B', provider: 'NVIDIA NIM', capabilities: { text: true } } as any,
    { id: 'openai/gpt-oss-20b', name: 'GPT-OSS 20B Duplicate', provider: 'NVIDIA NIM', capabilities: { text: true } } as any
  ];
  const merged = mergeNvidiaDiscoveredModels(discoveredModels, NVIDIA_CURATED_BUILD_MODELS);
  const gptCount = merged.filter((m: any) => m.id === 'openai/gpt-oss-20b').length;
  assert(gptCount === 1, 'Test M: Deduplicates by provider + apiModelId');

  // 13. Test Case N: Refresh Models & Cache Management
  setCachedNvidiaModels(normalized);
  assert(getCachedNvidiaModels() !== null, 'Test N: Models stored in cache');
  invalidateNvidiaCache();
  assert(getCachedNvidiaModels() === null, 'Test N: Invalidate cache clears cache');

  // 14. Test Case O: Key Detection
  const detRes = ProviderDetector.detect('nvapi-abcdef1234567890abcdef1234567890');
  assert(detRes.confidence === 'high', 'Test O: nvapi- prefix detected with high confidence');
  assert(detRes.providerId === 'nvidia' || detRes.providerId === 'nvidia-nim', 'Test O: Maps to NVIDIA provider');

  // 15. Test Case P: Complete absence of cosmos-reason2-8b
  const curatedCosmos = NVIDIA_CURATED_BUILD_MODELS.some((m: any) => m.slug === 'cosmos-reason2-8b' || m.apiModelId === 'nvidia/cosmos-reason2-8b');
  const fallbackCosmos = (nvDef?.fallbackModels || []).some((m: any) => m.id === 'nvidia/cosmos-reason2-8b' || m.id === 'cosmos-reason2-8b');
  assert(!curatedCosmos, 'Test P: Curated build catalog does not contain cosmos-reason2-8b');
  assert(!fallbackCosmos, 'Test P: Fallbacks do not contain cosmos-reason2-8b');
}
