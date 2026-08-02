import { useEffect } from 'react';

const SITE_NAME = 'Bibi Bolsas';
const DEFAULT_TITLE = 'Bibi Bolsas — Uma bolsa para cada momento';
const DEFAULT_DESCRIPTION =
  'Boutique digital de bolsas, mochilas e malas. Uma bolsa ideal para cada momento.';

export interface PageMeta {
  /** Titulo da pagina, sem o sufixo da marca (adicionado automaticamente). */
  title?: string;
  description?: string;
  /** URL absoluta da imagem de compartilhamento (Open Graph). */
  image?: string;
  /** 'product' em paginas de produto, 'website' no resto. */
  type?: 'website' | 'product' | 'article';
  /** Impede indexacao — use em conta, checkout e paginas de resultado. */
  noIndex?: boolean;
}

/** Cria ou atualiza uma tag <meta> no head, marcando-a como gerenciada por nos. */
function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    tag.setAttribute('data-page-meta', 'true');
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function setLink(rel: string, href: string) {
  let tag = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', rel);
    tag.setAttribute('data-page-meta', 'true');
    document.head.appendChild(tag);
  }
  tag.setAttribute('href', href);
}

/**
 * Define titulo e metatags da rota atual.
 *
 * SPA nao tem head por pagina, entao cada tela declara o seu. Isso alimenta
 * aba do navegador, historico, leitores de tela e previews de compartilhamento.
 * Passe `undefined` enquanto os dados carregam — o titulo so muda quando o
 * valor real chega, evitando piscar "undefined" na aba.
 */
export function usePageMeta({ title, description, image, type = 'website', noIndex }: PageMeta) {
  useEffect(() => {
    const fullTitle = title ? `${title} · ${SITE_NAME}` : DEFAULT_TITLE;
    const desc = description?.trim() || DEFAULT_DESCRIPTION;
    const url = window.location.href;

    document.title = fullTitle;

    setMeta('meta[name="description"]', 'name', 'description', desc);
    setMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    setMeta('meta[property="og:description"]', 'property', 'og:description', desc);
    setMeta('meta[property="og:type"]', 'property', 'og:type', type);
    setMeta('meta[property="og:site_name"]', 'property', 'og:site_name', SITE_NAME);
    setMeta('meta[property="og:url"]', 'property', 'og:url', url);
    setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');

    if (image) {
      setMeta('meta[property="og:image"]', 'property', 'og:image', image);
    } else {
      document.head.querySelector('meta[property="og:image"]')?.remove();
    }

    setMeta(
      'meta[name="robots"]',
      'name',
      'robots',
      noIndex ? 'noindex, nofollow' : 'index, follow',
    );
    setLink('canonical', `${window.location.origin}${window.location.pathname}`);
  }, [title, description, image, type, noIndex]);
}
