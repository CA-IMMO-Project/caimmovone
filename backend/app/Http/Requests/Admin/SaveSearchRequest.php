<?php

namespace App\Http\Requests\Admin;

use App\Models\Search;
use App\Support\Phone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveSearchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $merged = [];

        if ($this->exists('phone')) {
            $merged['phone'] = Phone::normalize((string) $this->input('phone'));
        }

        if ($this->exists('email')) {
            $email = mb_strtolower(trim((string) $this->input('email')));
            $merged['email'] = $email !== '' ? $email : null;
        }

        if ($this->exists('clientId') && trim((string) $this->input('clientId')) === '') {
            $merged['clientId'] = null;
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
            'status' => ['nullable', 'string', Rule::in(Search::STATUSES)],
            'clientId' => ['nullable', 'integer', 'exists:clients,id'],
            'fullName' => $isCreate
                ? ['required', 'string', 'max:150']
                : ['sometimes', 'required', 'string', 'max:150'],
            'phone' => $isCreate
                ? ['required', 'string', 'max:40']
                : ['sometimes', 'required', 'string', 'max:40'],
            'email' => ['nullable', 'email', 'max:160'],
            'source' => ['nullable', 'string', Rule::in(Search::SOURCES)],
            'whatsapp' => ['nullable', 'string', 'in:Oui,Non'],
            'flexible' => ['nullable', 'string', 'in:Oui,Non'],
            'usage' => ['nullable', 'string', Rule::in(Search::USAGES)],
            'budgetMax' => ['nullable', 'numeric', 'min:0', 'max:1000000000000'],
            'areaMin' => ['nullable', 'numeric', 'min:0', 'max:1000000000'],
            'areaMax' => ['nullable', 'numeric', 'min:0', 'max:1000000000'],
            'mainZone' => ['nullable', 'string', 'max:160'],
            'otherZones' => ['nullable', 'string', 'max:400'],
            'targetZone' => ['nullable', 'string', 'max:200'],
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
            'radiusKm' => ['nullable', 'numeric', 'min:0', 'max:1000'],
            'suggestNearby' => ['nullable', 'boolean'],
            'criteria' => ['nullable', 'string', 'max:5000'],
            'proposals' => ['nullable', 'array', 'max:200'],
            'attachments' => ['nullable', 'array', 'max:200'],
            'history' => ['nullable', 'array', 'max:500'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            if (($this->isMethod('post') || $this->exists('phone'))
                && ! Phone::isValid((string) $this->input('phone'))) {
                $validator->errors()->add('phone', Phone::message());
            }

            if ($this->filled('areaMin') && $this->filled('areaMax')
                && (float) $this->input('areaMax') > 0
                && (float) $this->input('areaMin') > (float) $this->input('areaMax')) {
                $validator->errors()->add('areaMax', 'La surface maximale doit être supérieure ou égale à la surface minimale.');
            }
        }];
    }
}
