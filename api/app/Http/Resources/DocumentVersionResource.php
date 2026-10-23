<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\DocumentVersion */
class DocumentVersionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'version' => $this->version,
            'original_name' => $this->original_name,
            'extension' => $this->extension(),
            'mime_type' => $this->mime_type,
            'size' => $this->size,
            'checksum' => $this->checksum,
            'note' => $this->note,
            'restored_from_version' => $this->restored_from_version,
            'is_current' => $this->when(
                $this->relationLoaded('document'),
                fn () => $this->document->current_version_id === $this->id,
            ),
            'uploaded_by' => $this->whenLoaded('uploader', fn () => $this->uploader ? [
                'id' => $this->uploader->id,
                'name' => $this->uploader->name,
            ] : null),
            'download_url' => url("/api/documents/{$this->document_id}/versions/{$this->version}/download"),
            'created_at' => $this->created_at,
        ];
    }
}
