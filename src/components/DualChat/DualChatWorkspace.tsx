import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { ARHLogo } from '../Home/ARHLogo';
import { ChatModeToggle } from '../Navigation/ChatModeToggle';
import { DualConfigBar } from './DualConfigBar';
import { DualMessageComparison } from './DualMessageComparison';
import { DualModelModal } from './DualModelModal';
import { ChatInput } from '../Chat/ChatInput';
import { useDualChat } from '../../hooks/useDualChat';
import { Atom, KeyRound, Database, Info, Terminal, Trash2, RotateCcw, Sparkles } from 'lucide-react';
import type { MessageAttachment } from '../../types/chat';

export const DualChatWorkspace: React.FC = () => {
  const {
    apiKey,
    selectedProvider,
    dualMessages,
    isDualGenerating,
    clearDualChat,
    setApiKeyModalOpen,
    setKeyVaultOpen,
    storedKeys,
    setAboutModalOpen,
    setDeveloperModeOpen
  } = useAppStore();

  const { sendMessage, regenerate, stopGeneration } = useDualChat();
  const [activeModalSlot, setActiveModalSlot] = useState<'A' | 'B' | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isConnected = Boolean(apiKey);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dualMessages, isDualGenerating]);

  const promptSuggestions = [
    {
      title: 'Compare Reasoning',
      prompt: 'Solve the Monty Hall problem step by step, explaining why switching doors is mathematically optimal.'
    },
    {
      title: 'Code Performance',
      prompt: 'Implement an LRU Cache in TypeScript with O(1) get and put operations, including unit tests.'
    },
    {
      title: 'System Architecture',
      prompt: 'Compare Event-Driven Architecture with CQRS: when to use each, key trade-offs, and failure modes.'
    }
  ];

  return (
    <div className="flex flex-col h-screen w-full bg-[#08080A] text-[#EDEDED] select-none overflow-hidden">
      {/* Top Header Bar */}
      <header className="shrink-0 grid grid-cols-[1fr_auto_1fr] items-center px-3 sm:px-6 py-2.5 border-b border-[#1C1C20] bg-[#08080A]/95 backdrop-blur-md z-20 gap-2">
        {/* Top-Left: ARH Logo & Mode tag */}
        <div className="justify-self-start flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div 
            className="flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-90"
            onClick={() => window.location.reload()}
            title="ARH Playground"
          >
            <Atom className="w-5 h-5 text-white stroke-[1.6]" />
            <span className="font-semibold tracking-wider text-sm sm:text-base text-neutral-100 hidden sm:inline">
              ARH
            </span>
          </div>

          <div className="h-4 w-px bg-neutral-800 hidden xs:block" />

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#141418] border border-[#24242A] text-xs text-neutral-300">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span className="font-medium hidden sm:inline">Dual AI Benchmark</span>
            <span className="font-medium sm:hidden">Dual</span>
          </div>
        </div>

        {/* Top-Center: Segmented Pill Switcher [ Chat | Dual ] */}
        <div className="justify-self-center">
          <ChatModeToggle />
        </div>

        {/* Top-Right: Actions */}
        <div className="justify-self-end flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Clear Dual Chat if messages exist */}
          {dualMessages.length > 0 && (
            <>
              <button
                type="button"
                onClick={regenerate}
                disabled={isDualGenerating}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-neutral-400 hover:text-neutral-200 hover:bg-white/5 rounded-xl transition-colors disabled:opacity-30 cursor-pointer"
                title="Regenerate dual responses"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Regenerate</span>
              </button>

              <button
                type="button"
                onClick={clearDualChat}
                disabled={isDualGenerating}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors disabled:opacity-30 cursor-pointer"
                title="Clear dual conversation"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Clear</span>
              </button>
            </>
          )}

          {/* Add API Key */}
          <button
            type="button"
            onClick={() => setApiKeyModalOpen(true)}
            className="group flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 bg-[#121215] hover:bg-[#1A1A1E] text-neutral-300 hover:text-white border border-[#242429] hover:border-[#35353C] rounded-xl text-xs sm:text-sm font-medium shadow-sm transition-all cursor-pointer"
            title="Connect API Key"
          >
            <KeyRound className="w-3.5 h-3.5 text-neutral-400 group-hover:text-emerald-400 transition-colors" />
            <span className="hidden md:inline">{isConnected ? (selectedProvider?.name || 'Connected') : 'Add Key'}</span>
            <span className="md:hidden">Key</span>
            {isConnected && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          {/* Stored Keys Vault */}
          <button
            type="button"
            onClick={() => setKeyVaultOpen(true)}
            className="group flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-[#121215] hover:bg-[#1A1A1E] text-neutral-300 hover:text-white border border-[#242429] hover:border-[#35353C] rounded-xl text-xs font-medium shadow-sm transition-all cursor-pointer"
            title="Stored API Keys Vault"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden lg:inline">Stored Keys</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-neutral-800 text-neutral-300 group-hover:text-white border border-neutral-700">
              {storedKeys.length}
            </span>
          </button>

          {/* About */}
          <button
            type="button"
            onClick={() => setAboutModalOpen(true)}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 bg-[#121215] hover:bg-[#1A1A1E] text-neutral-400 hover:text-neutral-200 border border-[#242429] rounded-xl text-xs transition-all cursor-pointer"
            title="About ARH"
          >
            <Info className="w-3.5 h-3.5 text-neutral-400" />
            <span className="hidden sm:inline">About</span>
          </button>

          {/* Dev Mode */}
          {isConnected && (
            <button
              type="button"
              onClick={() => setDeveloperModeOpen(true)}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 bg-[#121215] hover:bg-[#1A1A1E] text-neutral-400 hover:text-neutral-200 border border-[#222226] rounded-xl text-xs transition-all cursor-pointer"
              title="Open Developer Inspector"
            >
              <Terminal className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* Two AI Configuration Panels */}
      <div className="shrink-0 border-b border-[#1A1A20] bg-[#0A0A0D]">
        <DualConfigBar onOpenModelModal={(slot) => setActiveModalSlot(slot)} />
      </div>

      {/* Main Conversation & Comparison Body */}
      <main className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 space-y-4">
        {dualMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto px-4 text-center select-none py-12">
            <div className="w-12 h-12 rounded-2xl bg-[#141418] border border-[#24242C] flex items-center justify-center mb-4 shadow-lg text-emerald-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Dual AI Model Benchmark
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 mt-2 max-w-lg leading-relaxed">
              Prompt two AI models simultaneously to compare output quality, reasoning depth, latency, and code accuracy side-by-side.
            </p>

            {/* Prompt Starter Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full mt-8">
              {promptSuggestions.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => sendMessage(item.prompt)}
                  className="flex flex-col text-left p-3 rounded-xl bg-[#121216] hover:bg-[#1A1A20] border border-[#22222A] hover:border-neutral-600 transition-all cursor-pointer group"
                >
                  <span className="text-xs font-semibold text-neutral-200 group-hover:text-emerald-400 transition-colors">
                    {item.title}
                  </span>
                  <span className="text-[11px] text-neutral-400 mt-1 line-clamp-2">
                    {item.prompt}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 pb-6">
            {dualMessages.map((msg, idx) => (
              <DualMessageComparison
                key={msg.id}
                message={msg}
                isLatest={idx === dualMessages.length - 1}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Shared Bottom Input */}
      <footer className="shrink-0 p-3 sm:p-5 max-w-4xl w-full mx-auto">
        <ChatInput
          onSendMessage={(text, atts) => sendMessage(text, atts)}
          isGenerating={isDualGenerating}
          onStop={stopGeneration}
          placeholder="Send a prompt to benchmark Model A and Model B simultaneously..."
        />
      </footer>

      {/* Dual Model Selection Modal */}
      {activeModalSlot && (
        <DualModelModal
          slot={activeModalSlot}
          onClose={() => setActiveModalSlot(null)}
        />
      )}
    </div>
  );
};
