import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, Plus, Edit2, Trash2, X, Search, Shield, Building2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export interface UserItem {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
  department: string;
  status: 'Ativo' | 'Inativo';
  cargoId?: string;
  setorId?: string;
  password?: string;
}

export default function Users() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [cargos, setCargos] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { register, handleSubmit, reset } = useForm<UserItem>();

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, depsRes, rolesRes, cargosRes] = await Promise.all([
        fetch('/api/users').then(r => r.json()),
        fetch('/api/departments').then(r => r.json()),
        fetch('/api/roles').then(r => r.json()),
        fetch('/api/cargos').then(r => r.json())
      ]);

      if (Array.isArray(usersRes)) setUsers(usersRes);
      if (Array.isArray(depsRes)) setDepartments(depsRes);
      if (Array.isArray(rolesRes)) setRoles(rolesRes);
      if (Array.isArray(cargosRes)) setCargos(cargosRes);
    } catch (err: any) {
      console.error('Erro ao carregar dados de usuários:', err);
      showNotification('error', 'Falha ao carregar lista de usuários do banco de dados.');
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

  const openModal = (user?: UserItem) => {
    if (user) {
      setEditingUser(user);
      reset(user);
    } else {
      setEditingUser(null);
      reset({ status: 'Ativo', role: roles[0]?.name || 'Usuário', department: departments[0]?.name || '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    reset();
  };

  const onSubmit = async (data: UserItem) => {
    setSaving(true);
    try {
      if (editingUser) {
        const response = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Erro ao atualizar usuário');
        showNotification('success', 'Usuário atualizado com sucesso!');
      } else {
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Erro ao criar usuário');
        showNotification('success', 'Usuário cadastrado com sucesso!');
      }
      closeModal();
      await loadData();
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao salvar usuário.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao deletar usuário');
      showNotification('success', 'Usuário removido com sucesso!');
      await loadData();
    } catch (err: any) {
      showNotification('error', 'Erro ao excluir usuário.');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.username?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = !selectedDept || user.department === selectedDept;
    const matchesRole = !selectedRole || user.role === selectedRole;
    return matchesSearch && matchesDept && matchesRole;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] flex items-center gap-2 tracking-tight">
            <UsersIcon className="text-[var(--brand-text)]" size={26} />
            Cadastro de Usuários
          </h1>
          <p className="text-[var(--text-secondary)] text-xs mt-1">
            Gerencie os colaboradores, perfis e permissões de acesso integrados ao PostgreSQL.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={loadData}
            className="p-2.5 text-[var(--text-secondary)] hover:text-[var(--brand-text)] hover:bg-[var(--bg-surface-2)] rounded-lg transition-colors border border-[var(--border-color)] bg-[var(--bg-surface)]"
            title="Atualizar lista"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <Button onClick={() => openModal()}>
            <Plus size={18} className="mr-1.5" />
            Novo Usuário
          </Button>
        </div>
      </div>

      {/* Toast Notification */}
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

      {/* Filters Bar */}
      <Card className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome, email ou usuário..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[var(--bg-sunken)] border border-[var(--border-color)] rounded-lg text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:bg-[var(--bg-surface)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]/40 focus:border-[var(--brand-accent)] transition-all"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 bg-[var(--bg-sunken)] border border-[var(--border-color)] rounded-lg text-xs text-[var(--text-primary)] focus:bg-[var(--bg-surface)] focus:outline-none focus:border-[var(--brand-accent)]"
          >
            <option value="">Todos os Setores</option>
            {departments.map(d => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 bg-[var(--bg-sunken)] border border-[var(--border-color)] rounded-lg text-xs text-[var(--text-primary)] focus:bg-[var(--bg-surface)] focus:outline-none focus:border-[var(--brand-accent)]"
          >
            <option value="">Todos os Perfis</option>
            {roles.map(r => (
              <option key={r.id} value={r.name}>{r.name}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Users Table */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-[var(--text-secondary)] flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="animate-spin text-[var(--brand-text)]" size={28} />
            <p className="text-xs font-semibold">Carregando usuários do PostgreSQL...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-secondary)] space-y-2">
            <UsersIcon size={36} className="mx-auto text-[var(--text-muted)]" />
            <p className="text-base font-bold text-[var(--text-primary)]">Nenhum usuário encontrado</p>
            <p className="text-xs text-[var(--text-muted)]">Tente ajustar seus termos de busca ou filtros.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--border-color)]">
              <thead className="bg-[var(--bg-surface-2)]">
                <tr>
                  <th className="px-6 py-3.5 text-left text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider">Colaborador</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider">Login / E-mail</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider">Perfil de Acesso</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider">Setor</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3.5 text-right text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)] bg-[var(--bg-surface)]">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-[var(--brand-row-hover)] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-9 w-9 rounded-full bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] text-[var(--brand-soft-text)] font-black flex items-center justify-center text-sm shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-3">
                          <div className="text-xs font-bold text-[var(--text-primary)]">{user.name}</div>
                          <div className="text-[10px] text-[var(--text-muted)]">ID: {user.id.substring(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs font-semibold text-[var(--text-primary)]">{user.username || user.email.split('@')[0]}</div>
                      <div className="text-[11px] text-[var(--text-secondary)]">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--bg-surface-2)] text-[var(--text-primary)] border border-[var(--border-color)]">
                        <Shield size={12} className="mr-1.5 text-[var(--brand-text)]" />
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--bg-surface-2)] text-[var(--text-secondary)] border border-[var(--border-color)]">
                        <Building2 size={12} className="mr-1.5 text-[var(--text-muted)]" />
                        {user.department}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge tone={user.status === 'Ativo' ? 'brand' : 'neutral'}>{user.status}</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openModal(user)}
                        className="text-[var(--text-muted)] hover:text-[var(--brand-text)] p-1.5 rounded-md hover:bg-[var(--brand-soft)] transition-colors mr-1"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="text-[var(--text-muted)] hover:text-rose-600 p-1.5 rounded-md hover:bg-rose-50 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal User Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-surface-2)]">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                {editingUser ? 'Editar Colaborador' : 'Novo Colaborador'}
              </h3>
              <button onClick={closeModal} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  {...register('name', { required: true })}
                  placeholder="Ex: João da Silva"
                  className="w-full px-3.5 py-2 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-1 focus:ring-[var(--brand-accent)]/40 focus:border-[var(--brand-accent)] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">E-mail Corporativo</label>
                <input
                  type="email"
                  required
                  {...register('email', { required: true })}
                  placeholder="Ex: joao@gran7.com.br"
                  className="w-full px-3.5 py-2 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-1 focus:ring-[var(--brand-accent)]/40 focus:border-[var(--brand-accent)] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Nome de Usuário</label>
                  <input
                    type="text"
                    required
                    {...register('username', { required: true })}
                    placeholder="Ex: joao"
                    className="w-full px-3.5 py-2 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-1 focus:ring-[var(--brand-accent)]/40 focus:border-[var(--brand-accent)] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Senha de Acesso</label>
                  <input
                    type="password"
                    required={!editingUser}
                    {...register('password')}
                    placeholder={editingUser ? '(Sem alterar)' : '••••••••'}
                    className="w-full px-3.5 py-2 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-1 focus:ring-[var(--brand-accent)]/40 focus:border-[var(--brand-accent)] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Perfil de Acesso</label>
                  <select
                    {...register('role')}
                    className="w-full px-3.5 py-2 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--brand-accent)]/40 focus:border-[var(--brand-accent)] outline-none"
                  >
                    {roles.length > 0 ? (
                      roles.map(r => (
                        <option key={r.id} value={r.name}>{r.name}</option>
                      ))
                    ) : (
                      <>
                        <option value="Administrador">Administrador</option>
                        <option value="Gestor">Gestor</option>
                        <option value="Usuário">Usuário</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Setor / Departamento</label>
                  <select
                    required
                    {...register('department', { required: true })}
                    className="w-full px-3.5 py-2 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--brand-accent)]/40 focus:border-[var(--brand-accent)] outline-none"
                  >
                    <option value="">Selecione um setor...</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.name}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Status</label>
                <select
                  {...register('status')}
                  className="w-full px-3.5 py-2 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--brand-accent)]/40 focus:border-[var(--brand-accent)] outline-none"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-[var(--border-color)] mt-6">
                <Button type="button" variant="secondary" onClick={closeModal}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <RefreshCw size={14} className="animate-spin mr-1.5" />}
                  {editingUser ? 'Salvar Alterações' : 'Cadastrar Usuário'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
