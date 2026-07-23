import { forwardRef, useEffect, useRef, useState } from 'react';
import { Minus, Plus } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

const wrapBase =
  'flex items-center overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface transition-colors focus-within:border-terracotta focus-within:ring-2 focus-within:ring-terracotta/20';
const wrapDisabled = 'bg-cream-light opacity-70';

function fmt(value: number | undefined) {
  return value == null || Number.isNaN(value) ? '' : String(value);
}

/**
 * Sanitiza a digitação para conteúdo estritamente numérico:
 * - vírgula vira ponto (`,` = `.`, padrão pt-BR);
 * - letras e símbolos são removidos na hora (impossível digitá-los);
 * - mantém no máximo um ponto decimal;
 * - sinal negativo só quando permitido.
 */
function sanitize(raw: string, allowDecimal: boolean, allowNegative: boolean, maxDecimals?: number) {
  let s = raw.replace(/,/g, '.');
  const negative = allowNegative && /^\s*-/.test(s);
  s = s.replace(/[^0-9.]/g, '');
  if (!allowDecimal) {
    s = s.replace(/\./g, '');
  } else {
    const first = s.indexOf('.');
    if (first !== -1) {
      s = `${s.slice(0, first + 1)}${s.slice(first + 1).replace(/\./g, '')}`;
      // Limita a quantidade de casas decimais.
      if (maxDecimals != null) s = s.slice(0, first + 1 + maxDecimals);
    }
  }
  return (negative ? '-' : '') + s;
}

interface NumberInputProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  allowDecimal?: boolean;
  allowEmpty?: boolean;
  maxDecimals?: number;
  stepper?: boolean;
  prefix?: string;
  suffix?: string;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  align?: 'left' | 'right';
  className?: string;
}

/**
 * Campo numérico com teclado numérico (inputMode), stepper opcional e adornos
 * de prefixo/sufixo (R$, kg, cm). Aceita ponto OU vírgula como separador
 * decimal — ambos produzem o mesmo resultado — e nunca deixa digitar letras.
 */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  {
    value,
    onChange,
    min,
    max,
    step = 1,
    allowDecimal = false,
    allowEmpty = false,
    maxDecimals,
    stepper = false,
    prefix,
    suffix,
    disabled,
    id,
    placeholder,
    align = 'left',
    className,
  },
  ref,
) {
  const [text, setText] = useState(() => fmt(value));
  const lastEmitted = useRef<number | undefined>(value);
  const allowNegative = min == null || min < 0;

  useEffect(() => {
    if (value !== lastEmitted.current) {
      setText(fmt(value));
      lastEmitted.current = value;
    }
  }, [value]);

  const emit = (next: number | undefined) => {
    lastEmitted.current = next;
    onChange(next);
  };

  const clamp = (n: number) => {
    let out = n;
    if (min != null) out = Math.max(min, out);
    if (max != null) out = Math.min(max, out);
    return allowDecimal ? Number(out.toFixed(maxDecimals ?? 3)) : Math.trunc(out);
  };

  const handleChange = (raw: string) => {
    const clean = sanitize(raw, allowDecimal, allowNegative, maxDecimals);
    setText(clean);
    // Estados intermediários válidos durante a digitação (não emitem número ainda).
    if (clean === '' || clean === '-' || clean === '.' || clean === '-.') {
      emit(allowEmpty ? undefined : min ?? 0);
      return;
    }
    const parsed = Number(clean);
    if (Number.isFinite(parsed)) emit(allowDecimal ? parsed : Math.trunc(parsed));
  };

  const handleBlur = () => {
    if (text.trim() === '') {
      if (!allowEmpty) setText(fmt(lastEmitted.current));
      return;
    }
    const parsed = Number(text);
    if (Number.isFinite(parsed)) {
      const clamped = clamp(parsed);
      // Dinheiro e afins: exibe sempre com o número fixo de casas ao sair do campo.
      setText(allowDecimal && maxDecimals != null ? clamped.toFixed(maxDecimals) : fmt(clamped));
      emit(clamped);
    } else {
      setText(fmt(lastEmitted.current));
    }
  };

  const bump = (dir: 1 | -1) => {
    const clamped = clamp((value ?? 0) + dir * step);
    setText(fmt(clamped));
    emit(clamped);
  };

  const StepBtn = ({ dir, icon: Icon }: { dir: 1 | -1; icon: typeof Plus }) => (
    <button
      type="button"
      tabIndex={-1}
      disabled={disabled}
      onClick={() => bump(dir)}
      aria-label={dir === 1 ? 'Aumentar' : 'Diminuir'}
      className="tactile flex h-11 w-10 shrink-0 items-center justify-center text-graphite-soft hover:bg-cream-light hover:text-graphite disabled:pointer-events-none"
    >
      <Icon size={15} weight="bold" />
    </button>
  );

  return (
    <div className={cn(wrapBase, disabled && wrapDisabled, className)}>
      {stepper && <StepBtn dir={-1} icon={Minus} />}
      {prefix && <span className="pl-3 text-sm text-graphite-soft">{prefix}</span>}
      <input
        ref={ref}
        id={id}
        type="text"
        inputMode={allowDecimal ? 'decimal' : 'numeric'}
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={handleBlur}
        className={cn(
          'h-11 w-full bg-transparent px-3 text-graphite placeholder:text-store-gray/70 focus:outline-none',
          stepper || align === 'right' ? 'text-center' : 'text-left',
          prefix && 'pl-1.5',
          suffix && 'pr-1.5',
        )}
      />
      {suffix && <span className="pr-3 text-sm text-graphite-soft">{suffix}</span>}
      {stepper && <StepBtn dir={1} icon={Plus} />}
    </div>
  );
});

interface MoneyInputProps {
  valueCents: number | undefined;
  onChangeCents: (value: number | undefined) => void;
  allowEmpty?: boolean;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  className?: string;
}

/** Campo monetário em reais (armazena centavos). Prefixo R$ e 2 casas. */
export function MoneyInput({
  valueCents,
  onChangeCents,
  allowEmpty = false,
  disabled,
  id,
  placeholder = '0,00',
  className,
}: MoneyInputProps) {
  return (
    <NumberInput
      id={id}
      prefix="R$"
      allowDecimal
      maxDecimals={2}
      allowEmpty={allowEmpty}
      min={0}
      disabled={disabled}
      placeholder={placeholder}
      align="right"
      className={className}
      value={valueCents == null ? undefined : valueCents / 100}
      onChange={(reais) => onChangeCents(reais == null ? undefined : Math.round(reais * 100))}
    />
  );
}
