import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  ArrowSquareOut,
  CaretDown,
  ChartBar,
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
  SidebarSimple,
  Star,
  Tag,
  Folders,
  Truck,
  UsersThree,
  Lightning,
  Stack,
  X,
} from '@phosphor-icons/react';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/layout/Logo';
import { cn } from '@/lib/utils';

type NavItem = { to: string; label: string; icon: typeof Package; end?: boolean };
type NavGroup = { title: string; links: NavItem[] };

const COLLAPSE_KEY = 'admin:sidebar-collapsed';

const GROUPS: NavGroup[] = [
  {
    title: 'Operação',
    links: [
      { to: '/admin', label: 'Dashboard', icon: ChartLineUp, end: true },
      { to: '/admin/relatorios', label: 'Relatórios', icon: ChartBar },
      { to: '/admin/pedidos', label: 'Pedidos', icon: ShoppingBag },
      { to: '/admin/clientes', label: 'Clientes', icon: UsersThree },
      { to: '/admin/avaliacoes', label: 'Avaliações', icon: Star },
    ],
  },
  {
    title: 'Catálogo',
    links: [
      { to: '/admin/produtos', label: 'Produtos', icon: Package },
      { to: '/admin/categorias', label: 'Categorias', icon: Folders },
      { to: '/admin/estoque', label: 'Estoque', icon: Stack },
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

/** Rótulo da tela ativa (para o cabeçalho), a partir do pathname. */
function useActiveLabel(): string {
  const { pathname } = useLocation();
  let best: { label: string; len: number } | null = null;
  for (const g of GROUPS) {
    for (const l of g.links) {
      const match = l.end ? pathname === l.to : pathname === l.to || pathname.startsWith(l.to + '/');
      if (match && (!best || l.to.length > best.len)) best = { label: l.label, len: l.to.length };
    }
  }
  return best?.label ?? 'Painel';
}

function initials(name?: string | null): string {
  if (!name) return 'BB';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'BB';
}

/** Símbolo compacto da marca (usado na sidebar recolhida). */
function BrandMark() {
  return (
    <Link to="/" aria-label="Bibi Bolsas — página inicial" className="tactile flex items-center justify-center">
      <svg width="30" height="30" viewBox="0 0 64 64" aria-hidden className="shrink-0 text-terracotta">
        <path
          d="M14 32c0-7 4.6-12 11-12 5 0 7.6 3.4 7 7.4M50 32c0 7-4.6 12-11 12-5 0-7.6-3.4-7-7.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="32" cy="32" r="5.5" fill="none" stroke="currentColor" strokeWidth="4" />
      </svg>
    </Link>
  );
}

export function AdminLayout() {
  const { customer, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1');
  const activeLabel = useActiveLabel();

  const toggleCollapsed = () =>
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      return next;
    });

  const doLogout = () => logout.mutate(undefined, { onSuccess: () => navigate('/admin/login') });

  /** `mini` = versão recolhida (só ícones); usada apenas no desktop. */
  const renderNav = (mini: boolean) => (
    <nav className={cn('flex flex-col gap-1 py-5', mini ? 'px-2' : 'px-3')}>
      {GROUPS.map((g, gi) => (
        <div key={g.title} className={cn(gi > 0 && (mini ? 'mt-2' : 'mt-4'))}>
          {mini ? (
            gi > 0 && <div className="mx-auto mb-2 h-px w-8 bg-white/10" aria-hidden />
          ) : (
            <p className="mb-2 px-3 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-cream-light/40">
              {g.title}
            </p>
          )}
          <div className="flex flex-col gap-0.5">
            {g.links.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setOpen(false)}
                title={mini ? label : undefined}
                aria-label={mini ? label : undefined}
                className={({ isActive }) =>
                  cn(
                    'tactile group relative flex items-center rounded-[var(--radius-md)] text-sm transition-colors',
                    mini ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
                    isActive
                      ? 'bg-terracotta font-semibold text-cream-light shadow-[var(--shadow-card)]'
                      : 'font-medium text-cream-light/65 hover:bg-white/[0.06] hover:text-cream-light',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={18} weight={isActive ? 'fill' : 'regular'} className="shrink-0" />
                    {!mini && label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );

  const sidebarBg = { backgroundImage: 'linear-gradient(180deg, #303132 0%, #262728 100%)' };

  return (
    <div className="flex min-h-screen bg-bg" style={{ fontFamily: 'var(--font-sans)' }}>
      {/* Sidebar desktop */}
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/5 bg-graphite transition-[width] duration-200 ease-out lg:flex',
          collapsed ? 'w-[76px]' : 'w-64',
        )}
        style={sidebarBg}
      >
        <div className={cn('flex h-16 items-center border-b border-white/10', collapsed ? 'justify-center px-2' : 'gap-2 px-5')}>
          {collapsed ? (
            <BrandMark />
          ) : (
            <>
              <Logo tone="cream" />
              <span className="rounded-full border border-terracotta/60 bg-terracotta/15 px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider text-terracotta-soft">
                Admin
              </span>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">{renderNav(collapsed)}</div>

        <div className={cn('flex flex-col border-t border-white/10', collapsed ? 'items-center px-2 py-3' : 'p-3')}>
          <button
            onClick={toggleCollapsed}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            className={cn(
              'tactile flex items-center rounded-[var(--radius-md)] text-sm text-cream-light/70 hover:bg-white/[0.06] hover:text-cream-light',
              collapsed ? 'justify-center p-2.5' : 'w-full gap-3 px-3 py-2.5',
            )}
          >
            <SidebarSimple size={18} className={cn('shrink-0 transition-transform', collapsed && 'rotate-180')} />
            {!collapsed && 'Recolher menu'}
          </button>
        </div>
      </aside>

      {/* Sidebar mobile (drawer sempre completo) */}
      {open && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <button
            aria-label="Fechar menu"
            className="animate-overlay-in absolute inset-0 bg-graphite/60 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <div className="animate-drawer-left-in absolute inset-y-0 left-0 flex w-72 flex-col bg-graphite" style={sidebarBg}>
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
              <div className="flex items-center gap-2">
                <Logo tone="cream" />
                <span className="rounded-full border border-terracotta/60 bg-terracotta/15 px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider text-terracotta-soft">
                  Admin
                </span>
              </div>
              <button onClick={() => setOpen(false)} className="tactile text-cream-light">
                <X size={22} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar">{renderNav(false)}</div>
          </div>
        </div>
      )}

      {/* Conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-surface/85 px-4 backdrop-blur lg:px-8">
          <button
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
            className="tactile -ml-1 rounded-md p-1.5 text-graphite hover:bg-cream-light lg:hidden"
          >
            <List size={22} />
          </button>

          <div className="flex min-w-0 items-center gap-2 text-sm">
            <span className="hidden text-graphite-soft sm:inline">Painel</span>
            <span className="hidden text-store-gray sm:inline">/</span>
            <span className="truncate font-semibold text-graphite">{activeLabel}</span>
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <Link
              to="/"
              target="_blank"
              rel="noreferrer"
              className="tactile hidden items-center gap-1.5 rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-sm font-medium text-graphite-soft hover:border-graphite/30 hover:text-graphite sm:inline-flex"
            >
              <ArrowSquareOut size={16} /> Ver loja
            </Link>

            {/* Menu de conta */}
            <div className="relative">
              <button
                onClick={() => setMenu((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menu}
                className="tactile flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-cream-light"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-terracotta text-sm font-semibold text-cream-light">
                  {initials(customer?.name)}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block max-w-[9rem] truncate text-sm font-medium leading-tight text-graphite">
                    {customer?.name ?? 'Administrador'}
                  </span>
                  <span className="block text-xs leading-tight text-store-gray">Owner</span>
                </span>
                <CaretDown size={14} className="hidden text-store-gray sm:block" />
              </button>

              {menu && (
                <>
                  <button className="fixed inset-0 z-40 cursor-default" aria-hidden onClick={() => setMenu(false)} />
                  <div
                    role="menu"
                    className="animate-pop-in absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface shadow-[var(--shadow-lift)]"
                  >
                    <div className="border-b border-border/70 px-4 py-3">
                      <p className="truncate text-sm font-semibold text-graphite">{customer?.name ?? 'Administrador'}</p>
                      <p className="truncate text-xs text-store-gray">{customer?.email ?? 'Acesso administrativo'}</p>
                    </div>
                    <div className="p-1.5">
                      <Link
                        to="/admin/configuracoes"
                        onClick={() => setMenu(false)}
                        className="tactile flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm text-graphite hover:bg-cream-light"
                        role="menuitem"
                      >
                        <Gear size={17} className="text-graphite-soft" /> Configurações
                      </Link>
                      <Link
                        to="/"
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => setMenu(false)}
                        className="tactile flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm text-graphite hover:bg-cream-light sm:hidden"
                        role="menuitem"
                      >
                        <ArrowSquareOut size={17} className="text-graphite-soft" /> Ver loja
                      </Link>
                      <button
                        onClick={() => {
                          setMenu(false);
                          doLogout();
                        }}
                        className="tactile flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm text-danger hover:bg-danger-soft/60"
                        role="menuitem"
                      >
                        <SignOut size={17} /> Sair do painel
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
