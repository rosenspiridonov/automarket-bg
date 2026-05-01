export function normalizeBgPhone(raw: string): string {
  const stripped = raw.replace(/[\s\-().]/g, '');
  if (stripped.startsWith('+')) return stripped;
  if (stripped.startsWith('00')) return '+' + stripped.slice(2);
  // Bulgarian local format: 08x... → +3598x...
  if (stripped.startsWith('0')) return '+359' + stripped.slice(1);
  return stripped;
}
