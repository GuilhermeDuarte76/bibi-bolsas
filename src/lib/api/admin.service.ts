import type {
  AdminAlert,
  AdminCatalogCategory,
  AdminCustomerDetail,
  AdminCustomerListItem,
  AdminCouponMetric,
  AdminImageUploadUrl,
  AdminInventoryAdjustmentInput,
  AdminInventoryDetail,
  AdminInventorySummary,
  AdminLowStockItem,
  AdminProduct,
  AdminProductCategory,
  AdminProductImageInput,
  AdminProductInput,
  AdminProductImage,
  AdminProductVariant,
  AdminProductVariantInput,
  AdminStockMovement,
  AdminStockReservation,
  AdminUser,
  AuditEntry,
  Coupon,
  DashboardData,
  FiscalPreview,
  FiscalPreviewItem,
  IntegrationStatus,
  Order,
  OrderHistoryEvent,
  OrderItem,
  OrderStatus,
  PaymentAttempt,
  PaymentMethod,
  Product,
  Promotion,
  ProductionReadiness,
  ProductionReadinessCheck,
  ProductionReadinessStatus,
  Review,
  WebhookEvent,
} from '@/types';
import { productImage } from '@/lib/images';
import { USE_MOCK } from './config';
import { delay, http } from './http';
import {
  adminUsers,
  auditLog,
  coupons,
  dashboard,
  integrations,
  promotions,
} from './mock/admin';
import { customer as mockCustomer, orders, reviews } from './mock/account';
import { categories, products } from './mock/catalog';

interface BackendPaged<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface BackendOrderListItemDto {
  id: number;
  orderNumber: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  customerName?: string | null;
  total: number;
  itemsPreview: string[];
  trackingCode?: string | null;
}

interface BackendOrderDetailsDto {
  id: number;
  orderNumber: string;
  createdAt: string;
  expiresAt: string;
  status: string;
  paymentStatus: string;
  customer: BackendOrderCustomerDto;
  shippingAddress: BackendOrderAddressDto;
  shipping: BackendOrderShippingDto;
  payment: BackendOrderPaymentSummaryDto;
  totals: BackendOrderTotalsDto;
  items: BackendOrderItemDto[];
  history: BackendOrderHistoryDto[];
  canCancel: boolean;
  canRetryPayment: boolean;
}

interface BackendOrderCustomerDto {
  name: string;
  email: string;
  cpfMasked?: string | null;
  phoneMasked?: string | null;
}

interface BackendOrderItemDto {
  id: number;
  productId: number;
  productVariantId: number;
  productSlug: string;
  productName: string;
  sku: string;
  variantName: string;
  imageUrl?: string | null;
  quantity: number;
  effectiveUnitPrice: number;
  lineTotal: number;
}

interface BackendOrderAddressDto {
  recipientName: string;
  recipientPhoneMasked?: string | null;
  zipCode: string;
  street: string;
  number: string;
  complement?: string | null;
  district: string;
  city: string;
  state: string;
  country?: string | null;
  reference?: string | null;
}

interface BackendOrderShippingDto {
  provider: string;
  serviceCode: string;
  serviceName: string;
  estimatedDays: number;
  carrier?: string | null;
  shipmentService?: string | null;
  trackingCode?: string | null;
  trackingUrl?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
}

interface BackendOrderPaymentSummaryDto {
  method: string;
  status: string;
  lastAttempt?: BackendPaymentAttemptDto | null;
}

interface BackendPaymentAttemptDto {
  id: number;
  provider: string;
  method: string;
  status: string;
  amount: number;
  pixQrCode?: string | null;
  pixCopyPaste?: string | null;
  failureReason?: string | null;
  createdAt: string;
  expiresAt?: string | null;
  paidAt?: string | null;
  canceledAt?: string | null;
}

interface BackendOrderTotalsDto {
  subtotal: number;
  discountTotal: number;
  couponDiscountTotal: number;
  shippingTotal: number;
  total: number;
}

interface BackendOrderHistoryDto {
  id: number;
  previousStatus?: string | null;
  newStatus: string;
  reason?: string | null;
  createdAt: string;
}

interface BackendFiscalPreviewDto {
  marker: string;
  orderId: number;
  orderNumber: string;
  generatedAt: string;
  customerName: string;
  customerCpfMasked?: string | null;
  shippingAddress: string;
  items: BackendFiscalPreviewItemDto[];
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  total: number;
  pendingIssues: string[];
}

interface BackendFiscalPreviewItemDto {
  description: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface BackendWebhookEventDto {
  id: number;
  provider: string;
  externalEventId?: string | null;
  payloadHash: string;
  status: string;
  errorMessage?: string | null;
  orderId?: number | null;
  paymentAttemptId?: number | null;
  receivedAt: string;
  processedAt?: string | null;
}

interface BackendAdminDashboardDto {
  generatedAt: string;
  salesToday: number;
  salesMonth: number;
  newOrders: number;
  awaitingPaymentOrders: number;
  paidOrders: number;
  preparingOrders: number;
  averageTicket: number;
  topProducts: BackendReportProductMetricDto[];
  lowStockItems: BackendReportStockItemDto[];
  abandonedCarts: number;
  topCoupons: BackendReportCouponMetricDto[];
  newCustomers: number;
  openAlerts: number;
}

interface BackendReportProductMetricDto {
  productId: number;
  productName: string;
  quantity: number;
  revenue: number;
}

interface BackendReportStockItemDto {
  productVariantId: number;
  sku: string;
  productName: string;
  variantName: string;
  stockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  minimumStock: number;
}

interface BackendReportCouponMetricDto {
  couponId: number;
  code: string;
  status: string;
  reservedCount: number;
  consumedCount: number;
  discountTotal: number;
}

interface BackendAdminAlertDto {
  id: number;
  type: string;
  severity: string;
  status: string;
  title: string;
  message: string;
  entityName?: string | null;
  entityId?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
  resolvedByUserId?: number | null;
  resolutionReason?: string | null;
}

interface BackendAdminUserDto {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  emailConfirmed: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
}

interface BackendAuditLogDto {
  id: number;
  actorUserId?: number | null;
  actorRole?: string | null;
  action: string;
  entityName: string;
  entityId?: string | null;
  reason?: string | null;
  ipAddress?: string | null;
  createdAt: string;
}

interface BackendAdminCustomerListDto {
  id: number;
  userId: number;
  name: string;
  email: string;
  cpfMasked?: string | null;
  phoneMasked?: string | null;
  isActive: boolean;
  createdAt: string;
}

interface BackendAdminCustomerDetailDto {
  id: number;
  userId: number;
  fullName: string;
  email: string;
  cpfMasked?: string | null;
  rgMasked?: string | null;
  phoneMasked?: string | null;
  birthDate?: string | null;
  isActive: boolean;
  termsAccepted: boolean;
  termsAcceptedAt?: string | null;
  marketingAccepted: boolean;
  marketingAcceptedAt?: string | null;
  deleteRequestedAt?: string | null;
  anonymizedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

interface BackendCouponScopeDto {
  scopeType: string;
  targetId?: number | null;
  isExcluded: boolean;
}

interface BackendCouponDto {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  type: string;
  discountValue: number;
  maxDiscountValue?: number | null;
  minimumOrderValue?: number | null;
  startsAt: string;
  endsAt?: string | null;
  totalUsageLimit?: number | null;
  usageLimitPerCustomer: number;
  isFirstPurchaseOnly: boolean;
  isPrivate: boolean;
  canApplyToPromotionalItems: boolean;
  status: string;
  createdAt: string;
  updatedAt?: string | null;
  archivedAt?: string | null;
  archiveReason?: string | null;
  scopes: BackendCouponScopeDto[];
  allowedCustomerUserIds: number[];
}

interface BackendPromotionDto {
  id: number;
  name: string;
  description?: string | null;
  type: string;
  discountValue: number;
  minimumOrderValue?: number | null;
  startsAt: string;
  endsAt?: string | null;
  status: string;
  createdAt: string;
  updatedAt?: string | null;
  archivedAt?: string | null;
  archiveReason?: string | null;
  scopes: BackendCouponScopeDto[];
}

interface BackendAdminCategoryDto {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  parentCategoryId?: number | null;
  displayOrder?: number;
  isActive?: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
}

interface BackendAdminProductImageDto {
  id: number;
  productId: number;
  productVariantId?: number | null;
  publicUrl: string;
  altText?: string | null;
  sortOrder: number;
  isMain: boolean;
}

interface BackendAdminProductVariantDto {
  id: number;
  productId: number;
  sku: string;
  name: string;
  color?: string | null;
  colorHex?: string | null;
  size?: string | null;
  material?: string | null;
  finish?: string | null;
  price: number;
  promotionalPrice?: number | null;
  costPrice?: number | null;
  stockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  minimumStock: number;
  isLowStock: boolean;
  weightKg: number;
  heightCm: number;
  widthCm: number;
  depthCm: number;
  barcode?: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

interface BackendAdminProductDto {
  id: number;
  name: string;
  slug: string;
  shortDescription?: string | null;
  description?: string | null;
  brand?: string | null;
  collection?: string | null;
  mainMaterial?: string | null;
  mainColor?: string | null;
  status: string;
  isFeatured: boolean;
  isNewArrival: boolean;
  isPromotion: boolean;
  displayOrder: number;
  seoTitle?: string | null;
  seoDescription?: string | null;
  searchKeywords?: string | null;
  categories: BackendAdminCategoryDto[];
  variants: BackendAdminProductVariantDto[];
  images: BackendAdminProductImageDto[];
  isAvailable: boolean;
  createdAt: string;
  updatedAt?: string | null;
  publishedAt?: string | null;
  archivedAt?: string | null;
}

interface BackendInventorySummaryDto {
  variantId: number;
  productId: number;
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

interface BackendInventoryDetailDto extends BackendInventorySummaryDto {
  productStatus: string;
  price: number;
  promotionalPrice?: number | null;
  weightKg: number;
  heightCm: number;
  widthCm: number;
  depthCm: number;
  createdAt: string;
  updatedAt?: string | null;
}

interface BackendStockMovementDto {
  id: number;
  variantId: number;
  sku: string;
  type: string;
  quantity: number;
  previousStockQuantity: number;
  newStockQuantity: number;
  previousReservedQuantity: number;
  newReservedQuantity: number;
  reason?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  createdByUserId?: number | null;
  createdAt: string;
}

interface BackendStockReservationDto {
  id: number;
  variantId: number;
  sku: string;
  userId?: number | null;
  cartId?: string | null;
  orderId?: string | null;
  quantity: number;
  status: string;
  expiresAt: string;
  createdAt: string;
  confirmedAt?: string | null;
  releasedAt?: string | null;
  expiredAt?: string | null;
  releaseReason?: string | null;
}

interface BackendSaveProductVariantDto {
  sku: string;
  name: string;
  color?: string;
  colorHex?: string;
  size?: string;
  material?: string;
  finish?: string;
  price: number;
  promotionalPrice?: number;
  costPrice?: number;
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

interface BackendSaveProductDto {
  name: string;
  slug?: string;
  shortDescription?: string;
  description?: string;
  brand?: string;
  collection?: string;
  mainMaterial?: string;
  mainColor?: string;
  status: string;
  isFeatured: boolean;
  isNewArrival: boolean;
  isPromotion: boolean;
  displayOrder: number;
  seoTitle?: string;
  seoDescription?: string;
  searchKeywords?: string;
  categoryIds: number[];
  variants: BackendSaveProductVariantDto[];
}

interface BackendSaveProductImageDto {
  productVariantId?: number;
  storageKey: string;
  publicUrl: string;
  altText?: string;
  sortOrder: number;
  isMain: boolean;
}

interface BackendImageUploadUrlDto {
  uploadUrl: string;
  storageKey: string;
  publicUrl: string;
  contentType: string;
  expiresAt: string;
  maxSizeBytes: number;
}

interface BackendReadinessCheckDto {
  key: string;
  status: string;
  message: string;
  isBlocking: boolean;
}

interface BackendIntegrationStatusDto {
  name: string;
  provider: string;
  status: string;
  isRequiredForProduction: boolean;
  missingSettings: string[];
  message: string;
}

interface BackendProductionReadinessDto {
  environment: string;
  isProduction: boolean;
  overallStatus: string;
  canBootInProduction: boolean;
  checkedAt: string;
  checks: BackendReadinessCheckDto[];
  integrations: BackendIntegrationStatusDto[];
}

export interface AdminShipmentInput {
  carrier: string;
  service?: string;
  trackingCode: string;
  trackingUrl?: string;
  shippedAt?: string;
}

export interface AdminEmployeeInput {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AdminEmployeeUpdateInput {
  name: string;
  email: string;
  isActive: boolean;
}

export interface AdminCouponInput {
  code: string;
  name: string;
  description?: string;
  type: string;
  discountValueCents: number;
  maxDiscountValueCents?: number;
  minimumOrderValueCents?: number;
  startsAt: string;
  endsAt?: string;
  totalUsageLimit?: number;
  usageLimitPerCustomer: number;
  isFirstPurchaseOnly: boolean;
  isPrivate: boolean;
  canApplyToPromotionalItems: boolean;
}

export interface AdminPromotionInput {
  name: string;
  description?: string;
  type: string;
  discountValueCents: number;
  minimumOrderValueCents?: number;
  startsAt: string;
  endsAt?: string;
}

function toCents(value: number): number {
  return Math.round(Number(value) * 100);
}

function fromCents(value: number | undefined): number | undefined {
  if (value == null) return undefined;
  return Math.round(value) / 100;
}

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

function formatDecimalMoney(value: number): string {
  return BRL.format(Number(value || 0));
}

function mapOrderStatus(status: string, paymentStatus?: string): OrderStatus {
  if (status === 'Canceled' || paymentStatus === 'Canceled') return 'canceled';
  if (status === 'Refunded' || status === 'PartiallyRefunded' || paymentStatus === 'Refunded') return 'refunded';
  if (status === 'Delivered') return 'delivered';
  if (status === 'Shipped') return 'shipped';
  if (status === 'Preparing') return 'processing';
  if (status === 'Paid' || paymentStatus === 'Approved') return 'paid';
  return 'pending_payment';
}

function mapPaymentMethod(method?: string): PaymentMethod {
  if (method?.toLowerCase() === 'credit_card') return 'credit_card';
  if (method?.toLowerCase() === 'boleto') return 'boleto';
  return 'pix';
}

function toBackendOrderStatus(status: OrderStatus): string {
  switch (status) {
    case 'paid':
      return 'Paid';
    case 'processing':
      return 'Preparing';
    case 'shipped':
      return 'Shipped';
    case 'delivered':
      return 'Delivered';
    case 'canceled':
      return 'Canceled';
    case 'refunded':
      return 'Refunded';
    case 'pending_payment':
    default:
      return 'AwaitingPayment';
  }
}

function emptyAddress(orderId: number) {
  return {
    id: String(orderId),
    label: 'Entrega',
    recipient: '',
    zip: '',
    street: '',
    number: '',
    district: '',
    city: '',
    state: '',
    isDefault: false,
  };
}

function emptyShipping(orderId: number) {
  return {
    id: `shipping-${orderId}`,
    carrier: 'Entrega',
    service: 'A definir',
    priceCents: 0,
    etaDays: 0,
    label: 'A definir',
  };
}

function mapPaymentAttempt(attempt?: BackendPaymentAttemptDto | null): PaymentAttempt | undefined {
  if (!attempt) return undefined;

  return {
    id: String(attempt.id),
    provider: attempt.provider,
    method: mapPaymentMethod(attempt.method),
    status: attempt.status,
    amountCents: toCents(attempt.amount),
    pixQrCode: attempt.pixQrCode ?? undefined,
    pixCopyPaste: attempt.pixCopyPaste ?? undefined,
    failureReason: attempt.failureReason ?? undefined,
    createdAt: attempt.createdAt,
    expiresAt: attempt.expiresAt ?? undefined,
    paidAt: attempt.paidAt ?? undefined,
    canceledAt: attempt.canceledAt ?? undefined,
  };
}

function mapWebhookEvent(event: BackendWebhookEventDto): WebhookEvent {
  return {
    id: String(event.id),
    provider: event.provider,
    externalEventId: event.externalEventId ?? undefined,
    payloadHash: event.payloadHash,
    status: event.status,
    errorMessage: event.errorMessage ?? undefined,
    orderId: event.orderId ? String(event.orderId) : undefined,
    paymentAttemptId: event.paymentAttemptId ? String(event.paymentAttemptId) : undefined,
    receivedAt: event.receivedAt,
    processedAt: event.processedAt ?? undefined,
  };
}

function mapOrderHistory(history: BackendOrderHistoryDto): OrderHistoryEvent {
  return {
    id: String(history.id),
    previousStatus: history.previousStatus ?? undefined,
    status: history.newStatus,
    reason: history.reason ?? undefined,
    createdAt: history.createdAt,
  };
}

function mapOrderItem(item: BackendOrderItemDto): OrderItem {
  return {
    productId: String(item.productId),
    slug: item.productSlug,
    name: item.productName,
    sku: item.sku,
    colorName: item.variantName || item.sku,
    image: item.imageUrl || productImage('bolsas', 'terracotta', item.id),
    unitPriceCents: toCents(item.effectiveUnitPrice),
    quantity: item.quantity,
  };
}

function mapListOrder(dto: BackendOrderListItemDto): Order {
  return {
    id: String(dto.id),
    number: dto.orderNumber,
    status: mapOrderStatus(dto.status, dto.paymentStatus),
    paymentStatus: dto.paymentStatus,
    createdAt: dto.createdAt,
    items: dto.itemsPreview.map((name, index) => ({
      productId: `${dto.id}-${index}`,
      slug: '',
      name,
      sku: name,
      colorName: '',
      image: productImage('bolsas', 'terracotta', index),
      unitPriceCents: 0,
      quantity: 1,
    })),
    paymentMethod: 'pix',
    shippingAddress: {
      ...emptyAddress(dto.id),
      recipient: dto.customerName || '',
    },
    shipping: emptyShipping(dto.id),
    tracking: dto.trackingCode
      ? {
          carrier: 'Transportadora',
          code: dto.trackingCode,
          events: [],
        }
      : undefined,
    subtotalCents: 0,
    discountCents: 0,
    shippingCents: 0,
    totalCents: toCents(dto.total),
  };
}

function mapTracking(shipping: BackendOrderShippingDto): Order['tracking'] {
  if (!shipping.trackingCode) return undefined;

  const events = [
    shipping.shippedAt ? { date: shipping.shippedAt, status: 'Pedido enviado' } : undefined,
    shipping.deliveredAt ? { date: shipping.deliveredAt, status: 'Pedido entregue' } : undefined,
  ].filter(Boolean) as { date: string; status: string }[];

  return {
    carrier: shipping.carrier || shipping.provider || 'Transportadora',
    code: shipping.trackingCode,
    url: shipping.trackingUrl ?? undefined,
    events,
  };
}

function mapOrderDetails(dto: BackendOrderDetailsDto): Order {
  const shippingCents = toCents(dto.totals.shippingTotal);

  return {
    id: String(dto.id),
    number: dto.orderNumber,
    status: mapOrderStatus(dto.status, dto.paymentStatus),
    paymentStatus: dto.paymentStatus,
    createdAt: dto.createdAt,
    expiresAt: dto.expiresAt,
    items: dto.items.map(mapOrderItem),
    paymentMethod: mapPaymentMethod(dto.payment.method),
    paymentAttempt: mapPaymentAttempt(dto.payment.lastAttempt),
    shippingAddress: {
      id: String(dto.id),
      label: 'Entrega',
      recipient: dto.shippingAddress.recipientName || dto.customer.name,
      zip: dto.shippingAddress.zipCode,
      street: dto.shippingAddress.street,
      number: dto.shippingAddress.number,
      complement: dto.shippingAddress.complement ?? undefined,
      district: dto.shippingAddress.district,
      city: dto.shippingAddress.city,
      state: dto.shippingAddress.state,
      isDefault: false,
    },
    shipping: {
      id: dto.shipping.serviceCode || `shipping-${dto.id}`,
      carrier: dto.shipping.carrier || dto.shipping.provider,
      service: dto.shipping.shipmentService || dto.shipping.serviceName,
      priceCents: shippingCents,
      etaDays: dto.shipping.estimatedDays,
      label: dto.shipping.serviceName,
      provider: dto.shipping.provider,
      serviceCode: dto.shipping.serviceCode,
    },
    tracking: mapTracking(dto.shipping),
    history: dto.history.map(mapOrderHistory),
    subtotalCents: toCents(dto.totals.subtotal),
    discountCents: toCents(dto.totals.couponDiscountTotal || dto.totals.discountTotal),
    shippingCents,
    totalCents: toCents(dto.totals.total),
    canCancel: dto.canCancel,
    canRetryPayment: dto.canRetryPayment,
  };
}

function mapFiscalPreviewItem(dto: BackendFiscalPreviewItemDto): FiscalPreviewItem {
  return {
    description: dto.description,
    sku: dto.sku,
    quantity: dto.quantity,
    unitPriceCents: toCents(dto.unitPrice),
    totalCents: toCents(dto.total),
  };
}

function mapFiscalPreview(dto: BackendFiscalPreviewDto): FiscalPreview {
  return {
    marker: dto.marker,
    orderId: String(dto.orderId),
    orderNumber: dto.orderNumber,
    generatedAt: dto.generatedAt,
    customerName: dto.customerName,
    customerCpfMasked: dto.customerCpfMasked ?? undefined,
    shippingAddress: dto.shippingAddress,
    items: dto.items.map(mapFiscalPreviewItem),
    subtotalCents: toCents(dto.subtotal),
    discountCents: toCents(dto.discountTotal),
    shippingCents: toCents(dto.shippingTotal),
    totalCents: toCents(dto.total),
    pendingIssues: dto.pendingIssues,
  };
}

function mapLowStockItem(dto: BackendReportStockItemDto): AdminLowStockItem {
  return {
    productVariantId: String(dto.productVariantId),
    sku: dto.sku,
    productName: dto.productName,
    variantName: dto.variantName,
    stockQuantity: dto.stockQuantity,
    reservedQuantity: dto.reservedQuantity,
    availableQuantity: dto.availableQuantity,
    minimumStock: dto.minimumStock,
  };
}

function mapCouponMetric(dto: BackendReportCouponMetricDto): AdminCouponMetric {
  return {
    couponId: String(dto.couponId),
    code: dto.code,
    status: dto.status,
    reservedCount: dto.reservedCount,
    consumedCount: dto.consumedCount,
    discountTotalCents: toCents(dto.discountTotal),
  };
}

function mapAdminDashboard(dto: BackendAdminDashboardDto): DashboardData {
  const salesTodayCents = toCents(dto.salesToday);
  const salesMonthCents = toCents(dto.salesMonth);
  const averageTicketCents = toCents(dto.averageTicket);

  return {
    generatedAt: dto.generatedAt,
    salesTodayCents,
    salesMonthCents,
    newOrders: dto.newOrders,
    awaitingPaymentOrders: dto.awaitingPaymentOrders,
    paidOrders: dto.paidOrders,
    preparingOrders: dto.preparingOrders,
    averageTicketCents,
    pendingOrders: dto.awaitingPaymentOrders + dto.preparingOrders,
    lowStock: dto.lowStockItems.length,
    pendingPayments: dto.awaitingPaymentOrders,
    integrationFailures: dto.openAlerts,
    reviewsToModerate: 0,
    revenueSeries: [
      { label: 'Hoje', valueCents: salesTodayCents },
      { label: 'Mês', valueCents: salesMonthCents },
    ],
    metrics: [
      { label: 'Vendas hoje', value: formatDecimalMoney(dto.salesToday) },
      { label: 'Vendas mês', value: formatDecimalMoney(dto.salesMonth) },
      { label: 'Novos pedidos', value: String(dto.newOrders), hint: 'hoje' },
      { label: 'Ticket médio', value: formatDecimalMoney(dto.averageTicket) },
    ],
    topProducts: dto.topProducts.map((product) => ({
      name: product.productName,
      sold: product.quantity,
      revenueCents: toCents(product.revenue),
    })),
    lowStockItems: dto.lowStockItems.map(mapLowStockItem),
    abandonedCarts: dto.abandonedCarts,
    topCoupons: dto.topCoupons.map(mapCouponMetric),
    newCustomers: dto.newCustomers,
    openAlerts: dto.openAlerts,
    recentOrders: [],
  };
}

function mapAdminAlert(dto: BackendAdminAlertDto): AdminAlert {
  return {
    id: String(dto.id),
    type: dto.type,
    severity: dto.severity,
    status: dto.status,
    title: dto.title,
    message: dto.message,
    entityName: dto.entityName ?? undefined,
    entityId: dto.entityId ?? undefined,
    createdAt: dto.createdAt,
    resolvedAt: dto.resolvedAt ?? undefined,
    resolvedByUserId: dto.resolvedByUserId ? String(dto.resolvedByUserId) : undefined,
    resolutionReason: dto.resolutionReason ?? undefined,
  };
}

function mapAdminUser(dto: BackendAdminUserDto): AdminUser {
  return {
    id: String(dto.id),
    name: dto.name,
    email: dto.email,
    role: dto.role as AdminUser['role'],
    active: dto.isActive,
    mfaEnabled: dto.emailConfirmed,
    emailConfirmed: dto.emailConfirmed,
    createdAt: dto.createdAt,
    lastLogin: dto.lastLoginAt ?? undefined,
  };
}

function mapAuditEntry(dto: BackendAuditLogDto): AuditEntry {
  const actor = dto.actorUserId ? `Usuario #${dto.actorUserId}` : (dto.actorRole || 'Sistema');
  const target = dto.entityId ? `${dto.entityName} #${dto.entityId}` : dto.entityName;
  const metaParts = [dto.reason, dto.ipAddress ? `IP ${dto.ipAddress}` : undefined].filter(Boolean);

  return {
    id: String(dto.id),
    actor,
    action: dto.action,
    target,
    at: dto.createdAt,
    meta: metaParts.join(' · ') || undefined,
  };
}

function mapAdminCustomerListItem(dto: BackendAdminCustomerListDto): AdminCustomerListItem {
  return {
    id: String(dto.id),
    userId: String(dto.userId),
    name: dto.name,
    email: dto.email,
    cpfMasked: dto.cpfMasked ?? undefined,
    phoneMasked: dto.phoneMasked ?? undefined,
    active: dto.isActive,
    createdAt: dto.createdAt,
  };
}

function mapAdminCustomerDetail(dto: BackendAdminCustomerDetailDto): AdminCustomerDetail {
  return {
    id: String(dto.id),
    userId: String(dto.userId),
    name: dto.fullName,
    email: dto.email,
    cpfMasked: dto.cpfMasked ?? undefined,
    phoneMasked: dto.phoneMasked ?? undefined,
    active: dto.isActive,
    createdAt: dto.createdAt,
    rgMasked: dto.rgMasked ?? undefined,
    birthDate: dto.birthDate ?? undefined,
    termsAccepted: dto.termsAccepted,
    termsAcceptedAt: dto.termsAcceptedAt ?? undefined,
    marketingAccepted: dto.marketingAccepted,
    marketingAcceptedAt: dto.marketingAcceptedAt ?? undefined,
    deleteRequestedAt: dto.deleteRequestedAt ?? undefined,
    anonymizedAt: dto.anonymizedAt ?? undefined,
    updatedAt: dto.updatedAt ?? undefined,
  };
}

function mapCoupon(dto: BackendCouponDto): Coupon {
  return {
    id: String(dto.id),
    code: dto.code,
    name: dto.name,
    description: dto.description || dto.name,
    type: dto.type,
    value: dto.type === 'Percentage' ? dto.discountValue : toCents(dto.discountValue),
    active: dto.status === 'Active',
    status: dto.status,
    startsAt: dto.startsAt,
    usageCount: 0,
    usageLimit: dto.totalUsageLimit ?? undefined,
    usageLimitPerCustomer: dto.usageLimitPerCustomer,
    minimumOrderValueCents: dto.minimumOrderValue != null ? toCents(dto.minimumOrderValue) : undefined,
    maxDiscountValueCents: dto.maxDiscountValue != null ? toCents(dto.maxDiscountValue) : undefined,
    isFirstPurchaseOnly: dto.isFirstPurchaseOnly,
    isPrivate: dto.isPrivate,
    canApplyToPromotionalItems: dto.canApplyToPromotionalItems,
    expiresAt: dto.endsAt ?? undefined,
    archivedAt: dto.archivedAt ?? undefined,
    archiveReason: dto.archiveReason ?? undefined,
  };
}

function mapPromotion(dto: BackendPromotionDto): Promotion {
  const percentage = dto.type === 'Percentage' ? dto.discountValue : 0;

  return {
    id: String(dto.id),
    name: dto.name,
    description: dto.description ?? undefined,
    discountPct: percentage,
    type: dto.type,
    discountValue: dto.type === 'Percentage' ? dto.discountValue : toCents(dto.discountValue),
    minimumOrderValueCents: dto.minimumOrderValue != null ? toCents(dto.minimumOrderValue) : undefined,
    status: dto.status,
    active: dto.status === 'Active',
    startsAt: dto.startsAt,
    endsAt: dto.endsAt ?? undefined,
    productCount: dto.scopes.length,
    archivedAt: dto.archivedAt ?? undefined,
    archiveReason: dto.archiveReason ?? undefined,
  };
}

function mapAdminProductCategory(dto: BackendAdminCategoryDto): AdminProductCategory {
  return {
    id: String(dto.id),
    name: dto.name,
    slug: dto.slug,
  };
}

function mapAdminCatalogCategory(dto: BackendAdminCategoryDto): AdminCatalogCategory {
  return {
    id: String(dto.id),
    name: dto.name,
    slug: dto.slug,
    description: dto.description ?? undefined,
    parentCategoryId: dto.parentCategoryId ? String(dto.parentCategoryId) : undefined,
    displayOrder: dto.displayOrder ?? 0,
    isActive: dto.isActive ?? true,
    seoTitle: dto.seoTitle ?? undefined,
    seoDescription: dto.seoDescription ?? undefined,
    createdAt: dto.createdAt ?? new Date(0).toISOString(),
    updatedAt: dto.updatedAt ?? undefined,
  };
}

function mapAdminProductImage(dto: BackendAdminProductImageDto): AdminProductImage {
  return {
    id: String(dto.id),
    productId: String(dto.productId),
    productVariantId: dto.productVariantId ? String(dto.productVariantId) : undefined,
    publicUrl: dto.publicUrl,
    altText: dto.altText ?? undefined,
    sortOrder: dto.sortOrder,
    isMain: dto.isMain,
  };
}

function mapAdminImageUploadUrl(dto: BackendImageUploadUrlDto): AdminImageUploadUrl {
  return {
    uploadUrl: dto.uploadUrl,
    storageKey: dto.storageKey,
    publicUrl: dto.publicUrl,
    contentType: dto.contentType,
    expiresAt: dto.expiresAt,
    maxSizeBytes: dto.maxSizeBytes,
  };
}

function mapReadinessStatus(status: string): IntegrationStatus['status'] {
  if (status === 'Ready') return 'ok';
  if (status === 'Blocked') return 'down';
  return 'degraded';
}

function mapIntegrationKind(name: string): IntegrationStatus['kind'] {
  const normalized = name.toLowerCase();
  if (normalized.includes('payment')) return 'pagamento';
  if (normalized.includes('shipping')) return 'frete';
  if (normalized.includes('fiscal')) return 'fiscal';
  if (normalized.includes('email')) return 'notificacao';
  if (normalized.includes('storage')) return 'storage';
  if (normalized.includes('monitoring')) return 'monitoramento';
  if (normalized.includes('backup')) return 'backup';
  return 'automacao';
}

function mapReadinessCheck(dto: BackendReadinessCheckDto): ProductionReadinessCheck {
  return {
    key: dto.key,
    status: dto.status as ProductionReadinessStatus,
    message: dto.message,
    isBlocking: dto.isBlocking,
  };
}

function mapIntegrationStatus(dto: BackendIntegrationStatusDto, checkedAt: string): IntegrationStatus {
  const provider = dto.provider?.trim();
  const name = provider && provider !== 'Pendente' ? provider : dto.name;

  return {
    id: dto.name,
    name,
    provider: provider || undefined,
    kind: mapIntegrationKind(dto.name),
    status: mapReadinessStatus(dto.status),
    lastRun: checkedAt,
    requiredForProduction: dto.isRequiredForProduction,
    missingSettings: dto.missingSettings ?? [],
    message: dto.message,
  };
}

function mapProductionReadiness(dto: BackendProductionReadinessDto): ProductionReadiness {
  return {
    environment: dto.environment,
    isProduction: dto.isProduction,
    overallStatus: dto.overallStatus,
    canBootInProduction: dto.canBootInProduction,
    checkedAt: dto.checkedAt,
    checks: dto.checks.map(mapReadinessCheck),
    integrations: dto.integrations.map((item) => mapIntegrationStatus(item, dto.checkedAt)),
  };
}

function mapAdminProductVariant(dto: BackendAdminProductVariantDto): AdminProductVariant {
  return {
    id: String(dto.id),
    productId: String(dto.productId),
    sku: dto.sku,
    name: dto.name,
    color: dto.color ?? undefined,
    colorHex: dto.colorHex ?? undefined,
    size: dto.size ?? undefined,
    material: dto.material ?? undefined,
    finish: dto.finish ?? undefined,
    priceCents: toCents(dto.price),
    promotionalPriceCents: dto.promotionalPrice != null ? toCents(dto.promotionalPrice) : undefined,
    costPriceCents: dto.costPrice != null ? toCents(dto.costPrice) : undefined,
    stockQuantity: dto.stockQuantity,
    reservedQuantity: dto.reservedQuantity,
    availableQuantity: dto.availableQuantity,
    minimumStock: dto.minimumStock,
    isLowStock: dto.isLowStock,
    weightKg: dto.weightKg,
    heightCm: dto.heightCm,
    widthCm: dto.widthCm,
    depthCm: dto.depthCm,
    barcode: dto.barcode ?? undefined,
    isDefault: dto.isDefault,
    isActive: dto.isActive,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt ?? undefined,
  };
}

function mapAdminProduct(dto: BackendAdminProductDto): AdminProduct {
  const images = dto.images.map(mapAdminProductImage);

  return {
    id: String(dto.id),
    name: dto.name,
    slug: dto.slug,
    shortDescription: dto.shortDescription ?? undefined,
    description: dto.description ?? undefined,
    brand: dto.brand ?? undefined,
    collection: dto.collection ?? undefined,
    mainMaterial: dto.mainMaterial ?? undefined,
    mainColor: dto.mainColor ?? undefined,
    status: dto.status,
    isFeatured: dto.isFeatured,
    isNewArrival: dto.isNewArrival,
    isPromotion: dto.isPromotion,
    displayOrder: dto.displayOrder,
    seoTitle: dto.seoTitle ?? undefined,
    seoDescription: dto.seoDescription ?? undefined,
    searchKeywords: dto.searchKeywords ?? undefined,
    categories: dto.categories.map(mapAdminProductCategory),
    variants: dto.variants.map(mapAdminProductVariant),
    images,
    isAvailable: dto.isAvailable,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt ?? undefined,
    publishedAt: dto.publishedAt ?? undefined,
    archivedAt: dto.archivedAt ?? undefined,
  };
}

function mapInventorySummary(dto: BackendInventorySummaryDto): AdminInventorySummary {
  return {
    variantId: String(dto.variantId),
    productId: String(dto.productId),
    sku: dto.sku,
    productName: dto.productName,
    productSlug: dto.productSlug,
    variantName: dto.variantName,
    stockQuantity: dto.stockQuantity,
    reservedQuantity: dto.reservedQuantity,
    availableQuantity: dto.availableQuantity,
    minimumStock: dto.minimumStock,
    isLowStock: dto.isLowStock,
    isActive: dto.isActive,
  };
}

function mapInventoryDetail(dto: BackendInventoryDetailDto): AdminInventoryDetail {
  return {
    ...mapInventorySummary(dto),
    productStatus: dto.productStatus,
    priceCents: toCents(dto.price),
    promotionalPriceCents: dto.promotionalPrice != null ? toCents(dto.promotionalPrice) : undefined,
    weightKg: dto.weightKg,
    heightCm: dto.heightCm,
    widthCm: dto.widthCm,
    depthCm: dto.depthCm,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt ?? undefined,
  };
}

function mapStockMovement(dto: BackendStockMovementDto): AdminStockMovement {
  return {
    id: String(dto.id),
    variantId: String(dto.variantId),
    sku: dto.sku,
    type: dto.type,
    quantity: dto.quantity,
    previousStockQuantity: dto.previousStockQuantity,
    newStockQuantity: dto.newStockQuantity,
    previousReservedQuantity: dto.previousReservedQuantity,
    newReservedQuantity: dto.newReservedQuantity,
    reason: dto.reason ?? undefined,
    referenceType: dto.referenceType ?? undefined,
    referenceId: dto.referenceId ?? undefined,
    createdByUserId: dto.createdByUserId ? String(dto.createdByUserId) : undefined,
    createdAt: dto.createdAt,
  };
}

function mapStockReservation(dto: BackendStockReservationDto): AdminStockReservation {
  return {
    id: String(dto.id),
    variantId: String(dto.variantId),
    sku: dto.sku,
    userId: dto.userId ? String(dto.userId) : undefined,
    cartId: dto.cartId ?? undefined,
    orderId: dto.orderId ?? undefined,
    quantity: dto.quantity,
    status: dto.status,
    expiresAt: dto.expiresAt,
    createdAt: dto.createdAt,
    confirmedAt: dto.confirmedAt ?? undefined,
    releasedAt: dto.releasedAt ?? undefined,
    expiredAt: dto.expiredAt ?? undefined,
    releaseReason: dto.releaseReason ?? undefined,
  };
}

function optionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function toVariantBody(input: AdminProductVariantInput): BackendSaveProductVariantDto {
  return {
    sku: input.sku.trim(),
    name: input.name.trim(),
    color: optionalText(input.color),
    colorHex: optionalText(input.colorHex),
    size: optionalText(input.size),
    material: optionalText(input.material),
    finish: optionalText(input.finish),
    price: fromCents(input.priceCents) ?? 0,
    promotionalPrice: fromCents(input.promotionalPriceCents),
    costPrice: fromCents(input.costPriceCents),
    stockQuantity: input.stockQuantity,
    reservedQuantity: input.reservedQuantity,
    minimumStock: input.minimumStock,
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    widthCm: input.widthCm,
    depthCm: input.depthCm,
    barcode: optionalText(input.barcode),
    isDefault: input.isDefault,
    isActive: input.isActive,
  };
}

function toProductBody(input: AdminProductInput): BackendSaveProductDto {
  return {
    name: input.name.trim(),
    slug: optionalText(input.slug),
    shortDescription: optionalText(input.shortDescription),
    description: optionalText(input.description),
    brand: optionalText(input.brand),
    collection: optionalText(input.collection),
    mainMaterial: optionalText(input.mainMaterial),
    mainColor: optionalText(input.mainColor),
    status: input.status,
    isFeatured: input.isFeatured,
    isNewArrival: input.isNewArrival,
    isPromotion: input.isPromotion,
    displayOrder: input.displayOrder,
    seoTitle: optionalText(input.seoTitle),
    seoDescription: optionalText(input.seoDescription),
    searchKeywords: optionalText(input.searchKeywords),
    categoryIds: input.categoryIds.map((id) => Number(id)).filter(Number.isFinite),
    variants: input.variants.map(toVariantBody),
  };
}

function toImageBody(input: AdminProductImageInput): BackendSaveProductImageDto {
  return {
    productVariantId: input.productVariantId ? Number(input.productVariantId) : undefined,
    storageKey: input.storageKey.trim(),
    publicUrl: input.publicUrl.trim(),
    altText: optionalText(input.altText),
    sortOrder: input.sortOrder,
    isMain: input.isMain,
  };
}

function toCouponBody(input: AdminCouponInput) {
  return {
    code: input.code.trim(),
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    type: input.type,
    discountValue: input.type === 'Percentage' ? input.discountValueCents : input.discountValueCents / 100,
    maxDiscountValue: input.maxDiscountValueCents != null ? input.maxDiscountValueCents / 100 : undefined,
    minimumOrderValue: input.minimumOrderValueCents != null ? input.minimumOrderValueCents / 100 : undefined,
    startsAt: input.startsAt,
    endsAt: input.endsAt || undefined,
    totalUsageLimit: input.totalUsageLimit,
    usageLimitPerCustomer: input.usageLimitPerCustomer,
    isFirstPurchaseOnly: input.isFirstPurchaseOnly,
    isPrivate: input.isPrivate,
    canApplyToPromotionalItems: input.canApplyToPromotionalItems,
    scopes: [{ scopeType: 'Order', targetId: null, isExcluded: false }],
    allowedCustomerUserIds: [],
  };
}

function toPromotionBody(input: AdminPromotionInput) {
  return {
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    type: input.type,
    discountValue: input.type === 'Percentage' ? input.discountValueCents : input.discountValueCents / 100,
    minimumOrderValue: input.minimumOrderValueCents != null ? input.minimumOrderValueCents / 100 : undefined,
    startsAt: input.startsAt,
    endsAt: input.endsAt || undefined,
    scopes: [{ scopeType: 'Order', targetId: null, isExcluded: false }],
  };
}

function buildMockFiscalPreview(order: Order): FiscalPreview {
  return {
    marker: 'PREVIA SEM VALOR FISCAL',
    orderId: order.id,
    orderNumber: order.number,
    generatedAt: new Date().toISOString(),
    customerName: order.shippingAddress.recipient,
    shippingAddress: `${order.shippingAddress.street}, ${order.shippingAddress.number} - ${order.shippingAddress.district}, ${order.shippingAddress.city}/${order.shippingAddress.state}`,
    items: order.items.map((item) => ({
      description: `${item.name}${item.colorName ? ` - ${item.colorName}` : ''}`,
      sku: item.sku,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      totalCents: item.unitPriceCents * item.quantity,
    })),
    subtotalCents: order.subtotalCents,
    discountCents: order.discountCents,
    shippingCents: order.shippingCents,
    totalCents: order.totalCents,
    pendingIssues: [
      'Configuração fiscal da empresa ainda não cadastrada.',
      'CFOP, NCM, origem e tributação dos produtos ainda não cadastrados.',
    ],
  };
}

function mockOrderById(id: string): Order {
  const order = orders.find((x) => x.id === id || x.number === id || x.number === `#${id}`);
  if (!order) throw new Error('Pedido nao encontrado');
  return order;
}

function mockPaymentAttempts(order: Order): PaymentAttempt[] {
  if (order.paymentAttempt) return [order.paymentAttempt];

  return [
    {
      id: `pay-${order.id}`,
      provider: 'MockGateway',
      method: order.paymentMethod,
      status: order.paymentStatus || 'Pending',
      amountCents: order.totalCents,
      createdAt: order.createdAt,
      expiresAt: order.expiresAt,
    },
  ];
}

function mockWebhookEvents(order: Order): WebhookEvent[] {
  if (order.paymentStatus === 'Pending') return [];

  return [
    {
      id: `wh-${order.id}`,
      provider: 'MockGateway',
      externalEventId: `evt-${order.id}`,
      payloadHash: 'mock-payload-hash',
      status: 'Processed',
      orderId: order.id,
      paymentAttemptId: `pay-${order.id}`,
      receivedAt: order.createdAt,
      processedAt: order.createdAt,
    },
  ];
}

function mockAdminAlerts(): AdminAlert[] {
  return [
    {
      id: 'mock-alert-low-stock',
      type: 'LowStock',
      severity: 'Medium',
      status: 'Open',
      title: 'SKU com estoque baixo',
      message: 'Bolsa Tote Manhattan / SKU MOCK está com 2 unidade(s) disponíveis.',
      entityName: 'ProductVariant',
      entityId: 'mock-variant',
      createdAt: new Date().toISOString(),
    },
  ];
}

function mockAdminCustomers(): AdminCustomerListItem[] {
  return [
    {
      id: 'mock-customer-1',
      userId: mockCustomer.id,
      name: mockCustomer.name,
      email: mockCustomer.email,
      cpfMasked: '123.***.***-09',
      phoneMasked: mockCustomer.phone,
      active: true,
      createdAt: mockCustomer.createdAt,
    },
  ];
}

function mockAdminCustomerDetail(id: string): AdminCustomerDetail {
  const customer = mockAdminCustomers().find((item) => item.id === id) ?? mockAdminCustomers()[0];

  return {
    ...customer,
    rgMasked: '12****90',
    birthDate: '1992-05-14',
    termsAccepted: true,
    termsAcceptedAt: customer.createdAt,
    marketingAccepted: true,
    marketingAcceptedAt: customer.createdAt,
  };
}

function mockAdminCategories(): AdminCatalogCategory[] {
  return categories.map((category, index) => ({
    id: String(index + 1),
    name: category.name,
    slug: category.slug,
    description: category.tagline,
    displayOrder: index,
    isActive: true,
    createdAt: new Date(2026, 0, index + 1).toISOString(),
  }));
}

function mockAdminProducts(): AdminProduct[] {
  const adminCategories = mockAdminCategories();

  return products.map((product) => {
    const category = adminCategories.find((item) => item.slug === product.categorySlug);

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      shortDescription: product.shortDescription,
      description: product.description,
      collection: product.collection,
      mainMaterial: product.specs.material,
      status: 'Published',
      isFeatured: product.badges.includes('novo'),
      isNewArrival: product.badges.includes('novo'),
      isPromotion: product.badges.includes('promocao'),
      displayOrder: 0,
      categories: category ? [{ id: category.id, name: category.name, slug: category.slug }] : [],
      variants: product.variants.map((variant) => ({
        id: variant.id,
        productId: product.id,
        sku: variant.sku,
        name: product.colors.find((color) => color.id === variant.colorId)?.name ?? variant.sku,
        color: product.colors.find((color) => color.id === variant.colorId)?.name,
        colorHex: product.colors.find((color) => color.id === variant.colorId)?.hex,
        size: product.sizes.find((size) => size.id === variant.sizeId)?.label,
        priceCents: variant.priceCents,
        promotionalPriceCents: variant.compareAtCents,
        stockQuantity: variant.stock,
        reservedQuantity: 0,
        availableQuantity: variant.stock,
        minimumStock: 3,
        isLowStock: variant.stock <= 3,
        weightKg: (product.specs.weightG ?? 0) / 1000,
        heightCm: product.specs.heightCm ?? 0,
        widthCm: product.specs.widthCm ?? 0,
        depthCm: product.specs.depthCm ?? 0,
        isDefault: variant.id === product.variants[0]?.id,
        isActive: true,
        createdAt: product.createdAt,
      })),
      images: product.media.map((media, index) => ({
        id: media.id,
        productId: product.id,
        publicUrl: media.url,
        altText: media.alt,
        sortOrder: index,
        isMain: index === 0,
      })),
      isAvailable: product.variants.some((variant) => variant.stock > 0),
      createdAt: product.createdAt,
    };
  });
}

function mockAdminProductFromInput(input: AdminProductInput, id = 'mock-new-product'): AdminProduct {
  const now = new Date().toISOString();
  const selectedCategories = mockAdminCategories().filter((category) => input.categoryIds.includes(category.id));

  return {
    id,
    name: input.name,
    slug: input.slug || input.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    shortDescription: input.shortDescription,
    description: input.description,
    brand: input.brand,
    collection: input.collection,
    mainMaterial: input.mainMaterial,
    mainColor: input.mainColor,
    status: input.status,
    isFeatured: input.isFeatured,
    isNewArrival: input.isNewArrival,
    isPromotion: input.isPromotion,
    displayOrder: input.displayOrder,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    searchKeywords: input.searchKeywords,
    categories: selectedCategories.map(({ id: categoryId, name, slug }) => ({ id: categoryId, name, slug })),
    variants: input.variants.map((variant, index) => ({
      id: variant.id ?? `mock-variant-${index + 1}`,
      productId: id,
      sku: variant.sku,
      name: variant.name,
      color: variant.color,
      colorHex: variant.colorHex,
      size: variant.size,
      material: variant.material,
      finish: variant.finish,
      priceCents: variant.priceCents,
      promotionalPriceCents: variant.promotionalPriceCents,
      costPriceCents: variant.costPriceCents,
      stockQuantity: variant.stockQuantity,
      reservedQuantity: variant.reservedQuantity,
      availableQuantity: Math.max(0, variant.stockQuantity - variant.reservedQuantity),
      minimumStock: variant.minimumStock,
      isLowStock: variant.stockQuantity - variant.reservedQuantity <= variant.minimumStock,
      weightKg: variant.weightKg,
      heightCm: variant.heightCm,
      widthCm: variant.widthCm,
      depthCm: variant.depthCm,
      barcode: variant.barcode,
      isDefault: variant.isDefault,
      isActive: variant.isActive,
      createdAt: now,
    })),
    images: [],
    isAvailable: input.status === 'Published' && input.variants.some((variant) => variant.isActive && variant.stockQuantity > variant.reservedQuantity),
    createdAt: now,
    publishedAt: input.status === 'Published' ? now : undefined,
  };
}

function mockInventorySummaries(): AdminInventorySummary[] {
  return mockAdminProducts().flatMap((product) =>
    product.variants.map((variant) => ({
      variantId: variant.id,
      productId: product.id,
      sku: variant.sku,
      productName: product.name,
      productSlug: product.slug,
      variantName: variant.name,
      stockQuantity: variant.stockQuantity,
      reservedQuantity: variant.reservedQuantity,
      availableQuantity: variant.availableQuantity,
      minimumStock: variant.minimumStock,
      isLowStock: variant.isLowStock,
      isActive: variant.isActive,
    })),
  );
}

function mockInventoryDetail(variantId: string): AdminInventoryDetail {
  const product = mockAdminProducts().find((item) => item.variants.some((variant) => variant.id === variantId));
  const variant = product?.variants.find((item) => item.id === variantId);
  if (!product || !variant) throw new Error('SKU nao encontrado');

  return {
    variantId: variant.id,
    productId: product.id,
    sku: variant.sku,
    productName: product.name,
    productSlug: product.slug,
    variantName: variant.name,
    stockQuantity: variant.stockQuantity,
    reservedQuantity: variant.reservedQuantity,
    availableQuantity: variant.availableQuantity,
    minimumStock: variant.minimumStock,
    isLowStock: variant.isLowStock,
    isActive: variant.isActive,
    productStatus: product.status,
    priceCents: variant.priceCents,
    promotionalPriceCents: variant.promotionalPriceCents,
    weightKg: variant.weightKg,
    heightCm: variant.heightCm,
    widthCm: variant.widthCm,
    depthCm: variant.depthCm,
    createdAt: variant.createdAt,
    updatedAt: variant.updatedAt,
  };
}

function mockStockMovements(variantId?: string): AdminStockMovement[] {
  return mockInventorySummaries()
    .filter((item) => !variantId || item.variantId === variantId)
    .flatMap((item, index) => ([
      {
        id: `mock-movement-${item.variantId}-initial`,
        variantId: item.variantId,
        sku: item.sku,
        type: 'InitialStock',
        quantity: item.stockQuantity,
        previousStockQuantity: 0,
        newStockQuantity: item.stockQuantity,
        previousReservedQuantity: 0,
        newReservedQuantity: item.reservedQuantity,
        reason: 'Estoque inicial informado no cadastro do SKU.',
        createdByUserId: 'mock-admin',
        createdAt: new Date(Date.now() - (index + 2) * 86400000).toISOString(),
      },
    ]));
}

function mockStockReservations(variantId?: string, status?: string): AdminStockReservation[] {
  return mockInventorySummaries()
    .filter((item) => item.reservedQuantity > 0 || item.availableQuantity <= item.minimumStock)
    .filter((item) => !variantId || item.variantId === variantId)
    .map((item, index) => ({
      id: `mock-reservation-${item.variantId}`,
      variantId: item.variantId,
      sku: item.sku,
      cartId: `mock-cart-${index + 1}`,
      quantity: Math.max(1, item.reservedQuantity || 1),
      status: index % 2 === 0 ? 'Active' : 'Expired',
      expiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
      createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
      expiredAt: index % 2 === 0 ? undefined : new Date(Date.now() - 5 * 60000).toISOString(),
    }))
    .filter((item) => !status || item.status === status);
}

function withMockHistory(order: Order, status: OrderStatus, reason: string): Order {
  return {
    ...order,
    status,
    history: [
      {
        id: `hist-${Date.now()}`,
        previousStatus: order.status,
        status: toBackendOrderStatus(status),
        reason,
        createdAt: new Date().toISOString(),
      },
      ...(order.history ?? []),
    ],
  };
}

function toShipmentBody(input: AdminShipmentInput) {
  return {
    carrier: input.carrier.trim(),
    service: input.service?.trim() || undefined,
    trackingCode: input.trackingCode.trim(),
    trackingUrl: input.trackingUrl?.trim() || undefined,
    shippedAt: input.shippedAt ? new Date(input.shippedAt).toISOString() : undefined,
  };
}

/**
 * Services do painel administrativo. Toda acao sensivel (preco, reembolso,
 * permissao) e validada e auditada no backend.
 */
export const adminService = {
  async getDashboard(): Promise<DashboardData> {
    if (USE_MOCK) return delay(dashboard);
    return mapAdminDashboard(await http<BackendAdminDashboardDto>('/admin/dashboard'));
  },

  async listAlerts(filters: {
    status?: string;
    severity?: string;
    type?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<AdminAlert[]> {
    if (USE_MOCK) {
      return delay(mockAdminAlerts().filter((alert) => {
        if (filters.status && alert.status !== filters.status) return false;
        if (filters.severity && alert.severity !== filters.severity) return false;
        if (filters.type && alert.type !== filters.type) return false;
        return true;
      }));
    }

    const result = await http<BackendPaged<BackendAdminAlertDto>>('/admin/alertas', {
      query: {
        status: filters.status,
        severity: filters.severity,
        type: filters.type,
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 5,
      },
    });

    return result.items.map(mapAdminAlert);
  },

  async resolveAlert(id: string, reason: string): Promise<AdminAlert> {
    if (USE_MOCK) {
      const alert = mockAdminAlerts().find((item) => item.id === id) ?? mockAdminAlerts()[0];
      return delay({
        ...alert,
        id,
        status: 'Resolved',
        resolvedAt: new Date().toISOString(),
        resolutionReason: reason.trim(),
      });
    }

    return mapAdminAlert(
      await http<BackendAdminAlertDto>(`/admin/alertas/${id}/resolver`, {
        method: 'PATCH',
        body: { reason: reason.trim() },
      }),
    );
  },

  async ignoreAlert(id: string, reason: string): Promise<AdminAlert> {
    if (USE_MOCK) {
      const alert = mockAdminAlerts().find((item) => item.id === id) ?? mockAdminAlerts()[0];
      return delay({
        ...alert,
        id,
        status: 'Ignored',
        resolvedAt: new Date().toISOString(),
        resolutionReason: reason.trim(),
      });
    }

    return mapAdminAlert(
      await http<BackendAdminAlertDto>(`/admin/alertas/${id}/ignorar`, {
        method: 'PATCH',
        body: { reason: reason.trim() },
      }),
    );
  },

  async listProducts(): Promise<Product[]> {
    if (USE_MOCK) return delay(products);
    // TODO(backend): GET /admin/products
    return http<Product[]>('/admin/products');
  },

  async listAdminCategories(): Promise<AdminCatalogCategory[]> {
    if (USE_MOCK) return delay(mockAdminCategories());

    const result = await http<BackendAdminCategoryDto[]>('/admin/categorias');
    return result.map(mapAdminCatalogCategory);
  },

  async listAdminProducts(filters: {
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<AdminProduct[]> {
    if (USE_MOCK) {
      const search = filters.search?.trim().toLowerCase();
      return delay(mockAdminProducts().filter((product) => {
        if (filters.status && product.status !== filters.status) return false;
        if (!search) return true;
        return product.name.toLowerCase().includes(search) ||
          product.slug.toLowerCase().includes(search) ||
          product.variants.some((variant) => variant.sku.toLowerCase().includes(search));
      }));
    }

    const result = await http<BackendPaged<BackendAdminProductDto>>('/admin/produtos', {
      query: {
        search: filters.search,
        status: filters.status,
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 20,
      },
    });

    return result.items.map(mapAdminProduct);
  },

  async getAdminProduct(id: string): Promise<AdminProduct> {
    if (USE_MOCK) {
      const product = mockAdminProducts().find((item) => item.id === id);
      if (!product) throw new Error('Produto nao encontrado');
      return delay(product);
    }

    return mapAdminProduct(await http<BackendAdminProductDto>(`/admin/produtos/${id}`));
  },

  async createAdminProduct(input: AdminProductInput): Promise<AdminProduct> {
    if (USE_MOCK) return delay(mockAdminProductFromInput(input));

    return mapAdminProduct(
      await http<BackendAdminProductDto>('/admin/produtos', {
        method: 'POST',
        body: toProductBody(input),
      }),
    );
  },

  async updateAdminProduct(id: string, input: AdminProductInput): Promise<AdminProduct> {
    if (USE_MOCK) return delay(mockAdminProductFromInput(input, id));

    return mapAdminProduct(
      await http<BackendAdminProductDto>(`/admin/produtos/${id}`, {
        method: 'PUT',
        body: toProductBody(input),
      }),
    );
  },

  async updateAdminProductStatus(id: string, status: 'Draft' | 'Published'): Promise<AdminProduct> {
    if (USE_MOCK) {
      const product = mockAdminProducts().find((item) => item.id === id) ?? mockAdminProducts()[0];
      return delay({ ...product, status, publishedAt: status === 'Published' ? new Date().toISOString() : product.publishedAt });
    }

    return mapAdminProduct(
      await http<BackendAdminProductDto>(`/admin/produtos/${id}/status`, {
        method: 'PATCH',
        body: { status },
      }),
    );
  },

  async updateAdminProductFeatured(id: string, isFeatured: boolean): Promise<AdminProduct> {
    if (USE_MOCK) {
      const product = mockAdminProducts().find((item) => item.id === id) ?? mockAdminProducts()[0];
      return delay({ ...product, isFeatured });
    }

    return mapAdminProduct(
      await http<BackendAdminProductDto>(`/admin/produtos/${id}/destaque`, {
        method: 'PATCH',
        body: { isFeatured },
      }),
    );
  },

  async deactivateAdminProductVariant(productId: string, variantId: string): Promise<AdminProductVariant> {
    if (USE_MOCK) {
      const variant = mockAdminProducts()
        .find((product) => product.id === productId)
        ?.variants.find((item) => item.id === variantId);
      if (!variant) throw new Error('Variação nao encontrada');
      return delay({ ...variant, isActive: false, isDefault: false });
    }

    return mapAdminProductVariant(
      await http<BackendAdminProductVariantDto>(`/admin/produtos/${productId}/variantes/${variantId}`, {
        method: 'DELETE',
      }),
    );
  },

  async uploadAdminProductImage(file: File): Promise<AdminImageUploadUrl> {
    if (USE_MOCK) {
      const safeName = file.name
        .toLowerCase()
        .replace(/[^a-z0-9.]+/g, '-')
        .replace(/^-|-$/g, '') || 'imagem.jpg';
      const storageKey = `mock/products/${Date.now()}-${safeName}`;

      return delay({
        uploadUrl: '',
        storageKey,
        publicUrl: `https://mock.bibibolsas.local/${storageKey}`,
        contentType: file.type || 'image/jpeg',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        maxSizeBytes: 10 * 1024 * 1024,
      });
    }

    const uploadData = mapAdminImageUploadUrl(
      await http<BackendImageUploadUrlDto>('/admin/storage/imagens/upload-url', {
        method: 'POST',
        body: {
          fileName: file.name,
          contentType: file.type,
          contentLength: file.size,
          folder: 'products',
        },
      }),
    );

    const response = await fetch(uploadData.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': uploadData.contentType },
      body: file,
    });

    if (!response.ok)
      throw new Error('Nao foi possivel enviar a imagem para o storage.');

    return uploadData;
  },

  async addAdminProductImage(productId: string, input: AdminProductImageInput): Promise<AdminProductImage> {
    if (USE_MOCK) {
      return delay({
        id: `mock-image-${Date.now()}`,
        productId,
        productVariantId: input.productVariantId,
        publicUrl: input.publicUrl,
        altText: input.altText,
        sortOrder: input.sortOrder,
        isMain: input.isMain,
      });
    }

    return mapAdminProductImage(
      await http<BackendAdminProductImageDto>(`/admin/produtos/${productId}/imagens`, {
        method: 'POST',
        body: toImageBody(input),
      }),
    );
  },

  async updateAdminProductImage(
    productId: string,
    imageId: string,
    input: AdminProductImageInput,
  ): Promise<AdminProductImage> {
    if (USE_MOCK) {
      return delay({
        id: imageId,
        productId,
        productVariantId: input.productVariantId,
        publicUrl: input.publicUrl,
        altText: input.altText,
        sortOrder: input.sortOrder,
        isMain: input.isMain,
      });
    }

    return mapAdminProductImage(
      await http<BackendAdminProductImageDto>(`/admin/produtos/${productId}/imagens/${imageId}`, {
        method: 'PUT',
        body: toImageBody(input),
      }),
    );
  },

  async deleteAdminProductImage(productId: string, imageId: string): Promise<void> {
    if (USE_MOCK) return delay(undefined);

    await http<unknown>(`/admin/produtos/${productId}/imagens/${imageId}`, {
      method: 'DELETE',
    });
  },

  async setAdminProductMainImage(productId: string, imageId: string): Promise<AdminProductImage> {
    if (USE_MOCK) {
      return delay({
        id: imageId,
        productId,
        publicUrl: '',
        sortOrder: 0,
        isMain: true,
      });
    }

    return mapAdminProductImage(
      await http<BackendAdminProductImageDto>(`/admin/produtos/${productId}/imagens/${imageId}/principal`, {
        method: 'PATCH',
      }),
    );
  },

  async listInventory(filters: {
    search?: string;
    low?: boolean;
    active?: boolean;
    page?: number;
    pageSize?: number;
  } = {}): Promise<AdminInventorySummary[]> {
    if (USE_MOCK) {
      const search = filters.search?.trim().toLowerCase();
      return delay(mockInventorySummaries().filter((item) => {
        if (filters.low != null && item.isLowStock !== filters.low) return false;
        if (filters.active != null && item.isActive !== filters.active) return false;
        if (!search) return true;
        return item.productName.toLowerCase().includes(search) || item.sku.toLowerCase().includes(search);
      }));
    }

    const result = await http<BackendPaged<BackendInventorySummaryDto>>('/admin/estoque', {
      query: {
        search: filters.search,
        baixo: filters.low,
        ativo: filters.active,
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 20,
      },
    });

    return result.items.map(mapInventorySummary);
  },

  async getInventoryDetail(variantId: string): Promise<AdminInventoryDetail> {
    if (USE_MOCK) return delay(mockInventoryDetail(variantId));

    return mapInventoryDetail(await http<BackendInventoryDetailDto>(`/admin/estoque/${variantId}`));
  },

  async adjustInventory(input: AdminInventoryAdjustmentInput): Promise<AdminInventorySummary> {
    if (USE_MOCK) {
      const item = mockInventorySummaries().find((summary) => summary.variantId === input.variantId);
      if (!item) throw new Error('SKU nao encontrado');
      const newStock = input.type === 'ManualEntry'
        ? item.stockQuantity + input.quantity
        : input.type === 'ManualExit'
          ? item.stockQuantity - input.quantity
          : input.quantity;
      const next = {
        ...item,
        stockQuantity: Math.max(0, newStock),
        availableQuantity: Math.max(0, Math.max(0, newStock) - item.reservedQuantity),
      };
      return delay({ ...next, isLowStock: next.availableQuantity <= next.minimumStock });
    }

    return mapInventorySummary(
      await http<BackendInventorySummaryDto>('/admin/estoque/ajustes', {
        method: 'POST',
        body: {
          variantId: Number(input.variantId),
          type: input.type,
          quantity: input.quantity,
          reason: input.reason.trim(),
        },
      }),
    );
  },

  async listInventoryMovements(filters: {
    variantId?: string;
    type?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<AdminStockMovement[]> {
    if (USE_MOCK) {
      return delay(mockStockMovements(filters.variantId).filter((movement) => {
        if (filters.type && movement.type !== filters.type) return false;
        return true;
      }));
    }

    const result = await http<BackendPaged<BackendStockMovementDto>>('/admin/estoque/movimentacoes', {
      query: {
        variantId: filters.variantId,
        type: filters.type,
        from: filters.from,
        to: filters.to,
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 20,
      },
    });

    return result.items.map(mapStockMovement);
  },

  async listInventoryReservations(filters: {
    variantId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<AdminStockReservation[]> {
    if (USE_MOCK) return delay(mockStockReservations(filters.variantId, filters.status));

    const result = await http<BackendPaged<BackendStockReservationDto>>('/admin/estoque/reservas', {
      query: {
        variantId: filters.variantId,
        status: filters.status,
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 20,
      },
    });

    return result.items.map(mapStockReservation);
  },

  async releaseInventoryReservation(id: string, reason: string): Promise<AdminStockReservation> {
    if (USE_MOCK) {
      const reservation = mockStockReservations().find((item) => item.id === id);
      if (!reservation) throw new Error('Reserva nao encontrada');
      return delay({
        ...reservation,
        status: 'Released',
        releasedAt: new Date().toISOString(),
        releaseReason: reason.trim(),
      });
    }

    return mapStockReservation(
      await http<BackendStockReservationDto>(`/admin/estoque/reservas/${id}/liberar`, {
        method: 'POST',
        body: { reason: reason.trim() || undefined },
      }),
    );
  },

  async listOrders(): Promise<Order[]> {
    if (USE_MOCK) return delay(orders);
    const result = await http<BackendPaged<BackendOrderListItemDto>>('/admin/pedidos', {
      query: { page: 1, pageSize: 100 },
    });
    return result.items.map(mapListOrder);
  },

  async getOrder(id: string): Promise<Order> {
    if (USE_MOCK) return delay(mockOrderById(id));
    return mapOrderDetails(await http<BackendOrderDetailsDto>(`/admin/pedidos/${id}`));
  },

  async listOrderPayments(id: string): Promise<PaymentAttempt[]> {
    if (USE_MOCK) return delay(mockPaymentAttempts(mockOrderById(id)));
    return (await http<BackendPaymentAttemptDto[]>(`/admin/pedidos/${id}/pagamentos`))
      .map((attempt) => mapPaymentAttempt(attempt)!)
      .filter(Boolean);
  },

  async listOrderWebhookEvents(id: string): Promise<WebhookEvent[]> {
    if (USE_MOCK) return delay(mockWebhookEvents(mockOrderById(id)));
    return (await http<BackendWebhookEventDto[]>(`/admin/pedidos/${id}/webhook-events`)).map(mapWebhookEvent);
  },

  async updateOrderStatus(id: string, status: OrderStatus, reason: string): Promise<Order> {
    if (USE_MOCK) return delay(withMockHistory(mockOrderById(id), status, reason));
    return mapOrderDetails(
      await http<BackendOrderDetailsDto>(`/admin/pedidos/${id}/status`, {
        method: 'PATCH',
        body: {
          status: toBackendOrderStatus(status),
          reason: reason.trim(),
        },
      }),
    );
  },

  async cancelOrder(id: string, reason: string): Promise<Order> {
    if (USE_MOCK) return delay(withMockHistory(mockOrderById(id), 'canceled', reason));
    return mapOrderDetails(
      await http<BackendOrderDetailsDto>(`/admin/pedidos/${id}/cancelar`, {
        method: 'POST',
        body: { reason: reason.trim() },
      }),
    );
  },

  async registerShipment(id: string, input: AdminShipmentInput): Promise<Order> {
    if (USE_MOCK) {
      const order = mockOrderById(id);
      return delay({
        ...withMockHistory(order, 'shipped', `Envio registrado. Rastreio: ${input.trackingCode}.`),
        tracking: {
          carrier: input.carrier,
          code: input.trackingCode,
          url: input.trackingUrl,
          events: [{ date: input.shippedAt || new Date().toISOString(), status: 'Pedido enviado' }],
        },
      });
    }

    return mapOrderDetails(
      await http<BackendOrderDetailsDto>(`/admin/pedidos/${id}/envio`, {
        method: 'POST',
        body: toShipmentBody(input),
      }),
    );
  },

  async updateTracking(id: string, input: AdminShipmentInput): Promise<Order> {
    if (USE_MOCK) {
      const order = mockOrderById(id);
      return delay({
        ...order,
        tracking: {
          carrier: input.carrier,
          code: input.trackingCode,
          url: input.trackingUrl,
          events: order.tracking?.events ?? [],
        },
      });
    }

    return mapOrderDetails(
      await http<BackendOrderDetailsDto>(`/admin/pedidos/${id}/rastreio`, {
        method: 'PATCH',
        body: toShipmentBody(input),
      }),
    );
  },

  async generateFiscalPreview(id: string): Promise<FiscalPreview> {
    if (USE_MOCK) return delay(buildMockFiscalPreview(mockOrderById(id)));
    return mapFiscalPreview(
      await http<BackendFiscalPreviewDto>(`/admin/pedidos/${id}/fiscal/previa`, {
        method: 'POST',
      }),
    );
  },

  async getFiscalPreview(id: string): Promise<FiscalPreview> {
    if (USE_MOCK) return delay(buildMockFiscalPreview(mockOrderById(id)));
    return mapFiscalPreview(await http<BackendFiscalPreviewDto>(`/admin/pedidos/${id}/fiscal/previa`));
  },

  async getFiscalDraftXml(id: string): Promise<string> {
    if (USE_MOCK) {
      const preview = buildMockFiscalPreview(mockOrderById(id));
      return delay(
        [
          '<?xml version="1.0" encoding="utf-8"?>',
          `<FiscalDocumentDraft marker="${preview.marker}">`,
          `  <OrderNumber>${preview.orderNumber}</OrderNumber>`,
          `  <CustomerName>${preview.customerName}</CustomerName>`,
          '</FiscalDocumentDraft>',
        ].join('\n'),
      );
    }

    return http<string>(`/admin/pedidos/${id}/fiscal/xml-rascunho`, {
      headers: { Accept: 'application/xml' },
      unwrapEnvelope: false,
    });
  },

  async listReviews(): Promise<Review[]> {
    if (USE_MOCK) {
      const pending: Review[] = [
        {
          id: 'rev-mod-1',
          productId: 'prod-bolsa-crossbody-aurora',
          productName: 'Bolsa Crossbody Aurora',
          customerName: 'Juliana P.',
          rating: 5,
          title: 'Apaixonada!',
          body: 'Chegou rapido e e ainda mais bonita pessoalmente.',
          createdAt: '2026-06-27T12:00:00Z',
          status: 'pending',
          verifiedPurchase: true,
        },
        {
          id: 'rev-mod-2',
          productId: 'prod-mochila-escolar-vivaz',
          productName: 'Mochila Escolar Vivaz',
          customerName: 'Anonimo',
          rating: 2,
          title: 'Esperava mais',
          body: 'O ziper enroscou no segundo dia.',
          createdAt: '2026-06-26T09:30:00Z',
          status: 'pending',
          verifiedPurchase: false,
        },
      ];
      return delay([...pending, ...reviews]);
    }
    // TODO(backend): GET /admin/reviews
    return http<Review[]>('/admin/reviews');
  },

  async moderateReview(id: string, status: 'approved' | 'rejected'): Promise<void> {
    if (USE_MOCK) return delay(undefined);
    // TODO(backend): PATCH /admin/reviews/{id} — gera log de auditoria
    return http<void>(`/admin/reviews/${id}`, { method: 'PATCH', body: { status } });
  },

  async listCoupons(filters: {
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<Coupon[]> {
    if (USE_MOCK) return delay(coupons);
    const result = await http<BackendPaged<BackendCouponDto>>('/admin/cupons', {
      query: {
        search: filters.search,
        status: filters.status,
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 20,
      },
    });
    return result.items.map(mapCoupon);
  },

  async createCoupon(input: AdminCouponInput): Promise<Coupon> {
    if (USE_MOCK) {
      return delay({
        id: `cpn-${Date.now()}`,
        code: input.code,
        name: input.name,
        description: input.description || input.name,
        type: input.type,
        value: input.type === 'Percentage' ? input.discountValueCents : input.discountValueCents,
        active: false,
        status: 'Inactive',
        startsAt: input.startsAt,
        usageCount: 0,
        usageLimit: input.totalUsageLimit,
        usageLimitPerCustomer: input.usageLimitPerCustomer,
        expiresAt: input.endsAt,
      });
    }

    return mapCoupon(
      await http<BackendCouponDto>('/admin/cupons', {
        method: 'POST',
        body: toCouponBody(input),
      }),
    );
  },

  async updateCouponStatus(id: string, status: 'Active' | 'Inactive', reason: string): Promise<Coupon> {
    if (USE_MOCK) {
      const coupon = coupons.find((item) => item.id === id) ?? coupons[0];
      return delay({ ...coupon, active: status === 'Active', status });
    }

    return mapCoupon(
      await http<BackendCouponDto>(`/admin/cupons/${id}/status`, {
        method: 'PATCH',
        body: { status, reason: reason.trim() },
      }),
    );
  },

  async archiveCoupon(id: string, reason: string): Promise<Coupon> {
    if (USE_MOCK) {
      const coupon = coupons.find((item) => item.id === id) ?? coupons[0];
      return delay({ ...coupon, active: false, status: 'Archived', archivedAt: new Date().toISOString(), archiveReason: reason.trim() });
    }

    return mapCoupon(
      await http<BackendCouponDto>(`/admin/cupons/${id}`, {
        method: 'DELETE',
        body: { reason: reason.trim() },
      }),
    );
  },

  async listPromotions(filters: {
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<Promotion[]> {
    if (USE_MOCK) return delay(promotions);
    const result = await http<BackendPaged<BackendPromotionDto>>('/admin/promocoes', {
      query: {
        search: filters.search,
        status: filters.status,
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 20,
      },
    });
    return result.items.map(mapPromotion);
  },

  async createPromotion(input: AdminPromotionInput): Promise<Promotion> {
    if (USE_MOCK) {
      return delay({
        id: `promo-${Date.now()}`,
        name: input.name,
        description: input.description,
        discountPct: input.type === 'Percentage' ? input.discountValueCents : 0,
        type: input.type,
        discountValue: input.discountValueCents,
        active: false,
        status: 'Inactive',
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        productCount: 1,
      });
    }

    return mapPromotion(
      await http<BackendPromotionDto>('/admin/promocoes', {
        method: 'POST',
        body: toPromotionBody(input),
      }),
    );
  },

  async updatePromotionStatus(id: string, status: 'Active' | 'Inactive', reason: string): Promise<Promotion> {
    if (USE_MOCK) {
      const promotion = promotions.find((item) => item.id === id) ?? promotions[0];
      return delay({ ...promotion, active: status === 'Active', status });
    }

    return mapPromotion(
      await http<BackendPromotionDto>(`/admin/promocoes/${id}/status`, {
        method: 'PATCH',
        body: { status, reason: reason.trim() },
      }),
    );
  },

  async archivePromotion(id: string, reason: string): Promise<Promotion> {
    if (USE_MOCK) {
      const promotion = promotions.find((item) => item.id === id) ?? promotions[0];
      return delay({ ...promotion, active: false, status: 'Archived', archivedAt: new Date().toISOString(), archiveReason: reason.trim() });
    }

    return mapPromotion(
      await http<BackendPromotionDto>(`/admin/promocoes/${id}`, {
        method: 'DELETE',
        body: { reason: reason.trim() },
      }),
    );
  },

  async listCustomers(filters: {
    search?: string;
    isActive?: boolean;
    page?: number;
    pageSize?: number;
  } = {}): Promise<AdminCustomerListItem[]> {
    if (USE_MOCK) {
      const search = filters.search?.trim().toLowerCase();
      return delay(mockAdminCustomers().filter((customer) => {
        if (filters.isActive != null && customer.active !== filters.isActive) return false;
        if (!search) return true;
        return customer.name.toLowerCase().includes(search) || customer.email.toLowerCase().includes(search);
      }));
    }

    const result = await http<BackendPaged<BackendAdminCustomerListDto>>('/admin/customers', {
      query: {
        search: filters.search,
        isActive: filters.isActive,
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 20,
      },
    });

    return result.items.map(mapAdminCustomerListItem);
  },

  async getCustomer(id: string): Promise<AdminCustomerDetail> {
    if (USE_MOCK) return delay(mockAdminCustomerDetail(id));
    return mapAdminCustomerDetail(await http<BackendAdminCustomerDetailDto>(`/admin/customers/${id}`));
  },

  async updateCustomerStatus(id: string, isActive: boolean): Promise<void> {
    if (USE_MOCK) return delay(undefined);
    await http<BackendAdminUserDto>(`/admin/customers/${id}/status`, {
      method: 'PATCH',
      body: { isActive },
    });
  },

  async anonymizeCustomer(id: string): Promise<AdminCustomerDetail> {
    if (USE_MOCK) {
      return delay({
        ...mockAdminCustomerDetail(id),
        name: 'Cliente anonimizado',
        email: `anonimizado-${id}@bibi.local`,
        cpfMasked: undefined,
        rgMasked: undefined,
        phoneMasked: undefined,
        active: false,
        marketingAccepted: false,
        marketingAcceptedAt: undefined,
        anonymizedAt: new Date().toISOString(),
      });
    }

    return mapAdminCustomerDetail(
      await http<BackendAdminCustomerDetailDto>(`/admin/customers/${id}/anonymize`, {
        method: 'POST',
      }),
    );
  },

  async listUsers(): Promise<AdminUser[]> {
    if (USE_MOCK) return delay(adminUsers);
    const result = await http<BackendPaged<BackendAdminUserDto>>('/admin/users', {
      query: { page: 1, pageSize: 100 },
    });
    return result.items.map(mapAdminUser);
  },

  async createEmployee(input: AdminEmployeeInput): Promise<AdminUser> {
    if (USE_MOCK) {
      return delay({
        id: `usr-${Date.now()}`,
        name: input.name,
        email: input.email,
        role: 'Employee',
        active: true,
        mfaEnabled: true,
        emailConfirmed: true,
        createdAt: new Date().toISOString(),
      });
    }

    return mapAdminUser(
      await http<BackendAdminUserDto>('/admin/users/employees', {
        method: 'POST',
        body: {
          name: input.name.trim(),
          email: input.email.trim(),
          password: input.password,
          confirmPassword: input.confirmPassword,
        },
      }),
    );
  },

  async updateEmployee(id: string, input: AdminEmployeeUpdateInput): Promise<AdminUser> {
    if (USE_MOCK) {
      const user = adminUsers.find((item) => item.id === id);
      return delay({
        ...(user ?? adminUsers[0]),
        id,
        name: input.name,
        email: input.email,
        role: 'Employee',
        active: input.isActive,
      });
    }

    return mapAdminUser(
      await http<BackendAdminUserDto>(`/admin/users/employees/${id}`, {
        method: 'PUT',
        body: {
          name: input.name.trim(),
          email: input.email.trim(),
          isActive: input.isActive,
        },
      }),
    );
  },

  async updateUserStatus(id: string, isActive: boolean): Promise<AdminUser> {
    if (USE_MOCK) {
      const user = adminUsers.find((item) => item.id === id);
      return delay({
        ...(user ?? adminUsers[0]),
        id,
        active: isActive,
      });
    }

    return mapAdminUser(
      await http<BackendAdminUserDto>(`/admin/users/${id}/status`, {
        method: 'PATCH',
        body: { isActive },
      }),
    );
  },

  async listAudit(): Promise<AuditEntry[]> {
    if (USE_MOCK) return delay(auditLog);
    const result = await http<BackendPaged<BackendAuditLogDto>>('/admin/auditoria', {
      query: { page: 1, pageSize: 20 },
    });
    return result.items.map(mapAuditEntry);
  },

  async getProductionReadiness(): Promise<ProductionReadiness> {
    if (USE_MOCK) {
      return delay({
        environment: 'Development',
        isProduction: false,
        overallStatus: 'Warning',
        canBootInProduction: false,
        checkedAt: new Date().toISOString(),
        checks: [
          {
            key: 'Jwt.Key',
            status: 'Ready',
            message: 'Chave JWT possui tamanho mínimo.',
            isBlocking: true,
          },
          {
            key: 'Storage.CloudflareR2',
            status: 'Warning',
            message: 'Storage R2 pendente de credenciais reais.',
            isBlocking: false,
          },
        ],
        integrations,
      });
    }

    return mapProductionReadiness(await http<BackendProductionReadinessDto>('/admin/producao/readiness'));
  },

  async listIntegrations(): Promise<IntegrationStatus[]> {
    if (USE_MOCK) return delay(integrations);
    return (await this.getProductionReadiness()).integrations;
  },
};
