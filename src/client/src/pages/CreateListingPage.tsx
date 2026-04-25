import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
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

  const { data: makes = [] } = useQuery({
    queryKey: ['makes'],
    queryFn: makesApi.getAll,
  });

  const { data: features = [] } = useQuery({
    queryKey: ['features'],
    queryFn: featuresApi.getAll,
  });

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
    setValue(
      'featureIds',
      current.includes(id) ? current.filter((f) => f !== id) : [...current, id]
    );
  };

  const onSubmit = async (data: ListingForm) => {
    try {
      const { id } = await listingsApi.create(data);

      if (files.length > 0) {
        await listingsApi.uploadImages(id, files);
      }

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
    {} as Record<string, typeof features>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Публикувай обява</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Данни за автомобила
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Заглавие</label>
              <input {...register('title')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" placeholder="напр. BMW 320d M-Sport 2020" />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Марка</label>
              <select {...register('makeId')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                <option value={0}>Избери марка</option>
                {makes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              {errors.makeId && <p className="text-red-500 text-sm mt-1">{errors.makeId.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Модел</label>
              <select {...register('modelId')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" disabled={models.length === 0}>
                <option value={0}>Избери модел</option>
                {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              {errors.modelId && <p className="text-red-500 text-sm mt-1">{errors.modelId.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Година</label>
              <input type="number" {...register('year')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              {errors.year && <p className="text-red-500 text-sm mt-1">{errors.year.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Пробег (км)</label>
              <input type="number" {...register('mileage')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Тип гориво</label>
              <select {...register('fuelType')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">Избери</option>
                {FUEL_TYPES.map((t) => <option key={t} value={t}>{FUEL_TYPE_LABELS[t] ?? t}</option>)}
              </select>
              {errors.fuelType && <p className="text-red-500 text-sm mt-1">{errors.fuelType.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Скоростна кутия</label>
              <select {...register('transmissionType')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">Избери</option>
                {TRANSMISSION_TYPES.map((t) => <option key={t} value={t}>{TRANSMISSION_LABELS[t] ?? t}</option>)}
              </select>
              {errors.transmissionType && <p className="text-red-500 text-sm mt-1">{errors.transmissionType.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Тип каросерия</label>
              <select {...register('bodyType')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">Избери</option>
                {BODY_TYPES.map((t) => <option key={t} value={t}>{BODY_TYPE_LABELS[t] ?? t}</option>)}
              </select>
              {errors.bodyType && <p className="text-red-500 text-sm mt-1">{errors.bodyType.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Тип задвижване</label>
              <select {...register('driveType')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">Избери</option>
                {DRIVE_TYPES.map((t) => <option key={t} value={t}>{DRIVE_TYPE_LABELS[t] ?? t}</option>)}
              </select>
              {errors.driveType && <p className="text-red-500 text-sm mt-1">{errors.driveType.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Двигател (куб.см)</label>
              <input type="number" {...register('engineDisplacementCc')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="напр. 1998" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Мощност (к.с.)</label>
              <input type="number" {...register('horsePower')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Цвят</label>
              <select {...register('color')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">Избери</option>
                {COLORS.map((c) => <option key={c} value={c}>{COLOR_LABELS[c] ?? c}</option>)}
              </select>
              {errors.color && <p className="text-red-500 text-sm mt-1">{errors.color.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Състояние</label>
              <select {...register('condition')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">Избери</option>
                {CONDITIONS.map((c) => <option key={c} value={c}>{CONDITION_LABELS[c] ?? c}</option>)}
              </select>
              {errors.condition && <p className="text-red-500 text-sm mt-1">{errors.condition.message}</p>}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Цена и местоположение</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Цена</label>
              <input type="number" {...register('price')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Град</label>
              <input {...register('city')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">VIN номер</label>
              <input {...register('vinNumber')} maxLength={17} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
              <textarea {...register('description')} rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Снимки</h2>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
          >
            <input {...getInputProps()} />
            <p className="text-gray-600">
              {isDragActive
                ? 'Пусни снимките тук...'
                : 'Плъзни и пусни снимки тук, или щракни за избор'}
            </p>
            <p className="text-sm text-gray-400 mt-1">JPG, PNG, WebP до 10MB</p>
          </div>
          {files.length > 0 && (
            <div className="grid grid-cols-4 gap-3 mt-4">
              {files.map((file, i) => (
                <div key={i} className="relative group">
                  <img
                    src={URL.createObjectURL(file)}
                    alt=""
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Премахни снимката"
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {Object.keys(featuresByCategory).length > 0 && (
          <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Екстри</h2>
            {Object.entries(featuresByCategory).map(([category, items]) => (
              <div key={category} className="mb-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">{category}</h3>
                <div className="flex flex-wrap gap-2">
                  {items.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => toggleFeature(f.id)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        (selectedFeatures || []).includes(f.id)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? 'Публикуване...' : 'Публикувай обявата'}
        </button>
      </form>
    </div>
  );
}
