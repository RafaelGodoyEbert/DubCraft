# Como Publicar a API do Cloudflare Workers + D1 (Multi-Projetos)

Essa API roda **100% gratuita na nuvem da Cloudflare**, sem precisar do seu computador ligado, e suporta múltiplos projetos simultâneos (Prince of Persia, Black, etc.).

---

### Passo 1: Criar o Banco D1 na Cloudflare
1. Acesse o [Painel da Cloudflare](https://dash.cloudflare.com/).
2. No menu lateral esquerdo, vá em **Storage & databases** ➔ **D1 SQLite Database**.
3. Clique em **Create Database** e escolha o nome que desejar (ex: `dubcraft_db`). *(O nome é livre, só lembre de vinculá-lo no Passo 3)*.
4. Copie o **Database ID** gerado (opcional/referência).

---

### Passo 2: Executar o Schema das Tabelas
No painel do banco criado, abra a aba **Console**. Para evitar erros com comentários SQL, execute os blocos de comando abaixo (ou o conteúdo de [`schema.sql`](schema.sql)):

#### 1. Criar Tabela de Propostas
```sql
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
  proposed_status TEXT DEFAULT 'dublado',
  reason TEXT,
  status TEXT DEFAULT 'pending',
  score REAL DEFAULT 0,
  upvotes_count INTEGER DEFAULT 0,
  downvotes_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  resolved_by TEXT
);
```

> ⚠️ **Já criou a tabela anteriormente?** Não precisa recriar o banco do zero! Basta rodar apenas esta linha no console para atualizar a tabela existente:
> ```sql
> ALTER TABLE proposals ADD COLUMN proposed_status TEXT DEFAULT 'dublado';
> ```

#### 2. Criar Índices de Propostas
```sql
CREATE INDEX IF NOT EXISTS idx_proposals_project ON proposals(project_id);
CREATE INDEX IF NOT EXISTS idx_proposals_dialogue ON proposals(dialogue_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
```

#### 3. Criar Tabela de Votos
```sql
CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  proposal_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  value INTEGER NOT NULL,
  weight REAL DEFAULT 1.0,
  updated_at TEXT NOT NULL,
  UNIQUE(proposal_id, user_id)
);
```

#### 4. Criar Índices de Votos
```sql
CREATE INDEX IF NOT EXISTS idx_votes_proposal ON votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_votes_user ON votes(user_id);
```

> **Dica:** Você pode digitar `/tables` no console da Cloudflare e clicar em **Execute** para verificar se as tabelas `proposals` e `votes` foram criadas com sucesso.

---

### Passo 3: Criar e Publicar o Worker
1. No menu lateral da Cloudflare, vá em **Workers & Pages** (ou **Compute (Workers)**) ➔ **Create Application** ➔ **Create Worker**.
2. Na tela de opções ("Ship something new"), escolha **"Start with Hello World!"**.
3. Dê o nome de `dubcraft-voting-api` (ou qualquer nome) e clique em **Deploy**.
4. Clique em **Edit Code** e substitua todo o código existente colando o conteúdo de [`worker.js`](worker.js). Em seguida, clique em **Deploy** no editor.
5. Volte nas configurações do seu Worker em **Settings** ➔ **Bindings** (ou **Variables / D1 Database Bindings**):
   * Clique em **Add** ➔ **D1 Database**.
   * **Variable name:** `DB` *(Obrigatório ser DB em maiúsculas)*.
   * **D1 database:** Selecione o banco que você criou no Passo 1 (ex: `dubcraft_db`).
6. Salve e implante (**Save and Deploy**).

---

### Passo 4: Conectar no Front-end (Vite e GitHub Pages)
Copie a URL pública gerada para o seu Worker (ex: `https://dubcraft-voting-api.seu-usuario.workers.dev`).

#### Opção A: Desenvolvimento Local (Vite)
No seu arquivo `.env` (na raiz da pasta `web_comunidade`), adicione ou atualize a linha:
```env
VITE_CLOUD_API_URL="https://dubcraft-voting-api.seu-usuario.workers.dev"
```

#### Opção B: Publicação no GitHub Pages (GitHub Actions Secrets)
Para que a versão online publicada no GitHub Pages se comunique com a sua API:
1. Abra o seu repositório no GitHub.
2. Vá em **Settings** ➔ **Secrets and variables** ➔ **Actions**.
3. Na seção **Repository secrets**, clique em **New repository secret**.
4. Preencha:
   * **Name:** `VITE_CLOUD_API_URL`
   * **Secret:** `https://dubcraft-voting-api.seu-usuario.workers.dev` *(a URL do seu Worker)*
5. Clique em **Add secret**.
6. Pronto! No próximo deploy/push para o GitHub, o GitHub Actions injetará automaticamente essa variável no build do Vite.
