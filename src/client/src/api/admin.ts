import apiClient from './client';
import type { ScraperJob, ScraperStatus, AdminDashboard } from '../types/admin';

export const adminApi = {
  getDashboard: () =>
    apiClient.get<AdminDashboard>('/admin/dashboard').then(r => r.data),

  getScraperStatus: () =>
    apiClient.get<ScraperStatus>('/admin/scraper/status').then(r => r.data),

  startScraper: (maxPages: number) =>
    apiClient.post<ScraperJob>('/admin/scraper/start', { maxPages }).then(r => r.data),

  cancelScraper: () =>
    apiClient.post<{ cancelled: boolean }>('/admin/scraper/cancel').then(r => r.data),

  deleteListing: (id: number) =>
    apiClient.delete(`/admin/listings/${id}`),

  deleteAllScrapedListings: () =>
    apiClient.delete<{ deleted: number }>('/admin/listings/scraped').then(r => r.data),
};
