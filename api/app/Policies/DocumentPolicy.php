<?php

namespace App\Policies;

use App\Models\Document;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class DocumentPolicy
{
    public function view(User $user, Document $document): bool
    {
        return $user->canAccessClient($document->client_id);
    }

    public function update(User $user, Document $document): Response|bool
    {
        if (! $user->canAccessClient($document->client_id)) {
            return false;
        }

        return $document->trashed()
            ? Response::deny('Archived documents are read-only. Unarchive it to make changes.')
            : true;
    }

    public function delete(User $user, Document $document): bool
    {
        return $user->canAccessClient($document->client_id);
    }

    public function restore(User $user, Document $document): bool
    {
        return $user->canAccessClient($document->client_id);
    }
}
