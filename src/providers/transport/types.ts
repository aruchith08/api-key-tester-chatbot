/**
 * ARH Transport Layer Types
 * Defines the contract between Provider Adapters and the underlying HTTP/Relay transport.
 */

export interface TransportRequest {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface TransportResponse<T = any> {
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  data: T;
  latencyMs: number;
}

export interface AITransport {
  readonly name: string;
  readonly isAvailable: boolean;

  /**
   * Executes a standard request-response transaction.
   */
  request<T = any>(req: TransportRequest): Promise<TransportResponse<T>>;

  /**
   * Executes a streaming request, yielding raw string chunks as they arrive.
   */
  stream(req: TransportRequest): AsyncIterable<string>;
}
