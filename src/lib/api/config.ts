/**
 * Configuracao da camada de API.
 *
 * Hoje a loja roda 100% com dados mockados (USE_MOCK = true). Quando o backend
 * .NET estiver pronto, basta criar um arquivo .env com:
 *
 *   VITE_API_URL=https://api.bibibolsas.com.br
 *   VITE_USE_MOCK=false
 *
 * e implementar as chamadas reais marcadas com `// TODO(backend)` em cada service.
 * Nenhum componente de tela importa fetch direto — tudo passa pelos services em
 * src/lib/api/*, entao a troca mock -> real fica isolada nesta camada.
 */

const env = import.meta.env;

/** URL base da API .NET. Vazio enquanto usamos mock. */
export const API_URL: string = env.VITE_API_URL ?? '';

/** Versao do contrato (Swagger v1). */
export const API_VERSION = 'v1';

/**
 * Quando true, os services retornam dados mockados.
 * Default = true ate o backend existir. Defina VITE_USE_MOCK=false para integrar.
 */
export const USE_MOCK: boolean =
  env.VITE_USE_MOCK === 'false' ? false : true;

/** Latencia simulada (ms) para exercitar skeletons e estados de loading. */
export const MOCK_LATENCY = 450;

/** Chave do carrinho anonimo no storage do navegador. */
export const CART_STORAGE_KEY = 'bibi.cart.v1';

/** Chave da sessao do cliente no storage. */
export const AUTH_STORAGE_KEY = 'bibi.auth.v1';
