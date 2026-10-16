/* ==========================================================================
   Champ de recherche de lieu, calqué sur le comportement de Google Maps.

   Comportement retenu (c'était la demande) :
   · je tape → la liste des propositions s'affiche (après 350 ms d'inactivité) ;
   · je choisis une proposition → la carte se déplace, et LA LISTE RESTE
     OUVERTE : je vois la ligne choisie surlignée, les autres propositions sont
     toujours là, je peux en essayer une autre sans retaper la recherche ;
   · la liste ne se ferme que si je le décide : bouton ✕, touche Échap, ou
     clic en dehors du champ ;
   · la liste se réaffiche dès que je remets le curseur dans le champ ;
   · clavier : ↑ ↓ pour parcourir, Entrée pour choisir, Échap pour fermer
     (utile en soutenance, et obligatoire pour l'accessibilité WCAG).
   ========================================================================== */

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, CornerDownLeft, Search, X } from 'lucide-react';
import { searchPlaces, type Place } from '../services/placeService';

/** Délai avant d'interroger le service : évite une requête par touche. */
const DEBOUNCE_MS = 350;

export default function PlaceSearchBox({
  onSelect,
  placeholder = 'Rechercher un lieu… (ex. Ivato, Talatamaty, Ambohidratrimo)',
  className = '',
  near,
}: {
  /** Appelé à chaque choix dans la liste — la carte se déplace à ce moment-là. */
  onSelect: (place: Place) => void;
  placeholder?: string;
  className?: string;
  /**
   * Centre de la carte affichée : sert à classer d'abord les lieux de la zone
   * visible (« Ivato » de Tana avant « Ivato » d'Ambositra), comme Google Maps.
   */
  near?: () => { lat: number; lng: number } | undefined;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false); // une recherche a-t-elle abouti ?
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [active, setActive] = useState(-1);

  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const listId = `${useId()}-places`;

  const selected = useMemo(() => results.find((r) => r.id === selectedId) ?? null, [results, selectedId]);

  /* — Fermeture au clic en dehors du champ (jamais automatiquement). — */
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  /* — Recherche différée pendant la frappe. — */
  useEffect(() => {
    clearTimeout(timer.current);
    const q = query.trim();

    if (q.length < 2) {
      abort.current?.abort();
      setResults([]);
      setLoading(false);
      setSearched(false);
      setError('');
      return;
    }

    setLoading(true);
    timer.current = setTimeout(() => {
      abort.current?.abort(); // une seule recherche en vol
      const controller = new AbortController();
      abort.current = controller;
      searchPlaces(q, controller.signal, near?.())
        .then((found) => {
          setResults(found);
          setSearched(true);
          setError('');
          setActive(found.length > 0 ? 0 : -1);
          setOpen(true);
        })
        .catch((err: Error) => {
          if (err?.name === 'AbortError') return;
          setResults([]);
          setSearched(true);
          setError(err.message);
          setOpen(true);
        })
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer.current);
  }, [query]);

  const choose = (place: Place) => {
    setSelectedId(place.id);
    setQuery(place.title); // comme Google Maps : le nom choisi reste dans le champ…
    setOpen(true); // …et la liste des autres propositions reste accessible
    setError('');
    onSelect(place);
    input.current?.focus();
  };

  const clear = () => {
    abort.current?.abort();
    setQuery('');
    setResults([]);
    setSelectedId(null);
    setActive(-1);
    setSearched(false);
    setError('');
    setOpen(false);
    input.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (results.length === 0) return;
      e.preventDefault();
      setOpen(true);
      setActive((i) => {
        const next = e.key === 'ArrowDown' ? i + 1 : i - 1;
        if (next < 0) return results.length - 1;
        if (next >= results.length) return 0;
        return next;
      });
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const target = results[active] ?? results[0];
      if (target) choose(target);
    }
  };

  const showEmpty = open && searched && !loading && results.length === 0 && query.trim().length >= 2;

  return (
    <div ref={box} className={`relative ${className}`}>
      <div className="flex items-center gap-2 rounded-2xl border border-navy-900/10 bg-white px-4 py-3 focus-within:border-gold-500">
        <Search className="h-4 w-4 shrink-0 text-navy-900/50" aria-hidden />
        <input
          ref={input}
          type="text"
          role="combobox"
          aria-expanded={open && (results.length > 0 || showEmpty)}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 && results[active] ? `${listId}-${results[active].id}` : undefined}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setOpen(true); // la liste revient au clic dans le champ
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-navy-900 outline-none placeholder:text-navy-900/40"
          aria-label="Rechercher un lieu sur la carte"
        />
        {loading && (
          <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-gold-500 border-t-transparent" aria-hidden />
        )}
        {query && !loading && (
          <button type="button" onClick={clear} aria-label="Effacer la recherche" className="shrink-0 text-navy-900/40 hover:text-navy-900">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* — Liste des propositions : reste ouverte après un choix (Google Maps) et
          ne prend pas toute la largeur de la carte, afin de laisser accessibles
          les boutons « Vue satellite » et « Ma position » pendant qu'on compare. — */}
      {open && (results.length > 0 || showEmpty) && (
        <div className="absolute left-0 right-0 top-full z-[500] mt-2 overflow-hidden rounded-2xl border border-navy-900/10 bg-white shadow-xl shadow-navy-900/10 sm:right-auto sm:w-[30rem] sm:max-w-full">
          {results.length > 0 && (
            <ul id={listId} role="listbox" aria-label="Propositions de lieux" className="max-h-72 overflow-y-auto">
              {results.map((place, index) => {
                const isSelected = place.id === selectedId;
                const isActive = index === active;
                return (
                  <li
                    key={place.id}
                    id={`${listId}-${place.id}`}
                    role="option"
                    aria-selected={isSelected}
                    className={isActive && !isSelected ? 'bg-gold-500/10' : undefined}
                  >
                    <button
                      type="button"
                      onClick={() => choose(place)}
                      onMouseEnter={() => setActive(index)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition ${isSelected ? 'bg-gold-500/15' : 'hover:bg-gold-500/10'}`}
                    >
                      <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${isSelected ? 'bg-gold-500 text-navy-900' : 'bg-navy-900/8 text-navy-900/40'}`}>
                        {isSelected ? <Check className="h-3.5 w-3.5" /> : <Search className="h-3 w-3" />}
                      </span>
                      <span className="min-w-0">
                        <strong className="block truncate text-sm font-medium text-navy-900">{place.title}</strong>
                        {place.subtitle && <small className="mt-0.5 block truncate text-xs text-navy-900/70">{place.subtitle}</small>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {showEmpty && (
            <p className="px-4 py-3 text-sm text-navy-900/70">
              Aucun lieu trouvé pour « {query.trim()} ». Zoomez et cliquez directement sur la carte.
            </p>
          )}

          {/* Aide clavier + repère choisi : la liste reste ouverte, l'utilisateur décide. */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-navy-900/8 bg-navy-900/[0.02] px-4 py-2.5">
            <span className="text-xs text-navy-900/60">
              {selected ? `Repère placé : ${selected.title}` : '↑ ↓ pour parcourir · Entrée pour choisir'}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-navy-900/70 transition hover:bg-navy-900/5"
            >
              <CornerDownLeft className="h-3 w-3" aria-hidden /> Fermer la liste
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-1.5 text-xs font-medium text-amber-700">{error}</p>}
    </div>
  );
}
