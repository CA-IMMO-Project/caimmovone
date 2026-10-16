/**
 * Tranches d'apport — vocabulaire partagé entre le site public et le back office.
 *
 * Le site propose ces cinq tranches au client (« Apport initial disponible ») ;
 * le back office doit proposer exactement les mêmes, sinon un conseiller ne
 * pourrait pas corriger la réponse d'un client sans changer de libellé.
 */
export const DEPOSIT_BANDS = [
  'Moins de 20 %',
  '20 à 40 %',
  '40 à 60 %',
  'Plus de 60 %',
  'Aucun apport pour l’instant',
] as const;
