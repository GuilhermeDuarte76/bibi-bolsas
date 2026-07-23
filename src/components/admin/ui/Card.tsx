import { cn } from '@/lib/utils';

/**
 * Superfície base do admin (novo design system editorial).
 * Cartão claro, borda quente e sombra suave — nunca dura.
 */
export function Card({
  className,
  children,
  as: Tag = 'div',
  ...props
}: React.HTMLAttributes<HTMLElement> & { as?: 'div' | 'section' | 'article' }) {
  return (
    <Tag
      className={cn(
        'rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)]',
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

/**
 * Cartão de seção com cabeçalho editorial (eyebrow + título + descrição + ação)
 * e rodapé opcional. Padroniza os blocos de conteúdo entre todas as telas.
 */
export function SectionCard({
  eyebrow,
  title,
  description,
  action,
  footer,
  children,
  bodyClassName,
  className,
}: {
  eyebrow?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  bodyClassName?: string;
  className?: string;
}) {
  const hasHeader = eyebrow || title || description || action;
  return (
    <Card as="section" className={cn('flex flex-col overflow-hidden', className)}>
      {hasHeader && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            {eyebrow && <p className="eyebrow mb-1 text-[0.68rem]">{eyebrow}</p>}
            {title && <h2 className="font-display text-lg leading-tight text-graphite">{title}</h2>}
            {description && <p className="mt-1 text-sm text-graphite-soft">{description}</p>}
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </header>
      )}
      <div className={cn('px-5 py-5 sm:px-6', bodyClassName)}>{children}</div>
      {footer && (
        <footer className="border-t border-border/70 bg-cream-lighter/60 px-5 py-3.5 sm:px-6">{footer}</footer>
      )}
    </Card>
  );
}
