import React, { useState } from 'react';
import { Eye, EyeOff, Clipboard, Check } from 'lucide-react';

interface ApiKeyInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const ApiKeyInput: React.FC<ApiKeyInputProps> = ({
  value,
  onChange,
  placeholder = 'Paste your API key...',
  disabled = false,
}) => {
  const [showKey, setShowKey] = useState(false);
  const [pasted, setPasted] = useState(false);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onChange(text.trim());
        setPasted(true);
        setTimeout(() => setPasted(false), 2000);
      }
    } catch (err) {
      // Clipboard permissions denied or unavailable
    }
  };

  return (
    <div className="relative flex items-center w-full bg-[#161619] border border-[#27272C] hover:border-[#383840] focus-within:border-[#4E4E58] focus-within:ring-1 focus-within:ring-white/10 rounded-xl transition-all duration-200">
      <input
        type={showKey ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        spellCheck="false"
        className="w-full bg-transparent px-3.5 py-3 text-sm text-[#EDEDED] placeholder-neutral-500 outline-none font-mono tracking-wide"
      />

      <div className="flex items-center gap-1 pr-2.5">
        {/* Paste helper button */}
        {!value && (
          <button
            type="button"
            onClick={handlePaste}
            disabled={disabled}
            className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-400 hover:text-neutral-200 hover:bg-white/5 rounded-lg transition-colors"
            title="Paste from clipboard"
          >
            {pasted ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Clipboard className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Paste</span>
          </button>
        )}

        {/* Show/Hide key toggle */}
        {value && (
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            disabled={disabled}
            className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-white/5 rounded-lg transition-colors"
            title={showKey ? 'Hide key' : 'Show key'}
          >
            {showKey ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};
