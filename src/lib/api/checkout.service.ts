import type {
  Address,
  Cart,
  Order,
  PaymentMethod,
  ShippingOption,
} from '@/types';
import { USE_MOCK } from './config';
import { delay, http } from './http';
import { makeId } from '../utils';

export interface CheckoutInput {
  cart: Cart;
  cartId?: number;
  address: Address;
  addressId?: number;
  shipping: ShippingOption;
  couponCode?: string;
  paymentMethod: PaymentMethod;
  /** Apenas para cartao — tokenizado pelo provedor no real. */
  installments?: number;
}

export interface CheckoutResult {
  order: Order;
  /** Pix: payload copia-e-cola; cartao: status; boleto: linha digitavel. */
  pixCode?: string;
  pixExpiresInMin?: number;
}

interface BackendCheckoutShippingOptionDto {
  provider: string;
  serviceCode: string;
  serviceName: string;
  price: number;
  estimatedDays: number;
  rawReference?: string | null;
}

interface BackendCheckoutCouponValidationResultDto {
  isValid: boolean;
  message: string;
  couponCode?: string | null;
  discountTotal: number;
  shippingDiscount: number;
  subtotal: number;
  shippingTotal: number;
  total: number;
  affectedItems: string[];
  issues: string[];
}

interface BackendCheckoutResponseDto {
  orderId: number;
  orderNumber: string;
  status: string;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  total: number;
  payment: BackendCheckoutPaymentDto;
  expiresAt: string;
}

interface BackendCheckoutPaymentDto {
  paymentMethod: string;
  status: string;
  provider: string;
  requiresProviderIntegration: boolean;
  expiresAt: string;
  message: string;
}

interface BackendCheckoutStatusDto {
  orderId: number;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  total: number;
  expiresAt: string;
  isExpired: boolean;
}

export interface CheckoutCouponValidationResult {
  isValid: boolean;
  message: string;
  couponCode?: string;
  discountCents: number;
  shippingDiscountCents: number;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  issues: string[];
}

function toCents(value: number): number {
  return Math.round(Number(value) * 100);
}

function toBackendPaymentMethod(method: PaymentMethod): string {
  if (method !== 'pix') {
    throw new Error('Nesta versão, o checkout real aceita pagamento via Pix.');
  }
  return 'Pix';
}

function toFrontendPaymentMethod(method: string): PaymentMethod {
  return method.toLowerCase() === 'pix' ? 'pix' : 'pix';
}

function mapOrderStatus(status: string, paymentStatus?: string): Order['status'] {
  if (paymentStatus === 'Approved' || status === 'Paid') return 'paid';
  if (status === 'Preparing') return 'processing';
  if (status === 'Shipped') return 'shipped';
  if (status === 'Delivered') return 'delivered';
  if (status === 'Canceled') return 'canceled';
  if (status === 'Refunded' || status === 'PartiallyRefunded') return 'refunded';
  return 'pending_payment';
}

function mapShippingOption(option: BackendCheckoutShippingOptionDto): ShippingOption {
  return {
    id: `${option.provider}:${option.serviceCode}:${option.rawReference ?? ''}`,
    carrier: option.provider,
    service: option.serviceName,
    priceCents: toCents(option.price),
    etaDays: option.estimatedDays,
    label: `${option.serviceName} — ate ${option.estimatedDays} dias uteis`,
    provider: option.provider,
    serviceCode: option.serviceCode,
    rawReference: option.rawReference ?? undefined,
  };
}

function toBackendShippingOption(option: ShippingOption): BackendCheckoutShippingOptionDto {
  return {
    provider: option.provider || option.carrier,
    serviceCode: option.serviceCode || option.id,
    serviceName: option.service,
    price: option.priceCents / 100,
    estimatedDays: option.etaDays,
    rawReference: option.rawReference,
  };
}

function mapCouponValidation(result: BackendCheckoutCouponValidationResultDto): CheckoutCouponValidationResult {
  return {
    isValid: result.isValid,
    message: result.message,
    couponCode: result.couponCode ?? undefined,
    discountCents: toCents(result.discountTotal),
    shippingDiscountCents: toCents(result.shippingDiscount),
    subtotalCents: toCents(result.subtotal),
    shippingCents: toCents(result.shippingTotal),
    totalCents: toCents(result.total),
    issues: result.issues,
  };
}

function minutesUntil(value: string): number | undefined {
  const diff = new Date(value).getTime() - Date.now();
  if (!Number.isFinite(diff) || diff <= 0) return undefined;
  return Math.max(1, Math.ceil(diff / 60000));
}

function idempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `checkout_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

function mapCheckoutResponse(input: CheckoutInput, response: BackendCheckoutResponseDto): CheckoutResult {
  const paymentMethod = toFrontendPaymentMethod(response.payment.paymentMethod);
  const order: Order = {
    id: String(response.orderId),
    number: response.orderNumber,
    status: mapOrderStatus(response.status, response.payment.status),
    createdAt: new Date().toISOString(),
    items: input.cart.items.map((i) => ({
      productId: i.productId,
      slug: i.slug,
      name: i.name,
      sku: i.variantId,
      colorName: i.colorName,
      sizeLabel: i.sizeLabel,
      image: i.image,
      unitPriceCents: i.unitPriceCents,
      quantity: i.quantity,
    })),
    paymentMethod,
    shippingAddress: input.address,
    shipping: input.shipping,
    fiscal: { status: 'processing' },
    subtotalCents: toCents(response.subtotal),
    discountCents: toCents(response.discountTotal),
    shippingCents: toCents(response.shippingTotal),
    totalCents: toCents(response.total),
    couponCode: input.couponCode,
  };

  return {
    order,
    pixExpiresInMin: paymentMethod === 'pix' ? minutesUntil(response.payment.expiresAt || response.expiresAt) : undefined,
  };
}

/**
 * Checkout.
 *
 * No backend real (PLANEJAMENTO.md secoes 7 e 15): cria o pedido como
 * `pending_payment`, gera o pagamento no gateway e CONFIRMA apenas via webhook
 * validado. O front nunca confirma pagamento pelo retorno visual.
 */
export const checkoutService = {
  async getShippingOptions(input: { cartId: number; addressId: number }): Promise<ShippingOption[]> {
    if (USE_MOCK) return delay([]);
    return (
      await http<BackendCheckoutShippingOptionDto[]>('/checkout/shipping-options', {
        method: 'POST',
        body: input,
      })
    ).map(mapShippingOption);
  },

  async validateCoupon(input: {
    cartId: number;
    addressId: number;
    couponCode?: string;
    shipping?: ShippingOption | null;
  }): Promise<CheckoutCouponValidationResult> {
    return mapCouponValidation(
      await http<BackendCheckoutCouponValidationResultDto>('/checkout/coupons/validate', {
        method: 'POST',
        body: {
          cartId: input.cartId,
          addressId: input.addressId,
          couponCode: input.couponCode,
          shippingOption: input.shipping ? toBackendShippingOption(input.shipping) : undefined,
        },
      }),
    );
  },

  async createOrder(input: CheckoutInput): Promise<CheckoutResult> {
    if (USE_MOCK) {
      const number = `#${1052 + Math.floor(Math.random() * 40)}`;
      const order: Order = {
        id: makeId('ord'),
        number,
        status: input.paymentMethod === 'pix' ? 'pending_payment' : 'paid',
        createdAt: new Date().toISOString(),
        items: input.cart.items.map((i) => ({
          productId: i.productId,
          slug: i.slug,
          name: i.name,
          sku: i.variantId,
          colorName: i.colorName,
          sizeLabel: i.sizeLabel,
          image: i.image,
          unitPriceCents: i.unitPriceCents,
          quantity: i.quantity,
        })),
        paymentMethod: input.paymentMethod,
        shippingAddress: input.address,
        shipping: input.shipping,
        fiscal: { status: 'processing' },
        subtotalCents: input.cart.subtotalCents,
        discountCents: input.cart.discountCents,
        shippingCents: input.shipping.priceCents,
        totalCents: input.cart.totalCents,
        couponCode: input.cart.coupon?.code,
      };

      return delay(
        {
          order,
          pixCode:
            input.paymentMethod === 'pix'
              ? '00020126580014br.gov.bcb.pix0136bibi-bolsas-demo-pix-copia-e-cola5204000053039865802BR6009SAO PAULO62070503***6304ABCD'
              : undefined,
          pixExpiresInMin: input.paymentMethod === 'pix' ? 30 : undefined,
        },
        900,
      );
    }

    if (!input.cartId || !input.addressId) {
      throw new Error('Carrinho e endereço precisam estar sincronizados antes do checkout.');
    }

    const response = await http<BackendCheckoutResponseDto>('/checkout', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey() },
      body: {
        cartId: input.cartId,
        addressId: input.addressId,
        shippingOption: toBackendShippingOption(input.shipping),
        couponCode: input.couponCode,
        paymentMethod: toBackendPaymentMethod(input.paymentMethod),
      },
    });

    return mapCheckoutResponse(input, response);
  },

  /** Consulta status de pagamento (polling enquanto pendente). */
  async getPaymentStatus(orderId: string): Promise<{ status: Order['status'] }> {
    if (USE_MOCK) return delay({ status: 'paid' }, 1500);
    const status = await http<BackendCheckoutStatusDto>(`/checkout/${orderId}/status`);
    return { status: mapOrderStatus(status.status, status.paymentStatus) };
  },
};
