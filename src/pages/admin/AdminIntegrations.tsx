import { useQuery } from '@tanstack/react-query';
import { ArrowClockwise, CheckCircle, WarningCircle, XCircle } from '@phosphor-icons/react';
import { adminService, queryKeys } from '@/lib/api';
import type { IntegrationStatus } from '@/types';
import { PageHeader, Panel } from '@/components/admin/AdminUI';
import { Pill } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';

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
};

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
export const AdminPayments = () => <IntegrationPage kind="pagamento" />;
export const AdminFiscal = () => <IntegrationPage kind="fiscal" />;
export const AdminAutomations = () => <IntegrationPage kind="automacao" />;
