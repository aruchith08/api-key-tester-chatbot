import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { ARHLogo } from '../Home/ARHLogo';
import { ChatModeToggle } from '../Navigation/ChatModeToggle';
import { DualComposer } from './DualComposer';
import { DualMessageItem } from './DualMessageItem';
import { DualAutoChatBar } from './DualAutoChatBar';
import { DualApiKeyModal } from './DualApiKeyModal';
import { DualModelModal } from './DualModelModal';
import { useDualChat } from '../../hooks/useDualChat';
import { ProviderRegistry } from '../../providers/registry';
import { ApiKeyStorage } from '../../services/apiKeyStorage';
import type { StoredApiKey } from '../../types/storage';
import { 
  KeyRound, 
  Database, 
  Info, 
  Trash2, 
  Sparkles, 
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Zap,
  Sliders
} from 'lucide-react';

export const DualChatWorkspace: React.FC = () => {
  const {
    apiKey,
    selectedProvider,
    dualMessages,
    isDualGenerating,
    clearDualChat,
    setKeyVaultOpen,
    storedKeys,
    refreshStoredKeys,
    setAboutModalOpen,
    dualProviderA,
    dualModelA,
    dualApiKeyA,
    dualProviderB,
    dualModelB,
    dualApiKeyB,
    setDualApiKeyA,
    setDualApiKeyB,
    setDualProviderA,
    setDualProviderB,
    setDualModelA,
    setDualModelB,
    setDualModelsA,
    setDualModelsB,
    setDualNameA,
    setDualNameB,
    showNotification
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

  const [activeKeyModalSlot, setActiveKeyModalSlot] = useState<'A' | 'B' | null>(null);
  const [activeModelModalSlot, setActiveModelModalSlot] = useState<'A' | 'B' | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dualMessages, isDualGenerating]);

  // Check if Slot A has a key (explicit, stored, or active single-chat key)
  const isSlotAConnected = Boolean(
    dualProviderA && (
      dualApiKeyA || 
      storedKeys.some(k => k.providerId === dualProviderA.id) ||
      (selectedProvider?.id === dualProviderA.id && apiKey)
    )
  );

  // Check if Slot B has a key (explicit, stored, or active single-chat key)
  const isSlotBConnected = Boolean(
    dualProviderB && (
      dualApiKeyB || 
      storedKeys.some(k => k.providerId === dualProviderB.id) ||
      (selectedProvider?.id === dualProviderB.id && apiKey)
    )
  );

  // 1-Click quick connect a stored key to a slot
  const handleQuickConnect = async (slot: 'A' | 'B', item: StoredApiKey) => {
    const provider = ProviderRegistry.getById(item.providerId);
    if (!provider) return;

    let models = provider.fallbackModels && provider.fallbackModels.length > 0
      ? provider.fallbackModels
      : ProviderRegistry.getCuratedModels(provider.id);

    const chosenModel = models.find(m => m.id === provider.defaultModelId || m.isDefault) || models[0] || {
      id: provider.defaultModelId || 'default',
      name: provider.defaultModelId || `${provider.name} Default`,
      provider: provider.name
    };

    if (slot === 'A') {
      setDualApiKeyA(item.apiKey);
      setDualProviderA(provider);
      setDualModelsA(models);
      setDualModelA(chosenModel, provider);
      setDualNameA(provider.name);
    } else {
      setDualApiKeyB(item.apiKey);
      setDualProviderB(provider);
      setDualModelsB(models);
      setDualModelB(chosenModel, provider);
      setDualNameB(provider.name);
    }

    ApiKeyStorage.update(item.id, { lastUsedAt: Date.now() });
    refreshStoredKeys();
    showNotification(`Connected AI ${slot === 'A' ? '1' : '2'} to ${provider.name} (${chosenModel.name || chosenModel.id})!`);

    // Background fetch live models from provider
    try {
      const adapter = ProviderRegistry.resolveAdapter(provider);
      const liveModels = await adapter.getModels(item.apiKey);
      if (liveModels && liveModels.length > 0) {
        if (slot === 'A') setDualModelsA(liveModels);
        else setDualModelsB(liveModels);
      }
    } catch {
      // Ignored: fallback catalog is already loaded
    }
  };

  // Safe send handlers that prompt to add key if missing
  const handleSendAI1 = (text: string, atts?: any) => {
    if (!isSlotAConnected) {
      setActiveKeyModalSlot('A');
      showNotification('Please add an API key for AI 1 first.');
      return;
    }
    sendToAI1(text, atts);
  };

  const handleSendAI2 = (text: string, atts?: any) => {
    if (!isSlotBConnected) {
      setActiveKeyModalSlot('B');
      showNotification('Please add an API key for AI 2 first.');
      return;
    }
    sendToAI2(text, atts);
  };

  const handleSendBoth = (text: string, atts?: any) => {
    if (!isSlotAConnected) {
      setActiveKeyModalSlot('A');
      showNotification('Please add an API key for AI 1 first.');
      return;
    }
    if (!isSlotBConnected) {
      setActiveKeyModalSlot('B');
      showNotification('Please add an API key for AI 2 first.');
      return;
    }
    sendToBoth(text, atts);
  };

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
      <header className="shrink-0 grid grid-cols-[1fr_auto_1fr] items-center px-3 sm:px-6 py-2.5 border-b border-[#1C1C20] bg-[#08080A]/95 backdrop-blur-md z-50 pointer-events-auto gap-2">
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
        </div>

        {/* Top-Center: Segmented Pill Switcher [ Chat | Dual ] */}
        <div className="justify-self-center">
          <ChatModeToggle />
        </div>

        {/* Top-Right: Actions */}
        <div className="justify-self-end flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Clear Dual Chat if messages exist */}
          {dualMessages.length > 0 && (
            <button
              type="button"
              onClick={clearDualChat}
              disabled={isDualGenerating}
              className="flex items-center gap-1.5 px-2.5 h-9 text-xs text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors disabled:opacity-30 cursor-pointer shrink-0 whitespace-nowrap"
              title="Clear dual conversation"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden lg:inline whitespace-nowrap">Clear</span>
            </button>
          )}

          {/* Stored Keys Vault */}
          <button
            type="button"
            onClick={() => setKeyVaultOpen(true)}
            className="group flex items-center gap-1.5 px-3 h-9 bg-[#121215] hover:bg-[#1A1A1E] text-neutral-300 hover:text-white border border-[#242429] hover:border-[#35353C] rounded-xl text-xs font-medium shadow-sm transition-all cursor-pointer shrink-0 whitespace-nowrap"
            title="Stored API Keys Vault"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="hidden lg:inline whitespace-nowrap">Stored Keys</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-neutral-800 text-neutral-300 group-hover:text-white border border-neutral-700 shrink-0">
              {storedKeys.length}
            </span>
          </button>

          {/* About */}
          <button
            type="button"
            onClick={() => setAboutModalOpen(true)}
            className="flex items-center gap-1.5 px-3 h-9 bg-[#121215] hover:bg-[#1A1A1E] text-neutral-400 hover:text-neutral-200 border border-[#242429] rounded-xl text-xs font-medium transition-all cursor-pointer shrink-0 whitespace-nowrap"
            title="About ARH"
          >
            <Info className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">About</span>
          </button>
        </div>
      </header>

      {/* 2. Top Sleek Key Bar: AI 1 (Blue) | Auto Chat | AI 2 (Pink) */}
      <div className="shrink-0 px-3 sm:px-6 py-2 border-b border-[#181820] bg-[#0A0A0E] flex flex-wrap items-center justify-between gap-2 z-40">
        {/* AI 1 Quick Key Pill */}
        <div className="flex items-center gap-2">
          {isSlotAConnected ? (
            <button
              type="button"
              onClick={() => setActiveKeyModalSlot('A')}
              className="flex items-center gap-2 px-3 py-1 rounded-xl bg-[#0D121F] border border-blue-500/40 hover:border-blue-500 text-xs text-blue-200 transition-all cursor-pointer shadow-sm group"
              title="Click to change AI 1 API key or provider"
            >
              <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
              <span className="font-semibold text-white">AI 1:</span>
              <span className="text-blue-300">{dualProviderA?.name}</span>
              <span className="text-neutral-400 text-[11px] font-mono hidden md:inline">
                ({dualModelA?.name || dualModelA?.id || 'Default'})
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveKeyModalSlot('A')}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-950/30 hover:bg-blue-950/60 border border-blue-500/40 hover:border-blue-500/80 text-blue-300 text-xs font-medium transition-all cursor-pointer shadow-sm group"
            >
              <KeyRound className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
              <span>+ Add Key for AI 1</span>
            </button>
          )}

          {/* Optional Model Selector for AI 1 */}
          {isSlotAConnected && (
            <button
              type="button"
              onClick={() => setActiveModelModalSlot('A')}
              className="p-1 px-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 text-[11px] border border-[#222228] transition-colors cursor-pointer"
              title="Change AI 1 Model"
            >
              <Sliders className="w-3 h-3 text-blue-400" />
            </button>
          )}
        </div>

        {/* Center: Auto AI-to-AI Chat Bar */}
        <div className="hidden sm:block">
          <DualAutoChatBar
            onStart={() => startAutoConversation()}
            onPause={pauseAutoConversation}
            onResume={resumeAutoConversation}
            onStop={stopAutoConversation}
          />
        </div>

        {/* AI 2 Quick Key Pill */}
        <div className="flex items-center gap-2">
          {/* Optional Model Selector for AI 2 */}
          {isSlotBConnected && (
            <button
              type="button"
              onClick={() => setActiveModelModalSlot('B')}
              className="p-1 px-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 text-[11px] border border-[#222228] transition-colors cursor-pointer"
              title="Change AI 2 Model"
            >
              <Sliders className="w-3 h-3 text-pink-400" />
            </button>
          )}

          {isSlotBConnected ? (
            <button
              type="button"
              onClick={() => setActiveKeyModalSlot('B')}
              className="flex items-center gap-2 px-3 py-1 rounded-xl bg-[#1C0D17] border border-pink-500/40 hover:border-pink-500 text-xs text-pink-200 transition-all cursor-pointer shadow-sm group"
              title="Click to change AI 2 API key or provider"
            >
              <span className="w-2 h-2 rounded-full bg-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
              <span className="font-semibold text-white">AI 2:</span>
              <span className="text-pink-300">{dualProviderB?.name}</span>
              <span className="text-neutral-400 text-[11px] font-mono hidden md:inline">
                ({dualModelB?.name || dualModelB?.id || 'Default'})
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveKeyModalSlot('B')}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-pink-950/30 hover:bg-pink-950/60 border border-pink-500/40 hover:border-pink-500/80 text-pink-300 text-xs font-medium transition-all cursor-pointer shadow-sm group"
            >
              <KeyRound className="w-3.5 h-3.5 text-pink-400 group-hover:scale-110 transition-transform" />
              <span>+ Add Key for AI 2</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Auto Chat Bar */}
      <div className="sm:hidden px-3 py-1.5 bg-[#0A0A0E] border-b border-[#181820]">
        <DualAutoChatBar
          onStart={() => startAutoConversation()}
          onPause={pauseAutoConversation}
          onResume={resumeAutoConversation}
          onStop={stopAutoConversation}
        />
      </div>

      {/* 3. Main Full-Width Conversation & Hero Layout */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#08080A]">
        {/* Shared Transcript Body */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4 max-w-5xl w-full mx-auto">
          {dualMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto px-4 text-center select-none py-6 sm:py-10">
              <div className="w-12 h-12 rounded-2xl bg-[#141418] border border-[#24242C] flex items-center justify-center mb-4 shadow-lg text-purple-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Dual AI Workspace
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 mt-2 max-w-md leading-relaxed">
                Simply add an API key for AI 1 and AI 2 to compare responses side-by-side or run automatic AI-to-AI conversations.
              </p>

              {/* Two Simple Add API Key Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-6">
                {/* AI 1 Card */}
                <div className="p-4 rounded-2xl bg-[#0D101A] border border-blue-500/30 flex flex-col items-center text-center">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                    <span className="font-semibold text-sm text-white">AI 1 (Blue)</span>
                  </div>

                  {isSlotAConnected ? (
                    <div className="space-y-1.5 my-2">
                      <div className="flex items-center gap-1.5 text-xs text-blue-300 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                        <span>Connected to {dualProviderA?.name}</span>
                      </div>
                      <div className="text-[11px] text-neutral-400 font-mono">
                        {dualModelA?.name || dualModelA?.id || 'Default Model'}
                      </div>
                      <div className="flex items-center gap-2 justify-center mt-1">
                        <button
                          type="button"
                          onClick={() => setActiveModelModalSlot('A')}
                          className="text-xs text-blue-400 hover:text-blue-300 font-medium underline underline-offset-2 transition-colors cursor-pointer"
                        >
                          Select Model
                        </button>
                        <span className="text-neutral-600">•</span>
                        <button
                          type="button"
                          onClick={() => setActiveKeyModalSlot('A')}
                          className="text-xs text-neutral-400 hover:text-white underline underline-offset-2 transition-colors cursor-pointer"
                        >
                          Change Key
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full space-y-2.5 my-2">
                      <button
                        type="button"
                        onClick={() => setActiveKeyModalSlot('A')}
                        className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-900/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>+ Add API Key for AI 1</span>
                      </button>

                      {/* Quick 1-click pills if stored keys exist */}
                      {storedKeys.length > 0 && (
                        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                          <span className="text-[10px] text-neutral-500">Saved:</span>
                          {storedKeys.slice(0, 3).map((k) => (
                            <button
                              key={k.id}
                              type="button"
                              onClick={() => handleQuickConnect('A', k)}
                              className="px-2 py-0.5 rounded-md bg-[#161A26] hover:bg-blue-900/40 text-[10px] text-neutral-300 hover:text-blue-300 border border-[#272F45] transition-colors cursor-pointer"
                              title={`Connect ${k.name || k.providerId}`}
                            >
                              {k.name || k.providerId}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* AI 2 Card */}
                <div className="p-4 rounded-2xl bg-[#180F16] border border-pink-500/30 flex flex-col items-center text-center">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
                    <span className="font-semibold text-sm text-white">AI 2 (Pink)</span>
                  </div>

                  {isSlotBConnected ? (
                    <div className="space-y-1.5 my-2">
                      <div className="flex items-center gap-1.5 text-xs text-pink-300 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-pink-400" />
                        <span>Connected to {dualProviderB?.name}</span>
                      </div>
                      <div className="text-[11px] text-neutral-400 font-mono">
                        {dualModelB?.name || dualModelB?.id || 'Default Model'}
                      </div>
                      <div className="flex items-center gap-2 justify-center mt-1">
                        <button
                          type="button"
                          onClick={() => setActiveModelModalSlot('B')}
                          className="text-xs text-pink-400 hover:text-pink-300 font-medium underline underline-offset-2 transition-colors cursor-pointer"
                        >
                          Select Model
                        </button>
                        <span className="text-neutral-600">•</span>
                        <button
                          type="button"
                          onClick={() => setActiveKeyModalSlot('B')}
                          className="text-xs text-neutral-400 hover:text-white underline underline-offset-2 transition-colors cursor-pointer"
                        >
                          Change Key
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full space-y-2.5 my-2">
                      <button
                        type="button"
                        onClick={() => setActiveKeyModalSlot('B')}
                        className="w-full py-2 px-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold shadow-lg shadow-pink-900/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>+ Add API Key for AI 2</span>
                      </button>

                      {/* Quick 1-click pills if stored keys exist */}
                      {storedKeys.length > 0 && (
                        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                          <span className="text-[10px] text-neutral-500">Saved:</span>
                          {storedKeys.slice(0, 3).map((k) => (
                            <button
                              key={k.id}
                              type="button"
                              onClick={() => handleQuickConnect('B', k)}
                              className="px-2 py-0.5 rounded-md bg-[#241722] hover:bg-pink-900/40 text-[10px] text-neutral-300 hover:text-pink-300 border border-[#3E273A] transition-colors cursor-pointer"
                              title={`Connect ${k.name || k.providerId}`}
                            >
                              {k.name || k.providerId}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Action Hint */}
              <div className="flex items-center gap-3 mt-5 text-[11px] text-neutral-500 font-mono">
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full mt-5">
                {promptSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendBoth(item.prompt)}
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
            onSendAI1={handleSendAI1}
            onSendBoth={handleSendBoth}
            onSendAI2={handleSendAI2}
            onStop={stopGeneration}
            isGenerating={isDualGenerating}
          />
        </footer>
      </main>

      {/* Dual API Key Modal (Slot A or Slot B) */}
      {activeKeyModalSlot && (
        <DualApiKeyModal
          slot={activeKeyModalSlot}
          onClose={() => setActiveKeyModalSlot(null)}
          onOpenModelModal={() => setActiveModelModalSlot(activeKeyModalSlot)}
        />
      )}

      {/* Dual Model Selection Modal */}
      {activeModelModalSlot && (
        <DualModelModal
          slot={activeModelModalSlot}
          onClose={() => setActiveModelModalSlot(null)}
        />
      )}
    </div>
  );
};

export default DualChatWorkspace;
