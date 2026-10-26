<?php

namespace App\Http\Requests\Public;

use App\Support\Phone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreLandFileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $merged = ['phone' => Phone::normalize($this->input('phone'))];

        if ($this->has('noPhoto')) {
            $merged['noPhoto'] = filter_var($this->input('noPhoto'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? false;
        }

        if (! $this->filled('fullName') && ($this->filled('firstName') || $this->filled('lastName'))) {
            $merged['fullName'] = trim($this->input('firstName', '').' '.$this->input('lastName', ''));
        }

        $this->merge($merged);
    }

    public function rules(): array
    {
        return [
            'fullName' => 'required|string|max:150',
            'firstName' => 'nullable|string|max:80',
            'lastName' => 'nullable|string|max:80',
            'phone' => 'required|string|max:40',
            'email' => 'nullable|email|max:160',
            'birthDate' => 'nullable|date|before:today',
            // Situation du vendeur vis-à-vis du terrain (propriétaire inscrit,
            // indivision familiale, mandataire) et demande d'estimation : deux
            // informations propres au marché malgache, jamais bloquantes.
            'ownerStatus' => 'nullable|string|max:120',
            'estimateRequested' => 'nullable|in:Oui',
            'whatsapp' => 'nullable|in:Oui,Non',
            'profession' => 'nullable|string|max:120',
            'country' => 'nullable|string|max:80',
            'bankAccount' => 'nullable|string|max:160',
            // Type de pièce d'identité : même liste que le back office
            // (CIN, Passeport, Carte de résident).
            'idType' => 'required|in:CIN,Passeport,Carte de résident',
            'idNumber' => 'nullable|string|max:80',
            'title' => 'required|string|max:200',
            'area' => 'nullable|numeric|min:0',
            'price' => 'nullable|numeric|min:0',
            'description' => 'nullable|string|max:5000',
            'relief' => 'nullable|string|max:80',
            'access' => 'nullable|string|max:120',
            'water' => 'nullable|string|max:20',
            'electricity' => 'nullable|string|max:20',
            'region' => 'nullable|string|max:80',
            'regionOther' => 'nullable|string|max:80',
            'district' => 'nullable|string|max:80',
            'commune' => 'nullable|string|max:80',
            'fokontany' => 'nullable|string|max:80',
            'directions' => 'nullable|string|max:400',
            'lat' => 'nullable|numeric|between:-90,90',
            'lng' => 'nullable|numeric|between:-180,180',
            'payment' => 'nullable|string|max:80',
            'paymentDuration' => 'nullable|string|max:80',
            'deposit' => 'nullable|string|max:80',
            'noPhoto' => 'nullable|boolean',
            'photoNames' => 'nullable|array|max:12',
            'videoNames' => 'nullable|array|max:2',
            'docNames' => 'nullable|array|max:12',
            /* Documents fonciers : le vendeur doit dire ce qu'il a — y compris
               « Aucun document pour l’instant ». */
            'docTypes' => 'required|array|min:1|max:12',
            'idFileNames' => 'nullable|array|max:2',
            'summary' => 'nullable|string|max:10000',
            'photos' => 'nullable|array|max:12',
            'photos.*' => 'file|mimes:jpg,jpeg,png,webp|max:5120',
            'videos' => 'nullable|array|max:2',
            'videos.*' => 'file|mimes:mp4,webm,mov|max:102400',
            'documents' => 'nullable|array|max:12',
            'documents.*' => 'file|mimes:pdf,jpg,jpeg,png,webp,doc,docx|max:10240',
            // Pièce d'identité du vendeur OBLIGATOIRE :
            // - CIN / Carte de résident : recto + verso (2 fichiers max, ou 1 PDF recto-verso)
            // - Passeport : 1 seul fichier (page d'identité)
            'idFiles' => 'required|array|min:1|max:2',
            'idFiles.*' => 'file|mimes:pdf,jpg,jpeg,png,webp|max:10240',
        ];
    }

    /** Messages en français : ils s'affichent tels quels sur le site public. */
    public function messages(): array
    {
        return [
            'idType.required' => 'Indiquez le type de votre pièce d’identité : CIN, passeport ou carte de résident.',
            'idType.in' => 'Seules la CIN, le passeport et la carte de résident sont acceptés comme pièce d’identité (le certificat de résidence et le permis de conduire ne le sont pas).',
            'idFiles.required' => 'Joignez une pièce d’identité du propriétaire (photo ou PDF) : elle est nécessaire pour déposer un terrain.',
            'idFiles.min' => 'Joignez une pièce d’identité du propriétaire (photo ou PDF) : elle est nécessaire pour déposer un terrain.',
            'idFiles.max' => 'Deux fichiers maximum sont acceptés pour la pièce d’identité (recto et verso uniquement).',
            'idFiles.*.mimes' => 'Format non accepté : envoyez la pièce en PDF, JPG, PNG ou WebP.',
            'idFiles.*.max' => 'La pièce est trop lourde (10 Mo maximum) : envoyez une photo moins lourde.',
            'docTypes.required' => 'Dites ce que vous possédez déjà comme documents — ou cochez « Je n’ai encore aucun de ces documents » si vous n’avez rien.',
            'docTypes.min' => 'Dites ce que vous possédez déjà comme documents — ou cochez « Je n’ai encore aucun de ces documents » si vous n’avez rien.',
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            if (! Phone::isValid((string) $this->input('phone'))) {
                $validator->errors()->add('phone', Phone::message());
            }

            if ($this->input('idType') === 'Passeport' && count((array) $this->file('idFiles', [])) > 1) {
                $validator->errors()->add('idFiles', 'Un seul fichier est attendu pour un passeport (page d’identité).');
            }
        }];
    }
}
