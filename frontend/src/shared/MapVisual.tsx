import { LocateFixed, MapPin } from 'lucide-react';

/* Carte illustrative vectorielle (inspirée du design MadaTany) :
   zéro dépendance réseau — fonctionne partout, y compris hors ligne.
   Mode interactif accessible au clavier (flèches = déplacer le repère). */

export interface MapPinPos {
  x: number; // % horizontal
  y: number; // % vertical
}

interface MapVisualProps {
  label?: string;
  interactive?: boolean;
  pin?: MapPinPos | null;
  onPick?: (pos: MapPinPos) => void;
  className?: string;
}

const clamp = (v: number) => Math.min(98, Math.max(2, v));

export default function MapVisual({ label, interactive = false, pin = null, onPick, className = '' }: MapVisualProps) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !onPick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onPick({ x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!interactive || !onPick) return;
    const base = pin ?? { x: 50, y: 50 };
    const step = e.shiftKey ? 5 : 2;
    const moves: Record<string, MapPinPos> = {
      ArrowLeft: { x: clamp(base.x - step), y: base.y },
      ArrowRight: { x: clamp(base.x + step), y: base.y },
      ArrowUp: { x: base.x, y: clamp(base.y - step) },
      ArrowDown: { x: base.x, y: clamp(base.y + step) },
    };
    const next = moves[e.key];
    if (next) {
      e.preventDefault();
      onPick({ x: Number(next.x.toFixed(2)), y: Number(next.y.toFixed(2)) });
    }
  };

  return (
    <div
      onClick={handleClick}
      {...(interactive
        ? {
            role: 'application',
            tabIndex: 0,
            'aria-label': 'Carte pour indiquer l’emplacement du terrain — utilisez les flèches du clavier pour déplacer le repère',
            onKeyDown: handleKeyDown,
          }
        : {})}
      className={`relative overflow-hidden bg-[#efece1] ${interactive ? 'cursor-crosshair' : ''} ${className}`}
    >
      <svg viewBox="0 0 800 330" preserveAspectRatio="none" className="block h-full w-full" aria-hidden>
        <rect width="800" height="330" fill="#efece1" />
        {/* Reliefs / espaces */}
        <path d="M0 55 C180 95 210 20 390 58 S600 130 800 55" fill="none" stroke="#dde3d2" strokeWidth="52" />
        <path d="M-20 270 C130 190 245 300 400 220 S650 155 830 235" fill="none" stroke="#e6e2d3" strokeWidth="74" />
        {/* Routes */}
        <path d="M0 63 C180 103 210 28 390 66 S600 138 800 63" fill="none" stroke="#ffffff" strokeWidth="8" />
        <path d="M-20 265 C130 185 245 295 400 215 S650 150 830 230" fill="none" stroke="#ffffff" strokeWidth="10" />
        {/* Cours d'eau */}
        <path d="M540 -10 C525 80 590 115 565 200 S500 280 530 350" fill="none" stroke="#cfdbe2" strokeWidth="24" />
        {/* Zones bâties */}
        <g fill="#dde5d2">
          <path d="M85 150h125v63H85z" />
          <path d="M620 85h115v55H620z" />
          <path d="M290 90h85v47H290z" />
        </g>
        {/* Trame légère */}
        <g stroke="#0b1e42" strokeOpacity="0.05">
          <path d="M0 110 H800" />
          <path d="M0 220 H800" />
          <path d="M200 0 V330" />
          <path d="M400 0 V330" />
          <path d="M600 0 V330" />
        </g>
        {label && (
          <text
            x="110"
            y="188"
            fill="#0b1e42"
            fillOpacity="0.4"
            fontSize="13"
            fontFamily="Inter, sans-serif"
            letterSpacing="3"
          >
            {label.toUpperCase()}
          </text>
        )}
        <text x="620" y="262" fill="#0b1e42" fillOpacity="0.28" fontSize="11" fontFamily="Inter, sans-serif" letterSpacing="2">
          RN
        </text>
      </svg>

      {pin && (
        <MapPin
          className="absolute h-7 w-7 -translate-x-1/2 -translate-y-full text-gold-700 drop-shadow-[0_3px_4px_rgba(11,30,66,0.25)]"
          style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
          fill="currentColor"
          strokeWidth={1}
          aria-hidden
        />
      )}

      {interactive && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-navy-900/90 px-4 py-2 text-xs font-medium text-white backdrop-blur-sm">
          <LocateFixed className="h-3.5 w-3.5" aria-hidden />
          {pin ? 'Emplacement sélectionné' : 'Cliquez ou flèches du clavier pour placer le terrain'}
        </div>
      )}
    </div>
  );
}
