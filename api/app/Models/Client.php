<?php

namespace App\Models;

use Database\Factories\ClientFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Support\Str;

#[Fillable(['name', 'slug', 'contact_email'])]
class Client extends Model
{
    /** @use HasFactory<ClientFactory> */
    use HasFactory;

    protected static function booted(): void
    {
        static::creating(function (Client $client) {
            if (blank($client->slug)) {
                $base = Str::slug($client->name) ?: 'client';
                $slug = $base;
                $i = 2;
                while (static::where('slug', $slug)->exists()) {
                    $slug = "{$base}-".$i++;
                }
                $client->slug = $slug;
            }
        });
    }

    /** @return HasMany<User, $this> */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /** @return HasMany<Document, $this> */
    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    /** @return HasManyThrough<DocumentVersion, Document, $this> */
    public function versions(): HasManyThrough
    {
        return $this->hasManyThrough(DocumentVersion::class, Document::class);
    }
}
