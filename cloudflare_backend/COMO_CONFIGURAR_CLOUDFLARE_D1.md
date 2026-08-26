# Como Publicar a API do Cloudflare Workers + D1 (Multi-Projetos)

Essa API roda **100% gratuita na nuvem da Cloudflare**, sem precisar do seu computador ligado, e suporta múltiplos projetos simultâneos (Prince of Persia, Black, etc.).

---

### Passo 1: Criar o Banco D1 na Cloudflare
1. Acesse o [Painel da Cloudflare](https://dash.cloudflare.com/) ➔ **Workers & Pages** ➔ **D1 SQL Database**.
2. Clique em **Create Database** e dê o nome de `dubcraft_db`.
3. Copie o **Database ID** gerado.

---

### Passo 2: Executar o Schema das Tabelas
Na aba **Console** do seu banco `dubcraft_db` na Cloudflare, cole e execute o conteúdo do arquivo [`schema.sql`](file:///c:/Users/rafam/Downloads/PROJETO%20DUBLAGEM%20-%20Prince%20of%20Persia%20-%20The%20Sands%20of%20Time/OrganizarPOP/web_comunidade/cloudflare_backend/schema.sql).

---

### Passo 3: Criar e Publicar o Worker
1. No menu lateral, vá em **Workers & Pages** ➔ **Create Application** ➔ **Create Worker**.
2. Dê o nome de `dubcraft-voting-api` e clique em **Deploy**.
3. Clique em **Edit Code** e cole todo o código de [`worker.js`](file:///c:/Users/rafam/Downloads/PROJETO%20DUBLAGEM%20-%20Prince%20of%20Persia%20-%20The%20Sands%20of%20Time/OrganizarPOP/web_comunidade/cloudflare_backend/worker.js).
4. Em **Settings ➔ Variables ➔ D1 Database Bindings**, adicione:
   * **Variable name:** `DB`
   * **D1 database:** `dubcraft_db`
5. Clique em **Save and Deploy**.

---

### Passo 4: Conectar no Front-end
Copie a URL do seu Worker (ex: `https://dubcraft-voting-api.seu-usuario.workers.dev`) e cole no seu arquivo `.env`:

```env
VITE_CLOUD_API_URL="https://dubcraft-voting-api.seu-usuario.workers.dev"
```

Pronto! Agora todos os seus projetos salvam votos e propostas na nuvem com escalabilidade infinita e custo zero.
