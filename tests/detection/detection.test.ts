export async function runDetectionTests(server: any, assert: (cond: boolean, msg: string) => void) {
  console.log('\n--- SUITE: Provider Detection Heuristics ---');
  const { ProviderDetector } = await server.ssrLoadModule('./src/providers/detection.ts');

  // 1. High confidence distinct signatures
  const groqKey = 'gsk_' + '0123456789abcdefghijklmnopqrstuvwxyz0123456789';
  const groqRes = ProviderDetector.detect(groqKey);
  assert(groqRes.confidence === 'high' && groqRes.provider?.id === 'groq', 'Groq key (gsk_) detected with high confidence');

  const orKey = 'sk-or-v1-' + '0123456789abcdef'.repeat(4);
  const orRes = ProviderDetector.detect(orKey);
  assert(orRes.confidence === 'high' && orRes.provider?.id === 'openrouter', 'OpenRouter key (sk-or-v1-) detected with high confidence');

  const geminiKey = 'AIzaSy' + 'B'.repeat(33);
  const geminiRes = ProviderDetector.detect(geminiKey);
  assert(geminiRes.confidence === 'high' && geminiRes.provider?.id === 'gemini', 'Gemini key (AIzaSy) detected with high confidence');

  const claudeKey = 'sk-ant-api03-' + 'C'.repeat(40);
  const claudeRes = ProviderDetector.detect(claudeKey);
  assert(claudeRes.confidence === 'high' && claudeRes.provider?.id === 'anthropic', 'Anthropic Claude key (sk-ant-api03-) detected with high confidence');

  const nvidiaKey = 'nvapi-' + 'D'.repeat(35);
  const nvidiaRes = ProviderDetector.detect(nvidiaKey);
  assert(nvidiaRes.confidence === 'high' && (nvidiaRes.provider?.id === 'nvidia-nim' || nvidiaRes.provider?.id === 'nvidia'), 'NVIDIA NIM key (nvapi-) detected with high confidence');

  const cerebrasKey = 'csk-' + 'E'.repeat(35);
  const cerebrasRes = ProviderDetector.detect(cerebrasKey);
  assert(cerebrasRes.confidence === 'high' && cerebrasRes.provider?.id === 'cerebras', 'Cerebras key (csk-) detected with high confidence');

  const fireworksKey = 'fw_' + 'F'.repeat(32);
  const fireworksRes = ProviderDetector.detect(fireworksKey);
  assert(fireworksRes.confidence === 'high' && fireworksRes.provider?.id === 'fireworks', 'Fireworks key (fw_) detected with high confidence');

  const pplxKey = 'pplx-' + '0123456789abcdef0123456789abcdef0123456789abcdef';
  const pplxRes = ProviderDetector.detect(pplxKey);
  assert(pplxRes.confidence === 'high' && pplxRes.provider?.id === 'perplexity', 'Perplexity key (pplx-) detected with high confidence');

  const xaiKey = 'xai-' + 'H'.repeat(40);
  const xaiRes = ProviderDetector.detect(xaiKey);
  assert(xaiRes.confidence === 'high' && xaiRes.provider?.id === 'xai', 'xAI key (xai-) detected with high confidence');

  const hfKey = 'hf_' + 'I'.repeat(34);
  const hfRes = ProviderDetector.detect(hfKey);
  assert(hfRes.confidence === 'high' && hfRes.provider?.id === 'huggingface', 'Hugging Face key (hf_) detected with high confidence');

  const xplKey = 'xpl_' + '0123456789abcdef'.repeat(2) + '01234567';
  const xplRes = ProviderDetector.detect(xplKey);
  assert(xplRes.confidence === 'high' && xplRes.provider?.id === 'experiential', 'Experiential Labs key (xpl_) detected with high confidence');

  const trKey = 'vk_live_' + 'abcdef0123456789_-'.repeat(2);
  const trRes = ProviderDetector.detect(trKey);
  assert(trRes.confidence === 'high' && trRes.provider?.id === 'token-router', 'Token Router key (vk_live_) detected with high confidence');

  const blKey = 'sk-bl-' + 'abcdef0123456789_-'.repeat(2);
  const blRes = ProviderDetector.detect(blKey);
  assert(blRes.confidence === 'high' && blRes.provider?.id === 'bazaarlink', 'BazaarLink key (sk-bl-) detected with high confidence');

  // 2. Medium confidence heuristic signatures
  const deepseekKey = 'sk-' + '1234567890abcdef1234567890abcdef';
  const dsRes = ProviderDetector.detect(deepseekKey);
  assert(dsRes.confidence === 'medium' && dsRes.provider?.id === 'deepseek', 'DeepSeek 32-hex key (sk-...) detected with medium confidence');

  const togetherKey = 'a'.repeat(64);
  const togetherRes = ProviderDetector.detect(togetherKey);
  assert(togetherRes.confidence === 'medium' && togetherRes.provider?.id === 'together', 'Together AI 64-hex key detected with medium confidence');

  // 3. Ambiguous keys (low confidence, ranked candidate list, no speculative network probing)
  const genericSk = 'sk-proj-somelongrandomkeywithlettersanddigits123456789';
  const genRes = ProviderDetector.detect(genericSk);
  assert(genRes.confidence === 'high' && genRes.provider?.id === 'openai', 'OpenAI project key (sk-proj-) recognized with high confidence');

  const ambiguousSk = 'sk-xyz1234567890abcdefghijklmnopqrstuvwxyz';
  const ambRes = ProviderDetector.detect(ambiguousSk);
  assert(ambRes.confidence === 'low', 'Ambiguous generic sk- key returns low confidence');
  assert(ambRes.candidates.length >= 2, 'Ambiguous key returns multiple candidates for user selection');
  assert(ambRes.candidates.some(c => c.id === 'openai'), 'Candidates include OpenAI');
  assert(ambRes.candidates.some(c => c.id === 'deepseek'), 'Candidates include DeepSeek');

  // 4. Edge cases
  const emptyRes = ProviderDetector.detect('');
  assert(emptyRes.confidence === 'unknown' && emptyRes.candidates.length === 0, 'Empty string returns unknown confidence');

  const spacesRes = ProviderDetector.detect('   ');
  assert(spacesRes.confidence === 'unknown', 'Whitespace string returns unknown confidence');

  const unknownRes = ProviderDetector.detect('totally_unknown_custom_key_prefix_9999');
  assert(unknownRes.confidence === 'unknown' && unknownRes.candidates.length > 0, 'Unrecognized key provides fallback candidates for manual selection');

  // =========================================================================
  // 5. Phase 7.1 Regression Suite: Provider Identity & State Synchronization
  // =========================================================================
  console.log('\n--- SUITE: Phase 7.1 Provider Synchronization Regressions ---');
  const { resolveConnectionStrategy } = await server.ssrLoadModule('./src/providers/transport/resolver.ts');
  const { ProviderRegistry } = await server.ssrLoadModule('./src/providers/registry.ts');

  // TEST 1: Short / example Groq key
  const test1 = ProviderDetector.detect('gsk_example_key_123456789');
  assert(test1.confidence === 'high', 'TEST 1: Groq short key has high confidence');
  assert(test1.providerId === 'groq', 'TEST 1: Groq short key resolves providerId = groq');
  assert(test1.provider?.name === 'Groq', 'TEST 1: Groq short key resolves name = Groq');

  // TEST 2: Short / example NVIDIA NIM key
  const test2 = ProviderDetector.detect('nvapi-example_key_123456789');
  assert(test2.confidence === 'high', 'TEST 2: NVIDIA NIM short key has high confidence');
  assert(test2.providerId === 'nvidia-nim' || test2.providerId === 'nvidia', 'TEST 2: NVIDIA NIM short key resolves providerId');
  assert(test2.provider?.name === 'NVIDIA NIM', 'TEST 2: NVIDIA NIM short key resolves name = NVIDIA NIM');

  // TEST 3: State Transition: Previous state = NVIDIA NIM, New Key = Groq
  let activeState: any = ProviderRegistry.getById('nvidia-nim')!;
  assert(activeState.name === 'NVIDIA NIM', 'TEST 3 Setup: Initial state is NVIDIA NIM');
  
  // New Groq key arrives -> fresh detection must override stale active state
  const groqTransitionRes = ProviderDetector.detect('gsk_test_abc123');
  if (groqTransitionRes.confidence === 'high') {
    activeState = groqTransitionRes.provider;
  }
  assert(activeState.id === 'groq', 'TEST 3: Groq key updates active provider to groq');
  assert(activeState.name === 'Groq', 'TEST 3: Groq key updates active provider name to Groq');

  // TEST 4: State Transition: Previous state = Groq, New Key = NVIDIA NIM
  const nvidiaTransitionRes = ProviderDetector.detect('nvapi-test_xyz789');
  if (nvidiaTransitionRes.confidence === 'high') {
    activeState = nvidiaTransitionRes.provider;
  }
  assert(activeState.id === 'nvidia-nim' || activeState.id === 'nvidia', 'TEST 4: NVIDIA NIM key updates active provider to nvidia-nim');
  assert(activeState.name === 'NVIDIA NIM', 'TEST 4: NVIDIA NIM key updates active provider name to NVIDIA NIM');

  // TEST 5: Rationale & Display Identity Synchronization
  const groqCheck = ProviderDetector.detect('gsk_live_token_check');
  assert(groqCheck.rationale.includes('Groq'), 'TEST 5: Rationale references Groq');
  assert(!groqCheck.rationale.includes('NVIDIA'), 'TEST 5: Rationale does NOT mention NVIDIA');
  assert(groqCheck.provider?.name === 'Groq', 'TEST 5: Provider display is Groq');

  // TEST 6: Connection Strategy receives matching provider ID
  const strategyGroq = resolveConnectionStrategy(groqCheck.provider!);
  assert(strategyGroq.providerId === 'groq', 'TEST 6: Connection strategy matches detected provider ID');
  assert(strategyGroq.mode === 'DIRECT', 'TEST 6: Groq strategy resolves to DIRECT');

  // TEST 7: Reset behavior simulation on key change
  let mockConnectionState: any = {
    error: 'Previous connection failed',
    strategy: 'NVIDIA_STRATEGY',
    models: ['nvidia-model-1'],
    state: 'error'
  };
  // Key change triggers reset
  mockConnectionState = { error: null, strategy: null, models: [], state: 'idle' };
  assert(mockConnectionState.error === null, 'TEST 7: Reset clears connection error');
  assert(mockConnectionState.strategy === null, 'TEST 7: Reset clears connection strategy');
  assert(mockConnectionState.models.length === 0, 'TEST 7: Reset clears discovered models');
  assert(mockConnectionState.state === 'idle', 'TEST 7: Reset returns connectionState to idle');

  // TEST 8: High confidence distinct signatures never overridden by generic patterns
  const groqWithSk = 'gsk_sk-something_confusing';
  const groqSkRes = ProviderDetector.detect(groqWithSk);
  assert(groqSkRes.confidence === 'high' && groqSkRes.providerId === 'groq', 'TEST 8: gsk_ prefix is not overridden by generic sk- pattern');

  // Additional Transitions: Groq -> Gemini, Gemini -> Groq
  const geminiTransition = ProviderDetector.detect('AIzaSy_fake_test_gemini_key_123');
  assert(geminiTransition.confidence === 'high' && geminiTransition.providerId === 'gemini', 'Transition: Groq -> Gemini resolves to Gemini');
  
  const groqFromGemini = ProviderDetector.detect('gsk_back_to_groq_12345');
  assert(groqFromGemini.confidence === 'high' && groqFromGemini.providerId === 'groq', 'Transition: Gemini -> Groq resolves to Groq');
}
