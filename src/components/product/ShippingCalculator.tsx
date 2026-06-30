import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Truck } from '@phosphor-icons/react';
import { cartService } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { formatPrice, formatZip } from '@/lib/utils';
import type { ShippingOption } from '@/types';

/**
 * Calculadora de frete por CEP. O front apenas exibe as opcoes retornadas pela
 * API (PLANEJAMENTO.md secao 8). Inclui estados de loading/erro.
 */
export function ShippingCalculator({
  subtotalCents,
  onSelect,
}: {
  subtotalCents: number;
  onSelect?: (option: ShippingOption) => void;
}) {
  const [zip, setZip] = useState('');

  const quote = useMutation({
    mutationFn: () => cartService.quoteShipping(zip, subtotalCents),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (zip.replace(/\D/g, '').length === 8) quote.mutate();
  };

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-cream-light/50 p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-graphite">
        <Truck size={18} className="text-terracotta" /> Calcular frete e prazo
      </p>
      <form onSubmit={submit} className="flex gap-2">
        <Input
          inputMode="numeric"
          placeholder="00000-000"
          value={zip}
          onChange={(e) => setZip(formatZip(e.target.value))}
          aria-label="CEP de entrega"
          className="flex-1"
        />
        <Button type="submit" variant="outline" loading={quote.isPending} disabled={zip.replace(/\D/g, '').length !== 8} className="shrink-0">
          Calcular
        </Button>
      </form>

      <a
        href="https://buscacepinter.correios.com.br/app/endereco/index.php"
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-block text-xs text-cinnamon underline"
      >
        Não sei meu CEP
      </a>

      {quote.isError && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {(quote.error as Error).message}. Verifique o CEP e tente novamente.
        </p>
      )}

      {quote.data && (
        <ul className="mt-3 flex flex-col divide-y divide-border">
          {quote.data.map((opt) => (
            <li key={opt.id}>
              <button
                onClick={() => onSelect?.(opt)}
                className="flex w-full items-center justify-between py-2.5 text-left text-sm hover:text-terracotta"
              >
                <span>
                  <span className="font-medium text-graphite">{opt.service}</span>
                  <span className="block text-xs text-graphite-soft">até {opt.etaDays} dias úteis</span>
                </span>
                <span className="font-semibold text-graphite">
                  {opt.priceCents === 0 ? 'Grátis' : formatPrice(opt.priceCents)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
