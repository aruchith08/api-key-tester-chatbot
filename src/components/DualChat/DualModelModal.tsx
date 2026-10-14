import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import { ProviderRegistry } from '../../providers/registry';
import { ApiKeyStorage } from '../../services/apiKeyStorage';
import type { Model, ProviderDefinition } from '../../types/provider';
import { Search, Zap, Check, X, ShieldCheck } from 'lucide-react';

interface DualModelModalProps {
  slot: 'A' | 'B' | null;
  onClose: () => void;
}

export const DualModelModal: React.FC<DualModelModalProps> = ({ slot, onClose }) => {
  const {
    models,
    selectedProvider,
    dualModelA,
    dualModelB,
    dualProviderA,
    dualProviderB,
    setDualModelA,
    setDualModelB,
    storedKeys
  } = useAppStore();

  const [search, setSearch] = useState('');
  const [selectedProviderId, setSelectedProviderId] = useState<string>(
    slot === 'A'
      ? (dualProviderA?.id || selectedProvider?.id || 'groq')
      : (dualProviderB?.id || selectedProvider?.id || 'groq')
  );

  const activeProvider = useMemo(() => {
    return ProviderRegistry.getById(selectedProviderId) || selectedProvider || ProviderRegistry.getAll()[0];
  }, [selectedProviderId, selectedProvider]);

  // Models available for this provider
  const availableModels = useMemo<Model[]>(() => {
    // If activeProvider is current connected provider, use live models from store
    if (activeProvider.id === selectedProvider?.id && models.length > 0) {
      return models;
    }
    // Otherwise use default curated/catalog models from registry
    return ProviderRegistry.getCuratedModels(activeProvider.id);
  }, [activeProvider, selectedProvider, models]);

  const filteredModels = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return availableModels;
    return availableModels.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q) ||
      (m.publisher && m.publisher.toLowerCase().includes(q))
    );
  }, [availableModels, search]);

  if (!slot) return null;

  const currentSelectedModel = slot === 'A' ? dualModelA : dualModelB;

  const handleSelectModel = (model: Model) => {
    if (slot === 'A') {
      setDualModelA(model, activeProvider);
    } else {
      setDualModelB(model, activeProvider);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-xl bg-[#121215] border border-[#24242A] rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#202025]">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
              <span>Select AI for Model {slot}</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-[#1E1E24] text-neutral-300 border border-[#2F2F38]">
                Slot {slot}
              </span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Choose the AI provider and model to benchmark in this slot
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Provider Selector Strip */}
        <div className="px-5 py-3 border-b border-[#202025] bg-[#0E0E11]">
          <label className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider block mb-1.5">
            AI Provider
          </label>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {ProviderRegistry.getAll().slice(0, 15).map((prov) => {
              const hasStoredKey = storedKeys.some(k => k.providerId === prov.id);
              const isCurrent = prov.id === selectedProviderId;
              return (
                <button
                  key={prov.id}
                  type="button"
                  onClick={() => setSelectedProviderId(prov.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-[#22222A] text-white border border-neutral-600 shadow-sm'
                      : 'bg-[#151518] text-neutral-400 hover:text-neutral-200 border border-[#242429]'
                  }`}
                >
                  <span>{prov.name}</span>
                  {hasStoredKey && (
                    <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" title="Key stored in vault" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Input */}
        <div className="px-5 py-3 border-b border-[#1E1E22]">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${activeProvider.name} models...`}
              className="w-full bg-[#18181C] text-sm text-white placeholder-neutral-500 pl-9 pr-3 py-2 rounded-xl border border-[#282830] focus:outline-none focus:border-neutral-500 transition-colors"
              autoFocus
            />
          </div>
        </div>

        {/* Model List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {filteredModels.length === 0 ? (
            <div className="text-center py-10 text-neutral-400 text-xs sm:text-sm">
              No models found matching "{search}".
            </div>
          ) : (
            filteredModels.map((m) => {
              const isSelected = 
                (currentSelectedModel?.id === m.id || currentSelectedModel?.apiModelId === m.id) &&
                (activeProvider.id === (slot === 'A' ? dualProviderA?.id : dualProviderB?.id));

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectModel(m)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#1E1E26] border-emerald-500/50 shadow-sm'
                      : 'bg-[#151518] hover:bg-[#1A1A20] border-[#222228] hover:border-[#303038]'
                  }`}
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs sm:text-sm text-neutral-100 truncate">
                        {m.name || m.id}
                      </span>
                      {m.isDefault && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-800 text-neutral-300 font-mono">
                          Default
                        </span>
                      )}
                      {m.freeEndpoint && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                          Free
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-400 truncate mt-0.5 font-mono">
                      {m.apiModelId || m.id}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {m.contextWindow && (
                      <span className="text-[11px] text-neutral-500 font-mono hidden sm:inline">
                        {(m.contextWindow / 1024).toFixed(0)}k ctx
                      </span>
                    )}
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-black">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#202025] bg-[#0E0E11] flex items-center justify-between text-xs text-neutral-400">
          <span>{filteredModels.length} models available</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-[#1F1F24] hover:bg-[#282830] text-neutral-200 rounded-xl font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
