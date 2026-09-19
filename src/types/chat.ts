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
