import React from 'react';
import { useAppStore } from '../../store/appStore';
import { Zap, ChevronDown, Sparkles } from 'lucide-react';

interface DualConfigBarProps {
  onOpenModelModal: (slot: 'A' | 'B') => void;
}

export const DualConfigBar: React.FC<DualConfigBarProps> = ({ onOpenModelModal }) => {
  const {
    dualModelA,
    dualModelB,
    dualProviderA,
    dualProviderB,
    selectedModel,
    selectedProvider,
    isDualGenerating
  } = useAppStore();

  const modelA = dualModelA || selectedModel;
  const modelB = dualModelB || selectedModel;
  const providerA = dualProviderA || selectedProvider;
  const providerB = dualProviderB || selectedProvider;

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-2.5">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-2.5 sm:gap-3 bg-[#0F0F12] border border-[#202025] rounded-2xl p-2.5 sm:p-3 shadow-lg">
        {/* Panel A (Model A) */}
        <div className="flex items-center justify-between sm:justify-start gap-2.5 p-2 sm:p-2.5 bg-[#15151A] border border-[#24242B] rounded-xl hover:border-[#353540] transition-colors">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold bg-[#22222A] text-emerald-400 border border-emerald-500/20 shrink-0">
              Model A
            </span>
            <div className="min-w-0">
              <div className="text-[11px] text-neutral-400 font-medium truncate">
                {providerA?.name || 'Select Provider'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenModelModal('A')}
            disabled={isDualGenerating}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1C1C22] hover:bg-[#25252C] border border-[#2D2D36] hover:border-[#3D3D48] rounded-xl text-xs font-medium text-neutral-200 transition-all cursor-pointer disabled:opacity-50 ml-auto shrink-0 max-w-[180px] sm:max-w-[220px]"
            title="Change Model A"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">{modelA?.name || modelA?.id || 'Choose Model A'}</span>
            <ChevronDown className="w-3 h-3 text-neutral-400 shrink-0" />
          </button>
        </div>

        {/* Center VS Indicator */}
        <div className="hidden md:flex items-center justify-center">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1A1A20] border border-[#2C2C35] text-[11px] font-mono text-neutral-400 font-semibold shadow-inner">
            <Sparkles className="w-3 h-3 text-amber-400/80" />
            <span>VS</span>
          </div>
        </div>

        {/* Panel B (Model B) */}
        <div className="flex items-center justify-between sm:justify-start gap-2.5 p-2 sm:p-2.5 bg-[#15151A] border border-[#24242B] rounded-xl hover:border-[#353540] transition-colors">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold bg-[#22222A] text-sky-400 border border-sky-500/20 shrink-0">
              Model B
            </span>
            <div className="min-w-0">
              <div className="text-[11px] text-neutral-400 font-medium truncate">
                {providerB?.name || 'Select Provider'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenModelModal('B')}
            disabled={isDualGenerating}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1C1C22] hover:bg-[#25252C] border border-[#2D2D36] hover:border-[#3D3D48] rounded-xl text-xs font-medium text-neutral-200 transition-all cursor-pointer disabled:opacity-50 ml-auto shrink-0 max-w-[180px] sm:max-w-[220px]"
            title="Change Model B"
          >
            <Zap className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="truncate">{modelB?.name || modelB?.id || 'Choose Model B'}</span>
            <ChevronDown className="w-3 h-3 text-neutral-400 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
};
