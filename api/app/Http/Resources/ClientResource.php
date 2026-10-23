<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Client */
class ClientResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'contact_email' => $this->contact_email,
            'users_count' => $this->whenCounted('users'),
            'documents_count' => $this->whenCounted('documents'),
            'storage_bytes' => $this->when(isset($this->storage_bytes), fn () => (int) $this->storage_bytes),
            'users' => UserResource::collection($this->whenLoaded('users')),
            'created_at' => $this->created_at,
        ];
    }
}
