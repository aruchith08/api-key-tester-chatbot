import { maskApiKey } from '../../src/utils/maskApiKey';

export async function runRealApiIntegrationTests(
  server: any,
  assert: (cond: boolean, msg: string) => void,
  recordSkip: (name: string) => void
) {
  console.log('\n--- SUITE: Real API Live Integration (Conditional on Environment Keys) ---');
  const { ProviderRegistry } = await server.ssrLoadModule('./src/providers/registry.ts');

  const targets = [
    { providerId: 'groq', envVar: 'ARH_TEST_GROQ_KEY', name: 'Groq' },
    { providerId: 'gemini', envVar: 'ARH_TEST_GEMINI_KEY', name: 'Google Gemini' },
    { providerId: 'nvidia', envVar: 'ARH_TEST_NVIDIA_KEY', name: 'NVIDIA NIM' },
    { providerId: 'openrouter', envVar: 'ARH_TEST_OPENROUTER_KEY', name: 'OpenRouter' },
    { providerId: 'anthropic', envVar: 'ARH_TEST_ANTHROPIC_KEY', name: 'Anthropic Claude' },
    { providerId: 'openai', envVar: 'ARH_TEST_OPENAI_KEY', name: 'OpenAI' }
  ];

  for (const target of targets) {
    const rawKey = process.env[target.envVar];
    if (!rawKey || !rawKey.trim()) {
      recordSkip(`${target.name} — Authentication`);
      recordSkip(`${target.name} — Model Discovery`);
      recordSkip(`${target.name} — Chat`);
      recordSkip(`${target.name} — Streaming`);
      console.log(`  ○ [SKIPPED] ${target.name} (${target.envVar} not provided in environment)`);
      continue;
    }

    const key = rawKey.trim();
    const masked = maskApiKey(key);
    console.log(`  ▶ Running live verification for ${target.name} with key [${masked}]...`);

    const provider = ProviderRegistry.getById(target.providerId);
    if (!provider) {
      assert(false, `[FAIL] Provider ${target.providerId} not found in catalog`);
      continue;
    }

    const adapter = ProviderRegistry.resolveAdapter(provider);
    let discoveredModels: any[] = [];

    // Stage 1: Authentication
    try {
      const connResult = await adapter.validateConnection(key);
      if (connResult.success) {
        assert(true, `[PASS] ${target.name} — Authentication`);
        discoveredModels = connResult.models || [];
      } else {
        assert(false, `[FAIL] ${target.name} — Authentication: ${connResult.error?.message || 'Connection rejected'}`);
      }
    } catch (err: any) {
      assert(false, `[FAIL] ${target.name} — Authentication error: ${err.message || String(err)}`);
    }

    // Stage 2: Model Discovery
    try {
      if (discoveredModels.length === 0) {
        discoveredModels = await adapter.getModels(key);
      }
      if (discoveredModels.length > 0) {
        assert(true, `[PASS] ${target.name} — Model Discovery (${discoveredModels.length} models resolved)`);
      } else {
        assert(false, `[FAIL] ${target.name} — Model Discovery: 0 models returned`);
      }
    } catch (err: any) {
      assert(false, `[FAIL] ${target.name} — Model Discovery error: ${err.message || String(err)}`);
    }

    // Determine target model for chat & streaming
    const testModelId = discoveredModels.find((m: any) => m.isDefault)?.id ||
      provider.defaultModelId ||
      discoveredModels[0]?.id ||
      'default';

    // Stage 3: Chat Generation
    try {
      const responseText = await adapter.chat({
        apiKey: key,
        model: testModelId,
        messages: [
          { id: 'live_test_1', role: 'user', content: 'Say hello in one sentence.', timestamp: Date.now() }
        ]
      });

      if (responseText && responseText.trim().length > 0) {
        assert(true, `[PASS] ${target.name} — Chat [Model: ${testModelId}]`);
      } else {
        assert(false, `[FAIL] ${target.name} — Chat: received empty response text`);
      }
    } catch (err: any) {
      assert(false, `[FAIL] ${target.name} — Chat error: ${err.message || String(err)}`);
    }

    // Stage 4: SSE Streaming
    try {
      let tokensCount = 0;
      let accumulated = '';

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Streaming test timed out after 15 seconds'));
        }, 15000);

        adapter.chatStream({
          apiKey: key,
          model: testModelId,
          messages: [
            { id: 'live_stream_1', role: 'user', content: 'Count from 1 to 3.', timestamp: Date.now() }
          ],
          onToken: (token: string) => {
            tokensCount++;
            accumulated += token;
          },
          onComplete: () => {
            clearTimeout(timeout);
            resolve();
          },
          onError: (err: any) => {
            clearTimeout(timeout);
            reject(err);
          }
        }).catch((err: any) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      if (tokensCount > 0 && accumulated.trim().length > 0) {
        assert(true, `[PASS] ${target.name} — Streaming (${tokensCount} token events received)`);
      } else {
        assert(false, `[FAIL] ${target.name} — Streaming: stream finished without tokens`);
      }
    } catch (err: any) {
      assert(false, `[FAIL] ${target.name} — Streaming error: ${err.message || String(err)}`);
    }
  }
}
