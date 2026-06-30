import { Link } from 'react-router-dom';
import { InstagramLogo, Lock, ShieldCheck, Truck } from '@phosphor-icons/react';
import { Logo } from './Logo';
import { Container } from '@/components/ui/Layout';

const COLUMNS = [
  {
    title: 'Comprar',
    links: [
      { to: '/categoria/bolsas', label: 'Bolsas' },
      { to: '/categoria/mochilas', label: 'Mochilas' },
      { to: '/categoria/malas', label: 'Malas' },
      { to: '/categoria/kit-viagem', label: 'Kit Viagem' },
      { to: '/categoria/promocoes', label: 'Promoções' },
    ],
  },
  {
    title: 'Ajuda',
    links: [
      { to: '/minha-conta/pedidos', label: 'Meus pedidos' },
      { to: '#', label: 'Trocas e devoluções' },
      { to: '#', label: 'Prazos e envio' },
      { to: '#', label: 'Formas de pagamento' },
      { to: '#', label: 'Fale conosco' },
    ],
  },
  {
    title: 'A Bibi',
    links: [
      { to: '#', label: 'Nossa história' },
      { to: '#', label: 'Política de privacidade' },
      { to: '#', label: 'Termos de uso' },
      { to: '#', label: 'Trabalhe conosco' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-cream-light">
      {/* Selos de confianca */}
      <Container className="grid grid-cols-1 gap-4 border-b border-border py-8 sm:grid-cols-3">
        {[
          { icon: Truck, title: 'Envio para todo o Brasil', desc: 'Frete calculado no checkout' },
          { icon: Lock, title: 'Pagamento seguro', desc: 'Pix e cartão com proteção' },
          { icon: ShieldCheck, title: 'Troca facilitada', desc: 'Até 7 dias para troca' },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-surface text-terracotta">
              <Icon size={22} />
            </span>
            <div>
              <p className="text-sm font-semibold text-graphite">{title}</p>
              <p className="text-xs text-graphite-soft">{desc}</p>
            </div>
          </div>
        ))}
      </Container>

      <Container className="grid grid-cols-2 gap-8 py-12 md:grid-cols-5">
        <div className="col-span-2">
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-graphite-soft">
            Uma bolsa ideal para cada momento. Curadoria de bolsas, mochilas e malas com cuidado e
            estilo prático.
          </p>
          <a
            href="https://www.instagram.com/bibibolsas"
            target="_blank"
            rel="noreferrer"
            className="tactile mt-5 inline-flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-sm font-medium text-graphite hover:text-terracotta"
          >
            <InstagramLogo size={18} /> @bibibolsas
          </a>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="font-display text-base text-graphite">{col.title}</h3>
            <ul className="mt-4 flex flex-col gap-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="text-sm text-graphite-soft hover:text-terracotta">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Container>

      <div className="border-t border-border py-5">
        <Container className="flex flex-col items-center justify-between gap-2 text-xs text-graphite-soft sm:flex-row">
          <p>© {new Date().getFullYear()} Bibi Bolsas. Todos os direitos reservados.</p>
          <p>CNPJ 00.000.000/0001-00 · Feito com cuidado no Brasil</p>
        </Container>
      </div>
    </footer>
  );
}
