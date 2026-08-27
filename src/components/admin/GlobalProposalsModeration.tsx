import React, { useState, useEffect, useMemo } from 'react';
import { Project, Proposal, User, Dialogue } from '../../types';
import { Badge } from '../common/Badge';
import { DiffViewer } from '../common/DiffViewer';
import { repositoryAdapterSingleton } from '../../repositories/storageAdapter';
import { proposalUseCaseSingleton } from '../../usecases/proposalUseCase';
import { cloudSyncServiceSingleton } from '../../services/cloudSyncService';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Search,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Sparkles,
  Ban,
  RefreshCw,
  FolderGit2,
  Headphones,
} from 'lucide-react';

interface GlobalProposalsModerationProps {
  currentUser: User | null;
  projects: Project[];
  onNavigateToDialogue?: (projectId: string, dialogueId: string) => void;
  onRefresh?: () => void;
}

export const GlobalProposalsModeration: React.FC<GlobalProposalsModerationProps> = ({
  currentUser,
  projects,
  onNavigateToDialogue,
  onRefresh,
}) => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [dialogueMap, setDialogueMap] = useState<Record<string, Dialogue>>({});
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const canModerate = Boolean(
    currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator' || currentUser.isTrusted)
  );

  const loadAllProposals = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch from local storage
      const localProps = await repositoryAdapterSingleton.getProposalsByProject('');
      
      // 2. Fetch from cloud sync if enabled
      let cloudProps: Proposal[] = [];
      try {
        const remote = await cloudSyncServiceSingleton.fetchProposals('');
        if (remote && Array.isArray(remote)) {
          cloudProps = remote;
        }
      } catch {}

      // Combine unique proposals
      const map = new Map<string, Proposal>();
      localProps.forEach((p) => map.set(p.id, p));
      cloudProps.forEach((p) => map.set(p.id, p));
      const combined = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setProposals(combined);

      // 3. Load dialogues for referenced dialogues to display original texts and line numbers
      const dMap: Record<string, Dialogue> = {};
      for (const proj of projects) {
        try {
          const dlgs = await repositoryAdapterSingleton.getDialoguesByProject(proj.id);
          dlgs.forEach((d) => {
            dMap[d.id] = d;
          });
        } catch {}
      }
      setDialogueMap(dMap);
    } catch (err) {
      console.error('Erro ao carregar propostas globais:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllProposals();
  }, [projects.length]);

  const handleApprove = async (proposal: Proposal) => {
    if (!currentUser || !canModerate) {
      alert('Ação permitida apenas para administradores ou revisores confiáveis.');
      return;
    }

    try {
      setActionInProgress(proposal.id);
      await proposalUseCaseSingleton.approveProposal(proposal, currentUser);
      
      // Update local state
      setProposals((prev) =>
        prev.map((p) =>
          p.id === proposal.id
            ? { ...p, status: 'approved', resolvedAt: new Date().toISOString(), resolvedBy: currentUser.name }
            : p
        )
      );

      onRefresh?.();
    } catch (err: any) {
      alert(err.message || 'Erro ao aprovar proposta.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReject = async (proposal: Proposal) => {
    if (!currentUser || !canModerate) {
      alert('Ação permitida apenas para administradores ou revisores confiáveis.');
      return;
    }

    try {
      setActionInProgress(proposal.id);
      await proposalUseCaseSingleton.rejectProposal(proposal, currentUser);

      // Update local state
      setProposals((prev) =>
        prev.map((p) =>
          p.id === proposal.id
            ? { ...p, status: 'rejected', resolvedAt: new Date().toISOString(), resolvedBy: currentUser.name }
            : p
        )
      );

      onRefresh?.();
    } catch (err: any) {
      alert(err.message || 'Erro ao rejeitar proposta.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleVote = async (proposalId: string, value: 1 | -1) => {
    if (!currentUser) {
      alert('Você precisa estar conectado para votar.');
      return;
    }
    try {
      const { proposal } = await proposalUseCaseSingleton.voteProposal(proposalId, currentUser, value);
      setProposals((prev) => prev.map((p) => (p.id === proposal.id ? proposal : p)));
    } catch (err: any) {
      alert(err.message || 'Erro ao votar.');
    }
  };

  // Filtered proposals list
  const filteredProposals = useMemo(() => {
    return proposals.filter((prop) => {
      // Status filter
      if (statusFilter !== 'all' && prop.status !== statusFilter) {
        return false;
      }

      // Project filter
      if (selectedProjectFilter !== 'all' && prop.projectId !== selectedProjectFilter) {
        return false;
      }

      // Search term filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const dlg = dialogueMap[prop.dialogueId];
        const matchAuthor = prop.authorName.toLowerCase().includes(term);
        const matchReason = prop.reason.toLowerCase().includes(term);
        const matchNotes = prop.proposedNotes?.toLowerCase().includes(term);
        const matchTranslation = prop.proposedTranslation?.toLowerCase().includes(term);
        const matchOriginal = prop.proposedOriginalText?.toLowerCase().includes(term);
        const matchDlgText = dlg?.texto_original.toLowerCase().includes(term) || dlg?.traducao_ptbr.toLowerCase().includes(term);

        if (!matchAuthor && !matchReason && !matchNotes && !matchTranslation && !matchOriginal && !matchDlgText) {
          return false;
        }
      }

      return true;
    });
  }, [proposals, dialogueMap, statusFilter, selectedProjectFilter, searchTerm]);

  const pendingCount = useMemo(() => {
    return proposals.filter((p) => p.status === 'pending').length;
  }, [proposals]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              Central de Moderação de Propostas
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold rounded-full animate-pulse">
                  {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
                </span>
              )}
            </h3>
            <p className="text-xs text-zinc-400">
              Analise, aprove ou rejeite sugestões da comunidade de todos os projetos em uma única tela.
            </p>
          </div>
        </div>

        <button
          onClick={loadAllProposals}
          disabled={isLoading}
          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-700 transition-all flex items-center gap-1.5 self-start sm:self-auto min-h-[36px]"
          title="Recarregar propostas"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Filters & Search Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Project Selector */}
        <div className="relative">
          <select
            value={selectedProjectFilter}
            onChange={(e) => setSelectedProjectFilter(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 min-h-[40px]"
          >
            <option value="all">🎮 Todos os Projetos ({projects.length})</option>
            {projects.map((proj) => (
              <option key={proj.id} value={proj.id}>
                {proj.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 gap-1">
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
              statusFilter === 'pending'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            ⏳ Pendentes ({proposals.filter((p) => p.status === 'pending').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('approved')}
            className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
              statusFilter === 'approved'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            ✓ Aprovadas
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
              statusFilter === 'all'
                ? 'bg-zinc-800 text-zinc-200'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Todas ({proposals.length})
          </button>
        </div>

        {/* Search Box */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por autor, texto ou motivo..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 pl-9 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500 min-h-[40px]"
          />
        </div>
      </div>

      {/* Proposals List */}
      {isLoading ? (
        <div className="py-12 text-center space-y-2">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-zinc-400">Carregando fila de propostas...</p>
        </div>
      ) : filteredProposals.length === 0 ? (
        <div className="py-12 text-center bg-zinc-950/60 rounded-2xl border border-zinc-800/80 p-6 space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto opacity-70" />
          <p className="text-sm font-bold text-zinc-200">Nenhuma proposta encontrada</p>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            {statusFilter === 'pending'
              ? 'Tudo em dia! Não há propostas pendentes para os filtros selecionados.'
              : 'Nenhum resultado corresponde aos filtros ou à busca digitada.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredProposals.map((prop) => {
            const dialogue = dialogueMap[prop.dialogueId];
            const project = projects.find((p) => p.id === prop.projectId);
            const isApproved = prop.status === 'approved';
            const isRejected = prop.status === 'rejected';
            const isIgnoreSuggestion = prop.proposedStatus === 'ignorar';
            const isAuthor = currentUser ? prop.authorId === currentUser.id : false;
            const isProcessing = actionInProgress === prop.id;

            return (
              <div
                key={prop.id}
                className={`p-4 bg-zinc-950 rounded-2xl border transition-all space-y-3 ${
                  isApproved
                    ? 'border-emerald-500/50 bg-emerald-950/10'
                    : isRejected
                    ? 'border-rose-900/40 opacity-70'
                    : isIgnoreSuggestion
                    ? 'border-rose-800/60 hover:border-rose-700 bg-rose-950/10'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {/* Proposal Top Bar: Target Dialogue & Status */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold rounded-lg uppercase tracking-wider flex items-center gap-1">
                      <FolderGit2 className="w-3 h-3" /> {project?.name || prop.projectId}
                    </span>
                    <span className="text-xs font-bold text-zinc-200">
                      {dialogue ? `Fala #${dialogue.lineIndex + 1}` : 'Fala'}
                      {dialogue?.subfolder && (
                        <span className="text-zinc-400 font-normal ml-1">
                          ({dialogue.subfolder})
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    {isApproved ? (
                      <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Aprovada por {prop.resolvedBy || 'Revisor'}
                      </span>
                    ) : isRejected ? (
                      <span className="px-2 py-0.5 bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-bold rounded-full flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Rejeitada
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 bg-amber-950/80 text-amber-300 border border-amber-800/80 text-[10px] font-bold rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Pendente • Score: +{prop.score}
                      </span>
                    )}

                    {onNavigateToDialogue && (
                      <button
                        type="button"
                        onClick={() => onNavigateToDialogue(prop.projectId, prop.dialogueId)}
                        className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-[11px] font-medium rounded-lg transition-all flex items-center gap-1"
                        title="Abrir esta fala na tela de revisão com o áudio"
                      >
                        <Headphones className="w-3 h-3 text-amber-400" /> Ir para a Fala
                      </button>
                    )}
                  </div>
                </div>

                {/* Author Info */}
                <div className="flex items-center gap-2.5 text-xs text-zinc-400">
                  <img
                    src={prop.authorAvatar}
                    alt={prop.authorName}
                    className="w-6 h-6 rounded-full object-cover ring-1 ring-zinc-700"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-zinc-200">{prop.authorName}</span>
                    <Badge role={prop.authorRole} size="sm" />
                    <span className="text-zinc-500">•</span>
                    <span className="text-[11px] text-zinc-500">
                      {new Date(prop.createdAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>

                {/* Ignore line suggestion alert */}
                {isIgnoreSuggestion && (
                  <div className="p-2.5 bg-rose-950/40 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                    <Ban className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>
                      Esta proposta sugere <strong>Ignorar / Descartar</strong> esta fala (ruído, gemido ou fala fora do jogo).
                    </span>
                  </div>
                )}

                {/* Diff Viewer for Original Text */}
                {prop.proposedOriginalText && dialogue && prop.proposedOriginalText !== dialogue.texto_original && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                      Ajuste na Transcrição Original (Inglês):
                    </span>
                    <DiffViewer originalText={dialogue.texto_original} proposedText={prop.proposedOriginalText} />
                  </div>
                )}

                {/* Diff Viewer for PT-BR Translation */}
                {prop.proposedTranslation && dialogue && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                      Comparativo da Tradução PT-BR:
                    </span>
                    <DiffViewer originalText={dialogue.traducao_ptbr} proposedText={prop.proposedTranslation} />
                  </div>
                )}

                {/* Reason & Directives */}
                {(prop.reason || prop.proposedNotes) && (
                  <div className="p-2.5 bg-zinc-900/90 rounded-xl border border-zinc-800/80 text-xs text-zinc-300 space-y-1">
                    {prop.reason && (
                      <p>
                        <strong className="text-amber-400">Motivo / Justificativa:</strong> {prop.reason}
                      </p>
                    )}
                    {prop.proposedNotes && (
                      <p className="text-zinc-400 italic">
                        <strong>Notas de Atuação:</strong> "{prop.proposedNotes}"
                      </p>
                    )}
                  </div>
                )}

                {/* Action Footer for Pending Proposals */}
                {prop.status === 'pending' && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/80">
                    {/* Voting Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleVote(prop.id, 1)}
                        disabled={isAuthor && currentUser?.role !== 'admin'}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all min-h-[36px] ${
                          isAuthor && currentUser?.role !== 'admin'
                            ? 'bg-zinc-900/50 text-zinc-500 border-zinc-800 cursor-not-allowed'
                            : 'bg-zinc-900 hover:bg-emerald-950 text-emerald-400 border-zinc-800 hover:border-emerald-700'
                        }`}
                        title="Votar a favor"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>👍 {prop.upvotesCount}</span>
                      </button>

                      <button
                        onClick={() => handleVote(prop.id, -1)}
                        disabled={isAuthor && currentUser?.role !== 'admin'}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all min-h-[36px] ${
                          isAuthor && currentUser?.role !== 'admin'
                            ? 'bg-zinc-900/50 text-zinc-500 border-zinc-800 cursor-not-allowed'
                            : 'bg-zinc-900 hover:bg-rose-950 text-rose-400 border-zinc-800 hover:border-rose-700'
                        }`}
                        title="Votar contra"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                        <span>👎 {prop.downvotesCount}</span>
                      </button>
                    </div>

                    {/* Direct Moderation Buttons */}
                    {canModerate && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(prop)}
                          disabled={isProcessing}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold rounded-xl text-xs shadow flex items-center gap-1.5 transition-all min-h-[36px] disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {isProcessing ? 'Aprovando...' : 'Aprovar Proposta'}
                        </button>
                        <button
                          onClick={() => handleReject(prop)}
                          disabled={isProcessing}
                          className="px-3 py-1.5 bg-zinc-900 hover:bg-rose-950 text-rose-300 hover:text-rose-200 font-semibold rounded-xl text-xs border border-zinc-800 hover:border-rose-800 flex items-center gap-1.5 transition-all min-h-[36px] disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                          {isProcessing ? 'Rejeitando...' : 'Rejeitar'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
