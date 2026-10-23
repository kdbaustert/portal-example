<?php

use Illuminate\Support\Facades\Route;

// This app is an API. Send browsers to the Next.js portal.
Route::get('/', fn () => redirect()->away(config('portal.frontend_url')));
