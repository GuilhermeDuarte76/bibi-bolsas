import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CaretLeft } from '@phosphor-icons/react';
import { adminService, queryKeys } from '@/lib/api';
import type { Order, OrderStatus } from '@/types';
import { PageHeader, AdminTable, Panel } from '@/components/admin/AdminUI';
import { ORDER_STATUS_LABEL, OrderStatusPill } from '@/lib/orderStatus';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Field';
import { toast } from '@/components/ui/Toast';
import { formatDate, formatDateShort, formatPrice, formatZip } from '@/lib/utils';

const STATUS_FILTERS: (OrderStatus | 'all')[] = ['all', 'pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'canceled'];

export function AdminOrders() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');
  const { data, isLoading } = useQuery({ queryKey: queryKeys.admin.orders, queryFn: () => adminService.listOrders() });

  const rows = (data ?? []).filter((o) => status === 'all' || o.status === status);

  return (
    <div>
      <PageHeader title="Pedidos" subtitle={`${data?.length ?? 0} pedidos`} />

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`tactile rounded-full border px-4 py-1.5 text-sm ${status === s ? 'border-graphite bg-graphite text-cream-light' : 'border-border text-graphite hover:border-graphite'}`}
          >
            {s === 'all' ? 'Todos' : ORDER_STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-72 w-full rounded-[var(--radius-lg)]" />
      ) : (
        <AdminTable<Order>
          rowKey={(o) => o.id}
          rows={rows}
          onRowClick={(o) => navigate(`/admin/pedidos/${o.id}`)}
          columns={[
            { key: 'number', header: 'Pedido', render: (o) => <span className="font-medium">{o.number}</span> },
            { key: 'date', header: 'Data', render: (o) => formatDateShort(o.createdAt) },
            { key: 'customer', header: 'Cliente', render: (o) => o.shippingAddress.recipient },
            { key: 'payment', header: 'Pagamento', render: (o) => (o.paymentMethod === 'pix' ? 'Pix' : o.paymentMethod === 'credit_card' ? 'Cartão' : 'Boleto') },
            { key: 'total', header: 'Total', render: (o) => formatPrice(o.totalCents) },
            { key: 'status', header: 'Status', render: (o) => <OrderStatusPill status={o.status} /> },
          ]}
        />
      )}
    </div>
  );
}

export function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading } = useQuery({
    queryKey: queryKeys.admin.order(id!),
    queryFn: () => adminService.getOrder(id!),
    enabled: !!id,
  });

  if (isLoading || !order) return <Skeleton className="h-96 w-full rounded-[var(--radius-lg)]" />;

  return (
    <div>
      <button onClick={() => navigate('/admin/pedidos')} className="mb-4 flex items-center gap-1 text-sm text-graphite-soft hover:text-graphite">
        <CaretLeft size={16} /> Voltar para pedidos
      </button>
      <PageHeader
        title={`Pedido ${order.number}`}
        subtitle={`Realizado em ${formatDate(order.createdAt)}`}
        action={<OrderStatusPill status={order.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-6">
          <Panel title="Itens">
            <AdminTable
              rowKey={(it: Order['items'][number]) => it.sku}
              rows={order.items}
              columns={[
                { key: 'name', header: 'Produto', render: (it) => (
                  <div className="flex items-center gap-3">
                    <img src={it.image} alt="" className="h-10 w-9 rounded-md object-cover" />
                    <div><p className="font-medium">{it.name}</p><p className="text-xs text-graphite-soft">{it.colorName}{it.sizeLabel ? ` · ${it.sizeLabel}` : ''}</p></div>
                  </div>
                ) },
                { key: 'qty', header: 'Qtd', render: (it) => `${it.quantity}` },
                { key: 'price', header: 'Total', render: (it) => formatPrice(it.unitPriceCents * it.quantity) },
              ]}
            />
          </Panel>

          <Panel title="Ações do pedido">
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm text-graphite">
                Alterar status
                <Select className="mt-1.5" defaultValue={order.status} aria-label="Status do pedido">
                  {Object.entries(ORDER_STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </label>
              <Button onClick={() => toast.success('Status atualizado (mock) · registrado na auditoria')}>Salvar status</Button>
              <Button variant="outline" onClick={() => toast.info('Abrir comunicação com cliente (mock)')}>Contatar cliente</Button>
              <Button variant="danger" onClick={() => toast.info('Reembolso exige permissão de gerente (mock)')}>Reembolsar</Button>
            </div>
            <p className="mt-3 text-xs text-graphite-soft">Ações sensíveis (reembolso, alteração de status) geram log de auditoria e exigem permissão específica.</p>
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel title="Cliente e entrega">
            <p className="font-medium text-graphite">{order.shippingAddress.recipient}</p>
            <p className="mt-1 text-sm text-graphite-soft">{order.shippingAddress.street}, {order.shippingAddress.number}</p>
            <p className="text-sm text-graphite-soft">{order.shippingAddress.district} — {order.shippingAddress.city}/{order.shippingAddress.state}</p>
            <p className="text-sm text-graphite-soft">{formatZip(order.shippingAddress.zip)}</p>
            <p className="mt-3 text-sm text-graphite">{order.shipping.carrier} · {order.shipping.service}</p>
            {order.tracking && <p className="text-xs text-graphite-soft">Rastreio: <span className="font-mono">{order.tracking.code}</span></p>}
          </Panel>

          <Panel title="Resumo">
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between"><dt className="text-graphite-soft">Subtotal</dt><dd>{formatPrice(order.subtotalCents)}</dd></div>
              {order.discountCents > 0 && <div className="flex justify-between"><dt className="text-graphite-soft">Desconto</dt><dd className="text-success">- {formatPrice(order.discountCents)}</dd></div>}
              <div className="flex justify-between"><dt className="text-graphite-soft">Frete</dt><dd>{formatPrice(order.shippingCents)}</dd></div>
              <div className="flex justify-between border-t border-border pt-2 font-medium"><dt>Total</dt><dd>{formatPrice(order.totalCents)}</dd></div>
            </dl>
          </Panel>

          <Panel title="Nota fiscal">
            {order.fiscal?.status === 'issued' ? (
              <div className="flex gap-2"><Button size="sm" variant="outline">PDF</Button><Button size="sm" variant="outline">XML</Button></div>
            ) : order.fiscal?.status === 'rejected' ? (
              <p className="text-sm text-danger">Rejeitada: {order.fiscal.rejectionReason}. <button className="underline">Reprocessar</button></p>
            ) : (
              <p className="text-sm text-warning">Em processamento na SEFAZ…</p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
