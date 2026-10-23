<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

/**
 * One immutable upload of a document. Rows are never updated after they are
 * written; a new upload or a restore always appends a new row.
 */
#[Fillable([
    'document_id', 'version', 'original_name', 'disk', 'path', 'mime_type',
    'size', 'checksum', 'note', 'restored_from_version', 'uploaded_by',
])]
class DocumentVersion extends Model
{
    protected function casts(): array
    {
        return [
            'version' => 'integer',
            'size' => 'integer',
            'restored_from_version' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::updating(function () {
            throw new LogicException('Document versions are immutable.');
        });
    }

    /** @return BelongsTo<Document, $this> */
    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class)->withTrashed();
    }

    /** @return BelongsTo<User, $this> */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function extension(): string
    {
        return strtolower(pathinfo($this->original_name, PATHINFO_EXTENSION));
    }
}
