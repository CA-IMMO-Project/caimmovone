/* ==========================================================================
   usePendingAuth — « valide l'action après connexion ».
   Factorise le pattern dupliqué des formulaires : si l'utilisateur est
   connecté, l'action part immédiatement ; sinon on ouvre la modale de
   connexion et l'action part dès l'authentification, sans quitter la page.
   ========================================================================== */

import { useRef, useState } from 'react';
import { useAuth } from '../../lib/auth';
import type { AuthUser } from '../../lib/auth';

/** Coordonnées transmises à la modale de connexion pour pré-remplir l'inscription. */
export interface ContactDefaults {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
}

/** Extrait prénom / nom / téléphone / email d'un payload de demande. */
const toContactDefaults = (p: unknown): ContactDefaults => {
  const r = p as { fullName?: string; phone?: string; email?: string };
  const parts = (r.fullName ?? '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
    phone: r.phone ?? '',
    email: r.email ?? '',
  };
};

export function usePendingAuth<T>() {
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const pending = useRef<T | null>(null);

  /** Exécute l'action maintenant, ou la met en attente derrière la modale. */
  const guard = (payload: T, finalize: (p: T, u: AuthUser) => void | Promise<void>) => {
    if (user) void finalize(payload, user);
    else {
      pending.current = payload;
      setAuthOpen(true);
    }
  };

  /** À étaler sur <AuthModal> : reprend l'action mise en attente et
      pré-remplit l'inscription avec les coordonnées déjà saisies. */
  const authModalProps = (finalize: (p: T, u: AuthUser) => void | Promise<void>) => ({
    open: authOpen,
    onClose: () => setAuthOpen(false),
    onSuccess: (u: AuthUser) => {
      setAuthOpen(false);
      const p = pending.current;
      if (p) void finalize(p, u);
    },
    defaults: pending.current ? toContactDefaults(pending.current) : undefined,
  });

  return { user, guard, authModalProps };
}
