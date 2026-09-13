import React, { useState, useEffect } from 'react';
import { Brain, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';

interface ThinkingBlockProps {
  thinking: string;
  isThinking?: boolean;
  isStreaming?: boolean;
}

export const ThinkingBlock: React.FC<ThinkingBlockProps> = ({
  thinking,
  isThinking = false,
  isStreaming = false
}) => {
  const [isExpanded, setIsExpanded] = useState(isThinking && isStreaming);

  // Auto-expand when thinking starts streaming
  useEffect(() => {
    if (isThinking && isStreaming) {
      setIsExpanded(true);
    }
  }, [isThinking, isStreaming]);

  if (!thinking && !isThinking) return null;

  const wordCount = thinking.trim() ? thinking.trim().split(/\s+/).length : 0;
  const isActive = isThinking && isStreaming;

  return (
    <div className="w-full mb-3 rounded-xl border border-[#232328] bg-[#121215] overflow-hidden transition-all duration-200">
      {/* Header bar */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3.5 py-2 hover:bg-white/[0.02] text-left transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <Brain className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-neutral-400'}`} />
            {isActive && (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
            )}
          </div>
          <span className="text-xs font-medium text-neutral-300">
            {isActive ? 'Thinking...' : 'Thought Process'}
          </span>
          {!isActive && wordCount > 0 && (
            <span className="text-[11px] text-neutral-500 font-mono bg-neutral-800/60 px-1.5 py-0.5 rounded-md">
              {wordCount} words
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-neutral-500 hover:text-neutral-300 text-[11px]">
          <span>{isExpanded ? 'Hide' : 'Show'}</span>
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </div>
      </button>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="border-t border-[#1C1C21] px-4 py-3 bg-[#0E0E11]/80 max-h-80 overflow-y-auto font-mono text-xs text-neutral-400 leading-relaxed whitespace-pre-wrap selection:bg-neutral-800">
          {thinking}
          {isActive && (
            <span className="inline-block w-1.5 h-3.5 ml-1 bg-emerald-400 animate-pulse align-middle rounded-xs" />
          )}
        </div>
      )}
    </div>
  );
};
