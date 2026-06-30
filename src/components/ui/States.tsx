import { type Icon, SmileySad, WarningCircle, MagnifyingGlass } from '@phosphor-icons/react';
import { Button } from './Button';
import { cn } from '@/lib/utils';

interface StateProps {
  icon?: Icon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

/** Estado vazio bem desenhado (FRONTEND-PLANEJAMENTO.md secao 11). */
export function EmptyState({
  icon: IconCmp = SmileySad,
  title,
  description,
  action,
  className,
}: StateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-16 text-center', className)}>
      <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-cream text-cinnamon">
        <IconCmp size={30} weight="light" aria-hidden />
      </span>
      <h3 className="font-display text-xl text-graphite">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm text-graphite-soft">{description}</p>}
      {action && (
        <Button className="mt-6" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

/** Estado de erro com retentativa. */
export function ErrorState({
  title = 'Algo deu errado',
  description = 'Não foi possível carregar agora. Tente novamente em instantes.',
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-16 text-center', className)}>
      <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-danger-soft text-danger">
        <WarningCircle size={30} weight="light" aria-hidden />
      </span>
      <h3 className="font-display text-xl text-graphite">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-graphite-soft">{description}</p>
      {onRetry && (
        <Button variant="outline" className="mt-6" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

export const SearchEmptyIcon = MagnifyingGlass;
