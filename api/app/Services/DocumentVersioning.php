<?php

namespace App\Services;

use App\Exceptions\VersionConflictException;
use App\Models\Activity;
use App\Models\Client;
use App\Models\Document;
use App\Models\DocumentVersion;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

/**
 * All writes to documents and their versions go through here, so version
 * numbering, checksums, storage and the audit trail stay consistent.
 */
class DocumentVersioning
{
    public function createDocument(
        User $user,
        Client $client,
        UploadedFile $file,
        ?string $name = null,
        ?string $description = null,
        ?string $note = null,
    ): Document {
        $document = DB::transaction(function () use ($user, $client, $file, $name, $description) {
            $document = Document::create([
                'client_id' => $client->id,
                'name' => $name ?: $this->nameFromFile($file),
                'description' => $description,
                'created_by' => $user->id,
            ]);

            Activity::record('created', $user, $document);

            return $document;
        });

        try {
            $this->addVersion($document, $user, $file, $note ?: 'Initial upload');
        } catch (Throwable $e) {
            $document->forceDelete();
            throw $e;
        }

        return $document->fresh(['currentVersion.uploader', 'client', 'creator']);
    }

    /**
     * Append a new version from an upload.
     *
     * @throws VersionConflictException when the file is byte-for-byte the current version
     */
    public function addVersion(Document $document, User $user, UploadedFile $file, ?string $note = null): DocumentVersion
    {
        $checksum = hash_file('sha256', $file->getRealPath());

        $current = $document->currentVersion;
        if ($current && hash_equals($current->checksum, $checksum)) {
            throw new VersionConflictException(
                "This file is identical to the current version (v{$current->version})."
            );
        }

        $disk = config('portal.disk');
        $extension = strtolower($file->getClientOriginalExtension());
        $path = $file->storeAs(
            "clients/{$document->client_id}/documents/{$document->id}",
            Str::uuid().($extension ? ".{$extension}" : ''),
            ['disk' => $disk],
        );

        if ($path === false) {
            throw new \RuntimeException('The file could not be stored.');
        }

        try {
            return $this->append($document, $user, [
                'original_name' => $this->cleanName($file->getClientOriginalName()),
                'disk' => $disk,
                'path' => $path,
                'mime_type' => $file->getClientMimeType() ?: $file->getMimeType(),
                'size' => $file->getSize(),
                'checksum' => $checksum,
                'note' => $note,
            ], 'uploaded');
        } catch (Throwable $e) {
            Storage::disk($disk)->delete($path);
            throw $e;
        }
    }

    /**
     * Make an older version current again by appending a copy of it. History
     * is never rewritten, so the restore itself shows up as a new version.
     *
     * @throws VersionConflictException when the version is already current
     */
    public function restore(Document $document, DocumentVersion $version, User $user, ?string $note = null): DocumentVersion
    {
        if ($document->current_version_id === $version->id) {
            throw new VersionConflictException("Version {$version->version} is already the current version.");
        }

        // Files are immutable, so the new row can share the stored file.
        return $this->append($document, $user, [
            'original_name' => $version->original_name,
            'disk' => $version->disk,
            'path' => $version->path,
            'mime_type' => $version->mime_type,
            'size' => $version->size,
            'checksum' => $version->checksum,
            'note' => $note ?: "Restored from version {$version->version}",
            'restored_from_version' => $version->version,
        ], 'restored');
    }

    private function append(Document $document, User $user, array $attributes, string $action): DocumentVersion
    {
        return DB::transaction(function () use ($document, $user, $attributes, $action) {
            // Lock the row so two simultaneous uploads can't claim the same number.
            $locked = Document::withTrashed()->lockForUpdate()->findOrFail($document->id);
            $number = $locked->latest_version + 1;

            $version = $locked->versions()->create($attributes + [
                'version' => $number,
                'uploaded_by' => $user->id,
            ]);

            $locked->forceFill([
                'latest_version' => $number,
                'current_version_id' => $version->id,
            ])->save();

            Activity::record($action, $user, $locked, array_filter([
                'version' => $number,
                'original_name' => $version->original_name,
                'restored_from_version' => $version->restored_from_version,
            ]));

            $document->setRawAttributes($locked->getAttributes(), true);
            $document->setRelation('currentVersion', $version);

            return $version;
        });
    }

    private function nameFromFile(UploadedFile $file): string
    {
        $base = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);

        return Str::of($base)->replace(['_', '-'], ' ')->squish()->title()->limit(120, '')->value() ?: 'Untitled';
    }

    private function cleanName(string $name): string
    {
        // Strip path separators and control characters a browser might send.
        $name = basename(str_replace('\\', '/', $name));
        $name = preg_replace('/[\x00-\x1F\x7F]/u', '', $name) ?? '';

        return Str::limit($name, 200, '') ?: 'file';
    }
}
