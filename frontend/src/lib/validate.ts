/* ==========================================================================
   Validation des saisies — helpers purs (aucun accès réseau).
   Utilisés par les formulaires du site public et du back office.
   ========================================================================== */

import { normalizePhone } from './phone';

/**
 * Valide un numéro malgache local, ou un numéro étranger complet au format E.164.
 * Les espaces, points, parenthèses et tirets sont tolérés; aucun sélecteur
 * d'indicatif n'est nécessaire. Les numéros malgaches restent affichés au
 * format national « 034 12 345 67 ».
 */
export function phoneError(value: string): string | null {
  const raw = value.trim();
  if (!raw) return 'Le numéro de téléphone est obligatoire.';
  const compact = raw.replace(/[\s.()\-]/g, '');
  if (!/^\+?\d+$/.test(compact)) return 'Numéro invalide : chiffres uniquement.';
  if (/^03\d{8}$/.test(normalizePhone(raw))) return null;
  // +261 doit respecter la validation malgache; les autres pays acceptent un
  // numéro international complet (+ indicatif, 8 à 15 chiffres au total).
  if (!compact.startsWith('+261') && /^\+[1-9]\d{7,14}$/.test(compact)) return null;
  return 'Numéro invalide. Format attendu : 034 12 345 67 ou un numéro international complet (+indicatif…).';
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
