import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { listingsApi } from '../api/listings';
import { featuresApi } from '../api/features';

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

  const { data: features = [] } = useQuery({
    queryKey: ['features'],
    queryFn: featuresApi.getAll,
  });

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
      current.includes(featureId)
        ? current.filter((f) => f !== featureId)
        : [...current, featureId]
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

      if (newFiles.length > 0) {
        await listingsApi.uploadImages(Number(id), newFiles);
      }

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
    {} as Record<string, typeof features>
  );

  if (loadingListing) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded-xl" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Обявата не е намерена</h2>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Редактирай обявата</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Основни данни</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Заглавие</label>
              <input {...register('title')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Марка</label>
              <input value={listing.makeName} disabled className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Модел</label>
              <input value={listing.modelName} disabled className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Цена</label>
              <input type="number" {...register('price')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>}
            </div>


            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Пробег (км)</label>
              <input type="number" {...register('mileage')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Град</label>
              <input {...register('city')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
              <select {...register('status')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="Active">{STATUS_LABELS.Active}</option>
                <option value="Sold">{STATUS_LABELS.Sold}</option>
                <option value="Draft">{STATUS_LABELS.Draft}</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
              <textarea {...register('description')} rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Текущи снимки</h2>
          {listing.images && listing.images.length > 0 ? (
            <div className="grid grid-cols-4 gap-3 mb-4">
              {listing.images.map((img) => (
                <div key={img.id} className="relative group">
                  <img src={img.url} alt="" className="w-full aspect-square object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(img.id)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Изтрий снимката"
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 mb-4">Все още няма снимки.</p>
          )}

          <h3 className="text-sm font-medium text-gray-700 mb-2">Добави още снимки</h3>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
          >
            <input {...getInputProps()} />
            <p className="text-sm text-gray-600">
              {isDragActive ? 'Пусни снимките тук...' : 'Плъзни и пусни или щракни за избор'}
            </p>
          </div>
          {newFiles.length > 0 && (
            <div className="grid grid-cols-4 gap-3 mt-3">
              {newFiles.map((file, i) => (
                <div key={i} className="relative group">
                  <img src={URL.createObjectURL(file)} alt="" className="w-full aspect-square object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => setNewFiles((prev) => prev.filter((_, idx) => idx !== i))}
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

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(`/listings/${id}`)}
            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            Отказ
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Запазване...' : 'Запази промените'}
          </button>
        </div>
      </form>
    </div>
  );
}
