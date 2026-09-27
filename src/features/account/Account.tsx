/* ==========================================================================
   Mon espace client — page/écran : composition et interactions uniquement.
   La donnée vit dans hooks/useClientSpace, les blocs visuels dans components/kit.
   ========================================================================== */

import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Heart,
  KeyRound,
  LandPlot,
  LogOut,
  Mail,
  Map,
  MapPin,
  Menu,
  Pencil,
  Phone,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Tag,
  UserRound,
  X,
} from 'lucide-react';
import { EmptyState, ErrorBanner, FormField, Input, Modal } from '../../shared/ui';
import LandCard from '../catalog/LandCard';
import { useAuth } from '../../lib/auth';
import { getLands } from '../../lib/store';
import type { Reservation } from '../../types';
import { fmtDate, fmtMonthShort, fmtShort, fmtTime, parseDate, formatAriary, formatArea } from '../../lib/format';
import { PHONE_1, PHONE_1_TEL } from '../../lib/contact';
import {
  Card, EmptyBlock, LandMini, LocalStatusBadge, PageHead, StageTrack, StatusBadge,
  STAGE_LABELS, TONES, btnGold, btnOutline, btnPrimary, stageOf,
} from './components/kit';
import { useClientSpace, refOf, searchMatches } from './hooks/useClientSpace';
import type { NotifKind } from './hooks/useClientSpace';
import type { TabId } from './hooks/useClientSpace';

const TABS: { id: TabId; label: string; icon: typeof Search }[] = [
  { id: 'overview', label: 'Vue d’ensemble', icon: UserRound },
  { id: 'purchases', label: 'Demandes d’achat', icon: FileText },
  { id: 'searches', label: 'Mes recherches', icon: Search },
  { id: 'lands', label: 'Terrains proposés', icon: LandPlot },
  { id: 'visits', label: 'Mes visites', icon: CalendarDays },
  { id: 'favorites', label: 'Favoris', icon: Heart },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'profile', label: 'Profil et sécurité', icon: Settings },
];

export default function Account() {
  const { user, logout, updateProfile, changePassword } = useAuth();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false); // menu latéral (mobile)
  const [toast, setToast] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [visitFilter, setVisitFilter] = useState<'upcoming' | 'past'>('upcoming');
  const [editForm, setEditForm] = useState(() => ({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    phone: user?.phone ?? '',
    email: user?.email ?? '',
  }));
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });

  const tabParam = params.get('tab') as TabId | null;
  const active: TabId = tabParam && TABS.some((t) => t.id === tabParam) ? tabParam : 'overview';
  const setTab = (id: TabId) => setParams({ tab: id }, { replace: true });

  // Données de l'espace : demandes, dossiers CRM, visites, notifications…
  const {
    bucket, crm, legacyPurchases, visits, upcomingVisits, pastVisits, nextVisit,
    notifs, readKeys, unread, markAllRead, favLands, recommended, counts, cancelVisit: cancelVisitRequest,
  } = useClientSpace();

  useEffect(() => {
    document.title = 'Mon espace | CA IMMO';
    return () => {
      document.title = 'CA IMMO | Vente de Terrains à Madagascar';
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(t);
  }, [toast]);

  // Arrivée depuis un formulaire : la demande vient d'être enregistrée,
  // on la confirme et on nettoie le paramètre (pas de réaffichage au refresh).
  const newRef = params.get('new');
  useEffect(() => {
    if (!newRef) return;
    setToast(`Votre demande ${newRef} a bien été enregistrée — elle apparaît en tête de liste.`);
    const next = new URLSearchParams(params);
    next.delete('new');
    setParams(next, { replace: true });
    // exécuté une seule fois à l'arrivée sur la page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancelVisit = (r: Reservation) => {
    cancelVisitRequest(r);
    setToast('Demande de visite annulée');
  };

  const openEdit = () => {
    if (user) {
      setEditForm({ firstName: user.firstName, lastName: user.lastName, phone: user.phone, email: user.email });
    }
    setEditError(null);
    setEditOpen(true);
  };

  const saveEdit = () => {
    const res = updateProfile(editForm);
    if (!res.ok) {
      setEditError(res.error ?? 'Une erreur est survenue.');
      return;
    }
    setEditOpen(false);
    setToast('Profil mis à jour');
  };

  const savePassword = () => {
    setPwError(null);
    if (pw.next !== pw.confirm) {
      setPwError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    const res = changePassword(pw.current, pw.next);
    if (!res.ok) {
      setPwError(res.error ?? 'Une erreur est survenue.');
      return;
    }
    setPwOpen(false);
    setPw({ current: '', next: '', confirm: '' });
    setToast('Mot de passe mis à jour');
  };

  if (!user) return <Navigate to="/connexion?mode=login&redirect=/compte" replace />;

  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  const activeTab = TABS.find((t) => t.id === active);
  const notifIcon = { status: CheckCircle2, visit: CalendarDays, match: Search, search: Search, land: LandPlot } as const;
  const notifTone: Record<NotifKind, string> = {
    status: 'green', visit: 'blue', match: 'amber', search: 'orange', land: 'purple',
  };

  return (
    <div className="min-h-screen bg-mist font-display text-navy-900">
      {/* — Barre latérale (même gabarit que le backoffice) — */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy-950 text-white transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-20 shrink-0 items-center border-b border-white/10 px-6">
          <img src="/Logo.jpeg" alt="CA IMMO" className="h-10 w-10 rounded-lg object-cover" />
          <span className="ml-3 leading-none">
            <span className="block font-extrabold">
              CA <span className="text-gold-500">IMMO</span>
            </span>
            <span className="mt-1 block text-[10px] text-white/60">Mon espace client</span>
          </span>
        </div>

        <div className="shrink-0 border-b border-white/10 p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold-500 text-sm font-extrabold text-navy-950">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.fullName}</p>
              <p className="flex items-center gap-1 truncate text-xs text-white/55">
                <ShieldCheck className="h-3 w-3 shrink-0 text-gold-500" aria-hidden /> Compte vérifié
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="Sections de mon espace">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = active === t.id;
            const count = counts[t.id];
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  setOpen(false);
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-gold-500 text-navy-950' : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span>{t.label}</span>
                {count ? (
                  <b className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isActive ? 'bg-navy-950/15 text-navy-950' : 'bg-gold-500 text-navy-950'}`}>
                    {count}
                  </b>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="shrink-0 space-y-1 border-t border-white/10 p-4">
          {/* Aller-retour possible avec le site : liens naturels vers le catalogue. */}
          <Link to="/terrains" className="flex items-center gap-3 rounded-lg px-4 py-2 text-sm text-white/75 transition-colors hover:bg-white/10 hover:text-white">
            <Map className="h-4 w-4" aria-hidden /> Parcourir les terrains
          </Link>
          <Link to="/vendre" className="flex items-center gap-3 rounded-lg px-4 py-2 text-sm text-white/75 transition-colors hover:bg-white/10 hover:text-white">
            <Tag className="h-4 w-4" aria-hidden /> Vendre mon terrain
          </Link>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm text-white/75 transition-colors hover:bg-red-500/15 hover:text-white"
          >
            <LogOut className="h-4 w-4" aria-hidden /> Déconnexion
          </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}

      <div className="min-w-0 lg:ml-64">
        {/* — Barre supérieure mobile — */}
        <header className="sticky top-0 z-30 flex h-16 items-center bg-navy-900 px-4 text-white lg:hidden">
          <button onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <span className="ml-4 font-bold">
            CA IMMO — {activeTab?.label ?? 'Mon espace'}
          </span>
          {unread > 0 && (
            <button type="button" onClick={() => setTab('notifications')} className="ml-auto flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
              <Bell className="h-3.5 w-3.5 text-gold-500" aria-hidden /> {unread}
            </button>
          )}
        </header>

        <main className="mx-auto max-w-7xl p-4 sm:p-8">
          <motion.div key={active} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            {/* ================= VUE D'ENSEMBLE ================= */}
            {active === 'overview' && (
              <>
                <PageHead
                  eyebrow="Mon espace"
                  title={`Bonjour, ${user.firstName} 👋`}
                  text="Suivez vos projets et les dernières mises à jour de votre espace."
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {([
                    { id: 'purchases', icon: FileText, label: 'Demandes d’achat', count: counts.purchases ?? 0, tone: 'blue' },
                    { id: 'searches', icon: Search, label: 'Recherches actives', count: counts.searches ?? 0, tone: 'orange' },
                    { id: 'visits', icon: CalendarDays, label: 'Visites à venir', count: counts.visits ?? 0, tone: 'green' },
                    { id: 'lands', icon: LandPlot, label: 'Terrains proposés', count: counts.lands ?? 0, tone: 'purple' },
                  ] as const).map((s) => {
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setTab(s.id)}
                        className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${TONES[s.tone]}`}>
                          <Icon className="h-5 w-5" aria-hidden />
                        </span>
                        <span className="min-w-0">
                          <strong className="block text-2xl font-bold text-navy-900">{s.count}</strong>
                          <span className="block truncate text-xs text-gray-500">{s.label}</span>
                        </span>
                        <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-gray-300 transition group-hover:text-gold-600" aria-hidden />
                      </button>
                    );
                  })}
                </div>

                {notifs.length === 0 && upcomingVisits.length === 0 ? (
                  <div className="mt-6">
                    <EmptyBlock
                      icon={Search}
                      title="Aucun projet pour l’instant"
                      text="Confiez-nous une recherche ou proposez votre terrain : le suivi apparaîtra ici."
                    />
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button type="button" onClick={() => navigate('/recherche')} className={btnGold}>
                        <Search className="h-4 w-4" aria-hidden /> Confier ma recherche
                      </button>
                      <button type="button" onClick={() => navigate('/vendre')} className={btnOutline}>
                        <Plus className="h-4 w-4" aria-hidden /> Proposer un terrain
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 grid gap-4 lg:grid-cols-5">
                    {/* Activités récentes */}
                    <Card title="Activités récentes" icon={<Bell className="h-4 w-4" />} className="lg:col-span-3">
                      {notifs.length === 0 ? (
                        <p className="py-6 text-center text-sm text-gray-500">Les mises à jour de vos projets apparaîtront ici.</p>
                      ) : (
                        <ul className="space-y-4">
                          {notifs.slice(0, 5).map((n) => {
                            const Icon = notifIcon[n.kind];
                            return (
                              <li key={n.key} className="flex items-start gap-3.5">
                                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${TONES[notifTone[n.kind]]}`}>
                                  <Icon className="h-4 w-4" aria-hidden />
                                </span>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-navy-900">{n.title}</p>
                                  <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{n.text}</p>
                                  <p className="mt-1 text-[11px] text-gray-400">{fmtShort(n.at)}</p>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      {notifs.length > 5 && (
                        <button type="button" onClick={() => setTab('notifications')} className="mt-5 text-xs font-semibold text-navy-900 underline decoration-gold-500 decoration-2 underline-offset-4 transition hover:text-gold-700">
                          Tout voir ({notifs.length})
                        </button>
                      )}
                    </Card>

                    {/* Prochaine visite */}
                    {nextVisit ? (
                      <Card title="Prochaine visite" icon={<CalendarDays className="h-4 w-4" />} className="lg:col-span-2" action={
                        <button type="button" onClick={() => setTab('visits')} className="text-xs font-semibold text-gray-500 transition hover:text-navy-900">
                          Détails
                        </button>
                      }>
                        <div className="flex items-start gap-4">
                          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-navy-900 text-white">
                            <strong className="text-2xl font-bold leading-none">{parseDate(nextVisit.when).getDate()}</strong>
                            <small className="text-[10px] uppercase tracking-wide text-gold-500">
                              {parseDate(nextVisit.when).toLocaleDateString('fr-FR', { month: 'short' })}
                            </small>
                          </div>
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 text-sm font-semibold text-navy-900">
                              <Clock className="h-3.5 w-3.5 text-gold-600" aria-hidden />
                              {fmtDate(nextVisit.when)}
                              {nextVisit.time ? ` — ${nextVisit.time}` : nextVisit.source === 'crm' ? ` — ${fmtTime(nextVisit.when)}` : ''}
                            </p>
                            <p className="mt-1 font-mono text-xs text-gray-400">Dossier {nextVisit.ref}</p>
                          </div>
                        </div>
                        <LandMini landId={nextVisit.landId} />
                        <div className="mt-4 flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3.5">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-navy-900 text-xs font-bold text-gold-500">CA</span>
                          <div className="min-w-0 flex-1">
                            <small className="block text-[11px] text-gray-400">Votre conseiller</small>
                            <strong className="block text-sm text-navy-900">Équipe CA IMMO — {PHONE_1}</strong>
                          </div>
                          <a href={PHONE_1_TEL} className={`${btnPrimary} shrink-0`} aria-label="Appeler votre conseiller">
                            <Phone className="h-4 w-4" aria-hidden />
                          </a>
                        </div>
                      </Card>
                    ) : (
                      <Card title="Une visite sur place ?" icon={<MapPin className="h-4 w-4" />} className="lg:col-span-2">
                        <p className="text-sm leading-relaxed text-gray-600">
                          Choisissez un terrain et demandez une visite : notre équipe organise le rendez-vous avec vous.
                        </p>
                        <button type="button" onClick={() => navigate('/terrains')} className={`${btnGold} mt-5`}>
                          Parcourir les terrains <ChevronRight className="h-4 w-4" aria-hidden />
                        </button>
                      </Card>
                    )}
                  </div>
                )}

                {recommended.length > 0 && (
                  <section className="mt-8">
                    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold-700">Sélection du moment</p>
                        <h2 className="mt-1 text-xl font-bold text-navy-900">Recommandés pour vous</h2>
                      </div>
                      <button type="button" onClick={() => navigate('/terrains')} className={btnOutline}>
                        Voir tous les terrains <ChevronRight className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {recommended.map((l) => (
                        <LandCard key={l.id} land={l} />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}

            {/* ================= DEMANDES D'ACHAT ================= */}
            {active === 'purchases' && (
              <>
                <PageHead
                  eyebrow="Suivi"
                  title="Mes demandes d’achat"
                  text="L’avancement de vos intérêts pour les terrains publiés, suivi par notre équipe."
                  action={
                    <button type="button" onClick={() => navigate('/terrains')} className={btnGold}>
                      <Plus className="h-4 w-4" aria-hidden /> Nouveau projet
                    </button>
                  }
                />
                {crm.buys.length + legacyPurchases.length === 0 ? (
                  <EmptyBlock
                    icon={FileText}
                    title="Aucune demande d’achat"
                    text="Votre historique d’intérêts apparaîtra ici."
                    actionLabel="Parcourir les terrains"
                    onAction={() => navigate('/terrains')}
                  />
                ) : (
                  <div className="space-y-4">
                    {/* Dossiers suivis dans le backoffice (statut réel) */}
                    {crm.buys.map((b) => {
                      const dead = b.status === 'Refusée' || b.status === 'Archivée';
                      return (
                        <article key={b.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                          <header className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-5 py-4">
                            <div>
                              <p className="font-mono text-xs font-bold text-navy-900">{b.ref}</p>
                              <p className="mt-0.5 text-xs text-gray-500">Envoyée le {fmtDate(b.createdAt)}</p>
                            </div>
                            <span className="ml-auto">
                              <StatusBadge value={b.status} />
                            </span>
                          </header>
                          <div className="p-5">
                            <LandMini landId={b.landId} />
                            {b.paymentMode && (
                              <p className="mt-3 text-xs text-gray-500">
                                Paiement souhaité : <strong className="font-semibold text-navy-900">{b.paymentMode}</strong>
                              </p>
                            )}
                            {dead ? (
                              <p className={`mt-4 flex items-start gap-2.5 rounded-xl px-4 py-3 text-xs leading-relaxed ${
                                b.status === 'Refusée' ? 'bg-red-50 text-red-800' : 'bg-gray-100 text-gray-600'
                              }`}>
                                <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                                <span>
                                  <strong className="font-bold">{b.status === 'Refusée' ? 'Dossier clôturé.' : 'Dossier archivé.'}</strong>{' '}
                                  Contactez-nous au {PHONE_1} pour toute question.
                                </span>
                              </p>
                            ) : (
                              <StageTrack steps={STAGE_LABELS} current={stageOf(b.status)} />
                            )}
                          </div>
                        </article>
                      );
                    })}

                    {/* Demandes locales (antérieures à l'intégration du suivi) */}
                    {legacyPurchases.map((r) => (
                      <article key={r.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                        <header className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-5 py-4">
                          <div>
                            <p className="font-mono text-xs font-bold text-navy-900">{refOf(r)}</p>
                            <p className="mt-0.5 text-xs text-gray-500">Envoyée le {fmtDate(r.createdAt)}</p>
                          </div>
                          <span className="ml-auto">
                            <LocalStatusBadge status={r.status} />
                          </span>
                        </header>
                        <div className="p-5">
                          <LandMini landId={r.landId} />
                          {r.paymentMode && (
                            <p className="mt-3 text-xs text-gray-500">
                              Paiement souhaité : <strong className="font-semibold text-navy-900">{r.paymentMode}</strong>
                            </p>
                          )}
                          <StageTrack
                            steps={['Demande reçue', 'En traitement', 'Prise en charge']}
                            current={r.status === 'nouveau' ? 1 : 2}
                          />
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ================= MES RECHERCHES ================= */}
            {active === 'searches' && (
              <>
                <PageHead
                  eyebrow="Suivi"
                  title="Mes recherches"
                  text="Vos critères personnalisés et les terrains proposés par notre équipe."
                  action={
                    <button type="button" onClick={() => navigate('/recherche')} className={btnGold}>
                      <Plus className="h-4 w-4" aria-hidden /> Nouvelle recherche
                    </button>
                  }
                />
                {crm.searches.length + bucket.searches.length === 0 ? (
                  <EmptyBlock
                    icon={Search}
                    title="Aucune recherche confiée"
                    text="Décrivez votre projet : nous cherchons pour vous."
                    actionLabel="Confier ma recherche"
                    onAction={() => navigate('/recherche')}
                  />
                ) : (
                  <div className="grid gap-4 xl:grid-cols-2">
                    {/* Recherches suivies dans le backoffice */}
                    {crm.searches.map((s) => {
                      const matches = searchMatches(s);
                      return (
                        <article key={s.id} className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                          <header className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-5 py-4">
                            <div>
                              <p className="font-mono text-xs font-bold text-navy-900">{s.ref}</p>
                              <p className="mt-0.5 text-xs text-gray-500">Créée le {fmtDate(s.createdAt)}</p>
                            </div>
                            <span className="ml-auto">
                              <StatusBadge value={s.status} />
                            </span>
                          </header>
                          <div className="flex flex-1 flex-col p-5">
                            <h3 className="text-base font-bold text-navy-900">
                              {s.usage} autour de {s.mainZone.split(',')[0]}
                            </h3>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-navy-900">
                                <MapPin className="h-3 w-3 text-gray-400" aria-hidden />
                                {s.mainZone}
                                {s.radiusKm ? ` + ${s.radiusKm} km` : ''}
                              </span>
                              {(s.areaMin > 0 || s.areaMax > 0) && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-navy-900">
                                  <LandPlot className="h-3 w-3 text-gray-400" aria-hidden />
                                  {s.areaMin ? `${s.areaMin}–${s.areaMax || '∞'}` : `≤ ${s.areaMax}`} m²
                                </span>
                              )}
                              {s.budgetMax > 0 && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-navy-900">
                                  ≤ {formatAriary(s.budgetMax)}
                                </span>
                              )}
                              {s.flexible === 'Oui' && (
                                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-navy-900">Zone flexible</span>
                              )}
                            </div>

                            {s.proposals.length > 0 && (
                              <div className="mt-4 space-y-2.5">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Terrains proposés par notre équipe</p>
                                {s.proposals.map((p) => {
                                  const land = getLands().find((l) => l.id === p.landId);
                                  return (
                                    <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                                      {land && <img src={land.imageUrl} alt="" className="h-12 w-16 shrink-0 rounded-lg object-cover" />}
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-navy-900">{land?.title ?? 'Terrain'}</p>
                                        <p className="text-xs text-gray-500">{land ? `${formatArea(land.area)} • ${formatAriary(land.price)}` : p.note}</p>
                                      </div>
                                      <StatusBadge value={p.answer} />
                                      {land && (
                                        <Link to={`/terrains/${land.id}`} className={`${btnOutline} shrink-0`}>
                                          Voir <ChevronRight className="h-4 w-4" aria-hidden />
                                        </Link>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            <div className="mt-auto flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3.5 pt-3.5">
                              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${TONES[matches > 0 ? 'amber' : 'gray']}`}>
                                <Search className="h-4 w-4" aria-hidden />
                              </span>
                              <div className="min-w-0 flex-1">
                                <strong className="block text-sm text-navy-900">
                                  {matches} terrain{matches > 1 ? 's' : ''} correspondant{matches > 1 ? 's' : ''}
                                </strong>
                                <p className="text-xs text-gray-500">
                                  {matches > 0 ? 'Dans notre catalogue actuel' : 'Notre équipe continue de chercher pour vous'}
                                </p>
                              </div>
                              <button type="button" onClick={() => navigate('/terrains')} className={`${btnOutline} shrink-0`}>
                                Voir les terrains <ChevronRight className="h-4 w-4" aria-hidden />
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}

                    {/* Recherches locales (formulaire du site) */}
                    {bucket.searches.map((r) => (
                      <article key={r.id} className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                        <header className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-5 py-4">
                          <div>
                            <p className="font-mono text-xs font-bold text-navy-900">{refOf(r)}</p>
                            <p className="mt-0.5 text-xs text-gray-500">Créée le {fmtDate(r.createdAt)}</p>
                          </div>
                          <span className="ml-auto">
                            <LocalStatusBadge status={r.status} />
                          </span>
                        </header>
                        <div className="flex flex-1 flex-col p-5">
                          <h3 className="text-base font-bold text-navy-900">{r.projectName || 'Recherche de terrain'}</h3>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {r.budget && <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-navy-900">{r.budget}</span>}
                            {r.paymentMode && <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-navy-900">{r.paymentMode}</span>}
                            {r.duration && <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-navy-900">Durée : {r.duration}</span>}
                          </div>
                          {r.message && (
                            <details className="group mt-4">
                              <summary className="cursor-pointer select-none text-[11px] font-bold uppercase tracking-wider text-gray-400 transition hover:text-navy-900">
                                Détails de la demande
                              </summary>
                              <p className="mt-2.5 whitespace-pre-line rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-600">
                                {r.message}
                              </p>
                            </details>
                          )}
                          <div className="mt-auto pt-4">
                            <button type="button" onClick={() => navigate('/terrains')} className={btnOutline}>
                              Voir les terrains <ChevronRight className="h-4 w-4" aria-hidden />
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ================= TERRAINS PROPOSÉS (VENTES) ================= */}
            {active === 'lands' && (
              <>
                <PageHead
                  eyebrow="Suivi"
                  title="Mes terrains proposés"
                  text="Suivez la vérification et la publication de vos terrains."
                  action={
                    <button type="button" onClick={() => navigate('/vendre')} className={btnGold}>
                      <Plus className="h-4 w-4" aria-hidden /> Proposer un terrain
                    </button>
                  }
                />
                {bucket.sells.length === 0 ? (
                  <EmptyBlock
                    icon={LandPlot}
                    title="Aucun terrain proposé"
                    text="Vous souhaitez vendre ? Confiez-nous votre terrain."
                    actionLabel="Proposer un terrain"
                    onAction={() => navigate('/vendre')}
                  />
                ) : (
                  <div className="space-y-4">
                    {bucket.sells.map((r) => (
                      <article key={r.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                        <header className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-5 py-4">
                          <div>
                            <p className="font-mono text-xs font-bold text-navy-900">{refOf(r)}</p>
                            <p className="mt-0.5 text-xs text-gray-500">Soumis le {fmtDate(r.createdAt)}</p>
                          </div>
                          <span className="ml-auto">
                            <LocalStatusBadge status={r.status} />
                          </span>
                        </header>
                        <div className="p-5">
                          <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50 p-3.5">
                            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-purple-100 text-purple-800">
                              <LandPlot className="h-5 w-5" aria-hidden />
                            </span>
                            <div className="min-w-0 flex-1">
                              <strong className="block text-sm font-semibold text-navy-900">{r.projectName || 'Terrain à vendre'}</strong>
                              {r.budget && <p className="text-xs text-gray-500">Prix demandé : {r.budget}</p>}
                            </div>
                          </div>
                          {r.status === 'traité' ? (
                            <p className="mt-4 flex items-start gap-2.5 rounded-xl bg-green-50 px-4 py-3 text-xs leading-relaxed text-green-800">
                              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                              <span>
                                <strong className="font-bold">Dossier validé.</strong> Notre équipe vous contacte pour la suite de la publication.
                              </span>
                            </p>
                          ) : (
                            <p className="mt-4 flex items-start gap-2.5 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
                              <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                              <span>
                                <strong className="font-bold">Vérification en cours.</strong> Notre équipe contrôle les documents transmis. Délai estimé : 2 à 5 jours ouvrés.
                              </span>
                            </p>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ================= MES VISITES ================= */}
            {active === 'visits' && (
              <>
                <PageHead
                  eyebrow="Suivi"
                  title="Mes visites"
                  text="Gérez vos rendez-vous confirmés et passés."
                  action={
                    <button type="button" onClick={() => navigate('/terrains')} className={btnGold}>
                      <Plus className="h-4 w-4" aria-hidden /> Planifier une visite
                    </button>
                  }
                />
                {visits.length === 0 ? (
                  <EmptyBlock
                    icon={CalendarDays}
                    title="Aucune visite"
                    text="Demandez une visite depuis la fiche d’un terrain."
                    actionLabel="Parcourir les terrains"
                    onAction={() => navigate('/terrains')}
                  />
                ) : (
                  <>
                    <div className="mb-5 flex flex-wrap gap-1.5">
                      {([
                        { id: 'upcoming', label: `À venir (${upcomingVisits.length})` },
                        { id: 'past', label: `Passées (${pastVisits.length})` },
                      ] as const).map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setVisitFilter(t.id)}
                          className={`rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                            visitFilter === t.id ? 'border-navy-900 bg-navy-900 text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-navy-900'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    {visitFilter === 'upcoming' && upcomingVisits.length === 0 && (
                      <EmptyBlock icon={CalendarDays} title="Aucune visite à venir" text="Vos prochains rendez-vous apparaîtront ici." />
                    )}
                    {visitFilter === 'past' && pastVisits.length === 0 && (
                      <EmptyBlock icon={CalendarDays} title="Aucune visite passée" text="Votre historique de visites apparaîtra ici." />
                    )}

                    <div className="space-y-4">
                      {(visitFilter === 'upcoming' ? upcomingVisits : pastVisits).map((v) => {
                        const reservation = bucket.visits.find((r) => r.id === v.key);
                        const land = getLands().find((l) => String(l.id) === String(v.landId));
                        return (
                          <article key={v.key} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                            <div className="flex flex-wrap items-center gap-5 p-5">
                              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-navy-900 text-white">
                                <strong className="text-2xl font-bold leading-none">{parseDate(v.when).getDate()}</strong>
                                <small className="text-[10px] uppercase tracking-wide text-gold-500">
                                  {parseDate(v.when).toLocaleDateString('fr-FR', { month: 'short' })}
                                </small>
                              </div>
                              {land && <img src={land.imageUrl} alt="" className="hidden h-20 w-32 shrink-0 rounded-xl object-cover sm:block" />}
                              <div className="min-w-0 flex-1">
                                {v.source === 'crm' ? (
                                  <StatusBadge value="Visite programmée" tone="amber" />
                                ) : (
                                  <LocalStatusBadge status={reservation?.status ?? 'nouveau'} />
                                )}
                                <h3 className="mt-2 truncate text-base font-bold text-navy-900">{land?.title ?? 'Visite de terrain'}</h3>
                                <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                                  <span className="flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5" aria-hidden /> {land?.location ?? 'Localisation à préciser'}
                                  </span>
                                  <span className="flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5" aria-hidden />
                                    {v.time ?? (v.source === 'crm' ? fmtTime(v.when) : 'Heure à confirmer')}
                                  </span>
                                </p>
                                <p className="mt-1 font-mono text-[11px] text-gray-400">Dossier {v.ref}</p>
                              </div>
                              <div className="flex shrink-0 flex-wrap items-center gap-2">
                                {land && (
                                  <Link to={`/terrains/${land.id}`} className={btnOutline}>
                                    Voir le terrain
                                  </Link>
                                )}
                                {reservation && visitFilter === 'upcoming' && (
                                  <button
                                    type="button"
                                    onClick={() => cancelVisit(reservation)}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3.5 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50"
                                  >
                                    Annuler
                                  </button>
                                )}
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}

            {/* ================= FAVORIS ================= */}
            {active === 'favorites' && (
              <>
                <PageHead
                  eyebrow="Ma sélection"
                  title="Favoris"
                  text="Les terrains que vous avez mis de côté."
                  action={
                    <button type="button" onClick={() => navigate('/terrains')} className={btnOutline}>
                      Parcourir les terrains
                    </button>
                  }
                />
                {favLands.length === 0 ? (
                  <EmptyBlock
                    icon={Heart}
                    title="Aucun favori"
                    text="Cliquez sur le cœur d’un terrain pour le retrouver ici."
                    actionLabel="Parcourir les terrains"
                    onAction={() => navigate('/terrains')}
                  />
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {favLands.map((l) => (
                      <LandCard key={l.id} land={l} />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ================= NOTIFICATIONS ================= */}
            {active === 'notifications' && (
              <>
                <PageHead
                  eyebrow="Activité"
                  title="Notifications"
                  text="Restez informé de l’avancement de tous vos projets."
                  action={
                    unread > 0 ? (
                      <button type="button" onClick={markAllRead} className={btnOutline}>
                        <Check className="h-4 w-4" aria-hidden /> Tout marquer comme lu
                      </button>
                    ) : undefined
                  }
                />
                {notifs.length === 0 ? (
                  <EmptyBlock icon={Bell} title="Aucune notification" text="Les mises à jour de vos projets apparaîtront ici." />
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <ul className="divide-y divide-gray-100">
                      {notifs.map((n) => {
                        const Icon = notifIcon[n.kind];
                        const isUnread = !readKeys.includes(n.key);
                        return (
                          <li key={n.key} className={`flex items-start gap-4 px-5 py-4 ${isUnread ? 'bg-gold-500/5' : ''}`}>
                            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${TONES[notifTone[n.kind]]}`}>
                              <Icon className="h-4 w-4" aria-hidden />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-navy-900">{n.title}</p>
                              <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{n.text}</p>
                              <p className="mt-1 text-[11px] text-gray-400">{fmtShort(n.at)}</p>
                            </div>
                            {isUnread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold-500" aria-label="Non lue" />}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </>
            )}

            {/* ================= PROFIL ET SÉCURITÉ ================= */}
            {active === 'profile' && (
              <>
                <PageHead
                  eyebrow="Mon compte"
                  title="Profil et sécurité"
                  text="Gérez vos informations personnelles et votre mot de passe."
                  action={
                    <button type="button" onClick={openEdit} className={btnOutline}>
                      <Pencil className="h-4 w-4" aria-hidden /> Modifier
                    </button>
                  }
                />
                <div className="grid gap-4 lg:grid-cols-5">
                  <Card className="lg:col-span-2">
                    <div className="flex flex-col items-center py-4 text-center">
                      <span className="grid h-24 w-24 place-items-center rounded-full bg-navy-900 text-2xl font-extrabold text-gold-500 ring-4 ring-gold-500/20">
                        {initials}
                      </span>
                      <h3 className="mt-4 text-lg font-bold text-navy-900">{user.fullName}</h3>
                      <p className="mt-1 text-xs text-gray-500">Membre depuis {fmtDate(user.createdAt)}</p>
                      <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-green-100 px-4 py-1.5 text-xs font-semibold text-green-800">
                        <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Compte vérifié
                      </p>
                    </div>
                  </Card>

                  <Card title="Informations personnelles" icon={<UserRound className="h-4 w-4" />} className="lg:col-span-3">
                    <dl className="divide-y divide-gray-100">
                      {[
                        { icon: Mail, label: 'Adresse email', value: user.email },
                        { icon: Phone, label: 'Téléphone', value: user.phone || '—' },
                        { icon: UserRound, label: 'Nom complet', value: user.fullName },
                        { icon: CalendarDays, label: 'Compte créé le', value: fmtDate(user.createdAt) },
                      ].map((row) => {
                        const Icon = row.icon;
                        return (
                          <div key={row.label} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                            <Icon className="h-4 w-4 shrink-0 text-gold-600" aria-hidden />
                            <dt className="text-xs text-gray-500">{row.label}</dt>
                            <dd className="ml-auto truncate text-sm font-semibold text-navy-900">{row.value}</dd>
                          </div>
                        );
                      })}
                    </dl>
                  </Card>

                  <Card title="Sécurité" icon={<ShieldCheck className="h-4 w-4" />} className="lg:col-span-5">
                    <div className="flex flex-wrap items-center gap-4 py-1">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gray-100 text-navy-900">
                        <KeyRound className="h-5 w-5" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-navy-900">Mot de passe</p>
                        <p className="text-xs text-gray-500">Choisissez un mot de passe d’au moins 6 caractères.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPwError(null);
                          setPwOpen(true);
                        }}
                        className={`${btnOutline} shrink-0`}
                      >
                        Changer
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-4 border-t border-gray-100 pt-4">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gray-100 text-navy-900">
                        <Bell className="h-5 w-5" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-navy-900">Notifications</p>
                        <p className="text-xs text-gray-500">Les avancées de vos dossiers, réunies au même endroit.</p>
                      </div>
                      <button type="button" onClick={() => setTab('notifications')} className={`${btnOutline} shrink-0`}>
                        Gérer
                      </button>
                    </div>
                  </Card>
                </div>
              </>
            )}
          </motion.div>
        </main>
      </div>

      {/* — Modifier mes informations — */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Modifier mes informations" subtitle="Mettez à jour vos coordonnées personnelles.">
        {editError && <ErrorBanner className="mb-5">{editError}</ErrorBanner>}
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Prénom" required>
            <Input value={editForm.firstName} onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))} autoComplete="given-name" />
          </FormField>
          <FormField label="Nom" required>
            <Input value={editForm.lastName} onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))} autoComplete="family-name" />
          </FormField>
          <FormField label="Téléphone" required>
            <Input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} autoComplete="tel" />
          </FormField>
          <FormField label="Adresse email" required>
            <Input type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} autoComplete="email" />
          </FormField>
        </div>
        <div className="mt-7 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={() => setEditOpen(false)} className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100">
            Annuler
          </button>
          <button type="button" onClick={saveEdit} className={btnGold}>
            Enregistrer
          </button>
        </div>
      </Modal>

      {/* — Changer mon mot de passe — */}
      <Modal open={pwOpen} onClose={() => setPwOpen(false)} title="Changer mon mot de passe" subtitle="6 caractères minimum." size="sm">
        {pwError && <ErrorBanner className="mb-5">{pwError}</ErrorBanner>}
        <div className="space-y-5">
          <FormField label="Mot de passe actuel" required>
            <Input type="password" value={pw.current} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} autoComplete="current-password" />
          </FormField>
          <FormField label="Nouveau mot de passe" required>
            <Input type="password" value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} autoComplete="new-password" />
          </FormField>
          <FormField label="Confirmer le nouveau mot de passe" required>
            <Input type="password" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} autoComplete="new-password" />
          </FormField>
        </div>
        <div className="mt-7 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={() => setPwOpen(false)} className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100">
            Annuler
          </button>
          <button type="button" onClick={savePassword} className={btnGold}>
            Mettre à jour
          </button>
        </div>
      </Modal>

      {toast && (
        <div role="status" className="fixed bottom-6 right-6 z-[120] flex items-center gap-3 rounded-xl bg-navy-900 px-5 py-4 text-white shadow-2xl">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-gold-500" aria-hidden />
          <p className="text-sm font-medium">{toast}</p>
        </div>
      )}
    </div>
  );
}

