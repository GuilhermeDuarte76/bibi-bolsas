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

  async register(input: { name: string; email: string; password: string }): Promise<Session> {
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

    return authenticate(input.email, input.password);
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

    if (!getAuthTokens()) return null;

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
      const tokens = getAuthTokens();
      if (tokens) {
        await http<void>('/auth/revoke', {
          method: 'POST',
          retryOnUnauthorized: false,
          body: { refreshToken: tokens.refreshToken },
        });
      }
    } finally {
      clearAuthTokens();
    }
  },

  async requestPasswordReset(email: string): Promise<void> {
    if (USE_MOCK) return delay(undefined, 500);
    return http<void>('/auth/forgot-password', { method: 'POST', auth: false, body: { email } });
  },
};
