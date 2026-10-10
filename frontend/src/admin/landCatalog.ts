import type { Land } from '../types';
import { adminStatusClass } from './status';

export const TITLE_STATUSES: Land['titleStatus'][] = ['Titre Foncier', 'Titre en cours', 'Cadastré'];
export const LAND_STATUSES: Land['status'][] = ['disponible', 'réservé', 'vendu'];
export const RELIEF_OPTIONS: NonNullable<Land['relief']>[] = ['Plat', 'Pente douce', 'Pente forte'];
export const PAYMENT_MODES: NonNullable<Land['paymentMode']>[] = ['comptant', 'facilite', 'comptant-ou-facilite'];
export const PUBLICATION_STATUSES: NonNullable<Land['publicationStatus']>[] = ['brouillon', 'publie', 'archive'];

export function createEmptyLand(): Land {
  return {
    id: `tmp-${Date.now().toString(36)}`,
    title: '',
    description: '',
    price: 0,
    region: '',
    zone: '',
    location: '',
    imageUrl: '',
    gallery: [],
    features: [],
    area: 0,
    titleStatus: 'Titre Foncier',
    status: 'disponible',
    relief: 'Plat',
    access: '',
    water: false,
    electricity: false,
    documents: [],
    payment: '',
    paymentMode: 'comptant',
    downPayment: '',
    installments: '',
    featured: false,
    publicationStatus: 'brouillon',
    lots: [],
    sales: [],
  };
}

export function landFrontSummary(land: Land) {
  const gallery = [...new Set([land.imageUrl, ...(land.gallery ?? [])].filter((src): src is string => Boolean(src)))];
  return {
    gallery,
    galleryCount: gallery.length,
    documentsCount: land.documents?.length ?? 0,
    payment: land.payment?.trim() || 'À préciser',
    access: land.access?.trim() || 'À préciser',
  };
}

export function publicationLabel(status: Land['publicationStatus']): string {
  switch (status) {
    case 'publie': return 'Publié';
    case 'archive': return 'Archivé';
    default: return 'Brouillon';
  }
}

export function publicationTone(status: Land['publicationStatus']): string {
  return adminStatusClass(publicationLabel(status));
}

function requiresInstallmentDetails(mode: Land['paymentMode']): boolean {
  return mode === 'facilite' || mode === 'comptant-ou-facilite';
}

export function landFrontMissing(land: Land): string[] {
  const missing: string[] = [];
  const galleryCount = landFrontSummary(land).galleryCount;

  if (!land.title.trim()) missing.push('titre');
  if (!land.description.trim()) missing.push('description');
  if (!land.imageUrl.trim()) missing.push('photo de couverture');
  if (galleryCount < 2) missing.push('galerie photos');
  if (!(land.features?.length ?? 0)) missing.push('atouts');
  if (!land.region?.trim()) missing.push('région');
  if (!land.zone?.trim()) missing.push('zone / commune');
  if (!land.location?.trim()) missing.push('localisation');
  if (!land.access?.trim()) missing.push('accès');
  if (!(land.documents?.length ?? 0)) missing.push('documents');
  if (!land.payment?.trim()) missing.push('texte de paiement');
  if (!land.coordinates?.length) missing.push('coordonnées GPS');

  if (requiresInstallmentDetails(land.paymentMode)) {
    if (!land.downPayment?.trim()) missing.push('acompte');
    if (!land.installments?.trim()) missing.push('durée de facilité');
  }

  return missing;
}

export function landFrontScore(land: Land): number {
  const totalChecks = 12 + (requiresInstallmentDetails(land.paymentMode) ? 2 : 0);
  const done = Math.max(0, totalChecks - landFrontMissing(land).length);
  return Math.round((done / totalChecks) * 100);
}

/** Champs indispensables avant publication publique. */
export function landPublishIssues(land: Land): string[] {
  const issues: string[] = [];
  if (!land.title.trim()) issues.push('titre');
  if (!land.description.trim()) issues.push('description');
  if (!land.imageUrl.trim()) issues.push('photo de couverture');
  if (!land.price || land.price <= 0) issues.push('prix');
  if (!land.area || land.area <= 0) issues.push('surface');
  if (!land.region?.trim()) issues.push('région');
  if (!land.location?.trim()) issues.push('localisation');
  if (!land.payment?.trim()) issues.push('mode / texte de paiement');
  return issues;
}
