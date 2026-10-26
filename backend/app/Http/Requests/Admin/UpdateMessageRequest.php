<?php

namespace App\Http\Requests\Admin;

use App\Models\ContactMessage;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'read' => ['nullable', 'boolean'],
            'status' => ['nullable', 'string', Rule::in(ContactMessage::ADMIN_STATUSES)],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            if (! $this->has('read') && ! $this->filled('status')) {
                $validator->errors()->add('status', 'Indiquez l’état de traitement du message (read ou status).');
            }
        }];
    }
}
