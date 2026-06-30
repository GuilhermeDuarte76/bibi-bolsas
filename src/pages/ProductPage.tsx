import { useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CaretRight, Handbag, Heart, Minus, Plus, ShieldCheck } from '@phosphor-icons/react';
import { catalogService, queryKeys } from '@/lib/api';
import { useCart } from '@/store/cart';
import { useUI } from '@/store/ui';
import { toast } from '@/components/ui/Toast';
import { Container } from '@/components/ui/Layout';
import { Button } from '@/components/ui/Button';
import { Accordion } from '@/components/ui/Accordion';
import { Stars } from '@/components/ui/Stars';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import { ProductGallery } from '@/components/product/ProductGallery';
import { ProductGalleryFallback } from '@/components/product/ProductGalleryFallback';
import { Swatches } from '@/components/product/Swatches';
import { PriceBlock } from '@/components/product/PriceBlock';
import { StockBadge } from '@/components/product/StockBadge';
import { ShippingCalculator } from '@/components/product/ShippingCalculator';
import { ProductCard } from '@/components/product/ProductCard';
import { reviews as allReviews } from '@/lib/api/mock/account';

export function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { openCart } = useUI();

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

  const [colorId, setColorId] = useState<string>();
  const [sizeId, setSizeId] = useState<string>();
  const [qty, setQty] = useState(1);

  const selectedColor = colorId ?? product?.colors[0]?.id;
  const selectedSize = sizeId ?? product?.sizes[0]?.id;

  const variant = useMemo(() => {
    if (!product) return undefined;
    return (
      product.variants.find(
        (v) =>
          v.colorId === selectedColor &&
          (v.sizeId ?? product.sizes[0]?.id) === (selectedSize ?? product.sizes[0]?.id),
      ) ?? product.variants[0]
    );
  }, [product, selectedColor, selectedSize]);

  const productReviews = allReviews.filter((r) => r.productId === product?.id);

  if (isLoading) return <ProductSkeleton />;
  if (isError || !product) return <Container className="py-20"><ErrorState onRetry={() => refetch()} /></Container>;

  const stock = variant?.stock ?? 0;
  const colorName = product.colors.find((c) => c.id === selectedColor)?.name ?? '';
  const sizeLabel = product.sizes.find((s) => s.id === selectedSize)?.label;

  const handleAdd = (goCheckout = false) => {
    if (!variant || stock <= 0) return;
    addItem({
      productId: product.id,
      slug: product.slug,
      variantId: variant.id,
      name: product.name,
      colorName,
      sizeLabel: sizeLabel === 'Unico' ? undefined : sizeLabel,
      image: product.media[0].url,
      unitPriceCents: variant.priceCents,
      compareAtCents: variant.compareAtCents,
      maxStock: variant.stock,
      quantity: qty,
    });
    if (goCheckout) navigate('/checkout');
    else {
      toast.success('Adicionado à sacola');
      openCart();
    }
  };

  return (
    <Container className="py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-xs text-graphite-soft" aria-label="Caminho">
        <Link to="/" className="hover:text-terracotta">Início</Link>
        <CaretRight size={12} />
        <Link to={`/categoria/${product.categorySlug}`} className="capitalize hover:text-terracotta">
          {product.categorySlug.replace('-', ' ')}
        </Link>
        <CaretRight size={12} />
        <span className="text-graphite">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
        {/* Galeria */}
        <div>
          {product.media.length > 0 ? (
            <ProductGallery media={product.media} name={product.name} />
          ) : (
            <ProductGalleryFallback />
          )}
        </div>

        {/* Info / compra */}
        <div className="flex flex-col">
          {product.collection && <span className="eyebrow">{product.collection}</span>}
          <h1 className="mt-1 font-display text-3xl text-graphite sm:text-4xl">{product.name}</h1>

          <div className="mt-3 flex items-center gap-3">
            <Stars rating={product.rating} count={product.reviewCount} />
            <span className="text-sm text-graphite-soft">·</span>
            <StockBadge stock={stock} />
          </div>

          <div className="mt-5">
            <PriceBlock
              priceCents={variant?.priceCents ?? product.priceFromCents}
              compareAtCents={variant?.compareAtCents}
              installments={product.installmentsMax}
              pixPct={product.pixDiscountPct}
              size="lg"
            />
          </div>

          <p className="mt-5 text-graphite-soft">{product.shortDescription}</p>

          {/* Cores */}
          <div className="mt-6">
            <p className="mb-2 text-sm font-medium text-graphite">
              Cor: <span className="text-graphite-soft">{colorName}</span>
            </p>
            <Swatches colors={product.colors} value={selectedColor} onChange={(id) => { setColorId(id); setQty(1); }} />
          </div>

          {/* Tamanhos (se houver) */}
          {product.sizes.length > 1 && (
            <div className="mt-5">
              <p className="mb-2 text-sm font-medium text-graphite">Tamanho</p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSizeId(s.id)}
                    className={`tactile rounded-[var(--radius-md)] border px-4 py-2 text-sm ${
                      selectedSize === s.id ? 'border-graphite bg-graphite text-cream-light' : 'border-border text-graphite hover:border-graphite'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
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

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" variant="secondary" fullWidth onClick={() => handleAdd(true)} disabled={stock <= 0}>
              Comprar agora
            </Button>
            <Button size="lg" variant="outline" fullWidth onClick={() => handleAdd(false)} disabled={stock <= 0}>
              <Handbag size={18} /> Adicionar à sacola
            </Button>
            <button aria-label="Favoritar" className="tactile hidden h-13 w-13 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-border text-graphite hover:text-terracotta sm:flex">
              <Heart size={20} />
            </button>
          </div>

          <p className="mt-3 flex items-center gap-2 text-xs text-graphite-soft">
            <ShieldCheck size={16} className="text-success" /> Compra 100% segura · Troca facilitada em até 7 dias
          </p>

          {/* Frete */}
          <div className="mt-6">
            <ShippingCalculator subtotalCents={(variant?.priceCents ?? product.priceFromCents) * qty} />
          </div>

          {/* Acordeoes */}
          <div className="mt-8">
            <Accordion
              defaultOpen={0}
              items={[
                {
                  title: 'Descrição',
                  content: <p>{product.description}</p>,
                },
                {
                  title: 'Medidas e materiais',
                  content: (
                    <ul className="grid grid-cols-2 gap-y-2">
                      {product.specs.heightCm && <Spec label="Altura" value={`${product.specs.heightCm} cm`} />}
                      {product.specs.widthCm && <Spec label="Largura" value={`${product.specs.widthCm} cm`} />}
                      {product.specs.depthCm && <Spec label="Profundidade" value={`${product.specs.depthCm} cm`} />}
                      {product.specs.weightG && <Spec label="Peso" value={`${product.specs.weightG} g`} />}
                      {product.specs.capacity && <Spec label="Capacidade" value={product.specs.capacity} />}
                      {product.specs.material && <Spec label="Material" value={product.specs.material} />}
                    </ul>
                  ),
                },
                { title: 'Cuidados', content: <p>{product.specs.care}</p> },
                {
                  title: 'Trocas e envio',
                  content: (
                    <p>
                      Você tem até 7 dias corridos após o recebimento para solicitar troca ou
                      devolução. O frete é calculado no checkout e enviamos para todo o Brasil.
                    </p>
                  ),
                },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Avaliacoes */}
      <section className="mt-12 lg:mt-16">
        <h2 className="font-display text-2xl text-graphite">Avaliações</h2>
        <div className="mt-4 flex items-center gap-4">
          <span className="font-display text-4xl text-graphite">{product.rating.toFixed(1)}</span>
          <div>
            <Stars rating={product.rating} />
            <p className="mt-1 text-sm text-graphite-soft">{product.reviewCount} avaliações</p>
          </div>
        </div>

        {productReviews.length > 0 ? (
          <ul className="mt-8 grid gap-5 md:grid-cols-2">
            {productReviews.map((r) => (
              <li key={r.id} className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
                <div className="flex items-center justify-between">
                  <Stars rating={r.rating} />
                  {r.verifiedPurchase && <Badge kind="pronta-entrega" className="!bg-success-soft !text-success" />}
                </div>
                <p className="mt-3 font-medium text-graphite">{r.title}</p>
                <p className="mt-1 text-sm text-graphite-soft">{r.body}</p>
                <p className="mt-3 text-xs text-store-gray">{r.customerName}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 text-sm text-graphite-soft">Este produto ainda não tem avaliações. Seja a primeira!</p>
        )}
      </section>

      {/* Relacionados */}
      {related && related.length > 0 && (
        <section className="mt-12 lg:mt-16">
          <h2 className="mb-8 font-display text-2xl text-graphite">Você também pode gostar</h2>
          <div className="grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </Container>
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
