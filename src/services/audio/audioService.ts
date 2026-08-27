export type AudioTrack = 'original' | 'dublado';

export interface AudioState {
  isPlaying: boolean;
  activeTrack: AudioTrack;
  currentTime: number;
  duration: number;
  playbackRate: number;
  isLoading: boolean;
  hasAudio: boolean;
  volume: number;
  isMuted: boolean;
}

export type AudioStateListener = (state: AudioState) => void;

export class AudioService {
  private audioElement: HTMLAudioElement | null = null;
  private currentOriginalUrl: string = '';
  private currentDubladoUrl: string = '';
  private activeTrack: AudioTrack = (typeof window !== 'undefined' ? (localStorage.getItem('dubcraft_preferred_track') as AudioTrack) : null) || 'dublado';
  private listeners: AudioStateListener[] = [];
  private currentTime: number = 0;
  private duration: number = 0;
  private isPlaying: boolean = false;
  private isLoading: boolean = false;
  private volume: number = 1.0;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedVolume = localStorage.getItem('dubcraft_audio_volume');
      if (savedVolume !== null) {
        this.volume = parseFloat(savedVolume);
      }

      this.audioElement = new Audio();
      this.audioElement.crossOrigin = 'anonymous';
      this.audioElement.volume = this.volume;

      this.audioElement.addEventListener('timeupdate', () => {
        if (this.audioElement) {
          this.currentTime = this.audioElement.currentTime;
          this.notify();
        }
      });

      this.audioElement.addEventListener('loadedmetadata', () => {
        if (this.audioElement) {
          this.duration = this.audioElement.duration || 0;
          this.isLoading = false;
          this.notify();
        }
      });

      this.audioElement.addEventListener('ended', () => {
        this.isPlaying = false;
        this.currentTime = 0;
        this.notify();
      });

      this.audioElement.addEventListener('play', () => {
        this.isPlaying = true;
        this.notify();
      });

      this.audioElement.addEventListener('pause', () => {
        this.isPlaying = false;
        this.notify();
      });

      this.audioElement.addEventListener('error', (e) => {
        console.warn('[AudioService] Erro ao carregar arquivo de áudio:', this.audioElement?.src, e);
        this.isLoading = false;
        this.isPlaying = false;
        this.notify();
      });
    }
  }

  public loadDialogueAudio(
    originalUrl?: string,
    dubladoUrl?: string,
    _originalText: string = '',
    _ptbrText: string = ''
  ) {
    this.stop();
    this.currentOriginalUrl = originalUrl || '';
    this.currentDubladoUrl = dubladoUrl || '';
    this.currentTime = 0;
    this.duration = 0;
    this.isLoading = false;

    // Mantém a faixa escolhida anteriormente pelo usuário (Original ou Dublado)
    // Se a preferida não existir nesta fala, tenta a alternativa disponível
    if (this.activeTrack === 'dublado' && !this.currentDubladoUrl && this.currentOriginalUrl) {
      // Tem apenas original
      this.activeTrack = 'original';
    } else if (this.activeTrack === 'original' && !this.currentOriginalUrl && this.currentDubladoUrl) {
      // Tem apenas dublado
      this.activeTrack = 'dublado';
    }

    this.applyTrackUrl();
  }

  private applyTrackUrl() {
    const url = this.activeTrack === 'original' ? this.currentOriginalUrl : this.currentDubladoUrl;

    if (url && url.trim() && this.audioElement) {
      this.isLoading = true;
      this.notify();
      this.audioElement.src = url;
      this.audioElement.load();
    } else if (this.audioElement) {
      this.audioElement.removeAttribute('src');
      this.audioElement.load();
      this.isLoading = false;
      this.isPlaying = false;
      this.notify();
    }
  }

  public setVolume(newVolume: number) {
    const clamped = Math.max(0, Math.min(1, newVolume));
    this.volume = clamped;
    if (this.audioElement) {
      this.audioElement.volume = clamped;
      this.audioElement.muted = false;
    }
    this.isMuted = false;
    if (typeof window !== 'undefined') {
      localStorage.setItem('dubcraft_audio_volume', String(clamped));
    }
    this.notify();
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.audioElement) {
      this.audioElement.muted = this.isMuted;
    }
    this.notify();
    return this.isMuted;
  }

  public toggleTrack(): AudioTrack {
    const previousTime = this.currentTime;
    const wasPlaying = this.isPlaying;

    this.activeTrack = this.activeTrack === 'original' ? 'dublado' : 'original';
    if (typeof window !== 'undefined') {
      localStorage.setItem('dubcraft_preferred_track', this.activeTrack);
    }

    this.applyTrackUrl();

    if (this.audioElement && this.audioElement.src) {
      this.audioElement.currentTime = previousTime;
      if (wasPlaying) {
        this.audioElement.play().catch((err) => {
          console.warn('[AudioService] Erro ao reproduzir faixa:', err);
        });
      }
    }

    this.notify();
    return this.activeTrack;
  }

  public setTrack(track: AudioTrack) {
    if (this.activeTrack === track) return;
    this.activeTrack = track;
    if (typeof window !== 'undefined') {
      localStorage.setItem('dubcraft_preferred_track', track);
    }
    this.applyTrackUrl();
    this.notify();
  }

  public playTrack(track: AudioTrack) {
    this.activeTrack = track;
    if (typeof window !== 'undefined') {
      localStorage.setItem('dubcraft_preferred_track', track);
    }
    this.applyTrackUrl();
    this.play();
  }

  public play() {
    const url = this.activeTrack === 'original' ? this.currentOriginalUrl : this.currentDubladoUrl;

    if (!url || !url.trim()) {
      console.warn(`[AudioService] Nenhum áudio disponível para a faixa "${this.activeTrack}".`);
      return;
    }

    if (this.audioElement) {
      if (!this.audioElement.src || !this.audioElement.src.includes(encodeURI(url))) {
        this.audioElement.src = url;
      }
      this.audioElement.play().catch((err) => {
        console.warn('[AudioService] Falha ao tocar áudio real:', err);
        this.isPlaying = false;
        this.notify();
      });
    }
  }

  public pause() {
    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.isPlaying = false;
    this.notify();
  }

  public togglePlayPause() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public seek(seconds: number) {
    this.currentTime = seconds;
    if (this.audioElement && this.audioElement.src) {
      this.audioElement.currentTime = seconds;
    }
    this.notify();
  }

  public stop() {
    this.pause();
    this.currentTime = 0;
    this.notify();
  }

  public subscribe(listener: AudioStateListener): () => void {
    this.listeners.push(listener);
    this.notify();
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    const currentUrl = this.activeTrack === 'original' ? this.currentOriginalUrl : this.currentDubladoUrl;
    const hasAudio = Boolean(currentUrl && currentUrl.trim());

    const state: AudioState = {
      isPlaying: this.isPlaying,
      activeTrack: this.activeTrack,
      currentTime: this.currentTime,
      duration: this.duration || 0,
      playbackRate: 1.0,
      isLoading: this.isLoading,
      hasAudio,
    };

    this.listeners.forEach((fn) => fn(state));
  }
}

export const audioServiceSingleton = new AudioService();
