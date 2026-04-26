import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  ChevronDown,
  Heart,
  LogOut,
  Menu,
  Plus,
  Search,
  Shield,
  User,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../utils/cn';

const NAV_LINKS = [
  { to: '/search', label: 'Търсене', icon: Search },
  { to: '/analytics', label: 'Анализи', icon: BarChart3 },
];

export function Header() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
    setAccountOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!accountOpen) return;
    const handler = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [accountOpen]);

  const isAdmin = user?.roles?.includes('Admin');

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur supports-[backdrop-filter]:bg-surface/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight text-fg">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-fg text-white text-sm font-bold">
            A
          </span>
          <span>AutoMarket BG</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'text-fg bg-surface-soft' : 'text-fg-muted hover:text-fg hover:bg-surface-soft',
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated ? (
            <>
              <Link
                to="/listings/new"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-fg hover:bg-primary-hover transition-colors"
              >
                <Plus className="h-4 w-4" /> Публикувай обява
              </Link>

              <NavLink
                to="/favorites"
                title="Любими"
                className={({ isActive }) =>
                  cn(
                    'inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                    isActive ? 'text-fg bg-surface-soft' : 'text-fg-muted hover:text-fg hover:bg-surface-soft',
                  )
                }
              >
                <Heart className="h-4 w-4" />
              </NavLink>

              <div ref={accountRef} className="relative">
                <button
                  onClick={() => setAccountOpen((s) => !s)}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-1.5 py-1 pr-2.5 text-sm text-fg hover:bg-surface-soft transition-colors"
                  aria-haspopup="menu"
                  aria-expanded={accountOpen}
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-soft text-primary text-xs font-semibold">
                    {user?.userName.charAt(0).toUpperCase()}
                  </span>
                  <span className="max-w-[8rem] truncate text-xs font-medium">{user?.userName}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-fg-muted" />
                </button>
                {accountOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-surface p-1 shadow-[var(--shadow-pop)]"
                  >
                    <MenuLink to="/profile" icon={<User className="h-4 w-4" />}>Моят профил</MenuLink>
                    <MenuLink to="/favorites" icon={<Heart className="h-4 w-4" />}>Любими</MenuLink>
                    {isAdmin && (
                      <MenuLink to="/admin" icon={<Shield className="h-4 w-4" />}>Администратор</MenuLink>
                    )}
                    <div className="my-1 border-t border-border" />
                    <button
                      onClick={() => logout()}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-danger-soft"
                    >
                      <LogOut className="h-4 w-4" /> Изход
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-fg-muted hover:text-fg hover:bg-surface-soft transition-colors"
              >
                Вход
              </Link>
              <Link
                to="/register"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-fg hover:bg-primary-hover transition-colors"
              >
                Регистрация
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setMobileOpen((s) => !s)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-fg-muted hover:bg-surface-soft md:hidden"
          aria-label="Превключи менюто"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <nav className="border-t border-border bg-surface px-4 pb-4 pt-2 md:hidden">
          <div className="space-y-1">
            {NAV_LINKS.map(({ to, label, icon: Icon }) => (
              <MobileLink key={to} to={to} icon={<Icon className="h-4 w-4" />}>
                {label}
              </MobileLink>
            ))}
            {isAuthenticated && (
              <>
                <MobileLink to="/favorites" icon={<Heart className="h-4 w-4" />}>Любими</MobileLink>
                <MobileLink to="/profile" icon={<User className="h-4 w-4" />}>{user?.userName}</MobileLink>
                {isAdmin && (
                  <MobileLink to="/admin" icon={<Shield className="h-4 w-4" />}>Администратор</MobileLink>
                )}
              </>
            )}
          </div>
          <div className="mt-3 grid gap-2 border-t border-border pt-3">
            {isAuthenticated ? (
              <>
                <Link
                  to="/listings/new"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-fg"
                >
                  <Plus className="h-4 w-4" /> Публикувай обява
                </Link>
                <button
                  onClick={() => logout()}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border text-sm font-medium text-danger hover:bg-danger-soft"
                >
                  <LogOut className="h-4 w-4" /> Изход
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-border text-sm font-medium text-fg"
                >
                  Вход
                </Link>
                <Link
                  to="/register"
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-fg"
                >
                  Регистрация
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

function MenuLink({ to, icon, children }: { to: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg hover:bg-surface-soft"
    >
      <span className="text-fg-muted">{icon}</span>
      {children}
    </Link>
  );
}

function MobileLink({ to, icon, children }: { to: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium',
          isActive ? 'bg-surface-soft text-fg' : 'text-fg-muted hover:bg-surface-soft hover:text-fg',
        )
      }
    >
      <span className="text-fg-muted">{icon}</span>
      {children}
    </NavLink>
  );
}
