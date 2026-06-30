import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MagnifyingGlass, Plus } from '@phosphor-icons/react';
import { adminService, queryKeys } from '@/lib/api';
import type { Product } from '@/types';
import { PageHeader, AdminTable } from '@/components/admin/AdminUI';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Pill } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatPrice } from '@/lib/utils';

export function AdminProducts() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const { data, isLoading } = useQuery({ queryKey: queryKeys.admin.products, queryFn: () => adminService.listProducts() });

  const filtered = (data ?? []).filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

  const stockOf = (p: Product) => p.variants.reduce((acc, v) => acc + v.stock, 0);

  return (
    <div>
      <PageHeader
        title="Produtos"
        subtitle={`${data?.length ?? 0} produtos cadastrados`}
        action={<Button onClick={() => navigate('/admin/produtos/novo')}><Plus size={16} /> Novo produto</Button>}
      />

      <div className="mb-4 max-w-sm">
        <div className="relative">
          <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-store-gray" />
          <Input placeholder="Buscar produto…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" aria-label="Buscar produto" />
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-72 w-full rounded-[var(--radius-lg)]" />
      ) : (
        <AdminTable<Product>
          rowKey={(p) => p.id}
          rows={filtered}
          onRowClick={(p) => navigate(`/admin/produtos/${p.id}`)}
          columns={[
            {
              key: 'name',
              header: 'Produto',
              render: (p) => (
                <div className="flex items-center gap-3">
                  <img src={p.media[0]?.url} alt="" className="h-10 w-9 rounded-md object-cover" />
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-graphite-soft capitalize">{p.categorySlug.replace('-', ' ')}</p>
                  </div>
                </div>
              ),
            },
            { key: 'sku', header: 'Variações', render: (p) => `${p.variants.length}` },
            { key: 'price', header: 'Preço', render: (p) => formatPrice(p.priceFromCents) },
            {
              key: 'stock',
              header: 'Estoque',
              render: (p) => {
                const s = stockOf(p);
                return <Pill tone={s === 0 ? 'danger' : s < 10 ? 'warning' : 'success'}>{s} un.</Pill>;
              },
            },
            { key: 'status', header: 'Status', render: () => <Pill tone="success">Ativo</Pill> },
          ]}
        />
      )}
    </div>
  );
}
