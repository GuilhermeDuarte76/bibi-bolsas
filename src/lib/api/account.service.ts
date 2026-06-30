import type { Address, Customer, Order, PendingReview, Review } from '@/types';
import { USE_MOCK } from './config';
import { delay, http } from './http';
import {
  addresses as mockAddresses,
  customer as mockCustomer,
  orders as mockOrders,
  pendingReviews as mockPendingReviews,
} from './mock/account';
import { makeId } from '../utils';

// Estado mutavel em memoria para simular persistencia durante a sessao.
let addressBook = [...mockAddresses];

export const accountService = {
  async getCustomer(): Promise<Customer> {
    if (USE_MOCK) return delay(mockCustomer);
    // TODO(backend): GET /account/me
    return http<Customer>('/account/me');
  },

  async updateCustomer(patch: Partial<Customer>): Promise<Customer> {
    if (USE_MOCK) return delay({ ...mockCustomer, ...patch });
    // TODO(backend): PATCH /account/me
    return http<Customer>('/account/me', { method: 'PATCH', body: patch });
  },

  async listAddresses(): Promise<Address[]> {
    if (USE_MOCK) return delay(addressBook);
    // TODO(backend): GET /account/addresses
    return http<Address[]>('/account/addresses');
  },

  async saveAddress(
    address: Omit<Address, 'id' | 'isDefault'> & { id?: string; isDefault?: boolean },
  ): Promise<Address> {
    if (USE_MOCK) {
      const saved: Address = {
        ...address,
        id: address.id ?? makeId('addr'),
        isDefault: address.isDefault ?? false,
      };
      if (saved.isDefault) addressBook = addressBook.map((a) => ({ ...a, isDefault: false }));
      const idx = addressBook.findIndex((a) => a.id === saved.id);
      if (idx >= 0) addressBook[idx] = saved;
      else addressBook = [...addressBook, saved];
      return delay(saved);
    }
    // TODO(backend): POST/PUT /account/addresses
    return http<Address>('/account/addresses', {
      method: address.id ? 'PUT' : 'POST',
      body: address,
    });
  },

  async deleteAddress(id: string): Promise<void> {
    if (USE_MOCK) {
      addressBook = addressBook.filter((a) => a.id !== id);
      return delay(undefined);
    }
    // TODO(backend): DELETE /account/addresses/{id}
    return http<void>(`/account/addresses/${id}`, { method: 'DELETE' });
  },

  async listOrders(): Promise<Order[]> {
    if (USE_MOCK) return delay(mockOrders);
    // TODO(backend): GET /account/orders
    return http<Order[]>('/account/orders');
  },

  async getOrder(id: string): Promise<Order> {
    if (USE_MOCK) {
      const o = mockOrders.find((x) => x.id === id || x.number === id || x.number === `#${id}`);
      if (!o) throw new Error('Pedido nao encontrado');
      return delay(o);
    }
    // TODO(backend): GET /account/orders/{id}
    return http<Order>(`/account/orders/${id}`);
  },

  async listPendingReviews(): Promise<PendingReview[]> {
    if (USE_MOCK) return delay(mockPendingReviews);
    // TODO(backend): GET /account/reviews/pending
    return http<PendingReview[]>('/account/reviews/pending');
  },

  async submitReview(input: {
    productId: string;
    rating: number;
    title: string;
    body: string;
  }): Promise<Review> {
    if (USE_MOCK) {
      return delay({
        id: makeId('rev'),
        productId: input.productId,
        productName: '',
        customerName: mockCustomer.name,
        rating: input.rating,
        title: input.title,
        body: input.body,
        createdAt: new Date().toISOString(),
        status: 'pending',
        verifiedPurchase: true,
      });
    }
    // TODO(backend): POST /account/reviews
    return http<Review>('/account/reviews', { method: 'POST', body: input });
  },
};
