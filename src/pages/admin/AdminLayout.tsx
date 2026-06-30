import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  ChartLineUp,
  Gear,
  List,
  Money,
  Package,
  Percent,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  SignOut,
  Star,
  Tag,
  Truck,
  UsersThree,
  Lightning,
  X,
} from '@phosphor-icons/react';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/layout/Logo';
import { cn } from '@/lib/utils';

const GROUPS: { title: string; links: { to: string; label: string; icon: typeof Package; end?: boolean }[] }[] = [
  {
    title: 'Operação',
    links: [
      { to: '/admin', label: 'Dashboard', icon: ChartLineUp, end: true },
      { to: '/admin/pedidos', label: 'Pedidos', icon: ShoppingBag },
      { to: '/admin/clientes', label: 'Clientes', icon: UsersThree },
      { to: '/admin/avaliacoes', label: 'Avaliações', icon: Star },
    ],
  },
  {
    title: 'Catálogo',
    links: [
      { to: '/admin/produtos', label: 'Produtos', icon: Package },
      { to: '/admin/cupons', label: 'Cupons', icon: Tag },
      { to: '/admin/promocoes', label: 'Promoções', icon: Percent },
    ],
  },
  {
    title: 'Integrações',
    links: [
      { to: '/admin/frete', label: 'Frete', icon: Truck },
      { to: '/admin/pagamentos', label: 'Pagamentos', icon: Money },
      { to: '/admin/fiscal', label: 'Fiscal', icon: Receipt },
      { to: '/admin/automacoes', label: 'Automações', icon: Lightning },
    ],
  },
  {
    title: 'Administração',
    links: [
      { to: '/admin/usuarios', label: 'Usuários', icon: UsersThree },
      { to: '/admin/permissoes', label: 'Permissões', icon: ShieldCheck },
      { to: '/admin/configuracoes', label: 'Configurações', icon: Gear },
    ],
  },
];

export function AdminLayout() {
  const { customer, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const Nav = (
    <nav className="flex flex-col gap-6 p-4">
      {GROUPS.map((g) => (
        <div key={g.title}>
          <p className="mb-2 px-3 text-[0.65rem] font-semibold uppercase tracking-wider text-store-gray">{g.title}</p>
          <div className="flex flex-col gap-0.5">
            {g.links.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-terracotta text-cream-light' : 'text-cream-light/70 hover:bg-white/5 hover:text-cream-light',
                  )
                }
              >
                <Icon size={18} /> {label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-[#f3eee8]" style={{ fontFamily: 'var(--font-sans)' }}>
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-graphite lg:flex">
        <div className="flex h-16 items-center border-b border-white/10 px-5">
          <Logo tone="cream" />
          <span className="ml-2 rounded-full bg-terracotta px-2 py-0.5 text-[0.6rem] font-bold uppercase text-cream-light">Admin</span>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar">{Nav}</div>
        <div className="border-t border-white/10 p-4">
          <p className="px-3 text-sm font-medium text-cream-light">{customer?.name}</p>
          <p className="px-3 text-xs text-cream-light/60">Owner</p>
          <button
            onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/admin/login') })}
            className="mt-2 flex w-full items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm text-cream-light/70 hover:bg-white/5"
          >
            <SignOut size={16} /> Sair
          </button>
        </div>
      </aside>

      {/* Sidebar mobile */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Fechar menu" className="absolute inset-0 bg-graphite/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-graphite">
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
              <Logo tone="cream" />
              <button onClick={() => setOpen(false)} className="text-cream-light"><X size={22} /></button>
            </div>
            <div className="flex-1 overflow-y-auto">{Nav}</div>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-surface px-4 lg:px-8">
          <button onClick={() => setOpen(true)} className="text-graphite lg:hidden"><List size={24} /></button>
          <p className="text-sm text-graphite-soft">Painel administrativo · Bibi Bolsas</p>
        </header>
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
