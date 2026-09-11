import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function Settings() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [companyName, setCompanyName] = useState('Gran7 Gestão');
  const [cnpj, setCnpj] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (typeof data.emailNotifications === 'boolean') setEmailNotifications(data.emailNotifications);
        if (typeof data.companyName === 'string') setCompanyName(data.companyName);
        if (typeof data.cnpj === 'string') setCnpj(data.cnpj);
      })
      .catch(err => console.error('Erro ao carregar configurações:', err));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setNotice('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailNotifications, companyName, cnpj })
      });
      if (!res.ok) throw new Error('Erro ao salvar configurações.');
      setNotice('Configurações salvas com sucesso!');
    } catch (err: any) {
      setNotice(err.message || 'Erro ao salvar configurações.');
    } finally {
      setSaving(false);
      setTimeout(() => setNotice(''), 4000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Configurações</h1>
          <p className="text-[var(--text-secondary)] mt-1 text-sm">Ajustes gerais do sistema e preferências.</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save size={16} className="mr-2" />
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>

      {notice && (
        <div className="mb-4 p-3 bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] text-[var(--brand-soft-text)] rounded-lg text-xs font-medium">
          {notice}
        </div>
      )}

      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl">
        <div className="p-6 border-b border-[var(--border-color)]">
          <h2 className="text-base font-bold text-[var(--text-primary)] mb-4">Informações da Empresa</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Nome da Empresa</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]/40 focus:border-[var(--brand-accent)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">CNPJ</label>
              <input
                type="text"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="00.000.000/0001-00"
                className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]/40 focus:border-[var(--brand-accent)]"
              />
            </div>
          </div>
        </div>

        <div className="p-6">
          <h2 className="text-base font-bold text-[var(--text-primary)] mb-4">Preferências do Sistema</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)]">Notificações por Email</label>
                <p className="text-sm text-[var(--text-secondary)]">Enviar atualizações de solicitações por email.</p>
              </div>
              <button
                onClick={() => setEmailNotifications(v => !v)}
                className={`${emailNotifications ? 'bg-[var(--brand-accent)]' : 'bg-[var(--bg-surface-2)]'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]/40`}
              >
                <span className={`${emailNotifications ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[var(--bg-surface)] ring-0 transition duration-200 ease-in-out`}></span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
