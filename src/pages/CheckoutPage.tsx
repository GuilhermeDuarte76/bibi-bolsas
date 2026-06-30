import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CaretLeft, Lightning, MapPin, Plus, ShieldCheck } from '@phosphor-icons/react';
import { useCart } from '@/store/cart';
import {
  accountService,
  cartService,
  checkoutService,
  queryKeys,
  type CheckoutResult,
} from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { identitySchema, type IdentityFormValues } from '@/lib/validation';
import type { Address, PaymentMethod, ShippingOption } from '@/types';
import { Container } from '@/components/ui/Layout';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/States';
import { CheckoutStepper } from '@/components/checkout/CheckoutStepper';
import { OrderSummary } from '@/components/checkout/OrderSummary';
import { AddressForm } from '@/components/checkout/AddressForm';
import { PaymentMethodSelector } from '@/components/checkout/PaymentMethodSelector';
import { toast } from '@/components/ui/Toast';
import { formatCpf, formatPhone, formatPrice, formatZip } from '@/lib/utils';

export function CheckoutPage() {
  const navigate = useNavigate();
  const cart = useCart();
  const { customer } = useAuth();
  const [step, setStep] = useState(0);

  const [identity, setIdentity] = useState<IdentityFormValues | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [shipping, setShipping] = useState<ShippingOption | null>(cart.shipping ?? null);
  const [payment, setPayment] = useState<PaymentMethod>('pix');
  const [installments, setInstallments] = useState(1);

  const subtotal = cart.subtotalCents();
  const discount = cart.discountCents();
  const total = Math.max(0, subtotal - discount) + (shipping?.priceCents ?? 0);

  if (cart.items.length === 0) {
    return (
      <Container className="py-16">
        <EmptyState
          title="Nada para finalizar"
          description="Sua sacola está vazia. Adicione produtos antes de ir ao checkout."
          action={{ label: 'Ver vitrine', onClick: () => navigate('/catalogo') }}
        />
      </Container>
    );
  }

  const goNext = () => setStep((s) => Math.min(4, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  return (
    <Container className="py-10">
      <div className="mx-auto max-w-5xl">
        <button onClick={() => (step === 0 ? navigate('/carrinho') : goBack())} className="mb-6 flex items-center gap-1 text-sm font-medium text-graphite-soft hover:text-graphite">
          <CaretLeft size={16} /> Voltar
        </button>

        <CheckoutStepper current={step} />

        <div className="mt-8 grid gap-8 lg:mt-10 lg:grid-cols-[1fr_360px] lg:gap-10">
          <div className="min-w-0">
            {step === 0 && (
              <IdentityStep
                customer={customer}
                onSubmit={(v) => { setIdentity(v); goNext(); }}
              />
            )}
            {step === 1 && (
              <AddressStep
                selected={address}
                onSelect={(a) => { setAddress(a); goNext(); }}
              />
            )}
            {step === 2 && address && (
              <ShippingStep
                address={address}
                subtotalCents={Math.max(0, subtotal - discount)}
                selected={shipping}
                onSelect={(s) => { setShipping(s); cart.setShipping(s, address.zip); goNext(); }}
              />
            )}
            {step === 3 && (
              <div>
                <h2 className="mb-5 font-display text-2xl text-graphite">Pagamento</h2>
                <PaymentMethodSelector
                  value={payment}
                  onChange={setPayment}
                  totalCents={total}
                  installments={installments}
                  onInstallmentsChange={setInstallments}
                />
                <Button size="lg" className="mt-6" onClick={goNext}>Revisar pedido</Button>
              </div>
            )}
            {step === 4 && identity && address && shipping && (
              <ReviewStep
                identity={identity}
                address={address}
                shipping={shipping}
                payment={payment}
                installments={installments}
              />
            )}
          </div>

          {/* Resumo */}
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <OrderSummary
              items={cart.items}
              subtotalCents={subtotal}
              discountCents={discount}
              shippingCents={shipping?.priceCents ?? 0}
              totalCents={total}
              shippingLabel={shipping?.service}
              couponCode={cart.coupon?.code}
            />
            <p className="mt-3 flex items-center justify-center gap-2 text-xs text-graphite-soft">
              <ShieldCheck size={16} className="text-success" /> Ambiente seguro e criptografado
            </p>
          </aside>
        </div>
      </div>
    </Container>
  );
}

// ---- Etapa 1: Identificacao ----
function IdentityStep({ customer, onSubmit }: { customer: ReturnType<typeof useAuth>['customer']; onSubmit: (v: IdentityFormValues) => void }) {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<IdentityFormValues>({
    resolver: zodResolver(identitySchema),
    defaultValues: {
      name: customer?.name ?? '',
      email: customer?.email ?? '',
      phone: customer?.phone ?? '',
      document: customer?.document ?? '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <h2 className="font-display text-2xl text-graphite">Identificação</h2>
      {!customer && (
        <p className="text-sm text-graphite-soft">
          Já tem conta? <a href="/entrar" className="font-medium text-terracotta hover:underline">Entrar</a> para um checkout mais rápido. É opcional.
        </p>
      )}
      <Field label="Nome completo" error={errors.name?.message} required>
        {(id, d) => <Input id={id} aria-describedby={d} {...register('name')} />}
      </Field>
      <Field label="E-mail" error={errors.email?.message} required>
        {(id, d) => <Input id={id} type="email" aria-describedby={d} {...register('email')} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Telefone / WhatsApp" error={errors.phone?.message} required>
          {(id, d) => <Input id={id} inputMode="numeric" aria-describedby={d} placeholder="(11) 99999-9999" {...register('phone', { onChange: (e) => setValue('phone', formatPhone(e.target.value)) })} />}
        </Field>
        <Field label="CPF" error={errors.document?.message} required hint="Necessário para a nota fiscal">
          {(id, d) => <Input id={id} inputMode="numeric" aria-describedby={d} placeholder="000.000.000-00" {...register('document', { onChange: (e) => setValue('document', formatCpf(e.target.value)) })} />}
        </Field>
      </div>
      <Button type="submit" size="lg" className="mt-2 self-start">Continuar</Button>
    </form>
  );
}

// ---- Etapa 2: Endereco ----
function AddressStep({ selected, onSelect }: { selected: Address | null; onSelect: (a: Address) => void }) {
  const { data: addresses, isLoading } = useQuery({ queryKey: queryKeys.addresses, queryFn: () => accountService.listAddresses() });
  const [adding, setAdding] = useState(false);
  const save = useMutation({ mutationFn: accountService.saveAddress });

  return (
    <div>
      <h2 className="mb-5 font-display text-2xl text-graphite">Endereço de entrega</h2>

      {isLoading ? (
        <p className="text-sm text-graphite-soft">Carregando endereços…</p>
      ) : adding || !addresses?.length ? (
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-5">
          <AddressForm
            submitting={save.isPending}
            onSubmit={async (values) => {
              const saved = await save.mutateAsync({ ...values, complement: values.complement ?? '' });
              setAdding(false);
              onSelect(saved);
            }}
          />
          {!!addresses?.length && (
            <button onClick={() => setAdding(false)} className="mt-3 text-sm text-graphite-soft hover:text-graphite">
              Usar endereço salvo
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {addresses.map((a) => (
            <button
              key={a.id}
              onClick={() => onSelect(a)}
              className={`flex items-start gap-3 rounded-[var(--radius-lg)] border p-4 text-left transition-colors ${selected?.id === a.id ? 'border-terracotta bg-terracotta/5' : 'border-border hover:border-graphite'}`}
            >
              <MapPin size={20} className="mt-0.5 shrink-0 text-cinnamon" />
              <span className="text-sm">
                <span className="font-medium text-graphite">{a.label}</span>
                <span className="block text-graphite-soft">
                  {a.street}, {a.number}{a.complement ? ` · ${a.complement}` : ''} — {a.district}, {a.city}/{a.state} · {formatZip(a.zip)}
                </span>
              </span>
            </button>
          ))}
          <button onClick={() => setAdding(true)} className="tactile flex items-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-border p-4 text-sm font-medium text-terracotta">
            <Plus size={18} /> Adicionar novo endereço
          </button>
        </div>
      )}
    </div>
  );
}

// ---- Etapa 3: Entrega ----
function ShippingStep({ address, subtotalCents, selected, onSelect }: { address: Address; subtotalCents: number; selected: ShippingOption | null; onSelect: (s: ShippingOption) => void }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['shipping', address.zip, subtotalCents],
    queryFn: () => cartService.quoteShipping(address.zip, subtotalCents),
  });
  const [pick, setPick] = useState<ShippingOption | null>(selected);

  return (
    <div>
      <h2 className="mb-2 font-display text-2xl text-graphite">Entrega</h2>
      <p className="mb-5 text-sm text-graphite-soft">Para {formatZip(address.zip)} · {address.city}/{address.state}</p>

      {isLoading ? (
        <p className="text-sm text-graphite-soft">Calculando opções de frete…</p>
      ) : isError ? (
        <div className="rounded-[var(--radius-lg)] border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
          Não foi possível calcular o frete agora.{' '}
          <button onClick={() => refetch()} className="font-semibold underline">Tentar novamente</button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {data!.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setPick(opt)}
              className={`flex items-center justify-between rounded-[var(--radius-lg)] border p-4 text-left ${pick?.id === opt.id ? 'border-terracotta bg-terracotta/5' : 'border-border hover:border-graphite'}`}
            >
              <span>
                <span className="font-medium text-graphite">{opt.carrier} · {opt.service}</span>
                <span className="block text-xs text-graphite-soft">até {opt.etaDays} dias úteis</span>
              </span>
              <span className="font-semibold text-graphite">{opt.priceCents === 0 ? 'Grátis' : formatPrice(opt.priceCents)}</span>
            </button>
          ))}
          <Button size="lg" className="mt-2 self-start" disabled={!pick} onClick={() => pick && onSelect(pick)}>
            Continuar para pagamento
          </Button>
        </div>
      )}
    </div>
  );
}

// ---- Etapa 4: Revisao ----
function ReviewStep({ identity, address, shipping, payment, installments }: { identity: IdentityFormValues; address: Address; shipping: ShippingOption; payment: PaymentMethod; installments: number }) {
  const navigate = useNavigate();
  const cart = useCart();

  const create = useMutation({
    mutationFn: () =>
      checkoutService.createOrder({
        cart: {
          id: cart.cartId,
          items: cart.items,
          coupon: cart.coupon,
          shipping,
          subtotalCents: cart.subtotalCents(),
          discountCents: cart.discountCents(),
          shippingCents: shipping.priceCents,
          totalCents: Math.max(0, cart.subtotalCents() - cart.discountCents()) + shipping.priceCents,
        },
        address,
        shipping,
        paymentMethod: payment,
        installments,
      }),
    onSuccess: (res: CheckoutResult) => {
      cart.clear();
      if (res.order.paymentMethod === 'pix') {
        navigate('/checkout/pagamento-pendente', { state: { result: res } });
      } else {
        navigate('/checkout/sucesso', { state: { result: res } });
      }
    },
    onError: () => toast.error('Não foi possível finalizar. Tente novamente.'),
  });

  const methodLabel = payment === 'pix' ? 'Pix' : payment === 'credit_card' ? `Cartão · ${installments}x` : 'Boleto';

  return (
    <div>
      <h2 className="mb-5 font-display text-2xl text-graphite">Revisão</h2>
      <div className="flex flex-col gap-4">
        <ReviewBlock title="Identificação" lines={[identity.name, identity.email, identity.phone]} />
        <ReviewBlock title="Entrega" lines={[`${address.street}, ${address.number}`, `${address.district} — ${address.city}/${address.state}`, `${shipping.carrier} · ${shipping.service} (até ${shipping.etaDays} dias úteis)`]} />
        <ReviewBlock title="Pagamento" lines={[methodLabel]} />
      </div>

      <Button size="lg" fullWidth className="mt-6" loading={create.isPending} onClick={() => create.mutate()}>
        <Lightning size={18} weight="fill" /> Confirmar e pagar
      </Button>
      <p className="mt-3 text-center text-xs text-graphite-soft">
        Ao confirmar, criamos seu pedido. O pagamento é confirmado de forma segura pelo provedor.
      </p>
    </div>
  );
}

function ReviewBlock({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-cinnamon">{title}</p>
      {lines.map((l, i) => (
        <p key={i} className={i === 0 ? 'mt-1 font-medium text-graphite' : 'text-sm text-graphite-soft'}>{l}</p>
      ))}
    </div>
  );
}
