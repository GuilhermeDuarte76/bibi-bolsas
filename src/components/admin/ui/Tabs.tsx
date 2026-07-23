import type { Icon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export interface TabItem {
  value: string;
  label: React.ReactNode;
  count?: number;
  icon?: Icon;
}

/**
 * Abas com sublinhado editorial. Controladas pelo pai.
 */
export function Tabs({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex gap-1 overflow-x-auto border-b border-border no-scrollbar', className)} role="tablist">
      {items.map((t) => {
        const active = t.value === value;
        const Icon = t.icon;
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn(
              'tactile relative flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'border-terracotta text-graphite'
                : 'border-transparent text-graphite-soft hover:text-graphite',
            )}
          >
            {Icon && <Icon size={16} weight={active ? 'fill' : 'regular'} />}
            {t.label}
            {t.count != null && (
              <span
                className={cn(
                  'ml-0.5 rounded-full px-1.5 py-0.5 text-[0.66rem] font-semibold',
                  active ? 'bg-terracotta/12 text-terracotta' : 'bg-cream text-graphite-soft',
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
