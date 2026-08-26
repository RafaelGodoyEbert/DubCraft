import React, { useState, useEffect } from 'react';
import { Dialogue } from '../../types';
import { Drawer } from '../common/Drawer';
import { DiffViewer } from '../common/DiffViewer';
import { Send, AlertCircle, FileEdit, Languages, Mic, Volume2 } from 'lucide-react';

interface NewProposalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  dialogue: Dialogue;
  onSubmit: (data: {
    proposedTranslation?: string;
    proposedOriginalText?: string;
    proposedNotes?: string;
    reason?: string;
    proposedEmotion?: string;
    proposedVoiceType?: string;
    proposedPace?: string;
  }) => void;
}

export const NewProposalDrawer: React.FC<NewProposalDrawerProps> = ({
  isOpen,
  onClose,
  dialogue,
  onSubmit,
}) => {
  const [proposedOriginalText, setProposedOriginalText] = useState(dialogue.texto_original);
  const [proposedTranslation, setProposedTranslation] = useState(dialogue.traducao_ptbr);
  const [proposedNotes, setProposedNotes] = useState(dialogue.notas_dublagem || '');
  const [reason, setReason] = useState('');
  const [emotion, setEmotion] = useState(dialogue.emocao || 'neutro');
  const [voiceType, setVoiceType] = useState(dialogue.tipo_voz || 'masculino_adulto');
  const [pace, setPace] = useState(dialogue.ritmo || 'normal');
  const [error, setError] = useState('');

  // Reset fields when active dialogue changes
  useEffect(() => {
    setProposedOriginalText(dialogue.texto_original);
    setProposedTranslation(dialogue.traducao_ptbr);
    setProposedNotes(dialogue.notas_dublagem || '');
    setReason('');
    setEmotion(dialogue.emocao || 'neutro');
    setVoiceType(dialogue.tipo_voz || 'masculino_adulto');
    setPace(dialogue.ritmo || 'normal');
    setError('');
  }, [dialogue.id, isOpen]);

  const setAudioPreset = (presetReason: string, presetNote?: string) => {
    setReason(presetReason);
    if (presetNote) {
      setProposedNotes(presetNote);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hasOriginalChanged = proposedOriginalText.trim() !== dialogue.texto_original.trim();
    const hasTranslationChanged = proposedTranslation.trim() !== dialogue.traducao_ptbr.trim();
    const hasReason = Boolean(reason.trim());
    const hasOtherChanged =
      proposedNotes.trim() !== (dialogue.notas_dublagem || '').trim() ||
      emotion !== (dialogue.emocao || 'neutro') ||
      voiceType !== (dialogue.tipo_voz || 'masculino_adulto') ||
      pace !== (dialogue.ritmo || 'normal');

    if (!hasOriginalChanged && !hasTranslationChanged && !hasOtherChanged && !hasReason) {
      setError('Altere o texto, adicione uma justificativa de áudio ou ajuste as diretrizes de dublagem.');
      return;
    }

    if (hasOriginalChanged && !proposedOriginalText.trim()) {
      setError('O texto original corrigido não pode ficar vazio.');
      return;
    }

    if (hasTranslationChanged && !proposedTranslation.trim()) {
      setError('A tradução proposta não pode ficar vazia.');
      return;
    }

    setError('');
    onSubmit({
      proposedOriginalText: hasOriginalChanged ? proposedOriginalText.trim() : undefined,
      proposedTranslation: hasTranslationChanged ? proposedTranslation.trim() : dialogue.traducao_ptbr,
      proposedNotes: proposedNotes.trim() || undefined,
      reason: reason.trim() || 'Solicitação de revisão / melhoria de áudio',
      proposedEmotion: emotion,
      proposedVoiceType: voiceType,
      proposedPace: pace,
    });
    onClose();
  };

  const isOriginalModified = proposedOriginalText.trim() !== dialogue.texto_original.trim();
  const isTranslationModified = proposedTranslation.trim() !== dialogue.traducao_ptbr.trim();

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Sugerir Revisão de Texto / Áudio / Dublagem">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
        {/* Quick Audio Preset Buttons */}
        <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-2">
          <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 uppercase tracking-wide">
            <Mic className="w-3.5 h-3.5 text-amber-400" /> Atalhos Rápidos para Chamados de Áudio:
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setAudioPreset('Áudio com sotaque de Portugal (PT-PT). Necessário regravar em PT-BR.', 'Regravar com pronúncia e sotaque brasileiro')}
              className="px-2.5 py-1.5 bg-zinc-900 hover:bg-amber-950/40 hover:border-amber-700/60 border border-zinc-800 text-zinc-300 hover:text-amber-300 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1"
            >
              🇵🇹 Sotaque de Portugal (PT-PT)
            </button>
            <button
              type="button"
              onClick={() => setAudioPreset('Áudio com ruído ou corte brusco no final. Necessário regravar/limpar.', 'Limpeza de áudio e regravação')}
              className="px-2.5 py-1.5 bg-zinc-900 hover:bg-amber-950/40 hover:border-amber-700/60 border border-zinc-800 text-zinc-300 hover:text-amber-300 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1"
            >
              🔊 Ruído / Áudio Cortado
            </button>
            <button
              type="button"
              onClick={() => setAudioPreset('Entonação/Emoção não combina com a cena. Necessário interpretar com mais energia.', 'Ajuste de interpretação e energia')}
              className="px-2.5 py-1.5 bg-zinc-900 hover:bg-amber-950/40 hover:border-amber-700/60 border border-zinc-800 text-zinc-300 hover:text-amber-300 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1"
            >
              🎭 Entonação Inadequada
            </button>
          </div>
        </div>
        {/* Section 1: Original Text / Transcription */}
        <div className="space-y-1.5 p-3.5 bg-zinc-950/70 rounded-2xl border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wide">
              <FileEdit className="w-3.5 h-3.5" /> Texto Original (Transcrição da Fala)
            </label>
            {isOriginalModified && (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                Modificado
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-400 leading-tight">
            Edite este campo caso a transcrição do áudio original contenha erros ou palavras ouvidas incorretamente.
          </p>
          <textarea
            rows={2}
            value={proposedOriginalText}
            onChange={(e) => setProposedOriginalText(e.target.value)}
            placeholder="Texto original em inglês / idioma original..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors font-medium text-xs sm:text-sm leading-relaxed"
          />

          {/* Real-time Diff Preview for Original Text */}
          {isOriginalModified && (
            <div className="pt-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                Comparativo da Transcrição Original:
              </span>
              <DiffViewer originalText={dialogue.texto_original} proposedText={proposedOriginalText} />
            </div>
          )}
        </div>

        {/* Section 2: PT-BR Translation */}
        <div className="space-y-1.5 p-3.5 bg-zinc-950/70 rounded-2xl border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wide">
              <Languages className="w-3.5 h-3.5" /> Tradução & Adaptação (Português PT-BR)
            </label>
            {isTranslationModified && (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                Modificado
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-400 leading-tight">
            Ajuste o texto traduzido para otimizar o ritmo, sincronia labial e interpretação na dublagem.
          </p>
          <textarea
            rows={3}
            value={proposedTranslation}
            onChange={(e) => setProposedTranslation(e.target.value)}
            placeholder="Digite a tradução ajustada para o ritmo e sincronia de dublagem..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors font-medium text-xs sm:text-sm leading-relaxed"
          />

          {/* Real-time Diff Preview for Translation */}
          {isTranslationModified && (
            <div className="pt-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                Comparativo da Tradução:
              </span>
              <DiffViewer originalText={dialogue.traducao_ptbr} proposedText={proposedTranslation} />
            </div>
          )}
        </div>

        {/* Section 3: Voice Acting Directives */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">Emoção</label>
            <select
              value={emotion}
              onChange={(e) => setEmotion(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200 focus:outline-none focus:border-amber-500 min-h-[44px]"
            >
              <option value="neutro">Neutro</option>
              <option value="raiva">Raiva</option>
              <option value="susto">Susto</option>
              <option value="tristeza">Tristeza</option>
              <option value="alegria">Alegria</option>
              <option value="sussurrando">Sussurrando</option>
              <option value="gritando">Gritando</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">Tipo de Voz</label>
            <select
              value={voiceType}
              onChange={(e) => setVoiceType(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200 focus:outline-none focus:border-amber-500 min-h-[44px]"
            >
              <option value="masculino_adulto">Masculino Adulto</option>
              <option value="feminino_adulto">Feminino Adulto</option>
              <option value="anciao">Ancião</option>
              <option value="monstro">Monstro</option>
              <option value="crianca">Criança</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">Ritmo</label>
            <select
              value={pace}
              onChange={(e) => setPace(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200 focus:outline-none focus:border-amber-500 min-h-[44px]"
            >
              <option value="normal">Normal</option>
              <option value="lento">Lento</option>
              <option value="rapido">Rápido</option>
            </select>
          </div>
        </div>

        {/* Section 4: Justification & Acting Notes */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-zinc-300">
            Justificativa da Alteração
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: Correção de termo militar no original e melhor rima na dublagem..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors text-xs min-h-[44px]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-zinc-300">
            Notas de Dublagem (Direção do Ator)
          </label>
          <input
            type="text"
            value={proposedNotes}
            onChange={(e) => setProposedNotes(e.target.value)}
            placeholder="Ex: Ênfase na palavra 'agora', respiração pesada..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors text-xs min-h-[44px]"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs font-medium min-h-[44px]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl shadow-lg flex items-center gap-1.5 text-xs min-h-[44px]"
          >
            <Send className="w-4 h-4" /> Enviar Proposta
          </button>
        </div>
      </form>
    </Drawer>
  );
};
