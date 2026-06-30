/**
 * Gerador de imagens placeholder on-brand.
 *
 * Enquanto nao existe banco de fotos real (ver docs/FRONTEND-PLANEJAMENTO.md
 * secao 16 "Pendencias Visuais"), geramos placeholders SVG elegantes em data-URI,
 * com a paleta Bibi e silhuetas de bolsa/mochila/mala. Sao autocontidos (funcionam
 * offline) e claramente intencionais.
 *
 * Para usar fotos reais depois: basta preencher `ProductMedia.url` com a URL do
 * storage (R2/S3) — nenhum componente precisa mudar.
 */

type Shape = 'tote' | 'backpack' | 'suitcase' | 'clutch' | 'crossbody';

const PALETTES: Record<string, [string, string, string]> = {
  cream: ['#faf6f1', '#efe4d7', '#caa18a'],
  terracotta: ['#f3e3d9', '#d99b76', '#a5603f'],
  sand: ['#f1ece6', '#d8cabd', '#a78d7b'],
  graphite: ['#e9dccf', '#9a8d83', '#3a3b3c'],
  travel: ['#e7ecf3', '#9fb2cc', '#0c3264'],
  rose: ['#f6e4ee', '#d690b3', '#a02a63'],
  cinnamon: ['#f0e0d4', '#b98763', '#7e4e37'],
};

const SHAPES: Record<Shape, (c: string) => string> = {
  tote: (c) => `
    <path d="M150 220 h200 l-18 200 h-164 z" fill="${c}" opacity="0.92"/>
    <path d="M195 222 q55 -70 110 0" fill="none" stroke="${c}" stroke-width="10" stroke-linecap="round"/>
    <rect x="150" y="220" width="200" height="22" rx="6" fill="${c}"/>`,
  backpack: (c) => `
    <rect x="178" y="210" width="144" height="210" rx="40" fill="${c}" opacity="0.92"/>
    <rect x="210" y="250" width="80" height="70" rx="16" fill="#ffffff" opacity="0.25"/>
    <path d="M205 215 q-30 60 5 150 M295 215 q30 60 -5 150" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round"/>`,
  suitcase: (c) => `
    <rect x="165" y="225" width="170" height="200" rx="22" fill="${c}" opacity="0.92"/>
    <rect x="195" y="225" width="14" height="200" fill="#ffffff" opacity="0.22"/>
    <rect x="291" y="225" width="14" height="200" fill="#ffffff" opacity="0.22"/>
    <rect x="225" y="190" width="50" height="40" rx="10" fill="none" stroke="${c}" stroke-width="9"/>`,
  clutch: (c) => `
    <rect x="155" y="270" width="190" height="110" rx="22" fill="${c}" opacity="0.92"/>
    <path d="M155 300 q95 -55 190 0" fill="none" stroke="${c}" stroke-width="8"/>
    <circle cx="250" cy="325" r="9" fill="#ffffff" opacity="0.5"/>`,
  crossbody: (c) => `
    <rect x="190" y="250" width="120" height="140" rx="26" fill="${c}" opacity="0.92"/>
    <path d="M196 255 q-60 -10 -30 90" fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round"/>
    <rect x="225" y="248" width="50" height="18" rx="9" fill="${c}"/>`,
};

function svg(shape: Shape, paletteKey: string, variant = 0): string {
  const [bg1, bg2, obj] = PALETTES[paletteKey] ?? PALETTES.cream;
  const rot = variant % 2 === 0 ? -4 : 5;
  const body = `
<svg xmlns="http://www.w3.org/2000/svg" width="500" height="600" viewBox="0 0 500 600">
  <defs>
    <radialGradient id="g" cx="50%" cy="38%" r="75%">
      <stop offset="0%" stop-color="${bg1}"/>
      <stop offset="100%" stop-color="${bg2}"/>
    </radialGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="0.6"/></filter>
  </defs>
  <rect width="500" height="600" fill="url(#g)"/>
  <ellipse cx="250" cy="470" rx="150" ry="26" fill="#5e3d32" opacity="0.10"/>
  <g filter="url(#soft)" transform="rotate(${rot} 250 320)">${SHAPES[shape](obj)}</g>
</svg>`.trim();
  return `data:image/svg+xml,${encodeURIComponent(body)}`;
}

const SHAPE_BY_CATEGORY: Record<string, Shape[]> = {
  bolsas: ['tote', 'clutch', 'crossbody'],
  mochilas: ['backpack'],
  malas: ['suitcase'],
  'kit-viagem': ['suitcase', 'crossbody'],
  promocoes: ['tote', 'backpack', 'crossbody'],
};

/** Imagem principal de um produto, derivada da categoria + paleta. */
export function productImage(category: string, paletteKey: string, idx = 0): string {
  const shapes = SHAPE_BY_CATEGORY[category] ?? ['tote'];
  return svg(shapes[idx % shapes.length], paletteKey, idx);
}

/** Banner/hero editorial em data-URI. */
export function editorialImage(paletteKey: string, shape: Shape = 'tote'): string {
  return svg(shape, paletteKey, 1);
}
