/* ==========================================================================
   Fonds de carte partagés (site public + back office).

   Deux fonds superposés :
     · « Plan »      : OpenStreetMap — couvre tout Madagascar ;
     · « Satellite » : imagerie Esri World Imagery (gratuite, sans clé d'API).

   ── Le piège des tuiles grises ────────────────────────────────────────────
   Esri ne sert pas d'image partout. Là où la couverture s'arrête, le serveur
   ne renvoie PAS d'erreur : il renvoie une tuile grise portant la mention
   « Map data not yet available », avec un code HTTP 200. Un `tileerror`
   Leaflet ne la voit donc jamais — d'où l'impression de « bug ».

   Mesures faites sur le service réel, tuile par tuile (octobre 2026) :
     · tuile grise Esri ...... 2 521 octets, (205, 205, 205), variance ≈ 9 ;
     · imagerie réelle ....... variance 160 à 3 000 selon le terrain ;
     · tuile OSM sans donnée . 103 octets, (242, 239, 233), variance ≈ 0.
   Chacune se reconnaît donc à sa couleur ET à son uniformité : c'est ce que
   fait ce fichier, en lisant 8 × 8 pixels par tuile (Esri et OSM autorisent le
   cross-origin, vérifié sur les en-têtes réels).

   Couverture relevée (dernier zoom où l'image est réelle) :
     · Antananarivo / Ivato (capitale) ........ z19 (le maximum) ;
     · Toamasina, Mahajanga, Nosy Be .......... z17 ;
     · Brickaville, Ivato-Ambositra (rural) ... z17 (moins en brousse).

   ── Ce que fait ce composant ──────────────────────────────────────────────
   1. Le plan OSM est TOUJOURS chargé sous l'imagerie.
   2. Chaque tuile chargée est analysée.
   3. Tuile grise « pas de données » (satellite) ou tuile vide (plan) : elle est
      masquée, et la carte redescend d'un niveau si l'on est plus près que ce
      qui existe ici. Le gris « Map data not yet available » ne s'affiche donc
      plus jamais, et la carte ne reste pas bloquée sur une zone vide.
   4. Une fois le dernier niveau plein atteint (au minimum z17), on cesse de
      lutter : le fond inférieur (le plan) prend le relais et l'interface
      explique la limite (voir `onGap`).

   ── Et sans aller-retour de zoom ──────────────────────────────────────────
   Un niveau totalement vide est mémorisé pour la zone affichée, et cette
   mémoire s'efface dès que l'on se déplace de plus de 400 m : impossible que la
   carte dézoome deux fois de suite au même endroit, alors qu'à Antananarivo,
   dix kilomètres plus loin, z19 reste accessible. Comportement identique à
   chaque essai.
   ========================================================================== */

import { useEffect, useRef } from 'react';
import { TileLayer, useMap } from 'react-leaflet';

export const OSM_PLAN_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const ESRI_IMAGERY_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

/** Zoom maximal demandable par l'utilisateur (molette, pincement, boutons +). */
export const MAP_MAX_ZOOM = 19;

/** Jusqu'à ce zoom, l'imagerie existe pour la quasi-totalité des zones
    habitées de Madagascar. Au-delà, la carte vérifie tuile par tuile. */
export const IMAGERY_SAFE_ZOOM = 17;

/** Tuile grise « Map data not yet available » (imagerie Esri absente). */
const ESRI_GREY = 205;
const GREY_TOLERANCE = 25;
const GREY_MAX_VARIANCE = 400;

/** Tuile OpenStreetMap sans aucun détail (rase campagne non cartographiée). */
const OSM_EMPTY: [number, number, number] = [242, 239, 233];
const EMPTY_TOLERANCE = 6;
const EMPTY_MAX_VARIANCE = 3;

/** Nombre de tuiles en échec avant d'afficher l'avertissement réseau. */
const TILE_ERROR_THRESHOLD = 6;

/** Déplacement (en degrés, ~400 m) au-delà duquel la couverture est réévaluée. */
const MOVE_RESET_DEG = 0.004;

/** Part des tuiles d'un fond qui doit manquer pour l'annoncer à l'utilisateur.
    Une tuile isolée n'est pas un problème à signaler : parler à chaque fois
    ferait du bruit et donnerait l'impression d'une carte capricieuse. */
const IMAGERY_GAP_SHARE = 0.25;
const PLAN_GAP_SHARE = 0.5;

export interface MapGap {
  /**
   * La photo satellite s'arrête avant ce niveau de zoom à cet endroit (tuile
   * manquante affichée, ou zoom bridé au dernier niveau réellement couvert).
   */
  imagery: boolean;
  /** Le plan lui-même n'a plus de détail à ce zoom (zone non cartographiée). */
  plan: boolean;
}

/** Analyse 8 × 8 pixels de la tuile : grise « pas de photo » ? vide de plan ? */
function classify(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement,
): 'imagery-grey' | 'plan-empty' | 'ok' {
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return 'ok';
    canvas.width = 8;
    canvas.height = 8;
    ctx.drawImage(img, 0, 0, 8, 8);
    const { data } = ctx.getImageData(0, 0, 8, 8);
    const n = data.length / 4;
    const mean = [0, 0, 0];
    for (let i = 0; i < data.length; i += 4) {
      mean[0] += data[i];
      mean[1] += data[i + 1];
      mean[2] += data[i + 2];
    }
    mean[0] /= n;
    mean[1] /= n;
    mean[2] /= n;
    let variance = 0;
    for (let i = 0; i < data.length; i += 4) variance += (data[i] - mean[0]) ** 2;
    variance /= n;

    if (
      variance < GREY_MAX_VARIANCE &&
      mean.every((v) => Math.abs(v - ESRI_GREY) < GREY_TOLERANCE)
    ) {
      return 'imagery-grey';
    }
    if (
      variance < EMPTY_MAX_VARIANCE &&
      mean.every((v, i) => Math.abs(v - OSM_EMPTY[i]) < EMPTY_TOLERANCE)
    ) {
      return 'plan-empty';
    }
    return 'ok';
  } catch {
    // Canvas « tainted » (en-têtes CORS absents) : on ne bloque rien.
    return 'ok';
  }
}

export function BaseMapLayer({
  satellite,
  onGap,
  onImageryUnavailable,
}: {
  satellite: boolean;
  /** Signale à l'interface ce qui manque à cet endroit (message explicatif). */
  onGap?: (gap: MapGap) => void;
  /** Appelé une seule fois quand le serveur d'imagerie ne répond plus (hors ligne…). */
  onImageryUnavailable?: () => void;
}) {
  const map = useMap();
  const errors = useRef(0);

  const canvas = useRef<HTMLCanvasElement | null>(null);
  if (!canvas.current && typeof document !== 'undefined') {
    canvas.current = document.createElement('canvas');
  }

  /** Tuiles vides actuellement à l'écran, par fond. */
  const empties = useRef<{ plan: Set<HTMLElement>; imagery: Set<HTMLElement> }>({
    plan: new Set(),
    imagery: new Set(),
  });
  /** Nombre de tuiles chargées / vides à l'écran, par fond (pour les seuils). */
  const counts = useRef<{
    plan: { loaded: number; empty: number };
    imagery: { loaded: number; empty: number };
  }>({ plan: { loaded: 0, empty: 0 }, imagery: { loaded: 0, empty: 0 } });
  /** Niveaux de zoom constatés sans donnée pour la zone actuellement affichée. */
  const emptyZooms = useRef<{ plan: Set<number>; imagery: Set<number> }>({
    plan: new Set(),
    imagery: new Set(),
  });
  const lastCenter = useRef<{ lat: number; lng: number } | null>(null);
  const reported = useRef<string>('');

  // Les tuiles mises de côté appartiennent à la couche précédente : on repart propre.
  useEffect(() => {
    empties.current.plan.clear();
    empties.current.imagery.clear();
    emptyZooms.current.plan.clear();
    emptyZooms.current.imagery.clear();
    counts.current = { plan: { loaded: 0, empty: 0 }, imagery: { loaded: 0, empty: 0 } };
    reported.current = '';
    onGap?.({ imagery: false, plan: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [satellite]);

  /* — Changement de zone : la couverture change, on repart de zéro. — */
  useEffect(() => {
    const onMoveEnd = () => {
      const c = map.getCenter();
      const prev = lastCenter.current;
      lastCenter.current = { lat: c.lat, lng: c.lng };
      if (!prev) return;
      if (Math.abs(prev.lat - c.lat) < MOVE_RESET_DEG && Math.abs(prev.lng - c.lng) < MOVE_RESET_DEG) {
        return;
      }
      emptyZooms.current.plan.clear();
      emptyZooms.current.imagery.clear();
    };
    map.on('moveend', onMoveEnd);
    const onZoomEnd = () => report();
    map.on('zoomend', onZoomEnd);
    return () => {
      map.off('moveend', onMoveEnd);
      map.off('zoomend', onZoomEnd);
    };
  }, [map]);

  const report = () => {
    const zoom = map.getZoom();
    const share = (kind: 'plan' | 'imagery') => {
      const { loaded, empty } = counts.current[kind];
      return loaded > 0 ? empty / loaded : 0;
    };
    const gap: MapGap = {
      // Soit une part notable des tuiles manque maintenant, soit on sait que ce
      // niveau n'existe pas ici (zoom proche du plafond) : dans les deux cas
      // l'interface doit l'expliquer.
      imagery:
        share('imagery') >= IMAGERY_GAP_SHARE ||
        (emptyZooms.current.imagery.size > 0 && zoom >= IMAGERY_SAFE_ZOOM),
      plan:
        share('plan') >= PLAN_GAP_SHARE ||
        emptyZooms.current.plan.size > 0,
    };
    const key = `${gap.imagery}|${gap.plan}`;
    if (key !== reported.current) {
      reported.current = key;
      onGap?.(gap);
    }
  };

  /** Comportement commun aux deux fonds : masquer la tuile inutile, et
      redescendre d'un niveau si l'on est plus près que ce qui existe ici. */
  const handle = (kind: 'plan' | 'imagery', tile: HTMLImageElement) => {
    if (!canvas.current) return;
    const verdict = classify(tile, canvas.current);
    const expected = kind === 'imagery' ? 'imagery-grey' : 'plan-empty';

    counts.current[kind].loaded += 1;

    if (verdict !== expected) {
      // Tuile utile à ce niveau de zoom : la zone est cartographiée ici.
      emptyZooms.current[kind].delete(map.getZoom());
      if (empties.current[kind].delete(tile)) {
        counts.current[kind].empty = Math.max(0, counts.current[kind].empty - 1);
        report();
      }
      return;
    }

    // Tuile sans donnée → masquée (le fond inférieur apparaît à sa place).
    if (!empties.current[kind].has(tile)) counts.current[kind].empty += 1;
    tile.style.visibility = 'hidden';
    empties.current[kind].add(tile);

    const zoom = map.getZoom();
    emptyZooms.current[kind].add(zoom);

    const other = kind === 'plan' ? 'imagery' : 'plan';
    const totallyBlank =
      zoom > IMAGERY_SAFE_ZOOM &&
      emptyZooms.current.plan.has(zoom) &&
      emptyZooms.current.imagery.has(zoom);

    if (totallyBlank) {
      // Ni photo ni plan : il n'y a rien à voir de plus près, on redescend au
      // plus près en sautant les niveaux déjà vides ici.
      let target = zoom - 1;
      while (target > IMAGERY_SAFE_ZOOM && emptyZooms.current[other].has(target) && emptyZooms.current[kind].has(target)) {
        target -= 1;
      }
      map.setZoom(target);
      return;
    }
    report();
  };

  const unload = (kind: 'plan' | 'imagery', tile: HTMLImageElement | undefined) => {
    if (!tile) return;
    counts.current[kind].loaded = Math.max(0, counts.current[kind].loaded - 1);
    if (empties.current[kind].delete(tile)) {
      counts.current[kind].empty = Math.max(0, counts.current[kind].empty - 1);
    }
    report();
  };

  const planHandlers = {
    tileload: (event: { tile?: HTMLElement }) => {
      const tile = event.tile as HTMLImageElement | undefined;
      if (tile) handle('plan', tile);
    },
    tileunload: (event: { tile?: HTMLElement }) => {
      unload('plan', event.tile as HTMLImageElement | undefined);
    },
  };

  return (
    <>
      {/* Le plan reste chargé sous l'imagerie : c'est lui qui remplace les
          tuiles manquantes, et il couvre tout Madagascar. */}
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url={OSM_PLAN_URL}
        maxNativeZoom={MAP_MAX_ZOOM}
        maxZoom={MAP_MAX_ZOOM}
        zIndex={1}
        crossOrigin="anonymous"
        eventHandlers={planHandlers}
      />

      {satellite && (
        <TileLayer
          attribution="Tiles &copy; Esri"
          url={ESRI_IMAGERY_URL}
          maxNativeZoom={MAP_MAX_ZOOM}
          maxZoom={MAP_MAX_ZOOM}
          zIndex={2}
          crossOrigin="anonymous"
          eventHandlers={{
            tileload: (event) => {
              const tile = event.tile as HTMLImageElement | undefined;
              if (tile) handle('imagery', tile);
            },
            tileunload: (event) => {
              unload('imagery', event.tile as HTMLImageElement | undefined);
            },
            tileerror: () => {
              errors.current += 1;
              if (errors.current === TILE_ERROR_THRESHOLD) onImageryUnavailable?.();
            },
          }}
        />
      )}
    </>
  );
}
