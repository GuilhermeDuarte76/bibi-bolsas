import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useSearchParams } from 'react-router';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { CaretLeft, CaretRight, FunnelSimple, SlidersHorizontal, X } from '@phosphor-icons/react';
import { catalogService, queryKeys } from '@/lib/api';
import type { CatalogFacets, CatalogFilters, CategorySlug, FacetOption, SortOption } from '@/types';
import { Container } from '@/components/ui/Layout';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Field';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductGridSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState, SearchEmptyIcon } from '@/components/ui/States';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useOverlay } from '@/hooks/useOverlay';
import { useViewItemList } from '@/hooks/useViewItemList';
import { analytics } from '@/lib/analytics';
import { cn, formatPrice } from '@/lib/utils';

/** Apenas ordenacoes que o backend implementa (ver SortOption). */
const SORT_LABELS: Record<SortOption, string> = {
  destaque: 'Destaque',
  novidade: 'Novidades',
  'menor-preco': 'Menor preço',
  'maior-preco': 'Maior preço',
};

const CATEGORY_TITLES: Record<string, { title: string; subtitle: string }> = {
  bolsas: { title: 'Bolsas', subtitle: 'Do trabalho ao jantar, com personalidade.' },
  mochilas: { title: 'Mochilas', subtitle: 'Praticidade que acompanha o seu ritmo.' },
  malas: { title: 'Malas', subtitle: 'Para cada viagem, o companheiro certo.' },
  'kit-viagem': { title: 'Kit Viagem', subtitle: 'Conjuntos pensados para quem ama partir.' },
  promocoes: { title: 'Promoções', subtitle: 'Curadoria especial com preços especiais.' },
};

const PAGE_SIZE = 12;

function titleFromSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function CatalogPage() {
  const { slug } = useParams<{ slug: string }>();
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const category = slug as CategorySlug | undefined;
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);

  const filters: CatalogFilters = useMemo(
    () => ({
      category,
      search: params.get('q') ?? undefined,
      sort: (params.get('sort') as SortOption) ?? 'destaque',
      color: params.get('cor') ?? undefined,
      size: params.get('tamanho') ?? undefined,
      material: params.get('material') ?? undefined,
      maxPriceCents: params.get('max') ? Number(params.get('max')) : undefined,
      onlyPromo: params.get('promo') === '1',
      onlyInStock: params.get('estoque') === '1',
      onlyFeatured: params.get('destaque') === '1',
      page,
      pageSize: PAGE_SIZE,
    }),
    [category, params, page],
  );

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: queryKeys.products(filters),
    queryFn: () => catalogService.listProducts(filters),
    placeholderData: keepPreviousData,
  });

  const heading = category
    ? (CATEGORY_TITLES[category] ?? {
        title: titleFromSlug(category),
        subtitle: 'Produtos selecionados para esta categoria.',
      })
    : filters.search
      ? { title: `Resultados para “${filters.search}”`, subtitle: '' }
      : { title: 'Toda a vitrine', subtitle: 'Bolsas, mochilas, malas e muito mais.' };

  /** Altera params preservando os demais e voltando para a primeira pagina. */
  const update = (mutate: (next: URLSearchParams) => void) => {
    const next = new URLSearchParams(params);
    mutate(next);
    next.delete('page');
    setParams(next, { replace: true });
  };

  /** Facetas sao de valor unico: clicar no ativo remove o filtro. */
  const toggleSingle = (key: string, value: string) =>
    update((next) => (next.get(key) === value ? next.delete(key) : next.set(key, value)));

  const toggleFlag = (key: string) =>
    update((next) => (next.get(key) === '1' ? next.delete(key) : next.set(key, '1')));

  const clearAll = () => {
    // Preserva a busca: limpar filtros nao deve jogar a pessoa para fora do que ela procurou.
    const next = new URLSearchParams();
    const search = params.get('q');
    if (search) next.set('q', search);
    setParams(next, { replace: true });
  };

  const activeChips = buildActiveChips(filters, data?.facets);

  const listName = `Catálogo · ${heading.title}`;
  // A assinatura inclui pagina e filtros: cada combinacao e uma impressao nova.
  useViewItemList(listName, data?.page.items, params.toString());

  useEffect(() => {
    if (filters.search) analytics.search(filters.search);
  }, [filters.search]);

  usePageMeta({
    title: heading.title,
    description: heading.subtitle || `Encontre ${heading.title.toLowerCase()} na Bibi Bolsas.`,
    // Busca e combinacoes de filtro geram infinitas URLs — nao devem ir ao indice.
    noIndex: !!filters.search || activeChips.length > 0,
  });

  const total = data?.page.total ?? 0;
  const totalPages = data?.page.totalPages ?? 1;

  const goToPage = (next: number) => {
    const params2 = new URLSearchParams(params);
    if (next <= 1) params2.delete('page');
    else params2.set('page', String(next));
    setParams(params2, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const panel = (
    <FilterPanel
      facets={data?.facets}
      filters={filters}
      onToggleFacet={toggleSingle}
      onToggleFlag={toggleFlag}
      onPriceChange={(value) =>
        update((next) => (value ? next.set('max', String(value)) : next.delete('max')))
      }
    />
  );

  return (
    <Container className="py-section-sm">
      <header className="max-w-[52ch]">
        <h1 className="font-display text-display-lg text-graphite">{heading.title}</h1>
        {heading.subtitle && (
          <p className="mt-2 text-fluid-base text-graphite-soft">{heading.subtitle}</p>
        )}
      </header>

      {/* Barra de controles */}
      <div className="mt-7 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          className="tactile flex min-h-touch items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-medium text-graphite lg:hidden"
        >
          <SlidersHorizontal size={18} aria-hidden /> Filtros
          {activeChips.length > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-terracotta px-1 text-xs font-bold text-cream-light">
              {activeChips.length}
            </span>
          )}
        </button>

        <label className="ml-auto flex shrink-0 items-center gap-2 text-sm">
          <span className="hidden text-graphite-soft sm:inline">Ordenar:</span>
          <Select
            value={filters.sort}
            onChange={(event) => update((next) => next.set('sort', event.target.value))}
            className="h-11 w-auto"
            aria-label="Ordenar por"
          >
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {/* Contagem e filtros ativos na mesma linha: no celular a barra de
          controles nao tem largura para os tres blocos. */}
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-sm text-graphite-soft" aria-live="polite">
          {isLoading ? 'Carregando…' : `${total} ${total === 1 ? 'produto' : 'produtos'}`}
        </p>

        <ul className="flex flex-wrap items-center gap-2">
          {activeChips.map((chip) => (
            <li key={chip.key}>
              <button
                type="button"
                onClick={() => update((next) => next.delete(chip.key))}
                className="tactile flex items-center gap-1.5 rounded-full border border-terracotta/40 bg-terracotta/10 py-1.5 pl-3 pr-2 text-xs font-medium text-terracotta"
              >
                {chip.label}
                <X size={13} weight="bold" aria-hidden />
                <span className="sr-only">Remover filtro</span>
              </button>
            </li>
          ))}
          {activeChips.length > 0 && (
            <li>
              <button
                type="button"
                onClick={clearAll}
                className="px-2 py-1.5 text-xs font-medium text-graphite-soft underline underline-offset-2 hover:text-graphite"
              >
                Limpar tudo
              </button>
            </li>
          )}
        </ul>
      </div>

      <div className="mt-8 flex gap-10 xl:gap-14">
        <aside className="hidden w-60 shrink-0 lg:block xl:w-64">
          <div className="sticky top-24">
            <h2 className="mb-5 flex items-center gap-2 font-display text-display-xs text-graphite">
              <FunnelSimple size={18} aria-hidden /> Filtrar
            </h2>
            {panel}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {isLoading ? (
            <ProductGridSkeleton count={9} />
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : total === 0 ? (
            <EmptyState
              icon={SearchEmptyIcon}
              title={
                activeChips.length > 0
                  ? 'Nenhum produto com esses filtros'
                  : 'Nada por aqui ainda'
              }
              description={
                activeChips.length > 0
                  ? 'Tente remover um filtro ou ampliar a faixa de preço.'
                  : 'Esta seleção está sem produtos no momento. Explore outras categorias.'
              }
              action={
                activeChips.length > 0
                  ? { label: 'Limpar filtros', onClick: clearAll }
                  : undefined
              }
            />
          ) : (
            <>
              <div
                aria-busy={isFetching}
                className={cn(
                  'grid grid-cols-2 gap-x-4 gap-y-9 transition-opacity sm:gap-x-5 md:grid-cols-3',
                  isFetching && 'opacity-60',
                )}
              >
                {data!.page.items.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    listName={listName}
                    index={(page - 1) * PAGE_SIZE + index}
                  />
                ))}
              </div>

              <Pagination current={data!.page.page} total={totalPages} onChange={goToPage} />
            </>
          )}
        </div>
      </div>

      {filtersOpen && (
        <FilterDrawer
          total={total}
          activeCount={activeChips.length}
          onClear={clearAll}
          onClose={() => setFiltersOpen(false)}
        >
          {panel}
        </FilterDrawer>
      )}
    </Container>
  );
}

/* -------------------------------------------------------------------------- */

interface ActiveChip {
  key: string;
  label: string;
}

function buildActiveChips(filters: CatalogFilters, facets?: CatalogFacets): ActiveChip[] {
  const chips: ActiveChip[] = [];
  if (filters.color) chips.push({ key: 'cor', label: filters.color });
  if (filters.size) chips.push({ key: 'tamanho', label: `Tamanho ${filters.size}` });
  if (filters.material) chips.push({ key: 'material', label: filters.material });
  if (filters.maxPriceCents && filters.maxPriceCents < (facets?.priceRange.maxCents ?? Infinity)) {
    chips.push({ key: 'max', label: `Até ${formatPrice(filters.maxPriceCents)}` });
  }
  if (filters.onlyPromo) chips.push({ key: 'promo', label: 'Em promoção' });
  if (filters.onlyInStock) chips.push({ key: 'estoque', label: 'Em estoque' });
  if (filters.onlyFeatured) chips.push({ key: 'destaque', label: 'Destaques' });
  return chips;
}

function FilterPanel({
  facets,
  filters,
  onToggleFacet,
  onToggleFlag,
  onPriceChange,
}: {
  facets?: CatalogFacets;
  filters: CatalogFilters;
  onToggleFacet: (key: string, value: string) => void;
  onToggleFlag: (key: string) => void;
  onPriceChange: (valueCents?: number) => void;
}) {
  return (
    <div className="flex flex-col gap-7">
      {!!facets?.colors.length && (
        <FilterGroup title="Cor">
          <div className="flex flex-wrap gap-2">
            {facets.colors.map((color) => (
              <FacetChip
                key={color.value}
                option={color}
                active={filters.color === color.value}
                onClick={() => onToggleFacet('cor', color.value)}
                swatch={color.hex}
              />
            ))}
          </div>
        </FilterGroup>
      )}

      {!!facets?.sizes.length && (
        <FilterGroup title="Tamanho">
          <div className="flex flex-wrap gap-2">
            {facets.sizes.map((size) => (
              <FacetChip
                key={size.value}
                option={size}
                active={filters.size === size.value}
                onClick={() => onToggleFacet('tamanho', size.value)}
              />
            ))}
          </div>
        </FilterGroup>
      )}

      {!!facets?.materials.length && (
        <FilterGroup title="Material">
          <div className="flex flex-wrap gap-2">
            {facets.materials.map((material) => (
              <FacetChip
                key={material.value}
                option={material}
                active={filters.material === material.value}
                onClick={() => onToggleFacet('material', material.value)}
              />
            ))}
          </div>
        </FilterGroup>
      )}

      {facets && facets.priceRange.maxCents > facets.priceRange.minCents && (
        <FilterGroup title="Preço máximo">
          <PriceSlider
            min={facets.priceRange.minCents}
            max={facets.priceRange.maxCents}
            value={filters.maxPriceCents}
            onCommit={onPriceChange}
          />
        </FilterGroup>
      )}

      <FilterGroup title="Outros">
        <div className="flex flex-col">
          <CheckRow
            label="Somente em promoção"
            checked={!!filters.onlyPromo}
            onChange={() => onToggleFlag('promo')}
          />
          <CheckRow
            label="Somente em estoque"
            checked={!!filters.onlyInStock}
            onChange={() => onToggleFlag('estoque')}
          />
          <CheckRow
            label="Somente destaques"
            checked={!!filters.onlyFeatured}
            onChange={() => onToggleFlag('destaque')}
          />
        </div>
      </FilterGroup>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-graphite">{title}</h3>
      {children}
    </div>
  );
}

function FacetChip({
  option,
  active,
  swatch,
  onClick,
}: {
  option: FacetOption;
  active: boolean;
  swatch?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'tactile flex min-h-[38px] items-center gap-1.5 rounded-full border px-3 text-xs transition-colors',
        active
          ? 'border-terracotta bg-terracotta/10 font-medium text-terracotta'
          : 'border-border bg-surface text-graphite hover:border-graphite/40',
      )}
    >
      {swatch && (
        <span
          aria-hidden
          className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-black/10"
          style={{ backgroundColor: swatch }}
        />
      )}
      {option.label}
      <span className={active ? 'text-terracotta/70' : 'text-store-gray'}>({option.count})</span>
    </button>
  );
}

/**
 * O valor so vai para a URL quando a pessoa solta o controle.
 * Comprometendo a cada pixel, arrastar o slider dispararia uma busca por quadro.
 */
function PriceSlider({
  min,
  max,
  value,
  onCommit,
}: {
  min: number;
  max: number;
  value?: number;
  onCommit: (valueCents?: number) => void;
}) {
  const [draft, setDraft] = useState(value ?? max);

  useEffect(() => {
    setDraft(value ?? max);
  }, [value, max]);

  const commit = () => onCommit(draft >= max ? undefined : draft);

  return (
    <div>
      <input
        type="range"
        min={min}
        max={max}
        step={1000}
        value={draft}
        onChange={(event) => setDraft(Number(event.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
        className="h-11 w-full accent-terracotta"
        aria-label="Preço máximo"
        aria-valuetext={formatPrice(draft)}
      />
      <div className="flex justify-between text-xs text-graphite-soft">
        <span>{formatPrice(min)}</span>
        <span className="font-medium text-graphite">Até {formatPrice(draft)}</span>
      </div>
    </div>
  );
}

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex min-h-touch cursor-pointer items-center gap-2.5 text-sm text-graphite">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-border accent-terracotta"
      />
      {label}
    </label>
  );
}

function FilterDrawer({
  total,
  activeCount,
  onClear,
  onClose,
  children,
}: {
  total: number;
  activeCount: number;
  onClear: () => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const closeRef = useOverlay<HTMLButtonElement>(true, onClose);

  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filtros">
      <button
        type="button"
        aria-label="Fechar filtros"
        tabIndex={-1}
        className="absolute inset-0 animate-overlay-in bg-graphite/45 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="animate-drawer-left-in absolute left-0 top-0 flex h-[100dvh] w-[88%] max-w-sm flex-col bg-cream-lighter shadow-[var(--shadow-lift)]">
        <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-display text-display-xs text-graphite">Filtros</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar filtros"
            className="tactile -mr-1.5 grid h-11 w-11 place-items-center rounded-full text-graphite hover:bg-cream-light"
          >
            <X size={22} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5">{children}</div>

        <footer className="shrink-0 border-t border-border px-4 pt-3 pb-safe">
          {activeCount > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="mb-2 w-full py-2 text-sm font-medium text-graphite-soft underline underline-offset-2"
            >
              Limpar {activeCount} {activeCount === 1 ? 'filtro' : 'filtros'}
            </button>
          )}
          <Button fullWidth size="lg" onClick={onClose}>
            Ver {total} {total === 1 ? 'resultado' : 'resultados'}
          </Button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Paginacao com janela deslizante.
 * A versao anterior renderizava um botao por pagina — com 40 paginas virava
 * uma parede de numeros no celular.
 */
function Pagination({
  current,
  total,
  onChange,
}: {
  current: number;
  total: number;
  onChange: (page: number) => void;
}) {
  if (total <= 1) return null;

  const pages = pageWindow(current, total);

  return (
    <nav className="mt-12 flex items-center justify-center gap-1.5" aria-label="Paginação">
      <PageButton
        label="Página anterior"
        disabled={current <= 1}
        onClick={() => onChange(current - 1)}
      >
        <CaretLeft size={16} weight="bold" />
      </PageButton>

      {pages.map((item, index) =>
        item === 'gap' ? (
          <span key={`gap-${index}`} className="px-1 text-sm text-store-gray" aria-hidden>
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-current={item === current ? 'page' : undefined}
            aria-label={`Página ${item}`}
            className={cn(
              'tactile grid h-11 min-w-11 place-items-center rounded-full px-2 text-sm font-medium',
              item === current
                ? 'bg-graphite text-cream-light'
                : 'border border-border text-graphite hover:border-graphite',
            )}
          >
            {item}
          </button>
        ),
      )}

      <PageButton
        label="Próxima página"
        disabled={current >= total}
        onClick={() => onChange(current + 1)}
      >
        <CaretRight size={16} weight="bold" />
      </PageButton>
    </nav>
  );
}

function PageButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="tactile grid h-11 w-11 place-items-center rounded-full border border-border text-graphite hover:border-graphite disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  );
}

/** Sempre primeira, ultima, atual e uma vizinha de cada lado. */
function pageWindow(current: number, total: number): (number | 'gap')[] {
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);

  const output: (number | 'gap')[] = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - (sorted[index - 1] as number) > 1) output.push('gap');
    output.push(page);
  });
  return output;
}
