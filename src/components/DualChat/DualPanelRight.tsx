import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { ProviderRegistry } from '../../providers/registry';
import { ApiKeyStorage } from '../../services/apiKeyStorage';
import { 
  Bot, 
  Cpu, 
  KeyRound, 
  Sliders, 
  ChevronDown, 
  Sparkles, 
  ShieldCheck, 
  Eye, 
  EyeOff,
  FileText
} from 'lucide-react';

interface DualPanelRightProps {
  onOpenModelModal: () => void;
}

export const DualPanelRight: React.FC<DualPanelRightProps> = ({ onOpenModelModal }) => {
  const {
    dualProviderB,
    dualModelB,
    dualApiKeyB,
    setDualApiKeyB,
    dualNameB,
    setDualNameB,
    dualSystemPromptB,
    setDualSystemPromptB,
    dualTemperatureB,
    setDualTemperatureB,
    isDualGenerating,
    storedKeys,
    apiKey,
    selectedProvider
  } = useAppStore();

  const [showApiKey, setShowApiKey] = useState(false);

  // Check if an API key is available from vault or active connection
  const hasVaultKey = Boolean(
    dualProviderB?.id && storedKeys.some(k => k.providerId === dualProviderB.id)
  );
  const hasGlobalKey = Boolean(
    dualProviderB?.id && selectedProvider?.id === dualProviderB.id && apiKey
  );
  const effectiveKeySource = dualApiKeyB 
    ? 'Custom Key' 
    : hasVaultKey 
      ? 'From Key Vault' 
      : hasGlobalKey 
        ? 'Connected Key' 
        : null;

  return (
    <aside 
      className="flex flex-col h-full bg-[#0D0B0E] border-l border-[#201A22] text-neutral-200 overflow-y-auto scrollbar-thin select-none"
      aria-label="AI 2 Configuration Panel"
    >
      {/* Panel Header */}
      <div className="p-4 border-b border-[#201A22] bg-[#140E16]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.6)]" />
            <span className="font-semibold text-sm text-white tracking-tight">AI 2 Configuration</span>
          </div>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-pink-950/60 text-pink-400 border border-pink-800/40">
            PINK
          </span>
        </div>
        <p className="text-[11px] text-neutral-400 mt-1">
          Configure provider, model, persona, and parameters for the second AI slot.
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* 1. Provider & Model Selection Card */}
        <div className="p-3 rounded-xl bg-[#171018] border border-[#2D1C2A] hover:border-pink-500/30 transition-all space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-pink-400" />
              <span>Model & Provider</span>
            </label>
            {dualModelB && (
              <span className="text-[10px] text-pink-400 font-mono">Configured</span>
            )}
          </div>

          {/* Provider Display / Trigger */}
          <div>
            <span className="text-[10px] text-neutral-400 block mb-1">Provider</span>
            <button
              type="button"
              onClick={onOpenModelModal}
              disabled={isDualGenerating}
              className="w-full flex items-center justify-between px-3 py-2 bg-[#1E1420] hover:bg-[#251828] border border-[#352136] hover:border-pink-500/40 rounded-xl text-xs text-left transition-all cursor-pointer disabled:opacity-50"
            >
              <span className={dualProviderB ? "text-white font-medium" : "text-neutral-500"}>
                {dualProviderB?.name || 'Choose provider'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            </button>
          </div>

          {/* Model Display / Trigger */}
          <div>
            <span className="text-[10px] text-neutral-400 block mb-1">Model</span>
            <button
              type="button"
              onClick={onOpenModelModal}
              disabled={isDualGenerating}
              className="w-full flex items-center justify-between px-3 py-2 bg-[#1E1420] hover:bg-[#251828] border border-[#352136] hover:border-pink-500/40 rounded-xl text-xs text-left transition-all cursor-pointer disabled:opacity-50"
            >
              <span className={dualModelB ? "text-white font-medium truncate pr-2" : "text-neutral-500"}>
                {dualModelB?.name || dualModelB?.id || 'Select a model'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            </button>
          </div>
        </div>

        {/* 2. Display Name */}
        <div className="p-3 rounded-xl bg-[#171018] border border-[#2D1C2A] space-y-1.5">
          <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5 text-pink-400" />
            <span>Display Name</span>
          </label>
          <input
            type="text"
            value={dualNameB}
            onChange={(e) => setDualNameB(e.target.value)}
            disabled={isDualGenerating}
            placeholder="AI 2"
            className="w-full px-3 py-1.5 bg-[#1E1420] text-xs text-white placeholder-neutral-500 rounded-xl border border-[#352136] focus:outline-none focus:border-pink-500/60 transition-colors"
          />
        </div>

        {/* 3. System Prompt */}
        <div className="p-3 rounded-xl bg-[#171018] border border-[#2D1C2A] space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-pink-400" />
              <span>System Prompt</span>
            </label>
            {dualSystemPromptB && (
              <button
                type="button"
                onClick={() => setDualSystemPromptB('')}
                className="text-[10px] text-neutral-400 hover:text-red-400 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          <textarea
            value={dualSystemPromptB}
            onChange={(e) => setDualSystemPromptB(e.target.value)}
            disabled={isDualGenerating}
            placeholder="e.g. You are a critical security reviewer and Devil's Advocate challenging assumptions."
            rows={3}
            className="w-full px-3 py-2 bg-[#1E1420] text-xs text-neutral-200 placeholder-neutral-500 rounded-xl border border-[#352136] focus:outline-none focus:border-pink-500/60 transition-colors resize-none leading-relaxed"
          />
        </div>

        {/* 4. Temperature */}
        <div className="p-3 rounded-xl bg-[#171018] border border-[#2D1C2A] space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-pink-400" />
              <span>Temperature</span>
            </label>
            <span className="text-xs font-mono font-medium text-pink-400">
              {dualTemperatureB.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={dualTemperatureB}
            onChange={(e) => setDualTemperatureB(parseFloat(e.target.value))}
            disabled={isDualGenerating}
            className="w-full accent-pink-500 h-1.5 bg-[#2B182B] rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
            <span>0.0 Precise</span>
            <span>1.0 Creative</span>
          </div>
        </div>

        {/* 5. API Key Override / Source */}
        <div className="p-3 rounded-xl bg-[#171018] border border-[#2D1C2A] space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-pink-400" />
              <span>Slot API Key</span>
            </label>
            {effectiveKeySource && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-950/40 text-pink-400 border border-pink-800/30 font-medium">
                {effectiveKeySource}
              </span>
            )}
          </div>

          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={dualApiKeyB}
              onChange={(e) => setDualApiKeyB(e.target.value)}
              disabled={isDualGenerating}
              placeholder={effectiveKeySource ? 'Using active key' : 'Paste API key for AI 2...'}
              className="w-full pl-3 pr-8 py-1.5 bg-[#1E1420] text-xs font-mono text-white placeholder-neutral-500 rounded-xl border border-[#352136] focus:outline-none focus:border-pink-500/60 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
            >
              {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-[10px] text-neutral-400">
            Optional override. If empty, uses key from your Key Vault or active connection.
          </p>
        </div>
      </div>
    </aside>
  );
};
