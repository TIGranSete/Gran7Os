import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Trash2, X, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

interface Department {
  id: string;
  name: string;
  description: string;
  manager: string;
  status: string;
}

interface UserOption {
  id: string;
  name: string;
  role: string;
}

export default function Organization() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [potentialManagers, setPotentialManagers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    manager: '',
    status: 'Ativo'
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [depsRes, usersRes] = await Promise.all([
        fetch('/api/departments').then(r => r.json()),
        fetch('/api/users').then(r => r.json())
      ]);
      if (Array.isArray(depsRes)) setDepartments(depsRes);
      if (Array.isArray(usersRes)) {
        setPotentialManagers(usersRes.filter((u: any) => u.role === 'Gestor' || u.role === 'Administrador'));
      }
    } catch (err) {
      console.error('Erro ao carregar organização:', err);
      showNotification('error', 'Falha ao carregar setores do banco de dados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleOpenModal = (department?: Department) => {
    if (department) {
      setEditingDepartment(department);
      setFormData({
        name: department.name,
        description: department.description,
        manager: department.manager === 'Não atribuído' ? '' : department.manager,
        status: department.status
      });
    } else {
      setEditingDepartment(null);
      setFormData({
        name: '',
        description: '',
        manager: '',
        status: 'Ativo'
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDepartment(null);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      if (editingDepartment) {
        const res = await fetch(`/api/departments/${editingDepartment.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (!res.ok) throw new Error('Erro ao atualizar setor');
        showNotification('success', 'Setor atualizado com sucesso!');
      } else {
        const res = await fetch('/api/departments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (!res.ok) throw new Error('Erro ao cadastrar setor');
        showNotification('success', 'Novo setor cadastrado com sucesso!');
      }
      handleCloseModal();
      await loadData();
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao salvar setor.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este setor?')) return;
    try {
      const res = await fetch(`/api/departments/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir setor');
      showNotification('success', 'Setor removido com sucesso!');
      await loadData();
    } catch (err: any) {
      showNotification('error', 'Erro ao excluir setor.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 font-sans select-none">
      <Card className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)]">Organização &amp; Setores</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">Gerencie a estrutura organizacional da Gran7 Nutrição e Fisiologia Vegetal.</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={loadData}
            className="p-2.5 text-[var(--text-secondary)] hover:text-[var(--brand-text)] hover:bg-[var(--bg-surface-2)] rounded-lg transition-colors border border-[var(--border-color)] bg-[var(--bg-surface)]"
            title="Atualizar dados"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <Button onClick={() => handleOpenModal()}>
            <Plus size={16} strokeWidth={3} className="mr-2" />
            Novo Setor
          </Button>
        </div>
      </Card>

      {notification && (
        <div className={`p-4 rounded-lg border text-xs font-semibold flex items-center justify-between ${
          notification.type === 'success'
            ? 'bg-[var(--brand-soft)] border-[var(--brand-soft-border)] text-[var(--brand-soft-text)]'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl overflow-hidden">
        <table className="min-w-full divide-y divide-[var(--border-color)]">
          <thead className="bg-[var(--bg-surface-2)]">
            <tr>
              <th className="px-6 py-3.5 text-left text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider">Setor</th>
              <th className="px-6 py-3.5 text-left text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider">Descrição</th>
              <th className="px-6 py-3.5 text-left text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider">Gestor</th>
              <th className="px-6 py-3.5 text-left text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider">Status</th>
              <th className="px-6 py-3.5 text-right text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)] bg-[var(--bg-surface)]">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-[var(--text-secondary)] text-xs font-semibold">
                  Carregando setores do banco de dados...
                </td>
              </tr>
            ) : (
              <>
                {departments.map((dept, index) => (
                  <motion.tr
                    key={dept.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.04, 0.3) }}
                    className="hover:bg-[var(--brand-row-hover)] transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-lg bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] text-[var(--brand-text)]">
                          <Building2 size={20} />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-[var(--text-primary)]">{dept.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-[var(--text-secondary)]">{dept.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-[var(--text-secondary)]">{dept.manager}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge tone={dept.status === 'Ativo' ? 'brand' : 'neutral'}>{dept.status}</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleOpenModal(dept)}
                        className="text-[var(--text-muted)] hover:text-[var(--brand-text)] p-1.5 rounded-lg hover:bg-[var(--brand-soft)] transition-colors mr-2"
                        title="Editar Setor"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(dept.id)}
                        className="text-[var(--text-muted)] hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Excluir Setor"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
                {departments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-[var(--text-muted)] text-sm">
                      Nenhum setor cadastrado.
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-lg w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-surface-2)]">
              <h3 className="text-lg font-black text-[var(--text-primary)]">
                {editingDepartment ? 'Editar Setor' : 'Novo Setor'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                  Nome do Setor <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]/40 focus:border-[var(--brand-accent)] text-sm font-medium"
                  placeholder="Ex: Recursos Humanos"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]/40 focus:border-[var(--brand-accent)] text-sm font-medium resize-none h-24"
                  placeholder="Descrição breve das responsabilidades do setor..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                  Gestor Responsável
                </label>
                <select
                  value={formData.manager}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]/40 focus:border-[var(--brand-accent)] text-sm font-medium"
                >
                  <option value="">Selecione um gestor...</option>
                  {potentialManagers.map(manager => (
                    <option key={manager.id} value={manager.name}>{manager.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]/40 focus:border-[var(--brand-accent)] text-sm font-medium"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-surface-2)] flex justify-end gap-3 shrink-0">
              <Button variant="secondary" onClick={handleCloseModal}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={!formData.name.trim() || saving}>
                {saving && <RefreshCw size={14} className="animate-spin mr-1.5" />}
                Salvar Setor
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
