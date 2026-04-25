import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-white font-bold text-lg mb-3">AutoMarket BG</h3>
            <p className="text-sm">
              Модерният онлайн пазар за коли в България.
              Купувай и продавай с увереност.
            </p>
          </div>
          <div>
            <h4 className="text-white font-medium mb-3">Бързи връзки</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/search" className="hover:text-white transition-colors">Търсене на коли</Link></li>
              <li><Link to="/listings/new" className="hover:text-white transition-colors">Публикувай обява</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-medium mb-3">Профил</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/login" className="hover:text-white transition-colors">Вход</Link></li>
              <li><Link to="/register" className="hover:text-white transition-colors">Създай профил</Link></li>
              <li><Link to="/profile" className="hover:text-white transition-colors">Моят профил</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-6 text-center text-xs">
          &copy; {new Date().getFullYear()} AutoMarket BG. Всички права запазени.
        </div>
      </div>
    </footer>
  );
}
