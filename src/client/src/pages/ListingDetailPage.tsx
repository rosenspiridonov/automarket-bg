import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { listingsApi } from '../api/listings';
import { favoritesApi } from '../api/favorites';
import { formatPrice, formatMileage, formatDate } from '../utils/format';
import { useAuthStore } from '../store/authStore';
import {
  FUEL_TYPE_LABELS,
  TRANSMISSION_LABELS,
  BODY_TYPE_LABELS,
  DRIVE_TYPE_LABELS,
  COLOR_LABELS,
  CONDITION_LABELS,
} from '../utils/constants';
import type { FairPriceAnalysis } from '../types/listing';

export function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeImage, setActiveImage] = useState(0);
  const [contactMessage, setContactMessage] = useState('');
  const [showPhone, setShowPhone] = useState(false);

  const { data: listing, isLoading, error } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => listingsApi.getById(Number(id)),
    enabled: !!id,
  });

  const { data: favoriteIds = [] } = useQuery({
    queryKey: ['favorite-ids'],
    queryFn: favoritesApi.getIds,
    enabled: isAuthenticated,
  });

  const toggleFavorite = useMutation({
    mutationFn: () => favoritesApi.toggle(Number(id)),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['favorite-ids'] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast.success(data.isFavorited ? 'Добавена в запазените' : 'Премахната от запазените');
    },
  });

  const isFavorited = favoriteIds.includes(Number(id));
  const isOwner = user?.id === listing?.sellerId;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-96 bg-gray-200 rounded-xl" />
          <div className="h-8 bg-gray-200 rounded w-2/3" />
          <div className="h-4 bg-gray-200 rounded w-1/3" />
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Обявата не е намерена</h2>
        <p className="text-gray-600 mb-6">Тази обява може да е премахната или да не съществува.</p>
        <Link to="/search" className="text-blue-600 hover:underline">
          Обратно към търсенето
        </Link>
      </div>
    );
  }

  const images = listing.images?.length > 0
    ? listing.images
    : listing.primaryImageUrl
      ? [{ id: 0, url: listing.primaryImageUrl, isPrimary: true, sortOrder: 0 }]
      : [];

  const featuresByCategory = (listing.features || []).reduce(
    (acc, f) => {
      if (!acc[f.category]) acc[f.category] = [];
      acc[f.category].push(f);
      return acc;
    },
    {} as Record<string, typeof listing.features>
  );

  const handleSendMessage = () => {
    if (!contactMessage.trim()) return;
    const subject = encodeURIComponent(`Относно: ${listing.title}`);
    const body = encodeURIComponent(contactMessage);
    window.open(`mailto:${listing.sellerEmail}?subject=${subject}&body=${body}`);
    toast.success('Отваряне на имейл клиент...');
    setContactMessage('');
  };

  const priceHistory = listing.priceHistory ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <Link to="/search" className="text-blue-600 hover:underline text-sm">
          &larr; Обратно към търсенето
        </Link>
        <div className="flex items-center gap-2">
          {isAuthenticated && !isOwner && (
            <button
              onClick={() => toggleFavorite.mutate()}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                isFavorited
                  ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg
                className={`w-4 h-4 ${isFavorited ? 'fill-red-500' : ''}`}
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                fill={isFavorited ? 'currentColor' : 'none'}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                />
              </svg>
              {isFavorited ? 'Запазено' : 'Запази'}
            </button>
          )}
          {isOwner && (
            <Link
              to={`/listings/${id}/edit`}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Редактирай обявата
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {images.length > 0 ? (
            <div className="space-y-3">
              <div className="aspect-[16/10] bg-gray-100 rounded-xl overflow-hidden">
                <img
                  src={images[activeImage]?.url}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {images.map((img, i) => (
                    <button
                      key={img.id}
                      onClick={() => setActiveImage(i)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                        i === activeImage ? 'border-blue-600' : 'border-transparent'
                      }`}
                    >
                      <img
                        src={img.url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-[16/10] bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
              Няма налични снимки
            </div>
          )}

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{listing.title}</h1>
            <p className="text-sm text-gray-500 mb-4">
              Публикувана на {formatDate(listing.createdAt)}
              {listing.city && <> &middot; {listing.city}</>}
            </p>

            <div className="text-3xl font-bold text-blue-600 mb-2">
              {formatPrice(listing.price)}
            </div>

            <div className="mb-6">
              <FairPriceBadge
                analysis={listing.fairPriceAnalysis}
                make={listing.makeName}
                model={listing.modelName}
                year={listing.year}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <SpecItem label="Марка" value={listing.makeName} />
              <SpecItem label="Модел" value={listing.modelName} />
              <SpecItem label="Година" value={String(listing.year)} />
              <SpecItem label="Пробег" value={formatMileage(listing.mileage)} />
              <SpecItem label="Гориво" value={FUEL_TYPE_LABELS[listing.fuelType] ?? listing.fuelType} />
              <SpecItem label="Скоростна кутия" value={TRANSMISSION_LABELS[listing.transmissionType] ?? listing.transmissionType} />
              <SpecItem label="Тип каросерия" value={BODY_TYPE_LABELS[listing.bodyType] ?? listing.bodyType} />
              <SpecItem label="Задвижване" value={DRIVE_TYPE_LABELS[listing.driveType] ?? listing.driveType} />
              <SpecItem label="Цвят" value={COLOR_LABELS[listing.color] ?? listing.color} />
              <SpecItem label="Състояние" value={CONDITION_LABELS[listing.condition] ?? listing.condition} />
              {listing.horsePower && (
                <SpecItem label="Мощност" value={`${listing.horsePower} к.с.`} />
              )}
              {listing.engineDisplacementCc && (
                <SpecItem label="Двигател" value={`${listing.engineDisplacementCc} куб.см`} />
              )}
              {listing.vinNumber && (
                <SpecItem label="VIN" value={listing.vinNumber} />
              )}
            </div>
          </div>

          {priceHistory.length > 0 && (
            <PriceHistoryCard history={priceHistory} />
          )}

          {listing.description && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Описание</h2>
              <p className="text-gray-700 whitespace-pre-line">{listing.description}</p>
            </div>
          )}

          {Object.keys(featuresByCategory).length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Екстри</h2>
              {Object.entries(featuresByCategory).map(([category, items]) => (
                <div key={category} className="mb-4 last:mb-0">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">{category}</h3>
                  <div className="flex flex-wrap gap-2">
                    {items.map((f) => (
                      <span
                        key={f.id}
                        className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm"
                      >
                        {f.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 sticky top-24">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Продавач</h2>
            <div className="space-y-3">
              <div>
                <p className="font-medium text-gray-900">{listing.sellerName}</p>
                {listing.sellerCity && (
                  <p className="text-sm text-gray-500">{listing.sellerCity}</p>
                )}
                {listing.sellerMemberSince && (
                  <p className="text-xs text-gray-400 mt-1">
                    Член от {formatDate(listing.sellerMemberSince)}
                  </p>
                )}
              </div>

              {listing.sellerPhone && (
                showPhone ? (
                  <a
                    href={`tel:${listing.sellerPhone}`}
                    className="block w-full bg-green-600 text-white text-center py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    {listing.sellerPhone}
                  </a>
                ) : (
                  <button
                    onClick={() => setShowPhone(true)}
                    className="block w-full bg-green-600 text-white text-center py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    Покажи телефон
                  </button>
                )
              )}

              {listing.sellerEmail && !isOwner && (
                <div className="pt-3 border-t border-gray-100">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Свържи се с продавача</h3>
                  <textarea
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    rows={3}
                    placeholder={`Здравейте, интересувам се от вашия ${listing.makeName} ${listing.modelName}...`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none mb-2"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!contactMessage.trim()}
                    className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    Изпрати съобщение
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SpecItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm font-medium text-gray-900 mt-0.5">{value}</dd>
    </div>
  );
}

function FairPriceBadge({
  analysis,
  make,
  model,
  year,
}: {
  analysis: FairPriceAnalysis | null;
  make: string;
  model: string;
  year: number;
}) {
  if (!analysis) {
    return (
      <span className="text-xs text-gray-500">Недостатъчно данни за сравнение</span>
    );
  }

  const tooltip = `Сравнено с ${analysis.sampleSize} активни обяви за ${make} ${model} (${year - 2}-${year + 2})`;
  const absPct = Math.abs(analysis.percentDifference).toFixed(0);
  const baseClass = 'rounded-full px-3 py-1 text-sm font-medium inline-flex items-center gap-1 border';

  if (analysis.position === 'below') {
    return (
      <div className="flex flex-col gap-1">
        <span title={tooltip} className={`${baseClass} bg-green-100 text-green-800 border-green-200`}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v9.586l3.293-3.293a1 1 0 111.414 1.414l-5 5a1 1 0 01-1.414 0l-5-5a1 1 0 111.414-1.414L9 13.586V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          {absPct}% под пазарната цена
        </span>
        <span className="text-xs text-gray-500">спрямо {analysis.sampleSize} обяви</span>
      </div>
    );
  }

  if (analysis.position === 'above') {
    return (
      <div className="flex flex-col gap-1">
        <span title={tooltip} className={`${baseClass} bg-amber-100 text-amber-800 border-amber-200`}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M10 17a1 1 0 01-1-1V6.414L5.707 9.707a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0l5 5a1 1 0 01-1.414 1.414L11 6.414V16a1 1 0 01-1 1z" clipRule="evenodd" />
          </svg>
          {absPct}% над пазарната цена
        </span>
        <span className="text-xs text-gray-500">спрямо {analysis.sampleSize} обяви</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <span title={tooltip} className={`${baseClass} bg-gray-100 text-gray-700 border-gray-200`}>
        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M3 7a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 6a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
        На пазарната цена
      </span>
      <span className="text-xs text-gray-500">спрямо {analysis.sampleSize} обяви</span>
    </div>
  );
}

function PriceHistoryCard({ history }: { history: { price: number; recordedAt: string }[] }) {
  if (history.length === 1) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Ценова история</h2>
        <p className="text-sm text-gray-500">
          Без промени в цената &middot; {formatDate(history[0].recordedAt)}
        </p>
      </div>
    );
  }

  const first = history[0].price;
  const last = history[history.length - 1].price;
  const diff = last - first;
  const pct = Math.abs((diff / first) * 100).toFixed(1);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Ценова история</h2>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart
          data={history.map((p) => ({
            date: new Date(p.recordedAt).toLocaleDateString('bg-BG', { month: 'short', day: 'numeric' }),
            price: p.price,
          }))}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value: number) => [formatPrice(value), 'Цена']} />
          <Line type="stepAfter" dataKey="price" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span className={diff < 0 ? 'text-green-600 font-medium' : diff > 0 ? 'text-red-600 font-medium' : ''}>
          {diff < 0
            ? `Цената спадна с ${pct}%`
            : diff > 0
              ? `Цената се повиши с ${pct}%`
              : 'Без промени в цената'}
        </span>
        <span>
          {history.length} промени в цената (текуща {formatPrice(last)}, първоначална {formatPrice(first)})
        </span>
      </div>
    </div>
  );
}
