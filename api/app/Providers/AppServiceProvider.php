<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        JsonResource::withoutWrapping();

        Gate::define('admin', fn (User $user) => $user->isAdmin());

        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(6)->by(
            strtolower((string) $request->input('email')).'|'.$request->ip()
        ));

        RateLimiter::for('uploads', fn (Request $request) => Limit::perMinute(60)->by(
            $request->user()?->id ?: $request->ip()
        ));
    }
}
