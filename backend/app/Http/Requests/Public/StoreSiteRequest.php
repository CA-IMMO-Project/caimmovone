<?php

namespace App\Http\Requests\Public;

use App\Support\Phone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreSiteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['phone' => Phone::normalize($this->input('phone'))]);
    }

    public function rules(): array
    {
        return [
            'kind' => 'required|in:interet,visite,recherche,vente',
            'fullName' => 'required|string|max:150',
            'phone' => 'required|string|max:40',
            'email' => 'nullable|email|max:160',
            'message' => 'nullable|string|max:5000',
            'landId' => 'nullable|string|max:64',
            'lotId' => 'nullable|string|max:64',
            /* La profession est demandée — et donc exigée — uniquement pour un
               paiement échelonné : c'est ce que le formulaire affiche, le
               serveur applique la même règle. */
            'profession' => 'required_if:paymentMode,Facilité|nullable|string|max:120',
            'age' => 'nullable|integer|min:1|max:120',
            'projectName' => 'nullable|string|max:200',
            'duration' => 'nullable|string|max:80',
            'downPaymentAmount' => 'nullable|string|max:80',
            'visitDate' => 'nullable|string|max:40',
            'visitTime' => 'nullable|string|max:40',
            'birthDate' => 'nullable|string|max:40',
            'callTime' => 'nullable|string|max:80',

            /* ------------------------------------------------------------------
               Demande d'achat (« Je suis intéressé »).
               Les informations dont l'agence a besoin pour rappeler utilement
               le client sont OBLIGATOIRES côté serveur, et plus seulement côté
               navigateur : une demande incomplète est refusée (422) au lieu
               d'être enregistrée avec des champs vides, comme le permettait la
               version précédente. Les autres types de demande (visite,
               recherche, vente) gardent leurs règles propres.
               ------------------------------------------------------------------ */
            'goal' => 'required_if:kind,interet|nullable|string|max:120',
            'deadline' => 'required_if:kind,interet|nullable|string|max:120',
            /* Budget : le visiteur choisit une réponse construite sur le prix
               affiché (« Le prix affiché me convient », « J'aimerais un peu
               moins »…) — libellé court, donc 120 caractères suffisent. */
            'budget' => 'required_if:kind,interet|nullable|string|max:120',
            /* « Parlez-nous de votre projet » est FACULTATIF : décrire son
               projet par écrit n'est pas la façon la plus naturelle de faire à
               Madagascar, le conseiller appelle. Le champ reste accepté s'il
               est rempli. */
            'projectDescription' => 'nullable|string|max:5000',
            'paymentMode' => 'required_if:kind,interet|nullable|string|max:80',
            'nationality' => 'required_if:kind,interet|nullable|string|max:80',
            'bankAccount' => 'required_if:kind,interet|nullable|in:Oui,Non',

            /* — Bornes numériques de la fourchette de budget — */
            'budgetMin' => 'nullable|numeric|min:0',
            'budgetMax' => 'nullable|numeric|min:0',
            'downPaymentRange' => 'nullable|string|max:80',
            'whatsapp' => 'nullable|in:Oui,Non',
            'countryOther' => 'nullable|string|max:80',
        ];
    }

    /** Règles conditionnelles impossibles à exprimer avec les règles natives. */
    public function after(): array
    {
        return [function (Validator $validator) {
            if (! Phone::isValid((string) $this->input('phone'))) {
                $validator->errors()->add('phone', Phone::message());
            }

            // Paiement échelonné : il faut au minimum la tranche d'apport choisie
            // OU un montant, sinon le conseiller ne peut pas monter le dossier.
            if ($this->input('kind') === 'interet' && $this->input('paymentMode') === 'Facilité') {
                $apport = trim((string) $this->input('downPaymentRange'));
                $montant = trim((string) $this->input('downPaymentAmount'));
                if ($apport === '' && $montant === '') {
                    $validator->errors()->add(
                        'downPaymentRange',
                        'Précisez la tranche ou le montant de l’apport disponible pour un paiement échelonné.'
                    );
                }
            }
        }];
    }
}
