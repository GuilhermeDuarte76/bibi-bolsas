import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowClockwise, ChartBar, DownloadSimple, FileCsv } from '@phosphor-icons/react';
import { adminService, queryKeys } from '@/lib/api';
import type {
  AdminAbandonedCartReport,
  AdminCustomerReport,
  AdminProductReport,
  AdminReportExport,
  AdminReportType,
  AdminSalesReport,
  AdminSalesReportFilters,
  AdminStockReport,
  AdminCouponSummaryReport,
} from '@/lib/api/admin.service';
import type { AdminCatalogCategory, AdminProduct } from '@/types';
import { PageHeader, Panel, AdminTable } from '@/components/admin/AdminUI';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { Pill } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { cn, formatDateShort, formatPrice } from '@/lib/utils';

type ReportTab = 'sales' | 'products' | 'stock' | 'customers' | 'coupons' | 'abandoned';

interface SalesDraftFilters {
  startDate: string;
  endDate: string;
  orderStatus: string;
  paymentMethod: string;
  productId: string;
  categoryId: string;
  customerId: string;
  couponCode: string;
  shippingProvider: string;
  minValue: string;
  maxValue: string;
}

const REPORT_TABS: { key: ReportTab; label: string; reportType: AdminReportType }[] = [
  { key: 'sales', label: 'Vendas', reportType: 'Sales' },
  { key: 'products', label: 'Produtos', reportType: 'Products' },
  { key: 'stock', label: 'Estoque', reportType: 'Stock' },
  { key: 'customers', label: 'Clientes', reportType: 'Customers' },
  { key: 'coupons', label: 'Cupons', reportType: 'Coupons' },
  { key: 'abandoned', label: 'Carrinhos', reportType: 'AbandonedCarts' },
];

const ORDER_STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'AwaitingPayment', label: 'Aguardando pagamento' },
  { value: 'Paid', label: 'Pago' },
  { value: 'Preparing', label: 'Em separacao' },
  { value: 'Shipped', label: 'Enviado' },
  { value: 'Delivered', label: 'Entregue' },
  { value: 'Canceled', label: 'Cancelado' },
  { value: 'Refunded', label: 'Reembolsado' },
  { value: 'PartiallyRefunded', label: 'Parcialmente reembolsado' },
];

const REPORT_TYPE_LABEL: Record<AdminReportType, string> = {
  Sales: 'Vendas',
  Products: 'Produtos',
  Stock: 'Estoque',
  Customers: 'Clientes',
  Coupons: 'Cupons',
  AbandonedCarts: 'Carrinhos abandonados',
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  Pix: 'Pix',
  CreditCard: 'Cartao',
  Boleto: 'Boleto',
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  Pending: 'Pendente',
  Approved: 'Aprovado',
  Failed: 'Falhou',
  Expired: 'Expirado',
  Canceled: 'Cancelado',
  Refunded: 'Reembolsado',
};

const STOCK_MOVEMENT_LABEL: Record<string, string> = {
  InitialStock: 'Estoque inicial',
  ManualEntry: 'Entrada manual',
  ManualExit: 'Saida manual',
  ReservationCreated: 'Reserva criada',
  ReservationReleased: 'Reserva liberada',
  ReservationExpired: 'Reserva expirada',
  SaleConfirmed: 'Venda confirmada',
  OrderCanceled: 'Pedido cancelado',
  Return: 'Devolucao',
  InventoryCorrection: 'Correcao',
};

const emptySalesFilters: SalesDraftFilters = {
  startDate: '',
  endDate: '',
  orderStatus: '',
  paymentMethod: '',
  productId: '',
  categoryId: '',
  customerId: '',
  couponCode: '',
  shippingProvider: '',
  minValue: '',
  maxValue: '',
};

function moneyInputToNumber(value: string): number | undefined {
  const normalized = value.trim().replace(/\./g, '').replace(',', '.');
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toSalesFilters(draft: SalesDraftFilters): AdminSalesReportFilters {
  return {
    startDate: draft.startDate || undefined,
    endDate: draft.endDate || undefined,
    orderStatus: draft.orderStatus || undefined,
    paymentMethod: draft.paymentMethod || undefined,
    productId: draft.productId || undefined,
    categoryId: draft.categoryId || undefined,
    customerId: draft.customerId || undefined,
    couponCode: draft.couponCode.trim() || undefined,
    shippingProvider: draft.shippingProvider.trim() || undefined,
    minValue: moneyInputToNumber(draft.minValue),
    maxValue: moneyInputToNumber(draft.maxValue),
  };
}

function orderStatusLabel(status: string): string {
  return ORDER_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

function paymentStatusPill(status: string) {
  const tone = status === 'Approved' ? 'success' : status === 'Failed' || status === 'Expired' ? 'danger' : 'warning';
  return <Pill tone={tone}>{PAYMENT_STATUS_LABEL[status] ?? status}</Pill>;
}

function exportStatusPill(status: string) {
  if (status === 'Completed') return <Pill tone="success">Pronto</Pill>;
  if (status === 'Failed') return <Pill tone="danger">Falhou</Pill>;
  if (status === 'Expired') return <Pill tone="neutral">Expirado</Pill>;
  return <Pill tone="warning">{status}</Pill>;
}

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function downloadCsv(content: string, fileName: string, contentType = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function Metric({ label, value, tone = 'graphite' }: { label: string; value: string | number; tone?: 'graphite' | 'success' | 'warning' | 'danger' | 'info' }) {
  const colors = {
    graphite: 'text-graphite',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
    info: 'text-travel-blue',
  };

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
      <p className="text-sm text-graphite-soft">{label}</p>
      <p className={cn('mt-2 text-2xl font-semibold', colors[tone])}>{value}</p>
    </div>
  );
}

function ReportError({ error, fallback }: { error: unknown; fallback: string }) {
  return (
    <Panel>
      <p className="text-sm font-medium text-danger">{errorText(error, fallback)}</p>
    </Panel>
  );
}

function SalesReportView({
  data,
  isLoading,
  error,
  draft,
  setDraft,
  applyFilters,
  resetFilters,
  categories,
  products,
}: {
  data?: AdminSalesReport;
  isLoading: boolean;
  error: unknown;
  draft: SalesDraftFilters;
  setDraft: React.Dispatch<React.SetStateAction<SalesDraftFilters>>;
  applyFilters: () => void;
  resetFilters: () => void;
  categories: AdminCatalogCategory[];
  products: AdminProduct[];
}) {
  if (error) return <ReportError error={error} fallback="Nao foi possivel carregar o relatorio de vendas." />;

  return (
    <div className="space-y-6">
      <Panel title="Filtros de vendas">
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Inicio">{(id) => <Input id={id} type="date" value={draft.startDate} onChange={(event) => setDraft((current) => ({ ...current, startDate: event.target.value }))} />}</Field>
          <Field label="Fim">{(id) => <Input id={id} type="date" value={draft.endDate} onChange={(event) => setDraft((current) => ({ ...current, endDate: event.target.value }))} />}</Field>
          <Field label="Status">{(id) => (
            <Select id={id} value={draft.orderStatus} onChange={(event) => setDraft((current) => ({ ...current, orderStatus: event.target.value }))}>
              {ORDER_STATUS_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
            </Select>
          )}</Field>
          <Field label="Pagamento">{(id) => (
            <Select id={id} value={draft.paymentMethod} onChange={(event) => setDraft((current) => ({ ...current, paymentMethod: event.target.value }))}>
              <option value="">Todos</option>
              <option value="Pix">Pix</option>
            </Select>
          )}</Field>
          <Field label="Produto">{(id) => (
            <Select id={id} value={draft.productId} onChange={(event) => setDraft((current) => ({ ...current, productId: event.target.value }))}>
              <option value="">Todos</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </Select>
          )}</Field>
          <Field label="Categoria">{(id) => (
            <Select id={id} value={draft.categoryId} onChange={(event) => setDraft((current) => ({ ...current, categoryId: event.target.value }))}>
              <option value="">Todas</option>
              {categories.filter((category) => category.isActive).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </Select>
          )}</Field>
          <Field label="Cliente ID">{(id) => <Input id={id} inputMode="numeric" value={draft.customerId} onChange={(event) => setDraft((current) => ({ ...current, customerId: event.target.value.replace(/\D/g, '') }))} />}</Field>
          <Field label="Cupom">{(id) => <Input id={id} value={draft.couponCode} onChange={(event) => setDraft((current) => ({ ...current, couponCode: event.target.value.toUpperCase() }))} />}</Field>
          <Field label="Frete">{(id) => <Input id={id} value={draft.shippingProvider} onChange={(event) => setDraft((current) => ({ ...current, shippingProvider: event.target.value }))} />}</Field>
          <Field label="Valor minimo">{(id) => <Input id={id} inputMode="decimal" value={draft.minValue} onChange={(event) => setDraft((current) => ({ ...current, minValue: event.target.value }))} />}</Field>
          <Field label="Valor maximo">{(id) => <Input id={id} inputMode="decimal" value={draft.maxValue} onChange={(event) => setDraft((current) => ({ ...current, maxValue: event.target.value }))} />}</Field>
          <div className="flex items-end gap-2">
            <Button type="button" onClick={applyFilters}>Atualizar</Button>
            <Button type="button" variant="ghost" onClick={resetFilters}>Limpar</Button>
          </div>
        </div>
      </Panel>

      {isLoading || !data ? (
        <Skeleton className="h-96 w-full rounded-[var(--radius-lg)]" />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Metric label="Receita bruta" value={formatPrice(data.summary.grossRevenueCents)} tone="success" />
            <Metric label="Pedidos" value={data.summary.totalOrders} />
            <Metric label="Ticket medio" value={formatPrice(data.summary.averageTicketCents)} tone="info" />
            <Metric label="Itens vendidos" value={data.summary.itemsSold} />
            <Metric label="Descontos" value={formatPrice(data.summary.discountTotalCents)} tone="warning" />
            <Metric label="Frete" value={formatPrice(data.summary.shippingTotalCents)} />
            <Metric label="Pagamentos aprovados" value={data.summary.approvedPayments} tone="success" />
            <Metric label="Falhas/expirados" value={data.summary.failedOrExpiredPayments} tone="danger" />
          </div>

          <Panel title="Pedidos do periodo">
            <AdminTable
              rowKey={(item) => item.orderId}
              rows={data.items}
              empty="Nenhum pedido encontrado."
              columns={[
                { key: 'order', header: 'Pedido', render: (item) => <Link to={`/admin/pedidos/${item.orderId}`} className="font-medium text-terracotta">{item.orderNumber}</Link> },
                { key: 'date', header: 'Data', render: (item) => formatDateShort(item.createdAt) },
                { key: 'customer', header: 'Cliente', render: (item) => <div><p>{item.customerName}</p><p className="text-xs text-graphite-soft">{item.customerEmailMasked}</p></div> },
                { key: 'status', header: 'Status', render: (item) => orderStatusLabel(item.status) },
                { key: 'payment', header: 'Pagamento', render: (item) => paymentStatusPill(item.paymentStatus) },
                { key: 'method', header: 'Metodo', render: (item) => PAYMENT_METHOD_LABEL[item.paymentMethod] ?? item.paymentMethod },
                { key: 'coupon', header: 'Cupom', render: (item) => item.couponCode ?? '-' },
                { key: 'total', header: 'Total', render: (item) => formatPrice(item.totalCents) },
              ]}
            />
          </Panel>
        </>
      )}
    </div>
  );
}

function ProductReportView({ data, isLoading, error, includeMargin, setIncludeMargin }: {
  data?: AdminProductReport;
  isLoading: boolean;
  error: unknown;
  includeMargin: boolean;
  setIncludeMargin: (value: boolean) => void;
}) {
  if (error) return <ReportError error={error} fallback="Nao foi possivel carregar o relatorio de produtos." />;

  return (
    <div className="space-y-6">
      <Panel title="Filtros de produto">
        <label className="inline-flex items-center gap-3 text-sm font-medium text-graphite">
          <input type="checkbox" checked={includeMargin} onChange={(event) => setIncludeMargin(event.target.checked)} className="h-4 w-4 accent-terracotta" />
          Incluir margem quando permitido
        </label>
      </Panel>

      {isLoading || !data ? (
        <Skeleton className="h-96 w-full rounded-[var(--radius-lg)]" />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Metric label="Produtos vendidos" value={data.topProducts.length} />
            <Metric label="SKUs vendidos" value={data.topSkus.length} />
            <Metric label="Sem vendas" value={data.productsWithoutSales.length} tone="warning" />
            <Metric label="Margem estimada" value={data.marginSummary.estimatedMarginTotalCents != null ? formatPrice(data.marginSummary.estimatedMarginTotalCents) : '-'} tone={data.marginSummary.isAvailable ? 'success' : 'graphite'} />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Produtos mais vendidos">
              <AdminTable
                rowKey={(item) => item.productId}
                rows={data.topProducts}
                empty="Sem vendas registradas."
                columns={[
                  { key: 'product', header: 'Produto', render: (item) => item.productName },
                  { key: 'qty', header: 'Qtd.', render: (item) => item.quantity },
                  { key: 'revenue', header: 'Receita', render: (item) => formatPrice(item.revenueCents) },
                ]}
              />
            </Panel>
            <Panel title="SKUs mais vendidos">
              <AdminTable
                rowKey={(item) => item.productVariantId}
                rows={data.topSkus}
                empty="Sem SKUs vendidos."
                columns={[
                  { key: 'sku', header: 'SKU', render: (item) => <span className="font-mono text-xs">{item.sku}</span> },
                  { key: 'variant', header: 'Variacao', render: (item) => item.variantName },
                  { key: 'qty', header: 'Qtd.', render: (item) => item.quantity },
                  { key: 'revenue', header: 'Receita', render: (item) => formatPrice(item.revenueCents) },
                ]}
              />
            </Panel>
          </div>

          <Panel title="Produtos sem vendas">
            <AdminTable
              rowKey={(item) => item.productId}
              rows={data.productsWithoutSales}
              empty="Nenhum produto sem venda encontrado."
              columns={[
                { key: 'product', header: 'Produto', render: (item) => item.productName },
                { key: 'qty', header: 'Qtd.', render: (item) => item.quantity },
                { key: 'revenue', header: 'Receita', render: (item) => formatPrice(item.revenueCents) },
              ]}
            />
          </Panel>
        </>
      )}
    </div>
  );
}

function StockReportView({ data, isLoading, error }: { data?: AdminStockReport; isLoading: boolean; error: unknown }) {
  if (error) return <ReportError error={error} fallback="Nao foi possivel carregar o relatorio de estoque." />;

  return isLoading || !data ? (
    <Skeleton className="h-96 w-full rounded-[var(--radius-lg)]" />
  ) : (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Estoque baixo" value={data.lowStock.length} tone="warning" />
        <Metric label="Sem estoque" value={data.outOfStock.length} tone="danger" />
        <Metric label="Reservas ativas" value={data.activeReservations} tone="info" />
        <Metric label="Reservas expiradas" value={data.expiredReservations} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Baixo estoque">
          <AdminTable
            rowKey={(item) => item.productVariantId}
            rows={data.lowStock}
            empty="Nenhum SKU em baixo estoque."
            columns={[
              { key: 'sku', header: 'SKU', render: (item) => <span className="font-mono text-xs">{item.sku}</span> },
              { key: 'product', header: 'Produto', render: (item) => item.productName },
              { key: 'available', header: 'Disponivel', render: (item) => item.availableQuantity },
              { key: 'min', header: 'Min.', render: (item) => item.minimumStock },
            ]}
          />
        </Panel>
        <Panel title="Sem estoque">
          <AdminTable
            rowKey={(item) => item.productVariantId}
            rows={data.outOfStock}
            empty="Nenhum SKU zerado."
            columns={[
              { key: 'sku', header: 'SKU', render: (item) => <span className="font-mono text-xs">{item.sku}</span> },
              { key: 'product', header: 'Produto', render: (item) => item.productName },
              { key: 'reserved', header: 'Reservado', render: (item) => item.reservedQuantity },
              { key: 'stock', header: 'Fisico', render: (item) => item.stockQuantity },
            ]}
          />
        </Panel>
      </div>

      <Panel title="Movimentacoes recentes">
        <AdminTable
          rowKey={(item) => item.id}
          rows={data.recentMovements}
          empty="Nenhuma movimentacao recente."
          columns={[
            { key: 'date', header: 'Data', render: (item) => formatDateShort(item.createdAt) },
            { key: 'sku', header: 'SKU', render: (item) => <span className="font-mono text-xs">{item.sku}</span> },
            { key: 'type', header: 'Tipo', render: (item) => STOCK_MOVEMENT_LABEL[item.type] ?? item.type },
            { key: 'qty', header: 'Qtd.', render: (item) => item.quantity },
            { key: 'reason', header: 'Motivo', render: (item) => item.reason ?? '-' },
          ]}
        />
      </Panel>
    </div>
  );
}

function CustomerReportView({
  data,
  isLoading,
  error,
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  applyFilters,
}: {
  data?: AdminCustomerReport;
  isLoading: boolean;
  error: unknown;
  startDate: string;
  endDate: string;
  setStartDate: (value: string) => void;
  setEndDate: (value: string) => void;
  applyFilters: () => void;
}) {
  if (error) return <ReportError error={error} fallback="Nao foi possivel carregar o relatorio de clientes." />;

  return (
    <div className="space-y-6">
      <Panel title="Filtros de clientes">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <Field label="Inicio">{(id) => <Input id={id} type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />}</Field>
          <Field label="Fim">{(id) => <Input id={id} type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />}</Field>
          <div className="flex items-end">
            <Button type="button" onClick={applyFilters}>Atualizar</Button>
          </div>
        </div>
      </Panel>

      {isLoading || !data ? (
        <Skeleton className="h-96 w-full rounded-[var(--radius-lg)]" />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Metric label="Novos clientes" value={data.newCustomers} />
            <Metric label="Recorrentes" value={data.recurringCustomers} tone="success" />
            <Metric label="Aceite marketing" value={data.marketingConsentCustomers} tone="info" />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Clientes por valor comprado">
              <AdminTable
                rowKey={(item) => item.userId}
                rows={data.topCustomers}
                empty="Nenhum cliente encontrado."
                columns={[
                  { key: 'name', header: 'Cliente', render: (item) => <div><p>{item.name}</p><p className="text-xs text-graphite-soft">{item.emailMasked}</p></div> },
                  { key: 'orders', header: 'Pedidos', render: (item) => item.paidOrders },
                  { key: 'spent', header: 'Total', render: (item) => formatPrice(item.totalSpentCents) },
                ]}
              />
            </Panel>
            <Panel title="Aniversariantes">
              <AdminTable
                rowKey={(item) => item.userId}
                rows={data.birthdays}
                empty="Nenhum aniversariante encontrado."
                columns={[
                  { key: 'name', header: 'Cliente', render: (item) => item.name },
                  { key: 'email', header: 'E-mail', render: (item) => item.emailMasked },
                  { key: 'created', header: 'Cadastro', render: (item) => formatDateShort(item.createdAt) },
                ]}
              />
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

function CouponReportView({ data, isLoading, error }: { data?: AdminCouponSummaryReport; isLoading: boolean; error: unknown }) {
  if (error) return <ReportError error={error} fallback="Nao foi possivel carregar o relatorio de cupons." />;

  return isLoading || !data ? (
    <Skeleton className="h-96 w-full rounded-[var(--radius-lg)]" />
  ) : (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-5">
        <Metric label="Cupons" value={data.totalCoupons} />
        <Metric label="Ativos" value={data.activeCoupons} tone="success" />
        <Metric label="Reservados" value={data.reservedUsages} tone="warning" />
        <Metric label="Consumidos" value={data.consumedUsages} tone="info" />
        <Metric label="Desconto usado" value={formatPrice(data.consumedDiscountTotalCents)} />
      </div>

      <Panel title="Desempenho de cupons">
        <AdminTable
          rowKey={(item) => item.couponId}
          rows={data.coupons}
          empty="Nenhum cupom encontrado."
          columns={[
            { key: 'code', header: 'Cupom', render: (item) => <span className="font-mono text-xs">{item.code}</span> },
            { key: 'status', header: 'Status', render: (item) => item.status },
            { key: 'reserved', header: 'Reservas', render: (item) => item.reservedCount },
            { key: 'consumed', header: 'Usos', render: (item) => item.consumedCount },
            { key: 'discount', header: 'Desconto', render: (item) => formatPrice(item.discountTotalCents) },
          ]}
        />
      </Panel>
    </div>
  );
}

function AbandonedCartReportView({
  data,
  isLoading,
  error,
  olderThanHours,
  setOlderThanHours,
  applyFilters,
}: {
  data?: AdminAbandonedCartReport;
  isLoading: boolean;
  error: unknown;
  olderThanHours: string;
  setOlderThanHours: (value: string) => void;
  applyFilters: () => void;
}) {
  if (error) return <ReportError error={error} fallback="Nao foi possivel carregar o relatorio de carrinhos abandonados." />;

  return (
    <div className="space-y-6">
      <Panel title="Filtro de abandono">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <Field label="Horas sem atualizacao">{(id) => <Input id={id} type="number" min={1} max={720} value={olderThanHours} onChange={(event) => setOlderThanHours(event.target.value)} />}</Field>
          <div className="flex items-end">
            <Button type="button" onClick={applyFilters}>Atualizar</Button>
          </div>
        </div>
      </Panel>

      {isLoading || !data ? (
        <Skeleton className="h-96 w-full rounded-[var(--radius-lg)]" />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Metric label="Carrinhos" value={data.totalCount} tone="warning" />
            <Metric label="Itens" value={data.items.reduce((sum, item) => sum + item.itemsCount, 0)} />
            <Metric label="Valor estimado" value={formatPrice(data.items.reduce((sum, item) => sum + item.estimatedTotalCents, 0))} tone="success" />
          </div>

          <Panel title="Carrinhos elegiveis">
            <AdminTable
              rowKey={(item) => item.cartId}
              rows={data.items}
              empty="Nenhum carrinho encontrado."
              columns={[
                { key: 'cart', header: 'Carrinho', render: (item) => <span className="font-mono text-xs">#{item.cartId}</span> },
                { key: 'customer', header: 'Cliente', render: (item) => item.customerName ? <div><p>{item.customerName}</p><p className="text-xs text-graphite-soft">{item.customerEmailMasked}</p></div> : 'Anônimo' },
                { key: 'items', header: 'Itens', render: (item) => item.itemsCount },
                { key: 'total', header: 'Estimado', render: (item) => formatPrice(item.estimatedTotalCents) },
                { key: 'updated', header: 'Atualizado', render: (item) => formatDateShort(item.updatedAt ?? item.createdAt) },
                { key: 'expires', header: 'Expira', render: (item) => formatDateShort(item.expiresAt) },
              ]}
            />
          </Panel>
        </>
      )}
    </div>
  );
}

function ExportPanel({
  activeReportType,
  exports,
  setExports,
}: {
  activeReportType: AdminReportType;
  exports: AdminReportExport[];
  setExports: React.Dispatch<React.SetStateAction<AdminReportExport[]>>;
}) {
  const queryClient = useQueryClient();
  const [reportType, setReportType] = useState<AdminReportType>(activeReportType);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [includeSensitiveData, setIncludeSensitiveData] = useState(false);

  const createExport = useMutation({
    mutationFn: () => adminService.createReportExport({
      reportType,
      format: 'Csv',
      includeSensitiveData,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    onSuccess: (exportRecord) => {
      setExports((current) => [exportRecord, ...current.filter((item) => item.id !== exportRecord.id)]);
      queryClient.setQueryData(queryKeys.admin.reportExport(exportRecord.id), exportRecord);
      toast.success('Exportacao CSV criada.');
    },
    onError: (error) => toast.error(errorText(error, 'Nao foi possivel criar a exportacao.')),
  });

  const refreshExport = useMutation({
    mutationFn: (id: string) => adminService.getReportExport(id),
    onSuccess: (exportRecord) => {
      setExports((current) => current.map((item) => item.id === exportRecord.id ? exportRecord : item));
      toast.success('Status atualizado.');
    },
    onError: (error) => toast.error(errorText(error, 'Nao foi possivel consultar a exportacao.')),
  });

  const downloadExport = useMutation({
    mutationFn: async (exportRecord: AdminReportExport) => ({
      exportRecord,
      content: await adminService.downloadReportExport(exportRecord.id),
    }),
    onSuccess: ({ exportRecord, content }) => {
      downloadCsv(content, exportRecord.fileName, exportRecord.contentType);
      toast.success('Download iniciado.');
    },
    onError: (error) => toast.error(errorText(error, 'Nao foi possivel baixar a exportacao.')),
  });

  return (
    <Panel title="Exportações">
      <div className="space-y-4">
        <Field label="Relatorio">
          {(id) => (
            <Select id={id} value={reportType} onChange={(event) => setReportType(event.target.value as AdminReportType)}>
              {REPORT_TABS.map((item) => <option key={item.reportType} value={item.reportType}>{REPORT_TYPE_LABEL[item.reportType]}</option>)}
            </Select>
          )}
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Inicio">{(id) => <Input id={id} type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />}</Field>
          <Field label="Fim">{(id) => <Input id={id} type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />}</Field>
        </div>

        <label className="inline-flex items-center gap-3 text-sm font-medium text-graphite">
          <input type="checkbox" checked={includeSensitiveData} onChange={(event) => setIncludeSensitiveData(event.target.checked)} className="h-4 w-4 accent-terracotta" />
          Dados sensiveis
        </label>

        <Button fullWidth loading={createExport.isPending} onClick={() => createExport.mutate()}>
          <FileCsv size={17} /> Gerar CSV
        </Button>

        <div className="space-y-3">
          {exports.length === 0 ? (
            <p className="rounded-[var(--radius-md)] bg-cream-light/60 p-3 text-sm text-graphite-soft">Nenhuma exportacao nesta sessao.</p>
          ) : exports.map((exportRecord) => (
            <div key={exportRecord.id} className="rounded-[var(--radius-md)] border border-border p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-graphite">{REPORT_TYPE_LABEL[exportRecord.reportType as AdminReportType] ?? exportRecord.reportType}</p>
                  <p className="mt-1 break-all text-xs text-graphite-soft">{exportRecord.fileName}</p>
                </div>
                {exportStatusPill(exportRecord.status)}
              </div>
              <p className="mt-2 text-xs text-graphite-soft">Expira em {formatDateShort(exportRecord.expiresAt)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" loading={downloadExport.isPending} onClick={() => downloadExport.mutate(exportRecord)}>
                  <DownloadSimple size={15} /> Baixar
                </Button>
                <Button size="sm" variant="ghost" loading={refreshExport.isPending} onClick={() => refreshExport.mutate(exportRecord.id)}>
                  <ArrowClockwise size={15} /> Status
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

export function AdminReports() {
  const [activeTab, setActiveTab] = useState<ReportTab>('sales');
  const [salesDraft, setSalesDraft] = useState<SalesDraftFilters>(emptySalesFilters);
  const [salesFilters, setSalesFilters] = useState<AdminSalesReportFilters>({});
  const [includeMargin, setIncludeMargin] = useState(false);
  const [customerStartDraft, setCustomerStartDraft] = useState('');
  const [customerEndDraft, setCustomerEndDraft] = useState('');
  const [customerFilters, setCustomerFilters] = useState<{ startDate?: string; endDate?: string }>({});
  const [olderThanDraft, setOlderThanDraft] = useState('24');
  const [olderThanHours, setOlderThanHours] = useState(24);
  const [exports, setExports] = useState<AdminReportExport[]>([]);

  const activeReportType = REPORT_TABS.find((item) => item.key === activeTab)?.reportType ?? 'Sales';

  const categoriesQuery = useQuery({
    queryKey: queryKeys.admin.categories,
    queryFn: () => adminService.listAdminCategories(),
    enabled: activeTab === 'sales',
  });
  const productsQuery = useQuery({
    queryKey: [...queryKeys.admin.products, { page: 1, pageSize: 100 }] as const,
    queryFn: () => adminService.listAdminProducts({ page: 1, pageSize: 100 }),
    enabled: activeTab === 'sales',
  });
  const salesQuery = useQuery({
    queryKey: queryKeys.admin.salesReport(salesFilters),
    queryFn: () => adminService.getSalesReport(salesFilters),
    enabled: activeTab === 'sales',
  });
  const productQuery = useQuery({
    queryKey: queryKeys.admin.productReport(includeMargin),
    queryFn: () => adminService.getProductReport(includeMargin),
    enabled: activeTab === 'products',
  });
  const stockQuery = useQuery({
    queryKey: queryKeys.admin.stockReport,
    queryFn: () => adminService.getStockReport(),
    enabled: activeTab === 'stock',
  });
  const customerQuery = useQuery({
    queryKey: queryKeys.admin.customerReport(customerFilters),
    queryFn: () => adminService.getCustomerReport(customerFilters),
    enabled: activeTab === 'customers',
  });
  const couponQuery = useQuery({
    queryKey: queryKeys.admin.couponReport,
    queryFn: () => adminService.getCouponSummaryReport(),
    enabled: activeTab === 'coupons',
  });
  const abandonedQuery = useQuery({
    queryKey: queryKeys.admin.abandonedCartReport(olderThanHours),
    queryFn: () => adminService.getAbandonedCartReport(olderThanHours),
    enabled: activeTab === 'abandoned',
  });

  const tabContent = useMemo(() => {
    if (activeTab === 'sales') {
      return (
        <SalesReportView
          data={salesQuery.data}
          isLoading={salesQuery.isLoading || categoriesQuery.isLoading || productsQuery.isLoading}
          error={salesQuery.error}
          draft={salesDraft}
          setDraft={setSalesDraft}
          applyFilters={() => setSalesFilters(toSalesFilters(salesDraft))}
          resetFilters={() => {
            setSalesDraft(emptySalesFilters);
            setSalesFilters({});
          }}
          categories={categoriesQuery.data ?? []}
          products={productsQuery.data ?? []}
        />
      );
    }

    if (activeTab === 'products') {
      return <ProductReportView data={productQuery.data} isLoading={productQuery.isLoading} error={productQuery.error} includeMargin={includeMargin} setIncludeMargin={setIncludeMargin} />;
    }

    if (activeTab === 'stock') {
      return <StockReportView data={stockQuery.data} isLoading={stockQuery.isLoading} error={stockQuery.error} />;
    }

    if (activeTab === 'customers') {
      return (
        <CustomerReportView
          data={customerQuery.data}
          isLoading={customerQuery.isLoading}
          error={customerQuery.error}
          startDate={customerStartDraft}
          endDate={customerEndDraft}
          setStartDate={setCustomerStartDraft}
          setEndDate={setCustomerEndDraft}
          applyFilters={() => setCustomerFilters({
            startDate: customerStartDraft || undefined,
            endDate: customerEndDraft || undefined,
          })}
        />
      );
    }

    if (activeTab === 'coupons') {
      return <CouponReportView data={couponQuery.data} isLoading={couponQuery.isLoading} error={couponQuery.error} />;
    }

    return (
      <AbandonedCartReportView
        data={abandonedQuery.data}
        isLoading={abandonedQuery.isLoading}
        error={abandonedQuery.error}
        olderThanHours={olderThanDraft}
        setOlderThanHours={setOlderThanDraft}
        applyFilters={() => {
          const parsed = Number(olderThanDraft);
          setOlderThanHours(Number.isFinite(parsed) ? Math.min(720, Math.max(1, parsed)) : 24);
        }}
      />
    );
  }, [
    abandonedQuery.data,
    abandonedQuery.error,
    abandonedQuery.isLoading,
    activeTab,
    categoriesQuery.data,
    categoriesQuery.isLoading,
    couponQuery.data,
    couponQuery.error,
    couponQuery.isLoading,
    customerEndDraft,
    customerQuery.data,
    customerQuery.error,
    customerQuery.isLoading,
    customerStartDraft,
    includeMargin,
    olderThanDraft,
    productQuery.data,
    productQuery.error,
    productQuery.isLoading,
    productsQuery.data,
    productsQuery.isLoading,
    salesDraft,
    salesQuery.data,
    salesQuery.error,
    salesQuery.isLoading,
    stockQuery.data,
    stockQuery.error,
    stockQuery.isLoading,
  ]);

  return (
    <div>
      <PageHeader
        title="Relatórios"
        subtitle="Vendas, produtos, estoque, clientes, cupons e carrinhos."
        action={<Pill tone="info"><ChartBar size={14} /> {REPORT_TYPE_LABEL[activeReportType]}</Pill>}
      />

      <div className="mb-6 overflow-x-auto">
        <div className="flex min-w-max gap-2">
          {REPORT_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'tactile rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                activeTab === tab.key ? 'border-graphite bg-graphite text-cream-light' : 'border-border bg-surface text-graphite hover:border-graphite',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.55fr]">
        <div>{tabContent}</div>
        <ExportPanel activeReportType={activeReportType} exports={exports} setExports={setExports} />
      </div>
    </div>
  );
}
