import { useState } from 'react';
import type { ProductMedia } from '@/types';
import { cn } from '@/lib/utils';

/** Galeria de produto: imagem principal + miniaturas. */
export function ProductGallery({ media, name }: { media: ProductMedia[]; name: string }) {
  const [active, setActive] = useState(0);
  const current = media[active] ?? media[0];

  return (
    <div className="flex flex-col gap-4 md:flex-row-reverse md:items-start">
      {/* Imagem principal */}
      <div className="flex-1 overflow-hidden rounded-[var(--radius-xl)] bg-cream-light">
        <div className="aspect-square w-full">
          {current?.type === 'video' ? (
            <video src={current.url} poster={current.poster} controls className="h-full w-full object-cover" />
          ) : (
            <img src={current?.url} alt={current?.alt ?? name} className="h-full w-full object-cover" />
          )}
        </div>
      </div>

      {/* Miniaturas */}
      {media.length > 1 && (
        <div className="flex gap-3 md:flex-col">
          {media.map((m, i) => (
            <button
              key={m.id}
              onClick={() => setActive(i)}
              aria-label={`Ver imagem ${i + 1}`}
              aria-current={i === active}
              className={cn(
                'h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-cream-light ring-2 transition-all md:h-20 md:w-20',
                i === active ? 'ring-graphite' : 'ring-transparent hover:ring-border',
              )}
            >
              <img src={m.poster ?? m.url} alt="" aria-hidden className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
