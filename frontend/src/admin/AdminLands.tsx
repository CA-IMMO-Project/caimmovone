import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronRight, Eye, FileText, HandCoins, History, ImageIcon, Plus, Receipt, RotateCcw, Sparkles, UserPlus, Users,
} from 'lucide-react';
import { Land } from '../types';
import { getLands, resetLands } from '../lib/store';
import { formatAriary, formatArea, formatDateShort } from '../lib/format';
import { formatPhone } from '../lib/phone';
import { Badge, Card, PageHeader, btnGhost, btnPrimary } from './ui';
import { ListToolbar, Select } from './crm/kit';
import { canLoadPresentation, refreshCache, subscribeCache } from './crm/sync';
import { askConfirm } from './crm/dialog';
import SaleDialog from './SaleDialog';
import { ClientRows, InterestDialog, LotDialog } from './LotDialog';
import { getBuyRequests } from './crm/model';
import { LAND_STATUSES, PUBLICATION_STATUSES, landFrontSummary, publicationLabel, publicationTone } from './landCatalog';

export default function AdminLands() {
  const navigate = useNavigate();
  const [lands, setLands] = useState(getLands);
  useEffect(() => { refreshCache().then(() => setLands(getLands())); return subscribeCache(() => setLands(getLands())); }, []);
  const [q, setQ] = useState('');
  const [loadingExamples, setLoadingExamples] = useState(false);
  const [examplesError, setExamplesError] = useState('');
  const [status, setStatus] = useState('');
  const [publicationStatus, setPublicationStatus] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selling, setSelling] = useState<{ land: Land; lotId?: string } | null>(null);
  const [lotView, setLotView] = useState<{ land: Land; lotId: string } | null>(null);
  const [interest, setInterest] = useState<Land | null>(null);
  const requests = useMemo(() => getBuyRequests(), [lands]);

  const refresh = () => setLands(getLands());

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return lands.filter(
      (land) =>
        (!s || land.title.toLowerCase().includes(s) || land.location.toLowerCase().includes(s)) &&
        (!status || land.status === status) &&
        (!publicationStatus || (land.publicationStatus ?? 'publie') === publicationStatus),
    );
  }, [lands, publicationStatus, q, status]);

  const reset = async () => {
    if (!(await askConfirm('Ajouter le jeu de présentation ? Aucun terrain ne sera supprimé et les données déjà présentes seront conservées.'))) return;
    setLoadingExamples(true);
    setExamplesError('');
    try {
      await resetLands();
      await refreshCache(true);
      refresh();
    } catch (error) {
      setExamplesError(error instanceof Error ? error.message : 'Impossible de charger les exemples.');
    } finally {
      setLoadingExamples(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Catalogue du site"
        subtitle={`${lands.length} terrain(s) au catalogue — cliquez sur une ligne pour dérouler le détail, ou sur « Voir » pour la fiche complète.`}
        action={
          <div className="flex gap-2">
            {canLoadPresentation() && <button onClick={reset} disabled={loadingExamples} className={btnGhost}><RotateCcw className="w-4 h-4" /> {loadingExamples ? 'Chargement…' : 'Charger les exemples'}</button>}
            <Link to="/admin/terrains/nouveau" className={btnPrimary}><Plus className="w-4 h-4" /> Ajouter un terrain</Link>
          </div>
        }
      />

      {examplesError && <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{examplesError}</p>}

      <ListToolbar
        q={q}
        onQ={setQ}
        placeholder="Rechercher par titre ou localisation…"
        filters={
          <>
            <Select value={status} onChange={setStatus} options={LAND_STATUSES} placeholder="Tous les statuts" />
            <Select value={publicationStatus} onChange={setPublicationStatus} options={PUBLICATION_STATUSES} placeholder="Toutes les publications" />
          </>
        }
        activeFilters={(status ? 1 : 0) + (publicationStatus ? 1 : 0)}
      />

      <Card className="overflow-hidden">
        <div className="admin-scroll-x" role="region" aria-label="Tableau du catalogue, défilement horizontal possible" tabIndex={0}>
        <table className="w-full min-w-[760px] text-sm">
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
            {filtered.map((land) => {
              const summary = landFrontSummary(land);
              const isOpen = expanded === land.id;
              return (
                <Fragment key={land.id}>
                  <tr className="cursor-pointer hover:bg-gray-50" onClick={() => setExpanded(isOpen ? null : land.id)}>
                    <td className="h-16 p-3">
                      <div className="flex items-center gap-3">
                        <ChevronRight className={`w-4 h-4 shrink-0 transition-transform text-gray-600 ${isOpen ? 'rotate-90' : ''}`} />
                        {land.imageUrl && <img src={land.imageUrl} alt="" className="h-10 w-14 rounded object-cover" referrerPolicy="no-referrer" loading="lazy" decoding="async" />}
                        <div className="min-w-0">
                          <p className="max-w-[260px] truncate font-medium text-navy-900" title={land.title}>{land.title}</p>
                          <p className="mt-1 truncate text-xs text-gray-500">{land.titleStatus}{land.zone ? ` · ${land.zone}` : ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">{land.region}</td>
                    <td className="p-3 whitespace-nowrap">{formatArea(land.area)}</td>
                    <td className="p-3 whitespace-nowrap">{formatAriary(land.price)}</td>
                    <td className="p-3 whitespace-nowrap">
                      {land.lots?.length ? `${land.lots.filter((lot) => lot.status === 'disponible').length} / ${land.lots.length} dispo.` : '—'}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col items-start gap-1">
                        <Badge value={land.status} />
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${publicationTone(land.publicationStatus)}`}>{publicationLabel(land.publicationStatus)}</span>
                      </div>
                    </td>
                    <td className="p-3 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                      {land.status !== 'vendu' && (
                        <button onClick={() => setSelling({ land })} className={`${btnGhost} text-blue-700`} title="Enregistrer une vente"><HandCoins className="w-4 h-4" /> Vendre</button>
                      )}
                      <Link to={`/admin/terrains/${land.id}`} className={btnPrimary} aria-label="Voir la fiche"><Eye className="w-4 h-4" /> Voir</Link>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-gray-50">
                      <td colSpan={7} className="px-3 pb-4 pt-1">
                        <div className="space-y-4 pl-7">
                          {summary.gallery.length > 0 && (
                            <div className="admin-scroll-x flex gap-2 pb-1">
                              {summary.gallery.slice(0, 8).map((src, i) => (
                                <img
                                  key={`${src}-${i}`}
                                  src={src}
                                  alt={`${land.title} — visuel ${i + 1}`}
                                  className="h-20 w-28 shrink-0 rounded-lg border border-gray-200 object-cover"
                                  referrerPolicy="no-referrer" loading="lazy" decoding="async" />
                              ))}
                            </div>
                          )}

                          <div className="grid gap-3 lg:grid-cols-4">
                            <div className="rounded-xl border border-gray-200 bg-white p-3">
                              <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500"><ImageIcon className="h-3.5 w-3.5" /> Photos</p>
                              <p className="mt-1 font-semibold text-navy-900">{summary.galleryCount} visuel(x)</p>
                              <p className="mt-1 text-xs text-gray-500">{summary.galleryCount >= 2 ? 'Galerie exploitable côté front' : 'Galerie à enrichir'}</p>
                            </div>
                            <div className="rounded-xl border border-gray-200 bg-white p-3">
                              <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500"><FileText className="h-3.5 w-3.5" /> Documents</p>
                              <p className="mt-1 font-semibold text-navy-900">{summary.documentsCount} document(s)</p>
                              <p className="mt-1 text-xs text-gray-500">{summary.documentsCount ? 'Le front peut détailler les pièces.' : 'Aucun document visible sur la fiche.'}</p>
                            </div>
                            <div className="rounded-xl border border-gray-200 bg-white p-3">
                              <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500"><Sparkles className="h-3.5 w-3.5" /> Paiement</p>
                              <p className="mt-1 font-semibold text-navy-900">{summary.payment}</p>
                              <p className="mt-1 text-xs text-gray-500">{land.downPayment || 'Acompte non renseigné'}{land.installments ? ` · ${land.installments}` : ''}</p>
                            </div>
                            <div className="rounded-xl border border-gray-200 bg-white p-3">
                              <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500"><Users className="h-3.5 w-3.5" /> Accès</p>
                              <p className="mt-1 font-semibold text-navy-900">{summary.access}</p>
                              <p className="mt-1 text-xs text-gray-500">{land.coordinates?.length ? 'Coordonnées GPS renseignées' : 'Carte non positionnée'}</p>
                            </div>
                          </div>

                          {land.lots && land.lots.length > 0 && (
                            <div>
                              <p className="mb-2 text-xs text-gray-500">Parcelles : {formatArea(land.lots.reduce((total, lot) => total + lot.area, 0))} sur {formatArea(land.area)}</p>
                              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                {land.lots.map((lot) => (
                                  <div key={lot.id} className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
                                    {lot.imageUrl && <img src={lot.imageUrl} alt="" className="h-24 w-full object-cover" referrerPolicy="no-referrer" loading="lazy" decoding="async" />}
                                    <div className="flex flex-1 flex-col p-3">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium text-navy-900">{lot.number}</span>
                                        <Badge value={lot.status} />
                                      </div>
                                      <p className="mt-1 text-gray-600">{formatArea(lot.area)} · {formatAriary(lot.price)}</p>
                                      {lot.details && <p className="mt-1 line-clamp-3 text-xs text-gray-500">{lot.details}</p>}
                                      {(() => {
                                        const count = requests.filter((request) => request.landId === land.id && request.lotId === lot.id && request.status !== 'Achat finalisé').length;
                                        const buyer = land.sales?.find((sale) => sale.lotId === lot.id)?.buyer;
                                        return (
                                          <p className="mt-2 flex items-center gap-1 text-xs text-gray-600">
                                            <Users className="h-3.5 w-3.5 text-gold-700" />
                                            {buyer ? `Acheteur : ${buyer.firstName} ${buyer.lastName}` : `${count} client(s) intéressé(s)`}
                                          </p>
                                        );
                                      })()}
                                      <div className="mt-auto flex flex-wrap gap-x-3 pt-2">
                                        <button onClick={() => setLotView({ land, lotId: lot.id })} className={`${btnGhost} justify-start px-0`}>
                                          <History className="w-4 h-4" /> Détails & historique
                                        </button>
                                        {lot.status !== 'vendu' && (
                                          <button onClick={() => setSelling({ land, lotId: lot.id })} className={`${btnGhost} justify-start px-0 text-blue-700`}>
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

                          <div className="grid gap-4 lg:grid-cols-2">
                            <div className="rounded-lg border border-gray-200 bg-white p-3">
                              <p className="mb-2 flex items-center gap-2 font-medium text-navy-900"><Receipt className="w-4 h-4 text-gold-700" /> Historique des ventes</p>
                              {!land.sales?.length ? <p className="text-sm text-gray-600">Aucune vente enregistrée.</p> : (
                                <ul className="divide-y divide-gray-100">
                                  {[...land.sales].sort((x, y) => y.date.localeCompare(x.date)).map((sale) => (
                                    <li key={sale.id} className="py-2 text-sm">
                                      <div className="flex flex-wrap justify-between gap-2">
                                        <Link to={`/admin/achats/${sale.buyRequestId}`} className="font-medium hover:text-gold-700">{sale.buyer.firstName} {sale.buyer.lastName}</Link>
                                        <span className="font-semibold">{formatAriary(sale.price)}</span>
                                      </div>
                                      <p className="text-xs text-gray-500">
                                        {formatDateShort(sale.date)} · {sale.lotId ? land.lots?.find((lot) => lot.id === sale.lotId)?.number ?? 'Parcelle' : 'Terrain entier'} · {formatPhone(sale.buyer.phone)} · {sale.paymentMode.split(' –')[0]}
                                      </p>
                                      {sale.notes && <p className="mt-0.5 text-xs text-gray-600">{sale.notes}</p>}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            <div className="rounded-lg border border-gray-200 bg-white p-3">
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <p className="flex items-center gap-2 font-medium text-navy-900"><Users className="w-4 h-4 text-gold-700" /> Clients intéressés</p>
                                {land.status !== 'vendu' && <button onClick={() => setInterest(land)} className={`${btnGhost} text-navy-900`}><UserPlus className="w-4 h-4" /> Ajouter</button>}
                              </div>
                              {(() => {
                                const list = requests.filter((request) => request.landId === land.id && request.status !== 'Achat finalisé');
                                if (!list.length) return <p className="text-sm text-gray-600">Aucun client intéressé pour l’instant.</p>;
                                return <ClientRows rows={list} />;
                              })()}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-gray-500">Aucun terrain trouvé.</td></tr>
            )}
          </tbody>
        </table>
        </div>
        <p className="border-t border-gray-100 bg-gray-50/60 px-4 py-1.5 text-[11px] text-gray-500 sm:hidden">
          Faites glisser le tableau horizontalement pour voir toutes les colonnes.
        </p>
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

      {interest && <InterestDialog land={interest} onClose={() => setInterest(null)} onDone={() => { setInterest(null); refresh(); }} />}

      {selling && (
        <SaleDialog
          land={selling.land}
          lotId={selling.lotId}
          onClose={() => setSelling(null)}
          onDone={() => { refresh(); setSelling(null); setExpanded(selling.land.id); navigate(`/admin/terrains/${selling.land.id}`); }}
        />
      )}
    </>
  );
}
