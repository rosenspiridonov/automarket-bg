import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'subtle';
type Size = 'sm' | 'md';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  size?: Size;
  icon?: ReactNode;
}

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-soft text-fg border border-border',
  primary: 'bg-primary-soft text-primary border border-[color:var(--color-primary-soft)]',
  success: 'bg-success-soft text-success border border-[color:var(--color-success-soft)]',
  warning: 'bg-warning-soft text-warning border border-[color:var(--color-warning-soft)]',
  danger: 'bg-danger-soft text-danger border border-[color:var(--color-danger-soft)]',
  subtle: 'bg-transparent text-fg-muted border border-border',
};

const sizes: Record<Size, string> = {
  sm: 'text-[11px] px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
};

export function Badge({ tone = 'neutral', size = 'sm', icon, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap',
        tones[tone],
        sizes[size],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
}
