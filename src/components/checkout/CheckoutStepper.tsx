import { Check } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export const CHECKOUT_STEPS = ['Identificação', 'Endereço', 'Entrega', 'Pagamento', 'Revisão'] as const;
export type CheckoutStep = (typeof CHECKOUT_STEPS)[number];

/** Barra de progresso clara do checkout (FRONTEND-PLANEJAMENTO.md secao Checkout). */
export function CheckoutStepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center">
      {CHECKOUT_STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  'grid h-8 w-8 place-items-center rounded-full text-sm font-semibold transition-colors',
                  done && 'bg-success text-white',
                  active && 'bg-graphite text-cream-light',
                  !done && !active && 'border border-border bg-surface text-store-gray',
                )}
              >
                {done ? <Check size={16} weight="bold" /> : i + 1}
              </span>
              <span className={cn('hidden text-xs sm:block', active ? 'font-medium text-graphite' : 'text-graphite-soft')}>
                {label}
              </span>
            </div>
            {i < CHECKOUT_STEPS.length - 1 && (
              <span className={cn('mx-2 h-px flex-1 transition-colors', done ? 'bg-success' : 'bg-border')} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
