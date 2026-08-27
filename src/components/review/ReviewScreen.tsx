import React, { useState, useEffect, useMemo } from 'react';
import { Project, Dialogue, Proposal, User } from '../../types';
import { DialogueCard } from './DialogueCard';
import { AudioPlayer } from '../player/AudioPlayer';
import { ProposalList } from './ProposalList';
import { NewProposalDrawer } from './NewProposalDrawer';
import { repositoryAdapterSingleton } from '../../repositories/storageAdapter';
import { proposalUseCaseSingleton } from '../../usecases/proposalUseCase';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  MessageSquarePlus,
  Film,
  RotateCcw,
  Search,
  X,
  Filter,
  ListOrdered,
} from 'lucide-react';

interface ReviewScreenProps {
  currentProject: Project;
  onSelectProject: (p: Project) => void;
  currentUser: User | null;
  initialDialogueId?: string;
}

export const ReviewScreen: React.FC<ReviewScreenProps> = ({
  currentProject,
  currentUser,
  initialDialogueId,
}) => {
  const [dialogues, setDialogues] = useState<Dialogue[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedCutscene, setSelectedCutscene] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'dublado' | 'sem_audio' | 'revisado' | 'pendente' | 'ignorar'>('all');
  const [isJumpListOpen, setIsJumpListOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load dialogues for current project
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const data = await repositoryAdapterSingleton.getDialoguesByProject(currentProject.id);
      setDialogues(data);
      setCurrentIndex(0);
      setIsLoading(false);
    }
    loadData();
  }, [currentProject.id]);

  // Jump to specific dialogue if initialDialogueId is passed
  useEffect(() => {
    if (initialDialogueId && dialogues.length > 0) {
      const idx = dialogues.findIndex((d) => d.id === initialDialogueId);
      if (idx !== -1) {
        setSelectedCutscene('all');
        setStatusFilter('all');
        setSearchTerm('');
        setCurrentIndex(idx);
      }
    }
  }, [initialDialogueId, dialogues]);

  // Compute unique cutscenes list
  const cutscenesList = useMemo(() => {
    const list = new Set<string>();
    dialogues.forEach((d) => {
      if (d.cutsceneName) list.add(d.cutsceneName);
      else if (d.subfolder) list.add(d.subfolder);
    });
    return Array.from(list).sort();
  }, [dialogues]);

  // Filter dialogues by cutscene, status, and search query
  const filteredDialogues = useMemo(() => {
    return dialogues.filter((d) => {
      // 1. Cutscene filter
      if (selectedCutscene !== 'all') {
        if (d.cutsceneName !== selectedCutscene && d.subfolder !== selectedCutscene) {
          return false;
        }
      }

      // 2. Status filter
      if (statusFilter === 'dublado' && !d.audioDubladoUrl) return false;
      if (statusFilter === 'sem_audio' && d.audioDubladoUrl) return false;
      if (statusFilter === 'revisado' && (!d.isReviewed || d.status === 'ignorar')) return false;
      if (statusFilter === 'pendente' && (d.isReviewed || d.status === 'ignorar')) return false;
      if (statusFilter === 'ignorar' && d.status !== 'ignorar') return false;

      // 3. Search query (search across original text, translation, notes, ID)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchOrig = (d.texto_original || '').toLowerCase().includes(term);
        const matchPtbr = (d.traducao_ptbr || '').toLowerCase().includes(term);
        const matchNotes = (d.notas_dublagem || '').toLowerCase().includes(term);
        const matchId = (d.id || '').toLowerCase().includes(term);
        const matchCutscene = (d.cutsceneName || '').toLowerCase().includes(term);
        if (!matchOrig && !matchPtbr && !matchNotes && !matchId && !matchCutscene) {
          return false;
        }
      }

      return true;
    });
  }, [dialogues, selectedCutscene, statusFilter, searchTerm]);

  // Reset index if out of bounds after filter change
  useEffect(() => {
    if (currentIndex >= filteredDialogues.length) {
      setCurrentIndex(0);
    }
  }, [filteredDialogues.length, currentIndex]);

  const activeDialogue = filteredDialogues[currentIndex] || filteredDialogues[0];

  // Load proposals for active dialogue line
  useEffect(() => {
    async function fetchProposals() {
      if (activeDialogue) {
        const props = await repositoryAdapterSingleton.getProposalsByDialogue(activeDialogue.id);
        setProposals(props);
      } else {
        setProposals([]);
      }
    }
    fetchProposals();
  }, [activeDialogue?.id]);

  // Keyboard navigation shortcuts for desktop (1, 3, Left, Right)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        isDrawerOpen ||
        isJumpListOpen
      ) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === '1') {
        e.preventDefault();
        if (proposals.length > 0 && currentUser?.role === 'admin') {
          handleApproveProposal(proposals[0]);
        }
      } else if (e.key === '3') {
        e.preventDefault();
        setIsDrawerOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredDialogues.length, currentIndex, proposals, isDrawerOpen, isJumpListOpen, currentUser?.role]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : Math.max(0, filteredDialogues.length - 1)));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < filteredDialogues.length - 1 ? prev + 1 : 0));
  };

  const handleVoteProposal = async (proposalId: string, value: 1 | -1) => {
    if (!currentUser) {
      alert('Você precisa estar conectado para votar nas propostas.');
      return;
    }
    try {
      await proposalUseCaseSingleton.voteProposal(proposalId, currentUser, value);
      if (activeDialogue) {
        const updatedProps = await repositoryAdapterSingleton.getProposalsByDialogue(activeDialogue.id);
        setProposals(updatedProps);
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar voto.');
    }
  };

  const handleApproveProposal = async (proposal: Proposal) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'moderator' && !currentUser.isTrusted)) {
      alert('Ação restrita a administradores ou revisores confiáveis.');
      return;
    }
    try {
      const updated = await proposalUseCaseSingleton.approveProposal(proposal, currentUser);
      setDialogues((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      if (activeDialogue) {
        const updatedProps = await repositoryAdapterSingleton.getProposalsByDialogue(activeDialogue.id);
        setProposals(updatedProps);
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao aprovar proposta.');
    }
  };

  const handleRejectProposal = async (proposal: Proposal) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'moderator' && !currentUser.isTrusted)) {
      alert('Ação restrita a administradores ou revisores confiáveis.');
      return;
    }
    try {
      await proposalUseCaseSingleton.rejectProposal(proposal, currentUser);
      if (activeDialogue) {
        const updatedProps = await repositoryAdapterSingleton.getProposalsByDialogue(activeDialogue.id);
        setProposals(updatedProps);
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao rejeitar proposta.');
    }
  };

  const handleCreateProposal = async (data: {
    proposedTranslation?: string;
    proposedOriginalText?: string;
    proposedNotes?: string;
    reason?: string;
    proposedEmotion?: string;
    proposedVoiceType?: string;
    proposedPace?: string;
    proposedStatus?: 'ignorar' | 'dublado' | 'gameplay';
  }) => {
    if (!activeDialogue) return;
    if (!currentUser) {
      alert('Você precisa estar conectado para enviar propostas.');
      return;
    }
    try {
      await proposalUseCaseSingleton.submitProposal(activeDialogue, currentUser, data);
      const updatedProps = await repositoryAdapterSingleton.getProposalsByDialogue(activeDialogue.id);
      setProposals(updatedProps);
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar proposta.');
    }
  };

  const handleToggleApproveDialogue = async (isApproved: boolean) => {
    if (!activeDialogue) return;
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'moderator' && !currentUser.isTrusted)) {
      alert('Apenas administradores ou revisores confiáveis podem validar diretamente a fala.');
      return;
    }

    try {
      const updated: Dialogue = {
        ...activeDialogue,
        isReviewed: isApproved,
        status: isApproved ? 'dublado' : (activeDialogue.status === 'ignorar' ? 'dublado' : activeDialogue.status || 'gameplay'),
      };
      await repositoryAdapterSingleton.saveDialogue(updated);
      setDialogues((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar status da fala.');
    }
  };

  const handleToggleIgnoreDialogue = async (isIgnored: boolean) => {
    if (!activeDialogue) return;
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'moderator' && !currentUser.isTrusted)) {
      alert('Apenas administradores ou revisores confiáveis podem alterar o status da fala.');
      return;
    }

    try {
      const updated: Dialogue = {
        ...activeDialogue,
        status: isIgnored ? 'ignorar' : 'dublado',
        isReviewed: false,
      };
      await repositoryAdapterSingleton.saveDialogue(updated);
      setDialogues((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar status da fala.');
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-zinc-400">Carregando falas do projeto...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Top Search & Filter Bar (Similar to editor_emocoes.py) */}
      <div className="bg-zinc-900 p-3.5 sm:p-4 rounded-2xl border border-zinc-800 shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
              {currentProject.name}
            </span>
            <h1 className="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2">
              Central de Revisão de Fala
            </h1>
          </div>

          {/* Quick Line List Toggle Button */}
          <button
            onClick={() => setIsJumpListOpen(!isJumpListOpen)}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5 min-h-[40px] ${
              isJumpListOpen
                ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold shadow'
                : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
            }`}
          >
            <ListOrdered className="w-4 h-4" />
            <span>Lista de Falas ({filteredDialogues.length})</span>
          </button>
        </div>

        {/* Search & Selectors Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 pt-1">
          {/* Live Text Search */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentIndex(0);
              }}
              placeholder="Pesquisar frase em inglês, tradução PT-BR ou arquivo..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-8 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 min-h-[40px]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Cutscene / Category Dropdown */}
          <div className="md:col-span-4">
            <select
              value={selectedCutscene}
              onChange={(e) => {
                setSelectedCutscene(e.target.value);
                setCurrentIndex(0);
              }}
              className="w-full bg-zinc-950 border border-zinc-800 text-xs font-semibold text-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 min-h-[40px]"
            >
              <option value="all">Todas as Fases / Categorias ({dialogues.length} falas)</option>
              {cutscenesList.map((cs) => {
                const count = dialogues.filter((d) => (d.cutsceneName || d.subfolder) === cs).length;
                return (
                  <option key={cs} value={cs}>
                    {cs} ({count} falas)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentIndex(0);
              }}
              className="w-full bg-zinc-950 border border-zinc-800 text-xs font-semibold text-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 min-h-[40px]"
            >
              <option value="all">Status: Todos</option>
              <option value="pendente">⏳ Em Revisão (Pendentes)</option>
              <option value="revisado">✓ Aprovadas / Concluídas</option>
              <option value="ignorar">⛔ Ignoradas (Gemidos / Excluídas)</option>
              <option value="dublado">Com Áudio Dublado</option>
              <option value="sem_audio">Sem Áudio Dublado</option>
            </select>
          </div>
        </div>

        {/* Quick Jump List Grid (Like QListWidget in editor_emocoes.py) */}
        {isJumpListOpen && (
          <div className="mt-2 p-3 bg-zinc-950 rounded-xl border border-zinc-800 max-h-56 overflow-y-auto space-y-1 animate-fade-in">
            {filteredDialogues.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-4">Nenhuma fala encontrada com os filtros atuais.</p>
            ) : (
              filteredDialogues.map((d, idx) => {
                const isSelected = idx === currentIndex;
                const isIgnored = d.status === 'ignorar';
                return (
                  <button
                    key={d.id}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setIsJumpListOpen(false);
                    }}
                    className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                        : 'text-zinc-300 hover:bg-zinc-900 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono text-[11px] text-zinc-500 shrink-0">#{d.lineIndex + 1}</span>
                      <span className={`truncate ${isIgnored ? 'line-through text-zinc-500 italic' : ''}`}>
                        {isIgnored ? '⛔ ' : ''}{d.traducao_ptbr || d.texto_original || '(Sem texto)'}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-500 shrink-0 uppercase tracking-wider">
                      {d.cutsceneName || d.subfolder}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Touch-Friendly Navigation Stepper */}
      <div className="flex items-center justify-between gap-2 bg-zinc-950 p-2 rounded-2xl border border-zinc-800">
        <button
          onClick={handlePrevious}
          disabled={filteredDialogues.length <= 1}
          className="flex-1 py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-bold text-xs rounded-xl border border-zinc-800 transition-all flex items-center justify-center gap-1.5 min-h-[48px] disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4" /> Fala Anterior
        </button>

        <span className="px-3 text-xs font-bold text-amber-400 font-mono text-center shrink-0">
          {filteredDialogues.length > 0 ? `${currentIndex + 1} / ${filteredDialogues.length}` : '0 / 0'}
        </span>

        <button
          onClick={handleNext}
          disabled={filteredDialogues.length <= 1}
          className="flex-1 py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1.5 min-h-[48px] disabled:opacity-50"
        >
          Próxima Fala <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Main Dialogue Card */}
      {activeDialogue && (
        <DialogueCard
          dialogue={activeDialogue}
          currentIndex={currentIndex}
          totalLines={filteredDialogues.length}
          currentUser={currentUser}
          onToggleApprove={handleToggleApproveDialogue}
          onToggleIgnore={handleToggleIgnoreDialogue}
        />
      )}

      {/* A/B Audio Player Docked */}
      {activeDialogue && (
        <AudioPlayer
          originalText={activeDialogue.texto_original}
          ptbrText={activeDialogue.traducao_ptbr}
          originalAudioUrl={activeDialogue.audioOriginalUrl}
          dubladoAudioUrl={activeDialogue.audioDubladoUrl}
          speedFactor={activeDialogue.speed_factor}
        />
      )}

      {/* Community Proposals Section */}
      {activeDialogue && (
        <ProposalList
          proposals={proposals}
          dialogue={activeDialogue}
          currentUser={currentUser}
          onVote={handleVoteProposal}
          onApprove={handleApproveProposal}
          onReject={handleRejectProposal}
          onOpenNewProposal={() => setIsDrawerOpen(true)}
        />
      )}

      {/* Drawer Form for submitting a new proposal */}
      {activeDialogue && (
        <NewProposalDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          dialogue={activeDialogue}
          onSubmit={handleCreateProposal}
        />
      )}
    </div>
  );
};
