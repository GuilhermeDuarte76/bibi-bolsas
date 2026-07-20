import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { SearchOverlay } from './SearchOverlay';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { useCart } from '@/store/cart';

/** Rola para o topo a cada troca de rota. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

/** Casca da loja (cliente): header, conteudo, footer e overlays globais. */
export function AppShell() {
  const syncCart = useCart((state) => state.sync);

  useEffect(() => {
    void syncCart();
  }, [syncCart]);

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
      <SearchOverlay />
    </div>
  );
}
