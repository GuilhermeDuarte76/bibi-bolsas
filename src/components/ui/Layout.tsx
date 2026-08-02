import { cn } from '@/lib/utils';

type ContainerSize = 'default' | 'narrow' | 'prose' | 'wide';

const CONTAINER_SIZES: Record<ContainerSize, string> = {
  /** Vitrine, listagens e a maioria das paginas. */
  default: 'max-w-[1280px]',
  /** Checkout e fluxos de uma coluna so. */
  narrow: 'max-w-[960px]',
  /** Texto corrido: ~70 caracteres por linha, o limite confortavel de leitura. */
  prose: 'max-w-[720px]',
  /** Composicoes editoriais que respiram melhor largas. */
  wide: 'max-w-[1440px]',
};

/**
 * Container central.
 *
 * O padding lateral cresce junto com a tela (16 -> 24 -> 40 -> 56px) para que a
 * margem visual pareca constante em celular, tablet e desktop.
 */
export function Container({
  className,
  size = 'default',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { size?: ContainerSize }) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 sm:px-6 lg:px-10 2xl:px-14',
        CONTAINER_SIZES[size],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Bloco de secao com ritmo vertical padronizado.
 * `tight` para blocos encostados, `default` para o espacamento normal da loja.
 */
export function Section({
  className,
  spacing = 'default',
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & { spacing?: 'default' | 'tight' | 'none' }) {
  return (
    <section
      className={cn(
        spacing === 'default' && 'py-section',
        spacing === 'tight' && 'py-section-sm',
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

/** Cabecalho de secao editorial: eyebrow + titulo + (opcional) link. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = 'left',
  as: Tag = 'h2',
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  align?: 'left' | 'center';
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3',
        align === 'center' && 'items-center text-center',
        // No mobile a acao vai para baixo do titulo; a partir de sm volta para a direita.
        action && 'sm:flex-row sm:items-end sm:justify-between sm:gap-6',
        className,
      )}
    >
      <div className={cn('flex min-w-0 flex-col gap-2', align === 'center' && 'items-center')}>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <Tag className="font-display text-display-md text-graphite">{title}</Tag>
        {description && (
          <p className="max-w-[60ch] text-fluid-base text-graphite-soft">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
