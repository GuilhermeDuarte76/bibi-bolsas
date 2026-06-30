import type { CartItem } from '@/types';
import { formatPrice } from '@/lib/utils';

/** Resumo do pedido sempre visivel no desktop (FRONTEND-PLANEJAMENTO.md). */
export function OrderSummary({
  items,
  subtotalCents,
  discountCents,
  shippingCents,
  totalCents,
  shippingLabel,
  couponCode,
}: {
  items: CartItem[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  shippingLabel?: string;
  couponCode?: string;
}) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6">
      <h2 className="font-display text-xl text-graphite">Seu pedido</h2>
      <ul className="mt-4 flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id} className="flex gap-3">
            <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-cream-light">
              <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-graphite px-1 text-[0.65rem] font-bold text-cream-light">
                {item.quantity}
              </span>
            </div>
            <div className="flex flex-1 flex-col">
              <p className="text-sm font-medium leading-snug text-graphite">{item.name}</p>
              <p className="text-xs text-graphite-soft">
                {item.colorName}
                {item.sizeLabel ? ` · ${item.sizeLabel}` : ''}
              </p>
            </div>
            <span className="text-sm font-medium text-graphite">{formatPrice(item.unitPriceCents * item.quantity)}</span>
          </li>
        ))}
      </ul>

      <dl className="mt-5 flex flex-col gap-2 border-t border-border pt-5 text-sm">
        <div className="flex justify-between">
          <dt className="text-graphite-soft">Subtotal</dt>
          <dd className="text-graphite">{formatPrice(subtotalCents)}</dd>
        </div>
        {discountCents > 0 && (
          <div className="flex justify-between">
            <dt className="text-graphite-soft">Desconto {couponCode ? `(${couponCode})` : ''}</dt>
            <dd className="font-medium text-success">- {formatPrice(discountCents)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-graphite-soft">Frete {shippingLabel ? `· ${shippingLabel}` : ''}</dt>
          <dd className="text-graphite">{shippingCents === 0 ? 'Grátis' : formatPrice(shippingCents)}</dd>
        </div>
      </dl>
      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <span className="font-medium text-graphite">Total</span>
        <span className="font-display text-2xl text-graphite">{formatPrice(totalCents)}</span>
      </div>
    </div>
  );
}
