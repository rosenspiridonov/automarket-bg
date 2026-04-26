import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Bookmark, ChevronLeft, ChevronRight, Filter, Search as SearchIcon, X } from 'lucide-react';
import { listingsApi } from '../api/listings';
import { makesApi } from '../api/makes';
import { favoritesApi } from '../api/favorites';
import { savedSearchesApi } from '../api/savedSearches';
import type { ModelDto } from '../api/makes';
import type { SearchFilter } from '../types/listing';
import { CarCard } from '../components/car/CarCard';
import { useAuthStore } from '../store/authStore';
import {
  Badge,
  Button,
  CarCardSkeleton,
  Container,
  EmptyState,
  Field,
  Input,
  Select,
} from '../components/ui';
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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
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
      if (val === undefined || val === '' || val === null) next.delete(key);
      else next.set(key, String(val));
    });
    if ('makeId' in updates) next.delete('modelId');
    next.set('page', '1');
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => setSearchParams({}, { replace: true });

  const goToPage = (page: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(page));
    setSearchParams(next, { replace: true });
  };

  const totalPages = result ? Math.ceil(result.totalCount / result.pageSize) : 0;
  const activeFilterCount = Object.entries(filter).filter(
    ([key, val]) => val !== undefined && !['sortBy', 'page', 'pageSize'].includes(key),
  ).length;

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1990 + 2 }, (_, i) => currentYear + 1 - i);

  const filtersPanel = (
    <FiltersPanel
      filter={filter}
      makes={makes}
      models={models}
      years={years}
      onUpdate={updateFilter}
      onClear={clearFilters}
      activeFilterCount={activeFilterCount}
    />
  );

  return (
    <Container className="py-6 lg:py-8">
      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="hidden w-72 flex-shrink-0 lg:block">
          <div className="sticky top-20">{filtersPanel}</div>
        </aside>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileFiltersOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-fg lg:hidden"
              >
                <Filter className="h-4 w-4" /> Филтри
                {activeFilterCount > 0 && (
                  <Badge tone="primary" size="sm">{activeFilterCount}</Badge>
                )}
              </button>
              <p className="text-sm text-fg-muted">
                {result ? (
                  <>
                    <span className="font-semibold text-fg">{result.totalCount.toLocaleString()}</span> намерени обяви
                  </>
                ) : (
                  'Зареждане...'
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isAuthenticated && activeFilterCount > 0 && (
                <div className="relative">
                  <Button
                    variant="secondary"
                    size="sm"
                    leadingIcon={<Bookmark className="h-4 w-4" />}
                    onClick={() => setShowSaveDialog((s) => !s)}
                  >
                    Запази
                  </Button>
                  {showSaveDialog && (
                    <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-xl border border-border bg-surface p-3 shadow-[var(--shadow-pop)]">
                      <Input
                        autoFocus
                        placeholder="Име на търсенето..."
                        value={saveSearchName}
                        onChange={(e) => setSaveSearchName(e.target.value)}
                      />
                      <div className="mt-2 flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          fullWidth
                          onClick={() => setShowSaveDialog(false)}
                        >
                          Отказ
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          fullWidth
                          disabled={!saveSearchName.trim()}
                          onClick={() => saveSearch.mutate()}
                        >
                          Запази
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <Select
                value={filter.sortBy}
                onChange={(e) => updateFilter({ sortBy: e.target.value })}
                className="!h-9 !pr-8 !text-sm"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="mt-5">
            {isLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => <CarCardSkeleton key={i} />)}
              </div>
            ) : result && result.items.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {result.items.map((listing) => (
                    <CarCard
                      key={listing.id}
                      listing={listing}
                      isFavorited={favoriteIds.includes(listing.id)}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      leadingIcon={<ChevronLeft className="h-4 w-4" />}
                      onClick={() => goToPage(filter.page! - 1)}
                      disabled={filter.page === 1}
                    >
                      Предишна
                    </Button>
                    <span className="text-sm text-fg-muted px-2">
                      Страница <span className="font-semibold text-fg">{filter.page}</span> от {totalPages}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      trailingIcon={<ChevronRight className="h-4 w-4" />}
                      onClick={() => goToPage(filter.page! + 1)}
                      disabled={filter.page === totalPages}
                    >
                      Напред
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                icon={<SearchIcon className="h-5 w-5" />}
                title="Няма намерени обяви"
                description="Опитай да премахнеш някои филтри, за да видиш повече резултати."
                action={
                  activeFilterCount > 0 && (
                    <Button variant="secondary" onClick={clearFilters}>
                      Изчисти филтрите
                    </Button>
                  )
                }
              />
            )}
          </div>
        </div>
      </div>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="flex-1 bg-fg/40 backdrop-blur-sm"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="w-[85%] max-w-sm overflow-y-auto bg-bg p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Филтри</h2>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted hover:bg-surface-soft"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {filtersPanel}
          </div>
        </div>
      )}
    </Container>
  );
}

interface FiltersPanelProps {
  filter: SearchFilter;
  makes: { id: number; name: string }[];
  models: ModelDto[];
  years: number[];
  onUpdate: (updates: Partial<SearchFilter>) => void;
  onClear: () => void;
  activeFilterCount: number;
}

function FiltersPanel({
  filter,
  makes,
  models,
  years,
  onUpdate,
  onClear,
  activeFilterCount,
}: FiltersPanelProps) {
  return (
    <div className="card-shell p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-fg">Филтри</h2>
        {activeFilterCount > 0 && (
          <button
            onClick={onClear}
            className="text-xs font-medium text-primary hover:underline"
          >
            Изчисти ({activeFilterCount})
          </button>
        )}
      </div>

      <Field label="Ключови думи">
        <Input
          defaultValue={filter.query || ''}
          placeholder="напр. M-Sport"
          leadingIcon={<SearchIcon className="h-4 w-4" />}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onUpdate({ query: (e.target as HTMLInputElement).value || undefined });
            }
          }}
        />
      </Field>

      <Field label="Марка">
        <Select
          value={filter.makeId ? String(filter.makeId) : ''}
          onChange={(e) => onUpdate({ makeId: e.target.value ? Number(e.target.value) : undefined })}
        >
          <option value="">Всички марки</option>
          {makes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </Select>
      </Field>

      {models.length > 0 && (
        <Field label="Модел">
          <Select
            value={filter.modelId ? String(filter.modelId) : ''}
            onChange={(e) => onUpdate({ modelId: e.target.value ? Number(e.target.value) : undefined })}
          >
            <option value="">Всички модели</option>
            {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
        </Field>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Field label="Година от">
          <Select
            value={filter.yearFrom ? String(filter.yearFrom) : ''}
            onChange={(e) => onUpdate({ yearFrom: e.target.value ? Number(e.target.value) : undefined })}
          >
            <option value="">—</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </Select>
        </Field>
        <Field label="Година до">
          <Select
            value={filter.yearTo ? String(filter.yearTo) : ''}
            onChange={(e) => onUpdate({ yearTo: e.target.value ? Number(e.target.value) : undefined })}
          >
            <option value="">—</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Цена от">
          <Input
            type="number"
            placeholder="Мин."
            defaultValue={filter.priceFrom || ''}
            onBlur={(e) =>
              onUpdate({ priceFrom: e.target.value ? Number(e.target.value) : undefined })
            }
          />
        </Field>
        <Field label="Цена до">
          <Input
            type="number"
            placeholder="Макс."
            defaultValue={filter.priceTo || ''}
            onBlur={(e) =>
              onUpdate({ priceTo: e.target.value ? Number(e.target.value) : undefined })
            }
          />
        </Field>
      </div>

      <Field label="Тип гориво">
        <Select
          value={filter.fuelType || ''}
          onChange={(e) => onUpdate({ fuelType: e.target.value || undefined })}
        >
          <option value="">Всички</option>
          {FUEL_TYPES.map((t) => <option key={t} value={t}>{FUEL_TYPE_LABELS[t] ?? t}</option>)}
        </Select>
      </Field>

      <Field label="Скоростна кутия">
        <Select
          value={filter.transmissionType || ''}
          onChange={(e) => onUpdate({ transmissionType: e.target.value || undefined })}
        >
          <option value="">Всички</option>
          {TRANSMISSION_TYPES.map((t) => <option key={t} value={t}>{TRANSMISSION_LABELS[t] ?? t}</option>)}
        </Select>
      </Field>

      <Field label="Тип каросерия">
        <Select
          value={filter.bodyType || ''}
          onChange={(e) => onUpdate({ bodyType: e.target.value || undefined })}
        >
          <option value="">Всички</option>
          {BODY_TYPES.map((t) => <option key={t} value={t}>{BODY_TYPE_LABELS[t] ?? t}</option>)}
        </Select>
      </Field>
    </div>
  );
}
