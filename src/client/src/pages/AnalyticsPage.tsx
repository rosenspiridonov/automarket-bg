import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { analyticsApi } from '../api/analytics';
import { makesApi } from '../api/makes';
import { formatPrice } from '../utils/format';
import { BODY_TYPE_LABELS } from '../utils/constants';
import { Container, PageHeader, Select } from '../components/ui';

const CHART_COLORS = [
  'var(--color-primary)',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
  '#14b8a6',
  '#6366f1',
];

const PRIMARY = 'var(--color-primary)';

export function AnalyticsPage() {
  const [selectedMakeId, setSelectedMakeId] = useState<number | null>(null);

  const { data: overview } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: analyticsApi.overview,
  });

  const { data: pricesByMake = [] } = useQuery({
    queryKey: ['analytics', 'prices-by-make'],
    queryFn: () => analyticsApi.pricesByMake(15),
  });

  const { data: bodyTypes = [] } = useQuery({
    queryKey: ['analytics', 'body-types'],
    queryFn: analyticsApi.bodyTypes,
  });

  const { data: makes = [] } = useQuery({
    queryKey: ['makes'],
    queryFn: makesApi.getAll,
  });

  const { data: priceTrend = [] } = useQuery({
    queryKey: ['analytics', 'price-trend', selectedMakeId],
    queryFn: () => analyticsApi.priceTrend(selectedMakeId!),
    enabled: !!selectedMakeId,
  });

  const localizedBodyTypes = bodyTypes.map((b) => ({
    ...b,
    bodyType: BODY_TYPE_LABELS[b.bodyType] ?? b.bodyType,
  }));

  return (
    <Container className="py-8">
      <PageHeader
        title="Пазарни анализи"
        description="Преглед на цените, обемите и тенденциите в обявите."
      />

      {overview && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Общо обяви" value={overview.totalListings.toLocaleString()} />
          <StatCard label="Марки" value={String(overview.totalMakes)} />
          <StatCard label="Средна цена" value={formatPrice(overview.averagePrice)} />
          <StatCard label="Среден пробег" value={`${Math.round(overview.averageMileage).toLocaleString()} км`} />
          <StatCard label="Средна година" value={String(overview.averageYear)} />
          <StatCard label="Нови (7 дни)" value={String(overview.newListingsLast7Days)} />
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Средна цена по марка">
          {pricesByMake.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={pricesByMake} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} stroke="var(--color-fg-muted)" />
                <YAxis type="category" dataKey="makeName" width={70} tick={{ fontSize: 12, fill: 'var(--color-fg)' }} stroke="var(--color-fg-muted)" />
                <Tooltip
                  formatter={(value) => [formatPrice(Number(value)), 'Средна цена']}
                  contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12 }}
                />
                <Bar dataKey="averagePrice" fill={PRIMARY} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard title="Обяви по тип каросерия">
          {localizedBodyTypes.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={localizedBodyTypes}
                  dataKey="count"
                  nameKey="bodyType"
                  cx="50%"
                  cy="50%"
                  outerRadius={140}
                  label={((entry: unknown) => {
                    const e = entry as { bodyType?: string; count?: number };
                    return `${e.bodyType} (${e.count})`;
                  }) as never}
                >
                  {localizedBodyTypes.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>
      </div>

      <ChartCard
        className="mb-6"
        title="Цена по година на производство"
        action={
          <Select
            value={selectedMakeId ?? ''}
            onChange={(e) => setSelectedMakeId(e.target.value ? Number(e.target.value) : null)}
            className="w-full sm:w-56"
          >
            <option value="">Избери марка</option>
            {makes.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </Select>
        }
      >
        {selectedMakeId && priceTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={priceTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="year" stroke="var(--color-fg-muted)" />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} stroke="var(--color-fg-muted)" />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'averagePrice') return [formatPrice(Number(value)), 'Средна цена'];
                  return [String(value), 'Обяви'];
                }}
                contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12 }}
              />
              <Line
                type="monotone"
                dataKey="averagePrice"
                stroke={PRIMARY}
                strokeWidth={2}
                dot={{ fill: PRIMARY, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-64 items-center justify-center text-sm text-fg-subtle">
            {selectedMakeId ? 'Няма данни за тази марка' : 'Избери марка, за да видиш ценовите тенденции'}
          </div>
        )}
      </ChartCard>

      {pricesByMake.length > 0 && (
        <ChartCard title="Ценови диапазон по марка">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-fg-muted">
                  <th className="px-4 py-3 text-left font-medium">Марка</th>
                  <th className="px-4 py-3 text-right font-medium">Обяви</th>
                  <th className="px-4 py-3 text-right font-medium">Средна цена</th>
                  <th className="px-4 py-3 text-right font-medium">Мин.</th>
                  <th className="px-4 py-3 text-right font-medium">Макс.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {pricesByMake.map((row) => (
                  <tr key={row.makeId} className="transition-colors hover:bg-surface-soft">
                    <td className="px-4 py-3 font-medium text-fg">{row.makeName}</td>
                    <td className="px-4 py-3 text-right text-fg-muted">{row.listingCount}</td>
                    <td className="px-4 py-3 text-right font-semibold text-primary">
                      {formatPrice(row.averagePrice)}
                    </td>
                    <td className="px-4 py-3 text-right text-fg-muted">{formatPrice(row.minPrice)}</td>
                    <td className="px-4 py-3 text-right text-fg-muted">{formatPrice(row.maxPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}
    </Container>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-shell p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">{label}</p>
      <p className="mt-1 text-lg font-semibold text-fg">{value}</p>
    </div>
  );
}

function ChartCard({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`card-shell p-6 ${className ?? ''}`}>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-fg">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-64 items-center justify-center text-sm text-fg-subtle">
      Няма налични данни
    </div>
  );
}
