/* Formulaire de visite — extrait de LandDetail pour lisibilité. */

import { useState } from 'react';
import { CalendarDays, Clock3 } from 'lucide-react';
import { ErrorBanner, FormField, Input, Select, Textarea } from '../../../shared/ui';
import { phoneError } from '../../../lib/validate';
import { createReservation } from '../../../services/requestService';
import type { Land, ReservationPayload } from '../../../types';

export default function VisitForm({ land, onDone }: { land: Land; onDone: (ref: string) => void }) {
  const [form, setForm] = useState({ date: '', time: '10:00', firstName: '', lastName: '', phone: '', message: '' });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const today = new Date().toISOString().slice(0, 10);

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
        <FormField label="Heure souhaitée" required>
          <Select value={form.time} onChange={(e) => set('time', e.target.value)}>
            <option>09:00</option>
            <option>10:00</option>
            <option>11:30</option>
            <option>14:00</option>
            <option>15:30</option>
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
        <FormField label="Commentaire (facultatif)" className="sm:col-span-2">
          <Textarea rows={3} placeholder="Une question ou une précision pour la visite ?" value={form.message} onChange={(e) => set('message', e.target.value)} />
        </FormField>
      </div>

      <p className="mt-5 flex items-center gap-2.5 text-xs font-normal text-navy-900/80">
        <Clock3 className="h-4 w-4 shrink-0 text-gold-700" />
        CA IMMO confirmera le créneau par SMS et par téléphone.
      </p>

      <div className="mt-8 space-y-4">
        <div className="flex justify-end">
          <button className="btn-gold disabled:cursor-not-allowed disabled:opacity-40" disabled={!form.date || !form.firstName || !form.lastName || !form.phone} onClick={submit}>
            Demander cette visite <CalendarDays className="h-4 w-4" />
          </button>
        </div>
      </div>

    </div>
  );
}

