import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

/**
 * Logotipo Bibi Bolsas. Placeholder tipografico ate o SVG oficial ser vetorizado
 * (FRONTEND-PLANEJAMENTO.md secao 16). O simbolo de infinito remete ao logo.
 */
export function Logo({
  className,
  tone = 'graphite',
}: {
  className?: string;
  tone?: 'graphite' | 'cream';
}) {
  const color = tone === 'cream' ? 'text-cream-light' : 'text-graphite';
  return (
    <Link to="/" aria-label="Bibi Bolsas — página inicial" className={cn('flex items-center gap-2', className)}>
      <svg width="30" height="30" viewBox="0 0 64 64" aria-hidden className="shrink-0">
        <path
          d="M14 32c0-7 4.6-12 11-12 5 0 7.6 3.4 7 7.4M50 32c0 7-4.6 12-11 12-5 0-7.6-3.4-7-7.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          className="text-terracotta"
        />
        <circle cx="32" cy="32" r="5.5" fill="none" stroke="currentColor" strokeWidth="4" className="text-terracotta" />
      </svg>
      <span className={cn('font-display text-2xl tracking-tight', color)}>
        Bibi<span className="text-terracotta">.</span>
      </span>
    </Link>
  );
}
