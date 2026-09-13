import type { ProviderResolution, ProviderDefinition } from '../../providers/types';
import { Sparkles, HelpCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ProviderDetectionProps {
  detection: ProviderResolution;
  selectedProvider: ProviderDefinition | null;
  onSelectProvider: (provider: ProviderDefinition) => void;
  onOpenSelector: () => void;
}

export const ProviderDetection: React.FC<ProviderDetectionProps> = ({
  detection,
  selectedProvider,
  onSelectProvider,
  onOpenSelector
}) => {
  const { confidence, candidates, rationale, reason } = detection;
  const rationaleText = rationale || reason;
  // High confidence automatic detection overrides any stale selectedProvider
  const active = (confidence === 'high' && !detection.isManualSelection && detection.provider) 
    ? detection.provider 
    : (selectedProvider || detection.provider);

  if (!detection.provider && candidates.length === 0) {
    return null;
  }

  const confidenceBadges = {
    high: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    low: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    unknown: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20'
  };

  const confidenceIcons = {
    high: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
    medium: <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
    low: <AlertTriangle className="w-3.5 h-3.5 text-orange-400 shrink-0" />,
    unknown: <HelpCircle className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
  };

  return (
    <div className="flex flex-col gap-2.5 p-3.5 bg-[#161619] border border-[#26262B] rounded-xl animate-fade-in">
      {/* Detection status row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {confidenceIcons[confidence]}
          <span className="text-xs text-neutral-300 font-medium">
            {active ? (
              <>
                Provider: <span className="text-white font-semibold">{active.name}</span>
              </>
            ) : (
              'Provider not detected'
            )}
          </span>
        </div>

        {/* Confidence pill */}
        <span className={`px-2 py-0.5 text-[11px] font-medium border rounded-full capitalize ${confidenceBadges[confidence]}`}>
          {confidence} confidence
        </span>
      </div>

      {/* Rationale explanation */}
      <p className="text-[12px] text-neutral-400 leading-relaxed">
        {rationaleText}
      </p>

      {/* If ambiguous or multiple candidates */}
      {candidates.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#232328]">
          <span className="text-[11px] text-neutral-400 mr-1">Candidates:</span>
          {candidates.map((cand) => (
            <button
              key={cand.id}
              type="button"
              onClick={() => onSelectProvider(cand)}
              className={`px-2 py-0.5 rounded-lg text-xs transition-all ${
                active?.id === cand.id
                  ? 'bg-neutral-200 text-neutral-900 font-medium'
                  : 'bg-[#1E1E22] text-neutral-300 hover:text-white hover:bg-[#282830]'
              }`}
            >
              {cand.name}
            </button>
          ))}
          <button
            type="button"
            onClick={onOpenSelector}
            className="text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline ml-auto"
          >
            Choose other...
          </button>
        </div>
      )}

      {/* If unknown, prompt user to select provider */}
      {confidence === 'unknown' && candidates.length <= 1 && (
        <button
          type="button"
          onClick={onOpenSelector}
          className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline self-start pt-1"
        >
          Select provider manually →
        </button>
      )}
    </div>
  );
};
