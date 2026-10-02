/* Formulaire d'intérêt (achat) — extrait de LandDetail pour lisibilité. */

import { useEffect, useState } from 'react';
import { ArrowRight, Banknote, ChevronLeft, ChevronRight, LandPlot, Navigation, ShieldCheck, WalletCards } from 'lucide-react';
import { ChoiceCards, ErrorBanner, FormField, Input, ProgressSteps, Select, Textarea } from '../../../shared/ui';
import { createReservation } from '../../../services/requestService';
import { AnimatePresence, motion } from 'motion/react';
import { formatAriary } from '../../../lib/format';
import { landReference } from '../../../lib/land';
import { phoneError, emailError } from '../../../lib/validate';
import type { Land, ReservationPayload } from '../../../types';

export default function InterestForm({ land, onDone }: { land: Land; onDone: (ref: string) => void }) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    birthDate: '',
    profession: '',
    country: 'Madagascar',
    bankAccount: 'Oui',
    deadline: 'Dès que possible',
    payment: 'Comptant' as 'Comptant' | 'Facilité',
    duration: '0–4 mois',
    downPaymentAmount: '',
    message: '',
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const next = () => {
    setError(null);
    if (step === 0) {
      if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
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
    setStep((s) => Math.min(s + 1, 2));
  };
  const back = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  const finalize = async (payload: ReservationPayload) => {
    setError(null);
    try {
      const ref = await createReservation(payload); // référence générée par le backend
      onDone(ref);
    } catch (e) {
      // Message du serveur quand il en fournit un (ex. demande d\u00e9j\u00e0 en cours sur ce terrain).
      setError(e instanceof Error && e.message !== '' ? e.message : 'L\u2019enregistrement a \u00e9chou\u00e9. V\u00e9rifiez votre connexion puis r\u00e9essayez.');
    }
  };

  const submit = () => {
    const payload: ReservationPayload = {
      kind: 'interet',
      landId: land.id,
      fullName: `${form.firstName} ${form.lastName}`.trim(),
      phone: form.phone,
      email: form.email,
      profession: form.profession,
      bankAccount: form.bankAccount,
      nationality: form.country,
      paymentMode: form.payment,
      duration: form.payment === 'Facilité' ? form.duration : undefined,
      downPaymentAmount: form.payment === 'Facilité' ? form.downPaymentAmount : undefined,
      message: [`Délai souhaité : ${form.deadline}`, form.message.trim()].filter(Boolean).join('\n'),
    };
    finalize(payload);
  };

  return (
    <div>
      <ProgressSteps steps={['Profil', 'Projet', 'Financement']} current={step} />

      <div className="mt-9">
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
              <p className="mt-1.5 text-xs font-normal text-navy-900/80">
                {[
                  'Ces informations permettent à notre équipe de vous recontacter.',
                  'Délais et précisions pour mieux préparer les échanges.',
                  'Choisissez vos modalités, vérifiez le résumé, et c’est envoyé.',
                ][step]}
              </p>
              {error && <ErrorBanner className="mt-4">{error}</ErrorBanner>}
            </div>

            {/* — Étape 1 : Profil — */}
            {step === 0 && (
              <div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label="Prénom" required>
                    <Input placeholder="Ex. Andry" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
                  </FormField>
                  <FormField label="Nom" required>
                    <Input placeholder="Ex. Rakoto" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
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
                    <Input placeholder="Ex. Entrepreneur" value={form.profession} onChange={(e) => set('profession', e.target.value)} />
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
                <p className="mt-6 flex items-start gap-2.5 text-xs font-normal leading-relaxed text-navy-900/80">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />
                  Vos informations restent confidentielles. Aucune donnée bancaire sensible ne vous sera jamais demandée.
                </p>
              </div>
            )}

            {/* — Étape 2 : Projet — */}
            {step === 1 && (
              <div className="space-y-6">
                <FormField label="Quand souhaitez-vous concrétiser ?" required>
                  <ChoiceCards
                    value={form.deadline}
                    onChange={(v) => set('deadline', v)}
                    options={[
                      { value: 'Dès que possible', label: 'Dès que possible' },
                      { value: 'Sous 1 mois', label: 'Sous 1 mois' },
                      { value: '1 à 3 mois', label: '1 à 3 mois' },
                      { value: 'À définir', label: 'À définir ensemble' },
                    ]}
                  />
                </FormField>
                <FormField label="Parlez-nous de votre projet">
                  <Textarea
                    rows={5}
                    placeholder="Un mot sur votre projet, vos questions, vos disponibilités pour une visite…"
                    value={form.message}
                    onChange={(e) => set('message', e.target.value)}
                  />
                </FormField>
              </div>
            )}

            {/* — Étape 3 : Financement — */}
            {step === 2 && (
              <div className="space-y-6">
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
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField label="Durée souhaitée" required>
                      <Select value={form.duration} onChange={(e) => set('duration', e.target.value)}>
                        <option>0–4 mois</option>
                        <option>4–6 mois</option>
                        <option>6–10 mois</option>
                        <option>10–12 mois</option>
                        <option>Autre durée</option>
                      </Select>
                    </FormField>
                    <FormField label="Apport initial disponible" required>
                      <Input type="number" min={0} placeholder="Ex. 35 000 000 Ar" value={form.downPaymentAmount} onChange={(e) => set('downPaymentAmount', e.target.value)} />
                    </FormField>
                  </div>
                )}

                <div className="flex items-center gap-4 rounded-2xl border border-navy-900/8 bg-white px-5 py-4">
                  <LandPlot className="h-5 w-5 shrink-0 text-gold-700" />
                  <div>
                    <strong className="block text-sm font-medium text-navy-900">{land.title}</strong>
                    <span className="text-xs font-normal text-navy-900/80">
                      {formatAriary(land.price)} • Réf. {landReference(land)}
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
          <button onClick={next} className="btn-gold">
            Continuer <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button onClick={submit} className="btn-gold">
            Envoyer ma demande <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>

    </div>
  );
}
