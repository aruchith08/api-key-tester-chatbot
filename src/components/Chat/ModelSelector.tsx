import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import type { Model } from '../../types/provider';
import { Search, Zap, Check, X, Plus, RefreshCw, Eye, Brain, MessageSquare } from 'lucide-react';
import { ProviderRegistry } from '../../providers/registry';
import { isNvidiaChatCompatible, invalidateNvidiaCache } from '../../providers/nvidia/nvidiaBuildCatalog';
import { invalidateModelCache } from '../../providers/modelCache';

export const ModelSelector: React.FC = () => {
  const {
    apiKey,
    isModelSelectorOpen,
    setModelSelectorOpen,
    models,
    setModels,
    selectedModel,
    setSelectedModel,
    selectedProvider,
    showNotification
  } = useAppStore();

  const [search, setSearch] = useState('');
  const [customModelInput, setCustomModelInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('chat');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isNvidia = selectedProvider?.id === 'nvidia' || selectedProvider?.id === 'nvidia-nim';

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

    // Dynamic category tabs for all other providers based on models present
    const cats: { id: string; label: string }[] = [{ id: 'chat', label: 'Chat' }];

    const hasVision = models.some(m => m.supportsVision || m.capabilities?.vision || m.category === 'vision');
    if (hasVision) cats.push({ id: 'vision', label: 'Vision' });

    const hasReasoning = models.some(m => m.supportsReasoning || m.category === 'reasoning');
    if (hasReasoning) cats.push({ id: 'reasoning', label: 'Reasoning' });

    const hasFree = models.some(m => m.freeEndpoint);
    if (hasFree) cats.push({ id: 'free', label: 'Free Models' });

    const hasEmbedding = models.some(m => m.category === 'embedding');
    if (hasEmbedding) cats.push({ id: 'embedding', label: 'Embeddings' });

    const hasAudio = models.some(m => m.category === 'audio');
    if (hasAudio) cats.push({ id: 'audio', label: 'Audio' });

    if (cats.length > 1) {
      cats.push({ id: 'all', label: 'All Models' });
    }

    return cats;
  }, [models, isNvidia]);

  const filtered = useMemo(() => {
    let list = models;

    // Apply category tab filtering across all providers
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
  }, [models, search, isNvidia, activeCategory]);

  if (!isModelSelectorOpen) return null;

  const handleSelect = (model: Model) => {
    setSelectedModel(model);
    setModelSelectorOpen(false);
  };

  const handleRefreshModels = async () => {
    if (!selectedProvider || !apiKey) {
      showNotification('Please connect an API key first.');
      return;
    }

    setIsRefreshing(true);
    try {
      invalidateModelCache(selectedProvider.id);
      if (isNvidia) {
        invalidateNvidiaCache();
      }
      const adapter = ProviderRegistry.resolveAdapter(selectedProvider);
      const freshModels = await adapter.getModels(apiKey, true);
      setModels(freshModels, selectedModel, 'live');
      showNotification(`Refreshed ${freshModels.length} models from ${selectedProvider.name}.`);
    } catch (err: any) {
      showNotification(err.message || 'Failed to refresh models from API.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddCustomModel = () => {
    const trimmed = customModelInput.trim();
    if (!trimmed) return;

    const newModel: Model = {
      id: trimmed,
      apiModelId: trimmed,
      name: trimmed,
      displayName: trimmed,
      isDefault: true,
      supportsChat: true,
      capabilities: { text: true, streaming: true }
    };
    setSelectedModel(newModel);
    if (!models.some(m => m.id === trimmed || m.apiModelId === trimmed)) {
      setModels([newModel, ...models], newModel, 'live');
    }
    setShowCustomInput(false);
    setModelSelectorOpen(false);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in"
      onClick={() => setModelSelectorOpen(false)}
    >
      <div 
        className="relative w-full max-w-lg bg-[#121214] border border-[#27272C] rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col max-h-[88vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#202024]">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-medium text-white">Select Model</h3>
            {selectedProvider && (
              <span className="text-[11px] text-neutral-400 font-mono">
                ({selectedProvider.name})
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Refresh Models Action Button */}
            <button
              type="button"
              onClick={handleRefreshModels}
              disabled={isRefreshing}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] bg-[#18181C] hover:bg-[#222228] text-neutral-300 hover:text-white border border-[#2B2B30] rounded-lg transition-colors cursor-pointer"
              title="Refresh models dynamically from API"
            >
              <RefreshCw className={`w-3 h-3 text-emerald-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            <button
              type="button"
              onClick={() => setModelSelectorOpen(false)}
              className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Tabs across all providers */}
        {categories.length > 1 && (
          <div className="flex items-center gap-1 overflow-x-auto py-2 border-b border-[#1C1C20] no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? 'bg-neutral-200 text-neutral-900 shadow-xs'
                    : 'bg-[#18181C] text-neutral-400 hover:text-neutral-200 hover:bg-[#202026]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="my-2.5">
          <div className="relative flex items-center w-full bg-[#17171A] border border-[#26262B] rounded-xl px-3 py-2 text-xs">
            <Search className="w-3.5 h-3.5 text-neutral-500 mr-2 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search available models..."
              className="w-full bg-transparent text-neutral-200 placeholder-neutral-500 outline-none"
              autoFocus
            />
          </div>
        </div>

        {/* Model List */}
        <div className="flex flex-col gap-1.5 overflow-y-auto pr-1 flex-1 max-h-[380px]" style={{ scrollbarWidth: 'thin' }}>
          {filtered.map((m) => {
            const isSelected = selectedModel?.id === m.id;
            const isVision = Boolean(m.supportsVision || m.capabilities?.vision);
            const isReasoning = Boolean(m.supportsReasoning);
            const isFreeEndpoint = Boolean(m.freeEndpoint || isNvidia);

            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelect(m)}
                className={`flex items-start justify-between p-3 rounded-xl text-left transition-all ${
                  isSelected
                    ? 'bg-neutral-200 text-neutral-900 font-medium'
                    : 'bg-[#161619] hover:bg-[#1E1E22] text-neutral-200 border border-[#202024]'
                }`}
              >
                <div className="flex-1 mr-2 overflow-hidden">
                  <div className="text-xs font-medium truncate flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold">{m.displayName || m.name || m.id}</span>
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
                    {m.id}
                  </div>

                  {/* Capability Chips & Free Endpoint Badge */}
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
                {isSelected && <Check className="w-4 h-4 text-neutral-900 shrink-0 mt-0.5" />}
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-8 text-xs text-neutral-500">
              No models found matching "{search}"
            </div>
          )}
        </div>

        {/* Manual Model ID entry toggle */}
        <div className="pt-3 border-t border-[#202024] mt-2">
          {!showCustomInput ? (
            <button
              type="button"
              onClick={() => setShowCustomInput(true)}
              className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors w-full justify-center py-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Enter custom model ID</span>
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={customModelInput}
                onChange={(e) => setCustomModelInput(e.target.value)}
                placeholder="e.g. openai/gpt-oss-20b or meta/llama-3.2-90b-vision-instruct"
                className="flex-1 bg-[#17171A] border border-[#2B2B32] rounded-xl px-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-600 outline-none"
              />
              <button
                type="button"
                onClick={handleAddCustomModel}
                disabled={!customModelInput.trim()}
                className="px-3 py-1.5 bg-emerald-500 text-black text-xs font-medium rounded-xl hover:bg-emerald-400 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Use
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
