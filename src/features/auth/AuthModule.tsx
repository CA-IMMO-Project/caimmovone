import { useState } from 'react';
import { CheckCircle2, Lock, ShieldCheck, UserPlus, UserRound } from 'lucide-react';
import { ErrorBanner, Modal } from '../../shared/ui';
import { AuthUser, useAuth } from '../../lib/auth';

/* ==========================================================================
   Module Connexion / Inscription — réutilisable (modale des formulaires,
   page /connexion, futur espace client).
   ========================================================================== */

export function AccountNote({ className = '' }: { className?: string }) {
  return (
    <p className={`flex items-start gap-2.5 text-xs font-normal leading-relaxed text-navy-900/85 ${className}`}>
      <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-700" aria-hidden />
      <span>
        <strong className="font-semibold text-navy-900">Un compte est requis</strong> pour valider cette demande et la
        suivre dans votre espace. Pas encore de compte ? Il se crée en 30 secondes, à l’envoi.
      </span>
    </p>
  );
}

export function AuthForm({
  onSuccess,
  initialMode = 'register',
  submitLabels,
  initialValues,
}: {
  onSuccess: (user: AuthUser) => void;
  initialMode?: 'login' | 'register';
  submitLabels?: { register: string; login: string };
  /** Coordonnées déjà saisies (formulaire d'origine) : l'inscription est pré-remplie. */
  initialValues?: { firstName?: string; lastName?: string; phone?: string; email?: string };
}) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: initialValues?.firstName ?? '',
    lastName: initialValues?.lastName ?? '',
    phone: initialValues?.phone ?? '',
    email: initialValues?.email ?? '',
    password: '',
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const tabs = [
    { id: 'register' as const, label: 'Créer un compte', icon: UserPlus },
    { id: 'login' as const, label: 'Se connecter', icon: UserRound },
  ];

  /* Robustesse du mot de passe — indicateur texte (jamais la couleur seule). */
  const strength = (() => {
    if (mode !== 'register' || !form.password) return null;
    let s = 0;
    if (form.password.length >= 10) s++;
    if (/\d/.test(form.password)) s++;
    if (/[a-zA-ZÀ-ÿ]/.test(form.password) && form.password.length >= 6) s++;
    return Math.max(1, s);
  })();

  const labels = submitLabels ?? {
    register: 'Créer mon compte et valider',
    login: 'Se connecter et valider',
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result =
      mode === 'register'
        ? register({
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            phone: form.phone,
            password: form.password,
          })
        : login(form.email, form.password);
    if (!result.ok || !result.user) {
      setError(result.error ?? 'Une erreur est survenue.');
      return;
    }
    onSuccess(result.user);
  };

  return (
    <div>
      {/* Onglets — sémantique tablist + navigation aux flèches */}
      <div
        role="tablist"
        aria-label="Connexion ou inscription"
        className="mb-5 flex rounded-full border border-navy-900/30 bg-white p-1"
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
            setMode((m) => (m === 'register' ? 'login' : 'register'));
            setError(null);
          }
        }}
      >
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            onClick={() => {
              setMode(id);
              setError(null);
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-xs font-semibold transition-all duration-300 ${
              mode === id ? 'bg-navy-900 text-white' : 'text-navy-900/75 hover:text-navy-900'
            }`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {error && <ErrorBanner className="mb-5">{error}</ErrorBanner>}

      <form onSubmit={submit} className="space-y-4">
        <p className="text-xs text-navy-900/85">
          <em className="not-italic font-semibold text-gold-700" aria-hidden>*</em> Champs obligatoires
        </p>

        {mode === 'register' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">Prénom<em className="ml-0.5 not-italic text-gold-700" aria-hidden>*</em></span>
              <input className="input" required value={form.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="Votre prénom" />
            </label>
            <label className="block">
              <span className="field-label">Nom</span>
              <input className="input" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="Votre nom" />
            </label>
            <label className="block sm:col-span-2">
              <span className="field-label">Téléphone<em className="ml-0.5 not-italic text-gold-700" aria-hidden>*</em></span>
              <input className="input" type="tel" required value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+261 34 00 000 00" />
            </label>
          </div>
        )}

        <label className="block">
          <span className="field-label">Adresse email<em className="ml-0.5 not-italic text-gold-700" aria-hidden>*</em></span>
          <input className="input" type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="vous@exemple.com" />
        </label>

        <label className="block">
          <span className="field-label">Mot de passe<em className="ml-0.5 not-italic text-gold-700" aria-hidden>*</em></span>
          <input
            className="input"
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            placeholder={mode === 'register' ? '6 caractères minimum' : 'Votre mot de passe'}
          />
        </label>

        {strength !== null && (
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 rounded-full bg-navy-900/10">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  strength === 1 ? 'w-1/3 bg-red-600' : strength === 2 ? 'w-2/3 bg-gold-500' : 'w-full bg-green-700'
                }`}
              />
            </div>
            <small className={`text-xs font-semibold ${strength === 1 ? 'text-red-700' : strength === 2 ? 'text-navy-900/85' : 'text-green-700'}`}>
              {['', 'Faible', 'Moyen', 'Fort'][strength]}
            </small>
          </div>
        )}

        <button type="submit" className="btn-gold mt-2 w-full">
          {labels[mode]}
        </button>
      </form>

      <p className="mt-5 flex items-start gap-2.5 text-xs font-normal leading-relaxed text-navy-900/80">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-700" aria-hidden />
        Vos informations restent confidentielles et servent uniquement au suivi de vos demandes auprès de CA IMMO.
      </p>
    </div>
  );
}

export function AuthModal({
  open,
  onClose,
  onSuccess,
  initialMode = 'register',
  defaults,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (user: AuthUser) => void;
  initialMode?: 'login' | 'register';
  /** Coordonnées déjà saisies dans le formulaire d'origine (pré-remplissage). */
  defaults?: { firstName?: string; lastName?: string; phone?: string; email?: string };
}) {
  return (
    <Modal open={open} onClose={onClose} size="sm" title="Validez et suivez vos demandes" subtitle="Créez votre compte ou connectez-vous pour finaliser l’envoi.">
      <div className="mb-6 grid gap-2.5">
        {['Suivi de vos demandes d’achat et de visite', 'Réponses et confirmations au même endroit', 'Historique conservé dans votre espace'].map((t) => (
          <p key={t} className="flex items-center gap-2.5 text-xs font-normal text-navy-900/85">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-700" aria-hidden />
            {t}
          </p>
        ))}
      </div>
      <AuthForm onSuccess={onSuccess} initialMode={initialMode} initialValues={defaults} />
    </Modal>
  );
}
