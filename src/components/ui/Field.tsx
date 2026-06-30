import { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

const fieldBase =
  'w-full rounded-[var(--radius-md)] border border-border bg-surface px-4 text-graphite placeholder:text-store-gray/70 transition-colors focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20 disabled:bg-cream-light';

interface WrapProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: (id: string, describedBy?: string) => React.ReactNode;
  className?: string;
}

/** Wrapper de campo: label acima, erro inline associado (acessibilidade). */
export function Field({ label, error, hint, required, children, className }: WrapProps) {
  const id = useId();
  const errId = `${id}-err`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-graphite">
          {label}
          {required && <span className="ml-0.5 text-terracotta">*</span>}
        </label>
      )}
      {children(id, describedBy)}
      {hint && !error && (
        <p id={hintId} className="text-xs text-graphite-soft">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(fieldBase, 'h-11', className)} {...props} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(fieldBase, 'py-3 min-h-[110px] resize-y', className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select ref={ref} className={cn(fieldBase, 'h-11 appearance-none bg-surface pr-10', className)} {...props}>
        {children}
      </select>
    );
  },
);
