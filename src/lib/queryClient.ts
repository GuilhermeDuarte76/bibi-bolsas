import { QueryClient } from '@tanstack/react-query';

/**
 * Cliente do TanStack Query — cache de catalogo, sincronizacao com a API e
 * estados de loading/erro (PLANEJAMENTO.md secao 2). Retentativa controlada
 * conforme docs/FRONTEND-PLANEJAMENTO.md secao 10/11.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min — catalogo muda pouco
      gcTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
