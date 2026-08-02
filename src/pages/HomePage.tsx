import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Tag } from '@phosphor-icons/react';
import { catalogService, queryKeys } from '@/lib/api';
import { Container, SectionHeading } from '@/components/ui/Layout';
import { ButtonLink } from '@/components/ui/Button';
import { ProductRow } from '@/components/product/ProductRow';
import { Stars } from '@/components/ui/Stars';
import { HERO, SHOWCASES, TESTIMONIALS } from '@/lib/home-content';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useViewItemList } from '@/hooks/useViewItemList';
import { cn } from '@/lib/utils';
import type { Category, ProductSummary } from '@/types';

export function HomePage() {
  const featured = useQuery({
    queryKey: queryKeys.featured,
    queryFn: () => catalogService.getFeatured(),
  });
  const categories = useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => catalogService.getCategories(),
  });

  usePageMeta({
    description:
      'Bolsas, mochilas e malas escolhidas uma a uma. Frete grátis acima de R$ 299 e troca facilitada em até 7 dias.',
  });

  // Impressao de vitrine: cada bloco da Home e uma lista propria no relatorio.
  useViewItemList('Home · Novidades', featured.data?.novidades);
  useViewItemList('Home · Promoções', featured.data?.promocoes);
  useViewItemList('Home · Mais desejados', featured.data?.desejados);

  return (
    <div className="flex flex-col">
      <Hero />

      <ProductShowcase
        eyebrow="Recém-chegadas"
        title="Novidades"
        to="/catalogo?sort=novidade"
        products={featured.data?.novidades}
        loading={featured.isLoading}
      />

      <CategoryGrid categories={categories.data} loading={categories.isLoading} />

      <PromoShowcase products={featured.data?.promocoes} loading={featured.isLoading} />

      {/* Faixa colorida entre duas vitrines: quebra a repeticao de grades */}
      <Showcases />

      <ProductShowcase
        eyebrow="Favoritas das clientes"
        title="Mais desejados"
        // Nao existe ordenacao por vendas no backend; "mais desejados" e o destaque.
        to="/catalogo?destaque=1"
        products={featured.data?.desejados}
        loading={featured.isLoading}
      />

      <Testimonials />

      <Container className="py-section">
        <div className="on-dark flex flex-col items-center gap-5 rounded-[var(--radius-2xl)] bg-graphite px-6 py-14 text-center text-cream-light sm:px-10">
          <h2 className="max-w-[20ch] font-display text-display-md">
            Pronta para encontrar a sua?
          </h2>
          <p className="max-w-[46ch] text-fluid-base text-cream-light/80">
            Explore toda a vitrine e descubra a bolsa que combina com o seu momento.
          </p>
          <ButtonLink to="/catalogo" size="lg" variant="secondary" className="mt-1">
            Ver todos os produtos <ArrowRight size={18} weight="bold" />
          </ButtonLink>
        </div>
      </Container>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Hero() {
  const [tall, ...small] = HERO.images;

  return (
    <section className="border-b border-border bg-cream-light">
      {/*
       * Celular: titulo -> imagens -> botoes (segue a ordem do DOM).
       * Desktop: texto e botoes na coluna 1, colagem ocupando as duas linhas da
       * coluna 2 — por isso cada bloco declara sua posicao no grid.
       */}
      <Container className="grid gap-7 py-section md:grid-cols-[1.05fr_1fr] md:gap-x-12 md:gap-y-8 lg:gap-x-16">
        <div className="md:col-start-1 md:row-start-1 md:self-end">
          <span className="eyebrow">{HERO.eyebrow}</span>
          <h1 className="mt-3 max-w-[15ch] font-display text-display-xl text-graphite">
            {HERO.titleLead} <span className="italic text-terracotta">{HERO.titleHighlight}</span>
          </h1>
          {/* No celular a chamada ja diz o essencial; o texto longo so atrasa a rolagem */}
          <p className="mt-5 hidden max-w-[46ch] text-fluid-lg text-graphite-soft md:block">
            {HERO.description}
          </p>
        </div>

        {/* Colagem: uma peca alta + duas quadradas, proporcoes fixas em qualquer tela */}
        <div className="grid grid-cols-2 grid-rows-2 gap-3 sm:gap-4 md:col-start-2 md:row-span-2 md:row-start-1 md:self-center">
          <figure className="row-span-2 overflow-hidden rounded-[var(--radius-2xl)] bg-surface shadow-[var(--shadow-soft)]">
            <img src={tall.src} alt={tall.alt} className="h-full w-full object-cover" />
          </figure>
          {small.map((image) => (
            <figure
              key={image.alt}
              className="aspect-square overflow-hidden rounded-[var(--radius-2xl)] bg-surface shadow-[var(--shadow-soft)]"
            >
              <img src={image.src} alt={image.alt} className="h-full w-full object-cover" />
            </figure>
          ))}
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row md:col-start-1 md:row-start-2 md:w-auto md:self-start">
          <ButtonLink to={HERO.primaryCta.to} size="lg" variant="secondary">
            {HERO.primaryCta.label} <ArrowRight size={18} weight="bold" />
          </ButtonLink>
          {HERO.secondaryCta && (
            <ButtonLink to={HERO.secondaryCta.to} size="lg" variant="outline">
              {HERO.secondaryCta.label}
            </ButtonLink>
          )}
        </div>
      </Container>
    </section>
  );
}

/**
 * Faixa de produtos com titulo e link.
 * Some por completo quando nao ha o que mostrar — titulo orfao sobre espaco
 * vazio parece pagina quebrada.
 */
function ProductShowcase({
  eyebrow,
  title,
  to,
  products,
  loading,
}: {
  eyebrow: string;
  title: string;
  to: string;
  products?: ProductSummary[];
  loading: boolean;
}) {
  if (!loading && !products?.length) return null;

  return (
    <Container className="py-section">
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        action={
          <Link
            to={to}
            className="group inline-flex min-h-touch items-center gap-1.5 text-sm font-medium text-cinnamon hover:text-terracotta"
          >
            Ver todos
            <ArrowRight
              size={16}
              className="transition-transform duration-200 group-hover:translate-x-1"
            />
          </Link>
        }
      />
      <div className="mt-7">
        <ProductRow products={products} loading={loading} listName={`Home · ${title}`} />
      </div>
    </Container>
  );
}

/**
 * Vitrine de promocoes.
 *
 * Ganha faixa propria, selo e botao solido: uma oferta perdida no meio de
 * quatro vitrines iguais nao vende.
 */
function PromoShowcase({ products, loading }: { products?: ProductSummary[]; loading: boolean }) {
  if (!loading && !products?.length) return null;

  return (
    <section className="border-y border-terracotta/20 bg-terracotta/8">
      <Container className="py-section">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-terracotta px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-cream-light">
              <Tag size={12} weight="fill" aria-hidden /> Ofertas
            </span>
            <h2 className="mt-3 font-display text-display-md text-graphite">Em promoção agora</h2>
            <p className="mt-1.5 max-w-[52ch] text-fluid-base text-graphite-soft">
              Peças selecionadas com desconto — enquanto durar o estoque.
            </p>
          </div>
          <ButtonLink
            to="/categoria/promocoes"
            variant="secondary"
            className="w-full shrink-0 sm:w-auto"
          >
            Ver todas as ofertas <ArrowRight size={18} weight="bold" />
          </ButtonLink>
        </div>

        <div className="mt-8">
          <ProductRow products={products} loading={loading} listName="Home · Promoções" />
        </div>
      </Container>
    </section>
  );
}

function CategoryGrid({
  categories,
  loading,
}: {
  categories?: Category[];
  loading: boolean;
}) {
  if (!loading && !categories?.length) return null;

  return (
    <Container className="py-section">
      <SectionHeading eyebrow="Navegue por" title="Categorias" align="center" className="mb-9" />

      {/* 2 colunas ate 768px: em 480px tres cards teriam ~145px cada */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
        {loading
          ? Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="skeleton aspect-[4/5] rounded-[var(--radius-xl)]"
                aria-hidden
              />
            ))
          : categories!.map((category, index) => {
              /*
               * Grade de 2 colunas no celular: com total impar sobraria um
               * buraco na ultima linha. O ultimo card entao ocupa a linha
               * inteira e troca para uma proporcao larga, para nao virar um
               * bloco gigante.
               */
              const fillsLastRow =
                index === categories!.length - 1 && categories!.length % 2 === 1;

              return (
              <Link
                key={category.id}
                to={`/categoria/${category.slug}`}
                className={cn(
                  'group relative overflow-hidden rounded-[var(--radius-xl)] bg-cream-light',
                  fillsLastRow && 'col-span-2 md:col-span-1',
                )}
              >
                <div className={fillsLastRow ? 'aspect-[16/9] md:aspect-[4/5]' : 'aspect-[4/5]'}>
                  <img
                    src={category.image}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                {/* Gradiente mais alto e mais denso: o nome precisa ler sobre qualquer foto */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-graphite/85 via-graphite/45 to-transparent p-3 pt-10 sm:p-4 sm:pt-12">
                  <p className="font-display text-base text-cream-light sm:text-lg">
                    {category.name}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[0.7rem] leading-snug text-cream-light/85 sm:text-xs">
                    {category.tagline}
                  </p>
                </div>
              </Link>
              );
            })}
      </div>
    </Container>
  );
}

function Showcases() {
  return (
    <section className="on-dark bg-terracotta py-section text-cream-light">
      <Container>
        <div className="flex flex-col items-center text-center">
          <span className="eyebrow text-cream-light/80">Para cada momento</span>
          <h2 className="mt-2 max-w-[22ch] font-display text-display-md">Qual é o seu hoje?</h2>
          <p className="mt-3 max-w-[52ch] text-fluid-base text-cream-light/85">
            Três seleções para os pedidos mais comuns da nossa vitrine.
          </p>
        </div>

        {/* 3 colunas so a partir de 768px: em 480px cada card teria ~145px */}
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {SHOWCASES.map(({ key, label, headline, description, icon: Icon, to }) => (
            <Link
              key={key}
              to={to}
              className="tactile group flex flex-col gap-3 rounded-[var(--radius-xl)] bg-cream-lighter/10 p-6 backdrop-blur-sm transition-colors hover:bg-cream-lighter/20"
            >
              <span className="grid h-12 w-12 place-items-center rounded-full bg-cream-light text-terracotta">
                <Icon size={24} aria-hidden />
              </span>
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cream-light/70">
                  {label}
                </p>
                <p className="mt-1 font-display text-display-xs">{headline}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-cream-light/85">{description}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                Ver seleção
                <ArrowRight
                  size={16}
                  weight="bold"
                  className="transition-transform duration-200 group-hover:translate-x-1"
                />
              </span>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="bg-cream-light">
      <Container className="py-section">
        <SectionHeading
          eyebrow="Quem comprou, ama"
          title="O que dizem nossas clientes"
          align="center"
          className="mb-10"
        />
        <div className="grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((testimonial) => (
            <figure
              key={testimonial.name}
              className="flex flex-col gap-3 rounded-[var(--radius-xl)] bg-surface p-6 shadow-[var(--shadow-soft)]"
            >
              <Stars rating={testimonial.rating} />
              <blockquote className="text-fluid-base leading-relaxed text-graphite">
                “{testimonial.text}”
              </blockquote>
              <figcaption className="mt-auto text-sm font-semibold text-cinnamon">
                {testimonial.name}
              </figcaption>
            </figure>
          ))}
        </div>
      </Container>
    </section>
  );
}
