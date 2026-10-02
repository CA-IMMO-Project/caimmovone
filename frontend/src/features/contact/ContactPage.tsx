import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, MapPin, Send, CheckCircle, X, Facebook, Clock } from 'lucide-react';
import { FB_URL, PHONE_1, PHONE_1_TEL, PHONE_2, PHONE_2_TEL } from '../../lib/contact';
import { createContactMessage } from '../../services/requestService';
import { phoneError, emailError } from '../../lib/validate';
import { PageHero } from '../../shared/ui';

const IMG_CONTACT = '/media/terrains/highlands.jpg';

/* Champs et libellés — même style que la page Contact de référence. */
const field =
  'w-full rounded-xl border border-navy-900/10 bg-brand-50 px-4 py-3 text-sm text-navy-900 transition placeholder:text-navy-900/40 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500';
const label = 'mb-2 block text-sm font-semibold text-navy-900';

const SUBJECTS = [
  'Achat de terrain',
  'Vente de terrain',
  'Recherche de terrain',
  'Vérification de titre foncier',
  'Construction',
  'Autre demande',
];

export default function ContactPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!firstName.trim() || !lastName.trim() || !message.trim()) {
      setError('Merci de renseigner votre prénom, votre nom et votre message.');
      return;
    }
    const badPhone = phoneError(phone);
    if (badPhone) {
      setError(badPhone);
      return;
    }
    const badEmail = emailError(email);
    if (badEmail) {
      setError(badEmail);
      return;
    }
    setIsSubmitting(true);
    try {
      await createContactMessage({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        subject,
        message: message.trim(),
      });
      setIsSubmitted(true);
      setFirstName('');
      setLastName('');
      setPhone('');
      setEmail('');
      setMessage('');
      window.setTimeout(() => setIsSubmitted(false), 6000);
    } catch (err) {
      // Message du serveur s'il en fournit un (sinon repli générique).
      setError(err instanceof Error && err.message !== '' ? err.message : 'L’envoi a échoué. Vérifiez votre connexion puis réessayez.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const infos = [
    { icon: MapPin, title: 'Zone d’intervention', body: <>Antananarivo et toute Madagascar</> },
    {
      icon: Phone,
      title: 'Téléphone',
      body: (
        <>
          <a href={PHONE_1_TEL} className="block transition-colors hover:text-gold-600">{PHONE_1}</a>
          <a href={PHONE_2_TEL} className="block transition-colors hover:text-gold-600">{PHONE_2}</a>
        </>
      ),
    },
    { icon: Facebook, title: 'Facebook', body: <a href={FB_URL} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-gold-600">CA IMMO</a> },
    { icon: Clock, title: 'Disponibilité', body: <>Lun-Sam, 8h-18h</> },
  ];

  return (
    <div className="font-display bg-white">
      <PageHero
        pill="Parlons de votre projet"
        title={<>Nous <span className="text-gold-500">contacter</span></>}
        lead="Une question sur un terrain, un titre foncier, une vente ou une recherche ? Notre équipe vous répond rapidement."
        image={IMG_CONTACT}
      >
        <div className="flex flex-wrap gap-4">
          <a
            href={PHONE_1_TEL}
            className="inline-flex items-center gap-2 rounded-full bg-gold-500 px-7 py-3.5 text-sm font-semibold text-navy-900 shadow-lg shadow-gold-500/30 transition hover:-translate-y-0.5 hover:bg-gold-400"
          >
            <Phone className="h-4 w-4" /> Appeler maintenant
          </a>
          <Link
            to="/terrains"
            className="inline-flex items-center gap-2 rounded-full border border-white/60 px-7 py-3.5 text-sm font-medium text-white transition hover:bg-white hover:text-navy-900"
          >
            Découvrir nos terrains
          </Link>
        </div>
      </PageHero>

      <section className="bg-brand-50 py-16 md:py-20">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
          {/* Coordonnées */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            <p className="flex items-center gap-3 text-sm font-semibold text-navy-900">
              <span className="h-[3px] w-7 rounded-full bg-gold-500" /> Nos coordonnées
            </p>
            <h2 className="text-2xl font-extrabold tracking-tight text-navy-900 md:text-3xl">Une équipe à votre écoute</h2>
            <div className="space-y-3 pt-2">
              {infos.map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex items-start gap-4 rounded-2xl border border-navy-900/5 bg-white p-5 shadow-xl shadow-navy-900/5">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold-500/15 text-gold-600">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-navy-900/60">{title}</p>
                    <div className="mt-1 text-sm font-medium text-navy-900">{body}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Formulaire */}
          <motion.div
            id="formulaire"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative scroll-mt-24 rounded-2xl border border-navy-900/5 bg-white p-6 shadow-xl shadow-navy-900/5 sm:p-10 lg:col-span-2"
          >
            <p className="flex items-center gap-3 text-sm font-semibold text-navy-900">
              <span className="h-[3px] w-7 rounded-full bg-gold-500" /> Formulaire de contact
            </p>
            <h2 className="mb-8 mt-2 text-2xl font-extrabold tracking-tight text-navy-900 md:text-3xl">Envoyez-nous un message</h2>

            <AnimatePresence>
              {isSubmitted && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-gold-500 bg-gold-400/15 px-5 py-4 text-navy-900"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 shrink-0 text-gold-600" />
                    <div>
                      <p className="font-semibold">Message envoyé avec succès !</p>
                      <p className="text-sm text-navy-900/70">Notre équipe vous contactera dans les plus brefs délais.</p>
                    </div>
                  </div>
                  <button onClick={() => setIsSubmitted(false)} className="rounded-full p-2 hover:bg-gold-400/30" aria-label="Fermer">
                    <X className="h-5 w-5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <div className="mb-6 rounded-xl bg-red-50 px-5 py-4 text-sm text-red-700" role="alert">
                {error}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit} noValidate>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className={label}>Prénom</label>
                  <input type="text" id="firstName" required autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={field} placeholder="Rakoto" />
                </div>
                <div>
                  <label htmlFor="lastName" className={label}>Nom</label>
                  <input type="text" id="lastName" required autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} className={field} placeholder="Andrianina" />
                </div>
                <div>
                  <label htmlFor="phone" className={label}>Téléphone</label>
                  <input type="tel" id="phone" required autoComplete="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={field} placeholder="034 12 345 67" />
                </div>
                <div>
                  <label htmlFor="email" className={label}>Email <span className="font-normal text-navy-900/50">(facultatif)</span></label>
                  <input type="email" id="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} placeholder="vous@exemple.com" />
                </div>
              </div>

              <div>
                <label htmlFor="subject" className={label}>Sujet</label>
                <select id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} className={field}>
                  {SUBJECTS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="message" className={label}>Message</label>
                <textarea id="message" required rows={6} value={message} onChange={(e) => setMessage(e.target.value)} className={`${field} resize-none`} placeholder="Décrivez votre projet ou votre question…" />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold-500 px-8 py-3.5 text-sm font-semibold text-navy-900 shadow-lg shadow-gold-500/30 transition hover:-translate-y-0.5 hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:w-auto"
              >
                <Send className="h-4 w-4" />
                {isSubmitting ? 'Envoi en cours…' : 'Envoyer le message'}
              </button>
            </form>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
