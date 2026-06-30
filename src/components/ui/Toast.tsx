import { create } from 'zustand';
import { CheckCircle, Info, WarningCircle, X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

type ToastTone = 'success' | 'error' | 'info';
interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, tone?: ToastTone) => void;
  dismiss: (id: string) => void;
}

let counter = 0;

const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, tone = 'success') => {
    const id = `t${++counter}`;
    set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3800);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** API imperativa para disparar toasts de qualquer lugar. */
export const toast = {
  success: (m: string) => useToastStore.getState().push(m, 'success'),
  error: (m: string) => useToastStore.getState().push(m, 'error'),
  info: (m: string) => useToastStore.getState().push(m, 'info'),
};

const ICONS = { success: CheckCircle, error: WarningCircle, info: Info };
const TONES = {
  success: 'border-success/30 text-success',
  error: 'border-danger/30 text-danger',
  info: 'border-travel-blue/30 text-travel-blue',
};

export function Toaster() {
  const { toasts, dismiss } = useToastStore();
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6"
      role="region"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const Icon = ICONS[t.tone];
        return (
          <div
            key={t.id}
            className={cn(
              'animate-fade-in-up pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-[var(--radius-md)] border bg-surface px-4 py-3 shadow-[var(--shadow-lift)]',
              TONES[t.tone],
            )}
          >
            <Icon size={20} weight="fill" className="shrink-0" aria-hidden />
            <p className="flex-1 text-sm text-graphite">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Fechar aviso"
              className="tactile -mr-1 rounded-md p-1 text-graphite-soft hover:bg-cream-light"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
