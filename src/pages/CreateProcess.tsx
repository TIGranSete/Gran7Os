import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, Settings, List, GitBranch, UserCheck, ShieldCheck, Clock, Users, ArrowUp, ArrowDown } from 'lucide-react';
import { ProcessField, ProcessStep } from '../store';
import { motion } from 'motion/react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export default function CreateProcess() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [systemUsers, setSystemUsers] = useState<{ id: string; name: string; role: string; department: string }[]>([]);
  const [systemDepartments, setSystemDepartments] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState<'geral' | 'form' | 'workflow'>('geral');

  // State for form data
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [executionType, setExecutionType] = useState('Multisetor (Tramita entre setores)');
  const [description, setDescription] = useState('');

  // State for fields
  const [fields, setFields] = useState<ProcessField[]>([
    { id: 1, name: 'Data da Solicitação', type: 'date', required: true, conditional: false },
    { id: 2, name: 'Detalhamento do Pedido', type: 'textarea', required: true, conditional: false }
  ]);

  // State for workflow steps
  const [steps, setSteps] = useState<ProcessStep[]>([
    {
      id: 1,
      name: 'Aprovação Inicial do Gestor',
      responsible: 'Gestor Direto',
      assignedType: 'requester_manager',
      assignedUsers: [],
      assignedRoles: ['Gestor'],
      sla: 24,
      actionType: 'Aprovar / Rejeitar',
      businessRule: 'Sempre exigir',
      specialPermissions: 'Somente leitura',
      participantsAllowed: 'Todos os usuários',
      transitions: [{ id: 1, actionName: 'Aprovar', targetStepId: 2 }, { id: 2, actionName: 'Rejeitar', targetStepId: 'END' }]
    },
    {
      id: 2,
      name: 'Análise e Execução Técnica',
      responsible: '',
      assignedType: 'users',
      assignedUsers: [],
      sla: 48,
      actionType: 'Apenas Revisar',
      businessRule: 'Validar todos os campos',
      specialPermissions: 'Pode editar formulário',
      participantsAllowed: 'Apenas setor',
      transitions: [{ id: 3, actionName: 'Concluir', targetStepId: 'END' }]
    }
  ]);

  const [notifyOnOpen, setNotifyOnOpen] = useState(true);
  const [notifyOnStep, setNotifyOnStep] = useState(true);

  useEffect(() => {
    const loadReferenceData = async () => {
      const [usersRes, depsRes] = await Promise.all([
        fetch('/api/users').then(r => r.json()).catch(() => []),
        fetch('/api/departments').then(r => r.json()).catch(() => [])
      ]);
      if (Array.isArray(usersRes)) setSystemUsers(usersRes);
      if (Array.isArray(depsRes)) {
        setSystemDepartments(depsRes);
        setCategory(prev => prev || depsRes[0]?.name || '');
      }
    };

    const loadExisting = async () => {
      if (!id) return;
      const res = await fetch(`/api/processes/${id}`);
      if (!res.ok) return;
      const existingProcess = await res.json();
      setName(existingProcess.name);
      setCategory(existingProcess.category);
      setExecutionType(existingProcess.executionType);
      setDescription(existingProcess.description);
      setFields(existingProcess.fields || []);
      setSteps(existingProcess.steps || []);
      setNotifyOnOpen(existingProcess.notifyOnOpen);
      setNotifyOnStep(existingProcess.notifyOnStep);
    };

    Promise.all([loadReferenceData(), loadExisting()]).finally(() => setLoading(false));
  }, [id]);

  const handleAddField = () => {
    setFields([...fields, { id: Date.now(), name: '', type: 'text', required: false, conditional: false }]);
  };

  const handleRemoveField = (fieldId: string | number) => {
    setFields(fields.filter(f => f.id !== fieldId));
  };

  const handleAddStep = () => {
    const newStepId = Date.now();
    setSteps([
      ...steps,
      {
        id: newStepId,
        name: `Etapa ${steps.length + 1}`,
        responsible: 'Gestor Direto',
        assignedType: 'requester_manager',
        assignedUsers: [],
        sla: 24,
        actionType: 'Aprovar / Rejeitar',
        businessRule: 'Validar todos os campos',
        specialPermissions: 'Somente leitura',
        participantsAllowed: 'Todos os usuários',
        transitions: [{ id: Date.now() + 1, actionName: 'Concluir', targetStepId: 'END' }]
      }
    ]);
  };

  const handleRemoveStep = (stepId: string | number) => {
    setSteps(steps.filter(s => s.id !== stepId));
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === steps.length - 1)) {
      return;
    }
    const newSteps = [...steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIndex];
    newSteps[targetIndex] = temp;
    setSteps(newSteps);
  };

  const handleUpdateStep = (stepId: string | number, key: keyof ProcessStep, value: any) => {
    setSteps(steps.map(s => {
      if (s.id === stepId) {
        return { ...s, [key]: value };
      }
      return s;
    }));
  };

  const handleUserToggle = (stepId: string | number, userName: string) => {
    setSteps(steps.map(s => {
      if (s.id === stepId) {
        const currentUsers = s.assignedUsers || [];
        const updatedUsers = currentUsers.includes(userName)
          ? currentUsers.filter(u => u !== userName)
          : [...currentUsers, userName];

        return {
          ...s,
          assignedType: 'users',
          assignedUsers: updatedUsers,
          responsible: updatedUsers.length > 0 ? updatedUsers.join(', ') : 'Nenhum usuário atribuído'
        };
      }
      return s;
    }));
  };

  const handleRoleToggle = (stepId: string | number, roleName: string) => {
    setSteps(steps.map(s => {
      if (s.id === stepId) {
        const currentRoles = s.assignedRoles || [];
        const updatedRoles = currentRoles.includes(roleName)
          ? currentRoles.filter(r => r !== roleName)
          : [...currentRoles, roleName];

        return {
          ...s,
          assignedType: 'roles',
          assignedRoles: updatedRoles,
          responsible: updatedRoles.length > 0 ? `Cargo: ${updatedRoles.join(', ')}` : 'Nenhum cargo selecionado'
        };
      }
      return s;
    }));
  };

  const handleDeptToggle = (stepId: string | number, deptName: string) => {
    setSteps(steps.map(s => {
      if (s.id === stepId) {
        const currentDepts = s.assignedDepartments || [];
        const updatedDepts = currentDepts.includes(deptName)
          ? currentDepts.filter(d => d !== deptName)
          : [...currentDepts, deptName];

        return {
          ...s,
          assignedType: 'departments',
          assignedDepartments: updatedDepts,
          responsible: updatedDepts.length > 0 ? `Setor: ${updatedDepts.join(', ')}` : 'Nenhum setor selecionado'
        };
      }
      return s;
    }));
  };

  const handleAddTransition = (stepId: string | number) => {
    setSteps(steps.map(s => {
      if (s.id === stepId) {
        return {
          ...s,
          transitions: [...(s.transitions || []), { id: Date.now(), actionName: 'Aprovar', targetStepId: 'END' }]
        };
      }
      return s;
    }));
  };

  const handleUpdateTransition = (stepId: string | number, transitionId: string | number, key: string, value: any) => {
    setSteps(steps.map(s => {
      if (s.id === stepId) {
        return {
          ...s,
          transitions: (s.transitions || []).map(t => t.id === transitionId ? { ...t, [key]: value } : t)
        };
      }
      return s;
    }));
  };

  const handleRemoveTransition = (stepId: string | number, transitionId: string | number) => {
    setSteps(steps.map(s => {
      if (s.id === stepId) {
        return {
          ...s,
          transitions: (s.transitions || []).filter(t => t.id !== transitionId)
        };
      }
      return s;
    }));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Por favor, informe o nome do processo.');
      return;
    }
    if (!category) {
      alert('Selecione o setor responsável pelo processo.');
      return;
    }

    const processPayload = {
      name,
      category,
      executionType,
      description,
      fields,
      steps,
      notifyOnOpen,
      notifyOnStep,
      status: 'Ativo' as const
    };

    setSaving(true);
    try {
      const res = await fetch(id ? `/api/processes/${id}` : '/api/processes', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processPayload)
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Erro ao salvar processo.');
      }
      navigate('/processes');
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar processo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12 text-[var(--text-primary)] font-sans select-none">

      {/* Header Bar */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-[var(--bg-surface)] border border-[var(--border-color)] p-6 rounded-xl"
      >
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/processes')}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] rounded-lg transition-all border border-[var(--border-color)]"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center space-x-2 text-[var(--brand-text)] text-xs font-bold uppercase tracking-wider">
              <GitBranch size={14} />
              <span>Modelador de Processos & Workflows</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-[var(--text-primary)] tracking-tight">
              {id ? `Editar: ${name || 'Processo'}` : 'Novo Modelo de Processo'}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button variant="secondary" onClick={() => navigate('/processes')}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving || loading}>
            <Save size={16} strokeWidth={2.5} />
            <span>{saving ? 'Salvando...' : 'Salvar Modelo'}</span>
          </Button>
        </div>
      </motion.div>

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-color)] overflow-hidden flex flex-col md:flex-row min-h-[620px]"
      >

        {/* Navigation Tabs (Sidebar) */}
        <div className="w-full md:w-64 border-r border-[var(--border-color)] bg-[var(--bg-surface-2)] p-4 space-y-2 flex-shrink-0">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] px-3 py-1">
            Configuração do Fluxo
          </div>

          <button
            onClick={() => setActiveTab('geral')}
            className={`w-full flex items-center justify-between px-3.5 py-3 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'geral'
                ? 'bg-[var(--brand-accent)] text-[var(--text-on-brand)] font-extrabold'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] border border-transparent'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Settings size={16} />
              <span>Geral & Regras</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('form')}
            className={`w-full flex items-center justify-between px-3.5 py-3 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'form'
                ? 'bg-[var(--brand-accent)] text-[var(--text-on-brand)] font-extrabold'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] border border-transparent'
            }`}
          >
            <div className="flex items-center space-x-3">
              <List size={16} />
              <span>Formulário ({fields.length})</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('workflow')}
            className={`w-full flex items-center justify-between px-3.5 py-3 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'workflow'
                ? 'bg-[var(--brand-accent)] text-[var(--text-on-brand)] font-extrabold'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] border border-transparent'
            }`}
          >
            <div className="flex items-center space-x-3">
              <GitBranch size={16} />
              <span>Workflow & Etapas ({steps.length})</span>
            </div>
          </button>
        </div>

        {/* Content Panel */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar">

          {/* TAB 1: GERAL */}
          {activeTab === 'geral' && (
            <motion.div key="geral" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="border-b border-[var(--border-color)] pb-3">
                <h2 className="text-base font-extrabold text-[var(--text-primary)]">Informações Principais</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Defina a identificação, setor responsável e tipo de tramitação.</p>
              </div>

              <div className="space-y-4 max-w-2xl">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Nome do Processo *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ex: Solicitação de Férias ou Compra de Equipamentos"
                    className="w-full px-3.5 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--brand-accent)] transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Categoria / Setor</label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--brand-accent)]"
                    >
                      {systemDepartments.length === 0 && <option value="">Nenhum setor cadastrado</option>}
                      {systemDepartments.map(dept => (
                        <option key={dept.id} value={dept.name}>{dept.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Tipo de Tramitação</label>
                    <select
                      value={executionType}
                      onChange={e => setExecutionType(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--brand-accent)]"
                    >
                      <option value="Multisetor (Tramita entre setores)">Multisetor (Tramita entre setores)</option>
                      <option value="Setorial (Restrito ao setor)">Setorial (Restrito ao setor)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Descrição e Orientações</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Descreva a finalidade e orientações gerais deste fluxo..."
                    className="w-full px-3.5 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--brand-accent)]"
                  />
                </div>

                <div className="pt-4 border-t border-[var(--border-color)] space-y-3">
                  <h3 className="text-xs font-extrabold text-[var(--text-secondary)] uppercase tracking-wider">Notificações Automáticas</h3>

                  <label className="flex items-center space-x-3 cursor-pointer bg-[var(--bg-sunken)] p-3 rounded-lg border border-[var(--border-color)]">
                    <input
                      type="checkbox"
                      checked={notifyOnOpen}
                      onChange={(e) => setNotifyOnOpen(e.target.checked)}
                      className="rounded border-[var(--border-color)] text-[var(--brand-accent)] focus:ring-[var(--brand-accent)] bg-[var(--bg-surface)]"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-[var(--text-primary)] block">Notificar solicitante na abertura</span>
                      <span className="text-[var(--text-secondary)] text-[11px]">Envia email de confirmação com o protocolo gerado.</span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer bg-[var(--bg-sunken)] p-3 rounded-lg border border-[var(--border-color)]">
                    <input
                      type="checkbox"
                      checked={notifyOnStep}
                      onChange={(e) => setNotifyOnStep(e.target.checked)}
                      className="rounded border-[var(--border-color)] text-[var(--brand-accent)] focus:ring-[var(--brand-accent)] bg-[var(--bg-surface)]"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-[var(--text-primary)] block">Notificar responsáveis por etapa</span>
                      <span className="text-[var(--text-secondary)] text-[11px]">Avisa os usuários designados sempre que uma nova tarefa chegar à sua fila.</span>
                    </div>
                  </label>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: FORMULÁRIO */}
          {activeTab === 'form' && (
            <motion.div key="form" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <div>
                  <h2 className="text-base font-extrabold text-[var(--text-primary)]">Campos do Formulário de Entrada</h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">Configure os dados exigidos no momento da solicitação.</p>
                </div>
                <Button variant="primary" onClick={handleAddField}>
                  <Plus size={15} strokeWidth={3} />
                  <span>Adicionar Campo</span>
                </Button>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <motion.div
                    key={field.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.04, 0.3) }}
                    className="bg-[var(--bg-sunken)] border border-[var(--border-color)] p-4 rounded-xl flex flex-col md:flex-row gap-3 items-start md:items-center justify-between"
                  >
                    <div className="flex-1 w-full">
                      <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">Nome do Campo *</label>
                      <input
                        type="text"
                        placeholder="Ex: Data de Início, Justificativa, Anexo"
                        value={field.name}
                        onChange={(e) => setFields(fields.map(f => f.id === field.id ? { ...f, name: e.target.value } : f))}
                        className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--brand-accent)]"
                      />
                    </div>

                    <div className="w-full md:w-44">
                      <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">Tipo de Dado</label>
                      <select
                        value={field.type}
                        onChange={(e) => setFields(fields.map(f => f.id === field.id ? { ...f, type: e.target.value } : f))}
                        className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--brand-accent)]"
                      >
                        <option value="text">Texto Curto</option>
                        <option value="textarea">Texto Longo</option>
                        <option value="number">Número / Valor</option>
                        <option value="date">Data</option>
                        <option value="file">Anexo (Arquivo)</option>
                        <option value="select">Seleção (Lista)</option>
                      </select>
                    </div>

                    <div className="flex items-center space-x-4 md:pt-5">
                      <label className="flex items-center space-x-1.5 text-xs text-[var(--text-secondary)] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => setFields(fields.map(f => f.id === field.id ? { ...f, required: e.target.checked } : f))}
                          className="rounded border-[var(--border-color)] text-[var(--brand-accent)] focus:ring-[var(--brand-accent)] bg-[var(--bg-surface)]"
                        />
                        <span>Obrigatório</span>
                      </label>

                      <button
                        onClick={() => handleRemoveField(field.id)}
                        className="text-[var(--text-muted)] hover:text-rose-600 p-1 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* TAB 3: WORKFLOW & ETAPAS */}
          {activeTab === 'workflow' && (
            <motion.div key="workflow" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <div>
                  <h2 className="text-base font-extrabold text-[var(--text-primary)]">Etapas e Responsáveis do Workflow</h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">Crie a sequência do fluxo e atribua os usuários ou papéis responsáveis por cada decisão.</p>
                </div>

                <Button variant="primary" onClick={handleAddStep}>
                  <Plus size={15} strokeWidth={3} />
                  <span>Adicionar Etapa</span>
                </Button>
              </div>

              {/* Steps Timeline Stack */}
              <div className="space-y-4">
                {steps.map((step, index) => {
                  const currentAssignedType = step.assignedType || 'requester_manager';
                  const currentUsers = step.assignedUsers || [];
                  const currentRoles = step.assignedRoles || [];
                  const currentDepts = step.assignedDepartments || [];

                  return (
                    <motion.div
                      key={step.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.05, 0.3) }}
                      className="bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[var(--brand-soft-border)] rounded-xl p-5 transition-all space-y-4"
                    >
                      {/* Step Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--border-color)] pb-3.5 gap-3">
                        <div className="flex items-center space-x-3 flex-1">
                          <span className="w-8 h-8 rounded-lg bg-[var(--brand-accent)] text-[var(--text-on-brand)] font-extrabold text-xs flex items-center justify-center flex-shrink-0">
                            {index + 1}
                          </span>
                          <div className="flex-1">
                            <label className="block text-[10px] font-extrabold uppercase text-[var(--brand-text)] tracking-wider mb-0.5">
                              Nome da Etapa *
                            </label>
                            <input
                              type="text"
                              value={step.name}
                              onChange={(e) => handleUpdateStep(step.id, 'name', e.target.value)}
                              placeholder="Digite o nome da etapa (Ex: Aprovação do Gestor, Análise de Laboratório)..."
                              className="w-full bg-[var(--bg-surface-2)] text-sm font-extrabold text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[var(--brand-accent)] transition-all"
                            />
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center space-x-1.5 self-end sm:self-center">
                          <button
                            onClick={() => handleMoveStep(index, 'up')}
                            disabled={index === 0}
                            className="p-1.5 bg-[var(--bg-surface-2)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-all"
                            title="Mover para Cima"
                          >
                            <ArrowUp size={15} />
                          </button>
                          <button
                            onClick={() => handleMoveStep(index, 'down')}
                            disabled={index === steps.length - 1}
                            className="p-1.5 bg-[var(--bg-surface-2)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-all"
                            title="Mover para Baixo"
                          >
                            <ArrowDown size={15} />
                          </button>
                          {steps.length > 1 && (
                            <button
                              onClick={() => handleRemoveStep(step.id)}
                              className="p-1.5 bg-[var(--bg-surface-2)] border border-rose-200 text-[var(--text-secondary)] hover:text-rose-600 rounded-lg ml-1 transition-all"
                              title="Excluir Etapa"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Step Configuration Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                        {/* SLA */}
                        <div>
                          <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1 flex items-center">
                            <Clock size={12} className="mr-1 text-amber-600" />
                            <span>Prazo SLA (Horas)</span>
                          </label>
                          <input
                            type="number"
                            value={step.sla}
                            onChange={(e) => handleUpdateStep(step.id, 'sla', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-[var(--bg-surface-2)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--brand-accent)]"
                          />
                        </div>

                        {/* Action Type */}
                        <div>
                          <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1 flex items-center">
                            <ShieldCheck size={12} className="mr-1 text-[var(--brand-text)]" />
                            <span>Ação do Responsável</span>
                          </label>
                          <select
                            value={step.actionType}
                            onChange={(e) => handleUpdateStep(step.id, 'actionType', e.target.value)}
                            className="w-full px-3 py-2 bg-[var(--bg-surface-2)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--brand-accent)]"
                          >
                            <option value="Aprovar / Rejeitar">Aprovar / Rejeitar</option>
                            <option value="Apenas Revisar">Apenas Revisar</option>
                            <option value="Preencher Formulário">Preencher Formulário</option>
                            <option value="Executar Tarefa">Executar Tarefa Operacional</option>
                          </select>
                        </div>

                        {/* Assignment Mode */}
                        <div>
                          <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1 flex items-center">
                            <UserCheck size={12} className="mr-1 text-[var(--brand-text)]" />
                            <span>Tipo de Atribuição</span>
                          </label>
                          <select
                            value={currentAssignedType}
                            onChange={(e) => {
                              const newType = e.target.value as any;
                              handleUpdateStep(step.id, 'assignedType', newType);
                              if (newType === 'requester_manager') {
                                handleUpdateStep(step.id, 'responsible', 'Gestor Direto do Solicitante');
                              }
                            }}
                            className="w-full px-3 py-2 bg-[var(--bg-surface-2)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--brand-accent)]"
                          >
                            <option value="users">Usuário(s) Específico(s)</option>
                            <option value="requester_manager">Gestor Direto do Solicitante</option>
                            <option value="roles">Perfil / Cargo</option>
                            <option value="departments">Setor / Departamento</option>
                          </select>
                        </div>
                      </div>

                      {/* RESPONSÁVEIS SELECTION PANEL */}
                      <div className="bg-[var(--bg-surface-2)] p-4 rounded-xl border border-[var(--border-color)] space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-[var(--text-primary)] uppercase tracking-wider flex items-center">
                            <Users size={14} className="mr-1.5 text-[var(--brand-text)]" />
                            <span>Definição de Usuários Responsáveis para esta Etapa</span>
                          </span>

                          <Badge tone="brand">{step.responsible || 'Sem atribuição'}</Badge>
                        </div>

                        {/* If type === 'users' */}
                        {currentAssignedType === 'users' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                            {systemUsers.map(u => {
                              const isChecked = currentUsers.includes(u.name);
                              return (
                                <label
                                  key={u.id}
                                  className={`flex items-center space-x-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                                    isChecked
                                      ? 'bg-[var(--brand-soft)] border-[var(--brand-soft-border)] text-[var(--brand-soft-text)]'
                                      : 'bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-sunken)]'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleUserToggle(step.id, u.name)}
                                    className="rounded border-[var(--border-color)] text-[var(--brand-accent)] focus:ring-[var(--brand-accent)] bg-[var(--bg-surface)]"
                                  />
                                  <div className="text-xs truncate">
                                    <span className="font-extrabold block">{u.name}</span>
                                    <span className="text-[10px] text-[var(--text-muted)]">{u.role} - {u.department}</span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {/* If type === 'roles' */}
                        {currentAssignedType === 'roles' && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                            {['Gestor', 'Administrador', 'Usuário', 'Auditor'].map(role => {
                              const isChecked = currentRoles.includes(role);
                              return (
                                <label
                                  key={role}
                                  className={`flex items-center space-x-2 p-2 rounded-lg border cursor-pointer text-xs transition-all ${
                                    isChecked
                                      ? 'bg-[var(--brand-soft)] border-[var(--brand-soft-border)] text-[var(--brand-soft-text)] font-bold'
                                      : 'bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-sunken)]'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleRoleToggle(step.id, role)}
                                    className="rounded border-[var(--border-color)] text-[var(--brand-accent)] focus:ring-[var(--brand-accent)] bg-[var(--bg-surface)]"
                                  />
                                  <span>{role}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {/* If type === 'departments' */}
                        {currentAssignedType === 'departments' && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                            {systemDepartments.map(dept => {
                              const isChecked = currentDepts.includes(dept.name);
                              return (
                                <label
                                  key={dept.id}
                                  className={`flex items-center space-x-2 p-2 rounded-lg border cursor-pointer text-xs transition-all ${
                                    isChecked
                                      ? 'bg-[var(--brand-soft)] border-[var(--brand-soft-border)] text-[var(--brand-soft-text)] font-bold'
                                      : 'bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-sunken)]'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleDeptToggle(step.id, dept.name)}
                                    className="rounded border-[var(--border-color)] text-[var(--brand-accent)] focus:ring-[var(--brand-accent)] bg-[var(--bg-surface)]"
                                  />
                                  <span>{dept.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {/* If type === 'requester_manager' */}
                        {currentAssignedType === 'requester_manager' && (
                          <p className="text-xs text-[var(--text-secondary)] italic pt-1">
                            O sistema direcionará automaticamente esta etapa para o Gestor do setor do colaborador que abrir a solicitação.
                          </p>
                        )}
                      </div>

                      {/* Action Transitions / Next Step Routing */}
                      <div className="border-t border-[var(--border-color)] pt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider">
                            Decisões & Próximas Etapas
                          </label>
                          <button
                            onClick={() => handleAddTransition(step.id)}
                            className="text-xs font-bold text-[var(--brand-text)] hover:underline flex items-center"
                          >
                            <Plus size={13} className="mr-1" /> Add Transição
                          </button>
                        </div>

                        {(step.transitions || []).map(transition => (
                          <div key={transition.id} className="flex items-center gap-2 bg-[var(--bg-surface-2)] p-2.5 rounded-lg border border-[var(--border-color)]">
                            <input
                              type="text"
                              value={transition.actionName}
                              onChange={(e) => handleUpdateTransition(step.id, transition.id, 'actionName', e.target.value)}
                              placeholder="Nome do Botão (Ex: Aprovar, Rejeitar)"
                              className="flex-1 px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--brand-accent)]"
                            />
                            <span className="text-[var(--text-muted)] font-bold text-xs">→</span>
                            <select
                              value={transition.targetStepId}
                              onChange={(e) => handleUpdateTransition(step.id, transition.id, 'targetStepId', e.target.value)}
                              className="flex-1 px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--brand-accent)]"
                            >
                              <option value="END">Finalizar Processo (Concluir/Encerrar)</option>
                              {steps.map((s, idx) => s.id !== step.id && (
                                <option key={s.id} value={s.id}>Etapa {idx + 1}: {s.name}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleRemoveTransition(step.id, transition.id)}
                              className="text-[var(--text-muted)] hover:text-rose-600 p-1"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ))}
                      </div>

                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

        </div>
      </motion.div>

    </div>
  );
}
