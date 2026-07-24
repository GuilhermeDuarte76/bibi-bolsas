import {
  API_BASE_PATH,
  API_URL,
  AUTH_TOKEN_EXPIRES_AT_STORAGE_KEY,
  AUTH_TOKEN_STORAGE_KEY,
  AUTH_TOKEN_TYPE_STORAGE_KEY,
  CART_SESSION_STORAGE_KEY,
  MOCK_LATENCY,
  REFRESH_TOKEN_STORAGE_KEY,
} from './config';

/**
 * Cliente HTTP fino para a API .NET.
 * O backend retorna o envelope padrao: { success, data, message }.
 */

export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  message: string;
}

export interface BackendUserContract {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  emailConfirmed: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
}

export interface StoredAuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresAt: string;
}

export interface AuthTokenContract extends StoredAuthTokens {
  user: BackendUserContract;
}

const ACCESS_TOKEN_REFRESH_SKEW_MS = 60 * 1000;
let refreshTokensPromise: Promise<AuthTokenContract | null> | null = null;

export interface ApiErrorPayload {
  success?: boolean;
  data?: unknown;
  message?: string;
  errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  status: number;
  payload?: ApiErrorPayload;

  constructor(message: string, status: number, payload?: ApiErrorPayload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Querystring serializada automaticamente. */
  query?: Record<string, unknown>;
  /** Envia Authorization: Bearer quando houver access token. */
  auth?: boolean;
  /** Tenta renovar o token uma vez ao receber 401. */
  retryOnUnauthorized?: boolean;
  /** Mantem o envelope inteiro quando necessario. */
  unwrapEnvelope?: boolean;
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getAuthTokens(): StoredAuthTokens | null {
  if (!canUseStorage()) return null;

  const accessToken = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  if (!accessToken || !refreshToken) return null;

  return {
    accessToken,
    refreshToken,
    tokenType: localStorage.getItem(AUTH_TOKEN_TYPE_STORAGE_KEY) || 'Bearer',
    expiresAt: localStorage.getItem(AUTH_TOKEN_EXPIRES_AT_STORAGE_KEY) || '',
  };
}

export function setAuthTokens(tokens: StoredAuthTokens): void {
  if (!canUseStorage()) return;

  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, tokens.refreshToken);
  localStorage.setItem(AUTH_TOKEN_TYPE_STORAGE_KEY, tokens.tokenType || 'Bearer');
  localStorage.setItem(AUTH_TOKEN_EXPIRES_AT_STORAGE_KEY, tokens.expiresAt);
}

export function clearAuthTokens(): void {
  if (!canUseStorage()) return;

  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(AUTH_TOKEN_TYPE_STORAGE_KEY);
  localStorage.removeItem(AUTH_TOKEN_EXPIRES_AT_STORAGE_KEY);
}

function shouldRefreshAccessToken(expiresAt: string): boolean {
  const expiresAtMs = Date.parse(expiresAt);
  return Number.isFinite(expiresAtMs) && expiresAtMs - Date.now() <= ACCESS_TOKEN_REFRESH_SKEW_MS;
}

function buildUrl(path: string, query?: Record<string, unknown>): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const normalizedBasePath = API_BASE_PATH.startsWith('/') ? API_BASE_PATH : `/${API_BASE_PATH}`;
  const base = `${API_URL}${normalizedBasePath.replace(/\/+$/, '')}${normalizedPath}`;
  if (!query) return base;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) value.forEach((v) => params.append(key, String(v)));
    else params.append(key, String(value));
  }

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

function isApiEnvelope<T>(value: unknown): value is ApiEnvelope<T> {
  if (!value || typeof value !== 'object') return false;
  return 'success' in value && 'data' in value && 'message' in value;
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
  const normalized: Record<string, string> = {};
  if (!headers) return normalized;

  new Headers(headers).forEach((value, key) => {
    normalized[key] = value;
  });

  return normalized;
}

function resolveErrorMessage(data: unknown, fallback: string): string {
  if (isApiEnvelope<unknown>(data)) return data.message || fallback;
  if (data && typeof data === 'object' && 'message' in data) return String(data.message || fallback);
  if (data && typeof data === 'object' && 'title' in data) return String(data.title || fallback);
  return fallback;
}

async function request<T>(path: string, options: RequestOptions, retried: boolean): Promise<T> {
  const {
    body,
    query,
    headers,
    auth = true,
    retryOnUnauthorized = true,
    unwrapEnvelope = true,
    ...rest
  } = options;
  let tokens = auth ? getAuthTokens() : null;
  if (tokens?.refreshToken && shouldRefreshAccessToken(tokens.expiresAt)) {
    const refreshed = await refreshAuthTokens();
    tokens = refreshed ? getAuthTokens() : null;
  }

  const cartSessionId = canUseStorage() ? localStorage.getItem(CART_SESSION_STORAGE_KEY) : null;
  const hasJsonBody = body !== undefined && !(body instanceof FormData);

  const requestHeaders = normalizeHeaders(headers);
  requestHeaders.Accept = requestHeaders.Accept ?? 'application/json';
  if (hasJsonBody) requestHeaders['Content-Type'] = requestHeaders['Content-Type'] ?? 'application/json';
  if (tokens?.accessToken) {
    requestHeaders.Authorization = `${tokens.tokenType || 'Bearer'} ${tokens.accessToken}`;
  }
  if (cartSessionId) requestHeaders['X-Cart-Session-Id'] = cartSessionId;

  const response = await fetch(buildUrl(path, query), {
    headers: requestHeaders,
    body:
      body === undefined
        ? undefined
        : hasJsonBody
          ? JSON.stringify(body)
          : (body as BodyInit),
    ...rest,
  });

  if (response.status === 401 && auth && retryOnUnauthorized && !retried) {
    const refreshed = await refreshAuthTokens();
    if (refreshed) return request<T>(path, options, true);
  }

  if (response.status === 204) return undefined as T;

  const data = await readResponseBody(response);

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(data, `Erro ${response.status}`), response.status, data as ApiErrorPayload);
  }

  if (unwrapEnvelope && isApiEnvelope<T>(data)) {
    if (!data.success) throw new ApiError(data.message, response.status, data);
    return data.data as T;
  }

  return data as T;
}

/** Executa uma chamada contra a API real. */
export async function http<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return request<T>(path, options, false);
}

export async function refreshAuthTokens(): Promise<AuthTokenContract | null> {
  const tokens = getAuthTokens();
  if (!tokens?.refreshToken) return null;
  if (refreshTokensPromise) return refreshTokensPromise;

  const refreshToken = tokens.refreshToken;
  refreshTokensPromise = (async () => {
    try {
      const refreshed = await request<AuthTokenContract>(
        '/auth/refresh',
        {
          method: 'POST',
          auth: false,
          retryOnUnauthorized: false,
          body: { refreshToken },
        },
        true,
      );

      setAuthTokens(refreshed);
      return refreshed;
    } catch {
      clearAuthTokens();
      return null;
    } finally {
      refreshTokensPromise = null;
    }
  })();

  return refreshTokensPromise;
}

/** Simula latencia de rede para os services mockados. */
export function delay<T>(value: T, ms = MOCK_LATENCY): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
