import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  Banknote,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  FileCheck2,
  FileText,
  Info,
  LandPlot,
  MapPin,
  PlayCircle,
  ShieldCheck,
  UserRound,
  WalletCards,
} from "lucide-react";
import {
  ChoiceCards,
  ErrorBanner,
  Eyebrow,
  FormField,
  Input,
  Modal,
  PageHero,
  ProgressSteps,
  RequestSuccess,
  Select,
  Textarea,
  UploadZone,
} from "../../shared/ui";
import {
  phoneError,
  emailError,
  isPositiveNumber,
  sanitizePhone,
} from "../../lib/validate";
import { createLandFileRequest } from "../../services/requestService";
import { PHONE_PLACEHOLDER } from "../../lib/phone";
import { PHONE_1, PHONE_1_TEL, WHATSAPP_URL } from "../../lib/contact";
import type {
  LandFileSubmission,
  SubmitResult,
} from "../../services/requestService";
import GeoMapPicker from "../../shared/GeoMapPicker";

const STEP_LABELS = [
  "Qui vend ?",
  "Votre terrain",
  "Où est-il ?",
  "Vos documents",
  "Prix et conditions",
];
const RELIEFS = ["Plat", "Pente douce", "Pente forte"] as const;
/* Pièces d'identité acceptées — liste alignée sur celle du back office
   (frontend/src/admin/crm/model.ts : ID_TYPES) et sur ce qui est exigé pour
   l'acte de vente à Madagascar (procédure officielle torolalana.gov.mg :
   « photocopies des cartes nationales d'identité (CNI) légalisées du vendeur,
   de l'acheteur et des témoins »).

   Volontairement EXCLUS :
   · le permis de conduire — refusé par la vérification d'identité à distance
     des plateformes (il ne prouve ni l'identité ni la nationalité), alors qu'il
     est toléré, au mieux, en présence physique ;
   · le certificat de résidence du fokontany — ce n'est PAS une pièce
     d'identité : c'est un justificatif d'adresse délivré pour 200 à 1 000 Ar,
     qui sert justement à obtenir une CIN. Il sera demandé plus tard, au moment
     du dossier de vente, avec l'acte de vente.
   Une CIN expirée reste acceptée : à Madagascar elle permet encore de justifier
   son identité si la photographie est ressemblante. */
const ID_TYPES = ["CIN", "Passeport", "Carte de résident"] as const;
/* Liste calée sur la procédure officielle malgache (torolalana.gov.mg,
   « Acheter un terrain auprès d'un particulier ») : le certificat de situation
   juridique de moins de 3 mois, le plan topographique, le titre foncier ou
   l'extrait cadastral, les CNI légalisées et les certificats de résidence y
   figurent explicitement. On les range par familles, comme dans un vrai
   dossier, au lieu d'une liste plate où tout se vaut.

   « Petit papier » n'est PAS un document : c'est le nom générique donné aux
   papiers qui prouvent une occupation SANS titre (anciens actes de vente,
   quittances d'impôt, permis). Il ne pouvait donc pas être coché à côté d'un
   titre foncier — c'est une situation, traitée par la case « je n'ai pas de
   titre » plus bas. */
type DocGroup = { titre: string; aide: string; items: string[] };
const DOC_GROUPS: DocGroup[] = [
  {
    titre: "Preuve de propriété",
    aide: "Le document qui atteste que le terrain est au vendeur.",
    items: [
      "Titre foncier (bokin-tany)",
      "Certificat foncier (kara-tany — guichet foncier de la commune)",
      "Extrait cadastral",
      "Acte de notoriété ou acte de partage (succession, indivision)",
      "Papiers coutumiers (anciens actes de vente, reçus, permis)",
    ],
  },
  {
    titre: "Pièces de la transaction",
    aide: "Ce que le notaire et le service des domaines réclament.",
    items: [
      "Certificat de situation juridique (CSJ, moins de 3 mois)",
      "Plan topographique ou bornage (coordonnées Laborde)",
      "Autorisation de transaction ou prescription d’urbanisme",
      "Lettre de vente ou acte de vente",
      "Quittance d’impôt foncier",
    ],
  },
  {
    titre: "Identité et résidence",
    aide: "La CIN est jointe à l’étape 1 ; le certificat de résidence arrive avec l’acte.",
    items: ["Certificat de résidence (fokontany)"],
  },
];
/* Situation du vendeur vis-à-vis du terrain — un titre est souvent resté au
   nom d'un parent décédé ; l'agence doit le savoir dès le dépôt. */
const OWNER_STATUSES = [
  "Propriétaire inscrit sur le document",
  "Indivision familiale (terrain hérité)",
  "Mandataire du propriétaire",
] as const;
/* Réponse « je n'ai rien » : exclusive — on ne peut pas avoir un titre foncier
   ET aucun document. */
const NO_DOC = "Aucun document pour l’instant";
const AREA_UNITS = ["m²", "are", "hectare"] as const;

function requestRef(): string {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const n = String(Math.floor(Math.random() * 90) + 10);
  return `VEN-${yy}${mm}${dd}-${n}`;
}

export default function Sell() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<SubmitResult | null>(null); // référence du dossier déposé
  const [sending, setSending] = useState(false);

  /* Le dépôt de vente ne demande QUE ce qui est utile pour recontacter le
     propriétaire et retrouver le terrain. Ni date de naissance, ni
     profession, ni compte bancaire, ni numéro de pièce d'identité : ces
     informations se donnent plus tard, à l'agence, quand le dossier devient
     sérieux — les exiger en ligne écarte des vendeurs parfaitement valables
     (titre au nom d'un parent décédé, absence de CIN à jour, terrain aux
     papiers coutumiers…). */
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    whatsapp: "Oui",
    email: "",
    ownerStatus: OWNER_STATUSES[0] as string,
    // La pièce d'identité est obligatoire, mais demandée à la DERNIÈRE étape
    // (le numéro saisi à la main a été supprimé : il se lit sur la pièce).
    // Pas de valeur par défaut : le type est un choix explicite.
    idType: "",
    title: "",
    area: "",
    areaUnit: "m²" as (typeof AREA_UNITS)[number],
    priceKnown: "Oui" as "Oui" | "Non",
    price: "",
    description: "",
    relief: "Plat" as (typeof RELIEFS)[number],
    access: "Route goudronnée",
    water: "Oui",
    electricity: "Oui",
    region: "Analamanga",
    district: "",
    commune: "",
    fokontany: "",
    directions: "",
    payment: "Les deux" as "Comptant" | "Facilité" | "Les deux",
    duration: "À discuter",
    noPhoto: false,
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  /* Superficie : on annonce couramment un terrain en ares ou en hectares
     (« 3 ha », « 50 ares »). Le vendeur saisit dans son unité, le dossier
     repart toujours en m² — plus d'erreur de virgule ou de zéro. */
  const areaInM2 = () => {
    const n = Number(form.area.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return 0;
    const factor =
      form.areaUnit === "are" ? 100 : form.areaUnit === "hectare" ? 10000 : 1;
    return Math.round(n * factor);
  };

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [idFiles, setIdFiles] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [video, setVideo] = useState<string[]>([]);
  const [docs, setDocs] = useState<string[]>([]);
  /* Objets File réellement envoyés au backend (multipart) : l'agence les
     retrouve dans le dossier VEN du back office, sans rappeler le vendeur. */
  const [idFileObjs, setIdFileObjs] = useState<File[]>([]);
  const [photoObjs, setPhotoObjs] = useState<File[]>([]);
  const [videoObjs, setVideoObjs] = useState<File[]>([]);
  const [docObjs, setDocObjs] = useState<File[]>([]);
  const [docTypes, setDocTypes] = useState<string[]>([]);
  /* Trois confirmations suffisent : exactitude / droit de vendre, contact et
     étude du dossier, information sur les données personnelles. */
  const [consents, setConsents] = useState({ c1: false, c2: false, c3: false });
  const toggleDocType = (d: string) =>
    setDocTypes((p) => {
      if (d === NO_DOC) return p.includes(NO_DOC) ? [] : [NO_DOC];
      const chosen = p.filter((x) => x !== NO_DOC);
      return chosen.includes(d)
        ? chosen.filter((x) => x !== d)
        : [...chosen, d];
    });

  const next = () => {
    setError(null);
    if (step === 0) {
      if (
        !form.firstName.trim() ||
        !form.lastName.trim() ||
        !form.phone.trim()
      ) {
        setError(
          "Veuillez compléter les informations du propriétaire avant de continuer.",
        );
        return;
      }
      const phone = phoneError(form.phone);
      const email = emailError(form.email);
      if (phone || email) {
        setError(phone ?? email);
        return;
      }
      // Pièce d'identité : obligatoire, et demandée dès cette première étape.
      if (!form.idType) {
        setError(
          "Indiquez le type de votre pièce d’identité (CIN, passeport ou carte de résident).",
        );
        return;
      }
      if (idFiles.length === 0) {
        setError("Joignez une photo de votre pièce d’identité pour continuer.");
        return;
      }
    }
    if (step === 1) {
      if (!form.title.trim() || !form.area || !form.description.trim()) {
        setError(
          "Renseignez au moins le titre, la superficie et la description du terrain.",
        );
        return;
      }
      if (!isPositiveNumber(form.area)) {
        setError(`La superficie doit être un nombre positif (en ${form.areaUnit}).`);
        return;
      }
      // Le prix n'est obligatoire que si le vendeur dit le connaître :
      // « je préfère que CA IMMO estime » est une réponse valable.
      if (form.priceKnown === "Oui" && !isPositiveNumber(form.price)) {
        setError("Indiquez votre prix, ou choisissez « Je préfère que CA IMMO estime ».");
        return;
      }
    }
    if (step === 2) {
      if (
        !form.commune.trim() ||
        !form.district.trim() ||
        !form.fokontany.trim()
      ) {
        setError(
          "Indiquez le district, la commune et le fokontany (quartier ou village) : c’est ainsi que le terrain est retrouvé sur place.",
        );
        return;
      }
      if (form.directions.trim().length < 10) {
        setError(
          "Ajoutez un repère d’accès (ex. « derrière la station Jovenna, à 200 m de l’EPP »).",
        );
        return;
      }
    }
    if (step === 3) {
      if (photos.length === 0 && !form.noPhoto) {
        setError(
          "Ajoutez au moins une photo, ou cochez « Je n’ai pas de photos » : l’agence passera en prendre lors de la visite.",
        );
        return;
      }
      // Le vendeur doit dire ce qu'il a — « aucun document » compris. La fiche
      // arrive ainsi toujours renseignée, sans écarter ceux qui n'ont rien.
      if (docTypes.length === 0) {
        setError(
          "Indiquez ce que vous avez comme documents — choisissez « Aucun document pour l’instant » si vous n’avez rien.",
        );
        return;
      }
    }
    setStep((s) => Math.min(s + 1, 4));
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
      ? !form.firstName.trim() ||
        !form.lastName.trim() ||
        !form.phone.trim() ||
        !form.idType ||
        idFiles.length === 0
      : step === 1
        ? !form.title.trim() ||
          !form.area.trim() ||
          !form.description.trim() ||
          (form.priceKnown === "Oui" && !form.price.trim())
        : step === 2
          ? !form.commune.trim() ||
            !form.district.trim() ||
            !form.fokontany.trim() ||
            form.directions.trim().length < 10
          : step === 3
            ? (photos.length === 0 && !form.noPhoto) || docTypes.length === 0
            : // Dernière étape : les trois confirmations.
              !consents.c1 || !consents.c2 || !consents.c3;

  const composeMessage = () => {
    const lines = [
      `— Propriétaire —`,
      `${form.firstName} ${form.lastName} — situation : ${form.ownerStatus}`,
      `WhatsApp : ${form.whatsapp}${form.email ? ` — Email : ${form.email}` : ""}`,
      `Pièce d’identité : ${form.idType}${idFiles.length ? ` (${idFiles.join(", ")})` : ""}`,
      ``,
      `— Terrain —`,
      `${form.title} — ${areaInM2()} m² (${form.area} ${form.areaUnit})`,
      form.priceKnown === "Oui"
        ? `Prix souhaité : ${form.price} Ar`
        : `Prix : estimation demandée à CA IMMO`,
      `Relief : ${form.relief} — Accès : ${form.access} — Eau : ${form.water} — Électricité : ${form.electricity}`,
      form.description.trim(),
      ``,
      `— Localisation —`,
      `${form.fokontany}, ${form.commune}, ${form.district} (${form.region})`,
      form.directions.trim() ? `Repère d’accès : ${form.directions.trim()}` : "",
      coords
        ? `Position GPS : ${coords.lat}, ${coords.lng}`
        : "Position GPS non indiquée (à relever lors de la visite)",
      ``,
      `— Documents —`,
      photos.length
        ? `Photos : ${photos.join(", ")}`
        : "Photos : non fournies — prises de vue à réaliser lors de la visite",
      video.length ? `Vidéo : ${video.join(", ")}` : "",
      `Types de documents : ${docTypes.join(", ") || "à préciser avec le propriétaire"}`,
      docs.length ? `Fichiers : ${docs.join(", ")}` : "",
      ``,
      `— Conditions —`,
      `Paiement accepté : ${form.payment}${form.payment !== "Comptant" ? ` (étalement : ${form.duration})` : ""}`,
    ].filter((l) => l !== "");
    return lines.join("\n");
  };

  const finalize = async (payload: LandFileSubmission) => {
    if (sending) return; // anti double-clic : un seul envoi à la fois
    setSending(true);
    setError(null);
    try {
      // Référence VEN-… générée par le backend ; fichiers envoyés en multipart.
      const result = await createLandFileRequest(payload, {
        photos: photoObjs,
        videos: videoObjs,
        documents: docObjs,
        idFiles: idFileObjs,
      });
      setDone(result);
    } catch {
      setError("L’envoi a échoué. Vérifiez votre connexion puis réessayez.");
    } finally {
      setSending(false);
    }
  };

  const submit = () => {
    setError(null);
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("Merci de renseigner le prénom et le nom du propriétaire.");
      return;
    }
    const phone = phoneError(form.phone);
    if (phone) {
      setError(phone);
      return;
    }
    const email = emailError(form.email);
    if (email) {
      setError(email);
      return;
    }
    if (!form.title.trim()) {
      setError(
        "Donnez un titre à votre annonce (ex. « Terrain clos à Ivato »).",
      );
      return;
    }
    if (!isPositiveNumber(form.area)) {
      setError(`Indiquez la surface du terrain en ${form.areaUnit} (ex. 650).`);
      return;
    }
    if (form.priceKnown === "Oui" && !isPositiveNumber(form.price)) {
      setError("Indiquez le prix souhaité en Ariary (ex. 120000000).");
      return;
    }
    if (!form.idType) {
      setError("Indiquez le type de votre pièce d’identité (CIN, passeport ou carte de résident).");
      setStep(4);
      return;
    }
    if (idFiles.length === 0) {
      setError(
        "Joignez une pièce d’identité (photo ou PDF) : c’est obligatoire pour déposer un terrain. Un souci pour l’envoyer ? Appelez-nous, nous enregistrons le dossier avec vous.",
      );
      setStep(4);
      return;
    }
    if (!consents.c1 || !consents.c2 || !consents.c3) {
      setError(
        "Merci de confirmer les trois points du dossier avant l’envoi.",
      );
      return;
    }
    finalize({
      fullName: `${form.firstName} ${form.lastName}`.trim(),
      phone: form.phone,
      email: form.email || undefined,
      whatsapp: form.whatsapp,
      ownerStatus: form.ownerStatus,
      estimateRequested: form.priceKnown === "Non" ? "Oui" : undefined,
      idType: form.idType || undefined,
      title: form.title,
      area: areaInM2(),
      price: Number(form.price.replace(",", ".")) || 0,
      description: form.description,
      relief: form.relief,
      access: form.access,
      water: form.water,
      electricity: form.electricity,
      region: form.region,
      district: form.district,
      commune: form.commune,
      fokontany: form.fokontany,
      directions: form.directions,
      lat: coords?.lat,
      lng: coords?.lng,
      payment: form.payment,
      // L'étalement n'est demandé que s'il peut accepter un paiement échelonné.
      paymentDuration:
        form.payment === "Comptant" ? "Non concerné (comptant)" : form.duration,
      // L'acompte et le rythme des versements se conviennent avec l'agence :
      // on l'écrit noir sur blanc plutôt que de laisser le champ vide.
      deposit: "À convenir avec l’agence",
      photoNames: photos,
      videoNames: video,
      docNames: docs,
      docTypes,
      idFileNames: idFiles,
      summary: composeMessage(),
    });
  };

  /* ————— Formulaire en 5 étapes ————— */
  return (
    <div className="font-display overflow-x-clip bg-brand-50">
      {/* — Hero navy (style Accueil / À propos) — */}
      <PageHero
        flat
        pill="Vendre avec CA IMMO"
        image="/media/caimmo/page-vendre.jpg"
        title={
          <>
            Proposez votre terrain en toute{" "}
            <span className="text-gold-500">confiance</span>
          </>
        }
        lead="Déposez votre dossier en ligne. Notre équipe étudie les informations avant toute publication et vous accompagne jusqu’à la vente."
      />

      {/* Bandeau bénéfices vendeur — bande bleu brume de la référence */}
      <section className="border-b border-navy-900/5 bg-mist">
        <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8">
          <div className="grid gap-y-4 py-5 sm:grid-cols-3 sm:divide-x sm:divide-navy-900/10">
            {[
              {
                icon: ShieldCheck,
                title: "Étude du dossier",
                text: "Un dossier fiable pour les acheteurs",
              },
              {
                icon: Camera,
                title: "Mise en valeur",
                text: "Une annonce professionnelle",
              },
              {
                icon: UserRound,
                title: "Conseiller dédié",
                text: "Un suivi à chaque étape",
              },
            ].map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="flex items-center justify-start gap-4 px-6 py-1 sm:justify-center"
              >
                <Icon
                  className="h-5 w-5 shrink-0 text-gold-700"
                  strokeWidth={2}
                />
                <div>
                  <strong className="block text-sm font-medium text-navy-900">
                    {title}
                  </strong>
                  <small className="text-xs font-normal text-navy-900/75">
                    {text}
                  </small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 pb-24">
        <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8">
          <div className="gap-10 lg:grid lg:grid-cols-[19rem_1fr] xl:gap-12">
            {/* Encart « Avant de commencer » — carte marine de la référence, à gauche */}
            <aside className="mb-10 lg:mb-0">
              <div className="lg:sticky lg:top-28">
                <div className="relative overflow-hidden rounded-2xl bg-navy-900 p-8 text-white shadow-xl shadow-navy-900/20">
                  <span
                    className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/5"
                    aria-hidden
                  />
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-gold-500 text-navy-900">
                    <LandPlot className="h-6 w-6" strokeWidth={2} />
                  </span>
                  <h2 className="mt-5 text-lg font-bold leading-snug">
                    Avant de commencer
                  </h2>
                  <p className="mt-3 text-xs font-normal leading-relaxed text-white/75">
                    Préparez les éléments suivants pour compléter votre dépôt
                    sans interruption.
                  </p>
                  <div className="mt-6 space-y-3 border-t border-white/10 pt-6">
                    {[
                      "Le nom du quartier ou du village (fokontany) et un repère sur place",
                      "Ce que vous savez du terrain : surface, limites, accès",
                      "Les papiers que vous avez, même anciens ou coutumiers",
                      "Une photo de votre pièce d’identité (demandée dès la première étape)",
                    ].map((t, i) => (
                      <p
                        key={t}
                        className="flex items-center gap-3 text-xs font-medium text-white/90"
                      >
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold text-gold-500">
                          {i + 1}
                        </span>
                        {t}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="mt-5 flex items-start gap-3.5 rounded-2xl border border-gold-500/30 bg-gold-500/10 px-6 py-5">
                  <FileCheck2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-gold-700" />
                  <div>
                    <strong className="text-xs font-semibold text-navy-900">
                      Aucune publication automatique
                    </strong>
                    <p className="mt-1 text-xs font-normal leading-relaxed text-navy-900/85">
                      Chaque dossier fait l’objet d’une étude de ses informations avant
                      d’être proposé aux acheteurs.
                    </p>
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

              <div className="mt-10 min-h-[26rem]">
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
                        Étape {step + 1} sur 5
                      </span>
                      <h2 className="mt-2 text-2xl font-bold text-navy-900 md:text-3xl">
                        {
                          [
                            "Informations du propriétaire",
                            "Informations du terrain",
                            "Localisez précisément le terrain",
                            "Photos et documents",
                            "Conditions de vente",
                          ][step]
                        }
                      </h2>
                      <p className="mt-2 text-sm font-normal text-navy-900/80">
                        {
                          [
                            "L’identité de la personne légalement habilitée à vendre le terrain.",
                            "Donnez aux acheteurs toutes les informations essentielles.",
                            "Ces informations permettent à notre équipe de retrouver le terrain.",
                            "Des visuels clairs et des justificatifs complets facilitent l’étude du dossier.",
                            "Précisez les modalités que vous êtes prêt(e) à accepter.",
                          ][step]
                        }
                      </p>
                      {error && (
                        <ErrorBanner className="mt-4">{error}</ErrorBanner>
                      )}
                    </div>

                    {/* — Étape 1 : Propriétaire — */}
                    {step === 0 && (
                      <div className="space-y-7">
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
                          <FormField label="Ce numéro est-il sur WhatsApp ?" required>
                            <Select
                              value={form.whatsapp}
                              onChange={(e) => set("whatsapp", e.target.value)}
                            >
                              <option>Oui</option>
                              <option>Non</option>
                            </Select>
                          </FormField>
                          <FormField label="Adresse email" className="sm:col-span-2">
                            <Input
                              type="email"
                              placeholder="vous@exemple.com"
                              value={form.email}
                              onChange={(e) => set("email", e.target.value)}
                            />
                          </FormField>
                        </div>

                        <div className="border-t border-navy-900/8 pt-7">
                          <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-navy-900/70">
                            Pièce d’identité du vendeur{" "}
                            <em className="not-italic text-gold-700">*</em>
                          </h3>
                          <div className="mt-5 grid gap-5 sm:grid-cols-2">
                            <FormField label="Type de pièce" required>
                              <Select
                                value={form.idType}
                                onChange={(e) => set("idType", e.target.value)}
                              >
                                <option value="">— Choisir le type de pièce —</option>
                                {ID_TYPES.map((t) => (
                                  <option key={t}>{t}</option>
                                ))}
                              </Select>
                            </FormField>
                          </div>
                          <div className="mt-5">
                            <UploadZone
                              title="Joindre la pièce d’identité *"
                              text="Un seul fichier suffit • PDF, JPG, PNG ou WebP • jusqu’à 4 fichiers"
                              accept=".pdf,.jpg,.jpeg,.png,.webp"
                              multiple
                              maxFiles={4}
                              maxMb={10}
                              onFiles={setIdFiles}
                              onPick={setIdFileObjs}
                              files={idFiles}
                            />
                          </div>
                          <p className="mt-4 flex items-start gap-2.5 text-xs font-normal leading-relaxed text-navy-900/80">
                            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />
                            <Link to="/confidentialite" className="font-semibold underline decoration-gold-500 underline-offset-2">Informations sur le traitement de vos données</Link>.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* — Étape 2 : Terrain — */}
                    {step === 1 && (
                      <div className="space-y-7">
                        <div className="grid gap-5 sm:grid-cols-2">
                          <FormField
                            label="Titre ou référence du terrain"
                            required
                          >
                            <Input
                              placeholder="Ex. Terrain résidentiel Ivato"
                              value={form.title}
                              onChange={(e) => set("title", e.target.value)}
                            />
                          </FormField>
                          {/* La surface et son unité forment une seule question :
                              les mettre côte à côte évite de faire descendre
                              l'unité sur la ligne suivante, où elle se lit comme
                              un champ indépendant. */}
                          <FormField
                            label="Superficie totale"
                            required
                            hint={
                              areaInM2() > 0
                                ? `Soit ${areaInM2().toLocaleString("fr-FR")} m² — c’est cette valeur qui sera enregistrée.`
                                : "« are » et « hectare » sont acceptés : la conversion en m² est automatique."
                            }
                          >
                            {/* Enveloppes explicites : Input et Select rendent
                                chacun un div « relative », donc la largeur doit
                                être portée par le parent, pas par le champ. */}
                            <div className="flex items-stretch gap-2">
                              <div className="min-w-0 flex-1">
                                <Input
                                  type="number"
                                  min={0}
                                  step="any"
                                  placeholder={
                                    form.areaUnit === "hectare"
                                      ? "Ex. 3"
                                      : form.areaUnit === "are"
                                        ? "Ex. 50"
                                        : "Ex. 650"
                                  }
                                  aria-label="Superficie totale"
                                  value={form.area}
                                  onChange={(e) => set("area", e.target.value)}
                                />
                              </div>
                              <div className="w-28 shrink-0">
                                <Select
                                  aria-label="Unité de la superficie"
                                  value={form.areaUnit}
                                  onChange={(e) =>
                                    set(
                                      "areaUnit",
                                      e.target.value as (typeof AREA_UNITS)[number],
                                    )
                                  }
                                >
                                  {AREA_UNITS.map((u) => (
                                    <option key={u}>{u}</option>
                                  ))}
                                </Select>
                              </div>
                            </div>
                          </FormField>
                          <FormField
                            label="Prix : le connaissez-vous déjà ?"
                            required
                            className="sm:col-span-2"
                            hint="Vous pouvez laisser CA IMMO estimer votre terrain si vous n’avez pas encore de prix en tête."
                          >
                            <ChoiceCards<"Oui" | "Non">
                              value={form.priceKnown}
                              onChange={(v) => set("priceKnown", v)}
                              options={[
                                {
                                  value: "Oui",
                                  label: "Oui, j’ai un prix en tête",
                                },
                                {
                                  value: "Non",
                                  label: "Je préfère que CA IMMO estime",
                                },
                              ]}
                            />
                          </FormField>
                          {form.priceKnown === "Oui" && (
                            <FormField
                              label="Prix total souhaité"
                              required
                              className="sm:col-span-2"
                              hint="En Ariary — vous pouvez écrire 120000000 (soit 120 millions Ar)."
                            >
                              <Input
                                type="number"
                                min={0}
                                placeholder="Ex. 120000000"
                                value={form.price}
                                onChange={(e) => set("price", e.target.value)}
                              />
                            </FormField>
                          )}
                          {/* Trois réponses courtes : elles tiennent sur une
                              seule ligne et occupent toute la largeur. Sans le
                              col-span, le bloc restait dans une demi-colonne et
                              « Pente forte » basculait seul à la ligne. */}
                          <FormField
                            label="Relief du terrain"
                            required
                            className="sm:col-span-2"
                          >
                            <ChoiceCards<(typeof RELIEFS)[number]>
                              value={form.relief}
                              onChange={(v) => set("relief", v)}
                              columns={3}
                              options={RELIEFS.map((r) => ({
                                value: r,
                                label: r,
                              }))}
                            />
                          </FormField>
                        </div>

                        {/* Même traitement que le relief : trois réponses,
                            même grille, même hauteur. Deux questions voisines
                            ne doivent pas se présenter l'une en ligne et
                            l'autre en colonne sans raison visible. */}
                        <FormField
                          label="Votre situation vis-à-vis du terrain"
                          required
                        >
                          <ChoiceCards<string>
                            value={form.ownerStatus}
                            onChange={(v) => set("ownerStatus", v)}
                            columns={3}
                            options={OWNER_STATUSES.map((s) => ({
                              value: s,
                              label: s,
                            }))}
                          />
                        </FormField>

                        <FormField
                          label="Description du terrain"
                          required
                          hint="Décrivez l’environnement, les atouts, les limites et l’usage idéal."
                        >
                          <Textarea
                            rows={5}
                            placeholder="Ex. Parcelle calme, bornée, à proximité de…"
                            value={form.description}
                            onChange={(e) => set("description", e.target.value)}
                          />
                        </FormField>

                        <div className="grid gap-5 sm:grid-cols-3">
                          <FormField label="Accessibilité" required>
                            <Select
                              value={form.access}
                              onChange={(e) => set("access", e.target.value)}
                            >
                              <option>Route goudronnée</option>
                              <option>Route pavée</option>
                              <option>Piste carrossable</option>
                              <option>Accès piéton</option>
                            </Select>
                          </FormField>
                          <FormField label="Eau disponible ?" required>
                            <Select
                              value={form.water}
                              onChange={(e) => set("water", e.target.value)}
                            >
                              <option>Oui</option>
                              <option>Non</option>
                              <option>À proximité</option>
                            </Select>
                          </FormField>
                          <FormField label="Électricité disponible ?" required>
                            <Select
                              value={form.electricity}
                              onChange={(e) =>
                                set("electricity", e.target.value)
                              }
                            >
                              <option>Oui</option>
                              <option>Non</option>
                              <option>À proximité</option>
                            </Select>
                          </FormField>
                        </div>
                      </div>
                    )}

                    {/* — Étape 3 : Localisation — */}
                    {step === 2 && (
                      <div className="space-y-7">
                        <div className="grid gap-5 sm:grid-cols-2">
                          <FormField label="Région" required>
                            <Select
                              value={form.region}
                              onChange={(e) => set("region", e.target.value)}
                            >
                              <option>Analamanga</option>
                              <option>Vakinankaratra</option>
                              <option>Itasy</option>
                              <option>Atsinanana</option>
                              <option>Boeny</option>
                              <option>Diana</option>
                              <option>Haute Matsiatra</option>
                              <option>Atsimo-Andrefana</option>
                              <option>Autre</option>
                            </Select>
                          </FormField>
                          <FormField label="District" required>
                            <Input
                              placeholder="Ex. Ambohidratrimo"
                              value={form.district}
                              onChange={(e) => set("district", e.target.value)}
                            />
                          </FormField>
                          <FormField label="Commune" required>
                            <Input
                              placeholder="Ex. Ivato"
                              value={form.commune}
                              onChange={(e) => set("commune", e.target.value)}
                            />
                          </FormField>
                          <FormField
                            label="Quartier(fokontany)"
                            required
                          >
                            <Input
                              placeholder="Ex. Antanetibe"
                              value={form.fokontany}
                              onChange={(e) => set("fokontany", e.target.value)}
                            />
                          </FormField>
                        </div>

                        {/* À Madagascar, un terrain se retrouve par ses repères
                            (« à côté de l'école EPP », « derrière la station
                            Jovenna »), pas par ses coordonnées GPS. Le repère
                            écrit est donc obligatoire ; la carte reste un
                            bonus pour ceux qui savent s'en servir. */}
                        <FormField
                          label="Repère d’accès"
                          required
                          hint="Comment trouve-t-on le terrain sur place ? Un point connu suffit."
                        >
                          <Textarea
                            rows={3}
                            placeholder="Ex. Quartier Ambohipo, à 200 m de l’école EPP derrière la station Jovenna, 2e portail bleu après le canal…"
                            value={form.directions}
                            onChange={(e) => set("directions", e.target.value)}
                          />
                        </FormField>

                        <FormField
                          label="Position sur la carte"
                          hint="Utile si vous savez placer le repère. Sinon, notre équipe relève la position lors de la visite du terrain."
                        >
                          <GeoMapPicker
                            lat={coords?.lat}
                            lng={coords?.lng}
                            onChange={(lat, lng) => setCoords({ lat, lng })}
                          />
                        </FormField>

                        {coords && (
                          <div className="flex items-center gap-4 rounded-2xl bg-gold-600/5 px-6 py-4">
                            <MapPin className="h-5 w-5 shrink-0 text-green-700" />
                            <div>
                              <strong className="block text-sm font-medium text-navy-900">
                                Position GPS enregistrée :{" "}
                                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                              </strong>
                              <small className="text-xs font-normal text-navy-900/80">
                                Vous pouvez affiner en zoomant puis en déplaçant
                                le repère.
                              </small>
                            </div>
                            <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-green-700" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* — Étape 4 : Médias & documents — */}
                    {step === 3 && (
                      <div className="space-y-8">
                        <div>
                          <h3 className="flex items-center gap-2.5 text-sm font-medium text-navy-900">
                            <Camera className="h-4.5 w-4.5 text-gold-700" />
                            Photos du terrain{" "}
                            <em className="not-italic text-gold-700">*</em>
                          </h3>
                          <p className="mt-1.5 text-xs font-normal text-navy-900/80">
                            Une photo prise au téléphone suffit : vue générale, accès et limites du terrain.
                          </p>
                          <label className="mt-4 flex cursor-pointer items-start gap-3.5 rounded-2xl border border-navy-900/8 bg-white px-5 py-4">
                            <input
                              type="checkbox"
                              className="peer sr-only"
                              checked={form.noPhoto}
                              onChange={(e) =>
                                set("noPhoto", e.target.checked)
                              }
                            />
                            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border border-navy-900/25 transition peer-checked:border-gold-500 peer-checked:bg-gold-500 peer-focus-visible:ring-2 peer-focus-visible:ring-navy-900/60 peer-focus-visible:ring-offset-2">
                              <Check
                                className={`h-3.5 w-3.5 ${form.noPhoto ? "text-navy-900" : "text-transparent"}`}
                              />
                            </span>
                            <span className="text-xs font-normal leading-relaxed text-navy-900/85">
                              Je n’ai pas de photos pour le moment
                            </span>
                          </label>
                          <div className="mt-4">
                            <UploadZone
                              title="Ajouter les photos"
                              text="JPG, PNG ou WebP • jusqu’à 12 photos"
                              accept=".jpg,.jpeg,.png,.webp"
                              multiple
                              maxFiles={12}
                              maxMb={5}
                              onFiles={setPhotos}
                              onPick={setPhotoObjs}
                              files={photos}
                            />
                          </div>
                        </div>

                        <div>
                          <h3 className="flex items-center gap-2.5 text-sm font-medium text-navy-900">
                            <PlayCircle className="h-4.5 w-4.5 text-gold-700" />
                            Vidéo du terrain
                          </h3>
                          <p className="mt-1.5 text-xs font-normal text-navy-900/80">
                            Une courte vidéo aide les acheteurs à mieux visualiser le terrain.
                          </p>
                          <div className="mt-4">
                            <UploadZone
                              title="Ajouter une vidéo"
                              text="MP4, MOV ou WebM • jusqu’à 2 vidéos"
                              accept=".mp4,.mov,.webm"
                              multiple
                              maxFiles={2}
                              maxMb={100}
                              onFiles={setVideo}
                              onPick={setVideoObjs}
                              files={video}
                            />
                          </div>
                        </div>

                        <div>
                          <h3 className="flex items-center gap-2.5 text-sm font-medium text-navy-900">
                            <FileText className="h-4.5 w-4.5 text-gold-700" />
                            Documents fonciers{" "}
                            <em className="not-italic text-gold-700">*</em>
                          </h3>
                          <p className="mt-1.5 text-xs font-normal leading-relaxed text-navy-900/80">
                            Cochez ce que vous avez déjà. Un seul document suffit
                            pour envoyer le dossier : le reste se complète avec
                            votre conseiller.
                          </p>

                          {/* Le téléversement est FACULTATIF : ce qui est obligatoire,
                              c'est de dire ce qu'on a. Sans cette précision, le
                              vendeur croit devoir scanner ses papiers pour envoyer
                              son dossier — et abandonne. */}
                          <p className="mt-3 flex items-start gap-2.5 rounded-2xl bg-gold-500/10 px-5 py-4 text-xs font-normal leading-relaxed text-navy-900/85">
                            <Info className="mt-0.5 h-4 w-4 shrink-0 text-gold-700" />
                            <span>
                              <strong className="font-semibold">Joindre les fichiers est facultatif.</strong>{" "}
                              Si vous les avez sous la main, ajoutez-les
                              maintenant ; sinon, votre conseiller les
                              récupérera lors de la visite du terrain. Votre
                              dossier est étudié dans les deux cas.
                            </span>
                          </p>

                          <div className="mt-5 space-y-5">
                            {DOC_GROUPS.map((groupe) => (
                              <div key={groupe.titre}>
                                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-navy-900/55">
                                  {groupe.titre}
                                </p>
                                <p className="mt-1 text-xs font-normal text-navy-900/70">
                                  {groupe.aide}
                                </p>
                                <div className="mt-3 space-y-2.5">
                                  {groupe.items.map((d) => {
                                    const active = docTypes.includes(d);
                                    return (
                                      <label
                                        key={d}
                                        className={`flex cursor-pointer items-center gap-3.5 rounded-2xl border px-5 py-3.5 transition ${
                                          active
                                            ? "border-gold-500/60 bg-gold-500/10"
                                            : "border-navy-900/8 bg-white hover:border-navy-900/20"
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          className="peer sr-only"
                                          checked={active}
                                          onChange={() => toggleDocType(d)}
                                        />
                                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md border border-navy-900/25 transition peer-checked:border-gold-500 peer-checked:bg-gold-500 peer-focus-visible:ring-2 peer-focus-visible:ring-navy-900/60 peer-focus-visible:ring-offset-2">
                                          <Check
                                            className={`h-3.5 w-3.5 ${active ? "text-navy-900" : "text-transparent"}`}
                                          />
                                        </span>
                                        <span className="text-xs font-normal text-navy-900">
                                          {d}
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}

                            {/* Case à part, exclusive : ce n'est pas un document,
                                c'est une situation (terrain sans titre, papiers
                                coutumiers). Même logique que « Je n'ai pas de
                                photos » à l'étape précédente. */}
                            <label
                              className={`flex cursor-pointer items-start gap-3.5 rounded-2xl border px-5 py-4 transition ${
                                docTypes.includes(NO_DOC)
                                  ? "border-gold-500/60 bg-gold-500/10"
                                  : "border-navy-900/8 bg-white hover:border-navy-900/20"
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="peer sr-only"
                                checked={docTypes.includes(NO_DOC)}
                                onChange={() => toggleDocType(NO_DOC)}
                              />
                              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border border-navy-900/25 transition peer-checked:border-gold-500 peer-checked:bg-gold-500 peer-focus-visible:ring-2 peer-focus-visible:ring-navy-900/60 peer-focus-visible:ring-offset-2">
                                <Check
                                  className={`h-3.5 w-3.5 ${docTypes.includes(NO_DOC) ? "text-navy-900" : "text-transparent"}`}
                                />
                              </span>
                              <span className="text-xs font-normal leading-relaxed text-navy-900/85">
                                <strong className="font-semibold text-navy-900">
                                  Je n’ai encore aucun de ces documents.
                                </strong>{" "}
                                De nombreuses parcelles ne sont pas encore
                                titrées : CA IMMO vous accompagne dans les
                                démarches de régularisation.
                              </span>
                            </label>
                          </div>
                          <div className="mt-4">
                            <UploadZone
                              title="Téléverser les documents"
                              text="PDF, JPG, PNG, WebP, DOC ou DOCX • jusqu’à 12 fichiers"
                              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                              multiple
                              maxFiles={12}
                              maxMb={10}
                              onFiles={setDocs}
                              onPick={setDocObjs}
                              files={docs}
                            />
                          </div>
                          {/* Le vendeur a coché des documents mais n'a joint aucun
                              fichier : on le lui dit sans le bloquer, et on nomme
                              la suite (l'agent les récupère à la visite). */}
                          {docTypes.length > 0 &&
                            !docTypes.includes(NO_DOC) &&
                            docs.length === 0 && (
                              <p className="mt-3 text-xs font-normal leading-relaxed text-navy-900/70">
                                Vous n’avez rien joint : votre conseiller
                                récupérera ces pièces lors de la visite du
                                terrain, et elles seront versées au dossier.
                              </p>
                            )}
                        </div>

                        <p className="flex items-start gap-2.5 text-xs font-normal leading-relaxed text-navy-900/80">
                          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />
                          Les fichiers déposés sont associés à votre dossier vendeur. Consultez les <Link to="/confidentialite" className="font-semibold underline decoration-gold-500 underline-offset-2">informations sur leur traitement</Link>.
                        </p>
                      </div>
                    )}

                    {/* — Étape 5 : Conditions — */}
                    {step === 4 && (
                      <div className="space-y-7">
                        <FormField label="Mode de paiement accepté" required>
                          <ChoiceCards<"Comptant" | "Facilité" | "Les deux">
                            value={form.payment}
                            onChange={(v) => set("payment", v)}
                            columns={3}
                            options={[
                              {
                                value: "Comptant",
                                label: "Comptant",
                                description: "Paiement en une fois",
                                icon: Banknote,
                              },
                              {
                                value: "Facilité",
                                label: "Facilité",
                                description: "Paiement échelonné",
                                icon: WalletCards,
                              },
                              {
                                value: "Les deux",
                                label: "Les deux",
                                description: "Comptant ou facilité",
                                icon: CheckCircle2,
                              },
                            ]}
                          />
                        </FormField>

                        {form.payment !== "Comptant" && (
                          <FormField
                            label="Sur quelle durée acceptez-vous un étalement ?"
                            required
                            hint="« À discuter » est une réponse parfaitement acceptable : le conseiller en parle avec vous."
                          >
                            <Select
                              value={form.duration}
                              onChange={(e) => set("duration", e.target.value)}
                            >
                              <option>À discuter</option>
                              <option>0–4 mois</option>
                              <option>4–6 mois</option>
                              <option>6–10 mois</option>
                              <option>10–12 mois</option>
                              <option>Plus de 12 mois</option>
                            </Select>
                          </FormField>
                        )}

                        {/* Résumé */}
                        <div className="rounded-2xl border border-navy-900/8 bg-white px-6 py-5">
                          <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-navy-900/70">
                            Avant d’envoyer votre dossier
                          </h3>
                          <div className="mt-4 grid gap-4 sm:grid-cols-3">
                            <div className="flex items-center gap-3 text-sm">
                              <LandPlot className="h-4 w-4 shrink-0 text-gold-700" />
                              <div>
                                <small className="block text-xs text-navy-900/70">
                                  Terrain
                                </small>
                                <strong className="truncate text-xs font-medium text-navy-900">
                                  {form.title || "—"}
                                </strong>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <MapPin className="h-4 w-4 shrink-0 text-gold-700" />
                              <div>
                                <small className="block text-xs text-navy-900/70">
                                  Localisation
                                </small>
                                <strong className="truncate text-xs font-medium text-navy-900">
                                  {form.commune
                                    ? `${form.commune}, ${form.region}`
                                    : form.region}
                                </strong>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <Banknote className="h-4 w-4 shrink-0 text-gold-700" />
                              <div>
                                <small className="block text-xs text-navy-900/70">
                                  Prix souhaité
                                </small>
                                <strong className="truncate text-xs font-medium text-navy-900">
                                  {form.priceKnown === "Non"
                                    ? "Estimation par CA IMMO"
                                    : form.price
                                      ? `${form.price} Ar`
                                      : "—"}
                                </strong>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Consentements */}
                        <div className="space-y-3.5">
                          {[
                            {
                              key: "c1" as const,
                              text: "Les informations fournies sont exactes et vous êtes autorisé(e) à proposer ce terrain.",
                            },
                            {
                              key: "c2" as const,
                              text: "Vous acceptez que notre équipe vous contacte pour étudier le dossier, et vous comprenez que le terrain ne sera proposé aux acheteurs qu’après étude.",
                            },
                            {
                              key: "c3" as const,
                              text: <>J’ai pris connaissance des <Link to="/confidentialite" onClick={(event) => event.stopPropagation()} className="font-semibold underline decoration-gold-500 underline-offset-2">informations sur les données personnelles</Link>.</>,
                            },
                          ].map(({ key, text }) => (
                            <label
                              key={key}
                              className="flex cursor-pointer items-start gap-3.5"
                            >
                              <input
                                type="checkbox"
                                className="peer sr-only"
                                checked={consents[key]}
                                onChange={(e) =>
                                  setConsents((c) => ({
                                    ...c,
                                    [key]: e.target.checked,
                                  }))
                                }
                              />
                              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border border-navy-900/25 transition peer-checked:border-gold-500 peer-checked:bg-gold-500 peer-focus-visible:ring-2 peer-focus-visible:ring-navy-900/60 peer-focus-visible:ring-offset-2">
                                <Check
                                  className={`h-3.5 w-3.5 ${consents[key] ? "text-navy-900" : "text-transparent"}`}
                                />
                              </span>
                              <p className="text-xs font-normal leading-relaxed text-navy-900/85">
                                {text}
                              </p>
                            </label>
                          ))}
                        </div>

                        <div className="flex items-center gap-3.5 rounded-2xl bg-navy-900/5/60 px-6 py-4">
                          <Clock3 className="h-4.5 w-4.5 shrink-0 text-navy-900/80" />
                          <div>
                            <small className="block text-xs font-semibold uppercase tracking-[0.18em] text-navy-900/65">
                              Statut après soumission
                            </small>
                            <strong className="text-sm font-medium text-navy-900">
                              En attente de prise en charge
                            </strong>
                          </div>
                        </div>
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
                {step < 4 ? (
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
                    disabled={sending || stepIncomplete}
                    className="btn-gold disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Soumettre mon terrain <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* — Confirmation : le dossier est déposé, l'équipe recontacte le vendeur — */}
      <Modal open={done !== null} onClose={() => setDone(null)} size="sm">
        <RequestSuccess
          reference={done?.ref ?? ""}
          title={done?.updated ? "Dossier mis à jour" : "Dossier déposé"}
          text={
            done?.message ??
            "Notre équipe étudie votre terrain et vous recontacte pour la suite des démarches."
          }
          onClose={() => setDone(null)}
        />
      </Modal>
    </div>
  );
}
