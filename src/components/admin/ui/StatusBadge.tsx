import { cn } from '@/lib/utils';

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand';

const TONES: Record<Tone, { chip: string; dot: string }> = {
  neutral: { chip: 'bg-cream text-cinnamon', dot: 'bg-store-gray' },
  success: { chip: 'bg-success-soft text-success', dot: 'bg-success' },
  warning: { chip: 'bg-warning-soft text-warning', dot: 'bg-warning' },
  danger: { chip: 'bg-danger-soft text-danger', dot: 'bg-danger' },
  info: { chip: 'bg-[#e7ecf3] text-travel-blue', dot: 'bg-travel-blue' },
  brand: { chip: 'bg-terracotta/12 text-terracotta', dot: 'bg-terracotta' },
};

/**
 * Selo de status unificado do admin. Substitui os badges dispersos por telas.
 * `dot` mostra um indicador de estado; `size` controla a densidade.
 */
export function StatusBadge({
  children,
  tone = 'neutral',
  dot = false,
  size = 'md',
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  dot?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const t = TONES[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold tracking-wide',
        size === 'sm' ? 'px-2 py-0.5 text-[0.66rem]' : 'px-2.5 py-1 text-xs',
        t.chip,
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', t.dot)} aria-hidden />}
      {children}
    </span>
  );
}
