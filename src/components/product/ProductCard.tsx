import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import type { ProductSummary, ProductVariant } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Stars } from '@/components/ui/Stars';
import { Swatches } from './Swatches';
import { PriceBlock } from './PriceBlock';
import { analytics } from '@/lib/analytics';
import { cn } from '@/lib/utils';

/**
 * Card de produto minimalista (FRONTEND-PLANEJAMENTO.md secao "Card de Produto"):
 * proporcao de imagem consistente, hover com segunda foto apenas no desktop,
 * sem texto sobre o produto, sem sombras pesadas.
 */
export function ProductCard({
  product,
  listName,
  index,
}: {
  product: ProductSummary;
  /** Nome da vitrine de origem — alimenta `select_item` no relatorio. */
  listName?: string;
  index?: number;
}) {
  const [hover, setHover] = useState(false);
  const reportSelection = () => {
    if (listName) analytics.selectItem(listName, product, index);
  };
  const [selectedVariantId, setSelectedVariantId] = useState<string>();
  const primaryBadge = product.badges[0];
  const previewVariants = useMemo(() => {
    if (product.variants.length <= 1) return [];

    const distinctSkus = new Set(product.variants.map((variant) => variant.sku.trim().toLowerCase()).filter(Boolean));
    return distinctSkus.size > 1 ? product.variants : [];
  }, [product.variants]);
  const selectedVariant = previewVariants.find((variant) => variant.id === selectedVariantId) ?? previewVariants[0];
  const variantMedia = selectedVariant
    ? product.media.filter((media) => media.productVariantId === selectedVariant.id)
    : [];
  const activeImage = variantMedia[0]?.url ?? product.image;
  const activeHoverImage =
    variantMedia.find((media) => media.url !== activeImage)?.url ??
    (selectedVariant ? undefined : product.hoverImage);
  const activeInStock = selectedVariant ? selectedVariant.stock > 0 : product.inStock;
  const activePriceCents = selectedVariant?.priceCents ?? product.priceFromCents;
  const activeCompareAtCents = selectedVariant?.compareAtCents ?? product.compareAtFromCents;

  return (
    <article
      className="group flex flex-col"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Link
        to={`/produto/${product.slug}`}
        onClick={reportSelection}
        className="relative block overflow-hidden rounded-[var(--radius-lg)] bg-cream-light"
      >
        <div className="aspect-[4/5] w-full">
          <img
            src={activeImage}
            alt={product.alt}
            loading="lazy"
            className={cn(
              'h-full w-full object-cover transition-opacity duration-500',
              hover && activeHoverImage ? 'opacity-0' : 'opacity-100',
            )}
          />
          {activeHoverImage && (
            <img
              src={activeHoverImage}
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
        {!activeInStock && (
          <span className="absolute inset-0 grid place-items-center bg-cream-light/70 font-display text-lg text-graphite">
            Esgotado
          </span>
        )}
      </Link>

      <div className="mt-3 flex flex-1 flex-col gap-1.5">
        {product.collection && <span className="eyebrow">{product.collection}</span>}
        <h3 className="font-medium leading-snug text-graphite">
          <Link
            to={`/produto/${product.slug}`}
            onClick={reportSelection}
            className="hover:text-cinnamon"
          >
            {product.name}
          </Link>
        </h3>
        <Stars rating={product.rating} count={product.reviewCount} size={13} />
        <PriceBlock
          priceCents={activePriceCents}
          compareAtCents={activeCompareAtCents}
          size="sm"
          className="mt-0.5"
        />
        <div className="mt-2">
          {previewVariants.length > 0 ? (
            <VariantPreviewSwatches
              product={product}
              variants={previewVariants}
              value={selectedVariant?.id}
              onChange={(variant) => {
                setSelectedVariantId(variant.id);
                setHover(false);
              }}
            />
          ) : (
            <Swatches colors={product.colors} size="sm" max={5} />
          )}
        </div>
      </div>
    </article>
  );
}

function VariantPreviewSwatches({
  product,
  variants,
  value,
  onChange,
}: {
  product: ProductSummary;
  variants: ProductVariant[];
  value?: string;
  onChange: (variant: ProductVariant) => void;
}) {
  const shown = variants.slice(0, 5);
  const rest = variants.length - shown.length;

  return (
    <div className="flex items-center gap-1.5">
      {shown.map((variant) => {
        const color = product.colors.find((item) => item.id === variant.colorId);
        if (!color) return null;

        const active = value === variant.id;
        const light = color.hex.toLowerCase() === '#e3d4c2' || color.hex.toLowerCase() === '#c2b1a8';

        return (
          <button
            key={variant.id}
            type="button"
            aria-label={color.name}
            aria-pressed={active}
            title={color.name}
            onClick={() => onChange(variant)}
            className={cn(
              'tactile grid h-4 w-4 place-items-center rounded-full',
              active ? 'ring-2 ring-graphite ring-offset-2' : 'ring-1 ring-black/10',
              variant.stock <= 0 && 'opacity-45',
            )}
            style={{ backgroundColor: color.hex }}
          >
            {active && <span className={cn('h-1.5 w-1.5 rounded-full', light ? 'bg-graphite' : 'bg-white')} />}
          </button>
        );
      })}
      {rest > 0 && <span className="text-xs text-graphite-soft">+{rest}</span>}
    </div>
  );
}
