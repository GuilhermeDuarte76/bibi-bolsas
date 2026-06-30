import type { AppliedCoupon, ShippingOption } from '@/types';
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

export const cartService = {
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
    // TODO(backend): POST /cart/shipping/quote { zip, items } — backend usa Melhor Envio/Frenet
    return http('/cart/shipping/quote', { method: 'POST', body: { zip, subtotalCents } });
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
    // TODO(backend): POST /cart/coupon { code } — backend recalcula desconto
    return http('/cart/coupon', { method: 'POST', body: { code, subtotalCents } });
  },
};
