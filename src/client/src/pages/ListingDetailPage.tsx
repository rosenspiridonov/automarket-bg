import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  ArrowLeft,
  Calendar,
  Car,
  CheckCircle2,
  Edit,
  ExternalLink,
  Heart,
  Mail,
  MapPin,
  MessageCircle,
  Minus,
  Phone,
  Send,
  TrendingDown,
  TrendingUp,
  User as UserIcon,
} from 'lucide-react';
import { normalizeBgPhone } from '../utils/phone';
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
import { Badge, Button, Container, Skeleton, Textarea } from '../components/ui';
import { cn } from '../utils/cn';

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
      toast.success(data.isFavorited ? 'Добавена в любими' : 'Премахната от любими');
    },
  });

  const isFavorited = favoriteIds.includes(Number(id));
  const isOwner = user?.id === listing?.sellerId;

  if (isLoading) {
    return (
      <Container className="py-10">
        <div className="space-y-6">
          <Skeleton className="aspect-[16/9] w-full rounded-2xl" />
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </Container>
    );
  }

  if (error || !listing) {
    return (
      <Container className="py-16 text-center">
        <h2 className="text-xl font-semibold text-fg">Обявата не е намерена</h2>
        <p className="mt-2 text-sm text-fg-muted">Тази обява може да е премахната или да не съществува.</p>
        <Link to="/search" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">
          ← Обратно към търсенето
        </Link>
      </Container>
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
    {} as Record<string, typeof listing.features>,
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
    <Container className="py-6 lg:py-10">
      <div className="mb-5 flex items-center justify-between">
        <Link
          to="/search"
          className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" /> Обратно към търсенето
        </Link>
        <div className="flex items-center gap-2">
          {isAuthenticated && !isOwner && (
            <Button
              variant={isFavorited ? 'secondary' : 'secondary'}
              size="sm"
              leadingIcon={
                <Heart
                  className={cn('h-4 w-4', isFavorited && 'fill-danger text-danger')}
                />
              }
              onClick={() => toggleFavorite.mutate()}
              className={cn(isFavorited && 'border-danger/30 text-danger hover:bg-danger-soft')}
            >
              {isFavorited ? 'Запазена' : 'Запази'}
            </Button>
          )}
          {isOwner && (
            <Link
              to={`/listings/${id}/edit`}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-fg hover:bg-primary-hover transition-colors"
            >
              <Edit className="h-4 w-4" /> Редактирай
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="space-y-6 lg:col-span-2">
          <Gallery images={images} title={listing.title} active={activeImage} setActive={setActiveImage} />

          <section className="card-shell p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-fg">{listing.title}</h1>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-muted">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> {formatDate(listing.createdAt)}
                  </span>
                  {listing.city && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {listing.city}
                    </span>
                  )}
                </p>
              </div>
              <div className="text-3xl font-bold tracking-tight text-fg sm:text-right">
                {formatPrice(listing.price)}
              </div>
            </div>

            <div className="mt-4">
              <FairPriceBadge
                analysis={listing.fairPriceAnalysis}
                make={listing.makeName}
                model={listing.modelName}
                year={listing.year}
              />
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-y-4 sm:grid-cols-3">
              <Spec label="Марка" value={listing.makeName} />
              <Spec label="Модел" value={listing.modelName} />
              <Spec label="Година" value={String(listing.year)} />
              <Spec label="Пробег" value={formatMileage(listing.mileage)} />
              <Spec label="Гориво" value={FUEL_TYPE_LABELS[listing.fuelType] ?? listing.fuelType} />
              <Spec label="Скоростна кутия" value={TRANSMISSION_LABELS[listing.transmissionType] ?? listing.transmissionType} />
              <Spec label="Каросерия" value={BODY_TYPE_LABELS[listing.bodyType] ?? listing.bodyType} />
              <Spec label="Задвижване" value={DRIVE_TYPE_LABELS[listing.driveType] ?? listing.driveType} />
              <Spec label="Цвят" value={COLOR_LABELS[listing.color] ?? listing.color} />
              <Spec label="Състояние" value={CONDITION_LABELS[listing.condition] ?? listing.condition} />
              {listing.horsePower != null && (
                <Spec label="Мощност" value={`${listing.horsePower} к.с.`} />
              )}
              {listing.engineDisplacementCc != null && (
                <Spec label="Двигател" value={`${listing.engineDisplacementCc} куб.см`} />
              )}
              {listing.vinNumber && <Spec label="VIN" value={listing.vinNumber} />}
            </dl>
          </section>

          {priceHistory.length > 0 && <PriceHistoryCard history={priceHistory} />}

          {listing.description && (
            <section className="card-shell p-6">
              <h2 className="text-base font-semibold text-fg">Описание</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-fg">
                {listing.description}
              </p>
            </section>
          )}

          {Object.keys(featuresByCategory).length > 0 && (
            <section className="card-shell p-6">
              <h2 className="text-base font-semibold text-fg">Екстри</h2>
              <div className="mt-4 space-y-4">
                {Object.entries(featuresByCategory).map(([category, items]) => (
                  <div key={category}>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                      {category}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {items.map((f) => (
                        <Badge key={f.id} tone="primary" size="md" icon={<CheckCircle2 className="h-3 w-3" />}>
                          {f.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card-shell p-6 lg:sticky lg:top-24">
            {listing.externalSourceUrl ? (
              <ExternalSellerCard listing={listing} showPhone={showPhone} onShowPhone={() => setShowPhone(true)} />
            ) : (
              <InternalSellerCard
                listing={listing}
                isOwner={isOwner}
                showPhone={showPhone}
                onShowPhone={() => setShowPhone(true)}
                contactMessage={contactMessage}
                onMessageChange={setContactMessage}
                onSendMessage={handleSendMessage}
              />
            )}
          </div>
        </aside>
      </div>
    </Container>
  );
}

function Gallery({
  images,
  title,
  active,
  setActive,
}: {
  images: { id: number; url: string }[];
  title: string;
  active: number;
  setActive: (i: number) => void;
}) {
  if (images.length === 0) {
    return (
      <div className="card-shell flex aspect-[16/9] items-center justify-center text-fg-subtle">
        <Car className="h-12 w-12" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl bg-surface-soft border border-border">
        <img
          src={images[active]?.url}
          alt={title}
          className="aspect-[16/9] w-full object-cover"
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActive(i)}
              className={cn(
                'h-16 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-colors',
                i === active ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100',
              )}
            >
              <img src={img.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-fg-subtle">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-fg">{value}</dd>
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
    return <span className="text-xs text-fg-subtle">Недостатъчно данни за сравнение</span>;
  }

  const tooltip = `Сравнено с ${analysis.sampleSize} активни обяви за ${make} ${model} (${year - 2}-${year + 2})`;
  const absPct = Math.abs(analysis.percentDifference).toFixed(0);

  if (analysis.position === 'below') {
    return (
      <div className="space-y-1" title={tooltip}>
        <Badge tone="success" size="md" icon={<TrendingDown className="h-3 w-3" />}>
          {absPct}% под пазарната цена
        </Badge>
        <p className="text-xs text-fg-subtle">спрямо {analysis.sampleSize} обяви</p>
      </div>
    );
  }

  if (analysis.position === 'above') {
    return (
      <div className="space-y-1" title={tooltip}>
        <Badge tone="warning" size="md" icon={<TrendingUp className="h-3 w-3" />}>
          {absPct}% над пазарната цена
        </Badge>
        <p className="text-xs text-fg-subtle">спрямо {analysis.sampleSize} обяви</p>
      </div>
    );
  }

  return (
    <div className="space-y-1" title={tooltip}>
      <Badge tone="neutral" size="md" icon={<Minus className="h-3 w-3" />}>
        На пазарната цена
      </Badge>
      <p className="text-xs text-fg-subtle">спрямо {analysis.sampleSize} обяви</p>
    </div>
  );
}

function PriceHistoryCard({ history }: { history: { price: number; recordedAt: string }[] }) {
  if (history.length === 1) {
    return (
      <section className="card-shell p-6">
        <h2 className="text-base font-semibold text-fg">Ценова история</h2>
        <p className="mt-2 text-sm text-fg-muted">
          Без промени в цената · {formatDate(history[0].recordedAt)}
        </p>
      </section>
    );
  }

  const first = history[0].price;
  const last = history[history.length - 1].price;
  const diff = last - first;
  const pctValue = first > 0 ? (diff / first) * 100 : 0;
  const isFlat = Math.abs(pctValue) < 0.1;
  const pct = Math.abs(pctValue).toFixed(Math.abs(pctValue) < 1 ? 2 : 1);

  return (
    <section className="card-shell p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-fg">Ценова история</h2>
        <span
          className={cn(
            'text-xs font-medium',
            isFlat ? 'text-fg-muted' : diff < 0 ? 'text-success' : 'text-danger',
          )}
        >
          {isFlat ? '— без промяна' : diff < 0 ? `↓ ${pct}%` : `↑ ${pct}%`}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart
          data={history.map((p, idx) => ({
            idx,
            recordedAt: p.recordedAt,
            price: p.price,
          }))}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e6e8ee" />
          <XAxis
            dataKey="idx"
            type="number"
            domain={[0, history.length - 1]}
            ticks={history.map((_, i) => i)}
            tickFormatter={(i) =>
              history[i]
                ? new Date(history[i].recordedAt).toLocaleDateString('bg-BG', { month: 'short', day: 'numeric' })
                : ''
            }
            tick={{ fontSize: 12, fill: '#64748b' }}
            stroke="#cbd5e1"
          />
          <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12, fill: '#64748b' }} stroke="#cbd5e1" />
          <Tooltip
            labelFormatter={(i, payload) => {
              const item = payload?.[0]?.payload as { recordedAt?: string } | undefined;
              if (!item?.recordedAt) return '';
              return new Date(item.recordedAt).toLocaleString('bg-BG', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });
            }}
            formatter={(value) => [formatPrice(Number(value)), 'Цена']}
          />
          <Line type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={2} dot={{ fill: '#2563eb', r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-3 text-xs text-fg-subtle">
        {history.length} промени · текуща {formatPrice(last)} · първоначална {formatPrice(first)}
      </p>
    </section>
  );
}

function ExternalSellerCard({
  listing,
  showPhone,
  onShowPhone,
}: {
  listing: { externalSourceUrl: string | null; externalSource: string | null; sellerName: string; sellerPhone: string | null };
  showPhone: boolean;
  onShowPhone: () => void;
}) {
  const phone = listing.sellerPhone;
  const normalizedPhone = phone ? normalizeBgPhone(phone) : null;
  const e164Digits = normalizedPhone ? normalizedPhone.replace(/\D/g, '') : null;

  return (
    <>
      {listing.externalSourceUrl && listing.externalSource && (
        <a
          href={listing.externalSourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-4 inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-fg-muted hover:border-fg-subtle hover:text-fg transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          Източник: {listing.externalSource}
        </a>
      )}

      <div className="flex items-center gap-3">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-primary">
          <UserIcon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-fg">
            {listing.sellerName || 'Продавач не е посочен'}
          </p>
        </div>
      </div>

      {phone && (
        <div className="mt-5 space-y-2">
          {showPhone ? (
            <a
              href={`tel:${phone}`}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-success px-4 text-sm font-medium text-white hover:opacity-90 transition-opacity"
            >
              <Phone className="h-4 w-4" /> {phone}
            </a>
          ) : (
            <button
              onClick={onShowPhone}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-success px-4 text-sm font-medium text-white hover:opacity-90 transition-opacity"
            >
              <Phone className="h-4 w-4" /> Покажи телефон
            </button>
          )}

          {showPhone && e164Digits && (
            <>
              <a
                href={`viber://chat?number=%2B${e164Digits}`}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-fg hover:bg-surface-soft transition-colors"
              >
                <MessageCircle className="h-4 w-4 text-[#7360f2]" />
                Пиши във Viber
              </a>
              <a
                href={`https://wa.me/${e164Digits}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-fg hover:bg-surface-soft transition-colors"
              >
                <MessageCircle className="h-4 w-4 text-[#25d366]" />
                Пиши във WhatsApp
              </a>
            </>
          )}
        </div>
      )}
    </>
  );
}

function InternalSellerCard({
  listing,
  isOwner,
  showPhone,
  onShowPhone,
  contactMessage,
  onMessageChange,
  onSendMessage,
}: {
  listing: { sellerName: string; sellerCity: string | null; sellerMemberSince: string | null; sellerPhone: string | null; sellerEmail: string | null; makeName: string; modelName: string };
  isOwner: boolean;
  showPhone: boolean;
  onShowPhone: () => void;
  contactMessage: string;
  onMessageChange: (v: string) => void;
  onSendMessage: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-3">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-primary">
          <UserIcon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-fg">{listing.sellerName}</p>
          {listing.sellerCity && (
            <p className="text-xs text-fg-muted">{listing.sellerCity}</p>
          )}
        </div>
      </div>
      {listing.sellerMemberSince && (
        <p className="mt-2 text-xs text-fg-subtle">
          Член от {formatDate(listing.sellerMemberSince)}
        </p>
      )}

      {listing.sellerPhone && (
        showPhone ? (
          <a
            href={`tel:${listing.sellerPhone}`}
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-success px-4 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            <Phone className="h-4 w-4" /> {listing.sellerPhone}
          </a>
        ) : (
          <button
            onClick={onShowPhone}
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-success px-4 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            <Phone className="h-4 w-4" /> Покажи телефон
          </button>
        )
      )}

      {listing.sellerEmail && !isOwner && (
        <div className="mt-5 border-t border-border pt-5">
          <h3 className="text-sm font-medium text-fg">Свържи се с продавача</h3>
          <p className="mt-1 text-xs text-fg-muted inline-flex items-center gap-1">
            <Mail className="h-3 w-3" /> {listing.sellerEmail}
          </p>
          <Textarea
            value={contactMessage}
            onChange={(e) => onMessageChange(e.target.value)}
            rows={3}
            placeholder={`Здравейте, интересувам се от вашия ${listing.makeName} ${listing.modelName}...`}
            className="mt-3"
          />
          <Button
            variant="primary"
            fullWidth
            className="mt-2"
            leadingIcon={<Send className="h-4 w-4" />}
            onClick={onSendMessage}
            disabled={!contactMessage.trim()}
          >
            Изпрати съобщение
          </Button>
        </div>
      )}
    </>
  );
}
