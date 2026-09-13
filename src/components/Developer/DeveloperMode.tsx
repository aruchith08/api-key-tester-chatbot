import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { RequestInspector } from './RequestInspector';
import { ResponseInspector } from './ResponseInspector';
import { PerformanceMetrics } from './PerformanceMetrics';
import { CapabilityPanel } from './CapabilityPanel';
import { SessionVerificationPanel } from './SessionVerificationPanel';
import { X, Terminal, ArrowUpRight, ArrowDownLeft, Gauge, Sparkles, ShieldCheck } from 'lucide-react';

export const DeveloperMode: React.FC = () => {
  const {
    isDeveloperModeOpen,
    setDeveloperModeOpen,
    lastRequest,
    lastResponse,
    performanceMetrics,
    selectedProvider,
    selectedModel,
    modelSource,
    resolvedStrategy,
    sessionVerification
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'request' | 'response' | 'metrics' | 'capabilities' | 'verification'>('verification');

  if (!isDeveloperModeOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in"
      onClick={() => setDeveloperModeOpen(false)}
    >
      <div 
        className="relative w-full max-w-2xl bg-[#101012] border border-[#26262B] rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#202025]">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <div>
              <h3 className="text-sm font-semibold text-white">Developer Mode</h3>
              <p className="text-[11px] text-neutral-400">
                Inspect live API transactions, latency metrics, and model capabilities
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDeveloperModeOpen(false)}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global Connection & Model Source Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 py-2 px-3 my-2 bg-[#141417] border border-[#232328] rounded-xl text-xs">
          <div className="flex items-center gap-2 text-[11px] truncate">
            <span className="text-neutral-400">Provider:</span>
            <span className="text-white font-medium">{selectedProvider?.name || 'None'}</span>
            <span className="text-neutral-600">•</span>
            <span className="text-neutral-400">Model:</span>
            <span className="text-neutral-200 font-mono">{selectedModel?.id || 'None'}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {resolvedStrategy && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                resolvedStrategy.badge.color === 'emerald'
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : resolvedStrategy.badge.color === 'amber'
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : resolvedStrategy.badge.color === 'purple'
                  ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                  : 'bg-neutral-800 text-neutral-400 border-neutral-700'
              }`}>
                {resolvedStrategy.badge.text}
              </span>
            )}

            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400 text-[10px] uppercase font-mono tracking-wider">Catalog:</span>
              {modelSource === 'live' ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  ● Live API
                </span>
              ) : modelSource === 'fallback' ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  Fallback
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-800 text-neutral-400">
                  Unspecified
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 py-3 border-b border-[#1C1C20] overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('verification')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'verification'
                ? 'bg-white/10 text-white font-medium'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Verification</span>
            {sessionVerification && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('request')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'request'
                ? 'bg-white/10 text-white font-medium'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            <span>Request</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('response')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'response'
                ? 'bg-white/10 text-white font-medium'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-sky-400" />
            <span>Response</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('metrics')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'metrics'
                ? 'bg-white/10 text-white font-medium'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
            }`}
          >
            <Gauge className="w-3.5 h-3.5 text-purple-400" />
            <span>Performance</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('capabilities')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'capabilities'
                ? 'bg-white/10 text-white font-medium'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Capabilities</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto py-4 pr-1" style={{ scrollbarWidth: 'thin' }}>
          {activeTab === 'verification' && <SessionVerificationPanel />}
          {activeTab === 'request' && <RequestInspector data={lastRequest} />}
          {activeTab === 'response' && <ResponseInspector data={lastResponse} />}
          {activeTab === 'metrics' && <PerformanceMetrics metrics={performanceMetrics} />}
          {activeTab === 'capabilities' && <CapabilityPanel />}
        </div>
      </div>
    </div>
  );
};
