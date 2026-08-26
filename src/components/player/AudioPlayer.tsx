import React, { useEffect, useState } from 'react';
import { Play, Pause, Volume2, Sparkles, RefreshCw } from 'lucide-react';
import { audioServiceSingleton, AudioState, AudioTrack } from '../../services/audio/audioService';

interface AudioPlayerProps {
  originalText: string;
  ptbrText: string;
  originalAudioUrl?: string;
  dubladoAudioUrl?: string;
  speedFactor?: number;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  originalText,
  ptbrText,
  originalAudioUrl,
  dubladoAudioUrl,
}) => {
  const [audioState, setAudioState] = useState<AudioState>({
    isPlaying: false,
    activeTrack: 'original',
    currentTime: 0,
    duration: 5,
    playbackRate: 1.0,
    isLoading: false,
    hasAudio: true,
  });

  useEffect(() => {
    const unsubscribe = audioServiceSingleton.subscribe((state) => {
      setAudioState(state);
    });

    audioServiceSingleton.loadDialogueAudio(
      originalAudioUrl,
      dubladoAudioUrl,
      originalText,
      ptbrText
    );

    return () => {
      unsubscribe();
    };
  }, [originalAudioUrl, dubladoAudioUrl, originalText, ptbrText]);

  // Handle Tab key toggle and Space key play/pause on desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        audioServiceSingleton.togglePlayPause();
      } else if (e.code === 'Tab') {
        e.preventDefault();
        audioServiceSingleton.toggleTrack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    audioServiceSingleton.seek(newTime);
  };

  const hasOriginalAudio = Boolean(originalAudioUrl && originalAudioUrl.trim());
  const hasDubladoAudio = Boolean(dubladoAudioUrl && dubladoAudioUrl.trim());

  const isOriginal = audioState.activeTrack === 'original';
  const isOriginalPlaying = audioState.isPlaying && isOriginal;
  const isDubladoPlaying = audioState.isPlaying && !isOriginal;

  const handlePlayOriginal = () => {
    if (!hasOriginalAudio) return;
    if (isOriginalPlaying) {
      audioServiceSingleton.pause();
    } else {
      audioServiceSingleton.playTrack('original');
    }
  };

  const handlePlayDublado = () => {
    if (!hasDubladoAudio) return;
    if (isDubladoPlaying) {
      audioServiceSingleton.pause();
    } else {
      audioServiceSingleton.playTrack('dublado');
    }
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800/90 rounded-2xl p-3.5 sm:p-4 shadow-xl space-y-3">
      {/* Play Controls: Play Original vs Play Dublado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          onClick={handlePlayOriginal}
          disabled={!hasOriginalAudio}
          className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[48px] flex items-center justify-center gap-2 border shadow-sm ${
            !hasOriginalAudio
              ? 'bg-zinc-900/40 text-zinc-600 border-zinc-800/50 cursor-not-allowed'
              : isOriginalPlaying
              ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md scale-[1.01]'
              : isOriginal
              ? 'bg-zinc-800 text-amber-400 border-zinc-700 hover:bg-zinc-700'
              : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:text-zinc-100 hover:bg-zinc-800/80'
          }`}
        >
          {isOriginalPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className={`w-4 h-4 fill-current ${!hasOriginalAudio ? 'text-zinc-600' : ''}`} />
          )}
          <span>
            {hasOriginalAudio
              ? isOriginalPlaying
                ? 'Pausar Original'
                : 'Play Original (EN)'
              : 'Sem Áudio Original (.wav)'}
          </span>
        </button>

        <button
          onClick={handlePlayDublado}
          disabled={!hasDubladoAudio}
          className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[48px] flex items-center justify-center gap-2 border shadow-sm ${
            !hasDubladoAudio
              ? 'bg-zinc-900/40 text-zinc-600 border-zinc-800/50 cursor-not-allowed'
              : isDubladoPlaying
              ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md scale-[1.01]'
              : !isOriginal
              ? 'bg-zinc-800 text-amber-400 border-zinc-700 hover:bg-zinc-700'
              : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:text-zinc-100 hover:bg-zinc-800/80'
          }`}
        >
          {isDubladoPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Sparkles className={`w-4 h-4 ${!hasDubladoAudio ? 'text-zinc-600' : 'text-amber-400'}`} />
          )}
          <span>
            {hasDubladoAudio
              ? isDubladoPlaying
                ? 'Pausar Dublado'
                : 'Play Dublado (PT-BR)'
              : 'Sem Áudio Dublado (.wav)'}
          </span>
        </button>
      </div>

      {!hasOriginalAudio && !hasDubladoAudio && (
        <p className="text-[11px] text-zinc-500 text-center italic py-1">
          ℹ️ Nenhum arquivo de áudio (.wav) associado a esta fala no momento.
        </p>
      )}

      {/* Progress Bar & Waveform visualizer */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 px-0.5">
          <span>{formatTime(audioState.currentTime)}</span>
          <span className="text-zinc-500 text-[10px] hidden sm:inline">
            A/B Sync at 00:{Math.floor(audioState.currentTime).toString().padStart(2, '0')}
          </span>
          <span>{formatTime(audioState.duration)}</span>
        </div>

        <input
          type="range"
          min="0"
          max={audioState.duration || 5}
          step="0.05"
          value={audioState.currentTime}
          onChange={handleSeekChange}
          className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
        />
      </div>

      {/* Primary Touch Controls Bar */}
      <div className="flex items-center justify-between pt-1">
        <div className="text-[11px] text-zinc-400 font-medium flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          {audioState.isLoading ? (
            <span className="flex items-center gap-1 text-amber-400">
              <RefreshCw className="w-3 h-3 animate-spin" /> Carregando...
            </span>
          ) : isOriginal ? (
            'Áudio Original de Referência'
          ) : (
            'Áudio Dublado Atual'
          )}
        </div>

        {/* Big Play/Pause Button - Thumb friendly (>= 44x44px) */}
        <button
          onClick={() => audioServiceSingleton.togglePlayPause()}
          className="w-12 h-12 rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all min-h-[48px] min-w-[48px]"
          aria-label={audioState.isPlaying ? 'Pausar' : 'Tocar'}
        >
          {audioState.isPlaying ? (
            <Pause className="w-6 h-6 fill-current" />
          ) : (
            <Play className="w-6 h-6 fill-current ml-0.5" />
          )}
        </button>
      </div>

      {/* Keyboard Shortcuts Helper bar (Desktop only) */}
      <div className="hidden sm:flex items-center justify-center gap-4 pt-1 text-[10px] text-zinc-500 border-t border-zinc-800/60 font-mono">
        <span><kbd className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700">Espaço</kbd> Play/Pause</span>
        <span><kbd className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700">Tab</kbd> Alternar A/B</span>
        <span><kbd className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700">← →</kbd> Navegar Falas</span>
      </div>
    </div>
  );
};
