import { useState } from 'react';
import { MapContainer, Marker, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Info, LocateFixed, Satellite, Map as MapIcon } from 'lucide-react';
import PlaceSearchBox from './PlaceSearchBox';
import { BaseMapLayer, MAP_MAX_ZOOM, type MapGap } from './mapTiles';
import type { Place } from '../services/placeService';

/* ==========================================================================
   Carte réelle (OpenStreetMap / satellite Esri) pour le site public :
   le visiteur recherche son quartier, zoome, clique pour placer le repère ou
   le déplace à la souris. Les coordonnées GPS réelles (lat/lng) sont
   transmises au backend — mêmes cartes que le back office.

   La recherche et les fonds de carte sont partagés avec le back office
   (`PlaceSearchBox` et `mapTiles`) : un seul comportement à maintenir, et un
   correctif d'affichage profite partout.
   ========================================================================== */

const TANA: [number, number] = [-18.8792, 47.5079];

const pin = L.divIcon({
  className: '',
  html: `<svg width="30" height="38" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 1C6.8 1 1 6.8 1 13.9 1 23.6 14 34.8 14 34.8S27 23.6 27 13.9C27 6.8 21.2 1 14 1Z" fill="#f7c325" stroke="#0b1e42" stroke-width="2"/>
    <circle cx="14" cy="14" r="5.5" fill="#0b1e42"/>
  </svg>`,
  iconSize: [30, 38],
  iconAnchor: [15, 37],
});

function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

export default function GeoMapPicker({ lat, lng, onChange, radiusKm, height = 'h-[22rem]', readOnly = false }: {
  lat?: number | null;
  lng?: number | null;
  onChange?: (lat: number, lng: number) => void;
  radiusKm?: number;
  height?: string;
  /** Affichage seul (fiche terrain) : pas de recherche ni de placement. */
  readOnly?: boolean;
}) {
  const [map, setMap] = useState<L.Map | null>(null);
  const [satellite, setSatellite] = useState(false);
  const [notice, setNotice] = useState('');
  // Ce qui manque à cet endroit : pas de photo satellite, et/ou plan sans
  // détail à ce zoom. Le composant de carte le détecte tuile par tuile.
  const [gap, setGap] = useState<MapGap>({ imagery: false, plan: false });

  const pos: [number, number] | undefined =
    typeof lat === 'number' && Number.isFinite(lat) && typeof lng === 'number' && Number.isFinite(lng)
      ? [lat, lng]
      : undefined;

  const place = (a: number, b: number) => onChange?.(Number(a.toFixed(6)), Number(b.toFixed(6)));

  /* — Choix d'une proposition : on cadre la carte sur le lieu, la liste de
       propositions reste affichée (comportement Google Maps). — */
  const goToPlace = (p: Place) => {
    setNotice('');
    place(p.lat, p.lng);
    map?.setView([p.lat, p.lng], 16);
  };

  const locate = () => {
    setNotice('');
    if (!navigator.geolocation) {
      setNotice('Géolocalisation non disponible sur cet appareil.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        place(p.coords.latitude, p.coords.longitude);
        map?.setView([p.coords.latitude, p.coords.longitude], 17);
      },
      () => setNotice('Position introuvable — autorisez la localisation dans votre navigateur.'),
      { enableHighAccuracy: true },
    );
  };

  return (
    <div>
      {/* — Recherche de lieu — */}
      {!readOnly && (
        <PlaceSearchBox
          onSelect={goToPlace}
          className="mb-3"
          near={() => {
            const c = map?.getCenter();
            return c ? { lat: c.lat, lng: c.lng } : undefined;
          }}
        />
      )}

      {/* — Carte — */}
      {/* isolate : les calques Leaflet (z-index internes élevés) restent SOUS les modales. */}
      <div className={`relative isolate z-0 ${height} overflow-hidden rounded-[1.5rem] border border-navy-900/10`}>
        <MapContainer
          center={pos ?? TANA}
          zoom={pos ? 16 : 11}
          maxZoom={MAP_MAX_ZOOM}
          className="z-0 h-full w-full"
          ref={setMap}
          scrollWheelZoom
        >
          <BaseMapLayer
            satellite={satellite}
            onGap={setGap}
            onImageryUnavailable={() => setNotice('Imagerie satellite momentanément inaccessible — passez en vue Plan pour continuer.')}
          />
          {!readOnly && <ClickToPlace onPick={place} />}
          {pos && radiusKm ? <Circle center={pos} radius={radiusKm * 1000} pathOptions={{ color: '#f7c325', weight: 2, fillOpacity: 0.15 }} /> : null}
          {pos && (
            <Marker
              position={pos}
              icon={pin}
              draggable={!readOnly}
              eventHandlers={{ dragend: (e) => { const p = (e.target as L.Marker).getLatLng(); place(p.lat, p.lng); } }}
            />
          )}
        </MapContainer>

        <div className="absolute right-3 top-3 z-[400] flex flex-col gap-2">
          <button
            type="button"
            onClick={() => { setSatellite(!satellite); setNotice(''); setGap({ imagery: false, plan: false }); }}
            aria-pressed={satellite}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-navy-900 shadow-md transition hover:bg-gray-50"
          >
            {satellite ? <MapIcon className="h-3.5 w-3.5" aria-hidden /> : <Satellite className="h-3.5 w-3.5" aria-hidden />}
            {satellite ? 'Vue plan' : 'Vue satellite'}
          </button>
          {!readOnly && (
            <button
              type="button"
              onClick={locate}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-navy-900 shadow-md transition hover:bg-gray-50"
            >
              <LocateFixed className="h-3.5 w-3.5" aria-hidden /> Ma position
            </button>
          )}
        </div>
      </div>

      {!readOnly && (
        <p className="mt-1.5 text-xs font-normal text-navy-900/60">
          Recherchez un lieu, zoomez (molette ou boutons +/−), puis cliquez sur la carte ou déplacez le repère pour indiquer la position exacte.
        </p>
      )}

      {/* — Couverture satellite : information permanente, pas une erreur.
           L'imagerie Esri n'est pas servie partout à Madagascar (elle s'arrête
           à tel zoom selon la zone). Ces tuiles manquantes sont détectées et
           remplacées par le plan : le gris « Map data not yet available » ne
           s'affiche jamais. Ce texte explique simplement la limite. — */}
      {satellite && !gap.imagery && (
        <p className="mt-1.5 flex items-start gap-2 text-xs font-normal leading-relaxed text-navy-900/70">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-navy-900/50" aria-hidden />
          L’imagerie satellite n’existe pas partout : son niveau de détail s’arrête plus tôt hors des grandes villes. La carte s’arrête alors d’elle-même au dernier zoom réellement couvert — vous ne verrez jamais de tuile grise. Le <button type="button" onClick={() => { setSatellite(false); setNotice(''); }} className="font-semibold text-navy-900 underline decoration-gold-500 underline-offset-2">plan</button>, lui, couvre tout Madagascar.
        </p>
      )}

      {gap.plan && (
        <p className="mt-1.5 flex items-start gap-2 text-xs font-normal leading-relaxed text-navy-900/70">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-navy-900/50" aria-hidden />
          <span>
            <strong className="font-semibold">Zone peu cartographiée à ce niveau de zoom.</strong>{' '}
            Les fonds de carte n’ont plus de détail ici : zoomez moins, et appuyez-vous sur le
            repère écrit (fokontany, élément connu) — c’est lui qui guide notre équipe.
          </span>
        </p>
      )}

      {satellite && gap.imagery && (
        <p className="mt-1.5 flex items-start gap-2 text-xs font-normal leading-relaxed text-amber-800">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden />
          <span>
            <strong className="font-semibold">Pas de photo satellite à ce zoom, ici.</strong>{' '}
            À cet endroit, l’imagerie s’arrête plus tôt qu’en ville : le plan s’affiche à sa
            place (fokontany, pistes, repères), et vous pouvez continuer à zoomer pour placer
            le repère. Restez en{' '}
            <button type="button" onClick={() => { setSatellite(false); setNotice(''); setGap({ imagery: false, plan: false }); }} className="font-semibold underline decoration-gold-500 underline-offset-2">vue plan</button>{' '}
            pour éviter ces zones sans photo.
          </span>
        </p>
      )}

      {notice && <p className="mt-1.5 text-xs font-medium text-amber-700">{notice}</p>}
    </div>
  );
}
