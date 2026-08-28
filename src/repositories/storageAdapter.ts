import {
  Project,
  ProjectStatus,
  Dialogue,
  Proposal,
  Vote,
  AuditLog,
  ReputationEvent,
  ProjectContributor,
  User,
} from '../types';

import { cloudSyncServiceSingleton } from '../services/cloudSyncService';
import catalogData from '../data/catalog.json';

const rawBase = import.meta.env.BASE_URL || './';
const baseURL = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

const INITIAL_PROJECTS: Project[] = (catalogData.projects || []).map((p: any) => ({
  ...p,
  coverImage: p.coverImage?.startsWith('http') ? p.coverImage : `${baseURL}${p.coverImage}`,
  dubbedAudioBaseUrl: `${baseURL}${p.dubbedAudioBaseUrl || `projetos/${p.slug}`}`,
}));

const INITIAL_DIALOGUES: Dialogue[] = (catalogData.dialogues || []).map((d: any) => ({
  ...d,
  audioOriginalUrl: d.audioOriginalUrl ? `${baseURL}${d.audioOriginalUrl}` : undefined,
  audioDubladoUrl: d.audioDubladoUrl ? `${baseURL}${d.audioDubladoUrl}` : undefined,
}));

const INITIAL_PROPOSALS: Proposal[] = [];
const INITIAL_VOTES: Vote[] = [];
const INITIAL_AUDITS: AuditLog[] = [];

// Vite Native Code Splitting: Cada projeto gera um chunk JavaScript separado baixado sob demanda
const projectDialogueLoaders = import.meta.glob('../data/projects/*.json');

export class LocalStorageRepositoryAdapter {
  private projectsKey = 'dubcraft_live_projects_v8';
  private dialoguesKey = 'dubcraft_live_dialogues_v8';
  private proposalsKey = 'dubcraft_live_proposals_v8';
  private votesKey = 'dubcraft_live_votes_v8';
  private auditsKey = 'dubcraft_live_audits_v8';
  private reputationEventsKey = 'dubcraft_live_reputation_v8';

  private baseProjects: Project[] = INITIAL_PROJECTS;
  private baseDialogues: Dialogue[] = INITIAL_DIALOGUES;
  private loadedProjectDialogues: Map<string, Dialogue[]> = new Map();

  constructor() {
    this.initSeedData();
  }

  private initSeedData() {
    // Limpa todas as chaves legadas e antigas
    try {
      localStorage.removeItem('organizarpop_projects');
      localStorage.removeItem('organizarpop_dialogues');
      localStorage.removeItem('organizarpop_proposals');
      localStorage.removeItem('organizarpop_votes');
      localStorage.removeItem('organizarpop_audits');
      localStorage.removeItem('dubcraft_projects');
      localStorage.removeItem('dubcraft_dialogues');
      localStorage.removeItem('dubcraft_black_projects_v5');
      localStorage.removeItem('dubcraft_black_projects_v6');
      localStorage.removeItem('dubcraft_black_dialogues_v6');
      localStorage.removeItem('dubcraft_live_projects_v7');
      localStorage.removeItem('dubcraft_live_dialogues_v7');
      localStorage.removeItem('dubcraft_live_proposals_v7');
      localStorage.removeItem('dubcraft_live_votes_v7');
      localStorage.removeItem('dubcraft_live_audits_v7');
      localStorage.removeItem('dubcraft_live_reputation_v7');
    } catch {}

    if (!localStorage.getItem(this.proposalsKey)) {
      localStorage.setItem(this.proposalsKey, JSON.stringify(INITIAL_PROPOSALS));
    }
    if (!localStorage.getItem(this.votesKey)) {
      localStorage.setItem(this.votesKey, JSON.stringify(INITIAL_VOTES));
    }
    if (!localStorage.getItem(this.auditsKey)) {
      localStorage.setItem(this.auditsKey, JSON.stringify(INITIAL_AUDITS));
    }
    if (!localStorage.getItem(this.reputationEventsKey)) {
      localStorage.setItem(this.reputationEventsKey, JSON.stringify([]));
    }
  }

  // --- PROJECTS ---
  public async getProjects(): Promise<Project[]> {
    let customProjects: Project[] = [];
    try {
      const raw = localStorage.getItem(this.projectsKey);
      if (raw) customProjects = JSON.parse(raw);
    } catch {}

    const projectMap = new Map<string, Project>();

    // Add base discovered projects from lightweight manifest
    for (const p of this.baseProjects) {
      projectMap.set(p.id, { ...p });
    }

    // Overlay or add custom projects
    for (const cp of customProjects) {
      const existing = projectMap.get(cp.id);
      if (existing) {
        projectMap.set(cp.id, { ...existing, ...cp });
      } else {
        projectMap.set(cp.id, cp);
      }
    }

    return Array.from(projectMap.values());
  }

  public async getProjectById(id: string): Promise<Project | null> {
    const projects = await this.getProjects();
    const cleanId = id.toLowerCase().replace(/^proj_/, '');
    return projects.find((p) => p.id === id || p.slug === id || p.id.toLowerCase().replace(/^proj_/, '') === cleanId || p.slug.toLowerCase().replace(/^proj_/, '') === cleanId) || null;
  }

  public async createProject(data: Partial<Project>): Promise<Project> {
    const projects = await this.getProjects();
    const slug = data.slug || (data.name || 'novo-projeto').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    const newProject: Project = {
      id: `proj_${Date.now()}`,
      name: data.name || 'Novo Projeto de Dublagem',
      slug: slug,
      description: data.description || 'Projeto de localização e dublagem de falas e cutscenes.',
      coverImage: data.coverImage || 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80',
      status: data.status || 'active',
      totalLines: data.totalLines || 0,
      reviewedLines: 0,
      pendingProposalsCount: 0,
      contributorsCount: 1,
      cutscenesCount: data.cutscenesCount || 0,
      githubRepo: data.githubRepo,
      githubBranch: data.githubBranch || 'main',
      githubPath: data.githubPath,
      dubbedAudioBaseUrl: data.dubbedAudioBaseUrl,
      huggingFaceDatasetUrl: data.huggingFaceDatasetUrl,
      fontFamily: data.fontFamily || 'sans',
      createdAt: new Date().toISOString(),
    };

    projects.push(newProject);
    localStorage.setItem(this.projectsKey, JSON.stringify(projects));
    return newProject;
  }

  public async updateProject(project: Project): Promise<Project> {
    let customProjects: Project[] = [];
    try {
      const raw = localStorage.getItem(this.projectsKey);
      if (raw) customProjects = JSON.parse(raw);
    } catch {}

    const idx = customProjects.findIndex((p) => p.id === project.id);
    if (idx !== -1) {
      customProjects[idx] = project;
    } else {
      customProjects.push(project);
    }
    localStorage.setItem(this.projectsKey, JSON.stringify(customProjects));
    return project;
  }

  public async updateProjectStatus(
    projectId: string,
    status: ProjectStatus,
    adminUser: User
  ): Promise<Project> {
    const project = await this.getProjectById(projectId);
    if (!project) throw new Error('Projeto não encontrado.');

    project.status = status;
    if (status === 'completed') {
      project.completedAt = new Date().toISOString();
    }
    await this.updateProject(project);

    await this.createAuditLog({
      id: `audit_${Date.now()}`,
      userId: adminUser.id,
      userName: adminUser.name,
      action: 'PROPOSAL_APPROVE',
      details: `Alterou o status do projeto "${project.name}" para "${status}".`,
      targetId: project.id,
      createdAt: new Date().toISOString(),
    });

    return project;
  }

  public async deleteProject(projectId: string): Promise<void> {
    let customProjects: Project[] = [];
    try {
      const raw = localStorage.getItem(this.projectsKey);
      if (raw) customProjects = JSON.parse(raw);
    } catch {}
    customProjects = customProjects.filter((p) => p.id !== projectId);
    localStorage.setItem(this.projectsKey, JSON.stringify(customProjects));
  }

  // --- DIALOGUES & LAZY CODE-SPLITTING ---
  public async getDialoguesByProject(projectId: string): Promise<Dialogue[]> {
    const cleanProjectId = projectId.toLowerCase().replace(/^proj_/, '');

    // 1. Carrega sob demanda via Code-Splitting do Vite (se ainda não estiver na memória)
    if (!this.loadedProjectDialogues.has(projectId)) {
      let loadedData: Dialogue[] = [];
      const cleanUnderscore = cleanProjectId.replace(/[^a-z0-9]/g, '_');

      for (const [loaderPath, loaderFn] of Object.entries(projectDialogueLoaders)) {
        const norm = loaderPath.toLowerCase().replace(/\\/g, '/');
        if (
          norm.includes(`/${projectId.toLowerCase()}.json`) ||
          norm.includes(`/proj_${cleanProjectId}.json`) ||
          norm.includes(`/proj_${cleanUnderscore}.json`) ||
          norm.includes(`/${cleanProjectId}.json`) ||
          norm.includes(`/${cleanUnderscore}.json`)
        ) {
          try {
            const mod: any = await loaderFn();
            const raw = mod.default || mod;
            if (Array.isArray(raw)) {
              loadedData = raw.map((d: any) => ({
                ...d,
                audioOriginalUrl: d.audioOriginalUrl ? (d.audioOriginalUrl.startsWith('http') ? d.audioOriginalUrl : `${baseURL}${d.audioOriginalUrl.replace(/^\/?/, '')}`) : undefined,
                audioDubladoUrl: d.audioDubladoUrl ? (d.audioDubladoUrl.startsWith('http') ? d.audioDubladoUrl : `${baseURL}${d.audioDubladoUrl.replace(/^\/?/, '')}`) : undefined,
              }));
              break;
            }
          } catch (e) {
            console.warn(`[Storage] Erro ao carregar split chunk ${loaderPath}:`, e);
          }
        }
      }

      // 2. Fallback de segurança para dados base embutidos
      if (loadedData.length === 0) {
        const matchingBase = this.baseDialogues.filter(
          (d) =>
            d.projectId === projectId ||
            d.projectId.toLowerCase().replace(/^proj_/, '') === cleanProjectId
        );
        loadedData = matchingBase;
      }

      this.loadedProjectDialogues.set(projectId, loadedData);
    }

    const baseForProj = this.loadedProjectDialogues.get(projectId) || [];

    // 3. Sobrepõe edições locais salvas pelo usuário no navegador (localStorage)
    let savedDialogues: Dialogue[] = [];
    try {
      const raw = localStorage.getItem(this.dialoguesKey);
      if (raw) savedDialogues = JSON.parse(raw);
    } catch {}

    const dialogueMap = new Map<string, Dialogue>();
    for (const d of baseForProj) {
      dialogueMap.set(d.id, { ...d });
    }

    for (const sd of savedDialogues) {
      if (
        sd.projectId === projectId ||
        sd.projectId?.toLowerCase().replace(/^proj_/, '') === cleanProjectId
      ) {
        const baseItem = dialogueMap.get(sd.id);
        dialogueMap.set(sd.id, {
          ...baseItem,
          ...sd,
          // Preserva URLs do catálogo base
          audioOriginalUrl: baseItem?.audioOriginalUrl,
          audioDubladoUrl: baseItem?.audioDubladoUrl,
        });
      }
    }

    return Array.from(dialogueMap.values());
  }

  public async getDialogueById(id: string, projectId?: string): Promise<Dialogue | null> {
    const list = projectId ? await this.getDialoguesByProject(projectId) : [];
    const fromList = list.find((d) => d.id === id);
    if (fromList) return fromList;

    let savedDialogues: Dialogue[] = [];
    try {
      const raw = localStorage.getItem(this.dialoguesKey);
      if (raw) savedDialogues = JSON.parse(raw);
    } catch {}

    const saved = savedDialogues.find((d) => d.id === id);
    if (saved) return saved;

    // Se projectId for especificado, busca direto no projeto
    if (projectId) {
      const projDialogues = await this.getDialoguesByProject(projectId);
      const found = projDialogues.find((d) => d.id === id);
      if (found) return found;
    }

    // Busca nas memórias já carregadas
    for (const list of this.loadedProjectDialogues.values()) {
      const found = list.find((d) => d.id === id);
      if (found) return found;
    }

    // Fallback: busca em todos os projetos registrados
    const projects = await this.getProjects();
    for (const p of projects) {
      const list = await this.getDialoguesByProject(p.id);
      const found = list.find((d) => d.id === id);
      if (found) return found;
    }

    const base = this.baseDialogues.find((d) => d.id === id);
    return base || null;
  }

  public async updateDialogue(dialogue: Dialogue): Promise<Dialogue> {
    let dialogues: Dialogue[] = [];
    try {
      const raw = localStorage.getItem(this.dialoguesKey);
      if (raw) dialogues = JSON.parse(raw);
    } catch {}

    const idx = dialogues.findIndex((d) => d.id === dialogue.id);
    if (idx !== -1) {
      dialogues[idx] = dialogue;
    } else {
      dialogues.push(dialogue);
    }
    localStorage.setItem(this.dialoguesKey, JSON.stringify(dialogues));

    // Atualiza cache em memória se o projeto estiver carregado
    if (this.loadedProjectDialogues.has(dialogue.projectId)) {
      const inMem = this.loadedProjectDialogues.get(dialogue.projectId) || [];
      const memIdx = inMem.findIndex((d) => d.id === dialogue.id);
      if (memIdx !== -1) {
        inMem[memIdx] = dialogue;
      } else {
        inMem.push(dialogue);
      }
    }

    // Recalcula totalLines e reviewedLines do projeto (desconsiderando ignorados)
    try {
      const project = await this.getProjectById(dialogue.projectId);
      if (project) {
        const allProjDialogues = await this.getDialoguesByProject(dialogue.projectId);
        const validDialogues = allProjDialogues.filter((d) => d.status !== 'ignorar');
        project.totalLines = validDialogues.length;
        project.reviewedLines = validDialogues.filter((d) => d.isReviewed).length;
        if (project.reviewedLines >= project.totalLines && project.totalLines > 0) {
          project.status = 'completed';
        }
        await this.updateProject(project);
      }
    } catch {}

    return dialogue;
  }

  public async saveDialogue(dialogue: Dialogue): Promise<Dialogue> {
    return this.updateDialogue(dialogue);
  }

  public async importCutsceneJSON(
    projectId: string,
    cutsceneFileName: string,
    rawLines: any[],
    subfolder?: string
  ): Promise<{ importedCount: number; cutsceneName: string }> {
    const raw = localStorage.getItem(this.dialoguesKey);
    let dialogues: Dialogue[] = raw ? JSON.parse(raw) : INITIAL_DIALOGUES;

    const importedDialogues: Dialogue[] = rawLines.map((item, index) => {
      const lineIndex = item.lineIndex ?? item.index ?? item.id_fala ?? index;
      return {
        id: `dial_${projectId}_${subfolder ? subfolder.replace(/[^a-z0-9]/gi, '_') + '_' : ''}${cutsceneFileName.replace(/[^a-z0-9]/gi, '_')}_${lineIndex}`,
        projectId,
        subfolder: subfolder || item.subfolder || item.mapa || item.fase || undefined,
        cutsceneName: cutsceneFileName,
        lineIndex,
        texto_original: item.texto_original || item.original || item.en || item.text || item.english || '',
        traducao_ptbr: item.traducao_ptbr || item.ptbr || item.traducao || item.portugues || item.text_pt || '',
        audioOriginalUrl: item.audioOriginalUrl || item.audio_en || undefined,
        audioDubladoUrl: item.audioDubladoUrl || item.audio_pt || undefined,
        emocao: item.emocao || item.emotion || 'neutro',
        tipo_voz: item.tipo_voz || item.voice || 'masculino_adulto',
        notas_dublagem: item.notas_dublagem || item.notes || item.direcao || undefined,
        status: item.status || (cutsceneFileName.toLowerCase().includes('radio') ? 'gameplay' : 'cutscene'),
        ritmo: item.ritmo || 'normal',
        comentarios: item.comentarios || undefined,
        speed_factor: item.speed_factor || 1.0,
        isReviewed: Boolean(item.isReviewed || item.revisado || item.aprovado),
        updatedAt: new Date().toISOString(),
      };
    });

    dialogues = dialogues.filter(
      (d) => !(d.projectId === projectId && d.cutsceneName === cutsceneFileName)
    );
    dialogues.push(...importedDialogues);
    localStorage.setItem(this.dialoguesKey, JSON.stringify(dialogues));

    const project = await this.getProjectById(projectId);
    if (project) {
      const projectDialogues = dialogues.filter((d) => d.projectId === projectId);
      const validDialogues = projectDialogues.filter((d) => d.status !== 'ignorar');
      project.totalLines = validDialogues.length;
      project.reviewedLines = validDialogues.filter((d) => d.isReviewed).length;
      project.cutscenesCount = new Set(projectDialogues.map((d) => d.cutsceneName)).size;
      if (project.reviewedLines >= project.totalLines && project.totalLines > 0) {
        project.status = 'completed';
      }
      await this.updateProject(project);
    }

    return {
      importedCount: importedDialogues.length,
      cutsceneName: cutsceneFileName,
    };
  }

  // --- PROPOSALS ---
  public async getProposalsByDialogue(dialogueId: string): Promise<Proposal[]> {
    const raw = localStorage.getItem(this.proposalsKey);
    const proposals: Proposal[] = raw ? JSON.parse(raw) : INITIAL_PROPOSALS;
    return dialogueId ? proposals.filter((p) => p.dialogueId === dialogueId) : proposals;
  }

  public async getProposalsByProject(projectId: string): Promise<Proposal[]> {
    const raw = localStorage.getItem(this.proposalsKey);
    const proposals: Proposal[] = raw ? JSON.parse(raw) : INITIAL_PROPOSALS;
    return projectId ? proposals.filter((p) => p.projectId === projectId) : proposals;
  }

  public async createProposal(data: Partial<Proposal> & { dialogueId: string; authorId: string; proposedTranslation: string }): Promise<Proposal> {
    const raw = localStorage.getItem(this.proposalsKey);
    const proposals: Proposal[] = raw ? JSON.parse(raw) : INITIAL_PROPOSALS;

    const initialWeight = data.authorRole === 'admin' ? 5.0 : data.authorRole === 'trusted' ? 3.0 : 1.0;

    const newProposal: Proposal = {
      id: data.id || `prop_${Date.now()}`,
      dialogueId: data.dialogueId,
      projectId: data.projectId || 'proj_black',
      authorId: data.authorId,
      authorName: data.authorName || 'Membro',
      authorAvatar: data.authorAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      authorReputation: data.authorReputation || 10,
      authorRole: data.authorRole || 'user',
      proposedTranslation: data.proposedTranslation,
      proposedEmotion: data.proposedEmotion,
      proposedVoiceType: data.proposedVoiceType,
      proposedPace: data.proposedPace,
      proposedNotes: data.proposedNotes,
      reason: data.reason || 'Melhoria na dublagem',
      status: data.status || 'pending',
      score: initialWeight,
      upvotesCount: 1,
      downvotesCount: 0,
      createdAt: data.createdAt || new Date().toISOString(),
    };

    proposals.unshift(newProposal);
    localStorage.setItem(this.proposalsKey, JSON.stringify(proposals));

    await this.castVote(newProposal.id, data.authorId, 1, initialWeight);

    return newProposal;
  }

  public async updateProposal(proposal: Proposal): Promise<Proposal> {
    const rawProps = localStorage.getItem(this.proposalsKey);
    const proposals: Proposal[] = rawProps ? JSON.parse(rawProps) : INITIAL_PROPOSALS;
    const propIndex = proposals.findIndex((p) => p.id === proposal.id);
    if (propIndex !== -1) {
      proposals[propIndex] = proposal;
      localStorage.setItem(this.proposalsKey, JSON.stringify(proposals));
    }
    return proposal;
  }

  public async acceptProposal(proposalId: string, reviewerUser: User): Promise<Dialogue> {
    const rawProps = localStorage.getItem(this.proposalsKey);
    const proposals: Proposal[] = rawProps ? JSON.parse(rawProps) : INITIAL_PROPOSALS;
    const propIndex = proposals.findIndex((p) => p.id === proposalId);

    if (propIndex === -1) throw new Error('Proposta não encontrada');
    const proposal = proposals[propIndex];

    const dialogue = await this.getDialogueById(proposal.dialogueId);
    if (!dialogue) throw new Error('Diálogo não encontrado');

    const previousTranslation = dialogue.traducao_ptbr;

    if (proposal.proposedTranslation && proposal.proposedTranslation.trim()) {
      dialogue.traducao_ptbr = proposal.proposedTranslation.trim();
    }
    if (proposal.proposedOriginalText && proposal.proposedOriginalText.trim()) {
      dialogue.texto_original = proposal.proposedOriginalText.trim();
    }
    if (proposal.proposedEmotion) dialogue.emocao = proposal.proposedEmotion;
    if (proposal.proposedVoiceType) dialogue.tipo_voz = proposal.proposedVoiceType;
    if (proposal.proposedPace) dialogue.ritmo = proposal.proposedPace;
    if (proposal.proposedNotes) dialogue.notas_dublagem = proposal.proposedNotes;
    dialogue.isReviewed = true;
    dialogue.updatedAt = new Date().toISOString();

    await this.updateDialogue(dialogue);

    proposal.status = 'approved';
    proposals[propIndex] = proposal;
    localStorage.setItem(this.proposalsKey, JSON.stringify(proposals));

    await this.createAuditLog({
      id: `audit_${Date.now()}`,
      userId: reviewerUser.id,
      userName: reviewerUser.name,
      action: 'PROPOSAL_APPROVE',
      details: `Aprovou proposta de "${proposal.authorName}" para a fala #${dialogue.lineIndex} (${dialogue.cutsceneName}). Anterior: "${previousTranslation}" -> Nova: "${dialogue.traducao_ptbr}"`,
      targetId: dialogue.id,
      createdAt: new Date().toISOString(),
    });

    return dialogue;
  }

  public async rejectProposal(proposalId: string, reviewerUser: User): Promise<void> {
    const rawProps = localStorage.getItem(this.proposalsKey);
    const proposals: Proposal[] = rawProps ? JSON.parse(rawProps) : INITIAL_PROPOSALS;
    const propIndex = proposals.findIndex((p) => p.id === proposalId);

    if (propIndex === -1) throw new Error('Proposta não encontrada');
    proposals[propIndex].status = 'rejected';
    localStorage.setItem(this.proposalsKey, JSON.stringify(proposals));

    await this.createAuditLog({
      id: `audit_${Date.now()}`,
      userId: reviewerUser.id,
      userName: reviewerUser.name,
      action: 'PROPOSAL_REJECT',
      details: `Rejeitou a proposta de tradução "${proposals[propIndex].proposedTranslation}"`,
      targetId: proposalId,
      createdAt: new Date().toISOString(),
    });
  }

  // --- VOTING SYSTEM ---
  public async saveVote(vote: Vote): Promise<Vote> {
    const rawVotes = localStorage.getItem(this.votesKey);
    let votes: Vote[] = rawVotes ? JSON.parse(rawVotes) : INITIAL_VOTES;
    const existingIndex = votes.findIndex((v) => v.proposalId === vote.proposalId && v.userId === vote.userId);
    if (existingIndex !== -1) {
      votes[existingIndex] = vote;
    } else {
      votes.push(vote);
    }
    localStorage.setItem(this.votesKey, JSON.stringify(votes));
    return vote;
  }

  public async getVotesByProposal(proposalId: string): Promise<Vote[]> {
    const rawVotes = localStorage.getItem(this.votesKey);
    const votes: Vote[] = rawVotes ? JSON.parse(rawVotes) : INITIAL_VOTES;
    return votes.filter((v) => v.proposalId === proposalId);
  }

  public async castVote(proposalId: string, userId: string, value: 1 | -1, userWeight: number): Promise<Proposal> {
    const rawVotes = localStorage.getItem(this.votesKey);
    let votes: Vote[] = rawVotes ? JSON.parse(rawVotes) : INITIAL_VOTES;

    const existingIndex = votes.findIndex((v) => v.proposalId === proposalId && v.userId === userId);

    if (existingIndex !== -1) {
      if (votes[existingIndex].value === value) {
        votes.splice(existingIndex, 1);
      } else {
        votes[existingIndex].value = value;
        votes[existingIndex].weight = userWeight;
        votes[existingIndex].updatedAt = new Date().toISOString();
      }
    } else {
      votes.push({
        id: `vote_${Date.now()}_${Math.random()}`,
        proposalId,
        userId,
        value,
        weight: userWeight,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    localStorage.setItem(this.votesKey, JSON.stringify(votes));

    const rawProps = localStorage.getItem(this.proposalsKey);
    const proposals: Proposal[] = rawProps ? JSON.parse(rawProps) : INITIAL_PROPOSALS;
    const propIndex = proposals.findIndex((p) => p.id === proposalId);

    if (propIndex !== -1) {
      const propVotes = votes.filter((v) => v.proposalId === proposalId);
      const score = propVotes.reduce((acc, v) => acc + v.value * v.weight, 0);
      const upvotes = propVotes.filter((v) => v.value === 1).length;
      const downvotes = propVotes.filter((v) => v.value === -1).length;

      proposals[propIndex].score = score;
      proposals[propIndex].upvotesCount = upvotes;
      proposals[propIndex].downvotesCount = downvotes;

      localStorage.setItem(this.proposalsKey, JSON.stringify(proposals));
      return proposals[propIndex];
    }

    throw new Error('Proposta não encontrada');
  }

  public async getUserVoteForProposal(proposalId: string, userId: string): Promise<Vote | null> {
    const rawVotes = localStorage.getItem(this.votesKey);
    const votes: Vote[] = rawVotes ? JSON.parse(rawVotes) : INITIAL_VOTES;
    return votes.find((v) => v.proposalId === proposalId && v.userId === userId) || null;
  }

  // --- REPUTATION EVENTS ---
  public async addReputationEvent(event: ReputationEvent): Promise<void> {
    const raw = localStorage.getItem(this.reputationEventsKey);
    const events: ReputationEvent[] = raw ? JSON.parse(raw) : [];
    events.unshift(event);
    localStorage.setItem(this.reputationEventsKey, JSON.stringify(events));
  }

  // --- AUDIT LOGS ---
  public async getAuditLogs(): Promise<AuditLog[]> {
    const raw = localStorage.getItem(this.auditsKey);
    return raw ? JSON.parse(raw) : INITIAL_AUDITS;
  }

  public async createAuditLog(log: AuditLog): Promise<void> {
    const logs = await this.getAuditLogs();
    logs.unshift(log);
    localStorage.setItem(this.auditsKey, JSON.stringify(logs.slice(0, 100)));
  }

  // --- CONTRIBUTORS / LEADERBOARD ---
  public async getContributors(): Promise<ProjectContributor[]> {
    return this.getProjectContributors('');
  }

  public async getProjectContributors(projectId: string): Promise<ProjectContributor[]> {
    // 1. Obter propostas salvas no armazenamento local
    const raw = localStorage.getItem(this.proposalsKey);
    const localProposals: Proposal[] = raw ? JSON.parse(raw) : [];

    // 2. Obter propostas da nuvem caso a API esteja ativa
    let cloudProps: Proposal[] = [];
    try {
      const remote = await cloudSyncServiceSingleton.fetchProposals(projectId || '');
      if (remote && Array.isArray(remote)) {
        cloudProps = remote;
      }
    } catch {}

    const map = new Map<string, Proposal>();
    localProposals.forEach((p) => map.set(p.id, p));
    cloudProps.forEach((p) => map.set(p.id, p));
    const allProposals = Array.from(map.values());

    const cleanProjectId = projectId ? projectId.toLowerCase().replace(/^proj_/, '') : '';

    // Filtrar por projeto se especificado
    const filtered = cleanProjectId && cleanProjectId !== 'all'
      ? allProposals.filter((p) => {
          const pClean = (p.projectId || '').toLowerCase().replace(/^proj_/, '');
          return pClean === cleanProjectId;
        })
      : allProposals;

    // Agrupar métricas por autor
    const contributorsMap = new Map<string, ProjectContributor>();

    for (const p of filtered) {
      if (!p.authorId) continue;
      const existing = contributorsMap.get(p.authorId) || {
        userId: p.authorId,
        userName: p.authorName || 'Colaborador',
        userAvatar: p.authorAvatar || '',
        userRole: p.authorRole || 'user',
        role: p.authorRole || 'user',
        approvedCount: 0,
        totalProposals: 0,
        totalVotes: 0,
        reputation: p.authorReputation || 10,
      };

      existing.totalProposals += 1;
      if (p.status === 'approved') {
        existing.approvedCount = (existing.approvedCount || 0) + 1;
      }
      if (p.authorAvatar && !existing.userAvatar) {
        existing.userAvatar = p.authorAvatar;
      }
      if (p.authorName && (!existing.userName || existing.userName === 'Colaborador')) {
        existing.userName = p.authorName;
      }
      if (p.authorRole) {
        existing.userRole = p.authorRole;
        existing.role = p.authorRole;
      }

      contributorsMap.set(p.authorId, existing);
    }

    return Array.from(contributorsMap.values()).sort(
      (a, b) => (b.approvedCount || 0) - (a.approvedCount || 0) || b.totalProposals - a.totalProposals
    );
  }
}

export const repositoryAdapterSingleton = new LocalStorageRepositoryAdapter();
