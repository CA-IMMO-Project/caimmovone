/* ==========================================================================
   Service « Demandes » — écritures du site public vers l'API Laravel :
   demande d'achat, de visite, de recherche sur mesure, dépôt de terrain
   (POST /api/v1/requests) et messages de contact (POST /api/v1/messages).
   ========================================================================== */

import { apiPost, apiUpload } from './apiClient';

/** Réponse des dépôts publics : référence + indication « fiche mise à jour »
    quand la même personne renvoie la même demande (anti-doublon backend). */
export interface SubmitResult {
  ref: string;
  updated?: boolean;
  message?: string;
}
import type { ContactPayload, ReservationPayload } from '../types';

/**
 * Enregistre une demande (achat, visite, recherche, vente) auprès de l'API.
 * La référence (ACH/VIS/REC/VEN-YYMMDD) est générée par le backend et
 * renvoyée pour être affichée au visiteur.
 */
export async function createReservation(payload: ReservationPayload): Promise<SubmitResult> {
  return apiPost<SubmitResult>('/requests', payload);
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
  lat?: number;
  lng?: number;
  radiusKm?: number;
  flexible?: 'Oui' | 'Non';
  criteria?: string;
}

export async function createSearchRequest(payload: SearchSubmission): Promise<SubmitResult> {
  return apiPost<SubmitResult>('/searches', payload);
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
  lat?: number;
  lng?: number;
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

/** Fichiers réels joints au dépôt (photos, vidéo, documents, pièce d'identité). */
export interface LandFileUploads {
  photos: File[];
  videos: File[];
  documents: File[];
  idFiles: File[];
}

export async function createLandFileRequest(payload: LandFileSubmission, uploads?: LandFileUploads): Promise<SubmitResult> {
  const total = uploads ? uploads.photos.length + uploads.videos.length + uploads.documents.length + uploads.idFiles.length : 0;
  // Sans fichier : envoi JSON classique (inchangé).
  if (!uploads || total === 0) return apiPost<SubmitResult>('/land-files', payload);

  // Avec fichiers : multipart — le backend les range dans storage/ et les
  // affiche dans le back office (« Fichiers reçus du site web »).
  const fd = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) value.forEach((item) => fd.append(`${key}[]`, String(item)));
    else fd.append(key, String(value));
  });
  uploads.photos.forEach((f) => fd.append('photos[]', f, f.name));
  uploads.videos.forEach((f) => fd.append('videos[]', f, f.name));
  uploads.documents.forEach((f) => fd.append('documents[]', f, f.name));
  uploads.idFiles.forEach((f) => fd.append('idFiles[]', f, f.name));
  return apiUpload<SubmitResult>('/land-files', fd);
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
