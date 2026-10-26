<?php

namespace App\Http\Requests\Admin;

class UpdateLandRequest extends StoreLandRequest
{
    public function rules(): array
    {
        return array_merge(parent::rules(), [
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'price' => ['sometimes', 'required', 'numeric', 'min:1', 'max:1000000000000'],
            'region' => ['sometimes', 'required', 'string', 'max:120'],
            'location' => ['sometimes', 'required', 'string', 'max:255'],
        ]);
    }
}
