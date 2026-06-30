import { Check } from '@phosphor-icons/react';
import type { ProductColor } from '@/types';
import { cn } from '@/lib/utils';

/** Swatches de cor com tamanho fixo (FRONTEND-PLANEJAMENTO.md secao 13). */
export function Swatches({
  colors,
  value,
  onChange,
  size = 'md',
  max,
}: {
  colors: ProductColor[];
  value?: string;
  onChange?: (id: string) => void;
  size?: 'sm' | 'md';
  max?: number;
}) {
  const dim = size === 'sm' ? 'h-4 w-4' : 'h-7 w-7';
  const shown = max ? colors.slice(0, max) : colors;
  const rest = max ? colors.length - max : 0;
  const interactive = !!onChange;

  return (
    <div className="flex items-center gap-1.5">
      {shown.map((c) => {
        const active = value === c.id;
        const ring = active ? 'ring-2 ring-offset-2 ring-graphite' : 'ring-1 ring-black/10';
        const light = c.hex.toLowerCase() === '#e3d4c2' || c.hex.toLowerCase() === '#c2b1a8';
        return interactive ? (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange!(c.id)}
            aria-label={c.name}
            aria-pressed={active}
            title={c.name}
            className={cn('tactile relative grid place-items-center rounded-full', dim, ring)}
            style={{ backgroundColor: c.hex }}
          >
            {active && <Check size={14} weight="bold" className={light ? 'text-graphite' : 'text-white'} />}
          </button>
        ) : (
          <span
            key={c.id}
            title={c.name}
            className={cn('rounded-full ring-1 ring-black/10', dim)}
            style={{ backgroundColor: c.hex }}
          />
        );
      })}
      {rest > 0 && <span className="text-xs text-graphite-soft">+{rest}</span>}
    </div>
  );
}
