export async function runDualChatTests(server: any, assert: (condition: boolean, msg: string) => void) {
  console.log('\n--- SUITE: DualChat Workspace & State Isolation ---');

  const { useAppStore } = await server.ssrLoadModule('./src/store/appStore.ts');
  useAppStore.getState().clearChat();
  useAppStore.getState().clearDualChat();
  const store = useAppStore.getState();

  // 1. Initial State Verification
  assert(store.dualProviderA === null, 'Initial dualProviderA is strictly null ("Choose provider")');
  assert(store.dualModelA === null, 'Initial dualModelA is strictly null ("Select a model")');
  assert(store.dualProviderB === null, 'Initial dualProviderB is strictly null ("Choose provider")');
  assert(store.dualModelB === null, 'Initial dualModelB is strictly null ("Select a model")');
  assert(store.dualNameA === 'AI 1', 'Initial dualNameA defaults to "AI 1"');
  assert(store.dualNameB === 'AI 2', 'Initial dualNameB defaults to "AI 2"');
  assert(store.autoChatState === 'idle', 'Initial autoChatState is "idle"');
  assert(store.autoChatTurnLimit === 10, 'Initial autoChatTurnLimit is 10');
  assert(store.autoChatCurrentTurn === 0, 'Initial autoChatCurrentTurn is 0');
  assert(store.activeChatTab === 'chat', 'Initial activeChatTab is "chat"');

  // 2. State Isolation from Single Chat
  const mockModels: any[] = [
    { id: 'single-chat-model-1', name: 'Single Model 1', supportsChat: true, isDefault: true },
    { id: 'single-chat-model-2', name: 'Single Model 2', supportsChat: true }
  ];

  // Calling setModels for single chat must NOT populate dualModelA or dualModelB
  useAppStore.getState().setModels(mockModels);
  assert(useAppStore.getState().dualModelA === null, 'setModels does NOT auto-populate dualModelA');
  assert(useAppStore.getState().dualModelB === null, 'setModels does NOT auto-populate dualModelB');
  assert(useAppStore.getState().dualProviderA === null, 'setModels does NOT auto-populate dualProviderA');
  assert(useAppStore.getState().dualProviderB === null, 'setModels does NOT auto-populate dualProviderB');

  // Calling setSelectedModel for single chat must NOT affect dualModelA
  useAppStore.getState().setSelectedModel(mockModels[1]);
  assert(useAppStore.getState().dualModelA === null, 'setSelectedModel does NOT mutate dualModelA');

  // Single chat messages vs Dual chat messages isolation
  useAppStore.getState().addUserMessage('Hello from Single Chat');
  assert(useAppStore.getState().messages.length === 1, 'Single chat has 1 message');
  assert(useAppStore.getState().dualMessages.length === 0, 'Dual chat transcript remains completely empty');

  // 3. Tab Switching Preserves State Non-Destructively
  useAppStore.getState().setActiveChatTab('dual');
  assert(useAppStore.getState().activeChatTab === 'dual', 'Active tab switched to "dual"');
  assert(useAppStore.getState().messages.length === 1, 'Switching to dual preserves single chat messages');

  useAppStore.getState().setActiveChatTab('chat');
  assert(useAppStore.getState().activeChatTab === 'chat', 'Active tab switched back to "chat"');
  assert(useAppStore.getState().messages.length === 1, 'Switching back to chat preserves single chat messages');

  // 4. Dual Slot Configuration & Independent Customizations
  const mockProviderA: any = { id: 'groq', name: 'Groq', defaultModelId: 'llama-3.3-70b-versatile' };
  const mockModelA: any = { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' };
  const mockProviderB: any = { id: 'anthropic', name: 'Anthropic', defaultModelId: 'claude-3-7-sonnet-20250219' };
  const mockModelB: any = { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet' };

  useAppStore.getState().setDualModelA(mockModelA, mockProviderA);
  useAppStore.getState().setDualModelB(mockModelB, mockProviderB);
  useAppStore.getState().setDualNameA('DeepSeek Expert');
  useAppStore.getState().setDualNameB('Claude Critic');
  useAppStore.getState().setDualSystemPromptA('Focus on algorithms');
  useAppStore.getState().setDualSystemPromptB('Focus on security');
  useAppStore.getState().setDualTemperatureA(0.2);
  useAppStore.getState().setDualTemperatureB(0.9);

  const stateAfterConfig = useAppStore.getState();
  assert(stateAfterConfig.dualProviderA?.id === 'groq', 'dualProviderA configured to Groq');
  assert(stateAfterConfig.dualModelA?.id === 'llama-3.3-70b-versatile', 'dualModelA configured');
  assert(stateAfterConfig.dualProviderB?.id === 'anthropic', 'dualProviderB configured to Anthropic');
  assert(stateAfterConfig.dualModelB?.id === 'claude-3.7-sonnet-20250219' || stateAfterConfig.dualModelB?.id === 'claude-3-7-sonnet-20250219', 'dualModelB configured');
  assert(stateAfterConfig.dualNameA === 'DeepSeek Expert', 'dualNameA preserved');
  assert(stateAfterConfig.dualNameB === 'Claude Critic', 'dualNameB preserved');
  assert(stateAfterConfig.dualSystemPromptA === 'Focus on algorithms', 'dualSystemPromptA preserved');
  assert(stateAfterConfig.dualSystemPromptB === 'Focus on security', 'dualSystemPromptB preserved');
  assert(stateAfterConfig.dualTemperatureA === 0.2, 'dualTemperatureA preserved');
  assert(stateAfterConfig.dualTemperatureB === 0.9, 'dualTemperatureB preserved');

  // 5. Three Distinct Send Handlers & Targets
  // Test send to AI 1 only
  const userMsg1Id = useAppStore.getState().addDualUserMessage('Review this code', 'ai1');
  assert(useAppStore.getState().dualMessages.length === 1, 'Dual message 1 added');
  const userMsg1 = useAppStore.getState().dualMessages[0];
  assert(userMsg1.target === 'ai1', 'Message 1 targeted to AI 1 only');
  assert(userMsg1.role === 'user', 'Message 1 has role "user"');

  const ai1MsgId = useAppStore.getState().addDualSlotPlaceholder('ai1', 'DeepSeek Expert', 'Llama 3.3', 'Groq');
  assert(useAppStore.getState().dualMessages.length === 2, 'AI 1 placeholder added');
  useAppStore.getState().updateDualMessage(ai1MsgId, {
    content: 'Code looks clean.',
    isStreaming: false,
    metrics: { ttftMs: 120, totalDurationMs: 450 }
  });
  const ai1Completed = useAppStore.getState().dualMessages[1];
  assert(ai1Completed.role === 'ai1', 'AI 1 response role is "ai1"');
  assert(ai1Completed.content === 'Code looks clean.', 'AI 1 content recorded');
  assert(ai1Completed.metrics?.ttftMs === 120, 'AI 1 latency metric recorded');

  // Test send to AI 2 only
  const userMsg2Id = useAppStore.getState().addDualUserMessage('Check vulnerability', 'ai2');
  const userMsg2 = useAppStore.getState().dualMessages[2];
  assert(userMsg2.target === 'ai2', 'Message 2 targeted to AI 2 only');

  // Test send to Both AIs
  const userMsg3Id = useAppStore.getState().addDualUserMessage('Benchmark both models', 'both');
  const userMsg3 = useAppStore.getState().dualMessages[3];
  assert(userMsg3.target === 'both', 'Message 3 targeted to both AIs');

  // 6. Independent Slot Failure Handling (One slot error does not discard the other)
  const slotAId = useAppStore.getState().addDualSlotPlaceholder('ai1', 'AI 1', 'Model A', 'Provider A');
  const slotBId = useAppStore.getState().addDualSlotPlaceholder('ai2', 'AI 2', 'Model B', 'Provider B');

  // Slot A fails with error
  useAppStore.getState().updateDualMessage(slotAId, {
    error: 'Rate limit exceeded on Provider A',
    isStreaming: false
  });
  // Slot B succeeds
  useAppStore.getState().updateDualMessage(slotBId, {
    content: 'Provider B succeeded with complete solution.',
    isStreaming: false
  });

  const slotAResult = useAppStore.getState().dualMessages.find(m => m.id === slotAId);
  const slotBResult = useAppStore.getState().dualMessages.find(m => m.id === slotBId);

  assert(Boolean(slotAResult?.error), 'Slot A captured error without throwing');
  assert(slotBResult?.content === 'Provider B succeeded with complete solution.', 'Slot B response preserved intact despite Slot A failure');
  assert(!slotBResult?.error, 'Slot B has no error');

  // 7. Auto AI-to-AI Conversation State Controls
  useAppStore.getState().setAutoChatState('running');
  useAppStore.getState().setAutoChatTurnLimit(10);
  useAppStore.getState().setAutoChatCurrentTurn(1);
  assert(useAppStore.getState().autoChatState === 'running', 'Auto-chat state set to running');
  assert(useAppStore.getState().autoChatCurrentTurn === 1, 'Current turn is 1');

  useAppStore.getState().setAutoChatState('paused');
  assert(useAppStore.getState().autoChatState === 'paused', 'Auto-chat paused without clearing messages');
  assert(useAppStore.getState().dualMessages.length >= 5, 'All conversation turns preserved during pause');

  useAppStore.getState().setAutoChatState('idle');
  useAppStore.getState().setAutoChatCurrentTurn(0);
  assert(useAppStore.getState().autoChatState === 'idle', 'Auto-chat stopped cleanly');

  // 8. Clear Dual Chat
  useAppStore.getState().clearDualChat();
  assert(useAppStore.getState().dualMessages.length === 0, 'clearDualChat wipes dual messages');
  assert(useAppStore.getState().messages.length === 1, 'Single chat messages remain intact after dual chat clear');

  // Clean up test state
  useAppStore.getState().clearChat();
  console.log('✓ All DualChat Workspace & State Isolation tests passed successfully\n');
}
