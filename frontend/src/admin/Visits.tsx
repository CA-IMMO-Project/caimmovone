/* ==========================================================================
   Demandes de visite (VIS) — écran dédié du back office.
   Les visites ne suivent pas le tunnel d'achat : leur cycle est
   Demandée → Confirmée → Effectuée (ou Reportée / Annulée).
   Données : mêmes lignes que les demandes (kind = "visite"), lues via le
   cache synchronisé (crm/model) — aucune duplication côté API.
   ========================================================================== */

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, CalendarPlus, Mail, MapPin, Phone, Search, User } from 'lucide-react';
import { getLands } from '../lib/store';
import { BuyRequest, fullName, getBuyRequest, getBuyRequests, historyEntry, saveBuyRequest } from './crm/model';
import { getClient } from './crm/people';
import {
  Badge, Column, DataTable, Section, Select, Stat, Timeline, btnIcon, btnOutline,
  exportCsv, fmtAr, fmtDate, input,
} from './crm/kit';

const BASE = '/admin/visites';

export const VISIT_STATUSES = ['Demandée', 'Confirmée', 'Reportée', 'Effectuée', 'Annulée'] as const;
export type VisitStatus = (typeof VISIT_STATUSES)[number];

/** Les demandes de visite uniquement (le reste part sur l'écran Achats). */
export function getVisitRequests(): BuyRequest[] {
  return getBuyRequests().filter((r) => (r.kind ?? 'interet') === 'visite');
}

/** Statuts historiques → vocabulaire des visites. */
export const visitStatusOf = (r: BuyRequest): VisitStatus =>
  (VISIT_STATUSES as readonly string[]).includes(r.status) ? (r.status as VisitStatus) : 'Demandée';

const fmtVisitDate = (r: BuyRequest) => (r.visitDate ? `${fmtDate(r.visitDate)}${r.visitTime ? ` · ${r.visitTime}` : ''}` : '—');

// ======================= LISTE =======================
const columns: Column<BuyRequest>[] = [
  { key: 'ref', label: 'Réf', render: (r) => <span className="font-mono text-xs font-semibold">{r.ref}</span>, sort: (r) => r.ref, csv: (r) => r.ref },
  { key: 'client', label: 'Client', render: (r) => (
    <div>
      <p className="font-medium text-navy-900">{fullName(r)}</p>
      <p className="text-xs text-gray-500">{r.phone}</p>
    </div>
  ), sort: (r) => fullName(r).toLowerCase(), csv: (r) => fullName(r) },
  { key: 'land', label: 'Terrain', render: (r) => {
      const land = getLands().find((l) => l.id === r.landId);
      return land ? <span>{land.title}</span> : <span className="text-gray-400">—</span>;
    }, sort: (r) => r.landId, csv: (r) => getLands().find((l) => l.id === r.landId)?.title ?? '' },
  { key: 'date', label: 'Visite souhaitée', render: (r) => <span className="whitespace-nowrap">{fmtVisitDate(r)}</span>, sort: (r) => r.visitDate ?? '', csv: (r) => fmtVisitDate(r) },
  { key: 'status', label: 'Statut', render: (r) => <Badge value={visitStatusOf(r)} dot />, sort: (r) => VISIT_STATUSES.indexOf(visitStatusOf(r)), csv: (r) => visitStatusOf(r) },
  { key: 'created', label: 'Reçue le', render: (r) => <span className="text-gray-500 whitespace-nowrap">{fmtDate(r.createdAt)}</span>, sort: (r) => r.createdAt, csv: (r) => fmtDate(r.createdAt) },
];

export function VisitList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState(getVisitRequests);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  const filtered = rows.filter((r) => {
    const s = q.toLowerCase().trim();
    const land = getLands().find((l) => l.id === r.landId);
    return (!status || visitStatusOf(r) === status) &&
      (!s || [r.ref, fullName(r), r.phone, r.email, land?.title ?? ''].join(' ').toLowerCase().includes(s));
  });

  const demandees = rows.filter((r) => visitStatusOf(r) === 'Demandée').length;
  const confirmees = rows.filter((r) => visitStatusOf(r) === 'Confirmée').length;
  const effectuees = rows.filter((r) => visitStatusOf(r) === 'Effectuée').length;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Demandes de visite</h1>
          <p className="text-sm text-gray-500 mt-1">Visites demandées depuis le site — confirmation et suivi</p>
        </div>
        <div className="flex gap-2">
          <button className={btnOutline} onClick={() => exportCsv(filtered, columns, 'visites')}><CalendarDays className="w-4 h-4" /> Excel</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Stat label="À confirmer" value={demandees} tone="text-blue-700" />
        <Stat label="Confirmées" value={confirmees} tone="text-green-700" />
        <Stat label="Effectuées" value={effectuees} />
        <Stat label="Total" value={rows.length} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-4 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher par référence, nom, téléphone, terrain…" className={`${input} pl-9`} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Select value={status} onChange={setStatus} options={[...VISIT_STATUSES]} placeholder="Tous statuts" />
        </div>
      </div>

      <DataTable
        rows={filtered}
        columns={columns}
        selected={[]}
        onSelect={() => {}}
        onOpen={(r) => navigate(`${BASE}/${r.id}`)}
      />
    </>
  );
}

// ======================= FICHE =======================
export function VisitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [r, setR] = useState(() => (id ? getBuyRequest(id) : undefined));

  if (!r || (r.kind ?? 'interet') !== 'visite') {
    return <p className="text-center py-20 text-gray-500">Visite introuvable. <Link to={BASE} className="underline">Retour</Link></p>;
  }

  const land = getLands().find((l) => l.id === r.landId);
  const client = r.clientId ? getClient(String(r.clientId)) : undefined;

  /** Change le statut et l'inscrit dans l'historique. */
  const changeStatus = (status: VisitStatus) => {
    if (status === visitStatusOf(r)) return;
    void saveBuyRequest({
      ...r,
      status: status as BuyRequest['status'],
      history: [...r.history, historyEntry(`Statut changé : ${visitStatusOf(r)} → ${status}`)],
    }).then(setR);
  };

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div className="flex items-start gap-3">
          <Link to={BASE} className={btnIcon} aria-label="Retour"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-navy-900 font-mono">{r.ref}</h1>
              <Badge value={visitStatusOf(r)} dot />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Demande reçue le {fmtDate(r.createdAt)} · {r.source}
            </p>
          </div>
        </div>
        <div className="w-56">
          <Select value={visitStatusOf(r)} onChange={(v) => changeStatus(v as VisitStatus)} options={[...VISIT_STATUSES]} />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Visite */}
        <Section title="Visite souhaitée" icon={<CalendarDays className="w-4 h-4" />}>
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2">
              <CalendarPlus className="w-4 h-4 text-gold-600" />
              <span className="font-medium text-navy-900">{fmtVisitDate(r)}</span>
            </p>
            {r.message && <p className="text-gray-600 whitespace-pre-line mt-3">« {r.message} »</p>}
          </div>
        </Section>

        {/* Client */}
        <Section title="Client" icon={<User className="w-4 h-4" />}>
          <div className="space-y-2 text-sm">
            <p className="font-medium text-navy-900">{client?.fullName ?? fullName(r)}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-600">
              <a href={`tel:${r.phone.replace(/\s/g, '')}`} className="flex items-center gap-1 hover:text-navy-900"><Phone className="w-3.5 h-3.5" /> {r.phone}</a>
              {r.email && <a href={`mailto:${r.email}`} className="flex items-center gap-1 hover:text-navy-900"><Mail className="w-3.5 h-3.5" /> {r.email}</a>}
            </div>
            {client && (
              <Link to={`/admin/clients/${client.id}`} className="inline-block mt-2 text-xs font-semibold text-gold-700 hover:underline">
                Voir la fiche client →
              </Link>
            )}
          </div>
        </Section>
      </div>

      {/* Terrain */}
      {land && (
        <div className="mt-4">
          <Section title="Terrain concerné" icon={<MapPin className="w-4 h-4" />}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-navy-900">{land.title}</p>
                <p className="text-sm text-gray-500">{land.location} · {fmtAr(land.price)}</p>
              </div>
              <Link to={`/terrains/${land.id}`} target="_blank" className={btnOutline}>Voir sur le site</Link>
            </div>
          </Section>
        </div>
      )}

      {/* Historique */}
      <div className="mt-4">
        <Section title="Historique" icon={<CalendarDays className="w-4 h-4" />}>
          <Timeline items={r.history} />
        </Section>
      </div>
    </>
  );
}
