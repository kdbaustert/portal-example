<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthAndAdminTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_user_can_sign_in_with_a_session_and_sign_out(): void
    {
        $user = User::factory()->create(['email' => 'jane@acme.test']);

        $this->withHeader('Origin', 'http://localhost:3000')
            ->postJson('/api/auth/login', ['email' => 'jane@acme.test', 'password' => 'password'])
            ->assertOk()
            ->assertJsonPath('email', 'jane@acme.test')
            ->assertJsonPath('client.id', $user->client_id);

        $this->assertAuthenticatedAs($user);
    }

    public function test_bad_credentials_are_rejected(): void
    {
        User::factory()->create(['email' => 'jane@acme.test']);

        $this->postJson('/api/auth/login', ['email' => 'jane@acme.test', 'password' => 'nope'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');

        $this->assertGuest();
    }

    public function test_guests_get_401(): void
    {
        $this->getJson('/api/documents')->assertUnauthorized();
        $this->getJson('/api/auth/user')->assertUnauthorized();
    }

    public function test_clients_cannot_reach_admin_endpoints(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/admin/clients')->assertForbidden();
        $this->postJson('/api/admin/clients', ['name' => 'X'])->assertForbidden();
    }

    public function test_admins_manage_clients_and_their_users(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());

        $clientId = $this->postJson('/api/admin/clients', ['name' => 'Wayne Enterprises'])
            ->assertCreated()
            ->assertJsonPath('slug', 'wayne-enterprises')
            ->json('id');

        $this->postJson("/api/admin/clients/{$clientId}/users", [
            'name' => 'Lucius Fox',
            'email' => 'lucius@wayne.test',
            'password' => 'correct-horse-battery',
        ])->assertCreated()->assertJsonPath('client.id', $clientId)->assertJsonPath('role', 'client');

        $this->getJson('/api/admin/clients')
            ->assertOk()
            ->assertJsonPath('0.name', 'Wayne Enterprises')
            ->assertJsonPath('0.users_count', 1);
    }

    public function test_admins_upload_on_behalf_of_a_client_and_see_every_client(): void
    {
        Storage::fake('local');
        $admin = User::factory()->admin()->create();
        $a = Client::factory()->create();
        $b = Client::factory()->create();
        Sanctum::actingAs($admin);

        $this->postJson('/api/documents', ['file' => UploadedFile::fake()->createWithContent('a.txt', 'a')])
            ->assertUnprocessable()->assertJsonValidationErrors('client_id');

        $this->postJson('/api/documents', ['file' => UploadedFile::fake()->createWithContent('a.txt', 'a'), 'client_id' => $a->id])
            ->assertCreated();
        $this->postJson('/api/documents', ['file' => UploadedFile::fake()->createWithContent('b.txt', 'b'), 'client_id' => $b->id])
            ->assertCreated();

        $this->getJson('/api/documents')->assertJsonCount(2, 'data');
        $this->getJson("/api/documents?client_id={$b->id}")->assertJsonCount(1, 'data');
    }
}
