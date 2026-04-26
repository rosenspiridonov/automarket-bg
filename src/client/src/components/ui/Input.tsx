import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

const fieldBase =
  'w-full bg-surface text-fg placeholder:text-fg-subtle border rounded-lg transition-colors outline-none focus:focus-ring';

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, leadingIcon, trailingIcon, ...props },
  ref,
) {
  if (leadingIcon || trailingIcon) {
    return (
      <div className="relative">
        {leadingIcon && (
          <span className="absolute inset-y-0 left-3 flex items-center text-fg-subtle pointer-events-none">
            {leadingIcon}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            fieldBase,
            'h-10 text-sm',
            leadingIcon ? 'pl-9' : 'pl-3',
            trailingIcon ? 'pr-9' : 'pr-3',
            invalid ? 'border-danger' : 'border-border',
            className,
          )}
          {...props}
        />
        {trailingIcon && (
          <span className="absolute inset-y-0 right-3 flex items-center text-fg-subtle">
            {trailingIcon}
          </span>
        )}
      </div>
    );
  }

  return (
    <input
      ref={ref}
      className={cn(
        fieldBase,
        'h-10 px-3 text-sm',
        invalid ? 'border-danger' : 'border-border',
        className,
      )}
      {...props}
    />
  );
});

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        fieldBase,
        'h-10 px-3 text-sm pr-9 appearance-none bg-no-repeat',
        invalid ? 'border-danger' : 'border-border',
        className,
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
        backgroundPosition: 'right 0.75rem center',
        backgroundSize: '1rem',
      }}
      {...props}
    >
      {children}
    </select>
  );
});

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        fieldBase,
        'px-3 py-2 text-sm resize-y min-h-[5rem]',
        invalid ? 'border-danger' : 'border-border',
        className,
      )}
      {...props}
    />
  );
});
