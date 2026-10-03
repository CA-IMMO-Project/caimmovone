import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, Search, X } from 'lucide-react';

/* ==========================================================================
   Carte réelle (OpenStreetMap / satellite Esri) pour le site public :
   le visiteur recherche son quartier (géocodage Nominatim), zoome,
   clique pour placer le repère ou le déplace à la souris. Les coordonnées
   GPS réelles (lat/lng) sont transmises au backend — mêmes cartes que le
   back office.
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

interface GeoResult {
  lat: string;
  lon: string;
  display_name: string;
}

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
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState('');
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  const pos: [number, number] | undefined =
    typeof lat === 'number' && Number.isFinite(lat) && typeof lng === 'number' && Number.isFinite(lng)
      ? [lat, lng]
      : undefined;

  const place = (a: number, b: number) => onChange?.(Number(a.toFixed(6)), Number(b.toFixed(6)));

  /* — Géocodage Nominatim (OpenStreetMap), limité à Madagascar — */
  const geocode = async (q: string) => {
    setSearching(true);
    setNotice('');
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=mg&limit=5&accept-language=fr&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as GeoResult[];
      setResults(data);
      if (!data.length) setNotice('Lieu introuvable — essayez un autre nom, ou zoomez et cliquez directement sur la carte.');
    } catch {
      setResults([]);
      setNotice('Recherche momentanément indisponible — zoomez et cliquez directement sur la carte.');
    } finally {
      setSearching(false);
    }
  };

  // Recherche automatique (déclenchée 500 ms après la fin de la saisie)
  useEffect(() => {
    clearTimeout(debounce.current);
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      return;
    }
    debounce.current = setTimeout(() => void geocode(q), 500);
    return () => clearTimeout(debounce.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const pick = (r: GeoResult) => {
    const la = Number(r.lat);
    const lo = Number(r.lon);
    place(la, lo);
    map?.setView([la, lo], 16);
    setResults([]);
    setQuery(r.display_name.split(',')[0]);
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
      <div className="relative mb-3">
        <div className="flex items-center gap-2 rounded-2xl border border-navy-900/10 bg-white px-4 py-3 focus-within:border-gold-500">
          <Search className="h-4 w-4 shrink-0 text-navy-900/50" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (query.trim().length >= 3) void geocode(query.trim());
              }
            }}
            placeholder="Rechercher un lieu… (ex. Ivato, Talatamaty, Ambohidratrimo)"
            className="w-full bg-transparent text-sm text-navy-900 outline-none placeholder:text-navy-900/40"
            aria-label="Rechercher un lieu sur la carte"
          />
          {searching && <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-gold-500 border-t-transparent" aria-hidden />}
          {query && !searching && (
            <button type="button" onClick={() => { setQuery(''); setResults([]); setNotice(''); }} aria-label="Effacer la recherche" className="shrink-0 text-navy-900/40 hover:text-navy-900">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {results.length > 0 && (
          <ul className="absolute left-0 right-0 top-full z-[500] mt-2 overflow-hidden rounded-2xl border border-navy-900/10 bg-white shadow-xl shadow-navy-900/10">
            {results.map((r) => (
              <li key={`${r.lat}-${r.lon}`}>
                <button
                  type="button"
                  onClick={() => pick(r)}
                  className="block w-full px-4 py-3 text-left text-sm text-navy-900 transition hover:bg-gold-500/10"
                >
                  {r.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      )}

      {/* — Carte — */}
      {/* isolate : les calques Leaflet (z-index internes élevés) restent SOUS les modales. */}
      <div className={`relative isolate z-0 ${height} overflow-hidden rounded-[1.5rem] border border-navy-900/10`}>
        <MapContainer center={pos ?? TANA} zoom={pos ? 16 : 11} className="z-0 h-full w-full" ref={setMap} scrollWheelZoom>
          {satellite ? (
            <TileLayer attribution="Tiles &copy; Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={19} />
          ) : (
            <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          )}
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
            onClick={() => setSatellite(!satellite)}
            className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-navy-900 shadow-md transition hover:bg-gray-50"
          >
            {satellite ? 'Plan' : 'Satellite'}
          </button>
          {!readOnly && (
            <button
              type="button"
              onClick={locate}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-navy-900 shadow-md transition hover:bg-gray-50"
            >
              <LocateFixed className="h-3.5 w-3.5" /> Ma position
            </button>
          )}
        </div>
      </div>
      {!readOnly && (
        <p className="mt-1.5 text-xs font-normal text-navy-900/60">
          Recherchez un lieu, zoomez (molette ou boutons +/−), puis cliquez sur la carte ou déplacez le repère pour indiquer la position exacte.
        </p>
      )}
      {notice && <p className="mt-1 text-xs font-medium text-amber-700">{notice}</p>}
    </div>
  );
}
