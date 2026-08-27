import React from 'react';
import { Dialogue, User } from '../../types';
import { Volume2, Sparkles, MessageSquare, Mic, FastForward, CheckCircle2, RotateCcw, Ban } from 'lucide-react';

interface DialogueCardProps {
  dialogue: Dialogue;
  currentIndex: number;
  totalLines: number;
  currentUser?: User | null;
  onToggleApprove?: (isApproved: boolean) => void;
  onToggleIgnore?: (isIgnored: boolean) => void;
}

export const DialogueCard: React.FC<DialogueCardProps> = ({
  dialogue,
  currentIndex,
  totalLines,
  currentUser,
  onToggleApprove,
  onToggleIgnore,
}) => {
  const canModerate = Boolean(
    currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator' || currentUser.isTrusted)
  );

  const isIgnored = dialogue.status === 'ignorar';

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
      {/* Dialogue Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 flex-wrap gap-2">
        <div>
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
            {dialogue.subfolder ? dialogue.subfolder.toUpperCase() : dialogue.cutsceneName || 'Cutscene'}
          </span>
          <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            Fala #{dialogue.lineIndex + 1}{' '}
            <span className="text-xs font-normal text-zinc-400">
              ({currentIndex + 1} de {totalLines})
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canModerate && (
            isIgnored ? (
              <button
                type="button"
                onClick={() => onToggleIgnore?.(false)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-700 flex items-center gap-1.5 transition-all min-h-[36px]"
                title="Restaurar fala e colocá-la de volta na fila de revisão"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" /> Restaurar Fala
              </button>
            ) : dialogue.isReviewed ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onToggleApprove?.(false)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl border border-zinc-700 flex items-center gap-1.5 transition-all min-h-[36px]"
                  title="Voltar status para Em Revisão"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" /> Reabrir Revisão
                </button>
                <button
                  type="button"
                  onClick={() => onToggleIgnore?.(true)}
                  className="px-2.5 py-1.5 bg-zinc-800/80 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-300 text-xs font-semibold rounded-xl border border-zinc-700/80 hover:border-rose-700 flex items-center gap-1.5 transition-all min-h-[36px]"
                  title="Marcar como ignorado (gemido, ruído ou fala descartada)"
                >
                  <Ban className="w-3.5 h-3.5 text-rose-400" /> Ignorar
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onToggleApprove?.(true)}
                  className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl shadow flex items-center gap-1.5 transition-all min-h-[36px]"
                  title="Aprovar tradução, áudio e atuação desta fala"
                >
                  <CheckCircle2 className="w-4 h-4" /> Aprovar Fala (Está Pronta)
                </button>
                <button
                  type="button"
                  onClick={() => onToggleIgnore?.(true)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-rose-950/50 text-zinc-300 hover:text-rose-300 text-xs font-semibold rounded-xl border border-zinc-700 hover:border-rose-600 flex items-center gap-1.5 transition-all min-h-[36px]"
                  title="Marcar como ignorado (gemido, ruído ou fala descartada que não vai pro jogo)"
                >
                  <Ban className="w-3.5 h-3.5 text-rose-400" /> Ignorar (Gemido)
                </button>
              </div>
            )
          )}

          <span
            className={`px-2.5 py-1 text-xs font-semibold rounded-full border flex items-center gap-1.5 ${
              isIgnored
                ? 'bg-rose-950/40 text-rose-300 border-rose-800/80'
                : dialogue.isReviewed
                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                : 'bg-amber-950 text-amber-300 border-amber-800'
            }`}
          >
            {isIgnored ? (
              <>
                <Ban className="w-3 h-3 text-rose-400" /> ⛔ Ignorado (Fora do Jogo)
              </>
            ) : dialogue.isReviewed ? (
              '✓ Aprovada / Concluída'
            ) : (
              '⏳ Em Revisão'
            )}
          </span>
        </div>
      </div>

      {/* Warning banner when line is ignored */}
      {isIgnored && (
        <div className="p-2.5 bg-rose-950/20 border border-rose-900/40 rounded-xl text-xs text-rose-300 flex items-center gap-2">
          <Ban className="w-4 h-4 text-rose-400 shrink-0" />
          <span>
            Esta fala está marcada como <strong>Ignorada</strong> (ruído, gemido ou não dublada). Ela não irá para os arquivos finais do jogo.
          </span>
        </div>
      )}

      {/* Text Blocks: Original vs PT-BR */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Original Text */}
        <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800/80 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400">
            <Volume2 className="w-3.5 h-3.5 text-amber-400" /> Original (Inglês)
          </div>
          <p className="text-sm font-medium text-zinc-100 leading-relaxed font-sans">
            "{dialogue.texto_original}"
          </p>
        </div>

        {/* Current PT-BR Translation */}
        <div className="p-3.5 bg-amber-950/20 rounded-xl border border-amber-500/30 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-amber-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Tradução Atual PT-BR
            </span>
          </div>
          <p className="text-sm font-semibold text-zinc-100 leading-relaxed font-sans">
            "{dialogue.traducao_ptbr}"
          </p>
        </div>
      </div>

      {/* Metadata Badges: Emotion, Voice Type, Rhythm */}
      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
        <span className="px-2.5 py-1 bg-zinc-950 text-zinc-300 border border-zinc-800 rounded-lg flex items-center gap-1">
          <Mic className="w-3 h-3 text-amber-400" />
          Voz: <strong className="text-zinc-100">{dialogue.tipo_voz}</strong>
        </span>

        <span className="px-2.5 py-1 bg-zinc-950 text-zinc-300 border border-zinc-800 rounded-lg flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          Emoção: <strong className="text-zinc-100">{dialogue.emocao}</strong>
        </span>

        <span className="px-2.5 py-1 bg-zinc-950 text-zinc-300 border border-zinc-800 rounded-lg flex items-center gap-1">
          <FastForward className="w-3 h-3 text-amber-400" />
          Ritmo: <strong className="text-zinc-100">{dialogue.ritmo}</strong> (x{dialogue.speed_factor})
        </span>
      </div>

      {/* Dubbing Notes if any */}
      {dialogue.notas_dublagem && (
        <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800/80 text-xs text-zinc-300 space-y-1">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <MessageSquare className="w-3 h-3" /> Notas de Dublagem & Direção
          </span>
          <p className="italic text-zinc-300 font-sans">{dialogue.notas_dublagem}</p>
        </div>
      )}
    </div>
  );
};
