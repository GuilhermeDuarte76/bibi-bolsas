import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppliedCoupon, CartItem, ShippingOption } from '@/types';
import { CART_STORAGE_KEY } from '@/lib/api/config';
import { makeId } from '@/lib/utils';

/**
 * Carrinho persistente (PLANEJAMENTO.md secao 5).
 *
 * Persistido no localStorage para sobreviver a reload e a saida da pagina.
 * Quando o backend existir, sincronizar este estado com /cart (cartId opaco) e
 * mesclar carrinho anonimo ao logar. Os totais sao calculados aqui apenas para
 * exibicao imediata; o backend recalcula preco, desconto e frete na finalizacao.
 */

export interface AddItemInput {
  productId: string;
  slug: string;
  variantId: string;
  name: string;
  colorName: string;
  sizeLabel?: string;
  image: string;
  unitPriceCents: number;
  compareAtCents?: number;
  maxStock: number;
  quantity?: number;
}

interface CartState {
  cartId: string;
  items: CartItem[];
  coupon?: AppliedCoupon;
  shipping?: ShippingOption;
  shippingZip?: string;

  addItem: (input: AddItemInput) => void;
  removeItem: (lineId: string) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  setCoupon: (coupon?: AppliedCoupon) => void;
  setShipping: (shipping?: ShippingOption, zip?: string) => void;
  clear: () => void;

  // Selecionados/derivados
  itemCount: () => number;
  subtotalCents: () => number;
  discountCents: () => number;
  shippingCents: () => number;
  totalCents: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      cartId: makeId('cart'),
      items: [],

      addItem: (input) =>
        set((state) => {
          const qty = input.quantity ?? 1;
          const existing = state.items.find((i) => i.variantId === input.variantId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === input.variantId
                  ? { ...i, quantity: Math.min(i.quantity + qty, i.maxStock) }
                  : i,
              ),
            };
          }
          const item: CartItem = {
            id: makeId('line'),
            productId: input.productId,
            slug: input.slug,
            variantId: input.variantId,
            name: input.name,
            colorName: input.colorName,
            sizeLabel: input.sizeLabel,
            image: input.image,
            unitPriceCents: input.unitPriceCents,
            compareAtCents: input.compareAtCents,
            quantity: Math.min(qty, input.maxStock),
            maxStock: input.maxStock,
          };
          return { items: [...state.items, item] };
        }),

      removeItem: (lineId) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== lineId) })),

      setQuantity: (lineId, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === lineId
              ? { ...i, quantity: Math.max(1, Math.min(quantity, i.maxStock)) }
              : i,
          ),
        })),

      setCoupon: (coupon) => set({ coupon }),
      setShipping: (shipping, zip) => set({ shipping, shippingZip: zip ?? get().shippingZip }),
      clear: () => set({ items: [], coupon: undefined, shipping: undefined, shippingZip: undefined }),

      itemCount: () => get().items.reduce((acc, i) => acc + i.quantity, 0),
      subtotalCents: () => get().items.reduce((acc, i) => acc + i.unitPriceCents * i.quantity, 0),
      discountCents: () => get().coupon?.discountCents ?? 0,
      shippingCents: () => get().shipping?.priceCents ?? 0,
      totalCents: () => {
        const s = get();
        return Math.max(0, s.subtotalCents() - s.discountCents()) + s.shippingCents();
      },
    }),
    {
      name: CART_STORAGE_KEY,
      partialize: (s) => ({
        cartId: s.cartId,
        items: s.items,
        coupon: s.coupon,
        shipping: s.shipping,
        shippingZip: s.shippingZip,
      }),
    },
  ),
);
