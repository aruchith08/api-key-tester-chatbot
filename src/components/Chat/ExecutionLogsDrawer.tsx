import React, { useState } from 'react';
import { Terminal, ChevronDown, ChevronRight, Copy, Check, CheckCircle2, XCircle } from 'lucide-react';
import type { CodeExecutionState } from '../../types/chat';

interface ExecutionLogsDrawerProps {
  execution: CodeExecutionState;
}

export const ExecutionLogsDrawer: React.FC<ExecutionLogsDrawerProps> = ({ execution }) => {
  const [isExpanded, setIsExpanded] = useState(execution.status === 'error');
  const [copied, setCopied] = useState(false);

  const isSuccess = execution.status === 'success';
  const durationSec = execution.durationMs ? (execution.durationMs / 1000).toFixed(2) : null;

  const handleCopyLogs = async () => {
    const fullLog = [
      execution.code ? `# Executed Code:\n${execution.code}\n` : '',
      execution.stdout ? `# STDOUT:\n${execution.stdout}\n` : '',
      execution.stderr ? `# STDERR:\n${execution.stderr}\n` : '',
      execution.error ? `# ERROR:\n${execution.error}\n` : ''
    ].filter(Boolean).join('\n');

    try {
      await navigator.clipboard.writeText(fullLog);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {}
  };

  return (
    <div className="w-full my-2.5 rounded-xl border border-[#232328] bg-[#0F0F12] overflow-hidden text-xs transition-all">
      {/* Drawer Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3.5 py-2 bg-[#141417] hover:bg-[#18181D] text-left transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-neutral-400" />
          <span className="font-medium text-neutral-300 text-xs">Execution Logs</span>

          {durationSec && (
            <span className="text-[11px] text-neutral-500 font-mono">
              ({durationSec}s)
            </span>
          )}

          {isSuccess ? (
            <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3" />
              <span>Success</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <XCircle className="w-3 h-3" />
              <span>Failed</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-neutral-500 text-[11px]">
          <span>{isExpanded ? 'Hide' : 'Show'}</span>
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </div>
      </button>

      {/* Drawer Content */}
      {isExpanded && (
        <div className="p-3.5 bg-[#0A0A0C] border-t border-[#1C1C21] font-mono text-xs space-y-3">
          {/* Output log */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1.5">
              <span className="text-neutral-500 uppercase tracking-wider text-[10px]">Console Output</span>
              <button
                type="button"
                onClick={handleCopyLogs}
                className="flex items-center gap-1 text-neutral-400 hover:text-white transition-colors"
                title="Copy full logs"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-3 bg-[#060608] border border-[#1E1E22] rounded-lg max-h-60 overflow-y-auto leading-relaxed whitespace-pre-wrap selection:bg-neutral-800">
              {execution.stdout && (
                <div className="text-emerald-400/90">{execution.stdout}</div>
              )}
              {execution.stderr && (
                <div className="text-amber-400/90 mt-1">{execution.stderr}</div>
              )}
              {execution.error && (
                <div className="text-rose-400 mt-1">{execution.error}</div>
              )}
              {!execution.stdout && !execution.stderr && !execution.error && (
                <div className="text-neutral-600 italic">No console output produced.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
