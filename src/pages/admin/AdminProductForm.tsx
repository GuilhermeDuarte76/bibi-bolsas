import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CaretLeft,
  CaretRight,
  Check,
  CopySimple,
  FloppyDisk,
  Image as ImageIcon,
  ListChecks,
  Plus,
  Rows,
  Star,
  Trash,
  UploadSimple,
} from '@phosphor-icons/react';
import { adminService, queryKeys } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Banner,
  Button,
  Card,
  ColorInput,
  ErrorState,
  Field,
  Input,
  MoneyInput,
  NumberInput,
  PageHeader,
  SectionCard,
  SegmentedControl,
  Select,
  StatusBadge,
  Steps,
  Textarea,
  toast,
  type StepItem,
  type Tone,
} from '@/components/admin/ui';
import { Skeleton } from '@/components/ui/Skeleton';
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
  variantLocalId?: string;
  original: {
    productVariantId?: string;
    storageKey: string;
    publicUrl: string;
    altText?: string;
    sortOrder: number;
    isMain: boolean;
  };
};

type ImageScopeOption = {
  key: string;
  label: string;
  shortLabel: string;
  meta?: string;
  productVariantId?: string;
  variantLocalId?: string;
  colorHex?: string;
  isPersisted: boolean;
};

type ProductFormState = Omit<AdminProductInput, 'variants'>;

const STATUS_OPTIONS = [
  { value: 'Draft', label: 'Rascunho' },
  { value: 'Published', label: 'Publicado' },
];

const FORM_MODE_KEY = 'admin:product-form-mode';

const STEPS: StepItem[] = [
  { key: 'info', label: 'Informações', description: 'Nome, descrição e categorias' },
  { key: 'variants', label: 'Variações', description: 'SKUs, preços e estoque' },
  { key: 'images', label: 'Imagens', description: 'Fotos por variação' },
  { key: 'publish', label: 'Publicação', description: 'Status e SEO' },
];

/** Descobre em qual etapa está o campo com erro de validação. */
function stepForError(message: string): number {
  const m = message.toLowerCase();
  if (m.includes('sku') || m.includes('variaç') || m.includes('preço') || m.includes('promocional') ||
    m.includes('estoque') || m.includes('reserva') || m.includes('peso') || m.includes('dimens')) return 1;
  if (m.includes('imagem') || m.includes('url') || m.includes('storage')) return 2;
  return 0;
}

const IMAGE_UPLOAD_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';
const IMAGE_MAX_SIZE_BYTES = 10 * 1024 * 1024;
const IMAGE_SCOPE_GENERAL = 'general';

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
    .replace(/[̀-ͯ]/g, '')
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

function normalizeSku(value?: string) {
  return value?.trim().toUpperCase() ?? '';
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

function variantShortLabel(variant: VariantForm, index: number) {
  return normalizeSku(variant.sku) || `SKU ${index + 1}`;
}

function imageScopeKey(image: ImageForm, variants: VariantForm[]) {
  if (image.variantLocalId) return image.variantLocalId;
  if (image.productVariantId) {
    return variants.find((variant) => variant.id === image.productVariantId)?.localId ?? IMAGE_SCOPE_GENERAL;
  }

  return IMAGE_SCOPE_GENERAL;
}

function imageScopePatch(option?: ImageScopeOption): Pick<ImageForm, 'productVariantId' | 'variantLocalId'> {
  if (!option || option.key === IMAGE_SCOPE_GENERAL) {
    return {
      productVariantId: undefined,
      variantLocalId: undefined,
    };
  }

  return {
    productVariantId: option.productVariantId,
    variantLocalId: option.variantLocalId,
  };
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

function imageFromProduct(image: AdminProductImage, variants: VariantForm[]): ImageForm {
  const storageKey = storageKeyFromUrl(image.publicUrl);
  const variantLocalId = variants.find((variant) => variant.id === image.productVariantId)?.localId;
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
    variantLocalId,
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

function cleanImage(
  image: ImageForm,
  index: number,
  isMain: boolean,
  productVariantId?: string,
): AdminProductImageInput {
  const publicUrl = image.publicUrl.trim();
  return {
    id: image.id,
    productVariantId,
    storageKey: image.storageKey.trim() || storageKeyFromUrl(publicUrl),
    publicUrl,
    altText: image.altText?.trim() || undefined,
    sortOrder: Number.isFinite(image.sortOrder) ? image.sortOrder : index,
    isMain,
  };
}

function imageChanged(image: ImageForm, input: AdminProductImageInput) {
  return input.productVariantId !== image.original.productVariantId ||
    input.storageKey !== image.original.storageKey ||
    input.publicUrl !== image.original.publicUrl ||
    (input.altText || '') !== (image.original.altText || '') ||
    input.sortOrder !== image.original.sortOrder ||
    input.isMain !== image.original.isMain;
}

function imageMetadataChanged(image: ImageForm, input: AdminProductImageInput) {
  return input.productVariantId !== image.original.productVariantId ||
    input.storageKey !== image.original.storageKey ||
    input.publicUrl !== image.original.publicUrl ||
    (input.altText || '') !== (image.original.altText || '') ||
    input.sortOrder !== image.original.sortOrder;
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

  const variantLocalIds = new Set(variants.map((variant) => variant.localId));
  const variantIds = new Set(variants.map((variant) => variant.id).filter(Boolean));
  for (const image of images) {
    if (!image.publicUrl.trim() && !image.storageKey.trim()) continue;
    if (image.variantLocalId && !variantLocalIds.has(image.variantLocalId)) return 'Uma imagem está vinculada a um SKU removido.';
    if (!image.variantLocalId && image.productVariantId && !variantIds.has(image.productVariantId)) return 'Uma imagem está vinculada a um SKU removido.';
    if (!assertValidUrl(image.publicUrl.trim())) return 'Há uma imagem inválida. Remova-a e reenvie a foto.';
    if (!image.storageKey.trim()) return 'Há uma imagem inválida. Remova-a e reenvie a foto.';
  }

  return null;
}

function validateImageUploadFile(file: File) {
  if (!file.size) return 'Arquivo vazio ou inválido.';
  if (file.size > IMAGE_MAX_SIZE_BYTES) return 'Imagem deve ter no máximo 10 MB.';
  if (!IMAGE_UPLOAD_ACCEPT.split(',').includes(file.type)) return 'Use imagem em JPG, PNG, WEBP ou GIF.';
  return null;
}

function resolveImageProductVariantId(
  image: ImageForm,
  variants: VariantForm[],
  savedProduct: AdminProduct,
) {
  if (!image.variantLocalId && image.productVariantId) return image.productVariantId;

  const variant = image.variantLocalId
    ? variants.find((candidate) => candidate.localId === image.variantLocalId)
    : image.productVariantId
      ? variants.find((candidate) => candidate.id === image.productVariantId)
      : undefined;

  if (!variant) return undefined;

  const savedVariant = savedProduct.variants.find((candidate) => normalizeSku(candidate.sku) === normalizeSku(variant.sku));
  return savedVariant?.id ?? variant.id;
}

function prepareImageDrafts(
  images: ImageForm[],
  variants: VariantForm[],
  savedProduct: AdminProduct,
): Array<{ source: ImageForm; input: AdminProductImageInput }> {
  const entries = images
    .filter((image) => image.publicUrl.trim() || image.storageKey.trim())
    .map((image) => ({
      image,
      scopeKey: imageScopeKey(image, variants),
    }));

  const scopeHasMain = new Map<string, boolean>();
  const scopeFirstImage = new Map<string, string>();
  for (const entry of entries) {
    if (!scopeFirstImage.has(entry.scopeKey)) scopeFirstImage.set(entry.scopeKey, entry.image.localId);
    if (entry.image.isMain) scopeHasMain.set(entry.scopeKey, true);
  }

  const scopeSortOrder = new Map<string, number>();
  return entries.map((entry) => {
    const sortOrder = scopeSortOrder.get(entry.scopeKey) ?? 0;
    scopeSortOrder.set(entry.scopeKey, sortOrder + 1);

    const isMain = scopeHasMain.get(entry.scopeKey)
      ? entry.image.isMain
      : scopeFirstImage.get(entry.scopeKey) === entry.image.localId;

    return {
      source: entry.image,
      input: cleanImage(
        entry.image,
        sortOrder,
        isMain,
        resolveImageProductVariantId(entry.image, variants, savedProduct),
      ),
    };
  });
}

/** Interruptor estilizado para flags booleanas. */
function SwitchRow({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'tactile flex items-center justify-between gap-3 rounded-[var(--radius-md)] border px-3.5 py-2.5 text-left transition-colors',
        checked ? 'border-terracotta/40 bg-terracotta/[0.06]' : 'border-border hover:border-terracotta/40',
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-graphite">{label}</span>
        {description && <span className="block text-xs text-graphite-soft">{description}</span>}
      </span>
      <span className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors', checked ? 'bg-terracotta' : 'bg-sand/70')}>
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-[18px]' : 'translate-x-0.5',
          )}
        />
      </span>
    </button>
  );
}

/** Sub-título de grupo de campos dentro de uma variação. */
function FieldGroup({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-wider text-graphite-soft">{title}</p>
      {children}
    </div>
  );
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
  const [activeImageScope, setActiveImageScope] = useState(IMAGE_SCOPE_GENERAL);
  const [isDraggingImages, setIsDraggingImages] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'steps' | 'full'>(
    () => (localStorage.getItem(FORM_MODE_KEY) === 'full' ? 'full' : 'steps'),
  );
  const [currentStep, setCurrentStep] = useState(0);
  const dragCounterRef = useRef(0);

  const changeViewMode = (mode: 'steps' | 'full') => {
    setViewMode(mode);
    localStorage.setItem(FORM_MODE_KEY, mode);
  };
  const goToStep = (index: number) => {
    setCurrentStep(Math.max(0, Math.min(STEPS.length - 1, index)));
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
  const imageScopeOptions = useMemo<ImageScopeOption[]>(
    () => [
      {
        key: IMAGE_SCOPE_GENERAL,
        label: 'Produto geral',
        shortLabel: 'Geral',
        meta: 'Vitrine e fallback',
        isPersisted: true,
      },
      ...variants.map((variant, index) => ({
        key: variant.localId,
        label: variantImageLabel(variant),
        shortLabel: variantShortLabel(variant, index),
        meta: [variant.color?.trim(), variant.size?.trim(), variant.id ? 'salvo' : 'novo', !variant.isActive ? 'inativo' : null]
          .filter(Boolean)
          .join(' · '),
        productVariantId: variant.id,
        variantLocalId: variant.localId,
        colorHex: variant.colorHex?.trim(),
        isPersisted: Boolean(variant.id),
      })),
    ],
    [variants],
  );
  const imageScopeOptionByKey = useMemo(
    () => new Map(imageScopeOptions.map((option) => [option.key, option])),
    [imageScopeOptions],
  );
  const imageScopeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const image of images) {
      const key = imageScopeKey(image, variants);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [images, variants]);
  const visibleImages = useMemo(
    () => images.filter((image) => imageScopeKey(image, variants) === activeImageScope),
    [activeImageScope, images, variants],
  );
  const activeImageScopeOption = imageScopeOptionByKey.get(activeImageScope) ?? imageScopeOptions[0];

  useEffect(() => {
    if (!isNew && product) {
      const productVariants = variantFromProduct(product);
      setForm(formFromProduct(product));
      setVariants(productVariants);
      setImages(product.images.map((image) => imageFromProduct(image, productVariants)));
    }
  }, [isNew, product]);

  useEffect(() => {
    if (!imageScopeOptionByKey.has(activeImageScope)) setActiveImageScope(IMAGE_SCOPE_GENERAL);
  }, [activeImageScope, imageScopeOptionByKey]);

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

      const imageDrafts = prepareImageDrafts(images, variants, savedProduct);
      const keptImageIds = new Set(imageDrafts.filter((draft) => draft.input.id).map((draft) => draft.input.id));

      if (!isNew && product) {
        const removedImages = product.images.filter((image) => !keptImageIds.has(image.id));
        await Promise.all(
          removedImages.map((image) => adminService.deleteAdminProductImage(savedProduct.id, image.id)),
        );
      }

      for (const draft of imageDrafts) {
        const image = draft.input;
        if (image.id) {
          if (draft.source.existing && imageChanged(draft.source, image)) {
            if (imageMetadataChanged(draft.source, image)) {
              await adminService.updateAdminProductImage(savedProduct.id, image.id, image);
            } else if (image.isMain && image.isMain !== draft.source.original.isMain) {
              await adminService.setAdminProductMainImage(savedProduct.id, image.id);
            }
          }
        } else {
          await adminService.addAdminProductImage(savedProduct.id, image);
        }
      }

      return savedProduct;
    },
    onMutate: () => setFormError(null),
    onSuccess: async (savedProduct) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.products }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.product(savedProduct.id) }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'inventory'] }),
      ]);
      toast.success(
        isNew
          ? { title: 'Produto criado', description: `“${savedProduct.name}” foi adicionado ao catálogo.` }
          : { title: 'Produto atualizado', description: `As alterações de “${savedProduct.name}” foram salvas.` },
      );
      navigate('/admin/produtos');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Não foi possível salvar o produto.';
      setFormError(message);
      setCurrentStep(stepForError(message));
      toast.error({ title: 'Não foi possível salvar', description: message });
    },
  });

  const imageUploadMutation = useMutation({
    mutationFn: async ({ file }: { file: File; scopeKey: string }) => {
      const validation = validateImageUploadFile(file);
      if (validation) throw new Error(validation);

      return adminService.uploadAdminProductImage(file);
    },
    onSuccess: (upload, { file, scopeKey }) => {
      setImages((current) => {
        const scopeOption = imageScopeOptionByKey.get(scopeKey);
        const scopedPatch = imageScopePatch(scopeOption);
        const hasMainImage = current.some((image) => imageScopeKey(image, variants) === scopeKey && image.isMain);

        return [
          ...current,
          {
            ...emptyImage(),
            ...scopedPatch,
            storageKey: upload.storageKey,
            publicUrl: upload.publicUrl,
            altText: form.name.trim() || file.name,
            sortOrder: current.length,
            isMain: !hasMainImage,
          },
        ];
      });

      toast.success({ title: 'Imagem enviada', description: 'A foto foi adicionada ao grupo selecionado.' });
    },
    onError: (error) => {
      toast.error({
        title: 'Falha no envio',
        description: error instanceof Error ? error.message : 'Não foi possível enviar a imagem.',
      });
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

  const duplicateVariant = (localId: string) => {
    setVariants((current) => {
      const index = current.findIndex((variant) => variant.localId === localId);
      if (index === -1) return current;
      const source = current[index];
      const copy: VariantForm = {
        ...source,
        localId: newLocalId('variant'),
        existing: false,
        id: undefined,
        isDefault: false,
        sku: '',
      };
      const next = [...current];
      next.splice(index + 1, 0, copy);
      return next;
    });
    toast.success({ title: 'Variação duplicada', description: 'Defina um SKU único para a cópia.' });
  };

  const setDefaultVariant = (localId: string) => {
    setVariants((current) => current.map((variant) => ({
      ...variant,
      isDefault: variant.localId === localId,
      isActive: variant.localId === localId ? true : variant.isActive,
    })));
  };

  const removeVariant = (localId: string) => {
    const removedVariant = variants.find((variant) => variant.localId === localId);
    setVariants((current) => {
      if (current.length <= 1) return current;
      const next = current.filter((variant) => variant.localId !== localId);
      if (!next.some((variant) => variant.isDefault)) next[0].isDefault = true;
      return next;
    });
    setImages((current) => current.map((image) => {
      const referencesRemovedVariant = image.variantLocalId === localId ||
        (removedVariant?.id && image.productVariantId === removedVariant.id);

      return referencesRemovedVariant
        ? { ...image, productVariantId: undefined, variantLocalId: undefined }
        : image;
    }));
    if (activeImageScope === localId) setActiveImageScope(IMAGE_SCOPE_GENERAL);
  };

  const updateImage = (localId: string, patch: Partial<ImageForm>) => {
    setImages((current) => current.map((image) => (
      image.localId === localId ? { ...image, ...patch } : image
    )));
  };

  const updateImageScope = (localId: string, scopeKey: string) => {
    const scopeOption = imageScopeOptionByKey.get(scopeKey);
    const scopedPatch = imageScopePatch(scopeOption);

    setImages((current) => {
      const selected = current.find((image) => image.localId === localId);
      if (!selected) return current;

      return current.map((image) => {
        if (image.localId === localId) return { ...image, ...scopedPatch };
        if (selected.isMain && imageScopeKey(image, variants) === scopeKey) return { ...image, isMain: false };
        return image;
      });
    });
  };

  const setMainImage = (localId: string) => {
    setImages((current) => {
      const selected = current.find((image) => image.localId === localId);
      if (!selected) return current;
      const selectedScopeKey = imageScopeKey(selected, variants);

      return current.map((image) => (
        imageScopeKey(image, variants) === selectedScopeKey
          ? { ...image, isMain: image.localId === localId }
          : image
      ));
    });
  };

  const uploadImageFiles = (files: FileList | File[] | null | undefined) => {
    if (!files) return;
    Array.from(files).forEach((file) => imageUploadMutation.mutate({ file, scopeKey: activeImageScope }));
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Skeleton className="h-96 w-full rounded-[var(--radius-lg)]" />
          <Skeleton className="h-96 w-full rounded-[var(--radius-lg)]" />
        </div>
      </div>
    );
  }

  if (!isNew && productQuery.isError) {
    return (
      <Card>
        <ErrorState
          title="Produto não encontrado"
          description="Não foi possível carregar este produto. Ele pode ter sido removido."
        />
        <div className="flex justify-center pb-6">
          <Button variant="outline" onClick={() => navigate('/admin/produtos')}>
            <CaretLeft size={16} /> Voltar aos produtos
          </Button>
        </div>
      </Card>
    );
  }

  const statusTone: Tone = form.status === 'Published' ? 'success' : form.status === 'Archived' ? 'neutral' : 'warning';
  const statusLabel = form.status === 'Published' ? 'Publicado' : form.status === 'Archived' ? 'Arquivado' : 'Rascunho';
  const isLastStep = currentStep === STEPS.length - 1;

  // ---- Seções (reutilizadas nos modos etapas e completo) ----

  const basicoCard = (
    <SectionCard eyebrow="Produto" title="Informações básicas" description="Nome, descrição e atributos gerais.">
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
          <Field label="Slug" hint="Gerado a partir do nome se ficar em branco.">
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
              <Input id={fieldId} value={form.brand ?? ''} onChange={(event) => updateForm('brand', event.target.value)} />
            )}
          </Field>
        </div>

        <Field label="Descrição curta">
          {(fieldId) => (
            <Input
              id={fieldId}
              value={form.shortDescription ?? ''}
              onChange={(event) => updateForm('shortDescription', event.target.value)}
              placeholder="Frase de destaque exibida nas listagens."
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
              <Input id={fieldId} value={form.collection ?? ''} onChange={(event) => updateForm('collection', event.target.value)} />
            )}
          </Field>
          <Field label="Material principal">
            {(fieldId) => (
              <Input id={fieldId} value={form.mainMaterial ?? ''} onChange={(event) => updateForm('mainMaterial', event.target.value)} />
            )}
          </Field>
          <Field label="Cor principal">
            {(fieldId) => (
              <Input id={fieldId} value={form.mainColor ?? ''} onChange={(event) => updateForm('mainColor', event.target.value)} placeholder="Ex.: Caramelo" />
            )}
          </Field>
        </div>
      </div>
    </SectionCard>
  );

  const categoriasCard = (
    <SectionCard eyebrow="Organização" title="Categorias" description="Selecione ao menos uma categoria.">
      {activeCategories.length === 0 ? (
        <p className="text-sm text-graphite-soft">Nenhuma categoria ativa cadastrada.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {activeCategories.map((category) => {
            const selected = form.categoryIds.includes(category.id);
            return (
              <button
                key={category.id}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleCategory(category)}
                className={cn(
                  'tactile flex items-center gap-2.5 rounded-[var(--radius-md)] border px-3 py-2.5 text-left text-sm transition-colors',
                  selected ? 'border-terracotta bg-terracotta/[0.08] text-graphite' : 'border-border text-graphite hover:border-terracotta/50',
                )}
              >
                <span
                  className={cn(
                    'grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors',
                    selected ? 'border-terracotta bg-terracotta text-white' : 'border-store-gray/50',
                  )}
                >
                  {selected && <Check size={11} weight="bold" />}
                </span>
                <span className="truncate">{category.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </SectionCard>
  );

  const variacoesCard = (
    <SectionCard
      eyebrow="Catálogo"
      title="Variações e SKUs"
      description="Cada SKU tem preço, estoque e logística próprios."
      action={
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setVariants((current) => [...current, emptyVariant(current.length === 0)])}
        >
          <Plus size={15} /> Adicionar SKU
        </Button>
      }
      bodyClassName="flex flex-col gap-4"
    >
      {variants.map((variant, index) => (
        <div key={variant.localId} className="rounded-[var(--radius-md)] border border-border bg-cream-lighter/40 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-graphite">SKU {index + 1}</p>
              {variant.existing && <StatusBadge tone="neutral" size="sm">Existente</StatusBadge>}
              {variant.isDefault && (
                <StatusBadge tone="info" size="sm">
                  <Star size={11} weight="fill" /> Padrão
                </StatusBadge>
              )}
              {!variant.isActive && <StatusBadge tone="warning" size="sm">Inativo</StatusBadge>}
            </div>
            <div className="flex flex-wrap gap-1">
              <Button type="button" size="sm" variant="ghost" onClick={() => duplicateVariant(variant.localId)}>
                <CopySimple size={15} /> Duplicar
              </Button>
              {!variant.isDefault && (
                <Button type="button" size="sm" variant="ghost" onClick={() => setDefaultVariant(variant.localId)}>
                  Tornar padrão
                </Button>
              )}
              {variants.length > 1 && (
                <Button type="button" size="sm" variant="ghost" className="text-danger hover:bg-danger-soft/60" onClick={() => removeVariant(variant.localId)}>
                  <Trash size={15} /> {variant.existing ? 'Inativar' : 'Remover'}
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <FieldGroup title="Identificação">
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="SKU" required>
                  {(fieldId) => (
                    <Input
                      id={fieldId}
                      value={variant.sku}
                      disabled={variant.existing}
                      onChange={(event) => updateVariant(variant.localId, { sku: event.target.value.toUpperCase() })}
                      placeholder="BB-BOLSA-00"
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
                <Field label="Código de barras" hint="EAN/GTIN (opcional)">
                  {(fieldId) => (
                    <Input
                      id={fieldId}
                      inputMode="numeric"
                      value={variant.barcode ?? ''}
                      onChange={(event) => updateVariant(variant.localId, { barcode: event.target.value })}
                      placeholder="7891234567890"
                    />
                  )}
                </Field>
              </div>
            </FieldGroup>

            <FieldGroup title="Atributos">
              <div className="grid gap-4 md:grid-cols-4">
                <Field label="Cor">
                  {(fieldId) => (
                    <Input id={fieldId} value={variant.color ?? ''} onChange={(event) => updateVariant(variant.localId, { color: event.target.value })} placeholder="Caramelo" />
                  )}
                </Field>
                <Field label="Cor (hex)">
                  {(fieldId) => (
                    <ColorInput
                      id={fieldId}
                      value={variant.colorHex ?? ''}
                      onChange={(value) => updateVariant(variant.localId, { colorHex: value })}
                    />
                  )}
                </Field>
                <Field label="Tamanho">
                  {(fieldId) => (
                    <Input id={fieldId} value={variant.size ?? ''} onChange={(event) => updateVariant(variant.localId, { size: event.target.value })} placeholder="Único" />
                  )}
                </Field>
                <Field label="Acabamento">
                  {(fieldId) => (
                    <Input id={fieldId} value={variant.finish ?? ''} onChange={(event) => updateVariant(variant.localId, { finish: event.target.value })} placeholder="Fosco" />
                  )}
                </Field>
              </div>
            </FieldGroup>

            <FieldGroup title="Preços">
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Preço" required>
                  {(fieldId) => (
                    <MoneyInput
                      id={fieldId}
                      valueCents={variant.priceCents}
                      onChangeCents={(cents) => updateVariant(variant.localId, { priceCents: cents ?? 0 })}
                    />
                  )}
                </Field>
                <Field label="Promocional" hint="Menor que o preço normal">
                  {(fieldId) => (
                    <MoneyInput
                      id={fieldId}
                      allowEmpty
                      valueCents={variant.promotionalPriceCents}
                      onChangeCents={(cents) => updateVariant(variant.localId, { promotionalPriceCents: cents })}
                    />
                  )}
                </Field>
                <Field label="Custo">
                  {(fieldId) => (
                    <MoneyInput
                      id={fieldId}
                      allowEmpty
                      valueCents={variant.costPriceCents}
                      onChangeCents={(cents) => updateVariant(variant.localId, { costPriceCents: cents })}
                    />
                  )}
                </Field>
              </div>
            </FieldGroup>

            <FieldGroup title="Estoque">
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Quantidade">
                  {(fieldId) => (
                    <NumberInput
                      id={fieldId}
                      stepper
                      min={0}
                      disabled={variant.existing}
                      value={variant.stockQuantity}
                      onChange={(n) => updateVariant(variant.localId, { stockQuantity: n ?? 0 })}
                    />
                  )}
                </Field>
                <Field label="Reservado">
                  {(fieldId) => (
                    <NumberInput
                      id={fieldId}
                      stepper
                      min={0}
                      disabled={variant.existing}
                      value={variant.reservedQuantity}
                      onChange={(n) => updateVariant(variant.localId, { reservedQuantity: n ?? 0 })}
                    />
                  )}
                </Field>
                <Field label="Estoque mínimo">
                  {(fieldId) => (
                    <NumberInput
                      id={fieldId}
                      stepper
                      min={0}
                      value={variant.minimumStock}
                      onChange={(n) => updateVariant(variant.localId, { minimumStock: n ?? 0 })}
                    />
                  )}
                </Field>
              </div>
            </FieldGroup>

            <FieldGroup title="Logística (peso e dimensões)">
              <div className="grid gap-4 md:grid-cols-4">
                <Field label="Peso" required>
                  {(fieldId) => (
                    <NumberInput
                      id={fieldId}
                      allowDecimal
                      min={0.001}
                      suffix="kg"
                      value={variant.weightKg}
                      onChange={(n) => updateVariant(variant.localId, { weightKg: n ?? 0.001 })}
                    />
                  )}
                </Field>
                <Field label="Altura" required>
                  {(fieldId) => (
                    <NumberInput
                      id={fieldId}
                      allowDecimal
                      min={0.01}
                      suffix="cm"
                      value={variant.heightCm}
                      onChange={(n) => updateVariant(variant.localId, { heightCm: n ?? 0.01 })}
                    />
                  )}
                </Field>
                <Field label="Largura" required>
                  {(fieldId) => (
                    <NumberInput
                      id={fieldId}
                      allowDecimal
                      min={0.01}
                      suffix="cm"
                      value={variant.widthCm}
                      onChange={(n) => updateVariant(variant.localId, { widthCm: n ?? 0.01 })}
                    />
                  )}
                </Field>
                <Field label="Profundidade" required>
                  {(fieldId) => (
                    <NumberInput
                      id={fieldId}
                      allowDecimal
                      min={0.01}
                      suffix="cm"
                      value={variant.depthCm}
                      onChange={(n) => updateVariant(variant.localId, { depthCm: n ?? 0.01 })}
                    />
                  )}
                </Field>
              </div>
            </FieldGroup>

            <SwitchRow
              checked={variant.isActive}
              onChange={(value) => updateVariant(variant.localId, { isActive: value })}
              label="Variação ativa"
              description="SKUs inativos não aparecem na loja nem contam no estoque."
            />
          </div>
        </div>
      ))}
    </SectionCard>
  );

  const imagensCard = (
    <SectionCard
      eyebrow="Mídia"
      title="Imagens"
      description="Organize as fotos por produto geral ou por variação."
      action={
        <Button
          type="button"
          size="sm"
          variant="secondary"
          loading={imageUploadMutation.isPending}
          onClick={() => imageUploadInputRef.current?.click()}
        >
          <UploadSimple size={15} /> Enviar fotos
        </Button>
      }
      bodyClassName="flex flex-col gap-4"
    >
      <input
        ref={imageUploadInputRef}
        type="file"
        accept={IMAGE_UPLOAD_ACCEPT}
        multiple
        className="hidden"
        onChange={handleImageUploadChange}
      />

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {imageScopeOptions.map((option) => {
          const count = imageScopeCounts.get(option.key) ?? 0;
          const selected = activeImageScope === option.key;

          return (
            <button
              key={option.key}
              type="button"
              onClick={() => setActiveImageScope(option.key)}
              className={cn(
                'tactile min-w-[132px] rounded-[var(--radius-md)] border px-3 py-2 text-left transition-colors',
                selected ? 'border-terracotta bg-terracotta/[0.08]' : 'border-border bg-surface hover:border-terracotta/50',
              )}
            >
              <span className="flex items-center gap-2">
                {option.colorHex && (
                  <span
                    className="h-3 w-3 shrink-0 rounded-full border border-graphite/10"
                    style={{ backgroundColor: option.colorHex }}
                    aria-hidden
                  />
                )}
                <span className="truncate text-xs font-semibold text-graphite">{option.shortLabel}</span>
                <span
                  className={cn(
                    'ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                    selected ? 'bg-terracotta/15 text-terracotta' : 'bg-cream text-graphite-soft',
                  )}
                >
                  {count}
                </span>
              </span>
              {option.meta && <span className="mt-0.5 block truncate text-[11px] text-graphite-soft">{option.meta}</span>}
            </button>
          );
        })}
      </div>

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
          'tactile flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[var(--radius-md)] border-2 border-dashed p-6 text-center transition-colors',
          isDraggingImages ? 'border-terracotta bg-terracotta/5' : 'border-border hover:border-terracotta/50 hover:bg-cream-lighter',
        )}
      >
        <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-terracotta/10 text-terracotta">
          <UploadSimple size={22} />
        </span>
        <p className="text-sm font-medium text-graphite">
          Arraste ou clique para enviar em <span className="text-terracotta">{activeImageScopeOption?.shortLabel ?? 'Geral'}</span>
        </p>
        <p className="text-xs text-graphite-soft">JPG, PNG, WEBP ou GIF · até 10 MB · várias de uma vez</p>
      </div>

      {visibleImages.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibleImages.map((image) => {
            const scopeKey = imageScopeKey(image, variants);
            const scopeLabel = imageScopeOptionByKey.get(scopeKey)?.label ?? 'Produto geral';

            return (
              <div key={image.localId} className="rounded-[var(--radius-md)] border border-border bg-surface p-2">
                <div className="group relative aspect-square overflow-hidden rounded-[var(--radius-sm)] bg-cream-light">
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
                      <StatusBadge tone="brand" size="sm">
                        <Star size={11} weight="fill" /> Principal
                      </StatusBadge>
                    </span>
                  )}

                  <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                    {!image.isMain && (
                      <button
                        type="button"
                        title="Tornar principal"
                        onClick={() => setMainImage(image.localId)}
                        className="tactile grid h-7 w-7 place-items-center rounded-full bg-surface/90 text-graphite shadow-sm hover:text-terracotta"
                      >
                        <Star size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      title="Remover imagem"
                      onClick={() => setImages((current) => current.filter((item) => item.localId !== image.localId))}
                      className="tactile grid h-7 w-7 place-items-center rounded-full bg-surface/90 text-danger shadow-sm hover:bg-danger hover:text-white"
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
                        value={scopeKey}
                        onChange={(event) => updateImageScope(image.localId, event.target.value)}
                        className="h-9 px-3 text-xs"
                      >
                        {imageScopeOptions.map((option) => (
                          <option key={option.key} value={option.key}>
                            {option.isPersisted ? option.label : `${option.label} (novo)`}
                          </option>
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
      {images.length === 0 && (
        <p className="rounded-[var(--radius-md)] border border-dashed border-border px-3 py-4 text-center text-sm text-graphite-soft">
          Nenhuma imagem cadastrada ainda.
        </p>
      )}
      {images.length > 0 && visibleImages.length === 0 && (
        <p className="rounded-[var(--radius-md)] border border-dashed border-border px-3 py-4 text-center text-sm text-graphite-soft">
          Nenhuma imagem neste grupo.
        </p>
      )}
    </SectionCard>
  );

  const publicacaoCard = (
    <SectionCard eyebrow="Publicação" title="Status e visibilidade">
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status">
            {(fieldId) => (
              <Select
                id={fieldId}
                value={form.status}
                disabled={form.status === 'Archived'}
                onChange={(event) => updateForm('status', event.target.value)}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Ordem de exibição">
            {(fieldId) => (
              <NumberInput
                id={fieldId}
                stepper
                min={0}
                value={form.displayOrder}
                onChange={(n) => updateForm('displayOrder', n ?? 0)}
              />
            )}
          </Field>
        </div>
        <div className="grid gap-2">
          <SwitchRow checked={form.isFeatured} onChange={(v) => updateForm('isFeatured', v)} label="Destaque" description="Aparece nas vitrines de destaque." />
          <SwitchRow checked={form.isNewArrival} onChange={(v) => updateForm('isNewArrival', v)} label="Novidade" description="Marca o produto como lançamento." />
          <SwitchRow checked={form.isPromotion} onChange={(v) => updateForm('isPromotion', v)} label="Promoção" description="Sinaliza que está em oferta." />
        </div>
      </div>
    </SectionCard>
  );

  const seoCard = (
    <SectionCard eyebrow="Busca" title="SEO">
      <div className="grid gap-4">
        <Field label="Título SEO" hint={`${(form.seoTitle ?? '').length}/160`}>
          {(fieldId) => (
            <Input id={fieldId} maxLength={160} value={form.seoTitle ?? ''} onChange={(event) => updateForm('seoTitle', event.target.value)} />
          )}
        </Field>
        <Field label="Descrição SEO" hint={`${(form.seoDescription ?? '').length}/300`}>
          {(fieldId) => (
            <Textarea id={fieldId} maxLength={300} value={form.seoDescription ?? ''} onChange={(event) => updateForm('seoDescription', event.target.value)} />
          )}
        </Field>
        <Field label="Palavras-chave" hint="Separe por vírgulas.">
          {(fieldId) => (
            <Input id={fieldId} value={form.searchKeywords ?? ''} onChange={(event) => updateForm('searchKeywords', event.target.value)} placeholder="bolsa, couro, tote" />
          )}
        </Field>
      </div>
    </SectionCard>
  );

  const stepBodies = [
    <div key="s0" className="mx-auto flex w-full max-w-3xl flex-col gap-6">{basicoCard}{categoriasCard}</div>,
    <div key="s1" className="mx-auto w-full max-w-4xl">{variacoesCard}</div>,
    <div key="s2" className="mx-auto w-full max-w-4xl">{imagensCard}</div>,
    <div key="s3" className="mx-auto flex w-full max-w-3xl flex-col gap-6">{publicacaoCard}{seoCard}</div>,
  ];

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (viewMode === 'steps' && !isLastStep) {
          goToStep(currentStep + 1);
          return;
        }
        saveMutation.mutate();
      }}
    >
      <PageHeader
        breadcrumbs={[
          { label: 'Catálogo' },
          { label: 'Produtos', to: '/admin/produtos' },
          { label: isNew ? 'Novo produto' : 'Editar' },
        ]}
        eyebrow={isNew ? 'Novo cadastro' : 'Edição'}
        title={isNew ? 'Novo produto' : product?.name ?? 'Produto'}
        subtitle={isNew ? 'Cadastre um produto no catálogo com variações, imagens e SEO.' : 'Atualize as informações, variações e imagens do produto.'}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <SegmentedControl
              value={viewMode}
              onChange={changeViewMode}
              options={[
                { value: 'steps', label: <><ListChecks size={15} /> Etapas</> },
                { value: 'full', label: <><Rows size={15} /> Completo</> },
              ]}
            />
            <StatusBadge tone={statusTone} dot>{statusLabel}</StatusBadge>
          </div>
        }
      />

      {formError && (
        <Banner tone="danger" title="Revise o formulário" className="mb-6" onDismiss={() => setFormError(null)}>
          {formError}
        </Banner>
      )}

      {viewMode === 'steps' ? (
        <div className="flex flex-col gap-6">
          <Card className="p-1.5 sm:p-2">
            <Steps steps={STEPS} current={currentStep} onSelect={goToStep} />
          </Card>
          {stepBodies[currentStep]}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-6">
            {basicoCard}
            {variacoesCard}
            {imagensCard}
          </div>
          <div className="flex min-w-0 flex-col gap-6">
            {publicacaoCard}
            {categoriasCard}
            {seoCard}
          </div>
        </div>
      )}

      {/* Barra de ações fixa (sticky, independente da sidebar) */}
      <div className="sticky bottom-0 z-30 mt-6 -mx-4 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:-mx-8 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <p className="hidden text-sm text-graphite-soft sm:block">
            {viewMode === 'steps'
              ? `Passo ${currentStep + 1} de ${STEPS.length} · ${STEPS[currentStep].label}`
              : isNew
                ? 'Preencha os campos obrigatórios e salve.'
                : 'Alterações são aplicadas ao salvar.'}
          </p>
          <div className="flex flex-1 items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => navigate('/admin/produtos')}>
              Cancelar
            </Button>
            {viewMode === 'steps' && currentStep > 0 && (
              <Button type="button" variant="outline" onClick={() => goToStep(currentStep - 1)}>
                <CaretLeft size={16} /> Voltar
              </Button>
            )}
            {viewMode === 'steps' && !isLastStep ? (
              <Button type="button" onClick={() => goToStep(currentStep + 1)}>
                Próximo <CaretRight size={16} />
              </Button>
            ) : (
              <Button type="submit" loading={saveMutation.isPending} disabled={imageUploadMutation.isPending}>
                <FloppyDisk size={17} /> {isNew ? 'Criar produto' : 'Salvar alterações'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
