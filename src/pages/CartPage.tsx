import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { Handbag, Info, Minus, Plus, Tag, Trash, Warning, X } from '@phosphor-icons/react';
import { useCart } from '@/store/cart';
import { cartService } from '@/lib/api';
import { USE_MOCK } from '@/lib/api/config';
import { toast } from '@/components/ui/Toast';
import { Container } from '@/components/ui/Layout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/States';
import { usePageMeta } from '@/hooks/usePageMeta';
import { ShippingCalculator } from '@/components/product/ShippingCalculator';
import { analytics } from '@/lib/analytics';
import { STORE } from '@/lib/store-info';
import { cn, formatPrice } from '@/lib/utils';
import type { CartItem } from '@/types';

export function CartPage() {
  usePageMeta({ title: 'Sua sacola', noIndex: true });

  const navigate = useNavigate();
  const cart = useCart();
  const { items, coupon, shipping, setCoupon, setShipping, removeItem, setQuantity } = cart;
  const validate = useCart((state) => state.validate);
  const subtotal = cart.subtotalCents();
  const discount = cart.discountCents();
  const shippingCents = cart.shippingCents();
  const total = cart.totalCents();
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);

  /*
   * Revalida a sacola ao abrir: preco e estoque mudam entre a adicao e a
   * compra. O backend ja devolve esses avisos em POST /api/carrinho/validar —
   * antes a tela simplesmente ignorava, e a cliente descobria no checkout.
   */
  useEffect(() => {
    if (USE_MOCK || items.length === 0) return;
    setChecking(true);
    void validate()
      .catch(() => toast.error('Não foi possível conferir a disponibilidade agora.'))
      .finally(() => setChecking(false));
    // Roda uma vez por visita a esta tela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyCoupon = useMutation({
    mutationFn: () => cartService.applyCoupon(code, subtotal),
    onSuccess: (applied) => {
      setCoupon(applied);
      toast.success(`Cupom ${applied.code} aplicado`);
      setCode('');
    },
    onError: (error) => toast.error((error as Error).message),
  });

  // `view_cart` uma vez por visita a tela.
  const cartReported = useRef(false);
  useEffect(() => {
    if (cartReported.current || items.length === 0) return;
    cartReported.current = true;
    analytics.viewCart(items);
  }, [items]);

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

  if (items.length === 0) {
    return (
      <Container className="py-section">
        <EmptyState
          icon={Handbag}
          title="Sua sacola está vazia"
          description="Que tal explorar nossa vitrine e encontrar a bolsa ideal para o seu próximo momento?"
          action={{ label: 'Explorar vitrine', onClick: () => navigate('/catalogo') }}
        />
      </Container>
    );
  }

  const blockedItems = items.filter((item) => item.isAvailable === false);
  const canCheckout = blockedItems.length === 0;

  return (
    <Container className="py-section-sm">
      <h1 className="font-display text-display-lg text-graphite">Sua sacola</h1>

      <CartAlerts
        checking={checking}
        blockedCount={blockedItems.length}
        hasPriceChanges={cart.hasPriceChanges}
        messages={cart.messages}
      />

      <div className="mt-7 grid gap-8 lg:grid-cols-[1fr_380px] lg:gap-10">
        <div>
          <ul className="divide-y divide-border border-y border-border">
            {items.map((item) => (
              <CartLine
                key={item.id}
                item={item}
                onRemove={() => safeRemove(item.id)}
                onQuantity={(quantity) => safeSetQuantity(item.id, quantity)}
              />
            ))}
          </ul>

          <Link
            to="/catalogo"
            className="mt-6 inline-flex min-h-touch items-center text-sm font-medium text-terracotta hover:underline"
          >
            ← Continuar comprando
          </Link>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-5 sm:p-6">
            <h2 className="font-display text-display-xs text-graphite">Resumo do pedido</h2>

            {USE_MOCK ? (
              <div className="mt-5">
                {coupon ? (
                  <div className="flex items-center justify-between rounded-[var(--radius-md)] bg-success-soft px-3 py-2.5 text-sm">
                    <span className="flex items-center gap-2 font-medium text-success">
                      <Tag size={16} aria-hidden /> {coupon.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCoupon(undefined)}
                      aria-label="Remover cupom"
                      className="tactile rounded p-1 text-success hover:bg-success/10"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (code.trim()) applyCoupon.mutate();
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      placeholder="Cupom de desconto"
                      value={code}
                      onChange={(event) => setCode(event.target.value.toUpperCase())}
                      aria-label="Código do cupom"
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      loading={applyCoupon.isPending}
                      disabled={!code.trim()}
                    >
                      Aplicar
                    </Button>
                  </form>
                )}
              </div>
            ) : (
              /* Por regra do backend, cupom e frete so existem no checkout —
                 melhor explicar do que oferecer um campo que nao vale aqui. */
              <p className="mt-5 flex items-start gap-2 rounded-[var(--radius-md)] bg-cream-light px-3 py-2.5 text-sm text-graphite-soft">
                <Info size={16} className="mt-0.5 shrink-0 text-cinnamon" aria-hidden />
                Cupom e frete são calculados no checkout, com o seu endereço.
              </p>
            )}

            {USE_MOCK && (
              <div className="mt-4">
                <ShippingCalculator
                  subtotalCents={subtotal}
                  onSelect={(option) => {
                    setShipping(option);
                    toast.success(`Frete ${option.service} selecionado`);
                  }}
                />
              </div>
            )}

            <dl className="mt-5 flex flex-col gap-2 border-t border-border pt-5 text-sm">
              <Row label="Subtotal" value={formatPrice(subtotal)} />
              {discount > 0 && (
                <Row label="Desconto" value={`- ${formatPrice(discount)}`} accent="success" />
              )}
              <Row
                label="Frete"
                value={
                  shipping
                    ? shippingCents === 0
                      ? 'Grátis'
                      : formatPrice(shippingCents)
                    : 'Calculado no checkout'
                }
                muted={!shipping}
              />
            </dl>

            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <span className="font-medium text-graphite">Total</span>
              <span className="font-display text-display-sm text-graphite">
                {formatPrice(total)}
              </span>
            </div>

            {subtotal < STORE.freeShippingThresholdCents && (
              <p className="mt-3 text-xs text-graphite-soft">
                Faltam {formatPrice(STORE.freeShippingThresholdCents - subtotal)} para frete grátis.
              </p>
            )}

            <Button
              fullWidth
              size="lg"
              className="mt-5"
              disabled={!canCheckout}
              onClick={() => {
                analytics.beginCheckout(items, coupon?.code);
                navigate('/checkout');
              }}
            >
              Finalizar compra
            </Button>

            {!canCheckout && (
              <p className="mt-2 text-center text-xs text-danger">
                Remova {blockedItems.length === 1 ? 'o item indisponível' : 'os itens indisponíveis'}{' '}
                para continuar.
              </p>
            )}
          </div>
        </aside>
      </div>
    </Container>
  );
}

/** Avisos do backend no topo: o que mudou desde que a sacola foi montada. */
function CartAlerts({
  checking,
  blockedCount,
  hasPriceChanges,
  messages,
}: {
  checking: boolean;
  blockedCount: number;
  hasPriceChanges: boolean;
  messages: string[];
}) {
  if (checking) {
    return (
      <p className="mt-4 text-sm text-graphite-soft">Conferindo preços e disponibilidade…</p>
    );
  }

  const hasAlert = blockedCount > 0 || hasPriceChanges || messages.length > 0;
  if (!hasAlert) return null;

  return (
    <div className="mt-5 flex flex-col gap-2" role="status">
      {blockedCount > 0 && (
        <Alert tone="danger">
          {blockedCount === 1
            ? 'Um item da sua sacola ficou indisponível.'
            : `${blockedCount} itens da sua sacola ficaram indisponíveis.`}{' '}
          Remova para continuar.
        </Alert>
      )}
      {hasPriceChanges && (
        <Alert tone="warning">
          O preço de um ou mais itens mudou desde que você adicionou. Os valores abaixo já estão
          atualizados.
        </Alert>
      )}
      {messages.map((message) => (
        <Alert key={message} tone="warning">
          {message}
        </Alert>
      ))}
    </div>
  );
}

function Alert({ tone, children }: { tone: 'danger' | 'warning'; children: React.ReactNode }) {
  return (
    <p
      className={cn(
        'flex items-start gap-2 rounded-[var(--radius-md)] px-4 py-3 text-sm',
        tone === 'danger' ? 'bg-danger-soft text-danger' : 'bg-warning-soft text-warning',
      )}
    >
      <Warning size={18} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

function CartLine({
  item,
  onRemove,
  onQuantity,
}: {
  item: CartItem;
  onRemove: () => void;
  onQuantity: (quantity: number) => void;
}) {
  const unavailable = item.isAvailable === false;
  const outOfStock = item.maxStock === 0;

  return (
    <li className={cn('flex gap-4 py-5', unavailable && 'opacity-70')}>
      <Link
        to={`/produto/${item.slug}`}
        className="relative h-24 w-20 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-cream-light sm:h-28 sm:w-24"
      >
        <img
          src={item.image}
          alt={item.name}
          loading="lazy"
          className={cn('h-full w-full object-cover', unavailable && 'grayscale')}
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              to={`/produto/${item.slug}`}
              className="font-medium text-graphite hover:text-cinnamon"
            >
              {item.name}
            </Link>
            <p className="mt-0.5 text-sm text-graphite-soft">
              {item.colorName}
              {item.sizeLabel ? ` · ${item.sizeLabel}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remover ${item.name}`}
            className="tactile hit-area relative -mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-store-gray hover:text-danger"
          >
            <Trash size={18} />
          </button>
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
          {unavailable || outOfStock ? (
            <span className="rounded-full bg-danger-soft px-3 py-1 text-xs font-medium text-danger">
              Indisponível
            </span>
          ) : (
            <div className="flex items-center rounded-full border border-border">
              <button
                type="button"
                onClick={() => onQuantity(item.quantity - 1)}
                disabled={item.quantity <= 1}
                aria-label="Diminuir quantidade"
                className="tactile grid h-9 w-9 place-items-center rounded-full disabled:opacity-40"
              >
                <Minus size={14} />
              </button>
              <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
              <button
                type="button"
                onClick={() => onQuantity(item.quantity + 1)}
                disabled={item.quantity >= item.maxStock}
                aria-label="Aumentar quantidade"
                className="tactile grid h-9 w-9 place-items-center rounded-full disabled:opacity-40"
              >
                <Plus size={14} />
              </button>
            </div>
          )}

          <div className="text-right">
            <p className="font-semibold text-graphite">
              {formatPrice(item.unitPriceCents * item.quantity)}
            </p>
            {item.quantity > 1 && (
              <p className="text-xs text-graphite-soft">{formatPrice(item.unitPriceCents)} cada</p>
            )}
          </div>
        </div>

        {item.hasPriceChanged && !unavailable && (
          <p className="mt-2 text-xs font-medium text-warning">
            O preço deste item mudou desde que você adicionou.
          </p>
        )}

        {!unavailable && !outOfStock && item.quantity >= item.maxStock && (
          <p className="mt-2 text-xs text-warning">Quantidade máxima em estoque atingida.</p>
        )}

        {item.messages?.map((message) => (
          <p key={message} className="mt-2 text-xs text-graphite-soft">
            {message}
          </p>
        ))}
      </div>
    </li>
  );
}

function Row({
  label,
  value,
  accent,
  muted,
}: {
  label: string;
  value: string;
  accent?: 'success';
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-graphite-soft">{label}</dt>
      <dd
        className={cn(
          'text-right',
          accent === 'success' ? 'font-medium text-success' : muted ? 'text-graphite-soft' : 'text-graphite',
        )}
      >
        {value}
      </dd>
    </div>
  );
}
