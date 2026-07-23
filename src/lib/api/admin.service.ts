import type {
  Address,
  AdminAlert,
  AdminCatalogCategory,
  AdminCommerceScope,
  AdminCustomerDetail,
  AdminCustomerListItem,
  AdminCouponMetric,
  AdminEmployeePermissionMatrix,
  AdminImageUploadUrl,
  AdminInventoryAdjustmentInput,
  AdminInventoryDetail,
  AdminInventorySummary,
  AdminLowStockItem,
  AdminPermissionDefinition,
  AdminProduct,
  AdminProductCategory,
  AdminProductImageInput,
  AdminProductInput,
  AdminProductImage,
  AdminProductPriceHistory,
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
import { slugify } from '@/lib/utils';

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
  source: string;
  changedByUserId?: number | null;
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

interface BackendSalesReportSummaryDto {
  grossRevenue: number;
  estimatedNetRevenue: number;
  totalOrders: number;
  averageTicket: number;
  itemsSold: number;
  discountTotal: number;
  shippingTotal: number;
  approvedPayments: number;
  failedOrExpiredPayments: number;
  canceledOrders: number;
  refundedOrders: number;
}

interface BackendSalesReportItemDto {
  orderId: number;
  orderNumber: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  customerName: string;
  customerEmailMasked: string;
  couponCode?: string | null;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  total: number;
}

interface BackendSalesReportDto {
  summary: BackendSalesReportSummaryDto;
  items: BackendSalesReportItemDto[];
}

interface BackendReportSkuMetricDto {
  productVariantId: number;
  sku: string;
  variantName: string;
  quantity: number;
  revenue: number;
}

interface BackendMarginSummaryDto {
  isAvailable: boolean;
  message: string;
  estimatedCostTotal?: number | null;
  estimatedMarginTotal?: number | null;
}

interface BackendProductReportDto {
  topProducts: BackendReportProductMetricDto[];
  productsWithoutSales: BackendReportProductMetricDto[];
  topSkus: BackendReportSkuMetricDto[];
  marginSummary: BackendMarginSummaryDto;
}

interface BackendStockMovementReportItemDto {
  id: number;
  productVariantId: number;
  sku: string;
  type: string;
  quantity: number;
  reason?: string | null;
  createdAt: string;
}

interface BackendStockReportDto {
  lowStock: BackendReportStockItemDto[];
  outOfStock: BackendReportStockItemDto[];
  activeReservations: number;
  expiredReservations: number;
  recentMovements: BackendStockMovementReportItemDto[];
}

interface BackendCustomerReportItemDto {
  userId: number;
  name: string;
  emailMasked: string;
  cpfMasked?: string | null;
  phoneMasked?: string | null;
  paidOrders: number;
  totalSpent: number;
  createdAt: string;
}

interface BackendCustomerReportDto {
  newCustomers: number;
  recurringCustomers: number;
  marketingConsentCustomers: number;
  topCustomers: BackendCustomerReportItemDto[];
  birthdays: BackendCustomerReportItemDto[];
}

interface BackendCouponSummaryReportDto {
  coupons: BackendReportCouponMetricDto[];
  totalCoupons: number;
  activeCoupons: number;
  reservedUsages: number;
  consumedUsages: number;
  consumedDiscountTotal: number;
}

interface BackendAbandonedCartItemDto {
  cartId: number;
  userId?: number | null;
  customerName?: string | null;
  customerEmailMasked?: string | null;
  itemsCount: number;
  estimatedTotal: number;
  createdAt: string;
  updatedAt?: string | null;
  expiresAt: string;
}

interface BackendAbandonedCartReportDto {
  totalCount: number;
  items: BackendAbandonedCartItemDto[];
}

interface BackendReportExportDto {
  id: number;
  reportType: string;
  format: string;
  status: string;
  fileName: string;
  contentType: string;
  includeSensitiveData: boolean;
  requestedByUserId: number;
  createdAt: string;
  completedAt?: string | null;
  expiresAt: string;
  errorMessage?: string | null;
}

interface BackendNotificationMessageDto {
  id: number;
  userId?: number | null;
  orderId?: number | null;
  cartId?: number | null;
  type: string;
  channel: string;
  status: string;
  recipientMasked: string;
  subject?: string | null;
  dedupeKey?: string | null;
  scheduledAt: string;
  sentAt?: string | null;
  failedAt?: string | null;
  canceledAt?: string | null;
  attemptCount: number;
  lastError?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

interface BackendNotificationMessageDetailsDto extends BackendNotificationMessageDto {
  body: string;
  payloadJson?: string | null;
}

interface BackendAutomationJobRunDto {
  id: number;
  jobType: string;
  status: string;
  trigger: string;
  triggeredByUserId?: number | null;
  itemsProcessed: number;
  itemsSucceeded: number;
  itemsFailed: number;
  errorMessage?: string | null;
  metadataJson?: string | null;
  startedAt: string;
  finishedAt?: string | null;
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

interface BackendAdminPermissionDefinitionDto {
  key: string;
  area: string;
  action: string;
  description: string;
  defaultForEmployee: boolean;
  isAdminOnly: boolean;
  sortOrder: number;
}

interface BackendEmployeePermissionDto {
  key: string;
  isAllowed: boolean;
  isExplicit: boolean;
  isAdminOnly: boolean;
}

interface BackendEmployeePermissionMatrixDto {
  userId: number;
  name: string;
  email: string;
  isActive: boolean;
  permissions: BackendEmployeePermissionDto[];
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

interface BackendAuditLogDetailsDto extends BackendAuditLogDto {
  oldValueJson?: string | null;
  newValueJson?: string | null;
  userAgent?: string | null;
  correlationId?: string | null;
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

interface BackendCustomerAddressDto {
  id: number;
  customerProfileId: number;
  nickname?: string | null;
  recipientName: string;
  recipientPhoneMasked?: string | null;
  zipCode: string;
  street: string;
  number: string;
  complement?: string | null;
  district: string;
  city: string;
  state: string;
  country: string;
  reference?: string | null;
  type: string;
  isDefault: boolean;
  isActive: boolean;
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

interface BackendCouponUsageDto {
  id: number;
  couponId: number;
  userId: number;
  orderId?: number | null;
  cartId?: number | null;
  status: string;
  subtotal: number;
  discountTotal: number;
  shippingDiscount: number;
  totalAfterDiscount: number;
  reservedAt: string;
  consumedAt?: string | null;
  releasedAt?: string | null;
  expiredAt?: string | null;
  expiresAt: string;
  releaseReason?: string | null;
}

interface BackendCouponReportDto {
  couponId: number;
  code: string;
  reservedCount: number;
  consumedCount: number;
  releasedCount: number;
  discountTotal: number;
  revenueTotal: number;
  averageTicket: number;
}

interface BackendPromotionReportDto {
  promotionId: number;
  name: string;
  status: string;
  isCurrentlyEligibleByDate: boolean;
  message: string;
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

interface BackendSaveCategoryDto {
  name: string;
  slug?: string;
  description?: string;
  parentCategoryId?: number;
  displayOrder: number;
  isActive: boolean;
  seoTitle?: string;
  seoDescription?: string;
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

interface BackendProductPriceHistoryDto {
  id: number;
  productVariantId: number;
  sku: string;
  oldPrice: number;
  newPrice: number;
  oldPromotionalPrice?: number | null;
  newPromotionalPrice?: number | null;
  oldCostPrice?: number | null;
  newCostPrice?: number | null;
  changedByUserId?: number | null;
  changedAt: string;
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

export interface AdminOrderFilters {
  status?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
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

export interface AdminEmployeePermissionUpdateInput {
  allowedPermissionKeys: string[];
  reason: string;
}

export interface AdminUserFilters {
  search?: string;
  role?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface AdminAuditFilters {
  action?: string;
  entityName?: string;
  actorUserId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
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
  scopes?: AdminCouponScopeInput[];
  allowedCustomerUserIds?: string[];
}

export interface AdminPromotionInput {
  name: string;
  description?: string;
  type: string;
  discountValueCents: number;
  minimumOrderValueCents?: number;
  startsAt: string;
  endsAt?: string;
  scopes?: AdminCouponScopeInput[];
}

export type AdminCouponScopeInput = AdminCommerceScope;

export interface AdminCouponUsage {
  id: string;
  couponId: string;
  userId: string;
  orderId?: string;
  cartId?: string;
  status: string;
  subtotalCents: number;
  discountTotalCents: number;
  shippingDiscountCents: number;
  totalAfterDiscountCents: number;
  reservedAt: string;
  consumedAt?: string;
  releasedAt?: string;
  expiredAt?: string;
  expiresAt: string;
  releaseReason?: string;
}

export interface AdminCouponUsageFilters {
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminCouponReport {
  couponId: string;
  code: string;
  reservedCount: number;
  consumedCount: number;
  releasedCount: number;
  discountTotalCents: number;
  revenueTotalCents: number;
  averageTicketCents: number;
}

export interface AdminPromotionReport {
  promotionId: string;
  name: string;
  status: string;
  isCurrentlyEligibleByDate: boolean;
  message: string;
}

export interface AdminCategoryInput {
  name: string;
  slug?: string;
  description?: string;
  parentCategoryId?: string;
  displayOrder: number;
  isActive: boolean;
  seoTitle?: string;
  seoDescription?: string;
}

export type AdminReportType = 'Sales' | 'Products' | 'Stock' | 'Customers' | 'Coupons' | 'AbandonedCarts';
export type AdminReportExportFormat = 'Csv';

export interface AdminReportDateRange {
  startDate?: string;
  endDate?: string;
}

export interface AdminSalesReportFilters extends AdminReportDateRange {
  orderStatus?: string;
  paymentMethod?: string;
  productId?: string;
  categoryId?: string;
  customerId?: string;
  couponCode?: string;
  shippingProvider?: string;
  minValue?: number;
  maxValue?: number;
}

export interface AdminSalesReportSummary {
  grossRevenueCents: number;
  estimatedNetRevenueCents: number;
  totalOrders: number;
  averageTicketCents: number;
  itemsSold: number;
  discountTotalCents: number;
  shippingTotalCents: number;
  approvedPayments: number;
  failedOrExpiredPayments: number;
  canceledOrders: number;
  refundedOrders: number;
}

export interface AdminSalesReportItem {
  orderId: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  customerName: string;
  customerEmailMasked: string;
  couponCode?: string;
  subtotalCents: number;
  discountTotalCents: number;
  shippingTotalCents: number;
  totalCents: number;
}

export interface AdminSalesReport {
  summary: AdminSalesReportSummary;
  items: AdminSalesReportItem[];
}

export interface AdminReportProductMetric {
  productId: string;
  productName: string;
  quantity: number;
  revenueCents: number;
}

export interface AdminReportSkuMetric {
  productVariantId: string;
  sku: string;
  variantName: string;
  quantity: number;
  revenueCents: number;
}

export interface AdminMarginSummary {
  isAvailable: boolean;
  message: string;
  estimatedCostTotalCents?: number;
  estimatedMarginTotalCents?: number;
}

export interface AdminProductReport {
  topProducts: AdminReportProductMetric[];
  productsWithoutSales: AdminReportProductMetric[];
  topSkus: AdminReportSkuMetric[];
  marginSummary: AdminMarginSummary;
}

export interface AdminReportStockItem {
  productVariantId: string;
  sku: string;
  productName: string;
  variantName: string;
  stockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  minimumStock: number;
}

export interface AdminStockMovementReportItem {
  id: string;
  productVariantId: string;
  sku: string;
  type: string;
  quantity: number;
  reason?: string;
  createdAt: string;
}

export interface AdminStockReport {
  lowStock: AdminReportStockItem[];
  outOfStock: AdminReportStockItem[];
  activeReservations: number;
  expiredReservations: number;
  recentMovements: AdminStockMovementReportItem[];
}

export interface AdminCustomerReportItem {
  userId: string;
  name: string;
  emailMasked: string;
  cpfMasked?: string;
  phoneMasked?: string;
  paidOrders: number;
  totalSpentCents: number;
  createdAt: string;
}

export interface AdminCustomerReport {
  newCustomers: number;
  recurringCustomers: number;
  marketingConsentCustomers: number;
  topCustomers: AdminCustomerReportItem[];
  birthdays: AdminCustomerReportItem[];
}

export interface AdminCouponSummaryReport {
  coupons: AdminCouponMetric[];
  totalCoupons: number;
  activeCoupons: number;
  reservedUsages: number;
  consumedUsages: number;
  consumedDiscountTotalCents: number;
}

export interface AdminAbandonedCartItem {
  cartId: string;
  userId?: string;
  customerName?: string;
  customerEmailMasked?: string;
  itemsCount: number;
  estimatedTotalCents: number;
  createdAt: string;
  updatedAt?: string;
  expiresAt: string;
}

export interface AdminAbandonedCartReport {
  totalCount: number;
  items: AdminAbandonedCartItem[];
}

export interface AdminReportExportRequest extends AdminReportDateRange {
  reportType: AdminReportType;
  format: AdminReportExportFormat;
  includeSensitiveData: boolean;
}

export interface AdminReportExport {
  id: string;
  reportType: AdminReportType | string;
  format: AdminReportExportFormat | string;
  status: string;
  fileName: string;
  contentType: string;
  includeSensitiveData: boolean;
  requestedByUserId: string;
  createdAt: string;
  completedAt?: string;
  expiresAt: string;
  errorMessage?: string;
}

export type AdminNotificationStatus = 'Pending' | 'Processing' | 'Sent' | 'Failed' | 'Canceled' | 'Skipped' | string;
export type AdminNotificationType =
  | 'OrderCreated'
  | 'PaymentApproved'
  | 'PaymentFailed'
  | 'OrderStatusChanged'
  | 'AbandonedCartReminder'
  | 'MarketingOffer'
  | 'PasswordReset'
  | 'EmailChange'
  | 'JobFailure'
  | string;
export type AdminNotificationChannel = 'Email' | 'WhatsApp' | 'Telegram' | 'N8n' | string;
export type AdminAutomationJobType =
  | 'ExpireCarts'
  | 'ExpireStockReservations'
  | 'ExpireCouponReservations'
  | 'CleanupReportExports'
  | 'SyncAdminAlerts'
  | 'QueueAbandonedCartReminders'
  | 'DispatchNotifications'
  | 'RunAllMaintenance'
  | string;

export interface AdminNotificationMessage {
  id: string;
  userId?: string;
  orderId?: string;
  cartId?: string;
  type: AdminNotificationType;
  channel: AdminNotificationChannel;
  status: AdminNotificationStatus;
  recipientMasked: string;
  subject?: string;
  dedupeKey?: string;
  scheduledAt: string;
  sentAt?: string;
  failedAt?: string;
  canceledAt?: string;
  attemptCount: number;
  lastError?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminNotificationDetails extends AdminNotificationMessage {
  body: string;
  payloadJson?: string;
}

export interface AdminNotificationFilters {
  status?: string;
  type?: string;
  userId?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminAutomationJobRun {
  id: string;
  jobType: AdminAutomationJobType;
  status: string;
  trigger: string;
  triggeredByUserId?: string;
  itemsProcessed: number;
  itemsSucceeded: number;
  itemsFailed: number;
  errorMessage?: string;
  metadataJson?: string;
  startedAt: string;
  finishedAt?: string;
}

export interface AdminAutomationJobFilters {
  jobType?: string;
  status?: string;
  page?: number;
  pageSize?: number;
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
    source: history.source,
    changedByUserId: history.changedByUserId ? String(history.changedByUserId) : undefined,
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

function mapSalesReport(dto: BackendSalesReportDto): AdminSalesReport {
  return {
    summary: {
      grossRevenueCents: toCents(dto.summary.grossRevenue),
      estimatedNetRevenueCents: toCents(dto.summary.estimatedNetRevenue),
      totalOrders: dto.summary.totalOrders,
      averageTicketCents: toCents(dto.summary.averageTicket),
      itemsSold: dto.summary.itemsSold,
      discountTotalCents: toCents(dto.summary.discountTotal),
      shippingTotalCents: toCents(dto.summary.shippingTotal),
      approvedPayments: dto.summary.approvedPayments,
      failedOrExpiredPayments: dto.summary.failedOrExpiredPayments,
      canceledOrders: dto.summary.canceledOrders,
      refundedOrders: dto.summary.refundedOrders,
    },
    items: dto.items.map((item) => ({
      orderId: String(item.orderId),
      orderNumber: item.orderNumber,
      createdAt: item.createdAt,
      status: item.status,
      paymentStatus: item.paymentStatus,
      paymentMethod: item.paymentMethod,
      customerName: item.customerName,
      customerEmailMasked: item.customerEmailMasked,
      couponCode: item.couponCode ?? undefined,
      subtotalCents: toCents(item.subtotal),
      discountTotalCents: toCents(item.discountTotal),
      shippingTotalCents: toCents(item.shippingTotal),
      totalCents: toCents(item.total),
    })),
  };
}

function mapReportProductMetric(dto: BackendReportProductMetricDto): AdminReportProductMetric {
  return {
    productId: String(dto.productId),
    productName: dto.productName,
    quantity: dto.quantity,
    revenueCents: toCents(dto.revenue),
  };
}

function mapReportSkuMetric(dto: BackendReportSkuMetricDto): AdminReportSkuMetric {
  return {
    productVariantId: String(dto.productVariantId),
    sku: dto.sku,
    variantName: dto.variantName,
    quantity: dto.quantity,
    revenueCents: toCents(dto.revenue),
  };
}

function mapProductReport(dto: BackendProductReportDto): AdminProductReport {
  return {
    topProducts: dto.topProducts.map(mapReportProductMetric),
    productsWithoutSales: dto.productsWithoutSales.map(mapReportProductMetric),
    topSkus: dto.topSkus.map(mapReportSkuMetric),
    marginSummary: {
      isAvailable: dto.marginSummary.isAvailable,
      message: dto.marginSummary.message,
      estimatedCostTotalCents: dto.marginSummary.estimatedCostTotal != null ? toCents(dto.marginSummary.estimatedCostTotal) : undefined,
      estimatedMarginTotalCents: dto.marginSummary.estimatedMarginTotal != null ? toCents(dto.marginSummary.estimatedMarginTotal) : undefined,
    },
  };
}

function mapReportStockItem(dto: BackendReportStockItemDto): AdminReportStockItem {
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

function mapStockMovementReportItem(dto: BackendStockMovementReportItemDto): AdminStockMovementReportItem {
  return {
    id: String(dto.id),
    productVariantId: String(dto.productVariantId),
    sku: dto.sku,
    type: dto.type,
    quantity: dto.quantity,
    reason: dto.reason ?? undefined,
    createdAt: dto.createdAt,
  };
}

function mapStockReport(dto: BackendStockReportDto): AdminStockReport {
  return {
    lowStock: dto.lowStock.map(mapReportStockItem),
    outOfStock: dto.outOfStock.map(mapReportStockItem),
    activeReservations: dto.activeReservations,
    expiredReservations: dto.expiredReservations,
    recentMovements: dto.recentMovements.map(mapStockMovementReportItem),
  };
}

function mapCustomerReportItem(dto: BackendCustomerReportItemDto): AdminCustomerReportItem {
  return {
    userId: String(dto.userId),
    name: dto.name,
    emailMasked: dto.emailMasked,
    cpfMasked: dto.cpfMasked ?? undefined,
    phoneMasked: dto.phoneMasked ?? undefined,
    paidOrders: dto.paidOrders,
    totalSpentCents: toCents(dto.totalSpent),
    createdAt: dto.createdAt,
  };
}

function mapCustomerReport(dto: BackendCustomerReportDto): AdminCustomerReport {
  return {
    newCustomers: dto.newCustomers,
    recurringCustomers: dto.recurringCustomers,
    marketingConsentCustomers: dto.marketingConsentCustomers,
    topCustomers: dto.topCustomers.map(mapCustomerReportItem),
    birthdays: dto.birthdays.map(mapCustomerReportItem),
  };
}

function mapCouponSummaryReport(dto: BackendCouponSummaryReportDto): AdminCouponSummaryReport {
  return {
    coupons: dto.coupons.map(mapCouponMetric),
    totalCoupons: dto.totalCoupons,
    activeCoupons: dto.activeCoupons,
    reservedUsages: dto.reservedUsages,
    consumedUsages: dto.consumedUsages,
    consumedDiscountTotalCents: toCents(dto.consumedDiscountTotal),
  };
}

function mapAbandonedCartReport(dto: BackendAbandonedCartReportDto): AdminAbandonedCartReport {
  return {
    totalCount: dto.totalCount,
    items: dto.items.map((item) => ({
      cartId: String(item.cartId),
      userId: item.userId ? String(item.userId) : undefined,
      customerName: item.customerName ?? undefined,
      customerEmailMasked: item.customerEmailMasked ?? undefined,
      itemsCount: item.itemsCount,
      estimatedTotalCents: toCents(item.estimatedTotal),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt ?? undefined,
      expiresAt: item.expiresAt,
    })),
  };
}

function mapReportExport(dto: BackendReportExportDto): AdminReportExport {
  return {
    id: String(dto.id),
    reportType: dto.reportType,
    format: dto.format,
    status: dto.status,
    fileName: dto.fileName,
    contentType: dto.contentType,
    includeSensitiveData: dto.includeSensitiveData,
    requestedByUserId: String(dto.requestedByUserId),
    createdAt: dto.createdAt,
    completedAt: dto.completedAt ?? undefined,
    expiresAt: dto.expiresAt,
    errorMessage: dto.errorMessage ?? undefined,
  };
}

function mapNotificationMessage(dto: BackendNotificationMessageDto): AdminNotificationMessage {
  return {
    id: String(dto.id),
    userId: dto.userId ? String(dto.userId) : undefined,
    orderId: dto.orderId ? String(dto.orderId) : undefined,
    cartId: dto.cartId ? String(dto.cartId) : undefined,
    type: dto.type,
    channel: dto.channel,
    status: dto.status,
    recipientMasked: dto.recipientMasked,
    subject: dto.subject ?? undefined,
    dedupeKey: dto.dedupeKey ?? undefined,
    scheduledAt: dto.scheduledAt,
    sentAt: dto.sentAt ?? undefined,
    failedAt: dto.failedAt ?? undefined,
    canceledAt: dto.canceledAt ?? undefined,
    attemptCount: dto.attemptCount,
    lastError: dto.lastError ?? undefined,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt ?? undefined,
  };
}

function mapNotificationDetails(dto: BackendNotificationMessageDetailsDto): AdminNotificationDetails {
  return {
    ...mapNotificationMessage(dto),
    body: dto.body,
    payloadJson: dto.payloadJson ?? undefined,
  };
}

function mapAutomationJobRun(dto: BackendAutomationJobRunDto): AdminAutomationJobRun {
  return {
    id: String(dto.id),
    jobType: dto.jobType,
    status: dto.status,
    trigger: dto.trigger,
    triggeredByUserId: dto.triggeredByUserId ? String(dto.triggeredByUserId) : undefined,
    itemsProcessed: dto.itemsProcessed,
    itemsSucceeded: dto.itemsSucceeded,
    itemsFailed: dto.itemsFailed,
    errorMessage: dto.errorMessage ?? undefined,
    metadataJson: dto.metadataJson ?? undefined,
    startedAt: dto.startedAt,
    finishedAt: dto.finishedAt ?? undefined,
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

function mapAdminPermissionDefinition(dto: BackendAdminPermissionDefinitionDto): AdminPermissionDefinition {
  return {
    key: dto.key,
    area: dto.area,
    action: dto.action,
    description: dto.description,
    defaultForEmployee: dto.defaultForEmployee,
    isAdminOnly: dto.isAdminOnly,
    sortOrder: dto.sortOrder,
  };
}

function mapEmployeePermissionMatrix(dto: BackendEmployeePermissionMatrixDto): AdminEmployeePermissionMatrix {
  return {
    userId: String(dto.userId),
    name: dto.name,
    email: dto.email,
    isActive: dto.isActive,
    permissions: dto.permissions.map((permission) => ({
      key: permission.key,
      isAllowed: permission.isAllowed,
      isExplicit: permission.isExplicit,
      isAdminOnly: permission.isAdminOnly,
    })),
  };
}

function mapAuditEntry(dto: BackendAuditLogDto): AuditEntry {
  const actor = dto.actorUserId ? `Usuario #${dto.actorUserId}` : (dto.actorRole || 'Sistema');
  const target = dto.entityId ? `${dto.entityName} #${dto.entityId}` : dto.entityName;
  const metaParts = [dto.reason, dto.ipAddress ? `IP ${dto.ipAddress}` : undefined].filter(Boolean);

  return {
    id: String(dto.id),
    actorUserId: dto.actorUserId ? String(dto.actorUserId) : undefined,
    actorRole: dto.actorRole ?? undefined,
    actor,
    action: dto.action,
    entityName: dto.entityName,
    entityId: dto.entityId ?? undefined,
    target,
    at: dto.createdAt,
    meta: metaParts.join(' · ') || undefined,
    reason: dto.reason ?? undefined,
    ipAddress: dto.ipAddress ?? undefined,
  };
}

function mapAuditEntryDetails(dto: BackendAuditLogDetailsDto): AuditEntry {
  return {
    ...mapAuditEntry(dto),
    oldValueJson: dto.oldValueJson ?? undefined,
    newValueJson: dto.newValueJson ?? undefined,
    userAgent: dto.userAgent ?? undefined,
    correlationId: dto.correlationId ?? undefined,
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

function mapCustomerAddress(dto: BackendCustomerAddressDto): Address {
  return {
    id: String(dto.id),
    label: dto.nickname || dto.type || 'Endereço',
    recipient: dto.recipientName,
    zip: dto.zipCode,
    street: dto.street,
    number: dto.number,
    complement: dto.complement ?? undefined,
    district: dto.district,
    city: dto.city,
    state: dto.state,
    isDefault: dto.isDefault,
  };
}

function mapCommerceScope(dto: BackendCouponScopeDto): AdminCommerceScope {
  return {
    scopeType: dto.scopeType,
    targetId: dto.targetId != null ? String(dto.targetId) : undefined,
    isExcluded: dto.isExcluded,
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
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt ?? undefined,
    scopes: dto.scopes.map(mapCommerceScope),
    allowedCustomerUserIds: dto.allowedCustomerUserIds.map(String),
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
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt ?? undefined,
    scopes: dto.scopes.map(mapCommerceScope),
  };
}

function mapCouponUsage(dto: BackendCouponUsageDto): AdminCouponUsage {
  return {
    id: String(dto.id),
    couponId: String(dto.couponId),
    userId: String(dto.userId),
    orderId: dto.orderId ? String(dto.orderId) : undefined,
    cartId: dto.cartId ? String(dto.cartId) : undefined,
    status: dto.status,
    subtotalCents: toCents(dto.subtotal),
    discountTotalCents: toCents(dto.discountTotal),
    shippingDiscountCents: toCents(dto.shippingDiscount),
    totalAfterDiscountCents: toCents(dto.totalAfterDiscount),
    reservedAt: dto.reservedAt,
    consumedAt: dto.consumedAt ?? undefined,
    releasedAt: dto.releasedAt ?? undefined,
    expiredAt: dto.expiredAt ?? undefined,
    expiresAt: dto.expiresAt,
    releaseReason: dto.releaseReason ?? undefined,
  };
}

function mapCouponReport(dto: BackendCouponReportDto): AdminCouponReport {
  return {
    couponId: String(dto.couponId),
    code: dto.code,
    reservedCount: dto.reservedCount,
    consumedCount: dto.consumedCount,
    releasedCount: dto.releasedCount,
    discountTotalCents: toCents(dto.discountTotal),
    revenueTotalCents: toCents(dto.revenueTotal),
    averageTicketCents: toCents(dto.averageTicket),
  };
}

function mapPromotionReport(dto: BackendPromotionReportDto): AdminPromotionReport {
  return {
    promotionId: String(dto.promotionId),
    name: dto.name,
    status: dto.status,
    isCurrentlyEligibleByDate: dto.isCurrentlyEligibleByDate,
    message: dto.message,
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

function mapProductPriceHistory(dto: BackendProductPriceHistoryDto): AdminProductPriceHistory {
  return {
    id: String(dto.id),
    productVariantId: String(dto.productVariantId),
    sku: dto.sku,
    oldPriceCents: toCents(dto.oldPrice),
    newPriceCents: toCents(dto.newPrice),
    oldPromotionalPriceCents: dto.oldPromotionalPrice != null ? toCents(dto.oldPromotionalPrice) : undefined,
    newPromotionalPriceCents: dto.newPromotionalPrice != null ? toCents(dto.newPromotionalPrice) : undefined,
    oldCostPriceCents: dto.oldCostPrice != null ? toCents(dto.oldCostPrice) : undefined,
    newCostPriceCents: dto.newCostPrice != null ? toCents(dto.newCostPrice) : undefined,
    changedByUserId: dto.changedByUserId ? String(dto.changedByUserId) : undefined,
    changedAt: dto.changedAt,
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

function toCategoryBody(input: AdminCategoryInput): BackendSaveCategoryDto {
  return {
    name: input.name.trim(),
    slug: optionalText(input.slug),
    description: optionalText(input.description),
    parentCategoryId: input.parentCategoryId ? Number(input.parentCategoryId) : undefined,
    displayOrder: input.displayOrder,
    isActive: input.isActive,
    seoTitle: optionalText(input.seoTitle),
    seoDescription: optionalText(input.seoDescription),
  };
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

function toScopeBody(input: AdminCouponScopeInput): BackendCouponScopeDto {
  const targetId = input.targetId ? Number(input.targetId) : undefined;

  return {
    scopeType: input.scopeType,
    targetId: Number.isFinite(targetId) ? targetId : null,
    isExcluded: input.isExcluded,
  };
}

function toScopeBodies(scopes: AdminCouponScopeInput[] | undefined): BackendCouponScopeDto[] {
  if (!scopes?.length) return [{ scopeType: 'Order', targetId: null, isExcluded: false }];
  return scopes.map(toScopeBody);
}

function toAllowedCustomerIds(ids: string[] | undefined): number[] {
  return (ids ?? [])
    .map((id) => Number(id))
    .filter(Number.isFinite);
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
    scopes: toScopeBodies(input.scopes),
    allowedCustomerUserIds: toAllowedCustomerIds(input.allowedCustomerUserIds),
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
    scopes: toScopeBodies(input.scopes),
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

function mockCustomerAddresses(customerId: string): Address[] {
  const customer = mockAdminCustomerDetail(customerId);

  return [
    {
      id: `${customer.id}-addr-1`,
      label: 'Principal',
      recipient: customer.name,
      zip: '01310930',
      street: 'Avenida Paulista',
      number: '1000',
      complement: 'Apto 84',
      district: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      isDefault: true,
    },
    {
      id: `${customer.id}-addr-2`,
      label: 'Trabalho',
      recipient: customer.name,
      zip: '30140071',
      street: 'Rua dos Timbiras',
      number: '560',
      district: 'Funcionários',
      city: 'Belo Horizonte',
      state: 'MG',
      isDefault: false,
    },
  ];
}

let mockCategoryStore: AdminCatalogCategory[] | null = null;

function mockAdminCategories(): AdminCatalogCategory[] {
  if (mockCategoryStore) return mockCategoryStore;

  mockCategoryStore = categories.map((category, index) => ({
    id: String(index + 1),
    name: category.name,
    slug: category.slug,
    description: category.tagline,
    displayOrder: index,
    isActive: true,
    createdAt: new Date(2026, 0, index + 1).toISOString(),
  }));

  return mockCategoryStore;
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
        productVariantId: media.productVariantId,
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

function mockProductPriceHistory(productId: string): AdminProductPriceHistory[] {
  const product = mockAdminProducts().find((item) => item.id === productId) ?? mockAdminProducts()[0];

  return product.variants.slice(0, 6).flatMap((variant, index) => {
    const changedAt = new Date(Date.now() - (index + 1) * 86400000).toISOString();
    const oldPriceCents = variant.priceCents + 1500;

    return [{
      id: `price-${variant.id}-${index}`,
      productVariantId: variant.id,
      sku: variant.sku,
      oldPriceCents,
      newPriceCents: variant.priceCents,
      oldPromotionalPriceCents: variant.promotionalPriceCents ? variant.promotionalPriceCents + 1000 : undefined,
      newPromotionalPriceCents: variant.promotionalPriceCents,
      oldCostPriceCents: variant.costPriceCents ? variant.costPriceCents + 500 : undefined,
      newCostPriceCents: variant.costPriceCents,
      changedByUserId: 'mock-admin',
      changedAt,
    }];
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

function toBackendPaymentMethod(method: PaymentMethod): string {
  if (method === 'credit_card') return 'CreditCard';
  if (method === 'boleto') return 'Boleto';
  return 'Pix';
}

function isRevenueStatus(status: OrderStatus): boolean {
  return status === 'paid' || status === 'processing' || status === 'shipped' || status === 'delivered';
}

function mockSalesReport(filters: AdminSalesReportFilters = {}): AdminSalesReport {
  const filteredOrders = orders.filter((order) => {
    const createdAt = new Date(order.createdAt).getTime();
    const start = filters.startDate ? new Date(filters.startDate).getTime() : undefined;
    const end = filters.endDate ? new Date(filters.endDate).getTime() + 86400000 - 1 : undefined;
    if (start && createdAt < start) return false;
    if (end && createdAt > end) return false;
    if (filters.orderStatus && toBackendOrderStatus(order.status) !== filters.orderStatus) return false;
    if (filters.paymentMethod && toBackendPaymentMethod(order.paymentMethod) !== filters.paymentMethod) return false;
    if (filters.customerId && order.id !== filters.customerId) return false;
    if (filters.couponCode && order.couponCode?.toUpperCase() !== filters.couponCode.toUpperCase()) return false;
    if (filters.minValue != null && order.totalCents < toCents(filters.minValue)) return false;
    if (filters.maxValue != null && order.totalCents > toCents(filters.maxValue)) return false;
    return true;
  });
  const revenueOrders = filteredOrders.filter((order) => isRevenueStatus(order.status));
  const grossRevenueCents = revenueOrders.reduce((sum, order) => sum + order.totalCents, 0);
  const totalOrders = revenueOrders.length;

  return {
    summary: {
      grossRevenueCents,
      estimatedNetRevenueCents: grossRevenueCents,
      totalOrders: filteredOrders.length,
      averageTicketCents: totalOrders ? Math.round(grossRevenueCents / totalOrders) : 0,
      itemsSold: revenueOrders.flatMap((order) => order.items).reduce((sum, item) => sum + item.quantity, 0),
      discountTotalCents: filteredOrders.reduce((sum, order) => sum + order.discountCents, 0),
      shippingTotalCents: filteredOrders.reduce((sum, order) => sum + order.shippingCents, 0),
      approvedPayments: revenueOrders.length,
      failedOrExpiredPayments: filteredOrders.filter((order) => order.status === 'pending_payment' && order.paymentStatus !== 'Approved').length,
      canceledOrders: filteredOrders.filter((order) => order.status === 'canceled').length,
      refundedOrders: filteredOrders.filter((order) => order.status === 'refunded').length,
    },
    items: filteredOrders.map((order) => ({
      orderId: order.id,
      orderNumber: order.number,
      createdAt: order.createdAt,
      status: toBackendOrderStatus(order.status),
      paymentStatus: order.paymentStatus ?? (isRevenueStatus(order.status) ? 'Approved' : 'Pending'),
      paymentMethod: toBackendPaymentMethod(order.paymentMethod),
      customerName: order.shippingAddress.recipient || 'Cliente',
      customerEmailMasked: 'cliente***@email.com',
      couponCode: order.couponCode,
      subtotalCents: order.subtotalCents,
      discountTotalCents: order.discountCents,
      shippingTotalCents: order.shippingCents,
      totalCents: order.totalCents,
    })),
  };
}

function mockProductReport(includeMargin = false): AdminProductReport {
  const adminProducts = mockAdminProducts();
  const topProducts = adminProducts.slice(0, 10).map((product, index) => {
    const quantity = Math.max(0, 14 - index * 2);
    const price = product.variants[0]?.promotionalPriceCents ?? product.variants[0]?.priceCents ?? 0;
    return {
      productId: product.id,
      productName: product.name,
      quantity,
      revenueCents: quantity * price,
    };
  });
  const topSkus = adminProducts.flatMap((product) => product.variants.map((variant) => ({
    productVariantId: variant.id,
    sku: variant.sku,
    variantName: variant.name,
    quantity: Math.max(1, Math.min(12, variant.stockQuantity)),
    revenueCents: Math.max(1, Math.min(12, variant.stockQuantity)) * (variant.promotionalPriceCents ?? variant.priceCents),
  }))).slice(0, 12);

  return {
    topProducts,
    productsWithoutSales: adminProducts.slice(-5).map((product) => ({
      productId: product.id,
      productName: product.name,
      quantity: 0,
      revenueCents: 0,
    })),
    topSkus,
    marginSummary: includeMargin
      ? {
          isAvailable: true,
          message: 'Margem estimada disponível no modo mock.',
          estimatedCostTotalCents: Math.round(topProducts.reduce((sum, item) => sum + item.revenueCents, 0) * 0.58),
          estimatedMarginTotalCents: Math.round(topProducts.reduce((sum, item) => sum + item.revenueCents, 0) * 0.42),
        }
      : {
          isAvailable: false,
          message: 'Margem disponível apenas para admin e SKUs com custo cadastrado.',
        },
  };
}

function mockStockReport(): AdminStockReport {
  const inventory = mockInventorySummaries();

  return {
    lowStock: inventory.filter((item) => item.isLowStock).map((item) => ({
      productVariantId: item.variantId,
      sku: item.sku,
      productName: item.productName,
      variantName: item.variantName,
      stockQuantity: item.stockQuantity,
      reservedQuantity: item.reservedQuantity,
      availableQuantity: item.availableQuantity,
      minimumStock: item.minimumStock,
    })),
    outOfStock: inventory.filter((item) => item.availableQuantity <= 0).map((item) => ({
      productVariantId: item.variantId,
      sku: item.sku,
      productName: item.productName,
      variantName: item.variantName,
      stockQuantity: item.stockQuantity,
      reservedQuantity: item.reservedQuantity,
      availableQuantity: item.availableQuantity,
      minimumStock: item.minimumStock,
    })),
    activeReservations: mockStockReservations(undefined, 'Active').length,
    expiredReservations: mockStockReservations(undefined, 'Expired').length,
    recentMovements: mockStockMovements().slice(0, 12).map((movement) => ({
      id: movement.id,
      productVariantId: movement.variantId,
      sku: movement.sku,
      type: movement.type,
      quantity: movement.quantity,
      reason: movement.reason,
      createdAt: movement.createdAt,
    })),
  };
}

function mockCustomerReport(): AdminCustomerReport {
  const customers = mockAdminCustomers();

  return {
    newCustomers: customers.length,
    recurringCustomers: Math.max(0, customers.length - 1),
    marketingConsentCustomers: customers.filter((customer) => customer.active).length,
    topCustomers: customers.map((customer, index) => ({
      userId: customer.userId,
      name: customer.name,
      emailMasked: customer.email.replace(/^(.{2}).*(@.*)$/, '$1***$2'),
      cpfMasked: customer.cpfMasked,
      phoneMasked: customer.phoneMasked,
      paidOrders: index + 1,
      totalSpentCents: 18990 * (index + 1),
      createdAt: customer.createdAt,
    })),
    birthdays: customers.slice(0, 5).map((customer, index) => ({
      userId: customer.userId,
      name: customer.name,
      emailMasked: customer.email.replace(/^(.{2}).*(@.*)$/, '$1***$2'),
      cpfMasked: customer.cpfMasked,
      phoneMasked: customer.phoneMasked,
      paidOrders: index + 1,
      totalSpentCents: 12990 * (index + 1),
      createdAt: customer.createdAt,
    })),
  };
}

function mockCouponSummaryReport(): AdminCouponSummaryReport {
  const metrics = coupons.map((coupon) => ({
    couponId: coupon.id,
    code: coupon.code,
    status: coupon.status ?? (coupon.active ? 'Active' : 'Inactive'),
    reservedCount: Math.max(0, Math.floor(coupon.usageCount / 2)),
    consumedCount: coupon.usageCount,
    discountTotalCents: coupon.usageCount * 1200,
  }));

  return {
    coupons: metrics,
    totalCoupons: coupons.length,
    activeCoupons: coupons.filter((coupon) => coupon.active).length,
    reservedUsages: metrics.reduce((sum, item) => sum + item.reservedCount, 0),
    consumedUsages: metrics.reduce((sum, item) => sum + item.consumedCount, 0),
    consumedDiscountTotalCents: metrics.reduce((sum, item) => sum + item.discountTotalCents, 0),
  };
}

function normalizedCoupon(coupon: Coupon): Coupon {
  const status = coupon.status ?? (coupon.active ? 'Active' : 'Inactive');

  return {
    ...coupon,
    name: coupon.name ?? coupon.code,
    status,
    active: status === 'Active',
    startsAt: coupon.startsAt ?? new Date(2026, 0, 1).toISOString(),
    createdAt: coupon.createdAt ?? new Date(2026, 0, 1).toISOString(),
    scopes: coupon.scopes?.length ? coupon.scopes : [{ scopeType: 'Order', isExcluded: false }],
    allowedCustomerUserIds: coupon.allowedCustomerUserIds ?? [],
  };
}

function normalizedPromotion(promotion: Promotion): Promotion {
  const status = promotion.status ?? (promotion.active ? 'Active' : 'Inactive');

  return {
    ...promotion,
    status,
    active: status === 'Active',
    createdAt: promotion.createdAt ?? promotion.startsAt,
    scopes: promotion.scopes?.length ? promotion.scopes : [{ scopeType: 'Order', isExcluded: false }],
  };
}

function filterMockCoupons(filters: { search?: string; status?: string } = {}): Coupon[] {
  const search = filters.search?.trim().toLowerCase();

  return coupons.map(normalizedCoupon).filter((coupon) => {
    if (filters.status && coupon.status !== filters.status) return false;
    if (!search) return true;
    return coupon.code.toLowerCase().includes(search) ||
      (coupon.name ?? '').toLowerCase().includes(search) ||
      coupon.description.toLowerCase().includes(search);
  });
}

function filterMockPromotions(filters: { search?: string; status?: string } = {}): Promotion[] {
  const search = filters.search?.trim().toLowerCase();

  return promotions.map(normalizedPromotion).filter((promotion) => {
    if (filters.status && promotion.status !== filters.status) return false;
    if (!search) return true;
    return promotion.name.toLowerCase().includes(search) || (promotion.description ?? '').toLowerCase().includes(search);
  });
}

function mockCouponById(id: string): Coupon {
  const coupon = filterMockCoupons().find((item) => item.id === id);
  if (!coupon) throw new Error('Cupom nao encontrado.');
  return coupon;
}

function mockPromotionById(id: string): Promotion {
  const promotion = filterMockPromotions().find((item) => item.id === id);
  if (!promotion) throw new Error('Promocao nao encontrada.');
  return promotion;
}

function mockCouponFromInput(input: AdminCouponInput, id = `cpn-${Date.now()}`): Coupon {
  const now = new Date().toISOString();

  return {
    id,
    code: input.code.trim().toUpperCase(),
    name: input.name.trim(),
    description: input.description?.trim() || input.name.trim(),
    type: input.type,
    value: input.type === 'Percentage' ? input.discountValueCents : input.discountValueCents,
    active: false,
    status: 'Inactive',
    startsAt: input.startsAt,
    usageCount: 0,
    usageLimit: input.totalUsageLimit,
    usageLimitPerCustomer: input.usageLimitPerCustomer,
    minimumOrderValueCents: input.minimumOrderValueCents,
    maxDiscountValueCents: input.maxDiscountValueCents,
    isFirstPurchaseOnly: input.isFirstPurchaseOnly,
    isPrivate: input.isPrivate,
    canApplyToPromotionalItems: input.canApplyToPromotionalItems,
    expiresAt: input.endsAt,
    createdAt: now,
    updatedAt: now,
    scopes: input.scopes?.length ? input.scopes : [{ scopeType: 'Order', isExcluded: false }],
    allowedCustomerUserIds: input.allowedCustomerUserIds ?? [],
  };
}

function mockPromotionFromInput(input: AdminPromotionInput, id = `promo-${Date.now()}`): Promotion {
  const now = new Date().toISOString();

  return {
    id,
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    discountPct: input.type === 'Percentage' ? input.discountValueCents : 0,
    type: input.type,
    discountValue: input.discountValueCents,
    minimumOrderValueCents: input.minimumOrderValueCents,
    active: false,
    status: 'Inactive',
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    productCount: input.scopes?.length ?? 1,
    createdAt: now,
    updatedAt: now,
    scopes: input.scopes?.length ? input.scopes : [{ scopeType: 'Order', isExcluded: false }],
  };
}

function mockCouponUsages(couponId: string, filters: AdminCouponUsageFilters = {}): AdminCouponUsage[] {
  const coupon = mockCouponById(couponId);
  const base = [
    { status: 'Consumed', offset: 30, orderId: '1042' },
    { status: 'Reserved', offset: 3, cartId: 'cart-219' },
    { status: 'Released', offset: 70, orderId: '1038', releaseReason: 'Carrinho expirado' },
  ];

  return base
    .map((item, index) => {
      const subtotalCents = 18990 + index * 6000;
      const discountTotalCents = coupon.type === 'Percentage'
        ? Math.round(subtotalCents * ((coupon.value || 0) / 100))
        : Math.min(coupon.value || 0, subtotalCents);
      const createdAt = new Date(Date.now() - item.offset * 60000).toISOString();

      return {
        id: `${couponId}-usage-${index + 1}`,
        couponId,
        userId: String(index + 1),
        orderId: item.orderId,
        cartId: item.cartId,
        status: item.status,
        subtotalCents,
        discountTotalCents,
        shippingDiscountCents: coupon.type === 'FreeShipping' ? 2990 : 0,
        totalAfterDiscountCents: Math.max(0, subtotalCents - discountTotalCents),
        reservedAt: createdAt,
        consumedAt: item.status === 'Consumed' ? createdAt : undefined,
        releasedAt: item.status === 'Released' ? createdAt : undefined,
        expiresAt: new Date(Date.now() + 60 * 60000).toISOString(),
        releaseReason: item.releaseReason,
      };
    })
    .filter((usage) => !filters.status || usage.status === filters.status);
}

function mockCouponReport(couponId: string): AdminCouponReport {
  const coupon = mockCouponById(couponId);
  const usages = mockCouponUsages(couponId);
  const consumed = usages.filter((usage) => usage.status === 'Consumed');
  const revenueTotalCents = consumed.reduce((sum, usage) => sum + usage.totalAfterDiscountCents, 0);

  return {
    couponId,
    code: coupon.code,
    reservedCount: usages.filter((usage) => usage.status === 'Reserved').length,
    consumedCount: Math.max(consumed.length, coupon.usageCount),
    releasedCount: usages.filter((usage) => usage.status === 'Released').length,
    discountTotalCents: Math.max(consumed.reduce((sum, usage) => sum + usage.discountTotalCents, 0), coupon.usageCount * 1200),
    revenueTotalCents,
    averageTicketCents: consumed.length ? Math.round(revenueTotalCents / consumed.length) : 0,
  };
}

function mockPromotionReport(promotionId: string): AdminPromotionReport {
  const promotion = mockPromotionById(promotionId);
  const now = Date.now();
  const startsAt = new Date(promotion.startsAt).getTime();
  const endsAt = promotion.endsAt ? new Date(promotion.endsAt).getTime() : undefined;
  const isCurrentlyEligibleByDate = startsAt <= now && (endsAt == null || endsAt >= now);

  return {
    promotionId,
    name: promotion.name,
    status: promotion.status ?? (promotion.active ? 'Active' : 'Inactive'),
    isCurrentlyEligibleByDate,
    message: isCurrentlyEligibleByDate
      ? 'Promoção dentro da janela de validade.'
      : 'Promoção fora da janela de validade.',
  };
}

function mockAbandonedCartReport(olderThanHours = 24): AdminAbandonedCartReport {
  const items = products.slice(0, 4).map((product, index) => ({
    cartId: `mock-cart-${index + 1}`,
    userId: index % 2 === 0 ? `mock-user-${index + 1}` : undefined,
    customerName: index % 2 === 0 ? `Cliente ${index + 1}` : undefined,
    customerEmailMasked: index % 2 === 0 ? `cl***${index + 1}@email.com` : undefined,
    itemsCount: index + 1,
    estimatedTotalCents: product.priceFromCents * (index + 1),
    createdAt: new Date(Date.now() - (olderThanHours + index + 1) * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - (olderThanHours + index) * 3600000).toISOString(),
    expiresAt: new Date(Date.now() + (24 - index) * 3600000).toISOString(),
  }));

  return {
    totalCount: items.length,
    items,
  };
}

const mockReportExports = new Map<string, AdminReportExport>();

function mockReportExport(input: AdminReportExportRequest): AdminReportExport {
  const now = new Date();
  const exportRecord: AdminReportExport = {
    id: String(mockReportExports.size + 1),
    reportType: input.reportType,
    format: input.format,
    status: 'Completed',
    fileName: `${input.reportType.toLowerCase()}-${now.toISOString().replace(/\D/g, '').slice(0, 14)}.csv`,
    contentType: 'text/csv; charset=utf-8',
    includeSensitiveData: input.includeSensitiveData,
    requestedByUserId: 'mock-admin',
    createdAt: now.toISOString(),
    completedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 24 * 3600000).toISOString(),
  };
  mockReportExports.set(exportRecord.id, exportRecord);
  return exportRecord;
}

function mockPermission(
  key: string,
  area: string,
  action: string,
  description: string,
  defaultForEmployee: boolean,
  isAdminOnly: boolean,
  sortOrder: number,
): AdminPermissionDefinition {
  return { key, area, action, description, defaultForEmployee, isAdminOnly, sortOrder };
}

const mockPermissionCatalog: AdminPermissionDefinition[] = [
  mockPermission('Dashboard.View', 'Dashboard', 'Visualizar painel', 'Acesso aos indicadores operacionais.', true, false, 10),
  mockPermission('Orders.View', 'Pedidos', 'Visualizar pedidos', 'Lista, detalhe e histórico de pedidos.', true, false, 100),
  mockPermission('Orders.Payments.View', 'Pedidos', 'Visualizar pagamentos', 'Tentativas e status de pagamento do pedido.', true, false, 110),
  mockPermission('Orders.Status.Update', 'Pedidos', 'Atualizar status', 'Alteração operacional de status com auditoria.', true, false, 120),
  mockPermission('Orders.Cancel', 'Pedidos', 'Cancelar pedido', 'Cancelamento com justificativa e liberação de reservas.', false, false, 130),
  mockPermission('Orders.Shipping.Update', 'Pedidos', 'Atualizar envio', 'Registro e edição de rastreio.', true, false, 140),
  mockPermission('Orders.Fiscal.View', 'Pedidos', 'Visualizar prévia fiscal', 'Prévia impressa e XML de rascunho.', false, false, 150),
  mockPermission('Orders.Webhooks.View', 'Pedidos', 'Visualizar webhooks', 'Eventos técnicos de pagamento.', false, false, 160),
  mockPermission('Catalog.Categories.View', 'Catálogo', 'Visualizar categorias', 'Consulta de categorias administrativas.', true, false, 200),
  mockPermission('Catalog.Categories.Manage', 'Catálogo', 'Gerenciar categorias', 'Criação e edição de categorias.', true, false, 210),
  mockPermission('Catalog.Categories.Archive', 'Catálogo', 'Arquivar categorias', 'Arquivamento lógico de categoria.', false, false, 220),
  mockPermission('Catalog.Products.View', 'Catálogo', 'Visualizar produtos', 'Consulta de produtos e SKUs.', true, false, 230),
  mockPermission('Catalog.Products.Manage', 'Catálogo', 'Gerenciar produtos', 'Criação, edição, status e destaque de produtos.', true, false, 240),
  mockPermission('Catalog.Products.Archive', 'Catálogo', 'Arquivar produtos', 'Arquivamento lógico de produtos.', false, false, 250),
  mockPermission('Catalog.Products.PriceHistory.View', 'Catálogo', 'Histórico de preço', 'Consulta de histórico de preço por SKU.', false, false, 260),
  mockPermission('Catalog.Variants.Manage', 'Catálogo', 'Gerenciar variações', 'Criação, edição e inativação de SKUs.', true, false, 270),
  mockPermission('Catalog.Images.Manage', 'Catálogo', 'Gerenciar imagens', 'Inserção, edição e remoção de imagens.', true, false, 280),
  mockPermission('Catalog.Inventory.View', 'Estoque', 'Visualizar estoque', 'Consulta de saldo, movimentos e reservas.', true, false, 300),
  mockPermission('Catalog.Inventory.Adjust', 'Estoque', 'Ajustar estoque', 'Entradas, saídas e correções auditáveis.', true, false, 310),
  mockPermission('Catalog.Inventory.Reservations.Release', 'Estoque', 'Liberar reservas', 'Liberação manual de reserva de estoque.', true, false, 320),
  mockPermission('Storage.Images.Upload', 'Storage', 'Enviar imagens', 'Geração de URL assinada para upload.', true, false, 330),
  mockPermission('Customers.View', 'Clientes', 'Visualizar clientes', 'Consulta administrativa com dados minimizados.', false, false, 400),
  mockPermission('Customers.Status.Update', 'Clientes', 'Alterar status', 'Ativar ou inativar cliente.', false, false, 410),
  mockPermission('Customers.Anonymize', 'Clientes', 'Anonimizar cliente', 'Ação LGPD sensível e irreversível.', false, false, 420),
  mockPermission('Customers.Addresses.View', 'Clientes', 'Visualizar endereços', 'Consulta de endereços administrativos.', false, false, 430),
  mockPermission('Coupons.View', 'Cupons', 'Visualizar cupons', 'Consulta de cupons e usos.', true, false, 500),
  mockPermission('Coupons.Manage', 'Cupons', 'Gerenciar cupons', 'Criação e edição de cupons.', false, false, 510),
  mockPermission('Coupons.Status.Update', 'Cupons', 'Alterar status', 'Ativar ou inativar cupom.', false, false, 520),
  mockPermission('Coupons.Archive', 'Cupons', 'Arquivar cupom', 'Arquivamento auditável de cupom.', false, false, 530),
  mockPermission('Coupons.Report.View', 'Cupons', 'Visualizar relatório', 'Relatório individual de cupom.', false, false, 540),
  mockPermission('Promotions.View', 'Promoções', 'Visualizar promoções', 'Consulta de campanhas automáticas.', true, false, 600),
  mockPermission('Promotions.Manage', 'Promoções', 'Gerenciar promoções', 'Criação e edição de campanhas.', false, false, 610),
  mockPermission('Promotions.Status.Update', 'Promoções', 'Alterar status', 'Ativar ou inativar campanha.', false, false, 620),
  mockPermission('Promotions.Archive', 'Promoções', 'Arquivar promoção', 'Arquivamento auditável de campanha.', false, false, 630),
  mockPermission('Promotions.Report.View', 'Promoções', 'Visualizar relatório', 'Relatório individual de campanha.', false, false, 640),
  mockPermission('Reports.Sales.View', 'Relatórios', 'Vendas', 'Relatório de vendas.', true, false, 700),
  mockPermission('Reports.Products.View', 'Relatórios', 'Produtos', 'Relatório de produtos.', true, false, 710),
  mockPermission('Reports.Stock.View', 'Relatórios', 'Estoque', 'Relatório de estoque.', true, false, 720),
  mockPermission('Reports.Customers.View', 'Relatórios', 'Clientes', 'Relatório de clientes e recorrência.', false, false, 730),
  mockPermission('Reports.Coupons.View', 'Relatórios', 'Cupons', 'Relatório consolidado de cupons.', true, false, 740),
  mockPermission('Reports.AbandonedCarts.View', 'Relatórios', 'Carrinhos abandonados', 'Relatório de carrinhos abandonados.', true, false, 750),
  mockPermission('Reports.Exports.Manage', 'Relatórios', 'Exportações', 'Criar, consultar e baixar exportações permitidas.', true, false, 760),
  mockPermission('Notifications.View', 'Notificações', 'Visualizar fila', 'Consulta de notificações.', true, false, 800),
  mockPermission('Notifications.Detail.View', 'Notificações', 'Visualizar corpo', 'Detalhe completo da mensagem.', false, false, 810),
  mockPermission('Notifications.Queue', 'Notificações', 'Enfileirar lembretes', 'Criação de lembretes de carrinho abandonado.', false, false, 820),
  mockPermission('Notifications.Dispatch', 'Notificações', 'Despachar mensagens', 'Envio manual da fila pendente.', false, false, 830),
  mockPermission('Alerts.View', 'Alertas', 'Visualizar alertas', 'Consulta de alertas administrativos.', true, false, 900),
  mockPermission('Alerts.Resolve', 'Alertas', 'Resolver/ignorar alertas', 'Fechamento com justificativa.', true, false, 910),
  mockPermission('Automations.View', 'Automações', 'Visualizar jobs', 'Consulta de execuções administrativas.', false, false, 930),
  mockPermission('Automations.Run', 'Automações', 'Executar jobs', 'Execução manual de automações.', false, false, 940),
  mockPermission('Admin.Users.Manage', 'Administração', 'Gerenciar usuários', 'Criação e edição de funcionários.', false, true, 1000),
  mockPermission('Admin.Permissions.Manage', 'Administração', 'Gerenciar permissões', 'Configuração da matriz de acesso.', false, true, 1010),
  mockPermission('Admin.Audit.View', 'Administração', 'Visualizar auditoria', 'Consulta completa da trilha de auditoria.', false, true, 1020),
  mockPermission('Admin.Readiness.View', 'Administração', 'Prontidão de produção', 'Configurações e integrações sensíveis.', false, true, 1030),
];

const mockEmployeePermissionOverrides = new Map<string, Set<string>>();

function isMockEmployee(user: AdminUser): boolean {
  return user.role !== 'Admin' && user.role !== 'Customer' && user.role !== 'owner';
}

function mockAllowedPermissionKeys(userId: string): Set<string> {
  const existing = mockEmployeePermissionOverrides.get(userId);
  if (existing) return new Set(existing);

  const defaults = mockPermissionCatalog
    .filter((permission) => permission.defaultForEmployee && !permission.isAdminOnly)
    .map((permission) => permission.key);

  return new Set(defaults);
}

function mockEmployeePermissionMatrix(userId: string): AdminEmployeePermissionMatrix {
  const user = adminUsers.find((item) => item.id === userId) ?? adminUsers.find(isMockEmployee) ?? adminUsers[0];
  const allowedKeys = mockAllowedPermissionKeys(user.id);
  const explicitKeys = mockEmployeePermissionOverrides.get(user.id);

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    isActive: user.active,
    permissions: mockPermissionCatalog.map((permission) => ({
      key: permission.key,
      isAllowed: permission.isAdminOnly ? false : allowedKeys.has(permission.key),
      isExplicit: explicitKeys?.has(permission.key) ?? false,
      isAdminOnly: permission.isAdminOnly,
    })),
  };
}

function mockEmployeePermissionMatrices(): AdminEmployeePermissionMatrix[] {
  return adminUsers.filter(isMockEmployee).map((user) => mockEmployeePermissionMatrix(user.id));
}

function mockUpdateEmployeePermissions(input: AdminEmployeePermissionUpdateInput, userId: string): AdminEmployeePermissionMatrix {
  const reason = input.reason.trim();
  if (reason.length < 10) {
    throw new Error('Informe uma justificativa com pelo menos 10 caracteres.');
  }

  const allowedKeys = input.allowedPermissionKeys.filter((key) =>
    mockPermissionCatalog.some((permission) => permission.key === key && !permission.isAdminOnly),
  );

  mockEmployeePermissionOverrides.set(userId, new Set(allowedKeys));
  return mockEmployeePermissionMatrix(userId);
}

let mockNotificationStore: AdminNotificationDetails[] | null = null;

function mockNotifications(): AdminNotificationDetails[] {
  if (mockNotificationStore) return mockNotificationStore;

  const now = Date.now();
  mockNotificationStore = [
    {
      id: '1',
      userId: '1',
      orderId: orders[0]?.id,
      type: 'PaymentApproved',
      channel: 'Email',
      status: 'Sent',
      recipientMasked: 'cl***@email.com',
      subject: 'Pagamento aprovado',
      dedupeKey: `payment-approved-${orders[0]?.id ?? '1'}`,
      scheduledAt: new Date(now - 5 * 3600000).toISOString(),
      sentAt: new Date(now - 4 * 3600000).toISOString(),
      attemptCount: 1,
      createdAt: new Date(now - 5 * 3600000).toISOString(),
      body: 'Seu pagamento foi aprovado e o pedido entrou em separacao.',
      payloadJson: JSON.stringify({ orderId: orders[0]?.id ?? '1' }),
    },
    {
      id: '2',
      userId: '2',
      cartId: 'mock-cart-1',
      type: 'AbandonedCartReminder',
      channel: 'Email',
      status: 'Pending',
      recipientMasked: 'ma***@email.com',
      subject: 'Seu carrinho ainda esta reservado',
      dedupeKey: 'abandoned-cart-mock-cart-1',
      scheduledAt: new Date(now + 30 * 60000).toISOString(),
      attemptCount: 0,
      createdAt: new Date(now - 20 * 60000).toISOString(),
      body: 'Lembrete amigavel para recuperar carrinho abandonado com consentimento.',
      payloadJson: JSON.stringify({ cartId: 'mock-cart-1' }),
    },
    {
      id: '3',
      type: 'JobFailure',
      channel: 'Email',
      status: 'Failed',
      recipientMasked: 'ad***@bibibolsas.com',
      subject: 'Falha em job administrativo',
      dedupeKey: 'job-failure-cleanup',
      scheduledAt: new Date(now - 2 * 3600000).toISOString(),
      failedAt: new Date(now - 115 * 60000).toISOString(),
      attemptCount: 2,
      lastError: 'Falha simulada ao comunicar workflow externo.',
      createdAt: new Date(now - 2 * 3600000).toISOString(),
      body: 'O job encontrou uma falha e precisa de verificacao operacional.',
      payloadJson: JSON.stringify({ jobType: 'CleanupReportExports' }),
    },
  ];

  return mockNotificationStore;
}

function filterMockNotifications(filters: AdminNotificationFilters = {}): AdminNotificationDetails[] {
  return mockNotifications().filter((message) => {
    if (filters.status && message.status !== filters.status) return false;
    if (filters.type && message.type !== filters.type) return false;
    if (filters.userId && message.userId !== filters.userId) return false;
    return true;
  });
}

function mockQueueAbandonedCartReminders(olderThanHours: number): number {
  const existing = mockNotifications();
  const report = mockAbandonedCartReport(olderThanHours);
  let queued = 0;

  report.items.forEach((cart) => {
    const dedupeKey = `abandoned-cart-${cart.cartId}`;
    if (existing.some((message) => message.dedupeKey === dedupeKey)) return;

    const now = new Date().toISOString();
    existing.unshift({
      id: String(existing.length + 1),
      userId: cart.userId,
      cartId: cart.cartId,
      type: 'AbandonedCartReminder',
      channel: 'Email',
      status: 'Pending',
      recipientMasked: cart.customerEmailMasked ?? 'visitante',
      subject: 'Seu carrinho ainda esta por aqui',
      dedupeKey,
      scheduledAt: now,
      attemptCount: 0,
      createdAt: now,
      body: 'Lembrete de carrinho abandonado enfileirado pelo painel administrativo.',
      payloadJson: JSON.stringify({ cartId: cart.cartId, olderThanHours }),
    });
    queued += 1;
  });

  return queued;
}

function mockDispatchNotifications(batchSize: number): number {
  const pending = mockNotifications().filter((message) => message.status === 'Pending').slice(0, batchSize);
  const sentAt = new Date().toISOString();

  pending.forEach((message) => {
    message.status = 'Sent';
    message.sentAt = sentAt;
    message.attemptCount += 1;
    message.updatedAt = sentAt;
  });

  return pending.length;
}

let mockAutomationJobRuns: AdminAutomationJobRun[] = [
  {
    id: '1',
    jobType: 'RunAllMaintenance',
    status: 'Completed',
    trigger: 'Scheduled',
    itemsProcessed: 18,
    itemsSucceeded: 18,
    itemsFailed: 0,
    startedAt: new Date(Date.now() - 6 * 3600000).toISOString(),
    finishedAt: new Date(Date.now() - 6 * 3600000 + 45000).toISOString(),
  },
  {
    id: '2',
    jobType: 'DispatchNotifications',
    status: 'Completed',
    trigger: 'Manual',
    triggeredByUserId: 'mock-admin',
    itemsProcessed: 7,
    itemsSucceeded: 6,
    itemsFailed: 1,
    errorMessage: 'Uma notificacao falhou e ficou disponivel para retry.',
    startedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    finishedAt: new Date(Date.now() - 2 * 3600000 + 18000).toISOString(),
  },
];

function filterMockJobRuns(filters: AdminAutomationJobFilters = {}): AdminAutomationJobRun[] {
  return mockAutomationJobRuns.filter((run) => {
    if (filters.jobType && run.jobType !== filters.jobType) return false;
    if (filters.status && run.status !== filters.status) return false;
    return true;
  });
}

function filterMockAudit(filters: AdminAuditFilters = {}): AuditEntry[] {
  const from = filters.from ? new Date(filters.from).getTime() : undefined;
  const to = filters.to ? new Date(filters.to).getTime() + 86400000 - 1 : undefined;

  return auditLog.map((entry) => ({
    ...entry,
    actorRole: entry.actorRole ?? (entry.actor.includes('Sistema') ? 'System' : 'Admin'),
    entityName: entry.entityName ?? entry.target.split(' #')[0],
    entityId: entry.entityId ?? entry.target.match(/#(.+)$/)?.[1],
  })).filter((entry) => {
    const createdAt = new Date(entry.at).getTime();
    if (filters.action && !entry.action.toLowerCase().includes(filters.action.toLowerCase())) return false;
    if (filters.entityName && !(entry.entityName ?? entry.target).toLowerCase().includes(filters.entityName.toLowerCase())) return false;
    if (filters.actorUserId && entry.actorUserId !== filters.actorUserId) return false;
    if (from && createdAt < from) return false;
    if (to && createdAt > to) return false;
    return true;
  });
}

function mockAuditDetail(id: string): AuditEntry {
  const entry = filterMockAudit().find((item) => item.id === id);
  if (!entry) throw new Error('Evento de auditoria nao encontrado.');

  return {
    ...entry,
    oldValueJson: entry.oldValueJson ?? JSON.stringify({ status: 'Antes', mock: true }, null, 2),
    newValueJson: entry.newValueJson ?? JSON.stringify({ status: 'Depois', action: entry.action, mock: true }, null, 2),
    userAgent: entry.userAgent ?? 'Mock Admin Browser',
    correlationId: entry.correlationId ?? `mock-correlation-${entry.id}`,
  };
}

function mockRunAutomationJob(jobType: AdminAutomationJobType): AdminAutomationJobRun {
  const now = new Date();
  const processed = jobType === 'DispatchNotifications' ? mockDispatchNotifications(50) : Math.max(1, mockNotifications().length);
  const run: AdminAutomationJobRun = {
    id: String(mockAutomationJobRuns.length + 1),
    jobType,
    status: 'Completed',
    trigger: 'Manual',
    triggeredByUserId: 'mock-admin',
    itemsProcessed: processed,
    itemsSucceeded: processed,
    itemsFailed: 0,
    metadataJson: JSON.stringify({ mock: true }),
    startedAt: now.toISOString(),
    finishedAt: new Date(now.getTime() + 1200).toISOString(),
  };

  mockAutomationJobRuns = [run, ...mockAutomationJobRuns];
  return run;
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

  async getSalesReport(filters: AdminSalesReportFilters = {}): Promise<AdminSalesReport> {
    if (USE_MOCK) return delay(mockSalesReport(filters));

    return mapSalesReport(
      await http<BackendSalesReportDto>('/admin/relatorios/vendas', {
        query: {
          startDate: filters.startDate,
          endDate: filters.endDate,
          orderStatus: filters.orderStatus,
          paymentMethod: filters.paymentMethod,
          productId: filters.productId ? Number(filters.productId) : undefined,
          categoryId: filters.categoryId ? Number(filters.categoryId) : undefined,
          customerId: filters.customerId ? Number(filters.customerId) : undefined,
          couponCode: filters.couponCode?.trim().toUpperCase(),
          shippingProvider: filters.shippingProvider?.trim(),
          minValue: filters.minValue,
          maxValue: filters.maxValue,
        },
      }),
    );
  },

  async getProductReport(includeMargin = false): Promise<AdminProductReport> {
    if (USE_MOCK) return delay(mockProductReport(includeMargin));

    return mapProductReport(
      await http<BackendProductReportDto>('/admin/relatorios/produtos', {
        query: { includeMargin },
      }),
    );
  },

  async getStockReport(): Promise<AdminStockReport> {
    if (USE_MOCK) return delay(mockStockReport());

    return mapStockReport(await http<BackendStockReportDto>('/admin/relatorios/estoque'));
  },

  async getCustomerReport(filters: AdminReportDateRange = {}): Promise<AdminCustomerReport> {
    if (USE_MOCK) return delay(mockCustomerReport());

    return mapCustomerReport(
      await http<BackendCustomerReportDto>('/admin/relatorios/clientes', {
        query: {
          startDate: filters.startDate,
          endDate: filters.endDate,
        },
      }),
    );
  },

  async getCouponSummaryReport(): Promise<AdminCouponSummaryReport> {
    if (USE_MOCK) return delay(mockCouponSummaryReport());

    return mapCouponSummaryReport(await http<BackendCouponSummaryReportDto>('/admin/relatorios/cupons'));
  },

  async getAbandonedCartReport(olderThanHours = 24): Promise<AdminAbandonedCartReport> {
    if (USE_MOCK) return delay(mockAbandonedCartReport(olderThanHours));

    return mapAbandonedCartReport(
      await http<BackendAbandonedCartReportDto>('/admin/relatorios/carrinhos-abandonados', {
        query: { olderThanHours },
      }),
    );
  },

  async createReportExport(input: AdminReportExportRequest): Promise<AdminReportExport> {
    if (USE_MOCK) return delay(mockReportExport(input));

    return mapReportExport(
      await http<BackendReportExportDto>('/admin/relatorios/exportacoes', {
        method: 'POST',
        body: {
          reportType: input.reportType,
          format: input.format,
          includeSensitiveData: input.includeSensitiveData,
          startDate: input.startDate,
          endDate: input.endDate,
        },
      }),
    );
  },

  async getReportExport(id: string): Promise<AdminReportExport> {
    if (USE_MOCK) {
      const exportRecord = mockReportExports.get(id);
      if (!exportRecord) throw new Error('Exportacao nao encontrada.');
      return delay(exportRecord);
    }

    return mapReportExport(await http<BackendReportExportDto>(`/admin/relatorios/exportacoes/${id}`));
  },

  async downloadReportExport(id: string): Promise<string> {
    if (USE_MOCK) {
      const exportRecord = mockReportExports.get(id);
      if (!exportRecord) throw new Error('Exportacao nao encontrada.');
      return delay(`relatorio;formato;status\n${exportRecord.reportType};${exportRecord.format};${exportRecord.status}\n`);
    }

    return http<string>(`/admin/relatorios/exportacoes/${id}/download`, {
      headers: { Accept: 'text/csv' },
      unwrapEnvelope: false,
    });
  },

  async listNotifications(filters: AdminNotificationFilters = {}): Promise<AdminNotificationMessage[]> {
    if (USE_MOCK) return delay(filterMockNotifications(filters).map(({ body: _body, payloadJson: _payloadJson, ...message }) => message));

    const result = await http<BackendPaged<BackendNotificationMessageDto>>('/admin/notificacoes', {
      query: {
        status: filters.status,
        type: filters.type,
        userId: filters.userId ? Number(filters.userId) : undefined,
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 20,
      },
    });

    return result.items.map(mapNotificationMessage);
  },

  async getNotification(id: string): Promise<AdminNotificationDetails> {
    if (USE_MOCK) {
      const notification = mockNotifications().find((message) => message.id === id);
      if (!notification) throw new Error('Notificacao nao encontrada.');
      return delay(notification);
    }

    return mapNotificationDetails(await http<BackendNotificationMessageDetailsDto>(`/admin/notificacoes/${id}`));
  },

  async queueAbandonedCartReminders(olderThanHours: number): Promise<number> {
    if (USE_MOCK) return delay(mockQueueAbandonedCartReminders(olderThanHours));

    const result = await http<{ queued: number }>('/admin/notificacoes/carrinhos-abandonados/enfileirar', {
      method: 'POST',
      body: { olderThanHours },
    });

    return result.queued;
  },

  async dispatchPendingNotifications(batchSize: number): Promise<number> {
    if (USE_MOCK) return delay(mockDispatchNotifications(batchSize));

    const result = await http<{ sent: number }>('/admin/notificacoes/despachar', {
      method: 'POST',
      body: { batchSize },
    });

    return result.sent;
  },

  async listAutomationJobRuns(filters: AdminAutomationJobFilters = {}): Promise<AdminAutomationJobRun[]> {
    if (USE_MOCK) return delay(filterMockJobRuns(filters));

    const result = await http<BackendPaged<BackendAutomationJobRunDto>>('/admin/jobs/execucoes', {
      query: {
        jobType: filters.jobType,
        status: filters.status,
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 20,
      },
    });

    return result.items.map(mapAutomationJobRun);
  },

  async runAutomationJob(jobType: AdminAutomationJobType): Promise<AdminAutomationJobRun> {
    if (USE_MOCK) return delay(mockRunAutomationJob(jobType));

    return mapAutomationJobRun(
      await http<BackendAutomationJobRunDto>('/admin/jobs/executar', {
        method: 'POST',
        body: { jobType },
      }),
    );
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

  async createAdminCategory(input: AdminCategoryInput): Promise<AdminCatalogCategory> {
    if (USE_MOCK) {
      const store = mockAdminCategories();
      const category: AdminCatalogCategory = {
        id: String(Math.max(0, ...store.map((item) => Number(item.id) || 0)) + 1),
        name: input.name.trim(),
        slug: slugify(input.slug || input.name),
        description: optionalText(input.description),
        parentCategoryId: input.parentCategoryId || undefined,
        displayOrder: input.displayOrder,
        isActive: input.isActive,
        seoTitle: optionalText(input.seoTitle),
        seoDescription: optionalText(input.seoDescription),
        createdAt: new Date().toISOString(),
      };
      store.push(category);
      return delay(category);
    }

    return mapAdminCatalogCategory(
      await http<BackendAdminCategoryDto>('/admin/categorias', {
        method: 'POST',
        body: toCategoryBody(input),
      }),
    );
  },

  async updateAdminCategory(id: string, input: AdminCategoryInput): Promise<AdminCatalogCategory> {
    if (USE_MOCK) {
      const store = mockAdminCategories();
      const index = store.findIndex((category) => category.id === id);
      if (index < 0) throw new Error('Categoria nao encontrada.');

      const updated: AdminCatalogCategory = {
        ...store[index],
        name: input.name.trim(),
        slug: slugify(input.slug || input.name),
        description: optionalText(input.description),
        parentCategoryId: input.parentCategoryId || undefined,
        displayOrder: input.displayOrder,
        isActive: input.isActive,
        seoTitle: optionalText(input.seoTitle),
        seoDescription: optionalText(input.seoDescription),
        updatedAt: new Date().toISOString(),
      };
      store[index] = updated;
      return delay(updated);
    }

    return mapAdminCatalogCategory(
      await http<BackendAdminCategoryDto>(`/admin/categorias/${id}`, {
        method: 'PUT',
        body: toCategoryBody(input),
      }),
    );
  },

  async archiveAdminCategory(id: string): Promise<AdminCatalogCategory> {
    if (USE_MOCK) {
      const store = mockAdminCategories();
      const index = store.findIndex((category) => category.id === id);
      if (index < 0) throw new Error('Categoria nao encontrada.');

      const archived = {
        ...store[index],
        isActive: false,
        updatedAt: new Date().toISOString(),
      };
      store[index] = archived;
      return delay(archived);
    }

    return mapAdminCatalogCategory(
      await http<BackendAdminCategoryDto>(`/admin/categorias/${id}`, {
        method: 'DELETE',
      }),
    );
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

  async listProductPriceHistory(productId: string): Promise<AdminProductPriceHistory[]> {
    if (USE_MOCK) return delay(mockProductPriceHistory(productId));
    return (await http<BackendProductPriceHistoryDto[]>(`/admin/produtos/${productId}/historico-preco`))
      .map(mapProductPriceHistory);
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

  async listOrders(filters: AdminOrderFilters = {}): Promise<Order[]> {
    if (USE_MOCK) {
      const search = filters.search?.trim().toLowerCase();
      const from = filters.from ? new Date(filters.from).getTime() : undefined;
      const to = filters.to ? new Date(filters.to).getTime() + 86400000 - 1 : undefined;

      return delay(orders.filter((order) => {
        const createdAt = new Date(order.createdAt).getTime();
        if (filters.status && order.status !== filters.status) return false;
        if (from && createdAt < from) return false;
        if (to && createdAt > to) return false;
        if (!search) return true;
        return order.number.toLowerCase().includes(search) ||
          order.shippingAddress.recipient.toLowerCase().includes(search) ||
          order.items.some((item) => item.name.toLowerCase().includes(search) || item.sku.toLowerCase().includes(search));
      }));
    }

    const result = await http<BackendPaged<BackendOrderListItemDto>>('/admin/pedidos', {
      query: {
        status: filters.status ? toBackendOrderStatus(filters.status as OrderStatus) : undefined,
        search: filters.search,
        from: filters.from,
        to: filters.to,
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 100,
      },
    });
    return result.items.map(mapListOrder);
  },

  async getOrder(id: string): Promise<Order> {
    if (USE_MOCK) return delay(mockOrderById(id));
    return mapOrderDetails(await http<BackendOrderDetailsDto>(`/admin/pedidos/${id}`));
  },

  async listOrderHistory(id: string): Promise<OrderHistoryEvent[]> {
    if (USE_MOCK) return delay(mockOrderById(id).history ?? []);
    return (await http<BackendOrderHistoryDto[]>(`/admin/pedidos/${id}/historico`)).map(mapOrderHistory);
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
    if (USE_MOCK) return delay(filterMockCoupons(filters));
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

  async getCoupon(id: string): Promise<Coupon> {
    if (USE_MOCK) return delay(mockCouponById(id));
    return mapCoupon(await http<BackendCouponDto>(`/admin/cupons/${id}`));
  },

  async createCoupon(input: AdminCouponInput): Promise<Coupon> {
    if (USE_MOCK) {
      const coupon = mockCouponFromInput(input);
      coupons.unshift(coupon);
      return delay(coupon);
    }

    return mapCoupon(
      await http<BackendCouponDto>('/admin/cupons', {
        method: 'POST',
        body: toCouponBody(input),
      }),
    );
  },

  async updateCoupon(id: string, input: AdminCouponInput): Promise<Coupon> {
    if (USE_MOCK) {
      const index = coupons.findIndex((item) => item.id === id);
      if (index < 0) throw new Error('Cupom nao encontrado.');
      const coupon = {
        ...mockCouponFromInput(input, id),
        active: coupons[index].active,
        status: coupons[index].status ?? (coupons[index].active ? 'Active' : 'Inactive'),
        usageCount: coupons[index].usageCount,
        createdAt: coupons[index].createdAt,
        updatedAt: new Date().toISOString(),
      };
      coupons[index] = coupon;
      return delay(coupon);
    }

    return mapCoupon(
      await http<BackendCouponDto>(`/admin/cupons/${id}`, {
        method: 'PUT',
        body: toCouponBody(input),
      }),
    );
  },

  async updateCouponStatus(id: string, status: 'Active' | 'Inactive', reason: string): Promise<Coupon> {
    if (USE_MOCK) {
      const index = coupons.findIndex((item) => item.id === id);
      const coupon = coupons[index] ?? coupons[0];
      const updated = { ...normalizedCoupon(coupon), active: status === 'Active', status, updatedAt: new Date().toISOString() };
      if (index >= 0) coupons[index] = updated;
      return delay(updated);
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
      const index = coupons.findIndex((item) => item.id === id);
      const coupon = coupons[index] ?? coupons[0];
      const updated = { ...normalizedCoupon(coupon), active: false, status: 'Archived', archivedAt: new Date().toISOString(), archiveReason: reason.trim() };
      if (index >= 0) coupons[index] = updated;
      return delay(updated);
    }

    return mapCoupon(
      await http<BackendCouponDto>(`/admin/cupons/${id}`, {
        method: 'DELETE',
        body: { reason: reason.trim() },
      }),
    );
  },

  async listCouponUsages(id: string, filters: AdminCouponUsageFilters = {}): Promise<AdminCouponUsage[]> {
    if (USE_MOCK) return delay(mockCouponUsages(id, filters));

    const result = await http<BackendPaged<BackendCouponUsageDto>>(`/admin/cupons/${id}/usos`, {
      query: {
        status: filters.status,
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 10,
      },
    });

    return result.items.map(mapCouponUsage);
  },

  async getCouponReport(id: string): Promise<AdminCouponReport> {
    if (USE_MOCK) return delay(mockCouponReport(id));
    return mapCouponReport(await http<BackendCouponReportDto>(`/admin/cupons/${id}/relatorio`));
  },

  async listPromotions(filters: {
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<Promotion[]> {
    if (USE_MOCK) return delay(filterMockPromotions(filters));
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

  async getPromotion(id: string): Promise<Promotion> {
    if (USE_MOCK) return delay(mockPromotionById(id));
    return mapPromotion(await http<BackendPromotionDto>(`/admin/promocoes/${id}`));
  },

  async createPromotion(input: AdminPromotionInput): Promise<Promotion> {
    if (USE_MOCK) {
      const promotion = mockPromotionFromInput(input);
      promotions.unshift(promotion);
      return delay(promotion);
    }

    return mapPromotion(
      await http<BackendPromotionDto>('/admin/promocoes', {
        method: 'POST',
        body: toPromotionBody(input),
      }),
    );
  },

  async updatePromotion(id: string, input: AdminPromotionInput): Promise<Promotion> {
    if (USE_MOCK) {
      const index = promotions.findIndex((item) => item.id === id);
      if (index < 0) throw new Error('Promocao nao encontrada.');
      const promotion = {
        ...mockPromotionFromInput(input, id),
        active: promotions[index].active,
        status: promotions[index].status ?? (promotions[index].active ? 'Active' : 'Inactive'),
        createdAt: promotions[index].createdAt,
        updatedAt: new Date().toISOString(),
      };
      promotions[index] = promotion;
      return delay(promotion);
    }

    return mapPromotion(
      await http<BackendPromotionDto>(`/admin/promocoes/${id}`, {
        method: 'PUT',
        body: toPromotionBody(input),
      }),
    );
  },

  async updatePromotionStatus(id: string, status: 'Active' | 'Inactive', reason: string): Promise<Promotion> {
    if (USE_MOCK) {
      const index = promotions.findIndex((item) => item.id === id);
      const promotion = promotions[index] ?? promotions[0];
      const updated = { ...normalizedPromotion(promotion), active: status === 'Active', status, updatedAt: new Date().toISOString() };
      if (index >= 0) promotions[index] = updated;
      return delay(updated);
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
      const index = promotions.findIndex((item) => item.id === id);
      const promotion = promotions[index] ?? promotions[0];
      const updated = { ...normalizedPromotion(promotion), active: false, status: 'Archived', archivedAt: new Date().toISOString(), archiveReason: reason.trim() };
      if (index >= 0) promotions[index] = updated;
      return delay(updated);
    }

    return mapPromotion(
      await http<BackendPromotionDto>(`/admin/promocoes/${id}`, {
        method: 'DELETE',
        body: { reason: reason.trim() },
      }),
    );
  },

  async getPromotionReport(id: string): Promise<AdminPromotionReport> {
    if (USE_MOCK) return delay(mockPromotionReport(id));
    return mapPromotionReport(await http<BackendPromotionReportDto>(`/admin/promocoes/${id}/relatorio`));
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

  async listCustomerAddresses(id: string): Promise<Address[]> {
    if (USE_MOCK) return delay(mockCustomerAddresses(id));
    return (await http<BackendCustomerAddressDto[]>(`/admin/customers/${id}/enderecos`)).map(mapCustomerAddress);
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

  async listUsers(filters: AdminUserFilters = {}): Promise<AdminUser[]> {
    if (USE_MOCK) {
      const search = filters.search?.trim().toLowerCase();
      return delay(adminUsers.filter((user) => {
        if (filters.role && user.role !== filters.role) return false;
        if (filters.isActive != null && user.active !== filters.isActive) return false;
        if (!search) return true;
        return user.name.toLowerCase().includes(search) || user.email.toLowerCase().includes(search);
      }));
    }

    const result = await http<BackendPaged<BackendAdminUserDto>>('/admin/users', {
      query: {
        search: filters.search,
        role: filters.role,
        isActive: filters.isActive,
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 100,
      },
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

  async listPermissionCatalog(): Promise<AdminPermissionDefinition[]> {
    if (USE_MOCK) return delay(mockPermissionCatalog);

    const result = await http<BackendAdminPermissionDefinitionDto[]>('/admin/permissoes/catalogo');
    return result.map(mapAdminPermissionDefinition);
  },

  async listEmployeePermissionMatrices(): Promise<AdminEmployeePermissionMatrix[]> {
    if (USE_MOCK) return delay(mockEmployeePermissionMatrices());

    const result = await http<BackendEmployeePermissionMatrixDto[]>('/admin/permissoes/funcionarios');
    return result.map(mapEmployeePermissionMatrix);
  },

  async getEmployeePermissionMatrix(userId: string): Promise<AdminEmployeePermissionMatrix> {
    if (USE_MOCK) return delay(mockEmployeePermissionMatrix(userId));

    return mapEmployeePermissionMatrix(
      await http<BackendEmployeePermissionMatrixDto>(`/admin/permissoes/funcionarios/${userId}`),
    );
  },

  async updateEmployeePermissions(
    userId: string,
    input: AdminEmployeePermissionUpdateInput,
  ): Promise<AdminEmployeePermissionMatrix> {
    if (USE_MOCK) return delay(mockUpdateEmployeePermissions(input, userId));

    return mapEmployeePermissionMatrix(
      await http<BackendEmployeePermissionMatrixDto>(`/admin/permissoes/funcionarios/${userId}`, {
        method: 'PUT',
        body: {
          allowedPermissionKeys: input.allowedPermissionKeys,
          reason: input.reason.trim(),
        },
      }),
    );
  },

  async listAudit(filters: AdminAuditFilters = {}): Promise<AuditEntry[]> {
    if (USE_MOCK) return delay(filterMockAudit(filters));

    const result = await http<BackendPaged<BackendAuditLogDto>>('/admin/auditoria', {
      query: {
        action: filters.action,
        entityName: filters.entityName,
        actorUserId: filters.actorUserId ? Number(filters.actorUserId) : undefined,
        from: filters.from,
        to: filters.to,
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 20,
      },
    });
    return result.items.map(mapAuditEntry);
  },

  async getAuditEntry(id: string): Promise<AuditEntry> {
    if (USE_MOCK) return delay(mockAuditDetail(id));
    return mapAuditEntryDetails(await http<BackendAuditLogDetailsDto>(`/admin/auditoria/${id}`));
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
