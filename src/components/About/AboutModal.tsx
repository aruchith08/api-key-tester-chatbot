import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { ARHLogo } from '../Home/ARHLogo';
import { PROVIDER_CATALOG } from '../../providers/catalog';
import { 
  X, 
  ShieldCheck, 
  Zap, 
  Radio, 
  Terminal, 
  Mic, 
  ExternalLink, 
  CheckCircle2,
  Lock,
  Globe,
  Cpu,
  Bot,
  Eye,
  Brain,
  FileCode,
  Layers,
  Sparkles
} from 'lucide-react';

const GitHubIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

type Tab = 'overview' | 'features' | 'architecture' | 'providers' | 'specs';

export const AboutModal: React.FC = () => {
  const { isAboutModalOpen, setAboutModalOpen } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAboutModalOpen) {
        setAboutModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAboutModalOpen, setAboutModalOpen]);

  if (!isAboutModalOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xs transition-opacity animate-fade-in"
      onClick={() => setAboutModalOpen(false)}
    >
      <div 
        className="relative w-full sm:max-w-3xl bg-[#111113] border-t sm:border border-[#26262B] rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl shadow-black overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Title and Badges */}
        <div className="flex items-start justify-between pb-4 border-b border-[#212126]">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center p-1.5 shrink-0">
              <ARHLogo size="sm" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">ARH</h2>
                <span className="px-2 py-0.5 text-[10px] font-medium font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                  v1.2.0
                </span>
                <span className="hidden sm:inline px-2 py-0.5 text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
                  Pyodide Wasm Sandbox
                </span>
                <span className="hidden sm:inline px-2 py-0.5 text-[10px] font-mono text-neutral-400 bg-[#1C1C20] border border-[#2B2B30] rounded-full">
                  Zero Persistence
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Universal Stateless AI Playground, Autonomous Python Sandbox & File Previewer
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAboutModalOpen(false)}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 mt-3 mb-2 p-1 bg-[#16161A] border border-[#24242A] rounded-xl text-xs overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex-1 min-w-[75px] py-1.5 px-3 rounded-lg font-medium transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-[#24242B] text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('features')}
            className={`flex-1 min-w-[75px] py-1.5 px-3 rounded-lg font-medium transition-all cursor-pointer ${
              activeTab === 'features'
                ? 'bg-[#24242B] text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Features
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('architecture')}
            className={`flex-1 min-w-[85px] py-1.5 px-3 rounded-lg font-medium transition-all cursor-pointer ${
              activeTab === 'architecture'
                ? 'bg-[#24242B] text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Architecture
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('providers')}
            className={`flex-1 min-w-[95px] py-1.5 px-3 rounded-lg font-medium transition-all cursor-pointer ${
              activeTab === 'providers'
                ? 'bg-[#24242B] text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Providers ({PROVIDER_CATALOG.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('specs')}
            className={`flex-1 min-w-[80px] py-1.5 px-3 rounded-lg font-medium transition-all cursor-pointer ${
              activeTab === 'specs'
                ? 'bg-[#24242B] text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Tech Specs
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-2 pr-1 space-y-4 text-xs text-neutral-300" style={{ scrollbarWidth: 'none' }}>
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 bg-[#17171B] border border-[#26262D] rounded-xl leading-relaxed">
                <p className="text-sm font-medium text-white mb-1.5">What is ARH?</p>
                <p className="text-neutral-300 leading-normal">
                  <strong className="text-neutral-100">ARH (API Testing Ground & Agent Sandbox)</strong> is a developer-first AI playground built to test, benchmark, and chat with foundation models across {PROVIDER_CATALOG.length} AI providers instantly without managing multiple SDKs, backend databases, or complex configurations.
                </p>
                <p className="text-neutral-400 text-[11px] mt-2 leading-relaxed">
                  Equipped with an in-browser WebAssembly Python sandbox, an autonomous ReAct tool-calling loop, an instant file preview drawer, reasoning stream parsing, and strict zero-persistence security.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 bg-[#151518] border border-[#232328] rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-400 font-medium">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Zero-Persistence Security</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-normal">
                    100% ephemeral in-memory storage. No databases, no localStorage, no cookies, and no tracking. Closing the browser tab permanently destroys all credentials.
                  </p>
                </div>

                <div className="p-3 bg-[#151518] border border-[#232328] rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2 text-blue-400 font-medium">
                    <Zap className="w-4 h-4" />
                    <span>Instant Pattern Detection</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-normal">
                    Heuristic regex engine identifies API key prefixes (<code className="text-neutral-300">xpl_</code>, <code className="text-neutral-300">gsk_</code>, <code className="text-neutral-300">nvapi-</code>, <code className="text-neutral-300">AIzaSy</code>, <code className="text-neutral-300">sk-ant-</code>) with deterministic high-confidence resolution.
                  </p>
                </div>

                <div className="p-3 bg-[#151518] border border-[#232328] rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2 text-yellow-400 font-medium">
                    <Cpu className="w-4 h-4" />
                    <span>Pyodide Wasm Sandbox</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-normal">
                    Client-side WebAssembly Python 3 worker with in-memory virtual filesystem (MEMFS) and automated binary file extraction (<code className="text-neutral-300">.docx</code>, <code className="text-neutral-300">.xlsx</code>, <code className="text-neutral-300">.pdf</code>, <code className="text-neutral-300">.png</code>).
                  </p>
                </div>

                <div className="p-3 bg-[#151518] border border-[#232328] rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2 text-cyan-400 font-medium">
                    <Eye className="w-4 h-4" />
                    <span>Right-Side Preview Drawer ("Sider")</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-normal">
                    Instant, zero-software previewing of chat artifacts: Word docs (Mammoth.js), Excel sheets with multi-sheet tabs (SheetJS), PDFs, interactive HTML iframes, and zoomable images.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 bg-[#151518] border border-[#232328] rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2 text-purple-400 font-medium">
                    <Bot className="w-4 h-4" />
                    <span>Autonomous ReAct Agent Loop</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-normal">
                    Models supporting function calling automatically run scripts via <code className="text-neutral-300">execute_python</code>, inspect execution outputs, and self-verify results before concluding.
                  </p>
                </div>

                <div className="p-3 bg-[#151518] border border-[#232328] rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2 text-rose-400 font-medium">
                    <Brain className="w-4 h-4" />
                    <span>Reasoning & Thinking Streams</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-normal">
                    Dedicated collapsible reasoning drawers for DeepSeek-R1, Cerebras, Nemotron, and OpenAI o-series models parsing <code className="text-neutral-300">&lt;think&gt;</code> tags and reasoning deltas.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FEATURES */}
          {activeTab === 'features' && (
            <div className="space-y-3 animate-fade-in">
              <div className="p-3 bg-[#151518] border border-[#232328] rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-medium">
                  <Cpu className="w-4 h-4" />
                  <span className="text-xs text-white">Client-Side WebAssembly Python Sandbox</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Executes Python 3 entirely within your browser using Pyodide compiled to WebAssembly. Includes an isolated Web Worker runner with lazy-loading, timeout protection (30s), stdout/stderr capture, and an in-memory virtual filesystem (MEMFS).
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['python-docx', 'openpyxl', 'pandas', 'matplotlib', 'reportlab', 'sympy', 'pydantic'].map((pkg) => (
                    <span key={pkg} className="px-2 py-0.5 text-[10px] font-mono bg-[#1D1D22] text-neutral-300 border border-[#2A2A32] rounded">
                      {pkg}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-[#151518] border border-[#232328] rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 font-medium">
                  <Eye className="w-4 h-4" />
                  <span className="text-xs text-white">Right-Side File Preview Drawer ("Sider")</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Clicking any generated file or artifact opens the full-height slide-over drawer on the right side:
                </p>
                <ul className="text-[11px] text-neutral-400 space-y-1 list-disc pl-4">
                  <li><strong className="text-neutral-200">Word Documents (.docx)</strong>: Styled paper layout via Mammoth.js with tables, headings, and images.</li>
                  <li><strong className="text-neutral-200">Excel Spreadsheets (.xlsx, .csv)</strong>: Multi-sheet tabs (Sheet1, Sheet2), cell filtering, search, and gridlines.</li>
                  <li><strong className="text-neutral-200">PDF Documents (.pdf)</strong>: Embedded browser PDF viewer with zoom and page controls.</li>
                  <li><strong className="text-neutral-200">HTML (.html)</strong>: Dual view toggle between sandboxed visual iframe preview and syntax-highlighted source code.</li>
                  <li><strong className="text-neutral-200">Images (.png, .jpg, .svg)</strong>: Canvas view with Zoom In (+), Zoom Out (-), Reset, and download actions.</li>
                </ul>
              </div>

              <div className="p-3 bg-[#151518] border border-[#232328] rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-medium">
                  <Mic className="w-4 h-4" />
                  <span className="text-xs text-white">Voice Input & Speech-to-Text</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Built-in Web Speech API microphone dictation with real-time audio pulsing visualization, interim streaming transcription, and automatic text concatenation.
                </p>
              </div>

              <div className="p-3 bg-[#151518] border border-[#232328] rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-green-400 font-medium">
                  <Terminal className="w-4 h-4" />
                  <span className="text-xs text-white">Developer Mode & Live HTTP Inspector</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Toggle <strong className="text-neutral-200">&gt;_ Dev Mode</strong> to inspect live raw HTTP request headers (secrets safely masked), JSON payloads, upstream response headers, token generation rates, and first-token latency timers.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: ARCHITECTURE */}
          {activeTab === 'architecture' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 bg-[#17171B] border border-[#26262D] rounded-xl space-y-2">
                <p className="text-sm font-medium text-white">Full Autonomous Architecture Flow</p>
                <p className="text-neutral-400 text-[11px] leading-relaxed">
                  ARH separates key detection, connection strategy resolution, autonomous tool calling, and sandbox execution into distinct decoupled layers:
                </p>
                <div className="p-2.5 bg-[#0C0C0E] border border-[#1F1F24] rounded-lg font-mono text-[10px] text-neutral-300 overflow-x-auto">
                  <pre>{`User Pastes API Key
        ↓
Regex Heuristic Engine (Detects Provider & Confidence)
        ↓
Connection Strategy Resolver
   ├── CORS Supported  ──► Direct Browser Transport (Groq, OpenRouter, Cerebras, xAI)
   └── CORS Restricted ──► SSRF-Hardened Edge Proxy (NVIDIA NIM, OpenAI, DeepSeek)
        ↓
Dry Auth Probe & Live Model Discovery (/models)
        ↓
Real-Time SSE Streaming Chat
        ↓
Autonomous Tool Call / Code Detection (execute_python)
        ↓
Pyodide WebAssembly Virtual Worker (MEMFS)
        ↓
Binary File Extraction (Blob URLs) & ReAct Verification Loop
        ↓
Right-Side Interactive File Previewer (PDF, Word, Excel, HTML, Images)`}</pre>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-white">Transport & Execution Modes</p>
                
                <div className="p-3 bg-[#151518] border border-[#232328] rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-emerald-400 font-medium text-xs">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Direct Browser Transport (Zero Proxy)</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-normal">
                    The browser initiates direct <code className="text-neutral-300">fetch()</code> calls to the provider’s cloud API. No intermediary server exists. Your key travels directly from your browser to the AI vendor.
                  </p>
                </div>

                <div className="p-3 bg-[#151518] border border-[#232328] rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-purple-400 font-medium text-xs">
                    <Lock className="w-3.5 h-3.5" />
                    <span>SSRF-Hardened Edge Proxy Fallback</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-normal">
                    Enterprise providers (like NVIDIA NIM and OpenAI) block direct browser requests using CORS. ARH automatically routes these calls through a hardened Edge proxy equipped with strict host allowlisting and internal private IP rejection.
                  </p>
                </div>

                <div className="p-3 bg-[#151518] border border-[#232328] rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-yellow-400 font-medium text-xs">
                    <Cpu className="w-3.5 h-3.5" />
                    <span>In-Browser Web Worker Sandbox</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-normal">
                    Code execution takes place inside a dedicated Web Worker running WebAssembly Python 3. The main UI thread remains responsive at 60 FPS while heavy computations or document generations run in the background.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PROVIDERS */}
          {activeTab === 'providers' && (
            <div className="space-y-3 animate-fade-in">
              <p className="text-xs text-neutral-400">
                ARH includes standardized adapters and live model discovery for {PROVIDER_CATALOG.length} industry AI providers:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[380px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>
                {PROVIDER_CATALOG.map((provider) => {
                  let badgeText = 'Direct';
                  let badgeStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                  
                  if (provider.connectionMode === 'DIRECT_WITH_WARNING') {
                    badgeText = 'Direct*';
                    badgeStyle = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                  } else if (provider.connectionMode === 'RELAY_REQUIRED') {
                    badgeText = 'Proxy';
                    badgeStyle = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
                  } else if (provider.connectionMode === 'UNKNOWN') {
                    badgeText = 'Direct / Proxy';
                    badgeStyle = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                  }

                  return (
                    <div 
                      key={provider.id}
                      className="p-2.5 bg-[#151518] border border-[#232328] hover:border-[#2F2F36] rounded-xl transition-all space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-white text-xs">{provider.name}</span>
                        <span className={`px-1.5 py-0.5 text-[9px] font-mono rounded border ${badgeStyle}`}>
                          {badgeText}
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-400 line-clamp-1">
                        {provider.description || provider.name}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-0.5">
                        <span className="truncate max-w-[150px]">Default: {provider.defaultModelId?.split('/').pop() || 'Dynamic'}</span>
                        <span className="text-neutral-400 font-mono text-[9px]">{provider.adapterType}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: TECH SPECS */}
          {activeTab === 'specs' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 bg-[#17171B] border border-[#26262D] rounded-xl space-y-2.5">
                <p className="text-sm font-medium text-white">Technology Stack</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className="p-2 bg-[#121214] border border-[#212126] rounded-lg">
                    <span className="text-neutral-500 block text-[10px]">Framework</span>
                    <span className="text-neutral-200 font-medium">React 19</span>
                  </div>
                  <div className="p-2 bg-[#121214] border border-[#212126] rounded-lg">
                    <span className="text-neutral-500 block text-[10px]">Language</span>
                    <span className="text-neutral-200 font-medium">TypeScript 5.x</span>
                  </div>
                  <div className="p-2 bg-[#121214] border border-[#212126] rounded-lg">
                    <span className="text-neutral-500 block text-[10px]">Bundler</span>
                    <span className="text-neutral-200 font-medium">Vite 8</span>
                  </div>
                  <div className="p-2 bg-[#121214] border border-[#212126] rounded-lg">
                    <span className="text-neutral-500 block text-[10px]">Sandbox Runtime</span>
                    <span className="text-neutral-200 font-medium">Pyodide Wasm</span>
                  </div>
                  <div className="p-2 bg-[#121214] border border-[#212126] rounded-lg">
                    <span className="text-neutral-500 block text-[10px]">Document Parsers</span>
                    <span className="text-neutral-200 font-medium">Mammoth & SheetJS</span>
                  </div>
                  <div className="p-2 bg-[#121214] border border-[#212126] rounded-lg">
                    <span className="text-neutral-500 block text-[10px]">Styling</span>
                    <span className="text-neutral-200 font-medium">Tailwind CSS</span>
                  </div>
                  <div className="p-2 bg-[#121214] border border-[#212126] rounded-lg">
                    <span className="text-neutral-500 block text-[10px]">State Store</span>
                    <span className="text-neutral-200 font-medium">Zustand</span>
                  </div>
                  <div className="p-2 bg-[#121214] border border-[#212126] rounded-lg">
                    <span className="text-neutral-500 block text-[10px]">Deployment</span>
                    <span className="text-neutral-200 font-medium">Vercel Edge</span>
                  </div>
                  <div className="p-2 bg-[#121214] border border-[#212126] rounded-lg">
                    <span className="text-neutral-500 block text-[10px]">Speech Recognition</span>
                    <span className="text-neutral-200 font-medium">Web Speech API</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-[#17171B] border border-[#26262D] rounded-xl space-y-2">
                <p className="text-sm font-medium text-white">Testing & Reliability</p>
                <div className="flex items-center gap-2 text-emerald-400 text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>210 Automated Tests Passing (100%)</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-normal">
                  Comprehensive test suites covering Provider Detection Heuristics, OpenAI / Gemini / Anthropic / Experiential Adapters, Error Normalization, SSE Stream & Thinking Parser, Transport Truth Model, Python Code Detector, and Autonomous ReAct Harness.
                </p>
              </div>

              <div className="p-3 bg-[#151518] border border-[#232328] rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-medium text-white text-xs">Open Source Repository</p>
                  <p className="text-[11px] text-neutral-400">Published on GitHub under the MIT License</p>
                </div>
                <a
                  href="https://github.com/aruchith08/api-key-tester-chatbot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#202026] hover:bg-[#2A2A32] text-white border border-[#2F2F37] rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  <GitHubIcon className="w-3.5 h-3.5" />
                  <span>GitHub</span>
                  <ExternalLink className="w-3 h-3 text-neutral-400" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="pt-3 mt-2 border-t border-[#202025] flex items-center justify-between text-[11px] text-neutral-500">
          <span>ARH · AI API Testing Ground & Sandbox</span>
          <span>Crafted by <strong className="text-neutral-300">Ruchith</strong></span>
        </div>
      </div>
    </div>
  );
};
