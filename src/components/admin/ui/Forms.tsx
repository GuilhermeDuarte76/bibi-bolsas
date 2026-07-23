import { cn } from '@/lib/utils';

/** Grade responsiva de campos (1 col no mobile, N no desktop). */
export function FormGrid({
  cols = 2,
  children,
  className,
}: {
  cols?: 1 | 2 | 3;
  children: React.ReactNode;
  className?: string;
}) {
  const map = { 1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3' } as const;
  return <div className={cn('grid grid-cols-1 gap-4', map[cols], className)}>{children}</div>;
}

/** Bloco de formulário com título + descrição à esquerda e campos à direita. */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('grid gap-5 border-b border-border/70 py-6 first:pt-0 last:border-0 lg:grid-cols-[240px_1fr]', className)}>
      <div>
        <h3 className="text-sm font-semibold text-graphite">{title}</h3>
        {description && <p className="mt-1 text-sm text-graphite-soft">{description}</p>}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

/** Barra de ações do formulário (fixada no rodapé, alinhada à direita). */
export function FormActions({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'sticky bottom-0 z-10 -mx-4 mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-border bg-surface/95 px-4 py-3.5 backdrop-blur sm:mx-0 sm:rounded-[var(--radius-md)] sm:border sm:px-4',
        className,
      )}
    >
      {children}
    </div>
  );
}
