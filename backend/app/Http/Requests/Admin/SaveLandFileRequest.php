<?php

namespace App\Http\Requests\Admin;

use App\Support\DossierVocabulary;
use App\Support\Phone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveLandFileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $merged = [];

        if ($this->exists('status') && $this->input('status') !== null) {
            $merged['status'] = DossierVocabulary::status((string) $this->input('status'));
        }

        if ($this->exists('clientId') && trim((string) $this->input('clientId')) === '') {
            $merged['clientId'] = null;
        }

        $owner = is_array($this->input('owner')) ? $this->input('owner') : null;
        if ($owner !== null) {
            if (array_key_exists('phone', $owner)) {
                $rawOwnerPhone = trim((string) $owner['phone']);
                $dial = trim((string) ($owner['dialCode'] ?? ''));
                if ($rawOwnerPhone !== '' && $dial !== '' && ! str_starts_with($rawOwnerPhone, '+') && ! str_starts_with($rawOwnerPhone, '03')) {
                    $rawOwnerPhone = $dial.$rawOwnerPhone;
                }
                $owner['phone'] = $rawOwnerPhone !== '' ? Phone::normalize($rawOwnerPhone) : '';
            }
            if (array_key_exists('email', $owner)) {
                $owner['email'] = mb_strtolower(trim((string) $owner['email']));
            }
            $merged['owner'] = $owner;
        }

        if ($this->exists('phone') && $this->input('phone') !== null) {
            $normalizedPhone = Phone::normalize((string) $this->input('phone'));
            $merged['phone'] = $normalizedPhone !== '' ? $normalizedPhone : null;
        } elseif ($owner !== null && ! empty($owner['phone'])) {
            $merged['phone'] = $owner['phone'];
        }

        if ($this->hasAny(['fullName', 'ownerName', 'owner'])) {
            $ownerFull = $owner !== null
                ? trim(($owner['firstName'] ?? '').' '.($owner['lastName'] ?? ''))
                : '';
            $candidate = trim((string) ($this->input('fullName') ?: ($this->input('ownerName') ?: $ownerFull)));
            if ($candidate !== '' || $this->exists('fullName')) {
                $merged['fullName'] = $candidate !== '' ? $candidate : null;
            }
        }

        if ($merged !== []) {
            $this->merge($merged);
        }
    }

    public function rules(): array
    {
        return [
            'id' => ['nullable', 'string', 'max:64'],
            'ref' => ['nullable', 'string', 'max:40'],
            'createdAt' => ['nullable', 'string', 'max:64'],
            'updatedAt' => ['nullable', 'string', 'max:64'],
            'status' => ['nullable', 'string', Rule::in(DossierVocabulary::STATUSES)],
            'priority' => ['nullable', 'string', Rule::in(DossierVocabulary::PRIORITIES)],
            'decision' => ['nullable', 'string', Rule::in(DossierVocabulary::DECISIONS)],
            'clientId' => ['nullable', 'integer', 'exists:clients,id'],
            'fullName' => ['nullable', 'string', 'max:150'],
            'ownerName' => ['nullable', 'string', 'max:150'],
            'phone' => ['nullable', 'string', 'max:40'],
            'ownerId' => ['nullable', 'string', 'max:64'],
            'ownerStatus' => ['nullable', 'string', 'max:160'],
            'owner' => ['nullable', 'array'],
            'idDoc' => ['nullable', 'array'],
            'docTypes' => ['nullable', 'array', 'max:30'],
            'title' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:120'],
            'area' => ['nullable', 'numeric', 'min:0', 'max:1000000000'],
            'price' => ['nullable', 'numeric', 'min:0', 'max:1000000000000'],
            'pricePerM2' => ['nullable', 'numeric', 'min:0', 'max:1000000000000'],
            'pricePerM2Manual' => ['nullable', 'boolean'],
            'negotiable' => ['nullable', 'string', 'in:Oui,Non'],
            'saleNegotiable' => ['nullable', 'string', 'in:Oui,Non'],
            'estimateRequested' => ['nullable', 'string', 'in:Oui,Non'],
            'noPhoto' => ['nullable', 'boolean'],
            'whatsapp' => ['nullable', 'string', 'in:Oui,Non'],
            'mobile' => ['nullable', 'string', 'in:Oui,Non'],
            'internet' => ['nullable', 'string', 'in:Oui,Non'],
            'fence' => ['nullable', 'string', 'in:Oui,Non'],
            'building' => ['nullable', 'string', 'in:Oui,Non'],
            'immediate' => ['nullable', 'string', 'in:Oui,Non'],
            'description' => ['nullable', 'string', 'max:10000'],
            'relief' => ['nullable', 'string', 'max:120'],
            'accesses' => ['nullable', 'array', 'max:20'],
            'roadWidth' => ['nullable', 'string', 'max:120'],
            'distanceMainRoad' => ['nullable', 'string', 'max:120'],
            'water' => ['nullable', 'string', 'max:120'],
            'electricity' => ['nullable', 'string', 'max:120'],
            'sanitation' => ['nullable', 'string', 'max:120'],
            'buildingDesc' => ['nullable', 'string', 'max:1000'],
            'occupation' => ['nullable', 'string', 'max:120'],
            'usage' => ['nullable', 'string', 'max:120'],
            'region' => ['nullable', 'string', 'max:120'],
            'regionOther' => ['nullable', 'string', 'max:120'],
            'district' => ['nullable', 'string', 'max:120'],
            'commune' => ['nullable', 'string', 'max:120'],
            'fokontany' => ['nullable', 'string', 'max:120'],
            'addressHint' => ['nullable', 'string', 'max:1000'],
            'landmark' => ['nullable', 'string', 'max:500'],
            'summary' => ['nullable', 'string', 'max:10000'],
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
            'photos' => ['nullable', 'array', 'max:100'],
            'siteFiles' => ['nullable', 'array'],
            'video' => ['nullable', 'array'],
            'documents' => ['nullable', 'array', 'max:100'],
            'salePayment' => ['nullable', 'string', 'max:200'],
            'maxDuration' => ['nullable', 'string', 'max:120'],
            'maxDurationOther' => ['nullable', 'string', 'max:120'],
            'depositRange' => ['nullable', 'string', 'max:120'],
            'depositCustom' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'frequency' => ['nullable', 'string', 'max:120'],
            'frequencyOther' => ['nullable', 'string', 'max:120'],
            'negotiationMargin' => ['nullable', 'string', 'max:120'],
            'specialConditions' => ['nullable', 'string', 'max:10000'],
            'ownerComments' => ['nullable', 'string', 'max:10000'],
            'agent' => ['nullable', 'string', 'max:120'],
            'receivedAt' => ['nullable', 'string', 'max:40'],
            'visitAt' => ['nullable', 'string', 'max:64'],
            'decidedAt' => ['nullable', 'string', 'max:64'],
            'source' => ['nullable', 'string', 'max:120'],
            'fieldCheck' => ['nullable', 'string', 'max:10000'],
            'legalCheck' => ['nullable', 'string', 'max:10000'],
            'internalEstimate' => ['nullable', 'numeric', 'min:0', 'max:1000000000000'],
            'recommendedPrice' => ['nullable', 'numeric', 'min:0', 'max:1000000000000'],
            'commission' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'internalComments' => ['nullable', 'string', 'max:10000'],
            'decisionReason' => ['nullable', 'string', 'max:10000'],
            'checklist' => ['nullable', 'array', 'max:50'],
            'notes' => ['nullable', 'array', 'max:500'],
            'tasks' => ['nullable', 'array', 'max:500'],
            'history' => ['nullable', 'array', 'max:500'],
            'actions' => ['nullable', 'array', 'max:500'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            $effectiveStatus = (string) ($this->input('status') ?? 'Nouveau');
            $isDraft = $effectiveStatus === 'Brouillon';

            if ($this->isMethod('post') && ! $isDraft) {
                if (trim((string) $this->input('title')) === '') {
                    $validator->errors()->add('title', 'L’intitulé du terrain est obligatoire hors brouillon.');
                }
                if (trim((string) $this->input('fullName')) === '') {
                    $validator->errors()->add('fullName', 'Le nom du propriétaire est obligatoire hors brouillon.');
                }
                if (trim((string) $this->input('phone')) === '') {
                    $validator->errors()->add('phone', Phone::message());
                }
            }

            if ($this->filled('phone') && ! Phone::isValid((string) $this->input('phone'))) {
                $validator->errors()->add('phone', Phone::message());
            }

            $owner = $this->input('owner');
            if (is_array($owner)) {
                if (! empty($owner['email']) && filter_var($owner['email'], FILTER_VALIDATE_EMAIL) === false) {
                    $validator->errors()->add('owner.email', 'Adresse e-mail du propriétaire invalide.');
                }
                if (! empty($owner['hasBankAccount']) && ! in_array($owner['hasBankAccount'], ['Oui', 'Non'], true)) {
                    $validator->errors()->add('owner.hasBankAccount', 'Valeur non reconnue pour le compte bancaire.');
                }
            }

            foreach ((array) $this->input('documents', []) as $index => $doc) {
                if (! is_array($doc) || empty($doc['status'])) {
                    continue;
                }
                $normalizedDocStatus = DossierVocabulary::detail(['documents' => [$doc]])['documents'][0]['status'] ?? '';
                if (! in_array($normalizedDocStatus, DossierVocabulary::DOC_STATUSES, true)) {
                    $validator->errors()->add("documents.{$index}.status", 'Statut de pièce jointe non reconnu.');
                }
            }
        }];
    }
}
