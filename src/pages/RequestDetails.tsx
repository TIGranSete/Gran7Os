import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Paperclip, MessageSquare, Clock, FileText, CheckCircle, Save, XCircle, Info, Building2, UserRound, CalendarDays, Workflow, RefreshCw } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card } from '../components/ui/Card';
import { Badge, statusTone } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

interface ProcessTransition {
  id: string | number;
  actionName: string;
  targetStepId: string | number | 'END';
}

interface ProcessStep {
  id: string | number;
  name: string;
  responsible: string;
  assignedUsers?: string[];
  assignedRoles?: string[];
  assignedDepartments?: string[];
  assignedType?: 'users' | 'roles' | 'departments' | 'requester_manager' | 'everyone';
  sla: number;
  transitions?: ProcessTransition[];
}

interface ProcessDetail {
  id: string;
  name: string;
  steps: ProcessStep[];
}

interface RequestDetail {
  id: string;
  protocol: string;
  processId: string;
  processName: string;
  category?: string;
  requester: string;
  requesterDepartment?: string;
  attendant?: string;
  status: string;
  date: string;
  completedDate?: string;
  resolutionTime?: string;
  step: string;
  formData: Record<string, any>;
  history: { id: string; date: string; user: string; action: string; description: string }[];
  chat: { id: string; date: string; user: string; message: string }[];
  attachments: { id: string; name: string; url: string; size: string; date: string }[];
}

export default function RequestDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [process, setProcess] = useState<ProcessDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [actionError, setActionError] = useState('');

  const [activeTab, setActiveTab] = useState('dados');
  const [actionComment, setActionComment] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [savingForm, setSavingForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset } = useForm();

  const loadRequest = async () => {
    if (!id) return;
    const res = await fetch(`/api/requests/${id}`);
    if (!res.ok) {
      setNotFound(true);
      return;
    }
    const data: RequestDetail = await res.json();
    setRequest(data);
    reset(data.formData || {});

    if (data.processId) {
      const procRes = await fetch(`/api/processes/${data.processId}`);
      if (procRes.ok) {
        setProcess(await procRes.json());
      }
    }
  };

  useEffect(() => {
    setLoading(true);
    loadRequest().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // File storage integration is not wired yet — attachments require a backend upload endpoint.
    alert('O armazenamento de anexos ainda não está disponível. Em breve.');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-[var(--text-secondary)] flex flex-col items-center space-y-3">
        <RefreshCw className="h-6 w-6 animate-spin text-[var(--brand-text)]" />
        <span className="text-xs font-semibold">Carregando solicitação...</span>
      </div>
    );
  }

  if (notFound || !request) {
    return <div className="p-8 text-center text-[var(--text-secondary)]">Solicitação não encontrada</div>;
  }

  const hasPermission = () => {
    if (user?.role === 'Administrador' || user?.role === 'Auditor') return true;
    if (user?.role === 'Gestor') {
      return request.requesterDepartment === user.department || request.requester === user.name;
    }
    return request.requester === user?.name;
  };

  if (!hasPermission()) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-[var(--bg-surface)] rounded-xl border border-[var(--border-color)] m-8">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Acesso Negado</h2>
        <p className="text-[var(--text-secondary)]">Você não tem permissão para visualizar esta solicitação.</p>
      </div>
    );
  }

  const currentStep = process?.steps.find(s => s.name === request.step);

  const processSteps = process?.steps || [];
  const currentStepIndex = process ? process.steps.findIndex(s => s.name === request.step) : -1;
  const isFinished = ['Aprovado', 'Concluído', 'Rejeitado', 'Cancelado'].includes(request.status);
  const isRejectedFlow = ['Rejeitado', 'Cancelado'].includes(request.status);

  const getStepStatus = (index: number): 'done' | 'current' | 'rejected' | 'pending' => {
    if (isFinished && !isRejectedFlow) return 'done';
    if (isRejectedFlow) {
      if (currentStepIndex === -1) return index === processSteps.length - 1 ? 'rejected' : 'done';
      if (index < currentStepIndex) return 'done';
      if (index === currentStepIndex) return 'rejected';
      return 'pending';
    }
    if (currentStepIndex === -1) return 'pending';
    if (index < currentStepIndex) return 'done';
    if (index === currentStepIndex) return 'current';
    return 'pending';
  };

  const canApprove = () => {
    if (user?.role === 'Administrador') return true;

    // Requester cannot approve their own request unless Admin
    if (request.requester === user?.name && user?.role !== 'Administrador') {
      return false;
    }

    if (!currentStep) return true;

    if (currentStep.assignedUsers && currentStep.assignedUsers.length > 0) {
      if (user?.name && currentStep.assignedUsers.includes(user.name)) return true;
    }
    if (currentStep.assignedRoles && currentStep.assignedRoles.length > 0) {
      if (user?.role && currentStep.assignedRoles.includes(user.role)) return true;
    }
    if (currentStep.assignedDepartments && currentStep.assignedDepartments.length > 0) {
      if (user?.department && currentStep.assignedDepartments.includes(user.department)) return true;
    }
    if (currentStep.assignedType === 'requester_manager' || (currentStep.responsible && currentStep.responsible.toLowerCase().includes('gestor'))) {
      if (user?.role === 'Gestor' && user?.department === request.requesterDepartment) return true;
    }
    if (user?.name && currentStep.responsible && currentStep.responsible.includes(user.name)) return true;
    if (user?.role === 'Gestor') return true;

    return false;
  };

  const isRealDbUser = !!user?.id && user.id !== 'fallback-admin';

  const applyRequestUpdate = async (payload: any) => {
    if (!isRealDbUser) {
      setActionError('O usuário de fallback não é uma conta real do banco. Faça login com um usuário cadastrado para executar esta ação.');
      return;
    }
    setActionError('');
    const res = await fetch(`/api/requests/${request.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setActionError(body.error || 'Erro ao atualizar solicitação.');
      return;
    }
    await loadRequest();
  };

  const handleCustomAction = async (transition: ProcessTransition) => {
    if (!process) return;

    let newStatus = request.status;
    let newStep = request.step;

    if (transition.targetStepId === 'END') {
      newStatus = transition.actionName.toLowerCase().includes('rejeit') || transition.actionName.toLowerCase().includes('cancel') ? 'Rejeitado' : 'Aprovado';
    } else {
      const nextStep = process.steps.find(s => s.id.toString() === transition.targetStepId.toString());
      if (nextStep) {
        newStep = nextStep.name;
      } else {
        newStatus = 'Aprovado';
      }
    }

    await applyRequestUpdate({
      status: newStatus,
      step: newStep,
      historyEvent: {
        userId: user?.id,
        action: `Ação Executada: ${transition.actionName}`,
        description: actionComment ? `Comentário: ${actionComment}` : 'Executado sem justificativa.'
      }
    });
    setActionComment('');
  };

  const handleAction = async (actionType: 'Aprovar' | 'Rejeitar') => {
    if (!process) return;

    const stepIndex = process.steps.findIndex(s => s.name === request.step);
    let newStatus = request.status;
    let newStep = request.step;

    if (actionType === 'Rejeitar') {
      newStatus = 'Rejeitado';
    } else if (actionType === 'Aprovar') {
      if (stepIndex >= 0 && stepIndex < process.steps.length - 1) {
        newStep = process.steps[stepIndex + 1].name;
      } else {
        newStatus = 'Aprovado';
      }
    }

    await applyRequestUpdate({
      status: newStatus,
      step: newStep,
      historyEvent: {
        userId: user?.id,
        action: actionType === 'Aprovar' ? 'Etapa Aprovada' : 'Solicitação Rejeitada',
        description: actionComment ? `Comentário: ${actionComment}` : (actionType === 'Aprovar' ? 'Aprovado sem ressalvas.' : 'Rejeitado sem justificativa.')
      }
    });
    setActionComment('');
  };

  const onSubmit = async (data: any) => {
    setSavingForm(true);
    try {
      const res = await fetch(`/api/requests/${request.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData: data })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Erro ao salvar alterações.');
      }
      await loadRequest();
      alert('Alterações salvas com sucesso!');
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar alterações.');
    } finally {
      setSavingForm(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;
    if (!isRealDbUser) {
      setActionError('O usuário de fallback não é uma conta real do banco. Faça login com um usuário cadastrado para enviar mensagens.');
      return;
    }
    setSendingMessage(true);
    try {
      const res = await fetch(`/api/requests/${request.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, message: chatMessage.trim() })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Erro ao enviar mensagem.');
      }
      setChatMessage('');
      await loadRequest();
    } catch (err: any) {
      setActionError(err.message || 'Erro ao enviar mensagem.');
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <button
          onClick={() => navigate('/requests')}
          className="flex items-center text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Voltar para Solicitações
        </button>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">{request.protocol}</h1>
              <Badge tone={statusTone(request.status)}>{request.status}</Badge>
              {request.category && <Badge tone="neutral">{request.category}</Badge>}
            </div>
            <p className="text-[var(--text-secondary)] mt-1">
              {request.processName} • Solicitado por {request.requester}
              {' • '}
              {formatDistanceToNow(new Date(request.date), { addSuffix: true, locale: ptBR })}
            </p>
          </div>
          <div className="flex space-x-3">
            <Button variant="secondary" size="md" onClick={() => navigate('/requests')}>
              Cancelar
            </Button>
            <Button variant="primary" size="md" onClick={handleSubmit(onSubmit)} disabled={savingForm}>
              <Save className="h-4 w-4" /> {savingForm ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-medium">
          {actionError}
        </div>
      )}

      {processSteps.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide flex items-center">
              <Workflow className="h-4 w-4 mr-2 text-[var(--text-secondary)]" />
              Fluxo do Processo
            </h3>
            {process && <span className="text-xs text-[var(--text-secondary)] font-medium">{process.name}</span>}
          </div>
          <div className="flex items-start overflow-x-auto custom-scrollbar pb-1">
            {processSteps.map((step, index) => {
              const status = getStepStatus(index);
              return (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center text-center w-32 shrink-0 px-1">
                    <div
                      className={`relative h-9 w-9 rounded-full flex items-center justify-center border-2 shrink-0 ${
                        status === 'done'
                          ? 'bg-[var(--brand-accent)] border-[var(--brand-accent)] text-[var(--text-on-brand)]'
                          : status === 'current'
                          ? 'bg-[var(--bg-surface)] border-amber-400 text-amber-600'
                          : status === 'rejected'
                          ? 'bg-rose-50 border-rose-400 text-rose-600'
                          : 'bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-muted)]'
                      }`}
                    >
                      {status === 'current' && (
                        <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400/40 animate-ping" />
                      )}
                      {status === 'done' && <CheckCircle className="h-4 w-4" />}
                      {status === 'current' && <Clock className="h-4 w-4 relative" />}
                      {status === 'rejected' && <XCircle className="h-4 w-4" />}
                      {status === 'pending' && <span className="text-xs font-bold">{index + 1}</span>}
                    </div>
                    <p className={`mt-2 text-[11px] font-bold leading-tight ${status === 'pending' ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
                      {step.name}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate max-w-[128px]">{step.responsible}</p>
                    {status === 'current' && (
                      <span className="mt-1 text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                        SLA {step.sla}h
                      </span>
                    )}
                  </div>
                  {index < processSteps.length - 1 && (
                    <div
                      className={`h-0.5 mt-[18px] flex-1 min-w-[20px] ${
                        status === 'done' ? 'bg-[var(--brand-accent)]' : status === 'rejected' ? 'bg-rose-300' : 'bg-[var(--border-color)]'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </Card>
      )}

      {request.status === 'Em Análise' && canApprove() && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-xl p-6"
        >
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-900 flex items-center">
                Ação Pendente: {request.step}
              </h3>
              <p className="text-sm text-amber-700 mt-1">
                Esta solicitação está aguardando sua análise. Revise os dados e tome uma decisão.
              </p>

              <div className="mt-4">
                <label className="block text-sm font-medium text-amber-800 mb-1">
                  Comentário (opcional)
                </label>
                <textarea
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                  className="block w-full rounded-lg border-amber-300 focus:border-amber-500 focus:ring-amber-500 sm:text-sm p-2 border"
                  rows={2}
                  placeholder="Justifique sua decisão..."
                />
              </div>
            </div>

            <div className="flex flex-col space-y-3 shrink-0 pt-1 md:pt-0">
              {(currentStep?.transitions && currentStep.transitions.length > 0) ? (
                currentStep.transitions.map(transition => (
                  <button
                    key={transition.id}
                    onClick={() => handleCustomAction(transition)}
                    className={`w-full md:w-auto inline-flex justify-center items-center px-4 py-2 border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                      transition.actionName.toLowerCase().includes('rejeit') || transition.actionName.toLowerCase().includes('cancel')
                        ? 'border-[var(--border-color)] text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-2)] focus:ring-[var(--border-strong)]'
                        : 'border-transparent text-[var(--text-on-brand)] bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-hover)] focus:ring-[var(--brand-accent)]'
                    }`}
                  >
                    {transition.actionName}
                  </button>
                ))
              ) : (
                <>
                  <button
                    onClick={() => handleAction('Aprovar')}
                    className="w-full md:w-auto inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-[var(--text-on-brand)] bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--brand-accent)] transition-colors"
                  >
                    Aprovar Etapa
                  </button>
                  <button
                    onClick={() => handleAction('Rejeitar')}
                    className="w-full md:w-auto inline-flex justify-center items-center px-4 py-2 border border-[var(--border-color)] rounded-lg text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-2)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--border-strong)] transition-colors"
                  >
                    Rejeitar Solicitação
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl overflow-hidden">
            <div className="border-b border-[var(--border-color)]">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('dados')}
                  className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm flex justify-center items-center transition-colors ${
                    activeTab === 'dados' ? 'border-[var(--brand-accent)] text-[var(--brand-text)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <FileText className="h-4 w-4 mr-2" /> Dados
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm flex justify-center items-center transition-colors ${
                    activeTab === 'chat' ? 'border-[var(--brand-accent)] text-[var(--brand-text)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <MessageSquare className="h-4 w-4 mr-2" /> Chat
                </button>
                <button
                  onClick={() => setActiveTab('anexos')}
                  className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm flex justify-center items-center transition-colors ${
                    activeTab === 'anexos' ? 'border-[var(--brand-accent)] text-[var(--brand-text)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <Paperclip className="h-4 w-4 mr-2" /> Anexos
                </button>
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'dados' && (
                <form className="space-y-6">
                  {request.formData && Object.entries(request.formData).map(([key, value]: any) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                        {key.replace('field_', 'Campo ')}
                      </label>
                      <input
                        type="text"
                        {...register(key)}
                        className="block w-full border border-[var(--border-color)] rounded-lg py-2 px-3 bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]/40 focus:border-[var(--brand-accent)] sm:text-sm"
                      />
                    </div>
                  ))}
                  {(!request.formData || Object.keys(request.formData).length === 0) && (
                    <p className="text-sm text-[var(--text-secondary)]">Nenhum dado preenchido.</p>
                  )}
                </form>
              )}

              {activeTab === 'chat' && (
                <div className="space-y-4">
                  <div className="h-64 overflow-y-auto flex flex-col border border-[var(--border-color)] rounded-lg bg-[var(--bg-sunken)] p-4 gap-3 custom-scrollbar">
                    {(!request.chat || request.chat.length === 0) ? (
                      <div className="flex-1 flex items-center justify-center">
                        <p className="text-sm text-[var(--text-secondary)]">Nenhuma mensagem ainda.</p>
                      </div>
                    ) : (
                      request.chat.map((msg, i) => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.03, 0.3) }}
                          className="bg-[var(--bg-surface)] p-3 rounded-lg border border-[var(--border-color)]"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-sm text-[var(--text-primary)]">{msg.user}</span>
                            <span className="text-xs text-[var(--text-muted)]">{new Date(msg.date).toLocaleString()}</span>
                          </div>
                          <p className="text-sm text-[var(--text-secondary)]">{msg.message}</p>
                        </motion.div>
                      ))
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Escreva uma mensagem..."
                      className="flex-1 border border-[var(--border-color)] rounded-lg py-2 px-3 bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]/40 focus:border-[var(--brand-accent)] sm:text-sm"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      disabled={sendingMessage}
                    />
                    <Button variant="primary" size="md" onClick={handleSendMessage} disabled={sendingMessage}>
                      Enviar
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === 'anexos' && (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button variant="secondary" size="md" onClick={() => fileInputRef.current?.click()}>
                      <Paperclip className="h-4 w-4" />
                      Adicionar Anexo
                    </Button>
                  </div>

                  {(!request.attachments || request.attachments.length === 0) ? (
                    <div className="h-48 flex flex-col items-center justify-center border border-dashed border-[var(--border-color)] rounded-lg bg-[var(--bg-sunken)]">
                      <Paperclip className="h-8 w-8 text-[var(--text-muted)] mb-2" />
                      <p className="text-sm text-[var(--text-secondary)]">Nenhum anexo encontrado.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {request.attachments.map((attachment, i) => (
                        <motion.div
                          key={attachment.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.04, 0.3) }}
                          className="flex items-center justify-between p-3 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg hover:border-[var(--brand-soft-border)] transition-colors"
                        >
                          <div className="flex items-center space-x-3 overflow-hidden">
                            <div className="p-2 bg-[var(--bg-surface-2)] rounded-lg">
                              <FileText className="h-5 w-5 text-[var(--text-secondary)]" />
                            </div>
                            <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                              {attachment.name}
                            </span>
                          </div>
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--brand-text)] hover:underline text-sm font-medium shrink-0 ml-2"
                          >
                            Baixar
                          </a>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4 flex items-center">
              <Info className="h-5 w-5 mr-2 text-[var(--text-secondary)]" />
              Detalhes da Solicitação
            </h3>
            <dl className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <dt className="flex items-center text-[var(--text-secondary)]">
                  <UserRound className="h-3.5 w-3.5 mr-1.5 shrink-0" /> Solicitante
                </dt>
                <dd className="text-[var(--text-primary)] font-medium text-right">{request.requester}</dd>
              </div>
              {request.requesterDepartment && (
                <div className="flex items-start justify-between gap-3">
                  <dt className="flex items-center text-[var(--text-secondary)]">
                    <Building2 className="h-3.5 w-3.5 mr-1.5 shrink-0" /> Setor
                  </dt>
                  <dd className="text-[var(--text-primary)] font-medium text-right">{request.requesterDepartment}</dd>
                </div>
              )}
              {request.attendant && (
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-[var(--text-secondary)]">Atendente</dt>
                  <dd className="text-[var(--text-primary)] font-medium text-right">{request.attendant}</dd>
                </div>
              )}
              <div className="flex items-start justify-between gap-3">
                <dt className="flex items-center text-[var(--text-secondary)]">
                  <CalendarDays className="h-3.5 w-3.5 mr-1.5 shrink-0" /> Aberto em
                </dt>
                <dd className="text-[var(--text-primary)] font-medium text-right">
                  {new Date(request.date).toLocaleDateString('pt-BR')}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-[var(--text-secondary)]">Etapa Atual</dt>
                <dd className="text-[var(--text-primary)] font-medium text-right">{request.step}</dd>
              </div>
              {currentStep && !isFinished && (
                <div className="flex items-start justify-between gap-3">
                  <dt className="flex items-center text-[var(--text-secondary)]">
                    <Clock className="h-3.5 w-3.5 mr-1.5 shrink-0" /> SLA da Etapa
                  </dt>
                  <dd className="text-[var(--text-primary)] font-medium text-right">{currentStep.sla}h</dd>
                </div>
              )}
              {request.completedDate && (
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-[var(--text-secondary)]">Concluído em</dt>
                  <dd className="text-[var(--text-primary)] font-medium text-right">
                    {new Date(request.completedDate).toLocaleDateString('pt-BR')}
                  </dd>
                </div>
              )}
              {request.resolutionTime && (
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-[var(--text-secondary)]">Tempo de Resolução</dt>
                  <dd className="text-[var(--text-primary)] font-medium text-right">{request.resolutionTime}</dd>
                </div>
              )}
            </dl>
          </Card>

          <Card>
            <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4 flex items-center">
              <Clock className="h-5 w-5 mr-2 text-[var(--text-secondary)]" />
              Histórico
            </h3>
            <div className="space-y-6">
              {request.history?.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(index * 0.05, 0.4) }}
                  className="relative"
                >
                  {index !== (request.history?.length || 0) - 1 && (
                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-[var(--border-color)]" aria-hidden="true" />
                  )}
                  <div className="relative flex space-x-3">
                    <div>
                      <span className="h-8 w-8 rounded-full bg-[var(--brand-soft)] flex items-center justify-center ring-8 ring-[var(--bg-surface)]">
                        <CheckCircle className="h-4 w-4 text-[var(--brand-text)]" aria-hidden="true" />
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                      <div>
                        <p className="text-sm text-[var(--text-primary)] font-medium">{event.action}</p>
                        <p className="text-sm text-[var(--text-secondary)]">{event.description}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">{event.user}</p>
                      </div>
                      <div className="whitespace-nowrap text-right text-xs text-[var(--text-secondary)]">
                        {new Date(event.date).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              {(!request.history || request.history.length === 0) && (
                <p className="text-sm text-[var(--text-secondary)]">Sem histórico disponível.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
