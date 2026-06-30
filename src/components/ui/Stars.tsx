import { Star } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

/** Exibicao de avaliacao em estrelas (ReviewStars). */
export function Stars({
  rating,
  count,
  size = 16,
  className,
}: {
  rating: number;
  count?: number;
  size?: number;
  className?: string;
}) {
  const rounded = Math.round(rating * 2) / 2;
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex items-center" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={size}
            weight={i <= rounded ? 'fill' : 'regular'}
            className={i <= rounded ? 'text-terracotta' : 'text-sand'}
          />
        ))}
      </div>
      <span className="sr-only">{rating} de 5 estrelas</span>
      {count != null && <span className="text-xs text-graphite-soft">({count})</span>}
    </div>
  );
}

/** Input de estrelas para formularios de avaliacao. */
export function StarsInput({
  value,
  onChange,
  size = 28,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Sua nota">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} ${i === 1 ? 'estrela' : 'estrelas'}`}
          onClick={() => onChange(i)}
          className="tactile rounded-md p-0.5"
        >
          <Star
            size={size}
            weight={i <= value ? 'fill' : 'regular'}
            className={i <= value ? 'text-terracotta' : 'text-sand hover:text-nude'}
          />
        </button>
      ))}
    </div>
  );
}
