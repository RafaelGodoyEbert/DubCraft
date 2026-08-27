import React, { useState } from 'react';
import { Project, ProjectStatus } from '../../types';
import { ProjectCard } from './ProjectCard';
import { Search, Sparkles, Filter, CheckCircle2, PlayCircle, Plus, Upload, Shield } from 'lucide-react';

interface ProjectListProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onOpenCreateProject?: () => void;
  onOpenImportJson?: (project?: Project) => void;
  onEditProject?: (project: Project) => void;
  onNavigateToAdmin?: () => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  onSelectProject,
  onOpenCreateProject,
  onOpenImportJson,
  onEditProject,
  onNavigateToAdmin,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all');

  const filtered = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());

    const isCompleted = p.status === 'completed' || (p.totalLines > 0 && p.reviewedLines >= p.totalLines);
    if (statusFilter === 'completed') return matchesSearch && isCompleted;
    if (statusFilter === 'active') return matchesSearch && !isCompleted && p.status !== 'paused';
    if (statusFilter === 'paused') return matchesSearch && p.status === 'paused';
    return matchesSearch;
  });

  const completedCount = projects.filter((p) => p.status === 'completed' || (p.totalLines > 0 && p.reviewedLines >= p.totalLines)).length;
  const activeCount = projects.filter((p) => p.status === 'active' && !(p.totalLines > 0 && p.reviewedLines >= p.totalLines)).length;

  return (
    <div className="space-y-4 pb-20">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-amber-950/40 p-4 sm:p-6 rounded-2xl border border-zinc-800 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs tracking-wide uppercase">
              <Sparkles className="w-4 h-4" /> DubCraft Studio • Localização & Dublagem Profissional
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight mt-1">
              Catálogo de Jogos & Projetos de Dublagem
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed mt-1">
              Selecione um projeto para auditar falas, comparar áudio Original x Dublado e gerenciar sincronias de cutscenes e mapas.
            </p>
          </div>

          {/* Quick Admin Actions Bar */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onOpenCreateProject && (
              <button
                onClick={onOpenCreateProject}
                className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 min-h-[44px]"
              >
                <Plus className="w-4 h-4" /> Novo Projeto
              </button>
            )}
            {onOpenImportJson && (
              <button
                onClick={() => onOpenImportJson()}
                className="px-3.5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold text-xs rounded-xl border border-zinc-700 shadow transition-all flex items-center gap-1.5 min-h-[44px]"
              >
                <Upload className="w-4 h-4 text-amber-400" /> Importar JSONs / Mapas
              </button>
            )}
            {onNavigateToAdmin && (
              <button
                onClick={onNavigateToAdmin}
                className="px-3.5 py-2.5 bg-purple-950/60 hover:bg-purple-900/60 text-purple-200 font-bold text-xs rounded-xl border border-purple-700/60 transition-all flex items-center gap-1.5 min-h-[44px]"
              >
                <Shield className="w-4 h-4 text-purple-400" /> Painel Admin
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar jogo (ex: Prince of Persia, Black, God of War)..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors min-h-[44px]"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 shrink-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all min-h-[38px] ${
              statusFilter === 'all'
                ? 'bg-zinc-800 text-amber-400 shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Todos ({projects.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 min-h-[38px] ${
              statusFilter === 'active'
                ? 'bg-zinc-800 text-blue-400 shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <PlayCircle className="w-3.5 h-3.5" /> Em Revisão ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 min-h-[38px] ${
              statusFilter === 'completed'
                ? 'bg-zinc-800 text-emerald-400 shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Concluídos ({completedCount})
          </button>
        </div>
      </div>

      {/* Grid of Projects */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-zinc-900/50 rounded-2xl border border-zinc-800 p-6 space-y-2">
          <p className="text-sm font-medium text-zinc-300">Nenhum projeto encontrado para o filtro selecionado.</p>
          <p className="text-xs text-zinc-500">Tente ajustar a busca ou alternar para "Todos".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onSelectProject={onSelectProject}
              onEditProject={onEditProject}
              onImportJson={onOpenImportJson}
            />
          ))}
        </div>
      )}
    </div>
  );
};
