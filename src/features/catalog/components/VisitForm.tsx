/* Formulaire de visite — extrait de LandDetail pour lisibilité. */

import { useEffect, useState } from 'react';
import { CalendarDays, Clock3 } from 'lucide-react';
import { FormField, Input, Select, Textarea } from '../../../shared/ui';
import { AccountNote, AuthModal } from '../../auth/AuthModule';
import { createReservation, nextRequestRef } from '../../../lib/dossiers';
import type { AuthUser } from '../../../lib/auth';
import type { Land, ReservationPayload } from '../../../types';
import { usePendingAuth } from '../../auth/usePendingAuth';

export default function VisitForm({ land, onDone }: { land: Land; onDone: (ref: string) => void }) {
  const { user, guard, authModalProps } = usePendingAuth<ReservationPayload>();
  const [form, setForm] = useState({ date: '', time: '10:00', fullName: '', phone: '', message: '' });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const today = new Date().toISOString().slice(0, 10);

  // Connecté : coordonnées pré-remplies depuis le compte (comme les autres formulaires).
  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        fullName: f.fullName || user.fullName,
        phone: f.phone || user.phone,
      }));
    }
  }, [user]);

  const finalize = async (payload: ReservationPayload, asUser: AuthUser) => {
    const ref = nextRequestRef('VIS');
    await createReservation({
      ...payload,
      ref,
      userId: asUser.id,
      fullName: payload.fullName || asUser.fullName,
      phone: payload.phone || asUser.phone,
      email: asUser.email,
    });
    onDone(ref);
  };

  const submit = async () => {
    const payload: ReservationPayload = {
      kind: 'visite',
      landId: land.id,
      fullName: form.fullName,
      phone: form.phone,
      visitDate: form.date,
      visitTime: form.time,
      message: form.message,
    };
    guard(payload, finalize);
  };

  return (
    <div>
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
        <FormField label="Votre nom et prénom" required className="sm:col-span-2">
          <Input placeholder="Nom complet" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
        </FormField>
        <FormField label="Numéro de téléphone" required className="sm:col-span-2">
          <Input type="tel" placeholder="+261 34 00 000 00" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
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
        <AccountNote />
        <div className="flex justify-end">
          <button className="btn-gold disabled:cursor-not-allowed disabled:opacity-40" disabled={!form.date || !form.fullName || !form.phone} onClick={submit}>
            Demander cette visite <CalendarDays className="h-4 w-4" />
          </button>
        </div>
      </div>

      <AuthModal {...authModalProps(finalize)} />
    </div>
  );
}

