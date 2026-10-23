<?php

namespace App\Http\Controllers;

use App\Http\Resources\ActivityResource;
use App\Models\Activity;
use App\Models\Document;
use App\Models\DocumentVersion;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __invoke(Request $request)
    {
        $user = $request->user();

        $versions = DocumentVersion::query()
            ->whereHas('document', fn ($q) => $q->visibleTo($user));

        return response()->json([
            'stats' => [
                'documents' => Document::visibleTo($user)->count(),
                'versions' => (clone $versions)->count(),
                // Restores share the stored file, so count each file once.
                'storage_bytes' => (int) (clone $versions)
                    ->whereNull('restored_from_version')
                    ->sum('size'),
                'uploads_30d' => (clone $versions)
                    ->where('created_at', '>=', now()->subDays(30))
                    ->count(),
            ],
            'recent_activity' => ActivityResource::collection(
                Activity::visibleTo($user)
                    ->with(['user', 'client'])
                    ->latest('created_at')
                    ->latest('id')
                    ->limit(12)
                    ->get()
            ),
        ]);
    }
}
