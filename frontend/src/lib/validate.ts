/* ==========================================================================
   Validation des saisies — helpers purs (aucun accès réseau).
   Utilisés par les formulaires du site public et du back office.
   ========================================================================== */

/**
 * Valide un numéro de téléphone malgache ou international.
 * Formats acceptés (espaces, points et tirets tolérés) :
 *   034 12 345 67          → mobile local (10 chiffres commençant par 03)
 *   +261 34 12 345 67      → format international (261 + 9 chiffres)
 * Retourne null si le numéro est valide, sinon le message d'erreur.
 */
export function phoneError(value: string): string | null {
  const raw = value.trim();
  if (!raw) return 'Le numéro de téléphone est obligatoire.';
  const digits = raw.replace(/[\s.()\-]/g, '').replace(/^\+/, '');
  if (!/^\d+$/.test(digits)) return 'Numéro invalide : chiffres uniquement.';
  if (/^03\d{8}$/.test(digits)) return null; // 034 12 345 67
  if (/^2613\d{8}$/.test(digits)) return null; // +261 34 12 345 67
  return 'Numéro invalide. Format attendu : 034 12 345 67 ou +261 34 12 345 67.';
}

/** Version « champ facultatif » : vide = pas d'erreur. */
export function phoneErrorOptional(value: string): string | null {
  return value.trim() ? phoneError(value) : null;
}

/** Valide une adresse email (vide = pas d'erreur : champ facultatif). */
export function emailError(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw) ? null : 'Adresse email invalide (ex. vous@exemple.com).';
}

/** True si la valeur est un entier positif (surface, prix…). */
export function isPositiveNumber(value: string): boolean {
  return /^\d+([.,]\d+)?$/.test(value.trim()) && Number(value.replace(',', '.')) > 0;
}

/**
 * Filtre la saisie d'un champ téléphone en temps réel :
 * seuls les chiffres, espaces, points, tirets, parenthèses et un « + »
 * initial sont conservés — les lettres sont bloquées.
 */
export function sanitizePhone(value: string): string {
  return value.replace(/[^\d+\s().\-]/g, '').replace(/(?!^)\+/g, '').slice(0, 20);
}
