export function formatPrice(price: number): string {
  return new Intl.NumberFormat('bg-BG', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatMileage(km: number): string {
  return `${new Intl.NumberFormat('bg-BG').format(km)} км`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('bg-BG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );

  const intervals: Array<{ singular: string; plural: string; seconds: number }> = [
    { singular: 'година', plural: 'години', seconds: 31536000 },
    { singular: 'месец', plural: 'месеца', seconds: 2592000 },
    { singular: 'седмица', plural: 'седмици', seconds: 604800 },
    { singular: 'ден', plural: 'дни', seconds: 86400 },
    { singular: 'час', plural: 'часа', seconds: 3600 },
    { singular: 'минута', plural: 'минути', seconds: 60 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      const word = count === 1 ? interval.singular : interval.plural;
      return `преди ${count} ${word}`;
    }
  }

  return 'току-що';
}
