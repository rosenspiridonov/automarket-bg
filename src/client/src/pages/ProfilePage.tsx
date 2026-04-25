import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { listingsApi } from '../api/listings';
import { savedSearchesApi } from '../api/savedSearches';
import { CarCard } from '../components/car/CarCard';
import type { SavedSearchDto } from '../types/savedSearch';

type Tab = 'listings' | 'saved-searches';

export function ProfilePage() {
  const { user, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('listings');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: myListings = [], isLoading: loadingListings } = useQuery({
    queryKey: ['listings', 'my'],
    queryFn: listingsApi.getMyListings,
    enabled: isAuthenticated,
  });

  const { data: savedSearches = [], isLoading: loadingSaved } = useQuery({
    queryKey: ['saved-searches'],
    queryFn: savedSearchesApi.getAll,
    enabled: isAuthenticated && activeTab === 'saved-searches',
  });

  const deleteSavedSearch = useMutation({
    mutationFn: savedSearchesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
      toast.success('Търсенето е изтрито');
    },
  });

  if (!isAuthenticated || !user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Необходим е вход</h2>
        <p className="text-gray-600 mb-6">Трябва да си влязъл, за да видиш профила си.</p>
        <Link
          to="/login"
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Вход
        </Link>
      </div>
    );
  }

  const applySavedSearch = (search: SavedSearchDto) => {
    try {
      const filter = JSON.parse(search.filterJson);
      const params = new URLSearchParams();
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, String(value));
        }
      });
      navigate(`/search?${params.toString()}`);
    } catch {
      toast.error('Невалидни филтри за търсене');
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'listings', label: `Моите обяви (${myListings.length})` },
    { key: 'saved-searches', label: 'Запазени търсения' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xl font-bold">
            {user.userName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{user.userName}</h1>
            <p className="text-gray-500 text-sm">{user.email}</p>
            {user.firstName && user.lastName && (
              <p className="text-gray-600 text-sm">{user.firstName} {user.lastName}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <div className="ml-auto">
          <Link
            to="/listings/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + Нова обява
          </Link>
        </div>
      </div>

      {activeTab === 'listings' && (
        <>
          {loadingListings ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
                  <div className="h-44 bg-gray-200" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : myListings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myListings.map((listing) => (
                <CarCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
              <p className="text-lg text-gray-500 mb-2">Все още няма обяви</p>
              <p className="text-sm text-gray-400 mb-6">Започни да продаваш, като добавиш първата си кола.</p>
              <Link
                to="/listings/new"
                className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Публикувай обява
              </Link>
            </div>
          )}
        </>
      )}

      {activeTab === 'saved-searches' && (
        <>
          {loadingSaved ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-white rounded-xl p-4 border border-gray-100">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : savedSearches.length > 0 ? (
            <div className="space-y-3">
              {savedSearches.map((search) => (
                <div
                  key={search.id}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between"
                >
                  <div>
                    <h3 className="font-medium text-gray-900">{search.name}</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Запазено на {new Date(search.createdAt).toLocaleDateString('bg-BG')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => applySavedSearch(search)}
                      className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                    >
                      Приложи
                    </button>
                    <button
                      onClick={() => deleteSavedSearch.mutate(search.id)}
                      className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                    >
                      Изтрий
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
              <p className="text-lg text-gray-500 mb-2">Няма запазени търсения</p>
              <p className="text-sm text-gray-400 mb-6">
                Запази филтрите си от страницата за търсене, за да имаш бърз достъп до тях.
              </p>
              <Link
                to="/search"
                className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Търсене на обяви
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
