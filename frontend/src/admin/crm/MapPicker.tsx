import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useState } from 'react';
import { Circle, MapContainer, Marker, useMapEvents } from 'react-leaflet';
import { Map as MapIcon, Satellite } from 'lucide-react';
import { btn } from './kit';
import PlaceSearchBox from '../../shared/PlaceSearchBox';
import { BaseMapLayer, MAP_MAX_ZOOM, type MapGap } from '../../shared/mapTiles';
import type { Place } from '../../services/placeService';

// ---------- Carte ----------
// Repère unifié — identique au site public (shared/GeoMapPicker).
const pin = L.divIcon({
  className: '',
  html: `<svg width="30" height="38" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 1C6.8 1 1 6.8 1 13.9 1 23.6 14 34.8 14 34.8S27 23.6 27 13.9C27 6.8 21.2 1 14 1Z" fill="#f7c325" stroke="#0b1e42" stroke-width="2"/>
    <circle cx="14" cy="14" r="5.5" fill="#0b1e42"/>
  </svg>`,
  iconSize: [30, 38],
  iconAnchor: [15, 37],
});
const TANA: [number, number] = [-18.8792, 47.5079];

function ClickToPlace({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

export default function MapPicker({
  lat,
  lng,
  onChange,
  readOnly,
  height = 'h-80',
  radiusKm,
}: {
  lat?: number;
  lng?: number;
  onChange?: (lat: number, lng: number) => void;
  readOnly?: boolean;
  height?: string;
  radiusKm?: number;
}) {
  const [satellite, setSatellite] = useState(false); // Plan par défaut — comme le site public
  const [map, setMap] = useState<L.Map | null>(null);
  const [geoError, setGeoError] = useState('');
  // Ce qui manque à cet endroit : pas de photo satellite, et/ou plan sans
  // détail à ce zoom (détecté tuile par tuile par le fond de carte).
  const [gap, setGap] = useState<MapGap>({ imagery: false, plan: false });
  // lat/lng peuvent valoir null (recherche publique sans point placé) : on ne garde que des nombres valides.
  const pos: [number, number] | undefined =
    typeof lat === 'number' &&
    Number.isFinite(lat) &&
    typeof lng === 'number' &&
    Number.isFinite(lng)
      ? [lat, lng]
      : undefined;
  const set = (a: number, b: number) =>
    onChange?.(Number(a.toFixed(6)), Number(b.toFixed(6)));

  /* Recherche de lieu : même composant que le site public — la liste des
     propositions reste ouverte après un choix. */
  const goToPlace = (p: Place) => {
    setGeoError('');
    set(p.lat, p.lng);
    map?.setView([p.lat, p.lng], 16);
  };

  const locate = () => {
    setGeoError('');
    if (!navigator.geolocation)
      return setGeoError('Géolocalisation non disponible sur cet appareil.');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        set(p.coords.latitude, p.coords.longitude);
        map?.setView([p.coords.latitude, p.coords.longitude], 17);
      },
      () =>
        setGeoError(
          'Position introuvable (autorisez la localisation dans le navigateur).',
        ),
      { enableHighAccuracy: true },
    );
  };

  return (
    <div>
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

      {/* isolate : les calques Leaflet restent sous les modales. */}
      <div
        className={`relative isolate z-0 ${height} rounded-xl overflow-hidden border border-gray-200`}
      >
        <MapContainer
          center={pos ?? TANA}
          zoom={pos ? 16 : 11}
          maxZoom={MAP_MAX_ZOOM}
          className="w-full h-full z-0"
          ref={setMap}
          scrollWheelZoom
        >
          {/* Fonds de carte partagés avec le site public : les tuiles
              d'imagerie non couvertes sont détectées et masquées (le plan
              apparaît dessous), et la carte borne elle-même le zoom au
              dernier niveau réellement couvert. */}
          <BaseMapLayer
            satellite={satellite}
            onGap={setGap}
            onImageryUnavailable={() =>
              setGeoError(
                'Imagerie satellite momentanément inaccessible — passez en vue Plan pour continuer.',
              )
            }
          />
          {!readOnly && <ClickToPlace onPick={set} />}
          {pos && radiusKm ? (
            <Circle
              center={pos}
              radius={radiusKm * 1000}
              pathOptions={{ color: '#f7c325', weight: 2, fillOpacity: 0.15 }}
            />
          ) : null}
          {pos && (
            <Marker
              position={pos}
              icon={pin}
              draggable={!readOnly}
              eventHandlers={{
                dragend: (e) => {
                  const p = (e.target as L.Marker).getLatLng();
                  set(p.lat, p.lng);
                },
              }}
            />
          )}
        </MapContainer>
        <div className="absolute top-3 right-3 z-[400] flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              setSatellite(!satellite);
              setGeoError('');
              setGap({ imagery: false, plan: false });
            }}
            aria-pressed={satellite}
            className={`${btn} bg-white shadow text-navy-900 hover:bg-gray-50`}
          >
            {satellite ? (
              <MapIcon className="w-3.5 h-3.5" aria-hidden />
            ) : (
              <Satellite className="w-3.5 h-3.5" aria-hidden />
            )}
            {satellite ? 'Vue plan' : 'Vue satellite'}
          </button>
          {!readOnly && (
            <button
              type="button"
              onClick={locate}
              className={`${btn} bg-white shadow text-navy-900 hover:bg-gray-50`}
            >
              Ma position
            </button>
          )}
        </div>
      </div>
      {!readOnly && (
        <p className="text-xs text-gray-600 mt-1.5">
          Recherchez un lieu, zoomez, puis cliquez sur la carte ou déplacez le
          marqueur pour enregistrer la position exacte.
        </p>
      )}
      {gap.plan && (
        <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
          <strong className="font-semibold">Zone peu cartographiée à ce niveau de zoom.</strong>{' '}
          Les fonds de carte n’ont plus de détail ici : zoomez moins, et fiez-vous
          au repère écrit saisi par le propriétaire.
        </p>
      )}

      {satellite && !gap.imagery && (
        <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
          L’imagerie satellite n’existe pas partout à Madagascar : son niveau de
          détail s’arrête plus tôt hors des grandes villes. La carte s’arrête
          d’elle-même au dernier zoom réellement couvert — aucune tuile grise.
          Le plan, lui, couvre tout le pays.
        </p>
      )}

      {satellite && gap.imagery && (
        <p className="text-xs text-amber-800 mt-1.5 leading-relaxed">
          <strong className="font-semibold">Pas de photo satellite à ce zoom, ici.</strong>{' '}
          L’imagerie s’arrête plus tôt qu’en ville à cet endroit : le plan s’affiche
          à sa place (fokontany, pistes, repères). On peut continuer à zoomer.</p>
      )}
      {geoError && <p className="text-xs text-red-600 mt-1">{geoError}</p>}
    </div>
  );
}
