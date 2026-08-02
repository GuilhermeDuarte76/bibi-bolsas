import type {
  Address,
  Customer,
  Order,
  OrderHistoryEvent,
  OrderItem,
  OrderStatus,
  PaymentAttempt,
  PaymentMethod,
  PendingReview,
  Review,
} from '@/types';
import { productImage } from '@/lib/images';
import { USE_MOCK } from './config';
import { delay, http } from './http';
import {
  addresses as mockAddresses,
  customer as mockCustomer,
  orders as mockOrders,
  pendingReviews as mockPendingReviews,
} from './mock/account';
import { makeId } from '../utils';

// Estado mutavel em memoria para simular persistencia durante a sessao.
let addressBook = [...mockAddresses];

interface BackendCustomerProfileDto {
  id: number;
  userId: number;
  fullName: string;
  email: string;
  cpfMasked?: string | null;
  phoneMasked?: string | null;
  termsAccepted: boolean;
  marketingAccepted: boolean;
  createdAt: string;
}

interface BackendAddressDto {
  id: number;
  nickname?: string | null;
  recipientName: string;
  zipCode: string;
  street: string;
  number: string;
  complement?: string | null;
  district: string;
  city: string;
  state: string;
  isDefault: boolean;
  createdAt: string;
}

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
  shippingAddress: BackendOrderAddressDto;
  shipping: BackendOrderShippingDto;
  payment: BackendOrderPaymentSummaryDto;
  totals: BackendOrderTotalsDto;
  items: BackendOrderItemDto[];
  history: BackendOrderHistoryDto[];
  canCancel: boolean;
  canRetryPayment: boolean;
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
  zipCode: string;
  street: string;
  number: string;
  complement?: string | null;
  district: string;
  city: string;
  state: string;
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

function onlyDigits(value?: string): string | undefined {
  const digits = value?.replace(/\D/g, '') ?? '';
  return digits || undefined;
}

function toCents(value: number): number {
  return Math.round(Number(value) * 100);
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
  return method?.toLowerCase() === 'pix' ? 'pix' : 'pix';
}

function emptyAddress(orderId: number): Address {
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

function mapBackendProfile(profile: BackendCustomerProfileDto): Customer {
  return {
    id: String(profile.userId),
    name: profile.fullName,
    email: profile.email,
    phone: profile.phoneMasked ?? undefined,
    document: profile.cpfMasked ?? undefined,
    termsAccepted: profile.termsAccepted,
    marketingAccepted: profile.marketingAccepted,
    createdAt: profile.createdAt,
  };
}

function mapBackendAddress(address: BackendAddressDto): Address {
  return {
    id: String(address.id),
    label: address.nickname || 'Endereço',
    recipient: address.recipientName,
    zip: address.zipCode,
    street: address.street,
    number: address.number,
    complement: address.complement ?? undefined,
    district: address.district,
    city: address.city,
    state: address.state,
    isDefault: address.isDefault,
  };
}

function toBackendAddress(address: Omit<Address, 'id' | 'isDefault'> & { id?: string; isDefault?: boolean }) {
  return {
    nickname: address.label,
    recipientName: address.recipient,
    zipCode: onlyDigits(address.zip) ?? '',
    street: address.street,
    number: address.number,
    complement: address.complement || undefined,
    district: address.district,
    city: address.city,
    state: address.state,
    country: 'Brasil',
    type: 'Entrega',
    isDefault: address.isDefault ?? false,
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
    shippingAddress: emptyAddress(dto.id),
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
  const paymentAttempt = mapPaymentAttempt(dto.payment.lastAttempt);

  return {
    id: String(dto.id),
    number: dto.orderNumber,
    status: mapOrderStatus(dto.status, dto.paymentStatus),
    paymentStatus: dto.paymentStatus,
    createdAt: dto.createdAt,
    expiresAt: dto.expiresAt,
    items: dto.items.map(mapOrderItem),
    paymentMethod: mapPaymentMethod(dto.payment.method),
    paymentAttempt,
    shippingAddress: {
      id: String(dto.id),
      label: 'Entrega',
      recipient: dto.shippingAddress.recipientName,
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

/**
 * Preferencias de notificacao.
 * Nomes conforme `GET /api/me/notificacoes/preferencias`; campos ausentes
 * assumem o padrao conservador (so avisos essenciais de pedido).
 */
export interface NotificationPreferences {
  orderUpdates: boolean;
  promotions: boolean;
  abandonedCart: boolean;
}

interface BackendNotificationPreferencesDto {
  orderUpdates?: boolean;
  promotions?: boolean;
  abandonedCart?: boolean;
}

export const accountService = {
  async getCustomer(): Promise<Customer> {
    if (USE_MOCK) return delay(mockCustomer);
    return mapBackendProfile(await http<BackendCustomerProfileDto>('/me/profile'));
  },

  async updateCustomer(patch: Partial<Customer>): Promise<Customer> {
    if (USE_MOCK) return delay({ ...mockCustomer, ...patch });
    return mapBackendProfile(
      await http<BackendCustomerProfileDto>('/me/profile', {
        method: 'PUT',
        body: {
          fullName: patch.name,
          cpf: onlyDigits(patch.document),
          phone: onlyDigits(patch.phone),
          termsAccepted: patch.termsAccepted ?? true,
          marketingAccepted: patch.marketingAccepted,
        },
      }),
    );
  },

  /**
   * Aceite de comunicacoes de marketing (LGPD: consentimento revogavel).
   * Endpoint dedicado — nao exige o perfil completo, entao serve logo apos o
   * cadastro, quando a cliente ainda nao preencheu CPF e telefone.
   */
  async setMarketingConsent(accepted: boolean): Promise<void> {
    if (USE_MOCK) return delay(undefined, 200);
    return http<void>('/me/profile/marketing-consent', {
      method: 'PATCH',
      body: { accepted },
    });
  },

  /** Troca de senha de quem ja esta logada (exige a senha atual). */
  async changePassword(input: { currentPassword: string; newPassword: string }): Promise<void> {
    if (USE_MOCK) return delay(undefined, 600);
    return http<void>('/me/password', {
      method: 'PATCH',
      body: {
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
        confirmPassword: input.newPassword,
      },
    });
  },

  /**
   * Pede a troca de e-mail. O endereco novo so passa a valer depois de
   * confirmado pelo link — senao um erro de digitacao trancaria a conta.
   * Em desenvolvimento o backend devolve `devConfirmationToken`.
   */
  async requestEmailChange(newEmail: string): Promise<{ devConfirmationToken?: string }> {
    if (USE_MOCK) return delay({ devConfirmationToken: 'token-de-desenvolvimento' }, 600);
    return http<{ devConfirmationToken?: string }>('/me/email/change-request', {
      method: 'POST',
      body: { newEmail },
    });
  },

  /** Confirma a troca com o token do e-mail. Publico: o link chega deslogado. */
  async confirmEmailChange(token: string): Promise<void> {
    if (USE_MOCK) return delay(undefined, 600);
    return http<void>('/me/email/confirm', { method: 'POST', auth: false, body: { token } });
  },

  async cancelEmailChange(): Promise<void> {
    if (USE_MOCK) return delay(undefined, 400);
    return http<void>('/me/email/cancel', { method: 'POST' });
  },

  /**
   * Solicitacao de exclusao de dados (LGPD art. 18).
   * Nao apaga na hora: abre um pedido que a loja precisa tratar, porque parte
   * dos dados tem retencao obrigatoria por lei fiscal.
   */
  async requestAccountDeletion(reason?: string): Promise<void> {
    if (USE_MOCK) return delay(undefined, 700);
    return http<void>('/me/profile/delete-request', { method: 'POST', body: { reason } });
  },

  async getNotificationPreferences(): Promise<NotificationPreferences> {
    if (USE_MOCK) {
      return delay({ orderUpdates: true, promotions: true, abandonedCart: true });
    }
    const dto = await http<BackendNotificationPreferencesDto>('/me/notificacoes/preferencias');
    return {
      orderUpdates: dto.orderUpdates ?? true,
      promotions: dto.promotions ?? false,
      abandonedCart: dto.abandonedCart ?? false,
    };
  },

  async updateNotificationPreferences(
    preferences: NotificationPreferences,
  ): Promise<NotificationPreferences> {
    if (USE_MOCK) return delay(preferences, 400);
    const dto = await http<BackendNotificationPreferencesDto>('/me/notificacoes/preferencias', {
      method: 'PUT',
      body: preferences,
    });
    return {
      orderUpdates: dto.orderUpdates ?? preferences.orderUpdates,
      promotions: dto.promotions ?? preferences.promotions,
      abandonedCart: dto.abandonedCart ?? preferences.abandonedCart,
    };
  },

  /** Define o endereco padrao do checkout. */
  async setPrimaryAddress(id: string): Promise<void> {
    if (USE_MOCK) {
      addressBook = addressBook.map((address) => ({ ...address, isDefault: address.id === id }));
      return delay(undefined, 300);
    }
    return http<void>(`/me/enderecos/${id}/principal`, { method: 'PATCH' });
  },

  async listAddresses(): Promise<Address[]> {
    if (USE_MOCK) return delay(addressBook);
    return (await http<BackendAddressDto[]>('/me/enderecos')).map(mapBackendAddress);
  },

  async saveAddress(
    address: Omit<Address, 'id' | 'isDefault'> & { id?: string; isDefault?: boolean },
  ): Promise<Address> {
    if (USE_MOCK) {
      const saved: Address = {
        ...address,
        id: address.id ?? makeId('addr'),
        isDefault: address.isDefault ?? false,
      };
      if (saved.isDefault) addressBook = addressBook.map((a) => ({ ...a, isDefault: false }));
      const idx = addressBook.findIndex((a) => a.id === saved.id);
      if (idx >= 0) addressBook[idx] = saved;
      else addressBook = [...addressBook, saved];
      return delay(saved);
    }
    const id = address.id ? Number(address.id) : undefined;
    const path = id ? `/me/enderecos/${id}` : '/me/enderecos';
    return mapBackendAddress(
      await http<BackendAddressDto>(path, {
        method: id ? 'PUT' : 'POST',
        body: toBackendAddress(address),
      }),
    );
  },

  async deleteAddress(id: string): Promise<void> {
    if (USE_MOCK) {
      addressBook = addressBook.filter((a) => a.id !== id);
      return delay(undefined);
    }
    return http<void>(`/me/enderecos/${id}`, { method: 'DELETE' });
  },

  async listOrders(): Promise<Order[]> {
    if (USE_MOCK) return delay(mockOrders);
    const result = await http<BackendPaged<BackendOrderListItemDto>>('/pedidos', {
      query: { page: 1, pageSize: 50 },
    });
    return result.items.map(mapListOrder);
  },

  async getOrder(id: string): Promise<Order> {
    if (USE_MOCK) {
      const o = mockOrders.find((x) => x.id === id || x.number === id || x.number === `#${id}`);
      if (!o) throw new Error('Pedido nao encontrado');
      return delay(o);
    }
    return mapOrderDetails(await http<BackendOrderDetailsDto>(`/pedidos/${id}`));
  },

  async retryOrderPayment(id: string): Promise<PaymentAttempt> {
    if (USE_MOCK) {
      return delay({
        id: makeId('pay'),
        provider: 'Mock',
        method: 'pix',
        status: 'Pending',
        amountCents: 0,
        createdAt: new Date().toISOString(),
      });
    }

    const attempt = await http<BackendPaymentAttemptDto>(`/pedidos/${id}/pagamentos/tentar-novamente`, {
      method: 'POST',
      body: { paymentMethod: 'Pix' },
    });

    return mapPaymentAttempt(attempt)!;
  },

  async cancelOrder(id: string, reason: string): Promise<Order> {
    if (USE_MOCK) {
      const order = mockOrders.find((x) => x.id === id || x.number === id || x.number === `#${id}`);
      if (!order) throw new Error('Pedido nao encontrado');
      return delay({
        ...order,
        status: 'canceled',
        paymentStatus: 'Canceled',
        canCancel: false,
        canRetryPayment: false,
        history: [
          {
            id: makeId('hist'),
            previousStatus: order.status,
            status: 'Canceled',
            reason,
            createdAt: new Date().toISOString(),
          },
          ...(order.history ?? []),
        ],
      });
    }

    return mapOrderDetails(
      await http<BackendOrderDetailsDto>(`/pedidos/${id}/cancelar`, {
        method: 'POST',
        body: { reason },
      }),
    );
  },

  async listPendingReviews(): Promise<PendingReview[]> {
    if (USE_MOCK) return delay(mockPendingReviews);
    return [];
  },

  async submitReview(input: {
    productId: string;
    rating: number;
    title: string;
    body: string;
  }): Promise<Review> {
    if (USE_MOCK) {
      return delay({
        id: makeId('rev'),
        productId: input.productId,
        productName: '',
        customerName: mockCustomer.name,
        rating: input.rating,
        title: input.title,
        body: input.body,
        createdAt: new Date().toISOString(),
        status: 'pending',
        verifiedPurchase: true,
      });
    }
    // TODO(backend): POST /account/reviews
    return http<Review>('/account/reviews', { method: 'POST', body: input });
  },
};
