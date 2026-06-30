import { useState } from 'react';
import { CaretDown } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export function Accordion({
  items,
  defaultOpen,
}: {
  items: { title: string; content: React.ReactNode }[];
  defaultOpen?: number;
}) {
  const [open, setOpen] = useState<number | null>(defaultOpen ?? null);
  return (
    <div className="divide-y divide-border border-y border-border">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.title}>
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between py-4 text-left text-sm font-medium text-graphite"
            >
              {item.title}
              <CaretDown
                size={18}
                className={cn('text-cinnamon transition-transform', isOpen && 'rotate-180')}
              />
            </button>
            {isOpen && <div className="pb-5 text-sm leading-relaxed text-graphite-soft">{item.content}</div>}
          </div>
        );
      })}
    </div>
  );
}
