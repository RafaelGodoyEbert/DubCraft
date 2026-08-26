import React, { useState, useRef } from 'react';
import { Project, User } from '../../types';
import { Drawer } from '../common/Drawer';
import { repositoryAdapterSingleton } from '../../repositories/storageAdapter';
import { Upload, FileCode, CheckCircle2, AlertCircle, FileText, Sparkles, FolderArchive } from 'lucide-react';

interface JSONImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  defaultProjectId?: string;
  currentUser: User;
  onImportCompleted: () => void;
}

export const JSONImporterModal: React.FC<JSONImporterModalProps> = ({
  isOpen,
  onClose,
  projects,
  defaultProjectId,
  currentUser,
  onImportCompleted,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    defaultProjectId || projects[0]?.id || ''
  );
  const [cutsceneName, setCutsceneName] = useState<string>('cutscene_01.json');
  const [jsonText, setJsonText] = useState<string>('');
  const [parsedLines, setParsedLines] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [batchFiles, setBatchFiles] = useState<{ filename: string; lines: any[] }[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setSuccess(null);
    const loadedBatches: { filename: string; lines: any[] }[] = [];

    const filesList: File[] = Array.from(files);
    filesList.forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const raw = JSON.parse(event.target?.result as string);
          const lines = Array.isArray(raw) ? raw : raw.dialogues || raw.lines || [raw];
          loadedBatches.push({
            filename: file.name,
            lines,
          });

          if (loadedBatches.length === filesList.length) {
            setBatchFiles(loadedBatches);
            if (loadedBatches.length === 1) {
              setCutsceneName(loadedBatches[0].filename);
              setParsedLines(loadedBatches[0].lines);
              setJsonText(JSON.stringify(loadedBatches[0].lines, null, 2));
            } else {
              const totalLines = loadedBatches.reduce((acc, b) => acc + b.lines.length, 0);
              setSuccess(`${loadedBatches.length} arquivos JSON carregados com sucesso (${totalLines} falas no total).`);
            }
          }
        } catch (err: any) {
          setError(`Erro ao ler o arquivo ${file.name}: Formato JSON inválido.`);
        }
      };
      reader.readAsText(file);
    });
  };

  const handleJsonTextChange = (text: string) => {
    setJsonText(text);
    setError(null);
    setSuccess(null);
    setBatchFiles([]);

    if (!text.trim()) {
      setParsedLines([]);
      return;
    }

    try {
      const parsed = JSON.parse(text);
      const lines = Array.isArray(parsed) ? parsed : parsed.dialogues || parsed.lines || [parsed];
      setParsedLines(lines);
    } catch (err: any) {
      setError('Sintaxe JSON inválida.');
      setParsedLines([]);
    }
  };

  const handleImport = async () => {
    if (!activeProject) {
      setError('Selecione um projeto de destino.');
      return;
    }

    try {
      setIsImporting(true);
      setError(null);

      let totalImported = 0;

      if (batchFiles.length > 0) {
        for (const batch of batchFiles) {
          const res = await repositoryAdapterSingleton.importCutsceneJSON(
            activeProject.id,
            batch.filename,
            batch.lines
          );
          totalImported += res.importedCount;
        }
      } else {
        if (parsedLines.length === 0) {
          setError('Nenhuma linha para importar.');
          setIsImporting(false);
          return;
        }
        const res = await repositoryAdapterSingleton.importCutsceneJSON(
          activeProject.id,
          cutsceneName,
          parsedLines
        );
        totalImported = res.importedCount;
      }

      // Record in audit log
      await repositoryAdapterSingleton.createAuditLog({
        id: `audit_${Date.now()}`,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'PROJECT_EXPORT',
        details: `Importou ${totalImported} falas para o projeto "${activeProject.name}".`,
        targetId: activeProject.id,
        createdAt: new Date().toISOString(),
      });

      setSuccess(`Sucesso! ${totalImported} falas foram importadas e disponibilizadas para revisão.`);
      setTimeout(() => {
        onImportCompleted();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Erro ao importar JSONs.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Importador de JSONs de Cutscenes">
      <div className="space-y-4 text-xs sm:text-sm">
        <p className="text-zinc-400 text-xs">
          Faça upload de arquivos <code className="text-amber-300">.json</code> das cutscenes ou cole a estrutura diretamente. O sistema processa as falas para revisão instantânea.
        </p>

        {/* Project Selector */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-zinc-300">Projeto de Destino *</label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-200 text-xs focus:outline-none focus:border-amber-500 min-h-[44px]"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.totalLines} falas cadastradas)
              </option>
            ))}
          </select>
        </div>

        {/* File Upload Box */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-zinc-300">Carregar Arquivo(s) .JSON</label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-800 hover:border-amber-500/80 bg-zinc-950/60 hover:bg-zinc-900/50 rounded-2xl p-4 sm:p-6 text-center cursor-pointer transition-all space-y-2"
          >
            <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-zinc-200 text-xs sm:text-sm">
                Clique para selecionar ou arraste arquivos .json
              </p>
              <p className="text-[11px] text-zinc-500">
                Suporta um ou múltiplos JSONs de cutscenes (ex: cutscene_01.json, boss_intro.json)
              </p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* If Single File or Manual Paste */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-zinc-300">
            Nome do Arquivo da Cutscene (Ex: cutscene_palacio.json)
          </label>
          <input
            type="text"
            value={cutsceneName}
            onChange={(e) => setCutsceneName(e.target.value)}
            placeholder="cutscene_01.json"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-100 text-xs font-mono focus:outline-none focus:border-amber-500 min-h-[44px]"
          />
        </div>

        {/* Text Area for Pasting Raw JSON */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-zinc-300">Ou Cole o Conteúdo JSON:</label>
            {parsedLines.length > 0 && (
              <span className="text-[11px] text-emerald-400 font-bold">
                ✓ {parsedLines.length} falas detectadas
              </span>
            )}
          </div>
          <textarea
            rows={4}
            value={jsonText}
            onChange={(e) => handleJsonTextChange(e.target.value)}
            placeholder={`[\n  {\n    "texto_original": "Time is like a river...",\n    "traducao_ptbr": "O tempo é como um rio...",\n    "emocao": "neutro",\n    "tipo_voz": "masculino_adulto"\n  }\n]`}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-100 text-xs font-mono focus:outline-none focus:border-amber-500 resize-none"
          />
        </div>

        {/* Batch Files Preview */}
        {batchFiles.length > 1 && (
          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <FolderArchive className="w-4 h-4" /> Lote de {batchFiles.length} Arquivos Prontos para Importação:
            </span>
            <div className="max-h-28 overflow-y-auto space-y-1">
              {batchFiles.map((b, idx) => (
                <div key={idx} className="flex items-center justify-between text-[11px] text-zinc-300 bg-zinc-900/60 p-1.5 rounded-lg">
                  <span className="font-mono">{b.filename}</span>
                  <span className="text-zinc-500">{b.lines.length} falas</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feedback Banners */}
        {error && (
          <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs rounded-xl border border-zinc-800 min-h-[44px]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={isImporting || (parsedLines.length === 0 && batchFiles.length === 0)}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow transition-all flex items-center gap-2 min-h-[44px] disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {isImporting ? 'Importando Falas...' : 'Importar para o Projeto'}
          </button>
        </div>
      </div>
    </Drawer>
  );
};
