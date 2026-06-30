import type { Customer } from '@/types';
import { AUTH_STORAGE_KEY, USE_MOCK } from './config';
import { delay, http } from './http';
import { customer as mockCustomer } from './mock/account';

export interface Session {
  customer: Customer;
  isAdmin: boolean;
}

/**
 * Autenticacao.
 *
 * No backend real, o login devolve um cookie HttpOnly com refresh token e um
 * access token curto (PLANEJAMENTO.md secao 13). Aqui simulamos persistindo um
 * sinal de sessao no localStorage apenas para a demo navegar entre rotas privadas.
 */
export const authService = {
  async login(email: string, _password: string): Promise<Session> {
    if (USE_MOCK) {
      const session: Session = { customer: { ...mockCustomer, email }, isAdmin: false };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
      return delay(session, 700);
    }
    // TODO(backend): POST /auth/login — define cookie HttpOnly + retorna perfil
    return http<Session>('/auth/login', { method: 'POST', body: { email, password: _password } });
  },

  async register(input: { name: string; email: string; password: string }): Promise<Session> {
    if (USE_MOCK) {
      const session: Session = {
        customer: { ...mockCustomer, name: input.name, email: input.email },
        isAdmin: false,
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
      return delay(session, 700);
    }
    // TODO(backend): POST /auth/register
    return http<Session>('/auth/register', { method: 'POST', body: input });
  },

  /** Login administrativo — exige MFA no backend real. */
  async adminLogin(email: string, _password: string, _otp?: string): Promise<Session> {
    if (USE_MOCK) {
      const session: Session = {
        customer: { ...mockCustomer, name: 'Guilherme Duarte', email },
        isAdmin: true,
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
      return delay(session, 700);
    }
    // TODO(backend): POST /auth/admin/login — valida MFA obrigatorio
    return http<Session>('/auth/admin/login', {
      method: 'POST',
      body: { email, password: _password, otp: _otp },
    });
  },

  async getSession(): Promise<Session | null> {
    if (USE_MOCK) {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      return delay(raw ? (JSON.parse(raw) as Session) : null, 120);
    }
    // TODO(backend): GET /auth/session (usa refresh cookie)
    try {
      return await http<Session>('/auth/session');
    } catch {
      return null;
    }
  },

  async logout(): Promise<void> {
    if (USE_MOCK) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return delay(undefined, 120);
    }
    // TODO(backend): POST /auth/logout — revoga sessao
    return http<void>('/auth/logout', { method: 'POST' });
  },

  async requestPasswordReset(email: string): Promise<void> {
    if (USE_MOCK) return delay(undefined, 500);
    // TODO(backend): POST /auth/password/forgot
    return http<void>('/auth/password/forgot', { method: 'POST', body: { email } });
  },
};
