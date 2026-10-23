<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Client;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;

class ClientUserController extends Controller
{
    public function store(Request $request, Client $client): UserResource
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', Password::min(10)],
        ]);

        $user = $client->users()->create($data + ['role' => User::ROLE_CLIENT]);

        return new UserResource($user->load('client'));
    }

    public function destroy(Client $client, User $user)
    {
        abort_unless($user->client_id === $client->id, 404);
        $user->delete();

        return response()->noContent();
    }
}
