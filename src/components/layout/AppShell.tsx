import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Header } from './Header';
import { Footer } from './Footer';
import { SearchOverlay } from './SearchOverlay';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { ConsentBanner } from '@/components/consent/ConsentBanner';
import { usePageTracking } from '@/hooks/usePageTracking';
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
  usePageTracking();

  useEffect(() => {
    void syncCart();
  }, [syncCart]);

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />

      {/* Atalho de teclado: pula o header e vai direto ao conteudo da pagina. */}
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-[var(--radius-md)] focus:bg-graphite focus:px-4 focus:py-3 focus:text-cream-light"
      >
        Pular para o conteúdo
      </a>

      <Header />
      <main id="conteudo" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
      <SearchOverlay />
      <ConsentBanner />
    </div>
  );
}
