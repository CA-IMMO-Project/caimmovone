import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Heart, MapPin, LandPlot, Maximize2, ArrowRight } from 'lucide-react';
import { Land } from '../../types';
import { landReference, normalizeLand, pricePerSqm, useFavorites } from '../../lib/land';
import { formatArea, formatAriary } from '../../lib/format';
import { AuthModal } from '../auth/AuthModule';

interface LandCardProps {
  land: Land;
  horizontal?: boolean;
}

export default function LandCard({ land, horizontal = false }: LandCardProps) {
  const full = normalizeLand(land);
  const { isFavorite, toggleFavorite, enabled } = useFavorites();
  const fav = isFavorite(land.id);
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <article
      className={`card-soft card-lift group relative flex overflow-hidden ${
        horizontal ? 'h-full md:grid md:grid-cols-[18rem_1fr] lg:grid-cols-[21rem_1fr]' : 'h-full flex-col'
      }`}
    >
      {/* — Visuel — */}
      <div className={`relative overflow-hidden bg-navy-900/5 ${horizontal ? 'h-56 md:h-full md:min-h-[15.5rem]' : 'h-60 sm:h-64'}`}>
        <img
          src={full.gallery[0]}
          alt={land.title}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          referrerPolicy="no-referrer"
        />

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (enabled) toggleFavorite(land.id);
            else setAuthOpen(true); // compte requis : connexion sur place, puis favori ajouté
          }}
          aria-label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          title={enabled ? undefined : 'Connectez-vous pour enregistrer ce terrain'}
          className={`absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/90 backdrop-blur-sm transition ${
            fav ? 'text-gold-700' : 'text-navy-900/80 hover:text-navy-900'
          }`}
        >
          <Heart className="h-4 w-4" fill={fav ? 'currentColor' : 'none'} />
        </button>

        <div className="absolute bottom-4 left-4 rounded-2xl bg-white/95 px-4 py-2.5 shadow-lg shadow-navy-900/10 backdrop-blur-md">
          <div className="text-lg font-extrabold leading-none tracking-tight text-navy-900">{formatAriary(land.price)}</div>
          <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-navy-900/75">
            {formatAriary(pricePerSqm(land))} / m²
          </div>
        </div>
      </div>

      {/* — Contenu — */}
      <div className={`flex flex-1 flex-col p-6 sm:p-7 ${horizontal ? 'justify-center' : ''}`}>
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-navy-900/75">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-gold-700" />
          <span className="truncate">{land.location}</span>
        </div>

        <h3 className="mt-3 line-clamp-2 min-h-[3.45rem] text-xl font-bold leading-snug tracking-tight text-navy-900 sm:min-h-[4.15rem] sm:text-2xl">
          <Link to={`/terrains/${land.id}`} className="transition-colors hover:text-navy-800">
            {land.title}
            <span className="absolute inset-0 z-0" aria-hidden />
          </Link>
        </h3>

        <div className="mt-4 flex min-h-[1.75rem] flex-wrap items-center gap-x-5 gap-y-2 text-sm text-navy-900/85">
          <span className="inline-flex items-center gap-2">
            <Maximize2 className="h-4 w-4 text-gold-700" />
            <strong className="font-bold text-navy-900">{formatArea(land.area)}</strong>
          </span>
          <span className="inline-flex items-center gap-2">
            <LandPlot className="h-4 w-4 text-gold-700" />
            {full.relief}
          </span>
          <span className="text-navy-900/40">•</span>
          <span>{full.payment}</span>
        </div>

        <div className={`${horizontal ? 'mt-6' : 'mt-auto'} flex items-end justify-between gap-4 border-t border-navy-900/10 pt-5`}>
          <div className="relative z-10 text-xs font-semibold text-navy-900/75">
            {land.titleStatus}
            <span className="mx-1.5 text-navy-900/35">·</span>
            Réf. {landReference(full)}
          </div>
          <Link
            to={`/terrains/${land.id}`}
            className="btn-outline relative z-10 !px-5 !py-2.5 !text-xs !font-semibold"
          >
            Voir le terrain
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      {/* Modale de connexion rendue hors de la carte (portail) : les transforms
          au survol de la carte casseraient le positionnement fixe de l'overlay. */}
      {createPortal(
        <AuthModal
          open={authOpen}
          onClose={() => setAuthOpen(false)}
          onSuccess={(u) => {
            setAuthOpen(false);
            toggleFavorite(land.id, u.id); // le cœur se remplit, on reste sur la page
          }}
        />,
        document.body,
      )}
    </article>
  );
}
