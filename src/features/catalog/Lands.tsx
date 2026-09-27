import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Check,
  Grid2X2,
  List,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Search,
  SearchCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import LandCard from './LandCard';
import Pagination from '../../shared/Pagination';
import { EmptyState, Eyebrow, Input, PageHero, Select } from '../../shared/ui';
import { Land, Relief } from '../../types';
import { fetchLands, fetchRegions, fetchZones, LandFilters, LandSort } from '../../lib/api';
import { formatAriary } from '../../lib/format';

const ITEMS_PER_PAGE = 6;
const TITLE_STATUS_OPTIONS = ['Titre Foncier', 'Titre en cours', 'Cadastré'];
const RELIEF_OPTIONS: Relief[] = ['Plat', 'Pente douce', 'Pente forte'];

interface FilterState {
  q: string;
  region: string;
  zone: string;
  minPrice: string;
  maxPrice: string;
  minArea: string;
  maxArea: string;
  maxPricePerSqm: string;
  relief: Relief | '';
  payment: '' | 'comptant' | 'facilite';
  titleStatus: string;
  verifiedOnly: boolean;
  availableOnly: boolean;
}

const initialFilters: FilterState = {
  q: '',
  region: '',
  zone: '',
  minPrice: '',
  maxPrice: '',
  minArea: '',
  maxArea: '',
  maxPricePerSqm: '',
  relief: '',
  payment: '',
  titleStatus: '',
  verifiedOnly: false,
  availableOnly: true,
};

function Switch({
  checked,
  onChange,
  title,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span>
        <strong className="block text-sm font-medium text-navy-900">{title}</strong>
        <small className="mt-0.5 block text-xs font-normal text-navy-900/70">{hint}</small>
      </span>
      <span className="relative inline-flex shrink-0">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-11 rounded-full bg-navy-900/12 transition-colors peer-checked:bg-brand-accent peer-focus-visible:ring-2 peer-focus-visible:ring-navy-900/50 peer-focus-visible:ring-offset-2" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export default function Lands() {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<FilterState>({
    ...initialFilters,
    q: searchParams.get('q') ?? '',
    region: searchParams.get('region') ?? '',
  });
  const [sort, setSort] = useState<LandSort>('recent');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [mobileFilters, setMobileFilters] = useState(false);
  const [showFilters, setShowFilters] = useState(true); // filtres visibles sur desktop
  const [currentPage, setCurrentPage] = useState(1);

  const [regions, setRegions] = useState<string[]>([]);
  const [zones, setZones] = useState<string[]>([]);
  const [lands, setLands] = useState<Land[]>([]);
  const [loading, setLoading] = useState(true);

  const update = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setCurrentPage(1);
  };
  const reset = () => {
    setFilters({ ...initialFilters, availableOnly: true });
    setCurrentPage(1);
  };

  useEffect(() => {
    fetchRegions().then(setRegions).catch(() => setRegions([]));
    fetchZones().then(setZones).catch(() => setZones([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => {
      const payload: LandFilters = {
        q: filters.q || undefined,
        region: filters.region || undefined,
        zone: filters.zone || undefined,
        minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
        maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
        minArea: filters.minArea ? Number(filters.minArea) : undefined,
        maxArea: filters.maxArea ? Number(filters.maxArea) : undefined,
        maxPricePerSqm: filters.maxPricePerSqm ? Number(filters.maxPricePerSqm) : undefined,
        relief: filters.relief || undefined,
        payment: filters.payment || undefined,
        titleStatus: filters.titleStatus || undefined,
        verifiedOnly: filters.verifiedOnly || undefined,
        availableOnly: filters.availableOnly || undefined,
        sort,
      };
      fetchLands(payload)
        .then(setLands)
        .catch(() => setLands([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timeout);
  }, [filters, sort]);

  const activeChips = useMemo(() => {
    const chips: { key: keyof FilterState; label: string }[] = [];
    if (filters.q) chips.push({ key: 'q', label: `« ${filters.q} »` });
    if (filters.region) chips.push({ key: 'region', label: filters.region });
    if (filters.zone) chips.push({ key: 'zone', label: filters.zone });
    if (filters.maxPrice) chips.push({ key: 'maxPrice', label: `≤ ${formatAriary(Number(filters.maxPrice))}` });
    if (filters.minPrice) chips.push({ key: 'minPrice', label: `≥ ${formatAriary(Number(filters.minPrice))}` });
    if (filters.minArea) chips.push({ key: 'minArea', label: `dès ${filters.minArea} m²` });
    if (filters.maxArea) chips.push({ key: 'maxArea', label: `jusqu’à ${filters.maxArea} m²` });
    if (filters.maxPricePerSqm) chips.push({ key: 'maxPricePerSqm', label: `≤ ${formatAriary(Number(filters.maxPricePerSqm))}/m²` });
    if (filters.relief) chips.push({ key: 'relief', label: filters.relief });
    if (filters.payment) chips.push({ key: 'payment', label: filters.payment === 'comptant' ? 'Comptant' : 'Facilité' });
    if (filters.titleStatus) chips.push({ key: 'titleStatus', label: filters.titleStatus });
    return chips;
  }, [filters]);

  const totalPages = Math.max(1, Math.ceil(lands.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentItems = lands.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filterSidebar = (
    <aside
      aria-label="Filtres des terrains"
      role={mobileFilters ? 'dialog' : undefined}
      aria-modal={mobileFilters || undefined}
      onKeyDown={(e) => {
        if (mobileFilters && e.key === 'Escape') setMobileFilters(false);
      }}
      className={`${
        mobileFilters
          ? 'fixed inset-y-0 right-0 z-[70] w-[22rem] max-w-[88vw] overflow-y-auto bg-mist p-7 shadow-2xl transition-transform duration-300'
          : showFilters
            ? 'hidden lg:block lg:sticky lg:top-28 lg:max-h-[calc(100vh-9rem)] lg:self-start lg:overflow-y-auto'
            : 'hidden'
      }`}
    >
      <div className="card-soft p-7">
        <div className="flex items-center justify-between border-b border-navy-900/8 pb-5">
          <div className="flex items-center gap-3">
            <SlidersHorizontal className="h-4.5 w-4.5 text-navy-900/80" />
            <h2 className="text-lg font-bold">Filtres</h2>
            {activeChips.length > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-gold-500 px-1.5 text-xs font-bold text-navy-900">
                {activeChips.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={reset} className="inline-flex items-center gap-1.5 text-xs font-medium text-navy-900/75 transition hover:text-navy-900">
              <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser
            </button>
            {mobileFilters && (
              <button onClick={() => setMobileFilters(false)} aria-label="Fermer les filtres" className="rounded-full border border-navy-900/10 p-2 lg:hidden">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-7 space-y-7">
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-navy-900/70">Localisation</h3>
            <div className="space-y-3">
              <Select value={filters.region} onChange={(e) => update('region', e.target.value)}>
                <option value="">Toutes les régions</option>
                {regions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </Select>
              <Select value={filters.zone} onChange={(e) => update('zone', e.target.value)}>
                <option value="">Toutes les communes</option>
                {zones.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="border-t border-navy-900/8 pt-6">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-navy-900/70">Prix total</h3>
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" min={0} placeholder="Min." value={filters.minPrice} onChange={(e) => update('minPrice', e.target.value)} />
              <Input type="number" min={0} placeholder="Max." value={filters.maxPrice} onChange={(e) => update('maxPrice', e.target.value)} />
            </div>
            <small className="mt-2 block text-xs font-normal text-navy-900/65">Montants en Ariary (Ar)</small>
          </div>

          <details className="group border-t border-navy-900/8 pt-6">
            <summary className="cursor-pointer select-none text-xs font-semibold uppercase tracking-[0.24em] text-navy-900/85 hover:text-navy-900">Plus de filtres</summary>
            <div className="mt-5 space-y-7">
          <div className="border-t border-navy-900/8 pt-6">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-navy-900/70">Superficie</h3>
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" min={0} placeholder="Min. (m²)" value={filters.minArea} onChange={(e) => update('minArea', e.target.value)} />
              <Input type="number" min={0} placeholder="Max. (m²)" value={filters.maxArea} onChange={(e) => update('maxArea', e.target.value)} />
            </div>
            <Input
              type="number"
              min={0}
              className="mt-3"
              placeholder="Prix max / m² (Ar)"
              value={filters.maxPricePerSqm}
              onChange={(e) => update('maxPricePerSqm', e.target.value)}
            />
          </div>

          <div className="border-t border-navy-900/8 pt-6">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-navy-900/70">Relief du terrain</h3>
            <div className="flex flex-wrap gap-2">
              {RELIEF_OPTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => update('relief', filters.relief === r ? '' : r)}
                  className={filters.relief === r ? 'chip-on' : 'chip-off'}
                >
                  {filters.relief === r && <Check className="h-3.5 w-3.5" />}
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-navy-900/8 pt-6">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-navy-900/70">Mode de paiement</h3>
            <div className="space-y-2.5">
              {(
                [
                  { value: '', label: 'Tous les modes' },
                  { value: 'comptant', label: 'Comptant' },
                  { value: 'facilite', label: 'Facilité de paiement' },
                ] as const
              ).map((o) => {
                const selected = filters.payment === o.value;
                return (
                  <label key={o.value} className="flex cursor-pointer items-center gap-3 text-sm font-normal text-navy-900/90">
                    <input
                      type="radio"
                      name="payment"
                      className="sr-only"
                      checked={selected}
                      onChange={() => update('payment', o.value)}
                    />
                    <span
                      className={`grid h-4.5 w-4.5 place-items-center rounded-full border transition ${
                        selected ? 'border-gold-500' : 'border-navy-900/25'
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full transition ${selected ? 'bg-gold-500' : 'bg-transparent'}`} />
                    </span>
                    {o.label}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="border-t border-navy-900/8 pt-6">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-navy-900/70">Statut du titre</h3>
            <Select value={filters.titleStatus} onChange={(e) => update('titleStatus', e.target.value)}>
              <option value="">Tous les statuts</option>
              {TITLE_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-5 border-t border-navy-900/8 pt-6">
            <Switch checked={filters.availableOnly} onChange={(v) => update('availableOnly', v)} title="Disponibles uniquement" hint="Masquer les terrains réservés ou vendus" />
          </div>
            </div>
          </details>
        </div>

        {mobileFilters && (
          <button onClick={() => setMobileFilters(false)} className="btn-gold mt-8 w-full lg:hidden">
            Afficher {lands.length} terrain{lands.length > 1 ? 's' : ''}
          </button>
        )}
      </div>
    </aside>
  );

  return (
    <div className="font-display overflow-x-clip bg-mist">
      {/* — Hero navy (style Accueil / À propos) — */}
      <PageHero
        crumb="Acheter"
        pill="Terrains à vendre"
        title={
          <>
            Trouvez l’emplacement de votre <span className="text-gold-500">prochain projet</span>
          </>
        }
        lead="Une sélection resserrée de parcelles contrôlées à travers Madagascar — titres sécurisés, visites accompagnées et conseils de notre équipe locale, de la première recherche jusqu’au notaire."
      />

      {/* — Listing — */}
      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className={showFilters ? "gap-10 lg:grid lg:grid-cols-[19.5rem_1fr] xl:gap-14" : ""}>
            {filterSidebar}

            <div>
              {/* Barre outils */}
              <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-1 items-center gap-3">
                  <button
                    onClick={() => setShowFilters((v) => !v)}
                    aria-pressed={showFilters}
                    className="btn-outline hidden !px-4 !py-3 lg:inline-flex"
                    title={showFilters ? 'Masquer les filtres pour agrandir le catalogue' : 'Afficher les filtres'}
                  >
                    {showFilters ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                    <span className="hidden xl:inline">{showFilters ? 'Masquer les filtres' : 'Filtres'}</span>
                  </button>
                  <div className="relative max-w-md flex-1">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-900/60" />
                    <input
                      type="text"
                      value={filters.q}
                      onChange={(e) => update('q', e.target.value)}
                      aria-label="Rechercher une ville ou une commune"
                      placeholder="Rechercher une ville, une commune…"
                      className="input !rounded-full !py-3 !pl-11"
                    />
                  </div>
                  <button
                    onClick={() => setMobileFilters(true)}
                    className="btn-outline relative !px-4 !py-3 lg:hidden"
                    aria-label="Ouvrir les filtres"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    {activeChips.length > 0 && (
                      <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-gold-500 px-1 text-xs font-bold text-navy-900">
                        {activeChips.length}
                      </span>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex overflow-hidden rounded-full border border-navy-900/12">
                    {(
                      [
                        { mode: 'grid' as const, icon: Grid2X2, label: 'Vue grille' },
                        { mode: 'list' as const, icon: List, label: 'Vue liste' },
                      ]
                    ).map(({ mode, icon: Icon, label }) => (
                      <button
                        key={mode}
                        onClick={() => setView(mode)}
                        aria-label={label}
                        aria-pressed={view === mode}
                        className={`px-3.5 py-2.5 transition ${view === mode ? 'bg-navy-900 text-white' : 'text-navy-900/80 hover:bg-white'}`}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as LandSort)}
                    className="select !rounded-full !py-2.5 !pl-4 !pr-9 !text-xs"
                    aria-label="Trier les résultats"
                  >
                    <option value="recent">Plus récents</option>
                    <option value="priceAsc">Prix croissant</option>
                    <option value="priceDesc">Prix décroissant</option>
                    <option value="area">Plus grande surface</option>
                  </select>
                </div>
              </div>

              {/* Compteurs + chips actifs */}
              <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm font-normal text-navy-900/80">
                  <strong className="font-medium text-navy-900">
                    {lands.length} terrain{lands.length > 1 ? 's' : ''}
                  </strong>{' '}
                  à vendre — Madagascar
                </p>
                {activeChips.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    {activeChips.map((chip) => (
                      <button
                        key={chip.key}
                        onClick={() => update(chip.key, '' as never)}
                        className="chip-off !bg-white"
                      >
                        {chip.label}
                        <X className="h-3 w-3" />
                      </button>
                    ))}
                    <button onClick={reset} className="text-xs font-medium text-navy-900/70 underline underline-offset-4 transition hover:text-navy-900">
                      Tout effacer
                    </button>
                  </div>
                )}
              </div>

              {/* Résultats */}
              {loading ? (
                <div className={`grid gap-7 ${view === 'grid' ? 'md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="card-soft animate-pulse overflow-hidden">
                      <div className="h-60 bg-navy-900/5" />
                      <div className="space-y-3 p-7">
                        <div className="h-2.5 w-24 rounded-full bg-navy-900/5" />
                        <div className="h-4 w-3/4 rounded-full bg-navy-900/5" />
                        <div className="h-3 w-1/2 rounded-full bg-navy-900/5" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : currentItems.length > 0 ? (
                <div className={`grid gap-7 ${view === 'grid' ? 'md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
                  {currentItems.map((land, idx) => (
                    <motion.div
                      key={land.id}
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.07, 0.35), duration: 0.55, ease: 'easeOut' }}
                      className="h-full"
                    >
                      <LandCard land={land} horizontal={view === 'list'} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={SearchCheck}
                  title="Aucun terrain ne correspond"
                  text="Modifiez vos filtres, ou confiez votre recherche à notre équipe : nous repérons le terrain qui vous convient partout à Madagascar."
                  action="Réinitialiser les filtres"
                  onAction={reset}
                >
                  <Link to="/recherche" className="btn-gold mt-5">
                    Confier ma recherche
                  </Link>
                </EmptyState>
              )}

              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          </div>
        </div>
      </section>

      {/* — Recherche sur mesure — */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="card-soft overflow-hidden md:grid md:grid-cols-[1.35fr_1fr]">
          <div className="p-10 md:p-14">
            <Eyebrow>Recherche sur mesure</Eyebrow>
            <h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-navy-900 md:text-4xl">
              Confiez-nous la recherche
              <br />
              de votre <span className="font-serif italic">terrain idéal</span>
            </h2>
            <p className="mt-5 max-w-md text-sm font-normal leading-relaxed text-navy-900/85">
              Zone, surface, budget, environnement : décrivez-nous votre projet et notre équipe repère, vérifie et
              négocie le terrain qui vous convient — même s’il n’est pas encore dans notre catalogue.
            </p>
            <Link to="/recherche" className="btn-gold mt-8">
              Confier ma recherche <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="relative hidden min-h-[16rem] md:block">
            <img
              src="/media/terrains/colline.jpg"
              alt="Paysage de terrain à Madagascar"
              className="absolute inset-0 h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </section>

      {/* Voile mobile pour les filtres */}
      {mobileFilters && (
        <button
          aria-label="Fermer les filtres"
          onClick={() => setMobileFilters(false)}
          className="fixed inset-0 z-[60] bg-navy-950/35 backdrop-blur-sm lg:hidden"
        />
      )}
    </div>
  );
}
