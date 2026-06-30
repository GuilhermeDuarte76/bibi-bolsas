import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CaretLeft, Check, FileText, MapPin, Truck } from '@phosphor-icons/react';
import { accountService, queryKeys } from '@/lib/api';
import { ORDER_FLOW, ORDER_STATUS_LABEL, OrderStatusPill } from '@/lib/orderStatus';
import { formatDate, formatDateShort, formatPrice, formatZip } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.order(id!),
    queryFn: () => accountService.getOrder(id!),
    enabled: !!id,
  });

  if (isLoading) return <Skeleton className="h-96 w-full rounded-[var(--radius-xl)]" />;
  if (isError || !order) return <ErrorState onRetry={() => refetch()} />;

  const currentStep = ORDER_FLOW.indexOf(order.status === 'pending_payment' ? 'paid' : order.status);
  const isCanceled = order.status === 'canceled' || order.status === 'refunded';

  return (
    <div>
      <Link to="/minha-conta/pedidos" className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-graphite-soft hover:text-graphite">
        <CaretLeft size={16} /> Voltar para pedidos
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-graphite">Pedido {order.number}</h2>
          <p className="text-sm text-graphite-soft">Realizado em {formatDate(order.createdAt)}</p>
        </div>
        <OrderStatusPill status={order.status} />
      </div>

      {/* Timeline de status */}
      {!isCanceled && (
        <div className="mt-6 rounded-[var(--radius-xl)] border border-border bg-surface p-6">
          <ol className="flex items-center">
            {ORDER_FLOW.map((s, i) => {
              const done = i <= currentStep;
              return (
                <li key={s} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center gap-1.5 text-center">
                    <span className={cn('grid h-8 w-8 place-items-center rounded-full', done ? 'bg-success text-white' : 'border border-border bg-surface text-store-gray')}>
                      {done ? <Check size={16} weight="bold" /> : i + 1}
                    </span>
                    <span className={cn('text-[0.7rem]', done ? 'font-medium text-graphite' : 'text-graphite-soft')}>{ORDER_STATUS_LABEL[s]}</span>
                  </div>
                  {i < ORDER_FLOW.length - 1 && <span className={cn('mx-1 h-px flex-1', i < currentStep ? 'bg-success' : 'bg-border')} />}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Itens */}
      <div className="mt-6 rounded-[var(--radius-xl)] border border-border bg-surface p-6">
        <h3 className="mb-4 font-medium text-graphite">Itens</h3>
        <ul className="flex flex-col gap-4">
          {order.items.map((it) => (
            <li key={it.sku} className="flex gap-4">
              <Link to={`/produto/${it.slug}`} className="h-20 w-16 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-cream-light">
                <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
              </Link>
              <div className="flex flex-1 flex-col">
                <Link to={`/produto/${it.slug}`} className="font-medium text-graphite hover:text-cinnamon">{it.name}</Link>
                <p className="text-xs text-graphite-soft">{it.colorName}{it.sizeLabel ? ` · ${it.sizeLabel}` : ''} · Qtd {it.quantity}</p>
              </div>
              <span className="font-medium text-graphite">{formatPrice(it.unitPriceCents * it.quantity)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Entrega + rastreio */}
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6">
          <h3 className="mb-3 flex items-center gap-2 font-medium text-graphite"><MapPin size={18} className="text-cinnamon" /> Entrega</h3>
          <p className="text-sm text-graphite">{order.shippingAddress.street}, {order.shippingAddress.number}</p>
          <p className="text-sm text-graphite-soft">{order.shippingAddress.district} — {order.shippingAddress.city}/{order.shippingAddress.state} · {formatZip(order.shippingAddress.zip)}</p>
          <p className="mt-3 flex items-center gap-2 text-sm text-graphite"><Truck size={16} /> {order.shipping.carrier} · {order.shipping.service}</p>

          {order.tracking && (
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-xs font-semibold text-graphite">Rastreio: <span className="font-mono">{order.tracking.code}</span></p>
              <ol className="mt-3 flex flex-col gap-3">
                {order.tracking.events.map((ev, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', i === order.tracking!.events.length - 1 ? 'bg-success' : 'bg-sand')} />
                    <span>
                      <span className="text-graphite">{ev.status}</span>
                      <span className="block text-xs text-graphite-soft">{formatDateShort(ev.date)}{ev.location ? ` · ${ev.location}` : ''}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Resumo + NF */}
        <div className="flex flex-col gap-6">
          <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6">
            <h3 className="mb-3 font-medium text-graphite">Resumo</h3>
            <dl className="flex flex-col gap-2 text-sm">
              <Row label="Subtotal" value={formatPrice(order.subtotalCents)} />
              {order.discountCents > 0 && <Row label={`Desconto${order.couponCode ? ` (${order.couponCode})` : ''}`} value={`- ${formatPrice(order.discountCents)}`} />}
              <Row label="Frete" value={order.shippingCents === 0 ? 'Grátis' : formatPrice(order.shippingCents)} />
            </dl>
            <div className="mt-3 flex justify-between border-t border-border pt-3">
              <span className="font-medium text-graphite">Total</span>
              <span className="font-display text-xl text-graphite">{formatPrice(order.totalCents)}</span>
            </div>
          </div>

          <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6">
            <h3 className="mb-3 flex items-center gap-2 font-medium text-graphite"><FileText size={18} className="text-cinnamon" /> Nota fiscal</h3>
            {order.fiscal?.status === 'issued' ? (
              <Button variant="outline" size="sm">Baixar NF-e (PDF)</Button>
            ) : order.fiscal?.status === 'processing' ? (
              <p className="text-sm text-warning">A nota fiscal está sendo emitida. Você poderá baixá-la em instantes.</p>
            ) : (
              <p className="text-sm text-graphite-soft">Nota fiscal indisponível para este pedido.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-graphite-soft">{label}</dt>
      <dd className="text-graphite">{value}</dd>
    </div>
  );
}
