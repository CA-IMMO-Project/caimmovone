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

/* Recherche sur mesure — traitée dans l'écran « Recherches spécifiques »
   du back office (POST /api/v1/searches : critères structurés). */
export interface SearchSubmission {
  fullName: string;
  phone: string;
  email?: string;
  usage?: string;
  budgetMax?: number;
  areaMin?: number;
  areaMax?: number;
  mainZone?: string;
  otherZones?: string;
  targetZone?: string;
  flexible?: 'Oui' | 'Non';
  criteria?: string;
}

export async function createSearchRequest(payload: SearchSubmission): Promise<string> {
  const res = await apiPost<{ ref: string }>('/searches', payload);
  return res.ref;
}

/* Dépôt de terrain — traité dans l'écran « Dossiers de vente » du back
   office (POST /api/v1/land-files : dossier VEN complet). */
export interface LandFileSubmission {
  fullName: string;
  phone: string;
  email?: string;
  birthDate?: string;
  profession?: string;
  country?: string;
  bankAccount?: string;
  idType?: string;
  idNumber?: string;
  title: string;
  area?: number;
  price?: number;
  description?: string;
  relief?: string;
  access?: string;
  water?: string;
  electricity?: string;
  region?: string;
  district?: string;
  commune?: string;
  fokontany?: string;
  directions?: string;
  payment?: string;
  paymentDuration?: string;
  deposit?: string;
  photoNames?: string[];
  videoNames?: string[];
  docNames?: string[];
  docTypes?: string[];
  idFileNames?: string[];
  summary?: string;
}

export async function createLandFileRequest(payload: LandFileSubmission): Promise<string> {
  const res = await apiPost<{ ref: string }>('/land-files', payload);
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
