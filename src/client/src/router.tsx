import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { RouteErrorBoundary } from './components/RouteErrorBoundary';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { SearchPage } from './pages/SearchPage';
import { ListingDetailPage } from './pages/ListingDetailPage';
import { CreateListingPage } from './pages/CreateListingPage';
import { EditListingPage } from './pages/EditListingPage';
import { ProfilePage } from './pages/ProfilePage';
import { FavoritesPage } from './pages/FavoritesPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AdminPage } from './pages/AdminPage';

export const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: '/', element: <HomePage />, errorElement: <RouteErrorBoundary /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/search', element: <SearchPage />, errorElement: <RouteErrorBoundary /> },
      { path: '/listings/new', element: <CreateListingPage /> },
      { path: '/listings/:id', element: <ListingDetailPage />, errorElement: <RouteErrorBoundary /> },
      { path: '/listings/:id/edit', element: <EditListingPage />, errorElement: <RouteErrorBoundary /> },
      { path: '/profile', element: <ProfilePage />, errorElement: <RouteErrorBoundary /> },
      { path: '/favorites', element: <FavoritesPage />, errorElement: <RouteErrorBoundary /> },
      { path: '/analytics', element: <AnalyticsPage />, errorElement: <RouteErrorBoundary /> },
      { path: '/admin', element: <AdminPage />, errorElement: <RouteErrorBoundary /> },
    ],
  },
]);
