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

const INITIAL_PROPOSALS: Proposal[] = [
  {
    id: 'prop_001',
    dialogueId: INITIAL_DIALOGUES[1]?.id || 'dial_black_level_00_1',
    projectId: 'proj_black',
    authorId: 'user_trusted_01',
    authorName: 'CapitaoPrice',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    authorReputation: 240,
    authorRole: 'trusted',
    proposedTranslation: 'Todas as equipes, avancem para o museu! Suprimam o fogo inimigo nas sacadas superiores!',
    proposedEmotion: 'grito',
    proposedVoiceType: 'masculino_adulto',
    proposedPace: 'rapido',
    proposedNotes: 'Adaptação mais militar e dinâmica para o combate intenso no rádio.',
    reason: 'Tradução com tom militar tático para o calor da batalha.',
    status: 'pending',
    score: 8.5,
    upvotesCount: 5,
    downvotesCount: 0,
    createdAt: '2026-01-20T10:00:00Z',
  },
];

const INITIAL_VOTES: Vote[] = [
  {
    id: 'vote_001',
    proposalId: 'prop_001',
    userId: 'user_admin_01',
    value: 1,
    weight: 5.0,
    createdAt: '2026-01-20T11:00:00Z',
    updatedAt: '2026-01-20T11:00:00Z',
  },
];

const INITIAL_AUDITS: AuditLog[] = [
  {
    id: 'audit_001',
    userId: 'user_admin_01',
    userName: 'DubCraft Admin',
    action: 'PROJECT_EXPORT',
    details: 'Identificou automaticamente a pasta de projeto Black com 3.500+ falas e áudios originais e dublados.',
    targetId: 'proj_black',
    createdAt: '2026-01-20T12:00:00Z',
  },
];

export class LocalStorageRepositoryAdapter {
  private projectsKey = 'dubcraft_live_projects_v7';
  private dialoguesKey = 'dubcraft_live_dialogues_v7';
  private proposalsKey = 'dubcraft_live_proposals_v7';
  private votesKey = 'dubcraft_live_votes_v7';
  private auditsKey = 'dubcraft_live_audits_v7';
  private reputationEventsKey = 'dubcraft_live_reputation_v7';

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

  // --- DIALOGUES & PERSISTENCE ---
  public async getDialoguesByProject(projectId: string): Promise<Dialogue[]> {
    const cleanProjectId = projectId.toLowerCase().replace(/^proj_/, '');

    // 1. Prioridade máxima: Diálogos indexados no catálogo base
    let baseForProj = this.baseDialogues.filter(
      (d) =>
        d.projectId === projectId ||
        d.projectId.toLowerCase().replace(/^proj_/, '') === cleanProjectId
    );

    // 2. Se não estiver embutido no catálogo base, busca sob demanda
    if (baseForProj.length === 0 && !this.loadedProjectDialogues.has(projectId)) {
      const allProjects = await this.getProjects();
      const proj = allProjects.find(
        (p) =>
          p.id === projectId ||
          p.slug === cleanProjectId ||
          p.id.toLowerCase().replace(/^proj_/, '') === cleanProjectId
      );
      const slug = proj?.slug || cleanProjectId;
      const realFolderName = (proj as any)?.folderName || (proj?.dubbedAudioBaseUrl ? proj.dubbedAudioBaseUrl.replace(/^\/?(projetos\/)?/, '').split('/')[0] : '');

      let fetchedDialogues: Dialogue[] = [];
      try {
        const candidateUrls = [
          realFolderName ? `${baseURL}projetos/${realFolderName}/dialogues.json` : '',
          `${baseURL}projetos/${slug}/dialogues.json`,
          `${baseURL}projetos/Black/dialogues.json`,
          `./projetos/${realFolderName}/dialogues.json`,
        ].filter(Boolean);

        for (const url of candidateUrls) {
          try {
            const resp = await fetch(url);
            if (resp.ok) {
              const data = await resp.json();
              if (Array.isArray(data) && data.length > 0) {
                fetchedDialogues = data.map((d: any) => ({
                  ...d,
                  audioOriginalUrl: d.audioOriginalUrl ? (d.audioOriginalUrl.startsWith('http') ? d.audioOriginalUrl : `${baseURL}${d.audioOriginalUrl.replace(/^\/?/, '')}`) : undefined,
                  audioDubladoUrl: d.audioDubladoUrl ? (d.audioDubladoUrl.startsWith('http') ? d.audioDubladoUrl : `${baseURL}${d.audioDubladoUrl.replace(/^\/?/, '')}`) : undefined,
                }));
                break;
              }
            }
          } catch {}
        }
      } catch (err) {
        console.warn(`[Storage] Aviso ao carregar dialogues sob demanda para ${projectId}:`, err);
      }

      this.loadedProjectDialogues.set(projectId, fetchedDialogues);
      baseForProj = fetchedDialogues;
    } else if (baseForProj.length === 0) {
      baseForProj = this.loadedProjectDialogues.get(projectId) || [];
    }

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
        dialogueMap.set(sd.id, sd);
      }
    }

    return Array.from(dialogueMap.values());
  }

  public async getDialogueById(id: string): Promise<Dialogue | null> {
    let savedDialogues: Dialogue[] = [];
    try {
      const raw = localStorage.getItem(this.dialoguesKey);
      if (raw) savedDialogues = JSON.parse(raw);
    } catch {}

    const saved = savedDialogues.find((d) => d.id === id);
    if (saved) return saved;

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
    return dialogue;
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
      project.totalLines = projectDialogues.length;
      project.reviewedLines = projectDialogues.filter((d) => d.isReviewed).length;
      project.cutscenesCount = new Set(projectDialogues.map((d) => d.cutsceneName)).size;
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
    return [
      {
        userId: 'user_admin_01',
        userName: 'DubCraft Admin',
        role: 'admin',
        approvedCount: 38,
        totalProposals: 42,
        totalVotes: 120,
        reputation: 680,
      },
      {
        userId: 'user_trusted_01',
        userName: 'CapitaoPrice',
        role: 'trusted',
        approvedCount: 24,
        totalProposals: 28,
        totalVotes: 85,
        reputation: 340,
      },
      {
        userId: 'user_exp_01',
        userName: 'Ghost_BR',
        role: 'experienced',
        approvedCount: 10,
        totalProposals: 15,
        totalVotes: 45,
        reputation: 160,
      },
    ];
  }

  public async getProjectContributors(projectId: string): Promise<ProjectContributor[]> {
    return this.getContributors();
  }
}

export const repositoryAdapterSingleton = new LocalStorageRepositoryAdapter();
