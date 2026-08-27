/**
 * CLOUDFLARE WORKER - API SERVERLESS DE VOTAÇÃO E PROPOSTAS (MULTI-PROJETO)
 * Conectado ao Cloudflare D1 (SQLite na Edge)
 * Suporta milhões de requisições gratuitas sem o seu PC ligado.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
};

// Limite de segurança diário do plano gratuito (100.000)
const DAILY_WRITE_LIMIT = 98000;

// Helper para obter a instância do banco D1 com qualquer nome configurado no binding (DB, dubcraft_DB, etc.)
function getDB(env) {
  if (env.DB) return env.DB;
  if (env.dubcraft_DB) return env.dubcraft_DB;
  for (const key of Object.keys(env)) {
    if (env[key] && typeof env[key].prepare === 'function') {
      return env[key];
    }
  }
  throw new Error('D1 Database binding não encontrado no Worker. Verifique as configurações em Settings ➔ Bindings.');
}

async function checkCircuitBreaker(db) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const stats = await db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM votes WHERE updated_at >= ?) +
        (SELECT COUNT(*) FROM proposals WHERE created_at >= ?) as writes_today
    `).bind(today).first();

    const writesToday = stats?.writes_today || 0;
    if (writesToday >= DAILY_WRITE_LIMIT) {
      return {
        isPaused: true,
        writesToday,
        resetsAt: '00:00 UTC',
      };
    }
    return { isPaused: false, writesToday };
  } catch {
    return { isPaused: false, writesToday: 0 };
  }
}

export default {
  async fetch(request, env) {
    // Handle CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      const db = getDB(env);

      // Intercept write operations with Circuit Breaker (Disjuntor de Segurança)
      if (request.method === 'POST' || request.method === 'PATCH') {
        const breaker = await checkCircuitBreaker(db);
        if (breaker.isPaused) {
          return jsonResponse({
            error: 'CIRCUIT_BREAKER_ACTIVE',
            isQuotaPaused: true,
            message: 'Disjuntor de Segurança ativado: Cota diária de gravações atingida. Reabertura automática às 00:00 UTC.',
            writesToday: breaker.writesToday,
            resetsAt: breaker.resetsAt,
          }, 429);
        }
      }

      // 1. GET /proposals?projectId=proj_black
      if (request.method === 'GET' && path === '/proposals') {
        const projectId = url.searchParams.get('projectId');
        let query = 'SELECT * FROM proposals';
        const params = [];

        if (projectId) {
          query += ' WHERE project_id = ?';
          params.push(projectId);
        }
        query += ' ORDER BY created_at DESC';

        const { results } = await db.prepare(query).bind(...params).all();
        
        // Format response matching frontend Proposal interface
        const formatted = results.map(r => ({
          id: r.id,
          dialogueId: r.dialogue_id,
          projectId: r.project_id,
          authorId: r.author_id,
          authorName: r.author_name,
          authorAvatar: r.author_avatar,
          authorRole: r.author_role,
          proposedTranslation: r.proposed_translation,
          proposedOriginalText: r.proposed_original_text,
          proposedEmotion: r.proposed_emotion,
          proposedVoiceType: r.proposed_voice_type,
          proposedPace: r.proposed_pace,
          proposedNotes: r.proposed_notes,
          proposedStatus: r.proposed_status || (r.reason?.toLowerCase().includes('ignorar') ? 'ignorar' : undefined),
          reason: r.reason,
          status: r.status,
          score: r.score,
          upvotesCount: r.upvotes_count,
          downvotesCount: r.downvotes_count,
          createdAt: r.created_at,
          resolvedAt: r.resolved_at,
          resolvedBy: r.resolved_by,
        }));

        return jsonResponse(formatted);
      }

      // 2. POST /proposals (Criar nova proposta da comunidade)
      if (request.method === 'POST' && path === '/proposals') {
        const body = await request.json();
        const id = body.id || `prop_${Date.now()}`;

        // Tentativa de INSERT com proposed_status (com fallback para esquemas legados caso a coluna não exista)
        try {
          await db.prepare(`
            INSERT INTO proposals (
              id, project_id, dialogue_id, author_id, author_name, author_avatar, author_role,
              proposed_translation, proposed_original_text, proposed_emotion, proposed_voice_type,
              proposed_pace, proposed_notes, proposed_status, reason, status, score, upvotes_count, downvotes_count, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            id,
            body.projectId,
            body.dialogueId,
            body.authorId,
            body.authorName,
            body.authorAvatar || '',
            body.authorRole || 'user',
            body.proposedTranslation || null,
            body.proposedOriginalText || null,
            body.proposedEmotion || null,
            body.proposedVoiceType || null,
            body.proposedPace || null,
            body.proposedNotes || null,
            body.proposedStatus || null,
            body.reason || 'Melhoria na fala',
            body.status || 'pending',
            body.score || 0,
            body.upvotesCount || 0,
            body.downvotesCount || 0,
            body.createdAt || new Date().toISOString()
          ).run();
        } catch (dbErr) {
          // Fallback se a coluna proposed_status ainda não foi adicionada no D1 remoto
          await db.prepare(`
            INSERT INTO proposals (
              id, project_id, dialogue_id, author_id, author_name, author_avatar, author_role,
              proposed_translation, proposed_original_text, proposed_emotion, proposed_voice_type,
              proposed_pace, proposed_notes, reason, status, score, upvotes_count, downvotes_count, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            id,
            body.projectId,
            body.dialogueId,
            body.authorId,
            body.authorName,
            body.authorAvatar || '',
            body.authorRole || 'user',
            body.proposedTranslation || null,
            body.proposedOriginalText || null,
            body.proposedEmotion || null,
            body.proposedVoiceType || null,
            body.proposedPace || null,
            body.proposedNotes || null,
            body.reason || 'Melhoria na fala',
            body.status || 'pending',
            body.score || 0,
            body.upvotesCount || 0,
            body.downvotesCount || 0,
            body.createdAt || new Date().toISOString()
          ).run();
        }

        return jsonResponse({ success: true, id }, 201);
      }

      // 3. POST /votes (Registrar ou atualizar voto com garantia de voto único e anti-fraude)
      if (request.method === 'POST' && path === '/votes') {
        const body = await request.json();
        const { proposalId, projectId, userId, value, weight = 1.0 } = body;

        if (!proposalId || !userId || value === undefined) {
          return jsonResponse({ error: 'Campos obrigatórios ausentes.' }, 400);
        }

        // Sanitização contra manipulação via console (F12):
        // 1. O valor do voto é forçado no servidor a ser estritamente +1 ou -1
        const sanitizedValue = value > 0 ? 1 : -1;
        // 2. O peso é limitado a uma faixa segura (0.5x a 5.0x no máximo para Admins)
        const sanitizedWeight = Math.min(Math.max(Number(weight) || 1.0, 0.5), 5.0);

        const voteId = `${proposalId}_${userId}`;
        const now = new Date().toISOString();

        // Upsert do voto no D1 (Garante 1 único voto por usuário mesmo com spam no console)
        await db.prepare(`
          INSERT INTO votes (id, project_id, proposal_id, user_id, value, weight, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(proposal_id, user_id) DO UPDATE SET
            value = excluded.value,
            weight = excluded.weight,
            updated_at = excluded.updated_at
        `).bind(voteId, projectId || null, proposalId, userId, sanitizedValue, sanitizedWeight, now).run();

        // Recalcula totais da proposta
        const voteStats = await db.prepare(`
          SELECT 
            SUM(CASE WHEN value > 0 THEN 1 ELSE 0 END) as upvotes,
            SUM(CASE WHEN value < 0 THEN 1 ELSE 0 END) as downvotes,
            SUM(value * weight) as net_score
          FROM votes
          WHERE proposal_id = ?
        `).bind(proposalId).first();

        const upvotes = voteStats?.upvotes || 0;
        const downvotes = voteStats?.downvotes || 0;
        const score = Math.round((voteStats?.net_score || 0) * 10) / 10;

        // Atualiza a proposta com os novos scores agregados
        await db.prepare(`
          UPDATE proposals
          SET upvotes_count = ?, downvotes_count = ?, score = ?
          WHERE id = ?
        `).bind(upvotes, downvotes, score, proposalId).run();

        return jsonResponse({ success: true, proposalId, upvotes, downvotes, score });
      }

      // 4. GET /users (Listar todos os usuários da comunidade para o Admin)
      if (request.method === 'GET' && path === '/users') {
        const { results } = await db.prepare(`
          SELECT id, name, username, email, avatar_url, role, reputation, is_trusted, created_at
          FROM users
          ORDER BY created_at DESC
        `).all();

        const formatted = (results || []).map(r => ({
          id: r.id,
          name: r.name,
          username: r.username,
          email: r.email,
          avatarUrl: r.avatar_url,
          role: r.role || 'user',
          reputation: r.reputation || 10,
          isTrusted: Boolean(r.is_trusted),
          createdAt: r.created_at,
        }));

        return jsonResponse(formatted);
      }

      // 5. POST /users/sync (Sincronizar usuário ao fazer login)
      if (request.method === 'POST' && path === '/users/sync') {
        const user = await request.json();
        if (!user || !user.id) {
          return jsonResponse({ error: 'Dados do usuário inválidos' }, 400);
        }

        const now = new Date().toISOString();
        await db.prepare(`
          INSERT INTO users (id, name, username, email, avatar_url, role, reputation, is_trusted, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            username = excluded.username,
            email = excluded.email,
            avatar_url = excluded.avatar_url
        `).bind(
          user.id,
          user.name || 'Membro',
          user.username || 'usuario',
          user.email || null,
          user.avatarUrl || '',
          user.role || 'user',
          user.reputation || 10,
          user.isTrusted ? 1 : 0,
          user.createdAt || now
        ).run();

        return jsonResponse({ success: true });
      }

      // 6. PATCH /users/trust (Alterar cargo / status Trusted de um colaborador)
      if (request.method === 'PATCH' && path === '/users/trust') {
        const { userId, email, isTrusted } = await request.json();

        if (userId) {
          await db.prepare(`
            UPDATE users
            SET is_trusted = ?, role = CASE WHEN ? = 1 AND role = 'user' THEN 'trusted' ELSE role END
            WHERE id = ?
          `).bind(isTrusted ? 1 : 0, isTrusted ? 1 : 0, userId).run();
        } else if (email) {
          await db.prepare(`
            UPDATE users
            SET is_trusted = ?, role = CASE WHEN ? = 1 AND role = 'user' THEN 'trusted' ELSE role END
            WHERE email = ?
          `).bind(isTrusted ? 1 : 0, isTrusted ? 1 : 0, email).run();
        }

        return jsonResponse({ success: true });
      }

      // 7. Rota raiz / status
      if (path === '/' || path === '/health') {
        return jsonResponse({
          status: 'online',
          service: 'DubCraft Cloudflare Edge API',
          timestamp: new Date().toISOString(),
        });
      }

      return jsonResponse({ error: 'Rota não encontrada' }, 404);
    } catch (err) {
      return jsonResponse({ error: err.message || 'Erro interno no servidor' }, 500);
    }
  },
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}
