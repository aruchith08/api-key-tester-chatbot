import fs from 'fs';
import path from 'path';

let createServer;
const localVite = path.resolve(process.cwd(), 'node_modules/vite/dist/node/index.js');
if (fs.existsSync(localVite)) {
  const viteMod = await import('vite');
  createServer = viteMod.createServer;
} else {
  const fallback = 'file:///C:/Users/aruch/.arh_env/node_modules/vite/dist/node/index.js';
  const viteMod = await import(fallback);
  createServer = viteMod.createServer;
}

let passed = 0;
let failed = 0;
let skipped = 0;
const skippedList = [];

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

function recordSkip(name) {
  skipped++;
  skippedList.push(name);
}

async function main() {
  console.log('\n=============================================================');
  console.log('       ARH ARCHITECTURE & API INTEGRATION TEST SUITE         ');
  console.log('=============================================================');

  const server = await createServer();

  try {
    // 1. Detection suite
    const { runDetectionTests } = await server.ssrLoadModule('./tests/detection/detection.test.ts');
    await runDetectionTests(server, assert);

    // 2. Adapters suite
    const { runOpenAIAdapterTests } = await server.ssrLoadModule('./tests/adapters/openai.test.ts');
    await runOpenAIAdapterTests(server, assert);

    const { runGeminiAdapterTests } = await server.ssrLoadModule('./tests/adapters/gemini.test.ts');
    await runGeminiAdapterTests(server, assert);

    const { runAnthropicAdapterTests } = await server.ssrLoadModule('./tests/adapters/anthropic.test.ts');
    await runAnthropicAdapterTests(server, assert);

    const { runExperientialAdapterTests } = await server.ssrLoadModule('./tests/adapters/experiential.test.ts');
    await runExperientialAdapterTests(server, assert);

    // 3. Normalization suite
    const { runErrorNormalizationTests } = await server.ssrLoadModule('./tests/normalization/errors.test.ts');
    await runErrorNormalizationTests(server, assert);

    // 4. Streaming suite
    const { runStreamingTests } = await server.ssrLoadModule('./tests/streaming/sse-parser.test.ts');
    await runStreamingTests(server, assert);

    // 5. Transport & Truth Layer suite
    const { runTransportTests } = await server.ssrLoadModule('./tests/transport/transport.test.ts');
    await runTransportTests(server, assert);

    // 6. Sandbox & Code Detector suite
    const { runCodeDetectorTests } = await server.ssrLoadModule('./tests/sandbox/codeDetector.test.ts');
    await runCodeDetectorTests(server, assert);

    // 7. Autonomous Agent Tools suite
    const { runAgentToolsTests } = await server.ssrLoadModule('./tests/agent/agentTools.test.ts');
    await runAgentToolsTests(server, assert);

    // 8. Integration suite (conditional on env keys)
    const { runRealApiIntegrationTests } = await server.ssrLoadModule('./tests/integration/real-api.test.ts');
    await runRealApiIntegrationTests(server, assert, recordSkip);

  } catch (err) {
    console.error('Fatal error during test suite execution:', err);
    failed++;
  } finally {
    await server.close();
  }

  console.log('\n=============================================================');
  console.log('                     TEST SUMMARY REPORT                    ');
  console.log('=============================================================');
  console.log(`  Tests Passed:             ${passed}`);
  console.log(`  Tests Failed:             ${failed}`);
  console.log(`  Live Stages Skipped:      ${skipped} (Omitted environment variables)`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
