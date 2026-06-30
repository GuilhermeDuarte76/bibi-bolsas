import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, MapPin, Package, Star } from '@phosphor-icons/react';
import { accountService, queryKeys } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { OrderStatusPill } from '@/lib/orderStatus';
import { formatDateShort, formatPrice } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';

export function AccountOverview() {
  const { customer } = useAuth();
  const orders = useQuery({ queryKey: queryKeys.orders, queryFn: () => accountService.listOrders() });
  const pending = useQuery({ queryKey: queryKeys.pendingReviews, queryFn: () => accountService.listPendingReviews() });

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      {/* Dados pessoais */}
      <section className="rounded-[var(--radius-xl)] border border-border bg-surface p-6">
        <h2 className="font-display text-xl text-graphite">Dados pessoais</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Info label="Nome" value={customer?.name} />
          <Info label="E-mail" value={customer?.email} />
          <Info label="Telefone" value={customer?.phone} />
          <Info label="CPF" value={customer?.document} />
        </dl>
      </section>

      {/* Atalhos */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Shortcut to="/minha-conta/pedidos" icon={Package} label="Pedidos" value={orders.data?.length ?? 0} />
        <Shortcut to="/minha-conta/enderecos" icon={MapPin} label="Endereços salvos" value={2} />
        <Shortcut to="/minha-conta/avaliacoes" icon={Star} label="Avaliações pendentes" value={pending.data?.length ?? 0} />
      </div>

      {/* Pedidos recentes */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl text-graphite">Pedidos recentes</h2>
          <Link to="/minha-conta/pedidos" className="flex items-center gap-1 text-sm font-medium text-terracotta">
            Ver todos <ArrowRight size={16} />
          </Link>
        </div>
        {orders.isLoading ? (
          <Skeleton className="h-24 w-full rounded-[var(--radius-lg)]" />
        ) : (
          <ul className="flex flex-col gap-3">
            {orders.data?.slice(0, 3).map((o) => (
              <li key={o.id}>
                <Link to={`/minha-conta/pedidos/${o.id}`} className="flex items-center justify-between rounded-[var(--radius-lg)] border border-border bg-surface p-4 hover:border-graphite">
                  <div>
                    <p className="font-medium text-graphite">{o.number}</p>
                    <p className="text-xs text-graphite-soft">{formatDateShort(o.createdAt)} · {o.items.length} {o.items.length === 1 ? 'item' : 'itens'}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="hidden font-medium text-graphite sm:block">{formatPrice(o.totalCents)}</span>
                    <OrderStatusPill status={o.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs text-store-gray">{label}</dt>
      <dd className="font-medium text-graphite">{value ?? '—'}</dd>
    </div>
  );
}

function Shortcut({ to, icon: Icon, label, value }: { to: string; icon: typeof Package; label: string; value: number }) {
  return (
    <Link to={to} className="flex items-center gap-4 rounded-[var(--radius-xl)] border border-border bg-surface p-5 hover:border-graphite">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-cream text-terracotta">
        <Icon size={22} />
      </span>
      <div>
        <p className="font-display text-2xl text-graphite">{value}</p>
        <p className="text-xs text-graphite-soft">{label}</p>
      </div>
    </Link>
  );
}
