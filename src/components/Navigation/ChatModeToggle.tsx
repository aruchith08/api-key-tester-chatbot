import React, { useRef, useState, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';

interface ChatModeToggleProps {
  className?: string;
}

export const ChatModeToggle: React.FC<ChatModeToggleProps> = ({ className = '' }) => {
  const { activeChatTab, setActiveChatTab } = useAppStore();
  const [selectedTab, setSelectedTab] = useState<'chat' | 'dual'>(activeChatTab);
  const chatButtonRef = useRef<HTMLButtonElement>(null);
  const dualButtonRef = useRef<HTMLButtonElement>(null);
  const switchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize local sliding state if activeChatTab changes externally
  useEffect(() => {
    setSelectedTab(activeChatTab);
  }, [activeChatTab]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (switchTimeoutRef.current) {
        clearTimeout(switchTimeoutRef.current);
      }
    };
  }, []);

  const handleTabSelect = (tab: 'chat' | 'dual') => {
    if (selectedTab === tab && activeChatTab === tab) return;

    // 1. Immediately trigger the sliding capsule animation
    setSelectedTab(tab);

    // 2. Clear any pending timeout
    if (switchTimeoutRef.current) {
      clearTimeout(switchTimeoutRef.current);
    }

    // 3. Switch workspace view once capsule has started its smooth glide
    switchTimeoutRef.current = setTimeout(() => {
      setActiveChatTab(tab);
    }, 160);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, current: 'chat' | 'dual') => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const nextTab = current === 'chat' ? 'dual' : 'chat';
      handleTabSelect(nextTab);
      if (nextTab === 'chat') {
        chatButtonRef.current?.focus();
      } else {
        dualButtonRef.current?.focus();
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      handleTabSelect('chat');
      chatButtonRef.current?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      handleTabSelect('dual');
      dualButtonRef.current?.focus();
    }
  };

  const isChat = selectedTab === 'chat';

  return (
    <div
      role="tablist"
      aria-label="Chat Mode"
      className={`relative inline-flex items-center p-1 rounded-full bg-[#0D0D10] border border-[#23232A] shadow-inner select-none ${className}`}
    >
      {/* Animated Sliding Background Capsule Indicator */}
      <div
        aria-hidden="true"
        className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-[#1C1C23] border border-[#33333E] shadow-md shadow-black/40 transition-transform duration-250 ease-[cubic-bezier(0.25,1,0.5,1)] pointer-events-none will-change-transform ${
          isChat ? 'translate-x-0' : 'translate-x-full'
        }`}
      />

      {/* Single Chat Option */}
      <button
        ref={chatButtonRef}
        type="button"
        role="tab"
        id="tab-single-chat"
        aria-selected={isChat}
        aria-controls="chat-content-panel"
        tabIndex={isChat ? 0 : -1}
        onClick={() => handleTabSelect('chat')}
        onKeyDown={(e) => handleKeyDown(e, 'chat')}
        className={`relative z-10 w-20 xs:w-24 sm:w-28 py-1.5 sm:py-2 text-center text-xs sm:text-sm tracking-wide rounded-full transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0D0D10] ${
          isChat
            ? 'text-white font-medium'
            : 'text-neutral-400 hover:text-neutral-200 font-normal'
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
        aria-selected={!isChat}
        aria-controls="chat-content-panel"
        tabIndex={!isChat ? 0 : -1}
        onClick={() => handleTabSelect('dual')}
        onKeyDown={(e) => handleKeyDown(e, 'dual')}
        className={`relative z-10 w-20 xs:w-24 sm:w-28 py-1.5 sm:py-2 text-center text-xs sm:text-sm tracking-wide rounded-full transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0D0D10] ${
          !isChat
            ? 'text-white font-medium'
            : 'text-neutral-400 hover:text-neutral-200 font-normal'
        }`}
      >
        Dual
      </button>
    </div>
  );
};
