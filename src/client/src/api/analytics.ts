import apiClient from './client';
import type {
  MarketOverview,
  PriceByMake,
  PriceTrendPoint,
  ListingCountByBodyType,
} from '../types/analytics';

export const analyticsApi = {
  overview: () =>
    apiClient.get<MarketOverview>('/analytics/overview').then((r) => r.data),

  pricesByMake: (limit = 15) =>
    apiClient
      .get<PriceByMake[]>('/analytics/prices-by-make', { params: { limit } })
      .then((r) => r.data),

  priceTrend: (makeId: number, modelId?: number) =>
    apiClient
      .get<PriceTrendPoint[]>('/analytics/price-trend', {
        params: { makeId, modelId },
      })
      .then((r) => r.data),

  bodyTypes: () =>
    apiClient
      .get<ListingCountByBodyType[]>('/analytics/body-types')
      .then((r) => r.data),
};
