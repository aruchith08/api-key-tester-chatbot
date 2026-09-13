export async function runGeminiAdapterTests(server: any, assert: (cond: boolean, msg: string) => void) {
  console.log('\n--- SUITE: Google Gemini Adapter ---');
  const { GeminiAdapter } = await server.ssrLoadModule('./src/providers/adapters/GeminiAdapter.ts');
  const { PROVIDER_CATALOG } = await server.ssrLoadModule('./src/providers/catalog.ts');

  const geminiDef = PROVIDER_CATALOG.find((p: any) => p.id === 'gemini')!;
  const adapter = new GeminiAdapter(geminiDef);

  // 1. Role conversion: assistant -> model, user -> user
  const messages = [
    { id: '1', role: 'user', content: 'What is photosynthesis?', timestamp: Date.now() },
    { id: '2', role: 'assistant', content: 'Photosynthesis is...', timestamp: Date.now() },
    { id: '3', role: 'user', content: 'Explain in simple terms', timestamp: Date.now() }
  ];
  const contents = (adapter as any).formatContents(messages);
  assert(contents.length === 3, 'Formatted 3 contents items');
  assert(contents[0].role === 'user' && contents[0].parts[0].text === 'What is photosynthesis?', 'User role preserved');
  assert(contents[1].role === 'model' && contents[1].parts[0].text === 'Photosynthesis is...', 'Assistant correctly converted to Gemini model role');
  assert(contents[2].role === 'user', 'Follow-up user role mapped correctly');

  // 2. Multimodal inline data conversion
  const imageMsg = [
    {
      id: 'img1',
      role: 'user',
      content: 'Describe this image',
      attachments: [
        { id: 'a1', type: 'image', url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==' }
      ],
      timestamp: Date.now()
    }
  ];
  const mmContents = (adapter as any).formatContents(imageMsg);
  assert(mmContents[0].parts.some((p: any) => p.inlineData && p.inlineData.mimeType === 'image/png'), 'Base64 image correctly parsed into inlineData parts');
  assert(mmContents[0].parts.some((p: any) => p.text === 'Describe this image'), 'Text prompt retained alongside inlineData');

  // 3. Model filtering from raw Gemini models response
  const rawData = {
    models: [
      { name: 'models/gemini-1.5-flash', displayName: 'Gemini 1.5 Flash', supportedGenerationMethods: ['generateContent'], inputTokenLimit: 1048576 },
      { name: 'models/text-embedding-004', displayName: 'Embedding 004', supportedGenerationMethods: ['embedContent'], inputTokenLimit: 2048 },
      { name: 'models/aqa', displayName: 'Attributed Question Answering', supportedGenerationMethods: ['generateAnswer'] }
    ]
  };
  const normalized = (adapter as any).normalizeModels(rawData);
  assert(normalized.length === 1, 'Filtered out non-generateContent and embedding models');
  assert(normalized[0].id === 'gemini-1.5-flash', 'Model prefix models/ successfully stripped');
  assert(normalized[0].contextWindow === 1048576, 'Input token limit mapped to contextWindow');

  // 4. Fallback models
  const fallbackModels = await adapter.getModels('AIzaSyDummyKey');
  assert(fallbackModels.length > 0, 'Gemini returns fallback models when network is unavailable');
  assert(fallbackModels.some((m: any) => m.id === 'gemini-1.5-flash'), 'Fallback models contain gemini-1.5-flash');
}
