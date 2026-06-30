import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Briefcase, Gift, GraduationCap, Sun, Airplane } from '@phosphor-icons/react';
import { catalogService, queryKeys } from '@/lib/api';
import { Container, SectionHeading } from '@/components/ui/Layout';
import { ButtonLink } from '@/components/ui/Button';
import { ProductRow } from '@/components/product/ProductRow';
import { Stars } from '@/components/ui/Stars';
import { editorialImage } from '@/lib/images';
import type { Occasion } from '@/types';

const OCCASIONS: { key: Occasion; label: string; icon: typeof Sun; desc: string }[] = [
  { key: 'trabalho', label: 'Trabalho', icon: Briefcase, desc: 'Estrutura e elegância' },
  { key: 'passeio', label: 'Passeio', icon: Sun, desc: 'Leveza para o dia' },
  { key: 'viagem', label: 'Viagem', icon: Airplane, desc: 'Companheiras de jornada' },
  { key: 'escola', label: 'Escola', icon: GraduationCap, desc: 'Resistência e cor' },
  { key: 'presente', label: 'Presente', icon: Gift, desc: 'Para encantar alguém' },
];

const TESTIMONIALS = [
  { name: 'Marina A.', text: 'A qualidade do couro me surpreendeu. Virou minha bolsa do dia a dia.', rating: 5 },
  { name: 'Carla M.', text: 'Entrega rápida e a cor é linda pessoalmente. Já é minha terceira compra.', rating: 5 },
  { name: 'Rafael S.', text: 'Comprei a mala de bordo para uma viagem e foi perfeita. Recomendo!', rating: 5 },
];

export function HomePage() {
  const featured = useQuery({ queryKey: queryKeys.featured, queryFn: () => catalogService.getFeatured() });
  const categories = useQuery({ queryKey: queryKeys.categories, queryFn: () => catalogService.getCategories() });

  return (
    <div className="flex flex-col">
      {/* HERO editorial assimetrico */}
      <section className="relative overflow-hidden bg-cream-light">
        <Container className="grid items-center gap-8 py-12 md:grid-cols-2 md:py-20">
          <div className="order-2 flex flex-col items-start md:order-1">
            <span className="eyebrow">Nova coleção · Inverno 2026</span>
            <h1 className="mt-4 font-display text-4xl leading-[1.05] text-graphite sm:text-5xl lg:text-6xl">
              Uma bolsa ideal
              <br />
              para <span className="text-terracotta italic">cada momento</span>
            </h1>
            <p className="mt-5 max-w-md text-base text-graphite-soft">
              Curadoria de bolsas, mochilas e malas que unem praticidade e estilo. Feitas para
              acompanhar a sua rotina com cuidado e personalidade.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/catalogo" size="lg" variant="secondary">
                Explorar vitrine <ArrowRight size={18} weight="bold" />
              </ButtonLink>
              <ButtonLink to="/categoria/promocoes" size="lg" variant="outline">
                Ver promoções
              </ButtonLink>
            </div>
          </div>

          <div className="order-1 grid grid-cols-2 gap-4 md:order-2">
            <div className="overflow-hidden rounded-[var(--radius-2xl)] bg-surface shadow-[var(--shadow-soft)]">
              <img src={editorialImage('terracotta', 'tote')} alt="Bolsa tote em destaque" className="h-full w-full object-cover" />
            </div>
            <div className="mt-8 flex flex-col gap-4">
              <div className="overflow-hidden rounded-[var(--radius-2xl)] bg-surface shadow-[var(--shadow-soft)]">
                <img src={editorialImage('travel', 'suitcase')} alt="Mala de viagem" className="h-full w-full object-cover" />
              </div>
              <div className="overflow-hidden rounded-[var(--radius-2xl)] bg-surface shadow-[var(--shadow-soft)]">
                <img src={editorialImage('cinnamon', 'backpack')} alt="Mochila urbana" className="h-full w-full object-cover" />
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* NOVIDADES */}
      <Container className="py-14">
        <SectionHeading
          eyebrow="Recém-chegadas"
          title="Novidades"
          action={
            <Link to="/catalogo?sort=novidade" className="flex items-center gap-1 text-sm font-medium text-terracotta hover:gap-2 transition-all">
              Ver todas <ArrowRight size={16} />
            </Link>
          }
        />
        <div className="mt-8">
          <ProductRow products={featured.data?.novidades} loading={featured.isLoading} />
        </div>
      </Container>

      {/* CATEGORIAS visuais */}
      <Container className="py-6">
        <SectionHeading eyebrow="Navegue por" title="Categorias" align="center" className="mb-8" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {(categories.data ?? []).map((cat) => (
            <Link
              key={cat.id}
              to={`/categoria/${cat.slug}`}
              className="group relative overflow-hidden rounded-[var(--radius-xl)] bg-cream-light"
            >
              <div className="aspect-[4/5]">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-graphite/70 to-transparent p-4">
                <p className="font-display text-lg text-cream-light">{cat.name}</p>
                <p className="text-xs text-cream-light/80">{cat.tagline}</p>
              </div>
            </Link>
          ))}
        </div>
      </Container>

      {/* PARA CADA MOMENTO */}
      <section className="my-10 bg-terracotta py-14 text-cream-light">
        <Container>
          <div className="flex flex-col items-center text-center">
            <span className="eyebrow text-cream-light/80">Para cada momento</span>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl">Qual é o seu hoje?</h2>
            <p className="mt-3 max-w-lg text-cream-light/85">
              Encontre a companheira perfeita para cada ocasião da sua rotina.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {OCCASIONS.map(({ key, label, icon: Icon, desc }) => (
              <Link
                key={key}
                to={`/catalogo?ocasiao=${key}`}
                className="tactile group flex flex-col items-center gap-3 rounded-[var(--radius-xl)] bg-cream-lighter/10 p-6 text-center backdrop-blur-sm hover:bg-cream-lighter/20"
              >
                <span className="grid h-14 w-14 place-items-center rounded-full bg-cream-light text-terracotta">
                  <Icon size={26} />
                </span>
                <div>
                  <p className="font-display text-lg">{label}</p>
                  <p className="text-xs text-cream-light/75">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* MAIS DESEJADOS */}
      <Container className="py-14">
        <SectionHeading
          eyebrow="Favoritas das clientes"
          title="Mais desejados"
          action={
            <Link to="/catalogo?sort=mais-vendidos" className="flex items-center gap-1 text-sm font-medium text-terracotta">
              Ver todos <ArrowRight size={16} />
            </Link>
          }
        />
        <div className="mt-8">
          <ProductRow products={featured.data?.desejados} loading={featured.isLoading} />
        </div>
      </Container>

      {/* PROVA SOCIAL */}
      <section className="bg-cream-light py-14">
        <Container>
          <SectionHeading eyebrow="Quem comprou, ama" title="O que dizem nossas clientes" align="center" className="mb-10" />
          <div className="grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="flex flex-col gap-3 rounded-[var(--radius-xl)] bg-surface p-6 shadow-[var(--shadow-soft)]">
                <Stars rating={t.rating} />
                <blockquote className="text-sm leading-relaxed text-graphite">“{t.text}”</blockquote>
                <figcaption className="text-sm font-semibold text-cinnamon">{t.name}</figcaption>
              </figure>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA final */}
      <Container className="py-16">
        <div className="flex flex-col items-center gap-5 rounded-[var(--radius-2xl)] bg-graphite px-6 py-14 text-center text-cream-light">
          <h2 className="font-display text-3xl sm:text-4xl">Pronta para encontrar a sua?</h2>
          <p className="max-w-md text-cream-light/80">
            Explore toda a vitrine e descubra a bolsa que combina com o seu momento.
          </p>
          <ButtonLink to="/catalogo" size="lg" variant="secondary">
            Ver todos os produtos <ArrowRight size={18} weight="bold" />
          </ButtonLink>
        </div>
      </Container>
    </div>
  );
}
