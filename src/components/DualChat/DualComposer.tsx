import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ArrowUp, ArrowRight, Square } from 'lucide-react';
import type { MessageAttachment } from '../../types/chat';

interface DualComposerProps {
  onSendAI1: (text: string, attachments?: MessageAttachment[]) => void;
  onSendBoth: (text: string, attachments?: MessageAttachment[]) => void;
  onSendAI2: (text: string, attachments?: MessageAttachment[]) => void;
  onStop: () => void;
  isGenerating: boolean;
  disabled?: boolean;
}

export const DualComposer: React.FC<DualComposerProps> = ({
  onSendAI1,
  onSendBoth,
  onSendAI2,
  onStop,
  isGenerating,
  disabled = false
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [text]);

  const handleSendAI1 = () => {
    if (!text.trim() || isGenerating || disabled) return;
    onSendAI1(text);
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleSendBoth = () => {
    if (!text.trim() || isGenerating || disabled) return;
    onSendBoth(text);
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleSendAI2 = () => {
    if (!text.trim() || isGenerating || disabled) return;
    onSendAI2(text);
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendBoth();
    }
  };

  const canSend = text.trim().length > 0 && !isGenerating && !disabled;

  return (
    <div className="w-full bg-[#121216] border border-[#23232B] focus-within:border-neutral-500 rounded-2xl shadow-xl transition-all overflow-hidden">
      {/* Text Area */}
      <div className="px-4 pt-3.5 pb-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a prompt to send to AI 1 (Left), Both (Up), or AI 2 (Right)..."
          rows={1}
          disabled={disabled}
          className="w-full bg-transparent text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none resize-none max-h-44 leading-relaxed scrollbar-thin"
        />
      </div>

      {/* Action Footer with the Three Arrow Buttons */}
      <div className="flex items-center justify-between px-3 pb-2.5 pt-1 border-t border-[#1C1C22]">
        <div className="flex items-center gap-2 text-[11px] text-neutral-500">
          <span className="hidden sm:inline font-mono">Enter ↵ to send to both</span>
        </div>

        {/* Buttons Group */}
        <div className="flex items-center gap-2">
          {isGenerating ? (
            <button
              type="button"
              onClick={onStop}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg shadow-red-900/30 transition-all cursor-pointer animate-pulse"
              title="Stop active generation"
              aria-label="Stop active generation"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 bg-[#17171C] p-1 rounded-full border border-[#272730]">
              {/* 1. Left-pointing blue arrow: Send to AI 1 only */}
              <button
                type="button"
                onClick={handleSendAI1}
                disabled={!canSend}
                title="Send to AI 1 only (Left)"
                aria-label="Send to AI 1 only"
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  canSend
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-900/40 hover:scale-105 active:scale-95'
                    : 'bg-neutral-800/60 text-neutral-500 cursor-not-allowed opacity-50'
                }`}
              >
                <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
              </button>

              {/* 2. Upward-pointing purple arrow: Send to both AIs */}
              <button
                type="button"
                onClick={handleSendBoth}
                disabled={!canSend}
                title="Send to both AIs (Up)"
                aria-label="Send to both AIs"
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  canSend
                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-900/40 hover:scale-105 active:scale-95'
                    : 'bg-neutral-800/60 text-neutral-500 cursor-not-allowed opacity-50'
                }`}
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>

              {/* 3. Right-pointing pink arrow: Send to AI 2 only */}
              <button
                type="button"
                onClick={handleSendAI2}
                disabled={!canSend}
                title="Send to AI 2 only (Right)"
                aria-label="Send to AI 2 only"
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  canSend
                    ? 'bg-pink-600 hover:bg-pink-500 text-white shadow-md shadow-pink-900/40 hover:scale-105 active:scale-95'
                    : 'bg-neutral-800/60 text-neutral-500 cursor-not-allowed opacity-50'
                }`}
              >
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
