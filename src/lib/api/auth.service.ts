import type { Customer } from '@/types';
import { AUTH_STORAGE_KEY, USE_MOCK } from './config';
import {
  ApiError,
  clearAuthTokens,
  delay,
  getAuthTokens,
  http,
  isAuthenticationError,
  refreshAuthTokens,
  setAuthTokens,
  type AuthTokenContract,
  type BackendUserContract,
} from './http';
import { customer as mockCustomer } from './mock/account';
import { accountService } from './account.service';

export interface Session {
  customer: Customer;
  isAdmin: boolean;
}

function mapBackendUserToCustomer(user: BackendUserContract): Customer {
  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

function mapBackendUserToSession(user: BackendUserContract): Session {
  const role = user.role.toLowerCase();

  return {
    customer: mapBackendUserToCustomer(user),
    // O front ainda chama isso de isAdmin, mas a area operacional tambem usa esse acesso.
    isAdmin: role === 'admin' || role === 'employee',
  };
}

function canUseBrowserStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function cacheSession(session: Session): void {
  if (!canUseBrowserStorage()) return;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

function readCachedSession(): Session | null {
  if (!canUseBrowserStorage()) return null;

  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as Session;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

async function authenticate(email: string, password: string): Promise<Session> {
  const token = await http<AuthTokenContract>('/auth/login', {
    method: 'POST',
    auth: false,
    body: { email, password },
  });

  setAuthTokens(token);
  const session = mapBackendUserToSession(token.user);
  cacheSession(session);
  return session;
}

async function revokeCurrentSession(): Promise<void> {
  await http<void>('/auth/revoke', {
    method: 'POST',
    retryOnUnauthorized: true,
  });
}

/** Autenticacao. */
export const authService = {
  async login(email: string, password: string): Promise<Session> {
    if (USE_MOCK) {
      const session: Session = { customer: { ...mockCustomer, email }, isAdmin: false };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
      return delay(session, 700);
    }

    return authenticate(email, password);
  },

  async register(input: {
    name: string;
    email: string;
    password: string;
    /** Aceite de marketing marcado no cadastro (opcional, revogavel depois). */
    marketingConsent?: boolean;
  }): Promise<Session> {
    if (USE_MOCK) {
      const session: Session = {
        customer: { ...mockCustomer, name: input.name, email: input.email },
        isAdmin: false,
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
      return delay(session, 700);
    }

    await http<BackendUserContract>('/auth/register', {
      method: 'POST',
      auth: false,
      body: {
        name: input.name,
        email: input.email,
        password: input.password,
        confirmPassword: input.password,
      },
    });

    const session = await authenticate(input.email, input.password);

    /*
     * O aceite exige sessao, por isso vai depois do login.
     * Falhar aqui nao pode derrubar o cadastro: a conta ja existe e o aceite
     * pode ser dado de novo em Minha conta.
     */
    if (input.marketingConsent) {
      try {
        await accountService.setMarketingConsent(true);
      } catch {
        // silencioso de proposito — ver comentario acima
      }
    }

    return session;
  },

  async adminLogin(email: string, password: string, _otp?: string): Promise<Session> {
    if (USE_MOCK) {
      const session: Session = {
        customer: { ...mockCustomer, name: 'Guilherme Duarte', email },
        isAdmin: true,
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
      return delay(session, 700);
    }

    const session = await authenticate(email, password);
    if (!session.isAdmin) {
      try {
        await revokeCurrentSession();
      } catch {
        // O cookie tambem expira sozinho; nao bloqueia a mensagem correta de acesso negado.
      }

      clearAuthTokens();
      localStorage.removeItem(AUTH_STORAGE_KEY);
      throw new ApiError('Este usuario nao possui acesso administrativo.', 403);
    }

    return session;
  },

  async getSession(): Promise<Session | null> {
    if (USE_MOCK) {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      return delay(raw ? (JSON.parse(raw) as Session) : null, 120);
    }

    if (!getAuthTokens()) {
      const refreshed = await refreshAuthTokens();
      if (refreshed) {
        const session = mapBackendUserToSession(refreshed.user);
        cacheSession(session);
        return session;
      }

      return null;
    }

    try {
      const user = await http<BackendUserContract>('/me');
      const session = mapBackendUserToSession(user);
      cacheSession(session);
      return session;
    } catch (error) {
      if (!isAuthenticationError(error)) {
        const cachedSession = readCachedSession();
        if (cachedSession) return cachedSession;
        throw error;
      }

      const refreshed = await refreshAuthTokens();
      if (refreshed) {
        const session = mapBackendUserToSession(refreshed.user);
        cacheSession(session);
        return session;
      }

      if (getAuthTokens()) {
        try {
          const user = await http<BackendUserContract>('/me', { retryOnUnauthorized: false });
          const session = mapBackendUserToSession(user);
          cacheSession(session);
          return session;
        } catch (sessionError) {
          if (!isAuthenticationError(sessionError)) {
            const cachedSession = readCachedSession();
            if (cachedSession) return cachedSession;
            throw sessionError;
          }
        }
      }

      clearAuthTokens();
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
  },

  async logout(): Promise<void> {
    localStorage.removeItem(AUTH_STORAGE_KEY);

    if (USE_MOCK) return delay(undefined, 120);

    try {
      if (getAuthTokens()) await revokeCurrentSession();
    } finally {
      clearAuthTokens();
    }
  },

  /**
   * Pede o link de redefinicao.
   *
   * O backend sempre responde sucesso, exista ou nao a conta — e proposital:
   * responder "e-mail nao encontrado" entregaria a terceiros quais e-mails
   * tem cadastro na loja. Em desenvolvimento ele devolve `devResetToken`,
   * que a tela usa para seguir o fluxo sem caixa de entrada configurada.
   */
  async requestPasswordReset(email: string): Promise<{ devResetToken?: string }> {
    if (USE_MOCK) return delay({ devResetToken: 'token-de-desenvolvimento' }, 500);
    return http<{ devResetToken?: string }>('/auth/forgot-password', {
      method: 'POST',
      auth: false,
      body: { email },
    });
  },

  /**
   * Redefine a senha com o token recebido por e-mail.
   *
   * ⚠️  O formato do corpo segue a convencao dos demais endpoints de auth
   * (que usam `confirmPassword`), mas nao foi possivel conferir o DTO real de
   * `POST /api/auth/reset-password` — confirme com o backend antes de subir.
   */
  async resetPassword(input: {
    email: string;
    token: string;
    password: string;
  }): Promise<void> {
    if (USE_MOCK) return delay(undefined, 700);
    return http<void>('/auth/reset-password', {
      method: 'POST',
      auth: false,
      body: {
        email: input.email,
        token: input.token,
        newPassword: input.password,
        confirmPassword: input.password,
      },
    });
  },
};
