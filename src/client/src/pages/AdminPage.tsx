import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminApi } from '../api/admin';
import { useAuthStore } from '../store/authStore';
import { Navigate } from 'react-router-dom';
import type { ScraperJob } from '../types/admin';

const STATUS_LABELS: Record<ScraperJob['status'], string> = {
  Running: 'В процес',
  Completed: 'Завършена',
  Failed: 'Неуспешна',
  Cancelled: 'Отказана',
};

export function AdminPage() {
  const { user, isAuthenticated } = useAuthStore();
  const isAdmin = isAuthenticated && user?.roles?.includes('Admin');

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Администраторски панел</h1>
      <div className="grid gap-8">
        <DashboardSection />
        <ScraperSection />
      </div>
    </div>
  );
}

function DashboardSection() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: adminApi.getDashboard,
  });

  if (isLoading) {
    return <div className="animate-pulse bg-white rounded-xl h-40 shadow-sm" />;
  }

  if (!dashboard) return null;

  const stats = [
    { label: 'Общо обяви', value: dashboard.totalListings, color: 'bg-blue-50 text-blue-700' },
    { label: 'Активни', value: dashboard.activeListings, color: 'bg-green-50 text-green-700' },
    { label: 'Извлечени', value: dashboard.scrapedListings, color: 'bg-purple-50 text-purple-700' },
    { label: 'От потребители', value: dashboard.userListings, color: 'bg-amber-50 text-amber-700' },
    { label: 'Общо потребители', value: dashboard.totalUsers, color: 'bg-gray-50 text-gray-700' },
  ];

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Табло</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className={`rounded-lg p-4 ${stat.color}`}>
            <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
            <p className="text-sm opacity-75">{stat.label}</p>
          </div>
        ))}
      </div>

      {dashboard.listingsBySource.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Обяви по източник</h3>
          <div className="flex flex-wrap gap-3">
            {dashboard.listingsBySource.map((s) => (
              <span
                key={s.source}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-sm text-gray-700"
              >
                {s.source}
                <span className="font-semibold">{s.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ScraperSection() {
  const queryClient = useQueryClient();
  const [maxPages, setMaxPages] = useState(5);

  const { data: status, isLoading } = useQuery({
    queryKey: ['admin', 'scraper-status'],
    queryFn: adminApi.getScraperStatus,
    refetchInterval: (query) => {
      return query.state.data?.isRunning ? 3000 : false;
    },
  });

  const startMutation = useMutation({
    mutationFn: () => adminApi.startScraper(maxPages),
    onSuccess: () => {
      toast.success('Скрейпърът е стартиран');
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Неуспешно стартиране на скрейпъра');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: adminApi.cancelScraper,
    onSuccess: () => {
      toast.success('Заявено е отказване');
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  const deleteScrapedMutation = useMutation({
    mutationFn: adminApi.deleteAllScrapedListings,
    onSuccess: (data) => {
      toast.success(`Изтрити са ${data.deleted} извлечени обяви`);
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Скрейпър</h2>

      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Максимум страници на източник
          </label>
          <input
            type="number"
            min={1}
            max={50}
            value={maxPages}
            onChange={(e) => setMaxPages(Number(e.target.value))}
            className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={status?.isRunning}
          />
        </div>

        {status?.isRunning ? (
          <button
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            Откажи извличането
          </button>
        ) : (
          <button
            onClick={() => startMutation.mutate()}
            disabled={startMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Стартирай извличането
          </button>
        )}

        <button
          onClick={() => {
            if (window.confirm('Изтриване на всички извлечени обяви? Действието е необратимо.'))
              deleteScrapedMutation.mutate();
          }}
          disabled={status?.isRunning || deleteScrapedMutation.isPending}
          className="px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          Изтрий всички извлечени
        </button>
      </div>

      {status?.isRunning && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
          <div className="h-3 w-3 bg-blue-600 rounded-full animate-pulse" />
          <span className="text-sm text-blue-700 font-medium">
            Извличането тече (задача {status.activeJob?.id})...
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse bg-gray-50 rounded-lg h-32" />
      ) : (
        <JobHistory jobs={status?.recentJobs || []} />
      )}
    </section>
  );
}

function JobHistory({ jobs }: { jobs: ScraperJob[] }) {
  if (jobs.length === 0) {
    return <p className="text-sm text-gray-500">Все още няма задачи за извличане.</p>;
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-600 mb-3">Последни задачи</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="pb-2 pr-4 font-medium">ID</th>
              <th className="pb-2 pr-4 font-medium">Статус</th>
              <th className="pb-2 pr-4 font-medium">Страници</th>
              <th className="pb-2 pr-4 font-medium">Започната</th>
              <th className="pb-2 pr-4 font-medium">Времетраене</th>
              <th className="pb-2 font-medium">Грешка</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {jobs.map((job) => (
              <tr key={job.id}>
                <td className="py-2.5 pr-4 font-mono text-xs text-gray-600">{job.id}</td>
                <td className="py-2.5 pr-4">
                  <StatusBadge status={job.status} />
                </td>
                <td className="py-2.5 pr-4 text-gray-700">{job.maxPages}</td>
                <td className="py-2.5 pr-4 text-gray-600">
                  {new Date(job.startedAt).toLocaleString('bg-BG')}
                </td>
                <td className="py-2.5 pr-4 text-gray-600">
                  {job.completedAt
                    ? formatDuration(
                        new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()
                      )
                    : '...'}
                </td>
                <td className="py-2.5 text-red-600 text-xs max-w-xs truncate">
                  {job.error || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ScraperJob['status'] }) {
  const styles = {
    Running: 'bg-blue-100 text-blue-700',
    Completed: 'bg-green-100 text-green-700',
    Failed: 'bg-red-100 text-red-700',
    Cancelled: 'bg-gray-100 text-gray-600',
  };

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}с`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}м ${remainingSeconds}с`;
}
