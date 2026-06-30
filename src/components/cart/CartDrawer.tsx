import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Handbag, Minus, Plus, Trash, X } from '@phosphor-icons/react';
import { useUI } from '@/store/ui';
import { useCart } from '@/store/cart';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/States';
import { formatPrice } from '@/lib/utils';

export function CartDrawer() {
  const { cartOpen, closeCart } = useUI();
  const navigate = useNavigate();
  const { items, removeItem, setQuantity } = useCart();
  const subtotal = useCart((s) => s.subtotalCents());

  // Trava scroll do body e fecha no ESC.
  useEffect(() => {
    if (!cartOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeCart();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [cartOpen, closeCart]);

  if (!cartOpen) return null;

  const goCheckout = () => {
    closeCart();
    navigate('/checkout');
  };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Sacola">
      <button
        aria-label="Fechar sacola"
        className="absolute inset-0 bg-graphite/40 backdrop-blur-[2px]"
        onClick={closeCart}
      />
      <div
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-cream-lighter shadow-[var(--shadow-lift)]"
        style={{ animation: 'drawer-in 0.32s var(--ease-fluid)' }}
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="flex items-center gap-2 font-display text-xl text-graphite">
            <Handbag size={22} /> Sua sacola
          </h2>
          <button
            onClick={closeCart}
            aria-label="Fechar"
            className="tactile rounded-md p-1.5 text-graphite hover:bg-cream-light"
          >
            <X size={20} />
          </button>
        </header>

        {items.length === 0 ? (
          <EmptyState
            icon={Handbag}
            title="Sua sacola está vazia"
            description="Explore nossa vitrine e encontre a bolsa ideal para o seu próximo momento."
            action={{ label: 'Ver vitrine', onClick: () => { closeCart(); navigate('/catalogo'); } }}
            className="flex-1"
          />
        ) : (
          <>
            <ul className="flex-1 divide-y divide-border overflow-y-auto px-5">
              {items.map((item) => (
                <li key={item.id} className="flex gap-4 py-4">
                  <Link
                    to={`/produto/${item.slug}`}
                    onClick={closeCart}
                    className="h-24 w-20 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-cream-light"
                  >
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                  </Link>
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        to={`/produto/${item.slug}`}
                        onClick={closeCart}
                        className="text-sm font-medium leading-snug text-graphite hover:text-cinnamon"
                      >
                        {item.name}
                      </Link>
                      <button
                        onClick={() => removeItem(item.id)}
                        aria-label={`Remover ${item.name}`}
                        className="tactile rounded p-1 text-store-gray hover:text-danger"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                    <p className="mt-0.5 text-xs text-graphite-soft">
                      {item.colorName}
                      {item.sizeLabel ? ` · ${item.sizeLabel}` : ''}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center rounded-full border border-border">
                        <button
                          onClick={() => setQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          aria-label="Diminuir quantidade"
                          className="tactile grid h-8 w-8 place-items-center rounded-full text-graphite disabled:opacity-40"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-7 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => setQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.maxStock}
                          aria-label="Aumentar quantidade"
                          className="tactile grid h-8 w-8 place-items-center rounded-full text-graphite disabled:opacity-40"
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

            <footer className="border-t border-border px-5 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-graphite-soft">Subtotal</span>
                <span className="font-display text-xl text-graphite">{formatPrice(subtotal)}</span>
              </div>
              <p className="mt-1 text-xs text-graphite-soft">
                Frete e cupom calculados no checkout.
              </p>
              <Button fullWidth size="lg" className="mt-4" onClick={goCheckout}>
                Finalizar compra
              </Button>
              <ButtonLink
                to="/carrinho"
                variant="ghost"
                fullWidth
                className="mt-1"
                onClick={closeCart}
              >
                Ver sacola completa
              </ButtonLink>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
