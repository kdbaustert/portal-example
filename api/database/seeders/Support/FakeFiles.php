<?php

namespace Database\Seeders\Support;

use Faker\Generator;
use Illuminate\Http\Testing\File;
use Illuminate\Http\UploadedFile;

/**
 * Builds real, openable files filled with Faker content so seeded documents
 * download as something a person can actually look at.
 */
class FakeFiles
{
    public function __construct(private Generator $faker) {}

    public function make(string $filename, int $revision = 1, ?string $title = null): File
    {
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

        $content = match ($ext) {
            'pdf' => $this->pdf($title ?? $this->title(pathinfo($filename, PATHINFO_FILENAME)), $revision),
            'csv' => $this->csv($revision),
            'json' => $this->json($revision),
            'md' => $this->markdown($title ?? $this->title(pathinfo($filename, PATHINFO_FILENAME)), $revision),
            'png' => $this->png($revision),
            default => $this->text($revision),
        };

        return UploadedFile::fake()->createWithContent($filename, $content);
    }

    private function title(string $base): string
    {
        return ucwords(str_replace(['-', '_'], ' ', $base));
    }

    private function text(int $revision): string
    {
        return implode("\n\n", $this->faker->paragraphs(3 + $revision))."\n";
    }

    private function markdown(string $title, int $revision): string
    {
        $out = '# '.$title."\n\n_Revision {$revision}_\n\n";

        foreach (range(1, 2 + $revision) as $i) {
            $out .= '## '.ucfirst($this->faker->words(3, true))."\n\n";
            $out .= $this->faker->paragraph(4)."\n\n";
            foreach (range(1, $this->faker->numberBetween(2, 4)) as $_) {
                $out .= '- '.$this->faker->sentence()."\n";
            }
            $out .= "\n";
        }

        return $out;
    }

    private function csv(int $revision): string
    {
        $rows = [['invoice', 'date', 'customer', 'description', 'amount']];
        $count = 8 + $revision * 4;

        for ($i = 0; $i < $count; $i++) {
            $rows[] = [
                'INV-'.$this->faker->unique()->numberBetween(10000, 99999),
                $this->faker->dateTimeBetween('-6 months')->format('Y-m-d'),
                $this->faker->company(),
                $this->faker->bs(),
                number_format($this->faker->randomFloat(2, 120, 9800), 2, '.', ''),
            ];
        }

        $handle = fopen('php://temp', 'r+');
        foreach ($rows as $row) {
            fputcsv($handle, $row, escape: '');
        }
        rewind($handle);

        return stream_get_contents($handle);
    }

    private function json(int $revision): string
    {
        return json_encode([
            'version' => $revision,
            'generated_at' => $this->faker->iso8601(),
            'settings' => [
                'locale' => $this->faker->locale(),
                'timezone' => $this->faker->timezone(),
                'primary_color' => $this->faker->hexColor(),
                'features' => $this->faker->randomElements(['sso', 'audit_log', 'api', 'exports', 'webhooks', 'reports'], 3),
            ],
            'contacts' => collect(range(1, 2 + $revision))->map(fn () => [
                'name' => $this->faker->name(),
                'email' => $this->faker->safeEmail(),
                'phone' => $this->faker->phoneNumber(),
            ])->all(),
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)."\n";
    }

    /**
     * A small but valid single-page PDF with a heading and Faker paragraphs.
     */
    private function pdf(string $title, int $revision): string
    {
        $esc = fn (string $s) => str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $s);

        $lines = ['BT', '/F1 20 Tf', '72 740 Td', '('.$esc($title).') Tj', '/F1 10 Tf', '0 -22 Td',
            '(Revision '.$revision.'  -  '.$esc(now()->format('F j, Y')).') Tj', '/F1 11 Tf', '0 -30 Td', '14 TL'];

        foreach ($this->faker->paragraphs(3 + $revision) as $paragraph) {
            foreach (explode("\n", wordwrap($paragraph, 88)) as $line) {
                $lines[] = '('.$esc($line).') Tj T*';
            }
            $lines[] = 'T*';
        }
        $lines[] = 'ET';
        $stream = implode("\n", $lines);

        $objects = [
            '<< /Type /Catalog /Pages 2 0 R >>',
            '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
            '<< /Length '.strlen($stream)." >>\nstream\n{$stream}\nendstream",
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        ];

        $pdf = "%PDF-1.4\n";
        $offsets = [];
        foreach ($objects as $i => $body) {
            $offsets[] = strlen($pdf);
            $pdf .= ($i + 1)." 0 obj\n{$body}\nendobj\n";
        }

        $xref = strlen($pdf);
        $pdf .= 'xref'."\n0 ".(count($objects) + 1)."\n0000000000 65535 f \n";
        foreach ($offsets as $offset) {
            $pdf .= sprintf("%010d 00000 n \n", $offset);
        }
        $pdf .= 'trailer << /Size '.(count($objects) + 1)." /Root 1 0 R >>\nstartxref\n{$xref}\n%%EOF\n";

        return $pdf;
    }

    /**
     * An abstract PNG "mockup" made of random blocks. Falls back to plain
     * text if the GD extension isn't installed.
     */
    private function png(int $revision): string
    {
        if (! function_exists('imagecreatetruecolor')) {
            return $this->text($revision);
        }

        [$w, $h] = [960, 600];
        $img = imagecreatetruecolor($w, $h);
        $rgb = fn (string $hex) => sscanf($hex, '#%02x%02x%02x');
        $color = fn (string $hex) => imagecolorallocate($img, ...$rgb($hex));

        imagefill($img, 0, 0, $color('#f5f6f8'));
        imagefilledrectangle($img, 0, 0, $w, 64, $color($this->faker->hexColor()));

        foreach (range(1, 6 + $revision * 2) as $_) {
            $x = $this->faker->numberBetween(24, $w - 260);
            $y = $this->faker->numberBetween(90, $h - 160);
            imagefilledrectangle($img, $x, $y, $x + $this->faker->numberBetween(120, 240), $y + $this->faker->numberBetween(60, 140), $color($this->faker->hexColor()));
        }

        ob_start();
        imagepng($img);
        imagedestroy($img);

        return ob_get_clean();
    }
}
