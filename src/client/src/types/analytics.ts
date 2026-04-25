export interface MarketOverview {
  totalListings: number;
  totalMakes: number;
  averagePrice: number;
  averageMileage: number;
  averageYear: number;
  newListingsLast7Days: number;
}

export interface PriceByMake {
  makeId: number;
  makeName: string;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  listingCount: number;
}

export interface PriceTrendPoint {
  year: number;
  averagePrice: number;
  listingCount: number;
}

export interface ListingCountByBodyType {
  bodyType: string;
  count: number;
}
