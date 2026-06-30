import type {
  AdminUser,
  AuditEntry,
  Coupon,
  DashboardData,
  IntegrationStatus,
  Order,
  Product,
  Promotion,
  Review,
} from '@/types';
import { USE_MOCK } from './config';
import { delay, http } from './http';
import {
  adminUsers,
  auditLog,
  coupons,
  dashboard,
  integrations,
  promotions,
} from './mock/admin';
import { orders, reviews } from './mock/account';
import { products } from './mock/catalog';

/**
 * Services do painel administrativo. Toda acao sensivel (preco, reembolso,
 * permissao) e validada e auditada no backend — aqui apenas simulamos respostas.
 */
export const adminService = {
  async getDashboard(): Promise<DashboardData> {
    if (USE_MOCK) return delay(dashboard);
    // TODO(backend): GET /admin/dashboard
    return http<DashboardData>('/admin/dashboard');
  },

  async listProducts(): Promise<Product[]> {
    if (USE_MOCK) return delay(products);
    // TODO(backend): GET /admin/products
    return http<Product[]>('/admin/products');
  },

  async listOrders(): Promise<Order[]> {
    if (USE_MOCK) return delay(orders);
    // TODO(backend): GET /admin/orders
    return http<Order[]>('/admin/orders');
  },

  async getOrder(id: string): Promise<Order> {
    if (USE_MOCK) {
      const o = orders.find((x) => x.id === id || x.number === id);
      if (!o) throw new Error('Pedido nao encontrado');
      return delay(o);
    }
    // TODO(backend): GET /admin/orders/{id}
    return http<Order>(`/admin/orders/${id}`);
  },

  async listReviews(): Promise<Review[]> {
    if (USE_MOCK) {
      const pending: Review[] = [
        {
          id: 'rev-mod-1',
          productId: 'prod-bolsa-crossbody-aurora',
          productName: 'Bolsa Crossbody Aurora',
          customerName: 'Juliana P.',
          rating: 5,
          title: 'Apaixonada!',
          body: 'Chegou rapido e e ainda mais bonita pessoalmente.',
          createdAt: '2026-06-27T12:00:00Z',
          status: 'pending',
          verifiedPurchase: true,
        },
        {
          id: 'rev-mod-2',
          productId: 'prod-mochila-escolar-vivaz',
          productName: 'Mochila Escolar Vivaz',
          customerName: 'Anonimo',
          rating: 2,
          title: 'Esperava mais',
          body: 'O ziper enroscou no segundo dia.',
          createdAt: '2026-06-26T09:30:00Z',
          status: 'pending',
          verifiedPurchase: false,
        },
      ];
      return delay([...pending, ...reviews]);
    }
    // TODO(backend): GET /admin/reviews
    return http<Review[]>('/admin/reviews');
  },

  async moderateReview(id: string, status: 'approved' | 'rejected'): Promise<void> {
    if (USE_MOCK) return delay(undefined);
    // TODO(backend): PATCH /admin/reviews/{id} — gera log de auditoria
    return http<void>(`/admin/reviews/${id}`, { method: 'PATCH', body: { status } });
  },

  async listCoupons(): Promise<Coupon[]> {
    if (USE_MOCK) return delay(coupons);
    return http<Coupon[]>('/admin/coupons');
  },

  async listPromotions(): Promise<Promotion[]> {
    if (USE_MOCK) return delay(promotions);
    return http<Promotion[]>('/admin/promotions');
  },

  async listUsers(): Promise<AdminUser[]> {
    if (USE_MOCK) return delay(adminUsers);
    return http<AdminUser[]>('/admin/users');
  },

  async listAudit(): Promise<AuditEntry[]> {
    if (USE_MOCK) return delay(auditLog);
    return http<AuditEntry[]>('/admin/audit');
  },

  async listIntegrations(): Promise<IntegrationStatus[]> {
    if (USE_MOCK) return delay(integrations);
    return http<IntegrationStatus[]>('/admin/integrations');
  },
};
