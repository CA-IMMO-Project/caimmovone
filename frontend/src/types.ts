/* ==========================================================================
   Types du domaine — point unique de définition.
   ⚒ Ce fichier est ÉPINGLÉ à la racine de src/ : le backoffice (src/admin)
   l'importe via '../types' et '../../types'. Ne pas le déplacer.
   ========================================================================== */

/* --- Terrains ------------------------------------------------------------- */

export type TitleStatus = 'Titre Foncier' | 'Titre en cours' | 'Cadastré';
export type Relief = 'Plat' | 'Pente douce' | 'Pente forte';
export type PaymentMode = 'comptant' | 'facilite' | 'comptant-ou-facilite';
export type LandStatus = 'disponible' | 'réservé' | 'vendu';

export interface Land {
  id: string;
  title: string;
  location: string;
  region: string;
  price: number; // in Ariary (Ar)
  imageUrl: string;
  description: string;
  features: string[];
  area: number; // in m²
  titleStatus: TitleStatus;
  status: LandStatus;

  /* — Enrichissements « fiche terrain » (optionnels : normalizeLand() complète) — */
  zone?: string;
  gallery?: string[];
  /** Coordonnées GPS [latitude, longitude] — carte publique et backoffice. */
  coordinates?: [number, number];
  relief?: Relief;
  access?: string;
  water?: boolean;
  electricity?: boolean;
  documents?: string[];
  payment?: string;
  paymentMode?: PaymentMode;
  downPayment?: string;
  installments?: string;
  verified?: boolean;
  featured?: boolean;

  /* — Lotissement / ventes (suivis dans le backoffice) — */
  lots?: Lot[];
  sales?: Sale[];
}

export interface Lot {
  id: string;
  number: string; // ex : "Lot 12"
  area: number; // in m²
  price: number; // in Ariary (Ar)
  status: LandStatus;
  imageUrl?: string;
  details?: string;
  history?: { id: string; at: string; author: string; text: string }[];
}

export interface Sale {
  id: string;
  date: string; // AAAA-MM-JJ
  lotId?: string; // absent = terrain entier
  price: number;
  paymentMode: string;
  buyer: { firstName: string; lastName: string; phone: string; email: string; address: string; idNumber: string };
  notes: string;
  buyRequestId: string; // dossier client (demande d'achat) qui garde l'historique
}

/* --- Demandes client (site → backoffice) -----------------------------------
   Une « demande » est créée par le site (achat, visite, recherche, vente)
   et envoyée à l'API Laravel (voir services/requestService.ts). */

export type RequestStatus = 'nouveau' | 'traité' | 'archivé';

export type RequestKind = 'interet' | 'visite' | 'projet' | 'recherche' | 'vente';

export interface ReservationPayload {
  fullName: string;
  phone: string;
  email?: string;
  budget?: string;
  profession?: string;
  bankAccount?: string;
  age?: number;
  nationality?: string;
  message?: string;
  landId?: string;
  lotId?: string;
  projectName?: string;
  userId?: string;
  /** Référence affichée au client (ACH/VIS/REC/VEN-YYMMDD). */
  ref?: string;
  kind?: RequestKind;
  paymentMode?: string;
  duration?: string;
  downPaymentAmount?: string;
  visitDate?: string;
  visitTime?: string;
  /** Date de naissance saisie sur le site (facultative). */
  birthDate?: string;
  /** Meilleur moment pour rappeler le client (choisi sur le site). */
  callTime?: string;
}

export interface Reservation extends ReservationPayload {
  id: string;
  createdAt: string;
  status: RequestStatus;
}

export interface ContactPayload {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  subject?: string;
  message: string;
  userId?: string;
}

export interface ContactMessage extends ContactPayload {
  id: string;
  createdAt: string;
  status: RequestStatus;
}
