/* ==========================================================================
   Service « Réalisations » — lectures de l'API Laravel (back office →
   site public). Photos servies par URL.
   ========================================================================== */

import { apiGet } from './apiClient';

export interface Realisation {
  id: string;
  title: string;
  category: string;
  location: string;
  completedAt: string; // AAAA-MM
  client: string;
  area: number;
  duration: string;
  description: string;
  photos: string[];
  published: boolean;
  featured: boolean;
  createdAt: string;
}

/** Réalisations publiées (GET /api/v1/realisations). */
export async function getPublishedRealisations(): Promise<Realisation[]> {
  const res = await apiGet<{ data: Realisation[] }>('/realisations');
  return res.data;
}
