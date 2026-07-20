import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowClockwise, CheckCircle, ClockCounterClockwise, WarningCircle, XCircle } from '@phosphor-icons/react';
import { adminService, queryKeys } from '@/lib/api';
import type { AdminAlert, IntegrationStatus, Order, PaymentAttempt, WebhookEvent } from '@/types';
import { PageHeader, Panel, AdminTable } from '@/components/admin/AdminUI';
import { Pill } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, Select, Textarea } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { ORDER_STATUS_LABEL, OrderStatusPill } from '@/lib/orderStatus';
import { formatDate, formatDateShort, formatPrice } from '@/lib/utils';

const STATUS_UI = {
  ok: { icon: CheckCircle, tone: 'success' as const, color: 'text-success', label: 'Operacional' },
  degraded: { icon: WarningCircle, tone: 'warning' as const, color: 'text-warning', label: 'Instável' },
  down: { icon: XCircle, tone: 'danger' as const, color: 'text-danger', label: 'Fora do ar' },
};

const KIND_META: Record<IntegrationStatus['kind'], { title: string; subtitle: string; note: string }> = {
  frete: {
    title: 'Frete',
    subtitle: 'Cotação e etiquetas via gateway logístico (Melhor Envio / Frenet).',
    note: 'O frete é sempre calculado no backend. Em caso de falha, configure o fallback operacional: combinar envio, retirada ou frete fixo por região.',
  },
  pagamento: {
    title: 'Pagamentos',
    subtitle: 'Gateway de pagamento (Pagar.me / Mercado Pago).',
    note: 'O pagamento só é confirmado por webhook validado do gateway — nunca pelo retorno visual do checkout. Webhooks são idempotentes.',
  },
  fiscal: {
    title: 'Fiscal',
    subtitle: 'Emissão de NF-e (Focus NFe / NFE.io / PlugNotas).',
    note: 'Emissão assíncrona em fila. Rejeições aparecem aqui com motivo e ação de reprocessar.',
  },
  automacao: {
    title: 'Automações (n8n)',
    subtitle: 'Workflows operacionais e de marketing com consentimento.',
    note: 'O n8n não é fonte de verdade. A loja continua vendendo mesmo se ele estiver fora do ar. Workflows críticos têm retry e reprocessamento manual.',
  },
  notificacao: { title: 'Notificações', subtitle: 'E-mails transacionais e alertas.', note: '' },
  storage: {
    title: 'Storage',
    subtitle: 'Imagens e arquivos públicos no Cloudflare R2.',
    note: 'Uploads usam URL temporária gerada pelo backend. A leitura pública deve usar r2.dev em desenvolvimento e domínio customizado em produção.',
  },
  monitoramento: {
    title: 'Monitoramento',
    subtitle: 'Observabilidade, erros e alertas técnicos.',
    note: 'Monitoramento não deve bloquear venda em desenvolvimento, mas precisa estar configurado antes da publicação final.',
  },
  backup: {
    title: 'Backup',
    subtitle: 'Rotina de cópia e retenção de dados.',
    note: 'Backups precisam de agenda, retenção e restauração testada antes da operação real.',
  },
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  Pending: 'Pendente',
  Approved: 'Aprovado',
  Failed: 'Falhou',
  Expired: 'Expirado',
  Canceled: 'Cancelado',
  Refunded: 'Reembolsado',
};

const WEBHOOK_STATUS_LABEL: Record<string, string> = {
  Received: 'Recebido',
  Processed: 'Processado',
  Failed: 'Falhou',
  Ignored: 'Ignorado',
};

const ALERT_STATUS_LABEL: Record<string, string> = {
  Open: 'Aberto',
  InProgress: 'Em andamento',
  Resolved: 'Resolvido',
  Ignored: 'Ignorado',
};

const ALERT_SEVERITY_LABEL: Record<string, string> = {
  Low: 'Baixa',
  Medium: 'Média',
  High: 'Alta',
  Critical: 'Crítica',
};

const ALERT_TYPE_LABEL: Record<string, string> = {
  AbandonedCart: 'Carrinho abandonado',
  CouponExpired: 'Cupom expirado',
  LowStock: 'Estoque baixo',
  PaymentExpired: 'Pagamento expirado',
};

const ALERT_STATUS_FILTERS = [
  { value: 'Open', label: 'Abertos' },
  { value: 'InProgress', label: 'Em andamento' },
  { value: 'Resolved', label: 'Resolvidos' },
  { value: 'Ignored', label: 'Ignorados' },
];

const ALERT_SEVERITY_FILTERS = [
  { value: '', label: 'Todas' },
  { value: 'Critical', label: 'Crítica' },
  { value: 'High', label: 'Alta' },
  { value: 'Medium', label: 'Média' },
  { value: 'Low', label: 'Baixa' },
];

type AlertAction = { alert: AdminAlert; type: 'resolve' | 'ignore' };

function paymentTone(status?: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'Approved') return 'success';
  if (status === 'Failed' || status === 'Expired') return 'danger';
  if (status === 'Canceled' || status === 'Refunded') return 'neutral';
  return 'warning';
}

function webhookTone(status?: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'Processed') return 'success';
  if (status === 'Failed') return 'danger';
  if (status === 'Ignored') return 'neutral';
  return 'info';
}

function alertStatusTone(status?: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'Resolved') return 'success';
  if (status === 'Ignored') return 'neutral';
  if (status === 'InProgress') return 'info';
  return 'warning';
}

function alertSeverityTone(severity?: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (severity === 'Critical' || severity === 'High') return 'danger';
  if (severity === 'Medium') return 'warning';
  if (severity === 'Low') return 'info';
  return 'neutral';
}

function PaymentStatusPill({ status }: { status?: string }) {
  return <Pill tone={paymentTone(status)}>{PAYMENT_STATUS_LABEL[status || ''] ?? status ?? 'Sem status'}</Pill>;
}

function WebhookStatusPill({ status }: { status?: string }) {
  return <Pill tone={webhookTone(status)}>{WEBHOOK_STATUS_LABEL[status || ''] ?? status ?? 'Sem status'}</Pill>;
}

function AlertStatusPill({ status }: { status?: string }) {
  return <Pill tone={alertStatusTone(status)}>{ALERT_STATUS_LABEL[status || ''] ?? status ?? 'Sem status'}</Pill>;
}

function AlertSeverityPill({ severity }: { severity?: string }) {
  return <Pill tone={alertSeverityTone(severity)}>{ALERT_SEVERITY_LABEL[severity || ''] ?? severity ?? 'Sem gravidade'}</Pill>;
}

function paymentMethodLabel(method: PaymentAttempt['method']) {
  if (method === 'credit_card') return 'Cartão';
  if (method === 'boleto') return 'Boleto';
  return 'Pix';
}

function paymentAttentionScore(order: Order): number {
  if (order.paymentStatus === 'Failed' || order.paymentStatus === 'Expired') return 0;
  if (order.status === 'pending_payment') return 1;
  if (order.paymentStatus === 'Pending') return 2;
  return 3;
}

function sortPaymentOrders(a: Order, b: Order): number {
  const score = paymentAttentionScore(a) - paymentAttentionScore(b);
  if (score !== 0) return score;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function AdminPaymentsDashboard() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | undefined>();
  const ordersQuery = useQuery({
    queryKey: queryKeys.admin.orders,
    queryFn: () => adminService.listOrders(),
  });
  const integrationsQuery = useQuery({
    queryKey: queryKeys.admin.integrations,
    queryFn: () => adminService.listIntegrations(),
  });

  const orders = [...(ordersQuery.data ?? [])].sort(sortPaymentOrders);
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? orders[0];
  const selectedId = selectedOrder?.id;
  const paymentsQuery = useQuery({
    queryKey: queryKeys.admin.orderPayments(selectedId ?? ''),
    queryFn: () => adminService.listOrderPayments(selectedId!),
    enabled: !!selectedId,
  });
  const webhookEventsQuery = useQuery({
    queryKey: queryKeys.admin.orderWebhookEvents(selectedId ?? ''),
    queryFn: () => adminService.listOrderWebhookEvents(selectedId!),
    enabled: !!selectedId,
  });

  const paymentIntegrations = (integrationsQuery.data ?? []).filter((item) => item.kind === 'pagamento');
  const pendingOrders = orders.filter((order) => order.paymentStatus === 'Pending' || order.status === 'pending_payment').length;
  const failedOrExpired = orders.filter((order) => order.paymentStatus === 'Failed' || order.paymentStatus === 'Expired').length;
  const approvedOrders = orders.filter((order) => order.paymentStatus === 'Approved' || order.status === 'paid' || order.status === 'processing' || order.status === 'shipped' || order.status === 'delivered').length;
  const webhookFailures = (webhookEventsQuery.data ?? []).filter((event) => event.status === 'Failed').length;

  return (
    <div>
      <PageHeader
        title="Pagamentos"
        subtitle="Acompanhamento de tentativas, webhooks e pendências de conciliação."
        action={selectedOrder ? <Link to={`/admin/pedidos/${selectedOrder.id}`} className="text-sm font-medium text-terracotta">Abrir pedido</Link> : undefined}
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Panel>
          <p className="text-sm text-graphite-soft">Pendentes</p>
          <p className="mt-2 text-2xl font-semibold text-graphite">{pendingOrders}</p>
        </Panel>
        <Panel>
          <p className="text-sm text-graphite-soft">Falha/expirado</p>
          <p className="mt-2 text-2xl font-semibold text-danger">{failedOrExpired}</p>
        </Panel>
        <Panel>
          <p className="text-sm text-graphite-soft">Aprovados</p>
          <p className="mt-2 text-2xl font-semibold text-success">{approvedOrders}</p>
        </Panel>
        <Panel>
          <p className="text-sm text-graphite-soft">Falhas webhook</p>
          <p className="mt-2 text-2xl font-semibold text-warning">{webhookFailures}</p>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
        <div className="flex flex-col gap-6">
          <Panel title="Pedidos e pagamento">
            {ordersQuery.isLoading ? (
              <Skeleton className="h-64 w-full rounded-[var(--radius-lg)]" />
            ) : (
              <AdminTable<Order>
                rowKey={(order) => order.id}
                rows={orders}
                onRowClick={(order) => setSelectedOrderId(order.id)}
                empty="Nenhum pedido encontrado."
                columns={[
                  { key: 'order', header: 'Pedido', render: (order) => (
                    <div>
                      <p className="font-medium">{order.number}</p>
                      <p className="text-xs text-graphite-soft">{formatDateShort(order.createdAt)}</p>
                    </div>
                  ) },
                  { key: 'customer', header: 'Cliente', render: (order) => order.shippingAddress.recipient || 'Cliente no detalhe' },
                  { key: 'status', header: 'Pedido', render: (order) => <OrderStatusPill status={order.status} /> },
                  { key: 'payment', header: 'Pagamento', render: (order) => <PaymentStatusPill status={order.paymentStatus} /> },
                  { key: 'total', header: 'Total', render: (order) => formatPrice(order.totalCents) },
                ]}
              />
            )}
          </Panel>

          <Panel title="Integração de pagamento">
            {integrationsQuery.isLoading ? (
              <Skeleton className="h-24 w-full rounded-[var(--radius-lg)]" />
            ) : paymentIntegrations.length ? (
              <div className="space-y-3">
                {paymentIntegrations.map((integration) => {
                  const ui = STATUS_UI[integration.status];
                  const Icon = ui.icon;
                  return (
                    <div key={integration.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border p-4">
                      <div className="flex items-center gap-3">
                        <Icon size={24} weight="fill" className={ui.color} />
                        <div>
                          <p className="font-medium text-graphite">{integration.name}</p>
                          <p className="text-xs text-graphite-soft">Última execução: {formatDate(integration.lastRun)}</p>
                        </div>
                      </div>
                      <Pill tone={ui.tone}>{ui.label}</Pill>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-graphite-soft">Nenhuma integração de pagamento cadastrada no painel.</p>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel
            title={selectedOrder ? `Pedido ${selectedOrder.number}` : 'Pedido'}
            action={selectedOrder ? <PaymentStatusPill status={selectedOrder.paymentStatus} /> : undefined}
          >
            {selectedOrder ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-4"><span className="text-graphite-soft">Cliente</span><strong className="text-right text-graphite">{selectedOrder.shippingAddress.recipient || 'Cliente no detalhe'}</strong></div>
                <div className="flex justify-between gap-4"><span className="text-graphite-soft">Status pedido</span><span>{ORDER_STATUS_LABEL[selectedOrder.status]}</span></div>
                <div className="flex justify-between gap-4"><span className="text-graphite-soft">Total</span><strong>{formatPrice(selectedOrder.totalCents)}</strong></div>
                {selectedOrder.expiresAt && (
                  <div className="flex justify-between gap-4"><span className="text-graphite-soft">Expira em</span><span>{formatDate(selectedOrder.expiresAt)}</span></div>
                )}
              </div>
            ) : (
              <p className="text-sm text-graphite-soft">Selecione um pedido para consultar tentativas e webhooks.</p>
            )}
          </Panel>

          <Panel title="Tentativas de pagamento">
            {paymentsQuery.isLoading ? (
              <Skeleton className="h-40 w-full rounded-[var(--radius-lg)]" />
            ) : (
              <AdminTable<PaymentAttempt>
                rowKey={(attempt) => attempt.id}
                rows={paymentsQuery.data ?? []}
                empty="Nenhuma tentativa registrada para este pedido."
                columns={[
                  { key: 'id', header: 'ID', render: (attempt) => <span className="font-mono text-xs">{attempt.id}</span> },
                  { key: 'provider', header: 'Provider', render: (attempt) => attempt.provider },
                  { key: 'method', header: 'Método', render: (attempt) => paymentMethodLabel(attempt.method) },
                  { key: 'status', header: 'Status', render: (attempt) => <PaymentStatusPill status={attempt.status} /> },
                  { key: 'amount', header: 'Valor', render: (attempt) => formatPrice(attempt.amountCents) },
                ]}
              />
            )}
          </Panel>

          <Panel title="Eventos de webhook">
            {webhookEventsQuery.isLoading ? (
              <Skeleton className="h-40 w-full rounded-[var(--radius-lg)]" />
            ) : (
              <AdminTable<WebhookEvent>
                rowKey={(event) => event.id}
                rows={webhookEventsQuery.data ?? []}
                empty="Nenhum webhook registrado para este pedido."
                columns={[
                  { key: 'provider', header: 'Provider', render: (event) => event.provider },
                  { key: 'event', header: 'Evento', render: (event) => event.externalEventId || <span className="font-mono text-xs">{event.payloadHash.slice(0, 10)}</span> },
                  { key: 'status', header: 'Status', render: (event) => <WebhookStatusPill status={event.status} /> },
                  { key: 'received', header: 'Recebido', render: (event) => formatDateShort(event.receivedAt) },
                  { key: 'error', header: 'Erro', render: (event) => event.errorMessage || '-' },
                ]}
              />
            )}
          </Panel>

          <Panel>
            <div className="flex items-start gap-3">
              <ClockCounterClockwise size={22} className="mt-0.5 text-cinnamon" />
              <p className="text-sm text-graphite-soft">
                Confirmação, falha, expiração e estorno financeiro devem continuar vindo por webhook validado ou rotina de conciliação segura.
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function AdminAlertsDashboard() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('Open');
  const [severityFilter, setSeverityFilter] = useState('');
  const [selectedAction, setSelectedAction] = useState<AlertAction | null>(null);
  const [reason, setReason] = useState('');

  const filters = {
    status: statusFilter || undefined,
    severity: severityFilter || undefined,
    page: 1,
    pageSize: 20,
  };

  const alertsQuery = useQuery({
    queryKey: queryKeys.admin.alerts(filters),
    queryFn: () => adminService.listAlerts(filters),
  });
  const integrationsQuery = useQuery({
    queryKey: queryKeys.admin.integrations,
    queryFn: () => adminService.listIntegrations(),
  });

  const closeAlert = useMutation({
    mutationFn: (input: { alertId: string; action: AlertAction['type']; reason: string }) =>
      input.action === 'resolve'
        ? adminService.resolveAlert(input.alertId, input.reason)
        : adminService.ignoreAlert(input.alertId, input.reason),
    onSuccess: (_, variables) => {
      toast.success(variables.action === 'resolve' ? 'Alerta resolvido com auditoria.' : 'Alerta ignorado com auditoria.');
      setSelectedAction(null);
      setReason('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'alerts'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel atualizar o alerta.');
    },
  });

  const alerts = alertsQuery.data ?? [];
  const automationIntegrations = (integrationsQuery.data ?? []).filter((item) => item.kind === 'automacao');
  const openCount = alerts.filter((alert) => alert.status === 'Open' || alert.status === 'InProgress').length;
  const criticalCount = alerts.filter((alert) => alert.severity === 'Critical' || alert.severity === 'High').length;
  const resolvedCount = alerts.filter((alert) => alert.status === 'Resolved' || alert.status === 'Ignored').length;
  const reasonError = selectedAction && reason.trim().length > 0 && reason.trim().length < 10 ? 'Informe pelo menos 10 caracteres.' : undefined;
  const canSubmit = !!selectedAction && reason.trim().length >= 10 && !closeAlert.isPending;

  const submitAction = () => {
    if (!selectedAction || !canSubmit) return;
    closeAlert.mutate({
      alertId: selectedAction.alert.id,
      action: selectedAction.type,
      reason,
    });
  };

  const startAction = (alert: AdminAlert, type: AlertAction['type']) => {
    setSelectedAction({ alert, type });
    setReason('');
  };

  return (
    <div>
      <PageHeader
        title="Alertas"
        subtitle="Pendências operacionais sincronizadas pelo backend, com fechamento auditado."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Panel>
          <p className="text-sm text-graphite-soft">Em aberto</p>
          <p className="mt-2 text-2xl font-semibold text-graphite">{openCount}</p>
        </Panel>
        <Panel>
          <p className="text-sm text-graphite-soft">Alta prioridade</p>
          <p className="mt-2 text-2xl font-semibold text-danger">{criticalCount}</p>
        </Panel>
        <Panel>
          <p className="text-sm text-graphite-soft">Fechados neste filtro</p>
          <p className="mt-2 text-2xl font-semibold text-success">{resolvedCount}</p>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="flex flex-col gap-6">
          <Panel title="Fila de alertas">
            <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px]">
              <div className="flex flex-wrap gap-2">
                {ALERT_STATUS_FILTERS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant={statusFilter === option.value ? 'secondary' : 'outline'}
                    onClick={() => setStatusFilter(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              <Field label="Gravidade">
                {(id, describedBy) => (
                  <Select id={id} aria-describedby={describedBy} value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)}>
                    {ALERT_SEVERITY_FILTERS.map((option) => (
                      <option key={option.value || 'all'} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>

            {alertsQuery.isLoading ? (
              <Skeleton className="h-72 w-full rounded-[var(--radius-lg)]" />
            ) : (
              <AdminTable<AdminAlert>
                rowKey={(alert) => alert.id}
                rows={alerts}
                empty="Nenhum alerta encontrado para os filtros atuais."
                columns={[
                  { key: 'severity', header: 'Gravidade', render: (alert) => <AlertSeverityPill severity={alert.severity} /> },
                  { key: 'alert', header: 'Alerta', render: (alert) => (
                    <div className="max-w-[360px]">
                      <p className="font-medium text-graphite">{alert.title}</p>
                      <p className="mt-1 text-xs leading-5 text-graphite-soft">{alert.message}</p>
                    </div>
                  ) },
                  { key: 'type', header: 'Tipo', render: (alert) => ALERT_TYPE_LABEL[alert.type] ?? alert.type },
                  { key: 'entity', header: 'Entidade', render: (alert) => (
                    <span className="font-mono text-xs">{alert.entityName ? `${alert.entityName} #${alert.entityId ?? '-'}` : '-'}</span>
                  ) },
                  { key: 'created', header: 'Criado em', render: (alert) => formatDateShort(alert.createdAt) },
                  { key: 'status', header: 'Status', render: (alert) => <AlertStatusPill status={alert.status} /> },
                  { key: 'actions', header: 'Ações', render: (alert) => {
                    const canClose = alert.status === 'Open' || alert.status === 'InProgress';
                    if (!canClose) return alert.resolutionReason ? <span className="text-xs text-graphite-soft">{alert.resolutionReason}</span> : '-';

                    return (
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => startAction(alert, 'resolve')}>
                          <CheckCircle size={15} /> Resolver
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => startAction(alert, 'ignore')}>
                          <XCircle size={15} /> Ignorar
                        </Button>
                      </div>
                    );
                  } },
                ]}
              />
            )}
          </Panel>

          <Panel title="Automações n8n">
            {integrationsQuery.isLoading ? (
              <Skeleton className="h-24 w-full rounded-[var(--radius-lg)]" />
            ) : automationIntegrations.length ? (
              <div className="space-y-3">
                {automationIntegrations.map((integration) => {
                  const ui = STATUS_UI[integration.status];
                  const Icon = ui.icon;
                  return (
                    <div key={integration.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border p-4">
                      <div className="flex items-center gap-3">
                        <Icon size={24} weight="fill" className={ui.color} />
                        <div>
                          <p className="font-medium text-graphite">{integration.name}</p>
                          <p className="text-xs text-graphite-soft">Última execução: {formatDate(integration.lastRun)}</p>
                        </div>
                      </div>
                      <Pill tone={ui.tone}>{ui.label}</Pill>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-graphite-soft">Nenhuma automação cadastrada no painel.</p>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel
            title={selectedAction ? (selectedAction.type === 'resolve' ? 'Resolver alerta' : 'Ignorar alerta') : 'Tratamento'}
            action={selectedAction ? <AlertSeverityPill severity={selectedAction.alert.severity} /> : undefined}
          >
            {selectedAction ? (
              <div className="space-y-4">
                <div>
                  <p className="font-medium text-graphite">{selectedAction.alert.title}</p>
                  <p className="mt-1 text-sm leading-6 text-graphite-soft">{selectedAction.alert.message}</p>
                </div>
                <Field label="Justificativa" required error={reasonError} hint="Essa informação fica registrada para auditoria.">
                  {(id, describedBy) => (
                    <Textarea
                      id={id}
                      aria-describedby={describedBy}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="Ex.: Estoque conferido manualmente e alerta encerrado pela operação."
                    />
                  )}
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={selectedAction.type === 'ignore' ? 'danger' : 'primary'}
                    loading={closeAlert.isPending}
                    disabled={!canSubmit}
                    onClick={submitAction}
                  >
                    {selectedAction.type === 'resolve' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    {selectedAction.type === 'resolve' ? 'Confirmar resolução' : 'Confirmar ignorar'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setSelectedAction(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <WarningCircle size={22} className="mt-0.5 text-cinnamon" />
                <p className="text-sm leading-6 text-graphite-soft">
                  Selecione um alerta em aberto para registrar a resolução ou ignorar com motivo operacional.
                </p>
              </div>
            )}
          </Panel>

          <Panel>
            <div className="flex items-start gap-3">
              <ClockCounterClockwise size={22} className="mt-0.5 text-cinnamon" />
              <p className="text-sm leading-6 text-graphite-soft">
                Alertas são gerados pelo backend e podem ser consumidos por automações, mas o fechamento sempre passa pela API para preservar auditoria.
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function IntegrationPage({ kind }: { kind: IntegrationStatus['kind'] }) {
  const { data, isLoading } = useQuery({ queryKey: queryKeys.admin.integrations, queryFn: () => adminService.listIntegrations() });
  const meta = KIND_META[kind];
  const items = (data ?? []).filter((i) => i.kind === kind);

  return (
    <div>
      <PageHeader title={meta.title} subtitle={meta.subtitle} />

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-[var(--radius-lg)]" />
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((i) => {
            const ui = STATUS_UI[i.status];
            const Icon = ui.icon;
            return (
              <Panel key={i.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Icon size={26} weight="fill" className={ui.color} />
                    <div>
                      <h3 className="font-semibold text-graphite">{i.name}</h3>
                      <p className="text-xs text-graphite-soft">Última execução: {formatDate(i.lastRun)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Pill tone={ui.tone}>{ui.label}</Pill>
                    <Button size="sm" variant="outline" onClick={() => toast.success(`${i.name}: reprocessamento disparado (mock)`)}>
                      <ArrowClockwise size={15} /> Reprocessar
                    </Button>
                  </div>
                </div>
                {i.message && (
                  <p className={`mt-3 rounded-[var(--radius-md)] px-3 py-2 text-sm ${i.status === 'down' ? 'bg-danger-soft text-danger' : 'bg-warning-soft text-warning'}`}>
                    {i.message}
                  </p>
                )}
              </Panel>
            );
          })}

          {meta.note && (
            <div className="rounded-[var(--radius-lg)] border border-border bg-cream-light/50 p-4 text-sm text-graphite-soft">
              <strong className="text-graphite">Regra de negócio:</strong> {meta.note}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const AdminShipping = () => <IntegrationPage kind="frete" />;
export const AdminPayments = () => <AdminPaymentsDashboard />;
export const AdminFiscal = () => <IntegrationPage kind="fiscal" />;
export const AdminAutomations = () => <AdminAlertsDashboard />;
