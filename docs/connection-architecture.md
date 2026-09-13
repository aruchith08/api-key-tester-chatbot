# ARH Connection Architecture & Provider Truth Layer

## 1. Architectural Overview

ARH operates as a zero-setup, client-side AI API testing playground. While the core philosophy emphasizes frictionless experimentation, real-world network realities demand that adapters be decoupled from raw `fetch()` calls. Different AI providers implement disparate security policies, CORS headers, authentication requirements, and origin filtering.

To address these differences without forcing a monolithic backend proxy or compromising simplicity, ARH introduces an **Adaptive Connection Architecture** backed by a **Provider Truth Layer**.

```
                           ┌───────────────────────────┐
                           │          ARH UI           │
                           │  (Modal / Chat / DevMode) │
                           └─────────────┬─────────────┘
                                         │
                         resolveConnectionStrategy(provider)
                                         │
                                         ▼
                         ┌───────────────────────────────┐
                         │   Connection Strategy State   │
                         │ DIRECT / RELAY_REQUIRED / ... │
                         └───────────────┬───────────────┘
                                         │
                                         ▼
                         ┌───────────────────────────────┐
                         │      Provider Adapter         │
                         │ (OpenAI / Gemini / Anthropic) │
                         └───────────────┬───────────────┘
                                         │
                            this.transport.request()
                            this.transport.stream()
                                         │
                        ┌────────────────┴────────────────┐
                        ▼                                 ▼
             ┌─────────────────────┐           ┌─────────────────────┐
             │   DirectTransport   │           │   RelayTransport    │
             │   (Browser Fetch)   │           │   (Proxy Stub)      │
             └─────────────────────┘           └─────────────────────┘
```

---

## 2. The `AITransport` Interface

Adapters no longer execute direct browser `fetch()` calls. All network requests and server-sent event (SSE) streams pass through the `AITransport` interface:

```typescript
export interface AITransport {
  readonly name: string;
  readonly isAvailable: boolean;
  request<T = any>(req: TransportRequest): Promise<TransportResponse<T>>;
  stream(req: TransportRequest): AsyncIterable<string>;
}
```

### 2.1 DirectTransport
- Executes native HTTP calls using standard `fetch()`.
- Implements request timeout enforcement via `AbortController`.
- Decodes streaming response chunks into an `AsyncIterable<string>` for SSE processing.
- Normalizes network errors into typed `NormalizedError` structures (`AUTH_ERROR`, `RATE_LIMIT`, `BROWSER_NETWORK_ERROR`, `SERVER_ERROR`, `BAD_REQUEST`).

### 2.2 RelayTransport
- Declares `isAvailable = false` in standard client environments.
- Throws typed `RELAY_NOT_CONFIGURED` errors when invoked without an active proxy backend.
- Prepared for seamless serverless, Edge, or Docker relay integration without modifying provider adapters.

---

## 3. Connection Modes & Strategy Resolver

Every provider is mapped to a strongly typed connection strategy resolved via `resolveConnectionStrategy(provider)`:

| Connection Mode | Description | Default Transport | UI Badge | Example Providers |
| :--- | :--- | :--- | :--- | :--- |
| `DIRECT` | Clean CORS headers, supported direct from browser | `DIRECT` | `● Direct Connection` | Groq, OpenRouter |
| `DIRECT_WITH_WARNING` | Works in browser, but requires specific headers or has key exposure caveats | `DIRECT` | `⚠ Direct (Caveats)` | Gemini (key in URL), Anthropic (`dangerous-direct-browser-access`) |
| `RELAY_REQUIRED` | Known to block direct browser requests via CORS | `RELAY` | `🔒 Relay Required` | OpenAI, DeepSeek, Perplexity, Moonshot |
| `RELAY_AVAILABLE` | Can connect directly, but relay is available | `DIRECT` | `● Direct Connection` | Custom configured endpoints |
| `UNKNOWN` | Unverified direct browser behavior | `DIRECT` | `◐ Connection Unknown` | NVIDIA NIM, Cerebras, Together AI, Fireworks, Mistral, xAI, SambaNova, HuggingFace, Qwen |

---

## 4. Provider Truth Model

ARH enforces honest separation between implementation readiness, unit test coverage, browser testing, and real API verification.

```typescript
export interface ProviderTruthModel {
  implementation: 'IMPLEMENTED' | 'CUSTOM_CONFIGURABLE' | 'STUB';
  unitTests: 'PASSED' | 'FAILED' | 'NONE';
  realApi: 'NOT_TESTED' | 'VALIDATED' | 'FAILED';
  browser: 'UNVERIFIED' | 'BROWSER_TESTED' | 'BLOCKED' | 'DOCUMENTED';
  transport: 'DIRECT_READY' | 'RELAY_READY' | 'HYBRID';
  corsStatus: 'SUPPORTED' | 'CONDITIONAL' | 'BLOCKED' | 'UNKNOWN';
}
```

### Ground Rules
1. **Never claim `CONFIRMED` without verification.** Providers without active automated browser end-to-end tests are marked `UNVERIFIED`.
2. **Never claim `REAL_API_VERIFIED` on mock data.** All providers default to `realApi: 'NOT_TESTED'` until a user connects with a genuine active key.
3. **Transparent CORS Disclosures.** Providers known to reject browser origins (`OpenAI`, `DeepSeek`, `Perplexity`, `Moonshot`) are openly classified as `browser: 'BLOCKED'` and `corsStatus: 'BLOCKED'`.

---

## 5. Failure Diagnosis & Browser Network Errors

When a browser network call fails, browsers deliberately sanitize error details for security, throwing generic `TypeError: Failed to fetch`.

ARH handles this without making false assumptions:
- Evaluates the provider's known CORS status (`BLOCKED` vs `SUPPORTED` vs `UNKNOWN`).
- Discloses the three probable root causes:
  1. Provider CORS policy blocking client-side browser requests.
  2. Browser extensions (ad blockers, privacy guards) intercepting external calls.
  3. Physical network disconnection or corporate firewall restriction.
- Directs users encountering CORS blocks to use the **Advanced Setup** tab to configure a local proxy (e.g. Ollama, local vLLM, or reverse proxy).

---

## 6. Privacy & Security Architecture

ARH enforces clear technical boundaries distinguishing key storage, browser exposure, server exposure, and upstream provider transmission:

### Key Transmission Breakdown by Connection Mode

| Dimension | Direct Mode (`DIRECT`, `DIRECT_WITH_WARNING`, `UNKNOWN`) | Relay Mode (`RELAY_REQUIRED`) in Default ARH |
| :--- | :--- | :--- |
| **Key Storage** | **Runtime Only** (Volatile JS memory; lost on refresh) | **Runtime Only** (Volatile JS memory; lost on refresh) |
| **ARH Server Receives Key** | **No** (Zero backend servers, zero database, zero telemetry) | **No** (No backend exists; no relay is deployed) |
| **Browser Uses Key** | **Yes** (Client-side `fetch()` with auth header or query param) | **No** (Direct browser calls blocked by provider CORS; no proxy deployed) |
| **Upstream Provider Receives Key** | **Yes** (Sent directly across TLS to provider endpoint) | **No** (`RelayTransport` throws `RELAY_NOT_CONFIGURED`; no network request dispatched) |

> [!IMPORTANT]
> **DEFAULT ARH RELAY STATUS**:
> - **No relay is deployed.**
> - **No backend exists.**
> - Relay transport is strictly an architectural abstraction (`isAvailable: false`).
> - Providers requiring relay access (`OpenAI`, `DeepSeek`, `Perplexity`, `Moonshot`) **cannot currently complete requests through ARH** until a relay is explicitly implemented.

### Key Privacy & Security Guarantees
1. **Zero Persistence**: API keys exist strictly in volatile JavaScript heap memory and are wiped on browser tab reload or modal close.
2. **Key Masking**: Keys are masked (`sk-...xxxx`) across all Developer Mode inspectors, network payloads, and logs.
3. **URL Warning**: Users selecting Google Gemini receive an upfront caveat explaining that Gemini API protocol transmits API keys in query parameters (`?key=...`).
4. **Runtime-Only Session Verification**: All verification states (`ProviderSessionVerification`) are transient session telemetry and never written to disk or storage.
