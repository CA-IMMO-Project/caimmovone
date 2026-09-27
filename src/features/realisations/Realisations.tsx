import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  HardHat,
  MapPin,
  Ruler,
} from 'lucide-react';
import { getPublishedRealisations, RealisationThumb } from '../../lib/dossiers';
import type { Realisation } from '../../lib/dossiers';
import { WHATSAPP_URL } from '../../lib/contact';
import { EmptyState, Eyebrow, Modal, PageHero } from '../../shared/ui';

const monthLabel = (ym: string) => (ym ? new Date(`${ym}-01`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '');
const fmtArea = (m2: number) => new Intl.NumberFormat('fr-FR').format(m2);

export default function Realisations() {
  const items = getPublishedRealisations()
    .filter((r) => r.published)
    .sort((a, b) => Number(b.featured) - Number(a.featured) || b.completedAt.localeCompare(a.completedAt));
  const categories = [...new Set(items.map((r) => r.category))];
  const [category, setCategory] = useState('');
  const [open, setOpen] = useState<Realisation | null>(null);
  const shown = items.filter((r) => !category || r.category === category);

  return (
    <div className="font-display overflow-hidden bg-mist">
      <PageHero
        pill="Nos réalisations"
        title={
          <>
            Des projets concrets, <span className="text-gold-500">livrés et sécurisés</span>
          </>
        }
        lead="Maisons, villas et lotissements : une sélection de projets menés avec nos clients à Madagascar, du premier coup d'œil jusqu'à la remise des clés."
      />

      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Barre : compteur + catégories */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-navy-900/80">
              <strong className="font-medium text-navy-900">
                {shown.length} projet{shown.length > 1 ? 's' : ''}
              </strong>{' '}
              {category ? `— ${category}` : 'réalisés avec nos clients'}
            </p>
            {categories.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {['', ...categories].map((c) => (
                  <button
                    key={c || 'all'}
                    onClick={() => setCategory(c)}
                    aria-pressed={category === c}
                    className={`rounded-full px-4 py-2.5 text-xs font-semibold transition ${
                      category === c
                        ? 'bg-navy-900 text-white shadow-lg shadow-navy-900/20'
                        : 'border border-navy-900/12 bg-white text-navy-900/80 hover:text-navy-900'
                    }`}
                  >
                    {c || 'Tout'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Grille des réalisations */}
          {shown.length === 0 ? (
            <EmptyState
              icon={HardHat}
              title="Aucune réalisation pour l'instant"
              text="Nos projets en cours seront présentés ici dès leur livraison. En attendant, découvrez nos terrains disponibles ou parlez-nous de votre projet."
            >
              <Link to="/terrains" className="btn-gold mt-5">
                Voir les terrains disponibles
              </Link>
            </EmptyState>
          ) : (
            <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-3">
              {shown.map((r, i) => (
                <motion.button
                  key={r.id}
                  type="button"
                  onClick={() => setOpen(r)}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.07, 0.35), duration: 0.55, ease: 'easeOut' }}
                  className="card-soft group flex h-full flex-col overflow-hidden text-left"
                >
                  <div className="relative overflow-hidden">
                    {r.photos[0] && (
                      <RealisationThumb
                        file={r.photos[0]}
                        className="aspect-[4/3] w-full transition-transform duration-700 group-hover:scale-105"
                      />
                    )}
                    <span className="absolute left-4 top-4 rounded-full bg-white/92 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-navy-900 backdrop-blur-md">
                      {r.category}
                    </span>
                    {r.featured && (
                      <span className="absolute right-4 top-4 rounded-full bg-gold-500 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-navy-900">
                        À la une
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-6 sm:p-7">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-navy-900/75">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-gold-700" />
                      <span className="truncate">{r.location}</span>
                    </div>

                    <h2 className="mt-3 line-clamp-2 min-h-[3.45rem] text-xl font-bold leading-snug tracking-tight text-navy-900 sm:min-h-[4.15rem] sm:text-2xl">
                      {r.title}
                    </h2>

                    <div className="mt-4 flex min-h-[1.75rem] flex-wrap items-center gap-x-5 gap-y-2 text-sm text-navy-900/85">
                      {r.completedAt && (
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-gold-700" />
                          {monthLabel(r.completedAt)}
                        </span>
                      )}
                      {r.area > 0 && (
                        <span className="inline-flex items-center gap-2">
                          <Ruler className="h-4 w-4 text-gold-700" />
                          <strong className="font-bold text-navy-900">{fmtArea(r.area)} m²</strong>
                        </span>
                      )}
                      {r.duration && (
                        <span className="inline-flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gold-700" />
                          {r.duration}
                        </span>
                      )}
                    </div>

                    <p className="mt-4 line-clamp-3 min-h-[3.75rem] pb-5 text-sm leading-relaxed text-navy-900/75">
                      {r.description}
                    </p>

                    <div className="mt-auto flex items-end justify-between gap-4 border-t border-navy-900/10 pt-5">
                      <span className="text-xs font-semibold text-navy-900/75">
                        {r.client ? `Client : ${r.client}` : 'Projet livré'}
                      </span>
                      <span className="btn-outline !px-5 !py-2.5 !text-xs !font-semibold">
                        Voir le projet
                        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="mt-16 overflow-hidden rounded-[2rem] bg-navy-900 text-white shadow-2xl shadow-navy-900/25">
            <div className="flex flex-col gap-8 px-8 py-10 md:flex-row md:items-center md:justify-between md:px-12">
              <div>
                <Eyebrow light>Vous avez un projet ?</Eyebrow>
                <h2 className="text-2xl font-bold leading-tight md:text-3xl">
                  Le prochain projet présenté ici sera peut-être <span className="text-gold-500">le vôtre</span>.
                </h2>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-white/75">
                  Maison clé en main, lotissement ou terrain sur mesure : dites-nous ce que vous cherchez, nous nous
                  occupons du reste.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Parler à notre équipe sur WhatsApp (nouvel onglet)"
                  className="btn-gold"
                >
                  Parler à notre équipe <ArrowRight className="h-4 w-4" />
                </a>
                <Link
                  to="/recherche"
                  className="inline-flex items-center gap-2 rounded-full border border-white/60 px-5 py-2.5 text-xs font-medium transition hover:bg-white hover:text-navy-900"
                >
                  Confier ma recherche <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {open && <RealisationModal r={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function RealisationModal({ r, onClose }: { r: Realisation; onClose: () => void }) {
  const [i, setI] = useState(0);
  const photo = r.photos[i];
  const meta = [
    { icon: MapPin, label: 'Lieu', value: r.location },
    { icon: CalendarDays, label: 'Livraison', value: r.completedAt ? monthLabel(r.completedAt) : '' },
    { icon: Clock, label: 'Durée', value: r.duration },
    { icon: Ruler, label: 'Surface', value: r.area > 0 ? `${fmtArea(r.area)} m²` : '' },
  ].filter((m) => m.value);

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={r.title}
      subtitle={r.location ? `${r.category} — ${r.location}` : r.category}
    >
      <div className="relative overflow-hidden rounded-2xl bg-navy-950">
        {photo && <RealisationThumb file={photo} className="aspect-[16/10] w-full" />}
        {r.photos.length > 1 && (
          <>
            <button
              onClick={() => setI((i - 1 + r.photos.length) % r.photos.length)}
              aria-label="Photo précédente"
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-white/25 p-3 text-white/80 transition hover:bg-white hover:text-navy-900"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setI((i + 1) % r.photos.length)}
              aria-label="Photo suivante"
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-white/25 p-3 text-white/80 transition hover:bg-white hover:text-navy-900"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium tracking-widest text-white backdrop-blur-sm">
              {i + 1} / {r.photos.length}
            </span>
          </>
        )}
      </div>

      {meta.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {meta.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-xl bg-mist px-4 py-3">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-navy-900/60">
                <Icon className="h-3.5 w-3.5 text-gold-700" /> {label}
              </p>
              <p className="mt-1 text-sm font-bold text-navy-900">{value}</p>
            </div>
          ))}
        </div>
      )}

      <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-navy-900/80">{r.description}</p>
      {r.client && <p className="mt-4 text-xs font-semibold text-navy-900/60">Client : {r.client}</p>}
    </Modal>
  );
}
