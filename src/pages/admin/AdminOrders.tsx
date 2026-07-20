import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CaretLeft, DownloadSimple, FileText, Printer, WarningCircle } from '@phosphor-icons/react';
import { adminService, queryKeys } from '@/lib/api';
import type { FiscalPreview, Order, OrderStatus, PaymentMethod } from '@/types';
import { PageHeader, AdminTable, Panel } from '@/components/admin/AdminUI';
import { ORDER_STATUS_LABEL, OrderStatusPill } from '@/lib/orderStatus';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { toast } from '@/components/ui/Toast';
import { formatDate, formatDateShort, formatPrice, formatZip } from '@/lib/utils';

const STATUS_FILTERS: (OrderStatus | 'all')[] = ['all', 'pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'canceled'];

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
    toast.error('Nao foi possivel abrir a janela de impressão.');
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
            { key: 'customer', header: 'Cliente', render: (o) => o.shippingAddress.recipient || 'Cliente no detalhe' },
            { key: 'payment', header: 'Pagamento', render: (o) => PAYMENT_LABEL[o.paymentMethod] },
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
  const queryClient = useQueryClient();
  const [statusTarget, setStatusTarget] = useState<OrderStatus | ''>('');
  const [statusReason, setStatusReason] = useState('');
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
  const fiscalPreview = useQuery({
    queryKey: queryKeys.admin.fiscalPreview(id!),
    queryFn: () => adminService.getFiscalPreview(id!),
    enabled: false,
  });
  const generateFiscalPreview = useMutation({
    mutationFn: () => adminService.generateFiscalPreview(id!),
    onSuccess: (preview) => {
      queryClient.setQueryData(queryKeys.admin.fiscalPreview(id!), preview);
      toast.success('Prévia fiscal gerada.');
    },
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel gerar a prévia fiscal.')),
  });
  const downloadFiscalXml = useMutation({
    mutationFn: () => adminService.getFiscalDraftXml(id!),
    onSuccess: (xml) => {
      downloadTextFile(xml, `pedido-${order?.number ?? id}-xml-rascunho.xml`, 'application/xml;charset=utf-8');
      toast.success('XML de rascunho baixado.');
    },
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel baixar o XML.')),
  });
  const applyOrderUpdate = async (updated: Order, message: string) => {
    queryClient.setQueryData(queryKeys.admin.order(id!), updated);
    await queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders });
    toast.success(message);
  };
  const updateStatus = useMutation({
    mutationFn: () => adminService.updateOrderStatus(id!, statusTarget as OrderStatus, statusReason.trim()),
    onSuccess: (updated) => {
      setStatusTarget('');
      setStatusReason('');
      void applyOrderUpdate(updated, 'Status atualizado e registrado na auditoria.');
    },
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel atualizar o status.')),
  });
  const cancelOrder = useMutation({
    mutationFn: () => adminService.cancelOrder(id!, cancelReason.trim()),
    onSuccess: (updated) => {
      setCancelReason('');
      void applyOrderUpdate(updated, 'Pedido cancelado com registro de auditoria.');
    },
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel cancelar o pedido.')),
  });
  const registerShipment = useMutation({
    mutationFn: () => adminService.registerShipment(id!, shipmentForm),
    onSuccess: (updated) => void applyOrderUpdate(updated, 'Envio registrado com rastreio.'),
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel registrar o envio.')),
  });
  const updateTracking = useMutation({
    mutationFn: () => adminService.updateTracking(id!, shipmentForm),
    onSuccess: (updated) => void applyOrderUpdate(updated, 'Rastreio atualizado com registro de auditoria.'),
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel atualizar o rastreio.')),
  });

  const preview = generateFiscalPreview.data ?? fiscalPreview.data;
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
            <div className="space-y-6">
              {targets.length > 0 ? (
                <form
                  className="grid gap-3 md:grid-cols-[220px_1fr_auto]"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!statusTarget || statusReason.trim().length < 10) return;
                    updateStatus.mutate();
                  }}
                >
                  <Field label="Novo status" required>
                    {(fieldId) => (
                      <Select
                        id={fieldId}
                        value={statusTarget}
                        onChange={(event) => setStatusTarget(event.target.value as OrderStatus | '')}
                      >
                        <option value="">Selecione</option>
                        {targets.map((status) => <option key={status} value={status}>{ORDER_STATUS_LABEL[status]}</option>)}
                      </Select>
                    )}
                  </Field>
                  <Field label="Motivo operacional" hint="Mínimo de 10 caracteres. Esse texto entra no histórico do pedido." required>
                    {(fieldId, describedBy) => (
                      <Textarea
                        id={fieldId}
                        aria-describedby={describedBy}
                        rows={3}
                        value={statusReason}
                        onChange={(event) => setStatusReason(event.target.value)}
                        placeholder="Ex.: Pedido conferido e liberado para separação."
                      />
                    )}
                  </Field>
                  <Button
                    type="submit"
                    className="self-end"
                    loading={updateStatus.isPending}
                    disabled={!statusTarget || statusReason.trim().length < 10}
                  >
                    Salvar status
                  </Button>
                </form>
              ) : (
                <p className="text-sm text-graphite-soft">
                  Não há avanço operacional manual disponível para o status atual. Status financeiro é controlado por pagamento/webhook.
                </p>
              )}

              {showShipmentForm && (
                <form
                  className="rounded-[var(--radius-md)] border border-border bg-cream-light/35 p-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!shipmentReady) return;
                    shipmentMutation.mutate();
                  }}
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Transportadora" required>
                      {(fieldId) => (
                        <Input
                          id={fieldId}
                          value={shipmentForm.carrier}
                          onChange={(event) => setShipmentForm((current) => ({ ...current, carrier: event.target.value }))}
                          placeholder="Correios, Melhor Envio..."
                        />
                      )}
                    </Field>
                    <Field label="Serviço">
                      {(fieldId) => (
                        <Input
                          id={fieldId}
                          value={shipmentForm.service}
                          onChange={(event) => setShipmentForm((current) => ({ ...current, service: event.target.value }))}
                          placeholder="PAC, SEDEX, Jadlog..."
                        />
                      )}
                    </Field>
                    <Field label="Código de rastreio" required>
                      {(fieldId) => (
                        <Input
                          id={fieldId}
                          value={shipmentForm.trackingCode}
                          onChange={(event) => setShipmentForm((current) => ({ ...current, trackingCode: event.target.value }))}
                          placeholder="BR123456789BR"
                        />
                      )}
                    </Field>
                    <Field label="URL de rastreio">
                      {(fieldId) => (
                        <Input
                          id={fieldId}
                          type="url"
                          value={shipmentForm.trackingUrl}
                          onChange={(event) => setShipmentForm((current) => ({ ...current, trackingUrl: event.target.value }))}
                          placeholder="https://..."
                        />
                      )}
                    </Field>
                    <Field label="Data de envio">
                      {(fieldId) => (
                        <Input
                          id={fieldId}
                          type="datetime-local"
                          value={shipmentForm.shippedAt}
                          onChange={(event) => setShipmentForm((current) => ({ ...current, shippedAt: event.target.value }))}
                        />
                      )}
                    </Field>
                    <div className="flex items-end">
                      <Button
                        type="submit"
                        loading={shipmentMutation.isPending}
                        disabled={!shipmentReady}
                      >
                        {shipmentButtonLabel}
                      </Button>
                    </div>
                  </div>
                </form>
              )}

              {canCancelOperationally(order.status) && (
                <form
                  className="rounded-[var(--radius-md)] border border-danger/25 bg-danger/5 p-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (cancelReason.trim().length < 10) return;
                    cancelOrder.mutate();
                  }}
                >
                  <Field
                    label="Cancelar pedido"
                    hint="Exige perfil Admin. O motivo fica registrado na auditoria e reservas/cupom são liberados pelo backend."
                    required
                  >
                    {(fieldId, describedBy) => (
                      <Textarea
                        id={fieldId}
                        aria-describedby={describedBy}
                        rows={3}
                        value={cancelReason}
                        onChange={(event) => setCancelReason(event.target.value)}
                        placeholder="Ex.: Cliente solicitou cancelamento antes da confirmação de pagamento."
                      />
                    )}
                  </Field>
                  <Button
                    type="submit"
                    variant="danger"
                    className="mt-3"
                    loading={cancelOrder.isPending}
                    disabled={cancelReason.trim().length < 10}
                  >
                    Cancelar pedido
                  </Button>
                </form>
              )}
            </div>
            <p className="mt-4 text-xs text-graphite-soft">
              Toda alteração é validada pela API e registrada no histórico do pedido. Reembolso/estorno financeiro ficará na fase de pagamentos.
            </p>
          </Panel>

          <Panel title="Prévia fiscal">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => void fiscalPreview.refetch()}
                loading={fiscalPreview.isFetching}
              >
                <FileText size={16} /> Consultar
              </Button>
              <Button
                size="sm"
                onClick={() => generateFiscalPreview.mutate()}
                loading={generateFiscalPreview.isPending}
              >
                <FileText size={16} /> Gerar prévia
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => downloadFiscalXml.mutate()}
                loading={downloadFiscalXml.isPending}
              >
                <DownloadSimple size={16} /> XML rascunho
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => preview && printFiscalPreview(preview)}
                disabled={!preview}
              >
                <Printer size={16} /> Imprimir
              </Button>
            </div>

            {!preview ? (
              <p className="mt-4 text-sm text-graphite-soft">
                Gere ou consulte uma prévia para conferir dados do destinatário, itens, totais e pendências fiscais antes da emissão real.
              </p>
            ) : (
              <div className="mt-5 space-y-5">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-full border border-warning/40 bg-warning/10 px-3 py-1 font-medium text-warning">
                    {preview.marker}
                  </span>
                  <span className="text-graphite-soft">Gerada em {new Date(preview.generatedAt).toLocaleString('pt-BR')}</span>
                </div>

                <dl className="grid gap-3 text-sm sm:grid-cols-[140px_1fr]">
                  <dt className="font-medium text-graphite-soft">Cliente</dt>
                  <dd className="text-graphite">{preview.customerName}</dd>
                  <dt className="font-medium text-graphite-soft">CPF</dt>
                  <dd className="text-graphite">{preview.customerCpfMasked || 'Não informado'}</dd>
                  <dt className="font-medium text-graphite-soft">Entrega</dt>
                  <dd className="text-graphite">{preview.shippingAddress}</dd>
                </dl>

                {preview.pendingIssues.length > 0 ? (
                  <div className="border-l-4 border-warning pl-4">
                    <div className="flex items-center gap-2 font-medium text-warning">
                      <WarningCircle size={18} /> Pendências antes da emissão real
                    </div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-graphite-soft">
                      {preview.pendingIssues.map((issue) => <li key={issue}>{issue}</li>)}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-success">Nenhuma pendência encontrada para esta prévia.</p>
                )}

                <AdminTable<FiscalPreview['items'][number]>
                  rowKey={(item) => item.sku}
                  rows={preview.items}
                  columns={[
                    { key: 'description', header: 'Produto', render: (item) => item.description },
                    { key: 'sku', header: 'SKU', render: (item) => <span className="font-mono text-xs">{item.sku}</span> },
                    { key: 'qty', header: 'Qtd', render: (item) => item.quantity },
                    { key: 'unit', header: 'Unitário', render: (item) => formatPrice(item.unitPriceCents) },
                    { key: 'total', header: 'Total', render: (item) => formatPrice(item.totalCents) },
                  ]}
                />
              </div>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel title="Cliente e entrega">
            <p className="font-medium text-graphite">{order.shippingAddress.recipient}</p>
            <p className="mt-1 text-sm text-graphite-soft">{order.shippingAddress.street}, {order.shippingAddress.number}</p>
            <p className="text-sm text-graphite-soft">{order.shippingAddress.district} - {order.shippingAddress.city}/{order.shippingAddress.state}</p>
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

          <Panel title="Histórico">
            {order.history?.length ? (
              <ol className="space-y-3">
                {order.history.slice(0, 6).map((event) => (
                  <li key={event.id} className="border-l-2 border-border pl-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-graphite">{historyStatusLabel(event.status)}</p>
                      <time className="text-xs text-graphite-soft">{new Date(event.createdAt).toLocaleString('pt-BR')}</time>
                    </div>
                    {event.reason && <p className="mt-1 text-xs text-graphite-soft">{event.reason}</p>}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-graphite-soft">Nenhum evento registrado.</p>
            )}
          </Panel>

          <Panel title="Nota fiscal">
            {order.fiscal?.status === 'issued' ? (
              <div className="flex gap-2"><Button size="sm" variant="outline">PDF</Button><Button size="sm" variant="outline">XML</Button></div>
            ) : order.fiscal?.status === 'rejected' ? (
              <p className="text-sm text-danger">Rejeitada: {order.fiscal.rejectionReason}. <button className="underline">Reprocessar</button></p>
            ) : (
              <p className="text-sm text-warning">Em processamento na SEFAZ...</p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
