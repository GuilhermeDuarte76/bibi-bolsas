import { Pill } from '@/components/ui/Badge';

/**
 * Indicador de estoque que NAO depende apenas de cor (acessibilidade,
 * FRONTEND-PLANEJAMENTO.md secao 9). Inclui texto sempre.
 */
export function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0) return <Pill tone="danger">Esgotado</Pill>;
  if (stock <= 3) return <Pill tone="warning">Últimas {stock} unidades</Pill>;
  if (stock <= 8) return <Pill tone="info">Poucas unidades</Pill>;
  return <Pill tone="success">Em estoque</Pill>;
}
