import { Link } from 'react-router-dom';
import { PageHero } from '../../shared/ui';
import { PHONE_1, PHONE_1_TEL, PHONE_2, PHONE_2_TEL } from '../../lib/contact';

const sections = [
  {
    title: 'Quelles informations peuvent être recueillies ? ',
    body: 'Selon le formulaire utilisé, le site peut recevoir votre nom, votre téléphone, une adresse e-mail facultative, votre message, vos critères de recherche ou de visite et les informations que vous fournissez sur un terrain. Le formulaire vendeur demande également des renseignements d’identité et peut recevoir des pièces justificatives, des photos, des vidéos et des documents fonciers.',
  },
  {
    title: 'Pourquoi ces informations sont-elles demandées ?',
    body: 'Les formulaires les utilisent pour répondre à votre message, organiser une visite, traiter une demande d’achat ou de recherche, ou étudier un dossier de terrain proposé à la vente. Ne transmettez que les renseignements nécessaires à votre demande et n’inscrivez pas de données bancaires confidentielles dans un champ de texte libre.',
  },
  {
    title: 'Où sont-elles envoyées et qui peut y accéder ?',
    body: 'Les demandes soumises par le site sont envoyées à son API puis affichées dans le back office CA IMMO. Les fichiers transmis avec un dossier vendeur sont gérés séparément des ressources publiques et consultés au moyen des fonctions d’administration prévues par l’application. La liste complète des personnes autorisées, des prestataires d’hébergement et des autres destinataires doit être confirmée par CA IMMO.',
  },
  {
    title: 'Combien de temps sont-elles conservées ?',
    body: 'Aucune durée de conservation ni règle d’effacement n’est documentée dans le dépôt consulté. CA IMMO doit définir et publier ces durées, notamment pour les pièces d’identité et les documents fonciers, avant de présenter cette page comme une notice juridique complète.',
  },
  {
    title: 'Services externes chargés par le site',
    body: 'Le site référence les polices Google Fonts et certaines images hébergées par Unsplash. Leur chargement peut établir une connexion avec ces services et leur transmettre des données techniques de connexion. Le code frontend consulté ne contient pas de script d’analytique ou de publicité identifié ; la configuration de l’hébergement et les éventuels services ajoutés en production restent à vérifier.',
  },
];

export default function PrivacyInfo() {
  return (
    <div className="bg-white font-display">
      <PageHero
        flat
        pill="Informations sur les données personnelles"
        title={<>Vos données et votre <span className="text-gold-500">confidentialité</span></>}
        lead="Cette page décrit les traitements visibles dans les formulaires et le code du site. Elle ne remplace pas une notice juridique complète validée par l’entreprise."
      />

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 md:py-16">
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-relaxed text-amber-950" role="note">
          <strong>À compléter avant publication juridique :</strong> la dénomination légale complète du responsable, ses coordonnées dédiées, les bases et modalités de traitement, la liste des prestataires et destinataires, ainsi que les durées de conservation ne sont pas établies dans le code audité. Cette information provisoire ne doit pas être présentée comme une validation de conformité.
        </div>

        <section className="mt-10 border-b border-gray-200 pb-8">
          <h2 className="text-xl font-bold text-navy-900">Responsable du traitement</h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-700">
            Le site affiche le nom commercial « CA IMMO ». La dénomination juridique complète et l’adresse du responsable du traitement doivent être précisées par l’entreprise. Pour une question sur une demande envoyée depuis le site, vous pouvez contacter CA IMMO par la <Link to="/contact" className="font-semibold text-navy-900 underline decoration-gold-500 underline-offset-4">page Contact</Link> ou par téléphone :{' '}
            <a href={PHONE_1_TEL} className="font-semibold text-navy-900 underline decoration-gold-500 underline-offset-4">{PHONE_1}</a>{' '}et{' '}
            <a href={PHONE_2_TEL} className="font-semibold text-navy-900 underline decoration-gold-500 underline-offset-4">{PHONE_2}</a>.
          </p>
        </section>

        {sections.map(({ title, body }) => (
          <section key={title} className="border-b border-gray-200 py-8">
            <h2 className="text-xl font-bold text-navy-900">{title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-700">{body}</p>
          </section>
        ))}

        <p className="mt-8 text-xs leading-relaxed text-gray-600">
          Dernière mise à jour technique : 8 octobre 2026. Les mentions ci-dessus décrivent le fonctionnement identifié dans le dépôt source ; elles doivent être vérifiées par CA IMMO et adaptées aux exigences applicables avant déploiement.
        </p>
      </main>
    </div>
  );
}
