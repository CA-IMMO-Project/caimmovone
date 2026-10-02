/* Vignette d'une photo de réalisation (URL servie par le backend). */
export function RealisationThumb({ url, className = '' }: { url: string; className?: string }) {
  return <img src={url} alt="" className={`object-cover ${className}`} referrerPolicy="no-referrer" />;
}
