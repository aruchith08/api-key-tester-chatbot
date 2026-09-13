import type { ChatMessage, MessageAttachment } from '../types/chat';
import type { PerformanceMetricsData, InspectorRequestData, InspectorResponseData } from '../types/capabilities';

export type AdapterType =
  | 'openai-compatible'
  | 'gemini'
  | 'anthropic'
  | 'custom';

export type DetectionConfidence = 'high' | 'medium' | 'low' | 'unknown';

export type ConnectionMode =
  | 'DIRECT'
  | 'DIRECT_WITH_WARNING'
  | 'RELAY_REQUIRED'
  | 'RELAY_AVAILABLE'
  | 'UNKNOWN';

export type VerificationStatus =
  | 'NOT_TESTED'
  | 'IMPLEMENTED'
  | 'UNIT_TESTED'
  | 'REAL_API_VERIFIED'
  | 'BROWSER_VERIFIED'
  | 'FAILED'
  | 'BLOCKED';

export type BrowserCompatibilityLevel =
  | 'DOCUMENTED'
  | 'BROWSER_TESTED'
  | 'UNVERIFIED'
  | 'BLOCKED'
  | 'UNKNOWN';

export type CorsStatus = 'SUPPORTED' | 'RESTRICTED' | 'NOT_SUPPORTED' | 'UNKNOWN';

export interface ProviderTruthModel {
  implementation: 'IMPLEMENTED' | 'CUSTOM_CONFIGURABLE';
  unitTests: 'PASSED' | 'NOT_TESTED' | 'FAILED';
  realApi: 'NOT_TESTED' | 'REAL_API_VERIFIED' | 'FAILED';
  browser: 'NOT_TESTED' | 'BROWSER_VERIFIED' | 'BLOCKED' | 'UNVERIFIED';
  transport: 'DIRECT' | 'RELAY' | 'UNKNOWN';
  corsStatus: CorsStatus;
}

export interface ResolvedConnectionStrategy {
  providerId: string;
  providerName: string;
  mode: ConnectionMode;
  transport: 'DIRECT' | 'RELAY';
  recommendedTransport: 'DIRECT' | 'RELAY';
  badge: {
    label: string;
    type: 'direct' | 'warning' | 'relay_required' | 'unknown';
    description: string;
    text: string;
    color: string;
  };
  privacyNotice: string;
  caveats?: string[];
}

export interface ProviderCapabilities {
  text: boolean;
  streaming: boolean;
  vision: boolean;
  tools: boolean;
  json: boolean;
  fileInput?: boolean;
}

export interface ProviderDefinition {
  id: string;
  name: string;
  keyPatterns: RegExp[];
  adapterType: AdapterType;
  baseUrl?: string;
  modelsEndpoint?: string;
  chatEndpoint?: string;
  documentationUrl?: string;
  authHeader?: string;
  authPrefix?: string;
  headers?: Record<string, string>;
  defaultModelId?: string;
  tier?: 1 | 2;
  description?: string;
  capabilities: ProviderCapabilities;
  fallbackModels?: AIModel[];

  // Phase 6: Connection Strategy & Truth Layer Metadata
  connectionMode?: ConnectionMode;
  browserCompatibility?: BrowserCompatibilityLevel;
  corsStatus?: CorsStatus;
  keyExposureWarning?: string;
  recommendedTransport?: 'DIRECT' | 'RELAY';
  truth?: ProviderTruthModel;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  description?: string;
  contextWindow?: number;
  maxOutputTokens?: number;
  isDefault?: boolean;
  capabilities: {
    text?: boolean;
    streaming?: boolean;
    vision?: boolean;
    tools?: boolean;
    json?: boolean;
  };
}

export interface NormalizedError {
  code: 'AUTH_ERROR' | 'RATE_LIMIT' | 'NOT_FOUND' | 'SERVER_ERROR' | 'NETWORK_ERROR' | 'BROWSER_NETWORK_ERROR' | 'BAD_REQUEST' | 'UNKNOWN_ERROR';
  message: string;
  details?: string;
  statusCode?: number;
}

export interface ProviderResolution {
  providerId: string | null;
  provider: ProviderDefinition | null;
  confidence: DetectionConfidence;
  rationale: string;
  reason?: string;
  candidates: ProviderDefinition[];
  isManualSelection?: boolean;
}

export interface DetectionResult extends ProviderResolution {}

export interface ConnectionResult {
  success: boolean;
  provider: string;
  providerId: string;
  status?: number;
  models: AIModel[];
  error?: NormalizedError;
  latencyMs?: number;
}

export type StreamEvent =
  | {
      type: 'token';
      content: string;
    }
  | {
      type: 'thinking';
      content: string;
    }
  | {
      type: 'usage';
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
    }
  | {
      type: 'complete';
      finishReason?: string;
      metrics?: PerformanceMetricsData;
    }
  | {
      type: 'error';
      error: NormalizedError;
    };

export interface ChatParams {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
  signal?: AbortSignal;
  onRequestInspector?: (req: InspectorRequestData) => void;
  onResponseInspector?: (res: InspectorResponseData) => void;
  onMetrics?: (metrics: PerformanceMetricsData) => void;
}
