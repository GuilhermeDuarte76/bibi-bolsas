import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { useUI } from '@/store/ui';
import { useOverlay } from '@/hooks/useOverlay';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { catalogService, queryKeys } from '@/lib/api';
import { useViewItemList } from '@/hooks/useViewItemList';
import { analytics } from '@/lib/analytics';
import { formatPrice } from '@/lib/utils';

const POPULAR = ['Tote', 'Mala de bordo', 'Mochila notebook', 'Crossbody', 'Kit viagem'];

export function SearchOverlay() {
  const searchOpen = useUI((s) => s.searchOpen);
  if (!searchOpen) return null;
  return <SearchOverlayPanel />;
}

/**
 * Busca em camada sobreposta.
 *
 * No celular ocupa a tela inteira em dvh, com a lista rolando por dentro: com
 * `inset-0` e altura de layout, o teclado virtual empurrava os resultados para
 * fora da area visivel e nada mais respondia ao toque.
 */
function SearchOverlayPanel() {
  const closeSearch = useUI((s) => s.closeSearch);
  const [term, setTerm] = useState('');
  const navigate = useNavigate();
  const closeRef = useOverlay<HTMLButtonElement>(true, closeSearch);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const query = term.trim();
  const { data, isFetching } = useQuery({
    queryKey: queryKeys.searchSuggest(query),
    queryFn: () => catalogService.searchSuggest(query),
    enabled: query.length >= 2,
  });

  useViewItemList('Busca rápida', data, query);

  useEffect(() => () => setTerm(''), []);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!query) return;
    closeSearch();
    navigate(`/catalogo?q=${encodeURIComponent(query)}`);
  };

  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Buscar">
      <button
        type="button"
        aria-label="Fechar busca"
        tabIndex={-1}
        className="absolute inset-0 animate-overlay-in bg-graphite/45 backdrop-blur-sm"
        onClick={closeSearch}
      />

      <div className="absolute inset-x-0 top-0 flex max-h-[100dvh] flex-col bg-cream-lighter shadow-[var(--shadow-lift)] md:max-h-[85dvh]">
        <div className="mx-auto flex w-full max-w-3xl shrink-0 items-center gap-2 px-4 py-3 sm:px-6 sm:py-4">
          <form onSubmit={submit} className="flex flex-1 items-center gap-2">
            <MagnifyingGlass size={22} className="shrink-0 text-cinnamon" aria-hidden />
            <input
              // Autofoco so no desktop: no celular o teclado subindo junto com a
              // camada faz a tela saltar antes de terminar de abrir.
              autoFocus={isDesktop}
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="O que você procura hoje?"
              aria-label="Buscar produtos"
              enterKeyHint="search"
              className="h-11 min-w-0 flex-1 bg-transparent text-base text-graphite placeholder:text-store-gray focus:outline-none sm:text-lg"
            />
          </form>
          <button
            ref={closeRef}
            type="button"
            onClick={closeSearch}
            aria-label="Fechar busca"
            className="tactile -mr-1.5 grid h-11 w-11 shrink-0 place-items-center rounded-full text-graphite hover:bg-cream-light"
          >
            <X size={22} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-border/70">
          <div className="mx-auto w-full max-w-3xl px-4 py-5 pb-safe sm:px-6">
            {query.length < 2 ? (
              <div>
                <p className="eyebrow mb-3">Buscas populares</p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setTerm(suggestion)}
                      className="tactile flex min-h-touch items-center rounded-full border border-border bg-surface px-4 text-sm text-graphite hover:border-terracotta hover:text-terracotta"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : isFetching ? (
              <p className="py-6 text-center text-sm text-graphite-soft">Buscando…</p>
            ) : data && data.length > 0 ? (
              <ul className="divide-y divide-border">
                {data.map((product, index) => (
                  <li key={product.id}>
                    <Link
                      to={`/produto/${product.slug}`}
                      onClick={() => {
                        analytics.search(query);
                        analytics.selectItem('Busca rápida', product, index);
                        closeSearch();
                      }}
                      className="flex items-center gap-4 py-3 hover:bg-cream-light/60"
                    >
                      <img
                        src={product.image}
                        alt=""
                        loading="lazy"
                        className="h-14 w-12 shrink-0 rounded-md object-cover"
                      />
                      <p className="min-w-0 flex-1 text-sm font-medium text-graphite">
                        {product.name}
                      </p>
                      <span className="shrink-0 text-sm font-semibold text-graphite">
                        {formatPrice(product.priceFromCents)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-graphite-soft">
                Nenhum produto encontrado para “{query}”.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
