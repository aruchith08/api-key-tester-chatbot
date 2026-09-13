import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Sliders, Info } from 'lucide-react';

interface AdvancedSetupProps {
  baseUrl: string;
  chatEndpoint: string;
  authHeader: string;
  customHeaders: string;
  manualModelId: string;
  onChange: (fields: {
    baseUrl?: string;
    chatEndpoint?: string;
    authHeader?: string;
    customHeaders?: string;
    manualModelId?: string;
  }) => void;
}

export const AdvancedSetup: React.FC<AdvancedSetupProps> = ({
  baseUrl,
  chatEndpoint,
  authHeader,
  customHeaders,
  manualModelId,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full border-t border-[#222226] pt-3">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-xs text-neutral-400 hover:text-neutral-200 transition-colors w-full text-left py-1"
      >
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
        )}
        <Sliders className="w-3.5 h-3.5 text-neutral-500" />
        <span className="font-medium">Advanced Setup</span>
        <span className="text-[10px] text-neutral-500 ml-auto">
          (Custom endpoints, self-hosted, Ollama)
        </span>
      </button>

      {isOpen && (
        <div className="flex flex-col gap-3 mt-3 p-3.5 bg-[#141416] border border-[#232328] rounded-xl text-xs animate-fade-in">
          {/* Base URL */}
          <div className="flex flex-col gap-1">
            <label className="text-neutral-400 font-medium flex items-center justify-between">
              <span>Base URL</span>
              <span className="text-[10px] text-neutral-500">e.g. http://localhost:11434/v1</span>
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => onChange({ baseUrl: e.target.value })}
              placeholder="https://api.example.com/v1"
              className="bg-[#1B1B1E] border border-[#2B2B32] rounded-lg px-3 py-1.5 text-neutral-200 placeholder-neutral-600 outline-none focus:border-neutral-500 font-mono text-[11px]"
            />
          </div>

          {/* Chat Endpoint & Auth Header */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-neutral-400 font-medium">Chat Endpoint</label>
              <input
                type="text"
                value={chatEndpoint}
                onChange={(e) => onChange({ chatEndpoint: e.target.value })}
                placeholder="/chat/completions"
                className="bg-[#1B1B1E] border border-[#2B2B32] rounded-lg px-3 py-1.5 text-neutral-200 placeholder-neutral-600 outline-none focus:border-neutral-500 font-mono text-[11px]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-neutral-400 font-medium">Auth Header</label>
              <input
                type="text"
                value={authHeader}
                onChange={(e) => onChange({ authHeader: e.target.value })}
                placeholder="Authorization"
                className="bg-[#1B1B1E] border border-[#2B2B32] rounded-lg px-3 py-1.5 text-neutral-200 placeholder-neutral-600 outline-none focus:border-neutral-500 font-mono text-[11px]"
              />
            </div>
          </div>

          {/* Manual Model ID */}
          <div className="flex flex-col gap-1">
            <label className="text-neutral-400 font-medium flex items-center justify-between">
              <span>Manual Model ID</span>
              <span className="text-[10px] text-neutral-500">Useful if model listing fails</span>
            </label>
            <input
              type="text"
              value={manualModelId}
              onChange={(e) => onChange({ manualModelId: e.target.value })}
              placeholder="e.g. llama3, mistral, custom-fine-tuned-model"
              className="bg-[#1B1B1E] border border-[#2B2B32] rounded-lg px-3 py-1.5 text-neutral-200 placeholder-neutral-600 outline-none focus:border-neutral-500 font-mono text-[11px]"
            />
          </div>

          {/* Additional Headers */}
          <div className="flex flex-col gap-1">
            <label className="text-neutral-400 font-medium flex items-center justify-between">
              <span>Custom Headers (JSON)</span>
            </label>
            <textarea
              value={customHeaders}
              onChange={(e) => onChange({ customHeaders: e.target.value })}
              placeholder='{ "HTTP-Referer": "https://mysite.com" }'
              rows={2}
              className="bg-[#1B1B1E] border border-[#2B2B32] rounded-lg px-3 py-1.5 text-neutral-200 placeholder-neutral-600 outline-none focus:border-neutral-500 font-mono text-[11px] resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
};
