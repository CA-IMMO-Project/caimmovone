import { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Search, RotateCcw, X, ChevronRight, HandCoins, Users, Receipt, History, UserPlus } from 'lucide-react';
import { Land, Lot, TitleStatus } from '../types';
import { deleteLand, getLands, newId, resetLands, saveLand } from '../lib/store';
import { formatAriary, formatArea } from '../lib/format';
import { Badge, Card, PageHeader, btnGhost, btnPrimary, inputClass } from './ui';
import SaleDialog from './SaleDialog';
import { ClientRows, InterestDialog, LotDialog } from './LotDialog';
import { getBuyRequests } from './crm/model';

const TITLE_STATUSES: TitleStatus[] = ['Titre Foncier', 'Titre en cours', 'Cadastré'];
const LAND_STATUSES: Land['status'][] = ['disponible', 'réservé', 'vendu'];

const emptyLand = (): Land => ({
  id: newId(),
  title: '',
  description: '',
  price: 0,
  region: '',
  location: '',
  imageUrl: '',
  features: [],
  area: 0,
  titleStatus: 'Titre Foncier',
  status: 'disponible',
});

export default function AdminLands() {
  const [lands, setLands] = useState(getLands);
  const [editing, setEditing] = useState<Land | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selling, setSelling] = useState<{ land: Land; lotId?: string } | null>(null);
  const [lotView, setLotView] = useState<{ land: Land; lotId: string } | null>(null);
  const [interest, setInterest] = useState<Land | null>(null);
  const requests = useMemo(() => getBuyRequests(), [lands]);

  const refresh = () => setLands(getLands());

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return lands.filter(
      (l) =>
        (!s || l.title.toLowerCase().includes(s) || l.location.toLowerCase().includes(s)) &&
        (!status || l.status === status),
    );
  }, [lands, q, status]);

  const remove = (land: Land) => {
    if (!confirm(`Supprimer « ${land.title} » ?`)) return;
    deleteLand(land.id);
    refresh();
  };

  const reset = async () => {
    if (!confirm('Réinitialiser la liste des terrains avec les données d\'origine ? Vos modifications seront perdues.')) return;
    await resetLands(); // le serveur re-seed puis renvoie le catalogue : le cache est à jour
    refresh();
  };

  return (
    <>
      <PageHeader
        title="Terrains"
        subtitle={`${lands.length} terrain(s) au catalogue`}
        action={
          <div className="flex gap-2">
            <button onClick={reset} className={btnGhost}><RotateCcw className="w-4 h-4" /> Réinitialiser</button>
            <button onClick={() => setEditing(emptyLand())} className={btnPrimary}><Plus className="w-4 h-4" /> Ajouter un terrain</button>
          </div>
        }
      />

      <Card className="p-4 mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher par titre ou localisation…" className={`${inputClass} pl-9`} />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputClass} w-auto`}>
          <option value="">Tous les statuts</option>
          {LAND_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="p-3 font-medium">Terrain</th>
              <th className="p-3 font-medium">Région</th>
              <th className="p-3 font-medium">Surface</th>
              <th className="p-3 font-medium">Prix</th>
              <th className="p-3 font-medium">Lots</th>
              <th className="p-3 font-medium">Statut</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((land) => (
              <Fragment key={land.id}>
              <tr
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => setExpanded(expanded === land.id ? null : land.id)}
              >
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <ChevronRight className={`w-4 h-4 shrink-0 transition-transform text-gray-400 ${expanded === land.id ? 'rotate-90' : ''}`} />
                    {land.imageUrl && <img src={land.imageUrl} alt="" className="w-14 h-10 rounded object-cover" referrerPolicy="no-referrer" />}
                    <div>
                      <p className="font-medium text-navy-900">{land.title}</p>
                      <p className="text-xs text-gray-500">{land.titleStatus}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3">{land.region}</td>
                <td className="p-3 whitespace-nowrap">{formatArea(land.area)}</td>
                <td className="p-3 whitespace-nowrap">{formatAriary(land.price)}</td>
                <td className="p-3 whitespace-nowrap">
                  {land.lots?.length
                    ? `${land.lots.filter((l) => l.status === 'disponible').length} / ${land.lots.length} dispo.`
                    : '—'}
                </td>
                <td className="p-3"><Badge value={land.status} /></td>
                <td className="p-3 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                  {land.status !== 'vendu' && (
                    <button onClick={() => setSelling({ land })} className={`${btnGhost} text-blue-700`} title="Enregistrer une vente"><HandCoins className="w-4 h-4" /> Vendre</button>
                  )}
                  <button onClick={() => setEditing({ ...land })} className={btnGhost} aria-label="Modifier"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => remove(land)} className={`${btnGhost} hover:text-red-600`} aria-label="Supprimer"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
              {expanded === land.id && (
                <tr className="bg-gray-50">
                  <td colSpan={7} className="px-3 pb-4 pt-1">
                    <div className="pl-7 space-y-4">
                      {land.lots && land.lots.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 mb-2">
                            Parcelles : {formatArea(land.lots.reduce((t, l) => t + l.area, 0))} sur {formatArea(land.area)}
                          </p>
                          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                            {land.lots.map((lot) => (
                              <div key={lot.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col">
                                {lot.imageUrl && <img src={lot.imageUrl} alt="" className="w-full h-24 object-cover" referrerPolicy="no-referrer" />}
                                <div className="p-3 flex-1 flex flex-col">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium text-navy-900">{lot.number}</span>
                                    <Badge value={lot.status} />
                                  </div>
                                  <p className="text-gray-600 mt-1">{formatArea(lot.area)} · {formatAriary(lot.price)}</p>
                                  {lot.details && <p className="text-xs text-gray-500 mt-1 line-clamp-3">{lot.details}</p>}
                                  {(() => {
                                    const n = requests.filter((r) => r.landId === land.id && r.lotId === lot.id && r.status !== 'Achat finalisé').length;
                                    const buyer = land.sales?.find((s) => s.lotId === lot.id)?.buyer;
                                    return (
                                      <p className="text-xs mt-2 flex items-center gap-1 text-gray-600">
                                        <Users className="w-3.5 h-3.5 text-gold-600" />
                                        {buyer ? `Acheteur : ${buyer.firstName} ${buyer.lastName}` : `${n} client(s) intéressé(s)`}
                                      </p>
                                    );
                                  })()}
                                  <div className="mt-auto pt-2 flex flex-wrap gap-x-3">
                                    <button onClick={() => setLotView({ land, lotId: lot.id })} className={`${btnGhost} px-0 justify-start`}>
                                      <History className="w-4 h-4" /> Détails & historique
                                    </button>
                                    {lot.status !== 'vendu' && (
                                      <button onClick={() => setSelling({ land, lotId: lot.id })} className={`${btnGhost} px-0 text-blue-700 justify-start`}>
                                        <HandCoins className="w-4 h-4" /> Vendre
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid lg:grid-cols-2 gap-4">
                        <div className="bg-white border border-gray-200 rounded-lg p-3">
                          <p className="flex items-center gap-2 font-medium text-navy-900 mb-2"><Receipt className="w-4 h-4 text-gold-600" /> Historique des ventes</p>
                          {!land.sales?.length ? <p className="text-sm text-gray-400">Aucune vente enregistrée.</p> : (
                            <ul className="divide-y divide-gray-100">
                              {[...land.sales].sort((x, y) => y.date.localeCompare(x.date)).map((sale) => (
                                <li key={sale.id} className="py-2 text-sm">
                                  <div className="flex flex-wrap justify-between gap-2">
                                    <Link to={`/admin/achats/${sale.buyRequestId}`} className="font-medium hover:text-gold-600">
                                      {sale.buyer.firstName} {sale.buyer.lastName}
                                    </Link>
                                    <span className="font-semibold">{formatAriary(sale.price)}</span>
                                  </div>
                                  <p className="text-xs text-gray-500">
                                    {new Date(sale.date).toLocaleDateString('fr-FR')} · {sale.lotId ? land.lots?.find((l) => l.id === sale.lotId)?.number ?? 'Parcelle' : 'Terrain entier'} · {sale.buyer.phone} · {sale.paymentMode.split(' –')[0]}
                                  </p>
                                  {sale.notes && <p className="text-xs text-gray-600 mt-0.5">{sale.notes}</p>}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="bg-white border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <p className="flex items-center gap-2 font-medium text-navy-900"><Users className="w-4 h-4 text-gold-600" /> Clients intéressés</p>
                            {land.status !== 'vendu' && <button onClick={() => setInterest(land)} className={`${btnGhost} text-navy-900`}><UserPlus className="w-4 h-4" /> Ajouter</button>}
                          </div>
                          {(() => {
                            const list = requests.filter((r) => r.landId === land.id && r.status !== 'Achat finalisé');
                            if (!list.length) return <p className="text-sm text-gray-400">Aucun client intéressé pour l’instant.</p>;
                            return <ClientRows rows={list} />;
                          })()}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              </Fragment>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-gray-500">Aucun terrain trouvé.</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      {lotView && (
        <LotDialog
          land={lotView.land}
          lotId={lotView.lotId}
          onClose={() => setLotView(null)}
          onChanged={refresh}
          onSell={() => { setSelling({ land: lotView.land, lotId: lotView.lotId }); setLotView(null); }}
        />
      )}

      {interest && (
        <InterestDialog land={interest} onClose={() => setInterest(null)} onDone={() => { setInterest(null); refresh(); }} />
      )}

      {selling && (
        <SaleDialog
          land={selling.land}
          lotId={selling.lotId}
          onClose={() => setSelling(null)}
          onDone={() => { refresh(); setSelling(null); setExpanded(selling.land.id); }}
        />
      )}

      {editing && (
        <LandForm
          land={editing}
          onClose={() => setEditing(null)}
          onSave={(land) => { saveLand(land); refresh(); setEditing(null); }}
        />
      )}
    </>
  );
}

function LandForm({ land, onClose, onSave }: { land: Land; onClose: () => void; onSave: (land: Land) => void }) {
  const [form, setForm] = useState(land);
  const [features, setFeatures] = useState(land.features.join('\n'));
  const [lat, setLat] = useState(land.coordinates?.[0]?.toString() ?? '');
  const [lng, setLng] = useState(land.coordinates?.[1]?.toString() ?? '');
  const [lots, setLots] = useState<Lot[]>(land.lots ?? []);

  const addLot = () =>
    setLots((ls) => [...ls, { id: newId(), number: `Lot ${ls.length + 1}`, area: 0, price: 0, status: 'disponible' }]);
  const setLot = <K extends keyof Lot>(id: string, key: K, value: Lot[K]) =>
    setLots((ls) => ls.map((l) => (l.id === id ? { ...l, [key]: value } : l)));
  const removeLot = (id: string) => setLots((ls) => ls.filter((l) => l.id !== id));

  const set = <K extends keyof Land>(key: K, value: Land[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...form,
      features: features.split('\n').map((f) => f.trim()).filter(Boolean),
      coordinates: lat && lng ? [Number(lat), Number(lng)] : undefined,
      lots,
    });
  };

  const field = (label: string, input: React.ReactNode, full = false) => (
    <label className={`block ${full ? 'sm:col-span-2' : ''}`}>
      <span className="block text-sm font-medium text-navy-900 mb-1">{label}</span>
      {input}
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
      <form onSubmit={submit} className="bg-white rounded-2xl w-full max-w-2xl my-8 shadow-xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold font-display">{land.title ? 'Modifier le terrain' : 'Nouveau terrain'}</h2>
          <button type="button" onClick={onClose} className={btnGhost}><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 grid sm:grid-cols-2 gap-4">
          {field('Titre *', <input required value={form.title} onChange={(e) => set('title', e.target.value)} className={inputClass} />, true)}
          {field('Description', <textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} className={inputClass} />, true)}
          {field('Prix (Ar) *', <input required type="number" min={0} value={form.price || ''} onChange={(e) => set('price', Number(e.target.value))} className={inputClass} />)}
          {field('Surface (m²) *', <input required type="number" min={0} value={form.area || ''} onChange={(e) => set('area', Number(e.target.value))} className={inputClass} />)}
          {field('Région *', <input required value={form.region} onChange={(e) => set('region', e.target.value)} className={inputClass} />)}
          {field('Localisation *', <input required value={form.location} onChange={(e) => set('location', e.target.value)} className={inputClass} />)}
          {field('Latitude', <input type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} className={inputClass} />)}
          {field('Longitude', <input type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} className={inputClass} />)}
          {field('Statut juridique', (
            <select value={form.titleStatus} onChange={(e) => set('titleStatus', e.target.value as TitleStatus)} className={inputClass}>
              {TITLE_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          ))}
          {field('Disponibilité', (
            <select value={form.status} onChange={(e) => set('status', e.target.value as Land['status'])} className={inputClass}>
              {LAND_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          ))}
          {field('URL de l\'image', <input type="url" value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} className={inputClass} placeholder="https://…" />, true)}
          {form.imageUrl && <img src={form.imageUrl} alt="" className="sm:col-span-2 h-40 w-full object-cover rounded-lg" referrerPolicy="no-referrer" />}
          {field('Atouts (un par ligne)', <textarea rows={4} value={features} onChange={(e) => setFeatures(e.target.value)} className={inputClass} />, true)}

          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-navy-900">
                Lotissement {lots.length > 0 && `(${lots.length} lots — ${formatArea(lots.reduce((t, l) => t + l.area, 0))})`}
              </span>
              {lots.reduce((t, l) => t + l.area, 0) > form.area && (
                <span className="text-xs text-red-600">Dépasse la surface totale ({formatArea(form.area)})</span>
              )}
              <button type="button" onClick={addLot} className={btnGhost}><Plus className="w-4 h-4" /> Ajouter un lot</button>
            </div>
            {lots.length === 0 ? (
              <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">Aucun lot. Ce terrain est vendu en un seul bloc.</p>
            ) : (
              <div className="space-y-2">
                {lots.map((lot) => (
                  <div key={lot.id} className="border border-gray-200 rounded-lg p-3 flex gap-3">
                    <div className="w-20 h-20 shrink-0 rounded-md bg-gray-100 overflow-hidden">
                      {lot.imageUrl && <img src={lot.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <input required value={lot.number} onChange={(e) => setLot(lot.id, 'number', e.target.value)} className={inputClass} placeholder="Lot 1" aria-label="N° du lot" />
                        <input required type="number" min={0} value={lot.area || ''} onChange={(e) => setLot(lot.id, 'area', Number(e.target.value))} className={inputClass} placeholder="Surface m²" aria-label="Surface (m²)" />
                        <input required type="number" min={0} value={lot.price || ''} onChange={(e) => setLot(lot.id, 'price', Number(e.target.value))} className={inputClass} placeholder="Prix Ar" aria-label="Prix (Ar)" />
                        <select value={lot.status} onChange={(e) => setLot(lot.id, 'status', e.target.value as Lot['status'])} className={inputClass} aria-label="Statut">
                          {LAND_STATUSES.map((s) => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                      <input type="url" value={lot.imageUrl ?? ''} onChange={(e) => setLot(lot.id, 'imageUrl', e.target.value)} className={inputClass} placeholder="URL de la photo (https://…)" aria-label="Photo" />
                      <textarea rows={2} value={lot.details ?? ''} onChange={(e) => setLot(lot.id, 'details', e.target.value)} className={inputClass} placeholder="Détails : exposition, accès, voisinage…" aria-label="Détails" />
                    </div>
                    <button type="button" onClick={() => removeLot(lot.id)} className={`${btnGhost} self-start hover:text-red-600`} aria-label="Supprimer le lot"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 p-5 border-t">
          <button type="button" onClick={onClose} className={btnGhost}>Annuler</button>
          <button type="submit" className={btnPrimary}>Enregistrer</button>
        </div>
      </form>
    </div>
  );
}
