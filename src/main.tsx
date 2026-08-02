import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { queryClient } from '@/lib/queryClient';
import { Toaster } from '@/components/ui/Toast';
import { analytics } from '@/lib/analytics';
import './index.css';

/*
 * Prepara o Consent Mode e reaplica a decisao salva antes de qualquer render.
 * Sem ID configurado no `.env`, nao carrega script nenhum.
 */
analytics.init();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster />
    </QueryClientProvider>
  </StrictMode>,
);
