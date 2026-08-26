import React, { useState } from 'react';
import { Project, ProjectContributor, ExportFormat } from '../../types';
import { Drawer } from '../common/Drawer';
import { exportServiceSingleton } from '../../services/export/exportService';
import { Download, Copy, Check, FileText, Code } from 'lucide-react';

interface CreditsExporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  contributors: ProjectContributor[];
}

export const CreditsExporterModal: React.FC<CreditsExporterModalProps> = ({
  isOpen,
  onClose,
  project,
  contributors,
}) => {
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [copied, setCopied] = useState(false);

  const creditsContent = exportServiceSingleton.generateCredits(project, contributors, format);

  const handleCopy = () => {
    navigator.clipboard.writeText(creditsContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename = `creditos_${project.slug}.${format === 'markdown' ? 'md' : format}`;
    exportServiceSingleton.downloadFile(filename, creditsContent);
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={`Exportar Créditos — ${project.name}`}>
      <div className="space-y-4">
        {/* Format Selector */}
        <div className="flex items-center gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setFormat('markdown')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all min-h-[44px] flex items-center justify-center gap-1.5 ${
              format === 'markdown'
                ? 'bg-amber-500 text-zinc-950 shadow-md font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Markdown (.md)
          </button>

          <button
            onClick={() => setFormat('txt')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all min-h-[44px] flex items-center justify-center gap-1.5 ${
              format === 'txt'
                ? 'bg-amber-500 text-zinc-950 shadow-md font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Texto (.txt)
          </button>

          <button
            onClick={() => setFormat('json')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all min-h-[44px] flex items-center justify-center gap-1.5 ${
              format === 'json'
                ? 'bg-amber-500 text-zinc-950 shadow-md font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" /> JSON (.json)
          </button>
        </div>

        {/* Generated Text Area Preview */}
        <div className="relative">
          <textarea
            readOnly
            rows={10}
            value={creditsContent}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-300 font-mono focus:outline-none leading-relaxed"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={handleCopy}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl border border-zinc-700 transition-all flex items-center gap-1.5 min-h-[44px]"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" /> Copiado!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> Copiar Créditos
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1.5 min-h-[44px]"
          >
            <Download className="w-4 h-4" /> Baixar Arquivo
          </button>
        </div>
      </div>
    </Drawer>
  );
};
