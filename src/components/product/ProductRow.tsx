import type { ProductSummary } from '@/types';
import { ProductCard } from './ProductCard';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';

/**
 * Vitrine horizontal: rola no mobile, vira grade no desktop. Mantem proporcao
 * consistente dos cards e skeletons dimensionados.
 */
export function ProductRow({
  products,
  loading,
  skeletonCount = 4,
}: {
  products?: ProductSummary[];
  loading?: boolean;
  skeletonCount?: number;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-4">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!products?.length) return null;

  return (
    <>
      {/* Mobile: carrossel horizontal */}
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:hidden">
        {products.map((p) => (
          <div key={p.id} className="w-[64%] shrink-0 snap-start sm:w-[44%]">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
      {/* Desktop: grade */}
      <div className="hidden grid-cols-4 gap-x-5 gap-y-8 md:grid">
        {products.slice(0, 4).map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </>
  );
}
