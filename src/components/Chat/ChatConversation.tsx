import React, { useRef, useEffect, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatInput } from './ChatInput';
import { ARHLogo } from '../Home/ARHLogo';
import { RotateCcw, Trash2, Terminal, Zap, ArrowDown, Info, Database } from 'lucide-react';
import type { MessageAttachment } from '../../types/chat';

interface ChatConversationProps {
  onSendMessage: (text: string, attachments?: MessageAttachment[]) => void;
  onRegenerate: () => void;
}

export const ChatConversation: React.FC<ChatConversationProps> = ({
  onSendMessage,
  onRegenerate,
}) => {
  const {
    messages,
    isGenerating,
    selectedModel,
    selectedProvider,
    setModelSelectorOpen,
    setDeveloperModeOpen,
    setAboutModalOpen,
    setKeyVaultOpen,
    storedKeys,
    clearChat
  } = useAppStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLElement>(null);
  const prevMessagesCountRef = useRef(messages.length);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    // User is considered scrolled up if more than 120px from bottom
    const scrolledUp = scrollHeight - scrollTop - clientHeight > 120;
    setIsUserScrolledUp(scrolledUp);
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    setIsUserScrolledUp(false);
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    const isNewUserMessage =
      messages.length > prevMessagesCountRef.current &&
      messages[messages.length - 1]?.role === 'user';

    if (isNewUserMessage) {
      scrollToBottom('smooth');
    } else if (!isUserScrolledUp) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }

    prevMessagesCountRef.current = messages.length;
  }, [messages, isGenerating, isUserScrolledUp]);

  return (
    <div className="flex flex-col h-screen w-full bg-[#09090A] text-[#EDEDED] select-none overflow-hidden">
      {/* Top Conversation Header */}
      <header className="shrink-0 flex items-center justify-between px-4 sm:px-8 py-3 border-b border-[#1C1C1F] bg-[#09090A]/90 backdrop-blur-md z-20">
        {/* Left: Brand logo & Active Model */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={clearChat}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            title="Return to Home"
          >
            <ARHLogo size="sm" className="w-16" />
          </button>

          <div className="h-4 w-px bg-neutral-800 hidden sm:block" />

          {/* Model pill */}
          <button
            type="button"
            onClick={() => setModelSelectorOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#141416] hover:bg-[#1A1A1E] border border-[#242428] rounded-xl text-xs text-neutral-300 transition-colors"
          >
            <Zap className="w-3 h-3 text-emerald-400" />
            <span className="font-medium truncate max-w-[140px] sm:max-w-[200px]">
              {selectedModel?.name || selectedModel?.id || 'No Model'}
            </span>
          </button>
        </div>

        {/* Right Actions: Clear Chat, Regenerate, Dev Mode */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Regenerate */}
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isGenerating || messages.length === 0}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-neutral-400 hover:text-neutral-200 hover:bg-white/5 rounded-xl transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
            title="Regenerate latest AI response"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Regenerate</span>
          </button>

          {/* Clear Chat */}
          <button
            type="button"
            onClick={clearChat}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
            title="Clear temporary session"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>

          {/* Stored Keys Vault */}
          <button
            type="button"
            onClick={() => setKeyVaultOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#141416] hover:bg-[#1C1C20] border border-[#25252A] rounded-xl text-xs text-neutral-300 transition-colors"
            title="Switch or manage stored API keys"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Keys</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-neutral-800 text-neutral-300 border border-neutral-700">
              {storedKeys.length}
            </span>
          </button>

          {/* About */}
          <button
            type="button"
            onClick={() => setAboutModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#141416] hover:bg-[#1C1C20] border border-[#25252A] rounded-xl text-xs text-neutral-300 transition-colors cursor-pointer"
            title="About ARH"
          >
            <Info className="w-3.5 h-3.5 text-neutral-400" />
            <span className="hidden sm:inline">About</span>
          </button>

          {/* Dev Mode */}
          <button
            type="button"
            onClick={() => setDeveloperModeOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#141416] hover:bg-[#1C1C20] border border-[#25252A] rounded-xl text-xs text-neutral-300 transition-colors"
            title="Developer Mode"
          >
            <Terminal className="w-3.5 h-3.5 text-neutral-400" />
            <span className="hidden sm:inline">Dev Mode</span>
          </button>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <main
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 select-text relative"
        style={{ scrollbarWidth: 'thin' }}
      >
        <div className="flex flex-col gap-2 pb-6">
          {messages.map((msg, index) => (
            <ChatMessageItem
              key={msg.id}
              message={msg}
              onRegenerate={onRegenerate}
              isLatest={index === messages.length - 1}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Floating Jump to Latest Button */}
        {isUserScrolledUp && (
          <button
            type="button"
            onClick={() => scrollToBottom('smooth')}
            className="sticky bottom-4 left-1/2 -translate-x-1/2 mx-auto z-20 flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1A1A1E]/95 hover:bg-[#25252B] border border-[#2D2D35] rounded-full text-xs text-neutral-200 shadow-xl backdrop-blur-md transition-all cursor-pointer hover:border-neutral-500"
          >
            <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
            <span>Jump to latest</span>
          </button>
        )}
      </main>

      {/* Bottom Sticky Input Container */}
      <footer className="shrink-0 pb-4 sm:pb-6 pt-2 bg-gradient-to-t from-[#09090A] via-[#09090A]/95 to-transparent z-10">
        <ChatInput onSend={onSendMessage} compact={true} />
      </footer>
    </div>
  );
};
