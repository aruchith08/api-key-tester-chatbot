import type { AITransport, TransportRequest, TransportResponse } from './types';

export class RelayTransport implements AITransport {
  readonly name = 'ARH Relay Transport';
  readonly isAvailable = false;
  private relayEndpoint?: string;

  constructor(relayEndpoint?: string) {
    this.relayEndpoint = relayEndpoint;
  }

  async request<T = any>(_req: TransportRequest): Promise<TransportResponse<T>> {
    const err: any = new Error(
      'Relay Transport is not configured. ARH currently operates as a direct client-side playground. To use this provider from a browser, a local or remote serverless relay must be configured.'
    );
    err.code = 'RELAY_NOT_CONFIGURED';
    err.status = 501;
    throw err;
  }

  async *stream(_req: TransportRequest): AsyncIterable<string> {
    const err: any = new Error(
      'Relay Transport is not configured. ARH currently operates as a direct client-side playground. To use this provider from a browser, a local or remote serverless relay must be configured.'
    );
    err.code = 'RELAY_NOT_CONFIGURED';
    err.status = 501;
    throw err;
  }
}
