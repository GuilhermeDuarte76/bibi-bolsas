import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowSquareOut,
  CheckCircle,
  ClockCounterClockwise,
  CopySimple,
  Eye,
  FileDashed,
  Package,
  PencilSimple,
  Plus,
  Star,
  TrashSimple,
  Warning,
  X,
} from '@phosphor-icons/react';
import { adminService, queryKeys } from '@/lib/api';
import type { AdminInventorySummary, AdminProduct, AdminProductPriceHistory, AdminProductVariant } from '@/types';
import {
  Button,
  ButtonLink,
  DataTable,
  PageHeader,
  SearchInput,
  Select,
  SectionCard,
  StatCard,
  StatusBadge,
  Toolbar,
  ToolbarSpacer,
  ConfirmDialog,
  Modal,
  toast,
  type Column,
  type SortState,
  type Tone,
} from '@/components/admin/ui';
import { productImage } from '@/lib/images';
import { formatDateShort, formatPrice } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'Draft', label: 'Rascunho' },
  { value: 'Published', label: 'Publicado' },
  { value: 'Archived', label: 'Arquivado' },
];

const STOCK_OPTIONS = [
  { value: '', label: 'Todos os estoques' },
  { value: 'available', label: 'Com estoque' },
  { value: 'low', label: 'Estoque baixo' },
  { value: 'out', label: 'Sem estoque' },
];

const FEATURED_OPTIONS = [
  { value: '', label: 'Todos os tipos' },
  { value: 'featured', label: 'Destaques' },
  { value: 'promotion', label: 'Em promoção' },
  { value: 'new', label: 'Novidades' },
];

function availableQty(product: AdminProduct) {
  return product.variants.reduce((sum, variant) => sum + variant.availableQuantity, 0);
}

function statusTone(status: string): Tone {
  if (status === 'Published') return 'success';
  if (status === 'Archived') return 'neutral';
  return 'warning';
}

function statusLabel(status: string) {
  if (status === 'Published') return 'Publicado';
  if (status === 'Archived') return 'Arquivado';
  return 'Rascunho';
}

function stockTone(product: AdminProduct): Tone {
  const available = availableQty(product);
  const low = product.variants.some((v) => v.isLowStock);
  return available === 0 ? 'danger' : low ? 'warning' : 'success';
}

function priceFrom(product: AdminProduct) {
  const prices = product.variants
    .filter((v) => v.isActive)
    .map((v) => v.promotionalPriceCents ?? v.priceCents);
  return prices.length ? Math.min(...prices) : 0;
}

function productImageUrl(product: AdminProduct) {
  return (
    product.images.find((image) => image.isMain)?.publicUrl ||
    product.images[0]?.publicUrl ||
    productImage(product.categories[0]?.slug || product.name, product.mainColor || 'terracotta', Number(product.id) || 1)
  );
}

export function AdminProducts() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState('');
  const [highlight, setHighlight] = useState('');
  const [sort, setSort] = useState<SortState | undefined>();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<AdminProduct | null>(null);

  const filters = { search: search.trim() || undefined, status: status || undefined, page: 1, pageSize: 30 };
  const productsQuery = useQuery({
    queryKey: [...queryKeys.admin.products, filters] as const,
    queryFn: () => adminService.listAdminProducts(filters),
  });
  const inventoryQuery = useQuery({
    queryKey: queryKeys.admin.inventory({ low: true, page: 1, pageSize: 8 }),
    queryFn: () => adminService.listInventory({ low: true, page: 1, pageSize: 8 }),
  });

  const productStatus = useMutation({
    mutationFn: (input: { id: string; status: 'Draft' | 'Published' }) =>
      adminService.updateAdminProductStatus(input.id, input.status),
    onSuccess: (product) => {
      toast.success(
        product.status === 'Published'
          ? { title: 'Produto publicado', description: `“${product.name}” está visível na loja.` }
          : { title: 'Movido para rascunho', description: `“${product.name}” saiu da loja.` },
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.products });
    },
    onError: (error) =>
      toast.error({
        title: 'Não foi possível atualizar o status',
        description: error instanceof Error ? error.message : 'Tente novamente em instantes.',
      }),
  });

  const productFeatured = useMutation({
    mutationFn: (input: { id: string; featured: boolean }) =>
      adminService.updateAdminProductFeatured(input.id, input.featured),
    onSuccess: (product) => {
      toast.success(
        product.isFeatured
          ? { title: 'Adicionado aos destaques', description: `“${product.name}” aparecerá em destaque.` }
          : { title: 'Removido dos destaques', description: `“${product.name}” não está mais em destaque.` },
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.products });
    },
    onError: (error) =>
      toast.error({
        title: 'Não foi possível atualizar o destaque',
        description: error instanceof Error ? error.message : 'Tente novamente em instantes.',
      }),
  });

  const productArchive = useMutation({
    mutationFn: (id: string) => adminService.archiveAdminProduct(id),
    onSuccess: (product) => {
      toast.success({
        title: 'Produto excluído da loja',
        description: `“${product.name}” foi arquivado e não aparece mais para clientes.`,
      });
      setArchiveTarget(null);
      setDetailId((current) => (current === product.id ? null : current));
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.products });
    },
    onError: (error) =>
      toast.error({
        title: 'Não foi possível excluir o produto',
        description: error instanceof Error ? error.message : 'Tente novamente em instantes.',
      }),
  });

  const products = productsQuery.data ?? [];

  const categoryOptions = useMemo(() => {
    const byId = new Map<string, { id: string; name: string }>();
    products.flatMap((p) => p.categories).forEach((item) => byId.set(item.id, { id: item.id, name: item.name }));
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const available = availableQty(product);
        const hasLowStock = product.variants.some((v) => v.isLowStock);
        if (category && !product.categories.some((item) => item.id === category)) return false;
        if (stock === 'available' && available <= 0) return false;
        if (stock === 'low' && !hasLowStock) return false;
        if (stock === 'out' && available > 0) return false;
        if (highlight === 'featured' && !product.isFeatured) return false;
        if (highlight === 'promotion' && !product.isPromotion) return false;
        if (highlight === 'new' && !product.isNewArrival) return false;
        return true;
      }),
    [category, highlight, products, stock],
  );

  const sortedProducts = useMemo(() => {
    if (!sort) return filteredProducts;
    const dir = sort.dir === 'asc' ? 1 : -1;
    const val = (p: AdminProduct): string | number => {
      switch (sort.key) {
        case 'name':
          return p.name.toLowerCase();
        case 'status':
          return p.status;
        case 'price':
          return priceFrom(p);
        case 'stock':
          return availableQty(p);
        case 'variants':
          return p.variants.length;
        default:
          return 0;
      }
    };
    return [...filteredProducts].sort((a, b) => {
      const av = val(a);
      const bv = val(b);
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  }, [filteredProducts, sort]);

  const onSort = (key: string) =>
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  const detailProduct = useMemo(() => products.find((p) => p.id === detailId) ?? null, [products, detailId]);

  const priceHistoryQuery = useQuery({
    queryKey: queryKeys.admin.productPriceHistory(detailId ?? ''),
    queryFn: () => adminService.listProductPriceHistory(detailId!),
    enabled: !!detailId,
  });

  const published = filteredProducts.filter((p) => p.status === 'Published').length;
  const drafts = filteredProducts.filter((p) => p.status === 'Draft').length;
  const lowStock = filteredProducts.filter((p) => p.variants.some((v) => v.isLowStock)).length;

  const hasFilters = !!(search || status || category || stock || highlight);
  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setCategory('');
    setStock('');
    setHighlight('');
  };

  const columns: Column<AdminProduct>[] = [
    {
      key: 'name',
      header: 'Produto',
      sortable: true,
      render: (product) => (
        <div className="flex items-center gap-3">
          <img
            src={productImageUrl(product)}
            alt=""
            className="h-11 w-10 shrink-0 rounded-md border border-border object-cover"
          />
          <div className="min-w-0">
            <p className="truncate font-medium text-graphite">{product.name}</p>
            <p className="truncate text-xs text-graphite-soft">{product.categories[0]?.name || product.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (product) => (
        <StatusBadge tone={statusTone(product.status)} dot>
          {statusLabel(product.status)}
        </StatusBadge>
      ),
    },
    {
      key: 'price',
      header: 'A partir de',
      align: 'right',
      sortable: true,
      render: (product) => <span className="font-medium tabular-nums">{formatPrice(priceFrom(product))}</span>,
    },
    {
      key: 'stock',
      header: 'Estoque',
      align: 'right',
      sortable: true,
      render: (product) => (
        <StatusBadge tone={stockTone(product)} size="sm">
          {availableQty(product)} un.
        </StatusBadge>
      ),
    },
    {
      key: 'variants',
      header: 'SKUs',
      align: 'center',
      sortable: true,
      render: (product) => <span className="tabular-nums text-graphite-soft">{product.variants.length}</span>,
    },
    {
      key: 'featured',
      header: 'Destaque',
      align: 'center',
      render: (product) =>
        product.isFeatured ? (
          <Star size={16} weight="fill" className="mx-auto text-terracotta" aria-label="Destaque" />
        ) : (
          <span className="text-store-gray">—</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '250px',
      render: (product) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setDetailId(product.id)}
            title="Ver detalhe"
            aria-label="Ver detalhe"
            className="tactile rounded-md p-2 text-graphite-soft opacity-0 transition-opacity hover:bg-cream-light hover:text-graphite group-hover:opacity-100"
          >
            <Eye size={16} />
          </button>
          {product.status !== 'Archived' && (
            <Button
              size="sm"
              variant="ghost"
              loading={productStatus.isPending && productStatus.variables?.id === product.id}
              onClick={() =>
                productStatus.mutate({
                  id: product.id,
                  status: product.status === 'Published' ? 'Draft' : 'Published',
                })
              }
            >
              {product.status === 'Published' ? 'Despublicar' : 'Publicar'}
            </Button>
          )}
          <ButtonLink
            size="sm"
            variant="ghost"
            to={`/admin/produtos/novo?duplicar=${product.id}`}
            className="h-9 w-9 px-0"
            title="Duplicar produto"
            aria-label={`Duplicar ${product.name}`}
          >
            <CopySimple size={16} weight="bold" />
          </ButtonLink>
          {product.status !== 'Archived' && (
            <Button
              size="sm"
              variant="danger"
              className="h-9 w-9 px-0"
              loading={productArchive.isPending && productArchive.variables === product.id}
              onClick={() => setArchiveTarget(product)}
              title="Excluir produto"
              aria-label="Excluir produto"
            >
              <TrashSimple size={16} weight="bold" />
            </Button>
          )}
          <ButtonLink size="sm" variant="outline" to={`/admin/produtos/${product.id}`} aria-label="Editar">
            <PencilSimple size={15} /> Editar
          </ButtonLink>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Catálogo' }, { label: 'Produtos' }]}
        eyebrow="Catálogo"
        title="Produtos"
        subtitle="Gerencie status, destaque, variações e estoque do catálogo."
        action={
          <ButtonLink to="/admin/produtos/novo">
            <Plus size={17} weight="bold" /> Novo produto
          </ButtonLink>
        }
      />

      {/* Métricas */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Produtos no filtro" value={filteredProducts.length} icon={Package} loading={productsQuery.isLoading} />
        <StatCard
          label="Publicados"
          value={<span className="text-success">{published}</span>}
          icon={CheckCircle}
          loading={productsQuery.isLoading}
        />
        <StatCard
          label="Rascunhos"
          value={<span className="text-warning">{drafts}</span>}
          icon={FileDashed}
          loading={productsQuery.isLoading}
        />
        <StatCard
          label="Com estoque baixo"
          value={<span className={lowStock ? 'text-danger' : undefined}>{lowStock}</span>}
          icon={Warning}
          loading={productsQuery.isLoading}
        />
      </div>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* Catálogo */}
        <SectionCard
          eyebrow="Catálogo"
          title="Todos os produtos"
          description={`${filteredProducts.length} ${filteredProducts.length === 1 ? 'produto' : 'produtos'} no filtro atual.`}
          bodyClassName="flex flex-col gap-4"
        >
          <Toolbar>
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nome, slug ou SKU" />
            <Select aria-label="Filtrar status" value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-auto">
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Select aria-label="Filtrar categoria" value={category} onChange={(e) => setCategory(e.target.value)} className="sm:w-auto">
              <option value="">Todas as categorias</option>
              {categoryOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
            <Select aria-label="Filtrar estoque" value={stock} onChange={(e) => setStock(e.target.value)} className="sm:w-auto">
              {STOCK_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Select aria-label="Filtrar tipo" value={highlight} onChange={(e) => setHighlight(e.target.value)} className="sm:w-auto">
              {FEATURED_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            {hasFilters && (
              <>
                <ToolbarSpacer />
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X size={15} /> Limpar filtros
                </Button>
              </>
            )}
          </Toolbar>

          <DataTable<AdminProduct>
            columns={columns}
            rows={sortedProducts}
            rowKey={(p) => p.id}
            loading={productsQuery.isLoading}
            onRowClick={(p) => setDetailId(p.id)}
            sort={sort}
            onSort={onSort}
            minWidth={860}
            empty={{
              icon: Package,
              title: hasFilters ? 'Nenhum produto neste filtro' : 'Nenhum produto cadastrado',
              description: hasFilters
                ? 'Ajuste ou limpe os filtros para ver mais resultados.'
                : 'Cadastre o primeiro produto do catálogo.',
              action: hasFilters ? (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              ) : (
                <ButtonLink size="sm" to="/admin/produtos/novo">
                  <Plus size={16} /> Novo produto
                </ButtonLink>
              ),
            }}
          />
        </SectionCard>

        {/* Estoque baixo */}
        <SectionCard
          eyebrow="Alerta"
          title="Estoque baixo"
          action={
            <ButtonLink size="sm" variant="ghost" to="/admin/estoque">
              Ver estoque
            </ButtonLink>
          }
          bodyClassName="p-0"
        >
          {inventoryQuery.isLoading ? (
            <div className="space-y-3 px-5 py-5 sm:px-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-md bg-cream-light" />
              ))}
            </div>
          ) : (inventoryQuery.data ?? []).length === 0 ? (
            <div className="flex items-center gap-3 px-5 py-6 text-sm text-graphite-soft sm:px-6">
              <CheckCircle size={20} weight="fill" className="text-success" />
              Nenhum SKU em estoque baixo.
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {(inventoryQuery.data ?? []).map((item: AdminInventorySummary) => (
                <li key={item.variantId} className="flex items-center justify-between gap-3 px-5 py-3 sm:px-6">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-graphite">{item.productName}</p>
                    <p className="truncate font-mono text-xs text-graphite-soft">{item.sku}</p>
                  </div>
                  <StatusBadge tone={item.availableQuantity === 0 ? 'danger' : 'warning'} size="sm">
                    {item.availableQuantity}/{item.minimumStock}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* Detalhe do produto */}
      <ProductDetailModal
        product={detailProduct}
        open={!!detailId}
        onClose={() => setDetailId(null)}
        priceHistory={priceHistoryQuery.data ?? []}
        priceHistoryLoading={priceHistoryQuery.isLoading}
        onToggleStatus={() =>
          detailProduct &&
          productStatus.mutate({
            id: detailProduct.id,
            status: detailProduct.status === 'Published' ? 'Draft' : 'Published',
          })
        }
        onToggleFeatured={() =>
          detailProduct && productFeatured.mutate({ id: detailProduct.id, featured: !detailProduct.isFeatured })
        }
        onArchive={() => detailProduct && setArchiveTarget(detailProduct)}
        statusPending={productStatus.isPending}
        featuredPending={productFeatured.isPending}
        archivePending={productArchive.isPending}
      />

      <ConfirmDialog
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => archiveTarget && productArchive.mutate(archiveTarget.id)}
        title="Excluir produto?"
        description={
          archiveTarget ? (
            <>
              O produto <strong>{archiveTarget.name}</strong> será arquivado e deixará de aparecer na loja. Pedidos,
              histórico e auditoria permanecem preservados.
            </>
          ) : undefined
        }
        confirmLabel="Excluir produto"
        loading={productArchive.isPending}
      />
    </div>
  );
}

function ProductDetailModal({
  product,
  open,
  onClose,
  priceHistory,
  priceHistoryLoading,
  onToggleStatus,
  onToggleFeatured,
  onArchive,
  statusPending,
  featuredPending,
  archivePending,
}: {
  product: AdminProduct | null;
  open: boolean;
  onClose: () => void;
  priceHistory: AdminProductPriceHistory[];
  priceHistoryLoading: boolean;
  onToggleStatus: () => void;
  onToggleFeatured: () => void;
  onArchive: () => void;
  statusPending: boolean;
  featuredPending: boolean;
  archivePending: boolean;
}) {
  const variantColumns: Column<AdminProductVariant>[] = [
    { key: 'sku', header: 'SKU', render: (v) => <span className="font-mono text-xs">{v.sku}</span> },
    { key: 'name', header: 'Variação', render: (v) => v.name },
    {
      key: 'price',
      header: 'Preço',
      align: 'right',
      render: (v) => <span className="tabular-nums">{formatPrice(v.promotionalPriceCents ?? v.priceCents)}</span>,
    },
    {
      key: 'stock',
      header: 'Disp.',
      align: 'right',
      render: (v) => (
        <StatusBadge tone={v.availableQuantity === 0 ? 'danger' : v.isLowStock ? 'warning' : 'success'} size="sm">
          {v.availableQuantity}
        </StatusBadge>
      ),
    },
  ];

  const historyColumns: Column<AdminProductPriceHistory>[] = [
    { key: 'sku', header: 'SKU', render: (e) => <span className="font-mono text-xs">{e.sku}</span> },
    { key: 'price', header: 'Preço', render: (e) => <PriceChange oldValue={e.oldPriceCents} newValue={e.newPriceCents} /> },
    {
      key: 'promo',
      header: 'Promoção',
      render: (e) => <PriceChange oldValue={e.oldPromotionalPriceCents} newValue={e.newPromotionalPriceCents} empty="—" />,
    },
    { key: 'date', header: 'Quando', align: 'right', render: (e) => formatDateShort(e.changedAt) },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={product?.name ?? 'Produto'}
      description={product?.slug}
      footer={
        product && (
          <>
            {product.status !== 'Archived' && (
              <Button variant="outline" size="sm" loading={statusPending} onClick={onToggleStatus}>
                {product.status === 'Published' ? 'Mover para rascunho' : 'Publicar'}
              </Button>
            )}
            <Button
              variant={product.isFeatured ? 'ghost' : 'secondary'}
              size="sm"
              loading={featuredPending}
              disabled={product.status === 'Archived'}
              onClick={onToggleFeatured}
            >
              <Star size={15} weight={product.isFeatured ? 'fill' : 'regular'} />
              {product.isFeatured ? 'Remover destaque' : 'Destacar'}
            </Button>
            <ButtonLink size="sm" to={product ? `/admin/produtos/${product.id}` : '#'}>
              <PencilSimple size={15} /> Editar produto
            </ButtonLink>
            <ButtonLink size="sm" variant="outline" to={`/admin/produtos/novo?duplicar=${product.id}`}>
              <CopySimple size={15} /> Duplicar
            </ButtonLink>
            {product.status !== 'Archived' && (
              <Button
                variant="danger"
                size="sm"
                className="h-9 w-9 px-0"
                loading={archivePending}
                onClick={onArchive}
                title="Excluir produto"
                aria-label="Excluir produto"
              >
                <TrashSimple size={16} weight="bold" />
              </Button>
            )}
          </>
        )
      }
    >
      {product && (
        <div className="flex flex-col gap-6">
          {/* Cabeçalho */}
          <div className="flex flex-wrap items-start gap-4">
            <img
              src={productImageUrl(product)}
              alt=""
              className="h-24 w-20 shrink-0 rounded-[var(--radius-md)] border border-border object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={statusTone(product.status)} dot>
                  {statusLabel(product.status)}
                </StatusBadge>
                <StatusBadge tone={product.isAvailable ? 'success' : 'danger'}>
                  {product.isAvailable ? 'Disponível' : 'Indisponível'}
                </StatusBadge>
                {product.isFeatured && (
                  <StatusBadge tone="brand">
                    <Star size={12} weight="fill" /> Destaque
                  </StatusBadge>
                )}
                {product.isPromotion && <StatusBadge tone="brand">Promoção</StatusBadge>}
                {product.isNewArrival && <StatusBadge tone="info">Novidade</StatusBadge>}
              </div>
              <a
                href={`/produto/${product.slug}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-terracotta hover:underline"
              >
                <ArrowSquareOut size={15} /> Ver na loja
              </a>
            </div>
          </div>

          {/* Ficha */}
          <dl className="grid grid-cols-1 gap-x-6 gap-y-0 sm:grid-cols-2">
            <DetailRow label="Categoria" value={product.categories.map((c) => c.name).join(', ') || '—'} />
            <DetailRow label="Coleção" value={product.collection || '—'} />
            <DetailRow label="Material" value={product.mainMaterial || '—'} />
            <DetailRow label="A partir de" value={formatPrice(priceFrom(product))} />
            <DetailRow label="Criado em" value={formatDateShort(product.createdAt)} />
            <DetailRow label="Publicado em" value={product.publishedAt ? formatDateShort(product.publishedAt) : '—'} />
          </dl>

          {/* Variações */}
          <section>
            <h3 className="mb-2.5 text-sm font-semibold text-graphite">Variações e estoque</h3>
            <DataTable<AdminProductVariant>
              columns={variantColumns}
              rows={product.variants}
              rowKey={(v) => v.id}
              minWidth={440}
              empty={{ title: 'Nenhuma variação cadastrada' }}
            />
          </section>

          {/* Histórico de preço */}
          <section>
            <h3 className="mb-2.5 text-sm font-semibold text-graphite">Histórico de preço</h3>
            {priceHistoryLoading ? (
              <div className="h-24 animate-pulse rounded-[var(--radius-lg)] bg-cream-light" />
            ) : priceHistory.length ? (
              <DataTable<AdminProductPriceHistory>
                columns={historyColumns}
                rows={priceHistory.slice(0, 8)}
                rowKey={(e) => e.id}
                minWidth={440}
              />
            ) : (
              <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-cream-lighter px-4 py-4 text-sm text-graphite-soft">
                <ClockCounterClockwise size={20} className="shrink-0 text-cinnamon" />
                Nenhuma alteração de preço registrada para este produto.
              </div>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
}

function PriceChange({ oldValue, newValue, empty = 'Sem valor' }: { oldValue?: number; newValue?: number; empty?: string }) {
  if (oldValue == null && newValue == null) return <span className="text-graphite-soft">{empty}</span>;
  return (
    <span className="text-sm tabular-nums">
      <span className="text-graphite-soft">{oldValue != null ? formatPrice(oldValue) : '—'}</span>
      <span className="mx-1 text-store-gray">→</span>
      <strong className="font-medium text-graphite">{newValue != null ? formatPrice(newValue) : '—'}</strong>
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-2.5">
      <dt className="text-sm text-graphite-soft">{label}</dt>
      <dd className="text-right text-sm font-medium text-graphite">{value}</dd>
    </div>
  );
}
