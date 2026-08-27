-- SCHEMA DO BANCO CLOUDFLARE D1 (Multi-projeto de Dublagem / DubCraft)

-- 1. Tabela de Propostas da Comunidade (indexada por project_id e dialogue_id)
CREATE TABLE IF NOT EXISTS proposals (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  dialogue_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_avatar TEXT,
  author_role TEXT DEFAULT 'user',
  proposed_translation TEXT,
  proposed_original_text TEXT,
  proposed_emotion TEXT,
  proposed_voice_type TEXT,
  proposed_pace TEXT,
  proposed_notes TEXT,
  proposed_status TEXT DEFAULT 'dublado', -- 'dublado', 'ignorar', 'gameplay'
  reason TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  score REAL DEFAULT 0,
  upvotes_count INTEGER DEFAULT 0,
  downvotes_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  resolved_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_proposals_project ON proposals(project_id);
CREATE INDEX IF NOT EXISTS idx_proposals_dialogue ON proposals(dialogue_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);

-- 2. Tabela de Votos da Comunidade (com restrição de VOTO ÚNICO por usuário e proposta)
CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  proposal_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  value INTEGER NOT NULL, -- 1 (upvote) ou -1 (downvote)
  weight REAL DEFAULT 1.0,
  updated_at TEXT NOT NULL,
  UNIQUE(proposal_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_proposal ON votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_votes_user ON votes(user_id);
