import React, { useState } from 'react';
import type { InspectorRequestData } from '../../types/capabilities';
import { sanitizeHeaders, sanitizeUrl } from '../../utils/maskApiKey';
import { useAppStore } from '../../store/appStore';
import { getRuntimeModelId } from '../../types/provider';
import { Copy, Check, Radio } from 'lucide-react';

interface RequestInspectorProps {
  data: InspectorRequestData | null;
}

export const RequestInspector: React.FC<RequestInspectorProps> = ({ data }) => {
  const { selectedProvider, selectedModel, modelSource } = useAppStore();
  const [copied, setCopied] = useState(false);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-neutral-500 text-xs text-center">
        <span>No request sent yet in this session.</span>
        <span className="text-neutral-600 mt-1">Send a message in chat to inspect live HTTP traffic.</span>
      </div>
    );
  }

  const sanitizedUrl = sanitizeUrl(data.url);
  const sanitizedHeaders = sanitizeHeaders(data.headers);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify({
        method: data.method,
        url: sanitizedUrl,
        headers: sanitizedHeaders,
        body: data.body
      }, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Ignore
    }
  };

  return (
    <div className="flex flex-col gap-3 text-xs font-mono">
      {/* Provider & Model Source Meta Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-[#141417] border border-[#232328] rounded-xl font-sans text-xs">
        <div className="flex items-center gap-2">
          <span className="text-neutral-400">Provider:</span>
          <span className="text-white font-medium">{selectedProvider?.name || 'Unknown'}</span>
          <span className="text-neutral-600">•</span>
          <span className="text-neutral-400">Model:</span>
          <span className="text-neutral-200 font-mono text-[11px]">{getRuntimeModelId(selectedModel, 'default')}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-neutral-400 text-[11px]">Model Source:</span>
          {modelSource === 'live' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
              Live Provider API
            </span>
          ) : modelSource === 'fallback' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
              Fallback Catalog
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-800 text-neutral-400">
              Default
            </span>
          )}
        </div>
      </div>

      {/* Method & Sanitized URL */}
      <div className="flex items-center justify-between gap-2 p-2.5 bg-[#161619] border border-[#232328] rounded-xl">
        <div className="flex items-center gap-2 truncate">
          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 font-bold rounded text-[11px]">
            {data.method}
          </span>
          <span className="text-neutral-300 truncate text-[11px] font-mono">{sanitizedUrl}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white px-2 py-1 rounded bg-[#1F1F24] hover:bg-[#282830] transition-colors shrink-0 font-sans"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {/* Sanitized Headers */}
      <div className="flex flex-col gap-1">
        <span className="text-neutral-400 text-[11px] font-semibold uppercase tracking-wider">
          Headers (Sanitized)
        </span>
        <div className="p-3 bg-[#131316] border border-[#222226] rounded-xl overflow-x-auto text-[11px] leading-relaxed text-neutral-300">
          {Object.entries(sanitizedHeaders).map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <span className="text-neutral-500 select-none">{k}:</span>
              <span className="text-neutral-200 break-all">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Request Body JSON */}
      <div className="flex flex-col gap-1">
        <span className="text-neutral-400 text-[11px] font-semibold uppercase tracking-wider">
          Request Body
        </span>
        <pre className="p-3 bg-[#131316] border border-[#222226] rounded-xl overflow-x-auto text-[11px] leading-relaxed text-emerald-400 max-h-[220px]">
          <code>{JSON.stringify(data.body, null, 2)}</code>
        </pre>
      </div>
    </div>
  );
};
