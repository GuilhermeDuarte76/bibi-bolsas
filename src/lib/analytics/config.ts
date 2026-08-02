/**
 * Configuracao de rastreamento.
 *
 * Tudo e opcional e vem do `.env`. Sem ID configurado, o provedor nao carrega
 * script nenhum e os eventos viram no-op — nada de tag fantasma em ambiente de
 * desenvolvimento nem peso extra no bundle de quem nao usa.
 *
 * Ver `docs/tracking.md` para a lista completa de variaveis e eventos.
 */

const env = import.meta.env;

const clean = (value?: string): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export const ANALYTICS = {
  /** Container do Google Tag Manager (GTM-XXXXXXX). */
  gtmId: clean(env.VITE_GTM_ID),

  /** Measurement ID do GA4 (G-XXXXXXXXXX). */
  ga4Id: clean(env.VITE_GA4_ID),

  /** ID de conversao do Google Ads (AW-XXXXXXXXX). */
  googleAdsId: clean(env.VITE_GOOGLE_ADS_ID),

  /** Rotulo da conversao de compra no Google Ads (a parte depois da barra). */
  googleAdsPurchaseLabel: clean(env.VITE_GOOGLE_ADS_PURCHASE_LABEL),

  /** ID do Meta Pixel (somente digitos). */
  metaPixelId: clean(env.VITE_META_PIXEL_ID),

  /** Imprime cada evento no console — util para conferir a instrumentacao. */
  debug: env.VITE_ANALYTICS_DEBUG === 'true',
} as const;

/** Moeda usada em todos os eventos de valor. */
export const CURRENCY = 'BRL';

/** Chave do consentimento no navegador. */
export const CONSENT_STORAGE_KEY = 'bibi.consent.v1';

/** Pedidos ja reportados, para nao contar a mesma compra duas vezes. */
export const PURCHASE_LOG_STORAGE_KEY = 'bibi.analytics.purchases.v1';

export const hasGoogleTag = (): boolean => !!(ANALYTICS.ga4Id || ANALYTICS.googleAdsId);
/** Google direto ou GTM: ambos precisam receber os sinais do Consent Mode. */
export const hasGoogleProvider = (): boolean => !!(ANALYTICS.gtmId || hasGoogleTag());
export const hasAnyProvider = (): boolean =>
  !!(ANALYTICS.gtmId || ANALYTICS.ga4Id || ANALYTICS.googleAdsId || ANALYTICS.metaPixelId);

/** Centavos -> reais, no formato que as plataformas esperam (numero, 2 casas). */
export const toCurrency = (cents: number): number => Math.round(cents) / 100;
