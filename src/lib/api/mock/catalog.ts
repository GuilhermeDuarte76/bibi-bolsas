import type {
  Category,
  Product,
  ProductColor,
  Occasion,
  ProductBadge,
} from '@/types';
import { productImage } from '@/lib/images';

// ----------------------------------------------------------------------------
// Cores de catalogo (swatches)
// ----------------------------------------------------------------------------

const C: Record<string, ProductColor> = {
  terracotta: { id: 'cor-terracota', name: 'Terracota', hex: '#a5603f' },
  caramelo: { id: 'cor-caramelo', name: 'Caramelo', hex: '#b07a4c' },
  preto: { id: 'cor-preto', name: 'Preto', hex: '#2a2b2c' },
  nude: { id: 'cor-nude', name: 'Nude', hex: '#caa18a' },
  creme: { id: 'cor-creme', name: 'Creme', hex: '#e3d4c2' },
  cafe: { id: 'cor-cafe', name: 'Cafe', hex: '#5e3d32' },
  areia: { id: 'cor-areia', name: 'Areia', hex: '#c2b1a8' },
  azul: { id: 'cor-azul', name: 'Azul Viagem', hex: '#0c3264' },
  rose: { id: 'cor-rose', name: 'Rose', hex: '#a02a63' },
  vinho: { id: 'cor-vinho', name: 'Vinho', hex: '#6a2433' },
};

const PALETTE_BY_COLOR: Record<string, string> = {
  'cor-terracota': 'terracotta',
  'cor-caramelo': 'cinnamon',
  'cor-preto': 'graphite',
  'cor-nude': 'sand',
  'cor-creme': 'cream',
  'cor-cafe': 'cinnamon',
  'cor-areia': 'sand',
  'cor-azul': 'travel',
  'cor-rose': 'rose',
  'cor-vinho': 'rose',
};

// ----------------------------------------------------------------------------
// Categorias
// ----------------------------------------------------------------------------

export const categories: Category[] = [
  {
    id: 'cat-bolsas',
    slug: 'bolsas',
    name: 'Bolsas',
    tagline: 'Do trabalho ao jantar, com personalidade.',
    image: productImage('bolsas', 'terracotta', 0),
    accent: 'terracotta',
  },
  {
    id: 'cat-mochilas',
    slug: 'mochilas',
    name: 'Mochilas',
    tagline: 'Praticidade que acompanha o seu ritmo.',
    image: productImage('mochilas', 'cinnamon', 0),
    accent: 'cinnamon',
  },
  {
    id: 'cat-malas',
    slug: 'malas',
    name: 'Malas',
    tagline: 'Para cada viagem, o companheiro certo.',
    image: productImage('malas', 'travel', 0),
    accent: 'travel-blue',
  },
  {
    id: 'cat-kit-viagem',
    slug: 'kit-viagem',
    name: 'Kit Viagem',
    tagline: 'Conjuntos pensados para quem ama partir.',
    image: productImage('kit-viagem', 'travel', 0),
    accent: 'travel-blue',
  },
  {
    id: 'cat-promocoes',
    slug: 'promocoes',
    name: 'Promocoes',
    tagline: 'Curadoria especial com precos especiais.',
    image: productImage('promocoes', 'rose', 0),
    accent: 'school-rose',
  },
];

// ----------------------------------------------------------------------------
// Produtos
// ----------------------------------------------------------------------------

interface Seed {
  name: string;
  slug: string;
  category: Product['categorySlug'];
  collection?: string;
  short: string;
  desc: string;
  occasions: Occasion[];
  badges: ProductBadge[];
  price: number; // centavos
  compareAt?: number;
  installments: number;
  pix: number;
  rating: number;
  reviews: number;
  colorKeys: (keyof typeof C)[];
  sizes?: { id: string; label: string }[];
  material: string;
  specs: { h: number; w: number; d: number; weight: number; capacity?: string };
  createdAt: string;
}

const SEEDS: Seed[] = [
  {
    name: 'Bolsa Tote Manhattan',
    slug: 'bolsa-tote-manhattan',
    category: 'bolsas',
    collection: 'Essenciais',
    short: 'Tote estruturada em couro sintetico premium, espacosa para o dia a dia.',
    desc: 'A Tote Manhattan une estrutura e suavidade: couro sintetico de toque macio, alcas reforcadas e um interior generoso com bolso para notebook. Pensada para acompanhar do escritorio ao happy hour.',
    occasions: ['trabalho', 'passeio'],
    badges: ['novo', 'pronta-entrega'],
    price: 24990,
    installments: 6,
    pix: 5,
    rating: 4.8,
    reviews: 124,
    colorKeys: ['terracotta', 'preto', 'caramelo', 'creme'],
    material: 'Couro sintetico premium',
    specs: { h: 30, w: 38, d: 14, weight: 820, capacity: '12 L' },
    createdAt: '2026-06-20T10:00:00Z',
  },
  {
    name: 'Bolsa Crossbody Aurora',
    slug: 'bolsa-crossbody-aurora',
    category: 'bolsas',
    collection: 'Para cada momento',
    short: 'Transversal compacta com alca ajustavel e fecho dourado.',
    desc: 'A Crossbody Aurora e leve, pratica e elegante. Alca regulavel, ferragem dourada discreta e compartimentos internos organizados para o essencial.',
    occasions: ['passeio', 'presente'],
    badges: ['promocao'],
    price: 15990,
    compareAt: 19990,
    installments: 4,
    pix: 5,
    rating: 4.7,
    reviews: 89,
    colorKeys: ['nude', 'terracotta', 'vinho'],
    material: 'Couro sintetico texturizado',
    specs: { h: 18, w: 24, d: 8, weight: 480, capacity: '4 L' },
    createdAt: '2026-05-30T10:00:00Z',
  },
  {
    name: 'Clutch Festa Lume',
    slug: 'clutch-festa-lume',
    category: 'bolsas',
    collection: 'Noite',
    short: 'Clutch de mao com brilho sutil para ocasioes especiais.',
    desc: 'Para a noite pedir presenca: a Clutch Lume tem acabamento acetinado, corrente removivel e tamanho ideal para celular, batom e cartoes.',
    occasions: ['presente', 'passeio'],
    badges: ['novo'],
    price: 12990,
    installments: 3,
    pix: 5,
    rating: 4.6,
    reviews: 41,
    colorKeys: ['vinho', 'preto', 'rose'],
    material: 'Cetim com ferragem metalizada',
    specs: { h: 12, w: 22, d: 5, weight: 260, capacity: '1.5 L' },
    createdAt: '2026-06-10T10:00:00Z',
  },
  {
    name: 'Bolsa Sacola Ateliê',
    slug: 'bolsa-sacola-atelie',
    category: 'bolsas',
    collection: 'Essenciais',
    short: 'Sacola macia e leve, perfeita para o dia inteiro.',
    desc: 'Construcao macia que se molda ao conteudo, com fechamento por ima e forro interno resistente. A companheira ideal para quem carrega de tudo um pouco.',
    occasions: ['trabalho', 'passeio'],
    badges: ['pronta-entrega'],
    price: 18990,
    installments: 5,
    pix: 5,
    rating: 4.5,
    reviews: 67,
    colorKeys: ['areia', 'cafe', 'preto'],
    material: 'Couro sintetico macio',
    specs: { h: 32, w: 40, d: 12, weight: 690, capacity: '14 L' },
    createdAt: '2026-04-18T10:00:00Z',
  },
  {
    name: 'Mochila Urbana Trilha',
    slug: 'mochila-urbana-trilha',
    category: 'mochilas',
    collection: 'Cidade',
    short: 'Mochila com compartimento acolchoado para notebook 15".',
    desc: 'Resistente e organizada: compartimento acolchoado para notebook, bolso oculto antifurto nas costas e tecido com repelencia a agua. Para a rotina urbana sem perder o estilo.',
    occasions: ['trabalho', 'escola'],
    badges: ['novo', 'pronta-entrega'],
    price: 22990,
    installments: 6,
    pix: 5,
    rating: 4.9,
    reviews: 203,
    colorKeys: ['preto', 'cafe', 'terracotta'],
    material: 'Poliester de alta densidade',
    specs: { h: 44, w: 30, d: 16, weight: 760, capacity: '20 L' },
    createdAt: '2026-06-22T10:00:00Z',
  },
  {
    name: 'Mochila Escolar Vivaz',
    slug: 'mochila-escolar-vivaz',
    category: 'mochilas',
    collection: 'Volta as aulas',
    short: 'Espacosa, leve e resistente para o ano letivo.',
    desc: 'Pensada para a rotina escolar: dois compartimentos amplos, alcas ergonomicas acolchoadas e tecido facil de limpar. Cores vivas que combinam com cada personalidade.',
    occasions: ['escola'],
    badges: ['promocao'],
    price: 16990,
    compareAt: 21990,
    installments: 5,
    pix: 5,
    rating: 4.7,
    reviews: 158,
    colorKeys: ['rose', 'azul', 'preto'],
    material: 'Poliester resistente',
    specs: { h: 42, w: 32, d: 18, weight: 640, capacity: '22 L' },
    createdAt: '2026-03-12T10:00:00Z',
  },
  {
    name: 'Mochila Couro Atelier',
    slug: 'mochila-couro-atelier',
    category: 'mochilas',
    collection: 'Cidade',
    short: 'Mochila em couro sintetico com cara de bolsa.',
    desc: 'O conforto da mochila com a sofisticacao de uma bolsa. Fechamento por aba magnetica, ferragens discretas e formato estruturado que nao deforma.',
    occasions: ['trabalho', 'passeio'],
    badges: [],
    price: 25990,
    installments: 6,
    pix: 5,
    rating: 4.8,
    reviews: 72,
    colorKeys: ['caramelo', 'preto', 'nude'],
    material: 'Couro sintetico premium',
    specs: { h: 38, w: 28, d: 14, weight: 880, capacity: '16 L' },
    createdAt: '2026-05-02T10:00:00Z',
  },
  {
    name: 'Mala de Bordo Voo',
    slug: 'mala-de-bordo-voo',
    category: 'malas',
    collection: 'Viagem',
    short: 'Mala carry-on rigida com rodas 360° e cadeado TSA.',
    desc: 'Aprovada como bagagem de mao na maioria das companhias. Casco rigido em ABS, quatro rodas 360°, cadeado TSA embutido e divisoria interna com cintas. Para partir leve.',
    occasions: ['viagem'],
    badges: ['novo', 'pronta-entrega'],
    price: 39990,
    installments: 10,
    pix: 5,
    rating: 4.9,
    reviews: 312,
    colorKeys: ['azul', 'preto', 'terracotta'],
    sizes: [
      { id: 'tam-p', label: 'Bordo 36L' },
      { id: 'tam-m', label: 'Media 64L' },
    ],
    material: 'ABS rigido',
    specs: { h: 55, w: 37, d: 23, weight: 2700, capacity: '36 L' },
    createdAt: '2026-06-15T10:00:00Z',
  },
  {
    name: 'Mala Grande Horizonte',
    slug: 'mala-grande-horizonte',
    category: 'malas',
    collection: 'Viagem',
    short: 'Mala grande expansivel para viagens longas.',
    desc: 'Capacidade extra com ziper expansivel, casco resistente a impactos e interior totalmente forrado. Para quem nao abre mao de levar tudo.',
    occasions: ['viagem'],
    badges: ['promocao'],
    price: 52990,
    compareAt: 64990,
    installments: 10,
    pix: 5,
    rating: 4.8,
    reviews: 96,
    colorKeys: ['preto', 'azul', 'vinho'],
    material: 'Policarbonato',
    specs: { h: 75, w: 50, d: 30, weight: 4200, capacity: '95 L' },
    createdAt: '2026-04-28T10:00:00Z',
  },
  {
    name: 'Kit Viagem Partida',
    slug: 'kit-viagem-partida',
    category: 'kit-viagem',
    collection: 'Viagem',
    short: 'Mala de bordo + necessaire + tag de bagagem.',
    desc: 'Tudo o que voce precisa para a proxima viagem em um so kit: mala de bordo rigida, necessaire impermeavel e tag de identificacao combinando. Economia e harmonia visual.',
    occasions: ['viagem', 'presente'],
    badges: ['novo'],
    price: 47990,
    compareAt: 56990,
    installments: 10,
    pix: 5,
    rating: 4.9,
    reviews: 54,
    colorKeys: ['azul', 'terracotta', 'preto'],
    material: 'ABS rigido + nylon',
    specs: { h: 55, w: 37, d: 23, weight: 3100, capacity: 'Kit 3 pecas' },
    createdAt: '2026-06-05T10:00:00Z',
  },
  {
    name: 'Necessaire Organizadora Rota',
    slug: 'necessaire-organizadora-rota',
    category: 'kit-viagem',
    collection: 'Viagem',
    short: 'Necessaire impermeavel com gancho para pendurar.',
    desc: 'Compartimentos transparentes, gancho para pendurar e material impermeavel facil de limpar. Mantem tudo no lugar onde quer que voce va.',
    occasions: ['viagem', 'presente'],
    badges: ['pronta-entrega'],
    price: 8990,
    installments: 3,
    pix: 5,
    rating: 4.6,
    reviews: 88,
    colorKeys: ['nude', 'preto', 'terracotta'],
    material: 'Nylon impermeavel',
    specs: { h: 16, w: 24, d: 9, weight: 240, capacity: '3 L' },
    createdAt: '2026-05-20T10:00:00Z',
  },
  {
    name: 'Bolsa Baguette Solene',
    slug: 'bolsa-baguette-solene',
    category: 'bolsas',
    collection: 'Para cada momento',
    short: 'Baguette atemporal de ombro com fecho de virar.',
    desc: 'O modelo baguette que voltou para ficar: alca curta de ombro, fecho de virar metalizado e silhueta alongada que valoriza qualquer producao.',
    occasions: ['passeio', 'presente'],
    badges: ['ultimas-unidades'],
    price: 17990,
    installments: 5,
    pix: 5,
    rating: 4.7,
    reviews: 63,
    colorKeys: ['caramelo', 'vinho', 'preto', 'nude'],
    material: 'Couro sintetico acetinado',
    specs: { h: 14, w: 30, d: 7, weight: 420, capacity: '3 L' },
    createdAt: '2026-04-02T10:00:00Z',
  },
];

function buildProduct(seed: Seed): Product {
  const colors = seed.colorKeys.map((k) => C[k]);
  const sizes = seed.sizes ?? [{ id: 'tam-unico', label: 'Unico' }];

  const variants = colors.flatMap((color, ci) =>
    sizes.map((size, si) => {
      const priceBump = si * 5000;
      return {
        id: `${seed.slug}-${color.id}-${size.id}`,
        sku: `BB-${seed.slug.slice(0, 6).toUpperCase()}-${ci}${si}`,
        colorId: color.id,
        sizeId: size.id === 'tam-unico' ? undefined : size.id,
        priceCents: seed.price + priceBump,
        compareAtCents: seed.compareAt ? seed.compareAt + priceBump : undefined,
        // Estoque pseudo-aleatorio porem deterministico por seed.
        stock: ((seed.reviews + ci * 7 + si * 3) % 9) + (seed.badges.includes('ultimas-unidades') ? 2 : 4),
      };
    }),
  );

  const media = colors.slice(0, 4).map((color, idx) => ({
    id: `${seed.slug}-media-${idx}`,
    type: 'image' as const,
    url: productImage(seed.category, PALETTE_BY_COLOR[color.id] ?? 'cream', idx),
    alt: `${seed.name} na cor ${color.name}, vista ${idx + 1}`,
  }));

  return {
    id: `prod-${seed.slug}`,
    slug: seed.slug,
    name: seed.name,
    shortDescription: seed.short,
    description: seed.desc,
    categorySlug: seed.category,
    collection: seed.collection,
    occasions: seed.occasions,
    badges: seed.badges,
    priceFromCents: seed.price,
    compareAtFromCents: seed.compareAt,
    installmentsMax: seed.installments,
    pixDiscountPct: seed.pix,
    rating: seed.rating,
    reviewCount: seed.reviews,
    colors,
    sizes,
    variants,
    media,
    specs: {
      heightCm: seed.specs.h,
      widthCm: seed.specs.w,
      depthCm: seed.specs.d,
      weightG: seed.specs.weight,
      material: seed.material,
      capacity: seed.specs.capacity,
      care: 'Limpe com pano macio levemente umido. Evite produtos abrasivos e exposicao prolongada ao sol.',
    },
    createdAt: seed.createdAt,
  };
}

export const products: Product[] = SEEDS.map(buildProduct);

/** Materiais distintos para facetas de filtro. */
export const allMaterials = Array.from(
  new Set(products.map((p) => p.specs.material).filter(Boolean) as string[]),
);

export const allColors = Array.from(
  new Map(products.flatMap((p) => p.colors).map((c) => [c.id, c])).values(),
);
