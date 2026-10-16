/* Formulaire d'intérêt (achat) — extrait de LandDetail pour lisibilité.

   3 étapes. Ce qui est demandé l'est pour une raison, et se donne en un clic :

   · « Votre objectif »  → cartes de choix, une seule réponse possible ;
   · « Votre budget »    → choix CALÉS SUR LE PRIX DU TERRAIN AFFICHÉ sur la
     fiche : le visiteur n'a pas à estimer un ordre de grandeur dans le vide,
     il indique simplement si le prix affiché lui convient, s'il négocierait
     un peu, ou s'il peut monter. C'est aussi ce que l'agence a besoin de
     savoir pour rappeler utilement ;
   · « Parlez-nous de votre projet » → libre et FACULTATIF : décrire son
     projet par écrit n'est pas la façon la plus naturelle de faire ici, le
     conseiller appelle ;
   · bloc paiement → obligatoire quand il concerne le visiteur : le mode de
     paiement (comptant / échelonné), et, seulement s'il choisit l'échelonnement,
     la durée et l'apport disponible.

   Aucune note d'aide sous les champs : les astérisques disent ce qui est
   obligatoire, et le reste se comprend en lisant le libellé.
   --------------------------------------------------------------------------- */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Banknote,
  Building2,
  ChevronLeft,
  ChevronRight,
  Home,
  LandPlot,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { ChoiceCards, ErrorBanner, FormField, Input, ProgressSteps, Select, Textarea } from '../../../shared/ui';
import { createReservation } from '../../../services/requestService';
import type { SubmitResult } from '../../../services/requestService';
import { AnimatePresence, motion } from 'motion/react';
import { DEPOSIT_BANDS } from '../../../shared/deposit';
import { formatAriary } from '../../../lib/format';
import { landReference } from '../../../lib/land';
import { phoneError, emailError, sanitizePhone } from '../../../lib/validate';
import { PHONE_PLACEHOLDER } from '../../../lib/phone';
import type { Land, Lot, ReservationPayload } from '../../../types';

/* ——— Choix métier (une seule source de vérité, réutilisée pour l'envoi) ——— */

/** Objectif du projet — valeurs identiques à celles du back office. */
const GOALS = ['Résidence principale', 'Investissement', 'Construction', 'Projet commercial'] as const;

const COUNTRIES = ['Madagascar', 'France', 'La Réunion', 'Mayotte', 'Comores', 'Maurice', 'Autre'];

/**
 * Choix de budget, construits à partir du prix affiché sur la fiche.
 * Rien à convertir : chaque option montre le montant correspondant.
 */
/* Trois réponses, et une seule question : le prix affiché passe-t-il ?
   · « Le prix affiché me convient »  → l'agence sait tout de suite que c'est jouable ;
   · « Je souhaite définir le prix »  → le client veut négocier. On lui laisse la
     possibilité d'écrire son montant (facultatif : celui qui n'a pas de chiffre
     en tête ne doit pas être bloqué, le conseiller appelle) ;
   · « À voir avec le conseiller »    → réponse honnête et fréquente, elle est
     acceptée telle quelle plutôt que de forcer un chiffre au hasard.
   Pas de « je peux mettre un peu plus » : personne n'annonce qu'il peut payer
   davantage — c'est se désavantager avant même de négocier. */
const BUDGET_FITS = 'Le prix affiché me convient';
const BUDGET_OWN = 'Je souhaite définir le prix';
const BUDGET_ADVISOR = 'À voir avec le conseiller';

function budgetOptions(price: number) {
  return [
    {
      value: BUDGET_FITS,
      label: 'Le prix affiché me convient',
      description: formatAriary(price),
      min: price,
      max: price,
    },
    {
      value: BUDGET_OWN,
      label: 'Je souhaite définir le prix',
      description: 'proposer mon prix, en discuter',
      min: 0,
      max: 0,
    },
    {
      value: BUDGET_ADVISOR,
      label: 'À voir avec le conseiller',
      min: 0,
      max: 0,
    },
  ];
}

export default function InterestForm({ land, lot, onDone }: { land: Land; lot?: Lot; onDone: (result: SubmitResult) => void }) {
  /** Prix de référence : la parcelle choisie si le terrain en a plusieurs. */
  const askingPrice = lot?.price ?? land.price;
  const budgets = budgetOptions(askingPrice);

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    /* Étape 1 — vous */
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    whatsapp: 'Oui',
    /* Étape 2 — le projet */
    goal: GOALS[0] as string,
    deadline: 'Dès que possible',
    budget: '',
    budgetOwn: '',
    message: '',
    callTime: 'Indifférent',
    /* Étape 3 — le financement */
    payment: 'Comptant' as 'Comptant' | 'Facilité',
    duration: '0–4 mois',
    downPaymentBand: '',
    bankAccount: 'Oui',
    country: 'Madagascar',
    countryOther: '',
    profession: '',
    birthDate: '',
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  /* Le pays n'est précisé que s'il vit hors de Madagascar. */
  const countryOtherRequired = form.country === 'Autre';

  const next = () => {
    setError(null);
    if (step === 0) {
      if (!form.firstName.trim() || !form.lastName.trim()) {
        setError('Veuillez compléter vos coordonnées avant de continuer.');
        return;
      }
      const phone = phoneError(form.phone);
      const email = emailError(form.email);
      if (phone || email) {
        setError(phone ?? email);
        return;
      }
    }
    if (step === 1 && !form.budget) {
      setError('Indiquez votre budget : un seul choix suffit.');
      return;
    }
    setStep((s) => Math.min(s + 1, 2));
  };
  const back = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  /* Changement d'étape : on remonte jusqu'en haut des champs dans la modale. */
  const stepsTopRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    stepsTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [step]);

  /* Champs obligatoires de l'étape courante : « Continuer » reste grisé tant qu'ils sont vides. */
  const stepIncomplete =
    step === 0
      ? !form.firstName.trim() || !form.lastName.trim() || !form.phone.trim()
      : step === 1
        ? !form.budget
        : form.payment === 'Facilité'
        ? !form.downPaymentBand || !form.profession.trim()
        : !form.country || !form.bankAccount;

  const [sending, setSending] = useState(false);
  const finalize = async (payload: ReservationPayload) => {
    if (sending) return; // anti double-clic : un seul envoi à la fois
    setSending(true);
    setError(null);
    try {
      const result = await createReservation(payload); // référence générée par le backend
      onDone(result);
    } catch (e) {
      // Message du serveur quand il en fournit un (ex. demande déjà en cours sur ce terrain).
      setError(e instanceof Error && e.message !== '' ? e.message : 'L’enregistrement a échoué. Vérifiez votre connexion puis réessayez.');
    } finally {
      setSending(false);
    }
  };

  const submit = () => {
    // Garde-fou : on ne part pas sans les informations de paiement demandées.
    if (form.payment === 'Facilité' && !form.downPaymentBand) {
      setError('Indiquez la tranche de votre apport initial.');
      return;
    }
    if (form.payment === 'Facilité' && !form.profession.trim()) {
      setError('Indiquez votre profession : elle est demandée pour un paiement échelonné.');
      return;
    }
    if (!form.country || !form.bankAccount) {
      setError('Complétez la préparation de votre dossier (pays de résidence, compte bancaire).');
      return;
    }
    if (!form.budget) {
      setError('Indiquez votre budget : un seul choix suffit.');
      return;
    }
    const band = budgets.find((b) => b.value === form.budget);
    const own = Number(form.budgetOwn.replace(/\D+/g, '')) || 0;
    const budgetLabel =
      form.budget === BUDGET_OWN && own > 0
        ? `${BUDGET_OWN} — ${formatAriary(own)}`
        : form.budget;
    const payload: ReservationPayload = {
      kind: 'interet',
      landId: land.id,
      lotId: lot?.id,
      fullName: `${form.firstName} ${form.lastName}`.trim(),
      phone: form.phone,
      email: form.email || undefined,
      birthDate: form.birthDate || undefined,
      // Budget : le choix affiché (lisible au back office) + les bornes chiffrées
      // correspondantes, calculées à partir du prix affiché sur la fiche.
      budget: budgetLabel,
      budgetMin: own > 0 ? own : band?.min || undefined,
      budgetMax: own > 0 ? own : band?.max || undefined,
      callTime: form.callTime,
      // WhatsApp : demandé à l'étape 1, il doit remonter au back office comme
      // pour les visites et les recherches (sinon la fiche affiche un vide).
      whatsapp: form.whatsapp,
      profession: form.profession,
      bankAccount: form.bankAccount,
      nationality: form.country === 'Autre' ? form.countryOther : form.country,
      paymentMode: form.payment,
      duration: form.payment === 'Facilité' ? form.duration : undefined,
      /* Le montant exact de l'apport n'est plus demandé au visiteur : la
         tranche suffit pour ouvrir le dossier, et c'est le conseiller qui note
         le montant exact dans le back office, au moment où il a le client au
         téléphone. Le champ reste accepté par l'API. */
      downPaymentRange: form.payment === 'Facilité' ? form.downPaymentBand : undefined,
      // Champs structurés : ils préremplissent directement les champs correspondants
      // lorsque l’administrateur ouvre « Modifier la demande ».
      goal: form.goal,
      deadline: form.deadline,
      projectDescription: form.message.trim() || undefined,
      // Conservé également comme message pour rester visible dans le résumé et
      // assurer la compatibilité avec les anciennes versions du back-office.
      message: form.message.trim() || undefined,
    };
    finalize(payload);
  };

  return (
    <div>
      <ProgressSteps steps={['Profil', 'Projet', 'Financement']} current={step} />

      <div ref={stepsTopRef} className="mt-9 scroll-mt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <div className="mb-7">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-navy-900/65">
                Étape {step + 1} sur 3
              </span>
              <h3 className="mt-2 text-xl font-bold text-navy-900">
                {['Parlons un peu de vous', 'Votre projet d’achat', 'Votre financement'][step]}
              </h3>
              {error && <ErrorBanner className="mt-4">{error}</ErrorBanner>}
            </div>

            {/* — Étape 1 : Profil — */}
            {step === 0 && (
              <div className="space-y-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label="Prénom" required>
                    <Input placeholder="Ex. Andry" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
                  </FormField>
                  <FormField label="Nom" required>
                    <Input placeholder="Ex. Rakoto" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
                  </FormField>
                  <FormField label="Téléphone" required>
                    <Input type="tel" inputMode="tel" placeholder={PHONE_PLACEHOLDER} value={form.phone} onChange={(e) => set('phone', sanitizePhone(e.target.value))} />
                  </FormField>
                  <FormField label="Ce numéro est-il sur WhatsApp ?" required>
                    <Select value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)}>
                      <option>Oui</option>
                      <option>Non</option>
                    </Select>
                  </FormField>
                  <FormField label="Adresse email" className="sm:col-span-2">
                    <Input type="email" placeholder="vous@exemple.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
                  </FormField>
                </div>
                <p className="text-xs font-normal leading-relaxed text-navy-900/80">
                  <Link to="/confidentialite" className="font-semibold text-navy-900 underline decoration-gold-500 underline-offset-2">Informations sur vos données</Link>
                </p>
              </div>
            )}

            {/* — Étape 2 : Projet — */}
            {step === 1 && (
              <div className="space-y-7">
                <FormField label="Votre objectif" required>
                  <ChoiceCards<string>
                    value={form.goal}
                    onChange={(v) => set('goal', v)}
                    columns={2}
                    options={[
                      { value: GOALS[0], label: 'Y habiter', description: 'Résidence principale', icon: Home },
                      { value: GOALS[1], label: 'Investir', description: 'Location ou revente', icon: TrendingUp },
                      { value: GOALS[2], label: 'Construire', description: 'Bâtir un projet', icon: LandPlot },
                      { value: GOALS[3], label: 'Projet professionnel', description: 'Commerce, bureau…', icon: Building2 },
                    ]}
                  />
                </FormField>

                <FormField label={`Votre budget pour ce terrain (${formatAriary(askingPrice)})`} required>
                  <ChoiceCards<string>
                    value={form.budget}
                    onChange={(v) => set('budget', v)}
                    columns={1}
                    options={budgets.map((b) => ({ value: b.value, label: b.label, description: b.description }))}
                  />
                </FormField>

                {form.budget === BUDGET_OWN && (
                  <FormField label="Votre proposition (Ar)">
                    <Input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      placeholder="Ex. 55000000"
                      value={form.budgetOwn}
                      onChange={(e) => set('budgetOwn', e.target.value)}
                    />
                  </FormField>
                )}

                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label="Quand souhaitez-vous concrétiser ?" required>
                    <Select value={form.deadline} onChange={(e) => set('deadline', e.target.value)}>
                      <option>Dès que possible</option>
                      <option>Sous 1 mois</option>
                      <option>1 à 3 mois</option>
                      <option>3 à 6 mois</option>
                      <option>À définir ensemble</option>
                    </Select>
                  </FormField>
                  <FormField label="Meilleur moment pour vous appeler">
                    <Select value={form.callTime} onChange={(e) => set('callTime', e.target.value)}>
                      <option>Indifférent</option>
                      <option>Matin (8h – 12h)</option>
                      <option>Midi (12h – 14h)</option>
                      <option>Après-midi (14h – 17h)</option>
                      <option>Fin de journée (17h – 19h)</option>
                    </Select>
                  </FormField>
                </div>

                <FormField
                  label="Parlez-nous de votre projet"
                  hint="Ce que vous avez en tête, vos questions, vos disponibilités pour une visite — le conseiller en tient compte avant de vous appeler."
                >
                  <Textarea
                    rows={4}
                    placeholder="Ce que vous avez en tête, vos questions, vos disponibilités pour une visite…"
                    value={form.message}
                    onChange={(e) => set('message', e.target.value)}
                  />
                </FormField>
              </div>
            )}

            {/* — Étape 3 : Financement — */}
            {step === 2 && (
              <div className="space-y-7">
                <FormField label="Mode de paiement souhaité" required>
                  <ChoiceCards<'Comptant' | 'Facilité'>
                    value={form.payment}
                    onChange={(v) => set('payment', v)}
                    options={[
                      { value: 'Comptant', label: 'Paiement comptant', description: 'Règlement en une fois', icon: Banknote },
                      { value: 'Facilité', label: 'Facilité de paiement', description: 'Paiement échelonné', icon: WalletCards },
                    ]}
                  />
                </FormField>

                {form.payment === 'Facilité' && (
                  <>
                    <FormField
                      label="Apport initial disponible"
                      required
                      hint="Choisissez la tranche la plus proche — le conseiller affinera."
                    >
                      <ChoiceCards<string>
                        value={form.downPaymentBand}
                        onChange={(v) => set('downPaymentBand', v)}
                        columns={2}
                        options={DEPOSIT_BANDS.map((d) => ({ value: d, label: d }))}
                      />
                    </FormField>
                    <FormField
                      label="Sur combien de temps souhaitez-vous échelonner ?"
                      required
                      className="sm:max-w-[22rem]"
                    >
                      <Select value={form.duration} onChange={(e) => set('duration', e.target.value)}>
                        <option>0–4 mois</option>
                        <option>4–6 mois</option>
                        <option>6–10 mois</option>
                        <option>10–12 mois</option>
                        <option>Plus de 12 mois</option>
                        <option>À définir ensemble</option>
                      </Select>
                    </FormField>
                  </>
                )}

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-navy-900/65">Pour préparer votre dossier</p>
                  <div className="mt-4 grid gap-5 sm:grid-cols-2">
                    <FormField label="Pays de résidence" required>
                      <Select value={form.country} onChange={(e) => set('country', e.target.value)}>
                        {COUNTRIES.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </Select>
                    </FormField>
                    {countryOtherRequired && (
                      <FormField label="Précisez le pays" required>
                        <Input placeholder="Ex. Belgique" value={form.countryOther} onChange={(e) => set('countryOther', e.target.value)} />
                      </FormField>
                    )}
                    <FormField label="Titulaire d’un compte bancaire ?" required>
                      <Select value={form.bankAccount} onChange={(e) => set('bankAccount', e.target.value)}>
                        <option>Oui</option>
                        <option>Non</option>
                      </Select>
                    </FormField>
                    <FormField label="Profession" required={form.payment === 'Facilité'}>
                      <Input placeholder="Ex. Entrepreneur" value={form.profession} onChange={(e) => set('profession', e.target.value)} />
                    </FormField>
                    <FormField label="Date de naissance">
                      <Input type="date" value={form.birthDate} onChange={(e) => set('birthDate', e.target.value)} />
                    </FormField>
                  </div>
                </div>

                <div className="flex items-center gap-4 rounded-2xl border border-navy-900/8 bg-white px-5 py-4">
                  <LandPlot className="h-5 w-5 shrink-0 text-gold-700" />
                  <div>
                    <strong className="block text-sm font-medium text-navy-900">
                      {land.title}{lot ? ` — ${lot.number}` : ''}
                    </strong>
                    <span className="text-xs font-normal text-navy-900/80">
                      {formatAriary(askingPrice)} • Réf. {landReference(land)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="mt-9 flex items-center justify-between border-t border-navy-900/8 pt-7">
        {step > 0 ? (
          <button onClick={back} className="btn-ghost">
            <ChevronLeft className="h-4 w-4" /> Retour
          </button>
        ) : (
          <span />
        )}
        {step < 2 ? (
          <button onClick={next} disabled={stepIncomplete} className="btn-gold disabled:cursor-not-allowed disabled:opacity-40">
            Continuer <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button onClick={submit} disabled={sending || stepIncomplete} className="btn-gold disabled:cursor-not-allowed disabled:opacity-40">
            Envoyer ma demande <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
