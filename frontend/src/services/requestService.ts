/* ==========================================================================
   Service « Demandes » — écritures du site public vers l'API Laravel :
   demande d'achat, de visite, de recherche sur mesure, dépôt de terrain
   (POST /api/v1/requests) et messages de contact (POST /api/v1/messages).
   ========================================================================== */

import { apiPost } from './apiClient';
import type { ContactPayload, ReservationPayload } from '../types';

/**
 * Enregistre une demande (achat, visite, recherche, vente) auprès de l'API.
 * La référence (ACH/VIS/REC/VEN-YYMMDD) est générée par le backend et
 * renvoyée pour être affichée au visiteur.
 */
export async function createReservation(payload: ReservationPayload): Promise<string> {
  const res = await apiPost<{ ref: string }>('/requests', payload);
  return res.ref;
}

/** Message de contact (visible dans le back office). */
export async function createContactMessage(payload: ContactPayload): Promise<void> {
  await apiPost('/messages', {
    fullName: `${payload.firstName} ${payload.lastName}`.trim(),
    phone: payload.phone,
    email: payload.email,
    subject: payload.subject,
    message: payload.message,
  });
}
