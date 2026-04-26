import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 font-semibold text-fg">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-fg text-white text-sm font-bold">
                A
              </span>
              AutoMarket BG
            </div>
            <p className="mt-3 text-sm text-fg-muted max-w-xs">
              Минималистичният онлайн пазар за коли в България. Купувай и продавай с увереност.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">Разглеждане</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><FooterLink to="/search">Търсене на коли</FooterLink></li>
              <li><FooterLink to="/analytics">Пазарни анализи</FooterLink></li>
              <li><FooterLink to="/listings/new">Публикувай обява</FooterLink></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">Профил</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><FooterLink to="/login">Вход</FooterLink></li>
              <li><FooterLink to="/register">Създай профил</FooterLink></li>
              <li><FooterLink to="/favorites">Любими</FooterLink></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-border pt-6 text-xs text-fg-subtle sm:flex-row">
          <span>&copy; {new Date().getFullYear()} AutoMarket BG. Всички права запазени.</span>
          <span>Изграден с грижа за купувачи и продавачи в България.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="text-fg-muted hover:text-fg transition-colors">
      {children}
    </Link>
  );
}
