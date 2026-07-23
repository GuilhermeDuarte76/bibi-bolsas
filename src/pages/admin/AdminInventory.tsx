import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type Icon,
  ArrowDown,
  ArrowsClockwise,
  ArrowUp,
  ClockCounterClockwise,
  Eye,
  LockKeyOpen,
  Package,
  Stack,
  Warning,
  WarningOctagon,
} from '@phosphor-icons/react';
import { adminService, queryKeys } from '@/lib/api';
import {
  Banner,
  Button,
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
  type Tone,
} from '@/components/admin/ui';
import { formatDateShort, formatPrice } from '@/lib/utils';
import type {
  AdminInventoryAdjustmentType,
  AdminInventoryDetail,
  AdminInventorySummary,
  AdminStockMovement,
  AdminStockReservation,
} from '@/types';

const ADJUSTMENT_OPTIONS: { value: AdminInventoryAdjustmentType; label: string; icon: Icon }[] = [
  { value: 'ManualEntry', label: 'Entrada manual', icon: ArrowUp },
  { value: 'ManualExit', label: 'Saída manual', icon: ArrowDown },
  { value: 'InventoryCorrection', label: 'Correção de saldo', icon: ArrowsClockwise },
];

const MOVEMENT_LABELS: Record<string, string> = {
  InitialStock: 'Estoque inicial',
  ManualEntry: 'Entrada manual',
  ManualExit: 'Saída manual',
  ReservationCreated: 'Reserva criada',
  ReservationReleased: 'Reserva liberada',
  ReservationExpired: 'Reserva expirada',
  SaleConfirmed: 'Venda confirmada',
  OrderCanceled: 'Pedido cancelado',
  Return: 'Devolução',
  InventoryCorrection: 'Correção',
};

const RESERVATION_LABELS: Record<string, string> = {
  Active: 'Ativa',
  Confirmed: 'Confirmada',
  Released: 'Liberada',
  Expired: 'Expirada',
  Canceled: 'Cancelada',
};

function stockTone(item: Pick<AdminInventorySummary, 'availableQuantity' | 'isLowStock'>): Tone {
  if (item.availableQuantity <= 0) return 'danger';
  if (item.isLowStock) return 'warning';
  return 'success';
}

function reservationTone(status: string): Tone {
  if (status === 'Active') return 'warning';
  if (status === 'Confirmed') return 'success';
  if (status === 'Released') return 'info';
  return 'neutral';
}

function movementTone(type: string): Tone {
  if (type === 'ManualEntry' || type === 'InitialStock' || type === 'ReservationReleased') return 'success';
  if (type === 'ManualExit' || type === 'SaleConfirmed') return 'danger';
  if (type === 'InventoryCorrection') return 'warning';
  return 'info';
}

function signedQuantity(movement: AdminStockMovement) {
  const delta = movement.newStockQuantity - movement.previousStockQuantity;
  return delta > 0 ? `+${delta}` : String(delta);
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-2.5 last:border-0">
      <span className="text-sm text-graphite-soft">{label}</span>
      <span className="text-right text-sm font-medium text-graphite">{value}</span>
    </div>
  );
}

export function AdminInventory() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'ok'>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [detailVariantId, setDetailVariantId] = useState<string | undefined>();
  const [adjustmentType, setAdjustmentType] = useState<AdminInventoryAdjustmentType>('ManualEntry');
  const [adjustmentQuantity, setAdjustmentQuantity] = useState(1);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustError, setAdjustError] = useState<string | undefined>();
  const [releaseReasons, setReleaseReasons] = useState<Record<string, string>>({});

  const inventoryFilters = useMemo(() => ({
    search: search.trim() || undefined,
    low: stockFilter === 'all' ? undefined : stockFilter === 'low',
    active: activeFilter === 'all' ? undefined : activeFilter === 'active',
    page: 1,
    pageSize: 80,
  }), [activeFilter, search, stockFilter]);

  const inventoryQuery = useQuery({
    queryKey: queryKeys.admin.inventory(inventoryFilters),
    queryFn: () => adminService.listInventory(inventoryFilters),
  });

  const inventory = inventoryQuery.data ?? [];
  const selectedItem = inventory.find((item) => item.variantId === detailVariantId);
  const selectedId = detailVariantId;

  const closeDetail = () => {
    setDetailVariantId(undefined);
    setAdjustError(undefined);
    setAdjustmentReason('');
    setAdjustmentQuantity(1);
    setAdjustmentType('ManualEntry');
  };

  const detailQuery = useQuery({
    queryKey: selectedId ? queryKeys.admin.inventoryDetail(selectedId) : ['admin', 'inventory', 'detail', 'none'],
    queryFn: () => adminService.getInventoryDetail(selectedId ?? ''),
    enabled: Boolean(selectedId),
  });

  const movementFilters = useMemo(() => ({ variantId: selectedId, page: 1, pageSize: 10 }), [selectedId]);
  const movementsQuery = useQuery({
    queryKey: queryKeys.admin.inventoryMovements(movementFilters),
    queryFn: () => adminService.listInventoryMovements(movementFilters),
    enabled: Boolean(selectedId),
  });

  const reservationFilters = useMemo(() => ({ variantId: selectedId, status: 'Active', page: 1, pageSize: 10 }), [selectedId]);
  const reservationsQuery = useQuery({
    queryKey: queryKeys.admin.inventoryReservations(reservationFilters),
    queryFn: () => adminService.listInventoryReservations(reservationFilters),
    enabled: Boolean(selectedId),
  });

  const adjustStock = useMutation({
    mutationFn: () => {
      if (!selectedId) throw new Error('Selecione um SKU.');
      if (adjustmentQuantity < 0) throw new Error('Quantidade inválida.');
      if (adjustmentType !== 'InventoryCorrection' && adjustmentQuantity <= 0) throw new Error('Quantidade deve ser maior que zero.');
      if (adjustmentReason.trim().length < 10) throw new Error('Motivo deve ter pelo menos 10 caracteres.');

      return adminService.adjustInventory({
        variantId: selectedId,
        type: adjustmentType,
        quantity: adjustmentQuantity,
        reason: adjustmentReason,
      });
    },
    onMutate: () => setAdjustError(undefined),
    onSuccess: async (summary) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'inventory'] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.inventoryDetail(summary.variantId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.products }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard }),
      ]);
      setAdjustmentQuantity(1);
      setAdjustmentReason('');
      toast.success({ title: 'Ajuste registrado', description: `Novo saldo: ${summary.stockQuantity} un.` });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Não foi possível ajustar o estoque.';
      setAdjustError(message);
      toast.error({ title: 'Não foi possível ajustar', description: message });
    },
  });

  const releaseReservation = useMutation({
    mutationFn: (reservation: AdminStockReservation) => adminService.releaseInventoryReservation(
      reservation.id,
      releaseReasons[reservation.id] || 'Reserva liberada manualmente pela operação.',
    ),
    onSuccess: async (reservation) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'inventory', 'reservations'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'inventory', 'movements'] }),
      ]);
      setReleaseReasons((current) => ({ ...current, [reservation.id]: '' }));
      toast.success({ title: 'Reserva liberada', description: 'A quantidade voltou ao estoque disponível.' });
    },
    onError: (error) =>
      toast.error({ title: 'Não foi possível liberar', description: error instanceof Error ? error.message : 'Tente novamente.' }),
  });

  const totalSkus = inventory.length;
  const lowStock = inventory.filter((item) => item.isLowStock && item.availableQuantity > 0).length;
  const outOfStock = inventory.filter((item) => item.availableQuantity <= 0).length;
  const reserved = inventory.reduce((sum, item) => sum + item.reservedQuantity, 0);
  const detail = detailQuery.data;
  const movements = movementsQuery.data ?? [];
  const reservations = reservationsQuery.data ?? [];
  const adjustmentLabel = adjustmentType === 'InventoryCorrection' ? 'Novo saldo' : 'Quantidade';

  const columns: Column<AdminInventorySummary>[] = [
    {
      key: 'sku',
      header: 'SKU / Produto',
      render: (item) => (
        <div className="min-w-0">
          <p className="font-mono text-xs font-semibold text-graphite">{item.sku}</p>
          <p className="mt-0.5 truncate text-sm font-medium text-graphite">{item.productName}</p>
          <p className="truncate text-xs text-graphite-soft">{item.variantName}</p>
        </div>
      ),
    },
    { key: 'stock', header: 'Total', align: 'right', render: (item) => <span className="tabular-nums text-graphite-soft">{item.stockQuantity}</span> },
    { key: 'reserved', header: 'Reservado', align: 'right', render: (item) => <span className="tabular-nums text-graphite-soft">{item.reservedQuantity}</span> },
    { key: 'available', header: 'Disponível', align: 'right', render: (item) => <StatusBadge tone={stockTone(item)} size="sm">{item.availableQuantity}</StatusBadge> },
    { key: 'minimum', header: 'Mín.', align: 'right', render: (item) => <span className="tabular-nums text-graphite-soft">{item.minimumStock}</span> },
    { key: 'active', header: 'Status', render: (item) => item.isActive ? <StatusBadge tone="success" dot>Ativo</StatusBadge> : <StatusBadge tone="neutral" dot>Inativo</StatusBadge> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '110px',
      render: (item) => (
        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setDetailVariantId(item.variantId); }}>
          <Eye size={15} /> Gerir
        </Button>
      ),
    },
  ];

  const movementColumns: Column<AdminStockMovement>[] = [
    { key: 'type', header: 'Tipo', render: (m) => <StatusBadge tone={movementTone(m.type)} size="sm">{MOVEMENT_LABELS[m.type] ?? m.type}</StatusBadge> },
    { key: 'delta', header: 'Δ', align: 'right', render: (m) => <span className="font-medium tabular-nums">{signedQuantity(m)}</span> },
    { key: 'stock', header: 'Saldo', align: 'right', render: (m) => <span className="tabular-nums text-graphite-soft">{m.previousStockQuantity} → {m.newStockQuantity}</span> },
    { key: 'reason', header: 'Motivo', render: (m) => <span className="text-graphite-soft">{m.reason || '—'}</span> },
    { key: 'date', header: 'Data', align: 'right', render: (m) => <span className="text-graphite-soft">{formatDateShort(m.createdAt)}</span> },
  ];

  const reservationColumns: Column<AdminStockReservation>[] = [
    { key: 'status', header: 'Status', render: (r) => <StatusBadge tone={reservationTone(r.status)} size="sm">{RESERVATION_LABELS[r.status] ?? r.status}</StatusBadge> },
    { key: 'quantity', header: 'Qtd.', align: 'right', render: (r) => <span className="tabular-nums">{r.quantity}</span> },
    { key: 'ref', header: 'Referência', render: (r) => <span className="text-graphite-soft">{r.orderId || r.cartId || r.userId || '—'}</span> },
    { key: 'expires', header: 'Expira', render: (r) => <span className="text-graphite-soft">{formatDateShort(r.expiresAt)}</span> },
    {
      key: 'release',
      header: 'Ação',
      render: (r) => r.status === 'Active' ? (
        <div className="flex min-w-[15rem] gap-2">
          <Input
            aria-label="Motivo da liberação"
            placeholder="Motivo (opcional)"
            className="h-9 text-sm"
            value={releaseReasons[r.id] ?? ''}
            onChange={(e) => setReleaseReasons((current) => ({ ...current, [r.id]: e.target.value }))}
          />
          <Button type="button" size="sm" variant="outline" loading={releaseReservation.isPending} onClick={() => releaseReservation.mutate(r)}>
            <LockKeyOpen size={15} /> Liberar
          </Button>
        </div>
      ) : <span className="text-store-gray">—</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Catálogo' }, { label: 'Estoque' }]}
        eyebrow="Catálogo"
        title="Estoque"
        subtitle="Ajustes auditáveis, reservas e histórico por SKU."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="SKUs no filtro" value={totalSkus} icon={Package} loading={inventoryQuery.isLoading} />
        <StatCard label="Estoque baixo" value={<span className={lowStock ? 'text-warning' : undefined}>{lowStock}</span>} icon={Warning} loading={inventoryQuery.isLoading} />
        <StatCard label="Sem disponível" value={<span className={outOfStock ? 'text-danger' : undefined}>{outOfStock}</span>} icon={WarningOctagon} loading={inventoryQuery.isLoading} />
        <StatCard label="Reservado" value={<span className="text-travel-blue">{reserved}</span>} icon={Stack} loading={inventoryQuery.isLoading} />
      </div>

      <SectionCard
        eyebrow="Inventário"
        title="SKUs"
        description={`${totalSkus} ${totalSkus === 1 ? 'SKU' : 'SKUs'} no filtro. Clique em um SKU para gerir estoque, reservas e histórico.`}
        bodyClassName="flex flex-col gap-4"
      >
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por produto ou SKU" />
          <Select aria-label="Filtrar estoque" value={stockFilter} onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)} className="sm:w-auto">
            <option value="all">Todos os níveis</option>
            <option value="low">Estoque baixo</option>
            <option value="ok">Acima do mínimo</option>
          </Select>
          <Select aria-label="Filtrar ativo" value={activeFilter} onChange={(e) => setActiveFilter(e.target.value as typeof activeFilter)} className="sm:w-auto">
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
            <option value="all">Todos</option>
          </Select>
        </Toolbar>

        <DataTable<AdminInventorySummary>
          columns={columns}
          rows={inventory}
          rowKey={(item) => item.variantId}
          loading={inventoryQuery.isLoading}
          onRowClick={(item) => setDetailVariantId(item.variantId)}
          minWidth={820}
          empty={{ icon: Package, title: 'Nenhum SKU encontrado', description: 'Ajuste os filtros de busca ou de nível de estoque.' }}
        />
      </SectionCard>

      {/* Modal: gerir SKU */}
      <Modal
        open={!!detailVariantId}
        onClose={closeDetail}
        size="xl"
        title={selectedItem?.productName ?? detail?.productName ?? 'SKU'}
        description={selectedItem?.sku ?? detail?.sku}
        footer={<Button variant="ghost" size="sm" onClick={closeDetail}>Fechar</Button>}
      >
        {selectedItem || detail ? (
          <div className="flex flex-col gap-6">
            <InventoryDetail detail={detail} fallback={selectedItem} loading={detailQuery.isLoading} />

            {/* Ajuste manual */}
            <section className="rounded-[var(--radius-md)] border border-border bg-cream-lighter/40 p-4">
              <h3 className="mb-3 text-sm font-semibold text-graphite">Ajuste manual</h3>
              {adjustError && (
                <Banner tone="danger" className="mb-3" onDismiss={() => setAdjustError(undefined)}>
                  {adjustError}
                </Banner>
              )}
              <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                <Field label="Tipo de ajuste">
                  {(fieldId) => (
                    <Select id={fieldId} value={adjustmentType} onChange={(e) => setAdjustmentType(e.target.value as AdminInventoryAdjustmentType)}>
                      {ADJUSTMENT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </Select>
                  )}
                </Field>
                <Field label={adjustmentLabel}>
                  {(fieldId) => (
                    <NumberInput id={fieldId} stepper min={0} value={adjustmentQuantity} onChange={(n) => setAdjustmentQuantity(n ?? 0)} />
                  )}
                </Field>
              </div>
              <Field label="Motivo" required hint="Mínimo de 10 caracteres — fica registrado na auditoria." className="mt-4">
                {(fieldId) => (
                  <Textarea id={fieldId} value={adjustmentReason} maxLength={500} onChange={(e) => setAdjustmentReason(e.target.value)} placeholder="Ex.: Conferência de inventário do dia 23/07." />
                )}
              </Field>
              <div className="mt-4 flex justify-end">
                <Button type="button" loading={adjustStock.isPending} onClick={() => adjustStock.mutate()}>
                  <ArrowsClockwise size={16} /> Registrar ajuste
                </Button>
              </div>
            </section>

            {/* Movimentações */}
            <section>
              <h3 className="mb-2.5 text-sm font-semibold text-graphite">Movimentações recentes</h3>
              <DataTable<AdminStockMovement>
                columns={movementColumns}
                rows={movements}
                rowKey={(m) => m.id}
                loading={movementsQuery.isLoading}
                minWidth={560}
                empty={{ icon: ClockCounterClockwise, title: 'Nenhuma movimentação registrada' }}
              />
            </section>

            {/* Reservas */}
            <section>
              <h3 className="mb-2.5 text-sm font-semibold text-graphite">Reservas ativas</h3>
              <DataTable<AdminStockReservation>
                columns={reservationColumns}
                rows={reservations}
                rowKey={(r) => r.id}
                loading={reservationsQuery.isLoading}
                minWidth={640}
                empty={{ icon: LockKeyOpen, title: 'Nenhuma reserva ativa para este SKU' }}
              />
            </section>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function InventoryDetail({
  detail,
  fallback,
  loading,
}: {
  detail?: AdminInventoryDetail;
  fallback?: AdminInventorySummary;
  loading: boolean;
}) {
  const item = detail ?? fallback;
  if (!item) {
    return <div className="h-32 animate-pulse rounded-[var(--radius-md)] bg-cream-light" />;
  }
  const price = detail?.promotionalPriceCents ?? detail?.priceCents;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={stockTone(item)}>{item.availableQuantity} disponível</StatusBadge>
        {item.isActive ? <StatusBadge tone="success" dot>Ativo</StatusBadge> : <StatusBadge tone="neutral" dot>Inativo</StatusBadge>}
        <span className="text-sm text-graphite-soft">{item.variantName}</span>
      </div>

      <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        <DetailRow label="Estoque total" value={String(item.stockQuantity)} />
        <DetailRow label="Reservado" value={String(item.reservedQuantity)} />
        <DetailRow label="Disponível" value={String(item.availableQuantity)} />
        <DetailRow label="Estoque mínimo" value={String(item.minimumStock)} />
        {price != null && <DetailRow label="Preço" value={formatPrice(price)} />}
        {detail && <DetailRow label="Dimensões" value={`${detail.heightCm} × ${detail.widthCm} × ${detail.depthCm} cm`} />}
        {detail && <DetailRow label="Peso" value={`${detail.weightKg} kg`} />}
        {detail && <DetailRow label="Criado em" value={formatDateShort(detail.createdAt)} />}
      </dl>
      {loading && !detail && <p className="text-xs text-graphite-soft">Carregando detalhes completos…</p>}
    </div>
  );
}
