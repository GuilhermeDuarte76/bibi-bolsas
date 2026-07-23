import { type Icon, TrendDown, TrendUp, Minus } from '@phosphor-icons/react';
import { Card } from './Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

/**
 * Cartão de métrica do admin (novo padrão). Rótulo, valor em destaque,
 * variação com tendência colorida e ícone em círculo tonal.
 */
export function StatCard({
  label,
  value,
  deltaPct,
  hint,
  icon: IconCmp,
  loading = false,
  className,
}: {
  label: string;
  value: React.ReactNode;
  deltaPct?: number;
  hint?: string;
  icon?: Icon;
  loading?: boolean;
  className?: string;
}) {
  if (loading) {
    return (
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        <Skeleton className="mt-4 h-7 w-28" />
        <Skeleton className="mt-3 h-3 w-20" />
      </Card>
    );
  }

  const hasDelta = deltaPct != null;
  const up = (deltaPct ?? 0) > 0;
  const flat = (deltaPct ?? 0) === 0;
  const TrendIcon = flat ? Minus : up ? TrendUp : TrendDown;

  return (
    <Card className={cn('p-5 transition-shadow hover:shadow-[var(--shadow-soft)]', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-graphite-soft">{label}</p>
        {IconCmp && (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-terracotta/10 text-terracotta">
            <IconCmp size={20} aria-hidden />
          </span>
        )}
      </div>
      <p className="mt-3 text-[1.7rem] font-semibold leading-none tracking-tight text-graphite">{value}</p>
      {(hasDelta || hint) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {hasDelta && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold',
                flat
                  ? 'bg-cream text-graphite-soft'
                  : up
                    ? 'bg-success-soft text-success'
                    : 'bg-danger-soft text-danger',
              )}
            >
              <TrendIcon size={13} weight="bold" />
              {up ? '+' : ''}
              {deltaPct}%
            </span>
          )}
          {hint && <span className="text-store-gray">{hint}</span>}
        </div>
      )}
    </Card>
  );
}
