import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Container } from '@/components/ui/Layout';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Protege rotas do cliente. No backend real, a sessao vem de cookie HttpOnly;
 * o front apenas reage. Lembrete: esconder rota nao e seguranca — a API valida
 * tudo (PLANEJAMENTO.md secao 12).
 */
export function RequireAuth({ children, admin }: { children: React.ReactNode; admin?: boolean }) {
  const { isLoading, isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <Container className="py-16">
        <Skeleton className="h-64 w-full rounded-[var(--radius-xl)]" />
      </Container>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={admin ? '/admin/login' : '/entrar'} state={{ from: location }} replace />;
  }
  if (admin && !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}
