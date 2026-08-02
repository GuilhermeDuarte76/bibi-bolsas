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
  listName,
}: {
  products?: ProductSummary[];
  loading?: boolean;
  skeletonCount?: number;
  /** Origem do clique para o relatorio (`select_item`). */
  listName?: string;
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
      {/*
        Mobile: carrossel horizontal.
        As margens negativas acompanham o padding do Container (16 -> 24px),
        senao o carrossel sai do alinhamento do resto da pagina acima de 480px.

        `contain: paint` e obrigatorio aqui. Sem ele o Chrome mobile expande o
        viewport de layout para caber o conteudo do scroller: a pagina inteira
        passa a deslizar para o lado, o header sai de vista e todo elemento
        `fixed` (toaster, sacola, busca) estica junto. `overflow-x: auto`
        sozinho nao impede isso.
      */}
      <div className="no-scrollbar -mx-4 flex snap-x snap-proximity gap-4 overflow-x-auto [contain:paint] px-4 pb-2 scroll-pl-4 sm:-mx-6 sm:px-6 sm:scroll-pl-6 md:hidden">
        {products.map((p, index) => (
          <div key={p.id} className="w-[64%] shrink-0 snap-start sm:w-[44%]">
            <ProductCard product={p} listName={listName} index={index} />
          </div>
        ))}
      </div>
      {/* Desktop: grade */}
      <div className="hidden grid-cols-4 gap-x-5 gap-y-8 md:grid">
        {products.slice(0, 4).map((p, index) => (
          <ProductCard key={p.id} product={p} listName={listName} index={index} />
        ))}
      </div>
    </>
  );
}
