<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreDocumentRequest;
use App\Http\Resources\DocumentResource;
use App\Models\Activity;
use App\Models\Client;
use App\Models\Document;
use App\Services\DocumentVersioning;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class DocumentController extends Controller
{
    public function __construct(private DocumentVersioning $versioning) {}

    /**
     * GET /api/documents?search=&client_id=&archived=1&filename=&sort=updated|name|created
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:160'],
            'client_id' => ['nullable', 'integer'],
            'archived' => ['nullable', 'boolean'],
            'filename' => ['nullable', 'string', 'max:255'],
            'sort' => ['nullable', Rule::in(['updated', 'name', 'created'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $user = $request->user();

        $query = Document::query()
            ->visibleTo($user)
            ->with(['client', 'currentVersion.uploader', 'creator'])
            ->withCount('versions')
            ->when($request->boolean('archived'), fn ($q) => $q->onlyTrashed())
            ->when($user->isAdmin() && ($filters['client_id'] ?? null), fn ($q, $id) => $q->where('client_id', $filters['client_id']))
            ->when($filters['search'] ?? null, function ($q, string $term) {
                $like = '%'.str_replace(['%', '_'], ['\%', '\_'], $term).'%';
                $q->where(fn ($q) => $q
                    ->where('name', 'like', $like)
                    ->orWhere('description', 'like', $like)
                    ->orWhereHas('versions', fn ($v) => $v->where('original_name', 'like', $like)));
            })
            // Used by the portal to offer "upload as a new version" when a
            // dropped file has the same name as an existing document's file.
            ->when($filters['filename'] ?? null, fn ($q, string $name) => $q->whereHas(
                'currentVersion',
                fn ($v) => $v->where('original_name', $name),
            ));

        match ($filters['sort'] ?? 'updated') {
            'name' => $query->orderBy('name'),
            'created' => $query->latest(),
            default => $query->latest('updated_at'),
        };

        return DocumentResource::collection(
            $query->paginate($filters['per_page'] ?? 25)->withQueryString()
        );
    }

    public function store(StoreDocumentRequest $request): JsonResponse
    {
        $user = $request->user();
        $client = $user->isAdmin()
            ? Client::findOrFail($request->integer('client_id'))
            : $user->client;

        $document = $this->versioning->createDocument(
            $user,
            $client,
            $request->file('file'),
            $request->input('name'),
            $request->input('description'),
            $request->input('note'),
        );

        return (new DocumentResource($document->loadCount('versions')))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Document $document): DocumentResource
    {
        $this->authorize('view', $document);

        $document->load(['client', 'creator', 'currentVersion.uploader', 'versions.uploader']);
        $document->versions->each->setRelation('document', $document);
        $document->currentVersion?->setRelation('document', $document);

        return new DocumentResource($document->loadCount('versions'));
    }

    public function update(Request $request, Document $document): DocumentResource
    {
        $this->authorize('update', $document);

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:160'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);

        $document->update($data);
        Activity::record('renamed', $request->user(), $document, $data);

        return $this->show($document);
    }

    /**
     * Archive (soft delete). Versions and files are kept.
     */
    public function destroy(Request $request, Document $document)
    {
        $this->authorize('delete', $document);

        $document->delete();
        Activity::record('archived', $request->user(), $document);

        return response()->noContent();
    }

    public function unarchive(Request $request, Document $document): DocumentResource
    {
        $this->authorize('restore', $document);

        $document->restore();
        Activity::record('unarchived', $request->user(), $document);

        return $this->show($document);
    }
}
