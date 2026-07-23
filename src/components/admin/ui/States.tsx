import { type Icon, Tray, WarningOctagon, CircleNotch } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

/**
 * Estado vazio do admin. `action` aceita qualquer nó (botão, link…) para
 * total flexibilidade entre telas.
 */
export function EmptyState({
  icon: IconCmp = Tray,
  title,
  description,
  action,
  className,
}: {
  icon?: Icon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-cream text-cinnamon">
        <IconCmp size={26} weight="light" aria-hidden />
      </span>
      <h3 className="font-display text-lg text-graphite">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-graphite-soft">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Estado de erro com retentativa. */
export function ErrorState({
  title = 'Não foi possível carregar',
  description = 'Ocorreu um erro ao buscar os dados. Tente novamente em instantes.',
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft text-danger">
        <WarningOctagon size={26} weight="light" aria-hidden />
      </span>
      <h3 className="font-display text-lg text-graphite">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-graphite-soft">{description}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

/** Indicador de carregamento centralizado (para blocos e páginas). */
export function LoadingState({ label = 'Carregando…', className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-14 text-center', className)}>
      <CircleNotch size={28} className="animate-spin text-terracotta" weight="bold" aria-hidden />
      <p className="text-sm text-graphite-soft">{label}</p>
    </div>
  );
}
