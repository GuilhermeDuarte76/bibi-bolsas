import { forwardRef } from 'react';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

/**
 * Barra de ferramentas de listagem: busca à esquerda, filtros no meio,
 * ações à direita. Layout responsivo consistente entre as telas.
 */
export function Toolbar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Empurra os itens seguintes para a direita dentro da Toolbar. */
export function ToolbarSpacer() {
  return <div className="hidden flex-1 sm:block" aria-hidden />;
}

interface SearchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  containerClassName?: string;
}

/** Campo de busca com ícone e botão de limpar. */
export const SearchInput = forwardRef<HTMLInputElement, SearchProps>(function SearchInput(
  { value, onChange, onClear, placeholder = 'Buscar…', containerClassName, className, ...props },
  ref,
) {
  return (
    <div className={cn('relative w-full sm:w-72', containerClassName)}>
      <MagnifyingGlass
        size={18}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-store-gray"
        aria-hidden
      />
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'h-11 w-full rounded-[var(--radius-md)] border border-border bg-surface pl-10 pr-9 text-sm text-graphite placeholder:text-store-gray/70 transition-colors focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20',
          '[&::-webkit-search-cancel-button]:hidden',
          className,
        )}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('');
            onClear?.();
          }}
          aria-label="Limpar busca"
          className="tactile absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-store-gray hover:bg-cream-light hover:text-graphite"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
});
