<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreVersionRequest;
use App\Http\Resources\DocumentResource;
use App\Models\Activity;
use App\Models\Document;
use App\Models\DocumentVersion;
use App\Services\DocumentVersioning;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentVersionController extends Controller
{
    public function __construct(private DocumentVersioning $versioning) {}

    public function store(StoreVersionRequest $request, Document $document): DocumentResource
    {
        $this->versioning->addVersion(
            $document,
            $request->user(),
            $request->file('file'),
            $request->input('note'),
        );

        return app(DocumentController::class)->show($document);
    }

    public function download(Request $request, Document $document, int $version): StreamedResponse
    {
        $this->authorize('view', $document);

        $row = $this->find($document, $version);
        $disk = Storage::disk($row->disk);

        abort_unless($disk->exists($row->path), 404, 'The stored file for this version is missing.');

        Activity::record('downloaded', $request->user(), $document, [
            'version' => $row->version,
            'original_name' => $row->original_name,
        ]);

        return $disk->download($row->path, $this->downloadName($row), array_filter([
            'Content-Type' => $row->mime_type ?: 'application/octet-stream',
            'X-Content-Type-Options' => 'nosniff',
        ]));
    }

    public function restore(Request $request, Document $document, int $version): DocumentResource
    {
        $this->authorize('update', $document);

        $request->validate(['note' => ['nullable', 'string', 'max:500']]);

        $this->versioning->restore(
            $document,
            $this->find($document, $version),
            $request->user(),
            $request->input('note'),
        );

        return app(DocumentController::class)->show($document);
    }

    private function find(Document $document, int $version): DocumentVersion
    {
        return $document->versions()->where('version', $version)->firstOrFail();
    }

    /**
     * "proposal.pdf" at version 3 of 5 downloads as "proposal (v3).pdf" so
     * older copies can't be mistaken for the current one.
     */
    private function downloadName(DocumentVersion $row): string
    {
        if ($row->version === $row->document->latest_version) {
            return $row->original_name;
        }

        $info = pathinfo($row->original_name);
        $ext = isset($info['extension']) ? '.'.$info['extension'] : '';

        return "{$info['filename']} (v{$row->version}){$ext}";
    }
}
