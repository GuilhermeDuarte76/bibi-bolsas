/**
 * Dados institucionais da loja.
 *
 * ⚠️  PREENCHER ANTES DE IR AO AR
 * Tudo que estiver como `null` simplesmente nao aparece na interface — nenhum
 * dado falso e exibido para a cliente. Substitua por valores reais e a UI
 * (rodape, paginas institucionais, contato) passa a mostrar automaticamente.
 *
 * Campos exigidos por lei em e-commerce brasileiro (Decreto 7.962/2013, art. 2):
 * razao social, CNPJ e endereco fisico precisam estar visiveis no site.
 */

export interface StoreContactChannel {
  label: string;
  value: string;
  href: string;
}

export const STORE = {
  /** Nome fantasia usado em titulos e textos. */
  name: 'Bibi Bolsas',

  /** Razao social completa. Ex.: 'Bibi Bolsas Comercio de Acessorios LTDA'. */
  legalName: null as string | null,

  /** CNPJ formatado. Ex.: '12.345.678/0001-90'. */
  cnpj: null as string | null,

  /** Endereco fisico da empresa. */
  address: null as {
    street: string;
    number: string;
    complement?: string;
    district: string;
    city: string;
    state: string;
    zip: string;
  } | null,

  /** E-mail de atendimento ao cliente. */
  email: null as string | null,

  /** WhatsApp somente digitos, com DDI. Ex.: '5531999999999'. */
  whatsapp: null as string | null,

  /** Perfil no Instagram (sem @). */
  instagram: 'bibibolsas',

  /** Horario de atendimento humano. */
  businessHours: null as string | null,

  /**
   * Prazo de arrependimento. 7 dias corridos e o minimo legal
   * (CDC art. 49) — pode aumentar, nunca reduzir.
   */
  returnWindowDays: 7,

  /** Prazo para a loja separar e postar o pedido apos o pagamento. */
  handlingTimeLabel: 'ate 2 dias uteis',

  /**
   * Frete padrao gratis a partir deste subtotal.
   * Espelha a regra do backend (InternalShipping). Se mudar la, mude aqui —
   * este valor so alimenta textos de marketing, nunca o calculo real.
   */
  freeShippingThresholdCents: 29_900,

  /**
   * Condicoes de pagamento anunciadas na vitrine.
   *
   * ⚠️  So preencha o que a loja realmente pratica. Anunciar parcelamento ou
   * desconto que o checkout nao aplica e informacao enganosa ao consumidor
   * (CDC art. 37) — e a pessoa descobre justamente na hora de pagar.
   *
   * Hoje o backend oferece exclusivamente Pix, sem parcelamento e sem desconto
   * configurado: os dois campos ficam nulos e a interface simplesmente nao
   * menciona nenhum dos dois.
   */
  payment: {
    /** Numero maximo de parcelas sem juros. `null` = nao parcelamos. */
    installmentsMax: null as number | null,
    /** Desconto no Pix em porcentagem. `null` = sem desconto. */
    pixDiscountPercent: null as number | null,
  },
} as const;

/** Endereco em uma linha, ou null quando ainda nao foi preenchido. */
export function formatStoreAddress(): string | null {
  const a = STORE.address;
  if (!a) return null;
  const complement = a.complement ? `, ${a.complement}` : '';
  return `${a.street}, ${a.number}${complement} — ${a.district}, ${a.city}/${a.state} · CEP ${a.zip}`;
}

/** Canais de contato realmente configurados, na ordem de preferencia. */
export function activeContactChannels(): StoreContactChannel[] {
  const channels: StoreContactChannel[] = [];

  if (STORE.whatsapp) {
    channels.push({
      label: 'WhatsApp',
      value: formatWhatsappDisplay(STORE.whatsapp),
      href: `https://wa.me/${STORE.whatsapp}`,
    });
  }
  if (STORE.email) {
    channels.push({ label: 'E-mail', value: STORE.email, href: `mailto:${STORE.email}` });
  }
  if (STORE.instagram) {
    channels.push({
      label: 'Instagram',
      value: `@${STORE.instagram}`,
      href: `https://www.instagram.com/${STORE.instagram}`,
    });
  }

  return channels;
}

function formatWhatsappDisplay(digits: string): string {
  const local = digits.replace(/^55/, '');
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return digits;
}
