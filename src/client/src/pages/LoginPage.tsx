import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button, Field, Input } from '../components/ui';

const loginSchema = z.object({
  email: z.string().email('Невалиден имейл адрес'),
  password: z.string().min(1, 'Паролата е задължителна'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    try {
      setError(null);
      const response = await authApi.login(data);
      setAuth(response);
      navigate('/');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Неуспешен вход. Опитай отново.';
      setError(message);
    }
  };

  return (
    <AuthLayout
      title="Добре дошъл обратно"
      description="Влез в профила си, за да публикуваш и запазваш обяви."
      footer={
        <>
          Нямаш профил?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Регистрация
          </Link>
        </>
      }
    >
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Имейл" error={errors.email?.message} required>
          <Input
            type="email"
            placeholder="ti@primer.bg"
            autoComplete="email"
            invalid={!!errors.email}
            {...register('email')}
          />
        </Field>

        <Field label="Парола" error={errors.password?.message} required>
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="Въведи паролата си"
            autoComplete="current-password"
            invalid={!!errors.password}
            trailingIcon={
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="text-fg-subtle hover:text-fg"
                aria-label={showPassword ? 'Скрий паролата' : 'Покажи паролата'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            {...register('password')}
          />
        </Field>

        <Button type="submit" variant="primary" size="lg" fullWidth loading={isSubmitting}>
          {isSubmitting ? 'Влизане...' : 'Вход'}
        </Button>
      </form>
    </AuthLayout>
  );
}
