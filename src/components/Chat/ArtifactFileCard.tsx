import React from 'react';
import { Download, FileText, FileSpreadsheet, Image as ImageIcon, FileArchive, Eye, Globe, Code } from 'lucide-react';
import type { GeneratedFile } from '../../types/chat';
import { useAppStore } from '../../store/appStore';

interface ArtifactFileCardProps {
  file: GeneratedFile;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export const ArtifactFileCard: React.FC<ArtifactFileCardProps> = ({ file }) => {
  const { setPreviewFile } = useAppStore();
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  const isImage = ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].includes(ext);
  const isDoc = ['doc', 'docx', 'odt'].includes(ext);
  const isSpreadsheet = ['xls', 'xlsx', 'csv', 'tsv'].includes(ext);
  const isPdf = ext === 'pdf';
  const isHtml = ['html', 'htm'].includes(ext);
  const isArchive = ['zip', 'tar', 'gz', 'rar'].includes(ext);

  const getFileMeta = () => {
    if (isDoc) {
      return {
        icon: <FileText className="w-5 h-5 text-blue-400" />,
        badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        cardBorder: 'border-blue-500/20 hover:border-blue-500/40',
        label: ext.toUpperCase() || 'DOCX'
      };
    }
    if (isSpreadsheet) {
      return {
        icon: <FileSpreadsheet className="w-5 h-5 text-emerald-400" />,
        badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        cardBorder: 'border-emerald-500/20 hover:border-emerald-500/40',
        label: ext.toUpperCase() || 'EXCEL'
      };
    }
    if (isPdf) {
      return {
        icon: <FileText className="w-5 h-5 text-rose-400" />,
        badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        cardBorder: 'border-rose-500/20 hover:border-rose-500/40',
        label: 'PDF'
      };
    }
    if (isHtml) {
      return {
        icon: <Globe className="w-5 h-5 text-amber-400" />,
        badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        cardBorder: 'border-amber-500/20 hover:border-amber-500/40',
        label: 'HTML'
      };
    }
    if (isImage) {
      return {
        icon: <ImageIcon className="w-5 h-5 text-purple-400" />,
        badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        cardBorder: 'border-purple-500/20 hover:border-purple-500/40',
        label: ext.toUpperCase() || 'IMAGE'
      };
    }
    if (isArchive) {
      return {
        icon: <FileArchive className="w-5 h-5 text-amber-400" />,
        badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        cardBorder: 'border-amber-500/20 hover:border-amber-500/40',
        label: 'ARCHIVE'
      };
    }
    return {
      icon: <Code className="w-5 h-5 text-neutral-400" />,
      badgeBg: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20',
      cardBorder: 'border-neutral-500/20 hover:border-neutral-500/40',
      label: ext.toUpperCase() || 'FILE'
    };
  };

  const meta = getFileMeta();

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = file.url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      onClick={() => setPreviewFile(file)}
      className={`my-2 rounded-xl bg-[#141417] border ${meta.cardBorder} p-3.5 transition-all duration-200 shadow-sm cursor-pointer group hover:bg-[#18181C]`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Icon & File info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-[#1A1A1E] border border-[#26262B] shrink-0 group-hover:border-[#35353E] transition-colors">
            {meta.icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-neutral-200 group-hover:text-white transition-colors truncate" title={file.name}>
                {file.name}
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${meta.badgeBg}`}>
                {meta.label}
              </span>
            </div>
            <div className="text-xs text-neutral-500 mt-0.5 font-mono">
              {formatBytes(file.size)}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setPreviewFile(file)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-neutral-300 hover:text-white bg-[#1A1A1E] hover:bg-[#23232A] border border-[#282830] rounded-lg transition-colors cursor-pointer"
            title={`Preview ${file.name} in side panel`}
          >
            <Eye className="w-3.5 h-3.5 text-neutral-400" />
            <span className="hidden sm:inline">Preview</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 active:scale-98 rounded-lg transition-all shadow-sm cursor-pointer"
            title="Download file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
        </div>
      </div>
    </div>
  );
};
