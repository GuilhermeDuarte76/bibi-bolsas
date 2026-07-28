import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CaretLeft, Check, Clock, Copy, FileText, MapPin, Truck } from '@phosphor-icons/react';
import { accountService, queryKeys } from '@/lib/api';
import { ORDER_FLOW, ORDER_STATUS_LABEL, OrderStatusPill } from '@/lib/orderStatus';
import { formatDate, formatDateShort, formatPrice, formatZip } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Field';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.order(id!),
    queryFn: () => accountService.getOrder(id!),
    enabled: !!id,
  });

  const retryPayment = useMutation({
    mutationFn: () => accountService.retryOrderPayment(id!),
    onSuccess: async () => {
      toast.success('Nova tentativa Pix registrada.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.order(id!) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders });
    },
    onError: (error) => toast.error((error as Error).message || 'Não foi possível tentar o pagamento novamente.'),
  });

  const cancelOrder = useMutation({
    mutationFn: () => accountService.cancelOrder(id!, cancelReason.trim()),
    onSuccess: async (updated) => {
      toast.success('Pedido cancelado com sucesso.');
      queryClient.setQueryData(queryKeys.order(id!), updated);
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders });
      setShowCancel(false);
    },
    onError: (error) => toast.error((error as Error).message || 'Não foi possível cancelar o pedido.'),
  });

  if (isLoading) return <Skeleton className="h-96 w-full rounded-[var(--radius-xl)]" />;
  if (isError || !order) return <ErrorState onRetry={() => refetch()} />;

  const currentStep = order.status === 'pending_payment' ? -1 : ORDER_FLOW.indexOf(order.status);
  const isCanceled = order.status === 'canceled' || order.status === 'refunded';
  const copyPix = () => {
    const code = order.paymentAttempt?.pixCopyPaste;
    if (!code) return;
    navigator.clipboard?.writeText(code);
    toast.success('Código Pix copiado');
  };

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
              const done = currentStep >= 0 && i <= currentStep;
              return (
                <li key={s} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center gap-1.5 text-center">
                    <span className={cn('grid h-8 w-8 place-items-center rounded-full', done ? 'bg-success text-white' : 'border border-border bg-surface text-store-gray')}>
                      {done ? <Check size={16} weight="bold" /> : i + 1}
                    </span>
                    <span className={cn('text-[0.7rem]', done ? 'font-medium text-graphite' : 'text-graphite-soft')}>{ORDER_STATUS_LABEL[s]}</span>
                  </div>
                  {i < ORDER_FLOW.length - 1 && <span className={cn('mx-1 h-px flex-1', currentStep >= 0 && i < currentStep ? 'bg-success' : 'bg-border')} />}
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
              {it.slug ? (
                <Link to={`/produto/${it.slug}`} className="h-20 w-16 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-cream-light">
                  <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
                </Link>
              ) : (
                <span className="h-20 w-16 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-cream-light">
                  <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
                </span>
              )}
              <div className="flex flex-1 flex-col">
                {it.slug ? (
                  <Link to={`/produto/${it.slug}`} className="font-medium text-graphite hover:text-cinnamon">{it.name}</Link>
                ) : (
                  <span className="font-medium text-graphite">{it.name}</span>
                )}
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
              {order.tracking.url && <a href={order.tracking.url} className="mt-2 inline-block text-sm font-medium text-terracotta">Abrir rastreio</a>}
              {order.tracking.events.length > 0 && (
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
              )}
            </div>
          )}
        </div>

        {/* Resumo + NF */}
        <div className="flex flex-col gap-6">
          <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6">
            <h3 className="mb-3 flex items-center gap-2 font-medium text-graphite"><Clock size={18} className="text-cinnamon" /> Pagamento</h3>
            <dl className="flex flex-col gap-2 text-sm">
              <Row label="Forma" value={paymentMethodLabel(order.paymentMethod)} />
              <Row label="Status" value={paymentStatusLabel(order.paymentStatus)} />
              {order.expiresAt && order.status === 'pending_payment' && (
                <Row label="Expira em" value={formatDate(order.expiresAt)} />
              )}
            </dl>
            {order.paymentAttempt?.failureReason && (
              <p className="mt-3 text-sm text-danger">{order.paymentAttempt.failureReason}</p>
            )}
            {order.paymentAttempt?.pixCopyPaste && (
              <div className="mt-4 flex gap-2">
                <code className="min-w-0 flex-1 truncate rounded-[var(--radius-md)] border border-border bg-cream-light px-3 py-2.5 text-xs text-graphite-soft">
                  {order.paymentAttempt.pixCopyPaste}
                </code>
                <Button variant="outline" size="sm" onClick={copyPix}><Copy size={16} /> Copiar</Button>
              </div>
            )}
            {(order.canRetryPayment || order.canCancel) && (
              <div className="mt-5 border-t border-border pt-4">
                <div className="flex flex-wrap gap-2">
                  {order.canRetryPayment && (
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={retryPayment.isPending}
                      onClick={() => retryPayment.mutate()}
                      disabled={cancelOrder.isPending}
                    >
                      Tentar Pix novamente
                    </Button>
                  )}
                  {order.canCancel && !showCancel && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCancel(true)}
                      disabled={retryPayment.isPending}
                    >
                      Cancelar pedido
                    </Button>
                  )}
                </div>

                {order.canCancel && showCancel && (
                  <div className="mt-4 rounded-[var(--radius-lg)] border border-danger/20 bg-danger-soft/30 p-4">
                    <label className="text-sm font-medium text-graphite" htmlFor="cancel-reason">
                      Motivo do cancelamento
                    </label>
                    <Textarea
                      id="cancel-reason"
                      value={cancelReason}
                      onChange={(event) => setCancelReason(event.target.value)}
                      placeholder="Descreva o motivo do cancelamento"
                      className="mt-2 bg-surface"
                      maxLength={500}
                    />
                    <p className="mt-1 text-xs text-graphite-soft">Mínimo de 10 caracteres.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant="danger"
                        size="sm"
                        loading={cancelOrder.isPending}
                        disabled={cancelReason.trim().length < 10 || retryPayment.isPending}
                        onClick={() => cancelOrder.mutate()}
                      >
                        Confirmar cancelamento
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowCancel(false);
                          setCancelReason('');
                        }}
                        disabled={cancelOrder.isPending}
                      >
                        Manter pedido
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

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

      {order.history && order.history.length > 0 && (
        <div className="mt-6 rounded-[var(--radius-xl)] border border-border bg-surface p-6">
          <h3 className="mb-4 font-medium text-graphite">Histórico</h3>
          <ol className="flex flex-col gap-3">
            {order.history.map((event) => (
              <li key={event.id} className="flex gap-3 text-sm">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sand" />
                <span>
                  <span className="text-graphite">{backendStatusLabel(event.status)}</span>
                  <span className="block text-xs text-graphite-soft">{formatDateShort(event.createdAt)}</span>
                  {event.reason && <span className="block text-xs text-graphite-soft">{event.reason}</span>}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function paymentMethodLabel(method: string) {
  return method === 'pix' ? 'Pix' : method === 'credit_card' ? 'Cartão de crédito' : 'Boleto';
}

function paymentStatusLabel(status?: string) {
  const labels: Record<string, string> = {
    Pending: 'Aguardando pagamento',
    Approved: 'Aprovado',
    Expired: 'Expirado',
    Failed: 'Falhou',
    Canceled: 'Cancelado',
    Refunded: 'Reembolsado',
    PartiallyRefunded: 'Parcialmente reembolsado',
  };
  return status ? labels[status] ?? status : 'Aguardando atualização';
}

function backendStatusLabel(status: string) {
  const labels: Record<string, string> = {
    AwaitingPayment: ORDER_STATUS_LABEL.pending_payment,
    Paid: ORDER_STATUS_LABEL.paid,
    PaymentExpired: 'Pagamento expirado',
    PaymentFailed: 'Pagamento recusado',
    Preparing: ORDER_STATUS_LABEL.processing,
    Shipped: ORDER_STATUS_LABEL.shipped,
    Delivered: ORDER_STATUS_LABEL.delivered,
    Canceled: ORDER_STATUS_LABEL.canceled,
    Refunded: ORDER_STATUS_LABEL.refunded,
    PartiallyRefunded: 'Parcialmente reembolsado',
  };
  return labels[status] ?? status;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-graphite-soft">{label}</dt>
      <dd className="text-graphite">{value}</dd>
    </div>
  );
}
