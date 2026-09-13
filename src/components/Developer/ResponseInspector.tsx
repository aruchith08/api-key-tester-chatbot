import React, { useState } from 'react';
import type { InspectorResponseData } from '../../types/capabilities';
import { Copy, Check } from 'lucide-react';

interface ResponseInspectorProps {
  data: InspectorResponseData | null;
}

export const ResponseInspector: React.FC<ResponseInspectorProps> = ({ data }) => {
  const [copied, setCopied] = useState(false);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-neutral-500 text-xs text-center">
        <span>No response received yet in this session.</span>
        <span className="text-neutral-600 mt-1">Provider responses and raw payloads will appear here.</span>
      </div>
    );
  }

  const isSuccess = data.status >= 200 && data.status < 300;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data.body, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Ignore
    }
  };

  return (
    <div className="flex flex-col gap-3 text-xs font-mono">
      {/* HTTP Status Bar */}
      <div className="flex items-center justify-between p-2.5 bg-[#161619] border border-[#232328] rounded-xl">
        <div className="flex items-center gap-2">
          <span 
            className={`px-2 py-0.5 font-bold rounded text-[11px] ${
              isSuccess ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
            }`}
          >
            HTTP {data.status}
          </span>
          <span className="text-neutral-300 text-[11px]">{data.statusText || (isSuccess ? 'OK' : 'Error')}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white px-2 py-1 rounded bg-[#1F1F24] hover:bg-[#282830] transition-colors shrink-0"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {/* Response Body JSON / Text */}
      <div className="flex flex-col gap-1">
        <span className="text-neutral-400 text-[11px] font-semibold uppercase tracking-wider">
          Parsed Response Payload
        </span>
        <pre className="p-3 bg-[#131316] border border-[#222226] rounded-xl overflow-x-auto text-[11px] leading-relaxed text-neutral-200 max-h-[260px]">
          <code>{typeof data.body === 'string' ? data.body : JSON.stringify(data.body, null, 2)}</code>
        </pre>
      </div>
    </div>
  );
};
