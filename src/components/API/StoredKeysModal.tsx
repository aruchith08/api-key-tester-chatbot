import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import { ApiKeyStorage } from '../../services/apiKeyStorage';
import { ProviderDetector } from '../../providers/detection';
import { ProviderRegistry } from '../../providers/registry';
import type { StorageTarget, StoredApiKey } from '../../types/storage';
import {
  X,
  KeyRound,
  Database,
  HardDrive,
  Zap,
  Check,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Edit2,
  Plus,
  Search,
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export const StoredKeysModal: React.FC = () => {
  const {
    isKeyVaultOpen,
    setKeyVaultOpen,
    storedKeys,
    refreshStoredKeys,
    connectStoredKey,
    apiKey: activeKey,
    selectedProvider: activeProvider,
    showNotification
  } = useAppStore();

  const [activeFilter, setActiveFilter] = useState<'all' | 'localStorage' | 'sessionStorage'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [revealedKeyIds, setRevealedKeyIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Add new key form state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newKeyInput, setNewKeyInput] = useState('');
  const [newNameInput, setNewNameInput] = useState('');
  const [newStorageTarget, setNewStorageTarget] = useState<StorageTarget>('localStorage');
  const [addError, setAddError] = useState<string | null>(null);

  // Edit nickname state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Import / Export state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Detected provider for the new key input
  const detectedNewProvider = useMemo(() => {
    if (!newKeyInput.trim()) return null;
    const res = ProviderDetector.detect(newKeyInput.trim());
    return res.provider;
  }, [newKeyInput]);

  const filteredKeys = useMemo(() => {
    return storedKeys.filter((k) => {
      const matchesFilter = activeFilter === 'all' || k.storageTarget === activeFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        k.name.toLowerCase().includes(q) ||
        k.providerName.toLowerCase().includes(q) ||
        k.providerId.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [storedKeys, activeFilter, searchQuery]);

  if (!isKeyVaultOpen) return null;

  const toggleRevealKey = (id: string) => {
    setRevealedKeyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopyKey = (id: string, keyVal: string) => {
    navigator.clipboard.writeText(keyVal);
    setCopiedId(id);
    setTimeout(() => setCopiedId((curr) => (curr === id ? null : curr)), 2000);
  };

  const handleConnect = async (keyItem: StoredApiKey) => {
    setConnectingId(keyItem.id);
    const res = await connectStoredKey(keyItem.id);
    setConnectingId(null);
    if (res.success) {
      setKeyVaultOpen(false);
    } else {
      showNotification(res.error || 'Failed to connect stored key');
    }
  };

  const handleTestKey = async (keyItem: StoredApiKey) => {
    setTestingId(keyItem.id);
    try {
      let provider = ProviderRegistry.getById(keyItem.providerId);
      if (!provider && keyItem.customConfig?.baseUrl) {
        provider = ProviderRegistry.createCustomProvider({
          baseUrl: keyItem.customConfig.baseUrl,
          chatEndpoint: keyItem.customConfig.chatEndpoint,
          authHeader: keyItem.customConfig.authHeader,
          customHeaders: keyItem.customConfig.customHeaders,
          modelId: keyItem.customConfig.manualModelId
        });
      } else if (!provider) {
        const found = ProviderRegistry.search(keyItem.providerName);
        if (found.length > 0) provider = found[0];
      }

      if (!provider) {
        ApiKeyStorage.update(keyItem.id, { lastStatus: 'invalid' });
        refreshStoredKeys();
        setTestingId(null);
        return;
      }

      const adapter = ProviderRegistry.resolveAdapter(provider);
      const res = await adapter.validateConnection(keyItem.apiKey);

      if (res.success) {
        ApiKeyStorage.update(keyItem.id, {
          lastStatus: 'valid',
          lastLatencyMs: res.latencyMs,
          lastValidatedAt: Date.now()
        });
        showNotification(`✓ ${keyItem.name} verified successfully (${res.latencyMs || 0}ms)!`);
      } else {
        ApiKeyStorage.update(keyItem.id, {
          lastStatus: 'invalid',
          lastLatencyMs: res.latencyMs,
          lastValidatedAt: Date.now()
        });
        showNotification(`✗ ${keyItem.name} test failed: ${res.error?.message || 'Unauthorized'}`);
      }
    } catch (e: any) {
      ApiKeyStorage.update(keyItem.id, { lastStatus: 'invalid' });
      showNotification(`Test error: ${e.message || 'Network error'}`);
    } finally {
      refreshStoredKeys();
      setTestingId(null);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Remove "${name}" from browser storage?`)) {
      ApiKeyStorage.remove(id);
      refreshStoredKeys();
      showNotification(`Removed "${name}" from storage.`);
    }
  };

  const handleSaveEditName = (id: string) => {
    if (editingName.trim()) {
      ApiKeyStorage.update(id, { name: editingName.trim() });
      refreshStoredKeys();
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleSaveNewKey = async (connectImmediately: boolean = false) => {
    const rawKey = newKeyInput.trim();
    if (!rawKey) {
      setAddError('Please enter an API key.');
      return;
    }

    const provider = detectedNewProvider || ProviderRegistry.getAll()[0];
    const name = newNameInput.trim() || `${provider.name} Key`;

    const saved = ApiKeyStorage.save({
      name,
      providerId: provider.id,
      providerName: provider.name,
      apiKey: rawKey,
      storageTarget: newStorageTarget
    });

    refreshStoredKeys();
    setNewKeyInput('');
    setNewNameInput('');
    setIsAddingNew(false);
    setAddError(null);

    if (connectImmediately) {
      handleConnect(saved);
    } else {
      showNotification(`Saved "${name}" into ${newStorageTarget === 'localStorage' ? 'Local Storage' : 'Session Storage'}.`);
    }
  };

  const handleExport = () => {
    const jsonStr = ApiKeyStorage.exportJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arh_stored_api_keys_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Exported stored API keys backup JSON.');
  };

  const handleImport = () => {
    if (!importJsonText.trim()) return;
    const res = ApiKeyStorage.importJson(importJsonText);
    refreshStoredKeys();
    setImportStatus(`Imported ${res.imported} key(s) (${res.errors} skipped/invalid).`);
    setTimeout(() => {
      setIsImportModalOpen(false);
      setImportJsonText('');
      setImportStatus(null);
      showNotification(`Imported ${res.imported} keys.`);
    }, 1200);
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear ALL stored keys from your browser storage? This cannot be undone.')) {
      ApiKeyStorage.clearAll();
      refreshStoredKeys();
      showNotification('Cleared all stored keys.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xs transition-opacity animate-fade-in"
      onClick={() => setKeyVaultOpen(false)}
    >
      <div
        className="relative w-full sm:max-w-2xl bg-[#111113] border-t sm:border border-[#26262B] rounded-t-2xl sm:rounded-2xl shadow-2xl shadow-black overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-5 pb-3 border-b border-[#1E1E22]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">Stored API Keys</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-800 text-neutral-300 border border-neutral-700">
                  {storedKeys.length} Saved
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Saved in your browser storage for instant 1-click connection.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsAddingNew(!isAddingNew)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl text-xs transition-colors shadow-sm"
              title="Add API Key to Vault"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingNew ? 'Close Form' : 'Add Key'}</span>
            </button>

            <button
              type="button"
              onClick={() => setKeyVaultOpen(false)}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub-bar: Search, Filter Tabs & Utility Actions */}
        <div className="px-5 sm:px-6 py-2.5 bg-[#141417] border-b border-[#1E1E22] flex flex-wrap items-center justify-between gap-2.5">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Search stored keys..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-[#0D0D0F] border border-[#26262B] rounded-lg text-xs text-neutral-200 placeholder-neutral-500 focus:outline-hidden focus:border-emerald-500/50"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-[#0D0D0F] p-0.5 border border-[#26262B] rounded-lg text-[11px]">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-2 py-0.5 rounded-md transition-colors ${
                activeFilter === 'all'
                  ? 'bg-neutral-800 text-white font-medium'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              All ({storedKeys.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('localStorage')}
              className={`px-2 py-0.5 rounded-md transition-colors ${
                activeFilter === 'localStorage'
                  ? 'bg-neutral-800 text-emerald-400 font-medium'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Persistent across browser restarts"
            >
              Local ({storedKeys.filter((k) => k.storageTarget === 'localStorage').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('sessionStorage')}
              className={`px-2 py-0.5 rounded-md transition-colors ${
                activeFilter === 'sessionStorage'
                  ? 'bg-neutral-800 text-sky-400 font-medium'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Temporary for this tab session only"
            >
              Session ({storedKeys.filter((k) => k.storageTarget === 'sessionStorage').length})
            </button>
          </div>

          {/* Utilities: Export & Import */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleExport}
              disabled={storedKeys.length === 0}
              className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-30"
              title="Export backup JSON"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-white/5 rounded-lg transition-colors"
              title="Import keys from JSON"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
            {storedKeys.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Clear all stored keys"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Main Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-4" style={{ scrollbarWidth: 'thin' }}>
          {/* Add Key Inline Form Drawer */}
          {isAddingNew && (
            <div className="p-4 bg-[#161619] border border-emerald-500/30 rounded-xl flex flex-col gap-3 animate-fade-in shadow-lg shadow-black/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Store New API Key</span>
                </span>
                <span className="text-[11px] text-neutral-400">Auto-detects AI provider</span>
              </div>

              {/* Key Input */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-neutral-300">API Key String</label>
                <input
                  type="password"
                  value={newKeyInput}
                  onChange={(e) => {
                    setNewKeyInput(e.target.value);
                    setAddError(null);
                  }}
                  placeholder="Paste your API key (e.g. sk-..., gsk_..., nvapi-...)"
                  className="w-full px-3 py-2 bg-[#0D0D0F] border border-[#2B2B32] rounded-xl text-xs text-neutral-100 placeholder-neutral-500 font-mono focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* Detected Provider Badge */}
              {detectedNewProvider && (
                <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Detected Provider: <strong>{detectedNewProvider.name}</strong>
                  </span>
                </div>
              )}

              {/* Nickname & Storage Target */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-neutral-300">Label / Nickname (Optional)</label>
                  <input
                    type="text"
                    value={newNameInput}
                    onChange={(e) => setNewNameInput(e.target.value)}
                    placeholder={detectedNewProvider ? `${detectedNewProvider.name} Key` : 'e.g. Work Claude, Personal Groq'}
                    className="w-full px-3 py-1.5 bg-[#0D0D0F] border border-[#2B2B32] rounded-xl text-xs text-neutral-200 placeholder-neutral-500 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-neutral-300">Storage Target</label>
                  <select
                    value={newStorageTarget}
                    onChange={(e) => setNewStorageTarget(e.target.value as StorageTarget)}
                    className="w-full px-3 py-1.5 bg-[#0D0D0F] border border-[#2B2B32] rounded-xl text-xs text-neutral-200 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="localStorage">Local Storage (Persistent)</option>
                    <option value="sessionStorage">Session Storage (Current Tab Only)</option>
                  </select>
                </div>
              </div>

              {addError && <p className="text-xs text-red-400">{addError}</p>}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveNewKey(false)}
                  disabled={!newKeyInput.trim()}
                  className="px-3 py-1.5 bg-[#222228] hover:bg-[#2C2C34] text-neutral-200 border border-[#353540] rounded-xl text-xs transition-colors disabled:opacity-40"
                >
                  Save to Vault
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveNewKey(true)}
                  disabled={!newKeyInput.trim()}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl text-xs transition-colors disabled:opacity-40 shadow-sm"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Save & Connect Right Away</span>
                </button>
              </div>
            </div>
          )}

          {/* Stored Keys List */}
          {filteredKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500 mb-3">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-neutral-200">No Stored API Keys Found</h3>
              <p className="text-xs text-neutral-400 max-w-sm mt-1 mb-4">
                {searchQuery
                  ? 'No keys match your search criteria. Try a different query.'
                  : 'Add your AI API keys to browser storage once and connect to them right away with a single click anytime.'}
              </p>
              {!searchQuery && !isAddingNew && (
                <button
                  type="button"
                  onClick={() => setIsAddingNew(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl text-xs transition-colors shadow-md shadow-emerald-950"
                >
                  <Plus className="w-4 h-4" />
                  <span>Store Your First API Key</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {filteredKeys.map((keyItem) => {
                const isCurrentlyActive =
                  Boolean(activeKey) &&
                  activeKey === keyItem.apiKey &&
                  activeProvider?.id === keyItem.providerId;
                const isConnecting = connectingId === keyItem.id;
                const isTesting = testingId === keyItem.id;
                const isRevealed = revealedKeyIds.has(keyItem.id);
                const isEditing = editingId === keyItem.id;

                return (
                  <div
                    key={keyItem.id}
                    className={`group relative p-3.5 rounded-xl border transition-all ${
                      isCurrentlyActive
                        ? 'bg-[#151B17] border-emerald-500/40 shadow-sm shadow-emerald-950/20'
                        : 'bg-[#141417] hover:bg-[#18181C] border-[#25252B] hover:border-[#33333C]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Left: Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {/* Nickname / Title */}
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                autoFocus
                                className="px-2 py-0.5 bg-[#0D0D0F] border border-emerald-500 rounded text-xs text-white"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEditName(keyItem.id)}
                                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="text-xs text-neutral-400 hover:text-neutral-200"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs sm:text-sm font-semibold text-neutral-100 truncate">
                                {keyItem.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(keyItem.id);
                                  setEditingName(keyItem.name);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-0.5 text-neutral-500 hover:text-neutral-300 transition-opacity"
                                title="Rename key"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          {/* Provider Badge */}
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#1F1F24] text-neutral-300 border border-[#2D2D35]">
                            {keyItem.providerName}
                          </span>

                          {/* Storage Target Badge */}
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              keyItem.storageTarget === 'localStorage'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            }`}
                            title={
                              keyItem.storageTarget === 'localStorage'
                                ? 'Preserved in browser LocalStorage'
                                : 'Preserved in browser SessionStorage'
                            }
                          >
                            <HardDrive className="w-2.5 h-2.5" />
                            <span>{keyItem.storageTarget === 'localStorage' ? 'Local' : 'Session'}</span>
                          </span>

                          {/* Currently Active Badge */}
                          {isCurrentlyActive && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-black animate-pulse">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                              <span>Active Connected</span>
                            </span>
                          )}
                        </div>

                        {/* Masked Key Display with Reveal & Copy */}
                        <div className="flex items-center gap-2 mt-1.5 font-mono text-xs text-neutral-400">
                          <span className="bg-[#0A0A0C] px-2 py-1 rounded border border-[#222228] text-[11px] text-neutral-300 tracking-wider">
                            {isRevealed ? keyItem.apiKey : keyItem.maskedKey}
                          </span>

                          <button
                            type="button"
                            onClick={() => toggleRevealKey(keyItem.id)}
                            className="p-1 text-neutral-500 hover:text-neutral-200 transition-colors"
                            title={isRevealed ? 'Hide API key' : 'Reveal API key'}
                          >
                            {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyKey(keyItem.id, keyItem.apiKey)}
                            className="p-1 text-neutral-500 hover:text-neutral-200 transition-colors relative"
                            title="Copy full key"
                          >
                            {copiedId === keyItem.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Validation Status / Latency */}
                          {keyItem.lastStatus === 'valid' && (
                            <span className="text-[10px] text-emerald-400/90 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-400" />
                              <span>Valid {keyItem.lastLatencyMs ? `(${keyItem.lastLatencyMs}ms)` : ''}</span>
                            </span>
                          )}
                          {keyItem.lastStatus === 'invalid' && (
                            <span className="text-[10px] text-red-400 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              <span>Invalid or Rejected</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1.5 shrink-0 self-center">
                        {/* Test Button */}
                        <button
                          type="button"
                          onClick={() => handleTestKey(keyItem)}
                          disabled={isTesting || isConnecting}
                          className="px-2.5 py-1.5 bg-[#1C1C20] hover:bg-[#25252B] text-neutral-300 border border-[#2C2C33] rounded-xl text-xs font-medium transition-colors disabled:opacity-40"
                          title="Test key validity with provider"
                        >
                          {isTesting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                          ) : (
                            <span>Test</span>
                          )}
                        </button>

                        {/* Connect Button */}
                        <button
                          type="button"
                          onClick={() => handleConnect(keyItem)}
                          disabled={isConnecting || isTesting}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            isCurrentlyActive
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                              : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-sm shadow-emerald-950'
                          } disabled:opacity-50`}
                          title="Connect to this provider right away"
                        >
                          {isConnecting ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Connecting...</span>
                            </>
                          ) : (
                            <>
                              <Zap className="w-3 h-3 fill-current" />
                              <span>{isCurrentlyActive ? 'Reconnect' : 'Connect'}</span>
                            </>
                          )}
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDelete(keyItem.id, keyItem.name)}
                          className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors ml-0.5"
                          title="Delete from storage"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 border-t border-[#1E1E22] bg-[#0E0E10] flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Client-side only. Keys never leave your browser.</span>
          </div>

          <button
            type="button"
            onClick={() => setKeyVaultOpen(false)}
            className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>

        {/* Import JSON Sub-modal */}
        {isImportModalOpen && (
          <div className="absolute inset-0 z-20 bg-black/90 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#25252B]">
                <h3 className="text-sm font-semibold text-white">Import API Keys Backup</h3>
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="p-1 text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-neutral-400 mt-2">
                Paste the exported JSON content below to restore your keys into browser storage:
              </p>
              <textarea
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                rows={8}
                placeholder="Paste backup JSON here..."
                className="w-full mt-3 p-3 bg-[#0D0D0F] border border-[#2B2B32] rounded-xl text-xs font-mono text-neutral-200 placeholder-neutral-600 focus:outline-hidden focus:border-emerald-500"
              />
              {importStatus && <p className="text-xs text-emerald-400 mt-2">{importStatus}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#25252B]">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-3 py-1.5 bg-neutral-800 text-neutral-300 rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={!importJsonText.trim()}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl text-xs transition-colors disabled:opacity-40"
              >
                Restore Keys
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
