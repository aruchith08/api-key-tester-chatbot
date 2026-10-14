import React from 'react';
import { ARHLogo } from './ARHLogo';
import { Greeting } from './Greeting';
import { ChatInput } from '../Chat/ChatInput';
import { KeyRound, Sparkles, Terminal, Info, Database } from 'lucide-react';
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
    selectedModel 
  } = useAppStore();

  const isConnected = Boolean(apiKey);

  return (
    <div className="relative min-h-screen w-full bg-[#09090A] flex flex-col justify-between p-4 sm:p-6 md:p-8 overflow-hidden select-none">
      {/* Background ambient lighting - extremely subtle, premium */}
      <div 
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-b from-white/[0.015] to-transparent rounded-full blur-3xl" 
        aria-hidden="true"
      />

      {/* Top Header Bar */}
      <header className="relative z-10 flex items-center justify-between w-full max-w-7xl mx-auto">
        {/* Top-Left: Add API Key & Stored Keys Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setApiKeyModalOpen(true)}
            className="group flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 bg-[#141416] hover:bg-[#1A1A1E] text-neutral-300 hover:text-white border border-[#252529] hover:border-[#35353C] rounded-xl text-xs sm:text-sm font-medium shadow-sm shadow-black/30 transition-all duration-200"
          >
            <KeyRound className="w-3.5 h-3.5 text-neutral-400 group-hover:text-emerald-400 transition-colors" />
            <span>{isConnected ? (selectedProvider?.name || 'API Key Connected') : 'Add API Key'}</span>
            {isConnected && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setKeyVaultOpen(true)}
            className="group flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-[#141416] hover:bg-[#1A1A1E] text-neutral-300 hover:text-white border border-[#252529] hover:border-[#35353C] rounded-xl text-xs sm:text-sm font-medium shadow-sm shadow-black/30 transition-all duration-200"
            title="Open Stored API Keys Vault"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden xs:inline sm:inline">Stored Keys</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-neutral-800 text-neutral-300 group-hover:text-white border border-neutral-700">
              {storedKeys.length}
            </span>
          </button>
        </div>

        {/* Top-Right: About & Developer Mode Triggers */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAboutModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#141416]/70 hover:bg-[#1A1A1E] text-neutral-400 hover:text-neutral-200 border border-[#222226] hover:border-[#303036] rounded-xl text-xs transition-all cursor-pointer"
            title="About ARH Application"
          >
            <Info className="w-3.5 h-3.5 text-neutral-400" />
            <span className="inline">About</span>
          </button>

          {isConnected && (
            <button
              type="button"
              onClick={() => setDeveloperModeOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#141416]/70 hover:bg-[#1A1A1E] text-neutral-400 hover:text-neutral-200 border border-[#222226] hover:border-[#303036] rounded-xl text-xs transition-all cursor-pointer"
              title="Open Developer Inspector"
            >
              <Terminal className="w-3.5 h-3.5 text-neutral-400" />
              <span className="hidden sm:inline">Dev Mode</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Centered Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center -mt-8 sm:-mt-12 w-full max-w-3xl mx-auto px-2">
        {/* ARH Metallic Logo */}
        <div className="mb-5 sm:mb-6 animate-fade-in">
          <ARHLogo size="md" />
        </div>

        {/* Dynamic Editorial Greeting */}
        <div className="mb-7 sm:mb-9 text-center px-4">
          <Greeting />
        </div>

        {/* Centered Chat Input Card */}
        <div className="w-full">
          <ChatInput onSend={onSendMessage} />
        </div>
      </main>

      {/* Footer Minimal Indicator */}
      <footer className="relative z-10 text-center py-2 text-xs select-none">
        <button
          type="button"
          onClick={() => setAboutModalOpen(true)}
          className="inline-flex items-center gap-1.5 text-neutral-600 hover:text-neutral-400 transition-colors cursor-pointer"
          title="About ARH"
        >
          <span className="tracking-widest uppercase font-mono text-[10px]">ARH</span>
          <span className="text-neutral-800">·</span>
          <span className="text-[11px]">AI API Testing Ground</span>
          <span className="text-neutral-800">·</span>
          <span className="text-[11px] underline underline-offset-2">About</span>
        </button>
      </footer>
    </div>
  );
};
