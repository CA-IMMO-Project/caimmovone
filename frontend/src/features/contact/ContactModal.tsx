/* ==========================================================================
   « Nous contacter » — modale de contact du site public.
   S'ouvre depuis la navbar et l'accueil (useContactModal). Le message est
   envoyé à l'API Laravel (POST /api/v1/messages) et arrive directement
   dans l'écran « Messages » du back office.
   ========================================================================== */

import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, Mail, MessageSquare, Phone, Send } from 'lucide-react';
import { ErrorBanner, FormField, Input, Modal, Textarea } from '../../shared/ui';
import { createContactMessage } from '../../services/requestService';
import { PHONE_1, PHONE_1_TEL, PHONE_2, PHONE_2_TEL, WHATSAPP_URL } from '../../lib/contact';
import { phoneError } from '../../lib/validate';

const ContactContext = createContext<{ open: () => void }>({ open: () => {} });

/** Permet d'ouvrir la modale de contact depuis n'importe quel écran public. */
export function useContactModal() {
  return useContext(ContactContext);
}

export function ContactProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <ContactContext.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <ContactModal open={open} onClose={() => setOpen(false)} />
    </ContactContext.Provider>
  );
}

const EMPTY = { firstName: '', lastName: '', phone: '', email: '', subject: '', message: '' };

function ContactModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const set = <K extends keyof typeof EMPTY>(k: K, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const close = () => {
    onClose();
    // réinitialise doucement après la fermeture (pas de flash visuel)
    window.setTimeout(() => { setSent(false); setError(null); setBusy(false); setForm(EMPTY); }, 250);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sent) return close();
    setError(null);
    if (!form.firstName.trim() || !form.lastName.trim() || !form.message.trim()) {
      setError('Merci de renseigner au minimum votre nom et votre message.');
      return;
    }
    const phone = phoneError(form.phone);
    if (phone) {
      setError(phone);
      return;
    }
    setBusy(true);
    try {
      // Le service met le message en forme et l'envoie à l'API (voir services/).
      await createContactMessage({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        subject: form.subject.trim() || undefined,
        message: form.message.trim(),
      });
      setSent(true);
    } catch {
      setError("L’envoi a échoué. Vérifiez votre connexion puis réessayez.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title={sent ? undefined : 'Nous contacter'} subtitle={sent ? undefined : 'Une question, un projet ? Écrivez-nous, nous répondons sous 24 – 48 h ouvrées.'}>
      {sent ? (
        <div className="px-2 py-6 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-green-100">
            <CheckCircle2 className="h-7 w-7 text-green-700" />
          </span>
          <h3 className="mt-5 font-display text-xl font-bold text-navy-900">Message bien envoyé</h3>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-navy-900/80">
            Merci&nbsp;! Votre message est arrivé dans notre back office —
            l’équipe CA IMMO vous recontacte très vite.
          </p>
          <button onClick={close} className="btn-gold mt-7">Fermer</button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          {error && <ErrorBanner>{error}</ErrorBanner>}
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Prénom" required>
              <Input placeholder="Ex. Andry" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
            </FormField>
            <FormField label="Nom" required>
              <Input placeholder="Ex. Rakoto" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
            </FormField>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Téléphone" required>
              <Input type="tel" icon={Phone} placeholder="034 12 345 67" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </FormField>
            <FormField label="Adresse email">
              <Input type="email" icon={Mail} placeholder="vous@exemple.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </FormField>
          </div>
          <FormField label="Sujet">
            <Input placeholder="Ex. Question sur un terrain, visite, estimation…" value={form.subject} onChange={(e) => set('subject', e.target.value)} />
          </FormField>
          <FormField label="Votre message" required>
            <Textarea rows={5} placeholder="Écrivez votre message ici…" value={form.message} onChange={(e) => set('message', e.target.value)} />
          </FormField>

          <button type="submit" disabled={busy || !form.firstName.trim() || !form.lastName.trim() || !form.phone.trim() || !form.message.trim()} className="btn-gold w-full justify-center disabled:cursor-not-allowed disabled:opacity-40">
            <Send className="h-4 w-4" />
            {busy ? 'Envoi en cours…' : 'Envoyer le message'}
          </button>

          {/* Canaux directs — pour ceux qui préfèrent appeler */}
          <p className="border-t border-navy-900/10 pt-4 text-center text-xs leading-relaxed text-navy-900/75">
            Vous préférez nous joindre directement&nbsp;?
            <br />
            <a href={PHONE_1_TEL} className="font-semibold text-navy-900 underline decoration-gold-500 decoration-2 underline-offset-4">{PHONE_1}</a>
            <span className="mx-1.5" aria-hidden>·</span>
            <a href={PHONE_2_TEL} className="font-semibold text-navy-900 underline decoration-gold-500 decoration-2 underline-offset-4">{PHONE_2}</a>
            <span className="mx-1.5" aria-hidden>·</span>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-navy-900 underline decoration-gold-500 decoration-2 underline-offset-4">
              <MessageSquare className="h-3 w-3" /> WhatsApp
            </a>
          </p>
        </form>
      )}
    </Modal>
  );
}
