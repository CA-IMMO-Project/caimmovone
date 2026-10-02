import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState, PageHero } from './ui';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="font-display overflow-hidden bg-brand-50">
      <PageHero
        pill="Erreur 404"
        title={
          <>
            Cette page n’existe <span className="text-gold-500">plus</span>
          </>
        }
        lead="Le lien est peut-être obsolète ou la page a été déplacée. Notre équipe reste joignable pour toute question."
      />
      <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:py-20">
        <EmptyState
          icon={Compass}
          title="Page introuvable"
          text="Repartez de l’accueil ou parcourez nos terrains à vendre à Madagascar."
          action="Retour à l’accueil"
          onAction={() => navigate('/')}
        >
          <Link to="/terrains" className="btn-gold mt-5">
            Voir les terrains
          </Link>
        </EmptyState>
      </section>
    </div>
  );
}
