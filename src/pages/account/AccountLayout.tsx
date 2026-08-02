import { NavLink, Outlet, useNavigate } from 'react-router';
import {
  IdentificationCard,
  MapPin,
  Package,
  ShieldCheck,
  SignOut,
  Star,
  User,
} from '@phosphor-icons/react';
import { useAuth } from '@/hooks/useAuth';
import { Container } from '@/components/ui/Layout';
import { usePageMeta } from '@/hooks/usePageMeta';
import { cn } from '@/lib/utils';

const LINKS = [
  { to: '/minha-conta', label: 'Visão geral', icon: User, end: true },
  { to: '/minha-conta/pedidos', label: 'Meus pedidos', icon: Package },
  { to: '/minha-conta/enderecos', label: 'Endereços', icon: MapPin },
  { to: '/minha-conta/dados', label: 'Meus dados', icon: IdentificationCard },
  { to: '/minha-conta/privacidade', label: 'Privacidade', icon: ShieldCheck },
  { to: '/minha-conta/avaliacoes', label: 'Avaliações', icon: Star },
];

export function AccountLayout() {
  const { customer, logout } = useAuth();
  const navigate = useNavigate();
  usePageMeta({ title: 'Minha conta', noIndex: true });

  return (
    <Container className="py-10">
      <h1 className="font-display text-3xl text-graphite sm:text-4xl">Minha conta</h1>
      <p className="mt-1 text-graphite-soft">Olá, {customer?.name?.split(' ')[0] ?? 'cliente'} 👋</p>

      {/*
        min-w-0 no aside e minmax(0,1fr) na coluna: sem isso o `min-width: auto`
        do item de grid estica a coluna ate caber o trilho de navegacao inteiro,
        e a pagina passa a ter 700px de largura no celular.
      */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="min-w-0">
          {/* contain:paint — ver comentario em ProductRow: scroller horizontal
              sem containment expande o viewport de layout no mobile. */}
          <nav className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto [contain:paint] px-1 lg:mx-0 lg:flex-col lg:px-0 lg:[contain:none]">
            {LINKS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex shrink-0 items-center gap-3 rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-medium transition-colors',
                    isActive ? 'bg-graphite text-cream-light' : 'text-graphite hover:bg-cream-light',
                  )
                }
              >
                <Icon size={18} /> {label}
              </NavLink>
            ))}
            <button
              onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/') })}
              className="flex shrink-0 items-center gap-3 rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-medium text-danger hover:bg-danger-soft"
            >
              <SignOut size={18} /> Sair
            </button>
          </nav>
        </aside>

        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </Container>
  );
}
