import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export function Header() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMenu = () => setMobileOpen(false);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-xl font-bold text-blue-600" onClick={closeMenu}>
            AutoMarket BG
          </Link>

          <nav className="hidden md:flex items-center gap-5">
            <NavLinks isAuthenticated={isAuthenticated} user={user} logout={logout} />
          </nav>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-gray-600 hover:text-gray-900"
            aria-label="Превключи менюто"
          >
            {mobileOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="md:hidden border-t border-gray-100 bg-white px-4 pb-4 pt-2 space-y-1">
          <MobileNavLinks
            isAuthenticated={isAuthenticated}
            user={user}
            logout={logout}
            onNavigate={closeMenu}
          />
        </nav>
      )}
    </header>
  );
}

interface NavLinksProps {
  isAuthenticated: boolean;
  user: { userName: string; roles?: string[] } | null;
  logout: () => void;
}

function NavLinks({ isAuthenticated, user, logout }: NavLinksProps) {
  const isAdmin = user?.roles?.includes('Admin');

  return (
    <>
      <Link to="/search" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
        Търсене
      </Link>
      <Link to="/analytics" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
        Анализи
      </Link>

      {isAuthenticated ? (
        <>
          <Link to="/favorites" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
            Любими
          </Link>
          {isAdmin && (
            <Link to="/admin" className="text-purple-600 hover:text-purple-800 transition-colors text-sm font-medium">
              Администратор
            </Link>
          )}
          <Link
            to="/listings/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            Публикувай обява
          </Link>
          <Link to="/profile" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
            {user?.userName}
          </Link>
          <button onClick={logout} className="text-gray-500 hover:text-gray-700 transition-colors text-sm">
            Изход
          </button>
        </>
      ) : (
        <>
          <Link to="/login" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
            Вход
          </Link>
          <Link
            to="/register"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            Регистрация
          </Link>
        </>
      )}
    </>
  );
}

interface MobileNavLinksProps extends NavLinksProps {
  onNavigate: () => void;
}

function MobileNavLinks({ isAuthenticated, user, logout, onNavigate }: MobileNavLinksProps) {
  const linkClass = 'block py-2.5 px-3 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium';
  const isAdmin = user?.roles?.includes('Admin');

  return (
    <>
      <Link to="/search" className={linkClass} onClick={onNavigate}>Търсене</Link>
      <Link to="/analytics" className={linkClass} onClick={onNavigate}>Анализи</Link>

      {isAuthenticated ? (
        <>
          <Link to="/favorites" className={linkClass} onClick={onNavigate}>Любими</Link>
          {isAdmin && (
            <Link
              to="/admin"
              className="block py-2.5 px-3 rounded-lg text-purple-600 hover:bg-purple-50 text-sm font-medium"
              onClick={onNavigate}
            >
              Администраторски панел
            </Link>
          )}
          <Link to="/profile" className={linkClass} onClick={onNavigate}>
            {user?.userName}
          </Link>
          <Link
            to="/listings/new"
            className="block py-2.5 px-3 rounded-lg bg-blue-600 text-white text-sm font-medium text-center hover:bg-blue-700"
            onClick={onNavigate}
          >
            Публикувай обява
          </Link>
          <button
            onClick={() => { logout(); onNavigate(); }}
            className="block w-full text-left py-2.5 px-3 rounded-lg text-red-600 hover:bg-red-50 text-sm font-medium"
          >
            Изход
          </button>
        </>
      ) : (
        <>
          <Link to="/login" className={linkClass} onClick={onNavigate}>Вход</Link>
          <Link
            to="/register"
            className="block py-2.5 px-3 rounded-lg bg-blue-600 text-white text-sm font-medium text-center hover:bg-blue-700"
            onClick={onNavigate}
          >
            Регистрация
          </Link>
        </>
      )}
    </>
  );
}
