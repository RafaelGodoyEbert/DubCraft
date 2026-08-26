import React, { useEffect, useState } from 'react';
import { AuditLog } from '../../types';
import { repositoryAdapterSingleton } from '../../repositories/storageAdapter';
import { History, ShieldAlert, CheckCircle2, FileUp } from 'lucide-react';

export const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    async function loadLogs() {
      const data = await repositoryAdapterSingleton.getAuditLogs();
      setLogs(data);
    }
    loadLogs();
  }, []);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xl">
      <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3">
        <History className="w-5 h-5 text-amber-400" />
        <div>
          <h3 className="text-sm font-bold text-zinc-100">Histórico Imutável de Auditoria (Audit Log)</h3>
          <p className="text-xs text-zinc-400">Todas as ações administrativas críticas e aprovações são gravadas de forma irrefutável.</p>
        </div>
      </div>

      {logs.length === 0 ? (
        <p className="text-xs text-zinc-500 text-center py-6">Nenhum registro de auditoria encontrado.</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {logs.map((log) => {
            const icon =
              log.action === 'TRUST_GRANT' ? (
                <ShieldAlert className="w-4 h-4 text-emerald-400" />
              ) : log.action === 'PROJECT_EXPORT' ? (
                <FileUp className="w-4 h-4 text-amber-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
              );

            return (
              <div
                key={log.id}
                className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/80 text-xs space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-zinc-200 flex items-center gap-1.5">
                    {icon} {log.userName}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {new Date(log.createdAt).toLocaleString('pt-BR')}
                  </span>
                </div>
                <p className="text-zinc-300 font-sans">{log.details}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
