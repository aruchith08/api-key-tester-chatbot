import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { DualChatMessage, DualMessageResponse } from '../../types/chat';
import { ThinkingBlock } from '../Chat/ThinkingBlock';
import { parseThinking } from '../../utils/thinkingParser';
import { Copy, Check, AlertCircle, Clock, Zap, FileText } from 'lucide-react';

interface DualMessageComparisonProps {
  message: DualChatMessage;
  isLatest?: boolean;
}

const DualResponsePane: React.FC<{
  slot: 'A' | 'B';
  response: DualMessageResponse;
}> = ({ slot, response }) => {
  const [copied, setCopied] = useState(false);
  const { thinking, content, isThinking } = parseThinking(response.content, response.thinking);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content || response.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Ignore
    }
  };

  const isModelA = slot === 'A';
  const accentColor = isModelA ? 'text-emerald-400' : 'text-sky-400';
  const badgeBg = isModelA ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' : 'bg-sky-950/40 text-sky-300 border-sky-800/40';

  return (
    <div className="flex flex-col bg-[#111114] border border-[#222228] rounded-2xl overflow-hidden shadow-md flex-1">
      {/* Pane Header */}
      <div className="flex items-center justify-between px-3.5 sm:px-4 py-2.5 border-b border-[#1E1E24] bg-[#141418]">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${badgeBg}`}>
            Model {slot}
          </span>
          <div className="min-w-0">
            <span className="font-semibold text-xs sm:text-sm text-neutral-100 truncate block">
              {response.modelName}
            </span>
            <span className="text-[10px] text-neutral-500 font-mono truncate block">
              {response.providerName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Latency & Duration Metrics */}
          {response.metrics?.ttftMs && (
            <div 
              className="flex items-center gap-1 text-[11px] font-mono text-neutral-400 bg-[#1A1A20] px-2 py-0.5 rounded-lg border border-[#282832]"
              title={`Time to First Token: ${response.metrics.ttftMs}ms`}
            >
              <Zap className={`w-3 h-3 ${accentColor}`} />
              <span>{response.metrics.ttftMs}ms</span>
            </div>
          )}

          {response.metrics?.totalDurationMs && !response.isStreaming && (
            <div 
              className="flex items-center gap-1 text-[11px] font-mono text-neutral-400 bg-[#1A1A20] px-2 py-0.5 rounded-lg border border-[#282832] hidden sm:flex"
              title={`Total generation duration: ${(response.metrics.totalDurationMs / 1000).toFixed(2)}s`}
            >
              <Clock className="w-3 h-3 text-neutral-500" />
              <span>{(response.metrics.totalDurationMs / 1000).toFixed(1)}s</span>
            </div>
          )}

          {/* Copy Button */}
          {response.content && (
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              title="Copy response"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Pane Content */}
      <div className="p-3.5 sm:p-5 flex-1 flex flex-col overflow-y-auto text-xs sm:text-sm leading-relaxed text-neutral-200">
        {response.error ? (
          <div className="p-3 rounded-xl bg-red-950/30 border border-red-900/40 text-red-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <div className="font-semibold text-red-400">Generation Error</div>
              <div className="mt-0.5 text-neutral-300">{response.error}</div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Thinking Block */}
            <ThinkingBlock
              thinking={thinking}
              isThinking={isThinking}
              isStreaming={response.isStreaming}
            />

            {/* Markdown Output */}
            {content ? (
              <div className="prose prose-invert prose-neutral max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              </div>
            ) : response.isStreaming ? (
              <div className="flex items-center gap-2 text-neutral-400 py-4 animate-pulse">
                <div className={`w-2 h-2 rounded-full ${isModelA ? 'bg-emerald-400' : 'bg-sky-400'}`} />
                <span className="text-xs font-mono">Generating response...</span>
              </div>
            ) : (
              <div className="text-neutral-500 text-xs italic py-2">
                No response returned.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const DualMessageComparison: React.FC<DualMessageComparisonProps> = ({ message }) => {
  return (
    <div className="w-full max-w-6xl mx-auto py-3 sm:py-5 px-3 sm:px-6 flex flex-col gap-4">
      {/* User Prompt Header */}
      <div className="flex justify-end">
        <div className="max-w-[90%] sm:max-w-[80%] bg-[#1E1E24] border border-[#2D2D36] text-white px-4 py-3 rounded-2xl shadow-sm">
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {message.attachments.map((att, idx) => (
                <div key={idx} className="flex items-center gap-1.5 px-2 py-1 bg-black/40 rounded-lg text-xs text-neutral-300 border border-white/5">
                  <FileText className="w-3.5 h-3.5 text-neutral-400" />
                  <span className="truncate max-w-[120px]">{att.name}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
            {message.userPrompt}
          </p>
        </div>
      </div>

      {/* Side-by-side Response Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 items-stretch">
        <DualResponsePane slot="A" response={message.responseA} />
        <DualResponsePane slot="B" response={message.responseB} />
      </div>
    </div>
  );
};
