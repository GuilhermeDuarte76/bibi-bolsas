import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { CaretDown, InstagramLogo, Lock, ShieldCheck, Truck } from '@phosphor-icons/react';
import { Logo } from './Logo';
import { Container } from '@/components/ui/Layout';
import { catalogService, queryKeys } from '@/lib/api';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { STORE, activeContactChannels, formatStoreAddress } from '@/lib/store-info';
import { useConsent } from '@/lib/analytics';
import { hasAnyProvider } from '@/lib/analytics/config';
import { cn, formatPrice } from '@/lib/utils';

const HELP_LINKS = [
  { to: '/minha-conta/pedidos', label: 'Meus pedidos' },
  { to: '/ajuda/prazos-e-envio', label: 'Prazos e envio' },
  { to: '/ajuda/trocas-e-devolucoes', label: 'Trocas e devoluções' },
  { to: '/ajuda/formas-de-pagamento', label: 'Formas de pagamento' },
  { to: '/ajuda/contato', label: 'Fale conosco' },
];

const ABOUT_LINKS = [
  { to: '/institucional/sobre', label: 'Nossa história' },
  { to: '/institucional/privacidade', label: 'Política de privacidade' },
  { to: '/institucional/termos', label: 'Termos de uso' },
];

const FALLBACK_CATEGORIES = [
  { slug: 'bolsas', name: 'Bolsas' },
  { slug: 'mochilas', name: 'Mochilas' },
  { slug: 'malas', name: 'Malas' },
  { slug: 'kit-viagem', name: 'Kit Viagem' },
  { slug: 'promocoes', name: 'Promoções' },
];

interface FooterLink {
  to: string;
  label: string;
}

export function Footer() {
  // Abaixo de 768px as colunas viram acordeao: 13 links abertos empurram o
  // rodape para ~700px de altura no celular.
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const openCookiePreferences = useConsent((state) => state.openPreferences);

  const { data: categories } = useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => catalogService.getCategories(),
    staleTime: 5 * 60 * 1000,
  });

  const shopLinks: FooterLink[] = (categories?.length ? categories : FALLBACK_CATEGORIES).map(
    (category) => ({ to: `/categoria/${category.slug}`, label: category.name }),
  );

  const address = formatStoreAddress();
  const contacts = activeContactChannels();
  const columns: { title: string; links: FooterLink[] }[] = [
    { title: 'Comprar', links: shopLinks },
    { title: 'Ajuda', links: HELP_LINKS },
    { title: 'A Bibi', links: ABOUT_LINKS },
  ];

  return (
    <footer className="mt-section border-t border-border bg-cream-light">
      <TrustBadges />

      <Container className="flex flex-col gap-8 py-8 md:gap-10 md:py-12 lg:flex-row lg:gap-16">
        <div className="lg:w-[300px] lg:shrink-0">
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-graphite-soft">
            Uma bolsa ideal para cada momento. Curadoria de bolsas, mochilas e malas com cuidado e
            estilo prático.
          </p>

          {contacts.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 lg:flex-col lg:gap-1">
              {contacts.map((channel) => (
                <li key={channel.label}>
                  <a
                    href={channel.href}
                    target={channel.href.startsWith('http') ? '_blank' : undefined}
                    rel="noreferrer"
                    className="inline-flex min-h-touch items-center gap-2 text-sm text-graphite-soft hover:text-terracotta lg:min-h-0 lg:py-1"
                  >
                    {channel.label === 'Instagram' && <InstagramLogo size={18} aria-hidden />}
                    {channel.value}
                  </a>
                </li>
              ))}
            </ul>
          )}

          {STORE.businessHours && (
            <p className="mt-2 text-xs text-graphite-soft">Atendimento {STORE.businessHours}</p>
          )}
        </div>

        {isDesktop ? (
          <div className="grid flex-1 grid-cols-3 gap-x-6 gap-y-9">
            {columns.map((column) => (
              <FooterColumn key={column.title} title={column.title} links={column.links} />
            ))}
          </div>
        ) : (
          <div className="-mt-2 flex flex-col border-t border-border/70">
            {columns.map((column) => (
              <FooterAccordion key={column.title} title={column.title} links={column.links} />
            ))}
          </div>
        )}
      </Container>

      <div className="border-t border-border py-5">
        <Container className="flex flex-col gap-1.5 text-xs text-graphite-soft">
          {(STORE.legalName || STORE.cnpj) && (
            <p>
              {[STORE.legalName, STORE.cnpj && `CNPJ ${STORE.cnpj}`].filter(Boolean).join(' · ')}
            </p>
          )}
          {address && <p>{address}</p>}
          <p>
            © {new Date().getFullYear()} {STORE.name}. Todos os direitos reservados.
          </p>
          {hasAnyProvider() && (
            <button
              type="button"
              onClick={openCookiePreferences}
              className="mt-1 w-fit text-left font-medium text-cinnamon hover:text-terracotta hover:underline"
            >
              Preferências de cookies
            </button>
          )}
        </Container>
      </div>
    </footer>
  );
}

/** Selos de confianca: linha compacta no celular, cards com descricao no desktop. */
function TrustBadges() {
  const badges = [
    {
      icon: Truck,
      title: 'Envio para todo o Brasil',
      short: 'Frete grátis',
      desc: `Grátis acima de ${formatPrice(STORE.freeShippingThresholdCents)}`,
    },
    {
      icon: Lock,
      title: 'Pagamento seguro',
      short: 'Pagamento seguro',
      desc: 'Pix com confirmação automática',
    },
    {
      icon: ShieldCheck,
      title: 'Troca facilitada',
      short: `Troca em ${STORE.returnWindowDays} dias`,
      desc: `Até ${STORE.returnWindowDays} dias para trocar`,
    },
  ];

  return (
    <Container className="border-b border-border py-4 md:py-8">
      <ul className="flex items-center justify-between gap-2 md:grid md:grid-cols-3 md:gap-5">
        {badges.map(({ icon: Icon, title, short, desc }) => (
          <li key={title} className="flex min-w-0 flex-col items-center gap-1.5 text-center md:flex-row md:gap-3 md:text-left">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface text-terracotta md:h-11 md:w-11">
              <Icon size={20} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[0.7rem] font-medium leading-tight text-graphite md:text-sm md:font-semibold">
                <span className="md:hidden">{short}</span>
                <span className="hidden md:inline">{title}</span>
              </p>
              <p className="hidden text-xs text-graphite-soft md:block">{desc}</p>
            </div>
          </li>
        ))}
      </ul>
    </Container>
  );
}

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <nav aria-label={title}>
      <h2 className="font-display text-base text-graphite">{title}</h2>
      <ul className="mt-3 flex flex-col gap-1">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className="inline-flex items-center py-1 text-sm text-graphite-soft hover:text-terracotta"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function FooterAccordion({ title, links }: { title: string; links: FooterLink[] }) {
  const [open, setOpen] = useState(false);
  const panelId = `rodape-${title.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="border-b border-border/70">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex min-h-touch w-full items-center justify-between gap-3 py-1 text-left font-display text-base text-graphite"
      >
        {title}
        <CaretDown
          size={16}
          aria-hidden
          className={cn('shrink-0 text-store-gray transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      {open && (
        <ul id={panelId} className="flex flex-col pb-2">
          {links.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className="flex min-h-touch items-center text-sm text-graphite-soft hover:text-terracotta"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
