/**
 * ARH Phase 7: Live End-to-End Provider Verification Script
 *
 * Tests real upstream providers when developer keys are supplied via environment variables:
 * - ARH_TEST_GROQ_KEY
 * - ARH_TEST_GEMINI_KEY
 * - ARH_TEST_OPENROUTER_KEY
 * - ARH_TEST_NVIDIA_KEY
 * - ARH_TEST_ANTHROPIC_KEY
 *
 * Rules:
 * - Never prints or leaks keys.
 * - Missing keys -> SKIPPED (never simulated).
 * - Real calls executed -> PASS or FAIL based on actual upstream response.
 */

import { createServer } from 'file:///C:/Users/aruch/.arh_env/node_modules/vite/dist/node/index.js';

const TARGET_PROVIDERS = [
  { id: 'groq', name: 'Groq', envVar: 'ARH_TEST_GROQ_KEY', testModel: 'llama-3.3-70b-versatile' },
  { id: 'gemini', name: 'Google Gemini', envVar: 'ARH_TEST_GEMINI_KEY', testModel: 'gemini-1.5-flash' },
  { id: 'openrouter', name: 'OpenRouter', envVar: 'ARH_TEST_OPENROUTER_KEY', testModel: 'meta-llama/llama-3.3-70b-instruct' },
  { id: 'nvidia', name: 'NVIDIA NIM', envVar: 'ARH_TEST_NVIDIA_KEY', testModel: 'meta/llama-3.3-70b-instruct' },
  { id: 'anthropic', name: 'Anthropic Claude', envVar: 'ARH_TEST_ANTHROPIC_KEY', testModel: 'claude-3-5-haiku-20241022' }
];

async function main() {
  console.log('='.repeat(72));
  console.log('                 ARH LIVE PROVIDER API VERIFICATION');
  console.log('='.repeat(72));
  console.log('Environment variable check for live API credentials...\n');

  const server = await createServer();

  try {
    const { PROVIDER_CATALOG } = await server.ssrLoadModule('./src/providers/catalog.ts');
    const { ProviderRegistry } = await server.ssrLoadModule('./src/providers/registry.ts');

    const summaryResults = [];

    for (const target of TARGET_PROVIDERS) {
      const apiKey = process.env[target.envVar]?.trim();
      const providerDef = PROVIDER_CATALOG.find((p) => p.id === target.id);

      console.log(`\n--- Provider: ${target.name} [${target.envVar}] ---`);

      if (!apiKey) {
        console.log(`  ○ Status: SKIPPED (No ${target.envVar} set in environment)`);
        summaryResults.push({
          provider: target.name,
          auth: 'SKIPPED',
          models: 'SKIPPED',
          chat: 'SKIPPED',
          streaming: 'SKIPPED',
          stop: 'SKIPPED',
          overall: 'SKIPPED'
        });
        continue;
      }

      if (!providerDef) {
        console.error(`  ✗ Error: Provider definition for '${target.id}' not found in catalog.`);
        summaryResults.push({
          provider: target.name,
          auth: 'FAILED',
          models: 'FAILED',
          chat: 'FAILED',
          streaming: 'FAILED',
          stop: 'FAILED',
          overall: 'FAILED'
        });
        continue;
      }

      const adapter = ProviderRegistry.resolveAdapter(providerDef);
      const stageResults = {
        auth: 'FAILED',
        models: 'FAILED',
        chat: 'FAILED',
        streaming: 'FAILED'
      };

      // 1. Live Authentication & Validate
      console.log(`  Probing authentication for ${target.name}...`);
      const authStart = Date.now();
      try {
        const authRes = await adapter.validateConnection(apiKey);
        if (authRes.success) {
          const latency = authRes.latencyMs || (Date.now() - authStart);
          stageResults.auth = `PASS (${latency}ms)`;
          console.log(`  ✓ Authentication: PASS (${latency}ms)`);
        } else {
          stageResults.auth = `FAIL (${authRes.error?.code || 'AUTH_ERROR'})`;
          console.error(`  ✗ Authentication: FAIL - ${authRes.error?.message}`);
        }
      } catch (err) {
        stageResults.auth = `FAIL (${err.message})`;
        console.error(`  ✗ Authentication: FAIL - ${err.message}`);
      }

      // 2. Live Model Discovery
      console.log(`  Discovering models for ${target.name}...`);
      try {
        const models = await adapter.getModels(apiKey);
        if (models && models.length > 0) {
          stageResults.models = `PASS (${models.length} models)`;
          console.log(`  ✓ Model Discovery: PASS (${models.length} model(s) discovered)`);
        } else {
          stageResults.models = 'FAIL (0 models returned)';
          console.error(`  ✗ Model Discovery: FAIL (0 models returned)`);
        }
      } catch (err) {
        stageResults.models = `FAIL (${err.message})`;
        console.error(`  ✗ Model Discovery: FAIL - ${err.message}`);
      }

      // 3. Simple Live Chat Generation
      console.log(`  Executing test completion for ${target.name}...`);
      const chatStart = Date.now();
      try {
        const responseText = await adapter.chat({
          apiKey,
          model: target.testModel,
          messages: [{ id: '1', role: 'user', content: 'Reply with exactly: ARH connection successful' }]
        });
        if (responseText && responseText.trim().length > 0) {
          const chatDuration = Date.now() - chatStart;
          stageResults.chat = `PASS (${chatDuration}ms)`;
          console.log(`  ✓ Chat Completion: PASS (${chatDuration}ms) -> "${responseText.trim().slice(0, 60)}..."`);
        } else {
          stageResults.chat = 'FAIL (Empty response text)';
          console.error(`  ✗ Chat Completion: FAIL (Empty response text)`);
        }
      } catch (err) {
        stageResults.chat = `FAIL (${err.message})`;
        console.error(`  ✗ Chat Completion: FAIL - ${err.message}`);
      }

      // 4. Live Stream Generation
      console.log(`  Testing SSE stream token delivery for ${target.name}...`);
      const streamStart = Date.now();
      let firstTokenTime = null;
      let streamTokens = 0;
      let streamText = '';
      try {
        const stream = adapter.streamChat({
          apiKey,
          model: target.testModel,
          messages: [{ id: '1', role: 'user', content: 'Count from 1 to 5.' }]
        });

        for await (const event of stream) {
          if (event.type === 'token') {
            if (firstTokenTime === null) {
              firstTokenTime = Date.now();
            }
            streamTokens++;
            streamText += event.content;
          } else if (event.type === 'error') {
            throw new Error(event.error.message);
          }
        }

        const ttftMs = firstTokenTime ? firstTokenTime - streamStart : null;
        const streamDuration = Date.now() - streamStart;

        if (streamTokens > 1) {
          stageResults.streaming = `PASS (${streamTokens} chunks, TTFT: ${ttftMs}ms, total: ${streamDuration}ms)`;
          console.log(`  ✓ Stream Token Delivery: PASS (${streamTokens} chunks, TTFT: ${ttftMs}ms, total: ${streamDuration}ms)`);
        } else {
          stageResults.streaming = 'FAIL (Insufficient chunks for real stream)';
          console.error(`  ✗ Stream Token Delivery: FAIL (Received only ${streamTokens} chunk(s))`);
        }
      } catch (err) {
        stageResults.streaming = `FAIL (${err.message})`;
        console.error(`  ✗ Stream Token Delivery: FAIL - ${err.message}`);
      }

      // 5. Stop Generation Test
      console.log(`  Testing Stop Generation (AbortController interruption) for ${target.name}...`);
      let stopResult = 'NOT_TESTED';
      const stopController = new AbortController();
      let abortedTokens = 0;
      let partialText = '';
      let errorOccurred = false;

      try {
        const stream = adapter.streamChat({
          apiKey,
          model: target.testModel,
          messages: [{ id: '1', role: 'user', content: 'Write a 500-word essay explaining the physics of quantum mechanics in exhaustive detail.' }],
          signal: stopController.signal
        });

        for await (const event of stream) {
          if (event.type === 'token') {
            abortedTokens++;
            partialText += event.content;
            // Interrupt after receiving a few tokens
            if (abortedTokens >= 3) {
              stopController.abort();
              break;
            }
          } else if (event.type === 'error') {
            // Ignore abort error if aborted
            if (!stopController.signal.aborted) {
              errorOccurred = true;
            }
          }
        }

        if (stopController.signal.aborted && abortedTokens >= 3 && partialText.length > 0 && !errorOccurred) {
          stopResult = `PASS (${abortedTokens} tokens preserved)`;
          console.log(`  ✓ Stop Generation: PASS (Aborted cleanly after ${abortedTokens} tokens, partial content preserved)`);
        } else {
          stopResult = 'FAIL (Did not abort cleanly or preserve tokens)';
          console.error(`  ✗ Stop Generation: FAIL`);
        }
      } catch (err) {
        if (stopController.signal.aborted && abortedTokens > 0) {
          stopResult = `PASS (${abortedTokens} tokens preserved)`;
          console.log(`  ✓ Stop Generation: PASS (Caught abort cleanly, preserved ${abortedTokens} tokens)`);
        } else {
          stopResult = `FAIL (${err.message})`;
          console.error(`  ✗ Stop Generation: FAIL - ${err.message}`);
        }
      }
      stageResults.stop = stopResult;

      const allPassed = stageResults.auth.startsWith('PASS') &&
                        stageResults.models.startsWith('PASS') &&
                        stageResults.chat.startsWith('PASS') &&
                        stageResults.streaming.startsWith('PASS') &&
                        stageResults.stop.startsWith('PASS');

      const anyPassed = stageResults.auth.startsWith('PASS') ||
                        stageResults.models.startsWith('PASS') ||
                        stageResults.chat.startsWith('PASS');

      const overall = allPassed ? 'VERIFIED' : anyPassed ? 'PARTIALLY_VERIFIED' : 'FAILED';
      summaryResults.push({
        provider: target.name,
        auth: stageResults.auth,
        models: stageResults.models,
        chat: stageResults.chat,
        streaming: stageResults.streaming,
        stop: stageResults.stop,
        overall
      });
    }

    console.log('\n' + '='.repeat(72));
    console.log('                 LIVE VERIFICATION SUMMARY TABLE');
    console.log('='.repeat(72));
    console.table(summaryResults.map(r => ({
      'Provider': r.provider,
      'Auth Probe': r.auth,
      'Model Discovery': r.models,
      'Chat Gen': r.chat,
      'Streaming SSE': r.streaming,
      'Stop Gen': r.stop,
      'Overall Result': r.overall
    })));

    const verified = summaryResults.filter(r => r.overall === 'VERIFIED').length;
    const skipped = summaryResults.filter(r => r.overall === 'SKIPPED').length;
    const failed = summaryResults.filter(r => r.overall === 'FAILED').length;

    console.log('\nVerification Audit Summary:');
    console.log(`  • Providers Verified Live:    ${verified}`);
    console.log(`  • Providers Skipped (No Key): ${skipped}`);
    console.log(`  • Providers Failed:           ${failed}`);
    console.log('='.repeat(72) + '\n');

  } catch (err) {
    console.error('Fatal error during live verification:', err);
    process.exitCode = 1;
  } finally {
    await server.close();
  }
}

main();
