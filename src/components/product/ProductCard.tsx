import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ProductSummary } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Stars } from '@/components/ui/Stars';
import { Swatches } from './Swatches';
import { PriceBlock } from './PriceBlock';
import { cn } from '@/lib/utils';

/**
 * Card de produto minimalista (FRONTEND-PLANEJAMENTO.md secao "Card de Produto"):
 * proporcao de imagem consistente, hover com segunda foto apenas no desktop,
 * sem texto sobre o produto, sem sombras pesadas.
 */
export function ProductCard({ product }: { product: ProductSummary }) {
  const [hover, setHover] = useState(false);
  const primaryBadge = product.badges[0];

  return (
    <article
      className="group flex flex-col"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Link
        to={`/produto/${product.slug}`}
        className="relative block overflow-hidden rounded-[var(--radius-lg)] bg-cream-light"
      >
        <div className="aspect-[4/5] w-full">
          <img
            src={product.image}
            alt={product.alt}
            loading="lazy"
            className={cn(
              'h-full w-full object-cover transition-opacity duration-500',
              hover && product.hoverImage ? 'opacity-0' : 'opacity-100',
            )}
          />
          {product.hoverImage && (
            <img
              src={product.hoverImage}
              alt=""
              aria-hidden
              loading="lazy"
              className={cn(
                'absolute inset-0 hidden h-full w-full object-cover transition-opacity duration-500 md:block',
                hover ? 'opacity-100' : 'opacity-0',
              )}
            />
          )}
        </div>

        {primaryBadge && <Badge kind={primaryBadge} className="absolute left-3 top-3" />}
        {!product.inStock && (
          <span className="absolute inset-0 grid place-items-center bg-cream-light/70 font-display text-lg text-graphite">
            Esgotado
          </span>
        )}
      </Link>

      <div className="mt-3 flex flex-1 flex-col gap-1.5">
        {product.collection && <span className="eyebrow">{product.collection}</span>}
        <h3 className="font-medium leading-snug text-graphite">
          <Link to={`/produto/${product.slug}`} className="hover:text-cinnamon">
            {product.name}
          </Link>
        </h3>
        <Stars rating={product.rating} count={product.reviewCount} size={13} />
        <PriceBlock
          priceCents={product.priceFromCents}
          compareAtCents={product.compareAtFromCents}
          size="sm"
          className="mt-0.5"
        />
        <div className="mt-2">
          <Swatches colors={product.colors} size="sm" max={5} />
        </div>
      </div>
    </article>
  );
}
