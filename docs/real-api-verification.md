# ARH Real API Verification & Status Audit

This document records the exact, honest implementation, verification, and browser readiness statuses for all 18 AI providers in **ARH**.

---

## Status Terminology Definition (Phase 6 Provider Truth Layer)

To maintain absolute software integrity, ARH avoids ambiguous or overconfident labels:

* **Implementation**: `IMPLEMENTED` (code architecture exists) or `CUSTOM_CONFIGURABLE`.
* **Unit Tests**: `PASSED` (mock suite thoroughly verified via `npm test`) or `FAILED`.
* **Real API Status**: `NOT_TESTED` (honest baseline awaiting live user API key) or `VALIDATED`.
* **Browser Truth Status**:
  - `DOCUMENTED`: Behavior verified against official provider technical documentation.
  - `BROWSER_TESTED`: Verified via live browser automated network call.
  - `UNVERIFIED`: Adapter unit-tested, but live browser network execution not verified.
  - `BLOCKED`: Known to fail due to CORS or browser security restrictions.
* **CORS Status**: `SUPPORTED`, `CONDITIONAL`, `BLOCKED`, or `UNKNOWN`.
* **Connection Mode**: `DIRECT`, `DIRECT_WITH_WARNING`, `RELAY_REQUIRED`, `UNKNOWN`.
* **Session Verification Stages**: `providerDetection`, `connectionStrategy`, `authentication`, `modelDiscovery`, `modelSelection`, `chat`, `streaming`, `stopGeneration`.
* **Session Verification Result**: `NOT_TESTED`, `RUNNING`, `PASSED`, `FAILED`.
* **Session Overall Status**: `NOT_VERIFIED`, `PARTIALLY_VERIFIED`, `VERIFIED`, `FAILED`.

---

## Security & Transmission Breakdown

ARH strictly distinguishes key storage from network usage:

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


---

## Provider Verification Registry

### 1. Groq
* **Implementation Status**: `IMPLEMENTED`
* **Unit Test Status**: `PASSED` (20 tests passed across detection, OpenAI adapter, SSE parser)
* **Real API Status**: `NOT_TESTED` (Awaiting live user test: set `ARH_TEST_GROQ_KEY`)
* **Browser Truth Status**: `UNVERIFIED` (Documented permissive CORS; requires live browser verification)
* **Connection Mode**: `DIRECT`
* **Transport**: `DIRECT`
* **Model Discovery**: Dynamic `/openai/v1/models` + Fallback Catalog (`llama-3.3-70b-versatile`, `mixtral-8x7b-32768`)
* **Chat**: Supported
* **Streaming**: Supported (OpenAI SSE)
* **Known Limitations**: Account rate limits (TPM/RPM) on free tier can trigger `RATE_LIMIT`.

---

### 2. Google Gemini
* **Implementation Status**: `IMPLEMENTED`
* **Unit Test Status**: `PASSED` (Gemini content mapper, SSE candidate parser, fallback catalog)
* **Real API Status**: `NOT_TESTED` (Awaiting live user test: set `ARH_TEST_GEMINI_KEY`)
* **Browser Truth Status**: `UNVERIFIED` (Documented browser REST support; requires live browser verification)
* **Connection Mode**: `DIRECT_WITH_WARNING`
* **Transport**: `DIRECT`
* **Model Discovery**: Dynamic `/models` with `generateContent` filtering + Fallback Catalog (`gemini-1.5-flash`, `gemini-1.5-pro`)
* **Chat**: Supported (Maps ARH `assistant` role to Gemini `model` role)
* **Streaming**: Supported (`streamGenerateContent?alt=sse`)
* **Known Limitations**: API key is transmitted via URL parameter (`?key=...`), visible in browser DevTools Network tab.

---

### 3. OpenRouter
* **Implementation Status**: `IMPLEMENTED`
* **Unit Test Status**: `PASSED` (Key detection, OpenAI adapter routing, aggregator `/models`)
* **Real API Status**: `NOT_TESTED` (Awaiting live user test: set `ARH_TEST_OPENROUTER_KEY`)
* **Browser Truth Status**: `UNVERIFIED` (OpenRouter serves CORS for browser playgrounds; requires live verification)
* **Connection Mode**: `DIRECT`
* **Transport**: `DIRECT`
* **Model Discovery**: Dynamic `/models` across hundreds of models + Fallback Catalog
* **Chat**: Supported
* **Streaming**: Supported (OpenAI SSE)
* **Known Limitations**: High latency variance across third-party upstream providers.

---

### 4. NVIDIA NIM
* **Implementation Status**: `IMPLEMENTED`
* **Unit Test Status**: `PASSED` (Prefix detection `nvapi-`, adapter, SSE)
* **Real API Status**: `NOT_TESTED` (Awaiting live user test: set `ARH_TEST_NVIDIA_KEY`)
* **Browser Truth Status**: `UNVERIFIED` (Preflight compatibility unconfirmed)
* **Connection Mode**: `UNKNOWN`
* **Transport**: `DIRECT`
* **Model Discovery**: Dynamic `/models` + Fallback Catalog (`meta/llama-3.1-70b-instruct`)
* **Chat**: Supported
* **Streaming**: Supported (OpenAI SSE)
* **Known Limitations**: Requires active NVIDIA developer credits/membership.

---

### 5. Anthropic Claude
* **Implementation Status**: `IMPLEMENTED`
* **Unit Test Status**: `PASSED` (Header configuration, messages API, `content_block_delta` SSE)
* **Real API Status**: `NOT_TESTED` (Awaiting live user test: set `ARH_TEST_ANTHROPIC_KEY`)
* **Browser Truth Status**: `DOCUMENTED` (Vendor documented: requires header `anthropic-dangerous-direct-browser-access: true`)
* **Connection Mode**: `DIRECT_WITH_WARNING`
* **Transport**: `DIRECT`
* **Model Discovery**: Dynamic `/v1/models` + Fallback Catalog (`claude-3-5-sonnet-20241022`, `claude-3-5-haiku-20241022`)
* **Chat**: Supported
* **Streaming**: Supported (Messages SSE protocol)
* **Known Limitations**: Anthropic disallows standard browser calls unless the opt-in header is sent. Client runtime exposes key.

---

### 6. OpenAI
* **Implementation Status**: `IMPLEMENTED`
* **Unit Test Status**: `PASSED` (Detection `sk-proj-`, OpenAI adapter, SSE parser)
* **Real API Status**: `NOT_TESTED` (Awaiting live user test: set `ARH_TEST_OPENAI_KEY`)
* **Browser Truth Status**: `BLOCKED` (OpenAI blocks direct browser calls on `api.openai.com`)
* **Connection Mode**: `RELAY_REQUIRED`
* **Transport**: `RELAY`
* **Model Discovery**: Dynamic `/v1/models` (Blocked in browser) / Fallback Catalog (`gpt-4o-mini`, `gpt-4o`)
* **Chat**: Blocked by CORS in direct browser mode
* **Streaming**: Blocked by CORS in direct browser mode
* **Known Limitations**: Standard web browsers cannot call `api.openai.com` directly due to lack of CORS headers. Requires relay or custom proxy.

---

### 7. DeepSeek
* **Implementation Status**: `IMPLEMENTED`
* **Unit Test Status**: `PASSED` (32-hex detection, `reasoning_content` delta extraction)
* **Real API Status**: `NOT_TESTED`
* **Browser Truth Status**: `BLOCKED` (DeepSeek's `api.deepseek.com` does not serve CORS headers to browser origins)
* **Connection Mode**: `RELAY_REQUIRED`
* **Transport**: `RELAY`
* **Model Discovery**: Dynamic `/v1/models` / Fallback Catalog (`deepseek-chat`, `deepseek-reasoner`)
* **Chat**: Blocked by CORS in direct browser mode
* **Streaming**: Blocked by CORS in direct browser mode
* **Known Limitations**: Fails in browser with `TypeError: Failed to fetch`. Requires proxy mode for browser usage.

---

### 8. Cerebras
* **Implementation Status**: `IMPLEMENTED`
* **Unit Test Status**: `PASSED` (Key detection `csk-`, OpenAI adapter)
* **Real API Status**: `NOT_TESTED`
* **Browser Status**: `UNKNOWN` (Server-oriented API; CORS support unconfirmed)
* **Model Discovery**: Dynamic `/v1/models` + Fallback Catalog (`llama-3.3-70b`)
* **Chat**: Supported via OpenAI format
* **Streaming**: Supported via OpenAI SSE
* **Known Limitations**: Unverified from public browser origins.

---

### 9. Together AI
* **Implementation Status**: `IMPLEMENTED`
* **Unit Test Status**: `PASSED` (64-hex detection, OpenAI adapter)
* **Real API Status**: `NOT_TESTED`
* **Browser Status**: `LIKELY` (Provides CORS for playground developers)
* **Model Discovery**: Dynamic `/v1/models` + Fallback Catalog
* **Chat**: Supported
* **Streaming**: Supported
* **Known Limitations**: Occasional Cloudflare challenge blocks on heavy client-side traffic.

---

### 10. Fireworks AI
* **Implementation Status**: `IMPLEMENTED`
* **Unit Test Status**: `PASSED` (Key detection `fw_`, OpenAI adapter)
* **Real API Status**: `NOT_TESTED`
* **Browser Status**: `LIKELY` (Standard CORS on inference routes)
* **Model Discovery**: Dynamic `/models` + Fallback Catalog (`accounts/fireworks/models/...`)
* **Chat**: Supported
* **Streaming**: Supported
* **Known Limitations**: Requires account-scoped model identifiers.

---

### 11. Perplexity
* **Implementation Status**: `IMPLEMENTED`
* **Unit Test Status**: `PASSED` (Key detection `pplx-`, static fallback catalog)
* **Real API Status**: `NOT_TESTED`
* **Browser Status**: `CORS_BLOCKED` / `UNKNOWN` (Strict Cloudflare protection on `api.perplexity.ai`)
* **Model Discovery**: Static Fallback Catalog only (Perplexity does not offer a `/models` endpoint)
* **Chat**: Often blocked by Cloudflare in browser fetch
* **Streaming**: Often blocked by Cloudflare in browser fetch
* **Known Limitations**: Cloudflare bot protection frequently blocks direct browser-origin requests.

---

### 12. xAI (Grok)
* **Implementation Status**: `IMPLEMENTED`
* **Unit Test Status**: `PASSED` (Key detection `xai-`, OpenAI adapter)
* **Real API Status**: `NOT_TESTED`
* **Browser Status**: `UNKNOWN` (CORS availability on `api.x.ai` unverified)
* **Model Discovery**: Dynamic `/v1/models` + Fallback Catalog (`grok-2-latest`)
* **Chat**: Supported via OpenAI format
* **Streaming**: Supported via OpenAI SSE
* **Known Limitations**: Subject to xAI beta platform access restrictions.

---

### 13. Mistral AI
* **Implementation Status**: `IMPLEMENTED`
* **Unit Test Status**: `PASSED` (OpenAI adapter compatibility)
* **Real API Status**: `NOT_TESTED`
* **Browser Status**: `UNKNOWN` (Mistral official documentation emphasizes server-side SDKs)
* **Model Discovery**: Dynamic `/v1/models` + Fallback Catalog (`mistral-small-latest`, `mistral-large-latest`)
* **Chat**: Supported
* **Streaming**: Supported
* **Known Limitations**: Ambiguous `sk-` prefix requires manual provider selection.

---

### 14. SambaNova
* **Implementation Status**: `IMPLEMENTED`
* **Unit Test Status**: `PASSED` (OpenAI adapter compatibility)
* **Real API Status**: `NOT_TESTED`
* **Browser Status**: `UNKNOWN` (CORS availability on `api.sambanova.ai` unverified)
* **Model Discovery**: Dynamic `/v1/models` + Fallback Catalog (`Meta-Llama-3.3-70B-Instruct`)
* **Chat**: Supported
* **Streaming**: Supported
* **Known Limitations**: Requires manual provider selection due to ambiguous key pattern.

---

### 15. Hugging Face
* **Implementation Status**: `IMPLEMENTED`
* **Unit Test Status**: `PASSED` (Detection `hf_`, OpenAI router adapter)
* **Real API Status**: `NOT_TESTED`
* **Browser Status**: `LIKELY` (Router endpoints support CORS for fine-grained tokens)
* **Model Discovery**: Fallback Catalog + Router endpoints
* **Chat**: Supported
* **Streaming**: Supported
* **Known Limitations**: Must use fine-grained user tokens with inference permissions.

---

### 16. Moonshot (Kimi)
* **Implementation Status**: `IMPLEMENTED`
* **Unit Test Status**: `PASSED` (OpenAI adapter compatibility)
* **Real API Status**: `NOT_TESTED`
* **Browser Status**: `CORS_BLOCKED` / `NOT_SUPPORTED` (Mainland China network infrastructure blocks foreign browser origins)
* **Model Discovery**: Dynamic `/v1/models` + Fallback Catalog (`moonshot-v1-8k`)
* **Chat**: Blocked by network/CORS from international browsers
* **Streaming**: Blocked by network/CORS
* **Known Limitations**: Server-side proxy mandatory for non-mainland browsers.

---

### 17. Qwen (DashScope)
* **Implementation Status**: `IMPLEMENTED`
* **Unit Test Status**: `PASSED` (OpenAI compatible mode)
* **Real API Status**: `NOT_TESTED`
* **Browser Status**: `UNKNOWN` (Alibaba Cloud international gateway CORS unverified)
* **Model Discovery**: Dynamic `/compatible-mode/v1/models` + Fallback Catalog
* **Chat**: Supported via compatible mode
* **Streaming**: Supported
* **Known Limitations**: Requires DashScope international account.

---

### 18. Custom / Localhost (Ollama, vLLM, LM Studio)
* **Implementation Status**: `CUSTOM_CONFIGURABLE`
* **Unit Test Status**: `PASSED` (Dynamic URL normalization, custom headers, base URL handling)
* **Real API Status**: `NOT_TESTED`
* **Browser Status**: `CONFIRMED` (When user configures CORS on local daemon)
* **Model Discovery**: Dynamic `/models` probe + User manual model override
* **Chat**: Fully functional for local models
* **Streaming**: Supported
* **Known Limitations**: If running Ollama, the user must set `OLLAMA_ORIGINS="*"` or launch with CORS enabled, otherwise browser blocks localhost cross-origin requests.
