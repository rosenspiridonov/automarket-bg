export interface ScraperJob {
  id: string;
  startedAt: string;
  completedAt: string | null;
  maxPages: number;
  status: 'Running' | 'Completed' | 'Failed' | 'Cancelled';
  error: string | null;
}

export interface ScraperStatus {
  isRunning: boolean;
  activeJob: ScraperJob | null;
  recentJobs: ScraperJob[];
}

export interface AdminDashboard {
  totalListings: number;
  activeListings: number;
  scrapedListings: number;
  userListings: number;
  totalUsers: number;
  listingsBySource: { source: string; count: number }[];
}
