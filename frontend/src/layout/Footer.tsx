import { Phone, MapPin, Facebook, Send, Mail, Instagram, Music2 } from "lucide-react";
import { Link } from "react-router-dom";
import {
  FB_URL,
  PHONE_1,
  PHONE_1_TEL,
  PHONE_2,
  PHONE_2_TEL,
  EMAIL,
  EMAIL_HREF,
  INSTAGRAM_URL,
  INSTAGRAM_HANDLE,
  TIKTOK_URL,
  TIKTOK_HANDLE,
} from "../lib/contact";

export default function Footer() {
  return (
    <footer className="bg-brand-900 text-white/70 pt-16 pb-24 lg:pb-16 border-t border-white/10">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-6">
            <div className="flex items-center text-white">
              <img
                src="/Logo.jpeg"
                alt="CA IMMO"
                className="h-16 w-16 rounded-xl object-cover"
              />
            </div>
            <p className="text-sm font-light leading-relaxed">
              CA IMMO — Chargé d'Affaires Immobilier, votre expert en
              immobilier à Madagascar. Terrains titrés, lotissement au bord du
              lac et accompagnement sur mesure, à chaque étape de votre projet.
            </p>
            <div className="flex space-x-5 pt-2">
              <a
                href={FB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-gold-500 transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-gold-500 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href={TIKTOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-gold-500 transition-colors"
                aria-label="TikTok"
              >
                <Music2 className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-white font-display text-lg font-semibold tracking-wide mb-6">
              Navigation
            </h3>
            <ul className="space-y-3 text-sm font-light">
              <li>
                <Link
                  to="/terrains"
                  className="inline-block py-1.5 hover:text-gold-500 transition-colors"
                >
                  Nos terrains
                </Link>
              </li>
              <li>
                <Link
                  to="/recherche"
                  className="inline-block py-1.5 hover:text-gold-500 transition-colors"
                >
                  Recherche sur mesure
                </Link>
              </li>
              <li>
                <Link
                  to="/vendre"
                  className="inline-block py-1.5 hover:text-gold-500 transition-colors"
                >
                  Vendre un terrain
                </Link>
              </li>
              <li>
                <Link
                  to="/realisations"
                  className="inline-block py-1.5 hover:text-gold-500 transition-colors"
                >
                  Nos réalisations
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="inline-block py-1.5 hover:text-gold-500 transition-colors"
                >
                  À Propos
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-display text-lg font-semibold tracking-wide mb-6">
              Services
            </h3>
            <ul className="space-y-3 text-sm font-light">
              <li className="text-white/70">Vente de terrains</li>
              <li className="text-white/70">Recherche sur mesure</li>
              <li className="text-white/70">Accompagnement documentaire</li>
              <li className="text-white/70">Accompagnement juridique</li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-display text-lg font-semibold tracking-wide mb-6">
              Contact
            </h3>
            <ul className="space-y-4 text-sm font-light">
              <li className="flex items-start">
                <MapPin className="w-5 h-5 mr-3 text-gold-500 shrink-0" />
                <span>Intervention dans toute Madagascar</span>
              </li>
              <li className="flex items-center">
                <Phone className="w-5 h-5 mr-3 text-gold-500 shrink-0" />
                <span className="flex flex-col">
                  <a
                    href={PHONE_1_TEL}
                    className="inline-block py-1.5 hover:text-gold-500 transition-colors"
                  >
                    {PHONE_1}
                  </a>
                  <a
                    href={PHONE_2_TEL}
                    className="inline-block py-1.5 hover:text-gold-500 transition-colors"
                  >
                    {PHONE_2}
                  </a>
                </span>
              </li>
              <li className="flex items-center">
                <Facebook className="w-5 h-5 mr-3 text-gold-500 shrink-0" />
                <a
                  href={FB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block py-1.5 hover:text-gold-500 transition-colors"
                >
                  CA IMMO sur Facebook
                </a>
              </li>
              <li className="flex items-center">
                <Mail className="w-5 h-5 mr-3 text-gold-500 shrink-0" />
                <a
                  href={EMAIL_HREF}
                  className="inline-block py-1.5 hover:text-gold-500 transition-colors"
                >
                  {EMAIL}
                </a>
              </li>
              <li className="flex items-center">
                <Instagram className="w-5 h-5 mr-3 text-gold-500 shrink-0" />
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block py-1.5 hover:text-gold-500 transition-colors"
                >
                  {INSTAGRAM_HANDLE}
                </a>
              </li>
              <li className="flex items-center">
                <Music2 className="w-5 h-5 mr-3 text-gold-500 shrink-0" />
                <a
                  href={TIKTOK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block py-1.5 hover:text-gold-500 transition-colors"
                >
                  TikTok {TIKTOK_HANDLE}
                </a>
              </li>
              <li className="flex items-center">
                <Send className="w-5 h-5 mr-3 text-gold-500 shrink-0" />
                <Link
                  to="/contact"
                  className="inline-block py-1.5 hover:text-gold-500 transition-colors"
                >
                  Formulaire de contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center text-xs font-light text-white/60">
          <p>
            &copy; {new Date().getFullYear()} CA IMMO. Tous droits réservés.
          </p>
          <p className="mt-4 md:mt-0 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span>Chargé d'Affaires Immobilier — Antananarivo, Madagascar</span>
            <Link to="/confidentialite" className="underline underline-offset-4 hover:text-white">Informations sur vos données</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
