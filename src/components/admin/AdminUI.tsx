import { type Icon, TrendDown, TrendUp } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

/** Cabecalho de pagina do admin. */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-graphite">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-graphite-soft">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** Card de metrica do dashboard. */
export function StatCard({
  label,
  value,
  deltaPct,
  hint,
  icon: IconCmp,
}: {
  label: string;
  value: string;
  deltaPct?: number;
  hint?: string;
  icon?: Icon;
}) {
  const up = (deltaPct ?? 0) >= 0;
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-graphite-soft">{label}</p>
        {IconCmp && <IconCmp size={20} className="text-cinnamon" />}
      </div>
      <p className="mt-2 text-2xl font-semibold text-graphite">{value}</p>
      {deltaPct != null && (
        <p className={cn('mt-1 flex items-center gap-1 text-xs font-medium', up ? 'text-success' : 'text-danger')}>
          {up ? <TrendUp size={14} /> : <TrendDown size={14} />}
          {up ? '+' : ''}{deltaPct}% {hint && <span className="font-normal text-store-gray">· {hint}</span>}
        </p>
      )}
    </div>
  );
}

/** Tabela base do admin: clara, densa e responsiva (rola no mobile). */
export function AdminTable<T>({
  columns,
  rows,
  rowKey,
  empty = 'Nenhum registro encontrado.',
  onRowClick,
}: {
  columns: { key: string; header: string; render: (row: T) => React.ReactNode; className?: string }[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: string;
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-border bg-surface">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-cream-light/50 text-left">
            {columns.map((c) => (
              <th key={c.key} className={cn('px-4 py-3 font-semibold text-graphite-soft', c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-graphite-soft">{empty}</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={cn('border-b border-border/60 last:border-0', onRowClick && 'cursor-pointer hover:bg-cream-light/40')}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-4 py-3 text-graphite', c.className)}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Card de secao. */
export function Panel({ title, action, children, className }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-[var(--radius-lg)] border border-border bg-surface p-5', className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between">
          {title && <h2 className="font-semibold text-graphite">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
