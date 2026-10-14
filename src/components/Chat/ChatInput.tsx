import React, { useState, useRef, useEffect } from 'react';
import type { KeyboardEvent } from 'react';
import { Plus, Mic, MicOff, ArrowUp, Zap, ChevronDown, Paperclip, Image as ImageIcon, X, Bot } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import type { MessageAttachment } from '../../types/chat';

interface ChatInputProps {
  onSend?: (text: string, attachments?: MessageAttachment[]) => void;
  compact?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, compact = false }) => {
  const [text, setText] = useState('');
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);

  const textPrefixRef = useRef('');

  // Close attachment dropdown when clicking outside
  useEffect(() => {
    if (!isAttachmentOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(e.target as Node)) {
        setIsAttachmentOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAttachmentOpen]);

  const {
    apiKey,
    selectedModel,
    selectedProvider,
    isGenerating,
    isAgentMode,
    setAgentMode,
    stopGeneration,
    setApiKeyModalOpen,
    setModelSelectorOpen,
    showNotification
  } = useAppStore();

  const { isListening, toggleListening, stopListening } = useVoiceInput({
    onTranscript: (transcript, isFinal) => {
      if (isFinal) {
        textPrefixRef.current = `${textPrefixRef.current}${transcript} `;
        setText(textPrefixRef.current.trim());
      } else {
        setText(`${textPrefixRef.current}${transcript}`);
      }
    },
    onError: (err) => {
      showNotification(err);
    }
  });

  const handleMicClick = () => {
    if (!isListening) {
      textPrefixRef.current = text ? `${text.trim()} ` : '';
    }
    toggleListening();
  };

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [text]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (isListening) {
      stopListening();
    }

    if (isGenerating) {
      stopGeneration();
      return;
    }

    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;

    if (!apiKey) {
      showNotification('Please add an API key first to start experimenting.');
      setApiKeyModalOpen(true);
      return;
    }

    if (onSend) {
      onSend(trimmed, attachments);
    }
    
    setText('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Check vision support if image
    if (type === 'image' && selectedProvider && !selectedProvider.supportsVision) {
      showNotification('The selected provider/model does not currently support image input.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const newAttachment: MessageAttachment = {
        type,
        name: file.name,
        url: reader.result as string,
        mimeType: file.type,
        size: file.size,
      };
      setAttachments((prev) => [...prev, newAttachment]);
      setIsAttachmentOpen(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const hasText = text.trim().length > 0 || attachments.length > 0;
  const isMultiLine = text.includes('\n') || text.length > 80;

  return (
    <div className={`w-full max-w-[800px] mx-auto transition-all duration-300 ${compact ? 'px-2' : 'px-3 sm:px-4'}`}>
      <div 
        className={`relative bg-[#101013] border border-[#232328] hover:border-[#2D2D34] focus-within:border-[#383842] focus-within:ring-1 focus-within:ring-white/5 transition-all duration-200 shadow-2xl shadow-black/60 ${
          isMultiLine || attachments.length > 0 || isListening
            ? 'rounded-2xl py-2.5 px-3 sm:px-4'
            : 'rounded-full py-1.5 px-2.5 sm:px-3.5'
        }`}
      >
        {/* Top attachment previews if any */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 pb-2 border-b border-[#1C1C20]">
            {attachments.map((att, idx) => (
              <div 
                key={idx} 
                className="relative group flex items-center gap-2 bg-[#17171B] border border-[#26262B] rounded-lg px-2.5 py-1 text-xs text-neutral-300"
              >
                {att.type === 'image' ? (
                  <img src={att.url} alt={att.name} className="w-4 h-4 rounded object-cover" />
                ) : (
                  <Paperclip className="w-3.5 h-3.5 text-neutral-400" />
                )}
                <span className="max-w-[140px] truncate">{att.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  className="text-neutral-500 hover:text-neutral-200 ml-1 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Voice listening status indicator if active */}
        {isListening && (
          <div className="flex items-center gap-2 mb-2 py-1 px-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-ping shrink-0" />
            <span className="font-medium">Listening... speak into your microphone (click mic to finish)</span>
          </div>
        )}

        {/* Unified Pill Row: Plus Button + Input Textarea + Mic + Model + Send */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Left: Attachment + Button */}
          <div ref={attachmentMenuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setIsAttachmentOpen(!isAttachmentOpen)}
              className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors cursor-pointer ${
                isAttachmentOpen 
                  ? 'text-white bg-white/10' 
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
              }`}
              title="Add attachment or toggle agent mode"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Hidden native file inputs */}
            <input 
              ref={imageInputRef} 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={(e) => handleFileUpload(e, 'image')} 
            />
            <input 
              ref={fileInputRef} 
              type="file" 
              accept=".txt,.md,.json,.pdf,.csv,.py,.js,.ts" 
              className="hidden" 
              onChange={(e) => handleFileUpload(e, 'file')} 
            />

            {/* Attachment dropdown popover */}
            {isAttachmentOpen && (
              <div 
                className="absolute bottom-full left-0 mb-2 w-52 bg-[#18181B] border border-[#2A2A2E] rounded-xl shadow-2xl py-1.5 z-50 backdrop-blur-md animate-fade-in"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    imageInputRef.current?.click();
                    setIsAttachmentOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-300 hover:text-white hover:bg-white/5 transition-colors text-left cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Upload Image</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setIsAttachmentOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-300 hover:text-white hover:bg-white/5 transition-colors text-left cursor-pointer"
                >
                  <Paperclip className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Upload File</span>
                </button>
                <div className="h-px bg-[#26262B] my-1" />
                <button
                  type="button"
                  onClick={() => {
                    const next = !isAgentMode;
                    setAgentMode(next);
                    showNotification(next ? '🤖 Agent Mode enabled' : '💬 Direct Mode enabled');
                    setIsAttachmentOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs text-neutral-300 hover:text-white hover:bg-white/5 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Bot className={`w-3.5 h-3.5 ${isAgentMode ? 'text-emerald-400' : 'text-neutral-400'}`} />
                    <span>Agent Mode</span>
                  </div>
                  <span className={`w-1.5 h-1.5 rounded-full ${isAgentMode ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-600'}`} />
                </button>
              </div>
            )}
          </div>

          {/* Center: Input Text Area */}
          <div className="flex-1 flex items-center min-w-0">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "Listening... speak now" : "How can I help you today?"}
              rows={1}
              className="w-full bg-transparent text-[#EDEDED] placeholder-[#5A5A64] text-xs sm:text-sm md:text-base resize-none outline-none leading-relaxed py-1 px-1 max-h-[180px]"
              style={{ scrollbarWidth: 'none' }}
            />
          </div>

          {/* Right Controls: Microphone, Model Dropdown Pill, and Submit Button */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Microphone Button */}
            <button
              type="button"
              onClick={handleMicClick}
              className={`flex items-center justify-center w-8 h-8 rounded-full transition-all cursor-pointer ${
                isListening
                  ? 'text-red-400 bg-red-500/20 ring-1 ring-red-500/50 hover:bg-red-500/30 animate-pulse'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
              }`}
              title={isListening ? "Listening... Click to stop" : "Voice Input (Speech-to-Text)"}
            >
              {isListening ? <MicOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>

            {/* Model Indicator & Dropdown Pill */}
            <button
              type="button"
              onClick={() => {
                if (!apiKey) {
                  setApiKeyModalOpen(true);
                } else {
                  setModelSelectorOpen(true);
                }
              }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-[#16161A] hover:bg-[#1E1E24] border border-[#25252B] hover:border-[#35353D] rounded-full text-xs font-medium text-neutral-300 hover:text-white transition-all cursor-pointer max-w-[120px] sm:max-w-[200px]"
              title={selectedModel ? `Model: ${selectedModel.name || selectedModel.id}` : 'Select Model'}
            >
              <Zap className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="truncate">
                {selectedModel ? selectedModel.name || selectedModel.id : 'No Model'}
              </span>
              <ChevronDown className="w-3 h-3 text-neutral-500 shrink-0" />
            </button>

            {/* Send / Stop Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!hasText && !isGenerating}
              className={`flex items-center justify-center w-8 h-8 rounded-full transition-all cursor-pointer ${
                isGenerating
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 ring-1 ring-red-500/50'
                  : hasText
                    ? 'bg-neutral-100 text-black hover:bg-white shadow-md shadow-white/5 cursor-pointer'
                    : 'bg-[#18181C] text-neutral-600 border border-[#242429] cursor-not-allowed'
              }`}
              title={isGenerating ? 'Stop Generation' : 'Send message'}
            >
              {isGenerating ? (
                <span className="w-2.5 h-2.5 rounded-xs bg-red-400" />
              ) : (
                <ArrowUp className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
