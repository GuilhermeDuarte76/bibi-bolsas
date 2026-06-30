import type {
  AdminUser,
  AuditEntry,
  Coupon,
  DashboardData,
  IntegrationStatus,
  Promotion,
} from '@/types';
import { orders } from './account';

export const dashboard: DashboardData = {
  metrics: [
    { label: 'Faturamento (30d)', value: 'R$ 84.320', deltaPct: 12.4, hint: 'vs. mes anterior' },
    { label: 'Pedidos (30d)', value: '218', deltaPct: 8.1 },
    { label: 'Ticket medio', value: 'R$ 386,79', deltaPct: 3.9 },
    { label: 'Taxa de conversao', value: '2,8%', deltaPct: -0.4 },
  ],
  pendingOrders: 7,
  lowStock: 4,
  pendingPayments: 3,
  integrationFailures: 1,
  reviewsToModerate: 2,
  revenueSeries: [
    { label: 'Seg', valueCents: 980000 },
    { label: 'Ter', valueCents: 1240000 },
    { label: 'Qua', valueCents: 1105000 },
    { label: 'Qui', valueCents: 1520000 },
    { label: 'Sex', valueCents: 1980000 },
    { label: 'Sab', valueCents: 1420000 },
    { label: 'Dom', valueCents: 760000 },
  ],
  topProducts: [
    { name: 'Mala de Bordo Voo', sold: 64, revenueCents: 2559360 },
    { name: 'Mochila Urbana Trilha', sold: 51, revenueCents: 1172490 },
    { name: 'Bolsa Tote Manhattan', sold: 43, revenueCents: 1074570 },
    { name: 'Kit Viagem Partida', sold: 28, revenueCents: 1343720 },
  ],
  recentOrders: orders,
};

export const coupons: Coupon[] = [
  {
    id: 'cpn-001',
    code: 'BEMVINDA10',
    description: '10% na primeira compra',
    type: 'percent',
    value: 10,
    active: true,
    usageCount: 142,
    usageLimit: 1000,
    expiresAt: '2026-12-31T23:59:59Z',
  },
  {
    id: 'cpn-002',
    code: 'PIX5',
    description: '5% extra no pagamento via Pix',
    type: 'percent',
    value: 5,
    active: true,
    usageCount: 503,
  },
  {
    id: 'cpn-003',
    code: 'FRETEGRATIS',
    description: 'Frete gratis acima de R$ 299',
    type: 'fixed',
    value: 0,
    active: true,
    usageCount: 88,
  },
  {
    id: 'cpn-004',
    code: 'VOLTAASAULAS',
    description: 'R$ 30 off em mochilas escolares',
    type: 'fixed',
    value: 3000,
    active: false,
    usageCount: 230,
    usageLimit: 230,
    expiresAt: '2026-03-15T23:59:59Z',
  },
];

export const promotions: Promotion[] = [
  {
    id: 'promo-001',
    name: 'Esquenta Viagem',
    discountPct: 18,
    active: true,
    startsAt: '2026-06-15T00:00:00Z',
    endsAt: '2026-07-15T23:59:59Z',
    productCount: 12,
  },
  {
    id: 'promo-002',
    name: 'Outlet Bolsas',
    discountPct: 25,
    active: true,
    startsAt: '2026-06-01T00:00:00Z',
    endsAt: '2026-06-30T23:59:59Z',
    productCount: 8,
  },
];

export const adminUsers: AdminUser[] = [
  {
    id: 'usr-001',
    name: 'Guilherme Duarte',
    email: 'guilherme@maqnelson.com.br',
    role: 'owner',
    active: true,
    mfaEnabled: true,
    lastLogin: '2026-06-28T08:12:00Z',
  },
  {
    id: 'usr-002',
    name: 'Bianca Reis',
    email: 'bianca@bibibolsas.com.br',
    role: 'catalogo',
    active: true,
    mfaEnabled: true,
    lastLogin: '2026-06-27T19:40:00Z',
  },
  {
    id: 'usr-003',
    name: 'Tiago Lopes',
    email: 'tiago@bibibolsas.com.br',
    role: 'logistica',
    active: true,
    mfaEnabled: false,
    lastLogin: '2026-06-26T13:05:00Z',
  },
  {
    id: 'usr-004',
    name: 'Helena Costa',
    email: 'helena@bibibolsas.com.br',
    role: 'financeiro',
    active: false,
    mfaEnabled: true,
  },
];

export const auditLog: AuditEntry[] = [
  {
    id: 'aud-001',
    actor: 'Bianca Reis',
    action: 'Alterou preco',
    target: 'Bolsa Tote Manhattan',
    at: '2026-06-28T07:55:00Z',
    meta: 'R$ 269,90 -> R$ 249,90',
  },
  {
    id: 'aud-002',
    actor: 'Tiago Lopes',
    action: 'Atualizou rastreio',
    target: 'Pedido #1042',
    at: '2026-06-27T18:10:00Z',
    meta: 'BR123456789BR',
  },
  {
    id: 'aud-003',
    actor: 'Guilherme Duarte',
    action: 'Aprovou reembolso',
    target: 'Pedido #1029',
    at: '2026-06-26T15:22:00Z',
    meta: 'R$ 189,90',
  },
  {
    id: 'aud-004',
    actor: 'Sistema (n8n)',
    action: 'Reprocessou webhook',
    target: 'Pagamento ord-1051',
    at: '2026-06-27T20:20:00Z',
  },
];

export const integrations: IntegrationStatus[] = [
  {
    id: 'int-pagarme',
    name: 'Pagar.me',
    kind: 'pagamento',
    status: 'ok',
    lastRun: '2026-06-28T09:00:00Z',
  },
  {
    id: 'int-melhorenvio',
    name: 'Melhor Envio',
    kind: 'frete',
    status: 'degraded',
    lastRun: '2026-06-28T08:45:00Z',
    message: 'Latencia acima do normal na cotacao de frete.',
  },
  {
    id: 'int-focusnfe',
    name: 'Focus NFe',
    kind: 'fiscal',
    status: 'ok',
    lastRun: '2026-06-28T08:50:00Z',
  },
  {
    id: 'int-n8n',
    name: 'n8n Automacoes',
    kind: 'automacao',
    status: 'down',
    lastRun: '2026-06-28T06:30:00Z',
    message: 'Workflow de carrinho abandonado falhou 3x. Reprocessamento pendente.',
  },
];
