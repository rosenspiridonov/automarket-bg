import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Search } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { favoritesApi } from '../api/favorites';
import { CarCard } from '../components/car/CarCard';
import { Button, CarCardSkeleton, Container, EmptyState, PageHeader } from '../components/ui';

export function FavoritesPage() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: favoritesApi.getAll,
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <Container size="md" className="py-16">
        <EmptyState
          icon={<Heart className="h-5 w-5" />}
          title="Необходим е вход"
          description="Трябва да си влязъл, за да видиш любимите си обяви."
          action={
            <Button onClick={() => navigate('/login')} variant="primary">
              Вход
            </Button>
          }
        />
      </Container>
    );
  }

  return (
    <Container className="py-8">
      <PageHeader
        title="Моите любими"
        description={
          favorites.length > 0
            ? `${favorites.length} запазен${favorites.length === 1 ? 'а обява' : 'и обяви'}.`
            : undefined
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CarCardSkeleton key={i} />
          ))}
        </div>
      ) : favorites.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((listing) => (
            <CarCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Heart className="h-5 w-5" />}
          title="Все още нямаш любими"
          description="Разгледай обявите и натисни сърцето, за да ги запазиш тук."
          action={
            <Link to="/search">
              <Button variant="primary" leadingIcon={<Search className="h-4 w-4" />}>
                Разгледай обявите
              </Button>
            </Link>
          }
        />
      )}
    </Container>
  );
}
