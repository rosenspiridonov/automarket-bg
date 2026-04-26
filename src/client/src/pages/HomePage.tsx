import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ArrowRight, BarChart3, Heart, Search, ShieldCheck } from 'lucide-react';
import { listingsApi } from '../api/listings';
import { makesApi } from '../api/makes';
import { CarCard } from '../components/car/CarCard';
import { Container, Select, CarCardSkeleton } from '../components/ui';

export function HomePage() {
  const navigate = useNavigate();
  const [selectedMakeId, setSelectedMakeId] = useState('');
  const [keyword, setKeyword] = useState('');

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
    if (keyword.trim()) params.set('query', keyword.trim());
    navigate(`/search?${params.toString()}`);
  };

  return (
    <div>
      <section className="relative overflow-hidden border-b border-border bg-surface">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_40%_at_50%_0%,color-mix(in_oklab,var(--color-primary)_18%,transparent),transparent)]"
        />
        <Container className="relative py-16 lg:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-soft px-3 py-1 text-xs font-medium text-fg-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Хиляди обяви, обновени всеки ден
            </span>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-fg sm:text-5xl">
              Намери своята <span className="text-primary">перфектна кола</span>
            </h1>
            <p className="mt-4 text-base text-fg-muted sm:text-lg">
              Чисто и просто търсене през хиляди обяви от доверени продавачи в България.
            </p>
          </div>

          <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-border bg-surface p-2 shadow-[var(--shadow-card)]">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleQuickSearch()}
                  placeholder="Ключови думи, напр. BMW 320d..."
                  className="h-11 w-full rounded-lg bg-transparent pl-9 pr-3 text-sm placeholder:text-fg-subtle focus:focus-ring"
                />
              </div>
              <Select
                value={selectedMakeId}
                onChange={(e) => setSelectedMakeId(e.target.value)}
                className="!h-11 sm:max-w-[12rem]"
              >
                <option value="">Всички марки</option>
                {makes.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </Select>
              <button
                onClick={handleQuickSearch}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-fg hover:bg-primary-hover transition-colors"
              >
                Търсене <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {makes.length > 0 && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs text-fg-subtle">Популярни:</span>
              {makes.slice(0, 8).map((make) => (
                <Link
                  key={make.id}
                  to={`/search?makeId=${make.id}`}
                  className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-fg-muted hover:border-fg/20 hover:text-fg transition-colors"
                >
                  {make.name}
                </Link>
              ))}
            </div>
          )}
        </Container>
      </section>

      <Container className="py-14">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-fg sm:text-2xl">Последни обяви</h2>
            <p className="mt-1 text-sm text-fg-muted">Прясно публикувани коли — обновяваме всеки ден.</p>
          </div>
          <Link
            to="/search"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Виж всички <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {featuredLoading
            ? Array.from({ length: 8 }).map((_, i) => <CarCardSkeleton key={i} />)
            : featured.map((listing) => <CarCard key={listing.id} listing={listing} />)}
        </div>
      </Container>

      <Container className="pb-16">
        <h2 className="text-xl font-semibold tracking-tight text-fg sm:text-2xl">Защо AutoMarket BG?</h2>
        <p className="mt-1 text-sm text-fg-muted">Изграден за удобство на купувачи и продавачи.</p>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Feature
            icon={<Search className="h-5 w-5" />}
            title="Умно търсене"
            description="Разширени филтри по марка, модел, година, цена, гориво и още."
          />
          <Feature
            icon={<BarChart3 className="h-5 w-5" />}
            title="Пазарни анализи"
            description="Сравни цените и виж тенденциите, преди да купиш или продадеш."
          />
          <Feature
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Доверени продавачи"
            description="Профили с история, любими и запазени търсения за всеки купувач."
          />
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-fg p-8 text-white sm:p-10">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <h3 className="text-xl font-semibold sm:text-2xl">Готов за следващата си кола?</h3>
              <p className="mt-2 text-sm text-white/70">
                Регистрирай се безплатно, запази търсения и първи научавай за нови обяви.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/register"
                className="inline-flex h-11 items-center rounded-lg bg-white px-5 text-sm font-semibold text-fg hover:bg-white/90 transition-colors"
              >
                Създай профил
              </Link>
              <Link
                to="/favorites"
                className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-white/20 px-5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              >
                <Heart className="h-4 w-4" /> Виж любими
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}

function Feature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="card-shell p-6">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold text-fg">{title}</h3>
      <p className="mt-1 text-sm text-fg-muted">{description}</p>
    </div>
  );
}
