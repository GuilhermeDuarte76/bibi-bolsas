/**
 * Tipos de dominio da Bibi Bolsas.
 *
 * Espelham as entidades descritas em docs/PLANEJAMENTO.md (secao 11) e o contrato
 * previsto da API .NET. Servem tanto para os dados mockados atuais quanto para a
 * futura integracao real — quando o backend existir, estes tipos viram o contrato
 * compartilhado e nenhuma tela precisa mudar.
 *
 * Regras importantes:
 * - Dinheiro SEMPRE em centavos (inteiro). Ver utils/format.ts para exibicao.
 * - Identificadores publicos sao strings opacas (UUID/ULID), nunca sequenciais.
 */

// ----------------------------------------------------------------------------
// Catalogo
// ----------------------------------------------------------------------------

export type CategorySlug =
  | 'bolsas'
  | 'mochilas'
  | 'malas'
  | 'kit-viagem'
  | 'promocoes';

export interface Category {
  id: string;
  slug: CategorySlug;
  name: string;
  /** Subtitulo curto para os cards de categoria visual. */
  tagline: string;
  image: string;
  /** Tema de cor opcional (ex.: malas usam azul-viagem; escolar usa rosa). */
  accent?: 'terracotta' | 'travel-blue' | 'school-rose' | 'cinnamon';
}

export type Occasion = 'trabalho' | 'passeio' | 'viagem' | 'escola' | 'presente';

export type ProductBadge =
  | 'novo'
  | 'promocao'
  | 'pronta-entrega'
  | 'ultimas-unidades';

export interface ProductColor {
  /** Identificador da variacao de cor. */
  id: string;
  name: string;
  /** Cor (hex) usada no swatch. */
  hex: string;
}

export interface ProductSize {
  id: string;
  /** Ex.: "Unico", "P", "M", "G", "Carry-on", "24kg". */
  label: string;
}

export interface ProductVariant {
  id: string;
  sku: string;
  colorId: string;
  sizeId?: string;
  /** Preco em centavos. */
  priceCents: number;
  /** Preco "de" (antes do desconto) em centavos, quando em promocao. */
  compareAtCents?: number;
  stock: number;
}

export interface ProductMedia {
  id: string;
  type: 'image' | 'video';
  url: string;
  /** Texto alternativo descritivo (acessibilidade obrigatoria). */
  alt: string;
  /** Poster do video. */
  poster?: string;
}

export interface ProductSpecs {
  /** cm */
  heightCm?: number;
  widthCm?: number;
  depthCm?: number;
  /** gramas */
  weightG?: number;
  material?: string;
  capacity?: string;
  care?: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  categorySlug: CategorySlug;
  /** Colecao/campanha curta exibida no card. */
  collection?: string;
  occasions: Occasion[];
  badges: ProductBadge[];
  /** Preco "a partir de" em centavos (menor preco entre variacoes). */
  priceFromCents: number;
  compareAtFromCents?: number;
  /** Parcelamento maximo sem juros (apenas exibicao; recalc no backend). */
  installmentsMax: number;
  /** Desconto Pix em pontos percentuais (ex.: 5 = 5%). */
  pixDiscountPct: number;
  rating: number;
  reviewCount: number;
  colors: ProductColor[];
  sizes: ProductSize[];
  variants: ProductVariant[];
  media: ProductMedia[];
  specs: ProductSpecs;
  createdAt: string;
}

export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  categorySlug: CategorySlug;
  collection?: string;
  priceFromCents: number;
  compareAtFromCents?: number;
  badges: ProductBadge[];
  colors: ProductColor[];
  rating: number;
  reviewCount: number;
  /** Imagem principal + imagem de hover. */
  image: string;
  hoverImage?: string;
  alt: string;
  inStock: boolean;
}

// ----------------------------------------------------------------------------
// Catalogo: filtros, ordenacao e paginacao
// ----------------------------------------------------------------------------

export type SortOption =
  | 'destaque'
  | 'novidade'
  | 'menor-preco'
  | 'maior-preco'
  | 'mais-vendidos';

export interface CatalogFilters {
  category?: CategorySlug;
  search?: string;
  minPriceCents?: number;
  maxPriceCents?: number;
  colors?: string[];
  sizes?: string[];
  materials?: string[];
  occasions?: Occasion[];
  onlyPromo?: boolean;
  onlyInStock?: boolean;
  sort?: SortOption;
  page?: number;
  pageSize?: number;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface FacetOption {
  value: string;
  label: string;
  count: number;
}

export interface CatalogFacets {
  colors: FacetOption[];
  sizes: FacetOption[];
  materials: FacetOption[];
  occasions: FacetOption[];
  priceRange: { minCents: number; maxCents: number };
}

// ----------------------------------------------------------------------------
// Carrinho
// ----------------------------------------------------------------------------

export interface CartItem {
  /** Linha do carrinho (unica por variacao). */
  id: string;
  productId: string;
  slug: string;
  variantId: string;
  name: string;
  colorName: string;
  sizeLabel?: string;
  image: string;
  /** Preco unitario em centavos (snapshot; backend recalcula). */
  unitPriceCents: number;
  compareAtCents?: number;
  quantity: number;
  maxStock: number;
}

export interface AppliedCoupon {
  code: string;
  description: string;
  discountCents: number;
}

export interface ShippingOption {
  id: string;
  carrier: string;
  service: string;
  priceCents: number;
  /** Prazo estimado em dias uteis. */
  etaDays: number;
  label: string;
}

export interface Cart {
  id: string;
  items: CartItem[];
  coupon?: AppliedCoupon;
  shipping?: ShippingOption;
  /** CEP usado para a ultima cotacao. */
  shippingZip?: string;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
}

// ----------------------------------------------------------------------------
// Cliente / Auth / Enderecos
// ----------------------------------------------------------------------------

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  document?: string;
  createdAt: string;
}

export interface Address {
  id: string;
  label: string;
  recipient: string;
  zip: string;
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
  isDefault: boolean;
}

// ----------------------------------------------------------------------------
// Pedidos
// ----------------------------------------------------------------------------

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'canceled'
  | 'refunded';

export type PaymentMethod = 'pix' | 'credit_card' | 'boleto';

export interface OrderItem {
  productId: string;
  slug: string;
  name: string;
  sku: string;
  colorName: string;
  sizeLabel?: string;
  image: string;
  unitPriceCents: number;
  quantity: number;
}

export interface OrderTracking {
  carrier: string;
  code: string;
  url?: string;
  events: { date: string; status: string; location?: string }[];
}

export interface FiscalDocument {
  status: 'processing' | 'issued' | 'rejected';
  key?: string;
  pdfUrl?: string;
  xmlUrl?: string;
  rejectionReason?: string;
}

export interface Order {
  id: string;
  /** Numero amigavel exibido ao cliente. */
  number: string;
  status: OrderStatus;
  createdAt: string;
  items: OrderItem[];
  paymentMethod: PaymentMethod;
  shippingAddress: Address;
  shipping: ShippingOption;
  tracking?: OrderTracking;
  fiscal?: FiscalDocument;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  couponCode?: string;
}

// ----------------------------------------------------------------------------
// Avaliacoes
// ----------------------------------------------------------------------------

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface Review {
  id: string;
  productId: string;
  productName: string;
  customerName: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  status: ReviewStatus;
  verifiedPurchase: boolean;
}

export interface PendingReview {
  orderId: string;
  productId: string;
  productName: string;
  productImage: string;
  purchasedAt: string;
}

// ----------------------------------------------------------------------------
// Admin
// ----------------------------------------------------------------------------

export interface DashboardMetric {
  label: string;
  value: string;
  /** Variacao percentual vs periodo anterior. */
  deltaPct?: number;
  hint?: string;
}

export interface DashboardData {
  metrics: DashboardMetric[];
  pendingOrders: number;
  lowStock: number;
  pendingPayments: number;
  integrationFailures: number;
  reviewsToModerate: number;
  revenueSeries: { label: string; valueCents: number }[];
  topProducts: { name: string; sold: number; revenueCents: number }[];
  recentOrders: Order[];
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  type: 'percent' | 'fixed';
  value: number;
  active: boolean;
  usageCount: number;
  usageLimit?: number;
  expiresAt?: string;
}

export interface Promotion {
  id: string;
  name: string;
  discountPct: number;
  active: boolean;
  startsAt: string;
  endsAt: string;
  productCount: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  active: boolean;
  mfaEnabled: boolean;
  lastLogin?: string;
}

export type AdminRole =
  | 'owner'
  | 'gerente'
  | 'atendimento'
  | 'catalogo'
  | 'financeiro'
  | 'logistica'
  | 'marketing';

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  at: string;
  meta?: string;
}

export interface IntegrationStatus {
  id: string;
  name: string;
  kind: 'pagamento' | 'frete' | 'fiscal' | 'notificacao' | 'automacao';
  status: 'ok' | 'degraded' | 'down';
  lastRun: string;
  message?: string;
}
