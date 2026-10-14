import { useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { ProviderRegistry } from '../providers/registry';
import { ApiKeyStorage } from '../services/apiKeyStorage';
import type { MessageAttachment, ChatMessage } from '../types/chat';
import { getRuntimeModelId } from '../types/provider';

export function useDualChat() {
  const {
    apiKey,
    selectedProvider,
    selectedModel,
    dualModelA,
    dualModelB,
    dualProviderA,
    dualProviderB,
    dualMessages,
    isDualGenerating,
    addDualMessagePlaceholder,
    updateDualResponseA,
    updateDualResponseB,
    setDualGenerating,
    stopDualGeneration,
    showNotification
  } = useAppStore();

  const resolveSlotContext = useCallback((slot: 'A' | 'B') => {
    const provider = slot === 'A' 
      ? (dualProviderA || selectedProvider) 
      : (dualProviderB || selectedProvider);

    const model = slot === 'A' 
      ? (dualModelA || selectedModel) 
      : (dualModelB || selectedModel);

    // Determine the best API key for this provider
    let keyToUse = '';
    if (provider?.id && selectedProvider?.id === provider.id && apiKey) {
      keyToUse = apiKey;
    } else if (provider?.id) {
      const storedKey = ApiKeyStorage.getAll().find(k => k.providerId === provider.id);
      if (storedKey) {
        keyToUse = storedKey.apiKey;
      } else if (apiKey) {
        // Fallback to active key if same or custom
        keyToUse = apiKey;
      }
    }

    return {
      provider,
      model,
      apiKey: keyToUse
    };
  }, [apiKey, selectedProvider, selectedModel, dualModelA, dualModelB, dualProviderA, dualProviderB]);

  const streamSingleSlot = useCallback(async (
    slot: 'A' | 'B',
    messageId: string,
    prompt: string,
    attachments: MessageAttachment[] = [],
    signal: AbortSignal
  ) => {
    const { provider, model, apiKey: slotApiKey } = resolveSlotContext(slot);
    const updateResponse = slot === 'A' ? updateDualResponseA : updateDualResponseB;

    if (!provider) {
      updateResponse(messageId, {
        error: `Provider for Model ${slot} is not configured. Please select a provider.`,
        isStreaming: false
      });
      return;
    }

    if (!slotApiKey && provider.id !== 'custom') {
      updateResponse(messageId, {
        error: `No API key found for ${provider.name}. Please connect a key in Add API Key or Stored Keys.`,
        isStreaming: false
      });
      return;
    }

    const adapter = ProviderRegistry.resolveAdapter(provider);
    const targetModelId = getRuntimeModelId(model, provider.defaultModelId || 'default');

    // Build chat context for this model
    // Convert previous dual messages to conversational history for this slot
    const history: ChatMessage[] = [];
    dualMessages.forEach((dm) => {
      history.push({
        id: dm.id + '_user',
        role: 'user',
        content: dm.userPrompt,
        attachments: dm.attachments,
        timestamp: dm.timestamp
      });
      const priorResponse = slot === 'A' ? dm.responseA : dm.responseB;
      if (priorResponse.content && !priorResponse.error) {
        history.push({
          id: dm.id + '_assistant',
          role: 'assistant',
          content: priorResponse.content,
          timestamp: dm.timestamp + 1
        });
      }
    });

    // Add current user prompt
    history.push({
      id: messageId + '_user',
      role: 'user',
      content: prompt,
      attachments,
      timestamp: Date.now()
    });

    const startTime = Date.now();
    let ttftRecorded = false;
    let ttftMs: number | undefined;
    let accumulated = '';
    let accumulatedThinking = '';

    try {
      const stream = adapter.streamChat({
        apiKey: slotApiKey,
        model: targetModelId,
        messages: history,
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

        if (!ttftRecorded && (chunk.delta || chunk.content || chunk.thinking)) {
          ttftMs = Date.now() - startTime;
          ttftRecorded = true;
        }

        if (chunk.thinking) {
          accumulatedThinking += chunk.thinking;
        }

        if (chunk.delta) {
          accumulated += chunk.delta;
        } else if (chunk.content) {
          accumulated = chunk.content;
        }

        updateResponse(messageId, {
          content: accumulated,
          thinking: accumulatedThinking || undefined,
          isStreaming: true,
          metrics: {
            ttftMs: ttftMs ?? (Date.now() - startTime),
            totalDurationMs: Date.now() - startTime
          }
        });
      }

      const totalDurationMs = Date.now() - startTime;
      updateResponse(messageId, {
        content: accumulated,
        thinking: accumulatedThinking || undefined,
        isStreaming: false,
        metrics: {
          ttftMs: ttftMs ?? totalDurationMs,
          totalDurationMs
        }
      });
    } catch (err: any) {
      if (signal.aborted) {
        updateResponse(messageId, { isStreaming: false });
        return;
      }
      const errMsg = err?.message || err?.error?.message || 'Error generating response';
      updateResponse(messageId, {
        error: errMsg,
        isStreaming: false,
        metrics: {
          totalDurationMs: Date.now() - startTime
        }
      });
    }
  }, [resolveSlotContext, dualMessages, updateDualResponseA, updateDualResponseB]);

  const sendMessage = useCallback(async (prompt: string, attachments: MessageAttachment[] = []) => {
    if (!prompt.trim() && attachments.length === 0) return;
    if (isDualGenerating) return;

    const messageId = addDualMessagePlaceholder(prompt, attachments);
    const controller = new AbortController();
    setDualGenerating(true, controller);

    try {
      await Promise.allSettled([
        streamSingleSlot('A', messageId, prompt, attachments, controller.signal),
        streamSingleSlot('B', messageId, prompt, attachments, controller.signal)
      ]);
    } finally {
      setDualGenerating(false, null);
    }
  }, [isDualGenerating, addDualMessagePlaceholder, setDualGenerating, streamSingleSlot]);

  const regenerate = useCallback(async () => {
    if (dualMessages.length === 0 || isDualGenerating) return;
    const lastMsg = dualMessages[dualMessages.length - 1];
    if (!lastMsg) return;

    // Reset the latest response states to streaming placeholder
    const { dualModelA, dualModelB, selectedModel, dualProviderA, dualProviderB, selectedProvider } = useAppStore.getState();
    const modelA = dualModelA || selectedModel;
    const modelB = dualModelB || selectedModel;
    const providerA = dualProviderA || selectedProvider;
    const providerB = dualProviderB || selectedProvider;

    updateDualResponseA(lastMsg.id, {
      modelId: modelA?.id || 'model-a',
      modelName: modelA?.name || modelA?.id || 'Model A',
      providerId: providerA?.id || 'provider-a',
      providerName: providerA?.name || 'Provider A',
      content: '',
      error: undefined,
      thinking: undefined,
      isStreaming: true
    });

    updateDualResponseB(lastMsg.id, {
      modelId: modelB?.id || 'model-b',
      modelName: modelB?.name || modelB?.id || 'Model B',
      providerId: providerB?.id || 'provider-b',
      providerName: providerB?.name || 'Provider B',
      content: '',
      error: undefined,
      thinking: undefined,
      isStreaming: true
    });

    const controller = new AbortController();
    setDualGenerating(true, controller);

    try {
      await Promise.allSettled([
        streamSingleSlot('A', lastMsg.id, lastMsg.userPrompt, lastMsg.attachments || [], controller.signal),
        streamSingleSlot('B', lastMsg.id, lastMsg.userPrompt, lastMsg.attachments || [], controller.signal)
      ]);
    } finally {
      setDualGenerating(false, null);
    }
  }, [dualMessages, isDualGenerating, updateDualResponseA, updateDualResponseB, setDualGenerating, streamSingleSlot]);

  return {
    sendMessage,
    regenerate,
    stopGeneration: stopDualGeneration,
    isDualGenerating
  };
}
