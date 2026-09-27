import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Home, Map, Phone, Tag, Menu, X, Facebook, UserRound, Hammer, Heart, LogOut, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FB_URL, PHONE_1, PHONE_1_TEL, WHATSAPP_URL } from '../lib/contact';
import { useAuth } from '../lib/auth';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false); // menu mobile
  const [menuOpen, setMenuOpen] = useState(false); // menu compte (avatar)
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Ferme le menu compte : clic extérieur ou touche Échap.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const initials = user ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase() : '';

  const handleLogout = () => {
    setMenuOpen(false);
    setIsOpen(false);
    logout();
    navigate('/');
  };

  const navLinks = [
    { name: 'Accueil', path: '/', icon: <Home className="w-4 h-4 mr-2" /> },
    { name: 'Acheter', path: '/terrains', icon: <Map className="w-4 h-4 mr-2" /> },
    { name: 'Vendre', path: '/vendre', icon: <Tag className="w-4 h-4 mr-2" /> },
    { name: 'Réalisations', path: '/realisations', icon: <Hammer className="w-4 h-4 mr-2" /> },
  ];

  return (
    <>
      {/* Top bar */}
      <div className="bg-navy-950 text-white/80 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-between">
          <span className="hidden sm:inline">Chargé d'Affaire Immobilier — Vente de terrains à Madagascar</span>
          <div className="flex items-center gap-4 ml-auto">
            <a href={PHONE_1_TEL} className="flex items-center py-2 hover:text-gold-500 transition-colors">
              <Phone className="w-3.5 h-3.5 mr-1.5" /> {PHONE_1}
            </a>
            <a href={FB_URL} target="_blank" rel="noopener noreferrer" className="-m-1.5 flex items-center p-2.5 hover:text-gold-500 transition-colors">
              <Facebook className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      <nav className="font-display bg-navy-900 border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center">
              <Link to="/" className="flex items-center group">
                <img
                  src="/Logo.jpeg"
                  alt="CA IMMO"
                  className="h-12 w-12 rounded-xl object-cover transition-transform group-hover:scale-105"
                />
                <span className="ml-3 leading-none">
                  <span className="block text-xl font-extrabold text-white">CA <span className="text-gold-500">IMMO</span></span>
                  <span className="block text-xs text-white/60 mt-1">Trouvez. Sécurisez. Accompagnez.</span>
                </span>
              </Link>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              {navLinks.map((link) => (
                <NavLink
                  key={link.name}
                  to={link.path}
                  end
                  className={({ isActive }) =>
                    `relative py-2 text-sm font-medium transition-colors hover:text-gold-500 ${
                      isActive ? 'text-white after:absolute after:left-0 after:-bottom-0.5 after:h-0.5 after:w-full after:rounded-full after:bg-gold-500' : 'text-white/75'
                    }`
                  }
                >
                  {link.name}
                </NavLink>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              {user ? (
                /* Compte connecté : avatar + menu déroulant */
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-expanded={menuOpen}
                    aria-haspopup="menu"
                    aria-label="Mon compte"
                    className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition-colors hover:bg-white/10"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-gold-500 text-xs font-extrabold text-navy-950">
                      {initials}
                    </span>
                    <span className="max-w-[7.5rem] truncate text-sm font-medium text-white/90">{user.firstName}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-white/60 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {menuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.18 }}
                        role="menu"
                        className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-2xl border border-white/10 bg-navy-950 shadow-2xl"
                      >
                        <div className="border-b border-white/10 px-4 py-3.5">
                          <p className="truncate text-sm font-semibold text-white">{user.fullName}</p>
                          <p className="truncate text-xs text-white/50">{user.email}</p>
                        </div>
                        <div className="p-1.5">
                          <Link
                            to="/compte"
                            role="menuitem"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                          >
                            <UserRound className="w-4 h-4" /> Mon espace
                          </Link>
                          <Link
                            to="/compte?tab=favorites"
                            role="menuitem"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                          >
                            <Heart className="w-4 h-4" /> Mes favoris
                          </Link>
                        </div>
                        <div className="border-t border-white/10 p-1.5">
                          <button
                            onClick={handleLogout}
                            role="menuitem"
                            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-white/80 transition-colors hover:bg-red-500/15 hover:text-white"
                          >
                            <LogOut className="w-4 h-4" /> Déconnexion
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  to="/connexion?mode=login"
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white/80 hover:text-gold-500 transition-colors"
                >
                  <UserRound className="w-4 h-4" /> Connexion
                </Link>
              )}
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Nous contacter sur WhatsApp (nouvel onglet)"
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-navy-900 bg-gold-500 rounded-full shadow-lg shadow-gold-500/30 hover:bg-gold-400 transition-colors"
              >
                <Phone className="w-4 h-4" /> Nous contacter
              </a>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              {user && (
                <Link
                  to="/compte"
                  aria-label="Mon espace"
                  className="mr-2 grid h-10 w-10 place-items-center rounded-full bg-gold-500 text-xs font-extrabold text-navy-950"
                >
                  {initials}
                </Link>
              )}
              <button
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-controls="menu-mobile"
                aria-label={isOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
                className="inline-flex items-center justify-center p-2.5 text-white/80 hover:text-white"
              >
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              id="menu-mobile"
              className="md:hidden border-t border-white/10 bg-navy-900 overflow-hidden"
            >
              <div className="px-4 pt-4 pb-6 space-y-2">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.name}
                    to={link.path}
                    end
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center px-3 py-3.5 text-sm font-medium transition-colors ${
                        isActive ? 'text-gold-500' : 'text-white/80 hover:text-gold-500'
                      }`
                    }
                  >
                    {link.icon}
                    {link.name}
                  </NavLink>
                ))}
                {user ? (
                  <>
                    <Link
                      to="/compte"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center px-3 py-3.5 text-sm font-medium text-white/80 hover:text-gold-500"
                    >
                      <UserRound className="w-4 h-4 mr-2" />
                      Mon espace
                    </Link>
                    <Link
                      to="/compte?tab=favorites"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center px-3 py-3.5 text-sm font-medium text-white/80 hover:text-gold-500"
                    >
                      <Heart className="w-4 h-4 mr-2" />
                      Mes favoris
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center px-3 py-3.5 text-sm font-medium text-white/80 hover:text-red-400"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Déconnexion
                    </button>
                  </>
                ) : (
                  <Link
                    to="/connexion?mode=login"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center px-3 py-3.5 text-sm font-medium text-white/80 hover:text-gold-500"
                  >
                    <UserRound className="w-4 h-4 mr-2" />
                    Connexion
                  </Link>
                )}
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsOpen(false)}
                  aria-label="Nous contacter sur WhatsApp (nouvel onglet)"
                  className="flex items-center px-3 py-3.5 text-sm font-medium text-white/80 hover:text-gold-500"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Nous contacter
                </a>
                <Link
                  to="/vendre"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center px-3 py-3 mt-2 text-sm font-semibold text-navy-900 bg-gold-500 rounded-full hover:bg-gold-400"
                >
                  Déposer un terrain
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
}
