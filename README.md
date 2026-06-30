<h1 align="center">👜 Bibi Bolsas — Front-end</h1>

<p align="center">
  E-commerce premium de bolsas, mochilas e malas — loja (cliente) + painel administrativo.
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-18-149ECA?logo=react&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white">
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss&logoColor=white">
  <img alt="Status" src="https://img.shields.io/badge/status-mock%20%E2%86%92%20backend%20ready-brightgreen">
</p>

---

Construído conforme `docs/PLANEJAMENTO.md` e `docs/FRONTEND-PLANEJAMENTO.md`.

Hoje roda **100% com dados mockados** e está **preparado para integrar ao backend .NET**
assim que ele estiver pronto — sem precisar reescrever telas.

## Índice

- [Stack](#stack)
- [Como rodar](#como-rodar)
- [Demo](#demo)
- [Estrutura](#estrutura)
- [Integração com o backend (.NET)](#integração-com-o-backend-net)
- [Regras de negócio respeitadas no front](#regras-de-negócio-respeitadas-no-front)
- [Pendências visuais](#pendências-visuais)

## Stack

- **Vite + React + TypeScript**
- **Tailwind CSS v4** (design system via `@theme` em `src/index.css`)
- **React Router** (rotas cliente + admin)
- **TanStack Query** (cache, loading/erro, sincronização com a API)
- **Zustand** (carrinho persistente, UI, toasts)
- **React Hook Form + Zod** (formulários e validação)
- **Phosphor Icons** (iconografia linear)

## Como rodar

> Requer **Node.js 18+** e **npm**.

```bash
# clonar
git clone https://github.com/GuilhermeDuarte76/bibi-bolsas.git
cd bibi-bolsas

# variáveis de ambiente (opcional para o modo mock)
cp .env.example .env

# instalar e rodar
npm install
npm run dev      # http://localhost:5173
```

Outros scripts:

```bash
npm run build      # build de produção (tsc + vite)
npm run preview    # serve o build
npm run typecheck  # checagem de tipos
npm run lint       # ESLint
```

### Demo

- **Loja:** navegue por `/`, `/catalogo`, `/produto/:slug`, carrinho e checkout completo.
- **Conta do cliente:** acesse `/entrar` (qualquer e-mail/senha no mock) → `/minha-conta`.
- **Admin:** acesse `/admin/login` (qualquer credencial no mock) → `/admin`.

## Estrutura

```
src/
  components/
    ui/         Componentes base (Button, Field, Badge, Skeleton, Toast, Accordion…)
    layout/     AppShell, Header, Footer, SearchOverlay, Logo, RequireAuth
    product/    ProductCard, ProductGallery, Swatches, PriceBlock, ShippingCalculator…
    cart/       CartDrawer
    checkout/   AddressForm, CheckoutStepper, OrderSummary, PaymentMethodSelector
    admin/      AdminUI (PageHeader, StatCard, AdminTable, Panel)
  pages/        Páginas da loja, /account e /admin
  store/        Zustand: cart (persistente), ui
  hooks/        useAuth
  lib/
    api/        >>> CAMADA DE INTEGRAÇÃO <<<
      config.ts        Flags (USE_MOCK, API_URL)
      http.ts          Cliente fetch + ProblemDetails (pronto p/ API real)
      *.service.ts     Services por domínio (catalog, cart, account, auth, checkout, admin)
      mock/            Dados mockados (catálogo, conta, admin)
      index.ts         Barrel + queryKeys
    utils.ts    Formatação (moeda em centavos, datas, máscaras), cn()
    images.ts   Placeholders SVG on-brand (trocáveis por fotos reais)
    validation.ts  Schemas Zod
  types/        Tipos de domínio (espelham as entidades do backend)
```

## Integração com o backend (.NET)

Toda comunicação passa pelos **services** em `src/lib/api/*.service.ts`. Nenhuma tela
chama `fetch` diretamente. Cada função de service hoje retorna dados mockados e já tem o
endpoint real marcado com `// TODO(backend)`.

Para integrar:

1. Crie um arquivo `.env` (veja `.env.example`):
   ```env
   VITE_API_URL=https://api.bibibolsas.com.br
   VITE_USE_MOCK=false
   ```
2. Com `VITE_USE_MOCK=false`, os services usam o cliente `http()` (`src/lib/api/http.ts`),
   que já trata cookies `HttpOnly`, JSON e o padrão de erro `ProblemDetails`.
3. Ajuste os caminhos/contratos nos `// TODO(backend)` para casar com o Swagger/OpenAPI v1.
4. Os `queryKeys` centralizados (`src/lib/api/index.ts`) controlam o cache do TanStack Query.

### Regras de negócio respeitadas no front

- **Dinheiro em centavos** (inteiro) em todo o domínio; formatação só na exibição.
- **Preço, cupom e frete são recalculados no backend** — o front apenas exibe.
- **Pagamento confirmado por webhook**, não pelo retorno visual (tela de "pagamento pendente").
- **Carrinho persistente** (localStorage) para visitante e usuário; pronto para mesclar ao logar.
- **Esconder botão/rota não é segurança** — `RequireAuth` é UX; a API valida tudo.
- Estados obrigatórios em todos os fluxos: **loading (skeletons), vazio, erro e sucesso**.

## Pendências visuais

- Vetorizar logo oficial e gerar favicon definitivo (há um placeholder em `public/favicon.svg`).
- Substituir os placeholders de `src/lib/images.ts` por fotos reais (basta preencher
  `ProductMedia.url` com a URL do storage; nenhum componente muda).
- Validar contraste final das combinações em produção.

---

<p align="center"><sub>Bibi Bolsas © 2026 — projeto privado.</sub></p>
