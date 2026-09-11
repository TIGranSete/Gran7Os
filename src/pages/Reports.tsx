import { useEffect, useState } from 'react';
import { BarChart2, TrendingUp, Users, Clock, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import { Card } from '../components/ui/Card';

function useCountUp(target: number, duration = 900, decimals = 0) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let start: number | null = null;
    let raf = 0;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Number((eased * target).toFixed(decimals)));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, decimals]);

  return value;
}

function StatValue({ value, decimals = 0, suffix = '' }: { value: number; decimals?: number; suffix?: string }) {
  const animated = useCountUp(value, 900, decimals);
  return <>{decimals > 0 ? animated.toFixed(decimals) : animated}{suffix}</>;
}

const kpis = [
  {
    label: 'SLA Médio',
    value: 14.2,
    decimals: 1,
    suffix: 'h',
    icon: Clock,
    iconClass: 'bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] text-[var(--brand-text)]',
    valueClass: 'text-[var(--text-primary)]',
    hint: '-2h em relação ao mês passado',
    hintClass: 'text-[var(--brand-text)]',
    showTrend: true,
  },
  {
    label: 'Processos Concluídos',
    value: 432,
    icon: BarChart2,
    iconClass: 'bg-sky-50 border border-sky-200 text-sky-600',
    valueClass: 'text-[var(--text-primary)]',
    hint: '+12% de aumento operacional',
    hintClass: 'text-[var(--brand-text)]',
    showTrend: true,
  },
  {
    label: 'Tarefas em Atraso',
    value: 15,
    icon: AlertTriangle,
    iconClass: 'bg-amber-50 border border-amber-200 text-amber-600',
    valueClass: 'text-amber-600',
    hint: 'Atenção aos gargalos nos setores',
    hintClass: 'text-amber-600',
    showTrend: false,
  },
  {
    label: 'Usuários Ativos',
    value: 1.2,
    decimals: 1,
    suffix: 'k',
    icon: Users,
    iconClass: 'bg-purple-50 border border-purple-200 text-purple-600',
    valueClass: 'text-[var(--text-primary)]',
    hint: '+4% engajamento interno',
    hintClass: 'text-[var(--brand-text)]',
    showTrend: true,
  },
];

export default function Reports() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 font-sans select-none">

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center bg-[var(--bg-surface)] border border-[var(--border-color)] p-6 rounded-xl"
      >
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)]">Relatórios & Indicadores</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">Métricas operacionais e inteligência de processos da Gran7.</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * (i + 1) }}
            whileHover={{ y: -3 }}
          >
            <Card hoverable className="transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">{kpi.label}</h3>
                <motion.div
                  className={`h-9 w-9 rounded-lg flex items-center justify-center ${kpi.iconClass}`}
                  whileHover={{ scale: 1.12, rotate: 4 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                >
                  <kpi.icon size={18} />
                </motion.div>
              </div>
              <p className={`text-3xl font-black font-mono ${kpi.valueClass}`}>
                <StatValue value={kpi.value} decimals={kpi.decimals} suffix={kpi.suffix} />
              </p>
              <p className={`text-xs flex items-center mt-2 font-bold ${kpi.hintClass}`}>
                {kpi.showTrend && <TrendingUp size={14} className="mr-1" />}
                {kpi.hint}
              </p>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="p-8 flex flex-col items-center justify-center min-h-[380px] text-center">
          <div className="w-16 h-16 rounded-xl bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] flex items-center justify-center text-[var(--brand-text)] mb-4">
            <BarChart2 size={32} />
          </div>
          <h3 className="text-lg font-black text-[var(--text-primary)]">Central de Inteligência Operacional Gran7</h3>
          <p className="text-[var(--text-secondary)] mt-2 text-sm max-w-md">
            Acompanhe relatórios detalhados por departamento, fluxo de solicitações e eficiência de SLAs em tempo real.
          </p>
        </Card>
      </motion.div>
    </div>
  );
}
