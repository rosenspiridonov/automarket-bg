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

const CHART_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
];

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
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Пазарни анализи</h1>

      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard label="Общо обяви" value={overview.totalListings.toLocaleString()} />
          <StatCard label="Марки" value={String(overview.totalMakes)} />
          <StatCard label="Средна цена" value={formatPrice(overview.averagePrice)} />
          <StatCard label="Среден пробег" value={`${Math.round(overview.averageMileage).toLocaleString()} км`} />
          <StatCard label="Средна година" value={String(overview.averageYear)} />
          <StatCard label="Нови (7 дни)" value={String(overview.newListingsLast7Days)} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Средна цена по марка
          </h2>
          {pricesByMake.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={pricesByMake} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="makeName" width={70} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [formatPrice(value), 'Средна цена']}
                />
                <Bar dataKey="averagePrice" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              Няма налични данни
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Обяви по тип каросерия
          </h2>
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
                  label={({ bodyType, count }) => `${bodyType} (${count})`}
                >
                  {localizedBodyTypes.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              Няма налични данни
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Цена по година на производство
          </h2>
          <select
            value={selectedMakeId ?? ''}
            onChange={(e) => setSelectedMakeId(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Избери марка</option>
            {makes.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        {selectedMakeId && priceTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={priceTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === 'averagePrice')
                    return [formatPrice(value), 'Средна цена'];
                  return [value, 'Обяви'];
                }}
              />
              <Line
                type="monotone"
                dataKey="averagePrice"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400">
            {selectedMakeId ? 'Няма данни за тази марка' : 'Избери марка, за да видиш ценовите тенденции'}
          </div>
        )}
      </div>

      {pricesByMake.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Ценови диапазон по марка</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Марка</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Обяви</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Средна цена</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Мин.</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Макс.</th>
                </tr>
              </thead>
              <tbody>
                {pricesByMake.map((row) => (
                  <tr key={row.makeId} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{row.makeName}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{row.listingCount}</td>
                    <td className="py-3 px-4 text-right font-medium text-blue-600">
                      {formatPrice(row.averagePrice)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {formatPrice(row.minPrice)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {formatPrice(row.maxPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
    </div>
  );
}
