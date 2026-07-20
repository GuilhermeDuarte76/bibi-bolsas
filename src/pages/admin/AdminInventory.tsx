import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  ClockCounterClockwise,
  LockKeyOpen,
  MagnifyingGlass,
  WarningCircle,
} from '@phosphor-icons/react';
import { adminService, queryKeys } from '@/lib/api';
import { PageHeader, Panel, AdminTable } from '@/components/admin/AdminUI';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Pill } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { formatDateShort, formatPrice } from '@/lib/utils';
import type {
  AdminInventoryAdjustmentType,
  AdminInventoryDetail,
  AdminInventorySummary,
  AdminStockMovement,
  AdminStockReservation,
} from '@/types';

const ADJUSTMENT_OPTIONS: { value: AdminInventoryAdjustmentType; label: string; icon: typeof ArrowUp }[] = [
  { value: 'ManualEntry', label: 'Entrada manual', icon: ArrowUp },
  { value: 'ManualExit', label: 'Saída manual', icon: ArrowDown },
  { value: 'InventoryCorrection', label: 'Correção de saldo', icon: ClockCounterClockwise },
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

function stockTone(item: Pick<AdminInventorySummary, 'availableQuantity' | 'isLowStock'>): 'success' | 'warning' | 'danger' {
  if (item.availableQuantity <= 0) return 'danger';
  if (item.isLowStock) return 'warning';
  return 'success';
}

function reservationTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'Active') return 'warning';
  if (status === 'Confirmed') return 'success';
  if (status === 'Released') return 'info';
  if (status === 'Expired' || status === 'Canceled') return 'neutral';
  return 'neutral';
}

function movementTone(type: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (type === 'ManualEntry' || type === 'InitialStock' || type === 'ReservationReleased') return 'success';
  if (type === 'ManualExit' || type === 'SaleConfirmed') return 'danger';
  if (type === 'InventoryCorrection') return 'warning';
  return 'info';
}

function signedQuantity(movement: AdminStockMovement) {
  const delta = movement.newStockQuantity - movement.previousStockQuantity;
  if (delta > 0) return `+${delta}`;
  return String(delta);
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-2 last:border-0">
      <span className="text-graphite-soft">{label}</span>
      <span className="text-right font-medium text-graphite">{value}</span>
    </div>
  );
}

export function AdminInventory() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'ok'>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>();
  const [adjustmentType, setAdjustmentType] = useState<AdminInventoryAdjustmentType>('ManualEntry');
  const [adjustmentQuantity, setAdjustmentQuantity] = useState(1);
  const [adjustmentReason, setAdjustmentReason] = useState('');
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
  const selectedItem = inventory.find((item) => item.variantId === selectedVariantId) ?? inventory[0];
  const selectedId = selectedItem?.variantId;

  useEffect(() => {
    if (!inventory.length) {
      setSelectedVariantId(undefined);
      return;
    }
    if (!selectedVariantId || !inventory.some((item) => item.variantId === selectedVariantId)) {
      setSelectedVariantId(inventory[0].variantId);
    }
  }, [inventory, selectedVariantId]);

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
    onSuccess: async (summary) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'inventory'] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.inventoryDetail(summary.variantId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.products }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard }),
      ]);
      setAdjustmentQuantity(1);
      setAdjustmentReason('');
      toast.success('Ajuste de estoque registrado.');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Nao foi possivel ajustar o estoque.'),
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
      toast.success('Reserva liberada.');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Nao foi possivel liberar a reserva.'),
  });

  const totalSkus = inventory.length;
  const lowStock = inventory.filter((item) => item.isLowStock && item.availableQuantity > 0).length;
  const outOfStock = inventory.filter((item) => item.availableQuantity <= 0).length;
  const reserved = inventory.reduce((sum, item) => sum + item.reservedQuantity, 0);
  const detail = detailQuery.data;
  const movements = movementsQuery.data ?? [];
  const reservations = reservationsQuery.data ?? [];
  const adjustmentLabel = adjustmentType === 'InventoryCorrection' ? 'Novo saldo' : 'Quantidade';

  return (
    <div>
      <PageHeader
        title="Estoque"
        subtitle="Ajustes auditáveis, reservas e histórico por SKU."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Panel>
          <p className="text-sm text-graphite-soft">SKUs no filtro</p>
          <p className="mt-2 text-2xl font-semibold text-graphite">{totalSkus}</p>
        </Panel>
        <Panel>
          <p className="text-sm text-graphite-soft">Estoque baixo</p>
          <p className="mt-2 text-2xl font-semibold text-warning">{lowStock}</p>
        </Panel>
        <Panel>
          <p className="text-sm text-graphite-soft">Sem disponível</p>
          <p className="mt-2 text-2xl font-semibold text-danger">{outOfStock}</p>
        </Panel>
        <Panel>
          <p className="text-sm text-graphite-soft">Reservado</p>
          <p className="mt-2 text-2xl font-semibold text-travel-blue">{reserved}</p>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <Panel title="SKUs">
          <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_170px_150px]">
            <div className="relative">
              <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-store-gray" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-10"
                placeholder="Buscar produto ou SKU"
                aria-label="Buscar estoque"
              />
            </div>
            <Select aria-label="Filtrar estoque" value={stockFilter} onChange={(event) => setStockFilter(event.target.value as typeof stockFilter)}>
              <option value="all">Todos</option>
              <option value="low">Baixo</option>
              <option value="ok">Acima mínimo</option>
            </Select>
            <Select aria-label="Filtrar ativo" value={activeFilter} onChange={(event) => setActiveFilter(event.target.value as typeof activeFilter)}>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
              <option value="all">Todos</option>
            </Select>
          </div>

          {inventoryQuery.isLoading ? (
            <Skeleton className="h-72 w-full rounded-[var(--radius-lg)]" />
          ) : (
            <AdminTable<AdminInventorySummary>
              rowKey={(item) => item.variantId}
              rows={inventory}
              empty="Nenhum SKU encontrado."
              onRowClick={(item) => setSelectedVariantId(item.variantId)}
              columns={[
                {
                  key: 'sku',
                  header: 'SKU',
                  render: (item) => (
                    <div>
                      <p className="font-mono text-xs font-semibold text-graphite">{item.sku}</p>
                      <p className="mt-1 text-sm font-medium text-graphite">{item.productName}</p>
                      <p className="text-xs text-graphite-soft">{item.variantName}</p>
                    </div>
                  ),
                },
                { key: 'stock', header: 'Total', render: (item) => item.stockQuantity },
                { key: 'reserved', header: 'Reservado', render: (item) => item.reservedQuantity },
                { key: 'available', header: 'Disponível', render: (item) => <Pill tone={stockTone(item)}>{item.availableQuantity}</Pill> },
                { key: 'minimum', header: 'Mín.', render: (item) => item.minimumStock },
                { key: 'active', header: 'Status', render: (item) => item.isActive ? <Pill tone="success">Ativo</Pill> : <Pill tone="neutral">Inativo</Pill> },
              ]}
            />
          )}
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel title={selectedItem ? 'Detalhe do SKU' : 'Detalhe'}>
            {!selectedItem ? (
              <p className="text-sm text-graphite-soft">Selecione um SKU para ver detalhes.</p>
            ) : detailQuery.isLoading ? (
              <Skeleton className="h-60 w-full rounded-[var(--radius-lg)]" />
            ) : (
              <InventoryDetail detail={detail} fallback={selectedItem} />
            )}
          </Panel>

          <Panel title="Ajuste manual">
            {selectedItem ? (
              <div className="grid gap-4">
                <Field label="Tipo">
                  {(fieldId) => (
                    <Select id={fieldId} value={adjustmentType} onChange={(event) => setAdjustmentType(event.target.value as AdminInventoryAdjustmentType)}>
                      {ADJUSTMENT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </Select>
                  )}
                </Field>
                <Field label={adjustmentLabel}>
                  {(fieldId) => (
                    <Input
                      id={fieldId}
                      type="number"
                      min="0"
                      value={adjustmentQuantity}
                      onChange={(event) => setAdjustmentQuantity(Number(event.target.value || 0))}
                    />
                  )}
                </Field>
                <Field label="Motivo" required>
                  {(fieldId) => (
                    <Textarea
                      id={fieldId}
                      value={adjustmentReason}
                      maxLength={500}
                      onChange={(event) => setAdjustmentReason(event.target.value)}
                    />
                  )}
                </Field>
                <Button type="button" loading={adjustStock.isPending} onClick={() => adjustStock.mutate()}>
                  <WarningCircle size={17} /> Registrar ajuste
                </Button>
              </div>
            ) : (
              <p className="text-sm text-graphite-soft">Selecione um SKU para ajustar.</p>
            )}
          </Panel>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Panel title="Movimentações recentes">
          {movementsQuery.isLoading ? (
            <Skeleton className="h-56 w-full rounded-[var(--radius-lg)]" />
          ) : (
            <AdminTable<AdminStockMovement>
              rowKey={(movement) => movement.id}
              rows={movements}
              empty="Nenhuma movimentação encontrada."
              columns={[
                { key: 'type', header: 'Tipo', render: (movement) => <Pill tone={movementTone(movement.type)}>{MOVEMENT_LABELS[movement.type] ?? movement.type}</Pill> },
                { key: 'delta', header: 'Δ estoque', render: signedQuantity },
                { key: 'stock', header: 'Saldo', render: (movement) => `${movement.previousStockQuantity} → ${movement.newStockQuantity}` },
                { key: 'reason', header: 'Motivo', render: (movement) => movement.reason || '-' },
                { key: 'date', header: 'Data', render: (movement) => formatDateShort(movement.createdAt) },
              ]}
            />
          )}
        </Panel>

        <Panel title="Reservas ativas">
          {reservationsQuery.isLoading ? (
            <Skeleton className="h-56 w-full rounded-[var(--radius-lg)]" />
          ) : (
            <AdminTable<AdminStockReservation>
              rowKey={(reservation) => reservation.id}
              rows={reservations}
              empty="Nenhuma reserva ativa para este SKU."
              columns={[
                { key: 'status', header: 'Status', render: (reservation) => <Pill tone={reservationTone(reservation.status)}>{RESERVATION_LABELS[reservation.status] ?? reservation.status}</Pill> },
                { key: 'quantity', header: 'Qtd.', render: (reservation) => reservation.quantity },
                { key: 'ref', header: 'Referência', render: (reservation) => reservation.orderId || reservation.cartId || reservation.userId || '-' },
                { key: 'expires', header: 'Expira', render: (reservation) => formatDateShort(reservation.expiresAt) },
                {
                  key: 'release',
                  header: 'Ação',
                  render: (reservation) => reservation.status === 'Active' ? (
                    <div className="flex min-w-64 gap-2">
                      <Input
                        aria-label="Motivo da liberação"
                        placeholder="Motivo da liberação"
                        value={releaseReasons[reservation.id] ?? ''}
                        onChange={(event) => setReleaseReasons((current) => ({ ...current, [reservation.id]: event.target.value }))}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        loading={releaseReservation.isPending}
                        onClick={() => releaseReservation.mutate(reservation)}
                      >
                        <LockKeyOpen size={15} /> Liberar
                      </Button>
                    </div>
                  ) : '-',
                },
              ]}
            />
          )}
        </Panel>
      </div>
    </div>
  );
}

function InventoryDetail({
  detail,
  fallback,
}: {
  detail?: AdminInventoryDetail;
  fallback: AdminInventorySummary;
}) {
  const item = detail ?? fallback;
  const price = detail?.promotionalPriceCents ?? detail?.priceCents;

  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono text-xs font-semibold text-graphite-soft">{item.sku}</p>
        <p className="mt-1 font-medium text-graphite">{item.productName}</p>
        <p className="text-sm text-graphite-soft">{item.variantName}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Pill tone={stockTone(item)}>{item.availableQuantity} disponível</Pill>
          {item.isActive ? <Pill tone="success">Ativo</Pill> : <Pill tone="neutral">Inativo</Pill>}
        </div>
      </div>

      <div className="grid gap-2 text-sm">
        <DetailRow label="Total" value={String(item.stockQuantity)} />
        <DetailRow label="Reservado" value={String(item.reservedQuantity)} />
        <DetailRow label="Mínimo" value={String(item.minimumStock)} />
        {price != null && <DetailRow label="Preço" value={formatPrice(price)} />}
        {detail && <DetailRow label="Dimensões" value={`${detail.heightCm} x ${detail.widthCm} x ${detail.depthCm} cm`} />}
        {detail && <DetailRow label="Peso" value={`${detail.weightKg} kg`} />}
        {detail && <DetailRow label="Criado em" value={formatDateShort(detail.createdAt)} />}
      </div>
    </div>
  );
}
