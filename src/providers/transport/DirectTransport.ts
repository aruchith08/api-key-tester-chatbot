import type { AITransport, TransportRequest, TransportResponse } from './types';
import { normalizeError } from '../error-normalizer';

export class DirectTransport implements AITransport {
  readonly name = 'Direct Browser Transport';
  readonly isAvailable = true;

  async request<T = any>(req: TransportRequest): Promise<TransportResponse<T>> {
    const startTime = Date.now();
    const timeoutMs = req.timeoutMs || 30000;
    const controller = new AbortController();

    // Link incoming signal with timeout controller
    let timeoutId: any;
    if (req.signal) {
      if (req.signal.aborted) {
        controller.abort();
      } else {
        req.signal.addEventListener('abort', () => controller.abort());
      }
    }

    timeoutId = setTimeout(() => {
      controller.abort(new Error(`Direct request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    try {
      const fetchFn = typeof window !== 'undefined' ? window.fetch.bind(window) : globalThis.fetch;
      let res: Response;
      try {
        res = await fetchFn(req.url, {
          method: req.method || 'GET',
          headers: req.headers,
          body: req.body !== undefined ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body)) : undefined,
          signal: controller.signal
        });
      } catch (fetchErr: any) {
        if (fetchErr.name === 'AbortError' && req.signal?.aborted) {
          throw fetchErr;
        }
        // If direct browser fetch failed due to CORS (TypeError) and running in browser, fallback to local dev proxy
        if (typeof window !== 'undefined' && fetchErr instanceof TypeError && !req.url.startsWith('/api/proxy')) {
          const proxyUrl = `/api/proxy?url=${encodeURIComponent(req.url)}`;
          res = await fetchFn(proxyUrl, {
            method: req.method || 'GET',
            headers: req.headers,
            body: req.body !== undefined ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body)) : undefined,
            signal: controller.signal
          });
        } else {
          throw fetchErr;
        }
      }

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      // Extract response headers into map
      const headersMap: Record<string, string> = {};
      res.headers.forEach((val, key) => {
        headersMap[key.toLowerCase()] = val;
      });

      const rawText = await res.text().catch(() => '');
      let data: any;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = rawText;
      }

      if (!res.ok) {
        const normalized = normalizeError(data, res.status);
        const err: any = new Error(normalized.message);
        err.status = res.status;
        err.normalized = normalized;
        err.data = data;
        throw err;
      }

      return {
        status: res.status,
        ok: res.ok,
        headers: headersMap,
        data,
        latencyMs
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError' && req.signal?.aborted) {
        throw err;
      }
      const normalized = normalizeError(err, err.status);
      const wrapped: any = new Error(normalized.message);
      wrapped.status = err.status;
      wrapped.normalized = normalized;
      throw wrapped;
    }
  }

  async *stream(req: TransportRequest): AsyncIterable<string> {
    const controller = new AbortController();
    if (req.signal) {
      if (req.signal.aborted) {
        controller.abort();
      } else {
        req.signal.addEventListener('abort', () => controller.abort());
      }
    }

    try {
      const fetchFn = typeof window !== 'undefined' ? window.fetch.bind(window) : globalThis.fetch;
      let res: Response;
      try {
        res = await fetchFn(req.url, {
          method: req.method || 'POST',
          headers: req.headers,
          body: req.body !== undefined ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body)) : undefined,
          signal: controller.signal
        });
      } catch (fetchErr: any) {
        if (fetchErr.name === 'AbortError' && req.signal?.aborted) {
          throw fetchErr;
        }
        // If direct stream fetch failed due to CORS (TypeError) and running in browser, fallback to local dev proxy
        if (typeof window !== 'undefined' && fetchErr instanceof TypeError && !req.url.startsWith('/api/proxy')) {
          const proxyUrl = `/api/proxy?url=${encodeURIComponent(req.url)}`;
          res = await fetchFn(proxyUrl, {
            method: req.method || 'POST',
            headers: req.headers,
            body: req.body !== undefined ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body)) : undefined,
            signal: controller.signal
          });
        } else {
          throw fetchErr;
        }
      }

      if (!res.ok) {
        const rawErrText = await res.text().catch(() => '');
        let errData: any;
        try {
          errData = rawErrText ? JSON.parse(rawErrText) : null;
        } catch {
          errData = rawErrText;
        }
        const normalized = normalizeError(errData, res.status);
        const err: any = new Error(normalized.message);
        err.status = res.status;
        err.normalized = normalized;
        err.data = errData;
        throw err;
      }

      if (!res.body) {
        throw new Error('Response body is null or streaming is unsupported by provider.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          const chunkStr = decoder.decode(value, { stream: true });
          yield chunkStr;
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError' && req.signal?.aborted) {
        throw err;
      }
      const normalized = normalizeError(err, err.status);
      const wrapped: any = new Error(normalized.message);
      wrapped.status = err.status;
      wrapped.normalized = normalized;
      throw wrapped;
    }
  }
}
