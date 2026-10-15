import { useCallback, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { ProviderRegistry } from '../providers/registry';
import { ApiKeyStorage } from '../services/apiKeyStorage';
import type { MessageAttachment, ChatMessage } from '../types/chat';
import { getRuntimeModelId } from '../types/provider';

export function useDualChat() {
  const {
    apiKey,
    selectedProvider,
    dualModelA,
    dualModelB,
    dualProviderA,
    dualProviderB,
    dualApiKeyA,
    dualApiKeyB,
    dualNameA,
    dualNameB,
    dualSystemPromptA,
    dualSystemPromptB,
    dualTemperatureA,
    dualTemperatureB,
    dualMessages,
    isDualGenerating,
    autoChatState,
    autoChatTurnLimit,
    autoChatCurrentTurn,
    addDualUserMessage,
    addDualSlotPlaceholder,
    updateDualMessage,
    setDualGenerating,
    stopDualGeneration,
    setAutoChatState,
    setAutoChatCurrentTurn,
    clearDualChat,
    showNotification
  } = useAppStore();

  const activeAbortControllerRef = useRef<AbortController | null>(null);

  const resolveSlotContext = useCallback((slot: 'A' | 'B') => {
    const provider = slot === 'A' ? dualProviderA : dualProviderB;
    const model = slot === 'A' ? dualModelA : dualModelB;
    const displayName = slot === 'A' ? (dualNameA || 'AI 1') : (dualNameB || 'AI 2');
    const systemPrompt = slot === 'A' ? dualSystemPromptA : dualSystemPromptB;
    const temperature = slot === 'A' ? dualTemperatureA : dualTemperatureB;

    let keyToUse = slot === 'A' ? dualApiKeyA : dualApiKeyB;
    if (!keyToUse && provider?.id) {
      const storedKey = ApiKeyStorage.getAll().find(k => k.providerId === provider.id);
      if (storedKey) {
        keyToUse = storedKey.apiKey;
      } else if (selectedProvider?.id === provider.id && apiKey) {
        keyToUse = apiKey;
      }
    }

    return {
      provider,
      model,
      displayName,
      systemPrompt,
      temperature,
      apiKey: keyToUse
    };
  }, [
    dualProviderA,
    dualProviderB,
    dualModelA,
    dualModelB,
    dualNameA,
    dualNameB,
    dualSystemPromptA,
    dualSystemPromptB,
    dualTemperatureA,
    dualTemperatureB,
    dualApiKeyA,
    dualApiKeyB,
    selectedProvider,
    apiKey
  ]);

  const buildHistoryForSlot = useCallback((slot: 'A' | 'B', extraUserPrompt?: string, extraAttachments: MessageAttachment[] = []) => {
    const { systemPrompt } = resolveSlotContext(slot);
    const history: ChatMessage[] = [];

    if (systemPrompt && systemPrompt.trim()) {
      history.push({
        id: 'sys_' + slot,
        role: 'system',
        content: systemPrompt.trim(),
        timestamp: 0
      });
    }

    // Always read from live store snapshot to avoid stale closure state
    const currentDualMessages = useAppStore.getState().dualMessages;

    currentDualMessages.forEach((msg) => {
      if (msg.role === 'user') {
        history.push({
          id: msg.id,
          role: 'user',
          content: msg.content || msg.userPrompt || '',
          attachments: msg.attachments,
          timestamp: msg.timestamp
        });
      } else if ((slot === 'A' && msg.role === 'ai1') || (slot === 'B' && msg.role === 'ai2')) {
        if (msg.content && !msg.error) {
          history.push({
            id: msg.id,
            role: 'assistant',
            content: msg.content,
            timestamp: msg.timestamp
          });
        }
      } else if (msg.role === 'ai1' || msg.role === 'ai2') {
        // Opposing AI's turn from this AI's perspective
        if (msg.content && !msg.error) {
          const speaker = msg.senderName || (msg.role === 'ai1' ? 'AI 1' : 'AI 2');
          history.push({
            id: msg.id,
            role: 'user',
            content: `[${speaker}]: ${msg.content}`,
            timestamp: msg.timestamp
          });
        }
      }
    });

    if (extraUserPrompt && extraUserPrompt.trim()) {
      history.push({
        id: 'user_extra_' + Date.now(),
        role: 'user',
        content: extraUserPrompt.trim(),
        attachments: extraAttachments,
        timestamp: Date.now()
      });
    }

    return history;
  }, [resolveSlotContext]);

  const streamSlot = useCallback(async (
    slot: 'A' | 'B',
    signal: AbortSignal,
    overrideHistory?: ChatMessage[]
  ): Promise<boolean> => {
    const { provider, model, displayName, apiKey: slotApiKey, temperature } = resolveSlotContext(slot);
    const role = slot === 'A' ? 'ai1' : 'ai2';

    if (!provider) {
      addDualSlotPlaceholder(
        role,
        displayName,
        undefined,
        undefined
      );
      const lastId = useAppStore.getState().dualMessages[useAppStore.getState().dualMessages.length - 1]?.id;
      if (lastId) {
        updateDualMessage(lastId, {
          error: `Please select a provider for ${displayName}.`,
          isStreaming: false
        });
      }
      return false;
    }

    if (!model) {
      addDualSlotPlaceholder(
        role,
        displayName,
        undefined,
        provider.name
      );
      const lastId = useAppStore.getState().dualMessages[useAppStore.getState().dualMessages.length - 1]?.id;
      if (lastId) {
        updateDualMessage(lastId, {
          error: `Please select a model for ${displayName} (${provider.name}).`,
          isStreaming: false
        });
      }
      return false;
    }

    if (!slotApiKey && provider.id !== 'custom') {
      addDualSlotPlaceholder(
        role,
        displayName,
        model.name || model.id,
        provider.name
      );
      const lastId = useAppStore.getState().dualMessages[useAppStore.getState().dualMessages.length - 1]?.id;
      if (lastId) {
        updateDualMessage(lastId, {
          error: `No API key found for ${provider.name}. Please enter a key in the ${displayName} panel or Add API Key.`,
          isStreaming: false
        });
      }
      return false;
    }

    const placeholderId = addDualSlotPlaceholder(
      role,
      displayName,
      model.name || model.id,
      provider.name
    );

    const adapter = ProviderRegistry.resolveAdapter(provider);
    const targetModelId = getRuntimeModelId(model, provider.defaultModelId || 'default');
    const messages = overrideHistory || buildHistoryForSlot(slot);

    const startTime = Date.now();
    let ttftRecorded = false;
    let ttftMs: number | undefined;
    let accumulated = '';
    let accumulatedThinking = '';

    try {
      const stream = adapter.streamChat({
        apiKey: slotApiKey || '',
        model: targetModelId,
        messages,
        temperature,
        signal,
        onMetrics: (metrics) => {
          if (metrics.ttftMs && !ttftRecorded) {
            ttftMs = metrics.ttftMs;
            ttftRecorded = true;
          }
        }
      });

      for await (const chunk of stream) {
        if (signal.aborted) break;

        // Handle error events yielded by stream adapters
        if ((chunk as any).type === 'error') {
          const err = (chunk as any).error;
          throw new Error(err?.message || err?.providerMessage || 'Provider error');
        }

        let deltaContent = '';
        let deltaThinking = '';

        if ((chunk as any).type === 'token' && typeof (chunk as any).content === 'string') {
          deltaContent = (chunk as any).content;
        } else if ((chunk as any).type === 'thinking' && typeof (chunk as any).content === 'string') {
          deltaThinking = (chunk as any).content;
        } else if ((chunk as any).delta) {
          deltaContent = (chunk as any).delta;
        } else if ((chunk as any).thinking) {
          deltaThinking = (chunk as any).thinking;
        } else if (typeof chunk === 'string') {
          deltaContent = chunk;
        }

        if (deltaContent || deltaThinking) {
          if (!ttftRecorded) {
            ttftMs = Date.now() - startTime;
            ttftRecorded = true;
          }
          if (deltaContent) {
            accumulated += deltaContent;
          }
          if (deltaThinking) {
            accumulatedThinking += deltaThinking;
          }

          updateDualMessage(placeholderId, {
            content: accumulated,
            thinking: accumulatedThinking || undefined,
            isStreaming: true,
            metrics: {
              ttftMs: ttftMs ?? (Date.now() - startTime),
              totalDurationMs: Date.now() - startTime
            }
          });
        }
      }

      const totalDurationMs = Date.now() - startTime;
      updateDualMessage(placeholderId, {
        content: accumulated,
        thinking: accumulatedThinking || undefined,
        isStreaming: false,
        metrics: {
          ttftMs: ttftMs ?? totalDurationMs,
          totalDurationMs
        }
      });
      return true;
    } catch (err: any) {
      if (signal.aborted) {
        updateDualMessage(placeholderId, { isStreaming: false });
        return false;
      }
      const errMsg = err?.message || err?.error?.message || 'Error generating response';
      updateDualMessage(placeholderId, {
        error: errMsg,
        isStreaming: false,
        metrics: {
          totalDurationMs: Date.now() - startTime
        }
      });
      return false;
    }
  }, [
    resolveSlotContext,
    addDualSlotPlaceholder,
    updateDualMessage,
    buildHistoryForSlot
  ]);

  // 1. Send to AI 1 only
  const sendToAI1 = useCallback(async (prompt: string, attachments: MessageAttachment[] = []) => {
    if (!prompt.trim() && attachments.length === 0) return;
    if (isDualGenerating) return;

    if (autoChatState === 'running') {
      setAutoChatState('idle');
    }

    addDualUserMessage(prompt, 'ai1', attachments);
    const controller = new AbortController();
    activeAbortControllerRef.current = controller;
    setDualGenerating(true, controller);

    try {
      await streamSlot('A', controller.signal);
    } finally {
      setDualGenerating(false, null);
      activeAbortControllerRef.current = null;
    }
  }, [isDualGenerating, autoChatState, setAutoChatState, addDualUserMessage, setDualGenerating, streamSlot]);

  // 2. Send to AI 2 only
  const sendToAI2 = useCallback(async (prompt: string, attachments: MessageAttachment[] = []) => {
    if (!prompt.trim() && attachments.length === 0) return;
    if (isDualGenerating) return;

    if (autoChatState === 'running') {
      setAutoChatState('idle');
    }

    addDualUserMessage(prompt, 'ai2', attachments);
    const controller = new AbortController();
    activeAbortControllerRef.current = controller;
    setDualGenerating(true, controller);

    try {
      await streamSlot('B', controller.signal);
    } finally {
      setDualGenerating(false, null);
      activeAbortControllerRef.current = null;
    }
  }, [isDualGenerating, autoChatState, setAutoChatState, addDualUserMessage, setDualGenerating, streamSlot]);

  // 3. Send to both AIs independently in parallel
  const sendToBoth = useCallback(async (prompt: string, attachments: MessageAttachment[] = []) => {
    if (!prompt.trim() && attachments.length === 0) return;
    if (isDualGenerating) return;

    if (autoChatState === 'running') {
      setAutoChatState('idle');
    }

    addDualUserMessage(prompt, 'both', attachments);
    const controller = new AbortController();
    activeAbortControllerRef.current = controller;
    setDualGenerating(true, controller);

    try {
      await Promise.allSettled([
        streamSlot('A', controller.signal),
        streamSlot('B', controller.signal)
      ]);
    } finally {
      setDualGenerating(false, null);
      activeAbortControllerRef.current = null;
    }
  }, [isDualGenerating, autoChatState, setAutoChatState, addDualUserMessage, setDualGenerating, streamSlot]);

  // 4. Automatic AI-to-AI Conversation Loop
  const startAutoConversation = useCallback(async (starterPrompt?: string) => {
    if (isDualGenerating) return;

    const { dualProviderA, dualProviderB, dualModelA, dualModelB } = useAppStore.getState();
    if (!dualProviderA || !dualModelA || !dualProviderB || !dualModelB) {
      showNotification('Please configure both AI 1 and AI 2 (provider & model) before starting auto conversation.');
      return;
    }

    if (starterPrompt && starterPrompt.trim()) {
      addDualUserMessage(starterPrompt.trim(), 'both');
    }

    setAutoChatState('running');
    let currentTurn = autoChatCurrentTurn || 0;
    const limit = autoChatTurnLimit || 10;
    let nextSpeaker: 'A' | 'B' = currentTurn % 2 === 0 ? 'A' : 'B';

    while (currentTurn < limit) {
      const liveState = useAppStore.getState().autoChatState;
      if (liveState !== 'running') {
        break;
      }

      currentTurn += 1;
      setAutoChatCurrentTurn(currentTurn);

      const controller = new AbortController();
      activeAbortControllerRef.current = controller;
      setDualGenerating(true, controller);

      let success = false;
      try {
        success = await streamSlot(nextSpeaker, controller.signal);
      } finally {
        setDualGenerating(false, null);
        activeAbortControllerRef.current = null;
      }

      if (!success || controller.signal.aborted) {
        break;
      }

      nextSpeaker = nextSpeaker === 'A' ? 'B' : 'A';

      // Brief delay between turns for readability
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    if (currentTurn >= limit) {
      setAutoChatState('idle');
      showNotification(`Completed ${limit} conversation turns between AI 1 and AI 2.`);
    }
  }, [
    isDualGenerating,
    autoChatCurrentTurn,
    autoChatTurnLimit,
    showNotification,
    addDualUserMessage,
    setAutoChatState,
    setAutoChatCurrentTurn,
    setDualGenerating,
    streamSlot
  ]);

  const pauseAutoConversation = useCallback(() => {
    setAutoChatState('paused');
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
    }
    setDualGenerating(false, null);
  }, [setAutoChatState, setDualGenerating]);

  const resumeAutoConversation = useCallback(() => {
    startAutoConversation();
  }, [startAutoConversation]);

  const stopAutoConversation = useCallback(() => {
    setAutoChatState('idle');
    setAutoChatCurrentTurn(0);
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
    }
    setDualGenerating(false, null);
  }, [setAutoChatState, setAutoChatCurrentTurn, setDualGenerating]);

  const stopGeneration = useCallback(() => {
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
    }
    stopDualGeneration();
    if (autoChatState === 'running') {
      setAutoChatState('idle');
    }
  }, [stopDualGeneration, autoChatState, setAutoChatState]);

  return {
    sendToAI1,
    sendToAI2,
    sendToBoth,
    sendMessage: sendToBoth, // Backwards-compatible alias
    startAutoConversation,
    pauseAutoConversation,
    resumeAutoConversation,
    stopAutoConversation,
    stopGeneration,
    clearDualChat,
    isDualGenerating,
    autoChatState,
    autoChatCurrentTurn,
    autoChatTurnLimit
  };
}
