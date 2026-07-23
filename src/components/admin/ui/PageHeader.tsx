import { Link } from 'react-router-dom';
import { CaretRight } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export interface Crumb {
  label: string;
  to?: string;
}

/**
 * Cabeçalho de página do admin (novo padrão editorial).
 * Breadcrumb opcional + eyebrow + título serifado + subtítulo + ações à direita.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  breadcrumbs,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  breadcrumbs?: Crumb[];
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-6', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Trilha" className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-graphite-soft">
          {breadcrumbs.map((c, i) => {
            const last = i === breadcrumbs.length - 1;
            return (
              <span key={`${c.label}-${i}`} className="flex items-center gap-1.5">
                {c.to && !last ? (
                  <Link to={c.to} className="tactile rounded font-medium transition-colors hover:text-terracotta">
                    {c.label}
                  </Link>
                ) : (
                  <span className={cn(last && 'font-semibold text-graphite')}>{c.label}</span>
                )}
                {!last && <CaretRight size={12} className="text-store-gray" aria-hidden />}
              </span>
            );
          })}
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
          <h1 className="font-display text-[1.75rem] leading-none text-graphite sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 max-w-2xl text-sm text-graphite-soft">{subtitle}</p>}
        </div>
        {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
      </div>
    </div>
  );
}
