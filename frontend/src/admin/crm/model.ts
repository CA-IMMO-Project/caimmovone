// Modèle de données du back-office (demandes d'achat, dossiers terrains).
// Stockage local en attendant un vrai backend : métadonnées dans localStorage,
// fichiers (photos, vidéos, documents) dans IndexedDB (voir files.ts).

import { newId } from '../../lib/store';

// ---------- Listes de choix ----------
export const REGIONS = [
  'Analamanga', 'Vakinankaratra', 'Itasy', 'Bongolava', 'Alaotra-Mangoro', 'Analanjirofo', 'Atsinanana',
  'Boeny', 'Betsiboka', 'Melaky', 'Sofia', 'Diana', 'Sava', 'Amoron’i Mania', 'Haute Matsiatra',
  'Vatovavy', 'Fitovinany', 'Atsimo-Atsinanana', 'Ihorombe', 'Menabe', 'Atsimo-Andrefana', 'Androy', 'Anosy',
];
export const COUNTRIES = ['Madagascar', 'France', 'La Réunion', 'Autre'] as const;
export const DIAL_CODES = ['+261', '+33', '+262', '+1', '+44', '+49', '+230'];
export const AGENTS = ['Non assigné', 'Hery Rakoto', 'Fanja Randria', 'Tiana Rabe', 'Mialy Andriam'];
export const SOURCES = ['Site web', 'Téléphone', 'Facebook', 'WhatsApp', 'Agence', 'Recommandation', 'Autre'];
export const PRIORITIES = ['Faible', 'Normale', 'Haute', 'Urgente'] as const;

export const BUY_PAYMENT = ['Paiement comptant – règlement en une fois', 'Facilité de paiement – paiement échelonné'] as const;
export const PROPERTY_TYPES = ['Terrain', 'Maison', 'Appartement', 'Villa', 'Immeuble', 'Local commercial', 'Autre'];
export const BUY_GOALS = ['Résidence principale', 'Investissement', 'Construction', 'Projet commercial', 'Projet professionnel', 'Autre'];
export const BUY_STATUSES = [
  'Nouvelle', 'À contacter', 'Contacté', 'En étude', 'Proposition envoyée', 'Visite programmée',
  'Négociation', 'Validée', 'Achat finalisé', 'Refusée', 'Archivée',
] as const;

export const ID_TYPES = ['CIN', 'Passeport', 'Carte de résident', 'Autre'];
export const LAND_CATEGORIES = ['Terrain nu', 'Terrain bâti', 'Terrain agricole', 'Lotissement', 'Terrain commercial', 'Autre'];
export const RELIEFS = ['Terrain plat', 'Faible dénivelé', 'Pente douce', 'Dénivelé modéré', 'Pente forte', 'Dénivelé important'];
export const ACCESSES = ['Route goudronnée', 'Route pavée', 'Piste carrossable', 'Accès piéton'];
export const YES_NO_NEAR = ['Oui', 'Non', 'À proximité'];
export const OCCUPATIONS = ['Libre', 'Occupé', 'Loué', 'Exploité', 'Autre'];
export const USAGES = ['Résidentiel', 'Commercial', 'Industriel', 'Agricole', 'Hôtelier', 'Lotissement', 'Autre'];
export const DOC_CATEGORIES = [
  'Titre foncier', 'Certificat foncier', 'Plan du terrain', 'Acte de vente', 'Certificat juridique',
  'Certificat de situation juridique', 'Plan cadastral', 'Procuration', 'Autre document',
];
export const DOC_STATUSES = ['À vérifier', 'Vérifié', 'Incomplet', 'Rejeté'] as const;
export const SALE_PAYMENT = ['Comptant – paiement en une fois', 'Facilité – paiement échelonné', 'Les deux – comptant ou facilité'];
export const MAX_DURATIONS = ['0–4 mois', '4–6 mois', '6–10 mois', '10–12 mois', 'Autre durée'];
// [libellé, pourcentage minimum utilisé pour le calcul de l'acompte]
export const DEPOSITS: [string, number][] = [
  ['15–25 %', 15], ['25–35 %', 25], ['35–45 %', 35], ['45–55 %', 45], ['55–65 %', 55], ['65–80 %', 65], ['80–100 %', 80], ['Personnalisé', 0],
];
export const FREQUENCIES = ['Mensuelle', 'Bimestrielle', 'Trimestrielle', 'Personnalisée'];
export const LAND_STATUSES = [
  'Brouillon', 'Nouveau', 'Dossier incomplet', 'À vérifier', 'Vérification terrain programmée', 'Vérification juridique',
  'Validé', 'Publié', 'En négociation', 'Réservé', 'Vendu', 'Rejeté', 'Archivé',
] as const;
export const CHECKLIST = [
  'Identité du propriétaire vérifiée',
  'Documents fonciers complets',
  'Visite terrain effectuée',
  'Limites et bornage confirmés',
  'Situation juridique vérifiée',
  'Prix validé par l’agence',
  'Photos conformes (vue générale, accès, limites)',
];

export type Priority = (typeof PRIORITIES)[number];
export type BuyStatus = (typeof BUY_STATUSES)[number];
export type LandFileStatus = (typeof LAND_STATUSES)[number];
export type DocStatus = (typeof DOC_STATUSES)[number];

// ---------- Types communs ----------
export interface HistoryEntry { id: string; at: string; author: string; text: string }
export interface Note { id: string; at: string; author: string; text: string }
export interface Contact { id: string; at: string; channel: 'Appel' | 'Email' | 'SMS' | 'WhatsApp' | 'Visite' | 'Autre'; summary: string }
export interface Task { id: string; due: string; text: string; done: boolean }

// Action planifiée avec un client (appel, rendez-vous…). Une fois faite, son résultat est versé à l'historique.
export const ACTION_TYPES = ['Appel', 'Rendez-vous', 'Visite du terrain', 'Email', 'WhatsApp / SMS', 'Relance', 'Signature', 'Autre'] as const;
export type ActionType = (typeof ACTION_TYPES)[number];
export interface PlannedAction { id: string; type: ActionType; at: string; note: string; done: boolean; doneAt?: string; result?: string }
// Fichier téléversé : contenu dans IndexedDB (clé = id), ou lien externe (url) pour les données d'exemple.
export interface StoredFile { id: string; name: string; type: string; size: number; url?: string }

export interface Person {
  firstName: string;
  lastName: string;
  dialCode: string;
  phone: string;
  email: string;
  birthDate: string;
  profession: string;
  country: string;
  countryOther: string;
  address: string;
  hasBankAccount: 'Oui' | 'Non' | '';
  bank: string;
}

// ---------- Demande d'achat ----------
export interface BuyRequest extends Person {
  id: string;
  ref: string;
  createdAt: string;
  updatedAt: string;
  source: string;
  /** Type de demande : achat (interet) ou visite — distingué dans la liste. */
  kind?: 'interet' | 'visite' | 'recherche' | 'vente';
  /** Créneau souhaité par le visiteur (demandes de visite du site public). */
  visitDate?: string;
  visitTime?: string;
  /** Commentaire laissé par le visiteur (formulaires du site public). */
  message?: string;
  paymentMode: string;
  budgetMin: number;
  budgetMax: number;
  deposit: number;
  paymentDuration: string;
  propertyType: string;
  region: string;
  district: string;
  commune: string;
  fokontany: string;
  areaMin: number;
  areaMax: number;
  criteria: string;
  goal: string;
  deadline: string;
  extraInfo: string;
  consent: boolean;
  agent: string;
  priority: Priority;
  status: BuyStatus;
  nextFollowUp: string;
  visitAt: string;
  notes: Note[];
  contacts: Contact[];
  attachments: StoredFile[];
  history: HistoryEntry[];
  clientId?: string; // fiche dans la base clients
  landId: string; // terrain du catalogue que le client veut acheter (obligatoire)
  lotId?: string; // parcelle choisie, si le terrain est loti
  actions: PlannedAction[];
}

// ---------- Dossier terrain ----------
export interface LandDoc extends StoredFile { category: string; number: string; issuedAt: string; ownerName: string; status: DocStatus }

export interface LandFile {
  id: string;
  createdAt: string;
  updatedAt: string;
  // Propriétaire
  ownerId: string;
  owner: Person & { accountNumber: string };
  idDoc: { type: string; number: string; issuedAt: string; expiresAt: string; authority: string; file?: StoredFile };
  // Terrain
  ref: string;
  title: string;
  category: string;
  area: number;
  price: number;
  pricePerM2: number;
  pricePerM2Manual: boolean;
  negotiable: 'Oui' | 'Non';
  description: string;
  relief: string;
  accesses: string[];
  roadWidth: string;
  distanceMainRoad: string;
  water: string;
  electricity: string;
  mobile: 'Oui' | 'Non' | '';
  internet: 'Oui' | 'Non' | '';
  sanitation: string;
  fence: 'Oui' | 'Non' | '';
  building: 'Oui' | 'Non' | '';
  buildingDesc: string;
  occupation: string;
  immediate: 'Oui' | 'Non' | '';
  usage: string;
  // Localisation
  region: string;
  regionOther: string;
  district: string;
  commune: string;
  fokontany: string;
  addressHint: string;
  landmark: string;
  lat?: number;
  lng?: number;
  // Médias
  photos: StoredFile[]; // la première est la photo principale
  video?: StoredFile;
  documents: LandDoc[];
  // Conditions de vente
  salePayment: string;
  maxDuration: string;
  maxDurationOther: string;
  depositRange: string;
  depositCustom: number;
  frequency: string;
  frequencyOther: string;
  saleNegotiable: 'Oui' | 'Non';
  negotiationMargin: string;
  specialConditions: string;
  ownerComments: string;
  // Suivi interne
  agent: string;
  receivedAt: string;
  priority: Priority;
  status: LandFileStatus;
  fieldCheck: string;
  legalCheck: string;
  internalEstimate: number;
  recommendedPrice: number;
  commission: number;
  internalComments: string;
  checklist: string[];
  visitAt: string;
  notes: Note[];
  tasks: Task[];
  history: HistoryEntry[];
  actions: PlannedAction[]; // planification (appels, visites, rendez-vous avec le propriétaire)
  decision?: 'Validé' | 'Refusé'; // décision finale : le dossier part ensuite dans les archives
  decisionReason?: string;
  decidedAt?: string;
}

// ---------- Calculs ----------
export const pricePerM2 = (price: number, area: number) => (area > 0 ? Math.round(price / area) : 0);

export function depositPercent(f: Pick<LandFile, 'depositRange' | 'depositCustom'>) {
  if (f.depositRange === 'Personnalisé') return f.depositCustom || 0;
  return DEPOSITS.find(([l]) => l === f.depositRange)?.[1] ?? 0;
}

export const fullName = (p: Pick<Person, 'firstName' | 'lastName'>) => `${p.firstName} ${p.lastName}`.trim();
export const phoneOf = (p: Pick<Person, 'dialCode' | 'phone'>) => `${p.dialCode} ${p.phone}`.trim();
export const ACTOR = 'Administrateur';

export function historyEntry(text: string): HistoryEntry {
  return { id: newId(), at: new Date().toISOString(), author: ACTOR, text };
}

// Référence provisoire (l'API en génère une définitive à l'enregistrement).
function nextRef(prefix: string) {
  return `${prefix}-${new Date().getFullYear()}-${String(1000 + (Number(newId().slice(-3)) % 9000))}`;
}

// ---------- Persistance : cache hydraté depuis l'API Laravel ----------
// (voir crm/sync.ts : lecture synchrone dans le cache, écritures vers l'API)

import { saveRequestApi, saveLandFileApi, deleteApi } from '../../services/adminService';
import { cache, upsertSync, replaceSync, removeSync } from './sync';

export function getBuyRequests(): BuyRequest[] {
  return cache.requests.map((r, i) => ({
    ...r,
    clientId: r.clientId ?? `cli-${r.id}`,
    landId: r.landId ?? String((i % 12) + 1),
    kind: r.kind ?? 'interet',
    history: r.history ?? [], notes: r.notes ?? [], contacts: r.contacts ?? [],
    attachments: r.attachments ?? [], actions: r.actions ?? [],
  }));
}
export function getBuyRequest(id: string) {
  return getBuyRequests().find((r) => r.id === id);
}

/** Enregistre une demande : visible immédiatement (cache), persistée vers l'API.
    Retourne l'objet tel que stocké (id serveur une fois la réponse arrivée). */
export async function saveBuyRequest(r: BuyRequest): Promise<BuyRequest> {
  const item: BuyRequest = { ...r, updatedAt: new Date().toISOString() };
  upsertSync('requests', item);
  try {
    const server = await saveRequestApi(item);
    replaceSync('requests', item.id, { ...item, ...server } as BuyRequest);
    return { ...item, ...server } as BuyRequest;
  } catch {
    return item; // erreur réseau : la version du cache reste affichée
  }
}
export async function deleteBuyRequest(id: string): Promise<void> {
  removeSync('requests', id);
  if (/^\d+$/.test(id)) await deleteApi('requests', id).catch(() => {});
}

export function getLandFiles(): LandFile[] {
  return cache.landFiles.map((f) => ({
    ...f,
    photos: f.photos ?? [], documents: f.documents ?? [], accesses: f.accesses ?? [],
    checklist: f.checklist ?? [], history: f.history ?? [], actions: f.actions ?? [],
  }));
}
export function getLandFile(id: string) {
  return getLandFiles().find((f) => f.id === id);
}
export async function saveLandFile(f: LandFile): Promise<LandFile> {
  const item: LandFile = { ...f, updatedAt: new Date().toISOString() };
  upsertSync('landFiles', item);
  try {
    const server = await saveLandFileApi(item);
    replaceSync('landFiles', item.id, { ...item, ...server } as LandFile);
    return { ...item, ...server } as LandFile;
  } catch {
    return item;
  }
}
export async function deleteLandFile(id: string): Promise<void> {
  removeSync('landFiles', id);
  if (/^\d+$/.test(id)) await deleteApi('land-files', id).catch(() => {});
}

// ---------- Nouveaux dossiers ----------

// ---------- Nouveaux dossiers ----------
const emptyPerson = (): Person => ({
  firstName: '', lastName: '', dialCode: '+261', phone: '', email: '', birthDate: '', profession: '',
  country: 'Madagascar', countryOther: '', address: '', hasBankAccount: '', bank: '',
});

export function newBuyRequest(): BuyRequest {
  const now = new Date().toISOString();
  return {
    ...emptyPerson(),
    id: newId(), ref: nextRef('ACH'), createdAt: now, updatedAt: now, source: 'Site web',
    paymentMode: '', budgetMin: 0, budgetMax: 0, deposit: 0, paymentDuration: '', propertyType: 'Terrain',
    region: 'Analamanga', district: '', commune: '', fokontany: '', areaMin: 0, areaMax: 0, criteria: '',
    goal: '', deadline: '', extraInfo: '', consent: false, agent: AGENTS[0], priority: 'Normale', status: 'Nouvelle',
    nextFollowUp: '', visitAt: '', notes: [], contacts: [], attachments: [], history: [historyEntry('Dossier créé')],
    landId: '', actions: [],
  };
}

export function newLandFile(): LandFile {
  const now = new Date().toISOString();
  return {
    id: newId(), createdAt: now, updatedAt: now,
    ownerId: `PROP-${newId().slice(-6).toUpperCase()}`,
    owner: { ...emptyPerson(), accountNumber: '' },
    idDoc: { type: 'CIN', number: '', issuedAt: '', expiresAt: '', authority: '' },
    ref: nextRef('TER'), title: '', category: 'Terrain nu', area: 0, price: 0, pricePerM2: 0, pricePerM2Manual: false,
    negotiable: 'Non', description: '', relief: '', accesses: [], roadWidth: '', distanceMainRoad: '', water: '',
    electricity: '', mobile: '', internet: '', sanitation: '', fence: '', building: '', buildingDesc: '',
    occupation: 'Libre', immediate: '', usage: 'Résidentiel',
    region: 'Analamanga', regionOther: '', district: '', commune: '', fokontany: '', addressHint: '', landmark: '',
    photos: [], documents: [],
    salePayment: '', maxDuration: '', maxDurationOther: '', depositRange: '', depositCustom: 0, frequency: 'Mensuelle',
    frequencyOther: '', saleNegotiable: 'Non', negotiationMargin: '', specialConditions: '', ownerComments: '',
    agent: AGENTS[0], receivedAt: now.slice(0, 10), priority: 'Normale', status: 'Brouillon', fieldCheck: '', legalCheck: '',
    internalEstimate: 0, recommendedPrice: 0, commission: 5, internalComments: '', checklist: [], visitAt: '',
    notes: [], tasks: [], history: [historyEntry('Dossier créé')], actions: [],
  };
}

// ---------- Données fictives ----------
