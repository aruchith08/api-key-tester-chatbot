import React, { useRef } from 'react';
import { useAppStore } from '../../store/appStore';

interface ChatModeToggleProps {
  className?: string;
}

export const ChatModeToggle: React.FC<ChatModeToggleProps> = ({ className = '' }) => {
  const { activeChatTab, setActiveChatTab } = useAppStore();
  const chatButtonRef = useRef<HTMLButtonElement>(null);
  const dualButtonRef = useRef<HTMLButtonElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, current: 'chat' | 'dual') => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const nextTab = current === 'chat' ? 'dual' : 'chat';
      setActiveChatTab(nextTab);
      if (nextTab === 'chat') {
        chatButtonRef.current?.focus();
      } else {
        dualButtonRef.current?.focus();
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveChatTab('chat');
      chatButtonRef.current?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveChatTab('dual');
      dualButtonRef.current?.focus();
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Chat Mode"
      className={`inline-flex items-center p-1 rounded-full bg-[#101013] border border-[#24242A] shadow-inner select-none ${className}`}
    >
      {/* Single Chat Option */}
      <button
        ref={chatButtonRef}
        type="button"
        role="tab"
        id="tab-single-chat"
        aria-selected={activeChatTab === 'chat'}
        aria-controls="chat-content-panel"
        tabIndex={activeChatTab === 'chat' ? 0 : -1}
        onClick={() => setActiveChatTab('chat')}
        onKeyDown={(e) => handleKeyDown(e, 'chat')}
        className={`w-16 xs:w-20 sm:w-24 py-1 sm:py-1.5 text-center text-xs sm:text-sm tracking-wide rounded-full transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 focus-visible:ring-offset-1 focus-visible:ring-offset-[#101013] ${
          activeChatTab === 'chat'
            ? 'bg-[#1E1E24] text-white border border-[#32323A] shadow-sm font-medium'
            : 'text-neutral-400 hover:text-neutral-200 border border-transparent font-normal'
        }`}
      >
        Chat
      </button>

      {/* Dual Chat Option */}
      <button
        ref={dualButtonRef}
        type="button"
        role="tab"
        id="tab-dual-chat"
        aria-selected={activeChatTab === 'dual'}
        aria-controls="chat-content-panel"
        tabIndex={activeChatTab === 'dual' ? 0 : -1}
        onClick={() => setActiveChatTab('dual')}
        onKeyDown={(e) => handleKeyDown(e, 'dual')}
        className={`w-16 xs:w-20 sm:w-24 py-1 sm:py-1.5 text-center text-xs sm:text-sm tracking-wide rounded-full transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 focus-visible:ring-offset-1 focus-visible:ring-offset-[#101013] ${
          activeChatTab === 'dual'
            ? 'bg-[#1E1E24] text-white border border-[#32323A] shadow-sm font-medium'
            : 'text-neutral-400 hover:text-neutral-200 border border-transparent font-normal'
        }`}
      >
        Dual
      </button>
    </div>
  );
};
