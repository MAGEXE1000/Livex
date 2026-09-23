# ADR 004: Open-Source Reasoning Model Architecture for Livex Music AI

**Date**: 2026-09-23  
**Status**: Accepted  
**Supersedes**: N/A  

---

## 1. Context

In previous versions of Livex Android, the in-app Music AI assistant exhibited critical failure modes:
1. When queries failed to match narrow hardcoded regex patterns (e.g. `"Hi"`, `"Make me a chord progression of heavy rock"`, `"Poop"`), the system silently fell back to an internal 47KB static rules table in `localMusicIntelligence.ts`, repeatedly returning a canned menu of "Supported technical queries".
2. Simulated typing via `requestAnimationFrame` gave an illusion of generation without actual model inference.
3. Error conditions were silently swallowed rather than presented honestly to the user.

### Mobile Device & APK Constraints
- **Zero Local Model Weights**: Modern reasoning LLMs range from 7B to 671B parameters (requiring 4GB to 300GB+ VRAM/RAM). Embedding model weights inside the Android APK or attempting to execute LLM inference in the mobile WebView / Hermes JavaScript runtime would cause immediate Out-Of-Memory (OOM) crashes, thermal throttling, battery drain, and frame-rate drops below the mandatory 120 Hz Livex performance baseline.
- **Client Topology**: The Android APK and Mobile Web Preview must remain ultra-lightweight client frontends communicating over Server-Sent Events (SSE) to a remote inference gateway.

---

## 2. Models Evaluated

| Model | Architecture | Reasoning Depth | Music Theory Rigor | Multilingual / Global Scenes | Tool / Search | Deployment Footprint |
|---|---|---|---|---|---|---|
| **DeepSeek-R1** (671B MoE) | Reinforcement Learning Reasoning (MoE) | **5/5** (Native Chain-of-Thought) | **5/5** (Superior harmonic logic & voice leading) | **4.8/5** (Deep cultural nuance) | Supported via API / prompt | High (Multi-node datacenter / hosted) |
| **DeepSeek-R1-Distill-Qwen-32B** | Dense 32B Reasoning | **4.9/5** | **4.9/5** | **4.9/5** (Excels in Western, Latin, Asian scenes) | Native tool schema | Medium (1x 24GB GPU with AWQ/FP8) |
| **QwQ-32B** | Dense 32B Reasoning (Qwen) | **4.8/5** | **4.8/5** | **4.9/5** (Deep Japanese/Asian scene knowledge) | Native tool schema | Medium (1x 24GB GPU) |
| **Qwen2.5-32B-Instruct** | Dense 32B Instruction | **4.2/5** | **4.4/5** | **4.9/5** | Native function calling | Medium (1x 24GB GPU) |
| **Mistral-Small-24B** | Dense 24B Instruction | **3.8/5** | **3.9/5** | **3.8/5** (Weaker on non-Western scenes) | Function calling | Low-Medium (16GB VRAM) |

---

## 3. Serving Engines Evaluated

1. **vLLM (Production Cluster)**:
   - High throughput with PagedAttention and continuous batching.
   - Native OpenAI-compatible `/v1/chat/completions` API.
   - Emits streaming `reasoning_content` delta chunks for reasoning models.
   - Recommended for dedicated GPU deployments (AWS, GCP, Hetzner).

2. **Ollama (Developer Workstations / Private Node)**:
   - Easy setup (`ollama run deepseek-r1:32b`).
   - Exposes `/v1/chat/completions` on `http://localhost:11434/v1`.
   - Ideal for local development preview and self-hosted private servers.

3. **Managed OpenAI-Compatible Inference Gateways (Groq, Together, DeepInfra, OpenRouter)**:
   - Serverless endpoints for `DeepSeek-R1` and `QwQ-32B`.
   - Ultra-fast Time To First Token (TTFT < 300ms on Groq LPUs).
   - Zero infrastructure maintenance.

---

## 4. Decision

1. **Primary Model Family**: Adopt **DeepSeek-R1** (specifically `DeepSeek-R1-Distill-Qwen-32B` or hosted `DeepSeek-R1`) and **QwQ-32B** as the target open-source reasoning models for music intelligence.
2. **Standard Protocol**: Standardize backend communication on the **OpenAI-compatible `/v1/chat/completions`** streaming protocol with Server-Sent Events (SSE).
3. **Dual Provider & Search Grounding**: Support Google Gemini 2.5 Flash as an available cloud provider for native Google Search Grounding when time-sensitive music web retrieval is required.
4. **Reasoning State Mapping**:
   - Parse `delta.reasoning_content` and `<think>...</think>` tokens in real-time.
   - Suppress unformatted chain-of-thought dump from the user message bubble.
   - Emit `data: {"type": "state", "state": "solving"}\n\n` to transition `ThinkingOrb` into the reasoning state.
   - When reasoning concludes, emit `data: {"type": "state", "state": "composing"}\n\n` and stream final formatted markdown tokens.
5. **Complete Retirement of `localMusicIntelligence.ts`**:
   - Permanently delete the hardcoded 47KB static mock.
   - Unconfigured or failing backends must display an honest, styled error card with a **"Retry"** action instead of falling back to fake canned text.
6. **Bring-Your-Own-Key (BYOK) & Custom Gateway in Settings**:
   - Provide client-side settings to point to any custom OpenAI-compatible gateway (e.g. Ollama, vLLM, DeepSeek, Groq, OpenRouter) or enter a custom API key.

---

## 5. Consequences

- **Positive**:
  - Eliminates all static canned menus.
  - Every valid prompt receives a unique, dynamically reasoned, technically accurate music response.
  - Zero APK bloat (no gigabyte model weights in the client).
  - Maintains 120 Hz rendering performance on mobile devices.
  - Direct observability of reasoning phases (`connecting` -> `solving` -> `composing` -> `idle`).
- **Negative**:
  - Requires network connectivity for AI generation (standard for modern mobile LLM architectures).
- **Compliance**:
  - Strictly follows Livex Performance Baseline Contract, Single Source of Truth, and Permanent Architecture Migration Rule.
