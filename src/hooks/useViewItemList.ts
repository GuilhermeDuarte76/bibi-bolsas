import { useEffect, useRef } from 'react';
import { analytics } from '@/lib/analytics';
import type { ProductSummary } from '@/types';

/**
 * Dispara `view_item_list` quando uma vitrine termina de carregar.
 *
 * A trava por chave evita recontar a mesma lista a cada re-render (troca de
 * cor no card, foco, revalidacao do cache) — sem isso a impressao de produto
 * ficaria inflada e o CTR do relatorio, subestimado.
 */
export function useViewItemList(listName: string, products?: ProductSummary[], key?: string): void {
  const reported = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!products?.length) return;
    const signature = `${listName}|${key ?? ''}|${products.map((item) => item.id).join(',')}`;
    if (reported.current === signature) return;
    reported.current = signature;
    analytics.viewItemList(listName, products);
  }, [listName, products, key]);
}
