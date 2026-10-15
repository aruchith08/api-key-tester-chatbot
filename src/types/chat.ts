export interface MessageAttachment {
  type: 'image' | 'file';
  name: string;
  url: string; // Data URL or object URL
  mimeType: string;
  size: number;
}

export interface GeneratedFile {
  name: string;
  url: string; // Browser Blob URL
  size: number;
  mimeType: string;
  createdAt: number;
}

export interface CodeExecutionState {
  status: 'idle' | 'running' | 'success' | 'error';
  statusMessage?: string;
  code?: string;
  stdout?: string;
  stderr?: string;
  durationMs?: number;
  files?: GeneratedFile[];
  error?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

import type { NormalizedError } from '../providers/types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  thinking?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
  attachments?: MessageAttachment[];
  timestamp: number;
  isStreaming?: boolean;
  error?: string;
  errorDiagnostic?: NormalizedError;
  metrics?: {
    ttftMs?: number;
    totalDurationMs?: number;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  execution?: CodeExecutionState;
}

export interface ChatState {
  messages: ChatMessage[];
  isGenerating: boolean;
  streamingContent: string;
}

export interface DualMessageResponse {
  modelId: string;
  modelName: string;
  providerId: string;
  providerName: string;
  content: string;
  thinking?: string;
  isStreaming?: boolean;
  error?: string;
  errorDiagnostic?: NormalizedError;
  metrics?: {
    ttftMs?: number;
    totalDurationMs?: number;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export type DualMessageTarget = 'ai1' | 'ai2' | 'both';

export interface DualChatMessage {
  id: string;
  timestamp: number;
  role: 'user' | 'ai1' | 'ai2';
  content: string;
  thinking?: string;
  isStreaming?: boolean;
  error?: string;
  errorDiagnostic?: NormalizedError;
  target?: DualMessageTarget;
  senderName?: string;
  modelName?: string;
  providerName?: string;
  attachments?: MessageAttachment[];
  metrics?: {
    ttftMs?: number;
    totalDurationMs?: number;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  // Backwards compatibility fields for legacy views
  userPrompt?: string;
  responseA?: DualMessageResponse;
  responseB?: DualMessageResponse;
}

