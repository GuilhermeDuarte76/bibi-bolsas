import { Barcode, CreditCard, Lightning } from '@phosphor-icons/react';
import type { PaymentMethod } from '@/types';
import { Select } from '@/components/ui/Field';
import { applyPix, formatInstallment, formatPrice } from '@/lib/utils';
import { cn } from '@/lib/utils';

const METHODS: { id: PaymentMethod; label: string; desc: string; icon: typeof Lightning }[] = [
  { id: 'pix', label: 'Pix', desc: 'Aprovação imediata · 5% de desconto', icon: Lightning },
  { id: 'credit_card', label: 'Cartão de crédito', desc: 'Em até 10x sem juros', icon: CreditCard },
  { id: 'boleto', label: 'Boleto', desc: 'Compensação em até 2 dias úteis', icon: Barcode },
];

export function PaymentMethodSelector({
  value,
  onChange,
  totalCents,
  installments,
  onInstallmentsChange,
  maxInstallments = 10,
  pixPct = 5,
}: {
  value: PaymentMethod;
  onChange: (m: PaymentMethod) => void;
  totalCents: number;
  installments: number;
  onInstallmentsChange: (n: number) => void;
  maxInstallments?: number;
  pixPct?: number;
}) {
  return (
    <div className="flex flex-col gap-3">
      {METHODS.map((m) => {
        const active = value === m.id;
        const Icon = m.icon;
        return (
          <div key={m.id} className={cn('rounded-[var(--radius-lg)] border transition-colors', active ? 'border-terracotta bg-terracotta/5' : 'border-border')}>
            <button
              type="button"
              onClick={() => onChange(m.id)}
              className="flex w-full items-center gap-3 p-4 text-left"
              aria-pressed={active}
            >
              <span className={cn('grid h-10 w-10 place-items-center rounded-full', active ? 'bg-terracotta text-cream-light' : 'bg-cream text-cinnamon')}>
                <Icon size={20} />
              </span>
              <span className="flex-1">
                <span className="block font-medium text-graphite">{m.label}</span>
                <span className="block text-xs text-graphite-soft">{m.desc}</span>
              </span>
              <span className={cn('grid h-5 w-5 place-items-center rounded-full border', active ? 'border-terracotta' : 'border-border')}>
                {active && <span className="h-2.5 w-2.5 rounded-full bg-terracotta" />}
              </span>
            </button>

            {active && m.id === 'pix' && (
              <div className="border-t border-terracotta/20 px-4 py-3 text-sm">
                <p className="text-graphite">
                  Total no Pix:{' '}
                  <strong className="text-success">{formatPrice(applyPix(totalCents, pixPct))}</strong>
                </p>
                <p className="mt-1 text-xs text-graphite-soft">
                  Após confirmar, você verá o QR Code e o código copia-e-cola.
                </p>
              </div>
            )}

            {active && m.id === 'credit_card' && (
              <div className="border-t border-terracotta/20 px-4 py-3">
                <label className="text-sm text-graphite">
                  Parcelas
                  <Select
                    value={installments}
                    onChange={(e) => onInstallmentsChange(Number(e.target.value))}
                    className="mt-1.5"
                    aria-label="Número de parcelas"
                  >
                    {Array.from({ length: maxInstallments }).map((_, i) => (
                      <option key={i} value={i + 1}>
                        {i === 0 ? `À vista — ${formatPrice(totalCents)}` : formatInstallment(totalCents, i + 1) + ' sem juros'}
                      </option>
                    ))}
                  </Select>
                </label>
                <p className="mt-2 text-xs text-graphite-soft">
                  Os dados do cartão serão inseridos com segurança no provedor de pagamento.
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
