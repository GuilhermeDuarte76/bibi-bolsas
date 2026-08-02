# Pendências de Backend — geradas pelo redesign da loja

Documento gerado em 02/08/2026, ao fim do redesign da visão do cliente (Camada 0, Home, Catálogo, PDP, Sacola, Autenticação, Checkout e Área da cliente).

Cada item abaixo é algo que o **frontend já precisa e o backend ainda não entrega**. Onde a tela foi construída de forma a funcionar sem o endpoint, está escrito como ela se comporta hoje — assim dá para priorizar sabendo o que quebra e o que apenas fica limitado.

Os contratos propostos são sugestões alinhadas às convenções que a API já usa (envelope `success/data/message`, `camelCase`, paginação `items/totalCount/page/pageSize/totalPages`). Ajuste os nomes se o padrão interno for outro — o frontend se adapta, desde que o contrato final seja informado.

## Resumo por prioridade

| # | Item | Prioridade | Impacto se não fizer |
| --- | --- | --- | --- |
| 1 | URLs do frontend nos e-mails transacionais | **P0** | Recuperação de senha e troca de e-mail não funcionam |
| 2 | Confirmar DTO de `POST /api/auth/reset-password` | **P0** | Redefinição de senha falha em produção |
| 3 | Gateway de pagamento real (Pix) | **P0** | Nenhuma venda se conclui |
| 4 | Confirmar campos de preferências de notificação | **P1** | Tela salva campos que o backend ignora |
| 5 | Módulo de favoritos | **P1** | Favoritos só existem no navegador, some ao trocar de aparelho |
| 6 | Filtros multi-valor no catálogo | **P2** | Cliente filtra por uma cor só |
| 7 | Endpoint de facetas | **P2** | 1 requisição extra de 100 produtos por categoria |
| 8 | Dimensões e peso do produto | **P2** | Ficha técnica não aparece |
| 9 | Imagem na categoria | **P2** | Home usa ilustração genérica |
| 10 | Cotação de frete por CEP sem carrinho | **P3** | Sem simulação de frete na página do produto |
| 11 | Módulo de conteúdo da home | **P3** | Trocar banner exige deploy |
| 12 | Módulo de avaliações | **P3** | Avaliações são conteúdo de exemplo |
| 13 | Ordenação por mais vendidos | **P3** | Ordenação removida da vitrine |

---

## P0 — bloqueia operação

### 1. URLs do frontend nos e-mails transacionais

O backend gera os tokens e dispara os e-mails; o **link precisa apontar para as rotas do frontend**, que já existem e estão publicadas:

| Fluxo | Rota do frontend | Query string |
| --- | --- | --- |
| Recuperação de senha | `/redefinir-senha` | `?token={token}&email={email}` |
| Confirmação de troca de e-mail | `/confirmar-email` | `?token={token}` |

Sugestão: uma configuração `Frontend:BaseUrl` no `appsettings`, usada na montagem dos links, para não ficar hardcoded por ambiente.

Ambas as telas já tratam token ausente, inválido e expirado. Em desenvolvimento elas usam o `devResetToken` / `devConfirmationToken` que o backend já devolve, então o fluxo é testável sem caixa de entrada configurada.

### 2. Confirmar o DTO de `POST /api/auth/reset-password`

Não foi possível conferir o contrato real (o backend não está neste repositório). O frontend está enviando, por analogia com os outros endpoints de auth que usam `confirmPassword`:

```json
{
  "email": "cliente@exemplo.com",
  "token": "…",
  "newPassword": "…",
  "confirmPassword": "…"
}
```

**Se o DTO for diferente, a redefinição falha em produção.** Está marcado com aviso em `src/lib/api/auth.service.ts`. Basta informar o formato correto.

### 3. Gateway de pagamento real

Já conhecido e documentado no contexto do backend: hoje o `PendingProviderAdapter` devolve `requiresProviderIntegration=true`, sem QR Code e sem confirmação.

O frontend já está pronto para os dois lados:

- a tela de pagamento pendente faz *polling* em `GET /api/checkout/{orderId}/status`;
- `CheckoutResult` já tem campos para `pixCode` e `pixExpiresInMin` — basta o `POST /api/checkout/{orderId}/payment` passar a devolvê-los.

Quando o webhook validado passar a confirmar o pagamento, o restante do fluxo (baixa de estoque, consumo de cupom, mudança de status) já é backend.

---

## P1 — bloqueia funcionalidade já construída

### 4. Confirmar os campos de preferências de notificação

`GET/PUT /api/me/notificacoes/preferencias` existe, mas os nomes dos campos não estavam documentados. O frontend assumiu:

```json
{
  "orderUpdates": true,
  "promotions": false,
  "abandonedCart": false
}
```

Campos ausentes na resposta caem em um padrão conservador (só avisos de pedido). Se os nomes reais forem outros, a tela salva no vazio sem erro aparente — por isso vale conferir.

### 5. Módulo de favoritos

Decisão do projeto: favoritos vinculados à conta, sincronizados entre aparelhos.

```txt
GET    /api/me/favoritos            -> FavoriteItem[]
POST   /api/me/favoritos            body { productId }
DELETE /api/me/favoritos/{productId}
```

```jsonc
// FavoriteItem
{
  "productId": 12,
  "slug": "mochila-urbana-trilha",
  "name": "Mochila Urbana Trilha",
  "imageUrl": "https://…",
  "priceFrom": 229.90,
  "addedAt": "2026-08-02T12:00:00Z"
}
```

**Hoje:** funciona 100% no navegador (`src/store/favorites.ts`), com página `/favoritos` que revalida preço e disponibilidade. O store já tem `mergeFromServer()`, então quando a API existir o que estiver salvo local sobe na primeira sincronização, sem a cliente perder nada.

---

## P2 — corrige comportamento limitado ou errado

### 6. Filtros multi-valor no catálogo

`GET /api/produtos` aceita **um valor** por campo (`color`, `size`, `material`). Loja de moda precisa de "preto **ou** caramelo".

Proposta: aceitar o parâmetro repetido, tratando como `OR` dentro do campo e `AND` entre campos.

```txt
GET /api/produtos?color=Preto&color=Caramelo&size=Único
```

**Hoje:** a interface é de seleção única, declarada como tal (clicar no chip ativo remove o filtro). Antes desta correção a tela oferecia marcação múltipla e mandava só o primeiro valor — em silêncio.

> Nota: o filtro de cor **nunca funcionou** com a API real, porque o frontend enviava o id interno (`cor-terracota-a5603f`) e o backend compara com a string da cor. Corrigido no frontend: agora enviamos o rótulo cru do catálogo (`Terracota`). Vale confirmar se a comparação no backend ignora acento e caixa.

### 7. Endpoint de facetas

Não existe. Para montar os filtros com contagem e faixa de preço corretas, o frontend hoje faz **uma requisição extra pedindo 100 produtos** da categoria e conta no cliente.

```txt
GET /api/produtos/facetas?category=bolsas&search=
```

```jsonc
{
  "colors":    [{ "value": "Preto", "label": "Preto", "hex": "#111111", "count": 11 }],
  "sizes":     [{ "value": "Único", "label": "Único", "count": 11 }],
  "materials": [{ "value": "Couro sintético", "label": "Couro sintético", "count": 2 }],
  "priceRange": { "min": 129.90, "max": 899.90 }
}
```

Importante: as facetas devem refletir **categoria e busca**, mas **não** os demais filtros — senão as opções somem conforme a pessoa filtra e ela fica sem caminho de volta.

### 8. Dimensões e peso do produto

O produto não tem medidas. Campos sugeridos (todos opcionais):

```jsonc
{ "heightCm": 32, "widthCm": 28, "depthCm": 14, "weightG": 850, "capacity": "18 L" }
```

**Hoje:** o acordeão "Medidas e materiais" **some por completo** quando não há dado — antes ele abria uma lista vazia. Peso também é insumo do cálculo de frete real, quando a transportadora entrar.

### 9. Imagem na categoria

`CategoryDto` tem `id`, `name`, `slug`, `description`, `displayOrder`, `isActive` — sem imagem. A grade de categorias da Home é um dos blocos mais visíveis do site.

Sugestão: `imageUrl` na categoria, alimentado pelo mesmo fluxo de storage R2 que já existe para imagens de produto (URL assinada + salvar metadados).

**Hoje:** a Home usa uma ilustração SVG gerada por categoria — elegante, mas genérica.

---

## P3 — recursos novos

### 10. Cotação de frete por CEP sem carrinho

Hoje só existe `POST /api/checkout/shipping-options`, que exige `cartId` + `addressId` + login. Não dá para simular frete na página do produto, que é onde a pessoa decide comprar.

```txt
POST /api/frete/simular
body { "zipCode": "30110-000", "subtotal": 229.90 }
-> ShippingOptionDto[]  (mesmo formato do checkout)
```

**Hoje:** o PDP informa a regra ("frete grátis acima de R$ 299 · prazo e valor exatos no checkout") em vez de simular. A calculadora antiga só funcionava em modo mock e sumia com a API real, sem explicação.

### 11. Módulo de conteúdo da home

Trocar a chamada do banner ("Nova coleção · Inverno 2026") ou as fotos do hero exige alterar código e publicar. Numa loja, isso é a coisa que mais muda.

```txt
GET  /api/home/hero                 (público)
GET  /api/admin/home/hero           (admin)
PUT  /api/admin/home/hero           (admin, permissão Content.Manage)
```

```jsonc
{
  "eyebrow": "Nova coleção · Inverno 2026",
  "titleLead": "Uma bolsa ideal para",
  "titleHighlight": "cada momento",
  "description": "…",
  "primaryCta":   { "label": "Explorar vitrine", "url": "/catalogo" },
  "secondaryCta": { "label": "Ver promoções",   "url": "/categoria/promocoes" },
  "images": [{ "url": "…", "alt": "…" }],
  "startsAt": null,
  "endsAt": null
}
```

**Hoje:** tudo centralizado em `src/lib/home-content.ts` — é um arquivo só para editar, mas ainda exige deploy. A tela não muda quando o endpoint existir: basta trocar as constantes por uma query.

### 12. Módulo de avaliações

Não existe entidade, endpoint nem moderação.

```txt
GET  /api/produtos/{slug}/avaliacoes           (público, paginado)
POST /api/me/pedidos/{orderId}/avaliacoes      (cliente, só de item comprado)
GET  /api/admin/avaliacoes                     (moderação)
PATCH /api/admin/avaliacoes/{id}/status        (aprovar / recusar)
```

O produto também deveria passar a expor `averageRating` e `reviewCount`, hoje sempre `0`.

**Hoje, e isto merece atenção:** por decisão sua, a interface de avaliações foi mantida com dados de exemplo. O frontend foi organizado para conter o risco — as avaliações passam por `catalogService.getProductReviews()`, que devolve os exemplos **apenas em modo mock**; contra a API real devolve lista vazia e a seção mostra "ainda não tem avaliações". Também **não** foi incluído `aggregateRating` nos dados estruturados da página, porque marcar nota não verificada engana quem lê o resultado da busca e é penalizado pelo Google.

Continua valendo o alerta: os depoimentos com nome de pessoa na Home (`src/lib/home-content.ts`) são conteúdo de exemplo e devem ser substituídos por depoimentos reais, com autorização, antes de divulgar a loja.

### 13. Ordenação por mais vendidos

`sort` aceita `menor-preco`, `maior-preco`, `lancamentos` e o padrão por destaque. Não há ordenação por vendas porque o dado não é exposto.

**Hoje:** a opção foi **removida** da vitrine — ela existia no seletor e não fazia nada. A Home, que apontava para `?sort=mais-vendidos`, agora aponta para `?destaque=1` (`isFeatured`, que existe).

Se quiser a ordenação de verdade, precisa de contagem de itens vendidos por produto (só de pedidos pagos) exposta no catálogo.

---

## Confirmações rápidas que destravam trabalho

1. DTO de `POST /api/auth/reset-password` (item 2).
2. Nomes dos campos em `/api/me/notificacoes/preferencias` (item 4).
3. A comparação de `color` / `size` / `material` em `/api/produtos` ignora acento e caixa?
4. `POST /api/me/profile/delete-request` aceita `{ reason }` no corpo? O frontend envia esse campo como opcional.
5. `PATCH /api/me/profile/marketing-consent` aceita `{ accepted: boolean }`? É o que o frontend envia.

## Endpoints que passaram a ser consumidos agora

Não são pendências — são endpoints que já existiam e o frontend **não usava**. Ficam aqui para o time de backend saber que agora há tráfego neles:

- `POST /api/carrinho/validar` — a sacola revalida preço e disponibilidade ao abrir.
- `POST /api/checkout/validate` — a revisão do checkout pré-valida antes de criar o pedido.
- `POST /api/auth/forgot-password` — a tela de recuperação existia sem botão funcional.
- `PATCH /api/me/password`, `PUT /api/me/profile`, `POST /api/me/email/change-request`, `/confirm`, `/cancel`.
- `PATCH /api/me/profile/marketing-consent`, `POST /api/me/profile/delete-request`.
- `GET/PUT /api/me/notificacoes/preferencias`.
- `PATCH /api/me/enderecos/{id}/principal`.
- `GET /api/produtos?isFeatured=true` — usado no filtro "Somente destaques" e no bloco "Mais desejados".

## Fora do backend: pendências do lado do negócio

Não dependem de código, mas travam a publicação da loja:

- **Dados cadastrais em `src/lib/store-info.ts`**: razão social, CNPJ, endereço completo, e-mail de atendimento, WhatsApp e horário. Razão social, CNPJ e endereço físico são exigidos pelo Decreto 7.962/2013 em e-commerce. Enquanto estiverem nulos, o rodapé simplesmente não os exibe — nenhum dado falso é mostrado.
- **Revisão dos textos institucionais**: política de privacidade e termos de uso são documentos que vinculam a empresa. Os rascunhos em `src/pages/institucional/content.ts` seguem CDC e LGPD, mas precisam do aval de quem responde pela loja e, idealmente, de um advogado.
