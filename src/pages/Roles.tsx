import React, { useState, useEffect } from 'react';
import { Shield, Plus, Edit2, Trash2, CheckCircle2, AlertCircle, RefreshCw, X, CheckSquare, Square, Lock, Users } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export interface Permission {
  id: string;
  chave: string;
  nome: string;
  modulo: string;
  descricao?: string;
}

export interface RoleItem {
  id: string;
  name: string;
  description: string;
  active: boolean;
  usersCount: number;
  permissions: string[];
  permissionDetails?: Permission[];
}

export default function Roles() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);

  // Form State
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        fetch('/api/roles').then(r => r.json()),
        fetch('/api/permissions').then(r => r.json())
      ]);

      if (Array.isArray(rolesRes)) setRoles(rolesRes);
      if (Array.isArray(permsRes)) setPermissions(permsRes);
    } catch (err: any) {
      console.error('Erro ao carregar perfis e permissões:', err);
      showNotification('error', 'Falha ao carregar perfis e permissões do banco de dados.');
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

  const openModal = (role?: RoleItem) => {
    if (role) {
      setEditingRole(role);
      setRoleName(role.name);
      setRoleDescription(role.description || '');
      setSelectedPermissions(role.permissions || []);
    } else {
      setEditingRole(null);
      setRoleName('');
      setRoleDescription('');
      setSelectedPermissions([]);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRole(null);
    setRoleName('');
    setRoleDescription('');
    setSelectedPermissions([]);
  };

  const togglePermission = (permId: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId]
    );
  };

  const toggleModulePermissions = (modulePerms: Permission[]) => {
    const modulePermIds = modulePerms.map(p => p.id);
    const allSelected = modulePermIds.every(id => selectedPermissions.includes(id));

    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(id => !modulePermIds.includes(id)));
    } else {
      setSelectedPermissions(prev => Array.from(new Set([...prev, ...modulePermIds])));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      showNotification('error', 'Informe o nome do perfil.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: roleName,
        description: roleDescription,
        active: true,
        permissions: selectedPermissions
      };

      if (editingRole) {
        const res = await fetch(`/api/roles/${editingRole.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Erro ao atualizar perfil');
        showNotification('success', 'Perfil atualizado com sucesso!');
      } else {
        const res = await fetch('/api/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Erro ao cadastrar perfil');
        showNotification('success', 'Novo perfil cadastrado com sucesso!');
      }

      closeModal();
      await loadData();
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao salvar perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (roleId: string, roleName: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o perfil "${roleName}"?`)) return;
    try {
      const res = await fetch(`/api/roles/${roleId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir perfil');
      showNotification('success', 'Perfil removido com sucesso!');
      await loadData();
    } catch (err: any) {
      showNotification('error', 'Erro ao excluir perfil.');
    }
  };

  // Group permissions by module
  const permissionsByModule = permissions.reduce((acc, perm) => {
    const mod = perm.modulo || 'Geral';
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] flex items-center gap-2 tracking-tight">
            <Shield className="text-[var(--brand-text)]" size={26} />
            Perfis e Permissões
          </h1>
          <p className="text-[var(--text-secondary)] text-xs mt-1">
            Gerencie perfis de acesso, niveis de autorização e matriz de permissões integrados ao PostgreSQL.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={loadData}
            className="p-2.5 text-[var(--text-secondary)] hover:text-[var(--brand-text)] hover:bg-[var(--bg-surface-2)] rounded-lg transition-colors border border-[var(--border-color)] bg-[var(--bg-surface)]"
            title="Atualizar dados"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <Button onClick={() => openModal()}>
            <Plus size={18} className="mr-1.5" />
            Novo Perfil
          </Button>
        </div>
      </div>

      {/* Notification Toast */}
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

      {/* Roles Grid */}
      {loading ? (
        <div className="p-12 text-center text-[var(--text-secondary)] flex flex-col items-center justify-center space-y-3 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl">
          <RefreshCw className="animate-spin text-[var(--brand-text)]" size={28} />
          <p className="text-xs font-semibold">Carregando perfis e permissões do banco de dados...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role) => (
            <Card key={role.id} hoverable className="flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className="h-12 w-12 rounded-xl bg-[var(--brand-soft)] text-[var(--brand-text)] flex items-center justify-center border border-[var(--brand-soft-border)]">
                  <Shield size={24} />
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => openModal(role)}
                    className="p-1.5 text-[var(--text-muted)] hover:text-[var(--brand-text)] hover:bg-[var(--brand-soft)] rounded-lg transition-colors"
                    title="Editar Perfil"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(role.id, role.name)}
                    className="p-1.5 text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Excluir Perfil"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">{role.name}</h3>
              <p className="text-xs text-[var(--text-secondary)] flex-1 mb-4 leading-relaxed">
                {role.description || 'Sem descrição cadastrada.'}
              </p>

              <div className="pt-4 border-t border-[var(--border-color)] mt-auto space-y-2">
                <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                  <span className="flex items-center text-[var(--text-secondary)] font-medium">
                    <Users size={14} className="mr-1.5 text-[var(--text-muted)]" />
                    Usuários vinculados
                  </span>
                  <span className="font-bold bg-[var(--bg-surface-2)] px-2 py-0.5 rounded-full text-[var(--text-primary)]">
                    {role.usersCount}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                  <span className="flex items-center text-[var(--text-secondary)] font-medium">
                    <Lock size={14} className="mr-1.5 text-[var(--text-muted)]" />
                    Permissões concedidas
                  </span>
                  <span className="font-bold bg-[var(--brand-soft)] px-2 py-0.5 rounded-full text-[var(--brand-soft-text)]">
                    {role.permissions?.length || 0}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Role Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-surface-2)]">
              <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Shield className="text-[var(--brand-text)]" size={20} />
                {editingRole ? `Editar Perfil: ${editingRole.name}` : 'Criar Novo Perfil'}
              </h3>
              <button onClick={closeModal} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form id="role-form" onSubmit={handleSave} className="overflow-y-auto p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                    Nome do Perfil
                  </label>
                  <input
                    type="text"
                    required
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="Ex: Supervisor Operacional, Gestor de TI"
                    className="w-full px-3.5 py-2 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-1 focus:ring-[var(--brand-accent)]/40 focus:border-[var(--brand-accent)] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                    Descrição
                  </label>
                  <textarea
                    rows={2}
                    value={roleDescription}
                    onChange={(e) => setRoleDescription(e.target.value)}
                    placeholder="Descreva as responsabilidades e autonomias deste perfil de acesso..."
                    className="w-full px-3.5 py-2 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-1 focus:ring-[var(--brand-accent)]/40 focus:border-[var(--brand-accent)] outline-none"
                  />
                </div>
              </div>

              {/* Permissions Checkboxes by Module */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
                  <h4 className="text-xs font-extrabold text-[var(--text-primary)] uppercase tracking-wider">
                    Matriz de Permissões de Acesso
                  </h4>
                  <span className="text-xs text-[var(--text-secondary)] font-medium">
                    {selectedPermissions.length} selecionada(s)
                  </span>
                </div>

                <div className="space-y-5">
                  {Object.entries(permissionsByModule).map(([moduleName, modulePerms]: [string, Permission[]]) => {
                    const allInModuleSelected = modulePerms.every(p => selectedPermissions.includes(p.id));

                    return (
                      <div key={moduleName} className="bg-[var(--bg-sunken)] border border-[var(--border-color)] rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3 border-b border-[var(--border-color)] pb-2">
                          <span className="text-xs font-bold text-[var(--brand-text)] uppercase tracking-wide flex items-center">
                            <Lock size={13} className="mr-1.5 text-[var(--brand-text)]" />
                            Módulo: {moduleName}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleModulePermissions(modulePerms)}
                            className="text-xs text-[var(--brand-text)] hover:underline font-semibold"
                          >
                            {allInModuleSelected ? 'Desmarcar todos' : 'Marcar todos'}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {modulePerms.map((perm) => {
                            const isChecked = selectedPermissions.includes(perm.id);

                            return (
                              <label
                                key={perm.id}
                                onClick={() => togglePermission(perm.id)}
                                className={`flex items-center p-2.5 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                                  isChecked
                                    ? 'bg-[var(--bg-surface)] border-[var(--brand-soft-border)] text-[var(--text-primary)] font-medium'
                                    : 'bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-2)]'
                                }`}
                              >
                                {isChecked ? (
                                  <CheckSquare size={16} className="text-[var(--brand-text)] mr-2.5 flex-shrink-0" />
                                ) : (
                                  <Square size={16} className="text-[var(--text-muted)] mr-2.5 flex-shrink-0" />
                                )}
                                <span>{perm.nome}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </form>

            {/* Actions Footer */}
            <div className="px-6 py-4 bg-[var(--bg-surface-2)] border-t border-[var(--border-color)] flex justify-end space-x-3">
              <Button type="button" variant="secondary" onClick={closeModal}>
                Cancelar
              </Button>
              <Button type="submit" form="role-form" disabled={saving}>
                {saving && <RefreshCw size={14} className="animate-spin mr-1.5" />}
                {editingRole ? 'Salvar Perfil' : 'Criar Perfil'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
