import { forwardRef } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { CircleNotch } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const base =
  'tactile inline-flex items-center justify-center gap-2 font-medium rounded-[var(--radius-md)] select-none disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap';

const variants: Record<Variant, string> = {
  primary: 'bg-graphite text-cream-light hover:bg-coffee shadow-[var(--shadow-card)]',
  secondary: 'bg-terracotta text-cream-light hover:bg-cinnamon shadow-[var(--shadow-card)]',
  outline: 'border border-graphite/25 text-graphite hover:border-graphite hover:bg-cream-light',
  ghost: 'text-graphite hover:bg-cream-light',
  danger: 'bg-danger text-white hover:brightness-95',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-6 text-sm',
  lg: 'h-13 px-8 text-base min-h-[52px]',
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

type ButtonProps = CommonProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & { as?: 'button' };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, fullWidth, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      {...props}
    >
      {loading && <CircleNotch className="animate-spin" size={18} weight="bold" aria-hidden />}
      {children}
    </button>
  );
});

type ButtonLinkProps = CommonProps & LinkProps & { className?: string };

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      {...props}
    >
      {children}
    </Link>
  );
}
