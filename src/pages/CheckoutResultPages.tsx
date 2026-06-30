import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CheckCircle, Copy, Clock, QrCode } from '@phosphor-icons/react';
import type { CheckoutResult } from '@/lib/api';
import { checkoutService } from '@/lib/api';
import { Container } from '@/components/ui/Layout';
import { Button, ButtonLink } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { formatPrice } from '@/lib/utils';

function useResult(): CheckoutResult | null {
  const location = useLocation();
  return (location.state as { result?: CheckoutResult } | null)?.result ?? null;
}

export function CheckoutSuccessPage() {
  const result = useResult();
  return (
    <Container className="py-16">
      <div className="mx-auto flex max-w-lg flex-col items-center text-center">
        <span className="grid h-20 w-20 place-items-center rounded-full bg-success-soft text-success">
          <CheckCircle size={44} weight="fill" />
        </span>
        <h1 className="mt-6 font-display text-3xl text-graphite">Pedido confirmado!</h1>
        <p className="mt-3 text-graphite-soft">
          {result ? (
            <>Seu pedido <strong className="text-graphite">{result.order.number}</strong> foi recebido e o pagamento aprovado. Enviamos os detalhes para o seu e-mail.</>
          ) : (
            'Seu pedido foi recebido com sucesso.'
          )}
        </p>

        {result && (
          <div className="mt-6 w-full rounded-[var(--radius-xl)] border border-border bg-surface p-5 text-left">
            <div className="flex justify-between text-sm">
              <span className="text-graphite-soft">Total pago</span>
              <span className="font-display text-xl text-graphite">{formatPrice(result.order.totalCents)}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-graphite-soft">Entrega</span>
              <span className="text-graphite">{result.order.shipping.service} · até {result.order.shipping.etaDays} dias úteis</span>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink to="/minha-conta/pedidos" size="lg">Acompanhar pedido</ButtonLink>
          <ButtonLink to="/catalogo" size="lg" variant="outline">Continuar comprando</ButtonLink>
        </div>
      </div>
    </Container>
  );
}

export function CheckoutPendingPage() {
  const result = useResult();
  const [status, setStatus] = useState<'pending' | 'paid'>('pending');

  // Polling simulado do status de pagamento (no real, webhook confirma).
  useEffect(() => {
    if (!result) return;
    let active = true;
    const poll = async () => {
      const { status: s } = await checkoutService.getPaymentStatus(result.order.id);
      if (active && s === 'paid') setStatus('paid');
    };
    const t = setTimeout(poll, 4000);
    return () => { active = false; clearTimeout(t); };
  }, [result]);

  const copyPix = () => {
    if (result?.pixCode) {
      navigator.clipboard?.writeText(result.pixCode);
      toast.success('Código Pix copiado');
    }
  };

  if (status === 'paid') {
    return (
      <Container className="py-16">
        <div className="mx-auto flex max-w-lg flex-col items-center text-center">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-success-soft text-success">
            <CheckCircle size={44} weight="fill" />
          </span>
          <h1 className="mt-6 font-display text-3xl text-graphite">Pagamento aprovado!</h1>
          <p className="mt-3 text-graphite-soft">Recebemos seu Pix. Seu pedido {result?.order.number} já está em preparação.</p>
          <ButtonLink to="/minha-conta/pedidos" size="lg" className="mt-8">Acompanhar pedido</ButtonLink>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-16">
      <div className="mx-auto flex max-w-lg flex-col items-center text-center">
        <span className="grid h-20 w-20 place-items-center rounded-full bg-warning-soft text-warning">
          <Clock size={44} weight="fill" />
        </span>
        <h1 className="mt-6 font-display text-3xl text-graphite">Aguardando pagamento</h1>
        <p className="mt-3 text-graphite-soft">
          Pague com Pix para confirmar seu pedido {result?.order.number}. A confirmação é automática
          {result?.pixExpiresInMin ? ` e o código expira em ${result.pixExpiresInMin} minutos.` : '.'}
        </p>

        <div className="mt-8 grid h-48 w-48 place-items-center rounded-[var(--radius-xl)] border border-border bg-surface text-store-gray">
          <QrCode size={120} weight="thin" />
        </div>

        {result?.pixCode && (
          <div className="mt-6 w-full">
            <p className="mb-2 text-sm font-medium text-graphite">Pix copia-e-cola</p>
            <div className="flex gap-2">
              <code className="flex-1 truncate rounded-[var(--radius-md)] border border-border bg-cream-light px-3 py-2.5 text-left text-xs text-graphite-soft">
                {result.pixCode}
              </code>
              <Button variant="outline" onClick={copyPix}><Copy size={18} /> Copiar</Button>
            </div>
          </div>
        )}

        <p className="mt-6 flex items-center gap-2 text-sm text-graphite-soft">
          <Clock size={16} className="animate-pulse" /> Verificando pagamento automaticamente…
        </p>
        <ButtonLink to="/minha-conta/pedidos" variant="ghost" className="mt-2">Ver meus pedidos</ButtonLink>
      </div>
    </Container>
  );
}
