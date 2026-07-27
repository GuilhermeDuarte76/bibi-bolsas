import {
  API_BASE_PATH,
  API_URL,
  AUTH_TOKEN_EXPIRES_AT_STORAGE_KEY,
  AUTH_TOKEN_STORAGE_KEY,
  AUTH_TOKEN_TYPE_STORAGE_KEY,
  CART_SESSION_STORAGE_KEY,
  MOCK_LATENCY,
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
  tokenType: string;
  expiresAt: string;
}

export interface AuthTokenContract extends StoredAuthTokens {
  refreshToken?: string;
  user: BackendUserContract;
}

const ACCESS_TOKEN_REFRESH_SKEW_MS = 60 * 1000;
const LEGACY_REFRESH_TOKEN_STORAGE_KEY = 'bibi.auth.refreshToken.v1';
const REFRESH_LOCK_STORAGE_KEY = 'bibi.auth.refresh.lock.v1';
const REFRESH_EVENT_STORAGE_KEY = 'bibi.auth.refresh.event.v1';
const REFRESH_CHANNEL_NAME = 'bibi.auth.refresh.v1';
const REFRESH_LOCK_TTL_MS = 8_000;
const REFRESH_WAIT_TIMEOUT_MS = 9_000;
let refreshTokensPromise: Promise<AuthTokenContract | null> | null = null;
let refreshBroadcastChannel: BroadcastChannel | null | undefined;

const refreshClientId = (() => {
  const randomId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  return `tab-${Date.now()}-${randomId}`;
})();

interface RefreshLockPayload {
  owner: string;
  expiresAt: number;
  createdAt: number;
}

interface RefreshEventPayload {
  type: 'success' | 'failure';
  owner: string;
  at: number;
  user?: BackendUserContract;
}

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

export function isAuthenticationError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
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

function canUseWindowEvents(): boolean {
  return typeof window !== 'undefined' && typeof window.addEventListener === 'function';
}

function getRefreshBroadcastChannel(): BroadcastChannel | null {
  if (refreshBroadcastChannel !== undefined) return refreshBroadcastChannel;

  refreshBroadcastChannel =
    typeof BroadcastChannel !== 'undefined'
      ? new BroadcastChannel(REFRESH_CHANNEL_NAME)
      : null;

  return refreshBroadcastChannel;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRefreshLock(raw: string | null): RefreshLockPayload | null {
  if (!raw) return null;

  try {
    const value = JSON.parse(raw) as Partial<RefreshLockPayload>;
    if (typeof value.owner !== 'string' || typeof value.expiresAt !== 'number') return null;
    return {
      owner: value.owner,
      expiresAt: value.expiresAt,
      createdAt: typeof value.createdAt === 'number' ? value.createdAt : 0,
    };
  } catch {
    return null;
  }
}

function parseRefreshEvent(raw: string | null): RefreshEventPayload | null {
  if (!raw) return null;

  try {
    const value = JSON.parse(raw) as Partial<RefreshEventPayload>;
    if ((value.type !== 'success' && value.type !== 'failure') || typeof value.owner !== 'string') return null;
    return {
      type: value.type,
      owner: value.owner,
      at: typeof value.at === 'number' ? value.at : Date.now(),
      user: value.user,
    };
  } catch {
    return null;
  }
}

function readRefreshLock(): RefreshLockPayload | null {
  if (!canUseStorage()) return null;
  return parseRefreshLock(localStorage.getItem(REFRESH_LOCK_STORAGE_KEY));
}

async function tryAcquireRefreshLock(): Promise<boolean> {
  if (!canUseStorage()) return true;

  const now = Date.now();
  const currentLock = readRefreshLock();
  if (currentLock && currentLock.owner !== refreshClientId && currentLock.expiresAt > now) {
    return false;
  }

  const nextLock: RefreshLockPayload = {
    owner: refreshClientId,
    createdAt: now,
    expiresAt: now + REFRESH_LOCK_TTL_MS,
  };

  localStorage.setItem(REFRESH_LOCK_STORAGE_KEY, JSON.stringify(nextLock));
  await sleep(35 + Math.round(Math.random() * 60));

  return readRefreshLock()?.owner === refreshClientId;
}

function releaseRefreshLock(): void {
  if (!canUseStorage()) return;
  if (readRefreshLock()?.owner === refreshClientId) localStorage.removeItem(REFRESH_LOCK_STORAGE_KEY);
}

function publishRefreshEvent(event: RefreshEventPayload): void {
  getRefreshBroadcastChannel()?.postMessage(event);
  if (canUseStorage()) localStorage.setItem(REFRESH_EVENT_STORAGE_KEY, JSON.stringify(event));
}

export function getAuthTokens(): StoredAuthTokens | null {
  if (!canUseStorage()) return null;

  const accessToken = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  if (!accessToken) return null;

  return {
    accessToken,
    tokenType: localStorage.getItem(AUTH_TOKEN_TYPE_STORAGE_KEY) || 'Bearer',
    expiresAt: localStorage.getItem(AUTH_TOKEN_EXPIRES_AT_STORAGE_KEY) || '',
  };
}

export function setAuthTokens(tokens: StoredAuthTokens): void {
  if (!canUseStorage()) return;

  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, tokens.accessToken);
  localStorage.setItem(AUTH_TOKEN_TYPE_STORAGE_KEY, tokens.tokenType || 'Bearer');
  localStorage.setItem(AUTH_TOKEN_EXPIRES_AT_STORAGE_KEY, tokens.expiresAt);
  localStorage.removeItem(LEGACY_REFRESH_TOKEN_STORAGE_KEY);
}

export function clearAuthTokens(): void {
  if (!canUseStorage()) return;

  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(AUTH_TOKEN_TYPE_STORAGE_KEY);
  localStorage.removeItem(AUTH_TOKEN_EXPIRES_AT_STORAGE_KEY);
  localStorage.removeItem(LEGACY_REFRESH_TOKEN_STORAGE_KEY);
}

function shouldRefreshAccessToken(expiresAt: string): boolean {
  const expiresAtMs = Date.parse(expiresAt);
  return Number.isFinite(expiresAtMs) && expiresAtMs - Date.now() <= ACCESS_TOKEN_REFRESH_SKEW_MS;
}

async function hydrateLatestAuthTokens(
  accessTokenBeforeRefresh?: string,
  userFromEvent?: BackendUserContract,
): Promise<AuthTokenContract | null> {
  const latestTokens = getAuthTokens();
  const hasDifferentToken = latestTokens?.accessToken && latestTokens.accessToken !== accessTokenBeforeRefresh;
  if (!latestTokens || !hasDifferentToken || shouldRefreshAccessToken(latestTokens.expiresAt)) return null;

  if (userFromEvent) return { ...latestTokens, user: userFromEvent };

  try {
    const user = await request<BackendUserContract>('/me', { retryOnUnauthorized: false }, true);
    return { ...latestTokens, user };
  } catch (sessionError) {
    if (isAuthenticationError(sessionError)) clearAuthTokens();
    return null;
  }
}

function storedTokenChanged(accessTokenBeforeRefresh?: string): boolean {
  const latestTokens = getAuthTokens();
  return Boolean(
    latestTokens?.accessToken &&
      latestTokens.accessToken !== accessTokenBeforeRefresh &&
      !shouldRefreshAccessToken(latestTokens.expiresAt),
  );
}

async function waitForPeerRefresh(
  accessTokenBeforeRefresh?: string,
): Promise<{ status: 'success'; user?: BackendUserContract } | { status: 'failure' } | { status: 'timeout' }> {
  if (!canUseWindowEvents()) return { status: 'timeout' };
  if (!canUseStorage() && !getRefreshBroadcastChannel()) return { status: 'timeout' };

  return new Promise((resolve) => {
    let settled = false;
    const channel = getRefreshBroadcastChannel();

    const settle = (result: { status: 'success'; user?: BackendUserContract } | { status: 'failure' } | { status: 'timeout' }) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      window.clearInterval(poll);
      channel?.removeEventListener('message', handleChannelMessage);
      if (canUseWindowEvents()) window.removeEventListener('storage', handleStorage);
      resolve(result);
    };

    const handleRefreshEvent = (event: RefreshEventPayload | null) => {
      if (!event || event.owner === refreshClientId) return;
      if (event.type === 'success') {
        settle({ status: 'success', user: event.user });
        return;
      }

      if (storedTokenChanged(accessTokenBeforeRefresh)) settle({ status: 'success' });
      else settle({ status: 'failure' });
    };

    const handleChannelMessage = (event: MessageEvent<RefreshEventPayload>) => {
      handleRefreshEvent(event.data);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === AUTH_TOKEN_STORAGE_KEY && storedTokenChanged(accessTokenBeforeRefresh)) {
        settle({ status: 'success' });
        return;
      }

      if (event.key === REFRESH_EVENT_STORAGE_KEY) handleRefreshEvent(parseRefreshEvent(event.newValue));
    };

    const timeout = window.setTimeout(() => settle({ status: 'timeout' }), REFRESH_WAIT_TIMEOUT_MS);
    const poll = window.setInterval(() => {
      if (storedTokenChanged(accessTokenBeforeRefresh)) settle({ status: 'success' });
    }, 250);

    channel?.addEventListener('message', handleChannelMessage);
    if (canUseWindowEvents()) window.addEventListener('storage', handleStorage);

    if (storedTokenChanged(accessTokenBeforeRefresh)) settle({ status: 'success' });
  });
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
    credentials = 'include',
    ...rest
  } = options;
  let tokens = auth ? getAuthTokens() : null;
  if (tokens?.accessToken && shouldRefreshAccessToken(tokens.expiresAt)) {
    const refreshed = await refreshAuthTokens();
    tokens = refreshed ? getAuthTokens() : getAuthTokens();
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
    credentials,
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
  if (refreshTokensPromise) return refreshTokensPromise;

  refreshTokensPromise = (async () => {
    const accessTokenBeforeRefresh = getAuthTokens()?.accessToken;
    const acquiredLock = await tryAcquireRefreshLock();

    if (!acquiredLock) {
      const peerRefresh = await waitForPeerRefresh(accessTokenBeforeRefresh);
      if (peerRefresh.status === 'success') {
        return hydrateLatestAuthTokens(accessTokenBeforeRefresh, peerRefresh.user);
      }

      if (peerRefresh.status === 'failure') return null;

      const latestTokens = await hydrateLatestAuthTokens(accessTokenBeforeRefresh);
      if (latestTokens) return latestTokens;

      if (!(await tryAcquireRefreshLock())) return null;
    }

    const legacyRefreshToken = canUseStorage() ? localStorage.getItem(LEGACY_REFRESH_TOKEN_STORAGE_KEY) : null;
    try {
      const refreshed = await request<AuthTokenContract>(
        '/auth/refresh',
        {
          method: 'POST',
          auth: false,
          retryOnUnauthorized: false,
          body: legacyRefreshToken ? { refreshToken: legacyRefreshToken } : undefined,
        },
        true,
      );

      setAuthTokens(refreshed);
      publishRefreshEvent({
        type: 'success',
        owner: refreshClientId,
        at: Date.now(),
        user: refreshed.user,
      });
      return refreshed;
    } catch (error) {
      const latestTokens = await hydrateLatestAuthTokens(accessTokenBeforeRefresh);
      if (latestTokens) return latestTokens;

      if (isAuthenticationError(error)) clearAuthTokens();
      publishRefreshEvent({
        type: 'failure',
        owner: refreshClientId,
        at: Date.now(),
      });
      return null;
    } finally {
      releaseRefreshLock();
      refreshTokensPromise = null;
    }
  })();

  return refreshTokensPromise;
}

/** Simula latencia de rede para os services mockados. */
export function delay<T>(value: T, ms = MOCK_LATENCY): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
