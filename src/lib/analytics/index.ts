import type {
  CartItem,
  Order,
  OrderItem,
  Product,
  ProductSummary,
  ProductVariant,
} from '@/types';
import {
  ANALYTICS,
  CURRENCY,
  PURCHASE_LOG_STORAGE_KEY,
  hasAnyProvider,
  toCurrency,
} from './config';
import { currentConsent, onConsentChange } from './consent';
import {
  bootstrapConsentMode,
  sendAdsPurchase,
  sendDataLayerEvent,
  sendGoogleEvent,
  sendMetaEvent,
  syncProviders,
} from './providers';

export { useConsent, type ConsentState } from './consent';
export { ANALYTICS } from './config';

/**
 * Camada unica de rastreamento da loja.
 *
 * As telas chamam `analytics.viewItem(...)` e nao sabem qual ferramenta esta
 * ligada. Cada evento e traduzido para:
 *   - GA4 (nomes do catalogo oficial de e-commerce);
 *   - Meta Pixel (evento padrao equivalente);
 *   - dataLayer, para quem preferir montar as tags no GTM.
 *
 * Trocar de ferramenta no futuro e mexer em `providers.ts`, nao nas telas.
 */

interface TrackedItem {
  item_id: string;
  item_name: string;
  item_brand: string;
  price: number;
  quantity: number;
  item_category?: string;
  item_variant?: string;
  item_list_name?: string;
  index?: number;
}

interface MetaEvent {
  name: string;
  params: Record<string, unknown>;
  custom?: boolean;
  eventId?: string;
}

const BRAND = 'Bibi Bolsas';

/* ------------------------------- conversores ------------------------------ */

export function itemFromSummary(
  product: ProductSummary,
  index?: number,
  listName?: string,
): TrackedItem {
  return {
    item_id: product.id,
    item_name: product.name,
    item_brand: BRAND,
    price: toCurrency(product.priceFromCents),
    quantity: 1,
    item_category: product.categorySlug,
    item_list_name: listName,
    index,
  };
}

export function itemFromProduct(
  product: Product,
  variant?: ProductVariant,
  quantity = 1,
): TrackedItem {
  return {
    item_id: product.id,
    item_name: product.name,
    item_brand: BRAND,
    price: toCurrency(variant?.priceCents ?? product.priceFromCents),
    quantity,
    item_category: product.categorySlug,
    item_variant: variant?.sku ?? variant?.name,
  };
}

export function itemFromCart(item: CartItem, quantity = item.quantity): TrackedItem {
  return {
    item_id: item.productId,
    item_name: item.name,
    item_brand: BRAND,
    price: toCurrency(item.unitPriceCents),
    quantity,
    item_variant: item.variantId,
  };
}

export function itemFromOrder(item: OrderItem): TrackedItem {
  return {
    item_id: item.productId,
    item_name: item.name,
    item_brand: BRAND,
    price: toCurrency(item.unitPriceCents),
    quantity: item.quantity,
    item_variant: item.sku,
  };
}

const sumItems = (items: TrackedItem[]): number =>
  Math.round(items.reduce((total, item) => total + item.price * item.quantity, 0) * 100) / 100;

const contentIds = (items: TrackedItem[]): string[] => items.map((item) => item.item_id);

const metaContents = (items: TrackedItem[]) =>
  items.map((item) => ({ id: item.item_id, quantity: item.quantity, item_price: item.price }));

/* -------------------------------- despacho -------------------------------- */

function log(name: string, payload: unknown): void {
  if (!ANALYTICS.debug) return;
  // eslint-disable-next-line no-console
  console.info(`%c[analytics] ${name}`, 'color:#a5603f;font-weight:600', payload);
}

/** Envia um evento para cada destino autorizado pela escolha de cookies. */
function track(
  ga4Name: string,
  ga4Params: Record<string, unknown>,
  meta?: MetaEvent,
): void {
  log(ga4Name, ga4Params);

  const consent = currentConsent();

  if (consent.analytics) {
    sendGoogleEvent(ga4Name, ga4Params);
  }

  if (consent.analytics || consent.marketing) {
    sendDataLayerEvent(ga4Name, ga4Params);
  }

  if (consent.marketing && meta) {
    sendMetaEvent(meta.name, meta.params, meta.custom, meta.eventId);
  }
}

/* ------------------------- page view sem duplicacao ------------------------ */

interface PageViewDelivery {
  key: string;
  params: Record<string, unknown>;
  google: boolean;
  gtm: boolean;
  meta: boolean;
}

let initialized = false;
let currentPageView: PageViewDelivery | undefined;

/**
 * A primeira page_view normalmente acontece antes de a pessoa responder ao
 * banner. Guardamos somente a tela atual e a entregamos quando ela aceitar,
 * sem repetir nos provedores que ja a receberam.
 */
function deliverCurrentPageView(): void {
  if (!currentPageView) return;
  const consent = currentConsent();

  if (consent.analytics) {
    if (!currentPageView.google) {
      currentPageView.google = sendGoogleEvent('page_view', currentPageView.params);
    }
  }

  if (consent.analytics || consent.marketing) {
    if (!currentPageView.gtm) {
      currentPageView.gtm = sendDataLayerEvent('page_view', currentPageView.params);
    }
  }

  if (consent.marketing && !currentPageView.meta) {
    currentPageView.meta = sendMetaEvent('PageView', {});
  }
}

/* ------------------------- deduplicacao de compra ------------------------- */

function alreadyReported(orderId: string): boolean {
  try {
    const raw = localStorage.getItem(PURCHASE_LOG_STORAGE_KEY);
    const reported: string[] = raw ? JSON.parse(raw) : [];
    if (reported.includes(orderId)) return true;
    // Mantem so os ultimos 50: a lista existe para evitar recontagem, nao para virar historico.
    localStorage.setItem(
      PURCHASE_LOG_STORAGE_KEY,
      JSON.stringify([...reported, orderId].slice(-50)),
    );
    return false;
  } catch {
    // Sem storage disponivel, os provedores ainda deduplicam pelo transaction_id/eventID.
    return false;
  }
}

/* ---------------------------------- API ----------------------------------- */

export const analytics = {
  /** Chamado uma vez no boot: prepara o Consent Mode e aplica a decisao salva. */
  init(): void {
    if (initialized) return;
    initialized = true;

    bootstrapConsentMode();
    syncProviders(currentConsent());
    onConsentChange((consent) => {
      syncProviders(consent);
      deliverCurrentPageView();
    });
  },

  pageView(path: string, title: string): void {
    const key = `${path}|${window.location.href}`;
    if (!currentPageView || currentPageView.key !== key) {
      currentPageView = {
        key,
        params: {
          page_path: path,
          page_title: title,
          page_location: window.location.href,
        },
        google: false,
        gtm: false,
        meta: false,
      };
    } else {
      currentPageView.params.page_title = title;
    }

    log('page_view', currentPageView.params);
    deliverCurrentPageView();
  },

  search(term: string): void {
    const searchTerm = term.trim();
    if (!searchTerm) return;
    track(
      'search',
      { search_term: searchTerm },
      { name: 'Search', params: { search_string: searchTerm } },
    );
  },

  viewItemList(listName: string, products: ProductSummary[]): void {
    if (!products.length) return;
    const items = products.map((product, index) => itemFromSummary(product, index, listName));
    track('view_item_list', { item_list_name: listName, items });
  },

  selectItem(listName: string, product: ProductSummary, index?: number): void {
    track('select_item', {
      item_list_name: listName,
      items: [itemFromSummary(product, index, listName)],
    });
  },

  viewItem(product: Product, variant?: ProductVariant): void {
    const item = itemFromProduct(product, variant);
    track(
      'view_item',
      { currency: CURRENCY, value: item.price, items: [item] },
      {
        name: 'ViewContent',
        params: {
          content_type: 'product',
          content_ids: [item.item_id],
          content_name: item.item_name,
          contents: metaContents([item]),
          currency: CURRENCY,
          value: item.price,
        },
      },
    );
  },

  addToCart(product: Product, variant: ProductVariant | undefined, quantity: number): void {
    const item = itemFromProduct(product, variant, quantity);
    const value = Math.round(item.price * quantity * 100) / 100;
    track(
      'add_to_cart',
      { currency: CURRENCY, value, items: [item] },
      {
        name: 'AddToCart',
        params: {
          content_type: 'product',
          content_ids: [item.item_id],
          content_name: item.item_name,
          contents: metaContents([item]),
          currency: CURRENCY,
          value,
        },
      },
    );
  },

  /** Registra somente a diferenca quando a quantidade de uma linha muda. */
  updateCartQuantity(cartItem: CartItem, delta: number): void {
    if (delta === 0) return;
    const item = itemFromCart(cartItem, Math.abs(delta));
    const value = Math.round(item.price * item.quantity * 100) / 100;

    if (delta > 0) {
      track(
        'add_to_cart',
        { currency: CURRENCY, value, items: [item] },
        {
          name: 'AddToCart',
          params: {
            content_type: 'product',
            content_ids: [item.item_id],
            contents: metaContents([item]),
            currency: CURRENCY,
            value,
          },
        },
      );
      return;
    }

    track('remove_from_cart', { currency: CURRENCY, value, items: [item] });
  },

  removeFromCart(cartItem: CartItem): void {
    const item = itemFromCart(cartItem);
    track('remove_from_cart', {
      currency: CURRENCY,
      value: Math.round(item.price * item.quantity * 100) / 100,
      items: [item],
    });
  },

  addToWishlist(product: Product, variant?: ProductVariant): void {
    const item = itemFromProduct(product, variant);
    track(
      'add_to_wishlist',
      { currency: CURRENCY, value: item.price, items: [item] },
      {
        name: 'AddToWishlist',
        params: {
          content_type: 'product',
          content_ids: [item.item_id],
          contents: metaContents([item]),
          currency: CURRENCY,
          value: item.price,
        },
      },
    );
  },

  viewCart(cartItems: CartItem[]): void {
    if (!cartItems.length) return;
    const items = cartItems.map((item) => itemFromCart(item));
    track('view_cart', { currency: CURRENCY, value: sumItems(items), items });
  },

  beginCheckout(cartItems: CartItem[], couponCode?: string): void {
    if (!cartItems.length) return;
    const items = cartItems.map((item) => itemFromCart(item));
    const value = sumItems(items);
    track(
      'begin_checkout',
      { currency: CURRENCY, value, coupon: couponCode, items },
      {
        name: 'InitiateCheckout',
        params: {
          content_ids: contentIds(items),
          contents: metaContents(items),
          num_items: items.reduce((total, item) => total + item.quantity, 0),
          currency: CURRENCY,
          value,
        },
      },
    );
  },

  addShippingInfo(cartItems: CartItem[], shippingTier: string): void {
    const items = cartItems.map((item) => itemFromCart(item));
    if (!items.length) return;
    track('add_shipping_info', {
      currency: CURRENCY,
      value: sumItems(items),
      shipping_tier: shippingTier,
      items,
    });
  },

  addPaymentInfo(cartItems: CartItem[], paymentType: string): void {
    const items = cartItems.map((item) => itemFromCart(item));
    if (!items.length) return;
    const value = sumItems(items);
    track(
      'add_payment_info',
      { currency: CURRENCY, value, payment_type: paymentType, items },
      {
        name: 'AddPaymentInfo',
        params: {
          content_ids: contentIds(items),
          contents: metaContents(items),
          currency: CURRENCY,
          value,
        },
      },
    );
  },

  /**
   * Conversao: aceita somente pedido com pagamento confirmado e dispara uma
   * unica vez por ID, mesmo com StrictMode, polling ou recarga da confirmacao.
   */
  purchase(order: Order): void {
    if (order.status !== 'paid') {
      log('purchase (ignorado: pagamento nao confirmado)', order.id);
      return;
    }

    const consent = currentConsent();
    if (!hasAnyProvider() || (!consent.analytics && !consent.marketing)) {
      log('purchase (ignorado: sem destino autorizado)', order.id);
      return;
    }

    if (alreadyReported(order.id)) {
      log('purchase (ignorado: pedido ja reportado)', order.id);
      return;
    }

    const items = order.items.map(itemFromOrder);
    const transactionId = order.number || order.id;
    // No GA4, `value` exclui frete; o frete segue no campo proprio.
    const merchandiseValue = toCurrency(
      Math.max(0, order.subtotalCents - order.discountCents),
    );
    // Ads e Meta otimizam pela quantia efetivamente paga.
    const paidValue = toCurrency(order.totalCents);

    track(
      'purchase',
      {
        transaction_id: transactionId,
        currency: CURRENCY,
        value: merchandiseValue,
        shipping: toCurrency(order.shippingCents),
        coupon: order.couponCode,
        items,
      },
      {
        name: 'Purchase',
        eventId: `purchase_${order.id}`,
        params: {
          content_type: 'product',
          content_ids: contentIds(items),
          contents: metaContents(items),
          num_items: items.reduce((total, item) => total + item.quantity, 0),
          order_id: transactionId,
          currency: CURRENCY,
          value: paidValue,
        },
      },
    );

    if (consent.marketing) {
      sendAdsPurchase({
        value: paidValue,
        currency: CURRENCY,
        transaction_id: transactionId,
      });
    }
  },

  signUp(method = 'email'): void {
    track('sign_up', { method }, { name: 'CompleteRegistration', params: { status: true } });
  },

  login(method = 'email'): void {
    track('login', { method });
  },
};
