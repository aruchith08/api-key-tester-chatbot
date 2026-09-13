import React from 'react';
import type { PerformanceMetricsData } from '../../types/capabilities';
import { Timer, Zap, Cpu, Layers } from 'lucide-react';

interface PerformanceMetricsProps {
  metrics: PerformanceMetricsData | null;
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ metrics }) => {
  if (!metrics) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-neutral-500 text-xs text-center">
        <span>No performance metrics recorded yet.</span>
        <span className="text-neutral-600 mt-1">Send a message to measure latency, TTFT, and token usage.</span>
      </div>
    );
  }

  const items = [
    {
      label: 'Time to First Token (TTFT)',
      value: metrics.timeToFirstTokenMs !== undefined ? `${Math.round(metrics.timeToFirstTokenMs)} ms` : 'Not Available',
      icon: <Zap className="w-4 h-4 text-emerald-400" />,
      desc: 'Time from request dispatch until first streaming token arrived'
    },
    {
      label: 'Total Response Duration',
      value: metrics.totalResponseTimeMs !== undefined ? `${Math.round(metrics.totalResponseTimeMs)} ms` : 'Not Available',
      icon: <Timer className="w-4 h-4 text-sky-400" />,
      desc: 'Total elapsed time from request to stream completion'
    },
    {
      label: 'Prompt Tokens',
      value: metrics.promptTokens !== undefined ? metrics.promptTokens.toLocaleString() : 'Not Available',
      icon: <Layers className="w-4 h-4 text-purple-400" />,
      desc: 'Tokens consumed by input messages and system instructions'
    },
    {
      label: 'Completion Tokens',
      value: metrics.completionTokens !== undefined ? metrics.completionTokens.toLocaleString() : 'Not Available',
      icon: <Cpu className="w-4 h-4 text-amber-400" />,
      desc: 'Tokens generated in the model response'
    },
    {
      label: 'Total Tokens',
      value: metrics.totalTokens !== undefined ? metrics.totalTokens.toLocaleString() : 'Not Available',
      icon: <Cpu className="w-4 h-4 text-emerald-400" />,
      desc: 'Combined input and output token count'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
      {items.map((it, idx) => (
        <div key={idx} className="p-3 bg-[#141417] border border-[#232328] rounded-xl flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-neutral-400 font-medium">
            {it.icon}
            <span>{it.label}</span>
          </div>
          <div className="font-mono text-base font-semibold text-white mt-1">
            {it.value}
          </div>
          <div className="text-[11px] text-neutral-500 leading-snug">
            {it.desc}
          </div>
        </div>
      ))}
    </div>
  );
};
