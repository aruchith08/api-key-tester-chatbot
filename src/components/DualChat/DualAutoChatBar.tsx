import React from 'react';
import { useAppStore } from '../../store/appStore';
import { Play, Pause, Square, Sparkles, SlidersHorizontal, RefreshCw } from 'lucide-react';

interface DualAutoChatBarProps {
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export const DualAutoChatBar: React.FC<DualAutoChatBarProps> = ({
  onStart,
  onPause,
  onResume,
  onStop
}) => {
  const {
    autoChatState,
    autoChatTurnLimit,
    autoChatCurrentTurn,
    setAutoChatTurnLimit,
    dualProviderA,
    dualModelA,
    dualProviderB,
    dualModelB,
    dualApiKeyA,
    dualApiKeyB,
    storedKeys,
    selectedProvider,
    apiKey,
    isDualGenerating
  } = useAppStore();

  const isSlotAConnected = Boolean(
    dualProviderA && (
      dualApiKeyA || 
      storedKeys.some(k => k.providerId === dualProviderA.id) ||
      (selectedProvider?.id === dualProviderA.id && apiKey)
    )
  );

  const isSlotBConnected = Boolean(
    dualProviderB && (
      dualApiKeyB || 
      storedKeys.some(k => k.providerId === dualProviderB.id) ||
      (selectedProvider?.id === dualProviderB.id && apiKey)
    )
  );

  const isConfigured = Boolean(isSlotAConnected && isSlotBConnected && dualModelA && dualModelB);

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-2 bg-[#0F0F14] border border-[#22222A] rounded-2xl flex flex-wrap items-center justify-between gap-2 shadow-sm text-xs">
      {/* Left: Title & Status Indicator */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5 font-medium text-neutral-200">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden xs:inline">Auto AI-to-AI Mode</span>
          <span className="xs:hidden">Auto Talk</span>
        </div>

        {/* State Badge */}
        {autoChatState === 'running' ? (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Turn {autoChatCurrentTurn} of {autoChatTurnLimit}</span>
          </span>
        ) : autoChatState === 'paused' ? (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-950/60 text-amber-400 border border-amber-800/40">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Paused ({autoChatCurrentTurn}/{autoChatTurnLimit})</span>
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-neutral-800/60 text-neutral-400 border border-neutral-700/40">
            Idle
          </span>
        )}
      </div>

      {/* Right: Controls & Turn Limit */}
      <div className="flex items-center gap-2">
        {/* Turn Limit Selector */}
        <div className="flex items-center gap-1 bg-[#17171E] px-2 py-1 rounded-xl border border-[#272733] text-[11px] text-neutral-400">
          <span className="hidden sm:inline">Limit:</span>
          <select
            value={autoChatTurnLimit}
            onChange={(e) => setAutoChatTurnLimit(Number(e.target.value))}
            disabled={autoChatState === 'running'}
            className="bg-transparent text-neutral-200 focus:outline-none cursor-pointer font-mono"
          >
            <option value={5} className="bg-[#17171E] text-neutral-200">5 turns</option>
            <option value={10} className="bg-[#17171E] text-neutral-200">10 turns</option>
            <option value={20} className="bg-[#17171E] text-neutral-200">20 turns</option>
          </select>
        </div>

        {/* Action Buttons */}
        {autoChatState === 'running' ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onPause}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-medium transition-all cursor-pointer"
              title="Pause conversation"
            >
              <Pause className="w-3 h-3 fill-current" />
              <span>Pause</span>
            </button>
            <button
              type="button"
              onClick={onStop}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-xs font-medium transition-all cursor-pointer"
              title="Stop auto conversation"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Stop</span>
            </button>
          </div>
        ) : autoChatState === 'paused' ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onResume}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-sm transition-all cursor-pointer"
              title="Resume conversation"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Resume</span>
            </button>
            <button
              type="button"
              onClick={onStop}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-xs font-medium transition-all cursor-pointer"
              title="Stop auto conversation"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Stop</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onStart}
            disabled={!isConfigured || isDualGenerating}
            className="flex items-center gap-1 px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium shadow-sm shadow-purple-900/30 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title={!isConfigured ? 'Configure both AI 1 and AI 2 to enable' : 'Start alternating conversation between AI 1 and AI 2'}
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Start Talk</span>
          </button>
        )}
      </div>
    </div>
  );
};
