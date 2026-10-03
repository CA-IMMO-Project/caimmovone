import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Droplets,
  Heart,
  LandPlot,
  MapPin,
  Maximize2,
  MessageCircle,
  Navigation,
  Phone as PhoneIcon,
  Route as RoadIcon,
  Share2,
  ShieldCheck,
  WalletCards,
  X,
  Zap,
} from 'lucide-react';
import { PHONE_1, PHONE_1_TEL, WHATSAPP_URL } from '../../lib/contact';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import LandCard from './LandCard';
import { ChoiceCards, EmptyState, ErrorBanner, Eyebrow, FormField, Input, Modal, ProgressSteps, RequestSuccess, Select, Textarea, useBodyScrollLock, useDialogFocus } from '../../shared/ui';
import InterestForm from './components/InterestForm';
import VisitForm from './components/VisitForm';
import { Land } from '../../types';
import { fetchLand, fetchLands } from '../../services/landService';
import type { ReservationPayload } from '../../types';
import { formatArea, formatAriary } from '../../lib/format';
import { landReference, normalizeLand, pricePerSqm } from '../../lib/land';

/* ============================ Formulaires ============================ */
/* ============================ Page ============================ */

export default function LandDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [land, setLand] = useState<Land | null | undefined>(undefined);
  const [related, setRelated] = useState<Land[]>([]);

  const [lightbox, setLightbox] = useState<number | null>(null);
  const lightboxRef = useDialogFocus(lightbox !== null, () => setLightbox(null));
  useBodyScrollLock(lightbox !== null); // page figée derrière la visionneuse
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [interest, setInterest] = useState(false);
  const [visit, setVisit] = useState(false);
  const [done, setDone] = useState<string | null>(null); // référence de la demande enregistrée

  useEffect(() => {
    if (!id) return;
    fetchLand(id).then((found) => {
      setLand(found ?? null);
      if (found) {
        document.title = `CA IMMO | ${found.title}`;
        fetchLands({}).then((all) => {
          const others = all.filter((l) => l.id !== found.id);
          const sameRegion = others.filter((l) => l.region === found.region);
          setRelated([...sameRegion, ...others.filter((l) => l.region !== found.region)].filter((l) => l.status !== 'vendu').slice(0, 3));
        });
      }
    }).catch(() => setLand(null));
    return () => {
      document.title = 'CA IMMO | Vente de Terrains à Madagascar';
    };
  }, [id]);

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight' && land) setLightbox((i) => ((i ?? 0) + 1) % normalizeLand(land).gallery.length);
      if (e.key === 'ArrowLeft' && land) setLightbox((i) => ((i ?? 0) - 1 + normalizeLand(land).gallery.length) % normalizeLand(land).gallery.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, land]);

  const full = useMemo(() => (land ? normalizeLand(land) : null), [land]);

  if (land === undefined) {
    return (
      <div className="grid min-h-[60vh] place-items-center bg-brand-50">
        <p className="animate-pulse text-sm font-normal text-navy-900/75">Chargement du terrain…</p>
      </div>
    );
  }

  if (land === null || !full) {
    return (
      <div className="bg-brand-50 px-4 py-20 md:py-28">
        <div className="mx-auto max-w-2xl">
          <EmptyState
            icon={MapPin}
            title="Terrain introuvable"
            text="Ce terrain n’est plus disponible ou n’existe pas. Découvrez le reste de notre sélection."
            action="Retour aux terrains"
            onAction={() => navigate('/terrains')}
          />
        </div>
      </div>
    );
  }

  const ref = landReference(land);
  const perSqm = pricePerSqm(land);
  const [lat, lng] = land.coordinates ?? [0, 0];

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(ref);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: land.title, url: window.location.href });
        return;
      }
      await navigator.clipboard.writeText(window.location.href);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      /* ignore */
    }
  };

  /* Repère doré vectoriel — pas d'icône Leaflet externe. */
  const pin = L.divIcon({
    className: '',
    html: '<svg width="34" height="46" viewBox="0 0 34 46" xmlns="http://www.w3.org/2000/svg"><path d="M17 0C7.6 0 0 7.6 0 17c0 12 17 29 17 29s17-17 17-29C34 7.6 26.4 0 17 0z" fill="#e5ad0b" stroke="#0b1e42" stroke-width="2"/><circle cx="17" cy="17" r="6.5" fill="#0b1e42"/></svg>',
    iconSize: [34, 46],
    iconAnchor: [17, 44],
    popupAnchor: [0, -40],
  });

  const specs = [
    { icon: Maximize2, label: 'Superficie', value: formatArea(land.area) },
    { icon: LandPlot, label: 'Relief', value: full.relief },
    { icon: RoadIcon, label: 'Accessibilité', value: full.access },
    { icon: Zap, label: 'Électricité', value: full.electricity ? 'Disponible' : 'À raccorder' },
    { icon: Droplets, label: 'Eau', value: full.water ? 'Disponible' : 'À prévoir' },
  ];

  return (
        <div className="font-display overflow-x-clip bg-brand-50 pb-24 lg:pb-0">
      {/* — Barre supérieure — */}
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button onClick={() => navigate('/terrains')} className="btn-ghost !px-4 !py-2.5 !text-xs">
            <ArrowLeft className="h-4 w-4" /> Retour aux terrains
          </button>
          <button onClick={share} className="btn-outline !px-5 !py-2.5 !text-xs">
            <Share2 className="h-4 w-4" />
            {shared ? 'Lien copié !' : 'Partager'}
          </button>
        </div>
      </div>

      {/* — Galerie asymétrique — */}
      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <div className="grid gap-3 md:grid-cols-[1.55fr_1fr]">
          <button
            onClick={() => setLightbox(0)}
            className="group relative h-[22rem] overflow-hidden rounded-3xl bg-navy-900/5 md:h-[30rem]"
          >
            <img
              src={full.gallery[0]}
              alt={land.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              referrerPolicy="no-referrer"
            />
            <span className="absolute bottom-5 left-5 rounded-full bg-white/92 px-4 py-2 text-xs font-semibold text-navy-900 backdrop-blur-md transition group-hover:bg-white">
              Agrandir la photo
            </span>
          </button>
          <div className="grid gap-3">
            {full.gallery.slice(1, 3).map((src, i) => (
              <button
                key={src}
                onClick={() => setLightbox(i + 1)}
                className="group relative h-[10.5rem] overflow-hidden rounded-3xl bg-navy-900/5 md:h-[14.5rem]"
              >
                <img
                  src={src}
                  alt={`Vue du terrain ${i + 2}`}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  referrerPolicy="no-referrer"
                />
                {i === 1 && full.gallery.length > 3 && (
                  <span className="absolute bottom-4 right-4 rounded-full bg-white/92 px-4 py-2 text-xs font-semibold text-navy-900 backdrop-blur-md">
                    Toutes les photos <span className="text-gold-700">+{full.gallery.length - 3}</span>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* — Contenu — */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="gap-14 lg:grid lg:grid-cols-[1fr_22rem] xl:gap-20">
          <div>
            {/* Titre */}
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-navy-900 px-3.5 py-1.5 text-xs font-bold text-white">{full.titleStatus}</span>
                  {land.verified && <span className="rounded-full bg-green-100 px-3.5 py-1.5 text-xs font-bold text-green-800">Vérifié</span>}
                  {land.status !== 'disponible' && (
                    <span className={`rounded-full px-3.5 py-1.5 text-xs font-bold text-white ${land.status === 'vendu' ? 'bg-gray-700' : 'bg-amber-500'}`}>
                      {land.status === 'vendu' ? 'Vendu' : 'Réservé'}
                    </span>
                  )}
                </div>
                <h1 className="mt-5 max-w-2xl text-3xl font-bold leading-tight tracking-tight text-navy-900 md:text-5xl">
                {land.title}
              </h1>
              <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-normal text-navy-900/80">
                <MapPin className="h-4 w-4" />
                {land.location}
                <a href="#localisation" className="text-link !text-xs">
                  Voir sur la carte
                </a>
              </p>
            </motion.div>

            {/* Caractéristiques clés */}
            <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-7 border-y border-navy-900/8 py-8 sm:grid-cols-3 lg:grid-cols-5">
              {specs.map(({ icon: Icon, label, value }) => (
                <div key={label} className="px-2">
                  <Icon className="h-4.5 w-4.5 text-gold-700" strokeWidth={2} />
                  <small className="mt-3 block text-xs font-semibold uppercase tracking-[0.18em] text-navy-900/65">{label}</small>
                  <strong className="mt-1 block text-sm font-medium leading-snug text-navy-900">{value}</strong>
                </div>
              ))}
            </div>

            {/* À propos */}
            <div className="mt-12">
              <Eyebrow>À propos</Eyebrow>
              <h2 className="mt-4 text-2xl font-bold text-navy-900 md:text-3xl">Ce terrain en quelques mots</h2>
              <p className="mt-5 max-w-2xl text-sm font-normal leading-[1.9] text-navy-900/90">{land.description}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {land.features.map((f) => (
                  <span key={f} className="chip-off !cursor-default !bg-white/70">
                    {f}
                  </span>
                ))}
              </div>
              <div className="mt-8 flex items-center justify-between rounded-2xl bg-white px-6 py-4">
                <span className="text-xs font-normal text-navy-900/75">Référence du terrain</span>
                <strong className="flex items-center gap-2 text-sm font-medium text-navy-900">
                  {ref}
                  <button onClick={copyRef} aria-label="Copier la référence" className="rounded-full p-2 -m-1 text-navy-900/70 transition hover:bg-navy-900/5 hover:text-gold-700">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  {copied && <span className="text-xs font-medium text-green-700">Copié !</span>}
                </strong>
              </div>
            </div>

            {/* Localisation */}
            <div id="localisation" className="mt-14 scroll-mt-28">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <h2 className="text-2xl font-bold text-navy-900 md:text-3xl">Localisation</h2>
                {land.coordinates && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-link !text-xs"
                  >
                    <Navigation className="h-3.5 w-3.5" /> Itinéraire
                  </a>
                )}
              </div>
              {land.coordinates ? (
                <div className="mt-6 overflow-hidden rounded-3xl border border-navy-900/8">
                  <MapContainer
                      center={[lat || -18.8792, lng || 47.5079]}
                      zoom={14}
                      scrollWheelZoom={false}
                      className="h-[22rem] w-full rounded-3xl"
                      attributionControl={false}
                    >
                      <TileLayer
                        attribution="&copy; OpenStreetMap"
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Marker position={[lat || -18.8792, lng || 47.5079]} icon={pin}>
                        <Popup>{land.title}</Popup>
                      </Marker>
                    </MapContainer>
                    <p className="mt-3 text-xs text-navy-900/60">Carte OpenStreetMap — position indicative.</p>
                </div>
              ) : (
                <div className="mt-6 rounded-3xl border border-dashed border-navy-900/15 bg-white/60 px-8 py-14 text-center text-sm font-normal text-navy-900/75">
                  Emplacement communiqué lors de la prise de contact.
                </div>
              )}
              <p className="mt-4 flex items-start gap-3 text-xs font-normal leading-relaxed text-navy-900/80">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-700" />
                <span>
                  <strong className="font-medium text-navy-900">{land.location}</strong>
                  <br />
                  Emplacement approximatif — la position exacte est communiquée lors de la visite.
                </span>
              </p>
            </div>

            {/* Documents */}
            <div className="mt-14">
              <h2 className="text-2xl font-bold text-navy-900 md:text-3xl">Documents disponibles</h2>
              <p className="mt-3 text-sm font-normal text-navy-900/80">
                Pièces contrôlées par notre équipe et consultables sur rendez-vous.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {full.documents.map((d) => (
                  <div key={d} className="flex items-center gap-4 rounded-2xl border border-navy-900/8 bg-white px-5 py-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy-900/5 text-navy-900/90">
                      <ShieldCheck className="h-4.5 w-4.5" strokeWidth={2} />
                    </span>
                    <div>
                      <strong className="block text-sm font-medium text-navy-900">{d}</strong>
                      <small className="text-xs font-normal text-navy-900/70">Reçu et contrôlé</small>
                    </div>
                    <CheckCircle2 className="ml-auto h-4.5 w-4.5 text-green-700" />
                  </div>
                ))}
              </div>
            </div>

            {/* Paiement */}
            <div className="mt-14">
              <h2 className="text-2xl font-bold text-navy-900 md:text-3xl">Conditions de paiement</h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  { icon: Banknote, label: 'Prix total', value: formatAriary(land.price) },
                  { icon: LandPlot, label: 'Prix au m²', value: `${formatAriary(perSqm)} / m²` },
                  { icon: WalletCards, label: 'Acompte demandé', value: full.downPayment },
                  { icon: Clock3, label: 'Durée maximale', value: full.installments },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-4 rounded-2xl border border-navy-900/8 bg-white px-6 py-5">
                    <Icon className="h-5 w-5 shrink-0 text-gold-700" strokeWidth={2} />
                    <span>
                      <small className="block text-xs font-semibold uppercase tracking-[0.18em] text-navy-900/65">{label}</small>
                      <strong className="mt-1 block text-sm font-medium text-navy-900">{value}</strong>
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-5 rounded-2xl bg-gold-500/8 px-6 py-4 text-xs font-normal leading-relaxed text-navy-900/85">
                {full.payment} — les conditions finales sont soumises à l’accord du propriétaire et formalisées par
                CA IMMO. Les prix sont négociables selon le projet.
              </p>
            </div>
          </div>

          {/* — Colonne latérale — */}
          <aside className="mt-14 lg:mt-0">
            {/* Carte figée pendant le défilement (desktop) — même comportement
                que la page Vendre et le site de référence. Sur mobile, les deux
                boutons vivent dans la barre fixe en bas d'écran. */}
            <div className="lg:sticky lg:top-28">
              <div className="card-soft overflow-hidden border-t-4 border-t-gold-500 p-8">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-navy-900/70">Prix du terrain</span>
                <strong className="mt-2 block text-3xl font-extrabold tracking-tight text-navy-900">
                  {formatAriary(land.price)}
                </strong>
                <small className="mt-1 block text-xs font-normal text-navy-900/75">soit {formatAriary(perSqm)} / m²</small>

                <div className="my-7 h-px bg-navy-900/8" />

                <ul className="space-y-3.5">
                  {[
                    { icon: WalletCards, text: full.payment, tone: 'text-gold-700' },
                    { icon: CalendarDays, text: 'Visite possible sur rendez-vous', tone: 'text-green-700' },
                    { icon: ShieldCheck, text: 'Accompagnement notaire & géomètre', tone: 'text-green-700' },
                  ].map(({ icon: Icon, text, tone }) => (
                    <li key={text} className="flex items-center gap-3 text-sm font-normal text-navy-900/90">
                      <Icon className={`h-4 w-4 shrink-0 ${tone}`} />
                      {text}
                    </li>
                  ))}
                </ul>

                <div className="hidden lg:block">
                  <button
                    onClick={() => setInterest(true)}
                    disabled={land.status === 'vendu'}
                    className="btn-gold mt-8 w-full disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="min-[420px]:hidden">Intéressé</span>
            <span className="hidden min-[420px]:inline">Je suis intéressé</span> <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setVisit(true)}
                    disabled={land.status === 'vendu'}
                    className="btn-outline mt-3 w-full disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <CalendarDays className="h-4 w-4" /> <span className="min-[420px]:hidden">Visite</span><span className="hidden min-[420px]:inline">Demander une visite</span>
                  </button>
                  <p className="mt-4 text-center text-xs font-normal text-navy-900/70">
                    Réponse d’un conseiller sous 24 h ouvrées.
                  </p>
                </div>
              </div>

              {/* Votre conseiller — carte de la référence */}
              <div className="card-soft mt-5 p-6">
                <div className="flex items-center gap-3.5">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-navy-900 text-sm font-extrabold text-white">
                    CA
                  </span>
                  <div className="min-w-0">
                    <small className="block text-xs font-normal text-navy-900/65">Votre conseiller</small>
                    <strong className="block truncate text-sm font-bold text-navy-900">CA IMMO</strong>
                    <small className="block text-xs font-medium text-navy-900/80">{PHONE_1}</small>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  <a href={PHONE_1_TEL} className="btn-outline !px-3 !py-2.5 !text-xs">
                    <PhoneIcon className="h-3.5 w-3.5" /> Appeler
                  </a>
                  <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="btn-outline !px-3 !py-2.5 !text-xs">
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                </div>
              </div>

              {/* Conseil sécurité */}
              <div className="mt-5 flex items-start gap-3.5 rounded-[1.5rem] border border-gold-500/25 bg-gold-500/8 px-6 py-5">
                <ShieldCheck className="mt-0.5 h-4.5 w-4.5 shrink-0 text-gold-700" />
                <div>
                  <strong className="text-xs font-semibold text-navy-900">Conseil sécurité</strong>
                  <p className="mt-1 text-xs font-normal leading-relaxed text-navy-900/85">
                    Ne versez aucun acompte sans document officiel de CA IMMO.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* — Terrains similaires — */}
      {related.length > 0 && (
        <section className="border-t border-navy-900/8 bg-white/50 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <Eyebrow>À découvrir aussi</Eyebrow>
                <h2 className="mt-4 text-3xl font-bold text-navy-900">Terrains similaires</h2>
              </div>
              <Link to="/terrains" className="text-link">
                Voir tous les terrains <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-10 grid gap-7 md:grid-cols-2 xl:grid-cols-3">
              {related.map((l) => (
                <LandCard key={l.id} land={l} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* — Modales — */}
      <Modal
        open={interest}
        onClose={() => setInterest(false)}
        title="Votre projet d’achat"
        subtitle={`Terrain ${ref} • ${land.location}`}
        size="lg"
      >
        <InterestForm
          land={land}
          onDone={(reqRef) => {
            setInterest(false);
            setDone(reqRef);
          }}
        />
      </Modal>

      <Modal open={visit} onClose={() => setVisit(false)} title="Planifier une visite" subtitle={`${land.title} • ${land.location}`}>
        <VisitForm
          land={land}
          onDone={(reqRef) => {
            setVisit(false);
            setDone(reqRef);
          }}
        />
      </Modal>

      {/* — Confirmation : la demande est enregistrée, l'équipe recontacte le client — */}
      <Modal open={done !== null} onClose={() => setDone(null)} size="sm">
        <RequestSuccess reference={done ?? ''} onClose={() => setDone(null)} />
      </Modal>


      {/* — Barre d'action mobile : fixe en bas, juste les deux boutons — */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-navy-900/10 bg-white/95 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <button
            onClick={() => setInterest(true)}
            disabled={land.status === 'vendu'}
            className="btn-gold flex-1 !px-3 !text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            Je suis intéressé <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => setVisit(true)}
            disabled={land.status === 'vendu'}
            className="btn-outline flex-1 !px-3 !text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CalendarDays className="h-4 w-4" /> Demander une visite
          </button>
        </div>
      </div>

      {/* — Connexion demandée depuis « Enregistrer » : le favori est ajouté
          juste après, sans quitter la fiche terrain — */}

      {/* — Visionneuse — */}
      {lightbox !== null && (
        <motion.div
          ref={lightboxRef}
          role="dialog"
          aria-modal="true"
          aria-label="Visionneuse de photos"
          tabIndex={-1}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-navy-950/92 p-4 sm:p-10"
          onMouseDown={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            aria-label="Fermer la visionneuse"
            className="absolute right-5 top-5 rounded-full border border-white/25 p-2.5 text-white/80 transition hover:bg-white hover:text-navy-900"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightbox((i) => ((i ?? 0) - 1 + full.gallery.length) % full.gallery.length);
            }}
            aria-label="Photo précédente"
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-white/25 p-3 text-white/80 transition hover:bg-white hover:text-navy-900 sm:left-8"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightbox((i) => ((i ?? 0) + 1) % full.gallery.length);
            }}
            aria-label="Photo suivante"
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-white/25 p-3 text-white/80 transition hover:bg-white hover:text-navy-900 sm:right-8"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <motion.img
            key={lightbox}
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            src={full.gallery[lightbox]}
            alt={`${land.title} — photo ${lightbox + 1}`}
            className="max-h-full max-w-full rounded-2xl object-contain"
            onMouseDown={(e) => e.stopPropagation()}
          />
          <span className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-2 text-xs font-medium tracking-widest text-white backdrop-blur-sm">
            {lightbox + 1} / {full.gallery.length}
          </span>
        </motion.div>
      )}
    </div>
  );
}
