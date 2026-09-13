import React, { useState } from 'react';
import { Check, Copy, Play } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-sql';

interface CodeBlockProps {
  language?: string;
  code: string;
  onRunCode?: (code: string) => void;
  isRunning?: boolean;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ 
  language = 'text', 
  code,
  onRunCode,
  isRunning = false
}) => {
  const [copied, setCopied] = useState(false);

  const cleanLang = language.toLowerCase().replace(/^language-/, '');
  const grammar = Prism.languages[cleanLang] || Prism.languages.javascript || Prism.languages.clike;

  let highlighted = code;
  try {
    if (grammar) {
      highlighted = Prism.highlight(code, grammar, cleanLang);
    }
  } catch (err) {
    highlighted = code;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Ignore
    }
  };

  return (
    <div className="relative group my-3 rounded-xl overflow-hidden border border-[#27272D] bg-[#0E0E10] text-xs font-mono">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#161619] border-b border-[#232328] text-neutral-400">
        <span className="text-[11px] font-medium text-neutral-400 select-none">
          {cleanLang || 'code'}
        </span>
        <div className="flex items-center gap-2">
          {['python', 'py', 'python3'].includes(cleanLang) && onRunCode && (
            <button
              type="button"
              onClick={() => onRunCode(code)}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded transition-colors disabled:opacity-40 cursor-pointer"
              title="Execute Python script in Pyodide sandbox"
            >
              <Play className="w-3 h-3 fill-emerald-400" />
              <span>{isRunning ? 'Running...' : 'Run in Sandbox'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2 py-1 text-[11px] hover:text-white rounded transition-colors"
            title="Copy code"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-neutral-400" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Content */}
      <div className="p-3.5 overflow-x-auto leading-relaxed text-[#EDEDED]">
        <pre className="!bg-transparent !p-0 !m-0">
          <code 
            className={`language-${cleanLang}`}
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </pre>
      </div>
    </div>
  );
};
