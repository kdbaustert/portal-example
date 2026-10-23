<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDocumentRequest extends FormRequest
{
    use UploadRules;

    public function authorize(): bool
    {
        $user = $this->user();

        // Admins upload on behalf of a client; clients always upload to their own.
        return $user->isAdmin() || $user->client_id !== null;
    }

    public function rules(): array
    {
        return [
            'file' => $this->fileRules(),
            'name' => ['nullable', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:2000'],
            'note' => ['nullable', 'string', 'max:500'],
            'client_id' => [
                Rule::requiredIf(fn () => $this->user()->isAdmin()),
                'integer',
                Rule::exists('clients', 'id'),
            ],
        ];
    }
}
