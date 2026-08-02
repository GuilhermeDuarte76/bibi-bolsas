import { STORE, activeContactChannels, formatStoreAddress } from '@/lib/store-info';
import { formatPrice } from '@/lib/utils';

/**
 * Conteudo das paginas de ajuda e institucionais.
 *
 * ⚠️  REVISAO OBRIGATORIA antes de publicar: os textos abaixo sao rascunhos
 * fieis ao que o sistema realmente faz e ao minimo exigido pelo CDC/LGPD, mas
 * precisam do aval de quem responde pela loja (e, nos documentos legais, de
 * um advogado). Os campos que dependem de dados da empresa saem de
 * `src/lib/store-info.ts` e simplesmente nao aparecem enquanto forem null.
 */

export interface DocSection {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
  /** Destaque em caixa — use para prazos e condicoes que nao podem passar batido. */
  callout?: string;
}

export interface InstitutionalDoc {
  slug: string;
  group: 'ajuda' | 'institucional';
  title: string;
  subtitle: string;
  metaDescription: string;
  sections: DocSection[];
}

const contactSentence = (): string => {
  const channels = activeContactChannels();
  if (!channels.length) {
    return 'Fale com a nossa equipe pelos canais informados no rodapé do site.';
  }
  return `Fale com a nossa equipe por ${channels.map((c) => `${c.label} (${c.value})`).join(' ou ')}.`;
};

function buildDocs(): InstitutionalDoc[] {
  const freeShipping = formatPrice(STORE.freeShippingThresholdCents);
  const returnDays = STORE.returnWindowDays;
  const address = formatStoreAddress();

  return [
    {
      slug: 'prazos-e-envio',
      group: 'ajuda',
      title: 'Prazos e envio',
      subtitle: 'Como o seu pedido sai daqui e chega até você.',
      metaDescription:
        'Prazos de separação, envio e entrega dos pedidos da Bibi Bolsas, com regras de frete grátis.',
      sections: [
        {
          heading: 'Separação do pedido',
          paragraphs: [
            `Depois que o pagamento é confirmado, separamos e postamos o seu pedido em ${STORE.handlingTimeLabel}. Pedidos aprovados em fins de semana e feriados entram na fila do próximo dia útil.`,
            'Enquanto o pagamento não é confirmado, o pedido fica com o estoque reservado e o status "aguardando pagamento" na sua conta.',
          ],
        },
        {
          heading: 'Prazo de entrega',
          paragraphs: [
            'O prazo aparece no checkout, calculado a partir do CEP de entrega. Ele começa a contar depois da postagem, não no momento da compra.',
          ],
          bullets: [
            'Minas Gerais: entrega padrão em até 3 dias úteis · expressa em 1 dia útil',
            'Demais estados: entrega padrão em até 7 dias úteis · expressa em até 4 dias úteis',
          ],
        },
        {
          heading: 'Frete grátis',
          paragraphs: [
            `A entrega padrão é gratuita em compras a partir de ${freeShipping}. O desconto é aplicado automaticamente no checkout — não precisa de cupom.`,
          ],
          callout: `Compras a partir de ${freeShipping} têm frete padrão grátis para todo o Brasil.`,
        },
        {
          heading: 'Acompanhar a entrega',
          paragraphs: [
            'Assim que o pedido é postado, o código de rastreio fica disponível em Minha conta › Meus pedidos, junto com o histórico de cada etapa.',
          ],
        },
      ],
    },

    {
      slug: 'trocas-e-devolucoes',
      group: 'ajuda',
      title: 'Trocas e devoluções',
      subtitle: 'Seus direitos e como resolver, sem burocracia.',
      metaDescription:
        'Política de trocas e devoluções da Bibi Bolsas: prazo de arrependimento, defeitos e como solicitar.',
      sections: [
        {
          heading: 'Arrependimento da compra',
          paragraphs: [
            `Por se tratar de compra pela internet, você pode desistir do pedido em até ${returnDays} dias corridos contados do recebimento, sem precisar justificar o motivo. É o direito de arrependimento previsto no artigo 49 do Código de Defesa do Consumidor.`,
            'O produto deve voltar sem sinais de uso, com etiquetas e embalagem original. Nesse caso, o valor pago é devolvido integralmente, inclusive o frete.',
          ],
          callout: `${returnDays} dias corridos para desistir da compra, contados a partir do recebimento.`,
        },
        {
          heading: 'Produto com defeito',
          paragraphs: [
            'Se o produto apresentar defeito de fabricação, o prazo legal para reclamar é de 90 dias a partir do recebimento, conforme o artigo 26 do CDC. Avalie o item assim que receber e nos avise ao identificar qualquer problema.',
            'Nos casos de defeito, a coleta e o reenvio são por nossa conta.',
          ],
        },
        {
          heading: 'Troca por outro modelo, cor ou tamanho',
          paragraphs: [
            `Dentro dos mesmos ${returnDays} dias, também trocamos por outro item, sujeito à disponibilidade de estoque. Havendo diferença de valor, ela é cobrada ou devolvida na troca.`,
          ],
        },
        {
          heading: 'Como solicitar',
          paragraphs: [
            `${contactSentence()} Tenha em mãos o número do pedido — ele aparece em Minha conta › Meus pedidos. A partir daí orientamos a postagem e acompanhamos o processo até a conclusão.`,
          ],
        },
        {
          heading: 'Estorno',
          paragraphs: [
            'Após recebermos e conferirmos o produto, o estorno é processado em até 10 dias úteis. Pagamentos via Pix são devolvidos na mesma chave usada na compra.',
          ],
        },
      ],
    },

    {
      slug: 'formas-de-pagamento',
      group: 'ajuda',
      title: 'Formas de pagamento',
      subtitle: 'Como você pode pagar hoje na Bibi Bolsas.',
      metaDescription: 'Formas de pagamento aceitas na Bibi Bolsas e como funciona o pagamento via Pix.',
      sections: [
        {
          heading: 'Pix',
          paragraphs: [
            'No momento, todos os pedidos são pagos via Pix. Ao finalizar a compra, o pedido é criado com o estoque reservado e você recebe as instruções de pagamento.',
            'A confirmação é automática. Assim que o pagamento cai, o pedido muda de status na sua conta e entra na fila de separação.',
          ],
          callout: 'Hoje aceitamos exclusivamente Pix. Novas formas de pagamento em breve.',
        },
        {
          heading: 'Prazo para pagar',
          paragraphs: [
            'O pedido fica reservado por um período limitado, informado na tela de pagamento. Passado esse prazo sem confirmação, ele é cancelado automaticamente e os itens voltam para o estoque.',
            'Se isso acontecer, é só refazer o pedido — nada é cobrado de você.',
          ],
        },
        {
          heading: 'Segurança',
          paragraphs: [
            'Não armazenamos dados de pagamento nos nossos servidores. A transação acontece no ambiente do provedor de pagamento, e a loja recebe apenas a confirmação.',
          ],
        },
      ],
    },

    {
      slug: 'contato',
      group: 'ajuda',
      title: 'Fale conosco',
      subtitle: 'Estamos por aqui para ajudar com pedidos, trocas e dúvidas.',
      metaDescription: 'Canais de atendimento da Bibi Bolsas para dúvidas, pedidos e trocas.',
      sections: [
        {
          heading: 'Canais de atendimento',
          paragraphs: [contactSentence()],
          bullets: STORE.businessHours ? [`Horário de atendimento: ${STORE.businessHours}`] : undefined,
        },
        {
          heading: 'Antes de escrever',
          paragraphs: [
            'Muita coisa você resolve sozinha em segundos: o status do pedido, o código de rastreio e o histórico de cada etapa ficam em Minha conta › Meus pedidos.',
          ],
        },
        ...(address
          ? [
              {
                heading: 'Endereço',
                paragraphs: [address],
              },
            ]
          : []),
      ],
    },

    {
      slug: 'sobre',
      group: 'institucional',
      title: 'Nossa história',
      subtitle: 'Uma bolsa ideal para cada momento.',
      metaDescription: 'Conheça a Bibi Bolsas: curadoria de bolsas, mochilas e malas para cada momento.',
      sections: [
        {
          paragraphs: [
            'A Bibi Bolsas nasceu de uma ideia simples: cada momento do dia pede uma companhia diferente. A bolsa do trabalho não é a mesma do fim de semana, e a mala da viagem precisa aguentar o que o passeio não exige.',
            'Por isso trabalhamos com curadoria, não com volume. Cada peça entra na vitrine depois de passar pelo mesmo teste: resiste ao uso real, organiza bem o que você carrega e continua bonita depois do sexto mês.',
          ],
        },
        {
          heading: 'Como escolhemos cada peça',
          bullets: [
            'Materiais que envelhecem bem, sem descolar ou desbotar no primeiro uso',
            'Compartimentos pensados para o que se carrega de verdade',
            'Acabamento conferido peça a peça antes de ir para o estoque',
          ],
        },
      ],
    },

    {
      slug: 'privacidade',
      group: 'institucional',
      title: 'Política de privacidade',
      subtitle: 'Quais dados coletamos, para quê e como você controla tudo isso.',
      metaDescription:
        'Política de privacidade da Bibi Bolsas: dados coletados, finalidades e direitos do titular pela LGPD.',
      sections: [
        {
          heading: 'Quais dados coletamos',
          bullets: [
            'Cadastro: nome, e-mail, telefone e CPF — o CPF é necessário para a emissão da nota fiscal',
            'Entrega: os endereços que você salva na sua conta',
            'Pedidos: itens, valores, forma de pagamento e histórico de status',
            'Navegação: dados técnicos necessários para o funcionamento e a segurança da loja',
          ],
        },
        {
          heading: 'Para que usamos',
          bullets: [
            'Processar e entregar seus pedidos',
            'Emitir documento fiscal, quando exigido por lei',
            'Prestar atendimento sobre compras, trocas e devoluções',
            'Enviar comunicações de marketing — apenas se você autorizar, e você pode revogar quando quiser',
          ],
        },
        {
          heading: 'Com quem compartilhamos',
          paragraphs: [
            'Compartilhamos o mínimo necessário com quem executa parte da operação: transportadora (para entregar), provedor de pagamento (para receber) e provedores de infraestrutura. Não vendemos seus dados e não os cedemos para terceiros com finalidade publicitária.',
          ],
        },
        {
          heading: 'Cookies, análise e publicidade',
          paragraphs: [
            'Cookies essenciais mantêm a sessão, a sacola e a segurança da loja e não podem ser desligados. Ferramentas de análise e publicidade só são ativadas depois da sua autorização no aviso de cookies.',
            'Quando autorizadas, essas ferramentas medem páginas visitadas e ações como busca, visualização de produto, início do checkout e compra aprovada. Você pode aceitar apenas análise, apenas publicidade, ambas ou nenhuma delas, e mudar a escolha a qualquer momento em “Preferências de cookies”, no rodapé.',
          ],
        },
        {
          heading: 'Seus direitos',
          paragraphs: [
            'A Lei Geral de Proteção de Dados (Lei 13.709/2018) garante que você acesse, corrija, exclua e saiba com quem seus dados foram compartilhados.',
            'Na prática: seus dados de cadastro e endereços podem ser editados a qualquer momento em Minha conta, e a solicitação de exclusão pode ser feita pela própria conta ou pelos nossos canais de atendimento.',
          ],
          callout:
            'Você pode solicitar a exclusão dos seus dados diretamente em Minha conta, sem precisar falar com ninguém.',
        },
        {
          heading: 'Por quanto tempo guardamos',
          paragraphs: [
            'Mantemos os dados enquanto a sua conta existir. Depois disso, retemos apenas o que a legislação fiscal e comercial exige — registros de venda, por exemplo, precisam ser guardados por prazo legal mesmo após a exclusão da conta.',
          ],
        },
        {
          heading: 'Encarregado de dados',
          paragraphs: [contactSentence()],
        },
      ],
    },

    {
      slug: 'termos',
      group: 'institucional',
      title: 'Termos de uso',
      subtitle: 'As regras da relação entre você e a loja.',
      metaDescription: 'Termos de uso da loja Bibi Bolsas: cadastro, pedidos, preços e responsabilidades.',
      sections: [
        {
          heading: 'Cadastro e conta',
          paragraphs: [
            'Para comprar é necessário criar uma conta com dados verdadeiros e mantê-los atualizados. Você é responsável por guardar sua senha e por tudo que for feito com ela.',
            'Podemos suspender contas com indício de fraude, uso indevido ou informação falsa.',
          ],
        },
        {
          heading: 'Pedidos e disponibilidade',
          paragraphs: [
            'O pedido só é confirmado após a aprovação do pagamento. Enquanto isso, o item fica reservado por prazo limitado.',
            'Em caso de erro evidente de preço ou de indisponibilidade do produto, entramos em contato e o pedido pode ser cancelado com devolução integral do valor pago.',
          ],
        },
        {
          heading: 'Preços e promoções',
          paragraphs: [
            'Os preços exibidos valem para a compra realizada no momento em que aparecem no site e podem mudar sem aviso. Cupons e promoções seguem as regras informadas em cada campanha, não são cumulativos salvo indicação em contrário, e valem enquanto durar o estoque.',
          ],
        },
        {
          heading: 'Propriedade intelectual',
          paragraphs: [
            'Textos, fotos, marca e identidade visual da loja são de nossa propriedade e não podem ser reproduzidos sem autorização.',
          ],
        },
        {
          heading: 'Legislação aplicável',
          paragraphs: [
            'Estes termos são regidos pela lei brasileira, especialmente pelo Código de Defesa do Consumidor. Nada aqui reduz os direitos que a lei garante a você.',
          ],
        },
      ],
    },
  ];
}

export const INSTITUTIONAL_DOCS = buildDocs();

export function findDoc(group: string, slug?: string): InstitutionalDoc | undefined {
  return INSTITUTIONAL_DOCS.find((doc) => doc.group === group && doc.slug === slug);
}
