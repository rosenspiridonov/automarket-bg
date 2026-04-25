import apiClient from './client';
import type {
  CarListingDto,
  CarListingDetailDto,
  CreateListingRequest,
  PagedResult,
  SearchFilter,
} from '../types/listing';

export const listingsApi = {
  search: (filter: SearchFilter) =>
    apiClient
      .get<PagedResult<CarListingDto>>('/listings', { params: filter })
      .then((r) => r.data),

  featured: (count = 8) =>
    apiClient
      .get<CarListingDto[]>('/listings/featured', { params: { count } })
      .then((r) => r.data),

  getById: (id: number) =>
    apiClient.get<CarListingDetailDto>(`/listings/${id}`).then((r) => r.data),

  create: (data: CreateListingRequest) =>
    apiClient.post<{ id: number }>('/listings', data).then((r) => r.data),

  update: (id: number, data: Partial<CreateListingRequest>) =>
    apiClient.put(`/listings/${id}`, data),

  delete: (id: number) => apiClient.delete(`/listings/${id}`),

  uploadImages: (id: number, files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return apiClient.post(`/listings/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteImage: (listingId: number, imageId: number) =>
    apiClient.delete(`/listings/${listingId}/images/${imageId}`),

  getMyListings: () =>
    apiClient.get<CarListingDto[]>('/listings/my').then((r) => r.data),
};
