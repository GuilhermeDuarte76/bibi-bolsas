import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CaretLeft,
  FloppyDisk,
  Image as ImageIcon,
  Plus,
  Star,
  Trash,
  UploadSimple,
  WarningCircle,
} from '@phosphor-icons/react';
import { adminService, queryKeys } from '@/lib/api';
import { cn } from '@/lib/utils';
import { PageHeader, Panel } from '@/components/admin/AdminUI';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Pill } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import type {
  AdminCatalogCategory,
  AdminProduct,
  AdminProductImage,
  AdminProductImageInput,
  AdminProductInput,
  AdminProductVariantInput,
} from '@/types';

type VariantForm = AdminProductVariantInput & {
  localId: string;
  existing: boolean;
};

type ImageForm = AdminProductImageInput & {
  localId: string;
  existing: boolean;
  original: {
    productVariantId?: string;
    storageKey: string;
    publicUrl: string;
    altText?: string;
    sortOrder: number;
    isMain: boolean;
  };
};

type ProductFormState = Omit<AdminProductInput, 'variants'>;

const STATUS_OPTIONS = [
  { value: 'Draft', label: 'Rascunho' },
  { value: 'Published', label: 'Publicado' },
];

const IMAGE_UPLOAD_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';
const IMAGE_MAX_SIZE_BYTES = 10 * 1024 * 1024;

const DEFAULT_FORM: ProductFormState = {
  name: '',
  slug: '',
  shortDescription: '',
  description: '',
  brand: 'Bibi Bolsas',
  collection: '',
  mainMaterial: '',
  mainColor: '',
  status: 'Draft',
  isFeatured: false,
  isNewArrival: true,
  isPromotion: false,
  displayOrder: 0,
  seoTitle: '',
  seoDescription: '',
  searchKeywords: '',
  categoryIds: [],
};

function newLocalId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function storageKeyFromUrl(value: string) {
  try {
    const url = new URL(value);
    return decodeURIComponent(url.pathname.replace(/^\/+/, '')) || value.trim();
  } catch {
    return value.trim();
  }
}

function centsToInput(value?: number) {
  return value != null ? (value / 100).toFixed(2) : '';
}

function inputToCents(value: string) {
  const parsed = Number(String(value).replace(',', '.'));
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}

function inputToNumber(value: string, fallback = 0) {
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function emptyVariant(isDefault = false): VariantForm {
  return {
    localId: newLocalId('variant'),
    existing: false,
    sku: '',
    name: '',
    color: '',
    colorHex: '',
    size: '',
    material: '',
    finish: '',
    priceCents: 0,
    promotionalPriceCents: undefined,
    costPriceCents: undefined,
    stockQuantity: 0,
    reservedQuantity: 0,
    minimumStock: 2,
    weightKg: 0.3,
    heightCm: 18,
    widthCm: 24,
    depthCm: 10,
    barcode: '',
    isDefault,
    isActive: true,
  };
}

function emptyImage(): ImageForm {
  return {
    localId: newLocalId('image'),
    existing: false,
    storageKey: '',
    publicUrl: '',
    altText: '',
    sortOrder: 0,
    isMain: false,
    original: {
      storageKey: '',
      publicUrl: '',
      altText: '',
      sortOrder: 0,
      isMain: false,
    },
  };
}

function variantImageLabel(variant: VariantForm) {
  const title = variant.name.trim() || variant.sku.trim() || 'SKU sem nome';
  const details = [variant.color?.trim(), variant.size?.trim()].filter(Boolean).join(' / ');
  return details ? `${variant.sku.trim() || 'SKU'} - ${title} (${details})` : `${variant.sku.trim() || 'SKU'} - ${title}`;
}

function variantFromProduct(product: AdminProduct): VariantForm[] {
  if (product.variants.length === 0) return [emptyVariant(true)];

  return product.variants.map((variant, index) => ({
    localId: `variant-${variant.id}`,
    existing: true,
    id: variant.id,
    sku: variant.sku,
    name: variant.name,
    color: variant.color ?? '',
    colorHex: variant.colorHex ?? '',
    size: variant.size ?? '',
    material: variant.material ?? '',
    finish: variant.finish ?? '',
    priceCents: variant.priceCents,
    promotionalPriceCents: variant.promotionalPriceCents,
    costPriceCents: variant.costPriceCents,
    stockQuantity: variant.stockQuantity,
    reservedQuantity: variant.reservedQuantity,
    minimumStock: variant.minimumStock,
    weightKg: variant.weightKg,
    heightCm: variant.heightCm,
    widthCm: variant.widthCm,
    depthCm: variant.depthCm,
    barcode: variant.barcode ?? '',
    isDefault: variant.isDefault || index === 0,
    isActive: variant.isActive,
  }));
}

function imageFromProduct(image: AdminProductImage): ImageForm {
  const storageKey = storageKeyFromUrl(image.publicUrl);
  const snapshot = {
    productVariantId: image.productVariantId,
    storageKey,
    publicUrl: image.publicUrl,
    altText: image.altText ?? '',
    sortOrder: image.sortOrder,
    isMain: image.isMain,
  };

  return {
    localId: `image-${image.id}`,
    existing: true,
    id: image.id,
    productVariantId: image.productVariantId,
    storageKey,
    publicUrl: image.publicUrl,
    altText: image.altText ?? '',
    sortOrder: image.sortOrder,
    isMain: image.isMain,
    original: snapshot,
  };
}

function formFromProduct(product: AdminProduct): ProductFormState {
  return {
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription ?? '',
    description: product.description ?? '',
    brand: product.brand ?? 'Bibi Bolsas',
    collection: product.collection ?? '',
    mainMaterial: product.mainMaterial ?? '',
    mainColor: product.mainColor ?? '',
    status: product.status,
    isFeatured: product.isFeatured,
    isNewArrival: product.isNewArrival,
    isPromotion: product.isPromotion,
    displayOrder: product.displayOrder,
    seoTitle: product.seoTitle ?? '',
    seoDescription: product.seoDescription ?? '',
    searchKeywords: product.searchKeywords ?? '',
    categoryIds: product.categories.map((category) => category.id),
  };
}

function cleanVariant(variant: VariantForm): AdminProductVariantInput {
  return {
    id: variant.id,
    sku: variant.sku.trim().toUpperCase(),
    name: variant.name.trim(),
    color: variant.color?.trim() || undefined,
    colorHex: variant.colorHex?.trim() || undefined,
    size: variant.size?.trim() || undefined,
    material: variant.material?.trim() || undefined,
    finish: variant.finish?.trim() || undefined,
    priceCents: variant.priceCents,
    promotionalPriceCents: variant.promotionalPriceCents,
    costPriceCents: variant.costPriceCents,
    stockQuantity: variant.stockQuantity,
    reservedQuantity: variant.reservedQuantity,
    minimumStock: variant.minimumStock,
    weightKg: variant.weightKg,
    heightCm: variant.heightCm,
    widthCm: variant.widthCm,
    depthCm: variant.depthCm,
    barcode: variant.barcode?.trim() || undefined,
    isDefault: variant.isDefault,
    isActive: variant.isActive,
  };
}

function cleanImage(image: ImageForm, index: number, hasMain: boolean): AdminProductImageInput {
  const publicUrl = image.publicUrl.trim();
  return {
    id: image.id,
    productVariantId: image.productVariantId,
    storageKey: image.storageKey.trim() || storageKeyFromUrl(publicUrl),
    publicUrl,
    altText: image.altText?.trim() || undefined,
    sortOrder: Number.isFinite(image.sortOrder) ? image.sortOrder : index,
    isMain: hasMain ? image.isMain : index === 0,
  };
}

function imageChanged(image: ImageForm) {
  return image.productVariantId !== image.original.productVariantId ||
    image.storageKey.trim() !== image.original.storageKey ||
    image.publicUrl.trim() !== image.original.publicUrl ||
    (image.altText?.trim() || '') !== (image.original.altText || '') ||
    image.sortOrder !== image.original.sortOrder ||
    image.isMain !== image.original.isMain;
}

function imageMetadataChanged(image: ImageForm) {
  return image.productVariantId !== image.original.productVariantId ||
    image.storageKey.trim() !== image.original.storageKey ||
    image.publicUrl.trim() !== image.original.publicUrl ||
    (image.altText?.trim() || '') !== (image.original.altText || '') ||
    image.sortOrder !== image.original.sortOrder;
}

function assertValidUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function validateForm(form: ProductFormState, variants: VariantForm[], images: ImageForm[]) {
  if (!form.name.trim()) return 'Informe o nome do produto.';
  if (form.categoryIds.length === 0) return 'Selecione pelo menos uma categoria.';

  const activeVariants = variants.filter((variant) => variant.isActive);
  if (activeVariants.length === 0) return 'Cadastre pelo menos uma variação ativa.';

  const skus = new Set<string>();
  for (const variant of activeVariants) {
    const sku = variant.sku.trim().toUpperCase();
    if (!sku) return 'Informe o SKU de todas as variações ativas.';
    if (skus.has(sku)) return `SKU duplicado: ${sku}.`;
    skus.add(sku);
    if (!variant.name.trim()) return `Informe o nome da variação ${sku}.`;
    if (variant.priceCents <= 0) return `Informe um preço válido para ${sku}.`;
    if (variant.promotionalPriceCents != null && variant.promotionalPriceCents >= variant.priceCents) {
      return `Preço promocional deve ser menor que o preço normal em ${sku}.`;
    }
    if (variant.reservedQuantity > variant.stockQuantity) return `Reserva maior que estoque em ${sku}.`;
    if (variant.weightKg <= 0 || variant.heightCm <= 0 || variant.widthCm <= 0 || variant.depthCm <= 0) {
      return `Informe peso e dimensões válidos para ${sku}.`;
    }
  }

  const savedVariantIds = new Set(variants.map((variant) => variant.id).filter(Boolean));
  for (const image of images) {
    if (!image.publicUrl.trim() && !image.storageKey.trim()) continue;
    if (image.productVariantId && !savedVariantIds.has(image.productVariantId)) {
      return 'Vincule imagens apenas a SKUs já salvos. Salve o produto primeiro e depois associe as fotos ao SKU.';
    }
    if (!assertValidUrl(image.publicUrl.trim())) return 'Informe uma URL pública válida para cada imagem.';
    if (!image.storageKey.trim()) return 'Informe a chave de storage de cada imagem.';
  }

  return null;
}

function validateImageUploadFile(file: File) {
  if (!file.size) return 'Arquivo vazio ou inválido.';
  if (file.size > IMAGE_MAX_SIZE_BYTES) return 'Imagem deve ter no máximo 10 MB.';
  if (!IMAGE_UPLOAD_ACCEPT.split(',').includes(file.type)) return 'Use imagem em JPG, PNG, WEBP ou GIF.';
  return null;
}

export function AdminProductForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id || id === 'novo';
  const imageUploadInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<ProductFormState>(DEFAULT_FORM);
  const [variants, setVariants] = useState<VariantForm[]>([emptyVariant(true)]);
  const [images, setImages] = useState<ImageForm[]>([]);
  const [isDraggingImages, setIsDraggingImages] = useState(false);
  const dragCounterRef = useRef(0);

  const productQuery = useQuery({
    queryKey: queryKeys.admin.product(id ?? ''),
    queryFn: () => adminService.getAdminProduct(id ?? ''),
    enabled: !isNew && Boolean(id),
  });

  const categoriesQuery = useQuery({
    queryKey: queryKeys.admin.categories,
    queryFn: () => adminService.listAdminCategories(),
  });

  const product = productQuery.data;
  const activeCategories = useMemo(
    () => (categoriesQuery.data ?? []).filter((category) => category.isActive),
    [categoriesQuery.data],
  );
  const statusOptions = form.status === 'Archived'
    ? [...STATUS_OPTIONS, { value: 'Archived', label: 'Arquivado' }]
    : STATUS_OPTIONS;
  const imageVariantOptions = useMemo(
    () => variants.filter((variant) => Boolean(variant.id)).map((variant) => ({
      id: variant.id!,
      label: variantImageLabel(variant),
    })),
    [variants],
  );

  useEffect(() => {
    if (!isNew && product) {
      setForm(formFromProduct(product));
      setVariants(variantFromProduct(product));
      setImages(product.images.map(imageFromProduct));
    }
  }, [isNew, product]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const validation = validateForm(form, variants, images);
      if (validation) throw new Error(validation);

      const variantsToSave = variants.filter((variant) => variant.isActive).map(cleanVariant);
      const defaultIndex = variantsToSave.findIndex((variant) => variant.isDefault);
      if (defaultIndex === -1) variantsToSave[0].isDefault = true;
      variantsToSave.forEach((variant, index) => {
        variant.isDefault = index === (defaultIndex === -1 ? 0 : defaultIndex);
      });

      const productInput: AdminProductInput = {
        ...form,
        slug: form.slug?.trim() || undefined,
        variants: variantsToSave,
      };

      const savedProduct = isNew
        ? await adminService.createAdminProduct(productInput)
        : await adminService.updateAdminProduct(id ?? '', productInput);

      if (!isNew && product) {
        const keptVariantIds = new Set(variants.filter((variant) => variant.id).map((variant) => variant.id));
        const removedVariants = product.variants.filter((variant) => variant.id && !keptVariantIds.has(variant.id));
        await Promise.all(
          removedVariants.map((variant) => adminService.deactivateAdminProductVariant(savedProduct.id, variant.id)),
        );
      }

      const imageDrafts = images
        .filter((image) => image.publicUrl.trim() || image.storageKey.trim())
        .map((image, index, all) => cleanImage(image, index, all.some((item) => item.isMain)));
      const keptImageIds = new Set(imageDrafts.filter((image) => image.id).map((image) => image.id));

      if (!isNew && product) {
        const removedImages = product.images.filter((image) => !keptImageIds.has(image.id));
        await Promise.all(
          removedImages.map((image) => adminService.deleteAdminProductImage(savedProduct.id, image.id)),
        );
      }

      for (const image of imageDrafts) {
        const current = images.find((candidate) => candidate.id === image.id);
        if (image.id) {
          if (current?.existing && imageChanged(current)) {
            if (imageMetadataChanged(current)) {
              await adminService.updateAdminProductImage(savedProduct.id, image.id, image);
            } else if (current.isMain && current.isMain !== current.original.isMain) {
              await adminService.setAdminProductMainImage(savedProduct.id, image.id);
            }
          }
        } else {
          await adminService.addAdminProductImage(savedProduct.id, image);
        }
      }

      return savedProduct;
    },
    onSuccess: async (savedProduct) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.products }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.product(savedProduct.id) }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'inventory'] }),
      ]);
      toast.success(isNew ? 'Produto criado com sucesso.' : 'Produto atualizado com sucesso.');
      navigate('/admin/produtos');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel salvar o produto.');
    },
  });

  const imageUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const validation = validateImageUploadFile(file);
      if (validation) throw new Error(validation);

      return adminService.uploadAdminProductImage(file);
    },
    onSuccess: (upload, file) => {
      setImages((current) => {
        const hasMainImage = current.some((image) => image.isMain);

        return [
          ...current,
          {
            ...emptyImage(),
            storageKey: upload.storageKey,
            publicUrl: upload.publicUrl,
            altText: form.name.trim() || file.name,
            sortOrder: current.length,
            isMain: !hasMainImage,
          },
        ];
      });

      toast.success('Imagem enviada com sucesso.');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel enviar a imagem.');
    },
  });

  const updateForm = <K extends keyof ProductFormState>(field: K, value: ProductFormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const toggleCategory = (category: AdminCatalogCategory) => {
    setForm((current) => {
      const selected = current.categoryIds.includes(category.id);
      return {
        ...current,
        categoryIds: selected
          ? current.categoryIds.filter((categoryId) => categoryId !== category.id)
          : [...current.categoryIds, category.id],
      };
    });
  };

  const updateVariant = (localId: string, patch: Partial<VariantForm>) => {
    setVariants((current) => current.map((variant) => {
      if (variant.localId !== localId) return variant;
      return { ...variant, ...patch };
    }));
  };

  const setDefaultVariant = (localId: string) => {
    setVariants((current) => current.map((variant) => ({
      ...variant,
      isDefault: variant.localId === localId,
      isActive: variant.localId === localId ? true : variant.isActive,
    })));
  };

  const removeVariant = (localId: string) => {
    setVariants((current) => {
      if (current.length <= 1) return current;
      const next = current.filter((variant) => variant.localId !== localId);
      if (!next.some((variant) => variant.isDefault)) next[0].isDefault = true;
      return next;
    });
  };

  const updateImage = (localId: string, patch: Partial<ImageForm>) => {
    setImages((current) => current.map((image) => (
      image.localId === localId ? { ...image, ...patch } : image
    )));
  };

  const updateImageVariant = (localId: string, productVariantId?: string) => {
    setImages((current) => {
      const selected = current.find((image) => image.localId === localId);
      if (!selected) return current;

      return current.map((image) => {
        if (image.localId === localId) return { ...image, productVariantId };
        if (selected.isMain && image.productVariantId === productVariantId) return { ...image, isMain: false };
        return image;
      });
    });
  };

  const setMainImage = (localId: string) => {
    setImages((current) => {
      const selected = current.find((image) => image.localId === localId);
      if (!selected) return current;

      return current.map((image) => (
        image.productVariantId === selected.productVariantId
          ? { ...image, isMain: image.localId === localId }
          : image
      ));
    });
  };

  const uploadImageFiles = (files: FileList | File[] | null | undefined) => {
    if (!files) return;
    Array.from(files).forEach((file) => imageUploadMutation.mutate(file));
  };

  const handleImageUploadChange = (event: ChangeEvent<HTMLInputElement>) => {
    uploadImageFiles(event.target.files);
    event.target.value = '';
  };

  const handleImageDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!event.dataTransfer.types.includes('Files')) return;
    dragCounterRef.current += 1;
    setIsDraggingImages(true);
  };

  const handleImageDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleImageDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) setIsDraggingImages(false);
  };

  const handleImageDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragCounterRef.current = 0;
    setIsDraggingImages(false);
    uploadImageFiles(event.dataTransfer.files);
  };

  const isLoading = (!isNew && productQuery.isLoading) || categoriesQuery.isLoading;
  if (isLoading) return <Skeleton className="h-96 w-full rounded-[var(--radius-lg)]" />;

  if (!isNew && productQuery.isError) {
    return (
      <Panel>
        <div className="flex items-center gap-3 text-danger">
          <WarningCircle size={22} />
          <p className="font-medium">Produto não encontrado.</p>
        </div>
        <Button className="mt-4" variant="outline" onClick={() => navigate('/admin/produtos')}>
          <CaretLeft size={16} /> Voltar
        </Button>
      </Panel>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        saveMutation.mutate();
      }}
    >
      <button
        type="button"
        onClick={() => navigate('/admin/produtos')}
        className="mb-4 flex items-center gap-1 text-sm text-graphite-soft hover:text-graphite"
      >
        <CaretLeft size={16} /> Voltar
      </button>

      <PageHeader
        title={isNew ? 'Novo produto' : product?.name ?? 'Produto'}
        subtitle={isNew ? 'Cadastro operacional do catálogo' : 'Edição operacional do catálogo'}
        action={(
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => navigate('/admin/produtos')}>Cancelar</Button>
            <Button type="submit" loading={saveMutation.isPending} disabled={imageUploadMutation.isPending}>
              <FloppyDisk size={17} /> Salvar
            </Button>
          </div>
        )}
      />

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
          <Panel title="Informações básicas">
            <div className="grid gap-4">
              <Field label="Nome" required>
                {(fieldId) => (
                  <Input
                    id={fieldId}
                    value={form.name}
                    onChange={(event) => updateForm('name', event.target.value)}
                    onBlur={() => {
                      if (!form.slug?.trim()) updateForm('slug', slugify(form.name));
                    }}
                    placeholder="Ex.: Bolsa Tote Manhattan"
                  />
                )}
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Slug">
                  {(fieldId) => (
                    <Input
                      id={fieldId}
                      value={form.slug ?? ''}
                      onChange={(event) => updateForm('slug', slugify(event.target.value))}
                      placeholder="bolsa-tote-manhattan"
                    />
                  )}
                </Field>
                <Field label="Marca">
                  {(fieldId) => (
                    <Input
                      id={fieldId}
                      value={form.brand ?? ''}
                      onChange={(event) => updateForm('brand', event.target.value)}
                    />
                  )}
                </Field>
              </div>

              <Field label="Descrição curta">
                {(fieldId) => (
                  <Input
                    id={fieldId}
                    value={form.shortDescription ?? ''}
                    onChange={(event) => updateForm('shortDescription', event.target.value)}
                  />
                )}
              </Field>

              <Field label="Descrição completa">
                {(fieldId) => (
                  <Textarea
                    id={fieldId}
                    value={form.description ?? ''}
                    onChange={(event) => updateForm('description', event.target.value)}
                  />
                )}
              </Field>

              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Coleção">
                  {(fieldId) => (
                    <Input
                      id={fieldId}
                      value={form.collection ?? ''}
                      onChange={(event) => updateForm('collection', event.target.value)}
                    />
                  )}
                </Field>
                <Field label="Material principal">
                  {(fieldId) => (
                    <Input
                      id={fieldId}
                      value={form.mainMaterial ?? ''}
                      onChange={(event) => updateForm('mainMaterial', event.target.value)}
                    />
                  )}
                </Field>
                <Field label="Cor principal">
                  {(fieldId) => (
                    <Input
                      id={fieldId}
                      value={form.mainColor ?? ''}
                      onChange={(event) => updateForm('mainColor', event.target.value)}
                    />
                  )}
                </Field>
              </div>
            </div>
          </Panel>

          <Panel title="Categorias">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeCategories.map((category) => (
                <label key={category.id} className="flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm text-graphite">
                  <input
                    type="checkbox"
                    checked={form.categoryIds.includes(category.id)}
                    onChange={() => toggleCategory(category)}
                    className="h-4 w-4 accent-terracotta"
                  />
                  <span>{category.name}</span>
                </label>
              ))}
              {activeCategories.length === 0 && <p className="text-sm text-graphite-soft">Nenhuma categoria ativa cadastrada.</p>}
            </div>
          </Panel>

          <Panel
            title="Variações e SKUs"
            action={(
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setVariants((current) => [...current, emptyVariant(current.length === 0)])}
              >
                <Plus size={15} /> Adicionar SKU
              </Button>
            )}
          >
            <div className="space-y-4">
              {variants.map((variant, index) => (
                <div key={variant.localId} className="rounded-[var(--radius-md)] border border-border p-4">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-graphite">SKU {index + 1}</p>
                      {variant.existing && <Pill tone="neutral">Existente</Pill>}
                      {variant.isDefault && <Pill tone="info">Padrão</Pill>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="ghost" onClick={() => setDefaultVariant(variant.localId)}>
                        Tornar padrão
                      </Button>
                      {variants.length > 1 && (
                        <Button type="button" size="sm" variant="danger" onClick={() => removeVariant(variant.localId)}>
                          <Trash size={15} /> {variant.existing ? 'Inativar' : 'Remover'}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="SKU" required>
                      {(fieldId) => (
                        <Input
                          id={fieldId}
                          value={variant.sku}
                          disabled={variant.existing}
                          onChange={(event) => updateVariant(variant.localId, { sku: event.target.value.toUpperCase() })}
                        />
                      )}
                    </Field>
                    <Field label="Nome da variação" required>
                      {(fieldId) => (
                        <Input
                          id={fieldId}
                          value={variant.name}
                          onChange={(event) => updateVariant(variant.localId, { name: event.target.value })}
                          placeholder="Ex.: Caramelo / Único"
                        />
                      )}
                    </Field>
                    <Field label="Código de barras">
                      {(fieldId) => (
                        <Input
                          id={fieldId}
                          value={variant.barcode ?? ''}
                          onChange={(event) => updateVariant(variant.localId, { barcode: event.target.value })}
                        />
                      )}
                    </Field>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-4">
                    <Field label="Cor">
                      {(fieldId) => (
                        <Input
                          id={fieldId}
                          value={variant.color ?? ''}
                          onChange={(event) => updateVariant(variant.localId, { color: event.target.value })}
                        />
                      )}
                    </Field>
                    <Field label="Hex">
                      {(fieldId) => (
                        <Input
                          id={fieldId}
                          value={variant.colorHex ?? ''}
                          onChange={(event) => updateVariant(variant.localId, { colorHex: event.target.value })}
                          placeholder="#a5603f"
                        />
                      )}
                    </Field>
                    <Field label="Tamanho">
                      {(fieldId) => (
                        <Input
                          id={fieldId}
                          value={variant.size ?? ''}
                          onChange={(event) => updateVariant(variant.localId, { size: event.target.value })}
                        />
                      )}
                    </Field>
                    <Field label="Acabamento">
                      {(fieldId) => (
                        <Input
                          id={fieldId}
                          value={variant.finish ?? ''}
                          onChange={(event) => updateVariant(variant.localId, { finish: event.target.value })}
                        />
                      )}
                    </Field>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <Field label="Preço (R$)" required>
                      {(fieldId) => (
                        <Input
                          id={fieldId}
                          type="number"
                          min="0"
                          step="0.01"
                          value={centsToInput(variant.priceCents)}
                          onChange={(event) => updateVariant(variant.localId, { priceCents: inputToCents(event.target.value) })}
                        />
                      )}
                    </Field>
                    <Field label="Promocional (R$)">
                      {(fieldId) => (
                        <Input
                          id={fieldId}
                          type="number"
                          min="0"
                          step="0.01"
                          value={centsToInput(variant.promotionalPriceCents)}
                          onChange={(event) => updateVariant(variant.localId, {
                            promotionalPriceCents: event.target.value === '' ? undefined : inputToCents(event.target.value),
                          })}
                        />
                      )}
                    </Field>
                    <Field label="Custo (R$)">
                      {(fieldId) => (
                        <Input
                          id={fieldId}
                          type="number"
                          min="0"
                          step="0.01"
                          value={centsToInput(variant.costPriceCents)}
                          onChange={(event) => updateVariant(variant.localId, {
                            costPriceCents: event.target.value === '' ? undefined : inputToCents(event.target.value),
                          })}
                        />
                      )}
                    </Field>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <Field label="Estoque">
                      {(fieldId) => (
                        <Input
                          id={fieldId}
                          type="number"
                          min="0"
                          disabled={variant.existing}
                          value={variant.stockQuantity}
                          onChange={(event) => updateVariant(variant.localId, { stockQuantity: inputToNumber(event.target.value) })}
                        />
                      )}
                    </Field>
                    <Field label="Reservado">
                      {(fieldId) => (
                        <Input
                          id={fieldId}
                          type="number"
                          min="0"
                          disabled={variant.existing}
                          value={variant.reservedQuantity}
                          onChange={(event) => updateVariant(variant.localId, { reservedQuantity: inputToNumber(event.target.value) })}
                        />
                      )}
                    </Field>
                    <Field label="Estoque mínimo">
                      {(fieldId) => (
                        <Input
                          id={fieldId}
                          type="number"
                          min="0"
                          value={variant.minimumStock}
                          onChange={(event) => updateVariant(variant.localId, { minimumStock: inputToNumber(event.target.value) })}
                        />
                      )}
                    </Field>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-4">
                    <Field label="Peso (kg)" required>
                      {(fieldId) => (
                        <Input
                          id={fieldId}
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={variant.weightKg}
                          onChange={(event) => updateVariant(variant.localId, { weightKg: inputToNumber(event.target.value, 0.001) })}
                        />
                      )}
                    </Field>
                    <Field label="Altura (cm)" required>
                      {(fieldId) => (
                        <Input
                          id={fieldId}
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={variant.heightCm}
                          onChange={(event) => updateVariant(variant.localId, { heightCm: inputToNumber(event.target.value, 0.01) })}
                        />
                      )}
                    </Field>
                    <Field label="Largura (cm)" required>
                      {(fieldId) => (
                        <Input
                          id={fieldId}
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={variant.widthCm}
                          onChange={(event) => updateVariant(variant.localId, { widthCm: inputToNumber(event.target.value, 0.01) })}
                        />
                      )}
                    </Field>
                    <Field label="Profundidade (cm)" required>
                      {(fieldId) => (
                        <Input
                          id={fieldId}
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={variant.depthCm}
                          onChange={(event) => updateVariant(variant.localId, { depthCm: inputToNumber(event.target.value, 0.01) })}
                        />
                      )}
                    </Field>
                  </div>

                  <label className="mt-4 flex items-center gap-2 text-sm text-graphite">
                    <input
                      type="checkbox"
                      checked={variant.isActive}
                      onChange={(event) => updateVariant(variant.localId, { isActive: event.target.checked })}
                      className="h-4 w-4 accent-terracotta"
                    />
                    Ativo
                  </label>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
          <Panel title="Publicação">
            <div className="grid gap-4">
              <Field label="Status">
                {(fieldId) => (
                  <Select
                    id={fieldId}
                    value={form.status}
                    disabled={form.status === 'Archived'}
                    onChange={(event) => updateForm('status', event.target.value)}
                  >
                    {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </Select>
                )}
              </Field>
              <Field label="Ordem">
                {(fieldId) => (
                  <Input
                    id={fieldId}
                    type="number"
                    value={form.displayOrder}
                    onChange={(event) => updateForm('displayOrder', inputToNumber(event.target.value))}
                  />
                )}
              </Field>
              <label className="flex items-center gap-2 text-sm text-graphite">
                <input type="checkbox" checked={form.isFeatured} onChange={(event) => updateForm('isFeatured', event.target.checked)} className="h-4 w-4 accent-terracotta" />
                Destaque
              </label>
              <label className="flex items-center gap-2 text-sm text-graphite">
                <input type="checkbox" checked={form.isNewArrival} onChange={(event) => updateForm('isNewArrival', event.target.checked)} className="h-4 w-4 accent-terracotta" />
                Novidade
              </label>
              <label className="flex items-center gap-2 text-sm text-graphite">
                <input type="checkbox" checked={form.isPromotion} onChange={(event) => updateForm('isPromotion', event.target.checked)} className="h-4 w-4 accent-terracotta" />
                Promoção
              </label>
            </div>
          </Panel>

          <Panel
            title="Imagens"
            action={(
              <Button
                type="button"
                size="sm"
                variant="secondary"
                loading={imageUploadMutation.isPending}
                onClick={() => imageUploadInputRef.current?.click()}
              >
                <UploadSimple size={15} /> Enviar fotos
              </Button>
            )}
          >
            <div className="space-y-4">
              <input
                ref={imageUploadInputRef}
                type="file"
                accept={IMAGE_UPLOAD_ACCEPT}
                multiple
                className="hidden"
                onChange={handleImageUploadChange}
              />

              <div
                role="button"
                tabIndex={0}
                onClick={() => imageUploadInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') imageUploadInputRef.current?.click();
                }}
                onDragEnter={handleImageDragEnter}
                onDragOver={handleImageDragOver}
                onDragLeave={handleImageDragLeave}
                onDrop={handleImageDrop}
                className={cn(
                  'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border-2 border-dashed p-6 text-center transition-colors',
                  isDraggingImages ? 'border-terracotta bg-terracotta/5' : 'border-border hover:border-terracotta/60',
                )}
              >
                <UploadSimple size={24} className="text-store-gray" />
                <p className="text-sm font-medium text-graphite">Arraste fotos aqui ou clique para enviar</p>
                <p className="text-xs text-graphite-soft">JPG, PNG, WEBP ou GIF · até 10 MB · várias de uma vez</p>
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {images.map((image) => {
                    const scopeLabel = image.productVariantId
                      ? imageVariantOptions.find((option) => option.id === image.productVariantId)?.label ?? 'SKU removido'
                      : 'Produto geral';

                    return (
                      <div key={image.localId} className="rounded-[var(--radius-md)] border border-border bg-surface p-2">
                        <div className="group relative aspect-square overflow-hidden rounded-[var(--radius-md)] bg-cream-light">
                          {image.publicUrl ? (
                            <img src={image.publicUrl} alt={image.altText ?? ''} className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-store-gray">
                              <ImageIcon size={24} />
                            </div>
                          )}

                          <span className="absolute bottom-1.5 left-1.5 max-w-[calc(100%-12px)] truncate rounded-full bg-surface/90 px-2 py-1 text-[11px] font-medium text-graphite shadow-sm">
                            {scopeLabel}
                          </span>

                          {image.isMain && (
                            <span className="absolute left-1.5 top-1.5">
                              <Pill tone="info">Principal</Pill>
                            </span>
                          )}

                          <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                            {!image.isMain && (
                              <button
                                type="button"
                                title="Tornar principal"
                                onClick={() => setMainImage(image.localId)}
                                className="grid h-7 w-7 place-items-center rounded-full bg-surface/90 text-graphite shadow-sm hover:text-terracotta"
                              >
                                <Star size={14} />
                              </button>
                            )}
                            <button
                              type="button"
                              title="Remover imagem"
                              onClick={() => setImages((current) => current.filter((item) => item.localId !== image.localId))}
                              className="grid h-7 w-7 place-items-center rounded-full bg-surface/90 text-danger shadow-sm hover:bg-danger hover:text-white"
                            >
                              <Trash size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="mt-2 grid gap-2">
                          <Field label="Imagem de">
                            {(fieldId) => (
                              <Select
                                id={fieldId}
                                value={image.productVariantId ?? ''}
                                onChange={(event) => updateImageVariant(image.localId, event.target.value || undefined)}
                                className="h-9 px-3 text-xs"
                              >
                                <option value="">Produto geral</option>
                                {imageVariantOptions.map((option) => (
                                  <option key={option.id} value={option.id}>{option.label}</option>
                                ))}
                              </Select>
                            )}
                          </Field>
                          <Field label="Texto alternativo">
                            {(fieldId) => (
                              <Input
                                id={fieldId}
                                value={image.altText ?? ''}
                                onChange={(event) => updateImage(image.localId, { altText: event.target.value })}
                                className="h-9 px-3 text-xs"
                              />
                            )}
                          </Field>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {images.length === 0 && <p className="text-sm text-graphite-soft">Nenhuma imagem cadastrada.</p>}
            </div>
          </Panel>

          <Panel title="SEO">
            <div className="grid gap-4">
              <Field label="Título SEO">
                {(fieldId) => (
                  <Input
                    id={fieldId}
                    maxLength={160}
                    value={form.seoTitle ?? ''}
                    onChange={(event) => updateForm('seoTitle', event.target.value)}
                  />
                )}
              </Field>
              <Field label="Descrição SEO">
                {(fieldId) => (
                  <Textarea
                    id={fieldId}
                    maxLength={300}
                    value={form.seoDescription ?? ''}
                    onChange={(event) => updateForm('seoDescription', event.target.value)}
                  />
                )}
              </Field>
              <Field label="Palavras-chave">
                {(fieldId) => (
                  <Input
                    id={fieldId}
                    value={form.searchKeywords ?? ''}
                    onChange={(event) => updateForm('searchKeywords', event.target.value)}
                  />
                )}
              </Field>
            </div>
          </Panel>
        </div>
      </div>
    </form>
  );
}
