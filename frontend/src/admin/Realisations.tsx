import { useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Globe, Pencil, Plus, Star, Trash2, X, ExternalLink } from 'lucide-react';
import {
  REALISATION_CATEGORIES, Realisation, deleteRealisation, getRealisations, newRealisation, saveRealisation,
} from './crm/people';
import { removeFile } from './crm/files';
import { Field, FileDrop, NumberInput, Select, Stat, Thumb, btnGold, btnIcon, btnOutline, btnPrimary, fmtM2, input } from './crm/kit';

const monthLabel = (ym: string) => (ym ? new Date(`${ym}-01`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '');

export default function Realisations() {
  const [rows, setRows] = useState(getRealisations);
  const [editing, setEditing] = useState<Realisation | null>(null);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  const refresh = () => setRows(getRealisations());

  const toggle = (r: Realisation, patch: Partial<Realisation>) => { saveRealisation({ ...r, ...patch }); refresh(); };
  const shown = rows.filter((r) => filter === 'all' || (filter === 'published' ? r.published : !r.published));

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Réalisations</h1>
          <p className="text-sm text-gray-500 mt-1">Projets réalisés publiés sur la page « Réalisations » du site</p>
        </div>
        <div className="flex gap-2">
          <a href="/realisations" target="_blank" rel="noopener noreferrer" className={btnOutline}><ExternalLink className="w-4 h-4" /> Voir sur le site</a>
          <button className={btnGold} onClick={() => setEditing(newRealisation())}><Plus className="w-4 h-4" /> Nouvelle réalisation</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {([['all', 'Toutes', rows.length], ['published', 'Publiées', rows.filter((r) => r.published).length], ['draft', 'Brouillons', rows.filter((r) => !r.published).length]] as const).map(([k, label, n]) => (
          <button key={k} onClick={() => setFilter(k)} className={`text-left rounded-xl ${filter === k ? 'ring-2 ring-gold-500' : ''}`}>
            <Stat label={label} value={n} />
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {shown.map((r) => (
          <article key={r.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="relative">
              {r.photos[0] ? <Thumb file={r.photos[0]} className="w-full aspect-[16/10]" /> : <div className="w-full aspect-[16/10] bg-gray-100" />}
              <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold ${r.published ? 'bg-blue-600 text-white' : 'bg-white/90 text-gray-700'}`}>
                {r.published ? 'Publiée' : 'Brouillon'}
              </span>
              {r.featured && <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-gold-500 text-navy-950">★ À la une</span>}
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <p className="text-xs uppercase tracking-wide text-gold-600">{r.category}</p>
              <h3 className="font-semibold text-navy-900 mt-1">{r.title || 'Sans titre'}</h3>
              <p className="text-sm text-gray-500">{[r.location, monthLabel(r.completedAt)].filter(Boolean).join(' · ')}</p>
              <p className="text-sm text-gray-600 mt-2 line-clamp-3 flex-1">{r.description}</p>
              <div className="flex items-center justify-between mt-4 pt-3 border-t">
                <button className={r.published ? btnOutline : btnPrimary} onClick={() => toggle(r, { published: !r.published })}>
                  {r.published ? <><EyeOff className="w-4 h-4" /> Dépublier</> : <><Globe className="w-4 h-4" /> Publier</>}
                </button>
                <div className="flex">
                  <button className={`${btnIcon} ${r.featured ? 'text-gold-600' : ''}`} onClick={() => toggle(r, { featured: !r.featured })} title="Mettre à la une"><Star className="w-4 h-4" /></button>
                  <button className={btnIcon} onClick={() => setEditing({ ...r })} aria-label="Modifier"><Pencil className="w-4 h-4" /></button>
                  <button className={`${btnIcon} hover:text-red-600`} onClick={() => { if (confirm(`Supprimer « ${r.title} » ?`)) { r.photos.forEach(removeFile); deleteRealisation(r.id); refresh(); } }} aria-label="Supprimer"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          </article>
        ))}
        {!shown.length && <p className="text-gray-400 col-span-full text-center py-10">Aucune réalisation.</p>}
      </div>

      {editing && <RealisationForm initial={editing} onClose={() => setEditing(null)} onSave={(r) => { saveRealisation(r); refresh(); setEditing(null); }} />}
    </>
  );
}

function RealisationForm({ initial, onClose, onSave }: { initial: Realisation; onClose: () => void; onSave: (r: Realisation) => void }) {
  const [r, setR] = useState(initial);
  const [tried, setTried] = useState(false);
  const set = <K extends keyof Realisation>(k: K, v: Realisation[K]) => setR((x) => ({ ...x, [k]: v }));
  const move = (i: number, d: -1 | 1) => { const p = [...r.photos]; [p[i], p[i + d]] = [p[i + d], p[i]]; set('photos', p); };
  const invalid = !r.title.trim() || !r.description.trim() || !r.photos.length;

  const submit = (publish: boolean) => {
    setTried(true);
    if (invalid) return;
    onSave({ ...r, published: publish });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-3xl my-8 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-bold text-navy-900">{initial.title ? 'Modifier la réalisation' : 'Nouvelle réalisation'}</h2>
          <button className={btnIcon} onClick={onClose} aria-label="Fermer"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Titre" required error={tried && !r.title.trim() ? 'Champ obligatoire' : undefined} span={2}>
              <input className={input} value={r.title} onChange={(e) => set('title', e.target.value)} placeholder="Ex : Villa R+1 à Ivato" />
            </Field>
            <Field label="Catégorie"><Select value={r.category} onChange={(v) => set('category', v)} options={REALISATION_CATEGORIES} /></Field>
            <Field label="Lieu"><input className={input} value={r.location} onChange={(e) => set('location', e.target.value)} placeholder="Ex : Ivato, Antananarivo" /></Field>
            <Field label="Date de fin des travaux"><input type="month" className={input} value={r.completedAt} onChange={(e) => set('completedAt', e.target.value)} /></Field>
            <Field label="Durée du chantier"><input className={input} value={r.duration} onChange={(e) => set('duration', e.target.value)} placeholder="Ex : 8 mois" /></Field>
            <Field label="Surface" hint={r.area ? fmtM2(r.area) : undefined}><NumberInput value={r.area} onChange={(v) => set('area', v)} suffix="m²" /></Field>
            <Field label="Client (affiché si renseigné)"><input className={input} value={r.client} onChange={(e) => set('client', e.target.value)} placeholder="Ex : Famille R." /></Field>
            <Field label="Description" required error={tried && !r.description.trim() ? 'Champ obligatoire' : undefined} span={2}>
              <textarea rows={5} className={input} value={r.description} onChange={(e) => set('description', e.target.value)} placeholder="Le projet, les travaux réalisés, le résultat…" />
            </Field>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-600 mb-1.5">Photos <span className="text-red-500">*</span> <span className="text-gray-400">(la première sert de couverture)</span></p>
            <FileDrop accept="image/jpeg,image/png,image/webp" maxMb={15} multiple label="Ajouter des photos" hint="JPG, PNG, WEBP · 15 Mo max" onFiles={(files) => set('photos', [...r.photos, ...files])} />
            {tried && !r.photos.length && <p className="text-xs text-red-600 mt-1">Ajoutez au moins une photo.</p>}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
              {r.photos.map((p, i) => (
                <div key={p.id} className={`relative rounded-lg overflow-hidden border-2 ${i === 0 ? 'border-gold-500' : 'border-transparent'}`}>
                  <Thumb file={p} className="w-full aspect-[4/3]" />
                  <div className="absolute bottom-0 inset-x-0 flex justify-between bg-gradient-to-t from-black/70 to-transparent p-1">
                    <div className="flex">
                      <button disabled={i === 0} onClick={() => move(i, -1)} className="p-1 text-white disabled:opacity-30" aria-label="Gauche"><ChevronLeft className="w-4 h-4" /></button>
                      <button disabled={i === r.photos.length - 1} onClick={() => move(i, 1)} className="p-1 text-white disabled:opacity-30" aria-label="Droite"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                    <button onClick={() => { removeFile(p); set('photos', r.photos.filter((x) => x.id !== p.id)); }} className="p-1 text-white hover:text-red-300" aria-label="Supprimer"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={r.featured} onChange={(e) => set('featured', e.target.checked)} /> Mettre à la une (affichée en premier)</label>
        </div>
        <div className="flex flex-wrap justify-end gap-2 px-5 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button className={btnOutline} onClick={onClose}>Annuler</button>
          <button className={btnOutline} onClick={() => submit(false)}><Eye className="w-4 h-4" /> Enregistrer en brouillon</button>
          <button className={btnPrimary} onClick={() => submit(true)}><Globe className="w-4 h-4" /> Publier</button>
        </div>
      </div>
    </div>
  );
}

