import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import type { Model } from '../../types/provider';
import { Search, Zap, Check, X, Plus } from 'lucide-react';

export const ModelSelector: React.FC = () => {
  const {
    isModelSelectorOpen,
    setModelSelectorOpen,
    models,
    selectedModel,
    setSelectedModel,
    selectedProvider
  } = useAppStore();

  const [search, setSearch] = useState('');
  const [customModelInput, setCustomModelInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return models;
    return models.filter(m => 
      m.name.toLowerCase().includes(q) || 
      m.id.toLowerCase().includes(q) || 
      (m.description && m.description.toLowerCase().includes(q))
    );
  }, [models, search]);

  if (!isModelSelectorOpen) return null;

  const handleSelect = (model: Model) => {
    setSelectedModel(model);
    setModelSelectorOpen(false);
  };

  const handleAddCustomModel = () => {
    const trimmed = customModelInput.trim();
    if (!trimmed) return;

    const newModel: Model = {
      id: trimmed,
      name: trimmed,
      isDefault: true
    };
    setSelectedModel(newModel);
    setShowCustomInput(false);
    setModelSelectorOpen(false);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in"
      onClick={() => setModelSelectorOpen(false)}
    >
      <div 
        className="relative w-full max-w-md bg-[#121214] border border-[#27272C] rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#202024]">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-medium text-white">Select Model</h3>
            {selectedProvider && (
              <span className="text-[11px] text-neutral-500 font-mono">
                ({selectedProvider.name})
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setModelSelectorOpen(false)}
            className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="my-3">
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
        <div className="flex flex-col gap-1.5 overflow-y-auto pr-1 flex-1 max-h-[300px]" style={{ scrollbarWidth: 'thin' }}>
          {filtered.map((m) => {
            const isSelected = selectedModel?.id === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelect(m)}
                className={`flex items-start justify-between p-2.5 rounded-xl text-left transition-all ${
                  isSelected
                    ? 'bg-neutral-200 text-neutral-900 font-medium'
                    : 'bg-[#161619] hover:bg-[#1E1E22] text-neutral-200 border border-[#202024]'
                }`}
              >
                <div className="truncate mr-2">
                  <div className="text-xs font-medium truncate flex items-center gap-1.5">
                    <span>{m.name || m.id}</span>
                    {m.contextWindow && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                        isSelected ? 'bg-neutral-300 text-neutral-800' : 'bg-[#222228] text-neutral-400'
                      }`}>
                        {Math.round(m.contextWindow / 1000)}k ctx
                      </span>
                    )}
                  </div>
                  <div className={`text-[10px] font-mono truncate mt-0.5 ${isSelected ? 'text-neutral-600' : 'text-neutral-500'}`}>
                    {m.id}
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-neutral-900 shrink-0 mt-0.5" />}
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-6 text-xs text-neutral-500">
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
              className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors w-full justify-center py-1"
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
                placeholder="e.g. gpt-4o-mini or llama3"
                className="flex-1 bg-[#17171A] border border-[#2B2B32] rounded-xl px-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-600 outline-none"
              />
              <button
                type="button"
                onClick={handleAddCustomModel}
                disabled={!customModelInput.trim()}
                className="px-3 py-1.5 bg-emerald-500 text-black text-xs font-medium rounded-xl hover:bg-emerald-400 transition-colors disabled:opacity-50"
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
