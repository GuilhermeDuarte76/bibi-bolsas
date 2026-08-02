# Contexto do Backend para Agente de Frontend

Última leitura do repositório: 02/08/2026.

Este documento resume o backend atual da Bibi Bolsas para orientar um agente que vai ajustar várias áreas do frontend. A ideia é dar contexto suficiente para criar telas, fluxos, estados, formulários e chamadas HTTP sem precisar descobrir o backend do zero.

## Resumo executivo

O projeto é uma API REST de e-commerce para a Bibi Bolsas, feita em .NET 8 / ASP.NET Core, PostgreSQL e Entity Framework Core. A arquitetura é um monólito modular:

```txt
Controller -> Service -> Repository/DbContext -> PostgreSQL
```

As principais superfícies são:

- Loja pública: catálogo, categorias, produto, carrinho anônimo/logado, checkout, conta da cliente e pedidos.
- Conta da cliente: login, perfil, endereços, preferências de notificação e histórico de pedidos.
- Admin/operação: dashboard, produtos, categorias, imagens, storage, estoque, pedidos, clientes, cupons, promoções, relatórios, auditoria, alertas, jobs e readiness de produção.
- Integrações: storage S3/R2 já preparado, pagamento/frete/e-mail/monitoramento/backup/fiscal com contratos e readiness, mas nem todos com provider real ligado.

## Stack e estrutura

- API: .NET 8 Web API.
- Banco: PostgreSQL.
- ORM: Entity Framework Core.
- Auth: JWT Bearer com access token curto e refresh token rotativo.
- Senhas: BCrypt.
- Logs: Serilog.
- Documentação: Swagger/OpenAPI.
- Uploads: storage compatível com S3, pensado para Cloudflare R2.
- Deploy: Docker/Nginx/systemd com arquivos em `backend-bibi-bolsas/deployment`.

Pastas principais:

```txt
backend-bibi-bolsas/BackendBibiBolsas.API/
  Common/        Constantes, response envelope, paginação e helpers.
  Controllers/   Endpoints HTTP.
  Data/          DbContext e migrations.
  DTOs/          Contratos de entrada/saída da API.
  Filters/       Permissões granulares de admin.
  Middlewares/   Erro global e rate limit.
  Models/        Entidades persistidas.
  Repositories/  Repositórios de usuários/perfil/endereços.
  Services/      Regras de negócio.
  Settings/      Configurações tipadas.
```

## Convenções globais da API

Prefixo base: `/api`.

JSON: usar `camelCase` no frontend. Exemplo: `accessToken`, `refreshTokenExpiresAt`, `totalCount`.

Envelope padrão:

```json
{
  "success": true,
  "data": {},
  "message": "Descrição do resultado"
}
```

Em erro:

```json
{
  "success": false,
  "data": null,
  "message": "Mensagem amigável"
}
```

Listagens paginadas usam:

```json
{
  "items": [],
  "totalCount": 0,
  "page": 1,
  "pageSize": 20,
  "totalPages": 0
}
```

Tratamento de erro:

- `400`: validação/regra de negócio.
- `401`: token ausente/inválido ou sessão expirada.
- `403`: usuário autenticado sem permissão.
- `404`: recurso não encontrado.
- `429`: rate limit em `/api/auth` e `/api/checkout/coupons`.
- `500`: erro interno com referência curta na mensagem.

Headers importantes:

- `Authorization: Bearer {accessToken}` para rotas protegidas.
- `X-Cart-Session-Id` para carrinho anônimo.
- `Idempotency-Key` obrigatório em `POST /api/checkout`.

## Autenticação e sessão

Roles existentes:

- `Customer`: cliente da loja.
- `Admin`: administrador mestre, criado via banco.
- `Employee`: funcionário operacional, criado pelo admin.

Policies:

- `AdminOnly`: apenas admin.
- `EmployeeOrAdmin`: admin ou funcionário.
- `CustomerOnly`: apenas cliente.
- `CustomerOrAdmin`: cliente ou admin quando fizer sentido.

Login (`POST /api/auth/login`) retorna:

- `accessToken`
- `refreshToken`
- `refreshTokenExpiresAt`
- `tokenType`
- `expiresAt`
- `user`

Além do corpo, o backend grava o refresh token em cookie HTTP-only chamado `bibi_refresh`, com `Path=/api/auth`, `SameSite=Lax` e `Secure=true` fora de desenvolvimento. O refresh também aceita refresh token no corpo. O frontend deve escolher uma estratégia consistente: guardar só access token em memória/storage e usar cookie para refresh, ou enviar refresh token no corpo se a arquitetura exigir.

O backend exige autenticação por padrão; endpoints públicos usam `[AllowAnonymous]`.

## Permissões do admin

Além de role, várias rotas admin usam permissão granular via `AdminPermissionAttribute`.

O admin tem acesso total. Funcionário precisa de permissão explícita. O frontend pode esconder botões/abas conforme a matriz de permissões, mas o backend continua sendo a fonte final: tratar `403` corretamente.

Rotas de permissão:

| Método | Rota | Acesso | Uso |
| --- | --- | --- | --- |
| GET | `/api/admin/permissoes/catalogo` | Admin | Lista permissões disponíveis. |
| GET | `/api/admin/permissoes/funcionarios` | Admin | Lista matriz de todos os funcionários. |
| GET | `/api/admin/permissoes/funcionarios/{userId}` | Admin | Consulta permissões de um funcionário. |
| PUT | `/api/admin/permissoes/funcionarios/{userId}` | Admin | Atualiza permissões, com justificativa. |

Principais permissões:

- Dashboard: `Dashboard.View`
- Pedidos: `Orders.View`, `Orders.Payments.View`, `Orders.Status.Update`, `Orders.Cancel`, `Orders.Shipping.Update`, `Orders.Fiscal.View`, `Orders.Webhooks.View`
- Catálogo/estoque/storage: `Catalog.Categories.View`, `Catalog.Categories.Manage`, `Catalog.Categories.Archive`, `Catalog.Products.View`, `Catalog.Products.Manage`, `Catalog.Products.Archive`, `Catalog.Products.PriceHistory.View`, `Catalog.Variants.Manage`, `Catalog.Images.Manage`, `Catalog.Inventory.View`, `Catalog.Inventory.Adjust`, `Catalog.Inventory.Reservations.Release`, `Storage.Images.Upload`
- Clientes: `Customers.View`, `Customers.Status.Update`, `Customers.Anonymize`, `Customers.Addresses.View`
- Cupons/promoções: `Coupons.View`, `Coupons.Manage`, `Coupons.Status.Update`, `Coupons.Archive`, `Coupons.Report.View`, `Promotions.View`, `Promotions.Manage`, `Promotions.Status.Update`, `Promotions.Archive`, `Promotions.Report.View`
- Relatórios: `Reports.Sales.View`, `Reports.Products.View`, `Reports.Stock.View`, `Reports.Customers.View`, `Reports.Coupons.View`, `Reports.AbandonedCarts.View`, `Reports.Exports.Manage`
- Notificações/jobs/alertas: `Notifications.View`, `Notifications.Detail.View`, `Notifications.Queue`, `Notifications.Dispatch`, `Alerts.View`, `Alerts.Resolve`, `Automations.View`, `Automations.Run`
- Admin-only: `Admin.Users.Manage`, `Admin.Permissions.Manage`, `Admin.Audit.View`, `Admin.Readiness.View`

## Módulos implementados

| Módulo | Status atual | Observações para o front |
| --- | --- | --- |
| Fundação/API | Implementado | Health, Swagger, CORS, JWT, erro global, rate limit e headers de segurança. |
| Auth/usuários | Implementado | Cadastro cliente, login, refresh, revoke, recuperação de senha, `/api/me`, admin users. |
| Perfil cliente | Implementado | Perfil separado de login, LGPD, marketing consent, troca de e-mail com token. |
| Endereços | Implementado | Múltiplos endereços, principal único, CEP normalizado, soft delete. |
| Catálogo | Implementado | Produtos, categorias, variações/SKUs, imagens, SEO, filtros públicos e admin. |
| Storage imagens | Implementado | Gera URL assinada para upload direto no R2/S3; depende de configuração real. |
| Estoque | Implementado | Saldo por SKU, reservas, movimentações, ajustes com motivo, baixo estoque. |
| Carrinho | Implementado | Anônimo e logado, merge pós-login, valida preço/estoque, sem frete/cupom. |
| Checkout | Implementado | Validação, frete interno temporário, cupom, pedido pendente, reserva de estoque, idempotência. |
| Pedidos/pagamentos | Implementado parcialmente | Pedidos, rastreio, tentativas, cancelamento antes do pagamento, admin operacional, webhooks armazenados. Provider real de pagamento ainda não confirma pagamento. |
| Cupons | Implementado | Cadastro, regras, validação no checkout, reserva de uso, relatório. Consumo final depende de pagamento aprovado futuro. |
| Promoções | Implementado como cadastro | CRUD e relatório existem, mas motor automático ainda não altera catálogo/carrinho. |
| Relatórios/dashboard | Implementado | Dashboard, vendas, produtos, estoque, clientes, cupons, carrinhos abandonados, exportação CSV. |
| Auditoria/alertas | Implementado | Auditoria admin-only, alertas automáticos e resolução/ignorar com motivo. |
| Notificações/jobs | Implementado | Preferências, outbox interna, carrinho abandonado, dispatcher simulado, jobs manuais/hosted service. |
| Readiness produção | Implementado | Health ready público e checklist admin de integrações/configuração. |

## Endpoints principais

### Health e produção

| Método | Rota | Acesso | Uso |
| --- | --- | --- | --- |
| GET | `/api/health` | Público | API viva. |
| GET | `/api/health/ready` | Público | Prontidão sem detalhes sensíveis. |
| GET | `/api/health/db` | Admin | Conexão com banco. |
| GET | `/api/admin/producao/readiness` | Admin | Checklist completo de produção. |
| GET | `/api/admin/producao/integracoes` | Admin | Status de integrações. |

### Auth e usuário atual

| Método | Rota | Acesso | Uso |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Público | Criar cliente. |
| POST | `/api/auth/login` | Público | Entrar com e-mail/senha. |
| POST | `/api/auth/refresh` | Público | Renovar sessão. |
| POST | `/api/auth/revoke` | Autenticado | Encerrar sessão. |
| POST | `/api/auth/forgot-password` | Público | Solicitar reset. Em dev retorna `devResetToken`. |
| POST | `/api/auth/reset-password` | Público | Redefinir senha. |
| GET | `/api/me` | Autenticado | Dados básicos do usuário logado. |
| PUT | `/api/me` | Autenticado | Atualizar nome. |
| PATCH | `/api/me/password` | Autenticado | Alterar senha. |

### Cliente, perfil e e-mail

| Método | Rota | Acesso | Uso |
| --- | --- | --- | --- |
| GET | `/api/me/profile` | Customer | Perfil da cliente. |
| PUT | `/api/me/profile` | Customer | Atualizar perfil. |
| PATCH | `/api/me/profile/marketing-consent` | Customer | Aceite de marketing. |
| POST | `/api/me/profile/delete-request` | Customer | Solicitação LGPD de exclusão/análise. |
| POST | `/api/me/email/change-request` | Autenticado | Solicitar troca de e-mail. Em dev retorna `devConfirmationToken`. |
| POST | `/api/me/email/confirm` | Público | Confirmar troca por token. |
| POST | `/api/me/email/cancel` | Autenticado | Cancelar troca pendente. |

### Endereços

| Método | Rota | Acesso | Uso |
| --- | --- | --- | --- |
| GET | `/api/me/enderecos` | Customer | Listar endereços ativos. |
| POST | `/api/me/enderecos` | Customer | Criar endereço. |
| GET | `/api/me/enderecos/{id}` | Customer | Consultar endereço próprio. |
| PUT | `/api/me/enderecos/{id}` | Customer | Atualizar endereço próprio. |
| DELETE | `/api/me/enderecos/{id}` | Customer | Inativar endereço. |
| PATCH | `/api/me/enderecos/{id}/principal` | Customer | Tornar principal. |

### Catálogo público

| Método | Rota | Acesso | Uso |
| --- | --- | --- | --- |
| GET | `/api/categorias` | Público | Categorias ativas. |
| GET | `/api/categorias/{slug}` | Público | Detalhe da categoria. |
| GET | `/api/produtos` | Público | Produtos publicados. |
| GET | `/api/produtos/{slug}` | Público | Detalhe do produto. |
| GET | `/api/produtos/{slug}/relacionados` | Público | Produtos relacionados. |

Filtros públicos de `/api/produtos`:

- `search`, `category`, `color`, `material`, `size`
- `minPrice`, `maxPrice`
- `available`, `isFeatured`, `isNewArrival`, `isPromotion`
- `sort`: `menor-preco`, `maior-preco`, `lancamentos` ou padrão por destaque/ordem.
- `page`, `pageSize`

### Carrinho

| Método | Rota | Acesso | Uso |
| --- | --- | --- | --- |
| GET | `/api/carrinho` | Público/autenticado | Consultar/criar carrinho atual. |
| POST | `/api/carrinho/itens` | Público/autenticado | Adicionar item. |
| PUT | `/api/carrinho/itens/{id}` | Público/autenticado | Alterar quantidade. |
| DELETE | `/api/carrinho/itens/{id}` | Público/autenticado | Remover item. |
| POST | `/api/carrinho/validar` | Público/autenticado | Revalidar preço, estoque e disponibilidade. |
| POST | `/api/carrinho/merge` | Customer | Mesclar carrinho anônimo após login. |

O carrinho anônimo usa `cartSessionId` em query/body ou header `X-Cart-Session-Id`. O backend pode gerar um novo `cartSessionId`; o front deve guardar esse valor.

### Checkout

| Método | Rota | Acesso | Uso |
| --- | --- | --- | --- |
| POST | `/api/checkout/validate` | Customer | Validar carrinho, perfil, endereço, estoque, preço e cupom. |
| POST | `/api/checkout/shipping-options` | Customer | Calcular frete. |
| POST | `/api/checkout/coupons/validate` | Customer | Validar cupom no checkout. |
| POST | `/api/checkout` | Customer | Criar pedido pendente. Exige `Idempotency-Key`. |
| POST | `/api/checkout/{orderId}/payment` | Customer | Preparar pagamento. |
| GET | `/api/checkout/{orderId}/status` | Customer | Consultar status do checkout. |

Frete atual: provider interno temporário `InternalShipping`, serviços `STANDARD` e `EXPRESS`.

- MG: padrão 3 dias, expressa 1 dia.
- Outros estados: padrão 7 dias, expressa 4 dias.
- Padrão é grátis se subtotal >= R$ 299.
- Preço da opção selecionada é revalidado no `POST /api/checkout`.

Pagamento atual: `PendingProviderAdapter`, `requiresProviderIntegration=true`. Não há QR Code Pix real enquanto o gateway não for plugado.

### Pedidos e pagamentos da cliente

| Método | Rota | Acesso | Uso |
| --- | --- | --- | --- |
| GET | `/api/pedidos` | Customer | Listar pedidos próprios. |
| GET | `/api/pedidos/{id}` | Customer | Detalhar pedido próprio. |
| GET | `/api/pedidos/{id}/rastreio` | Customer | Rastreio. |
| GET | `/api/pedidos/{id}/pagamentos` | Customer | Tentativas de pagamento. |
| POST | `/api/pedidos/{id}/pagamentos/tentar-novamente` | Customer | Nova tentativa permitida. |
| POST | `/api/pedidos/{id}/cancelar` | Customer | Cancelar antes do pagamento. |
| GET | `/api/pagamentos/{id}` | Autenticado | Consultar tentativa de pagamento, com controle por dono/role. |

### Webhooks

| Método | Rota | Acesso | Uso |
| --- | --- | --- | --- |
| POST | `/api/webhooks/pagamentos/{provider}` | Público/provider | Receber e armazenar webhook de pagamento. |

Em produção, assinatura é obrigatória quando configurada. Headers aceitos: `X-Webhook-Signature`, `X-Hub-Signature-256`, `X-Signature`. O webhook hoje armazena evento, hash e payload bruto restrito; confirmação real de pagamento depende do gateway.

### Admin: usuários, clientes e endereços

| Método | Rota | Acesso | Uso |
| --- | --- | --- | --- |
| GET | `/api/admin/users` | Admin | Listar usuários. |
| GET | `/api/admin/users/{id}` | Admin | Consultar usuário. |
| POST | `/api/admin/users/employees` | Admin | Criar funcionário. |
| PUT | `/api/admin/users/employees/{id}` | Admin | Atualizar funcionário. |
| PATCH | `/api/admin/users/{id}/status` | Admin | Ativar/inativar usuário. |
| GET | `/api/admin/customers` | Employee/Admin + permissão | Listar clientes com dados minimizados. |
| GET | `/api/admin/customers/{id}` | Employee/Admin + permissão | Detalhar cliente. |
| PATCH | `/api/admin/customers/{id}/status` | Employee/Admin + permissão | Ativar/inativar cliente. |
| POST | `/api/admin/customers/{id}/anonymize` | Employee/Admin + permissão | Anonimizar dados pessoais. |
| GET | `/api/admin/customers/{customerId}/enderecos` | Employee/Admin + permissão | Listar endereços ativos do cliente. |

Cuidado: nas rotas de `customers`, o `{id}` usado pelo backend é o `CustomerProfile.Id`, não o `User.Id`. As respostas também trazem `userId`.

### Admin: produtos, categorias, imagens, storage e estoque

| Método | Rota | Acesso | Uso |
| --- | --- | --- | --- |
| GET | `/api/admin/produtos` | Employee/Admin + permissão | Listar produtos admin. |
| POST | `/api/admin/produtos` | Employee/Admin + permissão | Criar produto. |
| GET | `/api/admin/produtos/{id}` | Employee/Admin + permissão | Detalhar produto. |
| PUT | `/api/admin/produtos/{id}` | Employee/Admin + permissão | Atualizar produto. |
| DELETE | `/api/admin/produtos/{id}` | Employee/Admin + permissão | Arquivar produto. |
| PATCH | `/api/admin/produtos/{id}/status` | Employee/Admin + permissão | Alterar status. |
| PATCH | `/api/admin/produtos/{id}/destaque` | Employee/Admin + permissão | Alterar destaque. |
| GET | `/api/admin/produtos/{id}/historico-preco` | Employee/Admin + permissão | Histórico de preço/custo. |
| POST | `/api/admin/produtos/{productId}/variantes` | Employee/Admin + permissão | Criar SKU. |
| PUT | `/api/admin/produtos/{productId}/variantes/{variantId}` | Employee/Admin + permissão | Atualizar SKU. |
| DELETE | `/api/admin/produtos/{productId}/variantes/{variantId}` | Employee/Admin + permissão | Inativar SKU. |
| POST | `/api/admin/produtos/{productId}/imagens` | Employee/Admin + permissão | Adicionar metadados de imagem. |
| PUT | `/api/admin/produtos/{productId}/imagens/{imageId}` | Employee/Admin + permissão | Atualizar imagem. |
| DELETE | `/api/admin/produtos/{productId}/imagens/{imageId}` | Employee/Admin + permissão | Inativar imagem. |
| PATCH | `/api/admin/produtos/{productId}/imagens/{imageId}/principal` | Employee/Admin + permissão | Definir imagem principal. |
| GET | `/api/admin/categorias` | Employee/Admin + permissão | Listar categorias admin. |
| POST | `/api/admin/categorias` | Employee/Admin + permissão | Criar categoria. |
| PUT | `/api/admin/categorias/{id}` | Employee/Admin + permissão | Atualizar categoria. |
| DELETE | `/api/admin/categorias/{id}` | Employee/Admin + permissão | Arquivar categoria. |
| POST | `/api/admin/storage/imagens/upload-url` | Employee/Admin + permissão | Gerar URL temporária de upload. |
| GET | `/api/admin/estoque` | Employee/Admin + permissão | Listar estoque por SKU. |
| GET | `/api/admin/estoque/{variantId}` | Employee/Admin + permissão | Detalhar estoque de SKU. |
| POST | `/api/admin/estoque/ajustes` | Employee/Admin + permissão | Ajustar estoque com motivo. |
| GET | `/api/admin/estoque/movimentacoes` | Employee/Admin + permissão | Movimentações. |
| GET | `/api/admin/estoque/reservas` | Employee/Admin + permissão | Reservas. |
| POST | `/api/admin/estoque/reservas/{id}/liberar` | Employee/Admin + permissão | Liberar reserva. |
| GET | `/api/admin/estoque/baixo` | Employee/Admin + permissão | SKUs com estoque baixo. |

Regra importante: depois que o SKU existe, alterações de `stockQuantity` e `reservedQuantity` pelo formulário de produto são bloqueadas. Use o módulo de estoque para ajustar saldo, sempre com motivo.

Fluxo de imagem recomendado:

1. Front chama `POST /api/admin/storage/imagens/upload-url` com `fileName`, `contentType`, `contentLength`, `folder`.
2. Backend retorna `uploadUrl`, `storageKey`, `publicUrl`, `contentType`, `expiresAt`, `maxSizeBytes`.
3. Front faz `PUT` direto no `uploadUrl` com o arquivo.
4. Front salva metadados em `POST /api/admin/produtos/{productId}/imagens`.

Tipos aceitos: JPG, PNG, WEBP, GIF. Tamanho máximo: 10 MB. URL assinada expira em 10 minutos.

### Admin: pedidos

| Método | Rota | Acesso | Uso |
| --- | --- | --- | --- |
| GET | `/api/admin/pedidos` | Employee/Admin + permissão | Listar pedidos. |
| GET | `/api/admin/pedidos/{id}` | Employee/Admin + permissão | Detalhar pedido. |
| GET | `/api/admin/pedidos/{id}/historico` | Employee/Admin + permissão | Histórico de status. |
| GET | `/api/admin/pedidos/{id}/pagamentos` | Employee/Admin + permissão | Tentativas de pagamento. |
| PATCH | `/api/admin/pedidos/{id}/status` | Employee/Admin + permissão | Status operacional. |
| POST | `/api/admin/pedidos/{id}/cancelar` | Employee/Admin + permissão | Cancelar pedido. |
| POST | `/api/admin/pedidos/{id}/envio` | Employee/Admin + permissão | Registrar envio. |
| PATCH | `/api/admin/pedidos/{id}/rastreio` | Employee/Admin + permissão | Atualizar rastreio. |
| POST | `/api/admin/pedidos/{id}/fiscal/previa` | Employee/Admin + permissão | Gerar prévia fiscal sem valor fiscal. |
| GET | `/api/admin/pedidos/{id}/fiscal/previa` | Employee/Admin + permissão | Consultar prévia fiscal. |
| GET | `/api/admin/pedidos/{id}/fiscal/xml-rascunho` | Employee/Admin + permissão | Baixar XML de rascunho. |
| GET | `/api/admin/pedidos/{id}/webhook-events` | Employee/Admin + permissão | Eventos de webhook. |

O admin não pode marcar status financeiro (`Paid`, `PaymentFailed`, `PaymentExpired`, `Refunded`, `PartiallyRefunded`) manualmente nesta versão. Esses status são reservados para webhook validado ou conciliação segura futura.

### Admin: cupons e promoções

| Método | Rota | Acesso | Uso |
| --- | --- | --- | --- |
| GET | `/api/admin/cupons` | Employee/Admin + permissão | Listar cupons. |
| POST | `/api/admin/cupons` | Employee/Admin + permissão | Criar cupom. |
| GET | `/api/admin/cupons/{id}` | Employee/Admin + permissão | Detalhar cupom. |
| PUT | `/api/admin/cupons/{id}` | Employee/Admin + permissão | Atualizar cupom. |
| PATCH | `/api/admin/cupons/{id}/status` | Employee/Admin + permissão | Ativar/inativar. |
| DELETE | `/api/admin/cupons/{id}` | Employee/Admin + permissão | Arquivar com motivo. |
| GET | `/api/admin/cupons/{id}/usos` | Employee/Admin + permissão | Usos/reservas. |
| GET | `/api/admin/cupons/{id}/relatorio` | Employee/Admin + permissão | Relatório do cupom. |
| GET | `/api/admin/promocoes` | Employee/Admin + permissão | Listar promoções. |
| POST | `/api/admin/promocoes` | Employee/Admin + permissão | Criar promoção. |
| GET | `/api/admin/promocoes/{id}` | Employee/Admin + permissão | Detalhar promoção. |
| PUT | `/api/admin/promocoes/{id}` | Employee/Admin + permissão | Atualizar promoção. |
| PATCH | `/api/admin/promocoes/{id}/status` | Employee/Admin + permissão | Ativar/inativar. |
| DELETE | `/api/admin/promocoes/{id}` | Employee/Admin + permissão | Arquivar com motivo. |
| GET | `/api/admin/promocoes/{id}/relatorio` | Employee/Admin + permissão | Relatório da promoção. |

Cupom digitado existe somente no checkout. O carrinho não aplica nem persiste cupom.

### Admin: dashboard, relatórios, auditoria e alertas

| Método | Rota | Acesso | Uso |
| --- | --- | --- | --- |
| GET | `/api/admin/dashboard` | Employee/Admin + permissão | Indicadores operacionais. |
| GET | `/api/admin/relatorios/vendas` | Employee/Admin + permissão | Relatório de vendas. |
| GET | `/api/admin/relatorios/produtos` | Employee/Admin + permissão | Relatório de produtos. |
| GET | `/api/admin/relatorios/estoque` | Employee/Admin + permissão | Relatório de estoque. |
| GET | `/api/admin/relatorios/clientes` | Employee/Admin + permissão | Relatório de clientes minimizado. |
| GET | `/api/admin/relatorios/cupons` | Employee/Admin + permissão | Relatório consolidado de cupons. |
| GET | `/api/admin/relatorios/carrinhos-abandonados` | Employee/Admin + permissão | Carrinhos abandonados. |
| POST | `/api/admin/relatorios/exportacoes` | Employee/Admin + permissão | Criar exportação CSV. |
| GET | `/api/admin/relatorios/exportacoes/{id}` | Employee/Admin + permissão | Status de exportação. |
| GET | `/api/admin/relatorios/exportacoes/{id}/download` | Employee/Admin + permissão | Baixar arquivo. |
| GET | `/api/admin/auditoria` | Admin | Listar auditoria. |
| GET | `/api/admin/auditoria/{id}` | Admin | Detalhar auditoria. |
| GET | `/api/admin/alertas` | Employee/Admin + permissão | Listar alertas. |
| GET | `/api/admin/alertas/{id}` | Employee/Admin + permissão | Detalhar alerta. |
| PATCH | `/api/admin/alertas/{id}/resolver` | Employee/Admin + permissão | Resolver com motivo. |
| PATCH | `/api/admin/alertas/{id}/ignorar` | Employee/Admin + permissão | Ignorar com motivo. |

Exportação atual é CSV síncrona, com conteúdo privado no banco e expiração. Excel/PDF estão planejados, não prontos.

### Notificações e jobs

| Método | Rota | Acesso | Uso |
| --- | --- | --- | --- |
| GET | `/api/me/notificacoes/preferencias` | Customer | Consultar preferências. |
| PUT | `/api/me/notificacoes/preferencias` | Customer | Atualizar preferências. |
| GET | `/api/admin/notificacoes` | Employee/Admin + permissão | Listar fila/outbox. |
| GET | `/api/admin/notificacoes/{id}` | Employee/Admin + permissão | Detalhar mensagem. |
| POST | `/api/admin/notificacoes/carrinhos-abandonados/enfileirar` | Employee/Admin + permissão | Enfileirar lembretes. |
| POST | `/api/admin/notificacoes/despachar` | Employee/Admin + permissão | Despachar pendentes. |
| GET | `/api/admin/jobs/execucoes` | Employee/Admin + permissão | Histórico de jobs. |
| POST | `/api/admin/jobs/executar` | Employee/Admin + permissão | Executar job. |

Envio real de e-mail/WhatsApp/Telegram ainda não está plugado. A versão atual usa padrão outbox e marca mensagens como enviadas.

## Fluxos importantes para o frontend

### Fluxo de sessão

1. Login em `/api/auth/login`.
2. Guardar `accessToken` para rotas protegidas.
3. Antes de expirar, chamar `/api/auth/refresh`.
4. Em `401`, tentar refresh uma vez; se falhar, limpar sessão.
5. Logout: `/api/auth/revoke` e limpar estado local.

### Fluxo de carrinho anônimo para logado

1. Visitante adiciona item com `productVariantId` e `quantity`.
2. Resposta traz `cartSessionId`; guardar no navegador.
3. Nas próximas chamadas anônimas, enviar `X-Cart-Session-Id` ou `cartSessionId`.
4. Ao logar, chamar `POST /api/carrinho/merge` com o `cartSessionId`.
5. Usar o carrinho retornado como carrinho da conta.

### Fluxo de checkout

1. Cliente precisa estar logada.
2. Carrinho precisa estar vinculado à cliente.
3. Cliente precisa ter perfil com CPF, telefone e termos aceitos.
4. Cliente escolhe endereço ativo.
5. Chamar `/api/checkout/validate`.
6. Chamar `/api/checkout/shipping-options`.
7. Se houver cupom, chamar `/api/checkout/coupons/validate`.
8. Chamar `POST /api/checkout` com `Idempotency-Key` único por tentativa.
9. Chamar `/api/checkout/{orderId}/payment`.
10. Exibir status pendente; pagamento real ainda depende do provider.

### Fluxo admin de imagem

1. Pedir URL assinada no backend.
2. Fazer upload direto no R2/S3.
3. Salvar metadados da imagem no produto.
4. Se necessário, marcar imagem principal.

### Fluxo admin de permissão

1. Buscar o usuário logado em `/api/me`.
2. Se role for `Admin`, liberar admin completo.
3. Se role for `Employee`, buscar matriz/catálogo conforme estratégia da tela.
4. Esconder ações sem permissão, mas manter tratamento de `403`.

## Principais contratos de dados

### Produto público

Lista de produto retorna, entre outros:

- `id`, `name`, `slug`, `shortDescription`
- `mainImageUrl`, `images`
- `priceFrom`, `promotionalPriceFrom`
- `variants`
- `isAvailable`, `isFeatured`, `isNewArrival`, `isPromotion`

Detalhe inclui:

- `description`
- `categories`
- `images`
- `variants`
- `seoTitle`, `seoDescription`
- `isAvailable`

Variação pública:

- `id`, `sku`, `name`
- `color`, `colorHex`, `size`, `material`
- `price`, `promotionalPrice`
- `availableQuantity`, `isAvailable`

### Carrinho

`CartResponseDto`:

- `id`
- `cartSessionId`
- `status`
- `items`
- `totalItems`
- `subtotal`
- `totalWithoutShipping`
- `hasUnavailableItems`
- `hasPriceChanges`
- `expiresAt`
- `messages`

Item:

- `id`, `productId`, `productSlug`, `productName`
- `variantId`, `sku`, `variantName`
- `imageUrl`
- `quantity`
- `unitPrice`, `promotionalPrice`, `effectiveUnitPrice`, `lineTotal`
- `isAvailable`, `availableQuantity`, `hasPriceChanged`
- `messages`

### Checkout

Validação:

- `isValid`
- `cartId`
- `items`
- `customerIssues`
- `addressIssues`
- `stockIssues`
- `priceIssues`
- `couponIssues`
- `subtotal`

Frete:

- `provider`
- `serviceCode`
- `serviceName`
- `price`
- `estimatedDays`
- `rawReference`

Cupom:

- `isValid`
- `message`
- `couponCode`
- `discountTotal`
- `shippingDiscount`
- `subtotal`
- `shippingTotal`
- `total`
- `affectedItems`
- `issues`

Resposta de checkout:

- `orderId`
- `orderNumber`
- `status`
- `subtotal`
- `discountTotal`
- `shippingTotal`
- `total`
- `payment`
- `expiresAt`

Pagamento preparado:

- `paymentMethod`
- `status`
- `provider`
- `requiresProviderIntegration`
- `expiresAt`
- `message`

### Pedido

Lista:

- `id`
- `orderNumber`
- `createdAt`
- `status`
- `paymentStatus`
- `customerName`
- `total`
- `itemsPreview`
- `trackingCode`

Detalhe:

- `id`, `orderNumber`, `createdAt`, `expiresAt`
- `status`, `paymentStatus`
- `customer`
- `shippingAddress`
- `shipping`
- `payment`
- `totals`
- `items`
- `history`
- `canCancel`
- `canRetryPayment`

O backend mascara CPF/telefone em DTOs voltados para tela quando apropriado.

## Status e enums úteis

Produtos:

- `Draft`
- `Published`
- `Archived`

Carrinho:

- `Active`
- `Merged`
- `Expired`
- `ConvertedToOrder`

Pedidos:

- `AwaitingPayment`
- `Paid`
- `PaymentExpired`
- `PaymentFailed`
- `Preparing`
- `Shipped`
- `Delivered`
- `Canceled`
- `Refunded`
- `PartiallyRefunded`

Pagamentos:

- `Pending`
- `Approved`
- `Expired`
- `Failed`
- `Canceled`
- `Refunded`
- `PartiallyRefunded`

Método de pagamento atual:

- `Pix`

Reservas de estoque:

- `Active`
- `Confirmed`
- `Released`
- `Expired`
- `Canceled`

Movimentos de estoque:

- `InitialStock`
- `ManualEntry`
- `ManualExit`
- `ReservationCreated`
- `ReservationReleased`
- `ReservationExpired`
- `SaleConfirmed`
- `OrderCanceled`
- `Return`
- `InventoryCorrection`

Cupons:

- Status: `Active`, `Inactive`, `Archived`
- Tipos: `Percentage`, `FixedAmount`, `FreeShipping`
- Escopos: `Order`, `Product`, `Category`, `ProductVariant`, `Shipping`
- Uso: `Reserved`, `Consumed`, `Released`, `Expired`

Promoções:

- `Active`
- `Inactive`
- `Archived`

Alertas:

- Status: `Open`, `InProgress`, `Resolved`, `Ignored`
- Severidade: `Low`, `Medium`, `High`, `Critical`

Jobs:

- `ExpireCarts`
- `ExpireStockReservations`
- `ExpireCouponReservations`
- `CleanupReportExports`
- `SyncAdminAlerts`
- `QueueAbandonedCartReminders`
- `DispatchNotifications`
- `RunAllMaintenance`

Readiness:

- `Ready`
- `Warning`
- `Blocked`

## Regras de negócio que o frontend deve respeitar

- Nunca enviar preço/estoque como fonte de verdade. O backend sempre recalcula.
- Carrinho não reserva estoque.
- Carrinho não calcula frete.
- Carrinho não aplica cupom.
- Cupom digitado só entra no checkout.
- Checkout exige login, perfil completo, endereço ativo, carrinho válido e `Idempotency-Key`.
- A mesma `Idempotency-Key` com o mesmo payload retorna o mesmo pedido; com payload diferente, falha.
- Produto publicado sem estoque pode aparecer como indisponível.
- Produto arquivado não aparece no catálogo público.
- SKU inativo não pode ser comprado.
- Estoque deve ser ajustado pelo módulo de estoque, com motivo obrigatório.
- Endereço deletado é soft delete.
- Pedido guarda snapshot de cliente, endereço, frete, itens, preços e cupom.
- Cliente só vê os próprios pedidos.
- Funcionário só deve ver/acionar o que tiver permissão.
- Dados sensíveis aparecem mascarados em listagens; não tentar "desmascarar" no front.
- Exportação com dados sensíveis exige permissão e auditoria.

## Limites e pendências reais

Estas partes existem como infraestrutura/contrato, mas ainda não são integrações finais:

- Gateway de pagamento real não está plugado. Pix está planejado, mas hoje o pagamento retorna provider `PendingProviderAdapter`.
- Webhook de pagamento é armazenado com segurança, mas ainda não baixa estoque definitivamente nem marca pagamento aprovado por provider real.
- Frete usa provider interno temporário; integração externa ainda precisa ser escolhida.
- E-mail real ainda não está plugado; notificações usam outbox/dispatcher interno.
- WhatsApp, Telegram e n8n estão planejados, não prontos.
- Storage R2 está implementado, mas depende de variáveis reais e CORS do bucket.
- Promoções automáticas têm CRUD/relatório, mas ainda não alteram preço de catálogo/carrinho automaticamente.
- Cupom reservado vira `Consumed` apenas quando houver pagamento aprovado por webhook validado em fase futura.
- Fiscal real não existe; há apenas prévia e XML de rascunho com `PREVIA SEM VALOR FISCAL`.
- Exportação Excel/PDF está planejada; hoje o backend entrega CSV.
- Swagger fica ativo em desenvolvimento ou quando `Swagger:Enabled=true`.

## Configuração local relevante

Em desenvolvimento, o backend espera PostgreSQL local e CORS para front local.

`appsettings.Development.json` usa:

- Banco: `Host=localhost;Port=5433;Database=bibi_bolsas;Username=postgres;Password=postgres`
- JWT dev key configurada.
- CORS liberado para `http://127.0.0.1:5173`, `http://localhost:3000`, `http://localhost:5173`, `http://localhost:4200`.

`.env.example` indica:

- `ASPNETCORE_URLS=http://localhost:5080`
- Storage R2/S3 via `Storage__...`

Se o frontend estiver em Vite, a origem esperada mais provável é `http://localhost:5173`.

## Fontes úteis no repositório

- Arquitetura geral: `docs/00-arquitetura-e-stack.md`
- Endpoints planejados: `docs/01-modulos-e-endpoints.md`
- Segurança e qualidade: `docs/02-seguranca-e-qualidade.md`
- Plano e status por fase: `docs/04-plano-de-implementacao.md`
- Roteiro técnico: `docs/05-roteiro-tecnico-construcao.md`
- Documentação por módulo: `docs/modulos/*.md`
- Controllers reais: `backend-bibi-bolsas/BackendBibiBolsas.API/Controllers`
- DTOs reais: `backend-bibi-bolsas/BackendBibiBolsas.API/DTOs`
- Constantes/status/permissões: `backend-bibi-bolsas/BackendBibiBolsas.API/Common`
- Regras de negócio: `backend-bibi-bolsas/BackendBibiBolsas.API/Services`

Quando houver divergência entre docs antigos e código atual, o código atual deve vencer.
