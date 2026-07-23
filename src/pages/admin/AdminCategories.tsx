import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowCounterClockwise,
  Archive,
  CheckCircle,
  Eye,
  Folders,
  FolderSimple,
  PencilSimple,
  Plus,
  TreeStructure,
} from '@phosphor-icons/react';
import { adminService, queryKeys } from '@/lib/api';
import type { AdminCategoryInput } from '@/lib/api/admin.service';
import type { AdminCatalogCategory } from '@/types';
import {
  Banner,
  Button,
  ConfirmDialog,
  DataTable,
  Field,
  Input,
  Modal,
  NumberInput,
  PageHeader,
  SearchInput,
  SectionCard,
  Select,
  StatCard,
  StatusBadge,
  Textarea,
  Toolbar,
  toast,
  type Column,
} from '@/components/admin/ui';
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
  if (name.length > 120) return 'O nome deve ter no máximo 120 caracteres.';
  if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return 'O slug deve usar apenas letras minúsculas, números e hífens.';
  if (form.description.length > 500) return 'A descrição deve ter no máximo 500 caracteres.';
  if (!Number.isFinite(displayOrder)) return 'A ordem precisa ser um número válido.';
  if (form.parentCategoryId && form.parentCategoryId === editingId) return 'A categoria não pode ser pai dela mesma.';
  if (form.parentCategoryId && blockedParentIds.has(form.parentCategoryId)) return 'A categoria pai não pode ser uma subcategoria dela mesma.';
  if (form.seoTitle.length > 160) return 'O título SEO deve ter no máximo 160 caracteres.';
  if (form.seoDescription.length > 300) return 'A descrição SEO deve ter no máximo 300 caracteres.';

  return undefined;
}

function statusBadge(category: AdminCatalogCategory) {
  return category.isActive ? (
    <StatusBadge tone="success" dot>Ativa</StatusBadge>
  ) : (
    <StatusBadge tone="neutral" dot>Arquivada</StatusBadge>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-2.5 last:border-0">
      <span className="text-sm text-graphite-soft">{label}</span>
      <span className="max-w-[60%] text-right text-sm font-medium text-graphite">{value}</span>
    </div>
  );
}

export function AdminCategories() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<CategoryStatusFilter>('all');
  const [editingId, setEditingId] = useState<string | undefined>();
  const [formOpen, setFormOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | undefined>();
  const [archiveTargetId, setArchiveTargetId] = useState<string | undefined>();
  const [slugTouched, setSlugTouched] = useState(false);
  const [form, setForm] = useState<CategoryFormState>(emptyForm);
  const [formError, setFormError] = useState<string | undefined>();

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

  const detailCategory = detailId ? categoriesById.get(detailId) : undefined;
  const archiveTarget = archiveTargetId ? categoriesById.get(archiveTargetId) : undefined;

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
      const wasEditing = !!editingId;
      await invalidateCategoryData();
      setFormOpen(false);
      setFormError(undefined);
      toast.success(
        wasEditing
          ? { title: 'Categoria atualizada', description: `“${category.name}” foi salva.` }
          : { title: 'Categoria criada', description: `“${category.name}” entrou no catálogo.` },
      );
    },
    onError: (error) =>
      toast.error({ title: 'Não foi possível salvar', description: error instanceof Error ? error.message : 'Tente novamente.' }),
  });

  const archiveCategory = useMutation({
    mutationFn: (categoryId: string) => adminService.archiveAdminCategory(categoryId),
    onSuccess: async (category) => {
      await invalidateCategoryData();
      setArchiveTargetId(undefined);
      toast.success({ title: 'Categoria arquivada', description: `“${category.name}” saiu da vitrine.` });
    },
    onError: (error) =>
      toast.error({ title: 'Não foi possível arquivar', description: error instanceof Error ? error.message : 'Tente novamente.' }),
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
      toast.success({ title: 'Categoria reativada', description: `“${category.name}” voltou à vitrine.` });
    },
    onError: (error) =>
      toast.error({ title: 'Não foi possível reativar', description: error instanceof Error ? error.message : 'Tente novamente.' }),
  });

  const activeCount = categories.filter((category) => category.isActive).length;
  const archivedCount = categories.length - activeCount;
  const rootCount = categories.filter((category) => !category.parentCategoryId).length;
  const childCount = categories.filter((category) => category.parentCategoryId).length;

  const openCreate = () => {
    setEditingId(undefined);
    setSlugTouched(false);
    setFormError(undefined);
    setForm({ ...emptyForm, displayOrder: String(categories.length + 1) });
    setDetailId(undefined);
    setFormOpen(true);
  };

  const openEdit = (category: AdminCatalogCategory) => {
    setEditingId(category.id);
    setSlugTouched(true);
    setFormError(undefined);
    setForm(categoryToForm(category));
    setDetailId(undefined);
    setFormOpen(true);
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
      setFormError(error);
      return;
    }
    setFormError(undefined);
    saveCategory.mutate(toInput(form));
  };

  const columns: Column<AdminCatalogCategory>[] = [
    {
      key: 'category',
      header: 'Categoria',
      render: (category) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-graphite">{category.name}</p>
          <p className="line-clamp-1 text-xs text-graphite-soft">{category.description || 'Sem descrição'}</p>
        </div>
      ),
    },
    { key: 'slug', header: 'Slug', render: (category) => <span className="font-mono text-xs text-graphite-soft">{category.slug}</span> },
    { key: 'order', header: 'Ordem', align: 'center', render: (category) => <span className="tabular-nums text-graphite-soft">{category.displayOrder}</span> },
    {
      key: 'structure',
      header: 'Estrutura',
      render: (category) => {
        const parent = category.parentCategoryId ? categoriesById.get(category.parentCategoryId) : undefined;
        const children = childrenByParent.get(category.id)?.length ?? 0;
        return (
          <span className="text-sm text-graphite-soft">
            {parent ? `Sub de ${parent.name}` : children ? `${children} subcategorias` : 'Principal'}
          </span>
        );
      },
    },
    { key: 'status', header: 'Status', render: statusBadge },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '120px',
      render: (category) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setDetailId(category.id)}
            title="Ver detalhe"
            aria-label="Ver detalhe"
            className="tactile rounded-md p-2 text-graphite-soft opacity-0 transition-opacity hover:bg-cream-light hover:text-graphite group-hover:opacity-100"
          >
            <Eye size={16} />
          </button>
          <Button size="sm" variant="outline" onClick={() => openEdit(category)}>
            <PencilSimple size={15} /> Editar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Catálogo' }, { label: 'Categorias' }]}
        eyebrow="Catálogo"
        title="Categorias"
        subtitle="Organize coleções, ordem do catálogo, hierarquia e metadados de SEO."
        action={<Button onClick={openCreate}><Plus size={17} weight="bold" /> Nova categoria</Button>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Total" value={categories.length} icon={Folders} loading={categoriesQuery.isLoading} />
        <StatCard label="Ativas" value={<span className="text-success">{activeCount}</span>} icon={CheckCircle} loading={categoriesQuery.isLoading} />
        <StatCard label="Arquivadas" value={<span className="text-store-gray">{archivedCount}</span>} icon={Archive} loading={categoriesQuery.isLoading} />
        <StatCard label="Principais" value={<span className="text-cinnamon">{rootCount}</span>} icon={FolderSimple} loading={categoriesQuery.isLoading} />
        <StatCard label="Subcategorias" value={<span className="text-travel-blue">{childCount}</span>} icon={TreeStructure} loading={categoriesQuery.isLoading} />
      </div>

      <SectionCard
        eyebrow="Catálogo"
        title="Estrutura de categorias"
        description={`${filteredCategories.length} ${filteredCategories.length === 1 ? 'categoria' : 'categorias'} no filtro.`}
        bodyClassName="flex flex-col gap-4"
      >
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nome, slug ou SEO" />
          <Select
            aria-label="Filtrar status"
            value={status}
            onChange={(e) => setStatus(e.target.value as CategoryStatusFilter)}
            className="sm:w-auto"
          >
            <option value="all">Todas</option>
            <option value="active">Ativas</option>
            <option value="inactive">Arquivadas</option>
          </Select>
        </Toolbar>

        <DataTable<AdminCatalogCategory>
          columns={columns}
          rows={filteredCategories}
          rowKey={(category) => category.id}
          loading={categoriesQuery.isLoading}
          onRowClick={(category) => setDetailId(category.id)}
          minWidth={720}
          empty={{
            icon: Folders,
            title: 'Nenhuma categoria encontrada',
            description: 'Ajuste os filtros ou crie uma nova categoria.',
            action: <Button size="sm" onClick={openCreate}><Plus size={15} /> Nova categoria</Button>,
          }}
        />
      </SectionCard>

      {/* Modal: criar / editar */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        size="lg"
        title={editingId ? 'Editar categoria' : 'Nova categoria'}
        description={editingId ? 'Atualize as informações da categoria.' : 'Cadastre uma nova categoria no catálogo.'}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button form="category-form" type="submit" size="sm" loading={saveCategory.isPending}>
              <CheckCircle size={16} /> {editingId ? 'Salvar alterações' : 'Criar categoria'}
            </Button>
          </>
        }
      >
        <form id="category-form" className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {formError && (
            <Banner tone="danger" title="Revise o formulário" onDismiss={() => setFormError(undefined)}>
              {formError}
            </Banner>
          )}

          <Field label="Nome" required>
            {(id, describedBy) => (
              <Input id={id} aria-describedby={describedBy} maxLength={120} value={form.name} onChange={(e) => handleNameChange(e.target.value)} autoFocus />
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Slug" hint="Ex.: bolsas-de-mao">
              {(id, describedBy) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  maxLength={160}
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setForm((current) => ({ ...current, slug: slugify(e.target.value) }));
                  }}
                />
              )}
            </Field>
            <Field label="Ordem de exibição">
              {(id) => (
                <NumberInput
                  id={id}
                  stepper
                  min={0}
                  value={Number(form.displayOrder) || 0}
                  onChange={(n) => setForm((current) => ({ ...current, displayOrder: String(n ?? 0) }))}
                />
              )}
            </Field>
          </div>

          <Field label="Descrição" hint={`${form.description.length}/500`}>
            {(id, describedBy) => (
              <Textarea
                id={id}
                aria-describedby={describedBy}
                maxLength={500}
                value={form.description}
                onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
              />
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Categoria pai">
              {(id, describedBy) => (
                <Select
                  id={id}
                  aria-describedby={describedBy}
                  value={form.parentCategoryId}
                  onChange={(e) => setForm((current) => ({ ...current, parentCategoryId: e.target.value }))}
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
                  onChange={(e) => setForm((current) => ({ ...current, isActive: e.target.value as CategoryFormState['isActive'] }))}
                >
                  <option value="true">Ativa</option>
                  <option value="false">Arquivada</option>
                </Select>
              )}
            </Field>
          </div>

          <div className="rounded-[var(--radius-md)] border border-border/80 bg-cream-lighter/50 p-4">
            <p className="eyebrow mb-3 text-[0.68rem]">SEO</p>
            <div className="flex flex-col gap-3">
              <Field label="Título SEO" hint={`${form.seoTitle.length}/160`}>
                {(id, describedBy) => (
                  <Input id={id} aria-describedby={describedBy} maxLength={160} value={form.seoTitle} onChange={(e) => setForm((current) => ({ ...current, seoTitle: e.target.value }))} />
                )}
              </Field>
              <Field label="Descrição SEO" hint={`${form.seoDescription.length}/300`}>
                {(id, describedBy) => (
                  <Textarea id={id} aria-describedby={describedBy} maxLength={300} value={form.seoDescription} onChange={(e) => setForm((current) => ({ ...current, seoDescription: e.target.value }))} className="min-h-[88px]" />
                )}
              </Field>
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal: detalhe */}
      <Modal
        open={!!detailId}
        onClose={() => setDetailId(undefined)}
        size="md"
        title={detailCategory?.name ?? 'Categoria'}
        description={detailCategory?.slug}
        footer={
          detailCategory && (
            <>
              {detailCategory.isActive ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger hover:bg-danger-soft/60"
                  onClick={() => {
                    setDetailId(undefined);
                    setArchiveTargetId(detailCategory.id);
                  }}
                >
                  <Archive size={15} /> Arquivar
                </Button>
              ) : (
                <Button variant="outline" size="sm" loading={reactivateCategory.isPending} onClick={() => reactivateCategory.mutate(detailCategory)}>
                  <ArrowCounterClockwise size={15} /> Reativar
                </Button>
              )}
              <Button size="sm" onClick={() => openEdit(detailCategory)}>
                <PencilSimple size={15} /> Editar
              </Button>
            </>
          )
        }
      >
        {detailCategory && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {statusBadge(detailCategory)}
              {detailCategory.seoTitle || detailCategory.seoDescription ? (
                <StatusBadge tone="info" size="sm">SEO configurado</StatusBadge>
              ) : null}
            </div>

            <dl className="text-sm">
              <DetailRow
                label="Categoria pai"
                value={detailCategory.parentCategoryId ? categoriesById.get(detailCategory.parentCategoryId)?.name ?? '—' : 'Principal'}
              />
              <DetailRow label="Subcategorias" value={String(childrenByParent.get(detailCategory.id)?.length ?? 0)} />
              <DetailRow label="Ordem" value={String(detailCategory.displayOrder)} />
              <DetailRow label="Criada em" value={formatDateShort(detailCategory.createdAt)} />
              <DetailRow label="Atualizada em" value={detailCategory.updatedAt ? formatDateShort(detailCategory.updatedAt) : '—'} />
            </dl>

            {detailCategory.description && (
              <p className="rounded-[var(--radius-md)] bg-cream-lighter px-3 py-3 text-sm text-graphite-soft">{detailCategory.description}</p>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!archiveTargetId}
        onClose={() => setArchiveTargetId(undefined)}
        onConfirm={() => archiveTargetId && archiveCategory.mutate(archiveTargetId)}
        title="Arquivar categoria"
        description={
          archiveTarget
            ? `“${archiveTarget.name}” deixará de aparecer na loja. Você pode reativá-la depois.`
            : 'A categoria deixará de aparecer na loja.'
        }
        confirmLabel="Arquivar"
        loading={archiveCategory.isPending}
      />
    </div>
  );
}
