import { useEffect, useState } from 'react';

/**
 * Observa uma media query e reage a mudanca de tamanho da janela.
 *
 * Use apenas quando a diferenca entre mobile e desktop for estrutural — trocar
 * uma lista por um acordeao, por exemplo. Para diferenca visual, CSS resolve
 * melhor (sem re-render e sem "piscar" na primeira pintura).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const onChange = () => setMatches(mediaQuery.matches);

    onChange();
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
