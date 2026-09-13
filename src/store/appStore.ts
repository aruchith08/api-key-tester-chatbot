import { create } from 'zustand';
import type { Model, ProviderDefinition, ConnectionResult, ResolvedConnectionStrategy } from '../types/provider';
import type { ChatMessage, MessageAttachment } from '../types/chat';
import type { InspectorRequestData, InspectorResponseData, PerformanceMetricsData } from '../types/capabilities';
import type { ProviderSessionVerification, VerificationStageResult } from '../types/verification';
import { createInitialVerification, calculateOverallStatus } from '../types/verification';

export type ConnectionState = 
  | 'idle' 
  | 'detecting' 
  | 'provider_detected'
  | 'awaiting_provider_selection'
  | 'resolving_transport'
  | 'connecting' 
  | 'connected' 
  | 'discovering_models' 
  | 'ready' 
  | 'error';

export type ChatState =
  | 'idle'
  | 'sending'
  | 'streaming'
  | 'stopping'
  | 'complete'
  | 'error';

interface CustomConfig {
  providerName?: string;
  baseUrl?: string;
  chatEndpoint?: string;
  authHeader?: string;
  customHeaders?: string;
  manualModelId?: string;
}

interface AppState {
  // Authentication & Provider
  apiKey: string;
  selectedProvider: ProviderDefinition | null;
  resolvedStrategy: ResolvedConnectionStrategy | null;
  sessionVerification: ProviderSessionVerification | null;
  customConfig: CustomConfig;
  connectionState: ConnectionState;
  connectionError: string | null;

  // Verification Actions
  initSessionVerification: (providerId: string, providerName: string) => void;
  updateVerificationStage: (stage: keyof ProviderSessionVerification['stages'], result: Partial<VerificationStageResult>) => void;
  resetSessionVerification: () => void;
  
  // Models
  models: Model[];
  selectedModel: Model | null;
  modelSource: 'live' | 'fallback' | null;
  
  // Chat Session (Temporary in memory)
  messages: ChatMessage[];
  chatState: ChatState;
  isGenerating: boolean;
  abortController: AbortController | null;
  
  // UI States
  isApiKeyModalOpen: boolean;
  isModelSelectorOpen: boolean;
  isDeveloperModeOpen: boolean;
  isAboutModalOpen: boolean;
  notification: string | null;
  
  // Developer Inspector
  lastRequest: InspectorRequestData | null;
  lastResponse: InspectorResponseData | null;
  performanceMetrics: PerformanceMetricsData | null;

  // Actions
  setApiKey: (key: string) => void;
  setSelectedProvider: (provider: ProviderDefinition | null) => void;
  setResolvedStrategy: (strategy: ResolvedConnectionStrategy | null) => void;
  setCustomConfig: (config: Partial<CustomConfig>) => void;
  setConnectionState: (state: ConnectionState, error?: string | null) => void;
  setModels: (models: Model[], defaultModel?: Model | null, source?: 'live' | 'fallback') => void;
  setSelectedModel: (model: Model | null) => void;
  setChatState: (state: ChatState) => void;
  
  // Modal & Panel Toggles
  setApiKeyModalOpen: (open: boolean) => void;
  setModelSelectorOpen: (open: boolean) => void;
  setDeveloperModeOpen: (open: boolean) => void;
  setAboutModalOpen: (open: boolean) => void;
  showNotification: (msg: string) => void;
  clearNotification: () => void;
  
  // Chat Actions
  addUserMessage: (content: string, attachments?: MessageAttachment[]) => string;
  addAssistantPlaceholder: () => string;
  updateAssistantMessage: (id: string, content: string, isStreaming?: boolean, metrics?: PerformanceMetricsData, thinking?: string) => void;
  setAssistantError: (id: string, error: string) => void;
  setGenerating: (generating: boolean, controller?: AbortController | null) => void;
  stopGeneration: () => void;
  clearChat: () => void;
  
  // Developer Inspector
  setLastRequest: (req: InspectorRequestData) => void;
  setLastResponse: (res: InspectorResponseData) => void;
  setPerformanceMetrics: (metrics: PerformanceMetricsData) => void;
  
  // Reset
  resetConnection: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  apiKey: '',
  selectedProvider: null,
  resolvedStrategy: null,
  sessionVerification: null,
  customConfig: {},
  connectionState: 'idle',
  connectionError: null,
  
  models: [],
  selectedModel: null,
  modelSource: null,
  
  messages: [],
  chatState: 'idle',
  isGenerating: false,
  abortController: null,
  
  isApiKeyModalOpen: false,
  isModelSelectorOpen: false,
  isDeveloperModeOpen: false,
  isAboutModalOpen: false,
  notification: null,
  
  lastRequest: null,
  lastResponse: null,
  performanceMetrics: null,

  setApiKey: (apiKey) => set({ apiKey }),
  setSelectedProvider: (selectedProvider) => set({ selectedProvider }),
  setResolvedStrategy: (resolvedStrategy) => set({ resolvedStrategy }),
  
  initSessionVerification: (providerId, providerName) => set({
    sessionVerification: createInitialVerification(providerId, providerName)
  }),

  updateVerificationStage: (stage, update) => set((state) => {
    if (!state.sessionVerification) return state;
    const currentStage = state.sessionVerification.stages[stage];
    const updatedStage: VerificationStageResult = {
      ...currentStage,
      ...update,
      timestamp: update.timestamp ?? Date.now()
    };
    const newStages = {
      ...state.sessionVerification.stages,
      [stage]: updatedStage
    };
    return {
      sessionVerification: {
        ...state.sessionVerification,
        stages: newStages,
        overall: calculateOverallStatus(newStages),
        lastUpdatedAt: Date.now()
      }
    };
  }),

  resetSessionVerification: () => set({ sessionVerification: null }),

  setCustomConfig: (config) => set((state) => ({ customConfig: { ...state.customConfig, ...config } })),
  setConnectionState: (connectionState, connectionError = null) => set({ connectionState, connectionError }),
  setChatState: (chatState) => set({ chatState, isGenerating: chatState === 'sending' || chatState === 'streaming' }),
  
  setModels: (models, defaultModel = null, source = 'live') => {
    // Selection priority: chat-capable (non-embedding/utility) > preferred default > streaming-capable > first compatible
    const compatible = models.filter(m => 
      !/embed|similarity|moderation|tts|whisper|dall-e|realtime/i.test(m.id)
    );
    const pool = compatible.length > 0 ? compatible : models;

    let chosen = defaultModel;
    if (!chosen && pool.length > 0) {
      chosen = pool.find(m => m.isDefault) || pool.find(m => m.capabilities?.streaming) || pool[0];
    }
    set({ models: pool, selectedModel: chosen, modelSource: source });
  },
  
  setSelectedModel: (selectedModel) => set({ selectedModel }),
  
  setApiKeyModalOpen: (isApiKeyModalOpen) => set({ isApiKeyModalOpen }),
  setModelSelectorOpen: (isModelSelectorOpen) => set({ isModelSelectorOpen }),
  setDeveloperModeOpen: (isDeveloperModeOpen) => set({ isDeveloperModeOpen }),
  setAboutModalOpen: (isAboutModalOpen) => set({ isAboutModalOpen }),
  
  showNotification: (msg) => {
    set({ notification: msg });
    setTimeout(() => {
      if (get().notification === msg) {
        set({ notification: null });
      }
    }, 4000);
  },
  clearNotification: () => set({ notification: null }),
  
  addUserMessage: (content, attachments = []) => {
    const id = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const newMessage: ChatMessage = {
      id,
      role: 'user',
      content,
      attachments,
      timestamp: Date.now()
    };
    set((state) => ({ messages: [...state.messages, newMessage] }));
    return id;
  },
  
  addAssistantPlaceholder: () => {
    const id = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const placeholder: ChatMessage = {
      id,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true
    };
    set((state) => ({ messages: [...state.messages, placeholder] }));
    return id;
  },
  
  updateAssistantMessage: (id, content, isStreaming = false, metrics, thinking) => {
    set((state) => ({
      messages: state.messages.map((m) => 
        m.id === id 
          ? { 
              ...m, 
              content, 
              ...(thinking !== undefined ? { thinking } : {}),
              isStreaming, 
              ...(metrics ? { metrics } : {}) 
            } 
          : m
      )
    }));
  },
  
  setAssistantError: (id, error) => {
    set((state) => ({
      isGenerating: false,
      messages: state.messages.map((m) => 
        m.id === id 
          ? { ...m, error, isStreaming: false } 
          : m
      )
    }));
  },
  
  setGenerating: (isGenerating, abortController = null) => {
    set({ isGenerating, abortController });
  },
  
  stopGeneration: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
    }
    set({ isGenerating: false, chatState: 'idle', abortController: null });
  },
  
  clearChat: () => {
    const { abortController } = get();
    if (abortController) abortController.abort();
    set({ messages: [], chatState: 'idle', isGenerating: false, abortController: null });
  },
  
  setLastRequest: (lastRequest) => set({ lastRequest }),
  setLastResponse: (lastResponse) => set({ lastResponse }),
  setPerformanceMetrics: (performanceMetrics) => set({ performanceMetrics }),
  
  resetConnection: () => {
    const { abortController } = get();
    if (abortController) abortController.abort();
    set({
      apiKey: '',
      selectedProvider: null,
      resolvedStrategy: null,
      sessionVerification: null,
      customConfig: {},
      connectionState: 'idle',
      connectionError: null,
      models: [],
      selectedModel: null,
      modelSource: null,
      messages: [],
      chatState: 'idle',
      isGenerating: false,
      abortController: null,
      lastRequest: null,
      lastResponse: null,
      performanceMetrics: null
    });
  }
}));
