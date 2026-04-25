import apiClient from './client';
import type { CarFeatureDto } from '../types/listing';

export const featuresApi = {
  getAll: () =>
    apiClient.get<CarFeatureDto[]>('/features').then((r) => r.data),
};
