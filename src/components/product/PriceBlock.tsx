import { applyPix, discountPercent, formatInstallment, formatPrice } from '@/lib/utils';
import { cn } from '@/lib/utils';

/** Bloco de preco: valor atual, "de", parcelamento e Pix. Alto contraste. */
export function PriceBlock({
  priceCents,
  compareAtCents,
  installments,
  pixPct,
  size = 'md',
  className,
}: {
  priceCents: number;
  compareAtCents?: number;
  installments?: number;
  pixPct?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const off = compareAtCents ? discountPercent(compareAtCents, priceCents) : 0;
  const priceClass = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-3xl',
  }[size];

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-baseline gap-2">
        {compareAtCents && off > 0 && (
          <span className="text-sm text-store-gray line-through">{formatPrice(compareAtCents)}</span>
        )}
        <span className={cn('font-semibold text-graphite', priceClass)}>{formatPrice(priceCents)}</span>
        {off > 0 && (
          <span className="rounded-full bg-terracotta/10 px-2 py-0.5 text-xs font-semibold text-terracotta">
            -{off}%
          </span>
        )}
      </div>
      {size !== 'sm' && (
        <div className="flex flex-col gap-0.5 text-sm text-graphite-soft">
          {pixPct ? (
            <span>
              <strong className="font-semibold text-success">{formatPrice(applyPix(priceCents, pixPct))}</strong>{' '}
              no Pix ({pixPct}% off)
            </span>
          ) : null}
          {installments && installments > 1 && (
            <span>ou {formatInstallment(priceCents, installments)} sem juros</span>
          )}
        </div>
      )}
    </div>
  );
}
