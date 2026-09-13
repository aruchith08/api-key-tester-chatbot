import React from 'react';
import { useAppStore } from '../../store/appStore';
import type { VerificationStageStatus } from '../../types/verification';
import { CheckCircle2, XCircle, Clock, Loader2, ShieldCheck, AlertTriangle, MinusCircle, RefreshCw } from 'lucide-react';

export const SessionVerificationPanel: React.FC = () => {
  const { sessionVerification, selectedProvider, resolvedStrategy } = useAppStore();

  if (!sessionVerification) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-xs text-neutral-500">
        <ShieldCheck className="w-8 h-8 text-neutral-600 mb-2" />
        <span className="text-neutral-300 font-medium">No active session verification</span>
        <span className="text-neutral-500 mt-1 max-w-sm leading-relaxed">
          Connect with an API key and send a chat message to track real-time end-to-end verification.
        </span>
      </div>
    );
  }

  const stages = [
    { key: 'providerDetection', label: '1. Provider Detection', desc: 'Heuristic pattern matching on pasted key' },
    { key: 'connectionStrategy', label: '2. Connection Strategy', desc: 'Direct vs Relay transport policy resolution' },
    { key: 'authentication', label: '3. Authentication', desc: 'Live upstream API handshake probe' },
    { key: 'modelDiscovery', label: '4. Model Discovery', desc: 'Dynamic model catalog enumeration' },
    { key: 'modelSelection', label: '5. Model Selection', desc: 'Suitability resolution of default model' },
    { key: 'chat', label: '6. Chat Execution', desc: 'Upstream message generation and completion' },
    { key: 'streaming', label: '7. SSE Streaming', desc: 'Real-time token delta and usage parsing' },
    { key: 'stopGeneration', label: '8. Stop Generation', desc: 'AbortController stream interruption safety' }
  ] as const;

  const renderStatusBadge = (status: VerificationStageStatus) => {
    switch (status) {
      case 'PASSED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            PASSED
          </span>
        );
      case 'RUNNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30 animate-pulse">
            <Loader2 className="w-3 h-3 text-sky-400 animate-spin" />
            RUNNING
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
            <XCircle className="w-3 h-3 text-red-400" />
            FAILED
          </span>
        );
      case 'SKIPPED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <MinusCircle className="w-3 h-3 text-amber-400" />
            SKIPPED
          </span>
        );
      case 'NOT_TESTED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-800 text-neutral-400 border border-neutral-700">
            <Clock className="w-3 h-3 text-neutral-500" />
            NOT TESTED
          </span>
        );
    }
  };

  const getOverallBadge = () => {
    switch (sessionVerification.overall) {
      case 'VERIFIED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            VERIFIED
          </span>
        );
      case 'PARTIALLY_VERIFIED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin" style={{ animationDuration: '4s' }} />
            PARTIALLY VERIFIED
          </span>
        );
      case 'FAILED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            FAILED
          </span>
        );
      case 'NOT_VERIFIED':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-800 text-neutral-400 border border-neutral-700">
            NOT VERIFIED
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* Overview Card */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-[#151518] border border-[#232328] rounded-xl">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium text-sm">{sessionVerification.providerName}</span>
            {resolvedStrategy && (
              <span className="text-[10px] font-mono text-neutral-400">
                [{resolvedStrategy.mode}]
              </span>
            )}
          </div>
          <span className="text-[11px] text-neutral-400 font-mono">
            Session started: {new Date(sessionVerification.startedAt).toLocaleTimeString()}
          </span>
        </div>

        <div>{getOverallBadge()}</div>
      </div>

      {/* Stage Checklist */}
      <div className="flex flex-col gap-2">
        {stages.map(({ key, label, desc }) => {
          const stage = sessionVerification.stages[key];
          return (
            <div
              key={key}
              className="flex items-start justify-between gap-3 p-2.5 bg-[#141416] border border-[#202024] rounded-xl"
            >
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-neutral-200 text-xs">{label}</span>
                  {stage.durationMs !== undefined && (
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {stage.durationMs}ms
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-neutral-400 leading-tight truncate">
                  {desc}
                </span>
                {stage.details && (
                  <span className="text-[11px] text-neutral-300 mt-1 font-mono bg-neutral-900/60 px-2 py-0.5 rounded border border-neutral-800 self-start">
                    {stage.details}
                  </span>
                )}
                {stage.error && (
                  <span className="text-[11px] text-red-400 mt-1 font-mono bg-red-950/30 px-2 py-0.5 rounded border border-red-900/40 self-start">
                    {stage.error}
                  </span>
                )}
              </div>

              <div className="shrink-0 pt-0.5">
                {renderStatusBadge(stage.status)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Ephemeral Privacy Notice */}
      <div className="flex items-center gap-1.5 p-2 bg-[#121214] border border-[#1e1e22] rounded-lg text-[10px] text-neutral-400 mt-1">
        <ShieldCheck className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
        <span>Verification data is runtime-only and strictly tied to this session. Nothing is stored in browser storage or transmitted to ARH servers.</span>
      </div>
    </div>
  );
};
