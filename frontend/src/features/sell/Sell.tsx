import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  Banknote,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  FileCheck2,
  FileText,
  LandPlot,
  MapPin,
  PlayCircle,
  ShieldCheck,
  UserRound,
  WalletCards,
} from 'lucide-react';
import { ChoiceCards, ErrorBanner, Eyebrow, FormField, Input, Modal, PageHero, ProgressSteps, RequestSuccess, Select, Textarea, UploadZone } from '../../shared/ui';
import { createReservation } from '../../services/requestService';
import type { ReservationPayload } from '../../types';
import MapVisual, { MapPinPos } from '../../shared/MapVisual';

const STEP_LABELS = ['Qui vend ?', 'Votre terrain', 'Où est-il ?', 'Vos documents', 'Prix et conditions'];
const RELIEFS = ['Plat', 'Pente douce', 'Pente forte'] as const;
const DOC_TYPES = ['Titre foncier', 'Certificat foncier', 'Plan du terrain', 'Acte de vente', 'Certificat juridique', 'Autre document'] as const;
const DEPOSITS = ['15–25 %', '25–35 %', '35–45 %', '45 % et plus'] as const;

function requestRef(): string {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const n = String(Math.floor(Math.random() * 90) + 10);
  return `VEN-${yy}${mm}${dd}-${n}`;
}

export default function Sell() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null); // référence du dossier déposé

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    birthDate: '',
    profession: '',
    country: 'Madagascar',
    bankAccount: 'Oui',
    idType: 'CIN',
    idNumber: '',
    title: '',
    area: '',
    price: '',
    description: '',
    relief: 'Plat' as (typeof RELIEFS)[number],
    access: 'Route goudronnée',
    water: 'Oui',
    electricity: 'Oui',
    region: 'Analamanga',
    district: '',
    commune: '',
    fokontany: '',
    directions: '',
    payment: 'Les deux' as 'Comptant' | 'Facilité' | 'Les deux',
    duration: '10–12 mois',
    deposit: '25–35 %' as (typeof DEPOSITS)[number] | 'Personnalisé',
    customDeposit: '',
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const [pin, setPin] = useState<MapPinPos | null>(null);
  const [idFiles, setIdFiles] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [video, setVideo] = useState<string[]>([]);
  const [docs, setDocs] = useState<string[]>([]);
  const [docTypes, setDocTypes] = useState<string[]>([]);
  const [consents, setConsents] = useState({ c1: true, c2: true, c3: true });
  const toggleDocType = (d: string) => setDocTypes((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d]));

  const next = () => {
    setError(null);
    if (step === 0 && (!form.firstName.trim() || !form.lastName.trim() || !form.phone.trim() || !form.email.trim())) {
      setError('Veuillez compléter les informations du propriétaire avant de continuer.');
      return;
    }
    if (step === 1 && (!form.title.trim() || !form.area || !form.price || !form.description.trim())) {
      setError('Renseignez au moins le titre, la superficie, le prix et la description du terrain.');
      return;
    }
    if (step === 2 && (!form.commune.trim() || !form.district.trim() || !pin)) {
      setError('Indiquez la commune et le district, et placez le marqueur sur la carte.');
      return;
    }
    if (step === 3 && photos.length === 0) {
      setError('Ajoutez au moins une photo du terrain.');
      return;
    }
    setStep((s) => Math.min(s + 1, 4));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const back = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const composeMessage = () => {
    const lines = [
      `— Propriétaire —`,
      `${form.firstName} ${form.lastName} (${form.birthDate || 'n.c.'}) — ${form.profession || 'n.c.'}`,
      `Résidence : ${form.country} — Compte bancaire : ${form.bankAccount}`,
      `Pièce : ${form.idType} ${form.idNumber || 'n.c.'}${idFiles.length ? ` (${idFiles.join(', ')})` : ''}`,
      ``,
      `— Terrain —`,
      `${form.title} — ${form.area} m² — ${form.price} Ar souhaités`,
      `Relief : ${form.relief} — Accès : ${form.access} — Eau : ${form.water} — Électricité : ${form.electricity}`,
      form.description.trim(),
      ``,
      `— Localisation —`,
      `${form.commune}, ${form.district}${form.fokontany ? `, ${form.fokontany}` : ''} (${form.region})`,
      pin ? 'Emplacement indiqué sur la carte (position indicative)' : 'Position non indiquée sur la carte',
      form.directions.trim() ? `Accès : ${form.directions.trim()}` : '',
      ``,
      `— Documents —`,
      `Photos : ${photos.join(', ') || 'aucune'}`,
      video.length ? `Vidéo : ${video.join(', ')}` : '',
      `Types de documents : ${docTypes.join(', ') || 'à préciser'}`,
      docs.length ? `Fichiers : ${docs.join(', ')}` : '',
      ``,
      `— Conditions —`,
      `Paiement accepté : ${form.payment}${form.payment !== 'Comptant' ? ` (durée max ${form.duration})` : ''}`,
      `Acompte minimum : ${form.deposit === 'Personnalisé' ? `${form.customDeposit || '—'} %` : form.deposit}`,
    ].filter((l) => l !== '');
    return lines.join('\n');
  };

  const finalize = async (payload: ReservationPayload) => {
    setError(null);
    try {
      const ref = await createReservation(payload); // référence générée par le backend
      setDone(ref);
    } catch {
      setError("L’envoi a échoué. Vérifiez votre connexion puis réessayez.");
    }
  };

  const submit = () => {
    setError(null);
    if (!consents.c1 || !consents.c2 || !consents.c3) {
      setError('Merci d’accepter les trois confirmations avant d’envoyer votre dossier.');
      return;
    }
    const payload: ReservationPayload = {
      kind: 'vente',
      fullName: `${form.firstName} ${form.lastName}`.trim(),
      phone: form.phone,
      email: form.email || undefined,
      profession: form.profession || undefined,
      budget: `${form.price} Ar souhaités`,
      projectName: `${form.title} — ${form.commune || form.region}`,
      message: composeMessage(),
    };
    finalize(payload);
  };


  /* ————— Formulaire en 5 étapes ————— */
  return (
    <div className="font-display overflow-x-clip bg-mist">
      {/* — Hero navy (style Accueil / À propos) — */}
      <PageHero
        crumb="Vendre"
        pill="Vendre avec CA IMMO"
        title={
          <>
            Proposez votre terrain en toute <span className="text-gold-500">confiance</span>
          </>
        }
        lead="Déposez votre dossier en ligne en quelques étapes. Notre équipe vérifie chaque terrain avant toute publication."
      />

      {/* Bandeau bénéfices vendeur */}
      <section className="pb-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: ShieldCheck, title: 'Vérification sérieuse', text: 'Un dossier fiable pour les acheteurs' },
              { icon: Camera, title: 'Mise en valeur', text: 'Une annonce professionnelle' },
              { icon: UserRound, title: 'Suivi personnalisé', text: 'Un accompagnement à chaque étape' },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="card-soft flex items-center gap-4 px-6 py-5">
                <Icon className="h-5 w-5 shrink-0 text-gold-700" strokeWidth={2} />
                <div>
                  <strong className="block text-sm font-medium text-navy-900">{title}</strong>
                  <small className="text-xs font-normal text-navy-900/75">{text}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="gap-12 lg:grid lg:grid-cols-[1fr_18rem] xl:gap-16">
            {/* Carte formulaire */}
            <div className="card-soft p-8 sm:p-12">
              <ProgressSteps steps={STEP_LABELS} current={step} />

              <div className="mt-10 min-h-[26rem]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 28 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -28 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                  >
                    <div className="mb-8">
                      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-navy-900/65">
                        Étape {step + 1} sur 5
                      </span>
                      <h2 className="mt-2 text-2xl font-bold text-navy-900 md:text-3xl">
                        {[
                          'Informations du propriétaire',
                          'Informations du terrain',
                          'Localisez précisément le terrain',
                          'Photos et documents',
                          'Conditions de vente',
                        ][step]}
                      </h2>
                      <p className="mt-2 text-sm font-normal text-navy-900/80">
                        {[
                          'L’identité de la personne légalement habilitée à vendre le terrain.',
                          'Donnez aux acheteurs toutes les informations essentielles.',
                          'Ces informations permettent à notre équipe de retrouver le terrain.',
                          'Des visuels clairs et des justificatifs complets accélèrent la vérification.',
                          'Précisez les modalités que vous êtes prêt(e) à accepter.',
                        ][step]}
                      </p>
                      {error && <ErrorBanner className="mt-4">{error}</ErrorBanner>}
                    </div>

                    {/* — Étape 1 : Propriétaire — */}
                    {step === 0 && (
                      <div className="space-y-7">
                        <div className="grid gap-5 sm:grid-cols-2">
                          <FormField label="Prénom" required>
                            <Input placeholder="Votre prénom" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
                          </FormField>
                          <FormField label="Nom" required>
                            <Input placeholder="Votre nom" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
                          </FormField>
                          <FormField label="Téléphone" required>
                            <Input type="tel" placeholder="+261 34 00 000 00" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
                          </FormField>
                          <FormField label="Adresse email" required>
                            <Input type="email" placeholder="vous@exemple.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
                          </FormField>
                          <FormField label="Date de naissance">
                            <Input type="date" value={form.birthDate} onChange={(e) => set('birthDate', e.target.value)} />
                          </FormField>
                          <FormField label="Profession">
                            <Input placeholder="Votre profession" value={form.profession} onChange={(e) => set('profession', e.target.value)} />
                          </FormField>
                          <FormField label="Pays de résidence" required>
                            <Select value={form.country} onChange={(e) => set('country', e.target.value)}>
                              <option>Madagascar</option>
                              <option>France</option>
                              <option>La Réunion</option>
                              <option>Autre</option>
                            </Select>
                          </FormField>
                          <FormField label="Titulaire d’un compte bancaire ?" required>
                            <Select value={form.bankAccount} onChange={(e) => set('bankAccount', e.target.value)}>
                              <option>Oui</option>
                              <option>Non</option>
                            </Select>
                          </FormField>
                        </div>

                        <div className="border-t border-navy-900/8 pt-7">
                          <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-navy-900/70">Justificatif d’identité</h3>
                          <div className="mt-5 grid gap-5 sm:grid-cols-2">
                            <FormField label="Type de pièce" required>
                              <Select value={form.idType} onChange={(e) => set('idType', e.target.value)}>
                                <option>CIN</option>
                                <option>Passeport</option>
                                <option>Carte de résident</option>
                                <option>Autre</option>
                              </Select>
                            </FormField>
                            <FormField label="Numéro de pièce" required>
                              <Input placeholder="Numéro du document" value={form.idNumber} onChange={(e) => set('idNumber', e.target.value)} />
                            </FormField>
                          </div>
                          <div className="mt-5">
                            <UploadZone
                              title="Ajouter le justificatif d’identité"
                              text="CIN recto/verso ou passeport • PDF, JPG ou PNG • 10 Mo max."
                              accept="image/*,.pdf"
                              multiple
                              onFiles={setIdFiles}
                              files={idFiles}
                            />
                          </div>
                          <p className="mt-5 flex items-start gap-2.5 text-xs font-normal leading-relaxed text-navy-900/80">
                            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />
                            Les justificatifs sont traités de manière confidentielle et ne sont jamais publiés.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* — Étape 2 : Terrain — */}
                    {step === 1 && (
                      <div className="space-y-7">
                        <div className="grid gap-5 sm:grid-cols-2">
                          <FormField label="Titre ou référence du terrain" required>
                            <Input placeholder="Ex. Terrain résidentiel Ivato" value={form.title} onChange={(e) => set('title', e.target.value)} />
                          </FormField>
                          <FormField label="Superficie totale" required hint="En mètres carrés">
                            <Input type="number" min={0} placeholder="Ex. 650" value={form.area} onChange={(e) => set('area', e.target.value)} />
                          </FormField>
                          <FormField label="Prix total souhaité" required hint="En Ariary (Ar)">
                            <Input type="number" min={0} placeholder="Ex. 120 000 000" value={form.price} onChange={(e) => set('price', e.target.value)} />
                          </FormField>
                          <FormField label="Relief du terrain" required>
                            <ChoiceCards<(typeof RELIEFS)[number]>
                              value={form.relief}
                              onChange={(v) => set('relief', v)}
                              options={RELIEFS.map((r) => ({ value: r, label: r }))}
                            />
                          </FormField>
                        </div>

                        <FormField label="Description du terrain" required hint="Décrivez l’environnement, les atouts, les limites et l’usage idéal.">
                          <Textarea rows={5} placeholder="Ex. Parcelle calme, bornée, à proximité de…" value={form.description} onChange={(e) => set('description', e.target.value)} />
                        </FormField>

                        <div className="grid gap-5 sm:grid-cols-3">
                          <FormField label="Accessibilité" required>
                            <Select value={form.access} onChange={(e) => set('access', e.target.value)}>
                              <option>Route goudronnée</option>
                              <option>Route pavée</option>
                              <option>Piste carrossable</option>
                              <option>Accès piéton</option>
                            </Select>
                          </FormField>
                          <FormField label="Eau disponible ?" required>
                            <Select value={form.water} onChange={(e) => set('water', e.target.value)}>
                              <option>Oui</option>
                              <option>Non</option>
                              <option>À proximité</option>
                            </Select>
                          </FormField>
                          <FormField label="Électricité disponible ?" required>
                            <Select value={form.electricity} onChange={(e) => set('electricity', e.target.value)}>
                              <option>Oui</option>
                              <option>Non</option>
                              <option>À proximité</option>
                            </Select>
                          </FormField>
                        </div>
                      </div>
                    )}

                    {/* — Étape 3 : Localisation — */}
                    {step === 2 && (
                      <div className="space-y-7">
                        <div className="grid gap-5 sm:grid-cols-2">
                          <FormField label="Région" required>
                            <Select value={form.region} onChange={(e) => set('region', e.target.value)}>
                              <option>Analamanga</option>
                              <option>Vakinankaratra</option>
                              <option>Itasy</option>
                              <option>Atsinanana</option>
                              <option>Boeny</option>
                              <option>Diana</option>
                              <option>Haute Matsiatra</option>
                              <option>Atsimo-Andrefana</option>
                              <option>Autre</option>
                            </Select>
                          </FormField>
                          <FormField label="District" required>
                            <Input placeholder="Ex. Ambohidratrimo" value={form.district} onChange={(e) => set('district', e.target.value)} />
                          </FormField>
                          <FormField label="Commune" required>
                            <Input placeholder="Ex. Ivato" value={form.commune} onChange={(e) => set('commune', e.target.value)} />
                          </FormField>
                          <FormField label="Fokontany">
                            <Input placeholder="Nom du fokontany" value={form.fokontany} onChange={(e) => set('fokontany', e.target.value)} />
                          </FormField>
                        </div>

                        <FormField label="Indications d’accès" hint="Décrivez l’accès depuis un point de repère connu.">
                          <Textarea rows={3} placeholder="Ex. Depuis la RN4, tourner après la station…" value={form.directions} onChange={(e) => set('directions', e.target.value)} />
                        </FormField>

                        <FormField label="Position du terrain sur la carte" required hint="Cliquez sur la carte pour placer le marqueur.">
                          <div className="overflow-hidden rounded-[1.5rem] border border-navy-900/10">
                            <MapVisual interactive pin={pin} onPick={setPin} className="h-[20rem]" />
                          </div>
                        </FormField>

                        {pin && (
                          <div className="flex items-center gap-4 rounded-2xl bg-brand-accent/5 px-6 py-4">
                            <MapPin className="h-5 w-5 shrink-0 text-green-700" />
                            <div>
                              <strong className="block text-sm font-medium text-navy-900">Emplacement indiqué sur la carte</strong>
                              <small className="text-xs font-normal text-navy-900/80">
                                Position indicative — la localisation exacte est confirmée avec notre équipe.
                              </small>
                            </div>
                            <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-green-700" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* — Étape 4 : Médias & documents — */}
                    {step === 3 && (
                      <div className="space-y-8">
                        <div>
                          <h3 className="flex items-center gap-2.5 text-sm font-medium text-navy-900">
                            <Camera className="h-4.5 w-4.5 text-gold-700" />
                            Photos du terrain <em className="not-italic text-gold-700">*</em>
                          </h3>
                          <p className="mt-1.5 text-xs font-normal text-navy-900/80">
                            Ajoutez au moins une photo : vue générale, accès et limites du terrain.
                          </p>
                          <div className="mt-4">
                            <UploadZone
                              title="Ajouter les photos"
                              text="JPG, PNG ou WEBP • 15 Mo max. par photo • jusqu’à 12 photos"
                              multiple
                              onFiles={setPhotos}
                              files={photos}
                            />
                          </div>
                        </div>

                        <div>
                          <h3 className="flex items-center gap-2.5 text-sm font-medium text-navy-900">
                            <PlayCircle className="h-4.5 w-4.5 text-gold-700" />
                            Vidéo du terrain <span className="text-xs font-normal text-navy-900/65">— facultatif</span>
                          </h3>
                          <p className="mt-1.5 text-xs font-normal text-navy-900/80">
                            Une courte vidéo aide les acheteurs à mieux visualiser le terrain.
                          </p>
                          <div className="mt-4">
                            <UploadZone title="Ajouter une vidéo" text="MP4 ou MOV • 100 Mo max." accept="video/*" onFiles={setVideo} files={video} />
                          </div>
                        </div>

                        <div>
                          <h3 className="flex items-center gap-2.5 text-sm font-medium text-navy-900">
                            <FileText className="h-4.5 w-4.5 text-gold-700" />
                            Documents fonciers <em className="not-italic text-gold-700">*</em>
                          </h3>
                          <p className="mt-1.5 text-xs font-normal text-navy-900/80">
                            Sélectionnez les documents dont vous disposez. Ils resteront confidentiels.
                          </p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {DOC_TYPES.map((d) => (
                              <button key={d} type="button" onClick={() => toggleDocType(d)} className={docTypes.includes(d) ? 'chip-on' : 'chip-off !bg-white/70'}>
                                {docTypes.includes(d) && <Check className="h-3.5 w-3.5" />}
                                <FileText className="h-3.5 w-3.5" />
                                {d}
                              </button>
                            ))}
                          </div>
                          <div className="mt-4">
                            <UploadZone
                              title="Téléverser les documents"
                              text="PDF, JPG ou PNG • 20 Mo max. par fichier"
                              accept=".pdf,image/*"
                              multiple
                              onFiles={setDocs}
                              files={docs}
                            />
                          </div>
                        </div>

                        <p className="flex items-start gap-2.5 text-xs font-normal leading-relaxed text-navy-900/80">
                          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />
                          Seule l’équipe de vérification accède aux documents. Ils ne seront jamais visibles publiquement.
                        </p>
                      </div>
                    )}

                    {/* — Étape 5 : Conditions — */}
                    {step === 4 && (
                      <div className="space-y-7">
                        <FormField label="Mode de paiement accepté" required>
                          <ChoiceCards<'Comptant' | 'Facilité' | 'Les deux'>
                            value={form.payment}
                            onChange={(v) => set('payment', v)}
                            columns={3}
                            options={[
                              { value: 'Comptant', label: 'Comptant', description: 'Paiement en une fois', icon: Banknote },
                              { value: 'Facilité', label: 'Facilité', description: 'Paiement échelonné', icon: WalletCards },
                              { value: 'Les deux', label: 'Les deux', description: 'Comptant ou facilité', icon: CheckCircle2 },
                            ]}
                          />
                        </FormField>

                        {form.payment !== 'Comptant' && (
                          <FormField label="Durée maximale acceptée" required>
                            <Select value={form.duration} onChange={(e) => set('duration', e.target.value)}>
                              <option>0–4 mois</option>
                              <option>4–6 mois</option>
                              <option>6–10 mois</option>
                              <option>10–12 mois</option>
                              <option>Autre durée</option>
                            </Select>
                          </FormField>
                        )}

                        <FormField label="Acompte minimum demandé" required>
                          <ChoiceCards<(typeof DEPOSITS)[number] | 'Personnalisé'>
                            value={form.deposit}
                            onChange={(v) => set('deposit', v)}
                            columns={4}
                            options={[...DEPOSITS.map((d) => ({ value: d, label: d })), { value: 'Personnalisé', label: 'Personnalisé' }]}
                          />
                        </FormField>
                        {form.deposit === 'Personnalisé' && (
                          <FormField label="Pourcentage personnalisé">
                            <Input type="number" min={1} max={100} placeholder="Ex. 30" value={form.customDeposit} onChange={(e) => set('customDeposit', e.target.value)} />
                          </FormField>
                        )}

                        {/* Résumé */}
                        <div className="rounded-2xl border border-navy-900/8 bg-white px-6 py-5">
                          <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-navy-900/70">Avant d’envoyer votre dossier</h3>
                          <div className="mt-4 grid gap-4 sm:grid-cols-3">
                            <div className="flex items-center gap-3 text-sm">
                              <LandPlot className="h-4 w-4 shrink-0 text-gold-700" />
                              <div>
                                <small className="block text-xs text-navy-900/70">Terrain</small>
                                <strong className="truncate text-xs font-medium text-navy-900">{form.title || '—'}</strong>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <MapPin className="h-4 w-4 shrink-0 text-gold-700" />
                              <div>
                                <small className="block text-xs text-navy-900/70">Localisation</small>
                                <strong className="truncate text-xs font-medium text-navy-900">
                                  {form.commune ? `${form.commune}, ${form.region}` : form.region}
                                </strong>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <Banknote className="h-4 w-4 shrink-0 text-gold-700" />
                              <div>
                                <small className="block text-xs text-navy-900/70">Prix souhaité</small>
                                <strong className="truncate text-xs font-medium text-navy-900">{form.price ? `${form.price} Ar` : '—'}</strong>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Consentements */}
                        <div className="space-y-3.5">
                          {(
                            [
                              { key: 'c1' as const, text: 'Les informations fournies sont exactes et vous êtes autorisé(e) à proposer ce terrain.' },
                              { key: 'c2' as const, text: 'Vous acceptez que notre équipe vous contacte pour organiser la vérification.' },
                              { key: 'c3' as const, text: 'Vous comprenez que le terrain ne sera publié qu’après validation du dossier.' },
                            ]
                          ).map(({ key, text }) => (
                            <label key={key} className="flex cursor-pointer items-start gap-3.5">
                              <input
                                type="checkbox"
                                className="peer sr-only"
                                checked={consents[key]}
                                onChange={(e) => setConsents((c) => ({ ...c, [key]: e.target.checked }))}
                              />
                              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border border-navy-900/25 transition peer-checked:border-gold-500 peer-checked:bg-gold-500">
                                <Check className={`h-3.5 w-3.5 ${consents[key] ? 'text-navy-900' : 'text-transparent'}`} />
                              </span>
                              <p className="text-xs font-normal leading-relaxed text-navy-900/85">{text}</p>
                            </label>
                          ))}
                        </div>

                        <div className="flex items-center gap-3.5 rounded-2xl bg-navy-900/5/60 px-6 py-4">
                          <Clock3 className="h-4.5 w-4.5 shrink-0 text-navy-900/80" />
                          <div>
                            <small className="block text-xs font-semibold uppercase tracking-[0.18em] text-navy-900/65">Statut après soumission</small>
                            <strong className="text-sm font-medium text-navy-900">En attente de vérification</strong>
                          </div>
                        </div>

                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Navigation */}
              <div className="mt-10 flex items-center justify-between border-t border-navy-900/8 pt-8">
                {step > 0 ? (
                  <button onClick={back} className="btn-ghost">
                    <ChevronLeft className="h-4 w-4" /> Retour
                  </button>
                ) : (
                  <span />
                )}
                {step < 4 ? (
                  <button onClick={next} className="btn-gold">
                    Continuer <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button onClick={submit} className="btn-gold">
                    Soumettre mon terrain <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Aside */}
            <aside className="mt-12 lg:mt-0">
              <div className="lg:sticky lg:top-28">
                <div className="card-soft p-8">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-navy-900/5">
                    <LandPlot className="h-5 w-5 text-navy-900/90" strokeWidth={2} />
                  </span>
                  <h2 className="mt-5 text-lg font-bold text-navy-900">Avant de commencer</h2>
                  <p className="mt-3 text-xs font-normal leading-relaxed text-navy-900/85">
                    Préparez les éléments suivants pour compléter votre dépôt sans interruption.
                  </p>
                  <div className="mt-6 space-y-3">
                    {['Pièce d’identité valide', 'Photos récentes du terrain', 'Document foncier ou justificatif', 'Localisation précise'].map((t, i) => (
                      <p key={t} className="flex items-center gap-3 text-xs font-normal text-navy-900/90">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-navy-900/5 text-xs font-semibold text-navy-900">
                          {i + 1}
                        </span>
                        {t}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="card-soft mt-5 flex items-start gap-3.5 p-6">
                  <FileCheck2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-green-700" />
                  <div>
                    <strong className="text-xs font-semibold text-navy-900">Aucune publication automatique</strong>
                    <p className="mt-1 text-xs font-normal leading-relaxed text-navy-900/85">
                      Chaque terrain passe par notre processus de contrôle avant d’être proposé aux acheteurs.
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* — Confirmation : le dossier est déposé, l'équipe recontacte le vendeur — */}
      <Modal open={done !== null} onClose={() => setDone(null)} size="sm">
        <RequestSuccess
          reference={done ?? ''}
          title="Dossier déposé"
          text="Notre équipe étudie votre terrain et vous recontacte pour la suite des démarches."
          onClose={() => setDone(null)}
        />
      </Modal>
    </div>
  );
}
