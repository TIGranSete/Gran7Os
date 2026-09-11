import express from "express";
import path from "path";
import bcrypt from "bcryptjs";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { db, pool } from "./src/db/index.ts";
import {
  usuarios,
  processos,
  solicitacoes,
  solicitacaoHistorico,
  conversas,
  mensagens,
  tarefas,
  tarefaAtribuicoes,
  setores,
  cargos,
  perfis,
  permissoes,
  perfilPermissoes,
  usuarioPerfis,
  configuracoesSistema,
  mensagensDiretas,
  arquivos
} from "./src/db/schema.ts";
import { eq, inArray, or, and, desc } from "drizzle-orm";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

async function getEnrichedUser(usuarioId: string) {
  const userQuery = await pool.query(
    `SELECT u.id, u.uid, u.nome, u.email, u.cargo_id, u.setor_id, u.gestor_id, u.ativo,
            s.nome as setor_nome, c.nome as cargo_nome
     FROM usuarios u
     LEFT JOIN setores s ON u.setor_id = s.id
     LEFT JOIN cargos c ON u.cargo_id = c.id
     WHERE u.id = $1`,
    [usuarioId]
  );
  if (userQuery.rows.length === 0) return null;
  const u = userQuery.rows[0];

  const roleQuery = await pool.query(
    `SELECT p.id as perfil_id, p.nome as perfil_nome
     FROM usuario_perfis up
     INNER JOIN perfis p ON up.perfil_id = p.id
     WHERE up.usuario_id = $1`,
    [usuarioId]
  );
  const roles = roleQuery.rows.map(r => ({ id: r.perfil_id, name: r.perfil_nome }));

  return {
    id: u.id,
    name: u.nome,
    email: u.email,
    username: u.email ? u.email.split('@')[0] : u.nome.toLowerCase().replace(/\s+/g, ''),
    role: roles[0]?.name || u.cargo_nome || 'Usuário',
    roles,
    department: u.setor_nome || 'Geral',
    status: u.ativo ? 'Ativo' : 'Inativo',
    cargoId: u.cargo_id,
    setorId: u.setor_id,
    gestorId: u.gestor_id
  };
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // ==================== USUÁRIOS API ====================
  app.get("/api/users", async (req, res) => {
    try {
      const usersQuery = await pool.query(`
        SELECT 
          u.id, 
          u.uid, 
          u.nome, 
          u.email, 
          u.senha_hash, 
          u.cargo_id, 
          u.setor_id, 
          u.gestor_id, 
          u.ativo, 
          u.created_at, 
          u.updated_at,
          s.nome as setor_nome,
          c.nome as cargo_nome
        FROM usuarios u
        LEFT JOIN setores s ON u.setor_id = s.id
        LEFT JOIN cargos c ON u.cargo_id = c.id
        ORDER BY u.created_at DESC
      `);

      const allUsers = usersQuery.rows;

      // Fetch roles mapped via usuario_perfis
      const userRolesQuery = await pool.query(`
        SELECT up.usuario_id, p.id as perfil_id, p.nome as perfil_nome
        FROM usuario_perfis up
        INNER JOIN perfis p ON up.perfil_id = p.id
      `);

      let userRolesMap: Record<string, any[]> = {};
      for (const row of userRolesQuery.rows) {
        if (!userRolesMap[row.usuario_id]) {
          userRolesMap[row.usuario_id] = [];
        }
        userRolesMap[row.usuario_id].push({ id: row.perfil_id, name: row.perfil_nome });
      }

      const formatted = allUsers.map(u => ({
        id: u.id,
        name: u.nome,
        email: u.email,
        username: u.email ? u.email.split('@')[0] : u.nome.toLowerCase().replace(/\s+/g, ''),
        role: userRolesMap[u.id]?.[0]?.name || u.cargo_nome || 'Usuário',
        roles: userRolesMap[u.id] || [],
        department: u.setor_nome || 'Geral',
        status: u.ativo ? 'Ativo' : 'Inativo',
        cargoId: u.cargo_id,
        setorId: u.setor_id,
        gestorId: u.gestor_id
      }));

      res.json(formatted);
    } catch (error: any) {
      console.error('Error getting users:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const { name, email, username, password, role, department, status, roleId, departmentId } = req.body;

      // Find or resolve departmentId and cargoId
      let resolvedSetorId = departmentId;
      if (!resolvedSetorId && department) {
        const foundSetor = await db.select().from(setores).where(eq(setores.nome, department));
        if (foundSetor.length > 0) resolvedSetorId = foundSetor[0].id;
      }

      let resolvedCargoId = roleId;
      if (!resolvedCargoId && role) {
        const foundCargo = await db.select().from(cargos).where(eq(cargos.nome, role));
        if (foundCargo.length > 0) resolvedCargoId = foundCargo[0].id;
      }

      const userUid = `usr_${Date.now()}_${Math.floor(Math.random()*1000)}`;

      const senhaHash = await bcrypt.hash(password || '123456', 10);

      const inserted = await db.insert(usuarios).values({
        uid: userUid,
        nome: name,
        email: email,
        senhaHash,
        setorId: resolvedSetorId || null,
        cargoId: resolvedCargoId || null,
        ativo: status === 'Ativo' || status === true
      }).returning();

      const newUser = inserted[0];

      // Link profile if role corresponds to a perfil
      if (role) {
        const foundPerfil = await db.select().from(perfis).where(eq(perfis.nome, role));
        if (foundPerfil.length > 0) {
          await db.insert(usuarioPerfis).values({
            usuarioId: newUser.id,
            perfilId: foundPerfil[0].id
          });
        }
      }

      res.status(201).json({
        id: newUser.id,
        name: newUser.nome,
        email: newUser.email,
        username: username || email.split('@')[0],
        role: role || 'Usuário',
        department: department || 'Geral',
        status: newUser.ativo ? 'Ativo' : 'Inativo'
      });
    } catch (error: any) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const userId = req.params.id;
      const { name, email, username, password, role, department, status, roleId, departmentId } = req.body;

      let resolvedSetorId = departmentId;
      if (!resolvedSetorId && department) {
        const foundSetor = await db.select().from(setores).where(eq(setores.nome, department));
        if (foundSetor.length > 0) resolvedSetorId = foundSetor[0].id;
      }

      let resolvedCargoId = roleId;
      if (!resolvedCargoId && role) {
        const foundCargo = await db.select().from(cargos).where(eq(cargos.nome, role));
        if (foundCargo.length > 0) resolvedCargoId = foundCargo[0].id;
      }

      const updatePayload: any = {
        updatedAt: new Date()
      };
      if (name) updatePayload.nome = name;
      if (email) updatePayload.email = email;
      if (password) updatePayload.senhaHash = await bcrypt.hash(password, 10);
      if (resolvedSetorId !== undefined) updatePayload.setorId = resolvedSetorId;
      if (resolvedCargoId !== undefined) updatePayload.cargoId = resolvedCargoId;
      if (status !== undefined) updatePayload.ativo = (status === 'Ativo' || status === true);

      await db.update(usuarios).set(updatePayload).where(eq(usuarios.id, userId));

      if (role) {
        const foundPerfil = await db.select().from(perfis).where(eq(perfis.nome, role));
        if (foundPerfil.length > 0) {
          await db.delete(usuarioPerfis).where(eq(usuarioPerfis.usuarioId, userId));
          await db.insert(usuarioPerfis).values({
            usuarioId: userId,
            perfilId: foundPerfil[0].id
          });
        }
      }

      res.json({ message: 'User updated successfully' });
    } catch (error: any) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const userId = req.params.id;
      await db.delete(usuarios).where(eq(usuarios.id, userId));
      res.json({ message: 'User deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== PERFIS E PERMISSÕES API ====================
  app.get("/api/roles", async (req, res) => {
    try {
      const allPerfis = await db.select().from(perfis);

      const formattedPerfis = await Promise.all(allPerfis.map(async (p) => {
        const userCountRes = await db.select().from(usuarioPerfis).where(eq(usuarioPerfis.perfilId, p.id));
        const permRes = await db.select({
          id: permissoes.id,
          chave: permissoes.chave,
          nome: permissoes.nome,
          modulo: permissoes.modulo
        })
        .from(perfilPermissoes)
        .innerJoin(permissoes, eq(perfilPermissoes.permissaoId, permissoes.id))
        .where(eq(perfilPermissoes.perfilId, p.id));

        return {
          id: p.id,
          name: p.nome,
          description: p.descricao,
          active: p.ativo,
          usersCount: userCountRes.length,
          permissions: permRes.map(perm => perm.id),
          permissionDetails: permRes
        };
      }));

      res.json(formattedPerfis);
    } catch (error: any) {
      console.error('Error getting roles:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/roles", async (req, res) => {
    try {
      const { name, description, active, permissions } = req.body;

      const inserted = await db.insert(perfis).values({
        nome: name,
        descricao: description,
        ativo: active !== false
      }).returning();

      const newPerfil = inserted[0];

      if (Array.isArray(permissions) && permissions.length > 0) {
        for (const permId of permissions) {
          await db.insert(perfilPermissoes).values({
            perfilId: newPerfil.id,
            permissaoId: permId
          });
        }
      }

      res.status(201).json({
        id: newPerfil.id,
        name: newPerfil.nome,
        description: newPerfil.descricao,
        active: newPerfil.ativo,
        usersCount: 0,
        permissions: permissions || []
      });
    } catch (error: any) {
      console.error('Error creating role:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/roles/:id", async (req, res) => {
    try {
      const roleId = req.params.id;
      const { name, description, active, permissions } = req.body;

      await db.update(perfis).set({
        nome: name,
        descricao: description,
        ativo: active !== undefined ? active : true,
        updatedAt: new Date()
      }).where(eq(perfis.id, roleId));

      if (Array.isArray(permissions)) {
        await db.delete(perfilPermissoes).where(eq(perfilPermissoes.perfilId, roleId));
        for (const permId of permissions) {
          await db.insert(perfilPermissoes).values({
            perfilId: roleId,
            permissaoId: permId
          });
        }
      }

      res.json({ message: 'Role updated successfully' });
    } catch (error: any) {
      console.error('Error updating role:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/roles/:id", async (req, res) => {
    try {
      const roleId = req.params.id;
      await db.delete(perfis).where(eq(perfis.id, roleId));
      res.json({ message: 'Role deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting role:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/permissions", async (req, res) => {
    try {
      const allPerms = await db.select().from(permissoes);
      res.json(allPerms);
    } catch (error: any) {
      console.error('Error getting permissions:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== SETORES E CARGOS API ====================
  app.get("/api/departments", async (req, res) => {
    try {
      const depsQuery = await pool.query(`
        SELECT s.id, s.nome, s.descricao, s.ativo, u.nome as gestor_nome
        FROM setores s
        LEFT JOIN usuarios u ON s.gestor_id = u.id
        ORDER BY s.nome
      `);
      const formatted = depsQuery.rows.map(d => ({
        id: d.id,
        name: d.nome,
        description: d.descricao || '',
        manager: d.gestor_nome || 'Não atribuído',
        status: d.ativo ? 'Ativo' : 'Inativo'
      }));
      res.json(formatted);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const resolveGestorId = async (managerName?: string) => {
    if (!managerName) return null;
    const found = await db.select().from(usuarios).where(eq(usuarios.nome, managerName));
    return found.length > 0 ? found[0].id : null;
  };

  app.post("/api/departments", async (req, res) => {
    try {
      const { name, description, manager, status } = req.body;
      const gestorId = await resolveGestorId(manager);
      const inserted = await db.insert(setores).values({
        nome: name,
        descricao: description,
        gestorId,
        ativo: status === undefined || status === 'Ativo' || status === true
      }).returning();
      res.status(201).json(inserted[0]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/departments/:id", async (req, res) => {
    try {
      const { name, description, manager, status } = req.body;
      const updatePayload: any = { updatedAt: new Date() };
      if (name !== undefined) updatePayload.nome = name;
      if (description !== undefined) updatePayload.descricao = description;
      if (manager !== undefined) updatePayload.gestorId = await resolveGestorId(manager);
      if (status !== undefined) updatePayload.ativo = (status === 'Ativo' || status === true);

      await db.update(setores).set(updatePayload).where(eq(setores.id, req.params.id));
      res.json({ message: 'Setor atualizado com sucesso' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/departments/:id", async (req, res) => {
    try {
      await db.delete(setores).where(eq(setores.id, req.params.id));
      res.json({ message: 'Setor removido com sucesso' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/cargos", async (req, res) => {
    try {
      const allCargos = await db.select().from(cargos);
      res.json(allCargos);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/cargos", async (req, res) => {
    try {
      const { name, description } = req.body;
      const inserted = await db.insert(cargos).values({
        nome: name,
        descricao: description
      }).returning();
      res.status(201).json(inserted[0]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Standard username/email + password login.
  // Includes a fixed fallback account (admin/admin) so the app stays usable
  // even before real users have a password set in the database.
  const FALLBACK_LOGIN = {
    identifier: 'admin',
    password: 'admin',
    user: {
      id: 'fallback-admin',
      name: 'Administrador (Fallback)',
      email: 'fallback@gran7.local',
      username: 'admin',
      role: 'Administrador',
      department: 'Geral',
      status: 'Ativo'
    }
  };

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { identifier, password } = req.body;
      if (!identifier || !password) {
        return res.status(400).json({ error: 'Informe usuário/e-mail e senha.' });
      }

      const idLower = String(identifier).trim().toLowerCase();

      if (idLower === FALLBACK_LOGIN.identifier && password === FALLBACK_LOGIN.password) {
        return res.json({ user: FALLBACK_LOGIN.user });
      }

      const userRows = await pool.query(
        `SELECT id, senha_hash, ativo FROM usuarios
         WHERE LOWER(email) = $1 OR LOWER(split_part(email, '@', 1)) = $1
         LIMIT 1`,
        [idLower]
      );

      if (userRows.rows.length === 0 || !userRows.rows[0].senha_hash) {
        return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
      }

      const row = userRows.rows[0];
      const passwordMatches = await bcrypt.compare(password, row.senha_hash);
      if (!passwordMatches) {
        return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
      }
      if (!row.ativo) {
        return res.status(403).json({ error: 'Usuário inativo.' });
      }

      const enrichedUser = await getEnrichedUser(row.id);
      res.json({ user: enrichedUser });
    } catch (error: any) {
      console.error('Error logging in:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Sync user from Firebase to DB
  app.post("/api/auth/sync", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid, email, name } = req.user!;

      const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS || "gransete.com,gran7.com.br")
        .split(",").map(d => d.trim().toLowerCase()).filter(Boolean);
      const emailDomain = (email || "").split("@")[1]?.toLowerCase();
      if (!emailDomain || !allowedDomains.includes(emailDomain)) {
        return res.status(403).json({ error: "Seu e-mail não pertence a um domínio autorizado a acessar o Gran7 OS." });
      }

      const dbUsers = await db.select().from(usuarios).where(eq(usuarios.uid, uid));
      let userId: string;

      if (dbUsers.length === 0) {
        const inserted = await db.insert(usuarios).values({
          uid,
          email: email || "",
          nome: name || email?.split("@")[0] || "Usuário",
        }).returning();
        userId = inserted[0].id;
      } else {
        userId = dbUsers[0].id;
      }

      const enrichedUser = await getEnrichedUser(userId);
      res.json({ user: enrichedUser });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== PROCESSOS API ====================
  const EXEC_TYPE_TO_DB: Record<string, string> = {
    'Multisetor (Tramita entre setores)': 'MULTISETOR',
    'Setorial (Restrito ao setor)': 'SETORIAL'
  };
  const EXEC_TYPE_FROM_DB: Record<string, string> = {
    MULTISETOR: 'Multisetor (Tramita entre setores)',
    SETORIAL: 'Setorial (Restrito ao setor)'
  };

  const formatProcessRow = (row: any) => {
    const config = row.configuracoes || {};
    return {
      id: row.id,
      name: row.nome,
      category: row.setor_nome || '',
      executionType: EXEC_TYPE_FROM_DB[row.tipo_execucao] || row.tipo_execucao,
      description: row.descricao || '',
      status: row.status === 'ATIVO' ? 'Ativo' : 'Inativo',
      fields: config.fields || [],
      steps: config.steps || [],
      notifyOnOpen: config.notifyOnOpen !== undefined ? config.notifyOnOpen : true,
      notifyOnStep: config.notifyOnStep !== undefined ? config.notifyOnStep : true
    };
  };

  app.get("/api/processes", async (req, res) => {
    try {
      const rows = await pool.query(`
        SELECT p.*, s.nome as setor_nome
        FROM processos p
        LEFT JOIN setores s ON p.setor_responsavel_id = s.id
        ORDER BY p.created_at DESC
      `);
      res.json(rows.rows.map(formatProcessRow));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/processes/:id", async (req, res) => {
    try {
      const rows = await pool.query(`
        SELECT p.*, s.nome as setor_nome
        FROM processos p
        LEFT JOIN setores s ON p.setor_responsavel_id = s.id
        WHERE p.id = $1
      `, [req.params.id]);
      if (rows.rows.length === 0) return res.status(404).json({ error: "Not found" });
      res.json(formatProcessRow(rows.rows[0]));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/processes", async (req, res) => {
    try {
      const { name, category, executionType, description, fields, steps, notifyOnOpen, notifyOnStep, status } = req.body;

      if (!category) {
        return res.status(400).json({ error: "Selecione um setor responsável válido." });
      }
      const foundSetor = await db.select().from(setores).where(eq(setores.nome, category));
      if (foundSetor.length === 0) {
        return res.status(400).json({ error: "Setor responsável não encontrado." });
      }

      const inserted = await db.insert(processos).values({
        nome: name,
        descricao: description || '',
        tipoExecucao: EXEC_TYPE_TO_DB[executionType] || 'SETORIAL',
        setorResponsavelId: foundSetor[0].id,
        status: (status === 'Inativo') ? 'INATIVO' : 'ATIVO',
        configuracoes: { fields: fields || [], steps: steps || [], notifyOnOpen: !!notifyOnOpen, notifyOnStep: !!notifyOnStep }
      }).returning();

      res.status(201).json(formatProcessRow({ ...inserted[0], setor_nome: category }));
    } catch (error: any) {
      console.error('Error creating process:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/processes/:id", async (req, res) => {
    try {
      const { name, category, executionType, description, fields, steps, notifyOnOpen, notifyOnStep, status } = req.body;

      const updatePayload: any = { updatedAt: new Date() };
      if (name !== undefined) updatePayload.nome = name;
      if (description !== undefined) updatePayload.descricao = description;
      if (executionType !== undefined) updatePayload.tipoExecucao = EXEC_TYPE_TO_DB[executionType] || 'SETORIAL';
      if (status !== undefined) updatePayload.status = (status === 'Inativo') ? 'INATIVO' : 'ATIVO';
      if (category !== undefined) {
        const foundSetor = await db.select().from(setores).where(eq(setores.nome, category));
        if (foundSetor.length === 0) {
          return res.status(400).json({ error: "Setor responsável não encontrado." });
        }
        updatePayload.setorResponsavelId = foundSetor[0].id;
      }
      if (fields !== undefined || steps !== undefined || notifyOnOpen !== undefined || notifyOnStep !== undefined) {
        const existing = await db.select().from(processos).where(eq(processos.id, req.params.id));
        if (existing.length === 0) return res.status(404).json({ error: "Not found" });
        const currentConfig: any = existing[0].configuracoes || {};
        updatePayload.configuracoes = {
          fields: fields !== undefined ? fields : (currentConfig.fields || []),
          steps: steps !== undefined ? steps : (currentConfig.steps || []),
          notifyOnOpen: notifyOnOpen !== undefined ? !!notifyOnOpen : (currentConfig.notifyOnOpen !== false),
          notifyOnStep: notifyOnStep !== undefined ? !!notifyOnStep : (currentConfig.notifyOnStep !== false)
        };
      }

      await db.update(processos).set(updatePayload).where(eq(processos.id, req.params.id));
      res.json({ message: 'Processo atualizado com sucesso' });
    } catch (error: any) {
      console.error('Error updating process:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/processes/:id", async (req, res) => {
    try {
      await db.delete(processos).where(eq(processos.id, req.params.id));
      res.json({ message: 'Processo removido com sucesso' });
    } catch (error: any) {
      if (error.code === '23503') {
        return res.status(409).json({ error: 'Este processo possui solicitações vinculadas e não pode ser excluído.' });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== SOLICITAÇÕES (REQUESTS) API ====================
  const REQUEST_STATUS_TO_DB: Record<string, string> = {
    'Em Análise': 'AGUARDANDO_APROVACAO',
    'Em Atendimento': 'EM_ANDAMENTO',
    'Concluído': 'CONCLUIDA',
    'Aprovado': 'CONCLUIDA',
    'Rejeitado': 'REPROVADA',
    'Cancelado': 'CANCELADA'
  };
  const REQUEST_STATUS_FROM_DB: Record<string, string> = {
    ABERTA: 'Em Análise',
    AGUARDANDO_APROVACAO: 'Em Análise',
    EM_ANDAMENTO: 'Em Atendimento',
    CONCLUIDA: 'Concluído',
    REPROVADA: 'Rejeitado',
    CANCELADA: 'Cancelado'
  };
  const REQUEST_FINISHED_DB_STATUSES = ['CONCLUIDA', 'REPROVADA', 'CANCELADA'];

  const formatDuration = (ms: number) => {
    const totalMinutes = Math.floor(ms / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    if (days > 0) return `${days} dia${days > 1 ? 's' : ''}, ${hours} hora${hours !== 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hora${hours !== 1 ? 's' : ''}`;
    return `${Math.max(totalMinutes, 0)} min`;
  };

  const formatRequestRow = (row: any) => ({
    id: row.id,
    protocol: row.protocolo,
    processId: row.processo_id,
    processName: row.processo_nome,
    category: row.setor_nome || '',
    requester: row.solicitante_nome,
    requesterDepartment: row.solicitante_setor_nome || '',
    attendant: row.atendente_nome || undefined,
    status: REQUEST_STATUS_FROM_DB[row.status] || 'Em Análise',
    date: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : '',
    completedDate: row.data_conclusao ? new Date(row.data_conclusao).toISOString().split('T')[0] : undefined,
    resolutionTime: row.data_conclusao ? formatDuration(new Date(row.data_conclusao).getTime() - new Date(row.created_at).getTime()) : undefined,
    step: row.etapa_atual_nome || '',
    formData: row.dados_dinamicos || {}
  });

  const REQUEST_LIST_QUERY = `
    SELECT s.*, p.nome as processo_nome, ps.nome as setor_nome,
           u.nome as solicitante_nome, us.nome as solicitante_setor_nome,
           a.nome as atendente_nome
    FROM solicitacoes s
    JOIN processos p ON s.processo_id = p.id
    LEFT JOIN setores ps ON p.setor_responsavel_id = ps.id
    JOIN usuarios u ON s.solicitante_id = u.id
    LEFT JOIN setores us ON u.setor_id = us.id
    LEFT JOIN usuarios a ON s.atendente_id = a.id
  `;

  app.get("/api/requests", async (req, res) => {
    try {
      const rows = await pool.query(`${REQUEST_LIST_QUERY} ORDER BY s.created_at DESC`);
      res.json(rows.rows.map(formatRequestRow));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/requests/:id", async (req, res) => {
    try {
      const rows = await pool.query(`${REQUEST_LIST_QUERY} WHERE s.id = $1`, [req.params.id]);
      if (rows.rows.length === 0) return res.status(404).json({ error: 'Not found' });

      const [historyRows, chatRows] = await Promise.all([
        pool.query(
          `SELECT h.id, h.acao, h.descricao, h.created_at, u.nome as usuario_nome
           FROM solicitacao_historico h
           LEFT JOIN usuarios u ON h.usuario_id = u.id
           WHERE h.solicitacao_id = $1 ORDER BY h.created_at ASC`,
          [req.params.id]
        ),
        pool.query(
          `SELECT m.id, m.mensagem, m.created_at, u.nome as usuario_nome
           FROM mensagens m
           JOIN conversas c ON m.conversa_id = c.id
           LEFT JOIN usuarios u ON m.usuario_id = u.id
           WHERE c.solicitacao_id = $1 ORDER BY m.created_at ASC`,
          [req.params.id]
        )
      ]);

      const formatted: any = formatRequestRow(rows.rows[0]);
      formatted.history = historyRows.rows.map(h => ({
        id: h.id, date: h.created_at, user: h.usuario_nome || 'Sistema', action: h.acao, description: h.descricao
      }));
      formatted.chat = chatRows.rows.map(m => ({
        id: m.id, date: m.created_at, user: m.usuario_nome || 'Usuário', message: m.mensagem
      }));
      formatted.attachments = [];

      res.json(formatted);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/requests", async (req, res) => {
    try {
      const { processId, formData, userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: 'Faça login com um usuário cadastrado no banco para abrir solicitações.' });
      }

      const procRows = await pool.query(`SELECT * FROM processos WHERE id = $1`, [processId]);
      if (procRows.rows.length === 0) return res.status(404).json({ error: 'Processo não encontrado.' });
      const config = procRows.rows[0].configuracoes || {};
      const steps = config.steps || [];
      const firstStep = steps[0];

      const year = new Date().getFullYear();
      const countRes = await pool.query(`SELECT COUNT(*)::int as count FROM solicitacoes WHERE protocolo LIKE $1`, [`REQ-${year}-%`]);
      const seq = String(countRes.rows[0].count + 1).padStart(3, '0');
      const protocolo = `REQ-${year}-${seq}`;

      const newRequestId: string = await db.transaction(async (tx) => {
        const inserted = await tx.insert(solicitacoes).values({
          protocolo,
          processoId: processId,
          solicitanteId: userId,
          etapaAtualNome: firstStep?.name || null,
          status: firstStep ? 'AGUARDANDO_APROVACAO' : 'CONCLUIDA',
          dadosDinamicos: formData || {},
          dataConclusao: firstStep ? null : new Date()
        }).returning();

        await tx.insert(solicitacaoHistorico).values({
          solicitacaoId: inserted[0].id,
          usuarioId: userId,
          acao: 'Abertura de Solicitação',
          descricao: 'A solicitação foi criada e encaminhada para a primeira etapa.'
        });

        return inserted[0].id;
      });

      res.status(201).json({ id: newRequestId, protocol: protocolo });
    } catch (error: any) {
      if (error.code === '23503' || error.code === '22P02') {
        return res.status(400).json({ error: 'Usuário solicitante inválido para o banco de dados. Faça login com uma conta cadastrada.' });
      }
      console.error('Error creating request:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/requests/:id", async (req, res) => {
    try {
      const { status, step, attendantId, formData, historyEvent } = req.body;
      const updatePayload: any = { updatedAt: new Date() };

      if (status !== undefined) {
        const dbStatus = REQUEST_STATUS_TO_DB[status];
        if (!dbStatus) return res.status(400).json({ error: 'Status inválido.' });
        updatePayload.status = dbStatus;
        if (REQUEST_FINISHED_DB_STATUSES.includes(dbStatus)) updatePayload.dataConclusao = new Date();
      }
      if (step !== undefined) updatePayload.etapaAtualNome = step;
      if (attendantId !== undefined) updatePayload.atendenteId = attendantId;
      if (formData !== undefined) updatePayload.dadosDinamicos = formData;

      await db.transaction(async (tx) => {
        await tx.update(solicitacoes).set(updatePayload).where(eq(solicitacoes.id, req.params.id));

        if (historyEvent) {
          await tx.insert(solicitacaoHistorico).values({
            solicitacaoId: req.params.id,
            usuarioId: historyEvent.userId || null,
            acao: historyEvent.action,
            descricao: historyEvent.description || ''
          });
        }
      });

      res.json({ message: 'Solicitação atualizada com sucesso' });
    } catch (error: any) {
      if (error.code === '22P02') {
        return res.status(400).json({ error: 'Usuário inválido para o banco de dados. Faça login com uma conta cadastrada.' });
      }
      console.error('Error updating request:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/requests/:id/messages", async (req, res) => {
    try {
      const { userId, message } = req.body;
      if (!userId || !message || !message.trim()) {
        return res.status(400).json({ error: 'Mensagem ou usuário ausente.' });
      }

      let convRows = await db.select().from(conversas).where(eq(conversas.solicitacaoId, req.params.id));
      let conversaId: string;
      if (convRows.length === 0) {
        const insertedConv = await db.insert(conversas).values({ solicitacaoId: req.params.id }).returning();
        conversaId = insertedConv[0].id;
      } else {
        conversaId = convRows[0].id;
      }

      await db.insert(mensagens).values({
        conversaId,
        usuarioId: userId,
        mensagem: message.trim()
      });

      res.status(201).json({ message: 'Mensagem enviada com sucesso' });
    } catch (error: any) {
      if (error.code === '22P02') {
        return res.status(400).json({ error: 'Usuário inválido para o banco de dados. Faça login com uma conta cadastrada.' });
      }
      console.error('Error sending message:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== TAREFAS (TASKS) API ====================
  const TASK_STATUS_TO_DB: Record<string, string> = {
    'Pendente': 'A_FAZER',
    'Em Andamento': 'EM_ANDAMENTO',
    'Concluído': 'CONCLUIDO'
  };
  const TASK_STATUS_FROM_DB: Record<string, string> = {
    A_FAZER: 'Pendente',
    EM_ANDAMENTO: 'Em Andamento',
    REVISAO: 'Em Andamento',
    CONCLUIDO: 'Concluído',
    CANCELADO: 'Concluído'
  };

  app.get("/api/tasks", async (req, res) => {
    try {
      const [taskRows, assignRows] = await Promise.all([
        pool.query(`
          SELECT t.*, s.nome as setor_nome
          FROM tarefas t
          LEFT JOIN setores s ON t.setor_id = s.id
          ORDER BY t.created_at DESC
        `),
        pool.query(`
          SELECT ta.tarefa_id, u.nome as usuario_nome
          FROM tarefa_atribuicoes ta
          JOIN usuarios u ON ta.usuario_id = u.id
        `)
      ]);

      const assigneesByTask: Record<string, string[]> = {};
      for (const r of assignRows.rows) {
        if (!assigneesByTask[r.tarefa_id]) assigneesByTask[r.tarefa_id] = [];
        assigneesByTask[r.tarefa_id].push(r.usuario_nome);
      }

      res.json(taskRows.rows.map(t => ({
        id: t.id,
        protocol: t.protocolo || '',
        processName: t.titulo,
        description: t.descricao || '',
        status: TASK_STATUS_FROM_DB[t.status] || 'Pendente',
        sla: t.sla_horas ? `${t.sla_horas}h` : '',
        department: t.setor_nome || '',
        assignee: assigneesByTask[t.id] || []
      })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const { processName, description, protocol, sla, status, assignees, department, userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: 'Faça login com um usuário cadastrado no banco para criar tarefas.' });
      }

      let setorId: string | null = null;
      if (department) {
        const foundSetor = await db.select().from(setores).where(eq(setores.nome, department));
        if (foundSetor.length > 0) setorId = foundSetor[0].id;
      }

      const slaHoras = sla ? (parseInt(sla, 10) || null) : null;

      const newTaskId: string = await db.transaction(async (tx) => {
        const inserted = await tx.insert(tarefas).values({
          titulo: processName,
          descricao: description || '',
          protocolo: protocol || null,
          criadorId: userId,
          setorId,
          slaHoras,
          status: TASK_STATUS_TO_DB[status] || 'A_FAZER'
        }).returning();

        if (Array.isArray(assignees) && assignees.length > 0) {
          const foundUsers = await tx.select().from(usuarios).where(inArray(usuarios.nome, assignees));
          for (const u of foundUsers) {
            await tx.insert(tarefaAtribuicoes).values({ tarefaId: inserted[0].id, usuarioId: u.id });
          }
        }

        return inserted[0].id;
      });

      res.status(201).json({ id: newTaskId });
    } catch (error: any) {
      if (error.code === '23503' || error.code === '22P02') {
        return res.status(400).json({ error: 'Usuário inválido para o banco de dados. Faça login com uma conta cadastrada.' });
      }
      console.error('Error creating task:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/tasks/:id", async (req, res) => {
    try {
      const { processName, description, protocol, sla, status, assignees, department } = req.body;
      const updatePayload: any = { updatedAt: new Date() };
      if (processName !== undefined) updatePayload.titulo = processName;
      if (description !== undefined) updatePayload.descricao = description;
      if (protocol !== undefined) updatePayload.protocolo = protocol;
      if (sla !== undefined) updatePayload.slaHoras = sla ? (parseInt(sla, 10) || null) : null;
      if (status !== undefined) {
        const dbStatus = TASK_STATUS_TO_DB[status] || 'A_FAZER';
        updatePayload.status = dbStatus;
        if (dbStatus === 'CONCLUIDO') updatePayload.dataConclusao = new Date();
      }
      if (department !== undefined) {
        if (department) {
          const foundSetor = await db.select().from(setores).where(eq(setores.nome, department));
          updatePayload.setorId = foundSetor.length > 0 ? foundSetor[0].id : null;
        } else {
          updatePayload.setorId = null;
        }
      }

      await db.transaction(async (tx) => {
        await tx.update(tarefas).set(updatePayload).where(eq(tarefas.id, req.params.id));

        if (assignees !== undefined) {
          await tx.delete(tarefaAtribuicoes).where(eq(tarefaAtribuicoes.tarefaId, req.params.id));
          if (Array.isArray(assignees) && assignees.length > 0) {
            const foundUsers = await tx.select().from(usuarios).where(inArray(usuarios.nome, assignees));
            for (const u of foundUsers) {
              await tx.insert(tarefaAtribuicoes).values({ tarefaId: req.params.id, usuarioId: u.id });
            }
          }
        }
      });

      res.json({ message: 'Tarefa atualizada com sucesso' });
    } catch (error: any) {
      console.error('Error updating task:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      await db.delete(tarefas).where(eq(tarefas.id, req.params.id));
      res.json({ message: 'Tarefa removida com sucesso' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== CONFIGURAÇÕES DO SISTEMA API ====================
  app.get("/api/settings", async (req, res) => {
    try {
      const rows = await db.select().from(configuracoesSistema);
      const settings: Record<string, any> = { emailNotifications: true, darkMode: false };
      for (const row of rows) {
        settings[row.chave] = row.valor;
      }
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/settings", async (req, res) => {
    try {
      const updates = req.body || {};
      for (const [chave, valor] of Object.entries(updates)) {
        await db.insert(configuracoesSistema)
          .values({ chave, valor: valor as any })
          .onConflictDoUpdate({ target: configuracoesSistema.chave, set: { valor: valor as any, updatedAt: new Date() } });
      }
      res.json({ message: 'Configurações atualizadas com sucesso' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== DOCUMENTOS (REPOSITÓRIO DE ARQUIVOS) API ====================
  app.get("/api/documents", async (req, res) => {
    try {
      const rows = await pool.query(`
        SELECT a.id, a.nome_arquivo, a.tipo_mime, a.tamanho_bytes, a.created_at, u.nome as autor_nome
        FROM arquivos a
        LEFT JOIN usuarios u ON a.autor_id = u.id
        ORDER BY a.created_at DESC
      `);
      res.json(rows.rows.map(r => ({
        id: r.id,
        name: r.nome_arquivo,
        type: (r.tipo_mime || '').split('/').pop()?.toUpperCase() || 'ARQUIVO',
        date: r.created_at,
        size: `${(r.tamanho_bytes / 1024).toFixed(2)} KB`,
        author: r.autor_nome || 'Desconhecido'
      })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/documents", upload.single('file'), async (req, res) => {
    try {
      const file = (req as any).file;
      const { userId } = req.body;
      if (!file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

      const inserted = await db.insert(arquivos).values({
        nomeArquivo: file.originalname,
        tipoMime: file.mimetype,
        tamanhoBytes: file.size,
        conteudo: file.buffer.toString('base64'),
        autorId: userId || null
      }).returning({ id: arquivos.id });

      res.status(201).json({ id: inserted[0].id });
    } catch (error: any) {
      if (error.code === '22P02') {
        return res.status(400).json({ error: 'Usuário inválido para o banco de dados. Faça login com uma conta cadastrada.' });
      }
      console.error('Error uploading document:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/documents/:id/download", async (req, res) => {
    try {
      const rows = await db.select().from(arquivos).where(eq(arquivos.id, req.params.id));
      if (rows.length === 0) return res.status(404).json({ error: 'Arquivo não encontrado.' });
      const file = rows[0];
      res.setHeader('Content-Type', file.tipoMime || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.nomeArquivo)}"`);
      res.send(Buffer.from(file.conteudo, 'base64'));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/documents/:id", async (req, res) => {
    try {
      await db.delete(arquivos).where(eq(arquivos.id, req.params.id));
      res.json({ message: 'Arquivo removido com sucesso' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== CHAT DIRETO (MENSAGENS ENTRE USUÁRIOS) API ====================
  app.get("/api/direct-messages/:otherUserId", async (req, res) => {
    try {
      const { userId } = req.query;
      const otherUserId = req.params.otherUserId;
      if (!userId) return res.status(400).json({ error: 'Parâmetro userId é obrigatório.' });

      const rows = await db.select().from(mensagensDiretas).where(
        or(
          and(eq(mensagensDiretas.remetenteId, userId as string), eq(mensagensDiretas.destinatarioId, otherUserId)),
          and(eq(mensagensDiretas.remetenteId, otherUserId), eq(mensagensDiretas.destinatarioId, userId as string))
        )
      ).orderBy(mensagensDiretas.createdAt);

      res.json(rows.map(r => ({
        id: r.id,
        senderId: r.remetenteId,
        receiverId: r.destinatarioId,
        content: r.conteudo,
        timestamp: r.createdAt
      })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/direct-messages", async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) return res.status(400).json({ error: 'Parâmetro userId é obrigatório.' });

      const rows = await db.select().from(mensagensDiretas).where(
        or(eq(mensagensDiretas.remetenteId, userId as string), eq(mensagensDiretas.destinatarioId, userId as string))
      ).orderBy(desc(mensagensDiretas.createdAt));

      res.json(rows.map(r => ({
        id: r.id,
        senderId: r.remetenteId,
        receiverId: r.destinatarioId,
        content: r.conteudo,
        timestamp: r.createdAt
      })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/direct-messages", async (req, res) => {
    try {
      const { senderId, receiverId, content } = req.body;
      if (!senderId || !receiverId || !content || !content.trim()) {
        return res.status(400).json({ error: 'Remetente, destinatário e conteúdo são obrigatórios.' });
      }
      const inserted = await db.insert(mensagensDiretas).values({
        remetenteId: senderId,
        destinatarioId: receiverId,
        conteudo: content.trim()
      }).returning();

      res.status(201).json({
        id: inserted[0].id,
        senderId: inserted[0].remetenteId,
        receiverId: inserted[0].destinatarioId,
        content: inserted[0].conteudo,
        timestamp: inserted[0].createdAt
      });
    } catch (error: any) {
      if (error.code === '23503' || error.code === '22P02') {
        return res.status(400).json({ error: 'Usuário inválido para o banco de dados. Faça login com uma conta cadastrada.' });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

