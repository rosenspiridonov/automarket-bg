import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('card-shell px-6 py-12 text-center', className)}>
      {icon && (
        <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface-soft text-fg-muted">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-fg">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-fg-muted max-w-sm mx-auto">{description}</p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
