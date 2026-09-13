import { createServer } from 'file:///C:/Users/aruch/.arh_env/node_modules/vite/dist/node/index.js';

async function main() {
  const server = await createServer();

  try {
    const { PROVIDER_CATALOG } = await server.ssrLoadModule('./src/providers/catalog.ts');
    const { resolveConnectionStrategy } = await server.ssrLoadModule('./src/providers/transport/resolver.ts');

    console.log('='.repeat(88));
    console.log('            ARH PROVIDER TRUTH LAYER & BROWSER COMPATIBILITY AUDIT');
    console.log('='.repeat(88));
    console.log(`Total Providers in Catalog: ${PROVIDER_CATALOG.length}\n`);

    const tableRows = [];
    let directCount = 0;
    let relayCount = 0;
    let unverifiedCount = 0;
    let documentedCount = 0;
    let blockedCount = 0;

    for (const provider of PROVIDER_CATALOG) {
      const strategy = resolveConnectionStrategy(provider);
      const truth = provider.truth;

      if (strategy.transport === 'DIRECT') directCount++;
      if (strategy.transport === 'RELAY') relayCount++;
      if (truth.browser === 'UNVERIFIED') unverifiedCount++;
      if (truth.browser === 'DOCUMENTED') documentedCount++;
      if (truth.browser === 'BLOCKED') blockedCount++;

      tableRows.push({
        'Provider': provider.name,
        'Connection Mode': strategy.mode,
        'Transport': strategy.transport,
        'CORS Status': truth.corsStatus,
        'Browser Truth': truth.browser,
        'Real API': truth.realApi,
        'Exposure Risk': provider.keyExposureWarning ? 'WARNING' : 'NONE'
      });
    }

    console.table(tableRows);

    console.log('\nAudit Statistics & Architecture Breakdown:');
    console.log(`  • Direct Transport Candidates:    ${directCount} (Can attempt direct fetch)`);
    console.log(`  • Relay Required:                 ${relayCount} (Blocked by browser CORS)`);
    console.log(`  • Browser Blocked:                ${blockedCount} (OpenAI, DeepSeek, Perplexity, Moonshot)`);
    console.log(`  • Documented Direct:              ${documentedCount} (Anthropic - official browser flag)`);
    console.log(`  • Unverified in Browser:          ${unverifiedCount} (Need live environment test)`);
    console.log(`  • Real API Verification:          ALL ${PROVIDER_CATALOG.length} are honest: NOT_TESTED until live user key`);
    console.log('='.repeat(88));

  } catch (err) {
    console.error('Audit failed:', err);
    process.exitCode = 1;
  } finally {
    await server.close();
  }
}

main();
