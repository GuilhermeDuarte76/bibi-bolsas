import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  CaretRight,
  Handbag,
  Heart,
  List,
  MagnifyingGlass,
  Package,
  Question,
  SignIn,
  SignOut,
  Truck,
  User,
  X,
} from '@phosphor-icons/react';
import { Logo } from './Logo';
import { useUI } from '@/store/ui';
import { useCart } from '@/store/cart';
import { useFavorites } from '@/store/favorites';
import { useAuth } from '@/hooks/useAuth';
import { useOverlay } from '@/hooks/useOverlay';
import { catalogService, queryKeys } from '@/lib/api';
import { STORE } from '@/lib/store-info';
import { cn, formatPrice } from '@/lib/utils';

/**
 * Padding lateral identico ao do <Container>. Sem isso o logo e os icones
 * ficam desalinhados do conteudo da pagina em celular e tablet.
 */
const GUTTER = 'px-4 sm:px-6 lg:px-10 2xl:px-14';
const SHELL = `mx-auto w-full max-w-[1280px] ${GUTTER}`;

/** Categorias exibidas ate a API responder — evita o header "pular" no load. */
const FALLBACK_NAV = [
  { slug: 'bolsas', name: 'Bolsas' },
  { slug: 'mochilas', name: 'Mochilas' },
  { slug: 'malas', name: 'Malas' },
  { slug: 'kit-viagem', name: 'Kit Viagem' },
  { slug: 'promocoes', name: 'Promoções' },
];

const HELP_LINKS = [
  { to: '/ajuda/prazos-e-envio', label: 'Prazos e envio' },
  { to: '/ajuda/trocas-e-devolucoes', label: 'Trocas e devoluções' },
  { to: '/ajuda/formas-de-pagamento', label: 'Formas de pagamento' },
  { to: '/ajuda/contato', label: 'Fale conosco' },
];

interface NavItem {
  slug: string;
  name: string;
  accent: boolean;
}

export function Header() {
  const { openSearch, openCart, mobileMenuOpen, toggleMobileMenu, closeMobileMenu } = useUI();
  const itemCount = useCart((s) => s.itemCount());
  const favoriteCount = useFavorites((s) => s.items.length);
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();

  const { data: categories } = useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => catalogService.getCategories(),
    staleTime: 5 * 60 * 1000,
  });

  const nav: NavItem[] = (categories?.length ? categories : FALLBACK_NAV).map((category) => ({
    slug: category.slug,
    name: category.name,
    accent: category.slug === 'promocoes',
  }));

  // Trocar de pagina sempre fecha o menu — senao ele fica aberto sobre a nova tela.
  useEffect(() => {
    closeMobileMenu();
  }, [pathname, closeMobileMenu]);

  return (
    <>
      {/* Faixa de beneficios — rola junto com a pagina, nao ocupa espaco fixo */}
      <div className="on-dark bg-graphite text-cream-light">
        <div
          className={cn(
            SHELL,
            'flex items-center justify-center gap-5 py-2 text-[0.7rem] sm:gap-8 sm:text-xs',
          )}
        >
          <span className="flex items-center gap-1.5">
            <Truck size={14} aria-hidden />
            Frete grátis acima de {formatPrice(STORE.freeShippingThresholdCents)}
          </span>
          <span className="hidden sm:inline">Pagamento seguro</span>
          <span className="hidden md:inline">
            Troca facilitada em até {STORE.returnWindowDays} dias
          </span>
        </div>
      </div>

      {/* Acompanha a pagina inteira: em qualquer ponto da rolagem a navegacao esta a um toque. */}
      <header className="sticky top-0 z-40 border-b border-border bg-cream-lighter/95 backdrop-blur-md">
        <div className={cn(SHELL, 'flex h-16 items-center gap-1 sm:gap-2 lg:h-18')}>
          <button
            type="button"
            // -ml alinha opticamente o icone com o texto da pagina abaixo.
            className="tactile -ml-2.5 grid h-11 w-11 shrink-0 place-items-center rounded-full text-graphite hover:bg-cream-light lg:hidden"
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu de categorias'}
            aria-expanded={mobileMenuOpen}
            aria-controls="menu-mobile"
            onClick={toggleMobileMenu}
          >
            {mobileMenuOpen ? <X size={24} /> : <List size={24} />}
          </button>

          {/* min-w-0: em telas de 320px a linha precisa poder comprimir a marca */}
          <Logo className="min-w-0" />

          {/* Navegacao inline — so no desktop, onde ha largura de sobra */}
          <nav
            className="hidden min-w-0 flex-1 items-center justify-center gap-6 lg:flex xl:gap-9"
            aria-label="Categorias"
          >
            {nav.map((item) => (
              <NavLink
                key={item.slug}
                to={`/categoria/${item.slug}`}
                className={({ isActive }) =>
                  cn(
                    'relative whitespace-nowrap py-2 text-sm font-medium transition-colors',
                    'after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-terracotta after:transition-transform after:duration-200 hover:after:scale-x-100',
                    item.accent ? 'text-terracotta' : 'text-graphite hover:text-terracotta',
                    isActive && 'text-terracotta after:scale-x-100',
                  )
                }
              >
                {item.name}
              </NavLink>
            ))}
          </nav>

          <div className="-mr-2.5 ml-auto flex shrink-0 items-center">
            <IconButton label="Buscar produtos" onClick={openSearch}>
              <MagnifyingGlass size={22} />
            </IconButton>

            <IconButton
              as="link"
              to="/favoritos"
              label={`Favoritos${favoriteCount ? ` (${favoriteCount})` : ''}`}
              count={favoriteCount}
              className="hidden sm:grid"
            >
              <Heart size={22} />
            </IconButton>

            <AccountButton isAuthenticated={isAuthenticated} />

            <IconButton
              label={`Sacola com ${itemCount} ${itemCount === 1 ? 'item' : 'itens'}`}
              count={itemCount}
              onClick={openCart}
            >
              <Handbag size={22} />
            </IconButton>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <MobileMenu nav={nav} onClose={closeMobileMenu} isAuthenticated={isAuthenticated} />
      )}
    </>
  );
}

/**
 * Conta na barra: entra direto quando deslogada, abre atalhos (incluindo Sair)
 * quando logada — sem obrigar a abrir o menu lateral.
 */
function AccountButton({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { customer, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!isAuthenticated) {
    return (
      <IconButton as="link" to="/entrar" label="Entrar na conta">
        <SignIn size={22} />
      </IconButton>
    );
  }

  const firstName = customer?.name?.split(' ')[0];

  return (
    <div ref={wrapperRef} className="relative">
      <IconButton
        label={firstName ? `Conta de ${firstName}` : 'Minha conta'}
        expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <User size={22} weight={open ? 'fill' : 'regular'} />
      </IconButton>

      {open && (
        <div className="animate-pop-in absolute right-0 top-full z-50 mt-1 w-60 origin-top-right overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-lift)]">
          {firstName && (
            <p className="border-b border-border px-4 py-3 text-sm text-graphite-soft">
              Olá, <span className="font-medium text-graphite">{firstName}</span>
            </p>
          )}
          <div className="flex flex-col p-1.5">
            <AccountMenuLink to="/minha-conta" icon={User} label="Minha conta" onGo={() => setOpen(false)} />
            <AccountMenuLink to="/minha-conta/pedidos" icon={Package} label="Meus pedidos" onGo={() => setOpen(false)} />
            <AccountMenuLink to="/favoritos" icon={Heart} label="Favoritos" onGo={() => setOpen(false)} />
          </div>
          <div className="border-t border-border p-1.5">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                logout.mutate(undefined, { onSuccess: () => navigate('/') });
              }}
              className="tactile flex w-full min-h-touch items-center gap-3 rounded-[var(--radius-md)] px-3 text-sm font-medium text-danger hover:bg-danger-soft"
            >
              <SignOut size={18} aria-hidden /> Sair da conta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AccountMenuLink({
  to,
  icon: Icon,
  label,
  onGo,
}: {
  to: string;
  icon: typeof User;
  label: string;
  onGo: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onGo}
      className="tactile flex min-h-touch items-center gap-3 rounded-[var(--radius-md)] px-3 text-sm text-graphite hover:bg-cream-light"
    >
      <Icon size={18} className="text-cinnamon" aria-hidden /> {label}
    </Link>
  );
}

/** Botao de icone com alvo de 44px e contador opcional. */
function IconButton({
  as = 'button',
  to,
  label,
  count,
  expanded,
  className,
  children,
  onClick,
}: {
  as?: 'button' | 'link';
  to?: string;
  label: string;
  count?: number;
  expanded?: boolean;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const classes = cn(
    'tactile relative grid h-11 w-11 place-items-center rounded-full text-graphite transition-colors hover:bg-cream-light',
    expanded && 'bg-cream-light',
    className,
  );

  const badge =
    count && count > 0 ? (
      <span
        aria-hidden
        className="absolute right-0.5 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-terracotta px-1 text-[0.65rem] font-bold leading-none text-cream-light ring-2 ring-cream-lighter"
      >
        {count > 99 ? '99+' : count}
      </span>
    ) : null;

  if (as === 'link' && to) {
    return (
      <Link to={to} aria-label={label} className={classes}>
        {children}
        {badge}
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={expanded}
      onClick={onClick}
      className={classes}
    >
      {children}
      {badge}
    </button>
  );
}

/** Menu lateral de celular/tablet: categorias, conta e ajuda. */
function MobileMenu({
  nav,
  onClose,
  isAuthenticated,
}: {
  nav: NavItem[];
  onClose: () => void;
  isAuthenticated: boolean;
}) {
  const closeRef = useOverlay<HTMLButtonElement>(true, onClose);

  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button
        type="button"
        aria-label="Fechar menu"
        tabIndex={-1}
        className="absolute inset-0 animate-overlay-in bg-graphite/45 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        id="menu-mobile"
        className="animate-drawer-left-in absolute left-0 top-0 flex h-[100dvh] w-[86%] max-w-sm flex-col bg-cream-lighter shadow-[var(--shadow-lift)]"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <Logo />
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="tactile -mr-1.5 grid h-11 w-11 place-items-center rounded-full text-graphite hover:bg-cream-light"
          >
            <X size={22} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5">
          <MenuSection title="Categorias">
            {nav.map((item) => (
              <MenuLink
                key={item.slug}
                to={`/categoria/${item.slug}`}
                label={item.name}
                onClick={onClose}
                accent={item.accent}
                chevron
              />
            ))}
            <MenuLink to="/catalogo" label="Ver toda a vitrine" onClick={onClose} chevron />
          </MenuSection>

          <MenuSection title="Minha conta">
            {isAuthenticated ? (
              <>
                <MenuLink to="/minha-conta" icon={User} label="Visão geral" onClick={onClose} />
                <MenuLink
                  to="/minha-conta/pedidos"
                  icon={Package}
                  label="Meus pedidos"
                  onClick={onClose}
                />
              </>
            ) : (
              <MenuLink to="/entrar" icon={SignIn} label="Entrar ou criar conta" onClick={onClose} />
            )}
            <MenuLink to="/favoritos" icon={Heart} label="Favoritos" onClick={onClose} />
          </MenuSection>

          <MenuSection title="Ajuda">
            {HELP_LINKS.map((link) => (
              <MenuLink
                key={link.to}
                to={link.to}
                icon={Question}
                label={link.label}
                onClick={onClose}
              />
            ))}
          </MenuSection>
        </div>

        {/* px/pt separados: `p-4` (utilities) venceria o `pb-safe` (components) */}
        <footer className="shrink-0 border-t border-border px-4 pt-4 pb-safe">
          <Link
            to="/catalogo"
            onClick={onClose}
            className="tactile flex h-12 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-terracotta font-medium text-cream-light shadow-[var(--shadow-card)]"
          >
            Explorar vitrine <ArrowRight size={18} weight="bold" />
          </Link>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function MenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-7 last:mb-0">
      <h2 className="eyebrow mb-1.5 px-2">{title}</h2>
      <div className="flex flex-col">{children}</div>
    </section>
  );
}

function MenuLink({
  to,
  icon: Icon,
  label,
  accent,
  chevron,
  onClick,
}: {
  to: string;
  icon?: typeof User;
  label: string;
  accent?: boolean;
  chevron?: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        'tactile flex min-h-touch items-center gap-3 rounded-[var(--radius-md)] px-2 py-2.5 text-base hover:bg-cream-light',
        accent ? 'font-medium text-terracotta' : 'text-graphite',
      )}
    >
      {Icon && <Icon size={20} className="text-cinnamon" aria-hidden />}
      {label}
      {chevron && <CaretRight size={16} className="ml-auto text-store-gray" aria-hidden />}
    </Link>
  );
}

export { X as CloseIcon };
