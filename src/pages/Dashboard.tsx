import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  FileText,
  CheckSquare,
  Clock,
  TrendingUp,
  Layers,
  ArrowRight,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge, statusTone } from '../components/ui/Badge';

const CHART_TONES = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)'];

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let start: number | null = null;
    let raf = 0;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

function KpiValue({ value }: { value: number }) {
  const animated = useCountUp(value);
  return <>{animated}</>;
}

function DonutChart({ percent }: { percent: number }) {
  const animated = useCountUp(percent, 900);
  return (
    <div
      className="relative w-36 h-36 rounded-full flex items-center justify-center"
      style={{
        background: `conic-gradient(var(--brand-accent) ${animated * 3.6}deg, var(--bg-surface-2) 0deg)`,
        transition: 'background 0.05s linear',
      }}
    >
      <div className="absolute inset-3 rounded-full bg-[var(--bg-surface)] flex items-center justify-center">
        <span className="text-[22px] font-extrabold text-[var(--text-primary)]">{animated}%</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { dbUser } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/requests').then(r => r.json()).then(data => { if (Array.isArray(data)) setRequests(data); }).catch(() => {});
    fetch('/api/tasks').then(r => r.json()).then(data => { if (Array.isArray(data)) setTasks(data); }).catch(() => {});
    fetch('/api/processes').then(r => r.json()).then(data => { if (Array.isArray(data)) setProcesses(data); }).catch(() => {});
  }, []);

  // Calculations
  const pendingRequests = requests.filter(r => r.status === 'Em Análise' || r.status === 'Pendente');
  const approvedRequests = requests.filter(r => r.status === 'Aprovado' || r.status === 'Concluído');
  const activeTasks = tasks.filter(t => t.status !== 'Concluído' && t.status !== 'CONCLUIDO');

  const kpis = [
    {
      label: 'Total de Solicitações',
      value: requests.length,
      icon: FileText,
      hint: `${pendingRequests.length} pendentes de aprovação`,
      hintIcon: Clock,
      hintTone: 'text-amber-600',
    },
    {
      label: 'Processos Ativos',
      value: processes.length,
      icon: Layers,
      hint: 'Fluxos operacionais cadastrados',
      hintIcon: CheckCircle2,
      hintTone: 'text-[var(--brand-text)]',
    },
    {
      label: 'Tarefas Pendentes',
      value: activeTasks.length,
      icon: CheckSquare,
      hint: 'Kanban de acompanhamento',
      hintTone: 'text-[var(--text-secondary)]',
    },
    {
      label: 'Concluídas',
      value: approvedRequests.length,
      icon: TrendingUp,
      hint: 'Aprovadas com sucesso',
      hintIcon: CheckCircle2,
      hintTone: 'text-[var(--brand-text)]',
    },
  ];

  // Group requests by category for the bar chart
  const byCategory: Record<string, number> = {};
  for (const r of requests) {
    const key = r.category || 'Outros';
    byCategory[key] = (byCategory[key] || 0) + 1;
  }
  const categoryEntries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxCategoryCount = Math.max(1, ...categoryEntries.map(([, count]) => count));

  // Completion rate donut
  const finalizedCount = requests.filter(r => ['Aprovado', 'Concluído', 'Rejeitado'].includes(r.status)).length;
  const completionPct = finalizedCount > 0 ? Math.round((approvedRequests.length / finalizedCount) * 100) : 0;

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10 text-[var(--text-primary)] font-sans select-none">

      {/* Welcome */}
      <div>
        <h1 className="text-[18px] font-extrabold text-[var(--text-primary)] tracking-tight">
          Olá, {dbUser?.name?.split(' ')[0] || 'bem-vindo'}
        </h1>
        <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
          Visão geral das operações da plataforma
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => {
          const HintIcon = kpi.hintIcon;
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * (i + 1) }}
              whileHover={{ y: -3 }}
            >
              <Card hoverable className="space-y-3 relative overflow-hidden group transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-[11.5px] font-bold text-[var(--text-secondary)] uppercase tracking-wide">{kpi.label}</span>
                  <motion.div
                    className="p-2 bg-[var(--brand-soft)] text-[var(--brand-text)] rounded-lg"
                    whileHover={{ scale: 1.12, rotate: 4 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                  >
                    <kpi.icon size={16} />
                  </motion.div>
                </div>
                <div>
                  <div className="text-[30px] leading-none font-extrabold text-[var(--text-primary)]">
                    <KpiValue value={kpi.value} />
                  </div>
                  <div className={`text-[12.5px] font-semibold mt-2 flex items-center space-x-1 ${kpi.hintTone}`}>
                    {HintIcon && <HintIcon size={12} />}
                    <span>{kpi.hint}</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Charts row: bar chart + donut */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
        <Card>
          <h2 className="text-[15px] font-bold text-[var(--text-primary)] mb-5">Solicitações por Setor</h2>
          {categoryEntries.length > 0 ? (
            <div className="flex items-end justify-between gap-3 h-40">
              {categoryEntries.map(([category, count], i) => (
                <div key={category} className="flex-1 flex flex-col items-center justify-end h-full gap-2 min-w-0">
                  <span className="text-[12px] font-bold text-[var(--text-primary)]">{count}</span>
                  <motion.div
                    className="w-full max-w-10 rounded-t-md"
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(8, (count / maxCategoryCount) * 100)}%` }}
                    transition={{ duration: 0.6, delay: 0.1 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ filter: 'brightness(1.08)' }}
                    style={{ backgroundColor: CHART_TONES[i % CHART_TONES.length] }}
                  />
                  <span className="text-[11px] text-[var(--text-secondary)] font-medium truncate w-full text-center">{category}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-xs text-[var(--text-muted)]">
              Sem dados suficientes ainda.
            </div>
          )}
        </Card>

        <Card className="flex flex-col">
          <h2 className="text-[15px] font-bold text-[var(--text-primary)] mb-5">Taxa de Conclusão</h2>
          <div className="flex-1 flex items-center justify-center py-2">
            <DonutChart percent={completionPct} />
          </div>
          <p className="text-[11.5px] text-[var(--text-secondary)] text-center">
            {approvedRequests.length} de {finalizedCount} solicitações finalizadas foram aprovadas/concluídas
          </p>
        </Card>
      </div>

      {/* Bottom row: recent requests table + tasks panel */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4">

        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-[var(--text-primary)]">Solicitações Recentes</h2>
            <Link
              to="/requests"
              className="text-[12.5px] font-bold text-[var(--brand-text)] hover:underline flex items-center space-x-1"
            >
              <span>Ver todas</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {requests.length > 0 ? (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-left border-collapse min-w-[560px]">
                <thead>
                  <tr className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wide">
                    <th className="px-1 pb-2 font-bold">Protocolo</th>
                    <th className="px-1 pb-2 font-bold">Processo</th>
                    <th className="px-1 pb-2 font-bold">Etapa</th>
                    <th className="px-1 pb-2 font-bold">Solicitante</th>
                    <th className="px-1 pb-2 font-bold text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.slice(0, 6).map((req, i) => (
                    <motion.tr
                      key={req.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.04 * i }}
                      onClick={() => navigate(`/requests/${req.id}`)}
                      className="cursor-pointer border-t border-[var(--border-color)] hover:bg-[var(--brand-row-hover)] transition-colors"
                    >
                      <td className="px-1 py-2.5 text-[12.5px] font-mono font-semibold text-[var(--text-primary)] whitespace-nowrap">{req.protocol}</td>
                      <td className="px-1 py-2.5 text-[12.5px] font-semibold text-[var(--text-primary)] max-w-[160px] truncate">{req.processName}</td>
                      <td className="px-1 py-2.5 text-[12.5px] text-[var(--text-secondary)] whitespace-nowrap">{req.step || '—'}</td>
                      <td className="px-1 py-2.5 text-[12.5px] text-[var(--text-secondary)] max-w-[120px] truncate">{req.requester}</td>
                      <td className="px-1 py-2.5 text-right">
                        <Badge tone={statusTone(req.status)}>{req.status}</Badge>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-[var(--text-secondary)] text-xs bg-[var(--bg-sunken)] rounded-lg border border-[var(--border-color)]">
              Nenhuma solicitação cadastrada no momento.
            </div>
          )}
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-[var(--text-primary)]">Tarefas Pendentes</h2>
            <Link
              to="/tasks"
              className="text-[12.5px] font-bold text-[var(--brand-text)] hover:underline flex items-center space-x-1"
            >
              <span>Kanban</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="space-y-2.5">
            {tasks.slice(0, 5).map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * i }}
                whileHover={{ x: 2 }}
                onClick={() => navigate('/tasks')}
                className="bg-[var(--bg-sunken)] border border-[var(--border-color)] hover:border-[var(--brand-soft-border)] p-3 rounded-lg cursor-pointer transition-all space-y-1.5 group"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-bold text-[var(--text-primary)] truncate">
                    {task.processName || task.description}
                  </span>
                  <Badge tone="brand">{task.status || 'Pendente'}</Badge>
                </div>

                <div className="text-[11px] text-[var(--text-secondary)] flex items-center justify-between">
                  <span className="truncate">Resp: <strong className="text-[var(--text-primary)]">{Array.isArray(task.assignee) ? task.assignee.join(', ') : (task.assignee || 'Equipe')}</strong></span>
                  {task.sla && (
                    <span className="text-[10px] text-amber-700 font-mono shrink-0 ml-2">
                      SLA {task.sla}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}

            {tasks.length === 0 && (
              <div className="p-6 text-center text-[var(--text-secondary)] text-xs bg-[var(--bg-sunken)] rounded-lg border border-[var(--border-color)]">
                Você não tem tarefas pendentes no momento.
              </div>
            )}
          </div>
        </Card>

      </div>

    </div>
  );
}
