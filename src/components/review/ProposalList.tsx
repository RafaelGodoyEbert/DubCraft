import React, { useState, useEffect } from 'react';
import { Proposal, User, Dialogue } from '../../types';
import { Badge } from '../common/Badge';
import { DiffViewer } from '../common/DiffViewer';
import { ThumbsUp, ThumbsDown, CheckCircle2, XCircle, Sparkles, MessageSquare, PauseCircle } from 'lucide-react';
import { cloudSyncServiceSingleton, CircuitBreakerStatus } from '../../services/cloudSyncService';

interface ProposalListProps {
  proposals: Proposal[];
  dialogue: Dialogue;
  currentUser: User | null;
  onVote: (proposalId: string, value: 1 | -1) => void;
  onApprove: (proposal: Proposal) => void;
  onReject: (proposal: Proposal) => void;
  onOpenNewProposal: () => void;
}

export const ProposalList: React.FC<ProposalListProps> = ({
  proposals,
  dialogue,
  currentUser,
  onVote,
  onApprove,
  onReject,
  onOpenNewProposal,
}) => {
  const [breakerStatus, setBreakerStatus] = useState<CircuitBreakerStatus>(
    cloudSyncServiceSingleton.getCircuitBreakerStatus()
  );

  useEffect(() => {
    return cloudSyncServiceSingleton.onCircuitBreakerChange((status) => {
      setBreakerStatus(status);
    });
  }, []);

  const canModerate = Boolean(
    currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator' || currentUser.isTrusted)
  );

  return (
    <div className="space-y-3">
      {/* Circuit Breaker Warning Banner */}
      {breakerStatus.isPaused && (
        <div className="p-3.5 bg-amber-950/60 border border-amber-800/80 rounded-2xl flex items-center gap-2.5 text-amber-200 text-xs">
          <PauseCircle className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <p className="font-bold">Votações em Pausa de Segurança</p>
            <p className="text-[11px] text-amber-300/80">
              O limite de gravações gratuitas do dia foi atingido. Reabertura automática às {breakerStatus.resetsAt || '00:00 UTC'}!
            </p>
          </div>
        </div>
      )}

      {/* List Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-amber-400" />
          Propostas da Comunidade ({proposals.length})
        </h4>
        <button
          onClick={onOpenNewProposal}
          disabled={breakerStatus.isPaused}
          className={`px-3 py-2 text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1.5 min-h-[44px] ${
            breakerStatus.isPaused
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
              : 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
          }`}
          title={breakerStatus.isPaused ? 'Envio pausado até 00:00 UTC' : 'Criar nova proposta'}
        >
          <Sparkles className="w-3.5 h-3.5" /> Criar Proposta
        </button>
      </div>

      {proposals.length === 0 ? (
        <div className="p-5 text-center bg-zinc-900/60 rounded-2xl border border-zinc-800 space-y-2">
          <p className="text-xs text-zinc-400 font-medium">Nenhuma sugestão pendente para esta fala.</p>
          <p className="text-[11px] text-zinc-500">
            A tradução atual parece excelente! Caso ache que pode melhorar a ritmo ou termos, envie uma proposta.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {proposals.map((prop) => {
            const isAuthor = currentUser ? prop.authorId === currentUser.id : false;
            const isApproved = prop.status === 'approved';
            const isRejected = prop.status === 'rejected';

            return (
              <div
                key={prop.id}
                className={`p-3.5 sm:p-4 bg-zinc-900 border rounded-2xl space-y-3 transition-all ${
                  isApproved
                    ? 'border-emerald-500/60 bg-emerald-950/20'
                    : isRejected
                    ? 'border-rose-800/40 opacity-75'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {/* Author Info & Status */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <img
                      src={prop.authorAvatar}
                      alt={prop.authorName}
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-zinc-700"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-zinc-200">{prop.authorName}</span>
                        <Badge role={prop.authorRole} size="sm" />
                      </div>
                      <span className="text-[10px] text-zinc-500">
                        {new Date(prop.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div>
                    {isApproved && (
                      <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Aprovada
                      </span>
                    )}
                    {isRejected && (
                      <span className="px-2 py-0.5 bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-bold rounded-full flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Rejeitada
                      </span>
                    )}
                    {!isApproved && !isRejected && (
                      <span className="px-2 py-0.5 bg-amber-950/80 text-amber-300 border border-amber-800/80 text-[10px] font-bold rounded-full">
                        Score: +{prop.score}
                      </span>
                    )}
                  </div>
                </div>

                {/* Proposed Original Text Diff if present */}
                {prop.proposedOriginalText && prop.proposedOriginalText !== dialogue.texto_original && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                      Ajuste na Transcrição Original:
                    </span>
                    <DiffViewer originalText={dialogue.texto_original} proposedText={prop.proposedOriginalText} />
                  </div>
                )}

                {/* Proposed Translation Diff if present */}
                {prop.proposedTranslation && (
                  <div className="space-y-1">
                    {prop.proposedOriginalText && (
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                        Proposta de Tradução PT-BR:
                      </span>
                    )}
                    <DiffViewer originalText={dialogue.traducao_ptbr} proposedText={prop.proposedTranslation} />
                  </div>
                )}

                {/* Reason & Notes */}
                {(prop.reason || prop.proposedNotes) && (
                  <div className="p-2.5 bg-zinc-950/80 rounded-xl border border-zinc-800/60 text-xs text-zinc-300 space-y-1">
                    {prop.reason && (
                      <p>
                        <strong className="text-amber-400">Motivo:</strong> {prop.reason}
                      </p>
                    )}
                    {prop.proposedNotes && (
                      <p className="text-zinc-400 italic">
                        <strong>Notas:</strong> "{prop.proposedNotes}"
                      </p>
                    )}
                  </div>
                )}

                {/* Vote & Admin Actions Footer */}
                {prop.status === 'pending' && (
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                    {/* Voting Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onVote(prop.id, 1)}
                        disabled={breakerStatus.isPaused || (isAuthor && currentUser?.role !== 'admin')}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all min-h-[44px] min-w-[44px] ${
                          breakerStatus.isPaused || (isAuthor && currentUser?.role !== 'admin')
                            ? 'bg-zinc-800/50 text-zinc-500 border-zinc-800 cursor-not-allowed'
                            : 'bg-zinc-950 hover:bg-emerald-950 text-emerald-400 border-zinc-800 hover:border-emerald-700'
                        }`}
                        title={
                          breakerStatus.isPaused
                            ? 'Votações pausadas até 00:00 UTC'
                            : isAuthor
                            ? 'Você não pode votar na sua própria proposta'
                            : 'Aprovar esta proposta'
                        }
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>👍 {prop.upvotesCount}</span>
                      </button>

                      <button
                        onClick={() => onVote(prop.id, -1)}
                        disabled={breakerStatus.isPaused || (isAuthor && currentUser?.role !== 'admin')}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all min-h-[44px] min-w-[44px] ${
                          breakerStatus.isPaused || (isAuthor && currentUser?.role !== 'admin')
                            ? 'bg-zinc-800/50 text-zinc-500 border-zinc-800 cursor-not-allowed'
                            : 'bg-zinc-950 hover:bg-rose-950 text-rose-400 border-zinc-800 hover:border-rose-700'
                        }`}
                        title={
                          breakerStatus.isPaused
                            ? 'Votações pausadas até 00:00 UTC'
                            : isAuthor
                            ? 'Você não pode votar na sua própria proposta'
                            : 'Rejeitar esta proposta'
                        }
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                        <span>👎 {prop.downvotesCount}</span>
                      </button>
                    </div>

                    {/* Admin Direct Moderation Controls */}
                    {canModerate && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onApprove(prop)}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold rounded-xl text-xs shadow min-h-[44px] flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
                        </button>
                        <button
                          onClick={() => onReject(prop)}
                          className="px-2.5 py-2 bg-zinc-800 hover:bg-rose-950 text-rose-300 hover:text-rose-200 font-medium rounded-xl text-xs border border-zinc-700 hover:border-rose-800 min-h-[44px] flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Rejeitar
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
