import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CurrencyDollar,
  Package,
  ShoppingBag,
  Star,
  WarningCircle,
} from '@phosphor-icons/react';
import { adminService, queryKeys } from '@/lib/api';
import { PageHeader, Panel, StatCard, AdminTable } from '@/components/admin/AdminUI';
import { OrderStatusPill } from '@/lib/orderStatus';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatPrice, formatDateShort } from '@/lib/utils';
import type { Order } from '@/types';

export function AdminDashboard() {
  const { data, isLoading } = useQuery({ queryKey: queryKeys.admin.dashboard, queryFn: () => adminService.getDashboard() });

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-[var(--radius-lg)]" />)}
      </div>
    );
  }

  const maxRevenue = Math.max(...data.revenueSeries.map((d) => d.valueCents));
  const ICONS = [CurrencyDollar, ShoppingBag, Package, Star];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Visão geral da operação nos últimos 30 dias." />

      {/* Metricas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.metrics.map((m, i) => (
          <StatCard key={m.label} label={m.label} value={m.value} deltaPct={m.deltaPct} hint={m.hint} icon={ICONS[i]} />
        ))}
      </div>

      {/* Alertas operacionais */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Alert label="Pedidos pendentes" value={data.pendingOrders} to="/admin/pedidos" tone="warning" />
        <Alert label="Estoque baixo" value={data.lowStock} to="/admin/produtos" tone="warning" />
        <Alert label="Pagamentos pendentes" value={data.pendingPayments} to="/admin/pagamentos" tone="info" />
        <Alert label="Falhas de integração" value={data.integrationFailures} to="/admin/automacoes" tone="danger" />
        <Alert label="Avaliações p/ moderar" value={data.reviewsToModerate} to="/admin/avaliacoes" tone="info" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Faturamento */}
        <Panel title="Faturamento na semana">
          <div className="flex h-52 items-end gap-3">
            {data.revenueSeries.map((d) => (
              <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-md bg-terracotta/80 transition-all hover:bg-terracotta"
                    style={{ height: `${(d.valueCents / maxRevenue) * 100}%` }}
                    title={formatPrice(d.valueCents)}
                  />
                </div>
                <span className="text-xs text-graphite-soft">{d.label}</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Top produtos */}
        <Panel title="Produtos mais vendidos">
          <ul className="flex flex-col gap-3">
            {data.topProducts.map((p, i) => (
              <li key={p.name} className="flex items-center gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-cream text-xs font-bold text-cinnamon">{i + 1}</span>
                <span className="flex-1 text-sm text-graphite">{p.name}</span>
                <span className="text-xs text-graphite-soft">{p.sold} un.</span>
                <span className="w-24 text-right text-sm font-medium text-graphite">{formatPrice(p.revenueCents)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* Pedidos recentes */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-graphite">Pedidos recentes</h2>
          <Link to="/admin/pedidos" className="text-sm font-medium text-terracotta">Ver todos</Link>
        </div>
        <AdminTable<Order>
          rowKey={(o) => o.id}
          rows={data.recentOrders}
          columns={[
            { key: 'number', header: 'Pedido', render: (o) => <span className="font-medium">{o.number}</span> },
            { key: 'date', header: 'Data', render: (o) => formatDateShort(o.createdAt) },
            { key: 'items', header: 'Itens', render: (o) => `${o.items.length}` },
            { key: 'total', header: 'Total', render: (o) => formatPrice(o.totalCents) },
            { key: 'status', header: 'Status', render: (o) => <OrderStatusPill status={o.status} /> },
          ]}
        />
      </div>
    </div>
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
