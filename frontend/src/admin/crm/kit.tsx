// Composants partagés des modules « Demandes d'achat » et « Terrains ».
import { ReactNode, useEffect, useRef, useId, useMemo, useState } from 'react';
import {
  ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Download, Eye, FileDown, FileSpreadsheet, FileText, Film, Printer, Search, SlidersHorizontal, Upload, X,
} from 'lucide-react';
import { Circle, MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { newId } from '../../lib/store';
import { formatPhone, phoneHref } from '../../lib/phone';
import { formatAriary, formatArea, formatDateShort, formatDateTime, formatNumber } from '../../lib/format';
import { ADMIN_BADGE_BASE, ADMIN_BUTTON_BASE, ADMIN_BUTTON_DANGER, ADMIN_BUTTON_GOLD, ADMIN_BUTTON_ICON, ADMIN_BUTTON_OUTLINE, ADMIN_BUTTON_PRIMARY, ADMIN_INPUT, ADMIN_SURFACE } from '../tokens';
import { ADMIN_STATUS_TONES, adminToneClass } from '../status';
import type { HistoryEntry, Note, StoredFile } from './model';
import { ACTOR } from './model';
import { downloadFile, formatSize, putFile, useFileUrl } from './files';
import { notice } from './dialog';
import { useBodyScrollLock, useDialogFocus } from '../../shared/ui';

// ---------- Primitives et formats partagés ----------
export const input = ADMIN_INPUT;
export const btn = ADMIN_BUTTON_BASE;
export const btnPrimary = ADMIN_BUTTON_PRIMARY;
export const btnGold = ADMIN_BUTTON_GOLD;
export const btnOutline = ADMIN_BUTTON_OUTLINE;
export const btnDanger = ADMIN_BUTTON_DANGER;
export const btnIcon = ADMIN_BUTTON_ICON;

export const fmtAr = formatAriary;
export const fmtNum = formatNumber;
export const fmtM2 = formatArea;
export const fmtDate = formatDateShort;
export const fmtDateTime = formatDateTime;
/** Date relative, scannable : « il y a 2 h », « hier », puis date courte. */
export function fmtRelative(iso?: string): string {
  if (!iso) return '—';
  const timestamp = new Date(iso).getTime();
  if (Number.isNaN(timestamp)) return '—';
  const min = Math.floor((Date.now() - timestamp) / 60000);
  if (min < 1) return 'à l’instant';
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'hier';
  if (d < 7) return `il y a ${d} j`;
  return fmtDate(iso);
}

/** Cellule date relative (date exacte au survol). */
export function RelDate({ iso }: { iso?: string }) {
  return <span className="whitespace-nowrap text-gray-500" title={fmtDateTime(iso)}>{fmtRelative(iso)}</span>;
}

/** Téléphone cliquable dans une ligne de tableau (n'ouvre pas la fiche). */
export function TelLink({ phone }: { phone?: string }) {
  if (!phone) return <span className="text-gray-600">—</span>;
  return (
    <a
      href={phoneHref(phone)}
      onClick={(e) => e.stopPropagation()}
      className="whitespace-nowrap text-navy-900 underline-offset-2 hover:text-gold-700 hover:underline"
    >
      {formatPhone(phone)}
    </a>
  );
}

// ---------- Mise en page ----------
export function Section({ title, icon, children, action, confidential, hint }: {
  title: string; icon?: ReactNode; children: ReactNode; action?: ReactNode; confidential?: boolean; hint?: ReactNode;
}) {
  return (
    <section className={ADMIN_SURFACE}>
      <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
        <h2 className="flex items-center gap-2 font-semibold text-navy-900">
          {icon && <span className="text-gold-700">{icon}</span>}
          {title}
          {confidential && <span className="ml-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-50 text-red-700">Confidentiel</span>}
        </h2>
        {action}
      </header>
      <div className="p-5">
        {hint && <p className="mb-4 -mt-1 text-sm text-gray-500">{hint}</p>}
        {children}
      </div>
    </section>
  );
}

export function Grid({ children, cols = 3 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  const c = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' }[cols];
  return <div className={`grid grid-cols-1 ${c} gap-4`}>{children}</div>;
}

export function Field({ label, required, children, hint, error, span, full = false }: {
  label: string; required?: boolean; children: ReactNode; hint?: string; error?: string; span?: 'full' | 2; full?: boolean;
}) {
  const s = full || span === 'full' ? 'sm:col-span-2 lg:col-span-full' : span === 2 ? 'sm:col-span-2' : '';
  return (
    <label className={`block ${s}`}>
      <span className="block text-xs font-medium text-gray-600 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
      {error ? <span className="block text-xs text-red-600 mt-1">{error}</span> : hint && <span className="block text-xs text-gray-600 mt-1">{hint}</span>}
    </label>
  );
}

export function Select({ value, onChange, options, placeholder, className = '' }: {
  value: string; onChange: (v: string) => void; options: readonly string[]; placeholder?: string; className?: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={`${input} ${className}`}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

/** Boutons segmentés (choix unique). */
export function Choice({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
            value === o ? 'bg-navy-900 border-navy-900 text-white' : 'bg-white border-gray-300 text-gray-700 hover:border-navy-900'
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

/** Choix multiple. */
export function MultiChoice({ value, onChange, options }: { value: string[]; onChange: (v: string[]) => void; options: readonly string[] }) {
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o]);
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => toggle(o)}
          className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
            value.includes(o) ? 'bg-gold-500 border-gold-500 text-navy-950' : 'bg-white border-gray-300 text-gray-700 hover:border-navy-900'
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function NumberInput({ value, onChange, suffix, placeholder }: { value: number; onChange: (n: number) => void; suffix?: string; placeholder?: string }) {
  return (
    <div className="relative">
      <input
        type="number"
        min={0}
        value={value || ''}
        onChange={(e) => onChange(Number(e.target.value))}
        placeholder={placeholder}
        className={`${input} ${suffix ? 'pr-14' : ''}`}
      />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600">{suffix}</span>}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: NoInfer<T>; label: string; badge?: number | string }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="admin-scroll-x flex gap-1 border-b border-gray-200 mb-5 -mx-1 px-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            value === t.id ? 'border-gold-500 text-navy-900' : 'border-transparent text-gray-500 hover:text-navy-900'
          }`}
        >
          {t.label}
          {t.badge !== undefined && t.badge !== 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px]">{t.badge}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ---------- Badges ----------
export function Badge({ value, dot }: { value: string; dot?: boolean }) {
  const tone = ADMIN_STATUS_TONES[value] ?? 'gray';
  return (
    <span className={`${ADMIN_BADGE_BASE} font-medium ${adminToneClass(tone)}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
      {value}
    </span>
  );
}

// ---------- Progression ----------
export function Stepper({ steps, current, failed }: { steps: string[]; current: number; failed?: string }) {
  return (
    <div>
      <ol className="flex items-center">
        {steps.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={s} className="flex-1 flex items-center last:flex-none">
              <div className="flex flex-col items-center">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    done ? 'bg-gold-500 border-gold-500 text-navy-950' : active ? 'bg-navy-900 border-navy-900 text-white' : 'bg-white border-gray-300 text-gray-600'
                  }`}
                >
                  {i + 1}
                </span>
              </div>
              {i < steps.length - 1 && <span className={`flex-1 h-0.5 mx-1 ${done ? 'bg-gold-500' : 'bg-gray-200'}`} />}
            </li>
          );
        })}
      </ol>
      <div className="hidden md:flex mt-2">
        {steps.map((s, i) => (
          <span key={s} className={`flex-1 last:flex-none last:text-right text-[11px] ${i === current ? 'text-navy-900 font-semibold' : 'text-gray-600'}`}>
            {s}
          </span>
        ))}
      </div>
      <p className="md:hidden mt-2 text-xs text-navy-900 font-semibold">Étape {current + 1} / {steps.length} : {steps[current]}</p>
      {failed && <p className="mt-2 text-xs text-red-600">Dossier {failed.toLowerCase()}</p>}
    </div>
  );
}

// ---------- Tableau de données ----------
export interface Column<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  sort?: (row: T) => string | number;
  csv?: (row: T) => string | number;
  className?: string;
}

export function DataTable<T extends { id: string }>({ rows, columns, onOpen, selected, onSelect, rowActions, rowClass, pageSize = 10 }: {
  rows: T[]; columns: Column<T>[]; onOpen: (row: T) => void;
  selected: string[]; onSelect: (ids: string[]) => void; rowActions?: (row: T) => ReactNode;
  /** Classe additionnelle par ligne (ex. surligner les dossiers non traités). */
  rowClass?: (row: T) => string; pageSize?: number;
}) {
  const [sortKey, setSortKey] = useState<string>('');
  const [dir, setDir] = useState<1 | -1>(1);
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [rows]);

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sort) return rows;
    return [...rows].sort((a, b) => {
      const x = col.sort!(a), y = col.sort!(b);
      return (x < y ? -1 : x > y ? 1 : 0) * dir;
    });
  }, [rows, columns, sortKey, dir]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pages);
  const shown = sorted.slice((current - 1) * pageSize, current * pageSize);
  const allShown = shown.length > 0 && shown.every((r) => selected.includes(r.id));

  const toggleSort = (key: string) => {
    if (sortKey === key) setDir(dir === 1 ? -1 : 1);
    else { setSortKey(key); setDir(1); }
  };
  const toggleAll = () =>
    onSelect(allShown ? selected.filter((id) => !shown.some((r) => r.id === id)) : [...new Set([...selected, ...shown.map((r) => r.id)])]);

  return (
    <div className={`${ADMIN_SURFACE} overflow-hidden`}>
      <div
        className="admin-scroll-x"
        role="region"
        aria-label="Tableau de résultats, défilement horizontal possible"
        tabIndex={0}
      >
        <table className="w-full min-w-max text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th scope="col" className="p-3 w-10"><input type="checkbox" checked={allShown} onChange={toggleAll} aria-label="Tout sélectionner sur cette page" /></th>
              <th scope="col" className="p-2 w-10"><span className="sr-only">Ouvrir la fiche</span></th>
              {columns.map((c) => (
                <th scope="col" key={c.key} className={`p-3 font-medium whitespace-nowrap ${c.className ?? ''}`}>
                  {c.sort ? (
                    <button type="button" onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 hover:text-navy-900">
                      {c.label}
                      {sortKey !== c.key ? <ArrowUpDown className="w-3 h-3 opacity-40" /> : dir === 1 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    </button>
                  ) : c.label}
                </th>
              ))}
              {rowActions && <th className="p-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {shown.map((r) => (
              <tr key={r.id} className={`hover:bg-gold-400/5 cursor-pointer ${selected.includes(r.id) ? 'bg-gold-400/10' : rowClass?.(r) ?? ''}`} onClick={() => onOpen(r)}>
                {/* h-16 : hauteur de ligne identique sur toutes les listes du back office */}
                <td className="p-3 h-16" onClick={(event) => event.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.includes(r.id)}
                    onChange={() => onSelect(selected.includes(r.id) ? selected.filter((id) => id !== r.id) : [...selected, r.id])}
                    aria-label={`Sélectionner le dossier ${r.id}`}
                  />
                </td>
                <td className="p-2" onClick={(event) => event.stopPropagation()}>
                  <button type="button" className={btnIcon} aria-label={`Ouvrir la fiche ${r.id}`} title="Ouvrir la fiche" onClick={() => onOpen(r)}>
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  </button>
                </td>
                {columns.map((c) => <td key={c.key} className={`p-3 ${c.className ?? ''}`}>{c.render(r)}</td>)}
                {rowActions && <td className="p-3 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>{rowActions(r)}</td>}
              </tr>
            ))}
            {shown.length === 0 && (
              <tr><td colSpan={columns.length + 2 + (rowActions ? 1 : 0)} className="p-10 text-center text-gray-600">Aucun dossier ne correspond aux filtres.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="border-t border-gray-100 bg-gray-50/60 px-4 py-1.5 text-[11px] text-gray-500 sm:hidden">
        Faites glisser le tableau horizontalement pour voir toutes les colonnes.
      </p>
      <footer className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
        <span>{sorted.length} dossier(s){selected.length > 0 && ` · ${selected.length} sélectionné(s)`}</span>
        <div className="flex items-center gap-1">
          <button className={btnIcon} disabled={current === 1} onClick={() => setPage(current - 1)} aria-label="Page précédente"><ChevronLeft className="w-4 h-4" /></button>
          <span className="px-2">Page {current} / {pages}</span>
          <button className={btnIcon} disabled={current === pages} onClick={() => setPage(current + 1)} aria-label="Page suivante"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </footer>
    </div>
  );
}

/** Export CSV (s'ouvre directement dans Excel, séparateur « ; » et BOM UTF-8 pour les accents). */
export function exportCsv<T>(rows: T[], columns: Column<T>[], filename: string) {
  const cols = columns.filter((c) => c.csv);
  const esc = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [cols.map((c) => esc(c.label)).join(';'), ...rows.map((r) => cols.map((c) => esc(c.csv!(r))).join(';'))];
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Échappe les valeurs dynamiques avant de les insérer dans un document HTML imprimable. */
export function escapeHtml(value: unknown): string {
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value ?? '').replace(/[&<>"']/g, (character) => entities[character]!);
}

/** Impression / export PDF d'un tableau : ouvre une page imprimable (choisir « Enregistrer en PDF »). */
export function printTable<T>(rows: T[], columns: Column<T>[], title: string) {
  const cols = columns.filter((c) => c.csv);
  const esc = escapeHtml;
  printHtml(
    title,
    `<table><thead><tr>${cols.map((c) => `<th>${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${rows
      .map((r) => `<tr>${cols.map((c) => `<td>${esc(c.csv!(r))}</td>`).join('')}</tr>`)
      .join('')}</tbody></table>`,
  );
}

export function printHtml(title: string, body: string) {
  const w = window.open('', '_blank');
  if (!w) { void notice('Autorisez les fenêtres pop-up pour imprimer.'); return; }
  const safeTitle = escapeHtml(title);
  // `body` peut contenir du HTML de présentation : ses valeurs dynamiques
  // doivent toujours passer par escapeHtml() avant l'appel.
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${safeTitle}</title><style>
    body{font-family:system-ui,sans-serif;color:#0b1e42;margin:24px;font-size:12px}
    h1{font-size:18px;margin:0 0 4px} .muted{color:#6b7280} h2{font-size:14px;margin:20px 0 8px;border-bottom:2px solid #f7c325;padding-bottom:4px}
    table{width:100%;border-collapse:collapse;margin-top:12px} th,td{border:1px solid #e5e7eb;padding:6px;text-align:left;vertical-align:top}
    th{background:#f3f6fb} dl{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;margin:0} dt{color:#6b7280} dd{margin:0 0 6px;font-weight:600}
    img{max-width:32%;margin:4px;border-radius:6px}
  </style></head><body><h1>CA IMMO — ${safeTitle}</h1><p class="muted">Généré le ${formatDateTime(new Date().toISOString())}</p>${body}</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 800); // laisse le temps aux images de se charger
}

// ---------- Fichiers ----------
export function FileDrop({ accept, maxMb, multiple, onFiles, label, hint, visibility = 'private' }: {
  accept: string; maxMb: number; multiple?: boolean; onFiles: (files: StoredFile[]) => void; label: string; hint?: string;
  visibility?: 'public' | 'private';
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handle = async (list: FileList | null) => {
    if (!list?.length) return;
    setError('');
    const types = accept.split(',').map((t) => t.trim());
    const ok: File[] = [];
    for (const f of Array.from(list)) {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      if (!types.includes(f.type) && !types.includes(ext)) { setError(`Format non accepté : ${f.name}`); continue; }
      if (f.size > maxMb * 1024 * 1024) { setError(`${f.name} dépasse ${maxMb} Mo`); continue; }
      ok.push(f);
    }
    if (!ok.length) return;
    setBusy(true);
    try {
      onFiles(await Promise.all(ok.map((file) => putFile(file, visibility))));
    } catch {
      setError('Impossible d’enregistrer le fichier (espace de stockage du navigateur insuffisant ?).');
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = '';
    }
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => ref.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files); }}
        className={`flex flex-col items-center justify-center gap-1 px-4 py-6 border-2 border-dashed rounded-xl cursor-pointer text-center transition-colors ${
          over ? 'border-gold-500 bg-gold-400/10' : 'border-gray-300 hover:border-navy-900 bg-gray-50'
        }`}
      >
        <Upload className="w-6 h-6 text-gray-600" />
        <span className="text-sm font-medium text-navy-900">{busy ? 'Enregistrement…' : label}</span>
        <span className="text-xs text-gray-600">Glisser-déposer ou cliquer · {hint}</span>
        <input ref={ref} type="file" accept={accept} multiple={multiple} className="hidden" onChange={(e) => handle(e.target.files)} />
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

export function Thumb({ file, className = '' }: { file: StoredFile; className?: string }) {
  const url = useFileUrl((file.type ?? '').startsWith('image/') ? file : undefined);
  // `type` peut être absent/null pour des documents historiques (anciens
  // libellés texte migrés sans type MIME connu) : on sécurise avec `?? ''`
  // pour ne jamais planter sur `.startsWith(...)`.
  const type = file.type ?? '';
  if (type.startsWith('image/')) return url ? <img src={url} alt={file.name} className={`object-cover ${className}`} referrerPolicy="no-referrer" loading="lazy" decoding="async" /> : <div className={`bg-gray-100 ${className}`} />;
  const Icon = type.startsWith('video/') ? Film : FileText;
  return <div className={`flex items-center justify-center bg-gray-100 text-gray-600 ${className}`}><Icon className="w-6 h-6" /></div>;
}

export function FileChip({ file, onPreview, onRemove }: { file: StoredFile; onPreview: () => void; onRemove?: () => void }) {
  return (
    <div className="flex items-center gap-3 p-2 border border-gray-200 rounded-lg">
      <Thumb file={file} className="w-10 h-10 rounded" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.name}</p>
        <p className="text-xs text-gray-600">{formatSize(file.size)}</p>
      </div>
      <button type="button" className={btnIcon} onClick={onPreview} aria-label="Aperçu"><Eye className="w-4 h-4" /></button>
      <button type="button" className={btnIcon} onClick={() => downloadFile(file)} aria-label="Télécharger"><Download className="w-4 h-4" /></button>
      {onRemove && <button type="button" className={`${btnIcon} hover:text-red-600`} onClick={onRemove} aria-label="Retirer"><X className="w-4 h-4" /></button>}
    </div>
  );
}

export function Preview({ file, onClose }: { file: StoredFile | null; onClose: () => void }) {
  const { url, resolved } = useFileUrl(file ?? undefined, true);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!file || !element) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (!element.open) element.showModal();
    return () => {
      if (element.open) element.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [file?.id]);
  if (!file) return null;
  return (
    <dialog ref={dialog} aria-label={file.name} onCancel={(event) => { event.preventDefault(); onClose(); }} className="fixed inset-0 z-[60] m-0 h-dvh w-screen max-h-none max-w-none bg-black/90 p-0 text-white backdrop:bg-black/80 open:flex open:flex-col" onClick={onClose}>
      <div className="flex items-center justify-between p-4 text-white" onClick={(e) => e.stopPropagation()}>
        <span className="truncate">{file.name}</span>
        <div className="flex gap-2">
          {(url || !resolved) && <button className={`${btn} bg-white/10 hover:bg-white/20`} onClick={() => downloadFile(file)}><Download className="w-4 h-4" /> Télécharger</button>}
          <button className={`${btn} bg-white/10 hover:bg-white/20`} onClick={onClose} aria-label="Fermer"><X className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-4 min-h-0" onClick={(e) => e.stopPropagation()}>
        {(() => {
          const type = file.type ?? '';
          if (!url) {
            if (!resolved) return <p className="text-white/60">Chargement…</p>;
            return <p className="text-white/70">Aucun fichier déposé pour cette pièce (document historique sans fichier joint).</p>;
          }
          if (type.startsWith('image/')) return <img src={url} alt={file.name} className="max-h-full max-w-full rounded-lg" referrerPolicy="no-referrer" loading="eager" decoding="async" />;
          if (type.startsWith('video/')) return <video src={url} controls className="max-h-full max-w-full rounded-lg" />;
          if (type === 'application/pdf') return <iframe src={url} title={file.name} className="w-full h-full bg-white rounded-lg" />;
          return <p className="text-white/70">Aperçu indisponible pour ce format. Utilisez « Télécharger ».</p>;
        })()}
      </div>
    </dialog>
  );
}

// ---------- Carte ----------
// Repère unifié — identique au site public (shared/GeoMapPicker).
const pin = L.divIcon({
  className: '',
  html: `<svg width="30" height="38" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 1C6.8 1 1 6.8 1 13.9 1 23.6 14 34.8 14 34.8S27 23.6 27 13.9C27 6.8 21.2 1 14 1Z" fill="#f7c325" stroke="#0b1e42" stroke-width="2"/>
    <circle cx="14" cy="14" r="5.5" fill="#0b1e42"/>
  </svg>`,
  iconSize: [30, 38],
  iconAnchor: [15, 37],
});
const TANA: [number, number] = [-18.8792, 47.5079];

function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

export function MapPicker({ lat, lng, onChange, readOnly, height = 'h-80', radiusKm }: {
  lat?: number; lng?: number; onChange?: (lat: number, lng: number) => void; readOnly?: boolean; height?: string; radiusKm?: number;
}) {
  const [satellite, setSatellite] = useState(false); // Plan par défaut — comme le site public
  const [map, setMap] = useState<L.Map | null>(null);
  const [geoError, setGeoError] = useState('');
  // lat/lng peuvent valoir null (recherche publique sans point placé) : on ne garde que des nombres valides.
  const pos: [number, number] | undefined = typeof lat === 'number' && Number.isFinite(lat) && typeof lng === 'number' && Number.isFinite(lng) ? [lat, lng] : undefined;
  const set = (a: number, b: number) => onChange?.(Number(a.toFixed(6)), Number(b.toFixed(6)));

  const locate = () => {
    setGeoError('');
    if (!navigator.geolocation) return setGeoError('Géolocalisation non disponible sur cet appareil.');
    navigator.geolocation.getCurrentPosition(
      (p) => { set(p.coords.latitude, p.coords.longitude); map?.setView([p.coords.latitude, p.coords.longitude], 17); },
      () => setGeoError('Position introuvable (autorisez la localisation dans le navigateur).'),
      { enableHighAccuracy: true },
    );
  };

  return (
    <div>
      {/* isolate : les calques Leaflet restent sous les modales. */}
      <div className={`relative isolate z-0 ${height} rounded-xl overflow-hidden border border-gray-200`}>
        <MapContainer center={pos ?? TANA} zoom={pos ? 16 : 11} className="w-full h-full z-0" ref={setMap} scrollWheelZoom>
          {satellite ? (
            <TileLayer attribution="Tiles &copy; Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={19} />
          ) : (
            <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          )}
          {!readOnly && <ClickToPlace onPick={set} />}
          {pos && radiusKm ? <Circle center={pos} radius={radiusKm * 1000} pathOptions={{ color: '#f7c325', weight: 2, fillOpacity: 0.15 }} /> : null}
          {pos && (
            <Marker
              position={pos}
              icon={pin}
              draggable={!readOnly}
              eventHandlers={{ dragend: (e) => { const p = (e.target as L.Marker).getLatLng(); set(p.lat, p.lng); } }}
            />
          )}
        </MapContainer>
        <div className="absolute top-3 right-3 z-[400] flex flex-col gap-2">
          <button type="button" onClick={() => setSatellite(!satellite)} className={`${btn} bg-white shadow text-navy-900 hover:bg-gray-50`}>
            {satellite ? 'Plan' : 'Satellite'}
          </button>
          {!readOnly && <button type="button" onClick={locate} className={`${btn} bg-white shadow text-navy-900 hover:bg-gray-50`}>Ma position</button>}
        </div>
      </div>
      {!readOnly && <p className="text-xs text-gray-600 mt-1.5">Cliquez sur la carte ou déplacez le marqueur pour enregistrer la position exacte.</p>}
      {geoError && <p className="text-xs text-red-600 mt-1">{geoError}</p>}
    </div>
  );
}

// ---------- Historique et notes ----------
export function Timeline({ items }: { items: HistoryEntry[] }) {
  const sorted = [...items].sort((a, b) => b.at.localeCompare(a.at));
  if (!sorted.length) return <p className="text-sm text-gray-600">Aucun historique.</p>;
  return (
    <ol className="relative border-l-2 border-gray-100 ml-2 space-y-4">
      {sorted.map((h) => (
        <li key={h.id} className="pl-4 relative">
          <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-gold-500 ring-4 ring-white" />
          <p className="text-sm text-navy-900">{h.text}</p>
          <p className="text-xs text-gray-600">{fmtDateTime(h.at)} · {h.author}</p>
        </li>
      ))}
    </ol>
  );
}

export function NotesPanel({ notes, onAdd }: { notes: Note[]; onAdd: (n: Note) => void }) {
  const [text, setText] = useState('');
  const add = () => {
    if (!text.trim()) return;
    onAdd({ id: newId(), at: new Date().toISOString(), author: ACTOR, text: text.trim() });
    setText('');
  };
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Note interne (non visible par le client)…" className={input} />
        <button type="button" onClick={add} className={`${btnPrimary} self-start`}>Ajouter</button>
      </div>
      {[...notes].sort((a, b) => b.at.localeCompare(a.at)).map((n) => (
        <div key={n.id} className="p-3 rounded-lg bg-amber-50 border border-amber-100">
          <p className="text-sm whitespace-pre-line">{n.text}</p>
          <p className="text-xs text-gray-500 mt-1">{fmtDateTime(n.at)} · {n.author}</p>
        </div>
      ))}
      {!notes.length && <p className="text-sm text-gray-600">Aucune note interne.</p>}
    </div>
  );
}

// ---------- Fenêtre modale simple ----------
/* Modale du back office — même habillage que le site public (grandes
   arrondis, en-tête titre + fermeture ronde, pied de modale), et le contenu
   déroule DANS la modale comme les longs formulaires de l'admin. */
export function Modal({ title, children, onClose, footer, wide }: { title: string; children: ReactNode; onClose: () => void; footer?: ReactNode; wide?: boolean }) {
  const titleId = useId();
  const panelRef = useDialogFocus(true, onClose);
  useBodyScrollLock(true);

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain bg-navy-950/40 backdrop-blur-sm">
      {/* L'overlay défile (pas la carte) : barre de défilement au bord droit de l'écran. */}
      <div
        className="flex min-h-full w-full items-end justify-center p-0 sm:items-center sm:p-6"
        onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className={`w-full rounded-t-[2rem] bg-white shadow-2xl outline-none sm:rounded-[2rem] ${wide ? 'max-w-3xl' : 'max-w-xl'}`}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="sticky top-0 z-10 flex items-start justify-between gap-6 border-b border-navy-900/10 bg-white px-7 pt-6 pb-5">
            <h2 id={titleId} className="text-xl font-bold tracking-tight text-navy-900">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer la fenêtre de dialogue"
              className="rounded-full border border-navy-900/20 p-2.5 text-navy-900/75 transition hover:bg-brand-50 hover:text-navy-900"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="px-7 pt-6 pb-7">{children}</div>
          {footer && <div className="sticky bottom-0 flex justify-end gap-2 border-t border-navy-900/10 bg-white px-7 py-4">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

export function Stat({ label, value, tone = 'text-navy-900' }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-bold mt-1 ${tone}`}>{value}</p>
    </div>
  );
}

export function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm text-navy-900 font-medium mt-0.5 break-words">{value || '—'}</dd>
    </div>
  );
}

/** Filtre de date compact avec libellé intégré (« Du » / « Au »). */
export function DateFilter({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative min-w-0">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-600 pointer-events-none">{label}</span>
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className={`${input} pl-9 min-w-0`} aria-label={label} />
    </div>
  );
}

// ---------- Coquille commune des listes ----------

/** En-tête de page uniforme : titre + sous-titre à gauche, action à droite. */
export { PageHeader } from '../ui';

/**
 * Barre d'outils uniforme de toutes les listes du back-office :
 * recherche, panneau « Filtres » dépliable avec compteur, actions groupées
 * et exports Excel / PDF / Imprimer — toujours au même endroit.
 */
export function ListToolbar<T>({
  q, onQ, placeholder, filters, activeFilters = 0, bulk,
  exportRows, exportColumns, exportName, exportTitle,
}: {
  q: string;
  onQ: (v: string) => void;
  placeholder?: string;
  /** Contenu du panneau de filtres ; affiche le bouton « Filtres » s'il est fourni. */
  filters?: ReactNode;
  /** Nombre de filtres actifs (pastille sur le bouton « Filtres »). */
  activeFilters?: number;
  /** Zone d'actions groupées (affichée à gauche des exports). */
  bulk?: ReactNode;
  /** Lignes à exporter (sélection si présente, sinon lignes filtrées). */
  exportRows?: () => T[];
  exportColumns?: Column<T>[];
  exportName?: string;
  exportTitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const canExport = !!(exportRows && exportColumns);
  const title = exportTitle ?? exportName ?? 'Liste';
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-4 space-y-3">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
        <input value={q} onChange={(e) => onQ(e.target.value)} placeholder={placeholder ?? 'Rechercher…'} className={`${input} pl-9 ${filters ? 'pr-28' : ''}`} />
        {filters && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={`absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${open ? 'bg-navy-900 text-white' : 'text-navy-900 hover:bg-gray-100'}`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" /> Filtres
            {activeFilters > 0 && <span className="grid h-4 min-w-4 place-items-center rounded-full bg-gold-500 px-1 text-[10px] font-bold text-navy-900">{activeFilters}</span>}
          </button>
        )}
      </div>
      {filters && open && <div className="grid grid-cols-2 md:grid-cols-4 gap-2">{filters}</div>}
      {(bulk || canExport) && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {bulk}
          {canExport && (
            <div className="flex gap-2 ml-auto">
              <button className={btnOutline} onClick={() => exportCsv(exportRows!(), exportColumns!, exportName ?? 'export')}><FileSpreadsheet className="w-4 h-4" /> Excel</button>
              <button className={btnOutline} onClick={() => printTable(exportRows!(), exportColumns!, title)}><FileDown className="w-4 h-4" /> PDF</button>
              <button className={btnOutline} onClick={() => printTable(exportRows!(), exportColumns!, title)}><Printer className="w-4 h-4" /> Imprimer</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
