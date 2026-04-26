import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

type Variant = 'subtle' | 'solid' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon: ReactNode;
  'aria-label': string;
}

const base =
  'inline-flex items-center justify-center rounded-full transition-colors focus-visible:focus-ring disabled:opacity-50 disabled:cursor-not-allowed';

const variants: Record<Variant, string> = {
  subtle: 'bg-white/85 backdrop-blur text-fg hover:bg-white border border-border',
  solid: 'bg-fg text-white hover:opacity-90',
  ghost: 'text-fg-muted hover:text-fg hover:bg-surface-soft',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
  lg: 'h-11 w-11',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = 'ghost', size = 'md', icon, className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {icon}
    </button>
  );
});
