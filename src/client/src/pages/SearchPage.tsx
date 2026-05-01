import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Filter,
  Search as SearchIcon,
  X,
} from "lucide-react";
import { listingsApi } from "../api/listings";
import { makesApi } from "../api/makes";
import { featuresApi } from "../api/features";
import { favoritesApi } from "../api/favorites";
import { savedSearchesApi } from "../api/savedSearches";
import type { ModelDto } from "../api/makes";
import type { SearchFilter } from "../types/listing";
import { CarCard } from "../components/car/CarCard";
import { useAuthStore } from "../store/authStore";
import {
  Badge,
  Button,
  CarCardSkeleton,
  Container,
  EmptyState,
  Field,
  Input,
  Select,
} from "../components/ui";
import {
  FUEL_TYPES,
  TRANSMISSION_TYPES,
  BODY_TYPES,
  DRIVE_TYPES,
  CONDITIONS,
  COLORS,
  FUEL_TYPE_LABELS,
  TRANSMISSION_LABELS,
  BODY_TYPE_LABELS,
  DRIVE_TYPE_LABELS,
  CONDITION_LABELS,
  COLOR_LABELS,
  SORT_OPTIONS,
} from "../utils/constants";
import { cn } from "../utils/cn";

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [models, setModels] = useState<ModelDto[]>([]);
  const [saveSearchName, setSaveSearchName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const featureIdsParam = searchParams
    .getAll("featureIds")
    .map(Number)
    .filter(Boolean);
  const filter: SearchFilter = {
    makeId: searchParams.get("makeId")
      ? Number(searchParams.get("makeId"))
      : undefined,
    modelId: searchParams.get("modelId")
      ? Number(searchParams.get("modelId"))
      : undefined,
    yearFrom: searchParams.get("yearFrom")
      ? Number(searchParams.get("yearFrom"))
      : undefined,
    yearTo: searchParams.get("yearTo")
      ? Number(searchParams.get("yearTo"))
      : undefined,
    priceFrom: searchParams.get("priceFrom")
      ? Number(searchParams.get("priceFrom"))
      : undefined,
    priceTo: searchParams.get("priceTo")
      ? Number(searchParams.get("priceTo"))
      : undefined,
    fuelType: searchParams.get("fuelType") || undefined,
    transmissionType: searchParams.get("transmissionType") || undefined,
    bodyType: searchParams.get("bodyType") || undefined,
    driveType: searchParams.get("driveType") || undefined,
    color: searchParams.get("color") || undefined,
    condition: searchParams.get("condition") || undefined,
    city: searchParams.get("city") || undefined,
    region: searchParams.get("region") || undefined,
    horsePowerFrom: searchParams.get("horsePowerFrom")
      ? Number(searchParams.get("horsePowerFrom"))
      : undefined,
    horsePowerTo: searchParams.get("horsePowerTo")
      ? Number(searchParams.get("horsePowerTo"))
      : undefined,
    featureIds: featureIdsParam.length > 0 ? featureIdsParam : undefined,
    query: searchParams.get("query") || undefined,
    sortBy: searchParams.get("sortBy") || "newest",
    page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
    pageSize: 20,
  };

  const { data: makes = [] } = useQuery({
    queryKey: ["makes"],
    queryFn: makesApi.getAll,
  });

  const { data: result, isLoading } = useQuery({
    queryKey: ["listings", filter],
    queryFn: () => listingsApi.search(filter),
  });

  const { data: favoriteIds = [] } = useQuery({
    queryKey: ["favorite-ids"],
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
      queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
      toast.success("Търсенето е запазено!");
      setShowSaveDialog(false);
      setSaveSearchName("");
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
      if (val === undefined || val === "" || val === null) {
        next.delete(key);
      } else if (Array.isArray(val)) {
        next.delete(key);
        val.forEach((item) => next.append(key, String(item)));
      } else {
        next.set(key, String(val));
      }
    });
    if ("makeId" in updates) next.delete("modelId");
    next.set("page", "1");
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => setSearchParams({}, { replace: true });

  const goToPage = (page: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(page));
    setSearchParams(next, { replace: true });
  };

  const totalPages = result
    ? Math.ceil(result.totalCount / result.pageSize)
    : 0;
  const activeFilterCount = Object.entries(filter).filter(
    ([key, val]) =>
      val !== undefined && !["sortBy", "page", "pageSize"].includes(key),
  ).length;

  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: currentYear - 1990 + 2 },
    (_, i) => currentYear + 1 - i,
  );

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
                  <Badge tone="primary" size="sm">
                    {activeFilterCount}
                  </Badge>
                )}
              </button>
              <p className="text-sm text-fg-muted">
                {result ? (
                  <>
                    <span className="font-semibold text-fg">
                      {result.totalCount.toLocaleString()}
                    </span>{" "}
                    намерени обяви
                  </>
                ) : (
                  "Зареждане..."
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
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="mt-5">
            {isLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <CarCardSkeleton key={i} />
                ))}
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
                      Страница{" "}
                      <span className="font-semibold text-fg">
                        {filter.page}
                      </span>{" "}
                      от {totalPages}
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

const EXPANDED_FILTER_KEYS: (keyof SearchFilter)[] = [
  "driveType",
  "color",
  "condition",
  "city",
  "region",
  "horsePowerFrom",
  "horsePowerTo",
  "featureIds",
];

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
  const [expanded, setExpanded] = useState(false);

  const { data: features = [] } = useQuery({
    queryKey: ["features"],
    queryFn: featuresApi.getAll,
    enabled: expanded,
  });

  const featuresByCategory = features.reduce(
    (acc, f) => {
      if (!acc[f.category]) acc[f.category] = [];
      acc[f.category].push(f);
      return acc;
    },
    {} as Record<string, typeof features>,
  );

  const selectedFeatureIds = filter.featureIds ?? [];

  const toggleFeature = (id: number) => {
    const next = selectedFeatureIds.includes(id)
      ? selectedFeatureIds.filter((f) => f !== id)
      : [...selectedFeatureIds, id];
    onUpdate({ featureIds: next.length > 0 ? next : undefined });
  };

  const expandedActiveCount = EXPANDED_FILTER_KEYS.filter((k) => {
    const v = filter[k];
    return Array.isArray(v) ? v.length > 0 : v !== undefined;
  }).length;

  const clearExpanded = () => {
    const reset: Partial<SearchFilter> = {};
    EXPANDED_FILTER_KEYS.forEach((k) => {
      (reset as Record<string, undefined>)[k] = undefined;
    });
    onUpdate(reset);
  };

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
          defaultValue={filter.query || ""}
          placeholder="напр. M-Sport"
          leadingIcon={<SearchIcon className="h-4 w-4" />}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onUpdate({
                query: (e.target as HTMLInputElement).value || undefined,
              });
            }
          }}
        />
      </Field>

      <Field label="Марка">
        <Select
          value={filter.makeId ? String(filter.makeId) : ""}
          onChange={(e) =>
            onUpdate({
              makeId: e.target.value ? Number(e.target.value) : undefined,
            })
          }
        >
          <option value="">Всички марки</option>
          {makes.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      </Field>

      {models.length > 0 && (
        <Field label="Модел">
          <Select
            value={filter.modelId ? String(filter.modelId) : ""}
            onChange={(e) =>
              onUpdate({
                modelId: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          >
            <option value="">Всички модели</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Field label="Година от">
          <Select
            value={filter.yearFrom ? String(filter.yearFrom) : ""}
            onChange={(e) =>
              onUpdate({
                yearFrom: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          >
            <option value="">-</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Година до">
          <Select
            value={filter.yearTo ? String(filter.yearTo) : ""}
            onChange={(e) =>
              onUpdate({
                yearTo: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          >
            <option value="">-</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Цена от">
          <Input
            type="number"
            placeholder="Мин."
            defaultValue={filter.priceFrom || ""}
            onBlur={(e) =>
              onUpdate({
                priceFrom: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </Field>
        <Field label="Цена до">
          <Input
            type="number"
            placeholder="Макс."
            defaultValue={filter.priceTo || ""}
            onBlur={(e) =>
              onUpdate({
                priceTo: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </Field>
      </div>

      <Field label="Тип гориво">
        <Select
          value={filter.fuelType || ""}
          onChange={(e) => onUpdate({ fuelType: e.target.value || undefined })}
        >
          <option value="">Всички</option>
          {FUEL_TYPES.map((t) => (
            <option key={t} value={t}>
              {FUEL_TYPE_LABELS[t] ?? t}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Скоростна кутия">
        <Select
          value={filter.transmissionType || ""}
          onChange={(e) =>
            onUpdate({ transmissionType: e.target.value || undefined })
          }
        >
          <option value="">Всички</option>
          {TRANSMISSION_TYPES.map((t) => (
            <option key={t} value={t}>
              {TRANSMISSION_LABELS[t] ?? t}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Тип каросерия">
        <Select
          value={filter.bodyType || ""}
          onChange={(e) => onUpdate({ bodyType: e.target.value || undefined })}
        >
          <option value="">Всички</option>
          {BODY_TYPES.map((t) => (
            <option key={t} value={t}>
              {BODY_TYPE_LABELS[t] ?? t}
            </option>
          ))}
        </Select>
      </Field>

      {/* Expanded filters toggle */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-sm font-medium text-fg hover:bg-surface-soft transition-colors"
      >
        <span>
          Още филтри
          {expandedActiveCount > 0 && (
            <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-fg">
              {expandedActiveCount}
            </span>
          )}
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-fg-muted" />
        ) : (
          <ChevronDown className="h-4 w-4 text-fg-muted" />
        )}
      </button>

      {expanded && (
        <div className="space-y-5 border-t border-border pt-5">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Мощност от (к.с.)">
              <Input
                type="number"
                placeholder="Мин."
                defaultValue={filter.horsePowerFrom || ""}
                onBlur={(e) =>
                  onUpdate({
                    horsePowerFrom: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
              />
            </Field>
            <Field label="Мощност до (к.с.)">
              <Input
                type="number"
                placeholder="Макс."
                defaultValue={filter.horsePowerTo || ""}
                onBlur={(e) =>
                  onUpdate({
                    horsePowerTo: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Град">
              <Input
                defaultValue={filter.city || ""}
                placeholder="напр. София"
                onBlur={(e) => onUpdate({ city: e.target.value || undefined })}
              />
            </Field>
            <Field label="Регион">
              <Input
                defaultValue={filter.region || ""}
                placeholder="напр. Пловдив"
                onBlur={(e) =>
                  onUpdate({ region: e.target.value || undefined })
                }
              />
            </Field>
          </div>

          <Field label="Задвижване">
            <Select
              value={filter.driveType || ""}
              onChange={(e) =>
                onUpdate({ driveType: e.target.value || undefined })
              }
            >
              <option value="">Всички</option>
              {DRIVE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {DRIVE_TYPE_LABELS[t] ?? t}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Цвят">
            <Select
              value={filter.color || ""}
              onChange={(e) => onUpdate({ color: e.target.value || undefined })}
            >
              <option value="">Всички</option>
              {COLORS.map((t) => (
                <option key={t} value={t}>
                  {COLOR_LABELS[t] ?? t}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Състояние">
            <Select
              value={filter.condition || ""}
              onChange={(e) =>
                onUpdate({ condition: e.target.value || undefined })
              }
            >
              <option value="">Всички</option>
              {CONDITIONS.map((t) => (
                <option key={t} value={t}>
                  {CONDITION_LABELS[t] ?? t}
                </option>
              ))}
            </Select>
          </Field>

          {Object.keys(featuresByCategory).length > 0 && (
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                Екстри
              </p>
              {Object.entries(featuresByCategory).map(([category, items]) => (
                <div key={category}>
                  <p className="mb-1.5 text-xs text-fg-muted">{category}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((f) => {
                      const active = selectedFeatureIds.includes(f.id);
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => toggleFeature(f.id)}
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                            active
                              ? "border-primary bg-primary text-primary-fg"
                              : "border-border bg-surface text-fg hover:border-fg-subtle",
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
          )}

          {expandedActiveCount > 0 && (
            <button
              type="button"
              onClick={clearExpanded}
              className="text-xs font-medium text-primary hover:underline"
            >
              Изчисти допълнителните филтри
            </button>
          )}
        </div>
      )}
    </div>
  );
}
