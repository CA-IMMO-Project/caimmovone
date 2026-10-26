import {
  RecordHeader,
  RecordIdentity,
  SummaryStrip,
  useCollectionState,
} from './records';
/* ==========================================================================
   Demandes de visite (VIS) — écran dédié du back office.
   Les visites ne suivent pas le tunnel d'achat : leur cycle est
   Demandée → Confirmée → Effectuée (ou Reportée / Annulée).
   Données : mêmes lignes que les demandes (kind = "visite"), lues via le
   cache synchronisé (crm/model) — aucune duplication côté API.
   ========================================================================== */

import {
  CalendarDays,
  CalendarPlus,
  FileText,
  History,
  Pencil,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { formatPhone, matchesSearch, phoneHref } from '../lib/phone';
import { getLands } from '../lib/store';
import { LinkedLandCard, StatusFlowBar } from './crm/client';
import {
  Badge,
  Column,
  DataTable,
  Field,
  FileChip,
  Info,
  ListToolbar,
  Modal,
  PageHeader,
  Preview,
  RelDate,
  Section,
  Select,
  Stat,
  Tabs,
  TelLink,
  Timeline,
  btnOutline,
  btnPrimary,
  fmtDate,
  fmtDateTime,
  input,
} from './crm/kit';
import {
  AGENTS,
  BuyRequest,
  StoredFile,
  fullName,
  getBuyRequest,
  getBuyRequests,
  historyEntry,
  saveBuyRequest,
} from './crm/model';
import { getClient } from './crm/people';
import { refreshCache, subscribeCache } from './crm/sync';

const BASE = '/admin/visites';

export const VISIT_STATUSES = [
  'Demandée',
  'Confirmée',
  'Reportée',
  'Effectuée',
  'Annulée',
] as const;
export type VisitStatus = (typeof VISIT_STATUSES)[number];

/** Les demandes de visite uniquement (le reste part sur l'écran Achats). */
export function getVisitRequests(): BuyRequest[] {
  return getBuyRequests().filter((r) => (r.kind ?? 'interet') === 'visite');
}

/** Statuts historiques → vocabulaire des visites. */
export const visitStatusOf = (r: BuyRequest): VisitStatus =>
  (VISIT_STATUSES as readonly string[]).includes(r.status)
    ? (r.status as VisitStatus)
    : 'Demandée';

const fmtVisitDate = (r: BuyRequest) =>
  r.visitDate
    ? `${fmtDate(r.visitDate)}${r.visitTime ? ` · ${r.visitTime}` : ''}`
    : '—';

// ======================= LISTE =======================
const columns: Column<BuyRequest>[] = [
  {
    key: 'identity',
    label: 'Client / référence',
    render: (r) => <RecordIdentity title={fullName(r)} reference={r.ref} />,
    sort: (r) => fullName(r).toLowerCase(),
    csv: (r) => fullName(r),
  },
  {
    key: 'status',
    label: 'État de la visite',
    width: 135,
    render: (r) => <Badge value={visitStatusOf(r)} dot />,
    sort: (r) => VISIT_STATUSES.indexOf(visitStatusOf(r)),
    csv: (r) => visitStatusOf(r),
  },
  {
    key: 'land',
    label: 'Terrain',
    width: 210,
    render: (r) => (
      <span
        className="block truncate"
        title={getLands().find((l) => l.id === r.landId)?.title}
      >
        {getLands().find((l) => l.id === r.landId)?.title || '—'}
      </span>
    ),
    csv: (r) => getLands().find((l) => l.id === r.landId)?.title ?? '',
  },
  {
    key: 'visit',
    label: 'Visite prévue',
    width: 155,
    render: (r) => <span className="whitespace-nowrap">{fmtVisitDate(r)}</span>,
    sort: (r) => r.visitDate ?? '',
    csv: (r) => fmtVisitDate(r),
  },
  {
    key: 'phone',
    label: 'Téléphone',
    width: 145,
    render: (r) => <TelLink phone={r.phone} />,
    csv: (r) => r.phone,
  },
  {
    key: 'date',
    label: 'Reçue le',
    width: 110,
    render: (r) => <RelDate iso={r.createdAt} />,
    sort: (r) => r.createdAt,
    csv: (r) => fmtDate(r.createdAt),
  },
  {
    key: 'ref',
    label: 'Référence',
    render: (r) => r.ref,
    csv: (r) => r.ref,
    defaultVisible: false,
  },
];

export function VisitList() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [rows, setRows] = useState(getVisitRequests);
  useEffect(() => {
    refreshCache().then(() => setRows(getVisitRequests()));
    return subscribeCache(() => setRows(getVisitRequests()));
  }, []); // resync à l'ouverture + mise à jour auto sans F5
  const [q, setQ] = useCollectionState(BASE, 'q', '');
  const [status, setStatus] = useCollectionState(BASE, 'status', '');
  // Pré-filtrage depuis l'URL (ex: lien « Visites à confirmer » du tableau
  // de bord envoie ?status=Demandée pour voir les visites non confirmées).
  useEffect(() => {
    const urlStatus = params.get('status');
    if (urlStatus && urlStatus !== status) {
      setStatus(urlStatus);
    }
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps
  const [selected, setSelected] = useCollectionState<string[]>(
    BASE,
    'selected',
    [],
  );
  const [bulkStatus, setBulkStatus] = useState('');

  const filtered = rows
    .filter((r) => {
      const land = getLands().find((l) => l.id === r.landId);
      return (
        (!status || visitStatusOf(r) === status) &&
        matchesSearch(
          q,
          [r.ref, fullName(r), r.email, land?.title ?? ''],
          [formatPhone(r.phone, r.dialCode), r.phone, r.whatsapp],
        )
      );
    })
    .sort((a, b) => {
      const fresh = (r: BuyRequest) =>
        visitStatusOf(r) === 'Demandée' ? 0 : 1;
      return fresh(a) - fresh(b) || b.createdAt.localeCompare(a.createdAt); // à confirmer d'abord, puis plus récentes
    });

  const applyBulk = async () => {
    if (!bulkStatus || !selected.length) return;
    await Promise.all(
      filtered
        .filter((r) => selected.includes(r.id))
        .map((r) =>
          saveBuyRequest({
            ...r,
            status: bulkStatus as BuyRequest['status'],
            history: [
              ...r.history,
              historyEntry(
                `Statut changé en lot : ${visitStatusOf(r)} → ${bulkStatus}`,
              ),
            ],
          }),
        ),
    );
    setRows(getVisitRequests());
    setSelected([]);
    setBulkStatus('');
  };

  const demandees = rows.filter((r) => visitStatusOf(r) === 'Demandée').length;
  const confirmees = rows.filter(
    (r) => visitStatusOf(r) === 'Confirmée',
  ).length;
  const effectuees = rows.filter(
    (r) => visitStatusOf(r) === 'Effectuée',
  ).length;

  return (
    <>
      <PageHeader
        title="Demandes de visite"
        subtitle="Visites demandées depuis le portail public — confirmation et suivi"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Stat label="À confirmer" value={demandees} tone="text-blue-700" />
        <Stat label="Confirmées" value={confirmees} tone="text-green-700" />
        <Stat label="Effectuées" value={effectuees} />
        <Stat label="Total" value={rows.length} />
      </div>

      <ListToolbar
        q={q}
        onReset={() => {
          setQ('');
          setStatus('');
        }}
        onQ={setQ}
        placeholder="Rechercher par référence, nom, téléphone, terrain…"
        filters={
          <Select
            value={status}
            onChange={setStatus}
            options={[...VISIT_STATUSES]}
            placeholder="Tous statuts"
          />
        }
        activeFilters={status ? 1 : 0}
        bulk={
          selected.length > 0 && (
            <>
              <Select
                value={bulkStatus}
                onChange={setBulkStatus}
                options={[...VISIT_STATUSES]}
                placeholder={`État pour ${selected.length} visite(s)…`}
                className="w-auto"
              />
              <button
                className={btnPrimary}
                onClick={applyBulk}
                disabled={!bulkStatus}
              >
                Appliquer
              </button>
            </>
          )
        }
        exportRows={() =>
          selected.length
            ? filtered.filter((r) => selected.includes(r.id))
            : filtered
        }
        exportColumns={columns}
        exportName="visites"
        exportTitle="Demandes de visite"
      />

      <DataTable
        entityLabel="visites"
        filtered={!!(q || status)}
        onClearFilters={() => {
          setQ('');
          setStatus('');
        }}
        rows={filtered}
        columns={columns}
        selected={selected}
        onSelect={setSelected}
        rowClass={(r) =>
          visitStatusOf(r) === 'Demandée' ? 'bg-blue-50/60' : ''
        }
        onOpen={(r) => navigate(`${BASE}/${r.id}`)}
      />
    </>
  );
}

// ======================= FICHE =======================
export function VisitDetail() {
  const { id } = useParams();
  const [r, setR] = useState(() => (id ? getBuyRequest(id) : undefined));
  const [tab, setTab] = useState<'overview' | 'documents' | 'history'>(
    'overview',
  );
  const [editing, setEditing] = useState(false);
  const [rescheduling, setRescheduling] = useState<{
    markReported: boolean;
  } | null>(null);
  const [draftAgent, setDraftAgent] = useState<string>(r?.agent ?? AGENTS[0]);
  const [draftDate, setDraftDate] = useState<string>(r?.visitDate ?? '');
  const [draftTime, setDraftTime] = useState<string>(r?.visitTime ?? '');
  const [preview, setPreview] = useState<StoredFile | null>(null);

  // Resync à l'ouverture de la fiche + mise à jour auto sans F5 : sans ce bloc,
  // la fiche affiche un instantané figé du cache mémoire (potentiellement
  // périmé si la visite a été modifiée ailleurs entre-temps).
  useEffect(() => {
    if (id) {
      refreshCache(true).then(() => setR(getBuyRequest(id)));
    }
    return subscribeCache(() => {
      if (id) setR(getBuyRequest(id));
    });
  }, [id]);

  if (!r || (r.kind ?? 'interet') !== 'visite') {
    return (
      <p className="text-center py-20 text-gray-500">
        Visite introuvable.{' '}
        <Link to={BASE} className="underline">
          Retour
        </Link>
      </p>
    );
  }

  const land = getLands().find((l) => l.id === r.landId);
  const lot = land?.lots?.find((l) => l.id === r.lotId);
  const client = r.clientId ? getClient(String(r.clientId)) : undefined;
  const currentStatus = visitStatusOf(r);

  const changeStatus = (status: VisitStatus) => {
    if (status === currentStatus) return;
    void saveBuyRequest({
      ...r,
      status: status as BuyRequest['status'],
      history: [
        ...r.history,
        historyEntry(`Statut changé : ${currentStatus} → ${status}`),
      ],
    }).then(setR);
  };

  const openScheduleModal = (markReported: boolean) => {
    setDraftDate(r.visitDate ?? '');
    setDraftTime(r.visitTime ?? '');
    setRescheduling({ markReported });
  };

  const saveSchedule = () => {
    const nextStatus = rescheduling?.markReported
      ? ('Reportée' as BuyRequest['status'])
      : r.status;
    const slotLabel = draftDate
      ? `${fmtDate(draftDate)}${draftTime ? ` à ${draftTime}` : ''}`
      : 'date à définir';
    void saveBuyRequest({
      ...r,
      visitDate: draftDate,
      visitTime: draftTime,
      status: nextStatus,
      history: [
        ...r.history,
        historyEntry(
          rescheduling?.markReported
            ? `Visite reportée au ${slotLabel}`
            : `Créneau de visite fixé au ${slotLabel}`,
        ),
      ],
    }).then(setR);
    setRescheduling(null);
  };

  const changeAgent = (agent: string) => {
    if (agent === r.agent) return;
    void saveBuyRequest({
      ...r,
      agent,
      history: [...r.history, historyEntry(`Visite affectée à ${agent}`)],
    }).then(setR);
  };

  const detailTabs: {
    id: 'overview' | 'documents' | 'history';
    label: string;
  }[] = [
    { id: 'overview', label: 'Résumé' },
    ...(r.attachments.length > 0
      ? [
          {
            id: 'documents' as const,
            label: `Documents (${r.attachments.length})`,
          },
        ]
      : []),
    { id: 'history', label: 'Historique' },
  ];

  return (
    <>
      <RecordHeader
        module="Visites"
        backTo={BASE}
        title={client?.fullName ?? fullName(r)}
        reference={r.ref}
        status={currentStatus}
        subtitle={`Demande reçue le ${fmtDate(r.createdAt)}`}
        action={
          <>
            <button
              className={btnOutline}
              onClick={() => openScheduleModal(false)}
            >
              <Pencil size={15} />
              Modifier le créneau
            </button>
            <button
              className={btnOutline}
              onClick={() => {
                setDraftAgent(r.agent);
                setEditing(true);
              }}
            >
              <User size={15} />
              Affecter
            </button>
          </>
        }
      />
      <SummaryStrip
        facts={[
          { label: 'Visite prévue', value: fmtVisitDate(r) },
          {
            label: 'Terrain',
            value: land ? `${land.title}${lot ? ` — ${lot.number}` : ''}` : '',
          },
          { label: 'Agent', value: r.agent },
          { label: 'Origine', value: r.source || 'Site web' },
        ]}
      />

      <StatusFlowBar
        steps={['Demandée', 'Confirmée', 'Effectuée'] as const}
        current={currentStatus}
        onSelect={changeStatus}
        failedBadge={
          currentStatus === 'Reportée' || currentStatus === 'Annulée'
            ? currentStatus
            : undefined
        }
        title="État de la visite"
        extra={
          <>
            {currentStatus !== 'Reportée' && (
              <button
                type="button"
                onClick={() => openScheduleModal(true)}
                className="rounded-lg border border-amber-200 bg-amber-50/70 px-2.5 py-1.5 text-xs font-medium text-amber-900 transition hover:border-amber-400"
              >
                Reporter
              </button>
            )}
            {currentStatus !== 'Annulée' && (
              <button
                type="button"
                onClick={() => changeStatus('Annulée')}
                className="rounded-lg border border-red-200 bg-red-50/70 px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:border-red-400"
              >
                Annuler
              </button>
            )}
          </>
        }
      />

      <Tabs value={tab} onChange={setTab} tabs={detailTabs} />

      {rescheduling && (
        <Modal
          title={
            rescheduling.markReported
              ? 'Reporter la visite'
              : 'Modifier le créneau de visite'
          }
          onClose={() => setRescheduling(null)}
          footer={
            <>
              <button
                className={btnOutline}
                onClick={() => setRescheduling(null)}
              >
                Annuler
              </button>
              <button
                className={btnPrimary}
                disabled={!draftDate}
                onClick={saveSchedule}
              >
                Enregistrer
              </button>
            </>
          }
        >
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Date de visite" required>
              <input
                type="date"
                className={input}
                value={draftDate}
                onChange={(e) => setDraftDate(e.target.value)}
              />
            </Field>
            <Field label="Créneau / heure">
              <input
                className={input}
                value={draftTime}
                onChange={(e) => setDraftTime(e.target.value)}
                placeholder="Ex : 10h00 ou Matin"
              />
            </Field>
          </div>
        </Modal>
      )}

      {editing && (
        <Modal
          title="Affecter un agent à la visite"
          onClose={() => setEditing(false)}
          footer={
            <>
              <button className={btnOutline} onClick={() => setEditing(false)}>
                Annuler
              </button>
              <button
                className={btnPrimary}
                onClick={() => {
                  changeAgent(draftAgent);
                  setEditing(false);
                }}
              >
                Enregistrer
              </button>
            </>
          }
        >
          <Field label="Agent responsable">
            <Select
              value={draftAgent}
              onChange={setDraftAgent}
              options={AGENTS}
            />
          </Field>
        </Modal>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 min-w-0 space-y-5">
          {tab === 'overview' && (
            <>
              <LinkedLandCard
                landId={r.landId}
                lotId={r.lotId}
                title="Terrain à visiter"
                emptyHint="Aucun terrain rattaché à cette visite."
              />

              <Section
                title="Créneau et précisions"
                icon={<CalendarDays className="w-4 h-4" />}
              >
                <div className="space-y-3 text-sm">
                  <p className="flex items-center gap-2">
                    <CalendarPlus className="w-4 h-4 text-gold-700" />
                    <span className="font-medium text-navy-900">
                      {fmtVisitDate(r)}
                    </span>
                  </p>
                  {r.message ? (
                    <div className="rounded-lg bg-gray-50 p-3 text-slate-600">
                      <strong className="block mb-1 text-slate-800">
                        Précisions du visiteur
                      </strong>
                      <p className="whitespace-pre-line">{r.message}</p>
                    </div>
                  ) : (
                    <p className="text-gray-500">
                      Aucune précision complémentaire laissée lors de la demande.
                    </p>
                  )}
                </div>
              </Section>
            </>
          )}

          {tab === 'documents' && (
            <Section
              title="Documents de la visite"
              icon={<FileText className="w-4 h-4" />}
            >
              {!r.attachments.length ? (
                <p className="text-sm text-gray-600">
                  Aucun document joint à cette visite.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {r.attachments.map((file) => (
                    <FileChip
                      key={file.id}
                      file={file}
                      onPreview={() => setPreview(file)}
                    />
                  ))}
                </div>
              )}
            </Section>
          )}

          {tab === 'history' && (
            <Section
              title="Historique de la visite"
              icon={<History className="w-4 h-4" />}
            >
              <Timeline items={r.history} />
            </Section>
          )}
        </div>

        <aside className="space-y-4">
          <Section
            title="Client"
            icon={<User className="w-4 h-4" />}
            action={
              client && (
                <Link
                  to={`/admin/clients/${client.id}`}
                  className="text-xs font-semibold text-gold-700 hover:underline"
                >
                  Fiche client →
                </Link>
              )
            }
          >
            <dl className="space-y-3">
              <Info label="Nom" value={client?.fullName ?? fullName(r)} />
              <Info
                label="Téléphone"
                value={
                  <a
                    href={phoneHref(r.phone, r.dialCode)}
                    className="hover:text-gold-700"
                  >
                    {formatPhone(r.phone, r.dialCode)}
                  </a>
                }
              />
              {r.whatsapp && <Info label="WhatsApp" value={r.whatsapp} />}
              {r.email && (
                <Info
                  label="Email"
                  value={
                    <a
                      href={`mailto:${r.email}`}
                      className="hover:text-gold-700"
                    >
                      {r.email}
                    </a>
                  }
                />
              )}
              <Info
                label="Dernière modification"
                value={fmtDateTime(r.updatedAt)}
              />
            </dl>
          </Section>
        </aside>
      </div>

      <Preview file={preview} onClose={() => setPreview(null)} />
    </>
  );
}
