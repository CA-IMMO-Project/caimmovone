// Composants liés au suivi client : fiche complète du terrain choisi et planification d'actions.
import { ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarClock, Check, CheckCircle2, Clock, FileCheck, MapPin, Phone, Plus, Square, Trash2, Users, CalendarDays,
  Mail, MessageCircle, Repeat, PenLine, Eye, MoreHorizontal,
} from 'lucide-react';
import { Land } from '../../types';
import { getLands } from '../../lib/store';
import { newId } from '../../lib/store';
import { ACTION_TYPES, ActionType, PlannedAction, getBuyRequests, fullName } from './model';
import { Badge, Choice, Field, Info, MapPicker, Modal, Section, btnGold, btnIcon, btnOutline, btnPrimary, fmtAr, fmtDate, fmtDateTime, fmtM2, fmtNum, input } from './kit';

// ---------- Choix du terrain (et de la parcelle) ----------
export function LandPicker({ landId, lotId, onChange, error }: {
  landId: string; lotId?: string; onChange: (landId: string, lotId?: string) => void; error?: string;
}) {
  const lands = getLands();
  const land = lands.find((l) => l.id === landId);
  const lots = land?.lots ?? [];
  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Terrain du catalogue" required error={error}>
          <select value={landId} onChange={(e) => onChange(e.target.value, undefined)} className={input}>
            <option value="">— Choisir le terrain —</option>
            {lands.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title} · {l.location} · {fmtAr(l.price)}{l.status !== 'disponible' ? ` (${l.status})` : ''}
              </option>
            ))}
          </select>
        </Field>
        {lots.length > 0 && (
          <Field label="Parcelle" hint="Laisser vide si le client veut le terrain entier">
            <select value={lotId ?? ''} onChange={(e) => onChange(landId, e.target.value || undefined)} className={input}>
              <option value="">Terrain entier / parcelle à définir</option>
              {lots.map((lot) => (
                <option key={lot.id} value={lot.id} disabled={lot.status === 'vendu' && lot.id !== lotId}>
                  {lot.number} · {fmtM2(lot.area)} · {fmtAr(lot.price)} ({lot.status})
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>
      {land && <LandMini land={land} lotId={lotId} />}
    </div>
  );
}

function LandMini({ land, lotId }: { land: Land; lotId?: string }) {
  const lot = land.lots?.find((l) => l.id === lotId);
  return (
    <div className="flex gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
      <img src={lot?.imageUrl || land.imageUrl} alt="" className="w-24 h-20 rounded-lg object-cover shrink-0" referrerPolicy="no-referrer" />
      <div className="min-w-0 text-sm">
        <p className="font-semibold text-navy-900 truncate">{land.title}{lot && ` — ${lot.number}`}</p>
        <p className="text-gray-500 truncate">{land.location}</p>
        <p className="mt-1">{fmtM2(lot?.area ?? land.area)} · <strong>{fmtAr(lot?.price ?? land.price)}</strong> · <Badge value={lot?.status ?? land.status} /></p>
      </div>
    </div>
  );
}

// ---------- Fiche complète du terrain ----------
export function LandDetails({ landId, lotId }: { landId: string; lotId?: string }) {
  const land = getLands().find((l) => l.id === landId);
  if (!land) {
    return (
      <Section title="Terrain souhaité" icon={<MapPin className="w-4 h-4" />}>
        <p className="text-sm text-red-600">Aucun terrain rattaché (ou terrain supprimé du catalogue). Modifiez le dossier pour choisir le terrain.</p>
      </Section>
    );
  }
  const lot = land.lots?.find((l) => l.id === lotId);
  const lots = land.lots ?? [];
  const sold = lots.filter((l) => l.status === 'vendu').length;
  const interested = getBuyRequests().filter((r) => r.landId === land.id);

  return (
    <div className="space-y-5">
      <Section
        title="Terrain souhaité"
        icon={<MapPin className="w-4 h-4" />}
        action={<Link to="/admin/terrains" className="text-xs text-gold-600 hover:underline">Voir dans le catalogue</Link>}
      >
        <div className="grid md:grid-cols-5 gap-5">
          <img src={land.imageUrl} alt={land.title} className="md:col-span-2 w-full aspect-[4/3] rounded-xl object-cover" referrerPolicy="no-referrer" />
          <div className="md:col-span-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-lg font-bold text-navy-900">{land.title}</h3>
              <Badge value={land.status} dot />
            </div>
            <p className="flex items-center gap-1 text-sm text-gray-500 mt-1"><MapPin className="w-3.5 h-3.5" /> {land.location} · {land.region}</p>
            <p className="text-sm mt-3 leading-relaxed whitespace-pre-line">{land.description}</p>
            <dl className="grid grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
              <Info label="Prix total" value={fmtAr(land.price)} />
              <Info label="Surface totale" value={fmtM2(land.area)} />
              <Info label="Prix au m²" value={land.area ? `${fmtNum(Math.round(land.price / land.area))} Ar` : '—'} />
              <Info label="Statut juridique" value={<span className="inline-flex items-center gap-1"><FileCheck className="w-3.5 h-3.5 text-gold-600" /> {land.titleStatus}</span>} />
              <Info label="Référence catalogue" value={`#${land.id}`} />
              <Info label="Parcelles" value={lots.length ? `${lots.length} lots · ${sold} vendu(s)` : 'Terrain non loti'} />
            </dl>
            {land.features.length > 0 && (
              <ul className="flex flex-wrap gap-1.5 mt-4">
                {land.features.map((f) => <li key={f} className="px-2.5 py-1 rounded-full bg-gold-400/15 text-navy-900 text-xs">{f}</li>)}
              </ul>
            )}
          </div>
        </div>
      </Section>

      {lot && (
        <Section title={`Parcelle choisie : ${lot.number}`} icon={<Square className="w-4 h-4" />}>
          <div className="flex flex-col sm:flex-row gap-4">
            {lot.imageUrl && <img src={lot.imageUrl} alt={lot.number} className="sm:w-48 aspect-[4/3] rounded-xl object-cover" referrerPolicy="no-referrer" />}
            <div className="flex-1">
              <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Info label="Surface" value={fmtM2(lot.area)} />
                <Info label="Prix" value={fmtAr(lot.price)} />
                <Info label="Prix au m²" value={lot.area ? `${fmtNum(Math.round(lot.price / lot.area))} Ar` : '—'} />
                <Info label="Statut" value={<Badge value={lot.status} />} />
              </dl>
              {lot.details && <p className="text-sm mt-3 bg-gray-50 rounded-lg p-3">{lot.details}</p>}
            </div>
          </div>
        </Section>
      )}

      {lots.length > 0 && (
        <Section title="Toutes les parcelles du terrain" icon={<Square className="w-4 h-4" />}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {lots.map((l) => (
              <div key={l.id} className={`flex gap-2 p-2 rounded-lg border ${l.id === lotId ? 'border-gold-500 bg-gold-400/10' : 'border-gray-200'}`}>
                {l.imageUrl && <img src={l.imageUrl} alt="" className="w-14 h-12 rounded object-cover shrink-0" referrerPolicy="no-referrer" />}
                <div className="min-w-0 text-sm">
                  <p className="font-medium">{l.number} · {fmtM2(l.area)}</p>
                  <p className="text-xs text-gray-500">{fmtAr(l.price)}</p>
                  <Badge value={l.status} />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {land.coordinates && (
        <Section title="Localisation" icon={<MapPin className="w-4 h-4" />}>
          <p className="text-sm text-gray-500 mb-3">GPS : {land.coordinates[0]}, {land.coordinates[1]}</p>
          <MapPicker lat={land.coordinates[0]} lng={land.coordinates[1]} readOnly height="h-72" />
        </Section>
      )}

      {(land.sales?.length ?? 0) > 0 && (
        <Section title="Ventes déjà réalisées sur ce terrain" icon={<CheckCircle2 className="w-4 h-4" />}>
          <ul className="divide-y divide-gray-100 text-sm">
            {land.sales!.map((s) => (
              <li key={s.id} className="py-2 flex flex-wrap justify-between gap-2">
                <span>{s.lotId ? land.lots?.find((l) => l.id === s.lotId)?.number ?? 'Parcelle' : 'Terrain entier'} · {s.buyer.firstName} {s.buyer.lastName}</span>
                <span className="text-gray-500">{fmtDate(s.date)} · {fmtAr(s.price)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {interested.length > 1 && (
        <Section title="Autres clients intéressés par ce terrain" icon={<Users className="w-4 h-4" />}>
          <ul className="divide-y divide-gray-100 text-sm">
            {interested.map((r) => (
              <li key={r.id} className="py-2 flex justify-between gap-2">
                <Link to={`/admin/achats/${r.id}`} className="hover:text-gold-600">{fullName(r)} <span className="text-gray-400 font-mono text-xs">{r.ref}</span></Link>
                <Badge value={r.status} />
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

// ---------- Actions planifiées ----------
const ACTION_ICONS: Record<ActionType, typeof Phone> = {
  Appel: Phone, 'Rendez-vous': CalendarDays, 'Visite du terrain': Eye, Email: Mail, 'WhatsApp / SMS': MessageCircle,
  Relance: Repeat, Signature: PenLine, Autre: MoreHorizontal,
};

const isLate = (a: PlannedAction) => !a.done && new Date(a.at).getTime() < Date.now();
const isToday = (a: PlannedAction) => !a.done && new Date(a.at).toDateString() === new Date().toDateString();

export function nextAction(actions: PlannedAction[]) {
  return [...actions].filter((a) => !a.done).sort((a, b) => a.at.localeCompare(b.at))[0];
}
export function lateCount(actions: PlannedAction[]) {
  return actions.filter(isLate).length;
}

export function ActionLabel({ a }: { a?: PlannedAction }) {
  if (!a) return <span className="text-gray-400">—</span>;
  const Icon = ACTION_ICONS[a.type];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap ${isLate(a) ? 'text-red-600 font-semibold' : isToday(a) ? 'text-amber-600 font-semibold' : ''}`}>
      <Icon className="w-3.5 h-3.5" /> {a.type} · {fmtDateTime(a.at)}
    </span>
  );
}

export function ActionPlanner({ actions, onPlan, onComplete, onDelete }: {
  actions: PlannedAction[];
  onPlan: () => void;
  onComplete: (a: PlannedAction) => void;
  onDelete: (a: PlannedAction) => void;
}) {
  const todo = actions.filter((a) => !a.done).sort((a, b) => a.at.localeCompare(b.at));
  return (
    <Section
      title="Actions planifiées"
      icon={<CalendarClock className="w-4 h-4" />}
      action={<button className={btnGold} onClick={onPlan}><Plus className="w-4 h-4" /> Planifier</button>}
    >
      {!todo.length && <p className="text-sm text-gray-400">Aucune action à venir. Planifiez un appel, un rendez-vous ou une visite.</p>}
      <ul className="space-y-2">
        {todo.map((a) => {
          const Icon = ACTION_ICONS[a.type];
          const late = isLate(a);
          return (
            <li key={a.id} className={`p-3 rounded-xl border ${late ? 'border-red-200 bg-red-50' : isToday(a) ? 'border-amber-200 bg-amber-50' : 'border-gray-200'}`}>
              <div className="flex items-start gap-3">
                <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${late ? 'bg-red-600 text-white' : 'bg-navy-900 text-white'}`}><Icon className="w-4 h-4" /></span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy-900">{a.type}</p>
                  <p className={`text-xs flex items-center gap-1 ${late ? 'text-red-700 font-semibold' : 'text-gray-500'}`}>
                    <Clock className="w-3 h-3" /> {fmtDateTime(a.at)}{late && ' · en retard'}{isToday(a) && !late && ' · aujourd’hui'}
                  </p>
                  {a.note && <p className="text-sm mt-1">{a.note}</p>}
                </div>
              </div>
              <div className="flex justify-end gap-1 mt-2">
                <button className={`${btnIcon} hover:text-red-600`} onClick={() => onDelete(a)} title="Annuler l’action" aria-label="Annuler"><Trash2 className="w-4 h-4" /></button>
                <button className={`${btnPrimary} py-1.5`} onClick={() => onComplete(a)}><Check className="w-4 h-4" /> Fait</button>
              </div>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

/** Planifier une action — ou enregistrer une action déjà faite (appel passé, rendez-vous tenu…). */
export function PlanDialog({ onClose, onSave, defaultDate, defaultTime = '09:00', header, canSave = true }: {
  onClose: () => void; onSave: (a: PlannedAction) => void;
  defaultDate?: string; defaultTime?: string; header?: ReactNode; canSave?: boolean;
}) {
  const tomorrow = new Date(Date.now() + 86400000);
  const [type, setType] = useState<ActionType>('Appel');
  const [date, setDate] = useState(defaultDate ?? tomorrow.toISOString().slice(0, 10));
  const [time, setTime] = useState(defaultTime);
  const [note, setNote] = useState('');
  const [already, setAlready] = useState(false);
  const [result, setResult] = useState('');
  const valid = canSave && date && time && (!already || result.trim());

  const save = () => {
    const at = new Date(`${date}T${time}`).toISOString();
    onSave({ id: newId(), type, at, note: note.trim(), done: already, doneAt: already ? at : undefined, result: already ? result.trim() : undefined });
  };

  return (
    <Modal
      title={already ? 'Enregistrer une action effectuée' : 'Planifier une action'}
      onClose={onClose}
      footer={<><button className={btnOutline} onClick={onClose}>Annuler</button><button className={btnPrimary} disabled={!valid} onClick={save}>{already ? 'Enregistrer' : 'Planifier'}</button></>}
    >
      {header}
      <Field label="Type d’action"><Choice value={type} onChange={(v) => setType(v as ActionType)} options={ACTION_TYPES} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date" required><input type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Heure" required><input type="time" className={input} value={time} onChange={(e) => setTime(e.target.value)} /></Field>
      </div>
      <Field label="Objet / détails"><textarea rows={2} className={input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex : présenter la parcelle Lot 3, apporter le plan" /></Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={already} onChange={(e) => setAlready(e.target.checked)} /> Action déjà effectuée (à inscrire dans l’historique)
      </label>
      {already && <Field label="Résultat / compte rendu" required><textarea rows={3} className={input} value={result} onChange={(e) => setResult(e.target.value)} /></Field>}
    </Modal>
  );
}

export function CompleteDialog({ action, onClose, onSave }: { action: PlannedAction; onClose: () => void; onSave: (result: string, followUp: boolean) => void }) {
  const [result, setResult] = useState('');
  const [followUp, setFollowUp] = useState(false);
  return (
    <Modal
      title={`${action.type} du ${fmtDateTime(action.at)} — compte rendu`}
      onClose={onClose}
      footer={<><button className={btnOutline} onClick={onClose}>Annuler</button><button className={btnPrimary} disabled={!result.trim()} onClick={() => onSave(result.trim(), followUp)}>Valider</button></>}
    >
      {action.note && <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{action.note}</p>}
      <Field label="Résultat / compte rendu" required><textarea rows={4} autoFocus className={input} value={result} onChange={(e) => setResult(e.target.value)} placeholder="Ex : client intéressé, souhaite visiter samedi" /></Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={followUp} onChange={(e) => setFollowUp(e.target.checked)} /> Planifier une action de suivi ensuite
      </label>
    </Modal>
  );
}

/** Journal des actions effectuées (appels, rendez-vous… avec leur compte rendu). */
export function DoneActions({ actions }: { actions: PlannedAction[] }) {
  const done = actions.filter((a) => a.done).sort((a, b) => (b.doneAt ?? b.at).localeCompare(a.doneAt ?? a.at));
  if (!done.length) return <p className="text-sm text-gray-400">Aucune action effectuée pour l’instant.</p>;
  return (
    <ul className="space-y-2">
      {done.map((a) => {
        const Icon = ACTION_ICONS[a.type];
        return (
          <li key={a.id} className="flex gap-3 p-3 rounded-xl border border-gray-100">
            <span className="shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center"><Icon className="w-4 h-4" /></span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{a.type} <span className="font-normal text-gray-400">· {fmtDateTime(a.doneAt ?? a.at)}</span></p>
              {a.note && <p className="text-xs text-gray-500">{a.note}</p>}
              {a.result && <p className="text-sm mt-1">{a.result}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
