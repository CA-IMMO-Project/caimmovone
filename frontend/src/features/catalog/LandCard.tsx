import { Link } from 'react-router-dom';
import { MapPin, Maximize2, ArrowRight } from 'lucide-react';
import { Land } from '../../types';
import { landReference, normalizeLand, pricePerSqm } from '../../lib/land';
import { formatArea, formatAriary } from '../../lib/format';

interface LandCardProps {
  land: Land;
  horizontal?: boolean;
}

export default function LandCard({ land, horizontal = false }: LandCardProps) {
  const full = normalizeLand(land);

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

        {/* Statut du titre : premier critère de confiance — sur la photo */}
        <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-bold text-navy-900 shadow-md backdrop-blur-md">
          {full.titleStatus}
        </span>
        {(land.status === 'vendu' || land.status === 'réservé') && (
          <span className={`absolute right-4 top-4 rounded-full px-3.5 py-1.5 text-xs font-bold text-white shadow-md ${land.status === 'vendu' ? 'bg-gray-700' : 'bg-amber-500'}`}>
            {land.status === 'vendu' ? 'Vendu' : 'Réservé'}
          </span>
        )}
        <div className="absolute bottom-4 left-4 rounded-2xl bg-white/95 px-4 py-2.5 shadow-lg shadow-navy-900/10 backdrop-blur-md">
          <div className="text-lg font-extrabold leading-none tracking-tight text-navy-900 tabular-nums whitespace-nowrap">{formatAriary(land.price)}</div>
          <div className="mt-1 text-xs font-semibold text-navy-900/75 whitespace-nowrap">
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

        <h3 className="mt-3 line-clamp-2 min-h-[2.75em] text-xl font-bold leading-snug tracking-tight text-navy-900 sm:text-2xl">
          <Link to={`/terrains/${land.id}`} className="transition-colors hover:text-navy-800">
            {land.title}
            <span className="absolute inset-0 z-0" aria-hidden />
          </Link>
        </h3>

        <div className="mt-4 flex min-h-[1.75rem] flex-wrap items-center gap-x-5 gap-y-2 pb-5 text-sm text-navy-900/85">
          <span className="inline-flex items-center gap-2">
            <Maximize2 className="h-4 w-4 text-gold-700" />
            <strong className="font-bold text-navy-900">{formatArea(land.area)}</strong>
          </span>
          <span>{full.payment}</span>
        </div>

        <div className={`${horizontal ? 'mt-6' : 'mt-auto'} flex items-end justify-between gap-4 border-t border-navy-900/10 pt-5`}>
          {/* Un seul arrêt clavier : le lien étiré sur toute la carte. */}
          <div className="relative z-10 text-xs font-semibold text-navy-900/75">
            Réf. {landReference(full)}
          </div>
          <span className="relative z-10 inline-flex items-center gap-1 text-xs font-bold text-gold-700">
            Voir le terrain <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>

    </article>
  );
}
