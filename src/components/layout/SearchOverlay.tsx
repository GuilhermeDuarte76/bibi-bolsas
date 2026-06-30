import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { useUI } from '@/store/ui';
import { catalogService, queryKeys } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { Stars } from '@/components/ui/Stars';

const POPULAR = ['Tote', 'Mala de bordo', 'Mochila notebook', 'Crossbody', 'Kit viagem'];

export function SearchOverlay() {
  const { searchOpen, closeSearch } = useUI();
  const [term, setTerm] = useState('');
  const navigate = useNavigate();

  const { data, isFetching } = useQuery({
    queryKey: queryKeys.searchSuggest(term),
    queryFn: () => catalogService.searchSuggest(term),
    enabled: searchOpen && term.trim().length >= 2,
  });

  useEffect(() => {
    if (!searchOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeSearch();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [searchOpen, closeSearch]);

  useEffect(() => {
    if (!searchOpen) setTerm('');
  }, [searchOpen]);

  if (!searchOpen) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!term.trim()) return;
    closeSearch();
    navigate(`/catalogo?q=${encodeURIComponent(term.trim())}`);
  };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Buscar">
      <button aria-label="Fechar busca" className="absolute inset-0 bg-graphite/40 backdrop-blur-sm" onClick={closeSearch} />
      <div className="absolute inset-x-0 top-0 bg-cream-lighter shadow-[var(--shadow-lift)]">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          <form onSubmit={submit} className="flex items-center gap-3">
            <MagnifyingGlass size={22} className="text-cinnamon" />
            {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
            <input
              autoFocus
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="O que você procura hoje?"
              aria-label="Buscar produtos"
              className="h-11 flex-1 bg-transparent text-lg text-graphite placeholder:text-store-gray focus:outline-none"
            />
            <button
              type="button"
              onClick={closeSearch}
              aria-label="Fechar"
              className="tactile rounded-md p-1.5 text-graphite hover:bg-cream-light"
            >
              <X size={22} />
            </button>
          </form>

          <div className="mt-5 min-h-[60px]">
            {term.trim().length < 2 ? (
              <div>
                <p className="eyebrow mb-3">Buscas populares</p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR.map((p) => (
                    <button
                      key={p}
                      onClick={() => setTerm(p)}
                      className="tactile rounded-full border border-border bg-surface px-4 py-1.5 text-sm text-graphite hover:border-terracotta hover:text-terracotta"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : isFetching ? (
              <p className="py-6 text-center text-sm text-graphite-soft">Buscando…</p>
            ) : data && data.length > 0 ? (
              <ul className="divide-y divide-border">
                {data.map((p) => (
                  <li key={p.id}>
                    <Link
                      to={`/produto/${p.slug}`}
                      onClick={closeSearch}
                      className="flex items-center gap-4 py-3 hover:bg-cream-light/60"
                    >
                      <img src={p.image} alt={p.alt} className="h-14 w-12 rounded-md object-cover" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-graphite">{p.name}</p>
                        <Stars rating={p.rating} size={12} />
                      </div>
                      <span className="text-sm font-semibold text-graphite">{formatPrice(p.priceFromCents)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-graphite-soft">
                Nenhum produto encontrado para “{term}”.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
