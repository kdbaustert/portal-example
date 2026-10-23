<?php

use App\Http\Controllers\ActivityController;
use App\Http\Controllers\Admin\ClientController;
use App\Http\Controllers\Admin\ClientUserController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\DocumentVersionController;
use Illuminate\Support\Facades\Route;

/*
| The Next.js portal first calls GET /sanctum/csrf-cookie, then signs in
| here. Everything after that is authenticated by the session cookie.
*/
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/user', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/dashboard', DashboardController::class);
    Route::get('/activity', [ActivityController::class, 'index']);

    // Documents
    Route::get('/documents', [DocumentController::class, 'index']);
    Route::post('/documents', [DocumentController::class, 'store'])->middleware('throttle:uploads');
    Route::get('/documents/{document}', [DocumentController::class, 'show'])->withTrashed();
    Route::patch('/documents/{document}', [DocumentController::class, 'update'])->withTrashed();
    Route::delete('/documents/{document}', [DocumentController::class, 'destroy']);
    Route::post('/documents/{document}/unarchive', [DocumentController::class, 'unarchive'])->withTrashed();
    Route::get('/documents/{document}/activity', [ActivityController::class, 'forDocument'])->withTrashed();

    // Versions
    Route::post('/documents/{document}/versions', [DocumentVersionController::class, 'store'])
        ->middleware('throttle:uploads')->withTrashed();
    Route::get('/documents/{document}/versions/{version}/download', [DocumentVersionController::class, 'download'])
        ->whereNumber('version')->withTrashed();
    Route::post('/documents/{document}/versions/{version}/restore', [DocumentVersionController::class, 'restore'])
        ->whereNumber('version')->withTrashed();

    // Staff only
    Route::middleware('can:admin')->prefix('admin')->group(function () {
        Route::get('/clients', [ClientController::class, 'index']);
        Route::post('/clients', [ClientController::class, 'store']);
        Route::get('/clients/{client}', [ClientController::class, 'show']);
        Route::patch('/clients/{client}', [ClientController::class, 'update']);
        Route::post('/clients/{client}/users', [ClientUserController::class, 'store']);
        Route::delete('/clients/{client}/users/{user}', [ClientUserController::class, 'destroy']);
    });
});
