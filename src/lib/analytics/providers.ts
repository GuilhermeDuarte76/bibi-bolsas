import { ANALYTICS, hasGoogleProvider } from './config';
import type { ConsentState } from './consent';

/**
 * Carregamento dos scripts de terceiros.
 *
 * Regras que valem para todos:
 * - nada carrega antes do consentimento correspondente;
 * - cada script carrega uma unica vez, mesmo com varias mudancas de escolha;
 * - sem ID no `.env`, o provedor nem existe.
 */

/** Forma minima do `fbq` que o snippet do Meta monta antes do script chegar. */
interface FbqShim {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  loaded: boolean;
  version: string;
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    fbq?: FbqShim;
    _fbq?: FbqShim;
  }
}

let googleLoaded = false;
let gtmLoaded = false;
let metaLoaded = false;
let consentModeReady = false;

export function dataLayerPush(payload: Record<string, unknown>): void {
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(payload);
}

/*
 * O gtag.js le o `dataLayer` esperando o objeto `arguments` cru de cada
 * chamada — empurrar um array comum quebra o parser dele. Por isso a funcao e
 * declarada sem parametros e usa `arguments`, como no snippet oficial.
 */
const gtag: (...args: unknown[]) => void = function () {
  window.dataLayer = window.dataLayer ?? [];
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments);
};

function injectScript(src: string, id: string): void {
  if (document.getElementById(id)) return;
  const script = document.createElement('script');
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

/**
 * Consent Mode v2.
 *
 * Precisa rodar ANTES de qualquer script do Google, com tudo negado. Assim,
 * quando algum produto Google for autorizado e carregado, ele ja conhece a
 * escolha granular antes de processar configuracoes ou eventos.
 */
export function bootstrapConsentMode(): void {
  if (consentModeReady || !hasGoogleProvider()) return;
  consentModeReady = true;

  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500,
  });
  gtag('set', 'ads_data_redaction', true);
}

function loadGoogleTag(): void {
  if (googleLoaded) return;
  const primaryId = ANALYTICS.ga4Id ?? ANALYTICS.googleAdsId;
  if (!primaryId) return;
  googleLoaded = true;

  injectScript(`https://www.googletagmanager.com/gtag/js?id=${primaryId}`, 'google-tag');
  gtag('js', new Date());

  if (ANALYTICS.ga4Id) {
    // A troca de rota e enviada manualmente por usePageTracking.
    gtag('config', ANALYTICS.ga4Id, {
      send_page_view: false,
      debug_mode: ANALYTICS.debug,
    });
  }
  if (ANALYTICS.googleAdsId) {
    gtag('config', ANALYTICS.googleAdsId);
  }
}

function loadGtm(): void {
  if (gtmLoaded || !ANALYTICS.gtmId) return;
  gtmLoaded = true;

  dataLayerPush({ 'gtm.start': Date.now(), event: 'gtm.js' });
  injectScript(`https://www.googletagmanager.com/gtm.js?id=${ANALYTICS.gtmId}`, 'gtm');
}

function loadMetaPixel(): void {
  if (metaLoaded || !ANALYTICS.metaPixelId) return;
  metaLoaded = true;

  /*
   * Snippet oficial do Meta, reescrito sem minificacao para ficar auditavel.
   * A fila guarda os eventos disparados antes de o fbevents.js chegar; o
   * proprio script a esvazia ao carregar.
   */
  if (!window.fbq) {
    const shim = ((...args: unknown[]) => {
      if (shim.callMethod) shim.callMethod(...args);
      else shim.queue.push(args);
    }) as FbqShim;

    shim.queue = [];
    shim.loaded = true;
    shim.version = '2.0';

    window.fbq = shim;
    window._fbq = shim;
  }

  injectScript('https://connect.facebook.net/en_US/fbevents.js', 'meta-pixel');
  window.fbq?.('init', ANALYTICS.metaPixelId);
}

/**
 * Aplica a escolha da pessoa: atualiza o Consent Mode e carrega apenas o que
 * ela autorizou. Chamada no boot (com a decisao salva) e a cada mudanca.
 */
export function syncProviders(consent: ConsentState): void {
  if (hasGoogleProvider()) {
    gtag('consent', 'update', {
      analytics_storage: consent.analytics ? 'granted' : 'denied',
      ad_storage: consent.marketing ? 'granted' : 'denied',
      ad_user_data: consent.marketing ? 'granted' : 'denied',
      ad_personalization: consent.marketing ? 'granted' : 'denied',
    });
  }

  if (consent.analytics || consent.marketing) {
    loadGoogleTag();
    loadGtm();
  }
  if (consent.marketing) {
    loadMetaPixel();
  }

  // O script nao pode ser descarregado depois de aceito, mas o Pixel oferece
  // revoke/grant para interromper e retomar a coleta quando a escolha muda.
  if (metaLoaded) {
    window.fbq?.('consent', consent.marketing ? 'grant' : 'revoke');
  }
}

/** Envia eventos de comportamento ao GA4. Google Ads recebe so a conversao dedicada. */
export function sendGoogleEvent(name: string, params: Record<string, unknown>): boolean {
  if (!googleLoaded || !ANALYTICS.ga4Id) return false;
  gtag('event', name, params);
  return true;
}

/**
 * Publica o evento no formato recomendado de ecommerce do GTM.
 * Eventos com `items` ficam dentro de `ecommerce`; os demais seguem no topo.
 */
export function sendDataLayerEvent(name: string, params: Record<string, unknown>): boolean {
  if (!gtmLoaded || !ANALYTICS.gtmId) return false;

  if (Array.isArray(params.items)) {
    dataLayerPush({ ecommerce: null });
    dataLayerPush({ event: name, ecommerce: params });
  } else {
    dataLayerPush({ event: name, ...params });
  }

  return true;
}

/** Envia para o Meta Pixel. `custom` para eventos fora do catalogo padrao. */
export function sendMetaEvent(
  name: string,
  params: Record<string, unknown>,
  custom = false,
  eventId?: string,
): boolean {
  if (!metaLoaded) return false;
  window.fbq?.(
    custom ? 'trackCustom' : 'track',
    name,
    params,
    ...(eventId ? [{ eventID: eventId }] : []),
  );
  return true;
}

/** Conversao de compra do Google Ads, quando houver rotulo configurado. */
export function sendAdsPurchase(params: {
  value: number;
  currency: string;
  transaction_id: string;
}): boolean {
  if (!googleLoaded || !ANALYTICS.googleAdsId || !ANALYTICS.googleAdsPurchaseLabel) return false;
  gtag('event', 'conversion', {
    send_to: `${ANALYTICS.googleAdsId}/${ANALYTICS.googleAdsPurchaseLabel}`,
    ...params,
  });
  return true;
}
