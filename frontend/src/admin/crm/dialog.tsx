/* ==========================================================================
   Boîtes de dialogue uniformes du back office.
   Remplacent les confirm() / alert() natifs du navigateur par des modales
   à la charte du site (grands arrondis, fond marine flouté, pied d'actions).

   Module volontairement AUTONOME (seulement React) pour éviter tout cycle
   d'import : sync.ts s'en sert pour signaler un échec de synchronisation.
   ========================================================================== */

import { useEffect, useState } from 'react';

type Pending = { message: string; confirm: boolean };
let resolver: ((v: boolean) => void) | null = null;
let setter: ((p: Pending | null) => void) | null = null;

function show(message: string, confirm: boolean): Promise<boolean> {
  if (!setter) {
    // Hôte non monté (hors back office) : repli sur les boîtes natives.
    if (confirm) return Promise.resolve(window.confirm(message));
    window.alert(message);
    return Promise.resolve(true);
  }
  resolver?.(false); // une seule boîte à la fois
  const next = new Promise<boolean>((resolve) => { resolver = resolve; });
  setter({ message, confirm });
  return next;
}

/** Demande de confirmation charté — résout true si « Confirmer ». */
export const askConfirm = (message: string): Promise<boolean> => show(message, true);

/** Information bloquante chartée — équivalent de alert(). */
export const notice = (message: string): Promise<boolean> => show(message, false);

/** À monter une seule fois dans AdminLayout. */
export function DialogHost() {
  const [p, setP] = useState<Pending | null>(null);
  useEffect(() => { setter = setP; return () => { setter = null; }; }, []);
  const done = (v: boolean) => { setP(null); resolver?.(v); resolver = null; };
  if (!p) return null;
  return (
    <div
      className="fixed inset-0 z-[120] overflow-y-auto overscroll-contain bg-navy-950/40 backdrop-blur-sm"
      onKeyDown={(e) => { if (e.key === 'Escape') done(false); }}
    >
      {/* L'overlay défile : barre de défilement au bord droit de l'écran. */}
      <div
        className="flex min-h-full w-full items-center justify-center p-4 sm:p-6"
        onMouseDown={(e) => { if (e.target === e.currentTarget) done(false); }}
      >
        <div role="alertdialog" aria-modal="true" aria-label={p.confirm ? 'Confirmation' : 'Information'} className="w-full max-w-md rounded-[2rem] bg-white shadow-2xl">
          <div className="border-b border-navy-900/10 px-7 pt-6 pb-5">
            <h3 className="text-xl font-bold tracking-tight text-navy-900">{p.confirm ? 'Confirmation' : 'Information'}</h3>
          </div>
          <p className="whitespace-pre-line px-7 pt-6 pb-7 text-sm leading-relaxed text-navy-900/85">{p.message}</p>
          <div className="flex justify-end gap-2 rounded-b-[2rem] border-t border-navy-900/10 bg-white px-7 py-4">
            {p.confirm && (
              <button
                type="button"
                onClick={() => done(false)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-navy-900 transition-colors hover:bg-gray-50"
              >
                Annuler
              </button>
            )}
            <button
              type="button"
              autoFocus
              onClick={() => done(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-navy-900 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-800"
            >
              {p.confirm ? 'Confirmer' : 'OK'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
