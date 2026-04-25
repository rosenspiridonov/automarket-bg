import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CarListingDto } from '../../types/listing';
import { formatPrice, formatMileage, timeAgo } from '../../utils/format';
import { favoritesApi } from '../../api/favorites';
import { useAuthStore } from '../../store/authStore';
import { FUEL_TYPE_LABELS, TRANSMISSION_LABELS } from '../../utils/constants';

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
    if (isAuthenticated) {
      toggleFavorite.mutate();
    }
  };

  return (
    <Link
      to={`/listings/${listing.id}`}
      className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow group relative"
    >
      <div className="aspect-[16/10] bg-gray-100 overflow-hidden relative">
        {listing.primaryImageUrl ? (
          <img
            src={listing.primaryImageUrl}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            Без снимка
          </div>
        )}
        {isAuthenticated && (
          <button
            onClick={handleFavoriteClick}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors"
            aria-label={isFavorited ? 'Премахни от любими' : 'Добави в любими'}
          >
            <svg
              className={`w-5 h-5 ${isFavorited ? 'text-red-500 fill-red-500' : 'text-gray-500'}`}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              fill={isFavorited ? 'currentColor' : 'none'}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
              />
            </svg>
          </button>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 line-clamp-1">
            {listing.title}
          </h3>
          <span className="text-lg font-bold text-blue-600 whitespace-nowrap">
            {formatPrice(listing.price)}
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-3">
          {listing.makeName} {listing.modelName}, {listing.year}
        </p>
        <div className="flex flex-wrap gap-2 text-xs text-gray-600">
          <span className="bg-gray-100 px-2 py-1 rounded">
            {formatMileage(listing.mileage)}
          </span>
          <span className="bg-gray-100 px-2 py-1 rounded">
            {FUEL_TYPE_LABELS[listing.fuelType] ?? listing.fuelType}
          </span>
          <span className="bg-gray-100 px-2 py-1 rounded">
            {TRANSMISSION_LABELS[listing.transmissionType] ?? listing.transmissionType}
          </span>
          {listing.horsePower && (
            <span className="bg-gray-100 px-2 py-1 rounded">
              {listing.horsePower} к.с.
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
          {listing.city && <span>{listing.city}</span>}
          <span>{timeAgo(listing.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}
