import clsx from 'clsx';

interface CardProps {
  className?: string;
  children?: any;
  hoverable?: boolean;
  sunken?: boolean;
  [key: string]: any;
}

export function Card({ className, hoverable = false, sunken = false, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-2xl border p-5 transition-colors',
        sunken
          ? 'bg-[var(--bg-sunken)] border-[var(--border-color)]'
          : 'bg-[var(--bg-surface)] border-[var(--border-color)]',
        hoverable && 'hover:border-[var(--brand-soft-border)] cursor-pointer',
        className
      )}
      {...props}
    />
  );
}
