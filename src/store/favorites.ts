import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Lista de desejos.
 *
 * Hoje vive no navegador. O backend de favoritos ainda nao existe — quando
 * existir, este store passa a espelhar a API e o que ja estiver salvo local
 * sobe na primeira sincronizacao (ver `mergeFromServer`).
 *
 * Contrato acordado para o backend:
 *   GET    /api/me/favoritos            -> FavoriteItem[]
 *   POST   /api/me/favoritos            -> body { productId }
 *   DELETE /api/me/favoritos/{productId}
 */

export interface FavoriteItem {
  productId: string;
  slug: string;
  name: string;
  image: string;
  /** Preco no momento em que foi favoritado — a tela revalida antes de exibir. */
  priceCentsSnapshot: number;
  addedAt: string;
}

interface FavoritesState {
  items: FavoriteItem[];
  has: (productId: string) => boolean;
  toggle: (item: Omit<FavoriteItem, 'addedAt'>) => boolean;
  remove: (productId: string) => void;
  clear: () => void;
  count: () => number;
  /** Reconcilia o que veio da API com o que estava salvo localmente. */
  mergeFromServer: (serverItems: FavoriteItem[]) => void;
}

export const FAVORITES_STORAGE_KEY = 'bibi.favorites.v1';

export const useFavorites = create<FavoritesState>()(
  persist(
    (set, get) => ({
      items: [],

      has: (productId) => get().items.some((item) => item.productId === productId),

      /** Retorna true quando o item passou a ser favorito, false quando saiu. */
      toggle: (item) => {
        const exists = get().items.some((current) => current.productId === item.productId);
        if (exists) {
          set((state) => ({
            items: state.items.filter((current) => current.productId !== item.productId),
          }));
          return false;
        }
        set((state) => ({
          items: [{ ...item, addedAt: new Date().toISOString() }, ...state.items],
        }));
        return true;
      },

      remove: (productId) =>
        set((state) => ({ items: state.items.filter((item) => item.productId !== productId) })),

      clear: () => set({ items: [] }),

      count: () => get().items.length,

      mergeFromServer: (serverItems) =>
        set((state) => {
          const byId = new Map(serverItems.map((item) => [item.productId, item]));
          // O local so entra se o servidor ainda nao conhece o produto.
          state.items.forEach((local) => {
            if (!byId.has(local.productId)) byId.set(local.productId, local);
          });
          return {
            items: [...byId.values()].sort((a, b) => b.addedAt.localeCompare(a.addedAt)),
          };
        }),
    }),
    {
      name: FAVORITES_STORAGE_KEY,
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
