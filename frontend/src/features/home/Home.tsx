import { motion, useReducedMotion } from "motion/react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Phone,
  Award,
  FileCheck,
  Home as HomeIcon,
  Users,
  ShieldCheck,
  MapPinned,
  LandPlot,
  Search,
  HandCoins,
  Repeat,
  Building2,
  Wallet,
  Cpu,
  View,
  MonitorPlay,
  Footprints,
  Globe,
  Eye,
  Star,
  HeartHandshake,
  Tag,
  Ruler,
} from "lucide-react";
import { PHONE_1_TEL } from "../../lib/contact";
import LandCard from "../catalog/LandCard";
import { fetchLands } from "../../services/landService";
import type { Land } from "../../types";

/* Visuels signature de la charte de référence (villa moderne + lotissement). */
const IMG_HERO =
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1800&q=80";
const IMG_LOTS =
  "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=80";
const IMG_AERIAL = "/media/terrains/colline.jpg";
const IMG_SUNSET = "/media/terrains/littoral.jpg";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.6, ease: "easeOut" as const },
};

function Eyebrow({
  children,
  light = false,
}: {
  children: ReactNode;
  light?: boolean;
}) {
  return (
    <p
      className={`flex items-center gap-3 text-sm font-semibold mb-3 ${light ? "text-gold-500" : "text-navy-900"}`}
    >
      <span className="h-[3px] w-7 rounded-full bg-gold-500" />
      {children}
    </p>
  );
}

function DroneIcon({
  className = "",
  spin = false,
}: {
  className?: string;
  spin?: boolean;
}) {
  const rotor = (cx: number) => (
    <g>
      <line
        x1={cx}
        y1="14"
        x2={cx}
        y2="20"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <ellipse
        cx={cx}
        cy="13"
        rx="11"
        ry="1.8"
        fill="currentColor"
        opacity={spin ? 0.55 : 1}
        className={spin ? "animate-pulse" : undefined}
      />
    </g>
  );
  return (
    <svg viewBox="0 0 100 56" className={className} fill="none" aria-hidden>
      {/* bras */}
      <path
        d="M14 20 L38 28 M86 20 L62 28"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {rotor(14)}
      {rotor(86)}
      {/* corps */}
      <rect x="34" y="22" width="32" height="14" rx="7" fill="currentColor" />
      <circle cx="50" cy="29" r="2.5" fill="#f7c325" />
      {/* nacelle + caméra */}
      <path
        d="M44 36 L44 41 M56 36 L56 41"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <rect x="42" y="40" width="16" height="10" rx="3" fill="currentColor" />
      <circle
        cx="50"
        cy="45"
        r="3"
        fill="#0b1e42"
        stroke="#f7c325"
        strokeWidth="1.5"
      />
      {/* patins */}
      <path
        d="M32 36 L28 46 M68 36 L72 46 M24 46 H34 M66 46 H76"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GoldButton({
  to,
  children,
  small = false,
  className = "",
}: {
  to: string;
  children: ReactNode;
  small?: boolean;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-gold-500 font-semibold text-navy-900 shadow-lg shadow-gold-500/30 transition hover:bg-gold-400 hover:-translate-y-0.5 ${
        small ? "px-5 py-2.5 text-xs" : "px-7 py-3.5 text-sm"
      } ${className}`}
    >
      {children} <ArrowRight className="w-4 h-4" />
    </Link>
  );
}

export default function Home() {
  const reduce = useReducedMotion();
  const [featured, setFeatured] = useState<Land[]>([]);
  useEffect(() => {
    let alive = true;
    fetchLands({ availableOnly: true })
      .then((lands) => {
        if (alive) setFeatured(lands.slice(0, 3));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return (
    <div className="font-display overflow-hidden bg-white">
      {/* ================= HERO ================= */}
      <section className="relative bg-navy-900 text-white">
        <div className="absolute inset-y-0 right-0 w-full lg:w-[62%]">
          <img
            src={IMG_HERO}
            alt="Villa avec piscine à Madagascar"
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-navy-900 via-navy-900/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-900/80 via-transparent to-transparent" />
        </div>
        {/* yellow decorative blob */}
        <svg
          className="absolute left-0 top-10 w-10 md:w-14 h-28 md:h-36 text-gold-500"
          viewBox="0 0 60 150"
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M0,0 C45,20 60,55 48,80 C38,100 30,110 40,150 C20,120 0,110 0,90 Z"
          />
        </svg>

        <div className="relative z-10 mx-auto max-w-full px-4 sm:px-6 lg:px-8 pt-20 pb-40 md:pt-24 md:pb-44">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-xl"
          >
            <Eyebrow light>
              <span className="text-xl md:text-2xl font-medium">
                Bienvenue chez
              </span>
            </Eyebrow>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-none tracking-tight mb-5">
              CA <span className="text-gold-500">Immo</span>
            </h1>
            <p className="text-xl md:text-2xl font-semibold mb-6">
              Votre projet immobilier, notre engagement.
            </p>
            <p className="text-sm md:text-base text-white/80 leading-relaxed mb-10 max-w-md">
              Depuis plus de 12 ans, CA Immo vous accompagne dans vos projets
              immobiliers à Madagascar : achat, vente, recherche de terrain,
              lotissement et acquisition de maisons clé en main.
            </p>
            <div className="flex flex-wrap gap-4">
              <GoldButton to="/terrains" className="w-full sm:w-auto">
                Découvrir nos biens
              </GoldButton>
              <a
                href={PHONE_1_TEL}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/60 px-7 py-3.5 text-sm font-medium transition hover:bg-white hover:text-navy-900 w-full sm:w-auto"
              >
                <Phone className="w-4 h-4" /> Parler à un conseiller
              </a>
            </div>
          </motion.div>

          {/* Feature strip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-14 lg:absolute lg:right-8 lg:bottom-20 lg:mt-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-y-6 lg:divide-x lg:divide-white/25"
          >
            {[
              { icon: Award, label: "+12 ans\nd’expérience" },
              { icon: FileCheck, label: "Terrains\ntitrés" },
              { icon: HomeIcon, label: "Maisons\nclé en main" },
              { icon: Users, label: "Accompagnement\npersonnalisé" },
              { icon: ShieldCheck, label: "Sécurité\nfoncière" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center text-center px-4 xl:px-6"
              >
                <Icon className="w-9 h-9 text-gold-500 mb-2" strokeWidth={2} />
                <span className="whitespace-pre-line text-xs font-semibold leading-tight">
                  {label}
                </span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* curved bottom */}
        <svg
          className="absolute -bottom-px left-0 z-0 block w-full h-20 md:h-32 text-white"
          viewBox="0 0 1440 140"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M0,0 C20,90 110,128 330,132 C760,138 1180,128 1440,110 L1440,142 L0,142 Z"
          />
        </svg>
      </section>

      {/* ================= EN QUELQUES MOTS ================= */}
      <section className="relative bg-white py-16 md:py-20">
        <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8 grid gap-12 lg:grid-cols-12 items-center">
          <motion.div
            {...fadeUp}
            className="lg:col-span-4 relative mx-auto w-full max-w-sm"
          >
            <div className="absolute -left-4 top-6 bottom-0 right-10 rounded-[2rem] bg-gold-500 -rotate-6" />
            <img
              src={IMG_LOTS}
              alt="Lotissement vu du ciel"
              className="relative h-72 w-full rounded-[2rem] object-cover shadow-2xl -rotate-3 border-4 border-white"
              referrerPolicy="no-referrer"
            />
          </motion.div>

          <motion.div {...fadeUp} className="lg:col-span-5">
            <Eyebrow>CA Immo en quelques mots</Eyebrow>
            <h2 className="text-2xl md:text-3xl font-bold text-navy-900 leading-tight mb-6">
              Une expertise immobilière au service de vos projets
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              CA Immo est{" "}
              <strong className="text-navy-900">
                une entreprise immobilière avec plus de 12 ans d’expérience
              </strong>
              , spécialisée dans les projets immobiliers à Madagascar. Nous vous
              accompagnons dans l’achat et la vente de terrains, le lotissement,
              la recherche de biens spécifiques et les projets de maisons clé en
              main.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed mb-8">
              Notre priorité est de vous proposer une solution adaptée à vos
              besoins, votre budget et vos attentes, tout en garantissant la
              qualité de nos prestations et votre satisfaction.
            </p>
            <GoldButton to="/about" small>
              Découvrir notre entreprise
            </GoldButton>
          </motion.div>

          <motion.div
            {...fadeUp}
            className="lg:col-span-3 rounded-3xl bg-mist p-7 shadow-sm"
          >
            <h3 className="font-bold text-navy-900 mb-5">
              <span className="text-gold-500">N</span>os solutions
            </h3>
            <ul className="space-y-4">
              {[
                { icon: FileCheck, label: "Terrain titré" },
                { icon: LandPlot, label: "Lotissement" },
                { icon: HomeIcon, label: "Maison clé en main" },
                { icon: Search, label: "Recherche personnalisée" },
                { icon: HandCoins, label: "Vente de terrain" },
              ].map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-4 text-sm text-navy-900"
                >
                  <Icon className="w-5 h-5 text-gold-600" /> {label}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* ================= TERRAINS EN VEDETTE ================= */}
      {featured.length > 0 && (
        <section className="relative bg-white pb-16 md:pb-24">
          <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
              <div>
                <Eyebrow>Nos sélections</Eyebrow>
                <h2 className="text-2xl md:text-3xl font-bold text-navy-900 leading-tight">
                  Terrains <span className="text-gold-500">en vedette</span>
                </h2>
                <p className="mt-3 max-w-xl text-sm text-slate-600 leading-relaxed">
                  Un aperçu de nos parcelles disponibles actuellement — titrées,
                  contrôlées et prêtes à être visitées.
                </p>
              </div>
              <Link
                to="/terrains"
                className="btn-outline !px-6 !py-3 !text-xs !font-semibold"
              >
                Voir tout le catalogue <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
              {featured.map((land, i) => (
                <motion.div
                  key={land.id}
                  {...fadeUp}
                  transition={{ ...fadeUp.transition, delay: i * 0.08 }}
                  className="h-full"
                >
                  <LandCard land={land} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================= OBJECTIF ================= */}
      <section className="relative bg-mist py-16 md:py-20">
        <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8 grid gap-10 lg:grid-cols-12 items-center">
          <motion.div {...fadeUp} className="lg:col-span-4">
            <Eyebrow>Notre objectif</Eyebrow>
            <h2 className="text-3xl font-bold text-navy-900 leading-tight mb-5">
              Vous accompagner dans vos projets immobiliers
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-8">
              Que vous souhaitiez acheter, vendre ou trouver un terrain sur
              mesure, nous sommes là pour vous guider et vous apporter des
              solutions adaptées à vos besoins.
            </p>
            <GoldButton to="/contact" small>
              En savoir plus
            </GoldButton>
          </motion.div>

          <div className="lg:col-span-8 grid gap-5 sm:grid-cols-3">
            {[
              {
                icon: HomeIcon,
                bg: "bg-navy-900 text-white",
                title: "Vous souhaitez acheter ?",
                text: "Nous vous aidons à trouver le bien ou le terrain qui correspond à vos besoins et à vos moyens.",
                to: "/terrains",
                cta: "Parcourir le catalogue",
              },
              {
                icon: Repeat,
                bg: "bg-gold-500 text-navy-900",
                title: "Vous souhaitez vendre ?",
                text: "Nous vous accompagnons dans la mise en valeur de votre bien et dans toutes les démarches liées à la vente.",
                to: "/vendre",
                cta: "Vendre mon terrain",
              },
              {
                icon: Search,
                bg: "bg-navy-900 text-white",
                title: "Vous recherchez un terrain précis ?",
                text: "Donnez-nous vos critères : emplacement, superficie, budget, accessibilité, environnement… Nous recherchons pour vous.",
                to: "/recherche",
                cta: "Confier ma recherche",
              },
            ].map(({ icon: Icon, bg, title, text, to, cta }, i) => (
              <motion.div
                key={title}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.1 }}
                className="h-full"
              >
                <Link
                  to={to}
                  className="group/card flex h-full flex-col rounded-2xl bg-white p-6 shadow-lg shadow-navy-900/5 transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div
                    className={`mb-5 flex h-12 w-12 items-center justify-center rounded-full ${bg}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-navy-900 mb-3 leading-snug">
                    {title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {text}
                  </p>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-xs font-bold text-gold-700">
                    {cta}{" "}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover/card:translate-x-0.5" />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= POURQUOI ================= */}
      <section className="relative bg-navy-900 text-white pt-24 pb-28 md:pt-28 md:pb-36">
        <svg
          className="absolute -top-px left-0 block w-full h-12 md:h-16 text-mist"
          viewBox="0 0 1440 70"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M0,-2 L1440,-2 L1440,0 C1400,0 1380,70 1280,70 L0,70 Z"
          />
        </svg>
        <svg
          className="absolute -bottom-px left-0 block w-full h-24 md:h-40"
          viewBox="0 0 1440 160"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            className="text-gold-500"
            fill="currentColor"
            d="M820,160 C1080,140 1290,90 1440,0 L1440,160 Z"
          />
          <path
            fill="#ffffff"
            d="M0,120 C420,168 1000,150 1440,70 L1440,162 L0,162 Z"
          />
        </svg>
        <div className="relative mx-auto max-w-full px-4 sm:px-6 lg:px-8 grid gap-12 lg:grid-cols-12">
          <motion.div {...fadeUp} className="lg:col-span-4">
            <Eyebrow light>Pourquoi choisir CA Immo ?</Eyebrow>
            <h2 className="text-2xl md:text-3xl font-bold leading-tight">
              Plus qu’un bien immobilier, un{" "}
              <span className="text-gold-500">accompagnement sécurisé</span>
            </h2>
          </motion.div>
          <div className="lg:col-span-8 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Footprints,
                title: "Visites accompagnées",
                text: "Découvrez chaque parcelle sur place, guidé par notre équipe locale.",
              },
              {
                icon: ShieldCheck,
                title: "Sécurité foncière",
                text: "Des démarches encadrées et une attention particulière à la sécurisation des biens.",
              },
              {
                icon: Building2,
                title: "Accompagnement administratif",
                text: "Nous vous guidons dans toutes les démarches liées à votre projet.",
              },
              {
                icon: Ruler,
                title: "Notaire & géomètre",
                text: "Des professionnels compétents pour renforcer la sécurité de votre acquisition.",
              },
              {
                icon: Wallet,
                title: "Solutions de paiement",
                text: "Des modalités adaptées selon votre projet et les négociations.",
              },
              {
                icon: Cpu,
                title: "Technologie & innovation",
                text: "Drones, visite virtuelle et outils numériques pour découvrir un bien où que vous soyez.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <motion.div key={title} {...fadeUp}>
                <Icon className="w-8 h-8 text-gold-500 mb-3" strokeWidth={2} />
                <h3 className="font-semibold mb-2">{title}</h3>
                <p className="text-xs text-white/65 leading-relaxed">{text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= A DISTANCE ================= */}
      <section className="relative bg-white">
        <div className="mx-auto max-w-full grid lg:grid-cols-2 items-center">
          <motion.div
            {...fadeUp}
            className="px-4 sm:px-6 lg:px-8 py-16 md:py-24"
          >
            <Eyebrow>L’immobilier, même à distance</Eyebrow>
            <h2 className="text-3xl font-bold text-navy-900 leading-tight mb-4">
              Vous êtes à l’étranger ?<br />
              Votre projet reste à portée de main.
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-8 max-w-md">
              Grâce à nos technologies, découvrez un terrain ou une propriété à
              Madagascar depuis où que vous soyez.
            </p>
            <div className="flex flex-wrap gap-4 mb-10">
              {[
                {
                  icon: ({ className }: { className?: string }) => (
                    <DroneIcon className={className} />
                  ),
                  label: "Drone",
                },
                { icon: View, label: "Visite virtuelle" },
                { icon: MonitorPlay, label: "Présentation à distance" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-full bg-brand-50 pl-2 pr-5 py-2 shadow-sm"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-navy-900 shadow">
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="text-xs font-semibold text-navy-900">
                    {label}
                  </span>
                </div>
              ))}
            </div>
            <GoldButton to="/terrains" small>
              Voir nos solutions
            </GoldButton>
          </motion.div>

          <motion.div
            {...fadeUp}
            className="relative h-80 lg:h-full min-h-[380px]"
          >
            <img
              src={IMG_AERIAL}
              alt="Vue aérienne par drone"
              className="absolute inset-0 h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/20 to-transparent" />
            {/* Drones en vol */}
            <motion.div
              className="absolute left-[8%] top-[10%] w-32 md:w-40 text-navy-950 drop-shadow-[0_12px_12px_rgba(7,22,52,0.45)]"
              animate={
                reduce ? undefined : { y: [0, -14, 0], rotate: [-3, 2, -3] }
              }
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <DroneIcon spin className="w-full h-auto" />
            </motion.div>
            <motion.div
              className="absolute left-[40%] bottom-[12%] w-16 md:w-20 text-navy-900/90 drop-shadow-[0_8px_8px_rgba(7,22,52,0.4)]"
              animate={
                reduce
                  ? undefined
                  : { x: [0, 24, 0], y: [0, -8, 0], rotate: [2, -3, 2] }
              }
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              <DroneIcon spin className="w-full h-auto" />
            </motion.div>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-60 rounded-3xl rounded-bl-none bg-navy-900 p-6 text-white shadow-2xl">
              <Globe className="w-8 h-8 text-gold-500 mb-4" strokeWidth={2} />
              <p className="font-semibold leading-snug">
                Votre projet immobilier à Madagascar,{" "}
                <span className="text-gold-500">où que vous soyez.</span>
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================= ENGAGEMENTS ================= */}
      <section className="bg-mist py-16 md:py-20">
        <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8 grid gap-10 lg:grid-cols-12 items-center">
          <motion.div {...fadeUp} className="lg:col-span-3">
            <Eyebrow>Nos engagements</Eyebrow>
            <h2 className="text-2xl md:text-3xl font-bold text-navy-900 leading-tight">
              Nous nous engageons à vous accompagner avec transparence
            </h2>
          </motion.div>
          <div className="lg:col-span-9 grid gap-4 grid-cols-2 md:grid-cols-5">
            {[
              {
                icon: ShieldCheck,
                title: "Sécurisation",
                text: "Une attention particulière à la situation foncière et administrative.",
              },
              {
                icon: Eye,
                title: "Transparence",
                text: "Des informations claires sur les biens, les conditions et les engagements.",
              },
              {
                icon: Star,
                title: "Qualité",
                text: "Des solutions correspondant à vos critères et à vos attentes.",
              },
              {
                icon: HeartHandshake,
                title: "Satisfaction",
                text: "Un suivi sérieux et le respect des engagements convenus.",
              },
              {
                icon: Tag,
                title: "Prix & négociation",
                text: "Des offres compétitives et négociables selon les projets.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <motion.div
                key={title}
                {...fadeUp}
                className="rounded-2xl bg-white p-5 shadow-md shadow-navy-900/5 transition hover:-translate-y-1"
              >
                <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-gold-500">
                  <Icon className="w-5 h-5" />
                </span>
                <h3 className="text-sm font-bold text-navy-900 mb-2">
                  {title}
                </h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {text}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="relative text-white">
        <img
          src={IMG_SUNSET}
          alt="Paysage de Madagascar"
          className="absolute inset-0 h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-900/85 to-navy-900/30" />
        <svg
          className="absolute -top-px left-0 block w-full h-10 md:h-16"
          viewBox="0 0 1440 70"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            fill="#f3f6fb"
            d="M0,-2 L1440,-2 L1440,10 C1000,50 500,60 0,40 Z"
          />
          <path
            className="text-gold-500"
            fill="currentColor"
            d="M0,40 C60,42 110,45 150,48 C110,58 50,66 0,70 Z"
          />
        </svg>
        <div className="relative mx-auto max-w-full px-4 sm:px-6 lg:px-8 py-20 md:py-24 flex flex-col lg:flex-row lg:items-center gap-10 justify-between">
          <motion.div {...fadeUp}>
            <Eyebrow light>Vous avez un projet immobilier ?</Eyebrow>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Acheter <span className="text-gold-500">•</span> Vendre{" "}
              <span className="text-gold-500">•</span> Construire{" "}
              <span className="text-gold-500">•</span> Investir
            </h2>
            <p className="text-sm text-white/80 max-w-md leading-relaxed">
              Parlez-nous de votre projet. Notre équipe vous accompagne pour
              trouver une solution adaptée à vos besoins et à votre budget.
            </p>
          </motion.div>
          <motion.div {...fadeUp} className="flex flex-wrap gap-3">
            <GoldButton to="/recherche" small>
              J’ai un projet
            </GoldButton>
            <Link
              to="/terrains"
              className="inline-flex items-center gap-2 rounded-full border border-white/60 px-5 py-2.5 text-xs font-medium transition hover:bg-white hover:text-navy-900"
            >
              Voir nos terrains <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-full border border-white/60 px-5 py-2.5 text-xs font-medium transition hover:bg-white hover:text-navy-900"
            >
              <Phone className="w-4 h-4" /> Nous contacter
            </Link>
          </motion.div>
        </div>
        <svg
          className="absolute -bottom-px left-0 block w-full h-10 md:h-14"
          viewBox="0 0 1440 60"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            className="text-gold-500"
            fill="currentColor"
            d="M0,20 C300,62 700,60 1040,34 L1040,62 L0,62 Z"
          />
          <path
            fill="#0b1e42"
            d="M0,40 C300,70 700,66 1040,48 L1040,62 L0,62 Z"
          />
        </svg>
        <div className="relative flex justify-end">
          <div className="flex items-center gap-3 rounded-tl-[3.5rem] bg-navy-950 pl-10 pr-8 md:pr-12 pt-7 pb-6 text-white">
            <MapPinned className="w-7 h-7 text-gold-500" />
            <div>
              <p className="font-extrabold text-xl leading-none">
                CA <span className="text-gold-500">IMMO</span>
              </p>
              <p className="text-xs text-white/70">
                Trouvez. Sécurisez. Accompagnez.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
