/* Formulaire de visite — extrait de LandDetail pour lisibilité. */

import { useState } from 'react';
import { CalendarDays, Clock3 } from 'lucide-react';
import { ErrorBanner, FormField, Input, Select, Textarea } from '../../../shared/ui';
import { phoneError } from '../../../lib/validate';
import { createReservation } from '../../../services/requestService';
import type { SubmitResult } from '../../../services/requestService';
import type { Land, ReservationPayload } from '../../../types';

export default function VisitForm({ land, onDone }: { land: Land; onDone: (result: SubmitResult) => void }) {
  const [form, setForm] = useState({ date: '', time: 'Matin (9h – 12h)', firstName: '', lastName: '', phone: '', message: '' });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const today = new Date().toISOString().slice(0, 10);

  const [sending, setSending] = useState(false);
  const finalize = async (payload: ReservationPayload) => {
    if (sending) return; // anti double-clic : un seul envoi à la fois
    setSending(true);
    setError(null);
    try {
      const result = await createReservation(payload); // référence générée par le backend
      onDone(result);
    } catch (e) {
      // Message du serveur quand il en fournit un (ex. demande d\u00e9j\u00e0 en cours sur ce terrain).
      setError(e instanceof Error && e.message !== '' ? e.message : 'L\u2019enregistrement a \u00e9chou\u00e9. V\u00e9rifiez votre connexion puis r\u00e9essayez.');
    } finally {
      setSending(false);
    }
  };

  const submit = async () => {
    setError(null);
    if (!form.firstName.trim() || !form.lastName.trim() || !form.date) {
      setError('Merci de renseigner votre prénom, votre nom et la date souhaitée.');
      return;
    }
    const phone = phoneError(form.phone);
    if (phone) {
      setError(phone);
      return;
    }
    const payload: ReservationPayload = {
      kind: 'visite',
      landId: land.id,
      fullName: `${form.firstName} ${form.lastName}`.trim(),
      phone: form.phone,
      visitDate: form.date,
      visitTime: form.time,
      message: form.message,
    };
    finalize(payload);
  };

  return (
    <div>
      {error && <ErrorBanner className="mb-5">{error}</ErrorBanner>}
      <p className="mb-7 text-sm font-normal leading-relaxed text-navy-900/85">
        Choisissez un créneau : un membre de notre équipe se déplace avec vous et répond à vos questions sur place.
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Date souhaitée" required>
          <Input type="date" min={today} value={form.date} onChange={(e) => set('date', e.target.value)} />
        </FormField>
        <FormField label="Plage horaire" required>
          <Select value={form.time} onChange={(e) => set('time', e.target.value)}>
            <option>Matin (9h – 12h)</option>
            <option>Après-midi (14h – 17h)</option>
          </Select>
        </FormField>
        <FormField label="Prénom" required>
          <Input placeholder="Ex. Andry" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
        </FormField>
        <FormField label="Nom" required>
          <Input placeholder="Ex. Rakoto" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
        </FormField>
        <FormField label="Numéro de téléphone" required className="sm:col-span-2" hint="Format : 034 12 345 67 ou +261 34 12 345 67">
          <Input type="tel" placeholder="034 12 345 67" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </FormField>
        <FormField label="Commentaire" className="sm:col-span-2">
          <Textarea rows={3} placeholder="Une question ou une précision pour la visite ?" value={form.message} onChange={(e) => set('message', e.target.value)} />
        </FormField>
      </div>

      <p className="mt-5 flex items-center gap-2.5 text-xs font-normal text-navy-900/80">
        <Clock3 className="h-4 w-4 shrink-0 text-gold-700" />
        Choisissez simplement une plage : CA IMMO vous confirme le créneau exact par téléphone sous 24 h ouvrées.
      </p>

      <div className="mt-8 space-y-4">
        <div className="flex justify-end">
          <button className="btn-gold disabled:cursor-not-allowed disabled:opacity-40" disabled={sending || !form.date || !form.firstName || !form.lastName || !form.phone} onClick={submit}>
            Demander cette visite <CalendarDays className="h-4 w-4" />
          </button>
        </div>
      </div>

    </div>
  );
}

