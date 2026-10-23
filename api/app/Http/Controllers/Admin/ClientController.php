<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ClientResource;
use App\Models\Client;
use App\Models\DocumentVersion;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    public function index()
    {
        $storage = DocumentVersion::query()
            ->join('documents', 'documents.id', '=', 'document_versions.document_id')
            ->whereNull('document_versions.restored_from_version')
            ->selectRaw('documents.client_id, SUM(document_versions.size) as bytes')
            ->groupBy('documents.client_id')
            ->pluck('bytes', 'client_id');

        $clients = Client::query()
            ->withCount(['users', 'documents'])
            ->orderBy('name')
            ->get()
            ->each(fn (Client $c) => $c->storage_bytes = (int) ($storage[$c->id] ?? 0));

        return ClientResource::collection($clients);
    }

    public function store(Request $request): ClientResource
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'contact_email' => ['nullable', 'email', 'max:255'],
        ]);

        return new ClientResource(Client::create($data)->loadCount(['users', 'documents']));
    }

    public function show(Client $client): ClientResource
    {
        return new ClientResource($client->load('users')->loadCount(['users', 'documents']));
    }

    public function update(Request $request, Client $client): ClientResource
    {
        $client->update($request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:160'],
            'contact_email' => ['sometimes', 'nullable', 'email', 'max:255'],
        ]));

        return $this->show($client);
    }
}
