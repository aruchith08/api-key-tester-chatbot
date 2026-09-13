import React, { useState, useRef, useEffect } from 'react';
import type { KeyboardEvent } from 'react';
import { Plus, Mic, ArrowUp, Zap, ChevronDown, Paperclip, Image as ImageIcon, X } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
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

  const {
    apiKey,
    selectedModel,
    selectedProvider,
    isGenerating,
    stopGeneration,
    setApiKeyModalOpen,
    setModelSelectorOpen,
    showNotification
  } = useAppStore();

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [text]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
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
  const isConnected = Boolean(apiKey);

  return (
    <div className={`w-full max-w-[760px] mx-auto transition-all duration-300 ${compact ? 'px-4' : 'px-4 sm:px-6'}`}>
      <div 
        className={`relative bg-[#121214] border border-[#232326] hover:border-[#2C2C30] focus-within:border-[#38383E] focus-within:ring-1 focus-within:ring-white/5 rounded-2xl shadow-xl shadow-black/40 transition-all duration-200 overflow-hidden ${
          compact ? 'py-2.5 px-3.5' : 'py-3.5 px-4 sm:px-5'
        }`}
      >
        {/* Top attachment previews */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2.5 pb-2.5 border-b border-[#1C1C1F]">
            {attachments.map((att, idx) => (
              <div 
                key={idx} 
                className="relative group flex items-center gap-2 bg-[#1A1A1E] border border-[#26262B] rounded-lg px-2.5 py-1.5 text-xs text-neutral-300"
              >
                {att.type === 'image' ? (
                  <img src={att.url} alt={att.name} className="w-5 h-5 rounded object-cover" />
                ) : (
                  <Paperclip className="w-3.5 h-3.5 text-neutral-400" />
                )}
                <span className="max-w-[140px] truncate">{att.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  className="text-neutral-500 hover:text-neutral-200 ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Text Area Row */}
        <div className="flex items-start justify-between gap-3">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="How can I help you today?"
            rows={1}
            className="w-full bg-transparent text-[#EDEDED] placeholder-[#5A5A62] text-sm sm:text-base resize-none outline-none leading-relaxed min-h-[28px] max-h-[200px]"
            style={{ scrollbarWidth: 'none' }}
          />

          {/* Quick status pill / green indicator on top right */}
          <div className="flex items-center shrink-0 pt-0.5">
            <button
              type="button"
              onClick={() => setApiKeyModalOpen(true)}
              title={isConnected ? `Connected: ${selectedProvider?.name || 'Custom'}` : 'Connect API Key'}
              className={`flex items-center justify-center w-6 h-6 rounded-full transition-all ${
                isConnected 
                  ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 ring-1 ring-emerald-500/40' 
                  : 'bg-[#1C1C20] text-neutral-500 hover:text-neutral-300 hover:bg-[#25252A]'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'}`} />
            </button>
          </div>
        </div>

        {/* Bottom Controls Bar */}
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#1C1C1F]/60">
          {/* Left: Attachment + Button */}
          <div className="relative flex items-center">
            <button
              type="button"
              onClick={() => setIsAttachmentOpen(!isAttachmentOpen)}
              className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-white/5 rounded-lg transition-colors"
              title="Add attachment"
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
              accept=".txt,.md,.json,.pdf,.csv" 
              className="hidden" 
              onChange={(e) => handleFileUpload(e, 'file')} 
            />

            {/* Attachment dropdown popover */}
            {isAttachmentOpen && (
              <div 
                className="absolute bottom-full left-0 mb-2 w-44 bg-[#18181B] border border-[#2A2A2E] rounded-xl shadow-2xl py-1.5 z-20"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    imageInputRef.current?.click();
                    setIsAttachmentOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-300 hover:text-white hover:bg-white/5 transition-colors text-left"
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
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-300 hover:text-white hover:bg-white/5 transition-colors text-left"
                >
                  <Paperclip className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Upload File</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Controls: Mic + Model Indicator + Send */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Microphone with Tooltip */}
            <button
              type="button"
              onClick={() => showNotification('Voice input is ready for integration.')}
              className="p-1.5 text-neutral-500 hover:text-neutral-300 hover:bg-white/5 rounded-lg transition-colors"
              title="Voice Input"
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* Active Model Indicator */}
            <button
              type="button"
              onClick={() => {
                if (!apiKey) {
                  setApiKeyModalOpen(true);
                } else {
                  setModelSelectorOpen(true);
                }
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#18181C] hover:bg-[#202026] border border-[#26262B] rounded-lg text-xs text-neutral-300 transition-colors max-w-[160px] sm:max-w-[220px]"
              title={selectedModel ? `Model: ${selectedModel.name || selectedModel.id}` : 'Select Model'}
            >
              <Zap className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="truncate font-medium">
                {selectedModel ? selectedModel.name || selectedModel.id : 'No Model'}
              </span>
              <ChevronDown className="w-3 h-3 text-neutral-500 shrink-0" />
            </button>

            {/* Send Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!hasText && !isGenerating}
              className={`p-1.5 sm:p-2 rounded-full transition-all flex items-center justify-center ${
                isGenerating
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 ring-1 ring-red-500/50'
                  : hasText
                    ? 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-md shadow-emerald-950'
                    : 'bg-[#1C1C20] text-neutral-600 cursor-not-allowed'
              }`}
              title={isGenerating ? 'Stop Generation' : 'Send message'}
            >
              {isGenerating ? (
                <span className="w-3 h-3 rounded-xs bg-red-400" />
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
