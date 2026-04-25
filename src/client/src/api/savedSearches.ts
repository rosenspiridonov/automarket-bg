import apiClient from './client';
import type { SavedSearchDto, CreateSavedSearchRequest } from '../types/savedSearch';

export const savedSearchesApi = {
  getAll: () =>
    apiClient.get<SavedSearchDto[]>('/saved-searches').then((r) => r.data),

  create: (data: CreateSavedSearchRequest) =>
    apiClient.post<{ id: number }>('/saved-searches', data).then((r) => r.data),

  delete: (id: number) => apiClient.delete(`/saved-searches/${id}`),
};
