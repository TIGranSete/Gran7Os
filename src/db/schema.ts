import { relations } from 'drizzle-orm';
import { boolean, integer, jsonb, pgTable, serial, text, timestamp, uuid, varchar, primaryKey, bigint, numeric, date } from 'drizzle-orm/pg-core';

// MÓDULO 1: ORGANIZAÇÃO
export const setores = pgTable('setores', {
    id: uuid('id').primaryKey().defaultRandom(),
    nome: varchar('nome', { length: 100 }).notNull(),
    descricao: text('descricao'),
    setorPaiId: uuid('setor_pai_id').references((): any => setores.id),
    gestorId: uuid('gestor_id').references((): any => usuarios.id, { onDelete: 'set null' }),
    ativo: boolean('ativo').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const equipes = pgTable('equipes', {
    id: uuid('id').primaryKey().defaultRandom(),
    setorId: uuid('setor_id').notNull().references(() => setores.id, { onDelete: 'cascade' }),
    nome: varchar('nome', { length: 100 }).notNull(),
    descricao: text('descricao'),
    ativo: boolean('ativo').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const cargos = pgTable('cargos', {
    id: uuid('id').primaryKey().defaultRandom(),
    nome: varchar('nome', { length: 100 }).notNull().unique(),
    descricao: text('descricao'),
    ativo: boolean('ativo').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const usuarios = pgTable('usuarios', {
    id: uuid('id').primaryKey().defaultRandom(),
    uid: varchar('uid', { length: 255 }).notNull().unique(), // Firebase UID
    nome: varchar('nome', { length: 150 }).notNull(),
    email: varchar('email', { length: 150 }).notNull().unique(),
    senhaHash: varchar('senha_hash', { length: 255 }), // Can be null if using firebase auth
    cargoId: uuid('cargo_id').references(() => cargos.id, { onDelete: 'set null' }),
    setorId: uuid('setor_id').references(() => setores.id, { onDelete: 'set null' }),
    gestorId: uuid('gestor_id').references((): any => usuarios.id, { onDelete: 'set null' }),
    ativo: boolean('ativo').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const usuarioEquipes = pgTable('usuario_equipes', {
    usuarioId: uuid('usuario_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
    equipeId: uuid('equipe_id').notNull().references(() => equipes.id, { onDelete: 'cascade' }),
}, (t) => ({
    pk: primaryKey({ columns: [t.usuarioId, t.equipeId] }),
}));

// MÓDULO 2: SEGURANÇA & PERMISSÕES
export const perfis = pgTable('perfis', {
    id: uuid('id').primaryKey().defaultRandom(),
    nome: varchar('nome', { length: 50 }).notNull().unique(),
    descricao: text('descricao'),
    ativo: boolean('ativo').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const permissoes = pgTable('permissoes', {
    id: uuid('id').primaryKey().defaultRandom(),
    chave: varchar('chave', { length: 100 }).notNull().unique(),
    nome: varchar('nome', { length: 100 }).notNull(),
    modulo: varchar('modulo', { length: 50 }).notNull(),
    descricao: text('descricao'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const perfilPermissoes = pgTable('perfil_permissoes', {
    perfilId: uuid('perfil_id').notNull().references(() => perfis.id, { onDelete: 'cascade' }),
    permissaoId: uuid('permissao_id').notNull().references(() => permissoes.id, { onDelete: 'cascade' }),
}, (t) => ({
    pk: primaryKey({ columns: [t.perfilId, t.permissaoId] }),
}));

export const usuarioPerfis = pgTable('usuario_perfis', {
    usuarioId: uuid('usuario_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
    perfilId: uuid('perfil_id').notNull().references(() => perfis.id, { onDelete: 'cascade' }),
}, (t) => ({
    pk: primaryKey({ columns: [t.usuarioId, t.perfilId] }),
}));

// MÓDULO 3: CONFIGURAÇÃO DE PROCESSOS E WORKFLOWS
export const processos = pgTable('processos', {
    id: uuid('id').primaryKey().defaultRandom(),
    nome: varchar('nome', { length: 150 }).notNull(),
    descricao: text('descricao'),
    tipoExecucao: varchar('tipo_execucao', { length: 30 }).notNull(), // SETORIAL, MULTISETOR
    setorResponsavelId: uuid('setor_responsavel_id').notNull().references(() => setores.id, { onDelete: 'restrict' }),
    status: varchar('status', { length: 20 }).notNull().default('ATIVO'), // RASCUNHO, ATIVO, INATIVO
    configuracoes: jsonb('configuracoes'),
    criadoPor: uuid('criado_por').references(() => usuarios.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const processoCampos = pgTable('processo_campos', {
    id: uuid('id').primaryKey().defaultRandom(),
    processoId: uuid('processo_id').notNull().references(() => processos.id, { onDelete: 'cascade' }),
    nome: varchar('nome', { length: 60 }).notNull(),
    titulo: varchar('titulo', { length: 100 }).notNull(),
    tipo: varchar('tipo', { length: 30 }).notNull(), // texto, número, data, seleção, arquivo, checkbox
    obrigatorio: boolean('obrigatorio').notNull().default(false),
    ordem: integer('ordem').notNull().default(0),
    configuracao: jsonb('configuracao'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const processoCampoOpcoes = pgTable('processo_campo_opcoes', {
    id: uuid('id').primaryKey().defaultRandom(),
    processoCampoId: uuid('processo_campo_id').notNull().references(() => processoCampos.id, { onDelete: 'cascade' }),
    valor: varchar('valor', { length: 150 }).notNull(),
    rotulo: varchar('rotulo', { length: 150 }).notNull(),
    ordem: integer('ordem').notNull().default(0),
});

export const processoEtapas = pgTable('processo_etapas', {
    id: uuid('id').primaryKey().defaultRandom(),
    processoId: uuid('processo_id').notNull().references(() => processos.id, { onDelete: 'cascade' }),
    nome: varchar('nome', { length: 100 }).notNull(),
    descricao: text('descricao'),
    setorId: uuid('setor_id').references(() => setores.id, { onDelete: 'set null' }),
    ordem: integer('ordem').notNull().default(0),
    slaHoras: integer('sla_horas'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const processoEtapaResponsaveis = pgTable('processo_etapa_responsaveis', {
    id: uuid('id').primaryKey().defaultRandom(),
    processoEtapaId: uuid('processo_etapa_id').notNull().references(() => processoEtapas.id, { onDelete: 'cascade' }),
    tipoResponsavel: varchar('tipo_responsavel', { length: 20 }).notNull(), // USUARIO, EQUIPE
    usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'cascade' }),
    equipeId: uuid('equipe_id').references(() => equipes.id, { onDelete: 'cascade' }),
});

export const processoTransicoes = pgTable('processo_transicoes', {
    id: uuid('id').primaryKey().defaultRandom(),
    processoId: uuid('processo_id').notNull().references(() => processos.id, { onDelete: 'cascade' }),
    etapaOrigemId: uuid('etapa_origem_id').notNull().references(() => processoEtapas.id, { onDelete: 'cascade' }),
    etapaDestinoId: uuid('etapa_destino_id').notNull().references(() => processoEtapas.id, { onDelete: 'cascade' }),
    acao: varchar('acao', { length: 100 }).notNull(),
    condicaoJson: jsonb('condicao_json'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// MÓDULO 4: EXECUÇÃO DE PROCESSOS (SOLICITAÇÕES)
export const solicitacoes = pgTable('solicitacoes', {
    id: uuid('id').primaryKey().defaultRandom(),
    protocolo: varchar('protocolo', { length: 30 }).notNull().unique(),
    processoId: uuid('processo_id').notNull().references(() => processos.id, { onDelete: 'restrict' }),
    solicitanteId: uuid('solicitante_id').notNull().references(() => usuarios.id, { onDelete: 'restrict' }),
    etapaAtualId: uuid('etapa_atual_id').references(() => processoEtapas.id, { onDelete: 'set null' }),
    etapaAtualNome: varchar('etapa_atual_nome', { length: 150 }),
    atendenteId: uuid('atendente_id').references(() => usuarios.id, { onDelete: 'set null' }),
    status: varchar('status', { length: 30 }).notNull().default('ABERTA'), // ABERTA, EM_ANDAMENTO, AGUARDANDO_APROVACAO, CONCLUIDA, REPROVADA, CANCELADA
    prioridade: varchar('prioridade', { length: 15 }).notNull().default('MEDIA'), // BAIXA, MEDIA, ALTA, CRITICA
    dadosDinamicos: jsonb('dados_dinamicos').notNull().default({}),
    dataConclusao: timestamp('data_conclusao', { withTimezone: true }),
    slaLimite: timestamp('sla_limite', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const solicitacaoHistorico = pgTable('solicitacao_historico', {
    id: uuid('id').primaryKey().defaultRandom(),
    solicitacaoId: uuid('solicitacao_id').notNull().references(() => solicitacoes.id, { onDelete: 'cascade' }),
    usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'set null' }),
    acao: varchar('acao', { length: 100 }).notNull(),
    descricao: text('descricao').notNull(),
    metadados: jsonb('metadados'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const solicitacaoAnexos = pgTable('solicitacao_anexos', {
    id: uuid('id').primaryKey().defaultRandom(),
    solicitacaoId: uuid('solicitacao_id').notNull().references(() => solicitacoes.id, { onDelete: 'cascade' }),
    usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'set null' }),
    nomeArquivo: varchar('nome_arquivo', { length: 255 }).notNull(),
    urlArquivo: text('url_arquivo').notNull(),
    tipoMime: varchar('tipo_mime', { length: 100 }),
    tamanhoBytes: bigint('tamanho_bytes', { mode: 'number' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// MÓDULO 5: GESTÃO DE TAREFAS (ESTILO JIRA)
export const tarefas = pgTable('tarefas', {
    id: uuid('id').primaryKey().defaultRandom(),
    titulo: varchar('titulo', { length: 200 }).notNull(),
    descricao: text('descricao'),
    protocolo: varchar('protocolo', { length: 30 }),
    criadorId: uuid('criador_id').notNull().references(() => usuarios.id, { onDelete: 'restrict' }),
    responsavelId: uuid('responsavel_id').references(() => usuarios.id, { onDelete: 'set null' }),
    equipeId: uuid('equipe_id').references(() => equipes.id, { onDelete: 'set null' }),
    setorId: uuid('setor_id').references(() => setores.id, { onDelete: 'set null' }),
    slaHoras: integer('sla_horas'),
    status: varchar('status', { length: 25 }).notNull().default('A_FAZER'), // A_FAZER, EM_ANDAMENTO, REVISAO, CONCLUIDO, CANCELADO
    prioridade: varchar('prioridade', { length: 15 }).notNull().default('MEDIA'),
    prazo: timestamp('prazo', { withTimezone: true }),
    dataConclusao: timestamp('data_conclusao', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const tarefaAtribuicoes = pgTable('tarefa_atribuicoes', {
    tarefaId: uuid('tarefa_id').notNull().references(() => tarefas.id, { onDelete: 'cascade' }),
    usuarioId: uuid('usuario_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
}, (t) => ({
    pk: primaryKey({ columns: [t.tarefaId, t.usuarioId] }),
}));

export const tarefaChecklist = pgTable('tarefa_checklist', {
    id: uuid('id').primaryKey().defaultRandom(),
    tarefaId: uuid('tarefa_id').notNull().references(() => tarefas.id, { onDelete: 'cascade' }),
    item: text('item').notNull(),
    concluido: boolean('concluido').notNull().default(false),
    ordem: integer('ordem').notNull().default(0),
    atualizadoPor: uuid('atualizado_por').references(() => usuarios.id, { onDelete: 'set null' }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const tarefaComentarios = pgTable('tarefa_comentarios', {
    id: uuid('id').primaryKey().defaultRandom(),
    tarefaId: uuid('tarefa_id').notNull().references(() => tarefas.id, { onDelete: 'cascade' }),
    usuarioId: uuid('usuario_id').notNull().references(() => usuarios.id, { onDelete: 'set null' }),
    comentario: text('comentario').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// MÓDULO 6: COMUNICAÇÃO (CHAT CENTRALIZADO)
export const conversas = pgTable('conversas', {
    id: uuid('id').primaryKey().defaultRandom(),
    solicitacaoId: uuid('solicitacao_id').unique().references(() => solicitacoes.id, { onDelete: 'cascade' }),
    tarefaId: uuid('tarefa_id').unique().references(() => tarefas.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const mensagens = pgTable('mensagens', {
    id: uuid('id').primaryKey().defaultRandom(),
    conversaId: uuid('conversa_id').notNull().references(() => conversas.id, { onDelete: 'cascade' }),
    usuarioId: uuid('usuario_id').notNull().references(() => usuarios.id, { onDelete: 'set null' }),
    mensagem: text('mensagem').notNull(),
    metadados: jsonb('metadados'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// MÓDULO 7: GESTÃO VISUAL (KANBAN)
export const quadrosKanban = pgTable('quadros_kanban', {
    id: uuid('id').primaryKey().defaultRandom(),
    nome: varchar('nome', { length: 100 }).notNull(),
    descricao: text('descricao'),
    setorId: uuid('setor_id').references(() => setores.id, { onDelete: 'set null' }),
    criadoPor: uuid('criado_por').references(() => usuarios.id, { onDelete: 'set null' }),
    publico: boolean('publico').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const colunasKanban = pgTable('colunas_kanban', {
    id: uuid('id').primaryKey().defaultRandom(),
    quadroId: uuid('quadro_id').notNull().references(() => quadrosKanban.id, { onDelete: 'cascade' }),
    nome: varchar('nome', { length: 60 }).notNull(),
    ordem: integer('ordem').notNull().default(0),
    statusTarefaMapeado: varchar('status_tarefa_mapeado', { length: 25 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// MÓDULO 8: GESTÃO DE DOCUMENTOS (JURÍDICO & COMPLIANCE)
export const modelosDocumentos = pgTable('modelos_documentos', {
    id: uuid('id').primaryKey().defaultRandom(),
    nome: varchar('nome', { length: 150 }).notNull().unique(),
    descricao: text('descricao'),
    conteudoModelo: text('conteudo_modelo').notNull(),
    setorProprietarioId: uuid('setor_proprietario_id').references(() => setores.id, { onDelete: 'set null' }),
    versao: varchar('versao', { length: 10 }).notNull().default('1.0'),
    ativo: boolean('ativo').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const documentos = pgTable('documentos', {
    id: uuid('id').primaryKey().defaultRandom(),
    titulo: varchar('titulo', { length: 200 }).notNull(),
    solicitacaoId: uuid('solicitacao_id').references(() => solicitacoes.id, { onDelete: 'set null' }),
    modeloId: uuid('modelo_id').references(() => modelosDocumentos.id, { onDelete: 'set null' }),
    conteudo: text('conteudo').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('RASCUNHO'),
    criadoPor: uuid('criado_por').references(() => usuarios.id, { onDelete: 'set null' }),
    metaDados: jsonb('meta_dados'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const arquivos = pgTable('arquivos', {
    id: uuid('id').primaryKey().defaultRandom(),
    nomeArquivo: varchar('nome_arquivo', { length: 255 }).notNull(),
    tipoMime: varchar('tipo_mime', { length: 150 }),
    tamanhoBytes: bigint('tamanho_bytes', { mode: 'number' }).notNull(),
    conteudo: text('conteudo').notNull(), // base64-encoded file bytes
    autorId: uuid('autor_id').references(() => usuarios.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// MÓDULO 9: METRICAS E INDICADORES OPERACIONAIS
export const metas = pgTable('metas', {
    id: uuid('id').primaryKey().defaultRandom(),
    nome: varchar('nome', { length: 100 }).notNull(),
    setorId: uuid('setor_id').references(() => setores.id, { onDelete: 'cascade' }),
    usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'set null' }),
    valorAlvo: numeric('valor_alvo', { precision: 12, scale: 2 }).notNull(),
    tipoMetrica: varchar('tipo_metrica', { length: 50 }).notNull(),
    dataInicio: date('data_inicio').notNull(),
    dataFim: date('data_fim').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const indicadores = pgTable('indicadores', {
    id: uuid('id').primaryKey().defaultRandom(),
    nome: varchar('nome', { length: 100 }).notNull(),
    chaveIdentificadora: varchar('chave_identificadora', { length: 50 }).notNull().unique(),
    formulaCalculo: text('formula_calculo'),
    frequenciaAtualizacao: varchar('frequencia_atualizacao', { length: 20 }).default('DIARIA'),
    configuracaoGrafico: jsonb('configuracao_grafico'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// MÓDULO 10: AUDITORIA GLOBAL E INTEGRAÇÕES
export const auditoria = pgTable('auditoria', {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'set null' }),
    tabelaAlterada: varchar('tabela_alterada', { length: 60 }).notNull(),
    registroId: uuid('registro_id').notNull(),
    acao: varchar('acao', { length: 20 }).notNull(),
    dadosAntigos: jsonb('dados_antigos'),
    dadosNovos: jsonb('dados_novos'),
    ipOrigem: varchar('ip_origem', { length: 45 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// MÓDULO 11: CONFIGURAÇÕES DO SISTEMA
export const configuracoesSistema = pgTable('configuracoes_sistema', {
    chave: varchar('chave', { length: 60 }).primaryKey(),
    valor: jsonb('valor').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// MÓDULO 12: MENSAGENS DIRETAS (CHAT ENTRE USUÁRIOS)
export const mensagensDiretas = pgTable('mensagens_diretas', {
    id: uuid('id').primaryKey().defaultRandom(),
    remetenteId: uuid('remetente_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
    destinatarioId: uuid('destinatario_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
    conteudo: text('conteudo').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
