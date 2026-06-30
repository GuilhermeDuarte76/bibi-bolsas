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
  address: Address;
  shipping: ShippingOption;
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

/**
 * Checkout.
 *
 * No backend real (PLANEJAMENTO.md secoes 7 e 15): cria o pedido como
 * `pending_payment`, gera o pagamento no gateway e CONFIRMA apenas via webhook
 * validado. O front nunca confirma pagamento pelo retorno visual.
 */
export const checkoutService = {
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
    // TODO(backend): POST /checkout — cria pedido pending_payment + pagamento no gateway
    return http<CheckoutResult>('/checkout', { method: 'POST', body: input });
  },

  /** Consulta status de pagamento (polling enquanto pendente). */
  async getPaymentStatus(orderId: string): Promise<{ status: Order['status'] }> {
    if (USE_MOCK) return delay({ status: 'paid' }, 1500);
    // TODO(backend): GET /checkout/{orderId}/status
    return http(`/checkout/${orderId}/status`);
  },
};
