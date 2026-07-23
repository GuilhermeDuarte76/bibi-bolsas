import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChartBar, CheckCircle, Eye, MagnifyingGlass, MapPin, PencilSimple, Plus, ShieldCheck, ShieldWarning, Trash, XCircle } from '@phosphor-icons/react';
import { adminService, queryKeys } from '@/lib/api';
import type {
  AdminCouponInput,
  AdminCouponScopeInput,
  AdminCouponUsage,
  AdminPromotionInput,
  AdminPromotionReport,
} from '@/lib/api/admin.service';
import type { Address, AdminCatalogCategory, AdminCustomerListItem, AdminProduct, Coupon, Promotion } from '@/types';
import { PageHeader, AdminTable, Panel } from '@/components/admin/AdminUI';
import { Pill } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { formatDateShort, formatPrice, formatZip } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'Active', label: 'Ativos' },
  { value: 'Inactive', label: 'Inativos' },
  { value: 'Archived', label: 'Arquivados' },
];

const DISCOUNT_TYPES = [
  { value: 'Percentage', label: 'Percentual' },
  { value: 'FixedAmount', label: 'Valor fixo' },
  { value: 'FreeShipping', label: 'Frete grátis' },
];

const SCOPE_TYPES = [
  { value: 'Order', label: 'Pedido inteiro' },
  { value: 'Shipping', label: 'Frete' },
  { value: 'Category', label: 'Categoria' },
  { value: 'Product', label: 'Produto' },
  { value: 'ProductVariant', label: 'SKU / variação' },
];

const USAGE_STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'Reserved', label: 'Reservados' },
  { value: 'Consumed', label: 'Consumidos' },
  { value: 'Released', label: 'Liberados' },
  { value: 'Expired', label: 'Expirados' },
];

type CommerceAction =
  | { kind: 'coupon'; id: string; label: string; action: 'activate' | 'deactivate' | 'archive' }
  | { kind: 'promotion'; id: string; label: string; action: 'activate' | 'deactivate' | 'archive' };

type CouponFormState = {
  code: string;
  name: string;
  description: string;
  type: string;
  discountValue: string;
  maxDiscountValue: string;
  minimumOrderValue: string;
  startsAt: string;
  endsAt: string;
  totalUsageLimit: string;
  usageLimitPerCustomer: string;
  isFirstPurchaseOnly: boolean;
  isPrivate: boolean;
  canApplyToPromotionalItems: boolean;
  scopes: AdminCouponScopeInput[];
  allowedCustomerUserIds: string;
};

type PromotionFormState = {
  name: string;
  description: string;
  type: string;
  discountValue: string;
  minimumOrderValue: string;
  startsAt: string;
  endsAt: string;
  scopes: AdminCouponScopeInput[];
};

const nowForInput = () => new Date().toISOString().slice(0, 16);
const defaultScope = (): AdminCouponScopeInput => ({ scopeType: 'Order', isExcluded: false });

function emptyCouponForm(): CouponFormState {
  return {
    code: '',
    name: '',
    description: '',
    type: 'Percentage',
    discountValue: '',
    maxDiscountValue: '',
    minimumOrderValue: '',
    startsAt: nowForInput(),
    endsAt: '',
    totalUsageLimit: '',
    usageLimitPerCustomer: '1',
    isFirstPurchaseOnly: false,
    isPrivate: false,
    canApplyToPromotionalItems: false,
    scopes: [defaultScope()],
    allowedCustomerUserIds: '',
  };
}

function emptyPromotionForm(): PromotionFormState {
  return {
    name: '',
    description: '',
    type: 'Percentage',
    discountValue: '',
    minimumOrderValue: '',
    startsAt: nowForInput(),
    endsAt: '',
    scopes: [defaultScope()],
  };
}

function centsFromMoney(value: string): number {
  const normalized = value.replace(/\./g, '').replace(',', '.').trim();
  return Math.round(Number(normalized || 0) * 100);
}

function amountFromForm(type: string, value: string): number {
  if (type === 'Percentage') return Number(value.replace(',', '.') || 0);
  if (type === 'FreeShipping') return 0;
  return centsFromMoney(value);
}

function discountLabel(type?: string, value?: number) {
  if (type === 'Percentage' || type === 'percent') return `${value ?? 0}%`;
  if (type === 'FreeShipping') return 'Frete grátis';
  return formatPrice(value ?? 0);
}

function normalizeDiscountType(type?: string) {
  if (type === 'percent') return 'Percentage';
  if (type === 'fixed') return 'FixedAmount';
  return type || 'Percentage';
}

function moneyToForm(cents?: number) {
  if (cents == null) return '';
  return (cents / 100).toFixed(2).replace('.', ',');
}

function discountToForm(type: string | undefined, value?: number) {
  const normalized = normalizeDiscountType(type);
  if (normalized === 'FreeShipping') return '0';
  if (normalized === 'Percentage') return value != null ? String(value).replace('.', ',') : '';
  return moneyToForm(value);
}

function toInputDate(iso?: string) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function requiresScopeTarget(scopeType: string) {
  return scopeType === 'Category' || scopeType === 'Product' || scopeType === 'ProductVariant';
}

function normalizeScopes(scopes: AdminCouponScopeInput[] | undefined): AdminCouponScopeInput[] {
  if (!scopes?.length) return [defaultScope()];
  return scopes.map((scope) => ({
    scopeType: scope.scopeType,
    targetId: requiresScopeTarget(scope.scopeType) ? scope.targetId : undefined,
    isExcluded: scope.isExcluded,
  }));
}

function parseCustomerIds(value: string): string[] {
  return value.split(/[,\s;]+/).map((id) => id.trim()).filter(Boolean);
}

function couponToForm(coupon: Coupon): CouponFormState {
  const type = normalizeDiscountType(coupon.type);

  return {
    code: coupon.code,
    name: coupon.name || coupon.code,
    description: coupon.description || '',
    type,
    discountValue: discountToForm(type, coupon.value),
    maxDiscountValue: moneyToForm(coupon.maxDiscountValueCents),
    minimumOrderValue: moneyToForm(coupon.minimumOrderValueCents),
    startsAt: toInputDate(coupon.startsAt) || nowForInput(),
    endsAt: toInputDate(coupon.expiresAt),
    totalUsageLimit: coupon.usageLimit != null ? String(coupon.usageLimit) : '',
    usageLimitPerCustomer: String(coupon.usageLimitPerCustomer ?? 1),
    isFirstPurchaseOnly: !!coupon.isFirstPurchaseOnly,
    isPrivate: !!coupon.isPrivate,
    canApplyToPromotionalItems: !!coupon.canApplyToPromotionalItems,
    scopes: normalizeScopes(coupon.scopes),
    allowedCustomerUserIds: coupon.allowedCustomerUserIds?.join(', ') ?? '',
  };
}

function promotionToForm(promotion: Promotion): PromotionFormState {
  const type = normalizeDiscountType(promotion.type || 'Percentage');

  return {
    name: promotion.name,
    description: promotion.description || '',
    type,
    discountValue: discountToForm(type, promotion.discountValue ?? promotion.discountPct),
    minimumOrderValue: moneyToForm(promotion.minimumOrderValueCents),
    startsAt: toInputDate(promotion.startsAt) || nowForInput(),
    endsAt: toInputDate(promotion.endsAt),
    scopes: normalizeScopes(promotion.scopes),
  };
}

function couponInputFromForm(form: CouponFormState): AdminCouponInput {
  return {
    code: form.code,
    name: form.name,
    description: form.description,
    type: form.type,
    discountValueCents: amountFromForm(form.type, form.discountValue),
    maxDiscountValueCents: form.maxDiscountValue ? centsFromMoney(form.maxDiscountValue) : undefined,
    minimumOrderValueCents: form.minimumOrderValue ? centsFromMoney(form.minimumOrderValue) : undefined,
    startsAt: new Date(form.startsAt).toISOString(),
    endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
    totalUsageLimit: form.totalUsageLimit ? Number(form.totalUsageLimit) : undefined,
    usageLimitPerCustomer: Number(form.usageLimitPerCustomer || 1),
    isFirstPurchaseOnly: form.isFirstPurchaseOnly,
    isPrivate: form.isPrivate,
    canApplyToPromotionalItems: form.canApplyToPromotionalItems,
    scopes: normalizeScopes(form.scopes),
    allowedCustomerUserIds: form.isPrivate ? parseCustomerIds(form.allowedCustomerUserIds) : [],
  };
}

function promotionInputFromForm(form: PromotionFormState): AdminPromotionInput {
  return {
    name: form.name,
    description: form.description,
    type: form.type,
    discountValueCents: amountFromForm(form.type, form.discountValue),
    minimumOrderValueCents: form.minimumOrderValue ? centsFromMoney(form.minimumOrderValue) : undefined,
    startsAt: new Date(form.startsAt).toISOString(),
    endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
    scopes: normalizeScopes(form.scopes),
  };
}

function statusPill(status?: string, active?: boolean) {
  const resolved = status ?? (active ? 'Active' : 'Inactive');
  if (resolved === 'Active') return <Pill tone="success">Ativo</Pill>;
  if (resolved === 'Archived') return <Pill tone="neutral">Arquivado</Pill>;
  return <Pill tone="warning">Inativo</Pill>;
}

function scopeLabel(scope: AdminCouponScopeInput, categories: AdminCatalogCategory[], products: AdminProduct[]) {
  const typeLabel = SCOPE_TYPES.find((item) => item.value === scope.scopeType)?.label ?? scope.scopeType;
  if (!scope.targetId) return typeLabel;

  if (scope.scopeType === 'Category') {
    const category = categories.find((item) => item.id === scope.targetId);
    return `${typeLabel}: ${category?.name ?? scope.targetId}`;
  }

  if (scope.scopeType === 'Product') {
    const product = products.find((item) => item.id === scope.targetId);
    return `${typeLabel}: ${product?.name ?? scope.targetId}`;
  }

  if (scope.scopeType === 'ProductVariant') {
    const product = products.find((item) => item.variants.some((variant) => variant.id === scope.targetId));
    const variant = product?.variants.find((item) => item.id === scope.targetId);
    return `${typeLabel}: ${variant?.sku ?? scope.targetId}${product ? ` · ${product.name}` : ''}`;
  }

  return typeLabel;
}

function ScopeEditor({
  value,
  onChange,
  categories,
  products,
}: {
  value: AdminCouponScopeInput[];
  onChange: (next: AdminCouponScopeInput[]) => void;
  categories: AdminCatalogCategory[];
  products: AdminProduct[];
}) {
  const variantOptions = useMemo(() => products.flatMap((product) => product.variants.map((variant) => ({
    id: variant.id,
    label: `${variant.sku} · ${product.name}${variant.name ? ` · ${variant.name}` : ''}`,
  }))), [products]);

  const updateScope = (index: number, patch: Partial<AdminCouponScopeInput>) => {
    onChange(value.map((scope, scopeIndex) => scopeIndex === index ? { ...scope, ...patch } : scope));
  };

  const removeScope = (index: number) => {
    const next = value.filter((_, scopeIndex) => scopeIndex !== index);
    onChange(next.length ? next : [defaultScope()]);
  };

  const targetOptions = (scopeType: string) => {
    if (scopeType === 'Category') return categories.map((category) => ({ id: category.id, label: category.name }));
    if (scopeType === 'Product') return products.map((product) => ({ id: product.id, label: product.name }));
    if (scopeType === 'ProductVariant') return variantOptions;
    return [];
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-graphite">Abrangência</p>
          <p className="text-xs text-graphite-soft">Defina onde aplica e o que deve ser excluído.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => onChange([...value, defaultScope()])}>
          <Plus size={15} /> Regra
        </Button>
      </div>

      {value.map((scope, index) => {
        const options = targetOptions(scope.scopeType);
        const needsTarget = requiresScopeTarget(scope.scopeType);

        return (
          <div key={`${scope.scopeType}-${index}`} className="rounded-[var(--radius-md)] border border-border/70 p-3">
            <div className="grid gap-3 lg:grid-cols-[1fr_1.25fr_150px_auto]">
              <Field label="Tipo">
                {(id, describedBy) => (
                  <Select
                    id={id}
                    aria-describedby={describedBy}
                    value={scope.scopeType}
                    onChange={(event) => updateScope(index, { scopeType: event.target.value, targetId: undefined })}
                  >
                    {SCOPE_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </Select>
                )}
              </Field>

              <Field label="Alvo">
                {(id, describedBy) => needsTarget ? (
                  <Select
                    id={id}
                    aria-describedby={describedBy}
                    value={scope.targetId ?? ''}
                    onChange={(event) => updateScope(index, { targetId: event.target.value })}
                  >
                    <option value="">Selecione</option>
                    {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                  </Select>
                ) : (
                  <Input id={id} aria-describedby={describedBy} value="Sem alvo específico" disabled />
                )}
              </Field>

              <Field label="Regra">
                {(id, describedBy) => (
                  <Select
                    id={id}
                    aria-describedby={describedBy}
                    value={scope.isExcluded ? 'exclude' : 'include'}
                    onChange={(event) => updateScope(index, { isExcluded: event.target.value === 'exclude' })}
                  >
                    <option value="include">Incluir</option>
                    <option value="exclude">Excluir</option>
                  </Select>
                )}
              </Field>

              <div className="flex items-end">
                <Button size="sm" variant="ghost" onClick={() => removeScope(index)} aria-label="Remover regra">
                  <Trash size={16} />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border/70 p-3">
      <p className="text-xs text-graphite-soft">{label}</p>
      <p className="mt-1 text-lg font-semibold text-graphite">{value}</p>
    </div>
  );
}

function PromotionReportBlock({ report }: { report?: AdminPromotionReport }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <MetricBox label="Status do relatório" value={report?.status ?? '-'} />
        <MetricBox label="Janela de validade" value={report ? (report.isCurrentlyEligibleByDate ? 'Elegível' : 'Fora da janela') : '-'} />
      </div>
      {report?.message && <p className="rounded-[var(--radius-md)] bg-cream-light px-3 py-2 text-xs text-graphite-soft">{report.message}</p>}
    </div>
  );
}

export function AdminCoupons() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [usageStatus, setUsageStatus] = useState('');
  const [selectedCouponId, setSelectedCouponId] = useState<string | undefined>();
  const [editingCouponId, setEditingCouponId] = useState<string | undefined>();
  const [reason, setReason] = useState('');
  const [pendingAction, setPendingAction] = useState<CommerceAction | null>(null);
  const [form, setForm] = useState<CouponFormState>(() => emptyCouponForm());

  const filters = { search: search.trim() || undefined, status: status || undefined, page: 1, pageSize: 20 };
  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.admin.coupons, filters] as const,
    queryFn: () => adminService.listCoupons(filters),
  });
  const detailQuery = useQuery({
    queryKey: queryKeys.admin.coupon(selectedCouponId ?? ''),
    queryFn: () => adminService.getCoupon(selectedCouponId!),
    enabled: !!selectedCouponId,
  });
  const usageFilters = { status: usageStatus || undefined, page: 1, pageSize: 10 };
  const usagesQuery = useQuery({
    queryKey: queryKeys.admin.couponUsages(selectedCouponId ?? '', usageFilters),
    queryFn: () => adminService.listCouponUsages(selectedCouponId!, usageFilters),
    enabled: !!selectedCouponId,
  });
  const reportQuery = useQuery({
    queryKey: queryKeys.admin.couponDetailReport(selectedCouponId ?? ''),
    queryFn: () => adminService.getCouponReport(selectedCouponId!),
    enabled: !!selectedCouponId,
  });
  const categoriesQuery = useQuery({
    queryKey: queryKeys.admin.categories,
    queryFn: () => adminService.listAdminCategories(),
  });
  const productsQuery = useQuery({
    queryKey: [...queryKeys.admin.products, { page: 1, pageSize: 100, context: 'coupon-scopes' }] as const,
    queryFn: () => adminService.listAdminProducts({ page: 1, pageSize: 100 }),
  });

  const invalidateCouponQueries = (id?: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.coupons });
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.couponReport });
    if (!id) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.coupon(id) });
    queryClient.invalidateQueries({ queryKey: ['admin', 'coupons', id, 'usages'] });
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.couponDetailReport(id) });
  };

  const saveCoupon = useMutation({
    mutationFn: (input: { id?: string; data: AdminCouponInput }) => (
      input.id ? adminService.updateCoupon(input.id, input.data) : adminService.createCoupon(input.data)
    ),
    onSuccess: (coupon) => {
      toast.success(editingCouponId ? 'Cupom atualizado.' : 'Cupom criado como inativo.');
      setSelectedCouponId(coupon.id);
      setEditingCouponId(undefined);
      setForm(emptyCouponForm());
      invalidateCouponQueries(coupon.id);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Nao foi possivel salvar o cupom.'),
  });

  const startEditCoupon = (coupon: Coupon) => {
    setEditingCouponId(coupon.id);
    setSelectedCouponId(coupon.id);
    setForm(couponToForm(coupon));
  };

  const cancelEditCoupon = () => {
    setEditingCouponId(undefined);
    setForm(emptyCouponForm());
  };

  const couponAction = useMutation({
    mutationFn: (input: { action: CommerceAction; reason: string }) => {
      if (input.action.action === 'archive') return adminService.archiveCoupon(input.action.id, input.reason);
      return adminService.updateCouponStatus(input.action.id, input.action.action === 'activate' ? 'Active' : 'Inactive', input.reason);
    },
    onSuccess: (coupon) => {
      toast.success('Cupom atualizado com auditoria.');
      setPendingAction(null);
      setReason('');
      invalidateCouponQueries(coupon.id);
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.audit });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Nao foi possivel atualizar o cupom.'),
  });

  const submitCoupon = () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Informe código e nome do cupom.');
      return;
    }

    if (!form.startsAt) {
      toast.error('Informe a data de início.');
      return;
    }

    if (form.type !== 'FreeShipping' && amountFromForm(form.type, form.discountValue) <= 0) {
      toast.error('Informe um desconto válido.');
      return;
    }

    if (form.scopes.some((scope) => requiresScopeTarget(scope.scopeType) && !scope.targetId)) {
      toast.error('Selecione o alvo de todas as regras de abrangência.');
      return;
    }

    if (form.isPrivate && parseCustomerIds(form.allowedCustomerUserIds).length === 0) {
      toast.error('Cupom privado precisa de pelo menos um ID de cliente autorizado.');
      return;
    }

    saveCoupon.mutate({ id: editingCouponId, data: couponInputFromForm(form) });
  };

  const confirmAction = () => {
    if (!pendingAction || reason.trim().length < 10) {
      toast.error('Informe uma justificativa com pelo menos 10 caracteres.');
      return;
    }

    couponAction.mutate({ action: pendingAction, reason });
  };

  const coupons = data ?? [];
  const selectedCoupon = detailQuery.data ?? coupons.find((coupon) => coupon.id === selectedCouponId);
  const categories = categoriesQuery.data ?? [];
  const products = productsQuery.data ?? [];
  const couponReport = reportQuery.data;

  return (
    <div>
      <PageHeader title="Cupons" subtitle="Descontos aplicados apenas no checkout, com auditoria de status e arquivamento." />

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <Panel title="Cupons cadastrados">
          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_190px]">
            <Field label="Buscar">
              {(id, describedBy) => (
                <Input id={id} aria-describedby={describedBy} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Código ou nome" />
              )}
            </Field>
            <Field label="Status">
              {(id, describedBy) => (
                <Select id={id} aria-describedby={describedBy} value={status} onChange={(event) => setStatus(event.target.value)}>
                  {STATUS_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
                </Select>
              )}
            </Field>
          </div>

          {isLoading ? <Skeleton className="h-64 w-full rounded-[var(--radius-lg)]" /> : (
            <AdminTable<Coupon>
              rowKey={(c) => c.id}
              rows={coupons}
              empty="Nenhum cupom encontrado."
              columns={[
                { key: 'code', header: 'Código', render: (c) => <div><p className="font-mono font-medium">{c.code}</p><p className="text-xs text-graphite-soft">{c.name || c.description}</p></div> },
                { key: 'value', header: 'Desconto', render: (c) => discountLabel(c.type, c.value) },
                { key: 'min', header: 'Mínimo', render: (c) => c.minimumOrderValueCents ? formatPrice(c.minimumOrderValueCents) : '-' },
                { key: 'usage', header: 'Limite', render: (c) => c.usageLimit ? `${c.usageLimit} usos` : 'Sem limite' },
                { key: 'expires', header: 'Validade', render: (c) => c.expiresAt ? formatDateShort(c.expiresAt) : '-' },
                { key: 'status', header: 'Status', render: (c) => statusPill(c.status, c.active) },
                { key: 'actions', header: 'Ações', render: (c) => c.status === 'Archived' ? '-' : (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSelectedCouponId(c.id)}>
                      <Eye size={15} /> Detalhe
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => startEditCoupon(c)}>
                      <PencilSimple size={15} /> Editar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setPendingAction({ kind: 'coupon', id: c.id, label: c.code, action: c.active ? 'deactivate' : 'activate' })}>
                      {c.active ? 'Inativar' : 'Ativar'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setPendingAction({ kind: 'coupon', id: c.id, label: c.code, action: 'archive' })}>
                      Arquivar
                    </Button>
                  </div>
                ) },
              ]}
            />
          )}
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel title={editingCouponId ? 'Editar cupom' : 'Novo cupom'}>
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Código" required>{(id, describedBy) => <Input id={id} aria-describedby={describedBy} value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} />}</Field>
                <Field label="Nome" required>{(id, describedBy) => <Input id={id} aria-describedby={describedBy} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />}</Field>
              </div>
              <Field label="Descrição">{(id, describedBy) => <Input id={id} aria-describedby={describedBy} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />}</Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Tipo">{(id, describedBy) => (
                  <Select id={id} aria-describedby={describedBy} value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value, discountValue: event.target.value === 'FreeShipping' ? '0' : current.discountValue }))}>
                    {DISCOUNT_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </Select>
                )}</Field>
                <Field label={form.type === 'Percentage' ? 'Percentual' : 'Valor'}>
                  {(id, describedBy) => <Input id={id} aria-describedby={describedBy} value={form.discountValue} disabled={form.type === 'FreeShipping'} onChange={(event) => setForm((current) => ({ ...current, discountValue: event.target.value }))} />}
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Pedido mínimo">{(id, describedBy) => <Input id={id} aria-describedby={describedBy} value={form.minimumOrderValue} onChange={(event) => setForm((current) => ({ ...current, minimumOrderValue: event.target.value }))} />}</Field>
                <Field label="Limite total">{(id, describedBy) => <Input id={id} aria-describedby={describedBy} type="number" min={1} value={form.totalUsageLimit} onChange={(event) => setForm((current) => ({ ...current, totalUsageLimit: event.target.value }))} />}</Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Início">{(id, describedBy) => <Input id={id} aria-describedby={describedBy} type="datetime-local" value={form.startsAt} onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))} />}</Field>
                <Field label="Fim">{(id, describedBy) => <Input id={id} aria-describedby={describedBy} type="datetime-local" value={form.endsAt} onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))} />}</Field>
              </div>
              <div className="space-y-2 text-sm text-graphite">
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.isFirstPurchaseOnly} onChange={(event) => setForm((current) => ({ ...current, isFirstPurchaseOnly: event.target.checked }))} /> Apenas primeira compra</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.canApplyToPromotionalItems} onChange={(event) => setForm((current) => ({ ...current, canApplyToPromotionalItems: event.target.checked }))} /> Aplicar em itens promocionais</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.isPrivate} onChange={(event) => setForm((current) => ({ ...current, isPrivate: event.target.checked }))} /> Cupom privado</label>
              </div>

              {form.isPrivate && (
                <Field label="Clientes autorizados" hint="Informe IDs de usuários separados por vírgula, espaço ou quebra de linha.">
                  {(id, describedBy) => <Textarea id={id} aria-describedby={describedBy} value={form.allowedCustomerUserIds} onChange={(event) => setForm((current) => ({ ...current, allowedCustomerUserIds: event.target.value }))} />}
                </Field>
              )}

              <ScopeEditor
                value={form.scopes}
                onChange={(scopes) => setForm((current) => ({ ...current, scopes }))}
                categories={categories}
                products={products}
              />

              <div className="flex flex-wrap gap-2">
                <Button loading={saveCoupon.isPending} onClick={submitCoupon}>
                  <Plus size={16} /> {editingCouponId ? 'Salvar cupom' : 'Criar cupom'}
                </Button>
                {editingCouponId && <Button variant="ghost" onClick={cancelEditCoupon}>Cancelar edição</Button>}
              </div>
            </div>
          </Panel>

          <Panel title={selectedCoupon ? 'Detalhe do cupom' : 'Cupom'}>
            {!selectedCouponId ? (
              <div className="flex items-start gap-3 text-sm leading-6 text-graphite-soft">
                <ChartBar size={21} className="mt-0.5 text-cinnamon" />
                <p>Selecione um cupom para consultar regras, uso e relatório.</p>
              </div>
            ) : detailQuery.isLoading ? (
              <Skeleton className="h-64 w-full rounded-[var(--radius-lg)]" />
            ) : selectedCoupon ? (
              <div className="space-y-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono font-semibold text-graphite">{selectedCoupon.code}</p>
                    <p className="text-xs text-graphite-soft">{selectedCoupon.description}</p>
                  </div>
                  {statusPill(selectedCoupon.status, selectedCoupon.active)}
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <MetricBox label="Reservas" value={String(couponReport?.reservedCount ?? '-')} />
                  <MetricBox label="Consumidos" value={String(couponReport?.consumedCount ?? selectedCoupon.usageCount)} />
                  <MetricBox label="Desconto total" value={couponReport ? formatPrice(couponReport.discountTotalCents) : '-'} />
                </div>

                <div className="grid gap-2">
                  <DetailRow label="Desconto" value={discountLabel(selectedCoupon.type, selectedCoupon.value)} />
                  <DetailRow label="Pedido mínimo" value={selectedCoupon.minimumOrderValueCents ? formatPrice(selectedCoupon.minimumOrderValueCents) : undefined} />
                  <DetailRow label="Teto do desconto" value={selectedCoupon.maxDiscountValueCents ? formatPrice(selectedCoupon.maxDiscountValueCents) : undefined} />
                  <DetailRow label="Validade" value={`${selectedCoupon.startsAt ? formatDateShort(selectedCoupon.startsAt) : '-'} até ${selectedCoupon.expiresAt ? formatDateShort(selectedCoupon.expiresAt) : 'sem fim'}`} />
                  <DetailRow label="Atualizado em" value={selectedCoupon.updatedAt ? formatDateShort(selectedCoupon.updatedAt) : undefined} />
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedCoupon.isFirstPurchaseOnly && <Pill tone="neutral">Primeira compra</Pill>}
                  {selectedCoupon.isPrivate && <Pill tone="warning">Privado</Pill>}
                  {selectedCoupon.canApplyToPromotionalItems && <Pill tone="neutral">Aceita itens promocionais</Pill>}
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-graphite-soft">Abrangência</p>
                  <div className="flex flex-wrap gap-2">
                    {normalizeScopes(selectedCoupon.scopes).map((scope, index) => (
                      <Pill key={`${scope.scopeType}-${scope.targetId ?? index}`} tone={scope.isExcluded ? 'warning' : 'neutral'}>
                        {scope.isExcluded ? 'Exceto ' : ''}{scopeLabel(scope, categories, products)}
                      </Pill>
                    ))}
                  </div>
                </div>

                {selectedCoupon.isPrivate && (
                  <DetailRow label="Clientes autorizados" value={selectedCoupon.allowedCustomerUserIds?.join(', ') || undefined} />
                )}

                <div className="space-y-3">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <p className="font-medium text-graphite">Usos recentes</p>
                    <Field label="Status" className="min-w-[180px]">
                      {(id, describedBy) => (
                        <Select id={id} aria-describedby={describedBy} value={usageStatus} onChange={(event) => setUsageStatus(event.target.value)}>
                          {USAGE_STATUS_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
                        </Select>
                      )}
                    </Field>
                  </div>
                  {usagesQuery.isLoading ? <Skeleton className="h-36 w-full rounded-[var(--radius-lg)]" /> : (
                    <AdminTable<AdminCouponUsage>
                      rowKey={(usage) => usage.id}
                      rows={usagesQuery.data ?? []}
                      empty="Nenhum uso encontrado."
                      columns={[
                        { key: 'status', header: 'Status', render: (usage) => usage.status },
                        { key: 'user', header: 'Cliente', render: (usage) => `#${usage.userId}` },
                        { key: 'discount', header: 'Desconto', render: (usage) => formatPrice(usage.discountTotalCents + usage.shippingDiscountCents) },
                        { key: 'total', header: 'Total final', render: (usage) => formatPrice(usage.totalAfterDiscountCents) },
                        { key: 'reserved', header: 'Reserva', render: (usage) => formatDateShort(usage.reservedAt) },
                      ]}
                    />
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-graphite-soft">Cupom não encontrado.</p>
            )}
          </Panel>

          <Panel title="Ação com auditoria">
            {pendingAction?.kind === 'coupon' ? (
              <div className="space-y-4">
                <p className="text-sm text-graphite-soft">Ação em <strong className="text-graphite">{pendingAction.label}</strong>.</p>
                <Field label="Justificativa" required>{(id, describedBy) => <Textarea id={id} aria-describedby={describedBy} value={reason} onChange={(event) => setReason(event.target.value)} />}</Field>
                <Button fullWidth variant={pendingAction.action === 'archive' ? 'danger' : 'primary'} loading={couponAction.isPending} onClick={confirmAction}>
                  Confirmar
                </Button>
              </div>
            ) : (
              <p className="text-sm text-graphite-soft">Selecione uma ação em um cupom para registrar o motivo.</p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

export function AdminPromotions() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selectedPromotionId, setSelectedPromotionId] = useState<string | undefined>();
  const [editingPromotionId, setEditingPromotionId] = useState<string | undefined>();
  const [reason, setReason] = useState('');
  const [pendingAction, setPendingAction] = useState<CommerceAction | null>(null);
  const [form, setForm] = useState<PromotionFormState>(() => emptyPromotionForm());

  const filters = { search: search.trim() || undefined, status: status || undefined, page: 1, pageSize: 20 };
  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.admin.promotions, filters] as const,
    queryFn: () => adminService.listPromotions(filters),
  });
  const detailQuery = useQuery({
    queryKey: queryKeys.admin.promotion(selectedPromotionId ?? ''),
    queryFn: () => adminService.getPromotion(selectedPromotionId!),
    enabled: !!selectedPromotionId,
  });
  const reportQuery = useQuery({
    queryKey: queryKeys.admin.promotionDetailReport(selectedPromotionId ?? ''),
    queryFn: () => adminService.getPromotionReport(selectedPromotionId!),
    enabled: !!selectedPromotionId,
  });
  const categoriesQuery = useQuery({
    queryKey: queryKeys.admin.categories,
    queryFn: () => adminService.listAdminCategories(),
  });
  const productsQuery = useQuery({
    queryKey: [...queryKeys.admin.products, { page: 1, pageSize: 100, context: 'promotion-scopes' }] as const,
    queryFn: () => adminService.listAdminProducts({ page: 1, pageSize: 100 }),
  });

  const invalidatePromotionQueries = (id?: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.promotions });
    if (!id) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.promotion(id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.promotionDetailReport(id) });
  };

  const savePromotion = useMutation({
    mutationFn: (input: { id?: string; data: AdminPromotionInput }) => (
      input.id ? adminService.updatePromotion(input.id, input.data) : adminService.createPromotion(input.data)
    ),
    onSuccess: (promotion) => {
      toast.success(editingPromotionId ? 'Promoção atualizada.' : 'Promoção criada como inativa.');
      setSelectedPromotionId(promotion.id);
      setEditingPromotionId(undefined);
      setForm(emptyPromotionForm());
      invalidatePromotionQueries(promotion.id);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Nao foi possivel salvar a promoção.'),
  });

  const promotionAction = useMutation({
    mutationFn: (input: { action: CommerceAction; reason: string }) => {
      if (input.action.action === 'archive') return adminService.archivePromotion(input.action.id, input.reason);
      return adminService.updatePromotionStatus(input.action.id, input.action.action === 'activate' ? 'Active' : 'Inactive', input.reason);
    },
    onSuccess: (promotion) => {
      toast.success('Promoção atualizada com auditoria.');
      setPendingAction(null);
      setReason('');
      invalidatePromotionQueries(promotion.id);
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.audit });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Nao foi possivel atualizar a promoção.'),
  });

  const startEditPromotion = (promotion: Promotion) => {
    setEditingPromotionId(promotion.id);
    setSelectedPromotionId(promotion.id);
    setForm(promotionToForm(promotion));
  };

  const cancelEditPromotion = () => {
    setEditingPromotionId(undefined);
    setForm(emptyPromotionForm());
  };

  const submitPromotion = () => {
    if (!form.name.trim()) {
      toast.error('Informe o nome da promoção.');
      return;
    }

    if (!form.startsAt) {
      toast.error('Informe a data de início.');
      return;
    }

    if (form.type !== 'FreeShipping' && amountFromForm(form.type, form.discountValue) <= 0) {
      toast.error('Informe um desconto válido.');
      return;
    }

    if (form.scopes.some((scope) => requiresScopeTarget(scope.scopeType) && !scope.targetId)) {
      toast.error('Selecione o alvo de todas as regras de abrangência.');
      return;
    }

    savePromotion.mutate({ id: editingPromotionId, data: promotionInputFromForm(form) });
  };

  const confirmAction = () => {
    if (!pendingAction || reason.trim().length < 10) {
      toast.error('Informe uma justificativa com pelo menos 10 caracteres.');
      return;
    }

    promotionAction.mutate({ action: pendingAction, reason });
  };

  const promotions = data ?? [];
  const selectedPromotion = detailQuery.data ?? promotions.find((promotion) => promotion.id === selectedPromotionId);
  const categories = categoriesQuery.data ?? [];
  const products = productsQuery.data ?? [];
  const promotionReport = reportQuery.data;

  return (
    <div>
      <PageHeader title="Promoções" subtitle="Campanhas automáticas validadas pelo backend." />

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <Panel title="Promoções cadastradas">
          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_190px]">
            <Field label="Buscar">
              {(id, describedBy) => (
                <Input id={id} aria-describedby={describedBy} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome da promoção" />
              )}
            </Field>
            <Field label="Status">
              {(id, describedBy) => (
                <Select id={id} aria-describedby={describedBy} value={status} onChange={(event) => setStatus(event.target.value)}>
                  {STATUS_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
                </Select>
              )}
            </Field>
          </div>

          {isLoading ? <Skeleton className="h-48 w-full rounded-[var(--radius-lg)]" /> : (
            <div className="grid gap-4 sm:grid-cols-2">
              {promotions.map((p: Promotion) => (
                <Panel key={p.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-graphite">{p.name}</h3>
                      <p className="text-sm text-graphite-soft">{discountLabel(p.type, p.discountValue ?? p.discountPct)}</p>
                    </div>
                    {statusPill(p.status, p.active)}
                  </div>
                  <p className="mt-3 text-xs text-graphite-soft">{formatDateShort(p.startsAt)} → {p.endsAt ? formatDateShort(p.endsAt) : 'sem fim'}</p>
                  {p.minimumOrderValueCents ? <p className="mt-2 text-xs text-graphite-soft">Pedido mínimo: {formatPrice(p.minimumOrderValueCents)}</p> : null}
                  {p.status !== 'Archived' && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setSelectedPromotionId(p.id)}>
                        <Eye size={15} /> Detalhe
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => startEditPromotion(p)}>
                        <PencilSimple size={15} /> Editar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setPendingAction({ kind: 'promotion', id: p.id, label: p.name, action: p.active ? 'deactivate' : 'activate' })}>
                        {p.active ? 'Inativar' : 'Ativar'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setPendingAction({ kind: 'promotion', id: p.id, label: p.name, action: 'archive' })}>
                        Arquivar
                      </Button>
                    </div>
                  )}
                </Panel>
              ))}
              {promotions.length === 0 && <p className="text-sm text-graphite-soft">Nenhuma promoção encontrada.</p>}
            </div>
          )}
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel title={editingPromotionId ? 'Editar promoção' : 'Nova promoção'}>
            <div className="space-y-4">
              <Field label="Nome" required>{(id, describedBy) => <Input id={id} aria-describedby={describedBy} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />}</Field>
              <Field label="Descrição">{(id, describedBy) => <Input id={id} aria-describedby={describedBy} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />}</Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Tipo">{(id, describedBy) => (
                  <Select id={id} aria-describedby={describedBy} value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value, discountValue: event.target.value === 'FreeShipping' ? '0' : current.discountValue }))}>
                    {DISCOUNT_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </Select>
                )}</Field>
                <Field label={form.type === 'Percentage' ? 'Percentual' : 'Valor'}>
                  {(id, describedBy) => <Input id={id} aria-describedby={describedBy} value={form.discountValue} disabled={form.type === 'FreeShipping'} onChange={(event) => setForm((current) => ({ ...current, discountValue: event.target.value }))} />}
                </Field>
              </div>
              <Field label="Pedido mínimo">{(id, describedBy) => <Input id={id} aria-describedby={describedBy} value={form.minimumOrderValue} onChange={(event) => setForm((current) => ({ ...current, minimumOrderValue: event.target.value }))} />}</Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Início">{(id, describedBy) => <Input id={id} aria-describedby={describedBy} type="datetime-local" value={form.startsAt} onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))} />}</Field>
                <Field label="Fim">{(id, describedBy) => <Input id={id} aria-describedby={describedBy} type="datetime-local" value={form.endsAt} onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))} />}</Field>
              </div>
              <ScopeEditor
                value={form.scopes}
                onChange={(scopes) => setForm((current) => ({ ...current, scopes }))}
                categories={categories}
                products={products}
              />
              <div className="flex flex-wrap gap-2">
                <Button loading={savePromotion.isPending} onClick={submitPromotion}>
                  <Plus size={16} /> {editingPromotionId ? 'Salvar promoção' : 'Criar promoção'}
                </Button>
                {editingPromotionId && <Button variant="ghost" onClick={cancelEditPromotion}>Cancelar edição</Button>}
              </div>
            </div>
          </Panel>

          <Panel title={selectedPromotion ? 'Detalhe da promoção' : 'Promoção'}>
            {!selectedPromotionId ? (
              <div className="flex items-start gap-3 text-sm leading-6 text-graphite-soft">
                <ChartBar size={21} className="mt-0.5 text-cinnamon" />
                <p>Selecione uma promoção para consultar validade, relatório e regras de aplicação.</p>
              </div>
            ) : detailQuery.isLoading ? (
              <Skeleton className="h-52 w-full rounded-[var(--radius-lg)]" />
            ) : selectedPromotion ? (
              <div className="space-y-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-graphite">{selectedPromotion.name}</p>
                    <p className="text-xs text-graphite-soft">{selectedPromotion.description || 'Promoção automática'}</p>
                  </div>
                  {statusPill(selectedPromotion.status, selectedPromotion.active)}
                </div>

                <PromotionReportBlock report={promotionReport} />

                <div className="grid gap-2">
                  <DetailRow label="Desconto" value={discountLabel(selectedPromotion.type, selectedPromotion.discountValue ?? selectedPromotion.discountPct)} />
                  <DetailRow label="Pedido mínimo" value={selectedPromotion.minimumOrderValueCents ? formatPrice(selectedPromotion.minimumOrderValueCents) : undefined} />
                  <DetailRow label="Validade" value={`${formatDateShort(selectedPromotion.startsAt)} até ${selectedPromotion.endsAt ? formatDateShort(selectedPromotion.endsAt) : 'sem fim'}`} />
                  <DetailRow label="Atualizado em" value={selectedPromotion.updatedAt ? formatDateShort(selectedPromotion.updatedAt) : undefined} />
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-graphite-soft">Abrangência</p>
                  <div className="flex flex-wrap gap-2">
                    {normalizeScopes(selectedPromotion.scopes).map((scope, index) => (
                      <Pill key={`${scope.scopeType}-${scope.targetId ?? index}`} tone={scope.isExcluded ? 'warning' : 'neutral'}>
                        {scope.isExcluded ? 'Exceto ' : ''}{scopeLabel(scope, categories, products)}
                      </Pill>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-graphite-soft">Promoção não encontrada.</p>
            )}
          </Panel>

          <Panel title="Ação com auditoria">
            {pendingAction?.kind === 'promotion' ? (
              <div className="space-y-4">
                <p className="text-sm text-graphite-soft">Ação em <strong className="text-graphite">{pendingAction.label}</strong>.</p>
                <Field label="Justificativa" required>{(id, describedBy) => <Textarea id={id} aria-describedby={describedBy} value={reason} onChange={(event) => setReason(event.target.value)} />}</Field>
                <Button fullWidth variant={pendingAction.action === 'archive' ? 'danger' : 'primary'} loading={promotionAction.isPending} onClick={confirmAction}>
                  Confirmar
                </Button>
              </div>
            ) : (
              <p className="text-sm text-graphite-soft">Selecione uma ação em uma promoção para registrar o motivo.</p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

export function AdminCustomers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>();
  const [anonymizeText, setAnonymizeText] = useState('');

  const filters = {
    search: search.trim() || undefined,
    isActive: status === 'all' ? undefined : status === 'active',
    page: 1,
    pageSize: 20,
  };

  const customersQuery = useQuery({
    queryKey: queryKeys.admin.customers(filters),
    queryFn: () => adminService.listCustomers(filters),
  });
  const detailQuery = useQuery({
    queryKey: queryKeys.admin.customer(selectedCustomerId ?? ''),
    queryFn: () => adminService.getCustomer(selectedCustomerId!),
    enabled: !!selectedCustomerId,
  });
  const addressesQuery = useQuery({
    queryKey: queryKeys.admin.customerAddresses(selectedCustomerId ?? ''),
    queryFn: () => adminService.listCustomerAddresses(selectedCustomerId!),
    enabled: !!selectedCustomerId,
  });

  const updateStatus = useMutation({
    mutationFn: (input: { id: string; active: boolean }) => adminService.updateCustomerStatus(input.id, input.active),
    onSuccess: () => {
      toast.success('Status do cliente atualizado.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] });
      if (selectedCustomerId) queryClient.invalidateQueries({ queryKey: queryKeys.admin.customer(selectedCustomerId) });
      if (selectedCustomerId) queryClient.invalidateQueries({ queryKey: queryKeys.admin.customerAddresses(selectedCustomerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.audit });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Nao foi possivel atualizar o cliente.'),
  });

  const anonymize = useMutation({
    mutationFn: (id: string) => adminService.anonymizeCustomer(id),
    onSuccess: (customer) => {
      toast.success('Cliente anonimizado.');
      setAnonymizeText('');
      setSelectedCustomerId(customer.id);
      queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.customer(customer.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.customerAddresses(customer.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.audit });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Nao foi possivel anonimizar o cliente.'),
  });

  const customers = customersQuery.data ?? [];
  const activeCount = customers.filter((customer) => customer.active).length;
  const inactiveCount = customers.length - activeCount;
  const detail = detailQuery.data;
  const addresses = addressesQuery.data ?? [];
  const canAnonymize = !!detail && !detail.anonymizedAt && anonymizeText.trim().toUpperCase() === 'ANONIMIZAR';

  return (
    <div>
      <PageHeader title="Clientes" subtitle="Consulta operacional com dados minimizados." />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Panel>
          <p className="text-sm text-graphite-soft">Neste filtro</p>
          <p className="mt-2 text-2xl font-semibold text-graphite">{customers.length}</p>
        </Panel>
        <Panel>
          <p className="text-sm text-graphite-soft">Ativos</p>
          <p className="mt-2 text-2xl font-semibold text-success">{activeCount}</p>
        </Panel>
        <Panel>
          <p className="text-sm text-graphite-soft">Inativos</p>
          <p className="mt-2 text-2xl font-semibold text-warning">{inactiveCount}</p>
        </Panel>
        <Panel>
          <p className="text-sm text-graphite-soft">Endereços</p>
          <p className="mt-2 text-2xl font-semibold text-graphite">{selectedCustomerId ? addresses.length : '-'}</p>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <Panel title="Base de clientes">
          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_210px]">
            <Field label="Buscar">
              {(id, describedBy) => (
                <div className="relative">
                  <MagnifyingGlass size={17} className="pointer-events-none absolute left-3 top-3 text-store-gray" />
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Nome ou e-mail"
                    className="pl-10"
                  />
                </div>
              )}
            </Field>
            <Field label="Status">
              {(id, describedBy) => (
                <Select id={id} aria-describedby={describedBy} value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
                  <option value="all">Todos</option>
                  <option value="active">Ativos</option>
                  <option value="inactive">Inativos</option>
                </Select>
              )}
            </Field>
          </div>

          {customersQuery.isLoading ? (
            <Skeleton className="h-64 w-full rounded-[var(--radius-lg)]" />
          ) : (
            <AdminTable<AdminCustomerListItem>
              rowKey={(c) => c.id}
              rows={customers}
              empty="Nenhum cliente encontrado."
              columns={[
                { key: 'name', header: 'Cliente', render: (c) => <div><p className="font-medium">{c.name}</p><p className="text-xs text-graphite-soft">{c.email}</p></div> },
                { key: 'phone', header: 'Telefone', render: (c) => c.phoneMasked ?? '-' },
                { key: 'cpf', header: 'CPF', render: (c) => c.cpfMasked ?? '-' },
                { key: 'since', header: 'Cliente desde', render: (c) => formatDateShort(c.createdAt) },
                { key: 'status', header: 'Status', render: (c) => <CustomerStatusPill active={c.active} /> },
                { key: 'actions', header: 'Ações', render: (c) => (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSelectedCustomerId(c.id)}>
                      <Eye size={15} /> Detalhe
                    </Button>
                    <Button
                      size="sm"
                      variant={c.active ? 'ghost' : 'outline'}
                      loading={updateStatus.isPending}
                      onClick={() => updateStatus.mutate({ id: c.id, active: !c.active })}
                    >
                      {c.active ? 'Inativar' : 'Ativar'}
                    </Button>
                  </div>
                ) },
              ]}
            />
          )}
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel title={detail ? 'Detalhe do cliente' : 'Cliente'}>
            {!selectedCustomerId ? (
              <div className="flex items-start gap-3 text-sm leading-6 text-graphite-soft">
                <Eye size={21} className="mt-0.5 text-cinnamon" />
                <p>Selecione um cliente para consultar cadastro, consentimentos e status LGPD.</p>
              </div>
            ) : detailQuery.isLoading ? (
              <Skeleton className="h-56 w-full rounded-[var(--radius-lg)]" />
            ) : detail ? (
              <div className="space-y-4 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-graphite">{detail.name}</p>
                    <p className="text-xs text-graphite-soft">{detail.email}</p>
                  </div>
                  <CustomerStatusPill active={detail.active} />
                </div>

                <div className="grid gap-2">
                  <DetailRow label="CPF" value={detail.cpfMasked} />
                  <DetailRow label="RG" value={detail.rgMasked} />
                  <DetailRow label="Telefone" value={detail.phoneMasked} />
                  <DetailRow label="Nascimento" value={detail.birthDate ? formatDateShort(detail.birthDate) : undefined} />
                  <DetailRow label="Cadastro" value={formatDateShort(detail.createdAt)} />
                  <DetailRow label="Atualização" value={detail.updatedAt ? formatDateShort(detail.updatedAt) : undefined} />
                </div>

                <div className="flex flex-wrap gap-2">
                  <ConsentPill accepted={detail.termsAccepted} label="Termos" />
                  <ConsentPill accepted={detail.marketingAccepted} label="Marketing" />
                  {detail.deleteRequestedAt && <Pill tone="warning">Exclusão solicitada</Pill>}
                  {detail.anonymizedAt && <Pill tone="neutral">Anonimizado</Pill>}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={detail.active ? 'outline' : 'primary'}
                    loading={updateStatus.isPending}
                    disabled={!!detail.anonymizedAt}
                    onClick={() => updateStatus.mutate({ id: detail.id, active: !detail.active })}
                  >
                    {detail.active ? <XCircle size={15} /> : <CheckCircle size={15} />}
                    {detail.active ? 'Inativar cliente' : 'Ativar cliente'}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-graphite-soft">Cliente não encontrado.</p>
            )}
          </Panel>

          <Panel title="Endereços">
            {!selectedCustomerId ? (
              <div className="flex items-start gap-3 text-sm leading-6 text-graphite-soft">
                <MapPin size={21} className="mt-0.5 text-cinnamon" />
                <p>Selecione um cliente para consultar os endereços ativos usados no checkout.</p>
              </div>
            ) : addressesQuery.isLoading ? (
              <Skeleton className="h-48 w-full rounded-[var(--radius-lg)]" />
            ) : addresses.length > 0 ? (
              <div className="space-y-3">
                {addresses.map((address) => <CustomerAddressCard key={address.id} address={address} />)}
              </div>
            ) : (
              <p className="text-sm text-graphite-soft">Nenhum endereço ativo encontrado para este cliente.</p>
            )}
          </Panel>

          <Panel title="LGPD">
            {detail ? (
              <div className="space-y-4">
                <Field label="Confirmação">
                  {(id, describedBy) => (
                    <Input
                      id={id}
                      aria-describedby={describedBy}
                      value={anonymizeText}
                      onChange={(event) => setAnonymizeText(event.target.value)}
                      placeholder="Digite ANONIMIZAR"
                      disabled={!!detail.anonymizedAt}
                    />
                  )}
                </Field>
                <Button
                  variant="danger"
                  fullWidth
                  loading={anonymize.isPending}
                  disabled={!canAnonymize}
                  onClick={() => detail && anonymize.mutate(detail.id)}
                >
                  <ShieldWarning size={16} /> Anonimizar dados
                </Button>
              </div>
            ) : (
              <p className="text-sm leading-6 text-graphite-soft">A ação de anonimização fica disponível no detalhe do cliente.</p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function CustomerStatusPill({ active }: { active: boolean }) {
  return <Pill tone={active ? 'success' : 'neutral'}>{active ? 'Ativo' : 'Inativo'}</Pill>;
}

function CustomerAddressCard({ address }: { address: Address }) {
  return (
    <article className="rounded-[var(--radius-md)] border border-border bg-surface p-4 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-graphite">{address.label}</p>
          <p className="text-xs text-graphite-soft">{address.recipient}</p>
        </div>
        {address.isDefault && <Pill tone="success">Principal</Pill>}
      </div>

      <div className="mt-3 space-y-1 text-graphite-soft">
        <p className="text-graphite">{address.street}, {address.number}{address.complement ? ` - ${address.complement}` : ''}</p>
        <p>{address.district} · {address.city}/{address.state}</p>
        <p>{formatZip(address.zip)}</p>
      </div>
    </article>
  );
}

function ConsentPill({ accepted, label }: { accepted: boolean; label: string }) {
  return (
    <Pill tone={accepted ? 'success' : 'neutral'}>
      {accepted ? <ShieldCheck size={12} weight="fill" /> : <ShieldWarning size={12} weight="fill" />}
      {label}
    </Pill>
  );
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-2 last:border-0">
      <span className="text-graphite-soft">{label}</span>
      <span className="text-right font-medium text-graphite">{value || '-'}</span>
    </div>
  );
}
