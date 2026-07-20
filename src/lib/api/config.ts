/**
 * Configuracao da camada de API.
 *
 * Hoje a loja roda 100% com dados mockados (USE_MOCK = true). Quando o backend
 * .NET estiver pronto, basta criar um arquivo .env com:
 *
 *   VITE_API_URL=http://127.0.0.1:5080
 *   # ou VITE_API_BASE_URL=http://127.0.0.1:5080
 *   VITE_API_BASE_PATH=/api
 *   VITE_USE_MOCK=false
 *
 * e os services passam a chamar a API real. Se uma URL de API estiver definida,
 * o mock fica desativado automaticamente, a menos que VITE_USE_MOCK=true seja
 * informado de forma explicita.
 * Nenhum componente de tela importa fetch direto — tudo passa pelos services em
 * src/lib/api/*, entao a troca mock -> real fica isolada nesta camada.
 */

const env = import.meta.env;

/** URL base da API .NET, sem barra final. */
export const API_URL: string = (
  env.VITE_API_URL ??
  env.VITE_API_BASE_URL ??
  ''
).replace(/\/+$/, '');

/** Prefixo real das rotas do backend. */
export const API_BASE_PATH: string = env.VITE_API_BASE_PATH ?? '/api';

/**
 * Quando true, os services retornam dados mockados.
 * Default = true apenas quando nenhuma URL de API foi configurada.
 */
export const USE_MOCK: boolean =
  env.VITE_USE_MOCK === 'true'
    ? true
    : env.VITE_USE_MOCK === 'false'
      ? false
      : API_URL.length === 0;

/** Latencia simulada (ms) para exercitar skeletons e estados de loading. */
export const MOCK_LATENCY = 450;

/** Chave do carrinho anonimo no storage do navegador. */
export const CART_STORAGE_KEY = 'bibi.cart.v1';

/** Chave da sessao do cliente no storage. */
export const AUTH_STORAGE_KEY = 'bibi.auth.v1';

/** Chaves dos tokens emitidos pelo backend. */
export const AUTH_TOKEN_STORAGE_KEY = 'bibi.auth.accessToken.v1';
export const REFRESH_TOKEN_STORAGE_KEY = 'bibi.auth.refreshToken.v1';
export const AUTH_TOKEN_TYPE_STORAGE_KEY = 'bibi.auth.tokenType.v1';
export const AUTH_TOKEN_EXPIRES_AT_STORAGE_KEY = 'bibi.auth.expiresAt.v1';

/** Identificador do carrinho anonimo aceito pelo backend via header. */
export const CART_SESSION_STORAGE_KEY = 'bibi.cart.sessionId.v1';
