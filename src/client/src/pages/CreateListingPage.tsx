import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ImagePlus, Upload, X } from 'lucide-react';
import { listingsApi } from '../api/listings';
import { makesApi } from '../api/makes';
import { featuresApi } from '../api/features';
import type { ModelDto } from '../api/makes';
import {
  FUEL_TYPES, TRANSMISSION_TYPES, BODY_TYPES,
  DRIVE_TYPES, CONDITIONS, COLORS,
  FUEL_TYPE_LABELS, TRANSMISSION_LABELS, BODY_TYPE_LABELS,
  DRIVE_TYPE_LABELS, CONDITION_LABELS, COLOR_LABELS,
} from '../utils/constants';
import { Button, Container, Field, Input, PageHeader, Select, Textarea } from '../components/ui';
import { cn } from '../utils/cn';

interface ListingForm {
  title: string;
  description?: string;
  makeId: number;
  modelId: number;
  year: number;
  price: number;
  mileage: number;
  fuelType: string;
  transmissionType: string;
  bodyType: string;
  driveType: string;
  engineDisplacementCc?: number;
  horsePower?: number;
  color: string;
  condition: string;
  city?: string;
  region?: string;
  vinNumber?: string;
  featureIds: number[];
}

const listingSchema = z.object({
  title: z.string().min(5, 'Заглавието трябва да е поне 5 символа'),
  description: z.string().optional(),
  makeId: z.preprocess(Number, z.number().min(1, 'Избери марка')),
  modelId: z.preprocess(Number, z.number().min(1, 'Избери модел')),
  year: z.preprocess(Number, z.number().min(1900).max(new Date().getFullYear() + 1)),
  price: z.preprocess(Number, z.number().min(1, 'Цената е задължителна')),
  mileage: z.preprocess(Number, z.number().min(0)),
  fuelType: z.string().min(1, 'Избери тип гориво'),
  transmissionType: z.string().min(1, 'Избери скоростна кутия'),
  bodyType: z.string().min(1, 'Избери тип каросерия'),
  driveType: z.string().min(1, 'Избери тип задвижване'),
  engineDisplacementCc: z.preprocess((v) => (v === '' || v === undefined ? undefined : Number(v)), z.number().optional()),
  horsePower: z.preprocess((v) => (v === '' || v === undefined ? undefined : Number(v)), z.number().optional()),
  color: z.string().min(1, 'Избери цвят'),
  condition: z.string().min(1, 'Избери състояние'),
  city: z.string().optional(),
  region: z.string().optional(),
  vinNumber: z.string().optional(),
  featureIds: z.array(z.number()).default([]),
});

export function CreateListingPage() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [models, setModels] = useState<ModelDto[]>([]);

  const { data: makes = [] } = useQuery({ queryKey: ['makes'], queryFn: makesApi.getAll });
  const { data: features = [] } = useQuery({ queryKey: ['features'], queryFn: featuresApi.getAll });

  const {
    register, handleSubmit, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<ListingForm>({
    resolver: zodResolver(listingSchema) as never,
    defaultValues: { featureIds: [] },
  });

  const selectedMakeId = watch('makeId');
  const selectedFeatures = watch('featureIds');

  useEffect(() => {
    if (selectedMakeId && selectedMakeId > 0) {
      makesApi.getModels(selectedMakeId).then(setModels);
      setValue('modelId', 0);
    } else {
      setModels([]);
    }
  }, [selectedMakeId, setValue]);

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => [...prev, ...accepted].slice(0, 20));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxSize: 10 * 1024 * 1024,
  });

  const toggleFeature = (id: number) => {
    const current = selectedFeatures || [];
    setValue('featureIds', current.includes(id) ? current.filter((f) => f !== id) : [...current, id]);
  };

  const onSubmit = async (data: ListingForm) => {
    try {
      const { id } = await listingsApi.create(data);
      if (files.length > 0) await listingsApi.uploadImages(id, files);
      toast.success('Обявата е създадена успешно!');
      navigate(`/listings/${id}`);
    } catch {
      toast.error('Неуспешно създаване на обявата. Опитай отново.');
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

  return (
    <Container size="md" className="py-8">
      <PageHeader
        title="Публикувай обява"
        description="Попълни данните за автомобила. Полетата със звезда са задължителни."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title="Основни данни" description="Марка, модел, технически характеристики.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field className="md:col-span-2" label="Заглавие" required error={errors.title?.message}>
              <Input invalid={!!errors.title} placeholder="напр. BMW 320d M-Sport 2020" {...register('title')} />
            </Field>

            <Field label="Марка" required error={errors.makeId?.message}>
              <Select invalid={!!errors.makeId} {...register('makeId')}>
                <option value={0}>Избери марка</option>
                {makes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </Select>
            </Field>

            <Field label="Модел" required error={errors.modelId?.message}>
              <Select invalid={!!errors.modelId} disabled={models.length === 0} {...register('modelId')}>
                <option value={0}>Избери модел</option>
                {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </Select>
            </Field>

            <Field label="Година" required error={errors.year?.message}>
              <Input type="number" invalid={!!errors.year} {...register('year')} />
            </Field>

            <Field label="Пробег (км)">
              <Input type="number" {...register('mileage')} />
            </Field>

            <Field label="Тип гориво" required error={errors.fuelType?.message}>
              <Select invalid={!!errors.fuelType} {...register('fuelType')}>
                <option value="">Избери</option>
                {FUEL_TYPES.map((t) => <option key={t} value={t}>{FUEL_TYPE_LABELS[t] ?? t}</option>)}
              </Select>
            </Field>

            <Field label="Скоростна кутия" required error={errors.transmissionType?.message}>
              <Select invalid={!!errors.transmissionType} {...register('transmissionType')}>
                <option value="">Избери</option>
                {TRANSMISSION_TYPES.map((t) => <option key={t} value={t}>{TRANSMISSION_LABELS[t] ?? t}</option>)}
              </Select>
            </Field>

            <Field label="Тип каросерия" required error={errors.bodyType?.message}>
              <Select invalid={!!errors.bodyType} {...register('bodyType')}>
                <option value="">Избери</option>
                {BODY_TYPES.map((t) => <option key={t} value={t}>{BODY_TYPE_LABELS[t] ?? t}</option>)}
              </Select>
            </Field>

            <Field label="Тип задвижване" required error={errors.driveType?.message}>
              <Select invalid={!!errors.driveType} {...register('driveType')}>
                <option value="">Избери</option>
                {DRIVE_TYPES.map((t) => <option key={t} value={t}>{DRIVE_TYPE_LABELS[t] ?? t}</option>)}
              </Select>
            </Field>

            <Field label="Двигател (куб.см)">
              <Input type="number" placeholder="напр. 1998" {...register('engineDisplacementCc')} />
            </Field>

            <Field label="Мощност (к.с.)">
              <Input type="number" {...register('horsePower')} />
            </Field>

            <Field label="Цвят" required error={errors.color?.message}>
              <Select invalid={!!errors.color} {...register('color')}>
                <option value="">Избери</option>
                {COLORS.map((c) => <option key={c} value={c}>{COLOR_LABELS[c] ?? c}</option>)}
              </Select>
            </Field>

            <Field label="Състояние" required error={errors.condition?.message}>
              <Select invalid={!!errors.condition} {...register('condition')}>
                <option value="">Избери</option>
                {CONDITIONS.map((c) => <option key={c} value={c}>{CONDITION_LABELS[c] ?? c}</option>)}
              </Select>
            </Field>
          </div>
        </FormSection>

        <FormSection title="Цена и местоположение" description="Тези данни помагат на купувачите да те открият.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Цена (€)" required error={errors.price?.message}>
              <Input type="number" invalid={!!errors.price} {...register('price')} />
            </Field>
            <Field label="Град">
              <Input {...register('city')} />
            </Field>
            <Field label="VIN номер">
              <Input maxLength={17} {...register('vinNumber')} />
            </Field>
            <Field className="md:col-span-2" label="Описание" hint="Опиши автомобила, неговото състояние и всичко важно.">
              <Textarea rows={5} {...register('description')} />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Снимки" description="До 20 снимки, JPG/PNG/WebP, до 10MB всяка.">
          <div
            {...getRootProps()}
            className={cn(
              'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center cursor-pointer transition-colors',
              isDragActive ? 'border-primary bg-primary-soft' : 'border-border hover:border-fg-subtle',
            )}
          >
            <input {...getInputProps()} />
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-soft text-fg-muted">
              <Upload className="h-5 w-5" />
            </div>
            <p className="text-sm text-fg">
              {isDragActive ? 'Пусни снимките тук...' : 'Плъзни и пусни снимки или щракни за избор'}
            </p>
            <p className="text-xs text-fg-subtle">JPG, PNG, WebP — до 10MB</p>
          </div>
          {files.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {files.map((file, i) => (
                <div key={i} className="group relative">
                  <img
                    src={URL.createObjectURL(file)}
                    alt=""
                    className="aspect-square w-full rounded-lg border border-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
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
          <FormSection title="Екстри" description="Маркирай всичко, което автомобилът има.">
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
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
            Отказ
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={isSubmitting}
            leadingIcon={<ImagePlus className="h-4 w-4" />}
          >
            {isSubmitting ? 'Публикуване...' : 'Публикувай обявата'}
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
