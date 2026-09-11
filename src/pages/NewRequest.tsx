import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';

interface ProcessOption {
  id: string;
  name: string;
  category: string;
  status: string;
  fields: { id: string | number; name: string; type: string; required: boolean }[];
}

export default function NewRequest() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { register, handleSubmit, reset } = useForm();
  const [selectedProcessId, setSelectedProcessId] = useState<string>('');
  const [processes, setProcesses] = useState<ProcessOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/processes')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setProcesses(data); })
      .catch(err => console.error('Erro ao carregar processos:', err));
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const processId = searchParams.get('processId');
    if (processId) {
      setSelectedProcessId(processId);
    }
  }, [location.search]);

  const process = processes.find(p => p.id === selectedProcessId);

  const handleProcessChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProcessId(e.target.value);
    reset(); // Clear the form when changing process
  };

  const onSubmit = async (data: any) => {
    if (!process) return;
    if (!user?.id || user.id === 'fallback-admin') {
      setError('O usuário de fallback não é uma conta real do banco. Faça login com um usuário cadastrado para abrir solicitações.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processId: process.id, formData: data, userId: user.id })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Erro ao enviar solicitação.');
      }
      navigate('/requests');
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar solicitação.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 font-sans select-none">
      <div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-sm font-bold text-[var(--brand-text)] hover:opacity-80 mb-4 transition-opacity"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Voltar para Solicitações
        </button>
        <h2 className="text-2xl font-black leading-7 text-[var(--text-primary)] sm:text-3xl sm:truncate">
          Nova Solicitação
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Selecione o processo e preencha as informações necessárias
        </p>
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-8">
        <div className="mb-8">
          <label className="block text-sm font-bold text-[var(--text-primary)] mb-2">
            Selecione o Processo <span className="text-rose-600">*</span>
          </label>
          <select
            value={selectedProcessId}
            onChange={handleProcessChange}
            className="block w-full bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg py-3 px-4 focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]/40 focus:border-[var(--brand-accent)] text-sm font-medium"
          >
            <option value="">-- Selecione um processo --</option>
            {processes.filter(p => p.status === 'Ativo').map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.category || 'Geral'})
              </option>
            ))}
          </select>
        </div>

        {process && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 border-t border-[var(--border-color)] pt-8">

            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4 border-b border-[var(--border-color)] pb-2 flex items-center justify-between">
                <span>Informações do Formulário</span>
                <span className="text-xs font-mono font-bold text-[var(--brand-text)] bg-[var(--brand-soft)] px-3 py-1 rounded-full border border-[var(--brand-soft-border)]">
                  {process.name}
                </span>
              </h3>
              <div className="space-y-5">
                {process.fields.map(field => (
                  <div key={field.id}>
                    <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
                      {field.name} {field.required && <span className="text-rose-600">*</span>}
                    </label>

                    {field.type === 'textarea' ? (
                      <textarea
                        {...register(`field_${field.id}`, { required: field.required })}
                        rows={4}
                        className="block w-full bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg py-3 px-4 focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]/40 focus:border-[var(--brand-accent)] text-sm placeholder-[var(--text-muted)]"
                        placeholder={`Digite ${field.name.toLowerCase()}...`}
                      />
                    ) : field.type === 'select' ? (
                      <select
                        {...register(`field_${field.id}`, { required: field.required })}
                        className="block w-full bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg py-3 px-4 focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]/40 focus:border-[var(--brand-accent)] text-sm"
                      >
                        <option value="">Selecione uma opção</option>
                        <option value="opcao1">Opção 1</option>
                        <option value="opcao2">Opção 2</option>
                      </select>
                    ) : (
                      <input
                        type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : field.type === 'file' ? 'file' : 'text'}
                        {...register(`field_${field.id}`, { required: field.required })}
                        className="block w-full bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg py-3 px-4 focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]/40 focus:border-[var(--brand-accent)] text-sm placeholder-[var(--text-muted)]"
                        placeholder={`Digite ${field.name.toLowerCase()}...`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-medium">
                {error}
              </div>
            )}

            <div className="pt-6 flex items-center justify-between border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Cancelar
              </button>
              <div className="flex space-x-3">
                <Button type="submit" className="py-3 px-6 text-sm" disabled={submitting}>
                  {submitting ? 'Enviando...' : 'Enviar Solicitação'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
