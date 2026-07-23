import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Warning, TrashSimple } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const SIZES = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' } as const;

/**
 * Modal acessível do admin: overlay com blur, fecha no Esc / clique fora,
 * trava o scroll do body e anima a entrada.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
  closeOnOverlay = true,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  size?: keyof typeof SIZES;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  closeOnOverlay?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <button
        aria-label="Fechar"
        onClick={closeOnOverlay ? onClose : undefined}
        className="animate-overlay-in absolute inset-0 bg-graphite/45 backdrop-blur-[2px]"
      />
      <div
        className={cn(
          'animate-modal-in relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[var(--radius-xl)] border border-border bg-surface shadow-[var(--shadow-lift)] sm:rounded-[var(--radius-lg)]',
          SIZES[size],
        )}
      >
        {(title || description) && (
          <header className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4 sm:px-6">
            <div className="min-w-0">
              {title && <h2 className="font-display text-lg leading-tight text-graphite">{title}</h2>}
              {description && <p className="mt-1 text-sm text-graphite-soft">{description}</p>}
            </div>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="tactile -mr-1 -mt-1 shrink-0 rounded-md p-1.5 text-graphite-soft hover:bg-cream-light hover:text-graphite"
            >
              <X size={18} />
            </button>
          </header>
        )}
        {children && <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>}
        {footer && (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border/70 bg-cream-lighter/60 px-5 py-3.5 sm:px-6">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Diálogo de confirmação padronizado — ideal para ações destrutivas.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirmar ação',
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'danger',
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
  loading?: boolean;
}) {
  const Icon = tone === 'danger' ? TrashSimple : Warning;
  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onClose}
      size="sm"
      closeOnOverlay={!loading}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            size="sm"
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-4">
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
            tone === 'danger' ? 'bg-danger-soft text-danger' : 'bg-warning-soft text-warning',
          )}
        >
          <Icon size={22} weight="bold" aria-hidden />
        </span>
        <div className="min-w-0 pt-0.5">
          <h2 className="font-display text-lg leading-tight text-graphite">{title}</h2>
          {description && <p className="mt-1.5 text-sm text-graphite-soft">{description}</p>}
        </div>
      </div>
    </Modal>
  );
}
