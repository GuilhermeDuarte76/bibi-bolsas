import type { AppliedCoupon, Cart, CartItem, ShippingOption } from '@/types';
import { productImage } from '@/lib/images';
import { USE_MOCK } from './config';
import { delay, http } from './http';

/**
 * Frete e cupom SEMPRE sao recalculados no backend (PLANEJAMENTO.md secao 5 e 7).
 * O front so exibe o que a API devolve. Aqui mockamos respostas plausiveis.
 */

const MOCK_COUPONS: Record<string, Omit<AppliedCoupon, 'discountCents'> & { kind: 'percent' | 'fixed'; value: number }> = {
  BEMVINDA10: { code: 'BEMVINDA10', description: '10% na primeira compra', kind: 'percent', value: 10 },
  PIX5: { code: 'PIX5', description: '5% de desconto no Pix', kind: 'percent', value: 5 },
  FRETEGRATIS: { code: 'FRETEGRATIS', description: 'Frete gratis acima de R$ 299', kind: 'fixed', value: 0 },
};

interface BackendCartDto {
  id: number;
  cartSessionId?: string | null;
  status: string;
  items: BackendCartItemDto[];
  totalItems: number;
  subtotal: number;
  totalWithoutShipping: number;
  hasUnavailableItems: boolean;
  hasPriceChanges: boolean;
  expiresAt: string;
  messages: string[];
}

interface BackendCartItemDto {
  id: number;
  productId: number;
  productSlug: string;
  productName: string;
  variantId: number;
  sku: string;
  variantName: string;
  imageUrl?: string | null;
  quantity: number;
  unitPrice: number;
  promotionalPrice?: number | null;
  effectiveUnitPrice: number;
  lineTotal: number;
  isAvailable: boolean;
  availableQuantity: number;
  hasPriceChanged: boolean;
  messages: string[];
}

function toCents(value: number): number {
  return Math.round(Number(value) * 100);
}

function mapBackendCartItem(item: BackendCartItemDto): CartItem {
  const basePriceCents = toCents(item.unitPrice);
  const effectivePriceCents = toCents(item.effectiveUnitPrice);

  return {
    id: String(item.id),
    productId: String(item.productId),
    slug: item.productSlug,
    variantId: String(item.variantId),
    name: item.productName,
    colorName: item.variantName || item.sku,
    image: item.imageUrl || productImage('bolsas', 'terracotta', item.id),
    unitPriceCents: effectivePriceCents,
    compareAtCents: effectivePriceCents < basePriceCents ? basePriceCents : undefined,
    quantity: item.quantity,
    maxStock: Math.max(0, item.availableQuantity),
  };
}

function mapBackendCart(cart: BackendCartDto): Cart {
  const subtotalCents = toCents(cart.subtotal);

  return {
    id: cart.cartSessionId || '',
    backendId: cart.id,
    items: cart.items.map(mapBackendCartItem),
    subtotalCents,
    discountCents: 0,
    shippingCents: 0,
    totalCents: subtotalCents,
  };
}

export const cartService = {
  async getCart(cartSessionId?: string): Promise<Cart> {
    return mapBackendCart(
      await http<BackendCartDto>('/carrinho', {
        query: { cartSessionId },
      }),
    );
  },

  async addItem(input: {
    productVariantId: number;
    quantity: number;
    cartSessionId?: string;
  }): Promise<Cart> {
    return mapBackendCart(
      await http<BackendCartDto>('/carrinho/itens', {
        method: 'POST',
        body: input,
      }),
    );
  },

  async updateItem(input: {
    itemId: number;
    quantity: number;
    cartSessionId?: string;
  }): Promise<Cart> {
    return mapBackendCart(
      await http<BackendCartDto>(`/carrinho/itens/${input.itemId}`, {
        method: 'PUT',
        body: {
          quantity: input.quantity,
          cartSessionId: input.cartSessionId,
        },
      }),
    );
  },

  async removeItem(input: { itemId: number; cartSessionId?: string }): Promise<Cart> {
    return mapBackendCart(
      await http<BackendCartDto>(`/carrinho/itens/${input.itemId}`, {
        method: 'DELETE',
        query: { cartSessionId: input.cartSessionId },
      }),
    );
  },

  async validateCart(cartSessionId?: string): Promise<Cart> {
    return mapBackendCart(
      await http<BackendCartDto>('/carrinho/validar', {
        method: 'POST',
        body: { cartSessionId },
      }),
    );
  },

  async mergeCart(cartSessionId: string): Promise<Cart> {
    return mapBackendCart(
      await http<BackendCartDto>('/carrinho/merge', {
        method: 'POST',
        body: { cartSessionId },
      }),
    );
  },

  /** Cotacao de frete por CEP. Validade curta — deve ser revalidada no checkout. */
  async quoteShipping(zip: string, subtotalCents: number): Promise<ShippingOption[]> {
    const digits = zip.replace(/\D/g, '');
    if (digits.length !== 8) throw new Error('CEP invalido');

    if (USE_MOCK) {
      // Frete gratis acima de R$ 299.
      const freeThreshold = 29900;
      const base: ShippingOption[] = [
        {
          id: 'ship-sedex',
          carrier: 'Correios',
          service: 'SEDEX',
          priceCents: subtotalCents >= freeThreshold ? 0 : 3490,
          etaDays: 3,
          label: subtotalCents >= freeThreshold ? 'SEDEX — gratis (ate 3 dias uteis)' : 'SEDEX — ate 3 dias uteis',
        },
        {
          id: 'ship-pac',
          carrier: 'Correios',
          service: 'PAC',
          priceCents: subtotalCents >= freeThreshold ? 0 : 1990,
          etaDays: 7,
          label: subtotalCents >= freeThreshold ? 'PAC — gratis (ate 7 dias uteis)' : 'PAC — ate 7 dias uteis',
        },
        {
          id: 'ship-exp',
          carrier: 'Jadlog',
          service: 'Expresso',
          priceCents: 4790,
          etaDays: 2,
          label: 'Expresso — ate 2 dias uteis',
        },
      ];
      return delay(base, 600);
    }

    throw new Error('Frete calculado no checkout após escolher um endereço salvo');
  },

  /** Valida e aplica cupom. O desconto final e responsabilidade do backend. */
  async applyCoupon(code: string, subtotalCents: number): Promise<AppliedCoupon> {
    const normalized = code.trim().toUpperCase();

    if (USE_MOCK) {
      const found = MOCK_COUPONS[normalized];
      if (!found) {
        await delay(null, 350);
        throw new Error('Cupom invalido ou expirado');
      }
      if (normalized === 'FRETEGRATIS' && subtotalCents < 29900) {
        await delay(null, 350);
        throw new Error('Cupom valido apenas para compras acima de R$ 299');
      }
      const discountCents =
        found.kind === 'percent' ? Math.round(subtotalCents * (found.value / 100)) : found.value;
      return delay({ code: found.code, description: found.description, discountCents });
    }
    throw new Error('Cupom deve ser aplicado no checkout');
  },
};
