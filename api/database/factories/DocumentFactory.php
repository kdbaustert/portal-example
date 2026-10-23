<?php

namespace Database\Factories;

use App\Models\Client;
use App\Models\Document;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Creates an empty document shell. Use DocumentVersioning to add versions.
 *
 * @extends Factory<Document>
 */
class DocumentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'client_id' => Client::factory(),
            'name' => fake()->words(3, true),
        ];
    }
}
