import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Save, Upload, X } from 'lucide-react';
import { listingsApi } from '../api/listings';
import { featuresApi } from '../api/features';
import { Button, Container, Field, Input, PageHeader, Select, Skeleton, Textarea } from '../components/ui';
import { cn } from '../utils/cn';

interface EditForm {
  title: string;
  description?: string;
  price: number;
  mileage: number;
  city?: string;
  region?: string;
  status?: string;
  featureIds: number[];
}

const editSchema = z.object({
  title: z.string().min(5, 'Заглавието трябва да е поне 5 символа'),
  description: z.string().optional(),
  price: z.preprocess(Number, z.number().min(1, 'Цената е задължителна')),
  mileage: z.preprocess(Number, z.number().min(0)),
  city: z.string().optional(),
  region: z.string().optional(),
  status: z.string().optional(),
  featureIds: z.array(z.number()).default([]),
});

const STATUS_LABELS: Record<string, string> = {
  Active: 'Активна',
  Sold: 'Продадена',
  Draft: 'Чернова',
};

export function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [newFiles, setNewFiles] = useState<File[]>([]);

  const { data: listing, isLoading: loadingListing } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => listingsApi.getById(Number(id)),
    enabled: !!id,
  });

  const { data: features = [] } = useQuery({ queryKey: ['features'], queryFn: featuresApi.getAll });

  const {
    register, handleSubmit, watch, setValue, reset,
    formState: { errors, isSubmitting },
  } = useForm<EditForm>({
    resolver: zodResolver(editSchema) as never,
    defaultValues: { featureIds: [] },
  });

  const selectedFeatures = watch('featureIds');

  useEffect(() => {
    if (listing) {
      reset({
        title: listing.title,
        description: listing.description ?? '',
        price: listing.price,
        mileage: listing.mileage,
        city: listing.city ?? '',
        region: listing.region ?? '',
        status: listing.status,
        featureIds: listing.features?.map((f) => f.id) ?? [],
      });
    }
  }, [listing, reset]);

  const onDrop = useCallback((accepted: File[]) => {
    setNewFiles((prev) => [...prev, ...accepted].slice(0, 20));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxSize: 10 * 1024 * 1024,
  });

  const toggleFeature = (featureId: number) => {
    const current = selectedFeatures || [];
    setValue(
      'featureIds',
      current.includes(featureId) ? current.filter((f) => f !== featureId) : [...current, featureId],
    );
  };

  const handleDeleteImage = async (imageId: number) => {
    try {
      await listingsApi.deleteImage(Number(id), imageId);
      toast.success('Снимката е премахната');
    } catch {
      toast.error('Неуспешно премахване на снимката');
    }
  };

  const onSubmit = async (data: EditForm) => {
    try {
      await listingsApi.update(Number(id), data);
      if (newFiles.length > 0) await listingsApi.uploadImages(Number(id), newFiles);
      toast.success('Обявата е обновена успешно!');
      navigate(`/listings/${id}`);
    } catch {
      toast.error('Неуспешно обновяване на обявата.');
    }
  };

  const featuresByCategory = features.reduce(
    (acc, f) => {
      if (!acc[f.category]) acc[f.category] = [];
      acc[f.category].push(f);
      return acc;
    },
    {} as Record<string, typeof features>,
  );

  if (loadingListing) {
    return (
      <Container size="md" className="py-8">
        <Skeleton className="mb-6 h-8 w-1/3" />
        <Skeleton className="mb-4 h-64 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </Container>
    );
  }

  if (!listing) {
    return (
      <Container size="md" className="py-16 text-center">
        <h2 className="text-xl font-semibold text-fg">Обявата не е намерена</h2>
      </Container>
    );
  }

  return (
    <Container size="md" className="py-8">
      <PageHeader title="Редактирай обявата" description="Можеш да обновиш цената, описанието, екстрите и статуса." />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title="Основни данни">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field className="md:col-span-2" label="Заглавие" error={errors.title?.message}>
              <Input invalid={!!errors.title} {...register('title')} />
            </Field>

            <Field label="Марка">
              <Input value={listing.makeName} disabled />
            </Field>

            <Field label="Модел">
              <Input value={listing.modelName} disabled />
            </Field>

            <Field label="Цена (€)" error={errors.price?.message}>
              <Input type="number" invalid={!!errors.price} {...register('price')} />
            </Field>

            <Field label="Пробег (км)">
              <Input type="number" {...register('mileage')} />
            </Field>

            <Field label="Град">
              <Input {...register('city')} />
            </Field>

            <Field label="Статус">
              <Select {...register('status')}>
                <option value="Active">{STATUS_LABELS.Active}</option>
                <option value="Sold">{STATUS_LABELS.Sold}</option>
                <option value="Draft">{STATUS_LABELS.Draft}</option>
              </Select>
            </Field>

            <Field className="md:col-span-2" label="Описание">
              <Textarea rows={5} {...register('description')} />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Снимки" description="Премахни съществуващи или добави нови.">
          {listing.images && listing.images.length > 0 ? (
            <div className="mb-5 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {listing.images.map((img) => (
                <div key={img.id} className="group relative">
                  <img
                    src={img.url}
                    alt=""
                    className="aspect-square w-full rounded-lg border border-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(img.id)}
                    className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-fg/90 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Изтрий снимката"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mb-4 text-sm text-fg-subtle">Все още няма снимки.</p>
          )}

          <div
            {...getRootProps()}
            className={cn(
              'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center cursor-pointer transition-colors',
              isDragActive ? 'border-primary bg-primary-soft' : 'border-border hover:border-fg-subtle',
            )}
          >
            <input {...getInputProps()} />
            <Upload className="h-5 w-5 text-fg-muted" />
            <p className="text-sm text-fg">
              {isDragActive ? 'Пусни снимките тук...' : 'Плъзни и пусни или щракни за избор'}
            </p>
          </div>

          {newFiles.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {newFiles.map((file, i) => (
                <div key={i} className="group relative">
                  <img
                    src={URL.createObjectURL(file)}
                    alt=""
                    className="aspect-square w-full rounded-lg border border-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setNewFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-fg/90 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Премахни снимката"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </FormSection>

        {Object.keys(featuresByCategory).length > 0 && (
          <FormSection title="Екстри">
            <div className="space-y-5">
              {Object.entries(featuresByCategory).map(([category, items]) => (
                <div key={category}>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">{category}</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {items.map((f) => {
                      const checked = (selectedFeatures || []).includes(f.id);
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => toggleFeature(f.id)}
                          className={cn(
                            'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                            checked
                              ? 'bg-primary text-primary-fg border-primary'
                              : 'bg-surface text-fg border-border hover:border-fg-subtle',
                          )}
                        >
                          {f.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </FormSection>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={() => navigate(`/listings/${id}`)}>
            Отказ
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={isSubmitting}
            leadingIcon={<Save className="h-4 w-4" />}
          >
            {isSubmitting ? 'Запазване...' : 'Запази промените'}
          </Button>
        </div>
      </form>
    </Container>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card-shell p-6">
      <header className="mb-5">
        <h2 className="text-base font-semibold text-fg">{title}</h2>
        {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
      </header>
      {children}
    </section>
  );
}
