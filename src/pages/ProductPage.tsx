import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { CaretRight, Handbag, Heart, Minus, Plus, ShieldCheck, Truck } from '@phosphor-icons/react';
import { catalogService, queryKeys } from '@/lib/api';
import { useCart } from '@/store/cart';
import { useFavorites } from '@/store/favorites';
import { useUI } from '@/store/ui';
import { toast } from '@/components/ui/Toast';
import { Container } from '@/components/ui/Layout';
import { Button } from '@/components/ui/Button';
import { Accordion } from '@/components/ui/Accordion';
import { Stars } from '@/components/ui/Stars';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useViewItemList } from '@/hooks/useViewItemList';
import { ProductGallery } from '@/components/product/ProductGallery';
import { ProductGalleryFallback } from '@/components/product/ProductGalleryFallback';
import { Swatches } from '@/components/product/Swatches';
import { PriceBlock } from '@/components/product/PriceBlock';
import { StockBadge } from '@/components/product/StockBadge';
import { ProductCard } from '@/components/product/ProductCard';
import { analytics } from '@/lib/analytics';
import { STORE } from '@/lib/store-info';
import { formatPrice } from '@/lib/utils';
import type { Product, ProductVariant } from '@/types';

function normalizeVariantLabel(value?: string) {
  return (value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function variantSelectionKey(variant: ProductVariant) {
  return `${variant.colorId}|${variant.sizeId ?? ''}`;
}

function variantSkuKey(variant: ProductVariant) {
  return normalizeVariantLabel(variant.sku);
}

function ProductDescription({ value }: { value: string }) {
  const markdown = value.trim() || 'Descrição em breve.';

  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-cream-lighter/50 px-4 py-4 text-sm leading-relaxed text-graphite-soft">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          h1: ({ children }) => <h3 className="mb-3 font-display text-xl text-graphite">{children}</h3>,
          h2: ({ children }) => <h3 className="mb-3 mt-5 font-display text-lg text-graphite first:mt-0">{children}</h3>,
          h3: ({ children }) => <h4 className="mb-2 mt-4 text-base font-semibold text-graphite first:mt-0">{children}</h4>,
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-graphite">{children}</strong>,
          em: ({ children }) => <em className="text-graphite">{children}</em>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer" className="font-medium text-terracotta hover:underline">
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-3 border-l-4 border-terracotta/40 bg-surface px-4 py-3 italic text-graphite last:mb-0">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[0.85em] text-graphite">{children}</code>
          ),
          pre: ({ children }) => (
            <pre className="mb-3 overflow-x-auto rounded-[var(--radius-md)] bg-graphite p-3 text-xs text-cream-light last:mb-0">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="mb-3 overflow-x-auto rounded-[var(--radius-md)] border border-border bg-surface last:mb-0">
              <table className="min-w-full divide-y divide-border text-left text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="bg-cream-light px-3 py-2 font-semibold text-graphite">{children}</th>,
          td: ({ children }) => <td className="px-3 py-2 align-top">{children}</td>,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

export function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { openCart } = useUI();
  const favoriteItems = useFavorites((state) => state.items);
  const toggleFavorite = useFavorites((state) => state.toggle);

  const { data: product, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.product(slug!),
    queryFn: () => catalogService.getProduct(slug!),
    enabled: !!slug,
  });

  const { data: related } = useQuery({
    queryKey: queryKeys.related(slug!),
    queryFn: () => catalogService.getRelated(slug!),
    enabled: !!slug,
  });

  useViewItemList('Produto · Você também pode gostar', related, product?.id);

  const [colorId, setColorId] = useState<string>();
  const [sizeId, setSizeId] = useState<string>();
  const [variantId, setVariantId] = useState<string>();
  const [qty, setQty] = useState(1);

  const defaultVariant = useMemo(() => {
    if (!product) return undefined;
    return product.variants.find((item) => item.stock > 0) ?? product.variants[0];
  }, [product]);

  const selectedColor = colorId ?? defaultVariant?.colorId ?? product?.colors[0]?.id;
  const selectedSize = sizeId ?? defaultVariant?.sizeId ?? product?.sizes[0]?.id;

  const variant = useMemo(() => {
    if (!product) return undefined;
    if (variantId) {
      const directVariant = product.variants.find((v) => v.id === variantId);
      if (directVariant) return directVariant;
    }

    const exactVariant = product.variants.find(
      (v) =>
        v.colorId === selectedColor &&
        (v.sizeId ?? defaultVariant?.sizeId) === (selectedSize ?? defaultVariant?.sizeId),
    );
    if (exactVariant) return exactVariant;

    if (colorId) {
      const sameColorVariant = product.variants.find((v) => v.colorId === selectedColor);
      if (sameColorVariant) return sameColorVariant;
    }

    if (sizeId) {
      const sameSizeVariant = product.variants.find(
        (v) => (v.sizeId ?? defaultVariant?.sizeId) === (selectedSize ?? defaultVariant?.sizeId),
      );
      if (sameSizeVariant) return sameSizeVariant;
    }

    return defaultVariant;
  }, [product, selectedColor, selectedSize, variantId, defaultVariant, colorId, sizeId]);

  const needsDirectVariantSelector = useMemo(() => {
    if (!product || product.variants.length <= 1) return false;

    const skuCount = new Set(product.variants.map(variantSkuKey).filter(Boolean)).size;
    const hasMultipleSkus = skuCount > 1;
    const hasAmbiguousColorSize = new Set(product.variants.map(variantSelectionKey)).size < product.variants.length;

    return hasMultipleSkus || hasAmbiguousColorSize;
  }, [product]);

  const galleryMedia = useMemo(() => {
    if (!product) return [];

    const generalMedia = product.media.filter((media) => !media.productVariantId);
    if (!variant) return generalMedia.length ? generalMedia : product.media;

    const variantMedia = product.media.filter((media) => media.productVariantId === variant.id);
    if (!variantMedia.length) return generalMedia.length ? generalMedia : product.media;

    const variantMediaIds = new Set(variantMedia.map((media) => media.id));
    return [
      ...variantMedia,
      ...generalMedia.filter((media) => !variantMediaIds.has(media.id)),
    ];
  }, [product, variant?.id]);

  const { data: productReviews = [] } = useQuery({
    queryKey: queryKeys.productReviews(product?.id ?? ''),
    queryFn: () => catalogService.getProductReviews(product!.id),
    enabled: !!product?.id,
  });

  /*
   * A API de catalogo nao devolve nota nem contagem de avaliacoes.
   * Calculamos a partir das avaliacoes recebidas; sem avaliacoes, a secao
   * inteira de nota some em vez de exibir "0,0 (0 avaliacoes)".
   */
  const reviewCount = productReviews.length;
  const averageRating = reviewCount
    ? productReviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount
    : 0;

  /*
   * Barra de compra fixa no celular.
   * So aparece depois que a pessoa PASSOU do botao (bloco acima da tela).
   * Enquanto ela ainda esta rolando em direcao ao botao, a barra seria um
   * atalho para comprar algo que ela nem terminou de ver.
   */
  const buyBoxRef = useRef<HTMLDivElement>(null);
  const [scrolledPastBuyBox, setScrolledPastBuyBox] = useState(false);

  useEffect(() => {
    const node = buyBoxRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) =>
        setScrolledPastBuyBox(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { rootMargin: '-72px 0px 0px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [product?.id]);

  /*
   * `view_item` uma vez por produto, nao por variacao: trocar de cor nao e uma
   * nova visualizacao e inflaria a metrica.
   */
  const viewReported = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!product || viewReported.current === product.id) return;
    viewReported.current = product.id;
    analytics.viewItem(product, variant);
  }, [product, variant]);

  usePageMeta({
    title: product?.name,
    description: product?.shortDescription,
    image: product?.media[0]?.url,
    type: 'product',
  });

  if (isLoading) return <ProductSkeleton />;
  if (isError || !product) return <Container className="py-20"><ErrorState onRetry={() => refetch()} /></Container>;

  const stock = variant?.stock ?? 0;
  const colorName = product.colors.find((c) => c.id === (variant?.colorId ?? selectedColor))?.name ?? '';
  const sizeLabel = product.sizes.find((s) => s.id === (variant?.sizeId ?? selectedSize))?.label;
  const isFavorite = favoriteItems.some((item) => item.productId === product.id);

  const handleToggleFavorite = () => {
    const added = toggleFavorite({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: galleryMedia[0]?.url ?? product.media[0]?.url ?? '',
      priceCentsSnapshot: variant?.priceCents ?? product.priceFromCents,
    });
    if (added) analytics.addToWishlist(product, variant);
    toast.success(added ? 'Salvo nos favoritos' : 'Removido dos favoritos');
  };

  const handleAdd = async (goCheckout = false) => {
    if (!variant || stock <= 0) return;

    try {
      await addItem({
        productId: product.id,
        slug: product.slug,
        variantId: variant.id,
        name: product.name,
        colorName,
        sizeLabel: sizeLabel === 'Unico' ? undefined : sizeLabel,
        image: galleryMedia[0]?.url ?? product.media[0]?.url ?? '',
        unitPriceCents: variant.priceCents,
        compareAtCents: variant.compareAtCents,
        maxStock: variant.stock,
        quantity: qty,
      });

      analytics.addToCart(product, variant, qty);

      // Sem toast ao abrir a sacola: o drawer subindo ja e a confirmacao, e o
      // aviso ainda cobria o botao "Ver sacola completa".
      if (goCheckout) {
        analytics.beginCheckout(useCart.getState().items);
        navigate('/checkout');
      } else {
        openCart();
      }
    } catch (error) {
      toast.error((error as Error).message || 'Não foi possível adicionar à sacola.');
    }
  };

  return (
    <Container className="py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-xs text-graphite-soft" aria-label="Caminho">
        <Link to="/" className="hover:text-terracotta">Início</Link>
        <CaretRight size={12} />
        <Link to={`/categoria/${product.categorySlug}`} className="hover:text-terracotta">
          {/* Nome real da categoria; o slug so entra como ultimo recurso. */}
          {product.collection ?? product.categorySlug.replace(/-/g, ' ')}
        </Link>
        <CaretRight size={12} />
        <span className="text-graphite">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
        {/* Galeria */}
        <div>
          {galleryMedia.length > 0 ? (
            <ProductGallery
              key={`${variant?.id ?? 'default'}-${galleryMedia[0]?.id ?? 'media'}`}
              media={galleryMedia}
              name={product.name}
            />
          ) : (
            <ProductGalleryFallback />
          )}
        </div>

        {/* Info / compra */}
        <div className="flex flex-col">
          {product.collection && <span className="eyebrow">{product.collection}</span>}
          <h1 className="mt-1 font-display text-3xl text-graphite sm:text-4xl">{product.name}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            {reviewCount > 0 && (
              <>
                <Stars rating={averageRating} count={reviewCount} />
                <span className="text-sm text-graphite-soft">·</span>
              </>
            )}
            <StockBadge stock={stock} />
          </div>

          <div className="mt-5">
            <PriceBlock
              priceCents={variant?.priceCents ?? product.priceFromCents}
              compareAtCents={variant?.compareAtCents}
              /* Condicoes vem da configuracao da loja, nao do produto: anunciar
                 parcelamento que o checkout nao oferece engana a cliente. */
              installments={STORE.payment.installmentsMax ?? undefined}
              pixPct={STORE.payment.pixDiscountPercent ?? undefined}
              size="lg"
            />
          </div>

          <p className="mt-5 text-graphite-soft">{product.shortDescription}</p>

          {/* Cores */}
          {!needsDirectVariantSelector && (
            <div className="mt-6">
              <Swatches
                colors={product.colors}
                value={variant?.colorId ?? selectedColor}
                showTitle={false}
                onChange={(id) => {
                  setColorId(id);
                  setVariantId(undefined);
                  setQty(1);
                }}
              />
            </div>
          )}

          {/* Tamanhos (se houver) */}
          {!needsDirectVariantSelector && product.sizes.length > 1 && (
            <div className="mt-5">
              <p className="mb-2 text-sm font-medium text-graphite">Tamanho</p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSizeId(s.id);
                      setVariantId(undefined);
                    }}
                    className={`tactile rounded-[var(--radius-md)] border px-4 py-2 text-sm ${
                      (variant?.sizeId ?? selectedSize) === s.id
                        ? 'border-graphite bg-graphite text-cream-light'
                        : 'border-border text-graphite hover:border-graphite'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {needsDirectVariantSelector && (
            <div className="mt-6">
              <div className="flex flex-wrap items-center gap-2">
                {product.variants.map((item) => {
                  const active = variant?.id === item.id;
                  const optionColor = product.colors.find((c) => c.id === item.colorId);
                  const optionLabel = optionColor?.name ?? item.name ?? 'Cor';

                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-label={optionLabel}
                      aria-pressed={active}
                      onClick={() => {
                        setVariantId(item.id);
                        setColorId(item.colorId);
                        setSizeId(item.sizeId);
                        setQty(1);
                      }}
                      className={`tactile h-7 w-7 rounded-full transition ${
                        active
                          ? 'ring-2 ring-graphite ring-offset-2'
                          : 'ring-1 ring-black/10 hover:ring-graphite/70'
                      }`}
                      style={{ backgroundColor: optionColor?.hex ?? '#a5603f' }}
                    >
                      <span className="sr-only">{optionLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantidade + acoes */}
          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center rounded-full border border-border">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Diminuir" className="tactile grid h-11 w-11 place-items-center rounded-full disabled:opacity-40">
                <Minus size={16} />
              </button>
              <span className="w-8 text-center font-medium">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(stock, q + 1))} disabled={qty >= stock} aria-label="Aumentar" className="tactile grid h-11 w-11 place-items-center rounded-full disabled:opacity-40">
                <Plus size={16} />
              </button>
            </div>
            <p className="text-xs text-graphite-soft">{stock > 0 ? `${stock} disponíveis` : 'Sem estoque'}</p>
          </div>

          <div ref={buyBoxRef} className="mt-5 flex flex-col gap-3">
            <Button size="lg" variant="secondary" fullWidth onClick={() => handleAdd(true)} disabled={stock <= 0}>
              Comprar agora
            </Button>
            {/* Sacola e favorito dividem a linha em qualquer largura */}
            <div className="flex gap-3">
              <Button size="lg" variant="outline" fullWidth onClick={() => handleAdd(false)} disabled={stock <= 0}>
                <Handbag size={18} /> Adicionar à sacola
              </Button>
              <button
                type="button"
                onClick={handleToggleFavorite}
                aria-label={isFavorite ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
                aria-pressed={isFavorite}
                className={`tactile grid h-13 w-13 shrink-0 place-items-center rounded-[var(--radius-md)] border transition-colors ${
                  isFavorite
                    ? 'border-terracotta bg-terracotta/10 text-terracotta'
                    : 'border-graphite/25 text-graphite hover:border-graphite hover:text-terracotta'
                }`}
              >
                <Heart size={20} weight={isFavorite ? 'fill' : 'regular'} />
              </button>
            </div>
          </div>

          <p className="mt-3 flex items-center gap-2 text-xs text-graphite-soft">
            <ShieldCheck size={16} className="text-success" /> Compra 100% segura · Troca facilitada
            em até {STORE.returnWindowDays} dias
          </p>

          {/*
            Frete: informamos a regra em vez de simular.
            O backend so cota frete no checkout (exige carrinho, endereco e
            login), entao uma calculadora de CEP aqui nao teria como responder.
          */}
          <div className="mt-6 flex items-start gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cream-light text-terracotta">
              <Truck size={18} aria-hidden />
            </span>
            <div className="text-sm">
              <p className="font-medium text-graphite">
                Frete grátis acima de {formatPrice(STORE.freeShippingThresholdCents)}
              </p>
              <p className="mt-0.5 text-graphite-soft">
                Enviamos para todo o Brasil. O prazo e o valor exatos aparecem no checkout, a
                partir do seu CEP.
              </p>
            </div>
          </div>

          {/* Acordeoes */}
          <div className="mt-8">
            <Accordion defaultOpen={0} items={buildAccordionItems(product)} />
          </div>
        </div>
      </div>

      {/* Avaliacoes */}
      <section className="mt-section-sm">
        <h2 className="font-display text-display-sm text-graphite">Avaliações</h2>

        {reviewCount > 0 ? (
          <>
            <div className="mt-4 flex items-center gap-4">
              <span className="font-display text-display-md text-graphite">
                {averageRating.toFixed(1).replace('.', ',')}
              </span>
              <div>
                <Stars rating={averageRating} />
                <p className="mt-1 text-sm text-graphite-soft">
                  {reviewCount} {reviewCount === 1 ? 'avaliação' : 'avaliações'}
                </p>
              </div>
            </div>

            <ul className="mt-8 grid gap-4 md:grid-cols-2">
              {productReviews.map((review) => (
                <li
                  key={review.id}
                  className="rounded-[var(--radius-lg)] border border-border bg-surface p-5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Stars rating={review.rating} />
                    {review.verifiedPurchase && (
                      <Badge kind="pronta-entrega" className="!bg-success-soft !text-success" />
                    )}
                  </div>
                  <p className="mt-3 font-medium text-graphite">{review.title}</p>
                  <p className="mt-1 text-sm text-graphite-soft">{review.body}</p>
                  <p className="mt-3 text-xs text-store-gray">{review.customerName}</p>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-4 text-sm text-graphite-soft">
            Este produto ainda não tem avaliações.
          </p>
        )}
      </section>

      {/* Relacionados */}
      {related && related.length > 0 && (
        <section className="mt-section-sm">
          <h2 className="mb-8 font-display text-display-sm text-graphite">
            Você também pode gostar
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-5 md:grid-cols-4">
            {related.map((item, index) => (
              <ProductCard
                key={item.id}
                product={item}
                listName="Produto · Você também pode gostar"
                index={index}
              />
            ))}
          </div>
        </section>
      )}

      <ProductJsonLd product={product} priceCents={variant?.priceCents ?? product.priceFromCents} inStock={stock > 0} />

      {/* Barra de compra fixa: so no celular e so depois que o botao sai da tela */}
      {scrolledPastBuyBox && stock > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-cream-lighter/95 px-4 pt-3 pb-safe backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-[1280px] items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-graphite-soft">{product.name}</p>
              <p className="font-semibold text-graphite">
                {formatPrice(variant?.priceCents ?? product.priceFromCents)}
              </p>
            </div>
            <Button size="lg" variant="secondary" onClick={() => handleAdd(false)} className="shrink-0">
              <Handbag size={18} /> Adicionar
            </Button>
          </div>
        </div>
      )}
    </Container>
  );
}

/** Acordeoes: uma secao so aparece quando tem conteudo de verdade. */
function buildAccordionItems(product: Product) {
  const { specs } = product;
  const measurements = [
    specs.heightCm && { label: 'Altura', value: `${specs.heightCm} cm` },
    specs.widthCm && { label: 'Largura', value: `${specs.widthCm} cm` },
    specs.depthCm && { label: 'Profundidade', value: `${specs.depthCm} cm` },
    specs.weightG && { label: 'Peso', value: `${specs.weightG} g` },
    specs.capacity && { label: 'Capacidade', value: specs.capacity },
    specs.material && { label: 'Material', value: specs.material },
  ].filter(Boolean) as { label: string; value: string }[];

  const items = [
    { title: 'Descrição', content: <ProductDescription value={product.description} /> },
  ];

  // O backend nao guarda dimensoes: sem dados, a secao inteira sai em vez de
  // abrir uma lista vazia.
  if (measurements.length > 0) {
    items.push({
      title: 'Medidas e materiais',
      content: (
        <ul className="grid grid-cols-2 gap-y-2">
          {measurements.map((spec) => (
            <Spec key={spec.label} label={spec.label} value={spec.value} />
          ))}
        </ul>
      ),
    });
  }

  if (specs.care) items.push({ title: 'Cuidados', content: <p>{specs.care}</p> });

  items.push({
    title: 'Trocas e envio',
    content: (
      <p>
        Você tem até {STORE.returnWindowDays} dias corridos após o recebimento para solicitar troca
        ou devolução. O frete é calculado no checkout e enviamos para todo o Brasil.
      </p>
    ),
  });

  return items;
}

/**
 * Dados estruturados para buscadores.
 * Sem `aggregateRating`: marcar nota que nao vem de avaliacao verificada e
 * motivo de penalizacao no Google e engana quem le o resultado da busca.
 */
function ProductJsonLd({
  product,
  priceCents,
  inStock,
}: {
  product: Product;
  priceCents: number;
  inStock: boolean;
}) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription || product.description,
    image: product.media.map((media) => media.url).slice(0, 5),
    brand: { '@type': 'Brand', name: STORE.name },
    offers: {
      '@type': 'Offer',
      price: (priceCents / 100).toFixed(2),
      priceCurrency: 'BRL',
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    },
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex flex-col">
      <span className="text-xs text-store-gray">{label}</span>
      <span className="font-medium text-graphite">{value}</span>
    </li>
  );
}

function ProductSkeleton() {
  return (
    <Container className="py-8">
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
        <Skeleton className="aspect-square w-full rounded-[var(--radius-xl)]" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </Container>
  );
}
