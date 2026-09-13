# ARH Browser Compatibility & Network Architecture Audit

This document details the network architecture of **ARH (AI API Playground)**, evaluates client-side browser compatibility across all 18 supported providers, conducts an in-depth API key security audit, and defines ARH's architectural security models.

---

## 1. Current Network Architecture Audit

### Request Trace Flow

ARH currently operates as a **100% Client-Side Direct Playground**. There is **no backend server, no proxy server, and no serverless relay**.

Every network interaction follows this exact pipeline:

```text
┌─────────────────────────────────────────────────────────────┐
│                    USER BROWSER RUNTIME                     │
│                                                             │
│  [AddApiKeyModal] / [ChatInput]                             │
│         │                                                   │
│         ▼                                                   │
│  [useAppStore] / [useChat]                                  │
│         │                                                   │
│         ▼                                                   │
│  [ProviderRegistry.resolveAdapter(provider)]               │
│         │                                                   │
│         ▼                                                   │
│  [ProviderAdapter] (OpenAICompatible / Gemini / Anthropic)   │
│         │                                                   │
│         ▼                                                   │
│  Native window.fetch()                                      │
└─────────┬───────────────────────────────────────────────────┘
          │ (Direct HTTP/HTTPS request across public internet)
          ▼
┌─────────────────────────────────────────────────────────────┐
│                 UPSTREAM AI PROVIDER API                    │
│                                                             │
│  api.groq.com / generativelanguage.googleapis.com / etc.    │
└─────────────────────────────────────────────────────────────┘
```

### Exact Code Locations Where Network Requests Are Created

All network calls in the codebase are initiated inside the adapter classes via standard `fetch()`:

1. **`src/providers/adapters/OpenAICompatibleAdapter.ts`**:
   - `validateConnection`: Probes `modelsUrl` (line 41) or dry-run probes `chatUrl` (line 91).
   - `discoverModels`: Queries `modelsUrl` (line 163).
   - `chat`: Direct `POST` to `chatUrl` (line 291).
   - `chatStream`: Direct `POST` with `stream: true` to `chatUrl` (line 348).
2. **`src/providers/adapters/GeminiAdapter.ts`**:
   - `validateConnection`: `GET` to `https://generativelanguage.googleapis.com/v1beta/models?key=<key>` (line 18).
   - `discoverModels`: `GET` models listing (line 76).
   - `chat`: `POST` to `:generateContent?key=<key>` (line 192).
   - `chatStream`: `POST` to `:streamGenerateContent?alt=sse&key=<key>` (line 254).
3. **`src/providers/adapters/AnthropicAdapter.ts`**:
   - `validateConnection`: `GET` to `https://api.anthropic.com/v1/models` with `anthropic-dangerous-direct-browser-access: true` (line 27).
   - `discoverModels`: `GET` models listing (line 76).
   - `chat`: `POST` to `https://api.anthropic.com/v1/messages` (line 221).
   - `chatStream`: `POST` to `https://api.anthropic.com/v1/messages` with `stream: true` (line 284).

There are **no intermediate reverse proxies, no hidden telemetry relays, and no server forwarders**.

---

## 2. Provider Browser Compatibility Matrix

Because modern web browsers enforce strict Cross-Origin Resource Sharing (CORS) rules and header security restrictions, calling provider APIs directly from client-side JavaScript produces very different outcomes than calling them from Node.js, Python, or curl.

### Evaluation Criteria (Provider Truth Model)
- **`DOCUMENTED`**: Direct browser behavior officially documented by vendor (e.g. Anthropic's opt-in header).
- **`BROWSER_TESTED`**: Behavior confirmed through live browser automated end-to-end testing.
- **`UNVERIFIED`**: Adapter implemented and tested with mock fixtures, but live browser network call is unverified.
- **`BLOCKED`**: Provider actively blocks browser origins or lacks CORS headers on preflight `OPTIONS` requests.
- **`UNKNOWN`**: Provider lacks explicit public CORS documentation; requires real-world verification.

| Provider | Connection Mode | Transport | CORS Status | Browser Truth | Real API | Notes & Technical Constraints |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Google Gemini** | `DIRECT_WITH_WARNING` | `DIRECT` | `CONDITIONAL` | `UNVERIFIED` | `NOT_TESTED` | Google REST API supports browser origins, but transmits API key in URL query parameter (`?key=...`). |
| **OpenRouter** | `DIRECT` | `DIRECT` | `SUPPORTED` | `UNVERIFIED` | `NOT_TESTED` | Gateway providing open CORS headers for browser playgrounds. Needs live key verification. |
| **Groq** | `DIRECT` | `DIRECT` | `SUPPORTED` | `UNVERIFIED` | `NOT_TESTED` | Groq's `/openai/v1` returns permissive CORS in documented specifications. |
| **Anthropic Claude** | `DIRECT_WITH_WARNING` | `DIRECT` | `CONDITIONAL` | `DOCUMENTED` | `NOT_TESTED` | Documented requirement: requires explicit header `anthropic-dangerous-direct-browser-access: true`. |
| **OpenAI** | `RELAY_REQUIRED` | `RELAY` | `BLOCKED` | `BLOCKED` | `NOT_TESTED` | OpenAI strictly blocks browser requests on `api.openai.com` to prevent key exposure. Requires relay. |
| **DeepSeek** | `RELAY_REQUIRED` | `RELAY` | `BLOCKED` | `BLOCKED` | `NOT_TESTED` | DeepSeek API does not return CORS headers for browser origins. Client-side fetch fails without relay. |
| **Perplexity** | `RELAY_REQUIRED` | `RELAY` | `BLOCKED` | `BLOCKED` | `NOT_TESTED` | Blocked by Cloudflare origin checks and missing CORS on `api.perplexity.ai`. Requires relay. |
| **Moonshot (Kimi)** | `RELAY_REQUIRED` | `RELAY` | `BLOCKED` | `BLOCKED` | `NOT_TESTED` | Cross-border infrastructure lacks browser CORS headers. Requires relay. |
| **NVIDIA NIM** | `UNKNOWN` | `DIRECT` | `UNKNOWN` | `UNVERIFIED` | `NOT_TESTED` | Enterprise hardware cloud; browser CORS compatibility is unverified. |
| **Together AI** | `UNKNOWN` | `DIRECT` | `UNKNOWN` | `UNVERIFIED` | `NOT_TESTED` | Inference endpoints unverified for browser preflight in direct testing. |
| **Fireworks AI** | `UNKNOWN` | `DIRECT` | `UNKNOWN` | `UNVERIFIED` | `NOT_TESTED` | Serverless platform; browser origin compatibility unverified. |
| **Cerebras** | `UNKNOWN` | `DIRECT` | `UNKNOWN` | `UNVERIFIED` | `NOT_TESTED` | High-throughput LPU API; browser CORS unverified. |
| **xAI (Grok)** | `UNKNOWN` | `DIRECT` | `UNKNOWN` | `UNVERIFIED` | `NOT_TESTED` | Standard `/v1` endpoint; CORS availability from non-x.ai origins unverified. |
| **Mistral AI** | `UNKNOWN` | `DIRECT` | `UNKNOWN` | `UNVERIFIED` | `NOT_TESTED` | European frontier models; browser origin behavior unverified. |
| **SambaNova** | `UNKNOWN` | `DIRECT` | `UNKNOWN` | `UNVERIFIED` | `NOT_TESTED` | Fast LPU cloud endpoints; browser CORS behavior unverified. |
| **Hugging Face** | `UNKNOWN` | `DIRECT` | `UNKNOWN` | `UNVERIFIED` | `NOT_TESTED` | Serverless inference API; browser token permissions unverified. |
| **Qwen (DashScope)**| `UNKNOWN` | `DIRECT` | `UNKNOWN` | `UNVERIFIED` | `NOT_TESTED` | International gateway; browser preflight compatibility unverified. |
| **Custom / Localhost** | `UNKNOWN` | `DIRECT` | `UNKNOWN` | `UNVERIFIED` | `NOT_TESTED` | Fully functional for Ollama, vLLM, LM Studio when user enables local CORS (e.g. `OLLAMA_ORIGINS="*"`). |

---

## 3. In-Depth API Key Security Audit

### Granular Key Exposure Breakdown

ARH enforces clear technical boundaries distinguishing key storage, browser exposure, server exposure, and upstream provider transmission:

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
> - Relay transport is an architectural abstraction (`isAvailable: false`).
> - Providers requiring relay access (`OpenAI`, `DeepSeek`, `Perplexity`, `Moonshot`) **cannot currently complete requests through ARH** until a relay is explicitly implemented.


### Memory-Only Storage vs. Secret API Key Protection

> [!IMPORTANT]
> **Memory-Only Storage $\neq$ Secret API Key Protection**
>
> Keeping an API key in React state or Zustand runtime memory prevents it from persisting in browser storage (`localStorage`, `IndexedDB`, `cookies`), but it **does not** hide the key from network transmission. When the browser makes a direct request to `api.provider.com`, the API key is transmitted over the wire directly from the user's browser.

### Key Exposure Vectors Analyzed

1. **Browser Network Inspector (DevTools)**:
   - *Status*: **Visible to User**.
   - *Detail*: Anyone with access to the browser's F12 Developer Tools can inspect the Network tab and see the raw outgoing `Authorization: Bearer <key>` header or Google Gemini's `?key=...` query parameter. This is acceptable for a personal playground, but users must know their key is visible in local DevTools.
2. **Google Gemini Query Parameter Exposure**:
   - *Status*: **Elevated Local Risk**.
   - *Detail*: Because Gemini v1beta REST accepts keys via URL (`?key=AIzaSy...`), the key may be saved in browser history, proxy logs, or referrer headers if external links were clicked. ARH mitigates this by never embedding external outbound links with referrers and by masking URLs in Developer Mode.
3. **Malicious Browser Extensions**:
   - *Status*: **External Risk**.
   - *Detail*: Browser extensions with broad permissions (`<all_urls>`, `webRequest`, or DOM access) can inspect in-memory variables, DOM input fields, or intercepted `fetch()` requests. Users should test API keys in a clean browser profile or Incognito window without untrusted extensions.
4. **Third-Party Scripts & CDNs**:
   - *Status*: **Zero Risk in ARH**.
   - *Detail*: ARH contains **0 third-party trackers, 0 external analytics scripts, 0 CDNs, and 0 external fonts**. All packages are bundled locally into `dist/`.
5. **Console & Error Objects**:
   - *Status*: **Sanitized**.
   - *Detail*: ARH's `error-normalizer.ts` strips authorization credentials and normalizes error objects before displaying them in UI alerts. Raw errors are not logged with keys.
6. **ARH Internal Developer Mode**:
   - *Status*: **Sanitized**.
   - *Detail*: Headers are scrubbed with `sanitizeHeaders` (e.g. `Bearer sk-••••••••1234`), and URLs are scrubbed with `sanitizeUrl`. Clicking "Copy Request" copies only sanitized credentials.


---

## 4. Architectural Security Models

ARH defines two distinct deployment and operational models:

### Mode A: Direct Playground Mode (Current Default)

```text
Browser ──(fetch)──► Provider API
```

* **Philosophy**: Minimalist, private, zero-server architecture.
* **Guarantees**:
  - No ARH backend server ever exists or sees the key.
  - No database, no accounts, no authentication tokens, no server logs.
  - Ideal for local development, trusted personal devices, and quick provider testing.
* **Limitations**:
  - Bound by browser CORS policies.
  - Providers that disallow client-side origins (OpenAI, DeepSeek, Perplexity) cannot connect directly.

---

### Mode B: Optional Proxy Relay Mode (Future Architecture)

```text
Browser ──(ephemeral request)──► Lightweight Proxy ──► Provider API
```

* **When Mode B is Needed**:
  - To support providers that do not provide CORS headers (OpenAI, DeepSeek, Perplexity).
  - To inject headers that browsers restrict.
  - To prevent exposing keys in the browser's direct network egress if desired.
* **Requirements for a True ARH Proxy**:
  - Must remain completely stateless (zero logging, zero database, zero key caching).
  - Can be run as a local CLI proxy (e.g. `npx arh-proxy`) or a lightweight serverless edge function.
  - Must pass through SSE streaming tokens without buffering.
* **Decision for Phase 5**:
  - **Do NOT implement a backend proxy prematurely.** Direct Playground Mode remains the pure, unencumbered core of ARH. For providers with CORS restrictions, ARH now reports clear, honest diagnostic feedback rather than pretending the key was invalid.

---

## 5. Browser Technical Restrictions & Direct Streaming

### Browser Forbidden Headers
Under the W3C Fetch specification, browsers automatically forbid client-side JavaScript from modifying certain headers:
- `Host`, `Origin`, `Referer`, `User-Agent`, `Connection`, `Keep-Alive`, `Cookie`, `Sec-*`.
- Any provider requiring a customized `User-Agent` or spoofed `Host` header will fail in direct browser mode.

### Anthropic Direct Access Header
Anthropic explicitly rejects requests originating from a browser unless accompanied by:
```http
anthropic-dangerous-direct-browser-access: true
```
ARH includes this header in [`AnthropicAdapter.ts`](file:///g:/My%20Drive/API%20Key%20tester%20-%20Chatbot/src/providers/adapters/AnthropicAdapter.ts), allowing developers who deliberately choose to test Anthropic keys to do so directly from their browser.

### Streaming Compatibility via `ReadableStream`
All modern browsers (Chrome 43+, Firefox 65+, Safari 10.5+, Edge 79+) support reading response bodies as `ReadableStream`:
```typescript
const reader = response.body.getReader();
const decoder = new TextDecoder();
```
ARH's streaming implementation uses standard `TextDecoderStream` / `TextDecoder` and chunk parsing, which works across all modern evergreen browsers without polyfills.

### Content Security Policy (CSP) Implications
When deploying ARH to production domains with strict CSP headers, the `connect-src` directive must permit the upstream provider hostnames:
```http
Content-Security-Policy: default-src 'self'; connect-src 'self' https://api.groq.com https://generativelanguage.googleapis.com https://openrouter.ai https://api.anthropic.com https://integrate.api.nvidia.com https://*.fireworks.ai https://api.together.xyz;
```
If an enterprise CSP restricts `connect-src 'self'`, all direct provider calls will be blocked by the browser.
