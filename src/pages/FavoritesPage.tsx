import { Link, useNavigate } from 'react-router';
import { useQueries } from '@tanstack/react-query';
import { Handbag, Heart, X } from '@phosphor-icons/react';
import { catalogService, queryKeys } from '@/lib/api';
import { useFavorites } from '@/store/favorites';
import { useCart } from '@/store/cart';
import { useUI } from '@/store/ui';
import { usePageMeta } from '@/hooks/usePageMeta';
import { Container } from '@/components/ui/Layout';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/States';
import { toast } from '@/components/ui/Toast';
import { formatPrice } from '@/lib/utils';
import type { Product } from '@/types';

/**
 * Lista de desejos.
 *
 * Os favoritos ficam salvos no navegador, mas preco e disponibilidade sao
 * revalidados na abertura da pagina — uma wishlist que mostra preco velho
 * frustra na hora de comprar.
 */
export function FavoritesPage() {
  const items = useFavorites((state) => state.items);
  const remove = useFavorites((state) => state.remove);
  const navigate = useNavigate();

  usePageMeta({
    title: 'Favoritos',
    description: 'Os produtos que você salvou para comprar depois.',
    noIndex: true,
  });

  const results = useQueries({
    queries: items.map((item) => ({
      queryKey: queryKeys.product(item.slug),
      queryFn: () => catalogService.getProduct(item.slug),
      staleTime: 60 * 1000,
    })),
  });

  if (items.length === 0) {
    return (
      <Container className="py-section">
        <EmptyState
          icon={Heart}
          title="Sua lista de desejos está vazia"
          description="Toque no coração de qualquer produto para guardá-lo aqui e decidir com calma."
          action={{ label: 'Explorar a vitrine', onClick: () => navigate('/catalogo') }}
        />
      </Container>
    );
  }

  return (
    <Container className="py-section-sm">
      <header>
        <h1 className="font-display text-display-lg text-graphite">Favoritos</h1>
        <p className="mt-2 text-fluid-base text-graphite-soft">
          {items.length} {items.length === 1 ? 'produto salvo' : 'produtos salvos'} · guardamos
          neste navegador
        </p>
      </header>

      <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4">
        {items.map((item, index) => (
          <FavoriteCard
            key={item.productId}
            slug={item.slug}
            name={item.name}
            image={item.image}
            fallbackPriceCents={item.priceCentsSnapshot}
            product={results[index]?.data}
            loading={results[index]?.isLoading ?? false}
            unavailable={results[index]?.isError ?? false}
            onRemove={() => remove(item.productId)}
          />
        ))}
      </ul>
    </Container>
  );
}

function FavoriteCard({
  slug,
  name,
  image,
  fallbackPriceCents,
  product,
  loading,
  unavailable,
  onRemove,
}: {
  slug: string;
  name: string;
  image: string;
  fallbackPriceCents: number;
  product?: Product;
  loading: boolean;
  unavailable: boolean;
  onRemove: () => void;
}) {
  const { addItem } = useCart();
  const { openCart } = useUI();

  const variant = product?.variants.find((item) => item.stock > 0);
  const priceCents = variant?.priceCents ?? product?.priceFromCents ?? fallbackPriceCents;
  const priceDropped = !loading && !!product && priceCents < fallbackPriceCents;
  const soldOut = (!loading && !!product && !variant) || unavailable;

  const handleAdd = async () => {
    if (!product || !variant) return;
    try {
      await addItem({
        productId: product.id,
        slug: product.slug,
        variantId: variant.id,
        name: product.name,
        colorName: product.colors.find((color) => color.id === variant.colorId)?.name ?? '',
        sizeLabel: product.sizes.find((size) => size.id === variant.sizeId)?.label,
        image: product.media[0]?.url ?? image,
        unitPriceCents: variant.priceCents,
        compareAtCents: variant.compareAtCents,
        maxStock: variant.stock,
      });
      // A sacola abrindo ja confirma a acao — ver comentario em ProductPage.
      openCart();
    } catch (error) {
      toast.error((error as Error).message || 'Não foi possível adicionar à sacola.');
    }
  };

  return (
    <li className="flex">
      <article className="flex w-full flex-col">
        <div className="relative">
          <Link
            to={`/produto/${slug}`}
            className="block overflow-hidden rounded-[var(--radius-lg)] bg-cream-light"
          >
            <div className="aspect-[4/5] w-full">
              <img
                src={product?.media[0]?.url ?? image}
                alt={name}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
            {soldOut && (
              <span className="absolute inset-0 grid place-items-center bg-cream-light/70 font-display text-lg text-graphite">
                {unavailable ? 'Indisponível' : 'Esgotado'}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remover ${name} dos favoritos`}
            className="tactile absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-surface/95 text-graphite shadow-[var(--shadow-card)] backdrop-blur-sm hover:text-danger"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        <div className="mt-3 flex flex-1 flex-col gap-1.5">
          <h2 className="font-medium leading-snug text-graphite">
            <Link to={`/produto/${slug}`} className="hover:text-cinnamon">
              {name}
            </Link>
          </h2>

          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-semibold text-graphite">{formatPrice(priceCents)}</span>
            {priceDropped && (
              <span className="text-xs text-store-gray line-through">
                {formatPrice(fallbackPriceCents)}
              </span>
            )}
          </div>

          {priceDropped && (
            <span className="w-fit rounded-full bg-success-soft px-2 py-0.5 text-[0.7rem] font-semibold text-success">
              o preço baixou
            </span>
          )}

          <div className="mt-auto pt-3">
            {soldOut ? (
              <p className="text-xs text-graphite-soft">
                Avisaremos na página do produto quando voltar.
              </p>
            ) : (
              <Button
                size="sm"
                variant="outline"
                fullWidth
                onClick={handleAdd}
                disabled={loading || !variant}
              >
                <Handbag size={16} /> Adicionar
              </Button>
            )}
          </div>
        </div>
      </article>
    </li>
  );
}
