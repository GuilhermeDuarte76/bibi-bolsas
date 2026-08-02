# Tracking, Analytics e Ads

O frontend já está instrumentado. Em produção, nenhum provedor carrega sem ID e
nenhum evento de análise ou publicidade é enviado antes da escolha de cookies.

## Ativação rápida (recomendada)

Copie `.env.example` para o arquivo de ambiente da hospedagem e preencha apenas
os provedores usados:

```env
VITE_GA4_ID=G-XXXXXXXXXX
VITE_GOOGLE_ADS_ID=AW-XXXXXXXXX
VITE_GOOGLE_ADS_PURCHASE_LABEL=AbCdEfGhIjKlMnOp
VITE_META_PIXEL_ID=123456789012345
VITE_ANALYTICS_DEBUG=false
```

Depois gere e publique um novo build. Como as variáveis `VITE_*` entram no
JavaScript durante o build, mudar o ambiente sem reconstruir não altera o site.

### Onde encontrar cada código

| Variável | Onde encontrar | Formato |
|---|---|---|
| `VITE_GA4_ID` | GA4 → Administrar → Fluxos de dados → Web | `G-...` |
| `VITE_GOOGLE_ADS_ID` | Google Ads → Metas → Conversões → Google tag | `AW-...` |
| `VITE_GOOGLE_ADS_PURCHASE_LABEL` | Snippet da ação de conversão “Compra”, trecho depois de `AW-.../` | letras, números, `_` e `-` |
| `VITE_META_PIXEL_ID` | Meta Events Manager → Fonte de dados | somente números |
| `VITE_GTM_ID` | Google Tag Manager → ID do container | `GTM-...` |

## Direto ou Google Tag Manager

Há duas formas válidas de operar:

1. **Direta (menos configuração):** preencha GA4, Google Ads e/ou Meta no
   ambiente. O frontend carrega e configura cada tag.
2. **GTM:** preencha `VITE_GTM_ID`. O frontend publica todos os eventos no
   `dataLayer`; as tags e os gatilhos são criados dentro do container.

Não configure o mesmo GA4 ou Google Ads diretamente e dentro do GTM ao mesmo
tempo. Isso duplica sessões, eventos e receita.

No GTM, eventos de ecommerce chegam assim:

```js
{
  event: 'purchase',
  ecommerce: {
    transaction_id: '#1052',
    currency: 'BRL',
    value: 329.90,
    shipping: 19.90,
    items: []
  }
}
```

Eventos sem produtos, como `page_view`, `search`, `login` e `sign_up`, chegam
com os parâmetros no nível principal. Cada tag criada no GTM deve respeitar os
controles de consentimento correspondentes.

## Eventos implementados

| Etapa | GA4 / dataLayer | Meta Pixel | Momento do disparo |
|---|---|---|---|
| Navegação | `page_view` | `PageView` | abertura e troca de rota da SPA |
| Busca | `search` | `Search` | busca enviada ou sugestão escolhida |
| Impressão de vitrine | `view_item_list` | — | lista carregada na Home, catálogo, relacionados ou busca rápida |
| Clique em produto | `select_item` | — | produto escolhido em uma lista |
| Produto | `view_item` | `ViewContent` | detalhe do produto carregado |
| Favorito | `add_to_wishlist` | `AddToWishlist` | produto adicionado aos favoritos |
| Adição à sacola | `add_to_cart` | `AddToCart` | produto ou quantidade adicionada |
| Remoção da sacola | `remove_from_cart` | — | produto ou quantidade removida |
| Sacola | `view_cart` | — | página da sacola aberta |
| Início do checkout | `begin_checkout` | `InitiateCheckout` | entrada no checkout |
| Frete | `add_shipping_info` | — | modalidade de entrega confirmada |
| Pagamento | `add_payment_info` | `AddPaymentInfo` | forma de pagamento confirmada |
| Compra | `purchase` | `Purchase` | **somente após o backend confirmar o pagamento** |
| Conta | `sign_up`, `login` | `CompleteRegistration` no cadastro | sucesso da ação |

Todos os valores monetários são números em BRL, convertidos dos centavos usados
pela aplicação. Os itens carregam ID do produto, variante/SKU, nome, marca,
preço e quantidade.

## Compra e deduplicação

Um pedido Pix criado como `pending_payment` não é conversão. A compra é enviada
quando `/checkout/{id}/status` confirma `paid` ou quando o checkout já retorna
um pedido pago.

Três camadas evitam receita duplicada:

- `transaction_id` usa o número único do pedido no GA4 e Google Ads;
- o Meta recebe `eventID` derivado do ID do pedido, pronto para deduplicação com
  uma futura Conversions API;
- o navegador mantém os últimos 50 IDs já enviados e ignora recarga, polling e
  a montagem dupla do React em desenvolvimento.

O `value` do GA4 representa mercadorias depois do desconto, com frete separado.
Google Ads e Meta recebem o total efetivamente pago, que é o valor usado para
otimização das campanhas.

## Consentimento e LGPD

- Essenciais: sessão, sacola e segurança; sempre ativos.
- Análise: GA4 e tags analíticas do GTM.
- Publicidade: Google Ads, Meta Pixel e tags de marketing do GTM.

O padrão é negado. O Google recebe os quatro sinais do Consent Mode v2
(`analytics_storage`, `ad_storage`, `ad_user_data` e `ad_personalization`). O
Meta Pixel só carrega com publicidade autorizada e recebe `revoke` se a escolha
for retirada. A pessoa pode reabrir o painel em **Preferências de cookies** no
rodapé.

## Validação antes de investir em mídia

1. Em um ambiente de teste, defina `VITE_ANALYTICS_DEBUG=true` e gere novo build.
2. Aceite os cookies e percorra: Home → produto → sacola → checkout.
3. Confira os eventos `[analytics]` no console, o Realtime/DebugView do GA4,
   o Tag Assistant do Google e “Testar eventos” do Meta Events Manager.
4. Faça um pedido Pix e confirme que `purchase` não aparece enquanto pendente.
5. Confirme o pagamento no backend e verifique um único `purchase`, com o mesmo
   pedido e valor nas plataformas.
6. Antes da publicação final, volte `VITE_ANALYTICS_DEBUG=false`.

## Padrão de UTMs para campanhas

As tags leem automaticamente os parâmetros presentes na URL de entrada. Use
nomes consistentes e minúsculos para conseguir comparar campanhas:

```text
?utm_source=instagram&utm_medium=paid_social&utm_campaign=dia_das_maes&utm_content=video_bolsa_terracota
```

- `utm_source`: plataforma (`instagram`, `facebook`, `google`);
- `utm_medium`: canal (`paid_social`, `cpc`, `email`);
- `utm_campaign`: nome estável da campanha;
- `utm_content`: criativo, público ou variação do anúncio;
- `utm_term`: palavra-chave, quando houver.

Não coloque nome, e-mail, telefone ou qualquer outro dado pessoal nas UTMs.

## Limite do tracking apenas no navegador

Se a cliente fechar a página antes da confirmação do Pix, o navegador não pode
enviar uma conversão que aconteceu depois. Para máxima cobertura, a próxima
etapa é o backend enviar compras aprovadas também pela Meta Conversions API e
pela importação/API de conversões do Google, usando exatamente o mesmo ID do
pedido para deduplicar com o evento do frontend.
