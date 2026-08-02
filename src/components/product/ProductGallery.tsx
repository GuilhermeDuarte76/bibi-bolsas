import { useRef, useState } from 'react';
import type { ProductMedia } from '@/types';
import { cn } from '@/lib/utils';

/**
 * Galeria de produto.
 *
 * Celular: carrossel que se desliza com o dedo, com contador — mirar em
 * miniaturas de 64px e o pior jeito de trocar de foto no toque.
 * Desktop: imagem principal + miniaturas na lateral.
 */
export function ProductGallery({ media, name }: { media: ProductMedia[]; name: string }) {
  const [active, setActive] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);
  const current = media[active] ?? media[0];

  /** Descobre qual foto esta em foco a partir da posicao do scroll. */
  const handleRailScroll = () => {
    const rail = railRef.current;
    if (!rail) return;
    const index = Math.round(rail.scrollLeft / rail.clientWidth);
    setActive(Math.min(Math.max(index, 0), media.length - 1));
  };

  return (
    <div>
      {/* ---- Celular: carrossel ---- */}
      <div className="relative md:hidden">
        <div
          ref={railRef}
          onScroll={handleRailScroll}
          /* contain:paint — sem isso o scroller expande o viewport de layout
             no Chrome mobile e a pagina inteira desliza para o lado. */
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto [contain:paint]"
        >
          {media.map((item) => (
            <div key={item.id} className="w-full shrink-0 snap-center">
              <div className="aspect-square w-full overflow-hidden rounded-[var(--radius-xl)] bg-cream-light">
                <MediaFrame item={item} name={name} />
              </div>
            </div>
          ))}
        </div>

        {media.length > 1 && (
          <>
            <p
              className="absolute bottom-3 right-3 rounded-full bg-graphite/70 px-2.5 py-1 text-xs font-medium text-cream-light"
              aria-hidden
            >
              {active + 1}/{media.length}
            </p>
            <div className="mt-3 flex justify-center gap-1.5">
              {media.map((item, index) => (
                <span
                  key={item.id}
                  aria-hidden
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    index === active ? 'w-5 bg-graphite' : 'w-1.5 bg-border',
                  )}
                />
              ))}
            </div>
            <p className="sr-only" aria-live="polite">
              Imagem {active + 1} de {media.length}
            </p>
          </>
        )}
      </div>

      {/* ---- Desktop: principal + miniaturas ---- */}
      <div className="hidden gap-4 md:flex md:flex-row-reverse md:items-start">
        <div className="flex-1 overflow-hidden rounded-[var(--radius-xl)] bg-cream-light">
          <div className="aspect-square w-full">
            <MediaFrame item={current} name={name} />
          </div>
        </div>

        {media.length > 1 && (
          <div className="flex flex-col gap-3">
            {media.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Ver imagem ${index + 1}`}
                aria-current={index === active}
                className={cn(
                  'h-20 w-20 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-cream-light ring-2 transition-all',
                  index === active ? 'ring-graphite' : 'ring-transparent hover:ring-border',
                )}
              >
                <img
                  src={item.poster ?? item.url}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MediaFrame({ item, name }: { item?: ProductMedia; name: string }) {
  if (!item) return null;

  if (item.type === 'video') {
    return (
      <video src={item.url} poster={item.poster} controls className="h-full w-full object-cover" />
    );
  }

  return (
    <img src={item.url} alt={item.alt ?? name} className="h-full w-full object-cover" />
  );
}
