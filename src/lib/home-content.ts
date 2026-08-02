import { Briefcase, Gift, Airplane, type Icon } from '@phosphor-icons/react';
import { editorialImage } from '@/lib/images';

/**
 * Conteudo editorial da Home.
 *
 * Fica separado da tela para o time de conteudo mexer sem tocar em layout.
 *
 * ⚠️  NAO E EDITAVEL PELO ADMIN AINDA. O backend nao tem modulo de conteudo /
 * banners, entao trocar a chamada do hero ou as fotos exige alterar este
 * arquivo e publicar. Quando existir `GET /api/home/hero`, basta trocar estas
 * constantes por uma query — a tela nao muda.
 */

export interface HeroContent {
  eyebrow: string;
  /** Titulo em duas partes: a segunda sai em italico terracotta. */
  titleLead: string;
  titleHighlight: string;
  description: string;
  primaryCta: { label: string; to: string };
  secondaryCta?: { label: string; to: string };
  /**
   * Tres imagens: a primeira e a peca alta, as outras duas quadradas.
   * Hoje sao placeholders gerados; troque `src` pela URL do R2 quando houver foto.
   */
  images: [HeroImage, HeroImage, HeroImage];
}

interface HeroImage {
  src: string;
  alt: string;
}

export const HERO: HeroContent = {
  eyebrow: 'Nova coleção · Inverno 2026',
  titleLead: 'Uma bolsa ideal para',
  titleHighlight: 'cada momento',
  description:
    'Curadoria de bolsas, mochilas e malas que unem praticidade e estilo. Feitas para acompanhar a sua rotina com cuidado e personalidade.',
  primaryCta: { label: 'Explorar vitrine', to: '/catalogo' },
  secondaryCta: { label: 'Ver promoções', to: '/categoria/promocoes' },
  images: [
    { src: editorialImage('terracotta', 'tote'), alt: 'Bolsa tote em destaque' },
    { src: editorialImage('travel', 'suitcase'), alt: 'Mala de viagem' },
    { src: editorialImage('cinnamon', 'backpack'), alt: 'Mochila urbana' },
  ],
};

export interface Showcase {
  key: string;
  label: string;
  headline: string;
  description: string;
  icon: Icon;
  /** Destino real, existente no catalogo. Nada de link que nao filtra nada. */
  to: string;
  palette: string;
}

/**
 * Vitrines curadas.
 *
 * Cada card aponta para uma categoria que existe de fato no backend — nao ha
 * campo "ocasiao" no produto, entao a curadoria e feita aqui, no destino.
 * Se um dia existir a tag no backend, basta trocar o `to` por `?occasion=`.
 */
export const SHOWCASES: Showcase[] = [
  {
    key: 'trabalho',
    label: 'Para o trabalho',
    headline: 'Estrutura e elegância',
    description: 'Bolsas que cabem notebook, agenda e ainda ficam bem na reunião.',
    icon: Briefcase,
    to: '/categoria/bolsas',
    palette: 'terracotta',
  },
  {
    key: 'viagem',
    label: 'Para viajar',
    headline: 'Companheiras de jornada',
    description: 'Malas e kits pensados para quem faz as malas com frequência.',
    icon: Airplane,
    to: '/categoria/malas',
    palette: 'travel',
  },
  {
    key: 'presente',
    label: 'Para presentear',
    headline: 'Acertar em cheio',
    description: 'Nossa curadoria com preço especial — bonito de dar e de receber.',
    icon: Gift,
    to: '/categoria/promocoes',
    palette: 'rose',
  },
];

/**
 * Depoimentos exibidos na Home.
 *
 * ⚠️  CONTEUDO DE EXEMPLO. Nao existe modulo de avaliacoes no backend; estes
 * textos foram mantidos a pedido do cliente. Substitua por depoimentos reais
 * (com autorizacao de quem escreveu) antes de divulgar a loja.
 */
export const TESTIMONIALS = [
  {
    name: 'Marina A.',
    text: 'A qualidade do couro me surpreendeu. Virou minha bolsa do dia a dia.',
    rating: 5,
  },
  {
    name: 'Carla M.',
    text: 'Entrega rápida e a cor é linda pessoalmente. Já é minha terceira compra.',
    rating: 5,
  },
  {
    name: 'Rafael S.',
    text: 'Comprei a mala de bordo para uma viagem e foi perfeita. Recomendo!',
    rating: 5,
  },
];
