import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  Clapperboard,
  Clock3,
  Facebook,
  Info,
  Play,
  X,
} from "lucide-react";
import { FB_URL } from "../../lib/contact";
import { Eyebrow } from "../../shared/ui";

type Reel = {
  id: string;
  title: string;
  category: string;
  description: string;
  duration: string;
  src: string;
  poster: string;
  publication: string;
};

// Publications de la page officielle CA IMMO. Vidéos locales optimisées :
// aucun iframe Facebook, cookie tiers ni téléchargement avant le clic.
const REELS: Reel[] = [
  {
    id: "laceo-visite",
    title: "Une visite au Domaine Lacéo",
    category: "Visite guidée",
    description:
      "Notre équipe vous fait découvrir les parcelles et leur cadre au bord du lac.",
    duration: "1:38",
    src: "/media/caimmo/reels/laceo-visite.mp4",
    poster: "/media/caimmo/reels/laceo-visite.jpg",
    publication: "https://www.facebook.com/reel/928773469508512/",
  },
  {
    id: "iavoloha-drone",
    title: "Iavoloha Pagode vu du ciel",
    category: "Vue aérienne",
    description:
      "Un autre point de vue sur une parcelle et son environnement résidentiel.",
    duration: "1:17",
    src: "/media/caimmo/reels/iavoloha-drone.mp4",
    poster: "/media/caimmo/reels/iavoloha-drone.jpg",
    publication: "https://www.facebook.com/reel/1087224946508736/",
  },
  {
    id: "laceo-acces",
    title: "En route vers Domaine Lacéo",
    category: "Accès & environnement",
    description:
      "Suivez les accès à Vontovorona, entre quartier, pinède et panorama sur le lac.",
    duration: "1:40",
    src: "/media/caimmo/reels/laceo-acces.mp4",
    poster: "/media/caimmo/reels/laceo-acces.jpg",
    publication: "https://www.facebook.com/reel/1456242408745482/",
  },
];

function ReelPlayer({ reel, onClose }: { reel: Reel; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    const video = videoRef.current;
    const previousOverflow = document.body.style.overflow;
    if (dialog && !dialog.open) dialog.showModal();
    document.body.style.overflow = "hidden";
    // Le lecteur est monté uniquement après le clic. Relancer ici couvre
    // également la répétition des effets en React StrictMode.
    void video?.play().catch(() => {
      // Si le navigateur exige une autre action, les contrôles restent disponibles.
    });

    return () => {
      // Fermer ou quitter la page arrête également le son.
      video?.pause();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const close = () => {
    videoRef.current?.pause();
    dialogRef.current?.close();
  };

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby="reel-player-title"
      aria-describedby="reel-player-notice"
      onClose={onClose}
      onCancel={() => videoRef.current?.pause()}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      className="m-auto max-h-[92dvh] w-[calc(100%-2rem)] max-w-5xl overflow-y-auto rounded-2xl border border-white/15 bg-navy-950 p-0 font-display text-white shadow-2xl backdrop:bg-navy-950/85 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[.16em] text-gold-400">
            Reel CA IMMO · {reel.duration}
          </p>
          <h3 id="reel-player-title" className="text-base font-bold sm:text-lg">
            {reel.title}
          </h3>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Fermer la vidéo"
          className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full border border-white/20 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <video
        ref={videoRef}
        controls
        playsInline
        autoPlay
        preload="none"
        poster={reel.poster}
        aria-label={reel.title}
        onError={() => setFailed(true)}
        className="block aspect-video max-h-[62dvh] w-full bg-black object-contain"
      >
        <source src={reel.src} type="video/mp4" onError={() => setFailed(true)} />
        Votre navigateur ne prend pas en charge la lecture de cette vidéo.
      </video>

      <div className="space-y-3 px-5 py-4 sm:px-6">
        {failed && (
          <p role="alert" className="text-sm text-gold-400">
            La vidéo ne peut pas être lue ici. Vous pouvez regarder la publication
            originale sur Facebook ci-dessous.
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-white/70">{reel.description}</p>
          <a
            href={reel.publication}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-2 text-xs font-semibold text-gold-400 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-500"
          >
            Publication Facebook
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
        <p id="reel-player-notice" className="text-[11px] leading-relaxed text-white/60">
          Vidéo issue de nos publications Facebook. Les promotions, prix et
          disponibilités mentionnés peuvent avoir évolué : contactez notre équipe
          pour connaître les conditions actuelles.
        </p>
      </div>
    </dialog>,
    document.body,
  );
}

export default function HomeReels() {
  const [selected, setSelected] = useState<Reel | null>(null);
  const reduceMotion = useReducedMotion();

  return (
    <>
      <section
        id="reels-ca-immo"
        aria-labelledby="reels-heading"
        className="relative scroll-mt-24 overflow-hidden bg-navy-900 py-16 text-white md:py-20"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 -top-52 h-[420px] w-[420px] rounded-full border-[60px] border-gold-500/5"
        />
        <div className="relative mx-auto max-w-full px-4 sm:px-6 lg:px-8">
          <div className="mb-9 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <Eyebrow light>
                <Clapperboard className="h-4 w-4" aria-hidden="true" />
                Les reels CA IMMO
              </Eyebrow>
              <h2 id="reels-heading" className="mb-4 text-2xl font-bold leading-tight md:text-3xl">
                Sur le terrain, <span className="text-gold-500">en vidéo.</span>
              </h2>
              <p className="max-w-xl text-sm leading-relaxed text-white/75">
                Des visites, des vues aériennes et des repères pour découvrir nos
                projets autrement. Des images réelles, tournées sur place.
              </p>
            </div>
            <a
              href={`${FB_URL}&sk=reels_tab`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-3 text-xs font-semibold transition hover:border-gold-500 hover:text-gold-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-500"
            >
              <Facebook className="h-4 w-4" aria-hidden="true" />
              Tous nos reels
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {REELS.map((reel, index) => (
              <motion.article
                key={reel.id}
                initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white text-navy-900 shadow-xl shadow-black/10"
              >
                <button
                  type="button"
                  onClick={() => setSelected(reel)}
                  aria-label={`Lire le reel : ${reel.title}`}
                  aria-haspopup="dialog"
                  className="relative block aspect-video w-full cursor-pointer overflow-hidden bg-navy-800 focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-gold-500"
                >
                  <img
                    src={reel.poster}
                    alt=""
                    width={1280}
                    height={720}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-105"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-navy-950/55 via-transparent to-navy-950/10" />
                  <span className="absolute left-3 top-3 rounded-full bg-navy-950/80 px-3 py-1.5 text-[10px] font-semibold text-white">
                    {reel.category}
                  </span>
                  <span className="absolute inset-0 grid place-items-center">
                    <span className="grid h-14 w-14 place-items-center rounded-full border border-white/40 bg-white/95 text-navy-900 shadow-lg transition-colors group-hover:bg-gold-500">
                      <Play className="ml-0.5 h-5 w-5 fill-current" aria-hidden="true" />
                    </span>
                  </span>
                  <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-md bg-navy-950/80 px-2 py-1 text-[11px] font-medium text-white">
                    <Clock3 className="h-3 w-3" aria-hidden="true" />
                    {reel.duration}
                  </span>
                </button>
                <div className="flex flex-1 flex-col p-5 lg:p-6">
                  <h3 className="mb-2 text-base font-bold leading-snug">{reel.title}</h3>
                  <p className="mb-5 text-xs leading-relaxed text-slate-600">
                    {reel.description}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelected(reel)}
                    aria-label={`Regarder la vidéo : ${reel.title}`}
                    aria-haspopup="dialog"
                    className="mt-auto inline-flex w-fit cursor-pointer items-center gap-2 text-xs font-bold text-gold-700 hover:text-navy-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-700"
                  >
                    Regarder la vidéo
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </motion.article>
            ))}
          </div>

          <p className="mt-7 flex max-w-3xl items-start gap-2 text-[11px] leading-relaxed text-white/65">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Vidéos issues de nos publications Facebook. Certaines peuvent évoquer
            des promotions passées : notre équipe vous confirme les prix et les
            disponibilités actuels.
          </p>
        </div>
      </section>
      {selected && (
        <ReelPlayer key={selected.id} reel={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
