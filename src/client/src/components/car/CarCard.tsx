import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Fuel, Gauge, Heart, MapPin, Settings2 } from 'lucide-react';
import type { CarListingDto } from '../../types/listing';
import { formatPrice, formatMileage, timeAgo } from '../../utils/format';
import { favoritesApi } from '../../api/favorites';
import { useAuthStore } from '../../store/authStore';
import { FUEL_TYPE_LABELS, TRANSMISSION_LABELS } from '../../utils/constants';
import { cn } from '../../utils/cn';

interface CarCardProps {
  listing: CarListingDto;
  isFavorited?: boolean;
}

export function CarCard({ listing, isFavorited = false }: CarCardProps) {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const toggleFavorite = useMutation({
    mutationFn: () => favoritesApi.toggle(listing.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['favorite-ids'] });
    },
  });

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAuthenticated) toggleFavorite.mutate();
  };

  return (
    <Link
      to={`/listings/${listing.id}`}
      className="group card-shell overflow-hidden transition-all hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-soft">
        {listing.primaryImageUrl ? (
          <img
            src={listing.primaryImageUrl}
            alt={listing.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-fg-subtle">
            Няма снимка
          </div>
        )}

        {isAuthenticated && (
          <button
            onClick={handleFavoriteClick}
            aria-label={isFavorited ? 'Премахни от любими' : 'Добави в любими'}
            className={cn(
              'absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-sm transition-all',
              isFavorited
                ? 'bg-white/95 text-danger'
                : 'bg-white/80 text-fg-muted hover:bg-white hover:text-fg',
            )}
          >
            <Heart
              className={cn('h-4 w-4', isFavorited && 'fill-current')}
              strokeWidth={2}
            />
          </button>
        )}

        <div className="absolute bottom-2 left-2 rounded-full bg-fg/90 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
          {formatPrice(listing.price)}
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-sm font-semibold text-fg line-clamp-1">
          {listing.makeName} {listing.modelName}
        </h3>
        <p className="mt-0.5 text-xs text-fg-muted line-clamp-1">{listing.title}</p>

        <dl className="mt-3 grid grid-cols-2 gap-y-1.5 text-xs text-fg-muted">
          <SpecRow icon={<Calendar className="h-3.5 w-3.5" />} value={String(listing.year)} />
          <SpecRow icon={<Gauge className="h-3.5 w-3.5" />} value={formatMileage(listing.mileage)} />
          <SpecRow
            icon={<Fuel className="h-3.5 w-3.5" />}
            value={FUEL_TYPE_LABELS[listing.fuelType] ?? listing.fuelType}
          />
          <SpecRow
            icon={<Settings2 className="h-3.5 w-3.5" />}
            value={TRANSMISSION_LABELS[listing.transmissionType] ?? listing.transmissionType}
          />
        </dl>

        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-fg-subtle">
          {listing.city ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {listing.city}
            </span>
          ) : (
            <span />
          )}
          <span>{timeAgo(listing.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}

function SpecRow({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="text-fg-subtle">{icon}</span>
      <span className="truncate">{value}</span>
    </div>
  );
}
