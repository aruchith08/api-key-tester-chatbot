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
  Globe
} from 'lucide-react';

const GitHubIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

type Tab = 'overview' | 'architecture' | 'providers' | 'specs';

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
        className="relative w-full sm:max-w-2xl bg-[#111113] border-t sm:border border-[#26262B] rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl shadow-black overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Title and Close Button */}
        <div className="flex items-start justify-between pb-4 border-b border-[#212126]">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center p-1 shrink-0">
              <ARHLogo size="sm" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">ARH</h2>
                <span className="px-2 py-0.5 text-[10px] font-medium font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                  v1.0.0
                </span>
                <span className="hidden sm:inline px-2 py-0.5 text-[10px] font-mono text-neutral-400 bg-[#1C1C20] border border-[#2B2B30] rounded-full">
                  Zero Persistence
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Universal, Stateless AI API Playground & Key Validator
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAboutModalOpen(false)}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 mt-3 mb-2 p-1 bg-[#16161A] border border-[#24242A] rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all ${
              activeTab === 'overview'
                ? 'bg-[#24242B] text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('architecture')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all ${
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
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all ${
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
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all ${
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
                <p className="text-neutral-300">
                  <strong className="text-neutral-100">ARH (API Testing Ground)</strong> is a developer-first AI playground built to test, benchmark, and chat with foundation models across 19+ AI providers instantly without managing multiple SDKs, backend databases, or complex configurations.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 bg-[#151518] border border-[#232328] rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-400 font-medium">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Zero-Persistence Security</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-normal">
                    100% ephemeral in-memory storage. No databases, no localStorage, no cookies, and no tracking. Closing the browser tab destroys all credentials.
                  </p>
                </div>

                <div className="p-3 bg-[#151518] border border-[#232328] rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2 text-blue-400 font-medium">
                    <Zap className="w-4 h-4" />
                    <span>Instant Pattern Detection</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-normal">
                    Heuristic regex engine identifies API key prefixes (<code className="text-neutral-300">gsk_</code>, <code className="text-neutral-300">nvapi-</code>, <code className="text-neutral-300">AIzaSy</code>, <code className="text-neutral-300">sk-ant-</code>) in real-time.
                  </p>
                </div>

                <div className="p-3 bg-[#151518] border border-[#232328] rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2 text-purple-400 font-medium">
                    <Radio className="w-4 h-4" />
                    <span>Adaptive Dual Transport</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-normal">
                    Direct browser fetch for open CORS providers (Groq, OpenRouter) with transparent stateless proxy fallback for enterprise APIs (NVIDIA NIM, OpenAI).
                  </p>
                </div>

                <div className="p-3 bg-[#151518] border border-[#232328] rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-400 font-medium">
                    <Mic className="w-4 h-4" />
                    <span>Speech-to-Text Dictation</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-normal">
                    Native browser Web Speech API integration for hands-free voice input with real-time interim streaming transcription.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-[#151518] border border-[#232328] rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 text-cyan-400 font-medium">
                  <Terminal className="w-4 h-4" />
                  <span>Developer Mode & HTTP Inspector</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-normal">
                  Click <strong className="text-neutral-200">&gt;_ Dev Mode</strong> to inspect live raw HTTP request headers (with secrets masked), JSON payloads, upstream response headers, token generation rates, and first-token latency timers.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: ARCHITECTURE */}
          {activeTab === 'architecture' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 bg-[#17171B] border border-[#26262D] rounded-xl space-y-2">
                <p className="text-sm font-medium text-white">Network Flow & Strategy Resolution</p>
                <p className="text-neutral-400 text-[11px] leading-relaxed">
                  ARH separates key detection, connection strategy resolution, and transport execution into distinct architectural layers:
                </p>
                <div className="p-2.5 bg-[#0C0C0E] border border-[#1F1F24] rounded-lg font-mono text-[10px] text-neutral-300 overflow-x-auto">
                  <pre>{`User Pastes API Key
        ↓
Regex Heuristic Engine (Detects Provider & Confidence)
        ↓
Connection Strategy Resolver
   ├── CORS Supported  ──► Direct Browser Transport (Groq, OpenRouter, Cerebras)
   └── CORS Restricted ──► Stateless Relay/Proxy (NVIDIA NIM, OpenAI, DeepSeek)
        ↓
Lightweight Dry Auth Probe & Live Model Discovery (/models)
        ↓
Universal SSE Streaming Normalizer ──► Live Token Stream in Chat UI`}</pre>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-white">Transport Modes Explained</p>
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
                    <span>Stateless Proxy Fallback (Vite & Vercel Edge)</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-normal">
                    Enterprise providers (such as NVIDIA NIM) block direct browser requests using CORS (<code className="text-neutral-300">access-control-allow-origin: null</code>). ARH automatically routes these requests through a stateless Edge proxy that forwards raw bytes without logging or caching.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PROVIDERS */}
          {activeTab === 'providers' && (
            <div className="space-y-3 animate-fade-in">
              <p className="text-xs text-neutral-400">
                ARH includes standardized adapters and live model discovery for {PROVIDER_CATALOG.length} industry AI providers:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[380px] overflow-y-auto pr-1">
                {PROVIDER_CATALOG.map((provider) => (
                  <div 
                    key={provider.id}
                    className="p-2.5 bg-[#151518] border border-[#232328] hover:border-[#2F2F36] rounded-xl transition-all space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white text-xs">{provider.name}</span>
                      <span className={`px-1.5 py-0.5 text-[9px] font-mono rounded ${
                        provider.connectionMode === 'DIRECT' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : provider.connectionMode === 'DIRECT_WITH_WARNING'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      }`}>
                        {provider.connectionMode === 'DIRECT' ? 'Direct' : provider.connectionMode === 'DIRECT_WITH_WARNING' ? 'Direct*' : 'Proxy'}
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-400 line-clamp-1">
                      {provider.description || provider.name}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-0.5">
                      <span>Default: {provider.defaultModelId?.split('/').pop() || 'Dynamic'}</span>
                      <span className="text-neutral-400">{provider.adapterType}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: TECH SPECS & CREDITS */}
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
                </div>
              </div>

              <div className="p-3.5 bg-[#17171B] border border-[#26262D] rounded-xl space-y-2">
                <p className="text-sm font-medium text-white">Testing & Reliability</p>
                <div className="flex items-center gap-2 text-emerald-400 text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>130 Automated Tests Passing</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-normal">
                  Comprehensive test coverage spanning provider detection heuristics, adapter payload normalization, SSE chunk parsing, error code categorization, and connection strategy resolution.
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
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#202026] hover:bg-[#2A2A32] text-white border border-[#2F2F37] rounded-lg text-xs font-medium transition-colors"
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
          <span>ARH · AI API Testing Ground</span>
          <span>Crafted by <strong className="text-neutral-300">Ruchith</strong></span>
        </div>
      </div>
    </div>
  );
};
