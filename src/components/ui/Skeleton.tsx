import { cn } from '@/lib/utils';

/** Bloco de skeleton dimensionado (evita layout shift). */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-[var(--radius-sm)]', className)} aria-hidden />;
}

/** Skeleton no formato exato de um ProductCard. */
export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="aspect-[4/5] w-full rounded-[var(--radius-lg)]" />
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
