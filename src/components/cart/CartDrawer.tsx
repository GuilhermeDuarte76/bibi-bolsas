import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router';
import { Handbag, Minus, Plus, Trash, X } from '@phosphor-icons/react';
import { useUI } from '@/store/ui';
import { useCart } from '@/store/cart';
import { useOverlay } from '@/hooks/useOverlay';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/States';
import { analytics } from '@/lib/analytics';
import { formatPrice } from '@/lib/utils';
import { toast } from '@/components/ui/Toast';

export function CartDrawer() {
  const cartOpen = useUI((s) => s.cartOpen);
  if (!cartOpen) return null;
  return <CartDrawerPanel />;
}

/**
 * Sacola lateral.
 *
 * Renderizada em portal no <body>: fora da arvore da loja, nenhum ancestral com
 * transform/filtro consegue reposicionar ou recortar a camada fixa.
 */
function CartDrawerPanel() {
  const closeCart = useUI((s) => s.closeCart);
  const navigate = useNavigate();
  const { items, removeItem, setQuantity } = useCart();
  const subtotal = useCart((s) => s.subtotalCents());
  const closeRef = useOverlay<HTMLButtonElement>(true, closeCart);

  // Item indisponivel trava o checkout: melhor avisar aqui do que na hora de pagar.
  const blockedCount = items.filter((item) => item.isAvailable === false).length;

  const goCheckout = () => {
    analytics.beginCheckout(items);
    closeCart();
    navigate('/checkout');
  };

  const safeRemove = (lineId: string) => {
    const removed = items.find((item) => item.id === lineId);
    void removeItem(lineId)
      .then(() => {
        if (removed) analytics.removeFromCart(removed);
      })
      .catch((error) =>
        toast.error((error as Error).message || 'Não foi possível remover o item.'),
      );
  };

  const safeSetQuantity = (lineId: string, quantity: number) => {
    const before = items.find((item) => item.id === lineId);
    void setQuantity(lineId, quantity)
      .then(() => {
        if (!before) return;
        const after = useCart.getState().items.find((item) => item.id === lineId);
        analytics.updateCartQuantity(before, (after?.quantity ?? 0) - before.quantity);
      })
      .catch((error) =>
        toast.error((error as Error).message || 'Não foi possível atualizar a quantidade.'),
      );
  };

  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Sacola">
      <button
        type="button"
        aria-label="Fechar sacola"
        tabIndex={-1}
        className="absolute inset-0 animate-overlay-in bg-graphite/45 backdrop-blur-[2px]"
        onClick={closeCart}
      />

      {/*
       * 100dvh, nao h-full: no celular a barra do navegador some e reaparece, e
       * com altura de layout o rodape da sacola ficava fora da area visivel.
       */}
      <div
        className="absolute right-0 top-0 flex h-[100dvh] w-full max-w-md flex-col bg-cream-lighter shadow-[var(--shadow-lift)]"
        style={{ animation: 'drawer-in 0.32s var(--ease-fluid)' }}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 sm:px-5">
          <h2 className="flex items-center gap-2 font-display text-display-xs text-graphite">
            <Handbag size={22} aria-hidden /> Sua sacola
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={closeCart}
            aria-label="Fechar sacola"
            className="tactile -mr-1.5 grid h-11 w-11 place-items-center rounded-full text-graphite hover:bg-cream-light"
          >
            <X size={22} />
          </button>
        </header>

        {items.length === 0 ? (
          <EmptyState
            icon={Handbag}
            title="Sua sacola está vazia"
            description="Explore nossa vitrine e encontre a bolsa ideal para o seu próximo momento."
            action={{
              label: 'Ver vitrine',
              onClick: () => {
                closeCart();
                navigate('/catalogo');
              },
            }}
            className="flex-1"
          />
        ) : (
          <>
            <ul className="flex-1 divide-y divide-border overflow-y-auto overscroll-contain px-4 sm:px-5">
              {items.map((item) => (
                <li key={item.id} className="flex gap-4 py-4">
                  <Link
                    to={`/produto/${item.slug}`}
                    onClick={closeCart}
                    className="h-24 w-20 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-cream-light"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        to={`/produto/${item.slug}`}
                        onClick={closeCart}
                        className="text-sm font-medium leading-snug text-graphite hover:text-cinnamon"
                      >
                        {item.name}
                      </Link>
                      <button
                        type="button"
                        onClick={() => safeRemove(item.id)}
                        aria-label={`Remover ${item.name}`}
                        className="tactile hit-area relative -mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-store-gray hover:text-danger"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                    <p className="mt-0.5 text-xs text-graphite-soft">
                      {item.colorName}
                      {item.sizeLabel ? ` · ${item.sizeLabel}` : ''}
                    </p>
                    <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                      <div className="flex items-center rounded-full border border-border">
                        <button
                          type="button"
                          onClick={() => safeSetQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          aria-label="Diminuir quantidade"
                          className="tactile grid h-9 w-9 place-items-center rounded-full text-graphite disabled:opacity-40"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-7 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => safeSetQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.maxStock}
                          aria-label="Aumentar quantidade"
                          className="tactile grid h-9 w-9 place-items-center rounded-full text-graphite disabled:opacity-40"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <span className="text-sm font-semibold text-graphite">
                        {formatPrice(item.unitPriceCents * item.quantity)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* px/pt separados: `p-*` (utilities) venceria o `pb-safe` (components) */}
            <footer className="shrink-0 border-t border-border px-4 pt-4 pb-safe sm:px-5">
              {blockedCount > 0 && (
                <p className="mb-3 rounded-[var(--radius-md)] bg-danger-soft px-3 py-2 text-xs font-medium text-danger">
                  {blockedCount === 1
                    ? 'Um item ficou indisponível.'
                    : `${blockedCount} itens ficaram indisponíveis.`}{' '}
                  Abra a sacola para revisar.
                </p>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-graphite-soft">Subtotal</span>
                <span className="font-display text-display-xs text-graphite">
                  {formatPrice(subtotal)}
                </span>
              </div>
              <p className="mt-1 text-xs text-graphite-soft">Frete e cupom calculados no checkout.</p>
              <Button
                fullWidth
                size="lg"
                className="mt-3"
                disabled={blockedCount > 0}
                onClick={goCheckout}
              >
                Finalizar compra
              </Button>
              <ButtonLink to="/carrinho" variant="ghost" fullWidth className="mt-1" onClick={closeCart}>
                Ver sacola completa
              </ButtonLink>
            </footer>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
