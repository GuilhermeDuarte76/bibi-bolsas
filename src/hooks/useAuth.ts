import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService, queryKeys, type Session } from '@/lib/api';

/**
 * Hook de autenticacao apoiado no TanStack Query.
 * A sessao real virá de um cookie HttpOnly; aqui ela é lida via authService.
 */
export function useAuth() {
  const qc = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: queryKeys.session,
    queryFn: () => authService.getSession(),
    staleTime: 1000 * 60 * 10,
  });

  const setSession = (s: Session) => qc.setQueryData(queryKeys.session, s);

  const login = useMutation({
    mutationFn: (vars: { email: string; password: string }) =>
      authService.login(vars.email, vars.password),
    onSuccess: setSession,
  });

  const register = useMutation({
    mutationFn: (vars: { name: string; email: string; password: string }) =>
      authService.register(vars),
    onSuccess: setSession,
  });

  const adminLogin = useMutation({
    mutationFn: (vars: { email: string; password: string; otp?: string }) =>
      authService.adminLogin(vars.email, vars.password, vars.otp),
    onSuccess: setSession,
  });

  const logout = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => qc.setQueryData(queryKeys.session, null),
  });

  const session = sessionQuery.data ?? null;

  return {
    session,
    isLoading: sessionQuery.isLoading,
    isAuthenticated: !!session,
    isAdmin: !!session?.isAdmin,
    customer: session?.customer ?? null,
    login,
    register,
    adminLogin,
    logout,
  };
}
