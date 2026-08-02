import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CONSENT_STORAGE_KEY } from './config';

/**
 * Consentimento de cookies.
 *
 * A LGPD (Lei 13.709/2018) trata cookie de analise e de publicidade como dado
 * pessoal: precisa de consentimento previo, granular e revogavel. Por isso o
 * padrao aqui e NEGADO — nenhum script de terceiro carrega antes do aceite, e
 * a pessoa pode mudar de ideia a qualquer momento pelo rodape.
 *
 * `necessary` existe para deixar explicito na interface o que a loja usa sem
 * consentimento (sessao, carrinho, seguranca) — isso nao e rastreamento e nao
 * pode ser desligado, senao a loja para de funcionar.
 */

export interface ConsentState {
  /** Sessao, carrinho, preferencias. Sempre ativo. */
  necessary: true;
  /** GA4, GTM em modo analise. */
  analytics: boolean;
  /** Meta Pixel, Google Ads, remarketing. */
  marketing: boolean;
}

export const DENIED: ConsentState = { necessary: true, analytics: false, marketing: false };
export const GRANTED: ConsentState = { necessary: true, analytics: true, marketing: true };

interface ConsentStore {
  consent: ConsentState;
  /** null enquanto a pessoa nao respondeu — o banner so aparece nesse caso. */
  decidedAt: string | null;
  /** Abre o painel de preferencias a partir do rodape. */
  preferencesOpen: boolean;

  decide: (consent: ConsentState) => void;
  acceptAll: () => void;
  rejectAll: () => void;
  openPreferences: () => void;
  closePreferences: () => void;
}

type ConsentListener = (consent: ConsentState) => void;
const listeners = new Set<ConsentListener>();

/** Notifica os provedores quando o consentimento muda. */
export function onConsentChange(listener: ConsentListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(consent: ConsentState) {
  listeners.forEach((listener) => listener(consent));
}

export const useConsent = create<ConsentStore>()(
  persist(
    (set) => ({
      consent: DENIED,
      decidedAt: null,
      preferencesOpen: false,

      decide: (consent) => {
        set({ consent, decidedAt: new Date().toISOString(), preferencesOpen: false });
        notify(consent);
      },
      acceptAll: () => {
        set({ consent: GRANTED, decidedAt: new Date().toISOString(), preferencesOpen: false });
        notify(GRANTED);
      },
      rejectAll: () => {
        set({ consent: DENIED, decidedAt: new Date().toISOString(), preferencesOpen: false });
        notify(DENIED);
      },
      openPreferences: () => set({ preferencesOpen: true }),
      closePreferences: () => set({ preferencesOpen: false }),
    }),
    {
      name: CONSENT_STORAGE_KEY,
      partialize: (state) => ({ consent: state.consent, decidedAt: state.decidedAt }),
      // Ao recarregar a pagina, reaplica a decisao salva nos provedores.
      onRehydrateStorage: () => (state) => {
        if (state?.decidedAt) notify(state.consent);
      },
    },
  ),
);

/** Leitura fora de componente React (nos provedores). */
export const currentConsent = (): ConsentState => useConsent.getState().consent;
export const hasDecided = (): boolean => useConsent.getState().decidedAt !== null;
