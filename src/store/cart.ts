import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppliedCoupon, Cart, CartItem, ShippingOption } from '@/types';
import { cartService } from '@/lib/api/cart.service';
import { CART_SESSION_STORAGE_KEY, CART_STORAGE_KEY, USE_MOCK } from '@/lib/api/config';
import { getAuthTokens } from '@/lib/api/http';
import { makeId } from '@/lib/utils';

/**
 * Carrinho persistente.
 *
 * Em mock, mantem o comportamento local original. Em API real, sincroniza com
 * /api/carrinho usando um cartSessionId anonimo enviado no header/query.
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
  backendCartId?: number;
  items: CartItem[];
  coupon?: AppliedCoupon;
  shipping?: ShippingOption;
  shippingZip?: string;
  syncing: boolean;

  sync: () => Promise<void>;
  addItem: (input: AddItemInput) => Promise<void>;
  removeItem: (lineId: string) => Promise<void>;
  setQuantity: (lineId: string, quantity: number) => Promise<void>;
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

const CART_SESSION_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;
let syncInFlight: Promise<void> | null = null;

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function generateCartSessionId(): string {
  const bytes = new Uint8Array(24);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
    return `cart_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  }

  return `cart_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random()
    .toString(36)
    .slice(2)}`;
}

function normalizeCartSessionId(value?: string): string {
  if (value && CART_SESSION_PATTERN.test(value)) return value;
  const next = generateCartSessionId();
  return CART_SESSION_PATTERN.test(next) ? next : `cart_${next.padEnd(32, '0')}`;
}

function persistCartSessionId(cartId: string): void {
  if (!canUseStorage()) return;
  localStorage.setItem(CART_SESSION_STORAGE_KEY, cartId);
}

function cartSessionIdFromStorage(): string {
  if (!canUseStorage()) return normalizeCartSessionId();
  return normalizeCartSessionId(localStorage.getItem(CART_SESSION_STORAGE_KEY) ?? undefined);
}

function toLocalCartItem(input: AddItemInput, quantity: number): CartItem {
  return {
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
    quantity: Math.min(quantity, input.maxStock),
    maxStock: input.maxStock,
  };
}

function parseBackendId(value: string, label: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`${label} invalido para sincronizacao com o backend.`);
  }
  return id;
}

function applyServerCart(
  cart: Cart,
  set: (partial: Partial<CartState>) => void,
  fallbackCartId: string,
): void {
  const cartId = normalizeCartSessionId(cart.id || fallbackCartId);
  persistCartSessionId(cartId);
  set({
    cartId,
    backendCartId: cart.backendId,
    items: cart.items,
    coupon: undefined,
    shipping: undefined,
    shippingZip: undefined,
  });
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      cartId: cartSessionIdFromStorage(),
      backendCartId: undefined,
      items: [],
      syncing: false,

      sync: async () => {
        if (USE_MOCK) return;
        if (syncInFlight) return syncInFlight;

        syncInFlight = (async () => {
          const cartId = normalizeCartSessionId(get().cartId);
          persistCartSessionId(cartId);
          set({ cartId, syncing: true });

          try {
            const hasSessionToMerge = CART_SESSION_PATTERN.test(cartId);
            const cart =
              getAuthTokens() && hasSessionToMerge
                ? await cartService.mergeCart(cartId)
                : await cartService.getCart(cartId);
            applyServerCart(cart, set, cartId);
          } finally {
            set({ syncing: false });
            syncInFlight = null;
          }
        })();

        return syncInFlight;
      },

      addItem: async (input) => {
        const qty = input.quantity ?? 1;

        if (USE_MOCK) {
          set((state) => {
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

            return { items: [...state.items, toLocalCartItem(input, qty)] };
          });
          return;
        }

        const cartId = normalizeCartSessionId(get().cartId);
        persistCartSessionId(cartId);
        const cart = await cartService.addItem({
          productVariantId: parseBackendId(input.variantId, 'SKU'),
          quantity: qty,
          cartSessionId: cartId,
        });
        applyServerCart(cart, set, cartId);
      },

      removeItem: async (lineId) => {
        if (USE_MOCK) {
          set((state) => ({ items: state.items.filter((i) => i.id !== lineId) }));
          return;
        }

        const cartId = normalizeCartSessionId(get().cartId);
        persistCartSessionId(cartId);
        const cart = await cartService.removeItem({
          itemId: parseBackendId(lineId, 'Item do carrinho'),
          cartSessionId: cartId,
        });
        applyServerCart(cart, set, cartId);
      },

      setQuantity: async (lineId, quantity) => {
        if (quantity <= 0) {
          await get().removeItem(lineId);
          return;
        }

        if (USE_MOCK) {
          set((state) => ({
            items: state.items.map((i) =>
              i.id === lineId
                ? { ...i, quantity: Math.max(1, Math.min(quantity, i.maxStock)) }
                : i,
            ),
          }));
          return;
        }

        const cartId = normalizeCartSessionId(get().cartId);
        persistCartSessionId(cartId);
        const cart = await cartService.updateItem({
          itemId: parseBackendId(lineId, 'Item do carrinho'),
          quantity,
          cartSessionId: cartId,
        });
        applyServerCart(cart, set, cartId);
      },

      setCoupon: (coupon) => set({ coupon }),
      setShipping: (shipping, zip) => set({ shipping, shippingZip: zip ?? get().shippingZip }),
      clear: () =>
        set({
          backendCartId: undefined,
          items: [],
          coupon: undefined,
          shipping: undefined,
          shippingZip: undefined,
        }),

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
        backendCartId: s.backendCartId,
        items: s.items,
        coupon: s.coupon,
        shipping: s.shipping,
        shippingZip: s.shippingZip,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const cartId = normalizeCartSessionId(state.cartId);
        state.cartId = cartId;
        persistCartSessionId(cartId);
      },
    },
  ),
);
