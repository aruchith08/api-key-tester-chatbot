import { DirectTransport } from '../../src/providers/transport/DirectTransport';
import { RelayTransport } from '../../src/providers/transport/RelayTransport';
import { resolveConnectionStrategy } from '../../src/providers/transport/resolver';
import { PROVIDER_CATALOG } from '../../src/providers/catalog';

export async function runTransportTests(server: any, assert: (cond: boolean, msg: string) => void) {
  console.log('\n--- Transport & Connection Strategy Tests ---');

  // 1. DirectTransport
  const direct = new DirectTransport();
  assert(direct.name.includes('Direct'), 'DirectTransport identifies correctly');
  assert(direct.isAvailable === true, 'DirectTransport is marked available');

  // 2. RelayTransport
  const relay = new RelayTransport();
  assert(relay.name.includes('Relay'), 'RelayTransport identifies correctly');
  assert(relay.isAvailable === false, 'RelayTransport is honest about unavailable proxy');

  let relayThrewExpected = false;
  try {
    await relay.request({ url: 'https://example.com', method: 'GET' });
  } catch (err: any) {
    if (err.code === 'RELAY_NOT_CONFIGURED') {
      relayThrewExpected = true;
    }
  }
  assert(relayThrewExpected, 'RelayTransport throws RELAY_NOT_CONFIGURED on request');

  // 3. Strategy Resolver
  const groq = PROVIDER_CATALOG.find(p => p.id === 'groq');
  assert(!!groq, 'Found Groq in catalog');
  if (groq) {
    const groqStrat = resolveConnectionStrategy(groq);
    assert(groqStrat.mode === 'DIRECT', 'Groq resolves to DIRECT mode');
    assert(groqStrat.transport === 'DIRECT', 'Groq uses DIRECT transport');
    assert(groqStrat.badge.text.includes('Direct Connection'), 'Groq displays Direct Connection badge');
  }

  const gemini = PROVIDER_CATALOG.find(p => p.id === 'gemini');
  assert(!!gemini, 'Found Gemini in catalog');
  if (gemini) {
    const geminiStrat = resolveConnectionStrategy(gemini);
    assert(geminiStrat.mode === 'DIRECT_WITH_WARNING', 'Gemini resolves to DIRECT_WITH_WARNING mode');
    assert(geminiStrat.badge.text.includes('Direct (Caveats)'), 'Gemini displays Direct (Caveats) badge');
    assert(!!geminiStrat.privacyNotice, 'Gemini provides API key in URL exposure notice');
  }

  const openai = PROVIDER_CATALOG.find(p => p.id === 'openai');
  assert(!!openai, 'Found OpenAI in catalog');
  if (openai) {
    const openaiStrat = resolveConnectionStrategy(openai);
    assert(openaiStrat.mode === 'RELAY_REQUIRED', 'OpenAI resolves to RELAY_REQUIRED mode');
    assert(openaiStrat.transport === 'RELAY', 'OpenAI recommends RELAY transport');
    assert(openaiStrat.badge.text.includes('Relay Required'), 'OpenAI displays Relay Required badge');
  }

  const deepseek = PROVIDER_CATALOG.find(p => p.id === 'deepseek');
  assert(!!deepseek, 'Found DeepSeek in catalog');
  if (deepseek) {
    const deepseekStrat = resolveConnectionStrategy(deepseek);
    assert(deepseekStrat.mode === 'RELAY_REQUIRED', 'DeepSeek resolves to RELAY_REQUIRED mode');
  }

  const nvidia = PROVIDER_CATALOG.find(p => p.id === 'nvidia' || p.id === 'nvidia-nim');
  assert(!!nvidia, 'Found NVIDIA in catalog');
  if (nvidia) {
    const nvidiaStrat = resolveConnectionStrategy(nvidia);
    assert(nvidiaStrat.mode === 'UNKNOWN', 'NVIDIA resolves to UNKNOWN connection mode');
    assert(nvidiaStrat.badge.text.includes('Connection Unknown'), 'NVIDIA displays Connection Unknown badge');
  }

  const bazaarlink = PROVIDER_CATALOG.find(p => p.id === 'bazaarlink');
  assert(!!bazaarlink, 'Found BazaarLink in catalog');
  if (bazaarlink) {
    const blStrat = resolveConnectionStrategy(bazaarlink);
    assert(blStrat.mode === 'DIRECT', 'BazaarLink resolves to DIRECT mode');
    assert(blStrat.transport === 'DIRECT', 'BazaarLink uses DIRECT transport');
    assert(blStrat.badge.text.includes('Direct Connection'), 'BazaarLink displays Direct Connection badge');
  }

  // 4. Provider Truth Model Integrity
  console.log('\n--- Provider Truth Model Integrity ---');
  assert(PROVIDER_CATALOG.length === 21, `Catalog contains all 21 providers (found ${PROVIDER_CATALOG.length})`);

  let allHaveTruth = true;
  let noFalselyClaimed = true;
  let allNotTested = true;

  for (const p of PROVIDER_CATALOG) {
    if (!p.truth) {
      allHaveTruth = false;
      console.error(`Missing truth on ${p.id}`);
    } else {
      if ((p.truth.browser as any) === 'CONFIRMED' || (p.truth.browser as any) === 'BROWSER_VERIFIED') {
        noFalselyClaimed = false;
        console.error(`Unjustified claim on ${p.id}: ${p.truth.browser}`);
      }
      if (p.truth.realApi !== 'NOT_TESTED') {
        allNotTested = false;
      }
    }
  }

  assert(allHaveTruth, 'All 21 providers have strongly-typed truth model metadata');
  assert(noFalselyClaimed, 'Zero providers falsely claim CONFIRMED or BROWSER_VERIFIED without live test');
  assert(allNotTested, 'All providers start honestly at realApi: NOT_TESTED');
}
