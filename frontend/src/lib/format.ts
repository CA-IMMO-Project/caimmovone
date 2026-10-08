/* Formats communs du site et du back office : montants, surfaces et dates. */
const frNumber = new Intl.NumberFormat('fr-FR');

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('fr-FR', options).format(value);
}

/** Les valeurs absentes (0 dans les fiches non renseignées) sont affichées « — ». */
export function formatAriary(amount: number): string {
  if (!Number.isFinite(amount) || amount === 0) return '—';
  return `${frNumber.format(amount)} Ar`;
}

/** Surface unique sur tout le site : hectares à partir de 10 000 m². */
export function formatArea(area: number): string {
  if (!Number.isFinite(area) || area <= 0) return '—';
  if (area >= 10_000) {
    return `${formatNumber(area / 10_000, { maximumFractionDigits: 2 })} ha`;
  }
  return `${frNumber.format(area)} m²`;
}

/* Les dates jour-seul sont lues à midi pour éviter un décalage de jour selon le fuseau. */
export function parseDate(iso: string): Date {
  const value = String(iso ?? '').trim();
  if (!value) return new Date(Number.NaN);
  return new Date(value.length <= 10 ? `${value}T12:00:00` : value);
}

function validDate(iso: string): Date | null {
  const date = parseDate(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateLong(iso: string): string {
  const date = validDate(iso);
  return date ? date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
}

export function formatDateShort(iso?: string): string {
  if (!iso) return '—';
  const date = validDate(iso);
  return date ? date.toLocaleDateString('fr-FR', { dateStyle: 'short' }) : '—';
}

export function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  const date = validDate(iso);
  return date ? date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
}

export function formatDateMedium(iso: string): string {
  const date = validDate(iso);
  return date ? date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

export function formatMonthShort(iso: string): string {
  const date = validDate(iso);
  return date ? date.toLocaleDateString('fr-FR', { month: 'short' }) : '—';
}

export function formatMonthYear(iso: string): string {
  const date = validDate(iso);
  return date ? date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '—';
}

export function formatTime(iso: string): string {
  const date = validDate(iso);
  return date ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—';
}

// Alias historiques conservés pour éviter de casser les imports existants.
export const fmtDate = formatDateLong;
export const fmtShort = formatDateMedium;
export const fmtMonthShort = formatMonthShort;
export const fmtTime = formatTime;
