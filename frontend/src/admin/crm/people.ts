// Base clients, recherches de terrain spécifiques et réalisations.
// Persistance : cache hydraté depuis l'API Laravel (voir crm/sync.ts).
import { newId } from '../../lib/store';
import { HistoryEntry, StoredFile, historyEntry } from './model';

// ======================= CLIENTS =======================
// Mêmes champs que le formulaire de réservation du site.
export interface Client {
  id: string;
  ref: string;
  createdAt: string;
  source: 'Site web' | 'Backoffice';
  fullName: string;
  phone: string;
  email: string;
  budget: string;
  profession: string;
  age: string;
  nationality: string;
  bankAccount: string;
  message: string;
}

export type ClientFields = Omit<Client, 'id' | 'ref' | 'createdAt' | 'source'>;
export const emptyClientFields = (): ClientFields => ({
  fullName: '', phone: '', email: '', budget: '', profession: '', age: '', nationality: '', bankAccount: '', message: '',
});


// ======================= RECHERCHES SPÉCIFIQUES =======================

export const SEARCH_STATUSES = ['Nouvelle', 'En recherche', 'Terrains proposés', 'Visite programmée', 'Trouvé', 'Clôturée'] as const;
export const SEARCH_USAGES = ['Habitation', 'Investissement', 'Commerce', 'Agriculture', 'Hôtellerie / tourisme', 'Autre'];
export const RADIUS_OPTIONS = [1, 2, 5, 10, 20, 50];
export type SearchStatus = (typeof SEARCH_STATUSES)[number];

export interface Proposal { id: string; landId: string; lotId?: string; at: string; note: string; answer: 'En attente' | 'Intéressé' | 'Pas intéressé' | 'Visite demandée' }

export interface SpecificSearch {
  id: string;
  ref: string;
  createdAt: string;
  source: 'Site web' | 'Backoffice';
  clientId: string;
  // Coordonnées (copiées pour l'affichage même si le client est supprimé)
  fullName: string;
  phone: string;
  email: string;
  // Besoin
  usage: string;
  budgetMax: number;
  areaMin: number;
  areaMax: number;
  // Localisation
  mainZone: string; // Zone principale recherchée
  otherZones: string; // Autres zones acceptées
  targetZone: string; // Zone ciblée (quartier, repère…)
  lat?: number;
  lng?: number;
  radiusKm: number; // Rayon suggéré
  flexible: 'Oui' | 'Non'; // Êtes-vous flexible sur la localisation ?
  suggestNearby: boolean; // Proposez-moi les zones proches
  criteria: string;
  // Suivi
  status: SearchStatus;
  proposals: Proposal[];
  history: HistoryEntry[];
}

export type SearchFields = Omit<SpecificSearch, 'id' | 'ref' | 'createdAt' | 'clientId' | 'status' | 'proposals' | 'history' | 'source'>;
export const emptySearchFields = (): SearchFields => ({
  fullName: '', phone: '', email: '', usage: 'Habitation', budgetMax: 0, areaMin: 0, areaMax: 0,
  mainZone: '', otherZones: '', targetZone: '', radiusKm: 5, flexible: 'Oui', suggestNearby: true, criteria: '',
});

// ======================= RÉALISATIONS =======================

export const REALISATION_CATEGORIES = ['Construction de maison', 'Villa', 'Immeuble', 'Lotissement', 'Aménagement de terrain', 'Rénovation', 'Local commercial', 'Autre'];

export interface Realisation {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  category: string;
  location: string;
  completedAt: string; // AAAA-MM
  client: string; // nom affiché (facultatif)
  area: number;
  duration: string;
  description: string;
  photos: StoredFile[]; // la première est la photo de couverture
  published: boolean;
  featured: boolean;
}

// ---------- Persistance : cache hydraté depuis l'API Laravel ----------
// (voir crm/sync.ts : lecture synchrone, écritures vers l'API)

import { saveClientApi, saveSearchApi, saveRealisationApi, deleteApi } from '../../services/adminService';
import { cache, upsertSync, replaceSync, removeSync } from './sync';

export function getClients(): Client[] {
  return cache.clients;
}
export const getClient = (id: string) => getClients().find((c) => c.id === id);

export async function createClient(fields: ClientFields, source: Client['source']): Promise<Client> {
  const temp: Client = { ...fields, id: `tmp-${newId()}`, ref: '', createdAt: new Date().toISOString(), source };
  upsertSync('clients', temp);
  try {
    const server = await saveClientApi({ ...temp, source });
    replaceSync('clients', temp.id, server as Client);
    return server as Client;
  } catch {
    return temp;
  }
}

export async function saveClient(c: Client): Promise<Client> {
  upsertSync('clients', c);
  try {
    const server = await saveClientApi(c);
    replaceSync('clients', c.id, server as Client);
    return server as Client;
  } catch {
    return c;
  }
}

export async function deleteClient(id: string): Promise<void> {
  removeSync('clients', id);
  if (/^\d+$/.test(id)) await deleteApi('clients', id).catch(() => {});
}

/** Rapproche une fiche client par téléphone/email, la crée sinon. */
export async function findOrCreateClient(fields: Partial<ClientFields>, source: Client['source']): Promise<Client> {
  const phone = (fields.phone ?? '').trim();
  const email = (fields.email ?? '').trim().toLowerCase();
  const found = getClients().find(
    (c) => (email && c.email.toLowerCase() === email) || (phone && c.phone === phone),
  );
  if (found) return found;
  return createClient({ ...emptyClientFields(), ...fields } as ClientFields, source);
}

export function splitName(fullName: string) {
  const [firstName = '', ...rest] = fullName.trim().split(/\s+/);
  return { firstName, lastName: rest.join(' ') };
}

export function getSearches(): SpecificSearch[] {
  return cache.searches.map((s) => ({ ...s, proposals: s.proposals ?? [], history: s.history ?? [] }));
}
export const getSearch = (id: string) => getSearches().find((s) => s.id === id);

export async function saveSearch(s: SpecificSearch): Promise<SpecificSearch> {
  upsertSync('searches', s);
  try {
    const server = await saveSearchApi(s);
    replaceSync('searches', s.id, server as SpecificSearch);
    return server as SpecificSearch;
  } catch {
    return s;
  }
}

export async function deleteSearch(id: string): Promise<void> {
  removeSync('searches', id);
  if (/^\d+$/.test(id)) await deleteApi('searches', id).catch(() => {});
}

/** Crée une recherche (fiche « Recherches spécifiques ») rattachée à un client. */
export async function createSearch(
  fields: SearchFields,
  source: SpecificSearch['source'],
  clientFields?: Partial<ClientFields>,
): Promise<SpecificSearch> {
  const client = await findOrCreateClient(
    { fullName: fields.fullName, phone: fields.phone, email: fields.email, ...clientFields },
    source,
  );
  const temp: SpecificSearch = {
    ...fields,
    id: `tmp-${newId()}`,
    ref: '',
    createdAt: new Date().toISOString(),
    clientId: client.id,
    status: 'Nouvelle',
    proposals: [],
    history: [historyEntry(source === 'Site web' ? 'Recherche reçue depuis le site web' : 'Recherche créée dans le backoffice')],
    source,
  };
  upsertSync('searches', temp);
  try {
    const server = await saveSearchApi(temp);
    replaceSync('searches', temp.id, server as SpecificSearch);
    return server as SpecificSearch;
  } catch {
    return temp;
  }
}

export function getRealisations(): Realisation[] {
  // Certaines photos peuvent être de simples URL (données seedées) :
  // on les normalise en fiches de fichiers pour l'écran admin.
  const asFile = (p: StoredFile | string): StoredFile =>
    typeof p === 'string'
      ? { id: `seed-${p}`, name: p.split('/').pop() ?? p, type: 'image/jpeg', size: 0, url: p }
      : p;
  return cache.realisations.map((r) => ({ ...r, photos: (r.photos ?? []).map(asFile) }));
}
export async function saveRealisation(r: Realisation): Promise<Realisation> {
  const item = { ...r, updatedAt: new Date().toISOString() };
  upsertSync('realisations', item);
  try {
    const server = await saveRealisationApi(item);
    replaceSync('realisations', item.id, server as Realisation);
    return server as Realisation;
  } catch {
    return item;
  }
}
export async function deleteRealisation(id: string): Promise<void> {
  removeSync('realisations', id);
  if (/^\d+$/.test(id)) await deleteApi('realisations', id).catch(() => {});
}

export function newRealisation(): Realisation {
  return {
    id: `tmp-${newId()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    title: '', category: REALISATION_CATEGORIES[0], location: '', completedAt: '', client: '',
    area: 0, duration: '', description: '', photos: [], published: false, featured: false,
  };
}

// newId/histopryEntry viennent du modèle commun (lib/store + crm/model)
