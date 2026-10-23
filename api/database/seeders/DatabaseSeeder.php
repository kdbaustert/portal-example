<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\User;
use App\Services\DocumentVersioning;
use Illuminate\Database\Seeder;
use Illuminate\Http\UploadedFile;

class DatabaseSeeder extends Seeder
{
    /**
     * Demo data. Every account's password is "password".
     */
    public function run(DocumentVersioning $versioning): void
    {
        $admin = User::factory()->admin()->create([
            'name' => 'Portal Admin',
            'email' => 'admin@example.com',
        ]);

        $acme = Client::create(['name' => 'Acme Corporation', 'contact_email' => 'ops@acme.test']);
        $globex = Client::create(['name' => 'Globex Industries', 'contact_email' => 'hello@globex.test']);

        $jane = User::factory()->for($acme)->create([
            'name' => 'Jane Cooper',
            'email' => 'jane@acme.test',
        ]);

        User::factory()->for($globex)->create([
            'name' => 'Hank Scorpio',
            'email' => 'hank@globex.test',
        ]);

        $file = fn (string $name, string $body) => UploadedFile::fake()->createWithContent($name, $body);

        // A document with real history: three revisions, then a restore.
        $contract = $versioning->createDocument(
            $jane, $acme,
            $file('master-services-agreement.txt', "Master Services Agreement\n\nDraft 1"),
            'Master Services Agreement',
            'Signed MSA between Acme and our team.',
        );
        $versioning->addVersion($contract, $admin, $file('master-services-agreement.txt', "Master Services Agreement\n\nDraft 2 — legal comments addressed"), 'Addressed legal comments in §4 and §9');
        $versioning->addVersion($contract, $jane, $file('master-services-agreement.txt', "Master Services Agreement\n\nDraft 3 — pricing change"), 'Updated pricing schedule');
        $versioning->restore($contract, $contract->versions()->where('version', 2)->first(), $jane, 'Pricing change rejected, back to v2');

        $brief = $versioning->createDocument(
            $jane, $acme,
            $file('brand-brief.txt', "Brand brief\n\nAudience, tone, deliverables."),
            'Brand Brief',
        );
        $versioning->addVersion($brief, $jane, $file('brand-brief.txt', "Brand brief\n\nAudience, tone, deliverables, timeline."), 'Added timeline');

        $versioning->createDocument(
            $jane, $acme,
            $file('q3-invoice-export.csv', "invoice,amount\n1001,4200\n1002,1800\n"),
            'Q3 Invoice Export',
        );

        $versioning->createDocument(
            $admin, $globex,
            $file('kickoff-notes.txt', 'Kickoff meeting notes'),
            'Kickoff Notes',
        );

        // Faker-generated clients, users and documents with version history.
        $this->call(DemoContentSeeder::class);
    }
}
