import { SSEParser } from '../../src/utils/sseParser';
import { resolveRequestPolicy, buildCompliantPayload } from '../../src/providers/requestPolicy';
import { getCachedModels, setCachedModels, createCredentialFingerprint, invalidateModelCache } from '../../src/providers/modelCache';
import { isPermittedUrl, isPrivateOrMetadataHost } from '../../api/proxy';
import { ProviderRegistry } from '../../src/providers/registry';
import { OpenAICompatibleAdapter } from '../../src/providers/adapters/OpenAICompatibleAdapter';
import { useAppStore } from '../../src/store/appStore';

export async function runKimiAndHardeningTests(server: any, assert: (cond: boolean, msg: string) => void) {
  console.log('\n--- SUITE: Kimi K3, SSE Parser, Credential Isolation & Security Hardening ---');

  // 1. Kimi K3 Model Resolution & Request Policy
  const nvDef = ProviderRegistry.getById('nvidia') || ProviderRegistry.getById('nvidia-nim');
  assert(!!nvDef, 'NVIDIA NIM provider definition exists');

  const policyKimiSlug = resolveRequestPolicy(nvDef!, null, 'kimi-k3');
  assert(policyKimiSlug.apiModelId === 'moonshotai/kimi-k3', 'Kimi slug resolves to moonshotai/kimi-k3 apiModelId');
  assert(policyKimiSlug.supportsTools === true, 'Kimi K3 policy enables tools support');
  assert(policyKimiSlug.supportsReasoning === true, 'Kimi K3 policy enables reasoning support');
  assert(policyKimiSlug.supportsTopP === false, 'Kimi K3 policy explicitly omits top_p');
  assert(policyKimiSlug.preserveReasoningContent === true, 'Kimi K3 policy preserves reasoning_content');
  assert(policyKimiSlug.temperature?.default === 0.6, 'Kimi K3 policy defaults to recommended temperature 0.6');

  // 2. Compliant Payload Construction
  const mockMessages = [
    { id: '1', role: 'user' as const, content: 'Solve this riddle', timestamp: Date.now() }
  ];
  const payloadKimi = buildCompliantPayload(policyKimiSlug, {
    apiKey: 'test-key',
    model: 'moonshotai/kimi-k3',
    messages: mockMessages,
    topP: 0.85,
    tools: [{ type: 'function', function: { name: 'calc', arguments: '{}' } }]
  }, mockMessages);

  assert(payloadKimi.model === 'moonshotai/kimi-k3', 'Compliant payload uses canonical apiModelId');
  assert(payloadKimi.top_p === undefined, 'Compliant payload strictly omits top_p for Kimi K3');
  assert(payloadKimi.temperature === 0.6, 'Compliant payload applies default temperature 0.6 when unspecified');
  assert(Array.isArray(payloadKimi.tools) && payloadKimi.tools.length === 1, 'Compliant payload includes tools when supported');
  assert(payloadKimi.tool_choice === 'auto', 'Compliant payload includes tool_choice auto');

  // 3. Multi-turn reasoning_content Preservation in Adapter
  const adapter = new OpenAICompatibleAdapter(nvDef!);
  const multiTurnMessages = [
    { id: '1', role: 'user' as const, content: 'Step 1 question', timestamp: 1 },
    {
      id: '2',
      role: 'assistant' as const,
      content: 'Step 1 answer',
      thinking: 'Detailed internal thoughts for step 1',
      timestamp: 2
    },
    { id: '3', role: 'user' as const, content: 'Step 2 question', timestamp: 3 }
  ];
  const formatted = (adapter as any).formatMessages(multiTurnMessages, undefined, 'moonshotai/kimi-k3');
  assert(formatted.length === 3, 'Formatted messages contains all 3 turns');
  assert(formatted[1].role === 'assistant', 'Turn 2 is assistant message');
  assert(formatted[1].content === 'Step 1 answer', 'Turn 2 preserves assistant content');
  assert(formatted[1].reasoning_content === 'Detailed internal thoughts for step 1', 'Turn 2 preserves reasoning_content in history');

  // 4. SSE Parser: Trailing event without trailing newline & fragmented chunks
  const sse = new SSEParser();
  const chunkPart1 = 'data: {"choices":[{"delta":{"content":"Hel';
  const chunkPart2 = 'lo "}}]}\n\n';
  const trailingChunkWithoutNewline = 'data: {"choices":[{"delta":{"content":"World"}}]}';

  const evs1 = sse.feed(chunkPart1);
  assert(evs1.length === 0, 'Fragmented chunk does not emit premature event');

  const evs2 = sse.feed(chunkPart2);
  assert(evs2.length === 1, 'Completed chunk emits event');
  assert(evs2[0].parsedData?.choices?.[0]?.delta?.content === 'Hello ', 'Emitted event content matches joined fragment');

  const evs3 = sse.feed(trailingChunkWithoutNewline);
  assert(evs3.length === 0, 'Trailing chunk without newline stays in buffer until flush');

  const flushedEvs = sse.flush();
  assert(flushedEvs.length === 1, 'Flush emits the trailing event');
  assert(flushedEvs[0].parsedData?.choices?.[0]?.delta?.content === 'World', 'Flushed event contains correct payload');

  // Done sentinel and comments
  const doneStream = sse.feed(': keepalive\n\ndata: [DONE]\n\n');
  assert(doneStream.length === 1, 'Captures [DONE] sentinel event');
  assert(doneStream[0].isDone === true, 'Parsed event flags isDone === true');

  // 5. Credential Isolation in Model Cache
  const keyAlpha = 'nvapi-alpha-secret-1111111111111111';
  const keyBeta = 'nvapi-beta-secret-2222222222222222';
  const fpAlpha = createCredentialFingerprint(keyAlpha);
  const fpBeta = createCredentialFingerprint(keyBeta);
  assert(fpAlpha !== fpBeta, 'Distinct API keys produce distinct credential fingerprints');
  assert(fpAlpha.startsWith('fp_'), 'Fingerprint starts with fp_ prefix');
  assert(!fpAlpha.includes('nvapi'), 'Fingerprint does not leak any part of raw API key');

  const modelsAlpha = [{ id: 'alpha-model', name: 'Alpha Model', provider: 'NVIDIA NIM' } as any];
  const modelsBeta = [{ id: 'beta-model', name: 'Beta Model', provider: 'NVIDIA NIM' } as any];

  setCachedModels('nvidia-nim', modelsAlpha, keyAlpha);
  setCachedModels('nvidia-nim', modelsBeta, keyBeta);

  const retrievedAlpha = getCachedModels('nvidia-nim', keyAlpha);
  const retrievedBeta = getCachedModels('nvidia-nim', keyBeta);
  assert(retrievedAlpha?.[0]?.id === 'alpha-model', 'Key Alpha retrieves only Alpha models');
  assert(retrievedBeta?.[0]?.id === 'beta-model', 'Key Beta retrieves only Beta models');
  assert(retrievedAlpha?.[0]?.id !== retrievedBeta?.[0]?.id, 'No cross-credential cache leakage');

  invalidateModelCache('nvidia-nim', keyAlpha);
  assert(getCachedModels('nvidia-nim', keyAlpha) === null, 'Invalidate key Alpha clears Alpha cache');
  assert(getCachedModels('nvidia-nim', keyBeta)?.[0]?.id === 'beta-model', 'Invalidating key Alpha preserves Beta cache');

  // 6. Proxy Allowlist & SSRF Protections
  assert(isPermittedUrl('https://api.openai.com/v1/chat/completions') === true, 'Permits official OpenAI host');
  assert(isPermittedUrl('https://integrate.api.nvidia.com/v1/models') === true, 'Permits official NVIDIA host');
  assert(isPermittedUrl('https://api.anthropic.com/v1/messages') === true, 'Permits official Anthropic host');
  assert(isPermittedUrl('https://beta.token-router.org/v1/models') === true, 'Permits official Token Router host');

  assert(isPermittedUrl('http://api.openai.com/v1') === false, 'Rejects insecure HTTP target');
  assert(isPermittedUrl('https://evil-attacker.com/leak') === false, 'Rejects arbitrary non-allowlisted host');
  assert(isPermittedUrl('https://localhost:8080/api') === false, 'Rejects localhost target');
  assert(isPermittedUrl('https://127.0.0.1:3000') === false, 'Rejects loopback IP target');
  assert(isPermittedUrl('https://169.254.169.254/latest/meta-data') === false, 'Rejects AWS/GCP cloud metadata IP');
  assert(isPermittedUrl('https://metadata.google.internal/computeMetadata') === false, 'Rejects GCP metadata hostname');
  assert(isPermittedUrl('https://10.0.0.5:443') === false, 'Rejects RFC 1918 10.x.x.x private IP');
  assert(isPermittedUrl('https://192.168.1.1:443') === false, 'Rejects RFC 1918 192.168.x.x private IP');
  assert(isPermittedUrl('https://172.16.0.1:443') === false, 'Rejects RFC 1918 172.16.x.x private IP');

  assert(isPermittedUrl('https://my-custom-proxy.internal.com/v1', 'my-custom-proxy.internal.com') === false, 'Rejects custom internal hostname');
  assert(isPermittedUrl('https://my-custom-llm.com/v1', 'my-custom-llm.com') === true, 'Permits verified custom public HTTPS host');

  // 7. Chat State & Regenerate Integrity (Zero user message duplication)
  useAppStore.setState({
    messages: [
      { id: 'u1', role: 'user', content: 'What is the capital of France?', timestamp: 100 },
      { id: 'a1', role: 'assistant', content: 'Paris is the capital of France.', timestamp: 101 }
    ]
  });

  const stateBefore = useAppStore.getState().messages;
  assert(stateBefore.length === 2, 'Initial state has 1 user message and 1 assistant message');

  const lastUserIndex = stateBefore.map(m => m.role).lastIndexOf('user');
  useAppStore.setState({
    messages: stateBefore.slice(0, lastUserIndex + 1)
  });
  const assistantId = useAppStore.getState().addAssistantPlaceholder();

  const stateAfter = useAppStore.getState().messages;
  assert(stateAfter.length === 2, 'Regenerated state maintains exactly 2 messages (1 user, 1 new assistant placeholder)');
  assert(stateAfter.filter(m => m.role === 'user').length === 1, 'Regenerate does NOT duplicate the user prompt');
  assert(stateAfter[0].id === 'u1', 'Original user message preserved');
  assert(stateAfter[1].id === assistantId, 'New assistant placeholder created');
}
