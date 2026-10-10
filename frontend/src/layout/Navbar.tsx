import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  Phone,
  Tag,
  Menu,
  X,
  Facebook,
  Hammer,
  Compass,
  Info,
  ShoppingBag,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { FB_URL, PHONE_1, PHONE_1_TEL } from "../lib/contact";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false); // menu mobile

  const navLinks = [
    {
      name: "Nos terrains",
      path: "/terrains",
      icon: <ShoppingBag className="w-4 h-4 mr-2" />,
    },
    {
      name: "Recherche sur mesure",
      path: "/recherche",
      icon: <Compass className="w-4 h-4 mr-2" />,
    },
    { name: "Vendre", path: "/vendre", icon: <Tag className="w-4 h-4 mr-2" /> },
    {
      name: "À Propos",
      path: "/about",
      icon: <Info className="w-4 h-4 mr-2" />,
    },
    {
      name: "Réalisations",
      path: "/realisations",
      icon: <Hammer className="w-4 h-4 mr-2" />,
    },
  ];

  return (
    <>
      {/* Top bar */}
      <div className="bg-navy-950 text-white/80 text-xs">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-between">
          <span className="hidden sm:inline">
            Chargé d'Affaire Immobilier — Vente de terrains à Madagascar
          </span>
          <div className="flex items-center gap-4 ml-auto">
            <a
              href={PHONE_1_TEL}
              className="flex items-center py-2 hover:text-gold-500 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 mr-1.5" /> {PHONE_1}
            </a>
            <a
              href={FB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="-m-1.5 flex items-center p-2.5 hover:text-gold-500 transition-colors"
            >
              <Facebook className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      <nav className="font-display bg-navy-900 border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center">
              <Link to="/" className="flex items-center group">
                <img
                  src="/Logo.jpeg"
                  alt="CA IMMO"
                  className="h-12 w-12 rounded-xl object-cover transition-transform group-hover:scale-105"
                />
                <span className="ml-3 leading-none">
                  <span className="block text-xl font-extrabold text-white">
                    CA <span className="text-gold-500">IMMO</span>
                  </span>
                  <span className="block text-xs text-white/60 mt-1">
                    Votre terrain, Votre futur.
                  </span>
                </span>
              </Link>
            </div>

            {/* Desktop Menu */}
            <div className="hidden lg:flex items-center space-x-6">
              {navLinks.map((link) => (
                <NavLink
                  key={link.name}
                  to={link.path}
                  end
                  className={({ isActive }) =>
                    `relative py-2 text-sm font-medium whitespace-nowrap transition-colors hover:text-gold-500 ${
                      isActive
                        ? "text-white after:absolute after:left-0 after:-bottom-0.5 after:h-0.5 after:w-full after:rounded-full after:bg-gold-500"
                        : "text-white/75"
                    }`
                  }
                >
                  {link.name}
                </NavLink>
              ))}
            </div>

            <div className="hidden lg:flex items-center gap-3">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-navy-900 bg-gold-500 rounded-full shadow-lg shadow-gold-500/30 hover:bg-gold-400 transition-colors"
              >
                <Phone className="w-4 h-4" /> Nous contacter
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center lg:hidden">
              <button
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-controls="menu-mobile"
                aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
                className="inline-flex items-center justify-center p-2.5 text-white/80 hover:text-white"
              >
                {isOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              id="menu-mobile"
              className="lg:hidden border-t border-white/10 bg-navy-900 overflow-hidden"
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
                        isActive
                          ? "text-gold-500"
                          : "text-white/80 hover:text-gold-500"
                      }`
                    }
                  >
                    {link.icon}
                    {link.name}
                  </NavLink>
                ))}
                <Link
                  to="/contact"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center px-3 py-3.5 text-sm font-medium text-white/80 hover:text-gold-500"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Nous contacter
                </Link>
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
