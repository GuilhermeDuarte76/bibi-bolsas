export { catalogService } from './catalog.service';
export { cartService } from './cart.service';
export { accountService } from './account.service';
export { authService, type Session } from './auth.service';
export { checkoutService, type CheckoutInput, type CheckoutResult } from './checkout.service';
export { adminService } from './admin.service';
export { ApiError } from './http';
export { USE_MOCK } from './config';

/** Chaves centralizadas para o cache do TanStack Query. */
export const queryKeys = {
  categories: ['categories'] as const,
  products: (filters: unknown) => ['products', filters] as const,
  product: (slug: string) => ['product', slug] as const,
  featured: ['featured'] as const,
  related: (slug: string) => ['related', slug] as const,
  searchSuggest: (term: string) => ['search-suggest', term] as const,
  session: ['session'] as const,
  customer: ['customer'] as const,
  addresses: ['addresses'] as const,
  orders: ['orders'] as const,
  order: (id: string) => ['order', id] as const,
  pendingReviews: ['pending-reviews'] as const,
  admin: {
    dashboard: ['admin', 'dashboard'] as const,
    products: ['admin', 'products'] as const,
    orders: ['admin', 'orders'] as const,
    order: (id: string) => ['admin', 'order', id] as const,
    reviews: ['admin', 'reviews'] as const,
    coupons: ['admin', 'coupons'] as const,
    promotions: ['admin', 'promotions'] as const,
    users: ['admin', 'users'] as const,
    audit: ['admin', 'audit'] as const,
    integrations: ['admin', 'integrations'] as const,
  },
};
