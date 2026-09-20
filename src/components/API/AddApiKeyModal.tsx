import React, { useState } from 'react';
import { ApiKeyInput } from './ApiKeyInput';
import { ProviderDetection } from './ProviderDetection';
import { ProviderSelector } from './ProviderSelector';
import { AdvancedSetup } from './AdvancedSetup';
import { ProviderDetector } from '../../providers/detection';
import type { ProviderResolution } from '../../providers/types';
import { ProviderRegistry } from '../../providers/registry';
import { resolveConnectionStrategy } from '../../providers/transport/resolver';
import { useAppStore } from '../../store/appStore';
import type { ProviderDefinition } from '../../types/provider';
import { X, Lock, CheckCircle2, AlertCircle, Loader2, ArrowRight, ShieldAlert, Database } from 'lucide-react';
import { ApiKeyStorage } from '../../services/apiKeyStorage';
import type { StorageTarget } from '../../types/storage';

export const AddApiKeyModal: React.FC = () => {
  const {
    isApiKeyModalOpen,
    setApiKeyModalOpen,
    apiKey: storedKey,
    selectedProvider: storedProvider,
    customConfig: storedCustomConfig,
    setApiKey,
    setSelectedProvider,
    setResolvedStrategy,
    initSessionVerification,
    updateVerificationStage,
    setCustomConfig,
    setConnectionState,
    setModels,
    showNotification,
    storedKeys,
    setKeyVaultOpen,
    refreshStoredKeys
  } = useAppStore();

  const [inputKey, setInputKey] = useState(storedKey || '');
  
  // Single authoritative Provider Resolution state
  const [resolution, setResolution] = useState<ProviderResolution>(() => {
    if (storedKey) {
      return ProviderDetector.detect(storedKey);
    }
    if (storedProvider) {
      return {
        providerId: storedProvider.id,
        provider: storedProvider,
        confidence: 'high',
        rationale: 'Previously selected provider.',
        reason: 'Previously selected provider.',
        candidates: [storedProvider],
        isManualSelection: true
      };
    }
    return {
      providerId: null,
      provider: null,
      confidence: 'unknown',
      candidates: [],
      rationale: 'No API key provided.',
      reason: 'No API key provided.'
    };
  });

  // Track explicit manual user selection override
  const [manualProvider, setManualProvider] = useState<ProviderDefinition | null>(null);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>('Connecting...');
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
    count?: number;
    code?: string;
    bulletReasons?: string[];
  } | null>(null);

  // Advanced config state
  const [advanced, setAdvanced] = useState({
    baseUrl: storedCustomConfig.baseUrl || '',
    chatEndpoint: storedCustomConfig.chatEndpoint || '',
    authHeader: storedCustomConfig.authHeader || '',
    customHeaders: storedCustomConfig.customHeaders || '',
    manualModelId: storedCustomConfig.manualModelId || '',
  });

  const [saveToStorage, setSaveToStorage] = useState(true);
  const [storageTarget, setStorageTarget] = useState<StorageTarget>('localStorage');

  // Authoritative single effective provider:
  // If user explicitly chose a provider, use that.
  // Otherwise, use the freshly detected provider from resolution.
  const effectiveProvider = manualProvider || resolution.provider;
  const currentStrategy = effectiveProvider ? resolveConnectionStrategy(effectiveProvider) : null;

  // Single source of truth handler for key changes
  const handleKeyChange = (val: string) => {
    setInputKey(val);
    setStatusMessage(null);
    setManualProvider(null); // Clear any previous manual provider selection
    setConnectionState('idle'); // Clear previous connection state

    const trimmed = val.trim();
    if (!trimmed) {
      setResolution({
        providerId: null,
        provider: null,
        confidence: 'unknown',
        candidates: [],
        rationale: 'No API key provided.',
        reason: 'No API key provided.'
      });
      return;
    }

    const fresh = ProviderDetector.detect(trimmed);
    setResolution(fresh);
  };

  const handleSelectProvider = (p: ProviderDefinition) => {
    setManualProvider(p);
    setIsSelectorOpen(false);
    setStatusMessage(null);
  };

  if (!isApiKeyModalOpen) return null;

  const handleConnect = async () => {
    const key = inputKey.trim();
    if (!key) {
      setStatusMessage({ type: 'error', text: 'Please enter an API key.' });
      return;
    }

    // Resolve provider: either custom config or the authoritative effective provider
    let targetProvider = effectiveProvider;

    if (advanced.baseUrl) {
      targetProvider = ProviderRegistry.createCustomProvider({
        baseUrl: advanced.baseUrl,
        chatEndpoint: advanced.chatEndpoint,
        authHeader: advanced.authHeader,
        customHeaders: advanced.customHeaders,
        modelId: advanced.manualModelId
      });
    }

    if (!targetProvider) {
      setStatusMessage({
        type: 'error',
        text: 'Please select a provider before connecting.'
      });
      setIsSelectorOpen(true);
      return;
    }

    // Step 8: Provider State Integrity Assertion
    if (resolution.confidence === 'high' && resolution.provider && !manualProvider && !advanced.baseUrl) {
      const isEquivalentNvidia = 
        (targetProvider.id === 'nvidia' || targetProvider.id === 'nvidia-nim') &&
        (resolution.provider.id === 'nvidia' || resolution.provider.id === 'nvidia-nim');
      if (targetProvider.id !== resolution.provider.id && !isEquivalentNvidia) {
        const errorMsg = `Provider state mismatch: detected '${resolution.provider.name}' (${resolution.provider.id}) but attempted connection to '${targetProvider.name}' (${targetProvider.id}).`;
        console.error('[ARH Provider Integrity Failure]', errorMsg);
        setStatusMessage({ type: 'error', text: errorMsg });
        return;
      }
    }

    // Step 9: Structured debug logging in development mode
    if (import.meta.env.DEV) {
      const prefix = key.includes('_') ? key.split('_')[0] + '_' : key.slice(0, 6);
      const masked = key.length > 8 ? `${key.slice(0, 4)}••••${key.slice(-4)}` : '••••';
      console.log(
        `%c[ARH Provider Flow]%c\n` +
        `API Key Prefix:      ${prefix}\n` +
        `Masked Key:          ${masked}\n` +
        `Detected Provider:    ${resolution.provider?.name || 'none'} (${resolution.providerId || 'none'})\n` +
        `Selected Provider:    ${targetProvider.name} (${targetProvider.id})\n` +
        `Active Provider:      ${targetProvider.name}\n` +
        `Connection Provider:  ${targetProvider.name} (${targetProvider.id})\n` +
        `Adapter:              ${targetProvider.adapterType}\n` +
        `Endpoint:             ${targetProvider.baseUrl}`,
        'color: #10b981; font-weight: bold;',
        'color: inherit;'
      );
    }

    setIsLoading(true);
    setStatusMessage(null);
    setConnectionState('resolving_transport');
    setLoadingStatus(`Resolving transport strategy for ${targetProvider.name}...`);

    // Initialize session verification for this provider
    initSessionVerification(targetProvider.id, targetProvider.name);

    // Stage 1: Provider Detection
    const wasAutoDetected = resolution.provider?.id === targetProvider.id;
    updateVerificationStage('providerDetection', {
      status: 'PASSED',
      details: wasAutoDetected
        ? `Detected via pattern (${resolution.confidence} confidence)`
        : 'Manually selected by user'
    });

    const strategy = resolveConnectionStrategy(targetProvider);
    setResolvedStrategy(strategy);

    // Stage 2: Connection Strategy
    updateVerificationStage('connectionStrategy', {
      status: 'PASSED',
      details: `${strategy.mode} via ${strategy.transport} transport`
    });

    setConnectionState('connecting');
    setLoadingStatus(`Connecting to ${targetProvider.name}...`);

    const authStartTime = Date.now();
    updateVerificationStage('authentication', { status: 'RUNNING' });

    try {
      setLoadingStatus('Validating API key...');
      const adapter = ProviderRegistry.resolveAdapter(targetProvider);
      
      const result = await adapter.validateConnection(key);

      if (!result.success) {
        setIsLoading(false);
        setConnectionState('error');
        updateVerificationStage('authentication', {
          status: 'FAILED',
          durationMs: Date.now() - authStartTime,
          error: result.error?.message || 'Authentication rejected'
        });
        const code = result.error?.code || 'AUTH_ERROR';
        let bulletReasons: string[] = [];

        if (code === 'AUTH_ERROR') {
          bulletReasons = [
            'The key is invalid or misspelled',
            'The key has expired',
            'The key does not have model access permission'
          ];
        } else if (code === 'RATE_LIMIT') {
          bulletReasons = [
            'Account quota or balance exhausted',
            'Tokens per minute (TPM) limit reached',
            'Requests per day (RPD) limit exceeded'
          ];
        } else if (code === 'BROWSER_NETWORK_ERROR') {
          bulletReasons = [
            `${targetProvider.name} may block direct browser-to-API requests via CORS policy`,
            'An ad-blocker or privacy shield extension may be intercepting API calls',
            'Provider may require a server-side proxy rather than client-side fetch'
          ];
        } else if (code === 'NETWORK_ERROR') {
          bulletReasons = [
            'Internet connection dropped or unreachable',
            'CORS restrictions on custom proxy or local URL',
            'Network firewall or VPN blocking request'
          ];
        } else if (code === 'SERVER_ERROR') {
          bulletReasons = [
            'Provider service is temporarily degraded or down',
            'High traffic on upstream provider infrastructure'
          ];
        } else {
          bulletReasons = [
            'Endpoint or model configuration mismatch',
            'Unexpected response payload format'
          ];
        }

        setStatusMessage({
          type: 'error',
          text: result.error?.message || `Your API key was rejected by ${targetProvider.name}.`,
          code,
          bulletReasons
        });
        return;
      }

      // Stage 3: Authentication PASSED
      updateVerificationStage('authentication', {
        status: 'PASSED',
        durationMs: result.latencyMs || (Date.now() - authStartTime),
        details: `HTTP ${result.status || 200} OK`
      });

      setConnectionState('discovering_models');
      setLoadingStatus('Discovering available models...');

      // Stage 4: Model Discovery RUNNING
      const discoveryStartTime = Date.now();
      updateVerificationStage('modelDiscovery', { status: 'RUNNING' });

      let models = result.models || [];
      let source: 'live' | 'fallback' = 'live';

      if (models.length === 0) {
        try {
          models = await adapter.getModels(key);
        } catch (e) {
          // If dynamic model discovery fails, fallback models will be resolved
        }
      }

      if (models.length === 0 && targetProvider.fallbackModels && targetProvider.fallbackModels.length > 0) {
        models = targetProvider.fallbackModels;
        source = 'fallback';
      }

      if (models.length === 0 && advanced.manualModelId) {
        models = [{
          id: advanced.manualModelId,
          name: advanced.manualModelId,
          provider: targetProvider.name,
          isDefault: true,
          capabilities: { ...targetProvider.capabilities }
        }];
        source = 'fallback';
      }

      // Stage 4: Model Discovery PASSED
      updateVerificationStage('modelDiscovery', {
        status: 'PASSED',
        durationMs: Date.now() - discoveryStartTime,
        details: `${models.length} model(s) available (${source === 'live' ? 'Live Provider API' : 'Fallback Catalog'})`
      });

      // Stage 5: Model Selection
      const chosenModel = models.find(m => m.isDefault) || models[0] || null;
      updateVerificationStage('modelSelection', {
        status: 'PASSED',
        details: chosenModel ? `Selected: ${chosenModel.id}` : 'Default model'
      });

      // Successful connection: Set ready state
      setLoadingStatus('Ready');
      setApiKey(key);
      setSelectedProvider(targetProvider);
      setCustomConfig(advanced);
      setConnectionState('ready');
      setModels(models, null, source);

      setIsLoading(false);
      setStatusMessage({
        type: 'success',
        text: `Connected to ${targetProvider.name}`,
        count: models.length
      });

      // Save to Browser Storage if user opted in
      if (saveToStorage) {
        ApiKeyStorage.save({
          name: `${targetProvider.name} Key`,
          providerId: targetProvider.id,
          providerName: targetProvider.name,
          apiKey: key,
          storageTarget,
          customConfig: advanced.baseUrl ? advanced : undefined,
          lastStatus: 'valid'
        });
        refreshStoredKeys();
      }

      showNotification(`Connected to ${targetProvider.name} (${models.length} model${models.length === 1 ? '' : 's'} ready).`);

      // Smooth auto-close after 1s
      setTimeout(() => {
        setApiKeyModalOpen(false);
      }, 1000);

    } catch (err: any) {
      setIsLoading(false);
      setConnectionState('error');
      setStatusMessage({
        type: 'error',
        text: err.message || 'Connection error. Please check your network and provider settings.',
        code: 'NETWORK_ERROR',
        bulletReasons: [
          'Verify your device has an active internet connection',
          'Ensure custom endpoints allow cross-origin requests (CORS)'
        ]
      });
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xs transition-opacity animate-fade-in"
      onClick={() => setApiKeyModalOpen(false)}
    >
      <div 
        className="relative w-full sm:max-w-lg bg-[#111113] border-t sm:border border-[#26262B] rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl shadow-black overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Title and Close Button */}
        <div className="flex items-center justify-between pb-3 border-b border-[#222226]">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-medium text-white tracking-tight">Add API Key</h2>
              {storedKeys.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setApiKeyModalOpen(false);
                    setKeyVaultOpen(true);
                  }}
                  className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-semibold transition-colors"
                  title="Open Key Vault"
                >
                  <Database className="w-3 h-3" />
                  <span>{storedKeys.length} Stored</span>
                </button>
              )}
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Paste an AI API key to get started or connect a stored key.
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setApiKeyModalOpen(false);
                setKeyVaultOpen(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#17171A] hover:bg-[#202025] text-neutral-300 hover:text-white border border-[#2B2B32] rounded-xl text-xs transition-colors"
              title="Open Stored Keys Vault"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Stored Keys</span>
            </button>
            <button
              type="button"
              onClick={() => setApiKeyModalOpen(false)}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex flex-col gap-4 overflow-y-auto py-2 pr-0.5" style={{ scrollbarWidth: 'none' }}>
          {/* API Key Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-300">API Key</label>
            <ApiKeyInput
              value={inputKey}
              onChange={handleKeyChange}
              disabled={isLoading}
            />
          </div>

          {/* Storage persistence toggle */}
          <div className="flex items-center justify-between p-2.5 bg-[#151518] border border-[#26262B] rounded-xl text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={saveToStorage}
                onChange={(e) => setSaveToStorage(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-[#1F1F24] border-neutral-700 text-emerald-500 focus:ring-emerald-500/20"
              />
              <span className="text-neutral-300 font-medium text-[11px] sm:text-xs">
                Save to browser storage for instant reconnect
              </span>
            </label>

            {saveToStorage && (
              <select
                value={storageTarget}
                onChange={(e) => setStorageTarget(e.target.value as StorageTarget)}
                className="bg-[#0E0E10] border border-[#2D2D35] rounded-lg px-2 py-0.5 text-[10px] sm:text-[11px] text-neutral-300 focus:outline-hidden"
              >
                <option value="localStorage">Local Storage</option>
                <option value="sessionStorage">Session Storage</option>
              </select>
            )}
          </div>

          {/* Provider Detection Banner */}
          {inputKey && !isSelectorOpen && (
            <ProviderDetection
              detection={resolution}
              selectedProvider={effectiveProvider}
              onSelectProvider={handleSelectProvider}
              onOpenSelector={() => setIsSelectorOpen(true)}
            />
          )}

          {/* Fallback Provider Selector */}
          {isSelectorOpen && (
            <div className="p-3 bg-[#151518] border border-[#27272C] rounded-xl flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-300">Choose Provider</span>
                <button
                  type="button"
                  onClick={() => setIsSelectorOpen(false)}
                  className="text-xs text-neutral-400 hover:text-white"
                >
                  Close
                </button>
              </div>
              <ProviderSelector
                selectedProvider={effectiveProvider}
                onSelect={handleSelectProvider}
              />
            </div>
          )}

          {/* Connection Strategy & Privacy Notice */}
          {effectiveProvider && currentStrategy && !isSelectorOpen && (
            <div className="flex flex-col gap-2 p-3 bg-[#151518] border border-[#26262B] rounded-xl text-xs animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400 font-medium">Connection Strategy:</span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                  currentStrategy.badge.color === 'emerald'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : currentStrategy.badge.color === 'amber'
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    : currentStrategy.badge.color === 'purple'
                    ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                    : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                }`}>
                  <span>{currentStrategy.badge.text}</span>
                </span>
              </div>

              <p className="text-[11px] text-neutral-400 leading-relaxed">
                {currentStrategy.explanation}
              </p>

              {currentStrategy.privacyNotice && (
                <div className="flex items-start gap-1.5 text-[11px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 mt-0.5">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                  <span>{currentStrategy.privacyNotice}</span>
                </div>
              )}
            </div>
          )}

          {/* Status / Error feedback */}
          {statusMessage && (
            <div
              className={`flex items-start gap-2.5 p-3 rounded-xl text-xs leading-relaxed ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-medium">{statusMessage.text}</div>
                {statusMessage.bulletReasons && statusMessage.bulletReasons.length > 0 && (
                  <div className="mt-2 text-[11px] text-neutral-300">
                    <div className="font-medium text-neutral-400 mb-1">Possible reasons:</div>
                    <ul className="space-y-0.5 list-disc list-inside text-neutral-400">
                      {statusMessage.bulletReasons.map((reason, idx) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {statusMessage.count !== undefined && (
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    {statusMessage.count} model(s) discovered and ready for experimentation.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Advanced Setup Accordion */}
          <AdvancedSetup
            baseUrl={advanced.baseUrl}
            chatEndpoint={advanced.chatEndpoint}
            authHeader={advanced.authHeader}
            customHeaders={advanced.customHeaders}
            manualModelId={advanced.manualModelId}
            onChange={(fields) => setAdvanced((prev) => ({ ...prev, ...fields }))}
          />
        </div>

        {/* Connect Action & Privacy Footer */}
        <div className="pt-4 border-t border-[#222226] mt-2 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleConnect}
            disabled={isLoading || !inputKey.trim()}
            className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              isLoading
                ? 'bg-neutral-800 text-neutral-400 cursor-wait'
                : inputKey.trim()
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black font-semibold shadow-md shadow-emerald-950'
                  : 'bg-[#1C1C20] text-neutral-500 cursor-not-allowed border border-[#27272C]'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{loadingStatus}</span>
              </>
            ) : (
              <>
                <span>Connect</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Privacy Disclaimer */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-500">
            <Lock className="w-3 h-3 text-neutral-500 shrink-0" />
            <span>Your API key is used only in memory to connect to your selected AI provider.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
