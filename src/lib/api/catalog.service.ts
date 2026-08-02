import type {
  CatalogFacets,
  CatalogFilters,
  Category,
  CategorySlug,
  FacetOption,
  Paginated,
  Product,
  ProductBadge,
  ProductColor,
  ProductMedia,
  ProductSize,
  ProductSummary,
  ProductVariant,
  Review,
} from '@/types';
import { productImage } from '@/lib/images';
import { USE_MOCK } from './config';
import { delay, http } from './http';
import { categories as mockCategories, products as mockProducts } from './mock/catalog';
import { reviews as mockReviews } from './mock/account';

interface BackendPaged<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface BackendCategoryDto {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  displayOrder: number;
  isActive: boolean;
}

interface BackendProductListDto {
  id: number;
  name: string;
  slug: string;
  shortDescription?: string | null;
  mainImageUrl?: string | null;
  priceFrom?: number | null;
  promotionalPriceFrom?: number | null;
  images?: BackendProductImageDto[];
  variants?: BackendProductVariantDto[];
  isAvailable: boolean;
  isFeatured: boolean;
  isNewArrival: boolean;
  isPromotion: boolean;
}

interface BackendProductImageDto {
  id: number;
  productVariantId?: number | null;
  publicUrl: string;
  altText?: string | null;
  sortOrder: number;
  isMain: boolean;
}

interface BackendProductVariantDto {
  id: number;
  sku: string;
  name: string;
  color?: string | null;
  colorHex?: string | null;
  size?: string | null;
  material?: string | null;
  price: number;
  promotionalPrice?: number | null;
  availableQuantity?: number | null;
  isAvailable: boolean;
}

interface BackendProductDetailDto {
  id: number;
  name: string;
  slug: string;
  shortDescription?: string | null;
  description?: string | null;
  categories: BackendCategoryDto[];
  images: BackendProductImageDto[];
  variants: BackendProductVariantDto[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  isAvailable: boolean;
}

const CATEGORY_FALLBACKS: Record<string, Pick<Category, 'tagline' | 'accent'> & { imageCategory: string; palette: string }> = {
  bolsas: {
    tagline: 'Do trabalho ao jantar, com personalidade.',
    imageCategory: 'bolsas',
    palette: 'terracotta',
    accent: 'terracotta',
  },
  mochilas: {
    tagline: 'Praticidade que acompanha o seu ritmo.',
    imageCategory: 'mochilas',
    palette: 'cinnamon',
    accent: 'cinnamon',
  },
  malas: {
    tagline: 'Para cada viagem, o companheiro certo.',
    imageCategory: 'malas',
    palette: 'travel',
    accent: 'travel-blue',
  },
  'kit-viagem': {
    tagline: 'Conjuntos pensados para quem ama partir.',
    imageCategory: 'kit-viagem',
    palette: 'travel',
    accent: 'travel-blue',
  },
  promocoes: {
    tagline: 'Curadoria especial com preços especiais.',
    imageCategory: 'promocoes',
    palette: 'rose',
    accent: 'school-rose',
  },
};

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
    variants: p.variants,
    media: p.media,
    rating: p.rating,
    reviewCount: p.reviewCount,
    image: p.media[0]?.url ?? '',
    hoverImage: p.media[1]?.url,
    alt: p.media[0]?.alt ?? p.name,
    inStock: p.variants.some((v) => v.stock > 0),
  };
}

function toCents(value?: number | null): number | undefined {
  if (value === undefined || value === null) return undefined;
  return Math.round(Number(value) * 100);
}

function normalizeToken(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function asCategorySlug(slug?: string | null): CategorySlug {
  return (slug?.trim() || 'bolsas') as CategorySlug;
}

function inferBaseCategory(value?: string | null): string {
  const normalized = normalizeToken(value || '');
  if (normalized.includes('mochila')) return 'mochilas';
  if (normalized.includes('mala')) return 'malas';
  if (normalized.includes('viagem') || normalized.includes('kit')) return 'kit-viagem';
  if (normalized.includes('promo')) return 'promocoes';
  return 'bolsas';
}

function fallbackImage(categoryOrName: string | undefined, index = 0): string {
  const key = inferBaseCategory(categoryOrName);
  const meta = CATEGORY_FALLBACKS[key] ?? CATEGORY_FALLBACKS.bolsas;
  return productImage(meta.imageCategory, meta.palette, index);
}

function badgesFromProduct(input: {
  isAvailable?: boolean;
  isNewArrival?: boolean;
  isPromotion?: boolean;
  promotionalPriceFrom?: number | null;
}): ProductBadge[] {
  const badges: ProductBadge[] = [];
  if (input.isNewArrival) badges.push('novo');
  if (input.isPromotion || input.promotionalPriceFrom != null) badges.push('promocao');
  if (input.isAvailable) badges.push('pronta-entrega');
  if (!input.isAvailable && badges.length === 0) badges.push('ultimas-unidades');
  return badges;
}

function mapBackendCategory(dto: BackendCategoryDto, index: number): Category {
  const known = mockCategories.find((category) => category.slug === dto.slug);
  const inferredKey = known?.slug ?? inferBaseCategory(`${dto.slug} ${dto.name}`);
  const fallback = CATEGORY_FALLBACKS[inferredKey] ?? CATEGORY_FALLBACKS.bolsas;

  return {
    id: String(dto.id),
    slug: asCategorySlug(dto.slug),
    name: dto.name,
    tagline: dto.description || known?.tagline || fallback.tagline,
    image: known?.image ?? productImage(fallback.imageCategory, fallback.palette, index),
    accent: known?.accent ?? fallback.accent,
  };
}

function ensurePromotionsCategory(categories: Category[]): Category[] {
  if (categories.some((category) => category.slug === 'promocoes')) return categories;
  const promo = mockCategories.find((category) => category.slug === 'promocoes');
  return promo ? [...categories, promo] : categories;
}

function mapBackendListProduct(
  dto: BackendProductListDto,
  category?: string,
  index = 0,
): ProductSummary {
  const backendVariants = dto.variants ?? [];
  const variants = backendVariants.map((variant) => mapBackendVariant(variant, backendVariants));
  const media = (dto.images ?? []).map((image) => mapBackendImage(image, dto.name));
  const basePriceCents = toCents(dto.priceFrom) ?? 0;
  const promoPriceCents = toCents(dto.promotionalPriceFrom);
  const priceFromCents = promoPriceCents ?? basePriceCents;
  const image = dto.mainImageUrl || media[0]?.url || fallbackImage(category || dto.name, index);

  return {
    id: String(dto.id),
    slug: dto.slug,
    name: dto.name,
    categorySlug: asCategorySlug(category && category !== 'promocoes' ? category : inferBaseCategory(dto.name)),
    priceFromCents,
    compareAtFromCents: promoPriceCents ? basePriceCents : undefined,
    badges: badgesFromProduct(dto),
    colors: uniqueById(backendVariants.map((variant) => mapVariantColor(variant, backendVariants))),
    variants,
    media,
    rating: 0,
    reviewCount: 0,
    image,
    hoverImage: media.find((item) => item.url !== image)?.url,
    alt: dto.name,
    inStock: variants.length ? variants.some((variant) => variant.stock > 0) : dto.isAvailable,
  };
}

function mapPagedProducts(
  result: BackendPaged<BackendProductListDto>,
  category?: string,
): Paginated<ProductSummary> {
  return {
    items: result.items.map((item, index) => mapBackendListProduct(item, category, index)),
    page: result.page,
    pageSize: result.pageSize,
    total: result.totalCount,
    totalPages: Math.max(1, result.totalPages),
  };
}

/**
 * Amostra usada para montar as facetas.
 *
 * O backend nao tem endpoint de facetas, e calcular sobre a pagina atual (12
 * itens) produzia contagem errada e faixa de preco errada no slider. Enquanto
 * nao houver `GET /api/produtos/facetas`, buscamos uma amostra maior da
 * categoria/busca — sem os demais filtros, para as opcoes nao sumirem conforme
 * a pessoa filtra.
 */
const FACET_SAMPLE_SIZE = 100;

/** Conta em quantos produtos distintos cada valor aparece. */
function countByProduct<T>(
  products: T[],
  extract: (product: T) => { value: string; label: string; hex?: string }[],
): (FacetOption & { hex?: string })[] {
  const map = new Map<string, { label: string; hex?: string; count: number }>();

  products.forEach((product) => {
    const seen = new Set<string>();
    extract(product).forEach(({ value, label, hex }) => {
      if (!value || seen.has(value)) return;
      seen.add(value);
      const current = map.get(value);
      map.set(value, { label, hex: hex ?? current?.hex, count: (current?.count ?? 0) + 1 });
    });
  });

  return [...map.entries()]
    .map(([value, { label, hex, count }]) => ({ value, label, hex, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'pt-BR'));
}

function buildBackendFacets(products: BackendProductListDto[]): CatalogFacets {
  const prices = products
    .flatMap((product) => [product.promotionalPriceFrom ?? product.priceFrom])
    .map((price) => toCents(price) ?? 0)
    .filter((price) => price > 0);

  return {
    colors: countByProduct(products, (product) =>
      (product.variants ?? [])
        .filter((variant) => variant.color?.trim())
        .map((variant) => ({
          value: variant.color!.trim(),
          label: variant.color!.trim(),
          hex: variant.colorHex ?? undefined,
        })),
    ),
    sizes: countByProduct(products, (product) =>
      (product.variants ?? [])
        .filter((variant) => variant.size?.trim())
        .map((variant) => ({ value: variant.size!.trim(), label: variant.size!.trim() })),
    ),
    materials: countByProduct(products, (product) =>
      (product.variants ?? [])
        .filter((variant) => variant.material?.trim())
        .map((variant) => ({ value: variant.material!.trim(), label: variant.material!.trim() })),
    ),
    priceRange: {
      minCents: prices.length ? Math.min(...prices) : 0,
      maxCents: prices.length ? Math.max(...prices) : 100000,
    },
  };
}

function mapSort(sort?: string): string | undefined {
  if (sort === 'novidade') return 'lancamentos';
  if (sort === 'menor-preco' || sort === 'maior-preco') return sort;
  // `destaque` e a ordem padrao do backend: nao envia parametro.
  return undefined;
}

function mapProductQuery(filters: CatalogFilters): Record<string, unknown> {
  return {
    search: filters.search,
    category: filters.category && filters.category !== 'promocoes' ? filters.category : undefined,
    color: filters.color,
    material: filters.material,
    size: filters.size,
    minPrice: filters.minPriceCents != null ? filters.minPriceCents / 100 : undefined,
    maxPrice: filters.maxPriceCents != null ? filters.maxPriceCents / 100 : undefined,
    available: filters.onlyInStock ? true : undefined,
    isFeatured: filters.onlyFeatured ? true : undefined,
    isPromotion: filters.onlyPromo || filters.category === 'promocoes' ? true : undefined,
    sort: mapSort(filters.sort),
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 12,
  };
}

async function fetchBackendProducts(
  query: Record<string, unknown>,
  category?: string,
): Promise<Paginated<ProductSummary>> {
  const result = await http<BackendPaged<BackendProductListDto>>('/produtos', {
    auth: false,
    query,
  });
  return mapPagedProducts(result, category);
}

function mapVariantColor(variant: BackendProductVariantDto, variants: BackendProductVariantDto[] = [variant]): ProductColor {
  const baseName = variant.color?.trim() || variant.name.trim() || 'Padrão';
  const normalizedBaseName = normalizeToken(baseName) || 'padrao';
  const variantsWithSameColorName = variants.filter((item) =>
    normalizeToken(item.color?.trim() || item.name.trim() || 'Padrão') === normalizedBaseName,
  );
  const differentVisualColors = new Set(
    variantsWithSameColorName.map((item) => (item.colorHex || '').trim().toLowerCase()),
  ).size > 1;
  const variantName = variant.name.trim();
  const name = differentVisualColors && variantName && normalizeToken(variantName) !== normalizedBaseName
    ? variantName
    : baseName;
  const hex = variant.colorHex || '#a5603f';

  return {
    id: `cor-${normalizeToken(name) || normalizedBaseName}-${normalizeToken(hex) || 'sem-cor'}`,
    name,
    hex,
  };
}

function normalizeSizeKey(label: string): string {
  const canonicalLabel = label
    .trim()
    .replace(/\b(\d+(?:[,.]\d+)?)\s*(kgs?|quilos?|kilos?)\b/gi, '$1kg')
    .replace(/\b(\d+(?:[,.]\d+)?)\s*(centimetros?|centimeters?|cm)\b/gi, '$1cm')
    .replace(/\b(\d+(?:[,.]\d+)?)\s*(milimetros?|millimeters?|mm)\b/gi, '$1mm')
    .replace(/\b(\d+(?:[,.]\d+)?)\s*(litros?|liters?|l)\b/gi, '$1l');

  return normalizeToken(canonicalLabel);
}

function mapVariantSize(variant: BackendProductVariantDto): ProductSize {
  const label = variant.size?.trim() || 'Unico';
  return {
    id: `tam-${normalizeSizeKey(label) || 'unico'}`,
    label,
  };
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

function mapBackendImage(image: BackendProductImageDto, productName: string): ProductMedia {
  return {
    id: String(image.id),
    productVariantId: image.productVariantId ? String(image.productVariantId) : undefined,
    type: 'image',
    url: image.publicUrl,
    alt: image.altText || productName,
  };
}

function mapBackendVariant(
  variant: BackendProductVariantDto,
  variants: BackendProductVariantDto[],
): ProductVariant {
  const color = mapVariantColor(variant, variants);
  const size = mapVariantSize(variant);
  const basePriceCents = toCents(variant.price) ?? 0;
  const promoPriceCents = toCents(variant.promotionalPrice);

  return {
    id: String(variant.id),
    sku: variant.sku,
    name: variant.name,
    colorId: color.id,
    sizeId: size.id,
    material: variant.material ?? undefined,
    priceCents: promoPriceCents ?? basePriceCents,
    compareAtCents: promoPriceCents ? basePriceCents : undefined,
    stock: Math.max(variant.availableQuantity ?? (variant.isAvailable ? 1 : 0), 0),
  };
}

function mapBackendDetail(dto: BackendProductDetailDto): Product {
  const categorySlug = asCategorySlug(dto.categories[0]?.slug ?? inferBaseCategory(dto.name));
  const colors = uniqueById(dto.variants.map((variant) => mapVariantColor(variant, dto.variants)));
  const sizes = uniqueById(dto.variants.map(mapVariantSize));
  const media: ProductMedia[] = dto.images.length
    ? dto.images.map((image) => mapBackendImage(image, dto.name))
    : [
        {
          id: `${dto.id}-fallback`,
          type: 'image',
          url: fallbackImage(categorySlug, 0),
          alt: dto.name,
        },
      ];

  const variants: ProductVariant[] = dto.variants.map((variant) => mapBackendVariant(variant, dto.variants));

  const priceFromCents = variants.length
    ? Math.min(...variants.map((variant) => variant.priceCents))
    : 0;
  const compareAtFromCents = variants
    .map((variant) => variant.compareAtCents)
    .filter((price): price is number => typeof price === 'number')
    .sort((a, b) => a - b)[0];
  const material = dto.variants.find((variant) => variant.material)?.material;

  return {
    id: String(dto.id),
    slug: dto.slug,
    name: dto.name,
    shortDescription: dto.shortDescription || dto.seoDescription || '',
    description: dto.description || dto.shortDescription || '',
    categorySlug,
    collection: dto.categories[0]?.name,
    occasions: [],
    badges: badgesFromProduct({
      isAvailable: dto.isAvailable,
      isPromotion: variants.some((variant) => variant.compareAtCents != null),
    }),
    priceFromCents,
    compareAtFromCents,
    /*
     * Nao inventamos condicao de pagamento aqui: o backend nao expoe
     * parcelamento nem desconto Pix. O que a loja anuncia sai de
     * `STORE.payment`, que hoje esta zerado porque so existe Pix a vista.
     */
    installmentsMax: undefined,
    pixDiscountPct: undefined,
    rating: 0,
    reviewCount: 0,
    colors,
    sizes,
    variants,
    media,
    specs: {
      material: material || undefined,
      care: 'Limpe com pano macio levemente umedecido e evite contato prolongado com umidade.',
    },
    createdAt: new Date().toISOString(),
  };
}

const SORTERS: Record<string, (a: Product, b: Product) => number> = {
  destaque: (a, b) => b.rating - a.rating,
  novidade: (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  'menor-preco': (a, b) => a.priceFromCents - b.priceFromCents,
  'maior-preco': (a, b) => b.priceFromCents - a.priceFromCents,
};

/** Compara rotulos ignorando acento e caixa — no mock e na API o valor e texto. */
function labelMatches(candidate: string | undefined, expected: string | undefined): boolean {
  if (!expected) return true;
  return normalizeToken(candidate ?? '') === normalizeToken(expected);
}

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
  if (f.color) out = out.filter((p) => p.colors.some((c) => labelMatches(c.name, f.color)));
  if (f.size) out = out.filter((p) => p.sizes.some((s) => labelMatches(s.label, f.size)));
  if (f.material) out = out.filter((p) => labelMatches(p.specs.material, f.material));
  if (f.onlyPromo) out = out.filter((p) => p.badges.includes('promocao') || p.compareAtFromCents);
  if (f.onlyInStock) out = out.filter((p) => p.variants.some((v) => v.stock > 0));
  if (f.onlyFeatured) out = out.filter((p) => p.rating >= 4.5);

  const sorter = SORTERS[f.sort ?? 'destaque'];
  out.sort(sorter);
  return out;
}

function buildFacets(list: Product[]): CatalogFacets {
  const colors = countByProduct(list, (product) =>
    product.colors.map((color) => ({ value: color.name, label: color.name, hex: color.hex })),
  );
  const sizes = countByProduct(list, (product) =>
    product.sizes.map((size) => ({ value: size.label, label: size.label })),
  );
  const materials = countByProduct(list, (product) =>
    product.specs.material ? [{ value: product.specs.material, label: product.specs.material }] : [],
  );

  const prices = list.map((p) => p.priceFromCents).filter((price) => price > 0);
  return {
    colors,
    sizes,
    materials,
    priceRange: {
      minCents: prices.length ? Math.min(...prices) : 0,
      maxCents: prices.length ? Math.max(...prices) : 100000,
    },
  };
}

export const catalogService = {
  async getCategories(): Promise<Category[]> {
    if (USE_MOCK) return delay(mockCategories);
    const categories = await http<BackendCategoryDto[]>('/categorias', { auth: false });
    return ensurePromotionsCategory(categories.map(mapBackendCategory));
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
    // Facetas vem de uma amostra da categoria/busca, sem os demais filtros:
    // as opcoes precisam continuar visiveis depois que a pessoa filtra.
    const [page, facetSample] = await Promise.all([
      fetchBackendProducts(mapProductQuery(filters), filters.category),
      http<BackendPaged<BackendProductListDto>>('/produtos', {
        auth: false,
        query: {
          search: filters.search,
          category:
            filters.category && filters.category !== 'promocoes' ? filters.category : undefined,
          isPromotion: filters.category === 'promocoes' ? true : undefined,
          page: 1,
          pageSize: FACET_SAMPLE_SIZE,
        },
      }),
    ]);

    return { page, facets: buildBackendFacets(facetSample.items) };
  },

  async getProduct(slug: string): Promise<Product> {
    if (USE_MOCK) {
      const p = mockProducts.find((x) => x.slug === slug);
      if (!p) throw new Error('Produto nao encontrado');
      return delay(p);
    }
    const product = await http<BackendProductDetailDto>(`/produtos/${slug}`, { auth: false });
    return mapBackendDetail(product);
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
    const [novidades, desejados, promocoes, fallback] = await Promise.all([
      fetchBackendProducts({ isNewArrival: true, sort: 'lancamentos', page: 1, pageSize: 8 }),
      fetchBackendProducts({ isFeatured: true, page: 1, pageSize: 8 }),
      fetchBackendProducts({ isPromotion: true, page: 1, pageSize: 8 }, 'promocoes'),
      fetchBackendProducts({ page: 1, pageSize: 8 }),
    ]);

    return {
      novidades: novidades.items.length ? novidades.items : fallback.items,
      desejados: desejados.items.length ? desejados.items : fallback.items,
      promocoes: promocoes.items,
    };
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
    const products = await http<BackendProductListDto[]>(`/produtos/${slug}/relacionados`, {
      auth: false,
      query: { take: 4 },
    });
    return products.map((product, index) => mapBackendListProduct(product, undefined, index));
  },

  /**
   * Avaliacoes de um produto.
   *
   * ⚠️  Nao existe modulo de avaliacoes no backend — nao ha entidade, endpoint
   * nem moderacao. Em modo mock devolvemos os depoimentos de exemplo para a
   * tela poder ser avaliada; contra a API real devolvemos lista vazia, e a
   * secao mostra "ainda nao tem avaliacoes".
   *
   * Esta funcao existe para que ligar o modulo de verdade seja trocar estas
   * linhas por uma chamada HTTP — o componente nao muda. Antes disso, o
   * ProductPage importava o mock direto, o que levaria dados falsos para
   * producao sem ninguem perceber.
   */
  async getProductReviews(productId: string): Promise<Review[]> {
    if (USE_MOCK) {
      return delay(
        mockReviews.filter((review) => review.productId === productId),
        200,
      );
    }
    return [];
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
    const page = await fetchBackendProducts({ search: term, page: 1, pageSize: 5 });
    return page.items;
  },
};
