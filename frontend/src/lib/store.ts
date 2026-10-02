/* ==========================================================================
   Noyau partagé site + back office.
   TERRAINS & MESSAGES : cache hydraté depuis l'API Laravel (l'admin appelle
   hydrate au login ; le site public lit via services/landService).
   AUTHENTIFICATION : jeton Sanctum délivré par l'API (services/adminService).
   ========================================================================== */

import { ContactMessage, ContactPayload, Land, Reservation, ReservationPayload, RequestStatus } from '../types';

export type { ContactMessage, ContactPayload, Reservation, ReservationPayload, RequestStatus } from '../types';

import { saveLandApi, deleteApi, updateMessageApi, resetLandsApi, login as apiLogin, logout as apiLogout, isLoggedIn, ApiError } from '../services/adminService';
import { cache, upsertSync, replaceSync, removeSync } from '../admin/crm/sync';

export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

// --- Terrains (catalogue partagé site public / back office) ---

export function getLands(): Land[] {
  return cache.lands;
}

/** Enregistre un terrain : visible immédiatement, persisté vers l'API. */
export async function saveLand(land: Land): Promise<Land> {
  const temp = { ...land };
  upsertSync('lands', temp);
  try {
    const server = (await saveLandApi(temp as never)) as unknown as Land;
    if (temp.id !== server.id) replaceSync('lands', temp.id, server);
    else replaceSync('lands', server.id, server);
    return server;
  } catch {
    return temp;
  }
}

export async function deleteLand(id: string): Promise<void> {
  removeSync('lands', id);
  if (/^\d+$/.test(id)) await deleteApi('lands', id).catch(() => {});
}

/** Recrée le catalogue de démonstration (bouton « réinitialiser » de l'admin). */
export async function resetLands(): Promise<void> {
  const res = (await resetLandsApi()) as { lands?: Land[] };
  if (res?.lands) {
    cache.lands = res.lands; // cache mis à jour immédiatement
  }
}

// --- Messages de contact ---

export function getMessages(): ContactMessage[] {
  return cache.messages;
}

export function updateMessage(id: string, patch: Partial<ContactMessage>): void {
  const list = cache.messages;
  const i = list.findIndex((m) => m.id === id);
  if (i >= 0) list[i] = { ...list[i], ...patch };
  updateMessageApi(id, { status: patch.status }).catch(() => {});
}

export function deleteMessage(id: string): void {
  removeSync('messages', id);
  if (/^\d+$/.test(id)) deleteApi('messages', id).catch(() => {});
}

// --- Authentification admin (jeton Sanctum via l'API Laravel) ---

/**
 * Connexion admin. Retourne null en cas de succès, sinon le message à
 * afficher (identifiants invalides, serveur injoignable, trop d'essais…).
 */
export async function login(email: string, password: string): Promise<string | null> {
  try {
    await apiLogin(email, password);
    return null;
  } catch (error) {
    if (error instanceof ApiError && error.status > 0) {
      // Le serveur a répondu : son message est parlant (401, 422, 429…).
      return error.status === 401 ? 'Identifiants incorrects.' : error.message;
    }
    return 'Impossible de joindre le serveur. Vérifiez qu’il est démarré, puis réessayez.';
  }
}

export async function logout(): Promise<void> {
  await apiLogout();
}

export function isAuthenticated(): boolean {
  return isLoggedIn();
}
