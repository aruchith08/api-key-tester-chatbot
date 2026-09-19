import { SSEParser } from '../../src/utils/sseParser';
import { resolveRequestPolicy, resolveModelCapabilities, buildCompliantPayload } from '../../src/providers/requestPolicy';
import { getCachedModels, setCachedModels, createCredentialFingerprint, invalidateModelCache } from '../../src/providers/modelCache';
import { isPermittedUrl, isPrivateOrMetadataHost } from '../../api/proxy';
import { ProviderRegistry } from '../../src/providers/registry';
import { OpenAICompatibleAdapter } from '../../src/providers/adapters/OpenAICompatibleAdapter';
import { useAppStore } from '../../src/store/appStore';

export async function runKimiAndHardeningTests(server: any, assert: (cond: boolean, msg: string) => void) {
  console.log('\n--- SUITE: Kimi K3, SSE Parser, Credential Isolation & Security Hardening ---');

  // 1. Kimi K3 Model Resolution, Capabilities & Request Policy
  const nvDef = ProviderRegistry.getById('nvidia') || ProviderRegistry.getById('nvidia-nim');
  assert(!!nvDef, 'NVIDIA NIM provider definition exists');

  const policyKimiSlug = resolveRequestPolicy(nvDef!, null, 'kimi-k3');
  // (F) Model remains moonshotai/kimi-k3
  assert(policyKimiSlug.apiModelId === 'moonshotai/kimi-k3', 'Kimi slug resolves to canonical moonshotai/kimi-k3 apiModelId');
  assert(policyKimiSlug.supportsTools === true, 'Kimi K3 policy enables tools support');
  assert(policyKimiSlug.supportsReasoning === true, 'Kimi K3 policy enables reasoning support');
  // (B) Kimi K3 vision is true
  assert(policyKimiSlug.supportsVision === true, 'Kimi K3 policy authoritatively enables vision support');
  assert(policyKimiSlug.supportsTopP === false, 'Kimi K3 policy explicitly omits top_p');
  assert(policyKimiSlug.supportsStreamOptions === false, 'Kimi K3 policy omits stream_options for strict endpoint compatibility');
  assert(policyKimiSlug.preserveReasoningContent === true, 'Kimi K3 policy preserves reasoning_content');

  // Capabilities resolution verification
  const capsKimi = resolveModelCapabilities(nvDef!, null, 'kimi-k3');
  assert(capsKimi.supportsVision === true, 'Kimi K3 capabilities authoritatively report vision === true');
  assert(capsKimi.supportsReasoning === true, 'Kimi K3 capabilities report reasoning === true');
  assert(capsKimi.supportsTools === true, 'Kimi K3 capabilities report tools === true');

  // (C) Temperature clamped 0..1 with default 1.0
  assert(policyKimiSlug.temperature?.default === 1.0, 'Kimi K3 policy defaults to recommended temperature 1.0');
  assert(policyKimiSlug.temperature?.min === 0.0, 'Kimi K3 temperature min is 0.0');
  assert(policyKimiSlug.temperature?.max === 1.0, 'Kimi K3 temperature max is 1.0');

  // 2. Compliant Payload Construction & Temperature Clamping
  const mockMessages = [
    { id: '1', role: 'user' as const, content: 'Solve this riddle', timestamp: Date.now() }
  ];

  // (F) Model ID remains moonshotai/kimi-k3 in payload
  const pDefault = buildCompliantPayload(policyKimiSlug, {
    apiKey: 'test-key',
    model: 'moonshotai/kimi-k3',
    messages: mockMessages,
    topP: 0.85,
    tools: [{ type: 'function', function: { name: 'calc', arguments: '{}' } }]
  }, mockMessages);

  assert(pDefault.model === 'moonshotai/kimi-k3', 'Compliant payload uses canonical apiModelId moonshotai/kimi-k3');
  assert(pDefault.top_p === undefined, 'Compliant payload strictly omits top_p for Kimi K3');
  assert(pDefault.stream_options === undefined, 'Compliant payload strictly omits stream_options for Kimi K3');
  assert(pDefault.temperature === 1.0, 'Compliant payload applies default temperature 1.0 when unspecified');
  assert(Array.isArray(pDefault.tools) && pDefault.tools.length === 1, 'Compliant payload includes tools when supported');
  assert(pDefault.tool_choice === 'auto', 'Compliant payload includes tool_choice auto');

  // Temperature within range preserved
  const pConfigured = buildCompliantPayload(policyKimiSlug, {
    apiKey: 'test-key',
    model: 'moonshotai/kimi-k3',
    messages: mockMessages,
    temperature: 0.6
  }, mockMessages);
  assert(pConfigured.temperature === 0.6, 'Compliant payload preserves user configured temperature 0.6');

  // Temperature clamped to max 1.0
  const pHigh = buildCompliantPayload(policyKimiSlug, {
    apiKey: 'test-key',
    model: 'moonshotai/kimi-k3',
    messages: mockMessages,
    temperature: 1.8
  }, mockMessages);
  assert(pHigh.temperature === 1.0, 'Compliant payload clamps high temperature to max 1.0');

  // Temperature clamped to min 0.0
  const pLow = buildCompliantPayload(policyKimiSlug, {
    apiKey: 'test-key',
    model: 'moonshotai/kimi-k3',
    messages: mockMessages,
    temperature: -0.5
  }, mockMessages);
  assert(pLow.temperature === 0.0, 'Compliant payload clamps negative temperature to min 0.0');

  // 3. Multi-turn reasoning_content & tool_calls Preservation in Adapter
  const adapter = new OpenAICompatibleAdapter(nvDef!);
  // (G) reasoning_content and tool_calls preserved
  const multiTurnMessages = [
    { id: '1', role: 'user' as const, content: 'Step 1 question', timestamp: 1 },
    {
      id: '2',
      role: 'assistant' as const,
      content: 'Step 1 answer',
      thinking: 'Detailed internal thoughts for step 1',
      tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'calc', arguments: '{"expr":"2+2"}' } }],
      timestamp: 2
    },
    { id: '3', role: 'tool' as const, tool_call_id: 'call_1', content: '4', timestamp: 3 },
    { id: '4', role: 'user' as const, content: 'Step 2 question', timestamp: 4 }
  ];
  const formatted = (adapter as any).formatMessages(multiTurnMessages, undefined, 'moonshotai/kimi-k3');
  assert(formatted.length === 4, 'Formatted messages contains all 4 turns');
  assert(formatted[1].role === 'assistant', 'Turn 2 is assistant message');
  assert(formatted[1].content === 'Step 1 answer', 'Turn 2 preserves assistant content');
  assert(formatted[1].reasoning_content === 'Detailed internal thoughts for step 1', 'Turn 2 preserves reasoning_content in history');
  assert(Array.isArray(formatted[1].tool_calls) && formatted[1].tool_calls.length === 1, 'Turn 2 preserves tool_calls');
  assert(formatted[1].tool_calls[0].id === 'call_1', 'Turn 2 preserves tool_call id');
  assert(formatted[2].role === 'tool', 'Turn 3 is tool message');
  assert(formatted[2].tool_call_id === 'call_1', 'Turn 3 preserves tool_call_id');

  // (D) Image formatted correctly in request for Kimi K3 vision
  const visionUserMessage = [
    {
      id: 'v1',
      role: 'user' as const,
      content: 'Analyze this architecture diagram',
      attachments: [
        { type: 'image' as const, url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' }
      ],
      timestamp: 10
    }
  ];
  const formattedVision = (adapter as any).formatMessages(visionUserMessage, undefined, 'moonshotai/kimi-k3');
  assert(formattedVision.length === 1, 'Formatted vision message produces 1 user turn');
  assert(formattedVision[0].role === 'user', 'Vision turn role is user');
  assert(Array.isArray(formattedVision[0].content), 'Vision turn content is multipart array');
  assert(formattedVision[0].content[0].type === 'text', 'First part is text prompt');
  assert(formattedVision[0].content[0].text === 'Analyze this architecture diagram', 'Text prompt preserved');
  assert(formattedVision[0].content[1].type === 'image_url', 'Second part is image_url');
  assert(formattedVision[0].content[1].image_url?.url.startsWith('data:image/png;base64,'), 'Image URL preserved in image_url object');

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

  // 6. (A) Client header cannot bypass proxy & (E) Official NVIDIA host works through proxy & SSRF Protections
  // (E) Official NVIDIA host works through proxy
  assert(isPermittedUrl('https://integrate.api.nvidia.com/v1/chat/completions') === true, 'Official NVIDIA NIM endpoint permitted through proxy');
  assert(isPermittedUrl('https://integrate.api.nvidia.com/v1/models') === true, 'Permits official NVIDIA host');

  // Other official provider hosts
  assert(isPermittedUrl('https://api.openai.com/v1/chat/completions') === true, 'Permits official OpenAI host');
  assert(isPermittedUrl('https://api.anthropic.com/v1/messages') === true, 'Permits official Anthropic host');
  assert(isPermittedUrl('https://beta.token-router.org/v1/models') === true, 'Permits official Token Router host');

  // (A) Client header cannot bypass proxy - arbitrary external host rejected
  assert(isPermittedUrl('https://evil-attacker.com/leak') === false, 'Rejects arbitrary non-allowlisted host');
  assert(isPermittedUrl('https://evil-attacker.com/leak', new Set(['other-allowed-host.com'])) === false, 'Client cannot bypass proxy with unconfigured host');

  // Server-side trusted custom host configuration
  assert(isPermittedUrl('https://custom-host.corp.net/v1', new Set(['custom-host.corp.net'])) === true, 'Permits server-configured trusted custom host');

  // SSRF Rejection tests
  assert(isPermittedUrl('http://integrate.api.nvidia.com/v1') === false, 'Rejects insecure HTTP target even if domain is official');
  assert(isPermittedUrl('https://localhost:8080/api') === false, 'Rejects localhost target');
  assert(isPermittedUrl('https://foo.localhost:8080/api') === false, 'Rejects *.localhost target');
  assert(isPermittedUrl('https://127.0.0.1:3000') === false, 'Rejects loopback IP target');
  assert(isPermittedUrl('https://127.255.255.254:3000') === false, 'Rejects 127.0.0.0/8 loopback range');
  assert(isPermittedUrl('https://0.0.0.0:80') === false, 'Rejects 0.0.0.0 target');
  assert(isPermittedUrl('https://169.254.169.254/latest/meta-data') === false, 'Rejects AWS/GCP cloud metadata IP');
  assert(isPermittedUrl('https://100.100.100.200/latest') === false, 'Rejects Alibaba cloud metadata IP 100.100.100.200');
  assert(isPermittedUrl('https://metadata.google.internal/computeMetadata') === false, 'Rejects GCP metadata hostname');
  assert(isPermittedUrl('https://10.0.0.5:443') === false, 'Rejects RFC 1918 10.x.x.x private IP');
  assert(isPermittedUrl('https://192.168.1.1:443') === false, 'Rejects RFC 1918 192.168.x.x private IP');
  assert(isPermittedUrl('https://172.16.0.1:443') === false, 'Rejects RFC 1918 172.16.x.x private IP');
  assert(isPermittedUrl('https://internal.corp/v1') === false, 'Rejects .corp private TLD');
  assert(isPermittedUrl('https://service.local/v1') === false, 'Rejects .local mDNS TLD');
  assert(isPermittedUrl('https://router.lan/v1') === false, 'Rejects .lan private TLD');

  // SSRF checks cannot be bypassed even if in server trusted set
  assert(isPermittedUrl('https://169.254.169.254/latest', new Set(['169.254.169.254'])) === false, 'Rejects metadata IP even if configured in server trusted list');
  assert(isPermittedUrl('https://localhost:3000', new Set(['localhost'])) === false, 'Rejects localhost even if configured in server trusted list');

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
