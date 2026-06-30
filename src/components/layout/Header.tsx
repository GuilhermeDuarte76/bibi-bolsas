import { Link, NavLink } from 'react-router-dom';
import {
  Handbag,
  List,
  MagnifyingGlass,
  Truck,
  User,
  X,
} from '@phosphor-icons/react';
import { Logo } from './Logo';
import { useUI } from '@/store/ui';
import { useCart } from '@/store/cart';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const NAV = [
  { slug: 'bolsas', label: 'Bolsas' },
  { slug: 'mochilas', label: 'Mochilas' },
  { slug: 'malas', label: 'Malas' },
  { slug: 'kit-viagem', label: 'Kit Viagem' },
  { slug: 'promocoes', label: 'Promoções', accent: true },
];

export function Header() {
  const { openSearch, openCart, mobileMenuOpen, toggleMobileMenu, closeMobileMenu } = useUI();
  const itemCount = useCart((s) => s.itemCount());
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-cream-lighter/90 backdrop-blur-md">
      {/* Faixa de beneficios */}
      <div className="hidden bg-graphite text-cream-light md:block">
        <div className="mx-auto flex max-w-[1280px] items-center justify-center gap-8 px-6 py-2 text-xs">
          <span className="flex items-center gap-1.5">
            <Truck size={15} /> Pronta entrega
          </span>
          <span>Pagamento seguro</span>
          <span>Troca facilitada</span>
          <span>Frete calculado no checkout</span>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1280px] items-center gap-4 px-4 py-4 sm:px-6 lg:px-10">
        <button
          className="tactile -ml-1 rounded-md p-1.5 text-graphite lg:hidden"
          aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={mobileMenuOpen}
          onClick={toggleMobileMenu}
        >
          {mobileMenuOpen ? <X size={24} /> : <List size={24} />}
        </button>

        <Logo className="lg:flex-none" />

        {/* Navegacao desktop */}
        <nav className="hidden flex-1 items-center justify-center gap-8 lg:flex" aria-label="Categorias">
          {NAV.map((item) => (
            <NavLink
              key={item.slug}
              to={`/categoria/${item.slug}`}
              className={({ isActive }) =>
                cn(
                  'relative text-sm font-medium text-graphite transition-colors hover:text-terracotta',
                  item.accent && 'text-terracotta',
                  isActive && 'text-terracotta',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <button
            className="tactile rounded-md p-2 text-graphite hover:bg-cream-light"
            aria-label="Buscar produtos"
            onClick={openSearch}
          >
            <MagnifyingGlass size={22} />
          </button>
          <Link
            to={isAuthenticated ? '/minha-conta' : '/entrar'}
            className="tactile rounded-md p-2 text-graphite hover:bg-cream-light"
            aria-label="Minha conta"
          >
            <User size={22} />
          </Link>
          <button
            className="tactile relative rounded-md p-2 text-graphite hover:bg-cream-light"
            aria-label={`Carrinho com ${itemCount} ${itemCount === 1 ? 'item' : 'itens'}`}
            onClick={openCart}
          >
            <Handbag size={22} />
            {itemCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-terracotta px-1 text-[0.65rem] font-bold text-cream-light">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Menu mobile */}
      {mobileMenuOpen && (
        <div className="border-t border-border bg-cream-lighter lg:hidden">
          <nav className="flex flex-col px-4 py-2" aria-label="Categorias">
            {NAV.map((item) => (
              <Link
                key={item.slug}
                to={`/categoria/${item.slug}`}
                onClick={closeMobileMenu}
                className={cn(
                  'flex items-center justify-between border-b border-border/60 py-3.5 text-base font-medium text-graphite',
                  item.accent && 'text-terracotta',
                )}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/catalogo"
              onClick={closeMobileMenu}
              className="py-3.5 text-base font-medium text-cinnamon"
            >
              Ver tudo
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

export { X as CloseIcon };
