# ARH Provider Compatibility Matrix

This document provides an architectural and browser-compatibility assessment of the 18 providers integrated into **ARH**.

> For runtime browser CORS compatibility, see [docs/browser-compatibility.md](file:///g:/My%20Drive/API%20Key%20tester%20-%20Chatbot/docs/browser-compatibility.md).  
> For real API test verification and live statuses, see [docs/real-api-verification.md](file:///g:/My%20Drive/API%20Key%20tester%20-%20Chatbot/docs/real-api-verification.md).

Statuses:
* **`IMPLEMENTED`**: Fully wired adapter with connection validation, model discovery/fallbacks, and streaming protocol translation.
* **`PARTIALLY_IMPLEMENTED`**: Standard OpenAI-compatible gateway wired; model discovery endpoint may vary or require provider-specific fallback catalog.
* **`NEEDS_PROVIDER_SPECIFIC_ADAPTER`**: Provider uses distinct request payloads or non-standard routing (e.g. specialized tasks).
* **`CUSTOM_CONFIGURABLE`**: User-defined endpoint with configurable base URL and headers.

---

## Compatibility Matrix

| Provider | Status | Adapter Type | Detection | Validation | Model Discovery | Chat & Streaming | Real API Notes |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Groq** | `IMPLEMENTED` | OpenAI-compatible | High (`gsk_`) | Least-cost `/models` | Dynamic + Fallbacks | Native OpenAI SSE | Fast inference; strictly follows OpenAI chat completions schema. |
| **NVIDIA NIM** | `IMPLEMENTED` | OpenAI-compatible | High (`nvapi-`) | Least-cost `/models` | Dynamic + Fallbacks | Native OpenAI SSE | Standard `/v1` endpoint. Requires bearer authentication. |
| **Google Gemini** | `IMPLEMENTED` | Native Gemini | High (`AIzaSy`) | Least-cost `/models` | Dynamic filtering | `streamGenerateContent?alt=sse` | Transforms ARH role `assistant` to Gemini `model`. Supports system instructions. |
| **OpenRouter** | `IMPLEMENTED` | OpenAI-compatible | High (`sk-or-v1-`) | Least-cost `/models` | Dynamic + Fallbacks | Native OpenAI SSE | Aggregator proxying hundreds of models. Standard OpenAI format. |
| **OpenAI** | `IMPLEMENTED` | OpenAI-compatible | High (`sk-proj-`, `sk-admin-`) | Least-cost `/models` | Dynamic + Fallbacks | Native OpenAI SSE | Official reference implementation. |
| **Anthropic** | `IMPLEMENTED` | Native Anthropic | High (`sk-ant-`) | Least-cost `/models` | Dynamic + Fallbacks | Messages SSE (`content_block_delta`) | Requires `anthropic-version: 2023-06-01`, mandatory `max_tokens`, and system prompt separation. |
| **Cerebras** | `IMPLEMENTED` | OpenAI-compatible | High (`csk-`) | Least-cost `/models` | Dynamic + Fallbacks | Native OpenAI SSE | High-throughput Llama inference; standard OpenAI v1 schema. |
| **DeepSeek** | `IMPLEMENTED` | OpenAI-compatible | Medium (`sk-` 32-hex) | Least-cost `/models` | Dynamic + Fallbacks | Native OpenAI SSE | Supports both content and reasoning tokens (`reasoning_content`). |
| **Together AI** | `IMPLEMENTED` | OpenAI-compatible | Medium (64-hex) | Least-cost `/models` | Dynamic + Fallbacks | Native OpenAI SSE | Standard `/v1/chat/completions` and `/v1/models`. |
| **Fireworks AI** | `PARTIALLY_IMPLEMENTED` | OpenAI-compatible | High (`fw_`) | Least-cost `/models` | Dynamic + Fallbacks | Native OpenAI SSE | Requires account-scoped model names (`accounts/fireworks/models/...`). |
| **Perplexity** | `PARTIALLY_IMPLEMENTED` | OpenAI-compatible | High (`pplx-`) | Fallback dry probe | Static fallback list | Native OpenAI SSE | Perplexity does **not** provide a standard `/models` endpoint; uses static catalog fallback. |
| **xAI (Grok)** | `PARTIALLY_IMPLEMENTED` | OpenAI-compatible | High (`xai-`) | Least-cost `/models` | Dynamic + Fallbacks | Native OpenAI SSE | Standard OpenAI v1 endpoints (`grok-beta`, `grok-2`). |
| **Mistral AI** | `PARTIALLY_IMPLEMENTED` | OpenAI-compatible | Low (ambiguous `sk-`) | Least-cost `/models` | Dynamic + Fallbacks | Native OpenAI SSE | Standard `/v1/models` and `/v1/chat/completions`. |
| **SambaNova** | `PARTIALLY_IMPLEMENTED` | OpenAI-compatible | Low (ambiguous) | Least-cost `/models` | Dynamic + Fallbacks | Native OpenAI SSE | High-speed reconfigurable dataflow units; OpenAI-compatible. |
| **Hugging Face** | `NEEDS_PROVIDER_SPECIFIC_ADAPTER` | OpenAI-compatible router | High (`hf_`) | Least-cost `/models` | Catalog fallback | Native OpenAI SSE | Hugging Face has multiple inference endpoints; router endpoints work with OpenAI schema. |
| **Moonshot (Kimi)**| `PARTIALLY_IMPLEMENTED` | OpenAI-compatible | Low (ambiguous `sk-`) | Least-cost `/models` | Dynamic + Fallbacks | Native OpenAI SSE | Chinese mainland endpoints; standard `/v1` format. |
| **Qwen (DashScope)**| `PARTIALLY_IMPLEMENTED` | OpenAI-compatible | Low (ambiguous `sk-`) | Least-cost `/models` | Dynamic + Fallbacks | Native OpenAI SSE | Uses Alibaba Cloud compatible-mode endpoint. |
| **Custom / Self-Hosted** | `CUSTOM_CONFIGURABLE` | User-defined OpenAI-compatible | Manual | Dynamic probe | Dynamic probe + Fallback | Native OpenAI SSE | Ollama, vLLM, LM Studio, or private reverse proxies. |

---

## Authentication Methods

1. **Bearer Token (`Authorization: Bearer <key>`)**:
   - Groq, NVIDIA NIM, OpenRouter, OpenAI, Cerebras, DeepSeek, Together AI, Fireworks, Perplexity, xAI, Mistral, SambaNova, Hugging Face, Moonshot, Qwen, Custom.
2. **API Header (`x-api-key: <key>`)**:
   - Anthropic Claude (plus `anthropic-version: 2023-06-01` and browser access header).
3. **Query Parameter (`?key=<key>`)**:
   - Google Gemini v1beta (`https://generativelanguage.googleapis.com/v1beta/models?key=<key>`).

---

## Model Discovery Fallback Policy

When an API key connects:
1. ARH queries the provider's metadata endpoint (e.g. `GET /models`).
2. If dynamic listing succeeds with valid items, models are normalized into universal `AIModel` format.
3. If dynamic listing fails (e.g. 404 on Perplexity, network block, or restricted scopes), ARH immediately drops back to the provider's static fallback catalog in `src/providers/catalog.ts`. The user is never blocked with an empty model selector.
