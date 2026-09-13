# ARH Manual Testing Guide & Verification Checklist

This document provides a comprehensive verification protocol for **ARH (AI API Playground)**. It outlines real-world testing procedures, connection state transitions, streaming reliability, developer inspection, and security guarantees.

---

## 1. Provider Testing Matrix

Every provider in ARH has been architecturally implemented and verified through the automated test suite (`npm test`). For live testing, paste a real API key into the connection modal.

### Verification Status Legend:
* **`REAL_API_VERIFIED`**: Confirmed working end-to-end against live upstream production servers (real key tested, streaming completed, models fetched).
* **`UNIT_TESTED`**: Full adapter logic, regex detection, error normalization, and streaming parsers verified via unit test suite (`tests/`).
* **`PARTIALLY_VERIFIED`**: Verified via probe endpoint or mock API; upstream requires specialized account scoping or custom routing.
* **`NOT_TESTED`**: Ready for manual tester key verification.

| Provider | Verification Status | Key Format Prefix | Discovery Mode | Default Model | Verified Features |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Groq** | `UNIT_TESTED` | `gsk_` | Live API + Fallback | `llama-3.3-70b-versatile` | Detection (100%), Discovery, SSE Streaming, Error Normalizer |
| **NVIDIA NIM** | `UNIT_TESTED` | `nvapi-` | Live API + Fallback | `meta/llama-3.1-70b-instruct` | Detection (100%), Bearer Auth, OpenAI SSE |
| **Google Gemini** | `UNIT_TESTED` | `AIzaSy...` | Live API + Fallback | `gemini-1.5-flash` | Detection (95%), Query Param Key, `model` role mapping, SSE |
| **OpenRouter** | `UNIT_TESTED` | `sk-or-v1-` | Live API + Fallback | `meta-llama/llama-3.3-70b-instruct` | Detection (100%), Dynamic aggregator `/models`, SSE |
| **OpenAI** | `UNIT_TESTED` | `sk-proj-`, `sk-admin-` | Live API + Fallback | `gpt-4o-mini` | Detection (95%), Filtering embeddings/audio, SSE |
| **Anthropic** | `UNIT_TESTED` | `sk-ant-` | Live API + Fallback | `claude-3-5-haiku-latest` | Detection (100%), `x-api-key`, `content_block_delta` SSE |
| **Cerebras** | `UNIT_TESTED` | `csk-` | Live API + Fallback | `llama-3.3-70b` | Detection (100%), High-throughput Llama inference |
| **DeepSeek** | `UNIT_TESTED` | `sk-` (32-hex) | Live API + Fallback | `deepseek-chat` | Detection (60%), Reasoning token parsing, SSE |
| **Together AI** | `UNIT_TESTED` | 64-hex string | Live API + Fallback | `meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo` | Detection (70%), OpenAI v1 schema, Dynamic models |
| **Fireworks AI** | `UNIT_TESTED` | `fw_` | Live API + Fallback | `accounts/fireworks/models/llama-v3p3-70b-instruct` | Detection (100%), Account model scoping |
| **Perplexity** | `UNIT_TESTED` | `pplx-` | Fallback Catalog | `sonar` | Detection (100%), Static catalog fallback (no `/models` API) |
| **xAI (Grok)** | `UNIT_TESTED` | `xai-` | Live API + Fallback | `grok-2-latest` | Detection (100%), Standard OpenAI v1 endpoints |
| **Mistral AI** | `UNIT_TESTED` | `sk-` | Live API + Fallback | `mistral-small-latest` | Fallback dropdown, Standard `/v1/models` |
| **SambaNova** | `UNIT_TESTED` | 32+ hex | Live API + Fallback | `Meta-Llama-3.3-70B-Instruct` | Detection / Manual Selection, Fast token generation |
| **Hugging Face** | `UNIT_TESTED` | `hf_` | Fallback Catalog | `meta-llama/Llama-3.3-70B-Instruct` | Detection (95%), Router endpoint compatibility |
| **Moonshot (Kimi)** | `UNIT_TESTED` | `sk-` | Live API + Fallback | `moonshot-v1-8k` | Manual Selection, OpenAI-compatible schema |
| **Qwen (DashScope)**| `UNIT_TESTED` | `sk-` | Live API + Fallback | `qwen-turbo` | Manual Selection, Alibaba Cloud OpenAI compatible mode |
| **Custom Endpoint** | `UNIT_TESTED` | Any | Dynamic Probe + Fallback | User-specified | User-defined Base URL & headers (Ollama, vLLM, LM Studio) |

> **Note for Live Verification**: To verify any provider live from the command line, run:
> ```bash
> GROQ_API_KEY=gsk_... node scripts/run-all-tests.js
> GEMINI_API_KEY=AIzaSy... node scripts/run-all-tests.js
> OPENAI_API_KEY=sk-proj-... node scripts/run-all-tests.js
> ANTHROPIC_API_KEY=sk-ant-... node scripts/run-all-tests.js
> ```
> Missing keys are cleanly skipped without breaking automated test suites.

---

## 2. Connection Flow Test Procedures

### Test 2.1: Known Prefix Automatic Detection
1. Click **"Add API Key"** on the home screen.
2. Paste a known provider key (e.g. `gsk_test1234567890abcdef1234567890abcdef`).
3. **Expected Result**:
   - Provider immediately displays as **Groq** with **100% Confidence** badge (Emerald).
   - "Connect" button becomes active.
   - The key is securely masked in the input (`gsk_••••••••cdef`).

### Test 2.2: Ambiguous Key Manual Selection
1. Click **"Add API Key"**.
2. Paste an ambiguous key (e.g. standard `sk-...` generic 32-character key).
3. **Expected Result**:
   - Detection shows **Low Confidence** or multiple candidate providers (e.g. OpenAI, DeepSeek, Mistral).
   - A dropdown is presented allowing the user to explicitly choose the provider.
   - Selecting the desired provider enables the "Connect" button.

### Test 2.3: Multi-Stage Progress UX
1. Click **"Connect"** with a valid API key.
2. **Expected Result**:
   - State 1: **"Connecting..."** (spinner displayed).
   - State 2: **"Validating API key..."** (verifies credentials).
   - State 3: **"Discovering models..."** (fetches `/models` or applies fallback catalog).
   - State 4: Modal closes and transitions to **Ready** state.
   - Header shows the connected provider and the intelligent default chat model.

### Test 2.4: Invalid Key Error Handling
1. Paste an invalid key (e.g. `gsk_invalidkey0000000000000000000000000000`).
2. Click **"Connect"**.
3. **Expected Result**:
   - State transitions to **Error**.
   - A clear, friendly explanation is shown: **"Authentication Failed: The provided API key is invalid, revoked, or expired."**
   - Actionable troubleshooting suggestions are displayed:
     - Check for leading/trailing spaces.
     - Confirm your API key has active credit/quota.
     - Verify provider permissions.
   - Modal remains open so user can easily re-enter the key without starting over.

### Test 2.5: Reset & Disconnect
1. When connected, click the active provider badge or **"Disconnect"**.
2. **Expected Result**:
   - In-memory key is immediately wiped (`apiKey: ''`).
   - Session state returns to `idle`.
   - Conversation history is purged.
   - No leftover credentials exist in browser memory or storage.

---

## 3. Streaming & Chat UX Checklist

### Test 3.1: Token-by-Token Streaming
1. Type: `"Write a short poem about the night sky."` and press Enter.
2. **Expected Result**:
   - Input field is disabled or converted to Stop button (`■ Stop`).
   - Response streams in token by token with smooth typographic rendering.
   - Input composer clears and refocuses upon completion.

### Test 3.2: Smart Auto-Scroll vs. User History Reading
1. Send a prompt that produces long output: `"Write an essay on modern cryptography."`
2. While streaming:
   - **Case A (User stays at bottom)**: The viewport automatically auto-scrolls down following the tokens.
   - **Case B (User scrolls up to read)**: Scroll up with the mouse wheel or touch gesture.
     - **Verification**: The viewport MUST NOT snap back to bottom. The text must not jitter or hijack scroll position.
     - A floating **"Jump to latest"** button appears at the bottom center.
     - Clicking **"Jump to latest"** smoothly scrolls to the bottom and resumes auto-scroll.

### Test 3.3: Stop Generation (`■ Stop`)
1. Send a long prompt: `"Count from 1 to 500."`
2. While the model is actively streaming, click **"■ Stop"**.
3. **Expected Result**:
   - Network request is immediately aborted via `AbortController`.
   - Streaming halts instantly.
   - The text generated up to that moment is **fully preserved** in the message bubble.
   - No false "Error: Aborted" red banner or broken message state is displayed.
   - The input button reverts from **Stop** back to **Send**.

### Test 3.4: Regeneration
1. After an assistant response finishes, click **"Regenerate"** in the top header or next to the message.
2. **Expected Result**:
   - Previous response is replaced.
   - The same prompt is re-executed with the active provider and model.

---

## 4. Developer Mode & Diagnostics Checklist

### Test 4.1: Model Catalog Source Transparency
1. Open **Developer Mode** (Terminal icon in the top header).
2. Check the **Model Catalog** badge:
   - **Live Provider API (Green)**: The model list was dynamically retrieved from the provider's `/models` endpoint.
   - **Fallback Catalog (Amber)**: The model list came from ARH's built-in offline catalog (e.g. if provider lacks a `/models` endpoint or connection was blocked).
3. **Verification**: ARH is 100% honest about where model options originate.

### Test 4.2: Request Inspector & Secret Sanitization
1. Send a chat message.
2. Open **Developer Mode** -> **Request** tab.
3. **Verification**:
   - **Method**: Displays `POST` with emerald badge.
   - **Endpoint URL**: Target URL is displayed. If query parameters contain keys (`?key=...`), the key must be masked (`AIzaSy••••••••xxxx`).
   - **Headers**:
     - `Authorization`: Displays `Bearer sk-••••••••xxxx` (never full secret).
     - `x-api-key`: Displays `sk-ant-••••••••xxxx` (never full secret).
   - **Request Body**: Displays properly formatted JSON messages payload.
   - **Copy Button**: Clicking "Copy" copies the sanitized payload to clipboard.

### Test 4.3: Performance Metrics
1. Navigate to **Developer Mode** -> **Performance** tab.
2. **Verification**:
   - **Time to First Token (TTFT)**: Displays initial inference latency in milliseconds.
   - **Total Duration**: Full request completion duration in seconds.
   - **Token Generation Speed**: Output speed estimated in tokens/sec.

### Test 4.4: Interactive Runtime Capability Tests
1. Navigate to **Developer Mode** -> **Capabilities** tab.
2. **Test A: Structured JSON Schema Test**:
   - Click **"Run Test"**.
   - Model is prompted with a strict JSON schema (`name`, `age`, `country`).
   - Response is parsed; green checkmark is shown on valid schema compliance.
3. **Test B: Tool Calling Simulation Test**:
   - Click **"Run Test"**.
   - Model is evaluated for function calling compliance (`get_weather`).
   - Result displays whether model adhered to the simulation schema.

---

## 5. Security & Privacy Audit Checklist

| Check | Requirement | Verification Method | Pass/Fail |
| :--- | :--- | :--- | :---: |
| **No LocalStorage** | API keys must never be stored in persistent storage | Open DevTools -> Application -> Local Storage. Verify 0 keys stored. | ✅ PASS |
| **No SessionStorage** | API keys must never be saved to Session Storage | DevTools -> Application -> Session Storage. Verify empty. | ✅ PASS |
| **No Cookies** | API keys must never be written to document cookies | DevTools -> Application -> Cookies. Verify empty. | ✅ PASS |
| **No IndexedDB** | No browser database stores conversation or keys | DevTools -> Application -> IndexedDB. Verify empty. | ✅ PASS |
| **Direct Browser Routing** | Requests must go directly from browser to provider | Network tab shows requests to `api.groq.com`, `api.openai.com`, etc. No proxy. | ✅ PASS |
| **Masked UI Display** | Keys must never be shown in plaintext once entered | Inspect DOM; inputs render `sk-••••••••1234`. | ✅ PASS |
| **Sanitized Dev Mode** | Dev Mode inspector masks all bearer tokens and headers | Inspect Dev Mode headers view and copy output. | ✅ PASS |
| **Memory Purge on Reset** | Closing/resetting clears store state immediately | Click Disconnect; store state returns to empty strings. | ✅ PASS |

---

## 6. Mobile & Cross-Browser Checklist

- **Responsive Viewport**: Tested at 375px (iPhone SE), 390px (iPhone 14/15), 768px (iPad/Tablet), 1440px (Desktop).
- **Touch Target Sizes**: All buttons, pills, and dropdowns have at least 44px × 44px hit areas.
- **Keyboard Handling**: On mobile Safari and Chrome, focusing the chat input does not cause unwanted horizontal overflow or viewport jumps.
- **Dark Theme Contrast**: Background `#09090A`, text `#EDEDED`, accents Emerald `#10B981`, borders `#222226` pass WCAG AA contrast standards.
