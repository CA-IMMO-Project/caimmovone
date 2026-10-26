<?php

namespace App\Http\Requests\Admin;

use App\Models\Land;
use App\Models\SiteRequest;
use App\Support\Phone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveSiteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $merged = [];

        if ($this->hasAny(['fullName', 'firstName', 'lastName'])) {
            $composed = trim(($this->input('firstName') ?? '').' '.($this->input('lastName') ?? ''));
            $merged['fullName'] = $composed !== ''
                ? $composed
                : trim((string) $this->input('fullName'));
        }

        if ($this->exists('phone')) {
            $rawPhone = trim((string) $this->input('phone'));
            $dial = trim((string) $this->input('dialCode', ''));
            if ($rawPhone !== '' && $dial !== '' && ! str_starts_with($rawPhone, '+') && ! str_starts_with($rawPhone, '03')) {
                $rawPhone = $dial.$rawPhone;
            }
            $merged['phone'] = Phone::normalize($rawPhone);
        }

        if ($this->exists('email')) {
            $email = mb_strtolower(trim((string) $this->input('email')));
            $merged['email'] = $email !== '' ? $email : null;
        }

        if ($this->input('kind') === 'achat') {
            $merged['kind'] = 'interet';
        }

        foreach (['landId', 'clientId', 'lotId'] as $key) {
            if ($this->exists($key) && trim((string) $this->input($key)) === '') {
                $merged[$key] = null;
            }
        }

        if ($merged !== []) {
            $this->merge($merged);
        }
    }

    public function rules(): array
    {
        $isCreate = $this->isMethod('post');

        return [
            'id' => ['nullable', 'string', 'max:64'],
            'ref' => ['nullable', 'string', 'max:40'],
            'createdAt' => ['nullable', 'string', 'max:64'],
            'updatedAt' => ['nullable', 'string', 'max:64'],
            'kind' => ['nullable', 'string', Rule::in(SiteRequest::KINDS)],
            'status' => ['nullable', 'string', Rule::in(SiteRequest::STATUSES)],
            'priority' => ['nullable', 'string', Rule::in(SiteRequest::PRIORITIES)],
            'source' => ['nullable', 'string', Rule::in(SiteRequest::SOURCES)],
            'landId' => ['nullable', 'integer', 'exists:lands,id'],
            'lotId' => ['nullable', 'string', 'max:80'],
            'clientId' => ['nullable', 'integer', 'exists:clients,id'],
            'fullName' => $isCreate
                ? ['required', 'string', 'max:150']
                : ['sometimes', 'required', 'string', 'max:150'],
            'firstName' => ['nullable', 'string', 'max:100'],
            'lastName' => ['nullable', 'string', 'max:100'],
            'dialCode' => ['nullable', 'string', 'max:10'],
            'phone' => $isCreate
                ? ['required', 'string', 'max:40']
                : ['sometimes', 'required', 'string', 'max:40'],
            'email' => ['nullable', 'email', 'max:160'],
            'birthDate' => ['nullable', 'string', 'max:40'],
            'visitDate' => ['nullable', 'string', 'max:40'],
            'visitTime' => ['nullable', 'string', 'max:40'],
            'callTime' => ['nullable', 'string', 'max:80'],
            'nextFollowUp' => ['nullable', 'string', 'max:64'],
            'visitAt' => ['nullable', 'string', 'max:64'],
            'profession' => ['nullable', 'string', 'max:120'],
            'country' => ['nullable', 'string', 'max:80'],
            'countryOther' => ['nullable', 'string', 'max:80'],
            'nationality' => ['nullable', 'string', 'max:80'],
            'address' => ['nullable', 'string', 'max:255'],
            'hasBankAccount' => ['nullable', 'string', 'in:Oui,Non'],
            'bank' => ['nullable', 'string', 'max:160'],
            'bankAccount' => ['nullable', 'string', 'max:160'],
            'whatsapp' => ['nullable', 'string', 'in:Oui,Non'],
            'age' => ['nullable', 'integer', 'between:1,120'],
            'paymentMode' => ['nullable', 'string', 'max:200'],
            'paymentDuration' => ['nullable', 'string', 'max:120'],
            'duration' => ['nullable', 'string', 'max:120'],
            'downPaymentAmount' => ['nullable', 'string', 'max:120'],
            'downPaymentRange' => ['nullable', 'string', 'max:120'],
            'budgetMin' => ['nullable', 'numeric', 'min:0', 'max:1000000000000'],
            'budgetMax' => ['nullable', 'numeric', 'min:0', 'max:1000000000000'],
            'deposit' => ['nullable', 'numeric', 'min:0', 'max:1000000000000'],
            'areaMin' => ['nullable', 'numeric', 'min:0', 'max:1000000000'],
            'areaMax' => ['nullable', 'numeric', 'min:0', 'max:1000000000'],
            'propertyType' => ['nullable', 'string', 'max:120'],
            'projectName' => ['nullable', 'string', 'max:200'],
            'landTitle' => ['nullable', 'string', 'max:255'],
            'region' => ['nullable', 'string', 'max:120'],
            'district' => ['nullable', 'string', 'max:120'],
            'commune' => ['nullable', 'string', 'max:120'],
            'fokontany' => ['nullable', 'string', 'max:120'],
            'goal' => ['nullable', 'string', 'max:160'],
            'deadline' => ['nullable', 'string', 'max:160'],
            'budget' => ['nullable', 'string', 'max:160'],
            'agent' => ['nullable', 'string', 'max:120'],
            'criteria' => ['nullable', 'string', 'max:5000'],
            'extraInfo' => ['nullable', 'string', 'max:5000'],
            'projectDescription' => ['nullable', 'string', 'max:5000'],
            'message' => ['nullable', 'string', 'max:5000'],
            'consent' => ['nullable', 'boolean'],
            'resendCount' => ['nullable', 'integer', 'min:0'],
            'lastResentAt' => ['nullable', 'string', 'max:64'],
            'notes' => ['nullable', 'array', 'max:500'],
            'contacts' => ['nullable', 'array', 'max:500'],
            'attachments' => ['nullable', 'array', 'max:200'],
            'history' => ['nullable', 'array', 'max:500'],
            'actions' => ['nullable', 'array', 'max:500'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            if (($this->isMethod('post') || $this->exists('phone'))
                && ! Phone::isValid((string) $this->input('phone'))) {
                $validator->errors()->add('phone', Phone::message());
            }

            if ($this->filled('budgetMin') && $this->filled('budgetMax')
                && (float) $this->input('budgetMax') > 0
                && (float) $this->input('budgetMin') > (float) $this->input('budgetMax')) {
                $validator->errors()->add('budgetMax', 'Le budget maximal doit être supérieur ou égal au budget minimal.');
            }

            if ($this->filled('areaMin') && $this->filled('areaMax')
                && (float) $this->input('areaMax') > 0
                && (float) $this->input('areaMin') > (float) $this->input('areaMax')) {
                $validator->errors()->add('areaMax', 'La surface maximale doit être supérieure ou égale à la surface minimale.');
            }

            if ($this->filled('lotId')) {
                $targetLandId = $this->filled('landId')
                    ? (int) $this->input('landId')
                    : ($this->route('id') ? SiteRequest::find($this->route('id'))?->land_id : null);
                $land = $targetLandId ? Land::find($targetLandId) : null;
                if ($land !== null && ! empty($land->lots)) {
                    $lotIds = array_map(fn ($lot) => (string) ($lot['id'] ?? ''), $land->lots);
                    if (! in_array((string) $this->input('lotId'), $lotIds, true)) {
                        $validator->errors()->add('lotId', 'La parcelle sélectionnée n’appartient pas à ce terrain.');
                    }
                }
            }
        }];
    }
}
