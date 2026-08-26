import React from 'react';
import { Dialogue } from '../../types';
import { Volume2, Sparkles, MessageSquare, Mic, FastForward } from 'lucide-react';

interface DialogueCardProps {
  dialogue: Dialogue;
  currentIndex: number;
  totalLines: number;
}

export const DialogueCard: React.FC<DialogueCardProps> = ({ dialogue, currentIndex, totalLines }) => {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
      {/* Dialogue Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
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

        <span
          className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
            dialogue.isReviewed
              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
              : 'bg-amber-950 text-amber-300 border-amber-800'
          }`}
        >
          {dialogue.isReviewed ? '✓ Revisada' : '⏳ Em Revisão'}
        </span>
      </div>

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
