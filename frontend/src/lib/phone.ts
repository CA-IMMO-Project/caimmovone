/**
 * Format téléphonique CA IMMO.
 * Madagascar est affiché au format national lisible : 034 12 345 67.
 * Les numéros internationaux non malgaches sont conservés tels que saisis.
 */
export const PHONE_PLACEHOLDER = '034 12 345 67';

function withDialCode(phone?: string, dialCode?: string): string {
  const value = String(phone ?? '').trim();
  const code = String(dialCode ?? '').trim();
  if (!value) return '';
  if (!code) return value;

  const phoneDigits = value.replace(/\D/g, '');
  const codeDigits = code.replace(/\D/g, '');
  // Le numéro est déjà international : ne pas lui préfixer une seconde fois le code.
  if (value.startsWith('+') || (codeDigits && phoneDigits.startsWith(codeDigits))) return value;
  return `${code} ${value}`;
}

/** Retourne le numéro malgache national (10 chiffres), sinon null. */
function malagasyNationalDigits(value: string): string | null {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('261')) digits = digits.slice(3);

  // Accepte aussi l'ancien mélange +261 034… / 261 033… : l'indicatif
  // international et le zéro national ne doivent jamais être affichés ensemble.
  if (/^03\d{8}$/.test(digits)) return digits;
  if (/^3\d{8}$/.test(digits)) return `0${digits}`;
  return null;
}

/**
 * Normalise un numéro malgache pour le stockage : chiffres locaux sans espaces
 * (0341234567). Pour un numéro étranger, conserve la saisie et ses séparateurs.
 */
export function normalizePhone(phone?: string, dialCode?: string): string {
  const raw = withDialCode(phone, dialCode);
  if (!raw) return '';
  const national = malagasyNationalDigits(raw);
  if (national) return national;
  return raw.replace(/\s+/g, ' ').trim();
}

/** Affichage cohérent de tous les téléphones malgaches dans le back-office. */
export function formatPhone(phone?: string, dialCode?: string): string {
  const raw = withDialCode(phone, dialCode);
  if (!raw) return '';
  const national = malagasyNationalDigits(raw);
  if (national) return `${national.slice(0, 3)} ${national.slice(3, 5)} ${national.slice(5, 8)} ${national.slice(8)}`;
  return raw.replace(/\s+/g, ' ').trim();
}

/** Lien d'appel correct : un numéro local malgache devient un lien E.164. */
export function phoneHref(phone?: string, dialCode?: string): string {
  const raw = withDialCode(phone, dialCode);
  if (!raw) return '';
  const national = malagasyNationalDigits(raw);
  if (national) return `tel:+261${national.slice(1)}`;
  const compact = raw.replace(/[\s.()\-]/g, '');
  return compact ? `tel:${compact}` : '';
}
