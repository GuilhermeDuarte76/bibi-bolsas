import { cn } from '@/lib/utils';

/** Normaliza um texto de cor para um hex #rrggbb válido (ou fallback). */
function toHex(value: string, fallback = '#ffffff') {
  const raw = value.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toLowerCase()}`;
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw.split('').map((c) => c + c).join('').toLowerCase()}`;
  }
  return fallback;
}

function isValidHex(value: string) {
  const raw = value.trim().replace(/^#/, '');
  return /^[0-9a-fA-F]{3}$/.test(raw) || /^[0-9a-fA-F]{6}$/.test(raw);
}

/**
 * Seletor de cor: um swatch abre o color picker nativo do sistema e o campo de
 * texto aceita o hex manualmente — os dois ficam sincronizados.
 */
export function ColorInput({
  value,
  onChange,
  id,
  disabled,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
}) {
  const hex = toHex(value);
  const filled = value.trim().length > 0;
  const invalid = filled && !isValidHex(value);

  return (
    <div
      className={cn(
        'flex items-center overflow-hidden rounded-[var(--radius-md)] border bg-surface transition-colors focus-within:ring-2 focus-within:ring-terracotta/20',
        invalid ? 'border-danger/60 focus-within:border-danger' : 'border-border focus-within:border-terracotta',
        disabled && 'bg-cream-light opacity-70',
        className,
      )}
    >
      <label
        className="relative h-11 w-11 shrink-0 cursor-pointer border-r border-border"
        style={{ backgroundColor: filled && !invalid ? hex : undefined }}
        title="Escolher cor"
      >
        {(!filled || invalid) && (
          <span
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(45deg,#e3d6c8 25%,transparent 25%),linear-gradient(-45deg,#e3d6c8 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e3d6c8 75%),linear-gradient(-45deg,transparent 75%,#e3d6c8 75%)',
              backgroundSize: '10px 10px',
              backgroundPosition: '0 0,0 5px,5px -5px,-5px 0',
            }}
            aria-hidden
          />
        )}
        <input
          type="color"
          value={hex}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label="Seletor de cor"
        />
      </label>
      <input
        id={id}
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#a5603f"
        spellCheck={false}
        className="h-11 w-full bg-transparent px-3 font-mono text-sm uppercase text-graphite placeholder:font-sans placeholder:text-store-gray/70 focus:outline-none"
      />
    </div>
  );
}
