import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ProcessField {
  id: string | number;
  name: string;
  type: string;
  required: boolean;
  conditional: boolean;
}

export interface ProcessTransition {
  id: string | number;
  actionName: string;
  targetStepId: string | number | 'END';
}

export interface ProcessStep {
  id: string | number;
  name: string;
  responsible: string;
  assignedUsers?: string[];
  assignedRoles?: string[];
  assignedDepartments?: string[];
  assignedType?: 'users' | 'roles' | 'departments' | 'requester_manager' | 'everyone';
  sla: number;
  actionType: string;
  businessRule: string;
  specialPermissions: string;
  participantsAllowed: string;
  transitions?: ProcessTransition[];
}

export interface Process {
  id: string | number;
  name: string;
  category: string;
  executionType: string;
  description: string;
  fields: ProcessField[];
  steps: ProcessStep[];
  notifyOnOpen: boolean;
  notifyOnStep: boolean;
  status: 'Ativo' | 'Inativo';
}

export interface RequestHistory {
  id: string | number;
  date: string;
  user: string;
  action: string;
  description: string;
}

export interface RequestMessage {
  id: string | number;
  date: string;
  user: string;
  message: string;
}

export interface RequestAttachment {
  id: string | number;
  name: string;
  url: string;
  size: string;
  date: string;
}

export interface Request {
  id: string | number;
  protocol: string;
  processId?: string | number;
  processName: string;
  category?: string;
  requester: string;
  requesterDepartment?: string;
  attendant?: string; // Quem está atendendo atualmente
  status: string; // 'Em Análise' | 'Em Atendimento' | 'Concluído' | 'Aprovado' | 'Rejeitado' | 'Cancelado'
  date: string;
  completedDate?: string;
  resolutionTime?: string; // Ex: '1 dia, 4 horas'
  step: string; // Etapa atual
  history?: RequestHistory[];
  chat?: RequestMessage[];
  attachments?: RequestAttachment[];
  formData?: Record<string, any>;
}

export interface Task {
  id: string | number;
  protocol: string;
  processId?: string | number;
  processName: string;
  description: string;
  status: string;
  sla: string;
  department?: string;
  assignee?: string | string[];
}

export interface User {
  id: string | number;
  name: string;
  email: string;
  username?: string;
  password?: string;
  role: string;
  department: string;
  status: string;
}

export interface Department {
  id: string | number;
  name: string;
  description: string;
  manager: string;
  status: string;
}

export interface Settings {
  emailNotifications: boolean;
  darkMode: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string | number;
  receiverId: string | number;
  content: string;
  timestamp: string;
}

export interface AppState {
  users: User[];
  processes: Process[];
  requests: Request[];
  tasks: Task[];
  departments: Department[];
  settings: Settings;
  chatMessages: ChatMessage[];
  addChatMessage: (message: ChatMessage) => void;
  addUser: (user: User) => void;
  updateUser: (id: string | number, user: Partial<User>) => void;
  deleteUser: (id: string | number) => void;
  addProcess: (process: Process) => void;
  updateProcess: (id: string | number, process: Partial<Process>) => void;
  deleteProcess: (id: string | number) => void;
  updateRequest: (id: string | number, request: Partial<Request>) => void;
  deleteRequest: (id: string | number) => void;
  addRequest: (request: Request) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string | number, task: Partial<Task>) => void;
  deleteTask: (id: string | number) => void;
  addDepartment: (department: Department) => void;
  updateDepartment: (id: string | number, department: Partial<Department>) => void;
  deleteDepartment: (id: string | number) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  restoreDefaultData: () => void;
}

const DEFAULT_PROCESSES: Process[] = [
  {
    id: 1,
    name: 'Solicitação de Férias',
    category: 'Recursos Humanos',
    executionType: 'Multisetor (Tramita entre setores)',
    description: 'Processo padrão para solicitação e aprovação de férias dos colaboradores.',
    status: 'Ativo',
    notifyOnOpen: true,
    notifyOnStep: true,
    fields: [
      { id: 1, name: 'Data de Início', type: 'date', required: true, conditional: false },
      { id: 2, name: 'Data de Fim', type: 'date', required: true, conditional: false }
    ],
    steps: [
      { 
        id: 1, 
        name: 'Aprovação do Gestor', 
        responsible: 'Caick Ferreira, Maria Souza', 
        assignedType: 'users',
        assignedUsers: ['Caick Ferreira', 'Maria Souza'],
        sla: 48, 
        actionType: 'Aprovar / Rejeitar', 
        businessRule: '', 
        specialPermissions: '', 
        participantsAllowed: 'Todos os usuários', 
        transitions: [{ id: 1, actionName: 'Aprovar', targetStepId: 2 }, { id: 2, actionName: 'Rejeitar', targetStepId: 'END' }] 
      },
      { 
        id: 2, 
        name: 'Lançamento RH', 
        responsible: 'Maria Souza (RH)', 
        assignedType: 'users',
        assignedUsers: ['Maria Souza'],
        assignedDepartments: ['Recursos Humanos'],
        sla: 24, 
        actionType: 'Apenas Revisar', 
        businessRule: '', 
        specialPermissions: '', 
        participantsAllowed: 'Apenas setor', 
        transitions: [{ id: 3, actionName: 'Concluir', targetStepId: 'END' }] 
      }
    ]
  },
  {
    id: 2,
    name: 'Compra de Equipamentos e Insumos',
    category: 'Compras',
    executionType: 'Multisetor (Tramita entre setores)',
    description: 'Aquisição de equipamentos de laboratório, TI, EPIs e ferramentas agrícolas.',
    status: 'Ativo',
    notifyOnOpen: true,
    notifyOnStep: true,
    fields: [
      { id: 1, name: 'Equipamento/Insumo', type: 'text', required: true, conditional: false },
      { id: 2, name: 'Quantidade e Especificações', type: 'textarea', required: true, conditional: false },
      { id: 3, name: 'Valor Estimado (R$)', type: 'number', required: false, conditional: false }
    ],
    steps: [
      { 
        id: 1, 
        name: 'Aprovação Técnica / TI', 
        responsible: 'João Silva, Caick Ferreira', 
        assignedType: 'users',
        assignedUsers: ['João Silva', 'Caick Ferreira'],
        sla: 24, 
        actionType: 'Aprovar / Rejeitar', 
        businessRule: '', 
        specialPermissions: '', 
        participantsAllowed: 'Todos os usuários', 
        transitions: [{ id: 1, actionName: 'Aprovar', targetStepId: 'END' }, { id: 2, actionName: 'Rejeitar', targetStepId: 'END' }] 
      }
    ]
  },
  {
    id: 3,
    name: 'Análise Nutricional de Solo e Folhas',
    category: 'Nutrição Vegetal',
    executionType: 'Setorial (Restrito ao setor)',
    description: 'Fluxo para coleta, envio de amostras ao laboratório e emissão de laudo de ferti-nutrição.',
    status: 'Ativo',
    notifyOnOpen: true,
    notifyOnStep: true,
    fields: [
      { id: 1, name: 'Nome da Fazenda / Talhão', type: 'text', required: true, conditional: false },
      { id: 2, name: 'Cultura Vegetal', type: 'text', required: true, conditional: false },
      { id: 3, name: 'Tipo de Análise', type: 'select', required: true, conditional: false }
    ],
    steps: [
      { 
        id: 1, 
        name: 'Triagem de Amostras', 
        responsible: 'Caick Ferreira', 
        assignedType: 'users',
        assignedUsers: ['Caick Ferreira'],
        sla: 12, 
        actionType: 'Apenas Revisar', 
        businessRule: '', 
        specialPermissions: '', 
        participantsAllowed: 'Todos os usuários', 
        transitions: [{ id: 1, actionName: 'Concluir', targetStepId: 'END' }] 
      }
    ]
  },
  {
    id: 4,
    name: 'Reembolso de Despesas de Campo',
    category: 'Financeiro',
    executionType: 'Multisetor (Tramita entre setores)',
    description: 'Prestação de contas e ressarcimento de combustível, hospedagem e alimentação técnicas.',
    status: 'Ativo',
    notifyOnOpen: true,
    notifyOnStep: true,
    fields: [
      { id: 1, name: 'Valor Total (R$)', type: 'number', required: true, conditional: false },
      { id: 2, name: 'Comprovantes de Viagem', type: 'file', required: true, conditional: false }
    ],
    steps: [
      { 
        id: 1, 
        name: 'Conferência de Notas', 
        responsible: 'Ana, Caick Ferreira', 
        assignedType: 'users',
        assignedUsers: ['Ana', 'Caick Ferreira'],
        sla: 24, 
        actionType: 'Aprovar / Rejeitar', 
        businessRule: '', 
        specialPermissions: '', 
        participantsAllowed: 'Todos os usuários', 
        transitions: [{ id: 1, actionName: 'Aprovar', targetStepId: 'END' }] 
      }
    ]
  }
];

export const DEFAULT_TASKS: Task[] = [
  {
    id: 1,
    protocol: 'REQ-2026-001',
    processName: 'Solicitação de Férias',
    description: 'Aprovar férias relativas ao período aquisitivo de Maria Souza',
    status: 'Pendente',
    sla: '24h',
    department: 'Recursos Humanos',
    assignee: ['Administrador', 'Caick', 'Maria Souza']
  },
  {
    id: 2,
    protocol: 'REQ-2026-002',
    processName: 'Compra de Equipamentos',
    description: 'Cotar kit de sensores de condutividade para estufa em Araguaia',
    status: 'Em Andamento',
    sla: '48h',
    department: 'Compras',
    assignee: ['Administrador', 'Caick', 'João Silva']
  },
  {
    id: 3,
    protocol: 'REQ-2026-003',
    processName: 'Análise Nutricional de Solo',
    description: 'Liberar recomendação de adubação nitrogenada para milho safrinha',
    status: 'Concluído',
    sla: '12h',
    department: 'Nutrição Vegetal',
    assignee: ['Administrador', 'Caick']
  },
  {
    id: 4,
    protocol: 'REQ-2026-004',
    processName: 'Reembolso de Despesas',
    description: 'Verificar cupons fiscais da visita técnica Regional Araguaia',
    status: 'Pendente',
    sla: '18h',
    department: 'Financeiro',
    assignee: ['Administrador', 'Caick', 'Ana']
  }
];

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      users: [
        { id: 1, name: 'Administrador', email: 'admin@granflow.com', username: 'admin', password: 'admin', role: 'Administrador', department: 'TI', status: 'Ativo' },
        { id: 2, name: 'Caick', email: 'caick9852@gmail.com', username: 'caick', password: 'password', role: 'Administrador', department: 'Tecnologia da Informação', status: 'Ativo' },
        { id: 3, name: 'João Silva', email: 'joao@exemplo.com', username: 'joao', password: 'password', role: 'Gestor', department: 'Compras', status: 'Ativo' },
        { id: 4, name: 'Maria Souza', email: 'maria@exemplo.com', username: 'maria', password: 'password', role: 'Usuário', department: 'Recursos Humanos', status: 'Ativo' },
      ],
      departments: [
        { id: 1, name: 'Tecnologia da Informação', description: 'TI', manager: 'Caick', status: 'Ativo' },
        { id: 2, name: 'Recursos Humanos', description: 'RH', manager: 'Maria', status: 'Ativo' },
        { id: 3, name: 'Compras', description: 'Suprimentos', manager: 'João', status: 'Ativo' },
        { id: 4, name: 'Financeiro', description: 'Financeiro', manager: 'Ana', status: 'Ativo' },
      ],
      processes: DEFAULT_PROCESSES,
      requests: [
        {
          id: 1,
          protocol: 'REQ-2026-001',
          processId: 1,
          processName: 'Solicitação de Férias',
          category: 'Recursos Humanos',
          requester: 'Maria Souza', 
          requesterDepartment: 'Recursos Humanos',
          attendant: 'Caick Ferreira',
          status: 'Em Atendimento', 
          date: '2026-07-20', 
          step: 'Aprovação do Gestor',
          history: [
            { id: 1, date: '2026-07-20 10:00', user: 'Maria Souza', action: 'Abertura', description: 'Solicitação enviada' },
            { id: 2, date: '2026-07-20 11:30', user: 'Caick Ferreira', action: 'Início Atendimento', description: 'Atendimento iniciado pelo Gestor' }
          ]
        },
        {
          id: 2,
          protocol: 'REQ-2026-002',
          processId: 2,
          processName: 'Compra de Equipamento',
          category: 'Compras',
          requester: 'João Silva', 
          requesterDepartment: 'Compras',
          attendant: 'Caick Ferreira',
          status: 'Em Análise', 
          date: '2026-07-19', 
          step: 'Aprovação Técnica / TI',
          history: [
            { id: 1, date: '2026-07-19 14:15', user: 'João Silva', action: 'Abertura', description: 'Cotar kit de sensores' }
          ]
        },
        {
          id: 3,
          protocol: 'REQ-2026-003',
          processId: 3,
          processName: 'Análise Nutricional de Solo',
          category: 'Nutrição Vegetal',
          requester: 'Caick', 
          requesterDepartment: 'Tecnologia da Informação',
          attendant: 'João Silva',
          status: 'Em Atendimento', 
          date: '2026-07-21', 
          step: 'Triagem de Amostras',
          history: [
            { id: 1, date: '2026-07-21 08:30', user: 'Caick', action: 'Abertura', description: 'Amostras de solo Fazenda Primavera' }
          ]
        },
        {
          id: 4,
          protocol: 'REQ-2026-004',
          processId: 4,
          processName: 'Reembolso de Despesas',
          category: 'Financeiro',
          requester: 'Administrador', 
          requesterDepartment: 'TI',
          attendant: 'Ana',
          status: 'Concluído', 
          date: '2026-07-15', 
          completedDate: '2026-07-16',
          resolutionTime: '1 dia, 2 horas',
          step: 'Finalizado',
          history: [
            { id: 1, date: '2026-07-15 09:00', user: 'Administrador', action: 'Abertura', description: 'Reembolso comprovantes viagem' },
            { id: 2, date: '2026-07-16 11:00', user: 'Ana', action: 'Conclusão', description: 'Pagamento aprovado e efetuado' }
          ]
        },
        {
          id: 5,
          protocol: 'REQ-2026-005',
          processId: 1,
          processName: 'Solicitação de Férias',
          category: 'Recursos Humanos',
          requester: 'Caick', 
          requesterDepartment: 'Tecnologia da Informação',
          attendant: 'Maria Souza',
          status: 'Concluído', 
          date: '2026-07-10', 
          completedDate: '2026-07-12',
          resolutionTime: '2 dias, 0 horas',
          step: 'Finalizado',
          history: [
            { id: 1, date: '2026-07-10 16:00', user: 'Caick', action: 'Abertura', description: 'Solicitação de 10 dias de férias' },
            { id: 2, date: '2026-07-12 16:00', user: 'Maria Souza', action: 'Conclusão', description: 'Férias lançadas no sistema' }
          ]
        },
        {
          id: 6,
          protocol: 'REQ-2026-006',
          processId: 2,
          processName: 'Compra de Equipamento',
          category: 'Compras',
          requester: 'Maria Souza', 
          requesterDepartment: 'Recursos Humanos',
          attendant: 'João Silva',
          status: 'Rejeitado', 
          date: '2026-07-08', 
          completedDate: '2026-07-09',
          resolutionTime: '18 horas',
          step: 'Finalizado',
          history: [
            { id: 1, date: '2026-07-08 11:00', user: 'Maria Souza', action: 'Abertura', description: 'Cadeira ergonômica extra' },
            { id: 2, date: '2026-07-09 05:00', user: 'João Silva', action: 'Rejeição', description: 'Fora do orçamento do trimestre' }
          ]
        }
      ],
      tasks: DEFAULT_TASKS,
      settings: {
        emailNotifications: true,
        darkMode: true,
      },
      chatMessages: [
        {
          id: '1',
          senderId: 1, // Admin
          receiverId: 2, // Caick
          content: 'Olá Caick, tudo bem? Vi sua solicitação recente.',
          timestamp: new Date(Date.now() - 3600000).toISOString()
        }
      ],
      restoreDefaultData: () => set(() => ({
        processes: DEFAULT_PROCESSES,
        tasks: DEFAULT_TASKS
      })),
      addChatMessage: (message) => set((state) => ({ chatMessages: [...state.chatMessages, message] })),
      addProcess: (process) => set((state) => ({ processes: [...(state.processes || []), process] })),
      updateProcess: (id, process) => set((state) => ({
        processes: (state.processes || []).map(p => p.id.toString() === id.toString() ? { ...p, ...process } : p)
      })),
      deleteProcess: (id) => set((state) => ({
        processes: (state.processes || []).filter(p => p.id.toString() !== id.toString())
      })),
      addRequest: (request) => set((state) => ({ requests: [request, ...(state.requests || [])] })),
      updateRequest: (id, request) => set((state) => ({
        requests: (state.requests || []).map(r => r.id.toString() === id.toString() ? { ...r, ...request } : r)
      })),
      deleteRequest: (id) => set((state) => ({
        requests: (state.requests || []).filter(r => r.id.toString() !== id.toString())
      })),
      addTask: (task) => set((state) => ({ tasks: [task, ...(state.tasks || [])] })),
      updateTask: (id, task) => set((state) => ({
        tasks: (state.tasks || []).map(t => t.id.toString() === id.toString() ? { ...t, ...task } : t)
      })),
      deleteTask: (id) => set((state) => ({
        tasks: (state.tasks || []).filter(t => t.id.toString() !== id.toString())
      })),
      addUser: (user) => set((state) => ({ users: [...(state.users || []), user] })),
      updateUser: (id, user) => set((state) => ({
        users: (state.users || []).map(u => u.id.toString() === id.toString() ? { ...u, ...user } : u)
      })),
      deleteUser: (id) => set((state) => ({
        users: (state.users || []).filter(u => u.id.toString() !== id.toString())
      })),
      addDepartment: (department) => set((state) => ({ departments: [...(state.departments || []), department] })),
      updateDepartment: (id, department) => set((state) => ({
        departments: (state.departments || []).map(d => d.id.toString() === id.toString() ? { ...d, ...department } : d)
      })),
      deleteDepartment: (id) => set((state) => ({
        departments: (state.departments || []).filter(d => d.id.toString() !== id.toString())
      })),
      updateSettings: (settings) => set((state) => ({
        settings: { ...state.settings, ...settings }
      })),
    }),
    {
      name: 'app-storage',
    }
  )
);
