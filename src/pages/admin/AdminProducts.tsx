import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, MagnifyingGlass, PencilSimple, Plus, Star } from '@phosphor-icons/react';
import { adminService, queryKeys } from '@/lib/api';
import type { AdminInventorySummary, AdminProduct, AdminProductVariant } from '@/types';
import { PageHeader, AdminTable, Panel } from '@/components/admin/AdminUI';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { Pill } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { productImage } from '@/lib/images';
import { formatDateShort, formatPrice } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'Draft', label: 'Rascunho' },
  { value: 'Published', label: 'Publicado' },
  { value: 'Archived', label: 'Arquivado' },
];

function statusPill(status: string) {
  if (status === 'Published') return <Pill tone="success">Publicado</Pill>;
  if (status === 'Archived') return <Pill tone="neutral">Arquivado</Pill>;
  return <Pill tone="warning">Rascunho</Pill>;
}

function stockPill(product: AdminProduct) {
  const available = product.variants.reduce((sum, variant) => sum + variant.availableQuantity, 0);
  const low = product.variants.some((variant) => variant.isLowStock);
  const tone = available === 0 ? 'danger' : low ? 'warning' : 'success';

  return <Pill tone={tone}>{available} disp.</Pill>;
}

function priceFrom(product: AdminProduct) {
  const prices = product.variants
    .filter((variant) => variant.isActive)
    .map((variant) => variant.promotionalPriceCents ?? variant.priceCents);

  return prices.length ? Math.min(...prices) : 0;
}

function productImageUrl(product: AdminProduct) {
  return product.images.find((image) => image.isMain)?.publicUrl ||
    product.images[0]?.publicUrl ||
    productImage(product.categories[0]?.slug || product.name, product.mainColor || 'terracotta', Number(product.id) || 1);
}

export function AdminProducts() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>();

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
    mutationFn: (input: { id: string; status: 'Draft' | 'Published' }) => adminService.updateAdminProductStatus(input.id, input.status),
    onSuccess: (product) => {
      toast.success(product.status === 'Published' ? 'Produto publicado.' : 'Produto movido para rascunho.');
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.products });
      setSelectedProductId(product.id);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Nao foi possivel atualizar o status.'),
  });

  const productFeatured = useMutation({
    mutationFn: (input: { id: string; featured: boolean }) => adminService.updateAdminProductFeatured(input.id, input.featured),
    onSuccess: (product) => {
      toast.success(product.isFeatured ? 'Produto marcado como destaque.' : 'Produto removido dos destaques.');
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.products });
      setSelectedProductId(product.id);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Nao foi possivel atualizar o destaque.'),
  });

  const products = productsQuery.data ?? [];
  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? products[0],
    [products, selectedProductId],
  );

  const published = products.filter((product) => product.status === 'Published').length;
  const drafts = products.filter((product) => product.status === 'Draft').length;
  const lowStock = products.filter((product) => product.variants.some((variant) => variant.isLowStock)).length;

  return (
    <div>
      <PageHeader
        title="Produtos"
        subtitle="Catálogo administrativo com status, destaque, variações e estoque."
        action={<ButtonLink to="/admin/produtos/novo"><Plus size={17} /> Novo produto</ButtonLink>}
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Panel>
          <p className="text-sm text-graphite-soft">Neste filtro</p>
          <p className="mt-2 text-2xl font-semibold text-graphite">{products.length}</p>
        </Panel>
        <Panel>
          <p className="text-sm text-graphite-soft">Publicados</p>
          <p className="mt-2 text-2xl font-semibold text-success">{published}</p>
        </Panel>
        <Panel>
          <p className="text-sm text-graphite-soft">Rascunhos</p>
          <p className="mt-2 text-2xl font-semibold text-warning">{drafts}</p>
        </Panel>
        <Panel>
          <p className="text-sm text-graphite-soft">Estoque baixo</p>
          <p className="mt-2 text-2xl font-semibold text-danger">{lowStock}</p>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <Panel title="Catálogo">
          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_190px]">
            <div className="relative">
              <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-store-gray" />
              <Input
                placeholder="Buscar produto, slug ou SKU"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-10"
                aria-label="Buscar produto"
              />
            </div>
            <Select aria-label="Filtrar status" value={status} onChange={(event) => setStatus(event.target.value)}>
              {STATUS_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
            </Select>
          </div>

          {productsQuery.isLoading ? (
            <Skeleton className="h-72 w-full rounded-[var(--radius-lg)]" />
          ) : (
            <AdminTable<AdminProduct>
              rowKey={(product) => product.id}
              rows={products}
              empty="Nenhum produto encontrado."
              columns={[
                {
                  key: 'name',
                  header: 'Produto',
                  render: (product) => (
                    <div className="flex items-center gap-3">
                      <img src={productImageUrl(product)} alt="" className="h-11 w-10 rounded-md object-cover" />
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-graphite-soft">{product.categories[0]?.name || product.slug}</p>
                      </div>
                    </div>
                  ),
                },
                { key: 'status', header: 'Status', render: (product) => statusPill(product.status) },
                { key: 'price', header: 'A partir de', render: (product) => formatPrice(priceFrom(product)) },
                { key: 'stock', header: 'Estoque', render: stockPill },
                { key: 'variants', header: 'SKUs', render: (product) => `${product.variants.length}` },
                { key: 'featured', header: 'Destaque', render: (product) => product.isFeatured ? <Pill tone="info"><Star size={12} weight="fill" /> Sim</Pill> : '-' },
                {
                  key: 'actions',
                  header: 'Ações',
                  render: (product) => (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setSelectedProductId(product.id)}>
                        <Eye size={15} /> Detalhe
                      </Button>
                      <ButtonLink size="sm" variant="outline" to={`/admin/produtos/${product.id}`}>
                        <PencilSimple size={15} /> Editar
                      </ButtonLink>
                      {product.status !== 'Archived' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          loading={productStatus.isPending}
                          onClick={() => productStatus.mutate({ id: product.id, status: product.status === 'Published' ? 'Draft' : 'Published' })}
                        >
                          {product.status === 'Published' ? 'Rascunho' : 'Publicar'}
                        </Button>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          )}
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel title={selectedProduct ? 'Detalhe do produto' : 'Produto'}>
            {productsQuery.isLoading ? (
              <Skeleton className="h-56 w-full rounded-[var(--radius-lg)]" />
            ) : selectedProduct ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <img src={productImageUrl(selectedProduct)} alt="" className="h-16 w-14 rounded-md object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-graphite">{selectedProduct.name}</p>
                    <p className="break-all text-xs text-graphite-soft">{selectedProduct.slug}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {statusPill(selectedProduct.status)}
                      {selectedProduct.isAvailable ? <Pill tone="success">Disponível</Pill> : <Pill tone="danger">Indisponível</Pill>}
                    </div>
                  </div>
                </div>

                <div className="grid gap-2 text-sm">
                  <DetailRow label="Categoria" value={selectedProduct.categories.map((category) => category.name).join(', ') || '-'} />
                  <DetailRow label="Coleção" value={selectedProduct.collection || '-'} />
                  <DetailRow label="Material" value={selectedProduct.mainMaterial || '-'} />
                  <DetailRow label="Criado em" value={formatDateShort(selectedProduct.createdAt)} />
                  <DetailRow label="Publicado em" value={selectedProduct.publishedAt ? formatDateShort(selectedProduct.publishedAt) : '-'} />
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedProduct.status !== 'Archived' && (
                    <Button
                      size="sm"
                      variant="outline"
                      loading={productStatus.isPending}
                      onClick={() => productStatus.mutate({ id: selectedProduct.id, status: selectedProduct.status === 'Published' ? 'Draft' : 'Published' })}
                    >
                      {selectedProduct.status === 'Published' ? 'Mover para rascunho' : 'Publicar'}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant={selectedProduct.isFeatured ? 'ghost' : 'outline'}
                    loading={productFeatured.isPending}
                    disabled={selectedProduct.status === 'Archived'}
                    onClick={() => productFeatured.mutate({ id: selectedProduct.id, featured: !selectedProduct.isFeatured })}
                  >
                    {selectedProduct.isFeatured ? 'Remover destaque' : 'Destacar'}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-graphite-soft">Selecione um produto para ver detalhes.</p>
            )}
          </Panel>

          <Panel title="Variações e estoque">
            {selectedProduct ? (
              <AdminTable<AdminProductVariant>
                rowKey={(variant) => variant.id}
                rows={selectedProduct.variants}
                empty="Nenhuma variação cadastrada."
                columns={[
                  { key: 'sku', header: 'SKU', render: (variant) => <span className="font-mono text-xs">{variant.sku}</span> },
                  { key: 'name', header: 'Variação', render: (variant) => variant.name },
                  { key: 'price', header: 'Preço', render: (variant) => formatPrice(variant.promotionalPriceCents ?? variant.priceCents) },
                  { key: 'stock', header: 'Disp.', render: (variant) => <Pill tone={variant.availableQuantity === 0 ? 'danger' : variant.isLowStock ? 'warning' : 'success'}>{variant.availableQuantity}</Pill> },
                ]}
              />
            ) : (
              <p className="text-sm text-graphite-soft">Selecione um produto para ver SKUs.</p>
            )}
          </Panel>

          <Panel title="SKUs com estoque baixo" action={<ButtonLink size="sm" variant="ghost" to="/admin/estoque">Ver estoque</ButtonLink>}>
            {inventoryQuery.isLoading ? (
              <Skeleton className="h-40 w-full rounded-[var(--radius-lg)]" />
            ) : (
              <div className="space-y-3">
                {(inventoryQuery.data ?? []).map((item: AdminInventorySummary) => (
                  <div key={item.variantId} className="flex items-center justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium text-graphite">{item.productName}</p>
                      <p className="font-mono text-xs text-graphite-soft">{item.sku}</p>
                    </div>
                    <Pill tone={item.availableQuantity === 0 ? 'danger' : 'warning'}>{item.availableQuantity}/{item.minimumStock}</Pill>
                  </div>
                ))}
                {(inventoryQuery.data ?? []).length === 0 && <p className="text-sm text-graphite-soft">Nenhum SKU em estoque baixo.</p>}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-2 last:border-0">
      <span className="text-graphite-soft">{label}</span>
      <span className="text-right font-medium text-graphite">{value}</span>
    </div>
  );
}
