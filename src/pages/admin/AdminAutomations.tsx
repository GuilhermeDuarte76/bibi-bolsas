import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowClockwise,
  BellRinging,
  CheckCircle,
  ClockCounterClockwise,
  Lightning,
  PaperPlaneTilt,
  WarningCircle,
  XCircle,
} from '@phosphor-icons/react';
import { adminService, queryKeys } from '@/lib/api';
import type {
  AdminAutomationJobRun,
  AdminAutomationJobType,
  AdminNotificationMessage,
  AdminNotificationType,
} from '@/lib/api/admin.service';
import type { AdminAlert } from '@/types';
import { PageHeader, Panel, AdminTable } from '@/components/admin/AdminUI';
import { Pill } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { cn, formatDateShort } from '@/lib/utils';

type AutomationTab = 'overview' | 'notifications' | 'jobs' | 'alerts';
type AlertAction = { alert: AdminAlert; type: 'resolve' | 'ignore' };

const TABS: { key: AutomationTab; label: string }[] = [
  { key: 'overview', label: 'Visão geral' },
  { key: 'notifications', label: 'Notificações' },
  { key: 'jobs', label: 'Jobs' },
  { key: 'alerts', label: 'Alertas' },
];

const NOTIFICATION_STATUS_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'Pending', label: 'Pendentes' },
  { value: 'Processing', label: 'Processando' },
  { value: 'Sent', label: 'Enviadas' },
  { value: 'Failed', label: 'Falharam' },
  { value: 'Canceled', label: 'Canceladas' },
  { value: 'Skipped', label: 'Ignoradas' },
];

const NOTIFICATION_TYPE_OPTIONS: { value: AdminNotificationType | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'OrderCreated', label: 'Pedido criado' },
  { value: 'PaymentApproved', label: 'Pagamento aprovado' },
  { value: 'PaymentFailed', label: 'Pagamento recusado' },
  { value: 'OrderStatusChanged', label: 'Status do pedido' },
  { value: 'AbandonedCartReminder', label: 'Carrinho abandonado' },
  { value: 'MarketingOffer', label: 'Oferta' },
  { value: 'PasswordReset', label: 'Recuperação de senha' },
  { value: 'EmailChange', label: 'Troca de e-mail' },
  { value: 'JobFailure', label: 'Falha de job' },
];

const JOB_TYPE_OPTIONS: { value: AdminAutomationJobType; label: string }[] = [
  { value: 'RunAllMaintenance', label: 'Manutenção completa' },
  { value: 'ExpireCarts', label: 'Expirar carrinhos' },
  { value: 'ExpireStockReservations', label: 'Expirar reservas de estoque' },
  { value: 'ExpireCouponReservations', label: 'Expirar reservas de cupom' },
  { value: 'CleanupReportExports', label: 'Limpar exportações vencidas' },
  { value: 'SyncAdminAlerts', label: 'Sincronizar alertas' },
  { value: 'QueueAbandonedCartReminders', label: 'Enfileirar carrinhos abandonados' },
  { value: 'DispatchNotifications', label: 'Despachar notificações' },
];

const JOB_STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'Running', label: 'Rodando' },
  { value: 'Completed', label: 'Concluídos' },
  { value: 'Failed', label: 'Falharam' },
];

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

const NOTIFICATION_STATUS_LABEL: Record<string, string> = {
  Pending: 'Pendente',
  Processing: 'Processando',
  Sent: 'Enviada',
  Failed: 'Falhou',
  Canceled: 'Cancelada',
  Skipped: 'Ignorada',
};

const NOTIFICATION_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  NOTIFICATION_TYPE_OPTIONS.filter((item) => item.value).map((item) => [item.value, item.label]),
);

const JOB_TYPE_LABEL: Record<string, string> = Object.fromEntries(JOB_TYPE_OPTIONS.map((item) => [item.value, item.label]));

const JOB_STATUS_LABEL: Record<string, string> = {
  Running: 'Rodando',
  Completed: 'Concluído',
  Failed: 'Falhou',
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

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function notificationStatusTone(status?: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'Sent') return 'success';
  if (status === 'Failed') return 'danger';
  if (status === 'Processing') return 'info';
  if (status === 'Canceled' || status === 'Skipped') return 'neutral';
  return 'warning';
}

function jobStatusTone(status?: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'Completed') return 'success';
  if (status === 'Failed') return 'danger';
  if (status === 'Running') return 'info';
  return 'neutral';
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

function NotificationStatusPill({ status }: { status?: string }) {
  return <Pill tone={notificationStatusTone(status)}>{NOTIFICATION_STATUS_LABEL[status || ''] ?? status ?? 'Sem status'}</Pill>;
}

function JobStatusPill({ status }: { status?: string }) {
  return <Pill tone={jobStatusTone(status)}>{JOB_STATUS_LABEL[status || ''] ?? status ?? 'Sem status'}</Pill>;
}

function AlertStatusPill({ status }: { status?: string }) {
  return <Pill tone={alertStatusTone(status)}>{ALERT_STATUS_LABEL[status || ''] ?? status ?? 'Sem status'}</Pill>;
}

function AlertSeverityPill({ severity }: { severity?: string }) {
  return <Pill tone={alertSeverityTone(severity)}>{ALERT_SEVERITY_LABEL[severity || ''] ?? severity ?? 'Sem gravidade'}</Pill>;
}

function Metric({
  label,
  value,
  tone = 'graphite',
}: {
  label: string;
  value: string | number;
  tone?: 'graphite' | 'success' | 'warning' | 'danger' | 'info';
}) {
  const colors = {
    graphite: 'text-graphite',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
    info: 'text-travel-blue',
  };

  return (
    <Panel>
      <p className="text-sm text-graphite-soft">{label}</p>
      <p className={cn('mt-2 text-2xl font-semibold', colors[tone])}>{value}</p>
    </Panel>
  );
}

function NotificationsPanel({
  notifications,
  isLoading,
  selectedId,
  setSelectedId,
}: {
  notifications: AdminNotificationMessage[];
  isLoading: boolean;
  selectedId?: string;
  setSelectedId: (id: string) => void;
}) {
  return (
    <Panel title="Fila de notificações">
      {isLoading ? (
        <Skeleton className="h-72 w-full rounded-[var(--radius-lg)]" />
      ) : (
        <AdminTable<AdminNotificationMessage>
          rowKey={(notification) => notification.id}
          rows={notifications}
          empty="Nenhuma notificação encontrada."
          onRowClick={(notification) => setSelectedId(notification.id)}
          columns={[
            {
              key: 'message',
              header: 'Notificação',
              render: (notification) => (
                <div className={cn(selectedId === notification.id && 'font-medium')}>
                  <p>{notification.subject || NOTIFICATION_TYPE_LABEL[notification.type] || notification.type}</p>
                  <p className="text-xs text-graphite-soft">{notification.recipientMasked}</p>
                </div>
              ),
            },
            { key: 'type', header: 'Tipo', render: (notification) => NOTIFICATION_TYPE_LABEL[notification.type] ?? notification.type },
            { key: 'channel', header: 'Canal', render: (notification) => notification.channel },
            { key: 'status', header: 'Status', render: (notification) => <NotificationStatusPill status={notification.status} /> },
            { key: 'attempts', header: 'Tent.', render: (notification) => notification.attemptCount },
            { key: 'scheduled', header: 'Agendada', render: (notification) => formatDateShort(notification.scheduledAt) },
            { key: 'error', header: 'Erro', render: (notification) => notification.lastError ?? '-' },
          ]}
        />
      )}
    </Panel>
  );
}

function JobsPanel({
  runs,
  isLoading,
}: {
  runs: AdminAutomationJobRun[];
  isLoading: boolean;
}) {
  return (
    <Panel title="Execuções de jobs">
      {isLoading ? (
        <Skeleton className="h-72 w-full rounded-[var(--radius-lg)]" />
      ) : (
        <AdminTable<AdminAutomationJobRun>
          rowKey={(run) => run.id}
          rows={runs}
          empty="Nenhum job encontrado."
          columns={[
            { key: 'job', header: 'Job', render: (run) => JOB_TYPE_LABEL[run.jobType] ?? run.jobType },
            { key: 'status', header: 'Status', render: (run) => <JobStatusPill status={run.status} /> },
            { key: 'trigger', header: 'Gatilho', render: (run) => run.trigger },
            { key: 'processed', header: 'Processados', render: (run) => run.itemsProcessed },
            { key: 'ok', header: 'Sucesso', render: (run) => run.itemsSucceeded },
            { key: 'fail', header: 'Falhas', render: (run) => run.itemsFailed },
            { key: 'started', header: 'Início', render: (run) => formatDateShort(run.startedAt) },
            { key: 'error', header: 'Erro', render: (run) => run.errorMessage ?? '-' },
          ]}
        />
      )}
    </Panel>
  );
}

function AlertsPanel({
  alerts,
  isLoading,
  startAction,
}: {
  alerts: AdminAlert[];
  isLoading: boolean;
  startAction: (alert: AdminAlert, type: AlertAction['type']) => void;
}) {
  return (
    <Panel title="Alertas operacionais">
      {isLoading ? (
        <Skeleton className="h-72 w-full rounded-[var(--radius-lg)]" />
      ) : (
        <AdminTable<AdminAlert>
          rowKey={(alert) => alert.id}
          rows={alerts}
          empty="Nenhum alerta encontrado."
          columns={[
            { key: 'severity', header: 'Gravidade', render: (alert) => <AlertSeverityPill severity={alert.severity} /> },
            {
              key: 'alert',
              header: 'Alerta',
              render: (alert) => (
                <div className="max-w-[360px]">
                  <p className="font-medium text-graphite">{alert.title}</p>
                  <p className="mt-1 text-xs leading-5 text-graphite-soft">{alert.message}</p>
                </div>
              ),
            },
            { key: 'type', header: 'Tipo', render: (alert) => ALERT_TYPE_LABEL[alert.type] ?? alert.type },
            { key: 'created', header: 'Criado', render: (alert) => formatDateShort(alert.createdAt) },
            { key: 'status', header: 'Status', render: (alert) => <AlertStatusPill status={alert.status} /> },
            {
              key: 'actions',
              header: 'Ações',
              render: (alert) => {
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
              },
            },
          ]}
        />
      )}
    </Panel>
  );
}

export function AdminAutomations() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AutomationTab>('overview');
  const [notificationStatus, setNotificationStatus] = useState('Pending');
  const [notificationType, setNotificationType] = useState('');
  const [notificationUserId, setNotificationUserId] = useState('');
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | undefined>();
  const [olderThanHours, setOlderThanHours] = useState('24');
  const [batchSize, setBatchSize] = useState('50');
  const [jobType, setJobType] = useState<AdminAutomationJobType>('RunAllMaintenance');
  const [jobFilterType, setJobFilterType] = useState('');
  const [jobFilterStatus, setJobFilterStatus] = useState('');
  const [alertStatus, setAlertStatus] = useState('Open');
  const [alertSeverity, setAlertSeverity] = useState('');
  const [selectedAction, setSelectedAction] = useState<AlertAction | null>(null);
  const [reason, setReason] = useState('');

  const notificationFilters = useMemo(() => ({
    status: notificationStatus || undefined,
    type: notificationType || undefined,
    userId: notificationUserId || undefined,
    page: 1,
    pageSize: 50,
  }), [notificationStatus, notificationType, notificationUserId]);
  const jobFilters = useMemo(() => ({
    jobType: jobFilterType || undefined,
    status: jobFilterStatus || undefined,
    page: 1,
    pageSize: 50,
  }), [jobFilterStatus, jobFilterType]);
  const alertFilters = useMemo(() => ({
    status: alertStatus || undefined,
    severity: alertSeverity || undefined,
    page: 1,
    pageSize: 50,
  }), [alertSeverity, alertStatus]);

  const notificationsQuery = useQuery({
    queryKey: queryKeys.admin.notifications(notificationFilters),
    queryFn: () => adminService.listNotifications(notificationFilters),
  });
  const notificationDetailQuery = useQuery({
    queryKey: selectedNotificationId ? queryKeys.admin.notification(selectedNotificationId) : ['admin', 'notifications', 'none'],
    queryFn: () => adminService.getNotification(selectedNotificationId!),
    enabled: !!selectedNotificationId,
  });
  const jobsQuery = useQuery({
    queryKey: queryKeys.admin.automationJobs(jobFilters),
    queryFn: () => adminService.listAutomationJobRuns(jobFilters),
  });
  const alertsQuery = useQuery({
    queryKey: queryKeys.admin.alerts(alertFilters),
    queryFn: () => adminService.listAlerts(alertFilters),
  });

  const invalidateAutomations = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'automation-jobs'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'alerts'] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard }),
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.abandonedCartReport(24) }),
    ]);
  };

  const queueAbandoned = useMutation({
    mutationFn: () => {
      const parsed = Number(olderThanHours);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 720) throw new Error('Horas deve ficar entre 1 e 720.');
      return adminService.queueAbandonedCartReminders(parsed);
    },
    onSuccess: async (queued) => {
      await invalidateAutomations();
      toast.success(`${queued} lembrete(s) enfileirado(s).`);
    },
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel enfileirar lembretes.')),
  });

  const dispatchPending = useMutation({
    mutationFn: () => {
      const parsed = Number(batchSize);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 500) throw new Error('Lote deve ficar entre 1 e 500.');
      return adminService.dispatchPendingNotifications(parsed);
    },
    onSuccess: async (sent) => {
      await invalidateAutomations();
      toast.success(`${sent} notificação(ões) despachada(s).`);
    },
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel despachar notificações.')),
  });

  const runJob = useMutation({
    mutationFn: () => adminService.runAutomationJob(jobType),
    onSuccess: async (run) => {
      await invalidateAutomations();
      toast.success(`${JOB_TYPE_LABEL[run.jobType] ?? run.jobType} executado.`);
    },
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel executar o job.')),
  });

  const closeAlert = useMutation({
    mutationFn: (input: { alertId: string; action: AlertAction['type']; reason: string }) =>
      input.action === 'resolve'
        ? adminService.resolveAlert(input.alertId, input.reason)
        : adminService.ignoreAlert(input.alertId, input.reason),
    onSuccess: async (_, variables) => {
      await invalidateAutomations();
      setSelectedAction(null);
      setReason('');
      toast.success(variables.action === 'resolve' ? 'Alerta resolvido com auditoria.' : 'Alerta ignorado com auditoria.');
    },
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel atualizar o alerta.')),
  });

  const notifications = notificationsQuery.data ?? [];
  const jobs = jobsQuery.data ?? [];
  const alerts = alertsQuery.data ?? [];
  const selectedNotification = notificationDetailQuery.data;
  const notificationCounts = {
    pending: notifications.filter((item) => item.status === 'Pending').length,
    sent: notifications.filter((item) => item.status === 'Sent').length,
    failed: notifications.filter((item) => item.status === 'Failed').length,
    processing: notifications.filter((item) => item.status === 'Processing').length,
  };
  const jobCounts = {
    running: jobs.filter((run) => run.status === 'Running').length,
    completed: jobs.filter((run) => run.status === 'Completed').length,
    failed: jobs.filter((run) => run.status === 'Failed').length,
  };
  const openAlerts = alerts.filter((alert) => alert.status === 'Open' || alert.status === 'InProgress').length;
  const criticalAlerts = alerts.filter((alert) => alert.severity === 'Critical' || alert.severity === 'High').length;
  const reasonError = selectedAction && reason.trim().length > 0 && reason.trim().length < 10 ? 'Informe pelo menos 10 caracteres.' : undefined;
  const canCloseAlert = !!selectedAction && reason.trim().length >= 10 && !closeAlert.isPending;

  const startAlertAction = (alert: AdminAlert, type: AlertAction['type']) => {
    setSelectedAction({ alert, type });
    setReason('');
    setActiveTab('alerts');
  };

  const submitAlertAction = () => {
    if (!selectedAction || !canCloseAlert) return;
    closeAlert.mutate({ alertId: selectedAction.alert.id, action: selectedAction.type, reason });
  };

  const renderFilters = () => {
    if (activeTab === 'notifications') {
      return (
        <Panel title="Filtros de notificações">
          <div className="grid gap-3 md:grid-cols-4">
            <Field label="Status">{(id) => (
              <Select id={id} value={notificationStatus} onChange={(event) => setNotificationStatus(event.target.value)}>
                {NOTIFICATION_STATUS_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
              </Select>
            )}</Field>
            <Field label="Tipo">{(id) => (
              <Select id={id} value={notificationType} onChange={(event) => setNotificationType(event.target.value)}>
                {NOTIFICATION_TYPE_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
              </Select>
            )}</Field>
            <Field label="Usuário ID">{(id) => <Input id={id} value={notificationUserId} onChange={(event) => setNotificationUserId(event.target.value.replace(/\D/g, ''))} />}</Field>
            <div className="flex items-end">
              <Button type="button" variant="ghost" onClick={() => {
                setNotificationStatus('');
                setNotificationType('');
                setNotificationUserId('');
              }}>
                Limpar
              </Button>
            </div>
          </div>
        </Panel>
      );
    }

    if (activeTab === 'jobs') {
      return (
        <Panel title="Filtros de jobs">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Tipo">{(id) => (
              <Select id={id} value={jobFilterType} onChange={(event) => setJobFilterType(event.target.value)}>
                <option value="">Todos</option>
                {JOB_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
            )}</Field>
            <Field label="Status">{(id) => (
              <Select id={id} value={jobFilterStatus} onChange={(event) => setJobFilterStatus(event.target.value)}>
                {JOB_STATUS_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
              </Select>
            )}</Field>
            <div className="flex items-end">
              <Button type="button" variant="ghost" onClick={() => {
                setJobFilterType('');
                setJobFilterStatus('');
              }}>
                Limpar
              </Button>
            </div>
          </div>
        </Panel>
      );
    }

    if (activeTab === 'alerts') {
      return (
        <Panel title="Filtros de alertas">
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <div className="flex flex-wrap items-end gap-2">
              {ALERT_STATUS_FILTERS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant={alertStatus === option.value ? 'secondary' : 'outline'}
                  onClick={() => setAlertStatus(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <Field label="Gravidade">{(id) => (
              <Select id={id} value={alertSeverity} onChange={(event) => setAlertSeverity(event.target.value)}>
                {ALERT_SEVERITY_FILTERS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
              </Select>
            )}</Field>
          </div>
        </Panel>
      );
    }

    return null;
  };

  const renderMain = () => {
    if (activeTab === 'notifications') {
      return (
        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <NotificationsPanel notifications={notifications} isLoading={notificationsQuery.isLoading} selectedId={selectedNotificationId} setSelectedId={setSelectedNotificationId} />
          <Panel title="Detalhe">
            {!selectedNotificationId ? (
              <p className="text-sm text-graphite-soft">Selecione uma notificação para ver corpo, payload e erro.</p>
            ) : notificationDetailQuery.isLoading ? (
              <Skeleton className="h-56 w-full rounded-[var(--radius-lg)]" />
            ) : selectedNotification ? (
              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-medium text-graphite">{selectedNotification.subject || NOTIFICATION_TYPE_LABEL[selectedNotification.type] || selectedNotification.type}</p>
                  <p className="mt-1 text-graphite-soft">{selectedNotification.recipientMasked}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <NotificationStatusPill status={selectedNotification.status} />
                  <Pill tone="info">{selectedNotification.channel}</Pill>
                </div>
                <div className="rounded-[var(--radius-md)] bg-cream-light/60 p-3 text-graphite-soft">{selectedNotification.body}</div>
                {selectedNotification.payloadJson && (
                  <pre className="max-h-48 overflow-auto rounded-[var(--radius-md)] bg-graphite p-3 text-xs text-cream-light">{selectedNotification.payloadJson}</pre>
                )}
                {selectedNotification.lastError && <p className="rounded-[var(--radius-md)] bg-danger-soft p-3 text-danger">{selectedNotification.lastError}</p>}
              </div>
            ) : (
              <p className="text-sm text-danger">Notificação não encontrada.</p>
            )}
          </Panel>
        </div>
      );
    }

    if (activeTab === 'jobs') {
      return <JobsPanel runs={jobs} isLoading={jobsQuery.isLoading} />;
    }

    if (activeTab === 'alerts') {
      return (
        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <AlertsPanel alerts={alerts} isLoading={alertsQuery.isLoading} startAction={startAlertAction} />
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
                <Field label="Justificativa" required error={reasonError} hint="Esse registro entra na auditoria.">
                  {(id, describedBy) => (
                    <Textarea
                      id={id}
                      aria-describedby={describedBy}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="Ex.: Conferido manualmente e ação concluída pela operação."
                    />
                  )}
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant={selectedAction.type === 'ignore' ? 'danger' : 'primary'} loading={closeAlert.isPending} disabled={!canCloseAlert} onClick={submitAlertAction}>
                    {selectedAction.type === 'resolve' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    Confirmar
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setSelectedAction(null)}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <WarningCircle size={22} className="mt-0.5 text-cinnamon" />
                <p className="text-sm leading-6 text-graphite-soft">Selecione um alerta em aberto para registrar resolução ou ignorar com justificativa.</p>
              </div>
            )}
          </Panel>
        </div>
      );
    }

    return (
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Panel title="Ações rápidas">
          <div className="grid gap-4">
            <div className="rounded-[var(--radius-md)] border border-border p-4">
              <div className="flex items-start gap-3">
                <BellRinging size={22} className="mt-0.5 text-cinnamon" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-graphite">Carrinhos abandonados</p>
                  <p className="mt-1 text-sm text-graphite-soft">Enfileira lembretes para clientes elegíveis, respeitando consentimento e deduplicação do backend.</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                    <Input type="number" min={1} max={720} value={olderThanHours} onChange={(event) => setOlderThanHours(event.target.value)} aria-label="Horas para carrinho abandonado" />
                    <Button loading={queueAbandoned.isPending} onClick={() => queueAbandoned.mutate()}>
                      Enfileirar
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[var(--radius-md)] border border-border p-4">
              <div className="flex items-start gap-3">
                <PaperPlaneTilt size={22} className="mt-0.5 text-cinnamon" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-graphite">Despachar pendentes</p>
                  <p className="mt-1 text-sm text-graphite-soft">Processa um lote de notificações pendentes pela fila segura do backend.</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                    <Input type="number" min={1} max={500} value={batchSize} onChange={(event) => setBatchSize(event.target.value)} aria-label="Tamanho do lote" />
                    <Button loading={dispatchPending.isPending} onClick={() => dispatchPending.mutate()}>
                      Despachar
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[var(--radius-md)] border border-border p-4">
              <div className="flex items-start gap-3">
                <ClockCounterClockwise size={22} className="mt-0.5 text-cinnamon" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-graphite">Executar job</p>
                  <p className="mt-1 text-sm text-graphite-soft">Executa rotinas administrativas com registro de resultado.</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                    <Select value={jobType} onChange={(event) => setJobType(event.target.value as AdminAutomationJobType)} aria-label="Job">
                      {JOB_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </Select>
                    <Button loading={runJob.isPending} onClick={() => runJob.mutate()}>
                      Executar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Últimos eventos">
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="font-medium text-graphite">Notificações</p>
                <Button size="sm" variant="ghost" onClick={() => setActiveTab('notifications')}>Abrir</Button>
              </div>
              <div className="space-y-2">
                {notifications.slice(0, 4).map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] bg-cream-light/60 px-3 py-2 text-sm">
                    <span className="truncate">{item.subject || NOTIFICATION_TYPE_LABEL[item.type] || item.type}</span>
                    <NotificationStatusPill status={item.status} />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="font-medium text-graphite">Jobs</p>
                <Button size="sm" variant="ghost" onClick={() => setActiveTab('jobs')}>Abrir</Button>
              </div>
              <div className="space-y-2">
                {jobs.slice(0, 4).map((run) => (
                  <div key={run.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] bg-cream-light/60 px-3 py-2 text-sm">
                    <span className="truncate">{JOB_TYPE_LABEL[run.jobType] ?? run.jobType}</span>
                    <JobStatusPill status={run.status} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        title="Automações"
        subtitle="Fila de notificações, jobs administrativos e alertas com auditoria."
        action={<Pill tone="info"><Lightning size={14} /> Operação segura</Pill>}
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Metric label="Pendentes" value={notificationCounts.pending} tone="warning" />
        <Metric label="Enviadas" value={notificationCounts.sent} tone="success" />
        <Metric label="Falhas" value={notificationCounts.failed + jobCounts.failed} tone="danger" />
        <Metric label="Alertas abertos" value={openAlerts} tone={criticalAlerts ? 'danger' : 'info'} />
      </div>

      <div className="mb-6 overflow-x-auto">
        <div className="flex min-w-max gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'tactile rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                activeTab === tab.key ? 'border-graphite bg-graphite text-cream-light' : 'border-border bg-surface text-graphite hover:border-graphite',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {activeTab === 'overview' && (
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ArrowClockwise size={22} className="text-cinnamon" />
                <div>
                  <p className="font-medium text-graphite">Saúde da automação</p>
                  <p className="text-sm text-graphite-soft">
                    {jobCounts.running} job rodando, {jobCounts.completed} concluído(s), {notificationCounts.processing} notificação(ões) em processamento.
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={() => invalidateAutomations()}>
                <ArrowClockwise size={15} /> Atualizar
              </Button>
            </div>
          </Panel>
        )}

        {renderFilters()}
        {renderMain()}
      </div>
    </div>
  );
}
