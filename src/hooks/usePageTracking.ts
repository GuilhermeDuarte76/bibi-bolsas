import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { analytics } from '@/lib/analytics';

/**
 * Dispara `page_view` a cada troca de rota.
 *
 * Numa SPA o navegador nao recarrega, entao o GA4 so contaria a primeira tela
 * se ninguem avisasse. Por isso o gtag e configurado com `send_page_view:false`
 * e a contagem passa a ser feita aqui.
 *
 * O pequeno atraso existe para o titulo da pagina ja ter sido atualizado por
 * `usePageMeta` — sem ele, toda visita seria registrada com o titulo da tela
 * anterior.
 */
export function usePageTracking(): void {
  const location = useLocation();
  const path = `${location.pathname}${location.search}`;

  useEffect(() => {
    const timer = window.setTimeout(() => analytics.pageView(path, document.title), 150);
    return () => window.clearTimeout(timer);
  }, [path]);
}
