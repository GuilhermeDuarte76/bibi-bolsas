import type { OrderStatus } from '@/types';
import { Pill } from '@/components/ui/Badge';

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: 'Aguardando pagamento',
  paid: 'Pago',
  processing: 'Em separação',
  shipped: 'Enviado',
  delivered: 'Entregue',
  canceled: 'Cancelado',
  refunded: 'Reembolsado',
};

const TONE: Record<OrderStatus, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  pending_payment: 'warning',
  paid: 'info',
  processing: 'info',
  shipped: 'info',
  delivered: 'success',
  canceled: 'danger',
  refunded: 'neutral',
};

export function OrderStatusPill({ status }: { status: OrderStatus }) {
  return <Pill tone={TONE[status]}>{ORDER_STATUS_LABEL[status]}</Pill>;
}

/** Etapas da maquina de estados para a timeline do pedido. */
export const ORDER_FLOW: OrderStatus[] = ['paid', 'processing', 'shipped', 'delivered'];
