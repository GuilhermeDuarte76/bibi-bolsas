import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  type Icon,
  ArrowRight,
  CaretRight,
  CreditCard,
  CurrencyDollar,
  Package,
  ShoppingBag,
  Storefront,
  UsersThree,
  Warning,
} from '@phosphor-icons/react';
import { adminService, queryKeys } from '@/lib/api';
import {
  Card,
  DataTable,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
  type Column,
  type Tone,
} from '@/components/admin/ui';
import { OrderStatusPill } from '@/lib/orderStatus';
import { cn, formatPrice, formatDateShort } from '@/lib/utils';
import type { AdminAlert, Order } from '@/types';

const ALERT_SEVERITY_LABEL: Record<string, string> = {
  Critical: 'Crítico',
  High: 'Alto',
  Medium: 'Médio',
  Low: 'Baixo',
};

function alertTone(severity: string): Tone {
  if (severity === 'Critical' || severity === 'High') return 'danger';
  if (severity === 'Medium') return 'warning';
  return 'info';
}

const METRIC_ICONS: Icon[] = [CurrencyDollar, CurrencyDollar, ShoppingBag, UsersThree];

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

  const orderColumns: Column<Order>[] = [
    { key: 'number', header: 'Pedido', render: (order) => <span className="font-medium text-graphite">{order.number}</span> },
    { key: 'date', header: 'Data', render: (order) => <span className="text-graphite-soft">{formatDateShort(order.createdAt)}</span> },
    {
      key: 'customer',
      header: 'Cliente',
      render: (order) => <span className="truncate">{order.shippingAddress.recipient || 'Cliente no detalhe'}</span>,
    },
    { key: 'total', header: 'Total', align: 'right', render: (order) => <span className="font-medium tabular-nums">{formatPrice(order.totalCents)}</span> },
    { key: 'status', header: 'Status', render: (order) => <OrderStatusPill status={order.status} /> },
  ];

  if (dashboard.isLoading || !data) {
    return (
      <div>
        <PageHeader eyebrow="Operação" title="Dashboard" subtitle="Visão geral da operação." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <StatCard key={i} loading label="" value="" />
          ))}
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(1, ...data.revenueSeries.map((d) => d.valueCents));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Operação"
        title="Dashboard"
        subtitle={
          data.generatedAt
            ? `Atualizado em ${new Date(data.generatedAt).toLocaleString('pt-BR')}`
            : 'Visão geral da operação.'
        }
      />

      {/* Métricas principais */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.metrics.map((metric, index) => (
          <StatCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            deltaPct={metric.deltaPct}
            hint={metric.hint}
            icon={METRIC_ICONS[index]}
          />
        ))}
      </div>

      {/* Atalhos operacionais */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <AlertTile icon={CreditCard} label="Aguardando pagamento" value={data.awaitingPaymentOrders ?? data.pendingPayments} to="/admin/pagamentos" tone="warning" />
        <AlertTile icon={Package} label="Em separação" value={data.preparingOrders ?? 0} to="/admin/pedidos" tone="info" />
        <AlertTile icon={Warning} label="Estoque baixo" value={data.lowStock} to="/admin/estoque" tone="warning" />
        <AlertTile icon={Storefront} label="Carrinhos abandonados" value={data.abandonedCarts ?? 0} to="/admin/automacoes" tone="info" />
        <AlertTile icon={Warning} label="Alertas abertos" value={data.openAlerts ?? data.integrationFailures} to="/admin/automacoes" tone="danger" />
      </div>

      {/* Faturamento + Alertas */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <SectionCard eyebrow="Desempenho" title="Faturamento" description="Receita aprovada por período.">
          <div className="flex h-52 items-end gap-3 sm:gap-4">
            {data.revenueSeries.map((item) => (
              <div key={item.label} className="group flex flex-1 flex-col items-center gap-2">
                <span className="text-xs font-medium text-graphite opacity-0 transition-opacity group-hover:opacity-100">
                  {formatPrice(item.valueCents)}
                </span>
                <div className="flex w-full flex-1 items-end rounded-[var(--radius-sm)] bg-cream-light">
                  <div
                    className="w-full rounded-t-[var(--radius-sm)] bg-terracotta/80 transition-all duration-300 hover:bg-terracotta"
                    style={{ height: `${Math.max(6, (item.valueCents / maxRevenue) * 100)}%` }}
                    title={formatPrice(item.valueCents)}
                  />
                </div>
                <span className="text-xs text-graphite-soft">{item.label}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Monitoramento"
          title="Alertas operacionais"
          action={<CardLink to="/admin/automacoes">Automações</CardLink>}
          bodyClassName="p-0"
        >
          {alerts.isLoading ? (
            <div className="space-y-3 p-5 sm:p-6">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-[var(--radius-md)] bg-cream-light" />
              ))}
            </div>
          ) : openAlerts.length ? (
            <ul className="divide-y divide-border/60">
              {openAlerts.map((alert) => (
                <AlertItem key={alert.id} alert={alert} />
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-graphite-soft sm:px-6">Nenhum alerta aberto no momento.</p>
          )}
        </SectionCard>
      </div>

      {/* Top produtos + Estoque baixo */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard eyebrow="Ranking" title="Produtos mais vendidos">
          {data.topProducts.length ? (
            <ul className="flex flex-col gap-1">
              {data.topProducts.map((product, index) => (
                <li key={product.name} className="flex items-center gap-3 rounded-[var(--radius-md)] px-2 py-2 hover:bg-cream-lighter">
                  <span
                    className={cn(
                      'grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold',
                      index === 0 ? 'bg-terracotta text-cream-light' : 'bg-cream text-cinnamon',
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-graphite">{product.name}</span>
                  <span className="shrink-0 text-xs text-store-gray">{product.sold} un.</span>
                  <span className="w-24 shrink-0 text-right text-sm font-medium tabular-nums text-graphite">{formatPrice(product.revenueCents)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-graphite-soft">Sem vendas aprovadas para ranquear produtos ainda.</p>
          )}
        </SectionCard>

        <SectionCard
          eyebrow="Alerta"
          title="Estoque baixo"
          action={<CardLink to="/admin/estoque">Estoque</CardLink>}
          bodyClassName="p-0"
        >
          {data.lowStockItems?.length ? (
            <ul className="divide-y divide-border/60">
              {data.lowStockItems.map((item) => (
                <li key={item.productVariantId} className="flex items-center justify-between gap-3 px-5 py-3 sm:px-6">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-graphite">{item.productName}</p>
                    <p className="truncate font-mono text-xs text-graphite-soft">{item.sku} · {item.variantName}</p>
                  </div>
                  <StatusBadge tone={item.availableQuantity <= 0 ? 'danger' : 'warning'} size="sm">
                    {item.availableQuantity} disp.
                  </StatusBadge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-graphite-soft sm:px-6">Nenhum SKU abaixo do mínimo.</p>
          )}
        </SectionCard>
      </div>

      {/* Pedidos recentes */}
      <SectionCard
        eyebrow="Vendas"
        title="Pedidos recentes"
        action={<CardLink to="/admin/pedidos">Ver todos</CardLink>}
        bodyClassName="p-0"
      >
        <DataTable<Order>
          columns={orderColumns}
          rows={recentOrders}
          rowKey={(order) => order.id}
          loading={orders.isLoading}
          className="rounded-none border-0 shadow-none"
          minWidth={640}
          empty={{ icon: ShoppingBag, title: 'Nenhum pedido recente' }}
        />
      </SectionCard>
    </div>
  );
}

function CardLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="tactile inline-flex items-center gap-1 rounded text-sm font-medium text-terracotta hover:text-cinnamon">
      {children} <ArrowRight size={14} />
    </Link>
  );
}

const TILE_TONES: Record<'warning' | 'danger' | 'info', string> = {
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-[#e7ecf3] text-travel-blue',
};

function AlertTile({
  icon: IconCmp,
  label,
  value,
  to,
  tone,
}: {
  icon: Icon;
  label: string;
  value: number;
  to: string;
  tone: 'warning' | 'danger' | 'info';
}) {
  return (
    <Link to={to} className="group">
      <Card className="flex items-center gap-3 p-4 transition-shadow hover:shadow-[var(--shadow-soft)]">
        <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full', TILE_TONES[tone])}>
          <IconCmp size={20} weight="fill" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xl font-semibold leading-none text-graphite">{value}</p>
          <p className="mt-1 truncate text-xs font-medium text-graphite-soft">{label}</p>
        </div>
        <CaretRight size={16} className="shrink-0 text-store-gray transition-transform group-hover:translate-x-0.5" />
      </Card>
    </Link>
  );
}

function AlertItem({ alert }: { alert: AdminAlert }) {
  return (
    <li className="px-5 py-3.5 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-graphite">{alert.title}</p>
        <StatusBadge tone={alertTone(alert.severity)} size="sm" dot>
          {ALERT_SEVERITY_LABEL[alert.severity] ?? alert.severity}
        </StatusBadge>
      </div>
      <p className="mt-1 text-xs text-graphite-soft">{alert.message}</p>
      <p className="mt-2 text-[0.68rem] text-store-gray">{formatDateShort(alert.createdAt)}</p>
    </li>
  );
}
