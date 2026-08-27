import { Proposal, Vote } from '../types';

interface CloudVotePayload {
  proposalId: string;
  projectId?: string;
  userId: string;
  value: 1 | -1;
  weight: number;
  updatedAt: string;
}

export interface CircuitBreakerStatus {
  isPaused: boolean;
  message: string;
  resetsAt?: string;
}

export class CloudSyncService {
  private apiUrl: string | null = null;
  private apiKey: string | null = null;
  private isEnabled: boolean = false;
  private circuitBreaker: CircuitBreakerStatus = {
    isPaused: false,
    message: '',
    resetsAt: '00:00 UTC',
  };
  private listeners: Array<(status: CircuitBreakerStatus) => void> = [];

  constructor() {
    const rawUrl = import.meta.env.VITE_CLOUD_API_URL || import.meta.env.VITE_SUPABASE_URL || null;
    this.apiUrl = rawUrl ? rawUrl.trim().replace(/\/+$/, '') : null;
    this.apiKey = import.meta.env.VITE_CLOUD_API_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || null;
    this.isEnabled = Boolean(this.apiUrl);
  }

  /**
   * Checks if cloud sync backend is active
   */
  public isCloudConnected(): boolean {
    return this.isEnabled;
  }

  /**
   * Checks current Circuit Breaker (Disjuntor) Status
   */
  public getCircuitBreakerStatus(): CircuitBreakerStatus {
    return this.circuitBreaker;
  }

  /**
   * Subscribes to circuit breaker state changes
   */
  public onCircuitBreakerChange(callback: (status: CircuitBreakerStatus) => void): () => void {
    this.listeners.push(callback);
    callback(this.circuitBreaker);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notifyBreaker() {
    this.listeners.forEach((cb) => cb(this.circuitBreaker));
  }

  public setCircuitBreaker(isPaused: boolean, message: string = '', resetsAt: string = '00:00 UTC') {
    this.circuitBreaker = { isPaused, message, resetsAt };
    this.notifyBreaker();
  }

  /**
   * Casts or syncs a vote to the cloud backend with Circuit Breaker detection
   */
  public async submitVote(vote: Vote, projectId?: string): Promise<boolean> {
    if (!this.isEnabled || !this.apiUrl || this.circuitBreaker.isPaused) {
      return false;
    }

    try {
      const payload: CloudVotePayload = {
        proposalId: vote.proposalId,
        projectId: projectId,
        userId: vote.userId,
        value: vote.value,
        weight: vote.weight,
        updatedAt: vote.updatedAt || new Date().toISOString(),
      };

      const response = await fetch(`${this.apiUrl}/votes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { 'apikey': this.apiKey, 'Authorization': `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 429) {
        const data = await response.json().catch(() => ({}));
        if (data.isQuotaPaused || data.error === 'CIRCUIT_BREAKER_ACTIVE') {
          this.setCircuitBreaker(
            true,
            data.message || 'Cota diária de gravações atingida. Reabertura automática às 00:00 UTC.',
            data.resetsAt || '00:00 UTC'
          );
        }
        return false;
      }

      return response.ok;
    } catch (err) {
      console.warn('[CloudSync] Falha na sincronização do voto com a nuvem, mantendo cópia local:', err);
      return false;
    }
  }

  /**
   * Syncs a new community proposal to the cloud backend with Circuit Breaker detection
   */
  public async submitProposal(proposal: Proposal): Promise<boolean> {
    if (!this.isEnabled || !this.apiUrl || this.circuitBreaker.isPaused) {
      return false;
    }

    try {
      const response = await fetch(`${this.apiUrl}/proposals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { 'apikey': this.apiKey, 'Authorization': `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify(proposal),
      });

      if (response.status === 429) {
        const data = await response.json().catch(() => ({}));
        if (data.isQuotaPaused || data.error === 'CIRCUIT_BREAKER_ACTIVE') {
          this.setCircuitBreaker(
            true,
            data.message || 'Cota diária de gravações atingida. Reabertura automática às 00:00 UTC.',
            data.resetsAt || '00:00 UTC'
          );
        }
        return false;
      }

      return response.ok;
    } catch (err) {
      console.warn('[CloudSync] Falha ao enviar proposta para a nuvem:', err);
      return false;
    }
  }

  /**
   * Fetches community proposals for a specific project (Multi-project support)
   */
  public async fetchProposals(projectId: string): Promise<Proposal[] | null> {
    if (!this.isEnabled || !this.apiUrl) {
      return null;
    }

    try {
      const response = await fetch(`${this.apiUrl}/proposals?projectId=${encodeURIComponent(projectId)}`, {
        headers: {
          ...(this.apiKey ? { 'apikey': this.apiKey, 'Authorization': `Bearer ${this.apiKey}` } : {}),
        },
      });

      if (!response.ok) return null;
      return await response.json();
    } catch (err) {
      console.warn('[CloudSync] Falha ao buscar propostas da nuvem:', err);
      return null;
    }
  }
}

export const cloudSyncServiceSingleton = new CloudSyncService();
