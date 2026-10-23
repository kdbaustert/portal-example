<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Document;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DocumentVersioningTest extends TestCase
{
    use RefreshDatabase;

    private Client $client;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');
        config(['portal.disk' => 'local']);

        $this->client = Client::factory()->create();
        $this->user = User::factory()->for($this->client)->create();
        Sanctum::actingAs($this->user);
    }

    private function file(string $name, string $content): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, $content);
    }

    private function upload(string $name = 'proposal.pdf', string $content = 'v1'): Document
    {
        $id = $this->postJson('/api/documents', ['file' => $this->file($name, $content)])
            ->assertCreated()
            ->json('id');

        return Document::findOrFail($id);
    }

    public function test_uploading_a_file_creates_a_document_at_version_one(): void
    {
        $response = $this->postJson('/api/documents', [
            'file' => $this->file('signed_contract-final.pdf', 'hello'),
            'note' => 'First draft',
        ]);

        $response->assertCreated()
            ->assertJsonPath('name', 'Signed Contract Final')
            ->assertJsonPath('latest_version', 1)
            ->assertJsonPath('client.id', $this->client->id)
            ->assertJsonPath('current_version.version', 1)
            ->assertJsonPath('current_version.original_name', 'signed_contract-final.pdf')
            ->assertJsonPath('current_version.note', 'First draft')
            ->assertJsonPath('current_version.checksum', hash('sha256', 'hello'));

        $path = Document::first()->currentVersion->path;
        Storage::disk('local')->assertExists($path);
        $this->assertStringStartsWith("clients/{$this->client->id}/documents/", $path);
    }

    public function test_new_uploads_append_versions_and_keep_every_old_file(): void
    {
        $doc = $this->upload('plan.docx', 'one');

        $this->postJson("/api/documents/{$doc->id}/versions", [
            'file' => $this->file('plan.docx', 'two'),
            'note' => 'Second pass',
        ])->assertOk()->assertJsonPath('latest_version', 2);

        $this->postJson("/api/documents/{$doc->id}/versions", [
            'file' => $this->file('plan-final.docx', 'three'),
        ])->assertOk()
            ->assertJsonPath('latest_version', 3)
            ->assertJsonPath('current_version.original_name', 'plan-final.docx')
            ->assertJsonCount(3, 'versions')
            ->assertJsonPath('versions.0.version', 3)
            ->assertJsonPath('versions.0.is_current', true)
            ->assertJsonPath('versions.2.is_current', false)
            ->assertJsonPath('versions.1.note', 'Second pass');

        foreach ($doc->fresh()->versions as $version) {
            Storage::disk('local')->assertExists($version->path);
        }
        $this->assertCount(3, $doc->fresh()->versions->pluck('path')->unique());
    }

    public function test_uploading_an_identical_file_is_rejected(): void
    {
        $doc = $this->upload('a.txt', 'same bytes');

        $this->postJson("/api/documents/{$doc->id}/versions", [
            'file' => $this->file('renamed.txt', 'same bytes'),
        ])->assertStatus(409)->assertJsonPath('message', 'This file is identical to the current version (v1).');

        $this->assertSame(1, $doc->fresh()->latest_version);
        $this->assertCount(1, Storage::disk('local')->allFiles());
    }

    public function test_restoring_an_old_version_appends_a_new_version(): void
    {
        $doc = $this->upload('a.txt', 'one');
        $this->postJson("/api/documents/{$doc->id}/versions", ['file' => $this->file('a.txt', 'two')]);

        $this->postJson("/api/documents/{$doc->id}/versions/1/restore")
            ->assertOk()
            ->assertJsonPath('latest_version', 3)
            ->assertJsonPath('current_version.restored_from_version', 1)
            ->assertJsonPath('current_version.checksum', hash('sha256', 'one'))
            ->assertJsonPath('current_version.note', 'Restored from version 1')
            ->assertJsonCount(3, 'versions');

        // Restoring what's already current is a no-op conflict.
        $this->postJson("/api/documents/{$doc->id}/versions/3/restore")->assertStatus(409);

        // The restore shares the stored file instead of copying it.
        $this->assertCount(2, Storage::disk('local')->allFiles());
    }

    public function test_any_version_can_be_downloaded_and_older_ones_are_labelled(): void
    {
        $doc = $this->upload('report.csv', 'a,b');
        $this->postJson("/api/documents/{$doc->id}/versions", ['file' => $this->file('report.csv', 'a,b,c')]);

        $latest = $this->get("/api/documents/{$doc->id}/versions/2/download")->assertOk();
        $this->assertSame('a,b,c', $latest->streamedContent());
        $this->assertStringContainsString('filename=report.csv', $latest->headers->get('content-disposition'));

        $old = $this->get("/api/documents/{$doc->id}/versions/1/download")->assertOk();
        $this->assertSame('a,b', $old->streamedContent());
        $this->assertStringContainsString('report (v1).csv', $old->headers->get('content-disposition'));

        $this->get("/api/documents/{$doc->id}/versions/9/download")->assertNotFound();

        $this->assertDatabaseHas('activities', ['document_id' => $doc->id, 'action' => 'downloaded']);
    }

    public function test_versions_are_immutable(): void
    {
        $doc = $this->upload();

        $this->expectException(\LogicException::class);
        $doc->currentVersion->update(['note' => 'tampered']);
    }

    public function test_clients_cannot_see_or_touch_other_clients_documents(): void
    {
        $doc = $this->upload('mine.txt', 'mine');

        $other = User::factory()->create(); // belongs to a different client
        Sanctum::actingAs($other);

        $this->getJson('/api/documents')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson("/api/documents/{$doc->id}")->assertForbidden();
        $this->get("/api/documents/{$doc->id}/versions/1/download")->assertForbidden();
        $this->postJson("/api/documents/{$doc->id}/versions", ['file' => $this->file('x.txt', 'x')])->assertForbidden();
        $this->postJson("/api/documents/{$doc->id}/versions/1/restore")->assertForbidden();
        $this->deleteJson("/api/documents/{$doc->id}")->assertForbidden();
    }

    public function test_clients_cannot_choose_another_client_when_uploading(): void
    {
        $otherClient = Client::factory()->create();

        $this->postJson('/api/documents', [
            'file' => $this->file('x.txt', 'x'),
            'client_id' => $otherClient->id,
        ])->assertCreated()->assertJsonPath('client.id', $this->client->id);
    }

    public function test_blocked_extensions_and_oversized_files_are_rejected(): void
    {
        $this->postJson('/api/documents', ['file' => $this->file('shell.php', '<?php echo 1;')])
            ->assertUnprocessable()->assertJsonValidationErrors('file');

        config(['portal.max_upload_mb' => 1]);
        $this->postJson('/api/documents', ['file' => UploadedFile::fake()->create('big.zip', 2048)])
            ->assertUnprocessable()->assertJsonValidationErrors('file');
    }

    public function test_archiving_keeps_history_and_can_be_undone(): void
    {
        $doc = $this->upload();

        $this->deleteJson("/api/documents/{$doc->id}")->assertNoContent();
        $this->getJson('/api/documents')->assertJsonCount(0, 'data');
        $this->getJson('/api/documents?archived=1')->assertJsonCount(1, 'data');

        // Archived documents are read-only but still downloadable.
        $this->postJson("/api/documents/{$doc->id}/versions", ['file' => $this->file('b.txt', 'b')])
            ->assertForbidden()
            ->assertJsonPath('message', 'Archived documents are read-only. Unarchive it to make changes.');
        $this->get("/api/documents/{$doc->id}/versions/1/download")->assertOk();

        $this->postJson("/api/documents/{$doc->id}/unarchive")->assertOk()->assertJsonPath('archived_at', null);
        $this->getJson('/api/documents')->assertJsonCount(1, 'data');
    }

    public function test_listing_supports_search_and_filename_lookup(): void
    {
        $this->upload('quarterly-report.xlsx', '1');
        $this->upload('logo.png', '2');

        $this->getJson('/api/documents?search=quarterly')
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Quarterly Report');

        $this->getJson('/api/documents?filename=logo.png')
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.current_version.original_name', 'logo.png');
    }

    public function test_dashboard_reports_stats_and_activity(): void
    {
        $doc = $this->upload('a.txt', '12345');
        $this->postJson("/api/documents/{$doc->id}/versions", ['file' => $this->file('a.txt', '1234567890')]);
        $this->postJson("/api/documents/{$doc->id}/versions/1/restore");

        $this->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('stats.documents', 1)
            ->assertJsonPath('stats.versions', 3)
            ->assertJsonPath('stats.storage_bytes', 15)
            ->assertJsonPath('recent_activity.0.action', 'restored');
    }
}
