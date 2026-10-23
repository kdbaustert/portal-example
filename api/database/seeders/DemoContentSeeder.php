<?php

namespace Database\Seeders;

use App\Models\Activity;
use App\Models\Client;
use App\Models\Document;
use App\Models\User;
use App\Services\DocumentVersioning;
use Database\Seeders\Support\FakeFiles;
use Faker\Generator;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Fills the portal with Faker-generated clients, users and documents. Each
 * document gets a few versions spread over the last few months, with real
 * files behind them, plus the odd restore, download and archive.
 *
 *   php artisan db:seed --class=DemoContentSeeder
 */
class DemoContentSeeder extends Seeder
{
    /** Extra clients created on top of whatever already exists. */
    private const EXTRA_CLIENTS = 4;

    private const DOCUMENTS_PER_CLIENT = [5, 9];

    private const MAX_VERSIONS = 6;

    private const HISTORY_DAYS = 120;

    /** [name pattern, file name pattern] — {company}, {year}, {quarter}, {n} are filled in. */
    private const TEMPLATES = [
        ['Statement of Work', 'statement-of-work.pdf'],
        ['Master Services Agreement', 'msa-{company}.pdf'],
        ['{year} Q{quarter} Invoices', 'invoices-{year}-q{quarter}.csv'],
        ['Project Brief', 'project-brief.md'],
        ['Meeting Notes', 'meeting-notes-{n}.md'],
        ['Brand Guidelines', 'brand-guidelines.pdf'],
        ['Homepage Mockup', 'homepage-mockup.png'],
        ['Logo Concepts', 'logo-concepts.png'],
        ['Site Configuration', 'site-config.json'],
        ['Content Inventory', 'content-inventory.csv'],
        ['Launch Checklist', 'launch-checklist.txt'],
        ['Requirements', 'requirements.md'],
        ['Change Request #{n}', 'change-request-{n}.pdf'],
    ];

    private const NOTES = [
        'Addressed review comments',
        'Updated pricing section',
        'Final copy from the client',
        'Fixed typos and formatting',
        'Added Q&A from the kickoff call',
        'New photography swapped in',
        'Legal changes to section 4',
        'Signed copy',
        'Reworked the layout per feedback',
        'Numbers updated for the new quarter',
    ];

    public function __construct(
        private DocumentVersioning $versioning,
        private Generator $faker,
    ) {}

    /** Real "now", captured before the clock is moved around. */
    private Carbon $cutoff;

    public function run(): void
    {
        Carbon::setTestNow();
        $this->cutoff = Carbon::now();
        $files = new FakeFiles($this->faker);
        $admin = User::where('role', User::ROLE_ADMIN)->first()
            ?? User::factory()->admin()->create(['name' => 'Portal Admin', 'email' => 'admin@example.com']);

        Client::factory(self::EXTRA_CLIENTS)->create()->each(function (Client $client) {
            $domain = Str::slug($client->name).'.test';
            User::factory($this->faker->numberBetween(1, 3))
                ->for($client)
                ->sequence(fn () => ['email' => Str::lower($this->faker->unique()->firstName()).'@'.$domain])
                ->create();
        });

        try {
            Client::with('users')->get()->each(fn (Client $client) => $this->seedClient($client, $admin, $files));
        } finally {
            Carbon::setTestNow();
        }
    }

    private function seedClient(Client $client, User $admin, FakeFiles $files): void
    {
        if ($client->users->isEmpty()) {
            return;
        }
        $people = $client->users->concat([$admin]);

        $templates = $this->faker->randomElements(self::TEMPLATES, $this->faker->numberBetween(...self::DOCUMENTS_PER_CLIENT));

        foreach ($templates as [$namePattern, $filePattern]) {
            $vars = [
                '{company}' => Str::slug(Str::words($client->name, 1, '')),
                '{year}' => now()->year,
                '{quarter}' => $this->faker->numberBetween(1, 4),
                '{n}' => $this->faker->numberBetween(2, 40),
            ];
            $name = strtr($namePattern, $vars);
            $filename = strtr($filePattern, $vars);

            $when = $this->cutoff->copy()->subDays($this->faker->numberBetween(10, self::HISTORY_DAYS))->setTime($this->faker->numberBetween(8, 18), $this->faker->numberBetween(0, 59));
            Carbon::setTestNow($when);

            $document = $this->versioning->createDocument(
                $people->random(),
                $client,
                $files->make($filename, 1, $name),
                $name,
                $this->faker->boolean(60) ? $this->faker->sentence(12) : null,
                'Initial upload',
            );

            $versions = $this->faker->numberBetween(1, self::MAX_VERSIONS);
            for ($v = 2; $v <= $versions; $v++) {
                $when = $when->copy()->addDays($this->faker->numberBetween(1, 12))->addMinutes($this->faker->numberBetween(0, 600));
                if ($when->greaterThan($this->cutoff)) {
                    break;
                }
                Carbon::setTestNow($when);

                // Now and then someone rolls back instead of uploading.
                if ($v > 2 && $this->faker->boolean(15)) {
                    $target = $document->versions()->where('version', '<', $v - 1)->inRandomOrder()->first();
                    $this->versioning->restore($document, $target, $people->random(), $this->faker->boolean() ? 'Going back to the earlier draft' : null);

                    continue;
                }

                // Occasionally the file is re-exported under a new name.
                $uploadName = $this->faker->boolean(15)
                    ? preg_replace('/(\.\w+)$/', '-final$1', $filename)
                    : $filename;

                $this->versioning->addVersion(
                    $document,
                    $people->random(),
                    $files->make($uploadName, $v, $name),
                    $this->faker->boolean(75) ? $this->faker->randomElement(self::NOTES) : null,
                );
            }

            $this->sprinkleDownloads($document->fresh('versions'), $people);

            if ($this->faker->boolean(10)) {
                Carbon::setTestNow($when->copy()->addDays(2)->min($this->cutoff));
                $document->delete();
                Activity::record('archived', $people->random(), $document);
            }

            Carbon::setTestNow();
        }
    }

    private function sprinkleDownloads(Document $document, Collection $people): void
    {
        foreach (range(1, $this->faker->numberBetween(0, 4)) as $_) {
            $version = $document->versions->random();
            Carbon::setTestNow(Carbon::instance($this->faker->dateTimeBetween($version->created_at, $this->cutoff)));

            Activity::record('downloaded', $people->random(), $document, [
                'version' => $version->version,
                'original_name' => $version->original_name,
            ]);
        }
    }
}
