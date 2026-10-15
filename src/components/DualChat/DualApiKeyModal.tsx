import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import { ProviderRegistry } from '../../providers/registry';
import { ProviderDetector } from '../../providers/detection';
import { ApiKeyStorage } from '../../services/apiKeyStorage';
import type { StoredApiKey } from '../../types/storage';
import { 
  KeyRound, 
  Database, 
  Sparkles, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Sliders
} from 'lucide-react';

interface DualApiKeyModalProps {
  slot: 'A' | 'B' | null;
  onClose: () => void;
  onOpenModelModal?: () => void;
}

export const DualApiKeyModal: React.FC<DualApiKeyModalProps> = ({
  slot,
  onClose,
  onOpenModelModal
}) => {
  const {
    storedKeys,
    refreshStoredKeys,
    showNotification,
    dualApiKeyA,
    dualApiKeyB,
    dualProviderA,
    dualProviderB,
    dualModelA,
    dualModelB,
    setDualApiKeyA,
    setDualApiKeyB,
    setDualProviderA,
    setDualProviderB,
    setDualModelA,
    setDualModelB,
    setDualNameA,
    setDualNameB
  } = useAppStore();

  const isSlotA = slot === 'A';
  const slotName = isSlotA ? 'AI 1' : 'AI 2';
  const currentProvider = isSlotA ? dualProviderA : dualProviderB;
  const currentModel = isSlotA ? dualModelA : dualModelB;
  const currentKey = isSlotA ? dualApiKeyA : dualApiKeyB;

  const [inputKey, setInputKey] = useState('');
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-detect provider from inputKey
  const detectedResolution = useMemo(() => {
    if (!inputKey.trim()) return null;
    return ProviderDetector.detect(inputKey.trim());
  }, [inputKey]);

  // Provider to use: manually selected override or detected provider
  const effectiveProvider = useMemo(() => {
    if (selectedProviderId) {
      return ProviderRegistry.getById(selectedProviderId) || null;
    }
    return detectedResolution?.provider || null;
  }, [selectedProviderId, detectedResolution]);

  if (!slot) return null;

  // 1-Click Connect a Key from Key Vault
  const handleConnectStoredKey = async (item: StoredApiKey) => {
    setIsLoading(true);
    setError(null);
    try {
      const provider = ProviderRegistry.getById(item.providerId);
      if (!provider) throw new Error(`Provider "${item.providerId}" not found in registry.`);

      // Discover default model or curated fallback
      const models = ProviderRegistry.getCuratedModels(provider.id);
      const chosenModel = models.find(m => m.id === provider.defaultModelId || m.isDefault) || models[0] || {
        id: provider.defaultModelId || 'default',
        name: provider.defaultModelId || `${provider.name} Default`,
        provider: provider.name
      };

      if (isSlotA) {
        setDualApiKeyA(item.apiKey);
        setDualProviderA(provider);
        setDualModelA(chosenModel, provider);
        setDualNameA(provider.name);
      } else {
        setDualApiKeyB(item.apiKey);
        setDualProviderB(provider);
        setDualModelB(chosenModel, provider);
        setDualNameB(provider.name);
      }

      ApiKeyStorage.update(item.id, { lastUsedAt: Date.now() });
      refreshStoredKeys();
      showNotification(`Connected ${slotName} to ${provider.name} (${chosenModel.name || chosenModel.id})!`);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to connect stored key.');
    } finally {
      setIsLoading(false);
    }
  };

  // Connect a New API Key pasted by the user
  const handleConnectNewKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawKey = inputKey.trim();
    if (!rawKey) {
      setError('Please enter or paste an API key.');
      return;
    }

    const provider = effectiveProvider || ProviderRegistry.getAll()[0];
    setIsLoading(true);
    setError(null);

    try {
      // Validate key connection via provider adapter
      const adapter = ProviderRegistry.resolveAdapter(provider);
      const result = await adapter.validateConnection(rawKey);

      if (!result.success) {
        throw new Error(result.error?.message || `Authentication rejected by ${provider.name}. Check your key.`);
      }

      // Discover models or fallback to curated list
      let models = result.models || [];
      if (models.length === 0) {
        models = ProviderRegistry.getCuratedModels(provider.id);
      }

      const chosenModel = models.find(m => m.id === provider.defaultModelId || m.isDefault) || models[0] || {
        id: provider.defaultModelId || 'default',
        name: provider.defaultModelId || `${provider.name} Default`,
        provider: provider.name
      };

      // Save key into storage vault
      ApiKeyStorage.save({
        providerId: provider.id,
        apiKey: rawKey,
        nickname: `${provider.name} (${slotName})`,
        target: 'localStorage',
        lastStatus: 'valid',
        lastLatencyMs: result.latencyMs
      });
      refreshStoredKeys();

      // Configure Dual Slot
      if (isSlotA) {
        setDualApiKeyA(rawKey);
        setDualProviderA(provider);
        setDualModelA(chosenModel, provider);
        setDualNameA(provider.name);
      } else {
        setDualApiKeyB(rawKey);
        setDualProviderB(provider);
        setDualModelB(chosenModel, provider);
        setDualNameB(provider.name);
      }

      showNotification(`Connected ${slotName} to ${provider.name} (${chosenModel.name || chosenModel.id})!`);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to authenticate key.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-lg bg-[#0F0F13] border border-[#23232A] rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E1E24] bg-[#121217]">
          <div className="flex items-center gap-2.5">
            <span className={`w-3 h-3 rounded-full ${
              isSlotA 
                ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]' 
                : 'bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.8)]'
            }`} />
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <span>Connect API Key for {slotName}</span>
                <span className={`px-2 py-0.2 rounded-full text-[10px] font-mono uppercase font-bold border ${
                  isSlotA 
                    ? 'bg-blue-950/60 text-blue-300 border-blue-800/40' 
                    : 'bg-pink-950/60 text-pink-300 border-pink-800/40'
                }`}>
                  Slot {slot}
                </span>
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Simply pick a stored key or paste a key to start talking.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/50 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto scrollbar-thin">
          {/* Error Banner */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Currently Connected Info (if any) */}
          {currentProvider && (
            <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
              isSlotA 
                ? 'bg-blue-950/20 border-blue-500/30 text-blue-200' 
                : 'bg-pink-950/20 border-pink-500/30 text-pink-200'
            }`}>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className={`w-4 h-4 ${isSlotA ? 'text-blue-400' : 'text-pink-400'}`} />
                <div>
                  <div className="text-xs font-semibold text-white">
                    Currently: {currentProvider.name}
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    Model: {currentModel?.name || currentModel?.id || 'Default'}
                  </div>
                </div>
              </div>

              {onOpenModelModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenModelModal();
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#181820] hover:bg-[#22222C] border border-[#2A2A36] text-neutral-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  <Sliders className="w-3 h-3" />
                  <span>Select Model</span>
                </button>
              )}
            </div>
          )}

          {/* Option A: 1-Click Connect Stored Keys */}
          {storedKeys.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Saved Keys ({storedKeys.length})</span>
                </label>
                <span className="text-[10px] text-neutral-500 font-mono">1-Click Connect</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {storedKeys.map((item) => {
                  const prov = ProviderRegistry.getById(item.providerId);
                  const isCurrent = currentKey === item.apiKey;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleConnectStoredKey(item)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-50 ${
                        isCurrent
                          ? isSlotA 
                            ? 'bg-blue-950/40 border-blue-500 text-white shadow-sm' 
                            : 'bg-pink-950/40 border-pink-500 text-white shadow-sm'
                          : 'bg-[#15151A] hover:bg-[#1C1C22] border-[#25252E] hover:border-neutral-500 text-neutral-200'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-medium truncate flex items-center gap-1.5">
                          <span>{prov?.name || item.providerId}</span>
                          {isCurrent && <span className="text-[10px] text-emerald-400 font-bold">Active</span>}
                        </div>
                        <div className="text-[10px] text-neutral-400 truncate font-mono">
                          {item.name || item.maskedKey}
                        </div>
                      </div>

                      <ArrowRight className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Divider */}
          {storedKeys.length > 0 && (
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#222228]" />
              </div>
              <span className="relative px-3 bg-[#0F0F13] text-[10px] uppercase font-mono tracking-widest text-neutral-500">
                Or Add New Key
              </span>
            </div>
          )}

          {/* Option B: Paste API Key */}
          <form onSubmit={handleConnectNewKey} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                Paste API Key
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="Paste your API key (e.g. gsk_..., sk-ant-..., AIza...)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#15151A] border border-[#262630] focus:border-neutral-400 text-xs text-white placeholder-neutral-500 outline-none transition-all pr-10 font-mono"
                  disabled={isLoading}
                  autoComplete="off"
                />
                <KeyRound className="w-4 h-4 text-neutral-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Provider detection or manual override */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <div className="flex items-center gap-1.5 text-neutral-400">
                <span className="text-[11px]">Provider:</span>
                {effectiveProvider ? (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {effectiveProvider.name}
                  </span>
                ) : (
                  <span className="text-neutral-500 italic">Auto-detecting...</span>
                )}
              </div>

              {/* Manual Provider Selector Fallback */}
              <select
                value={selectedProviderId}
                onChange={(e) => setSelectedProviderId(e.target.value)}
                disabled={isLoading}
                className="bg-[#181820] text-neutral-300 border border-[#272733] rounded-lg px-2 py-1 text-[11px] focus:outline-none cursor-pointer"
              >
                <option value="">Auto-Detect Provider</option>
                {ProviderRegistry.getAll().map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !inputKey.trim()}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 ${
                isSlotA
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30'
                  : 'bg-pink-600 hover:bg-pink-500 text-white shadow-lg shadow-pink-900/30'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting & Testing Key...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Connect API Key for {slotName}</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DualApiKeyModal;
