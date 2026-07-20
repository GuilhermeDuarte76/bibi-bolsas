import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Eye, MagnifyingGlass, Plus, ShieldCheck, ShieldWarning, XCircle } from '@phosphor-icons/react';
import { adminService, queryKeys } from '@/lib/api';
import type { AdminCouponInput, AdminPromotionInput } from '@/lib/api/admin.service';
import type { AdminCustomerListItem, Coupon, Promotion } from '@/types';
import { PageHeader, AdminTable, Panel } from '@/components/admin/AdminUI';
import { Pill } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { formatDateShort, formatPrice } from '@/lib/utils';

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

type CommerceAction =
  | { kind: 'coupon'; id: string; label: string; action: 'activate' | 'deactivate' | 'archive' }
  | { kind: 'promotion'; id: string; label: string; action: 'activate' | 'deactivate' | 'archive' };

const nowForInput = () => new Date().toISOString().slice(0, 16);

function centsFromMoney(value: string): number {
  const normalized = value.replace(/\./g, '').replace(',', '.').trim();
  return Math.round(Number(normalized || 0) * 100);
}

function amountFromForm(type: string, value: string): number {
  if (type === 'Percentage') return Number(value || 0);
  if (type === 'FreeShipping') return 0;
  return centsFromMoney(value);
}

function discountLabel(type?: string, value?: number) {
  if (type === 'Percentage' || type === 'percent') return `${value ?? 0}%`;
  if (type === 'FreeShipping') return 'Frete grátis';
  return formatPrice(value ?? 0);
}

function statusPill(status?: string, active?: boolean) {
  const resolved = status ?? (active ? 'Active' : 'Inactive');
  if (resolved === 'Active') return <Pill tone="success">Ativo</Pill>;
  if (resolved === 'Archived') return <Pill tone="neutral">Arquivado</Pill>;
  return <Pill tone="warning">Inativo</Pill>;
}

export function AdminCoupons() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [reason, setReason] = useState('');
  const [pendingAction, setPendingAction] = useState<CommerceAction | null>(null);
  const [form, setForm] = useState({
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
  });

  const filters = { search: search.trim() || undefined, status: status || undefined, page: 1, pageSize: 20 };
  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.admin.coupons, filters] as const,
    queryFn: () => adminService.listCoupons(filters),
  });

  const createCoupon = useMutation({
    mutationFn: (input: AdminCouponInput) => adminService.createCoupon(input),
    onSuccess: () => {
      toast.success('Cupom criado como inativo.');
      setForm((current) => ({ ...current, code: '', name: '', description: '', discountValue: '', maxDiscountValue: '', minimumOrderValue: '', totalUsageLimit: '', endsAt: '' }));
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.coupons });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Nao foi possivel criar o cupom.'),
  });

  const couponAction = useMutation({
    mutationFn: (input: { action: CommerceAction; reason: string }) => {
      if (input.action.action === 'archive') return adminService.archiveCoupon(input.action.id, input.reason);
      return adminService.updateCouponStatus(input.action.id, input.action.action === 'activate' ? 'Active' : 'Inactive', input.reason);
    },
    onSuccess: () => {
      toast.success('Cupom atualizado com auditoria.');
      setPendingAction(null);
      setReason('');
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.coupons });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.audit });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Nao foi possivel atualizar o cupom.'),
  });

  const submitCoupon = () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Informe código e nome do cupom.');
      return;
    }

    if (form.type !== 'FreeShipping' && Number(form.discountValue.replace(',', '.')) <= 0) {
      toast.error('Informe um desconto válido.');
      return;
    }

    createCoupon.mutate({
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
    });
  };

  const confirmAction = () => {
    if (!pendingAction || reason.trim().length < 10) {
      toast.error('Informe uma justificativa com pelo menos 10 caracteres.');
      return;
    }

    couponAction.mutate({ action: pendingAction, reason });
  };

  const coupons = data ?? [];

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
          <Panel title="Novo cupom">
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
              </div>
              <Button loading={createCoupon.isPending} onClick={submitCoupon}><Plus size={16} /> Criar cupom</Button>
            </div>
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
  const [reason, setReason] = useState('');
  const [pendingAction, setPendingAction] = useState<CommerceAction | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'Percentage',
    discountValue: '',
    minimumOrderValue: '',
    startsAt: nowForInput(),
    endsAt: '',
  });

  const filters = { search: search.trim() || undefined, status: status || undefined, page: 1, pageSize: 20 };
  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.admin.promotions, filters] as const,
    queryFn: () => adminService.listPromotions(filters),
  });

  const createPromotion = useMutation({
    mutationFn: (input: AdminPromotionInput) => adminService.createPromotion(input),
    onSuccess: () => {
      toast.success('Promoção criada como inativa.');
      setForm((current) => ({ ...current, name: '', description: '', discountValue: '', minimumOrderValue: '', endsAt: '' }));
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.promotions });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Nao foi possivel criar a promoção.'),
  });

  const promotionAction = useMutation({
    mutationFn: (input: { action: CommerceAction; reason: string }) => {
      if (input.action.action === 'archive') return adminService.archivePromotion(input.action.id, input.reason);
      return adminService.updatePromotionStatus(input.action.id, input.action.action === 'activate' ? 'Active' : 'Inactive', input.reason);
    },
    onSuccess: () => {
      toast.success('Promoção atualizada com auditoria.');
      setPendingAction(null);
      setReason('');
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.promotions });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.audit });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Nao foi possivel atualizar a promoção.'),
  });

  const submitPromotion = () => {
    if (!form.name.trim()) {
      toast.error('Informe o nome da promoção.');
      return;
    }

    if (form.type !== 'FreeShipping' && Number(form.discountValue.replace(',', '.')) <= 0) {
      toast.error('Informe um desconto válido.');
      return;
    }

    createPromotion.mutate({
      name: form.name,
      description: form.description,
      type: form.type,
      discountValueCents: amountFromForm(form.type, form.discountValue),
      minimumOrderValueCents: form.minimumOrderValue ? centsFromMoney(form.minimumOrderValue) : undefined,
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
    });
  };

  const confirmAction = () => {
    if (!pendingAction || reason.trim().length < 10) {
      toast.error('Informe uma justificativa com pelo menos 10 caracteres.');
      return;
    }

    promotionAction.mutate({ action: pendingAction, reason });
  };

  const promotions = data ?? [];

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
          <Panel title="Nova promoção">
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
              <Button loading={createPromotion.isPending} onClick={submitPromotion}><Plus size={16} /> Criar promoção</Button>
            </div>
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

  const updateStatus = useMutation({
    mutationFn: (input: { id: string; active: boolean }) => adminService.updateCustomerStatus(input.id, input.active),
    onSuccess: () => {
      toast.success('Status do cliente atualizado.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] });
      if (selectedCustomerId) queryClient.invalidateQueries({ queryKey: queryKeys.admin.customer(selectedCustomerId) });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.audit });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Nao foi possivel anonimizar o cliente.'),
  });

  const customers = customersQuery.data ?? [];
  const activeCount = customers.filter((customer) => customer.active).length;
  const inactiveCount = customers.length - activeCount;
  const detail = detailQuery.data;
  const canAnonymize = !!detail && !detail.anonymizedAt && anonymizeText.trim().toUpperCase() === 'ANONIMIZAR';

  return (
    <div>
      <PageHeader title="Clientes" subtitle="Consulta operacional com dados minimizados." />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
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
