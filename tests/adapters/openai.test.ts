export async function runOpenAIAdapterTests(server: any, assert: (cond: boolean, msg: string) => void) {
  console.log('\n--- SUITE: OpenAI-Compatible Adapter ---');
  const { OpenAICompatibleAdapter } = await server.ssrLoadModule('./src/providers/adapters/OpenAICompatibleAdapter.ts');
  const { PROVIDER_CATALOG } = await server.ssrLoadModule('./src/providers/catalog.ts');

  const groqDef = PROVIDER_CATALOG.find((p: any) => p.id === 'groq')!;
  const adapter = new OpenAICompatibleAdapter(groqDef);

  // 1. URL building & trailing slash safety
  assert((adapter as any).buildUrl('/chat/completions') === 'https://api.groq.com/openai/v1/chat/completions', 'buildUrl correctly joins endpoint with leading slash');
  assert((adapter as any).buildUrl('chat/completions') === 'https://api.groq.com/openai/v1/chat/completions', 'buildUrl handles endpoint without leading slash');

  const trailingSlashDef = { ...groqDef, baseUrl: 'https://api.groq.com/openai/v1/' };
  const trailingAdapter = new OpenAICompatibleAdapter(trailingSlashDef);
  assert((trailingAdapter as any).buildUrl('/models') === 'https://api.groq.com/openai/v1/models', 'buildUrl strips trailing slash from baseUrl');

  // 2. Headers formatting
  const headers = (adapter as any).getHeaders('gsk_test123');
  assert(headers['Content-Type'] === 'application/json', 'Headers contain Content-Type application/json');
  assert(headers['Authorization'] === 'Bearer gsk_test123', 'Headers format Authorization as Bearer <key>');

  // 3. Message formatting with system prompt
  const messages = [
    { id: '1', role: 'user', content: 'Hello', timestamp: Date.now() },
    { id: '2', role: 'assistant', content: 'Hi there', timestamp: Date.now() }
  ];
  const formatted = (adapter as any).formatMessages(messages, 'You are an AI assistant.');
  assert(formatted.length === 3, 'Formatted messages include system prompt as first message');
  assert(formatted[0].role === 'system' && formatted[0].content === 'You are an AI assistant.', 'System prompt properly placed in first position');
  assert(formatted[1].role === 'user' && formatted[1].content === 'Hello', 'User message properly mapped');
  assert(formatted[2].role === 'assistant' && formatted[2].content === 'Hi there', 'Assistant message properly mapped');

  // 4. Model normalization and filtering
  const rawModelList = {
    data: [
      { id: 'llama-3.3-70b-versatile', context_length: 128000 },
      { id: 'whisper-large-v3', context_length: 1500 },
      { id: 'text-embedding-3-small', context_length: 8191 }
    ]
  };
  const normalized = (adapter as any).normalizeModels(rawModelList);
  assert(normalized.some((m: any) => m.id === 'llama-3.3-70b-versatile'), 'Chat model preserved in normalized list');
  assert(!normalized.some((m: any) => m.id.includes('embedding')), 'Non-chat embedding model filtered out');
  assert(!normalized.some((m: any) => m.id.includes('whisper')), 'Audio whisper model filtered out');

  // 5. Fallback models
  const perplexityDef = PROVIDER_CATALOG.find((p: any) => p.id === 'perplexity')!;
  const pplxAdapter = new OpenAICompatibleAdapter(perplexityDef);
  const fallbackModels = await pplxAdapter.getModels('pplx-dummy-key');
  assert(fallbackModels.length > 0, 'Perplexity cleanly returns fallback models when modelsEndpoint is empty');
  assert(fallbackModels[0].provider === 'Perplexity', 'Fallback models carry proper provider attribute');
}
