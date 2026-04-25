import apiClient from './client';
import type { CarListingDto } from '../types/listing';

export const favoritesApi = {
  getAll: () =>
    apiClient.get<CarListingDto[]>('/favorites').then((r) => r.data),

  getIds: () =>
    apiClient.get<number[]>('/favorites/ids').then((r) => r.data),

  toggle: (listingId: number) =>
    apiClient
      .post<{ isFavorited: boolean }>(`/favorites/${listingId}`)
      .then((r) => r.data),
};
