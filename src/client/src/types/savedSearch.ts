export interface SavedSearchDto {
  id: number;
  name: string;
  filterJson: string;
  createdAt: string;
}

export interface CreateSavedSearchRequest {
  name: string;
  filterJson: string;
}
