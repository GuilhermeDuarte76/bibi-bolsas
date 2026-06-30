import type {
  CatalogFacets,
  CatalogFilters,
  Category,
  FacetOption,
  Paginated,
  Product,
  ProductSummary,
} from '@/types';
import { USE_MOCK } from './config';
import { delay, http } from './http';
import {
  allColors,
  allMaterials,
  categories as mockCategories,
  products as mockProducts,
} from './mock/catalog';

/** Converte um Product completo no resumo usado em listagens/cards. */
function toSummary(p: Product): ProductSummary {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    categorySlug: p.categorySlug,
    collection: p.collection,
    priceFromCents: p.priceFromCents,
    compareAtFromCents: p.compareAtFromCents,
    badges: p.badges,
    colors: p.colors,
    rating: p.rating,
    reviewCount: p.reviewCount,
    image: p.media[0]?.url ?? '',
    hoverImage: p.media[1]?.url,
    alt: p.media[0]?.alt ?? p.name,
    inStock: p.variants.some((v) => v.stock > 0),
  };
}

const SORTERS: Record<string, (a: Product, b: Product) => number> = {
  destaque: (a, b) => b.rating - a.rating,
  novidade: (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  'menor-preco': (a, b) => a.priceFromCents - b.priceFromCents,
  'maior-preco': (a, b) => b.priceFromCents - a.priceFromCents,
  'mais-vendidos': (a, b) => b.reviewCount - a.reviewCount,
};

function applyFilters(list: Product[], f: CatalogFilters): Product[] {
  let out = [...list];

  if (f.category && f.category !== 'promocoes') {
    out = out.filter((p) => p.categorySlug === f.category);
  }
  if (f.category === 'promocoes') {
    out = out.filter((p) => p.badges.includes('promocao') || p.compareAtFromCents);
  }
  if (f.search) {
    const q = f.search.toLowerCase();
    out = out.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.shortDescription.toLowerCase().includes(q) ||
        p.collection?.toLowerCase().includes(q),
    );
  }
  if (f.minPriceCents != null) out = out.filter((p) => p.priceFromCents >= f.minPriceCents!);
  if (f.maxPriceCents != null) out = out.filter((p) => p.priceFromCents <= f.maxPriceCents!);
  if (f.colors?.length) out = out.filter((p) => p.colors.some((c) => f.colors!.includes(c.id)));
  if (f.sizes?.length) out = out.filter((p) => p.sizes.some((s) => f.sizes!.includes(s.id)));
  if (f.materials?.length) out = out.filter((p) => p.specs.material && f.materials!.includes(p.specs.material));
  if (f.occasions?.length) out = out.filter((p) => p.occasions.some((o) => f.occasions!.includes(o)));
  if (f.onlyPromo) out = out.filter((p) => p.badges.includes('promocao') || p.compareAtFromCents);
  if (f.onlyInStock) out = out.filter((p) => p.variants.some((v) => v.stock > 0));

  const sorter = SORTERS[f.sort ?? 'destaque'];
  out.sort(sorter);
  return out;
}

function buildFacets(list: Product[]): CatalogFacets {
  const count = <T>(items: T[]) => {
    const map = new Map<string, number>();
    items.forEach((i) => map.set(String(i), (map.get(String(i)) ?? 0) + 1));
    return map;
  };

  const colorCounts = count(list.flatMap((p) => p.colors.map((c) => c.id)));
  const sizeCounts = count(list.flatMap((p) => p.sizes.map((s) => s.id)));
  const materialCounts = count(list.map((p) => p.specs.material).filter(Boolean) as string[]);
  const occasionCounts = count(list.flatMap((p) => p.occasions));

  const colors: FacetOption[] = allColors
    .filter((c) => colorCounts.has(c.id))
    .map((c) => ({ value: c.id, label: c.name, count: colorCounts.get(c.id)! }));

  const sizeLabels = new Map(list.flatMap((p) => p.sizes).map((s) => [s.id, s.label]));
  const sizes: FacetOption[] = [...sizeCounts.entries()].map(([value, c]) => ({
    value,
    label: sizeLabels.get(value) ?? value,
    count: c,
  }));

  const materials: FacetOption[] = allMaterials
    .filter((m) => materialCounts.has(m))
    .map((m) => ({ value: m, label: m, count: materialCounts.get(m)! }));

  const occasionLabels: Record<string, string> = {
    trabalho: 'Trabalho',
    passeio: 'Passeio',
    viagem: 'Viagem',
    escola: 'Escola',
    presente: 'Presente',
  };
  const occasions: FacetOption[] = [...occasionCounts.entries()].map(([value, c]) => ({
    value,
    label: occasionLabels[value] ?? value,
    count: c,
  }));

  const prices = list.map((p) => p.priceFromCents);
  return {
    colors,
    sizes,
    materials,
    occasions,
    priceRange: {
      minCents: prices.length ? Math.min(...prices) : 0,
      maxCents: prices.length ? Math.max(...prices) : 100000,
    },
  };
}

export const catalogService = {
  async getCategories(): Promise<Category[]> {
    if (USE_MOCK) return delay(mockCategories);
    // TODO(backend): GET /catalog/categories
    return http<Category[]>('/catalog/categories');
  },

  async listProducts(
    filters: CatalogFilters = {},
  ): Promise<{ page: Paginated<ProductSummary>; facets: CatalogFacets }> {
    if (USE_MOCK) {
      const filtered = applyFilters(mockProducts, filters);
      const page = filters.page ?? 1;
      const pageSize = filters.pageSize ?? 12;
      const start = (page - 1) * pageSize;
      const items = filtered.slice(start, start + pageSize).map(toSummary);
      // Facetas calculadas sobre o conjunto sem paginacao (mas respeitando categoria/busca).
      const facetBase = applyFilters(mockProducts, {
        category: filters.category,
        search: filters.search,
      });
      return delay({
        page: {
          items,
          page,
          pageSize,
          total: filtered.length,
          totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
        },
        facets: buildFacets(facetBase),
      });
    }
    // TODO(backend): GET /catalog/products?<filtros> — resposta paginada + facetas
    return http('/catalog/products', { query: filters as Record<string, unknown> });
  },

  async getProduct(slug: string): Promise<Product> {
    if (USE_MOCK) {
      const p = mockProducts.find((x) => x.slug === slug);
      if (!p) throw new Error('Produto nao encontrado');
      return delay(p);
    }
    // TODO(backend): GET /catalog/products/{slug}
    return http<Product>(`/catalog/products/${slug}`);
  },

  async getFeatured(): Promise<{
    novidades: ProductSummary[];
    desejados: ProductSummary[];
    promocoes: ProductSummary[];
  }> {
    if (USE_MOCK) {
      const byNew = [...mockProducts].sort(
        (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
      );
      const byRating = [...mockProducts].sort((a, b) => b.rating - a.rating);
      const promos = mockProducts.filter((p) => p.compareAtFromCents || p.badges.includes('promocao'));
      return delay({
        novidades: byNew.slice(0, 8).map(toSummary),
        desejados: byRating.slice(0, 8).map(toSummary),
        promocoes: promos.slice(0, 8).map(toSummary),
      });
    }
    // TODO(backend): GET /catalog/featured
    return http('/catalog/featured');
  },

  async getRelated(slug: string): Promise<ProductSummary[]> {
    if (USE_MOCK) {
      const base = mockProducts.find((p) => p.slug === slug);
      const related = mockProducts
        .filter((p) => p.slug !== slug && p.categorySlug === base?.categorySlug)
        .slice(0, 4);
      const fill = mockProducts.filter((p) => p.slug !== slug).slice(0, 4);
      return delay((related.length ? related : fill).slice(0, 4).map(toSummary));
    }
    // TODO(backend): GET /catalog/products/{slug}/related
    return http(`/catalog/products/${slug}/related`);
  },

  async searchSuggest(term: string): Promise<ProductSummary[]> {
    if (USE_MOCK) {
      if (!term.trim()) return delay([], 120);
      const q = term.toLowerCase();
      return delay(
        mockProducts
          .filter((p) => p.name.toLowerCase().includes(q) || p.collection?.toLowerCase().includes(q))
          .slice(0, 5)
          .map(toSummary),
        160,
      );
    }
    // TODO(backend): GET /catalog/search/suggest?q=
    return http('/catalog/search/suggest', { query: { q: term } });
  },
};
