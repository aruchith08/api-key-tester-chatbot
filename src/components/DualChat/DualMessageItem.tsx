import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { DualChatMessage } from '../../types/chat';
import { ThinkingBlock } from '../Chat/ThinkingBlock';
import { parseThinking } from '../../utils/thinkingParser';
import { DualMessageComparison } from './DualMessageComparison';
import { Copy, Check, AlertCircle, Zap, Clock, ArrowLeft, ArrowRight, ArrowUp, User } from 'lucide-react';

interface DualMessageItemProps {
  message: DualChatMessage;
  isLatest?: boolean;
}

export const DualMessageItem: React.FC<DualMessageItemProps> = ({ message, isLatest }) => {
  // If this is a legacy comparison message with responseA and responseB, render the side-by-side view
  if (message.responseA && message.responseB && !message.role) {
    return <DualMessageComparison message={message} isLatest={isLatest} />;
  }

  const [copied, setCopied] = useState(false);
  const { thinking, content, isThinking } = parseThinking(message.content, message.thinking);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content || message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  // 1. User Message
  if (message.role === 'user') {
    const targetBadge = () => {
      switch (message.target) {
        case 'ai1':
          return (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-blue-950/60 text-blue-300 border border-blue-800/40">
              <ArrowLeft className="w-3 h-3" />
              <span>To AI 1 Only</span>
            </span>
          );
        case 'ai2':
          return (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-pink-950/60 text-pink-300 border border-pink-800/40">
              <ArrowRight className="w-3 h-3" />
              <span>To AI 2 Only</span>
            </span>
          );
        case 'both':
        default:
          return (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-purple-950/60 text-purple-300 border border-purple-800/40">
              <ArrowUp className="w-3 h-3" />
              <span>To Both AIs</span>
            </span>
          );
      }
    };

    return (
      <div className="flex flex-col items-center w-full max-w-2xl mx-auto py-2.5 px-2 select-text">
        <div className="flex items-center gap-2 mb-1.5">
          {targetBadge()}
          <span className="text-[11px] text-neutral-400 font-mono">You</span>
        </div>
        <div className="bg-[#181822] text-neutral-200 border border-[#2B2B38] rounded-2xl px-4 py-2.5 shadow-sm text-xs sm:text-sm leading-relaxed max-w-full">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content || message.userPrompt || ''}
          </ReactMarkdown>
        </div>
      </div>
    );
  }

  // 2. AI 1 (Left / Blue) or AI 2 (Right / Pink)
  const isAI1 = message.role === 'ai1';
  const theme = isAI1 ? {
    align: 'items-start',
    bubbleCorner: 'rounded-2xl rounded-tl-sm',
    accentText: 'text-blue-400',
    border: 'border-blue-500/30 hover:border-blue-500/50',
    bg: 'bg-[#0C1220]',
    headerBg: 'bg-[#10182A]',
    headerBorder: 'border-blue-900/30',
    badgeBg: 'bg-blue-950/70 text-blue-300 border-blue-800/50',
    label: message.senderName || 'AI 1',
    dotColor: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.7)]',
    preStyle: '[&>pre]:bg-[#070B14] [&>pre]:border-blue-900/30'
  } : {
    align: 'items-end',
    bubbleCorner: 'rounded-2xl rounded-tr-sm',
    accentText: 'text-pink-400',
    border: 'border-pink-500/30 hover:border-pink-500/50',
    bg: 'bg-[#180D1A]',
    headerBg: 'bg-[#201124]',
    headerBorder: 'border-pink-900/30',
    badgeBg: 'bg-pink-950/70 text-pink-300 border-pink-800/50',
    label: message.senderName || 'AI 2',
    dotColor: 'bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.7)]',
    preStyle: '[&>pre]:bg-[#120713] [&>pre]:border-pink-900/30'
  };

  return (
    <div className={`flex flex-col ${theme.align} w-full my-1.5 select-text`}>
      <div className={`max-w-[88%] sm:max-w-[80%] md:max-w-[72%] ${theme.bubbleCorner} border ${theme.border} ${theme.bg} overflow-hidden shadow-md transition-all`}>
        {/* Messenger Message Header */}
        <div className={`flex items-center justify-between gap-3 px-3.5 py-2 border-b ${theme.headerBorder} ${theme.headerBg}`}>
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-2 h-2 rounded-full ${theme.dotColor} shrink-0`} />
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${theme.badgeBg} shrink-0`}>
              {theme.label}
            </span>
            {message.modelName && (
              <span className="text-xs text-neutral-300 font-medium truncate max-w-[130px] sm:max-w-[200px]">
                {message.modelName}
              </span>
            )}
            {message.providerName && (
              <span className="text-[10px] text-neutral-500 font-mono hidden sm:inline">
                ({message.providerName})
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {message.metrics?.ttftMs && (
              <div 
                className="flex items-center gap-1 text-[10px] font-mono text-neutral-400 bg-black/40 px-1.5 py-0.5 rounded-md border border-white/5"
                title={`Time to First Token: ${message.metrics.ttftMs}ms`}
              >
                <Zap className={`w-3 h-3 ${theme.accentText}`} />
                <span>{message.metrics.ttftMs}ms</span>
              </div>
            )}

            {message.metrics?.totalDurationMs && !message.isStreaming && (
              <div 
                className="flex items-center gap-1 text-[10px] font-mono text-neutral-400 bg-black/40 px-1.5 py-0.5 rounded-md border border-white/5 hidden sm:flex"
                title={`Total duration: ${(message.metrics.totalDurationMs / 1000).toFixed(2)}s`}
              >
                <Clock className="w-3 h-3 text-neutral-500" />
                <span>{(message.metrics.totalDurationMs / 1000).toFixed(1)}s</span>
              </div>
            )}

            {content && (
              <button
                type="button"
                onClick={handleCopy}
                className="p-1 text-neutral-400 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer"
                title="Copy message"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Messenger Message Body */}
        <div className="p-3.5 sm:p-4 text-xs sm:text-[13.5px] text-neutral-100 leading-relaxed space-y-2.5">
          {/* Error Banner */}
          {message.error && (
            <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-900/40 text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <div className="font-semibold text-red-400">Response Error</div>
                <div className="mt-0.5 text-neutral-300">{message.error}</div>
              </div>
            </div>
          )}

          {/* Thinking Block */}
          {thinking && (
            <ThinkingBlock thinking={thinking} isThinking={Boolean(message.isStreaming && isThinking)} />
          )}

          {/* Content */}
          {content ? (
            <div className={`prose prose-invert prose-xs sm:prose-sm max-w-none break-words [&>p]:leading-relaxed [&>pre]:my-2 [&>pre]:border [&>pre]:rounded-xl ${theme.preStyle}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
              {message.isStreaming && (
                <span className="inline-block w-1.5 h-3.5 ml-1 bg-current animate-pulse align-middle" />
              )}
            </div>
          ) : message.isStreaming ? (
            <div className="flex items-center gap-2 text-xs text-neutral-400 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
              <span>Generating response...</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
