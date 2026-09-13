export type CapabilityStatus = 'supported' | 'not-supported' | 'not-tested' | 'unknown';

export interface ModelCapabilities {
  textGeneration: CapabilityStatus;
  streaming: CapabilityStatus;
  vision: CapabilityStatus;
  imageInput: CapabilityStatus;
  fileInput: CapabilityStatus;
  systemPrompt: CapabilityStatus;
  toolCalling: CapabilityStatus;
  functionCalling: CapabilityStatus;
  structuredJson: CapabilityStatus;
}

export interface InspectorRequestData {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: any;
  timestamp: number;
}

export interface InspectorResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
  rawText?: string;
  timestamp: number;
}

export interface PerformanceMetricsData {
  requestStartTime?: number;
  timeToFirstTokenMs?: number;
  totalResponseTimeMs?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}
