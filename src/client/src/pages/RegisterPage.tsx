import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button, Field, Input } from '../components/ui';

const registerSchema = z
  .object({
    email: z.string().email('Невалиден имейл адрес'),
    userName: z.string().min(3, 'Потребителското име трябва да е поне 3 символа'),
    password: z.string().min(6, 'Паролата трябва да е поне 6 символа'),
    confirmPassword: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phoneNumber: z.string().optional(),
    city: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Паролите не съвпадат',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterForm) => {
    try {
      setError(null);
      const { confirmPassword: _, ...requestData } = data;
      const response = await authApi.register(requestData);
      setAuth(response);
      navigate('/');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Неуспешна регистрация. Опитай отново.';
      setError(message);
    }
  };

  return (
    <AuthLayout
      title="Създай профил"
      description="Регистрирай се, за да публикуваш обяви и да запазваш любими."
      footer={
        <>
          Вече имаш профил?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Вход
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
        <div className="grid grid-cols-2 gap-3">
          <Field label="Име">
            <Input autoComplete="given-name" {...register('firstName')} />
          </Field>
          <Field label="Фамилия">
            <Input autoComplete="family-name" {...register('lastName')} />
          </Field>
        </div>

        <Field label="Имейл" required error={errors.email?.message}>
          <Input type="email" autoComplete="email" invalid={!!errors.email} {...register('email')} />
        </Field>

        <Field label="Потребителско име" required error={errors.userName?.message}>
          <Input autoComplete="username" invalid={!!errors.userName} {...register('userName')} />
        </Field>

        <Field label="Парола" required error={errors.password?.message}>
          <Input
            type="password"
            autoComplete="new-password"
            invalid={!!errors.password}
            {...register('password')}
          />
        </Field>

        <Field label="Потвърди парола" required error={errors.confirmPassword?.message}>
          <Input
            type="password"
            autoComplete="new-password"
            invalid={!!errors.confirmPassword}
            {...register('confirmPassword')}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Телефон">
            <Input type="tel" autoComplete="tel" {...register('phoneNumber')} />
          </Field>
          <Field label="Град">
            <Input autoComplete="address-level2" {...register('city')} />
          </Field>
        </div>

        <Button type="submit" variant="primary" size="lg" fullWidth loading={isSubmitting}>
          {isSubmitting ? 'Създаване на профил...' : 'Създай профил'}
        </Button>
      </form>
    </AuthLayout>
  );
}
