import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { ARHLogo } from '../Home/ARHLogo';
import { ChatModeToggle } from '../Navigation/ChatModeToggle';
import { DualPanelLeft } from './DualPanelLeft';
import { DualPanelRight } from './DualPanelRight';
import { DualComposer } from './DualComposer';
import { DualMessageItem } from './DualMessageItem';
import { DualAutoChatBar } from './DualAutoChatBar';
import { DualModelModal } from './DualModelModal';
import { useDualChat } from '../../hooks/useDualChat';
import { 
  KeyRound, 
  Database, 
  Info, 
  Terminal, 
  Trash2, 
  Sparkles, 
  PanelLeft, 
  PanelRight,
  ArrowLeft,
  ArrowRight,
  ArrowUp
} from 'lucide-react';

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
    setDeveloperModeOpen,
    dualProviderA,
    dualModelA,
    dualProviderB,
    dualModelB
  } = useAppStore();

  const {
    sendToAI1,
    sendToAI2,
    sendToBoth,
    startAutoConversation,
    pauseAutoConversation,
    resumeAutoConversation,
    stopAutoConversation,
    stopGeneration
  } = useDualChat();

  const [activeModalSlot, setActiveModalSlot] = useState<'A' | 'B' | null>(null);
  const [showLeftMobile, setShowLeftMobile] = useState(false);
  const [showRightMobile, setShowRightMobile] = useState(false);
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
      {/* 1. Universal Top Header Bar */}
      <header className="shrink-0 grid grid-cols-[1fr_auto_1fr] items-center px-3 sm:px-6 py-2.5 border-b border-[#1C1C20] bg-[#08080A]/95 backdrop-blur-md z-20 gap-2">
        {/* Top-Left: ARH Logo & Subtitle */}
        <div className="justify-self-start flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div 
            className="flex items-center cursor-pointer transition-opacity hover:opacity-90"
            onClick={() => window.location.reload()}
            title="ARH"
          >
            <ARHLogo size="xs" />
          </div>

          <div className="h-4 w-px bg-neutral-800 hidden xs:block" />

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#141418] border border-[#24242A] text-xs text-neutral-300">
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span className="font-medium hidden sm:inline">Dual AI Workspace</span>
            <span className="font-medium sm:hidden">Dual</span>
          </div>

          {/* Mobile Panel Toggles */}
          <div className="flex items-center gap-1 lg:hidden ml-1">
            <button
              type="button"
              onClick={() => {
                setShowLeftMobile(!showLeftMobile);
                setShowRightMobile(false);
              }}
              className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                showLeftMobile 
                  ? 'bg-blue-950/60 border-blue-500/50 text-blue-400' 
                  : 'bg-[#141418] border-[#24242A] text-neutral-400 hover:text-white'
              }`}
              title="Toggle AI 1 Panel"
            >
              <PanelLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setShowRightMobile(!showRightMobile);
                setShowLeftMobile(false);
              }}
              className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                showRightMobile 
                  ? 'bg-pink-950/60 border-pink-500/50 text-pink-400' 
                  : 'bg-[#141418] border-[#24242A] text-neutral-400 hover:text-white'
              }`}
              title="Toggle AI 2 Panel"
            >
              <PanelRight className="w-3.5 h-3.5" />
            </button>
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

      {/* 2. Main 3-Panel Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel: AI 1 Configuration (Desktop fixed, Mobile overlay drawer) */}
        <div className={`w-72 sm:w-80 shrink-0 h-full z-10 transition-transform lg:translate-x-0 ${
          showLeftMobile 
            ? 'absolute inset-y-0 left-0 shadow-2xl translate-x-0 bg-[#0C0D11]' 
            : 'hidden lg:block'
        }`}>
          <DualPanelLeft onOpenModelModal={() => setActiveModalSlot('A')} />
        </div>

        {/* Center Panel: Shared Conversation + Auto Chat + Composer */}
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#08080A]">
          {/* Top Auto AI-to-AI Conversation Bar */}
          <div className="shrink-0 p-3 sm:px-6 pt-3 border-b border-[#181820]">
            <DualAutoChatBar
              onStart={() => startAutoConversation()}
              onPause={pauseAutoConversation}
              onResume={resumeAutoConversation}
              onStop={stopAutoConversation}
            />
          </div>

          {/* Shared Transcript Body */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4">
            {dualMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto px-4 text-center select-none py-10">
                <div className="w-12 h-12 rounded-2xl bg-[#141418] border border-[#24242C] flex items-center justify-center mb-4 shadow-lg text-purple-400">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Dual AI Workspace
                </h2>
                <p className="text-xs sm:text-sm text-neutral-400 mt-2 max-w-md leading-relaxed">
                  Configure AI 1 (Blue) on the left and AI 2 (Pink) on the right. Send prompts to either AI individually, send to both simultaneously, or let them converse automatically.
                </p>

                {/* Quick Action Hint */}
                <div className="flex items-center gap-3 mt-4 text-[11px] text-neutral-500 font-mono">
                  <span className="flex items-center gap-1 text-blue-400">
                    <ArrowLeft className="w-3.5 h-3.5" /> AI 1
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-purple-400">
                    <ArrowUp className="w-3.5 h-3.5" /> Both
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-pink-400">
                    <ArrowRight className="w-3.5 h-3.5" /> AI 2
                  </span>
                </div>

                {/* Prompt Starter Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full mt-6">
                  {promptSuggestions.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => sendToBoth(item.prompt)}
                      className="flex flex-col text-left p-3 rounded-xl bg-[#121216] hover:bg-[#1A1A20] border border-[#22222A] hover:border-neutral-600 transition-all cursor-pointer group"
                    >
                      <span className="text-xs font-semibold text-neutral-200 group-hover:text-purple-400 transition-colors">
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
                  <DualMessageItem
                    key={msg.id}
                    message={msg}
                    isLatest={idx === dualMessages.length - 1}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Bottom Composer with the 3 Arrow-Only Buttons */}
          <footer className="shrink-0 p-3 sm:p-4 max-w-4xl w-full mx-auto">
            <DualComposer
              onSendAI1={(text, atts) => sendToAI1(text, atts)}
              onSendBoth={(text, atts) => sendToBoth(text, atts)}
              onSendAI2={(text, atts) => sendToAI2(text, atts)}
              onStop={stopGeneration}
              isGenerating={isDualGenerating}
            />
          </footer>
        </main>

        {/* Right Panel: AI 2 Configuration (Desktop fixed, Mobile overlay drawer) */}
        <div className={`w-72 sm:w-80 shrink-0 h-full z-10 transition-transform lg:translate-x-0 ${
          showRightMobile 
            ? 'absolute inset-y-0 right-0 shadow-2xl translate-x-0 bg-[#0D0B0E]' 
            : 'hidden lg:block'
        }`}>
          <DualPanelRight onOpenModelModal={() => setActiveModalSlot('B')} />
        </div>
      </div>

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
