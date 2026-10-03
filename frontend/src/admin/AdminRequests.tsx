import { useEffect, useState } from 'react';
import { Trash2, Phone, Mail as MailIcon } from 'lucide-react';
import {
  ContactMessage, RequestStatus,
  deleteMessage, getMessages, updateMessage,
} from '../lib/store';
import { Card, PageHeader, REQUEST_STATUSES, btnGhost, formatDate, inputClass } from './ui';
import { ListToolbar, Select } from './crm/kit';
import { refreshCache, subscribeCache } from './crm/sync';
import { askConfirm } from './crm/dialog';

function StatusSelect({ value, onChange }: { value: RequestStatus; onChange: (v: RequestStatus) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as RequestStatus)} className={`${inputClass} w-auto py-1`}>
      {REQUEST_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}

function Contact({ phone, email }: { phone: string; email?: string }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
      <a href={`tel:${phone.replace(/\s/g, '')}`} className="flex items-center gap-1 hover:text-navy-900"><Phone className="w-3.5 h-3.5" /> {phone}</a>
      {email && <a href={`mailto:${email}`} className="flex items-center gap-1 hover:text-navy-900"><MailIcon className="w-3.5 h-3.5" /> {email}</a>}
    </div>
  );
}

export function AdminMessages() {
  const [items, setItems] = useState(getMessages);
  useEffect(() => { refreshCache().then(() => setItems(getMessages())); return subscribeCache(() => setItems(getMessages())); }, []); // resync à l'ouverture + mise à jour auto sans F5
  const [filter, setFilter] = useState('');
  const [q, setQ] = useState('');

  const update = (id: string, patch: Partial<ContactMessage>) => { updateMessage(id, patch); setItems(getMessages()); };
  const remove = async (id: string) => { if (await askConfirm('Supprimer ce message ?')) { deleteMessage(id); setItems(getMessages()); } };

  const s = q.toLowerCase().trim();
  const shown = items.filter((m) =>
    (!filter || m.status === filter) &&
    (!s || [m.firstName, m.lastName, m.phone, m.email ?? '', m.subject ?? '', m.message].join(' ').toLowerCase().includes(s)))
    .sort((a, b) => {
      const fresh = (m: ContactMessage) => (m.status === 'nouveau' ? 0 : 1);
      return fresh(a) - fresh(b) || b.createdAt.localeCompare(a.createdAt); // non lus d'abord, puis plus récents
    });
  const unread = items.filter((m) => m.status === 'nouveau').length;

  return (
    <>
      <PageHeader title="Messages" subtitle={`Messages envoyés depuis la page Contact${unread ? ` — ${unread} non lu(s)` : ''}`} />
      <ListToolbar
        q={q}
        onQ={setQ}
        placeholder="Rechercher : nom, téléphone, email, sujet…"
        filters={<Select value={filter} onChange={setFilter} options={REQUEST_STATUSES} placeholder="Tous statuts" />}
        activeFilters={filter ? 1 : 0}
      />
      {shown.length === 0 && <Card className="p-8 text-center text-gray-500">Aucun message.</Card>}
      <div className="space-y-3">
        {shown.map((m) => (
          <Card key={m.id} className={`p-5 ${m.status === 'nouveau' ? 'border-l-4 border-l-gold-500 bg-gold-400/5' : ''}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-navy-900 flex items-center gap-2">
                  {m.status === 'nouveau' && <span className="h-2 w-2 rounded-full bg-gold-500" aria-hidden />}
                  {m.firstName} {m.lastName}
                  {m.status === 'nouveau' && <span className="text-[10px] font-bold uppercase tracking-wide text-gold-700">Non lu</span>}
                </p>
                <Contact phone={m.phone} email={m.email} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{formatDate(m.createdAt)}</span>
                <StatusSelect value={m.status} onChange={(status) => update(m.id, { status })} />
                <button onClick={() => remove(m.id)} className={`${btnGhost} hover:text-red-600`} aria-label="Supprimer"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            {m.subject && <p className="mt-3 text-sm font-medium">{m.subject}</p>}
            <p className="mt-2 text-sm bg-gray-50 rounded-lg p-3 whitespace-pre-line">{m.message}</p>
          </Card>
        ))}
      </div>
    </>
  );
}
