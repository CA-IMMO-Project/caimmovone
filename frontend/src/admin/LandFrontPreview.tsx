import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Droplets,
  LandPlot,
  MapPin,
  Maximize2,
  Navigation,
  Route as RoadIcon,
  ShieldCheck,
  WalletCards,
  Zap,
} from "lucide-react";
import { formatArea, formatAriary } from "../lib/format";
import { landReference, normalizeLand, pricePerSqm } from "../lib/land";
import { Land } from "../types";

export default function LandFrontPreview({ land }: { land: Land }) {
  const full = normalizeLand(land);
  const perSqm = pricePerSqm(land);
  const gallery = full.gallery.length
    ? full.gallery
    : [full.imageUrl].filter(Boolean);
  const [lat, lng] = land.coordinates ?? [];

  return (
    <div className="overflow-hidden rounded-[2rem] border border-navy-900/10 bg-brand-50">
      <section className="p-4 sm:p-6 lg:p-8">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div>
            <div className="overflow-hidden rounded-3xl bg-navy-900/5">
              {gallery[0] ? (
                <img
                  src={gallery[0]}
                  alt={land.title}
                  className="h-[22rem] w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="grid h-[22rem] place-items-center text-sm text-gray-400">
                  Aucune image de couverture
                </div>
              )}
            </div>

            {gallery.length > 1 && (
              <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {gallery.map((src, index) => (
                  <div
                    key={`${src}-${index}`}
                    className={`overflow-hidden rounded-2xl bg-navy-900/5 ${index === 0 ? "ring-2 ring-gold-500 ring-offset-2 ring-offset-brand-50" : ""}`}
                  >
                    <img
                      src={src}
                      alt={`${land.title} — photo ${index + 1}`}
                      className="h-24 w-full object-cover sm:h-28"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-navy-900 px-3.5 py-1.5 text-xs font-bold text-white">
                {full.titleStatus}
              </span>
              {land.verified && (
                <span className="rounded-full bg-green-100 px-3.5 py-1.5 text-xs font-bold text-green-800">
                  Vérifié
                </span>
              )}
              {land.featured && (
                <span className="rounded-full bg-gold-500 px-3.5 py-1.5 text-xs font-bold text-navy-900">
                  À la une
                </span>
              )}
              {land.status !== "disponible" && (
                <span
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold text-white ${land.status === "vendu" ? "bg-gray-700" : "bg-amber-500"}`}
                >
                  {land.status === "vendu" ? "Vendu" : "Réservé"}
                </span>
              )}
            </div>

            <h3 className="mt-5 text-2xl font-bold leading-tight tracking-tight text-navy-900 md:text-3xl">
              {land.title || "Titre du terrain"}
            </h3>
            <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-navy-900/80">
              <MapPin className="h-4 w-4" />
              {land.location || "Localisation à préciser"}
            </p>

            <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-7 border-y border-navy-900/8 py-8 sm:grid-cols-3 lg:grid-cols-5">
              {[
                {
                  icon: Maximize2,
                  label: "Superficie",
                  value: land.area ? formatArea(land.area) : "—",
                },
                { icon: LandPlot, label: "Relief", value: full.relief },
                { icon: RoadIcon, label: "Accessibilité", value: full.access },
                {
                  icon: Zap,
                  label: "Électricité",
                  value: full.electricity ? "Disponible" : "À raccorder",
                },
                {
                  icon: Droplets,
                  label: "Eau",
                  value: full.water ? "Disponible" : "À prévoir",
                },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="px-2">
                  <Icon className="h-4.5 w-4.5 text-gold-700" strokeWidth={2} />
                  <small className="mt-3 block text-xs font-semibold uppercase tracking-[0.18em] text-navy-900/65">
                    {label}
                  </small>
                  <strong className="mt-1 block text-sm font-medium leading-snug text-navy-900">
                    {value}
                  </strong>
                </div>
              ))}
            </div>

            <div className="mt-12">
              <h4 className="text-2xl font-bold text-navy-900">À propos</h4>
              <p className="mt-5 max-w-3xl text-sm leading-[1.9] text-navy-900/90">
                {land.description || "Description à compléter."}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {(land.features?.length
                  ? land.features
                  : ["Atouts à compléter"]
                ).map((feature) => (
                  <span
                    key={feature}
                    className="inline-flex rounded-full bg-white px-3 py-1.5 text-xs font-medium text-navy-900 shadow-sm"
                  >
                    {feature}
                  </span>
                ))}
              </div>
              <div className="mt-8 flex items-center justify-between rounded-2xl bg-white px-6 py-4">
                <span className="text-xs text-navy-900/75">
                  Référence du terrain
                </span>
                <strong className="text-sm font-medium text-navy-900">
                  {landReference(land)}
                </strong>
              </div>
            </div>

            <div className="mt-14">
              <h4 className="text-2xl font-bold text-navy-900">Localisation</h4>
              <div className="mt-6 rounded-3xl border border-dashed border-navy-900/15 bg-white/70 p-6">
                <p className="text-sm text-navy-900/85">
                  {land.location || "Localisation non renseignée"}
                </p>
                {typeof lat === "number" && typeof lng === "number" ? (
                  <p className="mt-2 text-xs text-navy-900/60">
                    Coordonnées GPS : {lat}, {lng}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-navy-900/60">
                    Position exacte communiquée lors de la visite.
                  </p>
                )}
                <div className="mt-4 flex items-center gap-2 text-xs text-gold-700">
                  <Navigation className="h-4 w-4" /> Itinéraire / carte visible
                  côté front si les coordonnées sont renseignées.
                </div>
              </div>
            </div>

            <div className="mt-14">
              <h4 className="text-2xl font-bold text-navy-900">
                Documents disponibles
              </h4>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {full.documents.map((document) => (
                  <div
                    key={document}
                    className="flex items-center gap-4 rounded-2xl border border-navy-900/8 bg-white px-5 py-4"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy-900/5 text-navy-900/90">
                      <ShieldCheck className="h-4.5 w-4.5" strokeWidth={2} />
                    </span>
                    <div>
                      <strong className="block text-sm font-medium text-navy-900">
                        {document}
                      </strong>
                      <small className="text-xs text-navy-900/70">
                        Reçu et contrôlé
                      </small>
                    </div>
                    <CheckCircle2 className="ml-auto h-4.5 w-4.5 text-green-700" />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-14">
              <h4 className="text-2xl font-bold text-navy-900">
                Conditions de paiement
              </h4>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  {
                    icon: Banknote,
                    label: "Prix total",
                    value: land.price ? formatAriary(land.price) : "—",
                  },
                  {
                    icon: LandPlot,
                    label: "Prix au m²",
                    value:
                      land.price && land.area
                        ? `${formatAriary(perSqm)} / m²`
                        : "—",
                  },
                  {
                    icon: WalletCards,
                    label: "Acompte demandé",
                    value: full.downPayment,
                  },
                  {
                    icon: Clock3,
                    label: "Durée maximale",
                    value: full.installments,
                  },
                ].map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="flex items-center gap-4 rounded-2xl border border-navy-900/8 bg-white px-6 py-5"
                  >
                    <Icon
                      className="h-5 w-5 shrink-0 text-gold-700"
                      strokeWidth={2}
                    />
                    <span>
                      <small className="block text-xs font-semibold uppercase tracking-[0.18em] text-navy-900/65">
                        {label}
                      </small>
                      <strong className="mt-1 block text-sm font-medium text-navy-900">
                        {value}
                      </strong>
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-5 rounded-2xl bg-gold-500/8 px-6 py-4 text-xs leading-relaxed text-navy-900/85">
                {full.payment} — les conditions finales sont soumises à l’accord
                du propriétaire et formalisées par CA IMMO.
              </p>
            </div>

            {land.lots?.length ? (
              <div className="mt-14">
                <h4 className="text-2xl font-bold text-navy-900">
                  Lots / parcelles
                </h4>
                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {land.lots.map((lot) => (
                    <article
                      key={lot.id}
                      className="overflow-hidden rounded-2xl border border-navy-900/8 bg-white"
                    >
                      {lot.imageUrl ? (
                        <img
                          src={lot.imageUrl}
                          alt={lot.number}
                          className="h-40 w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="grid h-40 place-items-center bg-gray-100 text-xs text-gray-400">
                          Photo du lot non fournie
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-center justify-between gap-2">
                          <strong className="text-navy-900">
                            {lot.number}
                          </strong>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${lot.status === "disponible" ? "bg-blue-100 text-blue-800" : lot.status === "réservé" ? "bg-amber-100 text-amber-800" : "bg-gray-200 text-gray-700"}`}
                          >
                            {lot.status}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-navy-900/80">
                          {formatArea(lot.area)} · {formatAriary(lot.price)}
                        </p>
                        {lot.details && (
                          <p className="mt-2 text-xs text-gray-500">
                            {lot.details}
                          </p>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="xl:pt-1">
            <div className="sticky top-6 overflow-hidden rounded-3xl border border-navy-900/10 bg-white p-8 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-navy-900/70">
                Prix du terrain
              </span>
              <strong className="mt-2 block text-3xl font-extrabold tracking-tight text-navy-900">
                {land.price ? formatAriary(land.price) : "Prix à préciser"}
              </strong>
              <small className="mt-1 block text-xs text-navy-900/75">
                {land.price && land.area
                  ? `soit ${formatAriary(perSqm)} / m²`
                  : "Prix / m² calculé dès que le prix et la surface sont renseignés"}
              </small>

              <div className="my-7 h-px bg-navy-900/8" />

              <ul className="space-y-3.5 text-sm text-navy-900/90">
                <li className="flex items-center gap-3">
                  <WalletCards className="h-4 w-4 shrink-0 text-gold-700" />{" "}
                  {full.payment}
                </li>
                <li className="flex items-center gap-3">
                  <CalendarDays className="h-4 w-4 shrink-0 text-green-700" />{" "}
                  Visite possible sur rendez-vous
                </li>
                <li className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-green-700" />{" "}
                  Accompagnement notaire & géomètre
                </li>
              </ul>

              <button
                type="button"
                className="mt-8 w-full rounded-full bg-gold-500 px-5 py-3 text-sm font-semibold text-navy-900"
              >
                Je suis intéressé
              </button>
              <button
                type="button"
                className="mt-3 w-full rounded-full border border-navy-900/15 px-5 py-3 text-sm font-semibold text-navy-900"
              >
                Planifier une visite
              </button>

              <div className="mt-6 rounded-2xl bg-brand-50 p-4 text-xs text-navy-900/80">
                Réf. {landReference(land)} ·{" "}
                {land.region || "Région à préciser"}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
