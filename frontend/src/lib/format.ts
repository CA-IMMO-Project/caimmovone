/* Mise en forme — montants, surfaces, dates (référence unique du site). */

export function formatAriary(amount: number): string {
  return `${new Intl.NumberFormat('fr-FR').format(amount)} Ar`;
}

export function formatArea(area: number): string {
  if (area >= 10000) {
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(area / 10000)} Ha`;
  }
  return `${new Intl.NumberFormat('fr-FR').format(area)} m²`;
}

/* --- Dates ----------------------------------------------------------------
   Les dates du domaine sont soit ISO (YYYY-MM-DDTHH:mm), soit jour seul
   (YYYY-MM-DD). Le « midi » évite les décalages de fuseau horaire. */

export function parseDate(iso: string): Date {
  return new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso);
}

export function fmtDate(iso: string): string {
  return parseDate(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function fmtShort(iso: string): string {
  return parseDate(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmtMonthShort(iso: string): string {
  return parseDate(iso).toLocaleDateString('fr-FR', { month: 'short' });
}

export function fmtTime(iso: string): string {
  return parseDate(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
