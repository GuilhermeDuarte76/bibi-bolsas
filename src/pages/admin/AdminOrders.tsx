import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CaretLeft,
  CheckCircle,
  ClockCounterClockwise,
  Clock,
  DownloadSimple,
  FileText,
  Printer,
  Truck,
  X,
} from '@phosphor-icons/react';
import { adminService, queryKeys } from '@/lib/api';
import type { FiscalPreview, Order, OrderStatus, PaymentAttempt, PaymentMethod, WebhookEvent } from '@/types';
import type { AdminOrderFilters } from '@/lib/api/admin.service';
import { ORDER_STATUS_LABEL, OrderStatusPill } from '@/lib/orderStatus';
import {
  Banner,
  Button,
  DataTable,
  Field,
  Input,
  Modal,
  PageHeader,
  SearchInput,
  SectionCard,
  Select,
  StatCard,
  StatusBadge,
  Tabs,
  Textarea,
  Toolbar,
  ToolbarSpacer,
  toast,
  type Column,
  type TabItem,
  type Tone,
} from '@/components/admin/ui';
import { formatDate, formatDateShort, formatPrice, formatZip } from '@/lib/utils';

const STATUS_FILTERS: (OrderStatus | 'all')[] = ['all', 'pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'canceled', 'refunded'];

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  pix: 'Pix',
  credit_card: 'Cartão',
  boleto: 'Boleto',
};

interface ShipmentFormState {
  carrier: string;
  service: string;
  trackingCode: string;
  trackingUrl: string;
  shippedAt: string;
}

function operationalTargets(status: OrderStatus): OrderStatus[] {
  if (status === 'paid') return ['processing'];
  if (status === 'shipped') return ['delivered'];
  return [];
}

function canCancelOperationally(status: OrderStatus): boolean {
  return status === 'pending_payment';
}

function canRegisterShipment(status: OrderStatus): boolean {
  return status === 'processing';
}

function canUpdateTracking(status: OrderStatus): boolean {
  return status === 'shipped' || status === 'delivered';
}

function historyStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    AwaitingPayment: 'Aguardando pagamento',
    Paid: 'Pago',
    PaymentExpired: 'Pagamento expirado',
    PaymentFailed: 'Pagamento recusado',
    Preparing: 'Em separação',
    Shipped: 'Enviado',
    Delivered: 'Entregue',
    Canceled: 'Cancelado',
    Refunded: 'Reembolsado',
    PartiallyRefunded: 'Parcialmente reembolsado',
  };

  return labels[status] ?? ORDER_STATUS_LABEL[status as OrderStatus] ?? status;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function paymentTone(status: string): Tone {
  return status === 'Approved' ? 'success' : status === 'Failed' ? 'danger' : 'warning';
}

function webhookTone(status: string): Tone {
  return status === 'Processed' ? 'success' : status === 'Failed' ? 'danger' : 'warning';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function downloadTextFile(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function fiscalPrintHtml(preview: FiscalPreview): string {
  const generatedAt = new Date(preview.generatedAt).toLocaleString('pt-BR');
  const items = preview.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.description)}</td>
          <td>${escapeHtml(item.sku)}</td>
          <td>${item.quantity}</td>
          <td>${formatPrice(item.unitPriceCents)}</td>
          <td>${formatPrice(item.totalCents)}</td>
        </tr>`,
    )
    .join('');

  const issues = preview.pendingIssues.length
    ? preview.pendingIssues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join('')
    : '<li>Nenhuma pendência encontrada para esta prévia.</li>';

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Prévia fiscal ${escapeHtml(preview.orderNumber)}</title>
  <style>
    body { color: #211c1a; font-family: Arial, sans-serif; margin: 32px; }
    header { border-bottom: 2px solid #211c1a; margin-bottom: 24px; padding-bottom: 16px; }
    h1 { font-size: 22px; margin: 0 0 8px; }
    .marker { border: 1px solid #b5472d; color: #b5472d; display: inline-block; font-size: 12px; font-weight: 700; margin-top: 8px; padding: 6px 10px; text-transform: uppercase; }
    dl { display: grid; gap: 8px; grid-template-columns: 160px 1fr; margin: 0 0 24px; }
    dt { color: #6f6661; font-weight: 700; }
    dd { margin: 0; }
    table { border-collapse: collapse; margin-top: 16px; width: 100%; }
    th, td { border-bottom: 1px solid #ddd7d1; padding: 10px 8px; text-align: left; }
    th { color: #6f6661; font-size: 12px; text-transform: uppercase; }
    .totals { margin-left: auto; margin-top: 20px; max-width: 320px; }
    .totals div { display: flex; justify-content: space-between; padding: 6px 0; }
    .total { border-top: 2px solid #211c1a; font-weight: 700; }
    .issues { border-left: 4px solid #b5472d; margin-top: 24px; padding-left: 14px; }
    @media print { body { margin: 18mm; } }
  </style>
</head>
<body>
  <header>
    <h1>Bibi Bolsas - Prévia fiscal</h1>
    <p>Pedido ${escapeHtml(preview.orderNumber)} · Gerado em ${generatedAt}</p>
    <span class="marker">${escapeHtml(preview.marker)}</span>
  </header>

  <dl>
    <dt>Cliente</dt><dd>${escapeHtml(preview.customerName)}</dd>
    <dt>CPF</dt><dd>${escapeHtml(preview.customerCpfMasked || 'Não informado')}</dd>
    <dt>Entrega</dt><dd>${escapeHtml(preview.shippingAddress)}</dd>
  </dl>

  <table>
    <thead>
      <tr><th>Produto</th><th>SKU</th><th>Qtd</th><th>Unitário</th><th>Total</th></tr>
    </thead>
    <tbody>${items}</tbody>
  </table>

  <section class="totals">
    <div><span>Subtotal</span><strong>${formatPrice(preview.subtotalCents)}</strong></div>
    <div><span>Desconto</span><strong>${formatPrice(preview.discountCents)}</strong></div>
    <div><span>Frete</span><strong>${formatPrice(preview.shippingCents)}</strong></div>
    <div class="total"><span>Total</span><strong>${formatPrice(preview.totalCents)}</strong></div>
  </section>

  <section class="issues">
    <strong>Pendências</strong>
    <ul>${issues}</ul>
  </section>
</body>
</html>`;
}

function printFiscalPreview(preview: FiscalPreview): void {
  const popup = window.open('', '_blank');
  if (!popup) {
    toast.error({ title: 'Impressão bloqueada', description: 'Não foi possível abrir a janela de impressão.' });
    return;
  }

  popup.document.write(fiscalPrintHtml(preview));
  popup.document.close();
  popup.focus();
  popup.print();
}

export function AdminOrders() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const filters = useMemo<AdminOrderFilters>(() => ({
    status: status === 'all' ? undefined : status,
    search: search.trim() || undefined,
    from: from || undefined,
    to: to || undefined,
    page: 1,
    pageSize: 100,
  }), [from, search, status, to]);
  const { data, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.admin.ordersList(filters),
    queryFn: () => adminService.listOrders(filters),
  });

  const rows = data ?? [];
  const paidCount = rows.filter((order) => order.status === 'paid').length;
  const shippingCount = rows.filter((order) => order.status === 'processing' || order.status === 'shipped').length;
  const pendingCount = rows.filter((order) => order.status === 'pending_payment').length;
  const hasFilters = !!(search || from || to || status !== 'all');

  const statusTabs: TabItem[] = STATUS_FILTERS.map((s) => ({
    value: s,
    label: s === 'all' ? 'Todos' : ORDER_STATUS_LABEL[s],
  }));

  const columns: Column<Order>[] = [
    { key: 'number', header: 'Pedido', render: (o) => <span className="font-medium text-graphite">{o.number}</span> },
    { key: 'date', header: 'Data', render: (o) => <span className="text-graphite-soft">{formatDateShort(o.createdAt)}</span> },
    { key: 'customer', header: 'Cliente', render: (o) => <span className="truncate">{o.shippingAddress.recipient || 'Cliente no detalhe'}</span> },
    { key: 'payment', header: 'Pagamento', render: (o) => <span className="text-graphite-soft">{PAYMENT_LABEL[o.paymentMethod]}</span> },
    { key: 'total', header: 'Total', align: 'right', render: (o) => <span className="font-medium tabular-nums">{formatPrice(o.totalCents)}</span> },
    { key: 'status', header: 'Status', render: (o) => <OrderStatusPill status={o.status} /> },
  ];

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Operação' }, { label: 'Pedidos' }]}
        eyebrow="Operação"
        title="Pedidos"
        subtitle={`${rows.length} ${rows.length === 1 ? 'pedido' : 'pedidos'} no filtro atual.`}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Pagamento pendente" value={<span className={pendingCount ? 'text-warning' : undefined}>{pendingCount}</span>} icon={Clock} loading={isLoading} />
        <StatCard label="Pagos" value={<span className="text-success">{paidCount}</span>} icon={CheckCircle} loading={isLoading} />
        <StatCard label="Operação / envio" value={shippingCount} icon={Truck} loading={isLoading} />
      </div>

      <SectionCard
        eyebrow="Vendas"
        title="Todos os pedidos"
        description="Filtre por status, período ou busque por pedido, cliente, CPF, e-mail ou rastreio."
        bodyClassName="flex flex-col gap-4"
      >
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Pedido, cliente, CPF, e-mail ou rastreio" containerClassName="sm:w-80" />
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Data inicial" className="sm:w-auto" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Data final" className="sm:w-auto" />
          {hasFilters && (
            <>
              <ToolbarSpacer />
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setFrom(''); setTo(''); setStatus('all'); }}>
                <X size={15} /> Limpar filtros
              </Button>
            </>
          )}
        </Toolbar>

        <Tabs items={statusTabs} value={status} onChange={(v) => setStatus(v as OrderStatus | 'all')} />

        <DataTable<Order>
          columns={columns}
          rows={rows}
          rowKey={(o) => o.id}
          loading={isLoading || isFetching}
          onRowClick={(o) => navigate(`/admin/pedidos/${o.id}`)}
          minWidth={720}
          empty={{ icon: FileText, title: 'Nenhum pedido encontrado', description: 'Ajuste os filtros para ver mais resultados.' }}
        />
      </SectionCard>
    </div>
  );
}

export function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusTarget, setStatusTarget] = useState<OrderStatus | ''>('');
  const [statusReason, setStatusReason] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [shipmentForm, setShipmentForm] = useState<ShipmentFormState>({
    carrier: '',
    service: '',
    trackingCode: '',
    trackingUrl: '',
    shippedAt: '',
  });
  const { data: order, isLoading } = useQuery({
    queryKey: queryKeys.admin.order(id!),
    queryFn: () => adminService.getOrder(id!),
    enabled: !!id,
  });
  const historyQuery = useQuery({
    queryKey: queryKeys.admin.orderHistory(id ?? ''),
    queryFn: () => adminService.listOrderHistory(id!),
    enabled: !!id,
  });
  const paymentsQuery = useQuery({
    queryKey: queryKeys.admin.orderPayments(id ?? ''),
    queryFn: () => adminService.listOrderPayments(id!),
    enabled: !!id,
  });
  const webhookEventsQuery = useQuery({
    queryKey: queryKeys.admin.orderWebhookEvents(id ?? ''),
    queryFn: () => adminService.listOrderWebhookEvents(id!),
    enabled: !!id,
  });
  const fiscalPreview = useQuery({
    queryKey: queryKeys.admin.fiscalPreview(id!),
    queryFn: () => adminService.getFiscalPreview(id!),
    enabled: false,
  });
  const generateFiscalPreview = useMutation({
    mutationFn: () => adminService.generateFiscalPreview(id!),
    onSuccess: (preview) => {
      queryClient.setQueryData(queryKeys.admin.fiscalPreview(id!), preview);
      toast.success({ title: 'Prévia fiscal gerada', description: 'Confira os dados antes da emissão real.' });
    },
    onError: (error) => toast.error({ title: 'Falha na prévia fiscal', description: errorMessage(error, 'Tente novamente.') }),
  });
  const downloadFiscalXml = useMutation({
    mutationFn: () => adminService.getFiscalDraftXml(id!),
    onSuccess: (xml) => {
      downloadTextFile(xml, `pedido-${order?.number ?? id}-xml-rascunho.xml`, 'application/xml;charset=utf-8');
      toast.success({ title: 'XML baixado', description: 'O XML de rascunho foi salvo.' });
    },
    onError: (error) => toast.error({ title: 'Falha ao baixar XML', description: errorMessage(error, 'Tente novamente.') }),
  });
  const applyOrderUpdate = async (updated: Order, title: string, description: string) => {
    queryClient.setQueryData(queryKeys.admin.order(id!), updated);
    queryClient.setQueryData(queryKeys.admin.orderHistory(id!), updated.history ?? []);
    await queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders });
    toast.success({ title, description });
  };
  const updateStatus = useMutation({
    mutationFn: () => adminService.updateOrderStatus(id!, statusTarget as OrderStatus, statusReason.trim()),
    onSuccess: (updated) => {
      setStatusTarget('');
      setStatusReason('');
      void applyOrderUpdate(updated, 'Status atualizado', 'A mudança foi registrada na auditoria.');
    },
    onError: (error) => toast.error({ title: 'Não foi possível atualizar', description: errorMessage(error, 'Tente novamente.') }),
  });
  const cancelOrder = useMutation({
    mutationFn: () => adminService.cancelOrder(id!, cancelReason.trim()),
    onSuccess: (updated) => {
      setCancelReason('');
      setCancelOpen(false);
      void applyOrderUpdate(updated, 'Pedido cancelado', 'Reservas e cupom foram liberados; registro em auditoria.');
    },
    onError: (error) => toast.error({ title: 'Não foi possível cancelar', description: errorMessage(error, 'Tente novamente.') }),
  });
  const registerShipment = useMutation({
    mutationFn: () => adminService.registerShipment(id!, shipmentForm),
    onSuccess: (updated) => void applyOrderUpdate(updated, 'Envio registrado', 'O rastreio foi vinculado ao pedido.'),
    onError: (error) => toast.error({ title: 'Não foi possível registrar o envio', description: errorMessage(error, 'Tente novamente.') }),
  });
  const updateTracking = useMutation({
    mutationFn: () => adminService.updateTracking(id!, shipmentForm),
    onSuccess: (updated) => void applyOrderUpdate(updated, 'Rastreio atualizado', 'A mudança foi registrada na auditoria.'),
    onError: (error) => toast.error({ title: 'Não foi possível atualizar o rastreio', description: errorMessage(error, 'Tente novamente.') }),
  });

  const preview = generateFiscalPreview.data ?? fiscalPreview.data;
  const historyEvents = historyQuery.data ?? order?.history ?? [];
  const paymentAttempts = paymentsQuery.data ?? (order?.paymentAttempt ? [order.paymentAttempt] : []);
  const webhookEvents = webhookEventsQuery.data ?? [];
  const targets = order ? operationalTargets(order.status) : [];
  const showShipmentForm = order ? canRegisterShipment(order.status) || canUpdateTracking(order.status) : false;
  const shipmentButtonLabel = order && canRegisterShipment(order.status) ? 'Registrar envio' : 'Atualizar rastreio';
  const shipmentMutation = order && canRegisterShipment(order.status) ? registerShipment : updateTracking;
  const shipmentReady = shipmentForm.carrier.trim().length > 0 && shipmentForm.trackingCode.trim().length > 0;

  useEffect(() => {
    if (!order) return;

    setShipmentForm({
      carrier: order.tracking?.carrier || order.shipping.carrier || '',
      service: order.shipping.service || '',
      trackingCode: order.tracking?.code || '',
      trackingUrl: order.tracking?.url || '',
      shippedAt: '',
    });
  }, [order?.id, order?.shipping.carrier, order?.shipping.service, order?.tracking?.carrier, order?.tracking?.code, order?.tracking?.url]);

  if (isLoading || !order) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-cream-light" />
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="h-96 animate-pulse rounded-[var(--radius-lg)] bg-cream-light" />
          <div className="h-96 animate-pulse rounded-[var(--radius-lg)] bg-cream-light" />
        </div>
      </div>
    );
  }

  const itemColumns: Column<Order['items'][number]>[] = [
    {
      key: 'name',
      header: 'Produto',
      render: (it) => (
        <div className="flex items-center gap-3">
          <img src={it.image} alt="" className="h-11 w-10 shrink-0 rounded-md border border-border object-cover" />
          <div className="min-w-0">
            <p className="truncate font-medium text-graphite">{it.name}</p>
            <p className="truncate text-xs text-graphite-soft">{it.colorName}{it.sizeLabel ? ` · ${it.sizeLabel}` : ''}</p>
          </div>
        </div>
      ),
    },
    { key: 'qty', header: 'Qtd', align: 'center', render: (it) => <span className="tabular-nums">{it.quantity}</span> },
    { key: 'price', header: 'Total', align: 'right', render: (it) => <span className="font-medium tabular-nums">{formatPrice(it.unitPriceCents * it.quantity)}</span> },
  ];

  return (
    <div>
      <button onClick={() => navigate('/admin/pedidos')} className="tactile mb-4 flex items-center gap-1 rounded text-sm text-graphite-soft hover:text-graphite">
        <CaretLeft size={16} /> Voltar para pedidos
      </button>
      <PageHeader
        breadcrumbs={[{ label: 'Operação' }, { label: 'Pedidos', to: '/admin/pedidos' }, { label: order.number }]}
        eyebrow="Pedido"
        title={`Pedido ${order.number}`}
        subtitle={`Realizado em ${formatDate(order.createdAt)}`}
        action={<OrderStatusPill status={order.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex min-w-0 flex-col gap-6">
          <SectionCard eyebrow="Conteúdo" title="Itens do pedido" bodyClassName="p-0">
            <DataTable
              columns={itemColumns}
              rows={order.items}
              rowKey={(it: Order['items'][number]) => it.sku}
              className="rounded-none border-0 shadow-none"
              minWidth={480}
            />
          </SectionCard>

          <SectionCard eyebrow="Operação" title="Ações do pedido">
            <div className="flex flex-col gap-6">
              {targets.length > 0 ? (
                <form
                  className="grid gap-3 md:grid-cols-[200px_1fr] md:items-start"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!statusTarget || statusReason.trim().length < 10) return;
                    updateStatus.mutate();
                  }}
                >
                  <Field label="Novo status" required>
                    {(fieldId) => (
                      <Select id={fieldId} value={statusTarget} onChange={(e) => setStatusTarget(e.target.value as OrderStatus | '')}>
                        <option value="">Selecione</option>
                        {targets.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
                      </Select>
                    )}
                  </Field>
                  <div className="flex flex-col gap-3">
                    <Field label="Motivo operacional" hint="Mínimo de 10 caracteres. Entra no histórico do pedido." required>
                      {(fieldId, describedBy) => (
                        <Textarea
                          id={fieldId}
                          aria-describedby={describedBy}
                          rows={3}
                          value={statusReason}
                          onChange={(e) => setStatusReason(e.target.value)}
                          placeholder="Ex.: Pedido conferido e liberado para separação."
                        />
                      )}
                    </Field>
                    <div className="flex justify-end">
                      <Button type="submit" loading={updateStatus.isPending} disabled={!statusTarget || statusReason.trim().length < 10}>
                        <CheckCircle size={16} /> Salvar status
                      </Button>
                    </div>
                  </div>
                </form>
              ) : (
                <Banner tone="info">
                  Não há avanço operacional manual para o status atual. O status financeiro é controlado por pagamento/webhook.
                </Banner>
              )}

              {showShipmentForm && (
                <form
                  className="rounded-[var(--radius-md)] border border-border bg-cream-lighter/40 p-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!shipmentReady) return;
                    shipmentMutation.mutate();
                  }}
                >
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-graphite">
                    <Truck size={17} className="text-terracotta" /> {shipmentButtonLabel}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Transportadora" required>
                      {(fieldId) => (
                        <Input id={fieldId} value={shipmentForm.carrier} onChange={(e) => setShipmentForm((c) => ({ ...c, carrier: e.target.value }))} placeholder="Correios, Melhor Envio..." />
                      )}
                    </Field>
                    <Field label="Serviço">
                      {(fieldId) => (
                        <Input id={fieldId} value={shipmentForm.service} onChange={(e) => setShipmentForm((c) => ({ ...c, service: e.target.value }))} placeholder="PAC, SEDEX, Jadlog..." />
                      )}
                    </Field>
                    <Field label="Código de rastreio" required>
                      {(fieldId) => (
                        <Input id={fieldId} value={shipmentForm.trackingCode} onChange={(e) => setShipmentForm((c) => ({ ...c, trackingCode: e.target.value }))} placeholder="BR123456789BR" />
                      )}
                    </Field>
                    <Field label="URL de rastreio">
                      {(fieldId) => (
                        <Input id={fieldId} type="url" value={shipmentForm.trackingUrl} onChange={(e) => setShipmentForm((c) => ({ ...c, trackingUrl: e.target.value }))} placeholder="https://..." />
                      )}
                    </Field>
                    <Field label="Data de envio">
                      {(fieldId) => (
                        <Input id={fieldId} type="datetime-local" value={shipmentForm.shippedAt} onChange={(e) => setShipmentForm((c) => ({ ...c, shippedAt: e.target.value }))} />
                      )}
                    </Field>
                    <div className="flex items-end">
                      <Button type="submit" loading={shipmentMutation.isPending} disabled={!shipmentReady} fullWidth>
                        {shipmentButtonLabel}
                      </Button>
                    </div>
                  </div>
                </form>
              )}

              {canCancelOperationally(order.status) && (
                <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-danger/25 bg-danger-soft/40 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-graphite">Cancelar pedido</p>
                    <p className="text-xs text-graphite-soft">Disponível enquanto aguarda pagamento. Libera reservas e cupom.</p>
                  </div>
                  <Button variant="danger" size="sm" onClick={() => setCancelOpen(true)}>Cancelar pedido</Button>
                </div>
              )}

              <p className="text-xs text-graphite-soft">
                Toda alteração é validada pela API e registrada no histórico. Reembolso/estorno financeiro fica na fase de pagamentos.
              </p>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Fiscal"
            title="Prévia fiscal"
            action={
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => void fiscalPreview.refetch()} loading={fiscalPreview.isFetching}>
                  <FileText size={16} /> Consultar
                </Button>
                <Button size="sm" onClick={() => generateFiscalPreview.mutate()} loading={generateFiscalPreview.isPending}>
                  <FileText size={16} /> Gerar prévia
                </Button>
              </div>
            }
          >
            <div className="mb-4 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => downloadFiscalXml.mutate()} loading={downloadFiscalXml.isPending}>
                <DownloadSimple size={16} /> XML rascunho
              </Button>
              <Button size="sm" variant="ghost" onClick={() => preview && printFiscalPreview(preview)} disabled={!preview}>
                <Printer size={16} /> Imprimir
              </Button>
            </div>

            {!preview ? (
              <p className="text-sm text-graphite-soft">
                Gere ou consulte uma prévia para conferir destinatário, itens, totais e pendências fiscais antes da emissão real.
              </p>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <StatusBadge tone="warning">{preview.marker}</StatusBadge>
                  <span className="text-graphite-soft">Gerada em {new Date(preview.generatedAt).toLocaleString('pt-BR')}</span>
                </div>

                <dl className="grid gap-2 text-sm sm:grid-cols-[130px_1fr]">
                  <dt className="font-medium text-graphite-soft">Cliente</dt>
                  <dd className="text-graphite">{preview.customerName}</dd>
                  <dt className="font-medium text-graphite-soft">CPF</dt>
                  <dd className="text-graphite">{preview.customerCpfMasked || 'Não informado'}</dd>
                  <dt className="font-medium text-graphite-soft">Entrega</dt>
                  <dd className="text-graphite">{preview.shippingAddress}</dd>
                </dl>

                {preview.pendingIssues.length > 0 ? (
                  <Banner tone="warning" title="Pendências antes da emissão real">
                    <ul className="mt-1 list-disc space-y-1 pl-5">
                      {preview.pendingIssues.map((issue) => <li key={issue}>{issue}</li>)}
                    </ul>
                  </Banner>
                ) : (
                  <Banner tone="success">Nenhuma pendência encontrada para esta prévia.</Banner>
                )}

                <DataTable<FiscalPreview['items'][number]>
                  columns={[
                    { key: 'description', header: 'Produto', render: (item) => item.description },
                    { key: 'sku', header: 'SKU', render: (item) => <span className="font-mono text-xs">{item.sku}</span> },
                    { key: 'qty', header: 'Qtd', align: 'center', render: (item) => item.quantity },
                    { key: 'unit', header: 'Unitário', align: 'right', render: (item) => formatPrice(item.unitPriceCents) },
                    { key: 'total', header: 'Total', align: 'right', render: (item) => formatPrice(item.totalCents) },
                  ]}
                  rows={preview.items}
                  rowKey={(item) => item.sku}
                  minWidth={520}
                />
              </div>
            )}
          </SectionCard>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <SectionCard eyebrow="Entrega" title="Cliente e endereço">
            <p className="font-medium text-graphite">{order.shippingAddress.recipient}</p>
            <p className="mt-1 text-sm text-graphite-soft">{order.shippingAddress.street}, {order.shippingAddress.number}</p>
            <p className="text-sm text-graphite-soft">{order.shippingAddress.district} — {order.shippingAddress.city}/{order.shippingAddress.state}</p>
            <p className="text-sm text-graphite-soft">{formatZip(order.shippingAddress.zip)}</p>
            <p className="mt-3 text-sm font-medium text-graphite">{order.shipping.carrier} · {order.shipping.service}</p>
            {order.tracking && <p className="mt-0.5 text-xs text-graphite-soft">Rastreio: <span className="font-mono">{order.tracking.code}</span></p>}
          </SectionCard>

          <SectionCard eyebrow="Financeiro" title="Resumo">
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between"><dt className="text-graphite-soft">Subtotal</dt><dd className="tabular-nums">{formatPrice(order.subtotalCents)}</dd></div>
              {order.discountCents > 0 && <div className="flex justify-between"><dt className="text-graphite-soft">Desconto</dt><dd className="tabular-nums text-success">− {formatPrice(order.discountCents)}</dd></div>}
              <div className="flex justify-between"><dt className="text-graphite-soft">Frete</dt><dd className="tabular-nums">{formatPrice(order.shippingCents)}</dd></div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatPrice(order.totalCents)}</dd></div>
            </dl>
          </SectionCard>

          <SectionCard eyebrow="Auditoria" title="Histórico">
            {historyQuery.isLoading ? (
              <div className="h-32 animate-pulse rounded-[var(--radius-md)] bg-cream-light" />
            ) : historyEvents.length ? (
              <ol className="flex flex-col gap-3">
                {historyEvents.slice(0, 8).map((event) => (
                  <li key={event.id} className="border-l-2 border-terracotta/40 pl-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-graphite">{historyStatusLabel(event.status)}</p>
                      <time className="text-xs text-graphite-soft">{new Date(event.createdAt).toLocaleString('pt-BR')}</time>
                    </div>
                    <p className="mt-1 text-xs text-graphite-soft">
                      {event.previousStatus ? `${historyStatusLabel(event.previousStatus)} → ` : ''}
                      {event.source || 'Sistema'}
                      {event.changedByUserId ? ` · Usuário #${event.changedByUserId}` : ''}
                    </p>
                    {event.reason && <p className="mt-1 text-xs text-graphite-soft">{event.reason}</p>}
                  </li>
                ))}
              </ol>
            ) : (
              <div className="flex items-start gap-3 text-sm text-graphite-soft">
                <ClockCounterClockwise size={20} className="mt-0.5 shrink-0 text-cinnamon" />
                <p>Nenhum evento registrado.</p>
              </div>
            )}
          </SectionCard>

          <SectionCard eyebrow="Financeiro" title="Pagamentos" bodyClassName="p-0">
            {paymentsQuery.isLoading ? (
              <div className="m-5 h-24 animate-pulse rounded-[var(--radius-md)] bg-cream-light" />
            ) : paymentAttempts.length ? (
              <DataTable<PaymentAttempt>
                columns={[
                  { key: 'provider', header: 'Gateway', render: (a) => a.provider },
                  { key: 'method', header: 'Método', render: (a) => PAYMENT_LABEL[a.method] ?? a.method },
                  { key: 'status', header: 'Status', render: (a) => <StatusBadge tone={paymentTone(a.status)} size="sm">{a.status}</StatusBadge> },
                  { key: 'amount', header: 'Valor', align: 'right', render: (a) => formatPrice(a.amountCents) },
                  { key: 'created', header: 'Criado', render: (a) => formatDateShort(a.createdAt) },
                ]}
                rows={paymentAttempts}
                rowKey={(a) => a.id}
                className="rounded-none border-0 shadow-none"
                minWidth={520}
              />
            ) : (
              <p className="px-5 py-6 text-sm text-graphite-soft">Nenhuma tentativa de pagamento registrada.</p>
            )}
          </SectionCard>

          <SectionCard eyebrow="Integrações" title="Webhooks" bodyClassName="p-0">
            {webhookEventsQuery.isLoading ? (
              <div className="m-5 h-24 animate-pulse rounded-[var(--radius-md)] bg-cream-light" />
            ) : webhookEvents.length ? (
              <DataTable<WebhookEvent>
                columns={[
                  { key: 'provider', header: 'Gateway', render: (e) => e.provider },
                  { key: 'external', header: 'Evento', render: (e) => e.externalEventId ?? '—' },
                  { key: 'status', header: 'Status', render: (e) => <StatusBadge tone={webhookTone(e.status)} size="sm">{e.status}</StatusBadge> },
                  { key: 'hash', header: 'Hash', render: (e) => <span className="font-mono text-xs">{e.payloadHash.slice(0, 12)}</span> },
                  { key: 'received', header: 'Recebido', render: (e) => formatDateShort(e.receivedAt) },
                ]}
                rows={webhookEvents}
                rowKey={(e) => e.id}
                className="rounded-none border-0 shadow-none"
                minWidth={560}
              />
            ) : (
              <p className="px-5 py-6 text-sm text-graphite-soft">Nenhum webhook vinculado a este pedido.</p>
            )}
          </SectionCard>

          <SectionCard eyebrow="Documento" title="Nota fiscal">
            {order.fiscal?.status === 'issued' ? (
              <div className="flex gap-2"><Button size="sm" variant="outline">PDF</Button><Button size="sm" variant="outline">XML</Button></div>
            ) : order.fiscal?.status === 'rejected' ? (
              <Banner tone="danger" title="Nota rejeitada">
                {order.fiscal.rejectionReason}. <button className="font-medium underline">Reprocessar</button>
              </Banner>
            ) : (
              <Banner tone="warning">Em processamento na SEFAZ…</Banner>
            )}
          </SectionCard>
        </div>
      </div>

      {/* Modal: cancelar pedido */}
      <Modal
        open={cancelOpen}
        onClose={() => !cancelOrder.isPending && setCancelOpen(false)}
        size="md"
        title="Cancelar pedido"
        description={`Pedido ${order.number} · aguardando pagamento`}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setCancelOpen(false)} disabled={cancelOrder.isPending}>Voltar</Button>
            <Button variant="danger" size="sm" loading={cancelOrder.isPending} disabled={cancelReason.trim().length < 10} onClick={() => cancelOrder.mutate()}>
              Confirmar cancelamento
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Banner tone="warning">
            O cancelamento libera reservas de estoque e o cupom aplicado, e fica registrado na auditoria. Exige perfil Admin.
          </Banner>
          <Field label="Motivo do cancelamento" hint="Mínimo de 10 caracteres." required>
            {(fieldId, describedBy) => (
              <Textarea
                id={fieldId}
                aria-describedby={describedBy}
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ex.: Cliente solicitou cancelamento antes da confirmação de pagamento."
                autoFocus
              />
            )}
          </Field>
        </div>
      </Modal>
    </div>
  );
}
