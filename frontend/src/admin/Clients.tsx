import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileSpreadsheet, Mail, Pencil, Phone, Plus, Search, ShoppingBag, Trash2, User, Receipt, Compass } from 'lucide-react';
import { getLands } from '../lib/store';
import { fullName as requestName, getBuyRequests } from './crm/model';
import { Client, ClientFields, createClient, deleteClient, emptyClientFields, getClient, getClients, getSearches, saveClient } from './crm/people';
import { Badge, Column, DataTable, Field, Info, Modal, Section, Stat, btnDanger, btnGold, btnIcon, btnOutline, btnPrimary, exportCsv, fmtAr, fmtDate, input } from './crm/kit';
import { phoneError } from '../lib/validate';

const BASE = '/admin/clients';

/** Formulaire client : mêmes champs que le formulaire de réservation du site. */
export function ClientForm({ initial, title, onClose, onSave }: {
  initial?: ClientFields; title: string; onClose: () => void; onSave: (f: ClientFields) => void;
}) {
  const [f, setF] = useState<ClientFields>(initial ?? emptyClientFields());
  const [tried, setTried] = useState(false);
  const set = (k: keyof ClientFields, v: string) => setF((x) => ({ ...x, [k]: v }));
  const missing = !f.fullName.trim() || !f.phone.trim();
  const badEmail = !!f.email && !/^\S+@\S+\.\S+$/.test(f.email);

  const submit = () => {
    setTried(true);
    if (missing || badEmail) return;
    onSave({ ...f, fullName: f.fullName.trim(), phone: f.phone.trim(), email: f.email.trim() });
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={<><button className={btnOutline} onClick={onClose}>Annuler</button><button className={btnPrimary} onClick={submit}>Enregistrer</button></>}
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Nom complet" required error={tried && !f.fullName.trim() ? 'Champ obligatoire' : undefined} span={2}>
          <input className={input} value={f.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="Rakoto Andrianina" />
        </Field>
        <Field label="Téléphone" required error={tried ? (phoneError(f.phone) ?? undefined) : undefined}>
          <input type="tel" className={input} value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="034 XX XXX XX" />
        </Field>
        <Field label="Email (facultatif)" error={tried && badEmail ? 'Adresse email invalide' : undefined}>
          <input type="email" className={input} value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="vous@exemple.com" />
        </Field>
        <Field label="Budget approximatif (Ar)"><input className={input} value={f.budget} onChange={(e) => set('budget', e.target.value)} placeholder="Ex : 50 000 000" /></Field>
        <Field label="Profession"><input className={input} value={f.profession} onChange={(e) => set('profession', e.target.value)} /></Field>
        <Field label="Âge"><input type="number" min={18} className={input} value={f.age} onChange={(e) => set('age', e.target.value)} /></Field>
        <Field label="Nationalité"><input className={input} value={f.nationality} onChange={(e) => set('nationality', e.target.value)} placeholder="Malgache" /></Field>
        <Field label="Compte bancaire (facultatif)" span={2}><input className={input} value={f.bankAccount} onChange={(e) => set('bankAccount', e.target.value)} placeholder="Banque" /></Field>
        <Field label="Message / notes" span={2}><textarea rows={3} className={input} value={f.message} onChange={(e) => set('message', e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

const columns: Column<Client>[] = [
  { key: 'ref', label: 'Référence', render: (c) => <span className="font-mono text-xs font-semibold">{c.ref}</span>, sort: (c) => c.ref, csv: (c) => c.ref },
  { key: 'name', label: 'Client', render: (c) => <span className="font-medium text-navy-900">{c.fullName}</span>, sort: (c) => c.fullName.toLowerCase(), csv: (c) => c.fullName },
  { key: 'phone', label: 'Téléphone', render: (c) => <span className="whitespace-nowrap">{c.phone}</span>, csv: (c) => c.phone },
  { key: 'email', label: 'Email', render: (c) => c.email || '—', csv: (c) => c.email },
  { key: 'budget', label: 'Budget', render: (c) => <span className="whitespace-nowrap">{c.budget ? (Number(c.budget) ? fmtAr(Number(c.budget)) : c.budget) : '—'}</span>, csv: (c) => c.budget },
  { key: 'profession', label: 'Profession', render: (c) => c.profession || '—', sort: (c) => c.profession, csv: (c) => c.profession },
  { key: 'nat', label: 'Nationalité', render: (c) => c.nationality || '—', sort: (c) => c.nationality, csv: (c) => c.nationality },
  { key: 'source', label: 'Source', render: (c) => <span className={`text-xs px-2 py-0.5 rounded-full ${c.source === 'Site web' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>{c.source}</span>, sort: (c) => c.source, csv: (c) => c.source },
  { key: 'date', label: 'Inscrit le', render: (c) => <span className="text-gray-500 whitespace-nowrap">{fmtDate(c.createdAt)}</span>, sort: (c) => c.createdAt, csv: (c) => fmtDate(c.createdAt) },
];

export function ClientList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState(getClients);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    return rows.filter((c) => !s || [c.ref, c.fullName, c.phone, c.email, c.profession, c.nationality].join(' ').toLowerCase().includes(s));
  }, [rows, q]);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Base clients</h1>
          <p className="text-sm text-gray-500 mt-1">Clients inscrits depuis le site ou créés dans le backoffice</p>
        </div>
        <button onClick={() => setCreating(true)} className={btnGold}><Plus className="w-4 h-4" /> Nouveau client</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <Stat label="Clients" value={rows.length} />
        <Stat label="Inscrits via le site" value={rows.filter((c) => c.source === 'Site web').length} tone="text-blue-700" />
        <Stat label="Créés au backoffice" value={rows.filter((c) => c.source === 'Backoffice').length} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher : nom, téléphone, email, profession…" className={`${input} pl-9`} />
        </div>
        <button className={btnOutline} onClick={() => exportCsv(selected.length ? filtered.filter((c) => selected.includes(c.id)) : filtered, columns, 'clients')}><FileSpreadsheet className="w-4 h-4" /> Excel</button>
      </div>

      <DataTable rows={filtered} columns={columns} selected={selected} onSelect={setSelected} onOpen={(c) => navigate(`${BASE}/${c.id}`)} />

      {creating && (
        <ClientForm
          title="Nouveau client"
          onClose={() => setCreating(false)}
          onSave={async (f) => { const c = await createClient(f, 'Backoffice'); setRows(getClients()); setCreating(false); navigate(`${BASE}/${c.id}`); }}
        />
      )}
    </>
  );
}

export function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [c, setC] = useState(() => (id ? getClient(id) : undefined));
  const [editing, setEditing] = useState(false);

  if (!c) return <p className="text-center py-20 text-gray-500">Client introuvable. <Link to={BASE} className="underline">Retour</Link></p>;

  const requests = getBuyRequests().filter((r) => r.clientId === c.id);
  const searches = getSearches().filter((s) => s.clientId === c.id);
  const lands = getLands();
  const purchases = lands.flatMap((l) => (l.sales ?? []).filter((s) => requests.some((r) => r.id === s.buyRequestId)).map((s) => ({ land: l, sale: s })));

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div className="flex items-start gap-3">
          <Link to={BASE} className={btnIcon} aria-label="Retour"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <p className="font-mono text-xs text-gray-500">{c.ref} · {c.source} · inscrit le {fmtDate(c.createdAt)}</p>
            <h1 className="text-2xl font-bold text-navy-900">{c.fullName}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
              <a href={`tel:${c.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1 hover:text-gold-600"><Phone className="w-3.5 h-3.5" /> {c.phone}</a>
              {c.email && <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 hover:text-gold-600"><Mail className="w-3.5 h-3.5" /> {c.email}</a>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={btnOutline} onClick={() => setEditing(true)}><Pencil className="w-4 h-4" /> Modifier</button>
          <Link to={`/admin/achats/nouveau?client=${c.id}`} className={btnGold}><ShoppingBag className="w-4 h-4" /> Nouvelle demande d’achat</Link>
          <button
            className={btnDanger}
            onClick={() => { if (confirm('Supprimer ce client de la base ? Ses dossiers d’achat sont conservés.')) { deleteClient(c.id); navigate(BASE); } }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Section title={`Demandes d’achat (${requests.length})`} icon={<ShoppingBag className="w-4 h-4" />}>
            {!requests.length && <p className="text-sm text-gray-400">Aucune demande d’achat.</p>}
            <ul className="divide-y divide-gray-100">
              {requests.map((r) => {
                const land = lands.find((l) => l.id === r.landId);
                const lot = land?.lots?.find((l) => l.id === r.lotId);
                return (
                  <li key={r.id}>
                    <Link to={`/admin/achats/${r.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 hover:text-gold-600">
                      <span>
                        <span className="font-mono text-xs text-gray-500">{r.ref}</span>{' '}
                        <span className="font-medium">{land ? `${land.title}${lot ? ` — ${lot.number}` : ''}` : requestName(r)}</span>
                      </span>
                      <Badge value={r.status} dot />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Section>
          <Section title={`Achats réalisés (${purchases.length})`} icon={<Receipt className="w-4 h-4" />}>
            {!purchases.length && <p className="text-sm text-gray-400">Aucun achat finalisé.</p>}
            <ul className="divide-y divide-gray-100 text-sm">
              {purchases.map(({ land, sale }) => (
                <li key={sale.id} className="py-3 flex flex-wrap justify-between gap-2">
                  <span className="font-medium">{land.title}{sale.lotId ? ` — ${land.lots?.find((l) => l.id === sale.lotId)?.number ?? ''}` : ''}</span>
                  <span className="text-gray-500">{fmtDate(sale.date)} · <strong className="text-navy-900">{fmtAr(sale.price)}</strong></span>
                </li>
              ))}
            </ul>
          </Section>
          <Section title={`Recherches de terrain spécifique (${searches.length})`} icon={<Compass className="w-4 h-4" />}>
            {!searches.length && <p className="text-sm text-gray-400">Aucune recherche spécifique.</p>}
            <ul className="divide-y divide-gray-100">
              {searches.map((s) => (
                <li key={s.id}>
                  <Link to={`/admin/recherches/${s.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 hover:text-gold-600">
                    <span><span className="font-mono text-xs text-gray-500">{s.ref}</span> <span className="font-medium">{s.mainZone}</span></span>
                    <Badge value={s.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        <Section title="Informations" icon={<User className="w-4 h-4" />}>
          <dl className="space-y-3">
            <Info label="Budget approximatif" value={c.budget ? (Number(c.budget) ? fmtAr(Number(c.budget)) : c.budget) : ''} />
            <Info label="Profession" value={c.profession} />
            <Info label="Âge" value={c.age} />
            <Info label="Nationalité" value={c.nationality} />
            <Info label="Compte bancaire" value={c.bankAccount} />
            <Info label="Message" value={c.message && <span className="whitespace-pre-line font-normal">{c.message}</span>} />
          </dl>
        </Section>
      </div>

      {editing && (
        <ClientForm
          title="Modifier le client"
          initial={c}
          onClose={() => setEditing(false)}
          onSave={async (f) => { setC(await saveClient({ ...c, ...f })); setEditing(false); }}
        />
      )}
    </>
  );
}
