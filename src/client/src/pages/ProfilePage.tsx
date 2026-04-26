import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Bookmark, Car, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { listingsApi } from '../api/listings';
import { savedSearchesApi } from '../api/savedSearches';
import { CarCard } from '../components/car/CarCard';
import { Button, CarCardSkeleton, Container, EmptyState, Skeleton } from '../components/ui';
import { cn } from '../utils/cn';
import type { SavedSearchDto } from '../types/savedSearch';

type Tab = 'listings' | 'saved-searches';

export function ProfilePage() {
  const { user, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('listings');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: myListings = [], isLoading: loadingListings } = useQuery({
    queryKey: ['listings', 'my'],
    queryFn: listingsApi.getMyListings,
    enabled: isAuthenticated,
  });

  const { data: savedSearches = [], isLoading: loadingSaved } = useQuery({
    queryKey: ['saved-searches'],
    queryFn: savedSearchesApi.getAll,
    enabled: isAuthenticated && activeTab === 'saved-searches',
  });

  const deleteSavedSearch = useMutation({
    mutationFn: savedSearchesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
      toast.success('Търсенето е изтрито');
    },
  });

  if (!isAuthenticated || !user) {
    return (
      <Container size="md" className="py-16">
        <EmptyState
          title="Необходим е вход"
          description="Трябва да си влязъл, за да видиш профила си."
          action={
            <Button onClick={() => navigate('/login')} variant="primary">
              Вход
            </Button>
          }
        />
      </Container>
    );
  }

  const applySavedSearch = (search: SavedSearchDto) => {
    try {
      const filter = JSON.parse(search.filterJson);
      const params = new URLSearchParams();
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, String(value));
        }
      });
      navigate(`/search?${params.toString()}`);
    } catch {
      toast.error('Невалидни филтри за търсене');
    }
  };

  const tabs: { key: Tab; label: string; count?: number; icon: React.ReactNode }[] = [
    { key: 'listings', label: 'Моите обяви', count: myListings.length, icon: <Car className="h-4 w-4" /> },
    { key: 'saved-searches', label: 'Запазени търсения', icon: <Bookmark className="h-4 w-4" /> },
  ];

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');

  return (
    <Container className="py-8">
      <section className="card-shell mb-6 p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-2xl font-semibold text-primary">
            {user.userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold text-fg">{fullName || user.userName}</h1>
            <p className="truncate text-sm text-fg-muted">{user.email}</p>
            {fullName && (
              <p className="truncate text-xs text-fg-subtle">@{user.userName}</p>
            )}
          </div>
          <Link to="/listings/new">
            <Button variant="primary" leadingIcon={<Plus className="h-4 w-4" />}>
              Нова обява
            </Button>
          </Link>
        </div>
      </section>

      <div className="mb-6 flex flex-wrap items-center gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-fg-muted hover:text-fg',
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                  activeTab === tab.key ? 'bg-primary-soft text-primary' : 'bg-surface-soft text-fg-muted',
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'listings' && (
        <>
          {loadingListings ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <CarCardSkeleton key={i} />
              ))}
            </div>
          ) : myListings.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myListings.map((listing) => (
                <CarCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Car className="h-5 w-5" />}
              title="Все още няма обяви"
              description="Започни да продаваш, като добавиш първата си кола."
              action={
                <Link to="/listings/new">
                  <Button variant="primary" leadingIcon={<Plus className="h-4 w-4" />}>
                    Публикувай обява
                  </Button>
                </Link>
              }
            />
          )}
        </>
      )}

      {activeTab === 'saved-searches' && (
        <>
          {loadingSaved ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card-shell p-4">
                  <Skeleton className="mb-2 h-4 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ))}
            </div>
          ) : savedSearches.length > 0 ? (
            <div className="space-y-3">
              {savedSearches.map((search) => (
                <div
                  key={search.id}
                  className="card-shell flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-medium text-fg">{search.name}</h3>
                    <p className="mt-0.5 text-xs text-fg-subtle">
                      Запазено на {new Date(search.createdAt).toLocaleDateString('bg-BG')}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      leadingIcon={<SlidersHorizontal className="h-3.5 w-3.5" />}
                      onClick={() => applySavedSearch(search)}
                    >
                      Приложи
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteSavedSearch.mutate(search.id)}
                      leadingIcon={<Trash2 className="h-3.5 w-3.5" />}
                      className="text-danger hover:bg-danger-soft"
                    >
                      Изтрий
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Bookmark className="h-5 w-5" />}
              title="Няма запазени търсения"
              description="Запази филтрите си от страницата за търсене, за да имаш бърз достъп до тях."
              action={
                <Link to="/search">
                  <Button variant="primary">Търсене на обяви</Button>
                </Link>
              }
            />
          )}
        </>
      )}
    </Container>
  );
}
