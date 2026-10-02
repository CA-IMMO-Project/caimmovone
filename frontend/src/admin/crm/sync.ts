/* ==========================================================================
   Cache back office — le pont entre l'API Laravel et les écrans admin.
   Les écrans lisent les collections de façon SYNCHRONE (comme avant, avec
   le localStorage) ; ce cache est hydraté une fois par session depuis
   GET /api/v1/admin/bootstrap, et chaque sauvegarde repart vers l'API.

   Conséquence : plus AUCUNE donnée métier ne vit dans le navigateur —
   PostgreSQL est la source de vérité, partagée avec le site public.
   ========================================================================== */

import type { ContactMessage, Land } from '../../types';
import type { BuyRequest, LandFile } from './model';
import type { Client, Realisation, SpecificSearch } from './people';

export const cache = {
  lands: [] as Land[],
  requests: [] as BuyRequest[],
  landFiles: [] as LandFile[],
  clients: [] as Client[],
  searches: [] as SpecificSearch[],
  realisations: [] as Realisation[],
  messages: [] as ContactMessage[],
};

let hydrated = false;
export const isHydrated = () => hydrated;

/** Remplit le cache depuis la réponse de /admin/bootstrap. */
export function hydrate(data: {
  lands?: Land[];
  requests?: BuyRequest[];
  clients?: Client[];
  searches?: SpecificSearch[];
  landFiles?: LandFile[];
  realisations?: Realisation[];
  messages?: ContactMessage[];
}) {
  cache.lands = data.lands ?? [];
  cache.requests = data.requests ?? [];
  cache.clients = data.clients ?? [];
  cache.searches = data.searches ?? [];
  cache.landFiles = data.landFiles ?? [];
  cache.realisations = data.realisations ?? [];
  cache.messages = data.messages ?? [];
  hydrated = true;
}

export function resetCache() {
  hydrate({});
  hydrated = false;
}

/* --- Helpers d'upsert optimiste : la donnée est visible immédiatement,
       puis remplacée par la version serveur quand la réponse arrive. --- */

export function upsertSync<K extends keyof typeof cache>(
  key: K,
  item: (typeof cache)[K][number],
  serverItem?: (typeof cache)[K][number],
): void {
  const list = cache[key] as { id: string }[];
  const target = serverItem ?? item;
  const i = list.findIndex((x) => x.id === item.id || (serverItem && x.id === serverItem.id));
  if (i >= 0) list[i] = target as never;
  else list.unshift(target as never);
}

export function replaceSync<K extends keyof typeof cache>(key: K, tempId: string, serverItem: (typeof cache)[K][number]): void {
  const list = cache[key] as { id: string }[];
  const i = list.findIndex((x) => x.id === tempId);
  if (i >= 0) list[i] = serverItem as never;
}

export function removeSync<K extends keyof typeof cache>(key: K, id: string): void {
  const list = cache[key] as { id: string }[];
  const i = list.findIndex((x) => x.id === id);
  if (i >= 0) list.splice(i, 1);
}
