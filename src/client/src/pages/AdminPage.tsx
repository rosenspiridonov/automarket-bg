import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Activity, Database, Pause, Play, Trash2 } from 'lucide-react';
import { adminApi } from '../api/admin';
import { useAuthStore } from '../store/authStore';
import { Badge, Button, Container, Input, PageHeader, Skeleton } from '../components/ui';
import type { ScraperJob } from '../types/admin';

const STATUS_LABELS: Record<ScraperJob['status'], string> = {
  Running: 'В процес',
  Completed: 'Завършена',
  Failed: 'Неуспешна',
  Cancelled: 'Отказана',
};

const STATUS_TONES: Record<ScraperJob['status'], 'primary' | 'success' | 'danger' | 'subtle'> = {
  Running: 'primary',
  Completed: 'success',
  Failed: 'danger',
  Cancelled: 'subtle',
};

export function AdminPage() {
  const { user, isAuthenticated } = useAuthStore();
  const isAdmin = isAuthenticated && user?.roles?.includes('Admin');

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <Container className="py-8">
      <PageHeader
        title="Администраторски панел"
        description="Преглед на пазара и управление на скрейпъра."
      />
      <div className="grid gap-6">
        <DashboardSection />
        <ScraperSection />
      </div>
    </Container>
  );
}

function DashboardSection() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: adminApi.getDashboard,
  });

  if (isLoading) {
    return (
      <section className="card-shell p-6">
        <Skeleton className="mb-4 h-5 w-32" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (!dashboard) return null;

  const stats: { label: string; value: number; tone: 'primary' | 'success' | 'warning' | 'subtle' | 'neutral' }[] = [
    { label: 'Общо обяви', value: dashboard.totalListings, tone: 'primary' },
    { label: 'Активни', value: dashboard.activeListings, tone: 'success' },
    { label: 'Извлечени', value: dashboard.scrapedListings, tone: 'subtle' },
    { label: 'От потребители', value: dashboard.userListings, tone: 'warning' },
    { label: 'Потребители', value: dashboard.totalUsers, tone: 'neutral' },
  ];

  const toneClass = {
    primary: 'bg-primary-soft text-primary',
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
    subtle: 'bg-surface-soft text-fg-muted',
    neutral: 'bg-surface-soft text-fg',
  } as const;

  return (
    <section className="card-shell p-6">
      <header className="mb-5 flex items-center gap-2">
        <Activity className="h-4 w-4 text-fg-muted" />
        <h2 className="text-base font-semibold text-fg">Табло</h2>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className={`rounded-xl p-4 ${toneClass[stat.tone]}`}>
            <p className="text-2xl font-semibold leading-none">{stat.value.toLocaleString()}</p>
            <p className="mt-2 text-xs font-medium opacity-80">{stat.label}</p>
          </div>
        ))}
      </div>

      {dashboard.listingsBySource.length > 0 && (
        <div className="mt-5 border-t border-border pt-5">
          <h3 className="mb-2 text-sm font-medium text-fg-muted">Обяви по източник</h3>
          <div className="flex flex-wrap gap-2">
            {dashboard.listingsBySource.map((s) => (
              <Badge key={s.source} tone="neutral" size="md">
                {s.source}
                <span className="font-semibold">{s.count}</span>
              </Badge>
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
    refetchInterval: (query) => (query.state.data?.isRunning ? 3000 : false),
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
    <section className="card-shell p-6">
      <header className="mb-5 flex items-center gap-2">
        <Database className="h-4 w-4 text-fg-muted" />
        <h2 className="text-base font-semibold text-fg">Скрейпър</h2>
      </header>

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-fg">
            Максимум страници на източник
          </label>
          <Input
            type="number"
            min={1}
            max={50}
            value={maxPages}
            onChange={(e) => setMaxPages(Number(e.target.value))}
            disabled={status?.isRunning}
            className="w-28"
          />
        </div>

        {status?.isRunning ? (
          <Button
            onClick={() => cancelMutation.mutate()}
            loading={cancelMutation.isPending}
            variant="danger"
            leadingIcon={<Pause className="h-4 w-4" />}
          >
            Откажи извличането
          </Button>
        ) : (
          <Button
            onClick={() => startMutation.mutate()}
            loading={startMutation.isPending}
            variant="primary"
            leadingIcon={<Play className="h-4 w-4" />}
          >
            Стартирай извличането
          </Button>
        )}

        <Button
          variant="ghost"
          onClick={() => {
            if (window.confirm('Изтриване на всички извлечени обяви? Действието е необратимо.'))
              deleteScrapedMutation.mutate();
          }}
          disabled={status?.isRunning || deleteScrapedMutation.isPending}
          leadingIcon={<Trash2 className="h-4 w-4" />}
          className="text-danger hover:bg-danger-soft"
        >
          Изтрий всички извлечени
        </Button>
      </div>

      {status?.isRunning && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary-soft p-4">
          <span className="relative inline-flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          </span>
          <span className="text-sm font-medium text-primary">
            Извличането тече (задача {status.activeJob?.id})...
          </span>
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-32 rounded-xl" />
      ) : (
        <JobHistory jobs={status?.recentJobs || []} />
      )}
    </section>
  );
}

function JobHistory({ jobs }: { jobs: ScraperJob[] }) {
  if (jobs.length === 0) {
    return <p className="text-sm text-fg-subtle">Все още няма задачи за извличане.</p>;
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-fg-muted">Последни задачи</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-fg-muted">
              <th className="pb-2.5 pr-4 font-medium">ID</th>
              <th className="pb-2.5 pr-4 font-medium">Статус</th>
              <th className="pb-2.5 pr-4 font-medium">Страници</th>
              <th className="pb-2.5 pr-4 font-medium">Започната</th>
              <th className="pb-2.5 pr-4 font-medium">Времетраене</th>
              <th className="pb-2.5 font-medium">Грешка</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {jobs.map((job) => (
              <tr key={job.id}>
                <td className="py-3 pr-4 font-mono text-xs text-fg-muted">{job.id}</td>
                <td className="py-3 pr-4">
                  <Badge tone={STATUS_TONES[job.status]}>{STATUS_LABELS[job.status] ?? job.status}</Badge>
                </td>
                <td className="py-3 pr-4 text-fg">{job.maxPages}</td>
                <td className="py-3 pr-4 text-fg-muted">
                  {new Date(job.startedAt).toLocaleString('bg-BG')}
                </td>
                <td className="py-3 pr-4 text-fg-muted">
                  {job.completedAt
                    ? formatDuration(
                        new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime(),
                      )
                    : '...'}
                </td>
                <td className="max-w-xs truncate py-3 text-xs text-danger">{job.error || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}с`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}м ${remainingSeconds}с`;
}
