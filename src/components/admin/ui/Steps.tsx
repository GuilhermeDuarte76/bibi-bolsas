import { Check } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export interface StepItem {
  key: string;
  label: string;
  description?: string;
}

/**
 * Indicador de etapas (wizard). Clicável para navegar entre passos já visíveis.
 */
export function Steps({
  steps,
  current,
  onSelect,
  className,
}: {
  steps: StepItem[];
  current: number;
  onSelect?: (index: number) => void;
  className?: string;
}) {
  return (
    <ol className={cn('flex items-center gap-1 overflow-x-auto no-scrollbar', className)}>
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        const clickable = !!onSelect;
        return (
          <li key={step.key} className="flex flex-1 items-center gap-1">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => onSelect?.(index)}
              className={cn(
                'tactile flex min-w-0 flex-1 items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-left transition-colors',
                clickable && 'hover:bg-cream-lighter',
                !clickable && 'cursor-default',
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                  active
                    ? 'bg-terracotta text-cream-light'
                    : done
                      ? 'bg-success text-white'
                      : 'border border-border bg-surface text-graphite-soft',
                )}
              >
                {done ? <Check size={14} weight="bold" /> : index + 1}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    'block truncate text-sm font-medium leading-tight',
                    active ? 'text-graphite' : 'text-graphite-soft',
                  )}
                >
                  {step.label}
                </span>
                {step.description && (
                  <span className="hidden truncate text-xs leading-tight text-store-gray lg:block">{step.description}</span>
                )}
              </span>
            </button>
            {index < steps.length - 1 && <span className="h-px w-4 shrink-0 bg-border sm:w-6" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

/** Controle segmentado (ex.: alternar visualização). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: React.ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn('inline-flex items-center gap-0.5 rounded-[var(--radius-md)] border border-border bg-cream-lighter p-0.5', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={cn(
              'tactile flex items-center gap-1.5 rounded-[calc(var(--radius-md)-3px)] px-3 py-1.5 text-sm font-medium transition-colors',
              active ? 'bg-surface text-graphite shadow-[var(--shadow-card)]' : 'text-graphite-soft hover:text-graphite',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
