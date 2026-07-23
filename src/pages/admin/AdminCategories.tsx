import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, MagnifyingGlass, PencilSimple, Plus, XCircle } from '@phosphor-icons/react';
import { adminService, queryKeys } from '@/lib/api';
import type { AdminCategoryInput } from '@/lib/api/admin.service';
import type { AdminCatalogCategory } from '@/types';
import { PageHeader, Panel, AdminTable } from '@/components/admin/AdminUI';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Pill } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { formatDateShort, slugify } from '@/lib/utils';

type CategoryStatusFilter = 'all' | 'active' | 'inactive';

interface CategoryFormState {
  name: string;
  slug: string;
  description: string;
  parentCategoryId: string;
  displayOrder: string;
  isActive: 'true' | 'false';
  seoTitle: string;
  seoDescription: string;
}

const emptyForm: CategoryFormState = {
  name: '',
  slug: '',
  description: '',
  parentCategoryId: '',
  displayOrder: '0',
  isActive: 'true',
  seoTitle: '',
  seoDescription: '',
};

function categoryToForm(category: AdminCatalogCategory): CategoryFormState {
  return {
    name: category.name,
    slug: category.slug,
    description: category.description ?? '',
    parentCategoryId: category.parentCategoryId ?? '',
    displayOrder: String(category.displayOrder),
    isActive: category.isActive ? 'true' : 'false',
    seoTitle: category.seoTitle ?? '',
    seoDescription: category.seoDescription ?? '',
  };
}

function toInput(form: CategoryFormState): AdminCategoryInput {
  return {
    name: form.name.trim(),
    slug: form.slug.trim() || undefined,
    description: form.description.trim() || undefined,
    parentCategoryId: form.parentCategoryId || undefined,
    displayOrder: Number(form.displayOrder) || 0,
    isActive: form.isActive === 'true',
    seoTitle: form.seoTitle.trim() || undefined,
    seoDescription: form.seoDescription.trim() || undefined,
  };
}

function validateForm(
  form: CategoryFormState,
  editingId?: string,
  blockedParentIds: Set<string> = new Set(),
): string | undefined {
  const name = form.name.trim();
  const slug = form.slug.trim();
  const displayOrder = Number(form.displayOrder);

  if (name.length < 2) return 'Informe um nome de categoria com pelo menos 2 caracteres.';
  if (name.length > 120) return 'O nome deve ter no maximo 120 caracteres.';
  if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return 'O slug deve usar apenas letras minusculas, numeros e hifens.';
  if (form.description.length > 500) return 'A descricao deve ter no maximo 500 caracteres.';
  if (!Number.isFinite(displayOrder)) return 'A ordem precisa ser um numero valido.';
  if (form.parentCategoryId && form.parentCategoryId === editingId) return 'A categoria nao pode ser pai dela mesma.';
  if (form.parentCategoryId && blockedParentIds.has(form.parentCategoryId)) return 'A categoria pai nao pode ser uma subcategoria dela mesma.';
  if (form.seoTitle.length > 160) return 'O titulo SEO deve ter no maximo 160 caracteres.';
  if (form.seoDescription.length > 300) return 'A descricao SEO deve ter no maximo 300 caracteres.';

  return undefined;
}

function statusPill(category: AdminCatalogCategory) {
  return category.isActive ? <Pill tone="success">Ativa</Pill> : <Pill tone="neutral">Arquivada</Pill>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-2 last:border-0">
      <span className="text-graphite-soft">{label}</span>
      <span className="max-w-[60%] text-right font-medium text-graphite">{value}</span>
    </div>
  );
}

export function AdminCategories() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<CategoryStatusFilter>('all');
  const [editingId, setEditingId] = useState<string | undefined>();
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [archiveTargetId, setArchiveTargetId] = useState<string | undefined>();
  const [slugTouched, setSlugTouched] = useState(false);
  const [form, setForm] = useState<CategoryFormState>(emptyForm);

  const categoriesQuery = useQuery({
    queryKey: queryKeys.admin.categories,
    queryFn: () => adminService.listAdminCategories(),
  });

  const categories = categoriesQuery.data ?? [];
  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const childrenByParent = useMemo(() => {
    const map = new Map<string, AdminCatalogCategory[]>();
    categories.forEach((category) => {
      if (!category.parentCategoryId) return;
      const group = map.get(category.parentCategoryId) ?? [];
      group.push(category);
      map.set(category.parentCategoryId, group);
    });
    return map;
  }, [categories]);
  const blockedParentIds = useMemo(() => {
    const blocked = new Set<string>();
    if (!editingId) return blocked;

    const walk = (categoryId: string) => {
      childrenByParent.get(categoryId)?.forEach((child) => {
        blocked.add(child.id);
        walk(child.id);
      });
    };

    walk(editingId);
    return blocked;
  }, [childrenByParent, editingId]);

  const filteredCategories = useMemo(() => {
    const term = search.trim().toLowerCase();

    return categories
      .filter((category) => {
        if (status === 'active' && !category.isActive) return false;
        if (status === 'inactive' && category.isActive) return false;
        if (!term) return true;

        return [
          category.name,
          category.slug,
          category.description,
          category.seoTitle,
          category.seoDescription,
        ].some((value) => value?.toLowerCase().includes(term));
      })
      .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
  }, [categories, search, status]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedId) ?? filteredCategories[0],
    [categories, filteredCategories, selectedId],
  );

  const invalidateCategoryData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.categories }),
      queryClient.invalidateQueries({ queryKey: queryKeys.categories }),
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.products }),
      queryClient.invalidateQueries({ queryKey: ['products'] }),
    ]);
  };

  const saveCategory = useMutation({
    mutationFn: (input: AdminCategoryInput) => editingId
      ? adminService.updateAdminCategory(editingId, input)
      : adminService.createAdminCategory(input),
    onSuccess: async (category) => {
      await invalidateCategoryData();
      setSelectedId(category.id);
      setEditingId(category.id);
      setForm(categoryToForm(category));
      setSlugTouched(true);
      toast.success(editingId ? 'Categoria atualizada.' : 'Categoria criada.');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Nao foi possivel salvar a categoria.'),
  });

  const archiveCategory = useMutation({
    mutationFn: (categoryId: string) => adminService.archiveAdminCategory(categoryId),
    onSuccess: async (category) => {
      await invalidateCategoryData();
      setSelectedId(category.id);
      setArchiveTargetId(undefined);
      if (editingId === category.id) {
        setForm(categoryToForm(category));
      }
      toast.success('Categoria arquivada.');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Nao foi possivel arquivar a categoria.'),
  });

  const reactivateCategory = useMutation({
    mutationFn: (category: AdminCatalogCategory) => adminService.updateAdminCategory(category.id, {
      name: category.name,
      slug: category.slug,
      description: category.description,
      parentCategoryId: category.parentCategoryId,
      displayOrder: category.displayOrder,
      isActive: true,
      seoTitle: category.seoTitle,
      seoDescription: category.seoDescription,
    }),
    onSuccess: async (category) => {
      await invalidateCategoryData();
      setSelectedId(category.id);
      if (editingId === category.id) setForm(categoryToForm(category));
      toast.success('Categoria reativada.');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Nao foi possivel reativar a categoria.'),
  });

  const activeCount = categories.filter((category) => category.isActive).length;
  const archivedCount = categories.length - activeCount;
  const rootCount = categories.filter((category) => !category.parentCategoryId).length;
  const childCount = categories.filter((category) => category.parentCategoryId).length;

  const startCreate = () => {
    setEditingId(undefined);
    setSelectedId(undefined);
    setArchiveTargetId(undefined);
    setSlugTouched(false);
    setForm({
      ...emptyForm,
      displayOrder: String(categories.length + 1),
    });
  };

  const startEdit = (category: AdminCatalogCategory) => {
    setEditingId(category.id);
    setSelectedId(category.id);
    setArchiveTargetId(undefined);
    setSlugTouched(true);
    setForm(categoryToForm(category));
  };

  const handleNameChange = (value: string) => {
    setForm((current) => ({
      ...current,
      name: value,
      slug: slugTouched ? current.slug : slugify(value),
      seoTitle: current.seoTitle || value,
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const error = validateForm(form, editingId, blockedParentIds);
    if (error) {
      toast.error(error);
      return;
    }

    saveCategory.mutate(toInput(form));
  };

  return (
    <div>
      <PageHeader
        title="Categorias"
        subtitle="Organize as colecoes, filtros publicos, ordem do catalogo e metadados de SEO."
        action={<Button onClick={startCreate}><Plus size={17} /> Nova categoria</Button>}
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Panel>
          <p className="text-sm text-graphite-soft">Total</p>
          <p className="mt-2 text-2xl font-semibold text-graphite">{categories.length}</p>
        </Panel>
        <Panel>
          <p className="text-sm text-graphite-soft">Ativas</p>
          <p className="mt-2 text-2xl font-semibold text-success">{activeCount}</p>
        </Panel>
        <Panel>
          <p className="text-sm text-graphite-soft">Arquivadas</p>
          <p className="mt-2 text-2xl font-semibold text-store-gray">{archivedCount}</p>
        </Panel>
        <Panel>
          <p className="text-sm text-graphite-soft">Principais</p>
          <p className="mt-2 text-2xl font-semibold text-cinnamon">{rootCount}</p>
        </Panel>
        <Panel>
          <p className="text-sm text-graphite-soft">Subcategorias</p>
          <p className="mt-2 text-2xl font-semibold text-travel-blue">{childCount}</p>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Panel title="Estrutura do catalogo">
          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_180px]">
            <div className="relative">
              <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-store-gray" />
              <Input
                placeholder="Buscar por nome, slug ou SEO"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-10"
                aria-label="Buscar categoria"
              />
            </div>
            <Select aria-label="Filtrar status" value={status} onChange={(event) => setStatus(event.target.value as CategoryStatusFilter)}>
              <option value="all">Todas</option>
              <option value="active">Ativas</option>
              <option value="inactive">Arquivadas</option>
            </Select>
          </div>

          {categoriesQuery.isLoading ? (
            <Skeleton className="h-80 w-full rounded-[var(--radius-lg)]" />
          ) : (
            <AdminTable<AdminCatalogCategory>
              rowKey={(category) => category.id}
              rows={filteredCategories}
              empty="Nenhuma categoria encontrada."
              onRowClick={(category) => setSelectedId(category.id)}
              columns={[
                {
                  key: 'category',
                  header: 'Categoria',
                  render: (category) => (
                    <div>
                      <p className="font-medium">{category.name}</p>
                      <p className="line-clamp-1 text-xs text-graphite-soft">{category.description || 'Sem descricao curta'}</p>
                    </div>
                  ),
                },
                {
                  key: 'slug',
                  header: 'Slug',
                  render: (category) => <span className="font-mono text-xs text-graphite-soft">{category.slug}</span>,
                },
                { key: 'order', header: 'Ordem', render: (category) => category.displayOrder },
                {
                  key: 'structure',
                  header: 'Estrutura',
                  render: (category) => {
                    const parent = category.parentCategoryId ? categoriesById.get(category.parentCategoryId) : undefined;
                    const children = childrenByParent.get(category.id)?.length ?? 0;
                    return parent ? `Sub de ${parent.name}` : children ? `${children} subcategorias` : 'Principal';
                  },
                },
                { key: 'status', header: 'Status', render: statusPill },
                {
                  key: 'seo',
                  header: 'SEO',
                  render: (category) => category.seoTitle || category.seoDescription ? <Pill tone="info">Configurado</Pill> : '-',
                },
                {
                  key: 'actions',
                  header: 'Acoes',
                  render: (category) => (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(event) => {
                          event.stopPropagation();
                          startEdit(category);
                        }}
                      >
                        <PencilSimple size={15} /> Editar
                      </Button>
                      {category.isActive ? (
                        archiveTargetId === category.id ? (
                          <>
                            <Button
                              size="sm"
                              variant="danger"
                              loading={archiveCategory.isPending}
                              onClick={(event) => {
                                event.stopPropagation();
                                archiveCategory.mutate(category.id);
                              }}
                            >
                              Confirmar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(event) => {
                                event.stopPropagation();
                                setArchiveTargetId(undefined);
                              }}
                            >
                              Cancelar
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(event) => {
                              event.stopPropagation();
                              setArchiveTargetId(category.id);
                            }}
                          >
                            <XCircle size={15} /> Arquivar
                          </Button>
                        )
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          loading={reactivateCategory.isPending}
                          onClick={(event) => {
                            event.stopPropagation();
                            reactivateCategory.mutate(category);
                          }}
                        >
                          <CheckCircle size={15} /> Reativar
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
          <Panel title={editingId ? 'Editar categoria' : 'Nova categoria'}>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <Field label="Nome" required>
                {(id, describedBy) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    maxLength={120}
                    value={form.name}
                    onChange={(event) => handleNameChange(event.target.value)}
                  />
                )}
              </Field>

              <Field label="Slug" hint="Usado na URL publica. Ex.: bolsas-de-mao">
                {(id, describedBy) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    maxLength={160}
                    value={form.slug}
                    onChange={(event) => {
                      setSlugTouched(true);
                      setForm((current) => ({ ...current, slug: slugify(event.target.value) }));
                    }}
                  />
                )}
              </Field>

              <Field label="Descricao">
                {(id, describedBy) => (
                  <Textarea
                    id={id}
                    aria-describedby={describedBy}
                    maxLength={500}
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  />
                )}
              </Field>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Categoria pai">
                  {(id, describedBy) => (
                    <Select
                      id={id}
                      aria-describedby={describedBy}
                      value={form.parentCategoryId}
                      onChange={(event) => setForm((current) => ({ ...current, parentCategoryId: event.target.value }))}
                    >
                      <option value="">Principal</option>
                      {categories
                        .filter((category) => category.isActive && category.id !== editingId && !blockedParentIds.has(category.id))
                        .map((category) => (
                          <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                    </Select>
                  )}
                </Field>
                <Field label="Status">
                  {(id, describedBy) => (
                    <Select
                      id={id}
                      aria-describedby={describedBy}
                      value={form.isActive}
                      onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value as CategoryFormState['isActive'] }))}
                    >
                      <option value="true">Ativa</option>
                      <option value="false">Arquivada</option>
                    </Select>
                  )}
                </Field>
              </div>

              <Field label="Ordem de exibicao">
                {(id, describedBy) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    type="number"
                    value={form.displayOrder}
                    onChange={(event) => setForm((current) => ({ ...current, displayOrder: event.target.value }))}
                  />
                )}
              </Field>

              <div className="rounded-[var(--radius-md)] border border-border/80 bg-cream-light/35 p-4">
                <p className="mb-3 text-sm font-semibold text-graphite">SEO</p>
                <div className="space-y-3">
                  <Field label="Titulo SEO">
                    {(id, describedBy) => (
                      <Input
                        id={id}
                        aria-describedby={describedBy}
                        maxLength={160}
                        value={form.seoTitle}
                        onChange={(event) => setForm((current) => ({ ...current, seoTitle: event.target.value }))}
                      />
                    )}
                  </Field>
                  <Field label="Descricao SEO">
                    {(id, describedBy) => (
                      <Textarea
                        id={id}
                        aria-describedby={describedBy}
                        maxLength={300}
                        value={form.seoDescription}
                        onChange={(event) => setForm((current) => ({ ...current, seoDescription: event.target.value }))}
                        className="min-h-[88px]"
                      />
                    )}
                  </Field>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                {editingId && (
                  <Button type="button" variant="ghost" onClick={startCreate}>
                    Limpar
                  </Button>
                )}
                <Button type="submit" loading={saveCategory.isPending}>
                  <CheckCircle size={16} /> {editingId ? 'Salvar alteracoes' : 'Criar categoria'}
                </Button>
              </div>
            </form>
          </Panel>

          <Panel title="Detalhe">
            {categoriesQuery.isLoading ? (
              <Skeleton className="h-48 w-full rounded-[var(--radius-lg)]" />
            ) : selectedCategory ? (
              <div className="space-y-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-graphite">{selectedCategory.name}</h2>
                    {statusPill(selectedCategory)}
                  </div>
                  <p className="mt-1 break-all font-mono text-xs text-graphite-soft">{selectedCategory.slug}</p>
                </div>

                <div className="grid gap-2 text-sm">
                  <DetailRow
                    label="Categoria pai"
                    value={selectedCategory.parentCategoryId ? categoriesById.get(selectedCategory.parentCategoryId)?.name ?? '-' : 'Principal'}
                  />
                  <DetailRow label="Subcategorias" value={String(childrenByParent.get(selectedCategory.id)?.length ?? 0)} />
                  <DetailRow label="Ordem" value={String(selectedCategory.displayOrder)} />
                  <DetailRow label="Criada em" value={formatDateShort(selectedCategory.createdAt)} />
                  <DetailRow label="Atualizada em" value={selectedCategory.updatedAt ? formatDateShort(selectedCategory.updatedAt) : '-'} />
                </div>

                {selectedCategory.description && (
                  <p className="rounded-[var(--radius-md)] bg-cream-light/60 p-3 text-sm text-graphite-soft">
                    {selectedCategory.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => startEdit(selectedCategory)}>
                    <PencilSimple size={15} /> Editar
                  </Button>
                  {selectedCategory.isActive ? (
                    <Button size="sm" variant="danger" loading={archiveCategory.isPending} onClick={() => archiveCategory.mutate(selectedCategory.id)}>
                      <XCircle size={15} /> Arquivar
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" loading={reactivateCategory.isPending} onClick={() => reactivateCategory.mutate(selectedCategory)}>
                      <CheckCircle size={15} /> Reativar
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-graphite-soft">Selecione uma categoria para ver os detalhes.</p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
