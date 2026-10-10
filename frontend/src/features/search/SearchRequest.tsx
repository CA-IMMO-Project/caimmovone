import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  Banknote,
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Home,
  LandPlot,
  MapPin,
  Phone,
  SearchCheck,
  ShieldCheck,
  Sprout,
  Store,
  Umbrella,
  WalletCards,
} from "lucide-react";
import {
  ChoiceCards,
  ErrorBanner,
  FormField,
  Input,
  Modal,
  PageHero,
  ProgressSteps,
  RequestSuccess,
  Select,
  Textarea,
} from "../../shared/ui";
import { fetchZones } from "../../services/landService";
import { createSearchRequest } from "../../services/requestService";
import GeoMapPicker from "../../shared/GeoMapPicker";
import type {
  SearchSubmission,
  SubmitResult,
} from "../../services/requestService";

import { PHONE_1, PHONE_1_TEL } from "../../lib/contact";
import { PHONE_PLACEHOLDER } from "../../lib/phone";
import {
  phoneError,
  emailError,
  isPositiveNumber,
  sanitizePhone,
} from "../../lib/validate";

/* --- Constantes du cahier des charges --- */

const STEP_LABELS = ["Profil", "Localisation", "Terrain", "Financement"];

const NEEDS = [
  "Eau",
  "Électricité",
  "Route goudronnée",
  "Titre foncier impératif",
] as const;
const RELIEFS = [
  "Plat",
  "Pente douce",
  "Pente forte",
  "Sans préférence",
] as const;
const DEADLINES = [
  "Dès que possible",
  "Sous 1 mois",
  "1 à 3 mois",
  "3 à 6 mois",
  "Sans urgence",
] as const;

const BUDGET_RANGES: { label: string; min?: number; max?: number }[] = [
  { label: "Moins de 80 000 000 Ar", max: 80000000 },
  { label: "80 – 120 000 000 Ar", min: 80000000, max: 120000000 },
  { label: "120 – 200 000 000 Ar", min: 120000000, max: 200000000 },
  { label: "Plus de 200 000 000 Ar", min: 200000000 },
];
const BUDGET_CUSTOM = "Budget personnalisé";

const AREA_RANGES: { label: string; min?: number; max?: number }[] = [
  { label: "Moins de 300 m²", max: 300 },
  { label: "300 – 800 m²", min: 300, max: 800 },
  { label: "800 – 2 000 m²", min: 800, max: 2000 },
  { label: "2 000 – 5 000 m²", min: 2000, max: 5000 },
  { label: "Plus de 5 000 m²", min: 5000 },
];
const AREA_CUSTOM = "Surface personnalisée";

type ProjectType =
  | "Résidentiel"
  | "Investissement"
  | "Agricole"
  | "Commercial"
  | "Touristique";
type PaymentMode = "Comptant" | "Facilité de paiement";

function requestRef(): string {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `REC-${yy}${mm}${dd}`;
}

export default function SearchRequest() {
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [done, setDone] = useState<SubmitResult | null>(null); // référence de la demande enregistrée
  const [sending, setSending] = useState(false);
  const [zones, setZones] = useState<string[]>([]);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    zone: "",
    otherZones: "",
    flexible: "Oui" as "Oui" | "Non",
    budget: BUDGET_RANGES[1].label,
    customBudget: "",
    area: AREA_RANGES[2].label,
    customArea: "",
    relief: "Sans préférence" as (typeof RELIEFS)[number],
    usage: "Résidentiel" as ProjectType,
    payment: "Comptant" as PaymentMode,
    duration: "6–10 mois",
    contribution: "",
    deadline: "Dès que possible" as (typeof DEADLINES)[number],
    info: "",
    consent: false,
  });
  const [needs, setNeeds] = useState<string[]>([]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const toggleNeed = (n: string) =>
    setNeeds((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n],
    );

  useEffect(() => {
    fetchZones()
      .then(setZones)
      .catch(() => setZones([]));
  }, []);

  /* --- Navigation par étapes avec validation --- */
  const next = () => {
    setError(null);
    if (step === 0) {
      if (
        !form.firstName.trim() ||
        !form.lastName.trim() ||
        !form.phone.trim()
      ) {
        setError("Veuillez compléter vos coordonnées avant de continuer.");
        return;
      }
      const phone = phoneError(form.phone);
      const email = emailError(form.email);
      if (phone || email) {
        setError(phone ?? email);
        return;
      }
    }
    if (step === 1) {
      if (!form.zone) {
        setError("Veuillez sélectionner la zone principale recherchée.");
        return;
      }
      if (form.zone === "Autre zone" && !form.otherZones.trim()) {
        setError(
          "Précisez la ou les zones souhaitées dans « Autres zones acceptées ».",
        );
        return;
      }
    }
    if (step === 2) {
      if (
        form.budget === BUDGET_CUSTOM &&
        !isPositiveNumber(form.customBudget)
      ) {
        setError("Indiquez votre budget maximum (nombre positif, en Ariary).");
        return;
      }
      if (form.area === AREA_CUSTOM && !isPositiveNumber(form.customArea)) {
        setError("Indiquez la superficie souhaitée (nombre positif, en m²).");
        return;
      }
    }
    setStep((s) => Math.min(s + 1, 3));
    scrollToForm();
  };
  const back = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
    scrollToForm();
  };

  /* Changement d'étape : on remonte jusqu'en haut des champs, pas tout en haut de la page. */
  const formCardRef = useRef<HTMLDivElement>(null);
  const scrollToForm = () =>
    formCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  /* Champs obligatoires de l'étape courante : « Continuer » reste grisé tant qu'ils sont vides. */
  const stepIncomplete =
    step === 0
      ? !form.firstName.trim() || !form.lastName.trim() || !form.phone.trim()
      : step === 1
        ? !form.zone || (form.zone === "Autre zone" && !form.otherZones.trim())
        : step === 2
          ? (form.budget === BUDGET_CUSTOM && !form.customBudget.trim()) ||
            (form.area === AREA_CUSTOM && !form.customArea.trim())
          : false;

  /* --- Résumé + envoi --- */

  const budgetText =
    form.budget === BUDGET_CUSTOM
      ? `${form.customBudget || "—"} Ar max`
      : form.budget;
  const areaText =
    form.area === AREA_CUSTOM ? `${form.customArea || "—"} m² max` : form.area;

  const composeMessage = () => {
    const lines = [
      `Type de projet : ${form.usage}`,
      `Zone principale : ${form.zone === "Autre zone" ? form.otherZones || "À définir" : form.zone || form.otherZones}`,
      form.otherZones && form.zone !== "Autre zone"
        ? `Autres zones : ${form.otherZones}`
        : "",
      `Flexibilité : ${form.flexible === "Oui" ? "Flexible sur la localisation" : "Zone exacte uniquement"}`,
      `Budget : ${budgetText}`,
      `Superficie : ${areaText}`,
      `Relief : ${form.relief}`,
      `Critères : ${needs.length > 0 ? needs.join(", ") : "Aucune contrainte particulière"}`,
      `Paiement : ${form.payment}${form.payment === "Facilité de paiement" ? ` (${form.duration}${form.contribution ? `, apport ${form.contribution} Ar` : ""})` : ""}`,
      `Délai : ${form.deadline}`,
    ].filter(Boolean);
    if (form.info.trim()) lines.push("", form.info.trim());
    return lines.join("\n");
  };

  const finalize = async (payload: SearchSubmission) => {
    if (sending) return; // anti double-clic : un seul envoi à la fois
    setSending(true);
    setError(null);
    try {
      const result = await createSearchRequest(payload); // référence REC-… générée par le backend
      setDone(result);
    } catch {
      setError(
        "L’enregistrement a échoué. Vérifiez votre connexion puis réessayez.",
      );
    } finally {
      setSending(false);
    }
  };

  /* Vocabulaire de l'écran « Recherches spécifiques » du back office. */
  const USAGE_TO_SEARCH: Record<ProjectType, string> = {
    Résidentiel: "Habitation",
    Investissement: "Investissement",
    Agricole: "Agriculture",
    Commercial: "Commerce",
    Touristique: "Hôtellerie / tourisme",
  };
  const budgetMax = () => {
    if (form.budget === BUDGET_CUSTOM) return Number(form.customBudget) || 0;
    const r = BUDGET_RANGES.find((b) => b.label === form.budget);
    return r?.max ?? r?.min ?? 0;
  };
  const areaBounds = () => {
    if (form.area === AREA_CUSTOM)
      return { min: 0, max: Number(form.customArea) || 0 };
    const r = AREA_RANGES.find((a) => a.label === form.area);
    return { min: r?.min ?? 0, max: r?.max ?? r?.min ?? 0 };
  };

  const submit = () => {
    setError(null);
    if (!form.consent) {
      setError(
        "Merci d’accepter d’être contacté(e) au sujet de votre recherche.",
      );
      return;
    }
    const bounds = areaBounds();
    const zone =
      form.zone === "Autre zone" ? form.otherZones || "Zone libre" : form.zone;
    finalize({
      fullName: `${form.firstName} ${form.lastName}`.trim(),
      phone: form.phone,
      email: form.email || undefined,
      usage: USAGE_TO_SEARCH[form.usage],
      budgetMax: budgetMax(),
      areaMin: bounds.min,
      areaMax: bounds.max,
      mainZone: zone,
      otherZones: form.zone !== "Autre zone" ? form.otherZones : "",
      lat: coords?.lat,
      lng: coords?.lng,
      radiusKm: coords ? 5 : undefined,
      flexible: form.flexible,
      criteria: composeMessage(),
    });
  };

  /* --- Formulaire en 4 étapes --- */

  return (
    <div className="font-display overflow-x-clip bg-brand-50">
      {/* — Hero navy (style Accueil / À propos) — */}
      <PageHero
        flat
        pill="Recherche personnalisée"
        image="/media/caimmo/page-recherche.jpg"
        title={
          <>
            Confiez-nous la recherche de{" "}
            <span className="text-gold-500">votre terrain</span>
          </>
        }
        lead="Décrivez votre projet en quelques étapes. Notre équipe locale cherche et vérifie les terrains pour vous."
      />

      <section className="bg-mist py-14 pb-24">
        <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8">
          <div className="gap-10 lg:grid lg:grid-cols-[19rem_1fr] xl:gap-12">
            {/* Encart d'accompagnement — carte marine de la référence, à gauche */}
            <aside className="mb-10 lg:mb-0">
              <div className="lg:sticky lg:top-28">
                <div className="relative overflow-hidden rounded-2xl bg-navy-900 p-8 text-white shadow-xl shadow-navy-900/20">
                  <span
                    className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/5"
                    aria-hidden
                  />
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-gold-500 text-navy-900">
                    <SearchCheck className="h-6 w-6" strokeWidth={2} />
                  </span>
                  <h2 className="mt-5 text-lg font-bold leading-snug">
                    Une recherche vraiment sur mesure
                  </h2>
                  <p className="mt-3 text-xs font-normal leading-relaxed text-white/75">
                    Votre demande n’est pas une simple alerte automatique : elle
                    est étudiée par notre équipe qui connaît le marché local,
                    terrain par terrain.
                  </p>
                  <div className="mt-6 space-y-3.5 border-t border-white/10 pt-6">
                    {[
                      {
                        icon: CheckCircle2,
                        text: "Sélection selon vos critères",
                      },
                      { icon: ShieldCheck, text: "Terrains contrôlés" },
                      { icon: Clock3, text: "Réponse sous 24 – 48 h ouvrées" },
                    ].map(({ icon: Icon, text }) => (
                      <p
                        key={text}
                        className="flex items-center gap-3 text-xs font-medium text-white/90"
                      >
                        <Icon className="h-4 w-4 shrink-0 text-gold-500" />
                        {text}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="card-soft mt-5 flex items-center gap-4 p-6">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gold-500 text-sm font-extrabold text-navy-900">
                    CA
                  </span>
                  <div className="min-w-0">
                    <small className="block text-xs font-normal text-navy-900/65">
                      Besoin d’aide ?
                    </small>
                    <strong className="block text-sm font-bold leading-snug text-navy-900">
                      L’équipe CA IMMO vous accompagne
                    </strong>
                    <a
                      href={PHONE_1_TEL}
                      className="mt-0.5 block text-xs font-semibold text-navy-900/80 transition hover:text-gold-700"
                    >
                      {PHONE_1}
                    </a>
                  </div>
                </div>
              </div>
            </aside>

            {/* Carte formulaire */}
            <div
              ref={formCardRef}
              className="card-soft scroll-mt-28 p-8 sm:p-12"
            >
              <ProgressSteps steps={STEP_LABELS} current={step} />

              <div className="mt-10 min-h-[24rem]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 28 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -28 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  >
                    <div className="mb-8">
                      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-navy-900/65">
                        Étape {step + 1} sur 4
                      </span>
                      <h2 className="mt-2 text-2xl font-bold text-navy-900 md:text-3xl">
                        {
                          [
                            "Parlons un peu de vous",
                            "Où souhaitez-vous investir ?",
                            "Décrivez le terrain idéal",
                            "Votre financement",
                          ][step]
                        }
                      </h2>
                      <p className="mt-2 text-sm font-normal text-navy-900/80">
                        {
                          [
                            "Ces informations permettent à notre équipe de vous recontacter.",
                            "Indiquez votre zone prioritaire et les alternatives possibles.",
                            "Plus vos critères sont précis, meilleures seront nos propositions.",
                            "Des conditions adaptées à votre budget, et un résumé avant l’envoi.",
                          ][step]
                        }
                      </p>
                      {error && (
                        <ErrorBanner className="mt-4">{error}</ErrorBanner>
                      )}
                    </div>

                    {/* — Étape 1 : Profil — */}
                    {step === 0 && (
                      <div className="grid gap-5 sm:grid-cols-2">
                        <FormField label="Prénom" required>
                          <Input
                            placeholder="Ex. Andry"
                            value={form.firstName}
                            onChange={(e) => set("firstName", e.target.value)}
                          />
                        </FormField>
                        <FormField label="Nom" required>
                          <Input
                            placeholder="Ex. Rakoto"
                            value={form.lastName}
                            onChange={(e) => set("lastName", e.target.value)}
                          />
                        </FormField>
                        <FormField label="Téléphone" required>
                          <Input
                            type="tel"
                            placeholder={PHONE_PLACEHOLDER}
                            inputMode="tel"
                            value={form.phone}
                            onChange={(e) =>
                              set("phone", sanitizePhone(e.target.value))
                            }
                          />
                        </FormField>
                        <FormField label="Adresse email">
                          <Input
                            type="email"
                            placeholder="vous@exemple.com"
                            value={form.email}
                            onChange={(e) => set("email", e.target.value)}
                          />
                        </FormField>
                        <p className="flex items-start gap-2.5 text-xs font-normal leading-relaxed text-navy-900/80 sm:col-span-2">
                          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />
                          Vos informations restent confidentielles. Aucune
                          donnée bancaire sensible ne vous sera jamais demandée.
                        </p>
                      </div>
                    )}

                    {/* — Étape 2 : Localisation — */}
                    {step === 1 && (
                      <div className="space-y-6">
                        <div className="grid gap-5 sm:grid-cols-2">
                          <FormField
                            label="Zone principale recherchée"
                            required
                          >
                            <Select
                              value={form.zone}
                              onChange={(e) => set("zone", e.target.value)}
                            >
                              <option value="">Choisir une zone…</option>
                              {zones.map((z) => (
                                <option key={z}>{z}</option>
                              ))}
                              <option>Autre zone</option>
                            </Select>
                          </FormField>
                          <FormField
                            label="Autres zones acceptées"
                            hint="Séparez plusieurs zones par une virgule."
                          >
                            <Input
                              placeholder="Ex. Talatamaty, Ambohidratrimo…"
                              value={form.otherZones}
                              onChange={(e) =>
                                set("otherZones", e.target.value)
                              }
                            />
                          </FormField>
                        </div>

                        {(form.zone || form.otherZones) && (
                          <div className="flex items-center gap-4 rounded-2xl border border-navy-900/8 bg-white px-6 py-4">
                            <MapPin className="h-5 w-5 shrink-0 text-gold-700" />
                            <div>
                              <strong className="block text-sm font-medium text-navy-900">
                                Zone ciblée :{" "}
                                {form.zone === "Autre zone"
                                  ? form.otherZones || "—"
                                  : form.zone || "—"}
                              </strong>
                              <p className="mt-0.5 text-xs font-normal text-navy-900/75">
                                Madagascar{" "}
                                {form.otherZones && form.zone !== "Autre zone"
                                  ? `• Également : ${form.otherZones}`
                                  : ""}
                              </p>
                            </div>
                          </div>
                        )}

                        <FormField
                          label="Repère sur la carte (optionnel)"
                          hint="Recherchez un lieu puis zoomez et cliquez : notre équipe cible la recherche autour de ce point."
                        >
                          <GeoMapPicker
                            lat={coords?.lat}
                            lng={coords?.lng}
                            onChange={(lat, lng) => setCoords({ lat, lng })}
                            radiusKm={5}
                          />
                        </FormField>

                        <FormField
                          label="Êtes-vous flexible sur la localisation ?"
                          required
                        >
                          <ChoiceCards<"Oui" | "Non">
                            value={form.flexible}
                            onChange={(v) => set("flexible", v)}
                            options={[
                              {
                                value: "Oui",
                                label: "Oui, je suis flexible",
                                description: "Proposez-moi les zones proches",
                              },
                              {
                                value: "Non",
                                label: "Non, uniquement cette zone",
                                description: "Respectez la localisation exacte",
                              },
                            ]}
                          />
                        </FormField>
                      </div>
                    )}

                    {/* — Étape 3 : Le terrain — */}
                    {step === 2 && (
                      <div className="space-y-7">
                        <FormField label="Usage prévu du terrain" required>
                          <ChoiceCards<ProjectType>
                            value={form.usage}
                            onChange={(v) => set("usage", v)}
                            options={[
                              {
                                value: "Résidentiel",
                                label: "Construction maison",
                                description: "Villa, famille",
                                icon: Home,
                              },
                              {
                                value: "Investissement",
                                label: "Investissement",
                                description: "Plus-value, lotissement",
                                icon: Building2,
                              },
                              {
                                value: "Agricole",
                                label: "Agriculture",
                                description: "Cultures, élevage",
                                icon: Sprout,
                              },
                              {
                                value: "Commercial",
                                label: "Commerce",
                                description: "Boutique, bureaux",
                                icon: Store,
                              },
                              {
                                value: "Touristique",
                                label: "Tourisme",
                                description: "Hôtel, villa de vacances",
                                icon: Umbrella,
                              },
                            ]}
                          />
                        </FormField>

                        <FormField label="Budget total" required>
                          <ChoiceCards
                            value={form.budget}
                            onChange={(v) => set("budget", v)}
                            options={[
                              ...BUDGET_RANGES.map((b) => ({
                                value: b.label,
                                label: b.label,
                              })),
                              { value: BUDGET_CUSTOM, label: BUDGET_CUSTOM },
                            ]}
                          />
                        </FormField>
                        {form.budget === BUDGET_CUSTOM && (
                          <FormField label="Votre budget maximum" required>
                            <Input
                              type="number"
                              min={0}
                              placeholder="Montant en Ariary"
                              value={form.customBudget}
                              onChange={(e) =>
                                set("customBudget", e.target.value)
                              }
                            />
                          </FormField>
                        )}

                        <FormField label="Superficie souhaitée" required>
                          <ChoiceCards
                            value={form.area}
                            onChange={(v) => set("area", v)}
                            options={[
                              ...AREA_RANGES.map((a) => ({
                                value: a.label,
                                label: a.label,
                              })),
                              { value: AREA_CUSTOM, label: AREA_CUSTOM },
                            ]}
                          />
                        </FormField>
                        {form.area === AREA_CUSTOM && (
                          <FormField label="Votre superficie" required>
                            <Input
                              type="number"
                              min={0}
                              placeholder="Surface en m²"
                              value={form.customArea}
                              onChange={(e) =>
                                set("customArea", e.target.value)
                              }
                            />
                          </FormField>
                        )}

                        <FormField label="Type de terrain" required>
                          <ChoiceCards<(typeof RELIEFS)[number]>
                            value={form.relief}
                            onChange={(v) => set("relief", v)}
                            options={RELIEFS.map((r) => ({
                              value: r,
                              label: r,
                            }))}
                          />
                        </FormField>

                        <FormField
                          label="Critères indispensables"
                          hint="Plusieurs choix possibles"
                        >
                          <div className="flex flex-wrap gap-2">
                            {NEEDS.map((n) => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => toggleNeed(n)}
                                className={
                                  needs.includes(n)
                                    ? "chip-on"
                                    : "chip-off !bg-white/70"
                                }
                              >
                                {needs.includes(n) && (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                                {n}
                              </button>
                            ))}
                          </div>
                        </FormField>
                      </div>
                    )}

                    {/* — Étape 4 : Financement — */}
                    {step === 3 && (
                      <div className="space-y-7">
                        <FormField label="Mode de paiement souhaité" required>
                          <ChoiceCards<PaymentMode>
                            value={form.payment}
                            onChange={(v) => set("payment", v)}
                            options={[
                              {
                                value: "Comptant",
                                label: "Paiement comptant",
                                description: "Règlement en une fois",
                                icon: Banknote,
                              },
                              {
                                value: "Facilité de paiement",
                                label: "Facilité de paiement",
                                description: "Paiement échelonné",
                                icon: WalletCards,
                              },
                            ]}
                          />
                        </FormField>

                        {form.payment === "Facilité de paiement" && (
                          <div className="grid gap-5 sm:grid-cols-2">
                            <FormField label="Durée souhaitée" required>
                              <Select
                                value={form.duration}
                                onChange={(e) =>
                                  set("duration", e.target.value)
                                }
                              >
                                <option>0–4 mois</option>
                                <option>4–6 mois</option>
                                <option>6–10 mois</option>
                                <option>10–12 mois</option>
                                <option>Autre durée</option>
                              </Select>
                            </FormField>
                            <FormField label="Apport initial disponible">
                              <Input
                                type="number"
                                min={0}
                                placeholder="Montant en Ariary"
                                value={form.contribution}
                                onChange={(e) =>
                                  set("contribution", e.target.value)
                                }
                              />
                            </FormField>
                          </div>
                        )}

                        <div className="grid gap-5 sm:grid-cols-2">
                          <FormField label="Délai souhaité">
                            <Select
                              value={form.deadline}
                              onChange={(e) =>
                                set(
                                  "deadline",
                                  e.target.value as (typeof DEADLINES)[number],
                                )
                              }
                            >
                              {DEADLINES.map((d) => (
                                <option key={d}>{d}</option>
                              ))}
                            </Select>
                          </FormField>
                        </div>

                        <FormField label="Informations supplémentaires">
                          <Textarea
                            rows={4}
                            placeholder="Parlez-nous de vos contraintes, préférences, ou de tout autre élément utile…"
                            value={form.info}
                            onChange={(e) => set("info", e.target.value)}
                          />
                        </FormField>

                        {/* Résumé */}
                        <div className="rounded-2xl border border-navy-900/8 bg-white px-6 py-5">
                          <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-navy-900/70">
                            Résumé de votre recherche
                          </h3>
                          <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            {[
                              {
                                icon: MapPin,
                                label: "Zone",
                                value:
                                  form.zone === "Autre zone"
                                    ? form.otherZones || "—"
                                    : form.zone || form.otherZones || "—",
                                edit: 1,
                              },
                              {
                                icon: Banknote,
                                label: "Budget",
                                value: budgetText,
                                edit: 2,
                              },
                              {
                                icon: LandPlot,
                                label: "Superficie",
                                value: areaText,
                                edit: 2,
                              },
                              {
                                icon: WalletCards,
                                label: "Paiement",
                                value: form.payment,
                                edit: 3,
                              },
                            ].map(({ icon: Icon, label, value, edit }) => (
                              <div
                                key={label}
                                className="flex items-center gap-3 text-sm"
                              >
                                <Icon
                                  className="h-4 w-4 shrink-0 text-gold-700"
                                  aria-hidden
                                />
                                <span className="text-xs font-normal text-navy-900/75">
                                  {label}
                                </span>
                                <strong className="truncate font-medium text-navy-900">
                                  {value}
                                </strong>
                                <button
                                  type="button"
                                  onClick={() => setStep(edit)}
                                  className="ml-auto shrink-0 text-xs font-semibold text-navy-900 underline decoration-gold-500 decoration-2 underline-offset-4 transition hover:text-gold-700"
                                >
                                  Modifier
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Consentement */}
                        <label className="flex cursor-pointer items-start gap-3.5">
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={form.consent}
                            onChange={(e) => set("consent", e.target.checked)}
                          />
                          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border border-navy-900/40 transition peer-checked:border-gold-500 peer-checked:bg-gold-500 peer-focus-visible:ring-2 peer-focus-visible:ring-navy-900/50 peer-focus-visible:ring-offset-2">
                            <Check
                              className={`h-3.5 w-3.5 ${form.consent ? "text-navy-900" : "text-transparent"}`}
                            />
                          </span>
                          <p className="text-xs font-normal leading-relaxed text-navy-900/85">
                            J’accepte d’être contacté(e) par CA IMMO au sujet de ma recherche et j’ai pris connaissance des <Link to="/confidentialite" onClick={(event) => event.stopPropagation()} className="font-semibold underline decoration-gold-500 underline-offset-2">informations sur mes données personnelles</Link>.
                          </p>
                        </label>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Navigation */}
              <div className="mt-10 flex items-center justify-between border-t border-navy-900/8 pt-8">
                {step > 0 ? (
                  <button onClick={back} className="btn-ghost">
                    <ChevronLeft className="h-4 w-4" /> Retour
                  </button>
                ) : (
                  <span />
                )}
                {step < 3 ? (
                  <button
                    onClick={next}
                    disabled={stepIncomplete}
                    className="btn-gold disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Continuer <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={submit}
                    disabled={sending || !form.consent}
                    className="btn-gold disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Confier ma recherche <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* — Confirmation : la demande est enregistrée, l'équipe recontacte le client — */}
      <Modal open={done !== null} onClose={() => setDone(null)} size="sm">
        <RequestSuccess
          reference={done?.ref ?? ""}
          title={
            done?.updated ? "Recherche mise à jour" : "Recherche enregistrée"
          }
          text={
            done?.message ??
            "Votre équipe dédiée étudie vos critères et vous propose des parcelles correspondantes."
          }
          onClose={() => setDone(null)}
        />
      </Modal>
    </div>
  );
}
