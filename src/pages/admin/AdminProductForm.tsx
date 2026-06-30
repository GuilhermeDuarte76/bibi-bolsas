import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CaretLeft, Image as ImageIcon } from '@phosphor-icons/react';
import { adminService, queryKeys } from '@/lib/api';
import { PageHeader, Panel } from '@/components/admin/AdminUI';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { AdminTable } from '@/components/admin/AdminUI';
import { formatPrice } from '@/lib/utils';
import type { ProductVariant } from '@/types';

/**
 * Formulario de produto (novo/editar). Demonstra a estrutura de edicao com
 * variacoes, midias, dimensoes e estoque. Persistencia real via API (TODO backend).
 */
export function AdminProductForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === 'novo';

  const { data: products, isLoading } = useQuery({
    queryKey: queryKeys.admin.products,
    queryFn: () => adminService.listProducts(),
    enabled: !isNew,
  });
  const product = products?.find((p) => p.id === id);

  if (!isNew && isLoading) return <Skeleton className="h-96 w-full rounded-[var(--radius-lg)]" />;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(isNew ? 'Produto criado (mock)' : 'Alterações salvas (mock)');
    navigate('/admin/produtos');
  };

  return (
    <form onSubmit={save}>
      <button type="button" onClick={() => navigate('/admin/produtos')} className="mb-4 flex items-center gap-1 text-sm text-graphite-soft hover:text-graphite">
        <CaretLeft size={16} /> Voltar
      </button>
      <PageHeader
        title={isNew ? 'Novo produto' : product?.name ?? 'Produto'}
        subtitle={isNew ? 'Cadastre um novo item do catálogo' : 'Editar informações do produto'}
        action={<div className="flex gap-2"><Button type="button" variant="ghost" onClick={() => navigate('/admin/produtos')}>Cancelar</Button><Button type="submit">Salvar</Button></div>}
      />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-6">
          <Panel title="Informações básicas">
            <div className="flex flex-col gap-4">
              <Field label="Nome">
                {(id2) => <Input id={id2} defaultValue={product?.name} placeholder="Ex.: Bolsa Tote Manhattan" />}
              </Field>
              <Field label="Descrição curta">
                {(id2) => <Input id={id2} defaultValue={product?.shortDescription} />}
              </Field>
              <Field label="Descrição completa">
                {(id2) => <Textarea id={id2} defaultValue={product?.description} />}
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Categoria">
                  {(id2) => (
                    <Select id={id2} defaultValue={product?.categorySlug ?? 'bolsas'}>
                      <option value="bolsas">Bolsas</option>
                      <option value="mochilas">Mochilas</option>
                      <option value="malas">Malas</option>
                      <option value="kit-viagem">Kit Viagem</option>
                    </Select>
                  )}
                </Field>
                <Field label="Coleção">
                  {(id2) => <Input id={id2} defaultValue={product?.collection} />}
                </Field>
              </div>
            </div>
          </Panel>

          {!isNew && product && (
            <Panel title="Variações e estoque">
              <AdminTable<ProductVariant>
                rowKey={(v) => v.id}
                rows={product.variants}
                columns={[
                  { key: 'sku', header: 'SKU', render: (v) => <span className="font-mono text-xs">{v.sku}</span> },
                  { key: 'color', header: 'Cor', render: (v) => product.colors.find((c) => c.id === v.colorId)?.name ?? '—' },
                  { key: 'price', header: 'Preço', render: (v) => formatPrice(v.priceCents) },
                  { key: 'stock', header: 'Estoque', render: (v) => `${v.stock}` },
                ]}
              />
            </Panel>
          )}

          <Panel title="Dimensões e peso (frete)">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="Altura (cm)">{(i) => <Input id={i} type="number" defaultValue={product?.specs.heightCm} />}</Field>
              <Field label="Largura (cm)">{(i) => <Input id={i} type="number" defaultValue={product?.specs.widthCm} />}</Field>
              <Field label="Profund. (cm)">{(i) => <Input id={i} type="number" defaultValue={product?.specs.depthCm} />}</Field>
              <Field label="Peso (g)">{(i) => <Input id={i} type="number" defaultValue={product?.specs.weightG} />}</Field>
            </div>
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel title="Mídias">
            <div className="grid grid-cols-3 gap-3">
              {(product?.media ?? []).map((m) => (
                <img key={m.id} src={m.url} alt={m.alt} className="aspect-square rounded-[var(--radius-md)] object-cover" />
              ))}
              <button type="button" className="grid aspect-square place-items-center rounded-[var(--radius-md)] border border-dashed border-border text-store-gray hover:border-terracotta hover:text-terracotta">
                <ImageIcon size={26} />
              </button>
            </div>
            <p className="mt-3 text-xs text-graphite-soft">Upload via storage externo (R2/S3) na integração real. Verifique tipo e tamanho do arquivo.</p>
          </Panel>

          <Panel title="Preço e promoção">
            <div className="flex flex-col gap-4">
              <Field label="Preço (R$)">{(i) => <Input id={i} type="number" step="0.01" defaultValue={product ? product.priceFromCents / 100 : ''} />}</Field>
              <Field label="Preço promocional (R$)">{(i) => <Input id={i} type="number" step="0.01" defaultValue={product?.compareAtFromCents ? product.compareAtFromCents / 100 : ''} />}</Field>
              <Field label="Parcelas máx. sem juros">{(i) => <Input id={i} type="number" defaultValue={product?.installmentsMax ?? 6} />}</Field>
            </div>
          </Panel>
        </div>
      </div>
    </form>
  );
}
