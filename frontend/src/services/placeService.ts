/* ==========================================================================
   Service « Lieux » — géocodage des cartes (site public + back office).

   Source : Nominatim (OpenStreetMap), service ouvert et gratuit, limité à
   Madagascar (les terrains publiés sont tous à Madagascar).

   Règles respectées (politique d'usage de Nominatim) :
   · une requête par frappe après 350 ms d'inactivité, jamais à chaque touche ;
   · pas plus d'une recherche en cours : la précédente est annulée (AbortController) ;
   · identification par l'en-tête Accept-Language pour obtenir des libellés FR.

   ── Biais de proximité (comportement Google Maps) ─────────────────────────
   « Ivato » existe plusieurs fois à Madagascar (Ivato-Antananarivo, Ivato
   d'Ambositra, Ivato de Vohipeno…). Google Maps classe d'abord ce qui entoure
   la zone affichée. On fait pareil : la recherche est biaisée vers la zone
   visible de la carte (`viewbox`), et les propositions situées dans cette zone
   passent devant les autres — l'ordre du service est conservé à l'intérieur de
   chaque groupe, donc rien n'est inventé.

   Toute la logique réseau vit ici : les composants (PlaceSearchBox) ne font
   qu'afficher le résultat. Remplacer Nominatim par un autre fournisseur
   (Google Places, Mapbox…) ne demande donc de toucher que ce fichier.
   ========================================================================== */

export interface Place {
  /** Identifiant stable (osm_type + osm_id) — sert de clé React et d'aria-selected. */
  id: string;
  /** Libellé court du lieu (ex. « Ivato ») — c'est ce qui s'affiche dans le champ. */
  title: string;
  /** Adresse complète (ex. « Ivato, Ambohidratrimo, Analamanga, Madagascar »). */
  subtitle: string;
  lat: number;
  lng: number;
}

interface NominatimResult {
  osm_type?: string;
  osm_id?: number;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  address?: Record<string, string>;
}

const ENDPOINT = 'https://nominatim.openstreetmap.org/search';

/** Nombre maximum de propositions affichées (comme Google Maps : une liste courte). */
const LIMIT = 8;

function toPlace(raw: NominatimResult): Place | null {
  const lat = Number(raw.lat);
  const lng = Number(raw.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const parts = (raw.display_name ?? '').split(',').map((p) => p.trim()).filter(Boolean);
  const title = (raw.name ?? parts[0] ?? 'Lieu').trim();
  const subtitle = parts.filter((p) => p !== title).join(', ');

  return {
    id: `${raw.osm_type ?? 'osm'}-${raw.osm_id ?? `${lat},${lng}`}`,
    title,
    subtitle,
    lat,
    lng,
  };
}

/**
 * Recherche un lieu à Madagascar.
 * @throws Error avec un message affichable quand le service est injoignable.
 */
export async function searchPlaces(
  query: string,
  signal?: AbortSignal,
  near?: { lat: number; lng: number },
): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  // Zone de biais : environ 80 × 55 km autour du centre de la carte affichée
  // (assez large pour couvrir une agglomération, assez serré pour départager
  // deux villages homonymes).
  const box = near
    ? `&viewbox=${(near.lng - 0.35).toFixed(4)},${(near.lat + 0.25).toFixed(4)},` +
      `${(near.lng + 0.35).toFixed(4)},${(near.lat - 0.25).toFixed(4)}`
    : '';

  const url =
    `${ENDPOINT}?format=jsonv2&countrycodes=mg&limit=${LIMIT}` +
    `&addressdetails=1&accept-language=fr${box}&q=${encodeURIComponent(q)}`;

  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: 'application/json' }, signal });
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw error; // annulation volontaire
    throw new Error('Recherche momentanément indisponible — vous pouvez zoomez et cliquer directement sur la carte.');
  }
  if (!res.ok) {
    throw new Error('Recherche momentanément indisponible — vous pouvez zoomez et cliquer directement sur la carte.');
  }

  const data = (await res.json()) as NominatimResult[];
  const places = data.map(toPlace).filter((p): p is Place => p !== null);

  if (!near) return places;

  // Les lieux de la zone affichée d'abord ; les autres restent proposés, plus bas.
  const inBox = (p: Place) =>
    Math.abs(p.lat - near.lat) <= 0.25 && Math.abs(p.lng - near.lng) <= 0.35;
  return [...places.filter(inBox), ...places.filter((p) => !inBox(p))];
}
