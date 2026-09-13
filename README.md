<div align="center">

# ⚡ ARH — AI API Testing Ground

**A minimalist, universal, and stateless playground to test, validate, and chat with 18+ AI providers instantly.**

[![Tests](https://img.shields.io/badge/tests-130%20passed-emerald?style=flat-square)](https://github.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-cyan?style=flat-square&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-purple?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployable-black?style=flat-square&logo=vercel)](https://vercel.com/)
[![Security](https://img.shields.io/badge/storage-zero%20persistence-green?style=flat-square)](https://github.com)

</div>

---

## 🌟 What is ARH?

**ARH (API Testing Ground)** is a developer-first AI playground designed to test API keys across any major foundation model provider without setup friction, backend databases, or complex configurations. 

Paste an API key from **Groq, OpenAI, Anthropic, Gemini, NVIDIA NIM, DeepSeek, OpenRouter, Together, Fireworks, Perplexity, Cerebras, Mistral, Cohere, xAI, Hugging Face, or Ollama** — ARH instantly detects the provider, validates credentials, discovers live models, and launches a real-time streaming chat session.

---

## 🚀 Key Features

### 1. 🔍 Instant Key Pattern Detection
- Heuristic regex engine identifies distinct key signatures in real-time as you type or paste (`gsk_` for Groq, `nvapi-` for NVIDIA NIM, `AIzaSy` for Google Gemini, `sk-ant-` for Anthropic, `sk-or-` for OpenRouter, `sk-proj-` for OpenAI, etc.).
- Categorizes confidence levels (`high`, `medium`, `low`) with transparent rationale and multi-candidate manual selection for ambiguous keys.

### 2. 🛡️ Zero-Persistence Ephemeral Security
- **No databases. No localStorage. No telemetry. No logging.**
- Your API key lives strictly in runtime React/Zustand memory.
- Closing or refreshing the tab completely wipes all credentials from existence.
- Automatic key masking (`sk-proj-...1a2b`) protects your screen from accidental shoulder-surfing.

### 3. 🌐 Adaptive Connection Architecture
- **Direct Browser Transport**: For providers with open CORS (such as Groq, OpenRouter, Hugging Face, Together), requests stream directly from your browser to the provider’s endpoint.
- **Stateless Proxy Fallback**: For enterprise server-to-server APIs that restrict browser CORS (such as NVIDIA NIM and OpenAI), ARH routes requests through a lightweight, stateless proxy (built into Vite for local dev and Vercel Edge Functions for production).

### 4. 🔄 Universal SSE Normalization
- Unifies streaming protocols from OpenAI-compatible Server-Sent Events, Google Gemini chunk formats, and Anthropic content-block streaming into a standardized token stream.
- Captures token usage, timing metrics, first-token latency, and finish reasons.

### 5. 🔍 Developer Mode & Inspector
- Dedicated **`>_ Dev Mode`** drawer.
- Inspect raw HTTP requests, sanitized headers (with secrets masked), response bodies, status codes, and latency breakdowns for every call.

---

## 🧠 Supported Providers Matrix

ARH includes built-in adapters and model normalization for 18 industry providers:

| Provider | Key Signature | Connection Mode | Dynamic Models | Live Streaming |
| :--- | :--- | :--- | :---: | :---: |
| **Groq** | `gsk_...` | Direct Browser | ✅ Yes | ✅ Yes |
| **Google Gemini** | `AIzaSy...` | Direct (Query Auth) | ✅ Yes | ✅ Yes |
| **Anthropic Claude** | `sk-ant-api03-...` | Direct (Caveat Header) | ✅ Yes | ✅ Yes |
| **OpenRouter** | `sk-or-v1-...` | Direct Browser | ✅ Yes | ✅ Yes |
| **NVIDIA NIM** | `nvapi-...` | Proxy Fallback (CORS) | ✅ Yes | ✅ Yes |
| **OpenAI** | `sk-proj-...` / `sk-...` | Proxy Fallback (CORS) | ✅ Yes | ✅ Yes |
| **DeepSeek** | `sk-...` (32 hex) | Proxy Fallback (CORS) | ✅ Yes | ✅ Yes |
| **Together AI** | `64-hex key` | Direct Browser | ✅ Yes | ✅ Yes |
| **Fireworks AI** | `fw_...` | Direct Browser | ✅ Yes | ✅ Yes |
| **Cerebras** | `csk-...` | Direct Browser | ✅ Yes | ✅ Yes |
| **Perplexity AI** | `pplx-...` | Proxy Fallback (CORS) | ✅ Fallback | ✅ Yes |
| **xAI (Grok)** | `xai-...` | Direct Browser | ✅ Yes | ✅ Yes |
| **Mistral AI** | `32-char key` | Direct Browser | ✅ Yes | ✅ Yes |
| **Cohere** | `40-char key` | Direct Browser | ✅ Yes | ✅ Yes |
| **Hugging Face** | `hf_...` | Direct Browser | ✅ Yes | ✅ Yes |
| **Moonshot (Kimi)** | `sk-...` | Proxy Fallback (CORS) | ✅ Yes | ✅ Yes |
| **Custom / Ollama** | `http://...` | Direct Localhost | ✅ Yes | ✅ Yes |

---

## 🏗️ Architecture & Network Flow

```text
                           ┌────────────────────────┐
                           │      User Browser      │
                           │       ARH Web UI       │
                           └───────────┬────────────┘
                                       │
                                Paste API Key
                                       │
                                       ▼
                       ┌────────────────────────────────┐
                       │    Provider Detection Engine   │
                       │   (Heuristics, RegEx, Rationale)│
                       └───────────────┬────────────────┘
                                       │
                                       ▼
                      ┌──────────────────────────────────┐
                      │   Connection Strategy Resolver   │
                      └────────┬───────────────────┬─────┘
                               │                   │
                     CORS Supported         CORS Restricted
                               │                   │
                               ▼                   ▼
                     ┌──────────────────┐  ┌──────────────────┐
                     │ Direct Transport │  │  Stateless Proxy │
                     │  (Browser Fetch) │  │ (Vite / Vercel)  │
                     └────────┬─────────┘  └────────┬─────────┘
                              │                     │
                              ▼                     ▼
                     ┌──────────────────────────────────┐
                     │         AI Provider API          │
                     │  (Groq, OpenAI, Anthropic, NIM)  │
                     └──────────────────────────────────┘
```

---

## 🛠️ Local Development

### Prerequisites
- Node.js 18+ (Node 20+ recommended)
- npm, pnpm, or yarn

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/aruchith08/api-key-tester---chatbot.git
cd api-key-tester---chatbot

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

## 🧪 Automated Testing

ARH has an automated test suite comprising **130 unit, adapter, heuristic, and normalization tests**:

```bash
# Run all automated test suites
npm test
```

### Test Coverage Summary:
- **Provider Detection Heuristics**: 20 tests verifying prefixes, hex lengths, and edge cases.
- **Provider Synchronization**: 8 regression tests verifying zero race conditions on input switching.
- **OpenAI-Compatible Adapter**: 14 tests for payload formatting, endpoint resolution, and normalization.
- **Google Gemini Adapter**: 11 tests covering system instruction, multipart image payload, and role mapping.
- **Anthropic Claude Adapter**: 9 tests verifying header compliance and message structure.
- **Error Normalization**: 14 tests checking status codes (401, 403, 429, 500, network blocks).
- **Streaming SSE Parsing**: 13 tests covering token deltas, usage metadata, and chunk framing.
- **Transport & Strategy**: 21 tests validating connection mode determination and truth layers.
- **Live Integration Testing**: Conditional test harnesses for environment variables.

---

## ☁️ Deploying to Vercel

ARH is pre-configured for **one-click deployment to Vercel**:

### Option 1: Vercel CLI

```bash
npm install -g vercel
vercel
```

### Option 2: GitHub Integration

1. Push this repository to GitHub.
2. Go to [Vercel Dashboard](https://vercel.com/new) and select **Import Git Repository**.
3. Vercel automatically detects the Vite configuration:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Click **Deploy**.

> **Note**: ARH includes `api/proxy.ts` running on the **Vercel Edge Runtime**, allowing CORS-restricted APIs (like NVIDIA NIM and OpenAI) to function seamlessly in production without requiring third-party proxies.

---

## 🔒 Security & Privacy Statement

- **Client-Side First**: Your API keys are kept entirely within your local browser memory.
- **Zero Backend Storage**: ARH does not have a database, user tracking, or third-party analytical cookies.
- **Ephemeral Sessions**: Refreshing the browser or clearing the state destroys all active credentials and chat contents.
- **Open Source**: All network requests and adapters are transparent and open for inspection in [`src/providers`](./src/providers).

---

## 📄 License

MIT License. Feel free to use, modify, and distribute for private or commercial testing.
