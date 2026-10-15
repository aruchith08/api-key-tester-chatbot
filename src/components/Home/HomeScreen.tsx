import React from 'react';
import { ARHLogo } from './ARHLogo';
import { Greeting } from './Greeting';
import { ChatInput } from '../Chat/ChatInput';
import { ChatModeToggle } from '../Navigation/ChatModeToggle';
import { Atom, KeyRound, Terminal, Info, Database } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import type { MessageAttachment } from '../../types/chat';

interface HomeScreenProps {
  onSendMessage?: (text: string, attachments?: MessageAttachment[]) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSendMessage }) => {
  const { 
    setApiKeyModalOpen, 
    setKeyVaultOpen,
    storedKeys,
    setDeveloperModeOpen,
    setAboutModalOpen,
    apiKey, 
    selectedProvider,
    activeChatTab,
    setActiveChatTab,
    showNotification
  } = useAppStore();

  const isConnected = Boolean(apiKey);

  return (
    <div className="relative min-h-screen w-full bg-[#08080A] flex flex-col justify-between p-4 sm:p-6 md:p-8 overflow-hidden select-none">
      {/* Background ambient lighting - soft vignette glow */}
      <div 
        className="pointer-events-none absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[550px] bg-gradient-to-b from-white/[0.018] via-white/[0.006] to-transparent rounded-full blur-3xl" 
        aria-hidden="true"
      />

      {/* Top Header Bar */}
      <header className="relative z-50 pointer-events-auto grid grid-cols-[1fr_auto_1fr] items-center w-full max-w-7xl mx-auto gap-2">
        {/* Top-Left: ARH Logo & Subtitle */}
        <div className="justify-self-start flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div 
            className="flex items-center cursor-pointer transition-opacity hover:opacity-90"
            onClick={() => window.location.reload()}
            title="ARH"
          >
            <ARHLogo size="xs" />
          </div>
          <div className="h-4 w-px bg-neutral-800" aria-hidden="true" />
          <span className="text-xs sm:text-sm text-neutral-400 font-normal tracking-wide hidden xs:inline">
            AI API Testing Ground
          </span>
        </div>

        {/* Top-Center: Segmented Pill Switcher [ Chat | Dual ] (Centered in page) */}
        <div className="justify-self-center">
          <ChatModeToggle />
        </div>

        {/* Top-Right: Add API Key, Stored Keys & About Actions */}
        <div className="justify-self-end flex items-center gap-2 shrink-0">
          {/* Add API Key / Connected Provider */}
          <button
            type="button"
            onClick={() => setApiKeyModalOpen(true)}
            className="group flex items-center gap-2 px-3 h-9 bg-[#101013] hover:bg-[#18181D] text-neutral-200 hover:text-white border border-[#232328] hover:border-[#35353C] rounded-xl text-xs font-medium shadow-sm transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap"
            title={isConnected ? `Connected: ${selectedProvider?.name || 'API Key Connected'}` : 'Connect API Key'}
          >
            <KeyRound className="w-3.5 h-3.5 text-neutral-400 group-hover:text-emerald-400 transition-colors shrink-0" />
            <span className="whitespace-nowrap">
              {isConnected ? (selectedProvider?.name || 'Connected') : 'Add API Key'}
            </span>
            {isConnected && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5 shrink-0" />
            )}
          </button>

          {/* Stored Keys */}
          <button
            type="button"
            onClick={() => setKeyVaultOpen(true)}
            className="group flex items-center gap-2 px-3 h-9 bg-[#101013] hover:bg-[#18181D] text-neutral-200 hover:text-white border border-[#232328] hover:border-[#35353C] rounded-xl text-xs font-medium shadow-sm transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap"
            title="Open Stored API Keys Vault"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="whitespace-nowrap">Stored Keys</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-neutral-800 text-neutral-300 group-hover:text-white border border-neutral-700 shrink-0">
              {storedKeys.length}
            </span>
          </button>

          {/* About */}
          <button
            type="button"
            onClick={() => setAboutModalOpen(true)}
            className="flex items-center gap-1.5 px-3 h-9 bg-[#101013] hover:bg-[#18181D] text-neutral-200 hover:text-white border border-[#232328] hover:border-[#35353C] rounded-xl text-xs font-medium shadow-sm transition-all cursor-pointer shrink-0 whitespace-nowrap"
            title="About ARH Application"
          >
            <Info className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <span className="whitespace-nowrap">About</span>
          </button>

          {/* Dev Mode (Inspector) */}
          {isConnected && (
            <button
              type="button"
              onClick={() => setDeveloperModeOpen(true)}
              className="flex items-center gap-1.5 px-2.5 h-9 bg-[#121215] hover:bg-[#1A1A1E] text-neutral-400 hover:text-neutral-200 border border-[#222226] hover:border-[#303036] rounded-xl text-xs font-medium transition-all cursor-pointer shrink-0 whitespace-nowrap"
              title="Open Developer Inspector"
            >
              <Terminal className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span className="whitespace-nowrap">Dev Mode</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Centered Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-3xl mx-auto px-2 pointer-events-auto">
        <div className="w-full flex flex-col items-center -translate-y-8 sm:-translate-y-12 md:-translate-y-16">
          {/* ARH Metallic Logo Badge */}
          <div className="mb-4 sm:mb-5 animate-fade-in">
            <ARHLogo size="md" />
          </div>

          {/* Dynamic Editorial Greeting */}
          <div className="mb-6 sm:mb-7 text-center px-4">
            <Greeting />
          </div>

          {/* Centered Chat Input Card */}
          <div className="w-full">
            <ChatInput onSend={onSendMessage} />
          </div>
        </div>
      </main>

      {/* Footer Minimal Indicator */}
      <footer className="relative z-10 text-center py-3 text-xs select-none">
        <button
          type="button"
          onClick={() => setAboutModalOpen(true)}
          className="inline-flex items-center gap-2 text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer text-xs"
          title="About ARH"
        >
          <span className="font-medium tracking-wide">ARH</span>
          <span className="text-neutral-700">·</span>
          <span>AI API Testing Ground</span>
          <span className="text-neutral-700">·</span>
          <span className="underline underline-offset-2">About</span>
        </button>
      </footer>
    </div>
  );
};
