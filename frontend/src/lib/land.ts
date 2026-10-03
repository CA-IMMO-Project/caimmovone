import { Land, PaymentMode, Relief } from '../types';

/** Terrain dont les champs « fiche » sont garantis présents. */
export interface LandComplete extends Land {
  zone: string;
  gallery: string[];
  relief: Relief;
  access: string;
  water: boolean;
  electricity: boolean;
  documents: string[];
  payment: string;
  paymentMode: PaymentMode;
  downPayment: string;
  installments: string;
  verified: boolean;
}

/** Complète un terrain (utile pour les biens créés via le backoffice). */
export function normalizeLand(land: Land): LandComplete {
  return {
    ...land,
    zone: land.zone ?? land.location.split(',')[0].trim(),
    // Sans doublon : chaque photo de la publication n'apparaît qu'une fois.
    gallery: [...new Set((land.gallery?.length ? land.gallery : [land.imageUrl]).filter(Boolean))],
    relief: land.relief ?? 'Plat',
    access: land.access ?? 'Accès par route',
    water: land.water ?? false,
    electricity: land.electricity ?? false,
    documents: land.documents ?? [land.titleStatus],
    payment: land.payment ?? 'Comptant',
    paymentMode: land.paymentMode ?? 'comptant',
    downPayment: land.downPayment ?? 'Selon accord',
    installments: land.installments ?? 'Non disponible',
    verified: land.verified ?? land.titleStatus === 'Titre Foncier',
  };
}

export function pricePerSqm(land: Land): number {
  return land.area > 0 ? Math.round(land.price / land.area) : 0;
}

export function landReference(land: Land): string {
  return `CAI-${land.id.toString().padStart(4, '0')}`;
}

export function paymentAllows(mode: PaymentMode, want: 'comptant' | 'facilite'): boolean {
  return mode === want || mode === 'comptant-ou-facilite';
}

