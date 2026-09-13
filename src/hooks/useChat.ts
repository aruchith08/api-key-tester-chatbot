import { useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { ProviderRegistry } from '../providers/registry';
import type { MessageAttachment } from '../types/chat';

export function useChat() {
  const {
    apiKey,
    selectedProvider,
    selectedModel,
    messages,
    isGenerating,
    addUserMessage,
    addAssistantPlaceholder,
    updateAssistantMessage,
    setAssistantError,
    setGenerating,
    stopGeneration,
    setLastRequest,
    setLastResponse,
    setPerformanceMetrics,
    updateVerificationStage,
    showNotification
  } = useAppStore();

  const sendMessage = useCallback(async (content: string, attachments: MessageAttachment[] = []) => {
    if (!apiKey) {
      showNotification('Please configure an API key first.');
      return;
    }

    if (!selectedProvider) {
      showNotification('Please select an AI provider.');
      return;
    }

    // 1. Add user message
    addUserMessage(content, attachments);

    // 2. Add assistant placeholder
    const assistantMsgId = addAssistantPlaceholder();

    // 3. Create abort controller
    const controller = new AbortController();
    setGenerating(true, controller);

    const chatStartTime = Date.now();
    updateVerificationStage('chat', { status: 'RUNNING' });

    let tokenCount = 0;
    let accumulated = '';
    let finalMetrics: any = null;

    try {
      const adapter = ProviderRegistry.resolveAdapter(selectedProvider);

      // Snapshot messages for conversation context
      const currentMessages = useAppStore.getState().messages;
      const targetModel = selectedModel?.id || selectedProvider.defaultModelId || 'default';

      // Stream generation yielding normalized StreamEvents
      const stream = adapter.streamChat({
        apiKey,
        model: targetModel,
        messages: currentMessages,
        signal: controller.signal,
        onRequestInspector: (req) => setLastRequest(req),
        onResponseInspector: (res) => setLastResponse(res),
        onMetrics: (metrics) => setPerformanceMetrics(metrics)
      });

      for await (const event of stream) {
        if (event.type === 'token') {
          if (tokenCount === 0) {
            updateVerificationStage('streaming', { status: 'RUNNING', details: 'Receiving token stream' });
          }
          tokenCount++;

          if (useAppStore.getState().chatState !== 'streaming') {
            useAppStore.getState().setChatState('streaming');
          }
          accumulated += event.content;
          updateAssistantMessage(assistantMsgId, accumulated, true);
        } else if (event.type === 'usage') {
          if (finalMetrics) {
            finalMetrics.inputTokens = event.inputTokens ?? finalMetrics.inputTokens;
            finalMetrics.outputTokens = event.outputTokens ?? finalMetrics.outputTokens;
            finalMetrics.totalTokens = event.totalTokens ?? finalMetrics.totalTokens;
            setPerformanceMetrics({ ...finalMetrics });
          }
        } else if (event.type === 'complete') {
          finalMetrics = event.metrics || finalMetrics;
        } else if (event.type === 'error') {
          if (controller.signal.aborted) {
            if (accumulated) {
              updateAssistantMessage(assistantMsgId, accumulated, false, finalMetrics);
              updateVerificationStage('stopGeneration', {
                status: 'PASSED',
                durationMs: Date.now() - chatStartTime,
                details: `Stream cleanly interrupted; preserved ${accumulated.length} characters`
              });
              updateVerificationStage('chat', {
                status: 'PASSED',
                durationMs: Date.now() - chatStartTime,
                details: `Interrupted by user after ${accumulated.length} characters`
              });
            }
            setGenerating(false, null);
            useAppStore.getState().setChatState('idle');
            return;
          }
          setAssistantError(assistantMsgId, event.error.message);
          updateVerificationStage('chat', {
            status: 'FAILED',
            durationMs: Date.now() - chatStartTime,
            error: event.error.message
          });
          if (tokenCount === 0) {
            updateVerificationStage('streaming', {
              status: 'FAILED',
              durationMs: Date.now() - chatStartTime,
              error: event.error.message
            });
          }
          setGenerating(false, null);
          useAppStore.getState().setChatState('error');
          return;
        }
      }

      updateAssistantMessage(assistantMsgId, accumulated, false, finalMetrics);
      setGenerating(false, null);
      useAppStore.getState().setChatState('idle');

      // Mark Chat PASSED
      updateVerificationStage('chat', {
        status: 'PASSED',
        durationMs: Date.now() - chatStartTime,
        details: `${accumulated.length} characters received`
      });

      // Mark Streaming PASSED if tokens arrived
      if (tokenCount > 0) {
        updateVerificationStage('streaming', {
          status: 'PASSED',
          durationMs: Date.now() - chatStartTime,
          details: `${tokenCount} token event(s) parsed via SSE`
        });
      }

    } catch (err: any) {
      if (err.name === 'AbortError' || controller.signal.aborted) {
        // Graceful user cancellation
        if (accumulated) {
          updateAssistantMessage(assistantMsgId, accumulated, false, finalMetrics);
          updateVerificationStage('stopGeneration', {
            status: 'PASSED',
            durationMs: Date.now() - chatStartTime,
            details: `Stream cleanly interrupted; preserved ${accumulated.length} characters`
          });
          updateVerificationStage('chat', {
            status: 'PASSED',
            durationMs: Date.now() - chatStartTime,
            details: `Interrupted by user after ${accumulated.length} characters`
          });
        }
        setGenerating(false, null);
        useAppStore.getState().setChatState('idle');
        return;
      }

      const errMsg = err.message || 'An error occurred during response generation.';
      setAssistantError(assistantMsgId, errMsg);
      updateVerificationStage('chat', {
        status: 'FAILED',
        durationMs: Date.now() - chatStartTime,
        error: errMsg
      });
      if (tokenCount === 0) {
        updateVerificationStage('streaming', {
          status: 'FAILED',
          durationMs: Date.now() - chatStartTime,
          error: errMsg
        });
      }
      setGenerating(false, null);
      useAppStore.getState().setChatState('error');
    }
  }, [
    apiKey,
    selectedProvider,
    selectedModel,
    addUserMessage,
    addAssistantPlaceholder,
    updateAssistantMessage,
    setAssistantError,
    setGenerating,
    updateVerificationStage,
    setLastRequest,
    setLastResponse,
    setPerformanceMetrics,
    showNotification
  ]);

  const regenerate = useCallback(async () => {
    const currentMessages = useAppStore.getState().messages;
    if (currentMessages.length === 0 || isGenerating) return;

    // Find latest user message
    const lastUserMsg = [...currentMessages].reverse().find(m => m.role === 'user');
    if (!lastUserMsg) return;

    // Remove latest assistant message
    const lastMsg = currentMessages[currentMessages.length - 1];
    if (lastMsg.role === 'assistant') {
      useAppStore.setState({
        messages: currentMessages.slice(0, currentMessages.length - 1)
      });
    }

    // Re-dispatch latest prompt
    await sendMessage(lastUserMsg.content, lastUserMsg.attachments);
  }, [isGenerating, sendMessage]);

  return {
    sendMessage,
    regenerate,
    stopGeneration,
    isGenerating
  };
}
