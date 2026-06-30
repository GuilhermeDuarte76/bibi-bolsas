import { create } from 'zustand';

/** Estado de UI efemero: drawer do carrinho, overlay de busca, menu mobile. */
interface UIState {
  cartOpen: boolean;
  searchOpen: boolean;
  mobileMenuOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
}

export const useUI = create<UIState>((set) => ({
  cartOpen: false,
  searchOpen: false,
  mobileMenuOpen: false,
  openCart: () => set({ cartOpen: true }),
  closeCart: () => set({ cartOpen: false }),
  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false }),
  toggleMobileMenu: () => set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen })),
  closeMobileMenu: () => set({ mobileMenuOpen: false }),
}));
