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
  name?: string;
  colorId: string;
  sizeId?: string;
  material?: string;
  /** Preco em centavos. */
  priceCents: number;
  /** Preco "de" (antes do desconto) em centavos, quando em promocao. */
  compareAtCents?: number;
  stock: number;
}

export interface ProductMedia {
  id: string;
  productVariantId?: string;
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
  /**
   * @deprecated As condicoes de pagamento nao vem do produto — o backend nao
   * as expoe. A vitrine usa `STORE.payment`, que so anuncia o que o checkout
   * realmente pratica. Campos mantidos porque o mock ainda os preenche.
   */
  installmentsMax?: number;
  /** @deprecated ver `installmentsMax`. */
  pixDiscountPct?: number;
  rating: number;
  reviewCount: number;
  colors: ProductColor[];
  sizes: ProductSize[];
  variants: ProductVariant[];
  media: ProductMedia[];
  specs: ProductSpecs;
  createdAt: string;
}

export interface AdminProductCategory {
  id: string;
  name: string;
  slug: string;
}

export interface AdminProductImage {
  id: string;
  productId: string;
  productVariantId?: string;
  publicUrl: string;
  altText?: string;
  sortOrder: number;
  isMain: boolean;
}

export interface AdminProductVariant {
  id: string;
  productId: string;
  sku: string;
  name: string;
  color?: string;
  colorHex?: string;
  size?: string;
  material?: string;
  finish?: string;
  priceCents: number;
  promotionalPriceCents?: number;
  costPriceCents?: number;
  stockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  minimumStock: number;
  isLowStock: boolean;
  weightKg: number;
  heightCm: number;
  widthCm: number;
  depthCm: number;
  barcode?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminProductPriceHistory {
  id: string;
  productVariantId: string;
  sku: string;
  oldPriceCents: number;
  newPriceCents: number;
  oldPromotionalPriceCents?: number;
  newPromotionalPriceCents?: number;
  oldCostPriceCents?: number;
  newCostPriceCents?: number;
  changedByUserId?: string;
  changedAt: string;
}

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  brand?: string;
  collection?: string;
  mainMaterial?: string;
  mainColor?: string;
  status: 'Draft' | 'Published' | 'Archived' | string;
  isFeatured: boolean;
  isNewArrival: boolean;
  isPromotion: boolean;
  displayOrder: number;
  seoTitle?: string;
  seoDescription?: string;
  searchKeywords?: string;
  categories: AdminProductCategory[];
  variants: AdminProductVariant[];
  images: AdminProductImage[];
  isAvailable: boolean;
  createdAt: string;
  updatedAt?: string;
  publishedAt?: string;
  archivedAt?: string;
}

export interface AdminInventorySummary {
  variantId: string;
  productId: string;
  sku: string;
  productName: string;
  productSlug: string;
  variantName: string;
  stockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  minimumStock: number;
  isLowStock: boolean;
  isActive: boolean;
}

export interface AdminInventoryDetail extends AdminInventorySummary {
  productStatus: string;
  priceCents: number;
  promotionalPriceCents?: number;
  weightKg: number;
  heightCm: number;
  widthCm: number;
  depthCm: number;
  createdAt: string;
  updatedAt?: string;
}

export type AdminInventoryAdjustmentType =
  | 'ManualEntry'
  | 'ManualExit'
  | 'InventoryCorrection';

export interface AdminInventoryAdjustmentInput {
  variantId: string;
  type: AdminInventoryAdjustmentType;
  quantity: number;
  reason: string;
}

export interface AdminStockMovement {
  id: string;
  variantId: string;
  sku: string;
  type: string;
  quantity: number;
  previousStockQuantity: number;
  newStockQuantity: number;
  previousReservedQuantity: number;
  newReservedQuantity: number;
  reason?: string;
  referenceType?: string;
  referenceId?: string;
  createdByUserId?: string;
  createdAt: string;
}

export interface AdminStockReservation {
  id: string;
  variantId: string;
  sku: string;
  userId?: string;
  cartId?: string;
  orderId?: string;
  quantity: number;
  status: string;
  expiresAt: string;
  createdAt: string;
  confirmedAt?: string;
  releasedAt?: string;
  expiredAt?: string;
  releaseReason?: string;
}

export interface AdminCatalogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentCategoryId?: string;
  displayOrder: number;
  isActive: boolean;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminProductVariantInput {
  id?: string;
  sku: string;
  name: string;
  color?: string;
  colorHex?: string;
  size?: string;
  material?: string;
  finish?: string;
  priceCents: number;
  promotionalPriceCents?: number;
  costPriceCents?: number;
  stockQuantity: number;
  reservedQuantity: number;
  minimumStock: number;
  weightKg: number;
  heightCm: number;
  widthCm: number;
  depthCm: number;
  barcode?: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface AdminProductInput {
  name: string;
  slug?: string;
  shortDescription?: string;
  description?: string;
  brand?: string;
  collection?: string;
  mainMaterial?: string;
  mainColor?: string;
  status: 'Draft' | 'Published' | 'Archived' | string;
  isFeatured: boolean;
  isNewArrival: boolean;
  isPromotion: boolean;
  displayOrder: number;
  seoTitle?: string;
  seoDescription?: string;
  searchKeywords?: string;
  categoryIds: string[];
  variants: AdminProductVariantInput[];
}

export interface AdminProductImageInput {
  id?: string;
  productVariantId?: string;
  storageKey: string;
  publicUrl: string;
  altText?: string;
  sortOrder: number;
  isMain: boolean;
}

export interface AdminImageUploadUrl {
  uploadUrl: string;
  storageKey: string;
  publicUrl: string;
  contentType: string;
  expiresAt: string;
  maxSizeBytes: number;
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
  variants: ProductVariant[];
  media: ProductMedia[];
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

/**
 * Ordenacoes que o backend realmente implementa.
 * `destaque` e a ordem padrao (nenhum parametro enviado).
 * Nao existe ordenacao por vendas: o backend nao expoe esse dado.
 */
export type SortOption = 'destaque' | 'novidade' | 'menor-preco' | 'maior-preco';

/**
 * Filtros do catalogo.
 *
 * Cor, tamanho e material sao de valor unico porque `GET /api/produtos` aceita
 * um valor por campo (`color`, `size`, `material`). Multi-selecao exigiria
 * suporte a lista no backend — esta na lista de pendencias.
 *
 * Os valores enviados sao os rotulos crus do catalogo ("Terracota", "Couro"),
 * nao ids internos: e assim que o backend compara.
 */
export interface CatalogFilters {
  category?: CategorySlug;
  search?: string;
  minPriceCents?: number;
  maxPriceCents?: number;
  color?: string;
  size?: string;
  material?: string;
  onlyPromo?: boolean;
  onlyInStock?: boolean;
  onlyFeatured?: boolean;
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
  /** `value` e o texto enviado a API; `label` e o texto mostrado na tela. */
  colors: (FacetOption & { hex?: string })[];
  sizes: FacetOption[];
  materials: FacetOption[];
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
  /** SKU saiu de linha ou ficou sem estoque desde que entrou na sacola. */
  isAvailable?: boolean;
  /** O preco mudou depois que o item foi adicionado. */
  hasPriceChanged?: boolean;
  /** Avisos do backend sobre esta linha (estoque, preco, disponibilidade). */
  messages?: string[];
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
  provider?: string;
  serviceCode?: string;
  rawReference?: string;
}

export interface Cart {
  id: string;
  /** ID numerico do carrinho no backend, exigido pelo checkout. */
  backendId?: number;
  items: CartItem[];
  coupon?: AppliedCoupon;
  shipping?: ShippingOption;
  /** CEP usado para a ultima cotacao. */
  shippingZip?: string;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  /** Ha item indisponivel — o checkout vai recusar enquanto nao for resolvido. */
  hasUnavailableItems?: boolean;
  /** Algum preco mudou desde que o item entrou na sacola. */
  hasPriceChanges?: boolean;
  /** Avisos gerais do backend sobre a sacola. */
  messages?: string[];
  /** Quando a sacola expira e o estoque volta para a vitrine. */
  expiresAt?: string;
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
  termsAccepted?: boolean;
  marketingAccepted?: boolean;
  createdAt: string;
}

export interface AdminCustomerListItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  cpfMasked?: string;
  phoneMasked?: string;
  active: boolean;
  createdAt: string;
}

export interface AdminCustomerDetail extends AdminCustomerListItem {
  rgMasked?: string;
  birthDate?: string;
  termsAccepted: boolean;
  termsAcceptedAt?: string;
  marketingAccepted: boolean;
  marketingAcceptedAt?: string;
  deleteRequestedAt?: string;
  anonymizedAt?: string;
  updatedAt?: string;
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

export interface PaymentAttempt {
  id: string;
  provider: string;
  method: PaymentMethod;
  status: string;
  amountCents: number;
  pixQrCode?: string;
  pixCopyPaste?: string;
  failureReason?: string;
  createdAt: string;
  expiresAt?: string;
  paidAt?: string;
  canceledAt?: string;
}

export interface WebhookEvent {
  id: string;
  provider: string;
  externalEventId?: string;
  payloadHash: string;
  status: string;
  errorMessage?: string;
  orderId?: string;
  paymentAttemptId?: string;
  receivedAt: string;
  processedAt?: string;
}

export interface OrderHistoryEvent {
  id: string;
  previousStatus?: string;
  status: string;
  source?: string;
  changedByUserId?: string;
  reason?: string;
  createdAt: string;
}

export interface FiscalDocument {
  status: 'processing' | 'issued' | 'rejected';
  key?: string;
  pdfUrl?: string;
  xmlUrl?: string;
  rejectionReason?: string;
}

export interface FiscalPreviewItem {
  description: string;
  sku: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
}

export interface FiscalPreview {
  marker: string;
  orderId: string;
  orderNumber: string;
  generatedAt: string;
  customerName: string;
  customerCpfMasked?: string;
  shippingAddress: string;
  items: FiscalPreviewItem[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  pendingIssues: string[];
}

export interface Order {
  id: string;
  /** Numero amigavel exibido ao cliente. */
  number: string;
  status: OrderStatus;
  paymentStatus?: string;
  createdAt: string;
  expiresAt?: string;
  items: OrderItem[];
  paymentMethod: PaymentMethod;
  paymentAttempt?: PaymentAttempt;
  shippingAddress: Address;
  shipping: ShippingOption;
  tracking?: OrderTracking;
  fiscal?: FiscalDocument;
  history?: OrderHistoryEvent[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  couponCode?: string;
  canCancel?: boolean;
  canRetryPayment?: boolean;
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
  generatedAt?: string;
  metrics: DashboardMetric[];
  salesTodayCents?: number;
  salesMonthCents?: number;
  newOrders?: number;
  awaitingPaymentOrders?: number;
  paidOrders?: number;
  preparingOrders?: number;
  averageTicketCents?: number;
  pendingOrders: number;
  lowStock: number;
  pendingPayments: number;
  integrationFailures: number;
  reviewsToModerate: number;
  revenueSeries: { label: string; valueCents: number }[];
  topProducts: { name: string; sold: number; revenueCents: number }[];
  lowStockItems?: AdminLowStockItem[];
  abandonedCarts?: number;
  topCoupons?: AdminCouponMetric[];
  newCustomers?: number;
  openAlerts?: number;
  recentOrders: Order[];
}

export interface AdminLowStockItem {
  productVariantId: string;
  sku: string;
  productName: string;
  variantName: string;
  stockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  minimumStock: number;
}

export interface AdminCouponMetric {
  couponId: string;
  code: string;
  status: string;
  reservedCount: number;
  consumedCount: number;
  discountTotalCents: number;
}

export interface AdminAlert {
  id: string;
  type: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical' | string;
  status: 'Open' | 'InProgress' | 'Resolved' | 'Ignored' | string;
  title: string;
  message: string;
  entityName?: string;
  entityId?: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedByUserId?: string;
  resolutionReason?: string;
}

export interface AdminCommerceScope {
  scopeType: 'Order' | 'Product' | 'Category' | 'ProductVariant' | 'Shipping' | string;
  targetId?: string;
  isExcluded: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  name?: string;
  description: string;
  type: 'percent' | 'fixed' | 'Percentage' | 'FixedAmount' | 'FreeShipping' | string;
  value: number;
  active: boolean;
  status?: 'Active' | 'Inactive' | 'Archived' | string;
  startsAt?: string;
  usageCount: number;
  usageLimit?: number;
  usageLimitPerCustomer?: number;
  minimumOrderValueCents?: number;
  maxDiscountValueCents?: number;
  isFirstPurchaseOnly?: boolean;
  isPrivate?: boolean;
  canApplyToPromotionalItems?: boolean;
  expiresAt?: string;
  archivedAt?: string;
  archiveReason?: string;
  createdAt?: string;
  updatedAt?: string;
  scopes?: AdminCommerceScope[];
  allowedCustomerUserIds?: string[];
}

export interface Promotion {
  id: string;
  name: string;
  description?: string;
  discountPct: number;
  type?: 'percent' | 'fixed' | 'Percentage' | 'FixedAmount' | 'FreeShipping' | string;
  discountValue?: number;
  minimumOrderValueCents?: number;
  status?: 'Active' | 'Inactive' | 'Archived' | string;
  active: boolean;
  startsAt: string;
  endsAt?: string;
  productCount: number;
  archivedAt?: string;
  archiveReason?: string;
  createdAt?: string;
  updatedAt?: string;
  scopes?: AdminCommerceScope[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  active: boolean;
  mfaEnabled: boolean;
  emailConfirmed?: boolean;
  createdAt?: string;
  lastLogin?: string;
}

export interface AdminPermissionDefinition {
  key: string;
  area: string;
  action: string;
  description: string;
  defaultForEmployee: boolean;
  isAdminOnly: boolean;
  sortOrder: number;
}

export interface AdminEmployeePermission {
  key: string;
  isAllowed: boolean;
  isExplicit: boolean;
  isAdminOnly: boolean;
}

export interface AdminEmployeePermissionMatrix {
  userId: string;
  name: string;
  email: string;
  isActive: boolean;
  permissions: AdminEmployeePermission[];
}

export type AdminRole =
  | 'Admin'
  | 'Employee'
  | 'Customer'
  | 'owner'
  | 'gerente'
  | 'atendimento'
  | 'catalogo'
  | 'financeiro'
  | 'logistica'
  | 'marketing';

export interface AuditEntry {
  id: string;
  actorUserId?: string;
  actorRole?: string;
  actor: string;
  action: string;
  entityName?: string;
  entityId?: string;
  target: string;
  at: string;
  meta?: string;
  reason?: string;
  ipAddress?: string;
  oldValueJson?: string;
  newValueJson?: string;
  userAgent?: string;
  correlationId?: string;
}

export interface IntegrationStatus {
  id: string;
  name: string;
  kind:
    | 'pagamento'
    | 'frete'
    | 'fiscal'
    | 'notificacao'
    | 'automacao'
    | 'storage'
    | 'monitoramento'
    | 'backup';
  status: 'ok' | 'degraded' | 'down';
  lastRun: string;
  provider?: string;
  requiredForProduction?: boolean;
  missingSettings?: string[];
  message?: string;
}

export type ProductionReadinessStatus = 'Ready' | 'Warning' | 'Blocked' | string;

export interface ProductionReadinessCheck {
  key: string;
  status: ProductionReadinessStatus;
  message: string;
  isBlocking: boolean;
}

export interface ProductionReadiness {
  environment: string;
  isProduction: boolean;
  overallStatus: ProductionReadinessStatus;
  canBootInProduction: boolean;
  checkedAt: string;
  checks: ProductionReadinessCheck[];
  integrations: IntegrationStatus[];
}
