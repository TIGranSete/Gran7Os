import clsx from 'clsx';

type BadgeTone = 'brand' | 'warning' | 'danger' | 'neutral' | 'info';

interface BadgeProps {
  className?: string;
  children?: any;
  tone?: BadgeTone;
  [key: string]: any;
}

const toneClasses: Record<BadgeTone, string> = {
  brand: 'bg-[var(--brand-soft)] text-[var(--brand-soft-text)] border-[var(--brand-soft-border)]',
  warning: 'bg-amber-100 text-amber-800 border-amber-200',
  danger: 'bg-rose-100 text-rose-800 border-rose-200',
  info: 'bg-sky-100 text-sky-800 border-sky-200',
  neutral: 'bg-[var(--bg-surface-2)] text-[var(--text-secondary)] border-[var(--border-color)]',
};

export function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border',
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}

export function statusTone(status: string | undefined): BadgeTone {
  if (!status) return 'neutral';
  if (status === 'Em Análise' || status === 'Pendente' || status === 'Em Atendimento' || status === 'Em Andamento') return 'warning';
  if (status === 'Aprovado' || status === 'Concluído') return 'brand';
  if (status === 'Rejeitado' || status === 'Cancelado') return 'danger';
  return 'neutral';
}
