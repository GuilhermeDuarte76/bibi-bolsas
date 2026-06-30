import type {
  Address,
  Customer,
  Order,
  PendingReview,
  Review,
} from '@/types';
import { products } from './catalog';

export const customer: Customer = {
  id: 'cust-001',
  name: 'Marina Albuquerque',
  email: 'marina@exemplo.com.br',
  phone: '(11) 99876-5432',
  document: '123.456.789-09',
  createdAt: '2025-11-02T14:30:00Z',
};

export const addresses: Address[] = [
  {
    id: 'addr-001',
    label: 'Casa',
    recipient: 'Marina Albuquerque',
    zip: '04538-133',
    street: 'Av. Brigadeiro Faria Lima',
    number: '3477',
    complement: 'Apto 142',
    district: 'Itaim Bibi',
    city: 'Sao Paulo',
    state: 'SP',
    isDefault: true,
  },
  {
    id: 'addr-002',
    label: 'Trabalho',
    recipient: 'Marina Albuquerque',
    zip: '01310-100',
    street: 'Av. Paulista',
    number: '1000',
    complement: '8 andar',
    district: 'Bela Vista',
    city: 'Sao Paulo',
    state: 'SP',
    isDefault: false,
  },
];

function itemFrom(slug: string, qty: number, colorIdx = 0) {
  const p = products.find((x) => x.slug === slug)!;
  const color = p.colors[colorIdx];
  return {
    productId: p.id,
    slug: p.slug,
    name: p.name,
    sku: p.variants[0].sku,
    colorName: color.name,
    sizeLabel: p.sizes[0].label === 'Unico' ? undefined : p.sizes[0].label,
    image: p.media[colorIdx]?.url ?? p.media[0].url,
    unitPriceCents: p.priceFromCents,
    quantity: qty,
  };
}

export const orders: Order[] = [
  {
    id: 'ord-1042',
    number: '#1042',
    status: 'shipped',
    createdAt: '2026-06-18T16:20:00Z',
    items: [itemFrom('mala-de-bordo-voo', 1), itemFrom('necessaire-organizadora-rota', 1, 1)],
    paymentMethod: 'credit_card',
    shippingAddress: addresses[0],
    shipping: {
      id: 'ship-sedex',
      carrier: 'Correios',
      service: 'SEDEX',
      priceCents: 3490,
      etaDays: 3,
      label: 'SEDEX — ate 3 dias uteis',
    },
    tracking: {
      carrier: 'Correios',
      code: 'BR123456789BR',
      url: 'https://rastreamento.correios.com.br/app/index.php',
      events: [
        { date: '2026-06-20T09:10:00Z', status: 'Objeto postado', location: 'Sao Paulo / SP' },
        { date: '2026-06-21T14:00:00Z', status: 'Em transito', location: 'Centro de distribuicao' },
        { date: '2026-06-22T08:30:00Z', status: 'Saiu para entrega', location: 'Sao Paulo / SP' },
      ],
    },
    fiscal: {
      status: 'issued',
      key: '3526 0612 3456 7890 0011 5500 1000 0010 4112 3456 7890',
      pdfUrl: '#',
      xmlUrl: '#',
    },
    subtotalCents: 48980,
    discountCents: 0,
    shippingCents: 3490,
    totalCents: 52470,
  },
  {
    id: 'ord-1038',
    number: '#1038',
    status: 'delivered',
    createdAt: '2026-05-29T11:05:00Z',
    items: [itemFrom('bolsa-tote-manhattan', 1, 0)],
    paymentMethod: 'pix',
    shippingAddress: addresses[0],
    shipping: {
      id: 'ship-pac',
      carrier: 'Correios',
      service: 'PAC',
      priceCents: 1990,
      etaDays: 7,
      label: 'PAC — ate 7 dias uteis',
    },
    tracking: {
      carrier: 'Correios',
      code: 'BR987654321BR',
      events: [
        { date: '2026-05-30T10:00:00Z', status: 'Objeto postado' },
        { date: '2026-06-04T16:40:00Z', status: 'Objeto entregue', location: 'Sao Paulo / SP' },
      ],
    },
    fiscal: { status: 'issued', key: '3526...4038', pdfUrl: '#', xmlUrl: '#' },
    subtotalCents: 23741,
    discountCents: 1249,
    shippingCents: 1990,
    totalCents: 24482,
    couponCode: 'PIX5',
  },
  {
    id: 'ord-1051',
    number: '#1051',
    status: 'pending_payment',
    createdAt: '2026-06-27T20:15:00Z',
    items: [itemFrom('mochila-urbana-trilha', 1, 0), itemFrom('clutch-festa-lume', 1, 0)],
    paymentMethod: 'pix',
    shippingAddress: addresses[0],
    shipping: {
      id: 'ship-sedex',
      carrier: 'Correios',
      service: 'SEDEX',
      priceCents: 3490,
      etaDays: 3,
      label: 'SEDEX — ate 3 dias uteis',
    },
    fiscal: { status: 'processing' },
    subtotalCents: 35980,
    discountCents: 0,
    shippingCents: 3490,
    totalCents: 39470,
  },
];

export const reviews: Review[] = [
  {
    id: 'rev-001',
    productId: 'prod-mala-de-bordo-voo',
    productName: 'Mala de Bordo Voo',
    customerName: 'Marina A.',
    rating: 5,
    title: 'Perfeita para bagagem de mao',
    body: 'Coube tudo e ainda sobrou espaco. As rodas deslizam muito bem e o cadeado TSA da seguranca. Recomendo demais!',
    createdAt: '2026-06-10T10:00:00Z',
    status: 'approved',
    verifiedPurchase: true,
  },
  {
    id: 'rev-002',
    productId: 'prod-bolsa-tote-manhattan',
    productName: 'Bolsa Tote Manhattan',
    customerName: 'Carla M.',
    rating: 5,
    title: 'Linda e espacosa',
    body: 'O couro tem um toque maravilhoso e cabe meu notebook tranquilamente. Cor terracota e ainda mais bonita pessoalmente.',
    createdAt: '2026-06-02T10:00:00Z',
    status: 'approved',
    verifiedPurchase: true,
  },
  {
    id: 'rev-003',
    productId: 'prod-mochila-urbana-trilha',
    productName: 'Mochila Urbana Trilha',
    customerName: 'Rafael S.',
    rating: 4,
    title: 'Otima para o trabalho',
    body: 'Muito bem organizada e o bolso antifurto e util no transporte publico. So achei as alcas um pouco firmes no inicio.',
    createdAt: '2026-05-22T10:00:00Z',
    status: 'approved',
    verifiedPurchase: true,
  },
];

export const pendingReviews: PendingReview[] = [
  {
    orderId: 'ord-1038',
    productId: 'prod-bolsa-tote-manhattan',
    productName: 'Bolsa Tote Manhattan',
    productImage: products.find((p) => p.slug === 'bolsa-tote-manhattan')!.media[0].url,
    purchasedAt: '2026-05-29T11:05:00Z',
  },
];
