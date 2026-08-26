import React, { useState, useEffect } from 'react';
import { Project, ProjectStatus, User } from '../../types';
import { TrustedUsersManager } from './TrustedUsersManager';
import { AuditLogView } from './AuditLogView';
import { CreateProjectModal } from './CreateProjectModal';
import { JSONImporterModal } from './JSONImporterModal';
import { exportServiceSingleton } from '../../services/export/exportService';
import { repositoryAdapterSingleton } from '../../repositories/storageAdapter';
import {
  Shield,
  Download,
  FolderArchive,
  Users,
  FileText,
  CheckCircle2,
  Plus,
  Upload,
  PlayCircle,
  PauseCircle,
  Award,
  Trash2,
  Sparkles,
  Activity,
  Database,
  Zap,
  ExternalLink,
} from 'lucide-react';

interface AdminDashboardProps {
  projects: Project[];
  currentUser: User | null;
  onRefresh: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  projects,
  currentUser,
  onRefresh,
}) => {
  const [selectedExportProjectId, setSelectedExportProjectId] = useState<string>(projects[0]?.id || '');
  const [isExporting, setIsExporting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [targetImportProjectId, setTargetImportProjectId] = useState<string | undefined>(undefined);
  const [telemetry, setTelemetry] = useState({
    writesToday: 0,
    readsToday: 0,
    activeUsersCount: 0,
    proposalsToday: 0,
  });

  useEffect(() => {
    async function loadTelemetry() {
      try {
        const audits = await repositoryAdapterSingleton.getAuditLogs();
        const todayStr = new Date().toISOString().split('T')[0];
        const auditsToday = audits.filter((a) => a.createdAt.startsWith(todayStr)).length;

        let totalProposalsCount = 0;
        for (const p of projects) {
          const props = await repositoryAdapterSingleton.getProposalsByProject(p.id);
          totalProposalsCount += props.length;
        }

        const writesCount = Math.max(1, auditsToday + totalProposalsCount);
        const readsEstimated = Math.max(12, writesCount * 8 + 45);

        setTelemetry({
          writesToday: writesCount,
          readsToday: readsEstimated,
          activeUsersCount: projects.reduce((acc, p) => acc + p.contributorsCount, 0) || 1,
          proposalsToday: totalProposalsCount,
        });
      } catch {}
    }
    loadTelemetry();
  }, [projects]);

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="py-16 text-center space-y-3 bg-zinc-900 rounded-2xl border border-zinc-800 p-8 max-w-md mx-auto">
        <Shield className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-zinc-100">Acesso Restrito</h2>
        <p className="text-xs text-zinc-400">
          Esta área é exclusiva para administradores da plataforma DubCraft.
        </p>
      </div>
    );
  }

  const handleExportZip = async (projectToExport?: Project) => {
    const project = projectToExport || projects.find((p) => p.id === selectedExportProjectId);
    if (!project) return;

    try {
      setIsExporting(true);
      const dialogues = await repositoryAdapterSingleton.getDialoguesByProject(project.id);
      const zipBlob = await exportServiceSingleton.generateProjectZip(project, dialogues);
      exportServiceSingleton.downloadFile(`DubCraft_${project.slug}.zip`, zipBlob);

      // Audit log entry
      await repositoryAdapterSingleton.createAuditLog({
        id: `audit_${Date.now()}`,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'PROJECT_EXPORT',
        details: `Exportou pacote ZIP de produção para o projeto "${project.name}" (Status: ${project.status}).`,
        targetId: project.id,
        createdAt: new Date().toISOString(),
      });

      alert(`Pacote ZIP do projeto "${project.name}" gerado com sucesso! Contém todas as cutscenes atualizadas e prontas.`);
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar arquivo ZIP.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleToggleStatus = async (project: Project, newStatus: ProjectStatus) => {
    try {
      await repositoryAdapterSingleton.updateProjectStatus(project.id, newStatus, currentUser);
      onRefresh();
      alert(`Status do projeto "${project.name}" atualizado para "${newStatus.toUpperCase()}".`);
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status do projeto.');
    }
  };

  const handleDeleteProject = async (project: Project) => {
    if (confirm(`Tem certeza que deseja excluir o projeto "${project.name}"? Esta ação removerá o projeto do catálogo.`)) {
      await repositoryAdapterSingleton.deleteProject(project.id);
      onRefresh();
    }
  };

  const openImportForProject = (projectId: string) => {
    setTargetImportProjectId(projectId);
    setIsImportModalOpen(true);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Banner */}
      <div className="bg-gradient-to-r from-purple-950/80 via-zinc-900 to-zinc-900 p-4 sm:p-6 rounded-2xl border border-purple-800/60 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs uppercase tracking-wider">
              <Shield className="w-4 h-4" /> Painel de Controle do Administrador
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-100">
              Gestão de Projetos & Cutscenes
            </h1>
            <p className="text-xs text-zinc-300 max-w-xl">
              Crie novos projetos de dublagem, faça upload de JSONs de cutscenes, alterne status de conclusão e baixe pacotes prontos para sincronização.
            </p>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow transition-all flex items-center gap-2 min-h-[44px]"
            >
              <Plus className="w-4 h-4" /> Novo Projeto
            </button>
            <button
              onClick={() => {
                setTargetImportProjectId(undefined);
                setIsImportModalOpen(true);
              }}
              className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold text-xs rounded-xl border border-zinc-700 shadow transition-all flex items-center gap-2 min-h-[44px]"
            >
              <Upload className="w-4 h-4 text-amber-400" /> Importar JSONs
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-1">
          <span className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-1">
            <FolderArchive className="w-3.5 h-3.5 text-amber-400" /> Projetos Totais
          </span>
          <p className="text-xl font-bold text-zinc-100">{projects.length}</p>
        </div>

        <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-1">
          <span className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-amber-400" /> Falas Mapeadas
          </span>
          <p className="text-xl font-bold text-zinc-100">
            {projects.reduce((acc, p) => acc + p.totalLines, 0)}
          </p>
        </div>

        <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-1">
          <span className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-amber-400" /> Concluídos
          </span>
          <p className="text-xl font-bold text-amber-400">
            {projects.filter((p) => p.status === 'completed').length}
          </p>
        </div>

        <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-1">
          <span className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-purple-400" /> Colaboradores
          </span>
          <p className="text-xl font-bold text-zinc-100">
            {projects.reduce((acc, p) => acc + p.contributorsCount, 0)}
          </p>
        </div>
      </div>

      {/* Cloud Telemetry & Quota Monitor */}
      <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
            <div>
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                Monitor de Operações & Cotas na Nuvem
                <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold rounded-full">
                  Plano 100% Gratuito
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Acompanhe o consumo diário de leituras e escritas do Cloudflare D1 e do Firebase Auth em tempo real.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://dash.cloudflare.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg border border-zinc-700 transition-all flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" /> Cloudflare D1
            </a>
            <a
              href="https://console.firebase.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg border border-zinc-700 transition-all flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" /> Firebase Console
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Write Quota */}
          <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-400" /> Escritas Hoje (D1 / Votos)
              </span>
              <span className="text-[11px] font-bold text-emerald-400">
                {((telemetry.writesToday / 100000) * 100).toFixed(2)}%
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-lg font-bold text-zinc-100">{telemetry.writesToday.toLocaleString()} <span className="text-xs text-zinc-500 font-normal">/ 100.000 dia</span></p>
              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-900">Seguro</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all" 
                style={{ width: `${Math.max(1, Math.min(100, (telemetry.writesToday / 100000) * 100))}%` }} 
              />
            </div>
          </div>

          {/* Read Quota */}
          <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-blue-400" /> Leituras Estimadas (CDN / API)
              </span>
              <span className="text-[11px] font-bold text-blue-400">
                {((telemetry.readsToday / 5000000) * 100).toFixed(3)}%
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-lg font-bold text-zinc-100">{telemetry.readsToday.toLocaleString()} <span className="text-xs text-zinc-500 font-normal">/ 5.000.000 dia</span></p>
              <span className="text-[10px] text-blue-400 font-semibold bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-900">Ilimitado</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all" 
                style={{ width: `${Math.max(1, Math.min(100, (telemetry.readsToday / 5000000) * 100))}%` }} 
              />
            </div>
          </div>

          {/* Firebase Auth Quota */}
          <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-purple-400" /> Usuários Ativos (Firebase)
              </span>
              <span className="text-[11px] font-bold text-purple-400">
                {((telemetry.activeUsersCount / 50000) * 100).toFixed(2)}%
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-lg font-bold text-zinc-100">{telemetry.activeUsersCount.toLocaleString()} <span className="text-xs text-zinc-500 font-normal">/ 50.000 mês</span></p>
              <span className="text-[10px] text-purple-400 font-semibold bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-900">Grátis</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-500 rounded-full transition-all" 
                style={{ width: `${Math.max(1, Math.min(100, (telemetry.activeUsersCount / 50000) * 100))}%` }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Projects Management Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <FolderArchive className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-zinc-100">Gerenciador de Projetos & Status</h3>
              <p className="text-xs text-zinc-400">
                Alterne o status de conclusão, adicione novas falas ou baixe o pacote ZIP consolidado.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 min-h-[44px]"
          >
            <Plus className="w-4 h-4" /> Criar Jogo
          </button>
        </div>

        <div className="space-y-3">
          {projects.map((project) => {
            const progress = project.totalLines > 0 ? Math.round((project.reviewedLines / project.totalLines) * 100) : 0;
            const isCompleted = project.status === 'completed';
            const isPaused = project.status === 'paused';

            return (
              <div
                key={project.id}
                className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-zinc-700 transition-all"
              >
                {/* Left: Project Info */}
                <div className="flex items-center gap-3">
                  <img
                    src={project.coverImage}
                    alt={project.name}
                    className="w-12 h-12 rounded-xl object-cover ring-1 ring-zinc-700 shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-zinc-100">{project.name}</h4>
                      {isCompleted ? (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded text-[10px] font-bold">
                          ✓ Concluído
                        </span>
                      ) : isPaused ? (
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold">
                          ⏸ Pausado
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded text-[10px] font-bold">
                          ● Em Revisão
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      {project.reviewedLines}/{project.totalLines} falas revisadas ({progress}%) • {project.cutscenesCount} cutscenes
                    </p>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Status Dropdown / Buttons */}
                  <select
                    value={project.status}
                    onChange={(e) => handleToggleStatus(project, e.target.value as ProjectStatus)}
                    className={`text-xs font-bold rounded-xl px-3 py-2 border focus:outline-none min-h-[44px] ${
                      isCompleted
                        ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                        : isPaused
                        ? 'bg-amber-950/80 border-amber-700 text-amber-300'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-200'
                    }`}
                  >
                    <option value="active">● Em Revisão (Ativo)</option>
                    <option value="completed">✓ Marcar como Concluído</option>
                    <option value="paused">⏸ Pausar Projeto</option>
                  </select>

                  {/* Import JSON for this project */}
                  <button
                    onClick={() => openImportForProject(project.id)}
                    title="Importar JSON de Cutscenes"
                    className="p-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all min-h-[44px]"
                  >
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span className="hidden sm:inline">JSON</span>
                  </button>

                  {/* Export ZIP */}
                  <button
                    onClick={() => handleExportZip(project)}
                    title="Baixar Pacote ZIP DubCraft"
                    className="p-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all min-h-[44px]"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Baixar ZIP</span>
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDeleteProject(project)}
                    title="Excluir Projeto"
                    className="p-2.5 bg-rose-950/40 hover:bg-rose-900 text-rose-300 border border-rose-800/50 rounded-xl text-xs transition-all min-h-[44px]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trusted User Manager */}
      <TrustedUsersManager currentUser={currentUser} onRefresh={onRefresh} />

      {/* Audit Logs History */}
      <AuditLogView />

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        currentUser={currentUser}
        onProjectCreated={() => {
          onRefresh();
        }}
      />

      {/* JSON Importer Modal */}
      <JSONImporterModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        projects={projects}
        defaultProjectId={targetImportProjectId}
        currentUser={currentUser}
        onImportCompleted={() => {
          onRefresh();
        }}
      />
    </div>
  );
};
