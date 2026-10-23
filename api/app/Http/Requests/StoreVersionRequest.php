<?php

namespace App\Http\Requests;

use Illuminate\Auth\Access\Response;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class StoreVersionRequest extends FormRequest
{
    use UploadRules;

    public function authorize(): Response
    {
        return Gate::forUser($this->user())->inspect('update', $this->route('document'));
    }

    public function rules(): array
    {
        return [
            'file' => $this->fileRules(),
            'note' => ['nullable', 'string', 'max:500'],
        ];
    }
}
