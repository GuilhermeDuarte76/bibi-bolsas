import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { FunnelSimple, SlidersHorizontal, X } from '@phosphor-icons/react';
import { catalogService, queryKeys } from '@/lib/api';
import type { CatalogFilters, CategorySlug, Occasion, SortOption } from '@/types';
import { Container } from '@/components/ui/Layout';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Field';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductGridSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState, SearchEmptyIcon } from '@/components/ui/States';
import { formatPrice } from '@/lib/utils';

const SORT_LABELS: Record<SortOption, string> = {
  destaque: 'Destaque',
  novidade: 'Novidade',
  'menor-preco': 'Menor preço',
  'maior-preco': 'Maior preço',
  'mais-vendidos': 'Mais vendidos',
};

const CATEGORY_TITLES: Record<string, { title: string; subtitle: string }> = {
  bolsas: { title: 'Bolsas', subtitle: 'Do trabalho ao jantar, com personalidade.' },
  mochilas: { title: 'Mochilas', subtitle: 'Praticidade que acompanha o seu ritmo.' },
  malas: { title: 'Malas', subtitle: 'Para cada viagem, o companheiro certo.' },
  'kit-viagem': { title: 'Kit Viagem', subtitle: 'Conjuntos pensados para quem ama partir.' },
  promocoes: { title: 'Promoções', subtitle: 'Curadoria especial com preços especiais.' },
};

export function CatalogPage() {
  const { slug } = useParams<{ slug: string }>();
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const category = slug as CategorySlug | undefined;
  const page = Number(params.get('page') ?? '1');

  const filters: CatalogFilters = useMemo(
    () => ({
      category,
      search: params.get('q') ?? undefined,
      sort: (params.get('sort') as SortOption) ?? 'destaque',
      colors: params.getAll('cor'),
      occasions: params.getAll('ocasiao') as Occasion[],
      materials: params.getAll('material'),
      onlyPromo: params.get('promo') === '1',
      onlyInStock: params.get('estoque') === '1',
      maxPriceCents: params.get('max') ? Number(params.get('max')) : undefined,
      page,
      pageSize: 12,
    }),
    [category, params, page],
  );

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: queryKeys.products(filters),
    queryFn: () => catalogService.listProducts(filters),
    placeholderData: keepPreviousData,
  });

  const heading = category
    ? CATEGORY_TITLES[category]
    : filters.search
      ? { title: `Resultados para “${filters.search}”`, subtitle: '' }
      : { title: 'Toda a vitrine', subtitle: 'Bolsas, mochilas, malas e muito mais.' };

  // Helpers para mexer nos params preservando os demais.
  const update = (mutate: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(params);
    mutate(next);
    next.delete('page');
    setParams(next, { replace: true });
  };

  const toggleMulti = (key: string, value: string) =>
    update((p) => {
      const vals = p.getAll(key);
      p.delete(key);
      if (vals.includes(value)) vals.filter((v) => v !== value).forEach((v) => p.append(key, v));
      else [...vals, value].forEach((v) => p.append(key, v));
    });

  const setSort = (sort: string) => update((p) => p.set('sort', sort));
  const clearAll = () =>
    setParams(category ? new URLSearchParams() : new URLSearchParams(), { replace: true });

  const facets = data?.facets;
  const activeCount =
    filters.colors!.length +
    filters.occasions!.length +
    filters.materials!.length +
    (filters.onlyPromo ? 1 : 0) +
    (filters.onlyInStock ? 1 : 0) +
    (filters.maxPriceCents ? 1 : 0);

  const FilterPanel = (
    <div className="flex flex-col gap-7">
      {facets && facets.colors.length > 0 && (
        <FilterGroup title="Cor">
          <div className="flex flex-wrap gap-2">
            {facets.colors.map((c) => {
              const active = filters.colors!.includes(c.value);
              return (
                <button
                  key={c.value}
                  onClick={() => toggleMulti('cor', c.value)}
                  className={`tactile rounded-full border px-3 py-1.5 text-xs ${
                    active ? 'border-terracotta bg-terracotta/10 text-terracotta' : 'border-border text-graphite'
                  }`}
                >
                  {c.label} <span className="text-store-gray">({c.count})</span>
                </button>
              );
            })}
          </div>
        </FilterGroup>
      )}

      {facets && facets.occasions.length > 0 && (
        <FilterGroup title="Ocasião">
          <div className="flex flex-col gap-2">
            {facets.occasions.map((o) => (
              <Check
                key={o.value}
                label={`${o.label} (${o.count})`}
                checked={filters.occasions!.includes(o.value as Occasion)}
                onChange={() => toggleMulti('ocasiao', o.value)}
              />
            ))}
          </div>
        </FilterGroup>
      )}

      {facets && facets.materials.length > 0 && (
        <FilterGroup title="Material">
          <div className="flex flex-col gap-2">
            {facets.materials.map((m) => (
              <Check
                key={m.value}
                label={`${m.label} (${m.count})`}
                checked={filters.materials!.includes(m.value)}
                onChange={() => toggleMulti('material', m.value)}
              />
            ))}
          </div>
        </FilterGroup>
      )}

      {facets && (
        <FilterGroup title="Preço máximo">
          <input
            type="range"
            min={facets.priceRange.minCents}
            max={facets.priceRange.maxCents}
            step={1000}
            value={filters.maxPriceCents ?? facets.priceRange.maxCents}
            onChange={(e) => update((p) => p.set('max', e.target.value))}
            className="w-full accent-terracotta"
            aria-label="Preço máximo"
          />
          <p className="text-sm text-graphite-soft">
            Até {formatPrice(filters.maxPriceCents ?? facets.priceRange.maxCents)}
          </p>
        </FilterGroup>
      )}

      <FilterGroup title="Outros">
        <div className="flex flex-col gap-2">
          <Check label="Somente em promoção" checked={!!filters.onlyPromo} onChange={() => update((p) => (filters.onlyPromo ? p.delete('promo') : p.set('promo', '1')))} />
          <Check label="Somente em estoque" checked={!!filters.onlyInStock} onChange={() => update((p) => (filters.onlyInStock ? p.delete('estoque') : p.set('estoque', '1')))} />
        </div>
      </FilterGroup>

      {activeCount > 0 && (
        <Button variant="outline" size="sm" onClick={clearAll}>
          Limpar filtros ({activeCount})
        </Button>
      )}
    </div>
  );

  return (
    <Container className="py-10">
      {/* Cabecalho da categoria */}
      <div className="mb-8">
        <h1 className="font-display text-3xl text-graphite sm:text-4xl">{heading.title}</h1>
        {heading.subtitle && <p className="mt-2 text-graphite-soft">{heading.subtitle}</p>}
      </div>

      {/* Barra de controles */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <button
          onClick={() => setFiltersOpen(true)}
          className="tactile flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-graphite lg:hidden"
        >
          <SlidersHorizontal size={18} /> Filtros
          {activeCount > 0 && <span className="rounded-full bg-terracotta px-1.5 text-xs text-cream-light">{activeCount}</span>}
        </button>
        <p className="hidden text-sm text-graphite-soft lg:block">
          {data ? `${data.page.total} ${data.page.total === 1 ? 'produto' : 'produtos'}` : ' '}
        </p>
        <label className="flex items-center gap-2 text-sm">
          <span className="hidden text-graphite-soft sm:inline">Ordenar:</span>
          <Select
            value={filters.sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-10 w-auto"
            aria-label="Ordenar por"
          >
            {Object.entries(SORT_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <div className="flex gap-10">
        {/* Sidebar desktop */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-28">
            <h2 className="mb-5 flex items-center gap-2 font-display text-lg text-graphite">
              <FunnelSimple size={18} /> Filtrar
            </h2>
            {FilterPanel}
          </div>
        </aside>

        {/* Grade */}
        <div className="min-w-0 flex-1">
          {isLoading ? (
            <ProductGridSkeleton count={9} />
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : data && data.page.items.length === 0 ? (
            <EmptyState
              icon={SearchEmptyIcon}
              title="Nenhum produto encontrado"
              description="Tente remover alguns filtros ou explore outras categorias."
              action={{ label: 'Limpar filtros', onClick: clearAll }}
            />
          ) : (
            <>
              <div className={`grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-3 ${isFetching ? 'opacity-60' : ''}`}>
                {data!.page.items.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>

              {/* Paginacao */}
              {data!.page.totalPages > 1 && (
                <div className="mt-12 flex items-center justify-center gap-2">
                  {Array.from({ length: data!.page.totalPages }).map((_, i) => {
                    const n = i + 1;
                    const active = n === data!.page.page;
                    return (
                      <button
                        key={n}
                        onClick={() => setParams((p) => { p.set('page', String(n)); return p; }, { replace: true })}
                        aria-current={active ? 'page' : undefined}
                        className={`tactile h-10 w-10 rounded-full text-sm font-medium ${
                          active ? 'bg-graphite text-cream-light' : 'border border-border text-graphite hover:border-graphite'
                        }`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Drawer de filtros mobile */}
      {filtersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filtros">
          <button aria-label="Fechar filtros" className="absolute inset-0 bg-graphite/40" onClick={() => setFiltersOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col bg-cream-lighter">
            <header className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-display text-xl text-graphite">Filtros</h2>
              <button onClick={() => setFiltersOpen(false)} aria-label="Fechar" className="tactile rounded-md p-1.5 hover:bg-cream-light">
                <X size={20} />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto px-5 py-6">{FilterPanel}</div>
            <footer className="border-t border-border p-4">
              <Button fullWidth onClick={() => setFiltersOpen(false)}>
                Ver {data?.page.total ?? ''} resultados
              </Button>
            </footer>
          </div>
        </div>
      )}
    </Container>
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

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-graphite">
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
