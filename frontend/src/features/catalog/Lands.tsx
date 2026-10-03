import { useEffect, useMemo, useRef, useState } from 'react';
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
import { EmptyState, Eyebrow, Input, PageHero, Select, useBodyScrollLock } from '../../shared/ui';
import { Land, Relief } from '../../types';
import { fetchLands, fetchRegions, fetchZones, LandFilters, LandSort } from '../../services/landService';
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
        <span className="h-6 w-11 rounded-full bg-navy-900/12 transition-colors peer-checked:bg-gold-600 peer-focus-visible:ring-2 peer-focus-visible:ring-navy-900/50 peer-focus-visible:ring-offset-2" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export default function Lands() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(() => ({
    ...initialFilters,
    q: searchParams.get('q') ?? '',
    region: searchParams.get('region') ?? '',
    zone: searchParams.get('zone') ?? '',
    minPrice: searchParams.get('min') ?? '',
    maxPrice: searchParams.get('max') ?? '',
    minArea: searchParams.get('amin') ?? '',
    maxArea: searchParams.get('amax') ?? '',
    relief: (searchParams.get('relief') as Relief | '') ?? '',
    payment: (searchParams.get('paiement') as FilterState['payment']) ?? '',
    titleStatus: searchParams.get('titre') ?? '',
    verifiedOnly: searchParams.get('verifies') === '1',
    availableOnly: searchParams.get('dispo') !== '0',
  }));
  const [sort, setSort] = useState<LandSort>(() => (searchParams.get('tri') as LandSort) ?? 'recent');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [mobileFilters, setMobileFilters] = useState(false);
  const [showFilters, setShowFilters] = useState(true); // filtres visibles sur desktop
  useBodyScrollLock(mobileFilters); // page figée derrière le tiroir de filtres
  const [currentPage, setCurrentPage] = useState(() => Number(searchParams.get('page') ?? 1) || 1);
  const resultsRef = useRef<HTMLDivElement>(null);

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

  /* Filtres + page dans l'URL : navigable (retour arrière) et partageable. */
  useEffect(() => {
    const p = new URLSearchParams();
    if (filters.q) p.set('q', filters.q);
    if (filters.region) p.set('region', filters.region);
    if (filters.zone) p.set('zone', filters.zone);
    if (filters.minPrice) p.set('min', filters.minPrice);
    if (filters.maxPrice) p.set('max', filters.maxPrice);
    if (filters.minArea) p.set('amin', filters.minArea);
    if (filters.maxArea) p.set('amax', filters.maxArea);
    if (filters.relief) p.set('relief', filters.relief);
    if (filters.payment) p.set('paiement', filters.payment);
    if (filters.titleStatus) p.set('titre', filters.titleStatus);
    if (filters.verifiedOnly) p.set('verifies', '1');
    if (!filters.availableOnly) p.set('dispo', '0');
    if (sort !== 'recent') p.set('tri', sort);
    if (currentPage > 1) p.set('page', String(currentPage));
    setSearchParams(p, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sort, currentPage]);

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
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
          ? 'fixed inset-y-0 right-0 z-[70] w-[22rem] max-w-[88vw] overflow-y-auto bg-brand-50 p-7 shadow-2xl transition-transform duration-300'
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
              <button onClick={() => setMobileFilters(false)} aria-label="Fermer les filtres" className="rounded-full border border-navy-900/10 p-2.5 lg:hidden">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-7 space-y-7">
          <Switch checked={filters.availableOnly} onChange={(v) => update('availableOnly', v)} title="Disponibles uniquement" hint="Masquer les terrains réservés ou vendus" />

          <div>
            <h3 className="mb-4 text-sm font-semibold text-navy-900">Localisation</h3>
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
            <h3 className="mb-4 text-sm font-semibold text-navy-900">Prix total</h3>
            <div className="mb-3 flex flex-wrap gap-2">
              {([
                { label: '< 30 M', min: '', max: '30000000' },
                { label: '30 – 80 M', min: '30000000', max: '80000000' },
                { label: '80 – 150 M', min: '80000000', max: '150000000' },
                { label: '> 150 M', min: '150000000', max: '' },
              ] as const).map((r) => {
                const on = filters.minPrice === r.min && filters.maxPrice === r.max && (r.min || r.max);
                return (
                  <button
                    key={r.label}
                    onClick={() => {
                      update('minPrice', on ? '' : r.min);
                      update('maxPrice', on ? '' : r.max);
                    }}
                    className={on ? 'chip-on' : 'chip-off !bg-white/70'}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" min={0} inputMode="numeric" aria-label="Prix minimum en Ariary" placeholder="Min." value={filters.minPrice} onChange={(e) => update('minPrice', e.target.value)} />
              <Input type="number" min={0} inputMode="numeric" aria-label="Prix maximum en Ariary" placeholder="Max." value={filters.maxPrice} onChange={(e) => update('maxPrice', e.target.value)} />
            </div>
            <small className="mt-2 block text-xs font-normal text-navy-900/65">Montants en Ariary (Ar)</small>
          </div>

          <details className="group border-t border-navy-900/8 pt-6">
            <summary className="cursor-pointer select-none text-sm font-semibold text-navy-900 hover:text-gold-700">Plus de filtres</summary>
            <div className="mt-5 space-y-7">
          <div className="border-t border-navy-900/8 pt-6">
            <h3 className="mb-4 text-sm font-semibold text-navy-900">Superficie</h3>
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" min={0} inputMode="numeric" aria-label="Surface minimum en m²" placeholder="Min. (m²)" value={filters.minArea} onChange={(e) => update('minArea', e.target.value)} />
              <Input type="number" min={0} inputMode="numeric" aria-label="Surface maximum en m²" placeholder="Max. (m²)" value={filters.maxArea} onChange={(e) => update('maxArea', e.target.value)} />
            </div>
            <Input
              type="number"
              min={0}
              className="mt-3"
              inputMode="numeric"
              aria-label="Prix maximum par m² en Ariary"
              placeholder="Prix max / m² (Ar)"
              value={filters.maxPricePerSqm}
              onChange={(e) => update('maxPricePerSqm', e.target.value)}
            />
          </div>

          <div className="border-t border-navy-900/8 pt-6">
            <h3 className="mb-4 text-sm font-semibold text-navy-900">Relief du terrain</h3>
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
            <h3 className="mb-4 text-sm font-semibold text-navy-900">Mode de paiement</h3>
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
            <h3 className="mb-4 text-sm font-semibold text-navy-900">Statut du titre</h3>
            <Select value={filters.titleStatus} onChange={(e) => update('titleStatus', e.target.value)}>
              <option value="">Tous les statuts</option>
              {TITLE_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
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
    <div className="font-display overflow-x-clip bg-white">
      {/* — Hero navy (style référence : fil d'Ariane + recherche rapide) — */}
      <PageHero
        flat
        pill="Terrains à vendre"
        image="/media/terrains/plaine.jpg"
        title={
          <>
            Trouvez l’emplacement de votre <span className="text-gold-500">prochain projet</span>
          </>
        }
        lead="Explorez les terrains sélectionnés et contrôlés par CA IMMO à Madagascar : titres vérifiés, accompagnement de confiance."
      >
        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex max-w-xl items-center gap-3 rounded-full bg-white py-1.5 pl-5 pr-1.5 text-navy-900 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.45)]"
        >
          <Search className="h-5 w-5 shrink-0 text-navy-900/60" aria-hidden />
          <input
            type="text"
            value={filters.q}
            onChange={(e) => update('q', e.target.value)}
            aria-label="Rechercher une commune, un quartier ou un terrain"
            placeholder="Rechercher une commune, un quartier ou un terrain…"
            className="w-full bg-transparent py-2 text-sm font-medium text-navy-900 outline-none placeholder:text-navy-900/45"
          />
          <button type="submit" className="btn-gold shrink-0 !px-6 !py-2.5 !shadow-none">
            Rechercher
          </button>
        </form>
      </PageHero>

      {/* — Listing — */}
      <section className="pb-24 pt-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className={showFilters ? "gap-10 lg:grid lg:grid-cols-[19.5rem_1fr] xl:gap-14" : ""}>
            {filterSidebar}

            <div>
              {/* Barre outils — en-tête de résultats comme la référence */}
              <div ref={resultsRef} className="scroll-mt-28" />
              <div className="mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-navy-900/8 pb-6">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-navy-900 md:text-2xl">
                    {lands.length} terrain{lands.length > 1 ? 's' : ''} disponible{lands.length > 1 ? 's' : ''}
                  </h2>
                  <p className="mt-1 text-xs font-medium text-navy-900/60">Catalogue CA IMMO · Madagascar</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setShowFilters((v) => !v)}
                    aria-pressed={showFilters}
                    className="btn-outline hidden !px-4 !py-2.5 !text-xs lg:inline-flex"
                    title={showFilters ? 'Masquer les filtres pour agrandir le catalogue' : 'Afficher les filtres'}
                  >
                    {showFilters ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                    <span className="hidden xl:inline">{showFilters ? 'Masquer les filtres' : 'Filtres'}</span>
                  </button>
                  <button
                    onClick={() => setMobileFilters(true)}
                    className="btn-outline relative !px-4 !py-2.5 lg:hidden"
                    aria-label="Ouvrir les filtres"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    {activeChips.length > 0 && (
                      <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-gold-500 px-1 text-xs font-bold text-navy-900">
                        {activeChips.length}
                      </span>
                    )}
                  </button>
                  <div className="flex overflow-hidden rounded-xl border border-navy-900/12">
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
                        className={`px-3.5 py-2.5 transition ${view === mode ? 'bg-navy-900 text-white' : 'text-navy-900/80 hover:bg-mist'}`}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-navy-900/70">
                    <span className="hidden sm:inline">Trier :</span>
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value as LandSort)}
                      className="select !w-auto !rounded-xl !py-2.5 !pl-4 !pr-9 !text-xs"
                      aria-label="Trier les résultats"
                    >
                      <option value="recent">Plus récents</option>
                      <option value="priceAsc">Prix croissant</option>
                      <option value="priceDesc">Prix décroissant</option>
                      <option value="area">Plus grande surface</option>
                    </select>
                  </label>
                </div>
              </div>

              {/* Chips des filtres actifs */}
              <div className="mb-8 flex flex-wrap items-center justify-end gap-4">
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
              {loading && lands.length === 0 ? (
                <div className={`grid gap-7 ${view === 'grid' ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
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
                <div className={`grid gap-7 ${view === 'grid' ? (showFilters ? 'md:grid-cols-2' : 'md:grid-cols-2 xl:grid-cols-3') : 'grid-cols-1'}`}>
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
              de votre <span className="text-gold-500">terrain idéal</span>
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
