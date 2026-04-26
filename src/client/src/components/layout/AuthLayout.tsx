import type { ReactNode } from 'react';

interface AuthLayoutProps {
  title: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
}

export function AuthLayout({ title, description, footer, children }: AuthLayoutProps) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card-shell p-6 sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-fg">{title}</h1>
            {description && <p className="mt-1.5 text-sm text-fg-muted">{description}</p>}
          </div>
          {children}
        </div>
        {footer && <div className="mt-6 text-center text-sm text-fg-muted">{footer}</div>}
      </div>
    </div>
  );
}
