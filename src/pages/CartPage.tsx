import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Handbag, Minus, Plus, Tag, Trash, X } from '@phosphor-icons/react';
import { useCart } from '@/store/cart';
import { cartService } from '@/lib/api';
import { toast } from '@/components/ui/Toast';
import { Container } from '@/components/ui/Layout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/States';
import { ShippingCalculator } from '@/components/product/ShippingCalculator';
import { formatPrice } from '@/lib/utils';

export function CartPage() {
  const navigate = useNavigate();
  const cart = useCart();
  const { items, coupon, shipping, setCoupon, setShipping, removeItem, setQuantity } = cart;
  const subtotal = cart.subtotalCents();
  const discount = cart.discountCents();
  const shippingCents = cart.shippingCents();
  const total = cart.totalCents();
  const [code, setCode] = useState('');

  const applyCoupon = useMutation({
    mutationFn: () => cartService.applyCoupon(code, subtotal),
    onSuccess: (c) => {
      setCoupon(c);
      toast.success(`Cupom ${c.code} aplicado`);
      setCode('');
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (items.length === 0) {
    return (
      <Container className="py-16">
        <EmptyState
          icon={Handbag}
          title="Sua sacola está vazia"
          description="Que tal explorar nossa vitrine e encontrar a bolsa ideal para o seu próximo momento?"
          action={{ label: 'Explorar vitrine', onClick: () => navigate('/catalogo') }}
        />
      </Container>
    );
  }

  return (
    <Container className="py-10">
      <h1 className="mb-8 font-display text-3xl text-graphite sm:text-4xl">Sua sacola</h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:gap-10">
        {/* Itens */}
        <div>
          <ul className="divide-y divide-border border-y border-border">
            {items.map((item) => (
              <li key={item.id} className="flex gap-4 py-5">
                <Link to={`/produto/${item.slug}`} className="h-24 w-20 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-cream-light sm:h-28 sm:w-24">
                  <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                </Link>
                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link to={`/produto/${item.slug}`} className="font-medium text-graphite hover:text-cinnamon">
                        {item.name}
                      </Link>
                      <p className="mt-0.5 text-sm text-graphite-soft">
                        {item.colorName}
                        {item.sizeLabel ? ` · ${item.sizeLabel}` : ''}
                      </p>
                    </div>
                    <button onClick={() => removeItem(item.id)} aria-label={`Remover ${item.name}`} className="tactile rounded p-1 text-store-gray hover:text-danger">
                      <Trash size={18} />
                    </button>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <div className="flex items-center rounded-full border border-border">
                      <button onClick={() => setQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1} aria-label="Diminuir" className="tactile grid h-9 w-9 place-items-center rounded-full disabled:opacity-40">
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button onClick={() => setQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= item.maxStock} aria-label="Aumentar" className="tactile grid h-9 w-9 place-items-center rounded-full disabled:opacity-40">
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-graphite">{formatPrice(item.unitPriceCents * item.quantity)}</p>
                      {item.quantity > 1 && <p className="text-xs text-graphite-soft">{formatPrice(item.unitPriceCents)} cada</p>}
                    </div>
                  </div>
                  {item.quantity >= item.maxStock && (
                    <p className="mt-2 text-xs text-warning">Quantidade máxima em estoque atingida.</p>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <Link to="/catalogo" className="mt-6 inline-block text-sm font-medium text-terracotta hover:underline">
            ← Continuar comprando
          </Link>
        </div>

        {/* Resumo */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6">
            <h2 className="font-display text-xl text-graphite">Resumo do pedido</h2>

            {/* Cupom */}
            <div className="mt-5">
              {coupon ? (
                <div className="flex items-center justify-between rounded-[var(--radius-md)] bg-success-soft px-3 py-2.5 text-sm">
                  <span className="flex items-center gap-2 font-medium text-success">
                    <Tag size={16} /> {coupon.code}
                  </span>
                  <button onClick={() => setCoupon(undefined)} aria-label="Remover cupom" className="tactile rounded p-1 text-success hover:bg-success/10">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => { e.preventDefault(); if (code.trim()) applyCoupon.mutate(); }}
                  className="flex gap-2"
                >
                  <Input
                    placeholder="Cupom de desconto"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    aria-label="Código do cupom"
                  />
                  <Button type="submit" variant="outline" loading={applyCoupon.isPending} disabled={!code.trim()}>
                    Aplicar
                  </Button>
                </form>
              )}
            </div>

            {/* Frete */}
            <div className="mt-4">
              <ShippingCalculator
                subtotalCents={subtotal}
                onSelect={(opt) => { setShipping(opt); toast.success(`Frete ${opt.service} selecionado`); }}
              />
              {shipping && (
                <p className="mt-2 text-sm text-graphite-soft">
                  Entrega: <strong className="text-graphite">{shipping.service}</strong> ({shipping.priceCents === 0 ? 'grátis' : formatPrice(shipping.priceCents)})
                </p>
              )}
            </div>

            {/* Totais */}
            <dl className="mt-5 flex flex-col gap-2 border-t border-border pt-5 text-sm">
              <Row label="Subtotal" value={formatPrice(subtotal)} />
              {discount > 0 && <Row label="Desconto" value={`- ${formatPrice(discount)}`} accent="success" />}
              <Row label="Frete" value={shipping ? (shippingCents === 0 ? 'Grátis' : formatPrice(shippingCents)) : 'Calcular'} muted={!shipping} />
            </dl>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <span className="font-medium text-graphite">Total</span>
              <span className="font-display text-2xl text-graphite">{formatPrice(total)}</span>
            </div>

            <Button fullWidth size="lg" className="mt-5" onClick={() => navigate('/checkout')}>
              Finalizar compra
            </Button>
            <p className="mt-3 text-center text-xs text-graphite-soft">
              Frete e cupom são recalculados com segurança no checkout.
            </p>
          </div>
        </aside>
      </div>
    </Container>
  );
}

function Row({ label, value, accent, muted }: { label: string; value: string; accent?: 'success'; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-graphite-soft">{label}</dt>
      <dd className={accent === 'success' ? 'font-medium text-success' : muted ? 'text-graphite-soft' : 'text-graphite'}>{value}</dd>
    </div>
  );
}
