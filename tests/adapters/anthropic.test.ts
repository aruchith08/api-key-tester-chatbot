export async function runAnthropicAdapterTests(server: any, assert: (cond: boolean, msg: string) => void) {
  console.log('\n--- SUITE: Anthropic Claude Adapter ---');
  const { AnthropicAdapter } = await server.ssrLoadModule('./src/providers/adapters/AnthropicAdapter.ts');
  const { PROVIDER_CATALOG } = await server.ssrLoadModule('./src/providers/catalog.ts');

  const anthropicDef = PROVIDER_CATALOG.find((p: any) => p.id === 'anthropic')!;
  const adapter = new AnthropicAdapter(anthropicDef);

  // 1. Required Headers: x-api-key, anthropic-version, browser direct access
  const headers = (adapter as any).getHeaders('sk-ant-dummy-key');
  assert(headers['x-api-key'] === 'sk-ant-dummy-key', 'Sets x-api-key header');
  assert(headers['anthropic-version'] === '2023-06-01', 'Sets anthropic-version to 2023-06-01');
  assert(headers['anthropic-dangerous-direct-browser-access'] === 'true', 'Sets browser direct access header');

  // 2. Message formatting: roles must strictly be user / assistant
  const messages = [
    { id: '1', role: 'user', content: 'What is entropy?', timestamp: Date.now() },
    { id: '2', role: 'assistant', content: 'Entropy is...', timestamp: Date.now() }
  ];
  const formatted = (adapter as any).formatMessages(messages);
  assert(formatted.length === 2, 'Formatted 2 messages');
  assert(formatted[0].role === 'user' && formatted[0].content === 'What is entropy?', 'User role and content match');
  assert(formatted[1].role === 'assistant' && formatted[1].content === 'Entropy is...', 'Assistant role and content match');

  // 3. Fallback models
  const fallbackModels = await adapter.getModels('sk-ant-dummy-key');
  assert(fallbackModels.length >= 3, 'Anthropic returns fallback Claude models on restricted /models endpoint');
  assert(fallbackModels.some((m: any) => m.id === 'claude-3-5-sonnet-20241022'), 'Contains claude-3-5-sonnet-20241022');
  assert(fallbackModels.some((m: any) => m.id === 'claude-3-5-haiku-20241022'), 'Contains claude-3-5-haiku-20241022');
}
