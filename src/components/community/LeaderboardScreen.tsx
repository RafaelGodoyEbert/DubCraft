import React, { useState, useEffect } from 'react';
import { Project, ProjectContributor } from '../../types';
import { Badge } from '../common/Badge';
import { CreditsExporterModal } from './CreditsExporterModal';
import { repositoryAdapterSingleton } from '../../repositories/storageAdapter';
import { Trophy, Award, Download, CheckCircle2, UserCheck } from 'lucide-react';

interface LeaderboardScreenProps {
  projects: Project[];
  currentProject?: Project;
}

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({
  projects,
  currentProject,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    currentProject?.id || projects[0]?.id || 'proj_sands_of_time'
  );
  const [contributors, setContributors] = useState<ProjectContributor[]>([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const activeProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  useEffect(() => {
    async function loadContributors() {
      setIsLoading(true);
      if (activeProject) {
        const data = await repositoryAdapterSingleton.getProjectContributors(activeProject.id);
        setContributors(data);
      }
      setIsLoading(false);
    }
    loadContributors();
  }, [selectedProjectId]);

  const sortedContributors = [...contributors].sort((a, b) => b.approvedCount - a.approvedCount);

  return (
    <div className="space-y-4 pb-20">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-zinc-900 via-zinc-900 to-amber-950/40 p-4 sm:p-6 rounded-2xl border border-zinc-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs tracking-wide uppercase">
            <Trophy className="w-4 h-4" /> Quadro de Honra & Créditos
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100">
            Contribuidores da Comunidade
          </h1>
          <p className="text-xs text-zinc-400 max-w-xl">
            Ranking baseado em propostas aprovadas de tradução, ritmo e notas de dublagem.
          </p>
        </div>

        {/* Export Credits Trigger Button */}
        {activeProject && (
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold rounded-xl shadow transition-all flex items-center justify-center gap-2 min-h-[44px]"
          >
            <Download className="w-4 h-4" /> Exportar Créditos ({activeProject.name})
          </button>
        )}
      </div>

      {/* Project Filter */}
      <div className="flex items-center gap-2 bg-zinc-900 p-3 rounded-2xl border border-zinc-800">
        <span className="text-xs font-semibold text-zinc-400 shrink-0">Filtrar Projeto:</span>
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="bg-zinc-950 border border-zinc-800 text-xs font-semibold text-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 min-h-[44px] w-full"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="py-12 text-center">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : sortedContributors.length === 0 ? (
        <div className="py-12 text-center bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
          <p className="text-sm font-semibold text-zinc-300">Nenhum contribuidor registrado ainda neste projeto.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Top 3 Podium Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {sortedContributors.slice(0, 3).map((contrib, idx) => {
              const medal = idx === 0 ? '🥇 1º Lugar' : idx === 1 ? '🥈 2º Lugar' : '🥉 3º Lugar';
              const cardBorder =
                idx === 0
                  ? 'border-amber-500/80 bg-amber-950/30'
                  : idx === 1
                  ? 'border-zinc-400/80 bg-zinc-800/40'
                  : 'border-amber-800/60 bg-amber-950/10';

              return (
                <div
                  key={contrib.userId}
                  className={`p-4 rounded-2xl border ${cardBorder} shadow-lg flex flex-col items-center text-center space-y-2 relative overflow-hidden`}
                >
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    {medal}
                  </span>
                  <img
                    src={contrib.userAvatar}
                    alt={contrib.userName}
                    className="w-14 h-14 rounded-full object-cover ring-2 ring-amber-500/50 shadow"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100 flex items-center justify-center gap-1">
                      {contrib.userName}
                    </h3>
                    <Badge role={contrib.userRole} size="sm" />
                  </div>
                  <div className="pt-2 border-t border-zinc-800/80 w-full text-xs text-zinc-300 space-y-0.5">
                    <p className="font-bold text-amber-400 text-sm">{contrib.approvedCount} falas aprovadas</p>
                    <p className="text-[11px] text-zinc-500">{contrib.totalProposals} propostas enviadas</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Full Contributors Table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-3.5 bg-zinc-950 border-b border-zinc-800 font-bold text-xs text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" /> Todos os Colaboradores ({sortedContributors.length})
            </div>

            <div className="divide-y divide-zinc-800/80">
              {sortedContributors.map((contrib, index) => {
                const approvalRate = contrib.totalProposals > 0
                  ? Math.round((contrib.approvedCount / contrib.totalProposals) * 100)
                  : 100;

                return (
                  <div
                    key={contrib.userId}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-zinc-800/50 transition-colors"
                  >
                    {/* Rank & User Info */}
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center font-bold text-xs text-amber-400">
                        #{index + 1}
                      </span>
                      <img
                        src={contrib.userAvatar}
                        alt={contrib.userName}
                        className="w-10 h-10 rounded-full object-cover ring-1 ring-zinc-700"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-zinc-100">{contrib.userName}</span>
                          <Badge role={contrib.userRole} size="sm" />
                        </div>
                        <span className="text-[11px] text-zinc-500 font-medium">
                          Taxa de aprovação: {approvalRate}%
                        </span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="text-right">
                      <div className="text-xs font-bold text-amber-400 flex items-center justify-end gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {contrib.approvedCount} Aprovadas
                      </div>
                      <span className="text-[10px] text-zinc-500">{contrib.totalProposals} enviadas</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Export Credits Modal */}
      {activeProject && (
        <CreditsExporterModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          project={activeProject}
          contributors={sortedContributors}
        />
      )}
    </div>
  );
};
