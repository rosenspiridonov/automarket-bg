import type { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

type Size = 'sm' | 'md' | 'lg' | 'xl';

interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: Size;
}

const sizes: Record<Size, string> = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
};

export function Container({ size = 'xl', className, ...props }: ContainerProps) {
  return (
    <div className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8', sizes[size], className)} {...props} />
  );
}
