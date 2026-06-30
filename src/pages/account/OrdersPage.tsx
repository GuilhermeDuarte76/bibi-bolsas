import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Package } from '@phosphor-icons/react';
import { accountService, queryKeys } from '@/lib/api';
import { OrderStatusPill } from '@/lib/orderStatus';
import { formatDateShort, formatPrice } from '@/lib/utils';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';

export function OrdersPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.orders,
    queryFn: () => accountService.listOrders(),
  });

  if (isLoading) return <div className="flex flex-col gap-4">{[0, 1, 2].map((i) => <ProductCardSkeleton key={i} />)}</div>;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (!data?.length) return <EmptyState icon={Package} title="Você ainda não tem pedidos" description="Quando fizer sua primeira compra, ela aparecerá aqui." />;

  return (
    <div>
      <h2 className="mb-5 font-display text-2xl text-graphite">Meus pedidos</h2>
      <ul className="flex flex-col gap-4">
        {data.map((o) => (
          <li key={o.id}>
            <Link to={`/minha-conta/pedidos/${o.id}`} className="block rounded-[var(--radius-xl)] border border-border bg-surface p-5 transition-colors hover:border-graphite">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-graphite">{o.number}</p>
                  <p className="text-xs text-graphite-soft">Realizado em {formatDateShort(o.createdAt)}</p>
                </div>
                <OrderStatusPill status={o.status} />
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex -space-x-3">
                  {o.items.slice(0, 4).map((it) => (
                    <img key={it.productId} src={it.image} alt={it.name} className="h-12 w-10 rounded-md border-2 border-surface object-cover" />
                  ))}
                </div>
                <span className="flex-1 text-sm text-graphite-soft">
                  {o.items.length} {o.items.length === 1 ? 'item' : 'itens'}
                </span>
                <span className="font-display text-lg text-graphite">{formatPrice(o.totalCents)}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
