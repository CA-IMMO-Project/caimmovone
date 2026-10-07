import { useEffect, useState } from "react";
import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  CalendarCheck,
  Map,
  ShoppingBag,
  Tag,
  Users,
  Compass,
  Hammer,
  Mail,
  LogOut,
  ExternalLink,
  Lock,
  Menu,
  X,
} from "lucide-react";
import { isAuthenticated, login, logout } from "../lib/store";
import { bootstrap, ApiError } from "../services/adminService";
import { hydrate, refreshCache, resetCache, isHydrated } from "./crm/sync";
import { DialogHost } from "./crm/dialog";

const links = [
  { to: "/admin", label: "Tableau de bord", icon: LayoutDashboard, end: true },
  { to: "/admin/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/admin/clients", label: "Base clients", icon: Users },
  { to: "/admin/achats", label: "Demandes d’achat", icon: ShoppingBag },
  { to: "/admin/visites", label: "Visites", icon: CalendarCheck },
  { to: "/admin/recherches", label: "Recherches", icon: Compass },
  { to: "/admin/dossiers-terrains", label: "Demandes de vente", icon: Tag },
  { to: "/admin/terrains", label: "Catalogue du site", icon: Map },
  { to: "/admin/realisations", label: "Réalisations", icon: Hammer },
  { to: "/admin/messages", label: "Messages", icon: Mail },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(isHydrated());

  useEffect(() => {
    if (!isAuthenticated()) return;
    if (isHydrated()) {
      setReady(true);
      return;
    }
    // Un seul chargement par session : toutes les collections du back office.
    bootstrap()
      .then((data) => {
        hydrate(data as never);
        setReady(true);
      })
      .catch(() => navigate("/admin/login", { replace: true }));
  }, [navigate]);

  /* Mise à jour automatique : toute fiche créée ailleurs (site public, collègue)
     apparaît sans F5 — resynchronisation périodique + écrans abonnés au cache. */
  useEffect(() => {
    const t = window.setInterval(() => {
      refreshCache();
    }, 15_000);
    return () => window.clearInterval(t);
  }, []);

  if (!isAuthenticated()) return <Navigate to="/admin/login" replace />;
  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center bg-navy-950 text-white font-display">
        <div className="text-center">
          <img
            src="/Logo.jpeg"
            alt="CA IMMO"
            className="h-14 w-14 rounded-xl object-cover mx-auto animate-pulse"
          />
          <p className="mt-4 text-sm text-white/70">
            Chargement du back office…
          </p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    resetCache();
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-brand-50 text-navy-900 font-display">
      <DialogHost />
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-navy-950 text-white flex flex-col transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-20 flex items-center px-6 border-b border-white/10">
          <img
            src="/Logo.jpeg"
            alt="CA IMMO"
            className="h-10 w-10 rounded-lg object-cover"
          />
          <span className="ml-3 leading-none">
            <span className="block font-extrabold">
              CA <span className="text-gold-500">IMMO</span>
            </span>
            <span className="block text-[10px] text-white/60 mt-1">
              Backoffice
            </span>
          </span>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-gold-500 text-navy-950"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <Icon className="w-4 h-4" /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10 space-y-1">
          <a
            href="/"
            target="_blank"
            className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-white/75 hover:bg-white/10"
          >
            <ExternalLink className="w-4 h-4" /> Voir le site
          </a>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-white/75 hover:bg-white/10"
          >
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="min-w-0 lg:ml-64">
        <header className="lg:hidden sticky top-0 z-30 h-16 bg-navy-900 text-white flex items-center px-4">
          <button onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <span className="ml-4 font-bold">CA IMMO — Backoffice</span>
        </header>
        <main className="p-4 sm:p-8 max-w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (isAuthenticated()) return <Navigate to="/admin" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const failure = await login(email, password); // jeton Sanctum délivré par l'API
    if (failure) {
      setError(failure);
      setBusy(false);
      return;
    }
    try {
      hydrate((await bootstrap()) as never); // charge toutes les données du back office
      navigate("/admin");
    } catch (error) {
      setError(
        error instanceof ApiError && error.message
          ? error.message
          : "Impossible de charger les données du serveur.",
      );
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4 font-display">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-white rounded-[2rem] shadow-2xl p-8"
      >
        <div className="flex flex-col items-center mb-6">
          <img
            src="/Logo.jpeg"
            alt="CA IMMO"
            className="h-16 w-16 rounded-xl object-cover"
          />
          <h1 className="mt-4 text-xl font-bold text-navy-900 font-display">
            Backoffice CA IMMO
          </h1>
          <p className="text-sm text-gray-500">
            Accès réservé à l'administration
          </p>
        </div>
        <label className="block text-sm font-medium text-navy-900 mb-1">
          Adresse e-mail
        </label>
        <input
          type="email"
          autoFocus
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
        />
        <label className="block text-sm font-medium text-navy-900 mb-1 mt-4">
          Mot de passe
        </label>
        <div className="relative">
          <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full py-2.5 rounded-lg bg-navy-900 text-white font-semibold hover:bg-navy-800 disabled:opacity-60"
        >
          {busy ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
