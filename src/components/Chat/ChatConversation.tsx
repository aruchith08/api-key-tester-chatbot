import React, { useRef, useEffect, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatInput } from './ChatInput';
import { ARHLogo } from '../Home/ARHLogo';
import { ChatModeToggle } from '../Navigation/ChatModeToggle';
import { Atom, RotateCcw, Trash2, Terminal, Zap, ArrowDown, Info, Database } from 'lucide-react';
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
    clearChat,
    activeChatTab,
    setActiveChatTab,
    showNotification
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
      <header className="shrink-0 flex items-center justify-between px-3 sm:px-6 py-2.5 border-b border-[#1C1C20] bg-[#08080A]/95 backdrop-blur-md z-50 pointer-events-auto gap-2">
        {/* Left: Brand logo & Model pill */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={clearChat}
            className="flex items-center hover:opacity-90 transition-opacity cursor-pointer"
            title="Return to Home"
          >
            <ARHLogo size="xs" />
          </button>

          <div className="h-4 w-px bg-neutral-800 hidden md:block" />

          {/* Active Model pill */}
          <button
            type="button"
            onClick={() => setModelSelectorOpen(true)}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 bg-[#141416] hover:bg-[#1A1A1E] border border-[#242428] rounded-xl text-xs text-neutral-300 transition-colors cursor-pointer"
          >
            <Zap className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="font-medium truncate max-w-[85px] xs:max-w-[120px] sm:max-w-[180px]">
              {selectedModel?.name || selectedModel?.id || 'No Model'}
            </span>
          </button>
        </div>

        {/* Center: Segmented Pill Switcher [ Chat | Dual ] */}
        <div className="hidden sm:block">
          <ChatModeToggle />
        </div>

        {/* Right Actions: Regenerate, Clear, Keys, About, Dev Mode */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Regenerate */}
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isGenerating || messages.length === 0}
            className="flex items-center justify-center w-8 h-8 sm:w-auto sm:px-2.5 py-1.5 text-xs text-neutral-400 hover:text-neutral-200 hover:bg-white/5 rounded-xl transition-colors disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
            title="Regenerate latest AI response"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden lg:inline ml-1.5">Regenerate</span>
          </button>

          {/* Clear Chat */}
          <button
            type="button"
            onClick={clearChat}
            className="flex items-center justify-center w-8 h-8 sm:w-auto sm:px-2.5 py-1.5 text-xs text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
            title="Clear temporary session"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden lg:inline ml-1.5">Clear</span>
          </button>

          {/* Stored Keys Vault */}
          <button
            type="button"
            onClick={() => setKeyVaultOpen(true)}
            className="group relative flex items-center justify-center w-8 h-8 sm:w-auto sm:px-2.5 h-9 bg-[#141416] hover:bg-[#1C1C20] border border-[#25252A] rounded-xl text-xs text-neutral-300 transition-colors cursor-pointer shrink-0"
            title="Switch or manage stored API keys"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap ml-1.5">Keys</span>
            {/* Desktop badge */}
            <span className="hidden sm:inline-flex ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-neutral-800 text-neutral-300 border border-neutral-700 shrink-0">
              {storedKeys.length}
            </span>
            {/* Mobile badge */}
            {storedKeys.length > 0 && (
              <span className="sm:hidden absolute -top-1 -right-1 min-w-[16px] h-[16px] px-0.5 rounded-full text-[9px] font-bold bg-[#1C1C22] text-neutral-300 border border-[#3A3A45] flex items-center justify-center shadow-md">
                {storedKeys.length}
              </span>
            )}
          </button>

          {/* About */}
          <button
            type="button"
            onClick={() => setAboutModalOpen(true)}
            className="flex items-center justify-center w-8 h-8 sm:w-auto sm:px-2.5 h-9 bg-[#141416] hover:bg-[#1C1C20] border border-[#25252A] rounded-xl text-xs text-neutral-300 transition-colors cursor-pointer shrink-0"
            title="About ARH"
          >
            <Info className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap ml-1.5">About</span>
          </button>

          {/* Dev Mode */}
          <button
            type="button"
            onClick={() => setDeveloperModeOpen(true)}
            className="flex items-center justify-center w-8 h-8 sm:w-auto sm:px-2.5 h-9 bg-[#141416] hover:bg-[#1C1C20] border border-[#25252A] rounded-xl text-xs text-neutral-300 transition-colors cursor-pointer shrink-0"
            title="Developer Mode"
          >
            <Terminal className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <span className="hidden md:inline whitespace-nowrap ml-1.5">Dev Mode</span>
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
