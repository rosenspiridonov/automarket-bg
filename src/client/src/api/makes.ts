import apiClient from './client';

export interface MakeDto {
  id: number;
  name: string;
  logoUrl: string | null;
}

export interface ModelDto {
  id: number;
  name: string;
}

export const makesApi = {
  getAll: () =>
    apiClient.get<MakeDto[]>('/makes').then((r) => r.data),

  getModels: (makeId: number) =>
    apiClient.get<ModelDto[]>(`/makes/${makeId}/models`).then((r) => r.data),
};
