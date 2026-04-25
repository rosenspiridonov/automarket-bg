import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { listingsApi } from '../api/listings';
import { makesApi } from '../api/makes';
import { CarCard } from '../components/car/CarCard';

export function HomePage() {
  const navigate = useNavigate();
  const [selectedMakeId, setSelectedMakeId] = useState('');

  const { data: makes = [] } = useQuery({
    queryKey: ['makes'],
    queryFn: makesApi.getAll,
  });

  const { data: featured = [], isLoading: featuredLoading } = useQuery({
    queryKey: ['listings', 'featured'],
    queryFn: () => listingsApi.featured(8),
  });

  const handleQuickSearch = () => {
    const params = new URLSearchParams();
    if (selectedMakeId) params.set('makeId', selectedMakeId);
    navigate(`/search?${params.toString()}`);
  };

  return (
    <div>
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">
            Намери своята перфектна кола
          </h1>
          <p className="text-lg text-blue-100 mb-10 max-w-2xl mx-auto">
            Разгледай хиляди обяви от доверени продавачи в България
          </p>

          <div className="max-w-2xl mx-auto bg-white rounded-xl p-4 shadow-lg">
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={selectedMakeId}
                onChange={(e) => setSelectedMakeId(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Всички марки</option>
                {makes.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <button
                onClick={handleQuickSearch}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Търсене
              </button>
            </div>
          </div>
        </div>
      </section>

      {(featuredLoading || featured.length > 0) && (
        <section className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Последни обяви</h2>
            <Link
              to="/search"
              className="text-blue-600 hover:underline text-sm font-medium"
            >
              Виж всички
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-pulse"
                  >
                    <div className="h-40 bg-gray-200" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-4 bg-gray-200 rounded w-1/2" />
                      <div className="h-6 bg-gray-200 rounded w-1/3 mt-3" />
                    </div>
                  </div>
                ))
              : featured.map((listing) => (
                  <CarCard key={listing.id} listing={listing} />
                ))}
          </div>
        </section>
      )}

      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Популярни марки
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-3">
          {makes.slice(0, 12).map((make) => (
            <Link
              key={make.id}
              to={`/search?makeId=${make.id}`}
              className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all text-center"
            >
              <span className="font-medium text-gray-900 text-sm">{make.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Защо AutoMarket BG?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Умно търсене</h3>
              <p className="text-gray-600 text-sm">
                Разширени филтри по марка, модел, година, ценови диапазон, тип гориво и още.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Пазарни анализи</h3>
              <p className="text-gray-600 text-sm">
                Анализи на цените и тенденции, които ти помагат да вземеш информирано решение.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Модерно изживяване</h3>
              <p className="text-gray-600 text-sm">
                Чист, бърз и адаптивен интерфейс, създаден за съвременните купувачи.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
