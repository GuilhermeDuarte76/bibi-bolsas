import { CaretDown, CaretUp } from '@phosphor-icons/react';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from './States';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
  className?: string;
  headerClassName?: string;
  sortable?: boolean;
}

export interface SortState {
  key: string;
  dir: 'asc' | 'desc';
}

const alignClass = { left: 'text-left', center: 'text-center', right: 'text-right' } as const;

/**
 * Tabela de dados do admin (novo padrão): cabeçalho fixo, ordenação opcional,
 * skeleton de carregamento, estado vazio integrado e ações por linha no hover.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  skeletonRows = 6,
  empty,
  onRowClick,
  sort,
  onSort,
  minWidth = 720,
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  skeletonRows?: number;
  empty?: { title: string; description?: string; icon?: React.ComponentProps<typeof EmptyState>['icon']; action?: React.ReactNode };
  onRowClick?: (row: T) => void;
  sort?: SortState;
  onSort?: (key: string) => void;
  minWidth?: number;
  className?: string;
}) {
  const showEmpty = !loading && rows.length === 0;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)]',
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm" style={{ minWidth }}>
          <thead>
            <tr className="border-b border-border bg-cream-lighter">
              {columns.map((c) => {
                const active = sort?.key === c.key;
                const sortable = c.sortable && onSort;
                return (
                  <th
                    key={c.key}
                    style={c.width ? { width: c.width } : undefined}
                    className={cn(
                      'whitespace-nowrap px-4 py-3 text-[0.7rem] font-semibold uppercase tracking-wider text-graphite-soft',
                      alignClass[c.align ?? 'left'],
                      c.headerClassName,
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => onSort(c.key)}
                        className={cn(
                          'tactile inline-flex items-center gap-1 rounded transition-colors hover:text-graphite',
                          c.align === 'right' && 'flex-row-reverse',
                          active && 'text-terracotta',
                        )}
                      >
                        {c.header}
                        <span className="flex flex-col -space-y-1">
                          <CaretUp size={9} weight="fill" className={cn(active && sort?.dir === 'asc' ? 'text-terracotta' : 'text-store-gray/50')} />
                          <CaretDown size={9} weight="fill" className={cn(active && sort?.dir === 'desc' ? 'text-terracotta' : 'text-store-gray/50')} />
                        </span>
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: skeletonRows }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60 last:border-0">
                    {columns.map((c) => (
                      <td key={c.key} className={cn('px-4 py-3.5', alignClass[c.align ?? 'left'])}>
                        <Skeleton className={cn('h-4', c.align === 'right' ? 'ml-auto w-16' : 'w-24')} />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((row) => (
                  <tr
                    key={rowKey(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      'group border-b border-border/60 transition-colors last:border-0',
                      onRowClick && 'cursor-pointer hover:bg-cream-lighter',
                    )}
                  >
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={cn('px-4 py-3.5 text-graphite', alignClass[c.align ?? 'left'], c.className)}
                      >
                        {c.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      {showEmpty && (
        <EmptyState
          title={empty?.title ?? 'Nenhum registro encontrado'}
          description={empty?.description}
          icon={empty?.icon}
          action={empty?.action}
          className="py-14"
        />
      )}
    </div>
  );
}
