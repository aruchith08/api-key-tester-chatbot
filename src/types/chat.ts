export interface MessageAttachment {
  type: 'image' | 'file';
  name: string;
  url: string; // Data URL or object URL
  mimeType: string;
  size: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: MessageAttachment[];
  timestamp: number;
  isStreaming?: boolean;
  error?: string;
  metrics?: {
    ttftMs?: number;
    totalDurationMs?: number;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface ChatState {
  messages: ChatMessage[];
  isGenerating: boolean;
  streamingContent: string;
}
