import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { listingsApi } from '../api/listings';
import { makesApi } from '../api/makes';
import { favoritesApi } from '../api/favorites';
import { savedSearchesApi } from '../api/savedSearches';
import type { ModelDto } from '../api/makes';
import type { SearchFilter } from '../types/listing';
import { CarCard } from '../components/car/CarCard';
import { useAuthStore } from '../store/authStore';
import {
  FUEL_TYPES, TRANSMISSION_TYPES, BODY_TYPES,
  FUEL_TYPE_LABELS, TRANSMISSION_LABELS, BODY_TYPE_LABELS,
  SORT_OPTIONS,
} from '../utils/constants';

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [models, setModels] = useState<ModelDto[]>([]);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const filter: SearchFilter = {
    makeId: searchParams.get('makeId') ? Number(searchParams.get('makeId')) : undefined,
    modelId: searchParams.get('modelId') ? Number(searchParams.get('modelId')) : undefined,
    yearFrom: searchParams.get('yearFrom') ? Number(searchParams.get('yearFrom')) : undefined,
    yearTo: searchParams.get('yearTo') ? Number(searchParams.get('yearTo')) : undefined,
    priceFrom: searchParams.get('priceFrom') ? Number(searchParams.get('priceFrom')) : undefined,
    priceTo: searchParams.get('priceTo') ? Number(searchParams.get('priceTo')) : undefined,
    fuelType: searchParams.get('fuelType') || undefined,
    transmissionType: searchParams.get('transmissionType') || undefined,
    bodyType: searchParams.get('bodyType') || undefined,
    query: searchParams.get('query') || undefined,
    sortBy: searchParams.get('sortBy') || 'newest',
    page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
    pageSize: 20,
  };

  const { data: makes = [] } = useQuery({
    queryKey: ['makes'],
    queryFn: makesApi.getAll,
  });

  const { data: result, isLoading } = useQuery({
    queryKey: ['listings', filter],
    queryFn: () => listingsApi.search(filter),
  });

  const { data: favoriteIds = [] } = useQuery({
    queryKey: ['favorite-ids'],
    queryFn: favoritesApi.getIds,
    enabled: isAuthenticated,
  });

  const saveSearch = useMutation({
    mutationFn: () =>
      savedSearchesApi.create({
        name: saveSearchName,
        filterJson: JSON.stringify(filter),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
      toast.success('Търсенето е запазено!');
      setShowSaveDialog(false);
      setSaveSearchName('');
    },
  });

  useEffect(() => {
    if (filter.makeId) {
      makesApi.getModels(filter.makeId).then(setModels);
    } else {
      setModels([]);
    }
  }, [filter.makeId]);

  const updateFilter = (updates: Partial<SearchFilter>) => {
    const next = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, val]) => {
      if (val === undefined || val === '' || val === null) {
        next.delete(key);
      } else {
        next.set(key, String(val));
      }
    });

    if ('makeId' in updates) {
      next.delete('modelId');
    }

    next.set('page', '1');
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    setSearchParams({}, { replace: true });
  };

  const goToPage = (page: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(page));
    setSearchParams(next, { replace: true });
  };

  const totalPages = result ? Math.ceil(result.totalCount / result.pageSize) : 0;
  const activeFilterCount = Object.entries(filter).filter(
    ([key, val]) => val !== undefined && !['sortBy', 'page', 'pageSize'].includes(key)
  ).length;

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1990 + 2 }, (_, i) => currentYear + 1 - i);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-72 flex-shrink-0">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-5 sticky top-20">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Филтри</h2>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Изчисти филтрите
                </button>
              )}
            </div>

            <div>
              <input
                type="text"
                placeholder="Ключови думи..."
                defaultValue={filter.query || ''}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    updateFilter({ query: (e.target as HTMLInputElement).value || undefined });
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <FilterSelect
              label="Марка"
              value={filter.makeId ? String(filter.makeId) : ''}
              onChange={(v) => updateFilter({ makeId: v ? Number(v) : undefined })}
              options={makes.map((m) => ({ value: String(m.id), label: m.name }))}
            />

            {models.length > 0 && (
              <FilterSelect
                label="Модел"
                value={filter.modelId ? String(filter.modelId) : ''}
                onChange={(v) => updateFilter({ modelId: v ? Number(v) : undefined })}
                options={models.map((m) => ({ value: String(m.id), label: m.name }))}
              />
            )}

            <div className="grid grid-cols-2 gap-2">
              <FilterSelect
                label="Година от"
                value={filter.yearFrom ? String(filter.yearFrom) : ''}
                onChange={(v) => updateFilter({ yearFrom: v ? Number(v) : undefined })}
                options={years.map((y) => ({ value: String(y), label: String(y) }))}
              />
              <FilterSelect
                label="Година до"
                value={filter.yearTo ? String(filter.yearTo) : ''}
                onChange={(v) => updateFilter({ yearTo: v ? Number(v) : undefined })}
                options={years.map((y) => ({ value: String(y), label: String(y) }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Цена от</label>
                <input
                  type="number"
                  placeholder="Мин."
                  defaultValue={filter.priceFrom || ''}
                  onBlur={(e) =>
                    updateFilter({ priceFrom: e.target.value ? Number(e.target.value) : undefined })
                  }
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Цена до</label>
                <input
                  type="number"
                  placeholder="Макс."
                  defaultValue={filter.priceTo || ''}
                  onBlur={(e) =>
                    updateFilter({ priceTo: e.target.value ? Number(e.target.value) : undefined })
                  }
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <FilterSelect
              label="Тип гориво"
              value={filter.fuelType || ''}
              onChange={(v) => updateFilter({ fuelType: v || undefined })}
              options={FUEL_TYPES.map((t) => ({ value: t, label: FUEL_TYPE_LABELS[t] ?? t }))}
            />

            <FilterSelect
              label="Скоростна кутия"
              value={filter.transmissionType || ''}
              onChange={(v) => updateFilter({ transmissionType: v || undefined })}
              options={TRANSMISSION_TYPES.map((t) => ({ value: t, label: TRANSMISSION_LABELS[t] ?? t }))}
            />

            <FilterSelect
              label="Тип каросерия"
              value={filter.bodyType || ''}
              onChange={(v) => updateFilter({ bodyType: v || undefined })}
              options={BODY_TYPES.map((t) => ({ value: t, label: BODY_TYPE_LABELS[t] ?? t }))}
            />
          </div>
        </aside>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              {result ? (
                <>
                  <span className="font-medium">{result.totalCount.toLocaleString()}</span> намерени обяви
                </>
              ) : (
                'Търсене...'
              )}
            </p>
            <div className="flex items-center gap-2">
              {isAuthenticated && activeFilterCount > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowSaveDialog(!showSaveDialog)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Запази търсенето
                  </button>
                  {showSaveDialog && (
                    <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-10 w-64">
                      <input
                        type="text"
                        placeholder="Име на търсенето..."
                        value={saveSearchName}
                        onChange={(e) => setSaveSearchName(e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm mb-2 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowSaveDialog(false)}
                          className="flex-1 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Отказ
                        </button>
                        <button
                          onClick={() => saveSearch.mutate()}
                          disabled={!saveSearchName.trim()}
                          className="flex-1 px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          Запази
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <select
                value={filter.sortBy}
                onChange={(e) => updateFilter({ sortBy: e.target.value })}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
                  <div className="h-44 bg-gray-200" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                    <div className="flex gap-2">
                      <div className="h-6 bg-gray-200 rounded w-16" />
                      <div className="h-6 bg-gray-200 rounded w-16" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : result && result.items.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {result.items.map((listing) => (
                  <CarCard
                    key={listing.id}
                    listing={listing}
                    isFavorited={favoriteIds.includes(listing.id)}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  <button
                    onClick={() => goToPage(filter.page! - 1)}
                    disabled={filter.page === 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                  >
                    Предишна
                  </button>
                  <span className="text-sm text-gray-600">
                    Страница {filter.page} от {totalPages}
                  </span>
                  <button
                    onClick={() => goToPage(filter.page! + 1)}
                    disabled={filter.page === totalPages}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                  >
                    Напред
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <p className="text-lg text-gray-500 mb-2">Няма намерени обяви</p>
              <p className="text-sm text-gray-400">Опитай да промениш филтрите за търсене</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

function FilterSelect({ label, value, onChange, options }: FilterSelectProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
      >
        <option value="">Всички</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
