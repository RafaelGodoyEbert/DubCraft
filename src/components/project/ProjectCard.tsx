import React from 'react';
import { Project } from '../../types';
import { FileText, Users, MessageSquarePlus, Film, ArrowRight, CheckCircle2, Settings, Upload } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  onSelectProject: (project: Project) => void;
  onEditProject?: (project: Project) => void;
  onImportJson?: (project: Project) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onSelectProject,
  onEditProject,
  onImportJson,
}) => {
  const percent = project.totalLines > 0 ? Math.min(100, Math.round((project.reviewedLines / project.totalLines) * 100)) : 0;
  const isCompleted = project.status === 'completed' || (project.totalLines > 0 && project.reviewedLines >= project.totalLines);
  const isPaused = project.status === 'paused';

  return (
    <div
      onClick={() => onSelectProject(project)}
      className={`group bg-zinc-900 border rounded-2xl p-4 shadow-lg hover:shadow-2xl transition-all cursor-pointer flex flex-col justify-between overflow-hidden relative ${isCompleted
          ? 'border-emerald-500/40 hover:border-emerald-400'
          : isPaused
            ? 'border-zinc-800 opacity-80'
            : 'border-zinc-800 hover:border-amber-500/50'
        }`}
    >
      {/* Background Cover Image with Overlay */}
      <div className="relative h-36 -mx-4 -mt-4 mb-3 overflow-hidden rounded-t-2xl">
        <img
          src={project.coverImage}
          alt={project.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/60 to-transparent" />

        {/* Top Floating Action Buttons for Admins */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
          {onEditProject && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditProject(project);
              }}
              title="Trocar Imagem de Capa, Fonte e Configurações"
              className="p-2 bg-zinc-950/80 hover:bg-amber-500 hover:text-zinc-950 text-zinc-300 rounded-xl border border-zinc-700/80 backdrop-blur-md transition-all shadow"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
          {onImportJson && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onImportJson(project);
              }}
              title="Upar JSONs / Subpastas de Mapas"
              className="p-2 bg-zinc-950/80 hover:bg-amber-500 hover:text-zinc-950 text-zinc-300 rounded-xl border border-zinc-700/80 backdrop-blur-md transition-all shadow"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
          {isCompleted || percent === 100 ? (
            <span className="text-xs font-bold px-2.5 py-1 bg-emerald-500 text-zinc-950 rounded-full shadow flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Dublagem Pronta (100%)
            </span>
          ) : isPaused ? (
            <span className="text-xs font-bold px-2.5 py-1 bg-amber-600 text-zinc-950 rounded-full shadow">
              Pausado
            </span>
          ) : (
            <span className="text-xs font-bold px-2.5 py-1 bg-amber-500 text-zinc-950 rounded-full shadow">
              {percent}% Revisado
            </span>
          )}

          <span className="text-xs font-medium px-2 py-0.5 bg-black/70 text-zinc-300 rounded border border-zinc-700/60 backdrop-blur-sm flex items-center gap-1">
            <Film className="w-3 h-3" /> {project.cutscenesCount} Pastas
          </span>
        </div>
      </div>

      {/* Main Details */}
      <div className="space-y-2">
        <h3 className="text-base font-bold text-zinc-100 group-hover:text-amber-400 transition-colors leading-tight">
          {project.name}
        </h3>
        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
          {project.description}
        </p>

        {/* Progress Bar */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-xs font-medium text-zinc-400">
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              {project.reviewedLines} / {project.totalLines} falas
            </span>
            <span className={`font-bold ${isCompleted ? 'text-emerald-400' : 'text-amber-400'}`}>
              {percent}%
            </span>
          </div>
          <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isCompleted
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                  : 'bg-gradient-to-r from-amber-500 to-amber-400'
                }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer Metrics & Action Button */}
      <div className="flex items-center justify-between pt-4 mt-3 border-t border-zinc-800/80 text-xs text-zinc-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-zinc-300" title="Sugestões pendentes">
            <MessageSquarePlus className="w-3.5 h-3.5 text-amber-400" />
            <strong className="text-zinc-100">{project.pendingProposalsCount}</strong> pendentes
          </span>
          <span className="flex items-center gap-1 text-zinc-300" title="Contribuidores ativos">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <strong className="text-zinc-100">{project.contributorsCount}</strong> membros
          </span>
        </div>

        <span className="p-2 bg-zinc-800 group-hover:bg-amber-500 group-hover:text-zinc-950 text-zinc-300 rounded-xl transition-all min-h-[36px] min-w-[36px] flex items-center justify-center">
          <ArrowRight className="w-4 h-4" />
        </span>
      </div>
    </div>
  );
};
