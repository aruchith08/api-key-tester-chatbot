import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { ProviderRegistry } from '../../providers/registry';
import type { Model } from '../../types/provider';
import { 
  Search, 
  Zap, 
  Check, 
  X, 
  ShieldCheck, 
  RefreshCw, 
  Plus, 
  Brain, 
  Eye, 
  MessageSquare 
} from 'lucide-react';
import { isNvidiaChatCompatible, invalidateNvidiaCache } from '../../providers/nvidia/nvidiaBuildCatalog';
import { invalidateModelCache, getCachedModels } from '../../providers/modelCache';

interface DualModelModalProps {
  slot: 'A' | 'B' | null;
  onClose: () => void;
}

export const DualModelModal: React.FC<DualModelModalProps> = ({ slot, onClose }) => {
  const {
    selectedProvider,
    apiKey,
    dualModelA,
    dualModelB,
    dualModelsA,
    dualModelsB,
    dualProviderA,
    dualProviderB,
    dualApiKeyA,
    dualApiKeyB,
    setDualModelA,
    setDualModelB,
    setDualModelsA,
    setDualModelsB,
    dualNameA,
    dualNameB,
    setDualNameA,
    setDualNameB,
    storedKeys,
    showNotification
  } = useAppStore();

  const isSlotA = slot === 'A';
  const accentText = isSlotA ? 'text-blue-400' : 'text-pink-400';
  const accentBorder = isSlotA ? 'border-blue-500/50' : 'border-pink-500/50';
  const accentBg = isSlotA ? 'bg-blue-600' : 'bg-pink-600';
  const badgeClass = isSlotA 
    ? 'bg-blue-950/60 text-blue-300 border-blue-800/40' 
    : 'bg-pink-950/60 text-pink-300 border-pink-800/40';

  const slotKey = isSlotA ? dualApiKeyA : dualApiKeyB;
  const slotProvider = isSlotA ? dualProviderA : dualProviderB;
  const slotModels = isSlotA ? dualModelsA : dualModelsB;

  const initialProviderId = slot === 'A'
    ? (dualProviderA?.id || selectedProvider?.id || 'groq')
    : (dualProviderB?.id || selectedProvider?.id || 'groq');

  const [search, setSearch] = useState('');
  const [selectedProviderId, setSelectedProviderId] = useState<string>(initialProviderId);
  const [activeCategory, setActiveCategory] = useState<string>('chat');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customModelInput, setCustomModelInput] = useState('');

  const activeProvider = useMemo(() => {
    return ProviderRegistry.getById(selectedProviderId) || ProviderRegistry.getAll()[0];
  }, [selectedProviderId]);

  const isNvidia = activeProvider.id === 'nvidia' || activeProvider.id === 'nvidia-nim';

  // Effective API key for the active provider in this slot
  const effectiveKeyForActiveProvider = useMemo(() => {
    if (slotProvider?.id === activeProvider.id && slotKey) {
      return slotKey;
    }
    const stored = storedKeys.find(k => k.providerId === activeProvider.id);
    if (stored?.apiKey) return stored.apiKey;
    if (selectedProvider?.id === activeProvider.id && apiKey) return apiKey;
    return '';
  }, [slotProvider, slotKey, activeProvider, storedKeys, selectedProvider, apiKey]);

  // Compute available models for the selected provider in this slot
  const availableModels = useMemo<Model[]>(() => {
    if (slotProvider?.id === activeProvider.id && slotModels && slotModels.length > 0) {
      return slotModels;
    }
    const cached = getCachedModels(activeProvider.id, effectiveKeyForActiveProvider);
    if (cached && cached.length > 0) {
      return cached;
    }
    if (activeProvider.fallbackModels && activeProvider.fallbackModels.length > 0) {
      return activeProvider.fallbackModels;
    }
    return ProviderRegistry.getCuratedModels(activeProvider.id);
  }, [slotProvider, activeProvider, slotModels, effectiveKeyForActiveProvider]);

  // Dynamic category tabs based on models present
  const categories = useMemo(() => {
    if (isNvidia) {
      return [
        { id: 'chat', label: 'Chat' },
        { id: 'vision', label: 'Vision' },
        { id: 'reasoning', label: 'Reasoning' },
        { id: 'embedding', label: 'Embeddings' },
        { id: 'audio', label: 'Audio' },
        { id: 'translation', label: 'Translation' },
        { id: 'safety', label: 'Safety' },
        { id: 'all', label: 'All Models' }
      ];
    }

    const cats: { id: string; label: string }[] = [{ id: 'chat', label: 'Chat' }];
    const hasVision = availableModels.some(m => m.supportsVision || m.capabilities?.vision || m.category === 'vision');
    if (hasVision) cats.push({ id: 'vision', label: 'Vision' });

    const hasReasoning = availableModels.some(m => m.supportsReasoning || m.category === 'reasoning');
    if (hasReasoning) cats.push({ id: 'reasoning', label: 'Reasoning' });

    const hasFree = availableModels.some(m => m.freeEndpoint);
    if (hasFree) cats.push({ id: 'free', label: 'Free Models' });

    const hasEmbedding = availableModels.some(m => m.category === 'embedding');
    if (hasEmbedding) cats.push({ id: 'embedding', label: 'Embeddings' });

    const hasAudio = availableModels.some(m => m.category === 'audio');
    if (hasAudio) cats.push({ id: 'audio', label: 'Audio' });

    if (cats.length > 1) {
      cats.push({ id: 'all', label: 'All Models' });
    }

    return cats;
  }, [availableModels, isNvidia]);

  // Filtered models by category and search term
  const filteredModels = useMemo(() => {
    let list = availableModels;

    if (activeCategory === 'chat') {
      if (isNvidia) {
        list = list.filter(m => isNvidiaChatCompatible(m));
      } else {
        list = list.filter(m => m.supportsChat !== false && m.category !== 'embedding' && m.category !== 'audio' && m.category !== 'safety');
      }
    } else if (activeCategory === 'vision') {
      list = list.filter(m => m.supportsVision || m.capabilities?.vision || m.category === 'vision');
    } else if (activeCategory === 'reasoning') {
      list = list.filter(m => m.supportsReasoning || m.category === 'reasoning');
    } else if (activeCategory === 'free') {
      list = list.filter(m => m.freeEndpoint);
    } else if (activeCategory === 'embedding') {
      list = list.filter(m => m.category === 'embedding');
    } else if (activeCategory === 'audio') {
      list = list.filter(m => m.category === 'audio');
    } else if (activeCategory === 'translation') {
      list = list.filter(m => m.category === 'translation');
    } else if (activeCategory === 'safety') {
      list = list.filter(m => m.category === 'safety');
    }

    const q = search.toLowerCase().trim();
    if (!q) return list;
    return list.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q) ||
      (m.publisher && m.publisher.toLowerCase().includes(q)) ||
      (m.description && m.description.toLowerCase().includes(q))
    );
  }, [availableModels, search, isNvidia, activeCategory]);

  if (!slot) return null;

  const currentSelectedModel = slot === 'A' ? dualModelA : dualModelB;

  const handleSelectModel = (model: Model) => {
    if (slot === 'A') {
      setDualModelA(model, activeProvider);
      if (!dualNameA || dualNameA === 'AI 1') {
        setDualNameA(model.name || model.id);
      }
    } else {
      setDualModelB(model, activeProvider);
      if (!dualNameB || dualNameB === 'AI 2') {
        setDualNameB(model.name || model.id);
      }
    }
    onClose();
  };

  // Live Refresh Action Button
  const handleRefreshModels = async () => {
    if (!effectiveKeyForActiveProvider) {
      showNotification(`Connect an API key for ${activeProvider.name} to refresh live models.`);
      return;
    }

    setIsRefreshing(true);
    try {
      invalidateModelCache(activeProvider.id, effectiveKeyForActiveProvider);
      if (isNvidia) {
        invalidateNvidiaCache();
      }
      const adapter = ProviderRegistry.resolveAdapter(activeProvider);
      const freshModels = await adapter.getModels(effectiveKeyForActiveProvider, true);
      
      if (isSlotA) {
        setDualModelsA(freshModels);
      } else {
        setDualModelsB(freshModels);
      }
      showNotification(`Refreshed ${freshModels.length} models for AI ${isSlotA ? '1' : '2'} (${activeProvider.name}).`);
    } catch (err: any) {
      showNotification(err.message || 'Failed to refresh models from API.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Custom Model ID Entry
  const handleAddCustomModel = () => {
    const trimmed = customModelInput.trim();
    if (!trimmed) return;

    const newModel: Model = {
      id: trimmed,
      apiModelId: trimmed,
      name: trimmed,
      displayName: trimmed,
      provider: activeProvider.name,
      isDefault: true,
      supportsChat: true,
      capabilities: { text: true, streaming: true }
    };

    handleSelectModel(newModel);
    setShowCustomInput(false);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-[#101014] border border-[#222228] rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1E1E24]">
          <div className="flex items-center gap-2">
            <Zap className={`w-4 h-4 ${accentText}`} />
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-white flex items-center gap-2">
                <span>Select Model for AI {slot === 'A' ? '1' : '2'}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border ${badgeClass}`}>
                  Slot {slot === 'A' ? '1 (Blue)' : '2 (Pink)'}
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live Refresh Button */}
            <button
              type="button"
              onClick={handleRefreshModels}
              disabled={isRefreshing}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] bg-[#18181C] hover:bg-[#222228] text-neutral-300 hover:text-white border border-[#2B2B30] rounded-lg transition-colors cursor-pointer"
              title="Refresh models dynamically from API"
            >
              <RefreshCw className={`w-3 h-3 ${accentText} ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Provider Selector Strip */}
        <div className="px-5 py-2.5 border-b border-[#1E1E24] bg-[#0B0B0E]">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">
              Choose Provider
            </label>
            <span className="text-[10px] text-neutral-500 font-mono">
              {ProviderRegistry.getAll().length} Available
            </span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {ProviderRegistry.getAll().map((prov) => {
              const hasStoredKey = storedKeys.some(k => k.providerId === prov.id);
              const isCurrent = prov.id === selectedProviderId;
              return (
                <button
                  key={prov.id}
                  type="button"
                  onClick={() => setSelectedProviderId(prov.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    isCurrent
                      ? `bg-[#1E1E26] text-white border ${accentBorder} shadow-sm`
                      : 'bg-[#141418] text-neutral-400 hover:text-neutral-200 border border-[#24242A]'
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

        {/* Category Filter Tabs */}
        {categories.length > 1 && (
          <div className="flex items-center gap-1 overflow-x-auto px-5 py-2 border-b border-[#1A1A20] bg-[#0E0E12] no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-neutral-200 text-neutral-900 shadow-xs'
                    : 'bg-[#16161B] text-neutral-400 hover:text-neutral-200 hover:bg-[#202026]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Search Bar */}
        <div className="px-5 py-2 border-b border-[#1A1A20] bg-[#0E0E12]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${activeProvider.name} models...`}
              className="w-full bg-[#16161B] text-xs text-white placeholder-neutral-500 pl-8.5 pr-3 py-1.5 rounded-xl border border-[#26262E] focus:outline-none focus:border-neutral-500 transition-colors"
              autoFocus
            />
          </div>
        </div>

        {/* Model List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 max-h-[380px]" style={{ scrollbarWidth: 'thin' }}>
          {filteredModels.length === 0 ? (
            <div className="text-center py-10 text-neutral-400 text-xs sm:text-sm">
              No models found matching "{search}".
            </div>
          ) : (
            filteredModels.map((m) => {
              const isSelected = 
                (currentSelectedModel?.id === m.id || currentSelectedModel?.apiModelId === m.id) &&
                (activeProvider.id === slotProvider?.id);
              const isVision = Boolean(m.supportsVision || m.capabilities?.vision);
              const isReasoning = Boolean(m.supportsReasoning);
              const isFreeEndpoint = Boolean(m.freeEndpoint || isNvidia);

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectModel(m)}
                  className={`w-full flex items-start justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? `bg-neutral-200 text-neutral-900 font-medium border-neutral-300 shadow-sm`
                      : 'bg-[#131317] hover:bg-[#18181E] text-neutral-200 border-[#202026] hover:border-[#2E2E38]'
                  }`}
                >
                  <div className="min-w-0 pr-3 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-xs sm:text-sm truncate">
                        {m.displayName || m.name || m.id}
                      </span>
                      {m.publisher && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                          isSelected ? 'bg-neutral-300 text-neutral-900 font-medium' : 'bg-[#222228] text-neutral-400'
                        }`}>
                          {m.publisher}{m.parameterSize ? ` · ${m.parameterSize}` : ''}
                        </span>
                      )}
                      {m.contextWindow && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                          isSelected ? 'bg-neutral-300 text-neutral-800' : 'bg-[#222228] text-neutral-400'
                        }`}>
                          {Math.round(m.contextWindow / 1000)}k ctx
                        </span>
                      )}
                    </div>

                    <div className={`text-[11px] font-mono truncate mt-0.5 ${isSelected ? 'text-neutral-700' : 'text-neutral-500'}`}>
                      {m.apiModelId || m.id}
                    </div>

                    {/* Capability Badges */}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {isFreeEndpoint && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                          isSelected 
                            ? 'bg-emerald-600/20 text-emerald-900 border border-emerald-600/30' 
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          🟢 Free Endpoint · Rate limited
                        </span>
                      )}

                      {isReasoning && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                          isSelected ? 'bg-purple-300 text-purple-900' : 'bg-purple-500/10 text-purple-300'
                        }`}>
                          <Brain className="w-2.5 h-2.5" />
                          <span>Reasoning</span>
                        </span>
                      )}

                      {isVision && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                          isSelected ? 'bg-sky-300 text-sky-900' : 'bg-sky-500/10 text-sky-300'
                        }`}>
                          <Eye className="w-2.5 h-2.5" />
                          <span>Vision</span>
                        </span>
                      )}

                      {m.supportsChat && !isVision && !isReasoning && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                          isSelected ? 'bg-neutral-300 text-neutral-800' : 'bg-white/5 text-neutral-400'
                        }`}>
                          <MessageSquare className="w-2.5 h-2.5" />
                          <span>Chat</span>
                        </span>
                      )}

                      {m.description && m.description.includes('availability not verified') && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Unverified catalog
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2 mt-0.5">
                    {isSelected && (
                      <Check className="w-4 h-4 text-neutral-900 shrink-0" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Custom Model ID Entry */}
        <div className="px-5 py-3 border-t border-[#1E1E24] bg-[#0B0B0E]">
          {!showCustomInput ? (
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowCustomInput(true)}
                className={`flex items-center gap-1.5 text-xs ${accentText} hover:opacity-80 transition-opacity cursor-pointer`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Enter custom model ID</span>
              </button>
              <span className="text-[11px] text-neutral-500 font-mono">
                {filteredModels.length} models for {activeProvider.name}
              </span>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={customModelInput}
                onChange={(e) => setCustomModelInput(e.target.value)}
                placeholder="e.g. meta-llama/llama-3.3-70b-instruct or custom-model-id"
                className="flex-1 bg-[#17171A] border border-[#2B2B32] rounded-xl px-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-600 outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddCustomModel}
                disabled={!customModelInput.trim()}
                className={`px-3 py-1.5 ${accentBg} text-white text-xs font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer`}
              >
                Use
              </button>
              <button
                type="button"
                onClick={() => setShowCustomInput(false)}
                className="px-2.5 py-1.5 bg-[#1B1B20] text-neutral-400 hover:text-white text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
