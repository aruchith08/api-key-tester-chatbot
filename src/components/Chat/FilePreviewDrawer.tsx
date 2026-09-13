import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  Maximize2,
  Minimize2,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Code,
  Globe,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import type { GeneratedFile } from '../../types/chat';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Loads an external CDN script dynamically if not already loaded.
 */
function loadExternalScript(url: string, globalVarName: string): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any)[globalVarName]) {
      resolve((window as any)[globalVarName]);
      return;
    }

    const existingScript = document.querySelector(`script[src="${url}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve((window as any)[globalVarName]));
      existingScript.addEventListener('error', (err) => reject(err));
      return;
    }

    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.onload = () => resolve((window as any)[globalVarName]);
    script.onerror = (err) => reject(new Error(`Failed to load script: ${url}`));
    document.head.appendChild(script);
  });
}

// --------------------------------------------------------------------------
// 1. PDF Viewer
// --------------------------------------------------------------------------
const PdfViewer: React.FC<{ file: GeneratedFile }> = ({ file }) => {
  return (
    <div className="w-full h-full flex flex-col bg-[#141417]">
      <iframe
        src={`${file.url}#toolbar=1&navpanes=0`}
        title={file.name}
        className="w-full h-full border-0 rounded-lg bg-[#18181C]"
      />
    </div>
  );
};

// --------------------------------------------------------------------------
// 2. Word (.docx) Viewer using Mammoth.js
// --------------------------------------------------------------------------
const DocxViewer: React.FC<{ file: GeneratedFile }> = ({ file }) => {
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    async function convertDocx() {
      try {
        const mammoth = await loadExternalScript(
          'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js',
          'mammoth'
        );

        const response = await fetch(file.url);
        const arrayBuffer = await response.arrayBuffer();

        const result = await mammoth.convertToHtml({ arrayBuffer });
        if (active) {
          setHtmlContent(result.value);
          setLoading(false);
        }
      } catch (err: any) {
        if (active) {
          setError(err?.message || 'Failed to render Word document.');
          setLoading(false);
        }
      }
    }

    convertDocx();
    return () => {
      active = false;
    };
  }, [file.url]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-neutral-400">
        <div className="w-7 h-7 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin" />
        <span className="text-sm">Rendering Word document...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-neutral-400 p-6 text-center">
        <AlertCircle className="w-8 h-8 text-rose-400" />
        <p className="text-sm text-neutral-300 font-medium">Could not display Word preview</p>
        <p className="text-xs text-neutral-500 max-w-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto p-4 sm:p-8 bg-[#0E0E10] flex justify-center">
      <div className="w-full max-w-3xl bg-[#1A1A1E] text-neutral-100 p-8 sm:p-12 rounded-xl shadow-2xl border border-[#27272D] prose prose-invert prose-blue max-w-none prose-table:border prose-table:border-[#33333A] prose-th:bg-[#222228] prose-th:p-2 prose-td:p-2 prose-td:border prose-td:border-[#2D2D35] prose-headings:font-semibold prose-headings:text-neutral-100">
        <div dangerouslySetInnerHTML={{ __html: htmlContent || '<p className="text-neutral-500 italic">Empty document.</p>' }} />
      </div>
    </div>
  );
};

// --------------------------------------------------------------------------
// 3. Spreadsheet Viewer (Excel .xlsx / .xls & CSV / TSV)
// --------------------------------------------------------------------------
const SpreadsheetViewer: React.FC<{ file: GeneratedFile }> = ({ file }) => {
  const [sheets, setSheets] = useState<{ name: string; data: any[][] }[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const isCsvOrTsv = ['csv', 'tsv'].includes(ext);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    async function parseSpreadsheet() {
      try {
        if (isCsvOrTsv) {
          const text = await (await fetch(file.url)).text();
          const delimiter = ext === 'tsv' ? '\t' : ',';
          const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
          const rows = lines.map(line => {
            // Simple CSV split handling quotes
            const row: string[] = [];
            let inQuotes = false;
            let current = '';
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === delimiter && !inQuotes) {
                row.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            row.push(current.trim());
            return row;
          });

          if (active) {
            setSheets([{ name: file.name, data: rows }]);
            setLoading(false);
          }
        } else {
          // Excel .xlsx or .xls
          const XLSX = await loadExternalScript(
            'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
            'XLSX'
          );

          const response = await fetch(file.url);
          const arrayBuffer = await response.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });

          const extractedSheets = workbook.SheetNames.map((sheetName: string) => {
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
            return { name: sheetName, data };
          });

          if (active) {
            setSheets(extractedSheets);
            setLoading(false);
          }
        }
      } catch (err: any) {
        if (active) {
          setError(err?.message || 'Failed to parse spreadsheet data.');
          setLoading(false);
        }
      }
    }

    parseSpreadsheet();
    return () => {
      active = false;
    };
  }, [file.url, isCsvOrTsv, ext, file.name]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-neutral-400">
        <div className="w-7 h-7 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
        <span className="text-sm">Loading spreadsheet...</span>
      </div>
    );
  }

  if (error || sheets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-neutral-400 p-6 text-center">
        <AlertCircle className="w-8 h-8 text-rose-400" />
        <p className="text-sm text-neutral-300 font-medium">Unable to parse spreadsheet</p>
        <p className="text-xs text-neutral-500 max-w-sm">{error || 'No sheets found'}</p>
      </div>
    );
  }

  const currentSheet = sheets[activeSheetIndex] || sheets[0];
  const rows = currentSheet.data;

  // Filter rows based on search
  const filteredRows = searchQuery
    ? rows.filter(row => row.some(cell => String(cell).toLowerCase().includes(searchQuery.toLowerCase())))
    : rows;

  // Generate column labels: A, B, C...
  const maxCols = rows.reduce((max, r) => Math.max(max, r.length), 0);
  const getColLetter = (index: number) => {
    let letter = '';
    let temp = index;
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#141417]">
      {/* Sub-header: Search & Stats */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#25252B] bg-[#161619] gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search cells..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1F1F24] border border-[#2D2D35] rounded-lg pl-8 pr-3 py-1 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
        <div className="text-xs text-neutral-400 font-mono">
          {rows.length} rows &bull; {maxCols} cols
        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-1 overflow-auto bg-[#101012]">
        <table className="min-w-full border-collapse text-xs text-neutral-200 font-mono">
          <thead className="sticky top-0 bg-[#1A1A1E] z-10 shadow-xs">
            <tr>
              <th className="w-12 px-2 py-2 text-center text-neutral-500 bg-[#161619] border-r border-b border-[#2A2A30] font-medium select-none">
                #
              </th>
              {Array.from({ length: maxCols }).map((_, colIdx) => (
                <th
                  key={colIdx}
                  className="px-3 py-2 text-left font-medium text-neutral-400 border-r border-b border-[#2A2A30] min-w-[120px] select-none"
                >
                  {getColLetter(colIdx)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-white/[0.03] transition-colors border-b border-[#222228]">
                <td className="px-2 py-1.5 text-center text-neutral-500 bg-[#161619]/60 border-r border-[#26262C] font-mono text-[11px] select-none">
                  {rowIdx + 1}
                </td>
                {Array.from({ length: maxCols }).map((_, colIdx) => (
                  <td
                    key={colIdx}
                    className="px-3 py-1.5 border-r border-[#222228] truncate max-w-[240px] text-neutral-300"
                    title={String(row[colIdx] ?? '')}
                  >
                    {String(row[colIdx] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sheet Tabs Bar (if multiple sheets exist) */}
      {sheets.length > 1 && (
        <div className="flex items-center gap-1 px-3 py-1.5 bg-[#17171B] border-t border-[#25252B] overflow-x-auto">
          {sheets.map((sheet, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveSheetIndex(idx)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                activeSheetIndex === idx
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
              }`}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// --------------------------------------------------------------------------
// 4. HTML Viewer (Visual Sandboxed Preview & Code View)
// --------------------------------------------------------------------------
const HtmlViewer: React.FC<{ file: GeneratedFile }> = ({ file }) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(file.url)
      .then(res => res.text())
      .then(text => setHtmlContent(text))
      .catch(() => setHtmlContent(''));
  }, [file.url]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(htmlContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#141417]">
      {/* Tab Switcher */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#25252B] bg-[#161619]">
        <div className="flex items-center gap-1 bg-[#1F1F24] p-0.5 rounded-lg border border-[#2B2B32]">
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              activeTab === 'preview'
                ? 'bg-[#2A2A32] text-neutral-100 shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Visual Preview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              activeTab === 'code'
                ? 'bg-[#2A2A32] text-neutral-100 shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Source Code
          </button>
        </div>

        {activeTab === 'code' && (
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-neutral-400 hover:text-neutral-200 hover:bg-white/5 rounded-lg border border-transparent hover:border-[#2F2F36] transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy HTML'}</span>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 h-full overflow-auto">
        {activeTab === 'preview' ? (
          <iframe
            srcDoc={htmlContent}
            sandbox="allow-scripts allow-forms allow-popups"
            title={file.name}
            className="w-full h-full border-0 bg-white"
          />
        ) : (
          <div className="p-4 bg-[#101012] h-full overflow-auto">
            <pre className="text-xs font-mono text-neutral-300 leading-relaxed whitespace-pre-wrap break-all">
              {htmlContent}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

// --------------------------------------------------------------------------
// 5. Image Viewer with Zoom & Pan
// --------------------------------------------------------------------------
const ImageViewer: React.FC<{ file: GeneratedFile }> = ({ file }) => {
  const [zoom, setZoom] = useState(1);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.25));
  const handleReset = () => setZoom(1);

  return (
    <div className="w-full h-full flex flex-col bg-[#0F0F12]">
      {/* Zoom Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#25252B] bg-[#161619]">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-neutral-400 font-mono px-2">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors ml-1"
            title="Reset Zoom (100%)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Canvas Area with Checkerboard */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-6 bg-[radial-gradient(#202026_1px,transparent_1px)] [background-size:16px_16px]">
        <img
          src={file.url}
          alt={file.name}
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-transform duration-100"
        />
      </div>
    </div>
  );
};

// --------------------------------------------------------------------------
// 6. Text / Code Viewer
// --------------------------------------------------------------------------
const TextViewer: React.FC<{ file: GeneratedFile }> = ({ file }) => {
  const [content, setContent] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(file.url)
      .then(res => res.text())
      .then(text => setContent(text))
      .catch(() => setContent(''));
  }, [file.url]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = content.split('\n');

  return (
    <div className="w-full h-full flex flex-col bg-[#101013]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#25252B] bg-[#161619]">
        <span className="text-xs text-neutral-400 font-mono">{lines.length} lines</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-neutral-400 hover:text-neutral-200 hover:bg-white/5 rounded-lg border border-transparent hover:border-[#2F2F36] transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy All'}</span>
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4 font-mono text-xs text-neutral-200">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-white/[0.03]">
                <td className="w-10 pr-4 text-right text-neutral-600 select-none text-[11px]">
                  {idx + 1}
                </td>
                <td className="whitespace-pre-wrap break-all text-neutral-300">
                  {line || ' '}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --------------------------------------------------------------------------
// Main File Preview Drawer (Right-Side Sider)
// --------------------------------------------------------------------------
export const FilePreviewDrawer: React.FC = () => {
  const { previewFile, setPreviewFile } = useAppStore();
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewFile(null);
      }
    };
    if (previewFile) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [previewFile, setPreviewFile]);

  if (!previewFile) return null;

  const ext = previewFile.name.split('.').pop()?.toLowerCase() || '';
  const isDocx = ['docx', 'doc', 'odt'].includes(ext);
  const isSpreadsheet = ['xlsx', 'xls', 'csv', 'tsv'].includes(ext);
  const isPdf = ext === 'pdf';
  const isHtml = ['html', 'htm'].includes(ext);
  const isImage = ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].includes(ext);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = previewFile.url;
    a.download = previewFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const getFileBadge = () => {
    if (isDocx) return { label: 'WORD DOCUMENT', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' };
    if (isSpreadsheet) return { label: ext.toUpperCase() || 'SPREADSHEET', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
    if (isPdf) return { label: 'PDF DOCUMENT', color: 'bg-rose-500/15 text-rose-400 border-rose-500/30' };
    if (isHtml) return { label: 'HTML PAGE', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
    if (isImage) return { label: 'IMAGE', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' };
    return { label: ext.toUpperCase() || 'FILE', color: 'bg-neutral-500/15 text-neutral-400 border-neutral-500/30' };
  };

  const badge = getFileBadge();

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-fade-in">
      {/* Backdrop */}
      <div
        onClick={() => setPreviewFile(null)}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      />

      {/* Slide-over Right Panel */}
      <div
        className={`relative z-10 h-full bg-[#121215] border-l border-[#24242A] shadow-2xl flex flex-col transition-all duration-300 ease-out ${
          isFullscreen
            ? 'w-full'
            : 'w-full sm:w-[560px] md:w-[680px] lg:w-[820px] xl:w-[940px]'
        }`}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-[#24242A] bg-[#161619] shrink-0">
          {/* File Meta */}
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className="p-2 rounded-xl bg-[#1C1C21] border border-[#2B2B32] shrink-0">
              {isDocx && <FileText className="w-4 h-4 text-blue-400" />}
              {isSpreadsheet && <FileSpreadsheet className="w-4 h-4 text-emerald-400" />}
              {isPdf && <FileText className="w-4 h-4 text-rose-400" />}
              {isHtml && <Globe className="w-4 h-4 text-amber-400" />}
              {isImage && <ImageIcon className="w-4 h-4 text-purple-400" />}
              {!isDocx && !isSpreadsheet && !isPdf && !isHtml && !isImage && (
                <Code className="w-4 h-4 text-neutral-400" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm sm:text-base text-neutral-100 truncate" title={previewFile.name}>
                  {previewFile.name}
                </h3>
                <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border ${badge.color}`}>
                  {badge.label}
                </span>
              </div>
              <div className="text-xs text-neutral-500 font-mono mt-0.5">
                {formatBytes(previewFile.size)}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Download Button */}
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-400 rounded-xl text-xs font-medium transition-all"
              title="Download File"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setPreviewFile(null)}
              className="p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors ml-1"
              title="Close Preview (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preview Viewer Body */}
        <div className="flex-1 h-full overflow-hidden relative">
          {isPdf && <PdfViewer file={previewFile} />}
          {isDocx && <DocxViewer file={previewFile} />}
          {isSpreadsheet && <SpreadsheetViewer file={previewFile} />}
          {isHtml && <HtmlViewer file={previewFile} />}
          {isImage && <ImageViewer file={previewFile} />}
          {!isPdf && !isDocx && !isSpreadsheet && !isHtml && !isImage && (
            <TextViewer file={previewFile} />
          )}
        </div>
      </div>
    </div>
  );
};
