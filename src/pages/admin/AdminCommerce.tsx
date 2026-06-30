import { useQuery } from '@tanstack/react-query';
import { Plus } from '@phosphor-icons/react';
import { adminService, queryKeys } from '@/lib/api';
import type { Coupon, Promotion } from '@/types';
import { PageHeader, AdminTable, Panel } from '@/components/admin/AdminUI';
import { Pill } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { customer as mockCustomer, addresses } from '@/lib/api/mock/account';
import { formatDateShort, formatPrice } from '@/lib/utils';

export function AdminCoupons() {
  const { data, isLoading } = useQuery({ queryKey: queryKeys.admin.coupons, queryFn: () => adminService.listCoupons() });
  return (
    <div>
      <PageHeader title="Cupons" subtitle="Gerencie cupons de desconto." action={<Button onClick={() => toast.info('Novo cupom (mock)')}><Plus size={16} /> Novo cupom</Button>} />
      {isLoading ? <Skeleton className="h-64 w-full rounded-[var(--radius-lg)]" /> : (
        <AdminTable<Coupon>
          rowKey={(c) => c.id}
          rows={data ?? []}
          columns={[
            { key: 'code', header: 'Código', render: (c) => <span className="font-mono font-medium">{c.code}</span> },
            { key: 'desc', header: 'Descrição', render: (c) => c.description },
            { key: 'value', header: 'Valor', render: (c) => (c.type === 'percent' ? `${c.value}%` : c.value === 0 ? 'Frete grátis' : formatPrice(c.value)) },
            { key: 'usage', header: 'Usos', render: (c) => `${c.usageCount}${c.usageLimit ? ` / ${c.usageLimit}` : ''}` },
            { key: 'expires', header: 'Validade', render: (c) => (c.expiresAt ? formatDateShort(c.expiresAt) : '—') },
            { key: 'status', header: 'Status', render: (c) => <Pill tone={c.active ? 'success' : 'neutral'}>{c.active ? 'Ativo' : 'Inativo'}</Pill> },
          ]}
        />
      )}
    </div>
  );
}

export function AdminPromotions() {
  const { data, isLoading } = useQuery({ queryKey: queryKeys.admin.promotions, queryFn: () => adminService.listPromotions() });
  return (
    <div>
      <PageHeader title="Promoções" subtitle="Campanhas e descontos por período." action={<Button onClick={() => toast.info('Nova promoção (mock)')}><Plus size={16} /> Nova promoção</Button>} />
      {isLoading ? <Skeleton className="h-48 w-full rounded-[var(--radius-lg)]" /> : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(data ?? []).map((p: Promotion) => (
            <Panel key={p.id}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-graphite">{p.name}</h3>
                  <p className="text-sm text-graphite-soft">{p.productCount} produtos · {p.discountPct}% off</p>
                </div>
                <Pill tone={p.active ? 'success' : 'neutral'}>{p.active ? 'Ativa' : 'Encerrada'}</Pill>
              </div>
              <p className="mt-3 text-xs text-graphite-soft">{formatDateShort(p.startsAt)} → {formatDateShort(p.endsAt)}</p>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminCustomers() {
  // Dados mockados de clientes (com base no cliente demo).
  const customers = [
    { ...mockCustomer, orders: 3, totalCents: 116419 },
    { id: 'c2', name: 'Carla Mendes', email: 'carla@exemplo.com', phone: '(21) 98888-1122', orders: 5, totalCents: 248900, createdAt: '2025-09-10T00:00:00Z' },
    { id: 'c3', name: 'Rafael Souza', email: 'rafael@exemplo.com', phone: '(31) 97777-3344', orders: 1, totalCents: 22990, createdAt: '2026-01-22T00:00:00Z' },
    { id: 'c4', name: 'Juliana Prado', email: 'juliana@exemplo.com', phone: '(11) 96666-5566', orders: 2, totalCents: 41980, createdAt: '2026-03-05T00:00:00Z' },
  ];

  return (
    <div>
      <PageHeader title="Clientes" subtitle={`${customers.length} clientes cadastrados`} />
      <AdminTable
        rowKey={(c: (typeof customers)[number]) => c.id}
        rows={customers}
        columns={[
          { key: 'name', header: 'Cliente', render: (c) => <div><p className="font-medium">{c.name}</p><p className="text-xs text-graphite-soft">{c.email}</p></div> },
          { key: 'phone', header: 'Telefone', render: (c) => c.phone ?? '—' },
          { key: 'city', header: 'Cidade', render: () => `${addresses[0].city}/${addresses[0].state}` },
          { key: 'orders', header: 'Pedidos', render: (c) => `${c.orders}` },
          { key: 'total', header: 'Total gasto', render: (c) => formatPrice(c.totalCents) },
          { key: 'since', header: 'Cliente desde', render: (c) => formatDateShort(c.createdAt) },
        ]}
      />
    </div>
  );
}
