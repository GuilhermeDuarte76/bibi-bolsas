import { create } from 'zustand';
import { CheckCircle, Info, WarningCircle, Warning, X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

type ToastTone = 'success' | 'error' | 'info' | 'warning';
type ToastPayload = string | { title: string; description?: string };

interface Toast {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
  duration: number;
}

interface ToastState {
  toasts: Toast[];
  push: (payload: ToastPayload, tone?: ToastTone) => void;
  dismiss: (id: string) => void;
}

let counter = 0;
const DURATION = 4200;

const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (payload, tone = 'success') => {
    const id = `t${++counter}`;
    const { title, description } =
      typeof payload === 'string' ? { title: payload, description: undefined } : payload;
    set((s) => ({ toasts: [...s.toasts, { id, title, description, tone, duration: DURATION }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), DURATION);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** API imperativa para disparar toasts de qualquer lugar. */
export const toast = {
  success: (p: ToastPayload) => useToastStore.getState().push(p, 'success'),
  error: (p: ToastPayload) => useToastStore.getState().push(p, 'error'),
  info: (p: ToastPayload) => useToastStore.getState().push(p, 'info'),
  warning: (p: ToastPayload) => useToastStore.getState().push(p, 'warning'),
};

const ICONS = { success: CheckCircle, error: WarningCircle, info: Info, warning: Warning };
const TONES: Record<ToastTone, { accent: string; icon: string }> = {
  success: { accent: 'bg-success', icon: 'text-success' },
  error: { accent: 'bg-danger', icon: 'text-danger' },
  info: { accent: 'bg-travel-blue', icon: 'text-travel-blue' },
  warning: { accent: 'bg-warning', icon: 'text-warning' },
};

export function Toaster() {
  const { toasts, dismiss } = useToastStore();
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[120] flex flex-col items-center gap-2.5 px-4 sm:bottom-6"
      role="region"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const Icon = ICONS[t.tone];
        const tone = TONES[t.tone];
        return (
          <div
            key={t.id}
            role="status"
            className="animate-fade-in-up pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3.5 shadow-[var(--shadow-lift)]"
          >
            <span className={cn('absolute inset-y-0 left-0 w-1', tone.accent)} aria-hidden />
            <Icon size={20} weight="fill" className={cn('mt-0.5 shrink-0', tone.icon)} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-graphite">{t.title}</p>
              {t.description && <p className="mt-0.5 text-[0.8rem] leading-snug text-graphite-soft">{t.description}</p>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Fechar aviso"
              className="tactile -mr-1 -mt-0.5 shrink-0 rounded-md p-1 text-graphite-soft hover:bg-cream-light hover:text-graphite"
            >
              <X size={15} />
            </button>
            <span
              className={cn('animate-toast-timer absolute inset-x-0 bottom-0 h-0.5 opacity-40', tone.accent)}
              style={{ animationDuration: `${t.duration}ms` }}
              aria-hidden
            />
          </div>
        );
      })}
    </div>
  );
}
