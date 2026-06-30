import { cn } from '@/lib/utils';
import type { ProductBadge } from '@/types';

const LABELS: Record<ProductBadge, string> = {
  novo: 'Novo',
  promocao: 'Promoção',
  'pronta-entrega': 'Pronta entrega',
  'ultimas-unidades': 'Últimas unidades',
};

const STYLES: Record<ProductBadge, string> = {
  novo: 'bg-graphite text-cream-light',
  promocao: 'bg-terracotta text-cream-light',
  'pronta-entrega': 'bg-success-soft text-success',
  'ultimas-unidades': 'bg-warning-soft text-warning',
};

export function Badge({ kind, className }: { kind: ProductBadge; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[0.68rem] font-semibold tracking-wide',
        STYLES[kind],
        className,
      )}
    >
      {LABELS[kind]}
    </span>
  );
}

export function Pill({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}) {
  const tones = {
    neutral: 'bg-cream text-cinnamon',
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
    danger: 'bg-danger-soft text-danger',
    info: 'bg-[#e7ecf3] text-travel-blue',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
