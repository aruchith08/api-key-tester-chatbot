import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '../../types/chat';
import { useAppStore } from '../../store/appStore';
import { CodeBlock } from './CodeBlock';
import { ThinkingBlock } from './ThinkingBlock';
import { ArtifactFileCard } from './ArtifactFileCard';
import { ExecutionLogsDrawer } from './ExecutionLogsDrawer';
import { sandboxRunner } from '../../sandbox/sandboxRunner';
import { parseThinking } from '../../utils/thinkingParser';
import { Copy, Check, AlertCircle, FileText } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessage;
  onRegenerate?: () => void;
  isLatest?: boolean;
}

export const ChatMessageItem: React.FC<ChatMessageProps> = ({
  message,
  onRegenerate,
  isLatest = false,
}) => {
  const { setModelSelectorOpen, setMessageExecution } = useAppStore();
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  // Parse thinking and output separately
  const { thinking, content, isThinking } = parseThinking(message.content, message.thinking);

  const handleRunPythonCode = async (codeToRun: string) => {
    setMessageExecution(message.id, {
      status: 'running',
      statusMessage: '⚡ Initializing Python sandbox...',
      code: codeToRun
    });

    const result = await sandboxRunner.runPython(
      codeToRun,
      (statusMessage) => {
        setMessageExecution(message.id, {
          status: 'running',
          statusMessage,
          code: codeToRun
        });
      }
    );

    setMessageExecution(message.id, {
      status: result.success ? 'success' : 'error',
      statusMessage: result.success ? 'Execution complete' : 'Execution failed',
      code: codeToRun,
      stdout: result.stdout,
      stderr: result.stderr,
      durationMs: result.durationMs,
      files: result.files,
      error: result.error
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content || message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Ignore
    }
  };

  if (message.role === 'tool') {
    return (
      <div className="w-full max-w-3xl mx-auto py-1 px-3 sm:px-6">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#141417] border border-[#222226] text-[11px] text-neutral-400 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>⚡ Tool Result ({message.tool_call_id || 'call'}): Processed by sandbox</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-3xl mx-auto py-3 sm:py-4 px-3 sm:px-6 flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      {/* User Message */}
      {isUser && (
        <div className="flex flex-col items-end max-w-[85%] sm:max-w-[75%] gap-2">
          {/* Attachments preview */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap justify-end gap-2">
              {message.attachments.map((att, idx) => (
                <div key={idx} className="rounded-xl overflow-hidden border border-[#27272D] bg-[#161619] p-1">
                  {att.type === 'image' ? (
                    <img src={att.url} alt={att.name} className="max-w-[200px] max-h-[160px] object-cover rounded-lg" />
                  ) : (
                    <div className="flex items-center gap-1.5 p-2 text-xs text-neutral-300">
                      <FileText className="w-4 h-4 text-neutral-400" />
                      <span className="truncate max-w-[140px]">{att.name}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* User Text Bubble */}
          <div className="bg-[#1E1E22] text-[#EDEDED] px-4 py-2.5 rounded-2xl rounded-tr-xs border border-[#2B2B32] text-sm sm:text-base leading-relaxed break-words shadow-sm">
            {message.content}
          </div>
        </div>
      )}

      {/* Assistant Message */}
      {!isUser && (
        <div className="flex flex-col items-start w-full gap-2">
          {/* Error Message if any */}
          {message.error ? (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-950/20 border border-red-500/30 rounded-xl text-xs text-red-300 w-full">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold text-red-400">Error Generating Response</div>
                <div className="mt-0.5">{message.error}</div>
                <div className="flex items-center gap-2 mt-2.5">
                  {onRegenerate && (
                    <button
                      type="button"
                      onClick={onRegenerate}
                      className="px-2.5 py-1 bg-red-900/40 hover:bg-red-900/60 text-red-200 rounded-lg text-xs font-medium transition-colors"
                    >
                      Retry Request
                    </button>
                  )}
                  {message.error.toLowerCase().includes('model') && (
                    <button
                      type="button"
                      onClick={() => setModelSelectorOpen(true)}
                      className="px-2.5 py-1 bg-[#222226] hover:bg-[#2C2C32] border border-[#35353C] text-neutral-200 rounded-lg text-xs font-medium transition-colors"
                    >
                      Switch Model
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="relative group w-full text-neutral-200 text-sm sm:text-base leading-relaxed">
              {/* Separate Thinking Section */}
              <ThinkingBlock
                thinking={thinking}
                isThinking={isThinking}
                isStreaming={message.isStreaming}
              />

              {/* Tool Calls Badge */}
              {message.tool_calls && message.tool_calls.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {message.tool_calls.map((tc, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#18181D] border border-emerald-500/30 text-xs text-neutral-300 font-mono shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      <span className="text-emerald-400 font-medium">⚡ {tc.function.name}</span>
                      <span className="text-neutral-500 text-[10px]">tool</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Markdown Rendered Content */}
              {content ? (
                <div className="prose prose-invert max-w-none prose-p:my-2 prose-pre:my-0 prose-pre:bg-transparent prose-pre:p-0 prose-headings:font-normal prose-headings:text-neutral-100 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-blockquote:border-l-neutral-700 prose-blockquote:text-neutral-400">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        const isInline = !match && !String(children).includes('\n');
                        if (isInline) {
                          return (
                            <code className="bg-[#1C1C20] text-emerald-300 px-1.5 py-0.5 rounded text-[13px] font-mono" {...props}>
                              {children}
                            </code>
                          );
                        }
                        return (
                          <CodeBlock
                            language={match ? match[1] : 'text'}
                            code={String(children).replace(/\n$/, '')}
                            onRunCode={handleRunPythonCode}
                            isRunning={message.execution?.status === 'running'}
                          />
                        );
                      },
                      a({ href, children }) {
                        return (
                          <a 
                            href={href} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
                          >
                            {children}
                          </a>
                        );
                      }
                    }}
                  >
                    {content}
                  </ReactMarkdown>

                  {/* Streaming cursor pill */}
                  {message.isStreaming && !isThinking && (
                    <span className="inline-block w-2 h-4 ml-1 bg-emerald-400 animate-pulse rounded-xs align-middle" />
                  )}
                </div>
              ) : (
                message.isStreaming && !thinking && (
                  <span className="inline-block w-2 h-4 bg-emerald-400 animate-pulse rounded-xs align-middle" />
                )
              )}

              {/* Active Sandbox Execution Status Banner */}
              {message.execution?.status === 'running' && (
                <div className="my-3 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="font-medium font-mono">
                    {message.execution.statusMessage || '⚡ Running code in sandbox...'}
                  </span>
                </div>
              )}

              {/* Generated Artifacts / Downloadable Files */}
              {message.execution?.files && message.execution.files.length > 0 && (
                <div className="my-3">
                  <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span>Generated Artifacts</span>
                    <span className="text-emerald-400 font-mono">({message.execution.files.length})</span>
                  </div>
                  {message.execution.files.map((file, idx) => (
                    <ArtifactFileCard key={idx} file={file} />
                  ))}
                </div>
              )}

              {/* Execution Logs Drawer */}
              {message.execution && message.execution.status !== 'running' && (
                <ExecutionLogsDrawer execution={message.execution} />
              )}

              {/* Message Footer Controls: Copy, Metrics */}
              {!message.isStreaming && (content || thinking) && (
                <div className="flex items-center gap-3 mt-2 pt-1 text-xs text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1 hover:text-neutral-300 transition-colors"
                    title="Copy full message"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  {/* Latency & Token indicators */}
                  {message.metrics?.totalResponseTimeMs && (
                    <span className="font-mono text-[11px] text-neutral-600">
                      {Math.round(message.metrics.totalResponseTimeMs)}ms
                    </span>
                  )}
                  {message.metrics?.totalTokens && (
                    <span className="font-mono text-[11px] text-neutral-600">
                      {message.metrics.totalTokens} tokens
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
