import React, { useState, useEffect, useMemo } from 'react';
import { CheckSquare, Plus, X, Trash2, Clock, User as UserIcon, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

interface TaskRow {
  id: string;
  protocol: string;
  processName: string;
  description: string;
  status: string;
  sla: string;
  department: string;
  assignee: string[];
}

interface UserOption {
  id: string;
  name: string;
  department: string;
  role: string;
}

export default function Tasks() {
  const { user } = useAuth();
  const [allTasks, setAllTasks] = useState<TaskRow[]>([]);
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [viewFilter, setViewFilter] = useState<'TODAS' | 'MINHAS' | 'SETOR'>('TODAS');

  const [formData, setFormData] = useState({
    processName: '',
    description: '',
    protocol: '',
    sla: '',
    status: 'Pendente',
    assignees: [] as string[],
    department: user?.department || ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [tasksRes, usersRes] = await Promise.all([
        fetch('/api/tasks').then(r => r.json()),
        fetch('/api/users').then(r => r.json())
      ]);
      if (Array.isArray(tasksRes)) setAllTasks(tasksRes);
      if (Array.isArray(usersRes)) setAllUsers(usersRes);
    } catch (err) {
      console.error('Erro ao carregar tarefas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const assignableUsers = user?.role === 'Gestor'
    ? allUsers.filter(u => u && u.department === user.department)
    : allUsers;

  // Filter tasks safely according to selected filter
  const tasks = useMemo(() => {
    return allTasks.filter(task => {
      if (!task) return false;

      if (viewFilter === 'TODAS') return true;

      const taskAssignees = Array.isArray(task.assignee) ? task.assignee : [];

      const userName = (user?.name || '').toLowerCase();
      const userDept = (user?.department || '').toLowerCase();

      const isUserAssigned = taskAssignees.some(a => {
        if (!a) return false;
        const aLower = a.toLowerCase();
        return (userName && aLower.includes(userName)) || (userName && userName.includes(aLower));
      });

      const isDeptMatch = Boolean(userDept && task.department && task.department.toLowerCase() === userDept);

      if (viewFilter === 'SETOR') {
        return isDeptMatch || isUserAssigned || !task.department;
      }

      // Default 'MINHAS'
      return isUserAssigned || isDeptMatch || taskAssignees.length === 0;
    });
  }, [allTasks, viewFilter, user]);

  const columns = [
    { id: 'Pendente', title: 'A Fazer / Pendente', tone: 'warning' as const, dot: 'bg-amber-500' },
    { id: 'Em Andamento', title: 'Em Andamento', tone: 'info' as const, dot: 'bg-sky-500' },
    { id: 'Concluído', title: 'Concluído', tone: 'brand' as const, dot: 'bg-[var(--brand-accent)]' }
  ];

  const getColumnStatus = (status: string) => {
    if (!status) return 'Pendente';
    if (status === 'Em Andamento') return 'Em Andamento';
    if (status === 'Concluído') return 'Concluído';
    return 'Pendente';
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId) return;
    setAllTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: statusId } : t));
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: statusId })
    });
  };

  const openNewTaskModal = () => {
    setEditingTask(null);
    setFormError('');
    setFormData({
      processName: '',
      description: '',
      protocol: `TSK-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      sla: '24',
      status: 'Pendente',
      assignees: user?.name ? [user.name] : [],
      department: user?.department || ''
    });
    setIsModalOpen(true);
  };

  const openEditTaskModal = (task: TaskRow) => {
    setEditingTask(task);
    setFormError('');
    setFormData({
      processName: task.processName || '',
      description: task.description || '',
      protocol: task.protocol || '',
      sla: (task.sla || '').replace('h', ''),
      status: task.status || 'Pendente',
      assignees: Array.isArray(task.assignee) ? task.assignee : [],
      department: task.department || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || user.id === 'fallback-admin') {
      setFormError('O usuário de fallback não é uma conta real do banco. Faça login com um usuário cadastrado para criar/editar tarefas.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const payload = { ...formData, userId: user.id };
      const res = await fetch(editingTask ? `/api/tasks/${editingTask.id}` : '/api/tasks', {
        method: editingTask ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Erro ao salvar tarefa.');
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar tarefa.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (editingTask && window.confirm('Excluir esta tarefa?')) {
      await fetch(`/api/tasks/${editingTask.id}`, { method: 'DELETE' });
      setIsModalOpen(false);
      await loadData();
    }
  };

  const handleAssigneeToggle = (userName: string) => {
    setFormData(prev => {
      const current = prev.assignees;
      if (current.includes(userName)) {
        return { ...prev, assignees: current.filter(name => name !== userName) };
      } else {
        return { ...prev, assignees: [...current, userName] };
      }
    });
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto text-[var(--text-primary)] font-sans select-none">

      {/* Header Banner */}
      <Card className="md:flex md:items-center md:justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center space-x-2 text-[var(--brand-text)] text-[11px] font-extrabold uppercase tracking-wider">
            <CheckSquare size={14} />
            <span>Gestão Operacional & Kanban</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-[var(--text-primary)] tracking-tight">
            Quadro de Tarefas
          </h2>
          <p className="text-xs text-[var(--text-secondary)] max-w-xl">
            Arraste os cartões entre as colunas para atualizar a fase de execução em tempo real.
          </p>
        </div>

        {/* View Toggle & Actions */}
        <div className="mt-4 md:mt-0 flex items-center space-x-3 flex-wrap gap-y-2">

          {/* View Filter Switcher */}
          <div className="bg-[var(--bg-surface-2)] p-1 rounded-xl border border-[var(--border-color)] flex items-center space-x-1">
            <button
              onClick={() => setViewFilter('TODAS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewFilter === 'TODAS'
                  ? 'bg-[var(--brand-accent)] text-[var(--text-on-brand)] font-extrabold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setViewFilter('MINHAS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewFilter === 'MINHAS'
                  ? 'bg-[var(--brand-accent)] text-[var(--text-on-brand)] font-extrabold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Minhas
            </button>
            <button
              onClick={() => setViewFilter('SETOR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewFilter === 'SETOR'
                  ? 'bg-[var(--brand-accent)] text-[var(--text-on-brand)] font-extrabold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Setor
            </button>
          </div>

          <button
            onClick={loadData}
            className="p-2.5 text-[var(--text-secondary)] hover:text-[var(--brand-text)] hover:bg-[var(--bg-surface-2)] rounded-lg transition-colors border border-[var(--border-color)] bg-[var(--bg-surface)]"
            title="Atualizar dados"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          <Button onClick={openNewTaskModal}>
            <Plus size={16} strokeWidth={3} />
            <span>Nova Tarefa</span>
          </Button>
        </div>
      </Card>

      {/* Kanban Board Columns */}
      {loading ? (
        <div className="p-12 text-center text-[var(--text-secondary)] flex flex-col items-center justify-center space-y-3 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl">
          <RefreshCw className="animate-spin text-[var(--brand-text)]" size={28} />
          <p className="text-xs font-semibold">Carregando tarefas do banco de dados...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[500px]">
          {columns.map((column, colIdx) => {
            const colTasks = tasks.filter((t) => getColumnStatus(t.status) === column.id);
            return (
              <motion.div
                key={column.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: colIdx * 0.08 }}
                className="flex flex-col bg-[var(--bg-surface)] rounded-xl border border-[var(--border-color)] overflow-hidden min-h-[450px]"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                <div className="p-4 flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-surface-2)]">
                  <h3 className="font-extrabold text-xs text-[var(--text-primary)] uppercase tracking-wider flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full ${column.dot}`}></span>
                    <span>{column.title}</span>
                  </h3>
                  <Badge tone={column.tone}>{colTasks.length}</Badge>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                  {colTasks.map((task, idx) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: Math.min(idx * 0.05, 0.4) }}
                    >
                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onClick={() => openEditTaskModal(task)}
                        className="bg-[var(--bg-surface)] p-4 rounded-lg border border-[var(--border-color)] cursor-pointer hover:border-[var(--brand-soft-border)] hover:-translate-y-0.5 transition-all space-y-3 group"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-xs font-extrabold text-[var(--text-primary)] group-hover:text-[var(--brand-text)] transition-colors leading-tight">
                            {task.processName || 'Tarefa de Processo'}
                          </h4>
                          {task.protocol && (
                            <span className="text-[10px] font-mono text-[var(--brand-text)] bg-[var(--brand-soft)] px-2 py-0.5 rounded-lg border border-[var(--brand-soft-border)] flex-shrink-0">
                              {task.protocol}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                          {task.description || 'Sem descrição cadastrada.'}
                        </p>

                        {task.assignee.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {task.assignee.map((assigneeItem, idx2) => (
                              <span key={idx2} className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[var(--brand-soft)] text-[var(--brand-soft-text)] border border-[var(--brand-soft-border)]">
                                <UserIcon size={10} className="mr-1 text-[var(--brand-text)]" />
                                {assigneeItem}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[10px] text-[var(--text-muted)] italic">
                            Atribuído a: {task.department || 'Ninguém'}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)] text-[10px] text-[var(--text-muted)]">
                          <span className="flex items-center font-mono text-amber-600 font-bold">
                            <Clock size={11} className="mr-1" /> SLA: {task.sla || '—'}
                          </span>
                          {task.department && (
                            <span className="text-[var(--brand-text)] font-mono font-bold">
                              {task.department}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {colTasks.length === 0 && (
                    <div className="p-8 text-center border-2 border-dashed border-[var(--border-color)] rounded-xl text-[var(--text-muted)] text-xs">
                      Nenhuma tarefa nesta coluna
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Task Edit / Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-xl shadow-lg border border-[var(--border-color)] w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="flex justify-between items-center px-5 py-4 border-b border-[var(--border-color)] bg-[var(--bg-surface-2)]">
              <h2 className="text-xs font-extrabold text-[var(--text-primary)] uppercase tracking-wider flex items-center space-x-2">
                <CheckSquare size={16} className="text-[var(--brand-text)]" />
                <span>{editingTask ? 'Editar Tarefa Operacional' : 'Nova Tarefa Operacional'}</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs custom-scrollbar">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-medium">
                  {formError}
                </div>
              )}
              <form id="task-form" onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className="block font-bold text-[var(--text-secondary)] mb-1">Título / Processo *</label>
                  <input
                    type="text"
                    required
                    value={formData.processName}
                    onChange={e => setFormData({...formData, processName: e.target.value})}
                    placeholder="Ex: Análise de Solo ou Vistoria"
                    className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]/40 focus:border-[var(--brand-accent)]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[var(--text-secondary)] mb-1">Descrição das Ações</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Detalhes e orientações para a equipe..."
                    className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]/40 focus:border-[var(--brand-accent)]"
                  />
                </div>

                {assignableUsers.length > 0 && (
                  <div>
                    <label className="block font-bold text-[var(--text-secondary)] mb-1">Responsáveis Atribuídos</label>
                    <div className="max-h-48 overflow-y-auto bg-[var(--bg-sunken)] border border-[var(--border-color)] rounded-lg p-2 space-y-1 custom-scrollbar">
                      {assignableUsers.map(u => (
                        <label key={u.id} className="flex items-center space-x-2 p-1.5 hover:bg-[var(--bg-surface-2)] rounded-lg cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={formData.assignees.includes(u.name)}
                            onChange={() => handleAssigneeToggle(u.name)}
                            className="rounded border-[var(--border-color)] text-[var(--brand-accent)] focus:ring-[var(--brand-accent)] bg-[var(--bg-surface)]"
                          />
                          <span className="text-[var(--text-primary)] font-semibold">{u.name}</span>
                          <span className="text-[10px] text-[var(--text-muted)] ml-auto">({u.department})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[var(--text-secondary)] mb-1">Coluna / Status</label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value})}
                      className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-accent)]"
                    >
                      <option value="Pendente">A Fazer</option>
                      <option value="Em Andamento">Em Andamento</option>
                      <option value="Concluído">Concluído</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-[var(--text-secondary)] mb-1">SLA Estimado (horas)</label>
                    <input
                      type="number"
                      value={formData.sla}
                      onChange={e => setFormData({...formData, sla: e.target.value})}
                      placeholder="Ex: 24"
                      className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-accent)]"
                    />
                  </div>
                </div>
              </form>
            </div>

            <div className="px-5 py-3.5 bg-[var(--bg-surface-2)] border-t border-[var(--border-color)] flex justify-between items-center">
              {editingTask ? (
                <Button type="button" variant="danger" size="sm" onClick={handleDelete}>
                  <Trash2 size={13} />
                  <span>Excluir</span>
                </Button>
              ) : <div />}

              <div className="flex space-x-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" form="task-form" size="sm" disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar Tarefa'}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
