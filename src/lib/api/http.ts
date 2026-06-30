import { API_URL, API_VERSION, MOCK_LATENCY } from './config';

/**
 * Cliente HTTP fino para a futura API .NET.
 *
 * Enquanto USE_MOCK estiver ligado, os services nao chamam estas funcoes — elas
 * ficam prontas para quando a integracao acontecer. O contrato segue o padrao
 * ProblemDetails (RFC 7807) descrito no PLANEJAMENTO.md secao 4.
 */

export interface ProblemDetails {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  status: number;
  problem?: ProblemDetails;

  constructor(message: string, status: number, problem?: ProblemDetails) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Querystring serializada automaticamente. */
  query?: Record<string, unknown>;
}

function buildUrl(path: string, query?: Record<string, unknown>): string {
  const base = `${API_URL}/${API_VERSION}${path}`;
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

/**
 * Executa uma chamada autenticada (cookie HttpOnly + access token enviados pelo
 * navegador). Lanca ApiError com o corpo ProblemDetails em caso de falha.
 */
export async function http<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, query, headers, ...rest } = options;

  const res = await fetch(buildUrl(path, query), {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...rest,
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const problem = data as ProblemDetails | undefined;
    throw new ApiError(problem?.title ?? `Erro ${res.status}`, res.status, problem);
  }

  return data as T;
}

/** Simula latencia de rede para os services mockados. */
export function delay<T>(value: T, ms = MOCK_LATENCY): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
