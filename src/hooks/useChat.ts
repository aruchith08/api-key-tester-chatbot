import { useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { ProviderRegistry } from '../providers/registry';
import { findExecutableFileScript } from '../utils/codeDetector';
import { sandboxRunner } from '../sandbox/sandboxRunner';
import { OPENAI_AGENT_TOOLS, parseToolArguments } from '../sandbox/agentTools';
import type { MessageAttachment, ToolCall } from '../types/chat';

export function useChat() {
  const {
    apiKey,
    selectedProvider,
    selectedModel,
    messages,
    isGenerating,
    isAgentMode,
    addUserMessage,
    addAssistantPlaceholder,
    updateAssistantMessage,
    addToolMessage,
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
    let assistantMsgId = addAssistantPlaceholder();

    // 3. Create abort controller
    const controller = new AbortController();
    setGenerating(true, controller);

    const chatStartTime = Date.now();
    updateVerificationStage('chat', { status: 'RUNNING' });

    const adapter = ProviderRegistry.resolveAdapter(selectedProvider);
    const targetModel = selectedModel?.id || selectedProvider.defaultModelId || 'default';

    const MAX_AGENT_TURNS = 5;
    let turn = 0;
    let enableTools = isAgentMode;

    try {
      while (turn < MAX_AGENT_TURNS) {
        turn++;
        if (controller.signal.aborted) break;

        let tokenCount = 0;
        let accumulated = '';
        let accumulatedThinking = '';
        let finalMetrics: any = null;
        let emittedToolCalls: ToolCall[] | undefined = undefined;

        // Snapshot messages for conversation context
        const currentMessages = useAppStore.getState().messages;

        // Determine tool payload
        const toolsToPass = enableTools ? OPENAI_AGENT_TOOLS : undefined;

        const stream = adapter.streamChat({
          apiKey,
          model: targetModel,
          messages: currentMessages,
          tools: toolsToPass,
          signal: controller.signal,
          onRequestInspector: (req) => setLastRequest(req),
          onResponseInspector: (res) => setLastResponse(res),
          onMetrics: (metrics) => setPerformanceMetrics(metrics)
        });

        let hadStreamError = false;

        for await (const event of stream) {
          if (controller.signal.aborted) break;

          if (event.type === 'token') {
            if (tokenCount === 0) {
              updateVerificationStage('streaming', { status: 'RUNNING', details: 'Receiving token stream' });
            }
            tokenCount++;

            if (useAppStore.getState().chatState !== 'streaming') {
              useAppStore.getState().setChatState('streaming');
            }
            accumulated += event.content;
            updateAssistantMessage(assistantMsgId, accumulated, true, finalMetrics, accumulatedThinking, emittedToolCalls);
          } else if (event.type === 'thinking') {
            if (tokenCount === 0) {
              updateVerificationStage('streaming', { status: 'RUNNING', details: 'Receiving reasoning stream' });
            }
            if (useAppStore.getState().chatState !== 'streaming') {
              useAppStore.getState().setChatState('streaming');
            }
            accumulatedThinking += event.content;
            updateAssistantMessage(assistantMsgId, accumulated, true, finalMetrics, accumulatedThinking, emittedToolCalls);
          } else if (event.type === 'tool_call_delta') {
            if (useAppStore.getState().chatState !== 'streaming') {
              useAppStore.getState().setChatState('streaming');
            }
          } else if (event.type === 'tool_calls') {
            emittedToolCalls = event.toolCalls;
          } else if (event.type === 'usage') {
            if (finalMetrics) {
              finalMetrics.inputTokens = event.inputTokens ?? finalMetrics.inputTokens;
              finalMetrics.outputTokens = event.outputTokens ?? finalMetrics.outputTokens;
              finalMetrics.totalTokens = event.totalTokens ?? finalMetrics.totalTokens;
              setPerformanceMetrics({ ...finalMetrics });
            }
          } else if (event.type === 'complete') {
            finalMetrics = event.metrics || finalMetrics;
            if (event.toolCalls) {
              emittedToolCalls = event.toolCalls;
            }
          } else if (event.type === 'error') {
            if (controller.signal.aborted) {
              if (accumulated || accumulatedThinking) {
                updateAssistantMessage(assistantMsgId, accumulated, false, finalMetrics, accumulatedThinking);
              }
              setGenerating(false, null);
              useAppStore.getState().setChatState('idle');
              return;
            }

            // If the provider doesn't support tools, fallback to standard generation on turn 1
            if (turn === 1 && enableTools && (event.error.statusCode === 400 || /tool/i.test(event.error.message))) {
              console.warn('Tools not supported by model or endpoint, retrying in direct mode');
              enableTools = false;
              hadStreamError = true;
              break;
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

        if (hadStreamError) {
          // Retry current turn without tools
          continue;
        }

        if (controller.signal.aborted) break;

        // Finalize this assistant turn's text & tool calls
        updateAssistantMessage(assistantMsgId, accumulated, false, finalMetrics, accumulatedThinking, emittedToolCalls);

        // Check if model emitted tool calls
        if (emittedToolCalls && emittedToolCalls.length > 0) {
          for (const toolCall of emittedToolCalls) {
            if (toolCall.function.name === 'execute_python') {
              const parsed = parseToolArguments(toolCall.function.arguments);
              const scriptToRun = parsed.code || toolCall.function.arguments;

              useAppStore.getState().setMessageExecution(assistantMsgId, {
                status: 'running',
                statusMessage: '⚡ Agent executing Python script in sandbox...',
                code: scriptToRun
              });

              const result = await sandboxRunner.runPython(
                scriptToRun,
                (statusMessage) => {
                  useAppStore.getState().setMessageExecution(assistantMsgId, {
                    status: 'running',
                    statusMessage,
                    code: scriptToRun
                  });
                }
              );

              useAppStore.getState().setMessageExecution(assistantMsgId, {
                status: result.success ? 'success' : 'error',
                statusMessage: result.success ? 'Execution succeeded' : 'Execution failed',
                code: scriptToRun,
                stdout: result.stdout,
                stderr: result.stderr,
                durationMs: result.durationMs,
                files: result.files,
                error: result.error
              });

              let toolOutput = '';
              if (result.success) {
                toolOutput = `Status: Success (${result.durationMs}ms)\nStandard Output:\n${result.stdout || '(no stdout output)'}`;
                if (result.files && result.files.length > 0) {
                  toolOutput += `\n\nGenerated files:\n${result.files.map(f => `- ${f.name} (${Math.round(f.size / 1024)} KB)`).join('\n')}\nFiles are saved and ready for download.`;
                }
              } else {
                toolOutput = `Status: Failed (${result.durationMs}ms)\nError:\n${result.error || result.stderr || 'Execution failed'}\nStandard Output:\n${result.stdout || '(none)'}`;
              }

              // Append tool response message into conversation history
              addToolMessage(toolCall.id, toolOutput);
            }
          }

          // If aborted while running tool, stop
          if (controller.signal.aborted) break;

          // Prepare next placeholder for the model's reaction/final reply
          assistantMsgId = addAssistantPlaceholder();
          continue; // Next agent iteration
        }

        // Autonomous in-browser sandbox execution fallback for code block file generation
        const autoScript = findExecutableFileScript(accumulated);
        if (autoScript) {
          useAppStore.getState().setMessageExecution(assistantMsgId, {
            status: 'running',
            statusMessage: '⚡ Initializing Python sandbox...',
            code: autoScript
          });

          sandboxRunner.runPython(
            autoScript,
            (statusMessage) => {
              useAppStore.getState().setMessageExecution(assistantMsgId, {
                status: 'running',
                statusMessage,
                code: autoScript
              });
            }
          ).then((result) => {
            useAppStore.getState().setMessageExecution(assistantMsgId, {
              status: result.success ? 'success' : 'error',
              statusMessage: result.success ? 'File generation complete' : 'Execution failed',
              code: autoScript,
              stdout: result.stdout,
              stderr: result.stderr,
              durationMs: result.durationMs,
              files: result.files,
              error: result.error
            });
          }).catch((err) => {
            useAppStore.getState().setMessageExecution(assistantMsgId, {
              status: 'error',
              statusMessage: 'Execution error',
              code: autoScript,
              stdout: '',
              stderr: err?.message || String(err),
              error: err?.message || 'Sandbox error'
            });
          });
        }

        // Mark Chat PASSED
        updateVerificationStage('chat', {
          status: 'PASSED',
          durationMs: Date.now() - chatStartTime,
          details: `${accumulated.length} characters received`
        });

        if (tokenCount > 0) {
          updateVerificationStage('streaming', {
            status: 'PASSED',
            durationMs: Date.now() - chatStartTime,
            details: `${tokenCount} token event(s) parsed via SSE`
          });
        }

        // Finished all agent tool turns
        break;
      }

      setGenerating(false, null);
      useAppStore.getState().setChatState('idle');

    } catch (err: any) {
      if (err.name === 'AbortError' || controller.signal.aborted) {
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
      setGenerating(false, null);
      useAppStore.getState().setChatState('error');
    }
  }, [
    apiKey,
    selectedProvider,
    selectedModel,
    isAgentMode,
    addUserMessage,
    addAssistantPlaceholder,
    updateAssistantMessage,
    addToolMessage,
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
