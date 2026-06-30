import { cn } from '@/lib/utils';

/** Container central com largura maxima e padding responsivo. */
export function Container({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10', className)} {...props}>
      {children}
    </div>
  );
}

/** Cabecalho de secao editorial: eyebrow + titulo + (opcional) link. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = 'left',
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  align?: 'left' | 'center';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2',
        align === 'center' && 'items-center text-center',
        action && 'sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className={cn('flex flex-col gap-2', align === 'center' && 'items-center')}>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2 className="font-display text-2xl text-graphite sm:text-3xl">{title}</h2>
        {description && <p className="max-w-xl text-sm text-graphite-soft sm:text-base">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
