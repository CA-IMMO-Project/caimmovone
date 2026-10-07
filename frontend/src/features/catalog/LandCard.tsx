import { Link } from "react-router-dom";
import {
  MapPin,
  Maximize2,
  ArrowRight,
  ShieldCheck,
  LandPlot,
  CircleDollarSign,
} from "lucide-react";
import { Land } from "../../types";
import { landReference, normalizeLand, pricePerSqm } from "../../lib/land";
import { formatArea, formatAriary } from "../../lib/format";

interface LandCardProps {
  land: Land;
  horizontal?: boolean;
}

/* Carte terrain — style « PropertyCard » de la charte de référence CA IMMO :
   badge « Vérifié » doré sur la photo, prix en bas de carte et
   bouton « Voir le terrain » sur fond bleu brume. */
export default function LandCard({ land, horizontal = false }: LandCardProps) {
  const full = normalizeLand(land);

  return (
    <article
      className={`card-soft card-lift group relative flex overflow-hidden ${
        horizontal
          ? "h-full md:grid md:grid-cols-[18rem_1fr] lg:grid-cols-[21rem_1fr]"
          : "h-full flex-col"
      }`}
    >
      {/* — Visuel — */}
      <div
        className={`relative overflow-hidden bg-navy-900/5 ${horizontal ? "h-56 md:h-full md:min-h-[14rem]" : "h-52 sm:h-56"}`}
      >
        <img
          src={full.gallery[0]}
          alt={land.title}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          referrerPolicy="no-referrer"
        />

        {/* Badges de confiance — comme la référence : « Vérifié » doré + statut */}
        <div className="absolute left-4 top-4 flex items-center gap-2">
          {full.verified && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-500 px-3 py-1.5 text-xs font-bold text-navy-900 shadow-md">
              <ShieldCheck className="h-3.5 w-3.5" /> Vérifié
            </span>
          )}
          {(land.status === "vendu" || land.status === "réservé") && (
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-bold text-white shadow-md ${land.status === "vendu" ? "bg-gray-700" : "bg-amber-500"}`}
            >
              {land.status === "vendu" ? "Vendu" : "Réservé"}
            </span>
          )}
        </div>
      </div>

      {/* — Contenu — */}
      <div
        className={`flex flex-1 flex-col p-6 ${horizontal ? "justify-center" : ""}`}
      >
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-navy-900/70">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-gold-600" />
          <span className="truncate">{land.location}</span>
        </div>

        <h3 className="mt-2.5 line-clamp-2 min-h-[2.6em] text-lg font-bold leading-snug tracking-tight text-navy-900 sm:text-xl">
          <Link
            to={`/terrains/${land.id}`}
            className="transition-colors hover:text-navy-800"
          >
            {land.title}
            <span className="absolute inset-0 z-0" aria-hidden />
          </Link>
        </h3>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-navy-900/85">
          <span className="inline-flex items-center gap-2">
            <Maximize2 className="h-4 w-4 text-navy-900/60" />
            <strong className="font-bold text-navy-900">
              {formatArea(land.area)}
            </strong>
          </span>
          <span className="inline-flex items-center gap-2">
            <LandPlot className="h-4 w-4 text-navy-900/60" />
            {full.relief}
          </span>
        </div>

        <p className="mt-2.5 flex items-center gap-2 text-xs font-medium text-navy-900/75">
          <CircleDollarSign className="h-4 w-4 shrink-0 text-navy-900/55" />
          {full.payment} · {full.titleStatus}
        </p>

        <div
          className={`${horizontal ? "mt-6" : "mt-auto"} flex items-end justify-between gap-4 border-t border-navy-900/10 pt-4`}
        >
          <div>
            <strong className="block text-lg font-extrabold leading-none tracking-tight text-navy-900 tabular-nums whitespace-nowrap">
              {formatAriary(land.price)}
            </strong>
            <span className="mt-1 block text-xs font-medium text-navy-900/60 whitespace-nowrap">
              {formatAriary(pricePerSqm(land))} / m² · Réf.{" "}
              {landReference(full)}
            </span>
          </div>
          {/* Un seul arrêt clavier : le lien étiré sur toute la carte. */}
          <span className="relative z-10 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-mist px-4 py-2.5 text-xs font-bold text-navy-900 transition-colors group-hover:bg-gold-500">
            Voir le terrain <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </article>
  );
}
