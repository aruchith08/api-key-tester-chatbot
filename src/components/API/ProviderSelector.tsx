import React, { useState, useMemo } from 'react';
import { ProviderRegistry } from '../../providers/registry';
import type { ProviderDefinition } from '../../providers/types';
import { Search, ChevronRight, Check } from 'lucide-react';

interface ProviderSelectorProps {
  selectedProvider: ProviderDefinition | null;
  onSelect: (provider: ProviderDefinition) => void;
  onClose?: () => void;
}

export const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  selectedProvider,
  onSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    return ProviderRegistry.search(searchQuery);
  }, [searchQuery]);

  const tier1 = useMemo(() => filtered.filter(p => p.tier === 1), [filtered]);
  const tier2 = useMemo(() => filtered.filter(p => p.tier === 2), [filtered]);

  return (
    <div className="flex flex-col gap-3 w-full animate-fade-in">
      {/* Search Input */}
      <div className="relative flex items-center w-full bg-[#161619] border border-[#27272C] rounded-xl px-3 py-2 text-xs">
        <Search className="w-3.5 h-3.5 text-neutral-500 mr-2 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search AI providers (OpenAI, Groq, Gemini...)"
          className="w-full bg-transparent text-neutral-200 placeholder-neutral-500 outline-none text-xs"
          autoFocus
        />
      </div>

      {/* Provider List */}
      <div className="flex flex-col gap-3 max-h-[260px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
        {/* Tier 1 Section */}
        {tier1.length > 0 && (
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 px-2 mb-1.5">
              Popular Providers
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {tier1.map((p) => {
                const isSelected = selectedProvider?.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelect(p)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-neutral-200 text-neutral-900 font-medium'
                        : 'bg-[#161619] hover:bg-[#1E1E22] text-neutral-200 border border-[#222226]'
                    }`}
                  >
                    <div className="truncate mr-2">
                      <div className="text-xs font-medium truncate">{p.name}</div>
                      {p.description && (
                        <div className={`text-[10px] truncate ${isSelected ? 'text-neutral-600' : 'text-neutral-500'}`}>
                          {p.description}
                        </div>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-neutral-900 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tier 2 Section */}
        {tier2.length > 0 && (
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 px-2 mb-1.5 mt-1">
              More Providers & Custom
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {tier2.map((p) => {
                const isSelected = selectedProvider?.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelect(p)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-neutral-200 text-neutral-900 font-medium'
                        : 'bg-[#161619] hover:bg-[#1E1E22] text-neutral-300 border border-[#222226]'
                    }`}
                  >
                    <div className="truncate mr-2">
                      <div className="text-xs font-medium truncate">{p.name}</div>
                      {p.description && (
                        <div className={`text-[10px] truncate ${isSelected ? 'text-neutral-600' : 'text-neutral-500'}`}>
                          {p.description}
                        </div>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-neutral-900 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-6 text-xs text-neutral-500">
            No providers found matching "{searchQuery}"
          </div>
        )}
      </div>
    </div>
  );
};
