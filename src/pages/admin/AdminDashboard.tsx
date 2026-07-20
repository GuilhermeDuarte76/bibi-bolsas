import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CurrencyDollar,
  ShoppingBag,
  UsersThree,
  WarningCircle,
} from '@phosphor-icons/react';
import { adminService, queryKeys } from '@/lib/api';
import { PageHeader, Panel, StatCard, AdminTable } from '@/components/admin/AdminUI';
import { OrderStatusPill } from '@/lib/orderStatus';
import { Pill } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatPrice, formatDateShort } from '@/lib/utils';
import type { AdminAlert, Order } from '@/types';

const ALERT_SEVERITY_LABEL: Record<string, string> = {
  Critical: 'Crítico',
  High: 'Alto',
  Medium: 'Médio',
  Low: 'Baixo',
};

function alertTone(severity: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (severity === 'Critical' || severity === 'High') return 'danger';
  if (severity === 'Medium') return 'warning';
  return 'info';
}

export function AdminDashboard() {
  const dashboard = useQuery({
    queryKey: queryKeys.admin.dashboard,
    queryFn: () => adminService.getDashboard(),
  });
  const orders = useQuery({
    queryKey: queryKeys.admin.orders,
    queryFn: () => adminService.listOrders(),
  });
  const alerts = useQuery({
    queryKey: queryKeys.admin.alerts({ status: 'Open', pageSize: 5 }),
    queryFn: () => adminService.listAlerts({ status: 'Open', pageSize: 5 }),
  });

  const data = dashboard.data;
  const recentOrders = (orders.data ?? []).slice(0, 6);
  const openAlerts = alerts.data ?? [];

  if (dashboard.isLoading || !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-[var(--radius-lg)]" />)}
      </div>
    );
  }

  const maxRevenue = Math.max(1, ...data.revenueSeries.map((d) => d.valueCents));
  const ICONS = [CurrencyDollar, CurrencyDollar, ShoppingBag, UsersThree];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={data.generatedAt ? `Atualizado em ${new Date(data.generatedAt).toLocaleString('pt-BR')}` : 'Visão geral da operação.'}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.metrics.map((metric, index) => (
          <StatCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            deltaPct={metric.deltaPct}
            hint={metric.hint}
            icon={ICONS[index]}
          />
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Alert label="Aguardando pagamento" value={data.awaitingPaymentOrders ?? data.pendingPayments} to="/admin/pagamentos" tone="warning" />
        <Alert label="Em separação" value={data.preparingOrders ?? 0} to="/admin/pedidos" tone="info" />
        <Alert label="Estoque baixo" value={data.lowStock} to="/admin/estoque" tone="warning" />
        <Alert label="Carrinhos abandonados" value={data.abandonedCarts ?? 0} to="/admin/automacoes" tone="info" />
        <Alert label="Alertas abertos" value={data.openAlerts ?? data.integrationFailures} to="/admin/automacoes" tone="danger" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <Panel title="Faturamento">
          <div className="flex h-48 items-end gap-4">
            {data.revenueSeries.map((item) => (
              <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end rounded-[var(--radius-md)] bg-cream-light">
                  <div
                    className="w-full rounded-t-[var(--radius-md)] bg-terracotta/85 transition-all hover:bg-terracotta"
                    style={{ height: `${Math.max(6, (item.valueCents / maxRevenue) * 100)}%` }}
                    title={formatPrice(item.valueCents)}
                  />
                </div>
                <span className="text-xs text-graphite-soft">{item.label}</span>
                <span className="text-sm font-medium text-graphite">{formatPrice(item.valueCents)}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Alertas operacionais" action={<Link to="/admin/automacoes" className="text-sm font-medium text-terracotta">Automações</Link>}>
          {alerts.isLoading ? (
            <Skeleton className="h-36 w-full rounded-[var(--radius-lg)]" />
          ) : openAlerts.length ? (
            <ul className="space-y-3">
              {openAlerts.map((alert) => <AlertItem key={alert.id} alert={alert} />)}
            </ul>
          ) : (
            <p className="text-sm text-graphite-soft">Nenhum alerta aberto no momento.</p>
          )}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Panel title="Produtos mais vendidos">
          {data.topProducts.length ? (
            <ul className="flex flex-col gap-3">
              {data.topProducts.map((product, index) => (
                <li key={product.name} className="flex items-center gap-3">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-cream text-xs font-bold text-cinnamon">{index + 1}</span>
                  <span className="flex-1 text-sm text-graphite">{product.name}</span>
                  <span className="text-xs text-graphite-soft">{product.sold} un.</span>
                  <span className="w-24 text-right text-sm font-medium text-graphite">{formatPrice(product.revenueCents)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-graphite-soft">Sem vendas aprovadas para ranquear produtos ainda.</p>
          )}
        </Panel>

        <Panel title="Estoque baixo" action={<Link to="/admin/estoque" className="text-sm font-medium text-terracotta">Estoque</Link>}>
          {data.lowStockItems?.length ? (
            <ul className="space-y-3">
              {data.lowStockItems.map((item) => (
                <li key={item.productVariantId} className="flex items-center justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-graphite">{item.productName}</p>
                    <p className="text-xs text-graphite-soft">{item.sku} · {item.variantName}</p>
                  </div>
                  <Pill tone={item.availableQuantity <= 0 ? 'danger' : 'warning'}>
                    {item.availableQuantity} disp.
                  </Pill>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-graphite-soft">Nenhum SKU abaixo do mínimo.</p>
          )}
        </Panel>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-graphite">Pedidos recentes</h2>
          <Link to="/admin/pedidos" className="text-sm font-medium text-terracotta">Ver todos</Link>
        </div>
        {orders.isLoading ? (
          <Skeleton className="h-64 w-full rounded-[var(--radius-lg)]" />
        ) : (
          <AdminTable<Order>
            rowKey={(order) => order.id}
            rows={recentOrders}
            empty="Nenhum pedido encontrado."
            columns={[
              { key: 'number', header: 'Pedido', render: (order) => <span className="font-medium">{order.number}</span> },
              { key: 'date', header: 'Data', render: (order) => formatDateShort(order.createdAt) },
              { key: 'customer', header: 'Cliente', render: (order) => order.shippingAddress.recipient || 'Cliente no detalhe' },
              { key: 'total', header: 'Total', render: (order) => formatPrice(order.totalCents) },
              { key: 'status', header: 'Status', render: (order) => <OrderStatusPill status={order.status} /> },
            ]}
          />
        )}
      </div>
    </div>
  );
}

function AlertItem({ alert }: { alert: AdminAlert }) {
  return (
    <li className="rounded-[var(--radius-md)] border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-graphite">{alert.title}</p>
        <Pill tone={alertTone(alert.severity)}>{ALERT_SEVERITY_LABEL[alert.severity] ?? alert.severity}</Pill>
      </div>
      <p className="mt-1 text-xs text-graphite-soft">{alert.message}</p>
      <p className="mt-2 text-[0.68rem] text-store-gray">{formatDateShort(alert.createdAt)}</p>
    </li>
  );
}

function Alert({ label, value, to, tone }: { label: string; value: number; to: string; tone: 'warning' | 'danger' | 'info' }) {
  const tones = {
    warning: 'border-warning/30 bg-warning-soft text-warning',
    danger: 'border-danger/30 bg-danger-soft text-danger',
    info: 'border-travel-blue/20 bg-[#e7ecf3] text-travel-blue',
  };
  return (
    <Link to={to} className={`flex items-center gap-3 rounded-[var(--radius-lg)] border p-4 ${tones[tone]}`}>
      <WarningCircle size={22} weight="fill" className="shrink-0" />
      <div>
        <p className="text-xl font-bold leading-none">{value}</p>
        <p className="mt-1 text-xs font-medium">{label}</p>
      </div>
    </Link>
  );
}
