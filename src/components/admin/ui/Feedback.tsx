import { type Icon, CheckCircle, Info, WarningCircle, Warning, X } from '@phosphor-icons/react';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import type { Tone } from './StatusBadge';

type BannerTone = 'success' | 'warning' | 'danger' | 'info';

const BANNER: Record<BannerTone, { wrap: string; icon: Icon; iconColor: string }> = {
  success: { wrap: 'border-success/25 bg-success-soft/60', icon: CheckCircle, iconColor: 'text-success' },
  warning: { wrap: 'border-warning/25 bg-warning-soft/60', icon: Warning, iconColor: 'text-warning' },
  danger: { wrap: 'border-danger/25 bg-danger-soft/60', icon: WarningCircle, iconColor: 'text-danger' },
  info: { wrap: 'border-travel-blue/20 bg-[#e7ecf3]/70', icon: Info, iconColor: 'text-travel-blue' },
};

/**
 * Aviso inline de página/seção. Para mensagens persistentes (ex.: modo demo,
 * erro de formulário, alertas de estoque) — complementa os toasts efêmeros.
 */
export function Banner({
  tone = 'info',
  title,
  children,
  action,
  onDismiss,
  className,
}: {
  tone?: BannerTone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}) {
  const t = BANNER[tone];
  const Icon = t.icon;
  return (
    <div className={cn('flex items-start gap-3 rounded-[var(--radius-md)] border px-4 py-3', t.wrap, className)} role="status">
      <Icon size={20} weight="fill" className={cn('mt-0.5 shrink-0', t.iconColor)} aria-hidden />
      <div className="min-w-0 flex-1 text-sm">
        {title && <p className="font-semibold text-graphite">{title}</p>}
        {children && <div className={cn('text-graphite-soft', title && 'mt-0.5')}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dispensar"
          className="tactile -mr-1 shrink-0 rounded-md p-1 text-graphite-soft hover:bg-white/50 hover:text-graphite"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}

/** Extrai uma mensagem legível de um erro desconhecido. */
export function errorMessage(err: unknown, fallback = 'Tente novamente em instantes.'): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string' && err) return err;
  return fallback;
}

/**
 * Helpers de feedback padronizados para mutações do TanStack Query.
 * Uso:
 *   mutate(vars, feedback({ success: 'Produto salvo', error: 'Falha ao salvar' }))
 */
export function feedback(opts: {
  success?: string | { title: string; description?: string };
  error?: string | { title: string; description?: string };
  onSuccess?: () => void;
  onError?: (err: unknown) => void;
}) {
  return {
    onSuccess: () => {
      if (opts.success) toast.success(opts.success);
      opts.onSuccess?.();
    },
    onError: (err: unknown) => {
      if (opts.error) {
        const e = typeof opts.error === 'string' ? { title: opts.error } : opts.error;
        toast.error({ title: e.title, description: e.description ?? errorMessage(err) });
      }
      opts.onError?.(err);
    },
  };
}

export { toast };
export type { Tone };
