export interface CarListingDto {
  id: number;
  title: string;
  description: string | null;
  makeId: number;
  makeName: string;
  modelId: number;
  modelName: string;
  year: number;
  price: number;
  mileage: number;
  fuelType: string;
  transmissionType: string;
  bodyType: string;
  driveType: string;
  engineDisplacementCc: number | null;
  horsePower: number | null;
  color: string;
  condition: string;
  status: string;
  city: string | null;
  region: string | null;
  primaryImageUrl: string | null;
  imageCount: number;
  sellerId: string;
  createdAt: string;
}

export interface CarImageDto {
  id: number;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface CarFeatureDto {
  id: number;
  name: string;
  category: string;
}

export interface PriceHistoryPoint {
  price: number;
  recordedAt: string;
}

export interface FairPriceAnalysis {
  marketAveragePrice: number;
  percentDifference: number;
  position: 'below' | 'average' | 'above';
  sampleSize: number;
}

export interface CarListingDetailDto extends CarListingDto {
  vinNumber: string | null;
  images: CarImageDto[];
  features: CarFeatureDto[];
  priceHistory: PriceHistoryPoint[];
  fairPriceAnalysis: FairPriceAnalysis | null;
  sellerName: string;
  sellerPhone: string | null;
  sellerEmail: string | null;
  sellerCity: string | null;
  sellerMemberSince: string | null;
  externalSourceUrl: string | null;
  externalSource: string | null;
}

export interface SearchFilter {
  makeId?: number;
  modelId?: number;
  yearFrom?: number;
  yearTo?: number;
  priceFrom?: number;
  priceTo?: number;
  fuelType?: string;
  transmissionType?: string;
  bodyType?: string;
  query?: string;
  sortBy?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateListingRequest {
  title: string;
  description?: string;
  makeId: number;
  modelId: number;
  year: number;
  price: number;
  mileage: number;
  fuelType: string;
  transmissionType: string;
  bodyType: string;
  driveType: string;
  engineDisplacementCc?: number;
  horsePower?: number;
  color: string;
  condition: string;
  city?: string;
  region?: string;
  featureIds: number[];
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}
